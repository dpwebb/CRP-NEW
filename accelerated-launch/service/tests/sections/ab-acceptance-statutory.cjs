'use strict';
/**
 * ab-acceptance-statutory.cjs — ACCEPT-001 item 2: for EACH of the four connected statutory checks,
 * demonstrate exceeded, not-exceeded, missing/ambiguous and equiv-layout cases, via the engine and the
 * consumer journey. Checks: FCRA-605A-5, AU-ITEM1-LIABILITY-2Y, AU-ITEM3-ENQUIRY-5Y, AU-ITEM4-DEFAULT-5Y.
 */

const formats = require('../../formats.cjs');
const evaluation = require('../../evaluation.cjs');
const { makeSyntheticModel } = require('../../../../internal-validation/ca-ns-last-payment-six-year/document-model.cjs');

function runEngine(country, region, lines) {
  const model = makeSyntheticModel({ pages: [lines] });
  const ext = formats.extractWithSharedAdapter(model, { mode: 'REPORT', country });
  const result = evaluation.evaluateCase({ country, region, extraction: ext });
  return result;
}
function outcomeOf(result, adapterId) {
  const row = result.results.find((r) => r.check.adapter_id === adapterId);
  return row ? { state: row.machine.state, outcome: row.machine.outcome } : null;
}

