// build_001q_decisions.js — PHASE5-001Q deliverable 2.
//
// Records each of the six outstanding rule-record decisions that PHASE5-001P's issued work order names,
// with: the decision or the retained qualification, the supporting authority or evidence, the effect on
// evaluation, the effect on output eligibility, and whether it satisfies the applicable Gate 5.4 criterion
// (the controlling criterion is quoted, so the reading can be checked rather than trusted).
//
// Where the evidence cannot settle a decision, this record does not invent an answer: it records the
// qualification and states whether Gate 5.4 permits it for this observation-only scope, with the criterion
// that controls that question.
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = 'C:\\CRP-NEW';
const OUT = path.join(ROOT, 'SOURCE_CAPTURES', 'PHASE5-001Q');
const readText = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const readJson = (p) => JSON.parse(readText(p));
const LOC = (t, needle) => {
  const ls = t.split(/\r?\n/);
  const i = ls.findIndex((l) => l.includes(needle));
  if (i < 0) throw new Error('clause not found: ' + needle);
  return { line: i + 1, text: ls[i].trim() };
};
const write = (n, o) => fs.writeFileSync(path.join(OUT, n), JSON.stringify(o, null, 2) + '\n', 'utf8');

const PLAN = 'CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md';
const planText = readText(PLAN);
const gateSentence = LOC(planText, '**Gate 5.4:**');
const bulletGovernedFields = LOC(planText, 'For every selected unit record the required governed fields');
const bulletLegacyReuse = LOC(planText, 'Reuse the certified legacy legal corpus for its admitted legal content.');
const ruling001O = LOC(planText, 'Under owner directive PHASE5-001O a source whose formal edition');
const phase57 = LOC(planText, 'Prepare a rule-corpus amendment containing only rules that passed Gates 5.1–5.6');
const scopedParagraph = LOC(planText, '**Owner authority PHASE5-001P — scoped gate verdicts and incremental rule-unit progression.**');
const scopedCannotMeet = LOC(planText, 'satisfy a criterion; where a criterion cannot be met within a scope');

const iC = readJson('SOURCE_CAPTURES\\PHASE5-001I-C\\owner_representation_decisions.json');
const iB = readJson('SOURCE_CAPTURES\\PHASE5-001I-B\\rule_record_draft.json');
const order = readJson('SOURCE_CAPTURES\\PHASE5-001P\\next_work_order.json');
const CONTRACT = readText('CRP_DIRECT_REPORT_CONTENT_SOURCE_EXPANSION_CONTRACT.md');
const contractLine = LOC(CONTRACT, 'external event, unless the only unresolved fact is that underlying historical event');
// The section 7 route sentence is wrapped across two source lines, so it is captured as a span and joined,
// never retyped: the citation below then cites the exact lines the sentence occupies.
const contractLines = CONTRACT.split(/\r?\n/);
if (!contractLines[327].includes('applies only after a') || !contractLines[328].includes('later governed rule is admitted')) {
  throw new Error('the section 7 report-assertion route is not at lines 328-329 as recorded');
}
const directReportS7 = {
  line: 328,
  end_line: 329,
  text: (contractLines[327].trim() + ' ' + contractLines[328].trim()),
};
// Every owner decision this order resolves or carries must exist in the accepted PHASE5-001I-C record,
// so a decision cited below can never silently refer to a decision the owner never made.
const ownerDecisionIds = iC.decisions.map((x) => x.id);
for (const rid of ['D-1', 'D-2', 'D-3', 'D-4', 'D-5', 'D-6']) {
  if (!ownerDecisionIds.includes(rid)) {
    throw new Error('owner decision ' + rid + ' is missing from owner_representation_decisions.json');
  }
}


const gate54Criteria = {
  trace: 'each proposed rule has a complete field-by-field trace to the owner-approved source',
  jurisdiction_limb: 'exact jurisdiction/limb',
  no_unresolved_element: 'no unresolved affirmative element',
  deterministic_test: 'a deterministic test',
  independent_validation: 'Independent validation verifies faithful transcription and mapping to the accepted legal record; it does not repeat the owner\'s legal/source certification.',
  hold_contradiction: 'A concrete contradiction or change indicator is held for owner/legal direction rather than guessed.',
};
const criterion = (id, quoted, controlling, satisfied, why) => ({ criterion_id: id, criterion_quoted: quoted, controlling_text: controlling, satisfied, why });



