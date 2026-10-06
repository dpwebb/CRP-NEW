'use strict';
/**
 * build_001u_admission.cjs — PHASE5-001U: execute the reserved Gate 5.7 admission of one rule unit.
 *
 * It is run only because all four scoped Gate 5.6 criteria pass on this order's re-measurement (gate56_001u.cjs,
 * every_clause_met = true). It writes four records, in this order:
 *
 *   1. rule_corpus_amendment_001u.json          — the rule-corpus amendment the owner approved: one rule, at its
 *                                                 immutable ID and assigned version, with its full provenance.
 *   2. admission_record_001u.json               — the formal admission of that one rule unit, for this one scope,
 *                                                 with the digests it binds and the limits it carries.
 *   3. counts_001u.json                         — the corpus counts this order records, each read from its own
 *                                                 source, none of them represented as certified.
 *   4. post_assignment_binding_verification_001u.json — the admission re-measured after every write, reporting
 *                                                 whether anything it rested on moved.
 *
 * Every measurement comes from gate57_001u.cjs, which reads the live artifacts. This script decides nothing: it
 * records what the measurement found, including the finding class the owner withholds and the counts that are not
 * certified. It admits no other rule, creates no coverage, changes no register row and emits nothing.
 */
const lib = require('./lib_001u.cjs');
const g = require('./gate57_001u.cjs');

const P = lib.PATHS;
const m = g.measure();
const sha = (rel) => lib.sha256File(lib.abs(rel));
const outSha = (name) => lib.outSha(name);

const gate56 = m.gate_5_6_result_the_admission_is_conditional_on;

/**
 * The reserved Gate 5.7 admission is conditional on this. If any of the four scoped Gate 5.6 criteria is not met on
 * this order's own re-measurement, nothing is written, the finding-class decision is not read as a substitute, and
 * the condition is reported instead of being waived.
 */
if (gate56.every_clause_met !== true) {
  console.log('=== PHASE5-001U GATE 5.7 ADMISSION WITHHELD ===');
  console.log('The Gate 5.7 admission is conditional on all four scoped Gate 5.6 criteria passing.');
  console.log('Measured now: every_clause_met = ' + gate56.every_clause_met);
  console.log('Tally: ' + JSON.stringify(gate56.gate_tally));
  console.log('Clause states:');
  gate56.clause_states.forEach((c) => console.log('  - ' + c));
  console.log('Problems recorded: ' + JSON.stringify(gate56.problems_recorded));
  console.log('No record has been written by this script. The condition is reported, not waived.');
  process.exit(1);
}
const ruleRecord = m.the_governed_rule_record;
const crosswalk = m.the_source_crosswalk;
const counts = m.corpus_counts;
const owner = lib.readOutJson('owner_decision_record.json');
const versionConflict = lib.readOutJson('version_conflict_resolution_record.json');
const amendmentText = lib.readOutJson('amendment_text.json');
const amendmentResult = lib.readOutJson('amendment_application_result.json');
const ruleRecordJson = lib.readJson(P.rule_record);

const admittedRule = {
  immutable_rule_id: lib.UNIT_ID,
  assigned_rule_version: lib.PRODUCTION_VERSION,
  assigned_version_string: lib.PRODUCTION_VERSION_STRING,
  production_admission_identity: lib.PRODUCTION_ADMISSION_IDENTITY,
  pre_admission_identity_this_supersedes: lib.PRE_ADMISSION_IDENTITY,
  version_field_of_the_pinned_rule_record: 'RESERVED_TO_GATE_5_7 — resolved by reference, in this record and in the admission record; the pinned rule record is not edited and its digest does not move',
  jurisdiction: {
    country_code: 'CA',
    region_code: 'CA-NS',
    instrument: ruleRecordJson.legal_proposition.instrument,
    cited_provision: ruleRecordJson.consumer_citation,
  },
  scope_id: lib.SCOPE_ID,
  limb_in_scope: 'the first limb of s. 10(3)(c): six years after the last payment made on the debt',
  limb_out_of_scope_and_unseated: ruleRecordJson.scope.limb_out_of_scope,
  presentation: {
    presentation_id: 'PR-01',
    artifact_id: 'LEG-CONSUMER-EQ-CA',
    sha256: ruleRecordJson.scope.presentation.sha256,
    admission_boundary: ruleRecordJson.scope.presentation.admission_boundary,
  },
  source_entry: {
    source_entry_id: counts.the_admitted_source_entry.source_entry_id,
    provision_or_citation: counts.the_admitted_source_entry.provision_or_citation,
    catalogue_row_state: counts.the_admitted_source_entry.disposition + ' / ' + counts.the_admitted_source_entry.disposition_state,
    catalogue_row_state_after_this_amendment: counts.the_admitted_source_entry.state_after_this_order,
  },
  accepted_source_pin: {
    artifact: ruleRecordJson.legal_proposition.source_pin.artifact,
    sha256: ruleRecordJson.legal_proposition.source_pin.sha256,
    bytes: ruleRecordJson.legal_proposition.source_pin.bytes,
    pin: ruleRecordJson.legal_proposition.source_pin.pin,
    role: 'the accepted legal authority pin: it establishes what the law says and is not consumer evidence; it is cited and it is not read by the evaluator',
  },
  governed_rule_record: {
    path: ruleRecord.path,
    sha256: ruleRecord.sha256,
    bytes: ruleRecord.bytes,
    governed_fields_recorded: ruleRecordJson.governed_fields.length,
    unresolved_dependencies_carried: ruleRecord.unresolved_dependencies_carried,
  },
};

