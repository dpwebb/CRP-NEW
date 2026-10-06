'use strict';
/**
 * build_001u_owner_records.cjs — PHASE5-001U: the owner decision record and the version-conflict-resolution record.
 *
 * It writes owner_decision_record.json and version_conflict_resolution_record.json, and nothing else. Every digest,
 * count and quoted sentence it carries is read or measured at run time from the artifact it belongs to: nothing is
 * quoted from memory and nothing is asserted that this run did not measure.
 *
 * The two records are records of authority and of measurement. Neither admits a rule, passes a gate, creates coverage
 * or a candidate, or authorises a finding class: the admission this order carries is recorded separately by
 * build_001u_gate57_admission.cjs, and only after the four scoped Gate 5.6 criteria pass.
 */
const lib = require('./lib_001u.cjs');

const P = lib.PATHS;
const sha = (rel) => lib.sha256File(lib.abs(rel));
const countOf = (hay, needle) => hay.split(needle).length - 1;

/** The instruction this order carries, quoted verbatim. */
const OWNER_INSTRUMENT =
  'Complete PHASE5-001U: run and confirm the authored Gate 5.6 remeasurement harness passes all four scoped ' +
  'criteria, then stage the successor scoped verdict and, if all four pass, the reserved Gate 5.7 admission of ' +
  'rule unit CA-NS-CRA-S10-3-C-LIMB-1.';

