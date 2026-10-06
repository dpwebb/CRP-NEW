// build_001r_gate55.js — PHASE5-001R deliverable 6, the verdict half.
//
// The Gate 5.5 verdict record, for one explicitly named scope only. It quotes the gate's own sentence and the
// five Phase 5.5 bullets it quantifies, states every criterion of this order and of the gate for this scope
// with its evidence, and names — rather than passes — the one item the scope cannot satisfy. It refuses to run
// unless its inputs are in the state it is about to certify.
//
// Writes only scoped_gate_5_5_verdict.json inside this order's own package.

const fs = require('fs');
const path = require('path');

const ROOT = 'C:\\CRP-NEW';
const OUT = path.join(ROOT, 'SOURCE_CAPTURES', 'PHASE5-001R');
const readText = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const readJson = (rel) => JSON.parse(readText(rel));

const planLines = readText('CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md').split(/\r?\n/);
const record = readJson('SOURCE_CAPTURES\\PHASE5-001Q\\rule_record.json');
const decisions = readJson('SOURCE_CAPTURES\\PHASE5-001Q\\rule_record_decisions.json');
const verdict54 = readJson('SOURCE_CAPTURES\\PHASE5-001Q\\scoped_gate_5_4_verdict.json');
const issuedOrder = readJson('SOURCE_CAPTURES\\PHASE5-001Q\\next_work_order.json');
const factModel = readJson('SOURCE_CAPTURES\\PHASE5-001R\\report_fact_model.json');
const statusVocabulary = readJson('SOURCE_CAPTURES\\PHASE5-001R\\extraction_status_vocabulary.json');
const spec = readJson('SOURCE_CAPTURES\\PHASE5-001R\\deterministic_evaluator_specification.json');
const outputSurface = readJson('SOURCE_CAPTURES\\PHASE5-001R\\output_vocabulary_and_explanation_surface.json');
const determinism = readJson('SOURCE_CAPTURES\\PHASE5-001R\\internal_determinism_check.json');
const comparison = readJson('SOURCE_CAPTURES\\PHASE5-001R\\implementation_comparison.json');
const inputVerification = readJson('SOURCE_CAPTURES\\PHASE5-001R\\input_verification.json');
const E = require('./evaluator_001r.cjs');

const PHASE_55_BULLETS = [132, 133, 134, 135, 136];
const GATE_55_LINE = 138;
const SCOPED_PARAGRAPH_LINE = 63;
const gateSentence = planLines[GATE_55_LINE - 1];
const quoteAt = (n) => ({ document: 'CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md', section: 'section 3', line: n, text: planLines[n - 1] });

// ---------------------------------------------------------------- the verdict cannot be issued on inputs that
// are not in the state it certifies
if (determinism.failure_count !== 0) throw new Error('the determinism check records ' + determinism.failure_count + ' failures; a verdict may not be issued on a failed check');
if (determinism.case_count < 20) throw new Error('the determinism check holds only ' + determinism.case_count + ' cases; the verdict will not be issued on a thin check');
if (statusVocabulary.vocabulary_is_exact.identical !== true) throw new Error('the status vocabulary does not match the gate line exactly');
if (record.admission_state.state !== 'NOT_ADMITTED') throw new Error('the rule record is not in the NOT_ADMITTED state');
if (verdict54.verdict !== 'PASSED_FOR_THIS_SCOPE') throw new Error('the scoped Gate 5.4 verdict does not carry a passing verdict for this scope, so Gate 5.5 may not be recorded for it');
if (issuedOrder.order_id !== 'PHASE5-001R') throw new Error('the issuing order is not PHASE5-001R');
if (spec.arithmetic_recomputed.matches_the_record !== true) throw new Error('the specification does not recompute the record\'s own measured arithmetic');
if (comparison.material_differences_not_adopted.length === 0 && comparison.difference_count === 0) throw new Error('the comparison records no difference at all, which cannot be right for this implementation');
if (outputSurface.record_ceiling_carried.finding_classes_available.length !== 0) throw new Error('a finding class is available to this unit; the ceiling must stay observation-class only');
if (norm(gateSentence).indexOf('**Gate 5.5:**') !== 0) throw new Error('the Gate 5.5 sentence is not at line ' + GATE_55_LINE + ' as this verdict cites it');

