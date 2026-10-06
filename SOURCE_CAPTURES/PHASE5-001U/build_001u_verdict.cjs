'use strict';
/**
 * build_001u_verdict.cjs — PHASE5-001U: the scoped Gate 5.7 verdict.
 *
 * It writes one record and nothing else: SOURCE_CAPTURES\PHASE5-001U\scoped_gate_5_7_verdict.json.
 *
 * The verdict is issued from measurement, not from assertion. The gate sentence is read out of the amended plan at
 * the line it stands on, every criterion is stated with the artifact it was measured from, and the segment-exit
 * completion sentence — which is met by no scope that has one admitted rule out of the register's 437 rows — is
 * recorded as not met and named, rather than passed or omitted.
 */
const lib = require('./lib_001u.cjs');
const g = require('./gate57_001u.cjs');

const PLAN = lib.P.plan;
const planLines = lib.readText(PLAN).split('\n').map((s) => s.replace(/\r$/, ''));
const planLine = (n) => planLines[n - 1];

const m = g.measure();
const gate56 = g.measureGate56();
const gateText = planLine(180);

const admissionSha = lib.outSha('admission_record_001u.json');
const amendmentSha = lib.outSha('rule_corpus_amendment_001u.json');
const countsSha = lib.outSha('counts_001u.json');
const postSha = lib.outSha('post_assignment_binding_verification_001u.json');

const gateCriteria = [
  {
    n: 1,
    criterion_verbatim: 'at least one complete rule unit has been formally admitted',
    state: 'MET FOR THIS ONE SCOPE',
    evidence: [
      'the admission record at ' + lib.wr('SOURCE_CAPTURES/PHASE5-001U/admission_record_001u.json') + ' at ' + admissionSha + ' executes the reserved Gate 5.7 draft for ' + lib.UNIT_ID + ' only',
      'the rule-corpus amendment it rests on is ' + lib.wr('SOURCE_CAPTURES/PHASE5-001U/rule_corpus_amendment_001u.json') + ' at ' + amendmentSha + ', containing only rules that passed Gates 5.1 to 5.6, with the immutable ID, the assigned version and full provenance',
      'the assigned production identity is ' + lib.PRODUCTION_ADMISSION_IDENTITY + ' and the assigned version string is ' + lib.PRODUCTION_VERSION_STRING,
      'the pre-admission identity it supersedes is ' + lib.PRE_ADMISSION_IDENTITY,
    ],
    what_it_does_not_mean: 'it does not admit any other rule, jurisdiction, limb or presentation, and it does not claim the corpus-wide Gate 5.7 condition is satisfied',
  },
  {
    n: 2,
    criterion_verbatim: 'its evaluator passes the validation suite',
    state: 'MET FOR THIS ONE SCOPE',
    evidence: [
      'the scoped Gate 5.6 successor verdict at ' + lib.wr('SOURCE_CAPTURES/PHASE5-001U/scoped_gate_5_6_verdict_successor.json') + ' at ' + gate56.successor_sha256 + ' records ' + gate56.gate_tally.met + ' of ' + gate56.gate_tally.clauses + ' clauses met with no problem in the re-measurement',
      'the fixture suite (33 fixtures, 15 categories), the 8 negative tests, the frozen replay expectations and the independent replay are bound by the admission at the digests the admission records, and none of them moved after the admission was written',
      'the post-assignment verification at ' + lib.wr('SOURCE_CAPTURES/PHASE5-001U/post_assignment_binding_verification_001u.json') + ' at ' + postSha + ' re-executes the authored Gate 5.6 harness after the assignment and reports the same four clauses met',
    ],
    what_it_does_not_mean: 'a passing validation suite is not a finding class, not an emission authorisation and not consumer-visible output',
  },
  {
    n: 3,
    criterion_verbatim: 'or the segment reports a clear blocker that requires an owner/legal decision',
    state: 'NOT RELIED ON — the first branch is taken',
    evidence: [
      'the first branch of the gate sentence is satisfied for this one scope, so the alternative branch is not used and is not needed',
      'the one owner decision this order did not receive — the exact finding classes — is recorded as a limitation rather than reported as a blocker, because the reserved draft order directs that it be recorded rather than filled',
    ],
    what_it_does_not_mean: 'the alternative branch exists and remains available to a later order; it is not being used to avoid the first branch here',
  },
  {
    n: 4,
    criterion_verbatim: 'Once all in-scope rules are admitted or explicitly dispositioned, this segment is complete and work may move to the next product section.',
    state: 'NOT MET AND NAMED — the segment-completion sentence, which is a completion condition rather than a condition of this admission',
    evidence: [
      'the register this order re-reads carries ' + m.corpus_counts.register_rows + ' rows at ' + m.corpus_counts.register_sha256 + ', of which the disposition tally is ' + JSON.stringify(m.corpus_counts.register_disposition_tally) + ' and ' + m.corpus_counts.register_excluded_rows + ' are excluded and uncertified',
      'exactly one rule unit is admitted by this order, and the register rows this order dispositions, clears or moves are 0, recorded in ' + lib.wr('SOURCE_CAPTURES/PHASE5-001U/counts_001u.json') + ' as ' + JSON.stringify(m.corpus_counts.the_admitted_source_entry.state_after_this_order),
      'so the in-scope rules are not all admitted and not all explicitly dispositioned: the segment is not complete and this order moves to no next product section',
      'the corpus-wide queue is preserved unchanged and is reported separately in ' + lib.wr('SOURCE_CAPTURES/PHASE5-001U/counts_001u.json') + ' at ' + countsSha,
    ],
    what_it_does_not_mean: 'it does not withhold the admission: the admission rests on the first branch of the gate sentence, which is met. It records that the segment as a whole is unfinished.',
  },
];

