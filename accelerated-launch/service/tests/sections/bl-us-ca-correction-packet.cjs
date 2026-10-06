'use strict';
/**
 * bl-us-ca-correction-packet.cjs — OWNER-CA-CORRECTION-PACKET-001: the bounded California correction packet.
 *
 * Positive: a demonstrated California VIOLATION finding is selectable, editable (wording kept separate from
 * report facts), approvable, and downloads as a coherent packet bound to the approved version.
 *
 * Refusals: cross-account access, invalid finding selection, approve without selection, altered selection
 * invalidating approval, re-evaluation invalidating approval (stale), download without entitlement, and the
 * absence of any legal-advice disclaimer in the packet.
 */
const crypto = require('node:crypto');
const ruleAdapters = require('../../../adapters/rule-adapters.cjs');
const issues = require('../../issues.cjs');
const { buildPdf } = require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');

const TAX_LIEN = 'US-CA-CCRAA-1785-13-A-4-TAX-LIEN-PAID-7Y';
const BANKRUPTCY = 'US-CA-CCRAA-1785-13-A-1-BANKRUPTCY-10Y';
const COLLECTION = 'US-CA-CCRAA-1785-13-A-5-COLLECTION-7Y';

function engineRun(adapterId, facts, referenceDate) {
  const sources = {};
  for (const field of Object.keys(facts || {})) {
    const raw = facts[field];
    sources[field] = {
      raw_value: raw, normalized_value: raw,
      location: { page: 1, line: 1, section: 'synthetic declared fact', synthetic: true },
      normalization: { from: raw, to: raw },
      uncertainty: { status: 'RESOLVED', reason: null, precision: 'DAY' }
    };
  }
  return ruleAdapters.runAdapter(adapterId, {
    country: 'US', region: 'US-CA', presentation: 'GENERAL-BUREAU-REPORT',
    facts, fact_sources: sources, referenceDate: referenceDate || '2026-10-01'
  });
}

async function payReportOnce(service, actor, caseId) {
  const checkout = await service.request('POST', '/api/billing/checkout', {
    token: actor.token, body: caseId ? { plan_code: 'report_once', case_id: caseId } : { plan_code: 'report_once' }
  });
  if (checkout.status !== 201) throw new Error(`checkout failed ${checkout.status} ${checkout.text}`);
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
  const posted = await service.postEvent(event);
  if (posted.status !== 200 || posted.json.event.accepted !== true) {
    throw new Error(`entitlement failed ${posted.status} ${posted.text}`);
  }
  return c;
}

const uploadBody = (bytes, filename) => ({
  originalFilename: filename,
  declaredBytes: bytes.length,
  mimeType: 'application/pdf',
  contentBase64: bytes.toString('base64')
});

async function makeCase(service, actor) {
  return (await service.request('POST', '/api/cases', { token: actor.token, body: { country: 'US', region: 'US-CA' } })).json.case;
}

async function uploadAndEvaluateTaxLien(service, actor, caseId) {
  const pdf = buildPdf({ pages: [{ lines: [
    'Experian  Consumer Credit Report', 'Report Date: June 12, 2026',
    'Tax Lien  Date Paid 01/01/2018'
  ] }] });
  const up = await service.request('POST', `/api/cases/${caseId}/files`, { token: actor.token, body: uploadBody(pdf, 'usca-taxlien.pdf') });
  const ev = await service.request('POST', `/api/cases/${caseId}/evaluate`, { token: actor.token });
  return { up, ev };
}


