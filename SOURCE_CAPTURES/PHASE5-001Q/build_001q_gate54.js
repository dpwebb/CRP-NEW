// build_001q_gate54.js — PHASE5-001Q deliverable 4.
//
// The Gate 5.4 verdict record, for one explicitly named scope only. It quotes the gate's own text and the
// Phase 5.4 bullets that the gate quantifies, states each criterion for this scope, gives the evidence for
// each state, and names every item the scope excludes or leaves unresolved. It refuses to run if the
// artifacts it reads are not in the state it is about to certify, so the verdict cannot be issued on
// inconsistent inputs.
//
// It writes only scoped_gate_5_4_verdict.json inside this order's own package.

const fs = require('fs');
const path = require('path');

const ROOT = 'C:\\CRP-NEW';
const OUT = path.join(ROOT, 'SOURCE_CAPTURES', 'PHASE5-001Q');
const readText = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const readJson = (rel) => JSON.parse(readText(rel));
const split = (t) => String(t).split(/\r?\n/);
const norm = (s) => String(s).replace(/\s+/g, ' ').trim();

const planLines = split(readText('CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md'));
const contractLines = split(readText('CRP_DIRECT_REPORT_CONTENT_SOURCE_EXPANSION_CONTRACT.md'));
const record = readJson('SOURCE_CAPTURES\\PHASE5-001Q\\rule_record.json');
const decisionsDoc = readJson('SOURCE_CAPTURES\\PHASE5-001Q\\rule_record_decisions.json');
const validation = readJson('SOURCE_CAPTURES\\PHASE5-001Q\\transcription_mapping_validation.json');
const ledger = readJson('SOURCE_CAPTURES\\PHASE5-001O\\source_id_coverage_ledger.json');
const register = readJson('SOURCE_CAPTURES\\PROD-003\\report_representation_register.json');
const crosswalk = readJson('SOURCE_CAPTURES\\PROD-003\\crosswalk.json');
const scoped52 = readJson('SOURCE_CAPTURES\\PHASE5-001P\\scoped_gate_5_2_verdict.json');
const scoped53 = readJson('SOURCE_CAPTURES\\PHASE5-001P\\scoped_gate_5_3_verdict.json');
const issuedOrder = readJson('SOURCE_CAPTURES\\PHASE5-001P\\next_work_order.json');

const ledgerRow = ledger.rows.find((r) => r.source_entry_id === 'CRP-LSRC-0354');
const fact02 = register.field_records.find((f) => f.field_id === 'FACT-02');
const fact03 = register.field_records.find((f) => f.field_id === 'FACT-03');

// the gate's own text, and the bullets in the same phase that the gate quantifies, quoted by line
const PHASE_54_BULLETS = [122, 123, 124, 125, 126];
const GATE_54_LINE = 128;
const SCOPED_PARAGRAPH_LINES = [47, 50, 53, 56, 58, 61, 65];
const quoteAt = (lineNumbers) => lineNumbers.map((n) => ({ document: 'CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md', section: 'section 3', line: n, text: planLines[n - 1] }));
const gateSentence = planLines[GATE_54_LINE - 1];

// the verdict cannot be issued unless its inputs are in the state it certifies
if (validation.failure_count !== 0) { throw new Error('the validation record records ' + validation.failure_count + ' failures; a verdict may not be issued on a failed validation'); }
if (validation.check_count < 20) { throw new Error('the validation record holds only ' + validation.check_count + ' checks; the verdict will not be issued on a thin validation'); }
if (decisionsDoc.decisions.length !== 6) { throw new Error('the decisions record holds ' + decisionsDoc.decisions.length + ' decisions, not six'); }
if (record.admission_state.state !== 'NOT_ADMITTED') { throw new Error('the rule record is not in the NOT_ADMITTED state'); }
if (record.governed_fields.length !== 13) { throw new Error('the rule record holds ' + record.governed_fields.length + ' governed fields, not the 13 the plan requires'); }
if (scoped52.verdict !== 'PASSED_FOR_THIS_SCOPE' || scoped53.verdict !== 'PASSED_FOR_THIS_SCOPE') { throw new Error('a preceding gate does not carry a passing verdict for this scope, so Gate 5.4 may not be recorded for it'); }
if (norm(gateSentence).indexOf('**Gate 5.4:**') !== 0) { throw new Error('the Gate 5.4 sentence is not at line ' + GATE_54_LINE + ' as this verdict cites it'); }

