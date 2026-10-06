// build_001q_next_order.js — PHASE5-001Q: issues the next bounded work order (Gate 5.5, this scope only).
//
// The order is ISSUED, not begun: this script writes the order record and executes none of it. Every gate
// sentence and phase bullet it cites is captured from the build plan by line, and the order is refused if
// the scoped Gate 5.4 verdict is not in the state that permits a later phase to begin for this scope.

const fs = require('fs');
const path = require('path');

const ROOT = 'C:\\CRP-NEW';
const OUT = path.join(ROOT, 'SOURCE_CAPTURES', 'PHASE5-001Q');
const readText = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const readJson = (rel) => JSON.parse(readText(rel));
const split = (t) => String(t).split(/\r?\n/);

const planLines = split(readText('CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md'));
const record = readJson('SOURCE_CAPTURES\\PHASE5-001Q\\rule_record.json');
const verdict54 = readJson('SOURCE_CAPTURES\\PHASE5-001Q\\scoped_gate_5_4_verdict.json');
const validation = readJson('SOURCE_CAPTURES\\PHASE5-001Q\\transcription_mapping_validation.json');
const register = readJson('SOURCE_CAPTURES\\PROD-003\\report_representation_register.json');
const fact02 = register.field_records.find((f) => f.field_id === 'FACT-02');
const fact03 = register.field_records.find((f) => f.field_id === 'FACT-03');

const PHASE_55_BULLETS = [132, 133, 134, 135, 136];
const GATE_55_LINE = 138;
const PHASE_56_TEST_BULLET = 142;
const GATE_56_LINE = 147;
const PHASE_57_LINE = 151;

if (verdict54.verdict !== 'PASSED_FOR_THIS_SCOPE') { throw new Error('Gate 5.4 does not carry a passing verdict for this scope, so a later phase may not be ordered for it'); }
if (validation.failure_count !== 0) { throw new Error('the validation record records failures; the order may not issue on a failed validation'); }
const quote = (n) => ({ document: 'CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md', section: 'section 3', line: n, text: planLines[n - 1] });

const deliverables = [
  '1. The report fact model for this unit, defined from the certified rule unit: each fact records its raw value/text, its normalized value, its source location, its extraction status, its event semantics and its transformation provenance. The two evidenced facts are register ' + fact02.field_id + ' (' + fact02.field + ', page 16 and the continued record on page 17, ' + fact02.raw_value_observed + ') and register ' + fact03.field_id + ' (' + fact03.field + ', the printed Request Date, ' + fact03.raw_value_observed + ', the evaluation reference date). The model must keep the rule-read fact and the convention input distinct, exactly as SOURCE_CAPTURES\\PHASE5-001Q\\rule_record.json records them.',
  '2. The exact extraction-status vocabulary and its reachable paths: PRESENT, ABSENT_FROM_REPORT (reachable only after the Collections section is located and resolved and prints no contract debt record), CONTRADICTED, and EXTRACTION_UNRESOLVED, with the recorded non-conflations carried over (EXTRACTION_UNRESOLVED is never ABSENT_FROM_REPORT; a parser failure is never absence and never evidence; a refused document is never an empty report; a comparison outcome is never an extraction status). Every refusal state of this unit must be named and reachable.',
  '3. A deterministic evaluator for this unit only: its inputs are the uploaded report\'s resolved facts and the governed rule record, and nothing else. It must carry the six recorded conventions (c1 to c6), including the withheld exact-anniversary day, and it must refuse — producing a named refusal and no outcome — on each condition the gate names: incomplete extraction, an unapproved rule record, the wrong jurisdiction, the wrong event-date mapping, an unsupported presentation, and any unresolved affirmative element.',
  '4. The output vocabulary and the explanation surface, restricted to what this unit may lawfully say: the observation-class outcomes and refusals only. Both finding classes are unavailable to this unit and must NOT be implemented by this order, the retained classification being determinability D3, conclusion REPORT_RELEVANT_BUT_NOT_DETECTABLE, permitted conclusion observation and packet-ineligible, with permitted_result_ceiling OBSERVATION_CLASS_ONLY and no finding class available. The explanation surface must carry the applicable citation, the report quotation and its location, what requirement appears unmet, why any confidence class is limited, the unresolved exception, timing and applicability qualifications, and the distinction between the report\'s assertion and independently verified truth — and must never render a finding label.',
  '5. An internal determinism check on synthetic inputs only, covering at least: the exact sixth-anniversary boundary date (which must return the boundary case and no outcome), the 29 February clamp case, a record that prints no Last Payment Date, a label printed twice in one record, a header whose Request Date differs between pages, a non-supported presentation, and an absent jurisdiction selection. The legally reviewed fixture suite belongs to Gate 5.6 and is expressly excluded here.',
  '6. Its own verification, preservation and custody records in the form this workspace uses, plus a Gate 5.5 verdict record that quotes the gate\'s text, states each criterion for this scope with its evidence, and names any criterion it cannot meet instead of passing.',
];

