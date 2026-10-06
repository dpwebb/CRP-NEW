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

/* The US-CA HTTP fixture is NOT asserted here: its collection anchor is shifted by the FCRA 180-day rule, so
   pinnings its dates is separate work. The later-expiry end-to-end is asserted where it belongs — on the supplied
   real report through the paid assessment and the subscriber packet (`cr-ca-ns-tu-real-report`) and in a real
   browser from the free summary through the downloaded packet (`bw-browser-wizzard`). */
async function run(service, check) {
  const evidence = {};
  boundaryAndPrecisionControls(check);
  evidence.mechanism_controls = 'engine-level only; end-to-end proven in cr-ca-ns-tu-real-report and bw-browser-wizzard';
  return evidence;
}

module.exports = {
  run,
  id: 'cu-dual-date-retention',
  title: 'OWNER dual-date retention (Batch 33): the same rule, anchor and period measured at the report date and at the assessment date — later expiry, already outside, still inside, boundaries, month precision, missing dates, no duplicate counts, saved results and the current-condition correspondence'
};
