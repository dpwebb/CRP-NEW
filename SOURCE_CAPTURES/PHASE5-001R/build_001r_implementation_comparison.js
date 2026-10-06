// build_001r_implementation_comparison.js — the comparison the owner required with this order.
//
// Compares the specification of deliverable 3 with the internal comparator of PHASE5-001I-A, at the digest it
// stands at, and records every difference found — including that comparator's treatment of the exact sixth-
// anniversary day. Nothing in the implementation is changed, and nothing in it is adopted merely because its
// tests pass: each difference states whether the specification follows the implementation, differs from it, or
// reaches the same behaviour by another route, and why.
//
// Reads the implementation read-only and re-measures it; writes only implementation_comparison.json.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = 'C:\\CRP-NEW';
const OUT = path.join(ROOT, 'SOURCE_CAPTURES', 'PHASE5-001R');
const IMPL = 'internal-validation\\ca-ns-last-payment-six-year';
const readText = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const digest = (rel) => crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, rel))).digest('hex').toUpperCase();

const E = require('./evaluator_001r.cjs');
const implEval = require(path.join(ROOT, IMPL, 'six-year-evaluator.cjs'));
const implConstants = require(path.join(ROOT, IMPL, 'constants.cjs'));

// ---- what the implementation actually does, measured rather than read from its comments
const implBoundary = implEval.evaluateSixYearPeriod('2021-02-01', '2027-02-01');
const implClamp = implEval.evaluateSixYearPeriod('2020-02-29', '2026-02-28');
const implSpecimen = implEval.evaluateSixYearPeriod('2021-02-01', '2026-05-05');
const specBoundary = E.compare('2021-02-01', '2027-02-01');
const specSpecimen = E.compare('2021-02-01', '2026-05-05');
const implStatuses = Object.keys(implConstants.FACT_STATUS).map((k) => implConstants.FACT_STATUS[k]);

// ---- its own test suite: NOT re-run. The suite's harness WRITES its results into the PHASE5-001I-A package
// (tests/harness.cjs finish() writes SOURCE_CAPTURES\PHASE5-001I-A\test_results_001i_a.json), so re-running it
// would change a pre-existing artifact belonging to another order. This order ran it once before this was
// established; that change is disclosed in verification_results.json and in the preservation record, and it is
// NOT authorised by this order. From here the recorded result is read, not regenerated.
const recordedSuitePath = 'SOURCE_CAPTURES\\PHASE5-001I-A\\test_results_001i_a.json';
const recordedSuite = JSON.parse(readText(recordedSuitePath));
const suite = {
  re_run_by_this_order: false,
  why_not: 'the suite writes its results into the PHASE5-001I-A package, so re-running it would change a pre-existing artifact of another order. The result below is read from the recorded file at the digest measured here.',
  recorded_file: recordedSuitePath,
  recorded_file_sha256_as_measured_now: digest(recordedSuitePath),
  test_count: recordedSuite.test_count,
  failures: recordedSuite.failures,
  verdict: recordedSuite.verdict,
  disclosure: 'this file was regenerated once by this order before the write behaviour above was established; see verification_results.json disclosed_changes_by_this_order and preservation_and_change_record.json. The content is the same suite\'s results, so no evidence is lost, but the change is a change, it is unauthorised, and it is disclosed rather than hidden.',
};

const sourceHasRuleAdmissionConcept = /RULE_RECORD_NOT_ADMITTED|rule_not_admitted|rule_record_admission/i.test(readText(IMPL + '\\run-internal-validation.cjs') + readText(IMPL + '\\constants.cjs'));
const sourceFoldsContradiction = /REQUEST_DATE_CONTRADICTORY/.test(readText(IMPL + '\\locators.cjs'));

