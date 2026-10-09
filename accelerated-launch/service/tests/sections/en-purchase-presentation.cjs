'use strict';
/** Batch 70: mocked UI behavior, not browser layout or provider payment proof. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const UI = path.join(__dirname, '..', '..', 'ui', 'app.js');
const CSS = path.join(__dirname, '..', '..', 'ui', 'style.css');
function tick() { return new Promise(resolve => setTimeout(resolve, 0)); }
function element(id) {
  return { id, innerHTML: '', textContent: '', className: '', value: '', disabled: false, style: {}, dataset: {}, files: [], onclick: null, onchange: null, scrollIntoView() {}, querySelectorAll() { return []; }, querySelector() { return null; } };
}
function makeContext(responder) {
  const nodes = new Map(), calls = [];
  const get = id => { if (!nodes.has(id)) nodes.set(id, element(id)); return nodes.get(id); };
  const ctx = {
    console, setTimeout, clearTimeout, JSON, Object, Array, Map, Set, Promise, Number, String, Date, Error, RegExp,
    crypto: { randomUUID: () => 'purchase-ui-fixture' },
    document: { getElementById: get, createElement: element },
    fetch: async (url, options = {}) => {
      const method = options.method || 'GET', body = options.body ? JSON.parse(options.body) : null;
      calls.push({ method, url, body });
      const reply = await responder(method, url, body) || { status: 200, body: { ok: true } };
      return { ok: reply.status < 400 && reply.body.ok !== false, status: reply.status, json: async () => reply.body, text: async () => JSON.stringify(reply.body) };
    },
    URL: { createObjectURL: () => 'blob:fixture', revokeObjectURL() {} }, Blob: class Blob {}, FileReader: class FileReader {}
  };
  ctx.window = ctx; ctx.globalThis = ctx;
  ctx.location = { origin: 'https://app.example.test', assign(url) { calls.push({ method: 'NAVIGATE', url }); } };
  vm.createContext(ctx);
  return { ctx, get, calls };
}
function plans() {
  const amount = { report_once: 595, monthly: 795, annual: 7950 };
  return Object.entries(amount).map(([plan_code, amount_cents]) => ({ plan_code, amount_cents, amount_display: `$${(amount_cents / 100).toFixed(2)} CAD`, currency: 'cad', interval: plan_code === 'annual' ? 'year' : plan_code === 'monthly' ? 'month' : 'one_time' }));
}
function quote(code, credit = 0, extras = {}) {
  const regular = plans().find(p => p.plan_code === code).amount_cents;
  return { eligible: credit > 0, regular_cents: regular, credit_cents: credit, first_invoice_cents: regular - credit, renewal_cents: regular, currency: 'cad', allowed: true, is_current: false, revision: `fixture-${code}-${credit}`, remaining_credit_cents: 0, ...extras };
}
function billing() {
  return {
    ok: true, plan_catalog: { currency: 'cad', plans: plans() },
    entitlement: { entitled: true, access_via: 'ONE_TIME_CREDIT', plan_code: 'report_once' },
    payment: { is_a_working_payment: true },
    upgrade_credit: { eligible: true, credit_cents: 1190, currency: 'cad', expires_at: null, reserved_now: false },
    upgrade_quotes: { report_once: quote('report_once'), monthly: quote('monthly', 795, { remaining_credit_cents: 395 }), annual: quote('annual', 1190) }
  };
}
function reportView() {
  return {
    case: { case_id: 'case_fixture', country: 'CA', region: 'CA-NS' },
    files: [{ original_filename: 'fictional-report.pdf', stored_bytes: 100, supported_format: true, extraction: { admitted: true } }],
    result_id: 'result_fixture',
    result: { support: 'REPORT_SUPPORT', issues: [{ issue_id: 'fixture-issue', eligible: true, consumer_label: 'VIOLATION', account_identity: { name: 'FICTIONAL COLLECTION A' }, explanation: 'Two entries repeat the same collection account.', source_location: { section: 'Collections', page: 2, line: 10 } }] },
    assessment_summary: { distinct_total: 1, teaser: { confidence_label: 'VIOLATION', title: 'The same account appears more than once', explanation: 'Two printed entries repeat the same account.' } },
    assessment_access: { complete_assessment: true, complete_assessment_via: 'ONE_TIME_CREDIT', assessment_download: true, dispute_packet: false },
    reviewed: false, clarifications: [], clarification_questions: [], demonstration_scenarios: ['INTERNAL_ONLY']
  };
}

async function run(t, check) {
  let data = billing(), checkoutError = null, checkoutResponse = null, returnedView = reportView();
  const dom = makeContext((method, url) => {
    if (url === '/api/jurisdictions') return { status: 200, body: { ok: true, surface: { countries: [{ value: 'CA', label: 'Canada' }], regions: [{ value: 'CA-NS', label: 'Nova Scotia', country: 'CA' }], preview_mode: true } } };
    if (url === '/api/session') return { status: 401, body: { ok: false, error: { message: 'Sign in.' } } };
    if (url === '/api/pricing') return { status: 200, body: { ok: true, plan_catalog: data.plan_catalog } };
    if (url === '/api/billing/plans' || url === '/api/entitlement') return { status: 200, body: data };
    if (method === 'GET' && url === '/api/cases/' + returnedView.case.case_id) return { status: 200, body: { ok: true, view: returnedView } };
    if (url === '/api/account/profile') return { status: 200, body: { ok: true, profile: {} } };
    if (url === '/api/account/documents') return { status: 200, body: { ok: true, documents: [] } };
    if (method === 'POST' && url === '/api/billing/checkout') return checkoutError || { status: 201, body: { ok: true, checkout: checkoutResponse || { redirect_url: 'https://checkout.stripe.com/c/pay/fictional' } } };
    return { status: 200, body: { ok: true } };
  });
  const ctx = dom.ctx;
  vm.runInContext(fs.readFileSync(UI, 'utf8'), ctx);
  await tick(); await tick(); await tick();
  ctx.DATA = data; ctx.VIEW = reportView();
  vm.runInContext('state.account = { account_id: "account_fixture", email: "fictional@example.test" }; state.caseId = VIEW.case.case_id; state.view = VIEW; state.entitlement = DATA.entitlement; state.upgrade_credit = DATA.upgrade_credit; state.upgrade_quotes = DATA.upgrade_quotes; state.billing = DATA; state.step = STEP.REPORT; render();', ctx);
  const panel = dom.get('panel');
  check.ok(!/Try a sample|Try the sample|id="scenario"|id="demo"/.test(panel.innerHTML), 'an uploaded case has no sample-report invitation or controls');
  check.ok(!/\/demonstration/.test(fs.readFileSync(UI, 'utf8')), 'the consumer UI no longer requests the synthetic assessment endpoint');
  check.ok(!/public samples/.test(dom.get('support-banner').innerHTML), 'staging guidance does not invite consumers to try samples');

  vm.runInContext('state.step = STEP.RESULTS; render();', ctx);
  check.ok(/Download my report \(PDF\)/.test(panel.innerHTML), 'the one-off report explicitly offers its PDF download');
  check.ok(/FICTIONAL COLLECTION A/.test(panel.innerHTML) && /VIOLATION/.test(panel.innerHTML), 'report issues and their printed account labels remain visible');
  check.ok(/Print and mail your disputes|Compare your next report|Keep your reports together/.test(panel.innerHTML), 'subscriber benefits accompany the one-off report');
  for (const benefit of ['Print and mail your disputes', 'Compare your next report', 'Keep your reports together']) check.ok(panel.innerHTML.includes(benefit), `the report explains ${benefit}`);
  check.ok(/aria-label="Subscription benefits"/.test(panel.innerHTML) && /<svg[^>]+aria-hidden="true"/.test(panel.innerHTML), 'benefit graphics are decorative and their meanings have accessible text');
  check.ok(/Your available credit: <b>\$11\.90 CAD/.test(panel.innerHTML), 'the report shows the combined unused-payment credit supplied by the server');
  check.ok(/Monthly — \$0\.00 CAD today/.test(panel.innerHTML), 'the report monthly button shows the capped zero-dollar quote');
  check.ok(/Yearly — \$67\.60 CAD today/.test(panel.innerHTML), 'the report yearly button uses the adjusted server quote');
  check.ok(/Then \$7\.95 CAD per month/.test(panel.innerHTML) && /Then \$79\.50 CAD per year/.test(panel.innerHTML), 'report upgrade offers keep regular renewal prices clear');
  check.ok(/\$3\.95 CAD remains for a later upgrade/.test(panel.innerHTML), 'unused excess credit is shown without reducing the bill below zero');
  check.ok(!/id="create-packet"|id="packet-block"/.test(panel.innerHTML), 'marketing does not grant a one-off purchase subscriber packet access');
  await dom.get('download-assessment').onclick();
  check.ok(dom.calls.some(c => c.method === 'NAVIGATE' && c.url === '/api/cases/case_fixture/report-download'), 'the PDF control uses the protected owned-report download route');
  await dom.get('buy-monthly').onclick();
  await tick(); await tick();
  const firstPurchase = dom.calls.find(c => c.method === 'POST' && c.url === '/api/billing/checkout');
  check.equal(firstPurchase.body.plan_code, 'monthly', 'the report subscription action starts the selected plan');
  check.ok(!['amount_cents', 'credit_cents', 'first_invoice_cents', 'upgrade_credit'].some(key => Object.hasOwn(firstPurchase.body, key)), 'no client-calculated price or credit reaches the checkout request');

  vm.runInContext('state.step = STEP.BILLING; render();', ctx);
  await tick(); await tick();
  const box = dom.get('billingView');
  check.ok(/Pay today/.test(box.innerHTML) && /Plan price/.test(box.innerHTML) && /Your credit/.test(box.innerHTML), 'Plans visually explain price minus credit and the amount due today');
  check.ok(/\$11\.90 CAD/.test(box.innerHTML) && /\$67\.60 CAD/.test(box.innerHTML), 'Plans and Results use the same account-specific quote');
  check.ok(/Every unused|unused lower-plan payments/.test(box.innerHTML) && !/90 days|90-day|expires in/.test(box.innerHTML), 'the upgrade benefit includes all unused lower-plan payments without the retired expiry');
  check.ok(/Checkout confirms your final price before you pay/.test(box.innerHTML), 'Plans state when the final purchase price is confirmed');

  data = billing(); data.entitlement = { entitled: true, access_via: 'SUBSCRIPTION', plan_code: 'monthly', cancel_at_period_end: false };
  data.upgrade_credit.credit_cents = 1985;
  data.upgrade_quotes = { report_once: quote('report_once', 0, { allowed: false }), monthly: quote('monthly', 0, { allowed: false, is_current: true }), annual: quote('annual', 1985) };
  vm.runInContext('state.step = STEP.BILLING; render();', ctx);
  await tick(); await tick();
  check.ok(/CURRENT PLAN/.test(box.innerHTML) && !/id="checkout-monthly"|id="checkout-report_once"/.test(box.innerHTML), 'a monthly subscriber sees a current-plan marker and no repeat or lower-plan purchase');
  check.ok(/Review yearly upgrade/.test(box.innerHTML) && /\$59\.65 CAD/.test(box.innerHTML), 'the yearly upgrade price credits unused lower-plan payments including the monthly payment');
  const beforeUpgrade = dom.calls.filter(c => c.method === 'POST' && c.url === '/api/billing/checkout').length;
  await dom.get('checkout-annual').onclick(); await tick(); await tick();
  check.equal(dom.calls.filter(c => c.method === 'POST' && c.url === '/api/billing/checkout').length, beforeUpgrade, 'reviewing a subscription upgrade does not bill the saved payment method');
  check.ok(/Review your yearly upgrade/.test(box.innerHTML) && /saved payment method/.test(box.innerHTML) && /Confirm yearly upgrade/.test(box.innerHTML), 'the confirmation states the plan change, charge amount and payment method before submission');
  await dom.get('cancel-upgrade').onclick();
  check.ok(!/id="confirm-upgrade-annual"/.test(box.innerHTML), 'keeping the current plan dismisses the upgrade confirmation');
  check.equal(dom.calls.filter(c => c.method === 'POST' && c.url === '/api/billing/checkout').length, beforeUpgrade, 'cancelling the review makes no payment request');
  await dom.get('checkout-annual').onclick(); await tick(); await tick();
  data.upgrade_quotes.annual = quote('annual', 1390);
  vm.runInContext('renderBillingView(state.billing);', ctx);
  check.ok(!/id="confirm-upgrade-annual"/.test(box.innerHTML) && /upgrade price changed/.test(box.innerHTML), 'a changed server quote invalidates an unsubmitted upgrade confirmation');
  await dom.get('checkout-annual').onclick(); await tick(); await tick();
  checkoutResponse = { is_subscription_upgrade: true, redirect_url: 'https://invoice.stripe.com/i/fixture' };
  await dom.get('confirm-upgrade-annual').onclick(); await tick(); await tick();
  const upgradePurchase = dom.calls.filter(c => c.method === 'POST' && c.url === '/api/billing/checkout').at(-1);
  check.equal(upgradePurchase.body.quote_revision, data.upgrade_quotes.annual.revision, 'the confirmed upgrade sends the opaque server quote revision for stale-price enforcement');
  check.ok(!Object.hasOwn(upgradePurchase.body, 'amount_cents') && !Object.hasOwn(upgradePurchase.body, 'credit_cents'), 'the confirmed upgrade sends no client-authoritative billing amounts');
  check.ok(dom.calls.some(c => c.method === 'NAVIGATE' && c.url === checkoutResponse.redirect_url), 'an upgrade requiring payment authentication follows the trusted hosted Stripe invoice');
  check.ok(/yearly upgrade was requested/.test(panel.innerHTML) && !/payment confirmed/.test(panel.innerHTML), 'the upgrade response does not grant or claim confirmed payment in the client');

  await dom.get('checkout-annual').onclick(); await tick(); await tick();
  checkoutError = { status: 409, body: { ok: false, error: { code: 'STALE_UPGRADE_QUOTE', message: 'Your upgrade price changed. Review the updated price before confirming.' } } };
  data.upgrade_quotes.annual = quote('annual', 795);
  const beforeRefresh = dom.calls.filter(c => c.url === '/api/billing/plans').length;
  await dom.get('confirm-upgrade-annual').onclick(); await tick(); await tick();
  check.ok(dom.calls.filter(c => c.url === '/api/billing/plans').length > beforeRefresh, 'the server stale-quote refusal refreshes account-specific pricing');
  check.ok(!/id="confirm-upgrade-annual"/.test(box.innerHTML), 'a server-rejected quote cannot be confirmed again without a new review');
  checkoutError = null;

  data.entitlement.plan_code = 'annual';
  data.upgrade_quotes.annual = quote('annual', 0, { allowed: false, is_current: true });
  data.upgrade_quotes.monthly = quote('monthly', 0, { allowed: false, is_current: false });
  vm.runInContext('state.step = STEP.BILLING; render();', ctx); await tick(); await tick();
  check.ok(/CURRENT PLAN/.test(box.innerHTML) && !/id="checkout-(monthly|annual|report_once)"/.test(box.innerHTML), 'a yearly subscriber has no same-plan or lower-plan checkout');
  check.equal((box.innerHTML.match(/CURRENT PLAN/g) || []).length, 1, 'exactly one subscription card is marked current');

  data = billing();
  for (const q of Object.values(data.upgrade_quotes)) { q.allowed = false; q.reason = 'CHECKOUT_ALREADY_IN_PROGRESS'; }
  vm.runInContext('state.step = STEP.BILLING; render();', ctx); await tick(); await tick();
  check.ok(/Finish your open checkout/.test(box.innerHTML) && !/Included in your current subscription/.test(box.innerHTML), 'server-reserved checkout credit is explained without inventing subscription access');
  check.ok(!/id="checkout-(monthly|annual|report_once)"/.test(box.innerHTML) && /id="refresh-billing-payment"/.test(box.innerHTML), 'a reserved server checkout has no new purchase and a payment-refresh action');

  data = billing(); delete data.upgrade_quotes;
  vm.runInContext('state.upgrade_quotes = null; state.step = STEP.BILLING; render();', ctx); await tick(); await tick();
  check.ok(/Checkout will confirm your upgrade credit and final price/.test(box.innerHTML), 'a legacy response without quotes does not invent an adjusted price');
  check.ok(!/Pay today/.test(box.innerHTML), 'a missing quote is not presented as a confirmed amount due');
  ctx.DATA = billing(); ctx.VIEW = reportView();
  vm.runInContext('state.entitlement = DATA.entitlement; state.billing = DATA; state.upgrade_quotes = DATA.upgrade_quotes; state.view = { ...VIEW, result: null, assessment_access: { complete_assessment: false }, assessment_summary: VIEW.assessment_summary }; state.checkoutReturn = { status: "pending", caseId: VIEW.case.case_id }; state.step = STEP.RESULTS; render();', ctx);
  check.ok(!/id="buy-report_once"|id="buy-monthly"|id="buy-annual"|id="download-assessment"/.test(panel.innerHTML), 'pending payment still withholds repeat purchases and paid downloads');
  check.ok(/most serious violation/.test(panel.innerHTML), 'the existing single serious-violation preview survives the purchase presentation change');

  /* A paid monthly subscriber retains usable access while an annual invoice waits for confirmation. */
  data = billing();
  data.entitlement = { entitled: true, access_via: 'SUBSCRIPTION', plan_code: 'monthly', cancel_at_period_end: false };
  data.pending_checkout = { checkout_id: 'chk_existing_annual', plan_code: 'annual', redirect_url: 'https://invoice.stripe.com/i/existing', is_subscription_upgrade: true,
    payable_cents: 6560, credit_cents: 1390, renewal_cents: 7950, currency: 'cad' };
  for (const q of Object.values(data.upgrade_quotes)) { q.allowed = false; q.reason = 'CHECKOUT_ALREADY_IN_PROGRESS'; }
  returnedView = reportView();
  returnedView.assessment_access = { complete_assessment: true, complete_assessment_via: 'SUBSCRIPTION', dispute_packet: true, assessment_download: true };
  ctx.RETURN_CONTEXT = { caseId: returnedView.case.case_id, planCode: 'annual' };
  vm.runInContext('state.checkoutReturn = null; state.step = STEP.RESULTS;', ctx);
  await vm.runInContext('restoreCheckoutReport(RETURN_CONTEXT)', ctx);
  check.equal(vm.runInContext('state.entitlement.plan_code', ctx), 'monthly', 'the annual return preserves the authoritative current monthly plan');
  check.equal(vm.runInContext('state.checkoutReturn.status', ctx), 'pending', 'monthly packet access cannot falsely confirm an unpaid annual upgrade');
  vm.runInContext('render();', ctx); await tick(); await tick();
  check.ok(/id="continue-payment"/.test(panel.innerHTML) && /Your yearly upgrade is waiting for payment/.test(panel.innerHTML), 'the matching pending Results page can continue its existing annual payment');
  check.ok(/id="download-assessment"/.test(panel.innerHTML) && /id="create-packet"/.test(panel.innerHTML), 'the previously paid monthly download and packet remain usable while the upgrade waits');
  vm.runInContext('state.step = STEP.BILLING; render();', ctx); await tick(); await tick();
  check.ok(/id="continue-payment"/.test(box.innerHTML) && /Payment amount: <b>\$65\.60 CAD/.test(box.innerHTML), 'Plans show the open invoice and its original server-supplied amount');
  check.ok(/after \$13\.90 CAD credit/.test(box.innerHTML) && /Then \$79\.50 CAD per year/.test(box.innerHTML), 'the resumable invoice retains its applied credit and regular renewal price');
  check.ok(!/id="checkout-annual"/.test(box.innerHTML), 'an open annual upgrade is resumed rather than offered as a new purchase');
  checkoutResponse = { is_subscription_upgrade: true, redirect_url: data.pending_checkout.redirect_url };
  const beforeResume = dom.calls.filter(c => c.method === 'POST' && c.url === '/api/billing/checkout').length;
  await dom.get('continue-payment').onclick(); await tick(); await tick();
  const resume = dom.calls.filter(c => c.method === 'POST' && c.url === '/api/billing/checkout').at(-1);
  check.deepEqual(resume.body, { plan_code: 'annual', resume_checkout_id: 'chk_existing_annual' }, 'resume sends only the plan and existing checkout ID, never another quoted amount or revision');
  check.equal(dom.calls.filter(c => c.method === 'POST' && c.url === '/api/billing/checkout').length, beforeResume + 1, 'continuing payment makes one idempotent resume request');
  check.ok(dom.calls.some(c => c.method === 'NAVIGATE' && c.url === data.pending_checkout.redirect_url), 'the resumed existing payment uses the approved hosted Stripe invoice');
  checkoutResponse = { is_subscription_upgrade: true, redirect_url: 'https://app.example.test/?checkout=return&report=case_fixture&plan=annual' };
  await dom.get('continue-payment').onclick(); await tick(); await tick();
  check.ok(dom.calls.some(c => c.method === 'NAVIGATE' && c.url === checkoutResponse.redirect_url), 'a paid resumed invoice can return to its existing same-origin report URL');
  const beforeInvalidRedirect = dom.calls.filter(c => c.method === 'NAVIGATE').length;
  checkoutResponse = { redirect_url: 'https://app.example.test.evil.example/?checkout=return&report=case_fixture&plan=annual' };
  await dom.get('continue-payment').onclick(); await tick(); await tick();
  check.equal(dom.calls.filter(c => c.method === 'NAVIGATE').length, beforeInvalidRedirect, 'resume does not follow a lookalike foreign return origin');

  checkoutError = { status: 409, body: { ok: false, error: { code: 'PAYMENT_CONFIRMATION_PENDING', message: 'Your payment is still being checked. Continue the payment you already started.' } } };
  const beforePendingRefresh = dom.calls.filter(c => c.url === '/api/billing/plans').length;
  await dom.get('continue-payment').onclick(); await tick(); await tick();
  check.ok(dom.calls.filter(c => c.url === '/api/billing/plans').length > beforePendingRefresh, 'an uncertain provider response refreshes the authoritative pending payment');
  check.ok(/payment is still being checked/.test(panel.innerHTML) && /id="continue-payment"/.test(box.innerHTML), 'the uncertain response shows its error and keeps the existing payment available');
  check.ok(!/nothing.*charged|no charge|payment failed|payment cancelled/i.test(panel.innerHTML + box.innerHTML), 'an uncertain payment response never claims no charge or cancellation');
  checkoutError = null;
  data.entitlement.plan_code = 'annual'; data.pending_checkout = null;
  await vm.runInContext('restoreCheckoutReport(RETURN_CONTEXT)', ctx);
  check.equal(vm.runInContext('state.checkoutReturn', ctx), null, 'an authoritative paid annual entitlement clears the annual-return pending notice');
  check.equal(vm.runInContext('state.pending_checkout', ctx), null, 'a confirmed annual payment clears the cached pending checkout');
  vm.runInContext('render();', ctx);
  check.ok(!/id="continue-payment"/.test(panel.innerHTML), 'the confirmed annual report no longer offers payment resume');

  /* One-off payment resume belongs to the report it was opened for. */
  data = billing();
  data.pending_checkout = { checkout_id: 'chk_other_report', plan_code: 'report_once', case_id: 'case_other_report', redirect_url: 'https://checkout.stripe.com/c/pay/other', payable_cents: 595, credit_cents: 0, renewal_cents: 595, currency: 'cad' };
  returnedView.assessment_access = { complete_assessment: false, dispute_packet: false };
  ctx.RETURN_CONTEXT = { caseId: returnedView.case.case_id, planCode: 'report_once' };
  await vm.runInContext('restoreCheckoutReport(RETURN_CONTEXT)', ctx); vm.runInContext('render();', ctx);
  check.ok(!/id="continue-payment"/.test(panel.innerHTML), 'a pending one-off checkout for another owned report is not placed on these Results');
  data.pending_checkout.case_id = returnedView.case.case_id;
  await vm.runInContext('restoreCheckoutReport(RETURN_CONTEXT)', ctx); vm.runInContext('render();', ctx);
  check.ok(/id="continue-payment"/.test(panel.innerHTML), 'the matching owned one-off Results can resume their existing payment');

  /* A saved report can be reopened without a checkout return URL. */
  ctx.DATA = data;
  vm.runInContext('state.checkoutReturn = null; rememberPendingCheckout(DATA); state.step = STEP.RESULTS; render();', ctx);
  check.ok(/id="continue-payment"/.test(panel.innerHTML), 'reopened owned Results retain payment resume without checkout-return context');
  check.ok(!/id="buy-(?:report_once|monthly|annual)"/.test(panel.innerHTML), 'reopened pending Results suppress fresh purchases until the existing payment finishes');
  checkoutResponse = { redirect_url: data.pending_checkout.redirect_url };
  const beforeReopenedResume = dom.calls.filter(c => c.method === 'POST' && c.url === '/api/billing/checkout').length;
  await dom.get('continue-payment').onclick(); await tick(); await tick();
  const reopenedResumes = dom.calls.filter(c => c.method === 'POST' && c.url === '/api/billing/checkout').slice(beforeReopenedResume);
  check.equal(reopenedResumes.length, 1, 'reopened report resumes one existing checkout');
  check.deepEqual(reopenedResumes[0].body, { plan_code: 'report_once', resume_checkout_id: 'chk_other_report' }, 'fresh-return resume sends the existing report payment ID without new amounts');
  vm.runInContext('state.step = STEP.BILLING; render();', ctx); await tick(); await tick();
  check.ok(/id="continue-payment"/.test(box.innerHTML) && !/id="buy-(?:report_once|monthly|annual)"/.test(box.innerHTML), 'Plans for the reopened pending report offer its existing payment instead of fresh purchases');
  data.pending_checkout.case_id = 'case_other_report';
  vm.runInContext('state.checkoutReturn = null; rememberPendingCheckout(DATA); state.step = STEP.RESULTS; render();', ctx);
  check.ok(!/id="continue-payment"/.test(panel.innerHTML), 'fresh Results never resume another report payment');
  check.ok(/id="buy-report_once"/.test(panel.innerHTML), 'another report payment does not replace this report’s own purchase choice');

  data.pending_checkout = { ...data.pending_checkout, state: 'CREDIT_REVOKED' };
  vm.runInContext('state.step = STEP.BILLING; render();', ctx); await tick(); await tick();
  check.ok(!/id="continue-payment"/.test(box.innerHTML), 'an explicitly revoked checkout is never offered as a resumable payment');
  check.equal(vm.runInContext('state.pending_checkout', ctx), null, 'invalid pending state is discarded from the consumer cache');

  /* Profile loads refresh payment state; stale controls cannot resume another account's payment. */
  delete data.pending_checkout.state;
  vm.runInContext('state.checkoutReturn = null; state.accountProfile = null; state.step = STEP.ACCOUNT; render();', ctx);
  await tick(); await tick(); await tick();
  check.equal(vm.runInContext('state.pending_checkout.checkout_id', ctx), 'chk_other_report', 'the account-details refresh loads the current pending checkout from access');
  vm.runInContext('state.step = STEP.BILLING; render();', ctx); await tick(); await tick();
  const staleResume = dom.get('continue-payment').onclick;
  const beforeForeign = dom.calls.filter(c => c.method === 'POST' && c.url === '/api/billing/checkout').length;
  vm.runInContext('state.account = { account_id: "other_account", email: "other@example.test" };', ctx);
  check.equal(vm.runInContext('pendingPaymentBlock()', ctx), '', 'cached payment data from a different account cannot render a resume control');
  await staleResume(); await tick();
  check.equal(dom.calls.filter(c => c.method === 'POST' && c.url === '/api/billing/checkout').length, beforeForeign, 'a stale previous-account button makes no resume request');
  vm.runInContext('state.accountProfile = {}; state.step = STEP.ACCOUNT; render();', ctx); await tick();
  await dom.get('signout').onclick(); await tick();
  check.equal(vm.runInContext('state.pending_checkout', ctx), null, 'sign-out clears the pending checkout');
  check.equal(vm.runInContext('state.pending_checkout_account_id', ctx), null, 'sign-out clears its account binding');
  check.ok(/Plans/.test(dom.get('steps').innerHTML) && !/>Billing</.test(dom.get('steps').innerHTML), 'the sidebar matches the PDF instruction to open Plans');

  const css = fs.readFileSync(CSS, 'utf8');
  check.ok(/\.benefit-grid/.test(css) && /\.credit-equation/.test(css) && /\.current-plan/.test(css), 'the visual benefits, credit calculation and current-plan state have dedicated styles');
  check.ok(/max-width:700px[\s\S]*\.subscription-choices/.test(css), 'upgrade choices stack for narrow screens');
  check.ok(!/guaranteed|boost your score|remove all|not legal advice/i.test(box.innerHTML + panel.innerHTML), 'the marketing makes no score, deletion or disclaimer claims');
  return { sample_retired: true, branded_pdf_control: true, shared_benefits: true, cumulative_credit_quotes: true, current_plan_boundaries: true, upgrade_review_confirmation: true, stale_quote_refresh: true, pending_lock: true, pending_invoice_resume: true, annual_confirmation_bound: true, pending_account_isolation: true };
}

module.exports = { run, id: 'en-purchase-presentation', title: 'Batch 70: simple PDF and subscription presentation, cumulative upgrade quotes and retirement of sample invitations' };
