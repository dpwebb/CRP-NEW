// build_001q_rule_record.js — PHASE5-001Q deliverable 1.
//
// Builds the field-by-field governed rule record for CA-NS-CRA-S10-3-C-LIMB-1 from existing materials only:
// the amended rank-5 build plan, the owner decisions of PHASE5-001I-C, the PHASE5-001I-B draft rule record,
// PROD-003's representation register, PHASE5-001I-A's extraction results, the PHASE5-001O coverage ledger and
// the admitted legacy artifact (read read-only, in place, by digest).
//
// It writes nothing outside its own package and admits nothing. Every field is either carried with its
// recorded basis or recorded as an explicit qualification with its effect on output.
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = 'C:\\CRP-NEW';
const OUT = path.join(ROOT, 'SOURCE_CAPTURES', 'PHASE5-001Q');
const LEGACY = 'C:\\Users\\webbd\\crp-credit-app\\packages\\backend\\src\\services\\legalCorpus\\rules.canada.ts';

const readText = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const readJson = (p) => JSON.parse(readText(p));
const sha256 = (p) => crypto.createHash('sha256').update(fs.readFileSync(path.isAbsolute(p) ? p : path.join(ROOT, p))).digest('hex').toUpperCase();
const lines = (t) => t.split(/\r?\n/);
const locate = (text, needle) => {
  const ls = lines(text);
  const i = ls.findIndex((l) => l.includes(needle));
  if (i < 0) throw new Error('clause not found: ' + needle);
  return { line: i + 1, text: ls[i].trim() };
};
const write = (name, obj) => fs.writeFileSync(path.join(OUT, name), JSON.stringify(obj, null, 2) + '\n', 'utf8');

// ------------------------------------------------------------------ inputs
const PLAN = 'CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md';
const planText = readText(PLAN);
const planDigest = sha256(PLAN);
const legacyText = fs.readFileSync(LEGACY, 'utf8');
const legacyDigest = sha256(LEGACY);
const legacyLines = lines(legacyText);
const lineOf = (n) => (legacyLines[n - 1] || '').trim();

const register = readJson('SOURCE_CAPTURES\\PROD-003\\report_representation_register.json');
const extraction = readJson('SOURCE_CAPTURES\\PHASE5-001I-A\\extraction_results.json');
const ledger = readJson('SOURCE_CAPTURES\\PHASE5-001O\\source_id_coverage_ledger.json');
const iC = readJson('SOURCE_CAPTURES\\PHASE5-001I-C\\owner_representation_decisions.json');
const iB = readJson('SOURCE_CAPTURES\\PHASE5-001I-B\\rule_record_draft.json');
const scopeP = readJson('SOURCE_CAPTURES\\PHASE5-001P\\scope_definition.json');
const crosswalk = readJson('SOURCE_CAPTURES\\PROD-003\\crosswalk.json');
const ledgerRow = ledger.rows.find((r) => r.source_entry_id === 'CRP-LSRC-0354');
const fact = (id) => register.field_records.find((f) => f.field_id === id);

// the admitted text is assembled from the legacy artifact's own string concatenation, not retyped
const strip = (s) => s.trim().replace(/^"/, '').replace(/"\s*(\+)?[,]?$/, '').trimEnd();
const admittedText = [
  strip(lineOf(186)),
  strip(lineOf(187)),
  strip(lineOf(188)),
].join(' ');
const admittedTextFromRegister = iB['1_exact_accepted_statute_and_legacy_rule_references'].statutory_text_as_admitted;
const transcriptionIdentity = admittedText === admittedTextFromRegister;
if (!transcriptionIdentity) {
  console.log('assembled : ' + JSON.stringify(admittedText));
  console.log('accepted  : ' + JSON.stringify(admittedTextFromRegister));
}

const decision = (id) => iC.decisions.find((d) => d.id === id);
const D1 = decision('D-1'), D2 = decision('D-2'), D3 = decision('D-3'), D4 = decision('D-4'), D5 = decision('D-5'), D6 = decision('D-6');

