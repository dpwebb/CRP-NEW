'use strict';
/**
 * bt-ordinary-field-coverage.cjs — OWNER-POTENTIAL-ISSUE-001 / Branch A semantic correction.
 *
 * Account LIFECYCLE (open/closed) and repayment PERFORMANCE (current/overdue/paid as agreed) are different
 * meanings. The AU family's "Current Repayment Status" is a repayment-performance sentence, NOT a lifecycle
 * statement, so it must never be read as "the account is open". The shared status/closure detector now compares
 * only lifecycle-open statuses (OPEN, ACTIVE) against a printed closure date.
 *
 * This section proves:
 *   1. the reproduced AU sentence ("not overdue - Current up to and including the grace period") beside a closure
 *      date is a BENIGN case (no issue), and its raw reading + location are preserved;
 *   2. a lifecycle-open status (Status: Open) beside a closure date is still a POSITIVE (retained);
 *   3. a repayment-performance status (Status: Current) beside a closure date is benign (removed signal);
 *   4. the retained positive still reaches the entitled verification-packet download through the real upload path.
 */
const crypto = require('node:crypto');
const auFamily = require('../../format-families/au-equifax-consumer.cjs');
const commonErrors = require('../../common-errors.cjs');
const issues = require('../../issues.cjs');
const formats = require('../../formats.cjs');
const { makeSyntheticModel } = require('../../../../internal-validation/ca-ns-last-payment-six-year/document-model.cjs');
const { buildPdf } = require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');

const A4 = { width_pt: 595.32, height_pt: 841.92, label: 'A4' };
const FOOTER = `${auFamily.PUBLISHER_NAME}   Page {page} of {pages}   ABN: ${auFamily.PUBLISHER_ABN}`;

function auModel(liabilityLines) {
  const pages = [
    ['CASE SUBJECT', 'Report Date: 4 January 2016', 'Reference: 0000'],
    [FOOTER.replace('Page {page} of {pages}', 'Page 2 of 3'), '', 'Personal Information', '', 'Credit Overview', '', 'Summary'],
    [FOOTER.replace('Page {page} of {pages}', 'Page 3 of 3'), '', 'Consumer Credit Liability Information', ...liabilityLines]
  ];
  return makeSyntheticModel({ pages, page_count: pages.length, page_size: A4 });
}

const SYNTHETIC_ADMISSION = Object.freeze({
  state: 'SYNTHETIC_STRUCTURAL_TEST_INPUT_NOT_A_REPORT',
  admitted: true,
  refusal_reason: null,
  fact_status: null,
  presentation_evidence: false
});

function auExtraction(liabilityLines) {
  const x = auFamily.extract(auModel(liabilityLines), SYNTHETIC_ADMISSION);
  for (const r of x.records) {
    r.source_bureau = 'Equifax';
    r.source_report_reference_date = '2016-01-04';
  }
  return { presentation_id: auFamily.FAMILY_ID, family_id: auFamily.FAMILY_ID, records: x.records };
}

function pipeline(extraction) {
  const ce = commonErrors.runCommonErrorChecks({ extraction });
  const iss = issues.issuesFor({ evaluation: { results: [], common_errors: ce }, extraction });
  return { ce, iss };
}

function statusDateIssues(iss) {
  return iss.filter((i) => i.check_id === 'COMMON-ERROR-STATUS-DATE-CONTRADICTION');
}

function generalExtraction(lines) {
  return formats.extractWithSharedAdapter(makeSyntheticModel({ pages: [lines] }), { mode: 'REPORT', country: 'US' });
}

async function payReportOnce(service, actor, caseId) {
  const checkout = await service.request('POST', '/api/billing/checkout', { token: actor.token, body: { plan_code: 'monthly' } });
  const c = checkout.json.checkout;
  const event = {
    id: `test_evt_${crypto.randomBytes(8).toString('hex')}`,
    type: 'checkout.session.completed',
    account_reference: actor.account_id,
    plan_code: c.plan.plan_code,
    session_reference: c.provider_reference,
    amount_cents: c.plan.amount_cents,
    currency: c.plan.currency,
    occurred_at: new Date().toISOString()
  };
  await service.postEvent(event);
}

const uploadBody = (bytes, filename) => ({
  originalFilename: filename,
  declaredBytes: bytes.length,
  mimeType: 'application/pdf',
  contentBase64: bytes.toString('base64')
});


