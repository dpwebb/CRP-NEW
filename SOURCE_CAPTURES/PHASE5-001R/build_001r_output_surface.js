// build_001r_output_surface.js — PHASE5-001R deliverable 4.
//
// The output vocabulary and the explanation surface, restricted to what this unit may lawfully say: observation-
// class outcomes and refusals only. The two finding classes are not implemented, not emitted, not implied and
// not promised, and the explanation surface is specified to never render a finding label.
//
// The qualification texts are read out of the governed rule record rather than retyped, so no qualification can
// be dropped or softened here, and the five concepts the order requires to stay separate are named as five.
//
// Writes only output_vocabulary_and_explanation_surface.json inside this order's own package.

const fs = require('fs');
const path = require('path');

const ROOT = 'C:\\CRP-NEW';
const OUT = path.join(ROOT, 'SOURCE_CAPTURES', 'PHASE5-001R');
const readText = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const readJson = (rel) => JSON.parse(readText(rel));

const record = readJson('SOURCE_CAPTURES\\PHASE5-001Q\\rule_record.json');
const evaluator = require('./evaluator_001r.cjs');

const planLines = readText('CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md').split(/\r?\n/);
const BULLET_135 = planLines[134];
const BULLET_136 = planLines[135];
const GATE_138 = planLines[137];
const q = record.consumer_facing_qualifications;
const ceiling = record.classification_and_ceiling;

const explanationRequirements = {
  applicable_statute_or_citation: record.consumer_citation,
  report_quotation_and_location: 'the printed label, its pages and its value, quoted from the presentation as the fact model records them',
  what_requirement_appears_unmet: 'stated only as a description of what the report prints and what the arithmetic returns. It is never stated as a legal conclusion and never as an established breach.',
  why_the_confidence_class_is_limited: 'the recorded classification limits this unit to observation; no finding class is available to it and the packet is ineligible.',
  unresolved_qualifications: 'the exception, timing and applicability qualifications the rule record requires, carried verbatim and in full',
  assertion_versus_verified_truth: record.governed_fields.find((f) => f.field === 'decisive facts').value.proof_statement,
};

