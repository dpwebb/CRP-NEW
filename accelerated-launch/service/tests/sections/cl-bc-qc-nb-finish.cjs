'use strict';
/**
 * cl-bc-qc-nb-finish.cjs — BATCH-18: British Columbia, Quebec and New Brunswick outcomes.
 *
 * BC — Business Practices and Consumer Protection Act, S.B.C. 2004, c. 2, s. 109(1)(b): a reporting agency must
 * not include information not based on the most reliable evidence reasonably available (official consolidation,
 * current to September 22, 2026). An ACCURACY/CONTENT duty: the recorded gap on s.109(1)(m)/(n)/(o) — the
 * fine-imposition, proceeding-commencement and "event" dates the report never prints — is untouched, and no
 * substitute anchor is invented.
 * QC — CQLR c. P-39.1, s. 11: personal information held on another person must be up to date and accurate when
 * used to make a decision about that person (official LegisQuebec consolidation). The recorded lead (Civil Code
 * of Quebec art. 30) concerns psychiatric custody and is unrelated to credit reporting; c. P-40.1 holds no
 * consumer-report content duty.
 * NB — Credit Reporting Services Act, S.N.B. 2017, c. 27, s. 10(3)(f), on the OPERATIVE legislation: the 2024
 * Consumer Protection Act repeals it by s.380 and comes into force only by proclamation (s.385); no proclamation
 * is recorded, so the repeal has not taken effect.
 * EVIDENCE KIND: general-intake parser on a synthetic structural model through the real packet path —
 * structural-model service integration, not PDF-upload delivery.
 */
const crypto = require('node:crypto');
const generalIntake = require('../../general-intake.cjs');
const evaluation = require('../../evaluation.cjs');
const issues = require('../../issues.cjs');
const { SUPPORT } = require('../../formats.cjs');

