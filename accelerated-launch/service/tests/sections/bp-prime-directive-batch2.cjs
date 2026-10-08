'use strict';
const { comparableText } = require('../packet-pdf-assertions.cjs');
/**
 * bp-prime-directive-batch2.cjs — OWNER-POTENTIAL-ISSUE-001 ordinary-account batch: balance/past-due
 * discrepancies, corroborated potential duplicate reporting, and conflicting account responsibility labels,
 * through the existing Issue -> Wizzard -> consumer-selected packet path.
 *
 * Each candidate's affirmative evidence and benign explanation is tested separately:
 *   - past-due > balance is a supported contradiction; payment > balance is NOT promoted (payment meaning and
 *     timing matter);
 *   - a potential duplicate requires corroborated identity (masked identifier + creditor + a matching printed
 *     fact) and uses qualified wording (duplication unconfirmed — original-creditor/collector, transfer, snapshot);
 *   - a responsibility conflict requires the same corroborated account in the SAME snapshot.
 * No legal breach is required for a factual verification request, and none is asserted.
 */
const crypto = require('node:crypto');
const commonErrors = require('../../common-errors.cjs');
const formats = require('../../formats.cjs');
const evaluation = require('../../evaluation.cjs');
const issues = require('../../issues.cjs');
const { makeSyntheticModel } = require('../../../../internal-validation/ca-ns-last-payment-six-year/document-model.cjs');
const { buildPdf } = require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');

function rec(over) {
  return Object.assign({ record_index: 1, kind: 'CONSUMER_CREDIT_LIABILITY', kind_label: 'credit account', status: 'RESOLVED', location: { page: 1, line: 1 }, facts: {} }, over);
}

function extract(lines) {
  return formats.extractWithSharedAdapter(makeSyntheticModel({ pages: [lines] }), { mode: 'REPORT', country: 'US' });
}

function pipeline(lines) {
  const ext = extract(lines);
  const ev = evaluation.evaluateCase({ country: 'US', region: 'US-NY', extraction: ext });
  return { ext, ev, iss: issues.issuesFor({ evaluation: ev, extraction: ext }) };
}

