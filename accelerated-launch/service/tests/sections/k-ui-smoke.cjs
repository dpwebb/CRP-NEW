'use strict';
/**
 * k-ui-smoke.cjs — the consumer surface actually renders.
 *
 * OWNER-ALL82-001 / B2. The HTTP suite proves the service's behaviour; this section proves the private UI
 * consumes it without error and shows the plain-language path, including the demonstration banner and the
 * draft refusal. It runs `ui/app.js` in a `node:vm` context with a small DOM and `fetch` stub — the same
 * technique the repository already uses to check the static consumer site (`wizard-check.cjs`).
 *
 * What it does NOT claim: no browser was used, no layout was measured and no CSS was applied.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function makeElement(id) {
  const element = {
    id,
    innerHTML: '',
    textContent: '',
    className: '',
    value: '',
    disabled: false,
    style: {},
    dataset: {},
    files: [],
    onclick: null,
    onchange: null,
    scrollIntoView() {},
    querySelectorAll: () => [],
    querySelector: () => null
  };
  return element;
}

function makeContext(responder) {
  const nodes = new Map();
  const calls = [];
  const elementById = (id) => {
    if (!nodes.has(id)) nodes.set(id, makeElement(id));
    return nodes.get(id);
  };
  const context = {
    console,
    setTimeout,
    clearTimeout,
    JSON,
    Object,
    Array,
    Map,
    Set,
    Promise,
    Number,
    String,
    Date,
    Error,
    RegExp,
    crypto: { randomUUID: () => 'ui-smoke-uuid-1234567890' },
    fetch: async (url, options) => {
      const method = (options && options.method) || 'GET';
      calls.push(`${method} ${url}`);
      const reply = responder(method, url, options) || { ok: true, status: 200, body: { ok: true } };
      return {
        ok: reply.status < 400 && reply.body.ok !== false,
        status: reply.status,
        json: async () => reply.body,
        text: async () => JSON.stringify(reply.body)
      };
    },
    document: {
      getElementById: elementById,
      createElement: makeElement,
      modelContext: undefined
    },
    URL: { createObjectURL: () => 'blob:stub', revokeObjectURL: () => {} },
    Blob: class Blob {},
    FileReader: class FileReader {
      readAsDataURL() { this.result = 'data:application/pdf;base64,JVBERi0='; this.onload(); }
    }
  };
  context.window = context;
  context.window.location = { assign: (url) => calls.push(`NAVIGATE ${url}`) };
  context.globalThis = context;
  vm.createContext(context);
  return { context, nodes, calls, elementById };
}

function tick() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

const UI_JS = path.join(__dirname, '..', '..', 'ui', 'app.js');

const DEMONSTRATION_RESULT = {
  support: 'DEMONSTRATION_ONLY_NOT_REPORT_SUPPORT',
  presentation_evidence: false,
  jurisdiction: { country: 'CA', region: 'CA-NS' },
  checks_performed: 1,
  observations: [{
    account_number_in_report: 1,
    check_name: 'Consumer Reporting Act (Nova Scotia), R.S.N.S. 1989, c. 93, s. 10(3)(c)',
    measures_from: 'Last Payment Date',
    headline: 'This check could not be run against your file.',
    detail: 'The check is bound to a report format that your uploaded file did not match.',
    evidence: { section: 'Collections', field: 'Last Payment Date', page: 16, line: 32, account_number_in_report: 1, printed_value: '2015/03/01' },
    output_level: 'observation',
    is_a_finding: false,
    qualification: 'This comes from your report. It is not a finding that a rule was broken.'
  }],
  checks_not_run: [],
  checks_unresolved: [],
  eligibility: { draft_eligible: false, reason: 'NO_ELIGIBLE_RESULT_IN_THIS_BATCH' },
  qualifications: ['These are observations from your report, not legal findings.', 'Only the checks named below were run against your report.'],
  comprehensive_legal_check: false,
  disclaimer: 'This assessment covers the checks listed in this report.'
};

/* OWNER-PURCHASE-FLOW-001: the case view now always carries the access decision and the free summary. */
const STUB_ACCESS_FULL = { complete_assessment: true, complete_assessment_via: 'SUBSCRIPTION', assessment_download: true, dispute_packet: true, purchase_choices: [] };
const STUB_SUMMARY = {
  result_id: 'res_stub',
  created_at: '2026-10-05T00:00:00.000Z',
  distinct_total: 1,
  by_confidence: { violation: 0, probable_violation: 0, potential: 1 },
  teaser: {
    issue_id: 'i1',
    severity: 'INCONSISTENCY',
    title: 'Two details on the report cannot both be right',
    confidence: 'POTENTIAL',
    confidence_label: 'Potential issue',
    explanation: 'This report prints an opened date later than its closed date.'
  },
  severity_order: ['REMOVE_ENTRY', 'ADD_CONTENT', 'INCONSISTENCY']
};

