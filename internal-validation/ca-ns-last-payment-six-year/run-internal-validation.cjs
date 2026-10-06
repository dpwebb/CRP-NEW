'use strict';
/**
 * run-internal-validation.cjs — the unit's entry point.
 *
 * PHASE5-001I-A. It requires an explicit `CA` / `CA-NS` selection, requires the evidenced `PR-01` presentation,
 * refuses a synthetic model outright, and produces one internal, reproducible record. It emits nothing that is
 * consumer-visible, and it carries no finding.
 *
 * Usage:
 *   node run-internal-validation.cjs --country CA --region CA-NS --presentation PR-01 --report <path> [--out <file>]
 *   node run-internal-validation.cjs --country CA --region CA-NS --presentation PR-01 --pinned-specimen [--out <file>]
 */

const fs = require('fs');
const path = require('path');
const {
  WORK_ORDER, UNIT, PRESERVED_CLASSIFICATION, COMPARISON_OUTCOME, FACT_STATUS, BOUNDARIES
} = require('./constants.cjs');
const { buildPdfDocumentModel, readPinnedPresentationPointer } = require('./document-model.cjs');
const { PR_01_CONTRACT } = require('./presentation-contract.cjs');
const { extractFacts } = require('./extraction.cjs');
const { evaluateSixYearPeriod } = require('./six-year-evaluator.cjs');

const ROOT = 'C:\\CRP-NEW';

/** The explicit selection check. Exact, case-sensitive, enumerated codes only: never inferred. */
function checkSelection(country, region) {
  const enumerationPath = path.join(ROOT, 'CRP_JURISDICTION_ENUMERATION.md');
  const enumeration = fs.readFileSync(enumerationPath, 'utf8');
  const enumerated = new RegExp('\\| `' + country + '` \\| `' + region + '` \\|').test(enumeration);
  const authorized = country === UNIT.jurisdiction.country_code && region === UNIT.jurisdiction.region_code;
  return {
    country_code: country || null, region_code: region || null,
    explicit_selection_supplied: Boolean(country && region),
    authorized_for_this_unit: authorized,
    enumerated_in: 'CRP_JURISDICTION_ENUMERATION.md (CRP-JURISDICTION-ENUM-1)',
    enumerated_region_found: enumerated,
    jurisdiction_is_never_inferred_from_the_report: true,
    verdict: authorized && enumerated ? 'AUTHORIZED' : 'REFUSED'
  };
}

function refusalRecord(reason, selection) {
  return {
    artifact: 'internal_validation_result', work_order: WORK_ORDER, unit_id: UNIT.unit_id,
    produced: false, refused: true, refusal_reason: reason, selection_check: selection,
    legal_finding: null, finding_authorized: false, consumer_visible: false, boundaries: BOUNDARIES
  };
}