const decisions = [
  {
    id: 'Q-D1',
    asked_in_the_order: 'the admitted rule record\'s required field name per owner decision D-2 (collection.lastPaymentDate) and whether the legacy required-field name is amended',
    decision: 'The admitted rule record\'s required field name is collection.lastPaymentDate, the collection-scoped fact the evidenced presentation prints inside its own Collections contract debt record. The legacy required-field name tradeline.lastPaymentDate is NOT amended by this order: it stays recorded in the admitted artifact exactly as it is, and the divergence is recorded field by field rather than erased by relabelling.',
    decision_class: 'DECIDED_FROM_OWNER_DECISION_D-2_WITH_ONE_ITEM_RESERVED',
    supporting_authority_or_evidence: [
      'owner decision D-2 (PHASE5-001I-C): "Use collection.lastPaymentDate for the printed Last Payment Date within its own Collections record. Do not relabel it as a tradeline fact. Record the legacy field-name divergence explicitly."',
      'the owner instruction authorising this order: use collection.lastPaymentDate as the collection-scoped fact and do not silently relabel it as a tradeline field',
      'PROD-003 register FACT-02: the printed label "Last Payment Date" inside a collection record, page 16 line 32 and page 17 line 5, value 2021/02/01',
      'the admitted artifact\'s own requiredReportFields at line 189: ["tradeline.lastPaymentDate"], and its recorded schema statement that a collection carries no such field',
      'PHASE5-001I-B draft section 4: both seating routes recorded and neither chosen, with the routing left to the owner at admission',
    ],
    effect_on_evaluation: [
      'the unit reads one report-stated date per contract debt record, bound to that record and to no other; it never borrows a value from another record, section or page',
      'the comparison runs on that fact and on the convention reference date only',
      'no evaluation may treat the printed collection field as the admitted tradeline field, and none may treat the fact as missing because the schema names a tradeline',
    ],
    effect_on_output_eligibility: [
      'the record stays NOT ADMITTED; the seating of the printed field against the legacy required-field name is carried as an admission question',
      'whatever the seating answer, no finding of either class may be produced (ceiling OBSERVATION_CLASS_ONLY)',
    ],
    gate_5_4_criterion: criterion('G54-1', gate54Criteria.trace,
      { instrument: PLAN, locator: 'section 3, Gate 5.4, line ' + gateSentence.line },
      true,
      'the fact the rule reads traces to the owner-approved source (the admitted text\'s own words "the last payment was made on the debt") and to a located printed field in the representation register. The trace is complete; what is recorded alongside it is a naming divergence inside the legacy schema, which this order records instead of resolving by relabelling.'),
    smallest_action_before_admission: 'at Gate 5.7 the owner either seats the printed collection field as the representation of the required fact, or amends the legacy required-field name by rule-corpus amendment, or records that the first limb has no admitted representation on this presentation.',
  },
];

