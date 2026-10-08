'use strict';

const limitation = require('../../limitation-assessment.cjs');
const params = limitation.parametersFor('CA-NS');
const clock = { assessment_date: '2026-10-08', assessment_run_at: '2026-10-08T18:00:00Z', report_reference_date: '2026-05-05' };
function record(kind = 'COLLECTION_ACCOUNT', overrides = {}) {
  const facts = { 'account.balance': 606, 'tradeline.firstDelinquencyDate': '2021-02-01',
    'tradeline.lastPaymentDate': '2021-02-01', 'collection.assignedDate': '2026-10-01', ...overrides };
  const captions = { 'account.balance': 'Balance', 'tradeline.firstDelinquencyDate': 'First Delinquency',
    'tradeline.lastPaymentDate': 'Last Payment Date', 'collection.assignedDate': 'Date Assigned' };
  const fact_sources = Object.fromEntries(Object.entries(facts).map(([field, value], index) => [field,
    { raw_value: String(value), normalized_value: value, source_field: captions[field] || field,
      location: { page: 16, line: index + 5, trusted: true }, record_index: 1, caption_count: 1 }]));
  return { record_index: 1, kind, status: 'RESOLVED', facts, fact_sources, location: { page: 16, line: 4, trusted: true } };
}
async function run(t, check) {
  for (const kind of ['COLLECTION_ACCOUNT', 'GENERAL_COLLECTION']) {
    const result = limitation.assessRecord(record(kind), params, clock);
    check.equal(result.withheld, false, 'an explicit sourced positive collection can be screened for a court claim');
    check.equal(result.start_date.iso, '2021-02-01', 'later assignment does not become a new start date');
    check.equal(result.period_ends, '2023-02-01', 'the screening deadline uses the fixed debt date');
    check.equal(result.outcome, 'MAY_BE_OUTSIDE_THE_LIMITATION_PERIOD', 'the report supports a qualified court-time question');
    check.ok(result.start_date.location.page === 16, 'the fixed date retains its own report location');
    check.equal(result.other_printed_dates.find(d => d.label === 'Date Assigned')?.role,
      'COLLECTION_ACTIVITY_NOT_A_RESTART', 'assignment is retained only as collection activity');
    check.match(result.not_a_reporting_requirement, /not by itself a reason a credit bureau must remove/, 'court screening does not invent a reporting deletion rule');
  }
  const noFixed = record(); delete noFixed.facts['tradeline.lastPaymentDate']; delete noFixed.facts['tradeline.firstDelinquencyDate'];
  check.equal(limitation.assessRecord(noFixed, params, clock).reason, 'NO_PRINTED_START_DATE', 'assignment alone cannot start the court screen');
  const unresolved = record(); unresolved.fact_sources['tradeline.lastPaymentDate'].location.trusted = false;
  unresolved.fact_sources['tradeline.firstDelinquencyDate'].caption_count = 2;
  check.equal(limitation.assessRecord(unresolved, params, clock).reason, 'NO_PRINTED_START_DATE', 'untrusted or duplicated fixed dates are not used');
  check.equal(limitation.assessRecord(record('COLLECTION_ACCOUNT', { 'account.balance': 0 }), params, clock).reason,
    'NO_PRINTED_OUTSTANDING_CLAIM', 'zero current balance alone does not imply an outstanding collection claim');
  const untrusted = record(); untrusted.location.trusted = false;
  check.equal(limitation.assessRecord(untrusted, params, clock).reason, 'NO_PRINTED_OUTSTANDING_CLAIM', 'untrusted collection heading cannot supply the claim indicator');
  const rejected = record(); rejected.fact_sources['collection.entryContext'] = null;
  check.equal(limitation.assessRecord(rejected, params, clock).reason, 'NO_PRINTED_OUTSTANDING_CLAIM', 'an explicitly rejected collection context is not treated as absent');
  rejected.facts['account.status'] = 'COLLECTION';
  check.equal(limitation.assessRecord(rejected, params, clock).reason, 'NO_PRINTED_OUTSTANDING_CLAIM', 'status or later assignment cannot resurrect rejected collection context');
  const ordinary = record('CONSUMER_CREDIT_LIABILITY');
  check.equal(limitation.assessRecord(ordinary, params, clock).reason, 'NO_PRINTED_OUTSTANDING_CLAIM', 'a positive ordinary balance is not relabelled as a collection');
  const recent = record('GENERAL_COLLECTION', { 'tradeline.lastPaymentDate': '2026-01-01' });
  check.equal(limitation.assessRecord(recent, params, clock).outcome, 'WITHIN_THE_PERIOD', 'a later actual payment retains its distinct screening effect');
  check.match(params.uncertainty_since_report, /signed written admission made before the court deadline expired/, 'Nova Scotia restarts keep the before-expiry and signature conditions');
  check.match(params.uncertainty_since_report, /sale or transfer.*does not restart/, 'transfers do not restart the court period');
  return { inputs: 'fictional source-linked collection entries', outcome: 'two-year court screening without assignment-date restart',
    boundaries: 'qualified verification only; six-year reporting rule and jurisdiction parameters unchanged' };
}
module.exports = { id: 'el-collection-court-period', title: 'Collection court-claim screening uses fixed debt dates and preserves assignment context', run };