const differences = [
  {
    id: 'CMP-1',
    subject: 'the exact sixth-anniversary day',
    classification: 'MATERIAL — the two disagree on the one day the record withholds',
    the_implementation: 'measured: it returns ' + implBoundary.outcome + ' with boundary_case ' + implBoundary.boundary_case + ', so it treats the sixth-anniversary day as INSIDE the period and the period as exceeded only after it',
    the_specification: 'returns ' + specBoundary.comparison_outcome + ' with boundary_case ' + specBoundary.boundary_case + ' and no outcome, because convention c6 withholds that day',
    why_they_differ: 'the rule record does not adopt the implementation\'s reading: its boundary_treatment note records that the comparator treats that day as inside the period, that the convention is NOT adopted, and that no result resting on it at the boundary may be relied on, and it makes conforming an evaluator to the record Gate 5.5 work',
    adopted_by_this_specification: false,
    implementation_changed_by_this_order: false,
    reason_the_implementation_stands: 'this order is authorised to specify, not to change an implementation',
  },
  {
    id: 'CMP-2',
    subject: 'the rule-record admission gate',
    classification: 'MATERIAL — a gate condition the specification implements and the implementation has no concept of',
    the_implementation: 'no rule-admission state is read anywhere: it evaluates any admissible specimen and returns a full result. Source scan for an admission concept: ' + (sourceHasRuleAdmissionConcept ? 'found' : 'none found'),
    the_specification: 'gate G6 refuses with ' + E.REFUSALS.RULE_RECORD_NOT_ADMITTED + ' and produces no outcome. That is the operative state of this scope, so on this point alone the specification behaves differently from the implementation on every input.',
    why_they_differ: 'the gate names "cannot emit on ... unapproved rules" as an emission condition. The implementation predates the gate, has no such input and so cannot satisfy it; the rule record also states that it is not an admitted evaluator and must be re-created and re-validated before any admission.',
    adopted_by_this_specification: false,
    implementation_changed_by_this_order: false,
  },
  {
    id: 'CMP-3',
    subject: 'the CONTRADICTED status',
    classification: 'MATERIAL — a status the gate names, absent from the implementation',
    the_implementation: 'measured fact statuses: ' + implStatuses.join(' | ') + ' — no CONTRADICTED. A reference date that differs between pages is folded into EXTRACTION_UNRESOLVED with the reason REQUEST_DATE_CONTRADICTORY (' + (sourceFoldsContradiction ? 'measured in its locator source' : 'source scan inconclusive') + ')',
    the_specification: 'CONTRADICTED is one of the gate\'s four statuses and is reachable for the reference date through its own predicate',
    why_they_differ: 'the gate names CONTRADICTED separately from EXTRACTION_UNRESOLVED, and the rule record forbids substituting one status for another. Folding one into the other is that substitution, so the specification does not follow the implementation here.',
    adopted_by_this_specification: false,
    implementation_changed_by_this_order: false,
  },
  {
    id: 'CMP-4',
    subject: 'where a document-level refusal is recorded',
    classification: 'LAYERING — the same refusal, recorded in a different place',
    the_implementation: 'document refusal reasons are mapped to fact statuses (UNSUPPORTED_PRESENTATION, or EXTRACTION_UNRESOLVED for an unreadable document), and its own suite asserts that there are five fact statuses',
    the_specification: 'a document refusal is a state of the document layer, and no fact status is assigned when the document is refused, so a refused document can never be read as an empty report',
    why_they_differ: 'the gate\'s vocabulary has four statuses, not five, and the rule record forbids reporting a refused document as an absent field. Both readings refuse the same documents; only the place the refusal is recorded differs. The earlier artifact is preserved unchanged.',
    adopted_by_this_specification: false,
    implementation_changed_by_this_order: false,
  },
  {
    id: 'CMP-5',
    subject: 'the name of the resolved state',
    classification: 'COSMETIC — one state, two names',
    the_implementation: 'RESOLVED',
    the_specification: 'PRESENT, the gate\'s own word, with the equivalence recorded so the two names can never be read as two states',
    why_they_differ: 'naming only: no behaviour depends on it',
    adopted_by_this_specification: false,
    implementation_changed_by_this_order: false,
  },
  {
    id: 'CMP-6',
    subject: 'the emission gate',
    classification: 'MATERIAL — a result surface the implementation has and the specification closes',
    the_implementation: 'returns one full internal_validation_result record carrying an outcome per contract debt record',
    the_specification: 'returns a named refusal with no outcome, and, where every gate passes, an internal observation record whose emission state is ' + E.EMISSION.NO_CONSUMER_SURFACE_AND_NO_FINDING_CLASS_AUTHORIZED,
    why_they_differ: 'the implementation is an internal validation whose own README states it is not an admitted evaluator, not a product surface and not a finding engine; the specification is written to the gate, which requires that output cannot emit on an unapproved rule and that no finding class exists for this unit',
    adopted_by_this_specification: false,
    implementation_changed_by_this_order: false,
  },
  {
    id: 'CMP-7',
    subject: 'NOT_A_DEBT_RECORD',
    classification: 'LAYERING — the same refusal, recorded as a disposition rather than a status',
    the_implementation: 'its fact statuses include NOT_A_DEBT_RECORD, and a region that is not the contract\'s debt record receives it',
    the_specification: 'a record-level disposition in its own layer, with no fact status produced, because no fact is read from a region that is not the contract\'s debt record',
    why_they_differ: 'the gate names four statuses. Recording a region-level disposition as a fact status is a small conflation the specification avoids; behaviour towards the document is identical.',
    adopted_by_this_specification: false,
    implementation_changed_by_this_order: false,
  },
  {
    id: 'CMP-8',
    subject: 'the reason string for a reference date that precedes the printed payment date',
    classification: 'MINOR — same outcome class, different reason',
    the_implementation: 'UNRESOLVED with the reason LAST_PAYMENT_AFTER_REPORT_REFERENCE_DATE',
    the_specification: 'UNRESOLVED with the reason REFERENCE_DATE_PRECEDES_THE_STATED_LAST_PAYMENT',
    why_they_differ: 'naming only. Both refuse to compare and both produce no outcome, which is the behaviour that matters. The specification names it in its own vocabulary rather than borrowing the implementation\'s.',
    adopted_by_this_specification: false,
    implementation_changed_by_this_order: false,
  },
  {
    id: 'CMP-9',
    subject: 'a label printed inside the section but outside any contract debt record',
    classification: 'REFINEMENT — the specification follows the implementation, on the rule record\'s own reasoning',
    the_implementation: 'EXTRACTION_UNRESOLVED with FIELD_LABEL_OUTSIDE_ANY_RECORD, rather than ABSENT_FROM_REPORT',
    the_specification: 'the same: EXTRACTION_UNRESOLVED, recorded as its own status rule S5b',
    why_the_specification_follows_it: 'not because its tests pass, but because the rule record requires the fact to be read only from a contract debt record and permits ABSENT_FROM_REPORT only after the section is reliably inspected and prints no contract debt record. A label printed outside any record means the section did not resolve to that clean reading, and a value is never read outside a record, so the fact cannot be reported as absent.',
    adopted_by_this_specification: true,
    adoption_basis: 'the rule record\'s own reliability and no-borrowing rules, measured against the gate\'s absence condition — not the implementation\'s test result',
    implementation_changed_by_this_order: false,
  },
  {
    id: 'CMP-10',
    subject: 'the specimen arithmetic, the day-count derivation and the month-end clamp',
    classification: 'AGREEMENT — no difference found',
    the_implementation: 'on the specimen: anniversary ' + implSpecimen.anniversary + ', ' + implSpecimen.intervening_days + ' intervening days, a ' + implSpecimen.six_year_span_in_days + '-day span, outcome ' + implSpecimen.outcome + '; the clamp maps 2020-02-29 to ' + implClamp.anniversary,
    the_specification: 'anniversary ' + specSpecimen.anniversary + ', ' + specSpecimen.elapsed_days + ' elapsed days, a ' + specSpecimen.span_in_days + '-day span, outcome ' + specSpecimen.comparison_outcome + ', and the same clamp',
    why_they_agree: 'conventions c1 to c5 are the same arithmetic in both, and the derived day count means no day count is hard-coded in either. This agreement is measured on the same two dates rather than assumed from shared wording.',
    adopted_by_this_specification: true,
    adoption_basis: 'the governed rule record records these five conventions and the same measured numbers; the specification recomputes them independently and matches',
    implementation_changed_by_this_order: false,
  },
  {
    id: 'CMP-11',
    subject: 'what running the suite does to the workspace',
    classification: 'CUSTODY — the implementation writes into a pre-existing package when it is run',
    the_implementation: 'tests/harness.cjs finish() writes SOURCE_CAPTURES\\PHASE5-001I-A\\test_results_001i_a.json, so running the suite changes a pre-existing artifact belonging to another order; that record also reads the clock (new Date()) for its created_utc field',
    the_specification: 'reads the recorded result instead of regenerating it; its own determinism check writes inside its own package only, and case D-26 shows it reads no clock at all',
    why_they_differ: 'this order is required to preserve prior artifacts. A suite that writes into another order\'s package cannot be re-run by it without changing that artifact, so the specification reads the record and this order states the difference rather than repeating the run.',
    adopted_by_this_specification: false,
    implementation_changed_by_this_order: false,
    disclosure: 'this order ran the suite once, before the write behaviour was established, and that run changed SOURCE_CAPTURES\\PHASE5-001I-A\\test_results_001i_a.json. The change is disclosed with its before and after digests in verification_results.json and preservation_and_change_record.json, it is not authorised by this order, and the run was not repeated.',
  },
];

