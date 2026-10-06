// build_001r_evaluator_spec.js — PHASE5-001R deliverable 3.
//
// The deterministic evaluator, specified for this unit only: its inputs and nothing else, the fixed gate order,
// the six recorded conventions, the status-resolution precedence, the comparison precedence that checks the
// withheld boundary day BEFORE the "greater than" branch, the decision rules for every unresolved, missing,
// contradictory, unsupported and boundary case, and the emission rules.
//
// The conventions are read out of the governed rule record, so the specification cannot quietly promote a
// convention into a requirement of the text. The arithmetic is recomputed here and matched to the record's own
// measured numbers, so the specification cannot disagree with the record it implements.
//
// Writes only deterministic_evaluator_specification.json inside this order's own package.

const fs = require('fs');
const path = require('path');

const ROOT = 'C:\\CRP-NEW';
const OUT = path.join(ROOT, 'SOURCE_CAPTURES', 'PHASE5-001R');
const readText = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const readJson = (rel) => JSON.parse(readText(rel));

const record = readJson('SOURCE_CAPTURES\\PHASE5-001Q\\rule_record.json');
const decisions = readJson('SOURCE_CAPTURES\\PHASE5-001Q\\rule_record_decisions.json');
const evaluator = require('./evaluator_001r.cjs');

const planLines = readText('CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md').split(/\r?\n/);
const breach = record.deterministic_breach_test;
const measured = breach.arithmetic.measured_on_the_specimen;

// the arithmetic, recomputed rather than restated
const recomputed = evaluator.compare(measured.clock_start, measured.reference_date);
const arithmeticMatches = recomputed.anniversary === measured.anniversary
  && recomputed.span_in_days === measured.span_in_days
  && recomputed.elapsed_days === measured.elapsed_days
  && recomputed.comparison_outcome === measured.outcome;
if (!arithmeticMatches) throw new Error('the specification recomputes the specimen arithmetic differently from the rule record');

