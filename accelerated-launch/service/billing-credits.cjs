'use strict';
/**
 * Unused, verified lower-plan payments count toward upgrades without expiring.
 * Each receipt preserves its actual cash payment. Allocations reserve that money
 * for one checkout, and settlement consumes only the amount actually credited.
 * Call recordPayment/settleReservations inside the entitlement's atomic update.
 */
const crypto = require('node:crypto');
const plans = require('./plan-catalog.cjs');
const CREDIT_CURRENCY = 'cad';
// Compatibility only: this is a catalog price, never an assumed payment amount.
const CREDIT_AMOUNT_CENTS = plans.BASE_PRICE_CAD_CENTS.report_once;
const CREDIT_STATES = Object.freeze({ ELIGIBLE: 'ELIGIBLE', RESERVED: 'RESERVED',
  REDEEMED: 'REDEEMED', EXPIRED: 'EXPIRED', REVOKED: 'REVOKED' });
const validAmount = value => Number.isSafeInteger(value) && value >= 0;
const validId = value => typeof value === 'string' && value.length > 0;

function expiresAt() { return null; }

/** Project old, trusted one-report receipts without reviving money already spent. */
function normalized(row) {
  if (!row || !validId(row.credit_id) || !validId(row.account_id) || !validId(row.payment_id) ||
      !validAmount(row.amount_cents) || row.currency !== CREDIT_CURRENCY ||
      !Number.isFinite(Date.parse(row.paid_at)) || row.verified_payment === false) return null;
  const legacy = !row.source_plan_code && !row.plan_code && row.amount_cents === CREDIT_AMOUNT_CENTS;
  const sourcePlan = row.source_plan_code || row.plan_code || (legacy ? 'report_once' : null);
  if (!plans.isPlanCode(sourcePlan) || (!legacy && row.verified_payment !== true)) return null;
  if (!Object.values(CREDIT_STATES).includes(row.state)) return null;
  const consumed = row.consumed_cents === undefined
    ? (row.state === CREDIT_STATES.REDEEMED ? row.amount_cents : 0) : row.consumed_cents;
  if (!validAmount(consumed) || consumed > row.amount_cents) return null;
  const remaining = row.amount_cents - consumed;
  if (row.remaining_amount_cents !== undefined && row.remaining_amount_cents !== remaining) return null;
  // A historically fully-redeemed receipt is never reset to eligible by migration.
  if (row.state === CREDIT_STATES.REDEEMED && remaining !== 0) return null;
  const reserved = row.state === CREDIT_STATES.RESERVED
    ? (row.reserved_amount_cents === undefined ? remaining : row.reserved_amount_cents) : 0;
  if (!validAmount(reserved) || reserved > remaining ||
      (row.state === CREDIT_STATES.RESERVED && (!reserved || !validId(row.reserved_for_checkout_id)))) return null;
  let state = row.state === CREDIT_STATES.EXPIRED ? CREDIT_STATES.ELIGIBLE : row.state;
  if (row.refunded || row.disputed) state = CREDIT_STATES.REVOKED;
  if (remaining === 0 && state !== CREDIT_STATES.REVOKED) state = CREDIT_STATES.REDEEMED;
  return { ...row, source_plan_code: sourcePlan, verified_payment: true,
    consumed_cents: consumed, remaining_amount_cents: remaining,
    reserved_amount_cents: state === CREDIT_STATES.RESERVED ? reserved : 0,
    state, expires_at: null };
}

function normalizeRows(state) {
  if (!Array.isArray(state.upgrade_credits)) state.upgrade_credits = [];
  for (const row of state.upgrade_credits) {
    const value = normalized(row);
    if (value) Object.assign(row, value);
  }
}

function lowerPlan(sourcePlan, targetPlan) {
  return plans.isPlanCode(sourcePlan) && ['monthly', 'annual'].includes(targetPlan) &&
    plans.BASE_PRICE_CAD_CENTS[sourcePlan] < plans.BASE_PRICE_CAD_CENTS[targetPlan];
}

/** Reads are projections. They do not change stored assessments or billing rows. */
function usableCredits(state, accountId, nowIso, targetPlan = 'annual') {
  const at = Date.parse(nowIso);
  if (!Number.isFinite(at)) throw new Error('EXPLICIT_VALID_CURRENT_TIME_REQUIRED');
  return (state.upgrade_credits || []).map(normalized).filter(Boolean)
    .filter(row => row.account_id === accountId && row.state === CREDIT_STATES.ELIGIBLE &&
      row.remaining_amount_cents > 0 && Date.parse(row.paid_at) <= at && lowerPlan(row.source_plan_code, targetPlan))
    .sort((a, b) => String(a.paid_at).localeCompare(String(b.paid_at)) || String(a.payment_id).localeCompare(String(b.payment_id)));
}

