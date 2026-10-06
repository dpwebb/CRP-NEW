'use strict';
/**
 * bv-admission-and-upload.cjs — OWNER-POTENTIAL-ISSUE-001: admission contracts, fictional upload fixtures, and the
 * US balance/past-due field mapping.
 *
 * (1) The family admission contracts are STRUCTURAL, not digest/specimen gates. They refuse (a) in-memory models
 *     (MODEL_IS_A_FILE_NOT_AN_IN_MEMORY_MODEL), (b) fixture/synthetic page-text markers (NO_FIXTURE_OR_SYNTHETIC_MARKER),
 *     and (c) wrong-channel markers. TU-CA additionally refuses the synthetic factory's producer string
 *     (producerIsAFixtureFactory) — a genuine safeguard that marks the fixture writer, so TU-CA stays downstream.
 * (2) AU and GB therefore accept a fictional, structurally faithful PDF (buildPdf: right headings + footer + consumer
 *     markers + fictional data, no fixture marker). These run the REAL upload path, not store injection.
 * (3) The US-Experian reader now maps its already-read amounts (Recent balance, Past due amount, Credit limit,
 *     Monthly payment) to account facts, enabling BALANCE-PAYMENT-INCONSISTENCY.
 */
const crypto = require('node:crypto');
const auFamily = require('../../format-families/au-equifax-consumer.cjs');
const gbFamily = require('../../format-families/gb-experian-consumer.cjs');
const tuFamily = require('../../format-families/tu-ca-consumer.cjs');
const commonErrors = require('../../common-errors.cjs');
const issues = require('../../issues.cjs');
const formats = require('../../formats.cjs');
const { buildPdf } = require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');

const NAME = auFamily.PUBLISHER_NAME;
const ABN = auFamily.PUBLISHER_ABN;

function auPages() {
  return [
    { lines: ['CASE SUBJECT', 'Report Date: 4 January 2016', 'Reference: 0000'] },
    { lines: [`${NAME}   Page 2 of 3   ${ABN}`, '', 'Personal Information', '', 'Credit Overview', '', 'Summary'] },
    { lines: [`${NAME}   Page 3 of 3   ${ABN}`, '', 'Consumer Credit Information', 'Publically Available Consumer Information', 'Consumer Credit Liability Information', 'Credit Provider  SOME BANK', 'Type Of Account  Credit Card', 'Opened Date  1 January 2020', 'Closed Date  1 January 2019'] }
  ];
}

function gbPages() {
  return [
    { lines: ['Your Credit Report', 'Date of report: 1 June 2007', 'Consumer Help Service', 'Useful addresses', 'Application details', 'Electoral roll information', 'Aliases', 'Financial associations', 'Public record information', 'Credit account information', 'C1  SOME BANK', 'Started 19/10/06', 'Settled 19/10/05', 'Previous searches', 'Notice of Correction'] }
  ];
}

const uploadBody = (bytes, filename) => ({ originalFilename: filename, declaredBytes: bytes.length, mimeType: 'application/pdf', contentBase64: bytes.toString('base64') });

async function payReportOnce(service, actor, caseId) {
  const checkout = await service.request('POST', '/api/billing/checkout', { token: actor.token, body: { plan_code: 'report_once', case_id: caseId } });
  const c = checkout.json.checkout;
  const event = { id: `test_evt_${crypto.randomBytes(8).toString('hex')}`, type: 'checkout.session.completed', account_reference: actor.account_id, plan_code: c.plan.plan_code, session_reference: c.provider_reference, amount_cents: c.plan.amount_cents, currency: c.plan.currency, occurred_at: new Date().toISOString() };
  await service.postEvent(event);
}

async function uploadAndEvaluate(service, check, actor, caseId, pages, filename, expectedPresentation) {
  const pdf = buildPdf({ pages });
  const up = await service.request('POST', `/api/cases/${caseId}/files`, { token: actor.token, body: uploadBody(pdf, filename) });
  check.equal(up.status, 201, `${filename} uploads`);
  check.equal(up.json.receipt.format_detection.presentation_id, expectedPresentation, `and is admitted as ${expectedPresentation}`);
  const ev = await service.request('POST', `/api/cases/${caseId}/evaluate`, { token: actor.token });
  check.equal(ev.status, 201, 'and evaluates');
  return ev;
}