async function run(service, check) {
  const evidence = {};

  /* ---- 1. Per-finding authorization: the three California rules record packet_eligible; the fail-closed
     (a)(8) rule stays false. (OWNER-POTENTIAL-ISSUE-001 additionally enabled the CA-NS content finding and the
     three AU findings, and that reconciliation is exercised in by-packet-reconciliation.) ---- */
  check.equal(engineRun(TAX_LIEN, { 'publicRecord.taxLienPaidDate': '2018-01-01' }).packet_eligible, true, 'tax-lien rule records packet_eligible true');
  check.equal(engineRun(BANKRUPTCY, { 'publicRecord.bankruptcyOrderForReliefDate': '2010-01-01' }).packet_eligible, true, 'bankruptcy rule records packet_eligible true');
  check.equal(engineRun(COLLECTION, { 'collection.delinquencyDate': '2018-01-01' }).packet_eligible, true, 'collection rule records packet_eligible true');
  const adverse = ruleAdapters.ADAPTERS.find((a) => a.adapter_id === 'US-CA-CCRAA-1785-13-A-8-ADVERSE-7Y');
  check.equal(adverse.output_permission.packet_eligible, false, 'the fail-closed (a)(8) rule stays packet_eligible false');

  /* The active unified gate preserves definite permissions and supported verification requests. */
  check.equal(issues.isEligible({ basis_type: issues.BASIS_TYPE.STATUTORY_RETENTION, confidence: issues.CONFIDENCE.DEFINITE, packet_eligible: true }), true, 'authorized definite correction is eligible');
  check.equal(issues.isEligible({ basis_type: issues.BASIS_TYPE.STATUTORY_RETENTION, confidence: issues.CONFIDENCE.PROBABLE }), true, 'supported probable issue permits verification without definite proof');
  check.equal(issues.isEligible({ basis_type: issues.BASIS_TYPE.FACTUAL_CONSISTENCY, confidence: issues.CONFIDENCE.POTENTIAL }), true, 'supported potential factual issue permits verification');
  check.equal(issues.isEligible({ basis_type: issues.BASIS_TYPE.STATUTORY_RETENTION, confidence: issues.CONFIDENCE.DEFINITE, packet_eligible: false }), false, 'definite correction still requires rule-specific permission');
  check.equal(issues.isEligible({ basis_type: issues.BASIS_TYPE.FACTUAL_CONSISTENCY, confidence: 'UNRESOLVED' }), false, 'an unresolved diagnostic is not an eligible Issue');

  /* ---- 3. Positive end-to-end: select -> review -> edit -> approve -> download. ---- */
  const owner = await service.unpaidAccount('packet-ca@example.test');
  const ownerCase = await makeCase(service, owner);
  const caseId = ownerCase.case_id;
  await payReportOnce(service, owner, caseId);
  const ownerUpload = await uploadAndEvaluateTaxLien(service, owner, caseId);
  check.equal(ownerUpload.up.status, 201, 'the paid upload succeeds');
  check.equal(ownerUpload.ev.status, 201, 'and the evaluation succeeds');

  const view = (await service.request('GET', `/api/cases/${caseId}/packet`, { token: owner.token })).json.view;
  check.ok(view.eligible_issues.length >= 1, 'eligible findings are listed');
  const finding = view.eligible_issues.find((i) => i.citation && /1785\.13\(a\)\(4\)/.test(i.citation));
  check.ok(finding, 'and the paid-tax-lien violation is among them');
  check.equal(finding.normalized_value, '2018-01-01', 'with its normalized printed date');
  check.ok(finding.printed_value, 'and its raw printed value');
  check.ok(finding.issue_id, 'with an opaque finding id (no adapter id leaks)');
  check.ok(!JSON.stringify(finding).includes('US-CA-CCRAA'), 'and the consumer view never exposes the internal adapter id');

  const selected = await service.request('POST', `/api/cases/${caseId}/packet/select`, { token: owner.token, body: { issue_ids: [finding.issue_id] } });
  check.equal(selected.status, 200, 'selection is recorded');
  check.equal(selected.json.view.packet.selected_count, 1, 'with one finding selected');

  const worded = await service.request('POST', `/api/cases/${caseId}/packet/wording`, { token: owner.token, body: { wording: 'Please verify this entry and correct it if it is out of date.' } });
  check.equal(worded.json.view.packet.wording, 'Please verify this entry and correct it if it is out of date.', 'consumer wording is stored separately');
  check.equal(worded.json.view.packet.approved, false, 'editing leaves the packet unapproved');

  await service.request('POST', `/api/cases/${caseId}/packet/correspondence`, { token: owner.token, body: { correspondence: { consumer_name: 'Dana Whitfield', contact: 'dana.whitfield@example.test' } } });
  const approved = await service.request('POST', `/api/cases/${caseId}/packet/approve`, { token: owner.token });
  check.equal(approved.status, 200, 'approval succeeds');
  check.equal(approved.json.view.packet.approved, true, 'and the packet is approved');
  check.ok(approved.json.view.packet.approved_version, 'with a recorded approved-version hash');
  check.equal(approved.json.view.packet.download_available, true, 'and the download is available');
  const approvedVersion = approved.json.view.packet.approved_version;

  const download = await service.request('GET', `/api/cases/${caseId}/packet-download`, { token: owner.token });
  check.equal(download.status, 200, 'the approved packet downloads');
  check.ok(/1785\.13\(a\)\(4\)/.test(download.text), 'and states the rule citation');
  check.ok(download.text.includes('01/01/2018'), 'and the printed date it measured from');
  check.ok(download.text.includes('Request (correction)'), 'and a factual correction request');
  check.ok(download.text.includes('Please verify this entry and correct it if it is out of date.'), 'and the consumer wording, kept in its own section');
  check.ok(download.text.includes(approvedVersion), 'and is bound to the approved version');
  check.ok(!/not legal advi/i.test(download.text), 'with no legal-advice disclaimer');

  /* ---- 4. Cross-account access is refused. ---- */
  const other = await service.unpaidAccount('packet-ca-other@example.test');
  const cross = await service.request('GET', `/api/cases/${caseId}/packet`, { token: other.token });
  check.equal(cross.status, 403, 'another account cannot read this packet');

  /* ---- 5. An invalid finding selection is refused. ---- */
  const badSelect = await service.request('POST', `/api/cases/${caseId}/packet/select`, { token: owner.token, body: { issue_ids: ['deadbeef'] } });
  check.equal(badSelect.status, 400, 'an unknown finding id is refused');
  check.equal(badSelect.json.error.code, 'INVALID_FINDING_SELECTION', 'with the invalid-selection code');

  /* ---- 6. Approve without selection is refused. ---- */
  await service.request('POST', `/api/cases/${caseId}/packet/select`, { token: owner.token, body: { issue_ids: [] } });
  await service.request('POST', `/api/cases/${caseId}/packet/correspondence`, { token: owner.token, body: { correspondence: { consumer_name: 'Dana Whitfield', contact: 'dana.whitfield@example.test' } } });
  const approveNone = await service.request('POST', `/api/cases/${caseId}/packet/approve`, { token: owner.token });
  check.equal(approveNone.status, 409, 'approving with no selection is refused');
  check.equal(approveNone.json.error.code, 'PACKET_NO_SELECTION', 'with the no-selection code');

  /* ---- 7. Re-selecting invalidates a prior approval (download requires a fresh approval). ---- */
  await service.request('POST', `/api/cases/${caseId}/packet/select`, { token: owner.token, body: { issue_ids: [finding.issue_id] } });
  await service.request('POST', `/api/cases/${caseId}/packet/correspondence`, { token: owner.token, body: { correspondence: { consumer_name: 'Dana Whitfield', contact: 'dana.whitfield@example.test' } } });
  await service.request('POST', `/api/cases/${caseId}/packet/approve`, { token: owner.token });
  const reselected = await service.request('POST', `/api/cases/${caseId}/packet/select`, { token: owner.token, body: { issue_ids: [finding.issue_id] } });
  check.equal(reselected.json.view.packet.approved, false, 'a changed selection invalidates the approval');
  const staleDownload = await service.request('GET', `/api/cases/${caseId}/packet-download`, { token: owner.token });
  check.equal(staleDownload.status, 409, 'and downloading without a fresh approval is refused');
  check.equal(staleDownload.json.error.code, 'PACKET_NOT_APPROVED', 'with the not-approved code');

  /* ---- 8. A re-evaluation invalidates the approval (findings/evidence changed). ---- */
  await service.request('POST', `/api/cases/${caseId}/packet/select`, { token: owner.token, body: { issue_ids: [finding.issue_id] } });
  await service.request('POST', `/api/cases/${caseId}/packet/correspondence`, { token: owner.token, body: { correspondence: { consumer_name: 'Dana Whitfield', contact: 'dana.whitfield@example.test' } } });
  await service.request('POST', `/api/cases/${caseId}/packet/approve`, { token: owner.token });
  await service.request('POST', `/api/cases/${caseId}/evaluate`, { token: owner.token });
  const staleAfterEval = await service.request('GET', `/api/cases/${caseId}/packet-download`, { token: owner.token });
  check.equal(staleAfterEval.status, 409, 'a re-evaluation invalidates the approval');
  check.equal(staleAfterEval.json.error.code, 'PACKET_APPROVAL_STALE', 'with the stale-approval code');

  /* ---- 9. Download without entitlement (no purchase bound to this case) is refused. ---- */
  const noEnt = await service.unpaidAccount('packet-ca-noent@example.test');
  await payReportOnce(service, noEnt, null);
  const noEntCase = await makeCase(service, noEnt);
  const noEntCaseId = noEntCase.case_id;
  await uploadAndEvaluateTaxLien(service, noEnt, noEntCaseId);
  const noEntView = (await service.request('GET', `/api/cases/${noEntCaseId}/packet`, { token: noEnt.token })).json.view;
  await service.request('POST', `/api/cases/${noEntCaseId}/packet/select`, { token: noEnt.token, body: { issue_ids: [noEntView.eligible_issues[0].issue_id] } });
  await service.request('POST', `/api/cases/${noEntCaseId}/packet/correspondence`, { token: noEnt.token, body: { correspondence: { consumer_name: 'Dana Whitfield', contact: 'dana.whitfield@example.test' } } });
  await service.request('POST', `/api/cases/${noEntCaseId}/packet/approve`, { token: noEnt.token });
  const noEntDownload = await service.request('GET', `/api/cases/${noEntCaseId}/packet-download`, { token: noEnt.token });
  check.equal(noEntDownload.status, 402, 'downloading without an entitlement bound to this case is refused');
  check.equal(noEntDownload.json.error.code, 'DOWNLOAD_NOT_ENTITLED', 'with the download-not-entitled code');

  evidence.rules = 'three California rules packet-eligible (VIOLATION-only); positive packet path and refusals verified';
  return evidence;
}

module.exports = {
  run,
  id: 'bl-us-ca-correction-packet',
  title: 'OWNER-CA-CORRECTION-PACKET-001: bounded California correction packet (select/review/edit/approve/download)'
};

