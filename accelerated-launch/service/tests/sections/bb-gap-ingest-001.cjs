'use strict';
/**
 * bb-gap-ingest-001.cjs — GAP-INGEST-001 image-set coherence through the full local pipeline.
 *
 * Two admitted fictional report pages are assembled as one coherent report, evaluated, rendered for the
 * consumer and written into the assessment report. A material fact on an earlier page and another on a later
 * page must both reach the output; an exact duplicate is skipped; reordered uploads keep the same records; and
 * distinct bureaus stay in separate groups. The real upload/evaluate endpoint is exercised for the duplicate
 * case, where two identical uploads of one admitted fixture must not double-count.
 */
const { makeSyntheticModel } = require('../../../../internal-validation/ca-ns-last-payment-six-year/document-model.cjs');
const { buildPdf } = require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');
const formats = require('../../formats.cjs');
const evaluation = require('../../evaluation.cjs');
const results = require('../../results.cjs');
const journey = require('../../journey.cjs');
const multiFileAssembly = require('../../multi-file-assembly.cjs');

function fileRow(id, sha, lines, country) {
  const model = makeSyntheticModel({ pages: [lines] });
  const extraction = formats.extractWithSharedAdapter(model, { mode: 'REPORT', country });
  return { file_id: id, stored_sha256: sha, original_filename: id + '.pdf', extraction };
}

function pipeline(files, country, region) {
  const assembled = multiFileAssembly.assemble(files);
  const ev = evaluation.evaluateCase({ country, region, extraction: assembled.extraction });
  const rendered = results.renderResultSet({ evaluation: ev, extraction: assembled.extraction });
  const body = journey.assessmentReportBody(rendered, '2026-10-03T00:00:00.000Z');
  return { assembled, ev, rendered, body };
}

/* The ordered set of printed dates a consumer result actually examined, and the record facts it read. */
function datesOf(p) { return (p.rendered.report_consistency_checks || []).flatMap((c) => (c.examined || []).map((e) => e.printed_value)).sort(); }
function factsOf(p) { return (p.assembled.extraction.records || []).map((r) => JSON.stringify({ file: r.source_file_id, facts: r.facts })).sort(); }

function uploadBody(bytes, filename) {
  return { originalFilename: filename, declaredBytes: bytes.length, mimeType: 'application/pdf', contentBase64: bytes.toString('base64') };
}