const decisionRules = [
  { id: 'R1', precedence: 1, applies_when: 'no country/region selection was supplied', result: evaluator.REFUSALS.NO_JURISDICTION_SELECTION, layer: 'gate chain, G1', carries_an_outcome: false },
  { id: 'R2', precedence: 2, applies_when: 'a selection was supplied and it is not CA / CA-NS', result: evaluator.REFUSALS.JURISDICTION_NOT_THIS_UNIT, layer: 'gate chain, G2', carries_an_outcome: false },
  { id: 'R3', precedence: 3, applies_when: 'the document is not the exact byte-pinned specimen, or carries a named document-level refusal cause', result: evaluator.REFUSALS.UNSUPPORTED_PRESENTATION, layer: 'gate chain, G3', carries_an_outcome: false },
  { id: 'R4', precedence: 4, applies_when: 'the caller declares an event-date mapping other than the recorded one for either role', result: evaluator.REFUSALS.WRONG_EVENT_DATE_MAPPING, layer: 'gate chain, G4', carries_an_outcome: false },
  { id: 'R5', precedence: 5, applies_when: 'the governed rule record is not admitted (the operative state of this scope)', result: evaluator.REFUSALS.RULE_RECORD_NOT_ADMITTED, layer: 'gate chain, G5', carries_an_outcome: false },
  { id: 'R6', precedence: 6, applies_when: 'an input resolving to the excluded second limb, or another unresolved affirmative element, is supplied', result: evaluator.REFUSALS.UNRESOLVED_AFFIRMATIVE_ELEMENT, layer: 'gate chain, G6', carries_an_outcome: false },
  { id: 'S1', precedence: 7, applies_when: 'referenceDate: the header label is not found, or is not on every page', result: evaluator.FACT_STATUS.EXTRACTION_UNRESOLVED, layer: 'status resolution', carries_an_outcome: false },
  { id: 'S2', precedence: 8, applies_when: 'referenceDate: the label is on every page and the printed values are not all identical', result: evaluator.FACT_STATUS.CONTRADICTED, layer: 'status resolution', carries_an_outcome: false },
  { id: 'S3', precedence: 9, applies_when: 'referenceDate: one identical value on every page, well formed and a possible calendar date', result: evaluator.FACT_STATUS.PRESENT, layer: 'status resolution', carries_an_outcome: false },
  { id: 'S4', precedence: 10, applies_when: 'lastPaymentDate: the Collections section was not located or not resolved', result: evaluator.FACT_STATUS.EXTRACTION_UNRESOLVED, layer: 'status resolution', carries_an_outcome: false },
  { id: 'S5', precedence: 11, applies_when: 'lastPaymentDate: the section is resolved and prints no contract debt record', result: evaluator.FACT_STATUS.ABSENT_FROM_REPORT, layer: 'status resolution', carries_an_outcome: false },
  { id: 'S5b', precedence: 0, applies_when: 'lastPaymentDate: the section is resolved, prints no contract debt record, and prints the label outside any contract debt record', result: evaluator.FACT_STATUS.EXTRACTION_UNRESOLVED + ' (FIELD_LABEL_OUTSIDE_ANY_RECORD) — a value is never read outside a record, so the section\'s clean absence reading is not available', layer: 'status resolution', carries_an_outcome: false },
  { id: 'S6', precedence: 12, applies_when: 'lastPaymentDate: a contract debt record prints the label zero times, more than once, or without a value, or with an impossible or malformed value', result: evaluator.FACT_STATUS.EXTRACTION_UNRESOLVED, layer: 'status resolution', carries_an_outcome: false },
  { id: 'S7', precedence: 13, applies_when: 'lastPaymentDate: a contract debt record prints the label exactly once with a well-formed possible printed date', result: evaluator.FACT_STATUS.PRESENT, layer: 'status resolution', carries_an_outcome: false },
  { id: 'C1', precedence: 14, applies_when: 'either fact required by the comparison is not PRESENT', result: 'the comparison does not run: ' + evaluator.COMPARISON_OUTCOME.UNRESOLVED + ', with a reason naming the fact and its status', layer: 'comparison', carries_an_outcome: true },
  { id: 'C2', precedence: 15, applies_when: 'the reference date precedes the stated last-payment date', result: 'UNRESOLVED, reason REFERENCE_DATE_PRECEDES_THE_STATED_LAST_PAYMENT', layer: 'comparison', carries_an_outcome: true },
  { id: 'C3', precedence: 16, applies_when: 'elapsed days EQUAL the derived six-year span (the exact sixth-anniversary day)', result: 'UNRESOLVED with boundary case ' + evaluator.BOUNDARY_CASE.EXACTLY_AT_SIX_YEAR_ANNIVERSARY + '; the outcome is WITHHELD', layer: 'comparison, convention c6', carries_an_outcome: false },
  { id: 'C4', precedence: 17, applies_when: 'elapsed days exceed the derived six-year span', result: evaluator.COMPARISON_OUTCOME.PERIOD_EXCEEDED + ' — an arithmetic result, not a finding', layer: 'comparison, convention c5', carries_an_outcome: true },
  { id: 'C5', precedence: 18, applies_when: 'elapsed days are less than the derived six-year span', result: evaluator.COMPARISON_OUTCOME.PERIOD_NOT_EXCEEDED + ' — an arithmetic result, never a clearance and never a compliance statement', layer: 'comparison, convention c5', carries_an_outcome: true },
];
// the array order above IS the precedence order; the numbers are assigned from it so that inserting a rule
// cannot leave a stale precedence behind
decisionRules.forEach((r, i) => { r.precedence = i + 1; });