/** The provenance rows: every record this admission rests on, each at its measured digest. */
function provenanceRows() {
  const pin = (key) => {
    const row = m.binding_rows_at_admission.filter((r) => r.key === key)[0];
    return { record: key, path: row.path, sha256: row.sha256_now, present_in_this_workspace: row.present_in_this_workspace };
  };
  const out = (name, what) => ({ record: what, path: lib.wr('SOURCE_CAPTURES/PHASE5-001U/' + name), sha256: outSha(name), present_in_this_workspace: true });
  return {
    the_rule_itself: [
      pin('rule_record'),
      pin('register'),
      pin('crosswalk'),
    ],
    the_evaluation_this_rule_is_admitted_with: [
      pin('fact_model'),
      pin('status_vocabulary'),
      pin('specification'),
      pin('evaluator'),
      pin('determinism_check'),
      pin('output_surface'),
      pin('inputs_source'),
      pin('reviewer_source'),
    ],
    the_tests_it_passed: [
      pin('fixture_suite'),
      pin('negative_tests'),
      pin('replay_expectations'),
      pin('independent_replay'),
      pin('consumer_language'),
      pin('fixture_catalogue_source'),
      pin('fixtures_source'),
    ],
    the_corpus_records_the_counts_are_read_from: [
      pin('rescreen_register'),
      pin('coverage_summary'),
      pin('coverage_ledger'),
    ],
    the_scoped_gate_verdicts_it_stands_on: [
      { record: 'scoped Gate 5.2 verdict', path: lib.wr(P.gate_5_2_verdict), sha256: sha(P.gate_5_2_verdict), present_in_this_workspace: true },
      { record: 'scoped Gate 5.3 verdict', path: lib.wr(P.gate_5_3_verdict), sha256: sha(P.gate_5_3_verdict), present_in_this_workspace: true },
      { record: 'scoped Gate 5.4 verdict', path: lib.wr(P.gate_5_4_verdict), sha256: sha(P.gate_5_4_verdict), present_in_this_workspace: true },
      { record: 'withheld Gate 5.5 verdict, preserved', path: lib.wr(P.withheld_gate_5_5_verdict), sha256: sha(P.withheld_gate_5_5_verdict), present_in_this_workspace: true },
      { record: 'successor scoped Gate 5.5 verdict', path: lib.wr(P.gate_5_5_successor), sha256: sha(P.gate_5_5_successor), present_in_this_workspace: true },
      { record: 'original scoped Gate 5.6 verdict, preserved as the predecessor', path: lib.wr(P.gate_5_6_verdict), sha256: sha(P.gate_5_6_verdict), present_in_this_workspace: true },
      { record: 'successor scoped Gate 5.6 verdict: the four clauses on this re-measurement', path: gate56.successor_record, sha256: gate56.successor_sha256, present_in_this_workspace: true },
    ],
    the_authority_and_its_resolution: [
      { record: 'the owner instrument this order carries, quoted', path: lib.wr('SOURCE_CAPTURES/PHASE5-001U/owner_decision_record.json'), sha256: outSha('owner_decision_record.json'), present_in_this_workspace: true },
      out('version_conflict_resolution_record.json', 'the version-conflict resolution record'),
      out('amendment_text.json', 'the amendment text (A-U-1, quoted)'),
      out('amendment_application_result.json', 'the amendment application result'),
      { record: 'the governing build plan, as amended by this order', path: lib.AMENDMENT_TARGET, sha256: amendmentResult.digest_after, present_in_this_workspace: true },
      { record: 'the governing build plan as it stood before this order amended it', path: lib.AMENDMENT_TARGET, sha256: amendmentResult.digest_before, present_in_this_workspace: false },
      { record: 'the rank-2 core constitution, read only', path: lib.wr(P.constitution), sha256: sha(P.constitution), present_in_this_workspace: true },
    ],
    the_reserved_draft_order_this_admission_executes: [
      { record: 'the reserved order this admission executes', path: lib.wr(P.gate_5_6_order), sha256: sha(P.gate_5_6_order), present_in_this_workspace: true },
    ],
  };
}

