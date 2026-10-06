// build_001r_determinism_check.js — PHASE5-001R deliverable 5.
//
// The internal determinism check. Every case below is synthetic and in memory: no report is read, no specimen
// is opened, and nothing here is presentation evidence. The check RUNS the specification's executable form and
// compares what it returns with what the specification declares, so "deterministic" is measured rather than
// asserted. The legally reviewed fixture suite and the independent replay sample belong to Gate 5.6 and are
// expressly excluded here.
//
// Writes only internal_determinism_check.json inside this order's own package.

const fs = require('fs');
const path = require('path');

const ROOT = 'C:\\CRP-NEW';
const OUT = path.join(ROOT, 'SOURCE_CAPTURES', 'PHASE5-001R');
const readText = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const readJson = (rel) => JSON.parse(readText(rel));

const ruleRecord = readJson('SOURCE_CAPTURES\\PHASE5-001Q\\rule_record.json');
const E = require('./evaluator_001r.cjs');

const admittedCopy = JSON.parse(JSON.stringify(ruleRecord));
admittedCopy.admission_state = Object.assign({}, ruleRecord.admission_state, { state: 'ADMITTED' });

const mapping = () => ({
  last_payment_fact: { fact_id: 'collection.lastPaymentDate', printed_label: 'Last Payment Date' },
  reference_date_input: { fact_id: 'report.referenceDate', printed_label: 'Request Date' },
});
const eligible = () => ({ presentation_id: 'PR-01', sha256: E.PRESENTATION_SHA256, document_state: E.DOCUMENT_STATE.ELIGIBLE });
const selection = () => ({ country_code: 'CA', region_code: 'CA-NS' });
const headers = (tokens) => ({ label_present_on_pages: tokens.map((_, i) => i + 1), page_count: tokens.length, tokens });
const debtRecord = (overrides) => Object.assign({
  record_index: 2, record_disposition: E.RECORD_DISPOSITION.CONTRACT_DEBT_RECORD,
  label_occurrences: [{ token: '2021/02/01', value_present: true }],
}, overrides || {});
const evaluateInput = (overrides) => Object.assign({
  selection: selection(), presentation: eligible(), declared_event_date_mapping: mapping(),
  report: { page_count: 22, reference_date_observation: headers(['2026/05/05']), collections: { section_state: 'RESOLVED', contract_debt_records: [debtRecord()] } },
  rule_record: ruleRecord,
}, overrides || {});

const cases = [];
const statusOf = (factId, observation) => {
  const r = E.resolveFactStatus(factId, observation);
  return { status: r.status, reason: r.reason };
};
const cmp = (a, b) => {
  const r = E.compare(a, b);
  return { comparison_outcome: r.comparison_outcome, reason: r.reason, anniversary: r.anniversary, span_in_days: r.span_in_days, elapsed_days: r.elapsed_days, boundary_case: r.boundary_case };
};
const evalSummary = (input) => {
  const r = E.evaluate(input);
  const first = (r.facts.last_payment && r.facts.last_payment.per_record[0]) || null;
  return {
    refusal: r.refusal, outcome: r.outcome, emission: r.emission.state, first_failing_gate: r.first_failing_gate,
    fact_layer: r.facts.state, comparison_layer: r.comparisons.state,
    last_payment_status: first ? first.last_payment_fact.status : null,
    last_payment_reason: first ? first.last_payment_fact.reason : null,
    reference_status: r.facts.reference_date ? r.facts.reference_date.status : null,
    unit_level_status: r.facts.last_payment && r.facts.last_payment.unit_level ? r.facts.last_payment.unit_level.status : null,
    ceiling: r.observation_eligibility.permitted_result_ceiling,
    boundary_mandatory_here: r.applicability_and_qualifications.qualifications.boundary.mandatory_here,
  };
};
const stable = (v) => {
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
  return JSON.stringify(v === undefined ? null : v);
};
function check(id, name, syntheticInput, run, expected, againstTheRecordsOwnTest) {
  const observed = run();
  cases.push({ id, name, synthetic_input: syntheticInput, expected, observed, passed: stable(observed) === stable(expected), against_the_rule_records_own_test: againstTheRecordsOwnTest });
}