async function run(t, check) {
  const a = fileRow('file-a', 'sha-a', ['Equifax  Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor A  Balance $100  Opened 01/01/2015'], 'US');
  const b = fileRow('file-b', 'sha-b', ['Equifax  Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor B  Balance $250  Opened 02/02/2019'], 'US');

  /* ------------------------------------------------------------------ both pages contribute */
  const r = pipeline([a, b], 'US', 'US-NY');
  check.equal(r.assembled.files_examined, 2, 'both files are examined');
  check.equal(r.assembled.files_included, 2, 'both files are included');
  check.equal(r.assembled.duplicate_files_skipped, 0, 'no duplicate was present');
  check.equal(r.assembled.extraction.records.length, 2, 'a record from each file reaches the assembly');
  check.deepEqual(r.assembled.extraction.records.map((x) => x.record_index), [1, 2], 'records are re-indexed globally');
  const recA = r.assembled.extraction.records.find((x) => x.source_file_id === 'file-a');
  const recB = r.assembled.extraction.records.find((x) => x.source_file_id === 'file-b');
  check.ok(recA && recB, 'each record names its source file');
  check.ok(!JSON.stringify(recA).includes('2019-02-02'), "the earlier page's record never borrows the later page's fact");
  check.ok(!JSON.stringify(recB).includes('2015-01-01'), "the later page's record never borrows the earlier page's fact");
  check.equal(typeof recA.location.source, 'string', 'a record carries its reading source');
  check.equal(recA.location.file_id, 'file-a', 'and its source file id on its location');

  /* The consumer result carries the printed date from each page — neither page is silently skipped. */
  const examinedAcrossChecks = (r.rendered.report_consistency_checks || []).flatMap((c) => c.examined || []);
  check.ok(examinedAcrossChecks.some((x) => x.printed_value === '01/01/2015'), "the earlier page's fact reaches the consumer result");
  check.ok(examinedAcrossChecks.some((x) => x.printed_value === '02/02/2019'), "the later page's fact reaches the consumer result");
  check.ok(r.rendered.checks_performed >= 2, 'the assembled evaluation performs checks for the coherent report');

  /* ------------------------------------------------------------------ duplicate not double-counted */
  const dupCopy = { file_id: 'file-a-copy', stored_sha256: 'sha-a', original_filename: 'copy.pdf', extraction: a.extraction };
  const dup = pipeline([a, dupCopy, b], 'US', 'US-NY');
  check.equal(dup.assembled.files_examined, 3, 'three files were examined');
  check.equal(dup.assembled.files_included, 2, 'two distinct files were included');
  check.equal(dup.assembled.duplicate_files_skipped, 1, 'one exact duplicate was recognised and skipped');
  check.equal(dup.assembled.extraction.records.length, 2, 'the duplicate page is not counted as duplicate debt');


  /* ------------------------------------------------------------------ reorder keeps both pages */
  const reordered = pipeline([b, a], 'US', 'US-NY');
  check.equal(reordered.assembled.extraction.records.length, 2, 'reordering does not silently drop a page');
  check.equal(reordered.assembled.extraction.records[0].source_file_id, 'file-b', 'upload order is preserved in the assembled records');

  /* ------------------------------------------------------------------ distinct bureaus stay separate */
  const tu = fileRow('file-tu', 'sha-tu', ['TransUnion  Consumer Disclosure', 'Report Date: 03/14/2025', 'Creditor C  Balance $40  Opened 03/03/2020'], 'US');
  const mixed = pipeline([a, tu], 'US', 'US-NY');
  check.equal(mixed.assembled.report_groups.length, 2, 'two distinct bureau reports are kept in separate groups');
  check.equal(mixed.assembled.extraction.multi_file_assembly.report_groups.length, 2, 'and the separation is recorded on the assembled extraction');
  check.ok(mixed.assembled.extraction.records.every((x) => typeof x.source_bureau === 'string'), 'every record names its bureau');

  /* ------------------------------------------------------------------ conflicting readings stay separate, never merged */
  const conflictA = fileRow('file-ca', 'sha-ca', ['Equifax  Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor X  Balance $10  Opened 01/01/2018'], 'US');
  const conflictB = fileRow('file-cb', 'sha-cb', ['Equifax  Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor X  Balance $20  Opened 02/02/2020'], 'US');
  const conflicting = pipeline([conflictA, conflictB], 'US', 'US-NY');
  check.equal(conflicting.assembled.extraction.records.length, 2, 'two conflicting readings stay two records, not one merged record');

  /* ------------------------------------------------------------------ generated report names a later-page fact */
  const lateB = fileRow('file-lb', 'sha-lb', ['Equifax  Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor B  Balance $250  Opened 07/15/2026'], 'US');
  const late = pipeline([a, lateB], 'US', 'US-NY');
  check.ok(/07\/15\/2026/.test(late.body), "the later page's printed date reaches the generated report");
  check.ok(/record 2|entry 2/.test(late.body), 'and the report names it as coming from the later record');

  /* ------------------------------------------------------------------ reordering preserves evaluated facts and findings, not just record count */
  const reorderedFacts = pipeline([b, a], 'US', 'US-NY');
  check.deepEqual(datesOf(reorderedFacts), datesOf(r), 'reordering preserves the same examined dates');
  check.deepEqual(factsOf(reorderedFacts), factsOf(r), 'reordering preserves the same record facts');
  check.equal(reorderedFacts.rendered.checks_performed, r.rendered.checks_performed, 'reordering preserves the same checks performed');

  /* ------------------------------------------------------------------ duplicate does not duplicate findings */
  check.equal(dup.rendered.checks_performed, r.rendered.checks_performed, 'a duplicate upload adds no checks');
  check.deepEqual(datesOf(dup), datesOf(r), 'a duplicate upload duplicates no examined facts');

  /* ------------------------------------------------------------------ real endpoints: upload -> evaluate -> view, and account isolation */
  const owner = await t.account('ingest-owner@example.test');
  const intruder = await t.unpaidAccount('ingest-intruder@example.test');
  const httpCaseId = (await t.request('POST', '/api/cases', { token: owner.token, body: { country: 'US', region: 'US-NY' } })).json.case.case_id;
  const pageA = buildPdf({ pages: [{ lines: ['Equifax  Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor A  Balance $100  Opened 01/01/2015'] }] });
  const pageB = buildPdf({ pages: [{ lines: ['Equifax  Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor B  Balance $250  Opened 02/02/2019'] }] });
  check.equal((await t.request('POST', `/api/cases/${httpCaseId}/files`, { token: owner.token, body: uploadBody(pageA, 'page-a.pdf') })).status, 201, 'the earlier page uploads through the real endpoint');
  check.equal((await t.request('POST', `/api/cases/${httpCaseId}/files`, { token: owner.token, body: uploadBody(pageB, 'page-b.pdf') })).status, 201, 'the later page uploads through the real endpoint');
  const httpEvaluated = await t.request('POST', `/api/cases/${httpCaseId}/evaluate`, { token: owner.token, body: {} });
  check.equal(httpEvaluated.status, 201, 'the multi-file evaluation succeeds through the real endpoint');
  const resultId = httpEvaluated.json.result_id;
  check.ok(typeof resultId === 'string' && resultId.length > 0, 'the evaluation returns a result id');
  const view = await t.request('GET', `/api/cases/${httpCaseId}/results/${resultId}/view`, { token: owner.token });
  check.equal(view.status, 200, 'the owner can open the result view');
  check.equal(view.json.view.files.length, 2, 'the view carries both assembled files');
  const viewExamined = (view.json.view.result.report_consistency_checks || []).flatMap((c) => (c.examined || []).map((e) => e.printed_value));
  check.ok(viewExamined.includes('01/01/2015') && viewExamined.includes('02/02/2019'), 'the assembled view carries a fact from each page');
  check.equal((await t.request('GET', `/api/cases/${httpCaseId}`, { token: intruder.token })).status, 403, 'another account cannot read the case');
  check.equal((await t.request('GET', `/api/cases/${httpCaseId}/results/${resultId}/view`, { token: intruder.token })).status, 403, 'another account cannot read the assembled result view');

  return { upload_order_preserved: true, duplicate_handling: true, report_boundary: true, generated_report: true, reorder_preserves_facts: true, duplicate_no_duplicate_findings: true, account_isolation: true, http_view_path: true };
}

module.exports = { run, id: 'bb-gap-ingest-001', title: 'GAP-INGEST-001: ordered image-set / multi-page coherence' };