decisions.push({
  id: 'Q-D2',
  asked_in_the_order: 'the effective-period handling (effectiveFrom and effectiveTo null, status in_force, basis recorded_gap_commencement_not_read) and the exact wording of the mandatory plain-English timing qualification',
  decision: 'RETAINED, NOT RESOLVED, AND QUALIFIED. The effective-period fields stay exactly as the accepted record holds them, effective_dates_status stays UNRESOLVED_MISSING_EVIDENCE, and the mandatory plain-English timing qualification is recorded verbatim for the rule record to carry on any statement this unit could ever produce.',
  decision_class: 'RETAINED_QUALIFICATION_PERMITTED_BY_THE_CONTROLLING_DIRECTIVE',
  timing_qualification_text_carried: 'The recorded legal source states the provision as in force but records no commencement date for it. No record in this workspace establishes when this six-year retention provision took effect, or that it applied to this debt at the relevant time. This statement therefore reports what the report prints and what the arithmetic returns; it does not state that the provision applied to the debt, and it makes no claim about statutory timing.',
  supporting_authority_or_evidence: [
    'coverage ledger row CRP-LSRC-0354: effectiveFrom=null; effectiveTo=null; status=in_force; basis=recorded_gap_commencement_not_read; source_locator NOT RECORDED',
    'build plan section 2.1 item 1 as amended by PHASE5-001O (line ' + ruling001O.line + '): a source whose formal edition, historical version or prior-review record is not recorded is not rejected for that reason — the digest-bound accepted source is the pin and the missing record is an administrative limitation',
    'owner decision PHASE5-001I-C and the owner instruction authorising this order: missing historical provenance is not a reason to reject accepted statutory authority, and operational uncertainty must remain explicit and restrict output rather than be filled with invented facts',
    'PROD-003 dependency D-4 and section 7.4: a plain-English timing qualification is required',
    'PHASE5-001I-B draft section 7: effective_dates_status must not be defaulted to a commencement, a version or "in force at all material times"',
  ],
  effect_on_evaluation: [
    'the arithmetic still runs: the admitted text states the period and the start, and the record supplies the start and the period only',
    'no evaluation, status or outcome may assert that the provision applied, applies or did not apply to this debt, or that a period ran from any particular statutory commencement',
    'an unqualified conclusion is prohibited',
  ],
  effect_on_output_eligibility: [
    'the timing qualification is mandatory on every statement the unit could ever produce',
    'the record remains NOT ADMITTED, so no output of any class is produced today',
  ],
  gate_5_4_criterion: criterion('G54-3', gate54Criteria.no_unresolved_element,
    { instrument: PLAN, locator: 'section 3, Gate 5.4, line ' + gateSentence.line + '; section 2.1 item 1 as amended, line ' + ruling001O.line },
    true,
    'the criterion is "no unresolved affirmative ELEMENT", and the effective period is not an affirmative element of the first limb\'s breach test: the elements are a debt, a report-stated last payment date, the report\'s inclusion of that debt, and elapsed time measured from that date. The question the effective period raises is temporal applicability — a qualification on any conclusion — and the controlling directive says a missing historical or effective record is an administrative limitation to state with the result rather than a ground to reject the accepted source. The qualification therefore restricts output instead of being filled with an invented commencement.'),
  smallest_action_before_admission: 'record the provision\'s commencement or otherwise determine its temporal applicability for the relevant event, or accept the mandatory qualification for the admitted record. If the owner instead reads Phase 5.4 bullet 2 (line ' + bulletLegacyReuse.line + ') as compelling retrieval for an identified missing detail, the smallest action is an owner order authorising that retrieval; this order was expressly forbidden it.',
});

decisions.push({
  id: 'Q-D3',
  asked_in_the_order: 'the anniversary-boundary convention, the month-end clamp for a 29 February start, and the derived day-count convention, all as conventions and none presented as a requirement of the text',
  decision: 'FIVE ARITHMETIC CONVENTIONS RECORDED AS CONVENTIONS, AND THE BOUNDARY DAY WITHHELD. The anniversary is the clock start plus six calendar years by calendar addition; a 29 February start clamps to 28 February in a non-leap sixth year; the six-year span in days is derived from the two dates and never hard-coded; elapsed time is measured in whole days from the clock start to the reference date; the period is exceeded when elapsed days exceed the span. The legal question the text leaves open — whether the sixth-anniversary day is inside or outside "more than six years after" — is NOT decided: on that one day the comparison withholds its outcome and reports the boundary case.',
  decision_class: 'CONVENTIONS_RECORDED_AND_ONE_LEGAL_QUESTION_QUALIFIED_RATHER_THAN_GUESSED',
  supporting_authority_or_evidence: [
    'the admitted text states six years and a start and nothing else about computation: no day count, no leap-day rule, no statement whether the sixth-anniversary day is inside or outside the period, and no comparison date',
    'PHASE5-001I-B draft section 6: each convention listed separately from the requirements of the text, with the boundary question reserved',
    'owner decision D-3 and the owner instruction authorising this order: do not present implementation conventions as established legal requirements, and keep operational uncertainty explicit so that it restricts output',
    'the internal comparator measures 1,919 elapsed days against a 2,191-day span on the specimen, so no outcome on this specimen depends on the boundary treatment',
  ],
  effect_on_evaluation: [
    'the arithmetic is a pure function of two resolved dates and the recorded conventions; no clock, locale, time zone, host or session state is read',
    'on the exact anniversary day the comparison emits no PERIOD_EXCEEDED and no PERIOD_NOT_EXCEEDED; it reports BOUNDARY_CASE_EXACTLY_AT_SIX_YEAR_ANNIVERSARY with comparison_outcome UNRESOLVED',
    'the internal comparator\'s present treatment of that day as inside the period is NOT adopted by this record, and no result resting on it at the boundary may be relied on; conforming an evaluator to this record is Gate 5.5 work',
  ],
  effect_on_output_eligibility: [
    'a convention may never be presented as a requirement of the text, and a requirement of the text may never be replaced by a convention',
    'PERIOD_EXCEEDED remains an arithmetic outcome and not a finding, and the ceiling stays observation-class only',
  ],
  gate_5_4_criterion: criterion('G54-4', gate54Criteria.deterministic_test,
    { instrument: PLAN, locator: 'section 3, Gate 5.4, line ' + gateSentence.line + '; the scoped-progression paragraph, line ' + scopedParagraph.line },
    true,
    'the test is deterministic in the gate\'s sense: every input maps to exactly one outcome, including the withheld boundary day, which is decided by an exact date equality and not by discretion. The legal characterization of the boundary day is not part of the arithmetic, so leaving it undecided does not make the test indeterminate. The owner instruction requires that unresolved operational questions restrict output rather than be filled with an invented fact, which is exactly what convention c6 does; where a criterion could not be met within the scope, the scoped-progression paragraph (line ' + scopedCannotMeet.line + ') would require this verdict to name it instead of passing.'),
  smallest_action_before_admission: 'confirm or replace each convention, and decide the boundary reading, at admission; until then no outcome may be relied on for the exact anniversary day.',
});