const amendment = {
  artifact: 'rule_corpus_amendment_001u.json',
  work_order: lib.ORDER_ID,
  created_utc: lib.CREATED_UTC,
  document_type: 'RULE-CORPUS AMENDMENT — one rule unit, admitted at its immutable ID and assigned version, for one scope only',
  purpose: 'record, as the governed legal rule corpus amendment Gate 5.7 requires, exactly one admitted rule unit with its immutable ID, its assigned version, its full provenance, the digests it is bound by and the output restrictions it carries — and record separately every count this amendment does and does not affect',
  the_governing_requirement_this_amendment_satisfies: {
  the_gate: 'Gate 5.7',
  the_requirement_quoted_from_the_plan: 'the plan requires, for this stage, a rule-corpus amendment containing immutable IDs and versions, approved by the owner after Gates 5.1–5.6 pass for this scope, together with the exclusion counts recorded separately and the coverage counts updated',
  where_it_is_recorded: lib.AMENDMENT_TARGET + ', section 3 (Gate 5.7) and its Phase 5.7 bullets',
  how_this_amendment_satisfies_it: [
    'immutable IDs: the rule unit ID the record carries is immutable, and the rule record itself records rule_id_is_immutable = true',
    'versions: the assigned production version string is recorded in this amendment and in the admission record, and it supersedes the pre-admission identity by reference without editing the pinned rule record',
    'owner approval: the owner instrument this order carries approves the amendment authority and the admission; the finding-class decision it carries is read as it is, not filled',
    'Gates 5.1–5.6: every scoped verdict stands at its own digest, and Gate 5.6 passes all four clauses on this order\'s re-measurement',
    'exclusion counts recorded separately: recorded in counts_001u.json, with the one historical excluded figure marked uncertified and unattributed',
    'coverage counts: recorded in counts_001u.json as they are, without converting available figures into governed coverage',
  ],
},
the_amendment: {
  amendment_id: 'A-U-2',
  form: 'extension-only addition of one admitted rule to the governed legal rule corpus, recorded in this order\'s artifacts',
  what_it_adds: 'exactly one complete rule unit, at its immutable ID, its assigned version and its full provenance',
  what_it_changes_in_the_plan: 'nothing: the plan was amended once by A-U-1 earlier in this order, and this admission is recorded in artifacts rather than by a second plan amendment',
  approved_by_the_owner: {
    instrument: lib.wr('SOURCE_CAPTURES/PHASE5-001U/owner_decision_record.json'),
    instrument_sha256: outSha('owner_decision_record.json'),
    decision: 'OWNER-DECISION-2 — the scope admission, conditional on all four scoped Gate 5.6 criteria passing',
    how_approval_is_read: 'the instrument authorises this amendment expressly; the amendment is not inferred from the admission, and the admission is not inferred from the amendment',
  },
  the_condition_it_waited_on: {
    requirement: 'all four scoped Gate 5.6 criteria pass',
    measured_now: gate56.every_clause_met ? 'SATISFIED' : 'NOT SATISFIED',
    tally: gate56.gate_tally,
    verdict_record: gate56.successor_record,
    verdict_sha256: gate56.successor_sha256,
  },
  entries_before_this_amendment: { governed_rules_admitted: 0, governed_coverage_entries: 0, authorised_finding_classes: 0 },
  entries_after_this_amendment: { governed_rules_admitted: 1, governed_coverage_entries: 1, authorised_finding_classes: 0 },
},
rules_admitted: [admittedRule],
rules_not_admitted_this_amendment: {
  count: 0,
  statement: 'this amendment admits exactly one rule unit and admits no other: zero further units are admitted, and no unit is silently dropped',
  candidates_preserved_as_candidates: [
    { combination_id: crosswalk.runner_up.combination_id, rule_unit: crosswalk.runner_up.rule_unit, source_entry_id: crosswalk.runner_up.source_entry_id, state: crosswalk.runner_up.state_after_this_order },
  ],
  combinations_recorded_as_rejected_and_left_as_recorded: {
    count: crosswalk.rejection_count,
    state: crosswalk.rejections_state_after_this_order,
  },
  the_corpus_rows_this_amendment_does_not_move: counts.the_admitted_source_entry.state_after_this_order,
},
counts_this_amendment_records: {
  register_rows_read: counts.register_rows,
  register_disposition_tally: counts.register_disposition_tally,
  register_excluded_rows: counts.register_excluded_rows,
  register_excluded_note: 'no register row carries a disposition of EXCLUDED: the register\'s own dispositions are UNRESOLVED, GAP and REFUSAL, and the only excluded figure in the record is the preserved historical tally, recorded separately and uncertified',
  the_preserved_historical_tally: m.the_preserved_historical_tally,
  coverage_summary_counts_are_planning_figures: {
    what_they_are: counts.coverage_available_for_implementation,
    what_they_are_not: 'they are not certified governed coverage: they count accepted source records available for implementation, and this amendment converts exactly one of them into one governed rule',
    coverage_summary_register_disposition: counts.coverage_summary_register_disposition,
    canonical_jurisdiction_status: counts.coverage_summary_canonical_jurisdiction_status,
    limitation_or_retention_family_entries: counts.coverage_summary_limitation_or_retention_family,
    per_jurisdiction_ca_ns: counts.coverage_summary_per_jurisdiction_ca_ns,
  },
},
what_this_amendment_does_not_do: [
  'it admits no rule for any other jurisdiction, rule unit, limb or presentation, and it does not advance the corpus-wide Gate 5.7 queue',
  'it authorises no finding class and produces no consumer-visible output of any class',
  'it clears no register row: the source entry of the admitted rule still reads UNRESOLVED / BLOCKED_MISSING_EVIDENCE',
  'it does not edit the governed rule record, its digest, any earlier verdict, manifest, baseline or register row',
  'it does not decide the effective period, the direct-report section 4 retention exception, the anniversary-boundary question, the comparison reference date or the printed-field question',
  'it does not integrate anything into the application, deploy anything or transmit anything',
],
bound_by_digests: provenanceRows(),
created_by: lib.ORDER_ID,
};

