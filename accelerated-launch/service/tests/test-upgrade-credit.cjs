'use strict';
const assert = require('node:assert/strict');
const { upgradeQuote } = require('../upgrade-credit.cjs');
const purchase = { account_id: 'a', payment_id: 'paid_1', payment_intent: 'pi_1',
  verified_payment: true, plan_code: 'report_once', currency: 'cad', amount_cents: 595,
  status: 'paid', paid_at: '2026-01-01T12:00:00.000Z' };
const base = { accountId: 'a', purchase, targetPlan: 'monthly', now: '2026-10-02T12:00:00.000Z' };
assert.equal(upgradeQuote(base).first_invoice_cents, 200);
assert.equal(upgradeQuote(base).renewal_cents, 795);
assert.equal(upgradeQuote(base).expires_at, null, 'a nine-month-old payment still counts');
assert.equal(upgradeQuote({ ...base, targetPlan: 'annual' }).first_invoice_cents, 7355);
assert.equal(upgradeQuote({ ...base, targetPlan: 'annual' }).renewal_cents, 7950);
const second = { ...purchase, payment_id: 'paid_2', payment_intent: 'pi_2' };
const both = upgradeQuote({ ...base, purchases: [purchase, second] });
assert.equal(both.credit_cents, 795, 'all unused lower-plan receipts count, capped at the new bill');
assert.equal(both.first_invoice_cents, 0);
assert.equal(both.remaining_credit_cents, 395, 'excess cash credit remains');
assert.equal(upgradeQuote({ ...base, purchases: [purchase, purchase] }).credit_cents, 595, 'same receipt is not counted twice');
assert.equal(upgradeQuote({ ...base, purchases: [purchase, { ...purchase, payment_id: 'first_invoice' }] }).credit_cents,
  595, 'Checkout and first invoice for one payment intent do not double the credit');
assert.equal(upgradeQuote({ ...base, purchase: { ...purchase, amount_cents: 250 } }).credit_cents,
  250, 'a discounted payment contributes only actual cash paid');
assert.equal(upgradeQuote({ ...base, targetPlan: 'annual', purchase: { ...purchase, plan_code: 'monthly', amount_cents: 200 } }).credit_cents,
  200, 'discounted monthly cash counts toward annual');
assert.equal(upgradeQuote({ ...base, purchase: { ...purchase, plan_code: 'monthly', amount_cents: 795 } }).credit_cents,
  0, 'same-priced plans do not qualify');
assert.equal(upgradeQuote({ ...base, targetPlan: 'annual', purchase: { ...purchase, plan_code: 'annual', amount_cents: 7950 } }).credit_cents,
  0, 'annual payments do not discount another annual purchase');
assert.equal(upgradeQuote({ ...base, purchase: { ...purchase, consumed_cents: 200, remaining_amount_cents: 395 } }).credit_cents, 395);
assert.equal(upgradeQuote({ ...base, purchase: { ...purchase, consumed_cents: 200, refunded_cents: 100,
  remaining_amount_cents: 295 } }).credit_cents, 295, 'partly spent and partly returned cash contributes only its unused net remainder');
const minimumReceipts = Array.from({ length: 10 }, (_, index) => ({ ...purchase, plan_code: 'monthly', amount_cents: 795,
  payment_id: 'minimum_' + index, payment_intent: 'pi_minimum_' + index, ...(index ? {} : { refunded_cents: 39 }) }));
const minimumQuote = upgradeQuote({ ...base, targetPlan: 'annual', purchases: minimumReceipts });
assert.equal(minimumQuote.first_invoice_cents, 50, 'a nonzero first invoice remains chargeable');
assert.equal(minimumQuote.remaining_credit_cents, 11, 'extra credit remains available instead of becoming an unchargeable bill');
for (const patch of [{ account_id: 'b' }, { verified_payment: false }, { currency: 'usd' }, { amount_cents: -1 },
  { amount_cents: 1.5 }, { amount_cents: 0 }, { amount_cents: Number.MAX_SAFE_INTEGER + 1 },
  { refunded: true }, { disputed: true }, { credit_redeemed: true }, { credit_reserved: true },
  { state: 'RESERVED' }, { state: 'REDEEMED' }, { status: 'pending' }, { payment_id: null }, { paid_at: 'invalid' },
  { paid_at: '2027-01-01T00:00:00Z' }, { consumed_cents: -1 }, { remaining_amount_cents: 700 }, { plan_code: 'unknown' }]) {
  assert.equal(upgradeQuote({ ...base, purchase: { ...purchase, ...patch } }).credit_cents, 0, JSON.stringify(patch));
}
assert.throws(() => upgradeQuote({ ...base, targetPlan: 'report_once' }));
assert.throws(() => upgradeQuote({ ...base, now: 'invalid' }));
console.log('PASS: cumulative verified cash, cap and remainder, no expiry, lower-plan scope, receipt deduplication and unsafe-payment refusals');
