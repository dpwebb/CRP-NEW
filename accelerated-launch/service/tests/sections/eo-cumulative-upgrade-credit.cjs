'use strict';
const credits = require('../../billing-credits.cjs');
const plans = require('../../plan-catalog.cjs');

async function run(t, check) {
  const store = t.service.store;
  const now = new Date().toISOString();
  const paidAt = new Date(Date.now() - 200 * 86400000).toISOString();
  const receipt = (id, patch = {}) => ({ account_id: 'eo_account_a', payment_id: id,
    payment_intent: 'pi_' + id, plan_code: 'report_once', amount_cents: 595,
    currency: 'cad', paid_at: paidAt, verified_payment: true, ...patch });
  const add = value => store.update(state => credits.recordPayment(state, value));
  const rows = () => store.state().upgrade_credits;
  const view = (account = 'eo_account_a', currentPlan) => credits.quotesFor(store, account, now, currentPlan);

  check.equal(add(receipt('unverified', { verified_payment: false })).created, false, 'unverified bodies mint no credit');
  check.equal(credits.creditFromPayment(store, 'a', 'old_call', 'pi_old_call', paidAt).created, false,
    'compatibility wrapper cannot assume a verified CAD 5.95 payment');
  for (const patch of [{ currency: 'usd' }, { amount_cents: -1 }, { amount_cents: 1.5 },
    { amount_cents: Number.MAX_SAFE_INTEGER + 1 }, { paid_at: 'invalid' },
    { paid_at: new Date(Date.now() + 86400000).toISOString() }, { plan_code: 'unknown' },
    { account_id: null }, { payment_id: null }, { refunded: true }, { disputed: true }]) {
    check.equal(add(receipt('invalid', patch)).created, false, 'invalid receipt does not mint: ' + JSON.stringify(patch));
  }
  check.equal(add(receipt('zero', { amount_cents: 0 })).created, false, 'a fully credited invoice is not a new cash payment');
  check.equal(rows().length, 0, 'refused receipts left no ledger rows');

  check.equal(add(receipt('report_1')).created, true, 'first verified report receipt is persisted');
  check.equal(add(receipt('report_2')).created, true, 'second report receipt is also persisted');
  check.equal(add(receipt('report_1')).created, false, 'repeated payment is idempotent');
  check.equal(add(receipt('first_invoice', { payment_intent: 'pi_report_1' })).created, false,
    'Checkout and invoice cannot double-count the same cash');
  check.equal(add(receipt('report_1', { amount_cents: 600 })).reason, 'PAYMENT_RECEIPT_MISMATCH',
    'changed amount cannot replace an existing receipt');
  check.equal(add(receipt('report_1', { account_id: 'eo_account_b' })).reason, 'PAYMENT_RECEIPT_MISMATCH',
    'a receipt cannot be reassigned to another account');
  const beforeRead = JSON.stringify(store.state());
  check.equal(view().monthly.available_credit_cents, 1190, 'all old, unused one-report payments count');
  check.equal(view().monthly.credit_cents, 795, 'credit is capped at the first monthly bill');
  check.equal(view().monthly.first_invoice_cents, 0, 'the invoice never becomes negative');
  check.equal(view().monthly.remaining_credit_cents, 395, 'extra credit remains for a higher plan');
  check.equal(view().annual.first_invoice_cents, 6760, 'annual includes both report receipts');
  check.equal(view().annual.renewal_cents, 7950, 'renewal price stays unchanged');
  check.equal(view('eo_account_b').annual.credit_cents, 0, 'account credit is isolated');
  check.equal(JSON.stringify(store.state()), beforeRead, 'quoting does not mutate the private store');
  check.equal(credits.creditView(store, 'eo_account_a', now).credit_cents, 1190, 'summary reflects actual unused cash');
  check.equal(credits.creditView(store, 'eo_account_b', now).credit_cents, 0, 'ineligible summary does not advertise fixed credit');

  const reserved = credits.reserveCredit(store, 'eo_account_a', 'eo_monthly', now, 'monthly');
  check.equal(reserved.amount_cents, 795, 'one atomic reservation sums contributing receipts');
  check.deepEqual(reserved.allocations.map(value => value.amount_cents), [595, 200], 'only the necessary part of the second receipt is allocated');
  check.equal(credits.reserveCredit(store, 'eo_account_a', 'eo_monthly', now, 'monthly').amount_cents,
    795, 'retry returns its reservation rather than spending again');
  check.equal(credits.reserveCredit(store, 'eo_account_b', 'eo_monthly', now, 'monthly').reserved,
    false, 'a checkout ID cannot borrow another account reservation');
  check.equal(credits.reserveCredit(store, 'eo_account_a', 'eo_concurrent', now, 'annual').reserved,
    false, 'a competing checkout cannot reserve the same money');
  check.equal(credits.creditView(store, 'eo_account_a', now).reserved_now, true, 'the billing surface knows credit is reserved');
  const wrongPlan = store.update(state => credits.settleReservations(state, 'eo_monthly', 'annual', now));
  check.equal(wrongPlan.redeemed, false, 'a payment for another plan cannot consume the reservation');
  check.equal(rows().reduce((total, row) => total + row.consumed_cents, 0), 0, 'plan mismatch consumes nothing');
  check.equal(credits.releaseCredit(store, 'unknown').released, false, 'unrelated checkout cannot release reserved money');
  check.equal(credits.releaseCredit(store, 'eo_monthly').count, 2, 'failed checkout releases every contributing receipt');
  check.equal(view().monthly.available_credit_cents, 1190, 'released credit remains fully usable');

  credits.reserveCredit(store, 'eo_account_a', 'eo_paid_monthly', now, 'monthly');
  const settled = store.update(state => credits.settleReservations(state, 'eo_paid_monthly', 'monthly', now));
  check.equal(settled.amount_cents, 795, 'settlement consumes precisely the verified credited amount');
  check.deepEqual(rows().map(row => [row.consumed_cents, row.remaining_amount_cents, row.state]),
    [[595, 0, 'REDEEMED'], [200, 395, 'ELIGIBLE']], 'fully spent and partly spent receipts retain accurate balances');
  check.equal(rows()[1].allocations[0].amount_cents, 200, 'partial consumption keeps an immutable allocation record');
  check.equal(credits.redeemCredit(store, 'eo_paid_monthly', 'monthly', now).redeemed, false, 'duplicate activation cannot consume again');
  check.equal(view().annual.credit_cents, 395, 'only the unspent part can apply to the next upgrade');

  check.equal(add(receipt('month_cash', { plan_code: 'monthly', amount_cents: 200 })).created,
    true, 'monthly contributes actual cash, not its catalog price');
  check.equal(add(receipt('month_renewal', { plan_code: 'monthly', amount_cents: 795 })).created,
    true, 'another verified monthly payment also counts');
  check.equal(view().monthly.credit_cents, 395, 'monthly payments do not discount another monthly bill');
  check.equal(view().annual.credit_cents, 1390, 'annual sums remaining report money and every unused monthly payment');
  check.deepEqual(view().annual.source_plan_codes, ['report_once', 'monthly'], 'the quote identifies the qualifying lower plans');
  check.equal(view('eo_account_a', 'monthly').monthly.allowed, false, 'current monthly is not another upgrade');
  check.equal(view('eo_account_a', 'monthly').annual.allowed, true, 'monthly-to-annual is an upgrade');
  check.equal(view('eo_account_a', 'annual').monthly.allowed, false, 'a lower plan is not offered as an upgrade');
  check.equal(credits.reserveCredit(store, 'eo_account_a', 'one_report', now, 'report_once').reserved,
    false, 'credit cannot be applied to a one-report repeat purchase');

  credits.reserveCredit(store, 'eo_account_a', 'eo_annual', now, 'annual');
  const revoked = store.update(state => credits.revokePayment(state, 'eo_account_a', 'pi_month_cash'));
  check.deepEqual(revoked.affected_checkout_ids, ['eo_annual'], 'refund exposes the bound checkout for provider invalidation');
  check.equal(rows().find(row => row.payment_id === 'month_cash').state, 'REVOKED', 'unused refunded credit cannot be redeemed');
  check.equal(store.update(state => credits.settleReservations(state, 'eo_annual', 'annual', now)).reason,
    'RESERVATION_ALLOCATION_INCOMPLETE', 'a partly revoked reservation cannot consume surviving money as if its discount were complete');
  check.equal(rows().find(row => row.payment_id === 'month_renewal').consumed_cents, 0,
    'incomplete allocation preserves the other unused payment');
  credits.releaseCredit(store, 'eo_annual');
  check.equal(view().annual.credit_cents, 1190, 'other unrefunded receipts are preserved after release');
  check.equal(store.update(state => credits.revokePayment(state, 'eo_account_b', 'pi_month_renewal')).revoked,
    0, 'refund cannot revoke another account credit');
  check.equal(store.update(state => credits.revokePayment(state, 'eo_account_a', null, 'month_renewal')).revoked,
    1, 'verified receipt ID also supports revocation');
  check.equal(add(receipt('month_renewal', { plan_code: 'monthly', amount_cents: 795 })).created,
    false, 'refunded receipt replay cannot restore credit');
  check.equal(view().annual.credit_cents, 395, 'refunded money is excluded');

  store.update(state => {
    for (const status of ['EXPIRED', 'REDEEMED', 'REVOKED']) state.upgrade_credits.push({
      credit_id: 'legacy_' + status, account_id: 'eo_legacy', payment_id: 'legacy_' + status,
      payment_intent: 'pi_legacy_' + status, amount_cents: 595, currency: 'cad', state: status,
      paid_at: paidAt, expires_at: new Date(Date.now() - 100 * 86400000).toISOString() });
  });
  check.equal(view('eo_legacy').annual.credit_cents, 595, 'verified derived legacy unused credit survives the retired expiry');
  credits.expireCredits(store, new Date(Date.now() + 800 * 86400000).toISOString());
  check.equal(rows().find(row => row.payment_id === 'legacy_EXPIRED').state, 'ELIGIBLE', 'legacy expired receipt is recovered');
  check.equal(rows().find(row => row.payment_id === 'legacy_REDEEMED').remaining_amount_cents, 0, 'legacy fully redeemed credit never resets');
  check.equal(rows().find(row => row.payment_id === 'legacy_REVOKED').state, 'REVOKED', 'legacy refund stays revoked');
  check.equal(credits.expiresAt(paidAt), null, 'new credit has no expiry');
  check.equal(view('eo_legacy').annual.expires_at, null, 'consumer quote does not advertise an expiry');
  check.equal(plans.catalog().upgrade_offer.cumulative, true, 'catalog describes cumulative credits');
  check.equal(plans.catalog().upgrade_offer.expires, false, 'catalog retires the 90-day offer');
  add(receipt('hydrate', { account_id: 'eo_account_c', payment_intent: null }));
  check.equal(add(receipt('hydrate', { account_id: 'eo_account_c', payment_intent: 'pi_hydrate' })).created,
    false, 'authoritative receipt enrichment does not create another credit');
  check.equal(rows().find(row => row.payment_id === 'hydrate').payment_intent, 'pi_hydrate',
    'a verified read may bind a formerly absent payment intent');
  check.equal(add(receipt('invoice_hydrate', { account_id: 'eo_account_c', payment_intent: 'pi_hydrate' })).created,
    false, 'later invoice for enriched payment is deduplicated');
  check.equal(add(receipt('hydrate', { account_id: 'eo_account_c', payment_intent: 'pi_changed' })).reason,
    'PAYMENT_RECEIPT_MISMATCH', 'a recorded payment intent cannot be replaced');
  return { cumulative_actual_cash: true, cap_and_remainder: true, no_expiry: true,
    partial_allocations: true, same_payment_deduplicated: true, account_isolation: true,
    reserved_money_not_reused: true, refunds_and_legacy_preserved: true };
}

module.exports = { run, id: 'eo-cumulative-upgrade-credit', title: 'Cumulative unused lower-plan payments, atomic allocations and retained upgrade balances' };

if (require.main === module) {
  const assert = require('node:assert/strict');
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const { PrivateStore } = require('../../private-store.cjs');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'crp-eo-credit-'));
  let count = 0;
  const check = Object.fromEntries(['equal', 'deepEqual', 'ok'].map(name => [name, (...args) => {
    assert[name](...args); count += 1;
  }]));
  run({ service: { store: new PrivateStore(dir) } }, check).then(() => {
    console.log('PASS: ' + count + ' cumulative credit assertions against the real atomic private store');
  }).catch(error => { console.error(error); process.exitCode = 1; }).finally(() => {
    const resolved = path.resolve(dir);
    if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith('crp-eo-credit-')) {
      throw new Error('TEST_CLEANUP_PATH_REFUSED');
    }
    fs.rmSync(resolved, { recursive: true, force: true });
  });
}