async function run(service, check) {
  const evidence = {};

  /* ---- 1. Admission contracts: compatible positives + incompatible negatives (unit-level). ---- */
  const fs = require('node:fs'); const os = require('node:os'); const path = require('node:path');
  const { buildPdfDocumentModel } = require('../../../../internal-validation/ca-ns-last-payment-six-year/document-model.cjs');
  function admitOf(fam, pages) {
    const bytes = buildPdf({ pages });
    const f = path.join(os.tmpdir(), `bv-${fam.FAMILY_ID}-${crypto.randomBytes(4).toString('hex')}.pdf`); fs.writeFileSync(f, bytes);
    const model = buildPdfDocumentModel(f);
    const adm = fam.admit(model);
    fs.unlinkSync(f);
    return adm;
  }
  const auAdmit = admitOf(auFamily, auPages());
  check.equal(auAdmit.admitted, true, 'a fictional AU PDF with the family structure is admitted');
  check.ok(auAdmit.predicates.every((p) => p.passed), 'on every structural predicate');
  const auMissing = admitOf(auFamily, auPages().map((p) => ({ lines: p.lines.filter((l) => l !== 'Publically Available Consumer Information') })));
  check.equal(auMissing.refusal_reason, 'NOT_THE_EVIDENCED_FAMILY_STRUCTURE', 'an AU PDF missing a required heading is refused at the structure predicate');
  const gbAdmit = admitOf(gbFamily, gbPages());
  check.equal(gbAdmit.admitted, true, 'a fictional GB PDF with the family structure is admitted');
  const gbFixture = admitOf(gbFamily, [{ lines: ['SYNTHETIC TEST INPUT', ...gbPages()[0].lines] }]);
  check.equal(gbFixture.refusal_reason, 'FAMILY_SYNTHETIC_OR_FIXTURE_MARKER', 'a GB PDF printing a fixture marker is refused');
  const tuAdmit = admitOf(tuFamily, [{ lines: ['Account(s)', 'Creditor Name'] }]);
  check.equal(tuAdmit.admitted, false, 'the TU-CA fixture writer is refused');
  const producerPredicate = tuAdmit.predicates.find((p) => p.id === 'NO_FIXTURE_OR_SYNTHETIC_MARKER');
  check.ok(producerPredicate && /producer names a synthetic factory/.test(producerPredicate.detail), 'because the TU-CA contract also names the synthetic factory producer (a genuine safeguard, not removed)');
  evidence.admission = { au_predicates: auAdmit.predicates.map((p) => p.id), gb_predicates: gbAdmit.predicates.map((p) => p.id), tu_ca_producer_check: true };

  /* ---- 2. AU actual upload -> account-dates issue -> entitled packet. ---- */
  const auOwner = await service.unpaidAccount('bv-au@example.test');
  const auCase = (await service.request('POST', '/api/cases', { token: auOwner.token, body: { country: 'AU', region: 'AU-NSW' } })).json.case;
  await payReportOnce(service, auOwner, auCase.case_id);
  await uploadAndEvaluate(service, check, auOwner, auCase.case_id, auPages(), 'au.pdf', 'FAM-AU-EQX-CONSUMER');
  let pv = (await service.request('GET', `/api/cases/${auCase.case_id}/packet`, { token: auOwner.token })).json.view;
  let sel = pv.eligible_issues.find((i) => i.explanation && i.explanation.indexOf('opened date later than its closed date') !== -1);
  check.ok(sel, 'the AU account-dates issue is offered for selection through the real upload path');
  check.ok(sel.source_facts.some((f) => f.raw_value === '1 January 2020'), 'with the printed opened date as raw provenance');
  await service.request('POST', `/api/cases/${auCase.case_id}/packet/select`, { token: auOwner.token, body: { issue_ids: [sel.issue_id] } });
  await service.request('POST', `/api/cases/${auCase.case_id}/packet/correspondence`, { token: auOwner.token, body: { correspondence: { consumer_name: 'Dana Whitfield', contact: 'dana.whitfield@example.test' } } });
  await service.request('POST', `/api/cases/${auCase.case_id}/packet/approve`, { token: auOwner.token });
  const auDl = await service.request('GET', `/api/cases/${auCase.case_id}/packet-download`, { token: auOwner.token });
  check.equal(auDl.status, 200, 'the AU packet downloads');
  check.ok(auDl.text.includes('1 January 2020'), 'with the printed raw reading');

  /* ---- 3. GB actual upload -> account-dates issue -> entitled packet. ---- */
  const gbOwner = await service.unpaidAccount('bv-gb@example.test');
  const gbCase = (await service.request('POST', '/api/cases', { token: gbOwner.token, body: { country: 'GB', region: 'GB-ENG' } })).json.case;
  await payReportOnce(service, gbOwner, gbCase.case_id);
  await uploadAndEvaluate(service, check, gbOwner, gbCase.case_id, gbPages(), 'gb.pdf', 'FAM-GB-EXP-CONSUMER');
  pv = (await service.request('GET', `/api/cases/${gbCase.case_id}/packet`, { token: gbOwner.token })).json.view;
  sel = pv.eligible_issues.find((i) => i.explanation && i.explanation.indexOf('opened date later than its closed date') !== -1);
  check.ok(sel, 'the GB account-dates issue is offered for selection through the real upload path');
  check.ok(sel.source_facts.some((f) => f.raw_value === '19/10/06'), 'with the printed Started reading as raw provenance');
  await service.request('POST', `/api/cases/${gbCase.case_id}/packet/select`, { token: gbOwner.token, body: { issue_ids: [sel.issue_id] } });
  await service.request('POST', `/api/cases/${gbCase.case_id}/packet/correspondence`, { token: gbOwner.token, body: { correspondence: { consumer_name: 'Dana Whitfield', contact: 'dana.whitfield@example.test' } } });
  await service.request('POST', `/api/cases/${gbCase.case_id}/packet/approve`, { token: gbOwner.token });
  const gbDl = await service.request('GET', `/api/cases/${gbCase.case_id}/packet-download`, { token: gbOwner.token });
  check.equal(gbDl.status, 200, 'the GB packet downloads');
  check.ok(gbDl.text.includes('19/10/06'), 'with the printed raw reading');

  /* ---- 4. US balance/past-due mapping: BALANCE-PAYMENT-INCONSISTENCY (downstream synthetic record -> packet). ---- */
  const usExtraction = { presentation_id: 'US-CONSUMER-DISCLOSURE', family_id: 'FAM-US-EXP-CONSUMER', records: [{ record_index: 1, kind: 'REPORTED_ACCOUNT', kind_label: 'reported account', status: 'RESOLVED', facts: { 'account.balance': 100, 'account.pastDueAmount': 150 }, printed: { recent_balance: { label: 'Recent balance', raw: '$100', normalized: 100, location: { page: 1, line: 1 } }, past_due_amount: { label: 'Past due amount', raw: '$150', normalized: 150, location: { page: 1, line: 2 } } } }] };
  const usCe = commonErrors.runCommonErrorChecks({ extraction: usExtraction });
  const usIss = issues.issuesFor({ evaluation: { results: [], common_errors: usCe }, extraction: usExtraction });
  const bp = usIss.filter((i) => i.check_id === 'COMMON-ERROR-BALANCE-PAYMENT-INCONSISTENCY');
  check.equal(bp.length, 1, 'a past-due amount larger than its balance is one balance/payment issue');
  check.equal(bp[0].classification, null, 'never a legal classification');
  check.equal(bp[0].request_type, 'VERIFICATION', 'as a verification request');
  const usOwner = await service.unpaidAccount('bv-us@example.test');
  const usCase = (await service.request('POST', '/api/cases', { token: usOwner.token, body: { country: 'US', region: 'US-CA' } })).json.case;
  await payReportOnce(service, usOwner, usCase.case_id);
  service.service.store.update((state) => { state.results.push({ result_id: `res_us_${crypto.randomBytes(10).toString('hex')}`, case_id: usCase.case_id, account_id: usOwner.account_id, file_id: null, file_ids: [], evaluation: { results: [], common_errors: usCe }, extraction: usExtraction, clarification_eligibility: [], reviewed_at: null, created_at: new Date().toISOString() }); });
  pv = (await service.request('GET', `/api/cases/${usCase.case_id}/packet`, { token: usOwner.token })).json.view;
  sel = pv.eligible_issues.find((i) => i.explanation && i.explanation.indexOf('past-due amount') !== -1);
  check.ok(sel, 'the US balance/payment issue is offered for selection (downstream fixture)');
  await service.request('POST', `/api/cases/${usCase.case_id}/packet/select`, { token: usOwner.token, body: { issue_ids: [sel.issue_id] } });
  await service.request('POST', `/api/cases/${usCase.case_id}/packet/correspondence`, { token: usOwner.token, body: { correspondence: { consumer_name: 'Dana Whitfield', contact: 'dana.whitfield@example.test' } } });
  await service.request('POST', `/api/cases/${usCase.case_id}/packet/approve`, { token: usOwner.token });
  const usDl = await service.request('GET', `/api/cases/${usCase.case_id}/packet-download`, { token: usOwner.token });
  check.equal(usDl.status, 200, 'the US balance/payment packet downloads');
  check.ok(usDl.text.includes('$150'), 'with the printed past-due amount as evidence');

  evidence.au_gb_upload = 'AU and GB fictional, structurally faithful PDFs run the real upload path (not store injection) to the entitled packet';
  evidence.us_balance_payment = 'US-Experian Recent balance / Past due amount map to account facts enabling BALANCE-PAYMENT-INCONSISTENCY (downstream synthetic record)';
  evidence.tu_ca_constraint = 'TU-CA additionally refuses the synthetic factory producer, so its field paths remain downstream';
  return evidence;
}

module.exports = { run, id: 'bv-admission-and-upload', title: 'OWNER-POTENTIAL-ISSUE-001: admission contracts, AU/GB upload fixtures, US balance/past-due' };
