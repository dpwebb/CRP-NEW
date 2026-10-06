'use strict';
/**
 * fixture_catalogue_001t.cjs — PHASE5-001T deliverable 1: the fixture suite itself.
 *
 * Fifteen categories, exactly the ones the Phase 5.6 fixture bullet names, each carried by one or more
 * fixtures. Every fixture is synthetic, every fixture states the state it must reach, and every fixture is
 * labelled synthetic so that it can never be mistaken for a presentation.
 */
const K = require('./fixtures_001t.cjs');

const E = K.E;
const ADMITTED = K.syntheticAdmittedCopy();

/** The fifteen categories the Phase 5.6 fixture bullet names, in the bullet's own order. */
const CATEGORIES = [
  { id: 'CLEAR_BREACH', bullet_text: 'clear breach' },
  { id: 'COMPLIANT_WITHIN_LIMIT', bullet_text: 'compliant/within-limit' },
  { id: 'EXACT_BOUNDARY', bullet_text: 'exact boundary' },
  { id: 'WRONG_EVENT_DATE', bullet_text: 'wrong event date' },
  { id: 'DATE_UNAVAILABLE', bullet_text: 'date unavailable' },
  { id: 'REPORT_CONTRADICTION', bullet_text: 'report contradiction' },
  { id: 'EXCEPTION_SHOWN', bullet_text: 'exception shown' },
  { id: 'EXCEPTION_UNKNOWN', bullet_text: 'exception unknown' },
  { id: 'EFFECTIVE_PERIOD_UNCERTAINTY', bullet_text: 'effective-period uncertainty' },
  { id: 'PREEMPTION_UNCERTAINTY', bullet_text: 'preemption uncertainty' },
  { id: 'DUPLICATE_CATALOGUE_SOURCE', bullet_text: 'duplicate catalogue source' },
  { id: 'WRONG_JURISDICTION', bullet_text: 'wrong jurisdiction' },
  { id: 'PARSER_FAILURE', bullet_text: 'parser failure' },
  { id: 'OCR_AMBIGUITY', bullet_text: 'OCR ambiguity' },
  { id: 'REPORT_SECTION_NOT_INSPECTED', bullet_text: 'report-section not inspected' },
];

/** The eight labels and label classes this unit may never render, quoted from the pinned explanation surface. */
const NO_FINDING_LABEL_STATE = {
  ceiling: 'OBSERVATION_CLASS_ONLY',
  packet_eligible: false,
  consumer_visible: false,
  finding_classes_available: [],
};

const F = [];

// ------------------------------------------------------------------ 1. clear breach
F.push({
  id: 'FX-01',
  categories: ['CLEAR_BREACH'],
  synthetic: true,
  what_it_is: 'a synthetic in-memory report whose one contract debt record prints a last payment date six calendar years and more before the report request date',
  the_state_it_must_reach: [
    'the comparison runs and returns PERIOD_EXCEEDED, an arithmetic result only',
    'no finding label is rendered and no finding class is available: the ceiling stays OBSERVATION_CLASS_ONLY',
    'the result is NOT emitted: NOT_EMITTED_NO_CONSUMER_SURFACE_AND_NO_FINDING_CLASS_AUTHORIZED',
    'the boundary case is not reached, so the boundary qualification is not mandatory here',
  ],
  input_provenance: 'synthetic in-memory descriptor of the pinned presentation + synthetic admitted copy of the governed rule record + in-memory observations',
  rule_record_used: 'SYNTHETIC_IN_MEMORY_COPY_MARKED_ADMITTED',
  input: K.inputOf({
    ruleRecord: ADMITTED,
    reference: K.refObs('2026/05/05'),
    collections: K.collectionsOf([K.debtRecord(2, '2019/01/01')]),
  }),
  expected: {
    refusal: null, first_failing_gate: null, facts_state: 'RUN', comparison_state: 'RUN',
    reference_status: 'PRESENT', reference_reason: null,
    unit_level_status: null, unit_level_reason: null,
    per_record: [{ record_index: 2, disposition: 'CONTRACT_DEBT_RECORD', status: 'PRESENT', reason: null,
      comparison_outcome: 'PERIOD_EXCEEDED', comparison_reason: null, anniversary: '2025-01-01',
      span_in_days: 2192, elapsed_days: 2681, boundary_case: null }],
    outcome_present: true,
    emission: 'NOT_EMITTED_NO_CONSUMER_SURFACE_AND_NO_FINDING_CLASS_AUTHORIZED',
    boundary_qualification_mandatory: false,
    timing_qualification_mandatory: true,
    classification_qualification_mandatory: true,
    specimen_qualification_mandatory: true,
    ...NO_FINDING_LABEL_STATE,
  },
});

// ------------------------------------------------------------------ 2. compliant / within limit
F.push({
  id: 'FX-02',
  categories: ['COMPLIANT_WITHIN_LIMIT'],
  synthetic: true,
  what_it_is: 'a synthetic in-memory report carrying the specimen\'s own two printed values, so the record\'s measured arithmetic is reproduced on synthetic input',
  the_state_it_must_reach: [
    'the comparison runs and returns PERIOD_NOT_EXCEEDED — an arithmetic result, never a clearance',
    'the anniversary is 2027-02-01, the derived span is 2191 days and the elapsed time is 1919 days, the record\'s own measured numbers',
    'the result is NOT emitted and carries no finding label',
  ],
  input_provenance: 'synthetic in-memory descriptor + synthetic admitted copy + the specimen\'s two recorded printed values as in-memory observations',
  rule_record_used: 'SYNTHETIC_IN_MEMORY_COPY_MARKED_ADMITTED',
  input: K.inputOf({
    ruleRecord: ADMITTED,
    reference: K.refObs('2026/05/05'),
    collections: K.collectionsOf([K.debtRecord(2, '2021/02/01')]),
  }),
  expected: {
    refusal: null, first_failing_gate: null, facts_state: 'RUN', comparison_state: 'RUN',
    reference_status: 'PRESENT', reference_reason: null,
    unit_level_status: null, unit_level_reason: null,
    per_record: [{ record_index: 2, disposition: 'CONTRACT_DEBT_RECORD', status: 'PRESENT', reason: null,
      comparison_outcome: 'PERIOD_NOT_EXCEEDED', comparison_reason: null, anniversary: '2027-02-01',
      span_in_days: 2191, elapsed_days: 1919, boundary_case: null }],
    outcome_present: true,
    emission: 'NOT_EMITTED_NO_CONSUMER_SURFACE_AND_NO_FINDING_CLASS_AUTHORIZED',
    boundary_qualification_mandatory: false,
    ...NO_FINDING_LABEL_STATE,
  },
});

