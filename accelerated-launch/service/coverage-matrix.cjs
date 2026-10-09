'use strict';
/**
 * coverage-matrix.cjs — the single source of truth for "what does this build read, and what is still missing".
 *
 * B6-INGEST-001. The supported rows are DERIVED from the registered extraction adapters (`formats.cjs`), so the
 * "N named report presentations" count and the consumer-facing read-support sentence can never drift from the
 * registry again — the B4-continuation addition of the TransUnion Canada family previously left the
 * results/server messaging stuck at "four", and this module removes that failure mode.
 *
 * The only static data here is the authored coverage matrix (`../coverage-matrix.json`), which records the
 * evidence class, channel, native/scan support, extraction fields, compatible assessments and the acquisition
 * queue for every bureau/country combination. It admits no new format: a bureau that has no genuine consumer
 * specimen is recorded MISSING, never promoted to supported.
 */

const formats = require('./formats.cjs');
const matrixData = require('../coverage-matrix.json');
const commonErrors = require('./common-errors.cjs');

/** Return a fresh copy of the authored matrix, so callers can never mutate the cached module singleton. */
function loadMatrix() {
  const matrix = JSON.parse(JSON.stringify(matrixData));
  // Derive machine-readable check coverage from the reader's current fact contract.
  // Authored source/layout evidence remains separate; fields alone prove no violation.
  const capability = (id) => ({
    shared_fact_fields: [...(commonErrors.PRESENTATION_FIELD_CAPABILITY[id] || [])],
    checklist_capability: commonErrors.presentationCapability(id).all_factual_checks,
    basis: 'Reader capability only. Actual report facts, source evidence, account pairing and consumer packet delivery are measured separately.'
  });
  if (matrix.general_intake) Object.assign(matrix.general_intake, capability(matrix.general_intake.presentation_id));
  for (const rows of Object.values(matrix.markets || {})) {
    for (const row of rows) {
      if (row.presentation_id) Object.assign(row, capability(row.presentation_id));
      else if (row.support_state === 'MISSING') {
        row.support_scope = 'DEDICATED_LAYOUT_EVIDENCE_MISSING';
        row.general_intake_available = true;
      }
    }
  }
  return matrix;
}

const NUMBER_WORDS = Object.freeze(['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']);

function numberWord(n) {
  return NUMBER_WORDS[n] !== undefined ? NUMBER_WORDS[n] : String(n);
}

/**
 * A short label per presentation_id, used to build the read-support sentence. The keys are exactly the
 * presentation_ids the registry holds; `validation()` fails if either side drifts, so a sixth adapter can
 * never be added without also naming it here (and vice versa).
 */
const READ_SUPPORT_LABELS = Object.freeze({
  'PR-01': 'one Equifax Canada consumer specimen admitted by digest',
  'FAM-TU-CA-CONSUMER': 'one TransUnion Canada consumer disclosure admitted by a measured structural contract',
  'FAM-AU-EQX-CONSUMER': 'one Equifax Australia consumer credit file',
  'US-CONSUMER-DISCLOSURE': 'one Experian United States consumer-disclosure format family',
  'FAM-GB-EXP-CONSUMER': 'one Experian United Kingdom consumer format family evidenced by structure from a single captured consumer report example of a recorded vintage'
});

function supportedPresentations() {
  return formats.listSupportedFormats();
}

/**
 * The sentence a result set and the startup banner carry: it names every presentation this build reads and
 * states, in the same breath, that nothing else is read. Generated from the registry, so the count cannot drift.
 */
function readSupportQualification() {
  const rows = supportedPresentations();
  const names = rows.map((r) => READ_SUPPORT_LABELS[r.presentation_id] || `one ${r.display_name}`);
  return (
    `We have tested this service on ${numberWord(rows.length)} report layouts: ` +
    names.join(', ') +
    '. The US and Australia examples are dated 2015 and 2016; the UK Experian example is dated 2007. These examples do not certify every current report layout. ' +
    'We also read recognizable bureau reports in a general way, including the supported UK TransUnion consumer fields. ' +
    'We then use the facts we can read. If a document is not a credit report, or we cannot read it, we say which of the two it is and what to do next.'
  );
}

/** Every bureau/country combination the matrix records as MISSING. */
function missingRows() {
  const matrix = loadMatrix();
  const out = [];
  for (const market of Object.keys(matrix.markets || {})) {
    for (const row of matrix.markets[market]) {
      if (row.support_state === 'MISSING') out.push(row);
    }
  }
  return out;
}

/** The ordered acquisition queue, as authored in the matrix. */
function acquisitionQueue() {
  return (loadMatrix().acquisition_queue || []).slice();
}

const SUPPORTED_STATES = Object.freeze(['SUPPORTED_EXACT_SPECIMEN', 'SUPPORTED_FAMILY', 'HISTORICAL_EVIDENCE_ONLY']);

/**
 * Cross-check the authored matrix against the registry, so the JSON and the running adapters cannot disagree.
 * Returns `{ ok, problems }`; the test section asserts `ok` is true.
 */
function validation(matrix = loadMatrix()) {
  const problems = [];
  const registry = new Map(supportedPresentations().map((r) => [r.presentation_id, r]));

  for (const id of Object.keys(READ_SUPPORT_LABELS)) {
    if (!registry.has(id)) problems.push(`read-support label key ${id} is not a registered presentation`);
  }
  for (const row of supportedPresentations()) {
    if (!READ_SUPPORT_LABELS[row.presentation_id]) {
      problems.push(`presentation ${row.presentation_id} has no read-support label`);
    }
  }

  for (const market of Object.keys(matrix.markets || {})) {
    for (const row of matrix.markets[market]) {
      if (!SUPPORTED_STATES.includes(row.support_state)) continue;
      const reg = row.presentation_id ? registry.get(row.presentation_id) : null;
      if (!reg) {
        problems.push(`${market} ${row.bureau}: supported row references unknown presentation ${row.presentation_id}`);
        continue;
      }
      if (reg.read_support_is !== row.admission_path) {
        problems.push(`${market} ${row.bureau}: admission_path mismatch (matrix ${row.admission_path}, registry ${reg.read_support_is})`);
      }
      if (row.evidence?.present_day !== reg.present_day_support_claimed) {
        problems.push(`${market} ${row.bureau}: current-layout currency mismatch`);
      }
    }
  }

  const general = matrix.general_intake;
  if (general?.presentation_id !== 'GENERAL-BUREAU-REPORT'
    || general?.admission_path !== 'BUREAU_AND_REPORT_CONTENT_PLAUSIBILITY') problems.push('GENERAL intake scope mismatch');
  const expected = formats.presentationScope().GB.general_field_contract;
  const current = general?.current_field_contracts?.find((row) => row.contract_id === expected.contract_id);
  if (!current || current.scope !== expected.scope || current.country !== 'GB'
    || current.source_version !== expected.source_version || current.source_locator !== expected.source_locator
    || current.whole_current_layout_certified !== false
    || JSON.stringify(current.regions) !== JSON.stringify(expected.regions)) {
    problems.push('current UK GENERAL field contract mismatch');
  }

  return { ok: problems.length === 0, problems };
}

module.exports = {
  loadMatrix,
  numberWord,
  supportedPresentations,
  readSupportQualification,
  missingRows,
  acquisitionQueue,
  validation
};