decisions.push({
  id: 'Q-D4',
  asked_in_the_order: 'the exception determination, including whether the direct-report contract section 4 retention route is ever relied on, and the divergence between that route and the recorded legacy D3 conclusion',
  decision: 'NO EXCEPTION DETERMINATION IS MADE, AND THE SECTION 4 RETENTION ROUTE IS NEVER RELIED ON. The exception is recorded verbatim and marked RECORDED, NOT RELIED ON, because the route it opens requires a later governed rule admitted with complete required fields and official source evidence, and no governed rule is admitted. The recorded legacy D3 / REPORT_RELEVANT_BUT_NOT_DETECTABLE / observation / packet-ineligible classification is retained unchanged, the divergence between the two readings is recorded and not resolved, and no exception is treated as absent.',
  decision_class: 'RETAINED_QUALIFICATION_WITH_NO_DETERMINATION',
  supporting_authority_or_evidence: [
    'CRP_DIRECT_REPORT_CONTENT_SOURCE_EXPANSION_CONTRACT.md (rank 4), section 4, first exclusion, line ' + contractLine.line + ': "limitation, accrual, debt-enforcement, or retention rules whose legal clock requires proving a true external event, unless the only unresolved fact is that underlying historical event and the rule satisfies the report-assertion probable-finding gate in Sections 6 and 7"',
    'the same contract, section 7, lines ' + directReportS7.line + '-' + directReportS7.end_line + ': the report-assertion route ' + JSON.stringify(directReportS7.text) + ', so the route is available only after a later governed rule is admitted, and none is',
    'the admitted legacy artifact\'s CANADA_RULE_CLASSIFICATION_RECORDS entry (lines 2442-2450): REPORT_RELEVANT_BUT_NOT_DETECTABLE, with "The row stands at D3", permittedConclusion "observation", packet-ineligible',
    'owner decision D-5 and the owner instruction authorising this order: retain D3 / observation and packet ineligibility; neither PROBABLE_VIOLATION nor VIOLATION is authorized',
    'PROD-003 dependency D-5: only the owner\'s rule-corpus amendment can settle which ceiling governs',
  ],
  effect_on_evaluation: [
    'no exception is relied on, so no exception can widen what the unit may conclude',
    'no exception is treated as absent either: the second limb\'s conditions are recorded as unseated on this presentation and are not inferable from First Delinquency, Date Assigned or any other printed date',
    'the divergence is carried as a recorded limitation on any statement',
  ],
  effect_on_output_eligibility: [
    'the ceiling stays observation-class with no finding of either class; the PROBABLE_VIOLATION ceiling PROD-003 proposed conditionally is not adopted',
    'a later change needs a new owner instrument; a rank-6 order cannot create a finding class, and this order creates none',
  ],
  gate_5_4_criterion: criterion('G54-3', gate54Criteria.no_unresolved_element,
    { instrument: PLAN, locator: 'section 3, Gate 5.4, line ' + gateSentence.line + '; section 2.1 item 5' },
    true,
    'an exception is not an affirmative element of the rule, and the gate\'s resolution requirement is stated for affirmative elements only. The stricter exception rule the plan states — an unknown exception may not be silently treated as absent for a VIOLATION — is satisfied by recording the exception explicitly and by authorizing no VIOLATION at all. The unresolved exception therefore restricts output rather than being guessed, which is what the owner instruction requires.'),
  smallest_action_before_admission: 'an owner determination of the section 4 exception, or an owner rule-corpus amendment that settles which ceiling governs; until one exists the ceiling remains observation-class.',
});

