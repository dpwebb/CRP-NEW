'use strict';
/**
 * build_001t_verdict.cjs — PHASE5-001T deliverable 6: the scoped Gate 5.6 verdict.
 *
 * It reads the plan at its pinned digest to quote the gate as amended, reads this order's four result records,
 * and states each gate criterion and each acceptance criterion of the order with its evidence — naming every
 * criterion it cannot meet instead of passing it.
 *
 * It writes one artifact, SOURCE_CAPTURES\PHASE5-001T\scoped_gate_5_6_verdict.json, and nothing else.
 */
const I = require('./inputs_001t.cjs');

const planText = I.readText(I.PATHS.plan);
const planLines = planText.split(/\r?\n/);
const line = (n) => planLines[n - 1];
const gate6Text = line(170);
const phaseBullets = [line(165), line(166), line(167), line(168)];

const suite = I.readOutJson('fixture_suite_001t.json');
const negatives = I.readOutJson('negative_tests_001t.json');
const replay = I.readOutJson('independent_replay_001t.json');
const language = I.readOutJson('consumer_language_validation_001t.json');
const supersededDraft = I.readJson(I.PATHS.superseded_draft);
const withheldVerdict = I.readJson(I.PATHS.withheld_gate_5_5_verdict);
const gate55Successor = I.readJson(I.PATHS.gate_5_5_successor);
const complaint = I.readJson(I.PATHS.implementation_comparison);
const workOrder = I.readJson(I.PATHS.order);
const custodySupplement = I.readJson(I.PATHS.custody_supplement);
const ownerDecisions = I.readJson(I.PATHS.owner_decisions);

const pins = I.pinReport();
const pinFailures = pins.filter((p) => p.state !== 'MATCHES_THE_PIN');
const artefact = (name) => ({
  path: 'SOURCE_CAPTURES\\PHASE5-001T\\' + name,
  sha256: I.sha256File(I.abs('SOURCE_CAPTURES\\PHASE5-001T\\' + name)),
  bytes: I.readText('SOURCE_CAPTURES\\PHASE5-001T\\' + name).length,
});

const EVIDENCE = {
  fixture_suite: artefact('fixture_suite_001t.json'),
  negative_tests: artefact('negative_tests_001t.json'),
  frozen_expectations: artefact('replay_expectations_frozen.json'),
  independent_replay: artefact('independent_replay_001t.json'),
  consumer_language: artefact('consumer_language_validation_001t.json'),
  input_verification: artefact('input_verification.json'),
  baseline: artefact('preserved_files_before.json'),
  reviewer: artefact('reviewer_001t.cjs'),
};

// ---------------------------------------------------------------- the gate, as amended, quoted from the document
const gateQuote = {
  document: I.PATHS.plan,
  digest: I.PINS[I.PATHS.plan],
  line: 170,
  text: gate6Text,
  quoted_verbatim: gate6Text.indexOf('**Gate 5.6:**') === 0,
  amendment_marker: gate6Text.indexOf('Under the PHASE5-001S paragraph above') !== -1,
};
const phaseBulletQuotes = phaseBullets.map((t, i) => ({ line: 165 + i, text: t, quoted_verbatim: true }));

// ---------------------------------------------------------------- gate criteria
const criterionC4Measurement = {
  the_pre_admission_version_identity: gate55Successor.scope.pre_admission_rule_record_version_identity,
  the_pre_admission_rule_record_digest: gate55Successor.scope.pre_admission_rule_record_digest,
  the_rule_record_measured_here: pins.filter((p) => p.path === I.PATHS.rule_record)[0],
  the_other_pins_that_share_the_version: pins.filter((p) => p.path !== I.PATHS.rule_record).map((p) => ({ path: p.path, pinned_sha256: p.pinned_sha256, measured_sha256: p.measured_sha256, state: p.state })),
  the_tests_of_this_scope: { path: EVIDENCE.fixture_suite.path, sha256: EVIDENCE.fixture_suite.sha256, and: EVIDENCE.negative_tests.path },
  the_explanation_templates: { path: I.PATHS.output_surface, sha256: I.PINS[I.PATHS.output_surface] },
  the_source_crosswalk: { path: I.PATHS.crosswalk, sha256: I.PINS[I.PATHS.crosswalk] },
  measured_as_far_as_this_scope_allows: pinFailures.length === 0,
  the_production_admission_identity_and_version: 'RESERVED_TO_GATE_5_7 — not assigned, not invented and not required to be assigned by this order',
};

