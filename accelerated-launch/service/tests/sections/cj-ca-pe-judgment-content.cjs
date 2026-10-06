'use strict';
/**
 * cj-ca-pe-judgment-content.cjs — BATCH-14: Prince Edward Island's judgment-content limb, end to end.
 *
 * Consumer Reporting Act (P.E.I.), s. 9(3)(d), retrieved verbatim from the official consolidation current to
 * 30 March 2026 (amended 2025, c.11), recorded on the owner-accepted row CRP-LSRC-0389: a consumer reporting
 * agency shall not include in a consumer report information as to any judgment against the consumer unless
 * mention is made of the name and WHERE AVAILABLE the address of the judgment creditor as given at the date of
 * entry of the judgment, and the amount.
 *
 * Only an established AMOUNT omission on a COMPLETE entry is decisive — the same conservatism already
 * delivered for Manitoba. An uncaptioned creditor name, an absent address (which the provision requires only
 * where available) and any unreadable field are read, recorded and NEVER claimed. EVIDENCE KIND: the general
 * intake's own parser on a synthetic structural model, taken through the REAL packet path — structural-model
 * service integration, not PDF-upload delivery.
 */
const crypto = require('node:crypto');
const generalIntake = require('../../general-intake.cjs');
const evaluation = require('../../evaluation.cjs');
const { SUPPORT } = require('../../formats.cjs');
const ruleAdapters = require('../../../adapters/rule-adapters.cjs');

const PE = 'CA-PE-CRA-S9-3-D-JUDGMENT-CONTENT-OMISSION';
const REFERENCE_DATE = '2026-06-12';
const DETAILS = { consumer_name: 'Island Fictional Consumer', contact: 'pe.consumer@example.test' };
function text(value, trusted) { return { text: value, trusted: trusted !== false, page: 1, line: 1 }; }
function judgment({ identity, creditor, address, amount, amountState, untrusted }) {
  const lines = [text(identity || 'Public Record: JDG-001'), text('Judgment')];
  if (creditor !== undefined) lines.push(text(creditor));
  if (address !== undefined) lines.push(text(address));
  if (amount !== undefined) lines.push(text(amount));
  else if (amountState === 'blank') lines.push(text('Amount:'));
  if (untrusted) lines.push(text('Amount: 4000', false));
  return lines;
}
function extractionFor(blockLines) {
  return {
    presentation_id: 'GENERAL-BUREAU-REPORT', family_id: null,
    records: generalIntake.buildRecords([{ lines: blockLines }], null).filter((r) => r.kind === 'GENERAL_PUBLIC_RECORD'),
    reference_date: { normalized_value: REFERENCE_DATE },
    support: SUPPORT.DEMONSTRATION_ONLY_NOT_REPORT_SUPPORT
  };
}
function evaluateFor(extraction, region) {
  return evaluation.evaluateCase({ country: 'CA', region: region || 'CA-PE', presentation: 'GENERAL-BUREAU-REPORT', extraction });
}
function peResults(out) { return (out.results || []).filter((r) => r.check && r.check.adapter_id === PE); }
function peFindings(out) { return peResults(out).map((r) => r.machine && r.machine.finding).filter(Boolean); }
function stateOf(extraction) {
  const r = extraction.records[0];
  return r ? { status: r.status, name: r.facts['judgment.creditorNameState'], address: r.facts['judgment.creditorAddressState'], amount: r.facts['judgment.amountState'], complete: r.facts['judgment.entryComplete'] } : null;
}
function inject(service, actor, caseId, out, extraction) {
  service.service.store.update((state) => {
    state.results.push({
      result_id: `res_pe_${crypto.randomBytes(10).toString('hex')}`,
      case_id: caseId, account_id: actor.account_id, file_id: null, file_ids: [],
      evaluation: { results: out.results, common_errors: out.common_errors },
      extraction: { records: extraction.records, presentation_id: 'GENERAL-BUREAU-REPORT', reference_date: { normalized_value: REFERENCE_DATE }, support: SUPPORT.DEMONSTRATION_ONLY_NOT_REPORT_SUPPORT },
      clarification_eligibility: [], reviewed_at: null, created_at: new Date().toISOString()
    });
  });
}
async function payReportOnce(service, actor, caseId) {
  const checkout = await service.request('POST', '/api/billing/checkout', { token: actor.token, body: { plan_code: 'report_once', case_id: caseId } });
  const c = checkout.json.checkout;
  await service.postEvent({
    id: `test_evt_${crypto.randomBytes(8).toString('hex')}`,
    type: 'checkout.session.completed', account_reference: actor.account_id, plan_code: c.plan.plan_code,
    session_reference: c.provider_reference, amount_cents: c.plan.amount_cents, currency: c.plan.currency,
    occurred_at: new Date().toISOString()
  });
}
function peIssue(view) {
  return (view.eligible_issues || []).find((i) => /9\(3\)\(d\)/.test(String(i.citation || '')) || /judgment amount/.test(String(i.explanation || ''))) || null;
}
const COMPLETE = judgment({ creditor: 'Creditor: ISLAND CREDIT UNION', address: 'Creditor Address: 12 Water St', amount: 'Amount: 4000' });
const AMOUNT_OMITTED = judgment({ identity: 'Public Record: JDG-002', creditor: 'Creditor: ISLAND CREDIT UNION', address: 'Creditor Address: 12 Water St' });
const ZERO_AMOUNT = judgment({ identity: 'Public Record: JDG-003', creditor: 'Creditor: ISLAND CREDIT UNION', address: 'Creditor Address: 12 Water St', amount: 'Amount: 0' });
const NO_NAME = judgment({ identity: 'Public Record: JDG-004', address: 'Creditor Address: 12 Water St', amount: 'Amount: 4000' });
const NO_ADDRESS = judgment({ identity: 'Public Record: JDG-005', creditor: 'Creditor: ISLAND CREDIT UNION', amount: 'Amount: 4000' });
const BLANK_AMOUNT = judgment({ identity: 'Public Record: JDG-006', creditor: 'Creditor: ISLAND CREDIT UNION', address: 'Creditor Address: 12 Water St', amountState: 'blank' });
const UNTRUSTED = judgment({ identity: 'Public Record: JDG-007', creditor: 'Creditor: ISLAND CREDIT UNION', address: 'Creditor Address: 12 Water St', untrusted: true });