async function run(service, check) {
  const evidence = {};

  /* ---- 1. The reproduced AU repayment-status sentence beside a closure date is BENIGN. ---- */
  const au = pipeline(auExtraction([
    'Credit Provider  SOME BANK',
    'Type Of Account  Credit Card',
    'Opened Date  1 January 2019',
    'Closed Date  1 January 2019',
    'Current Repayment Status  The consumer credit is not overdue - Current up to and including the grace period'
  ]));
  check.equal(statusDateIssues(au.iss).length, 0, 'the reproduced AU "Current" repayment sentence beside a closure date produces no status/closure issue');
  const auRec = auExtraction(['Credit Provider  SOME BANK', 'Type Of Account  Credit Card', 'Opened Date  1 January 2019', 'Closed Date  1 January 2019', 'Current Repayment Status  The consumer credit is not overdue - Current up to and including the grace period']).records[0];
  check.equal(auRec.facts['account.status'], undefined, 'the AU repayment sentence is never mapped to the lifecycle status fact');
  check.equal(auRec.printed.current_repayment_status.raw, 'The consumer credit is not overdue - Current up to and including the grace period', 'and its raw reading is preserved');
  check.ok(auRec.printed.current_repayment_status.location && auRec.printed.current_repayment_status.location.page === 3, 'with its source location');

  /* ---- 2. A lifecycle-open status beside a closure date is still POSITIVE (retained). ---- */
  const open = pipeline(generalExtraction([
    'Experian Consumer Credit Report - FICTIONAL TEST FIXTURE',
    'Report Date: June 12, 2026',
    'Creditor A  Opened 01/01/2018  Closed 01/01/2020  Status Open'
  ]));
  const openIssues = statusDateIssues(open.iss);
  check.equal(openIssues.length, 1, 'an open lifecycle status beside a closure date is still one issue');
  check.equal(openIssues[0].classification, null, 'never a legal classification');
  check.equal(openIssues[0].request_type, 'VERIFICATION', 'as a verification request');

  /* ---- 3. A repayment-performance status beside a closure date is benign (removed signal). ---- */
  const current = pipeline(generalExtraction([
    'Experian Consumer Credit Report - FICTIONAL TEST FIXTURE',
    'Report Date: June 12, 2026',
    'Creditor A  Opened 01/01/2018  Closed 01/01/2020  Status Current'
  ]));
  check.equal(statusDateIssues(current.iss).length, 0, 'a "Current" repayment status beside a closure date is never read as open');

  /* ---- 4. The retained positive still reaches the entitled download through the real upload path. ---- */
  const owner = await service.unpaidAccount('bt-status@example.test');
  const c = (await service.request('POST', '/api/cases', { token: owner.token, body: { country: 'US', region: 'US-CA' } })).json.case;
  await payReportOnce(service, owner, c.case_id);
  const pdf = buildPdf({ pages: [{ lines: ['Experian Consumer Credit Report - FICTIONAL TEST FIXTURE', 'Report Date: June 12, 2026', 'Creditor A  Opened 01/01/2018  Closed 01/01/2020  Status Open'] }] });
  const up = await service.request('POST', `/api/cases/${c.case_id}/files`, { token: owner.token, body: uploadBody(pdf, 'status.pdf') });
  check.equal(up.status, 201, 'the open-status report uploads');
  await service.request('POST', `/api/cases/${c.case_id}/evaluate`, { token: owner.token });
  const pv = (await service.request('GET', `/api/cases/${c.case_id}/packet`, { token: owner.token })).json.view;
  const sel = pv.eligible_issues.find((i) => i.explanation && i.explanation.indexOf('status says it is open') !== -1);
  check.ok(sel, 'the lifecycle-open status/closure issue is offered for selection');
  await service.request('POST', `/api/cases/${c.case_id}/packet/select`, { token: owner.token, body: { issue_ids: [sel.issue_id] } });
  await service.request('POST', `/api/cases/${c.case_id}/packet/correspondence`, { token: owner.token, body: { correspondence: { consumer_name: 'Dana Whitfield', contact: 'dana.whitfield@example.test' } } });
  await service.request('POST', `/api/cases/${c.case_id}/packet/approve`, { token: owner.token });
  const dl = await service.request('GET', `/api/cases/${c.case_id}/packet-download`, { token: owner.token });
  check.equal(dl.status, 200, 'the retained positive downloads');
  check.ok(/status says it is open/.test(dl.text), 'with the factual verification request');

  evidence.au_repayment_status_benign = 'the AU "Current Repayment Status" sentence beside a closure date is benign; the raw reading and location are preserved and the sentence is never mapped to the lifecycle status fact';
  evidence.lifecycle_open_positive = 'a lifecycle-open status (Status: Open) beside a closure date remains a selectable verification issue through the upload path';
  evidence.repayment_current_benign = 'a repayment-performance status (Status: Current) beside a closure date is never read as open';
  return evidence;
}

module.exports = {
  run,
  id: 'bt-ordinary-field-coverage',
  title: 'OWNER-POTENTIAL-ISSUE-001 Branch A: lifecycle vs repayment status meaning'
};