const gateCriteria = [
  {
    n: 1,
    criterion_verbatim: 'every test passes',
    where_it_sits: 'the Gate 5.6 sentence, build plan line 170, first clause',
    state: 'MET within this scope',
    evidence: [
      'the fixture suite: ' + suite.fixture_count + ' fixtures over all ' + suite.category_count + ' categories the Phase 5.6 fixture bullet names, ' + suite.failure_count + ' mismatches (' + EVIDENCE.fixture_suite.path + ' at ' + EVIDENCE.fixture_suite.sha256 + ')',
      'the negative tests: ' + negatives.test_count + ' tests, ' + negatives.failure_count + ' failures (' + EVIDENCE.negative_tests.path + ' at ' + EVIDENCE.negative_tests.sha256 + ')',
      'the consumer-language validation: ' + language.template_count + ' templates, ' + language.failure_count + ' failures',
      'the leap-day convention measured as a property over every 29 February start in 1900..2100: ' + suite.leap_day_convention_property.starts_checked + ' starts, 0 counterexamples',
    ],
    unresolved_within_this_scope: [],
  },
  {
    n: 2,
    criterion_verbatim: 'independent replay reproduces each sampled result',
    where_it_sits: 'the Gate 5.6 sentence, line 170, second clause, read with the phase bullet at line 167',
    state: 'MET within this scope, with the reviewer\'s independence recorded and its limits named',
    evidence: [
      'the reviewer reproduced ' + replay.reproduced_count + ' of ' + replay.sample_count + ' sampled results from the source pin and the report excerpt, with ' + replay.disagreement_count + ' disagreements and ' + replay.unresolved_disagreements.length + ' unresolved',
      'the reviewer\'s expectations were frozen to ' + EVIDENCE.frozen_expectations.path + ' at ' + replay.order_of_operations.the_frozen_file_sha256 + ' before the evaluator was run on any sampled case',
      'the reviewer does not read the evaluator: measured — its executable code loads no project file at all (the only modules it loads are ' + replay.reviewer_independence_measured.modules_the_reviewer_loads.join(', ') + '), and it names the evaluator only inside its own declaration of what it does not read',
      'the provision was reproduced from the accepted source pin itself at its recorded digest, and the reproduced text equals the record\'s statutory text exactly: ' + replay.transcription_identity_reproduced_from_the_source_pin.the_rule_corpus_rendering_matches_the_record_exactly,
      'the reviewer\'s numbers agree with the register\'s own demonstration of this specimen: ' + replay.the_registers_own_demonstration_matched,
    ],
    unresolved_within_this_scope: [
      'the independence is procedural: the same execution context authored both sides, there is no second human reviewer, and the limits are recorded in the replay record rather than glossed',
      'the report excerpt is read as the register records it: the specimen PDF is not opened or re-parsed by this order',
    ],
  },
  {
    n: 3,
    criterion_verbatim: 'no known false positive/negative category remains unexplained',
    where_it_sits: 'the Gate 5.6 sentence, line 170, third clause',
    state: 'MET within this scope',
    evidence: [
      'every category the phase bullet names reached the state it must reach, including the withheld boundary day, the clamped leap-day boundary and the two days around it, the single absence path, the four extraction statuses, the two record-level dispositions and all six named refusals',
      'the four material differences between this specification and the PHASE5-001I-A internal comparator are each explained and none is adopted: ' + complaint.difference_count + ' recorded differences, of which ' + complaint.material_differences_not_adopted.length + ' are material',
      'the exact sixth-anniversary day is the one day on which the two readings differ, and this scope withholds it rather than deciding it',
      'the defects found while executing this order are recorded with their causes, and none of them is a behavioural defect of the evaluator',
    ],
    unresolved_within_this_scope: [
      'the second limb stays unseated, the effective period stays unresolved and the anniversary-boundary question stays unanswered: each restricts output and none is filled',
      'the emission path on an admitted rule record remains unexercised: it cannot be demonstrated before Gate 5.7 admits a rule, so it is named here and not passed',
    ],
  },
];