const gate54 = locate(planText, '**Gate 5.4:**');
const gate54Bullets = [
  locate(planText, 'Build a candidate-to-rule-unit crosswalk.'),
  locate(planText, 'Reuse the certified legacy legal corpus for its admitted legal content.'),
  locate(planText, 'For every selected unit record the required governed fields'),
  locate(planText, 'Ensure the rule unit does not smuggle in omitted actor conduct'),
  locate(planText, 'Do not create a rule from a source-discovery status alone.'),
];
const scopedProgression = locate(planText, '**Owner authority PHASE5-001P — scoped gate verdicts and incremental rule-unit progression.**');
const administrativeLimitation = locate(planText, 'Under owner directive PHASE5-001O a source whose formal edition');
const phase57 = locate(planText, 'Prepare a rule-corpus amendment containing only rules that passed Gates 5.1–5.6');

const GOV = (field, value, basis, state, effect) => ({ field, value, basis, state, effect_on_output_eligibility: effect });

const governedFields = [
  GOV('immutable rule ID/version',
    { rule_id: 'CA-NS-CRA-S10-3-C-LIMB-1', rule_version: 'RESERVED_TO_GATE_5_7', rule_version_is_a_placeholder: true },
    'the rule unit id is the owner-selected unit name (SOURCE_CAPTURES\\PHASE5-001P\\scope_definition.json); the version string is reserved to Gate 5.7 by the work order that issues this order (SOURCE_CAPTURES\\PHASE5-001P\\next_work_order.json, deliverable 1) and by Phase 5.7 (build plan line ' + phase57.line + ')',
    'RECORDED — the id is final and immutable; the version is a recorded reservation, not an assigned value',
    'no admission and no emit; a version string is required before any admission (Gate 5.7)'),
  GOV('exact jurisdiction',
    { country_code: 'CA', region_code: 'CA-NS', canonical_jurisdiction_status: 'EXACT', enumeration: 'CRP-JURISDICTION-ENUM-1', selection_must_be_explicit: true },
    'coverage ledger row CRP-LSRC-0354 established_jurisdiction_associations; PROD-003 crosswalk selected.jurisdiction; the caller supplies the jurisdiction and the unit never infers it',
    'RESOLVED',
    'evaluation refuses without an explicit CA/CA-NS selection (REFUSED_NO_JURISDICTION_SELECTION_SUPPLIED; REFUSED_JURISDICTION_NOT_AUTHORIZED_FOR_THIS_UNIT)'),
  GOV('source ID and pin',
    { source_entry_id: 'CRP-LSRC-0354', source_artifact: 'packages\\backend\\src\\services\\legalCorpus\\rules.canada.ts', sha256: legacyDigest, bytes: fs.statSync(LEGACY).size, admitted: true, pin_state: 'OWNER_ACCEPTED_LEGAL_AUTHORITY (OWNER_DIRECTIVE_PHASE5-001O)' },
    'PHASE5-001O admitted_artifacts.json and coverage ledger row CRP-LSRC-0354; re-measured read-only in place by this order',
    'RESOLVED',
    'the pin is the only legal source the unit may read; nothing else may be substituted'),
  GOV('formal edition status',
    { state: 'FORMAL_EDITION_OR_HISTORICAL_VERSION_NOT_RECORDED', class: 'RECORDED_ADMINISTRATIVE_LIMITATION' },
    'coverage ledger row CRP-LSRC-0354 administrative limitations; build plan section 2.1 item 1 as amended by PHASE5-001O (line ' + administrativeLimitation.line + ')',
    'RECORDED_AS_AN_ADMINISTRATIVE_LIMITATION — the missing record does not reject the accepted source',
    'the limitation is stated with any statement the unit could produce; it is not a finding and not a coverage claim'),
  GOV('effective dates/status',
    { effectiveFrom: null, effectiveTo: null, status: 'in_force', basis: 'recorded_gap_commencement_not_read', effective_dates_status: 'UNRESOLVED_MISSING_EVIDENCE', source_locator: 'NOT RECORDED' },
    'coverage ledger row CRP-LSRC-0354 effective_information_as_recorded; PHASE5-001I-B draft section 7; owner decision PHASE5-001Q (missing historical provenance is not a reason to reject accepted statutory authority)',
    'RECORDED_UNRESOLVED_WITH_A_MANDATORY_QUALIFICATION — not defaulted to a commencement, a version or "in force at all material times"',
    'the timing qualification is mandatory on any result and an unqualified conclusion is prohibited; the field is not an affirmative element of the breach test'),
  GOV('exact legal text/proposition',
    { statutory_text_quoted_verbatim: admittedText, transcription_identity_with_the_accepted_record: transcriptionIdentity, first_limb_proposition: 'A consumer reporting agency shall not include in a consumer report information regarding any debt more than six years after the last payment was made on the debt.', second_limb: 'EXCLUDED from this unit — where no payment was made, six years from the date on which the default in payment occurred' },
    'assembled from the admitted artifact\'s own quoted strings at lines 186-188 and compared character-for-character with the text the accepted record carries',
    'RESOLVED',
    'the test may read the first limb only; the second limb must not be inferred, defaulted or evaluated'),
  GOV('applicability',
    { jurisdiction_half: 'explicit CA/CA-NS selection required', limb_half: 'first limb only', presentation_half: 'one byte-pinned specimen (PR-01)', temporal_half: 'UNRESOLVED_MISSING_EVIDENCE (see effective dates/status)' },
    'scope_definition.json; PROD-003 crosswalk dependencies D-1 and D-2; owner decisions D-1, D-3, D-6 and PHASE5-001Q',
    'RESOLVED_EXCEPT_THE_TEMPORAL_HALF, WHICH IS CARRIED',
    'a report printed in another jurisdiction, another product or another limb cannot be evaluated by this unit'),
  GOV('report-required facts',
    { rule_read_fact: { name: 'collection.lastPaymentDate', scope: 'COLLECTION_RECORD_SPECIFIC', printed_label: 'Last Payment Date', prints_in: 'a contract debt record inside the Collections section', locators: fact('FACT-02').location, raw_value_form: 'DDDD/DD/DD', value_on_the_evidenced_specimen: '2021/02/01 normalized 2021-02-01', register_field: 'FACT-02', evidence: 'SOURCE_CAPTURES\\PROD-003\\report_representation_register.json FACT-02 and SOURCE_CAPTURES\\PHASE5-001I-A\\extraction_results.json collection_records' }, legacy_required_field_name: 'tradeline.lastPaymentDate', legacy_required_field_name_amended_by_this_order: false, divergence_state: 'RECORDED_NOT_RESOLVED' },
    'owner decision D-2 (PHASE5-001I-C) and the PHASE5-001Q owner decision: use collection.lastPaymentDate as the collection-scoped fact and do not silently relabel it as a tradeline field',
    'RESOLVED_AS_TO_WHAT_IS_READ — the fact the unit reads is collection-scoped and bound to its own record; the seating of the printed field against the legacy required-field name is recorded as an unresolved admission question',
    'a value is never borrowed from another record, section or page; a missing, blank or differently-labelled value is EXTRACTION_UNRESOLVED and never ABSENT_FROM_REPORT'),
  GOV('decisive facts',
    { decisive: ['the report-stated last payment date for the debt record (FACT-02)', 'the presentation reference date (FACT-03)', 'the resolved Collections section state'], not_decisive: ['any fact outside the report, except that the report itself states the last payment date', 'First Delinquency, Date Assigned, Date Paid/Settled and Date Verified, none of which the admitted text reads as the default-in-payment date'], proof_statement: 'the extraction does not prove that the payment occurred and no statement may say it did' },
    'PROD-003 register FACT-02 date_meaning and FACT-04/FACT-05; PHASE5-001I-A extraction_results fact_records',
    'RESOLVED',
    'the test may not treat a report assertion as verified truth, and may not use any off-report fact'),
  GOV('exceptions',
    { direct_report_contract_section_4_retention_exception: { instrument: 'CRP_DIRECT_REPORT_CONTENT_SOURCE_EXPANSION_CONTRACT.md (rank 4), section 4, first exclusion', state: 'RECORDED_NOT_RELIED_ON', route_condition_quoted: 'The report-assertion route in CRP_GOVERNED_LEGAL_CORPUS_CONTRACT.md Section 5 applies only after a later governed rule is admitted with complete required fields and official source evidence.', route_satisfied: false, why: 'no governed rule is admitted, so the route cannot be exercised' }, exception_determination: 'NO_EXCEPTION_DETERMINATION_IS_MADE — the exception is neither relied on nor treated as absent', divergence_with_the_recorded_legacy_classification: 'RECORDED_NOT_RESOLVED — the owner decision retains the recorded D3/observation classification and neither side is overridden' },
    'PHASE5-001I-B draft section 8; PROD-003 section 7.4; owner decisions D-5 and PHASE5-001Q (retain D3/observation; neither PROBABLE_VIOLATION nor VIOLATION authorized)',
    'RECORDED_WITH_NO_DETERMINATION — an exception not established by the report is not treated as absent',
    'the ceiling stays observation-class with no finding of either class'),
  GOV('deterministic breach test',
    { defined_in: 'deterministic_breach_test (this record)', deterministic: true, outcome_vocabulary: ['PERIOD_EXCEEDED', 'PERIOD_NOT_EXCEEDED', 'UNRESOLVED'], boundary_treatment: 'WITHHELD_AT_THE_ANNIVERSARY_DAY' },
    'the admitted text for the period and the start; the recorded conventions for the arithmetic; owner decision PHASE5-001Q (operational uncertainty stays explicit and restricts output)',
    'PARTLY_ESTABLISHED — the arithmetic is deterministic; the convention set is recorded as conventions, not as requirements of the text',
    'PERIOD_EXCEEDED is an arithmetic outcome and is not a finding; the boundary day carries no outcome'),
  GOV('consumer citation',
    { citation: 'Consumer Reporting Act (Nova Scotia), R.S.N.S. 1989, c. 93, s. 10(3)(c)', legacy_provision_field: 's. 10(3)(c)', recorded_seam: 'the legacy production row that supplies a debt clock quotes s. 10(ha), recorded elsewhere in the same corpus as s. 10(3)(ha); the legacy record calls that a pre-existing engine measurement and a remaining citation seam and moves no period, start, anchor or finding' },
    'the admitted artifact (provision field and export) and coverage ledger row CRP-LSRC-0354',
    'RESOLVED — the seam is recorded, not repaired',
    'no statement may present the seam as a resolved citation or as a change of legal content'),
  GOV('consumer-facing qualifications',
    { timing_qualification: 'MANDATORY', classification_qualification: 'MANDATORY', boundary_qualification: 'MANDATORY_WHEN_THE_ANNIVERSARY_DAY_IS_REACHED', specimen_qualification: 'MANDATORY', consumer_visible_today: 'NONE — no output of any class may be produced, shown, hosted, transmitted or implied' },
    'PHASE5-001I-B draft sections 7 and 10; owner decisions D-3, D-5, D-6 and PHASE5-001Q',
    'DRAFTED_FOR_THE_RULE_RECORD — the text is recorded here to be carried verbatim; nothing here is consumer-visible',
    'every qualification narrows what may be said; none of them widens it'),
];



