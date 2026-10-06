'use strict';
/**
 * build_001u_successor_verdict.cjs — PHASE5-001U: write scoped_gate_5_6_verdict_successor.json.
 *
 * It writes one artifact and nothing else. The four clauses are taken from gate56_001u.cjs, which re-measures them
 * from the live artifacts; this script adds the authority the successor verdict is issued under, the scope it is
 * scoped to, the predecessor it preserves, and the verdict sentence. It passes no gate by itself: the verdict is a
 * reading of the measurement, and the Gate 5.7 admission follows only from every_clause_met.
 *
 * It authorises no finding class and produces no consumer-visible output.
 */
const lib = require('./lib_001u.cjs');
const gate56 = require('./gate56_001u.cjs');

const P = lib.PATHS;
const sha = (rel) => lib.sha256File(lib.abs(rel));

const measured = gate56.measure();
const amendmentText = lib.readOutJson('amendment_text.json');
const amendmentResult = lib.readOutJson('amendment_application_result.json');
const amendment = amendmentText.amendments[0];
const ownerDecisionDigest = lib.outSha('owner_decision_record.json');

const planLines = lib.readText(P.plan).split('\n');
const gateLineIndex = planLines.findIndex((l) => l.indexOf('**Gate 5.6:**') === 0);
const gateLineNumber = gateLineIndex + 1;
const gateLineText = planLines[gateLineIndex];

const crosswalk = lib.readJson(P.crosswalk).selected;
const ruleRecord = lib.readJson(P.rule_record);
const pred = measured.predecessor_verdict;
const passed = measured.every_clause_met === true;

