'use strict';
/**
 * build_001t_consumer_language.cjs — PHASE5-001T deliverable 4: consumer-language validation.
 *
 * Every template of output_vocabulary_and_explanation_surface.json at its pinned digest is exercised, including
 * the withheld-boundary template, with realistic examples. The templates are RENDERED INTO THIS RECORD ONLY:
 * no consumer surface is created, none is proposed and nothing may be shown.
 *
 * It writes one artifact, SOURCE_CAPTURES\PHASE5-001T\consumer_language_validation_001t.json, and nothing else.
 */
const I = require('./inputs_001t.cjs');
const K = require('./fixtures_001t.cjs');

const E = K.E;
const ADMITTED = K.syntheticAdmittedCopy();
const SURFACE = I.readJson(I.PATHS.output_surface);
const REGISTER = I.readJson(I.PATHS.register);

const NEGATION = /\b(no|not|never|nothing|none|neither|without|cannot|may not|does not|do not|is not|are not|gives no)\b/i;
const FINDING_LABELS = ['VIOLATION', 'PROBABLE_VIOLATION', 'BREACH_ESTABLISHED', 'WITHIN_THE_LIMIT', 'COMPLIANT'];

const fact02 = REGISTER.field_records.filter((f) => f.field_id === 'FACT-02')[0];
const fact03 = REGISTER.field_records.filter((f) => f.field_id === 'FACT-03')[0];

/** split into sentences, so a prohibition can be told from an overstatement */
function sentences(t) { return String(t).split(/(?<=[.:;])\s+/).filter((s) => s.trim().length > 0); }
function overstatementScan(t) {
  const examined = [];
  sentences(t).forEach((s) => {
    I.OVERSTATEMENT_TOKENS.forEach((token) => {
      if (s.toLowerCase().indexOf(token) === -1) return;
      const negated = NEGATION.test(s);
      examined.push({ sentence: s.trim(), token, negated, classification: negated ? 'PROHIBITION_NOT_AN_OVERSTATEMENT' : 'AFFIRMATIVE_OVERSTATEMENT' });
    });
  });
  return {
    occurrences: examined,
    affirmative_overstatements: examined.filter((o) => o.classification === 'AFFIRMATIVE_OVERSTATEMENT'),
    how_a_prohibition_is_told_from_an_overstatement: 'the rendered text is split into sentences; a sentence that carries an overstatement token AND a negation marker is classified as a prohibition (the text forbidding the statement), and only a sentence that carries the token without a negation marker counts as an affirmative overstatement. Every occurrence is recorded with its classification.',
  };
}

const CASES = {
  PERIOD_EXCEEDED: { fixture: 'FX-01', what: 'a record whose arithmetic exceeds the six-year span' },
  PERIOD_NOT_EXCEEDED: { fixture: 'FX-02', what: 'a record whose arithmetic does not exceed the span' },
  BOUNDARY_CASE_EXACTLY_AT_SIX_YEAR_ANNIVERSARY: { fixture: 'FX-03', what: 'a record whose request date is exactly the sixth anniversary' },
  UNRESOLVED: { fixture: 'FX-09', what: 'a record whose printed label carries no value' },
  THE_NAMED_REFUSALS: { fixture: 'FX-29', what: 'a fully eligible document against the record as it stands, which refuses at the admission gate' },
};

const inputs = {
  'FX-01': () => K.inputOf({ ruleRecord: ADMITTED, reference: K.refObs('2026/05/05'), collections: K.collectionsOf([K.debtRecord(2, '2019/01/01')]) }),
  'FX-02': () => K.inputOf({ ruleRecord: ADMITTED, reference: K.refObs('2026/05/05'), collections: K.collectionsOf([K.debtRecord(2, '2021/02/01')]) }),
  'FX-03': () => K.inputOf({ ruleRecord: ADMITTED, reference: K.refObs('2027/02/01'), collections: K.collectionsOf([K.debtRecord(2, '2021/02/01')]) }),
  'FX-09': () => K.inputOf({ ruleRecord: ADMITTED, reference: K.refObs('2026/05/05'), collections: K.collectionsOf([K.blankRecord(2)]) }),
  'FX-29': () => K.inputOf({ reference: K.refObs('2026/05/05'), collections: K.collectionsOf([K.debtRecord(2, '2021/02/01')]) }),
};