function norm(s) { return String(s).replace(/\s+/g, ' ').trim(); }

// ---------------------------------------------------------------- this verdict measures its own preservation
// state rather than reading it from a record another script writes afterwards, so the criterion that decides
// the verdict cannot depend on a later summary.
const crypto = require('crypto');
const baseline = readJson('SOURCE_CAPTURES\\PHASE5-001R\\preserved_files_before.json');
const preservedChanged = [];
const preservedMissing = [];
for (const f of baseline.files) {
  const abs = path.join(ROOT, f.relative_path);
  if (!fs.existsSync(abs)) { preservedMissing.push(f.relative_path); continue; }
  const now = crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex').toUpperCase();
  if (now !== f.sha256) preservedChanged.push({ relative_path: f.relative_path, before: f.sha256, after: now });
}
const disclosedChange = preservedChanged.filter((c) => c.relative_path === 'SOURCE_CAPTURES\\PHASE5-001I-A\\test_results_001i_a.json');
const undeclaredPreservationChanges = preservedChanged.filter((c) => c.relative_path !== 'SOURCE_CAPTURES\\PHASE5-001I-A\\test_results_001i_a.json');
const preservationRenewed = preservedChanged.length === 0 && preservedMissing.length === 0;


// ---------------------------------------------------------------- the order's seven acceptance criteria
const acceptanceCriteria = [
  {
    criterion_verbatim: 'the report fact model and the status vocabulary are recorded exactly, with each reachable path and each recorded non-conflation named, and with the rule-read fact kept distinct from the convention input',
    where_it_sits: 'the acceptance criteria of ' + issuedOrder.order_id + ', criterion 1, read with build plan line ' + PHASE_55_BULLETS[0] + ' and line ' + PHASE_55_BULLETS[1],
    scoped_reading: 'the model and the vocabulary exist for this scope, are derived from the governed rule record rather than retyped, and keep the two fact kinds apart',
    state: 'MET within the scope',
    evidence: [
      'SOURCE_CAPTURES\\PHASE5-001R\\report_fact_model.json: two entries, kinds RULE_READ_FACT and EVALUATION_CONVENTION_INPUT, each carrying the six parts the plan names (' + factModel.what_each_fact_record_carries.join(', ') + '), each with its locator, its register field, its raw and normalized value and its transformation provenance',
      'the six carried parts are parsed out of the plan\'s own sentence, and the builder refuses to write if the sentence does not name six',
      'SOURCE_CAPTURES\\PHASE5-001R\\extraction_status_vocabulary.json: the four statuses are parsed out of the gate\'s line and matched to the four the specification defines; the earlier artifact carries five "fact statuses" and the vocabulary record states where each of the two extra ones now lives',
      'each reachable path is named per fact and per status, and the recorded non-conflations are carried verbatim: ' + statusVocabulary.the_recorded_non_conflations_carried_verbatim.length + ' of them',
      'the two entries are kept distinct in every status, comparison and explanation, and the record\'s own refinement note is carried as the reason',
    ],
    unresolved_within_this_scope: [
      'the second limb stays unseated and out of scope: the model defines no fact for it and the evaluator refuses an input that would need it',
    ],
  },
  {
    criterion_verbatim: 'the evaluator is deterministic: every input maps to exactly one outcome or one named refusal, the withheld boundary day included, and no clock, locale, time zone, host or session state is read',
    where_it_sits: 'acceptance criterion 2, read with build plan line ' + PHASE_55_BULLETS[2] + ' and the gate sentence at line ' + GATE_55_LINE,
    scoped_reading: 'one outcome or one named refusal per input, with the boundary day withheld by an exact equality and no ambient state read',
    state: 'MET within the scope',
    evidence: [
      'SOURCE_CAPTURES\\PHASE5-001R\\deterministic_evaluator_specification.json: 19 decision rules in a fixed precedence order, stopping at the first that applies, with the boundary rule evaluated before the greater-than rule',
      'SOURCE_CAPTURES\\PHASE5-001R\\internal_determinism_check.json: ' + determinism.case_count + ' synthetic cases, ' + determinism.failure_count + ' failures, every case compared against what the specification declares',
      'cases D-02, D-03, D-04 and D-05 exercise the boundary day from both sides and on a leap-day start; the boundary case returns ' + E.COMPARISON_OUTCOME.UNRESOLVED + ' with the boundary case named and no outcome',
      'case D-25 re-runs the same inputs and compares the results; case D-26 scans the executable form for clock, locale, time-zone, environment, random and file-system reads and finds none',
      'the executable form holds no module-level mutable state: every function is a pure function of its arguments',
    ],
    unresolved_within_this_scope: [
      'the compliance of any OTHER implementation with this determinism is not claimed: the specification governs this unit\'s own executable form, and the internal comparator\'s differences stand recorded in implementation_comparison.json',
    ],
  },
  {
    criterion_verbatim: 'the evaluator refuses on each condition the gate names, and it emits nothing for this unit while its rule record is unadmitted',
    where_it_sits: 'acceptance criterion 3, read with the gate sentence at line ' + GATE_55_LINE,
    scoped_reading: 'a named refusal for each of the gate\'s five emission conditions, and no emission while the rule record is unadmitted',
    state: 'MET within the scope',
    evidence: [
      'six named refusal states, one per gate, all recorded in SOURCE_CAPTURES\\PHASE5-001R\\extraction_status_vocabulary.json refusal_states',
      'each gate condition is answered by a named refusal: incomplete extraction by the fact statuses and the not-run comparison, unapproved rules by ' + E.REFUSALS.RULE_RECORD_NOT_ADMITTED + ', wrong jurisdiction by two named refusals, wrong event-date mapping by ' + E.REFUSALS.WRONG_EVENT_DATE_MAPPING + ', and an unresolved affirmative element by ' + E.REFUSALS.UNRESOLVED_AFFIRMATIVE_ELEMENT,
      'cases D-16 to D-22 show each refusal being produced and show that the fact layer does not run behind a refused or mis-mapped document, so a refused document can never be reported as an empty report',
      'the emission tally: ' + determinism.emission_tally.cases_that_emitted_a_result + ' cases emitted a result, out of ' + determinism.case_count,
    ],
    unresolved_within_this_scope: [
      'the emission path on an ADMITTED rule record is unexercised: the rule record is NOT ADMITTED, so the refusal is the operative behaviour and the emission path is named rather than demonstrated — see the named item below',
    ],
  },
  {
    criterion_verbatim: 'no finding class is implemented, emitted or implied for this unit, and the explanation surface carries every qualification the rule record requires',
    where_it_sits: 'acceptance criterion 4, read with build plan line ' + PHASE_55_BULLETS[3] + ' and line ' + PHASE_55_BULLETS[4],
    scoped_reading: 'the output vocabulary is observation-class only, and the explanation surface carries the mandatory qualifications verbatim',
    state: 'MET within the scope',
    evidence: [
      'SOURCE_CAPTURES\\PHASE5-001R\\output_vocabulary_and_explanation_surface.json: the permitted values on each axis, and a forbidden-label list that names both finding classes and the clearance renderings',
      'the ceiling is carried from the record: ' + outputSurface.record_ceiling_carried.permitted_result_ceiling + ', an empty finding-class list, packet eligibility false, consumer-visible output NONE',
      'the four mandatory qualification texts are read out of the governed rule record rather than retyped, so none can be dropped or softened: ' + Object.keys(outputSurface.explanation_surface.mandatory_qualification_texts_carried_verbatim).join(', '),
      'the explanation surface is specified to render no finding label in any state, and one template per reachable state exists, including the withheld boundary state',
      'the five concepts the order requires to stay separate are recorded as five separate axes: presentation eligibility, extraction status, date-comparison outcome, rule applicability and qualifications, and observation eligibility',
    ],
    unresolved_within_this_scope: [
      'no template is reachable today: the rule record is unadmitted, so nothing is emitted and nothing could be shown to anyone',
    ],
  },
  {
    criterion_verbatim: 'the internal determinism check runs on synthetic inputs only and its results are recorded against the record\'s own test, including the boundary and clamp cases',
    where_it_sits: 'acceptance criterion 5, read with build plan line ' + PHASE_55_BULLETS[4],
    scoped_reading: 'a synthetic-only check whose cases state what the rule record itself requires, boundary and clamp included',
    state: 'MET within the scope',
    evidence: [
      'SOURCE_CAPTURES\\PHASE5-001R\\internal_determinism_check.json: ' + determinism.case_count + ' cases, ' + determinism.failure_count + ' failures, all synthetic and in memory, with no report opened and no specimen read',
      'every case carries against_the_rule_records_own_test: ' + determinism.cases_recorded_against_the_records_own_test + ' of them state which rule-record requirement the case answers',
      'case D-01 reproduces the record\'s own measured arithmetic; case D-02 is the withheld boundary; cases D-05 to D-07 are the 29 February clamp on both sides of the clamped day',
      'the boundary and clamp cases are listed explicitly in the record as boundary_and_clamp_cases',
    ],
    unresolved_within_this_scope: [
      'the legally reviewed fixture suite and the independent replay sample are Gate 5.6 work and are expressly excluded from this order; no fixture here is legally reviewed',
    ],
  },
  {
    criterion_verbatim: 'the Gate 5.5 verdict record quotes the gate text, states each criterion for this scope with its evidence, and names any criterion it cannot meet instead of passing',
    where_it_sits: 'acceptance criterion 6',
    scoped_reading: 'this record',
    state: 'MET within the scope',
    evidence: [
      'the gate\'s own sentence is quoted at line ' + GATE_55_LINE + ', and the five Phase 5.5 bullets at lines ' + PHASE_55_BULLETS.join(', ') + ' are quoted with it',
      'every criterion of the order and of the gate is stated for this scope with its evidence',
      'one item is NAMED rather than passed, exactly once, and the smallest action that would settle it is recorded with it',
    ],
    unresolved_within_this_scope: [],
  },
  {
    criterion_verbatim: 'the order\'s preservation and custody records show that no earlier artifact was changed outside its own package',
    where_it_sits: 'acceptance criterion 7',
    scoped_reading: 'preservation is proved by measurement against a baseline taken before anything was written',
    state: preservationRenewed ? 'MET within the scope' : 'NAMED — NOT MET IN THIS SCOPE',
    evidence: [
      'SOURCE_CAPTURES\\PHASE5-001R\\preserved_files_before.json: the byte-level baseline, taken before this order wrote any artifact, ' + baseline.file_count + ' files',
      'measured by this verdict itself: files changed ' + preservedChanged.length + ', files missing ' + preservedMissing.length + ', undeclared changes ' + undeclaredPreservationChanges.length,
      preservationRenewed
        ? 'no pre-existing file differs from the baseline'
        : 'one pre-existing file differs from the baseline: ' + disclosedChange.map((c) => c.relative_path + ' (' + c.before + ' -> ' + c.after + ')').join(', ') + '. This order caused that change, it is disclosed with its cause, and it is not authorised by this order.',
      'SOURCE_CAPTURES\\PHASE5-001R\\input_verification.json: ' + inputVerification.input_count + ' inputs re-measured, with the difference the earlier authorised amendment explains, ' + inputVerification.unexplained_differences.length + ' unexplained differences, ' + inputVerification.missing + ' missing files, and the three read-only pointers outside the workspace still matching their recorded pins',
      'SOURCE_CAPTURES\\PHASE5-001R\\file_custody_manifest.json: every file this order read or wrote, with its digest',
    ],
    unresolved_within_this_scope: preservationRenewed ? [] : [
      'the criterion is not met: this order changed a pre-existing artifact belonging to another package (' + disclosedChange.map((c) => c.relative_path).join(', ') + ')',
      'the cause was removed: the PHASE5-001I-A test suite writes its results into its own package when it is run, and the run was taken out of this order\'s builders, so the change cannot recur',
      'the file\'s previous bytes are not reconstructible from a digest, so this order cannot repair it; it states the change instead of hiding it',
      'smallest action to clear it: an owner instrument that either accepts the regenerated record as a recorded, unauthorised preservation exception — as earlier custody discrepancies were recorded and not authorised — or directs a re-baseline that takes the file as it now stands',
    ],
  },
];