// ------------------------------------------------------------------ 3. exact boundary (withheld)
F.push({
  id: 'FX-03',
  categories: ['EXACT_BOUNDARY'],
  synthetic: true,
  what_it_is: 'a synthetic in-memory report whose request date is exactly the sixth anniversary of the printed last payment date',
  the_state_it_must_reach: [
    'the outcome is WITHHELD: the comparison is UNRESOLVED and reports BOUNDARY_CASE_EXACTLY_AT_SIX_YEAR_ANNIVERSARY',
    'neither PERIOD_EXCEEDED nor PERIOD_NOT_EXCEEDED is produced on this day',
    'the boundary qualification becomes mandatory exactly here',
    'the result is still NOT emitted and carries no finding label',
  ],
  input_provenance: 'synthetic in-memory descriptor + synthetic admitted copy + in-memory dates on the withheld day',
  rule_record_used: 'SYNTHETIC_IN_MEMORY_COPY_MARKED_ADMITTED',
  input: K.inputOf({
    ruleRecord: ADMITTED,
    reference: K.refObs('2027/02/01'),
    collections: K.collectionsOf([K.debtRecord(2, '2021/02/01')]),
  }),
  expected: {
    refusal: null, first_failing_gate: null, facts_state: 'RUN', comparison_state: 'RUN',
    per_record: [{ record_index: 2, status: 'PRESENT',
      comparison_outcome: 'UNRESOLVED',
      comparison_reason: 'THE_REFERENCE_DATE_IS_THE_SIXTH_ANNIVERSARY_AND_THE_TEXT_DOES_NOT_SETTLE_INCLUSION',
      anniversary: '2027-02-01', span_in_days: 2191, elapsed_days: 2191,
      boundary_case: 'BOUNDARY_CASE_EXACTLY_AT_SIX_YEAR_ANNIVERSARY' }],
    outcome_present: true,
    boundary_qualification_mandatory: true,
    emission: 'NOT_EMITTED_NO_CONSUMER_SURFACE_AND_NO_FINDING_CLASS_AUTHORIZED',
    ...NO_FINDING_LABEL_STATE,
  },
});

F.push({
  id: 'FX-04',
  categories: ['EXACT_BOUNDARY'],
  synthetic: true,
  what_it_is: 'a synthetic in-memory report whose last payment date is 29 February, so convention c2 clamps the anniversary to 28 February, and whose request date is that clamped day',
  the_state_it_must_reach: [
    'the anniversary is the clamped 28 February, not a 29 February that does not exist (convention c2 with c1)',
    'the clamped day is itself the withheld boundary: UNRESOLVED with the boundary case and no outcome',
    'the boundary qualification becomes mandatory',
  ],
  input_provenance: 'synthetic in-memory descriptor + synthetic admitted copy + a 29 February start',
  rule_record_used: 'SYNTHETIC_IN_MEMORY_COPY_MARKED_ADMITTED',
  input: K.inputOf({
    ruleRecord: ADMITTED,
    reference: K.refObs('2022/02/28'),
    collections: K.collectionsOf([K.debtRecord(1, '2016/02/29')]),
  }),
  expected: {
    refusal: null, first_failing_gate: null, facts_state: 'RUN', comparison_state: 'RUN',
    per_record: [{ record_index: 1, status: 'PRESENT',
      comparison_outcome: 'UNRESOLVED',
      comparison_reason: 'THE_REFERENCE_DATE_IS_THE_SIXTH_ANNIVERSARY_AND_THE_TEXT_DOES_NOT_SETTLE_INCLUSION',
      anniversary: '2022-02-28', span_in_days: 2191, elapsed_days: 2191,
      boundary_case: 'BOUNDARY_CASE_EXACTLY_AT_SIX_YEAR_ANNIVERSARY' }],
    outcome_present: true,
    boundary_qualification_mandatory: true,
    emission: 'NOT_EMITTED_NO_CONSUMER_SURFACE_AND_NO_FINDING_CLASS_AUTHORIZED',
    ...NO_FINDING_LABEL_STATE,
  },
});

F.push({
  id: 'FX-05',
  categories: ['EXACT_BOUNDARY'],
  synthetic: true,
  what_it_is: 'the day before the clamped anniversary, from the same 29 February start',
  the_state_it_must_reach: ['the arithmetic returns PERIOD_NOT_EXCEEDED on the day before the clamped anniversary', 'no boundary case is reached'],
  input_provenance: 'synthetic in-memory descriptor + synthetic admitted copy, one day before the clamped anniversary',
  rule_record_used: 'SYNTHETIC_IN_MEMORY_COPY_MARKED_ADMITTED',
  input: K.inputOf({
    ruleRecord: ADMITTED,
    reference: K.refObs('2022/02/27'),
    collections: K.collectionsOf([K.debtRecord(1, '2016/02/29')]),
  }),
  expected: {
    refusal: null, facts_state: 'RUN', comparison_state: 'RUN',
    per_record: [{ record_index: 1, status: 'PRESENT', comparison_outcome: 'PERIOD_NOT_EXCEEDED',
      anniversary: '2022-02-28', span_in_days: 2191, elapsed_days: 2190, boundary_case: null }],
    outcome_present: true, boundary_qualification_mandatory: false,
    emission: 'NOT_EMITTED_NO_CONSUMER_SURFACE_AND_NO_FINDING_CLASS_AUTHORIZED',
    ...NO_FINDING_LABEL_STATE,
  },
});

F.push({
  id: 'FX-06',
  categories: ['EXACT_BOUNDARY'],
  synthetic: true,
  what_it_is: 'the day after the clamped anniversary, from the same 29 February start',
  the_state_it_must_reach: ['the arithmetic returns PERIOD_EXCEEDED on the day after the clamped anniversary', 'no boundary case is reached'],
  input_provenance: 'synthetic in-memory descriptor + synthetic admitted copy, one day after the clamped anniversary',
  rule_record_used: 'SYNTHETIC_IN_MEMORY_COPY_MARKED_ADMITTED',
  input: K.inputOf({
    ruleRecord: ADMITTED,
    reference: K.refObs('2022/03/01'),
    collections: K.collectionsOf([K.debtRecord(1, '2016/02/29')]),
  }),
  expected: {
    refusal: null, facts_state: 'RUN', comparison_state: 'RUN',
    per_record: [{ record_index: 1, status: 'PRESENT', comparison_outcome: 'PERIOD_EXCEEDED',
      anniversary: '2022-02-28', span_in_days: 2191, elapsed_days: 2192, boundary_case: null }],
    outcome_present: true, boundary_qualification_mandatory: false,
    emission: 'NOT_EMITTED_NO_CONSUMER_SURFACE_AND_NO_FINDING_CLASS_AUTHORIZED',
    ...NO_FINDING_LABEL_STATE,
  },
});

// ------------------------------------------------------------------ 4. wrong event date
F.push({
  id: 'FX-07',
  categories: ['WRONG_EVENT_DATE'],
  synthetic: true,
  what_it_is: 'the caller declares the last-payment role against a different printed field of the same record (Date Paid/Settled)',
  the_state_it_must_reach: [
    'gate G4 fails and the refusal is REFUSED_WRONG_EVENT_DATE_MAPPING',
    'no fact is read and no comparison runs: the mapping gate sits before the fact layer',
    'nothing is emitted',
  ],
  input_provenance: 'synthetic in-memory descriptor + the pinned unadmitted rule record + a synthetically mis-declared event-date mapping',
  rule_record_used: 'PINNED_NOT_ADMITTED',
  input: K.inputOf({
    mapping: K.WRONG_LABEL_MAPPING,
    reference: K.refObs('2026/05/05'),
    collections: K.collectionsOf([K.debtRecord(2, '2021/02/01')]),
  }),
  expected: {
    refusal: 'REFUSED_WRONG_EVENT_DATE_MAPPING', first_failing_gate: 'G4_EVENT_DATE_MAPPING',
    facts_state: 'NOT_RUN_DOCUMENT_OR_MAPPING_GATE_FAILED', comparison_state: 'NOT_RUN',
    reference_status: null, per_record: [], outcome_present: false,
    emission: 'NOT_EMITTED', ...NO_FINDING_LABEL_STATE,
  },
});

