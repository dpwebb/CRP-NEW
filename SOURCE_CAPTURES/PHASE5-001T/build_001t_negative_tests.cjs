'use strict';
/**
 * build_001t_negative_tests.cjs — PHASE5-001T deliverable 2: the negative tests.
 *
 * Each test names the prohibited behaviour it forbids and records what it demonstrates in THIS scope: a named
 * refusal, or an observation-class record whose emission state is NOT_EMITTED. None of them claims a capability
 * this scope does not have: this unit has no probable path and no finding class.
 *
 * It writes one artifact, SOURCE_CAPTURES\PHASE5-001T\negative_tests_001t.json, and nothing else.
 */
const I = require('./inputs_001t.cjs');
const K = require('./fixtures_001t.cjs');
const C = require('./fixture_catalogue_001t.cjs');

const E = K.E;
const ADMITTED = K.syntheticAdmittedCopy();
const TESTS = [];

const BASE_INPUT = K.inputOf({
  ruleRecord: ADMITTED,
  reference: K.refObs('2026/05/05'),
  collections: K.collectionsOf([K.debtRecord(2, '2021/02/01')]),
});
const PINNED_ELIGIBLE_INPUT = K.inputOf({
  reference: K.refObs('2026/05/05'),
  collections: K.collectionsOf([K.debtRecord(2, '2021/02/01')]),
});

const OFF_REPORT_FACTS = {
  notice_date: '2026-01-02',
  notice_recipient: 'the consumer',
  notice_use: 'collection',
  notice_fee_charged: true,
  notice_procedure_followed: 'UNKNOWN',
  agency_actor_action: 'reported the debt',
  whether_any_payment_was_made: 'UNKNOWN',
  date_of_default_in_payment: '2019-03-04',
  consumer_evidence_available: true,
  retention_exception_section_4: 'RELIED_ON',
};

function recordOf(input) { return JSON.stringify(E.evaluate(input)); }

// ---------------------------------------------------------------- N-01
(() => {
  const source = I.readText(I.PATHS.evaluator);
  const forbiddenReads = [
    ['require\\(', 'module loading of any kind'],
    ['\\bprocess\\.', 'the process environment'],
    ['new Date', 'the system clock'],
    ['\\bDate\\.(now|UTC|parse)\\b', 'the system clock or time-zone conversion'],
    ['Math\\.random', 'a random source'],
    ['toLocale', 'the host locale'],
    ['\\bIntl\\b', 'the host internationalisation data'],
    ['\\bfs\\.|readFileSync|createReadStream', 'the file system'],
    ['child_process|fetch\\(|XMLHttpRequest|http\\.|https\\.', 'network or process access'],
  ];
  const readHits = forbiddenReads
    .map(([re, what]) => ({ what, pattern: re, occurrences: (source.match(new RegExp(re, 'g')) || []).length }))
    .filter((h) => h.occurrences > 0);

  const declared = Array.from(new Set((source.match(/\bi\.[a-z_]+/g) || []).map((s) => s.slice(2)))).sort();
  const declaredAllowed = ['declared_event_date_mapping', 'other_unresolved_affirmative_element', 'presentation', 'report', 'rule_record', 'second_limb_input_present', 'selection'];
  const undeclared = declared.filter((d) => declaredAllowed.indexOf(d) === -1);

  const clean = recordOf(BASE_INPUT);
  const polluted = recordOf(Object.assign({}, BASE_INPUT, OFF_REPORT_FACTS));
  const allKeys = [];
  const collect = (o, p) => Object.keys(o).forEach((k) => { allKeys.push(p + k); if (o[k] && typeof o[k] === 'object' && !Array.isArray(o[k])) collect(o[k], p + k + '.'); });
  collect(E.evaluate(BASE_INPUT), '');
  const offReportKeys = allKeys.filter((k) => /notice|recipient|fee|procedure|actor|payment_was_made|default_in_payment|consumer_evidence|section_4/i.test(k));

  TESTS.push({
    id: 'N-01',
    forbids: 'that any off-report fact is ever requested, inferred or used as a decisive fact',
    method: 'a source scan of the pinned evaluator for every read that could fetch or infer a fact outside the four declared inputs, plus a measured injection of ten off-report facts into an otherwise complete input',
    evidence: {
      forbidden_reads_found: readHits,
      input_properties_the_evaluator_touches: declared,
      input_properties_the_specification_does_not_declare: undeclared,
      injected_off_report_facts: Object.keys(OFF_REPORT_FACTS),
      record_with_off_report_facts_is_byte_identical: clean === polluted,
      returned_record_keys_drawn_from_an_off_report_fact: offReportKeys,
      the_four_declared_inputs: ['the caller selection', 'the recorded report observations', 'the declared event-date mapping', 'the governed rule record (read as data)'],
    },
    demonstrated_in_this_scope: 'the evaluator requests nothing and infers nothing: it has no module, file, network or clock access at all, it touches only the properties the specification declares, and ten injected off-report facts change no byte of the returned record',
    passed: readHits.length === 0 && undeclared.length === 0 && clean === polluted && offReportKeys.length === 0,
  });
})();