// ---------------------------------------------------------------- the criteria, one object each
const criteria = [];

// Criterion 1 — the gate's own first requirement.
criteria.push({
  criterion_verbatim: 'each proposed rule has a complete field-by-field trace to the owner-approved source',
  where_it_sits: 'the Gate 5.4 sentence, build plan line ' + GATE_54_LINE + ', first clause, read with the Phase 5.4 bullet at line ' + PHASE_54_BULLETS[2] + ' ("record the required governed fields")',
  scoped_reading: 'the one proposed rule of this scope carries every required governed field, and each field records the instrument it rests on',
  state: 'MET within the scope',
  evidence: [
    'all 13 required governed fields are recorded, each with a value, a basis, a named state and an effect on output eligibility: SOURCE_CAPTURES\\PHASE5-001Q\\rule_record.json governed_fields, checked field by field at V-M9 and V-M10',
    'the field set is parsed out of the build plan itself (line ' + PHASE_54_BULLETS[2] + ') rather than taken from the record, and the two sets are identical: no field is missing and none is added',
    'the source side of every trace is owner-approved: the ledger row records owner_acceptance.state ' + ledgerRow.owner_acceptance.state + ' with acceptance_basis ' + ledgerRow.owner_acceptance.acceptance_basis + ' and acceptance_is_independent_verification_by_this_order ' + ledgerRow.owner_acceptance.acceptance_is_independent_verification_by_this_order + ', which is why this order does not re-certify the source',
    'the six outstanding field decisions are resolved or retained explicitly in SOURCE_CAPTURES\\PHASE5-001Q\\rule_record_decisions.json, one decision per item the issuing order names (V-M14)',
  ],
  unresolved_within_this_scope: [],
});

// Criterion 2 — jurisdiction and limb.
criteria.push({
  criterion_verbatim: 'exact jurisdiction/limb',
  where_it_sits: 'the Gate 5.4 sentence, build plan line ' + GATE_54_LINE + ', second clause',
  scoped_reading: 'the rule unit is one independently testable proposition for one exact jurisdiction and one statutory limb, and the scope names both',
  state: 'MET within the scope',
  evidence: [
    'jurisdiction CA / CA-NS, association status EXACT, taken from the ledger row\'s established_jurisdiction_associations and never inferred from the report: V-M1',
    'the scope names the first limb only, the last-payment limb, and records the second limb as UNSEATED and excluded with the reason taken from the register: ' + fact02.second_limb_note,
    'the unit is one proposition for one exact jurisdiction and limb: PROD-003 crosswalk.json selected.rule_unit ' + crosswalk.selected.rule_unit + ' on presentation ' + crosswalk.selected.presentation + ' in jurisdiction ' + crosswalk.selected.jurisdiction.region_code,
    'the limb is derived from the accepted text at the limb boundary and matches the artifact\'s own wording, so the two limbs cannot be conflated: V-T4',
  ],
  unresolved_within_this_scope: [
    'the second limb is not seated, not evaluated and not reported as absent or compliant: the register prints no field the admitted text reads as the default-in-payment date. This is an explicit exclusion of the scope rather than a criterion failure, and it leaves the register row\'s own mapping task unmapped exactly as the scoped Gate 5.3 verdict recorded',
  ],
});