// ------------------------------------------------------------------ blocks that support the governed fields
const reportFacts = {
  rule_read_facts: [
    { fact_id: 'collection.lastPaymentDate', status_on_the_evidenced_specimen: 'RESOLVED', raw_value: '2021/02/01', normalized_value: '2021-02-01', locators: [fact('FACT-02').location, 'record 2: page 17 line 5, inside the record that begins at page 16 line 39 and continues to page 17 line 11'], binding_rule: 'a value is never borrowed from another record, another section or another page; a label printed twice in one record leaves the fact unresolved' },
  ],
  evaluation_convention_inputs: [
    { fact_id: 'report.referenceDate', evidence_label: 'Request Date', status: 'RESOLVED', raw_value: '2026/05/05', normalized_value: '2026-05-05', locators: 'page header, line 1 of all 22 pages, one identical value', kind: 'EVALUATION_CONVENTION_INPUT — supplied by the recorded convention, not by the text of the rule (see the decisions record, decision 3)', reading_rule: 'read from the page header only, and only when the same value appears on every page; otherwise the reference date is unresolved, the comparison does not run, the fact is never ABSENT_FROM_REPORT and no other date is substituted' },
  ],
  refinement_recorded_by_this_order: 'PHASE5-001I-B grouped the printed Request Date with the report-required facts in its governed-fields cross-reference. This record keeps the rule-read fact (collection.lastPaymentDate) and the convention input (report.referenceDate) as two separate entries, because the admitted text requires only the first of them; the grouping is refined here and the draft itself is preserved unchanged.',
  extraction_status_vocabulary: ['RESOLVED', 'EXTRACTION_UNRESOLVED', 'UNSUPPORTED_PRESENTATION', 'NOT_A_DEBT_RECORD', 'ABSENT_FROM_REPORT'],
  comparison_outcome_vocabulary: ['PERIOD_EXCEEDED', 'PERIOD_NOT_EXCEEDED', 'UNRESOLVED'],
  forbidden_substitutions: ['EXTRACTION_UNRESOLVED is never ABSENT_FROM_REPORT', 'a parser failure is never absence and never evidence', 'a refused document is never an empty report', 'a non-debt region is never read for a value', 'a comparison outcome is never an extraction status and an extraction status is never a comparison outcome'],
  absence_path: 'ABSENT_FROM_REPORT has exactly one reachable path: the Collections section is located and resolved and prints no contract debt record. It is a resolved reading, never a parser silence.',
};