const rendered = SURFACE.explanation_surface.templates.map((tpl) => {
  const spec = CASES[tpl.state];
  const result = E.evaluate(inputs[spec.fixture]());
  const qualifications = {
    timing: result.applicability_and_qualifications.qualifications.timing.text,
    classification: result.applicability_and_qualifications.qualifications.classification.text,
    boundary: result.applicability_and_qualifications.qualifications.boundary.text,
    specimen: result.applicability_and_qualifications.qualifications.specimen.text,
  };
  const parts = SURFACE.explanation_surface.required_parts;
  const stateText = tpl.may_say || tpl.must_say || '';
  const text = [
    parts.applicable_statute_or_citation + '.',
    parts.report_quotation_and_location + ': the field the register records as "' + fact02.field + '" printed at ' + fact02.location.split(';')[0] + ', and the field recorded as "' + fact03.field + '" printed at ' + fact03.location.split(';')[0] + '.',
    stateText,
    tpl.must_say || '',
    parts.why_the_confidence_class_is_limited + '.',
    parts.unresolved_qualifications + '.',
    qualifications.timing, qualifications.classification, qualifications.boundary, qualifications.specimen,
    parts.assertion_versus_verified_truth + '.',
  ].join(' ');

  const labelHits = FINDING_LABELS.filter((l) => text.indexOf(l) !== -1);
  const scan = overstatementScan(text);
  const qualificationsCarriedVerbatim = tpl.carries_all_four_qualifications
    ? ['timing', 'classification', 'boundary', 'specimen'].filter((k) => text.indexOf(qualifications[k]) !== -1)
    : [];
  const requiredPartsPresent = {
    applicable_statute_or_citation: text.indexOf(parts.applicable_statute_or_citation) !== -1,
    report_quotation_and_location: text.indexOf(fact02.location.split(';')[0]) !== -1 && text.indexOf(fact03.location.split(';')[0]) !== -1,
    what_requirement_appears_unmet: stateText.length > 0,
    why_the_confidence_class_is_limited: text.indexOf(parts.why_the_confidence_class_is_limited) !== -1,
    unresolved_qualifications: text.indexOf(parts.unresolved_qualifications) !== -1,
    assertion_versus_verified_truth: text.indexOf(parts.assertion_versus_verified_truth) !== -1,
  };
  const allPartsPresent = Object.keys(requiredPartsPresent).every((k) => requiredPartsPresent[k]);
  const reaches = tpl.state === 'THE_NAMED_REFUSALS'
    ? result.refusal !== null
    : tpl.state === 'BOUNDARY_CASE_EXACTLY_AT_SIX_YEAR_ANNIVERSARY'
      ? result.comparisons.per_record.some((c) => c.boundary_case === tpl.state)
      : tpl.state === 'UNRESOLVED'
        ? result.comparisons.per_record.some((c) => c.comparison_outcome === 'UNRESOLVED')
        : result.comparisons.per_record.some((c) => c.comparison_outcome === tpl.state);

  return {
    template_state: tpl.state,
    template_when_it_applies: tpl.when,
    template_declares_no_finding_label: tpl.finding_label_rendered === false,
    exercised_by_fixture: spec.fixture,
    the_fixture_is: spec.what,
    the_fixture_reaches_this_state: reaches,
    rendered_explanation: text,
    rendered_into: 'this validation record only: no consumer surface exists, none is created and nothing may be shown',
    carries_all_four_qualifications: tpl.carries_all_four_qualifications,
    if_not: tpl.instead || null,
    qualifications_carried_verbatim: qualificationsCarriedVerbatim,
    required_parts_present: requiredPartsPresent,
    finding_labels_in_the_rendered_text: labelHits,
    overstatement_scan: scan,
    emission_state_of_the_case: result.emission.state,
    packet_eligible: result.observation_eligibility.packet_eligible,
    passed: allPartsPresent && reaches && labelHits.length === 0 && scan.affirmative_overstatements.length === 0
      && (tpl.carries_all_four_qualifications ? qualificationsCarriedVerbatim.length === 4 : true)
      && tpl.finding_label_rendered === false,
  };
});