F.push({
  id: 'FX-08',
  categories: ['WRONG_EVENT_DATE'],
  synthetic: true,
  what_it_is: 'the caller declares the two event roles the other way round',
  the_state_it_must_reach: [
    'both roles are required to match the recorded mapping, so the swap is refused with REFUSED_WRONG_EVENT_DATE_MAPPING',
    'no fact is read, no comparison runs and nothing is emitted',
  ],
  input_provenance: 'synthetic in-memory descriptor + pinned rule record + a synthetically swapped mapping',
  rule_record_used: 'PINNED_NOT_ADMITTED',
  input: K.inputOf({
    mapping: K.SWAPPED_ROLE_MAPPING,
    reference: K.refObs('2026/05/05'),
    collections: K.collectionsOf([K.debtRecord(2, '2021/02/01')]),
  }),
  expected: {
    refusal: 'REFUSED_WRONG_EVENT_DATE_MAPPING', first_failing_gate: 'G4_EVENT_DATE_MAPPING',
    facts_state: 'NOT_RUN_DOCUMENT_OR_MAPPING_GATE_FAILED', comparison_state: 'NOT_RUN',
    per_record: [], outcome_present: false, emission: 'NOT_EMITTED', ...NO_FINDING_LABEL_STATE,
  },
});

// ------------------------------------------------------------------ 5. date unavailable
F.push({
  id: 'FX-09',
  categories: ['DATE_UNAVAILABLE'],
  synthetic: true,
  what_it_is: 'the contract debt record prints the Last Payment Date label with no value against it',
  the_state_it_must_reach: [
    'the fact is EXTRACTION_UNRESOLVED with reason LABEL_PRINTED_WITHOUT_VALUE',
    'the fact is never recorded as ABSENT_FROM_REPORT: a blank printed value is not an absence reading',
    'the comparison does not run and no outcome is produced for that record',
  ],
  input_provenance: 'synthetic in-memory descriptor + synthetic admitted copy + an in-memory record whose label carries no value',
  rule_record_used: 'SYNTHETIC_IN_MEMORY_COPY_MARKED_ADMITTED',
  input: K.inputOf({
    ruleRecord: ADMITTED,
    reference: K.refObs('2026/05/05'),
    collections: K.collectionsOf([K.blankRecord(2)]),
  }),
  expected: {
    refusal: null, facts_state: 'RUN', comparison_state: 'RUN',
    reference_status: 'PRESENT', unit_level_status: null,
    per_record: [{ record_index: 2, status: 'EXTRACTION_UNRESOLVED', reason: 'LABEL_PRINTED_WITHOUT_VALUE',
      comparison_outcome: 'UNRESOLVED',
      comparison_reason: 'THE_COMPARISON_DOES_NOT_RUN_UNLESS_BOTH_THE_CLOCK_START_AND_THE_REFERENCE_DATE_ARE_PRESENT',
      anniversary: null, span_in_days: null, elapsed_days: null, boundary_case: null }],
    outcome_present: true, boundary_qualification_mandatory: false,
    emission: 'NOT_EMITTED_NO_CONSUMER_SURFACE_AND_NO_FINDING_CLASS_AUTHORIZED',
    ...NO_FINDING_LABEL_STATE,
  },
});

F.push({
  id: 'FX-10',
  categories: ['DATE_UNAVAILABLE'],
  synthetic: true,
  what_it_is: 'the page header carries no Request Date label at all, so the reference date the comparison needs is unavailable',
  the_state_it_must_reach: [
    'the reference date is EXTRACTION_UNRESOLVED with reason HEADER_LABEL_NOT_FOUND: the convention input has no absence path',
    'the comparison does not run and no outcome is produced for the record',
  ],
  input_provenance: 'synthetic in-memory descriptor + synthetic admitted copy + an in-memory header observation with no label',
  rule_record_used: 'SYNTHETIC_IN_MEMORY_COPY_MARKED_ADMITTED',
  input: K.inputOf({
    ruleRecord: ADMITTED,
    reference: K.refObsAbsent(),
    collections: K.collectionsOf([K.debtRecord(2, '2021/02/01')]),
  }),
  expected: {
    refusal: null, facts_state: 'RUN', comparison_state: 'RUN',
    reference_status: 'EXTRACTION_UNRESOLVED', reference_reason: 'HEADER_LABEL_NOT_FOUND',
    per_record: [{ record_index: 2, status: 'PRESENT',
      comparison_outcome: 'UNRESOLVED',
      comparison_reason: 'THE_COMPARISON_DOES_NOT_RUN_UNLESS_BOTH_THE_CLOCK_START_AND_THE_REFERENCE_DATE_ARE_PRESENT',
      anniversary: null, span_in_days: null, elapsed_days: null, boundary_case: null }],
    outcome_present: true, boundary_qualification_mandatory: false,
    emission: 'NOT_EMITTED_NO_CONSUMER_SURFACE_AND_NO_FINDING_CLASS_AUTHORIZED',
    ...NO_FINDING_LABEL_STATE,
  },
});

F.push({
  id: 'FX-11',
  categories: ['DATE_UNAVAILABLE'],
  synthetic: true,
  what_it_is: 'the header label is on every page with one identical value, but the value is not in the presentation\'s printed form',
  the_state_it_must_reach: [
    'the reference date is EXTRACTION_UNRESOLVED with reason REQUEST_DATE_NOT_A_WELL_FORMED_PRINTED_DATE',
    'the comparison does not run: a malformed printed date is never normalised by guesswork',
  ],
  input_provenance: 'synthetic in-memory descriptor + synthetic admitted copy + an in-memory header value in a different print form',
  rule_record_used: 'SYNTHETIC_IN_MEMORY_COPY_MARKED_ADMITTED',
  input: K.inputOf({
    ruleRecord: ADMITTED,
    reference: K.refObs('2026-05-05'),
    collections: K.collectionsOf([K.debtRecord(2, '2021/02/01')]),
  }),
  expected: {
    refusal: null, facts_state: 'RUN', comparison_state: 'RUN',
    reference_status: 'EXTRACTION_UNRESOLVED', reference_reason: 'REQUEST_DATE_NOT_A_WELL_FORMED_PRINTED_DATE',
    per_record: [{ record_index: 2, status: 'PRESENT', comparison_outcome: 'UNRESOLVED',
      comparison_reason: 'THE_COMPARISON_DOES_NOT_RUN_UNLESS_BOTH_THE_CLOCK_START_AND_THE_REFERENCE_DATE_ARE_PRESENT',
      boundary_case: null }],
    outcome_present: true,
    emission: 'NOT_EMITTED_NO_CONSUMER_SURFACE_AND_NO_FINDING_CLASS_AUTHORIZED',
    ...NO_FINDING_LABEL_STATE,
  },
});

