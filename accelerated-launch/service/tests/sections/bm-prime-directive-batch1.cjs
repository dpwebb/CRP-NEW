'use strict';
const { comparableText } = require('../packet-pdf-assertions.cjs');
/**
 * bm-prime-directive-batch1.cjs — OWNER-POTENTIAL-ISSUE-001 / Batch 1: the complete common-issue consumer
 * journey. A fictional report with one supported uncertain discrepancy (an account opened after it was closed)
 * and one benign alternative (an account opened before it was closed) reaches the consumer as a POTENTIAL
 * verification issue, not a definite finding; the consumer selects it and downloads a factual verification
 * packet. No definite breach is asserted. Also covers the eligibility boundary, cross-account refusal, stale
 * approval and consumer-edit separation.
 */
const crypto = require('node:crypto');
const { makeSyntheticModel } = require('../../../../internal-validation/ca-ns-last-payment-six-year/document-model.cjs');
const { buildPdf } = require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');
const formats = require('../../formats.cjs');
const evaluation = require('../../evaluation.cjs');
const issues = require('../../issues.cjs');

const LINES = [
  'Equifax  Consumer Credit Report',
  'Report Date: June 12, 2026',
  'Creditor A  Balance $100  Opened 01/01/2020  Closed 01/01/2019',
  'Creditor B  Balance $200  Opened 01/01/2018  Closed 01/01/2020'
];

function extract(lines) {
  return formats.extractWithSharedAdapter(makeSyntheticModel({ pages: [lines] }), { mode: 'REPORT', country: 'US' });
}