// Criterion 3 — no unresolved affirmative element.
criteria.push({
  criterion_verbatim: 'no unresolved affirmative element',
  where_it_sits: 'the Gate 5.4 sentence, build plan line ' + GATE_54_LINE + ', third clause, read with the Phase 5.4 bullet at line ' + PHASE_54_BULLETS[3] + ' and with the owner amendment to build plan section 2.1 item 1 (PHASE5-001O)',
  scoped_reading: 'every affirmative element the first limb applies is resolved on the byte-pinned specimen, and no unresolved question is presented as though it were such an element',
  state: 'MET within the scope, on the recorded reading that the effective period is a temporal qualification and not an affirmative element',
  evidence: [
    'the elements the limb applies are enumerated in the record\'s breach-test inputs and steps: a debt the report carries, the report-stated last payment date bound to that record, and elapsed time measured from that date against the six-year period. Each resolves on this specimen: ' + fact02.field_id + ' = ' + fact02.raw_value_observed + ' and ' + fact03.field_id + ' = ' + fact03.raw_value_observed + ' (V-M4, V-M5)',
    'the effective period is neither decided nor treated as an element: effectiveFrom null, effectiveTo null, status in_force, basis recorded_gap_commencement_not_read, state UNRESOLVED_MISSING_EVIDENCE (V-M3), with the mandatory plain-English timing qualification carried verbatim (Q-D2, V-M17)',
    'the controlling text is what permits that reading: the amended build plan section 2.1 item 1 (PHASE5-001O) records that a source whose formal edition, historical version or prior-review record is not recorded is not rejected for that reason, the missing record being an administrative limitation to state with the result',
    'the exception is neither relied on nor treated as absent: RECORDED_NOT_RELIED_ON with route_satisfied false, checked word for word against the rank-4 contract at V-M11, and consistent across both copies of it at V-M18',
    'the anniversary-boundary question is withheld by an exact date equality rather than left indeterminate, and the withholding is recorded as a convention rather than as a reading of the text: V-M13',
  ],
  unresolved_within_this_scope: [
    'the effective-period question stays unresolved and restricts every statement this unit could ever produce; it is carried, not answered',
    'the exception determination stays unmade, and the direct-report contract section 4 route is exercised by nothing',
    'the anniversary-boundary legal question stays undecided, so the unit withholds its outcome on that one day',
    'the three are recorded in three separate named states and none is merged with another: V-M17',
  ],
});

// Criterion 4 — a deterministic test.
criteria.push({
  criterion_verbatim: 'a deterministic test',
  where_it_sits: 'the Gate 5.4 sentence, build plan line ' + GATE_54_LINE + ', fourth clause',
  scoped_reading: 'the unit specifies one test whose every input maps to exactly one outcome, with no discretion and no reading of clock, locale, host or session state',
  state: 'MET within the scope, as a specification; the evaluator that conforms to it is Gate 5.5 work and is not claimed here',
  evidence: [
    'the test is specified step by step with its inputs, its gates, its arithmetic, its six conventions and its outcome vocabulary: rule_record.json deterministic_breach_test',
    'the arithmetic is recomputed independently in the validation record from the two resolved dates, and every number matches the record and the register\'s own demonstration: anniversary ' + record.deterministic_breach_test.arithmetic.measured_on_the_specimen.anniversary + ', span ' + record.deterministic_breach_test.arithmetic.measured_on_the_specimen.span_in_days + ' days, elapsed ' + record.deterministic_breach_test.arithmetic.measured_on_the_specimen.elapsed_days + ' days, outcome ' + record.deterministic_breach_test.arithmetic.measured_on_the_specimen.outcome + ' (V-M6)',
    'the month-end clamp is exercised as arithmetic rather than asserted: 2020-02-29 plus six calendar years recomputes to 2026-02-28 (V-M7)',
    'the one withheld input is withheld by an exact date equality, so the test remains a function and not a judgement: V-M13',
    'an arithmetic outcome is explicitly not a finding, and no status of this unit may be rendered as a finding class: rule_record.json breach-test outcome_is_not_a_finding, checked at V-M12',
    'no date the record or the decisions record prints is invented: each traces to the register, to this order\'s creation date, or to a recomputation performed in the validation record: V-M8',
  ],
  unresolved_within_this_scope: [
    'no evaluator is built, conformed or admitted by this order; the internal comparator of PHASE5-001I-A is not adopted, in particular for the boundary day, and conforming an evaluator to this record is Gate 5.5 work',
    'the comparison conventions are recorded as conventions and never as requirements of the text, and the owner may confirm or replace each at admission',
  ],
});