async function run(service, check) {
  const evidence = {};

  /* 1. The supported omission. */
  const omitted = evaluateFor(extractionFor(AMOUNT_OMITTED));
  const findings = peFindings(omitted);
  check.equal(peResults(omitted).length, 1, 'the Prince Edward Island limb runs on a judgment public record');
  check.equal(stateOf(extractionFor(AMOUNT_OMITTED)).amount, 'VERIFIED_ABSENT', 'a complete entry printing no amount caption and no dollar figure establishes the amount as absent');
  check.equal(findings.length, 1, 'an established omitted judgment amount is a supported finding');
  check.equal(findings[0].classification, 'VIOLATION', 'as a definite content violation');
  check.match(String(findings[0].citation), /9\(3\)\(d\)/, 'citing the retrieved Prince Edward Island provision');
  check.deepEqual(findings[0].content_omission.omitted, ['the judgment amount'], 'naming exactly the omitted content');
  check.equal(findings[0].content_omission.assignment_disposition, 'NOT_REQUIRED_BY_THIS_PROVISION', 'with no invented assignment alternative');
  check.equal(findings[0].evaluation.required_facts.length, 3, 'on three decisive predicates');
  check.ok(findings[0].evaluation.required_facts.every((f) => f.source && f.source.location), 'each with its own source-linked provenance');

  /* 2. Controls: nothing unsupported. */
  check.equal(peFindings(evaluateFor(extractionFor(COMPLETE))).length, 0, 'a complete judgment raises no omission');
  check.equal(peFindings(evaluateFor(extractionFor(ZERO_AMOUNT))).length, 0, 'a printed zero amount is a stated amount, not an omission');
  check.equal(stateOf(extractionFor(NO_NAME)).name, 'UNRESOLVED', 'an uncaptioned creditor name is unresolved, never a verified absence');
  check.equal(peFindings(evaluateFor(extractionFor(NO_NAME))).length, 0, 'so a missing creditor name is not claimed');
  const noAddress = extractionFor(NO_ADDRESS);
  check.equal(stateOf(noAddress).address, 'VERIFIED_ABSENT', 'an absent creditor address is recorded');
  check.equal(peFindings(evaluateFor(noAddress)).length, 0, 'but never claimed: the provision requires the address only where available');
  check.equal(stateOf(extractionFor(BLANK_AMOUNT)).amount, 'UNRESOLVED', 'a blank amount caption is unresolved, not absent');
  check.equal(peFindings(evaluateFor(extractionFor(BLANK_AMOUNT))).length, 0, 'so an unreadable field is never an omission');
  check.equal(peFindings(evaluateFor(extractionFor(UNTRUSTED))).length, 0, 'and an incomplete entry is never an omission');
  check.equal(peFindings(evaluateFor(extractionFor(AMOUNT_OMITTED), 'CA-MB')).length, 0, 'the same entry outside Prince Edward Island raises no issue there');
  check.equal(peResults(evaluateFor(extractionFor(AMOUNT_OMITTED), 'CA-NS')).length, 0, 'and no Prince Edward Island result is produced for another province');

  /* 3. The consumer journey: issue -> selection -> correspondence -> approval -> entitled download. */
  const owner = await service.unpaidAccount('cj-pe@example.test');
  const stranger = await service.unpaidAccount('cj-pe-stranger@example.test');
  const unpaid = await service.unpaidAccount('cj-pe-unpaid@example.test');
  const unpaidCase = (await service.request('POST', '/api/cases', { token: unpaid.token, body: { country: 'CA', region: 'CA-PE' } })).json.case;
  const refused = await service.request('POST', `/api/cases/${unpaidCase.case_id}/packet/correspondence`, { token: unpaid.token, body: { correspondence: DETAILS } });
  check.equal(refused.status, 402, 'an unpaid account cannot reach the packet path');
  check.equal(refused.json.error.code, 'ENTITLEMENT_REQUIRED', 'with the entitlement refusal');

  const c = (await service.request('POST', '/api/cases', { token: owner.token, body: { country: 'CA', region: 'CA-PE' } })).json.case;
  await payReportOnce(service, owner, c.case_id);
  const positive = extractionFor(AMOUNT_OMITTED);
  inject(service, owner, c.case_id, evaluateFor(positive), positive);
  const pv = (await service.request('GET', `/api/cases/${c.case_id}/packet`, { token: owner.token })).json.view;
  const issue = peIssue(pv);
  check.ok(issue, 'the Prince Edward Island judgment-content issue is offered for selection');
  check.equal(issue.eligible, true, 'and it is selectable');
  check.equal(issue.request_type, 'CORRECTION', 'as a correction request for a definite content omission');
  check.equal(issue.confidence, 'DEFINITE', 'at the definite confidence the violation classification carries');
  check.match(String(issue.explanation), /without the judgment amount/, 'naming the omitted content in plain language');
  check.match(String(issue.uncertainty), /where available/, 'and stating the provision own address qualification');
  check.equal(JSON.stringify(issue.supported_bases || []).includes(PE), false, 'with no internal adapter id exposed');

  check.equal((await service.request('POST', `/api/cases/${c.case_id}/packet/select`, { token: stranger.token, body: { issue_ids: [issue.issue_id] } })).status, 403, 'another account cannot select on this packet');
  check.equal((await service.request('GET', `/api/cases/${c.case_id}/packet-download`, { token: stranger.token })).status, 403, 'nor download it');
  await service.request('POST', `/api/cases/${c.case_id}/packet/select`, { token: owner.token, body: { issue_ids: [issue.issue_id] } });
  check.equal((await service.request('GET', `/api/cases/${c.case_id}/packet`, { token: owner.token })).json.view.packet.selected_count, 1, 'the consumer selects it');
  await service.request('POST', `/api/cases/${c.case_id}/packet/correspondence`, { token: owner.token, body: { correspondence: DETAILS } });
  check.match(JSON.stringify((await service.request('GET', `/api/cases/${c.case_id}/packet`, { token: owner.token })).json.view), /Island Fictional Consumer/, 'the reviewed correspondence carries the consumer-supplied details');
  check.equal((await service.request('POST', `/api/cases/${c.case_id}/packet/approve`, { token: owner.token })).status, 200, 'the packet approves');
  const dl = await service.request('GET', `/api/cases/${c.case_id}/packet-download`, { token: owner.token });
  check.equal(dl.status, 200, 'and the entitled download succeeds');
  check.match(dl.text, /9\(3\)\(d\)/, 'naming the recorded rule behind the issue');
  check.match(dl.text, /judgment amount/, 'carrying the omitted content the correction asks for');
  check.match(dl.text, /Request \(correction\): /, 'with a correction request');

  const changed = extractionFor(COMPLETE);
  inject(service, owner, c.case_id, evaluateFor(changed), changed);
  const stale = await service.request('GET', `/api/cases/${c.case_id}/packet-download`, { token: owner.token });
  check.notEqual(stale.status, 200, 'a packet whose evidence changed after approval is not silently downloaded');
  check.match(JSON.stringify(stale.json || {}), /STALE/, 'and the refusal names the stale approval');

  /* 4. BATCH-17: PEI's dismissed-charge limb, s.9(3)(j) — PEI's OWN categories, through the real reader. */
  const PEJ = 'CA-PE-CRA-S9-3-J-DISMISSED-CHARGE';
  const chargeLines = (d) => [text('Public Record: CRG-201'), text('Criminal Charge'), text('Charge: THEFT UNDER $5000'), text('Disposition: ' + d)];
  const pej = (disposition) => {
    const rec = generalIntake.buildRecords([{ lines: chargeLines(disposition) }], null).find((r) => r.kind === 'GENERAL_PUBLIC_RECORD');
    const facts = rec ? rec.facts : {};
    const sources = {};
    for (const k of Object.keys(facts)) sources[k] = { normalized_value: facts[k], location: { page: 1, line: 1 }, record_index: 0 };
    const out = ruleAdapters.runAdapter(PEJ, { country: 'CA', region: 'CA-PE', presentation: 'GENERAL-BUREAU-REPORT', facts, fact_sources: sources });
    return { found: out.finding ? 1 : 0, category: facts['criminalCharge.dismissedDispositionCategory'], finding: out.finding };
  };
  check.equal(pej('Dismissed').found, 1, "PEI's own category 'dismissed' is claimed");
  check.equal(pej('Set Aside').found, 1, "and 'set aside' is claimed");
  check.equal(pej('Not Proceeded With').found, 1, "and 'not proceeded with' is claimed — PEI's third category");
  check.equal(pej('Not Proceeded With').category, 'NOT_PROCEEDED', 'recorded under its own category');
  check.equal(pej('Withdrawn').category, 'WITHDRAWN', 'a withdrawn charge is classified, not ignored');
  check.equal(pej('Withdrawn').found, 0, "but it is NOT claimed, because PEI's words do not name it");
  check.equal(pej('Stay of Proceedings').found, 0, "nor is a stay of proceedings claimed");
  check.equal(pej('Convicted').found, 0, 'and a conviction is not');
  check.match(String(pej('Set Aside').finding.citation), /9\(3\)\(j\)/, "with the finding citing PEI's own provision");
  check.match(JSON.stringify(pej('Set Aside').finding.content_inclusion.included), /dismissed, set aside, not proceeded/i, "and naming PEI's own categories rather than another province's");
  const ambiguous = generalIntake.buildRecords([{ lines: [text('Public Record: CRG-301'), text('Criminal Charge'), text('Charge: THEFT'), text('Charge: FRAUD'), text('Disposition: Dismissed')] }], null).find((r) => r.kind === 'GENERAL_PUBLIC_RECORD');
  check.equal(ambiguous.facts['criminalCharge.dismissedDispositionCategory'], null, 'an ambiguous charge/disposition association yields no category');
  check.equal(ambiguous.facts['criminalCharge.dismissedDispositionState'], 'UNRESOLVED', 'and no bound disposition, so no finding can follow');

  evidence.binding = {
    provision: 'Consumer Reporting Act (P.E.I.), s. 9(3)(d)', ledger_row: 'CRP-LSRC-0389',
    official_consolidation: 'current to 30 March 2026 (amended 2025, c.11)',
    artifact_sha256: 'A31229854E20E8A217D3D010B1C3EC9E3678E689BEFA52F8E8FA92D3D2B2558F',
    decisive: ['amount'], recorded_never_claimed: ['creditor_name', 'creditor_address'],
    sibling_limb_not_yet_delivered: 's. 9(3)(j) dismissed / set aside / not proceeded charges'
  };
  evidence.evidence_kind = 'general-intake parser on a synthetic structural model, taken through the real packet path: structural-model service integration, not PDF-upload delivery';
  evidence.journey = { case_id: c.case_id, request_type: 'CORRECTION', confidence: 'DEFINITE', approved: true, downloaded_chars: (dl.text || '').length };
  return evidence;
}

module.exports = {
  run,
  id: 'cj-ca-pe-judgment-content',
  title: 'BATCH-14: Prince Edward Island s.9(3)(d) judgment-content omission — supported omission through the complete packet path'
};
