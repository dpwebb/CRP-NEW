'use strict';
/**
 * bs-prime-directive-delivery.cjs — the consumer delivery of the newly qualified retention path (Branch B) and the
 * AU contradictory-date issue (Branch A) through the complete fictional upload -> extraction -> issue -> Wizzard
 * selection/review -> approval -> entitled verification-packet download, with rule-specific checks and the required
 * controls.
 *
 * Downstream vs upload-path evidence are kept distinct: the qualified retention issue is produced by a REAL
 * fictional PDF upload through the general intake; the AU contradictory-date issue (whose family reader admits only
 * the real structural contract, not a synthetic PDF) is injected into the store exactly like the Batch-1 probable
 * qualifier, and the packet endpoints below are the real service endpoints.
 */
const crypto = require('node:crypto');
const auFamily = require('../../format-families/au-equifax-consumer.cjs');
const commonErrors = require('../../common-errors.cjs');
const formats = require('../../formats.cjs');
const evaluation = require('../../evaluation.cjs');
const issues = require('../../issues.cjs');
const { makeSyntheticModel } = require('../../../../internal-validation/ca-ns-last-payment-six-year/document-model.cjs');
const { buildPdf } = require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');

const uploadBody = (bytes, filename) => ({
  originalFilename: filename,
  declaredBytes: bytes.length,
  mimeType: 'application/pdf',
  contentBase64: bytes.toString('base64')
});

async function payReportOnce(service, actor, caseId) {
  const checkout = await service.request('POST', '/api/billing/checkout', { token: actor.token, body: { plan_code: 'report_once', case_id: caseId } });
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
  presentation_evidence: false,
  note: 'in-memory structural model: not a report, not presentation evidence'
});

function auExtraction(liabilityLines) {
  const x = auFamily.extract(auModel(liabilityLines), SYNTHETIC_ADMISSION);
  return { presentation_id: auFamily.FAMILY_ID, family_id: auFamily.FAMILY_ID, records: x.records };
}

function pipeline(extraction) {
  const ce = commonErrors.runCommonErrorChecks({ extraction });
  const iss = issues.issuesFor({ evaluation: { results: [], common_errors: ce }, extraction });
  return { ce, iss };
}

