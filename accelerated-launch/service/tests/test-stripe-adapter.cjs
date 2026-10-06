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
  const server = http.createServer((req, res) => {
    const respond = (obj) => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
    if (req.url.startsWith('/v1/checkout/sessions/')) {
      return respond({
        id: 'cs_test_1',
        mode: 'subscription',
        payment_status: 'paid',
        amount_total: 200,
        currency: 'cad',
        client_reference_id: 'acc_1',
        metadata: { account_id: 'acc_1', plan_code: 'monthly' },
        subscription: 'sub_1',
        line_items: { data: [{ price: { id: PRICE_IDS.monthly } }] }
      });
    }
    if (req.url.startsWith('/v1/subscriptions/')) {
      return respond({ id: 'sub_1', current_period_end: 1750000000, metadata: { account_id: 'acc_1', plan_code: 'monthly' } });
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

  mock.close();
  console.log('PASS: Stripe signature verification and event normalisation (account/plan/payment/period), unpaid flag, refund resolution');
}

main().catch((err) => { console.error(err); process.exitCode = 1; });