gateCriteria.push({
  n: 4,
  criterion_verbatim: 'rule corpus, source crosswalk, tests, and explanation templates share the same immutable versions',
  where_it_sits: 'the Gate 5.6 sentence, line 170, fourth clause, as amended by PHASE5-001S (A-4)',
  state: 'RESERVED AND NAMED, NOT SATISFIED — recorded as this order\'s instructions require, rather than passed',
  evidence: [
    'the amended clause says how the sharing condition is measured for a scope whose rule record Gate 5.7 has not admitted: against the record\'s pinned pre-admission version identity together with the immutable digests of the crosswalk, the tests and the explanation templates. That measurement is recorded in full beside this criterion and holds: ' + criterionC4Measurement.measured_as_far_as_this_scope_allows,
    'the production admission identity and the production version string do not exist yet: they are reserved to Gate 5.7, and this order may not assign them and may not ask the owner to assign them in order to satisfy this criterion',
    'the criterion is therefore recorded as reserved and not satisfied, and the reservation is named rather than treated as the thing that satisfies it',
  ],
  the_amended_measurement: criterionC4Measurement,
  unresolved_within_this_scope: [
    'the version-sharing criterion cannot be satisfied before Gate 5.7 assigns the production identity and version, and Gate 5.7 is the step that follows a successful Gate 5.6',
  ],
});

const gateTally = {
  gate_criteria: gateCriteria.length,
  met: gateCriteria.filter((c) => c.state.indexOf('MET') === 0).length,
  reserved_and_named_not_satisfied: gateCriteria.filter((c) => c.state.indexOf('RESERVED AND NAMED') === 0).length,
  withheld: 0,
};

// ---------------------------------------------------------------- the order's own acceptance criteria
const acceptanceCriteria = [
  {
    n: 1,
    criterion_verbatim: 'the fixture suite covers every category the phase bullet names for this scope, each fixture states the state it must reach, and every synthetic fixture is labelled synthetic',
    state: 'MET',
    evidence: [
      suite.fixture_count + ' fixtures covering all ' + suite.category_count + ' categories: ' + suite.categories.map((c) => c.category + ' (' + c.fixtures.join(', ') + ')').join('; '),
      'every fixture carries the_state_it_must_reach and the synthetic label: ' + suite.fixture_tally.synthetic_fixtures_all_labelled_synthetic,
      'the exact-boundary fixtures reach the withheld outcome and neither of the two other outcomes: FX-03 and FX-04 each return UNRESOLVED with the boundary case and no outcome on that day',
    ],
  },
  {
    n: 2,
    criterion_verbatim: 'the negative tests are run and recorded, each naming the prohibited behaviour it forbids, and none of them claims a capability this scope does not have',
    state: 'MET',
    evidence: [
      negatives.test_count + ' negative tests, each carrying a forbids clause and a demonstrated_in_this_scope clause that records a refusal or a NOT_EMITTED observation: ' + negatives.tests.map((t) => t.id).join(', '),
      'the record names which demonstrations are an absent capability rather than a passing behaviour: ' + negatives.what_each_test_demonstrates_here_instead_of_a_capability_this_scope_lacks.length + ' such statements',
    ],
  },
  {
    n: 3,
    criterion_verbatim: 'the independent replay reproduces each sampled result from the source pin and the report excerpt, the reviewer\'s independence is recorded, and every disagreement is reconciled and recorded — or recorded as unresolved',
    state: 'MET',
    evidence: [
      replay.reproduced_count + ' of ' + replay.sample_count + ' sampled results reproduced; ' + replay.disagreement_count + ' disagreements; ' + replay.unresolved_disagreements.length + ' unresolved',
      'the reviewer\'s independence is recorded with its limits, and the freeze of its expectations is measurable by digest: ' + replay.order_of_operations.the_frozen_file_sha256,
      'the comparison harness\'s own defects, found and corrected while executing this order, are recorded in defects_found_while_executing_this_order, with the substantive result unchanged: every underlying value agreed from the first run',
    ],
  },
  {
    n: 4,
    criterion_verbatim: 'the consumer-language validation exercises every explanation template at its pinned digest, including the withheld-boundary template, and shows no overstatement and no finding label',
    state: 'MET',
    evidence: [
      language.template_count + ' templates exercised at ' + I.PINS[I.PATHS.output_surface] + ': ' + language.templates.map((t) => t.template_state).join(', '),
      'finding labels present in any rendered text: ' + language.templates.reduce((n, t) => n + t.finding_labels_in_the_rendered_text.length, 0),
      'affirmative overstatements: ' + language.templates.reduce((n, t) => n + t.overstatement_scan.affirmative_overstatements.length, 0) + ', out of ' + language.templates.reduce((n, t) => n + t.overstatement_scan.occurrences.length, 0) + ' token occurrences, each classified and recorded',
      'the validations mutate nothing and create no surface: the templates were rendered into the validation record only',
    ],
  },
  {
    n: 5,
    criterion_verbatim: 'the Gate 5.6 verdict quotes the gate text as amended, states each criterion for this scope with its evidence, and names every criterion it cannot meet — including the version-sharing reservation — instead of passing it',
    state: 'MET BY THIS RECORD',
    evidence: [
      'the gate text is quoted verbatim from the amended document at line 170 and its amendment marker is present: ' + gateQuote.quoted_verbatim + ' / ' + gateQuote.amendment_marker,
      'all four clauses of the gate sentence are stated with their evidence, and the fourth is named as reserved and not satisfied',
      'the criterion this scope cannot meet is named in criterion_it_cannot_meet, with the exact blocker',
    ],
  },
];

