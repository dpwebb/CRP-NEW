'use strict';
// Every value here arrived through the provider's signature verifier. Bind the payment
// to the owned purchase and its reserved price before changing access or credit.
const crypto = require('node:crypto');
const plans = require('./plan-catalog.cjs');
const credits = require('./billing-credits.cjs');
const { ServiceError } = require('./errors.cjs');
const newId = p => `${p}_${crypto.randomBytes(12).toString('hex')}`;

async function recordVerifiedEvent(store, event, provider) {
  const ent = require('./entitlement.cjs'), at = new Date().toISOString();
  const before = store.state(), fingerprint = ent.eventFingerprint(event);
  const settled = before.billing_events.find(e => e.outcome === 'APPLIED' &&
    (e.event_id === event.event_id || e.fingerprint === fingerprint));
  if (settled) return { accepted: true, duplicate: true, event_id: event.event_id, type: event.type,
    effect: settled.effect, applied_to: settled.entitlement_id, entitlement: ent.statusFor(store, event.account_reference) };
  const refuse = reason => {
    store.update(state => {
      state.billing_events.push({ event_id: event.event_id, provider_id: provider.provider_id, fingerprint,
        received_at: at, outcome: 'REJECTED', reason, effect: null, entitlement_id: null, account_id: null });
      const rejections = state.billing_events.filter(e => e.outcome === 'REJECTED');
      const remove = new Set(rejections.slice(0, Math.max(0, rejections.length - ent.MAX_RECORDED_REJECTIONS)));
      state.billing_events = state.billing_events.filter(e => !remove.has(e));
    });
    return { accepted: false, duplicate: false, reason, entitlement:
      before.accounts.some(a => a.account_id === event.account_reference) ? ent.statusFor(store, event.account_reference) : null };
  };
  if (!before.accounts.some(a => a.account_id === event.account_reference)) return refuse('EVENT_IGNORED_ACCOUNT_UNKNOWN');
  const accountId = event.account_reference, stripe = provider.provider_id === 'stripe';
  let effect = ent.EVENT_EFFECTS[event.type];
  const owned = before.checkout_sessions.filter(c => c.account_id === accountId && c.provider_id === provider.provider_id);
  let checkout = owned.find(c => c.provider_reference === event.session_reference);
  if (event.invoice_reference) {
    checkout = owned.find(c => c.provider_reference === event.invoice_reference &&
      (!c.provider_subscription_reference || c.provider_subscription_reference === event.subscription_reference)) ||
      owned.find(c => c.checkout_id === event.checkout_reference && c.plan_code === event.plan_code &&
        ['OPENING', 'OPEN'].includes(c.state) && (!c.provider_subscription_reference ||
          c.provider_subscription_reference === event.subscription_reference)) || checkout;
    if (event.type === 'invoice.paid' && checkout && ['OPENING', 'OPEN'].includes(checkout.state)) effect = 'ACTIVATE';
  }
  if (effect === 'ACTIVATE' && checkout?.is_subscription_upgrade) effect = 'UPGRADE';
  const rows = before.entitlements.filter(e => e.account_id === accountId);
  let row;
  if (['ACTIVATE', 'UPGRADE'].includes(effect)) {
    if (event.payment_verified === false) return refuse('EVENT_IGNORED_UNPAID_CHECKOUT');
    if (!checkout) return refuse('EVENT_IGNORED_CHECKOUT_UNKNOWN');
    if (checkout.plan_code !== event.plan_code) return refuse('EVENT_IGNORED_PLAN_MISMATCH');
    if (!['OPEN', 'OPENING'].includes(checkout.state)) return refuse('EVENT_IGNORED_CHECKOUT_NOT_PAYABLE');
    const expected = checkout.payable_cents ?? checkout.amount_cents - (checkout.credit_applied_cents || 0);
    if (event.currency !== checkout.currency || event.amount_cents !== expected) return refuse('EVENT_IGNORED_PAYMENT_AMOUNT_MISMATCH');
    if (event.payment_intent && before.billing_events.some(e => e.account_id === accountId &&
        e.outcome === 'APPLIED' && e.effect === 'REVOKE' && e.payment_intent === event.payment_intent)) {
      return refuse('EVENT_IGNORED_REFUNDED_PAYMENT');
    }
    const reserved = before.upgrade_credits.filter(c => c.account_id === accountId && c.state === 'RESERVED' &&
      c.reserved_for_checkout_id === checkout.checkout_id)
      .reduce((sum, c) => sum + (c.reserved_amount_cents ?? c.amount_cents), 0);
    if (reserved !== (checkout.credit_applied_cents || 0)) return refuse('EVENT_IGNORED_UPGRADE_CREDIT_REVOKED');
    row = effect === 'UPGRADE' ? rows.find(r => r.entitlement_id === checkout.previous_entitlement_id &&
      r.plan_code === 'monthly' && ent.ENTITLED_STATES.includes(r.state)) : rows.find(r => r.checkout_id === checkout.checkout_id && r.state === 'PENDING');
    if (!row) return refuse('EVENT_IGNORED_PURCHASE_NOT_PENDING');
    if (stripe && effect === 'UPGRADE' && row.provider_subscription_reference !== event.subscription_reference) {
      return refuse('EVENT_IGNORED_SUBSCRIPTION_MISMATCH');
    }
  } else if (effect === 'RELEASE_UPGRADE') {
    if (!checkout || !checkout.is_subscription_upgrade || !['OPEN', 'OPENING', 'CREDIT_REVOKED'].includes(checkout.state) ||
        checkout.provider_subscription_reference !== event.subscription_reference) return refuse('EVENT_IGNORED_CHECKOUT_UNKNOWN');
  } else if (effect === 'REVOKE') {
    const purchase = owned.find(c => c.verified_payment_intent && c.verified_payment_intent === event.payment_intent);
    row = rows.find(r => r.current_payment_intent && r.current_payment_intent === event.payment_intent) ||
      (purchase ? rows.find(r => r.checkout_id === purchase.checkout_id && !r.current_payment_intent) : null);
    if (!stripe && !row) row = ent.controlling(rows, at);
    // An earlier monthly/report refund cannot revoke an independently paid later yearly plan.
  } else if (stripe) {
    row = rows.find(r => r.source === 'stripe' && r.access_via === 'SUBSCRIPTION' &&
      r.provider_subscription_reference === event.session_reference && r.plan_code === event.plan_code);
    if (!row) return refuse('EVENT_IGNORED_SUBSCRIPTION_MISMATCH');
    if (effect === 'CANCEL_AT_PERIOD_END' && row.checkout_id !== event.checkout_reference) return refuse('EVENT_IGNORED_SUBSCRIPTION_MISMATCH');
    if (effect === 'RENEW') {
      if (!event.invoice_reference || event.payment_verified !== true || event.currency !== 'cad') return refuse('EVENT_IGNORED_UNPAID_INVOICE');
      const first = owned.find(c => c.initial_invoice_reference === event.invoice_reference);
      const expected = first ? first.payable_cents : plans.plan(event.plan_code).amount_cents;
      if (event.amount_cents !== expected) return refuse('EVENT_IGNORED_PAYMENT_AMOUNT_MISMATCH');
      if (event.payment_intent && before.billing_events.some(e => e.account_id === accountId && e.outcome === 'APPLIED' &&
          e.effect === 'REVOKE' && e.payment_intent === event.payment_intent)) return refuse('EVENT_IGNORED_REFUNDED_PAYMENT');
    }
  } else row = ent.controlling(rows, at);
  if (effect === 'PAST_DUE' && (!row?.granted_at || !['ACTIVE', 'PAST_DUE'].includes(row.state))) {
    return refuse('EVENT_IGNORED_UNPAID_INVOICE');
  }

  const invalidated = [];
  if (effect === 'RELEASE_UPGRADE' && provider.restoreUpgrade) {
    await provider.restoreUpgrade({ ...checkout, subscription_reference: checkout.provider_subscription_reference });
  }
  const applied = store.update(state => {
    if (!state.accounts.some(a => a.account_id === accountId)) throw new ServiceError('BILLING_EVENT_REJECTED');
    const live = row && state.entitlements.find(e => e.entitlement_id === row.entitlement_id);
    const intent = checkout && state.checkout_sessions.find(c => c.checkout_id === checkout.checkout_id);
    if (['ACTIVATE', 'UPGRADE', 'RENEW'].includes(effect)) {
      const paidAt = event.occurred_at || at;
      const receipt = credits.recordPayment(state, { account_id: accountId, payment_id: event.invoice_reference || event.session_reference,
        payment_intent: event.payment_intent || null, plan_code: event.plan_code, amount_cents: event.amount_cents,
        currency: event.currency, paid_at: paidAt, verified_payment: true });
      if (!receipt.created && !['PAYMENT_ALREADY_RECORDED', 'NO_CASH_PAYMENT'].includes(receipt.reason)) {
        throw new ServiceError('BILLING_EVENT_REJECTED', { reason: receipt.reason });
      }
      if (effect === 'UPGRADE') {
        live.previous_checkout_id = live.checkout_id;
        live.previous_plan_code = live.plan_code;
        live.plan_code = event.plan_code;
        live.checkout_id = intent.checkout_id;
        live.provider_reference = intent.provider_reference || event.invoice_reference || event.session_reference;
      }
      ent.applyEffect(live, effect === 'UPGRADE' ? 'ACTIVATE' : effect, event.plan_code, event, at);
      live.current_payment_intent = event.payment_intent || null;
      live.current_payment_id = event.invoice_reference || event.session_reference;
      if (effect !== 'RENEW') {
        intent.state = 'COMPLETED';
        intent.provider_reference ||= event.invoice_reference || event.session_reference;
        intent.initial_invoice_reference = event.invoice_reference || null;
        intent.verified_payment_id = event.invoice_reference || event.session_reference;
        intent.verified_payment_intent = event.payment_intent || null;
        intent.verified_paid_cents = event.amount_cents;
        if (event.subscription_reference) {
          live.provider_subscription_reference = event.subscription_reference;
          intent.provider_subscription_reference = event.subscription_reference;
        }
        const settlement = credits.settleReservations(state, intent.checkout_id, event.plan_code, at);
        if ((intent.credit_applied_cents || 0) !== settlement.amount_cents) throw new ServiceError('BILLING_EVENT_REJECTED');
        if (event.plan_code === 'report_once' && intent.case_id &&
            !state.purchased_downloads.some(d => d.account_id === accountId && d.case_id === intent.case_id)) {
          state.purchased_downloads.push({ purchase_id: newId('dl'), account_id: accountId, case_id: intent.case_id,
            checkout_id: intent.checkout_id, provider_reference: intent.provider_reference, created_at: at });
        }
      }
    } else if (effect === 'RELEASE_UPGRADE') {
      intent.state = 'EXPIRED';
      credits.releaseReservations(state, intent.checkout_id);
    } else if (effect === 'REVOKE') {
      const revoked = event.type === 'charge.refunded' && Number.isSafeInteger(event.refunded_cents)
        ? credits.refundPayment(state, accountId, event.payment_intent, null, event.refunded_cents)
        : credits.revokePayment(state, accountId, event.payment_intent);
      for (const checkoutId of revoked.affected_checkout_ids || revoked.checkout_ids || []) {
        const pending = state.checkout_sessions.find(c => c.checkout_id === checkoutId);
        if (pending && ['OPEN', 'OPENING'].includes(pending.state)) {
          pending.state = 'CREDIT_REVOKED';
          invalidated.push({ ...pending });
        }
      }
      const partialRefund = event.type === 'charge.refunded' && Number.isSafeInteger(event.refunded_cents) &&
        Number.isSafeInteger(event.amount_cents) && event.refunded_cents >= 0 && event.refunded_cents < event.amount_cents;
      if (live && !partialRefund) ent.applyEffect(live, 'REVOKE', event.plan_code, event, at);
    } else if (live) ent.applyEffect(live, effect, event.plan_code, event, at);
    if (live) {
      live.event_ids = (live.event_ids || []).concat(event.event_id);
      live.last_event_type = event.type;
      live.updated_at = at;
    }
    state.billing_events.push({ event_id: event.event_id, provider_id: provider.provider_id, fingerprint,
      received_at: at, outcome: 'APPLIED', effect, reason: null, entitlement_id: live?.entitlement_id || null,
      account_id: accountId, type: event.type, amount_cents: event.amount_cents, currency: event.currency,
      invoice_reference: event.invoice_reference || null, payment_intent: event.payment_intent || null,
      refunded_cents: event.refunded_cents ?? null });
    return live?.entitlement_id || null;
  });
  for (const pending of invalidated) {
    if (!provider.cancelCheckout || !pending.provider_reference && !pending.is_subscription_upgrade) continue;
    try {
      const stopped = await provider.cancelCheckout({ ...pending, subscription_reference: pending.provider_subscription_reference });
      if (stopped.cancelled) store.update(state => {
        const intent = state.checkout_sessions.find(c => c.checkout_id === pending.checkout_id);
        if (intent?.state === 'CREDIT_REVOKED') { intent.state = 'CANCELLED'; credits.releaseReservations(state, intent.checkout_id); }
      });
    } catch { /* Keep the intent blocked and its surviving credits reserved until provider reconciliation succeeds. */ }
  }
  return { accepted: true, duplicate: false, event_id: event.event_id, type: event.type, effect,
    applied_to: applied, entitlement: ent.statusFor(store, accountId), plain: 'Your confirmed payment update has been recorded.' };
}
module.exports = { recordVerifiedEvent };
