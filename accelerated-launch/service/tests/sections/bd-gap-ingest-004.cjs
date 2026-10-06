'use strict';
/**
 * bd-gap-ingest-004.cjs — GAP-INGEST-004 unambiguous written date forms through extraction, normalization,
 * evaluation, consumer results and generated reports.
 */
const generalIntake = require('../../general-intake.cjs');
const formats = require('../../formats.cjs');
const evaluation = require('../../evaluation.cjs');
const results = require('../../results.cjs');
const journey = require('../../journey.cjs');
const multiFileAssembly = require('../../multi-file-assembly.cjs');
const { makeSyntheticModel } = require('../../../../internal-validation/ca-ns-last-payment-six-year/document-model.cjs');
const { buildPdf } = require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');

const n = (raw, convention) => generalIntake.normalizePrintedDate(raw, convention);

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

function uploadBody(bytes, filename) {
  return { originalFilename: filename, declaredBytes: bytes.length, mimeType: 'application/pdf', contentBase64: bytes.toString('base64') };
}

function caClassification(orderForRelief) {
  const lines = ['Experian Consumer Credit Report - FICTIONAL TEST FIXTURE', 'Report Date: June 12, 2026', 'Bankruptcy Public Record: TEST-BK-001', `Order for Relief: ${orderForRelief}`];
  const ext = formats.extractWithSharedAdapter(makeSyntheticModel({ pages: [lines] }), { mode: 'REPORT', country: 'US' });
  const res = evaluation.evaluateCase({ country: 'US', region: 'US-CA', extraction: ext });
  const row = res.results.find((r) => r.check && r.check.adapter_id === 'US-CA-CCRAA-1785-13-A-1-BANKRUPTCY-10Y' && r.machine.state === 'EVALUATED');
  return row ? row.machine.finding : null;
}

