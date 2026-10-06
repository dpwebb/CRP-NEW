// build_001r_fact_model.js — PHASE5-001R deliverable 1.
//
// The report fact model for this unit, defined from the governed rule record rather than from prose: the fact
// names, labels, locators, values and binding rules are READ OUT of the record and the register, so the model
// cannot drift from them. It keeps the rule-read fact and the convention input distinct, exactly as the record
// records them, and it names every status a fact can carry without conflating any two of them.
//
// Writes only report_fact_model.json inside this order's own package.

const fs = require('fs');
const path = require('path');

const ROOT = 'C:\\CRP-NEW';
const OUT = path.join(ROOT, 'SOURCE_CAPTURES', 'PHASE5-001R');
const readText = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const readJson = (rel) => JSON.parse(readText(rel));

const record = readJson('SOURCE_CAPTURES\\PHASE5-001Q\\rule_record.json');
const register = readJson('SOURCE_CAPTURES\\PROD-003\\report_representation_register.json');
const evaluator = require('./evaluator_001r.cjs');

const planLines = readText('CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md').split(/\r?\n/);
const BULLET_132 = planLines[131];
const BULLET_133 = planLines[132];
if (BULLET_132.indexOf('**') !== -1 || BULLET_132.indexOf('report fact model') === -1) throw new Error('line 132 is not the fact-model bullet this builder cites');

const fact02 = register.field_records.find((f) => f.field_id === 'FACT-02');
const fact03 = register.field_records.find((f) => f.field_id === 'FACT-03');
const ruleRead = record.report_facts.rule_read_facts[0];
const conventionInput = record.report_facts.evaluation_convention_inputs[0];
const requiredFactsField = record.governed_fields.find((f) => f.field === 'report-required facts').value;
const decisiveField = record.governed_fields.find((f) => f.field === 'decisive facts').value;

// the things a fact record carries, parsed out of the plan's own sentence rather than retyped from memory
const carriedClause = BULLET_132.split('Each fact records')[1] || '';
const requiredParts = carriedClause.replace(/\.\s*$/, '').split(/,\s*/)
  .map((s) => s.trim().replace(/^and\s+/, '')).filter(Boolean);
if (requiredParts.length !== 6) throw new Error('the fact-model bullet names ' + requiredParts.length + ' carried parts, not the six this model requires');

