'use strict';
/**
 * az-consumer-support-ui.cjs — BLOCKER-SUPPORT-001 browser behavior and secret lifecycle.
 *
 * (1) The reference secret: supplied by CRP_SUPPORT_REFERENCE_SECRET; stable across module reconstruction
 * with the same configured secret; isolated between accounts; rotated by changing the secret; and with no
 * hardcoded fallback (an unconfigured secret is generated per process).
 * (2) The consumer Support step: reachable without an open case or upload, loads the owned reference, copies
 * the correct summary, handles clipboard/retrieval failure truthfully, and never renders a delayed response
 * after sign-out/account switch.
 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const UI_JS = path.join(__dirname, '..', '..', 'ui', 'app.js');

const SUPPORT_INFO = {
  reference: 'crp-ref-0123456789abcdef01234567',
  build_id: 'crp-wizard-77c1605b03e2aa8d',
  category: 'RESULT_PRESENT',
  jurisdiction: [{ country: 'US', region: 'US-CA' }],
  case_count: 1, file_count: 1, result_count: 1,
  generated_at: '2026-10-03T00:00:00.000Z',
  plain: 'Quote this reference when you report a problem. It lets support identify the build you ran and the step you reached, without seeing your report.'
};

function makeElement(id) {
  return {
    id, innerHTML: '', textContent: '', className: '', value: '', disabled: false, style: {}, dataset: {},
    files: [], onclick: null, onchange: null, _selected: false,
    scrollIntoView() {},
    querySelectorAll: () => [],
    querySelector: () => null,
    select() { this._selected = true; },
    focus() { this._focused = true; }
  };
}

function makeContext(responder) {
  const nodes = new Map();
  const elementById = (id) => {
    if (!nodes.has(id)) nodes.set(id, makeElement(id));
    return nodes.get(id);
  };
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
  ctx.window = ctx;
  ctx.globalThis = ctx;
  ctx.window.location = { assign: () => {} };
  vm.createContext(ctx);
  return { ctx, nodes, elementById };
}

function tick() { return new Promise((resolve) => setTimeout(resolve, 0)); }
async function run(t, check) {
  /* ------------------------------------------------------------------ secret lifecycle */
  const supportPath = require.resolve('../../support.cjs');
  const savedSecret = process.env.CRP_SUPPORT_REFERENCE_SECRET;
  const hadSecret = Object.prototype.hasOwnProperty.call(process.env, 'CRP_SUPPORT_REFERENCE_SECRET');
  function loadSupport(secret) {
    delete require.cache[supportPath];
    if (secret === undefined) delete process.env.CRP_SUPPORT_REFERENCE_SECRET;
    else process.env.CRP_SUPPORT_REFERENCE_SECRET = secret;
    return require('../../support.cjs');
  }
  try {
    const m1 = loadSupport('secret-1');
    const r1 = m1.referenceFor('acct-a');
    check.match(r1, /^crp-ref-[0-9a-f]{24}$/, 'the reference is an opaque token');
    const m2 = loadSupport('secret-1');
    check.equal(m2.referenceFor('acct-a'), r1, 'reference is stable across reconstruction with the same configured secret');
    check.notEqual(m1.referenceFor('acct-b'), r1, 'reference is isolated between accounts');
    const m3 = loadSupport('secret-2');
    check.notEqual(m3.referenceFor('acct-a'), r1, 'rotating the secret changes references');
    const m4 = loadSupport(undefined);
    const m5 = loadSupport(undefined);
    check.notEqual(m4.referenceFor('acct-a'), m5.referenceFor('acct-a'), 'no hardcoded fallback: an unconfigured secret is generated per process');
  } finally {
    delete require.cache[supportPath];
    if (hadSecret) process.env.CRP_SUPPORT_REFERENCE_SECRET = savedSecret;
    else delete process.env.CRP_SUPPORT_REFERENCE_SECRET;
  }

  /* ------------------------------------------------------------------ browser behavior */
  const source = fs.readFileSync(UI_JS, 'utf8');
  const responderState = { supportFails: false, supportDeferred: null };
  const dom = makeContext((method, url) => {
    if (url === '/api/jurisdictions') return { status: 200, body: { ok: true, surface: { countries: [{ value: 'CA', label: 'Canada' }], regions: [{ value: 'CA-NS', country: 'CA', label: 'Nova Scotia', launch_ready: false }] } } };
    if (url === '/api/session') return { status: 401, body: { ok: false, error: { code: 'AUTHENTICATION_REQUIRED', message: 'Sign in to continue.' } } };
    if (url === '/api/support') {
      if (responderState.supportDeferred) return { deferred: responderState.supportDeferred, status: 200 };
      if (responderState.supportFails) return { status: 500, body: { ok: false, error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } } };
      return { status: 200, body: { ok: true, ...SUPPORT_INFO } };
    }
    if (method === 'POST' && url === '/api/accounts') return { status: 201, body: { ok: true, account: { account_id: 'acc_stub', email: 'stub@example.test' } } };
    if (method === 'GET' && url === '/api/cases') return { status: 200, body: { ok: true, cases: [] } };
    if (method === 'GET' && url === '/api/account/profile') return { status: 200, body: { ok: true, profile: {} } };
    if (method === 'GET' && url === '/api/account/documents') return { status: 200, body: { ok: true, documents: [] } };
    if (method === 'GET' && url === '/api/entitlement') return { status: 200, body: { ok: true, entitlement: { plain: 'no purchase recorded' }, payment: { plain: 'no payment provider connected' }, upgrade_credit: { eligible: false } } };
    return { status: 200, body: { ok: true } };
  });
  const ctx = dom.ctx;

  vm.runInContext(source, ctx, { filename: 'ui/app.js' });
  await tick(); await tick(); await tick();
  const panel = dom.nodes.get('panel');

  /* Reach Support without an open case or upload. */
  dom.elementById('email').value = 'stub@example.test';
  dom.elementById('password').value = 'a-long-enough-password';
  await dom.elementById('create').onclick();
  await tick();
  vm.runInContext('state.step = 7; render();', ctx);
  await tick(); await tick();
  check.ok(/Support/.test(panel.innerHTML), 'the Support step is reachable from the wizard');
  check.ok(/does not send a message/.test(panel.innerHTML), 'the copy explanation states nothing is sent and nothing is submitted');
  const supportBox = dom.elementById('supportInfo');
  check.ok(/Your support reference/.test(supportBox.innerHTML), 'the owned reference loads without a case');
  check.ok(/crp-ref-0123456789abcdef01234567/.test(supportBox.innerHTML), 'the reference value is shown');
  check.ok(/RESULT_PRESENT/.test(supportBox.innerHTML), 'the lifecycle category is shown');
  check.ok(/crp-wizard-77c1605b03e2aa8d/.test(supportBox.innerHTML), 'the build id is shown');

  /* Copy the correct reference and the redacted summary (clipboard success). */
  let copied = null;
  dom.ctx.navigator.clipboard = { writeText: async (text) => { copied = text; } };
  await dom.elementById('copyReference').onclick();
  await tick();
  check.equal(copied, 'crp-ref-0123456789abcdef01234567', 'copy-reference copies the correct token');
  check.ok(/Reference copied/.test(dom.elementById('copyStatus').textContent), 'copy success is reported truthfully');

  copied = null;
  await dom.elementById('copySummary').onclick();
  await tick();
  check.ok(copied && copied.indexOf('Reference: crp-ref-0123456789abcdef01234567') !== -1, 'copy-summary copies the reference line');
  check.ok(copied && copied.indexOf('Build: crp-wizard-77c1605b03e2aa8d') !== -1, 'copy-summary copies the build');
  check.ok(copied && copied.indexOf('Jurisdiction: US-US-CA') !== -1, 'copy-summary copies the jurisdiction');
  check.ok(copied && !/john-smith|Order for Relief|report contents/.test(copied), 'the copied summary carries no report content');


  /* Clipboard failure → truthful manual-copy fallback with the textarea selected. */
  copied = null;
  dom.ctx.navigator.clipboard = { writeText: async () => { throw new Error('clipboard denied'); } };
  await dom.elementById('copySummary').onclick();
  await tick();
  check.ok(/not available/.test(dom.elementById('copyStatus').textContent), 'clipboard failure is reported truthfully');
  check.ok(dom.elementById('supportSummary')._selected === true, 'the summary textarea is selected for manual copy');

  /* Retrieval failure → error + retry that recovers. */
  responderState.supportFails = true;
  vm.runInContext('state.step = 7; render();', ctx);
  await tick(); await tick();
  check.ok(/could not be loaded/.test(dom.elementById('supportInfo').innerHTML), 'retrieval failure is reported truthfully');
  responderState.supportFails = false;
  await dom.elementById('retrySupport').onclick();
  await tick(); await tick();
  check.ok(/Your support reference/.test(dom.elementById('supportInfo').innerHTML), 'retry recovers the reference');

  /* Stale information is cleared on sign-out and a delayed response never renders the old account's data. */
  let resolveSupport;
  responderState.supportDeferred = new Promise((r) => { resolveSupport = r; });
  vm.runInContext('state.step = 7; render();', ctx);
  await tick();
  vm.runInContext('state.step = 0; render();', ctx);
  await tick(); await tick();
  await dom.elementById('signout').onclick();
  await tick();
  check.equal(vm.runInContext('state.support', ctx), null, 'support state is cleared on sign-out');
  resolveSupport({ ok: true, ...SUPPORT_INFO });
  await tick(); await tick();
  check.ok(!/crp-ref-0123456789abcdef01234567/.test(panel.innerHTML), 'a delayed response after sign-out never renders the previous account reference');
  responderState.supportDeferred = null;

  return { reference: true, redaction: true, access: true, usefulness: true, secret_lifecycle: true, ui_copy: true, ui_failure: true, ui_stale_clear: true };
}

module.exports = { run, id: 'az-consumer-support-ui', title: 'BLOCKER-SUPPORT-001: Support interface behavior and reference secret lifecycle' };