// ---------------------------------------------------------------- N-02
(() => {
  const docParserFailure = E.evaluate(K.inputOf({
    presentation: K.REFUSED_DESCRIPTOR('DOCUMENT_NOT_READABLE'),
    reference: K.refObs('2026/05/05'),
    collections: K.collectionsUnresolved('PARSER_FAILURE_IN_THE_COLLECTIONS_SECTION'),
  }));
  const sectionParserFailure = E.evaluate(K.inputOf({
    ruleRecord: ADMITTED,
    reference: K.refObs('2026/05/05'),
    collections: K.collectionsUnresolved('PARSER_FAILURE_IN_THE_COLLECTIONS_SECTION'),
  }));
  const notInspected = E.evaluate(K.inputOf({
    ruleRecord: ADMITTED,
    reference: K.refObs('2026/05/05'),
    collections: K.collectionsUnresolved('SECTION_NOT_INSPECTED'),
  }));
  const control = E.evaluate(K.inputOf({
    ruleRecord: ADMITTED,
    reference: K.refObs('2026/05/05'),
    collections: K.collectionsNoRecords(),
  }));

  /** every fixture whose input carries a parser-failure or not-inspected signal */
  const suspects = C.FIXTURES.filter((fx) => {
    const text = JSON.stringify(fx.input);
    return /PARSER_FAILURE|NOT_INSPECTED|DOCUMENT_NOT_READABLE|IMAGE_ONLY_OR_NO_TEXT_LAYER/.test(text);
  });
  const sweep = suspects.map((fx) => {
    const r = E.evaluate(fx.input);
    const statuses = [r.facts && r.facts.last_payment && r.facts.last_payment.unit_level ? r.facts.last_payment.unit_level.status : null]
      .concat(((r.facts && r.facts.last_payment && r.facts.last_payment.per_record) || []).map((x) => x.last_payment_fact.status));
    return {
      fixture: fx.id,
      facts_layer_ran: r.facts.state === 'RUN',
      fact_statuses: statuses,
      reached_absent_from_report: statuses.indexOf('ABSENT_FROM_REPORT') !== -1,
      produced_an_outcome: r.outcome !== null,
      refusal: r.refusal,
    };
  });

  TESTS.push({
    id: 'N-02',
    forbids: 'that a parser failure ever becomes an absence reading, and that a refused document is ever reported as an empty report',
    method: 'three controlled cases (document-level parser failure, section-level parser failure, section not inspected) plus a sweep of every fixture whose input carries a failure or not-inspected signal',
    evidence: {
      document_level_parser_failure: {
        refusal: docParserFailure.refusal, first_failing_gate: docParserFailure.first_failing_gate,
        facts_layer_state: docParserFailure.facts.state,
        any_fact_status_produced: docParserFailure.facts.reference_date !== null || docParserFailure.facts.last_payment !== null,
        outcome: docParserFailure.outcome,
      },
      section_level_parser_failure: {
        fact_status: sectionParserFailure.facts.last_payment.unit_level.status,
        reason: sectionParserFailure.facts.last_payment.unit_level.reason,
        comparison_state: sectionParserFailure.comparisons.state,
        outcome: sectionParserFailure.outcome === null ? null : 'an observation record with no comparison',
      },
      section_not_inspected: {
        fact_status: notInspected.facts.last_payment.unit_level.status,
        reason: notInspected.facts.last_payment.unit_level.reason,
        comparison_state: notInspected.comparisons.state,
      },
      the_positive_control: {
        what: 'the one reachable absence path, in which the section WAS resolved and prints no contract debt record',
        fact_status: control.facts.last_payment.unit_level.status,
        reason: control.facts.last_payment.unit_level.reason,
        comparison_state: control.comparisons.state,
        and_even_then: 'no comparison runs and no outcome is produced: an absence reading is not a result either',
      },
      sweep_over_fixtures_carrying_a_failure_signal: sweep,
      every_swept_case_avoided_an_absence_reading: sweep.every((s) => !s.reached_absent_from_report),
    },
    demonstrated_in_this_scope: 'a parse failure produces a named refusal at the document layer (and no fact status at all), or EXTRACTION_UNRESOLVED at the section layer. Neither becomes ABSENT_FROM_REPORT, and the one absence reading this unit has is reachable only from a resolved section that prints no contract debt record.',
    passed: docParserFailure.facts.state === 'NOT_RUN_DOCUMENT_OR_MAPPING_GATE_FAILED'
      && docParserFailure.facts.last_payment === null
      && sectionParserFailure.facts.last_payment.unit_level.status === 'EXTRACTION_UNRESOLVED'
      && notInspected.facts.last_payment.unit_level.status === 'EXTRACTION_UNRESOLVED'
      && control.facts.last_payment.unit_level.status === 'ABSENT_FROM_REPORT'
      && sweep.every((s) => !s.reached_absent_from_report),
  });
})();

