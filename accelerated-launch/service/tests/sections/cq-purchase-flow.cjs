'use strict';
/**
 * cq-purchase-flow.cjs — OWNER-PURCHASE-FLOW-001 (supersedes payment-before-assessment and the one-time packet).
 *
 * Proves, against the real service and with fictional reports only:
 *   1. a signed-in consumer uploads and assesses an owned report with NO purchase recorded;
 *   2. the free summary reports DISTINCT issues (after the existing merging), split across the three confidence
 *      categories so the counts add up, plus ONE teaser chosen by the documented severity order — never by
 *      confidence — and carrying no printed personal identifier;
 *   3. the complete assessment, its evidence and its download need a one-time unlock of THAT report or a
 *      subscription; the packet, the response draft and the history/comparison need a subscription;
 *   4. a one-time unlock opens exactly one report, never a subscriber feature and never another report;
 *   5. direct API requests cannot bypass either boundary, cross-account access stays refused, and packet approval
 *      with the stale-approval refusal keeps working for subscribers.
 */
const crypto = require('node:crypto');
const { buildPdf } = require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');
const results = require('../../results.cjs');

const uploadBody = (bytes, filename) => ({
  originalFilename: filename,
  declaredBytes: bytes.length,
  mimeType: 'application/pdf',
  contentBase64: bytes.toString('base64')
});

const expiredRetention = () => buildPdf({ pages: [{ lines: ['Equifax  Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor A  Balance $100  Opened 01/01/2016  Closed 01/01/2017'] }] });
const contradiction = () => buildPdf({ pages: [{ lines: ['Equifax  Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor B  Balance $200  Opened 01/01/2020  Closed 01/01/2019'] }] });

function checkLockedEvaluation(check, response, view, label) {
  check.equal(response.status, 201, `${label}: the assessment still runs before purchase`);
  check.equal(response.json.result, null, `${label}: the raw POST response locks the full assessment`);
  check.equal(response.json.result_id, null, `${label}: it does not expose the locked result identity`);
  check.deepEqual(response.json.assessment_summary, view.assessment_summary, `${label}: it serves the same free summary and teaser as the case view`);
  check.deepEqual(response.json.assessment_access, view.assessment_access, `${label}: it states the same purchase boundary`);
  check.equal(response.json.assessed_on, view.assessment_summary.assessed_on, `${label}: it serves the persisted assessment date`);
  check.ok(response.json.assessed_on, `${label}: the assessment date is populated`);
  check.deepEqual(Object.keys(response.json).sort(), ['ok', 'result_id', 'assessed_on', 'assessment_summary', 'assessment_access', 'result'].sort(),
    `${label}: no full-result payload is attached beside the summary`);
  check.ok(!/"(?:issues|observations|source_facts|source_location|source_evidence|rule_assessment|supported_bases|evidence)"\s*:/.test(response.text),
    `${label}: the raw POST response carries no issue collection, rule detail or report evidence`);
  check.ok(!/Creditor B|01\/01\/2020|01\/01\/2019/.test(response.text), `${label}: it carries no printed creditor or account dates`);
}

function checkUnlockedEvaluation(check, response, view, label) {
  check.equal(response.status, 201, `${label}: an entitled account can assess its report`);
  check.ok(response.json.result && Array.isArray(response.json.result.issues), `${label}: the raw POST response includes the complete assessment`);
  check.deepEqual(response.json.result, view.result, `${label}: its full result is the existing consumer projection`);
  check.equal(response.json.result_id, view.result_id, `${label}: the accessible result identity is preserved`);
  check.deepEqual(response.json.assessment_access, view.assessment_access, `${label}: its recorded purchase scope is preserved`);
}

async function uploadAndAssess(service, actor, bytes, name, region) {
  const created = await service.request('POST', '/api/cases', { token: actor.token, body: { country: 'CA', region: region || 'CA-NS' } });
  const caseRow = created.json.case;
  await service.request('POST', `/api/cases/${caseRow.case_id}/files`, { token: actor.token, body: uploadBody(bytes, name) });
  await service.request('POST', `/api/cases/${caseRow.case_id}/evaluate`, { token: actor.token });
  return caseRow;
}