const successor = {
  artifact: 'scoped_gate_5_6_verdict_successor.json',
  work_order: lib.ORDER_ID,
  created_utc: lib.CREATED_UTC,
  document_type: 'SCOPED GATE VERDICT — SUCCESSOR to the PHASE5-001T scoped Gate 5.6 verdict, issued under the version-reservation resolution this order carries',
  purpose: 're-measure the four scoped Gate 5.6 clauses from the live artifacts against the governing Gate 5.6 sentence as this order amends it, record the result clause by clause, and state whether the reserved Gate 5.7 admission of this one rule unit may proceed',
  gate: 'Gate 5.6, scoped to one rule unit, one finding class and one presentation',
  gate_line_in_the_amended_document: gateLineNumber,
  gate_text_quoted_verbatim: gateLineText,
  governing_text_quoted: [
    {
      document: lib.AMENDMENT_TARGET,
      clause: 'section 3, Gate 5.6 — as this order\'s amendment leaves it',
      line: gateLineNumber,
      text: gateLineText,
    },
    {
      document: lib.AMENDMENT_TARGET,
      clause: 'section 3, Gate 5.6 — the quoted replacement text this order applied (amendment A-U-1, quoted from amendment_text.json)',
      text: amendment.replacement_text,
      digest_of_the_document_after_the_amendment: amendmentText.digest_after,
    },
    {
      document: lib.AMENDMENT_TARGET,
      clause: 'section 8, Amendment History — the row this order appended',
      text: amendment.appended_row,
    },
  ],
  authority_for_this_scoped_verdict: {
    the_owner_instrument_this_order_carries: 'SOURCE_CAPTURES\\PHASE5-001U\\owner_decision_record.json at ' + ownerDecisionDigest,
    the_two_decisions_read_from_it: [
      'OWNER-DECISION-1 — the version-sharing reading: the sharing condition for a scope whose record Gate 5.7 has not admitted is the shared, verified, immutable pre-admission version identity of the artifacts the scope reads and writes, each at an immutable digest; the production identity and version remain a Gate 5.7 assignment',
      'OWNER-DECISION-2 — the scope admission, conditional on all four scoped Gate 5.6 criteria passing, with the finding class still withheld and the observation ceiling recorded rather than filled',
    ],
    the_amendment: 'SOURCE_CAPTURES\\PHASE5-001U\\amendment_text.json at ' + lib.outSha('amendment_text.json') +
      ' and SOURCE_CAPTURES\\PHASE5-001U\\amendment_application_result.json at ' + lib.outSha('amendment_application_result.json') +
      ': one quoted replacement, one amendment-history row, extension-only, requirement removed = ' + amendment.requirement_removed +
      ', invertible back to ' + amendmentText.inversion_check.pre_amendment_digest,
    the_version_conflict_resolution: 'SOURCE_CAPTURES\\PHASE5-001U\\version_conflict_resolution_record.json at ' + lib.outSha('version_conflict_resolution_record.json'),
    the_plan_at_the_digest_this_verdict_measures_against: {
      path: lib.AMENDMENT_TARGET,
      sha256: sha(lib.AMENDMENT_TARGET),
      digest_before_this_order: amendmentText.digest_before,
      bytes: lib.bytes(lib.AMENDMENT_TARGET),
      digest_matches_the_applied_amendment: sha(lib.AMENDMENT_TARGET) === amendmentResult.digest_after,
    },
    what_this_authority_does_not_do: 'it authorises no finding class, no coverage, no candidate, no consumer-visible output, no application change, no deployment and no external transmission; and it does not pass this gate by itself, which is why each clause below is measured from the artifacts rather than read from the instrument',
  },
  scope: {
    scope_id: lib.SCOPE_ID,
    rule_unit: crosswalk.rule_unit,
    limb_in_scope: 'LIMB_1_LAST_PAYMENT_SIX_YEAR_LIMITATION — the last-payment limb only: six years from the last payment made on the debt',
    limb_out_of_scope: 'the second limb (no payment made on the debt) stays out of scope: the presentation prints no field the admitted text reads as that date',
    jurisdiction: crosswalk.jurisdiction.country_code + '/' + crosswalk.jurisdiction.region_code + ' (' + crosswalk.jurisdiction.display_name + '; exact: the consumer selection is authoritative and is never inferred)',
    presentation: crosswalk.presentation + ' — ' + crosswalk.bureau + '; the one presentation this scope is measured against',
    source_entry_id: crosswalk.source_entry_id,
    crosswalk_entry: crosswalk.combination_id,
    pre_admission_rule_record_version_identity: lib.PRE_ADMISSION_IDENTITY,
    pre_admission_rule_record_digest: sha(P.rule_record),
    production_admission_identity_at_the_time_of_this_verdict: ruleRecord.rule_identity.rule_version,
    what_this_verdict_measures: 'the artifacts of this one scope only: the governed rule record, the source crosswalk entry, the tests and the explanation templates it reads and writes',
  },
  supersedes_and_preserves: {
    the_previous_verdict: pred.path,
    its_digest: pred.sha256,
    clauses_it_recorded_met: pred.clauses_it_recorded_met,
    criterion_it_recorded_as_not_met: pred.criterion_it_recorded_as_not_met,
    its_state: 'PRESERVED UNCHANGED — this order does not edit it, reopen it or supersede it in place; it stands at its own digest, and this successor is a separate artifact',
    what_this_successor_adds: 'the authority that was missing, not new evidence: the same four clauses, re-measured from the same artifacts against the governing Gate 5.6 sentence as this order amends it',
  },
  this_is: measured.this_is,
  why_a_successor_exists: measured.why_a_successor_exists,
  gate_criteria: measured.gate_criteria,
  gate_tally: measured.gate_tally,
  every_clause_met: measured.every_clause_met,
  criterion_it_cannot_meet: measured.criterion_it_cannot_meet,
  problems_found_in_this_re_measurement: measured.problems_found_in_this_re_measurement,
  the_scope_measured: measured.the_scope_measured,
  summary_numbers: measured.summary_numbers,
  what_this_verdict_does_not_do: measured.what_this_verdict_does_not_do.concat([
    'it does not assign a production identity or a production version: it records the reservation, and the assignment is Gate 5.7\'s act, recorded separately in admission_record_001u.json',
    'it does not exercise or claim the emission path on an admitted rule record: it measures the validation artifacts of a rule that has not yet been admitted',
    'it does not clear the register disposition of the source entry, and it does not decide the effective period, the exception, the boundary question, the reference date or the printed-field question',
    'it does not carry the scope past Gate 5.7 or past any later gate',
  ]),
  what_this_verdict_still_does_not_establish: [
    'that the evaluator may emit: emission remains gated on Gate 5.7 admission, and even after it, on the finding-class decision, which this order does not make',
    'that any rule other than ' + crosswalk.rule_unit + ' shares versions, or that any other jurisdiction, limb or presentation is validated',
    'that the corpus-wide counts changed: the register and the coverage records are measured in this order and are reported unchanged',
  ],
  gate_5_7_admission_may_proceed: passed,
  verdict: passed
    ? 'PASSED FOR THIS ONE SCOPE — all four scoped Gate 5.6 clauses are met on this re-measurement, with no problem recorded in the re-measurement, so the reserved Gate 5.7 admission of ' + crosswalk.rule_unit + ' may proceed for this one scope only'
    : 'NOT PASSED FOR THIS ONE SCOPE — at least one scoped Gate 5.6 clause is not met, or a problem was recorded in the re-measurement, so the reserved Gate 5.7 admission is not executed',
  created_by: lib.ORDER_ID,
};

const written = lib.writeJson('scoped_gate_5_6_verdict_successor.json', successor);

console.log(JSON.stringify({
  artifact: written.artifact, bytes: written.bytes, sha256: written.sha256,
  gate_line_in_the_amended_document: gateLineNumber,
  gate_tally: successor.gate_tally,
  every_clause_met: successor.every_clause_met,
  problems_found_in_this_re_measurement: successor.problems_found_in_this_re_measurement.length,
  gate_5_7_admission_may_proceed: successor.gate_5_7_admission_may_proceed,
  verdict: successor.verdict,
}, null, 1));