async function payReportOnce(service, actor, caseId) {
  const checkout = await service.request('POST', '/api/billing/checkout', {
    token: actor.token, body: { plan_code: 'monthly' }
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
}

const uploadBody = (bytes, filename) => ({
  originalFilename: filename,
  declaredBytes: bytes.length,
  mimeType: 'application/pdf',
  contentBase64: bytes.toString('base64')
});

async function run(service, check) {
  const evidence = {};

  /* ---- 1. Classification boundary: a supported discrepancy is a POTENTIAL verification issue, never definite. ---- */
  const ext = extract(LINES);
  const ev = evaluation.evaluateCase({ country: 'US', region: 'US-CA', extraction: ext });
  const all = issues.issuesFor({ evaluation: ev, extraction: ext });
  const potentials = all.filter((i) => i.check_id === 'COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY');
  check.equal(potentials.length, 1, 'one supported report-data violation is produced');
  check.equal(potentials[0].classification, 'PROBABLE_VIOLATION', 'the sourced chronology breach is classified');
  check.equal(potentials[0].basis_type, 'FACTUAL_CONSISTENCY', 'and its basis is the report data');
  check.equal(potentials[0].request_type, 'VERIFICATION', 'with a verification request');
  check.equal(potentials[0].eligible, true, 'and it is packet-eligible');
  check.equal(all.filter((i) => i.confidence === 'DEFINITE').length, 0, 'no definite conclusion is manufactured');
  check.equal(potentials[0].record_index, 1, 'the discrepancy is on account 1 (opened after closed)');
  check.ok(all.every((i) => i.record_index !== 2), 'the benign account (opened before closed) is never flagged');

  /* ---- 2. HTTP: upload -> evaluate -> view -> select -> review -> edit -> approve -> download. ---- */
  const owner = await service.unpaidAccount('b1@example.test');
  const c = (await service.request('POST', '/api/cases', { token: owner.token, body: { country: 'US', region: 'US-CA' } })).json.case;
  await payReportOnce(service, owner, c.case_id);
  const pdf = buildPdf({ pages: [{ lines: LINES }] });
  check.equal((await service.request('POST', `/api/cases/${c.case_id}/files`, { token: owner.token, body: uploadBody(pdf, 'contradictory-dates.pdf') })).status, 201, 'the fictional report uploads');
  check.equal((await service.request('POST', `/api/cases/${c.case_id}/evaluate`, { token: owner.token })).status, 201, 'evaluation succeeds');

  const view = (await service.request('GET', `/api/cases/${c.case_id}`, { token: owner.token })).json.view;
  const result = view.result;
  const cards = (result.issues || []).filter((i) => i.rule_assessment);
  check.equal(cards.length, 1, 'the result surfaces exactly one report-data violation card');
  check.ok(cards[0].explanation.includes('opened date later than its closed date'), 'the card states what the report says');
  check.ok(cards[0].uncertainty.includes('which date needs correction'), 'the card states the specific uncertainty');
  /* OWNER correction (Batch 25): the approved probable lead belongs to PROBABLE issues only, so a potential
     issue keeps its own wording and the classes stay distinct. */
  check.ok(!cards[0].uncertainty.includes(issues.PROBABLE_LEAD), 'the uncertainty is issue-specific');
  check.ok(!/legal finding/.test(cards[0].uncertainty), 'the consumer sees no legal-finding category');
  check.ok((result.issues || []).every((i) => i.confidence !== 'NOT_DETECTED'), 'NOT_DETECTED entries are never surfaced as issue cards');
  const benignLines = ['Equifax  Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor A  Balance $100  Opened 01/01/2018  Closed 01/01/2020'];
  const benignExt = extract(benignLines);
  const benignEv = evaluation.evaluateCase({ country: 'US', region: 'US-CA', extraction: benignExt });
  check.ok((benignEv.common_errors.performed || []).filter((c) => c.state === 'NOT_DETECTED').length >= 1, 'a benign account produces a NOT_DETECTED common-error entry');
  check.equal(issues.issuesFor({ evaluation: benignEv, extraction: benignExt }).filter((i) => i.check_id === 'COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY').length, 0, 'and NOT_DETECTED is never surfaced as an issue card');

  const pv = (await service.request('GET', `/api/cases/${c.case_id}/packet`, { token: owner.token })).json.view;
  check.equal(pv.eligible_issues.length, 1, 'exactly one eligible issue (the potential discrepancy) is offered');
  check.equal(pv.eligible_issues[0].confidence, 'PROBABLE', 'and it is a probable violation for verification');
  check.ok(!/COMMON-ERROR|US-CA-CCRAA/.test(JSON.stringify(pv.eligible_issues[0])), 'the consumer view never exposes internal check/adapter ids');
  const issueId = pv.eligible_issues[0].issue_id;

  await service.request('POST', `/api/cases/${c.case_id}/packet/select`, { token: owner.token, body: { issue_ids: [issueId] } });
  await service.request('POST', `/api/cases/${c.case_id}/packet/wording`, { token: owner.token, body: { wording: 'Please confirm the correct opened and closed dates.' } });
  await service.request('POST', `/api/cases/${c.case_id}/packet/correspondence`, { token: owner.token, body: { correspondence: { consumer_name: 'Dana Whitfield', contact: 'dana.whitfield@example.test' } } });
  await service.preparePostalPacket(owner, c.case_id);
  const approved = await service.request('POST', `/api/cases/${c.case_id}/packet/approve`, { token: owner.token });
  check.equal(approved.status, 200, 'approval succeeds');
  const approvedVersion = approved.json.view.packet.approved_version;

  const dl = await service.request('GET', `/api/cases/${c.case_id}/packet-download`, { token: owner.token });
  check.equal(dl.status, 200, 'the approved packet downloads');
  check.ok(/opened date later than its closed date/.test(comparableText(dl.text)), 'the request agrees with the reviewed facts');
  check.ok(/check the opened and closed dates/.test(comparableText(dl.text)), 'with a plain request to check the reported dates');
  check.ok(/ - verification/.test(comparableText(dl.text)), 'and is labelled a verification request');
  check.ok(!/ - correction/.test(comparableText(dl.text)), 'no correction request is asserted');
  check.ok(!/established reporting issue/.test(comparableText(dl.text)), 'no definite reporting issue is asserted for a potential discrepancy');
  check.ok(comparableText(dl.text).includes('Please confirm the correct opened and closed dates.'), 'and the consumer wording, in its own section');
  check.equal(dl.headers.get('x-crp-packet-version'), approvedVersion, 'actual downloadable bytes are bound to the approved version by the response header');
  check.ok(!/not legal advi/i.test(comparableText(dl.text)), 'with no legal-advice disclaimer');


  /* ---- 3. Cross-account refusal. ---- */
  const other = await service.unpaidAccount('b1-other@example.test');
  check.equal((await service.request('GET', `/api/cases/${c.case_id}/packet`, { token: other.token })).status, 403, 'another account cannot read this packet');

  /* ---- 4. Stale approval: re-selecting invalidates the prior approval. ---- */
  await service.request('POST', `/api/cases/${c.case_id}/packet/select`, { token: owner.token, body: { issue_ids: [issueId] } });
  const stale = await service.request('GET', `/api/cases/${c.case_id}/packet-download`, { token: owner.token });
  check.equal(stale.status, 409, 're-selecting invalidates the prior approval');
  check.equal(stale.json.error.code, 'PACKET_NOT_APPROVED', 'with the not-approved code');

  /* ---- 5. Unknown issue id is refused. ---- */
  const bad = await service.request('POST', `/api/cases/${c.case_id}/packet/select`, { token: owner.token, body: { issue_ids: ['nope'] } });
  check.equal(bad.status, 400, 'an unknown issue id is refused');
  check.equal(bad.json.error.code, 'INVALID_FINDING_SELECTION', 'with the invalid-selection code');

  /* A bankruptcy-only entry cannot create an out-of-checklist statutory issue. */
  const bankruptcyOnly = [
    'Experian Consumer Credit Report - FICTIONAL TEST FIXTURE',
    'Report Date: June 12, 2026',
    'Bankruptcy Public Record: TEST-BK-001',
    'Order for Relief: January 1, 2011'
  ];
  const retiredExt = extract(bankruptcyOnly);
  const retiredEv = evaluation.evaluateCase({ country: 'US', region: 'US-CA', extraction: retiredExt });
  check.ok(!issues.issuesFor({ evaluation: retiredEv, extraction: retiredExt })
    .some((i) => i.adapter_id === 'US-CA-CCRAA-1785-13-A-1-BANKRUPTCY-10Y'),
  'the retired bankruptcy adapter cannot create a consumer issue');

  evidence.potential_issue = 'a supported factual discrepancy reaches the consumer as a POTENTIAL verification issue, selectable and downloadable, never a definite finding';
  evidence.retired_statutory = 'bankruptcy-only content cannot create an out-of-checklist statutory issue';
  return evidence;
}

module.exports = {
  run,
  id: 'bm-prime-directive-batch1',
  title: 'OWNER-POTENTIAL-ISSUE-001: complete common-issue consumer journey (potential discrepancy -> verification packet)'
};

