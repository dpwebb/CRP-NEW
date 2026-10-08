'use strict';
/**
 * test-stripe-adapter.cjs — unit tests for the Stripe webhook signature verification and event normalisation,
 * against a local mock of the Stripe API (no network, no key). The real Stripe API calls are exercised
 * separately in SOURCE_CAPTURES/B4-PAY-001/ (test mode).
 */

const assert = require('node:assert/strict');
const http = require('node:http');
const crypto = require('node:crypto');
const stripe = require('../stripe.cjs');
const { makeStripeAdapter, STRIPE_UPGRADE_CREDIT_COUPON } = require('../payment-provider.cjs');

const WEBHOOK_SECRET = 'whsec_test_unit_secret';
const PRICE_IDS = { report_once: 'price_report', monthly: 'price_monthly', annual: 'price_annual' };

/** A tiny mock Stripe API that answers session/subscription/price retrieval. */
function startMock() {
  const fixture = {
    session: { id: 'cs_test_1', mode: 'subscription', status: 'complete', livemode: false, payment_status: 'paid',
      amount_total: 795, currency: 'cad', client_reference_id: 'acc_1',
      metadata: { account_id: 'acc_1', plan_code: 'monthly', checkout_id: 'chk_1' }, subscription: 'sub_1',
      line_items: { data: [{ price: { id: PRICE_IDS.monthly } }] } },
    subscription: { id: 'sub_1', status: 'active', livemode: false, cancel_at_period_end: false,
      current_period_end: Math.floor(Date.now() / 1000) + 86400 * 30,
      metadata: { account_id: 'acc_1', plan_code: 'monthly', checkout_id: 'chk_1' } },
    updateStatus: 200, updateGate: null, updateResponse: null
  };
  const calls = [];
  const server = http.createServer((req, res) => {
    const call = { method: req.method, path: req.url, version: req.headers['stripe-version'],
      idempotency_key: req.headers['idempotency-key'] || null };
    calls.push(call);
    const respond = (obj, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
    if (req.method === 'POST' && req.url === '/v1/checkout/sessions') {
      let body = '';
      req.on('data', (bytes) => { body += bytes; });
      req.on('end', () => {
        call.body = body;
        const params = new URLSearchParams(body);
        fixture.session.client_reference_id = params.get('client_reference_id');
        fixture.session.metadata = { account_id: params.get('metadata[account_id]'),
          plan_code: params.get('metadata[plan_code]'), checkout_id: params.get('metadata[checkout_id]') };
        fixture.subscription.metadata = { ...fixture.session.metadata };
        fixture.session.line_items = { data: [{ price: { id: params.get('line_items[0][price]') } }] };
        fixture.session.mode = params.get('mode');
        respond({ id: fixture.session.id, mode: fixture.session.mode, url: 'https://checkout.example.test/fixture' });
      });
      return;
    }
    if (req.url.startsWith('/v1/checkout/sessions/')) {
      return respond(fixture.session);
    }
    if (req.url.startsWith('/v1/subscriptions/')) {
      if (req.method === 'POST') {
        let body = '';
        req.on('data', (bytes) => { body += bytes; });
        req.on('end', async () => {
          call.body = body;
          if (fixture.updateStarted) fixture.updateStarted();
          if (fixture.updateGate) await fixture.updateGate;
          if (fixture.updateStatus !== 200) return respond({ error: { message: 'fictional cancellation failure' } }, fixture.updateStatus);
          if (fixture.updateResponse) return respond(fixture.updateResponse);
          fixture.subscription.cancel_at_period_end = true;
          respond(fixture.subscription);
        });
        return;
      }
      return respond(fixture.subscription);
    }
    if (req.url.startsWith('/v1/prices/')) {
      return respond({ id: PRICE_IDS.monthly, currency: 'cad', unit_amount: 795, recurring: { interval: 'month' }, type: 'recurring' });
    }
    if (req.url.startsWith('/v1/payment_intents/')) {
      return respond({ id: 'pi_1', metadata: { account_id: 'acc_1', plan_code: 'report_once' } });
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: { message: 'not found' } }));
  });
  server.fixture = fixture;
  server.calls = calls;
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

function signedEvent(secret, body) {
  const raw = JSON.stringify(body);
  const t = Math.floor(Date.now() / 1000);
  const v1 = crypto.createHmac('sha256', secret).update(`${t}.${raw}`).digest('hex');
  return { raw, headers: { 'stripe-signature': `t=${t},v1=${v1}` } };
}