// Criterion 5 — independent validation of transcription and mapping.
criteria.push({
  criterion_verbatim: "Independent validation verifies faithful transcription and mapping to the accepted legal record; it does not repeat the owner's legal/source certification.",
  where_it_sits: 'the Gate 5.4 sentence, build plan line ' + GATE_54_LINE + ', fifth clause',
  scoped_reading: 'a validation exists that re-derives the transcription and the mapping for this scope and that does not re-certify the source',
  state: 'MET within the scope',
  evidence: [
    'SOURCE_CAPTURES\\PHASE5-001Q\\transcription_mapping_validation.json records ' + validation.check_count + ' checks with ' + validation.failure_count + ' failures for this scope: ' + validation.verdict,
    'transcription is re-derived rather than trusted: the accepted text is reassembled from the artifact\'s own string literals at lines 186-188 and compared character-for-character with the recorded quotation (V-T2, V-T3), the proposition is derived at the limb boundary (V-T4, V-T7), and the pin is re-measured on disk against the ledger row\'s recorded digest (V-T1)',
    'mapping is re-derived field by field: jurisdiction and limb to the ledger row (V-M1, V-M2), the effective-period value to the ledger row\'s recorded string (V-M3), the fact and the reference date to register ' + fact02.field_id + ' and ' + fact03.field_id + ' with their locators (V-M4, V-M5), the exception and the route word for word to the rank-4 contract (V-M11, V-M18), and the arithmetic by independent recomputation (V-M6, V-M7)',
    'the validation was itself tested for discrimination: a one-word mutation of the recorded statutory text and a mutation of the elapsed-day count and region code each made the appropriate checks fail, and restoring the file byte-for-byte returned the record to 0 failures',
    'it is not the owner\'s certification repeated: the validation record states that the source is owner-accepted under ' + ledgerRow.owner_acceptance.acceptance_basis + ' and that this order neither re-litigates nor re-certifies it',
  ],
  unresolved_within_this_scope: [
    'the validation is evidence for this criterion in this scope only; it is not independent legal review and it is not Gate 5.5 or Gate 5.6 evidence',
  ],
});

// Criterion 6 — a concrete contradiction or change indicator is held rather than guessed.
criteria.push({
  criterion_verbatim: 'A concrete contradiction or change indicator is held for owner/legal direction rather than guessed.',
  where_it_sits: 'the Gate 5.4 sentence, build plan line ' + GATE_54_LINE + ', sixth clause',
  scoped_reading: 'every concrete seam, divergence or contradiction the scope meets is recorded and held unresolved, and none is repaired by invention',
  state: 'MET within the scope',
  evidence: [
    'the citation seam is recorded and not repaired: the legacy production row that supplies a debt clock quotes s. 10(ha), recorded elsewhere in the same corpus as s. 10(3)(ha), while the provision this unit reads is s. 10(3)(c); the legacy record itself calls this a pre-existing engine measurement and a remaining citation seam, and no period, start, anchor or finding is moved (rule_record.json consumer citation, state RESOLVED — the seam is recorded, not repaired)',
    'the field-name divergence is recorded and not erased: the admitted artifact declares the required field tradeline.lastPaymentDate while the field this unit reads is the collection-scoped collection.lastPaymentDate, and both are named rather than one relabelled (V-T5)',
    'the divergence between the recorded legacy D3 reading and the direct-report section 4 reading is recorded and not resolved, and the owner decision retains the legacy classification unchanged (Q-D4, V-T6)',
    'the missing formal-edition and effective-period records are recorded as administrative limitations with their effect on output, not converted into a rejection or a guess (V-M3)',
    'no concrete change indicator was met, and none was fabricated: no amendment, repeal or supersession indicator for this provision appears in any record this order read, and no such indicator is asserted',
  ],
  unresolved_within_this_scope: [
    'the citation seam stays recorded, not repaired, exactly as the legacy record instructs',
    'the recorded divergence between the two readings of the retention exception stays unresolved and is held for owner direction',
  ],
});

// The Phase 5.4 bullets the gate quantifies, each stated as a criterion of this scope.
criteria.push({
  criterion_verbatim: norm(planLines[PHASE_54_BULLETS[0] - 1]).replace(/^-\s*/, ''),
  where_it_sits: 'Phase 5.4 bullet, build plan line ' + PHASE_54_BULLETS[0],
  scoped_reading: 'the crosswalk exists for this unit, and the unit is one independently testable proposition for one exact jurisdiction and statutory limb',
  state: 'MET within the scope',
  evidence: [
    'the crosswalk is recorded, with this unit selected on evidence and its criteria each recorded as MET: PROD-003 crosswalk.json selected ' + crosswalk.selected.combination_id + ', rule_unit ' + crosswalk.selected.rule_unit + ', jurisdiction ' + crosswalk.selected.jurisdiction.country_code + ' / ' + crosswalk.selected.jurisdiction.region_code + ', presentation ' + crosswalk.selected.presentation + ', source_entry_id ' + crosswalk.selected.source_entry_id,
    'the unit\'s identity and its single limb are recorded in the scope: SOURCE_CAPTURES\\PHASE5-001Q\\rule_record.json scope, verified at V-M1',
    'the rule content is reused from the certified legacy corpus and not rebuilt: ' + ledgerRow.legacy_statute_or_provision.source_artifact + ' at its recorded digest, re-measured at V-T1',
  ],
  unresolved_within_this_scope: [
    'the register candidate\'s own disposition stays UNRESOLVED with its recorded blocker, exactly as the scoped Gate 5.3 verdict recorded; this verdict does not clear it and does not speak for the register',
  ],
});