async function run(t, check) {
  /* 1 + 3. Full and abbreviated month names, permitted punctuation, and equivalent spellings. */
  const equivalents = ['January 5, 2021', 'Jan 5, 2021', 'Jan. 5, 2021', '5 January 2021', '5th January 2021', 'January 5th, 2021'];
  check.deepEqual(equivalents.map((raw) => n(raw).normalized), ['2021-01-05', '2021-01-05', '2021-01-05', '2021-01-05', '2021-01-05', '2021-01-05'], 'equivalent written spellings normalize to the same day');
  check.equal(n('September 3, 2020').normalized, '2020-09-03', 'a 9-letter month name resolves');
  check.equal(n('21st December 2020').normalized, '2020-12-21', 'a two-digit ordinal day-first form resolves');
  check.equal(n('1 Feb 2020').normalized, '2020-02-01', 'an abbreviated month in a day-first form resolves');

  const full = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const abbr = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthsOk = full.every((f, i) => n(`${f} 5, 2021`).normalized === `2021-${String(i + 1).padStart(2, '0')}-05` && n(`${abbr[i]} 5, 2021`).normalized === `2021-${String(i + 1).padStart(2, '0')}-05`);
  check.ok(monthsOk, 'all twelve months resolve in full and abbreviated form');

  /* 2. Unambiguous numeric and ISO forms. */
  check.equal(n('2026-06-12').normalized, '2026-06-12', 'an ISO date resolves');
  check.equal(n('2026/06/12').normalized, '2026-06-12', 'a YYYY/MM/DD date resolves');
  check.equal(n('13/05/2021').normalized, '2021-05-13', 'a day above 12 is unambiguous DD/MM');
  check.equal(n('05/13/2021').normalized, '2021-05-13', 'a month above 12 is unambiguous MM/DD');

  /* 3. Classification equivalence: equivalent spellings supply the same decisive fact and the same finding. */
  const classes = ['January 1, 2011', 'Jan 1, 2011', '1 January 2011', 'January 1st, 2011'].map((f) => caClassification(f));
  check.deepEqual(classes.map((f) => (f ? f.classification : null)), ['VIOLATION', 'VIOLATION', 'VIOLATION', 'VIOLATION'], 'equivalent spellings yield the same bankruptcy classification');

  /* 4. Invalid calendar dates remain unresolved, never rolled into a valid day. */
  check.equal(n('February 30, 2021').normalized, null, 'February 30 stays unresolved');
  check.equal(n('February 29, 2021').normalized, null, 'a non-leap February 29 stays unresolved');
  check.equal(n('April 31, 2021').normalized, null, 'April 31 stays unresolved');
  check.equal(n('February 29, 2020').normalized, '2020-02-29', 'a leap February 29 resolves');

  /* 5. Unsupported or ambiguous forms remain unresolved without guessing. */
  check.equal(n('not a date').normalized, null, 'unrecognised text is not invented');
  const amb = n('06/12/2026');
  check.equal(amb.normalized, null, 'an ambiguous numeric without a convention resolves nothing');
  check.deepEqual(amb.interpretations, ['2026-06-12', '2026-12-06'], 'and both interpretations are preserved');

  /* 6. Partial dates retain their actual precision; no invented day. */
  check.equal(n('Jun 2026').precision, 'MONTH', 'a written month-year is MONTH precision');
  check.equal(n('Jun 2026').normalized, '2026-06', 'with no invented day');
  check.equal(n('02/2021').precision, 'MONTH', 'a numeric month-year is MONTH precision');

  /* 7. Raw printed value, normalization and source location survive into a completed finding and its report. */
  const bk = fileRow('bk', 'sha-bk', ['Experian Consumer Credit Report - FICTIONAL TEST FIXTURE', 'Report Date: June 12, 2026', 'Bankruptcy Public Record: TEST-BK-001', 'Order for Relief: January 1, 2011'], 'US');
  const bp = pipeline([bk], 'US', 'US-CA');
  check.equal(bp.assembled.extraction.records[0].facts['publicRecord.bankruptcyOrderForReliefDate'], '2011-01-01', 'the written order-for-relief date normalizes to the decisive fact');
  const orf = bp.assembled.extraction.records[0].printed['bankruptcy_order_for_relief_date'];
  check.ok(orf, 'the printed order-for-relief field is retained');
  check.equal(orf.raw, 'January 1, 2011', 'the raw printed value survives');
  check.equal(orf.normalized, '2011-01-01', 'the normalized value survives');
  check.ok(orf.location && orf.location.line === 4, 'and the owning source line survives');
  check.ok(/Source fact: printed "January 1, 2011" \(page 1, line 4\)/.test(bp.body), 'the generated report traces the finding to the raw value and source line');

  /* 8. OCR-confidence gates stay effective for a written month-name date. */
  const low = generalIntake.buildRecords([{
    page: 1, source: 'LOCAL_OCR',
    lines: [{ text: 'Closed January 5, 2021', page: 1, line: 1, source: 'LOCAL_OCR', trusted: true, confidence: 90, min_confidence: 20, words: [
      { text: 'Closed', confidence: 96, trusted: true, start: 0, end: 6 },
      { text: 'January', confidence: 20, trusted: false, start: 7, end: 14 },
      { text: '5,', confidence: 96, trusted: true, start: 15, end: 17 },
      { text: '2021', confidence: 96, trusted: true, start: 18, end: 22 }
    ] }]
  }]);
  check.equal(low[0].status, 'EXTRACTION_UNRESOLVED', 'a written date with an untrusted month word stays unresolved');
  const lowDate = Object.values(low[0].printed || {}).find((f) => f && f.kind === 'date');
  check.ok(lowDate && lowDate.state === 'UNRESOLVED', 'and the written date is unresolved, not a resolved value');

  /* 9. Multiple written dates stay associated with the correct fields on the correct record. */
  const multi = fileRow('multi', 'sha-m', ['Equifax  Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor A  Balance $100', 'Opened January 5, 2015', 'Closed February 5, 2021'], 'US');
  const mp = pipeline([multi], 'US', 'US-NY');
  check.equal(mp.assembled.extraction.records.length, 1, 'multiple written dates stay on one record');
  const mRec = mp.assembled.extraction.records[0];
  check.equal(mRec.facts['liability.openedDate'], '2015-01-05', 'the written Opened date reaches its field');
  check.equal(mRec.facts['liability.closedDate'], '2021-02-05', 'the written Closed date reaches its field');

  /* 10. A representative written date form reaches the real HTTP upload -> evaluate -> view path. */
  const owner = await t.account('ingest4-owner@example.test');
  const caseId = (await t.request('POST', '/api/cases', { token: owner.token, body: { country: 'US', region: 'US-NY' } })).json.case.case_id;
  const pdf = buildPdf({ pages: [{ lines: ['Equifax  Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor A  Balance $100  Closed February 5, 2021'] }] });
  check.equal((await t.request('POST', `/api/cases/${caseId}/files`, { token: owner.token, body: uploadBody(pdf, 'page.pdf') })).status, 201, 'a written-date report uploads through the real endpoint');
  const evaluated = await t.request('POST', `/api/cases/${caseId}/evaluate`, { token: owner.token, body: {} });
  check.equal(evaluated.status, 201, 'the written-date evaluation succeeds');
  const resultId = evaluated.json.result_id;
  const view = await t.request('GET', `/api/cases/${caseId}/results/${resultId}/view`, { token: owner.token });
  check.equal(view.status, 200, 'the owner can open the result view');

  return { written_date_forms: true, unambiguous_parse: true };
}

module.exports = { run, id: 'bd-gap-ingest-004', title: 'GAP-INGEST-004: unambiguous written date forms' };