async function unlockOneReport(service, actor, caseId) {
  const checkout = await service.request('POST', '/api/billing/checkout', { token: actor.token, body: { plan_code: 'report_once', case_id: caseId } });
  const opened = checkout.json.checkout;
  await service.postEvent({
    id: `test_evt_${crypto.randomBytes(8).toString('hex')}`,
    type: 'checkout.session.completed',
    account_reference: actor.account_id,
    plan_code: 'report_once',
    session_reference: opened.provider_reference,
    amount_cents: opened.plan.amount_cents,
    currency: opened.plan.currency,
    occurred_at: new Date().toISOString()
  });
  return opened;
}

async function run(service, check) {
  const evidence = {};

  /* ---- 1. Free account: upload, assess, summary, teaser, and every protected read refused ---- */
  const free = await service.unpaidAccount('cq-free@example.test');
  const created = await service.request('POST', '/api/cases', { token: free.token, body: { country: 'CA', region: 'CA-NS' } });
  const c = created.json.case;
  check.equal((await service.request('POST', `/api/cases/${c.case_id}/files`, { token: free.token, body: uploadBody(contradiction(), 'cq-a.pdf') })).status, 201, 'an unpaid account uploads an owned report');
  const freeEvaluation = await service.request('POST', `/api/cases/${c.case_id}/evaluate`, { token: free.token });

  const view = (await service.request('GET', `/api/cases/${c.case_id}`, { token: free.token })).json.view;
  checkLockedEvaluation(check, freeEvaluation, view, 'unpaid account');
  check.ok(view.assessment_summary, 'the case view carries the free results summary');
  check.equal(view.result, null, 'and never the complete assessment');
  check.equal(view.assessment_access.complete_assessment, false, 'the complete assessment is locked');
  check.equal(view.assessment_access.dispute_packet, false, 'and so is the dispute packet');
  check.deepEqual(view.assessment_access.purchase_choices, ['unlock_this_report', 'monthly', 'annual'], 'the purchase choices are stated');
  const summary = view.assessment_summary;
  const by = summary.by_confidence;
  check.equal(summary.distinct_total, by.violation + by.probable_violation + by.potential, 'the category counts add up to the distinct total');
  check.ok(summary.distinct_total >= 1, 'the fictional report produced at least one issue');
  check.ok(summary.teaser && summary.teaser.confidence_label && summary.teaser.explanation, 'the teaser names a confidence label and a short explanation');
  check.ok(String(summary.teaser.explanation).length <= 240, 'the teaser stays short');
  check.ok(!/Creditor B/.test(JSON.stringify(summary.teaser)), 'the teaser carries no printed creditor identity');
  check.deepEqual(summary.severity_order, results.SEVERITY_ORDER, 'the served severity order is the documented one');
  evidence.free_summary = { distinct_total: summary.distinct_total, by_confidence: by, teaser: summary.teaser.severity };

  for (const [label, response] of [
    ['the result list', await service.request('GET', `/api/cases/${c.case_id}/results`, { token: free.token })],
    ['the result view', await service.request('GET', `/api/cases/${c.case_id}/results/anything/view`, { token: free.token })],
    ['the assessment download', await service.request('GET', `/api/cases/${c.case_id}/report-download`, { token: free.token })],
    ['the packet view', await service.request('GET', `/api/cases/${c.case_id}/packet`, { token: free.token })],
    ['the packet selection', await service.request('POST', `/api/cases/${c.case_id}/packet/select`, { token: free.token, body: { issue_ids: [] } })],
    ['the packet approval', await service.request('POST', `/api/cases/${c.case_id}/packet/approve`, { token: free.token })],
    ['the report history', await service.request('GET', '/api/history', { token: free.token })]
  ]) {
    check.ok(response.status === 402 || response.status === 403 || response.status === 404,
      `${label} is refused for an unpaid account (${response.status})`);
  }
  check.equal((await service.request('GET', `/api/cases/${c.case_id}`, { token: free.token })).status, 200, 'while basic information about the owned file stays readable');
  /* ---- 2. Severity is independent of confidence, and ties break stably ---- */
  const synthetic = results.summariseAssessment({
    issues: [
      { issue_id: 'b', basis_type: 'FACTUAL_CONSISTENCY', confidence: 'DEFINITE', consumer_label: 'VIOLATION', eligible: true,
        preview_category: 'DATE_CONFLICT', explanation: 'Two printed details cannot both be right.' },
      { issue_id: 'a', basis_type: 'STATUTORY_RETENTION', confidence: 'PROBABLE', consumer_label: 'VIOLATION', eligible: true,
        preview_category: 'REPORTING_TIME_LIMIT', explanation: 'An entry is kept longer than the recorded rule allows.' }
    ]
  });
  check.equal(synthetic.teaser.issue_id, 'a', 'the teaser follows the documented severity order, never the confidence');
  check.equal(synthetic.teaser.severity, 'REPORTING_TIME_LIMIT', 'and names the supported reporting time-limit category');
  check.equal(synthetic.by_confidence.violation, 1, 'the definite issue is still counted as a violation');
  check.equal(synthetic.by_confidence.probable_violation, 1, 'and the probable one in its own category');
  const tied = results.summariseAssessment({
    issues: [
      { issue_id: 'zzz', basis_type: 'STATUTORY_RETENTION', confidence: 'POTENTIAL', consumer_label: 'VIOLATION', eligible: true,
        preview_category: 'REPORTING_TIME_LIMIT', explanation: 'x' },
      { issue_id: 'aaa', basis_type: 'STATUTORY_RETENTION', confidence: 'DEFINITE', consumer_label: 'VIOLATION', eligible: true,
        preview_category: 'REPORTING_TIME_LIMIT', explanation: 'y' }
    ]
  });
  check.equal(tied.teaser.issue_id, 'aaa', 'equal severity breaks on the stable issue id');
  check.deepEqual(results.summariseAssessment({ issues: [] }), {
    distinct_total: 0,
    information_total: 0,
    by_confidence: { violation: 0, probable_violation: 0, potential: 0 },
    categories_sum_to_total: true,
    severity_order: results.SEVERITY_ORDER.slice(),
    teaser: null,
    has_issues: false
  }, 'a report with nothing found yields no teaser and no invented count');

  /* ---- 3. One-time unlock: this report only, never the subscriber features, never another report ---- */
  const once = await service.unpaidAccount('cq-once@example.test');
  const caseA = await uploadAndAssess(service, once, expiredRetention(), 'cq-once-a.pdf', 'CA-NS');
  const caseB = await uploadAndAssess(service, once, contradiction(), 'cq-once-b.pdf', 'CA-NS');
  const beforeUnlock = (await service.request('GET', `/api/cases/${caseA.case_id}`, { token: once.token })).json.view;
  check.equal(beforeUnlock.result, null, 'the report is locked before the unlock');
  await unlockOneReport(service, once, caseA.case_id);

  const unlockedEvaluation = await service.request('POST', `/api/cases/${caseA.case_id}/evaluate`, { token: once.token });
  const aView = (await service.request('GET', `/api/cases/${caseA.case_id}`, { token: once.token })).json.view;
  checkUnlockedEvaluation(check, unlockedEvaluation, aView, 'one-time selected report');
  check.equal(aView.assessment_access.complete_assessment, true, 'the one-time unlock opens the report it was bought for');
  check.equal(aView.assessment_access.complete_assessment_via, 'ONE_TIME_CREDIT', 'on the recorded one-time authority');
  check.ok(aView.result && Array.isArray(aView.result.issues), 'and the complete assessment is served');
  check.equal(aView.result.issues.filter(issue => !issue.limitation_concern).length, aView.assessment_summary.distinct_total, 'the distinct reporting count excludes court information and merged rule duplicates');
  check.equal((await service.request('GET', `/api/cases/${caseA.case_id}/report-download`, { token: once.token })).status, 200, 'and the assessment download is allowed');
  const otherEvaluation = await service.request('POST', `/api/cases/${caseB.case_id}/evaluate`, { token: once.token });
  const bView = (await service.request('GET', `/api/cases/${caseB.case_id}`, { token: once.token })).json.view;
  checkLockedEvaluation(check, otherEvaluation, bView, 'one-time other report');
  check.equal(bView.assessment_access.complete_assessment, false, 'another report stays locked');
  check.equal(bView.result, null, 'so its complete assessment is not served');
  check.equal((await service.request('GET', `/api/cases/${caseB.case_id}/report-download`, { token: once.token })).status, 402, 'and its download is refused');
  check.equal((await service.request('GET', `/api/cases/${caseA.case_id}/packet`, { token: once.token })).status, 402, 'the packet stays closed for a one-time unlock');
  check.equal((await service.request('POST', `/api/cases/${caseA.case_id}/packet/select`, { token: once.token, body: { issue_ids: [] } })).status, 402, 'and packet selection is refused');

  /* ---- 3b. A one-time unlock must have a valid report, checked BEFORE the provider is called ---- */
  const checkouts = () => (service.service.store.state().checkout_sessions || []).length;
  const before = checkouts();
  const outsider = await service.unpaidAccount('cq-outsider@example.test');
  const noCase = await service.request('POST', '/api/billing/checkout', { token: once.token, body: { plan_code: 'report_once' } });
  check.equal(noCase.status, 400, 'a one-time unlock with no report named is refused');
  check.equal(noCase.json.error.code, 'REPORT_UNLOCK_CASE_REQUIRED', 'with the missing-report code');
  check.match(noCase.json.error.message, /Choose the report you want to unlock\./, 'and the consumer message names the next step');
  const unknownCase = await service.request('POST', '/api/billing/checkout', { token: once.token, body: { plan_code: 'report_once', case_id: 'case_does_not_exist' } });
  check.equal(unknownCase.status, 404, 'an unknown report is refused');
  check.ok(!/case_does_not_exist/.test(unknownCase.text), 'without echoing the requested id');
  const strangerCheckout = await service.request('POST', '/api/billing/checkout', { token: outsider.token, body: { plan_code: 'report_once', case_id: caseA.case_id } });
  check.equal(strangerCheckout.status, 403, 'another account cannot buy an unlock for a case it does not own');
  check.ok(!/CA-NS|Creditor/.test(strangerCheckout.text), 'and the refusal exposes no detail about that case');

  const partialCase = (await service.request('POST', '/api/cases', { token: once.token, body: { country: 'CA', region: 'CA-NS' } })).json.case;
  await service.request('POST', `/api/cases/${partialCase.case_id}/files`, { token: once.token, body: uploadBody(contradiction(), 'cq-partial.pdf') });
  const notAssessed = await service.request('POST', '/api/billing/checkout', { token: once.token, body: { plan_code: 'report_once', case_id: partialCase.case_id } });
  check.equal(notAssessed.status, 409, 'a report that has not been assessed cannot be bought');
  check.equal(notAssessed.json.error.code, 'REPORT_ASSESSMENT_NOT_COMPLETED', 'with the assessment-not-completed code');
  check.match(notAssessed.json.error.message, /Check your report before buying the full results\./, 'and the consumer message names the next step');

  const alreadyUnlocked = await service.request('POST', '/api/billing/checkout', { token: once.token, body: { plan_code: 'report_once', case_id: caseA.case_id } });
  check.equal(alreadyUnlocked.status, 409, 'an already unlocked report is not sold a second time');
  check.equal(alreadyUnlocked.json.error.code, 'REPORT_ALREADY_UNLOCKED', 'with the already-unlocked code');
  check.match(alreadyUnlocked.json.error.message, /This report is already unlocked\. View your results\./, 'and the consumer message points at the results');
  check.equal(checkouts(), before, 'and none of those refusals reached the provider or created a checkout record');

  const eligible = await service.request('POST', '/api/billing/checkout', { token: once.token, body: { plan_code: 'report_once', case_id: caseB.case_id } });
  check.equal(eligible.status, 201, 'an owned report with a completed assessment starts a checkout');
  const boundRow = (service.service.store.state().checkout_sessions || []).find((row) => row.checkout_id === eligible.json.checkout.checkout_id);
  check.equal(boundRow.case_id, caseB.case_id, 'and the selected case is bound to the checkout record');
  check.equal(boundRow.plan_code, 'report_once', 'with the one-time plan recorded on it');
  check.equal(checkouts(), before + 1, 'with exactly one checkout record created');
  const subscriptionCheckout = await service.request('POST', '/api/billing/checkout', { token: once.token, body: { plan_code: 'monthly' } });
  check.equal(subscriptionCheckout.status, 201, 'subscription checkout is unaffected and needs no case');
  /* ---- 4. Subscription: the full paid flow, including approval and the stale-approval refusal ---- */
  const sub = await service.unpaidAccount('cq-sub@example.test');
  await service.pay(sub, 'monthly');
  const subCase = await uploadAndAssess(service, sub, contradiction(), 'cq-sub.pdf', 'CA-NS');
  const subscriberEvaluation = await service.request('POST', `/api/cases/${subCase.case_id}/evaluate`, { token: sub.token });
  const sView = (await service.request('GET', `/api/cases/${subCase.case_id}`, { token: sub.token })).json.view;
  checkUnlockedEvaluation(check, subscriberEvaluation, sView, 'subscriber report');
  check.ok(subscriberEvaluation.json.result.issues.some((issue) => issue.evidence && issue.source_location),
    'the subscriber POST response retains supported issue evidence and its source location');
  check.equal(sView.assessment_access.complete_assessment, true, 'a subscription opens the complete assessment');
  check.equal(sView.assessment_access.dispute_packet, true, 'and the dispute packet');
  check.equal((await service.request('GET', `/api/cases/${subCase.case_id}/report-download`, { token: sub.token })).status, 200, 'and the assessment download');
  const packet = (await service.request('GET', `/api/cases/${subCase.case_id}/packet`, { token: sub.token })).json.view;
  const issue = (packet.eligible_issues || []).find((i) => i.eligible);
  check.ok(issue, 'the subscriber sees a selectable issue');
  check.equal((await service.request('POST', `/api/cases/${subCase.case_id}/packet/select`, { token: sub.token, body: { issue_ids: [issue.issue_id] } })).status, 200, 'and can select it');
  await service.request('POST', `/api/cases/${subCase.case_id}/packet/correspondence`, { token: sub.token, body: { correspondence: { consumer_name: 'Fictional Tester', contact: 'fictional@example.test' } } });
  await service.preparePostalPacket(sub, subCase.case_id);
  check.equal((await service.request('POST', `/api/cases/${subCase.case_id}/packet/approve`, { token: sub.token })).status, 200, 'and approve the packet');
  check.equal((await service.request('GET', `/api/cases/${subCase.case_id}/packet-download`, { token: sub.token })).status, 200, 'and download it');
  await service.request('POST', `/api/cases/${subCase.case_id}/packet/select`, { token: sub.token, body: { issue_ids: [issue.issue_id] } });
  check.equal((await service.request('GET', `/api/cases/${subCase.case_id}/packet-download`, { token: sub.token })).status, 409, 're-selecting invalidates the approval (stale-approval refusal preserved)');
  check.equal((await service.request('GET', '/api/history', { token: sub.token })).status, 200, 'and the subscriber history is available');

  /* ---- 5. Cross-account isolation on both boundaries ---- */
  const stranger = await service.unpaidAccount('cq-stranger@example.test');
  check.equal((await service.request('GET', `/api/cases/${caseA.case_id}/report-download`, { token: stranger.token })).status, 403, 'another account is refused the unlocked report');
  check.equal((await service.request('GET', `/api/cases/${subCase.case_id}/packet-download`, { token: stranger.token })).status, 403, 'and the subscriber packet');
  check.equal((await service.request('GET', `/api/cases/${caseA.case_id}`, { token: stranger.token })).status, 403, 'and the case itself');
  check.equal((await service.request('POST', `/api/cases/${subCase.case_id}/evaluate`, { token: stranger.token })).status, 403, 'and cannot assess another account\'s report');

  evidence.assessment_post = 'unpaid and other locked reports return only summary, teaser and assessment date; the selected one-time report and subscriber retain the complete consumer assessment';
  evidence.one_time = 'unlocks the selected report and its download only; another report and every subscriber feature stay refused';
  evidence.subscription = 'unlocks the complete assessment, the download, the dispute packet and the history';
  return evidence;
}

module.exports = {
  run,
  id: 'cq-purchase-flow',
  title: 'OWNER-PURCHASE-FLOW-001: assessment before purchase, the free summary and teaser, and the two separate purchase outcomes'
};
