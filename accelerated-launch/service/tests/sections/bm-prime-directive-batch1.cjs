'use strict';
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
  const potentials = all.filter((i) => i.confidence === 'POTENTIAL');
  check.equal(potentials.length, 1, 'one supported potential issue is produced');
  check.equal(potentials[0].classification, null, 'a potential issue is never a VIOLATION/PROBABLE classification');
  check.equal(potentials[0].basis_type, 'FACTUAL_CONSISTENCY', 'and it is a factual consistency issue, not a statutory one');
  check.equal(potentials[0].request_type, 'VERIFICATION', 'with a verification (not correction) request');
  check.equal(potentials[0].eligible, true, 'and it is packet-eligible for a verification request');
  check.equal(all.filter((i) => i.confidence === 'DEFINITE' || i.confidence === 'PROBABLE').length, 0, 'no definite/probable finding is manufactured from the discrepancy');
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
  const cards = (result.issues || []).filter((i) => i.confidence === 'POTENTIAL');
  check.equal(cards.length, 1, 'the result surfaces exactly one potential issue card');
  check.ok(cards[0].explanation.includes('opened date later than its closed date'), 'the card states what the report says');
  check.ok(cards[0].uncertainty.includes('not, by itself, an established legal violation'), 'the card states the specific uncertainty');
  /* OWNER correction (Batch 25): the approved probable lead belongs to PROBABLE issues only, so a potential
     issue keeps its own wording and the classes stay distinct. */
  check.ok(!cards[0].uncertainty.includes(issues.PROBABLE_LEAD), 'a potential issue never carries the probable lead sentence');
  check.ok(!/probable reporting issue/.test(cards[0].uncertainty), 'and is never worded as a probable issue');
  check.ok((result.issues || []).every((i) => i.confidence !== 'NOT_DETECTED'), 'NOT_DETECTED entries are never surfaced as issue cards');
  const benignLines = ['Equifax  Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor A  Balance $100  Opened 01/01/2018  Closed 01/01/2020'];
  const benignExt = extract(benignLines);
  const benignEv = evaluation.evaluateCase({ country: 'US', region: 'US-CA', extraction: benignExt });
  check.ok((benignEv.common_errors.performed || []).filter((c) => c.state === 'NOT_DETECTED').length >= 1, 'a benign account produces a NOT_DETECTED common-error entry');
  check.equal(issues.issuesFor({ evaluation: benignEv, extraction: benignExt }).filter((i) => i.confidence === 'POTENTIAL').length, 0, 'and NOT_DETECTED is never surfaced as an issue card');

  const pv = (await service.request('GET', `/api/cases/${c.case_id}/packet`, { token: owner.token })).json.view;
  check.equal(pv.eligible_issues.length, 1, 'exactly one eligible issue (the potential discrepancy) is offered');
  check.equal(pv.eligible_issues[0].confidence, 'POTENTIAL', 'and it is a potential (verification) issue');
  check.ok(!/COMMON-ERROR|US-CA-CCRAA/.test(JSON.stringify(pv.eligible_issues[0])), 'the consumer view never exposes internal check/adapter ids');
  const issueId = pv.eligible_issues[0].issue_id;

  await service.request('POST', `/api/cases/${c.case_id}/packet/select`, { token: owner.token, body: { issue_ids: [issueId] } });
  await service.request('POST', `/api/cases/${c.case_id}/packet/wording`, { token: owner.token, body: { wording: 'Please confirm the correct opened and closed dates.' } });
  await service.request('POST', `/api/cases/${c.case_id}/packet/correspondence`, { token: owner.token, body: { correspondence: { consumer_name: 'Dana Whitfield', contact: 'dana.whitfield@example.test' } } });
  const approved = await service.request('POST', `/api/cases/${c.case_id}/packet/approve`, { token: owner.token });
  check.equal(approved.status, 200, 'approval succeeds');
  const approvedVersion = approved.json.view.packet.approved_version;

  const dl = await service.request('GET', `/api/cases/${c.case_id}/packet-download`, { token: owner.token });
  check.equal(dl.status, 200, 'the approved packet downloads');
  check.ok(/opened date later than its closed date/.test(dl.text), 'the request agrees with the reviewed facts');
  check.ok(/verify the opened and closed dates/.test(dl.text), 'with the recorded verification request wording');
  check.ok(/Request \(verification\)/.test(dl.text), 'and is labelled a verification request');
  check.ok(!/Request \(correction\)/.test(dl.text), 'no correction request is asserted');
  check.ok(!/established reporting issue/.test(dl.text), 'no definite reporting issue is asserted for a potential discrepancy');
  check.ok(dl.text.includes('Please confirm the correct opened and closed dates.'), 'and the consumer wording, in its own section');
  check.ok(dl.text.includes(approvedVersion), 'bound to the approved version');
  check.ok(!/not legal advi/i.test(dl.text), 'with no legal-advice disclaimer');


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

  /* ---- 6. PROBABLE path: the supported probable verification issue reaches selection and download through the
     real PDF upload path. The historical-verification qualifier is word-wrapped exactly as the OCR fixture wraps it
     (the synthetic PDF builder clips very long single lines, so the qualifier is split at its natural break), and the
     general intake associates it with the public record — no store injection. ---- */
  const PROB_LINES = [
    'Experian Consumer Credit Report - FICTIONAL TEST FIXTURE',
    'Report Date: June 12, 2026',
    'Bankruptcy Public Record: TEST-BK-001',
    'Order for Relief: January 1, 2011',
    'Historical verification for TEST-BK-001: the Order for Relief date above is the reported date;',
    'its correspondence to the actual court order is unverified and cannot be established from this disclosure.'
  ];
  const probExt = extract(PROB_LINES);
  const probEv = evaluation.evaluateCase({ country: 'US', region: 'US-CA', extraction: probExt });
  const probables = issues.issuesFor({ evaluation: probEv, extraction: probExt }).filter((i) => i.confidence === 'PROBABLE' && i.adapter_id === 'US-CA-CCRAA-1785-13-A-1-BANKRUPTCY-10Y');
  check.equal(probables.length, 1, 'a supported probable issue is produced');
  check.equal(probables[0].classification, 'PROBABLE_VIOLATION', 'retaining its PROBABLE_VIOLATION classification');
  check.equal(probables[0].basis_type, 'STATUTORY_RETENTION', 'as a statutory retention issue');
  check.equal(probables[0].request_type, 'VERIFICATION', 'with a verification (not correction) request');
  check.equal(probables[0].eligible, true, 'and it is packet-eligible');
  check.ok(probables[0].uncertainty.includes('cannot be established'), 'retaining its specific uncertainty');
  check.ok(!probables[0].uncertainty.startsWith(issues.PROBABLE_LEAD), 'the generic confidence tier lead is omitted before the specific uncertainty');
  check.ok(probables[0].decisive_fact_unavailable, 'naming the decisive unavailable fact');

  const pOwner = await service.unpaidAccount('b1-prob@example.test');
  const pCase = (await service.request('POST', '/api/cases', { token: pOwner.token, body: { country: 'US', region: 'US-CA' } })).json.case;
  await payReportOnce(service, pOwner, pCase.case_id);
  const pPdf = buildPdf({ pages: [{ lines: PROB_LINES }] });
  const pUp = await service.request('POST', `/api/cases/${pCase.case_id}/files`, { token: pOwner.token, body: uploadBody(pPdf, 'bankruptcy.pdf') });
  check.equal(pUp.status, 201, 'the bankruptcy public-record report uploads');
  const pEval = await service.request('POST', `/api/cases/${pCase.case_id}/evaluate`, { token: pOwner.token });
  check.equal(pEval.status, 201, 'and evaluates through the upload path');
  const pPv = (await service.request('GET', `/api/cases/${pCase.case_id}/packet`, { token: pOwner.token })).json.view;
  const pProbable = pPv.eligible_issues.find((i) => i.confidence === 'PROBABLE');
  check.ok(pProbable, 'the probable issue is offered for selection');
  check.ok(pProbable.uncertainty.includes('cannot be established'), 'with its specific uncertainty in the review');
  await service.request('POST', `/api/cases/${pCase.case_id}/packet/select`, { token: pOwner.token, body: { issue_ids: [pProbable.issue_id] } });
  await service.request('POST', `/api/cases/${pCase.case_id}/packet/correspondence`, { token: pOwner.token, body: { correspondence: { consumer_name: 'Dana Whitfield', contact: 'dana.whitfield@example.test' } } });
  await service.request('POST', `/api/cases/${pCase.case_id}/packet/approve`, { token: pOwner.token });
  const pDl = await service.request('GET', `/api/cases/${pCase.case_id}/packet-download`, { token: pOwner.token });
  check.equal(pDl.status, 200, 'the probable issue downloads');
  check.ok(/reporting issue/i.test(pDl.text), 'as a reporting issue with its evidence and request');
  check.ok(/verify the event date/.test(pDl.text), 'with a verification request');
  check.ok(!/established reporting issue/.test(pDl.text), 'never asserting a definite breach');

  evidence.potential_issue = 'a supported factual discrepancy reaches the consumer as a POTENTIAL verification issue, selectable and downloadable, never a definite finding';
  evidence.probable_issue = 'a supported PROBABLE_VIOLATION reaches selection and download through the real upload path as a verification request, retaining its specific uncertainty';
  return evidence;
}

module.exports = {
  run,
  id: 'bm-prime-directive-batch1',
  title: 'OWNER-POTENTIAL-ISSUE-001: complete common-issue consumer journey (potential discrepancy -> verification packet)'
};