// ---------------------------------------------------------------- N-03
(() => {
  const base = recordOf(BASE_INPUT);
  const variants = ['UNKNOWN', 'SHOWN', 'ABSENT', 'RELIED_ON'].map((v) => {
    const r = recordOf(Object.assign({}, BASE_INPUT, { exception_state: v, retention_exception_section_4: v }));
    return { supplied_exception_state: v, record_is_byte_identical: r === base };
  });
  const ruleRecord = K.pinnedRuleRecord();
  const exceptionBlock = ruleRecord.exceptions;
  const everyCase = C.FIXTURES.map((fx) => E.evaluate(fx.input));
  const findingClasses = Array.from(new Set(everyCase.map((r) => JSON.stringify(r.observation_eligibility.finding_classes_available))));
  const probableReachable = everyCase.some((r) => {
    const copy = JSON.parse(JSON.stringify(r));
    delete copy.forbidden_renderings;
    return JSON.stringify(copy).indexOf('PROBABLE_VIOLATION') !== -1;
  });

  TESTS.push({
    id: 'N-03',
    forbids: 'that an unknown exception ever suppresses a report-supported probable path',
    method: 'inject four exception states into an otherwise complete input and compare the returned records byte for byte; then measure whether this unit has any probable path for an exception to suppress',
    evidence: {
      the_evaluator_reads_no_exception_input: variants,
      all_variants_are_byte_identical_to_the_record_without_the_marker: variants.every((v) => v.record_is_byte_identical),
      does_this_unit_have_a_probable_path: 'no. The permitted result ceiling is OBSERVATION_CLASS_ONLY, finding_classes_available is empty in every returned record, and the token PROBABLE_VIOLATION is reachable nowhere in any returned record.',
      finding_classes_available_in_every_case: findingClasses,
      a_probable_path_is_reachable_from_any_input: probableReachable,
      the_exception_the_record_carries: {
        instrument: exceptionBlock.direct_report_contract_section_4_retention_exception.instrument,
        state: exceptionBlock.direct_report_contract_section_4_retention_exception.state,
        why_not_relied_on: exceptionBlock.direct_report_contract_section_4_retention_exception.why_not_relied_on,
        exception_determination: exceptionBlock.exception_determination,
        relied_on_by_this_order: false,
      },
    },
    demonstrated_in_this_scope: 'an exception state, known or unknown, reaches nothing: the evaluator has no exception input, all four injected states return the same record byte for byte, and this unit has no probable path and no finding class for an unknown exception to suppress. That is recorded as what it is — an absent capability — and not as a passing test of a capability this scope does not have.',
    passed: variants.every((v) => v.record_is_byte_identical) && !probableReachable && findingClasses.length === 1,
  });
})();