// ------------------------------------------------------------------ 6. report contradiction
F.push({
  id: 'FX-12',
  categories: ['REPORT_CONTRADICTION'],
  synthetic: true,
  what_it_is: 'the Request Date label appears on every page but the printed values differ between pages',
  the_state_it_must_reach: [
    'the reference date is CONTRADICTED with reason REQUEST_DATE_DIFFERS_BETWEEN_PAGES — a status of its own, never folded into EXTRACTION_UNRESOLVED',
    'the comparison does not run and no outcome is produced',
  ],
  input_provenance: 'synthetic in-memory descriptor + synthetic admitted copy + two different in-memory header values',
  rule_record_used: 'SYNTHETIC_IN_MEMORY_COPY_MARKED_ADMITTED',
  input: K.inputOf({
    ruleRecord: ADMITTED,
    reference: K.refObsContradictory(['2026/05/05', '2026/05/06']),
    collections: K.collectionsOf([K.debtRecord(2, '2021/02/01')]),
  }),
  expected: {
    refusal: null, facts_state: 'RUN', comparison_state: 'RUN',
    reference_status: 'CONTRADICTED', reference_reason: 'REQUEST_DATE_DIFFERS_BETWEEN_PAGES',
    per_record: [{ record_index: 2, status: 'PRESENT', comparison_outcome: 'UNRESOLVED',
      comparison_reason: 'THE_COMPARISON_DOES_NOT_RUN_UNLESS_BOTH_THE_CLOCK_START_AND_THE_REFERENCE_DATE_ARE_PRESENT',
      boundary_case: null }],
    outcome_present: true,
    emission: 'NOT_EMITTED_NO_CONSUMER_SURFACE_AND_NO_FINDING_CLASS_AUTHORIZED',
    ...NO_FINDING_LABEL_STATE,
  },
});

// ------------------------------------------------------------------ 7. exception shown
F.push({
  id: 'FX-13',
  categories: ['EXCEPTION_SHOWN'],
  synthetic: true,
  what_it_is: 'a synthetic in-memory input that asserts an exception is shown, in a field the evaluator has no input for',
  the_state_it_must_reach: [
    'this unit evaluates no exception: the rule record records the direct-report contract section 4 retention exception as RECORDED_NOT_RELIED_ON, and its route is satisfied by nothing because no governed rule is admitted',
    'the supplied exception marker is not read, so the evaluation reaches exactly the state it reaches without it',
    'the record produces the arithmetic and still emits nothing — no exception is relied on and none is treated as absent',
  ],
  input_provenance: 'synthetic in-memory descriptor + synthetic admitted copy + an exception marker field the specification does not define',
  rule_record_used: 'SYNTHETIC_IN_MEMORY_COPY_MARKED_ADMITTED',
  input: Object.assign(K.inputOf({
    ruleRecord: ADMITTED,
    reference: K.refObs('2026/05/05'),
    collections: K.collectionsOf([K.debtRecord(2, '2021/02/01')]),
  }), { exception_state: 'SHOWN' }),
  expected: {
    refusal: null, first_failing_gate: null, facts_state: 'RUN', comparison_state: 'RUN',
    per_record: [{ record_index: 2, status: 'PRESENT', comparison_outcome: 'PERIOD_NOT_EXCEEDED',
      anniversary: '2027-02-01', span_in_days: 2191, elapsed_days: 1919, boundary_case: null }],
    outcome_present: true,
    emission: 'NOT_EMITTED_NO_CONSUMER_SURFACE_AND_NO_FINDING_CLASS_AUTHORIZED',
    ...NO_FINDING_LABEL_STATE,
  },
});

// ------------------------------------------------------------------ 8. exception unknown
F.push({
  id: 'FX-14',
  categories: ['EXCEPTION_UNKNOWN'],
  synthetic: true,
  what_it_is: 'a synthetic in-memory input that asserts the exception state is unknown, in the same undefined field',
  the_state_it_must_reach: [
    'the unknown exception is not read, so it suppresses nothing: the record is the same record the same input produces without the marker',
    'this unit has no probable path and no finding class, so "an unknown exception never suppresses a report-supported probable path" is recorded here as a refusal-or-observation fact and implies no capability this scope does not have',
    'nothing is emitted and no finding label is rendered',
  ],
  input_provenance: 'synthetic in-memory descriptor + synthetic admitted copy + an undefined exception-state field',
  rule_record_used: 'SYNTHETIC_IN_MEMORY_COPY_MARKED_ADMITTED',
  input: Object.assign(K.inputOf({
    ruleRecord: ADMITTED,
    reference: K.refObs('2026/05/05'),
    collections: K.collectionsOf([K.debtRecord(2, '2021/02/01')]),
  }), { exception_state: 'UNKNOWN' }),
  expected: {
    refusal: null, first_failing_gate: null, facts_state: 'RUN', comparison_state: 'RUN',
    per_record: [{ record_index: 2, status: 'PRESENT', comparison_outcome: 'PERIOD_NOT_EXCEEDED',
      anniversary: '2027-02-01', span_in_days: 2191, elapsed_days: 1919, boundary_case: null }],
    outcome_present: true,
    emission: 'NOT_EMITTED_NO_CONSUMER_SURFACE_AND_NO_FINDING_CLASS_AUTHORIZED',
    ...NO_FINDING_LABEL_STATE,
  },
});

// ------------------------------------------------------------------ 9. effective-period uncertainty
F.push({
  id: 'FX-15',
  categories: ['EFFECTIVE_PERIOD_UNCERTAINTY'],
  synthetic: true,
  what_it_is: 'a synthetic in-memory input whose governing record carries the unresolved effective period',
  the_state_it_must_reach: [
    'the applicability state is carried as the record leaves it: UNRESOLVED_MISSING_EVIDENCE, never filled with an invented effective date',
    'the timing qualification is mandatory on the record and is carried',
    'the arithmetic resolves and the record still emits nothing: the uncertainty restricts output instead of being resolved',
  ],
  input_provenance: 'synthetic in-memory descriptor + synthetic admitted copy (which carries the record\'s own unresolved temporal half) + in-memory observations',
  rule_record_used: 'SYNTHETIC_IN_MEMORY_COPY_MARKED_ADMITTED',
  input: K.inputOf({
    ruleRecord: ADMITTED,
    reference: K.refObs('2026/05/05'),
    collections: K.collectionsOf([K.debtRecord(2, '2021/02/01')]),
  }),
  expected: {
    refusal: null, facts_state: 'RUN', comparison_state: 'RUN',
    per_record: [{ record_index: 2, status: 'PRESENT', comparison_outcome: 'PERIOD_NOT_EXCEEDED' }],
    outcome_present: true,
    timing_qualification_mandatory: true,
    classification_qualification_mandatory: true,
    specimen_qualification_mandatory: true,
    emission: 'NOT_EMITTED_NO_CONSUMER_SURFACE_AND_NO_FINDING_CLASS_AUTHORIZED',
    ...NO_FINDING_LABEL_STATE,
  },
});

