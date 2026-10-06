'use strict';
/**
 * ci-ca-mb-judgment-content.cjs — BATCH-12: the Manitoba judgment-content rule, end to end.
 *
 * Provision: The Personal Investigations Act (Manitoba), C.C.S.M. c. P34, s. 4(e), retrieved verbatim and
 * recorded on ledger row CRP-LSRC-0377. A personal report shall not contain information as to any judgment
 * against the subject unless mention is made of the name and, except in the case of information provided by the
 * director under The Family Support Enforcement Act, the address of the judgment creditor as given at the date
 * of entry of the judgment and the amount of the judgment.
 *
 * WHAT IS ESTABLISHABLE, and what is NOT. The reader can establish that the AMOUNT is absent: a complete,
 * positively bounded entry printing no amount caption and no dollar figure anywhere is the report not stating
 * the judgment amount. It cannot establish the same for the creditor NAME or ADDRESS, because an uncaptioned
 * value cannot be told from the other text on the entry — so those are read and recorded and are NEVER claimed
 * as omissions. The provision also excepts the ADDRESS where the director provided the information under The
 * Family Support Enforcement Act, and the report never states that provenance.
 *
 * EVIDENCE KIND: the general intake's own parser on a synthetic structural model (the same buildRecords route
 * the other Canadian sections use), carried into the service store and then through the REAL packet path. This
 * is STRUCTURAL-MODEL SERVICE INTEGRATION, not PDF-upload delivery: a synthetic PDF cannot pass the real
 * admission gate, which is why the family sections use this route.
 */
const crypto = require('node:crypto');
const generalIntake = require('../../general-intake.cjs');
const evaluation = require('../../evaluation.cjs');
const { SUPPORT } = require('../../formats.cjs');

const MB = 'CA-MB-PIA-S4-E-JUDGMENT-CONTENT-OMISSION';
const CITATION = 'The Personal Investigations Act (Manitoba), C.C.S.M. c. P34, s. 4(e)';
const REFERENCE_DATE = '2026-06-12';
const DETAILS = { consumer_name: 'Manitoba Fictional Consumer', contact: 'mb.consumer@example.test' };

function text(value, trusted) { return { text: value, trusted: trusted !== false, page: 1, line: 1 }; }

/** One synthetic judgment public record, as the general intake reads one. */
function judgment({ identity, creditor, address, amount, amountState, untrusted }) {
  const lines = [text(identity || 'Public Record: JDG-001'), text('Judgment')];
  if (creditor !== undefined) lines.push(text(creditor));
  if (address !== undefined) lines.push(text(address));
  if (amount !== undefined) lines.push(text(amount));
  else if (amountState === 'blank') lines.push(text('Amount:'));
  if (untrusted) lines.push(text('Amount: 4000', false));
  return lines;
}

/** The general intake's own parser on that structural model: the records a rule would be handed. */
function recordsFor(blockLines) {
  return generalIntake.buildRecords([{ lines: blockLines }], null).filter((r) => r.kind === 'GENERAL_PUBLIC_RECORD');
}
function extractionFor(blockLines) {
  return {
    presentation_id: 'GENERAL-BUREAU-REPORT', family_id: null, records: recordsFor(blockLines),
    reference_date: { normalized_value: REFERENCE_DATE },
    support: SUPPORT.DEMONSTRATION_ONLY_NOT_REPORT_SUPPORT
  };
}
function evaluateFor(extraction, region) {
  return evaluation.evaluateCase({ country: 'CA', region: region || 'CA-MB', presentation: 'GENERAL-BUREAU-REPORT', extraction });
}
function mbResults(out) { return (out.results || []).filter((r) => r.check && r.check.adapter_id === MB); }
function mbFindings(out) { return mbResults(out).map((r) => r.machine && r.machine.finding).filter(Boolean); }
function stateOf(extraction) {
  const r = extraction.records[0];
  if (!r) return null;
  return {
    status: r.status,
    identified: r.facts['judgment.recordIdentified'],
    name: r.facts['judgment.creditorNameState'],
    address: r.facts['judgment.creditorAddressState'],
    amount: r.facts['judgment.amountState'],
    complete: r.facts['judgment.entryComplete'],
    printed: r.printed['judgment_content']
  };
}

