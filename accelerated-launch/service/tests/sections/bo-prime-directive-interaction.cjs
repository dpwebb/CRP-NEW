'use strict';
const { comparableText } = require('../packet-pdf-assertions.cjs');
/**
 * bo-prime-directive-interaction.cjs — OWNER-POTENTIAL-ISSUE-001 / Batch 1 interaction coverage against the
 * ACTUAL TestService. It drives the real `ui/app.js` handlers (select an issue, save selection + wording,
 * approve, download) with a node:vm DOM whose fetch forwards to the real HTTP listener. This is service
 * integration, NOT a real browser (no layout/CSS/engine). Unsaved edits require a new saved full preview before
 * approval; approval never silently saves wording the consumer has not read in the packet.
 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { buildPdf } = require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');

const UI_JS = path.join(__dirname, '..', '..', 'ui', 'app.js');

function makeElement(id) {
  const children = new Map();
  const el = {
    id, innerHTML: '', textContent: '', className: '', value: '', checked: false, disabled: false,
    style: {}, dataset: {}, files: [], onclick: null, onchange: null,
    scrollIntoView() {},
    __queryResults: [],
    querySelectorAll: (selector) => selector.startsWith('[data-check-issue]') ? el.__queryResults : [],
    querySelector: (sel) => { if (!children.has(sel)) children.set(sel, makeElement(sel)); return children.get(sel); },
    getAttribute: (n) => (el.dataset && el.dataset[n]) || null
  };
  return el;
}

function makeContext(baseUrl, token) {
  const nodes = new Map();
  const calls = [];
  const elementById = (id) => { if (!nodes.has(id)) nodes.set(id, makeElement(id)); return nodes.get(id); };
  const context = {
    console, setTimeout, clearTimeout, JSON, Object, Array, Map, Set, Promise, Number, String, Date, Error, RegExp,
    crypto: { randomUUID: () => 'bo-uuid' },
    fetch: async (url, options) => {
      const method = (options && options.method) || 'GET';
      const target = url.startsWith('http') ? url : (baseUrl + url);
      const headers = Object.assign({}, options && options.headers, { Authorization: `Bearer ${token}` });
      const body = options && options.body;
      calls.push(`${method} ${url}`);
      const res = await globalThis.fetch(target, { method, headers, body });
      const text = await res.text();
      let json = null;
      try { json = JSON.parse(text); } catch { json = {}; }
      return { ok: res.status < 400, status: res.status, json: async () => json, text: async () => text };
    },
    document: { getElementById: elementById, createElement: makeElement },
    URL: { createObjectURL: () => 'blob:stub', revokeObjectURL: () => {} },
    Blob: class Blob {},
    FileReader: class FileReader { readAsDataURL() { this.result = 'data:application/pdf;base64,x'; this.onload(); } }
  };
  context.window = context;
  context.window.location = { assign: (u) => calls.push(`NAVIGATE ${u}`) };
  context.globalThis = context;
  vm.createContext(context);
  return { context, nodes, calls, elementById };
}

function tick(ms) { return new Promise((r) => setTimeout(r, ms || 0)); }

async function waitFor(fn, timeout) {
  const start = Date.now();
  while (Date.now() - start < (timeout || 3000)) {
    if (fn()) return;
    await tick(20);
  }
  throw new Error('timed out waiting for condition');
}

async function payReportOnce(service, actor, caseId) {
  const checkout = await service.request('POST', '/api/billing/checkout', {
    token: actor.token, body: { plan_code: 'monthly' }
  });
  const c = checkout.json.checkout;
  const event = {
    id: `test_evt_${crypto.randomBytes(8).toString('hex')}`,
    type: 'checkout.session.completed',
    account_reference: actor.account_id,
    plan_code: c.plan.plan_code,
    session_reference: c.provider_reference,
    amount_cents: c.plan.amount_cents,
    currency: c.plan.currency,
    occurred_at: new Date().toISOString()
  };
  await service.postEvent(event);
}

const uploadBody = (bytes, filename) => ({
  originalFilename: filename,
  declaredBytes: bytes.length,
  mimeType: 'application/pdf',
  contentBase64: bytes.toString('base64')
});

const LINES = [
  'Equifax  Consumer Credit Report',
  'Report Date: June 12, 2026',
  'Creditor A  Balance $100  Opened 01/01/2020  Closed 01/01/2019',
  'Creditor B  Balance $200  Opened 01/01/2018  Closed 01/01/2020'
];

async function run(service, check) {
  const source = fs.readFileSync(UI_JS, 'utf8');
  const owner = await service.unpaidAccount('bo-inter@example.test');
  await service.request('PUT', '/api/account/profile', { token: owner.token, body: { profile: {
    full_name: 'Dana Whitfield', given_name: 'Dana', family_name: 'Whitfield', contact_email: 'dana.whitfield@example.test', date_of_birth: '1980-04-12',
    address_line1: '10 Fictional Street', city: 'Example City', region: 'CA', postal_code: '90001'
  } } });
  const supportIds = [];
  for (const [document_type, document_kind] of [['IDENTITY', 'SOCIAL_SECURITY'], ['ADDRESS', 'UTILITY_BILL']]) {
    const bytes = buildPdf({ pages: [{ lines: ['FICTIONAL SUPPORT COPY', document_kind] }] });
    const uploaded = await service.request('POST', '/api/account/documents', { token: owner.token, body: { ...uploadBody(bytes, document_kind + '.pdf'), document_type, document_kind } });
    supportIds.push(uploaded.json.document.file_id);
  }
  const c = (await service.request('POST', '/api/cases', { token: owner.token, body: { country: 'US', region: 'US-CA' } })).json.case;
  await payReportOnce(service, owner, c.case_id);
  const pdf = buildPdf({ pages: [{ lines: LINES }] });
  check.equal((await service.request('POST', `/api/cases/${c.case_id}/files`, { token: owner.token, body: uploadBody(pdf, 'contra.pdf') })).status, 201, 'the fictional report uploads');
  check.equal((await service.request('POST', `/api/cases/${c.case_id}/evaluate`, { token: owner.token })).status, 201, 'evaluation succeeds');

  const realView = (await service.request('GET', `/api/cases/${c.case_id}`, { token: owner.token })).json.view;
  const potential = (realView.result.issues || []).find((i) => i.rule_assessment
    && i.rule_assessment.classification === 'PROBABLE_VIOLATION');
  check.ok(potential, 'the real result carries the probable report-data violation');
  const issueId = potential.issue_id;

  const dom = makeContext(`http://127.0.0.1:${service.port}`, owner.token);
  const ctx = dom.context;
  ctx.__VIEW = realView;
  vm.runInContext(source, ctx, { filename: 'ui/app.js' });
  await tick(); await tick(); await tick();
  /* Wait for the asynchronous boot (jurisdictions + session + cases + entitlement) to finish before driving the
     packet step, so a late boot render cannot overwrite state.step. */
  await waitFor(() => vm.runInContext('state.step', ctx) === 1);

  vm.runInContext(`state.caseId = "${c.case_id}"; state.view = __VIEW; state.step = 6; render();`, ctx);
  await waitFor(() => dom.elementById('packet-save').onclick != null);
  const panelEl = dom.elementById('panel');
  const block = panelEl.querySelector('#packet-block');
  check.ok(/Your dispute packet/.test(block.innerHTML), 'the packet block renders against the real service');
  check.ok(/Mail your packet to:/.test(block.innerHTML), 'the packet block shows the mail destination in the consumer review');
  check.ok(/Equifax/.test(block.innerHTML), 'and shows the sourced bureau recipient');
  check.ok(/id="packet-preview" hidden/.test(block.innerHTML), 'the old text preview is hidden compatibility content');

  /* --- select the issue (checkbox) + correspondence details + wording A, then SAVE (against the real service). --- */
  const checkbox = { checked: true, getAttribute: (n) => (n === 'data-check-issue' ? issueId : null) };
  panelEl.__queryResults = [checkbox];
  dom.elementById('packet-name').value = 'Dana Whitfield';
  dom.elementById('packet-contact').value = 'dana.whitfield@example.test';
  dom.elementById('packet-reference').value = 'CRP-REF-1';
  dom.elementById('packet-bureau-reference').value = 'BUREAU-4321';
  dom.elementById('packet-bureau').value = 'EQUIFAX';
  dom.elementById('packet-purpose').value = 'ACCOUNT';
  const documentChecks = supportIds.map(id => ({ checked: true, getAttribute: name => name === 'data-packet-document' ? id : null }));
  const originalQueries = panelEl.querySelectorAll;
  panelEl.querySelectorAll = selector => selector === '[data-packet-document]:checked' ? documentChecks : originalQueries(selector);
  for (const id of supportIds) dom.elementById('packet-document-date-' + id).value = new Date().toISOString().slice(0, 10);
  dom.elementById('packet-copies-confirmed').checked = true;
  dom.elementById('packet-identity-reference').value = '000000000';
  dom.elementById('packet-wording').value = 'First wording.';
  await dom.elementById('packet-save').onclick();
  await waitFor(() => block.innerHTML.includes('First wording.'));

  /* --- an unsaved edit cannot be approved; save and read the current complete preview first. --- */
  dom.elementById('packet-wording').value = 'Changed wording (unsaved before approve).';
  dom.elementById('packet-wording').oninput();
  const earlierSave = dom.elementById('packet-save').onclick;
  await dom.elementById('packet-approve').onclick();
  check.ok(!dom.calls.some((x) => /POST .*packet\/approve/.test(x)), 'unsaved wording is not silently saved or approved');
  await waitFor(() => dom.elementById('packet-save').onclick !== earlierSave);
  dom.elementById('packet-wording').value = 'Changed wording (unsaved before approve).';
  dom.elementById('packet-wording').oninput();
  await dom.elementById('packet-save').onclick();
  await waitFor(() => block.innerHTML.includes('Changed wording (unsaved before approve).'));
  const beforeLetterEdit = (await service.request('GET', `/api/cases/${c.case_id}/packet`, { token: owner.token })).json.view;
  check.ok(/iframe title="Your complete dispute packet"/.test(block.innerHTML), 'the saved complete PDF appears inline for review');
  check.ok(/id="packet-letter"/.test(block.innerHTML), 'the consumer can edit all letter text on the review page');
  dom.elementById('packet-letter').value = beforeLetterEdit.packet.correspondence_preview.replace('Thank you for your help.', 'Thank you. Please send your reply to me.');
  dom.elementById('packet-letter').oninput();
  check.equal(dom.elementById('packet-approve').disabled, true, 'an edited full letter needs a saved fresh PDF preview');
  await dom.elementById('packet-save').onclick();
  await waitFor(() => block.innerHTML.includes('Thank you. Please send your reply to me.'));
  dom.elementById('packet-preview-reviewed').checked = true;
  dom.elementById('packet-preview-reviewed').onchange();
  await dom.elementById('packet-approve').onclick();
  if (vm.runInContext('state.error', ctx)) throw new Error('Approval failed: ' + vm.runInContext('state.error', ctx));
  await waitFor(() => block.innerHTML.includes('Your packet is approved.'));
  await waitFor(() => dom.calls.some((x) => /POST .*packet\/approve/.test(x)));
  check.ok(dom.calls.some((x) => /POST .*packet\/approve/.test(x)), 'the approve endpoint is called');
  check.ok(dom.calls.some((x) => /POST .*packet\/wording/.test(x)), 'the wording endpoint is called');
  check.ok(dom.calls.some((x) => /POST .*packet\/letter/.test(x)), 'the full letter editor saves through the protected letter endpoint');
  check.equal(vm.runInContext('state.error', ctx), null, 'no UI error during the approve');

  /* --- download: the UI navigates to the download endpoint; fetch it against the real service. --- */
  dom.elementById('packet-download').onclick();
  check.ok(dom.calls.some((x) => /NAVIGATE .*packet-download/.test(x)), 'the UI navigates to the packet download');

  const pvAfter = (await service.request('GET', `/api/cases/${c.case_id}/packet`, { token: owner.token })).json.view;
  check.equal(pvAfter.packet.approved, true, 'the packet is approved after the UI approve action');
  check.equal(pvAfter.packet.selected_count, 1, 'with one issue selected');

  const dl = await service.request('GET', `/api/cases/${c.case_id}/packet-download`, { token: owner.token });
  check.equal(dl.status, 200, 'the matching packet downloads');
  check.equal(dl.headers.get('content-type'), 'application/pdf', 'the completed packet is a single PDF');
  const completePreview = await service.request('GET', pvAfter.packet.letter_preview_url, { token: owner.token });
  check.deepEqual(dl.bytes, completePreview.bytes, 'the download is the exact complete PDF the consumer reviewed');
  check.ok(/opening date comes after the closing date/.test(comparableText(dl.text)), 'and agrees with the reviewed impossible date order');
  check.ok(comparableText(dl.text).includes('Changed wording (unsaved before approve).'), 'and carries the wording the consumer saw at approval, not the earlier saved wording');
  check.ok(!comparableText(dl.text).includes('First wording.'), 'and not the older saved wording');
  check.ok(/Re: Credit report dispute/.test(comparableText(dl.text)), 'and an organized, sendable correspondence section');
  check.ok(comparableText(dl.text).includes('Dana Whitfield') && comparableText(dl.text).includes('dana.whitfield@example.test'), 'carrying the consumer-supplied correspondence details');
  check.ok(/Please see report page 1/.test(comparableText(dl.text)), 'short report-page references sit inside the letter');
  check.ok(/opened on January 1, 2020 and closed on January 1, 2019/.test(comparableText(dl.text)), 'both source-derived dates remain understandable in the request');
  check.ok(comparableText(dl.text).includes('Thank you. Please send your reply to me.'), 'download includes the consumer full-letter edit');
  check.ok(comparableText(dl.text).includes('My bureau file or account number: BUREAU-4321'), 'the separately supplied bureau number is in the approved letter');
  check.ok(!/not legal advi/i.test(comparableText(dl.text)), 'with no legal-advice disclaimer');

  /* Editing the wording after approval disables the download (no silent older-version download while the changed
     wording remains visible). */
  await waitFor(() => typeof dom.elementById('packet-wording').oninput === 'function');
  dom.elementById('packet-wording').value = 'Another unsaved change.';
  dom.elementById('packet-wording').oninput();
  check.equal(dom.elementById('packet-download').disabled, true, 'editing wording after approval disables the download until re-approval');

  /* ---- The post-upload screen follows the case's ACTUAL state (purchased, then the recorded period ends). ---- */
  const postStore = () => service.service.store;
  const postOwner = await service.unpaidAccount('bo-post-upload@example.test');
  const postCase = (await service.request('POST', '/api/cases', { token: postOwner.token, body: { country: 'CA', region: 'CA-NS' } })).json.case;
  await payReportOnce(service, postOwner, postCase.case_id);
  const postPdf = buildPdf({ pages: [{ lines: [...LINES] }] });
  check.equal((await service.request('POST', `/api/cases/${postCase.case_id}/files`, { token: postOwner.token, body: uploadBody(postPdf, 'post-upload.pdf') })).status, 201, 'the purchased case accepts the upload');

  const post = makeContext(`http://127.0.0.1:${service.port}`, postOwner.token);
  const postCtx = post.context;
  postCtx.__VIEW = (await service.request('GET', `/api/cases/${postCase.case_id}`, { token: postOwner.token })).json.view;
  vm.runInContext(source, postCtx, { filename: 'ui/app.js' });
  await tick(); await tick(); await tick();
  await waitFor(() => vm.runInContext('state.step', postCtx) === 1);
  vm.runInContext(`state.caseId = "${postCase.case_id}"; state.view = __VIEW; state.step = 2; render();`, postCtx);
  const postPanel = () => post.elementById('panel').innerHTML;
  check.ok(/Your report is uploaded/.test(postPanel()) && /Your report is ready to review\./.test(postPanel()), 'the real post-upload screen states the upload and its readiness');
  check.ok(/Reviewing your report for Nova Scotia/.test(postPanel()), 'with the short region label from the case selection');
  check.ok(/id="check-report"/.test(postPanel()), 'and the check action, from the purchase the service recorded');
  check.ok(!/No file has been uploaded/.test(postPanel()), 'never asking for the upload the case already has');

  post.elementById('check-report').onclick();
  await waitFor(() => vm.runInContext('state.step', postCtx) === 3);
  await waitFor(() => vm.runInContext('Boolean(state.view && state.view.result)', postCtx));
  check.equal(vm.runInContext('state.error', postCtx), null, 'the check completes with no UI error');
  check.ok(/Results/.test(post.elementById('panel').innerHTML), 'and the completed screen is the results step');
  vm.runInContext('state.step = 2; render();', postCtx);
  check.ok(/id="view-results"/.test(postPanel()) && !/id="check-report"/.test(postPanel()), 'the post-upload screen then offers exactly one action: the results');

  /* A second case, uploaded while access is still held, to measure the uploaded-but-no-access screen. */
  const postCaseB = (await service.request('POST', '/api/cases', { token: postOwner.token, body: { country: 'CA', region: 'CA-NS' } })).json.case;
  check.equal((await service.request('POST', `/api/cases/${postCaseB.case_id}/files`, { token: postOwner.token, body: uploadBody(postPdf, 'post-upload-b.pdf') })).status, 201, 'the second case accepts the upload while access is held');
  const postViewB = (await service.request('GET', `/api/cases/${postCaseB.case_id}`, { token: postOwner.token })).json.view;

  /* The recorded period ends after the upload: the same screen must offer the plan action, and the service refuses. */
  postStore().update((state) => {
    for (const row of state.entitlements || []) {
      if (row.account_id === postOwner.account_id) row.expires_at = new Date(Date.now() - 1000).toISOString();
    }
    return true;
  });
  await vm.runInContext('refreshAccess().then(() => render())', postCtx);
  await waitFor(() => vm.runInContext('Boolean(state.entitlement && state.entitlement.entitled === false)', postCtx));
  postCtx.__VIEW_B = postViewB;
  vm.runInContext(`state.caseId = "${postCaseB.case_id}"; state.view = __VIEW_B; state.step = 2; render();`, postCtx);
  check.ok(/id="check-report"/.test(postPanel()), 'an uploaded report still offers the check action after access ended, because assessing is free');
  check.ok(!/id="choose-plan"/.test(postPanel()), 'and never asks for a purchase before the assessment can run');
  check.ok(/Upload and check your report for free\./.test(postPanel()), 'with the short access sentence, not the lengthy paragraph');
  check.ok(/Your report is uploaded/.test(postPanel()), 'and the upload is still described as uploaded, never refused');
  check.notEqual((await service.request('POST', `/api/cases/${postCaseB.case_id}/evaluate`, { token: postOwner.token })).status, 402, 'the check itself needs no access');
  check.equal((await service.request('GET', `/api/cases/${postCaseB.case_id}/report-download`, { token: postOwner.token })).status, 402, 'while the complete assessment needs the unlock or a subscription');

  /* Billing states prices and purchase terms before purchase, with no internal readiness text. */
  vm.runInContext('state.step = 10; render();', postCtx);
  await waitFor(() => /Plans and prices/.test(post.elementById('billingView').innerHTML));
  const billingBox = post.elementById('billingView').innerHTML;
  check.ok(/\$5\.95 CAD/.test(billingBox) && /renews monthly|renews annually/.test(billingBox), 'the billing view shows the recorded prices and how each purchase renews');
  check.ok(/Prices are in CAD\./.test(billingBox) && /one-time purchase does not renew/i.test(billingBox)
    && /Renews until you cancel/.test(billingBox) && /Cancelling a subscription stops the next charge/.test(billingBox)
    && /Your access lasts until the date shown above/.test(billingBox), 'and states currency, renewal, cancellation and remaining access before purchase');
  check.ok(!/do not prove working billing/.test(billingBox), 'and never renders the internal billing-readiness sentence');

  return { interaction: 'select -> save full preview -> edit disables approval -> save and read new preview -> approve -> download against the real service' };
}

module.exports = {
  run,
  id: 'bo-prime-directive-interaction',
  title: 'OWNER-POTENTIAL-ISSUE-001: Wizzard interaction against the real service (select/save/approve/download + unsaved edits)'
};