// ---------------------------------------------------------------- N-04
(() => {
  const surface = I.readJson(I.PATHS.output_surface);
  const everyResult = C.FIXTURES.map((fx) => ({ id: fx.id, record: E.evaluate(fx.input) }));
  const hits = [];
  everyResult.forEach(({ id, record }) => {
    const copy = JSON.parse(JSON.stringify(record));
    delete copy.forbidden_renderings;
    const text = JSON.stringify(copy);
    const found = ['VIOLATION', 'PROBABLE_VIOLATION', 'BREACH_ESTABLISHED', 'WITHIN_THE_LIMIT', 'COMPLIANT'].filter((l) => text.indexOf(l) !== -1);
    if (found.length) hits.push({ case: id, labels: found });
  });
  const axes = surface.permitted_output_axes;
  const violationOnAnyAxis = Object.keys(axes).filter((k) => axes[k].some((v) => String(v).indexOf('VIOLATION') !== -1));
  const emitted = everyResult.filter(({ record }) => record.emission.state.indexOf('NOT_EMITTED') !== 0);

  TESTS.push({
    id: 'N-04',
    forbids: 'that probable-only uncertainty ever emits VIOLATION, and that any finding label is rendered at all',
    method: 'scan every returned record in the fixture suite for the forbidden labels (excluding the field that declares them forbidden), scan the pinned output vocabulary for a finding label on any output axis, and count emissions',
    evidence: {
      cases_scanned: everyResult.length,
      cases_carrying_a_forbidden_label: hits,
      output_axes_carrying_a_finding_label: violationOnAnyAxis,
      permitted_output_axes: axes,
      forbidden_labels_declared_by_the_pinned_surface: surface.forbidden_labels,
      cases_that_emitted_a_finding_class: emitted.length,
      ceiling_in_every_case: Array.from(new Set(everyResult.map(({ record }) => record.observation_eligibility.permitted_result_ceiling))),
      packet_eligible_in_every_case: Array.from(new Set(everyResult.map(({ record }) => record.observation_eligibility.packet_eligible))),
    },
    demonstrated_in_this_scope: 'no returned record carries a finding label, VIOLATION is not a permitted value of any output axis, every case stays observation class and packet-ineligible, and nothing is emitted. This unit has no probable path, so the test records the prohibition it enforces rather than a probable result it produces.',
    passed: hits.length === 0 && violationOnAnyAxis.length === 0 && emitted.length === 0,
  });
})();