// ------------------------------------------------------------------ 10. preemption uncertainty
F.push({
  id: 'FX-16',
  categories: ['PREEMPTION_UNCERTAINTY'],
  synthetic: true,
  what_it_is: 'a synthetic in-memory input whose governing record carries the recorded citation seam between s. 10(3)(c) and s. 10(ha) and no preemption determination',
  the_state_it_must_reach: [
    'no preemption determination exists in this scope and none is invented: the record\'s unresolved items are carried, including the recorded citation-seam dependency',
    'the evaluator reads no preemption input and reaches no preemption conclusion',
    'the arithmetic resolves, the unresolved items stay carried, and nothing is emitted',
  ],
  input_provenance: 'synthetic in-memory descriptor + synthetic admitted copy carrying the record\'s own unresolved dependencies + in-memory observations',
  rule_record_used: 'SYNTHETIC_IN_MEMORY_COPY_MARKED_ADMITTED',
  input: K.inputOf({
    ruleRecord: ADMITTED,
    reference: K.refObs('2026/05/05'),
    collections: K.collectionsOf([K.debtRecord(2, '2021/02/01')]),
  }),
  expected: {
    refusal: null, facts_state: 'RUN', comparison_state: 'RUN',
    per_record: [{ record_index: 2, status: 'PRESENT', comparison_outcome: 'PERIOD_NOT_EXCEEDED' }],
    outcome_present: true,
    emission: 'NOT_EMITTED_NO_CONSUMER_SURFACE_AND_NO_FINDING_CLASS_AUTHORIZED',
    ...NO_FINDING_LABEL_STATE,
  },
});

// ------------------------------------------------------------------ 11. duplicate catalogue source
F.push({
  id: 'FX-17',
  categories: ['DUPLICATE_CATALOGUE_SOURCE'],
  synthetic: true,
  what_it_is: 'the same provision reached through a second catalogue rendering: the rule-corpus entry and the timing determination in the accepted source pin, plus the legacy production identifier the record carries',
  the_state_it_must_reach: [
    'two catalogue renderings of one provision resolve to one immutable rule ID with one limb: no second unit, no second limb and no second outcome are created',
    'the two renderings produce byte-identical records for the same input, so a duplicated source cannot fork the evaluation',
    'no coverage, candidate or finding class is created by the duplication',
  ],
  input_provenance: 'synthetic in-memory descriptor + two synthetic in-memory copies of the one governed record, one built through the rule-corpus rendering and one through the timing rendering, each carrying the same immutable rule ID',
  rule_record_used: 'SYNTHETIC_IN_MEMORY_COPY_MARKED_ADMITTED (two renderings of one record)',
  input: K.inputOf({
    ruleRecord: ADMITTED,
    reference: K.refObs('2026/05/05'),
    collections: K.collectionsOf([K.debtRecord(2, '2021/02/01')]),
  }),
  second_input: (function () {
    const viaTiming = K.syntheticAdmittedCopy();
    viaTiming.catalogue_rendering = 'NS_S10_3_C_TIMING (the timing determination in the accepted source pin)';
    viaTiming.legacy_production_identifier = 'ca-ns.cra.s10_3_c.debt_retention_6y';
    return K.inputOf({
      ruleRecord: viaTiming,
      reference: K.refObs('2026/05/05'),
      collections: K.collectionsOf([K.debtRecord(2, '2021/02/01')]),
    });
  })(),
  expected: {
    refusal: null, facts_state: 'RUN', comparison_state: 'RUN',
    per_record: [{ record_index: 2, status: 'PRESENT', comparison_outcome: 'PERIOD_NOT_EXCEEDED',
      anniversary: '2027-02-01', span_in_days: 2191, elapsed_days: 1919, boundary_case: null }],
    outcome_present: true,
    emission: 'NOT_EMITTED_NO_CONSUMER_SURFACE_AND_NO_FINDING_CLASS_AUTHORIZED',
    ...NO_FINDING_LABEL_STATE,
  },
  record_identity_required_with_second_input: true,
});

// ------------------------------------------------------------------ 12. wrong jurisdiction
F.push({
  id: 'FX-18',
  categories: ['WRONG_JURISDICTION'],
  synthetic: true,
  what_it_is: 'the caller selects a real but different jurisdiction, CA / CA-ON, for a unit authorised only for CA / CA-NS',
  the_state_it_must_reach: [
    'gate G2 fails and the refusal is REFUSED_JURISDICTION_NOT_AUTHORIZED_FOR_THIS_UNIT',
    'jurisdiction is never inferred from the report, and no evaluation runs: the fact and comparison layers do not run',
    'nothing is emitted',
  ],
  input_provenance: 'a synthetically mis-selected jurisdiction + the pinned unadmitted rule record + in-memory observations that are never read',
  rule_record_used: 'PINNED_NOT_ADMITTED',
  input: K.inputOf({
    selection: K.CA_ON,
    reference: K.refObs('2026/05/05'),
    collections: K.collectionsOf([K.debtRecord(2, '2021/02/01')]),
  }),
  expected: {
    refusal: 'REFUSED_JURISDICTION_NOT_AUTHORIZED_FOR_THIS_UNIT',
    first_failing_gate: 'G2_JURISDICTION_AUTHORIZED_FOR_THIS_UNIT',
    facts_state: 'NOT_RUN_DOCUMENT_OR_MAPPING_GATE_FAILED', comparison_state: 'NOT_RUN',
    reference_status: null, per_record: [], outcome_present: false,
    emission: 'NOT_EMITTED', ...NO_FINDING_LABEL_STATE,
  },
});

F.push({
  id: 'FX-19',
  categories: ['WRONG_JURISDICTION'],
  synthetic: true,
  what_it_is: 'no country/region selection is supplied at all',
  the_state_it_must_reach: [
    'gate G1 fails before anything else is read and the refusal is REFUSED_NO_JURISDICTION_SELECTION_SUPPLIED',
    'the selection is the consumer\'s pre-upload choice and is never inferred, so an absent selection is a refusal and not a default',
  ],
  input_provenance: 'a synthetically absent selection + the pinned unadmitted rule record + in-memory observations that are never read',
  rule_record_used: 'PINNED_NOT_ADMITTED',
  input: K.inputOf({
    selection: K.NO_SELECTION,
    reference: K.refObs('2026/05/05'),
    collections: K.collectionsOf([K.debtRecord(2, '2021/02/01')]),
  }),
  expected: {
    refusal: 'REFUSED_NO_JURISDICTION_SELECTION_SUPPLIED',
    first_failing_gate: 'G1_JURISDICTION_SELECTION_SUPPLIED',
    facts_state: 'NOT_RUN_DOCUMENT_OR_MAPPING_GATE_FAILED', comparison_state: 'NOT_RUN',
    per_record: [], outcome_present: false, emission: 'NOT_EMITTED', ...NO_FINDING_LABEL_STATE,
  },
});