// ---------------------------------------------------------------- the comparison layer, arithmetic
check('D-01', 'the evidenced specimen reproduces the record\'s own measured arithmetic',
  { clock_start: '2021-02-01', reference_date: '2026-05-05' },
  () => cmp('2021-02-01', '2026-05-05'),
  { comparison_outcome: 'PERIOD_NOT_EXCEEDED', reason: null, anniversary: '2027-02-01', span_in_days: 2191, elapsed_days: 1919, boundary_case: null },
  'conforms to the record\'s deterministic_breach_test.arithmetic.measured_on_the_specimen, which records the same four numbers');

check('D-02', 'the exact sixth-anniversary day is WITHHELD: the boundary case is returned and no outcome is produced',
  { clock_start: '2021-02-01', reference_date: '2027-02-01' },
  () => cmp('2021-02-01', '2027-02-01'),
  { comparison_outcome: 'UNRESOLVED', reason: 'THE_REFERENCE_DATE_IS_THE_SIXTH_ANNIVERSARY_AND_THE_TEXT_DOES_NOT_SETTLE_INCLUSION', anniversary: '2027-02-01', span_in_days: 2191, elapsed_days: 2191, boundary_case: 'BOUNDARY_CASE_EXACTLY_AT_SIX_YEAR_ANNIVERSARY' },
  'conforms to convention c6 and to the record\'s boundary_treatment. This is the behaviour the internal comparator of PHASE5-001I-A does NOT have, and the record does not adopt its contrary reading.');

check('D-03', 'the day before the sixth anniversary is not exceeded',
  { clock_start: '2021-02-01', reference_date: '2027-01-31' },
  () => cmp('2021-02-01', '2027-01-31'),
  { comparison_outcome: 'PERIOD_NOT_EXCEEDED', reason: null, anniversary: '2027-02-01', span_in_days: 2191, elapsed_days: 2190, boundary_case: null },
  'conforms to conventions c4 and c5');

check('D-04', 'the day after the sixth anniversary is exceeded',
  { clock_start: '2021-02-01', reference_date: '2027-02-02' },
  () => cmp('2021-02-01', '2027-02-02'),
  { comparison_outcome: 'PERIOD_EXCEEDED', reason: null, anniversary: '2027-02-01', span_in_days: 2191, elapsed_days: 2192, boundary_case: null },
  'conforms to convention c5, and records that an exceeded period is an arithmetic result and not a finding');

check('D-05', 'the 29 February clamp: a leap-day start clamps to 28 February, and the clamped day is itself the withheld boundary',
  { clock_start: '2020-02-29', reference_date: '2026-02-28' },
  () => cmp('2020-02-29', '2026-02-28'),
  { comparison_outcome: 'UNRESOLVED', reason: 'THE_REFERENCE_DATE_IS_THE_SIXTH_ANNIVERSARY_AND_THE_TEXT_DOES_NOT_SETTLE_INCLUSION', anniversary: '2026-02-28', span_in_days: 2191, elapsed_days: 2191, boundary_case: 'BOUNDARY_CASE_EXACTLY_AT_SIX_YEAR_ANNIVERSARY' },
  'conforms to conventions c2 and c6, exercised on a leap-day start as the record requires');

check('D-06', 'the day after the clamped anniversary is exceeded',
  { clock_start: '2020-02-29', reference_date: '2026-03-01' },
  () => cmp('2020-02-29', '2026-03-01'),
  { comparison_outcome: 'PERIOD_EXCEEDED', reason: null, anniversary: '2026-02-28', span_in_days: 2191, elapsed_days: 2192, boundary_case: null },
  'conforms to conventions c2 and c5');

check('D-07', 'the day before the clamped anniversary is not exceeded',
  { clock_start: '2020-02-29', reference_date: '2026-02-27' },
  () => cmp('2020-02-29', '2026-02-27'),
  { comparison_outcome: 'PERIOD_NOT_EXCEEDED', reason: null, anniversary: '2026-02-28', span_in_days: 2191, elapsed_days: 2190, boundary_case: null },
  'conforms to conventions c2 and c5');