criteria.push({
  criterion_verbatim: norm(planLines[PHASE_54_BULLETS[1] - 1]).replace(/^-\s*/, ''),
  where_it_sits: 'Phase 5.4 bullet, build plan line ' + PHASE_54_BULLETS[1],
  scoped_reading: 'the admitted legacy corpus supplies the legal content for this unit, and no fresh source was retrieved; the observable gaps are recorded as administrative limitations that restrict output',
  state: 'MET within the scope on the owner\'s recorded direction, with the retrieval question named below rather than settled by this order',
  evidence: [
    'the legal content is the certified legacy corpus\'s own text, reassembled from the artifact\'s own lines rather than retrieved or paraphrased: V-T2, V-T3',
    'no new legal research, no source retrieval and no re-interpretation was performed: the issuing order forbade them, and this order\'s preservation and custody records show no source file touched',
    'the gaps the bullet contemplates are present and are recorded rather than filled: the source locator is NOT RECORDED, no formal-edition or historical-version record is held, and the effective period is unrecorded (V-M3)',
    'the owner has already recorded how such a gap is to be treated: build plan section 2.1 item 1 as amended by PHASE5-001O — a missing formal edition, historical version or prior-review record is an administrative limitation to state with the result, not a reason to reject the accepted source (owner decision PHASE5-001I-C)',
  ],
  unresolved_within_this_scope: [
    'whether this bullet independently compels retrieval for the one identified missing detail (a commencement date for this provision) is not decided by this order: the decisions record names that question and the smallest action it would take, namely an owner order authorising that retrieval, which this order did not have',
    'the mandatory timing qualification is what the scope does in the meantime, and it restricts every statement rather than being filled with an invented date',
  ],
});

criteria.push({
  criterion_verbatim: norm(planLines[PHASE_54_BULLETS[2] - 1]).replace(/^-\s*/, ''),
  where_it_sits: 'Phase 5.4 bullet, build plan line ' + PHASE_54_BULLETS[2],
  scoped_reading: 'the 13 required governed fields are recorded for this unit',
  state: 'MET within the scope',
  evidence: [
    'the 13 field names are parsed out of this very bullet and matched against the record\'s fields: identical sets, none missing and none added (V-M9)',
    'each field carries a value, a basis, a named state and its own effect on output eligibility (V-M10)',
    'the field that cannot be given a value in this scope is recorded as a reservation with its authority, not left blank: the version string is RESERVED_TO_GATE_5_7, the gate sequence and the issuing order being the authority that reserves it (decision Q-D6)',
  ],
  unresolved_within_this_scope: [
    'the rule version string is reserved to Gate 5.7 and is not assigned here; assigning it would be an admission act',
  ],
});