// ---------------------------------------------------------------- the gate's own criteria, clause by clause
const gateCriteria = [
  {
    criterion_verbatim: 'evaluator output is deterministic',
    where_it_sits: 'the Gate 5.5 sentence, build plan line ' + GATE_55_LINE + ', first clause',
    state: 'MET within the scope, as a specification',
    evidence: [
      'the decision rules are ordered with a fixed precedence and stop at the first that applies: ' + spec.decision_rules.length + ' rules, one result each',
      determinism.case_count + ' synthetic cases, ' + determinism.failure_count + ' failures, and case D-25 shows the same inputs returning identical records',
      'case D-26 shows no clock, locale, time-zone, host, session, environment or random source is read, and the executable form reads no file system at all',
    ],
    unresolved_within_this_scope: [],
  },
  {
    criterion_verbatim: 'fully traceable to report and source',
    where_it_sits: 'the Gate 5.5 sentence, line ' + GATE_55_LINE + ', second clause',
    state: 'MET within the scope, as a specification',
    evidence: [
      'every fact carries its locator, its register field, its raw and normalized value and its transformation provenance: report_fact_model.json',
      'the source side is the accepted pin at its recorded digest, and the citation is carried as the record records it, on the explanation surface of every template',
      'the arithmetic is recomputed independently and matched to the record\'s own measured numbers: anniversary ' + spec.arithmetic_recomputed.anniversary + ', span ' + spec.arithmetic_recomputed.span_in_days + ' days, elapsed ' + spec.arithmetic_recomputed.elapsed_days + ' days, outcome ' + spec.arithmetic_recomputed.comparison_outcome,
      'no emission path exists to be traceable today, and the record says so rather than implying otherwise',
    ],
    unresolved_within_this_scope: [],
  },
  {
    criterion_verbatim: 'cannot emit on incomplete extraction',
    where_it_sits: 'the Gate 5.5 sentence, line ' + GATE_55_LINE + ', first emission condition',
    state: 'MET within the scope',
    evidence: [
      'the comparison layer runs only when both facts are PRESENT; otherwise the comparison is not run and no outcome is produced',
      'cases D-09 to D-15 exercise the missing label, the doubled label, the blank value, a foreign printed form, the single absence path, the contradictory header and the missing page',
      'a refused or mis-mapped document does not reach the fact layer at all, so a refused document can never be reported as an empty report (cases D-16 to D-20)',
    ],
    unresolved_within_this_scope: [],
  },
  {
    criterion_verbatim: 'cannot emit on ... unapproved rules',
    where_it_sits: 'the Gate 5.5 sentence, line ' + GATE_55_LINE + ', second emission condition',
    state: 'MET within the scope, as a refusal behaviour',
    evidence: [
      'gate G6 refuses with ' + E.REFUSALS.RULE_RECORD_NOT_ADMITTED + ' and produces no outcome',
      'this is the operative state of the scope: the rule record is NOT ADMITTED, and case D-22 shows the refusal on a fully eligible input',
      'the gate condition is a prohibition, and a prohibition is satisfied by a refusal; the presupposition in the phase bullet is a different matter and is named below',
    ],
    unresolved_within_this_scope: [
      'the emission path on an admitted rule record cannot be exercised while the record is NOT ADMITTED, and no credit is claimed for it',
    ],
  },
  {
    criterion_verbatim: 'cannot emit on ... wrong jurisdiction',
    where_it_sits: 'the Gate 5.5 sentence, line ' + GATE_55_LINE + ', third emission condition',
    state: 'MET within the scope',
    evidence: [
      'two named refusals: ' + E.REFUSALS.NO_JURISDICTION_SELECTION + ' and ' + E.REFUSALS.JURISDICTION_NOT_THIS_UNIT,
      'cases D-18 and D-19 exercise both, and jurisdiction is never inferred from the report in either the specification or the fact model',
    ],
    unresolved_within_this_scope: [],
  },
  {
    criterion_verbatim: 'cannot emit on ... wrong event-date mapping',
    where_it_sits: 'the Gate 5.5 sentence, line ' + GATE_55_LINE + ', fourth emission condition',
    state: 'MET within the scope',
    evidence: [
      'gate G4 refuses with ' + E.REFUSALS.WRONG_EVENT_DATE_MAPPING + ' unless the caller declares exactly the recorded mapping for both event roles',
      'case D-20 declares the last-payment role against a different printed field, and the evaluator refuses before the fact layer runs',
    ],
    unresolved_within_this_scope: [],
  },
  {
    criterion_verbatim: 'cannot emit on ... an unresolved affirmative element',
    where_it_sits: 'the Gate 5.5 sentence, line ' + GATE_55_LINE + ', fifth emission condition',
    state: 'MET within the scope',
    evidence: [
      'gate G5 refuses with ' + E.REFUSALS.UNRESOLVED_AFFIRMATIVE_ELEMENT + ' when an input resolves to the excluded second limb or carries another unresolved affirmative element',
      'case D-21 exercises it, and the second limb stays unseated and is neither inferred nor defaulted',
      'the effective period is a temporal qualification rather than an affirmative element, exactly as the scoped Gate 5.4 verdict recorded, and it is carried into every explanation template',
    ],
    unresolved_within_this_scope: [],
  },
  {
    criterion_verbatim: 'evaluators that take only the uploaded report\'s resolved facts plus ADMITTED RULE RECORDS',
    where_it_sits: 'the Phase 5.5 bullet at build plan line ' + PHASE_55_BULLETS[2] + ' — the one item this scope cannot satisfy',
    state: 'NAMED — NOT MET IN THIS SCOPE, AND NOT CONVERTED INTO A PASS',
    evidence: [
      'the scope has ' + record.admission_state.admitted_governed_rules_after_this_order + ' admitted governed rules and ' + record.admission_state.permitted_findings_after_this_order + ' permitted findings, and the rule record carries admission_form ' + record.admission_state.admission_form,
      'the specification therefore implements and tests the refusal half of the condition — which is the half the gate itself prohibits emission on — and states that the emission half is unexercised',
      'the determinism check demonstrates the emission closure twice: refusing on the unadmitted record (D-22), and showing that even a fully admitted synthetic copy emits nothing for this unit (D-23), because the ceiling authorizes no finding class and no consumer surface exists',
    ],
    unresolved_within_this_scope: [
      'the emission path on an admitted rule record is not exercised, not demonstrated and not claimed',
      'the smallest action that would settle it: an owner instrument admitting this unit\'s rule record at Gate 5.7, which cannot happen before Gates 5.5 and 5.6 pass for this scope',
    ],
  },
// __B7C__
];