const amendmentText = lib.readOutJson('amendment_text.json');
const amendmentResult = lib.readOutJson('amendment_application_result.json');
const amendment = amendmentText.amendments[0];
const measure = require('./gate56_001u.cjs').measure();
const byN = {};
measure.gate_criteria.forEach((c) => { byN[c.n] = c; });
const ruleRecord = lib.readJson(P.rule_record);
const crosswalkSelected = lib.readJson(P.crosswalk).selected;
const planText = lib.readText(P.plan);
const planNowDigest = sha(lib.AMENDMENT_TARGET);
const planBytesNow = lib.bytes(lib.AMENDMENT_TARGET);
const planDigestBeforeThisOrder = lib.PINS[lib.AMENDMENT_TARGET];
const clauseAsItNowStands = {
  document: lib.AMENDMENT_TARGET,
  document_rank: '5 — Approved Build Plan (authority order: CRP_CORE_CONSTITUTION.md section 2)',
  clause: amendment.clause,
  line: amendment.line_before_amendment + 1,
  text_now_verbatim: planText.split('\n')[amendment.line_before_amendment],
  replacement_text_quoted_by_this_record: amendment.replacement_text,
  replaced_text_quoted_by_this_record: amendment.replaced_text,
  replacement_text_occurrences_in_the_document_now: countOf(planText, amendment.replacement_text),
  replaced_text_occurrences_in_the_document_now: countOf(planText, amendment.replaced_text),
  requirement_removed: amendment.requirement_removed,
  extension_only: amendment.type === 'REPLACE_BY_EXTENSION' && amendment.requirement_removed === false,
  amendment_history_rows_this_order_appended: amendmentText.rows_appended,
};
// ------------------------------------------------------------------ owner_decision_record.json
const ownerDecision = {
  artifact: 'owner_decision_record.json',
  work_order: lib.ORDER_ID,
  created_utc: lib.CREATED_UTC,
  document_type: 'OWNER DECISION RECORD — the owner instrument this order carries, quoted, with the two decisions read from it and the exact limits of each',
  purpose: 'record the authority this order acts under verbatim, so that the amendment it applied and the admission it executes can be read against the instrument that authorised them, and so that neither can be read past its limits',
  the_instrument_this_order_carries: {
    owner_instrument_verbatim: OWNER_INSTRUMENT,
    what_it_authorises: [
      'the re-measurement of the four scoped Gate 5.6 criteria from the live artifacts, at their measured digests',
      'the staging of the successor scoped Gate 5.6 verdict, for this one scope only',
      'the reserved Gate 5.7 admission of the rule unit CA-NS-CRA-S10-3-C-LIMB-1, if and only if all four scoped Gate 5.6 criteria pass',
    ],
    the_amendment_authority_it_carries: 'the owner-authorised amendment of the Gate 5.6 pre-admission sharing sentence, recorded in amendment_text.json and amendment_application_result.json, whose replacement text is applied under owner authority PHASE5-001U',
    what_it_does_not_authorise: [
      'it names no finding class for the admitted unit',
      'it does not authorise consumer-visible output of any class, an application change, a deployment or an external transmission',
      'it does not authorise the admission of any other rule unit, jurisdiction, limb or presentation',
      'it does not authorise a change to statutory text or the conversion of a probable result into a violation',
    ],
  },
  decisions: [
    {
      id: 'OWNER-DECISION-1',
      title: 'THE VERSION-SHARING READING',
      the_conflict_it_settles: 'the sequencing reservation PHASE5-001T recorded: Gate 5.6 criterion 4 requires the rule corpus, the crosswalk, the tests and the explanation templates to share the same immutable versions, the governed rule record carries rule_version RESERVED_TO_GATE_5_7, and Gate 5.7 is the only step that assigns a production identity and a production version string — so the criterion could not be satisfied before the step it gates',
      the_decision_recorded: 'for a scope whose governed rule record Gate 5.7 has not yet admitted, the sharing condition is measured against the shared, verified, immutable pre-admission version identity of the artifacts the scope reads and writes, each at an immutable digest; that condition is met or not met before any production identity exists, and the production identity and version remain a Gate 5.7 assignment',
      where_the_decision_lives: {
        instrument: 'the PHASE5-001U instruction quoted above, whose amendment authority is stated in the applied clause itself',
        amendment_applied: amendment.id,
        document: lib.AMENDMENT_TARGET,
        document_rank: '5 — Approved Build Plan',
        digest_before_this_order: amendmentText.digest_before,
        digest_after_the_amendment: amendmentText.digest_after,
        digest_measured_now: planNowDigest,
        digest_now_equals_digest_after: planNowDigest === amendmentText.digest_after,
        application_result: 'SOURCE_CAPTURES' + lib.wr('/PHASE5-001U/amendment_application_result.json') + ' at ' + lib.outSha('amendment_application_result.json'),
      },
      what_it_authorises: [
        'the measurement of Gate 5.6 criterion 4 for this scope against the shared pre-admission version identity together with the immutable digests of the rule record, the crosswalk, the tests and the explanation templates',
        'a scoped Gate 5.6 verdict that records the sharing condition against that identity and names the production reservation beside it',
      ],
      what_it_expressly_does_not_do: [
        'it does not assign a production identity or a production version string: Gate 5.7 remains the only step that does, and this order executes that step only because all four scoped Gate 5.6 criteria pass on the measurement',
        'it does not treat the reservation, the existence of the amended clause, or the prospect of a later assignment as evidence that sharing holds',
        'it does not remove any requirement from the Gate 5.6 sentence, from any other gate, or from any other clause of the plan: the amendment is a quoted extension whose replaced text survives verbatim',
        'it does not pass Gate 5.6 by itself: the clause records which measurement satisfies the sharing condition, and the criteria are measured separately in scoped_gate_5_6_verdict_successor.json',
      ],
      measured_under_it_in_this_order: [
        'the four clauses were re-measured from the live artifacts: ' + measure.gate_tally.met + ' of ' + measure.gate_tally.clauses + ' met, ' + measure.gate_tally.not_met + ' not met, ' + measure.problems_found_in_this_re_measurement.length + ' problems found in the re-measurement',
        'the sharing condition was measured against ' + byN[4].measurement.shared_pre_admission_identity + ' with the rule record at ' + byN[4].measurement.rule_record_digest,
        'production identity strings found in the measured artifacts before the Gate 5.7 assignment: ' + byN[4].measurement.production_identity_strings_found_in_the_measured_artifacts,
      ],
    },
    {
      id: 'OWNER-DECISION-2',
      title: 'THE SCOPE ADMISSION AND THE FINDING-CLASS CEILING',
      the_instrument: 'the PHASE5-001U instruction quoted above: the reserved Gate 5.7 admission of rule unit CA-NS-CRA-S10-3-C-LIMB-1, conditional on all four scoped Gate 5.6 criteria passing',
      the_condition_it_was_given: 'all four scoped Gate 5.6 criteria pass',
      the_condition_measured_now: measure.every_clause_met === true
        ? 'SATISFIED — all ' + measure.gate_tally.clauses + ' criteria are met on this re-measurement, with no problem reported, so the admission proceeds'
        : 'NOT SATISFIED — the admission is not executed and this order stops short of it',
      what_it_authorises: [
        'the rule-corpus amendment this order records, containing this one rule at its immutable ID, its assigned version and its full provenance',
        'the formal admission of this one rule unit, for this one scope only, in this order\'s admission record',
        'the assignment of the production admission identity and the production version string to that one rule record, which is the reservation Gate 5.6 named',
      ],
      the_finding_class_decision: {
        state: 'WITHHELD — NO FINDING CLASS IS AUTHORISED',
        why_this_is_read_rather_than_chosen: 'the instrument this order carries authorises the admission and names no finding class. The reserved draft order this admission executes carries the stop condition "if the owner withholds the finding-class decision, the rule record is admitted at the observation ceiling and the limitation is recorded rather than filled". The condition is met as the draft order requires; it is not filled.',
        the_ceiling_therefore_recorded: 'OBSERVATION_CLASS_ONLY — the ceiling the governed rule record itself retains, unchanged, at ' + P.rule_record,
        what_it_does_not_do: [
          'it does not authorise VIOLATION in any circumstance',
          'it does not authorise PROBABLE_VIOLATION in any circumstance',
          'it does not adopt the PROD-003 crosswalk proposal of PROBABLE_VIOLATION, which the rule record itself records as proposed and not adopted',
        ],
      },
      what_it_expressly_does_not_do: [
        'it does not change statutory text and does not turn a probable result into a violation',
        'it does not authorise the emission of any finding class, and it authorises no consumer-visible output of any class',
        'it does not integrate anything into the application, deploy anything or transmit anything: release remains a separate product and deployment decision',
        'it does not decide the effective period, the direct-report contract section 4 retention exception, the anniversary-boundary question, the comparison reference date or the printed-field question: each stays carried in the admitted record at its own recorded state',
        'it does not clear the register disposition of the admitted source entry: that row\'s clearing authority is an authorised evidence route for the report representation together with owner direction',
        'it admits no rule for any other scope, jurisdiction, limb or presentation, and it does not advance the corpus-wide queue',
      ],
      measured_under_it_in_this_order: [
        'the amendment records ' + amendmentText.replacements + ' quoted replacement and ' + amendmentText.rows_appended + ' amendment-history row, and it is extension-only: requirement removed = ' + amendment.requirement_removed,
        'the finding classes authorised recorded by this order: none, and the observation-class ceiling is recorded in counts_001u.json and in scoped_gate_5_7_verdict.json',
      ],
    },
  ],
  decision_count: 2,
  clause_as_the_document_now_stands: clauseAsItNowStands,
  what_neither_decision_does: [
    'neither decision creates coverage in the application, a candidate or a finding class',
    'neither decision produces consumer-visible output of any class: report checking remains "not yet available"',
    'neither decision amends any document other than the one plan the amendment names',
    'neither decision changes an earlier verdict, manifest, baseline, register row or the governed rule record itself',
  ],
  fixed_state_read_at_run_time: {
    plan_digest_before_this_order: planDigestBeforeThisOrder,
    plan_digest_now: planNowDigest,
    plan_bytes_before: amendmentResult.bytes_before,
    plan_bytes_now: planBytesNow,
    plan_amended_by_this_order: planNowDigest !== planDigestBeforeThisOrder,
    plan_amendments_recorded: amendmentResult.amendments_applied,
    rule_record_digest: sha(P.rule_record),
    rule_record_admission_form_at_read_time: ruleRecord.admission_state.admission_form,
    crosswalk_entry_this_scope_is_bound_to: crosswalkSelected.combination_id,
  },
  created_by: lib.ORDER_ID,
};
const ownerWritten = lib.writeJson('owner_decision_record.json', ownerDecision);