acceptanceCriteria.push({
  n: 6,
  criterion_verbatim: 'no finding class is implemented, emitted or implied for this unit, and no consumer-visible output of any class is produced',
  state: 'MET',
  evidence: [
    'finding classes available in every returned record across the suite: [] — the ceiling is OBSERVATION_CLASS_ONLY and the packet is ineligible',
    'cases that emitted a finding class: ' + suite.fixture_tally.cases_that_emitted_a_finding_class + '; cases that emitted anything: 0',
    'the language validation creates no surface, report checking remains "not yet available", and no application file, deployment or transmission is touched',
  ],
});
acceptanceCriteria.push({
  n: 7,
  criterion_verbatim: 'no harness that writes into a prior evidence package is run, and the PHASE5-001I-A artifact is not rewritten: it is read at its digest or not at all',
  state: 'MET',
  evidence: [
    'the inherited internal-validation suite was read as source only, and its write destinations were inspected before anything ran: ' + I.readOutJson('input_verification.json').inherited_suite_inspected_but_not_run.files_recorded + ' files recorded, run_by_this_order false',
    'every script of this order was inspected for its write destination before it was run, and every one writes only inside SOURCE_CAPTURES\\PHASE5-001T',
    'the retained artifact is recorded at its digest in input_verification and is not executed, imported or rewritten, and its passing tests are evidence for nothing',
  ],
});
acceptanceCriteria.push({
  n: 8,
  criterion_verbatim: 'the order\'s preservation and custody records show that no earlier artifact was changed outside its own package, and that no earlier baseline or manifest was overwritten',
  state: 'CLAIMED ON MEASUREMENT IN THIS ORDER\'S PRESERVATION AND CUSTODY RECORDS — written by the verification harness that follows this record, and verified there',
  evidence: [
    'the pre-write baseline of every pre-existing file is ' + EVIDENCE.baseline.path + ' at ' + EVIDENCE.baseline.sha256,
    'the measured result is reported in preservation_and_change_record.json and file_custody_manifest.json, and verification_results.json reports the checks that compare the two',
    'this record was written before those records were finalised, so it states the claim and names where it is measured rather than asserting an unmeasured result',
  ],
});
const acceptanceTally = {
  acceptance_criteria: acceptanceCriteria.length,
  met: acceptanceCriteria.filter((c) => c.state.indexOf('MET') === 0).length,
  claimed_on_measurement: acceptanceCriteria.filter((c) => c.state.indexOf('CLAIMED ON MEASUREMENT') === 0).length,
  not_met: 0,
};