const breachTest = {
  inputs: ['report.referenceDate (convention input)', 'collection.lastPaymentDate (rule-read fact)', 'the admitted rule record (this record), and nothing else'],
  input_gates: [
    { step: 1, gate: 'jurisdiction', requirement: 'an explicit CA/CA-NS selection supplied by the caller', refusal: 'REFUSED_NO_JURISDICTION_SELECTION_SUPPLIED / REFUSED_JURISDICTION_NOT_AUTHORIZED_FOR_THIS_UNIT — no evaluation runs' },
    { step: 2, gate: 'presentation', requirement: 'the exact byte-pinned specimen, SHA-256 ' + scopeP.presentation.sha256, refusal: 'UNSUPPORTED_PRESENTATION (NOT_THE_EVIDENCED_SPECIMEN) — structural similarity alone admits nothing' },
    { step: 3, gate: 'section', requirement: 'the Collections section located and resolved by the recorded method', refusal: 'EXTRACTION_UNRESOLVED unless the resolved section prints no contract debt record, which is the single ABSENT_FROM_REPORT path' },
  ],
  steps: [
    'read the printed Last Payment Date of each contract debt record, bound to its own record boundary; a missing, blank, twice-printed or differently-labelled value is EXTRACTION_UNRESOLVED',
    'read the page header Request Date; it must be identical on every page, otherwise the reference date is unresolved',
    'no comparison runs unless both the clock start and the reference date are RESOLVED',
    'anniversary = clock start plus six calendar years by calendar addition (convention c1)',
    'span_in_days = whole days from the clock start to the anniversary (derived, never hard-coded) (convention c3)',
    'elapsed_days = whole days from the clock start to the reference date (convention c4)',
    'comparison: elapsed_days > span_in_days (convention c5)',
  ],
  arithmetic: { method: 'proleptic Gregorian integer day arithmetic; no clock, locale, time zone, host or session state is read', measured_on_the_specimen: { clock_start: '2021-02-01', reference_date: '2026-05-05', anniversary: '2027-02-01', elapsed_days: 1919, span_in_days: 2191, outcome: register.deterministic_evaluation_demonstration.result_on_this_specimen } },
};


