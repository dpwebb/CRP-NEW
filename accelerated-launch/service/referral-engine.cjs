'use strict';

const { createHash } = require('node:crypto');

class ReferralError extends Error {
  constructor(code) { super(code); this.name = 'ReferralError'; this.code = code; }
}
const check = (condition, code) => { if (!condition) throw new ReferralError(code); };
const validId = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);
const validMoney = value => Number.isSafeInteger(value) && value >= 0;
const validTime = value => typeof value === 'string' && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
const digest = value => createHash('sha256').update(value).digest('hex');
const DAY = 86400000;
const POLICY = Object.freeze({ level1_bps: 1500, level2_bps: 1000, level3_bps: 500,
  hold_days: 14, reserve_bps: 1000, reserve_days: 180 });

// Schedule at the start of the first UTC Friday on or after a hold expires.
function nextFridayAtOrAfter(instant) {
  check(validTime(instant), 'INVALID_TIME');
  const threshold = Date.parse(instant);
  const friday = new Date(threshold);
  friday.setUTCHours(0, 0, 0, 0);
  friday.setUTCDate(friday.getUTCDate() + (5 - friday.getUTCDay() + 7) % 7);
  if (friday.getTime() < threshold) friday.setUTCDate(friday.getUTCDate() + 7);
  return friday.toISOString();
}

// Standalone, in-memory candidate. A future host must persist changes atomically.
class ReferralProgram {
  constructor({ verifyPurchase, verifyRefund, verifyPayout = () => false }) {
    check(typeof verifyPurchase === 'function' && typeof verifyRefund === 'function' &&
      typeof verifyPayout === 'function', 'VERIFIERS_REQUIRED');
    this.policy = POLICY;
    this.verifyPurchase = verifyPurchase;
    this.verifyRefund = verifyRefund;
    this.verifyPayout = verifyPayout;
    this.members = new Map();
    this.purchases = new Map();
    this.refunds = new Set();
    this.rewards = new Map();
    this.tranches = new Map();
  }

  loadSnapshot(snapshot) {
    const value = snapshot || {};
    for (const [key, field] of [['members', 'account_id'], ['purchases', 'customer_id'],
      ['rewards', 'reward_id'], ['tranches', 'tranche_id']]) {
      check(Array.isArray(value[key] || []), 'INVALID_SNAPSHOT');
      this[key] = new Map((value[key] || []).map(row => [row[field], Object.freeze(row)]));
    }
    check(Array.isArray(value.refunds || []), 'INVALID_SNAPSHOT');
    this.refunds = new Set(value.refunds || []);
    return this;
  }

  snapshot() {
    return { members: [...this.members.values()], purchases: [...this.purchases.values()],
      rewards: [...this.rewards.values()], tranches: [...this.tranches.values()], refunds: [...this.refunds] };
  }

  enroll({ account_id, introduced_by = null }) {
    check(validId(account_id) && (introduced_by === null || validId(introduced_by)), 'INVALID_ACCOUNT');
    check(!this.members.has(account_id), 'ALREADY_ENROLLED');
    check(introduced_by !== account_id, 'SELF_REFERRAL');
    if (introduced_by !== null) check(this.members.has(introduced_by), 'INTRODUCER_UNKNOWN');
    const member = Object.freeze({ account_id, introduced_by, code: digest(`crp-referral:${account_id}`).slice(0, 12) });
    this.members.set(account_id, member);
    return member;
  }

  attribute({ customer_id, referrer_code }) {
    check(validId(customer_id) && typeof referrer_code === 'string', 'INVALID_ATTRIBUTION');
    check(!this.purchases.has(customer_id), 'CUSTOMER_ALREADY_PURCHASED');
    check(!this.members.has(customer_id), 'MEMBER_SELF_PURCHASE');
    const referrer = [...this.members.values()].find(member => member.code === referrer_code);
    check(referrer, 'REFERRER_UNKNOWN');
    this.purchases.set(customer_id, Object.freeze({ customer_id, referrer_id: referrer.account_id, purchase_id: null }));
    return { customer_id, referrer_id: referrer.account_id };
  }