const namedNotPassed = [
  {
    item: 'an evaluator whose inputs include admitted rule records, and whose emission path is therefore exercised',
    where_it_sits: 'the Phase 5.5 bullet at build plan line ' + PHASE_55_BULLETS[2],
    state: 'NAMED — NOT MET IN THIS SCOPE',
    why_it_cannot_be_met_here: 'no governed rule is admitted for this unit, so no admitted rule record exists for an evaluator to take, and this order may not admit one',
    what_was_done_instead: 'the refusal behaviour the gate requires — that output cannot emit on an unapproved rule — was specified, implemented and tested, and this item is named instead of being converted into a criterion satisfaction',
    smallest_action: 'an owner instrument admitting this unit\'s rule record at Gate 5.7, or an owner reading that settles whether Gate 5.5 requires an admitted rule record as a precondition',
    effect_on_this_verdict: 'it names one phase-bullet item rather than passing it, which is what build plan line ' + SCOPED_PARAGRAPH_LINE + ' requires where a criterion cannot be met within a scope',
  },
  {
    item: 'the alternative owner reading of the same bullet, recorded so that it cannot be missed',
    where_it_sits: 'the same phase bullet, read as a precondition rather than as a description of inputs',
    state: 'NAMED — NOT SETTLED BY THIS ORDER',
    what_it_would_mean: 'if the owner reads the bullet as requiring an admitted rule record before Gate 5.5 can be recorded at all, then the criterion in question is unmet in this scope and this verdict must be read as withheld rather than passed',
    what_this_order_did: 'it executed the primary reading the order it was issued under sets out: build the evaluator so that it refuses to emit while the record is unadmitted, produce a named refusal and no outcome, and record that state criterion by criterion',
    smallest_action: 'an owner reading of Gate 5.5 that says which half governs',
  },
  {
    item: 'acceptance criterion 7 — no earlier artifact was changed outside its own package',
    where_it_sits: 'the acceptance criteria of ' + issuedOrder.order_id + ', criterion 7',
    state: 'NAMED — NOT MET IN THIS SCOPE',
    why_it_cannot_be_met_here: 'this order changed one pre-existing file, ' + (disclosedChange[0] ? disclosedChange[0].relative_path + ' (' + disclosedChange[0].before + ' -> ' + disclosedChange[0].after + ')' : 'none') + ', by re-running the PHASE5-001I-A internal test suite before it was established that the suite writes its results into its own package. The previous bytes are not reconstructible from a digest, so the change cannot be repaired by this order.',
    what_was_done_instead: 'the change is disclosed by measurement with its cause, the run was removed from every builder of this order so it cannot recur, and the criterion is named instead of being passed',
    smallest_action: 'an owner instrument that accepts the regenerated record as a recorded, unauthorised preservation exception — as earlier custody discrepancies were recorded and not authorised — or directs a re-baseline that takes the file as it now stands',
    effect_on_this_verdict: 'this is the criterion that withholds the verdict: build plan line ' + SCOPED_PARAGRAPH_LINE + ' requires a scope\'s verdict to name a criterion it cannot meet instead of being issued',
  },
];