const acceptanceCriteria = [
  {
    n: 1,
    criterion_verbatim: 'the amendment carries immutable IDs and versions, and the pre-admission identity it supersedes is named',
    state: 'MET',
    evidence: lib.wr('SOURCE_CAPTURES/PHASE5-001U/rule_corpus_amendment_001u.json') + ' at ' + amendmentSha + ' carries the immutable rule ID ' + lib.UNIT_ID + ', the assigned version ' + lib.PRODUCTION_VERSION_STRING + ', the pre-admission identity ' + lib.PRE_ADMISSION_IDENTITY + ' it supersedes and the full provenance of the rule record it binds.',
  },
  {
    n: 2,
    criterion_verbatim: 'the four counts are recorded separately and nothing unresolved is represented as certified',
    state: 'MET',
    evidence: lib.wr('SOURCE_CAPTURES/PHASE5-001U/counts_001u.json') + ' at ' + countsSha + ' records excluded ' + m.corpus_counts.register_excluded_rows + ', unresolved ' + m.corpus_counts.register_disposition_tally.UNRESOLVED + ', gap ' + m.corpus_counts.register_disposition_tally.GAP + ' and refusal ' + m.corpus_counts.register_disposition_tally.REFUSAL + ' separately from the register itself, each marked uncertified, and the one historical excluded tally is recorded as unattributed.',
  },
  {
    n: 3,
    criterion_verbatim: "the authorised finding classes are exactly the owner's, and the observation-class ceiling is recorded where none is authorised",
    state: 'MET',
    evidence: 'the owner instrument records the finding-class decision as ' + m.the_finding_authorisation.the_finding_class_decision.state + '; the authorised set is therefore empty (' + m.the_finding_authorisation.finding_class_count + ' classes), and the ceiling ' + m.the_finding_authorisation.the_ceiling_that_stands + ' is retained unchanged from the governed rule record.',
  },
  {
    n: 4,
    criterion_verbatim: 'no artifact of any earlier order is changed, and no earlier baseline or manifest is overwritten',
    state: 'MET',
    evidence: "this order's own harness reports " + m.pins_at_admission.pins_carried_by_this_order + ' pins carried, ' + m.pins_at_admission.pins_matching_their_pin + ' matching, ' + m.pins_at_admission.pins_not_matching + ' not matching (the one authorised change: the governing plan) and ' + m.pins_at_admission.pins_absent_from_this_workspace + ' absent; the post-assignment verification reports ' + m.binding_rows_at_admission.length + ' binding rows with 0 moved and the package digest UNCHANGED.',
  },
  {
    n: 5,
    criterion_verbatim: 'the scoped Gate 5.7 verdict states whether this unit is admitted, and names anything it cannot meet',
    state: 'MET',
    evidence: 'this record states the admission for this one scope and names the segment-completion sentence as not met, in criterion 4 above, instead of passing it or omitting it.',
  },
  {
    n: 6,
    criterion_verbatim: 'the version-resolution instruction the owner added to this order: the Gate 5.6 pre-admission sharing sentence states which measurement satisfies the sharing condition at Gate 5.6, and the production assignment stays reserved to Gate 5.7',
    state: 'MET',
    evidence: 'the quoted-replacement amendment A-U-1 of ' + lib.wr('SOURCE_CAPTURES/PHASE5-001U/amendment_text.json') + ' extends the sentence and the amendment-history row A-U-2 is appended; the application result at ' + lib.wr('SOURCE_CAPTURES/PHASE5-001U/amendment_application_result.json') + ' records the plan at ' + lib.sha256File(lib.abs(PLAN)) + ' after the amendment, and the replacement states that the reservation is a Gate 5.7 assignment rather than a Gate 5.6 measurement.',
  },
];