decisions.push({
  id: 'Q-D5',
  asked_in_the_order: 'the ceiling field, carrying D-5\'s observation-class decision and the retained D3 classification',
  decision: 'The record carries permitted_result_ceiling = OBSERVATION_CLASS_ONLY, an empty finding_classes_available list, and the retained classification block: determinability D3, recorded conclusion REPORT_RELEVANT_BUT_NOT_DETECTABLE, permitted conclusion observation, packet eligibility ineligible.',
  decision_class: 'DECIDED_FROM_OWNER_DECISION_D-5',
  supporting_authority_or_evidence: [
    'owner decision D-5 (PHASE5-001I-C): "Retain D3 / observation classification and packet ineligibility. Neither PROBABLE_VIOLATION nor VIOLATION is authorized."',
    'the owner instruction authorising this order: retain D3 / observation classification and packet ineligibility; neither PROBABLE_VIOLATION nor VIOLATION is authorized',
    'the admitted legacy artifact\'s classification entry at lines 2442-2450 and SOURCE_CAPTURES\\PHASE5-001I-A\\classification_record.json',
    'the build plan\'s Phase 5.7 bullet on updating coverage and finding counts only from admitted rule records, and the recorded counts of 0 admitted rules and 0 permitted findings',
  ],
  effect_on_evaluation: [
    'the arithmetic may run internally, and its outcome is never rendered as a finding: no status and no comparison outcome may be presented as VIOLATION, PROBABLE_VIOLATION or any other finding class',
    'no packet, dossier or report output may be produced for this unit',
  ],
  effect_on_output_eligibility: [
    'the ceiling is a restriction on output, not a permission: no consumer-visible output of any class exists today',
    'the record remains NOT ADMITTED, and the application still reports report checking as not yet available',
  ],
  gate_5_4_criterion: criterion('G54-3', gate54Criteria.no_unresolved_element,
    { instrument: PLAN, locator: 'section 3, Gate 5.4, line ' + gateSentence.line + '; the scoped-progression paragraph, line ' + scopedParagraph.line },
    true,
    'the ceiling field does not resolve an element of the rule; it bounds what the unit may ever say. Recording it satisfies the gate by construction, because the gate asks what the proposed rule contains and what its test is, and a ceiling that authorizes no finding class cannot make an unresolved non-element decisive. The scoped-progression paragraph separately forbids a scoped verdict from authorizing a finding class, and this record authorizes none.'),
  smallest_action_before_admission: 'an owner instrument is required to change the ceiling; until then it stays observation-class only and packet-ineligible.',
});