function sumAmounts(rows) {
  let amount = 0;
  for (const row of rows) {
    amount += row.remaining_amount_cents;
    if (!Number.isSafeInteger(amount)) throw new Error('UPGRADE_CREDIT_TOTAL_OUT_OF_RANGE');
  }
  return amount;
}

function quote(state, accountId, nowIso, targetPlan, currentPlan) {
  const target = plans.plan(targetPlan);
  const rows = targetPlan === 'report_once' ? [] : usableCredits(state, accountId, nowIso, targetPlan);
  const available = sumAmounts(rows);
  const isCurrent = currentPlan === targetPlan;
  const allowed = !currentPlan || !plans.isPlanCode(currentPlan) ||
    plans.BASE_PRICE_CAD_CENTS[targetPlan] > plans.BASE_PRICE_CAD_CENTS[currentPlan];
  const credit = allowed ? Math.min(available, target.amount_cents) : 0;
  return { plan_code: targetPlan, currency: target.currency, regular_cents: target.amount_cents,
    credit_cents: credit, first_invoice_cents: target.amount_cents - credit,
    renewal_cents: target.amount_cents, eligible: credit > 0,
    available_credit_cents: available, remaining_credit_cents: available - credit,
    source_plan_codes: plans.PLAN_CODES.filter(code => rows.some(row => row.source_plan_code === code)),
    source_payment_ids: rows.map(row => row.payment_id), expires_at: null,
    is_current: isCurrent, allowed };
}

function quotesFor(store, accountId, nowIso, currentPlan) {
  const state = store.state();
  return Object.fromEntries(plans.PLAN_CODES.map(code => [code, quote(state, accountId, nowIso, code, currentPlan)]));
}

/** Only a verified receipt may mint credit; catalog prices and client claims do not. */
function recordPayment(state, payment) {
  const value = payment || {};
  if (value.verified_payment !== true) return { created: false, credit: null, reason: 'PAYMENT_NOT_VERIFIED' };
  if (!validId(value.account_id) || !validId(value.payment_id) || !plans.isPlanCode(value.plan_code) ||
      !validAmount(value.amount_cents) || value.currency !== CREDIT_CURRENCY ||
      !Number.isFinite(Date.parse(value.paid_at)) || Date.parse(value.paid_at) > Date.now() ||
      value.refunded || value.disputed) return { created: false, credit: null, reason: 'INVALID_VERIFIED_PAYMENT' };
  if (value.amount_cents === 0) return { created: false, credit: null, reason: 'NO_CASH_PAYMENT' };
  normalizeRows(state);
  const paymentIntent = validId(value.payment_intent) ? value.payment_intent : null;
  const existing = state.upgrade_credits.find(row => row.payment_id === value.payment_id ||
    (paymentIntent && row.payment_intent === paymentIntent));
  if (existing) {
    if (existing.account_id !== value.account_id || existing.source_plan_code !== value.plan_code ||
        existing.amount_cents !== value.amount_cents || existing.currency !== value.currency ||
        (paymentIntent && existing.payment_intent && existing.payment_intent !== paymentIntent) ||
        (paymentIntent && state.upgrade_credits.some(row => row !== existing && row.payment_intent === paymentIntent))) {
      return { created: false, credit: null, reason: 'PAYMENT_RECEIPT_MISMATCH' };
    }
    // An authoritative re-read may fill a formerly absent intent, never change it.
    if (paymentIntent && !existing.payment_intent) existing.payment_intent = paymentIntent;
    return { created: false, credit: existing, reason: 'PAYMENT_ALREADY_RECORDED' };
  }
  const credit = { credit_id: 'crd_' + crypto.randomBytes(12).toString('hex'),
    account_id: value.account_id, payment_id: value.payment_id, payment_intent: paymentIntent,
    source_plan_code: value.plan_code, amount_cents: value.amount_cents, currency: value.currency,
    verified_payment: true, state: CREDIT_STATES.ELIGIBLE, paid_at: value.paid_at,
    expires_at: null, consumed_cents: 0, remaining_amount_cents: value.amount_cents,
    reserved_amount_cents: 0, reserved_total_cents: null, reserved_for_checkout_id: null, reserved_at: null,
    redeemed_at: null, redeemed_checkout_id: null, redeemed_plan_code: null,
    allocations: [], revoked_reason: null };
  state.upgrade_credits.push(credit);
  return { created: true, credit, reason: null };
}

