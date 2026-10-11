'use strict';
const assert = require('node:assert/strict');
const { ReferralProgram, POLICY, nextFridayAtOrAfter } = require('./index.cjs');
const build = () => new ReferralProgram({ verifyPurchase: value => value.verified === true,
  verifyRefund: value => value.verified === true, verifyPayout: value => value.payout_reference === 'provider_confirmed' });
const paid_at = '2026-10-01T12:00:00.000Z';
const purchase = { purchase_id: 'p1', customer_id: 'customer1', subtotal_minor: 10000,
  tax_minor: 1500, total_minor: 11500, currency: 'CAD', paid_at,
  kind: 'FIRST_PURCHASE', verified: true };
const program = build();
assert.deepEqual([POLICY.level1_bps, POLICY.level2_bps, POLICY.level3_bps], [1500, 1000, 500]);
assert.equal(POLICY.hold_days, 14);
assert.equal(POLICY.reserve_days, 180);
const first = program.enroll({ account_id: 'first' });
program.enroll({ account_id: 'second', introduced_by: 'first' });
const third = program.enroll({ account_id: 'third', introduced_by: 'second' });
program.enroll({ account_id: 'fourth', introduced_by: 'third' });
program.attribute({ customer_id: 'customer1', referrer_code: third.code });
const rewards = program.recordPurchase(purchase, new Date('2026-10-02T00:00:00.000Z'));
assert.deepEqual(rewards.map(r => [r.level, r.referrer_id, r.amount_minor, r.payout_minor, r.reserve_minor]),
  [[1, 'third', 1500, 1350, 150], [2, 'second', 1000, 900, 100], [3, 'first', 500, 450, 50]]);
assert.equal(program.dashboard('fourth').rewards.length, 0);
assert.equal(JSON.stringify(program.dashboard('first')).includes('customer1'), false);
const directTranches = program.dashboard('third').tranches;
assert.equal(directTranches.length, 2);
assert.equal(directTranches[0].due_at, '2026-10-16T00:00:00.000Z');
assert.equal(directTranches[1].due_at, nextFridayAtOrAfter(new Date(Date.parse(paid_at) + 180 * 86400000).toISOString()));
assert.equal(program.eligibleRewards(new Date('2026-10-15T23:59:59.000Z')).length, 0);
assert.equal(program.eligibleRewards(new Date('2026-10-16T00:00:00.000Z')).length, 3);
assert.equal(program.eligibleRewards(new Date('2026-10-17T00:00:00.000Z')).length, 0);
assert.throws(() => program.markPaid({ tranche_id: directTranches[0].tranche_id,
  payout_reference: 'unverified', paid_at: '2026-10-16T12:00:00.000Z' },
new Date('2026-10-16T13:00:00.000Z')), { code: 'PAYOUT_UNVERIFIED' });
assert.equal(program.markPaid({ tranche_id: directTranches[0].tranche_id,
  payout_reference: 'provider_confirmed', paid_at: '2026-10-16T12:00:00.000Z' },
new Date('2026-10-16T13:00:00.000Z')).status, 'PAID');
assert.throws(() => program.recordPurchase(purchase), { code: 'NO_ELIGIBLE_ATTRIBUTION' });
assert.throws(() => program.recordPurchase({ ...purchase, purchase_id: 'p2', kind: 'RENEWAL' }),
  { code: 'INVALID_PURCHASE' });
assert.throws(() => program.enroll({ account_id: 'first' }), { code: 'ALREADY_ENROLLED' });
assert.throws(() => program.enroll({ account_id: 'self', introduced_by: 'self' }), { code: 'SELF_REFERRAL' });
assert.throws(() => program.recordRefund({ refund_id: 'r1', purchase_id: 'p1', full_refund: true, verified: false }),
  { code: 'REFUND_UNVERIFIED' });
program.recordRefund({ refund_id: 'r1', purchase_id: 'p1', full_refund: true, verified: true });
assert.deepEqual(program.dashboard('third').tranches.map(t => t.status), ['RECOVERY_DUE', 'REVERSED']);
assert.equal(program.eligibleRewards(new Date(directTranches[1].due_at)).length, 0);
assert.throws(() => program.recordRefund({ refund_id: 'r2', purchase_id: 'p1', full_refund: true, verified: true }),
  { code: 'PURCHASE_ALREADY_REFUNDED' });
assert.deepEqual(program.dashboard('third').tranches.map(t => t.status), ['RECOVERY_DUE', 'REVERSED']);
const unverified = build();
unverified.enroll({ account_id: 'first' });
unverified.attribute({ customer_id: 'customer1', referrer_code: first.code });
assert.throws(() => unverified.recordPurchase({ ...purchase, verified: false }), { code: 'PURCHASE_UNVERIFIED' });
assert.throws(() => unverified.recordPurchase({ ...purchase, total_minor: 10000 }), { code: 'INVALID_PURCHASE' });
assert.throws(() => unverified.recordPurchase({ ...purchase, currency: 'TOKEN' }), { code: 'INVALID_PURCHASE' });
assert.equal(nextFridayAtOrAfter('2026-10-16T00:00:00.000Z'), '2026-10-16T00:00:00.000Z');
assert.equal(nextFridayAtOrAfter('2026-10-16T12:00:00.000Z'), '2026-10-23T00:00:00.000Z');
const tiny = build();
const tinyMember = tiny.enroll({ account_id: 'tiny' });
tiny.attribute({ customer_id: 'tinyCustomer', referrer_code: tinyMember.code });
const tinyReward = tiny.recordPurchase({ ...purchase, purchase_id: 'pTiny', customer_id: 'tinyCustomer',
  subtotal_minor: 10, tax_minor: 2, total_minor: 12 })[0];
assert.equal(tinyReward.amount_minor, 1);
assert.equal(tinyReward.reserve_minor, 1);
assert.equal(tinyReward.payout_minor, 0);
console.log('Three-level referral candidate: all tests passed');