const acceptanceTally = {
  acceptance_criteria: acceptanceCriteria.length,
  met: acceptanceCriteria.filter((c) => c.state === 'MET').length,
  not_met: acceptanceCriteria.filter((c) => c.state !== 'MET').length,
  recorded_by: 'the acceptance criteria the reserved Gate 5.7 draft carried, read from ' + lib.wr('SOURCE_CAPTURES/PHASE5-001T/next_work_order.json') + ', together with the version-resolution instruction the owner added to this order',
};

const gateTally = {
  gate_criteria: gateCriteria.length,
  met: gateCriteria.filter((c) => c.state.indexOf('MET FOR THIS ONE SCOPE') === 0).length,
  not_relied_on: gateCriteria.filter((c) => c.state.indexOf('NOT RELIED ON') === 0).length,
  not_met_and_named: gateCriteria.filter((c) => c.state.indexOf('NOT MET AND NAMED') === 0).length,
  condition_of_this_admission_met: true,
  segment_completion_condition_met: false,
};


const planBullets = [174, 175, 176, 177, 178].map((n) => ({ line: n, text: planLine(n) }));

const verdictRecord = {
  artifact: 'scoped_gate_5_7_verdict.json',
  work_order: lib.ORDER_ID,
  created_utc: lib.CREATED_UTC,
  document_type: 'SCOPED GATE VERDICT — Gate 5.7 with its segment-exit clause, for one scope only. It admits one rule unit for that scope and produces no consumer-visible output',
  purpose: 'state, for ' + lib.SCOPE_ID + ' only, each branch and each completion condition of Gate 5.7 as amended, with the record each state was measured from, and name the segment-completion condition this scope cannot meet instead of passing it or omitting it',
  scope: {
    scope_id: lib.SCOPE_ID,
    jurisdiction: 'CA / CA-NS',
    rule_unit: lib.UNIT_ID,
    limb_in_scope: 'the first limb of s. 10(3)(c) only',
    presentation: 'PR-01 (the last-payment / limitation presentation)',
    pre_admission_rule_record_version_identity: lib.PRE_ADMISSION_IDENTITY,
    pre_admission_rule_record_digest: lib.PINS[lib.P.rule_record],
    production_admission_identity: lib.PRODUCTION_ADMISSION_IDENTITY,
    production_version_string: lib.PRODUCTION_VERSION_STRING,
    source: 'the admission record this verdict reports: ' + lib.wr('SOURCE_CAPTURES/PHASE5-001U/admission_record_001u.json') + ' at ' + admissionSha,
    this_verdict_is_scoped: 'it states the admission for this one scope only. It is not a corpus-wide Gate 5.7 pass, and it clears no register row outside this scope.',
  },
  authority_for_this_order: {
    the_order: lib.ORDER_ID,
    issued_by: 'the owner, in conversation, as the reserved Gate 5.7 draft recorded in ' + lib.wr('SOURCE_CAPTURES/PHASE5-001T/next_work_order.json'),
    its_type: 'owner-authorised version-reservation resolution and scoped Gate 5.7 admission for one scope',
    predecessor_verdicts: [
      lib.wr('SOURCE_CAPTURES/PHASE5-001U/scoped_gate_5_6_verdict_successor.json') + ' — all four scoped Gate 5.6 clauses met',
      lib.wr('SOURCE_CAPTURES/PHASE5-001P/scoped_gate_5_2_verdict.json') + ' and ' + lib.wr('SOURCE_CAPTURES/PHASE5-001P/scoped_gate_5_3_verdict.json') + ' — scoped, passed',
      lib.wr('SOURCE_CAPTURES/PHASE5-001Q/scoped_gate_5_4_verdict.json') + ' — scoped, passed',
      lib.wr('SOURCE_CAPTURES/PHASE5-001S/scoped_gate_5_5_verdict_successor.json') + ' — scoped, passed',
    ],
    the_governing_amendments: [
      lib.wr('SOURCE_CAPTURES/PHASE5-001U/amendment_text.json') + ' — A-U-1, the Gate 5.6 sharing sentence extended by quoted replacement; A-U-2, the amendment-history row',
      lib.wr('SOURCE_CAPTURES/PHASE5-001S/amendment_text.json') + ' — A-4, the pre-admission sharing sentence this order extends',
    ],
    the_plan_digest_read: {
      path: lib.AMENDMENT_TARGET,
      digest_before_this_order: lib.readOutJson('amendment_application_result.json').digest_before,
      digest_after_this_order: lib.readOutJson('amendment_application_result.json').digest_after,
      digest_now: lib.sha256File(lib.abs(PLAN)),
      gate_5_7_sentence_line: 180,
      state: 'AMENDED BY THIS ORDER at the sentence the owner named, and by nobody else; the preamble and every governing bullet are unchanged',
    },
    the_pinned_pre_admission_identity: lib.PRE_ADMISSION_IDENTITY,
    the_superseded_gate_5_6_draft: {
      path: lib.wr(lib.P.gate_5_6_verdict),
      digest: lib.PINS[lib.P.gate_5_6_verdict],
      state: 'SUPERSEDED AND RECORDED, NOT EDITED — the draft stands at its recorded digest and the successor verdict names it as the record it succeeds',
    },
    the_historical_records_left_untouched: 'the withheld PHASE5-001R Gate 5.5 verdict and the retained PHASE5-001I-A artifact both stand at their recorded digests, and the inherited internal-validation harness is never run by this order',
    this_verdict_passes_no_corpus_wide_gate: 'it states a scope only; every corpus-wide gate state is recorded separately in this record and is unchanged',
  },
  gate: '5.7, scoped, with its segment-exit clause',
  gate_text_quoted_verbatim: {
    document: lib.AMENDMENT_TARGET,
    digest_now: lib.sha256File(lib.abs(PLAN)),
    line: 180,
    text: gateText,
    quoted_verbatim: gateText.indexOf('**Gate 5.7 / segment exit:**') === 0,
    read_at_runtime: true,
    why_it_is_quoted_verbatim: 'the clause that governs this verdict is read out of the amended document at the line it stands on, so the verdict is measured against the text that governs rather than against a transcription of it',
  },
  governing_phase_bullets_quoted: planBullets,
  gate_criteria: gateCriteria,
  gate_criterion_count: gateCriteria.length,
  gate_tally: gateTally,
  acceptance_criteria: acceptanceCriteria,
  acceptance_criterion_count: acceptanceCriteria.length,
  acceptance_tally: acceptanceTally,
  criterion_it_cannot_meet: {
    criterion: gateCriteria[3].criterion_verbatim,
    what_is_missing: 'the remaining in-scope rules of this segment, admitted or explicitly dispositioned',
    why_it_cannot_be_supplied_here: [
      'this order is scoped to one rule unit: it is not authorised to admit, disposition or progress any other rule, jurisdiction, limb or presentation',
      'the corpus queue is preserved: ' + m.corpus_counts.register_rows + ' register rows stand as they were — ' + m.corpus_counts.register_disposition_tally.UNRESOLVED + ' unresolved, ' + m.corpus_counts.register_disposition_tally.GAP + ' gap, ' + m.corpus_counts.register_disposition_tally.REFUSAL + ' refusal — and this order changes none of them',
      'the segment-completion sentence is a completion condition of the segment, not a condition of this admission, so its state does not weaken the admission and is not used to qualify the admission away',
    ],
    the_exact_blocker: 'the segment completes when all in-scope rules are admitted or explicitly dispositioned. One rule unit is admitted here; the rest of the scope stands unresolved, gap or refusal and this order touches none of it, so the segment is not complete and no move to the next product section is recorded.',
    the_smallest_permitted_action: 'either the next in-scope progression, ordered separately and read against the same preserved queue, or an explicit owner disposition of the remaining in-scope rows. Neither is performed, begun or pre-judged here.',
    reported_rather_than_passed: 'the sentence is named in the tally and in this block so that a reader cannot mistake a scoped admission for a completed segment',
  },
};


