'use strict';
// Fictional in-memory stores and loopback Stripe REST doubles only. No real
// credentials, providers, consumers, stores or deployments are touched.
const { EMPTY_STATE } = require('../../private-store.cjs');
const entitlement = require('../../entitlement.cjs');
const credits = require('../../billing-credits.cjs');
const cases = require('../../cases.cjs');
const { makeStripeAdapter } = require('../../payment-provider.cjs');
const { StripeUpgradeFixture } = require('../stripe-upgrade-fixture.cjs');
const clone = value => structuredClone(value);

function memory() {
  let state = clone(EMPTY_STATE);
  return { updating: false, state: () => clone(state), update(fn) { this.updating = true; try { const next = clone(state), result = fn(next); state = next; return result; } finally { this.updating = false; } }, deleteBlob() { return true; } };
}
function subscriber(store, suffix = 'one', patch = {}) {
  const actor = { account_id: 'acc_' + suffix };
  store.update(s => {
    s.accounts.push({ ...actor, email: suffix + '@example.test' });
    s.entitlements.push({ ...actor, entitlement_id: 'ent_' + suffix, checkout_id: 'chk_' + suffix,
      source: 'stripe', state: 'ACTIVE', access_via: 'SUBSCRIPTION', plan_code: 'monthly', currency: 'cad',
      provider_reference: 'cs_' + suffix, provider_subscription_reference: 'sub_' + suffix,
      expires_at: '2099-01-01T00:00:00.000Z', cancel_at_period_end: false, ...patch });
    s.checkout_sessions.push({ ...actor, checkout_id: 'chk_' + suffix, provider_id: 'stripe', state: 'COMPLETED',
      plan_code: 'monthly', currency: 'cad', provider_reference: 'cs_' + suffix, provider_subscription_reference: 'sub_' + suffix });
  });
  return actor;
}
async function refusal(check, promise, code, label) {
  let actual; try { await promise; } catch (error) { actual = error.code; }
  check.equal(actual, code, label);
}