const BC = 'CA-BC-BPCPA-S109-1-B-MOST-RELIABLE-EVIDENCE';
const QC = 'CA-QC-P-39-1-S11-ACCURACY';
const NB = 'CA-NB-CRSA-S10-3-F-JUDGMENT-CONTENT-OMISSION';
const REFERENCE_DATE = '2026-06-12';
const DETAILS = { consumer_name: 'Finish Batch Consumer', contact: 'finish.consumer@example.test' };
const text = (t, trusted) => ({ text: t, trusted: trusted !== false, page: 1, line: 1 });
const CONFLICT = [text('Equifax  Consumer Credit Report'), text('Report Date: June 12, 2026'), text('Fictional Creditor  Balance $100  Opened 01/01/2020  Closed 01/01/2019')];
const BENIGN = [text('Equifax  Consumer Credit Report'), text('Report Date: June 12, 2026'), text('Fictional Creditor  Balance $100  Opened 01/01/2019  Closed 01/01/2020')];
const ONE_DATE = [text('Equifax  Consumer Credit Report'), text('Fictional Creditor  Balance $100  Opened 01/01/2020')];
const judgment = (o) => {
  const lines = [text(o.identity || 'Public Record: JDG-901'), text('Judgment')];
  if (o.creditor !== undefined) lines.push(text(o.creditor));
  if (o.address !== undefined) lines.push(text(o.address));
  if (o.amount !== undefined) lines.push(text(o.amount));
  else if (o.blank) lines.push(text('Amount:'));
  if (o.untrusted) lines.push(text('Amount: 4000', false));
  return lines;
};
function extractionFor(lines) {
  return {
    presentation_id: 'GENERAL-BUREAU-REPORT', family_id: null,
    records: generalIntake.buildRecords([{ lines }], null),
    reference_date: { normalized_value: REFERENCE_DATE }, support: SUPPORT.DEMONSTRATION_ONLY_NOT_REPORT_SUPPORT
  };
}
function evaluateFor(lines, region) {
  return evaluation.evaluateCase({ country: 'CA', region, presentation: 'GENERAL-BUREAU-REPORT', extraction: extractionFor(lines) });
}
function hits(out, id) { return (out.results || []).filter((r) => r.check && r.check.adapter_id === id); }
function findings(out, id) { return hits(out, id).map((r) => r.machine && r.machine.finding).filter(Boolean); }
function inject(service, actor, caseId, out, extraction) {
  service.service.store.update((state) => {
    state.results.push({
      result_id: `res_fin_${crypto.randomBytes(10).toString('hex')}`,
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

async function run(service, check) {
  const evidence = {};

  /* ---- 1. British Columbia: s.109(1)(b), the accuracy/content duty. ---- */
  const bc = evaluateFor(CONFLICT, 'CA-BC');
  const bcFindings = findings(bc, BC);
  check.equal(hits(bc, BC).length, 1, "British Columbia's most-reliable-evidence duty runs on an ordinary account");
  check.equal(bcFindings.length, 1, 'and a printed date conflict supports it');
  check.equal(bcFindings[0].classification, 'PROBABLE_VIOLATION', 'as PROBABLE, never a definite breach');
  check.match(String(bcFindings[0].citation), /s\. 109\(1\)\(b\)/, 'citing the retrieved British Columbia provision');
  check.equal(findings(evaluateFor(BENIGN, 'CA-BC'), BC).length, 0, 'consistent printed dates raise nothing in BC');
  check.equal(findings(evaluateFor(ONE_DATE, 'CA-BC'), BC).length, 0, 'and a missing decisive printed value raises nothing');
  check.equal(hits(evaluateFor(CONFLICT, 'CA-QC'), BC).length, 0, 'the British Columbia limb is not offered in Quebec');
  const bcCards = issues.issuesFor({ evaluation: { results: bc.results, common_errors: bc.common_errors }, extraction: extractionFor(CONFLICT) });
  check.equal(bcCards.length, 1, 'one card is offered for the one printed conflict');
  check.equal(bcCards[0].eligible, true, 'and it is selectable');
  check.equal((bcCards[0].supported_bases || []).length, 2, 'carrying the factual conflict and the recorded rule');
  check.match(String(bcCards[0].uncertainty), /Which of the two printed values is unreliable is not established/, 'with the specific uncertainty stated');

  /* ---- 2. Quebec: c. P-39.1, s. 11. ---- */
  const qc = evaluateFor(CONFLICT, 'CA-QC');
  const qcFindings = findings(qc, QC);
  check.equal(hits(qc, QC).length, 1, "Quebec's accuracy duty runs on an ordinary account");
  check.equal(qcFindings.length, 1, 'and a printed date conflict supports it');
  check.equal(qcFindings[0].classification, 'PROBABLE_VIOLATION', 'as PROBABLE');
  check.match(String(qcFindings[0].citation), /P-39\.1, s\. 11/, 'citing the retrieved Quebec provision');
  check.equal(findings(evaluateFor(BENIGN, 'CA-QC'), QC).length, 0, 'consistent printed dates raise nothing in Quebec');
  check.equal(hits(evaluateFor(CONFLICT, 'CA-BC'), QC).length, 0, 'and the Quebec limb is not offered in British Columbia');

  /* ---- 3. New Brunswick: judgment content on the operative 2017 Act. ---- */
  const nb = evaluateFor(judgment({ creditor: 'Creditor: MARITIME HOLDINGS', address: 'Creditor Address: 12 Main St' }), 'CA-NB');
  const nbFindings = findings(nb, NB);
  check.equal(hits(nb, NB).length, 1, "New Brunswick's judgment-content rule runs on a judgment public record");
  check.equal(nbFindings.length, 1, 'and an omitted judgment amount is a supported finding');
  check.equal(nbFindings[0].classification, 'VIOLATION', 'as a definite content violation');
  check.match(String(nbFindings[0].citation), /S\.N\.B\. 2017, c\. 27, s\. 10\(3\)\(f\)/, 'citing the operative 2017 Act provision');
  check.deepEqual(nbFindings[0].content_omission.omitted, ['the judgment amount'], 'naming exactly the omitted content');
  check.equal(findings(evaluateFor(judgment({ creditor: 'Creditor: MARITIME HOLDINGS', address: 'Creditor Address: 12 Main St', amount: 'Amount: 4000' }), 'CA-NB'), NB).length, 0, 'a complete judgment entry raises nothing');
  check.equal(findings(evaluateFor(judgment({ creditor: 'Creditor: MARITIME HOLDINGS', address: 'Creditor Address: 12 Main St', amount: 'Amount: 0' }), 'CA-NB'), NB).length, 0, 'a printed zero amount is a stated amount');
  check.equal(findings(evaluateFor(judgment({ address: 'Creditor Address: 12 Main St', amount: 'Amount: 4000' }), 'CA-NB'), NB).length, 0, 'a missing creditor name is not claimed');
  check.equal(findings(evaluateFor(judgment({ creditor: 'Creditor: MARITIME HOLDINGS', amount: 'Amount: 4000' }), 'CA-NB'), NB).length, 0, 'an absent address alone is recorded and never claimed, because the provision requires it only if available');
  check.equal(findings(evaluateFor(judgment({ creditor: 'Creditor: MARITIME HOLDINGS', address: 'Creditor Address: 12 Main St', blank: true }), 'CA-NB'), NB).length, 0, 'a blank caption is unreadable, not an omission');
  check.equal(findings(evaluateFor(judgment({ creditor: 'Creditor: MARITIME HOLDINGS', address: 'Creditor Address: 12 Main St', untrusted: true }), 'CA-NB'), NB).length, 0, 'an untrusted entry is never an omission');
  check.equal(hits(evaluateFor(judgment({ creditor: 'Creditor: MARITIME HOLDINGS', address: 'Creditor Address: 12 Main St' }), 'CA-NS'), NB).length, 0, 'and the rule is not offered outside New Brunswick');

  /* ---- 4. The consumer journey, on New Brunswick's supported judgment-content issue. ---- */
  const owner = await service.unpaidAccount('cl-finish@example.test');
  const stranger = await service.unpaidAccount('cl-finish-stranger@example.test');
  const unpaid = await service.unpaidAccount('cl-finish-unpaid@example.test');
  const unpaidCase = (await service.request('POST', '/api/cases', { token: unpaid.token, body: { country: 'CA', region: 'CA-NB' } })).json.case;
  const refused = await service.request('POST', `/api/cases/${unpaidCase.case_id}/packet/correspondence`, { token: unpaid.token, body: { correspondence: DETAILS } });
  check.equal(refused.status, 402, 'an unpaid account cannot reach the packet path');
  check.equal(refused.json.error.code, 'ENTITLEMENT_REQUIRED', 'with the entitlement refusal');

  const c = (await service.request('POST', '/api/cases', { token: owner.token, body: { country: 'CA', region: 'CA-NB' } })).json.case;
  await payReportOnce(service, owner, c.case_id);
  const positive = extractionFor(judgment({ creditor: 'Creditor: MARITIME HOLDINGS', address: 'Creditor Address: 12 Main St' }));
  inject(service, owner, c.case_id, evaluateFor(judgment({ creditor: 'Creditor: MARITIME HOLDINGS', address: 'Creditor Address: 12 Main St' }), 'CA-NB'), positive);
  const view = async () => (await service.request('GET', `/api/cases/${c.case_id}/packet`, { token: owner.token })).json.view;
  const issue = (await view()).eligible_issues.find((i) => /S\.N\.B\. 2017, c\. 27, s\. 10\(3\)\(f\)/.test(String(i.citation || '')) || /judgment amount/.test(String(i.explanation || '')));
  check.ok(issue, 'the New Brunswick judgment-content issue is offered for selection');
  check.equal(issue.eligible, true, 'and it is selectable');
  check.equal(issue.request_type, 'CORRECTION', 'as a correction request for a definite content omission');
  check.equal(issue.confidence, 'DEFINITE', 'at the definite confidence the violation classification carries');
  check.match(String(issue.explanation), /without the judgment amount/, 'naming the omitted content in plain language');
  check.match(String(issue.uncertainty), /if available/, 'and stating the provision own address qualification');
  check.equal(JSON.stringify(issue.supported_bases || []).includes(NB), false, 'with no internal adapter id exposed');

  check.equal((await service.request('POST', `/api/cases/${c.case_id}/packet/select`, { token: stranger.token, body: { issue_ids: [issue.issue_id] } })).status, 403, 'another account cannot select on this packet');
  check.equal((await service.request('GET', `/api/cases/${c.case_id}/packet-download`, { token: stranger.token })).status, 403, 'nor download it');
  await service.request('POST', `/api/cases/${c.case_id}/packet/select`, { token: owner.token, body: { issue_ids: [issue.issue_id] } });
  check.equal((await view()).packet.selected_count, 1, 'the consumer selects it');
  await service.request('POST', `/api/cases/${c.case_id}/packet/correspondence`, { token: owner.token, body: { correspondence: DETAILS } });
  check.match(JSON.stringify(await view()), /Finish Batch Consumer/, 'the reviewed correspondence carries the consumer-supplied details');
  check.equal((await service.request('POST', `/api/cases/${c.case_id}/packet/approve`, { token: owner.token })).status, 200, 'the packet approves');
  const dl = await service.request('GET', `/api/cases/${c.case_id}/packet-download`, { token: owner.token });
  check.equal(dl.status, 200, 'and the entitled download succeeds');
  check.match(dl.text, /10\(3\)\(f\)/, 'naming the recorded rule behind the issue');
  check.match(dl.text, /judgment amount/, 'carrying the omitted content the correction asks for');
  const changed = extractionFor(judgment({ creditor: 'Creditor: MARITIME HOLDINGS', address: 'Creditor Address: 12 Main St', amount: 'Amount: 4000' }));
  inject(service, owner, c.case_id, evaluateFor(judgment({ creditor: 'Creditor: MARITIME HOLDINGS', address: 'Creditor Address: 12 Main St', amount: 'Amount: 4000' }), 'CA-NB'), changed);
  const stale = await service.request('GET', `/api/cases/${c.case_id}/packet-download`, { token: owner.token });
  check.notEqual(stale.status, 200, 'a packet whose evidence changed after approval is not silently downloaded');
  check.match(JSON.stringify(stale.json || {}), /STALE/, 'and the refusal names the stale approval');

  /* ---- 5. Saskatchewan: s.18(b) accuracy and s.18(j) judgment content. ---- */
  const SKACC = 'CA-SK-CRA-S18-B-MOST-RELIABLE-EVIDENCE';
  const SKJUD = 'CA-SK-CRA-S18-J-JUDGMENT-CONTENT-OMISSION';
  const sk = evaluateFor(CONFLICT, 'CA-SK');
  check.equal(hits(sk, SKACC).length, 1, "Saskatchewan's most-reliable-evidence duty runs on an ordinary account");
  check.equal(findings(sk, SKACC).length, 1, 'and a printed date conflict supports it');
  check.equal(findings(sk, SKACC)[0].classification, 'PROBABLE_VIOLATION', 'as PROBABLE, never a definite breach');
  check.match(String(findings(sk, SKACC)[0].citation), /s\. 18\(b\)/, 'citing the retrieved Saskatchewan provision');
  check.equal(findings(evaluateFor(BENIGN, 'CA-SK'), SKACC).length, 0, 'consistent printed dates raise nothing in Saskatchewan');
  check.equal(findings(evaluateFor(ONE_DATE, 'CA-SK'), SKACC).length, 0, 'and a missing decisive printed value raises nothing');
  const skCards = issues.issuesFor({ evaluation: { results: sk.results, common_errors: sk.common_errors }, extraction: extractionFor(CONFLICT) });
  check.equal(skCards.length, 1, 'one card is offered for the one printed conflict');
  check.equal((skCards[0].supported_bases || []).length, 2, 'carrying the factual conflict and the recorded rule');
  const skj = evaluateFor(judgment({ creditor: 'Creditor: PRAIRIE HOLDINGS', address: 'Creditor Address: 12 Main St' }), 'CA-SK');
  check.equal(findings(skj, SKJUD).length, 1, 'and an omitted judgment amount is a supported finding');
  check.equal(findings(skj, SKJUD)[0].classification, 'VIOLATION', 'as a definite content violation');
  check.match(String(findings(skj, SKJUD)[0].citation), /s\. 18\(j\)/, 'citing s.18(j)');
  check.deepEqual(findings(skj, SKJUD)[0].content_omission.omitted, ['the judgment amount'], 'naming exactly the omitted content');
  check.equal(findings(evaluateFor(judgment({ creditor: 'Creditor: PRAIRIE HOLDINGS', address: 'Creditor Address: 12 Main St', amount: 'Amount: 4000' }), 'CA-SK'), SKJUD).length, 0, 'a complete judgment entry raises nothing');
  check.equal(findings(evaluateFor(judgment({ creditor: 'Creditor: PRAIRIE HOLDINGS', amount: 'Amount: 4000' }), 'CA-SK'), SKJUD).length, 0, 'an absent address alone is never claimed, because the provision requires it only if available');
  check.equal(hits(evaluateFor(CONFLICT, 'CA-BC'), SKACC).length, 0, 'and the Saskatchewan limbs are not offered outside Saskatchewan');

  /* ---- 6. Saskatchewan journey: select, reviewed correspondence, approval, entitled download. ---- */
  const skOwner = await service.unpaidAccount('cl-sk@example.test');
  const skStranger = await service.unpaidAccount('cl-sk-stranger@example.test');
  const skCase = (await service.request('POST', '/api/cases', { token: skOwner.token, body: { country: 'CA', region: 'CA-SK' } })).json.case;
  await payReportOnce(service, skOwner, skCase.case_id);
  const skLines = judgment({ creditor: 'Creditor: PRAIRIE HOLDINGS', address: 'Creditor Address: 12 Main St' });
  inject(service, skOwner, skCase.case_id, evaluateFor(skLines, 'CA-SK'), extractionFor(skLines));
  const skView = async () => (await service.request('GET', `/api/cases/${skCase.case_id}/packet`, { token: skOwner.token })).json.view;
  const skIssue = (await skView()).eligible_issues.find((i) => /18\(j\)/.test(String(i.citation || '')));
  check.ok(skIssue, 'the Saskatchewan judgment-content issue is offered for selection');
  check.equal(skIssue.request_type, 'CORRECTION', 'as a correction request for a definite content omission');
  check.equal(skIssue.confidence, 'DEFINITE', 'at the definite confidence the violation carries');
  check.match(String(skIssue.explanation), /without the judgment amount/, 'naming the omitted content in plain language');
  check.equal((await service.request('POST', `/api/cases/${skCase.case_id}/packet/select`, { token: skStranger.token, body: { issue_ids: [skIssue.issue_id] } })).status, 403, 'another account cannot select on this packet');
  check.equal((await service.request('GET', `/api/cases/${skCase.case_id}/packet-download`, { token: skStranger.token })).status, 403, 'nor download it');
  await service.request('POST', `/api/cases/${skCase.case_id}/packet/select`, { token: skOwner.token, body: { issue_ids: [skIssue.issue_id] } });
  check.equal((await skView()).packet.selected_count, 1, 'the consumer selects it');
  await service.request('POST', `/api/cases/${skCase.case_id}/packet/correspondence`, { token: skOwner.token, body: { correspondence: DETAILS } });
  check.match(JSON.stringify(await skView()), /Finish Batch Consumer/, 'the reviewed correspondence carries the consumer-supplied details');
  check.equal((await service.request('POST', `/api/cases/${skCase.case_id}/packet/approve`, { token: skOwner.token })).status, 200, 'the packet approves');
  const skDl = await service.request('GET', `/api/cases/${skCase.case_id}/packet-download`, { token: skOwner.token });
  check.equal(skDl.status, 200, 'and the entitled download succeeds');
  check.match(skDl.text, /18\(j\)/, 'naming the recorded Saskatchewan rule');
  check.match(skDl.text, /judgment amount/, 'carrying the omitted content the correction asks for');
  const skChanged = judgment({ creditor: 'Creditor: PRAIRIE HOLDINGS', address: 'Creditor Address: 12 Main St', amount: 'Amount: 4000' });
  inject(service, skOwner, skCase.case_id, evaluateFor(skChanged, 'CA-SK'), extractionFor(skChanged));
  const skStale = await service.request('GET', `/api/cases/${skCase.case_id}/packet-download`, { token: skOwner.token });
  check.notEqual(skStale.status, 200, 'a packet whose evidence changed after approval is not silently downloaded');
  evidence.binding_sk = { provision: 'The Credit Reporting Act (Saskatchewan), S.S. 2004, c. C-43.2, s. 18(b) and s. 18(j)', ledger_row: 'CRP-LSRC-0392', instrument_confirmed_by: 'FCAA current page: a Saskatchewan credit reporting agency must be licensed and is governed by The Credit Reporting Act', retention_paragraphs_not_relied_on: ['s.18(d)', 's.18(e)', 's.18(f)', 's.18(g)', 's.18(k)', 's.18(n)'] };

  evidence.binding = {
    bc: { provision: 'Business Practices and Consumer Protection Act (B.C.), s. 109(1)(b)', ledger_row: 'CRP-LSRC-0338', duty: 'accuracy/content — most reliable evidence reasonably available', recorded_gap_untouched: ['s.109(1)(m)', 's.109(1)(n)', 's.109(1)(o)'] },
    qc: { provision: 'CQLR c. P-39.1, s. 11', ledger_row: 'CRP-LSRC-0391', duty: 'accuracy', recorded_lead_checked: 'Civil Code of Quebec art. 30 is unrelated (psychiatric custody)' },
    nb: { provision: 'Credit Reporting Services Act (N.B.), S.N.B. 2017, c. 27, s. 10(3)(f)', ledger_row: 'CRP-LSRC-0379', operative: 'the 2024 replacement repeals it by s.380 and commences only by proclamation (s.385); no proclamation recorded, so the repeal has not taken effect' }
  };
  evidence.evidence_kind = 'general-intake parser on a synthetic structural model through the real packet path: structural-model service integration, not PDF-upload delivery';
  evidence.journey = { case_id: c.case_id, region: 'CA-NB', request_type: 'CORRECTION', confidence: 'DEFINITE', approved: true, downloaded_chars: (dl.text || '').length };
  return evidence;
}

module.exports = {
  run,
  id: 'cl-bc-qc-nb-finish',
  title: 'BATCH-18: British Columbia accuracy, Quebec accuracy and New Brunswick judgment-content outcomes through the complete packet path'
};
