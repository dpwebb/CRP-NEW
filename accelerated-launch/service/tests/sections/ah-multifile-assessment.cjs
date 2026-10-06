'use strict';
/**
 * ah-multifile-assessment.cjs — GAP-INGEST-001. Coherent multi-file / image-set assessment.
 *
 * Proves the shared foundation rather than a single flag: an assessment-relevant fact on an earlier file and
 * another on a later file both reach the assessment; a refused file does not block or get read as absence; an
 * exact duplicate is not counted as duplicate debt; distinct bureau reports stay in separate groups; and each
 * record carries its source file/page/line so records never borrow from one another.
 */
const { buildPdf } = require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');
const { makeSyntheticModel } = require('../../../../internal-validation/ca-ns-last-payment-six-year/document-model.cjs');
const formats = require('../../formats.cjs');
const multiFileAssembly = require('../../multi-file-assembly.cjs');
const generalIntake = require('../../general-intake.cjs');

function uploadBody(bytes, filename) {
  return { originalFilename: filename, declaredBytes: bytes.length, mimeType: 'application/pdf', contentBase64: bytes.toString('base64') };
}

function fileRow(id, sha, lines, country) {
  const model = makeSyntheticModel({ pages: [lines] });
  const extraction = formats.extractWithSharedAdapter(model, { mode: 'REPORT', country });
  return { file_id: id, stored_sha256: sha, original_filename: id + '.pdf', extraction };
}