function creditFromPayment(store, accountId, paymentId, paymentIntent, paidAt, details) {
  const receipt = typeof accountId === 'object' ? accountId : { ...(details || {}),
    account_id: accountId, payment_id: paymentId, payment_intent: paymentIntent, paid_at: paidAt };
  return store.update(state => recordPayment(state, receipt));
}

/** Reserve all contributing receipts in the same store update. */
function reserveCredit(store, accountId, checkoutId, nowIso, targetPlan = 'monthly') {
  if (!validId(checkoutId) || !['monthly', 'annual'].includes(targetPlan)) {
    return { reserved: false, reason: 'INVALID_UPGRADE_RESERVATION' };
  }
  return store.update(state => {
    normalizeRows(state);
    const existing = state.upgrade_credits.filter(row => row.state === CREDIT_STATES.RESERVED &&
      row.reserved_for_checkout_id === checkoutId);
    if (existing.length) {
      if (existing.some(row => row.account_id !== accountId || row.reserved_plan_code !== targetPlan)) {
        return { reserved: false, reason: 'RESERVATION_OWNER_OR_PLAN_MISMATCH' };
      }
      const total = existing.reduce((sum, row) => sum + row.reserved_amount_cents, 0);
      if (!validAmount(total) || existing.some(row => row.reserved_total_cents !== undefined && row.reserved_total_cents !== total)) {
        return { reserved: false, reason: 'RESERVATION_ALLOCATION_INCOMPLETE' };
      }
      return reservationView(existing, targetPlan);
    }
    const candidates = usableCredits(state, accountId, nowIso, targetPlan);
    let needed = plans.BASE_PRICE_CAD_CENTS[targetPlan];
    const allocated = [];
    for (const candidate of candidates) {
      if (needed === 0) break;
      const row = state.upgrade_credits.find(value => value.credit_id === candidate.credit_id);
      const amount = Math.min(needed, candidate.remaining_amount_cents);
      row.state = CREDIT_STATES.RESERVED;
      row.reserved_for_checkout_id = checkoutId;
      row.reserved_plan_code = targetPlan;
      row.reserved_amount_cents = amount;
      row.reserved_at = nowIso;
      allocated.push(row);
      needed -= amount;
    }
    if (!allocated.length) return { reserved: false, reason: 'NO_ELIGIBLE_CREDIT', amount_cents: 0,
      currency: CREDIT_CURRENCY, allocations: [] };
    const total = allocated.reduce((sum, row) => sum + row.reserved_amount_cents, 0);
    for (const row of allocated) row.reserved_total_cents = total;
    return reservationView(allocated, targetPlan);
  });
}

function reservationView(rows, targetPlan) {
  const amount = rows.reduce((total, row) => total + row.reserved_amount_cents, 0);
  return { reserved: true, credit_id: rows[0].credit_id, credit_ids: rows.map(row => row.credit_id),
    amount_cents: amount, currency: CREDIT_CURRENCY, plan_code: targetPlan,
    allocations: rows.map(row => ({ credit_id: row.credit_id, payment_id: row.payment_id,
      source_plan_code: row.source_plan_code, amount_cents: row.reserved_amount_cents })) };
}

function clearReservation(row) {
  row.reserved_amount_cents = 0;
  row.reserved_total_cents = null;
  row.reserved_for_checkout_id = null;
  row.reserved_plan_code = null;
  row.reserved_at = null;
}

function releaseReservations(state, checkoutId) {
  normalizeRows(state);
  const rows = state.upgrade_credits.filter(row => row.state === CREDIT_STATES.RESERVED &&
    row.reserved_for_checkout_id === checkoutId);
  for (const row of rows) {
    row.state = row.remaining_amount_cents > 0 ? CREDIT_STATES.ELIGIBLE : CREDIT_STATES.REDEEMED;
    clearReservation(row);
  }
  return { released: rows.length > 0, count: rows.length, credit_ids: rows.map(row => row.credit_id),
    credit_id: rows[0]?.credit_id || null };
}

