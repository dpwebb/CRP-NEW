'use strict';
/**
 * hn-results-evidence-card.cjs — the results-to-approved-packet first slice.
 *
 * MOCKED UI render test: ui/app.js runs in a node:vm DOM stub with canned responses. It proves the strongest
 * supported issue is surfaced with its exact report page and one plain next action, that the card follows the
 * server's existing owner-approved priority pick rather than the on-screen order, and that the assessment and
 * packet entitlement boundary and the postal-only instruction are unchanged. No service, no checkbox, no
 * browser, no real report.
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
    append() {}, prepend() {}, after() {},
    querySelector: (sel) => { if (!children.has(sel)) children.set(sel, makeElement(sel)); return children.get(sel); }
  };
}

function makeContext(responder) {
  const nodes = new Map();
  const calls = [];
  const elementById = (id) => { if (!nodes.has(id)) nodes.set(id, makeElement(id)); return nodes.get(id); };
  const context = {
    console, setTimeout, clearTimeout, JSON, Object, Array, Map, Set, Promise, Number, String, Date, Error, RegExp,
    crypto: { randomUUID: () => 'hn-ui-uuid' },
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

function tick() { return new Promise((resolve) => setTimeout(resolve, 0)); }

const DUPLICATE_ISSUE = {
  issue_id: 'hn-dup-0001', confidence: 'DEFINITE', basis_type: 'FACTUAL_CONSISTENCY',
  request_type: 'VERIFICATION', eligible: true, consumer_label: 'VIOLATION',
  explanation: 'The same collection debt appears twice on your report.',
  uncertainty: 'Both entries show the same creditor, balance and account reference.',
  account_number_in_report: 2, record_kind: 'collection account', check_kind: 'duplicate reporting',
  source_location: { section: 'Collection accounts', page: 4, line: 12 }
};
const STATUS_ISSUE = {
  issue_id: 'hn-status-0002', confidence: 'POTENTIAL', basis_type: 'FACTUAL_CONSISTENCY',
  request_type: 'VERIFICATION', eligible: true, consumer_label: 'VIOLATION',
  explanation: 'The account status and balance conflict with another printed value.',
  uncertainty: 'The report does not show which value is current.',
  account_number_in_report: 1, record_kind: 'credit account', check_kind: 'status conflict',
  source_location: { section: 'Credit accounts', page: 2, line: 7 }
};
const RESULT = {
  support: 'REPORT_SUPPORT', presentation_evidence: true,
  jurisdiction: { country: 'US', region: 'US-CA' }, checks_performed: 2,
  observations: [], report_consistency_checks: [], common_errors: [],
  /* Deliberately NOT in priority order: the card must follow the server pick, not the screen order. */
  issues: [STATUS_ISSUE, DUPLICATE_ISSUE],
  eligibility: { draft_eligible: true, reason: null },
  assessment: { plain: 'Two reporting issues were found.' },
  disclaimer: 'This assessment covers the checks listed in this report.'
};

const SEVERITY_ORDER = ['REPORTING_TIME_LIMIT', 'DUPLICATE_REPORTING', 'DATE_CONFLICT', 'PAYMENT_HISTORY_CONFLICT',
  'STATUS_AMOUNT_CONFLICT', 'MISSING_DATE', 'RESPONSIBILITY_IDENTITY', 'RE_AGING'];
function summaryWith(teaser) {
  return {
    result_id: 'res_hn', created_at: '2026-11-13T00:00:00.000Z', distinct_total: 2,
    by_confidence: { violation: 1, probable_violation: 0, potential: 1 }, teaser, severity_order: SEVERITY_ORDER.slice()
  };
}
const DUPLICATE_TEASER = {
  issue_id: 'hn-dup-0001', severity: 'DUPLICATE_REPORTING', title: 'The same debt appears more than once',
  confidence: 'DEFINITE', confidence_label: 'VIOLATION',
  explanation: 'The same collection debt appears twice on your report.'
};
const STATUS_TEASER = {
  issue_id: 'hn-status-0002', severity: 'STATUS_AMOUNT_CONFLICT', title: 'Account status or amounts do not match',
  confidence: 'POTENTIAL', confidence_label: 'VIOLATION',
  explanation: 'The account status and balance conflict with another printed value.'
};
const ACCESS = {
  complete_assessment: true, complete_assessment_via: 'SUBSCRIPTION', assessment_download: true,
  dispute_packet: true, purchase_choices: []
};
const BASE_VIEW = {
  case: { case_id: 'case_hn', country: 'US', region: 'US-CA', status: 'OPEN' },
  status_label: 'Open', files: [], result: RESULT, result_id: 'res_hn', reviewed: false,
  assessment_access: ACCESS, assessment_summary: summaryWith(DUPLICATE_TEASER),
  clarifications: [], clarification_questions: [],
  download: { response_draft_available: false, reason: 'NO_ELIGIBLE_RESULT_IN_THIS_BATCH', reason_plain: 'No response draft.', demonstration_download_available: true },
  demonstration_scenarios: []
};
function viewWith(overrides) { return Object.assign({}, BASE_VIEW, overrides); }
const PACKET_VIEW = {
  report_identity: { bureau: 'Equifax', reference_date: '2026-06-12' },
  eligible_issues: [STATUS_ISSUE, DUPLICATE_ISSUE],
  packet: { packet_id: 'pkt_hn', result_id: 'res_hn', selected_issue_ids: [], selected_count: 0, wording: null, approved: false, approved_version: null, approval_stale: false, download_available: false }
};
function makeResponder() {
  return (method, url) => {
    if (url === '/api/jurisdictions') return { status: 200, body: { ok: true, surface: { countries: [{ value: 'US', label: 'United States' }], regions: [{ value: 'US-CA', country: 'US', label: 'California', launch_ready: false }] } } };
    if (method === 'GET' && url === '/api/cases') return { status: 200, body: { ok: true, cases: [BASE_VIEW.case] } };
    if (method === 'GET' && url === '/api/cases/case_hn') return { status: 200, body: { ok: true, view: BASE_VIEW } };
    if (method === 'GET' && url === '/api/cases/case_hn/packet') return { status: 200, body: { ok: true, view: PACKET_VIEW } };
    return { status: 200, body: { ok: true } };
  };
}