const CASE_VIEW = {
  case: { case_id: 'case_stub', country: 'CA', region: 'CA-NS', status: 'OPEN' },
  status_label: 'Open — you have not recorded a next step yet',
  files: [{
    file_id: 'demo_1',
    original_filename: 'DEMONSTRATION-INPUT-NOT-A-CREDIT-REPORT',
    stored_bytes: 0,
    container: 'IN_MEMORY_MODEL_NOT_A_FILE',
    supported_format: false,
    recognised_as: null,
    refusal_reason: null,
    format_predicates: [],
    demonstration: true,
    extraction: { presentation_evidence: false, extraction_ran: true, accounts_read: 2, account_statuses: [], result_status: 'RESOLVED' }
  }],
  assessment_access: STUB_ACCESS_FULL,
  assessment_summary: STUB_SUMMARY,
  result: DEMONSTRATION_RESULT,
  reviewed: false,
  download: {
    response_draft_available: false,
    reason: 'NO_ELIGIBLE_RESULT_IN_THIS_BATCH',
    reason_plain: 'No result in this build may be used to produce a response draft.',
    demonstration_download_available: true
  },
  demonstration_scenarios: ['TWO_ACCOUNTS', 'NO_COLLECTION_ACCOUNTS']
};

/* A non-demonstration report view so the optional clarification block can be exercised (it must never appear on
   a labelled demonstration, which carries no report support). */
const REPORT_RESULT = Object.assign({}, DEMONSTRATION_RESULT, { support: 'REPORT_SUPPORT' });
const REPORT_VIEW = {
  case: { case_id: 'report_case', country: 'US', region: 'US-NY', status: 'OPEN' },
  status_label: 'Open',
  files: [],
  assessment_access: STUB_ACCESS_FULL,
  assessment_summary: STUB_SUMMARY,
  result: REPORT_RESULT,
  result_id: 'res_report',
  reviewed: false,
  clarifications: [],
  clarification_questions: [
    { id: 'account-purpose', question_key: 'account-purpose|CREDITOR A', account: 'CREDITOR A', plain: 'On the account reported as CREDITOR A, which account is this report about, in your own words?', benefit: 'This helps separate accounts you recognise from accounts you do not, without changing anything the report itself says.', answer_kind: 'free_text', has_dont_know: true, has_skip: true },
    { id: 'account-responsibility', question_key: 'account-responsibility|CREDITOR A', account: 'CREDITOR A', plain: 'On the account reported as CREDITOR A, are you individually responsible, jointly responsible with someone else, or only an authorised user?', benefit: 'This helps us distinguish your own accounts from accounts where another person was responsible.', answer_kind: 'choice', choices: ['individual', 'joint', 'authorized_user'], has_dont_know: true, has_skip: true }
  ],
  download: { response_draft_available: false, reason: 'NO_ELIGIBLE_RESULT_IN_THIS_BATCH', reason_plain: 'No result in this build may be used to produce a response draft.', demonstration_download_available: true },
  demonstration_scenarios: []
};

