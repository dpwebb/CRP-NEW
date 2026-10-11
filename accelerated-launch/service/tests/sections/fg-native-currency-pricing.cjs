'use strict';
const { TestService } = require('../harness.cjs');
const plans = require('../../plan-catalog.cjs');
const location = require('../../pricing-location.cjs');
const credits = require('../../billing-credits.cjs');
const crypto = require('node:crypto');
const provider = require('../../payment-provider.cjs');
const { createService } = require('../../app.cjs');
const { StripeUpgradeFixture } = require('../stripe-upgrade-fixture.cjs');
async function run(t, check) {
  check.equal(provider.planCodeFromPrice({}, null), null, 'a missing price cannot resolve to a plan through an absent currency configuration');
  const expected = { cad: [595, 795, 7950], usd: [495, 595, 5950], aud: [595, 795, 7950], gbp: [315, 425, 4250] };
  const req = { url: '/api/pricing', socket: { remoteAddress: '127.0.0.1' }, headers: { 'x-forwarded-for': '8.8.8.8, 1.1.1.1' } };
  check.equal(location.visitorIp(req), '1.1.1.1', 'use proxy-observed final IP, not an injected first address');
  check.equal(location.visitorIp({ ...req, headers: { 'x-forwarded-for': '8.8.8.8, 1.1.1.1, 127.0.0.1' } }), '1.1.1.1', 'actual Traefik/nginx chain skips the final local proxy hop');
  check.equal(location.visitorIp({ ...req, headers: { 'x-forwarded-for': '8.8.8.8, 1.1.1.1, ::ffff:127.0.0.1, ::1' } }), '1.1.1.1', 'only trusted local hops are skipped, preserving the observed visitor over a forged prefix');
  check.equal(location.visitorIp({ ...req, socket: { remoteAddress: '9.9.9.9' } }), '9.9.9.9', 'untrusted remote forwarding header cannot replace peer IP');
  for (const [country, currency] of [['CA','cad'],['US','usd'],['AU','aud'],['GB','gbp'],['FR','usd'],[null,'usd']]) {
    const service = await new TestService('native-' + country, { geoLocate: async () => country }).listen();
    try {
      const pricing = await service.request('GET', '/api/pricing');
      check.equal(pricing.json.plan_catalog.currency, currency, String(country) + ' IP lookup selects native price or USD fallback');
      check.equal(pricing.json.plan_catalog.plans.map(p => p.amount_cents).join(','), expected[currency].join(','), 'all three actual public prices match owner table');
      const override = await service.request('GET', '/api/pricing?currency=gbp');
      check.equal(override.json.plan_catalog.currency, 'gbp', 'consumer selection overrides IP');
    } finally { await service.close(); }
  }
  check.equal(await location.resolver(async () => { throw new Error('offline'); })(req), 'usd', 'geolocation outage falls back to US prices');
  for (const currency of Object.keys(expected)) for (const [i, code] of plans.PLAN_CODES.entries()) {
    const actor = await t.unpaidAccount('native-' + currency + '-' + code + '@example.test');
    const caseId = await t.assessedCase(actor);
    const before = t.service.store.state().results.filter(r => r.case_id === caseId).map(r => r.result_id).join(',');
    const opened = await t.request('POST', '/api/billing/checkout', { token: actor.token,
      body: { plan_code: code, case_id: caseId, currency, amount_cents: 1, country: 'US' } });
    check.equal(opened.status, 201, currency + '/' + code + ' opens owned checkout');
    const checkout = opened.json.checkout;
    check.equal(checkout.plan.currency, currency, 'checkout uses explicitly chosen currency');
    check.equal(checkout.plan.amount_cents, expected[currency][i], 'browser cannot override fixed plan amount');
    const event = { id: 'test_evt_' + crypto.randomBytes(8).toString('hex'), type: 'checkout.session.completed',
      account_reference: actor.account_id, plan_code: code, session_reference: checkout.provider_reference,
      amount_cents: expected[currency][i], currency, occurred_at: new Date().toISOString() };
    const bad = await t.postEvent({ ...event, id: event.id + '_wrong', currency: currency === 'usd' ? 'cad' : 'usd' });
    check.equal(bad.json.event.accepted, false, 'signed event in another currency grants no access');
    const paid = await t.postEvent(event);
    check.equal(paid.json.event.accepted, true, 'exact signed native amount activates purchase');
    const view = await t.request('GET', '/api/cases/' + caseId, { token: actor.token });
    check.equal(view.json.view.assessment_access.complete_assessment, true, 'existing complete assessment unlocked');
    check.equal(view.json.view.assessment_access.dispute_packet, code !== 'report_once', 'packet remains subscription only');
    check.equal(t.service.store.state().results.filter(r => r.case_id === caseId).map(r => r.result_id).join(','), before, 'purchase requires no new upload or reassessment');
    if (code === 'monthly') {
      const wrong = await t.request('POST', '/api/billing/checkout', { token: actor.token, body: { plan_code: 'annual', currency: currency === 'usd' ? 'cad' : 'usd' } });
      check.equal(wrong.status, 409, 'subscription cannot switch its contracted currency during upgrade');
      const billing = await t.request('GET', '/api/billing/plans?currency=usd', { token: actor.token });
      check.equal(billing.json.plan_catalog.currency, currency, 'active subscription prices retain actual currency');
    }
  }
  const actor = await t.unpaidAccount('native-credit-buckets@example.test');
  const now = new Date().toISOString();
  t.service.store.update(state => {
    for (const currency of ['cad', 'usd']) credits.recordPayment(state, { account_id: actor.account_id,
      payment_id: 'native_bucket_' + currency, plan_code: 'report_once', amount_cents: plans.plan('report_once', currency).amount_cents,
      currency, paid_at: now, verified_payment: true });
  });
  check.equal(credits.quotesFor(t.service.store, actor.account_id, now, null, 'usd').monthly.credit_cents, 495, 'USD upgrade uses USD cash only');
  check.equal(credits.quotesFor(t.service.store, actor.account_id, now, null, 'cad').monthly.credit_cents, 595, 'historical CAD credit remains usable in CAD');
  check.equal(credits.quotesFor(t.service.store, actor.account_id, now, null, 'gbp').monthly.credit_cents, 0, 'no invented foreign-currency conversion of credits');
  check.equal(plans.applicableCredit(420, 425, 'gbp'), 395, 'GBP credit leaves its native minimum charge');
  const invalid = await t.request('GET', '/api/pricing?currency=eur');
  check.equal(invalid.status, 400, 'unsupported currency is refused explicitly');
  const mock = await new StripeUpgradeFixture().listen();
  const values = mock.env(t.base), old = Object.fromEntries(Object.keys(values).map(key => [key, process.env[key]]));
  Object.assign(process.env, values);
  t.service = createService({ dataDir: t.dataDir, geoLocate: async () => 'CA', logSink: line => t.logs.push(line) });
  try {
    for (const currency of plans.CURRENCIES) for (const code of plans.PLAN_CODES) {
      const buyer = await t.unpaidAccount('native-stripe-' + currency + '-' + code + '@example.test');
      const caseId = await t.assessedCase(buyer);
      const opened = await t.request('POST', '/api/billing/checkout', { token: buyer.token,
        body: { plan_code: code, currency, case_id: caseId, return_url: t.base + '/' } });
      check.equal(opened.status, 201, currency + '/' + code + ' validates native Stripe Price before opening');
      const request = mock.calls.filter(c => c.path === '/v1/checkout/sessions' && c.method === 'POST').at(-1);
      check.equal(request.params.currency, currency, 'Stripe Session locks selected native currency');
      check.equal(request.params['adaptive_pricing[enabled]'], 'false', 'Stripe cannot exchange-rate the fixed price');
      const session = mock.completeSession(opened.json.checkout.provider_reference);
      check.equal(session.amount_total, plans.plan(code, currency).amount_cents, 'provider bills exact fixed native amount');
      const paid = await t.request('POST', '/api/billing/events', mock.signed('checkout.session.completed', session));
      check.equal(paid.json.event.accepted, true, 'real adapter verifies signed native Stripe-shaped receipt');
      const billing = await t.request('GET', '/api/billing/plans?currency=' + currency, { token: buyer.token });
      check.equal(billing.status, 200, 'native receipt reconciliation remains valid');
      check.equal(billing.json.entitlement.currency, currency, 'stored purchase retains actual charged currency');
      if (code === 'monthly') {
        const upgrade = await t.request('POST', '/api/billing/checkout', { token: buyer.token, body: {
          plan_code: 'annual', currency, quote_revision: billing.json.upgrade_quotes.annual.revision, return_url: t.base + '/' } });
        check.equal(upgrade.status, 201, 'same-currency native upgrade replaces one subscription');
        const invoice = mock.payInvoice(upgrade.json.checkout.provider_reference);
        check.equal(invoice.amount_paid, plans.plan('annual', currency).amount_cents - plans.plan('monthly', currency).amount_cents, 'native paid monthly cash deducted once');
        const confirmed = await t.request('POST', '/api/billing/events', mock.signed('invoice.paid', mock.webhookInvoice(invoice)));
        check.equal(confirmed.json.event.accepted, true, 'signed native upgrade invoice activates annual plan');
      }
      const cancelled = code === 'report_once' ? null : await t.request('POST', '/api/entitlement/cancel', { token: buyer.token, body: {} });
      if (cancelled) check.equal(cancelled.status, 200, 'native subscription cancellation remains provider-confirmed');
    }
  } finally {
    for (const [key, value] of Object.entries(old)) if (value === undefined) delete process.env[key]; else process.env[key] = value;
    await mock.close();
  }
  return { fixed_native_price_cells: 12, fictional_transport: true, live_stripe_purchase: false };
}
module.exports = { run, id: 'fg-native-currency-pricing', title: 'Fixed native pricing, IP fallback, consumer currency choice, signed payment and currency-isolated credits' };
