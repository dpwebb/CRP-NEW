'use strict';
/**
 * ak-ingest-008-009-010.cjs — OWNER-ACCEPT-009 GAP-INGEST-008/-009/-010: partial native-text recovery,
 * combined-report bureau segmentation, and upload limits.
 */
const generalIntake = require('../../general-intake.cjs');
const formats = require('../../formats.cjs');
const uploads = require('../../uploads.cjs');
const evaluation = require('../../evaluation.cjs');
const { makeSyntheticModel } = require('../../../../internal-validation/ca-ns-last-payment-six-year/document-model.cjs');

async function run(t, check) {
  const evidence = {};

  /* ------------------------------------------------------------------ GAP-INGEST-008: mergeRecoveredLines dedups and never substitutes */
  const nativeLines = [
    { text: 'Equifax Consumer Credit Report', page: 1, line: 1, source: 'NATIVE_TEXT', trusted: true, confidence: null, bbox: null },
    { text: 'Creditor A Balance $100', page: 1, line: 2, source: 'NATIVE_TEXT', trusted: true, confidence: null, bbox: null }
  ];
  const ocrLines = [
    { text: 'Creditor A Balance $100', page: 1, line: 2, source: 'LOCAL_OCR', trusted: true, confidence: 95, bbox: { x0: 0, y0: 0, x1: 1, y1: 1 } },
    { text: 'Closed 02/02/2021', page: 1, line: 3, source: 'LOCAL_OCR', trusted: true, confidence: 94, bbox: { x0: 0, y0: 20, x1: 1, y1: 21 } }
  ];
  const merged = generalIntake.mergeRecoveredLines(nativeLines, ocrLines);
  check.equal(merged.length, 3, 'a duplicate OCR line is not added twice');
  check.equal(merged.filter((l) => l.text === 'Creditor A Balance $100').length, 1, 'the native value is kept once');
  check.equal(merged.find((l) => l.text === 'Creditor A Balance $100').source, 'NATIVE_TEXT', 'and the native source is preserved');
  check.equal(merged.find((l) => l.text === 'Closed 02/02/2021').source, 'LOCAL_OCR', 'a recovered line keeps its OCR source and coordinates');
  check.ok(merged.find((l) => l.text === 'Closed 02/02/2021').bbox, 'with its bounding box');

  const conflictMerged = generalIntake.mergeRecoveredLines([{ text: 'Balance $100', source: 'NATIVE_TEXT' }], [{ text: 'Balance $200', source: 'LOCAL_OCR' }]);
  check.equal(conflictMerged.length, 2, 'conflicting native and OCR values are both kept, never substituted');

  const dupLocations = generalIntake.mergeRecoveredLines(
    [{ text: 'Balance $100', source: 'NATIVE_TEXT' }],
    [
      { text: 'Balance $100', source: 'LOCAL_OCR', bbox: { x0: 0, y0: 0, x1: 10, y1: 10 } },
      { text: 'Balance $100', source: 'LOCAL_OCR', bbox: { x0: 0, y0: 200, x1: 10, y1: 210 } }
    ]
  );
  check.equal(dupLocations.filter((l) => l.text === 'Balance $100').length, 3, 'identical text at different account locations is kept, never collapsed');

  /* ------------------------------------------------------------------ GAP-INGEST-009: bureau-section boundaries */
  check.equal(generalIntake.bureauSectionOf('Experian Consumer Credit Report'), 'Experian', 'a bureau report header is a section');
  check.equal(generalIntake.bureauSectionOf('Equifax Consumer Credit File'), 'Equifax', 'a credit file header is a section');
  check.equal(generalIntake.bureauSectionOf('Experian Credit Card'), null, 'a creditor name is not a section');
  check.equal(generalIntake.bureauSectionOf('TransUnion Credit Report'), 'TransUnion', 'a TransUnion report header is a section');

  const combined = makeSyntheticModel({ pages: [[
    'Experian Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor A  Balance $100  Opened 01/01/2015',
    'Equifax Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor B  Balance $200  Opened 02/02/2019'
  ]] });
  const combinedExt = formats.extractWithSharedAdapter(combined, { mode: 'REPORT', country: 'US' });
  check.equal(combinedExt.records.length, 2, 'a combined report yields two records');
  check.deepEqual(combinedExt.records.map((r) => r.bureau).sort(), ['Equifax', 'Experian'], 'each record is attributed to its own bureau section');
  check.equal(combinedExt.bureaus.length, 2, 'and both bureaus are reported');
  const differentDates = formats.extractWithSharedAdapter(makeSyntheticModel({ pages: [[
    'Experian Consumer Credit Report', 'Report Date: June 12, 2020', 'Account A 30 days past due as of June 2015',
    'Equifax Consumer Credit Report', 'Report Date: June 12, 2026', 'Account B 30 days past due as of June 2015'
  ]] }), { mode: 'REPORT', country: 'US' });
  check.deepEqual(differentDates.records.map(r => r.report_reference_date.normalized_value), ['2020-06-12', '2026-06-12'], 'combined records retain their own section reference dates');
  const evaluated = evaluation.evaluateCase({ country: 'US', region: 'US-NY', extraction: differentDates });
  check.deepEqual(evaluated.results.filter(r => r.check.adapter_id === 'FCRA-605A-5-US-NATIONAL-7Y').map(r => r.machine.outcome), ['PERIOD_NOT_EXCEEDED', 'PERIOD_EXCEEDED'], 'real assessments use each bureau section date, never the neighboring report date');
  check.equal(generalIntake.bureauSectionOf('Equifax Credit Report: contact Experian about your rights'), null, 'a rights notice does not establish a bureau section');
  const conflicting = formats.extractWithSharedAdapter(makeSyntheticModel({ pages: [[
    'Equifax Consumer Credit Report', 'Report Date: June 12, 2020', 'Report Date: June 12, 2026', 'Account A 30 days past due as of June 2015'
  ]] }), { mode: 'REPORT', country: 'US' });
  check.equal(conflicting.records[0].report_reference_date.status, 'EXTRACTION_UNRESOLVED', 'conflicting headers within one section withhold its reference date');
  const noBorrow = formats.extractWithSharedAdapter(makeSyntheticModel({ pages: [[
    'Experian Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor A Opened January 15, 2018',
    'Equifax Consumer Credit Report', 'Closed January 15, 2020'
  ]] }), { mode: 'REPORT', country: 'US' });
  check.ok(!noBorrow.records[0].facts['liability.closedDate'], 'a field in the next bureau section is not attached to the prior account');
  check.equal(noBorrow.records[1].report_reference_date.status, 'EXTRACTION_UNRESOLVED', 'a dateless different-bureau section never borrows the first report date');
  const ambiguous = formats.extractWithSharedAdapter(makeSyntheticModel({ pages: [[
    'Equifax Experian Credit Report', 'Report Date: June 12, 2026', 'Account A 30 days past due as of June 2015'
  ]] }), { mode: 'REPORT', country: 'US' });
  check.equal(ambiguous.records[0].report_reference_date.reason, 'AMBIGUOUS_REPORT_SEGMENT', 'multiple bureau names in one ambiguous heading cannot establish a date association');
  const repeated = formats.extractWithSharedAdapter(makeSyntheticModel({ pages: [
    ['Equifax Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor A Opened January 15, 2018'],
    ['Equifax Consumer Credit Report', 'Continued', 'Closed January 15, 2020']
  ] }), { mode: 'REPORT', country: 'US' });
  check.equal(repeated.records.length, 1, 'a repeated same-bureau header on a dateless continuation preserves its account boundary');

  /* ------------------------------------------------------------------ GAP-INGEST-010: upload limits surface */
  const limits = uploads.uploadLimits();
  check.equal(limits.max_file_bytes, 10 * 1024 * 1024, 'the per-file limit is 10 MB');
  check.equal(limits.max_case_files, 8, 'the per-case limit is 8 files');
  check.equal(limits.max_account_stored_bytes, 40 * 1024 * 1024, 'the per-account limit is 40 MB');
  check.deepEqual(limits.supported_mime_prefixes, ['application/pdf', 'image/png', 'image/jpeg'], 'PDF/PNG/JPEG are supported');
  check.deepEqual(limits.supported_extensions, ['.pdf', '.png', '.jpg', '.jpeg'], 'and their extensions are supported');
  check.deepEqual(limits.unsupported_containers, ['HEIC', 'HEIF', 'TIFF', 'ZIP'], 'HEIC/HEIF/TIFF/ZIP are explicitly bounded, never advertised as supported');
  check.equal(limits.max_image_pixels, 25000000, 'the image pixel cap is exposed');
  check.equal(limits.max_image_dimension, 12000, 'and the image dimension cap is exposed');
  check.ok(/HEIC|TIFF/.test(limits.recovery), 'recovery names HEIC/TIFF conversion');
  check.ok(/split|smaller readable PDF/i.test(limits.recovery), 'recovery gives splitting/smaller-PDF guidance for oversized reports');
  check.equal(uploads.detectContainerFromBytes(Buffer.from('%PDF-1.4')), 'PDF', 'PDF magic is detected');
  check.equal(uploads.detectContainerFromBytes(Buffer.from([0xff, 0xd8, 0xff, 0xe0])), 'IMAGE', 'JPEG magic is detected');
  check.ok(/never reported as a complete review/.test(limits.guidance), 'a refused upload is never reported as complete');

  /* GAP-INGEST-010: the image-dimension bound is enforced, not merely advertised. */
  const smallPng = Buffer.alloc(24);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(smallPng, 0);
  smallPng.writeUInt32BE(800, 16);
  smallPng.writeUInt32BE(600, 20);
  let dimCode = null;
  try { uploads.validateImageDimensions(smallPng); } catch (err) { dimCode = err.code; }
  check.equal(dimCode, null, 'a modest PNG passes the dimension bound');

  const hugePng = Buffer.alloc(24);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(hugePng, 0);
  hugePng.writeUInt32BE(13000, 16);
  hugePng.writeUInt32BE(600, 20);
  let hugeCode = null;
  try { uploads.validateImageDimensions(hugePng); } catch (err) { hugeCode = err.code; }
  check.equal(hugeCode, 'IMAGE_DIMENSIONS_TOO_LARGE', 'an image wider than 12,000 px is refused');

  /* GAP-INGEST-010: retry receipt reconstruction never loses the stored evidence. */
  const retryReceipt = uploads.receiptFor({
    file_id: 'f1', original_filename: 'a.pdf', stored_bytes: 10, upload_gate: { state: 'ACCEPTED_BY_UPLOAD_GATE', checks: [] },
    container: 'PDF', supported_format: true, presentation_id: 'P', refusal_reason: null, format_predicates: [],
    extraction: { extraction_ran: true, presentation_evidence: true, support: 'SUPPORTED', reference_date: { status: 'RESOLVED' }, records: [{ status: 'RESOLVED' }], summary: { status: 'RESOLVED' } }
  }, { admission_path: 'X', family_predicates: [], refusals: [], refusal_selection_rule: null, encryption: { encrypted: false } });
  check.equal(retryReceipt.file_id, 'f1', 'the retry receipt returns the original file id');
  check.equal(retryReceipt.format_detection.encryption.encrypted, false, 'and carries the stored encryption result without re-extraction');
  check.equal(retryReceipt.extraction_summary.accounts_read, 1, 'and the stored extraction summary');

  evidence.recovery = { merged_lines: merged.length, conflict_kept_both: conflictMerged.length };
  evidence.segmentation = { records: combinedExt.records.length, bureaus: combinedExt.bureaus };
  evidence.upload_limits = { max_file_bytes: limits.max_file_bytes, max_case_files: limits.max_case_files };
  return evidence;
}

module.exports = { run, id: 'ak-ingest-008-009-010', title: 'GAP-INGEST-008/-009/-010: partial native-text recovery, bureau segmentation, upload limits' };
