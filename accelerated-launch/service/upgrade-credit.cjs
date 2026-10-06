'use strict';
// Pure policy only. Stripe integration must reserve/redeem atomically; client claims never establish payment.
const plans = require('./plan-catalog.cjs');
const WINDOW_MS = 90 * 24 * 60 * 60 * 1000;
function upgradeQuote({accountId, purchase, targetPlan, now}) {
  if (!['monthly','annual'].includes(targetPlan)) throw Error('SUBSCRIPTION_UPGRADE_REQUIRED');
  const plan = plans.plan(targetPlan);
  const quote = {currency:'cad', regular_cents:plan.amount_cents, credit_cents:0,
    first_invoice_cents:plan.amount_cents, renewal_cents:plan.amount_cents,
    eligible:false, reason:'NO_ELIGIBLE_PURCHASE', expires_at:null};
  if (!purchase) return quote;
  const paidAt = Date.parse(purchase.paid_at), at = Date.parse(now);
  if (!Number.isFinite(at)) throw Error('EXPLICIT_VALID_CURRENT_TIME_REQUIRED');
  if (!accountId || purchase.account_id !== accountId || purchase.verified_payment !== true ||
      purchase.plan_code !== 'report_once' || purchase.currency !== 'cad' || purchase.amount_cents !== 595 ||
      purchase.status !== 'paid' || purchase.refunded || purchase.disputed || purchase.credit_redeemed ||
      !purchase.payment_id || !Number.isFinite(paidAt) || paidAt > at) return quote;
  quote.expires_at = new Date(paidAt + WINDOW_MS).toISOString();
  if (at >= paidAt + WINDOW_MS) return {...quote,reason:'UPGRADE_WINDOW_EXPIRED'};
  return {...quote, eligible:true, reason:'VERIFIED_ONE_TIME_PAYMENT_WITHIN_90_DAYS',
    payment_id:purchase.payment_id, credit_cents:595, first_invoice_cents:plan.amount_cents-595};
}
module.exports = {upgradeQuote, WINDOW_MS};
