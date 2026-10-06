// build_001r_status_vocabulary.js — PHASE5-001R deliverable 2.
//
// The exact extraction-status vocabulary and its reachable paths. The four statuses are PARSED OUT of the
// gate's own line and matched against the four the specification defines, so the vocabulary cannot silently
// grow a fifth or lose one. Document-level and record-level refusals are kept in their own layer, which is how
// a refused document can never be read as an empty report and a non-debt region can never be read at all.
//
// Writes only extraction_status_vocabulary.json inside this order's own package.

const fs = require('fs');
const path = require('path');

const ROOT = 'C:\\CRP-NEW';
const OUT = path.join(ROOT, 'SOURCE_CAPTURES', 'PHASE5-001R');
const readText = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const readJson = (rel) => JSON.parse(readText(rel));

const record = readJson('SOURCE_CAPTURES\\PHASE5-001Q\\rule_record.json');
const evaluator = require('./evaluator_001r.cjs');

const planLines = readText('CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md').split(/\r?\n/);
const BULLET_133 = planLines[132];
if (BULLET_133.indexOf('EXTRACTION_UNRESOLVED') === -1) throw new Error('line 133 is not the status bullet this builder cites');

const gateStatuses = [...new Set((BULLET_133.match(/`[A-Z_]+`/g) || []).map((t) => t.replace(/`/g, '')))];
const specified = [evaluator.FACT_STATUS.PRESENT, evaluator.FACT_STATUS.ABSENT_FROM_REPORT, evaluator.FACT_STATUS.CONTRADICTED, evaluator.FACT_STATUS.EXTRACTION_UNRESOLVED];
if (gateStatuses.length !== 4 || specified.some((s) => gateStatuses.indexOf(s) === -1)) {
  throw new Error('the gate names ' + gateStatuses.join(',') + ' but the specification defines ' + specified.join(','));
}

const statuses = [
  {
    status: evaluator.FACT_STATUS.PRESENT,
    definition: 'the scope was reliably inspected and the fact is printed there in a well-formed value, bound to its own record or to the page header as that fact requires',
    gate_reading: 'the gate names PRESENT first, as the status of a fact the report carries',
    reachable_for: {
      'collection.lastPaymentDate': 'a contract debt record prints the label exactly once, with a well-formed printed date that is a possible calendar date',
      'report.referenceDate': 'the header label appears on every page of the presentation and every printed value is identical and well formed',
    },
    not_reachable_via: 'nothing else: a value printed outside any contract debt record, or borrowed from another record, section or page, is never PRESENT',
  },
  {
    status: evaluator.FACT_STATUS.ABSENT_FROM_REPORT,
    definition: 'the relevant report section was reliably inspected and the report does not print the fact',
    gate_reading: 'the gate permits this status only after the relevant report section is reliably inspected',
    reachable_for: {
      'collection.lastPaymentDate': 'exactly one path: the Collections section is located and resolved and prints no contract debt record. It is a resolved reading of the report, never a parser silence.',
      'report.referenceDate': 'never. The convention input has no absence path, and the rule record says so explicitly.',
    },
    not_reachable_via: [
      'a missing parser field',
      'a failed or refused extraction',
      'a refused, unreadable or encrypted document',
      'a region that is not a contract debt record',
      'a label that is printed without a value',
      'a comparison that returned UNRESOLVED',
    ],
  },
  {
    status: evaluator.FACT_STATUS.CONTRADICTED,
    definition: 'the scope was reliably inspected and it prints two or more values for the one fact that cannot both be that fact',
    gate_reading: 'the gate names CONTRADICTED as a status in its own right, distinct from an unresolved extraction',
    reachable_for: {
      'report.referenceDate': 'the header label appears on every page but the printed values are not all identical',
      'collection.lastPaymentDate': 'specified as unreachable on this presentation. The only way it can print two values for one fact is a label printed twice inside one record, and the rule record\'s own binding rule maps that to EXTRACTION_UNRESOLVED. Cross-record comparison is forbidden by the record-isolation rule, so two records printing two different dates produce two independent facts and no contradiction.',
    },
    not_reachable_via: 'a missing value, a blank value, a malformed value, a page the method could not read, or a difference between two different records',
  },
  {
    status: evaluator.FACT_STATUS.EXTRACTION_UNRESOLVED,
    definition: 'the scope could not be read to a reliable conclusion, so the fact is neither printed-and-read nor absent',
    gate_reading: 'the gate names EXTRACTION_UNRESOLVED as the fourth status and forbids conflating it with ABSENT_FROM_REPORT',
    reachable_for: {
      'collection.lastPaymentDate': [
        'the Collections section was not located or was not resolved (SECTION_HEADING_NOT_FOUND, SECTION_HEADING_NOT_UNIQUE, SECTION_HEADING_WITHOUT_RECORD_ROWS, SECTION_CONTINUITY_GAP_AFTER_LAST_SECTION_PAGE, SECTION_READ_FAILURE)',
        'a contract debt record prints no Last Payment Date label (LABEL_NOT_PRINTED_ON_RECORD)',
        'a contract debt record prints the label more than once (LABEL_PRINTED_MORE_THAN_ONCE_IN_RECORD) — the rule record\'s own binding rule',
        'the label is printed without a value (LABEL_PRINTED_WITHOUT_VALUE)',
        'the value is not in the presentation\'s printed date form, or is an impossible calendar date (VALUE_NOT_A_WELL_FORMED_PRINTED_DATE)',
      ],
      'report.referenceDate': [
        'the header label is not found (HEADER_LABEL_NOT_FOUND)',
        'the header label is not on every page (HEADER_LABEL_NOT_ON_EVERY_PAGE)',
        'the printed value is not well formed or is impossible (REQUEST_DATE_NOT_A_WELL_FORMED_PRINTED_DATE)',
      ],
    },
    not_reachable_via: 'a document-level refusal, which is a document state and not a fact status',
  },
// __B2B__
];

const out = {
  artifact: 'extraction_status_vocabulary.json',
  work_order: 'PHASE5-001R',
  created_utc: '2026-09-30',
  document_type: 'EXTRACTION-STATUS VOCABULARY — one scope only. A specification for this unit. NOT ADMITTED',
  purpose: 'record the exact statuses this unit may assign to a fact, each reachable path to each of them, and every path that is not a status at all, so that no status is ever substituted for another and no refusal is ever reported as a fact state',
  governing_text_read: { document: 'CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md', section: 'section 3', line: 133, text: BULLET_133 },
  vocabulary_is_exact: {
    statuses_named_by_the_gate: gateStatuses,
    statuses_defined_by_this_specification: specified,
    identical: true,
    checked_by: 'the builder parses the gate line and refuses to write if the two sets differ',
  },
  statuses,
  the_separate_layers: {
    layer_1_presentation_eligibility: {
      values: [evaluator.DOCUMENT_STATE.ELIGIBLE, evaluator.DOCUMENT_STATE.REFUSED],
      why_it_is_not_a_fact_status: 'a document state describes the document. Recording a refused document as a fact status is exactly the conflation the gate forbids: a refused document is never an empty report.',
      refusal_causes_named: ['NOT_THE_EVIDENCED_SPECIMEN', 'NOT_A_PDF_CONTAINER', 'IMAGE_ONLY_OR_NO_TEXT_LAYER', 'PAGE_GEOMETRY_MISMATCH', 'SYNTHETIC_OR_FIXTURE_MARKER', 'DOCUMENT_NOT_READABLE', 'DOCUMENT_ENCRYPTED'],
    },
    layer_2_extraction_status: { values: specified, per_fact: true },
    layer_3_record_disposition: {
      values: [evaluator.RECORD_DISPOSITION.CONTRACT_DEBT_RECORD, evaluator.RECORD_DISPOSITION.NOT_A_DEBT_RECORD],
      why_it_is_not_a_fact_status: 'a region that is not the contract\'s debt record is never read for a value, so it produces no fact and no status. The rule record carries NOT_A_DEBT_RECORD in the same list as its statuses; this specification keeps it in this separate layer instead, and the earlier record is preserved unchanged rather than rewritten.',
    },
  },
  naming_note: {
    resolved_and_present_are_one_state: {
      the_rule_record_and_the_internal_implementation_call_it: 'RESOLVED',
      the_gate_calls_it: 'PRESENT',
      this_specification: 'uses the gate\'s name PRESENT and records the equivalence explicitly, so that the two names can never be read as two different states',
      behavioural_difference: 'none',
    },
  },
  the_recorded_non_conflations_carried_verbatim: record.report_facts.forbidden_substitutions,
  refusal_states: [
    { refusal: evaluator.REFUSALS.NO_JURISDICTION_SELECTION, produced_by: 'G1', reachable_when: 'no country/region selection was supplied', gate_condition_it_answers: 'wrong jurisdiction (absent selection)' },
    { refusal: evaluator.REFUSALS.JURISDICTION_NOT_THIS_UNIT, produced_by: 'G2', reachable_when: 'a selection was supplied and it is not CA / CA-NS', gate_condition_it_answers: 'wrong jurisdiction' },
    { refusal: evaluator.REFUSALS.UNSUPPORTED_PRESENTATION, produced_by: 'G3', reachable_when: 'the document is not the exact byte-pinned specimen, or carries a named document-level refusal cause', gate_condition_it_answers: 'an unsupported presentation, and an unreadable or unread extraction' },
    { refusal: evaluator.REFUSALS.WRONG_EVENT_DATE_MAPPING, produced_by: 'G4', reachable_when: 'the caller declares a mapping other than the recorded one for either event role', gate_condition_it_answers: 'wrong event-date mapping' },
    { refusal: evaluator.REFUSALS.RULE_RECORD_NOT_ADMITTED, produced_by: 'G6', reachable_when: 'the governed rule record is not in the state ADMITTED — which is the operative state of this scope today', gate_condition_it_answers: 'unapproved rules' },
    { refusal: evaluator.REFUSALS.UNRESOLVED_AFFIRMATIVE_ELEMENT, produced_by: 'G5', reachable_when: 'an input resolving to the excluded second limb, or another unresolved affirmative element, is supplied', gate_condition_it_answers: 'an unresolved affirmative element' },
  ],
  every_gate_condition_has_a_named_refusal: {
    incomplete_extraction: 'the fact layer reports the fact status and the comparison layer does not run; the extractor-level refusals are the statuses and reasons the reachable paths above name, not a substitute status',
    unapproved_rules: evaluator.REFUSALS.RULE_RECORD_NOT_ADMITTED,
    wrong_jurisdiction: [evaluator.REFUSALS.NO_JURISDICTION_SELECTION, evaluator.REFUSALS.JURISDICTION_NOT_THIS_UNIT],
    wrong_event_date_mapping: evaluator.REFUSALS.WRONG_EVENT_DATE_MAPPING,
    unresolved_affirmative_element: evaluator.REFUSALS.UNRESOLVED_AFFIRMATIVE_ELEMENT,
  },
  status_is_never_an_outcome: {
    comparison_outcome_vocabulary: record.report_facts.comparison_outcome_vocabulary,
    rule: 'a status describes what the report prints and an outcome describes what the arithmetic returns. Neither may be reported as the other, and no outcome may be reported as a status.',
  },
  boundaries: [
    'The vocabulary binds this unit only. It is not a corpus-wide status model and it admits no rule.',
    'A refusal is a state of this evaluator, not a finding, not a coverage claim and not a statement about any statute.',
    'Nothing here is consumer-visible: every status is internal audit data until an owner instrument authorizes a surface, and none exists.',
  ],
  created_by: 'PHASE5-001R',
};

fs.writeFileSync(path.join(OUT, 'extraction_status_vocabulary.json'), JSON.stringify(out, null, 2) + '\n', 'utf8');
console.log('extraction_status_vocabulary.json written: statuses ' + out.statuses.length + ' | refusal states ' + out.refusal_states.length);
