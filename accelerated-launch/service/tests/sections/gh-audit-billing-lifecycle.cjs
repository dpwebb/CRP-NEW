'use strict';
// Fictional in-memory stores and loopback Stripe REST doubles only. No real
// credentials, providers, consumers, stores or deployments are touched.
const { EMPTY_STATE } = require('../../private-store.cjs');
const entitlement = require('../../entitlement.cjs');
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
    const calls = [], provider = { provider_id: 'stripe', async cancelRenewal(request) { calls.push(request); return { renewal_cancelled: true, subscription_reference: request.subscription_reference }; } };
    const before = entitlement.statusFor(store, actor.account_id);
    check.equal(before.entitled, false, state + ': expired/refunded access remains denied');
    check.equal(before.renewal_cancellation_available, true, state + ': renewal can still be stopped');
    const stopped = await entitlement.cancelEntitlement(store, actor, {}, {}, { provider });
    check.equal(calls.length, 1, state + ': cancellation actually calls the bound provider');
    check.equal(stopped.entitlement.entitled, false, state + ': cancellation does not grant access');
    check.equal(stopped.entitlement.renewal_status, 'CANCELLATION_CONFIRMED', state + ': confirmation is recorded');
    check.ok(stopped.plain.includes('paid access has ended'), state + ': message does not claim continuing paid access');
  }
  const failureStore = memory(), failureActor = subscriber(failureStore, 'failure', { state: 'EXPIRED', expires_at: oneHourAgo });
  const failureBefore = failureStore.state();
  await refusal(check, entitlement.cancelEntitlement(failureStore, failureActor, {}, {}, { provider: { provider_id: 'stripe', async cancelRenewal() { throw Error('fixture failure'); } } }), 'SUBSCRIPTION_CANCELLATION_FAILED', 'provider failure is explicit');
  check.deepEqual(failureStore.state(), failureBefore, 'provider cancellation failure preserves local state');

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
    async cancelAccountSubscription(request) { calls.push('subscription:' + request.subscription_reference); return { renewal_cancelled: true, subscription_reference: request.subscription_reference }; }
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
    return { renewal_cancelled: true, subscription_reference: request.subscription_reference };
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
  return { proof: 'FICTIONAL_MEMORY_AND_LOOPBACK_PROVIDER_ONLY', grace_boundary: true, expired_cancellation: true, safe_complete_deletion: true, concurrency_binding: true, stripe_adapter_ownership: true };
}
module.exports = { id: 'gh-audit-billing-lifecycle', title: 'Safe provider-bound deletion, independent renewal cancellation and bounded failed-payment grace', run };

if (require.main === module) {
  const assert = require('node:assert/strict'); let passed = 0;
  const check = Object.fromEntries(['equal', 'deepEqual', 'ok'].map(name => [name, (...args) => { assert[name](...args); passed++; }]));
  run(null, check).then(proof => process.stdout.write(JSON.stringify({ passed, failed: 0, skipped: 0, proof }) + '\n')).catch(error => { process.stderr.write(error.stack + '\n'); process.exitCode = 1; });
}