async function run(t, check) {
  const at = '2026-10-14T12:00:00.000Z', oneHourAgo = '2026-10-14T11:00:00.000Z';
  const grace = { state: 'ACTIVE', expires_at: oneHourAgo };
  entitlement.applyEffect(grace, 'PAST_DUE', 'monthly', {}, at);
  check.equal(entitlement.observed(grace, at).state, 'PAST_DUE', 'renewal failure grants grace after the paid period ends');
  check.equal(grace.grace_until, '2026-10-17T12:00:00.000Z', 'grace lasts exactly 72 hours');
  entitlement.applyEffect(grace, 'PAST_DUE', 'monthly', {}, '2026-10-15T12:00:00.000Z');
  check.equal(grace.grace_until, '2026-10-17T12:00:00.000Z', 'another failure does not extend the unpaid period indefinitely');
  check.equal(entitlement.observed(grace, '2026-10-17T11:59:59.999Z').state, 'PAST_DUE', 'grace remains available until its boundary');
  check.equal(entitlement.observed(grace, grace.grace_until).state, 'EXPIRED', 'grace ends exactly at its boundary');
  check.equal(entitlement.observed({ ...grace, grace_until: 'invalid' }, at).state, 'EXPIRED', 'invalid grace never grants access');
  const graceStore = memory(); graceStore.update(s => s.entitlements.push({ ...grace, account_id: 'acc_grace', access_via: 'SUBSCRIPTION' }));
  check.equal(entitlement.statusFor(graceStore, 'acc_grace', { now: at }).entitled, true, 'effective grace reaches the entitlement gate');
  check.equal(entitlement.statusFor(graceStore, 'acc_grace', { now: grace.grace_until }).entitled, false, 'ended grace does not reach the entitlement gate');

  for (const state of ['EXPIRED', 'CANCELLED']) {
    const store = memory(), actor = subscriber(store, state.toLowerCase(), { state, expires_at: oneHourAgo });
    const calls = [], provider = { provider_id: 'stripe', async cancelAccountSubscription(request) { calls.push(request); return { renewal_cancelled: true, subscription_reference: request.subscription_reference, subscription_status: 'canceled' }; } };
    const before = entitlement.statusFor(store, actor.account_id);
    check.equal(before.entitled, false, state + ': expired/refunded access remains denied');
    check.equal(before.renewal_cancellation_available, true, state + ': renewal can still be stopped');
    const stopped = await entitlement.cancelEntitlement(store, actor, {}, {}, { provider });
    check.equal(calls.length, 1, state + ': cancellation actually calls the bound provider');
    check.equal(stopped.entitlement.entitled, false, state + ': cancellation does not grant access');
    check.equal(stopped.entitlement.renewal_status, 'CANCELLATION_CONFIRMED', state + ': confirmation is recorded');
    check.equal(stopped.at_period_end, false, state + ': cancellation stops provider collection immediately');
    check.equal(store.state().entitlements[0].provider_subscription_status, 'canceled', state + ': confirmed ended provider status is persisted');
    check.ok(stopped.plain.includes('paid access has ended'), state + ': message does not claim continuing paid access');
  }
  const failureStore = memory(), failureActor = subscriber(failureStore, 'failure', { state: 'EXPIRED', expires_at: oneHourAgo });
  const failureBefore = failureStore.state();
  await refusal(check, entitlement.cancelEntitlement(failureStore, failureActor, {}, {}, { provider: { provider_id: 'stripe', async cancelAccountSubscription() { throw Error('fixture failure'); } } }), 'SUBSCRIPTION_CANCELLATION_FAILED', 'provider failure is explicit');
  check.deepEqual(failureStore.state(), failureBefore, 'provider cancellation failure preserves local state');
  await refusal(check, entitlement.cancelEntitlement(failureStore, failureActor, {}, {}, { provider: { provider_id: 'stripe', async cancelAccountSubscription(request) {
    return { renewal_cancelled: true, subscription_reference: request.subscription_reference, subscription_status: 'active' };
  } } }), 'SUBSCRIPTION_CANCELLATION_FAILED', 'period-end scheduling alone cannot claim an expired subscription has stopped collecting');
  check.deepEqual(failureStore.state(), failureBefore, 'unconfirmed terminal status preserves local state');
  for (const state of ['ACTIVE', 'PAST_DUE']) {
    const paidStore = memory(), paidActor = subscriber(paidStore, 'paid-' + state, { state,
      ...(state === 'PAST_DUE' ? { expires_at: oneHourAgo, grace_until: new Date(Date.now() + 3600000).toISOString() } : {}) });
    let scheduled = 0, immediate = 0;
    const result = await entitlement.cancelEntitlement(paidStore, paidActor, {}, {}, { provider: { provider_id: 'stripe', async cancelRenewal(request) {
      scheduled++; return { renewal_cancelled: true, subscription_reference: request.subscription_reference, subscription_status: 'active' };
    }, async cancelAccountSubscription() { immediate++; throw Error('must retain paid access'); } } });
    check.equal(result.at_period_end, true, state + ': normal renewal cancellation keeps current paid/grace access');
    check.equal(scheduled, 1, state + ': period-end provider method used');
    check.equal(immediate, 0, state + ': deletion method not used for ordinary paid/grace cancellation');
  }
  const quoted = memory(), quotedActor = subscriber(quoted, 'quoted', { state: 'EXPIRED', expires_at: oneHourAgo });
  quoted.update(s => s.entitlements.push({ account_id: quotedActor.account_id, entitlement_id: 'ent_once', source: 'stripe',
    state: 'ACTIVE', access_via: 'ONE_TIME_CREDIT', plan_code: 'report_once', expires_at: '2099-01-01T00:00:00.000Z' }));
  check.equal(entitlement.statusFor(quoted, quotedActor.account_id).access_via, 'ONE_TIME_CREDIT', 'one-time access does not hide the older uncancelled subscription');
  for (const code of ['monthly', 'annual']) {
    const quote = entitlement.upgradeQuotes(quoted, quotedActor)[code];
    check.equal(quote.allowed, false, code + ': recurring quote blocks outstanding expired renewal despite paid one-time access');
    check.equal(quote.reason, 'SUBSCRIPTION_RENEWAL_UNCONFIRMED', code + ': quote explains which action is needed');
  }
  check.equal(entitlement.upgradeQuotes(quoted, quotedActor).report_once.allowed, true, 'earlier recurring renewal does not block another one-time report choice');
  const blockedRevision = entitlement.upgradeQuotes(quoted, quotedActor).monthly.revision;
  const quotedStopped = await entitlement.cancelEntitlement(quoted, quotedActor, {}, {}, { provider: { provider_id: 'stripe', async cancelAccountSubscription(request) {
    return { renewal_cancelled: true, subscription_reference: request.subscription_reference, subscription_status: 'canceled' };
  } } });
  check.equal(quotedStopped.entitlement.access_via, 'ONE_TIME_CREDIT', 'stopping the expired subscription preserves independent one-time access');
  check.ok(!quotedStopped.plain.includes('paid access has ended'), 'stopping one subscription does not claim that independent paid report access ended');
  check.equal(entitlement.upgradeQuotes(quoted, quotedActor).monthly.allowed, true, 'confirmed earlier cancellation releases replacement subscription choices');
  check.ok(entitlement.upgradeQuotes(quoted, quotedActor).monthly.revision !== blockedRevision, 'cancellation changes the immutable quote revision');

  const unpaid = memory(), unpaidActor = subscriber(unpaid, 'unpaid', { state: 'PENDING', granted_at: null });
  unpaid.update(s => { s.checkout_sessions[0].state = 'OPEN'; });
  check.equal(entitlement.statusFor(unpaid, unpaidActor.account_id).renewing_subscription_recorded, false, 'an unpaid checkout is not advertised as a renewing subscription');
  let unpaidStops = 0;
  const unpaidProvider = { provider_id: 'stripe', async cancelCheckout() { unpaidStops++; return { cancelled: true }; } };
  const unpaidCancelled = await entitlement.cancelEntitlement(unpaid, unpaidActor, {}, {}, { provider: unpaidProvider });
  check.equal(unpaidStops, 1, 'cancelling an unpaid Stripe intent expires the actual provider checkout');
  check.equal(unpaidCancelled.entitlement.entitled, false, 'stopped unpaid checkout grants no paid access');
  check.equal((await cases.deleteAccountSafely(unpaid, unpaidActor, {}, { provider: unpaidProvider })).deleted, true, 'stopped unpaid subscription intent does not become a phantom completed subscription');
  const unpaidDelete = memory(), unpaidDeleteActor = subscriber(unpaidDelete, 'unpaid-delete', { state: 'PENDING', granted_at: null });
  unpaidDelete.update(s => { s.checkout_sessions[0].state = 'OPEN'; });
  check.equal((await cases.deleteAccountSafely(unpaidDelete, unpaidDeleteActor, {}, { provider: unpaidProvider })).deleted, true, 'direct account deletion stops an unpaid subscription and then deletes it');

  const store = memory(), actor = subscriber(store), stranger = subscriber(store, 'stranger');
  store.update(s => {
    s.entitlements.push({ ...s.entitlements[0], entitlement_id: 'ent_old', checkout_id: 'chk_old', provider_reference: 'cs_old', provider_subscription_reference: 'sub_old', state: 'EXPIRED' });
    s.checkout_sessions.push({ ...s.checkout_sessions[0], checkout_id: 'chk_old', provider_reference: 'cs_old', provider_subscription_reference: 'sub_old' });
    s.checkout_sessions.push({ account_id: actor.account_id, checkout_id: 'chk_pending', provider_id: 'stripe', state: 'OPEN', plan_code: 'report_once', provider_reference: 'cs_pending' });
    s.checkout_sessions.push({ account_id: actor.account_id, checkout_id: 'chk_upgrade', provider_id: 'stripe', state: 'OPEN', plan_code: 'annual', provider_reference: 'in_upgrade', is_subscription_upgrade: true, provider_subscription_reference: 'sub_one' });
    for (const key of ['cases', 'files', 'results', 'drafts', 'packets', 'sessions', 'billing_events', 'upgrade_credits', 'purchased_downloads']) {
      s[key].push({ account_id: actor.account_id, case_id: 'case_one', file_id: 'a'.repeat(32) });
      s[key].push({ account_id: stranger.account_id, case_id: 'case_stranger', file_id: 'b'.repeat(32) });
    }
  });
  const foreignBefore = Object.fromEntries(Object.entries(store.state()).filter(([, rows]) => Array.isArray(rows)).map(([key, rows]) => [key, rows.filter(r => r.account_id === stranger.account_id)]));
  const calls = [], provider = {
    provider_id: 'stripe',
    async cancelCheckout(request) { calls.push('checkout:' + request.checkout_id); return { cancelled: true }; },
    async cancelAccountSubscription(request) { calls.push('subscription:' + request.subscription_reference); return { renewal_cancelled: true, subscription_reference: request.subscription_reference, subscription_status: 'canceled' }; }
  };
  const deleted = await cases.deleteAccountSafely(store, actor, {}, { provider });
  check.equal(deleted.deleted, true, 'confirmed provider cleanup permits deletion');
  check.deepEqual(calls, ['checkout:chk_upgrade', 'checkout:chk_pending', 'subscription:sub_old', 'subscription:sub_one'], 'pending upgrades/checkouts stop before every distinct subscription');
  for (const [key, rows] of Object.entries(store.state()).filter(([, rows]) => Array.isArray(rows))) {
    check.equal(rows.some(r => r.account_id === actor.account_id), false, 'deleted account is absent from ' + key);
    check.deepEqual(rows.filter(r => r.account_id === stranger.account_id), foreignBefore[key], 'other account preserved in ' + key);
  }
  const retained = memory(), retainedActor = subscriber(retained, 'retained'), retainedBefore = retained.state();
  await refusal(check, cases.deleteAccountSafely(retained, retainedActor, {}, { provider: { provider_id: 'stripe', async cancelAccountSubscription() { throw Error('fixture failure'); } } }), 'ACCOUNT_DELETION_PAYMENT_UNCONFIRMED', 'deletion refuses unconfirmed subscription cancellation');
  check.deepEqual(retained.state(), retainedBefore, 'failed deletion retains consumer data and payment bindings');
  await cases.deleteAccountSafely(retained, retainedActor, {}, { provider });
  check.equal(retained.state().accounts.length, 0, 'retry after provider recovery succeeds');

  const stale = memory(), staleActor = subscriber(stale, 'stale');
  await refusal(check, cases.deleteAccountSafely(stale, staleActor, {}, { provider: { provider_id: 'stripe', async cancelAccountSubscription(request) {
    stale.update(s => { s.checkout_sessions.push({ ...s.checkout_sessions[0], checkout_id: 'chk_new', provider_reference: 'cs_new' }); });
    return { renewal_cancelled: true, subscription_reference: request.subscription_reference, subscription_status: 'canceled' };
  } } }), 'ACCOUNT_DELETION_STALE', 'a new purchase while provider cancellation waits prevents deletion');
  check.equal(stale.state().accounts.length, 1, 'concurrent purchase retains the account');
  check.equal(stale.state().checkout_sessions.length, 2, 'concurrent purchase binding is preserved');
  const protectedStore = memory(), protectedActor = subscriber(protectedStore, 'protected');
  let guardInsideTransaction = false;
  await refusal(check, cases.deleteAccountSafely(protectedStore, protectedActor, {}, { provider, beforeDelete() {
    guardInsideTransaction = protectedStore.updating;
    const error = Error('coordinator authority guard'); error.code = 'ROOT_AUTHORITY_GUARD'; throw error;
  } }), 'ROOT_AUTHORITY_GUARD', 'final coordinator guard error is preserved unchanged');
  check.equal(guardInsideTransaction, true, 'authority guard executes inside the final synchronous store transaction');
  check.equal(protectedStore.state().accounts.length, 1, 'new protected authority prevents deletion after awaited payment cleanup');

  const partial = memory(), partialActor = subscriber(partial, 'partial');
  partial.update(s => s.checkout_sessions.push({ account_id: partialActor.account_id, checkout_id: 'chk_stop', state: 'OPEN', provider_id: 'stripe', plan_code: 'report_once', provider_reference: 'cs_stop' }));
  await refusal(check, cases.deleteAccountSafely(partial, partialActor, {}, { provider: { provider_id: 'stripe', async cancelCheckout() { return { cancelled: true }; }, async cancelAccountSubscription() { throw Error('later failure'); } } }), 'ACCOUNT_DELETION_PAYMENT_UNCONFIRMED', 'later failure keeps deletion recoverable');
  check.equal(partial.state().checkout_sessions.find(c => c.checkout_id === 'chk_stop').state, 'CANCELLED', 'already confirmed checkout cancellation remains truthful after later failure');
  check.equal(partial.state().accounts.length, 1, 'partial cancellation never deletes the account');
  const empty = memory(); empty.update(s => s.accounts.push({ account_id: 'acc_free' }));
  check.equal((await cases.deleteAccountSafely(empty, { account_id: 'acc_free' }, {})).deleted, true, 'unpaid account deletion requires no provider');

  const reportStore = memory(), reportActor = subscriber(reportStore, 'reports');
  reportStore.update(s => {
    s.cases.push({ account_id: reportActor.account_id, case_id: 'case_remove', status: 'OPEN' },
      { account_id: reportActor.account_id, case_id: 'case_keep', status: 'OPEN' });
    s.files.push({ account_id: reportActor.account_id, case_id: 'case_remove', file_id: 'c'.repeat(32) });
    s.checkout_sessions.push({ account_id: reportActor.account_id, checkout_id: 'chk_report_open', provider_id: 'stripe', state: 'OPEN', plan_code: 'report_once', case_id: 'case_remove', provider_reference: 'cs_report_open' },
      { account_id: reportActor.account_id, checkout_id: 'chk_report_paid', provider_id: 'stripe', state: 'COMPLETED', plan_code: 'report_once', case_id: 'case_remove', provider_reference: 'cs_report_paid' },
      { account_id: reportActor.account_id, checkout_id: 'chk_other_open', provider_id: 'stripe', state: 'OPEN', plan_code: 'report_once', case_id: 'case_keep', provider_reference: 'cs_other_open' });
    s.entitlements.push({ account_id: reportActor.account_id, entitlement_id: 'ent_report_open', checkout_id: 'chk_report_open', source: 'stripe', state: 'PENDING', plan_code: 'report_once', access_via: 'ONE_TIME_CREDIT' });
  });
  const keptBefore = reportStore.state().checkout_sessions.filter(c => c.checkout_id !== 'chk_report_open');
  const subscriptionBefore = reportStore.state().entitlements.find(e => e.plan_code === 'monthly');
  const reportCalls = [];
  const reportDeleted = await cases.deleteCaseSafely(reportStore, reportActor, 'case_remove', {}, { provider: { provider_id: 'stripe', async cancelCheckout(request) {
    reportCalls.push(request.checkout_id); return { cancelled: true };
  }, async cancelAccountSubscription() { throw Error('must not cancel account subscription for report deletion'); } } });
  check.equal(reportDeleted.deleted, true, 'report deletes after its pending one-time payment is stopped');
  check.deepEqual(reportCalls, ['chk_report_open'], 'report deletion stops only its own pending one-time payment');
  check.deepEqual(reportStore.state().checkout_sessions.filter(c => c.checkout_id !== 'chk_report_open'), keptBefore, 'completed receipts and other reports retain their original payment rows');
  check.deepEqual(reportStore.state().entitlements.find(e => e.plan_code === 'monthly'), subscriptionBefore, 'report deletion does not change subscription authority');
  check.equal(reportStore.state().checkout_sessions.find(c => c.checkout_id === 'chk_report_open').state, 'CANCELLED', 'stopped one-time checkout is persisted and no longer payable locally');
  check.equal(reportStore.state().cases.some(c => c.case_id === 'case_remove'), false, 'deleted report stops resolving');
  check.equal(reportStore.state().cases.some(c => c.case_id === 'case_keep'), true, 'other report remains');
  const failedReport = memory(), failedReportActor = subscriber(failedReport, 'failed-report');
  failedReport.update(s => {
    s.cases.push({ account_id: failedReportActor.account_id, case_id: 'case_failed', status: 'OPEN' });
    s.checkout_sessions.push({ account_id: failedReportActor.account_id, checkout_id: 'chk_failed_report', provider_id: 'stripe', state: 'OPEN', plan_code: 'report_once', case_id: 'case_failed', provider_reference: 'cs_failed_report' });
  });
  const failedReportBefore = failedReport.state();
  await refusal(check, cases.deleteCaseSafely(failedReport, failedReportActor, 'case_failed', {}, { provider: { provider_id: 'stripe', async cancelCheckout() { return { cancelled: false }; } } }), 'CASE_DELETION_PAYMENT_UNCONFIRMED', 'unconfirmed report payment cleanup refuses deletion');
  check.deepEqual(failedReport.state(), failedReportBefore, 'unconfirmed cleanup preserves the report and its payment binding');
  await refusal(check, cases.deleteCaseSafely(failedReport, failedReportActor, 'case_failed', {}, { provider: { provider_id: 'stripe', async cancelCheckout() {
    failedReport.update(s => { s.cases[0].status = 'REVIEWED'; }); return { cancelled: true };
  } } }), 'CASE_DELETION_STALE', 'report change during awaited cancellation refuses stale deletion');
  check.equal(failedReport.state().cases.length, 1, 'changed report remains available');
  check.equal((await cases.deleteCaseSafely(failedReport, failedReportActor, 'case_failed', {}, { provider: { provider_id: 'stripe', async cancelCheckout() { return { cancelled: true }; } } })).deleted, true, 'report deletion can be retried after refreshed binding');
  const newUpload = memory(), newUploadActor = subscriber(newUpload, 'upload-race');
  newUpload.update(s => {
    s.cases.push({ account_id: newUploadActor.account_id, case_id: 'case_upload', status: 'OPEN' });
    s.checkout_sessions.push({ account_id: newUploadActor.account_id, checkout_id: 'chk_upload', provider_id: 'stripe', state: 'OPEN', plan_code: 'report_once', case_id: 'case_upload', provider_reference: 'cs_upload' });
  });
  await refusal(check, cases.deleteCaseSafely(newUpload, newUploadActor, 'case_upload', {}, { provider: { provider_id: 'stripe', async cancelCheckout() {
    newUpload.update(s => { s.files.push({ account_id: newUploadActor.account_id, case_id: 'case_upload', file_id: 'd'.repeat(32), stored_sha256: 'a'.repeat(64) }); });
    return { cancelled: true };
  } } }), 'CASE_DELETION_STALE', 'a new upload during awaited payment cleanup prevents stale report deletion');
  check.equal(newUpload.state().files.length, 1, 'new upload metadata is retained');
  await refusal(check, cases.deleteCaseSafely(newUpload, { account_id: 'acc_foreign' }, 'case_upload', {}, { provider: { provider_id: 'stripe', async cancelCheckout() { throw Error('must not access foreign payment'); } } }), 'NOT_AUTHORIZED', 'foreign report deletion fails before any payment operation');

  const unfinished = memory(), unfinishedActor = subscriber(unfinished, 'unfinished');
  const unfinishedId = 'chk_unfinished_payment';
  unfinished.update(s => {
    s.checkout_sessions.push({ account_id: unfinishedActor.account_id, checkout_id: unfinishedId, provider_id: 'stripe', state: 'OPEN', plan_code: 'annual', currency: 'cad', provider_reference: 'cs_unfinished' },
      { account_id: unfinishedActor.account_id, checkout_id: 'chk_leave_open', provider_id: 'stripe', state: 'OPEN', plan_code: 'report_once', provider_reference: 'cs_leave_open' });
    s.entitlements.push({ account_id: unfinishedActor.account_id, entitlement_id: 'ent_pending_unfinished', checkout_id: unfinishedId,
      state: 'PENDING', source: 'stripe', access_via: 'SUBSCRIPTION', plan_code: 'annual', expires_at: null });
    credits.recordPayment(s, { account_id: unfinishedActor.account_id, payment_id: 'in_unused_monthly', payment_intent: 'pi_unused_monthly',
      plan_code: 'monthly', amount_cents: 795, currency: 'cad', paid_at: at, verified_payment: true });
  });
  credits.reserveCredit(unfinished, unfinishedActor.account_id, unfinishedId, new Date().toISOString(), 'annual', 'cad');
  const activeBefore = unfinished.state().entitlements[0], receiptBefore = unfinished.state().checkout_sessions[0];
  const remainingBefore = unfinished.state().checkout_sessions.find(c => c.checkout_id === 'chk_leave_open');
  const unfinishedCalls = [], unfinishedProvider = { provider_id: 'stripe', async cancelCheckout(request) { unfinishedCalls.push(request.checkout_id); return { cancelled: true }; },
    async cancelRenewal() { throw Error('must not cancel current plan'); }, async cancelAccountSubscription() { throw Error('must not end current plan'); } };
  const unfinishedCancelled = await entitlement.cancelEntitlement(unfinished, unfinishedActor, { cancel_checkout_id: unfinishedId }, {}, { provider: unfinishedProvider });
  check.equal(unfinishedCancelled.checkout_cancelled, true, 'explicit unfinished-payment action returns a scoped confirmation');
  check.deepEqual(unfinishedCalls, [unfinishedId], 'unfinished cancellation targets only the selected owned checkout');
  check.deepEqual(unfinished.state().entitlements[0], activeBefore, 'unfinished cancellation preserves the current paid plan byte-for-byte');
  check.deepEqual(unfinished.state().checkout_sessions[0], receiptBefore, 'unfinished cancellation preserves completed purchase receipts');
  check.deepEqual(unfinished.state().checkout_sessions.find(c => c.checkout_id === 'chk_leave_open'), remainingBefore, 'another unfinished payment remains untouched');
  check.equal(unfinished.state().checkout_sessions.find(c => c.checkout_id === unfinishedId).state, 'CANCELLED', 'provider-confirmed unfinished intent closes locally');
  check.equal(unfinished.state().entitlements.find(e => e.entitlement_id === 'ent_pending_unfinished').state, 'CANCELLED', 'only its pending entitlement is cancelled');
  check.equal(unfinished.state().upgrade_credits[0].state, 'ELIGIBLE', 'confirmed stop releases the held upgrade credit');
  check.equal(unfinished.state().upgrade_credits[0].reserved_for_checkout_id, null, 'released credit is no longer bound to the stopped intent');
  for (const id of [null, '', 123, receiptBefore.checkout_id, 'chk_unknown']) {
    await refusal(check, entitlement.cancelEntitlement(unfinished, unfinishedActor, { cancel_checkout_id: id }, {}, { provider: unfinishedProvider }), 'CHECKOUT_NOT_FOUND', 'invalid or completed unfinished-payment selection cannot fall through into current-plan cancellation');
  }
  await refusal(check, entitlement.cancelPendingCheckout(unfinished, { account_id: 'acc_stranger' }, 'chk_leave_open', {}, { provider: unfinishedProvider }), 'CHECKOUT_NOT_FOUND', 'another account cannot close the owned provider intent');
  check.equal(unfinishedCalls.length, 1, 'invalid/foreign/completed selections make no provider call');
  check.deepEqual(unfinished.state().entitlements[0], activeBefore, 'rejected selections preserve current plan authority');

  for (const outcome of [{ cancelled: false }, { cancelled: true, paid: true }, 'throw']) {
    const retryStore = memory(), retryActor = subscriber(retryStore, 'unfinished-retry');
    retryStore.update(s => s.checkout_sessions.push({ account_id: retryActor.account_id, checkout_id: 'chk_retry', provider_id: 'stripe', state: 'OPEN', plan_code: 'report_once', provider_reference: 'cs_retry' }));
    const prior = retryStore.state();
    await refusal(check, entitlement.cancelPendingCheckout(retryStore, retryActor, 'chk_retry', {}, { provider: { provider_id: 'stripe', async cancelCheckout() {
      if (outcome === 'throw') throw Error('fictional network failure'); return outcome;
    } } }), 'CHECKOUT_CANCELLATION_FAILED', 'failed/unconfirmed/paid provider result refuses unfinished-payment cancellation');
    check.deepEqual(retryStore.state(), prior, 'failed/unconfirmed/paid cancellation preserves every stored row');
  }
  const paidRace = memory(), paidRaceActor = subscriber(paidRace, 'unfinished-race');
  paidRace.update(s => s.checkout_sessions.push({ account_id: paidRaceActor.account_id, checkout_id: 'chk_race', provider_id: 'stripe', state: 'OPEN', plan_code: 'report_once', provider_reference: 'cs_race' }));
  await refusal(check, entitlement.cancelPendingCheckout(paidRace, paidRaceActor, 'chk_race', {}, { provider: { provider_id: 'stripe', async cancelCheckout() {
    paidRace.update(s => { s.checkout_sessions.find(c => c.checkout_id === 'chk_race').state = 'COMPLETED'; }); return { cancelled: true };
  } } }), 'CHECKOUT_CANCELLATION_STALE', 'concurrent paid completion cannot be overwritten as cancelled');
  check.equal(paidRace.state().checkout_sessions.find(c => c.checkout_id === 'chk_race').state, 'COMPLETED', 'concurrent completed receipt survives stale cancellation');
  const opening = memory(), openingActor = subscriber(opening, 'opening');
  opening.update(s => s.checkout_sessions.push({ account_id: openingActor.account_id, checkout_id: 'chk_opening_payment', provider_id: 'stripe', state: 'OPENING', plan_code: 'report_once', provider_reference: null,
    provider_request: { account_id: openingActor.account_id, checkout_id: 'chk_opening_payment', plan_code: 'report_once', request_started_at: new Date().toISOString() } }));
  const openingCalls = [];
  await entitlement.cancelPendingCheckout(opening, openingActor, 'chk_opening_payment', {}, { provider: { provider_id: 'stripe', async createCheckout(request) {
    openingCalls.push(['recover', request.checkout_id, request.resume]); return { provider_reference: 'cs_recovered' };
  }, async cancelCheckout(request) { openingCalls.push(['expire', request.provider_reference]); return { cancelled: true }; } } });
  check.deepEqual(openingCalls, [['recover', 'chk_opening_payment', true], ['expire', 'cs_recovered']], 'crashed ordinary opening is recovered with its original request before confirmed expiry');
  check.equal(opening.state().checkout_sessions.find(c => c.checkout_id === 'chk_opening_payment').provider_reference, 'cs_recovered', 'recovered cancelled intent retains its provider custody reference');
  const revoked = memory(), revokedActor = subscriber(revoked, 'revoked');
  revoked.update(s => s.checkout_sessions.push({ account_id: revokedActor.account_id, checkout_id: 'chk_revoked_payment', provider_id: 'stripe', state: 'CREDIT_REVOKED', plan_code: 'annual', provider_reference: 'cs_revoked' }));
  check.equal((await entitlement.cancelPendingCheckout(revoked, revokedActor, 'chk_revoked_payment', {}, { provider: unfinishedProvider })).checkout_cancelled, true, 'credit-revoked owned intent can be explicitly stopped');
  const synthetic = memory(), syntheticActor = subscriber(synthetic, 'synthetic');
  synthetic.update(s => s.checkout_sessions.push({ account_id: syntheticActor.account_id, checkout_id: 'chk_synthetic_payment', provider_id: require('../../payment-provider.cjs').TEST_PROVIDER_ID, state: 'OPEN', plan_code: 'report_once' }));
  check.equal((await entitlement.cancelPendingCheckout(synthetic, syntheticActor, 'chk_synthetic_payment', {})).checkout_cancelled, true, 'nonfinancial test-adapter unfinished intent closes without a working provider');

  const fixture = await new StripeUpgradeFixture().listen();
  try {
    const originalRoute = fixture.route.bind(fixture);
    fixture.route = async call => {
      if (call.method === 'DELETE' && /^\/v1\/subscriptions\/sub_/.test(call.path)) {
        const subscription = fixture.subscriptions.get(call.path.split('/').at(-1));
        if (!subscription) return { status: 404, body: {} };
        subscription.status = 'canceled'; subscription.cancel_at_period_end = false;
        return { body: clone(subscription) };
      }
      return originalRoute(call);
    };
    const adapter = makeStripeAdapter(fixture.env('http://127.0.0.1:8787'));
    const created = await adapter.createCheckout({ account_id: 'acc_rest', checkout_id: 'chk_rest', plan_code: 'monthly', currency: 'cad', credit_amount_cents: 0, return_url: 'http://127.0.0.1:8787/' });
    const session = fixture.completeSession(created.provider_reference), sub = fixture.subscriptions.get(session.subscription);
    const original = { account_id: 'acc_rest', checkout_id: 'chk_rest', provider_id: 'stripe', state: 'COMPLETED', plan_code: 'monthly', currency: 'cad', provider_reference: session.id, provider_subscription_reference: sub.id };
    const upgradeRequest = { account_id: 'acc_rest', checkout_id: 'chk_pending_upgrade', plan_code: 'annual', currency: 'cad', existing_plan_code: 'monthly', existing_checkout_id: original.checkout_id,
      provider_reference: original.provider_reference, subscription_reference: sub.id, credit_amount_cents: 0, return_url: 'http://127.0.0.1:8787/' };
    const upgrade = await adapter.upgradeSubscription(upgradeRequest);
    const upgradeStore = memory(), upgradeActor = subscriber(upgradeStore, 'rest', { provider_reference: original.provider_reference, provider_subscription_reference: sub.id });
    upgradeStore.update(s => { s.checkout_sessions[0] = clone(original); s.checkout_sessions.push({ account_id: 'acc_rest', checkout_id: upgradeRequest.checkout_id, provider_id: 'stripe', state: 'OPEN', plan_code: 'annual', currency: 'cad', provider_reference: upgrade.provider_reference,
      provider_subscription_reference: sub.id, is_subscription_upgrade: true, previous_entitlement_id: 'ent_rest', provider_request: upgradeRequest }); });
    const upgradePlanBefore = upgradeStore.state().entitlements[0];
    const stoppedUpgrade = await entitlement.cancelEntitlement(upgradeStore, upgradeActor, { cancel_checkout_id: upgradeRequest.checkout_id }, {}, { provider: adapter });
    check.equal(stoppedUpgrade.checkout_cancelled, true, 'actual adapter voids an unfinished upgrade through the scoped cancellation path');
    check.equal(fixture.invoices.get(upgrade.provider_reference).status, 'void', 'unfinished upgrade invoice is voided at loopback provider');
    check.equal(sub.metadata.checkout_id, original.checkout_id, 'voided upgrade restores original subscription metadata');
    check.equal(sub.status, 'active', 'stopping unfinished upgrade keeps existing subscription active');
    check.equal(sub.cancel_at_period_end, false, 'stopping unfinished upgrade does not cancel current renewal');
    check.deepEqual(upgradeStore.state().entitlements[0], upgradePlanBefore, 'actual adapter cancellation preserves current paid local plan');
    // A paid annual upgrade has replaced metadata, while old Checkout metadata
    // remains monthly. Both persisted bindings are known to the account.
    const invoice = fixture.invoice(sub, 'annual', 7950, { status: 'paid', paid: true, amount_paid: 7950 });
    const upgraded = { ...original, checkout_id: 'chk_upgraded', plan_code: 'annual', provider_reference: invoice.id };
    sub.metadata = { account_id: 'acc_rest', checkout_id: 'chk_upgraded', plan_code: 'annual', previous_checkout_id: 'chk_rest' };
    const stopped = await adapter.cancelAccountSubscription({ account_id: 'acc_rest', provider_reference: original.provider_reference, checkouts: [original, upgraded] });
    check.equal(stopped.renewal_cancelled, true, 'actual adapter resolves old Checkout to the current known upgraded subscription');
    check.equal(sub.status, 'canceled', 'deletion immediately stops the subscription rather than deferring unpaid renewal collection');
    const deletionCall = fixture.calls.find(c => c.method === 'DELETE' && c.path.includes('/subscriptions/'));
    check.deepEqual(deletionCall.params, { invoice_now: 'false', prorate: 'false' }, 'immediate deletion cancellation requests no final charge or proration');
    const writes = fixture.calls.filter(c => c.method !== 'GET' && c.path.includes('/subscriptions/')).length;
    await adapter.cancelAccountSubscription({ account_id: 'acc_rest', provider_reference: invoice.id, subscription_reference: sub.id, checkouts: [original, upgraded] });
    check.equal(fixture.calls.filter(c => c.method !== 'GET' && c.path.includes('/subscriptions/')).length, writes, 'repeated provider confirmation does not repeat cancellation writes');
    sub.metadata.account_id = 'acc_foreign';
    let refused = false; try { await adapter.cancelAccountSubscription({ account_id: 'acc_rest', provider_reference: session.id, checkouts: [original, upgraded] }); } catch { refused = true; }
    check.equal(refused, true, 'foreign subscription metadata fails closed');
    check.equal(fixture.calls.filter(c => c.method !== 'GET' && c.path.includes('/subscriptions/')).length, writes, 'foreign binding causes no provider mutation');
    sub.metadata.account_id = 'acc_rest'; sub.livemode = true;
    refused = false; try { await adapter.cancelAccountSubscription({ account_id: 'acc_rest', provider_reference: session.id, checkouts: [original, upgraded] }); } catch { refused = true; }
    check.equal(refused, true, 'foreign live/test mode fails closed');
    sub.livemode = false; sub.metadata.checkout_id = 'chk_unknown';
    refused = false; try { await adapter.cancelAccountSubscription({ account_id: 'acc_rest', provider_reference: session.id, checkouts: [original, upgraded] }); } catch { refused = true; }
    check.equal(refused, true, 'unknown current checkout metadata fails closed');
    check.equal(fixture.calls.filter(c => c.method !== 'GET' && c.path.includes('/subscriptions/')).length, writes, 'mode/unknown checkout refusals never write');
  } finally { await fixture.close(); }
  check.equal(entitlement.PAID_ACTIONS.includes('REQUEST_RESPONSE_DRAFT'), false, 'unimplemented response drafts are not advertised as paid actions');
  check.equal(entitlement.SUBSCRIBER_ACTIONS.includes('REQUEST_RESPONSE_DRAFT'), false, 'unimplemented response drafts are not advertised as subscriber actions');
  return { proof: 'FICTIONAL_MEMORY_AND_LOOPBACK_PROVIDER_ONLY', grace_boundary: true, expired_cancellation: true,
    ended_subscription_collection: true, recurring_quote_control: true, safe_complete_deletion: true,
    safe_report_deletion: true, unfinished_payment_cancellation: true, concurrency_binding: true, stripe_adapter_ownership: true };
}
module.exports = { id: 'gh-audit-billing-lifecycle', title: 'Safe provider-bound deletion, independent renewal cancellation and bounded failed-payment grace', run };

if (require.main === module) {
  const assert = require('node:assert/strict'); let passed = 0;
  const check = Object.fromEntries(['equal', 'deepEqual', 'ok'].map(name => [name, (...args) => { assert[name](...args); passed++; }]));
  run(null, check).then(proof => process.stdout.write(JSON.stringify({ passed, failed: 0, skipped: 0, proof }) + '\n')).catch(error => { process.stderr.write(error.stack + '\n'); process.exitCode = 1; });
}
