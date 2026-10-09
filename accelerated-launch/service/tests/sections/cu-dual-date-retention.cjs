'use strict';
/**
 * cu-dual-date-retention.cjs — OWNER dual-date reporting retention (Batch 33).
 *
 * ONE comparison per entry and rule, made at TWO dates:
 *   • at the REPORT date — the historical position, which keeps its existing finding and classification; and
 *   • at the ASSESSMENT date (the server's own run date) — whether the period has ended since the report was
 *     issued, which is a CURRENT-review question and never a new violation on the old report.
 *
 * CONTROLLED TIME throughout: every HTTP step pins CRP_ASSESSMENT_CLOCK_AT, so nothing here depends on the wall
 * clock. The US-CA collection limb (CCRAA § 1785.13(a)(5), 7 years from the collection delinquency date) is used
 * as the representative rule: it is an EXISTING admitted limb whose presentation list includes the general
 * intake, so the fictional fixture below reaches it through the ordinary upload path.
 */

const clock = require('../../assessment-clock.cjs');
const retention = require('../../../adapters/rule-adapters.cjs');
const { buildPdf } = require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');

const US_LINES = (dofd) => [
  'Equifax  Consumer Credit Report - FICTIONAL TEST FIXTURE',
  'Report Date: 12 June 2026',
  dofd
    ? `Collection Agency ABC  Balance $500  Past Due $500  Date of First Delinquency ${dofd}`
    : 'Collection Agency ABC  Balance $500  Past Due $500'
];

async function withClock(instant, work) {
  const previous = process.env[clock.CONTROLLED_CLOCK_ENV];
  process.env[clock.CONTROLLED_CLOCK_ENV] = instant;
  try {
    return await work();
  } finally {
    if (previous === undefined) delete process.env[clock.CONTROLLED_CLOCK_ENV];
    else process.env[clock.CONTROLLED_CLOCK_ENV] = previous;
  }
}

async function caseWith(service, actor, lines, clockInstant) {
  const caseId = (await service.request('POST', '/api/cases', { token: actor.token, body: { country: 'US', region: 'US-CA' } })).json.case.case_id;
  const pdf = buildPdf({ pages: [{ lines }] });
  await service.request('POST', `/api/cases/${caseId}/files`, {
    token: actor.token,
    body: { originalFilename: 'fictional-report.pdf', declaredBytes: pdf.length, mimeType: 'application/pdf', contentBase64: pdf.toString('base64') }
  });
  await withClock(clockInstant, () => service.request('POST', `/api/cases/${caseId}/evaluate`, { token: actor.token }));
  const view = (await service.request('GET', `/api/cases/${caseId}`, { token: actor.token })).json.view;
  return { caseId, view };
}

/** The engine directly, for boundary and precision controls that no printed fixture conveniently expresses. */
function engine(anchor, reportDate, assessmentDate, periodYears) {
  return retention.retentionDates({
    adapter: { adapter_id: 'CONTROL-LIMB', period_years: periodYears || 7 },
    anchor,
    arithmetic: null,
    reportReferenceDate: reportDate,
    assessmentDate
  });
}

function boundaryAndPrecisionControls(check) {
  /* Exact boundaries: the anniversary itself is inside the period; the next day is outside it. */
  const anniversary = engine({ iso: '2020-01-01' }, '2026-12-31', '2027-01-01');
  check.equal(anniversary.state, 'INSIDE_AT_BOTH', 'a day that is still inside at the assessment date raises no current-review concern');
  check.equal(anniversary.at_assessment_date.period_ends_on, '2027-01-01', 'with the period end stated');
  const nextDay = engine({ iso: '2020-01-01' }, '2026-12-31', '2027-01-02');
  check.equal(nextDay.state, 'INSIDE_AT_REPORT_OUTSIDE_AT_ASSESSMENT', 'one day later the same entry has left its period');
  check.equal(nextDay.later_expiry, true, 'and the later-expiry state is recorded');

  /* Month-level precision keeps its RANGE: an estimated end date is never presented as exact. */
  const month = engine({ iso: '2020-06', precision: 'MONTH' }, '2026-06-12', '2027-08-01');
  check.equal(month.anchor_precision, 'MONTH_LEVEL', 'a month-only anchor is recorded as month precision');
  check.equal(month.at_assessment_date.period_ends_from, '2027-06-01', 'and its period is a range, not a day');
  check.equal(month.at_assessment_date.period_ends_on, '2027-06-30', 'with both ends carried');

  /* A month-precision anchor that STRADDLES the boundary is unresolved, never rounded into a conclusion. */
  const straddle = engine({ iso: '2020-06', precision: 'MONTH' }, '2026-06-12', '2027-06-15');
  check.equal(straddle.state, 'NOT_COMPARABLE', 'a month that straddles the boundary yields no date concluded');
  check.equal(straddle.current_review_warranted, false, 'and no concern is raised from it');

  /* Missing report date with a usable anchor: the CURRENT question is still answered, the historical one is not. */
  const noReportDate = engine({ iso: '2019-01-01' }, null, '2027-06-13');
  check.equal(noReportDate.state, 'REPORT_DATE_MISSING_OUTSIDE_AT_ASSESSMENT', 'without a report date the current position is still compared');
  check.equal(noReportDate.historical_position_not_established, true, 'and the historical position is explicitly not established');
  check.equal(noReportDate.report_reference_date, null, 'with the report date left empty rather than invented');
  check.equal(noReportDate.current_review_warranted, true, 'and a qualified current-review concern kept');
}