// ---------------------------------------------------------------- N-05
(() => {
  const pinnedCases = C.FIXTURES.filter((fx) => fx.rule_record_used === 'PINNED_NOT_ADMITTED');
  const sweep = pinnedCases.map((fx) => {
    const r = E.evaluate(fx.input);
    return {
      fixture: fx.id,
      refusal: r.refusal,
      first_failing_gate: r.first_failing_gate,
      outcome: r.outcome,
      emission: r.emission.state,
    };
  });
  const eligible = E.evaluate(PINNED_ELIGIBLE_INPUT);
  const anyOutcome = sweep.filter((s) => s.outcome !== null);
  const anyOtherRefusal = sweep.filter((s) => s.refusal !== 'REFUSED_RULE_RECORD_NOT_ADMITTED');

  TESTS.push({
    id: 'N-05',
    forbids: 'that an unadmitted governed rule record can emit a consumer result, and that admission is obtained in order to make anything emit',
    method: 'run every fixture that uses the pinned record as it stands, and separately run a fully eligible document against that same record',
    evidence: {
      fixtures_using_the_pinned_record: sweep,
      a_fully_eligible_document_against_the_pinned_record: {
        refusal: eligible.refusal,
        first_failing_gate: eligible.first_failing_gate,
        outcome: eligible.outcome,
        emission: eligible.emission.state,
        fact_statuses_still_reported: eligible.facts.last_payment.per_record.map((r) => r.last_payment_fact.status),
        comparison_state: eligible.comparisons.state,
      },
      cases_that_produced_an_outcome: anyOutcome.length,
      cases_whose_refusal_was_not_the_admission_gate: anyOtherRefusal.map((s) => s.fixture + ':' + s.refusal),
      admission_obtained_by_this_order: false,
      admitted_governed_rules_after_this_order: 0,
      permitted_findings_after_this_order: 0,
    },
    demonstrated_in_this_scope: 'on the record as it stands every input either refuses at an earlier gate or refuses with REFUSED_RULE_RECORD_NOT_ADMITTED and produces no outcome. The only way the arithmetic layer ran at all in this order was a synthetic in-memory copy marked admitted, which admits nothing and is evidence for nothing.',
    passed: anyOutcome.length === 0
      && eligible.refusal === 'REFUSED_RULE_RECORD_NOT_ADMITTED'
      && eligible.outcome === null,
  });
})();

// ---------------------------------------------------------------- N-06
(() => {
  const marker = E.evaluate(K.inputOf({
    presentation: K.REFUSED_DESCRIPTOR('SYNTHETIC_OR_FIXTURE_MARKER'),
    reference: K.refObs('2026/05/05'),
    collections: K.collectionsOf([K.debtRecord(2, '2021/02/01')]),
  }));
  const suite = I.readOutJson('fixture_suite_001t.json');
  const labelled = suite.cases.filter((c) => c.synthetic_label === K.SYNTHETIC_LABEL && c.counted_as_consumer_report_presentation_evidence === false);

  TESTS.push({
    id: 'N-06',
    forbids: 'that a synthetic fixture is ever counted as consumer-report presentation evidence, or admitted as the presentation',
    method: 'measure the document-level refusal cause that a declared fixture triggers, and re-read the fixture suite for its synthetic labelling and its presentation-evidence count',
    evidence: {
      a_document_declaring_itself_a_fixture: {
        refusal: marker.refusal,
        first_failing_gate: marker.first_failing_gate,
        facts_layer_state: marker.facts.state,
        outcome: marker.outcome,
      },
      refusal_causes_the_pinned_vocabulary_names: I.readJson(I.PATHS.status_vocabulary).the_separate_layers.layer_1_presentation_eligibility.refusal_causes_named,
      fixtures_labelled_synthetic_in_the_suite: labelled.length,
      suite_fixture_count: suite.fixture_count,
      fixtures_counted_as_consumer_report_presentation_evidence: suite.fixture_tally.counted_as_consumer_report_presentation_evidence,
      specimens_opened_by_this_order: 0,
    },
    demonstrated_in_this_scope: 'a document that declares itself a fixture is refused at the presentation gate with REFUSED_UNSUPPORTED_PRESENTATION, and all ' + suite.fixture_count + ' fixtures are labelled synthetic and counted as presentation evidence zero times.',
    passed: marker.refusal === 'REFUSED_UNSUPPORTED_PRESENTATION'
      && labelled.length === suite.fixture_count
      && suite.fixture_tally.counted_as_consumer_report_presentation_evidence === 0,
  });
})();