// ------------------------------------------------------------------ 13. parser failure
F.push({
  id: 'FX-20',
  categories: ['PARSER_FAILURE'],
  synthetic: true,
  what_it_is: 'a synthetic in-memory document descriptor carrying the named document-level refusal cause DOCUMENT_NOT_READABLE',
  the_state_it_must_reach: [
    'gate G3 fails and the refusal is REFUSED_UNSUPPORTED_PRESENTATION',
    'a document the parser cannot read is never reported as an empty report: the fact and comparison layers do not run at all',
  ],
  input_provenance: 'a synthetic in-memory descriptor carrying the parser-failure refusal cause + the pinned unadmitted rule record',
  rule_record_used: 'PINNED_NOT_ADMITTED',
  input: K.inputOf({
    presentation: K.REFUSED_DESCRIPTOR('DOCUMENT_NOT_READABLE'),
    reference: K.refObs('2026/05/05'),
    collections: K.collectionsUnresolved('PARSER_FAILURE_IN_THE_COLLECTIONS_SECTION'),
  }),
  expected: {
    refusal: 'REFUSED_UNSUPPORTED_PRESENTATION', first_failing_gate: 'G3_PRESENTATION_ELIGIBILITY',
    facts_state: 'NOT_RUN_DOCUMENT_OR_MAPPING_GATE_FAILED', comparison_state: 'NOT_RUN',
    reference_status: null, unit_level_status: null, per_record: [], outcome_present: false,
    emission: 'NOT_EMITTED', ...NO_FINDING_LABEL_STATE,
  },
});

F.push({
  id: 'FX-21',
  categories: ['PARSER_FAILURE'],
  synthetic: true,
  what_it_is: 'the document is eligible but the Collections section cannot be parsed, so the section is not resolved',
  the_state_it_must_reach: [
    'the rule-read fact is EXTRACTION_UNRESOLVED, never ABSENT_FROM_REPORT: the not-resolved reading is taken before any absence reading',
    'the comparison does not run and no outcome is produced',
  ],
  input_provenance: 'synthetic in-memory descriptor + synthetic admitted copy + a section observation that reports a parser failure',
  rule_record_used: 'SYNTHETIC_IN_MEMORY_COPY_MARKED_ADMITTED',
  input: K.inputOf({
    ruleRecord: ADMITTED,
    reference: K.refObs('2026/05/05'),
    collections: K.collectionsUnresolved('PARSER_FAILURE_IN_THE_COLLECTIONS_SECTION'),
  }),
  expected: {
    refusal: null, facts_state: 'RUN', comparison_state: 'NOT_RUN_NO_CONTRACT_DEBT_RECORD',
    reference_status: 'PRESENT',
    unit_level_status: 'EXTRACTION_UNRESOLVED', unit_level_reason: 'PARSER_FAILURE_IN_THE_COLLECTIONS_SECTION',
    per_record: [], outcome_present: true,
    emission: 'NOT_EMITTED_NO_CONSUMER_SURFACE_AND_NO_FINDING_CLASS_AUTHORIZED',
    ...NO_FINDING_LABEL_STATE,
  },
});

// ------------------------------------------------------------------ 14. OCR ambiguity
F.push({
  id: 'FX-22',
  categories: ['OCR_AMBIGUITY'],
  synthetic: true,
  what_it_is: 'a synthetic in-memory document descriptor carrying the named document-level refusal cause IMAGE_ONLY_OR_NO_TEXT_LAYER',
  the_state_it_must_reach: [
    'gate G3 fails and the refusal is REFUSED_UNSUPPORTED_PRESENTATION',
    'an image-only or text-less document is never read for a value and is never reported as an empty report',
  ],
  input_provenance: 'a synthetic in-memory descriptor carrying the OCR-ambiguity refusal cause + the pinned unadmitted rule record',
  rule_record_used: 'PINNED_NOT_ADMITTED',
  input: K.inputOf({
    presentation: K.REFUSED_DESCRIPTOR('IMAGE_ONLY_OR_NO_TEXT_LAYER'),
    reference: K.refObs('2026/05/05'),
    collections: K.collectionsOf([K.debtRecord(2, '2021/02/01')]),
  }),
  expected: {
    refusal: 'REFUSED_UNSUPPORTED_PRESENTATION', first_failing_gate: 'G3_PRESENTATION_ELIGIBILITY',
    facts_state: 'NOT_RUN_DOCUMENT_OR_MAPPING_GATE_FAILED', comparison_state: 'NOT_RUN',
    per_record: [], outcome_present: false, emission: 'NOT_EMITTED', ...NO_FINDING_LABEL_STATE,
  },
});

F.push({
  id: 'FX-23',
  categories: ['OCR_AMBIGUITY'],
  synthetic: true,
  what_it_is: 'the record prints the label once with a value the reading cannot resolve into the presentation\'s printed date form',
  the_state_it_must_reach: [
    'the fact is EXTRACTION_UNRESOLVED with reason VALUE_NOT_A_WELL_FORMED_PRINTED_DATE',
    'an ambiguous value is never resolved by guessing and is never recorded as an absence',
    'the comparison does not run and no outcome is produced for that record',
  ],
  input_provenance: 'synthetic in-memory descriptor + synthetic admitted copy + an in-memory record value the printed form does not admit',
  rule_record_used: 'SYNTHETIC_IN_MEMORY_COPY_MARKED_ADMITTED',
  input: K.inputOf({
    ruleRecord: ADMITTED,
    reference: K.refObs('2026/05/05'),
    collections: K.collectionsOf([K.debtRecord(2, '2021/O2/O1')]),
  }),
  expected: {
    refusal: null, facts_state: 'RUN', comparison_state: 'RUN',
    per_record: [{ record_index: 2, status: 'EXTRACTION_UNRESOLVED', reason: 'VALUE_NOT_A_WELL_FORMED_PRINTED_DATE',
      comparison_outcome: 'UNRESOLVED',
      comparison_reason: 'THE_COMPARISON_DOES_NOT_RUN_UNLESS_BOTH_THE_CLOCK_START_AND_THE_REFERENCE_DATE_ARE_PRESENT',
      boundary_case: null }],
    outcome_present: true,
    emission: 'NOT_EMITTED_NO_CONSUMER_SURFACE_AND_NO_FINDING_CLASS_AUTHORIZED',
    ...NO_FINDING_LABEL_STATE,
  },
});

// ------------------------------------------------------------------ 15. report-section not inspected
F.push({
  id: 'FX-24',
  categories: ['REPORT_SECTION_NOT_INSPECTED'],
  synthetic: true,
  what_it_is: 'the Collections section was never inspected, so no reading of it exists',
  the_state_it_must_reach: [
    'the rule-read fact is EXTRACTION_UNRESOLVED with the section reason: a section that was not inspected can never produce an absence reading',
    'the comparison does not run and no outcome is produced',
  ],
  input_provenance: 'synthetic in-memory descriptor + synthetic admitted copy + a section observation recorded as not inspected',
  rule_record_used: 'SYNTHETIC_IN_MEMORY_COPY_MARKED_ADMITTED',
  input: K.inputOf({
    ruleRecord: ADMITTED,
    reference: K.refObs('2026/05/05'),
    collections: K.collectionsUnresolved('SECTION_NOT_INSPECTED'),
  }),
  expected: {
    refusal: null, facts_state: 'RUN', comparison_state: 'NOT_RUN_NO_CONTRACT_DEBT_RECORD',
    reference_status: 'PRESENT',
    unit_level_status: 'EXTRACTION_UNRESOLVED', unit_level_reason: 'SECTION_NOT_INSPECTED',
    per_record: [], outcome_present: true,
    emission: 'NOT_EMITTED_NO_CONSUMER_SURFACE_AND_NO_FINDING_CLASS_AUTHORIZED',
    ...NO_FINDING_LABEL_STATE,
  },
});

