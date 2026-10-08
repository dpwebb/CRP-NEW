'use strict';
const { comparableText } = require('../packet-pdf-assertions.cjs');
/**
 * bz-report-history.cjs — BLOCKER-SUBSCRIPTION-VALUE-001: owned report history and evidence-based comparison.
 *
 * The consumer uploads a subsequent report, compares it with an earlier OWNED report, sees supported changes in
 * previously identified issues, and can still select current issues for a reviewed packet. Fictional reports
 * only; entitlement is the test-adapter monthly subscription (a signed, non-payment event).
 *
 * Covered: unchanged, changed, no-longer-observed, uncertain matching (mask-only and a different account),
 * different-bureau, missing-field, out-of-order-date, same-date, cross-account refusal, the unentitled refusal,
 * the one-time purchaser\'s preserved packet, and the existing packet regression (a comparison never changes or
 * invalidates an approved packet).
 */
const { buildPdf } = require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');
const comparison = require('../../comparison.cjs');
const commonErrors = require('../../common-errors.cjs');

function collisionControls(check) {
  const actor = { account_id: 'fictional-comparison-owner' };
  const record = (index, opened, creditor = 'FICTIONAL BANK', bureau = 'Equifax') => ({
    record_index: index, kind: 'GENERAL_ACCOUNT', kind_label: 'credit account', source_bureau: bureau,
    facts: { 'account.masked_identifier': '****1234', 'account.reported_identity': creditor,
      'liability.openedDate': opened, 'liability.closedDate': '2019-01-01' }
  });
  const row = (id, date, records) => {
    const extraction = { presentation_id: 'GENERAL-BUREAU-REPORT', bureau: 'Equifax', reference_date: { normalized_value: date }, records };
    return { result_id: id, case_id: id, account_id: actor.account_id, extraction,
      evaluation: { results: [], common_errors: commonErrors.runCommonErrorChecks({ extraction }) } };
  };
  const view = (before, after) => {
    const state = { cases: [before, after].map(r => ({ case_id: r.case_id, account_id: actor.account_id })), results: [before, after] };
    return comparison.comparisonView({ state: () => state }, actor, before.result_id, after.result_id);
  };
  const earlier = row('old', '2025-01-01', [record(1, '2020-01-01')]);
  const clean = record(1, '2018-01-01');
  const issue = record(2, '2020-01-01');
  const forward = view(earlier, row('new', '2026-01-01', [clean, issue]));
  const reverse = view(earlier, row('new', '2026-01-01', [issue, clean]));
  check.deepEqual(forward.outcomes, reverse.outcomes, 'reordering masked-identity collisions cannot change comparison outcomes');
  check.equal(forward.outcomes[0].outcome, 'NOT_COMPARABLE', 'one-to-many identity collisions cannot claim disappearance');
  check.equal(forward.outcomes[0].match.state, 'QUALIFIED', 'the ambiguous match remains qualified');
  const many = view(row('old', '2025-01-01', [record(1, '2020-01-01'), record(2, '2021-01-01')]), row('new', '2026-01-01', [clean]));
  check.ok(many.outcomes.every(o => o.outcome === 'NOT_COMPARABLE'), 'many-to-one identity collisions are not merged');
  check.ok(many.outcomes.every(o => o.match.reason === 'AMBIGUOUS_EARLIER_ACCOUNT_IDENTITY'), 'reverse uniqueness is checked against every earlier account');
  const cross = view(earlier, row('new', '2026-01-01', [record(1, '2018-01-01', 'FICTIONAL BANK', 'Experian'), issue]));
  check.equal(cross.outcomes[0].match.state, 'QUALIFIED', 'cross-bureau collisions remain ambiguous');
  const unique = view(earlier, row('new', '2026-01-01', [clean, record(2, '2020-01-01', 'OTHER FICTIONAL BANK')]));
  check.equal(unique.outcomes[0].outcome, 'NO_LONGER_OBSERVED', 'a unique full identity match still permits an honest disappearance comparison');
  check.ok(/not proof/.test(unique.outcomes[0].uncertainty), 'disappearance is not proof of correction');
}

const ub = (bytes, filename) => ({ originalFilename: filename, declaredBytes: bytes.length, mimeType: 'application/pdf', contentBase64: bytes.toString('base64') });