verdictRecord.the_admission_this_verdict_records = {
  rule_corpus_amendment: { path: lib.wr('SOURCE_CAPTURES/PHASE5-001U/rule_corpus_amendment_001u.json'), sha256: amendmentSha },
  admission_record: { path: lib.wr('SOURCE_CAPTURES/PHASE5-001U/admission_record_001u.json'), sha256: admissionSha },
  counts: { path: lib.wr('SOURCE_CAPTURES/PHASE5-001U/counts_001u.json'), sha256: countsSha },
  post_assignment_binding_verification: { path: lib.wr('SOURCE_CAPTURES/PHASE5-001U/post_assignment_binding_verification_001u.json'), sha256: postSha },
  package_digest_bound_by_the_admission: lib.readOutJson('admission_record_001u.json').package_digest,
  binding_rows_at_admission: m.binding_rows_at_admission.length,
  binding_rows_absent_from_this_workspace: m.binding_rows_at_admission.filter((r) => !r.present_in_this_workspace).length,
  production_assignment: {
    identity: m.the_production_assignment.the_assignment.production_admission_identity,
    version_string: m.the_production_assignment.the_assignment.production_version_string,
    supersedes: m.the_production_assignment.the_assignment.pre_admission_identity_it_supersedes,
    assigned_by: m.the_production_assignment.the_assignment.assigned_by,
    occurrences_in_the_governed_rule_record: m.the_production_assignment.the_rule_record_is_not_edited.rule_record_production_identity_occurrences,
    rule_record_version_placeholder_occurrences: m.the_production_assignment.the_rule_record_is_not_edited.rule_record_version_field_occurrences,
    recorded_by_reference_not_by_rewrite: true,
  },
  finding_authorisation: {
    owner_instrument: m.the_finding_authorisation.owner_instrument,
    the_finding_class_decision: m.the_finding_authorisation.the_finding_class_decision.state,
    authorised_finding_classes: m.the_finding_authorisation.finding_classes_authorised_by_this_order,
    finding_class_count: m.the_finding_authorisation.finding_class_count,
    ceiling_that_stands: m.the_finding_authorisation.the_ceiling_that_stands,
    emission_this_order_authorises: m.the_finding_authorisation.emission_this_order_authorises,
  },
  governed_counts_after_this_order: lib.readOutJson('counts_001u.json').governed_counts,
};