decisions.push({
  id: 'Q-D6',
  asked_in_the_order: 'the immutable rule version string and the admission form, both reserved to Gate 5.7',
  decision: 'RESERVED TO GATE 5.7, AND RECORDED AS A RESERVATION. The record carries rule_version = RESERVED_TO_GATE_5_7 with rule_version_is_a_placeholder = true, admission_form = RESERVED_TO_GATE_5_7, and admission_state NOT_ADMITTED. No version string is invented, and no admission is prepared.',
  decision_class: 'RECORDED_RESERVATION_PERMITTED_BY_THE_GATE_SEQUENCE',
  supporting_authority_or_evidence: [
    'the work order that issued this order (SOURCE_CAPTURES\\PHASE5-001P\\next_work_order.json, deliverable 1): "immutable RULE_ID; RULE_VERSION as a placeholder reserved to Gate 5.7"',
    'Phase 5.7, line ' + phase57.line + ': "Prepare a rule-corpus amendment containing only rules that passed Gates 5.1–5.6, with immutable IDs/versions and full provenance."',
    'the build plan\'s Gate 5.7 bullet: "at least one complete rule unit has been formally admitted and its evaluator passes the validation suite" — admission is a Gate 5.7 act, so no earlier order may assign the version',
    'the scope-and-ceiling records of PHASE5-001I-C and PHASE5-001P: 0 admitted governed rules and 0 permitted findings, unchanged by this order',
  ],
  effect_on_evaluation: [
    'nothing: the arithmetic does not depend on the version string, and no evaluator may be built from an unadmitted record',
    'an evaluator implemented before admission may not cite this record as an admitted rule; the internal comparator remains an unadopted rank-8 artifact',
  ],
  effect_on_output_eligibility: [
    'no admission is prepared and no output of any class is produced',
    'the version string and the admission form are the two fields a Gate 5.7 order must fill',
  ],
  gate_5_4_criterion: criterion('G54-1', gate54Criteria.trace,
    { instrument: PLAN, locator: 'section 3, Phase 5.4 bullet 3, line ' + bulletGovernedFields.line + '; Phase 5.7, line ' + phase57.line },
    true,
    'the gate requires the field to be recorded, not assigned: "record the required governed fields: immutable rule ID/version". The version is recorded with the authority that reserves it, which is the gate sequence itself and the issuing work order. Assigning a version here would be an admission act that Phase 5.7 reserves to the owner, so the reservation is the recording that the gate requires.'),
  smallest_action_before_admission: 'at Gate 5.7, assign the immutable version string and prepare the rule-corpus amendment naming this unit, after Gates 5.5 and 5.6 pass for this scope.',
});


const out = {
  artifact: 'rule_record_decisions.json',
  work_order: 'PHASE5-001Q',
  created_utc: '2026-09-30',
  document_type: 'The six outstanding rule-record decisions, resolved from existing evidence and the owner decisions, or retained as explicit qualifications with the criterion that permits them',
  purpose: 'record each of the six decisions the issuing work order names, so that no required field is left ambiguous, no unresolved item is hidden, and every retained uncertainty states its effect on evaluation and on output eligibility together with the Gate 5.4 criterion it satisfies',
  rules_of_this_record: [
    'evidence and the owner decisions settle what they settle; nothing is decided by inference',
    'a field being populated is never treated as the decision being resolved',
    'no effective date is invented, and no implementation convention is presented as a requirement of the accepted text',
    'a retained qualification is permitted only where a criterion of Gate 5.4 or the controlling owner directive allows it, and the criterion is quoted',
  ],
  criteria_used: gate54Criteria,
  gate_criteria_reference: { instrument: PLAN, gate_5_4_text_locator: 'section 3, Gate 5.4, line ' + gateSentence.line, gate_5_4_text_quoted: gateSentence.text },
  decisions,
  decision_outcome_summary: {
    decided_from_evidence_and_owner_decisions: decisions.filter((x) => x.decision_class.indexOf('DECIDED') === 0).map((x) => x.id),
    retained_as_recorded_qualifications: decisions.filter((x) => x.decision_class.indexOf('RETAINED') === 0).map((x) => x.id),
    conventions_recorded_and_one_legal_question_withheld: decisions.filter((x) => x.decision_class.indexOf('CONVENTIONS') === 0).map((x) => x.id),
    reserved_to_gate_5_7: decisions.filter((x) => x.decision_class.indexOf('RECORDED_RESERVATION') === 0).map((x) => x.id),
    decisions_that_failed_their_gate_5_4_criterion: decisions.filter((x) => x.gate_5_4_criterion.satisfied !== true).map((x) => x.id),
    count: decisions.length,
  },
  what_this_record_does_not_do: [
    'it does not decide any legal question the evidence leaves open, and it does not treat a populated field as a resolved decision',
    'it does not invent an effective date, a version string or a comparison convention of its own',
    'it does not rely on the direct-report section 4 retention route or create a finding class',
    'it does not admit a rule, create coverage or a candidate, or change any corpus-wide gate state',
  ],
  boundaries: 'Every qualification here narrows what the unit may say. None of them widens it, and none of them is a finding, a coverage claim or an admission.',
  created_by: 'PHASE5-001Q',
};

if (decisions.length !== 6) { throw new Error('expected six decisions, found ' + decisions.length); }
write('rule_record_decisions.json', out);
console.log('rule_record_decisions.json written: ' + decisions.length + ' decisions | unsatisfied criteria: ' + out.decision_outcome_summary.decisions_that_failed_their_gate_5_4_criterion.length);