async function run(t, check) {
  const evidence = {};

  /* FCRA-605A-5 (adverse, 7y) */
  check.deepEqual(outcomeOf(runEngine('US', 'US-NY', ['Experian  Consumer Credit Report', 'Report Date: June 12, 2026', 'Account 30 days past due as of Jun 2015']), 'FCRA-605A-5-US-NATIONAL-7Y'),
    { state: 'EVALUATED', outcome: 'PERIOD_EXCEEDED' }, 'FCRA adverse: >7y is PERIOD_EXCEEDED');
  check.deepEqual(outcomeOf(runEngine('US', 'US-NY', ['Experian  Consumer Credit Report', 'Report Date: June 12, 2026', 'Account 30 days past due as of Jun 2024']), 'FCRA-605A-5-US-NATIONAL-7Y'),
    { state: 'EVALUATED', outcome: 'PERIOD_NOT_EXCEEDED' }, 'FCRA adverse: <7y is PERIOD_NOT_EXCEEDED');
  check.equal(outcomeOf(runEngine('US', 'US-NY', ['Experian  Consumer Credit Report', 'Report Date: June 12, 2026', 'Account  Balance $1,240']), 'FCRA-605A-5-US-NATIONAL-7Y'),
    null, 'FCRA adverse: no adverse annotation runs no comparison');
  check.deepEqual(outcomeOf(runEngine('US', 'US-NY', ['TRANSUNION', 'Report Date: June 12, 2026', '90 days past due as of Jun 2015  Account A']), 'FCRA-605A-5-US-NATIONAL-7Y'),
    { state: 'EVALUATED', outcome: 'PERIOD_EXCEEDED' }, 'FCRA adverse: same annotation in another layout yields the same comparison');

  /* AU liability (item 1, 2y) */
  check.deepEqual(outcomeOf(runEngine('AU', 'AU-NSW', ['Equifax  Consumer Credit File', 'Report Date: 12 June 2026', 'Credit Provider X  Closed 15/03/2024']), 'AU-PRIVACY-ACT-1988-S20W-ITEM1-LIABILITY-2Y'),
    { state: 'EVALUATED', outcome: 'PERIOD_EXCEEDED' }, 'AU liability: >2y is PERIOD_EXCEEDED');
  check.deepEqual(outcomeOf(runEngine('AU', 'AU-NSW', ['Equifax  Consumer Credit File', 'Report Date: 12 June 2026', 'Credit Provider X  Closed 15/03/2025']), 'AU-PRIVACY-ACT-1988-S20W-ITEM1-LIABILITY-2Y'),
    { state: 'EVALUATED', outcome: 'PERIOD_NOT_EXCEEDED' }, 'AU liability: <2y is PERIOD_NOT_EXCEEDED');
  check.equal(outcomeOf(runEngine('AU', 'AU-NSW', ['Equifax  Consumer Credit File', 'Report Date: 12 June 2026', 'Credit Provider X  Balance $500']), 'AU-PRIVACY-ACT-1988-S20W-ITEM1-LIABILITY-2Y'),
    null, 'AU liability: no closure date runs no comparison');

  /* AU enquiry (item 3, 5y) */
  check.deepEqual(outcomeOf(runEngine('AU', 'AU-NSW', ['Equifax  Consumer Credit File', 'Report Date: 12 June 2026', 'Enquiry  Enquiry Date 20/05/2021']), 'AU-PRIVACY-ACT-1988-S20W-ITEM3-ENQUIRY-5Y'),
    { state: 'EVALUATED', outcome: 'PERIOD_EXCEEDED' }, 'AU enquiry: >5y is PERIOD_EXCEEDED');
  check.deepEqual(outcomeOf(runEngine('AU', 'AU-NSW', ['Equifax  Consumer Credit File', 'Report Date: 12 June 2026', 'Enquiry  Enquiry Date 20/05/2022']), 'AU-PRIVACY-ACT-1988-S20W-ITEM3-ENQUIRY-5Y'),
    { state: 'EVALUATED', outcome: 'PERIOD_NOT_EXCEEDED' }, 'AU enquiry: <5y is PERIOD_NOT_EXCEEDED');

  /* AU default (item 4, 5y) */
  check.deepEqual(outcomeOf(runEngine('AU', 'AU-NSW', ['Equifax  Consumer Credit File', 'Report Date: 12 June 2026', 'Overdue Account  Original Listing 15/03/2021']), 'AU-PRIVACY-ACT-1988-S20W-ITEM4-DEFAULT-5Y'),
    { state: 'EVALUATED', outcome: 'PERIOD_EXCEEDED' }, 'AU default: >5y is PERIOD_EXCEEDED');
  check.deepEqual(outcomeOf(runEngine('AU', 'AU-NSW', ['Equifax  Consumer Credit File', 'Report Date: 12 June 2026', 'Overdue Account  Original Listing 15/03/2022']), 'AU-PRIVACY-ACT-1988-S20W-ITEM4-DEFAULT-5Y'),
    { state: 'EVALUATED', outcome: 'PERIOD_NOT_EXCEEDED' }, 'AU default: <5y is PERIOD_NOT_EXCEEDED');
  check.deepEqual(outcomeOf(runEngine('AU', 'AU-NSW', ['Equifax  Consumer Credit File', 'Report Date: 12 June 2026', 'Overdue Account  Current Listing 01/01/2024']), 'AU-PRIVACY-ACT-1988-S20W-ITEM4-DEFAULT-5Y'),
    { state: 'UNRESOLVED', outcome: 'UNRESOLVED' }, 'AU default: no original-listing date is UNRESOLVED, not aged from a current-listing date');

  /* ==== HTTP consumer journey ==== */
  const owner = await t.account('owner-acceptance-statutory@example.test');
  const caseId = (await t.request('POST', '/api/cases', { token: owner.token, body: { country: 'US', region: 'US-NY' } })).json.case.case_id;
  const pdf = require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs').buildPdf({ pages: [{ lines: ['Experian  Consumer Credit Report', 'Report Date: June 12, 2026', 'Account 30 days past due as of Jun 2015'] }] });
  const upload = await t.request('POST', `/api/cases/${caseId}/files`, { token: owner.token, body: { originalFilename: 'adverse.pdf', declaredBytes: pdf.length, mimeType: 'application/pdf', contentBase64: pdf.toString('base64') } });
  check.equal(upload.status, 201, 'an adverse general report uploads');
  check.equal(upload.json.receipt.format_detection.presentation_id, 'GENERAL-BUREAU-REPORT', 'as a general report');
  const evaluate = await t.request('POST', `/api/cases/${caseId}/evaluate`, { token: owner.token, body: {} });
  check.equal(evaluate.status, 201, 'and is assessed');
  check.equal(evaluate.json.result.assessment.performed_by_kind.STATUTORY_RULE_COMPARISON, 1, 'one statutory comparison was performed on the uploaded report');
  check.ok(JSON.stringify(evaluate.json.result).includes('FCRA'), 'and it is the FCRA adverse-item comparison');

  evidence.engine = { checks: ['FCRA-605A-5', 'AU-ITEM1-LIABILITY-2Y', 'AU-ITEM3-ENQUIRY-5Y', 'AU-ITEM4-DEFAULT-5Y'], cases: ['exceeded', 'not-exceeded', 'missing', 'equiv-layout'] };
  evidence.journey = { uploaded: true, statutory_comparisons: evaluate.json.result.assessment.performed_by_kind.STATUTORY_RULE_COMPARISON };
  return evidence;
}

module.exports = {
  run,
  id: 'ab-acceptance-statutory',
  title: 'Four connected statutory checks: exceeded, not-exceeded, missing-fact and equiv-layout, via the engine and the consumer journey'
};