/** A root-verified payment and entitlement change call this together atomically. */
function settleReservations(state, checkoutId, planCode, nowIso) {
  normalizeRows(state);
  const rows = state.upgrade_credits.filter(row => row.state === CREDIT_STATES.RESERVED &&
    row.reserved_for_checkout_id === checkoutId);
  if (!rows.length) return { redeemed: false, reason: 'NO_RESERVATION_FOR_THIS_CHECKOUT', amount_cents: 0 };
  if (rows.some(row => row.reserved_plan_code && row.reserved_plan_code !== planCode)) {
    return { redeemed: false, reason: 'RESERVATION_PLAN_MISMATCH', amount_cents: 0 };
  }
  if (rows.some(row => !lowerPlan(row.source_plan_code, planCode))) {
    return { redeemed: false, reason: 'RESERVATION_SOURCE_PLAN_MISMATCH', amount_cents: 0 };
  }
  const amount = rows.reduce((total, row) => total + row.reserved_amount_cents, 0);
  if (rows.some(row => row.reserved_total_cents !== undefined && row.reserved_total_cents !== amount)) {
    return { redeemed: false, reason: 'RESERVATION_ALLOCATION_INCOMPLETE', amount_cents: 0 };
  }
  if (!validAmount(amount) || amount > plans.BASE_PRICE_CAD_CENTS[planCode]) {
    return { redeemed: false, reason: 'RESERVATION_AMOUNT_MISMATCH', amount_cents: 0 };
  }
  for (const row of rows) {
    const applied = row.reserved_amount_cents;
    row.consumed_cents += applied;
    row.remaining_amount_cents -= applied;
    row.state = row.remaining_amount_cents > 0 ? CREDIT_STATES.ELIGIBLE : CREDIT_STATES.REDEEMED;
    row.redeemed_at = nowIso;
    row.redeemed_checkout_id = checkoutId;
    row.redeemed_plan_code = planCode;
    row.allocations = (row.allocations || []).concat([{ checkout_id: checkoutId,
      plan_code: planCode, amount_cents: applied, redeemed_at: nowIso }]);
    clearReservation(row);
  }
  return { redeemed: true, amount_cents: amount, credit_ids: rows.map(row => row.credit_id),
    credit_id: rows[0].credit_id };
}

function releaseCredit(store, checkoutId) {
  return store.update(state => releaseReservations(state, checkoutId));
}
function redeemCredit(store, checkoutId, planCode, nowIso) {
  return store.update(state => settleReservations(state, checkoutId, planCode, nowIso));
}

function revokePayment(state, accountId, paymentIntent, paymentId) {
  if (!validId(paymentIntent) && !validId(paymentId)) return { revoked: 0, affected_checkout_ids: [], checkout_ids: [] };
  normalizeRows(state);
  let revoked = 0;
  const affected = new Set();
  for (const row of state.upgrade_credits) {
    if (row.account_id !== accountId || !((validId(paymentIntent) && row.payment_intent === paymentIntent) ||
        (validId(paymentId) && row.payment_id === paymentId))) continue;
    row.refunded = true;
    row.revoked_reason = 'THE_UNDERLYING_PAYMENT_WAS_REFUNDED_OR_DISPUTED';
    if (row.state === CREDIT_STATES.ELIGIBLE || row.state === CREDIT_STATES.RESERVED) {
      if (row.reserved_for_checkout_id) affected.add(row.reserved_for_checkout_id);
      row.state = CREDIT_STATES.REVOKED;
      clearReservation(row);
      revoked += 1;
    }
  }
  const ids = [...affected];
  return { revoked, affected_checkout_ids: ids, checkout_ids: ids };
}
function revokeCreditsForPaymentIntent(store, accountId, paymentIntent) {
  return store.update(state => revokePayment(state, accountId, paymentIntent));
}

function expireCredits(store) {
  return store.update(state => {
    const expired = (state.upgrade_credits || []).filter(row => row.state === CREDIT_STATES.EXPIRED).length;
    normalizeRows(state);
    const stillExpired = state.upgrade_credits.filter(row => row.state === CREDIT_STATES.EXPIRED).length;
    return { expired: 0, recovered: expired - stillExpired };
  });
}

function creditView(store, accountId, nowIso, currentPlan) {
  const quotes = quotesFor(store, accountId, nowIso, currentPlan);
  const available = Math.max(...Object.values(quotes).filter(value => value.allowed)
    .map(value => value.available_credit_cents), 0);
  return { eligible: available > 0, credit_cents: available, currency: CREDIT_CURRENCY,
    expires_at: null, remaining_ms: null,
    reserved_now: (store.state().upgrade_credits || []).some(row => row.account_id === accountId && row.state === CREDIT_STATES.RESERVED),
    upgrade_quotes: quotes };
}

module.exports = { CREDIT_STATES, CREDIT_AMOUNT_CENTS, CREDIT_CURRENCY, expiresAt,
  usableCredits, recordPayment, creditFromPayment, reserveCredit, releaseReservations,
  settleReservations, releaseCredit, redeemCredit, revokePayment,
  revokeCreditsForPaymentIntent, expireCredits, creditView, quotesFor };