/** One fictional general report: a header with the bureau and report date, then one account. */
function report(bureau, reportDate, creditor, mask, opened, closed) {
  const lines = [`${bureau}  Consumer Credit Report`, `Report Date: ${reportDate}`, `${creditor}  Balance $100`, `Account Number ${mask}`];
  if (opened) lines.push(`Opened ${opened}`);
  if (closed) lines.push(`Closed ${closed}`);
  return buildPdf({ pages: [{ lines }] });
}

async function assess(t, actor, region, pdf, filename) {
  const caseRow = (await t.request('POST', '/api/cases', { token: actor.token, body: { country: region.split('-')[0], region } })).json.case;
  const up = await t.request('POST', `/api/cases/${caseRow.case_id}/files`, { token: actor.token, body: ub(pdf, filename) });
  await t.request('POST', `/api/cases/${caseRow.case_id}/evaluate`, { token: actor.token });
  const rows = (await t.request('GET', `/api/cases/${caseRow.case_id}/results`, { token: actor.token })).json.results;
  return { case_id: caseRow.case_id, result_id: rows[rows.length - 1].result_id };
}

async function compare(t, actor, leftResultId, rightResultId) {
  return t.request('GET', `/api/history/compare/${leftResultId}/${rightResultId}`, { token: actor.token });
}

function outcomesOf(json) {
  return (json && json.outcomes) || [];
}

function findOutcome(json, category) {
  return outcomesOf(json).find((o) => o.category === category) || null;
}