check('D-08', 'a reference date before the printed last payment date does not compare',
  { clock_start: '2021-02-01', reference_date: '2020-12-31' },
  () => cmp('2021-02-01', '2020-12-31'),
  { comparison_outcome: 'UNRESOLVED', reason: 'REFERENCE_DATE_PRECEDES_THE_STATED_LAST_PAYMENT', anniversary: '2027-02-01', span_in_days: 2191, elapsed_days: -32, boundary_case: null },
  'the record does not address this shape; the specification names it as one named unresolved state rather than leaving it to the raw arithmetic');

// ---------------------------------------------------------------- the status layer, per fact and per record
const expBase = {
  refusal: 'REFUSED_RULE_RECORD_NOT_ADMITTED', outcome: null, emission: 'NOT_EMITTED',
  first_failing_gate: 'G6_RULE_RECORD_ADMITTED', fact_layer: 'RUN', comparison_layer: 'NOT_RUN',
  last_payment_status: 'PRESENT', last_payment_reason: null, reference_status: 'PRESENT',
  unit_level_status: null, ceiling: 'OBSERVATION_CLASS_ONLY', boundary_mandatory_here: false,
};
const exp = (over) => Object.assign({}, expBase, over || {});
const notRun = {
  refusal: 'REFUSED_UNSUPPORTED_PRESENTATION', outcome: null, emission: 'NOT_EMITTED',
  first_failing_gate: 'G3_PRESENTATION_ELIGIBILITY', fact_layer: 'NOT_RUN_DOCUMENT_OR_MAPPING_GATE_FAILED',
  comparison_layer: 'NOT_RUN', last_payment_status: null, last_payment_reason: null, reference_status: null,
  unit_level_status: null, ceiling: 'OBSERVATION_CLASS_ONLY', boundary_mandatory_here: false,
};
const reportWith = (records, tokens) => ({
  page_count: tokens.length,
  reference_date_observation: headers(tokens),
  collections: { section_state: 'RESOLVED', contract_debt_records: records },
});

check('D-09', 'a contract debt record that prints no Last Payment Date label leaves the fact unresolved and never absent',
  { record: 'a contract debt record with zero label occurrences' },
  () => evalSummary(evaluateInput({ report: reportWith([debtRecord({ label_occurrences: [] })], ['2026/05/05']) })),
  exp({ last_payment_status: 'EXTRACTION_UNRESOLVED', last_payment_reason: 'LABEL_NOT_PRINTED_ON_RECORD' }),
  'conforms to the record\'s report-required-facts rule: a missing value is EXTRACTION_UNRESOLVED and never ABSENT_FROM_REPORT');

check('D-10', 'a label printed twice in one record leaves the fact unresolved',
  { record: 'one contract debt record printing the label twice, with identical values' },
  () => evalSummary(evaluateInput({ report: reportWith([debtRecord({ label_occurrences: [{ token: '2021/02/01', value_present: true }, { token: '2021/02/01', value_present: true }] })], ['2026/05/05']) })),
  exp({ last_payment_status: 'EXTRACTION_UNRESOLVED', last_payment_reason: 'LABEL_PRINTED_MORE_THAN_ONCE_IN_RECORD' }),
  'conforms to the record\'s own binding rule verbatim: a label printed twice in one record leaves the fact unresolved, even where the two printed values are identical');

check('D-11', 'a label printed without a value leaves the fact unresolved',
  { record: 'the label present, no value after it' },
  () => evalSummary(evaluateInput({ report: reportWith([debtRecord({ label_occurrences: [{ token: '', value_present: false }] })], ['2026/05/05']) })),
  exp({ last_payment_status: 'EXTRACTION_UNRESOLVED', last_payment_reason: 'LABEL_PRINTED_WITHOUT_VALUE' }),
  'conforms to the fact model: a blank value is not a value and is not an absence');