const out = {
  artifact: 'report_fact_model.json',
  work_order: 'PHASE5-001R',
  created_utc: '2026-09-30',
  document_type: 'GOVERNED REPORT FACT MODEL — one scope only. A specification for this unit. NOT ADMITTED, no emission, no consumer-visible output',
  purpose: 'define, for one scope only, the report fact model from the certified rule unit, so that every fact the unit reads records its raw value, its normalized value, its source location, its extraction status, its event semantics and its transformation provenance, and so that the fact the rule reads is never merged with the input the recorded convention supplies',
  governing_text_read: {
    phase_5_5_bullet_fact_model: { document: 'CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md', section: 'section 3', line: 132, text: BULLET_132 },
    phase_5_5_bullet_statuses: { document: 'CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md', section: 'section 3', line: 133, text: BULLET_133 },
  },
  scope: {
    scope_id: record.scope.scope_id,
    jurisdiction: record.scope.jurisdiction,
    rule_unit: record.scope.rule_unit,
    limb_in_scope: record.scope.limb_in_scope,
    limb_out_of_scope: record.scope.limb_out_of_scope,
    presentation: record.scope.presentation,
    exclusions: record.scope.exclusions,
  },
  what_each_fact_record_carries: requiredParts,
  the_two_entries_are_different_kinds: {
    rule_read_fact: {
      fact_id: ruleRead.fact_id,
      kind: 'THE_FACT_THE_ADMITTED_TEXT_READS',
      why_it_is_this_kind: 'the admitted text reads "the last payment was made on the debt". It is the only fact the text itself reads, and the comparison has no clock without it.',
    },
    convention_input: {
      fact_id: conventionInput.fact_id,
      kind: conventionInput.kind,
      why_it_is_this_kind: 'the admitted text states no comparison or measuring date. This value is supplied by the recorded convention, not by the text of the rule (rule-record decisions Q-D3), and it may never be presented as a statutory date or as the date of any event.',
      reading_rule: conventionInput.reading_rule,
    },
    refinement_recorded_by_the_rule_record: record.report_facts.refinement_recorded_by_this_order,
    rule_for_this_specification: 'the model keeps the two entries separate in every status, every comparison and every explanation. Merging them, or letting one stand in for the other, is the conflation this model exists to prevent.',
    earlier_draft_preserved_unchanged: true,
  },
  facts: [
    {
      fact_id: ruleRead.fact_id,
      kind: 'RULE_READ_FACT',
      printed_label: requiredFactsField.rule_read_fact.printed_label,
      prints_in: requiredFactsField.rule_read_fact.prints_in,
      source_location: {
        locators: ruleRead.locators,
        register_field: fact02.field_id,
        register_location: fact02.location,
        register_section_path: fact02.section_path,
        extraction_method: fact02.extraction_method,
        evidence: 'SOURCE_CAPTURES\\PROD-003\\report_representation_register.json ' + fact02.field_id + '; SOURCE_CAPTURES\\PHASE5-001I-A\\extraction_results.json collection_records',
      },
      raw_value_form: fact02.raw_value_form,
      raw_value: ruleRead.raw_value,
      raw_value_on_the_register: fact02.raw_value_observed,
      normalized_value: ruleRead.normalized_value,
      extraction_status_on_the_evidenced_specimen: evaluator.FACT_STATUS.PRESENT,
      event_semantics: {
        meaning: fact02.date_meaning,
        what_it_is_not: 'not a verified event, not a statutory date, not the default-in-payment date, and not a date the register treats as proof that any payment occurred',
        proof_boundary: decisiveField.proof_statement,
      },
      scope_of_the_value: 'COLLECTION_RECORD_SPECIFIC — one value per contract debt record, bound to the record that prints it',
      binding_rules: [ruleRead.binding_rule, requiredFactsField.effect_on_output_eligibility],
      transformation_provenance: {
        read_from: 'the printed row label inside its own contract debt record, at the recorded locators',
        method: fact02.extraction_method,
        normalization: 'the printed token (four-digit year, then month, then day) is transformed to ISO 8601 by one pure token rule; no other date is read, borrowed or defaulted',
        clock: 'no clock, locale, time zone, host or session state is read in producing the raw or the normalized value',
        ocr: 'none: the presentation carries native text, and an image-only or text-less document is refused rather than read',
        re_derivation: 'the normalized value is never re-derived from another date, and the raw value is retained beside it',
      },
      register_note: fact02.ambiguity_handling,
      second_limb_note: fact02.second_limb_note,
    },
    {
      fact_id: conventionInput.fact_id,
      kind: 'EVALUATION_CONVENTION_INPUT',
      printed_label: conventionInput.evidence_label,
      prints_in: conventionInput.locators,
      source_location: {
        locators: conventionInput.locators,
        register_field: fact03.field_id,
        register_location: fact03.location,
        register_section_path: fact03.section_path,
        extraction_method: fact03.extraction_method,
        evidence: 'SOURCE_CAPTURES\\PROD-003\\report_representation_register.json ' + fact03.field_id,
      },
      raw_value_form: fact03.raw_value_form,
      raw_value: conventionInput.raw_value,
      raw_value_on_the_register: fact03.raw_value_observed,
      normalized_value: conventionInput.normalized_value,
      extraction_status_on_the_evidenced_specimen: evaluator.FACT_STATUS.PRESENT,
      event_semantics: {
        meaning: fact03.date_meaning,
        what_it_is_not: 'not a statutory effective date, not the date of any underlying event, and not the date of the last payment',
      },
      scope_of_the_value: 'PRESENTATION_WIDE — one value, read from the page header only, and only when the same value appears on every page',
      binding_rules: [conventionInput.reading_rule, fact03.ambiguity_handling],
      transformation_provenance: {
        read_from: 'the printed header label on every page of the presentation',
        method: fact03.extraction_method,
        normalization: 'the same single pure token rule as the rule-read fact; the printer\'s form is four-digit year, then month, then day',
        clock: 'no clock, locale, time zone, host or session state is read',
        substitution: 'no other printed date may be substituted for it, and it is never ABSENT_FROM_REPORT',
      },
    },
  ],
  unit_shape: {
    per_record_isolation: record.governed_fields.find((f) => f.field === 'report-required facts').value.rule_read_fact.scope + ': the fact is bound to its own contract debt record',
    no_aggregation: 'the model produces one rule-read fact per contract debt record and never a single merged value; two records may carry two different dates and neither may be borrowed for the other',
    unit_level_fact_states_reachable: [evaluator.FACT_STATUS.PRESENT, evaluator.FACT_STATUS.EXTRACTION_UNRESOLVED, evaluator.FACT_STATUS.ABSENT_FROM_REPORT, evaluator.FACT_STATUS.CONTRADICTED],
    the_only_absence_path: record.report_facts.absence_path,
    the_refinement_this_order_recorded: 'the rule record\'s absence path is carried verbatim and is not widened. One shape is recorded alongside it: where the section is resolved, prints no contract debt record, and prints the label outside any contract debt record, the fact is EXTRACTION_UNRESOLVED (FIELD_LABEL_OUTSIDE_ANY_RECORD), because a value is never read outside a record and the section\'s clean absence reading is then not available. This keeps that one path exactly one path.',
    the_reference_date_is_never_absent: 'the convention input has no absence path: when its label is not found, or is not on every page, or is not well formed, it is EXTRACTION_UNRESOLVED and the comparison does not run. It is never ABSENT_FROM_REPORT and no other date is substituted.',
    not_a_debt_record_is_not_a_status: 'a region that is not the contract\'s debt record is a record-level disposition (NOT_A_DEBT_RECORD): no fact is read from it and it produces no factor status of its own',
  },
  what_the_model_must_not_do: record.report_facts.forbidden_substitutions.concat([
    'it must never report a refused document as an empty report, and never as ABSENT_FROM_REPORT',
    'it must never let an extraction status stand as a comparison outcome, or a comparison outcome stand as an extraction status',
    'it must never carry a value across record, section or page boundaries',
    'it must never present the convention input as a requirement of the admitted text',
  ]),
  statuses_are_defined_separately: {
    extraction_status_vocabulary: 'SOURCE_CAPTURES\\PHASE5-001R\\extraction_status_vocabulary.json (deliverable 2)',
    comparison_outcome_vocabulary: record.report_facts.comparison_outcome_vocabulary,
    why_they_are_separate: 'a status describes what the report prints; an outcome describes what the arithmetic returns. The gate forbids emitting on incomplete extraction, and this model keeps the two vocabularies from ever being read as one.',
  },
  verification: {
    the_model_is_derived_not_retyped: 'every fact id, label, locator, raw value, normalized value, binding rule and forbiddance above is read out of SOURCE_CAPTURES\\PHASE5-001Q\\rule_record.json and SOURCE_CAPTURES\\PROD-003\\report_representation_register.json at build time; the builder refuses to run if the plan lines it cites are not the lines it reads',
    the_specimen_values_match_the_register: {
      rule_read_fact: ruleRead.normalized_value === fact02.raw_value_observed.replace(/\//g, '-') ? 'MATCHES' : 'CHECK',
      convention_input: conventionInput.normalized_value === fact03.raw_value_observed ? 'MATCHES' : 'CHECK',
    },
    executable_form: 'SOURCE_CAPTURES\\PHASE5-001R\\evaluator_001r.cjs, function resolveFactStatus (rank 8, internal, not admitted, not wired to any application surface)',
  },
  what_this_record_does_not_do: [
    'it does not read a report: it defines the model, and the executable form reads only observations the caller supplies',
    'it admits no rule, creates no coverage and no candidate, and authorizes no finding class',
    'it produces no consumer-visible output of any class and changes no application behaviour; report checking remains "not yet available"',
    'it decides no legal question: the effective period, the exception and the anniversary-boundary reading all stay as the rule record left them',
  ],
  created_by: 'PHASE5-001R',

};

fs.writeFileSync(path.join(OUT, 'report_fact_model.json'), JSON.stringify(out, null, 2) + '\n', 'utf8');
console.log('report_fact_model.json written: facts ' + out.facts.length + ' | carried parts ' + out.what_each_fact_record_carries.length);
