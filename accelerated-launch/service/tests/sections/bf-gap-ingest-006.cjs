'use strict';
/**
 * bf-gap-ingest-006.cjs — GAP-INGEST-006 partial-date precision. Proves the behavior NOT already covered by
 * z-general-intake (normalization) and aj-ingest-dates (interval evaluation): a single month-only date reaches its
 * field with MONTH precision; a contradiction is persistent and preserves every raw reading and location; a month
 * plus a day never merges into a resolved anchor; invalid months never become partial dates; leap/non-leap
 * February anniversaries are correct; and a month-only adverse anchor survives through the result and report
 * without a range endpoint being presented as the event date.
 */
const generalIntake = require('../../general-intake.cjs');
const formats = require('../../formats.cjs');
const evaluation = require('../../evaluation.cjs');
const results = require('../../results.cjs');
const journey = require('../../journey.cjs');
const multiFileAssembly = require('../../multi-file-assembly.cjs');
const ruleAdapters = require('../../../adapters/rule-adapters.cjs');
const { makeSyntheticModel } = require('../../../../internal-validation/ca-ns-last-payment-six-year/document-model.cjs');
const { buildPdf } = require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');

const n = (raw) => generalIntake.normalizePrintedDate(raw);

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

function runMonth(anchorMonth, ref) {
  return ruleAdapters.runAdapter('FCRA-605A-5-US-NATIONAL-7Y', {
    country: 'US', region: 'US-NY', presentation: 'GENERAL-BUREAU-REPORT',
    facts: { 'reportedAccount.adverseRatingDate': anchorMonth, 'reportedAccount.adverseRatingDatePrecision': 'MONTH' },
    referenceDate: ref
  });
}