async function main() {
  const mock = await startMock();
  const base = `http://127.0.0.1:${mock.address().port}`;
  const env = {
    STRIPE_SECRET_KEY: 'sk_test_unit',
    STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET,
    STRIPE_PRICE_REPORT_ONCE: PRICE_IDS.report_once,
    STRIPE_PRICE_MONTHLY: PRICE_IDS.monthly,
    STRIPE_PRICE_ANNUAL: PRICE_IDS.annual,
    STRIPE_APP_ORIGINS: 'http://127.0.0.1:8787',
    [STRIPE_UPGRADE_CREDIT_COUPON]: 'coupon_1',
    CRP_STRIPE_API_BASE: base
  };
  const adapter = makeStripeAdapter(env);
  try {

  // 1. A well-formed signed checkout event normalises into the entitlement shape.
  const good = signedEvent(WEBHOOK_SECRET, {
    id: 'evt_1', type: 'checkout.session.completed', created: Math.floor(Date.now() / 1000),
    data: { object: { id: 'cs_test_1', mode: 'subscription', payment_status: 'paid', amount_total: 200, currency: 'cad', client_reference_id: 'acc_1', metadata: { account_id: 'acc_1', plan_code: 'monthly' }, subscription: 'sub_1' } }
  });
  const verified = await adapter.verifyEvent({ rawBody: good.raw, headers: good.headers });
  assert.equal(verified.verified, true, 'signed event verifies');
  assert.equal(verified.event.account_reference, 'acc_1', 'account resolved from server-set metadata');
  assert.equal(verified.event.plan_code, 'monthly', 'plan resolved');
  assert.equal(verified.event.payment_verified, true, 'payment verified');
  assert.ok(verified.event.period_end, 'real subscription period boundary carried');
  assert.equal(verified.event.subscription_reference, 'sub_1', 'activation retains its own provider subscription reference');

  // 2. A bad signature is refused.
  const bad = await adapter.verifyEvent({ rawBody: good.raw, headers: { 'stripe-signature': 't=0,v1=deadbeef' } });
  assert.equal(bad.verified, false, 'bad signature refused');

  // 3. An unpaid checkout-completed event is verified but flagged not-paid.
  const unpaid = signedEvent(WEBHOOK_SECRET, {
    id: 'evt_2', type: 'checkout.session.completed', created: Math.floor(Date.now() / 1000),
    data: { object: { id: 'cs_test_1', mode: 'subscription', payment_status: 'unpaid', amount_total: 200, currency: 'cad', client_reference_id: 'acc_1', metadata: { account_id: 'acc_1', plan_code: 'monthly' }, subscription: 'sub_1' } }
  });
  const unverified = await adapter.verifyEvent({ rawBody: unpaid.raw, headers: unpaid.headers });
  assert.equal(unverified.event.payment_verified, false, 'unpaid event carries payment_verified: false');

  // 4. A charge.refunded event resolves the account from the payment intent metadata.
  const refund = signedEvent(WEBHOOK_SECRET, {
    id: 'evt_3', type: 'charge.refunded', created: Math.floor(Date.now() / 1000),
    data: { object: { id: 'ch_1', payment_intent: 'pi_1', amount: 595, currency: 'cad' } }
  });
  const refunded = await adapter.verifyEvent({ rawBody: refund.raw, headers: refund.headers });
  assert.equal(refunded.verified, true, 'refund event verifies');
  assert.equal(refunded.event.account_reference, 'acc_1', 'refund account resolved');
  assert.equal(refunded.event.payment_intent, 'pi_1', 'payment intent carried for credit revocation');

  const cancellation = { account_id: 'acc_1', checkout_id: 'chk_1', provider_reference: 'cs_test_1', plan_code: 'monthly' };
  const cancelled = await adapter.cancelRenewal(cancellation);
  assert.equal(cancelled.renewal_cancelled, true, 'renewal success follows a real adapter request to the mock provider');
  assert.equal(cancelled.subscription_reference, 'sub_1', 'the subscription is resolved from the owned Checkout');
  const updates = () => mock.calls.filter((call) => call.method === 'POST');
  assert.equal(updates().length, 1);
  assert.equal(updates()[0].path, '/v1/subscriptions/sub_1');
  assert.equal(updates()[0].body, 'cancel_at_period_end=true', 'only renewal is stopped');
  assert.equal(updates()[0].version, stripe.STRIPE_API_VERSION, 'the existing pinned API remains in use');
  assert.ok(updates()[0].idempotency_key);
  await adapter.cancelRenewal(cancellation);
  assert.equal(updates().length, 1, 'repeat cancellation reads the provider confirmation without another write');

  const validSession = structuredClone(mock.fixture.session), validSubscription = structuredClone(mock.fixture.subscription);
  const mismatchControls = [
    ['session.mode', 'payment'], ['session.status', 'open'], ['session.payment_status', 'unpaid'],
    ['session.id', 'cs_test_other'], ['session.livemode', true], ['session.client_reference_id', 'acc_other'],
    ['session.metadata.account_id', 'acc_other'], ['session.metadata.plan_code', 'annual'],
    ['session.metadata.checkout_id', 'chk_other'], ['session.line_items.data.0.price.id', 'price_other'],
    ['session.subscription', 'sub_invalid/path'], ['subscription.id', 'sub_other'], ['subscription.livemode', true],
    ['subscription.metadata.account_id', 'acc_other'], ['subscription.metadata.plan_code', 'annual'],
    ['subscription.metadata.checkout_id', 'chk_other'], ['subscription.status', 'incomplete']
  ];
  for (const [field, value] of mismatchControls) {
    mock.fixture.session = structuredClone(validSession); mock.fixture.subscription = structuredClone(validSubscription);
    const keys = field.split('.'); let target = mock.fixture;
    for (const key of keys.slice(0, -1)) target = target[key]; target[keys.at(-1)] = value;
    const before = updates().length;
    await assert.rejects(adapter.cancelRenewal(cancellation), /CANCELLATION_/, field + ' cannot cancel another or unconfirmed purchase');
    assert.equal(updates().length, before, field + ' is refused before any provider mutation');
  }
  mock.fixture.session = structuredClone(validSession); mock.fixture.subscription = structuredClone(validSubscription);
  mock.fixture.subscription.cancel_at_period_end = false; mock.fixture.updateStatus = 503;
  await assert.rejects(adapter.cancelRenewal(cancellation), /CANCELLATION_NOT_CONFIRMED/);
  assert.equal(mock.fixture.subscription.cancel_at_period_end, false, 'provider failure supplies no false confirmation');
  mock.fixture.updateStatus = 200; mock.fixture.updateResponse = structuredClone(mock.fixture.subscription);
  await assert.rejects(adapter.cancelRenewal(cancellation), /CANCELLATION_NOT_CONFIRMED/);
  mock.fixture.updateResponse = null;
  await assert.rejects(adapter.cancelRenewal({ ...cancellation, plan_code: 'report_once' }), /CANCELLATION_REQUEST_NOT_BOUND/);
  const restrictedAdapter = makeStripeAdapter({ ...env, STRIPE_SECRET_KEY: 'rk_test_unit' });
  assert.equal((await restrictedAdapter.cancelRenewal(cancellation)).renewal_cancelled, true, 'restricted test keys preserve the mode check');

  const deletedEvent = { id: 'evt_deleted', type: 'customer.subscription.deleted', livemode: false,
    data: { object: { ...validSubscription, status: 'canceled' } } };
  const deleted = signedEvent(WEBHOOK_SECRET, deletedEvent);
  const normalizedDeleted = await adapter.verifyEvent({ rawBody: deleted.raw, headers: deleted.headers });
  assert.equal(normalizedDeleted.verified, true, 'the actual Stripe subscription deletion event verifies');
  assert.equal(normalizedDeleted.event.type, 'subscription.deleted', 'the event maps to the existing cancellation effect');
  assert.equal(normalizedDeleted.event.account_reference, 'acc_1');
  assert.equal(normalizedDeleted.event.checkout_reference, 'chk_1', 'the server Checkout metadata binds deletion to its own purchase');
  for (const changed of [{ ...deletedEvent, livemode: true },
    { ...deletedEvent, data: { object: { ...deletedEvent.data.object, livemode: true } } },
    { ...deletedEvent, data: { object: { ...deletedEvent.data.object, metadata: { account_id: 'acc_1', plan_code: 'report_once', checkout_id: 'chk_1' } } } },
    { ...deletedEvent, data: { object: { ...deletedEvent.data.object, metadata: { account_id: 'acc_1', plan_code: 'monthly' } } } }]) {
    const signed = signedEvent(WEBHOOK_SECRET, changed);
    assert.equal((await adapter.verifyEvent({ rawBody: signed.raw, headers: signed.headers })).verified, false,
      'wrong mode or non-subscription metadata cannot map into subscription cancellation');
  }

  console.log('PASS: Stripe signature/event normalization, real renewal cancellation, ownership/mode/metadata refusals, provider failure and idempotency');
  } finally { await new Promise((resolve) => mock.close(resolve)); }
}

if (require.main === module) main().catch((err) => { console.error(err); process.exitCode = 1; });
module.exports = { startMock, signedEvent, PRICE_IDS };