const out = {
  artifact: 'implementation_comparison.json',
  work_order: 'PHASE5-001R',
  created_utc: '2026-09-30',
  document_type: 'IMPLEMENTATION COMPARISON — this order\'s specification against the PHASE5-001I-A internal comparator. NOT ADMITTED, no emission',
  purpose: 'record every difference between this order\'s deterministic evaluation specification and the internal-validation implementation, state whether the specification follows it, differs from it or matches it by another route and why, and record that nothing was adopted merely because its tests pass and that nothing in the implementation was changed',
  compared: {
    the_implementation: IMPL,
    its_standing: 'rank 8, internal only. It is NOT an admitted evaluator, it is not gate evidence, and the governed rule record states that it must be re-created and re-validated under Gates 5.5 and 5.6 before any admission.',
    the_specification: 'SOURCE_CAPTURES\\PHASE5-001R\\deterministic_evaluator_specification.json, with SOURCE_CAPTURES\\PHASE5-001R\\evaluator_001r.cjs as its executable form',
    measured_against: 'SOURCE_CAPTURES\\PHASE5-001Q\\rule_record.json, which is NOT ADMITTED, and the gate text at build-plan lines 133, 134 and 138',
  },
  the_implementation_at_its_digests: ['six-year-evaluator.cjs', 'constants.cjs', 'extraction.cjs', 'locators.cjs', 'presentation-contract.cjs', 'run-internal-validation.cjs', 'tests\\run-tests.cjs']
    .map((f) => ({ file: IMPL + '\\' + f, bytes: fs.statSync(path.join(ROOT, IMPL + '\\' + f)).size, sha256: digest(IMPL + '\\' + f) })),
  preserved: 'no file under ' + IMPL + ' was written, moved, renamed or deleted by this order. The digests above are re-measured from the files as they stand, and the input record measures the same files against what earlier orders recorded for them.',
  its_own_test_suite: suite,
  its_own_test_suite_is_not_re_run: suite.why_not,
  passing_tests_do_not_settle_this: 'its recorded suite result — ' + suite.test_count + ' tests, ' + suite.failures + ' failures, ' + suite.verdict + ' — is not a reason to adopt any of its behaviour. Where the specification follows the implementation it does so because the rule record or the gate requires it, and each such point names that reason. Where it does not follow, the difference stands recorded and unresolved by this order.',
  measured_agreement_on_the_evidence: {
    specimen_arithmetic: {
      implementation: { outcome: implSpecimen.outcome, anniversary: implSpecimen.anniversary, intervening_days: implSpecimen.intervening_days, six_year_span_in_days: implSpecimen.six_year_span_in_days },
      specification: { outcome: specSpecimen.comparison_outcome, anniversary: specSpecimen.anniversary, elapsed_days: specSpecimen.elapsed_days, span_in_days: specSpecimen.span_in_days },
      agree: implSpecimen.anniversary === specSpecimen.anniversary && implSpecimen.intervening_days === specSpecimen.elapsed_days && implSpecimen.six_year_span_in_days === specSpecimen.span_in_days && implSpecimen.outcome === specSpecimen.comparison_outcome,
    },
    boundary_day: {
      implementation: { outcome: implBoundary.outcome, boundary_case: implBoundary.boundary_case },
      specification: { outcome: specBoundary.comparison_outcome, boundary_case: specBoundary.boundary_case },
      agree: implBoundary.outcome === specBoundary.comparison_outcome,
    },
    clamped_anniversary: {
      implementation: { anniversary: implClamp.anniversary, outcome: implClamp.outcome, boundary_case: implClamp.boundary_case },
      agreement_with_the_specification: 'the clamped anniversary agrees (2020-02-29 + six calendar years = 2026-02-28); the resulting outcome does not, for the same reason as CMP-1',
    },
  },
  differences,
  difference_count: differences.length,
  material_differences_not_adopted: differences.filter((d) => d.classification.indexOf('MATERIAL') !== -1).map((d) => d.id),
  points_where_the_specification_follows_the_implementation: differences.filter((d) => d.adopted_by_this_specification === true).map((d) => ({ id: d.id, basis: d.adoption_basis })),
  what_this_comparison_does_not_do: [
    'it does not change the implementation: no file under ' + IMPL + ' was written, moved, renamed or deleted, and their digests are recorded here so that this is measured rather than asserted',
    'it does not adopt the implementation\'s boundary convention, its status vocabulary, its result shape or its emission behaviour',
    'it does not treat the implementation, or its passing suite, as gate evidence',
    'it does not resolve the anniversary-boundary reading: the difference stands, and convention c6 of the governed rule record governs this specification',
  ],
  created_by: 'PHASE5-001R',
};

fs.writeFileSync(path.join(OUT, 'implementation_comparison.json'), JSON.stringify(out, null, 2) + '\n', 'utf8');
console.log('implementation_comparison.json written: differences ' + out.difference_count
  + ' | materials not adopted ' + out.material_differences_not_adopted.length
  + ' | followed on the record\'s reasoning ' + out.points_where_the_specification_follows_the_implementation.length
  + ' | its recorded suite ' + suite.test_count + ' tests, ' + suite.failures + ' failures, not re-run by this order');