check('D-12', 'a value that is not in the presentation\'s printed form is unresolved',
  { record: 'a printed value in a foreign form' },
  () => evalSummary(evaluateInput({ report: reportWith([debtRecord({ label_occurrences: [{ token: '01/02/2021', value_present: true }] })], ['2026/05/05']) })),
  exp({ last_payment_status: 'EXTRACTION_UNRESOLVED', last_payment_reason: 'VALUE_NOT_A_WELL_FORMED_PRINTED_DATE' }),
  'conforms to the fact model: the only accepted printed form is the presentation\'s own, and a foreign form is never guessed at');

check('D-13', 'a resolved Collections section printing no contract debt record is the single ABSENT_FROM_REPORT path',
  { section: 'resolved, and no contract debt record printed' },
  () => evalSummary(evaluateInput({ report: reportWith([], ['2026/05/05']) })),
  exp({ last_payment_status: null, unit_level_status: 'ABSENT_FROM_REPORT' }),
  'conforms to the record\'s absence_path, which has exactly this one path. It is a resolved reading, not a parser silence.');

check('D-14', 'a Request Date that differs between pages is CONTRADICTED, not unknown',
  { header: 'two pages, two different printed Request Dates' },
  () => evalSummary(evaluateInput({ report: reportWith([debtRecord()], ['2026/05/05', '2026/05/06']) })),
  exp({ reference_status: 'CONTRADICTED' }),
  'conforms to the gate\'s four-status vocabulary, which names CONTRADICTED as a status of its own. The internal comparator folds this shape into EXTRACTION_UNRESOLVED and is not adopted here.');

check('D-15', 'a header label missing from one page leaves the reference date unresolved',
  { header: 'present on one page of two' },
  () => evalSummary(evaluateInput({ report: { page_count: 2, reference_date_observation: { label_present_on_pages: [1], page_count: 2, tokens: ['2026/05/05'] }, collections: { section_state: 'RESOLVED', contract_debt_records: [debtRecord()] } } })),
  exp({ reference_status: 'EXTRACTION_UNRESOLVED' }),
  'conforms to the record\'s reading rule: the same value must appear on every page, or the comparison does not run');