async function run(service, check) {
  const evidence = {};

  /* ---- 1. Qualified retention path: fictional upload -> qualified issue -> Wizzard -> entitled download. ---- */
  const owner = await service.unpaidAccount('bs-qual@example.test');
  const c = (await service.request('POST', '/api/cases', { token: owner.token, body: { country: 'US', region: 'US-NY' } })).json.case;
  await payReportOnce(service, owner, c.case_id);
  const pdf = buildPdf({ pages: [{ lines: ['Experian Consumer Credit Report - FICTIONAL TEST FIXTURE', 'Report Date: June 12, 2026', 'Account 30 days past due as of Jun 2015'] }] });
  const up = await service.request('POST', `/api/cases/${c.case_id}/files`, { token: owner.token, body: uploadBody(pdf, 'adverse.pdf') });
  check.equal(up.status, 201, 'the adverse-rating report uploads');
  const ev = await service.request('POST', `/api/cases/${c.case_id}/evaluate`, { token: owner.token });
  check.equal(ev.status, 201, 'and evaluates');

  const pv = (await service.request('GET', `/api/cases/${c.case_id}/packet`, { token: owner.token })).json.view;
  const qual = pv.eligible_issues.find((i) => (i.citation && i.citation.indexOf('1681c(a)(5)') !== -1));
  check.ok(qual, 'the qualified probable issue is offered for selection');
  check.equal(qual.confidence, 'PROBABLE', 'as a probable issue');
  check.equal(qual.request_type, 'VERIFICATION', 'with a verification request');
  /* Requirement 3: the affirmative concern leads, then the specific exception uncertainty, never "exception is false". */
  check.ok(/entry older than the ordinary reporting period/.test(qual.explanation), 'the explanation leads with the affirmative concern');
  check.ok(/not shown to be absent/.test(qual.uncertainty), 'the uncertainty states the exception is unknown, not absent');
  check.ok(/credit transaction involving \$150,000/.test(qual.uncertainty), 'and names the benign alternative (a permitted use)');
  check.ok(/probable reporting issue, not an established one/.test(qual.uncertainty), 'staying probable, never established');

  await service.request('POST', `/api/cases/${c.case_id}/packet/select`, { token: owner.token, body: { issue_ids: [qual.issue_id] } });
  await service.request('POST', `/api/cases/${c.case_id}/packet/correspondence`, { token: owner.token, body: { correspondence: { consumer_name: 'Dana Whitfield', contact: 'dana.whitfield@example.test' } } });
  await service.request('POST', `/api/cases/${c.case_id}/packet/approve`, { token: owner.token });
  const dl = await service.request('GET', `/api/cases/${c.case_id}/packet-download`, { token: owner.token });
  check.equal(dl.status, 200, 'the qualified probable packet downloads');
  check.ok(/entry older than the ordinary reporting period/.test(dl.text), 'with the affirmative concern in the packet');
  check.ok(/not shown to be absent/.test(dl.text), 'with the exception uncertainty');
  check.ok(/verify whether an exception/.test(dl.text), 'with the verification request');
  check.ok(!/established reporting issue/.test(dl.text), 'never asserting a definite breach');

  /* ---- 2. AU contradictory-date issue: store-injected extraction -> Wizzard -> entitled download, preserving raw readings + locations. ---- */
  const auOwner = await service.unpaidAccount('bs-au@example.test');
  const auCase = (await service.request('POST', '/api/cases', { token: auOwner.token, body: { country: 'AU', region: 'AU-NSW' } })).json.case;
  await payReportOnce(service, auOwner, auCase.case_id);
  const auExt = auExtraction(['Credit Provider  SOME BANK', 'Type Of Account  Credit Card', 'Opened Date  1 January 2020', 'Closed Date  1 January 2019']);
  const auCe = commonErrors.runCommonErrorChecks({ extraction: auExt });
  const auIssues = issues.issuesFor({ evaluation: { results: [], common_errors: auCe }, extraction: auExt });
  const auIssue = auIssues.find((i) => i.check_id === 'COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY');
  check.ok(auIssue, 'the AU contradictory-date issue is produced');
  service.service.store.update((state) => {
    state.results.push({
      result_id: `res_au_${crypto.randomBytes(10).toString('hex')}`,
      case_id: auCase.case_id,
      account_id: auOwner.account_id,
      file_id: null,
      file_ids: [],
      evaluation: { results: [], common_errors: auCe },
      extraction: { records: auExt.records, bureau: 'Equifax Australia', reference_date: { normalized_value: '2016-01-04' } },
      clarification_eligibility: [],
      reviewed_at: null,
      created_at: new Date().toISOString()
    });
  });
  const auPv = (await service.request('GET', `/api/cases/${auCase.case_id}/packet`, { token: auOwner.token })).json.view;
  const auSel = auPv.eligible_issues.find((i) => (i.check_kind && i.check_kind.indexOf('contradictory dates') !== -1));
  check.ok(auSel, 'the AU issue is offered for selection');
  check.ok(auSel.source_facts && auSel.source_facts.some((f) => f.raw_value === '1 January 2020' && f.normalized_value === '2020-01-01'), 'preserving the printed raw reading and normalization');
  check.ok(auSel.source_facts && auSel.source_facts.some((f) => f.location && f.location.page === 3), 'and the source page location');
  await service.request('POST', `/api/cases/${auCase.case_id}/packet/select`, { token: auOwner.token, body: { issue_ids: [auSel.issue_id] } });
  await service.request('POST', `/api/cases/${auCase.case_id}/packet/correspondence`, { token: auOwner.token, body: { correspondence: { consumer_name: 'Dana Whitfield', contact: 'dana.whitfield@example.test' } } });
  await service.request('POST', `/api/cases/${auCase.case_id}/packet/approve`, { token: auOwner.token });
  const auDl = await service.request('GET', `/api/cases/${auCase.case_id}/packet-download`, { token: auOwner.token });
  check.equal(auDl.status, 200, 'the AU contradictory-date packet downloads');
  check.ok(/1 January 2020/.test(auDl.text), 'with the printed opened date');
  check.ok(/opened date later than its closed date/.test(auDl.text), 'and the factual verification request');

  /* ---- 3. Controls: applicable exception, in-period, missing evidence, cross-account, edited wording. ---- */
  const rOwner = await service.unpaidAccount('bs-ru@example.test');
  const rCase = (await service.request('POST', '/api/cases', { token: rOwner.token, body: { country: 'US', region: 'US-NY' } })).json.case;
  await payReportOnce(service, rOwner, rCase.case_id);
  await service.request('POST', `/api/cases/${rCase.case_id}/files`, { token: rOwner.token, body: uploadBody(pdf, 'adverse2.pdf') });
  const rEval = (await service.request('POST', `/api/cases/${rCase.case_id}/evaluate`, { token: rOwner.token })).json;
  const rPv = (await service.request('GET', `/api/cases/${rCase.case_id}/packet`, { token: rOwner.token })).json.view;
  check.ok(rPv.eligible_issues.some((i) => (i.citation && i.citation.indexOf('1681c(a)(5)') !== -1)), 'the probable issue surfaces before the answer');
  await service.request('POST', `/api/cases/${rCase.case_id}/results/${rEval.result_id}/clarify`, { token: rOwner.token, body: { answers: [
    { question_id: 'report-use', answer: 'credit_transaction' },
    { question_id: 'report-use-amount', purpose: 'credit_transaction', answer: 'at_least_150k' }
  ] } });
  const rAfter = (await service.request('GET', `/api/cases/${rCase.case_id}/packet`, { token: rOwner.token })).json.view;
  check.ok(!rAfter.eligible_issues.some((i) => (i.citation && i.citation.indexOf('1681c(a)(5)') !== -1)), 'an at-threshold report-use answer removes the surfaced probable issue');

  const inPeriod = buildPdf({ pages: [{ lines: ['Experian Consumer Credit Report - FICTIONAL TEST FIXTURE', 'Report Date: June 12, 2026', 'Account 30 days past due as of Jun 2022'] }] });
  const ipCase = (await service.request('POST', '/api/cases', { token: rOwner.token, body: { country: 'US', region: 'US-NY' } })).json.case;
  await payReportOnce(service, rOwner, ipCase.case_id);
  await service.request('POST', `/api/cases/${ipCase.case_id}/files`, { token: rOwner.token, body: uploadBody(inPeriod, 'inperiod.pdf') });
  await service.request('POST', `/api/cases/${ipCase.case_id}/evaluate`, { token: rOwner.token });
  const ipPv = (await service.request('GET', `/api/cases/${ipCase.case_id}/packet`, { token: rOwner.token })).json.view;
  check.ok(!ipPv.eligible_issues.some((i) => (i.citation && i.citation.indexOf('1681c(a)(5)') !== -1)), 'an in-period adverse date surfaces no issue');

  const missPdf = buildPdf({ pages: [{ lines: ['Experian Consumer Credit Report - FICTIONAL TEST FIXTURE', 'Report Date: June 12, 2026'] }] });
  const mCase = (await service.request('POST', '/api/cases', { token: rOwner.token, body: { country: 'US', region: 'US-NY' } })).json.case;
  await payReportOnce(service, rOwner, mCase.case_id);
  await service.request('POST', `/api/cases/${mCase.case_id}/files`, { token: rOwner.token, body: uploadBody(missPdf, 'missing.pdf') });
  await service.request('POST', `/api/cases/${mCase.case_id}/evaluate`, { token: rOwner.token });
  const mPv = (await service.request('GET', `/api/cases/${mCase.case_id}/packet`, { token: rOwner.token })).json.view;
  check.ok(!mPv.eligible_issues.some((i) => (i.citation && i.citation.indexOf('1681c(a)(5)') !== -1)), 'missing decisive evidence surfaces no issue (missing information is not a concern)');

  const stranger = await service.unpaidAccount('bs-stranger@example.test');
  const cross = await service.request('GET', `/api/cases/${c.case_id}/packet`, { token: stranger.token });
  check.equal(cross.status, 403, 'another account cannot read the packet');

  await service.request('POST', `/api/cases/${c.case_id}/packet/wording`, { token: owner.token, body: { wording: 'Changed after approval.' } });
  const staleDl = await service.request('GET', `/api/cases/${c.case_id}/packet-download`, { token: owner.token });
  check.equal(staleDl.status, 409, 'editing wording after approval invalidates the download');

  evidence.qualified_upload = 'unresolved-exception qualified path reaches selection + entitled verification-packet download from a fictional upload';
  evidence.wording = 'affirmative concern leads; exception uncertainty is plain and never asserts an absent exception';
  return evidence;
}

module.exports = {
  run,
  id: 'bs-prime-directive-delivery',
  title: 'OWNER-POTENTIAL-ISSUE-001 delivery: qualified retention + AU contradictory-date through the complete packet path'
};

