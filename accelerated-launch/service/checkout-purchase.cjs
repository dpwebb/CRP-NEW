'use strict';
const crypto = require('node:crypto');
const plans = require('./plan-catalog.cjs');
const payments = require('./payment-provider.cjs');
const credits = require('./billing-credits.cjs');
const { ServiceError } = require('./errors.cjs');
const { reconcileAccountPayments } = require('./billing-reconciliation.cjs');
const id = prefix => `${prefix}_${crypto.randomBytes(12).toString('hex')}`;

async function openCheckout(store, actor, input, env) {
  const entitlement = require('./entitlement.cjs');
  const body = input || {}, code = body.plan_code;
  if (!plans.isPlanCode(code)) throw new ServiceError('UNKNOWN_PLAN');
  const provider = payments.resolveProvider(env);
  if (!provider) throw new ServiceError('PAYMENT_PROVIDER_NOT_CONFIGURED');
  if (typeof body.resume_checkout_id === 'string') {
    const existing = store.state().checkout_sessions.find(c => c.checkout_id === body.resume_checkout_id && c.account_id === actor.account_id);
    if (!existing || existing.plan_code !== code || existing.provider_id !== provider.provider_id ||
        !['OPEN', 'OPENING'].includes(existing.state)) throw new ServiceError('CHECKOUT_NOT_FOUND');
    if (existing.state === 'OPENING') {
      if (!existing.provider_request) throw new ServiceError('CHECKOUT_OPEN_FAILED');
      try {
        const recovered = await callProvider(provider, { ...existing.provider_request, resume: true }, existing.is_subscription_upgrade);
        bindProviderResult(store, actor, existing.checkout_id, recovered);
      } catch (error) {
        throw new ServiceError('PAYMENT_CONFIRMATION_PENDING', { reason: error.code || 'PROVIDER_RECOVERY_UNCONFIRMED' });
      }
    }
    const resumed = store.state().checkout_sessions.find(c => c.checkout_id === existing.checkout_id);
    return publicCheckout(store, actor, provider, resumed);
  }
  await reconcileAccountPayments(store, actor, env, { force: true });
  await reconcileOpenCheckouts(store, actor, provider);
  const caseId = typeof body.case_id === 'string' ? body.case_id : null;
  if (code === 'report_once') entitlement.requireUnlockableReport(store, actor, caseId);
  const plan = plans.plan(code), quote = entitlement.upgradeQuotes(store, actor)[code];
  const current = entitlement.statusFor(store, actor.account_id);
  const isUpgrade = current.entitled && current.access_via === 'SUBSCRIPTION';
  if (isUpgrade && (code !== 'annual' || current.plan_code !== 'monthly')) throw new ServiceError('PLAN_ALREADY_ACTIVE');
  if (isUpgrade && !body.quote_revision) throw new ServiceError('UPGRADE_REVIEW_REQUIRED');
  if (body.quote_revision && body.quote_revision !== quote.revision) throw new ServiceError('STALE_UPGRADE_QUOTE');
  if (!quote.allowed && code !== 'report_once') throw new ServiceError('CHECKOUT_ALREADY_IN_PROGRESS');
  const returnUrl = typeof body.return_url === 'string' && /^https?:\/\//.test(body.return_url) ? body.return_url : null;
  const checkoutId = id('chk'), now = new Date().toISOString();
  const original = isUpgrade ? entitlement.controlling(store.state().entitlements.filter(r => r.account_id === actor.account_id), now) : null;
  if (isUpgrade && provider.provider_id === 'stripe' && typeof provider.upgradeSubscription !== 'function') {
    throw new ServiceError('CHECKOUT_OPEN_FAILED');
  }
  // Claim the account's purchase before any await/provider call. A second tab cannot open another subscription.
  store.update(state => {
    if (!state.accounts.some(a => a.account_id === actor.account_id)) throw new ServiceError('AUTHENTICATION_REQUIRED');
    const busy = state.checkout_sessions.some(c => c.account_id === actor.account_id &&
      ['OPENING', 'OPEN', 'CREDIT_REVOKED'].includes(c.state) &&
      (code === 'report_once' ? c.case_id === caseId && c.plan_code === code : c.plan_code !== 'report_once'));
    if (busy) throw new ServiceError('CHECKOUT_ALREADY_IN_PROGRESS');
    state.checkout_sessions.push({ checkout_id: checkoutId, account_id: actor.account_id, plan_code: code,
      case_id: caseId, amount_cents: plan.amount_cents, currency: plan.currency, provider_id: provider.provider_id,
      provider_reference: null, state: 'OPENING', created_at: now,
      expires_at: new Date(Date.now() + 86400000).toISOString(), is_subscription_upgrade: isUpgrade,
      previous_entitlement_id: original?.entitlement_id || null,
      provider_subscription_reference: original?.provider_subscription_reference || null });
  });
  let reservation = { reserved: false, amount_cents: 0 };
  let opened;
  try {
    if (code !== 'report_once') reservation = credits.reserveCredit(store, actor.account_id, checkoutId, now, code);
    const netDue = plan.amount_cents - (reservation.amount_cents || 0);
    if (netDue !== quote.first_invoice_cents) throw new ServiceError('STALE_UPGRADE_QUOTE');
    store.update(state => {
      const row = state.checkout_sessions.find(c => c.checkout_id === checkoutId);
      row.credit_reserved = reservation.reserved;
      row.credit_applied_cents = reservation.amount_cents || 0;
      row.payable_cents = netDue;
      if (!isUpgrade) state.entitlements.push({ entitlement_id: id('ent'), account_id: actor.account_id,
        plan_code: code, state: 'PENDING', source: provider.is_a_working_payment ? provider.provider_id : 'TEST_ADAPTER_NOT_A_PAYMENT',
        access_via: plans.GRANTS[code].access_via, checkout_id: checkoutId, provider_reference: null,
        created_at: now, granted_at: null, expires_at: null, event_ids: [] });
    });
    const request = { account_id: actor.account_id, plan_code: code, return_url: returnUrl, checkout_id: checkoutId, request_started_at: now,
      credit_amount_cents: reservation.amount_cents || 0, apply_upgrade_credit: reservation.reserved };
    if (isUpgrade) Object.assign(request, { existing_plan_code: original.plan_code,
      existing_checkout_id: original.checkout_id, provider_reference: original.provider_reference,
      subscription_reference: original.provider_subscription_reference });
    store.update(state => { state.checkout_sessions.find(c => c.checkout_id === checkoutId).provider_request = request; });
    opened = await callProvider(provider, request, isUpgrade);
    bindProviderResult(store, actor, checkoutId, opened);
  } catch (error) {
    // A failed call has no confirmed payment. Preserve any existing paid subscription.
    store.update(state => {
      const row = state.checkout_sessions.find(c => c.checkout_id === checkoutId);
      if (!error.provider_write_started && row?.state !== 'COMPLETED') {
        if (row) row.state = 'FAILED';
        for (const ent of state.entitlements) if (ent.checkout_id === checkoutId && ent.state === 'PENDING') ent.state = 'CANCELLED';
        credits.releaseReservations(state, checkoutId);
      }
    });
    if (error instanceof ServiceError) throw error;
    throw new ServiceError(error.provider_write_started ? 'PAYMENT_CONFIRMATION_PENDING' : 'CHECKOUT_OPEN_FAILED', { reason: error.code || error.message });
  }
  return publicCheckout(store, actor, provider, store.state().checkout_sessions.find(c => c.checkout_id === checkoutId));
}