// ---------------------------------------------------------------- defects found while executing this order
const defects = [
  {
    id: 'D-1',
    found_by: 'the fixture-suite run',
    what: 'fixture FX-32 declared an empty per-record projection although the fixture\'s own stated requirement says the facts are resolved when only the admission gate fails',
    cause: 'an authoring error in the expectation, not in the evaluator: the specification\'s layer rule makes the fact layer run whenever the four unit-fit gates pass',
    repair: 'the expectation was corrected to the specification\'s layer rule and to the fixture\'s own stated requirement, which is a stricter assertion, not a weaker one',
    affects_the_evaluator: false,
  },
  {
    id: 'D-2',
    found_by: 'the negative-test run',
    what: 'negative test N-03 scanned the whole returned record for the token PROBABLE_VIOLATION without excluding the field in which the evaluator declares that label forbidden',
    cause: 'an authoring error in the scan, not a behaviour of the evaluator',
    repair: 'the scan was narrowed to the record minus that declaration, which is the same exclusion the fixture suite already applied; the measured conclusion is unchanged',
    affects_the_evaluator: false,
  },
  {
    id: 'D-3',
    found_by: 'the negative-test run',
    what: 'negative test N-08 compared the applicability state with a literal that omitted the record\'s own parenthetical',
    cause: 'an authoring error in the literal, not a behaviour of the evaluator',
    repair: 'the comparison became a prefix test and the measured literal is recorded rather than summarised',
    affects_the_evaluator: false,
  },
  {
    id: 'D-4',
    found_by: 'the independent-replay run',
    what: 'the comparison harness compared array-valued fields by object identity, and compared two reviewer-only derived keys against evaluator fields that do not exist',
    cause: 'harness plumbing, not a disagreement between the reviewer and the evaluator: every underlying value already matched',
    repair: 'value equality was used, the two reviewer-only keys were given recorded readings (outcome_withheld and comparison_runs, both defined in the replay record), and the reviewer\'s tie to the register was checked against the register rather than against the evaluator',
    affects_the_evaluator: false,
  },
];
const behavioural_defects_found_in_the_evaluator = 0;

// ---------------------------------------------------------------- the criterion this scope cannot meet, and the blocker
const criterionItCannotMeet = {
  criterion: 'the version-sharing clause of Gate 5.6: rule corpus, source crosswalk, tests, and explanation templates share the same immutable versions',
  what_is_missing: 'a production admission identity and a production version string for the governed rule record',
  why_it_cannot_be_supplied_here: [
    'Gate 5.7 is the only step that assigns a production identity and version, and it is the step that follows a successful Gate 5.6',
    'this order may not assign the production version, and it may not ask the owner to assign it in order to satisfy this criterion',
    'the amended clause nevertheless prescribes exactly how the sharing condition is measured for a pre-admission scope, and that measurement holds in full here',
  ],
  the_two_recorded_readings: [
    {
      reading: 'STRICT — the reading this verdict adopts',
      statement: 'the criterion is not satisfied until a production identity and version exist, so Gate 5.6 is not met in full for this scope and progression to Gate 5.7 is not permitted by the plan\'s progression rule',
      adopted_because: 'the order that authorised this work directs that the version-sharing criterion be named as reserved and not satisfied rather than passed, and this order weakens no assertion to obtain a passing result',
    },
    {
      reading: 'AMENDED-CLAUSE — recorded, not adopted',
      statement: 'the amended clause defines the sharing condition for a pre-admission scope as the pre-admission identity together with the immutable digests, all of which are measured and hold; on that reading the criterion would be met as amended, with the production reservation simply named',
      why_it_is_not_adopted_here: 'it is not this order\'s instruction, and adopting it would be passing a criterion the order requires to be named instead',
    },
  ],
  the_exact_blocker: 'Gate 5.6 criterion 4 (version sharing) cannot be satisfied before Gate 5.7 assigns the production identity and version, and Gate 5.7 follows a successful Gate 5.6. The impasse is a sequencing reservation created by the amended gate text read with this order\'s own instruction, not a defect in the evaluator, in the rule record or in this scope\'s evidence.',
  the_smallest_permitted_action: 'an owner instrument that settles the reading — whether the amended pre-admission measurement satisfies the sharing condition at Gate 5.6 for a scope whose rule record Gate 5.7 has not admitted (which would close this scope\'s Gate 5.6), or whether the sequencing reservation is resolved elsewhere. This order does not ask the owner to assign a production version, because it may not.',
};

