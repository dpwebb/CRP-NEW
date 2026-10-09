'use strict';

const { ReferralProgram, ReferralError, POLICY } = require('./referral-engine.cjs');
const { ServiceError } = require('./errors.cjs');

function requireStaging(env = process.env) {
  if (env.CRP_DEPLOYMENT_ENV !== 'staging') throw new ServiceError('NOT_FOUND');
}

function programFrom(state) {
  // Only this server creates purchases from verified, persisted checkout rows.
  return new ReferralProgram({ verifyPurchase: value => value.verified === true,
    verifyRefund: value => value.verified === true }).loadSnapshot(state.referral_snapshots?.[0]);
}

function save(state, program) {
  state.referral_snapshots = [program.snapshot()];
}

function safely(run) {
  try { return run(); }
  catch (error) {
    if (error instanceof ReferralError) throw new ServiceError('INVALID_REQUEST', { reason: error.code });
    throw error;
  }
}

function enroll(store, actor, body, env) {
  requireStaging(env);
  return safely(() => store.update(state => {
    if (!state.accounts.some(account => account.account_id === actor.account_id)) throw new ServiceError('AUTHENTICATION_REQUIRED');
    const program = programFrom(state);
    const introducer = body?.introducer_code == null ? null :
      [...program.members.values()].find(member => member.code === body.introducer_code)?.account_id;
    if (body?.introducer_code != null && !introducer) throw new ServiceError('INVALID_REQUEST', { reason: 'INTRODUCER_UNKNOWN' });
    const member = program.enroll({ account_id: actor.account_id, introduced_by: introducer });
    save(state, program);
    return { code: member.code, level_count: 3, policy: POLICY };
  }));
}

function attribute(store, actor, body, env) {
  requireStaging(env);
  return safely(() => store.update(state => {
    if (!state.accounts.some(account => account.account_id === actor.account_id)) throw new ServiceError('AUTHENTICATION_REQUIRED');
    if (state.checkout_sessions.some(row => row.account_id === actor.account_id && row.state === 'COMPLETED')) {
      throw new ServiceError('INVALID_REQUEST', { reason: 'CUSTOMER_ALREADY_PURCHASED' });
    }
    const program = programFrom(state);
    program.attribute({ customer_id: actor.account_id, referrer_code: body?.referrer_code });
    save(state, program);
    return { attributed: true, referrer_code: body.referrer_code };
  }));
}

function syncVerifiedPurchases(state, program, now) {
  for (const attribution of program.purchases.values()) {
    if (attribution.purchase_id !== null) continue;
    const completed = state.checkout_sessions.filter(row => row.account_id === attribution.customer_id &&
      row.state === 'COMPLETED' && Number.isSafeInteger(row.verified_paid_cents) && row.verified_paid_cents > 0 &&
      Number.isSafeInteger(row.verified_tax_cents) && row.verified_tax_cents >= 0 &&
      row.verified_tax_cents < row.verified_paid_cents && typeof row.verified_paid_at === 'string' &&
      typeof row.verified_payment_id === 'string' && row.verified_payment_id)
      .sort((a, b) => a.verified_paid_at.localeCompare(b.verified_paid_at));
    const row = completed[0];
    if (!row) continue;
    program.recordPurchase({ purchase_id: row.checkout_id, customer_id: row.account_id,
      subtotal_minor: row.verified_paid_cents - row.verified_tax_cents, tax_minor: row.verified_tax_cents,
      total_minor: row.verified_paid_cents, currency: String(row.currency).toUpperCase(),
      paid_at: row.verified_paid_at, kind: 'FIRST_PURCHASE', verified: true }, now);
  }
  for (const row of state.checkout_sessions) {
    if (!program.purchases.get(row.account_id)?.purchase_id ||
        program.purchases.get(row.account_id).purchase_id !== row.checkout_id) continue;
    const reversals = state.billing_events.filter(event => event.outcome === 'APPLIED' && event.effect === 'REVOKE' &&
      event.account_id === row.account_id &&
      ((event.payment_intent && event.payment_intent === row.verified_payment_intent) ||
        (row.provider_id === 'test-adapter-not-a-payment' && event.account_id === row.account_id &&
          event.session_reference === row.provider_reference)));
    const fullRefund = reversals.find(event => Number.isSafeInteger(event.refunded_cents) &&
      event.refunded_cents >= row.verified_paid_cents);
    const needsReview = reversals.some(event => !Number.isSafeInteger(event.refunded_cents) ||
      (event.refunded_cents > 0 && event.refunded_cents < row.verified_paid_cents));
    if (needsReview) program.holdForPartialRefund(row.checkout_id);
    if (fullRefund && !program.refunds.has(fullRefund.event_id)) {
      program.recordRefund({ refund_id: fullRefund.event_id, purchase_id: row.checkout_id,
        full_refund: true, verified: true });
    }
  }
}

function dashboard(store, actor, env, now = new Date()) {
  requireStaging(env);
  return safely(() => store.update(state => {
    const program = programFrom(state);
    syncVerifiedPurchases(state, program, now);
    save(state, program);
    if (!program.members.has(actor.account_id)) return { enrolled: false, policy: POLICY };
    return { enrolled: true, policy: POLICY, ...program.dashboard(actor.account_id) };
  }));
}

function purgeAccount(state, accountId) {
  if (!state.referral_snapshots?.length) return;
  const program = programFrom(state);
  const deletedCustomerPurchases = new Set([...program.purchases.values()]
    .filter(row => row.customer_id === accountId && row.purchase_id).map(row => row.purchase_id));
  program.members.delete(accountId);
  for (const [id, member] of program.members) if (member.introduced_by === accountId) {
    program.members.set(id, Object.freeze({ ...member, introduced_by: null }));
  }
  for (const [id, row] of program.purchases) {
    if (row.customer_id === accountId || (row.referrer_id === accountId && !row.purchase_id)) {
      program.purchases.delete(id);
    } else if (row.referrer_id === accountId) {
      program.purchases.set(id, Object.freeze({ ...row, referrer_id: null }));
    }
  }
  for (const [id, row] of program.rewards) if (row.referrer_id === accountId) {
    program.rewards.delete(id);
  }
  for (const [id, row] of program.tranches) {
    if (row.referrer_id === accountId) program.tranches.delete(id);
    else if (deletedCustomerPurchases.has(row.purchase_id)) {
      program.tranches.set(id, Object.freeze({ ...row, status: row.status === 'PENDING' ? 'REVIEW_HOLD' :
        (row.status === 'PAID' ? 'RECOVERY_REVIEW' : row.status) }));
    }
  }
  save(state, program);
}

module.exports = { enroll, attribute, dashboard, purgeAccount, requireStaging };
