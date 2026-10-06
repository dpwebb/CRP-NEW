'use strict';
/**
 * billing-credits.cjs — the once-only CAD upgrade credit, as TRANSACTIONAL STATE.
 *
 * OWNER-ALL82-001 / B4-PAY-001. The pure eligibility/quote policy lives in `upgrade-credit.cjs`; this module
 * persists the credit a verified one-time payment earns and moves it through the only states that keep it
 * honest under concurrency and failure:
 *
 *   ELIGIBLE  ->  RESERVED (bound to one subscription checkout)  ->  REDEEMED (only after verified payment)
 *     |  ^                                                          |
 *     |  `---- released when the checkout fails or expires -------->|
 *     `--> EXPIRED (paid_at + 90 days)  or  REVOKED (refund/dispute)
 *
 * Every transition is a single `store.update` — one file, one rename — so two concurrent subscription
 * checkouts can never reserve the same credit twice. Reservation is keyed on the credit, redemption on the
 * checkout that reserved it, and nothing here reads a client flag, a redirect or an unverified body.
 */

const crypto = require('node:crypto');
const { WINDOW_MS } = require('./upgrade-credit.cjs');

const CREDIT_AMOUNT_CENTS = 595;
const CREDIT_CURRENCY = 'cad';

const CREDIT_STATES = Object.freeze({
  ELIGIBLE: 'ELIGIBLE',
  RESERVED: 'RESERVED',
  REDEEMED: 'REDEEMED',
  EXPIRED: 'EXPIRED',
  REVOKED: 'REVOKED'
});

function newId(prefix) {
  return `${prefix}_${crypto.randomBytes(12).toString('hex')}`;
}

function expiresAt(paidAtIso) {
  return new Date(Date.parse(paidAtIso) + WINDOW_MS).toISOString();
}

/** The credit rows that can still be used, in reservation order (oldest first). */
function usableCredits(state, accountId, nowIso) {
  const at = Date.parse(nowIso);
  return (state.upgrade_credits || [])
    .filter((row) => row.account_id === accountId && row.state === CREDIT_STATES.ELIGIBLE)
    .filter((row) => Number.isFinite(Date.parse(row.expires_at)) && Date.parse(row.expires_at) > at)
    .sort((a, b) => (String(a.paid_at) < String(b.paid_at) ? -1 : 1));
}

/**
 * Persist a credit from a verified one-time payment. Idempotent: one verified payment yields at most one
 * credit, however many times its event is re-sent.
 */
function creditFromPayment(store, accountId, paymentId, paymentIntent, paidAt) {
  return store.update((state) => {
    const existing = (state.upgrade_credits || []).find((row) => row.payment_id === paymentId);
    if (existing) return { created: false, credit: existing };
    const credit = {
      credit_id: newId('crd'),
      account_id: accountId,
      payment_id: paymentId,
      payment_intent: paymentIntent || null,
      amount_cents: CREDIT_AMOUNT_CENTS,
      currency: CREDIT_CURRENCY,
      state: CREDIT_STATES.ELIGIBLE,
      paid_at: paidAt,
      expires_at: expiresAt(paidAt),
      reserved_for_checkout_id: null,
      reserved_at: null,
      redeemed_at: null,
      redeemed_checkout_id: null,
      redeemed_plan_code: null,
      revoked_reason: null
    };
    state.upgrade_credits.push(credit);
    return { created: true, credit };
  });
}

/**
 * Atomically reserve the oldest eligible credit for one subscription checkout. Returns `reserved: true` only
 * if the reservation actually landed; a concurrent attempt on the same account receives `reserved: false` and
 * must not apply a discount.
 */
function reserveCredit(store, accountId, checkoutId, nowIso) {
  return store.update((state) => {
    const candidate = usableCredits(state, accountId, nowIso)[0];
    if (!candidate) return { reserved: false, reason: 'NO_ELIGIBLE_CREDIT' };
    candidate.state = CREDIT_STATES.RESERVED;
    candidate.reserved_for_checkout_id = checkoutId;
    candidate.reserved_at = nowIso;
    return { reserved: true, credit_id: candidate.credit_id, amount_cents: candidate.amount_cents, currency: candidate.currency };
  });
}