const out = {
  artifact: 'deterministic_evaluator_specification.json',
  work_order: 'PHASE5-001R',
  created_utc: '2026-09-30',
  document_type: 'DETERMINISTIC EVALUATOR SPECIFICATION — one scope only. NOT ADMITTED, not wired to any application surface, no emission',
  purpose: 'specify, for this unit only, an evaluator whose every input maps to exactly one outcome or one named refusal, which carries the six recorded conventions including the withheld anniversary day, which refuses on each condition the gate names, and which emits nothing while its rule record is unadmitted',
  governing_text_read: {
    phase_5_5_bullet_deterministic_evaluators: { document: 'CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md', section: 'section 3', line: 134, text: planLines[133] },
    gate_5_5: { document: 'CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md', section: 'section 3', line: 138, text: planLines[137] },
  },
  scope: {
    scope_id: record.scope.scope_id,
    rule_unit: record.scope.rule_unit,
    limb_in_scope: record.scope.limb_in_scope,
    presentation: record.scope.presentation.presentation_id,
    presentation_sha256: record.scope.presentation.sha256,
    exclusions: record.scope.exclusions,
  },
  inputs_and_nothing_else: {
    the_four_inputs: [
      'the caller\'s explicit country/region selection, supplied before the upload and never inferred from the report',
      'the uploaded report\'s resolved facts and the recorded observations they rest on, in the shape SOURCE_CAPTURES\\PHASE5-001R\\report_fact_model.json defines',
      'the caller\'s declared event-date mapping for the two roles',
      'the governed rule record for this unit at its recorded state — read as data, never as an admission',
    ],
    nothing_else_is_read: breach.inputs,
    what_is_explicitly_absent: breach.inputs.length + ' inputs only: no clock, no locale, no time zone, no host, no session state, no network, no file outside the package, no legal research, no parsing, no candidate classification',
    separately_auditable_steps: 'the specification keeps status resolution, comparison, qualification and the gate chain as four separable functions, as the phase bullet requires',
  },
  layers: [
    { layer: 'F1', name: 'resolveFactStatus', does: 'maps recorded observations to one of the gate\'s four statuses; decides nothing legally and compares nothing', record: record.report_facts.extraction_status_vocabulary },
    { layer: 'F2', name: 'compare', does: 'the six-calendar-year comparison on two resolved dates, carrying conventions c1 to c6', record: breach.steps },
    { layer: 'F3', name: 'qualify', does: 'carries the applicability state and every mandatory qualification, read out of the governed rule record', record: record.consumer_facing_qualifications },
    { layer: 'F4', name: 'evaluate', does: 'the fixed gate chain, composing F1 to F3, and the emission decision', record: breach.input_gates },
  ],
  gate_order_is_fixed: {
    order: evaluator.GATE_ORDER,
    rule: 'every gate is evaluated and recorded; the refusal is the FIRST failing gate in this order, so the refusal never depends on which failure happened to be noticed first',
    why_this_order: 'the unit-fit gates come first (selection, jurisdiction, presentation, event-date mapping, then the affirmative-element gate), because they decide whether this unit may read the input at all; the admission gate comes last, because it bounds EMISSION rather than reading. Ordering it this way keeps a deeper refusal observable instead of masking every input behind the one condition that currently holds for every input.',
    gates: breach.input_gates.concat([
      { step: 4, gate: 'event-date mapping', requirement: 'the caller declares exactly the recorded mapping for both roles', refusal: evaluator.REFUSALS.WRONG_EVENT_DATE_MAPPING },
      { step: 5, gate: 'affirmative elements', requirement: 'no input resolves to the excluded second limb and no unresolved affirmative element is supplied', refusal: evaluator.REFUSALS.UNRESOLVED_AFFIRMATIVE_ELEMENT },
      { step: 6, gate: 'rule record admission', requirement: 'the governed rule record is admitted', refusal: evaluator.REFUSALS.RULE_RECORD_NOT_ADMITTED },
    ]),
  },
  conventions: breach.conventions.map((c) => ({
    id: c.id,
    convention: c.convention,
    is_a_requirement_of_the_text: c.is_a_requirement_of_the_text,
    how_the_specification_carries_it: c.id === 'c6'
      ? 'as a withholding rule evaluated BEFORE the comparison branch: the boundary case is reported and no outcome is produced'
      : 'as the arithmetic the comparison is specified to perform, never as a statement about the statutory text',
    adopted_because: c.adopted_because || 'recorded in the governed rule record and decided in ' + decisions.decisions.find((d) => d.id === 'Q-D3').id,
  })),
  boundary_withheld: {
    rule: breach.boundary_treatment.rule,
    effect: breach.boundary_treatment.effect,
    the_internal_comparator_is_not_adopted: breach.boundary_treatment.note,
    how_the_withholding_is_made_deterministic: 'the boundary is an exact date equality on two resolved dates and is evaluated before the greater-than branch, so the withheld day cannot fall into PERIOD_NOT_EXCEEDED by accident of ordering',
  },
  arithmetic_recomputed: {
    method: breach.arithmetic.method,
    clock_start: measured.clock_start,
    reference_date: measured.reference_date,
    anniversary: recomputed.anniversary,
    span_in_days: recomputed.span_in_days,
    elapsed_days: recomputed.elapsed_days,
    comparison_outcome: recomputed.comparison_outcome,
    matches_the_record: arithmeticMatches,
    clamp_exercised_as_arithmetic: evaluator.addCalendarYears('2020-02-29', 6) === '2026-02-28',
    note: 'these are the record\'s own measured numbers, recomputed by this specification\'s arithmetic. They tie the specification to the rule record and to the register\'s demonstration of the same specimen.',
  },
  decision_rules: decisionRules,
  precedence_rules: {
    the_rule: 'the rules are applied in the recorded precedence order and stop at the first that applies, so every input maps to exactly one result',
    boundary_before_greater_than: 'C3 is evaluated before C4 and C5, so the exact sixth-anniversary day can never produce an outcome',
    status_before_comparison: 'no comparison rule is reached unless both facts are PRESENT, so a status can never be read as an outcome',
    no_rule_is_expressible_as_a_finding: 'no rule above returns VIOLATION, PROBABLE_VIOLATION or any other finding class, and none is implemented, emitted or implied for this unit',
  },
  emission_rules: {
    today: 'for every input, the evaluator returns a named refusal and NO outcome, because G5 fails: the governed rule record is NOT ADMITTED. This is the operative state of this scope and the specification says so rather than treating a refusal as an emission.',
    after_any_admission: evaluator.EMISSION.NO_CONSUMER_SURFACE_AND_NO_FINDING_CLASS_AUTHORIZED + ': the ceiling is OBSERVATION_CLASS_ONLY, no finding class is available to this unit, packet eligibility is false and no consumer surface exists, so even a fully admitted input produces an internal observation record only',
    what_may_ever_be_shown: 'nothing. No output of any class may be shown, hosted, transmitted or implied; report checking remains "not yet available".',
  },
  the_recorded_tension_stated_not_resolved: {
    what_the_gate_condition_is: 'the gate\'s own condition is a prohibition — output "cannot emit on ... unapproved rules" — and a prohibition is satisfied by a refusal behaviour that is specified, implemented and tested',
    what_the_phase_bullet_presupposes: 'the phase bullet says evaluators take the report\'s resolved facts "plus admitted rule records". This scope has no admitted rule record: 0 governed rules are admitted and 0 findings are permitted.',
    how_this_specification_treats_it: 'it specifies and tests the refusal behaviour (a named refusal, no outcome) and it records that the emission path on an admitted rule record is not exercised, not demonstrated and not claimed in this scope',
    the_alternative_owner_reading_and_its_smallest_action: 'if the owner reads the phase bullet as requiring an admitted rule record as a precondition for Gate 5.5, then the criterion in question is unmet in this scope and the Gate 5.5 verdict must name it instead of passing it. The smallest action is an owner instrument admitting this unit\'s rule record (Gate 5.7) or an owner reading that settles the question. This specification does not decide it.',
  },
  forbidden_implementations: [
    'no finding class: neither VIOLATION nor PROBABLE_VIOLATION is implemented, emitted, implied or promised, in any circumstance, for any input',
    'no off-report fact: no request, notice, recipient, use, fee, procedure or actor action is read or asked for',
    'no second-limb evaluation: an input resolving to the second limb is refused, never defaulted and never evaluated',
    'no cross-record borrowing: a value is never taken from another record, section or page',
    'no convention promoted to a requirement of the text',
    'no clock, locale, time zone, host or session state is read anywhere in the evaluator',
  ],
  determinism_properties: {
    pure_functions_only: true,
    module_level_mutable_state: false,
    fixed_gate_order: true,
    fixed_status_precedence: true,
    fixed_comparison_precedence: true,
    same_inputs_same_output: 'required, and measured by the internal determinism check on synthetic inputs',
    clock_independence: 'required, and checked by scanning the executable form for clock, locale, time-zone, environment and random-source reads',
    executable_form: 'SOURCE_CAPTURES\\PHASE5-001R\\evaluator_001r.cjs (rank 8, internal, not admitted, not wired to any application surface)',
    evidence_of_this_specification_being_run: 'SOURCE_CAPTURES\\PHASE5-001R\\internal_determinism_check.json (deliverable 5), synthetic inputs only',
  },
  what_this_specification_does_not_do: [
    'it does not admit a rule, create coverage or a candidate, or authorize a finding class',
    'it does not resolve the effective period, the exception, the anniversary-boundary reading or the convention set; each restricts output exactly as the rule record left it',
    'it does not read a report, retrieve a source, paraphrase a source or re-interpret the accepted authority',
    'it does not conform, modify or adopt the internal comparator of PHASE5-001I-A, and in particular it does not adopt that comparator\'s treatment of the exact sixth-anniversary day',
    'it produces no consumer-visible output and changes no application behaviour',
  ],
  created_by: 'PHASE5-001R',
};

fs.writeFileSync(path.join(OUT, 'deterministic_evaluator_specification.json'), JSON.stringify(out, null, 2) + '\n', 'utf8');
console.log('deterministic_evaluator_specification.json written: rules ' + out.decision_rules.length + ' | conventions ' + out.conventions.length + ' | arithmetic matches the record: ' + out.arithmetic_recomputed.matches_the_record);