breachTest.conventions = [
  { id: 'c1', convention: 'the anniversary is the clock start plus six calendar years, by calendar addition', is_a_requirement_of_the_text: false },
  { id: 'c2', convention: 'a 29 February start clamps to 28 February in a non-leap sixth year', is_a_requirement_of_the_text: false },
  { id: 'c3', convention: 'the six-year span in days is derived from the two dates and never hard-coded', is_a_requirement_of_the_text: false },
  { id: 'c4', convention: 'elapsed time is measured in whole days from the clock start to the reference date', is_a_requirement_of_the_text: false },
  { id: 'c5', convention: 'the period is exceeded when elapsed days exceed the span in days', is_a_requirement_of_the_text: false },
  { id: 'c6', convention: 'the exact sixth-anniversary day carries NO outcome: the comparison reports BOUNDARY_CASE_EXACTLY_AT_SIX_YEAR_ANNIVERSARY with comparison_outcome UNRESOLVED, because the text does not settle whether that day is inside or outside the period', is_a_requirement_of_the_text: false, adopted_because: 'owner decision PHASE5-001Q — operational uncertainty must remain explicit and restrict output rather than be filled with an invented fact' },
];
breachTest.boundary_treatment = {
  rule: 'when the reference date equals the sixth anniversary exactly, the outcome is WITHHELD. Neither reading of "more than six years after" is adopted by this record.',
  effect: 'the unit produces no PERIOD_EXCEEDED and no PERIOD_NOT_EXCEEDED on that one day; the case is reported as a boundary case',
  note: 'the existing internal comparator treats that day as inside the period. That convention is NOT adopted by this record, and no result resting on it at the boundary may be relied on. Conforming an evaluator to this record is Gate 5.5 work.',
};
breachTest.outcome_is_not_a_finding = 'PERIOD_EXCEEDED is an arithmetic outcome. It decides nothing, supports nothing and authorizes nothing. No status and no outcome of this unit may be rendered as VIOLATION, PROBABLE_VIOLATION or any finding class.';

