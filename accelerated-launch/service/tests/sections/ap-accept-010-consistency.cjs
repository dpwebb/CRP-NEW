'use strict';
/* ap-accept-010-consistency.cjs — OWNER-ACCEPT-010 C1-C5 focused tests: strict evidence validation, unique
 * grid-cell association, grid confidence enforcement, account/bureau continuation, and material clarification. */
const grid = require('../../payment-history-grid.cjs');
const clarification = require('../../clarification.cjs');
const validator = require('../../evidence-validator.cjs');
const fsNode = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { buildPdf } = require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');

async function run(t, check) {
  const evidence = {};

  /* ------------------------------------------------ C1: strict evidence validation */
  const TARGET = 'crp-wizard-ACCEPT010TEST';
  // A genuine evidence reference must BIND to the target release (content names the build), not merely exist.
  const tmpDir = fsNode.mkdtempSync(path.join(os.tmpdir(), 'crp-accept010-evidence-'));
  const boundRef = path.join(tmpDir, 'bound-evidence.json');
  fsNode.writeFileSync(boundRef, JSON.stringify({ identity: { build_id: TARGET }, note: 'release-bound evidence' }));
  // The AUDIT's minimal evidence object: a behavior summary WITHOUT any criteria/references.
  const minimalAudit = { passed: true, identity: { build_id: TARGET, served_build_id: TARGET }, behavior: { implemented: 'x' }, tests: [{ id: 't', passed: true }] };
  check.equal(validator.validateCapabilityEvidence(minimalAudit, { targetBuildId: TARGET }).passed, false, "C1: the audit's minimal evidence (behavior summary without criteria/references) is rejected");
  // Genuine evidence: a complete named criterion set with a RELEASE-BOUND reference.
  const genuine = {
    passed: true,
    identity: { build_id: TARGET, served_build_id: TARGET },
    criteria: { recovery: { passed: true, expected: 'recovered', measured: 'recovered', evidence_refs: [boundRef] } },
    tests: [{ id: 't', passed: true }]
  };
  check.equal(validator.validateCapabilityEvidence(genuine, { targetBuildId: TARGET }).passed, true, 'C1: genuine complete evidence (criteria + release-bound references) is accepted');
  // A source-code file is an unrelated reference: it does NOT bind to the release and is rejected.
  check.equal(validator.validateCapabilityEvidence(Object.assign({}, genuine, { criteria: { recovery: { passed: true, expected: 'e', measured: 'm', evidence_refs: [path.join(__dirname, '..', '..', 'clarification.cjs')] } } }), { targetBuildId: TARGET }).passed, false, 'C1: a source-code reference (unrelated evidence) is rejected');
  // Required criteria: a missing required criterion is rejected.
  check.equal(validator.validateCapabilityEvidence(genuine, { targetBuildId: TARGET, requiredCriteria: ['recovery', 'benchmark'] }).passed, false, 'C1: a missing required criterion is rejected');
  // Required criteria: an arbitrary substitute criterion is rejected.
  check.equal(validator.validateCapabilityEvidence(genuine, { targetBuildId: TARGET, requiredCriteria: ['something_else'] }).passed, false, 'C1: an arbitrary substitute criterion is rejected');
  check.equal(validator.validateCapabilityEvidence({ passed: true, identity: { build_id: 'x' }, behavior: {} }, { targetBuildId: TARGET }).passed, false, 'C1: obsolete minimal evidence (no served identity, wrong build) is rejected');
  check.equal(validator.validateCapabilityEvidence(genuine, { targetBuildId: null }).passed, false, 'C1: no target identity fails clearly');
  check.equal(validator.validateCapabilityEvidence({ passed: true, identity: { build_id: 'old', served_build_id: 'old' }, criteria: { c: { passed: true, expected: 'e', measured: 'm', evidence_refs: [__filename] } }, tests: [{ id: 't', passed: true }] }, { targetBuildId: TARGET }).passed, false, 'C1: an obsolete build is rejected');
  check.equal(validator.validateCapabilityEvidence({ passed: true, identity: { build_id: TARGET, served_build_id: TARGET }, deployed: true, criteria: {}, tests: [] }, { targetBuildId: TARGET }).passed, false, 'C1: a fake deployed flag with empty criteria/tests is rejected');
  check.equal(validator.validateCapabilityEvidence({ passed: true, identity: { build_id: TARGET, served_build_id: TARGET }, criteria: { c: { passed: true, expected: 'e', measured: 'm', evidence_refs: [] } }, tests: [{ id: 't', passed: true }] }, { targetBuildId: TARGET }).passed, false, 'C1: empty evidence references are rejected');
  check.equal(validator.validateCapabilityEvidence({ passed: true, identity: { build_id: TARGET, served_build_id: TARGET }, criteria: { c: { passed: false, expected: 'e', measured: 'm', evidence_refs: ['__missing__'] } }, tests: [{ id: 't', passed: true }] }, { targetBuildId: TARGET }).passed, false, 'C1: a failed criterion is rejected');
  check.equal(validator.validateCapabilityEvidence(genuine, { targetBuildId: TARGET, benchmark: { missed_fact_rate: 0 } }).passed, false, 'C1: a missing benchmark is rejected');
  check.equal(validator.validateCapabilityEvidence(Object.assign({}, genuine, { benchmark: { missed_fact_rate: 0.5, incorrect_reading_rate: 0.5 } }), { targetBuildId: TARGET, benchmark: { missed_fact_rate: 0.1 } }).passed, false, 'C1: a benchmark over threshold is rejected');
  // FDT alignment (OWNER-ACCEPT-010): the Owner-approved prospective acceptance criteria are enforced through the
  // validator's `acceptance` option — >=95% recovery of readable required facts, zero incorrect decisive facts,
  // zero cross-record/bureau borrowing and zero unsupported legal findings.
  const fdtGenuine = Object.assign({}, genuine, {
    acceptance: { recovery_rate: 0.96, incorrect_decisive_facts: 0, cross_record_or_bureau_borrowing: 0, unsupported_legal_findings: 0 }
  });
  check.equal(validator.validateCapabilityEvidence(fdtGenuine, { targetBuildId: TARGET, acceptance: { min_recovery_rate: 0.95, zero_incorrect_decisive_facts: true, zero_cross_record_or_bureau_borrowing: true, zero_unsupported_legal_findings: true } }).passed, true, 'C1: FDT prospective acceptance (>=95% recovery, zero incorrect/borrowing/unsupported) is accepted');
  check.equal(validator.validateCapabilityEvidence(Object.assign({}, fdtGenuine, { acceptance: { recovery_rate: 0.94, incorrect_decisive_facts: 0, cross_record_or_bureau_borrowing: 0, unsupported_legal_findings: 0 } }), { targetBuildId: TARGET, acceptance: { min_recovery_rate: 0.95 } }).passed, false, 'C1: FDT recovery below 95% is rejected');
  check.equal(validator.validateCapabilityEvidence(Object.assign({}, fdtGenuine, { acceptance: { recovery_rate: 1, incorrect_decisive_facts: 1, cross_record_or_bureau_borrowing: 0, unsupported_legal_findings: 0 } }), { targetBuildId: TARGET, acceptance: { zero_incorrect_decisive_facts: true } }).passed, false, 'C1: FDT incorrect decisive facts are rejected');
  check.equal(validator.validateCapabilityEvidence(Object.assign({}, fdtGenuine, { acceptance: { recovery_rate: 1, incorrect_decisive_facts: 0, cross_record_or_bureau_borrowing: 1, unsupported_legal_findings: 0 } }), { targetBuildId: TARGET, acceptance: { zero_cross_record_or_bureau_borrowing: true } }).passed, false, 'C1: FDT cross-record/bureau borrowing is rejected');
  check.equal(validator.validateCapabilityEvidence(Object.assign({}, fdtGenuine, { acceptance: { recovery_rate: 1, incorrect_decisive_facts: 0, cross_record_or_bureau_borrowing: 0, unsupported_legal_findings: 1 } }), { targetBuildId: TARGET, acceptance: { zero_unsupported_legal_findings: true } }).passed, false, 'C1: FDT unsupported legal findings are rejected');
  // FDT threshold boundaries and metric validity (OWNER-ACCEPT-010 final revalidation).
  check.equal(validator.validateCapabilityEvidence(Object.assign({}, fdtGenuine, { acceptance: { recovery_rate: 0.95, incorrect_decisive_facts: 0, cross_record_or_bureau_borrowing: 0, unsupported_legal_findings: 0 } }), { targetBuildId: TARGET, acceptance: { min_recovery_rate: 0.95 } }).passed, true, 'C1: recovery exactly at the 95% boundary is accepted');
  check.equal(validator.validateCapabilityEvidence(Object.assign({}, fdtGenuine, { acceptance: { recovery_rate: 0.9499, incorrect_decisive_facts: 0, cross_record_or_bureau_borrowing: 0, unsupported_legal_findings: 0 } }), { targetBuildId: TARGET, acceptance: { min_recovery_rate: 0.95 } }).passed, false, 'C1: recovery just below 95% is rejected');
  check.equal(validator.validateCapabilityEvidence(Object.assign({}, genuine, { benchmark: { missed_fact_rate: 0.05, incorrect_reading_rate: 0, baseline: 'b' } }), { targetBuildId: TARGET, benchmark: { missed_fact_rate: 0.05, incorrect_reading_rate: 0, require_baseline: true } }).passed, true, 'C1: missed_fact_rate exactly at the 5% boundary is accepted');
  check.equal(validator.validateCapabilityEvidence(Object.assign({}, genuine, { benchmark: { missed_fact_rate: 0.051, incorrect_reading_rate: 0, baseline: 'b' } }), { targetBuildId: TARGET, benchmark: { missed_fact_rate: 0.05, incorrect_reading_rate: 0, require_baseline: true } }).passed, false, 'C1: missed_fact_rate just above 5% is rejected');
  // Missing, invalid and non-finite metrics are rejected (not silently accepted).
  check.equal(validator.validateCapabilityEvidence(Object.assign({}, genuine, { benchmark: { missed_fact_rate: NaN, incorrect_reading_rate: 0 } }), { targetBuildId: TARGET, benchmark: { missed_fact_rate: 0.05 } }).passed, false, 'C1: a NaN missed_fact_rate is rejected');
  check.equal(validator.validateCapabilityEvidence(Object.assign({}, genuine, { benchmark: { missed_fact_rate: 0, incorrect_reading_rate: Infinity } }), { targetBuildId: TARGET, benchmark: { incorrect_reading_rate: 0 } }).passed, false, 'C1: an infinite incorrect_reading_rate is rejected');
  check.equal(validator.validateCapabilityEvidence(Object.assign({}, genuine, { benchmark: { missed_fact_rate: -0.1, incorrect_reading_rate: 0 } }), { targetBuildId: TARGET, benchmark: { missed_fact_rate: 0.05 } }).passed, false, 'C1: a negative missed_fact_rate is rejected');
  check.equal(validator.validateCapabilityEvidence(Object.assign({}, fdtGenuine, { acceptance: { recovery_rate: NaN, incorrect_decisive_facts: 0, cross_record_or_bureau_borrowing: 0, unsupported_legal_findings: 0 } }), { targetBuildId: TARGET, acceptance: { min_recovery_rate: 0.95 } }).passed, false, 'C1: a NaN recovery_rate is rejected');
  check.equal(validator.validateCapabilityEvidence(Object.assign({}, fdtGenuine, { acceptance: { recovery_rate: 1.5, incorrect_decisive_facts: 0, cross_record_or_bureau_borrowing: 0, unsupported_legal_findings: 0 } }), { targetBuildId: TARGET, acceptance: { min_recovery_rate: 0.95 } }).passed, false, 'C1: a recovery_rate above 100% is rejected');



  /* ------------------------------------------------ C2: unique grid-cell association */
  const tie = grid.zipHeaderToCells(
    [{ text: '2024-01', x0: 0, x1: 10 }, { text: '2024-02', x0: 20, x1: 30 }],
    [{ text: '30', x0: 10, x1: 20 }],
    [{ code: '30', meaning: '30 days late' }]
  );
  check.equal(tie.filter((c) => c.code === '30').length, 0, 'C2: an equidistant code is never accepted for two periods');
  check.ok(tie.every((c) => c.uncertain === true), 'C2: both periods stay unresolved for a tie');

  const clean = grid.zipHeaderToCells(
    [{ text: '2024-01', x0: 0, x1: 10 }, { text: '2024-02', x0: 20, x1: 30 }],
    [{ text: 'OK', x0: 0, x1: 10 }, { text: '30', x0: 20, x1: 30 }],
    [{ code: 'OK', meaning: 'Paid as agreed' }, { code: '30', meaning: '30 days late' }]
  );
  check.deepEqual(clean.map((c) => c.code), ['OK', '30'], 'C2: a clean one-to-one alignment associates each cell with one period');

  const missingMiddle = grid.zipHeaderToCells(
    [{ text: '2024-01', x0: 0, x1: 10 }, { text: '2024-02', x0: 20, x1: 30 }, { text: '2024-03', x0: 40, x1: 50 }],
    [{ text: 'OK', x0: 0, x1: 10 }, { text: '30', x0: 40, x1: 50 }],
    [{ code: 'OK', meaning: 'Paid as agreed' }, { code: '30', meaning: '30 days late' }]
  );
  check.equal(missingMiddle.find((c) => c.period === '2024-02').code, null, 'C2: a missing middle cell stays unresolved');

  const ocrUnits = grid.zipHeaderToCells(
    [{ text: '2024-01', x0: 0, x1: 100 }, { text: '2024-02', x0: 200, x1: 300 }],
    [{ text: 'OK', x0: 0, x1: 100 }, { text: '30', x0: 200, x1: 300 }],
    [{ code: 'OK', meaning: 'Paid as agreed' }, { code: '30', meaning: '30 days late' }]
  );
  check.deepEqual(ocrUnits.map((c) => c.code), ['OK', '30'], 'C2: OCR-pixel coordinate units resolve from local spacing, not a fixed 40-unit threshold');


  /* ------------------------------------------------ C3: grid confidence and provenance */
  const lowConf = grid.zipHeaderToCells(
    [{ text: '2024-01', x0: 0, x1: 10 }],
    [{ text: '30', x0: 0, x1: 10, trusted: false, confidence: 1 }],
    [{ code: '30', meaning: '30 days late' }]
  );
  check.equal(lowConf[0].code, null, 'C3: a confidence-1 OCR code is withheld');
  check.equal(lowConf[0].raw_code, '30', 'C3: the uncertain raw reading is preserved');
  check.equal(lowConf[0].reason, 'BELOW_CONFIDENCE_FLOOR', 'C3: with the trust reason recorded');

  const reliable = grid.zipHeaderToCells(
    [{ text: '2024-01', x0: 0, x1: 10 }],
    [{ text: '30', x0: 0, x1: 10, trusted: true, confidence: 96 }],
    [{ code: '30', meaning: '30 days late' }]
  );
  check.equal(reliable[0].code, '30', 'C3: a reliable OCR code is accepted');
  check.equal(reliable[0].meaning, '30 days late', 'C3: and decoded from the printed legend');

  /* ------------------------------------------------ C4: account/bureau boundary + continuation */
  const rows = [
    { y0: 0, words: [{ text: 'Payment', x0: 40, x1: 90 }, { text: 'History', x0: 100, x1: 150 }] },
    { y0: 20, words: [{ text: 'JAN', x0: 40, x1: 60 }, { text: 'OK', x0: 110, x1: 130 }] },
    { y0: 40, words: [{ text: 'Creditor', x0: 40, x1: 90 }, { text: 'B', x0: 100, x1: 110 }, { text: 'Opened', x0: 112, x1: 160 }] },
    { y0: 60, words: [{ text: 'Key:', x0: 40, x1: 70 }, { text: 'OK=Paid', x0: 80, x1: 140 }] }
  ];
  const v = grid.verticalGrid(rows, 0);
  check.equal(v.legend.length, 0, 'C4: a legend below the next account line is not borrowed');

  const twoPrior = grid.assembleGrids([
    { page: 1, source: 'NATIVE_TEXT', lines: [{ text: 'Equifax Consumer Credit Report' }, { text: 'Report Date: June 12, 2026' }], words: [
      { text: 'Creditor', x0: 40, y0: 10 }, { text: 'A', x0: 100, y0: 10 },
      { text: 'Payment', x0: 40, y0: 30 }, { text: 'History', x0: 100, y0: 30 },
      { text: 'JAN', x0: 40, y0: 50 }, { text: 'OK', x0: 40, y0: 70 },
      { text: 'Creditor', x0: 40, y0: 100 }, { text: 'B', x0: 100, y0: 100 },
      { text: 'Payment', x0: 40, y0: 120 }, { text: 'History', x0: 100, y0: 120 },
      { text: 'JAN', x0: 40, y0: 140 }, { text: 'OK', x0: 40, y0: 160 }
    ] },
    { page: 2, source: 'NATIVE_TEXT', lines: [{ text: 'Payment History Continued' }], words: [
      { text: 'Payment', x0: 40, y0: 30 }, { text: 'History', x0: 100, y0: 30 }, { text: 'Continued', x0: 160, y0: 30 },
      { text: 'JAN', x0: 40, y0: 50 }, { text: 'OK', x0: 40, y0: 70 }
    ] }
  ]);
  const page2Grid = twoPrior.find((g) => g.page === 2);
  check.ok(!page2Grid || page2Grid.account == null, 'C4: with two grids on the prior page the continuation is ambiguous and unresolved');

  /* ------------------------------------------------ C5: material clarification */
  check.equal(clarification.eligibleQuestions([]).length, 0, 'C5: no records -> no questions');
  check.equal(clarification.eligibleQuestions([{ facts: { 'account.reported_identity': 'CREDITOR A', 'account.responsibility': 'INDIVIDUAL' } }]).length, 0, 'C5: a resolved responsibility produces no material question');
  check.equal(clarification.eligibleQuestions([{record_index:1,facts:{'account.reported_identity':'CREDITOR A'}}]).length, 0, 'owner: missing responsibility does not trigger a context-only question');
  check.equal(clarification.eligibleQuestions([{facts:{'account.reported_identity':'A'}},{facts:{'account.reported_identity':'B'}}]).length, 0, 'owner: more accounts do not manufacture material questions');
  check.equal(clarification.activeQuestions([{id:'account-responsibility',account:'A'},{id:'account-purpose',account:'B'}]).length, 0, 'owner: retired stored prompts are not displayed');

  // No default "individual": an unanswered choice is not recorded.
  check.equal(clarification.validateAnswers([{ question_id: 'account-responsibility', account: 'CREDITOR A', answer: '' }]).length, 0, 'C5: an unanswered question is never defaulted to "individual"');

  // Separate "I don't know" and "Skip" answers for SEPARATE accounts are preserved independently.
  const perAccount = clarification.validateAnswers([
    { question_id: 'account-responsibility', account: 'CREDITOR A', answer: 'I_DONT_KNOW', outcome: 'a' },
    { question_id: 'account-responsibility', account: 'CREDITOR B', answer: 'SKIP', outcome: 'b' }
  ]);
  check.equal(perAccount.length, 2, 'C5: separate accounts keep separate answers');
  check.equal(perAccount[0].account, 'CREDITOR A', 'C5: first answer names its account');
  check.equal(perAccount[0].answer, 'I_DONT_KNOW', 'C5: with "I don\'t know"');
  check.equal(perAccount[1].account, 'CREDITOR B', 'C5: second answer names its account');
  check.equal(perAccount[1].answer, 'SKIP', 'C5: with "Skip"');
  // Historical compatibility: eligibility stored before the per-account question_key gets safe derived keys.
  const historical = clarification.normalizeQuestions([
    { id: 'account-purpose', plain: 'Which account is this report about?', benefit: '…', answer_kind: 'free_text', has_dont_know: true, has_skip: true },
    { id: 'account-responsibility', plain: 'On this account, are you…?', benefit: '…', answer_kind: 'choice', choices: ['individual', 'joint', 'authorized_user'], has_dont_know: true, has_skip: true }
  ]);
  check.equal(historical.length, 2, 'C5: historical eligibility rows are retained');
  check.equal(historical[0].question_key, 'account-purpose|', 'C5: a historical free-text question gets a safe derived key');
  check.equal(historical[1].question_key, 'account-responsibility|', 'C5: and the choice question gets a distinct derived key');
  check.ok(historical.every((q) => !q.requires_reassessment), 'C5: distinct historical ids never collide');
  // A collision (same id, no account/record index) requires reassessment, never colliding controls.
  const collision = clarification.normalizeQuestions([
    { id: 'account-responsibility', answer_kind: 'choice', choices: ['individual'] },
    { id: 'account-responsibility', answer_kind: 'choice', choices: ['individual'] }
  ]);
  check.equal(collision[0].question_key, 'account-responsibility|', 'C5: the first duplicate keeps its derived key');
  check.equal(collision[1].requires_reassessment, true, 'C5: a colliding duplicate is marked for reassessment, never rendered as a colliding control');
  check.equal(collision[1].question_key, null, 'C5: with no question_key on the colliding row');

  check.equal(perAccount[0].outcome, 'a', 'C5: the answer records the outcome it enables');

  // An arbitrary choice value is refused; a valid choice is accepted.
  const answers = clarification.validateAnswers([
    { question_id: 'account-responsibility', account: 'CREDITOR A', answer: 'individual' },
    { question_id: 'account-responsibility', account: 'CREDITOR A', answer: 'NOT_A_VALID_CHOICE' }
  ]);
  check.equal(answers.length, 1, 'C5: an arbitrary choice value is refused');
  check.equal(answers[0].answer, 'individual', 'C5: and the valid choice is accepted');
  const longText = clarification.validateAnswers([{ question_id: 'account-purpose', account: 'CREDITOR A', answer: 'x'.repeat(500) }]);
  check.ok(longText[0].answer.length <= clarification.FREE_TEXT_MAX, 'C5: free text is length-bounded');

  /* ------------------------------------------------ C5: browser-faithful special-answer controls */
  // The retest found the browser converts an I_DONT_KNOW/SKIP assignment to '' because the <select> contained
  // neither option. Recreate that select semantics, render the two-account clarification, click "I don't know"
  // on account A and "Skip" on account B, submit, and confirm the two answers survive.
  const uiSource = fsNode.readFileSync(path.join(__dirname, '..', '..', 'ui', 'app.js'), 'utf8');
  const VIEW = {
  assessment_access: { complete_assessment: true, complete_assessment_via: 'SUBSCRIPTION', assessment_download: true, dispute_packet: true, purchase_choices: [] },
  assessment_summary: { result_id: 'res_ap', created_at: '2026-10-05T00:00:00.000Z', distinct_total: 1, by_confidence: { violation: 1, probable_violation: 0, potential: 0 }, teaser: null, severity_order: ['REMOVE_ENTRY', 'ADD_CONTENT', 'INCONSISTENCY'] },
    result_id: 'r-browser',
    case: { country: 'US', region: 'US-NY' },
    result: { support: 'REPORT_SUPPORT', checks_performed: 0, observations: [], qualifications: [], disclaimer: 'This assessment covers the checks listed in this report.', assessment: { plain: '' } },
    clarifications: [],
    clarification_questions: [
      { id: 'account-responsibility', question_key: 'account-responsibility|CREDITOR A', account: 'CREDITOR A', plain: 'On the account reported as CREDITOR A, are you individually responsible, jointly responsible, or only an authorised user?', benefit: 'To distinguish your own accounts.', answer_kind: 'choice', choices: ['individual', 'joint', 'authorized_user'], outcome: 'a' },
      { id: 'account-responsibility', question_key: 'account-responsibility|CREDITOR B', account: 'CREDITOR B', plain: 'On the account reported as CREDITOR B, are you individually responsible, jointly responsible, or only an authorised user?', benefit: 'To distinguish your own accounts.', answer_kind: 'choice', choices: ['individual', 'joint', 'authorized_user'], outcome: 'b' }
    ]
  };
  function makeSelect(options) {
    const node = { options, _value: '' };
    Object.defineProperty(node, 'value', {
      get() { return node._value; },
      set(v) { node._value = options.includes(v) ? v : ''; } /* HTML spec: a non-option value clears the select */
    });
    return node;
  }
  const domNodes = new Map();
  const postedBodies = [];
  const requestedUrls = [];
  const getNode = (id) => {
    if (!domNodes.has(id)) domNodes.set(id, { id, innerHTML: '', textContent: '', className: '', value: '', disabled: false, style: {}, dataset: {}, files: [], onclick: null, onchange: null, scrollIntoView() {}, querySelectorAll: () => [], querySelector: () => null });
    return domNodes.get(id);
  };
  const panelNode = getNode('panel');
  const dontKnowButtons = [{ dataset: { dontknow: 'account-responsibility|CREDITOR A' }, onclick: null }, { dataset: { dontknow: 'account-responsibility|CREDITOR B' }, onclick: null }];
  const skipButtons = [{ dataset: { skip: 'account-responsibility|CREDITOR A' }, onclick: null }, { dataset: { skip: 'account-responsibility|CREDITOR B' }, onclick: null }];
  panelNode.querySelectorAll = (sel) => (sel === '[data-dontknow]' ? dontKnowButtons : sel === '[data-skip]' ? skipButtons : []);
  domNodes.set('q-account-responsibility|CREDITOR A', makeSelect(['individual', 'joint', 'authorized_user', 'I_DONT_KNOW', 'SKIP']));
  domNodes.set('q-account-responsibility|CREDITOR B', makeSelect(['individual', 'joint', 'authorized_user', 'I_DONT_KNOW', 'SKIP']));
  const ctx = {
    console, setTimeout, clearTimeout, JSON, Object, Array, Map, Set, Promise, Number, String, Date, Error, RegExp,
    fetch: async (url, options) => {
      requestedUrls.push(url);
      if ((options && options.method) === 'POST' && /clarify/.test(url)) postedBodies.push(JSON.parse(options.body));
      return { ok: true, status: 200, json: async () => ({ ok: true, view: VIEW, results: [{ result_id: 'r-browser', created_at: '2026-10-02T00:00:00Z' }, { result_id: 'r-newer', created_at: '2026-10-03T00:00:00Z' }] }), text: async () => '{}' };
    },
    document: { getElementById: getNode, createElement: getNode, modelContext: undefined },
    URL: { createObjectURL: () => 'blob:stub', revokeObjectURL: () => {} },
    Blob: class Blob {},
    FileReader: class FileReader { readAsDataURL() { this.result = 'data:application/pdf;base64,JVBERi0='; this.onload(); } }
  };
  ctx.window = ctx;
  ctx.window.location = { assign: () => {} };
  ctx.globalThis = ctx;
  ctx.VIEW = VIEW;
  vm.createContext(ctx);
  vm.runInContext(uiSource, ctx, { filename: 'app.js' });
  vm.runInContext("state.caseId = 'case-browser'; state.view = VIEW; state.step = 3; render();", ctx);
  check.ok(/<option value="I_DONT_KNOW">/.test(panelNode.innerHTML), 'C5: the choice select carries a real I_DONT_KNOW option so the browser keeps the value');
  check.ok(/<option value="SKIP">/.test(panelNode.innerHTML), 'C5: and a real SKIP option');
  dontKnowButtons[0].onclick(); /* "I don't know" on CREDITOR A */
  skipButtons[1].onclick();    /* "Skip" on CREDITOR B */
  getNode('clarify-submit').onclick();
  await new Promise((r) => setTimeout(r, 0));
  check.equal(postedBodies.length, 1, 'C5: Save my answers submits exactly one clarify request');
  const submitted = postedBodies[0] && postedBodies[0].answers ? postedBodies[0].answers : [];
  check.equal(submitted.length, 2, 'C5: two separately stored account answers are submitted');
  const byAccount = Object.fromEntries(submitted.map((a) => [a.account, a.answer]));
  check.equal(byAccount['CREDITOR A'], 'I_DONT_KNOW', "C5: the first account stores I don't know, not an empty string");
  check.equal(byAccount['CREDITOR B'], 'SKIP', 'C5: the second account stores Skip, not an empty string');
  check.ok(requestedUrls.includes('/api/cases/case-browser/results/r-browser/view'), 'C5: saving historical answers refreshes the selected result rather than the latest');
  check.equal(getNode('result-select').value, 'r-browser', 'C5: the selector displays the historical result actually being shown after save');
  check.ok(!getNode('result-select').innerHTML.includes('Latest · '), 'C5: a selected historical result is not mislabeled Latest');

  /* ------------------------------------------------ C5: historical-result clarification path (HTTP) */
  // An explicitly selected, owned result must expose its OWN normalized eligibility + answers; never the latest.
  const histOwner = await t.account('accept010-hist-owner@example.test');
  const histCase = (await t.request('POST', '/api/cases', { token: histOwner.token, body: { country: 'US', region: 'US-NY' } })).json.case;
  const pdf1 = buildPdf({ pages: [{ lines: ['Equifax Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor A Opened 01/01/2015'] }] });
  await t.request('POST', `/api/cases/${histCase.case_id}/files`, { token: histOwner.token, body: { originalFilename: 'h1.pdf', declaredBytes: pdf1.length, mimeType: 'application/pdf', contentBase64: pdf1.toString('base64') } });
  const eval1 = (await t.request('POST', `/api/cases/${histCase.case_id}/evaluate`, { token: histOwner.token })).json;
  const pdf2 = buildPdf({ pages: [{ lines: ['Equifax Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor B Opened 02/02/2019'] }] });
  await t.request('POST', `/api/cases/${histCase.case_id}/files`, { token: histOwner.token, body: { originalFilename: 'h2.pdf', declaredBytes: pdf2.length, mimeType: 'application/pdf', contentBase64: pdf2.toString('base64') } });
  const eval2 = (await t.request('POST', `/api/cases/${histCase.case_id}/evaluate`, { token: histOwner.token })).json;
  const histView1 = (await t.request('GET', `/api/cases/${histCase.case_id}/results/${eval1.result_id}/view`, { token: histOwner.token })).json;
  check.equal(histView1.view.result_id, eval1.result_id, 'C5: an explicitly selected result exposes its own result identity (not the latest)');
  check.notEqual(eval1.result_id, eval2.result_id, 'C5: the two results have distinct identities');
  check.ok(Array.isArray(histView1.view.clarification_questions), 'C5: the selected historical result exposes its clarification questions');
  // Ownership: a different account cannot read the other account's result view.
  const intruder = await t.account('accept010-hist-intruder@example.test');
  const denied = await t.request('GET', `/api/cases/${histCase.case_id}/results/${eval1.result_id}/view`, { token: intruder.token });
  check.ok(denied.status >= 400, 'C5: cross-account access to a result view is refused');


  evidence.c1_validator = true;
  evidence.c2_unique_cells = true;
  evidence.c3_confidence = true;
  evidence.c4_boundary = true;
  evidence.c5_clarification = true;
  return evidence;
}

module.exports = { run, id: 'ap-accept-010-consistency', title: 'OWNER-ACCEPT-010: build consistency C1-C5' };