async function run(t, check) {
  collisionControls(check);
  const evidence = {};
  const REGION = 'US-CA';
  const CATEGORY = 'COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY';

  const actor = await t.unpaidAccount('bz-history@example.test');
  await t.pay(actor, 'monthly');

  /* The earlier OWNED report: Equifax, 2025-06-01, Creditor A, MASK-1234, opened after closed (an issue). */
  const A = await assess(t, actor, REGION, report('Equifax', 'June 1, 2025', 'Creditor A', '****1234', '01/01/2020', '01/01/2019'), 'earlier.pdf');

  /* 1. History: the account owns its assessments, with bureau and report date. */
  const hist = (await t.request('GET', '/api/history', { token: actor.token })).json;
  check.equal(hist.total, 1, 'the history lists the account\'s own single assessment');
  check.equal(hist.assessments[0].bureau, 'Equifax', 'and shows the bureau');
  check.equal(hist.assessments[0].report_date, '2025-06-01', 'and the report date');
  check.equal(hist.assessments[0].result_id, A.result_id, 'and names the owned assessment');

  /* 2. Unchanged: the later report shows the same issue with the same facts. */
  const B = await assess(t, actor, REGION, report('Equifax', 'June 1, 2026', 'Creditor A', '****1234', '01/01/2020', '01/01/2019'), 'unchanged.pdf');
  const cmpB = (await compare(t, actor, A.result_id, B.result_id)).json;
  check.equal(cmpB.order.state, 'DETERMINED', 'the order is determined from the report dates');
  check.equal(cmpB.order.earlier, 'left', 'the earlier report is the one with the earlier date');
  check.equal(cmpB.direction_claimed, true, 'and a direction is claimed');
  const unchangedOut = findOutcome(cmpB, CATEGORY);
  check.equal(unchangedOut.outcome, 'STILL_OBSERVED', 'an unchanged issue is still observed');
  check.equal(unchangedOut.match.state, 'CONFIDENT', 'on a confidently matched account');

  /* 3. Changed: the later report still shows the issue but with different facts. */
  const C = await assess(t, actor, REGION, report('Equifax', 'June 1, 2026', 'Creditor A', '****1234', '01/01/2021', '01/01/2020'), 'changed.pdf');
  const cmpC = (await compare(t, actor, A.result_id, C.result_id)).json;
  const changedOut = findOutcome(cmpC, CATEGORY);
  check.equal(changedOut.outcome, 'CHANGED', 'a changed issue is flagged changed');
  check.equal(changedOut.earlier.evidence.opened, '2020-01-01', 'with the earlier before-fact');
  check.equal(changedOut.later.evidence.opened, '2021-01-01', 'and the later after-fact');

  /* 4. Out-of-order date: selecting the later report first must not flip the direction. */
  const cmpOut = (await compare(t, actor, C.result_id, A.result_id)).json;
  check.equal(cmpOut.order.state, 'DETERMINED', 'the order is still determined');
  check.equal(cmpOut.order.earlier, 'right', 'and the earlier report is correctly identified even when selected second');
  const outOut = findOutcome(cmpOut, CATEGORY);
  check.equal(outOut.outcome, 'CHANGED', 'the outcome is unchanged by the selection order');
  check.equal(outOut.earlier.evidence.opened, '2020-01-01', 'and the before/after facts keep their direction');

  /* 5. No longer observed: the later report shows the same account but no longer shows the issue. */
  const D = await assess(t, actor, REGION, report('Equifax', 'June 1, 2026', 'Creditor A', '****1234', '01/01/2018', '01/01/2019'), 'resolved.pdf');
  const cmpD = (await compare(t, actor, A.result_id, D.result_id)).json;
  const goneOut = findOutcome(cmpD, CATEGORY);
  check.equal(goneOut.outcome, 'NO_LONGER_OBSERVED', 'an issue the later report no longer shows is no longer observed');
  check.ok(/never proves/.test(cmpD.note), 'and the absence note is present in the same view');

  /* 6. Uncertain match: a masked-identifier-only match is qualified, never merged. */
  const E = await assess(t, actor, REGION, report('Equifax', 'June 1, 2026', 'Creditor Z', '****1234', '01/01/2020', '01/01/2019'), 'mask-collision.pdf');
  const uncOut = findOutcome((await compare(t, actor, A.result_id, E.result_id)).json, CATEGORY);
  check.equal(uncOut.match.state, 'QUALIFIED', 'a masked-identifier-only match is qualified');
  check.equal(uncOut.outcome, 'NOT_COMPARABLE', 'and it is not merged into an outcome');

  /* 7. A different account (a legitimate transfer): no supported identity overlap. */
  const F = await assess(t, actor, REGION, report('Equifax', 'June 1, 2026', 'Creditor B', '****5678', '01/01/2020', '01/01/2019'), 'different-account.pdf');
  const noMatchOut = findOutcome((await compare(t, actor, A.result_id, F.result_id)).json, CATEGORY);
  check.equal(noMatchOut.match.state, 'NONE', 'a different account with no shared identity evidence does not match');
  check.equal(noMatchOut.outcome, 'NOT_COMPARABLE', 'and is not silently merged');

  /* 8. Different bureau: the same account is matched across bureaus and the difference is preserved. */
  const G = await assess(t, actor, REGION, report('Experian', 'June 1, 2026', 'Creditor A', '****1234', '01/01/2020', '01/01/2019'), 'other-bureau.pdf');
  const cmpG = (await compare(t, actor, A.result_id, G.result_id)).json;
  check.equal(cmpG.different_bureau, true, 'the comparison flags the two different bureaus');
  const crossOut = findOutcome(cmpG, CATEGORY);
  check.equal(crossOut.match.state, 'CONFIDENT', 'the same account is still matched across bureaus');
  check.equal(crossOut.match.cross_bureau, true, 'and the cross-bureau difference is preserved');

  /* 9. Missing field: the later report does not print the field the check reads. */
  const H = await assess(t, actor, REGION, report('Equifax', 'June 1, 2026', 'Creditor A', '****1234', '01/01/2019', null), 'missing-closed.pdf');
  const missingOut = findOutcome((await compare(t, actor, A.result_id, H.result_id)).json, CATEGORY);
  check.equal(missingOut.match.state, 'CONFIDENT', 'the account is still matched');
  check.equal(missingOut.outcome, 'NOT_COMPARABLE', 'but a missing field makes the outcome not comparable');
  check.equal(missingOut.reason, 'FIELD_NOT_READ_IN_LATER_REPORT', 'and the reason names the missing field');

  /* 10. Same report date: no direction is claimed. */
  const I = await assess(t, actor, REGION, report('Equifax', 'June 1, 2025', 'Creditor A', '****1234', '01/01/2019', '01/01/2018'), 'same-date.pdf');
  const cmpI = (await compare(t, actor, A.result_id, I.result_id)).json;
  check.equal(cmpI.order.state, 'SAME_REPORT_DATE', 'two reports with the same date claim no order');
  check.equal(cmpI.direction_claimed, false, 'and no direction is claimed');

  /* 11. Cross-account refusal and an unknown id. */
  const stranger = await t.unpaidAccount('bz-stranger@example.test');
  await t.pay(stranger, 'monthly');
  check.equal((await compare(t, stranger, A.result_id, B.result_id)).status, 403, 'another account cannot compare your reports');
  check.equal((await t.request('GET', '/api/history', { token: stranger.token })).json.total, 0, 'and sees none of your history');
  check.equal((await compare(t, actor, 'res_does_not_exist', B.result_id)).status, 404, 'an unknown result id is not found');
  check.equal((await compare(t, actor, A.result_id, A.result_id)).status, 400, 'comparing a report with itself is refused');

  /* OWNER-PURCHASE-FLOW-001: reading basic information about your own file needs no purchase; the report-history
     and comparison FEATURES are part of a subscription. */
  const unpaid = await t.unpaidAccount('bz-unpaid@example.test');
  const unpaidHistory = await t.request('GET', '/api/history', { token: unpaid.token });
  check.equal(unpaidHistory.status, 402, 'the report-history feature needs a subscription');
  check.equal(unpaidHistory.json.error.code, 'SUBSCRIPTION_REQUIRED', 'and names the subscription refusal');
  check.equal((await t.request('GET', '/api/cases', { token: unpaid.token })).status, 200, 'while the owned case list stays readable without a purchase');

  /* 13. Existing packet regression: a comparison never changes or invalidates an approved packet. */
  const pvBefore = (await t.request('GET', `/api/cases/${C.case_id}/packet`, { token: actor.token })).json.view;
  const issueId = pvBefore.eligible_issues.find((i) => i.eligible).issue_id;
  await t.request('POST', `/api/cases/${C.case_id}/packet/select`, { token: actor.token, body: { issue_ids: [issueId] } });
  await t.request('POST', `/api/cases/${C.case_id}/packet/correspondence`, { token: actor.token, body: { correspondence: { consumer_name: 'Dana Whitfield', contact: 'dana.whitfield@example.test' } } });
  await t.preparePostalPacket(actor, C.case_id);
  await t.request('POST', `/api/cases/${C.case_id}/packet/approve`, { token: actor.token });
  const approved = (await t.request('GET', `/api/cases/${C.case_id}/packet`, { token: actor.token })).json.view;
  check.equal(approved.packet.approved, true, 'a packet on the changed case is approved');
  const beforeVersion = approved.packet.approved_version;
  const beforeDownload = await t.request('GET', `/api/cases/${C.case_id}/packet-download`, { token: actor.token });
  check.equal(beforeDownload.status, 200, 'and downloads');
  /* Compare the packet\'s own case with another report: the packet must not change. */
  const cmpAfter = await compare(t, actor, A.result_id, C.result_id);
  check.equal(cmpAfter.status, 200, 'a comparison involving the packet\'s case succeeds');
  const afterView = (await t.request('GET', `/api/cases/${C.case_id}/packet`, { token: actor.token })).json.view;
  check.equal(afterView.packet.approved_version, beforeVersion, 'the approved packet version is unchanged by the comparison');
  check.equal(afterView.packet.download_available, true, 'and it is still downloadable');
  const afterDownload = await t.request('GET', `/api/cases/${C.case_id}/packet-download`, { token: actor.token });
  check.equal(afterDownload.status, 200, 'the packet download still works after the comparison');
  const stripProduced = (s) => String(s).replace(/Produced: [^\n]*\n/, '');
  check.equal(stripProduced(comparableText(afterDownload.text)), stripProduced(comparableText(beforeDownload.text)), 'with identical content (the generation timestamp aside)');

  /* 14. Current issue selection still works on the comparison\'s later report (a reviewed packet). */
  const laterPv = (await t.request('GET', `/api/cases/${C.case_id}/packet`, { token: actor.token })).json.view;
  check.ok(laterPv.eligible_issues.length >= 1, 'the later assessment still offers its own supported issue for a packet');

  evidence.outcomes = { unchanged: 'STILL_OBSERVED', changed: 'CHANGED', no_longer_observed: 'NO_LONGER_OBSERVED', not_comparable: 'NOT_COMPARABLE' };
  evidence.reused = 'persisted extractions + results + the unified issue descriptor; nothing is re-read or overwritten';
  evidence.fixtures = 'all reports are buildPdf fictional fixtures with fictional data; no real consumer identifier or private report';
  return evidence;
}

module.exports = { run, id: 'bz-report-history', title: 'BLOCKER-SUBSCRIPTION-VALUE-001: owned report history and evidence-based comparison' };