const amendmentWritten = lib.writeJson('rule_corpus_amendment_001u.json', amendment);

const planLines = lib.readText(P.plan).split('\n');
const lineIndexOf = (predicate) => planLines.findIndex(predicate) + 1;
const gate57LineNumber = lineIndexOf((l) => l.indexOf('**Gate 5.7 / segment exit:**') === 0);
const gate57LineText = planLines[gate57LineNumber - 1];
const phase57HeaderLineNumber = lineIndexOf((l) => l.indexOf('### Phase 5.7 ') === 0);
const phase57Bullets = planLines.slice(phase57HeaderLineNumber + 1, gate57LineNumber - 2)
  .filter((l) => l.indexOf('- ') === 0)
  .map((l) => l.slice(2));

const admission = {
  artifact: 'admission_record_001u.json',
  work_order: lib.ORDER_ID,
  created_utc: lib.CREATED_UTC,
  document_type: 'ADMISSION RECORD — the formal Gate 5.7 admission of exactly one complete rule unit, for exactly one scope',
  purpose: 'record the formal admission of rule unit ' + lib.UNIT_ID + ' as a governed rule, at its immutable ID and its assigned production version, executed because all four scoped Gate 5.6 criteria pass, and record without softening every limit the admission carries',
  scope: {
    scope_id: lib.SCOPE_ID,
    jurisdiction: 'CA / CA-NS',
    rule_unit: lib.UNIT_ID,
    rule_unit_id_is_immutable: true,
    limb: 'the first limb of s. 10(3)(c) only',
    presentation: 'PR-01 at ' + ruleRecordJson.scope.presentation.sha256,
    this_admission_applies_to: 'this one scope only; it is not a corpus-wide Gate 5.7 pass and it clears no register row outside it',
  },
  the_gate_this_admission_executes: {
    gate: 'Gate 5.7, with its segment-exit clause',
    gate_line_in_the_amended_document: gate57LineNumber,
    gate_text_quoted_verbatim: gate57LineText,
    phase_5_7_heading_line: phase57HeaderLineNumber,
    phase_5_7_bullets_quoted_verbatim: phase57Bullets,
    what_the_gate_requires_before_admission: 'the first branch is the branch this order takes: at least one complete rule unit has been formally admitted, and its evaluator passes the validation suite. The second branch (a clear blocker requiring an owner/legal decision) is not relied on and is not used to avoid the first.',
  },
  the_gate_5_6_condition_measured_before_admitting: {
    requirement: 'all four scoped Gate 5.6 criteria pass',
    every_clause_met: gate56.every_clause_met,
    tally: gate56.gate_tally,
    clause_states: gate56.clause_states,
    problems_recorded: gate56.problems_recorded,
    summary_numbers: gate56.summary_numbers,
    verdict_record: gate56.successor_record,
    verdict_sha256: gate56.successor_sha256,
    predecessor_verdict_preserved: {
      record: gate56.predecessor_record,
      sha256: gate56.predecessor_sha256,
      state: gate56.predecessor_state,
    },
  },
  the_admission: {
    immutable_rule_id: lib.UNIT_ID,
    assigned_production_version: lib.PRODUCTION_VERSION,
    assigned_version_string: lib.PRODUCTION_VERSION_STRING,
    production_admission_identity: lib.PRODUCTION_ADMISSION_IDENTITY,
    pre_admission_identity_superseded: lib.PRE_ADMISSION_IDENTITY,
    admission_form_in_the_governed_rule_record: 'the record still reads RESERVED_TO_GATE_5_7 and NOT_ADMITTED, because it is not edited: this admission resolves that reservation in a separate record by reference to the record\'s digest',
    why_the_rule_record_is_not_edited: 'the governed rule record is a pinned PHASE5-001Q artifact that the scoped Gate 5.4, Gate 5.5 and Gate 5.6 verdicts validated at digest ' + ruleRecord.sha256 + '. Editing it to write the assignment into it would change the artifact every one of those verdicts rests on, so the assignment is recorded here and in ' + lib.wr('SOURCE_CAPTURES/PHASE5-001U/rule_corpus_amendment_001u.json') + ', by reference.',
    declared_by: lib.wr('SOURCE_CAPTURES/PHASE5-001U/version_conflict_resolution_record.json') + ' (the_assignment_the_resolution_leaves_to_gate_5_7)',
    assignment_in_force_from: lib.CREATED_UTC,
    assignment_is_revocable_by: 'a later owner decision recorded in its own order, a change to the source pin or the rule record, or a consumer-visible output of any class — none of which this order performs',
  },
  the_governed_rule_record_this_admission_binds: {
    path: ruleRecord.path,
    sha256: ruleRecord.sha256,
    bytes: ruleRecord.bytes,
    admission_state_at_binding: ruleRecord.admission_state.state,
    admission_form_at_binding: ruleRecord.admission_state.admission_form,
    permitted_result_ceiling_at_binding: ruleRecord.permitted_result_ceiling,
    authorised_finding_classes_at_binding: ruleRecord.authorised_finding_classes,
    pre_admission_identity_occurrences_in_the_rule_record: g.occurrences(lib.readText(P.rule_record), lib.PRE_ADMISSION_IDENTITY),
    production_identity_occurrences_in_the_rule_record: ruleRecord.production_identity_occurrences,
  },
  the_emitting_rule: {
    evaluator: m.binding_rows_at_admission.filter((r) => r.key === 'evaluator')[0].path,
    evaluator_sha256: m.binding_rows_at_admission.filter((r) => r.key === 'evaluator')[0].sha256_now,
    what_it_may_emit_after_this_admission: 'nothing',
    why: 'the ceiling is ' + ruleRecord.permitted_result_ceiling + ' and no finding class is authorised: the evaluator may compute its arithmetic outcome internally and must refuse to emit any finding class, any consumer-visible output and any consumer result',
    where_that_restriction_is_recorded: ruleRecordJson.deterministic_breach_test.outcome_is_not_a_finding,
  },
  conformance_with_the_phase_5_7_bullets: phase57Bullets.map((bullet, i) => ({
    bullet_number: i + 1,
    bullet_quoted_verbatim: bullet,
    state: {
      1: 'MET for this one scope: the amendment records only this rule, which passed the scoped Gates 5.2, 5.3, 5.4, 5.5 and 5.6, with its immutable ID, its assigned version and its full provenance in ' + lib.wr('SOURCE_CAPTURES/PHASE5-001U/rule_corpus_amendment_001u.json'),
      2: 'MET: the excluded, unresolved, gap and refusal counts are recorded separately in ' + lib.wr('SOURCE_CAPTURES/PHASE5-001U/counts_001u.json') + '; no unresolved jurisdiction or provision is represented as certified, and the one historical excluded figure is marked unattributed and uncertified',
      3: 'MET in the only way this scope allows: the coverage and finding counts are updated from admitted rule records and validated evaluator capability, so governed rules go 0 to 1, governed coverage entries go 0 to 1, permitted findings stay 0 and authorised finding classes stay 0',
      4: 'MET as the instrument reads it: the owner approves the corpus amendment and authorises no finding class. The exact set of authorised finding classes is therefore empty, and the amendment changes no statutory text and turns no probable result into a violation',
      5: 'HONOURED: because no finding class is authorised, implementation may emit nothing at all, of any class. Release remains a separate product and deployment decision, and this order performs no release',
    }[i + 1],
  })),
  the_counts_this_admission_records: {
    counts_record: lib.wr('SOURCE_CAPTURES/PHASE5-001U/counts_001u.json'),
    governed_rules_admitted_before: 0,
    governed_rules_admitted_after: 1,
    governed_coverage_entries_before: 0,
    governed_coverage_entries_after: 1,
    permitted_findings_before: 0,
    permitted_findings_after: 0,
    authorised_finding_classes: 0,
    register_rows_dispositioned_by_this_admission: 0,
    register_rows_cleared_by_this_admission: 0,
    consumer_visible_output_produced: 0,
  },
  the_finding_class_decision_the_owner_withholds: m.the_finding_authorisation.the_finding_class_decision,
  the_limitation_recorded_rather_than_filled: {
    the_limit: 'the admitted rule unit carries no authorised finding class, so it can support no consumer-visible conclusion of any class; report checking for this scope remains "not yet available"',
    recorded_as: 'a named limitation of this admission, not as a defect in it: the gate requires at least one complete rule unit to be formally admitted and its evaluator to pass the validation suite, and this order does not read the withheld finding class as either',
    what_would_lift_it: 'an owner finding-class decision issued in its own order; it is not inferred from this admission and this order does not pre-empt it',
  },
  binding_rows: m.binding_rows_at_admission.map((r) => ({
    key: r.key,
    binding_class: r.binding_class,
    path: r.path,
    present_in_this_workspace: r.present_in_this_workspace,
    sha256: r.sha256_now,
    bytes: r.bytes,
    recorded_sha256: r.sha256_recorded,
  })),
  package_digest: lib.packageDigest(lib.bindingRows()),
  the_digests_this_admission_is_bound_by: {
    binding_rows_are_recorded_above: true,
    rows_total: m.binding_rows_at_admission.length,
    rows_substantive_validation_inputs: m.binding_rows_at_admission.filter((r) => r.binding_class === 'SUBSTANTIVE_VALIDATION_INPUT').length,
    rows_governing_or_predecessor_records: m.binding_rows_at_admission.filter((r) => r.binding_class === 'GOVERNING_OR_PREDECESSOR_RECORD').length,
    rows_absent_from_this_workspace: m.binding_rows_at_admission.filter((r) => !r.present_in_this_workspace).length,
    package_digest: lib.packageDigest(lib.bindingRows()),
    package_digest_definition: 'sha256 over the sorted rows (key|path|sha256-or-recorded-sha256-or-ABSENT) of every binding row listed above: it is this admission\'s own identity of the content it binds',
    absent_rows_are_not_treated_as_matches: 'a row absent from this workspace is recorded as absent with a null digest; it is never counted as a match and it is never dropped from the row list',
    what_a_moved_row_means: 'a change to a SUBSTANTIVE_VALIDATION_INPUT row disturbs the validation basis and this admission would have to be re-measured and re-issued; a change to a GOVERNING_OR_PREDECESSOR_RECORD or to this order\'s own records is an admission-metadata change, provided no substantive input moved with it',
  },
  what_would_invalidate_this_admission: [
    'any change to a row whose binding class is SUBSTANTIVE_VALIDATION_INPUT: the validation basis would have to be re-measured and this admission re-issued',
    'any change to the governed rule record at its pinned digest, including an edit that wrote the production identity into it',
    'an owner decision that withdraws the assignment, the amendment authority or the ceiling',
    'any consumer-visible output of any class produced from this rule unit before an owner finding-class decision authorises it',
  ],
  the_verification_that_follows_this_record: {
    record: lib.wr('SOURCE_CAPTURES/PHASE5-001U/post_assignment_binding_verification_001u.json'),
    what_it_does: 're-measures every binding row, every pin and the four scoped Gate 5.6 clauses after every write this order makes',
  },
  writes_measured_by_this_check: [
    lib.wr('SOURCE_CAPTURES/PHASE5-001U/rule_corpus_amendment_001u.json'),
    lib.wr('SOURCE_CAPTURES/PHASE5-001U/counts_001u.json'),
    lib.wr('SOURCE_CAPTURES/PHASE5-001U/post_assignment_binding_verification_001u.json'),
    lib.wr('SOURCE_CAPTURES/PHASE5-001U/scoped_gate_5_7_verdict.json'),
    lib.wr('SOURCE_CAPTURES/PHASE5-001U/next_work_order.json'),
    lib.wr('SOURCE_CAPTURES/PHASE5-001U/file_custody_manifest.json'),
    lib.wr('SOURCE_CAPTURES/PHASE5-001U/preservation_and_change_record.json'),
    lib.wr('SOURCE_CAPTURES/PHASE5-001U/verification_results.json'),
    lib.wr('CRP_PHASE5_001U_VERSION_RESOLUTION_AND_SCOPED_ADMISSION.md'),
  ],
  what_this_admission_does_not_do: [
    'it does not admit a second rule unit, another jurisdiction, another limb or another presentation',
    'it does not pass Gate 5.7 corpus-wide: gate 5.7 stays corpus-wide, and this record is a scoped admission recorded under the plan\'s scoped-verdict paragraph',
    'it does not authorise a finding class, a consumer surface, an application change, a deployment or an external transmission',
    'it does not clear the register row of the source entry it admits: that row still reads UNRESOLVED / BLOCKED_MISSING_EVIDENCE',
    'it does not edit the governed rule record, any earlier verdict, manifest, baseline or register row',
    'it does not decide the effective period, the direct-report section 4 retention exception, the anniversary-boundary question, the comparison reference date or the printed-field question: each stays carried at its own recorded state',
    'it does not treat its own execution as evidence for any later gate',
  ],
  created_by: lib.ORDER_ID,
};