criteria.push({
  criterion_verbatim: norm(planLines[PHASE_54_BULLETS[3] - 1]).replace(/^-\s*/, ''),
  where_it_sits: 'Phase 5.4 bullet, build plan line ' + PHASE_54_BULLETS[3] + ', read with the ceiling and classification the record retains',
  scoped_reading: 'the unit neither reads nor implies any off-report element, and where the provision needs one it is classified as non-emitting rather than weakened',
  state: 'MET within the scope',
  evidence: [
    'the unit reads two printed report fields and nothing else: ' + fact02.field_id + ' and ' + fact03.field_id + ', both bound to their own located record and page (V-M4, V-M5)',
    'the forbidden substitutions are recorded explicitly, including that a parser failure is never absence, a refused document is never an empty report, and an off-report fact is never requested, inferred or used: rule_record.json report_facts.forbidden_substitutions and absence_path',
    'the second limb, which would need two facts a report does not carry, is left unseated and is not inferred, defaulted or reported as absent or compliant (V-M1)',
    'the provision stands at the classification the bullet contemplates where such an element is affirmative: determinability D3, conclusion REPORT_RELEVANT_BUT_NOT_DETECTABLE, permitted conclusion observation and packet-ineligible, retained unchanged by owner decision D-5, with permitted_result_ceiling OBSERVATION_CLASS_ONLY and no finding class available (V-T6, V-M12)',
  ],
  unresolved_within_this_scope: [
    'whether any first-limb-only output could ever be emitted is not decided, and nothing emits: the ceiling is observation-class, so the retained classification and the ceiling together are the non-emittable reading this bullet calls for',
    'the PROBABLE_VIOLATION ceiling that PROD-003 proposed conditionally is not adopted, its condition not being exercised',
  ],
});

criteria.push({
  criterion_verbatim: norm(planLines[PHASE_54_BULLETS[4] - 1]).replace(/^-\s*/, ''),
  where_it_sits: 'Phase 5.4 bullet, build plan line ' + PHASE_54_BULLETS[4],
  scoped_reading: 'the unit rests on owner-accepted legal authority and a byte-pinned source, not on a source-discovery status, and any remaining uncertainty stays inside the recorded restriction',
  state: 'MET within the scope',
  evidence: [
    'the source is owner-accepted legal authority, not a discovery status: ledger row owner_acceptance.state ' + ledgerRow.owner_acceptance.state + ' under ' + ledgerRow.owner_acceptance.acceptance_basis + ', with the artifact\'s own pin and digest re-measured (V-T1, V-M2)',
    'the uncertainty that does remain — the effective period, the exception, the boundary day and the conventions — is carried as explicit restrictions on output rather than as a probable path: the ceiling permits no finding class at all (V-M12)',
    'the record creates no rule, coverage or candidate and leaves the corpus-wide counts unchanged: ' + record.admission_state.admitted_governed_rules_after_this_order + ' admitted governed rules and ' + record.admission_state.permitted_findings_after_this_order + ' permitted findings after this order (V-M16)',
  ],
  unresolved_within_this_scope: [
    'no probable-only path is exercised by this order: with the ceiling observation-class only, the uncertainty is not routed anywhere, and a later owner instrument would be needed to change the ceiling',
  ],
});

// ---------------------------------------------------------------- output
for (const c of criteria) {
  if (!Array.isArray(c.evidence) || c.evidence.length === 0) { throw new Error('a criterion carries no evidence: ' + c.criterion_verbatim); }
  if (!Array.isArray(c.unresolved_within_this_scope)) { throw new Error('a criterion does not state what it leaves unresolved: ' + c.criterion_verbatim); }
}
const unmetCriteria = criteria.filter((c) => /^UNMET|NOT MET|CANNOT BE MET/i.test(c.state));
const verdict = unmetCriteria.length === 0
  ? 'PASSED_FOR_THIS_SCOPE'
  : 'NOT ISSUED — this scope names the criterion it cannot meet, as the scoped-progression paragraph requires';