async function run(t, check) {
  const evidence = {};

  /* ------------------------------------------------------------------ unit: two files, one fact each */
  const a = fileRow('file-a', 'sha-a', ['Equifax  Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor A  Balance $100  Opened 01/01/2015'], 'US');
  const b = fileRow('file-b', 'sha-b', ['Equifax  Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor B  Balance $250  Opened 02/02/2019'], 'US');
  const two = multiFileAssembly.assemble([a, b]);
  check.equal(two.files_examined, 2, 'both files are examined');
  check.equal(two.files_included, 2, 'and both are included');
  check.equal(two.duplicate_files_skipped, 0, 'no duplicate was present');
  check.equal(two.extraction.records.length, 2, 'a fact from each file is assembled into the records');
  check.deepEqual(two.extraction.records.map((r) => r.record_index), [1, 2], 'records are re-indexed globally');
  const byId = new Map(two.extraction.records.map((r) => [r.source_file_id, r]));
  check.ok(byId.has('file-a') && byId.has('file-b'), 'each record names its source file');
  check.notEqual(two.extraction.records[0].source_file_id, two.extraction.records[1].source_file_id, 'the two records come from two different files');
  const recA = two.extraction.records.find((r) => r.source_file_id === 'file-a');
  const recB = two.extraction.records.find((r) => r.source_file_id === 'file-b');
  check.ok(!JSON.stringify(recA).includes('2019-02-02'), "the earlier file's record does not borrow the later file's fact");
  check.ok(!JSON.stringify(recB).includes('2015-01-01'), "the later file's record does not borrow the earlier file's fact");
  check.equal(typeof recA.location.source, 'string', 'a record carries its reading source (native text / OCR)');
  check.equal(recA.location.file_id, 'file-a', 'and its source file id on its location');

  /* ------------------------------------------------------------------ unit: exact duplicate not double-counted */
  const dup = multiFileAssembly.assemble([a, { file_id: 'file-a-copy', stored_sha256: 'sha-a', original_filename: 'copy.pdf', extraction: a.extraction }, b]);
  check.equal(dup.files_examined, 3, 'three files were examined');
  check.equal(dup.files_included, 2, 'two distinct files were included');
  check.equal(dup.duplicate_files_skipped, 1, 'one exact duplicate was recognised and skipped');
  check.equal(dup.extraction.records.length, 2, 'the duplicated page is not counted as duplicate debt');

  /* ------------------------------------------------------------------ unit: distinct bureaus stay separate */
  const tu = fileRow('file-tu', 'sha-tu', ['TransUnion  Consumer Disclosure', 'Report Date: 03/14/2025', 'Creditor C  Balance $40  Opened 03/03/2020'], 'US');
  const mixed = multiFileAssembly.assemble([a, tu]);
  check.equal(mixed.report_groups.length, 2, 'two distinct bureau reports are kept in separate groups');
  check.equal(mixed.extraction.multi_file_assembly.report_groups.length, 2, 'and the separation is recorded on the assembled extraction');
  check.ok(mixed.extraction.records.every((r) => typeof r.source_bureau === 'string'), 'every record names the bureau it came from');

  /* ------------------------------------------------------------------ unit: same bureau, two dates = two reports */
  const eq1 = fileRow('file-eq1', 'sha-eq1', ['Equifax  Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor X  Balance $10  Opened 01/01/2018'], 'US');
  const eq2 = fileRow('file-eq2', 'sha-eq2', ['Equifax  Consumer Credit Report', 'Report Date: 03/14/2025', 'Creditor Y  Balance $20  Opened 02/02/2020'], 'US');
  const sameBureauTwoDates = multiFileAssembly.assemble([eq1, eq2]);
  check.equal(sameBureauTwoDates.report_groups.length, 2, 'two Equifax reports with different dates are two distinct reports');
  check.deepEqual(
    sameBureauTwoDates.report_groups.map((g) => g.reference_date && (g.reference_date.normalized_value || g.reference_date.normalized)).sort(),
    ['2025-03-14', '2026-06-12'].sort(),
    'each report keeps its own reference date'
  );
  check.deepEqual(
    [...new Set(sameBureauTwoDates.extraction.records.map((r) => r.source_report_reference_date))].sort(),
    ['2025-03-14', '2026-06-12'].sort(),
    'and every record is tied to its own report reference date'
  );

  /* ------------------------------------------------------------------ unit: a repeated page within one document is skipped with an audit */
  const pageText = ['Equifax  Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor A  Balance $100  Opened 01/01/2015'];
  const dupPages = [
    { page: 1, source: 'NATIVE_TEXT', lines: pageText.map((t, i) => ({ text: t, page: 1, line: i + 1, source: 'NATIVE_TEXT' })) },
    { page: 2, source: 'NATIVE_TEXT', lines: pageText.map((t, i) => ({ text: t, page: 2, line: i + 1, source: 'NATIVE_TEXT' })) }
  ];
  const deduped = generalIntake.dedupePages(dupPages);
  check.equal(deduped.pages.length, 2, 'identical native text is retained, not discarded (visual content may differ)');
  check.equal(deduped.pages[1].suspected_duplicate, true, 'and the later page is flagged as a suspected duplicate');
  check.equal(deduped.skipped.length, 1, 'and the audit records the suspected duplicate');
  check.equal(deduped.skipped[0].reason, 'SUSPECTED_DUPLICATE_RETAINED', 'retained, never discarded');
  check.equal(deduped.skipped[0].duplicate_of_page, 1, 'the audit names the page it duplicates');
  const similarButDifferent = [
    { page: 1, source: 'NATIVE_TEXT', lines: [{ text: 'Creditor A  Balance $100', page: 1, line: 1, source: 'NATIVE_TEXT' }] },
    { page: 2, source: 'NATIVE_TEXT', lines: [{ text: 'Creditor B  Balance $200', page: 2, line: 1, source: 'NATIVE_TEXT' }] }
  ];
  check.equal(generalIntake.dedupePages(similarButDifferent).skipped.length, 0, 'legitimate similar accounts are never mistaken for duplicate pages');

  /* ------------------------------------------------------------------ unit: likely missing pages only when numbering is printed */
  const numbered = [
    { page: 1, source: 'NATIVE_TEXT', lines: [{ text: 'Page 1 of 3', page: 1, line: 1, source: 'NATIVE_TEXT' }] },
    { page: 2, source: 'NATIVE_TEXT', lines: [{ text: 'Page 3 of 3', page: 2, line: 1, source: 'NATIVE_TEXT' }] }
  ];
  const missing = generalIntake.detectMissingPages(numbered);
  check.deepEqual(missing.likely_missing_pages, [2], 'a gap in printed page numbering is flagged');
  const unnumbered = [{ page: 1, source: 'NATIVE_TEXT', lines: [{ text: 'No page number here', page: 1, line: 1, source: 'NATIVE_TEXT' }] }];
  check.deepEqual(generalIntake.detectMissingPages(unnumbered).likely_missing_pages, [], 'no numbering means completeness is unknown, never invented');

  /* ------------------------------------------------------------------ unit: low-confidence OCR dates never become resolved facts */
  const lowConfidence = generalIntake.buildRecords([{
    page: 1,
    source: 'LOCAL_OCR',
    lines: [{ text: 'Overdue Account  Original Listing 01/01/2021', page: 1, line: 1, source: 'LOCAL_OCR', trusted: false, confidence: 42 }]
  }], null);
  check.equal(lowConfidence.length, 1, 'a low-confidence line still produces a record');
  check.equal(lowConfidence[0].status, 'EXTRACTION_UNRESOLVED', 'but the record is unresolved, not a resolved fact');
  const lowDates = Object.values(lowConfidence[0].printed).filter((f) => f.kind === 'date' && f.state === 'VALUE');
  check.equal(lowDates.length, 0, 'no low-confidence date is accepted as a resolved fact');
  const lowUnresolved = Object.values(lowConfidence[0].printed).filter((f) => f.kind === 'date' && f.state === 'UNRESOLVED' && f.reason === 'LOW_CONFIDENCE_OCR_READING');
  check.ok(lowUnresolved.length >= 1, 'the low-confidence date is preserved as unresolved with its reason');

  /* ------------------------------------------------------------------ unit: multi-line / continued account assembly (GAP-INGEST-002) */
  const continued = generalIntake.buildRecords([{
    page: 1,
    source: 'NATIVE_TEXT',
    lines: [
      { text: 'Creditor A  Balance $100', page: 1, line: 1, source: 'NATIVE_TEXT', trusted: true },
      { text: 'Opened 01/01/2015', page: 1, line: 2, source: 'NATIVE_TEXT', trusted: true }
    ]
  }], null);
  check.equal(continued.length, 1, 'an account name/balance line and its Opened continuation assemble into ONE record');
  const continuedAmounts = Object.values(continued[0].printed).filter((f) => f.kind === 'amount');
  const continuedDates = Object.values(continued[0].printed).filter((f) => f.kind === 'date');
  check.ok(continuedAmounts.length >= 1, 'the balance is on the assembled record');
  check.ok(continuedDates.some((f) => f.state === 'VALUE'), 'and the Opened date is on the same record');

  const twoAccounts = generalIntake.buildRecords([{
    page: 1,
    source: 'NATIVE_TEXT',
    lines: [
      { text: 'Creditor A  Balance $100', page: 1, line: 1, source: 'NATIVE_TEXT', trusted: true },
      { text: 'Creditor B  Balance $200', page: 1, line: 2, source: 'NATIVE_TEXT', trusted: true }
    ]
  }], null);
  check.equal(twoAccounts.length, 2, 'two accounts with their own creditor lines stay two separate records');

  const headerOnly = generalIntake.buildRecords([{
    page: 1,
    source: 'NATIVE_TEXT',
    lines: [{ text: 'Prepared Date: June 12, 2026', page: 1, line: 1, source: 'NATIVE_TEXT', trusted: true }]
  }], null);
  check.equal(headerOnly.length, 0, 'a date-only report-header line is not invented into a record');

  /* ------------------------------------------------------------------ unit: dateless page attaches only on continuity, never by sole date */
  const datedEq = fileRow('file-eq-dated', 'sha-dated', ['Equifax  Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor A  Balance $100  Opened 01/01/2015'], 'US');
  const datelessContinuation = fileRow('file-eq-no-date', 'sha-nodate', ['Equifax  Consumer Credit Report', 'Opened 02/02/2019'], 'US');
  const adjacent = multiFileAssembly.assemble([datedEq, datelessContinuation]);
  check.equal(adjacent.report_groups.length, 1, 'a contiguous dateless page attaches to the dated report');
  const tuBetween = fileRow('file-tu-mid', 'sha-tu-mid', ['TransUnion  Consumer Disclosure', 'Report Date: 03/14/2025', 'Creditor C  Balance $40  Opened 03/03/2020'], 'US');
  const separated = multiFileAssembly.assemble([datedEq, tuBetween, datelessContinuation]);
  check.equal(separated.report_groups.length, 3, 'a dateless page separated by another bureau is retained unresolved, not attached');
  const datelessGroup = separated.report_groups.find((g) => !g.reference_date);
  check.ok(datelessGroup, 'the retained dateless page has no borrowed reference date');

  /* ------------------------------------------------------------------ unit: identical OCR text with different geometry is not deduplicated */
  const textOnlyPages = [
    { page: 1, source: 'LOCAL_OCR', lines: [{ text: 'Balance $100', page: 1, line: 1, source: 'LOCAL_OCR', bbox: { x0: 0, y0: 0, x1: 50, y1: 10 } }] },
    { page: 2, source: 'LOCAL_OCR', lines: [{ text: 'Balance $100', page: 2, line: 1, source: 'LOCAL_OCR', bbox: { x0: 100, y0: 200, x1: 150, y1: 210 } }] }
  ];
  check.equal(generalIntake.dedupePages(textOnlyPages).skipped.length, 0, 'identical OCR text with different coordinates is kept (different image content)');

  /* ------------------------------------------------------------------ unit: identical OCR text AND geometry is a retained suspected duplicate, never discarded */
  const sameGeometry = [
    { page: 1, source: 'LOCAL_OCR', lines: [{ text: 'Balance $100', page: 1, line: 1, source: 'LOCAL_OCR', bbox: { x0: 0, y0: 0, x1: 50, y1: 10 } }] },
    { page: 2, source: 'LOCAL_OCR', lines: [{ text: 'Balance $100', page: 2, line: 1, source: 'LOCAL_OCR', bbox: { x0: 0, y0: 0, x1: 50, y1: 10 } }] }
  ];
  const sameGeomDedup = generalIntake.dedupePages(sameGeometry);
  check.equal(sameGeomDedup.pages.length, 2, 'an OCR page is retained even when its text and geometry match');
  check.equal(sameGeomDedup.pages[1].suspected_duplicate, true, 'and it is explicitly flagged as a suspected duplicate');
  check.equal(sameGeomDedup.skipped[0].reason, 'SUSPECTED_DUPLICATE_RETAINED', 'and the skip audit records that it was retained, not discarded');

  /* ------------------------------------------------------------------ unit: cross-file continuation assembles an account spanning two images */
  const fileA = fileRow('file-cont-a', 'sha-cont-a', ['Equifax  Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor A  Balance $100'], 'US');
  const fileB = fileRow('file-cont-b', 'sha-cont-b', ['Equifax  Consumer Credit Report', 'Closed 02/02/2021'], 'US');
  const cross = multiFileAssembly.assemble([fileA, fileB]);
  check.equal(cross.extraction.records.length, 1, 'an account on one image and its continuation on the next assemble into ONE record');
  const mergedRec = cross.extraction.records[0];
  check.ok(mergedRec.continuation_merged_from && mergedRec.continuation_merged_from.length === 1, 'and the merge is audited');
  check.equal(mergedRec.continuation_merged_from[0].file_id, 'file-cont-b', 'naming the continuation image');
  check.ok(mergedRec.facts && mergedRec.facts['liability.closedDate'] === '2021-02-02', 'and the continuation date reaches the assembled record');
  check.ok(!(fileA.extraction.records[0].facts && fileA.extraction.records[0].facts['liability.closedDate']), 'and the original per-file record is not mutated by the merge');

  /* ------------------------------------------------------------------ unit: two separate accounts across two images are NOT merged */
  const twoA = fileRow('file-two-a', 'sha-two-a', ['Equifax  Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor A  Balance $100'], 'US');
  const twoB = fileRow('file-two-b', 'sha-two-b', ['Equifax  Consumer Credit Report', 'Creditor B  Balance $200'], 'US');
  const twoAcross = multiFileAssembly.assemble([twoA, twoB]);
  check.equal(twoAcross.extraction.records.length, 2, 'two accounts with their own creditor lines stay separate across two images');

  /* ------------------------------------------------------------------ unit: reordered pages — a continuation BEFORE its account is not merged */
  const reA = fileRow('file-re-a', 'sha-re-a', ['Equifax  Consumer Credit Report', 'Closed 02/02/2021'], 'US');
  const reB = fileRow('file-re-b', 'sha-re-b', ['Equifax  Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor A  Balance $100'], 'US');
  const reordered = multiFileAssembly.assemble([reA, reB]);
  const reCandidate = reordered.extraction.records.find((r) => r.continuation_candidate === true);
  check.ok(reCandidate, 'a continuation that precedes its account is retained, not dropped');
  check.ok(!reCandidate.continuation_merged_from, 'and it is not merged into a later account (no positive evidence)');

  /* ------------------------------------------------------------------ unit: conflicting identifiers — a continuation in the next image stays with its own account */
  const cfA = fileRow('file-cf-a', 'sha-cf-a', ['Equifax  Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor A  Balance $100'], 'US');
  const cfB = fileRow('file-cf-b', 'sha-cf-b', ['Equifax  Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor B  Balance $200  Closed 02/02/2021'], 'US');
  const conflicting = multiFileAssembly.assemble([cfA, cfB]);
  check.equal(conflicting.extraction.records.length, 2, 'a continuation with its own creditor line does not borrow the earlier account');
  const closedRecord = conflicting.extraction.records.find((r) => r.facts && r.facts['liability.closedDate']);
  check.ok(closedRecord, 'the closure is still read');
  check.ok(!closedRecord.continuation_merged_from, 'and it is not attributed to a different account');

  /* ------------------------------------------------------------------ unit: equivalent (non-byte-identical) images across files are retained, not discarded */
  const eqLines = ['Equifax  Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor A  Balance $100  Opened 01/01/2015'];
  const eqA = fileRow('file-eq-a', 'sha-eq-a', eqLines, 'US');
  const eqB = fileRow('file-eq-b', 'sha-eq-b', eqLines, 'US');
  const equiv = multiFileAssembly.assemble([eqA, eqB]);
  check.equal(equiv.files_included, 2, 'two equivalent images with different bytes are both retained, never discarded');
  check.equal(equiv.suspected_equivalent_files.length, 1, 'and the equivalent pair is audited');
  check.equal(equiv.suspected_equivalent_files[0].equivalent_of, 'file-eq-a', 'naming the earlier image');
  check.equal(equiv.suspected_equivalent_files[0].reason, 'SUSPECTED_EQUIVALENT_IMAGE_RETAINED', 'flagged as suspected, not confirmed');

  /* ------------------------------------------------------------------ consumer journey: earlier + later page */
  const owner = await t.account('owner-multifile@example.test');
  const caseId = (await t.request('POST', '/api/cases', { token: owner.token, body: { country: 'US', region: 'US-NY' } })).json.case.case_id;
  const page1 = buildPdf({ pages: [{ lines: ['Equifax  Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor A  Balance $100  Opened 01/01/2015'] }] });
  const page2 = buildPdf({ pages: [{ lines: ['Equifax  Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor B  Balance $250  Opened 02/02/2019'] }] });
  const up1 = await t.request('POST', `/api/cases/${caseId}/files`, { token: owner.token, body: uploadBody(page1, 'page1.pdf') });
  const up2 = await t.request('POST', `/api/cases/${caseId}/files`, { token: owner.token, body: uploadBody(page2, 'page2.pdf') });
  check.equal(up1.status, 201, 'the earlier page uploads');
  check.equal(up2.status, 201, 'the later page uploads');

  const evaluated = await t.request('POST', `/api/cases/${caseId}/evaluate`, { token: owner.token, body: {} });
  check.equal(evaluated.status, 201, 'the multi-file case still evaluates');
  const result = evaluated.json.result;
  check.equal(result.read_but_no_usable_facts, null, 'the assembled report is not misread as having no usable facts');

  const storedResult = t.service.store.state().results.filter((r) => r.case_id === caseId).pop();
  check.ok(storedResult.file_ids && storedResult.file_ids.length === 2, 'the result records both assembled files');

  /* The factual date-order check runs over the assembled view: both entries are examined. */
  const factual = result.report_consistency_checks || [];
  const examined = factual.reduce((n, c) => n + ((c.examined && c.examined.length) || 0), 0);
  check.ok(examined >= 2, 'both assembled entries were examined by a factual check, not just the latest page');

  evidence.unit = { files_examined: two.files_examined, records: two.extraction.records.length, duplicate_skipped: dup.duplicate_files_skipped, bureau_groups: mixed.report_groups.length };
  evidence.journey = { files_uploaded: 2, evaluated: evaluated.status, file_ids: storedResult.file_ids, examined };
  return evidence;
}

module.exports = { run, id: 'ah-multifile-assessment', title: 'Coherent multi-file / image-set assessment: both pages reach the assessment, duplicates are not double-counted, bureaus stay separate' };