const explicit_exclusions = [
  'no rule admission and no coverage claim: 0 admitted governed rules and 0 permitted findings remain the recorded counts; the governed rule record stays NOT ADMITTED and its version string stays reserved to Gate 5.7 (build plan line ' + PHASE_57_LINE + ')',
  'no finding class, no finding output and no change to the ceiling: this unit\'s ceiling is observation-class only and neither VIOLATION nor PROBABLE_VIOLATION may be implemented, emitted, implied or promised for it',
  'no consumer-visible output of any class, no application change, no deployment and no consumer-data transmission; report checking remains "not yet available"',
  'no legally reviewed fixture suite and no independent replay sample: both are Gate 5.6 work (build plan lines ' + PHASE_56_TEST_BULLET + ' and ' + GATE_56_LINE + ')',
  'no new legal research, no source retrieval, no source paraphrase and no re-interpretation of the accepted legal authority; the accepted source is read at its recorded digest only',
  'no change to the effective-period state, the exception state or the anniversary-boundary question, and no convention may be promoted to a requirement of the text',
  'no evaluator work for any other jurisdiction, rule unit, limb or presentation, and no reuse of the scope\'s evidence for another scope',
  'no edit to the register, the ledger, the crosswalk, the catalogue, the corpus-wide queue or any historical manifest, and no promotion, closure or re-classification of any row',
];