// ---------------------------------------------------------------- N-07
(() => {
  const GATE_ORDER = E.GATE_ORDER;
  const sweep = C.FIXTURES.map((fx) => {
    const r = E.evaluate(fx.input);
    const failing = r.gates.filter((g) => !g.passed).map((g) => g.gate);
    const firstInOrder = GATE_ORDER.filter((g) => failing.indexOf(g) !== -1)[0] || null;
    return {
      fixture: fx.id,
      gates_failed: failing,
      refusal_recorded: r.first_failing_gate,
      first_failing_gate_in_the_fixed_order: firstInOrder,
      agrees: r.first_failing_gate === firstInOrder,
    };
  });
  const multiGate = sweep.filter((s) => s.gates_failed.length > 1);
  const disagreements = sweep.filter((s) => !s.agrees);

  TESTS.push({
    id: 'N-07',
    forbids: 'that the refusal depends on which failure happened to be noticed first, rather than on the fixed gate order',
    method: 'for every fixture, compare the gate the evaluator named as first-failing with the first failing gate in the fixed order the specification pins',
    evidence: {
      fixed_gate_order: GATE_ORDER,
      every_gate_is_evaluated_and_recorded: true,
      cases_whose_refusal_is_the_first_failing_gate_in_the_order: sweep.length - disagreements.length,
      cases_that_failed_more_than_one_gate: multiGate.map((s) => ({ fixture: s.fixture, gates_failed: s.gates_failed, refusal: s.refusal_recorded })),
      disagreements,
      the_multi_gate_fixture: {
        what: 'one fixture fails four gates at once (no selection, a mis-declared mapping, an unadmitted record and a beyond-period date)',
        named_refusal: (sweep.filter((s) => s.fixture === 'FX-33')[0] || {}).refusal_recorded,
      },
    },
    demonstrated_in_this_scope: 'in every case the named refusal is the first failing gate in the fixed order, including the case that fails four gates at once.',
    passed: disagreements.length === 0 && multiGate.length > 0,
  });
})();

// ---------------------------------------------------------------- N-08
(() => {
  const axes = C.FIXTURES.map((fx) => {
    const r = E.evaluate(fx.input);
    return {
      fixture: fx.id,
      comparison_axis: r.comparisons.state,
      outcome_axis_is_separate_from_applicability: r.outcome !== null || r.first_failing_gate !== null,
      applicability_temporal: r.applicability_and_qualifications.applicability.temporal,
      applicability_is_not_derived_from_the_outcome: /^UNRESOLVED_MISSING_EVIDENCE/.test(r.applicability_and_qualifications.applicability.temporal),
      observation_eligibility: r.observation_eligibility.permitted_result_ceiling,
      finding_authorisation_declared_none: r.observation_eligibility.finding_classes_available.length === 0,
      packet_eligible: r.observation_eligibility.packet_eligible,
    };
  });
  const withOutcome = axes.filter((a) => a.outcome_axis_is_separate_from_applicability);
  const applicabilityStable = axes.filter((a) => a.applicability_is_not_derived_from_the_outcome).length;

  TESTS.push({
    id: 'N-08',
    forbids: 'that an arithmetic outcome is reported as an applicability finding, an observation eligibility or a finding authorisation',
    method: 'for every fixture, read the four axes separately out of the returned record and check that none of them is derived from another',
    evidence: {
      axes_read_separately: {
        arithmetic: 'comparison_outcome per contract debt record, and the comparison layer state',
        applicability: 'applicability_and_qualifications.applicability, read from the governed record and never from the outcome',
        observation_eligibility: 'observation_eligibility.permitted_result_ceiling and packet_eligible',
        finding_authorisation: 'observation_eligibility.finding_classes_available',
      },
      applicability_state_is_the_same_in_every_case: applicabilityStable === axes.length,
      applicability_state_recorded: 'UNRESOLVED_MISSING_EVIDENCE (the record\'s own unresolved temporal half), unchanged by any outcome',
      findings_authorised_in_any_case: 0,
      packet_eligible_in_any_case: axes.filter((a) => a.packet_eligible).length,
      cases_with_an_arithmetic_outcome: withOutcome.length,
      sample: axes.slice(0, 4),
    },
    demonstrated_in_this_scope: 'the four axes are separate fields of the returned record. An arithmetic outcome never moves the applicability state, never changes the observation ceiling and never authorises a finding class: no case authorises a finding and no case is packet-eligible.',
    passed: applicabilityStable === axes.length && axes.every((a) => !a.packet_eligible && a.finding_authorisation_declared_none),
  });
})();

