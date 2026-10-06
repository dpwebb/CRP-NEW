'use strict';
/**
 * bo-prime-directive-interaction.cjs — OWNER-POTENTIAL-ISSUE-001 / Batch 1 interaction coverage against the
 * ACTUAL TestService. It drives the real `ui/app.js` handlers (select an issue, save selection + wording,
 * approve, download) with a node:vm DOM whose fetch forwards to the real HTTP listener. This is service
 * integration, NOT a real browser (no layout/CSS/engine). It also covers unsaved edits: approval re-saves the
 * visible selection and wording, never an older saved version.
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
    querySelectorAll: () => el.__queryResults,
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
    token: actor.token, body: { plan_code: 'report_once', case_id: caseId }
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
  const c = (await service.request('POST', '/api/cases', { token: owner.token, body: { country: 'US', region: 'US-CA' } })).json.case;
  await payReportOnce(service, owner, c.case_id);
  const pdf = buildPdf({ pages: [{ lines: LINES }] });
  check.equal((await service.request('POST', `/api/cases/${c.case_id}/files`, { token: owner.token, body: uploadBody(pdf, 'contra.pdf') })).status, 201, 'the fictional report uploads');
  check.equal((await service.request('POST', `/api/cases/${c.case_id}/evaluate`, { token: owner.token })).status, 201, 'evaluation succeeds');

  const realView = (await service.request('GET', `/api/cases/${c.case_id}`, { token: owner.token })).json.view;
  const potential = (realView.result.issues || []).find((i) => i.confidence === 'POTENTIAL');
  check.ok(potential, 'the real result carries the potential issue');
  const issueId = potential.issue_id;

  const dom = makeContext(`http://127.0.0.1:${service.port}`, owner.token);
  const ctx = dom.context;
  ctx.__VIEW = realView;
  vm.runInContext(source, ctx, { filename: 'ui/app.js' });
  await tick(); await tick(); await tick();
  /* Wait for the asynchronous boot (jurisdictions + session + cases + entitlement) to finish before driving the
     packet step, so a late boot render cannot overwrite state.step. */
  await waitFor(() => vm.runInContext('state.step', ctx) === 1);

  vm.runInContext(`state.caseId = "${c.case_id}"; state.view = __VIEW; state.step = 4; render();`, ctx);
  await waitFor(() => dom.elementById('packet-save').onclick != null);
  const panelEl = dom.elementById('panel');
  const block = panelEl.querySelector('#packet-block');
  check.ok(/Correction packet/.test(block.innerHTML), 'the packet block renders against the real service');
  check.ok(/Who this correspondence goes to/.test(block.innerHTML), 'the packet block shows the correspondence section in the consumer review');
  check.ok(/consumer reporting agency that issued this report/.test(block.innerHTML), 'and states the recipient TYPE rather than an invented address');
  check.ok(/id="packet-preview"/.test(block.innerHTML), 'and mounts the correspondence/evidence review from the service view');

  /* --- select the issue (checkbox) + correspondence details + wording A, then SAVE (against the real service). --- */
  const checkbox = { checked: true, getAttribute: (n) => (n === 'data-check-issue' ? issueId : null) };
  panelEl.__queryResults = [checkbox];
  dom.elementById('packet-name').value = 'Dana Whitfield';
  dom.elementById('packet-contact').value = 'dana.whitfield@example.test';
  dom.elementById('packet-reference').value = 'CRP-REF-1';
  dom.elementById('packet-wording').value = 'First wording.';
  dom.elementById('packet-save').onclick();
  await waitFor(() => dom.elementById('packet-approve').onclick != null);

  /* --- unsaved edit: change the wording (no save), then APPROVE — approve must re-save the visible wording. --- */
  dom.elementById('packet-wording').value = 'Changed wording (unsaved before approve).';
  dom.elementById('packet-approve').onclick();
  await waitFor(() => dom.calls.some((x) => /POST .*packet\/approve/.test(x)));
  check.ok(dom.calls.some((x) => /POST .*packet\/approve/.test(x)), 'the approve endpoint is called');
  check.ok(dom.calls.some((x) => /POST .*packet\/wording/.test(x)), 'the wording endpoint is called');
  check.equal(vm.runInContext('state.error', ctx), null, 'no UI error during the approve');

  /* --- download: the UI navigates to the download endpoint; fetch it against the real service. --- */
  dom.elementById('packet-download').onclick();
  check.ok(dom.calls.some((x) => /NAVIGATE .*packet-download/.test(x)), 'the UI navigates to the packet download');

  const pvAfter = (await service.request('GET', `/api/cases/${c.case_id}/packet`, { token: owner.token })).json.view;
  check.equal(pvAfter.packet.approved, true, 'the packet is approved after the UI approve action');
  check.equal(pvAfter.packet.selected_count, 1, 'with one issue selected');

  const dl = await service.request('GET', `/api/cases/${c.case_id}/packet-download`, { token: owner.token });
  check.equal(dl.status, 200, 'the matching packet downloads');
  check.ok(/opened date later than its closed date/.test(dl.text), 'and agrees with the reviewed facts');
  check.ok(dl.text.includes('Changed wording (unsaved before approve).'), 'and carries the wording the consumer saw at approval, not the earlier saved wording');
  check.ok(!dl.text.includes('First wording.'), 'and not the older saved wording');
  check.ok(/^CORRESPONDENCE TO SEND/m.test(dl.text), 'and an organized, sendable correspondence section');
  check.ok(dl.text.includes('Dana Whitfield') && dl.text.includes('dana.whitfield@example.test'), 'carrying the consumer-supplied correspondence details');
  check.ok(/^EVIDENCE REFERENCES \(from your report\)/m.test(dl.text), 'and an organized evidence-reference section');
  check.ok(/printed "/.test(dl.text) && /normalized to/.test(dl.text), 'with the raw printed reading and the normalized value for the selected issue');
  check.ok(!/not legal advi/i.test(dl.text), 'with no legal-advice disclaimer');

  /* Editing the wording after approval disables the download (no silent older-version download while the changed
     wording remains visible). */
  await waitFor(() => typeof dom.elementById('packet-wording').oninput === 'function');
  dom.elementById('packet-wording').value = 'Another unsaved change.';
  dom.elementById('packet-wording').oninput();
  check.equal(dom.elementById('packet-download').disabled, true, 'editing wording after approval disables the download until re-approval');

  return { interaction: 'select -> save -> (unsaved edit) -> approve -> download against the real service' };
}

module.exports = {
  run,
  id: 'bo-prime-directive-interaction',
  title: 'OWNER-POTENTIAL-ISSUE-001: Wizzard interaction against the real service (select/save/approve/download + unsaved edits)'
};