const out = {
  artifact: 'next_work_order.json',
  work_order: 'PHASE5-001Q',
  created_utc: '2026-09-30',
  type: 'ISSUED WORK ORDER — not executed by the order that issues it',
  issued_for: 'Gate 5.5 — Specify deterministic report evaluation, for one scope only',
  order_id: 'PHASE5-001R',
  title: 'Gate 5.5 deterministic-evaluation specification for CA-NS-CRA-S10-3-C-LIMB-1 on PR-01',
  authority: {
    why_this_order_may_now_issue: 'the amended build plan allows a later phase to begin for a named scope only when every preceding gate carries a passing verdict for that same scope. Gates 5.2, 5.3 and 5.4 each carry a passing scoped verdict for ' + record.scope.scope_id + ', the last of them in SOURCE_CAPTURES\\PHASE5-001Q\\scoped_gate_5_4_verdict.json, issued on the evidence of ' + validation.check_count + ' validation checks with ' + validation.failure_count + ' failures.',
    governing_text: 'CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md section 3 (Phase 5.5 and Gate 5.5, read with the PHASE5-001P scoped-progression paragraph)',
    governing_text_quoted: [quote(PHASE_55_BULLETS[0]), quote(PHASE_55_BULLETS[1]), quote(PHASE_55_BULLETS[2]), quote(PHASE_55_BULLETS[3]), quote(PHASE_55_BULLETS[4]), quote(GATE_55_LINE)],
    scope: record.scope.scope_id,
    what_it_reads: [
      'SOURCE_CAPTURES\\PHASE5-001Q\\rule_record.json — the governed rule record for this unit, NOT ADMITTED',
      'SOURCE_CAPTURES\\PHASE5-001Q\\rule_record_decisions.json — the six decisions, including the six conventions and the withheld boundary day',
      'SOURCE_CAPTURES\\PHASE5-001Q\\scoped_gate_5_4_verdict.json — the scoped Gate 5.4 verdict that permits this phase to begin for this scope',
      'SOURCE_CAPTURES\\PROD-003\\report_representation_register.json — the demonstrated facts and their locators',
    ],
    still_required_of_the_issuing_owner: 'the order itself must carry its own authorisation and its own scope; nothing in this record authorises it to exceed the scope above',
    what_it_may_not_do: [
      'it may not begin Gate 5.5 for any other jurisdiction, unit, limb or presentation',
      'it may not admit a rule, create coverage or a candidate, or authorize a finding class',
      'it may not treat this order\'s scoped verdict as Gate 5.6 or Gate 5.7 evidence',
    ],
  },
  recorded_tension_this_order_must_state_rather_than_resolve: 'the phase bullet at line ' + PHASE_55_BULLETS[2] + ' speaks of evaluators that take the report\'s resolved facts "plus admitted rule records", and this scope has no admitted rule record: the record is NOT ADMITTED and the counts stand at ' + record.admission_state.admitted_governed_rules_after_this_order + ' admitted governed rules and ' + record.admission_state.permitted_findings_after_this_order + ' permitted findings. The gate\'s own condition, however, is that output "cannot emit on ... unapproved rules", which is a refusal behaviour this order can specify, implement and test. The new order must therefore (a) build the evaluator so that it refuses to emit for this unit while its rule record is unadmitted, producing a named refusal and no outcome, and (b) record that state criterion by criterion in its Gate 5.5 verdict. If the owner instead reads Gate 5.5 as requiring an admitted rule record as a precondition, the new order must stop at its first action, name that criterion as unmet in this scope, and return for an owner decision rather than treating a refusal as an emission.',
  deliverables,
  explicit_exclusions,
  notes_carried_forward: [
    'the PHASE5-001I-A internal comparator may be read as preparation, but it must be re-created and re-validated under Gates 5.5 and 5.6 before any admission, and it is not gate evidence. Its present treatment of the exact sixth-anniversary day as inside the period is NOT adopted by this scope\'s record and must not be relied on',
    'the six calculation conventions are conventions: none is a requirement of the text, and none may be presented as one',
    'the effective-period, exception and anniversary-boundary questions stay separate, explicit and unresolved; each restricts output rather than being filled with an invented fact',
    'the recorded legacy D3 / observation classification and packet ineligibility are preserved and may not be overridden, and the divergence between the legacy reading and the direct-report section 4 reading stays recorded and unresolved',
    'the register row for this unit stays UNRESOLVED with its recorded blocker, and no row is promoted, cleared or re-classified',
  ],
  stop_conditions: [
    'any deliverable that would need a finding class, a finding label or a change to the observation-class ceiling: stop and return for an owner instrument, because a rank-6 order cannot create a finding class',
    'a concrete source conflict, amendment, repeal or supersession indicator that would change legal content: hold for owner/legal direction rather than guessing',
    'a required decision or check that would need real consumer data, additional consumer evidence or a source retrieval the direct-report contract forbids',
    'an evaluator requirement that would need the effective-period, exception or boundary question to be decided in order to be deterministic: record the criterion as unmet for this scope instead of deciding it',
  ],
  acceptance_criteria: [
    'the report fact model and the status vocabulary are recorded exactly, with each reachable path and each recorded non-conflation named, and with the rule-read fact kept distinct from the convention input',
    'the evaluator is deterministic: every input maps to exactly one outcome or one named refusal, the withheld boundary day included, and no clock, locale, time zone, host or session state is read',
    'the evaluator refuses on each condition the gate names, and it emits nothing for this unit while its rule record is unadmitted',
    'no finding class is implemented, emitted or implied for this unit, and the explanation surface carries every qualification the rule record requires',
    'the internal determinism check runs on synthetic inputs only and its results are recorded against the record\'s own test, including the boundary and clamp cases',
    'the Gate 5.5 verdict record quotes the gate text, states each criterion for this scope with its evidence, and names any criterion it cannot meet instead of passing',
    'the order\'s preservation and custody records show that no earlier artifact was changed outside its own package',
  ],
  what_this_issuing_order_did_not_do: 'it did not execute any part of Gate 5.5: no fact model, status vocabulary, evaluator, output vocabulary or determinism check was specified, built or run, no consumer-visible output of any class was produced, and no artifact of this order is evidence for Gate 5.5. The order is issued, not begun.',
  created_by: 'PHASE5-001Q',
};
fs.writeFileSync(path.join(OUT, 'next_work_order.json'), JSON.stringify(out, null, 2) + '\n', 'utf8');
console.log('next_work_order.json written: order ' + out.order_id + ' for ' + out.issued_for + ' | deliverables ' + deliverables.length + ' | exclusions ' + explicit_exclusions.length);
