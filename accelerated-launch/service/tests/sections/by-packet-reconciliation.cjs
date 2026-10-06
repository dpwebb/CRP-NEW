'use strict';
/**
 * by-packet-reconciliation.cjs — OWNER-POTENTIAL-ISSUE-001 packet-delivery reconciliation.
 *
 * Reconciles every currently emitted definite/probable finding with the unified Issue + packet path, and the two
 * omissions the descriptor used to make:
 *   (1) a report-CONTENT finding carries no retention anchor, so the descriptor (which assumed retention
 *       arithmetic) dropped it. It now gets its own content evidence + template representation, never a retention
 *       period.
 *   (2) an admitted DEFINITE retention finding was dropped by the old three-rule packet allowlist. The compatible
 *       admitted findings (CA-NS dismissed charge + the three AU findings) now record the packet permission, with
 *       their issue-specific source facts, uncertainty and request wording recorded and tested.
 *
 * Fictional fixtures only; entitlement is the test-adapter (non-payment) event. No new legal finding is enabled
 * and no adapter is blanket-enabled.
 */
const crypto = require('node:crypto');
const ruleAdapters = require('../../../adapters/rule-adapters.cjs');
const issues = require('../../issues.cjs');
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
  const checkout = await service.request('POST', '/api/billing/checkout', { token: actor.token, body: { plan_code: 'report_once', case_id: caseId } });
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

  /* ---- 1. The descriptor reconciles a report-CONTENT finding (no retention anchor). ---- */
  const dismissAdapter = ruleAdapters.ADAPTERS.find((a) => a.adapter_id === 'CA-NS-CRA-S10-3-F-DISMISSED-CHARGE');
  const dismissMachine = driveFinding(dismissAdapter);
  check.equal(dismissMachine.finding && dismissMachine.finding.classification, 'VIOLATION', 'the content rule emits a VIOLATION');
  const dismissIssues = issueList(dismissMachine);
  check.equal(dismissIssues.length, 1, 'and it reaches the issue path (it was previously dropped for lacking a retention anchor)');
  const ci = dismissIssues[0];
  check.equal(ci.basis_type, issues.BASIS_TYPE.CONTENT_FINDING, 'as a CONTENT_FINDING, not a retention comparison');
  check.equal(ci.eligible, true, 'and it is eligible for a correction request');
  check.ok(!/years have passed/.test(ci.explanation || ''), 'its explanation states the prohibited content, never invented retention arithmetic');
  check.ok(ci.uncertainty && ci.request_wording, 'with a recorded uncertainty and request wording');
  check.ok(Array.isArray(ci.source_facts) && ci.source_facts.length === 4, 'and its four decisive content facts as evidence');

  /* ---- 2. The descriptor reconciles the admitted DEFINITE retention findings (CA-NS not; AU x3). ---- */
  const auAdapters = ruleAdapters.ADAPTERS.filter((a) => a.adapter_id.indexOf('AU-PRIVACY-ACT-1988-S20W') === 0);
  check.equal(auAdapters.length, 3, 'the three AU findings are in the catalog');
  for (const a of auAdapters) {
    const m = driveFinding(a);
    check.equal(m.finding && m.finding.classification, 'VIOLATION', `${a.adapter_id} emits a VIOLATION`);
    const list = issueList(m);
    check.equal(list.length, 1, `${a.adapter_id} reaches the issue path (it was previously dropped by the packet allowlist)`);
    check.equal(list[0].eligible, true, `${a.adapter_id} is now packet eligible`);
    check.equal(list[0].request_type, issues.REQUEST_TYPE.CORRECTION, 'as a correction request');
    check.ok(list[0].period_years != null, 'with its recorded retention period');
  }

  /* ---- 3. No silent omission: every emitted definite/probable finding reaches the issue path. ---- */
  const emitted = [];
  for (const a of findingAdapters) {
    const m = driveFinding(a);
    if (!m || !m.finding) continue;
    const cls = m.finding.classification;
    if (cls !== 'VIOLATION' && cls !== 'PROBABLE_VIOLATION') continue;
    const list = issueList(m);
    emitted.push({ adapter_id: a.adapter_id, classification: cls, issues: list.length, eligible: list.some((i) => i.eligible) });
    check.ok(list.length >= 1, `${a.adapter_id} emits a ${cls} finding and reaches the issue path`);
    check.ok(list.every((i) => i.uncertainty && i.request_wording), `${a.adapter_id} carries its recorded uncertainty and request wording`);
  }
  check.ok(emitted.length >= 13, `every admitted finding adapter was driven to a finding (${emitted.length})`);
  check.ok(emitted.every((e) => e.eligible), 'and every emitted finding is eligible for a consumer packet (no omission)');

  /* ---- 4. End-to-end: the reconciled content finding through the real packet path. ---- */
  const contentPdf = buildPdf({ pages: [{ lines: ['Equifax  Consumer Credit Report', 'Report Date: June 12, 2026', 'Public Record: CRIM-014', 'Criminal Charge: Theft', 'Disposition: Dismissed'] }] });
  const contentRun = await fullPacket(service, check, 'by-content@example.test', 'CA', 'CA-NS', contentPdf, 'fictional-dismissed-charge.pdf');
  check.equal(contentRun.issue.basis_type, issues.BASIS_TYPE.CONTENT_FINDING, 'the content finding is the eligible issue');
  check.ok(/prohibits/.test(contentRun.text), 'the packet states the prohibition');
  check.ok(!/retention period has been exceeded/.test(contentRun.text), 'and never a retention period');
  check.ok(contentRun.text.includes(contentRun.issue.citation), 'the packet names the recorded rule');
  check.ok(/dismissed_disposition_presence/.test(contentRun.text), 'and states the decisive content facts');
  /* ---- 5. End-to-end: a reconciled AU retention finding through the real packet path. ---- */
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
  check.ok(auRun.issue.issue_id !== contentRun.issue.issue_id, 'the two packets are bound to their own case, not shared');

  evidence.reconciled_content_finding = 'CA-NS-CRA-S10-3-F-DISMISSED-CHARGE: CONTENT_FINDING, content evidence + template, eligible';
  evidence.reconciled_retention_findings = auAdapters.map((a) => a.adapter_id);
  evidence.emitted_findings_reconciled = emitted;
  evidence.packet_enabled_rules = [...packetEnabled];
  evidence.fixtures = 'all reports are buildPdf fictional fixtures with fictional data; no real consumer identifier or private report';

  return evidence;
}

module.exports = { run, id: 'by-packet-reconciliation', title: 'OWNER-POTENTIAL-ISSUE-001: reconcile every emitted finding with the unified Issue and packet path' };
