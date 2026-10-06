'use strict';
/**
 * build_001u_next_order.cjs — PHASE5-001U: the next work order, issued and not begun.
 *
 * It writes one record and nothing else: SOURCE_CAPTURES\PHASE5-001U\next_work_order.json.
 *
 * The order it issues is the finding-class authorisation for the one unit this order admitted, together with the
 * next scoped progression read against the preserved corpus queue. It is issued because the admission it follows
 * is recorded and complete for its scope; it is not begun, and nothing in the record authorises it to begin.
 */
const lib = require('./lib_001u.cjs');

const PLAN = lib.AMENDMENT_TARGET;
const planLines = lib.readText(PLAN).split('\n').map((s) => s.replace(/\r$/, ''));
const planLine = (n) => planLines[n - 1];

const verdictSha = lib.outSha('scoped_gate_5_7_verdict.json');
const admissionSha = lib.outSha('admission_record_001u.json');
const counts = lib.readOutJson('counts_001u.json');
const verdict = lib.readOutJson('scoped_gate_5_7_verdict.json');

const record = {
  artifact: 'next_work_order.json',
  work_order: lib.ORDER_ID,
  created_utc: lib.CREATED_UTC,
  type: 'ORDER ISSUED — the next order is issued because this order\'s scoped admission is recorded. The order is not begun: no work under it is performed, prepared or pre-judged here.',
  order_issued: true,
  issued_now_because: [
    'the scoped Gate 5.7 verdict at ' + lib.wr('SOURCE_CAPTURES/PHASE5-001U/scoped_gate_5_7_verdict.json') + ' at ' + verdictSha + ' passes the first branch of the gate for one named scope, so a next order may be issued for that scope',
    'the plan\'s progression rule permits a later phase to begin for a named scope once every preceding gate holds a passing verdict for that same scope: ' + planLine(58),
    'the two bullets after the segment-exit sentence name exactly what the next order is: ' + planLine(177) + ' / ' + planLine(178),
  ],
  what_this_record_does_not_do_before_the_order_ends: 'it does not begin the order it issues, and it does not treat the order\'s own subject matter as decided',
  the_corpus_queue_it_is_issued_against: {
    preserved_by: lib.wr('SOURCE_CAPTURES/PHASE5-001P/corpus_queue_preservation.json'),
    register: counts.the_register_this_record_reads.path,
    register_sha256: counts.the_register_this_record_reads.sha256,
    register_rows: counts.the_register_this_record_reads.rows,
    dispositions: counts.the_register_this_record_reads.disposition_tally,
    open_queue_size: counts.the_register_this_record_reads.disposition_tally.UNRESOLVED,
    rows_changed_by_this_order: counts.register_rows_this_order_changes.dispositioned + counts.register_rows_this_order_changes.cleared + counts.register_rows_this_order_changes.moved,
    the_row_this_scope_concerns: counts.register_rows_this_order_changes.evidence_of_that,
    statement: 'the queue is read, not written: this order issues the next order against the queue exactly as PHASE5-001P preserved it, and it clears, moves or re-classifies no row',
  },
  the_admission_the_next_order_rests_on: {
    rule_unit: lib.UNIT_ID,
    production_admission_identity: lib.PRODUCTION_ADMISSION_IDENTITY,
    production_version_string: lib.PRODUCTION_VERSION_STRING,
    advisory_reading_only: 'the next order reads this admission as the record it follows; it may not treat this order\'s scoped verdict as a passed verdict for any other gate or scope',
    admission_record: lib.wr('SOURCE_CAPTURES/PHASE5-001U/admission_record_001u.json') + ' at ' + admissionSha,
  },
};