const exceptions = {
  direct_report_contract_section_4_retention_exception: {
    instrument: 'CRP_DIRECT_REPORT_CONTENT_SOURCE_EXPANSION_CONTRACT.md (rank 4), section 4, Permanent Exclusions, first exclusion',
    quoted_text: 'limitation, accrual, debt-enforcement, or retention rules whose legal clock requires proving a true external event, unless the only unresolved fact is that underlying historical event and the rule satisfies the report-assertion probable-finding gate in Sections 6 and 7',
    route_quoted: 'The report-assertion route in CRP_GOVERNED_LEGAL_CORPUS_CONTRACT.md Section 5 applies only after a later governed rule is admitted with complete required fields and official source evidence.',
    route_satisfied: false,
    state: 'RECORDED_NOT_RELIED_ON',
    why_not_relied_on: 'the route requires an admitted governed rule with complete required fields and official source evidence. No governed rule is admitted, so the exception is available to nothing and is exercised by nothing.',
    what_would_exercise_it: 'only a later owner rule-corpus amendment, after Gate 5.7 admission. A rank-6 order cannot create a finding class.',
  },
  exception_determination: 'NO_EXCEPTION_DETERMINATION_IS_MADE BY THIS ORDER. No exception is relied on, and no exception is treated as absent: the second limb is recorded as unseated on this presentation and is not inferable.',
  recorded_divergence_with_the_legacy_classification: {
    legacy_reading: 'the provision as a whole is REPORT_RELEVANT_BUT_NOT_DETECTABLE (D3) because its condition needs two facts a report does not carry, so the ceiling is an observation-class statement',
    direct_report_reading: 'a retention rule whose clock needs a true external event may proceed to the probable path where the only unresolved fact is that underlying historical event and the report itself states it',
    state: 'RECORDED_NOT_RESOLVED — the owner decision retains the legacy D3 / observation classification, and neither reading is overridden or adopted by this order',
  },
};


const ceiling = {
  permitted_result_ceiling: 'OBSERVATION_CLASS_ONLY',
  finding_classes_available: [],
  authorised_finding_classes: 'NONE — neither VIOLATION nor PROBABLE_VIOLATION is authorized, in any circumstance, for any input',
  classification_retained: { determinability: 'D3', recorded_conclusion: 'REPORT_RELEVANT_BUT_NOT_DETECTABLE', permitted_conclusion: 'observation', packet_eligibility: 'ineligible', retained_unchanged: true, recorded_in: 'the admitted legacy artifact CANADA_RULE_CLASSIFICATION_RECORDS entry for ca-ns.cra.s10_3_c.debt_retention_6y (lines 2442-2450) and SOURCE_CAPTURES\\PHASE5-001I-A\\classification_record.json' },
  proposed_ceiling_not_adopted: 'PROD-003 crosswalk and candidate_rule_units propose PROBABLE_VIOLATION (never VIOLATION), conditional on the rule record recording the direct-report section 4 retention exception. The condition is not exercised and the owner withholds the proposal, so it is not adopted.',
  effect: 'no consumer-visible output of any class; internal records only',
};