const failed = rendered.filter((r) => !r.passed).map((r) => r.template_state);
const pins = I.pinReport();
const pinFailures = pins.filter((p) => p.state !== 'MATCHES_THE_PIN');

const written = I.writeJson('consumer_language_validation_001t.json', {
  artifact: 'consumer_language_validation_001t.json',
  work_order: I.ORDER_ID,
  created_utc: I.CREATED_UTC,
  document_type: 'CONSUMER-LANGUAGE VALIDATION RECORD — one scope only. The templates are rendered into this record and nowhere else. NOT ADMITTED, no emission, no consumer-visible output',
  purpose: 'validate the consumer language of every explanation template at its pinned digest, with realistic examples, so that the explanation is useful and does not overstate a legal conclusion',
  the_governing_text_read: {
    document: I.PATHS.plan,
    clause: 'section 3, Phase 5.6 bullet 4 (consumer language)',
    line: 168,
    text: '- Validate consumer language with realistic examples so the explanation is useful and does not overstate a legal conclusion.',
  },
  templates_read_from: {
    path: I.PATHS.output_surface,
    sha256: I.PINS[I.PATHS.output_surface],
    template_count: SURFACE.explanation_surface.templates.length,
    template_states: SURFACE.explanation_surface.templates.map((t) => t.state),
    every_template_exercised: rendered.length === SURFACE.explanation_surface.templates.length,
    the_withheld_boundary_template: 'exercised by FX-03, and its rendered text is the withheld-boundary qualification verbatim',
  },
  the_report_excerpt_used: 'the register\'s recorded locations and values for the two printed fields. No report is opened and no consumer document is quoted from anywhere else.',
  rulings_this_validation_makes: {
    useful: 'every template carries the citation, the printed location and value it rests on, what the arithmetic returns, why the confidence class is limited, the unresolved qualifications, and the distinction between the report\'s assertion and verified truth',
    not_overstated: 'no rendered text carries a finding label, and no sentence asserts an overstatement affirmatively: every occurrence of an overstatement token is either absent or sits inside a prohibition, and each occurrence is recorded with its classification',
    no_surface_created: 'the templates are rendered into this record only. Report checking remains "not yet available", the packet stays ineligible and no consumer-visible output of any class is produced.',
  },
  template_count: rendered.length,
  failure_count: failed.length,
  failed_templates: failed,
  pin_verification: { pins, all_match: pinFailures.length === 0, mismatches: pinFailures },
  templates: rendered,
  what_may_be_shown_today: SURFACE.what_may_be_shown_today,
  verdict: failed.length === 0
    ? 'EVERY TEMPLATE VALIDATED — ' + rendered.length + ' templates exercised, no finding label, no affirmative overstatement, no surface created'
    : 'TEMPLATES FAILED VALIDATION: ' + failed.join(', '),
  what_this_record_does_not_do: [
    'it creates no consumer surface, publishes nothing, transmits nothing and changes no application behaviour',
    'it does not admit a rule, create coverage or authorise a finding class',
    'it does not soften a template to make it pass: the templates are read at their pinned digest and the checks are measured against the pinned text',
    'it does not decide the effective period, the exception or the anniversary-boundary question',
  ],
  created_by: I.ORDER_ID,
});

console.log('consumer language: ' + rendered.length + ' templates | failures: ' + failed.length + ' | pin mismatches: ' + pinFailures.length + ' | written ' + written.bytes + ' bytes');
rendered.forEach((r) => {
  if (!r.passed) console.log('  FAIL ' + r.template_state + ': parts=' + JSON.stringify(r.required_parts_present) + ' labels=' + JSON.stringify(r.finding_labels_in_the_rendered_text) + ' overstatements=' + r.overstatement_scan.affirmative_overstatements.length + ' reaches=' + r.the_fixture_reaches_this_state);
});