record.the_order_issued = {
  order_issued: true,
  begun: false,
  order_id: 'PHASE5-001V',
  order_id_note: 'the next identifier in sequence after this order; the identifier is issued here and is not reserved by any other record',
  issued_for: lib.SCOPE_ID,
  title: 'Finding-class authorisation for the one admitted rule unit, and the next scoped progression read against the preserved corpus queue',
  authority_it_rests_on: [
    lib.wr('SOURCE_CAPTURES/PHASE5-001U/scoped_gate_5_7_verdict.json') + ' at ' + verdictSha + ' — ' + verdict.verdict,
    'the owner instrument of this order, which authorised the version-resolution and the scoped admission but withheld the finding-class decision: ' + verdict.the_admission_this_verdict_records.finding_authorisation.the_finding_class_decision,
    'the plan\'s progression rule at line 58 and the two Phase 5.7 bullets at lines 177 and 178, quoted below',
  ],
  governing_text_quoted_verbatim: {
    progression_rule: { document: PLAN, line: 58, text: planLine(58) },
    owner_approval_bullet: { document: PLAN, line: 177, text: planLine(177) },
    emission_after_approval_bullet: { document: PLAN, line: 178, text: planLine(178) },
    segment_exit_sentence: { document: PLAN, line: 180, text: planLine(180) },
    read_at_runtime: true,
  },
  scope: {
    scope_id: lib.SCOPE_ID,
    jurisdiction: 'CA / CA-NS',
    rule_unit: lib.UNIT_ID,
    limb: 'the first limb of s. 10(3)(c) only',
    presentation: 'PR-01',
    presentation_or_instance: 'PR-01 (the last-payment / limitation presentation)',
    everything_outside_this_scope: 'no other rule, jurisdiction, limb, presentation or instance is within this order\'s scope, and no corpus-wide gate is progressed by it',
  },
  the_identity_it_would_assign: 'NONE — a finding-class authorisation assigns no identity and no version. ' + lib.PRODUCTION_ADMISSION_IDENTITY + ' at version ' + lib.PRODUCTION_VERSION_STRING + ' was assigned by this order and is not re-assigned, amended or withdrawn by the next one.',
  the_decision_it_must_obtain: {
    the_one_owner_decision_outstanding: 'the exact finding classes authorised for this unit, named one by one',
    what_this_order_recorded_instead: 'the decision is withheld and the limitation is recorded rather than filled, per the stop condition this order carried',
    what_the_next_order_may_not_do: 'it may not choose the finding classes on the owner\'s behalf, infer them from the crosswalk proposal, or treat a withheld decision as an authorisation',
    the_proposal_that_remains_unadopted: 'the PROD-003 crosswalk proposal of PROBABLE_VIOLATION that the governed rule record itself records as proposed and not adopted — ' + lib.wr('SOURCE_CAPTURES/PHASE5-001Q/rule_record.json') + ', read, not written, by this order',
    if_it_is_withheld_again: 'record the limitation again, keep the observation ceiling, and admit nothing further — the same stop condition, applied without weakening the verdict that preceded it',
  },
};


record.the_order_issued.deliverables_it_would_carry = [
  'the owner instrument that names the exact finding classes authorised for this one unit, quoted in full, or a recorded statement that the decision is withheld again',
  'the scoped availability statement for report checking on this scope: available only for the classes authorised, and "not yet available" for every other class and for every scope outside this one',
  'the next in-scope progression, read against the preserved corpus queue and reported with the queue totals re-measured and unchanged',
  'a scoped verdict that names what it cannot meet, including the segment-completion sentence at plan line 180, rather than passing it or omitting it',
  'a custody, preservation and verification set for everything it writes, on the same pattern as this order\'s own',
  'the next work order, issued only if the owner decision or the progression supports one',
];
record.the_order_issued.exclusions_it_would_carry = [
  'no statutory text is changed and no probable result is turned into a violation',
  'no emission of any finding class before the owner\'s approval is recorded in the record itself',
  'no consumer-visible surface, no deployment, no integration and no consumer-data transmission: release remains a separate product decision',
  'no re-run of any harness that writes into a prior evidence package, and no regeneration of an old evidence package',
  'no change to an earlier verdict, manifest, baseline, register row or pinned artifact',
  'no edit of the governed rule record: any version or assignment statement is recorded by reference at that record\'s digest',
  'no corpus-wide gate claim, and no use of this order\'s scoped verdict as a passed verdict for another gate or scope',
];
record.the_order_issued.stop_conditions_it_would_carry = [
  'if the owner withholds the finding-class decision again, record the limitation rather than filling it, keep the observation ceiling, and admit nothing further',
  'if the finding-class instrument names a class the plan or the governed rule record does not permit, stop and refer the conflict rather than resolving it in the order\'s favour',
  'if the rule record, the crosswalk or any binding input no longer stands at the digest this admission bound, stop and report the movement rather than measuring against the new value',
  'if a concrete source conflict, amendment, repeal or supersession indicator appears, hold for owner and legal direction',
  'if any criterion would be satisfied by emitting before the approval is recorded, stop: emission is the thing the approval authorises',
  'if a criterion would be satisfied by clearing, moving or re-classifying a register row without an authorised evidence route and owner direction, stop',
  'if the order cannot be completed without editing an already-issued verdict, manifest or baseline, stop and issue a successor record instead',
];
record.the_order_issued.acceptance_criteria_it_would_carry = [
  'the authorised finding classes are exactly the owner\'s, named one by one, and the observation-class ceiling is stated where none is authorised',
  'report checking for this scope is stated as available only for an authorised class, and every unauthorised class and every other scope remains "not yet available"',
  'the version reservation closed by this order stays closed: the production assignment remains a Gate 5.7 act recorded by reference, and the plan sentence at line 180 is not re-opened or re-amended to suit the new order',
  'no register row is cleared, moved or re-classified: the queue totals are re-measured and reported unchanged, and any proposed improvement is reported as work blocked rather than as progress made',
  'the scoped verdict states what it cannot meet — the segment-completion sentence and any withheld decision — instead of passing it or omitting it',
  'no earlier verdict, manifest, baseline or pinned artifact is changed or overwritten, and the preservation and custody records demonstrate that by digest rather than by assertion',
];
record.the_order_issued.what_it_may_not_do = [
  'it may not authorise a finding class the owner has not named',
  'it may not admit any rule for any other scope, jurisdiction, limb, presentation or instance',
  'it may not change statutory text or convert a probable result into a violation',
  'it may not create a consumer surface, deploy or transmit anything',
  'it may not treat this order\'s scoped verdict as evidence for a later gate, or advance the corpus-wide queue by itself',
  'it may not weaken, restate or re-issue the verdict it follows',
];
record.the_order_issued.this_record_does_not_authorise_it_to_begin = 'nothing in this record authorises the issued order to begin. It is issued so that the next step is named and bounded; it is marked not begun, and no work under it is performed, prepared or pre-judged by this order.';