function inject(service, actor, caseId, out, extraction) {
  service.service.store.update((state) => {
    state.results.push({
      result_id: `res_mb_${crypto.randomBytes(10).toString('hex')}`,
      case_id: caseId, account_id: actor.account_id, file_id: null, file_ids: [],
      evaluation: { results: out.results, common_errors: out.common_errors },
      extraction: { records: extraction.records, presentation_id: 'GENERAL-BUREAU-REPORT', reference_date: { normalized_value: REFERENCE_DATE }, support: SUPPORT.DEMONSTRATION_ONLY_NOT_REPORT_SUPPORT },
      clarification_eligibility: [], reviewed_at: null, created_at: new Date().toISOString()
    });
  });
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
function packetOf(service, actor, caseId) {
  return service.request('GET', `/api/cases/${caseId}/packet`, { token: actor.token });
}
function mbIssue(view) {
  return (view.eligible_issues || []).find((i) => /C\.C\.S\.M\. c\. P34, s\. 4\(e\)/.test(String(i.citation || ''))
    || /judgment amount/.test(String(i.explanation || ''))) || null;
}

const COMPLETE = judgment({ creditor: 'Creditor: ABC HOLDINGS', address: 'Creditor Address: 12 Main St', amount: 'Amount: 4000' });
const AMOUNT_OMITTED = judgment({ identity: 'Public Record: JDG-002', creditor: 'Creditor: ABC HOLDINGS', address: 'Creditor Address: 12 Main St' });
const ZERO_AMOUNT = judgment({ identity: 'Public Record: JDG-003', creditor: 'Creditor: ABC HOLDINGS', address: 'Creditor Address: 12 Main St', amount: 'Amount: 0' });
const NO_NAME = judgment({ identity: 'Public Record: JDG-004', address: 'Creditor Address: 12 Main St', amount: 'Amount: 4000' });
const NO_ADDRESS = judgment({ identity: 'Public Record: JDG-005', creditor: 'Creditor: ABC HOLDINGS', amount: 'Amount: 4000' });
const BLANK_AMOUNT = judgment({ identity: 'Public Record: JDG-006', creditor: 'Creditor: ABC HOLDINGS', address: 'Creditor Address: 12 Main St', amountState: 'blank' });
const UNTRUSTED = judgment({ identity: 'Public Record: JDG-007', creditor: 'Creditor: ABC HOLDINGS', address: 'Creditor Address: 12 Main St', untrusted: true });

async function run(service, check) {
  const evidence = {};

  /* ---- 1. What the reader establishes about each entry, before any rule runs. ---- */
  const completeState = stateOf(extractionFor(COMPLETE));
  check.equal(completeState.status, 'RESOLVED', 'a complete judgment entry is read as a resolved record');
  check.equal(completeState.name, 'PRESENT', 'its printed creditor caption gives a creditor name');
  check.equal(completeState.address, 'PRESENT', 'its printed creditor-address caption gives an address');
  check.equal(completeState.amount, 'PRESENT', 'and its printed amount caption gives the judgment amount');
  check.equal(completeState.complete, true, 'and the entry is complete and positively bounded');
  check.equal(completeState.printed.creditor_address, 'PRESENT', 'the address reading is carried in the printed evidence');
  check.equal(completeState.printed.amount, 'PRESENT', 'as is the amount reading');

  const omittedState = stateOf(extractionFor(AMOUNT_OMITTED));
  check.equal(omittedState.amount, 'VERIFIED_ABSENT', 'an entry with no amount caption and no dollar figure establishes the amount as absent');
  check.equal(omittedState.status, 'RESOLVED', 'and the record is still read as resolved, because its own content was read');

  /* ---- 2. The supported omission, and its consumer outcome. ---- */
  const omitted = evaluateFor(extractionFor(AMOUNT_OMITTED));
  const omittedFindings = mbFindings(omitted);
  check.equal(mbResults(omitted).length, 1, 'the Manitoba limb runs on a judgment public record');
  check.equal(omittedFindings.length, 1, 'an established omitted judgment amount is a supported finding');
  check.equal(omittedFindings[0].classification, 'VIOLATION', 'as a definite content violation');
  check.equal(omittedFindings[0].citation, CITATION, 'citing the retrieved Manitoba provision');
  check.deepEqual(omittedFindings[0].content_omission.omitted, ['the judgment amount'], 'naming exactly the omitted content');
  check.equal(omittedFindings[0].content_omission.creditor_name, 'PRESENT', 'while the creditor name the report does mention is not claimed as omitted');
  check.equal(omittedFindings[0].content_omission.entry_complete, true, 'and the entry is recorded as complete');
  check.equal(omittedFindings[0].content_omission.assignment_disposition, 'NOT_REQUIRED_BY_THIS_PROVISION',
    'the Nova Scotia assignment alternative is NOT inherited by Manitoba');
  const facts = omittedFindings[0].evaluation.required_facts;
  check.equal(facts.length, 3, 'three decisive predicates: judgment identity, the amount state and entry completeness');
  check.deepEqual(facts.map((f) => f.field).sort(), ['judgment.amountState', 'judgment.entryComplete', 'judgment.recordIdentified'],
    'exactly the predicates this provision needs');
  check.ok(facts.every((f) => f.source && f.source.location), 'each carrying its own source-linked provenance');

  /* ---- 3. Controls: nothing unsupported is raised. ---- */
  const complete = evaluateFor(extractionFor(COMPLETE));
  check.equal(mbResults(complete).length, 1, 'a complete judgment entry is evaluated');
  check.equal(mbFindings(complete).length, 0, 'and a complete entry raises no omission');

  const zero = evaluateFor(extractionFor(ZERO_AMOUNT));
  check.equal(stateOf(extractionFor(ZERO_AMOUNT)).amount, 'PRESENT', 'a printed zero amount counts as a stated amount');
  check.equal(mbFindings(zero).length, 0, 'so a zero judgment amount is not an omission');

  const noName = extractionFor(NO_NAME);
  check.equal(stateOf(noName).name, 'UNRESOLVED', 'an uncaptioned creditor name is UNRESOLVED, never a verified absence');
  check.equal(mbFindings(evaluateFor(noName)).length, 0, 'so a missing creditor name is never claimed as an omission');

  const noAddress = extractionFor(NO_ADDRESS);
  check.equal(stateOf(noAddress).address, 'VERIFIED_ABSENT', 'an entry with no address caption records the address as absent');
  check.equal(stateOf(noAddress).printed.creditor_address, 'VERIFIED_ABSENT', 'and that reading is recorded in the printed evidence');
  check.equal(mbFindings(evaluateFor(noAddress)).length, 0,
    'but an absent address is never claimed: the provision excepts director-provided family-support information and the report never states that provenance');

  const blank = extractionFor(BLANK_AMOUNT);
  check.equal(stateOf(blank).amount, 'UNRESOLVED', 'an amount caption printed with no value is UNRESOLVED, not absent');
  check.equal(mbFindings(evaluateFor(blank)).length, 0, 'and an unreadable field is never treated as an omission');

  const untrusted = extractionFor(UNTRUSTED);
  check.equal(stateOf(untrusted).complete, false, 'an untrusted line leaves the entry positively incomplete');
  check.equal(mbFindings(evaluateFor(untrusted)).length, 0, 'and an incomplete entry is never treated as an omission');

  /* ---- 4. Separate records keep their own evidence, and the jurisdiction is closed. ---- */
  const two = extractionFor(AMOUNT_OMITTED.concat(COMPLETE));
  const twoResults = mbResults(evaluateFor(two));
  check.equal(twoResults.length, 2, 'two judgment records each get their own comparison');
  const twoFindingsHere = twoResults.filter((r) => r.machine && r.machine.finding);
  check.equal(twoFindingsHere.length, 1, 'and only the record that omits the amount supports an omission');
  check.equal(twoFindingsHere[0].record_index, two.records[0].record_index, 'tied to the record that omits it, not the complete one');

  check.equal(mbResults(evaluateFor(extractionFor(AMOUNT_OMITTED), 'CA-NS')).length, 0,
    'the same printed entry outside Manitoba raises no Manitoba issue');
  check.equal(mbResults(evaluateFor(extractionFor(AMOUNT_OMITTED), 'CA-AB')).length, 0, 'and neither does it in another province');

  /* ---- 5. Service integration: the selected issue travels the REAL packet path. ---- */
  const owner = await service.unpaidAccount('ci-mb@example.test');
  const stranger = await service.unpaidAccount('ci-mb-stranger@example.test');
  const unpaid = await service.unpaidAccount('ci-mb-unpaid@example.test');
  const unpaidCase = (await service.request('POST', '/api/cases', { token: unpaid.token, body: { country: 'CA', region: 'CA-MB' } })).json.case;
  const refused = await service.request('POST', `/api/cases/${unpaidCase.case_id}/packet/correspondence`, { token: unpaid.token, body: { correspondence: DETAILS } });
  check.equal(refused.status, 402, 'an unpaid account cannot reach the packet path');
  check.equal(refused.json.error.code, 'SUBSCRIPTION_REQUIRED', 'with the subscription refusal');

  const c = (await service.request('POST', '/api/cases', { token: owner.token, body: { country: 'CA', region: 'CA-MB' } })).json.case;
  await payReportOnce(service, owner, c.case_id);
  const positive = extractionFor(AMOUNT_OMITTED);
  inject(service, owner, c.case_id, evaluateFor(positive), positive);
  const pv = (await packetOf(service, owner, c.case_id)).json.view;
  const issue = mbIssue(pv);
  check.ok(issue, 'the Manitoba judgment-content issue is offered for selection in the packet');
  check.equal(issue.eligible, true, 'and it is selectable');
  check.equal(issue.request_type, 'CORRECTION', 'as a correction request for a definite content omission');
  check.equal(issue.confidence, 'DEFINITE', 'recorded at the definite confidence the violation classification carries');
  check.match(String(issue.explanation), /without the judgment amount/, 'naming the omitted content the report does not state');
  check.match(String(issue.uncertainty), /Family Support Enforcement Act/, 'and stating the address exception the provision carries');
  check.equal(JSON.stringify(issue.supported_bases || []).includes(MB), false, 'with no internal adapter id leaked to the consumer');

  check.equal((await service.request('POST', `/api/cases/${c.case_id}/packet/select`, { token: stranger.token, body: { issue_ids: [issue.issue_id] } })).status, 403,
    'another account cannot select on this packet');
  check.equal((await service.request('GET', `/api/cases/${c.case_id}/packet-download`, { token: stranger.token })).status, 403, 'nor download it');

  await service.request('POST', `/api/cases/${c.case_id}/packet/select`, { token: owner.token, body: { issue_ids: [issue.issue_id] } });
  check.equal((await packetOf(service, owner, c.case_id)).json.view.packet.selected_count, 1, 'the consumer selects the Manitoba issue');
  await service.request('POST', `/api/cases/${c.case_id}/packet/correspondence`, { token: owner.token, body: { correspondence: DETAILS } });
  check.match(JSON.stringify((await packetOf(service, owner, c.case_id)).json.view), /Manitoba Fictional Consumer/, 'the reviewed correspondence carries the consumer-supplied details');
  check.equal((await service.request('POST', `/api/cases/${c.case_id}/packet/approve`, { token: owner.token })).status, 200, 'the packet approves');
  const dl = await service.request('GET', `/api/cases/${c.case_id}/packet-download`, { token: owner.token });
  check.equal(dl.status, 200, 'and the entitled download succeeds');
  check.match(dl.text, /C\.C\.S\.M\. c\. P34, s\. 4\(e\)/, 'naming the recorded rule behind the issue');
  check.match(dl.text, /judgment amount/, 'carrying the omitted content the correction asks for');
  check.match(dl.text, /Request \(correction\): /, 'with a correction request');

  /* Stale approval: the approval binds to the reviewed content, so evidence that changes afterwards is refused. */
  const changed = extractionFor(COMPLETE);
  inject(service, owner, c.case_id, evaluateFor(changed), changed);
  const stale = await service.request('GET', `/api/cases/${c.case_id}/packet-download`, { token: owner.token });
  check.notEqual(stale.status, 200, 'a packet whose evidence changed after approval is not silently downloaded');
  check.match(JSON.stringify(stale.json || {}), /STALE/, 'and the refusal names the stale approval');

  evidence.evidence_kind = 'the general intake own parser on a synthetic structural model, carried into the service store and then through the real packet path: STRUCTURAL-MODEL SERVICE INTEGRATION, not PDF-upload delivery';
  evidence.journey = { case_id: c.case_id, request_type: 'CORRECTION', confidence: 'DEFINITE', approved: true, downloaded_chars: (dl.text || '').length };
  evidence.controls = [
    'a complete judgment raises no omission',
    'a printed zero amount is a stated amount, not an omission',
    'an uncaptioned creditor name is unresolved and is never claimed',
    'an absent creditor address is recorded and never claimed (the Family Support Enforcement exception)',
    'a blank amount caption is unresolved, not absent',
    'an untrusted line makes the entry incomplete, so nothing is claimed',
    'two judgment records keep their own evidence; only the one that omits the amount supports an omission',
    'the same entry outside Manitoba raises no Manitoba issue'
  ];
  return evidence;
}

module.exports = {
  run,
  id: 'ci-ca-mb-judgment-content',
  title: 'BATCH-12: Manitoba s.4(e) judgment-content omission — supported omission through the complete packet path'
};