const admissionWritten = lib.writeJson('admission_record_001u.json', admission);

const countsRecord = {
  artifact: 'counts_001u.json',
  work_order: lib.ORDER_ID,
  created_utc: lib.CREATED_UTC,
  document_type: 'COUNTS RECORD — the corpus counts this admission records, each from its own source, with the uncertified ones named as uncertified',
  purpose: 'satisfy the Phase 5.7 requirement that excluded, unresolved, gap and refusal counts be recorded separately and that no unresolved jurisdiction or provision be represented as certified, and record the governed counts this one admission changes and the ones it does not',
  the_four_counts_the_plan_names_recorded_separately: {
    excluded: {
      count: counts.register_excluded_rows,
      source: lib.wr(P.rescreen_register) + ' (per-row disposition column)',
      what_it_counts: 'register rows whose disposition is EXCLUDED',
      certified: false,
      note: 'the register records no row as excluded; excluded source entries are recorded only in the preserved historical tally, which is not attributable to any catalogue ID',
    },
    unresolved: {
      count: counts.register_disposition_tally.UNRESOLVED,
      source: lib.wr(P.rescreen_register) + ' (per-row disposition column)',
      what_it_counts: 'register rows whose disposition is UNRESOLVED',
      certified: false,
      note: 'an unresolved row is not a candidate, not a refusal and not a certification; the admitted rule unit\'s own source row is one of these rows and stays one',
    },
    gap: {
      count: counts.register_disposition_tally.GAP,
      source: lib.wr(P.rescreen_register) + ' (per-row disposition column)',
      what_it_counts: 'register rows whose disposition is GAP',
      certified: false,
      note: 'a gap is recorded as a gap; no entry is invented to close it',
    },
    refusal: {
      count: counts.register_disposition_tally.REFUSAL,
      source: lib.wr(P.rescreen_register) + ' (per-row disposition column)',
      what_it_counts: 'register rows whose disposition is REFUSAL',
      certified: false,
      note: 'a refusal is retained as a refusal',
    },
  },
  the_register_this_record_reads: {
    path: counts.register_path,
    sha256: counts.register_sha256,
    columns: counts.register_columns,
    rows: counts.register_rows,
    disposition_tally: counts.register_disposition_tally,
    disposition_state_tally: counts.register_disposition_state_tally,
    blocker_type_tally: counts.register_blocker_type_tally,
    the_disposition_tally_sums_to_the_row_count: (counts.register_disposition_tally.UNRESOLVED || 0) + (counts.register_disposition_tally.GAP || 0) + (counts.register_disposition_tally.REFUSAL || 0) + (counts.register_disposition_tally.EXCLUDED || 0) === counts.register_rows,
  },
  the_preserved_historical_tally: m.the_preserved_historical_tally,
  no_unresolved_jurisdiction_or_provision_is_represented_as_certified: {
    rule: 'nothing in this record converts an unresolved row, an unresolved jurisdiction, an unresolved provision or an unresolved status into a certified one',
    the_unresolved_units_this_record_names: {
      jurisdictions_with_a_status_other_than_exact: counts.coverage_summary_canonical_jurisdiction_status,
      instrument_class_screen_inconclusive: counts.coverage_summary_instrument_class_screen.SCREEN_INCONCLUSIVE,
      accepted_records_available_for_implementation: counts.coverage_available_for_implementation,
    },
    the_only_certified_rule_this_order_produces: 'the one rule unit this order admits, and nothing else',
  },
  governed_counts: {
    what_counts_as_governed: 'only admitted rule records and the validated evaluator capability of those records: a coverage figure that counts accepted source records available for implementation is a planning figure and is not governed coverage',
    governed_rules_admitted: { before_this_order: 0, after_this_order: 1, source: lib.wr('SOURCE_CAPTURES/PHASE5-001U/admission_record_001u.json') },
    governed_coverage_entries: { before_this_order: 0, after_this_order: 1, what_it_covers: 'CA / CA-NS, rule unit ' + lib.UNIT_ID + ', presentation PR-01, first limb only' },
    permitted_findings: { before_this_order: 0, after_this_order: 0, why_unchanged: 'no finding class is authorised: the owner withholds the finding-class decision and the ceiling stays ' + m.the_finding_authorisation.the_ceiling_that_stands },
    authorised_finding_classes: { count: 0, list: [] },
    consumer_visible_outputs: { count: 0, why: 'the ceiling is observation-only and this order produces internal records only' },
  },
  planning_counts_that_remain_planning_counts: {
    where_they_come_from: counts.coverage_summary_path + ' at ' + counts.coverage_summary_sha256,
    accepted_entries: counts.coverage_available_for_implementation.accepted_entries,
    accepted_content_rules: counts.coverage_available_for_implementation.accepted_content_rules,
    accepted_limitation_records: counts.coverage_available_for_implementation.accepted_limitation_records,
    accepted_authority_records: counts.coverage_available_for_implementation.accepted_authority_records,
    accepted_citation_records: counts.coverage_available_for_implementation.accepted_citation_records,
    owner_acceptance_tally: counts.coverage_summary_owner_acceptance,
    limitation_or_retention_family_entries: counts.coverage_summary_limitation_or_retention_family,
    per_jurisdiction_ca_ns: counts.coverage_summary_per_jurisdiction_ca_ns,
    enumeration_coverage: counts.coverage_summary_enumeration_coverage,
    statement: 'these figures describe what is available to implement inside the accepted corpus. They are recorded unchanged, they are not certified coverage, and this order converts exactly one of them into one governed rule.',
  },
  register_rows_this_order_changes: {
    dispositioned: 0,
    cleared: 0,
    moved: 0,
    evidence_of_that: counts.the_admitted_source_entry,
    why_it_matters: 'a certified rule does not clear the register row of the source entry it was derived from: the row\'s clearing authority is an authorised evidence route for the report representation together with owner direction, and this order supplies neither',
  },
  what_this_record_does_not_do: [
    'it does not present the preserved historical tally as a certified operational count',
    'it does not present planning figures as governed coverage, and it does not present governed figures as corpus-wide totals',
    'it does not clear, move or re-state any register row',
    'it does not count the unadmitted candidates, the rejected combinations or the corpus-wide queue as admitted, dispositioned or certified',
  ],
  created_by: lib.ORDER_ID,
};