// ---------------------------------------------------------------- the gate chain, and the emission closure
check('D-16', 'a PR-01-shaped document that is not the evidenced specimen is refused, and no fact status is produced',
  { presentation: 'the documented contract shape at a different digest' },
  () => evalSummary(evaluateInput({ presentation: { presentation_id: 'PR-01', sha256: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', document_state: 'ELIGIBLE' } })),
  notRun,
  'conforms to the scope\'s admission boundary: structural similarity admits nothing, and a refused document is never reported as an empty report');

check('D-17', 'an image-only or text-less document is refused as an unsupported presentation',
  { presentation: 'the evidenced digest, but the document carries no native text' },
  () => evalSummary(evaluateInput({ presentation: { presentation_id: 'PR-01', sha256: E.PRESENTATION_SHA256, document_state: 'REFUSED', document_refusal_cause: 'IMAGE_ONLY_OR_NO_TEXT_LAYER' } })),
  notRun,
  'conforms to the record: no OCR is performed and a document that cannot be read is refused, not searched');

check('D-18', 'an absent jurisdiction selection is refused before anything else is read',
  { selection: 'none' },
  () => evalSummary(evaluateInput({ selection: {} })),
  exp({ refusal: 'REFUSED_NO_JURISDICTION_SELECTION_SUPPLIED', first_failing_gate: 'G1_JURISDICTION_SELECTION_SUPPLIED', fact_layer: 'NOT_RUN_DOCUMENT_OR_MAPPING_GATE_FAILED', last_payment_status: null, reference_status: null }),
  'conforms to the constitution\'s rule that jurisdiction is never inferred: an absent selection is a refusal, never a guess from the report');

check('D-19', 'a selection outside CA / CA-NS is refused',
  { selection: 'CA / ON' },
  () => evalSummary(evaluateInput({ selection: { country_code: 'CA', region_code: 'CA-ON' } })),
  exp({ refusal: 'REFUSED_JURISDICTION_NOT_AUTHORIZED_FOR_THIS_UNIT', first_failing_gate: 'G2_JURISDICTION_AUTHORIZED_FOR_THIS_UNIT', fact_layer: 'NOT_RUN_DOCUMENT_OR_MAPPING_GATE_FAILED', last_payment_status: null, reference_status: null }),
  'conforms to the scope: this unit is one jurisdiction, one unit, one limb, one presentation');

check('D-20', 'a declared mapping other than the recorded one is refused',
  { mapping: 'the last-payment role declared against Date Paid/Settled' },
  () => evalSummary(evaluateInput({ declared_event_date_mapping: { last_payment_fact: { fact_id: 'collection.lastPaymentDate', printed_label: 'Date Paid/Settled' }, reference_date_input: { fact_id: 'report.referenceDate', printed_label: 'Request Date' } } })),
  exp({ refusal: 'REFUSED_WRONG_EVENT_DATE_MAPPING', first_failing_gate: 'G4_EVENT_DATE_MAPPING', fact_layer: 'NOT_RUN_DOCUMENT_OR_MAPPING_GATE_FAILED', last_payment_status: null, reference_status: null }),
  'conforms to the gate\'s wrong-event-date-mapping condition: a printed date is read only through its own recorded event role');

check('D-21', 'an input resolving to the excluded second limb is refused as an unresolved affirmative element',
  { input: 'a no-payment-made assertion' },
  () => evalSummary(evaluateInput({ second_limb_input_present: true })),
  exp({ refusal: 'REFUSED_UNRESOLVED_AFFIRMATIVE_ELEMENT', first_failing_gate: 'G5_NO_UNRESOLVED_AFFIRMATIVE_ELEMENT' }),
  'conforms to the scope: the second limb is unseated and must not be inferred, defaulted or evaluated, so an input that would need it is refused after the document layer is read');

check('D-22', 'the operative state of this scope: a fully eligible document and an unadmitted rule record refuse, with no outcome',
  { rule_record: 'the governed rule record as it stands, NOT ADMITTED' },
  () => evalSummary(evaluateInput({})),
  exp({}),
  'conforms to the gate\'s unapproved-rules condition as a refusal behaviour, and records why no case in this check emits a result');

check('D-23', 'a synthetic input whose rule record is marked admitted passes the gate chain and still emits nothing',
  { rule_record: 'a synthetic in-memory copy marked ADMITTED — not an admission and not evidence of one' },
  () => evalSummary(evaluateInput({ rule_record: admittedCopy })),
  {
    refusal: null, first_failing_gate: null, fact_layer: 'RUN', comparison_layer: 'RUN',
    last_payment_status: 'PRESENT', last_payment_reason: null, reference_status: 'PRESENT',
    unit_level_status: null, ceiling: 'OBSERVATION_CLASS_ONLY', boundary_mandatory_here: false,
    emission: 'NOT_EMITTED_NO_CONSUMER_SURFACE_AND_NO_FINDING_CLASS_AUTHORIZED',
    outcome: {
      not_a_finding: true,
      per_record_comparisons: [{
        record_index: 2, clock_start: '2021-02-01', reference_date: '2026-05-05', anniversary: '2027-02-01',
        span_in_days: 2191, elapsed_days: 1919, comparison: 'elapsed_days > span_in_days',
        conventions_carried: ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'],
        comparison_outcome: 'PERIOD_NOT_EXCEEDED', reason: null, boundary_case: null,
      }],
    },
  },
  'demonstrates the second, structural closure: even with every gate passed, the ceiling is observation-class only, no finding class is available to this unit and no consumer surface exists, so nothing is emitted');

check('D-24', 'on the withheld day a fully eligible synthetic input reports the boundary case and still produces no outcome on that day',
  { reference_date: 'exactly the sixth anniversary, synthetic in-memory dates' },
  () => evalSummary(evaluateInput({ rule_record: admittedCopy, report: reportWith([debtRecord()], ['2027/02/01']) })),
  {
    refusal: null, first_failing_gate: null, fact_layer: 'RUN', comparison_layer: 'RUN',
    last_payment_status: 'PRESENT', last_payment_reason: null, reference_status: 'PRESENT',
    unit_level_status: null, ceiling: 'OBSERVATION_CLASS_ONLY', boundary_mandatory_here: true,
    emission: 'NOT_EMITTED_NO_CONSUMER_SURFACE_AND_NO_FINDING_CLASS_AUTHORIZED',
    outcome: {
      not_a_finding: true,
      per_record_comparisons: [{
        record_index: 2, clock_start: '2021-02-01', reference_date: '2027-02-01', anniversary: '2027-02-01',
        span_in_days: 2191, elapsed_days: 2191, comparison: 'elapsed_days > span_in_days',
        conventions_carried: ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'],
        comparison_outcome: 'UNRESOLVED',
        reason: 'THE_REFERENCE_DATE_IS_THE_SIXTH_ANNIVERSARY_AND_THE_TEXT_DOES_NOT_SETTLE_INCLUSION',
        boundary_case: 'BOUNDARY_CASE_EXACTLY_AT_SIX_YEAR_ANNIVERSARY',
      }],
    },
  },
  'conforms to convention c6 and records that the boundary qualification becomes mandatory exactly on that day');

check('D-25', 'the same synthetic inputs return identical records when re-run',
  { inputs: 'the specimen comparison, the boundary comparison and the unadmitted-rule evaluation, each run twice' },
  () => ({
    specimen: stable(E.compare('2021-02-01', '2026-05-05')) === stable(E.compare('2021-02-01', '2026-05-05')),
    boundary: stable(E.compare('2021-02-01', '2027-02-01')) === stable(E.compare('2021-02-01', '2027-02-01')),
    evaluation: stable(E.evaluate(evaluateInput({}))) === stable(E.evaluate(evaluateInput({}))),
  }),
  { specimen: true, boundary: true, evaluation: true },
  'determinism measured, not asserted: the executable form holds no module-level mutable state and reads nothing outside its arguments');

const forbiddenReads = [/new\s+Date\b/, /Date\s*\.\s*now/, /toLocale/, /\bIntl\b/, /process\s*\.\s*env/, /Math\s*\.\s*random/, /getTimezoneOffset/, /performance\s*\.\s*now/, /require\(\s*['"]os['"]\s*\)/, /require\(\s*['"]fs['"]\s*\)/];
check('D-26', 'the executable form reads no clock, locale, time zone, host, session, environment or random source',
  { file: 'SOURCE_CAPTURES\\PHASE5-001R\\evaluator_001r.cjs' },
  () => {
    const source = readText('SOURCE_CAPTURES\\PHASE5-001R\\evaluator_001r.cjs');
    const found = forbiddenReads.filter((re) => re.test(source)).map((re) => String(re));
    return { forbidden_reads_found: found, clean: found.length === 0 };
  },
  { forbidden_reads_found: [], clean: true },
  'the file is scanned as text: it must not reach for a clock, a locale, a time zone, the host environment or a random source, and it must not read the file system at all');

check('D-27', 'a section that prints the label only outside any contract debt record is unresolved, not absent',
  { section: 'resolved, no contract debt record, and a stray Last Payment Date label in the section preamble' },
  () => evalSummary(evaluateInput({ report: { page_count: 22, reference_date_observation: headers(['2026/05/05']), collections: { section_state: 'RESOLVED', contract_debt_records: [], stray_label_outside_any_contract_debt_record: true } } })),
  exp({ last_payment_status: null, unit_level_status: 'EXTRACTION_UNRESOLVED' }),
  'a refinement this order reached by reading the record\'s own reliability rule rather than by copying the internal comparator\'s test result: a value is never read outside a record, so a stray label leaves the fact unresolved and the section\'s clean absence reading is not available');

const crypto = require('crypto');
const failures = cases.filter((c) => !c.passed);
const emitted = cases.filter((c) => c.observed && c.observed.emission && c.observed.emission !== 'NOT_EMITTED' && c.observed.emission !== 'NOT_EMITTED_NO_CONSUMER_SURFACE_AND_NO_FINDING_CLASS_AUTHORIZED');
const execSource = readText('SOURCE_CAPTURES\\PHASE5-001R\\evaluator_001r.cjs');

const out = {
  artifact: 'internal_determinism_check.json',
  work_order: 'PHASE5-001R',
  created_utc: '2026-09-30',
  document_type: 'INTERNAL DETERMINISM CHECK — synthetic inputs only. NOT ADMITTED, no emission, no consumer-visible output',
  purpose: 'record the results of running the specification\'s executable form over synthetic inputs only, so that determinism, the refusal behaviour, the withheld boundary day and the clamp are measured rather than asserted',
  what_this_check_is: {
    inputs: 'synthetic, in-memory observations and synthetic in-memory inputs only. No report is opened, no specimen is read, no OCR is run and no consumer data exists anywhere in it.',
    subject: 'SOURCE_CAPTURES\\PHASE5-001R\\evaluator_001r.cjs, the executable form of deterministic_evaluator_specification.json',
    subject_sha256: crypto.createHash('sha256').update(execSource, 'utf8').digest('hex').toUpperCase(),
    rule_record_read: 'SOURCE_CAPTURES\\PHASE5-001Q\\rule_record.json, read as data and never as an admission',
    method: 'each case declares what the specification requires, runs the executable form, and compares the two. Key order is normalised; nothing else is.',
  },
  case_count: cases.length,
  failure_count: failures.length,
  failed_cases: failures.map((c) => ({ id: c.id, name: c.name, expected: c.expected, observed: c.observed })),
  verdict: failures.length === 0 ? 'ALL SYNTHETIC CASES MATCH THE SPECIFICATION' : 'CASE FAILURES PRESENT',
  cases,
  emission_tally: {
    cases_that_emitted_a_result: emitted.length,
    note: 'no case emits. Every case either returns a named refusal with no outcome, or returns an observation-class record whose emission state is ' + E.EMISSION.NO_CONSUMER_SURFACE_AND_NO_FINDING_CLASS_AUTHORIZED + '. That is the behaviour the gate\'s unapproved-rules and no-finding condition requires of this unit.',
  },
  cases_recorded_against_the_records_own_test: cases.filter((c) => c.against_the_rule_records_own_test).length,
  boundary_and_clamp_cases: cases.filter((c) => /boundary|anniversary|clamp|leap/i.test(c.name)).map((c) => ({ id: c.id, name: c.name, passed: c.passed })),
  what_this_check_is_not: [
    'it is not presentation evidence: no report was read, and a synthetic result is never evidence about a report',
    'it is not the legally reviewed fixture suite and not the independent replay sample: both are Gate 5.6 work (build plan lines 142 and 147) and both are expressly excluded from this order',
    'it is not a gate: it evidences one criterion of Gate 5.5 within one scope, and it passes no gate corpus-wide',
    'it does not authorize a finding class, create coverage or a candidate, or admit a rule',
  ],
  what_this_check_does_not_claim: [
    'it does not claim that any result rests on the admitted text: the rule record is NOT ADMITTED, and the admitted-rule copy used by two cases is a synthetic in-memory copy that admits nothing',
    'it does not claim that the emission path is demonstrated: the emission path on an admitted rule record is unexercised in this scope',
    'it does not adopt, conform or modify the internal comparator of PHASE5-001I-A, whose boundary treatment the rule record does not adopt',
    'it does not decide the effective period, the exception or the anniversary-boundary reading',
  ],
  boundaries: [
    'Observation-only and packet-ineligible: nothing in this record may be shown, hosted, transmitted or implied to any consumer.',
    'The counts stand at 0 admitted governed rules and 0 permitted findings, unchanged by this order.',
  ],
  created_by: 'PHASE5-001R',
};

fs.writeFileSync(path.join(OUT, 'internal_determinism_check.json'), JSON.stringify(out, null, 2) + '\n', 'utf8');
console.log('internal_determinism_check.json written: cases ' + out.case_count + ' | failures ' + out.failure_count + ' | emitted ' + out.emission_tally.cases_that_emitted_a_result);
if (out.failure_count > 0) { for (const c of failures) console.log('  FAIL ' + c.id + ': ' + c.name + '\n    expected ' + JSON.stringify(c.expected) + '\n    observed ' + JSON.stringify(c.observed)); process.exitCode = 1; }