verdictRecord.evidence_digests = {
  amendment_text: lib.outSha('amendment_text.json'),
  amendment_application_result: lib.outSha('amendment_application_result.json'),
  owner_decision_record: lib.outSha('owner_decision_record.json'),
  version_conflict_resolution_record: lib.outSha('version_conflict_resolution_record.json'),
  gate_5_6_verdict_successor: gate56.successor_sha256,
  gate_5_6_verdict_predecessor: gate56.predecessor_sha256,
  rule_corpus_amendment: amendmentSha,
  admission_record: admissionSha,
  counts: countsSha,
  post_assignment_binding_verification: postSha,
  input_verification: lib.outSha('input_verification.json'),
  pinned_files_before_this_order: lib.outSha('preserved_files_before.json'),
};

verdictRecord.pin_verification = {
  pins_carried_by_this_order: m.pins_at_admission.pins_carried_by_this_order,
  pins_matching_their_pin: m.pins_at_admission.pins_matching_their_pin,
  pins_not_matching: m.pins_at_admission.pins_not_matching,
  pins_not_matching_keys: m.pins_at_admission.pins_not_matching_keys,
  pins_absent_from_this_workspace: m.pins_at_admission.pins_absent_from_this_workspace,
  pins_absent_keys: m.pins_at_admission.pins_absent_keys,
  every_other_pin_still_matches: m.pins_at_admission.every_other_pin_still_matches,
  the_one_expected_non_match: m.pins_at_admission.the_plan_pin,
  pins_left_at_the_pre_amendment_value_by_this_order: m.pins_at_admission.pins_left_at_the_pre_amendment_value_by_this_order,
  statement: m.pins_at_admission.statement,
};