async function run(t, check) {
  const source = fs.readFileSync(UI_JS, 'utf8');
  const dom = makeContext(makeResponder());
  const ctx = dom.context;
  ctx.__VIEW = BASE_VIEW;
  ctx.__VIEW_ALT = viewWith({ assessment_summary: summaryWith(STATUS_TEASER) });
  ctx.__VIEW_NONE = viewWith({ assessment_summary: summaryWith(null) });
  ctx.__VIEW_UNLOCKED = viewWith({ assessment_access: Object.assign({}, ACCESS, { dispute_packet: false }) });
  ctx.__VIEW_FREE = viewWith({ assessment_access: Object.assign({}, ACCESS, { complete_assessment: false, assessment_download: false, dispute_packet: false }) });
  vm.runInContext(source, ctx, { filename: 'ui/app.js' });
  await tick(); await tick(); await tick();

  const panel = dom.nodes.get('panel');
  const boot = 'accountEpoch++; state.account={account_id:"acc_hn",email:"hn-ui@example.test"}; state.accountSecurity={signup_complete:true}; state.caseId="case_hn"; state.step=STEP.RESULTS;';
  const draw = async (name) => {
    vm.runInContext(`${boot} state.view=__${name}; render();`, ctx);
    await tick();
    return panel.innerHTML;
  };
  const cardOf = (html) => (html.match(/<section class="obs strongest-issue"[\s\S]*?<\/section>/) || [''])[0];

  const html = await draw('VIEW');
  const card = cardOf(html);
  check.ok(/START HERE/.test(card), 'the complete results surface starts with one supported issue');
  check.ok(/The same debt appears more than once/.test(card), 'the card uses the owner-approved strongest issue');
  check.ok(/Your report, Collection accounts, page <b>4<\/b>, line <b>12<\/b>\./.test(card), 'and names the exact report page and line');
  check.ok(/Create my dispute packet/.test(card) && /print it and mail it to the bureau/.test(card), 'with one plain postal next action from the existing packet flow');
  check.ok(/id="strongest-issue-jump"[^>]*data-issue="hn-dup-0001"/.test(card), 'and a control that points at that issue');
  check.ok(/id="issue-hn-dup-0001"/.test(html) && /id="issue-hn-status-0002"/.test(html), 'each issue card keeps a stable anchor');
  check.ok(!/adapter_id|rule_assessment|COMMON-ERROR/.test(card), 'the card carries no internal identifiers');
  check.ok(!/file online|submit online|online dispute/i.test(card), 'the next action keeps the postal-only instruction');

  const altCard = cardOf(await draw('VIEW_ALT'));
  check.ok(/page <b>2<\/b>/.test(altCard) && !/page <b>4<\/b>/.test(altCard), 'the card follows the server priority pick, not the on-screen order');

  const none = await draw('VIEW_NONE');
  check.ok(!/START HERE/.test(none), 'no supported issue means no invented starting card');

  const unlockedHtml = await draw('VIEW_UNLOCKED');
  const unlockedCard = cardOf(unlockedHtml);
  check.ok(/page <b>4<\/b>/.test(unlockedCard) && /included with a subscription/.test(unlockedCard), 'an unlocked report sees its finding and the correct packet eligibility message');
  check.ok(!/id="create-packet"/.test(unlockedHtml), 'and no packet action appears without the packet entitlement');

  const free = await draw('VIEW_FREE');
  check.ok(/SUMMARY — FREE/.test(free), 'the free summary is unchanged');
  check.ok(!/START HERE/.test(free) && !/strongest-issue-jump/.test(free), 'the evidence card stays on the complete results surface');

  return {
    strongest_issue_card: true,
    exact_report_page: 'page 4, line 12',
    next_action: 'review, approve, print and mail',
    priority_source: 'server assessment_summary.teaser',
    entitlement_boundary: 'unchanged; card shows the subscription message without packet access',
    free_surface: 'no evidence card',
    postal_only: 'no online-filing wording'
  };
}

module.exports = {
  run,
  id: 'hn-results-evidence-card',
  title: 'Results-to-packet first slice: strongest supported issue, exact report page and one plain next action (mocked UI)'
};