const countsWritten = lib.writeJson('counts_001u.json', countsRecord);

const post = g.measurePostAssignment();

const postAssignment = {
  artifact: 'post_assignment_binding_verification_001u.json',
  work_order: lib.ORDER_ID,
  created_utc: lib.CREATED_UTC,
  document_type: 'POST-ASSIGNMENT BINDING VERIFICATION — the admission re-measured after every write this order made',
  purpose: 'compare the written admission with the live artifacts and report whether anything it rested on moved, re-execute the authored Gate 5.6 harness from the same digests, re-measure every pin, and re-check the version-conflict record\'s closure claim against the governed rule record',
  the_admission_this_record_verifies: {
    record: lib.wr('SOURCE_CAPTURES/PHASE5-001U/admission_record_001u.json'),
    sha256: outSha('admission_record_001u.json'),
    bytes: admissionWritten.bytes,
    records_written_after_it: [lib.wr('SOURCE_CAPTURES/PHASE5-001U/counts_001u.json')],
    why_it_can_be_measured_though_it_was_written_first: 'every digest it binds is the digest of an artifact this order read rather than wrote, so the comparison is available even while this order\'s own later records are still being written',
  },
  what_this_record_does: post.what_this_record_does,
  measured_after: post.measured_after,
  rows: post.rows,
  summary: post.summary,
  package_digest_recorded_by_the_admission: post.package_digest_recorded_by_the_admission,
  package_digest_measured_now: post.package_digest_measured_now,
  package_digest_state: post.package_digest_state,
  pins: post.pins,
  the_authored_gate_5_6_harness_re_executed_after_the_assignment: post.the_authored_gate_5_6_harness_re_executed_after_the_assignment,
  the_version_conflict_records_closure_claim_re_checked: post.the_version_conflict_records_closure_claim_re_checked,
  conclusion: post.conclusion,
  what_this_record_does_not_do: post.what_this_record_does_not_do,
  created_by: lib.ORDER_ID,
};