record.the_order_issued_index_entries = {
  sequence: 'the order sequence this record extends: PHASE5-001P (scoped Gates 5.2/5.3) → PHASE5-001Q (Gates 5.4) → PHASE5-001S (Gate 5.5) → PHASE5-001U (version resolution and scoped Gate 5.7 admission) → the issued order below',
  issued_order_ids: ['PHASE5-001V'],
  count: 1,
  why_one: 'one order is issued because one decision is outstanding and one scope is open: a second order would either duplicate this scope or reach outside it',
};
record.the_corpus_wide_position_unchanged = {
  note: 'these are the corpus-wide states, unchanged by this order, and recorded here so the issued order cannot be read as a corpus-wide pass',
  '5.1': 'MET with recorded administrative limitations; unchanged',
  '5.2': 'NOT PASSED corpus-wide; PASSED_FOR_THIS_SCOPE only',
  '5.3': 'NOT PASSED corpus-wide; PASSED_FOR_THIS_SCOPE only',
  '5.4': 'NOT PASSED corpus-wide; PASSED_FOR_THIS_SCOPE only',
  '5.5': 'NOT PASSED corpus-wide; PASSED_FOR_THIS_SCOPE only',
  '5.6': 'NOT PASSED corpus-wide; MET IN FULL FOR THIS SCOPE on the successor re-measurement',
  '5.7': 'NOT PASSED corpus-wide; PASSED FOR THIS ONE SCOPE on the first branch of the gate sentence',
  admitted_governed_rules: counts.governed_counts.governed_rules_admitted.after_this_order,
  governed_coverage_entries: counts.governed_counts.governed_coverage_entries.after_this_order,
  permitted_findings: counts.governed_counts.permitted_findings.after_this_order,
  authorised_finding_classes: counts.governed_counts.authorised_finding_classes.count,
  open_queue: counts.the_register_this_record_reads.disposition_tally.UNRESOLVED,
  no_consumer_visible_output: 'report checking remains "not yet available"',
};
record.what_this_issuing_record_does_not_do = [
  'it does not begin the order it issues, and it performs no part of that order\'s work',
  'it does not authorise a finding class, create coverage or candidate, or admit any further rule',
  'it does not ask the owner to assign a production version, or to settle anything this order already settled',
  'it does not clear, move or re-classify a register row, and it does not convert missing work into GAP or REFUSAL',
  'it does not repair the evaluator, the rule record, the crosswalk, the tests or the explanation templates',
  'it does not repair or deny the historical preservation failure of PHASE5-001R',
  'it does not edit any pinned artifact, and it does not re-run any harness that writes into a prior evidence package',
];
record.created_by = lib.ORDER_ID;

const written = lib.writeJson('next_work_order.json', record);
console.log('=== PHASE5-001U NEXT WORK ORDER — ISSUED, NOT BEGUN ===');
console.log('  record:  ' + written.artifact + '  ' + written.sha256 + '  ' + written.bytes + ' bytes');
console.log('  order_issued: ' + record.order_issued + ' | order_id: ' + record.the_order_issued.order_id + ' | begun: ' + record.the_order_issued.begun);
console.log('  issued_for: ' + record.the_order_issued.issued_for);
console.log('  deliverables: ' + record.the_order_issued.deliverables_it_would_carry.length + ' | exclusions: ' + record.the_order_issued.exclusions_it_would_carry.length + ' | stop conditions: ' + record.the_order_issued.stop_conditions_it_would_carry.length + ' | acceptance criteria: ' + record.the_order_issued.acceptance_criteria_it_would_carry.length);
console.log('  queue against which it issues: ' + record.the_corpus_queue_it_is_issued_against.register_rows + ' rows, ' + record.the_corpus_queue_it_is_issued_against.open_queue_size + ' open, rows changed by this order: ' + record.the_corpus_queue_it_is_issued_against.rows_changed_by_this_order);