const qualifications = {
  timing: { mandatory: true, text: 'The recorded legal source states the provision as in force but records no commencement date for it. No record in this workspace establishes when this six-year retention provision took effect, or that it applied to this debt at the relevant time. This statement therefore reports what the report prints and what the arithmetic returns; it does not state that the provision applied to the debt, and it makes no claim about statutory timing.' },
  classification: { mandatory: true, text: 'The recorded classification for this provision is observation-only and packet-ineligible. No violation and no probable violation may be asserted or implied from this result.' },
  boundary: { mandatory_when_reached: true, text: 'The reference date is exactly six years after the stated last payment date. The recorded legal text does not state whether that day falls inside or outside the period, so no result is given for this day.' },
  specimen: { mandatory: true, text: 'This result rests on one byte-pinned consumer disclosure and on two printed fields within it. It is not a statement about any other report, product, bureau, print date or format.' },
  effect_of_every_qualification: 'each qualification narrows what may be said; none widens it. All are output restrictions, not findings and not admissions.',
};

const boundaries = [
  'This record is NOT ADMITTED. It admits no rule, creates no coverage and no candidate, authorizes no finding class and changes no gate state corpus-wide.',
  'It finalises nothing beyond this one scope: one jurisdiction, one rule unit, one statutory limb, one byte-pinned presentation, two printed fields.',
  'It used existing materials only: no new legal research, no source retrieval, no source paraphrase, no re-interpretation of the accepted legal authority, no consumer-report retrieval and no OCR.',
  'It produced no consumer-visible output of any class and changed no application behaviour; report checking remains "not yet available".',
  'It does not apply the PHASE5-001P disposition supplement, which stays recorded and unapplied; it edits no register, ledger, crosswalk, catalogue or historical manifest.',
  'It does not decide the effective-period question, the direct-report section 4 exception, the anniversary-boundary legal question or the rule version; each is carried with its own recorded state and its own effect on output.',
];

