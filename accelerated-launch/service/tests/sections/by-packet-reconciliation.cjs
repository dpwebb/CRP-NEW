'use strict';
/**
 * Reconciles active checklist-related statutory comparisons and report-data rules with the
 * unified selectable issue and packet path. Retired content/enquiry findings are negative guards.
 * Fictional fixtures only; entitlement comes from the test adapter.
 */
const crypto = require('node:crypto');
const { comparableText } = require('../packet-pdf-assertions.cjs');
const ruleAdapters = require('../../../adapters/rule-adapters.cjs');
const issues = require('../../issues.cjs');
const { activeAdapter } = require('../../common-error-scope.cjs');
const auFamily = require('../../format-families/au-equifax-consumer.cjs');
const { buildPdf } = require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');

const REFERENCE = '2026-10-01';
const FIRST_REGION = { CA: 'CA-NS', US: 'US-CA', AU: 'AU-ACT', GB: 'GB-ENG' };
const FIELD_FIXTURES = {
  'publicRecord.bankruptcyOrderForReliefDate': '2010-01-01',
  'publicRecord.bankruptcyAdjudicationDate': '2005-01-01',
  'publicRecord.judgmentEntryDate': '2010-01-01',
  'publicRecord.taxLienPaidDate': '2010-01-01',
  'collection.delinquencyDate': '2010-01-01',
  'reportedAccount.adverseRatingDate': '2010-01-01',
  'enquiry.date': '2015-01-01',
  'overdue.originalListingDate': '2015-01-01',
  'liability.closedDate': '2020-01-01'
};
const CONTENT_FACTS = { 'criminalCharge.recordIdentified': true, 'criminalCharge.chargeState': 'PRESENT', 'criminalCharge.dismissedDispositionState': 'PRESENT', 'criminalCharge.entryComplete': true };

function regionFor(adapter) {
  const app = adapter.applicability || {};
  return app.mode === 'EXACT' ? app.region : FIRST_REGION[app.country];
}

function driveFinding(adapter) {
  const app = adapter.applicability || {};
  const region = regionFor(adapter);
  if (adapter.anchor_mode === 'CONTENT_INCLUSION') {
    const sources = {};
    for (const k of Object.keys(CONTENT_FACTS)) sources[k] = { raw_value: String(CONTENT_FACTS[k]), normalized_value: CONTENT_FACTS[k], location: { page: 1, line: 1 }, record_index: 0 };
    return ruleAdapters.runAdapter(adapter.adapter_id, { country: app.country, region, presentation: 'GENERAL-BUREAU-REPORT', facts: CONTENT_FACTS, fact_sources: sources });
  }
  const rawAnchor = adapter.anchor_fields || adapter.anchor_field;
  const fields = (Array.isArray(rawAnchor) ? rawAnchor : [rawAnchor]).filter(Boolean);
  const facts = {};
  const sources = {};
  for (const f of fields) {
    const iso = FIELD_FIXTURES[f];
    if (!iso) return null;
    facts[f] = iso;
    sources[f] = { raw_value: iso, normalized_value: iso, location: { page: 1, line: 3 }, normalization: { from: iso, to: iso }, uncertainty: { status: 'RESOLVED', reason: null, precision: 'DAY' } };
  }
  return ruleAdapters.runAdapter(adapter.adapter_id, { country: app.country, region, presentation: 'GENERAL-BUREAU-REPORT', referenceDate: REFERENCE, facts, fact_sources: sources });
}

function issueList(machine) {
  return issues.issuesFor({
    evaluation: { results: [{ record_index: 0, machine }], common_errors: { performed: [] } },
    extraction: { records: [{ record_index: 0, kind_label: 'record', facts: {} }] }
  });
}

async function payReportOnce(service, actor, caseId) {
  const checkout = await service.request('POST', '/api/billing/checkout', { token: actor.token, body: { plan_code: 'monthly' } });
  const c = checkout.json.checkout;
  await service.postEvent({ id: `test_evt_${crypto.randomBytes(8).toString('hex')}`, type: 'checkout.session.completed', account_reference: actor.account_id, plan_code: c.plan.plan_code, session_reference: c.provider_reference, amount_cents: c.plan.amount_cents, currency: c.plan.currency, occurred_at: new Date().toISOString() });
}

