'use strict';
/** Deferred-response regression checks for actual UI functions/API calls.
 * No browser-layout claim: a VM DOM controls navigation and request completion order.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const SOURCE_PATH = path.join(__dirname, '..', '..', 'ui', 'app.js');
const raw = fs.readFileSync(SOURCE_PATH, 'utf8');
const bootstrap = raw.indexOf('/* ------------------------------------------------------------------ bootstrap */');
assert.ok(bootstrap >= 0, 'bootstrap marker must exist');
const source = raw.slice(0, bootstrap);
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const tick = () => new Promise(resolve => setImmediate(resolve));
async function until(predicate, label) { for (let i = 0; i < 20; i++) { if (predicate()) return; await tick(); } throw new Error('Harness did not reach ' + label); }
function element(id) {
  return { id, innerHTML: '', textContent: '', className: '', value: '', disabled: false,
    checked: false, hidden: false, isConnected: true, style: {}, dataset: {}, files: [],
    onclick: null, onchange: null, oninput: null,
    setAttribute(key, value) { this[key] = value; }, getAttribute(key) { return this[key] ?? null; },
    scrollIntoView() {}, contains() { return true; }, querySelectorAll: () => [], querySelector: () => null };
}
function harness(responder, { autoRead = true } = {}) {
  const nodes = new Map(), calls = [], navigations = [], readers = [];
  const node = id => { if (!nodes.has(id)) nodes.set(id, element(id)); return nodes.get(id); };
  const panel = node('panel'); let block = element('packet-block');
  const issues = [{ checked: true, getAttribute: key => key === 'data-check-issue' ? 'issue-A' : null }];
  const documentChecks = [];
  const caseButtons = [{ dataset: { open: 'existingA' }, onclick: null }, { dataset: { open: 'existingB' }, onclick: null }];
  panel.querySelector = selector => selector === '#packet-block' ? block : null;
  panel.querySelectorAll = selector => {
    if (selector === '[data-check-issue]:checked') return issues.filter(row => row.checked);
    if (selector === '[data-check-issue]') return issues;
    if (selector === '[data-packet-document]:checked') return documentChecks.filter(row => row.checked);
    if (selector === '[data-packet-document], [id^="packet-document-date-"]') return documentChecks;
    if (selector === '[data-open]') return caseButtons;
    return [];
  };
  const context = {
    console, setTimeout, clearTimeout, Promise, JSON, Object, Array, Map, Set, Date, String, Number, Error,
    document: { getElementById: node, createElement: element, querySelectorAll: selector => panel.querySelectorAll(selector) },
    FileReader: class FileReader {
      readAsDataURL(file) { this.file = file; readers.push(this); if (autoRead) this.finish(); }
      finish() { this.result = 'data:application/pdf;base64,JVBERi0xLjQKJSBGaWN0aW9uYWwgSUQKJSVFT0YK'; this.onload(); }
    },
    fetch: async (url, options = {}) => {
      const request = { method: options.method || 'GET', url, body: options.body ? JSON.parse(options.body) : undefined,
        account: vm.runInContext('state.account && state.account.account_id', context) };
      calls.push(request);
      const reply = await responder(request, { context, node, calls });
      const status = reply?.status || 200, body = reply?.body || reply || { ok: true };
      return { ok: status < 400, status, json: async () => body };
    }
  };
  context.window = context; context.location = { assign: url => navigations.push(url) };
  vm.createContext(context); vm.runInContext(source, context, { filename: SOURCE_PATH });
  // Avoid shell rendering in action completions; state and API effects remain real.
  vm.runInContext('render = () => {};', context);
  const evaluate = code => vm.runInContext(code, context);
  const account = (id, name) => {
    context.nextId = id; context.nextName = name;
    evaluate(`state.account = { account_id: nextId, email: nextId + '@example.test' }; state.accountProfile = { full_name: nextName }; state.accountDocuments = []; state.step = 0; renderAccountDetails(document.getElementById('panel'));`);
  };
  const openPacket = (id, approved = false) => {
    context.nextCase = id;
    evaluate('state.caseId = nextCase; state.step = 4;');
    block.isConnected = false; block = element('packet-block');
    node('packet-download').disabled = !approved; node('packet-approve').disabled = approved;
    node('packet-bureau').value = 'TRANSUNION'; node('packet-channel').value = 'POSTAL'; node('packet-purpose').value = 'ACCOUNT';
    node('packet-name').value = 'Fictional Consumer'; node('packet-contact').value = '10 Fictional Street';
    return evaluate('wirePacket(document.getElementById("panel"))');
  };
  const jurisdiction = () => {
    node('country').value = 'CA'; node('region').value = 'CA-NS'; node('bureau').value = 'TRANSUNION';
    evaluate(`surface = { countries: [{ value: 'CA', label: 'Canada' }], regions: [{ value: 'CA-NS', country: 'CA', label: 'Nova Scotia' }], bureau_choices: { CA: [{ id: 'TRANSUNION', label: 'TransUnion' }] } }; state.step = 1; renderJurisdiction(document.getElementById('panel'));`);
  };
  return { context, node, calls, navigations, readers, panel, issues, caseButtons, evaluate, account, openPacket, jurisdiction };
}
const requirements = { country: 'CA', bureau: 'TRANSUNION', label: 'TransUnion Canada', postal: 'Fictional test destination', items: [], sources: [] };
function packetView(approved = false) {
  return { eligible_issues: [{ eligible: true, issue_id: 'issue-A', consumer_label: 'VIOLATION' }],
    packet: { approved, download_available: approved, selected_issue_ids: ['issue-A'], wording: 'Saved wording' },
    support: { requirements, catalog: [], account_profile: { full_name: 'Fictional Consumer' } } };
}
async function saveAccountRace() {
  const saved = deferred();
  const h = harness(request => request.method === 'PUT' ? saved.promise : { ok: true });
  h.account('A', 'Account A name'); const action = h.node('account-save').onclick();
  await until(() => h.calls.some(row => row.method === 'PUT'), 'A profile PUT');
  await h.node('signout').onclick(); h.account('B', 'Account B name');
  saved.resolve({ profile: { full_name: 'Account A name' } }); await action;
  const actual = h.evaluate('({ account: state.account.account_id, profile: state.accountProfile.full_name })');
  assert.equal(actual.profile, 'Account B name', 'A save response must not overwrite B profile');
}
async function uploadListRace() {
  const docs = deferred();
  const h = harness(request => request.method === 'GET' && request.url === '/api/account/documents' ? docs.promise : { ok: true });
  h.account('A', 'Account A name'); h.node('account-document-file').files = [{ name: 'fictional-A.pdf', size: 32, type: 'application/pdf' }];
  h.node('account-document-type').value = 'IDENTITY'; h.node('account-document-kind').value = 'PASSPORT';
  const action = h.node('account-document-upload').onclick();
  await until(() => h.calls.some(row => row.method === 'GET' && row.url === '/api/account/documents'), 'A document list request');
  await h.node('signout').onclick(); h.account('B', 'Account B name');
  h.evaluate(`state.accountDocuments = [{ file_id: 'B-document', original_filename: 'fictional-B.pdf' }];`);
  docs.resolve({ documents: [{ file_id: 'A-document', original_filename: 'fictional-A.pdf' }] }); await action;
  const actual = h.evaluate('state.accountDocuments.map(doc => doc.file_id).join(",")');
  assert.equal(actual, 'B-document', 'A list response must not overwrite B documents');
}
async function uploadReadRace() {
  const h = harness(() => ({ ok: true, documents: [] }), { autoRead: false });
  h.account('A', 'Account A name'); h.node('account-document-file').files = [{ name: 'fictional-A.pdf', size: 32, type: 'application/pdf' }];
  h.node('account-document-type').value = 'IDENTITY'; h.node('account-document-kind').value = 'PASSPORT';
  const action = h.node('account-document-upload').onclick(); await until(() => h.readers.length, 'A FileReader');
  await h.node('signout').onclick(); h.account('B', 'Account B name');
  h.readers[0].finish(); await action;
  const writes = h.calls.filter(row => row.method === 'POST' && row.url === '/api/account/documents');
  assert.equal(writes.length, 0, 'A file read must not create a document after account context changes');
}
async function packetContextRace() {
  const selected = deferred();
  const h = harness(request => {
    if (request.url.endsWith('/packet/select')) return selected.promise;
    return { view: packetView(false), requirements, missing: [] };
  });
  h.account('A', 'Fictional Consumer'); await h.openPacket('caseA');
  h.node('packet-wording').value = 'Visible wording on case A';
  const action = h.node('packet-approve').onclick();
  await until(() => h.calls.some(row => row.url === '/api/cases/caseA/packet/select'), 'A packet select');
  await h.openPacket('caseB'); h.node('packet-wording').value = 'Visible wording on case B';
  selected.resolve({ ok: true }); await action;
  const writes = h.calls.filter(row => row.method === 'POST' && !row.url.endsWith('/requirements'));
  assert.equal(writes.length, 1, 'Navigation must stop the remaining A action writes and approval');
  assert.equal(writes[0].url, '/api/cases/caseA/packet/select');
}
async function wirePacketRace() {
  const lateA = deferred();
  const h = harness(request => request.url === '/api/cases/caseA/packet' ? lateA.promise :
    request.url.endsWith('/packet') ? { view: packetView(true) } : { requirements, missing: [] });
  h.account('A', 'Fictional Consumer'); const oldWire = h.openPacket('caseA');
  await until(() => h.calls.some(row => row.url === '/api/cases/caseA/packet'), 'A packet GET');
  await h.openPacket('caseB', true); await h.node('packet-bureau').onchange();
  assert.equal(h.node('packet-download').disabled, true, 'B handler must invalidate B approval');
  h.node('packet-download').disabled = false;
  lateA.resolve({ view: packetView(false) }); await oldWire;
  await h.node('packet-bureau').onchange();
  assert.equal(h.node('packet-download').disabled, true, 'Late A GET must not replace B approval handlers');
}
async function issueSelectionInvalidation() {
  const h = harness(() => ({ view: packetView(true), requirements, missing: [] }));
  h.account('A', 'Fictional Consumer'); await h.openPacket('caseA', true);
  h.issues[0].checked = false;
  if (h.issues[0].onchange) await h.issues[0].onchange();
  else if (h.issues[0].oninput) await h.issues[0].oninput();
  assert.equal(h.node('packet-download').disabled, true, 'Changing selected issues must invalidate visible approval');
  assert.equal(h.node('packet-approve').disabled, false, 'Changed selection must permit reapproval');
}
const createdCase = { case_id: 'newA', country: 'CA', region: 'CA-NS', selected_bureau: 'TRANSUNION' };
async function createCaseAccountRace() {
  const late = deferred(), h = harness(request => request.method === 'POST' && request.url === '/api/cases' ? late.promise : { ok: true });
  h.account('A', 'Fictional A'); h.jurisdiction(); const action = h.node('open').onclick();
  await until(() => h.calls.some(row => row.method === 'POST' && row.url === '/api/cases'), 'case POST');
  await h.node('signout').onclick(); h.account('B', 'Fictional B');
  late.resolve({ case: createdCase }); await action;
  assert.equal(h.calls.filter(row => row.method === 'GET' && row.url.startsWith('/api/cases')).length, 0, 'late A creation must not read cases using B session');
  assert.equal(h.evaluate('state.caseId'), null);
}
async function createCaseListNavigationRace() {
  const late = deferred(), h = harness(request => request.method === 'POST' ? { case: createdCase } : late.promise);
  h.account('A', 'Fictional A'); h.jurisdiction(); const action = h.node('open').onclick();
  await until(() => h.calls.some(row => row.method === 'GET' && row.url === '/api/cases'), 'case list');
  h.evaluate('state.step = 0; renderSequence++; state.accountProfile.full_name = "Edited contact";');
  h.context.renderCalls = []; h.evaluate('render = () => { renderSequence++; renderCalls.push(state.step); };');
  late.resolve({ cases: [createdCase] }); await action;
  assert.equal(h.evaluate('state.step'), 0, 'late case list must keep the consumer on Account');
  assert.equal(h.evaluate('state.accountProfile.full_name'), 'Edited contact');
  assert.equal(h.evaluate('state.caseId'), null);
  assert.equal(h.calls.filter(row => row.url === '/api/cases/newA').length, 0, 'cancelled list must not request a view');
  assert.equal(h.context.renderCalls.length, 0, 'cancelled action must not reset current file controls or edits');
}
async function createCaseViewNavigationRace() {
  const late = deferred(), h = harness(request => request.method === 'POST' ? { case: createdCase } : request.url === '/api/cases' ? { cases: [createdCase] } : late.promise);
  h.account('A', 'Fictional A'); h.jurisdiction(); const action = h.node('open').onclick();
  await until(() => h.calls.some(row => row.url === '/api/cases/newA'), 'case view');
  h.evaluate('state.step = 0; renderSequence++;'); h.jurisdiction(); h.evaluate('renderSequence++;');
  late.resolve({ view: { case: createdCase } }); await action;
  assert.equal(h.evaluate('state.step'), 1, 'leaving and returning to the same step must still cancel old navigation');
  assert.equal(h.evaluate('state.caseId'), null);
  assert.equal(h.evaluate('state.view'), null);
}
async function existingCaseAccountRace() {
  const late = deferred(), h = harness(request => request.url === '/api/cases/existingA' ? late.promise : { ok: true });
  h.account('A', 'Fictional A'); h.jurisdiction(); const action = h.caseButtons[0].onclick();
  await until(() => h.calls.some(row => row.url === '/api/cases/existingA'), 'existing case view');
  await h.node('signout').onclick(); h.account('B', 'Fictional B');
  late.resolve({ view: { case: { case_id: 'existingA' }, private_fixture: 'A-only' } }); await action;
  assert.equal(h.evaluate('state.caseId'), null, 'A case must not become active for B');
  assert.equal(h.evaluate('state.view'), null, 'A response must not enter B view');
  assert.equal(h.evaluate('state.step'), 0);
}
async function caseRefreshAccountRace() {
  const late = deferred(), h = harness(request => request.url === '/api/cases' ? late.promise : { ok: true });
  h.account('A', 'Fictional A'); h.jurisdiction(); const action = h.node('refresh').onclick();
  await until(() => h.calls.some(row => row.url === '/api/cases'), 'case refresh');
  await h.node('signout').onclick(); h.account('B', 'Fictional B');
  late.resolve({ cases: [createdCase] }); await action;
  assert.equal(h.evaluate('state.cases.length'), 0, 'A case list must not enter B account');
}
async function createCaseNormalCompletion() {
  const h = harness(request => request.method === 'POST' ? { case: createdCase } : request.url === '/api/cases' ? { cases: [createdCase] } : { view: { case: createdCase } });
  h.account('A', 'Fictional A'); h.jurisdiction(); await h.node('open').onclick();
  assert.equal(h.evaluate('state.step'), 2); assert.equal(h.evaluate('state.caseId'), 'newA');
  assert.equal(h.calls[0].body.bureau, 'TRANSUNION', 'normal selected bureau still reaches creation');
  assert.equal(h.evaluate('state.view.case.selected_bureau'), 'TRANSUNION');
}
async function existingCaseNormalCompletion() {
  const h = harness(() => ({ view: { case: { case_id: 'existingA' } } }));
  h.account('A', 'Fictional A'); h.jurisdiction(); await h.caseButtons[0].onclick();
  assert.equal(h.evaluate('state.step'), 3); assert.equal(h.evaluate('state.caseId'), 'existingA');
}
async function latestCaseChoiceWins() {
  const first = deferred(), second = deferred(), h = harness(request => request.url === '/api/cases/existingA' ? first.promise : second.promise);
  h.account('A', 'Fictional A'); h.jurisdiction();
  const openA = h.caseButtons[0].onclick(); await until(() => h.calls.some(row => row.url === '/api/cases/existingA'), 'first case choice');
  const openB = h.caseButtons[1].onclick(); await until(() => h.calls.some(row => row.url === '/api/cases/existingB'), 'latest case choice');
  first.resolve({ view: { case: { case_id: 'existingA' } } }); await openA;
  assert.equal(h.evaluate('state.caseId'), null, 'older response must wait for the latest selected case');
  second.resolve({ view: { case: { case_id: 'existingB' } } }); await openB;
  assert.equal(h.evaluate('state.caseId'), 'existingB'); assert.equal(h.evaluate('state.step'), 3);
}
const tests = { saveAccountRace, uploadListRace, uploadReadRace, packetContextRace, wirePacketRace, issueSelectionInvalidation,
  createCaseAccountRace, createCaseListNavigationRace, createCaseViewNavigationRace, existingCaseAccountRace, caseRefreshAccountRace,
  createCaseNormalCompletion, existingCaseNormalCompletion, latestCaseChoiceWins };