/** Release a reservation so the credit is eligible again — failed or abandoned checkout. */
function releaseCredit(store, checkoutId) {
  return store.update((state) => {
    const row = (state.upgrade_credits || []).find(
      (candidate) => candidate.state === CREDIT_STATES.RESERVED && candidate.reserved_for_checkout_id === checkoutId
    );
    if (!row) return { released: false };
    row.state = CREDIT_STATES.ELIGIBLE;
    row.reserved_for_checkout_id = null;
    row.reserved_at = null;
    return { released: true, credit_id: row.credit_id };
  });
}

/**
 * Redeem the reservation made by a checkout, only after a verified subscription payment. Idempotent per
 * checkout: a re-sent activation cannot redeem a second credit.
 */
function redeemCredit(store, checkoutId, planCode, nowIso) {
  return store.update((state) => {
    const row = (state.upgrade_credits || []).find(
      (candidate) => candidate.state === CREDIT_STATES.RESERVED && candidate.reserved_for_checkout_id === checkoutId
    );
    if (!row) return { redeemed: false, reason: 'NO_RESERVATION_FOR_THIS_CHECKOUT' };
    row.state = CREDIT_STATES.REDEEMED;
    row.redeemed_at = nowIso;
    row.redeemed_checkout_id = checkoutId;
    row.redeemed_plan_code = planCode;
    row.reserved_for_checkout_id = null;
    return { redeemed: true, credit_id: row.credit_id };
  });
}

/** Revoke still-unspent credits derived from a refunded/disputed payment intent. */
function revokeCreditsForPaymentIntent(store, accountId, paymentIntent) {
  if (!paymentIntent) return { revoked: 0 };
  return store.update((state) => {
    let revoked = 0;
    for (const row of state.upgrade_credits || []) {
      if (row.account_id !== accountId || row.payment_intent !== paymentIntent) continue;
      if (row.state === CREDIT_STATES.ELIGIBLE || row.state === CREDIT_STATES.RESERVED) {
        row.state = CREDIT_STATES.REVOKED;
        row.revoked_reason = 'THE_UNDERLYING_PAYMENT_WAS_REFUNDED_OR_DISPUTED';
        row.reserved_for_checkout_id = null;
        row.reserved_at = null;
        revoked += 1;
      }
    }
    return { revoked };
  });
}

/** Mark elapsed credits EXPIRED. Called by the sweep. Never touches a redeemed or revoked credit. */
function expireCredits(store, nowIso) {
  const at = Date.parse(nowIso);
  return store.update((state) => {
    let expired = 0;
    for (const row of state.upgrade_credits || []) {
      if ((row.state === CREDIT_STATES.ELIGIBLE || row.state === CREDIT_STATES.RESERVED) &&
          Number.isFinite(Date.parse(row.expires_at)) && Date.parse(row.expires_at) <= at) {
        row.state = CREDIT_STATES.EXPIRED;
        row.reserved_for_checkout_id = null;
        row.reserved_at = null;
        expired += 1;
      }
    }
    return { expired };
  });
}

/** The credit position the consumer surface may show: quote + remaining eligibility time. */
function creditView(store, accountId, nowIso) {
  const state = store.state();
  const at = Date.parse(nowIso);
  const usable = usableCredits(state, accountId, nowIso);
  const nearest = usable[0] || null;
  return {
    eligible: usable.length > 0,
    credit_cents: CREDIT_AMOUNT_CENTS,
    currency: CREDIT_CURRENCY,
    expires_at: nearest ? nearest.expires_at : null,
    remaining_ms: nearest ? Math.max(0, Date.parse(nearest.expires_at) - at) : 0,
    reserved_now: (state.upgrade_credits || []).some(
      (row) => row.account_id === accountId && row.state === CREDIT_STATES.RESERVED
    )
  };
}

module.exports = {
  CREDIT_STATES,
  CREDIT_AMOUNT_CENTS,
  CREDIT_CURRENCY,
  expiresAt,
  usableCredits,
  creditFromPayment,
  reserveCredit,
  releaseCredit,
  redeemCredit,
  revokeCreditsForPaymentIntent,
  expireCredits,
  creditView
};
