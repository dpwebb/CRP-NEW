'use strict';
/** Fictional local consumer controls. Deferred VM checks exercise actual UI functions;
 * Chrome checks rendered controls with intercepted fictional API responses, not provider proof. */
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { chromium } = require('C:/Users/webbd/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const raw = fs.readFileSync(path.join(__dirname, '../../ui/app.js'), 'utf8');
const source = raw.slice(0, raw.indexOf('/* ------------------------------------------------------------------ bootstrap */'));
const tick = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const surface = {
  countries: [{ value: 'CA', label: 'Canada' }], regions: [{ value: 'CA-NS', country: 'CA', label: 'Nova Scotia' }],
  bureau_choices: { CA: [{ id: 'TRANSUNION', label: 'TransUnion' }] }, preview_mode: true,
  entitlement: { payment_mode: 'test' }, support_contact: { email: 'admin@creditregulatorpro.com', label: 'Contact support' },
  upload_limits: { max_account_stored_bytes: 41943040, max_file_bytes: 10485760, max_case_files: 8 },
  payment_actions: { cancel_unfinished_checkout: true }
};
const planCatalog = { currency: 'CAD', plans: [
  { plan_code: 'report_once', amount_display: '$5.95 CAD', amount_cents: 595, interval: 'one_time' },
  { plan_code: 'monthly', amount_display: '$7.95 CAD', amount_cents: 795, interval: 'month' },
  { plan_code: 'annual', amount_display: '$79.50 CAD', amount_cents: 7950, interval: 'year' }
] };
function view(result = 'result-current') {
  return { case: { case_id: 'caseA', country: 'CA', region: 'CA-NS', status: 'OPEN', selected_bureau: 'TRANSUNION' },
    result_id: result, latest_result_id: 'result-current', reviewed: true,
    assessment_access: { complete_assessment: true, dispute_packet: true },
    assessment_summary: { distinct_total: 1, violation_total: 1 },
    result: { assessed_on: '2026-10-14', issues: [{ eligible: true, issue_id: 'issueA', consumer_label: 'VIOLATION', explanation: 'Account dates do not match.', uncertainty: 'The closing date is before the opening date.' }] } };
}
function harness(responder) {
  const nodes = new Map(), calls = [];
  const node = id => {
    if (!nodes.has(id)) nodes.set(id, { id, value: '', innerHTML: '', textContent: '', disabled: false, checked: false, style: {}, dataset: {},
      querySelectorAll: () => [], querySelector: () => null, setAttribute() {}, removeAttribute() {}, focus() {}, scrollIntoView() {} });
    return nodes.get(id);
  };
  const context = { console, setTimeout, clearTimeout, Promise, URLSearchParams, Date, Map, Set, JSON, Object, Array, Number, String, Error,
    document: { getElementById: node, createElement: node }, navigator: { clipboard: { writeText: async () => {} } },
    location: { hash: '', search: '', assign() {} }, crypto: require('node:crypto'),
    fetch: async (url, options = {}) => {
      calls.push({ url, method: options.method || 'GET' });
      const body = await responder(url, options);
      return { ok: true, status: 200, json: async () => body || { ok: true } };
    } };
  context.window = context; context.confirm = () => false;
  vm.createContext(context); vm.runInContext(source, context);
  const evaluate = code => vm.runInContext(code, context);
  context.fixtureView = view(); context.fixtureSurface = surface;
  evaluate('surface=fixtureSurface; state.account={account_id:"accountA",email:"fictional@example.test"}; state.caseId="caseA"; state.view=fixtureView; state.step=STEP.RESULTS; render=()=>{renderSequence++;};');
  return { node, context, calls, evaluate };
}
async function deferredChecks(check) {
  for (const target of ['navigation', 'signout', 'case-change']) {
    const wait = deferred();
    const h = harness(url => url.endsWith('/results') ? { results: [{ result_id: 'result-old' }] } : wait.promise);
    await h.evaluate('wireResultSelector(document.getElementById("panel"),state.view)');
    h.node('result-select').value = 'result-old'; const action = h.node('result-select').onchange(); await tick();
    if (target === 'signout') h.evaluate('accountEpoch++; state.account=null; state.view=null; state.step=STEP.ACCOUNT;');
    else if (target === 'case-change') h.evaluate('state.caseId="caseB"; state.view={result_id:"resultB"};');
    else h.evaluate('state.step=STEP.HISTORY; renderSequence++;');
    wait.resolve({ view: view('result-old') }); await action;
    check.ok(h.evaluate('state.view?.result_id') !== 'result-old', `${target} discards a delayed historical assessment`);
    check.ok(h.evaluate('state.step') !== 3 || target === 'case-change', `${target} cannot force Results open`);
  }
  const first = deferred(), second = deferred();
  const choices = harness(url => url.endsWith('/results') ? { results: [{ result_id: 'result-old' }, { result_id: 'result-current' }] } : url.includes('result-old') ? first.promise : second.promise);
  await choices.evaluate('wireResultSelector(document.getElementById("panel"),state.view)');
  choices.node('result-select').value = 'result-old'; const oldAction = choices.node('result-select').onchange(); await tick();
  choices.node('result-select').value = 'result-current'; const currentAction = choices.node('result-select').onchange(); await tick();
  first.resolve({ view: view('result-old') }); await oldAction;
  second.resolve({ view: view() }); await currentAction;
  check.equal(choices.evaluate('state.view.result_id'), 'result-current', 'the latest selection wins even when its response arrives last');
  const lateList = deferred(), listing = harness(() => lateList.promise);
  const listingAction = listing.evaluate('wireResultSelector(document.getElementById("panel"),state.view)'); await tick();
  listing.evaluate('accountEpoch++; state.account=null; state.result_list=[];'); lateList.resolve({ results: [{ result_id: 'privateA' }] }); await listingAction;
  check.equal(listing.evaluate('state.result_list.length'), 0, 'late result-list metadata is discarded after signout');
  const status = deferred(); const h = harness(url => url === '/api/privacy' ? { cases: [], account_documents: [] } : status.promise);
  const statusButton = { dataset: { status: 'CLOSED' } };
  h.node('panel').querySelectorAll = selector => selector === '[data-status]' ? [statusButton] : [];
  h.evaluate('state.step=STEP.CASE; renderCase(document.getElementById("panel"));');
  const action = statusButton.onclick(); await tick(); h.evaluate('state.caseId="caseB"; state.view={result_id:"resultB"};');
  status.resolve({ ok: true }); await action;
  check.equal(h.evaluate('state.view.result_id'), 'resultB', 'late status update cannot replace another case view');
  check.equal(h.calls.filter(row => row.url === '/api/cases/caseA').length, 0, 'stale status response stops before a second read');
  const cancel = harness(() => ({ ok: true, cases: [], account_documents: [] }));
  cancel.evaluate('state.step=STEP.CASE; renderCase(document.getElementById("panel"));');
  await cancel.node('delete').onclick(); await cancel.node('deleteAccount').onclick();
  check.equal(cancel.calls.filter(row => row.method === 'DELETE').length, 0, 'Cancel sends neither destructive request');
  const history = deferred(); const hist = harness(url => url === '/api/history' ? { assessments: [{ result_id: 'one' }, { result_id: 'two' }] } : history.promise);
  hist.evaluate('state.step=STEP.HISTORY; renderHistory(document.getElementById("panel"));'); await tick();
  hist.node('cmp-left').value = 'one'; hist.node('cmp-right').value = 'two'; const compare = hist.node('compare').onclick(); await tick();
  hist.evaluate('accountEpoch++; state.account=null; state.step=STEP.ACCOUNT;'); history.resolve({ outcomes: [{ category: 'PRIVATE_OLD_FINDING' }] }); await compare;
  check.ok(!hist.node('comparison').innerHTML.includes('PRIVATE_OLD_FINDING'), 'late history comparison is discarded after signout');
  const quota = harness(() => ({ ok: true })); quota.evaluate('state.storageSnapshot=40*1024*1024-1024;');
  let refused = false; try { quota.evaluate('validateReportFiles([{name:"fictional.pdf",size:2048}]);'); } catch { refused = true; }
  check.ok(refused, 'whole batch is refused locally when shared remaining storage is insufficient');
  const privateView = harness(() => ({}));
  privateView.evaluate('state.account=null; renderResults(document.getElementById("panel"));');
  check.ok(/Sign in/.test(privateView.node('panel').innerHTML) && !privateView.node('panel').innerHTML.includes('Account dates do not match'), 'signed-out rendering hides a retained private assessment');
  for (const stage of ['POST', 'GET']) for (const target of ['signout', 'case-switch', 'account-switch']) for (const fail of [false, true]) {
    const wait = deferred();
    const clarification = harness((url, options) => options.method === stage ? wait.promise : { view: view() });
    clarification.context.fixtureView.clarification_questions = [{ id: 'account-responsibility', question_key: 'responsibility', answer_kind: 'choice', choices: ['individual'] }];
    clarification.evaluate('wireClarification(document.getElementById("panel"),state.view);');
    clarification.node('q-responsibility').value = 'individual';
    const saving = clarification.node('clarify-submit').onclick(); await tick(); await tick();
    check.equal(clarification.calls.length, stage === 'POST' ? 1 : 2, 'clarification diagnostic reaches the intended pending request');
    if (target === 'signout') clarification.evaluate('accountEpoch++; state.account=null; state.view=null;');
    else {
      if (target === 'account-switch') clarification.evaluate('accountEpoch++; state.account={account_id:"accountB"};');
      clarification.evaluate('state.caseId="caseB"; state.view={result_id:"resultB"};');
    }
    clarification.evaluate('state.error=null; state.notice="Current context";');
    if (fail) wait.reject(Error('Previous clarification failed')); else wait.resolve({ view: view('stale-clarification') });
    await saving;
    check.equal(clarification.evaluate('state.view?.result_id || null'), target === 'signout' ? null : 'resultB', `${stage} ${target}: late clarification cannot replace the current assessment`);
    check.equal(clarification.evaluate('state.error'), null, 'old clarification failures remain outside the current context');
    check.equal(clarification.evaluate('state.notice'), 'Current context', 'late clarification preserves the current notice');
    check.equal(clarification.calls.length, stage === 'POST' ? 1 : 2, 'stale clarification stops before any follow-up request');
  }
  for (const target of ['signout', 'account-switch']) for (const fail of [false, true]) {
    const stopped = deferred(), stale = harness(() => stopped.promise);
    stale.evaluate('rememberPendingCheckout({pending_checkout:{checkout_id:"checkout-old",plan_code:"monthly"}}); wirePendingPayment();');
    const cancelling = stale.node('cancel-unfinished-payment').onclick(); await tick();
    stale.evaluate('accountEpoch++; state.account=null; state.error=null; state.notice="Current session"; rememberPendingCheckout({});');
    if (target === 'account-switch') stale.evaluate('state.account={account_id:"accountB"}; rememberPendingCheckout({pending_checkout:{checkout_id:"checkout-B",plan_code:"annual"}});');
    if (fail) stopped.reject(Error('Old payment error')); else stopped.resolve({ cancellation: { cancelled: true } });
    await cancelling;
    check.equal(stale.evaluate('state.error'), null, `${target}: ${fail ? 'failed' : 'successful'} late payment cancellation cannot set an old error`);
    check.equal(stale.evaluate('state.notice'), 'Current session', 'late cancellation preserves the current session message');
    check.equal(stale.calls.length, 1, 'late cancellation stops before reading another session access');
    check.equal(stale.evaluate('state.pending_checkout?.checkout_id || null'), target === 'account-switch' ? 'checkout-B' : null, 'late cancellation preserves the current account pending checkout');
  }
}

async function browserChecks(t, check) {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await context.newPage(); page.setDefaultTimeout(10000);
      const requests = [], downloads = []; let signedIn = false;
      let billingEnt = { entitled: false, renewal_cancellation_available: true, renewing_subscription_recorded: true, renewal_status: 'CANCELLATION_UNCONFIRMED' };
      let pendingCheckout = null, failUnfinished = true;
      let packetSelectWait = null, failPacketSelect = false;
      const packetView = { eligible_issues: view().result.issues, packet: { result_id: 'result-current', selected_issue_ids: ['issueA'], selected_count: 1, approved: true, approved_version: 'fictional-approved', preview_version: 'fictional-approved', letter_preview_url:'/api/cases/caseA/packet/preview?version=fictional-approved',preview_ready: true, download_available: true, wording: 'Saved fictional wording', correspondence_preview: 'Saved fictional approved letter' }, support: { catalog: [], missing: [], requirements: { country: 'CA', bureau: 'TRANSUNION', label: 'Fictional bureau', items: [], sources: [] } } };
      // Guarded navigation/transport boundary. Actual complete PDF fields/images
      // and print/download custody run against the real service in ga/gl.
      await page.route('**/packet-review.js',route=>route.fulfill({contentType:'application/javascript',body:`window.CRP_PACKET_REVIEW={mount(options){options.root.innerHTML='<section data-packet-page="1"><textarea id="packet-letter" aria-label="Fictional letter editor"></textarea></section>';const input=options.root.querySelector('textarea');input.value=options.letter;input.oninput=()=>options.changed('letter');return{letter:()=>input.value,annotations:()=>[],dispose(){},ready:Promise.resolve({page_count:1})};}};`}));
      await page.route('**/api/**', async route => {
        const request = route.request(), url = new URL(request.url()), p = url.pathname; requests.push({ p, method: request.method(), search: url.search, body: request.postData() });
        let status = 200, data = { ok: true };
        if (p === '/api/jurisdictions') data.surface = surface;
        else if (p === '/api/pricing') data.plan_catalog = planCatalog;
        else if (p === '/api/session') { if (signedIn) data.account = { account_id: 'accountA', email: 'fictional@example.test' }; else { status = 401; data = { ok: false, error: { message: 'Sign in to continue.' } }; } }
        else if (p === '/api/account/security') data.signup_complete = true;
        else if (p === '/api/account/profile') data.profile = {};
        else if (p === '/api/account/documents') data.documents = [];
        else if (p === '/api/cases') data.cases = [{ case_id: 'caseA', bureau: 'TransUnion', report_date: '2026-10-14', country: 'CA', region: 'CA-NS', created_at: '2026-10-14T12:00:00Z' }, { case_id: 'caseB', bureau: 'Equifax', report_date: '2026-09-14', country: 'CA', region: 'CA-NS', created_at: '2026-09-14T12:00:00Z' }];
        else if (p === '/api/privacy') Object.assign(data, { cases: [{ documents: [{ stored_bytes: 1048576 }] }], account_documents: [{ stored_bytes: 1048576 }] });
        else if (p === '/api/entitlement' || p === '/api/billing/plans') Object.assign(data, { entitlement: billingEnt, payment: { is_a_working_payment: false }, plan_catalog: planCatalog, pending_checkout: pendingCheckout });
        else if (p === '/api/entitlement/cancel') {
          if (failUnfinished) { status = 502; data = { ok: false, error: { message: 'The unfinished payment could not be stopped. Please try again.' } }; }
          else { pendingCheckout = null; data.cancellation = { cancelled: true, checkout_cancelled: true, entitlement: billingEnt }; }
        }
        else if (p === '/api/support') Object.assign(data, { reference: 'fictional-support-reference', build_id: 'fictional-build', category: 'RESULT_PRESENT', case_count: 2, file_count: 2, result_count: 2, jurisdiction: [{ country: 'CA', region: 'CA-NS' }], plain: 'Include this reference when you ask for help.' });
        else if (p === '/api/cases/caseA') data.view = view();
        else if (p === '/api/cases/caseA/results') data.results = [{ result_id: 'result-current', created_at: '2026-10-14' }, { result_id: 'result-old', created_at: '2026-09-14' }];
        else if (p === '/api/cases/caseA/results/result-old/view') data.view = view('result-old');
        else if (p === '/api/cases/caseA/packet') data.view = packetView;
        else if (p.startsWith('/api/cases/caseA/packet/') && request.method() === 'POST') {
          if (p.endsWith('/select')) { if (packetSelectWait) await packetSelectWait.promise; if (failPacketSelect) { status = 502; data = { ok: false, error: { message: 'Fictional packet save refused.' } }; } }
          if (status === 200) data.view = packetView;
        }
        else if (p.endsWith('/report-download')) { downloads.push(url.searchParams.get('result_id')); await route.fulfill({ status: 200, headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="fictional.pdf"' }, body: '%PDF-1.4\n% Fictional download fixture\n%%EOF' }); return; }
        else if (p === '/api/account' && request.method() === 'DELETE') { status = 502; data = { ok: false, error: { message: 'Renewal could not be stopped. Your account has not been deleted. Please try again.' } }; }
        await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
      });
      await page.goto(t.base + '/index.html#create'); await page.locator('.signup-details > summary').waitFor();
      check.equal(await page.locator('.signup-details').getAttribute('open'), null, `${width}px signup begins with optional personal details collapsed`);
      await page.locator('.signup-details > summary').click(); await page.locator('#signup-full_name').fill('Fictional Consumer');
      check.equal(await page.locator('#signup-full_name').inputValue(), 'Fictional Consumer', 'optional fields remain editable when expanded');
      check.ok((await page.locator('.support-contact a').getAttribute('href')).startsWith('mailto:admin@'), 'anonymous signup provides an actionable established support contact');
      signedIn = true; await page.reload(); await page.locator('#resume-latest').waitFor();
      await page.locator('#storage-help').getByText(/38.0 MB left/).waitFor();
      check.ok((await page.locator('#storage-help').innerText()).includes('Reports and ID copies share'), 'initial upload explains shared account quota');
      await page.locator('#saved-report-filter').fill('Equifax');
      check.ok((await page.locator('#saved-report-list').innerText()).includes('Equifax') && !(await page.locator('#saved-report-list').innerText()).includes('TransUnion'), 'saved-report filter changes the visible choices');
      await page.locator('#resume-latest').click(); await page.locator('#result-select').waitFor();
      await page.locator('#result-select').selectOption('result-old'); await page.getByText('Showing the assessment you chose. Downloads use this same assessment.').waitFor();
      check.ok(await page.locator('#renewal-plans').isVisible(), 'results direct an account with an earlier renewal to cancellation in Plans');
      const downloaded = page.waitForEvent('download'); await page.locator('#download-assessment').click(); await downloaded;
      check.equal(downloads.at(-1), 'result-old', 'download names the assessment currently displayed');
      await page.locator('#create-packet').click(); await page.getByText('Packets use your latest assessment. Review these issues before choosing disputes.').waitFor();
      check.ok(true, 'historical packet entry explicitly returns to latest assessment');
      await page.locator('#packet-choose-next').waitFor();
      const navigate = async step => { const target = page.locator(`[data-step="${step}"]`); if (!await target.isVisible()) await page.getByRole('button', { name: 'Navigation menu', exact: true }).click(); await target.click(); };
      if (width === 390) {
        const savesBefore = requests.filter(row => row.method === 'POST' && row.p.includes('/packet/')).length;
        for (const step of [4, 5, 6]) {
          await navigate(step); await page.locator(step === 4 ? '#packet-choose-next' : step === 5 ? '#packet-prepare-next' : '#packet-letter').waitFor();
          await navigate(8); await page.locator('#deleteAccount').waitFor();
          check.equal(await page.locator('#steps').evaluate(node => node.matches(':popover-open')), false, `390px guarded packet step ${step} closes the native menu after navigation`);
          check.equal(await page.locator('#panel h1').evaluate(node => document.activeElement === node), true, 'guarded packet navigation focuses the destination heading after rendering');
        }
        check.equal(requests.filter(row => row.method === 'POST' && row.p.includes('/packet/')).length, savesBefore, 'leaving clean packet steps neither saves nor approves unseen content');
        await navigate(6); await page.locator('#packet-letter').waitFor();
        check.equal(await page.locator('#packet-download').isEnabled(), true, 'approved packet download remains available after clean guarded navigation');
        await page.locator('#packet-letter').fill('Fictional edited letter saved before leaving.');
        check.equal(await page.locator('#packet-download').isDisabled(), true, 'editing the letter still disables the old approval before guarded navigation');
        packetSelectWait = deferred(); const saving = page.waitForRequest(request => new URL(request.url()).pathname.endsWith('/packet/select'));
        await navigate(8); await saving;
        check.equal(await page.locator('#steps').evaluate(node => node.matches(':popover-open')), false, 'mobile menu closes while guarded packet persistence is still pending');
        check.equal(await page.locator('#panel h1').innerText(), 'Review and approve packet', 'guarded navigation waits for packet persistence before changing views');
        packetSelectWait.resolve(); packetSelectWait = null; await page.locator('#deleteAccount').waitFor();
        check.equal(await page.locator('#panel h1').evaluate(node => document.activeElement === node), true, 'destination heading receives focus after delayed packet persistence completes');
        check.ok(requests.some(row => row.p.endsWith('/packet/letter') && JSON.parse(row.body).letter_text === 'Fictional edited letter saved before leaving.'), 'guarded departure persists the visible edited letter');
        await navigate(6); await page.locator('#packet-letter').waitFor(); await page.locator('#packet-letter').fill('Fictional save failure keeps this packet open.');
        failPacketSelect = true; await navigate(8); await page.getByText('Fictional packet save refused.').waitFor();
        check.equal(await page.locator('#panel h1').innerText(), 'Review and approve packet', 'a failed packet save keeps guarded navigation on the packet view');
        check.equal(await page.locator('#steps').evaluate(node => node.matches(':popover-open')), false, 'failed guarded persistence leaves the error visible without a covering menu');
        check.equal(requests.filter(row => row.p.endsWith('/packet/approve')).length, 0, 'navigation never issues a packet approval');
        failPacketSelect = false;
      }
      await navigate(10); await page.locator('#cancelEntitlement').waitFor();
      check.ok(await page.locator('#cancelEntitlement').isVisible(), 'expired access still offers renewal cancellation when server records a renewable subscription');
      check.equal(await page.locator('#checkout-monthly, #checkout-annual').count(), 0, 'uncancelled earlier subscription hides new recurring purchase choices');
      check.ok(await page.locator('#checkout-report_once').isVisible(), 'one-report purchase remains available while earlier renewal needs cancellation');
      billingEnt = { ...billingEnt, entitled: true, access_via: 'ONE_TIME_CREDIT', plan_code: 'report_once', cancel_at_period_end: true };
      await navigate(10); await page.locator('#cancelEntitlement').waitFor();
      check.equal(await page.locator('#checkout-monthly, #checkout-annual').count(), 0, 'a later active one-time purchase cannot bypass the earlier-renewal purchase block');
      check.ok(!(await page.locator('#billingView').innerText()).includes('Renewal is cancelled'), 'aggregate outstanding renewal overrides a controlling cancelled row');
      check.ok((await page.locator('#billingView').innerText()).includes('An earlier subscription can still renew'), 'mixed renewal rows are described without assigning the one-time plan a renewal interval');
      billingEnt = { entitled: true, access_via: 'SUBSCRIPTION', plan_code: 'monthly', state: 'PAST_DUE', expires_at: '2026-10-14T12:00:00Z', grace_until: '2026-10-16T12:00:00Z', renewal_cancellation_available: true, renewing_subscription_recorded: true, renewal_status: 'CANCELLATION_UNCONFIRMED' };
      await navigate(10); await page.getByText(/Your latest subscription payment failed/).waitFor();
      const graceText = await page.locator('#billingView').innerText();
      check.ok(graceText.includes('October 16, 2026') && !graceText.includes('October 14, 2026'), 'past-due paid access displays the effective grace deadline rather than the old paid period');
      check.ok(graceText.includes('If payment is not confirmed by then, paid features will stop'), 'failed payment explains the access deadline in plain language');
      check.ok(await page.locator('#cancelEntitlement').isVisible(), 'grace-period account retains the ordinary cancellation control');
      billingEnt = { ...billingEnt, state: 'ACTIVE' };
      pendingCheckout = { checkout_id: 'fictional-unfinished', plan_code: 'monthly', state: 'OPEN' };
      await navigate(10); await page.locator('#cancel-unfinished-payment').waitFor();
      check.equal(await page.locator('#continue-payment').count(), 0, 'an obsolete ordinary checkout cannot continue alongside an active subscription');
      check.ok((await page.locator('#billingView').innerText()).includes('Your current subscription will stay active'), 'unfinished payment cancellation clearly preserves the current plan');
      await page.locator('#cancel-unfinished-payment').click(); await page.getByText('The unfinished payment could not be stopped. Please try again.').waitFor();
      check.ok(await page.locator('#cancel-unfinished-payment').isVisible(), 'failed payment stop keeps the unfinished checkout and retry control');
      failUnfinished = false;
      await page.locator('#cancel-unfinished-payment').click(); await page.getByText('Unfinished payment cancelled. Your current plan and reports are unchanged.').waitFor();
      check.equal(await page.locator('#cancel-unfinished-payment').count(), 0, 'confirmed cancellation removes only the finished pending action');
      check.equal(JSON.parse(requests.filter(row => row.p === '/api/entitlement/cancel').at(-1).body).cancel_checkout_id, 'fictional-unfinished', 'consumer action sends the selected unfinished checkout identity');
      check.ok(await page.locator('#cancelEntitlement').isVisible(), 'current subscription renewal control survives unfinished-payment cancellation');
      await navigate(8); await page.locator('#deleteAccount').waitFor();
      let dialogs = 0; const dismiss = dialog => { dialogs++; dialog.dismiss(); }; page.on('dialog', dismiss);
      await page.locator('#deleteAccount').click(); await page.locator('#delete').click();
      check.equal(dialogs, 2, 'report and whole-account deletion each require confirmation');
      check.equal(requests.filter(r => r.method === 'DELETE').length, 0, 'cancelled confirmation sends no deletion');
      page.off('dialog', dismiss); page.once('dialog', dialog => dialog.accept()); await page.locator('#deleteAccount').click(); await page.getByText(/Renewal could not be stopped/).waitFor();
      check.ok(await page.locator('#deleteAccount').isVisible(), 'failed provider cancellation leaves the account view and retry available');
      await navigate(9); check.equal(await page.locator('#panel h1').evaluate(h => document.activeElement === h), true, 'keyboard focus follows wizard step navigation');
      await page.locator('#copySummary').waitFor();
      await page.evaluate(() => { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('Fictional clipboard denial'); } } }); });
      check.equal(await page.locator('.support-technical').getAttribute('open'), null, 'support details begin collapsed before clipboard fallback');
      await page.locator('#copySummary').click();
      check.ok(await page.locator('#supportSummary').isVisible(), 'clipboard denial opens the actual disclosure for manual copying');
      check.ok(await page.locator('#supportSummary').evaluate(node => document.activeElement === node && node.selectionEnd > node.selectionStart), 'manual-copy fallback focuses and selects the visible summary');
      check.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${width}px amended consumer surfaces have no horizontal overflow`);
      await context.close();
    }
  } finally { await browser.close(); }
}
async function run(t, check) { await deferredChecks(check); await browserChecks(t, check); return { fictional_only: true, delayed_responses: true, confirmation_cancel: true, selected_result_download: true, latest_packet_notice: true, public_support: true, shared_quota: true, expired_renewal_control: true, aggregate_renewal_display: true, grace_deadline_copy: true, actual_dom_clipboard_fallback: true, real_chrome_widths: [1440, 390], provider_proof: false }; }
module.exports = { id: 'gi-audit-consumer-flow', title: 'Consumer audit corrections preserve context, explicit deletion choice and understandable report controls', run };