async function run(service, check) {
  for (const [name, run] of Object.entries(tests)) {
    await run(); check.ok(true, name + ' preserves account, case and reviewed-version context');
  }
  const h = harness(() => ({ ok: true })); h.account('A', 'Fictional Consumer');
  check.ok(!/id="(?:signin|create|password)"/.test(h.panel.innerHTML), 'signed-in Step1 never presents sign-in/create/password fields');
  check.ok(/Contact details/.test(h.panel.innerHTML) && /Documents for disputes/.test(h.panel.innerHTML), 'Step1 provides consumer contact details and supporting uploads');
  check.ok(!/Stripe is connected|No email is sent|this build|Another account cannot/.test(h.panel.innerHTML), 'account view omits provider/build/security implementation copy');
  h.context.legacy = { eligible_issues: [{ eligible: true, issue_id: 'legacy' }], packet: { correspondence: { consumer_name: 'Previously Saved Consumer', contact: 'previous@example.test' } }, support: { account_profile: {} } };
  const legacy = h.evaluate('renderPacketBlock(legacy)');
  check.ok(legacy.includes('Previously Saved Consumer') && legacy.includes('previous@example.test'), 'legacy packet details remain visible when account contact is unset');
  return { deferred_account_and_file_reads: true, deferred_packet_navigation: true, deferred_case_navigation: true, selection_invalidates_download: true, signed_in_account_view: true };
}
module.exports = { run, id: 'ec-account-packet-ui', title: 'Account and packet actions preserve their original account, case and reviewed selection' };
