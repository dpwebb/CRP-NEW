'use strict';
/**
 * ca-au-ordinary-field.cjs — OWNER-ORDINARY-FIELD-001: one concrete ordinary-account field improvement on an
 * existing family reader, verified through the real Issue -> Wizzard -> selected-packet path.
 *
 * The improvement: the Equifax Australia family reader now reads the LEADING printed date of its own `Opened
 * Date` / `Closed Date` value when that value carries the report's trailing classification on the same printed
 * line. The admitted PUB-012 sample prints exactly that (`15 Nov 2013 Secured or Partially Secured`), and before
 * this change the record yielded no date at all. Nothing is inferred: the whole printed value is retained as the
 * raw reading, the trailing text is never interpreted, and a value with no leading printed date stays malformed.
 *
 * Verified here: the evidence on the REAL sample (the field is now read, and nothing else changes), a POSITIVE
 * case through select -> approve -> download with the printed value in the packet, a BENIGN control (a record that
 * prints the trailing classification but no closure produces no issue), the provenance, and the downloaded content.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const auFamily = require('../../format-families/au-equifax-consumer.cjs');
const formats = require('../../formats.cjs');
const commonErrors = require('../../common-errors.cjs');
const issues = require('../../issues.cjs');
const { makeSyntheticModel } = require('../../../../internal-validation/ca-ns-last-payment-six-year/document-model.cjs');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const PUB_012 = path.join(ROOT, 'SOURCE_CAPTURES', 'REPORT_FORMAT_BASELINE_2026-09-30', 'PUB-012.pdf');
const A4 = { width_pt: 595.32, height_pt: 841.92, label: 'A4' };
const FOOTER = `${auFamily.PUBLISHER_NAME}   Page {page} of {pages}   ABN: ${auFamily.PUBLISHER_ABN}`;
const SYNTHETIC_ADMISSION = Object.freeze({
  state: 'SYNTHETIC_STRUCTURAL_TEST_INPUT_NOT_A_REPORT', admitted: true, refusal_reason: null,
  fact_status: null, presentation_evidence: false,
  note: 'in-memory structural model: not a report, not presentation evidence'
});

function auModel(liabilityLines) {
  const pages = [
    ['CASE SUBJECT', 'Report Date: 4 January 2016', 'Reference: 0000'],
    [FOOTER.replace('Page {page} of {pages}', 'Page 2 of 3'), '', 'Personal Information', '', 'Credit Overview', '', 'Summary'],
    [FOOTER.replace('Page {page} of {pages}', 'Page 3 of 3'), '', 'Consumer Credit Liability Information', ...liabilityLines]
  ];
  return makeSyntheticModel({ pages, page_count: pages.length, page_size: A4 });
}

function auExtraction(liabilityLines) {
  const x = auFamily.extract(auModel(liabilityLines), SYNTHETIC_ADMISSION);
  return { presentation_id: auFamily.FAMILY_ID, family_id: auFamily.FAMILY_ID, records: x.records };
}

function accountDatesIssue(extraction) {
  const ce = commonErrors.runCommonErrorChecks({ extraction });
  return issues.issuesFor({ evaluation: { results: [], common_errors: ce }, extraction })
    .find((i) => i.check_id === 'COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY') || null;
}

async function payReportOnce(service, actor, caseId) {
  const checkout = await service.request('POST', '/api/billing/checkout', { token: actor.token, body: { plan_code: 'monthly' } });
  const c = checkout.json.checkout;
  await service.postEvent({
    id: `test_evt_${crypto.randomBytes(8).toString('hex')}`,
    type: 'checkout.session.completed', account_reference: actor.account_id, plan_code: c.plan.plan_code,
    session_reference: c.provider_reference, amount_cents: c.plan.amount_cents, currency: c.plan.currency,
    occurred_at: new Date().toISOString()
  });
}

async function run(service, check) {
  const evidence = {};

  /* ---- 1. The improvement, measured on the REAL admitted sample. ---- */
  if (!fs.existsSync(PUB_012)) {
    check.skip('the captured Equifax Australia sample is present', 'THE_CAPTURED_PUBLIC_SAMPLE_PUB-012_IS_NOT_PRESENT');
  } else {
    const model = formats.buildPdfDocumentModel(PUB_012);
    const real = auFamily.extract(model, auFamily.admit(model));
    const liabilities = real.records.filter((r) => r.kind === 'CONSUMER_CREDIT_LIABILITY');
    const second = liabilities[1];
    check.equal(second.printed.opened_date.raw, '15 Nov 2013 Secured or Partially Secured',
      'the real sample prints an opened date carrying the report own trailing classification');
    check.equal(second.printed.opened_date.normalized, '2013-11-15', 'and the leading printed date is now read');
    check.equal(second.facts['liability.openedDate'], '2013-11-15', 'so the ordinary-account fact carries the printed date');
    check.equal(liabilities[0].printed.opened_date.normalized, '2013-04-11', 'a plain printed date is unchanged');
    check.equal(liabilities[2].printed.opened_date.normalized, null, 'a record that prints no date label still yields no date');
    check.equal(accountDatesIssue({ records: real.records }), null,
      'and the real sample still raises no contradictory-date issue, because it prints no closure value');
    evidence.real_sample = {
      artifact: 'PUB-012', printed: second.printed.opened_date.raw,
      normalized: second.printed.opened_date.normalized, issue_raised: false
    };
  }

  /* ---- 2. The benign control: the trailing classification alone changes nothing. ---- */
  const benign = accountDatesIssue(auExtraction([
    'Credit Provider  EXPRESS BANK', 'Type Of Account  Credit Card', 'Opened Date  15 Nov 2013 Secured or Partially Secured'
  ]));
  check.equal(benign, null, 'a record with the trailing classification and no closure raises no issue');

  /* ---- 3. The positive case, through the real Issue -> Wizzard -> selected packet path. ---- */
  const owner = await service.unpaidAccount('ca-au-field@example.test');
  const caseRow = (await service.request('POST', '/api/cases', { token: owner.token, body: { country: 'AU', region: 'AU-NSW' } })).json.case;
  await payReportOnce(service, owner, caseRow.case_id);
  const extraction = auExtraction([
    'Credit Provider  EXPRESS BANK', 'Type Of Account  Personal Loan (Fixed term)',
    'Opened Date  15 Nov 2013 Secured or Partially Secured', 'Closed Date  1 January 2013'
  ]);
  const ce = commonErrors.runCommonErrorChecks({ extraction });
  const issue = issues.issuesFor({ evaluation: { results: [], common_errors: ce }, extraction })
    .find((i) => i.check_id === 'COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY') || null;
  check.ok(issue, 'the fixture produces the ordinary-account contradictory-date issue');
  check.equal(issue.confidence, 'POTENTIAL', 'as a potential issue');
  check.equal(issue.request_type, 'VERIFICATION', 'with a factual verification request (no citation required)');
  const openedSource = (issue.source_facts || []).find((f) => f.field === 'liability.openedDate');
  check.equal(openedSource.raw_value, '15 Nov 2013 Secured or Partially Secured',
    'the issue keeps the FULL printed value as its raw evidence');
  check.equal(openedSource.normalized_value, '2013-11-15', 'with the normalization kept beside it');
  check.ok(openedSource.location && openedSource.location.page === 3, 'and its source page location');

  service.service.store.update((state) => {
    state.results.push({
      result_id: `res_au_of_${crypto.randomBytes(10).toString('hex')}`,
      case_id: caseRow.case_id, account_id: owner.account_id, file_id: null, file_ids: [],
      evaluation: { results: [], common_errors: ce },
      extraction: { records: extraction.records, bureau: 'Equifax Australia', reference_date: { normalized_value: '2016-01-04' } },
      clarification_eligibility: [], reviewed_at: null, created_at: new Date().toISOString()
    });
  });
  const pv = (await service.request('GET', `/api/cases/${caseRow.case_id}/packet`, { token: owner.token })).json.view;
  const offered = (pv.eligible_issues || []).find((i) => i.check_kind && i.check_kind.indexOf('contradictory dates') !== -1);
  check.ok(offered, 'the Wizzard offers the issue for selection');
  await service.request('POST', `/api/cases/${caseRow.case_id}/packet/select`, { token: owner.token, body: { issue_ids: [offered.issue_id] } });
  await service.request('POST', `/api/cases/${caseRow.case_id}/packet/correspondence`, { token: owner.token, body: { correspondence: { consumer_name: 'Dana Whitfield', contact: 'dana.whitfield@example.test' } } });
  await service.request('POST', `/api/cases/${caseRow.case_id}/packet/approve`, { token: owner.token });
  const dl = await service.request('GET', `/api/cases/${caseRow.case_id}/packet-download`, { token: owner.token });
  check.equal(dl.status, 200, 'the selected packet downloads');
  check.ok(/15 Nov 2013 Secured or Partially Secured/.test(dl.text), 'the packet states the full printed value');
  check.ok(/normalized to 2013-11-15/.test(dl.text), 'and its normalization');
  check.ok(/Request \(verification\)/.test(dl.text), 'with the verification request line');
  check.ok(/not, by itself, an established legal violation/.test(dl.text), 'and never asserts an established violation');

  evidence.positive = { issue: 'COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY', confidence: 'POTENTIAL', packet_bytes: (dl.text || '').length };
  evidence.benign = 'the real PUB-012 record and the no-closure control both raise no issue';
  evidence.provenance = 'the full printed value is kept as the raw reading with its page/line; the normalization is kept beside it';
  return evidence;
}

module.exports = { run, id: 'ca-au-ordinary-field', title: 'OWNER-ORDINARY-FIELD-001: one AU ordinary-account field improvement through the Issue -> packet path' };