const out = {
  artifact: 'output_vocabulary_and_explanation_surface.json',
  work_order: 'PHASE5-001R',
  created_utc: '2026-09-30',
  document_type: 'OUTPUT VOCABULARY AND EXPLANATION SURFACE — one scope only. NOT ADMITTED, no consumer surface, no emission',
  purpose: 'record the exact values this unit may produce on each axis, the labels it may never produce, and the explanation surface every observation-class result would have to carry, so that a numerical comparison can never silently become a legal conclusion',
  governing_text_read: {
    phase_5_5_bullet_outputs: { document: 'CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md', section: 'section 3', line: 135, text: BULLET_135 },
    phase_5_5_bullet_explanation: { document: 'CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md', section: 'section 3', line: 136, text: BULLET_136 },
    gate_5_5: { document: 'CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md', section: 'section 3', line: 138, text: GATE_138 },
  },
  the_five_concepts_are_five: [
    { concept: 'presentation eligibility', axis: 'document', values: ['ELIGIBLE', 'REFUSED_WITH_A_NAMED_CAUSE'], never_means: 'it is never a fact status and never a comparison outcome' },
    { concept: 'extraction status', axis: 'fact', values: record.report_facts.extraction_status_vocabulary, never_means: 'it is never absence-by-parser-failure and never an outcome' },
    { concept: 'date-comparison outcome', axis: 'arithmetic', values: record.report_facts.comparison_outcome_vocabulary, never_means: 'it is never a finding and never a status' },
    { concept: 'rule applicability and qualifications', axis: 'rule', values: ['APPLICABLE_ON_THIS_READING_WITH_QUALIFICATIONS', 'QUALIFICATION_CARRIED'], never_means: 'a qualification is never a finding and never a clearance' },
    { concept: 'observation eligibility', axis: 'output', values: [ceiling.permitted_result_ceiling, 'INTERNAL_OBSERVATION_RECORD_ONLY'], never_means: 'it is never permission to show anything to anyone' },
  ],
  record_ceiling_carried: {
    permitted_result_ceiling: ceiling.permitted_result_ceiling,
    finding_classes_available: ceiling.finding_classes_available,
    authorised_finding_classes: ceiling.authorised_finding_classes,
    classification_retained: ceiling.classification_retained,
    proposed_ceiling_not_adopted: ceiling.proposed_ceiling_not_adopted,
  },
  permitted_output_axes: {
    presentation_eligibility: ['ELIGIBLE', 'REFUSED'],
    refusal: Object.keys(evaluator.REFUSALS).map((k) => evaluator.REFUSALS[k]),
    extraction_status: record.report_facts.extraction_status_vocabulary,
    comparison_outcome: record.report_facts.comparison_outcome_vocabulary,
    boundary_case: [evaluator.BOUNDARY_CASE.EXACTLY_AT_SIX_YEAR_ANNIVERSARY],
    emission: [evaluator.EMISSION.NOT_EMITTED, evaluator.EMISSION.NO_CONSUMER_SURFACE_AND_NO_FINDING_CLASS_AUTHORIZED],
    observation_eligibility: [ceiling.permitted_result_ceiling, 'INTERNAL_OBSERVATION_RECORD_ONLY'],
  },
  forbidden_labels: [
    'VIOLATION', 'PROBABLE_VIOLATION',
    'any other finding label or finding class, however phrased',
    'BREACH_ESTABLISHED and any synonym of an established breach',
    'COMPLIANT, WITHIN_THE_LIMIT and any statement that the report or the debt satisfies the provision',
    'any statement that the provision applied to this debt at the relevant time',
    'any statement that the report is inaccurate, unlawful or actionable',
    'any request for additional consumer evidence',
  ],
  the_numeric_result_is_not_a_legal_conclusion: {
    rule: 'a comparison outcome is an arithmetic result on two printed dates. It is reported as what the report prints and what the arithmetic returns, never as what the law requires or what the agency did.',
    mechanism: 'the comparison outcome is carried on its own axis, every explanation template states the assertion-versus-verified-truth distinction, and no template may render a finding label',
    the_assertion_is_never_verified_truth: explanationRequirements.assertion_versus_verified_truth,
  },
  explanation_surface: {
    required_parts: explanationRequirements,
    every_template_carries: [
      'the applicable citation, as recorded: ' + record.consumer_citation,
      'the report quotation and its location',
      'the requirement the report\'s own print appears not to meet, stated as a description of the print',
      'why the confidence class is limited, as recorded',
      'the unresolved exception, timing and applicability qualifications, verbatim',
      'the distinction between the report\'s assertion and independently verified truth',
      'renders_a_finding_label: false',
    ],
    mandatory_qualification_texts_carried_verbatim: {
      timing: q.timing.text,
      classification: q.classification.text,
      boundary: q.boundary.text,
      specimen: q.specimen.text,
      effect: q.effect_of_every_qualification,
    },
    templates: [
      {
        state: evaluator.COMPARISON_OUTCOME.PERIOD_EXCEEDED,
        when: 'both facts are PRESENT and the elapsed days exceed the derived six-year span',
        finding_label_rendered: false,
        may_say: 'the report prints a last payment date, and the arithmetic measured from that date to the report\'s own reference date exceeds the six-calendar-year span computed from the same date.',
        must_say: 'that is an arithmetic result only. Whether the provision applied to this debt, whether the printed date is true, and whether the agency did anything the law forbids are all separate questions this unit does not answer.',
        carries_all_four_qualifications: true,
      },
      {
        state: evaluator.COMPARISON_OUTCOME.PERIOD_NOT_EXCEEDED,
        when: 'both facts are PRESENT and the elapsed days are less than the derived six-year span',
        finding_label_rendered: false,
        may_say: 'the arithmetic measured from the printed date to the report\'s own reference date does not exceed the six-calendar-year span computed from the same date.',
        must_say: 'this is not a clearance and not a statement of compliance: it says nothing about the provision\'s applicability, about any other date, or about any other report.',
        carries_all_four_qualifications: true,
      },
      {
        state: evaluator.BOUNDARY_CASE.EXACTLY_AT_SIX_YEAR_ANNIVERSARY,
        when: 'both facts are PRESENT and the reference date is exactly the sixth anniversary of the printed date',
        finding_label_rendered: false,
        outcome: 'WITHHELD — ' + evaluator.COMPARISON_OUTCOME.UNRESOLVED,
        must_say: q.boundary.text,
        carries_all_four_qualifications: true,
      },
      {
        state: evaluator.COMPARISON_OUTCOME.UNRESOLVED,
        when: 'a fact the comparison needs is not PRESENT, or the reference date precedes the printed date, or the boundary case was reached',
        finding_label_rendered: false,
        must_say: 'no comparison was made and no result is given. The reason is named in the record: the fact status and its reason, or the comparison reason.',
        carries_all_four_qualifications: true,
      },
      {
        state: 'THE_NAMED_REFUSALS',
        when: 'any gate fails: ' + Object.keys(evaluator.REFUSALS).map((k) => evaluator.REFUSALS[k]).join(', '),
        finding_label_rendered: false,
        must_say: 'the evaluation did not run or produced no outcome, the refusal is named, and nothing whatever is asserted about the report, the debt or any person.',
        carries_all_four_qualifications: false,
        instead: 'a refusal carries the reason and the boundary of the refusal only: no qualification, no outcome and no observation is produced',
      },
    ],
  },
  what_may_be_shown_today: {
    consumer_visible_output: 'NONE',
    text: q.consumer_visible_today,
    packet: 'ineligible',
    application: 'unchanged; report checking remains "not yet available"',
    note: 'the templates above specify how a lawful observation-class explanation would have to read if a surface ever existed. They are not a surface, they are not reachable, and they authorize nothing.',
  },
  boundaries: [
    'No finding class is implemented, emitted, implied or promised for this unit, in any circumstance, for any input.',
    'A qualification is an output restriction, not a finding and not an admission.',
    'This record admits no rule, creates no coverage and no candidate, and passes no gate corpus-wide.',
  ],
  created_by: 'PHASE5-001R',
};

fs.writeFileSync(path.join(OUT, 'output_vocabulary_and_explanation_surface.json'), JSON.stringify(out, null, 2) + '\n', 'utf8');
console.log('output_vocabulary_and_explanation_surface.json written: forbidden labels ' + out.forbidden_labels.length + ' | templates ' + out.explanation_surface.templates.length);