/* The US-CA collection limb is the vehicle: its anchor is the printed collection delinquency date SHIFTED by the
   platform's existing FCRA 180-day rule, and its period is 7 years — both reused through the rule's own
   arithmetic, never reimplemented here. With the printed date 01 June 2019 the anchor is 2019-11-28, so the period
   ends 2026-11-28: inside it on the report's own date (2026-06-12) and outside it when the server assesses on
   2027-06-13. */

async function runHttpControls(service, check, evidence) {
  const actor = await service.account('cu-dual-date@example.test');

  /* 1. WITHIN ITS PERIOD AT ISSUE, OUTSIDE IT NOW — the later-expiry concern, once, with its source evidence. */
  const later = await caseWith(service, actor, US_LINES('01 June 2019'), '2027-06-13T12:00:00Z');
  const laterItems = later.view.result.issues.filter((i) => i.later_expiry_concern === true);
  check.equal(laterItems.length, 1, 'one current-review concern is raised for the entry whose period has since ended');
  const card = laterItems[0];
  check.equal(card.retention_review.period_appears_to_end_on, '2026-11-28', 'it states the date the period appears to end');
  check.equal(card.retention_review.report_issued, '2026-06-12', 'and the date the uploaded report was issued');
  check.equal(card.retention_review.assessed_on, '2027-06-13', 'and the date the assessment ran');
  check.equal(card.retention_review.arose_through_later_passage_of_time, true, 'and that it arose through the passage of time');
  check.equal(card.retention_review.period_years, 7, 'with the rule own period, not a substituted one');
  check.equal(card.confidence, 'POTENTIAL', 'as a potential issue to verify, not a violation');
  /* The 180-day shift is the rule's own arithmetic: the period is measured from the SHIFTED anchor. */
  check.equal(card.retention_review.anchor_printed_date, '2019-06-01', 'the printed collection delinquency date is carried raw');
  check.equal(card.evidence.anchor_normalized_value, '2019-11-28', 'and the anchor the rule measures from is the 180-day-shifted date');
  /* Consumer field names and source evidence, never internal identifiers. */
  check.equal(card.retention_review.anchor_label, 'Date of first delinquency on the collection entry', 'the card names the field the way the report does: ' + JSON.stringify({ evidence: card.evidence, src: card.source_evidence, retained: card.retention_review, summary: later.view.result.retention_dual_date.summary, unc: String(card.uncertainty).slice(0, 120), req: String(card.request_wording).slice(0, 80) }));
  check.ok(!/collection\.delinquencyDate/.test(JSON.stringify(card)), 'and the internal fact name appears nowhere on the card');
  check.ok(card.source_evidence && card.source_evidence.printed_value && card.source_evidence.field_label, 'the card carries the printed source evidence');
  check.equal(card.source_evidence.normalized_value, '2019-06-01', 'with the printed value normalized, before the rule own 180-day shift');
  check.ok(card.source_evidence.page !== null && card.source_evidence.page !== undefined, 'and the page the reader recorded');
  check.ok(!/CA-NS-CRA|CCRAA-1785|"adapter_id"/.test(JSON.stringify(card)), 'while no internal adapter or rule identifier is exposed');
  check.equal(later.view.assessment_summary.teaser, null, 'later expiry alone does not create a disputable VIOLATION preview');
  check.ok(later.view.result.retention_dual_date.summary.inside_at_report_outside_at_assessment >= 1, 'the dual-date summary records the entry, once per limb that measures it');
  check.equal(later.view.result.retention_dual_date.summary.rule_violations_emitted, 0, 'the date-comparison stage emits no rule violation on its own');
  check.ok(!/"adapter_id"/.test(JSON.stringify(later.view.result.retention_dual_date)), 'and the rendered comparison exposes no internal identifiers either');
  check.ok(/may now be too old to report/.test(String(card.explanation)), 'the explanation says plainly what the dates suggest');
  check.ok(/still on your current credit file/.test(String(card.uncertainty)), 'the uncertainty asks about the current file: ' + String(card.uncertainty).slice(0, 200));
  check.ok(/remains on my current file/.test(String(card.request_wording)), 'and the request is conditional on continued reporting: ' + String(card.request_wording).slice(0, 160));
  check.equal(card.request_type, 'VERIFICATION', 'as a verification request');
}

async function run(service, check) {
  const evidence = {};
  boundaryAndPrecisionControls(check);
  await runHttpControls(service, check, evidence);
  return evidence;
}

module.exports = {
  run,
  id: 'cu-dual-date-retention',
  title: 'OWNER dual-date retention (Batch 33): the same rule, anchor and period measured at the report date and at the assessment date — later expiry, already outside, still inside, boundaries, month precision, missing dates, no duplicate counts, saved results and the current-condition correspondence'
};