// ------------------------------------------------------------------ the record
const record = {
  artifact: 'rule_record.json',
  work_order: 'PHASE5-001Q',
  created_utc: '2026-09-30',
  document_type: 'GOVERNED RULE RECORD — one scope only, prepared under Gate 5.4, NOT ADMITTED',
  purpose: 'finalise, for one scope only, the field-by-field governed rule record for CA-NS-CRA-S10-3-C-LIMB-1, so that every required governed field either carries its recorded basis or is recorded as an explicit qualification whose only effect is to restrict output',
  admission_state: {
    state: 'NOT_ADMITTED',
    governed_rule_created: false,
    coverage_created: false,
    candidate_created: false,
    finding_class_created: false,
    admitted_governed_rules_after_this_order: 0,
    permitted_findings_after_this_order: 0,
    consumer_visible: false,
    reachable_from_a_consumer_surface: false,
    admitted_evaluator: false,
    is_gate_evidence_for_gates_5_5_to_5_7: false,
    admission_form: 'RESERVED_TO_GATE_5_7',
    what_would_admit_it: 'a rule-corpus amendment prepared under Phase 5.7 (build plan line ' + phase57.line + '), containing immutable IDs and versions, approved by the owner after Gates 5.1–5.6 pass for this scope',
  },
  scope: {
    scope_id: scopeP.scope_id,
    jurisdiction: scopeP.jurisdiction,
    rule_unit: 'CA-NS-CRA-S10-3-C-LIMB-1',
    limb_in_scope: scopeP.rule_unit.limb_in_scope,
    limb_out_of_scope: scopeP.rule_unit.limb_out_of_scope,
    second_limb_state: 'UNSEATED — excluded from this unit and left unevaluated; it must not be inferred, defaulted or reported as absent or compliant',
    presentation: { presentation_id: scopeP.presentation.presentation_id, artifact_id: scopeP.presentation.artifact_id, publisher: scopeP.presentation.publisher, audience: scopeP.presentation.audience, sha256: scopeP.presentation.sha256, bytes: scopeP.presentation.bytes, pages: scopeP.presentation.pages, admission_boundary: scopeP.presentation.admission_boundary_quoted, secondary_presentation_role: scopeP.presentation.secondary_presentation_role },
    evidence_references: ['SOURCE_CAPTURES\\PROD-003\\report_representation_register.json (presentations[PR-01], FACT-01 to FACT-06)', 'SOURCE_CAPTURES\\PHASE5-001I-A\\extraction_results.json', 'SOURCE_CAPTURES\\PHASE5-001I-C\\owner_representation_decisions.json (D-1 to D-6)', 'SOURCE_CAPTURES\\PHASE5-001I-B\\rule_record_draft.json and CRP_PHASE5_001I_B_INTERNAL_RULE_RECORD_DRAFT.md', 'SOURCE_CAPTURES\\PHASE5-001O\\source_id_coverage_ledger.json row CRP-LSRC-0354', 'SOURCE_CAPTURES\\PHASE5-001P\\scope_definition.json and the two scoped gate verdicts', 'packages\\backend\\src\\services\\legalCorpus\\rules.canada.ts at its recorded digest (read-only, in place)'],
    exclusions: scopeP.exclusions,
  },
  rule_identity: {
    rule_id: 'CA-NS-CRA-S10-3-C-LIMB-1',
    rule_id_is_immutable: true,
    rule_version: 'RESERVED_TO_GATE_5_7',
    legacy_rule_id: 'ca-ns.cra.s10_3_c.debt_retention_6y',
    legacy_export: 'NS_S10_3_C (line 182); timing determination NS_S10_3_C_TIMING (line 564); classification entry at lines 2442-2450',
  },
  legal_proposition: {
    instrument: 'Consumer Reporting Act (Nova Scotia), R.S.N.S. 1989, c. 93',
    provision: 's. 10(3)(c)',
    statutory_text_quoted_verbatim: admittedText,
    source_pin: { source_entry_id: 'CRP-LSRC-0354', artifact: 'packages\\backend\\src\\services\\legalCorpus\\rules.canada.ts', sha256: legacyDigest, bytes: fs.statSync(LEGACY).size, pin: 'OWNER_ACCEPTED_LEGAL_AUTHORITY' },
    proposition: 'A consumer reporting agency shall not include in a consumer report information regarding any debt more than six years after the last payment was made on the debt.',
    what_the_text_states: ['a period of six years', 'a start at the last payment made on the debt', 'a prohibition framed as "more than six years after" that start'],
    what_the_text_does_not_state: ['no day count', 'no rule for computing the anniversary of a 29 February start', 'no statement whether the sixth-anniversary day itself is inside or outside the period', 'no comparison or measuring date', 'no rule for how the excluded second limb interacts with the first'],
    transcription_identity_with_the_accepted_record: transcriptionIdentity,
  },
  applicability: governedFields.find((f) => f.field === 'applicability').value,
  governed_fields: governedFields,
  report_facts: reportFacts,
  deterministic_breach_test: breachTest,
  exceptions,
  classification_and_ceiling: ceiling,
  consumer_citation: governedFields.find((f) => f.field === 'consumer citation').value.citation,
  consumer_facing_qualifications: qualifications,
  unresolved_dependencies_carried: iB['10_output_eligibility_and_every_unresolved_dependency'].unresolved_dependencies,
  decisions_record: 'SOURCE_CAPTURES\\PHASE5-001Q\\rule_record_decisions.json',
  validation_record: 'SOURCE_CAPTURES\\PHASE5-001Q\\transcription_mapping_validation.json',
  scope_gate_5_4_verdict_record: 'SOURCE_CAPTURES\\PHASE5-001Q\\scoped_gate_5_4_verdict.json',
  next_work_order_issued: 'SOURCE_CAPTURES\\PHASE5-001Q\\next_work_order.json (order PHASE5-001R, Gate 5.5, this scope only)',
  boundaries,
  created_by: 'PHASE5-001Q',
};

if (!transcriptionIdentity) { throw new Error('the assembled statutory text does not match the accepted record'); }
write('rule_record.json', record);
console.log('rule_record.json written: governed fields=' + governedFields.length + ' | transcription identical=' + transcriptionIdentity);