/* A FREE account's completed case: counts and one teaser, no complete assessment, with the purchase choices. */
const FREE_VIEW = {
  case: { case_id: 'free_case', country: 'CA', region: 'CA-NS', status: 'OPEN' },
  status_label: 'Open',
  files: [{
    file_id: 'f1', original_filename: 'report.pdf', stored_bytes: 100, container: 'pdf',
    upload_gate: { state: 'ACCEPTED_BY_UPLOAD_GATE' }, supported_format: true,
    recognised_as: 'Equifax Canada consumer report', format_predicates: [], extraction: { admitted: true }
  }],
  assessment_access: {
    complete_assessment: false, complete_assessment_via: 'NONE',
    assessment_download: false, dispute_packet: false,
    purchase_choices: ['unlock_this_report', 'monthly', 'annual']
  },
  assessment_summary: Object.assign({}, STUB_SUMMARY, { result_id: null }),
  result: null,
  result_id: null,
  reviewed: false,
  clarifications: [],
  clarification_questions: [],
  download: { response_draft_available: false, reason: 'NO_RESULT_YET', reason_plain: 'No result in this build may be used to produce a response draft.', demonstration_download_available: false },
  demonstration_scenarios: []
};

/* A ONE-TIME unlocked case: the complete assessment and its download, but no dispute packet. */
const ONE_TIME_VIEW = Object.assign({}, FREE_VIEW, {
  assessment_access: {
    complete_assessment: true, complete_assessment_via: 'ONE_TIME_CREDIT',
    assessment_download: true, dispute_packet: false, purchase_choices: []
  },
  result: REPORT_RESULT,
  result_id: 'res_once'
});

function makeResponder() {
  const state = { signed_in: false };
  return (method, url) => {
    if (url === '/api/jurisdictions') {
      return { status: 200, body: { ok: true, surface: { countries: [{ value: 'CA', label: 'Canada' }], regions: [{ value: 'CA-NS', country: 'CA', label: 'Nova Scotia', launch_ready: false }] } } };
    }
    if (!state.signed_in && (url === '/api/session' || url === '/api/cases')) {
      return { status: 401, body: { ok: false, error: { code: 'AUTHENTICATION_REQUIRED', message: 'Sign in to continue.' } } };
    }
    if (method === 'POST' && url === '/api/accounts') {
      state.signed_in = true;
      return { status: 201, body: { ok: true, account: { account_id: 'acc_stub', email: 'stub@example.test' } } };
    }
    if (method === 'GET' && url === '/api/session') return { status: 200, body: { ok: true, account: { account_id: 'acc_stub', email: 'stub@example.test' }, signed_in: true } };
    if (method === 'GET' && url === '/api/cases') return { status: 200, body: { ok: true, cases: [{ case_id: 'case_stub', country: 'CA', region: 'CA-NS', status: 'OPEN' }] } };
    if (method === 'GET' && url === '/api/privacy') return { status: 200, body: { ok: true, cases: [{country:'CA',region:'CA-NS',documents:[{name:'private-owned.pdf',stored_bytes:123}],result_count:1}],retention:{plain:'Kept until you delete it.'},deletion:{backups:'Backup erasure timing has not been verified.',external_billing:'Payment provider records are separate.'} } };
    if (method === 'POST' && url === '/api/cases') return { status: 201, body: { ok: true, case: { case_id: 'case_stub', country: 'CA', region: 'CA-NS' } } };
    if (method === 'GET' && url === '/api/cases/case_stub') return { status: 200, body: { ok: true, view: CASE_VIEW } };
    if (method === 'POST' && url === '/api/cases/case_stub/files') return { status: 201, body: { ok: true, receipt: { file_id: 'f_uploaded', format_detection: { supported: true, refusal_reason: null } } } };
    if (method === 'POST' && url === '/api/cases/case_stub/demonstration') {
      return { status: 201, body: { ok: true, demonstration: true, counts_as_report_support: false, label: 'INTERACTIVE DEMONSTRATION — NOT A CREDIT REPORT — NOT REPORT SUPPORT', result: DEMONSTRATION_RESULT } };
    }
    if (method === 'POST' && url === '/api/cases/case_stub/evaluate') return { status: 201, body: { ok: true, result: DEMONSTRATION_RESULT } };
    if (method === 'GET' && url === '/api/billing/plans') {
      return { status: 200, body: { ok: true, plan_catalog: { currency: 'cad', plans: [
        { plan_code: 'report_once', label: 'CRP One-Time Credit Report', amount_display: '$5.95 CAD', interval: 'one_time', grants: ['the complete assessment of the report already uploaded for this case'] },
        { plan_code: 'monthly', label: 'CRP Monthly', amount_display: '$7.95 CAD', interval: 'month', grants: ['complete assessments and assessment downloads for your reports'] },
        { plan_code: 'annual', label: 'CRP Annual', amount_display: '$79.50 CAD', interval: 'year', grants: ['complete assessments and assessment downloads for your reports'] }
      ] } } };
    }
    if (method === 'GET' && url === '/api/cases/case_stub/response-draft') {
      return { status: 409, body: { ok: false, error: { code: 'RESULT_NOT_ELIGIBLE_FOR_DRAFT', message: 'No response draft can be produced for this result.' } } };
    }
    if (method === 'POST' && url === '/api/cases/case_stub/review') return { status: 200, body: { ok: true, result_id: 'res_stub', case_status: 'REVIEWED' } };
    return { status: 200, body: { ok: true } };
  };
}

