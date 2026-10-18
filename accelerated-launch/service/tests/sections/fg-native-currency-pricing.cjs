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
  const legacyStatus = require('../../entitlement.cjs').statusFor({ state: () => ({ entitlements: [] }) }, 'fictional-legacy-owner');
  check.equal(legacyStatus.currency, null, 'legacy stores without checkout history retain an empty currency instead of throwing');
  check.equal(legacyStatus.entitled, false, 'missing legacy purchase history never grants access');
  const expected = { cad: [1595, 2795, 27950], usd: [1495, 2595, 25950], aud: [1595, 2795, 27950], gbp: [1315, 2425, 24250] };
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
  check.equal(credits.quotesFor(t.service.store, actor.account_id, now, null, 'usd').monthly.credit_cents, 1495, 'USD upgrade uses USD cash only');
  check.equal(credits.quotesFor(t.service.store, actor.account_id, now, null, 'cad').monthly.credit_cents, 1595, 'CAD credit uses the actual current purchase amount');
  check.equal(credits.quotesFor(t.service.store, actor.account_id, now, null, 'gbp').monthly.credit_cents, 0, 'no invented foreign-currency conversion of credits');
  check.equal(plans.applicableCredit(420, 425, 'gbp'), 395, 'GBP credit leaves its native minimum charge');
  const invalid = await t.request('GET', '/api/pricing?currency=eur');
  check.equal(invalid.status, 400, 'unsupported currency is refused explicitly');
  const mock = await new StripeUpgradeFixture().listen();
  const values = mock.env(t.base), old = Object.fromEntries(Object.keys(values).map(key => [key, process.env[key]]));
  Object.assign(process.env, values);
  t.service = createService({ registrationMailer: async message=>t.confirmationMessages.push(message), dataDir: t.dataDir, geoLocate: async () => 'CA', logSink: line => t.logs.push(line) });
  try {
    // Model purchases persisted by the prior release, then exercise normal signed
    // payment, renewal, read-back and resume paths against the changed catalog.
    const previousMonthly = { cad: 795, usd: 595, aud: 795, gbp: 425 };
    const retainedBuyers = [];
    for (const currency of plans.CURRENCIES) {
      const buyer = await t.unpaidAccount('retained-price-' + currency + '@example.test');
      const opened = await t.request('POST', '/api/billing/checkout', { token: buyer.token,
        body: { plan_code: 'monthly', currency, return_url: t.base + '/' } });
      check.equal(opened.status, 201, 'fictional prior-price checkout is owned and bound');
      const prior = previousMonthly[currency], checkoutId = opened.json.checkout.checkout_id;
      t.service.store.update(state => {
        const row = state.checkout_sessions.find(c => c.checkout_id === checkoutId);
        row.amount_cents = prior; row.payable_cents = prior;
      });
      const session = mock.sessions.get(opened.json.checkout.provider_reference);
      session.amount_total = prior;
      const firstInvoice = mock.invoices.get(session.invoice);
      firstInvoice.amount_due = prior; firstInvoice.amount_remaining = prior;
      firstInvoice.lines.data[0].amount = prior;
      mock.completeSession(session.id);
      const paid = await t.request('POST', '/api/billing/events', mock.signed('checkout.session.completed', session));
      check.equal(paid.json.event.accepted, true, 'prior-price signed payment binds to its recorded checkout amount');
      const retained = JSON.stringify(t.service.store.state().checkout_sessions.find(c => c.checkout_id === checkoutId));
      const billing = await t.request('GET', '/api/billing/plans', { token: buyer.token });
      check.equal(billing.json.plan_catalog.plans.find(p => p.plan_code === 'monthly').amount_cents, prior,
        'existing subscriber sees the recorded renewal price in ' + currency);
      check.equal(billing.json.upgrade_quotes.monthly.renewal_cents, prior, 'current-plan quote retains its contract');
      check.equal(billing.json.upgrade_quotes.annual.regular_cents, expected[currency][2], 'new upgrade uses the approved annual price');
      check.equal(billing.json.upgrade_quotes.annual.credit_cents, prior, 'old payment contributes its actual cash only');
      check.equal(JSON.stringify(t.service.store.state().checkout_sessions.find(c => c.checkout_id === checkoutId)), retained,
        'price presentation never rewrites the historical purchase');
      const sub = mock.subscriptions.get(session.subscription), renewal = mock.invoice(sub, 'monthly', prior);
      retainedBuyers.push({ buyer, sub, currency, checkoutId });
      renewal.lines.data[0].amount = prior;
      mock.payInvoice(renewal.id);
      const renewed = await t.request('POST', '/api/billing/events', mock.signed('invoice.paid', renewal));
      check.equal(renewed.json.event.accepted, true, 'old contracted renewal remains accepted in ' + currency);
      check.equal(t.service.store.state().upgrade_credits.find(c => c.payment_id === renewal.id)?.amount_cents, prior,
        'historical renewal credit never grows to the new catalog amount');
    }
    const pendingBuyer = await t.unpaidAccount('retained-pending-gbp@example.test');
    const pending = await t.request('POST', '/api/billing/checkout', { token: pendingBuyer.token,
      body: { plan_code: 'annual', currency: 'gbp', return_url: t.base + '/' } });
    check.equal(pending.status, 201, 'owned fictional prior GBP payment opens');
    t.service.store.update(state => {
      const row = state.checkout_sessions.find(c => c.checkout_id === pending.json.checkout.checkout_id);
      row.amount_cents = 4250; row.payable_cents = 4250;
    });
    const priorPrices = { cad: { report_once: 595, monthly: 795, annual: 7950 },
      usd: { report_once: 495, monthly: 595, annual: 5950 }, aud: { report_once: 595, monthly: 795, annual: 7950 },
      gbp: { report_once: 315, monthly: 425, annual: 4250 } };
    mock.rotatePrices(priorPrices, 'oct17');
    const migrated = mock.env(t.base);
    for (const key of Object.keys(migrated)) if (!Object.hasOwn(old, key)) old[key] = process.env[key];
    Object.assign(process.env, migrated);
    check.equal(provider.validPriceBindings(process.env), true, 'new and legacy price IDs have unique plan/currency bindings');
    check.equal(provider.describeProvider({ ...process.env, STRIPE_PRICE_MONTHLY_LEGACY: process.env.STRIPE_PRICE_ANNUAL }).configured,
      false, 'conflicting legacy price mappings disable checkout');
    for (const { buyer, sub, currency } of retainedBuyers) {
      const prior = previousMonthly[currency], renewal = mock.invoice(sub, 'monthly', prior);
      mock.payInvoice(renewal.id);
      const paid = await t.request('POST', '/api/billing/events', mock.signed('invoice.paid', renewal));
      check.equal(paid.json.event.accepted, true, 'legacy price ID renews after the configured primary changes in ' + currency);
      t.service.store.update(state => { state.accounts.find(a => a.account_id === buyer.account_id).payment_history_checked_at = '1970-01-01T00:00:00Z'; });
      const billing = await t.request('GET', '/api/billing/plans', { token: buyer.token });
      check.equal(billing.json.plan_catalog.plans.find(p => p.plan_code === 'monthly').amount_cents, prior,
        'provider read-back after migration preserves the old contract');
      check.equal(billing.json.upgrade_quotes.annual.credit_cents, prior * 3, 'legacy invoice history preserves each actual payment once');
    }
    const retained = retainedBuyers[0], adapter = provider.resolveProvider(process.env);
    const originalCheckout = t.service.store.state().checkout_sessions.find(c => c.checkout_id === retained.checkoutId);
    const oldAnnual = provider.acceptedPriceIdsFor(process.env, 'annual', 'cad').find(id => id !== provider.priceIdFor(process.env, 'annual', 'cad'));
    check.equal(provider.planCodeFromPrice({ ...process.env, STRIPE_PRICE_ANNUAL_LEGACY: '' }, oldAnnual, 'cad'), null,
      'an old price requires an explicit legacy mapping');
    check.equal(provider.planCodeFromPrice(process.env, oldAnnual, 'usd'), null, 'legacy prices cannot cross currency boundaries');
    const recovery = { account_id: retained.buyer.account_id, plan_code: 'annual', existing_plan_code: 'monthly',
      currency: 'cad', amount_cents: 7950, price_id: oldAnnual, existing_amount_cents: 795,
      existing_price_id: originalCheckout.provider_price_id, existing_checkout_id: originalCheckout.checkout_id,
      subscription_reference: retained.sub.id, checkout_id: 'chk_old_interrupted_upgrade', return_url: t.base + '/',
      credit_amount_cents: 0, request_started_at: new Date().toISOString(), resume: true };
    mock.loseUpgradeResponse = true;
    let interrupted = false;
    try { await adapter.upgradeSubscription(recovery); } catch (error) { interrupted = error.provider_write_started === true; }
    check.equal(interrupted, true, 'an old upgrade with a lost provider response remains uncertain');
    const recoveryWrites = mock.calls.filter(c => c.method === 'POST' && c.params.payment_behavior).length;
    const recovered = await adapter.upgradeSubscription(recovery);
    check.equal(mock.invoices.get(recovered.provider_reference).amount_due, 7950, 'recovered old upgrade retains its original annual amount');
    check.equal(recovered.price_id, oldAnnual, 'recovered old upgrade retains its original annual price ID');
    check.equal(mock.calls.filter(c => c.method === 'POST' && c.params.payment_behavior).length, recoveryWrites,
      'lost-response recovery observes the original invoice without another upgrade write');
    const cancelled = await adapter.cancelCheckout({ account_id: retained.buyer.account_id, checkout_id: recovery.checkout_id,
      provider_reference: recovered.provider_reference, subscription_reference: retained.sub.id, is_subscription_upgrade: true,
      provider_request: recovery, provider_price_id: oldAnnual, amount_cents: 7950 });
    check.equal(cancelled.cancelled, true, 'legacy pending upgrade can be cancelled after migration');
    check.equal(retained.sub.metadata.checkout_id, originalCheckout.checkout_id, 'legacy upgrade cancellation restores its original purchase binding');
    check.equal(retained.sub.items.data[0].price.id, originalCheckout.provider_price_id, 'legacy upgrade cancellation preserves the monthly price');

    const legacyCancel = retainedBuyers[1];
    const stopRenewal = await t.request('POST', '/api/entitlement/cancel', { token: legacyCancel.buyer.token, body: {} });
    check.equal(stopRenewal.status, 200, 'legacy subscriber can cancel renewal after primary price IDs change');
    check.equal(legacyCancel.sub.cancel_at_period_end, true, 'provider confirms cancellation on the original old-price subscription');
    const pendingView = await t.request('GET', '/api/billing/plans', { token: pendingBuyer.token });
    check.equal(pendingView.json.pending_checkout.renewal_cents, 4250, 'pending GBP payment retains its original renewal');
    const resumed = await t.request('POST', '/api/billing/checkout', { token: pendingBuyer.token,
      body: { plan_code: 'annual', resume_checkout_id: pending.json.checkout.checkout_id } });
    check.equal(resumed.status, 201, 'normal resume reuses the owned open payment');
    check.equal(resumed.json.checkout.plan.amount_display, '£42.50 GBP', 'resumed payment shows its actual recorded price');
    check.equal(resumed.json.checkout.upgrade_credit.renewal_cents, 4250, 'resume does not reprice an existing checkout');

    const mismatchBuyer = await t.unpaidAccount('outdated-provider-price@example.test');
    t.service.store.update(state => credits.recordPayment(state, { account_id: mismatchBuyer.account_id,
      payment_id: 'old_cash_for_mismatched_price', plan_code: 'report_once', amount_cents: 595,
      currency: 'cad', paid_at: new Date().toISOString(), verified_payment: true }));
    const route = mock.route.bind(mock), writes = mock.calls.filter(c => c.method !== 'GET').length;
    mock.route = async call => {
      const result = await route(call);
      if (call.method === 'GET' && call.path.startsWith('/v1/prices/')) result.body.unit_amount = 795;
      return result;
    };
    const mismatch = await t.request('POST', '/api/billing/checkout', { token: mismatchBuyer.token,
      body: { plan_code: 'monthly', currency: 'cad', return_url: t.base + '/' } });
    check.ok(mismatch.status >= 400 && mismatch.json.error?.detail?.reason === 'CONFIGURED_PRICE_MISMATCH',
      'new purchases refuse an outdated configured provider price');
    check.equal(mock.calls.filter(c => c.method !== 'GET').length, writes, 'price mismatch sends no provider write');
    check.equal(t.service.store.state().upgrade_credits.filter(c => c.account_id === mismatchBuyer.account_id && c.state === 'RESERVED').length,
      0, 'refused new price releases its unused cash reservation');
    mock.route = route;
    for (const currency of plans.CURRENCIES) for (const code of plans.PLAN_CODES) {
      const buyer = await t.unpaidAccount('native-stripe-' + currency + '-' + code + '@example.test');
      const caseId = await t.assessedCase(buyer);
      const opened = await t.request('POST', '/api/billing/checkout', { token: buyer.token,
        body: { plan_code: code, currency, case_id: caseId, return_url: t.base + '/', price_id: oldAnnual } });
      check.equal(opened.status, 201, currency + '/' + code + ' validates native Stripe Price before opening');
      const request = mock.calls.filter(c => c.path === '/v1/checkout/sessions' && c.method === 'POST').at(-1);
      check.equal(request.params.currency, currency, 'Stripe Session locks selected native currency');
      check.equal(request.params['line_items[0][price]'], provider.priceIdFor(process.env, code, currency),
        'new purchases use the new primary price and ignore legacy prices');
      check.equal(request.params['adaptive_pricing[enabled]'], 'false', 'Stripe cannot exchange-rate the fixed price');
      const session = mock.completeSession(opened.json.checkout.provider_reference);
      check.equal(session.amount_total, plans.plan(code, currency).amount_cents, 'provider bills exact fixed native amount');
      if (currency === 'usd' && code === 'report_once') {
        const actualId = session.line_items.data[0].price.id;
        session.line_items.data[0].price.id = provider.acceptedPriceIdsFor(process.env, code, currency).find(id => id !== actualId);
        const substituted = await t.request('POST', '/api/billing/events', mock.signed('checkout.session.completed', session));
        check.equal(substituted.json.event.accepted, false, 'a legacy ID cannot settle a new-price checkout even with the right amount');
        check.equal(substituted.json.event.reason, 'EVENT_IGNORED_PRICE_MISMATCH', 'payment remains bound to its server-selected price ID');
        session.line_items.data[0].price.id = actualId;
      }
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