  // Verified first retail purchase only. The subtotal excludes purchase tax.
  recordPurchase(purchase, now = new Date()) {
    check(purchase && validId(purchase.purchase_id) && validId(purchase.customer_id) &&
      validMoney(purchase.subtotal_minor) && purchase.subtotal_minor > 0 && purchase.subtotal_minor <= 1_000_000_000 &&
      validMoney(purchase.tax_minor) && validMoney(purchase.total_minor) &&
      purchase.total_minor === purchase.subtotal_minor + purchase.tax_minor &&
      /^[A-Z]{3}$/.test(purchase.currency || '') &&
      validTime(purchase.paid_at) && purchase.kind === 'FIRST_PURCHASE', 'INVALID_PURCHASE');
    check(this.verifyPurchase(purchase) === true, 'PURCHASE_UNVERIFIED');
    check(Date.parse(purchase.paid_at) <= now.getTime(), 'FUTURE_PURCHASE');
    const attribution = this.purchases.get(purchase.customer_id);
    check(attribution && attribution.purchase_id === null, 'NO_ELIGIBLE_ATTRIBUTION');
    check(![...this.purchases.values()].some(row => row.purchase_id === purchase.purchase_id), 'DUPLICATE_PURCHASE');
    const direct = this.members.get(attribution.referrer_id);
    const second = direct.introduced_by ? this.members.get(direct.introduced_by) : null;
    const ancestors = [direct, second, second?.introduced_by ? this.members.get(second.introduced_by) : null];
    const rates = [POLICY.level1_bps, POLICY.level2_bps, POLICY.level3_bps];
    const held_until = new Date(Date.parse(purchase.paid_at) + POLICY.hold_days * DAY).toISOString();
    const reserve_until = new Date(Date.parse(purchase.paid_at) + POLICY.reserve_days * DAY).toISOString();
    const created = [];
    ancestors.forEach((member, index) => {
      if (!member) return;
      const amount_minor = Math.floor(purchase.subtotal_minor * rates[index] / 10000);
      if (amount_minor === 0) return;
      const reserve_minor = Math.ceil(amount_minor * POLICY.reserve_bps / 10000);
      const payout_minor = amount_minor - reserve_minor;
      const reward = Object.freeze({ reward_id: digest(`${purchase.purchase_id}:${index + 1}`),
        purchase_id: purchase.purchase_id, referrer_id: member.account_id, level: index + 1,
        rate_bps: rates[index], subtotal_minor: purchase.subtotal_minor, amount_minor,
        payout_minor, reserve_minor, currency: purchase.currency, status: 'PENDING' });
      this.rewards.set(reward.reward_id, reward);
      for (const [kind, amount, due_at] of [
        ['INITIAL', payout_minor, nextFridayAtOrAfter(held_until)],
        ['RESERVE', reserve_minor, nextFridayAtOrAfter(reserve_until)]
      ]) {
        if (amount === 0) continue;
        const tranche = Object.freeze({ tranche_id: digest(`${reward.reward_id}:${kind}`),
          reward_id: reward.reward_id, referrer_id: member.account_id, purchase_id: purchase.purchase_id,
          level: index + 1, kind, amount_minor: amount, currency: purchase.currency,
          due_at, status: 'PENDING' });
        this.tranches.set(tranche.tranche_id, tranche);
      }
      created.push(reward);
    });
    this.purchases.set(purchase.customer_id, Object.freeze({ ...attribution, purchase_id: purchase.purchase_id }));
    return created;
  }