async function run(t, check) {
  const source = fs.readFileSync(UI_JS, 'utf8');
  const dom = makeContext(makeResponder());
  const ctx = dom.context;

  vm.runInContext(source, ctx, { filename: 'ui/app.js' });
  await tick();
  await tick();
  await tick();

  const panel = dom.nodes.get('panel');
  check.ok(dom.calls.includes('GET /api/jurisdictions'), 'the UI loads the jurisdiction surface on boot');
  check.ok(/Your account/.test(panel.innerHTML), 'the first step renders without error');

  /* Step 1: create an account. */
  dom.elementById('email').value = 'stub@example.test';
  dom.elementById('password').value = 'a-long-enough-password';
  await dom.elementById('create').onclick();
  await tick();
  check.ok(dom.calls.includes('POST /api/accounts'), 'creating an account calls the service');
  check.ok(/Choose your jurisdiction/.test(panel.innerHTML), 'the jurisdiction step then renders');
  check.ok(/You can open a case for any of the 82 regions/.test(panel.innerHTML), 'and it says a case can be opened for any of the 82 regions');

  /* Step 2: open a case for an explicit selection. */
  dom.elementById('country').value = 'CA';
  dom.elementById('region').value = 'CA-NS';
  await dom.elementById('open').onclick();
  await tick();
  check.ok(dom.calls.includes('POST /api/cases'), 'opening a case posts the explicit selection');
  check.ok(/Your report/.test(panel.innerHTML), 'the report step renders');

  /* Step 2b: the upload experience accepts multiple PDF/image files and uploads each individually. */
  check.ok(/multiple/.test(source) && /image\/png/.test(source), 'the upload input advertises multi-select images, not only PDF');
  check.ok(/Upload selected files/.test(source), 'and the upload action is phrased for more than one file');
  dom.elementById('file').files = [
    { name: 'page-1.png', size: 10, type: 'image/png' },
    { name: 'page-2.jpg', size: 20, type: 'image/jpeg' }
  ];
  await dom.elementById('upload').onclick();
  await tick();
  await tick();
  const filePosts = dom.calls.filter((c) => c === 'POST /api/cases/case_stub/files');
  check.equal(filePosts.length, 2, 'two selected files produce two individual uploads, never just files[0]');
  vm.runInContext('state.step = 2; render();', ctx);

  /* Step 3: run the labelled demonstration. */
  await dom.elementById('demo').onclick();
  await tick();
  check.ok(dom.calls.includes('POST /api/cases/case_stub/demonstration'), 'the demonstration is requested from the service');
  check.ok(/INTERACTIVE DEMONSTRATION/.test(dom.nodes.get('support-banner').innerHTML), 'the banner labels the demonstration explicitly');
  check.ok(/Checks performed/.test(panel.innerHTML), 'the results step renders the check count');
  check.ok(/page/.test(panel.innerHTML) && />16</.test(panel.innerHTML), 'and the evidence location is shown to the consumer');
  check.ok(!/What this result does not say/.test(panel.innerHTML), 'owner imperative: blanket qualification lists are not surfaced');
  check.ok(/checks listed in this report/.test(panel.innerHTML), 'actual assessment scope is stated without legal-advice disclaimers');
  check.ok(!/NOT_REPORT_SUPPORT/.test(panel.innerHTML), 'the raw support token is never rendered');
  check.ok(!/A quick clarification/.test(panel.innerHTML), 'a labelled demonstration never surfaces the clarification block');

  /* The optional clarification block appears only for a real report result, with benefit, I-don't-know and Skip. */
  ctx.REPORT_VIEW = REPORT_VIEW;
  vm.runInContext('state._savedView = state.view; state.view = REPORT_VIEW; state.step = 3; render();', ctx);
  check.ok(/A quick clarification/.test(panel.innerHTML), 'a real report result surfaces the optional clarification block');
  check.ok(/Why we ask/.test(panel.innerHTML), 'and each question explains its benefit');
  check.ok(/I don't know/.test(panel.innerHTML) && /Skip/.test(panel.innerHTML), 'and offers "I don\'t know" and "Skip"');
  vm.runInContext('state.view = state._savedView; state.step = 3; render();', ctx);

  /* Step 4: the review and download boundary. */
  vm.runInContext('state.step = 4; render();', ctx);
  check.ok(/not available/.test(panel.innerHTML), 'the review step states that no draft is available');
  check.ok(/No result in this build may be used to produce a response draft/.test(panel.innerHTML), 'and explains why in plain language');
  await dom.elementById('draft').onclick();
  await tick();
  check.ok(/No response draft can be produced/.test(panel.innerHTML), 'requesting a draft shows the service\'s refusal');
  dom.elementById('download').onclick();
  check.ok(dom.calls.some((c) => /NAVIGATE .*demonstration-download/.test(c)), 'the download interface is reachable from the UI');

  /* Step 5: case status and deletion controls. */
  vm.runInContext('state.step = 6; render();', ctx);
  await tick();
  await tick();
  check.ok(dom.calls.includes('GET /api/privacy'), 'privacy dashboard loads authenticated inventory');
  check.ok(/private-owned.pdf/.test(dom.elementById('privacyInventory').innerHTML), 'privacy dashboard renders owned documents');
  check.ok(/Backup erasure timing has not been verified/.test(dom.elementById('privacyInventory').innerHTML), 'privacy dashboard does not promise backup erasure');
  check.ok(/Delete this case/.test(panel.innerHTML), 'the case step offers deletion');
  check.ok(/Mark CLOSED/.test(panel.innerHTML), 'and consumer-recorded status');

  /* Sign-out control exists and the machine payload is never read. */
  vm.runInContext('state.step = 0; render();', ctx);
  check.ok(/Sign out/.test(panel.innerHTML), 'the sign-out control is present');
  check.ok(!/\.machine\b/.test(source), 'the UI source never touches the audit-only machine payload');

  /* The post-upload screen reports the case's ACTUAL state and offers exactly one next action. */
  const uploadedView = {
    case: { country: 'CA', region: 'CA-NS' },
    files: [{
      file_id: 'f1', original_filename: 'report.pdf', stored_bytes: 120, container: 'pdf',
      upload_gate: { state: 'ACCEPTED_BY_UPLOAD_GATE' }, supported_format: true,
      recognised_as: 'TransUnion Canada consumer report', format_predicates: [], extraction: { admitted: true }
    }],
    result: null, result_id: null, reviewed: false, clarifications: [], clarification_questions: [],
    download: {}, demonstration_scenarios: []
  };
  const assessedView = Object.assign({}, uploadedView, {
    result_id: 'r1',
    assessment_access: STUB_ACCESS_FULL,
    assessment_summary: STUB_SUMMARY,
    result: {
      support: 'ACTUAL_REPORT_EVIDENCE', checks_performed: 2,
      issues: [{ issue_id: 'i1', confidence: 'POTENTIAL', eligible: true, explanation: 'This report prints an opened date later than its closed date.' }],
      observations: [], report_consistency_checks: [],
      qualifications: [], disclaimer: 'This assessment covers the checks listed in this report.',
      assessment: { plain: 'We ran 2 rules for where you live.' }
    }
  });
  const quietView = Object.assign({}, uploadedView, {
    result_id: 'r2',
    assessment_access: STUB_ACCESS_FULL,
    assessment_summary: Object.assign({}, STUB_SUMMARY, { distinct_total: 0, by_confidence: { violation: 0, probable_violation: 0, potential: 0 }, teaser: null }),
    result: {
      support: 'ACTUAL_REPORT_EVIDENCE', checks_performed: 2, issues: [], observations: [], report_consistency_checks: [],
      qualifications: [], disclaimer: 'This assessment covers the checks listed in this report.',
      assessment: { plain: 'We ran 2 rules for where you live.' }
    }
  });
  ctx.UPLOADED_VIEW = uploadedView;
  ctx.ASSESSED_VIEW = assessedView;
  ctx.QUIET_VIEW = quietView;
  vm.runInContext('state.view = UPLOADED_VIEW; state.step = 2; state.entitlement = { entitled: false, state: "NONE", plain: "No active purchase is recorded against this account." }; state.assessing = false; state.assessment_error = null; state.purchase_needed = null; render();', ctx);
  check.ok(/Your report is uploaded/.test(panel.innerHTML) && /Your report is ready to review\./.test(panel.innerHTML), 'an uploaded report says it is uploaded and ready to review');
  check.ok(/Reviewing your report for Nova Scotia/.test(panel.innerHTML), 'the repeated jurisdiction paragraph is replaced by the short region label');
  check.ok(/id="check-report"/.test(panel.innerHTML) && /Check my report</.test(panel.innerHTML), 'an uploaded report offers the check action with no purchase recorded');
  check.ok(!/id="choose-plan"|id="view-results"/.test(panel.innerHTML), 'and no other next action');
  check.ok(!/No file has been uploaded|Choose a PDF report or report images in page order/.test(panel.innerHTML), 'and never asks for an upload the case already has');
  check.ok(/Upload and check your report for free\./.test(panel.innerHTML), 'with the short access sentence in place of the lengthy paragraph');

  vm.runInContext('state.entitlement = { entitled: true, state: "ACTIVE", plan_code: "monthly" }; render();', ctx);
  check.ok(/id="check-report"/.test(panel.innerHTML) && /Check my report</.test(panel.innerHTML), 'the same check action is offered with a purchase recorded');

  vm.runInContext('state.assessing = true; render();', ctx);
  check.ok(/We are checking your report\./.test(panel.innerHTML), 'while processing it says the check is running');
  check.ok(!/id="check-report"|id="choose-plan"|id="view-results"/.test(panel.innerHTML), 'and offers no action while the check runs');

  vm.runInContext('state.purchase_needed = null; state.assessing = false; state.assessment_error = "The file on this case could not be read."; render();', ctx);
  check.ok(/We could not check your report:/.test(panel.innerHTML) && /The file on this case could not be read\./.test(panel.innerHTML), 'a failed check explains the specific problem');
  check.ok(/id="check-report"/.test(panel.innerHTML) && /Try again to check my report</.test(panel.innerHTML), 'and offers the retry action');

  vm.runInContext('state.assessment_error = null; state.view = ASSESSED_VIEW; render();', ctx);
  check.ok(/Your results are ready/.test(panel.innerHTML), 'a completed assessment says the results are ready');
  check.ok(/Review the issues we found and choose any you want to dispute\./.test(panel.innerHTML), 'and tells the consumer what to do with them');
  check.ok(/id="view-results"/.test(panel.innerHTML) && !/Your report is ready to review/.test(panel.innerHTML), 'offering the results action and never the pre-check wording');
  check.ok(!/We are checking your report|Choose a plan to check my report/.test(panel.innerHTML), 'with no contradictory status and no second action');
  check.ok(!/We could not check your report/.test(panel.innerHTML), 'and no stale failure');

  vm.runInContext('state.view = QUIET_VIEW; render();', ctx);
  check.ok(/Your results are ready/.test(panel.innerHTML) && /We did not find a reporting issue in the information we could review\./.test(panel.innerHTML), 'a completed assessment with nothing surfaced says exactly what the performed checks found');
  check.ok(/id="view-results"/.test(panel.innerHTML) && !/correct|compliant/i.test(panel.innerHTML), 'still offering the results action, and never implying the report is correct');
  vm.runInContext('state.view = ASSESSED_VIEW; render();', ctx);

  /* The FREE completed state: counts, one teaser and the purchase choices on the results step. */
  ctx.FREE_VIEW = FREE_VIEW;
  ctx.ONE_TIME_VIEW = ONE_TIME_VIEW;
  ctx.CASE_VIEW = CASE_VIEW;
  vm.runInContext('state.view = FREE_VIEW; state.step = 2; render();', ctx);
  check.ok(/Your results are ready/.test(panel.innerHTML) && /We found 1 reporting issue/.test(panel.innerHTML), 'an unpaid completed case announces the count it found');
  check.ok(/id="view-results"/.test(panel.innerHTML) && !/Your report is ready to review/.test(panel.innerHTML), 'and offers the results without the pre-check wording');
  vm.runInContext('state.step = 3; render();', ctx);
  check.ok(/Reporting issues found: <b>1<\/b>/.test(panel.innerHTML), 'the results step shows the distinct total');
  check.ok(/violations: <b>0<\/b> · probable violations: <b>0<\/b> · potential issues: <b>1<\/b>/.test(panel.innerHTML), 'and the three category counts');
  check.ok(/Potential issue/.test(panel.innerHTML) && /Two details on the report cannot both be right/.test(panel.innerHTML), 'with the teaser title and its confidence label');
  check.ok(/id="buy-report_once"/.test(panel.innerHTML) && /\$5\.95 CAD/.test(panel.innerHTML), 'and the one-time unlock choice with its recorded price');
  check.ok(/id="buy-monthly"/.test(panel.innerHTML) && /id="buy-annual"/.test(panel.innerHTML), 'and the two subscription choices');
  check.ok(!/Check: <b>/.test(panel.innerHTML) && !/id="packet-block"/.test(panel.innerHTML), 'while the complete findings and the packet stay out of the free view');

  /* The ONE-TIME unlocked state: complete findings, the download, and no packet. */
  vm.runInContext('state.view = ONE_TIME_VIEW; state.step = 3; render();', ctx);
  check.ok(/Check: <b>/.test(panel.innerHTML), 'a one-time unlock shows the complete findings');
  check.ok(/id="download-assessment"/.test(panel.innerHTML), 'and offers the assessment download');
  check.ok(/Dispute packets, report history and subsequent-report comparison are part of a subscription\./.test(panel.innerHTML), 'and explains that packets need a subscription');
  check.ok(!/id="packet-block"/.test(panel.innerHTML), 'with no packet block for a one-time unlock');
  vm.runInContext('state.step = 4; render();', ctx);
  check.ok(/Dispute packets are part of a subscription\./.test(panel.innerHTML) && /id="go-billing"/.test(panel.innerHTML), 'the review step points a one-time unlock at the plans instead of the packet');
  vm.runInContext('state.view = CASE_VIEW; state.step = 3; render();', ctx);

  /* An accepted upload is never described as refused. */
  ctx.GENERAL_VIEW = Object.assign({}, uploadedView, { files: [Object.assign({}, uploadedView.files[0], { supported_format: false, recognised_as: null })] });
  vm.runInContext('state.view = GENERAL_VIEW; state.step = 2; render();', ctx);
  check.ok(/Accepted and stored for this case/.test(panel.innerHTML), 'a generally-read upload says it was accepted and stored');
  check.ok(!/does not seem to be a credit report|could not read it/.test(panel.innerHTML), 'and is never described as refused');
  ctx.UNREADABLE_VIEW = Object.assign({}, uploadedView, { files: [Object.assign({}, uploadedView.files[0], { supported_format: false, recognised_as: null, extraction: { admitted: false, refusal_reason: 'UNREADABLE_DOCUMENT' } })] });
  vm.runInContext('state.view = UNREADABLE_VIEW; state.step = 2; render();', ctx);
  check.ok(/We could not read your report clearly enough/.test(panel.innerHTML), 'an unreadable upload is described as a reading outcome with a next step');
  check.ok(!/The file was not read:/.test(panel.innerHTML), 'and never leaks an internal reason token');

  return { ui_calls: dom.calls.length };
}

module.exports = { run, id: 'k-ui-smoke', title: 'The private consumer UI renders and drives the service' };