/** Upload -> evaluate -> select the first eligible issue matching `matcher` -> approve -> download. */
async function httpPacket(service, actor, lines, filename, matcher) {
  const caseRow = (await service.request('POST', '/api/cases', { token: actor.token, body: { country: 'US', region: 'US-NY' } })).json.case;
  await payReportOnce(service, actor, caseRow.case_id);
  const pdf = buildPdf({ pages: [{ lines }] });
  const up = await service.request('POST', `/api/cases/${caseRow.case_id}/files`, { token: actor.token, body: uploadBody(pdf, filename) });
  if (up.status !== 201) return { case_id: caseRow.case_id, up };
  const ev = await service.request('POST', `/api/cases/${caseRow.case_id}/evaluate`, { token: actor.token });
  if (ev.status !== 201) return { case_id: caseRow.case_id, up, ev };
  const pv = (await service.request('GET', `/api/cases/${caseRow.case_id}/packet`, { token: actor.token })).json.view;
  const issue = pv.eligible_issues.find(matcher);
  if (!issue) return { case_id: caseRow.case_id, up, ev, pv, issue: null };
  await service.request('POST', `/api/cases/${caseRow.case_id}/packet/select`, { token: actor.token, body: { issue_ids: [issue.issue_id] } });
  await service.request('POST', `/api/cases/${caseRow.case_id}/packet/correspondence`, { token: actor.token, body: { correspondence: { consumer_name: 'Dana Whitfield', contact: 'dana.whitfield@example.test' } } });
  await service.preparePostalPacket(actor, caseRow.case_id);
  await service.request('POST', `/api/cases/${caseRow.case_id}/packet/approve`, { token: actor.token });
  const dl = await service.request('GET', `/api/cases/${caseRow.case_id}/packet-download`, { token: actor.token });
  return { case_id: caseRow.case_id, up, ev, pv, issue, dl };
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

const HDR = ['Equifax Consumer Credit Report', 'Report Date: June 12, 2026'];
const BAL_PASTDUE = HDR.concat(['Creditor A Opened 01/01/2020 Balance $1,250.00 Past Due $2,000.00 Payment $25.00 Credit Limit $5,000.00']);
const BAL_BENIGN = HDR.concat(['Creditor A Opened 01/01/2020 Balance $1,250.00 Past Due $50.00 Payment $25.00 Credit Limit $5,000.00']);
const BAL_PAYMENT_ONLY = HDR.concat(['Creditor A Opened 01/01/2020 Balance $1,250.00 Payment $2,000.00 Credit Limit $5,000.00']);
const DUP = HDR.concat([
  'Creditor A Opened 01/01/2020 Closed 01/01/2021 Balance $100.00',
  'Account Number ****1234',
  'Creditor A Opened 01/01/2020 Closed 01/01/2021 Balance $100.00',
  'Account Number ****1234'
]);
const DUP_NO_CORROBORATION = HDR.concat([
  'Creditor A Opened 01/01/2020 Closed 01/01/2021 Balance $100.00',
  'Account Number ****1234',
  'Creditor A Opened 01/01/2020 Closed 01/01/2021 Balance $250.00',
  'Account Number ****1234'
]);
const RESP = HDR.concat([
  'Creditor A Opened 01/01/2020 Balance $100.00 Individual Account',
  'Account Number ****1234',
  'Creditor A Opened 01/01/2020 Balance $100.00 Joint Account',
  'Account Number ****1234'
]);

async function run(service, check) {
  const evidence = {};

  /* ---- 1. balance/past-due: past-due > balance is supported; payment > balance is NOT promoted. ---- */
  const pastDue = pipeline(BAL_PASTDUE);
  const pastDueIssues = pastDue.iss.filter((i) => i.check_id === 'COMMON-ERROR-BALANCE-PAYMENT-INCONSISTENCY');
  check.equal(pastDueIssues.length, 1, 'past-due > balance produces one potential issue');
  check.equal(pastDueIssues[0].reason, 'PAST_DUE_EXCEEDS_BALANCE', 'with the past-due reason');
  check.equal(pastDueIssues[0].classification, 'PROBABLE_VIOLATION', 'and the sourced balance conflict is a probable violation');
  check.equal(pastDueIssues[0].request_type, 'VERIFICATION', 'with a verification request');
  check.ok(/past-due amount/.test(pastDueIssues[0].explanation), 'explaining the discrepancy');

  const benign = pipeline(BAL_BENIGN);
  check.equal(benign.iss.filter((i) => i.check_id === 'COMMON-ERROR-BALANCE-PAYMENT-INCONSISTENCY').length, 0, 'a past-due amount at or below the balance is never flagged');

  const paymentOnly = pipeline(BAL_PAYMENT_ONLY);
  check.equal(paymentOnly.iss.filter((i) => i.check_id === 'COMMON-ERROR-BALANCE-PAYMENT-INCONSISTENCY').length, 0, 'a payment above the balance is NOT promoted (payment meaning and timing matter)');

  /* ---- 2. duplicate: corroborated identity -> qualified potential duplicate; without corroboration it is not. ---- */
  const dup = pipeline(DUP);
  const dupIssues = dup.iss.filter((i) => i.check_id === 'COMMON-ERROR-DUPLICATE-REPORTING');
  check.equal(dupIssues.length, 1, 'a corroborated potential duplicate produces one issue');
  check.equal(dupIssues[0].classification, 'POTENTIAL_VIOLATION', 'the source-linked duplicate concern is a potential violation');
  check.ok(/may be the same account reported twice/.test(dupIssues[0].explanation), 'with qualified potential-duplicate wording');
  check.ok(/unconfirmed/.test(dupIssues[0].uncertainty), 'stating the duplication is unconfirmed');

  const noCorroboration = pipeline(DUP_NO_CORROBORATION);
  check.equal(noCorroboration.iss.filter((i) => i.check_id === 'COMMON-ERROR-DUPLICATE-REPORTING').length, 0, 'same identity with contradicting balances is never promoted as a duplicate');

  /* ---- 3. responsibility: same corroborated account + same snapshot + different labels. ---- */
  const resp = pipeline(RESP);
  const respIssues = resp.iss.filter((i) => i.check_id === 'COMMON-ERROR-RESPONSIBILITY-INCONSISTENCY');
  check.equal(respIssues.length, 1, 'conflicting responsibility labels on the same corroborated account produce one issue');
  check.equal(respIssues[0].classification, 'PROBABLE_VIOLATION', 'the two located responsibility labels support a probable violation');
  check.ok(/two different responsibility labels/.test(respIssues[0].explanation), 'explaining the conflict');
  check.ok(/joint account|authorized-user/.test(respIssues[0].uncertainty), 'with the benign alternatives');

  /* ---- 4. HTTP end-to-end: balance/past-due through the packet path. ---- */
  const owner = await service.unpaidAccount('b2-bal@example.test');
  const c = (await service.request('POST', '/api/cases', { token: owner.token, body: { country: 'US', region: 'US-NY' } })).json.case;
  await payReportOnce(service, owner, c.case_id);
  const pdf = buildPdf({ pages: [{ lines: BAL_PASTDUE }] });
  check.equal((await service.request('POST', `/api/cases/${c.case_id}/files`, { token: owner.token, body: uploadBody(pdf, 'balance.pdf') })).status, 201, 'the balance report uploads');
  check.equal((await service.request('POST', `/api/cases/${c.case_id}/evaluate`, { token: owner.token })).status, 201, 'evaluation succeeds');
  const pv = (await service.request('GET', `/api/cases/${c.case_id}/packet`, { token: owner.token })).json.view;
  const balIssue = pv.eligible_issues.find((i) => i.basis_type === 'FACTUAL_CONSISTENCY' && i.explanation.includes('past-due amount'));
  check.ok(balIssue, 'the past-due issue is offered for selection');
  check.ok(balIssue.source_facts && balIssue.source_facts.some((f) => f.raw_value), 'with the printed balance/past-due raw provenance carried through');
  await service.request('POST', `/api/cases/${c.case_id}/packet/select`, { token: owner.token, body: { issue_ids: [balIssue.issue_id] } });
  await service.request('POST', `/api/cases/${c.case_id}/packet/correspondence`, { token: owner.token, body: { correspondence: { consumer_name: 'Dana Whitfield', contact: 'dana.whitfield@example.test' } } });
  await service.preparePostalPacket(owner, c.case_id);
  await service.request('POST', `/api/cases/${c.case_id}/packet/approve`, { token: owner.token });
  const dl = await service.request('GET', `/api/cases/${c.case_id}/packet-download`, { token: owner.token });
  check.equal(dl.status, 200, 'the balance/past-due packet downloads');
  check.ok(/past-due amount/.test(comparableText(dl.text)), 'with the factual verification request');
  check.ok(/verify the balance/.test(comparableText(dl.text)), 'and the recorded request wording');
  check.ok(/VIOLATION/.test(comparableText(dl.text)) && comparableText(dl.text).includes(`Reporting rule: ${balIssue.rule_assessment.requirement}`), 'stating the violation and its breached report-data requirement');
  check.ok(!/established reporting issue/.test(comparableText(dl.text)), 'never asserting a definite reporting issue');

  /* ---- 5. HTTP end-to-end: potential duplicate through the packet path (qualified wording). ---- */
  const dupOwner = await service.unpaidAccount('b2-dup@example.test');
  const dupRun = await httpPacket(service, dupOwner, DUP, 'duplicate.pdf', (i) => i.explanation.includes('reported twice'));
  check.equal(dupRun.up.status, 201, 'the duplicate report uploads');
  check.equal(dupRun.ev.status, 201, 'and evaluates');
  check.ok(dupRun.issue, 'the potential duplicate is offered for selection');
  check.ok(dupRun.issue.uncertainty.includes('unconfirmed'), 'with qualified potential-duplicate wording in the review');
  check.equal(dupRun.dl.status, 200, 'the potential-duplicate packet downloads');
  check.ok(/reported twice/.test(comparableText(dupRun.dl.text)), 'with the qualified potential-duplicate request');
  check.ok(/verify whether/.test(comparableText(dupRun.dl.text)), 'and the recorded verification wording');
  check.ok(!/established reporting issue/.test(comparableText(dupRun.dl.text)), 'never asserting a definite finding');

  /* ---- 6. HTTP end-to-end: responsibility conflict through the packet path. ---- */
  const respOwner = await service.unpaidAccount('b2-resp@example.test');
  const respRun = await httpPacket(service, respOwner, RESP, 'responsibility.pdf', (i) => i.explanation.includes('responsibility labels'));
  check.equal(respRun.up.status, 201, 'the responsibility report uploads');
  check.equal(respRun.ev.status, 201, 'and evaluates');
  check.ok(respRun.issue, 'the responsibility conflict is offered for selection');
  check.ok(respRun.issue.uncertainty.includes('joint account'), 'with the benign alternatives in the review');
  check.equal(respRun.dl.status, 200, 'the responsibility packet downloads');
  check.ok(/responsibility labels/.test(comparableText(respRun.dl.text)), 'with the factual verification request');
  check.ok(/verify the responsibility/.test(comparableText(respRun.dl.text)), 'and the recorded request wording');

  /* ---- 7. Editing wording after approval invalidates the approval (download refused, not the older packet). ---- */
  await service.request('POST', `/api/cases/${c.case_id}/packet/select`, { token: owner.token, body: { issue_ids: [balIssue.issue_id] } });
  await service.request('POST', `/api/cases/${c.case_id}/packet/correspondence`, { token: owner.token, body: { correspondence: { consumer_name: 'Dana Whitfield', contact: 'dana.whitfield@example.test' } } });
  await service.request('POST', `/api/cases/${c.case_id}/packet/approve`, { token: owner.token });
  await service.request('POST', `/api/cases/${c.case_id}/packet/wording`, { token: owner.token, body: { wording: 'Changed after approval.' } });
  const staleDl = await service.request('GET', `/api/cases/${c.case_id}/packet-download`, { token: owner.token });
  check.equal(staleDl.status, 409, 'editing wording after approval invalidates the approval');
  check.equal(staleDl.json.error.code, 'PACKET_NOT_APPROVED', 'and the download is refused, never the older approved packet');

  evidence.balance_past_due = 'past-due > balance is a supported verification issue; payment > balance is not promoted';
  evidence.duplicate = 'corroborated potential duplicate uses qualified wording; without corroboration it is not promoted';
  evidence.responsibility = 'same-snapshot corroborated responsibility conflict is a supported verification issue';
  return evidence;
}

module.exports = {
  run,
  id: 'bp-prime-directive-batch2',
  title: 'OWNER-POTENTIAL-ISSUE-001: ordinary-account batch (balance/past-due, potential duplicate, responsibility conflict)'
};