  // Full verified refunds reverse unpaid tranches; already paid tranches need recovery.
  holdForPartialRefund(purchase_id) {
    check(validId(purchase_id), 'INVALID_REFUND');
    for (const tranche of this.tranches.values()) {
      if (tranche.purchase_id !== purchase_id) continue;
      const status = tranche.status === 'PENDING' ? 'REVIEW_HOLD' :
        (tranche.status === 'PAID' ? 'RECOVERY_REVIEW' : tranche.status);
      if (status !== tranche.status) this.tranches.set(tranche.tranche_id, Object.freeze({ ...tranche, status }));
    }
  }

  recordRefund(refund) {
    check(refund && validId(refund.refund_id) && validId(refund.purchase_id) && refund.full_refund === true,
      'INVALID_REFUND');
    check(this.verifyRefund(refund) === true, 'REFUND_UNVERIFIED');
    check(!this.refunds.has(refund.refund_id), 'DUPLICATE_REFUND');
    const matches = [...this.rewards.values()].filter(reward => reward.purchase_id === refund.purchase_id);
    check(matches.length > 0, 'PURCHASE_UNKNOWN');
    check(matches.every(reward => reward.status !== 'REFUNDED'), 'PURCHASE_ALREADY_REFUNDED');
    for (const reward of matches) this.rewards.set(reward.reward_id, Object.freeze({ ...reward, status: 'REFUNDED' }));
    for (const tranche of this.tranches.values()) {
      if (tranche.purchase_id !== refund.purchase_id) continue;
      this.tranches.set(tranche.tranche_id, Object.freeze({ ...tranche,
        status: ['PAID', 'RECOVERY_REVIEW'].includes(tranche.status) ? 'RECOVERY_DUE' : 'REVERSED' }));
    }
    this.refunds.add(refund.refund_id);
    return matches.map(reward => this.rewards.get(reward.reward_id));
  }

  // Only the Friday batch returns payable entries; this does not transfer funds.
  eligibleRewards(now = new Date()) {
    check(now instanceof Date && Number.isFinite(now.getTime()), 'INVALID_TIME');
    if (now.getUTCDay() !== 5) return [];
    return [...this.tranches.values()].filter(tranche => tranche.status === 'PENDING' &&
      Date.parse(tranche.due_at) <= now.getTime());
  }

  markPaid({ tranche_id, payout_reference, paid_at }, now = new Date()) {
    check(typeof tranche_id === 'string' && /^[a-f0-9]{64}$/.test(tranche_id) &&
      validId(payout_reference) && validTime(paid_at) && Date.parse(paid_at) <= now.getTime(),
      'INVALID_PAYOUT');
    const tranche = this.tranches.get(tranche_id);
    check(tranche && tranche.status === 'PENDING', 'TRANCHE_NOT_PENDING');
    check(new Date(paid_at).getUTCDay() === 5 && Date.parse(paid_at) >= Date.parse(tranche.due_at),
      'PAYOUT_NOT_DUE');
    check(this.verifyPayout({ tranche, payout_reference, paid_at }) === true, 'PAYOUT_UNVERIFIED');
    const paid = Object.freeze({ ...tranche, status: 'PAID', payout_reference, paid_at });
    this.tranches.set(tranche_id, paid);
    return paid;
  }

  dashboard(account_id) {
    check(this.members.has(account_id), 'MEMBER_UNKNOWN');
    const member = this.members.get(account_id);
    const rewards = [...this.rewards.values()].filter(reward => reward.referrer_id === account_id);
    const tranches = [...this.tranches.values()].filter(tranche => tranche.referrer_id === account_id);
    // No customer identity, report, case or packet data is returned.
    return { code: member.code, rewards: rewards.map(({ reward_id, level, rate_bps, amount_minor,
      payout_minor, reserve_minor, currency, status }) =>
      ({ reward_id, level, rate_bps, amount_minor, payout_minor, reserve_minor, currency, status })),
    tranches: tranches.map(({ tranche_id, reward_id, level, kind, amount_minor, currency, due_at, status }) =>
      ({ tranche_id, reward_id, level, kind, amount_minor, currency, due_at, status })) };
  }
}

module.exports = { ReferralProgram, ReferralError, POLICY, nextFridayAtOrAfter };