const postAssignmentWritten = lib.writeJson('post_assignment_binding_verification_001u.json', postAssignment);

const line = (k, v) => console.log('  ' + k + ': ' + v);

console.log('=== PHASE5-001U GATE 5.7 ADMISSION — WRITTEN RECORDS ===');
console.log('');
console.log('Gate 5.6 condition, re-measured by this order:');
line('every clause met', gate56.every_clause_met);
line('tally', gate56.gate_tally);
line('successor verdict', gate56.successor_record);
line('successor digest', gate56.successor_sha256);
console.log('');
console.log('The admission:');
line('rule unit', lib.UNIT_ID + ' (immutable)');
line('assigned version', lib.PRODUCTION_VERSION_STRING);
line('production identity', lib.PRODUCTION_ADMISSION_IDENTITY);
line('governed rule record', ruleRecord.path);
line('rule record digest at binding', ruleRecord.sha256);
line('admission state at binding', ruleRecord.admission_state.state + ' / ' + ruleRecord.admission_state.admission_form);
line('ceiling that stands', ruleRecord.permitted_result_ceiling);
line('authorised finding classes', ruleRecord.authorised_finding_classes);
console.log('');
console.log('Records written by this order:');
[
  { record: 'the rule-corpus amendment', w: amendmentWritten },
  { record: 'the admission', w: admissionWritten },
  { record: 'the counts', w: countsWritten },
  { record: 'the post-assignment verification', w: postAssignmentWritten },
].forEach((x) => {
  line(x.record, x.w.artifact + '  ' + x.w.sha256 + '  ' + x.w.bytes + ' bytes');
});
console.log('');
console.log('Counts, each read from its own source:');
line('register rows', counts.register_rows);
line('disposition tally', JSON.stringify(counts.register_disposition_tally));
line('excluded (uncertified)', counts.register_excluded_rows);
line('governed rules admitted', '0 before -> 1 after');
line('governed coverage entries', '0 before -> 1 after');
line('permitted findings', '0 before -> 0 after');
line('authorised finding classes', m.the_finding_authorisation.finding_class_count);
line('register rows changed by this order', '0');
console.log('');
console.log('Pins, after every write:');
line('pins carried', post.pins.pins_carried_by_this_order);
line('matching their pin', post.pins.pins_matching_their_pin);
line('not matching', post.pins.pins_not_matching + ' (' + post.pins.pins_not_matching_keys.join(', ') + ')');
line('absent from this workspace', post.pins.pins_absent_from_this_workspace + ' (' + post.pins.pins_absent_keys.join(', ') + ')');
line('the non-matching pin is the authorised amendment', post.pins.the_plan_pin.is_the_authorised_change);
console.log('');
console.log('Binding rows, after every write:');
line('rows total', post.summary.rows_total);
line('substantive validation inputs', post.summary.rows_substantive_validation_inputs);
line('governing or predecessor records', post.summary.rows_governing_or_predecessor_records);
line('rows moved', post.summary.rows_moved);
line('package digest state', post.package_digest_state);
line('conclusion', post.conclusion);
console.log('');
console.log('What this admission withholds, recorded rather than filled:');
line('finding class decision', m.the_finding_authorisation.the_finding_class_decision);
line('emission authorised', m.the_finding_authorisation.emission_this_order_authorises);
console.log('');
console.log('Gate 5.7 verdict and next work order: NOT YET WRITTEN by this script.');

// __NEXT__

// __NEXT__