// ------------------------------------------------------------------ version_conflict_resolution_record.json
const versionResolution = {
  artifact: 'version_conflict_resolution_record.json',
  work_order: lib.ORDER_ID,
  created_utc: lib.CREATED_UTC,
  document_type: 'VERSION-CONFLICT RESOLUTION RECORD — the conflict as it was recorded, the two readings, the reading the owner instrument adopts for it, and the measurement that follows from it',
  purpose: 'set out without weakening any assertion the sequencing conflict PHASE5-001T recorded between the version-sharing clause of Gate 5.6 and the rule record\'s reserved version, and record exactly how the sharing condition is measured for this scope now that the resolution is in force',
  the_conflict_as_recorded: {
    recorded_by: 'SOURCE_CAPTURES\\PHASE5-001T\\next_work_order.json and SOURCE_CAPTURES\\PHASE5-001T\\scoped_gate_5_6_verdict.json, preserved unchanged',
    predecessor_verdict: {
      path: P.gate_5_6_verdict,
      sha256: sha(P.gate_5_6_verdict),
      preserved_unchanged_here: true,
      clauses_it_recorded_met: 3,
      criterion_it_recorded_as_reserved_and_not_satisfied: 4,
      verdict_it_reached: lib.readJson(P.gate_5_6_verdict).verdict,
    },
    criterion: 'Gate 5.6, fourth clause: rule corpus, source crosswalk, tests, and explanation templates share the same immutable versions',
    what_was_missing: 'a production admission identity and a production version string for the governed rule record',
    why_it_could_not_be_supplied_then: [
      'Gate 5.7 is the only step that assigns a production identity and version, and it is the step that follows a successful Gate 5.6',
      'the Gate 5.6 order may not assign the production version and may not ask the owner to assign it in order to satisfy the criterion',
    ],
    the_measurable_facts_that_created_it: {
      rule_record_path: P.rule_record,
      rule_record_digest: sha(P.rule_record),
      rule_record_version_field: ruleRecord.rule_identity.rule_version,
      rule_record_admission_form: ruleRecord.admission_state.admission_form,
      rule_id_immutable: ruleRecord.rule_identity.rule_id_is_immutable,
      identity_suffix_measured_from_the_digest: byN[4].measurement.digest_prefix_12,
      identity_suffix_equals_the_content_digest_12: byN[4].measurement.digest_prefix_12 === lib.CONTENT_DIGEST_12,
      corpus_wide_admitted_governed_rules_before_this_order: ruleRecord.admission_state.admitted_governed_rules_after_this_order,
    },
  },
  the_two_readings_recorded_by_the_predecessor: [
    {
      reading: 'STRICT',
      statement: 'the criterion is not satisfied until a production identity and version exist, so Gate 5.6 is not met in full for the scope and progression to Gate 5.7 is not permitted by the plan\'s progression rule',
      status_now: 'SUPERSEDED FOR THIS SCOPE BY THE OWNER INSTRUMENT — the amended clause states that the sharing condition is measurable, and is met or not met, before Gate 5.7 has assigned any production identity. The predecessor verdict that recorded the strict reading is preserved unchanged at ' + sha(P.gate_5_6_verdict),
    },
    {
      reading: 'AMENDED-CLAUSE',
      statement: 'the amended clause defines the sharing condition for a pre-admission scope as the shared pre-admission version identity together with the immutable digests of the four artifacts, which are measured and hold',
      status_now: 'ADOPTED FOR THIS SCOPE BY THE OWNER INSTRUMENT and recorded as the reading this order measures against — not as evidence: the conditions are measured in scoped_gate_5_6_verdict_successor.json',
    },
  ],
  the_resolution: {
    form: 'a governing amendment by quoted replacement, applied under the owner instrument this order carries, through the procedure of CRP_CORE_CONSTITUTION.md sections 6.1, 6.2 and 6.5',
    the_amendment: {
      id: amendment.id,
      type: amendment.type,
      document: amendmentText.document,
      clause: amendment.clause,
      replaced_text_quoted_verbatim: amendment.replaced_text,
      replacement_text_stated: amendment.replacement_text,
      extension_only_no_requirement_removed: amendment.requirement_removed === false,
      replaced_text_survives_verbatim_in_the_document: clauseAsItNowStands.replaced_text_occurrences_in_the_document_now >= 1,
      replacement_text_occurrences_in_the_document_now: clauseAsItNowStands.replacement_text_occurrences_in_the_document_now,
      amendment_history_rows_appended: amendmentText.rows_appended,
      digest_before: amendmentText.digest_before,
      digest_after: amendmentText.digest_after,
      digest_measured_now: planNowDigest,
      digest_measured_now_equals_digest_after: planNowDigest === amendmentText.digest_after,
    },
    what_the_resolution_changes: [
      'the Gate 5.6 sentence now states which measurement satisfies the sharing condition for a scope whose record Gate 5.7 has not admitted, and states that the condition is met or not met before any production identity exists',
      'it states that Gate 5.7 remains the only step that assigns a production identity and a production version string, that the requirement to name the reservation is unchanged, and that no gate is passed by the clause alone',
    ],
    what_the_resolution_does_not_change: [
      'no requirement is removed from the Gate 5.6 sentence or from any other clause: the replaced text survives verbatim inside the replacement, and this record measures that survival',
      'no gate is passed by the amendment: the four scoped criteria are measured separately, and the Gate 5.7 verdict is reached only from those measurements',
      'the governed rule record itself is not edited: it stays at its pinned digest, because its bytes are the content the pre-admission identity was derived from and a change to them would change the identity and invalidate the validation',
      'the predecessor Gate 5.6 verdict is not edited, reopened or replaced in place: it stays at its own digest',
    ],
  },
  how_the_sharing_condition_is_measured_now: {
    the_shared_identity: byN[4].measurement.shared_pre_admission_identity,
    how_the_identity_is_derived: 'it is content-derived from the governed rule record\'s pinned digest: the twelve-character suffix ' + lib.CONTENT_DIGEST_12 + ' is the first twelve characters of that digest, so the identity names a version of the content rather than an admitted production version',
    the_four_artifacts_the_clause_names_and_where_each_is_pinned: {
      rule_corpus: { path: P.rule_record, sha256: byN[4].measurement.rule_record_digest, carries_the_identity_by_value_and_digest: true, state: 'PINNED' },
      source_crosswalk: { path: P.crosswalk, sha256: sha(P.crosswalk), carries_the_identity_by_value_and_digest: false, bound_by: 'the immutable rule id ' + crosswalkSelected.rule_unit + ' and the source entry ' + crosswalkSelected.source_entry_id + ' it names, at a pinned digest', state: 'PINNED' },
      tests: { paths: [P.fixture_suite, P.negative_tests], sha256: [sha(P.fixture_suite), sha(P.negative_tests)], carries_the_identity_by_value_and_digest: true, state: 'PINNED' },
      explanation_templates: { path: P.output_surface, sha256: sha(P.output_surface), carries_the_identity_by_value_and_digest: false, bound_by: 'the immutable rule id the templates are written for, at a pinned digest', state: 'PINNED' },
    },
    what_the_two_artifacts_without_a_version_field_are_bound_by: 'each is bound to the same immutable rule id at its own pinned digest, so the scope reads one version of each; that construction is recorded rather than presented as a version field that does not exist',
    measured_result: byN[4].state,
    failures_found_in_the_measurement: byN[4].failures_found_here,
    every_pin_this_measurement_rests_on_matches: byN[4].measurement.every_pin_this_measurement_rests_on_matches,
    production_identity_strings_found_in_the_measured_artifacts: byN[4].measurement.production_identity_strings_found_in_the_measured_artifacts,
  },
  the_assignment_the_resolution_leaves_to_gate_5_7: {
    what_it_is: 'the production admission identity ' + lib.PRODUCTION_ADMISSION_IDENTITY + ' and the production version string ' + lib.PRODUCTION_VERSION_STRING + ' for the one governed rule record',
    who_assigns_it: 'Gate 5.7, executed by this order because all four scoped Gate 5.6 criteria pass on this measurement',
    recorded_where: 'SOURCE_CAPTURES\\PHASE5-001U\\admission_record_001u.json and SOURCE_CAPTURES\\PHASE5-001U\\rule_corpus_amendment_001u.json',
    what_the_assignment_does_not_do: 'it does not edit the governed rule record, does not change its digest, and does not by itself authorise any finding class or any consumer-visible output',
  },
  conflict_rows: [
    {
      id: 'VC-1',
      matter: 'which measurement the Gate 5.6 sharing condition reads for a scope whose record Gate 5.7 has not admitted',
      state: 'CLOSED BY OWNER-DECISION-1 through the applied amendment; measured in scoped_gate_5_6_verdict_successor.json',
      how_it_was_closed: 'by governing amendment under owner authority, not by weakening the assertion: the measurement is reported with its failures list and its unresolved items, both empty here',
    },
    {
      id: 'VC-2',
      matter: 'who assigns the production identity and version, and when',
      state: 'CLOSED — Gate 5.7, executed in this order only because all four scoped Gate 5.6 criteria pass',
      how_it_was_closed: 'the assignment was not made early to satisfy a gate and was not made before the four criteria were measured',
    },
    {
      id: 'VC-3',
      matter: 'whether the governed rule record must be edited to carry the assigned version',
      state: 'CLOSED — NO. The record stays at its pinned digest; the assignment is recorded in this order\'s amendment and admission records, and the identity is derived from the record\'s unchanged content digest',
      how_it_was_closed: 'the record was not rewritten, re-dated or re-serialised by this order; post_assignment_binding_verification_001u.json re-measures it after the assignment and reports whether it moved',
    },
  ],
  what_this_record_does_not_do: [
    'it does not pass a gate: it records a conflict, the reading the owner instrument adopts for it, and the measurement that follows; the gate verdicts are scoped_gate_5_6_verdict_successor.json and scoped_gate_5_7_verdict.json',
    'it does not edit the predecessor verdict or any earlier record',
    'it does not decide the effective period, the exception, the boundary question, the reference date or the printed-field question',
    'it does not authorise a finding class, a consumer surface, an application change, a deployment or an external transmission',
  ],
  created_by: lib.ORDER_ID,
};
const versionWritten = lib.writeJson('version_conflict_resolution_record.json', versionResolution);

console.log(JSON.stringify({
  every_clause_met: measure.every_clause_met,
  written: [ownerWritten, versionWritten].map((w) => w.artifact + ' ' + w.bytes + 'B ' + w.sha256),
  plan_digest_now: planNowDigest,
  plan_amended_by_this_order: planNowDigest !== planDigestBeforeThisOrder,
}, null, 1));





