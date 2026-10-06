'use strict';
/**
 * build_001i_a_run_records.cjs — the pinned run's extraction and evaluation records.
 *
 * PHASE5-001I-A. Runs the unit once on the evidenced presentation through the unit's own entry point and
 * writes SOURCE_CAPTURES\PHASE5-001I-A\extraction_results.json and evaluation_results.json. Nothing here is
 * consumer-visible, nothing is uploaded and no report content beyond the two printed dates (already recorded
 * by PROD-003) is written.
 */

const fs = require('fs');
const path = require('path');

const {
  WORK_ORDER, UNIT, PRESERVED_CLASSIFICATION, FACT_STATUS, COMPARISON_OUTCOME, REFUSAL_REASONS, BOUNDARIES
} = require('../../internal-validation/ca-ns-last-payment-six-year/constants.cjs');
const { readPinnedPresentationPointer } = require('../../internal-validation/ca-ns-last-payment-six-year/document-model.cjs');
const { PR_01_CONTRACT } = require('../../internal-validation/ca-ns-last-payment-six-year/presentation-contract.cjs');
const { evaluateModel, checkSelection } = require('../../internal-validation/ca-ns-last-payment-six-year/run-internal-validation.cjs');
const { buildPdfDocumentModel } = require('../../internal-validation/ca-ns-last-payment-six-year/document-model.cjs');

const ROOT = 'C:\\CRP-NEW';
const OUT = path.join(ROOT, 'SOURCE_CAPTURES', 'PHASE5-001I-A');
const TODAY = new Date().toISOString().slice(0, 10);

const EVIDENCE = readPinnedPresentationPointer();
const SELECTION = checkSelection('CA', 'CA-NS');
const MODEL = buildPdfDocumentModel(EVIDENCE.absolute_path);
const RUN = evaluateModel(MODEL, Object.assign({}, SELECTION, { presentation: 'PR-01' }), EVIDENCE, 'the pinned specimen');

function write(name, doc) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), JSON.stringify(doc, null, 2) + '\n', 'utf8');
  return name;
}

// ------------------------------------------------------------------ extraction
write('extraction_results.json', {
  artifact: 'extraction_results.json',
  work_order: WORK_ORDER,
  created_utc: TODAY,
  purpose: 'the bounded extraction on the evidenced presentation: the two facts, their printed and normalized values, their precise locators, and the status model that keeps every failure distinct from absence',
  unit: {
    unit_id: UNIT.unit_id, limb: UNIT.limb, jurisdiction: UNIT.jurisdiction,
    bureau_and_channel: UNIT.bureau_and_channel, presentation_required: UNIT.presentation_required,
    citation: UNIT.citation, source_entry_id: UNIT.source_entry_id, legacy_rule_id: UNIT.legacy_rule_id
  },
  inputs: {
    selection_check: SELECTION,
    evidenced_presentation: {
      presentation_id: EVIDENCE.presentation_id, artifact_id: EVIDENCE.artifact_id,
      publisher: EVIDENCE.publisher, audience: EVIDENCE.audience, market: EVIDENCE.market,
      sha256: EVIDENCE.sha256, bytes: EVIDENCE.bytes, pages: EVIDENCE.pages,
      pointer_source: EVIDENCE.pointer_source
    },
    extraction_method: MODEL.text_extraction_tool,
    structure_method: MODEL.structure_tool
  },
  admission: RUN.admission,
  document_shape: {
    page_count: MODEL.page_count, page_size: MODEL.page_size.label,
    width_pt: MODEL.page_size.width_pt, height_pt: MODEL.page_size.height_pt,
    encrypted: MODEL.encrypted, native_text_pages: MODEL.pages.filter((p) => p.has_native_text).length
  },
  fact_records: [RUN.extraction.request_date].concat(RUN.extraction.last_payment_facts),
  collections_section: RUN.extraction.collections_section,
  collection_records: RUN.extraction.debt_records,
  last_payment_fact_summary: RUN.extraction.last_payment_fact_summary,
  status_model: {
    states: Object.values(FACT_STATUS),
    substitutions_forbidden: [
      'EXTRACTION_UNRESOLVED is never ABSENT_FROM_REPORT',
      'a parser failure is never absence and never evidence',
      'a non-debt region is never read for a value',
      'a refused document is never an empty report'
    ],
    refusal_reasons_and_the_status_each_produces: REFUSAL_REASONS,
    demonstrable_absence_path_used_here: 'the Collections section is located and resolved and prints no contract debt record — a resolved reading, not a parser silence',
    reachable_absence_rule: 'a per-record missing, blank or differently-labelled value is EXTRACTION_UNRESOLVED; ABSENT_FROM_REPORT attaches only to the resolved-section-with-no-record case'
  },
  cross_record_isolation: {
    rule: 'each contract debt record is a separate fact target delimited by its own boundary label; a date printed in another record or another section is never read for it',
    records_measured: RUN.extraction.debt_records.length,
    distinct_locators_measured: new Set(RUN.extraction.last_payment_facts.map((f) => `${f.location && f.location.page}:${f.location && f.location.line}`)).size
  },
  result_qualifications: RUN.result_qualifications,
  consumer_visible: false,
  finding_authorized: false,
  boundaries: BOUNDARIES
});

module.exports = { RUN, MODEL, EVIDENCE, OUT, TODAY, write, UNIT, PR_01_CONTRACT, PRESERVED_CLASSIFICATION, COMPARISON_OUTCOME };