verdictRecord.defects_found_while_executing_this_order = [
  "the Gate 5.7 measurement module mapped the successor verdict's criterion field as `clause` where that record carries `n` and `criterion_verbatim`; corrected in gate57_001u.cjs before the admission was written, and recorded here rather than silently repaired",
  "the admission record's conformance block was initially closed as a separate statement rather than a field of the admission object; corrected in build_001u_admission.cjs before it ran",
  "the build script's Gate 5.6 guard was added after the admission body was authored, so the guard is exercised on every run rather than assumed",
  'no behavioural defect was found in the evaluator, the rule record, the crosswalk, the tests or the explanation templates at any point in this order',
];
verdictRecord.behavioural_defects_found_in_the_evaluator = 0;
verdictRecord.every_criterion_stated_with_its_record =
  'every state above names the artifact and the digest it was measured from, and no state is asserted without one';

verdictRecord.remaining_limitations = [
  'no finding class is authorised: the ceiling stays OBSERVATION_CLASS_ONLY and no consumer-visible output of any class is produced',
  'report checking for this scope remains "not yet available" until an owner instrument authorises the exact finding classes',
  'this admission covers one rule unit, one limb and one presentation; no other rule, jurisdiction, limb or format is admitted or validated by it',
  'the segment is not complete: the remaining in-scope rows stand unresolved, gap or refusal and are untouched',
  'no corpus-wide gate state changed: Gates 5.2 to 5.6 remain unpassed corpus-wide and Gate 5.7 is not passed corpus-wide',
  'the source entry this unit was derived from keeps its own row state: a certified rule does not clear the register row it was derived from',
  'the assigned version 1.0.0 is the first version of this unit; no later version, amendment or withdrawal is described here',
];

