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
    scrollIntoView() {}, after() {}, contains() { return true; }, querySelectorAll: () => [], querySelector: () => null };
}
function harness(responder, { autoRead = true } = {}) {
  const nodes = new Map(), calls = [], navigations = [], readers = [];
  const node = id => { if (!nodes.has(id)) nodes.set(id, element(id)); return nodes.get(id); };
  const panel = node('panel'); let block = element('packet-block');
  const issues = [{ checked: true, getAttribute: key => key === 'data-check-issue' ? 'issue-A' : null }];
  const documentChecks = [];
  const reportChecks = [];
  const pageInputs = [];
  const caseButtons = [{ dataset: { open: 'existingA' }, onclick: null }, { dataset: { open: 'existingB' }, onclick: null }];
  panel.querySelector = selector => selector === '#packet-block' ? block : null;
  panel.querySelectorAll = selector => {
    if (selector === '[data-check-issue]:checked') return issues.filter(row => row.checked);
    if (selector === '[data-check-issue]') return issues;
    if (selector === '[data-packet-document]:checked') return documentChecks.filter(row => row.checked);
    if (selector === '[data-packet-document], [id^="packet-document-date-"]') return documentChecks;
    if (selector === '[data-packet-report]:checked') return reportChecks.filter(row => row.checked);
    if (selector === '[data-packet-report]') return reportChecks;
    if (selector === '[data-packet-pages]') return pageInputs;
    if (selector === '[data-open]') return caseButtons;
    return [];
  };
  const context = {
    console, setTimeout, clearTimeout, Promise, JSON, Object, Array, Map, Set, Date, String, Number, Error, URLSearchParams, crypto: require('node:crypto'),
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
  context.open = url => navigations.push(url);
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
    evaluate('state.caseId = nextCase; state.step = 6;');
    block.isConnected = false; block = element('packet-block');
    node('packet-download').disabled = !approved; node('packet-approve').disabled = approved;
    node('packet-bureau').value = 'TRANSUNION'; node('packet-channel').value = 'POSTAL'; node('packet-purpose').value = 'ACCOUNT';
    node('packet-name').value = 'Fictional Consumer'; node('packet-contact').value = '10 Fictional Street';
    return evaluate('wirePacket(document.getElementById("panel"))');
  };
  const jurisdiction = () => {
    node('country').value = 'CA'; node('region').value = 'CA-NS'; node('bureau').value = 'TRANSUNION';
    evaluate(`surface = { countries: [{ value: 'CA', label: 'Canada' }], regions: [{ value: 'CA-NS', country: 'CA', label: 'Nova Scotia' }], bureau_choices: { CA: [{ id: 'TRANSUNION', label: 'TransUnion' }] } }; state.step = 1; renderJurisdiction(document.getElementById('panel'));`);
    node('file').files = [{ name: 'fictional-report.pdf', size: 48, type: 'application/pdf' }];
  };
  return { context, node, calls, navigations, readers, panel, issues, reportChecks, pageInputs, caseButtons, evaluate, account, openPacket, jurisdiction };
}
const requirements = { country: 'CA', bureau: 'TRANSUNION', label: 'TransUnion Canada', postal: 'Fictional test destination', items: [], sources: [] };
function packetView(approved = false) {
  return { eligible_issues: [{ eligible: true, issue_id: 'issue-A', consumer_label: 'VIOLATION' }],
    packet: { approved, download_available: approved, preview_ready: true, letter_preview_url: '/api/cases/caseA/packet/preview?version=current-A', selected_issue_ids: ['issue-A'], selected_count: 1, wording: 'Saved wording', correspondence_preview: 'Full saved letter\nSaved wording', preview_version: 'current-A', result_id: 'result-A' },
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
  const action = h.node('packet-save').onclick();
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
  assert.equal(h.node('packet-approve').disabled, true, 'Changed selection must require a fresh saved preview before approval');
  assert.equal(h.node('packet-print').disabled, true, 'Changed selection must disable printing the older approval');
}
async function currentPreviewApproval() {
  const h = harness(request => ({ view: request.url.endsWith('/packet') ? packetView() : { case: { case_id: 'caseA' }, result_id: 'result-A' }, requirements, missing: [] }));
  h.account('A', 'Fictional Consumer'); await h.openPacket('caseA');
  h.node('packet-wording').value = 'Added words not read in preview'; h.node('packet-wording').oninput();
  h.node('packet-preview-reviewed').checked = true; await h.node('packet-approve').onclick();
  assert.equal(h.calls.filter(row => row.method === 'POST').length, 0, 'an unsaved edit must neither save nor approve through the approval button');
  await h.openPacket('caseA'); h.node('packet-preview-reviewed').checked = true;
  await h.node('packet-preview-reviewed').onchange(); await h.node('packet-approve').onclick();
  const approved = h.calls.filter(row => row.url.endsWith('/approve'));
  assert.equal(approved.length, 1); assert.equal(approved[0].body.reviewed_version, 'current-A', 'approval binds the exact displayed preview version');
  assert.equal(h.calls.filter(row => /\/(select|wording|correspondence)$/.test(row.url)).length, 0, 'approval must not write unseen packet content');
}
async function dirtyPreviewStatus() {
  const h = harness(() => ({ view: packetView(true), requirements, missing: [] }));
  h.account('A', 'Fictional Consumer'); await h.openPacket('caseA', true);
  h.evaluate('state.notice = "Packet approved. Download it.";');
  assert.match(h.panel.querySelector('#packet-block').innerHTML, /Your packet is approved.*id="packet-ready-status"/s);
  h.node('packet-wording').value = 'Unsaved words after approval'; h.node('packet-wording').oninput();
  for (const id of ['consumer-notice', 'packet-approved-status', 'packet-ready-status']) {
    assert.equal(h.node(id).hidden, true, 'an unsaved edit hides the stale ' + id + ' message');
  }
  assert.equal(h.evaluate('state.notice'), null, 'the old approval notice cannot return on the next render');
  assert.match(h.node('packet-preview-status').textContent, /Save and review/);
  assert.equal(h.node('packet-download').disabled, true); assert.equal(h.node('packet-print').disabled, true);
  assert.equal(h.calls.filter(row => row.method === 'POST').length, 0, 'wording changes do not silently save or approve');
}
async function completeLetterEditAndReset() {
  const view = packetView(true), h = harness(request => request.url.endsWith('/packet') ? { view } : { view, requirements, missing: [] });
  h.account('A', 'Fictional Consumer'); await h.openPacket('caseA', true);
  assert.match(h.panel.querySelector('#packet-block').innerHTML, /id="packet-letter"/);
  assert.match(h.panel.querySelector('#packet-block').innerHTML, /iframe title="Your complete dispute packet"/);
  assert.match(h.panel.querySelector('#packet-block').innerHTML, /id="packet-preview" hidden/);
  h.node('packet-letter').value = 'My full edited letter.\nPlease check my dates.'; h.node('packet-letter').oninput();
  h.node('packet-bureau-reference').value = 'BUREAU-ACCOUNT-123';
  assert.equal(h.node('packet-download').disabled, true); assert.equal(h.node('packet-print').disabled, true);
  assert.equal(h.node('packet-approve').disabled, true); assert.equal(h.node('packet-pdf-review').hidden, true);
  h.node('packet-preview-reviewed').checked = true; await h.node('packet-approve').onclick();
  assert.equal(h.calls.filter(row => row.url.endsWith('/approve')).length, 0, 'approval cannot silently save an edited full letter');
  await h.node('packet-save').onclick();
  assert.deepEqual(h.calls.find(row => row.url.endsWith('/letter')).body, { letter_text: 'My full edited letter.\nPlease check my dates.' });
  assert.equal(h.calls.find(row => row.url.endsWith('/correspondence')).body.correspondence.bureau_reference, 'BUREAU-ACCOUNT-123');
  await h.openPacket('caseA'); await h.node('packet-reset-letter').onclick(); await h.node('packet-save').onclick();
  assert.deepEqual(h.calls.filter(row => row.url.endsWith('/letter')).at(-1).body, { letter_text: null }, 'prepared letter reset is an explicit saved action');
}
async function fullLetterSaveContextRace() {
  const selected = deferred(), h = harness(request => request.url.endsWith('/packet/select') ? selected.promise : { view: packetView() });
  h.account('A', 'Fictional Consumer'); await h.openPacket('caseA');
  h.node('packet-letter').value = 'Case A private letter'; h.node('packet-letter').oninput();
  const save = h.node('packet-save').onclick(); await until(() => h.calls.some(row => row.url.endsWith('/select')), 'full letter selection save');
  await h.node('signout').onclick(); h.account('B', 'Fictional B'); selected.resolve({ view: packetView() }); await save;
  assert.equal(h.calls.filter(row => row.url.endsWith('/letter')).length, 0, 'a delayed save cannot write A letter after account change');
}
async function incompletePacketCannotApprove() {
  const view = packetView(); view.packet.preview_ready = false;
  const h = harness(() => ({ view })); h.account('A', 'Fictional Consumer'); await h.openPacket('caseA');
  assert.ok(!/iframe title=/.test(h.panel.querySelector('#packet-block').innerHTML), 'an incomplete packet has no stale complete PDF preview');
  h.node('packet-preview-reviewed').checked = true; await h.node('packet-preview-reviewed').onchange();
  assert.equal(h.node('packet-approve').disabled, true); await h.node('packet-approve').onclick();
  assert.equal(h.calls.filter(row => row.url.endsWith('/approve')).length, 0, 'letter text alone never permits approval of missing attachments');
}
async function printedMaskedReference() {
  const h = harness(() => ({ ok: true }));
  h.context.facts = [
    { source_field: 'account.masked_identifier', raw_value: '****1234', normalized_value: 'MASK-1234' },
    { source_field: 'Earlier report 2025-06-12: Masked account number', raw_value: '****5678', normalized_value: 'MASK-5678' },
    { source_field: 'account.first_delinquency', raw_value: '01/01/2018', normalized_value: '2018-01-01' }
  ];
  const text = h.evaluate('comparisonFactList({ source_facts: facts })');
  assert.match(text, /\*\*\*\*1234/); assert.match(text, /\*\*\*\*5678/);
  assert.ok(!/MASK-1234|MASK-5678/.test(text), 'the comparison keeps printed account references without an internal masked token');
  assert.match(text, /01\/01\/2018.*read as.*2018-01-01/, 'date normalization stays available beside the printed date');
}
async function packetDraftDocumentReturn() {
  const h = harness(request => {
    if (request.url === '/api/account/profile' || request.method === 'PUT') return { profile: { full_name: request.body?.profile?.full_name || 'Fictional Consumer' } };
    if (request.url === '/api/account/documents') return { documents: [] };
    if (request.url.endsWith('/packet')) return { view: packetView() };
    return { view: { case: { case_id: 'caseA' }, result_id: 'result-A' }, requirements, missing: [] };
  });
  h.account('A', 'Fictional Consumer'); await h.openPacket('caseA');
  h.node('packet-wording').value = 'Keep these draft words'; h.node('packet-wording').oninput();
  await h.node('packet-account-details').onclick();
  assert.equal(h.evaluate('state.step'), 0);
  const wording = h.calls.find(row => row.url.endsWith('/wording'));
  assert.equal(wording.body.wording, 'Keep these draft words', 'leaving for documents saves the visible draft first');
  h.evaluate('renderAccountDetails(document.getElementById("panel"))'); await until(() => h.evaluate('state.accountProfile !== null'), 'loaded account return details');
  h.evaluate('state.accountProfile.full_name = "Updated Consumer";'); await h.node('account-continue').onclick();
  assert.equal(h.evaluate('state.step'), 6, 'document detour returns to the same packet rather than report upload');
  assert.equal(h.evaluate('state.caseId'), 'caseA'); assert.equal(h.evaluate('state.packetReturn'), null);
  assert.equal(h.calls.find(row => row.method === 'PUT').body.profile.full_name, 'Updated Consumer', 'return saves the current contact details before refreshing the packet');
}
async function firstPacketContactDetour() {
  const view = packetView(); view.packet.selected_issue_ids = []; view.packet.selected_count = 0;
  view.packet.preview_ready = false; view.packet.correspondence_preview = ''; view.packet.report_exhibits = [];
  const h = harness(request => request.url.endsWith('/packet/reports')
    ? { status: 409, body: { ok: false, error: { code: 'PACKET_NO_SELECTION', message: 'No chosen issue' } } }
    : { view, requirements, missing: [] });
  h.issues[0].checked = false; h.account('A', 'Fictional Consumer'); await h.openPacket('caseA');
  await h.node('packet-account-details').onclick();
  assert.equal(h.evaluate('state.step'), 0, 'a first-time user can add contact details before choosing a dispute');
  assert.equal(h.calls.filter(row => row.url.endsWith('/packet/reports')).length, 0, 'empty initial selection never attempts a required report-page attachment save');
  assert.equal(h.evaluate('state.caseId'), 'caseA', 'the contact detour retains the owned case context');
}
async function packetReturnAccountIsolation() {
  const h = harness(request => ({ view: packetView(), requirements, missing: [] }));
  h.account('A', 'Fictional Consumer'); await h.openPacket('caseA'); await h.node('packet-account-details').onclick();
  h.evaluate('state.accountProfile = { full_name: "A" }; renderAccountDetails(document.getElementById("panel")); state.recoveryKey = "private-key-A";');
  await h.node('signout').onclick(); h.account('B', 'Fictional B');
  assert.equal(h.evaluate('state.packetReturn'), null, 'sign-out drops the packet return binding');
  assert.equal(h.evaluate('state.recoveryKey'), null, 'sign-out drops the one-time recovery key');
  await h.node('account-continue').onclick(); assert.equal(h.evaluate('state.step'), 1, 'B cannot return to A packet');
}
async function recoveryKeyAccountRace() {
  const late = deferred();
  const h = harness(request => request.url === '/api/account/recovery-key' ? late.promise : { ok: true });
  h.account('A', 'Fictional Consumer'); h.node('security-password').value = 'fictional-current-password';
  const action = h.node('create-recovery-key').onclick(); await until(() => h.calls.length, 'recovery rotation');
  await h.node('signout').onclick(); h.account('B', 'Fictional B');
  late.resolve({ recovery_key: 'private-key-A' }); await action;
  assert.equal(h.evaluate('state.recoveryKey'), null, 'late A recovery response must not enter B account');
  assert.ok(!h.evaluate('state.activity.join(" ")').includes('private-key-A'), 'activity never records the recovery key');
}
const createdCase = { case_id: 'newA', country: 'CA', region: 'CA-NS', selected_bureau: 'TRANSUNION' };
function intakeReply(request) {
  if (request.method === 'POST' && request.url === '/api/cases') return { case: createdCase };
  if (request.url.endsWith('/files')) return { receipt: { format_detection: { supported: true } } };
  if (request.url === '/api/cases') return { cases: [createdCase] };
  return { view: { case: createdCase, files: [{ file_id: 'reportA' }] } };
}
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
  const late = deferred(), h = harness(request => request.method === 'GET' && request.url === '/api/cases' ? late.promise : intakeReply(request));
  h.account('A', 'Fictional A'); h.jurisdiction(); const action = h.node('open').onclick();
  await until(() => h.calls.some(row => row.method === 'GET' && row.url === '/api/cases'), 'case list');
  h.evaluate('state.step = 0; renderSequence++; state.accountProfile.full_name = "Edited contact";');
  h.context.renderCalls = []; h.evaluate('render = () => { renderSequence++; renderCalls.push(state.step); };');
  late.resolve({ cases: [createdCase] }); await action;
  assert.equal(h.evaluate('state.step'), 0, 'late case list must keep the consumer on Account');
  assert.equal(h.evaluate('state.accountProfile.full_name'), 'Edited contact');
  assert.equal(h.evaluate('state.caseId'), null);
  assert.equal(h.calls.filter(row => row.url.endsWith('/evaluate')).length, 0, 'cancelled list must not start assessment');
  assert.equal(h.context.renderCalls.length, 0, 'cancelled action must not reset current file controls or edits');
}
async function createCaseViewNavigationRace() {
  const late = deferred(), h = harness(request => request.url === '/api/cases/newA' ? late.promise : intakeReply(request));
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
  const h = harness(intakeReply);
  h.account('A', 'Fictional A'); h.jurisdiction(); await h.node('open').onclick();
  assert.equal(h.evaluate('state.step'), 3); assert.equal(h.evaluate('state.caseId'), 'newA');
  assert.equal(h.calls[0].body.bureau, 'TRANSUNION', 'normal selected bureau still reaches creation');
  assert.equal(h.evaluate('state.view.case.selected_bureau'), 'TRANSUNION');
  assert.equal(h.calls.filter(row => row.url.endsWith('/files')).length, 1, 'Step2 uploads its captured report');
  assert.equal(h.calls.filter(row => row.url.endsWith('/evaluate')).length, 1, 'successful Step2 upload runs the existing assessment');
}
async function existingCaseNormalCompletion() {
  const h = harness(() => ({ view: { case: { case_id: 'existingA' } } }));
  h.account('A', 'Fictional A'); h.jurisdiction(); await h.caseButtons[0].onclick();
  assert.equal(h.evaluate('state.step'), 2); assert.equal(h.evaluate('state.caseId'), 'existingA');
}
async function latestCaseChoiceWins() {
  const first = deferred(), second = deferred(), h = harness(request => request.url === '/api/cases/existingA' ? first.promise : second.promise);
  h.account('A', 'Fictional A'); h.jurisdiction();
  const openA = h.caseButtons[0].onclick(); await until(() => h.calls.some(row => row.url === '/api/cases/existingA'), 'first case choice');
  const openB = h.caseButtons[1].onclick(); await until(() => h.calls.some(row => row.url === '/api/cases/existingB'), 'latest case choice');
  first.resolve({ view: { case: { case_id: 'existingA' } } }); await openA;
  assert.equal(h.evaluate('state.caseId'), null, 'older response must wait for the latest selected case');
  second.resolve({ view: { case: { case_id: 'existingB' } } }); await openB;
  assert.equal(h.evaluate('state.caseId'), 'existingB'); assert.equal(h.evaluate('state.step'), 2);
}
async function invalidIntakeNoCase() {
  for (const input of ['missing-country', 'missing-region', 'missing-bureau', 'missing-file', 'bad-type', 'oversized', 'too-many']) {
    const h = harness(intakeReply); h.account('A', 'Fictional A'); h.jurisdiction();
    if (input.startsWith('missing-') && input !== 'missing-file') h.node(input.replace('missing-', '')).value = '';
    if (input === 'missing-file') h.node('file').files = [];
    if (input === 'bad-type') h.node('file').files[0].name = 'report.heic';
    if (input === 'oversized') h.node('file').files[0].size = 10485761;
    if (input === 'too-many') h.node('file').files = Array.from({ length: 9 }, () => ({ name: 'page.png', size: 20 }));
    await h.node('open').onclick();
    assert.equal(h.calls.filter(row => row.url === '/api/cases').length, 0, input + ' must not create an empty case');
    assert.ok(h.evaluate('state.error'), input + ' gives an actionable message');
  }
}
async function selectionKeepsFile() {
  const h = harness(intakeReply); h.account('A', 'Fictional A'); h.jurisdiction();
  const file = h.node('file').files[0];
  h.node('country').onchange(); h.node('region').value = 'CA-NS'; h.node('region').onchange();
  h.node('bureau').value = 'TRANSUNION'; h.node('bureau').onchange();
  assert.equal(h.node('file').files[0], file, 'dependent country/region/bureau choices preserve the selected report');
  assert.equal(h.node('open').disabled, false);
}
async function reportReadAccountRace() {
  const h = harness(intakeReply, { autoRead: false }); h.account('A', 'Fictional A'); h.jurisdiction();
  const action = h.node('open').onclick(); await until(() => h.readers.length, 'report FileReader');
  await h.node('signout').onclick(); h.account('B', 'Fictional B');
  h.readers[0].finish(); await action;
  assert.equal(h.calls.filter(row => row.url.endsWith('/files')).length, 0, 'A report bytes must not be sent in B session');
  assert.equal(h.evaluate('state.step'), 0);
}
async function reportReadSelectionRace() {
  const h = harness(intakeReply, { autoRead: false }); h.account('A', 'Fictional A'); h.jurisdiction();
  const action = h.node('open').onclick(); await until(() => h.readers.length, 'report FileReader');
  h.node('bureau').value = 'EQUIFAX'; h.node('bureau').onchange(); h.readers[0].finish(); await action;
  assert.equal(h.calls.filter(row => row.url.endsWith('/files')).length, 0, 'changed selection cancels old report attachment');
  assert.equal(h.evaluate('state.step'), 1); assert.equal(h.node('file').files[0].name, 'fictional-report.pdf');
}
async function partialRetryOnlyPending() {
  let failed = false;
  const h = harness(request => {
    if (request.url.endsWith('/files') && request.body.originalFilename === 'second.pdf' && !failed) { failed = true; throw new Error('Response lost'); }
    return intakeReply(request);
  });
  h.account('A', 'Fictional A'); h.jurisdiction(); h.node('file').files.push({ name: 'second.pdf', size: 48, type: 'application/pdf' });
  await h.node('open').onclick();
  assert.equal(h.evaluate('state.step'), 2, 'partial upload offers recovery on the report screen');
  assert.ok(/1 still pending/.test(h.evaluate('state.notice')));
  assert.equal(h.calls.filter(row => row.url.endsWith('/evaluate')).length, 0, 'partial batch is not described as a completed review');
  h.evaluate('renderReport(document.getElementById("panel"));'); await h.node('retry-upload').onclick();
  const posts = h.calls.filter(row => row.url.endsWith('/files'));
  assert.deepEqual(posts.map(row => row.body.originalFilename), ['fictional-report.pdf', 'second.pdf', 'second.pdf']);
  assert.equal(posts[1].body.uploadKey, posts[2].body.uploadKey, 'retry retains original idempotency key');
  assert.ok(/2 files uploaded/.test(h.evaluate('state.notice')));
}
async function evaluateAccountRace() {
  const late = deferred(), h = harness(request => request.url.endsWith('/evaluate') ? late.promise : intakeReply(request));
  h.account('A', 'Fictional A'); h.evaluate('state.caseId = "newA"; state.step = 2;');
  const action = h.evaluate('run(() => checkReport())'); await until(() => h.calls.some(row => row.url.endsWith('/evaluate')), 'assessment');
  await h.node('signout').onclick(); h.account('B', 'Fictional B'); h.evaluate('state.caseId = "caseB";');
  late.resolve({ ok: true }); await action;
  assert.equal(h.calls.filter(row => row.method === 'GET' && row.url.startsWith('/api/cases')).length, 0, 'old assessment must not fetch either account case after account changes');
  assert.equal(h.evaluate('state.step'), 0); assert.equal(h.evaluate('state.caseId'), 'caseB');
}
async function completedCaseNormalCompletion() {
  const h = harness(() => ({ view: { case: { case_id: 'existingA' }, assessment_summary: { distinct_total: 1 } } }));
  h.account('A', 'Fictional A'); h.jurisdiction(); await h.caseButtons[0].onclick();
  assert.equal(h.evaluate('state.step'), 3, 'completed report opens existing results');
}
async function savedReportErrorNavigationRace() {
  for (const button of ['refresh', 'continue']) {
    const late = deferred(), h = harness(() => late.promise);
    h.account('A', 'Fictional A'); h.jurisdiction();
    const action = button === 'refresh' ? h.node('refresh').onclick() : h.caseButtons[0].onclick();
    await until(() => h.calls.length, 'saved report request');
    h.evaluate('state.step = 0; renderSequence++;');
    h.context.renderCalls = []; h.evaluate('render = () => renderCalls.push(state.step);');
    late.resolve({ status: 503, body: { ok: false, error: { message: 'Old report response failed' } } }); await action;
    assert.equal(h.evaluate('state.error'), null, 'stale ' + button + ' error must not appear on Account');
    assert.equal(h.context.renderCalls.length, 0, 'stale ' + button + ' error must not reset current controls');
  }
}
async function assessmentNavigationReturn() {
  const late = deferred(), h = harness(request => request.url.endsWith('/evaluate') ? late.promise :
    { view: { case: createdCase, files: [], assessment_summary: { distinct_total: 1 } } });
  h.account('A', 'Fictional A');
  h.evaluate('state.caseId = "newA"; state.view = { case: ' + JSON.stringify(createdCase) + ', files: [{ file_id: "reportA" }] }; state.step = 2;');
  const action = h.evaluate('run(() => checkReport())'); await until(() => h.calls.length, 'assessment request');
  h.evaluate('state.step = 0; renderSequence++; state.step = 2; renderSequence++; renderReport(document.getElementById("panel"));');
  assert.match(h.panel.innerHTML, /id="refresh-report"/, 'returning during assessment has a usable refresh action');
  h.node('file').files = [{ name: 'selected-next-report.pdf' }];
  h.context.renderCalls = []; h.evaluate('render = () => renderCalls.push(state.step);');
  late.resolve({ ok: true }); await action;
  assert.equal(h.context.renderCalls.length, 0, 'old assessment completion preserves the selected file on return');
  assert.equal(h.node('file').files[0].name, 'selected-next-report.pdf');
  await h.node('refresh-report').onclick();
  assert.equal(h.evaluate('state.step'), 3, 'refresh opens the completed results for that same owned report');
  assert.equal(h.calls.filter(row => row.url === '/api/cases/newA').length, 1);
}
const returnCaseId = 'case_' + 'a'.repeat(24);
function checkoutView(paid) {
  return { case: { case_id: returnCaseId, country: 'CA', region: 'CA-NS' }, result_id: 'same-result',
    result: { support: 'REPORT_SUPPORT', issues: [{ eligible: true, issue_id: 'issue-A', consumer_label: 'VIOLATION' }] },
    assessment_summary: { distinct_total: 1 }, assessment_access: { complete_assessment: paid, dispute_packet: paid } };
}
async function checkoutKeepsOwnOriginAndReport() {
  const h = harness(() => ({ checkout: { redirect_url: 'https://checkout.stripe.com/fictional' } }));
  h.account('A', 'Fictional A'); h.context.location.origin = 'https://app.example.test';
  h.context.location.search = '?redirect=https://foreign.example'; h.context.returnCaseId = returnCaseId;
  h.evaluate('state.caseId = returnCaseId; state.view = { case: { case_id: returnCaseId } }; state.step = 3;');
  await h.evaluate('startCheckout("monthly")');
  const post = h.calls.find(row => row.url === '/api/billing/checkout'), url = new URL(post.body.return_url);
  assert.equal(url.origin, 'https://app.example.test'); assert.equal(url.pathname, '/');
  assert.equal(url.searchParams.get('report'), returnCaseId); assert.equal(url.searchParams.get('plan'), 'monthly');
  assert.ok(!url.href.includes('foreign.example'), 'an input redirect URL is never used for checkout return');
}
async function checkoutPaidOwnedReturn() {
  const h = harness(request => request.url.startsWith('/api/cases/') ? { view: checkoutView(true) } : { entitlement: { entitled: true } });
  h.account('A', 'Fictional A'); h.context.returnCaseId = returnCaseId;
  h.context.location.search = '?checkout=return&report=' + returnCaseId + '&plan=monthly';
  await h.evaluate('restoreCheckoutReport(checkoutReturnContext())');
  assert.equal(h.evaluate('state.caseId'), returnCaseId); assert.equal(h.evaluate('state.step'), 3);
  assert.equal(h.evaluate('state.view.result_id'), 'same-result', 'checkout reopens the existing result, without another upload or assessment');
  assert.equal(h.evaluate('state.checkoutReturn'), null);
  h.evaluate('renderResults(document.getElementById("panel"));');
  assert.match(h.panel.innerHTML, /Create my dispute packet/);
  assert.ok(h.calls.every(row => row.method === 'GET'), 'restoring checkout performs only protected reads');
}
async function checkoutPendingPaymentRefresh() {
  let paid = false;
  const h = harness(request => request.url.startsWith('/api/cases/') ? { view: checkoutView(paid) } : { entitlement: { entitled: paid } });
  h.account('A', 'Fictional A'); h.context.returnCaseId = returnCaseId;
  h.context.location.search = '?checkout=return&report=' + returnCaseId + '&plan=monthly?checkout=success&payment=paid';
  await h.evaluate('restoreCheckoutReport(checkoutReturnContext())');
  assert.equal(h.evaluate('state.checkoutReturn.status'), 'pending', 'even synthetic paid/success flags cannot grant access');
  assert.equal(h.evaluate('state.entitlement.entitled'), false); assert.equal(h.evaluate('state.view.assessment_access.dispute_packet'), false);
  h.evaluate('renderResults(document.getElementById("panel")); wireCheckoutReturn();');
  assert.match(h.panel.innerHTML, /Check payment/); assert.ok(!/id="buy-|Create my dispute packet/.test(h.panel.innerHTML), 'pending payment offers refresh instead of a second purchase');
  h.evaluate('renderBillingView({ plan_catalog: { plans: [{ plan_code: "monthly", amount_display: "$7.95 CAD", interval: "month" }] } });');
  assert.ok(!/id="checkout-/.test(h.node('billingView').innerHTML), 'Billing also directs the pending consumer to Check payment rather than another checkout');
  await h.evaluate('startCheckout("monthly")'); assert.equal(h.calls.filter(row => row.method === 'POST').length, 0);
  paid = true; await h.node('checkout-return-retry').onclick();
  assert.equal(h.evaluate('state.checkoutReturn'), null); assert.equal(h.evaluate('state.view.assessment_access.dispute_packet'), true);
  assert.equal(h.calls.filter(row => row.url === '/api/cases/' + returnCaseId).length, 2, 'payment refresh re-reads the same protected report');
}
async function checkoutForeignCaseRefusal() {
  const h = harness(request => request.url.startsWith('/api/cases/') ? { status: 403, body: { ok: false, error: { message: 'Foreign report denied' } } } : { entitlement: { entitled: false } });
  h.account('B', 'Fictional B'); h.context.returnCaseId = returnCaseId;
  h.context.location.search = '?checkout=return&report=' + returnCaseId + '&plan=monthly&payment=paid';
  await h.evaluate('restoreCheckoutReport(checkoutReturnContext())');
  assert.equal(h.evaluate('state.view'), null); assert.equal(h.evaluate('state.caseId'), null); assert.equal(h.evaluate('state.step'), 1);
  assert.equal(h.evaluate('state.checkoutReturn.status'), 'failed'); assert.ok(h.evaluate('notices()').includes('could not open your saved report'));
  h.context.location.search = '?checkout=return&report=' + encodeURIComponent(returnCaseId + '/private') + '&plan=monthly';
  assert.equal(h.evaluate('checkoutReturnContext()'), null, 'malformed URL case paths are never restored');
}
async function checkoutCancellationDoesNotGrantAccess() {
  let paid = false;
  const h = harness(request => request.url.startsWith('/api/cases/') ? { view: checkoutView(paid) } : { entitlement: { entitled: paid } });
  h.account('A', 'Fictional A'); h.context.location.search = '?checkout=return&report=' + returnCaseId + '&plan=monthly&checkout_cancelled=1&payment=paid';
  await h.evaluate('restoreCheckoutReport(checkoutReturnContext())');
  assert.equal(h.evaluate('state.view.assessment_access.dispute_packet'), false); assert.equal(h.evaluate('state.entitlement.entitled'), false);
  assert.equal(h.evaluate('state.checkoutReturn'), null, 'a cancellation can return to choices without leaving an endless confirmation prompt');
  h.evaluate('renderResults(document.getElementById("panel"));');
  assert.match(h.panel.innerHTML, /Checkout cancelled/); assert.match(h.panel.innerHTML, /id="buy-monthly"/);
  assert.ok(!/Create my dispute packet/.test(h.panel.innerHTML), 'a forged cancellation hint cannot confer paid access');
  paid = true; await h.evaluate('restoreCheckoutReport(checkoutReturnContext())');
  assert.equal(h.evaluate('state.view.assessment_access.dispute_packet'), true);
  assert.ok(!h.evaluate('state.notice').includes('cancelled'), 'server-confirmed access wins over a cancellation hint');
}
async function checkoutReturnAccountRace() {
  const late = deferred(), h = harness(request => request.url.startsWith('/api/cases/') ? late.promise : { entitlement: { entitled: true } });
  h.account('A', 'Fictional A'); h.context.returnCaseId = returnCaseId;
  const action = h.evaluate('run(() => restoreCheckoutReport({ caseId: returnCaseId, planCode: "monthly" }))');
  await until(() => h.calls.some(row => row.url.startsWith('/api/cases/')), 'checkout report read');
  await h.node('signout').onclick(); h.account('B', 'Fictional B');
  late.resolve({ view: checkoutView(true) }); await action;
  assert.equal(h.evaluate('state.account.account_id'), 'B'); assert.equal(h.evaluate('state.view'), null); assert.equal(h.evaluate('state.caseId'), null);
  assert.equal(h.evaluate('state.checkoutReturn'), null, 'a late checkout response cannot enter a different account');
}
async function packetLoadFailureRetry() {
  let fail = true;
  const h = harness(() => fail ? { status: 503, body: { ok: false, error: { message: 'Temporary failure' } } } : { view: packetView(true) });
  h.account('A', 'Fictional A'); await h.openPacket('caseA');
  const failed = h.panel.querySelector('#packet-block').innerHTML;
  assert.match(failed, /could not load your packet/); assert.ok(!/No issue.*eligible/.test(failed), 'a load failure cannot misstate issue eligibility');
  fail = false; await h.node('packet-retry').onclick();
  assert.match(h.panel.querySelector('#packet-block').innerHTML, /Full saved letter/);
  assert.match(h.panel.querySelector('#packet-block').innerHTML, /Saved wording/);
  assert.equal(h.calls.filter(row => row.url === '/api/cases/caseA/packet').length, 2); assert.ok(h.calls.every(row => row.method === 'GET'), 'retry does not change the saved packet');
  fail = true; await h.openPacket('caseA'); const retry = h.node('packet-retry').onclick;
  await h.node('signout').onclick(); h.account('B', 'Fictional B'); const before = h.calls.length; await retry();
  assert.equal(h.calls.length, before, 'a previous account retry cannot read through a new session');
}
function originalReports() {
  return [
    { file_id: 'earlier-copy', roles: ['EARLIER'], label: 'Earlier report — 2025-06-12', original_filename: 'earlier-report.pdf', content_type: 'application/pdf', page_count: 12, relevant_pages: [4], scope: 'RELEVANT_PAGES', selected: true, review_url: '/api/cases/caseA/packet/reports/earlier-copy' },
    { file_id: 'current-copy', roles: ['CURRENT'], label: 'Current report — 2026-06-12', original_filename: 'current-report.pdf', content_type: 'application/pdf', page_count: 8, relevant_pages: [2, 3], scope: 'RELEVANT_PAGES', selected: true, review_url: '/api/cases/caseA/packet/reports/current-copy' }
  ];
}
function reportCheckbox(fileId, checked) { return { checked, onchange: null, getAttribute: key => key === 'data-packet-report' ? fileId : null }; }
async function reportCopyLabelsAndDefaults() {
  const h = harness(() => ({ ok: true }));
  h.account('A', 'Fictional Consumer'); h.evaluate('state.caseId = "caseA";');
  h.context.reports = { ...packetView(), packet: { ...packetView().packet, report_exhibits: originalReports(), report_attachment_manifest: [] } };
  const text = h.evaluate('renderPacketBlock(reports)');
  assert.match(text, /Earlier report — June 12, 2025/); assert.match(text, /Current report — June 12, 2026/);
  assert.match(text, /Included: report page 4/); assert.match(text, /Included: report pages 2, 3/);
  assert.match(text, /pages about your chosen disputes are included in your packet/);
  assert.match(text, /href="\/api\/cases\/caseA\/packet\/reports\/earlier-copy"/);
  assert.equal((text.match(/Check the original report/g) || []).length, 2);
  assert.equal((text.match(/type="checkbox" hidden checked data-packet-report=/g) || []).length, 2, 'relevant pages are included automatically');
  assert.ok(!/RELEVANT_PAGES|stored_sha256|source_result_id|download includes the whole report/.test(text), 'consumer labels hide internal scope tokens and whole-file assembly instructions');
  h.context.reports.packet.report_exhibits = [];
  const empty = h.evaluate('renderPacketBlock(reports)');
  assert.ok(!/data-packet-report=/.test(empty), 'empty exhibit lists add no broken original-report controls');
  h.context.reports.packet.report_exhibits = [{ ...originalReports()[0], relevant_pages: [] }];
  assert.match(h.evaluate('renderPacketBlock(reports)'), /Pages to include \(for example, 2, 3\)/, 'unknown multipage locations give a simple page-number input');
}
async function explicitReportSelectionAndReview() {
  const view = packetView(true); view.packet.report_exhibits = originalReports(); view.packet.report_attachment_manifest = [];
  const h = harness(request => {
    if (request.url.endsWith('/packet/select')) return { view };
    if (request.url.endsWith('/packet/reports')) {
      for (const report of view.packet.report_exhibits) report.selected = request.body.file_ids.includes(report.file_id);
      view.packet.report_attachment_manifest = view.packet.report_exhibits.filter(report => report.selected);
      view.packet.approved = false; view.packet.download_available = false; view.packet.preview_version = 'with-current-copy';
      view.packet.correspondence_preview = 'Full saved letter\nPlease see report pages 2, 3.';
    }
    return request.url.endsWith('/packet') ? { view } : { view: { case: { case_id: 'caseA' }, result_id: 'result-A' }, requirements, missing: [] };
  });
  h.reportChecks.push(reportCheckbox('earlier-copy', true), reportCheckbox('current-copy', true));
  h.account('A', 'Fictional Consumer'); await h.openPacket('caseA', true);
  assert.equal(h.calls.filter(row => row.method === 'POST').length, 0, 'opening the review never changes report custody');
  await h.node('packet-save').onclick();
  const reportWrite = h.calls.find(row => row.url.endsWith('/packet/reports'));
  assert.deepEqual(reportWrite.body, { file_ids: ['earlier-copy', 'current-copy'], page_choices: {} }, 'Save preserves the automatically included relevant reports');
  assert.equal(h.calls.filter(row => row.url.endsWith('/packet/reports')).length, 1);
  await h.openPacket('caseA');
  assert.match(h.panel.querySelector('#packet-block').innerHTML, /Included: report pages 2, 3/);
  assert.match(h.panel.querySelector('#packet-block').innerHTML, /hidden checked data-packet-report="current-copy"/);
  assert.match(h.panel.querySelector('#packet-block').innerHTML, /hidden checked data-packet-report="earlier-copy"/);
  h.node('packet-preview-reviewed').checked = true; h.node('packet-preview-reviewed').onchange(); await h.node('packet-approve').onclick();
  assert.equal(h.calls.find(row => row.url.endsWith('/approve')).body.reviewed_version, 'with-current-copy', 'approval binds the saved preview containing the selected report copy');
}
async function removedIssueDropsExclusiveReport() {
  const view = packetView(true); view.packet.report_exhibits = originalReports().map(report => ({ ...report, selected: true }));
  view.eligible_issues.push({ eligible: true, issue_id: 'issue-B', consumer_label: 'VIOLATION' });
  const allowed = { ...view, packet: { ...view.packet, report_exhibits: [view.packet.report_exhibits[1]] } };
  const h = harness(request => request.url.endsWith('/packet/select') ? { view: allowed } : request.url.endsWith('/packet') ? { view } : { requirements, missing: [], view: { case: { case_id: 'caseA' } } });
  h.reportChecks.push(reportCheckbox('earlier-copy', true), reportCheckbox('current-copy', true));
  h.pageInputs.push(...[['earlier-copy', '4'], ['current-copy', '2, 3']].map(([id, value]) => ({ value,
    getAttribute: key => key === 'data-packet-pages' ? id : null })));
  h.issues.push({ checked: true, getAttribute: key => key === 'data-check-issue' ? 'issue-B' : null });
  h.account('A', 'Fictional Consumer'); await h.openPacket('caseA', true);
  h.issues[0].checked = false; await h.issues[0].onchange(); await h.node('packet-save').onclick();
  assert.deepEqual(h.calls.find(row => row.url.endsWith('/packet/select')).body.issue_ids, ['issue-B']);
  assert.deepEqual(h.calls.find(row => row.url.endsWith('/packet/reports')).body.file_ids, ['current-copy'], 'removing an issue drops its exclusive earlier copy and preserves the still-relevant current source');
  assert.deepEqual(h.calls.find(row => row.url.endsWith('/packet/reports')).body.page_choices, { 'current-copy': [2, 3] }, 'removing an issue also drops its exclusive old page-picker values before saving');
}
async function changedReportChoiceStopsPendingSave() {
  const selected = deferred(), view = packetView(true); view.packet.report_exhibits = originalReports();
  const h = harness(request => request.url.endsWith('/packet/select') ? selected.promise : request.url.endsWith('/packet') ? { view } : { ok: true });
  const pages = { value: '2', getAttribute: key => key === 'data-packet-pages' ? 'current-copy' : null };
  h.pageInputs.push(pages); h.reportChecks.push(reportCheckbox('current-copy', true)); h.account('A', 'Fictional Consumer'); await h.openPacket('caseA', true);
  const save = h.node('packet-save').onclick(); await until(() => h.calls.some(row => row.url.endsWith('/select')), 'report choice save');
  pages.value = '3'; pages.oninput(); selected.resolve({ view }); await save;
  assert.equal(h.calls.filter(row => row.url.endsWith('/packet/reports')).length, 0, 'a changed page-number choice stops the old pending attachment save');
  assert.equal(h.node('packet-download').disabled, true); assert.equal(h.node('packet-print').disabled, true);
}
async function changedStoredReportRecovery() {
  const h = harness(() => ({ status: 409, body: { ok: false, error: { code: 'PACKET_APPROVAL_STALE', message: 'Changed source copy' } } }));
  h.account('A', 'Fictional Consumer'); await h.openPacket('caseA');
  assert.match(h.panel.querySelector('#packet-block').innerHTML, /Your report copy has changed.*Upload your report again/s);
  assert.ok(!/id="packet-retry"|id="packet-download"|id="packet-print"/.test(h.panel.querySelector('#packet-block').innerHTML), 'changed stored copies offer explicit recovery instead of stale download or a repeated generic retry');
  assert.equal(h.calls.filter(row => row.method === 'POST').length, 0, 'a refused load never silently changes source custody');
  const uploadAgain = h.node('packet-reports-review').onclick;
  await uploadAgain();
  assert.equal(h.evaluate('state.step'), 1, 'the recovery action returns to the ordinary report upload step');
  assert.equal(h.calls.filter(row => row.method === 'POST').length, 0, 'upload-again navigation never discards or bypasses required source pages');
  await h.node('signout').onclick(); h.account('B', 'Fictional B'); const before = h.calls.length; await uploadAgain();
  assert.equal(h.calls.length, before, 'a previous account recovery action cannot read or write under another account');
  assert.equal(h.evaluate('state.step'), 0, 'a previous account handler cannot navigate a different account to upload');
}
const tests = { saveAccountRace, uploadListRace, uploadReadRace, packetContextRace, wirePacketRace, issueSelectionInvalidation,
  currentPreviewApproval, dirtyPreviewStatus, completeLetterEditAndReset, fullLetterSaveContextRace, incompletePacketCannotApprove, printedMaskedReference, packetDraftDocumentReturn, firstPacketContactDetour, packetReturnAccountIsolation, recoveryKeyAccountRace,
  createCaseAccountRace, createCaseListNavigationRace, createCaseViewNavigationRace, existingCaseAccountRace, caseRefreshAccountRace,
  createCaseNormalCompletion, existingCaseNormalCompletion, latestCaseChoiceWins, invalidIntakeNoCase, selectionKeepsFile,
  reportReadAccountRace, reportReadSelectionRace, partialRetryOnlyPending, evaluateAccountRace, completedCaseNormalCompletion,
  savedReportErrorNavigationRace, assessmentNavigationReturn, checkoutKeepsOwnOriginAndReport, checkoutPaidOwnedReturn,
  checkoutPendingPaymentRefresh, checkoutForeignCaseRefusal, checkoutCancellationDoesNotGrantAccess, checkoutReturnAccountRace, packetLoadFailureRetry,
  reportCopyLabelsAndDefaults, explicitReportSelectionAndReview, removedIssueDropsExclusiveReport, changedReportChoiceStopsPendingSave, changedStoredReportRecovery };
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