F.push({
  id: 'FX-25',
  categories: ['REPORT_SECTION_NOT_INSPECTED'],
  synthetic: true,
  what_it_is: 'the control for FX-24: the section WAS located and resolved, and it prints no contract debt record',
  the_state_it_must_reach: [
    'the fact is ABSENT_FROM_REPORT — the single reachable absence path, and a resolved reading rather than a parser silence',
    'no comparison runs and no outcome is produced: an absence reading is not a result either',
  ],
  input_provenance: 'synthetic in-memory descriptor + synthetic admitted copy + a section observation resolved with no contract debt record',
  rule_record_used: 'SYNTHETIC_IN_MEMORY_COPY_MARKED_ADMITTED',
  input: K.inputOf({
    ruleRecord: ADMITTED,
    reference: K.refObs('2026/05/05'),
    collections: K.collectionsNoRecords(),
  }),
  expected: {
    refusal: null, facts_state: 'RUN', comparison_state: 'NOT_RUN_NO_CONTRACT_DEBT_RECORD',
    reference_status: 'PRESENT',
    unit_level_status: 'ABSENT_FROM_REPORT',
    unit_level_reason: 'SECTION_LOCATED_AND_RESOLVED_WITH_NO_CONTRACT_DEBT_RECORD',
    per_record: [], outcome_present: true,
    emission: 'NOT_EMITTED_NO_CONSUMER_SURFACE_AND_NO_FINDING_CLASS_AUTHORIZED',
    ...NO_FINDING_LABEL_STATE,
  },
});

F.push({
  id: 'FX-26',
  categories: ['REPORT_SECTION_NOT_INSPECTED'],
  synthetic: true,
  what_it_is: 'the section is resolved and prints no contract debt record, but it prints the label outside any contract debt record',
  the_state_it_must_reach: [
    'the fact is EXTRACTION_UNRESOLVED with reason FIELD_LABEL_OUTSIDE_ANY_RECORD: a value is never read outside a record, so the clean absence reading is not available',
    'the absence status is not produced',
  ],
  input_provenance: 'synthetic in-memory descriptor + synthetic admitted copy + a stray label outside any record',
  rule_record_used: 'SYNTHETIC_IN_MEMORY_COPY_MARKED_ADMITTED',
  input: K.inputOf({
    ruleRecord: ADMITTED,
    reference: K.refObs('2026/05/05'),
    collections: K.collectionsNoRecords({ stray_label_outside_any_contract_debt_record: true }),
  }),
  expected: {
    refusal: null, facts_state: 'RUN', comparison_state: 'NOT_RUN_NO_CONTRACT_DEBT_RECORD',
    unit_level_status: 'EXTRACTION_UNRESOLVED', unit_level_reason: 'FIELD_LABEL_OUTSIDE_ANY_RECORD',
    per_record: [], outcome_present: true,
    emission: 'NOT_EMITTED_NO_CONSUMER_SURFACE_AND_NO_FINDING_CLASS_AUTHORIZED',
    ...NO_FINDING_LABEL_STATE,
  },
});

// ------------------------------------------------------------------ collection-record isolation
F.push({
  id: 'FX-27',
  categories: ['REPORT_CONTRADICTION'],
  synthetic: true,
  what_it_is: 'two contract debt records in the one Collections section, each printing a different last payment date',
  the_state_it_must_reach: [
    'one fact per contract debt record, each bound to its own record: two comparisons, never one merged value',
    'record 2 exceeds the period and record 3 does not, on the same reference date',
    'no value is borrowed across records, sections or pages',
  ],
  input_provenance: 'synthetic in-memory descriptor + synthetic admitted copy + two in-memory contract debt records with different dates',
  rule_record_used: 'SYNTHETIC_IN_MEMORY_COPY_MARKED_ADMITTED',
  input: K.inputOf({
    ruleRecord: ADMITTED,
    reference: K.refObs('2026/05/05'),
    collections: K.collectionsOf([
      K.debtRecord(2, '2010/01/01'),
      K.debtRecord(3, '2021/02/01'),
    ]),
  }),
  expected: {
    refusal: null, facts_state: 'RUN', comparison_state: 'RUN',
    per_record: [
      { record_index: 2, disposition: 'CONTRACT_DEBT_RECORD', status: 'PRESENT',
        comparison_outcome: 'PERIOD_EXCEEDED', anniversary: '2016-01-01', span_in_days: 2191,
        elapsed_days: 5968, boundary_case: null },
      { record_index: 3, disposition: 'CONTRACT_DEBT_RECORD', status: 'PRESENT',
        comparison_outcome: 'PERIOD_NOT_EXCEEDED', anniversary: '2027-02-01', span_in_days: 2191,
        elapsed_days: 1919, boundary_case: null },
    ],
    outcome_present: true,
    emission: 'NOT_EMITTED_NO_CONSUMER_SURFACE_AND_NO_FINDING_CLASS_AUTHORIZED',
    ...NO_FINDING_LABEL_STATE,
  },
});

F.push({
  id: 'FX-28',
  categories: ['REPORT_CONTRADICTION'],
  synthetic: true,
  what_it_is: 'the section prints one contract debt record and one region that is not the contract\'s debt record',
  the_state_it_must_reach: [
    'a region that is not the debt record is a record-level disposition, not a fact status: no fact and no status are produced for it',
    'no value is read from it, and the compliant record is unaffected',
  ],
  input_provenance: 'synthetic in-memory descriptor + synthetic admitted copy + two regions, one of them not a debt record',
  rule_record_used: 'SYNTHETIC_IN_MEMORY_COPY_MARKED_ADMITTED',
  input: K.inputOf({
    ruleRecord: ADMITTED,
    reference: K.refObs('2026/05/05'),
    collections: K.collectionsOf([
      K.debtRecord(1, null, { record_disposition: 'NOT_A_DEBT_RECORD' }),
      K.debtRecord(2, '2021/02/01'),
    ]),
  }),
  expected: {
    refusal: null, facts_state: 'RUN', comparison_state: 'RUN',
    per_record: [
      { record_index: 1, disposition: 'NOT_A_DEBT_RECORD', status: null, reason: 'NOT_A_DEBT_RECORD',
        comparison_outcome: 'UNRESOLVED',
        comparison_reason: 'THE_COMPARISON_DOES_NOT_RUN_UNLESS_BOTH_THE_CLOCK_START_AND_THE_REFERENCE_DATE_ARE_PRESENT',
        anniversary: null },
      { record_index: 2, disposition: 'CONTRACT_DEBT_RECORD', status: 'PRESENT',
        comparison_outcome: 'PERIOD_NOT_EXCEEDED', anniversary: '2027-02-01' },
    ],
    outcome_present: true,
    emission: 'NOT_EMITTED_NO_CONSUMER_SURFACE_AND_NO_FINDING_CLASS_AUTHORIZED',
    ...NO_FINDING_LABEL_STATE,
  },
});