function evaluateModel(model, selectionCheck, evidencePointer, sourceLabel, options) {
  const opts = options || {};
  const syntheticTestInput = opts.synthetic_test_input === true;
  if (model.synthetic && !syntheticTestInput) {
    throw new Error('REFUSED_INTERNAL_INVARIANT: a synthetic model is never a report and never enters the evaluation path');
  }
  if (syntheticTestInput && !model.synthetic) {
    throw new Error('REFUSED_INTERNAL_INVARIANT: synthetic_test_input requires a synthetic model');
  }
  const extraction = extractFacts(model, evidencePointer, { synthetic_test_input: syntheticTestInput });
  const requestDate = extraction.request_date;
  const comparisons = extraction.last_payment_facts.map((fact) => ({
    record_index: fact.record_index,
    last_payment_fact_status: fact.status,
    last_payment_fact_reason: fact.reason,
    last_payment_date: fact.status === FACT_STATUS.RESOLVED ? fact.normalized_value : null,
    last_payment_printed_value: fact.status === FACT_STATUS.RESOLVED ? fact.raw_value : null,
    last_payment_locator: fact.location || null,
    reference_date: requestDate.status === FACT_STATUS.RESOLVED ? requestDate.normalized_value : null,
    evaluation: fact.status === FACT_STATUS.RESOLVED && requestDate.status === FACT_STATUS.RESOLVED
      ? evaluateSixYearPeriod(fact.normalized_value, requestDate.normalized_value)
      : {
        outcome: COMPARISON_OUTCOME.UNRESOLVED,
        reason: fact.status !== FACT_STATUS.RESOLVED
          ? `LAST_PAYMENT_FACT_${fact.status}:${fact.reason}`
          : `REFERENCE_DATE_${requestDate.status}:${requestDate.reason}`,
        last_payment_date: null, reference_date: null, anniversary: null,
        intervening_days: null, six_year_span_in_days: null, boundary_case: null
      }
  }));

  const outcomeCounts = {};
  for (const c of comparisons) outcomeCounts[c.evaluation.outcome] = (outcomeCounts[c.evaluation.outcome] || 0) + 1;

  return {
    artifact: 'internal_validation_result',
    work_order: WORK_ORDER,
    unit_id: UNIT.unit_id,
    produced: true,
    refused: false,
    refusal_reason: null,
    source_label: sourceLabel,
    source_digest: model.sha256,
    result_provenance: {
      presentation_evidence: !syntheticTestInput,
      synthetic_test_input: syntheticTestInput,
      admitted_document: extraction.admission.state === 'ADMITTED_PINNED_SPECIMEN',
      note: syntheticTestInput
        ? 'synthetic test input: this result is arithmetic and locator evidence only and is never presentation evidence for a report'
        : 'produced from the evidenced presentation under the structural contract'
    },
    selection_check: selectionCheck,
    rule_reference: {
      unit_id: UNIT.unit_id, limb: UNIT.limb, citation: UNIT.citation,
      source_entry_id: UNIT.source_entry_id, legacy_rule_id: UNIT.legacy_rule_id,
      jurisdiction: UNIT.jurisdiction, statutory_text_as_admitted: UNIT.statutory_text_as_admitted,
      admitted_source_artifact: UNIT.admitted_source_artifact,
      admitted_source_artifact_sha256: UNIT.admitted_source_artifact_sha256
    },
    presentation_contract: {
      presentation_id: PR_01_CONTRACT.presentation_id,
      evidenced_artifact_id: PR_01_CONTRACT.evidenced_artifact_id,
      evidenced_sha256: PR_01_CONTRACT.evidenced_sha256,
      evidenced_geometry: PR_01_CONTRACT.observed_geometry,
      boundary: PR_01_CONTRACT.boundary
    },
    admission: {
      state: extraction.admission.state, refusal_reason: extraction.admission.refusal_reason,
      predicates: extraction.admission.predicates
    },
    extraction: {
      request_date: requestDate,
      collections_section: extraction.collections_section,
      debt_records: extraction.debt_records,
      last_payment_facts: extraction.last_payment_facts,
      last_payment_fact_summary: extraction.last_payment_fact_summary
    },
    comparisons,
    comparison_summary: {
      resolved_comparisons: comparisons.filter((c) => c.evaluation.outcome !== COMPARISON_OUTCOME.UNRESOLVED).length,
      unresolved_comparisons: comparisons.filter((c) => c.evaluation.outcome === COMPARISON_OUTCOME.UNRESOLVED).length,
      outcomes: outcomeCounts,
      note: 'these are internal arithmetic outcomes, not legal findings'
    },
    classification: PRESERVED_CLASSIFICATION,
    result_qualifications: [
      'timing: the effective period of s. 10(3)(c) is unresolved in the admitted record, so any output carries a plain-language timing qualification (PROD-003 dependency D-4)',
      'classification: the recorded legacy D3 / observation classification is preserved and is not overridden by this order; the unit may not emit a PROBABLE_VIOLATION',
      'single specimen: the locator is demonstrated on one presentation only (PROD-003 dependency D-2)',
      'field-name divergence: the admitted legacy rule record names tradeline.lastPaymentDate while the evidenced presentation prints the field on a collection record',
      'boundary: the sixth-anniversary boundary convention is recorded in each comparison, and the inclusive/exclusive reading is a legal question for the rule record',
      'gate: no gate is passed by this unit, and no consumer-visible output of any class is produced'
    ],
    legal_finding: null,
    finding_authorized: false,
    consumer_visible: false,
    boundaries: BOUNDARIES
  };
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const [key, inline] = token.slice(2).split('=');
    if (inline !== undefined) args[key] = inline;
    else if (argv[i + 1] && !argv[i + 1].startsWith('--')) { args[key] = argv[i + 1]; i += 1; }
    else args[key] = true;
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const selection = checkSelection(args.country, args.region);

  const write = (record, code) => {
    const text = JSON.stringify(record, null, 2) + '\n';
    if (args.out) fs.writeFileSync(path.resolve(args.out), text, 'utf8');
    console.log(text.trimEnd());
    process.exitCode = code;
  };

  if (!selection.explicit_selection_supplied) return write(refusalRecord('REFUSED_NO_JURISDICTION_SELECTION_SUPPLIED', selection), 2);
  if (selection.verdict !== 'AUTHORIZED') return write(refusalRecord('REFUSED_JURISDICTION_NOT_AUTHORIZED_FOR_THIS_UNIT', selection), 2);
  if (args.presentation !== UNIT.presentation_required) return write(refusalRecord('REFUSED_PRESENTATION_NOT_THE_EVIDENCED_ONE', selection), 2);

  const evidence = readPinnedPresentationPointer();
  let reportPath = args.report;
  let sourceLabel = 'operator-supplied local document';
  if (args['pinned-specimen']) {
    reportPath = evidence.absolute_path;
    sourceLabel = `the pinned specimen ${evidence.artifact_id}, at the path recorded by PROD-003's register`;
  }
  if (!reportPath || reportPath === true) return write(refusalRecord('REFUSED_NO_DOCUMENT_SUPPLIED', Object.assign({}, selection, { presentation: args.presentation })), 2);

  const model = buildPdfDocumentModel(path.resolve(reportPath));
  const record = evaluateModel(model, Object.assign({}, selection, { presentation: args.presentation }), evidence, sourceLabel);
  return write(record, 0);
}

if (require.main === module) main();

module.exports = { evaluateModel, checkSelection, refusalRecord, parseArgs, main };