async function run(t, check) {
  /* A single month-only date reaches its own field with MONTH precision and its raw value. */
  const single = pipeline([fileRow('single', 'sha-s', ['Equifax  Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor A  Balance $100  Closed 02/2021'], 'US')], 'US', 'US-NY').assembled.extraction.records[0];
  check.equal(single.facts['liability.closedDate'], '2021-02', 'a single month-only closure reaches its field');
  check.equal(single.facts['liability.closedDatePrecision'], 'MONTH', 'with MONTH precision');
  check.equal(single.printed.closed_date.raw, '02/2021', 'and its raw printed value');

  /* A contradiction is persistent and preserves every raw reading and owning location. */
  const abaRec = pipeline([fileRow('aba', 'sha-aba', ['Equifax  Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor A  Balance $100  Closed 02/2021', 'Closed 03/2021', 'Closed 02/2021'], 'US')], 'US', 'US-NY').assembled.extraction.records[0];
  check.ok(!abaRec.facts['liability.closedDate'], 'A -> B -> A stays withheld, never restored');
  const closedReadings = Object.keys(abaRec.printed || {}).filter((k) => /closed_date/.test(k)).map((k) => abaRec.printed[k]);
  check.deepEqual(closedReadings.map((f) => f.raw), ['02/2021', '03/2021', '02/2021'], 'all three raw readings are preserved in order');
  check.deepEqual(closedReadings.map((f) => f.location && f.location.line), [3, 4, 5], 'and each keeps its owning source line');
  const abc = pipeline([fileRow('abc', 'sha-abc', ['Equifax  Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor A  Balance $100  Closed 02/2021', 'Closed 03/2021', 'Closed 04/2021'], 'US')], 'US', 'US-NY').assembled.extraction.records[0];
  check.ok(!abc.facts['liability.closedDate'], 'A -> B -> C stays withheld, never overwritten to the last value');

  /* A month plus a day never merges into a resolved anchor (within or outside the month). */
  const within = pipeline([fileRow('within', 'sha-w', ['Equifax  Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor A  Balance $100  Closed 02/2021', 'Closed 02/15/2021'], 'US')], 'US', 'US-NY').assembled.extraction.records[0];
  check.ok(!within.facts['liability.closedDate'], 'a month and a day within it are not merged into a resolved anchor');
  const outside = pipeline([fileRow('outside', 'sha-o', ['Equifax  Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor A  Balance $100  Closed 02/2021', 'Closed 03/15/2021'], 'US')], 'US', 'US-NY').assembled.extraction.records[0];
  check.ok(!outside.facts['liability.closedDate'], 'a day outside the printed month produces no resolved anchor');

  /* Invalid months never become apparently-valid partial dates. */
  check.equal(n('13/2021').normalized, null, 'an invalid month (13) stays unresolved');
  check.equal(n('2021/13').normalized, null, 'an invalid month in YYYY/MM stays unresolved');
  check.equal(n('00/2021').normalized, null, 'a zero month stays unresolved');

  /* Calendar boundaries: leap and non-leap February anniversaries. */
  check.equal(runMonth('2020-02', '2027-02-10').state, 'UNRESOLVED', 'a leap-February anniversary that straddles is withheld');
  check.equal(runMonth('2020-02', '2027-03-01').outcome, 'PERIOD_EXCEEDED', 'a leap-February month wholly before the boundary is exceeded');
  check.equal(runMonth('2021-02', '2028-03-01').outcome, 'PERIOD_EXCEEDED', 'a non-leap February month wholly before the boundary is exceeded');

  /* Consumer precision: the month-only adverse anchor keeps raw month, MONTH precision and range into the result,
     and the report never presents a range endpoint as the printed event date. */
  const adverseExt = formats.extractWithSharedAdapter(makeSyntheticModel({ pages: [['Equifax  Consumer Credit Report', 'Report Date: June 12, 2026', 'Account A  60 days past due as of Feb 2015  Balance $100']] }), { mode: 'REPORT', country: 'US' });
  const adverseRec = adverseExt.records[0];
  check.equal(adverseRec.facts['reportedAccount.adverseRatingDate'], '2015-02', 'the month-only adverse anchor keeps its month');
  check.equal(adverseRec.facts['reportedAccount.adverseRatingDatePrecision'], 'MONTH', 'and its MONTH precision');
  const adverseEval = evaluation.evaluateCase({ country: 'US', region: 'US-NY', extraction: adverseExt });
  const adverseRow = adverseEval.results.find((r) => r.check && r.check.adapter_id === 'FCRA-605A-5-US-NATIONAL-7Y');
  check.equal(adverseRow.machine.outcome, 'PERIOD_EXCEEDED', 'the month-only anchor is wholly before the boundary');
  check.equal(adverseRow.machine.anchor.source.raw_value, 'Feb 2015', 'the raw month survives into the result');
  check.equal(adverseRow.machine.anchor.source.uncertainty.precision, 'MONTH', 'the MONTH precision survives into the result');
  check.equal(adverseRow.machine.arithmetic.anchor_month, '2015-02', 'the comparison range is anchored to the month, never a day');
  const adverseBody = journey.assessmentReportBody(results.renderResultSet({ evaluation: adverseEval, extraction: adverseExt }), '2026-10-03T00:00:00.000Z');
  check.ok(!/2015-02-01|2015-02-28/.test(adverseBody), 'the report never presents the range endpoint as the printed event date');

  /* A month-only date reaches the real HTTP upload -> evaluate -> view path. */
  const owner = await t.account('ingest6-owner@example.test');
  const caseId = (await t.request('POST', '/api/cases', { token: owner.token, body: { country: 'US', region: 'US-NY' } })).json.case.case_id;
  const pdf = buildPdf({ pages: [{ lines: ['Equifax  Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor A  Balance $100  Closed 02/2021'] }] });
  check.equal((await t.request('POST', `/api/cases/${caseId}/files`, { token: owner.token, body: uploadBody(pdf, 'page.pdf') })).status, 201, 'a month-only report uploads');
  const evaluated = await t.request('POST', `/api/cases/${caseId}/evaluate`, { token: owner.token, body: {} });
  check.equal(evaluated.status, 201, 'the evaluation succeeds');
  const resultId = evaluated.json.result_id;
  const view = await t.request('GET', `/api/cases/${caseId}/results/${resultId}/view`, { token: owner.token });
  check.equal(view.status, 200, 'the owner can open the result view');

  return { partial_date_precision: true };
}

module.exports = { run, id: 'bf-gap-ingest-006', title: 'GAP-INGEST-006: month-only / partial-date precision' };