// ------------------------------------------------------------------ the operative state, and the controls
F.push({
  id: 'FX-29',
  categories: ['EXCEPTION_UNKNOWN'],
  synthetic: true,
  what_it_is: 'the operative state of this scope: a fully eligible synthetic document against the governed rule record as it actually stands, NOT_ADMITTED',
  the_state_it_must_reach: [
    'gate G6 fails and the refusal is REFUSED_RULE_RECORD_NOT_ADMITTED: an unadmitted rule cannot emit, and this is a named refusal with no result',
    'the facts are still resolved and reported as statuses, but the comparison layer does not run and no outcome is produced',
    'nothing is emitted, no finding class exists and the packet stays ineligible',
  ],
  input_provenance: 'synthetic in-memory descriptor + the pinned rule record read as data and never as an admission + in-memory observations',
  rule_record_used: 'PINNED_NOT_ADMITTED',
  input: K.inputOf({
    reference: K.refObs('2026/05/05'),
    collections: K.collectionsOf([K.debtRecord(2, '2021/02/01')]),
  }),
  expected: {
    refusal: 'REFUSED_RULE_RECORD_NOT_ADMITTED', first_failing_gate: 'G6_RULE_RECORD_ADMITTED',
    facts_state: 'RUN', comparison_state: 'NOT_RUN',
    reference_status: 'PRESENT',
    per_record: [{ record_index: 2, status: 'PRESENT' }],
    outcome_present: false, emission: 'NOT_EMITTED',
    boundary_qualification_mandatory: false,
    ...NO_FINDING_LABEL_STATE,
  },
});

F.push({
  id: 'FX-30',
  categories: ['PARSER_FAILURE'],
  synthetic: true,
  what_it_is: 'a synthetic in-memory descriptor that declares itself a fixture, through the named refusal cause SYNTHETIC_OR_FIXTURE_MARKER',
  the_state_it_must_reach: [
    'gate G3 fails and the refusal is REFUSED_UNSUPPORTED_PRESENTATION',
    'a synthetic or fixture document can never be admitted as the presentation, however it is supplied',
  ],
  input_provenance: 'a synthetic in-memory descriptor carrying the fixture-marker refusal cause + the pinned unadmitted rule record',
  rule_record_used: 'PINNED_NOT_ADMITTED',
  input: K.inputOf({
    presentation: K.REFUSED_DESCRIPTOR('SYNTHETIC_OR_FIXTURE_MARKER'),
    reference: K.refObs('2026/05/05'),
    collections: K.collectionsOf([K.debtRecord(2, '2021/02/01')]),
  }),
  expected: {
    refusal: 'REFUSED_UNSUPPORTED_PRESENTATION', first_failing_gate: 'G3_PRESENTATION_ELIGIBILITY',
    facts_state: 'NOT_RUN_DOCUMENT_OR_MAPPING_GATE_FAILED', comparison_state: 'NOT_RUN',
    per_record: [], outcome_present: false, emission: 'NOT_EMITTED', ...NO_FINDING_LABEL_STATE,
  },
});

F.push({
  id: 'FX-31',
  categories: ['DATE_UNAVAILABLE'],
  synthetic: true,
  what_it_is: 'the reference date precedes the printed last payment date',
  the_state_it_must_reach: [
    'the comparison does not run and reports UNRESOLVED with reason REFERENCE_DATE_PRECEDES_THE_STATED_LAST_PAYMENT',
    'no outcome is produced and the negative elapsed span is recorded rather than clamped',
  ],
  input_provenance: 'synthetic in-memory descriptor + synthetic admitted copy + a reference date before the printed date',
  rule_record_used: 'SYNTHETIC_IN_MEMORY_COPY_MARKED_ADMITTED',
  input: K.inputOf({
    ruleRecord: ADMITTED,
    reference: K.refObs('2020/05/01'),
    collections: K.collectionsOf([K.debtRecord(2, '2020/06/15')]),
  }),
  expected: {
    refusal: null, facts_state: 'RUN', comparison_state: 'RUN',
    per_record: [{ record_index: 2, status: 'PRESENT', comparison_outcome: 'UNRESOLVED',
      comparison_reason: 'REFERENCE_DATE_PRECEDES_THE_STATED_LAST_PAYMENT',
      anniversary: '2026-06-15', span_in_days: 2191, elapsed_days: -45, boundary_case: null }],
    outcome_present: true, boundary_qualification_mandatory: false,
    emission: 'NOT_EMITTED_NO_CONSUMER_SURFACE_AND_NO_FINDING_CLASS_AUTHORIZED',
    ...NO_FINDING_LABEL_STATE,
  },
});

F.push({
  id: 'FX-32',
  categories: ['PREEMPTION_UNCERTAINTY'],
  synthetic: true,
  what_it_is: 'an input that resolves to the excluded second limb of the provision',
  the_state_it_must_reach: [
    'gate G5 fails and the refusal is REFUSED_UNRESOLVED_AFFIRMATIVE_ELEMENT: the second limb is refused, never defaulted and never evaluated',
    'the facts are resolved and no comparison runs; nothing is emitted',
  ],
  input_provenance: 'synthetic in-memory descriptor + synthetic admitted copy + an input declaring the excluded second limb',
  rule_record_used: 'SYNTHETIC_IN_MEMORY_COPY_MARKED_ADMITTED',
  input: K.inputOf({
    ruleRecord: ADMITTED,
    secondLimb: true,
    reference: K.refObs('2026/05/05'),
    collections: K.collectionsOf([K.debtRecord(2, '2021/02/01')]),
  }),
  expected: {
    refusal: 'REFUSED_UNRESOLVED_AFFIRMATIVE_ELEMENT',
    first_failing_gate: 'G5_NO_UNRESOLVED_AFFIRMATIVE_ELEMENT',
    facts_state: 'RUN', comparison_state: 'NOT_RUN',
    reference_status: 'PRESENT',
    per_record: [{ record_index: 2, status: 'PRESENT' }],
    outcome_present: false, emission: 'NOT_EMITTED', ...NO_FINDING_LABEL_STATE,
  },
});

F.push({
  id: 'FX-33',
  categories: ['WRONG_JURISDICTION'],
  synthetic: true,
  what_it_is: 'an input that fails four gates at once: no selection, a mis-declared mapping, an unadmitted rule record and an eligible document',
  the_state_it_must_reach: [
    'every gate is evaluated and the refusal is the FIRST failing gate in the fixed order, which is G1 here',
    'the refusal therefore never depends on which failure happened to be noticed first',
  ],
  input_provenance: 'a synthetically absent selection + a mis-declared mapping + the pinned unadmitted rule record',
  rule_record_used: 'PINNED_NOT_ADMITTED',
  input: K.inputOf({
    selection: K.NO_SELECTION,
    mapping: K.WRONG_LABEL_MAPPING,
    reference: K.refObs('2026/05/05'),
    collections: K.collectionsOf([K.debtRecord(2, '2021/02/01')]),
  }),
  expected: {
    refusal: 'REFUSED_NO_JURISDICTION_SELECTION_SUPPLIED',
    first_failing_gate: 'G1_JURISDICTION_SELECTION_SUPPLIED',
    facts_state: 'NOT_RUN_DOCUMENT_OR_MAPPING_GATE_FAILED', comparison_state: 'NOT_RUN',
    per_record: [], outcome_present: false, emission: 'NOT_EMITTED', ...NO_FINDING_LABEL_STATE,
  },
});

module.exports = { CATEGORIES, FIXTURES: F, NO_FINDING_LABEL_STATE };
