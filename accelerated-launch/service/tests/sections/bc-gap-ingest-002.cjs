'use strict';
/**
 * bc-gap-ingest-002.cjs — GAP-INGEST-002 multi-line account/collection/public-record boundaries through the full
 * local pipeline. Proves wrapped account names, status/identifier continuation lines, adjacent (repeated/similar)
 * accounts, continuation dates, accurate source locations, withheld conflicting readings, and a completed finding
 * traced to its source record, plus the HTTP upload -> evaluate -> view path and cross-account refusal.
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

function uploadBody(bytes, filename) {
  return { originalFilename: filename, declaredBytes: bytes.length, mimeType: 'application/pdf', contentBase64: bytes.toString('base64') };
}

async function run(t, check) {
  /* 1. A wrapped account name stays one owning record and keeps its balance and date. */
  const wrapped = fileRow('wrapped', 'sha-w', ['Equifax  Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor', 'Agency  Balance $100  Opened 01/01/2015'], 'US');
  const w = pipeline([wrapped], 'US', 'US-NY');
  check.equal(w.assembled.extraction.records.length, 1, 'a wrapped account name stays one record');
  check.ok(w.assembled.extraction.records[0].facts['account.balance'] === 100, 'the wrapped name keeps its balance on the owning record');
  check.equal(w.assembled.extraction.records[0].facts['liability.openedDate'], '2015-01-01', 'and its opened date');

  /* 2. Status and identifier continuation lines reach the owning record, never a new account. */
  const cont = fileRow('cont', 'sha-c', ['Equifax  Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor A  Balance $100', 'Status: Charged Off', 'Account Number ****1234', 'Opened 01/01/2015'], 'US');
  const c = pipeline([cont], 'US', 'US-NY');
  check.equal(c.assembled.extraction.records.length, 1, 'status and identifier continuation lines stay one record');
  const cRec = c.assembled.extraction.records[0];
  check.equal(cRec.facts['account.status'], 'CHARGED OFF', 'a status continuation reaches the owning record');
  check.equal(cRec.facts['account.masked_identifier'], 'MASK-1234', 'a masked identifier continuation reaches the owning record');
  check.equal(cRec.facts['account.reported_identity'], 'CREDITOR A', 'the account identity is not overwritten by the identifier line');

  /* 3. Two accounts with the SAME creditor name stay separate. */
  const repA = fileRow('rep-a', 'sha-ra', ['Equifax  Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor A  Balance $100  Opened 01/01/2015'], 'US');
  const repB = fileRow('rep-b', 'sha-rb', ['Equifax  Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor A  Balance $200  Opened 02/02/2019'], 'US');
  const rep = pipeline([repA, repB], 'US', 'US-NY');
  check.equal(rep.assembled.extraction.records.length, 2, 'two accounts with the same creditor name stay separate');

  /* 4. Two accounts with SIMILAR creditor names stay separate. */
  const simA = fileRow('sim-a', 'sha-sa', ['Equifax  Consumer Credit Report', 'Report Date: June 12, 2026', 'FIRST CREDIT UNION  Balance $100  Opened 01/01/2015'], 'US');
  const simB = fileRow('sim-b', 'sha-sb', ['Equifax  Consumer Credit Report', 'Report Date: June 12, 2026', 'FIRST CREDIT UNION II  Balance $200  Opened 02/02/2019'], 'US');
  const sim = pipeline([simA, simB], 'US', 'US-NY');
  check.equal(sim.assembled.extraction.records.length, 2, 'two similar creditor names stay separate accounts');

  /* 5. Continuation dates reach the correct record and keep their own source line. */
  const dcont = fileRow('dcont', 'sha-d', ['Equifax  Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor A  Balance $100', 'Opened 01/01/2015', 'Closed 02/02/2021'], 'US');
  const d = pipeline([dcont], 'US', 'US-NY');
  check.equal(d.assembled.extraction.records.length, 1, 'continuation dates stay one record');
  const dRec = d.assembled.extraction.records[0];
  check.equal(dRec.facts['liability.openedDate'], '2015-01-01', 'the Opened continuation reaches the correct record');
  check.equal(dRec.facts['liability.closedDate'], '2021-02-02', 'and the Closed continuation reaches the same record');


  /* 6. Source locations stay accurate — the record and each continuation fact name their file/page/line. */
  check.equal(dRec.location.file_id, 'dcont', 'the record names its source file');
  check.equal(dRec.location.page, 1, 'and its source page');
  const openedField = Object.values(dRec.printed || {}).find((f) => f && f.state === 'VALUE' && String(f.raw).includes('01/01/2015'));
  check.ok(openedField && openedField.location && openedField.location.line === 4, 'the Opened continuation keeps its source line');

  /* 7. Conflicting order-for-relief dates are withheld, never silently overwritten. */
  const conflict = fileRow('conf', 'sha-conf', ['Experian Consumer Credit Report - FICTIONAL TEST FIXTURE', 'Report Date: June 12, 2026', 'Bankruptcy Public Record: TEST-BK-006', 'Order for Relief: January 1, 2011', 'Order for Relief: March 5, 2013'], 'US');
  const conflictPipeline = pipeline([conflict], 'US', 'US-CA');
  const conflictRec = conflictPipeline.assembled.extraction.records[0];
  check.ok(!conflictRec.facts['publicRecord.bankruptcyOrderForReliefDate'], 'conflicting order-for-relief dates are withheld, never silently overwritten');

  /* 8. A completed finding is traced to its source record in the generated report. */
  const bk = fileRow('bk', 'sha-bk', ['Experian Consumer Credit Report - FICTIONAL TEST FIXTURE', 'Report Date: June 12, 2026', 'Bankruptcy Public Record: TEST-BK-001', 'Order for Relief: January 1, 2011'], 'US');
  const bkPipeline = pipeline([bk], 'US', 'US-CA');
  check.equal(bkPipeline.assembled.extraction.records[0].facts['publicRecord.bankruptcyOrderForReliefDate'], '2011-01-01', 'the order-for-relief continuation reaches the public record');
  check.ok(/Source fact: printed "January 1, 2011" \(page 1, line 4\)/.test(bkPipeline.body), 'the generated report traces the completed finding to its source record and line');

  /* 9. HTTP upload -> evaluate -> view preserves the association, and cross-account access is refused. */
  const owner = await t.account('ingest2-owner@example.test');
  const intruder = await t.unpaidAccount('ingest2-intruder@example.test');
  const caseId = (await t.request('POST', '/api/cases', { token: owner.token, body: { country: 'US', region: 'US-NY' } })).json.case.case_id;
  const pdf = buildPdf({ pages: [{ lines: ['Equifax  Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor A  Balance $100', 'Status: Charged Off', 'Opened 01/01/2015'] }] });
  check.equal((await t.request('POST', `/api/cases/${caseId}/files`, { token: owner.token, body: uploadBody(pdf, 'page.pdf') })).status, 201, 'a multi-line report uploads through the real endpoint');
  const evaluated = await t.request('POST', `/api/cases/${caseId}/evaluate`, { token: owner.token, body: {} });
  check.equal(evaluated.status, 201, 'the multi-line evaluation succeeds');
  const resultId = evaluated.json.result_id;
  const view = await t.request('GET', `/api/cases/${caseId}/results/${resultId}/view`, { token: owner.token });
  check.equal(view.status, 200, 'the owner can open the result view');
  const viewExt = (view.json.view.files || []).find((f) => f.extraction && f.extraction.accounts_read === 1);
  check.ok(viewExt, 'the view carries the single assembled record');
  check.equal((await t.request('GET', `/api/cases/${caseId}`, { token: intruder.token })).status, 403, 'another account cannot read the case');
  check.equal((await t.request('GET', `/api/cases/${caseId}/results/${resultId}/view`, { token: intruder.token })).status, 403, 'another account cannot read the result view');

  return { multiline_boundaries: true, continuation_lines: true };
}

module.exports = { run, id: 'bc-gap-ingest-002', title: 'GAP-INGEST-002: multi-line account/collection/public-record boundaries' };
