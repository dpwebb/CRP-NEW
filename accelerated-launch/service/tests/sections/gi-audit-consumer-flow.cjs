'use strict';
/** Fictional local consumer controls. Deferred VM checks exercise actual UI functions;
 * Chrome checks rendered controls with intercepted fictional API responses, not provider proof. */
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { chromium } = require('C:/Users/webbd/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const raw = fs.readFileSync(path.join(__dirname, '../../ui/app.js'), 'utf8');
const source = raw.slice(0, raw.indexOf('/* ------------------------------------------------------------------ bootstrap */'));
const tick = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => { let resolve; const promise = new Promise(yes => { resolve = yes; }); return { promise, resolve }; };
const surface = {
  countries: [{ value: 'CA', label: 'Canada' }], regions: [{ value: 'CA-NS', country: 'CA', label: 'Nova Scotia' }],
  bureau_choices: { CA: [{ id: 'TRANSUNION', label: 'TransUnion' }] }, preview_mode: true,
  entitlement: { payment_mode: 'test' }, support_contact: { email: 'admin@creditregulatorpro.com', label: 'Contact support' },
  upload_limits: { max_account_stored_bytes: 41943040, max_file_bytes: 10485760, max_case_files: 8 }
};
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
}

async function browserChecks(t, check) {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await context.newPage(); page.setDefaultTimeout(10000);
      const requests = [], downloads = []; let signedIn = false;
      await page.route('**/api/**', async route => {
        const request = route.request(), url = new URL(request.url()), p = url.pathname; requests.push({ p, method: request.method(), search: url.search });
        let status = 200, data = { ok: true };
        if (p === '/api/jurisdictions') data.surface = surface;
        else if (p === '/api/pricing') data.plan_catalog = { currency: 'CAD', plans: [] };
        else if (p === '/api/session') { if (signedIn) data.account = { account_id: 'accountA', email: 'fictional@example.test' }; else { status = 401; data = { ok: false, error: { message: 'Sign in to continue.' } }; } }
        else if (p === '/api/account/security') data.signup_complete = true;
        else if (p === '/api/account/profile') data.profile = {};
        else if (p === '/api/account/documents') data.documents = [];
        else if (p === '/api/cases') data.cases = [{ case_id: 'caseA', bureau: 'TransUnion', report_date: '2026-10-14', country: 'CA', region: 'CA-NS', created_at: '2026-10-14T12:00:00Z' }, { case_id: 'caseB', bureau: 'Equifax', report_date: '2026-09-14', country: 'CA', region: 'CA-NS', created_at: '2026-09-14T12:00:00Z' }];
        else if (p === '/api/privacy') Object.assign(data, { cases: [{ documents: [{ stored_bytes: 1048576 }] }], account_documents: [{ stored_bytes: 1048576 }] });
        else if (p === '/api/entitlement' || p === '/api/billing/plans') Object.assign(data, { entitlement: { entitled: false, renewal_cancellation_available: true, renewing_subscription_recorded: true, renewal_status: 'CANCELLATION_UNCONFIRMED' }, payment: { is_a_working_payment: false }, plan_catalog: { currency: 'CAD', plans: [] } });
        else if (p === '/api/cases/caseA') data.view = view();
        else if (p === '/api/cases/caseA/results') data.results = [{ result_id: 'result-current', created_at: '2026-10-14' }, { result_id: 'result-old', created_at: '2026-09-14' }];
        else if (p === '/api/cases/caseA/results/result-old/view') data.view = view('result-old');
        else if (p === '/api/cases/caseA/packet') data.view = { eligible_issues: [], packet: {} };
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
      const downloaded = page.waitForEvent('download'); await page.locator('#download-assessment').click(); await downloaded;
      check.equal(downloads.at(-1), 'result-old', 'download names the assessment currently displayed');
      await page.locator('#create-packet').click(); await page.getByText('Packets use your latest assessment. Review these issues before choosing disputes.').waitFor();
      check.ok(true, 'historical packet entry explicitly returns to latest assessment');
      const navigate = async step => { if (width === 390) await page.locator('.workspace-menu-toggle').click(); await page.locator(`[data-step="${step}"]`).click(); };
      await navigate(10); await page.locator('#cancelEntitlement').waitFor();
      check.ok(await page.locator('#cancelEntitlement').isVisible(), 'expired access still offers renewal cancellation when server records a renewable subscription');
      await navigate(8); await page.locator('#deleteAccount').waitFor();
      let dialogs = 0; const dismiss = dialog => { dialogs++; dialog.dismiss(); }; page.on('dialog', dismiss);
      await page.locator('#deleteAccount').click(); await page.locator('#delete').click();
      check.equal(dialogs, 2, 'report and whole-account deletion each require confirmation');
      check.equal(requests.filter(r => r.method === 'DELETE').length, 0, 'cancelled confirmation sends no deletion');
      page.off('dialog', dismiss); page.once('dialog', dialog => dialog.accept()); await page.locator('#deleteAccount').click(); await page.getByText(/Renewal could not be stopped/).waitFor();
      check.ok(await page.locator('#deleteAccount').isVisible(), 'failed provider cancellation leaves the account view and retry available');
      await navigate(9); check.equal(await page.locator('#panel h1').evaluate(h => document.activeElement === h), true, 'keyboard focus follows wizard step navigation');
      check.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${width}px amended consumer surfaces have no horizontal overflow`);
      await context.close();
    }
  } finally { await browser.close(); }
}
async function run(t, check) { await deferredChecks(check); await browserChecks(t, check); return { fictional_only: true, delayed_responses: true, confirmation_cancel: true, selected_result_download: true, latest_packet_notice: true, public_support: true, shared_quota: true, expired_renewal_control: true, real_chrome_widths: [1440, 390], provider_proof: false }; }
module.exports = { id: 'gi-audit-consumer-flow', title: 'Consumer audit corrections preserve context, explicit deletion choice and understandable report controls', run };