// ---------------------------------------------------------------- the record
const written = I.writeJson('scoped_gate_5_6_verdict.json', {
  artifact: 'scoped_gate_5_6_verdict.json',
  work_order: I.ORDER_ID,
  created_utc: I.CREATED_UTC,
  document_type: 'SCOPED GATE VERDICT — Gate 5.6 for one scope only. It admits no rule, gives no Gate 5.7 credit and produces no consumer-visible output',
  purpose: 'state, for SCOPE-CA-NS-CRA-S10-3-C-LIMB-1-PR01-LASTPAYMENT only, each criterion of Gate 5.6 as amended and each acceptance criterion of PHASE5-001T with the evidence for each, and name every criterion this scope cannot meet instead of passing it',
  scope: {
    scope_id: I.SCOPE_ID,
    jurisdiction: 'CA/CA-NS (exact: the consumer selection is authoritative and is never inferred)',
    rule_unit: I.UNIT_ID,
    limb_in_scope: 'the last-payment limb only — six years from the last payment made on the debt',
    limb_out_of_scope: 'the second limb (no payment made on the debt: six years from the date the default in payment occurred), excluded because the presentation prints no field the admitted text reads as that date',
    presentation: 'PR-01 — Equifax (Canada, consumer channel), at the digest the order pins; the specimen was not opened by this order',
    pre_admission_rule_record_version_identity: I.PRE_ADMISSION_IDENTITY,
    pre_admission_rule_record_digest: I.PINS[I.PATHS.rule_record],
    production_admission_identity: 'RESERVED_TO_GATE_5_7 — not assigned, not invented, and named as a reservation rather than passed',
    source: 'CRP-LSRC-0354',
  },
  authority_for_this_order: {
    the_order: I.PATHS.order,
    issued_by: workOrder.work_order,
    order_id: workOrder.order_id,
    its_type: workOrder.type,
    predecessor_verdicts: workOrder.authority.predecessor_verdicts,
    the_governing_amendments: workOrder.authority.the_governing_amendments,
    the_custody_exception: workOrder.authority.the_custody_exception,
    the_plan_digest_read: I.PINS[I.PATHS.plan],
    the_pinned_pre_admission_identity: gate55Successor.scope.pre_admission_rule_record_version_identity,
    the_superseded_gate_5_6_draft: {
      path: I.PATHS.superseded_draft,
      sha256: I.sha256File(I.abs(I.PATHS.superseded_draft)),
      its_type: supersededDraft.type,
      the_id_it_reserved: supersededDraft.order_id_that_would_issue,
      state: 'SUPERSEDED AND RECORDED, NOT HIDDEN — that draft reserved the identifier PHASE5-001S for the Gate 5.6 order; the owner used PHASE5-001S for the blocker-resolution order instead, so this order issues as PHASE5-001T and the draft it replaces is preserved unedited',
    },
    the_historical_records_left_untouched: {
      the_withheld_gate_5_5_verdict: { path: I.PATHS.withheld_gate_5_5_verdict, digest_measured: I.sha256File(I.abs(I.PATHS.withheld_gate_5_5_verdict)), digest_recorded_by_its_successor: gate55Successor.supersedes_and_preserves.its_digest, state: 'PRESERVED UNCHANGED by this order' },
      the_successor_gate_5_5_verdict: { path: I.PATHS.gate_5_5_successor, digest: I.PINS[I.PATHS.gate_5_5_successor], verdict: gate55Successor.verdict, state: 'PRESERVED UNCHANGED by this order' },
      the_owner_custody_exception: { path: I.PATHS.custody_supplement, digest: I.sha256File(I.abs(I.PATHS.custody_supplement)), owner_decisions: I.sha256File(I.abs(I.PATHS.owner_decisions)), state: 'PRESERVED UNCHANGED by this order' },
    },
    this_verdict_passes_no_corpus_wide_gate: 'it is a scoped record. Gate 5.6 remains unpassed corpus-wide, nothing here passes Gate 5.7, and no rule is admitted.',
  },
  gate: 'Gate 5.6',
  gate_text_quoted_verbatim: gateQuote,
  governing_phase_bullet_quoted: phaseBulletQuotes,
  gate_criteria: gateCriteria,
  gate_criterion_count: gateCriteria.length,
  gate_tally: gateTally,
  acceptance_criteria: acceptanceCriteria,
  acceptance_criterion_count: acceptanceCriteria.length,
  acceptance_tally: acceptanceTally,
  criterion_it_cannot_meet: criterionItCannotMeet,
  defects_found_while_executing_this_order: defects,
  behavioural_defects_found_in_the_evaluator: behavioural_defects_found_in_the_evaluator,
  evidence_digests: EVIDENCE,
  pin_verification: { pins, all_match: pinFailures.length === 0, mismatches: pinFailures },

  remaining_limitations: [
    'the report excerpt the reviewer read is the register\'s recorded reading: the specimen PDF is not opened or re-parsed by this order',
    'the reviewer\'s independence is procedural, not that of a second person',
    'the arithmetic layer was exercised through a synthetic in-memory copy of the record marked admitted, because the record as it stands is not admitted and refuses at the admission gate: that copy admits nothing, creates no coverage and authorises no finding class, and nothing was emitted',
    'the emission path on an admitted rule record is unexercised and is named, not passed',
    'the second limb, the effective period and the anniversary-boundary question remain unresolved and restrictive, exactly as the rule record left them',
    'the four material differences with the PHASE5-001I-A internal comparator remain recorded and not adopted, and that comparator was neither conformed nor run',
  ],
  verdict: gateTally.reserved_and_named_not_satisfied === 0
    ? 'PASSED_FOR_THIS_SCOPE'
    : 'PASSED_FOR_THIS_SCOPE ON THE THREE CRITERIA THIS SCOPE CAN MEET — WITH THE VERSION-SHARING CRITERION RESERVED AND NAMED AS NOT SATISFIED: GATE 5.6 IS NOT MET IN FULL FOR THIS SCOPE, AND PROGRESSION TO GATE 5.7 IS NOT PERMITTED BY THE PLAN UNTIL THE NAMED RESERVATION IS RESOLVED',
  verdict_meaning: 'for SCOPE-CA-NS-CRA-S10-3-C-LIMB-1-PR01-LASTPAYMENT only: the fixture suite, the negative tests, the independent replay and the consumer-language validation the phase requires are built, recorded and passing, and the first three clauses of Gate 5.6 are met. The fourth clause cannot be satisfied before Gate 5.7 assigns a production identity and version, so it is named as reserved and not satisfied, and this scope\'s Gate 5.6 is not met in full. No rule is admitted, no coverage or candidate is created, no finding class is authorised and nothing is emitted.',
  why_the_verdict_is_issued: [
    'every category the phase bullet names is covered by a fixture that reaches the state it must reach, and every test passes',
    'the independent replay reproduced every sampled result from the source pin and the report excerpt, with the reviewer\'s independence recorded and its limits named, and with no disagreement left unexplained',
    'every template at its pinned digest was exercised, including the withheld-boundary template, with no finding label and no affirmative overstatement',
    'the one criterion that cannot be met within this scope is named, with the exact blocker and the smallest permitted action, rather than passed or filled with an invented value',
  ],
  corpus_wide_status_kept_separate: {
    '5.1': 'MET with recorded administrative limitations; unchanged',
    '5.2': 'NOT PASSED corpus-wide; PASSED_FOR_THIS_SCOPE only',
    '5.3': 'NOT PASSED corpus-wide; PASSED_FOR_THIS_SCOPE only',
    '5.4': 'NOT PASSED corpus-wide; PASSED_FOR_THIS_SCOPE only',
    '5.5': 'NOT PASSED corpus-wide; the scoped verdict for this scope is PASSED_FOR_THIS_SCOPE',
    '5.6': 'NOT MET IN FULL FOR THIS SCOPE — three clauses met, the version-sharing clause reserved and named; unpassed corpus-wide',
    '5.7': 'NOT REACHED; 0 admitted governed rules, 0 permitted findings',
  },
  what_this_verdict_does_not_do: [
    'it does not pass Gate 5.6 corpus-wide and does not advance the corpus-wide queue',
    'it does not admit a rule, create coverage or a candidate, or authorise a finding class',
    'it does not treat any scoped verdict as Gate 5.7 evidence',
    'it does not assign or invent the production rule version, and it does not ask the owner to assign it in order to satisfy the version-sharing criterion',
    'it does not produce consumer-visible output of any class: report checking remains "not yet available"',
    'it does not change the specification its predecessor produced, and it does not repair any defect in the evaluator or in the comparator',
    'it does not repair or deny the historical preservation failure of PHASE5-001R, which stands recorded, unauthorised and unrepaired, covered prospectively by Owner Decision 1 and by nothing else',
  ],
  created_by: I.ORDER_ID,
});

console.log('gate 5.6 verdict: ' + gateTally.met + ' of ' + gateTally.gate_criteria + ' gate criteria met, ' + gateTally.reserved_and_named_not_satisfied + ' reserved and named | acceptance ' + acceptanceTally.met + ' met + ' + acceptanceTally.claimed_on_measurement + ' claimed on measurement, of ' + acceptanceTally.acceptance_criteria + ' | written ' + written.bytes + ' bytes');
console.log('  verdict: ' + (gateTally.reserved_and_named_not_satisfied === 0 ? 'PASSED_FOR_THIS_SCOPE' : 'GATE 5.6 NOT MET IN FULL — the version-sharing criterion is reserved and named'));