const uploadBody = (bytes, filename) => ({ originalFilename: filename, declaredBytes: bytes.length, mimeType: 'application/pdf', contentBase64: bytes.toString('base64') });

async function fullPacket(service, check, email, country, region, preparedPdf, filename) {
  const actor = await service.unpaidAccount(email);
  const caseRow = (await service.request('POST', '/api/cases', { token: actor.token, body: { country, region } })).json.case;
  await payReportOnce(service, actor, caseRow.case_id);
  const up = await service.request('POST', `/api/cases/${caseRow.case_id}/files`, { token: actor.token, body: uploadBody(preparedPdf, filename) });
  check.equal(up.status, 201, `${filename} uploads`);
  await service.request('POST', `/api/cases/${caseRow.case_id}/evaluate`, { token: actor.token });
  const pv = (await service.request('GET', `/api/cases/${caseRow.case_id}/packet`, { token: actor.token })).json.view;
  const issue = (pv.eligible_issues || []).find((i) => i.eligible);
  check.ok(issue, 'a finding on this case is an eligible packet issue');
  await service.request('POST', `/api/cases/${caseRow.case_id}/packet/select`, { token: actor.token, body: { issue_ids: [issue.issue_id] } });
  await service.request('POST', `/api/cases/${caseRow.case_id}/packet/correspondence`, { token: actor.token, body: { correspondence: { consumer_name: 'Dana Whitfield', contact: 'dana.whitfield@example.test' } } });
  await service.request('POST', `/api/cases/${caseRow.case_id}/packet/approve`, { token: actor.token });
  const dl = await service.request('GET', `/api/cases/${caseRow.case_id}/packet-download`, { token: actor.token });
  check.equal(dl.status, 200, 'the entitled packet downloads');
  return { report_identity: pv.report_identity, issue, text: dl.text };
}