const out = {
  artifact: 'scoped_gate_5_4_verdict.json',
  work_order: 'PHASE5-001Q',
  created_utc: '2026-09-30',
  scope_id: record.scope.scope_id,
  gate: 'Gate 5.4 — Select and certify rule units',
  gate_text_quoted_verbatim: quoteAt([GATE_54_LINE]).concat(quoteAt(PHASE_54_BULLETS)).concat(quoteAt(SCOPED_PARAGRAPH_LINES)),
  authority_for_this_scoped_verdict: 'the build plan section 3 paragraph recorded under owner authority PHASE5-001P (amendment A-1): for progression purposes only, a gate may also be recorded as passed for one explicitly named scope, and a scoped verdict states, criterion by criterion, the gate\'s own text, the state of each criterion within that scope, the evidence for each state, and every item the scope excludes or leaves unresolved. A scoped verdict is never a corpus-wide pass.',
  preceding_gates_in_this_scope: [
    'Gate 5.2 — ' + scoped52.verdict + ' (SOURCE_CAPTURES\\PHASE5-001P\\scoped_gate_5_2_verdict.json)',
    'Gate 5.3 — ' + scoped53.verdict + ' (SOURCE_CAPTURES\\PHASE5-001P\\scoped_gate_5_3_verdict.json)',
  ],
  why_this_gate_may_be_recorded_for_this_scope: 'a later phase may begin for a named scope only when every preceding gate carries a passing verdict for that same scope, and it does: Gates 5.2 and 5.3 each carry a passing verdict for ' + record.scope.scope_id + '. This verdict reads that same scope and no other.',
  artifacts_this_verdict_reads: [
    'SOURCE_CAPTURES\\PHASE5-001Q\\rule_record.json — the governed rule record this gate is about',
    'SOURCE_CAPTURES\\PHASE5-001Q\\rule_record_decisions.json — the six decisions, each with its own Gate 5.4 criterion',
    'SOURCE_CAPTURES\\PHASE5-001Q\\transcription_mapping_validation.json — the independent validation, ' + validation.check_count + ' checks, ' + validation.failure_count + ' failures',
    'SOURCE_CAPTURES\\PHASE5-001Q\\input_verification.json and preserved_files_before.json — input custody and preservation',
  ],
  verdict: verdict,
  unmet_criteria_named: unmetCriteria.length === 0 ? 'NONE — no criterion of Gate 5.4 is unmet within this scope, so the verdict is issued rather than withheld. Had any criterion been unmet, it would be listed here and the verdict would not be issued, as the scoped-progression paragraph (line ' + SCOPED_PARAGRAPH_LINES[5] + ' to ' + SCOPED_PARAGRAPH_LINES[5] + 2 + ') requires.' : unmetCriteria.map((c) => ({ criterion: c.criterion_verbatim, state: c.state })),
  corpus_wide_verdict: 'NOT PASSED AND UNCHANGED — Gate 5.4 remains unpassed for the corpus: this verdict covers one jurisdiction, one rule unit, one statutory limb and one byte-pinned presentation. Nothing in it states or implies a corpus-wide pass, clears any register row or queue item outside this scope, or advances Gate 5.5 or Gate 5.6 corpus-wide. The recorded counts after this order are ' + record.admission_state.admitted_governed_rules_after_this_order + ' admitted governed rules and ' + record.admission_state.permitted_findings_after_this_order + ' permitted findings.',
  criteria,
  criterion_count: criteria.length,
  excluded_and_unresolved_items: criteria.reduce((acc, c) => acc.concat(c.unresolved_within_this_scope), []),
  validation_of_this_verdicts_inputs: {
    artifact: 'SOURCE_CAPTURES\\PHASE5-001Q\\transcription_mapping_validation.json',
    check_count: validation.check_count,
    failure_count: validation.failure_count,
    verdict: validation.verdict,
    discrimination: 'the validation record was itself exercised against mutations: a one-word change to the recorded statutory text, and a change to the elapsed-day count and the region code, each made the corresponding checks fail, and restoring the file byte-for-byte returned 0 failures. No check was relaxed to reach ' + validation.failure_count + ' failures.',
  },
  what_this_verdict_does_not_do: [
    'it does not admit a rule, create coverage or a candidate, authorize a finding class, or give any corpus-wide gate-completion credit',
    'it does not resolve the effective period, the exception, the anniversary-boundary reading or the calculation conventions, and it does not convert any of them into a criterion satisfaction',
    'it does not promote, clear, close or re-classify any register row, queue item or ledger entry, and it edits no register, ledger, crosswalk, catalogue or manifest',
    'it does not treat the missing work of this scope as GAP or REFUSAL, and it does not retroactively authorize the custody discrepancies that earlier orders recorded',
    'it produces no consumer-visible output of any class and changes no application behaviour; report checking remains "not yet available"',
    'it is not Gate 5.5 or Gate 5.6 evidence, and it does not pass Gate 5.4 for any other scope',
  ],
  created_by: 'PHASE5-001Q',
};
fs.writeFileSync(path.join(OUT, 'scoped_gate_5_4_verdict.json'), JSON.stringify(out, null, 2) + '\n', 'utf8');
console.log('scoped_gate_5_4_verdict.json written: ' + criteria.length + ' criteria | verdict ' + verdict + ' | unmet: ' + unmetCriteria.length);
