'use strict';
/**
 * k-ui-smoke.cjs — the consumer surface actually renders.
 *
 * OWNER-ALL82-001 / B2. The HTTP suite proves the service's behaviour; this section proves the private UI
 * consumes it without error and shows the plain-language path, including uploaded report results and the
 * packet review. It runs `ui/app.js` in a `node:vm` context with a small DOM and `fetch` stub — the same
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
  qualifications: ['A violation is shown when report evidence supports a breach of a defined reporting rule or requirement.', 'Only the checks named below were run against your report.'],
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
    confidence_label: 'VIOLATION',
    explanation: 'This report prints an opened date later than its closed date.'
  },
  severity_order: ['REMOVE_ENTRY', 'ADD_CONTENT', 'INCONSISTENCY']
};

const CASE_VIEW = {
  case: { case_id: 'case_stub', country: 'CA', region: 'CA-NS', status: 'OPEN' },
  status_label: 'Open — you have not recorded a next step yet',
  files: [{
    file_id: 'uploaded_1',
    original_filename: 'fictional-report.pdf',
    stored_bytes: 100,
    container: 'pdf',
    supported_format: true,
    recognised_as: 'Equifax Canada consumer report',
    refusal_reason: null,
    format_predicates: [],
    extraction: { admitted: true, presentation_evidence: true, extraction_ran: true, accounts_read: 2, account_statuses: [], result_status: 'RESOLVED' }
  }],
  assessment_access: STUB_ACCESS_FULL,
  assessment_summary: STUB_SUMMARY,
  result: { support: 'REPORT_SUPPORT', issues: [{ issue_id: 'i1', eligible: true, consumer_label: 'VIOLATION', explanation: 'The opened date is later than the closed date.', source_location: { section: 'Accounts', page: 16, line: 32 }, account_identity: { name: 'FICTIONAL CREDITOR' }, rule_assessment: { requirement: 'The opening date must not be later than the closing date.' } }] },
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
  const state = { signed_in: false, reviewed: false };
  return (method, url) => {
    if (url === '/api/jurisdictions') {
      return { status: 200, body: { ok: true, surface: { countries: [{ value: 'CA', label: 'Canada' }], regions: [{ value: 'CA-NS', country: 'CA', label: 'Nova Scotia', launch_ready: false }], bureau_choices: { CA: [{ id: 'EQUIFAX', label: 'Equifax' }] } } } };
    }
    if (!state.signed_in && (url === '/api/session' || url === '/api/cases')) {
      return { status: 401, body: { ok: false, error: { code: 'AUTHENTICATION_REQUIRED', message: 'Sign in to continue.' } } };
    }
    if (method === 'POST' && url === '/api/accounts') {
      state.signed_in = true;
      return { status: 201, body: { ok: true, account: { account_id: 'acc_stub', email: 'stub@example.test' } } };
    }
    if (method === 'GET' && url === '/api/session') return { status: 200, body: { ok: true, account: { account_id: 'acc_stub', email: 'stub@example.test' }, signed_in: true } };
    if (method === 'GET' && url === '/api/account/profile') return { status: 200, body: { ok: true, profile: { full_name: 'Fictional Consumer' } } };
    if (method === 'GET' && url === '/api/account/documents') return { status: 200, body: { ok: true, documents: [] } };
    if (method === 'GET' && url === '/api/cases') return { status: 200, body: { ok: true, cases: [{ case_id: 'case_stub', country: 'CA', region: 'CA-NS', status: 'OPEN' }] } };
    if (method === 'GET' && url === '/api/privacy') return { status: 200, body: { ok: true, cases: [{country:'CA',region:'CA-NS',documents:[{name:'private-owned.pdf',stored_bytes:123}],result_count:1}],retention:{plain:'Kept until you delete it.'},deletion:{backups:'Backup erasure timing has not been verified.',external_billing:'Payment provider records are separate.'} } };
    if (method === 'POST' && url === '/api/cases') return { status: 201, body: { ok: true, case: { case_id: 'case_stub', country: 'CA', region: 'CA-NS' } } };
    if (method === 'GET' && url === '/api/cases/case_stub') return { status: 200, body: { ok: true, view: { ...CASE_VIEW, reviewed: state.reviewed } } };
    if (method === 'POST' && url === '/api/cases/case_stub/files') return { status: 201, body: { ok: true, receipt: { file_id: 'f_uploaded', format_detection: { supported: true, refusal_reason: null } } } };
    if (method === 'POST' && url === '/api/cases/case_stub/evaluate') return { status: 201, body: { ok: true, result: CASE_VIEW.result } };
    if (method === 'GET' && (url === '/api/billing/plans' || url === '/api/pricing')) {
      return { status: 200, body: { ok: true, plan_catalog: { currency: 'cad', plans: [
        { plan_code: 'report_once', label: 'CRP One-Time Credit Report', amount_display: '$5.95 CAD', interval: 'one_time', grants: ['the complete assessment of the report already uploaded for this case'] },
        { plan_code: 'monthly', label: 'CRP Monthly', amount_display: '$7.95 CAD', interval: 'month', grants: ['complete assessments and assessment downloads for your reports'] },
        { plan_code: 'annual', label: 'CRP Annual', amount_display: '$79.50 CAD', interval: 'year', grants: ['complete assessments and assessment downloads for your reports'] }
      ] } } };
    }
    if (method === 'GET' && url === '/api/cases/case_stub/response-draft') {
      return { status: 409, body: { ok: false, error: { code: 'RESULT_NOT_ELIGIBLE_FOR_DRAFT', message: 'No response draft can be produced for this result.' } } };
    }
    if (method === 'POST' && url === '/api/cases/case_stub/review') {
      state.reviewed = true;
      return { status: 200, body: { ok: true, result_id: 'res_stub', case_status: 'REVIEWED' } };
    }
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
  check.ok(/Create your account/.test(panel.innerHTML), 'the first step renders without error');
  check.ok(dom.calls.includes('GET /api/pricing'), 'the public configured price catalogue is loaded before sign-in');
  check.ok(/Email address/.test(panel.innerHTML) && /Password \(at least 12 characters\)/.test(panel.innerHTML), 'the entry screen presents account fields immediately');
  check.ok(!/Price unavailable|Monthly:|Yearly:/.test(panel.innerHTML), 'plan details do not interrupt account creation');
  check.ok(/No report, identification, or payment is needed/.test(panel.innerHTML), 'account creation does not request packet documents or payment');
  check.ok(/Step 1 of 7/.test(dom.elementById('stepcount').textContent), 'the main journey has seven steps');
  check.ok(/Your tools/.test(dom.elementById('steps').innerHTML), 'utilities are shown separately from the numbered main journey');
  check.ok(/Forgot your password/.test(panel.innerHTML), 'account recovery is visible before sign-in');

  /* Step 1: create an account. */
  dom.elementById('email').value = 'stub@example.test';
  dom.elementById('password').value = 'a-long-enough-password';
  await dom.elementById('create').onclick();
  await tick();
  check.ok(dom.calls.includes('POST /api/accounts'), 'creating an account calls the service');
  check.ok(/Upload your credit report/.test(panel.innerHTML), 'Step2 guides the consumer directly to report upload');
  check.ok(/where you live now/.test(panel.innerHTML) && /different or previous address/.test(panel.innerHTML), 'the selection explains how the current location is used');
  check.ok(/Use the PDF from your bureau/.test(panel.innerHTML) && /File sizes and help/.test(panel.innerHTML), 'simple file preparation and detailed limits appear before uploading');

  /* Step 2: open a case for an explicit selection. */
  dom.elementById('country').value = 'CA';
  dom.elementById('region').value = 'CA-NS';
  dom.elementById('bureau').value = 'EQUIFAX';
  dom.elementById('file').files = [{ name: 'fictional-report.pdf', size: 30, type: 'application/pdf' }];
  await dom.elementById('open').onclick();
  await tick();
  check.ok(dom.calls.includes('POST /api/cases'), 'opening a case posts the explicit selection');
  check.ok(dom.calls.includes('POST /api/cases/case_stub/evaluate'), 'Step2 upload starts the existing assessment');
  vm.runInContext('state.step = 2; render();', ctx);

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
  check.equal(filePosts.length, 3, 'Step2 report plus two additional files each produce their own upload');
  vm.runInContext('state.step = 2; render();', ctx);

  /* Step 3: view the actual uploaded report result; sample invitations and their action are retired. */
  check.ok(!/Try a sample report|Try the sample|id="demo"|id="scenario"/.test(panel.innerHTML), 'the report step no longer invites sample use');
  check.ok(!dom.nodes.has('demo') && !dom.calls.some(c => /\/demonstration/.test(c)), 'no sample control is wired or sample assessment requested');
  vm.runInContext('state.step = 3; render();', ctx);
  check.ok(!/INTERACTIVE DEMONSTRATION/.test(dom.nodes.get('support-banner').innerHTML), 'uploaded report results are not labelled demonstration');
  check.ok(/VIOLATION/.test(panel.innerHTML) && /FICTIONAL CREDITOR/.test(panel.innerHTML), 'the result states the breach label and printed account name');
  check.ok(/page/.test(panel.innerHTML) && />16</.test(panel.innerHTML), 'and the evidence location is shown to the consumer');
  check.ok(!/What this result does not say/.test(panel.innerHTML), 'owner imperative: blanket qualification lists are not surfaced');
  check.ok(/opening date must not be later/.test(panel.innerHTML) && !/legal advice/.test(panel.innerHTML), 'the breached rule is stated without legal-advice disclaimers');
  check.ok(!/NOT_REPORT_SUPPORT/.test(panel.innerHTML), 'the raw support token is never rendered');
  check.ok(!/A quick clarification/.test(panel.innerHTML), 'the uploaded result asks no unneeded questions');

  /* The optional clarification block appears only for a real report result, with benefit, I-don't-know and Skip. */
  ctx.REPORT_VIEW = REPORT_VIEW;
  vm.runInContext('state._savedView = state.view; state.view = REPORT_VIEW; state.step = 3; render();', ctx);
  check.ok(/A quick clarification/.test(panel.innerHTML), 'a real report result surfaces the optional clarification block');
  check.ok(/Why we ask/.test(panel.innerHTML), 'and each question explains its benefit');
  check.ok(/I don't know/.test(panel.innerHTML) && /Skip/.test(panel.innerHTML), 'and offers "I don\'t know" and "Skip"');
  vm.runInContext('state.view = state._savedView; state.step = 3; render();', ctx);

  /* Step 5: choose disputes before document preparation and packet review. */
  vm.runInContext('state.step = 4; render();', ctx);
  check.ok(/Choose disputes/.test(panel.innerHTML) && /Step 5 of 7/.test(dom.elementById('stepcount').textContent), 'issue selection has its own visible step');
  check.ok(!/response draft|recorded output permission|review the observations|nothing will be sent|demonstration file/i.test(panel.innerHTML),
    'the packet review does not repeat obsolete draft, observation-only or demonstration claims');
  check.ok(!/id="draft"|id="download"/.test(panel.innerHTML), 'and does not offer legacy draft or demonstration controls');
  check.ok(/id="packet-block"/.test(panel.innerHTML), 'the correction-packet mount remains in the review');
  check.ok(/NOT YET REVIEWED/.test(panel.innerHTML) && /id="review"/.test(panel.innerHTML), 'the assessment acknowledgement is available before review');
  await dom.elementById('review').onclick();
  await tick();
  check.ok(dom.calls.includes('POST /api/cases/case_stub/review'), 'acknowledgement records the review through the existing service action');
  check.ok(/REVIEWED BY YOU/.test(panel.innerHTML) && /id="review" disabled/.test(panel.innerHTML), 'the returned review disables repeated acknowledgement');
  check.ok(/Your review is saved\./.test(panel.innerHTML), 'the saved review has a simple confirmation');
  check.ok(!dom.calls.some((c) => /response-draft|demonstration-download/.test(c)), 'reviewing the packet requests neither obsolete endpoint');

  vm.runInContext('state.step = 5; render();', ctx);
  check.ok(/Prepare your documents/.test(panel.innerHTML) && /Step 6 of 7/.test(dom.elementById('stepcount').textContent), 'document preparation follows issue selection');
  vm.runInContext('state.step = 6; render();', ctx);
  check.ok(/Review and approve packet/.test(panel.innerHTML) && /Step 7 of 7/.test(dom.elementById('stepcount').textContent), 'review and approval follow issue selection');
  /* Privacy and deletion remain outside the numbered journey. */
  vm.runInContext('state.step = 8; render();', ctx);
  await tick();
  await tick();
  check.ok(dom.calls.includes('GET /api/privacy'), 'privacy dashboard loads authenticated inventory');
  check.ok(/private-owned.pdf/.test(dom.elementById('privacyInventory').innerHTML), 'privacy dashboard renders owned documents');
  check.ok(/Backup erasure timing has not been verified/.test(dom.elementById('privacyInventory').innerHTML), 'privacy dashboard does not promise backup erasure');
  check.ok(/Delete this case/.test(panel.innerHTML), 'the case step offers deletion');
  check.ok(/Mark CLOSED/.test(panel.innerHTML), 'and consumer-recorded status');

  /* Sign-out control exists and the machine payload is never read. */
  vm.runInContext('state.step = 0; render();', ctx);
  await tick(); await tick();
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

  vm.runInContext('state.assessing = true; assessmentCaseId = state.view.case.case_id; render();', ctx);
  check.ok(/We are checking your report\./.test(panel.innerHTML), 'while processing it says the check is running');
  check.ok(!/id="check-report"|id="choose-plan"|id="view-results"/.test(panel.innerHTML), 'and offers no action while the check runs');
  check.ok(/id="refresh-report"/.test(panel.innerHTML), 'a consumer returning during assessment can safely refresh its results');

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
  check.ok(!/violations:|potential issues:/.test(panel.innerHTML), 'without confidence tier counts');
  check.ok(/VIOLATION/.test(panel.innerHTML) && /Two details on the report cannot both be right/.test(panel.innerHTML), 'with the teaser title and the sole breach label');
  check.ok(/This is the most serious violation we found that you can dispute\./.test(panel.innerHTML), 'plain wording explains why this one example was chosen');
  check.ok(/id="buy-report_once"/.test(panel.innerHTML) && /\$5\.95 CAD/.test(panel.innerHTML), 'and the one-time unlock choice with its recorded price');
  check.ok(/id="buy-monthly"/.test(panel.innerHTML) && /id="buy-annual"/.test(panel.innerHTML), 'and the two subscription choices');
  check.ok(!/Check: <b>/.test(panel.innerHTML) && !/id="packet-block"/.test(panel.innerHTML), 'while the complete findings and the packet stay out of the free view');
  vm.runInContext('state.view = { ...FREE_VIEW, assessment_summary: { ...FREE_VIEW.assessment_summary, teaser: { ...FREE_VIEW.assessment_summary.teaser, confidence_label: null } } }; render();', ctx);
  check.ok(!/most serious violation|Two details on the report cannot both be right/.test(panel.innerHTML), 'an old unlabeled review teaser is not surfaced as a violation');

  /* The ONE-TIME unlocked state: complete findings, the download, and no packet. */
  vm.runInContext('state.view = ONE_TIME_VIEW; state.step = 3; render();', ctx);
  check.ok(/We did not find a reporting issue/.test(panel.innerHTML), 'a one-time unlock shows the result of its issue assessment');
  check.ok(/id="download-assessment"/.test(panel.innerHTML), 'and offers the assessment download');
  check.ok(/SUBSCRIPTION BENEFITS/.test(panel.innerHTML) && /Print and mail your disputes/.test(panel.innerHTML) && /Compare your next report/.test(panel.innerHTML), 'the report explains subscriber packet and comparison benefits');
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