async function run(service, check) {
  const evidence = {};
  const findingAdapters = ruleAdapters.ADAPTERS.filter((a) => a.output_permission && a.output_permission.finding_allowed === true);
  const packetEnabled = new Set(ruleAdapters.PACKET_ELIGIBLE_RULE_IDS);

  /* Retired report-content adapters cannot create consumer issues, even if legacy machinery computes one. */
  const dismissAdapter = ruleAdapters.ADAPTERS.find((a) => a.adapter_id === 'CA-NS-CRA-S10-3-F-DISMISSED-CHARGE');
  const dismissMachine = driveFinding(dismissAdapter);
  check.equal(dismissMachine.finding && dismissMachine.finding.classification, 'VIOLATION',
    'the historical content adapter remains recorded');
  check.equal(activeAdapter(dismissAdapter.adapter_id), false, 'it is retired from active runtime scope');
  check.equal(issueList(dismissMachine).length, 0, 'the retired content finding cannot create a consumer issue');

  const auAdapters = ruleAdapters.ADAPTERS.filter((a) => a.adapter_id.indexOf('AU-PRIVACY-ACT-1988-S20W') === 0);
  check.equal(auAdapters.length, 3, 'three Australian retention adapters remain in historical configuration');
  check.equal(auAdapters.filter((a) => activeAdapter(a.adapter_id)).length, 2,
    'only tradeline and collection reporting periods remain checklist-related');
  for (const a of auAdapters) {
    const m = driveFinding(a);
    const list = issueList(m);
    check.equal(list.length, activeAdapter(a.adapter_id) ? 1 : 0,
      `${a.adapter_id}: consumer issue presence follows the active checklist scope`);
    if (list.length) {
      check.equal(list[0].eligible, true, 'the active finding remains packet eligible');
      check.ok(list[0].period_years != null, 'with a recorded retention period');
    }
  }

  const emitted = [];
  for (const a of findingAdapters.filter((candidate) => activeAdapter(candidate.adapter_id))) {
    const m = driveFinding(a);
    if (!m || !m.finding || !['VIOLATION', 'PROBABLE_VIOLATION'].includes(m.finding.classification)) continue;
    const list = issueList(m);
    emitted.push({ adapter_id: a.adapter_id, issues: list.length, eligible: list.some((i) => i.eligible) });
    check.ok(list.length >= 1, `${a.adapter_id}: an active checklist-related finding reaches the issue path`);
    check.ok(list.every((i) => i.uncertainty && i.request_wording), 'active issues retain specific wording');
  }
  check.ok(emitted.length >= 3, 'multiple active reporting-period adapters were exercised');
  check.ok(emitted.every((e) => e.eligible), 'every exercised active finding is packet eligible');

  /* A report-data chronology violation runs through upload, selection and download. */
  const commonPdf = buildPdf({ pages: [{ lines: [
    'Experian Consumer Credit Report - FICTIONAL TEST FIXTURE', 'Report Date: June 12, 2026',
    'Creditor A  Balance $100  Opened 01/01/2020  Closed 01/01/2019'
  ] }] });
  const commonRun = await fullPacket(service, check, 'by-common@example.test', 'US', 'US-CA', commonPdf, 'fictional-chronology.pdf');
  check.equal(commonRun.issue.basis_type, issues.BASIS_TYPE.FACTUAL_CONSISTENCY);
  check.ok(/opened date later than its closed date/.test(comparableText(commonRun.text)));
  check.ok(!/dismissed.disposition.presence/.test(commonRun.text), 'retired content evidence is absent');

  /* A checklist-related AU retention finding also reaches a complete packet. */
  const NAME = auFamily.PUBLISHER_NAME;
  const ABN = auFamily.PUBLISHER_ABN;
  const auPdf = buildPdf({ pages: [
    { lines: ['CASE SUBJECT', 'Report Date: 1 January 2026', 'Reference: 0000'] },
    { lines: [NAME + '   Page 2 of 3   ' + ABN, '', 'Personal Information', '', 'Credit Overview', '', 'Summary'] },
    { lines: [NAME + '   Page 3 of 3   ' + ABN, '', 'Consumer Credit Information', 'Publically Available Consumer Information', 'Consumer Credit Liability Information', 'Credit Provider  SOME BANK', 'Type Of Account  Credit Card', 'Opened Date  1 January 2018', 'Closed Date  1 January 2019'] }
  ] });
  const auRun = await fullPacket(service, check, 'by-au@example.test', 'AU', 'AU-NSW', auPdf, 'fictional-au-liability.pdf');
  check.equal(auRun.issue.basis_type, issues.BASIS_TYPE.STATUTORY_RETENTION, 'the AU liability finding is the eligible retention issue');
  check.equal(auRun.issue.confidence, 'DEFINITE', 'as a definite correction request');
  check.ok(/retention period has been exceeded|More than 2 years/.test(auRun.text), 'the packet states the recorded retention basis');
  check.ok(auRun.report_identity && (auRun.report_identity.bureau || auRun.report_identity.reference_date), 'the AU packet carries ITS own case report identity');
  check.ok(/Report: /.test(auRun.text), 'and the AU packet states the report it came from');
  check.ok(auRun.issue.issue_id !== commonRun.issue.issue_id, 'the two packets are bound to their own case, not shared');

  evidence.reconciled_content_finding = 'retired dismissed-charge content finding is absent from consumer issues';
  evidence.reconciled_retention_findings = auAdapters.map((a) => a.adapter_id);
  evidence.emitted_findings_reconciled = emitted;
  evidence.packet_enabled_rules = [...packetEnabled];
  evidence.fixtures = 'all reports are buildPdf fictional fixtures with fictional data; no real consumer identifier or private report';

  return evidence;
}

module.exports = { run, id: 'by-packet-reconciliation', title: 'OWNER-POTENTIAL-ISSUE-001: reconcile every emitted finding with the unified Issue and packet path' };
