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

/** Return a fresh copy of the authored matrix, so callers can never mutate the cached module singleton. */
function loadMatrix() {
  return JSON.parse(JSON.stringify(matrixData));
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
    `Read support is evidenced for ${numberWord(rows.length)} named report presentations and no others: ` +
    names.join(', ') +
    '. Beyond those, a general intake accepts a plausible credit report from any bureau when it identifies the bureau and prints report-like content, and extracts whatever facts it can read. ' +
    'A clearly unrelated document and an unreadable report are refused separately, each with its own explanation.'
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
function validation() {
  const problems = [];
  const matrix = loadMatrix();
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
    }
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
