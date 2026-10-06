'use strict';
/**
 * presentation-contract.cjs — the documented structural contract a document must satisfy to be read, and the
 * admission gate that refuses everything else.
 *
 * PHASE5-001I-A. The contract is deliberately narrower than "an Equifax Canada report": the evidenced support
 * is one specimen of one presentation. A document that satisfies the structural predicates but is not the
 * evidenced specimen is refused as NOT_THE_EVIDENCED_SPECIMEN, because one specimen does not establish support
 * for every report from that bureau.
 */

const { FACT_STATUS, REFUSAL_REASONS } = require('./constants.cjs');
const { readPinnedPresentationPointer } = require('./document-model.cjs');

const PR_01_CONTRACT = Object.freeze({
  presentation_id: 'PR-01',
  definition: 'the Equifax Canada consumer-channel credit report evidenced by PROD-003\'s register',
  publisher: 'Equifax (Canada, consumer channel)',
  market: 'CA',
  audience: 'CONSUMER',
  container: 'PDF',
  page_count: 22,
  page_size_label: 'A4',
  page_size_tolerance_pt: 0.5,
  native_text_on_every_page: true,
  section_heading: 'Collections',
  header_label: 'Request Date',
  record_boundary_label: 'Date Assigned',
  printed_date_form: 'DDDD/DD/DD — four-digit year, month, day (as this presentation prints it)',
  observed_geometry: { width_pt: 594.96, height_pt: 841.92 },
  evidenced_artifact_id: 'LEG-CONSUMER-EQ-CA',
  evidenced_sha256: 'E439A4BB1E43AF640DFE7867473BE0EF8EC13B2B8654F41C31138D86A107AE5F',
  evidence_source: 'SOURCE_CAPTURES\\PROD-003\\report_representation_register.json presentations[PR-01]; re-verified by digest in this order',
  boundary: 'Read support is evidenced for this specimen only. A second independently authorized Equifax Canada consumer specimen is required before this locator may be called reusable (PROD-003 dependency D-2).'
});

function near(a, b, tolerance) {
  return typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) <= tolerance;
}

/**
 * Every predicate is evaluated and recorded, so a refusal states the whole measured shape of the document
 * rather than only the first thing that failed. The admission outcome is the first failing predicate.
 */
function admissionPredicates(model, expected) {
  const predicates = [];
  const push = (id, passed, detail, refusal_reason) => predicates.push({ id, passed, detail, refusal_reason: passed ? null : refusal_reason });

  const unreadable = model.read_errors.some((e) => e.stage === 'open' || e.stage === 'pdfinfo') || model.not_a_pdf;
  push('INPUT_PRESENT_AND_READABLE', !unreadable && model.pages.length > 0,
    unreadable ? 'the document could not be opened or parsed' : `${model.page_count} pages read`,
    model.not_a_pdf ? 'NOT_A_PDF_CONTAINER' : 'DOCUMENT_NOT_READABLE');
  push('CONTAINER_IS_A_PDF', model.not_a_pdf !== true, model.kind, 'NOT_A_PDF_CONTAINER');
  push('NOT_ENCRYPTED', model.encrypted !== true, `encrypted=${model.encrypted}`, 'DOCUMENT_ENCRYPTED');

  const everyPageHasText = model.pages.length > 0 && model.pages.every((p) => p.has_native_text);
  const emptyPages = model.pages.filter((p) => !p.has_native_text).map((p) => p.page);
  push('NATIVE_TEXT_ON_EVERY_PAGE', everyPageHasText && model.read_errors.every((e) => e.stage !== 'pdftotext'),
    everyPageHasText ? 'all pages carry native text' : `pages without native text: ${emptyPages.join(',') || 'none read'}`,
    'IMAGE_ONLY_OR_NO_TEXT_LAYER');

  const size = model.page_size || { width_pt: null, height_pt: null, label: null };
  const sizeMatches = near(size.width_pt, PR_01_CONTRACT.observed_geometry.width_pt, PR_01_CONTRACT.page_size_tolerance_pt)
    && near(size.height_pt, PR_01_CONTRACT.observed_geometry.height_pt, PR_01_CONTRACT.page_size_tolerance_pt);
  const countMatches = model.page_count === PR_01_CONTRACT.page_count;
  push('PAGE_GEOMETRY_MATCHES_CONTRACT', sizeMatches && countMatches,
    `${model.page_count} pages at ${size.width_pt}x${size.height_pt} pts (${size.label})`,
    'PAGE_GEOMETRY_MISMATCH');

  const markers = model.synthetic_markers_found || [];
  push('NO_SYNTHETIC_OR_FIXTURE_MARKER', markers.length === 0,
    markers.length === 0 ? 'no synthetic or fixture marker' : `synthetic or fixture marker present: ${markers.join(', ')}`,
    'SYNTHETIC_OR_FIXTURE_MARKER');

  const digestMatches = typeof model.sha256 === 'string' && model.sha256.toUpperCase() === expected.sha256.toUpperCase();
  push('EVIDENCED_SPECIMEN_DIGEST_MATCH', digestMatches,
    digestMatches ? `digest matches the evidenced specimen (${expected.artifact_id})` : `digest ${model.sha256 || 'unknown'} is not the evidenced specimen digest`,
    'NOT_THE_EVIDENCED_SPECIMEN');

  return predicates;
}

/**
 * Admit a document, or refuse it and name the refusal reason and the fact status that reason produces.
 * `evidence` is the evidenced presentation pointer; it defaults to PROD-003's register record.
 */
function admitDocument(model, evidence) {
  const expected = evidence || readPinnedPresentationPointer();
  const predicates = admissionPredicates(model, expected);
  const firstFailure = predicates.find((p) => !p.passed);
  if (!firstFailure) {
    return {
      state: 'ADMITTED_PINNED_SPECIMEN', admitted: true, refusal_reason: null, fact_status: null,
      evidenced_specimen: { artifact_id: expected.artifact_id, presentation_id: expected.presentation_id, sha256: expected.sha256 },
      predicates
    };
  }
  return {
    state: 'REFUSED', admitted: false,
    refusal_reason: firstFailure.refusal_reason,
    fact_status: REFUSAL_REASONS[firstFailure.refusal_reason],
    evidenced_specimen: { artifact_id: expected.artifact_id, presentation_id: expected.presentation_id, sha256: expected.sha256 },
    predicates
  };
}

module.exports = { PR_01_CONTRACT, admitDocument, admissionPredicates, FACT_STATUS };
