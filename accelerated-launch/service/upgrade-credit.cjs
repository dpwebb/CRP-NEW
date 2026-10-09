'use strict';
// Pure quote policy. Transactional reservation/redemption lives in billing-credits.cjs.
const plans = require('./plan-catalog.cjs');
// Retained for old imports; upgrade credit no longer has a time window.
const WINDOW_MS = null;

function upgradeQuote({ accountId, purchase, purchases, targetPlan, now }) {
  if (!['monthly', 'annual'].includes(targetPlan)) throw new Error('SUBSCRIPTION_UPGRADE_REQUIRED');
  const at = Date.parse(now);
  if (!Number.isFinite(at)) throw new Error('EXPLICIT_VALID_CURRENT_TIME_REQUIRED');
  const plan = plans.plan(targetPlan);
  const rows = Array.isArray(purchases) ? purchases : (purchase ? [purchase] : []);
  const usedIds = new Set();
  const usedIntents = new Set();
  const eligible = [];
  let available = 0;
  for (const value of rows) {
    if (!value || !accountId || value.account_id !== accountId || value.verified_payment !== true ||
        !plans.isPlanCode(value.plan_code) || plans.BASE_PRICE_CAD_CENTS[value.plan_code] >= plan.amount_cents ||
        value.currency !== 'cad' || !Number.isSafeInteger(value.amount_cents) || value.amount_cents <= 0 ||
        value.status !== 'paid' || value.refunded || value.disputed || value.credit_redeemed ||
        value.credit_reserved || ['RESERVED', 'REDEEMED', 'REVOKED'].includes(value.state) ||
        typeof value.payment_id !== 'string' || !value.payment_id ||
        !Number.isFinite(Date.parse(value.paid_at)) || Date.parse(value.paid_at) > at) continue;
    const intent = typeof value.payment_intent === 'string' && value.payment_intent ? value.payment_intent : null;
    if (usedIds.has(value.payment_id) || (intent && usedIntents.has(intent))) continue;
    const consumed = value.consumed_cents === undefined ? 0 : value.consumed_cents;
    if (!Number.isSafeInteger(consumed) || consumed < 0 || consumed > value.amount_cents) continue;
    const refunded = value.refunded_cents || 0;
    if (!Number.isSafeInteger(refunded) || refunded < 0 || refunded > value.amount_cents) continue;
    const expected = Math.max(0, value.amount_cents - consumed - refunded);
    const remaining = value.remaining_amount_cents === undefined ? expected : value.remaining_amount_cents;
    if (!Number.isSafeInteger(remaining) || remaining <= 0 || remaining !== expected) continue;
    usedIds.add(value.payment_id);
    if (intent) usedIntents.add(intent);
    available += remaining;
    if (!Number.isSafeInteger(available)) throw new Error('UPGRADE_CREDIT_TOTAL_OUT_OF_RANGE');
    eligible.push(value);
  }
  const credit = plans.applicableCredit(available, plan.amount_cents);
  return { currency: 'cad', regular_cents: plan.amount_cents, credit_cents: credit,
    first_invoice_cents: plan.amount_cents - credit, renewal_cents: plan.amount_cents,
    eligible: credit > 0, reason: credit > 0 ? 'VERIFIED_UNUSED_LOWER_PLAN_PAYMENTS' : 'NO_ELIGIBLE_PURCHASE',
    expires_at: null, available_credit_cents: available, remaining_credit_cents: available - credit,
    source_plan_codes: plans.PLAN_CODES.filter(code => eligible.some(value => value.plan_code === code)),
    source_payment_ids: eligible.map(value => value.payment_id),
    ...(eligible.length === 1 ? { payment_id: eligible[0].payment_id } : {}) };
}
module.exports = { upgradeQuote, WINDOW_MS };
