'use strict';
/**
 * ba-consumer-billing.cjs — BLOCKER-BILLING-001 consumer behavior and server enforcement.
 *
 * Server enforcement: configured prices and purchase types are returned by the plans view; billing views and
 * actions require authentication and are account-scoped; cancellation is at period end (access continues, it
 * does not refund or immediately terminate); an unpaid account is refused paid actions; a one-time payment
 * earns an eligible once-only upgrade credit.
 * Consumer interface: the Billing step shows each configured plan's price/currency/purchase type and grants,
 * the recorded access state, the renewal behavior, and the upgrade credit; cancellation appears only for a
 * subscription.
 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const UI_JS = path.join(__dirname, '..', '..', 'ui', 'app.js');

const NOT_A_PDF = { originalFilename: 'a.pdf', declaredBytes: 12, mimeType: 'application/pdf', contentBase64: Buffer.from('not a pdf at all').toString('base64') };

function makeElement(id) {
  return { id, innerHTML: '', textContent: '', className: '', value: '', disabled: false, style: {}, dataset: {}, files: [], onclick: null, onchange: null, _selected: false, scrollIntoView() {}, querySelectorAll: () => [], querySelector: () => null, select() { this._selected = true; }, focus() {} };
}

function makeContext(responder) {
  const nodes = new Map();
  const elementById = (id) => { if (!nodes.has(id)) nodes.set(id, makeElement(id)); return nodes.get(id); };
  const ctx = {
    console, setTimeout, clearTimeout, JSON, Object, Array, Map, Set, Promise, Number, String, Date, Error, RegExp,
    crypto: { randomUUID: () => 'ui-uuid-1234567890' },
    fetch: async (url, options) => {
      const method = (options && options.method) || 'GET';
      const reply = responder(method, url, options) || { status: 200, body: { ok: true } };
      if (reply.deferred) {
        const body = await reply.deferred;
        return { ok: reply.status < 400 && body.ok !== false, status: reply.status, json: async () => body, text: async () => JSON.stringify(body) };
      }
      return { ok: reply.status < 400 && reply.body.ok !== false, status: reply.status, json: async () => reply.body, text: async () => JSON.stringify(reply.body) };
    },
    navigator: { clipboard: { writeText: async () => {} } },
    document: { getElementById: elementById, createElement: () => elementById('anon'), modelContext: undefined },
    URL: { createObjectURL: () => 'blob:stub', revokeObjectURL: () => {} },
    Blob: class Blob {},
    FileReader: class FileReader { readAsDataURL() { this.result = 'data:x'; if (this.onload) this.onload(); } }
  };
  ctx.window = ctx; ctx.globalThis = ctx; ctx.window.location = { assign: () => {} };
  vm.createContext(ctx);
  return { ctx, nodes, elementById };
}

function tick() { return new Promise((resolve) => setTimeout(resolve, 0)); }

const PLANS_BODY = {
  plan_catalog: {
    plans: [
      { plan_code: 'report_once', label: 'CRP One-Time Credit Report', currency: 'cad', amount_cents: 595, amount_display: '$5.95 CAD', interval: 'one_time', headline: 'One report lifecycle', grants: ['one uploaded PDF credit report held privately for one case'] },
      { plan_code: 'monthly', label: 'CRP Monthly', currency: 'cad', amount_cents: 795, amount_display: '$7.95 CAD', interval: 'month', headline: 'Monthly access', grants: ['the same report lifecycle, for cases opened while the plan is active'] },
      { plan_code: 'annual', label: 'CRP Annual', currency: 'cad', amount_cents: 7950, amount_display: '$79.50 CAD', interval: 'year', headline: 'Annual access', grants: ['the same report lifecycle, for cases opened while the plan is active'] }
    ]
  },
  payment: { state: 'NOT_CONFIGURED', plain: 'These plans are recorded, but no payment provider is connected, so nothing can be purchased.' }
};
async function run(t, check) {
  /* ------------------------------------------------------------------ server enforcement */
  const unpaid = await t.unpaidAccount('billing-unpaid@example.test');
  /* OWNER-PURCHASE-FLOW-001: this section tests the ONE-TIME purchase itself (its entitlement and its upgrade
     credit), so it buys one explicitly instead of holding the harness's subscription. */
  const paid = await t.unpaidAccount('billing-paid@example.test');
  const paidCase = await t.assessedCase(paid);
  await t.pay(paid, 'report_once', paidCase);
  const subscriber = await t.account('billing-subscriber@example.test');
  await t.pay(subscriber, 'monthly');

  const plans = await t.request('GET', '/api/billing/plans', { token: unpaid.token });
  check.equal(plans.status, 200, 'the billing plans view is reachable without a purchase');
  const byCode = Object.fromEntries(plans.json.plan_catalog.plans.map((p) => [p.plan_code, p]));
  check.equal(byCode.report_once.amount_cents, 595, 'one-time price is CAD 5.95');
  check.equal(byCode.monthly.amount_cents, 795, 'monthly price is CAD 7.95');
  check.equal(byCode.annual.amount_cents, 7950, 'annual price is CAD 79.50');
  check.equal(byCode.report_once.interval, 'one_time', 'one-time plan is a one-time purchase');
  check.equal(byCode.monthly.interval, 'month', 'monthly plan renews monthly');
  check.equal(plans.json.entitlement.entitled, false, 'an unpaid account reports not entitled');
  check.equal(plans.json.entitlement.can_read_historical, true, 'an unpaid account can still read what it already has');
  check.ok(!/sk_|pk_|whsec/i.test(plans.text), 'the billing view carries no provider key');

  check.equal((await t.request('GET', '/api/billing/plans')).status, 401, 'billing plans require authentication');
  check.equal((await t.request('POST', '/api/entitlement/cancel', { token: unpaid.token })).status, 409, 'an account with no purchase cannot cancel');

  const paidEnt = await t.request('GET', '/api/entitlement', { token: paid.token });
  check.equal(paidEnt.json.entitlement.entitled, true, 'a one-time payment entitles the account');
  check.equal(paidEnt.json.entitlement.access_via, 'ONE_TIME_CREDIT', 'through the one-time credit');
  check.equal(paidEnt.json.entitlement.plan_code, 'report_once', 'with the plan named');
  check.equal(paidEnt.json.upgrade_credit.eligible, true, 'a verified one-time payment earns an eligible upgrade credit');
  check.equal(paidEnt.json.upgrade_credit.credit_cents, 595, 'worth CAD 5.95');

  const unpaidEnt = await t.request('GET', '/api/entitlement', { token: unpaid.token });
  check.equal(unpaidEnt.json.entitlement.entitled, false, 'a different account sees only its own (unpaid) state, never the paid account');

  const beforeCancel = await t.request('GET', '/api/entitlement', { token: subscriber.token });
  check.equal(beforeCancel.json.entitlement.access_via, 'SUBSCRIPTION', 'the subscriber holds a subscription');
  check.equal(beforeCancel.json.entitlement.cancel_at_period_end, false, 'not yet cancelling');
  const cancel = await t.request('POST', '/api/entitlement/cancel', { token: subscriber.token, body: {} });
  check.equal(cancel.status, 200, 'cancellation succeeds');
  check.equal(cancel.json.cancellation.at_period_end, true, 'cancellation is at period end');
  const afterCancel = await t.request('GET', '/api/entitlement', { token: subscriber.token });
  check.equal(afterCancel.json.entitlement.cancel_at_period_end, true, 'cancel_at_period_end is recorded');
  check.equal(afterCancel.json.entitlement.entitled, true, 'access continues to the recorded expiry (not immediately terminated)');

  const caseId = (await t.request('POST', '/api/cases', { token: unpaid.token, body: { country: 'CA', region: 'CA-NS' } })).json.case.case_id;
  check.notEqual((await t.request('POST', `/api/cases/${caseId}/files`, { token: unpaid.token, body: NOT_A_PDF })).status, 402, 'uploading an owned report needs no purchase');


  /* ------------------------------------------------------------------ consumer interface */
  const source = fs.readFileSync(UI_JS, 'utf8');
  const responderState = { entitled: false, access_via: 'NONE', plan_code: null, credit: false, checkoutFails: false, cancelFails: false, billingDeferred: null };
  const dom = makeContext((method, url) => {
    if (url === '/api/jurisdictions') return { status: 200, body: { ok: true, surface: { countries: [{ value: 'CA', label: 'Canada' }], regions: [{ value: 'CA-NS', country: 'CA', label: 'Nova Scotia', launch_ready: false }] } } };
    if (url === '/api/session') return { status: 401, body: { ok: false, error: { code: 'AUTHENTICATION_REQUIRED', message: 'Sign in to continue.' } } };
    if (url === '/api/billing/plans') {
      if (responderState.billingDeferred) return { deferred: responderState.billingDeferred, status: 200 };
      return { status: 200, body: { ok: true, ...PLANS_BODY, entitlement: { entitled: responderState.entitled, state: responderState.entitled ? 'ACTIVE' : 'NO_SUBSCRIPTION', access_via: responderState.access_via, plan_code: responderState.plan_code, expires_at: null, cancel_at_period_end: false }, upgrade_credit: { eligible: responderState.credit, credit_cents: 595, currency: 'cad', expires_at: null, remaining_ms: 0, reserved_now: false } } };
    }
    if (method === 'POST' && url === '/api/billing/checkout') return responderState.checkoutFails ? { status: 503, body: { ok: false, error: { code: 'PAYMENT_PROVIDER_NOT_CONFIGURED', message: 'No payment provider is connected.' } } } : { status: 201, body: { ok: true, checkout: { redirect_grants_nothing: true, redirect_url: 'https://example.test/checkout' } } };
    if (method === 'POST' && url === '/api/entitlement/cancel') return responderState.cancelFails ? { status: 409, body: { ok: false, error: { code: 'NO_ACTIVE_PURCHASE_TO_CANCEL', message: 'There is no purchase recorded for this account to cancel.' } } } : { status: 200, body: { ok: true, cancellation: { at_period_end: true, plain: 'Your purchase will not renew.' } } };
    if (method === 'POST' && url === '/api/accounts') return { status: 201, body: { ok: true, account: { account_id: 'acc_stub', email: 'stub@example.test' } } };
    if (method === 'GET' && url === '/api/cases') return { status: 200, body: { ok: true, cases: [] } };
    if (method === 'GET' && url === '/api/entitlement') return { status: 200, body: { ok: true, entitlement: { plain: 'x' }, payment: { plain: 'x' }, upgrade_credit: { eligible: false } } };
    return { status: 200, body: { ok: true } };
  });
  const ctx = dom.ctx;
  vm.runInContext(source, ctx, { filename: 'ui/app.js' });
  await tick(); await tick(); await tick();
  const panel = dom.nodes.get('panel');

  dom.elementById('email').value = 'stub@example.test';
  dom.elementById('password').value = 'a-long-enough-password';
  await dom.elementById('create').onclick();
  await tick();
  vm.runInContext('state.step = 8; render();', ctx);
  await tick(); await tick();
  const billingBox = dom.elementById('billingView');
  check.ok(/Plans and prices/.test(billingBox.innerHTML), 'the Billing step shows the plans');
  check.ok(/\$5\.95 CAD/.test(billingBox.innerHTML), 'one-time price and currency are shown');
  check.ok(/\$7\.95 CAD/.test(billingBox.innerHTML) && /\$79\.50 CAD/.test(billingBox.innerHTML), 'recurring prices and currency are shown');
  check.ok(/one-time purchase/.test(billingBox.innerHTML), 'one-time purchase type is shown');
  check.ok(/renews monthly/.test(billingBox.innerHTML) && /renews annually/.test(billingBox.innerHTML), 'recurring renewal is shown');
  check.ok(/No active purchase is recorded/.test(billingBox.innerHTML), 'the unpaid access state is shown');
  check.ok(/No upgrade credit is currently available/.test(billingBox.innerHTML), 'no upgrade credit is shown when none is held');
  check.ok(!/cancelEntitlement/.test(billingBox.innerHTML), 'no cancellation control appears for a non-subscription account');

  /* A subscribed account sees the renewal explanation and a cancellation control. */
  responderState.entitled = true;
  responderState.access_via = 'SUBSCRIPTION';
  responderState.plan_code = 'monthly';
  responderState.credit = true;
  vm.runInContext('state.step = 8; render();', ctx);
  await tick(); await tick();
  check.ok(/renews automatically/.test(dom.elementById('billingView').innerHTML), 'a subscription shows its renewal behavior');
  check.ok(/Cancel renewal/.test(dom.elementById('billingView').innerHTML), 'a subscription shows a cancellation control');
  check.ok(/CAD 5\.95/.test(dom.elementById('billingView').innerHTML), 'an eligible upgrade credit is shown');

  /* Checkout failure never displays success or changes access locally. */
  responderState.checkoutFails = true;
  await dom.elementById('checkout-monthly').onclick();
  await tick(); await tick();
  check.ok(/Refused:/.test(panel.innerHTML), 'a failed checkout shows a refusal, not success');
  check.ok(!/Checkout opened/.test(panel.innerHTML), 'a failed checkout never claims a checkout was opened');
  responderState.checkoutFails = false;

  /* Cancellation failure never displays success. */
  responderState.cancelFails = true;
  await dom.elementById('cancelEntitlement').onclick();
  await tick(); await tick();
  check.ok(/Refused:/.test(panel.innerHTML), 'a failed cancellation shows a refusal, not success');
  responderState.cancelFails = false;

  /* Sign-out clears account-specific billing state. */
  await dom.elementById('signout').onclick();
  await tick(); await tick();
  check.equal(vm.runInContext('state.billing', ctx), null, 'billing state is cleared on sign-out');

  /* A delayed billing response after sign-out never renders the previous account's information. */
  let resolveBilling;
  responderState.billingDeferred = new Promise((r) => { resolveBilling = r; });
  vm.runInContext('state.account = { account_id: "acc_stub", email: "stub@example.test" }; state.step = 8; render();', ctx);
  await tick();
  await dom.elementById('signout').onclick();
  await tick();
  resolveBilling({ ok: true, ...PLANS_BODY, entitlement: { entitled: true, state: 'ACTIVE', access_via: 'SUBSCRIPTION', plan_code: 'monthly', expires_at: null, cancel_at_period_end: false }, upgrade_credit: { eligible: false, credit_cents: 595, currency: 'cad' } });
  await tick(); await tick();
  check.ok(!/Cancel renewal/.test(panel.innerHTML), 'a delayed response after sign-out never renders the previous account\'s billing state');
  responderState.billingDeferred = null;

  return { plan: true, renewal: true, cancellation: true, upgrade_credit: true, isolation: true, unpaid_states: true, failure_handling: true, stale_clear: true };
}

module.exports = { run, id: 'ba-consumer-billing', title: 'BLOCKER-BILLING-001: billing consumer interface and server enforcement' };

