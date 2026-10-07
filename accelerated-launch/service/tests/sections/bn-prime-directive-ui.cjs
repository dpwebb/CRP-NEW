'use strict';
/**
 * bn-prime-directive-ui.cjs — OWNER-POTENTIAL-ISSUE-001 / Batch 1: a MOCKED UI unit/render test. It runs
 * `ui/app.js` in a node:vm DOM stub whose fetch returns canned responses, and asserts the potential-issue card
 * and the correction-packet block RENDER. It exercises no service, no checkbox, no interaction and no browser.
 * Interaction coverage against the real service is in bo-prime-directive-interaction.cjs.
 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const UI_JS = path.join(__dirname, '..', '..', 'ui', 'app.js');

function makeElement(id) {
  const children = new Map();
  return {
    id, innerHTML: '', textContent: '', className: '', value: '', disabled: false,
    style: {}, dataset: {}, files: [], onclick: null, onchange: null, children,
    scrollIntoView() {},
    querySelectorAll: () => [],
    querySelector: (sel) => { if (!children.has(sel)) children.set(sel, makeElement(sel)); return children.get(sel); }
  };
}

function makeContext(responder) {
  const nodes = new Map();
  const calls = [];
  const elementById = (id) => { if (!nodes.has(id)) nodes.set(id, makeElement(id)); return nodes.get(id); };
  const context = {
    console, setTimeout, clearTimeout, JSON, Object, Array, Map, Set, Promise, Number, String, Date, Error, RegExp,
    crypto: { randomUUID: () => 'bn-ui-uuid' },
    fetch: async (url, options) => {
      const method = (options && options.method) || 'GET';
      calls.push(`${method} ${url}`);
      const reply = responder(method, url, options) || { ok: true, status: 200, body: { ok: true } };
      return { ok: reply.status < 400 && reply.body.ok !== false, status: reply.status, json: async () => reply.body, text: async () => JSON.stringify(reply.body) };
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

function tick() { return new Promise((r) => setTimeout(r, 0)); }

const POTENTIAL_ISSUE = {
  issue_id: '24ae89ec96e01afc', confidence: 'POTENTIAL', basis_type: 'FACTUAL_CONSISTENCY',
  request_type: 'VERIFICATION', eligible: true,
  consumer_label: 'VIOLATION',
  explanation: 'This report prints credit account 1 with an opened date later than its closed date (2020-01-01 after 2019-01-01).',
  uncertainty: 'The dates conflict. The report does not show which date needs correction, and a later correction may explain the difference.',
  account_number_in_report: 1, record_kind: 'credit account', check_kind: 'an account with contradictory dates',
  evidence: { opened: '2020-01-01', closed: '2019-01-01' },
  source_location: { section: null, page: 1, line: 3 }
};

const RESULT = {
  support: 'REPORT_SUPPORT', presentation_evidence: true,
  jurisdiction: { country: 'US', region: 'US-CA' }, checks_performed: 1,
  observations: [], report_consistency_checks: [], common_errors: [],
  issues: [POTENTIAL_ISSUE],
  eligibility: { draft_eligible: false, reason: 'NO_ELIGIBLE_RESULT_IN_THIS_BATCH' },
  assessment: { plain: 'This assessment contains no recorded rule comparison.' },
  disclaimer: 'This assessment covers the checks listed in this report.'
};

const VIEW = {
  case: { case_id: 'case_stub', country: 'US', region: 'US-CA', status: 'OPEN' },
  status_label: 'Open', files: [], result: RESULT, result_id: 'res_stub', reviewed: false,
  assessment_access: { complete_assessment: true, complete_assessment_via: 'SUBSCRIPTION', assessment_download: true, dispute_packet: true, purchase_choices: [] },
  assessment_summary: { result_id: 'res_stub', created_at: '2026-10-05T00:00:00.000Z', distinct_total: 1, by_confidence: { violation: 1, probable_violation: 0, potential: 0 }, teaser: null, severity_order: ['REMOVE_ENTRY', 'ADD_CONTENT', 'INCONSISTENCY'] },
  clarifications: [], clarification_questions: [],
  download: { response_draft_available: false, reason: 'NO_ELIGIBLE_RESULT_IN_THIS_BATCH', reason_plain: 'No response draft.', demonstration_download_available: true },
  demonstration_scenarios: []
};

const PACKET_VIEW = {
  report_identity: { bureau: 'Equifax', reference_date: '2026-06-12' },
  eligible_issues: [POTENTIAL_ISSUE],
  packet: { packet_id: 'pkt_stub', result_id: 'res_stub', selected_issue_ids: [], selected_count: 0, wording: null, approved: false, approved_version: null, approval_stale: false, download_available: false }
};

function makeResponder() {
  return (method, url) => {
    if (url === '/api/jurisdictions') return { status: 200, body: { ok: true, surface: { countries: [{ value: 'US', label: 'United States' }], regions: [{ value: 'US-CA', country: 'US', label: 'California', launch_ready: false }] } } };
    if (method === 'GET' && url === '/api/cases/case_stub') return { status: 200, body: { ok: true, view: VIEW } };
    if (method === 'GET' && url === '/api/cases/case_stub/packet') return { status: 200, body: { ok: true, view: PACKET_VIEW } };
    return { status: 200, body: { ok: true } };
  };
}

async function run(t, check) {
  const source = fs.readFileSync(UI_JS, 'utf8');
  const dom = makeContext(makeResponder());
  const ctx = dom.context;
  ctx.__VIEW = VIEW;
  vm.runInContext(source, ctx, { filename: 'ui/app.js' });
  await tick(); await tick(); await tick();

  const panel = dom.nodes.get('panel');

  /* Step 3: the potential issue card renders (never NOT_DETECTED, never failed-check diagnostics). */
  vm.runInContext('state.caseId = "case_stub"; state.view = __VIEW; state.step = 3; render();', ctx);
  check.ok(/Reporting issues for your review/.test(panel.innerHTML), 'the results step renders the unified issue section');
  check.ok(/opened date later than its closed date/.test(panel.innerHTML), 'and states what the report says');
  check.ok(/which date needs correction/.test(panel.innerHTML), 'and its specific uncertainty');
  check.ok(!/NOT_DETECTED/.test(panel.innerHTML), 'and never surfaces a NOT_DETECTED diagnostic as a card');

  /* Step 4: the correction-packet selection/review/edit/approve/download flow renders. */
  vm.runInContext('state.step = 4; render();', ctx);
  await tick(); await tick(); await tick();
  const packetBlock = panel.children.get('#packet-block');
  check.ok(packetBlock, 'the review step mounts the correction-packet block');
  check.ok(/Correction packet/.test(packetBlock.innerHTML), 'with a correction-packet heading');
  check.ok(/VIOLATION/.test(packetBlock.innerHTML), 'with the sole consumer breach label');
  check.ok(/opened date later than its closed date/.test(packetBlock.innerHTML), 'with the issue explanation');
  check.ok(/data-check-issue=/.test(packetBlock.innerHTML), 'with a per-issue selection checkbox');
  check.ok(/packet-wording/.test(packetBlock.innerHTML), 'with a consumer wording textarea kept separate from the report facts');
  check.ok(/Approve this version/.test(packetBlock.innerHTML), 'with an explicit approve action');
  check.ok(/Download correction packet/.test(packetBlock.innerHTML), 'and a download action');
  check.ok(dom.calls.includes('GET /api/cases/case_stub/packet'), 'the packet state is fetched from the service');

  return { potential_card_rendered: true, packet_flow_rendered: true };
}

module.exports = {
  run,
  id: 'bn-prime-directive-ui',
  title: 'OWNER-POTENTIAL-ISSUE-001: MOCKED UI render test — potential issue card and correction-packet block render (no service, no browser)'
};

