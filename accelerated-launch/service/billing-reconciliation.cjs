'use strict';
// Historical receipts are imported only after an account-scoped provider read.
// This repairs absent old net-payment values without minting catalog-price credits.
const payments = require('./payment-provider.cjs');
const credits = require('./billing-credits.cjs');
const { ServiceError } = require('./errors.cjs');
const pendingReads = new Map();

async function reconcileAccountPayments(store, actor, env, options = {}) {
  const provider = payments.resolveProvider(env);
  if (!provider?.readPaidReceipts) return;
  await require('./checkout-purchase.cjs').reconcileOpenCheckouts(store, actor, provider);
  const state = store.state();
  const account = state.accounts.find(a => a.account_id === actor.account_id);
  const checkouts = state.checkout_sessions.filter(c => c.account_id === actor.account_id &&
    c.provider_id === 'stripe' && c.state === 'COMPLETED');
  if (!account || !checkouts.length) return;
  if (!options.force && Date.now() - Date.parse(account.payment_history_checked_at || '') < 300000) return;
  const key = `${store.dataDir || ''}:${actor.account_id}`;
  if (pendingReads.has(key)) return pendingReads.get(key);
  const task = (async () => {
    let receipts;
    try { receipts = await provider.readPaidReceipts({ account_id: actor.account_id, checkouts }); }
    catch (error) { throw new ServiceError('PAYMENT_HISTORY_UNAVAILABLE', { reason: error.code || 'PROVIDER_RECEIPTS_UNAVAILABLE' }); }
    store.update(live => {
      if (!live.accounts.some(a => a.account_id === actor.account_id)) throw new ServiceError('AUTHENTICATION_REQUIRED');
      for (const receipt of receipts) {
        if (receipt.account_id !== actor.account_id || receipt.verified_payment !== true) throw new ServiceError('BILLING_EVENT_REJECTED');
        const refunds = live.billing_events.filter(e => e.account_id === actor.account_id && e.outcome === 'APPLIED' &&
          e.effect === 'REVOKE' && e.payment_intent && e.payment_intent === receipt.payment_intent);
        if (receipt.refunded || receipt.disputed || receipt.refunded_cents > 0 || refunds.length) {
          // Keep the immutable receipt and its revocation, even when a refund arrived first.
          credits.recordPayment(live, { ...receipt, refunded: false, disputed: false });
          const full = receipt.refunded || receipt.disputed || refunds.some(e => e.type === 'charge.dispute.created' || e.refunded_cents === null || e.refunded_cents === undefined);
          const amount = Math.max(receipt.refunded_cents || 0, ...refunds.map(e => e.refunded_cents || 0));
          const revoked = full ? credits.revokePayment(live, actor.account_id, receipt.payment_intent, receipt.payment_id)
            : credits.refundPayment(live, actor.account_id, receipt.payment_intent, receipt.payment_id, amount);
          for (const checkoutId of revoked.affected_checkout_ids || []) {
            const pending = live.checkout_sessions.find(c => c.checkout_id === checkoutId);
            if (pending && ['OPEN', 'OPENING'].includes(pending.state)) pending.state = 'CREDIT_REVOKED';
          }
        }
        else {
          const saved = credits.recordPayment(live, receipt);
          if (!saved.created && !['PAYMENT_ALREADY_RECORDED', 'NO_CASH_PAYMENT'].includes(saved.reason)) {
            throw new ServiceError('PAYMENT_HISTORY_UNAVAILABLE', { reason: saved.reason });
          }
        }
      }
      live.accounts.find(a => a.account_id === actor.account_id).payment_history_checked_at = new Date().toISOString();
    });
    await require('./checkout-purchase.cjs').reconcileOpenCheckouts(store, actor, provider);
  })();
  pendingReads.set(key, task);
  try { return await task; } finally { pendingReads.delete(key); }
}
module.exports = { reconcileAccountPayments };