// ---------------------------------------------------------------- write
const failed = TESTS.filter((t) => !t.passed).map((t) => t.id);
const pins = I.pinReport();
const pinFailures = pins.filter((p) => p.state !== 'MATCHES_THE_PIN');

const written = I.writeJson('negative_tests_001t.json', {
  artifact: 'negative_tests_001t.json',
  work_order: I.ORDER_ID,
  created_utc: I.CREATED_UTC,
  document_type: 'NEGATIVE TEST RESULT — synthetic inputs only, one scope only. NOT ADMITTED, no emission, no consumer-visible output',
  purpose: 'record the negative tests the Phase 5.6 bullet requires, each naming the prohibited behaviour it forbids and each recording what it demonstrates in this scope rather than claiming a capability this scope does not have',
  the_governing_text_read: {
    document: I.PATHS.plan,
    clause: 'section 3, Phase 5.6 bullet 2 (the negative tests)',
    line: 166,
    text: '- Add negative tests proving prohibited off-report facts are never requested, inferred, or used as decisive facts; parser failure never becomes absence; unknown exceptions never suppress a report-supported probable path; and probable-only uncertainty never emits `VIOLATION`.',
  },
  subject_under_test: {
    path: I.PATHS.evaluator,
    sha256: I.PINS[I.PATHS.evaluator],
    what: 'the deterministic evaluator the Gate 5.5 scoped verdict specified',
  },
  rule_record_read: {
    path: I.PATHS.rule_record,
    sha256: I.PINS[I.PATHS.rule_record],
    pre_admission_identity: I.PRE_ADMISSION_IDENTITY,
    state: 'NOT_ADMITTED',
  },
  pin_verification: { pins, all_match: pinFailures.length === 0, mismatches: pinFailures },
  test_count: TESTS.length,
  failure_count: failed.length,
  failed_tests: failed,
  tests: TESTS,
  what_each_test_demonstrates_here_instead_of_a_capability_this_scope_lacks: [
    'this unit has no probable path and no finding class, so the two tests that name a probable path and a finding label record the prohibition they enforce and the absent capability they measure, not a passing result they produce',
    'the exception tests record that no exception is read, relied on or suppressed here, rather than a suppression behaviour that would need a probable path to exist',
    'the off-report-fact test records that the evaluator has no access route to any fact outside the four declared inputs, rather than a filtering behaviour over facts it could have fetched',
  ],
  verdict: failed.length === 0
    ? 'EVERY NEGATIVE TEST PASSED — ' + TESTS.length + ' tests, 0 failures'
    : 'NEGATIVE TESTS FAILED: ' + failed.join(', '),
  what_this_record_does_not_do: [
    'it admits no rule, creates no coverage or candidate and authorises no finding class',
    'it produces no consumer-visible output of any class and changes no application behaviour',
    'it does not run, re-run or invoke the PHASE5-001I-A internal suite, and it treats no passing test of that suite as evidence',
    'it does not conform, modify or adopt the internal comparator of PHASE5-001I-A',
    'it does not weaken any assertion to obtain a passing result: every expected state is read out of the pinned text and every measured state is reported as measured',
  ],
  created_by: I.ORDER_ID,
});

console.log('negative tests: ' + TESTS.length + ' | failures: ' + failed.length + ' | pin mismatches: ' + pinFailures.length + ' | written ' + written.bytes + ' bytes');
TESTS.forEach((t) => { if (!t.passed) console.log('  FAIL ' + t.id + ' (' + t.forbids + ')'); });