function callProvider(provider, request, upgrade) {
  return upgrade && provider.provider_id === 'stripe' ? provider.upgradeSubscription(request) : provider.createCheckout(request);
}
function bindProviderResult(store, actor, checkoutId, opened) {
  return store.update(state => {
    const row = state.checkout_sessions.find(c => c.checkout_id === checkoutId);
    if (!row || !state.accounts.some(a => a.account_id === actor.account_id)) throw new ServiceError('AUTHENTICATION_REQUIRED');
    if (row.state === 'OPENING') row.state = 'OPEN';
    row.provider_reference = opened.provider_reference;
    row.redirect_url = opened.redirect_url;
    row.provider_subscription_reference = opened.subscription_reference || row.provider_subscription_reference;
    if (opened.expires_at) row.expires_at = opened.expires_at;
    const pending = state.entitlements.find(e => e.checkout_id === checkoutId && e.state === 'PENDING');
    if (pending) pending.provider_reference = opened.provider_reference;
  });
}
function publicCheckout(store, actor, provider, row) {
  const entitlement = require('./entitlement.cjs'), plan = plans.plan(row.plan_code);
  return { checkout_id: row.checkout_id, plan, provider_id: provider.provider_id,
    provider_is_a_working_payment: provider.is_a_working_payment === true, provider_reference: row.provider_reference,
    redirect_url: row.redirect_url, redirect_grants_nothing: true, is_subscription_upgrade: row.is_subscription_upgrade,
    upgrade_credit: row.plan_code === 'report_once' ? null : { reserved: row.credit_reserved, credit_cents: row.credit_applied_cents || 0,
      first_invoice_cents: row.payable_cents, renewal_cents: plan.amount_cents },
    entitlement: entitlement.statusFor(store, actor.account_id), plain: 'Complete payment to activate your purchase.' };
}

async function reconcileOpenCheckouts(store, actor, provider) {
  if (provider.provider_id !== 'stripe') return;
  const rows = store.state().checkout_sessions.filter(c => c.account_id === actor.account_id &&
    c.provider_id === 'stripe' && ['OPEN', 'CREDIT_REVOKED'].includes(c.state) && (c.provider_reference || c.is_subscription_upgrade));
  for (const checkout of rows) {
    if (checkout.state === 'CREDIT_REVOKED') {
      const stopped = await provider.cancelCheckout({ ...checkout, subscription_reference: checkout.provider_subscription_reference });
      if (!stopped.cancelled) continue;
    } else {
      const query = await provider.queryCheckout({ provider_reference: checkout.provider_reference });
      if (!query.expired) continue;
      if (checkout.is_subscription_upgrade) await provider.restoreUpgrade({ ...checkout, subscription_reference: checkout.provider_subscription_reference });
    }
    store.update(state => {
      const row = state.checkout_sessions.find(c => c.checkout_id === checkout.checkout_id);
      if (!row || row.state === 'COMPLETED') return;
      row.state = 'EXPIRED';
      credits.releaseReservations(state, row.checkout_id);
      for (const ent of state.entitlements) if (ent.checkout_id === row.checkout_id && ent.state === 'PENDING') ent.state = 'CANCELLED';
    });
  }
}
module.exports = { openCheckout, reconcileOpenCheckouts };