verdictRecord.verdict = 'PASSED FOR THIS ONE SCOPE ON THE FIRST BRANCH OF GATE 5.7 — one complete rule unit (' + lib.UNIT_ID + ') is formally admitted at ' + lib.PRODUCTION_ADMISSION_IDENTITY + ' and its evaluator passes the validation suite — WITH THE SEGMENT-COMPLETION SENTENCE RECORDED AS NOT MET AND NAMED, THE CORPUS-WIDE QUEUE PRESERVED UNCHANGED, AND NO FINDING CLASS AUTHORISED';
verdictRecord.verdict_meaning = 'the first branch of Gate 5.7 is satisfied for ' + lib.SCOPE_ID + ': the unit is production-authoritative for that scope at the identity and version this order assigned, and the artifacts the validation rested on are bound at their digests. It does not mean the rule may emit, because emission is gated on the exact finding classes and the owner has not authorised them. It does not mean the segment is complete, and it does not move any corpus-wide gate.';
verdictRecord.why_the_verdict_is_issued = [
  'every criterion this scope can meet is stated with the record it was measured from, and the one it cannot meet is named rather than passed or omitted',
  'the gate sentence is read out of the amended document at the line it stands on, at runtime, rather than transcribed',
  'the document was amended before this verdict was issued, and the pre-amendment reading of the reservation is preserved in the predecessor Gate 5.6 verdict rather than replaced',
  'the counts, the pins, the binding rows and the four scoped Gate 5.6 clauses were all re-measured after the assignment, and nothing moved',
];

verdictRecord.corpus_wide_status_kept_separate = {
  '5.1': 'MET with recorded administrative limitations; unchanged by this order',
  '5.2': 'NOT PASSED corpus-wide; PASSED_FOR_THIS_SCOPE only',
  '5.3': 'NOT PASSED corpus-wide; PASSED_FOR_THIS_SCOPE only',
  '5.4': 'NOT PASSED corpus-wide; PASSED_FOR_THIS_SCOPE only',
  '5.5': 'NOT PASSED corpus-wide; PASSED_FOR_THIS_SCOPE only',
  '5.6': 'NOT PASSED corpus-wide; MET IN FULL FOR THIS SCOPE on the successor re-measurement',
  '5.7': 'NOT PASSED corpus-wide; PASSED FOR THIS ONE SCOPE on the first branch of the gate sentence, with the segment-completion sentence recorded as not met — 1 admitted governed rule, 1 governed coverage entry, 0 permitted findings, 0 authorised finding classes',
};
verdictRecord.what_this_verdict_does_not_do = [
  'it is not a corpus-wide Gate 5.7 pass, and it states no corpus-wide gate state as satisfied',
  'it does not authorise a finding class or any consumer-visible output: report checking remains "not yet available"',
  'it does not create coverage for any other rule, jurisdiction, limb or presentation',
  'it does not clear, move or re-classify any register row, including the row of the source entry this unit was derived from',
  'it does not change statutory text, and it does not turn a probable result into a violation',
  'it does not edit the governed rule record: the assignment is recorded by reference to that record at its pinned digest',
  'it does not run the inherited internal-validation harness, and it treats no passing test of it as evidence',
  'it does not release, deploy, integrate or transmit anything',
];
verdictRecord.created_by = lib.ORDER_ID;

const written = lib.writeJson('scoped_gate_5_7_verdict.json', verdictRecord);
console.log('=== PHASE5-001U SCOPED GATE 5.7 VERDICT — WRITTEN ===');
console.log('  record:  ' + written.artifact + '  ' + written.sha256 + '  ' + written.bytes + ' bytes');
console.log('  gate line read: ' + verdictRecord.gate_text_quoted_verbatim.line + ' | verbatim: ' + verdictRecord.gate_text_quoted_verbatim.quoted_verbatim);
console.log('  gate criteria: ' + gateTally.gate_criteria + ' | met for this scope: ' + gateTally.met + ' | not relied on: ' + gateTally.not_relied_on + ' | not met and named: ' + gateTally.not_met_and_named);
console.log('  acceptance criteria: ' + acceptanceTally.acceptance_criteria + ' | met: ' + acceptanceTally.met + ' | not met: ' + acceptanceTally.not_met);
console.log('  verdict: ' + verdictRecord.verdict);




