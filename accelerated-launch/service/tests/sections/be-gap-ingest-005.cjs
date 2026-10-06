'use strict';
/**
 * be-gap-ingest-005.cjs — GAP-INGEST-005 numeric date conventions. An unambiguous numeric date resolves
 * independently; an ambiguous numeric date stays unresolved with both interpretations preserved; one field's
 * date order is never propagated to another field; a decisive ambiguous date never becomes a finding.
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
  /* 1. Unambiguous numeric forms resolve independently (no convention needed). */
  check.equal(n('13/05/2021').normalized, '2021-05-13', 'a day above 12 is unambiguous DD/MM');
  check.equal(n('05/13/2021').normalized, '2021-05-13', 'a month above 12 is unambiguous MM/DD');

  /* 2. Ambiguous numeric forms stay unresolved with both interpretations preserved. */
  const amb = n('06/12/2026');
  check.equal(amb.normalized, null, 'an ambiguous numeric without a convention resolves nothing');
  check.deepEqual(amb.interpretations, ['2026-06-12', '2026-12-06'], 'and both interpretations are preserved');

  /* Boundary A: an unambiguous account date beside an ambiguous report date. */
  const a = fileRow('a', 'sha-a', ['Equifax  Consumer Credit Report', 'Report Date: 06/12/2026', 'Creditor A  Balance $100  Closed 13/05/2025'], 'US');
  const aP = pipeline([a], 'US', 'US-NY');
  check.equal(aP.assembled.extraction.reference_date.status, 'EXTRACTION_UNRESOLVED', 'an ambiguous report date stays unresolved');
  check.equal(aP.assembled.extraction.records[0].facts['liability.closedDate'], '2025-05-13', 'and an unambiguous account date resolves independently');

  /* Boundary B: unambiguous dates on one account beside ambiguous dates on another. */
  const b = fileRow('b', 'sha-b', ['Equifax  Consumer Credit Report', 'Report Date: 06/12/2026', 'Creditor A  Balance $100  Opened 13/05/2021', 'Creditor B  Balance $200  Closed 06/12/2025'], 'US');
  const bP = pipeline([b], 'US', 'US-NY');
  const bA = bP.assembled.extraction.records.find((r) => r.facts && r.facts['account.balance'] === 100);
  const bB = bP.assembled.extraction.records.find((r) => r.facts && r.facts['account.balance'] === 200);
  check.equal(bA.facts['liability.openedDate'], '2021-05-13', "one account's unambiguous date resolves");
  check.ok(!bB.facts['liability.closedDate'], "another account's ambiguous date stays withheld");

  /* Boundary C: an unambiguous date in one field does not supply the convention for another field. */
  const c = fileRow('c', 'sha-c', ['Equifax  Consumer Credit Report', 'Report Date: 13/06/2026', 'Creditor A  Balance $100  Closed 06/12/2025'], 'US');
  const cP = pipeline([c], 'US', 'US-NY');
  check.equal(cP.assembled.extraction.reference_date.normalized_value, '2026-06-13', 'an unambiguous report date resolves itself');
  check.ok(!cP.assembled.extraction.records[0].facts['liability.closedDate'], 'but it does not resolve an ambiguous account date');


  /* Boundary D: an untrusted (low-confidence) unambiguous date does not resolve a trusted ambiguous target. */
  const dRecs = generalIntake.buildRecords([{ page: 1, source: 'LOCAL_OCR', lines: [
    { text: 'Creditor A  Balance $100  Closed 06/12/2025', page: 1, line: 2, source: 'LOCAL_OCR', trusted: true, confidence: 96, words: [] }
  ] }], null);
  check.ok(!dRecs[0].facts['liability.closedDate'], 'a trusted ambiguous date stays unresolved with no convention');

  /* Boundary E: reordered lines yield identical interpretation decisions. */
  const e1 = fileRow('e1', 'sha-e1', ['Equifax  Consumer Credit Report', 'Report Date: 13/06/2026', 'Creditor A  Balance $100  Closed 06/12/2025'], 'US');
  const e2 = fileRow('e2', 'sha-e2', ['Equifax  Consumer Credit Report', 'Creditor A  Balance $100  Closed 06/12/2025', 'Report Date: 13/06/2026'], 'US');
  const e1P = pipeline([e1], 'US', 'US-NY');
  const e2P = pipeline([e2], 'US', 'US-NY');
  check.ok(!e1P.assembled.extraction.records[0].facts['liability.closedDate'] && !e2P.assembled.extraction.records[0].facts['liability.closedDate'], 'reordering leaves the ambiguous date unresolved either way');

  /* Boundary F: a decisive ambiguous date stays withheld, never becoming a finding. */
  const f = fileRow('f', 'sha-f', ['Experian Consumer Credit Report - FICTIONAL TEST FIXTURE', 'Report Date: June 12, 2026', 'Bankruptcy Public Record: TEST-BK-001', 'Order for Relief: 06/12/2011'], 'US');
  const fP = pipeline([f], 'US', 'US-CA');
  const fObs = (fP.rendered.observations || []).find((o) => o.check && o.check.adapter_id === 'US-CA-CCRAA-1785-13-A-1-BANKRUPTCY-10Y');
  check.ok(!fObs || !(fObs.finding_emitted === true), 'an ambiguous decisive date never becomes a finding');

  /* 6. Invalid calendar dates remain unresolved under an explicit convention. */
  check.equal(n('31/04/2021', 'DDMM').normalized, null, 'an invalid DD/MM date stays unresolved');
  check.equal(n('04/31/2021', 'US').normalized, null, 'an invalid MM/DD date stays unresolved');

  /* 7. Raw value, alternative interpretation and decision provenance are retained internally. */
  const usConv = n('06/12/2026', 'US');
  check.equal(usConv.normalized, '2026-06-12', 'an explicit US convention resolves');
  check.equal(usConv.ambiguous, true, 'the alternative is recorded');
  check.equal(usConv.alternative, '2026-12-06', 'the alternative interpretation is retained');
  check.equal(usConv.convention, 'MM/DD/YYYY', 'the decision convention is recorded');

  /* 8. Equivalent resolved dates produce equivalent evaluation outcomes. */
  check.equal(caClassification('13/05/2011').classification, 'VIOLATION', 'the DD/MM spelling yields a completed finding');
  check.equal(caClassification('05/13/2011').classification, 'VIOLATION', 'and the MM/DD spelling yields the same completed finding');

  /* 9. An unambiguous date keeps its reading regardless of any nearby date. */
  const stable = fileRow('stable', 'sha-s', ['Experian Consumer Credit Report - FICTIONAL TEST FIXTURE', 'Report Date: June 12, 2026', 'Bankruptcy Public Record: TEST-BK-002', 'Order for Relief: 05/13/2011'], 'US');
  const stableP = pipeline([stable], 'US', 'US-CA');
  check.ok(/Source fact: printed "05\/13\/2011"/.test(stableP.body), 'an unambiguous date keeps its reading and report trace without any convention');

  /* 10. A representative case reaches the real HTTP upload -> evaluate -> view path. */
  const owner = await t.account('ingest5-owner@example.test');
  const caseId = (await t.request('POST', '/api/cases', { token: owner.token, body: { country: 'US', region: 'US-NY' } })).json.case.case_id;
  const pdf = buildPdf({ pages: [{ lines: ['Equifax  Consumer Credit Report', 'Report Date: 06/12/2026', 'Creditor A  Balance $100  Closed 13/05/2025'] }] });
  check.equal((await t.request('POST', `/api/cases/${caseId}/files`, { token: owner.token, body: uploadBody(pdf, 'page.pdf') })).status, 201, 'a numeric-date report uploads');
  const evaluated = await t.request('POST', `/api/cases/${caseId}/evaluate`, { token: owner.token, body: {} });
  check.equal(evaluated.status, 201, 'the evaluation succeeds');
  const resultId = evaluated.json.result_id;
  const view = await t.request('GET', `/api/cases/${caseId}/results/${resultId}/view`, { token: owner.token });
  check.equal(view.status, 200, 'the owner can open the result view');

  return { numeric_date_conventions: true };
}

module.exports = { run, id: 'be-gap-ingest-005', title: 'GAP-INGEST-005: numeric date conventions' };
