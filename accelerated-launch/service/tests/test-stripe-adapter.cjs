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
      amount_total: 200, currency: 'cad', client_reference_id: 'acc_1', invoice: 'in_test_1',
      metadata: { account_id: 'acc_1', plan_code: 'monthly', checkout_id: 'chk_1' }, subscription: 'sub_1',
      line_items: { data: [{ price: { id: PRICE_IDS.monthly } }] } },
    subscription: { id: 'sub_1', status: 'active', livemode: false, cancel_at_period_end: false,
      current_period_end: Math.floor(Date.now() / 1000) + 86400 * 30,
      metadata: { account_id: 'acc_1', plan_code: 'monthly', checkout_id: 'chk_1' } },
    invoice: { id: 'in_test_1', subscription: 'sub_1', status: 'paid', paid: true, livemode: false,
      amount_paid: 200, amount_due: 200, total_tax_amounts: [], currency: 'cad', payment_intent: 'pi_monthly_1',
      lines: { data: [{ price: { id: PRICE_IDS.monthly }, quantity: 1 }] } },
    sessions: {}, subscriptions: {}, invoices: {}, intents: {}, charges: {}, coupons: {},
    updateStatus: 200, updateGate: null, updateResponse: null
  };
  const calls = [];
  const server = http.createServer((req, res) => {
    const call = { method: req.method, path: req.url, version: req.headers['stripe-version'],
      idempotency_key: req.headers['idempotency-key'] || null };
    calls.push(call);
    const respond = (obj, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
    const url = new URL(req.url, 'http://127.0.0.1');
    if (req.method === 'POST' && url.pathname === '/v1/coupons') {
      let body = '';
      req.on('data', bytes => { body += bytes; });
      req.on('end', () => {
        call.body = body;
        const params = new URLSearchParams(body), coupon = { id: params.get('id'), currency: params.get('currency'),
          amount_off: Number(params.get('amount_off')), duration: params.get('duration'), max_redemptions: Number(params.get('max_redemptions')) };
        fixture.coupons[coupon.id] = coupon; respond(coupon);
      });
      return;
    }
    if (req.method === 'GET' && url.pathname.startsWith('/v1/coupons/')) {
      const coupon = fixture.coupons[url.pathname.split('/').at(-1)];
      return respond(coupon || { error: { message: 'unknown coupon' } }, coupon ? 200 : 404);
    }
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
        const plan = fixture.session.metadata.plan_code;
        const cents = { report_once: 595, monthly: 795, annual: 7950 }[plan];
        const coupon = fixture.coupons[params.get('discounts[0][coupon]')];
        fixture.session.amount_total = cents - (coupon?.amount_off || 0);
        fixture.session.payment_status = fixture.session.amount_total === 0 ? 'no_payment_required' : 'paid';
        fixture.session.status = 'complete'; fixture.session.livemode = false; fixture.session.currency = 'cad';
        fixture.session.created = Math.floor(Date.now() / 1000);
        const suffix = fixture.session.id.slice(3), intentId = 'pi_' + suffix, chargeId = 'ch_' + suffix;
        fixture.session.payment_intent = fixture.session.mode === 'payment' ? intentId : null;
        fixture.intents[intentId] = { id: intentId, status: 'succeeded', currency: 'cad', latest_charge: chargeId,
          metadata: fixture.session.mode === 'payment' ? { ...fixture.session.metadata } : {} };
        fixture.charges[chargeId] = { id: chargeId, payment_intent: intentId, amount: fixture.session.amount_total,
          amount_refunded: 0, refunded: false, disputed: false };
        if (fixture.session.mode === 'subscription') {
          fixture.session.invoice = 'in_' + suffix;
          fixture.invoice = { id: fixture.session.invoice, subscription: fixture.session.subscription, status: 'paid', paid: true,
            livemode: false, currency: 'cad', amount_paid: fixture.session.amount_total, amount_due: fixture.session.amount_total,
            total_tax_amounts: [],
            payment_intent: fixture.session.amount_total ? intentId : null, created: fixture.session.created,
            status_transitions: { paid_at: fixture.session.created },
            lines: { data: [{ price: { id: PRICE_IDS[plan] }, quantity: 1, period: { end: fixture.subscription.current_period_end } }] } };
          fixture.invoices[fixture.invoice.id] = structuredClone(fixture.invoice);
          fixture.charges[chargeId].invoice = fixture.invoice.id;
          fixture.subscriptions[fixture.subscription.id] = structuredClone(fixture.subscription);
        } else { fixture.session.subscription = null; fixture.session.invoice = null; }
        fixture.sessions[fixture.session.id] = structuredClone(fixture.session);
        respond({ id: fixture.session.id, mode: fixture.session.mode, url: 'https://checkout.example.test/fixture' });
      });
      return;
    }
    if (req.url.startsWith('/v1/checkout/sessions/')) {
      const id = url.pathname.split('/').at(-1);
      return respond(id === fixture.session.id ? fixture.session : fixture.sessions[id] || { error: { message: 'unknown session' } },
        id === fixture.session.id || fixture.sessions[id] ? 200 : 404);
    }
    if (req.url.startsWith('/v1/subscriptions/')) {
      const id = url.pathname.split('/').at(-1);
      const subscription = id === fixture.subscription.id || id === fixture.session.subscription
        ? fixture.subscription : fixture.subscriptions[id];
      if (!subscription) return respond({ error: { message: 'unknown subscription' } }, 404);
      if (req.method === 'POST') {
        let body = '';
        req.on('data', (bytes) => { body += bytes; });
        req.on('end', async () => {
          call.body = body;
          if (fixture.updateStarted) fixture.updateStarted();
          if (fixture.updateGate) await fixture.updateGate;
          if (fixture.updateStatus !== 200) return respond({ error: { message: 'fictional cancellation failure' } }, fixture.updateStatus);
          if (fixture.updateResponse) return respond(fixture.updateResponse);
          subscription.cancel_at_period_end = true;
          fixture.subscriptions[id] = structuredClone(subscription);
          respond(subscription);
        });
        return;
      }
      return respond(subscription);
    }
    if (req.url.startsWith('/v1/prices/')) {
      const id = url.pathname.split('/').at(-1), code = Object.keys(PRICE_IDS).find(plan => PRICE_IDS[plan] === id);
      if (!code) return respond({ error: { message: 'unknown price' } }, 404);
      return respond({ id, currency: 'cad', unit_amount: { report_once: 595, monthly: 795, annual: 7950 }[code],
        ...(code === 'report_once' ? { type: 'one_time' } : { recurring: { interval: code === 'annual' ? 'year' : 'month' }, type: 'recurring' }) });
    }
    if (url.pathname === '/v1/invoices') {
      const all = { ...fixture.invoices, [fixture.invoice.id]: fixture.invoice };
      const data = Object.values(all).filter(invoice => invoice.subscription === url.searchParams.get('subscription'));
      return respond({ data, has_more: false });
    }
    if (url.pathname.startsWith('/v1/invoices/')) {
      const id = url.pathname.split('/').at(-1), invoice = id === fixture.invoice.id ? fixture.invoice : fixture.invoices[id];
      return respond(invoice || { error: { message: 'unknown invoice' } }, invoice ? 200 : 404);
    }
    if (req.url.startsWith('/v1/payment_intents/')) {
      const id = url.pathname.split('/').at(-1);
      const intent = fixture.intents[id] || (id === 'pi_1' ? { id, status: 'succeeded', currency: 'cad',
        metadata: { account_id: 'acc_1', plan_code: 'report_once' } } : null);
      return respond(intent || { error: { message: 'unknown payment intent' } }, intent ? 200 : 404);
    }
    if (url.pathname.startsWith('/v1/charges/')) {
      const id = url.pathname.split('/').at(-1);
      return respond(fixture.charges[id] || { error: { message: 'unknown charge' } }, fixture.charges[id] ? 200 : 404);
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
    data: { object: { id: 'cs_test_1', mode: 'subscription', payment_status: 'paid', amount_total: 200, currency: 'cad', client_reference_id: 'acc_1', metadata: { account_id: 'acc_1', plan_code: 'monthly' }, subscription: 'sub_1', invoice: 'in_test_1' } }
  });
  const verified = await adapter.verifyEvent({ rawBody: good.raw, headers: good.headers });
  assert.equal(verified.verified, true, 'signed event verifies');
  assert.equal(verified.event.account_reference, 'acc_1', 'account resolved from server-set metadata');
  assert.equal(verified.event.plan_code, 'monthly', 'plan resolved');
  assert.equal(verified.event.payment_verified, true, 'payment verified');
  assert.ok(verified.event.period_end, 'real subscription period boundary carried');
  assert.equal(verified.event.subscription_reference, 'sub_1', 'activation retains its own provider subscription reference');
  assert.equal(verified.event.invoice_reference, 'in_test_1', 'Checkout carries the same canonical invoice as invoice.paid');
  assert.equal(verified.event.payment_intent, 'pi_monthly_1', 'Checkout resolves its actual invoice payment intent');
  assert.equal(verified.event.amount_cents, 200, 'the actual discounted cash payment is preserved');
  const invoiceEvent = signedEvent(WEBHOOK_SECRET, { id: 'evt_initial_invoice', type: 'invoice.paid', livemode: false,
    created: Math.floor(Date.now() / 1000), data: { object: structuredClone(mock.fixture.invoice) } });
  const normalizedInvoice = await adapter.verifyEvent({ rawBody: invoiceEvent.raw, headers: invoiceEvent.headers });
  assert.equal(normalizedInvoice.verified, true, 'the canonical initial paid invoice normalizes');
  assert.equal(normalizedInvoice.event.invoice_reference, verified.event.invoice_reference, 'Checkout and invoice use one canonical receipt');
  assert.equal(normalizedInvoice.event.payment_intent, verified.event.payment_intent, 'both event types bind the same cash payment');
  assert.equal(normalizedInvoice.event.amount_cents, verified.event.amount_cents, 'both event types preserve the same actual net payment');
  assert.equal(normalizedInvoice.event.tax_cents, 0, 'an explicit empty invoice tax list verifies zero tax');
  assert.equal(verified.event.tax_cents, 0, 'subscription checkout uses the verified invoice tax');
  mock.fixture.invoice.total_tax_amounts = [{ amount: 20 }];
  const taxedInvoice = await adapter.verifyEvent({ rawBody: invoiceEvent.raw, headers: invoiceEvent.headers });
  assert.equal(taxedInvoice.event.tax_cents, 20, 'itemized invoice tax is carried for tax-exclusive referral rewards');
  mock.fixture.invoice.total_tax_amounts = [];

  // 2. A bad signature is refused.
  const bad = await adapter.verifyEvent({ rawBody: good.raw, headers: { 'stripe-signature': 't=0,v1=deadbeef' } });
  assert.equal(bad.verified, false, 'bad signature refused');

  // 3. An unpaid checkout-completed event is verified but flagged not-paid.
  const unpaid = signedEvent(WEBHOOK_SECRET, {
    id: 'evt_2', type: 'checkout.session.completed', created: Math.floor(Date.now() / 1000),
    data: { object: { id: 'cs_test_1', mode: 'subscription', payment_status: 'unpaid', amount_total: 200, currency: 'cad', client_reference_id: 'acc_1', metadata: { account_id: 'acc_1', plan_code: 'monthly' }, subscription: 'sub_1', invoice: 'in_test_1' } }
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

  // Historical reconciliation gets actual owned invoice cash, including its first-bill discount.
  mock.fixture.session = { ...structuredClone(validSession), id: 'cs_unit_annual', subscription: 'sub_unit_annual' };
  mock.fixture.subscription = { ...structuredClone(validSubscription), id: 'sub_unit_annual', cancel_at_period_end: false };
  const annual = await adapter.createCheckout({ account_id: 'acc_unit_annual', plan_code: 'annual',
    checkout_id: 'chk_unit_annual', return_url: 'http://127.0.0.1:8787/?checkout=return', credit_amount_cents: 795 });
  const annualBody = new URLSearchParams(mock.calls.filter(call => call.path === '/v1/checkout/sessions').at(-1).body);
  assert.equal(annualBody.get('line_items[0][price]'), PRICE_IDS.annual, 'yearly Checkout uses its own validated yearly Price');
  assert.equal(mock.fixture.session.amount_total, 7155, 'the provider fixture bills the exact yearly price less unused monthly cash');
  const ownedCheckout = { checkout_id: 'chk_unit_annual', provider_reference: annual.provider_reference,
    provider_subscription_reference: 'sub_unit_annual' };
  const receipts = await adapter.readPaidReceipts({ account_id: 'acc_unit_annual', checkouts: [ownedCheckout] });
  assert.equal(receipts.length, 1, 'owned invoice history has one initial cash receipt');
  assert.equal(receipts[0].payment_id, mock.fixture.session.invoice, 'historical reads use the same canonical invoice receipt');
  assert.equal(receipts[0].amount_cents, 7155, 'reconciliation never replaces discounted cash with the full catalog price');
  assert.equal(receipts[0].plan_code, 'annual', 'historical receipt keeps its original purchased plan');
  assert.equal(receipts[0].verified_payment, true, 'the provider independently confirms the paid receipt');
  await assert.rejects(adapter.readPaidReceipts({ account_id: 'acc_foreign', checkouts: [ownedCheckout] }),
    /PAYMENT_HISTORY_CHECKOUT_MISMATCH/, 'another account cannot import this invoice as upgrade cash');

  console.log('PASS: Stripe signature/event normalization, real renewal cancellation, ownership/mode/metadata refusals, provider failure and idempotency');
  } finally { await new Promise((resolve) => mock.close(resolve)); }
}

if (require.main === module) main().catch((err) => { console.error(err); process.exitCode = 1; });
module.exports = { startMock, signedEvent, PRICE_IDS };