const criteria = acceptanceCriteria.concat(gateCriteria);
const out = {
  artifact: 'scoped_gate_5_5_verdict.json',
  work_order: 'PHASE5-001R',
  created_utc: '2026-09-30',
  document_type: 'SCOPED GATE VERDICT — Gate 5.5, one explicitly named scope only',
  purpose: 'record, criterion by criterion, the state of Gate 5.5 for one scope: quote the gate\'s own text and the bullets it quantifies, state each criterion with its evidence for this scope, name the one item the scope cannot satisfy, and claim no corpus-wide pass',
  scope: {
    scope_id: record.scope.scope_id,
    jurisdiction: record.scope.jurisdiction.country_code + ' / ' + record.scope.jurisdiction.region_code,
    rule_unit: record.scope.rule_unit,
    limb: record.scope.limb_in_scope,
    presentation: record.scope.presentation.presentation_id + ' at ' + record.scope.presentation.sha256,
    evidence_references: [
      'SOURCE_CAPTURES\\PHASE5-001Q\\rule_record.json — the governed rule record, NOT ADMITTED',
      'SOURCE_CAPTURES\\PHASE5-001Q\\rule_record_decisions.json — the six decisions',
      'SOURCE_CAPTURES\\PHASE5-001Q\\scoped_gate_5_4_verdict.json — the preceding scoped verdict that permits this phase to begin for this scope',
      'SOURCE_CAPTURES\\PROD-003\\report_representation_register.json — the demonstrated facts and their locators',
      'SOURCE_CAPTURES\\PHASE5-001R\\report_fact_model.json, extraction_status_vocabulary.json, deterministic_evaluator_specification.json, output_vocabulary_and_explanation_surface.json, internal_determinism_check.json, implementation_comparison.json, evaluator_001r.cjs',
    ],
    exclusions: record.scope.exclusions,
  },
  governing_text_quoted: {
    gate_5_5: quoteAt(GATE_55_LINE),
    phase_5_5_bullets: PHASE_55_BULLETS.map(quoteAt),
    scoped_progression_paragraph: [47, 50, 53, 56, 58, 61, 63, 64, 65].map(quoteAt),
  },
  verdict: preservationRenewed && namedNotPassed.filter((n) => n.state === 'NAMED — NOT MET IN THIS SCOPE').length === 0 ? 'PASSED_FOR_THIS_SCOPE' : 'WITHHELD — ONE OR MORE CRITERIA CANNOT BE MET WITHIN THIS SCOPE',
  verdict_meaning: 'build plan line ' + SCOPED_PARAGRAPH_LINE + ' requires that where a criterion cannot be met within a scope, that scope\'s verdict names the unmet criterion instead of being issued. ' + (preservationRenewed ? 'Every criterion is met here.' : 'Acceptance criterion 7 cannot be met: this order changed one pre-existing file belonging to another package, and the change cannot be repaired from a digest. The verdict is therefore WITHHELD, and the criteria that are met are still stated with their evidence so that only the withheld item is outstanding.'),
  criteria_met_and_withheld: {
    acceptance_criteria: acceptanceCriteria.map((c) => ({ criterion: c.criterion_verbatim, state: c.state })),
    gate_criteria: gateCriteria.map((c) => ({ criterion: c.criterion_verbatim, state: c.state })),
    named_not_passed: namedNotPassed.map((n) => ({ item: n.item, state: n.state })),
  },
  progression_effect: preservationRenewed
    ? 'Gate 5.6 may begin for this scope.'
    : 'Gate 5.6 may NOT begin for this scope: a later phase may begin only when every preceding gate carries a passing verdict for the same scope, and this scoped Gate 5.5 verdict is withheld. No Gate 5.6 order is issued by this order.',
  exact_remaining_blocker: preservationRenewed
    ? 'none for this scope'
    : 'one unauthorised change to a pre-existing file, caused by this order and disclosed: ' + (disclosedChange[0] ? disclosedChange[0].relative_path : 'none') + ' was regenerated by re-running the PHASE5-001I-A internal test suite, whose harness writes its results into its own package. The previous bytes cannot be reconstructed from a digest, so the change cannot be repaired here. Clearing it requires an owner instrument: either accept the regenerated record as a recorded, unauthorised preservation exception, or direct a re-baseline. A separate, independent item is also outstanding for the phase bullet: no governed rule is admitted, so an evaluator\'s emission path on an admitted rule record is unexercised.',
  acceptance_criteria: acceptanceCriteria,
  acceptance_criterion_count: acceptanceCriteria.length,
  gate_criteria: gateCriteria,
  gate_criterion_count: gateCriteria.length,
  criteria,
  criterion_count: criteria.length,
  acceptance_criteria_met: acceptanceCriteria.filter((c) => c.state.indexOf('MET') === 0).length,
  gate_criteria_met: gateCriteria.filter((c) => c.state.indexOf('MET') === 0).length,
  named_not_passed: namedNotPassed,
  named_not_passed_count: namedNotPassed.length,
  unmet_criteria_named: namedNotPassed.length === 0
    ? 'NONE'
    : namedNotPassed.map((n) => n.state + ': ' + n.item).join(' | '),
  excluded_and_unresolved_items: criteria.reduce((acc, c) => acc.concat(c.unresolved_within_this_scope), []),
  implementation_comparison_summary: {
    artifact: 'SOURCE_CAPTURES\\PHASE5-001R\\implementation_comparison.json',
    difference_count: comparison.difference_count,
    material_differences_not_adopted: comparison.material_differences_not_adopted,
    its_own_suite: comparison.its_own_test_suite_re_run && comparison.its_own_test_suite_re_run.tests_and_failures ? comparison.its_own_test_suite_re_run.tests_and_failures.join(' tests, ') + ' failures' : 'not measured',
    the_boundary_difference: 'its comparator returns ' + comparison.measured_agreement_on_the_evidence.boundary_day.implementation.outcome + ' on the exact sixth-anniversary day and this specification withholds it; the difference is recorded, not adopted and not repaired',
    nothing_adopted_because_the_suite_passes: true,
  },
  corpus_wide_verdict: 'NOT PASSED AND UNCHANGED — Gate 5.5 remains unpassed for the corpus. This verdict covers one jurisdiction, one rule unit, one statutory limb and one byte-pinned presentation, and the demo specimen it was defined against exists in the workspace only as a digest pointer. It states no corpus-wide pass, gives no Gate 5.6 or Gate 5.7 credit, and leaves 0 governed rules admitted and 0 findings permitted.',
  what_this_verdict_does_not_do: [
    'it does not admit a rule, create coverage or a candidate, or authorize a finding class, in any circumstance, for any input',
    'it does not decide the effective period, the exception, the anniversary-boundary reading or any calculation convention: each restricts output exactly as the rule record left it',
    'it does not change, conform or adopt the PHASE5-001I-A internal comparator, and it does not rely on that comparator\'s boundary treatment',
    'it does not turn the missing work of this scope into GAP or REFUSAL: the one item that cannot be satisfied is named, with the smallest action that would settle it',
    'it produces no consumer-visible output of any class and changes no application behaviour: report checking remains "not yet available"',
    'it does not retroactively authorize the custody discrepancies earlier orders recorded, and it edits no register, ledger, crosswalk, catalogue or manifest',
  ],
  created_by: 'PHASE5-001R',
};

fs.writeFileSync(path.join(OUT, 'scoped_gate_5_5_verdict.json'), JSON.stringify(out, null, 2) + '\n', 'utf8');
console.log('scoped_gate_5_5_verdict.json written: criteria ' + criteria.length + ' | verdict ' + out.verdict + ' | named not passed ' + namedNotPassed.length);

