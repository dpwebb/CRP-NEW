'use strict';
const { determiningAnchor, governsAccountPeriod } = require('../../../adapters/reporting-period-anchor.cjs');
const adapters = require('../../../adapters/rule-adapters.cjs');
const { resolveApplicability } = require('../../applicability.cjs');

async function run(service, check) {
  const first = 'tradeline.firstDelinquencyDate', payment = 'tradeline.lastPaymentDate';
  const facts = { [first]: '2019-03-04', [payment]: '2012-08-21' };
  const source = (field, value) => ({ source_field: field, raw_value: value, normalized_value: value,
    record_index: 1, location: { file_id: 'fictional-report', page: 1, line: 3 }, status: 'RESOLVED' });
  const sources = { [first]: source(first, facts[first]), [payment]: source(payment, facts[payment]) };
  check.equal(determiningAnchor(facts, sources).field, first, 'first delinquency takes priority over an older last payment');
  const fallback = determiningAnchor({ [payment]: facts[payment] }, { [payment]: sources[payment] });
  check.equal(fallback.field, payment, 'last payment determines the period when first delinquency is absent');
  check.equal(fallback.selection_rule, 'DETERMINING_FALLBACK_DATE', 'fallback is identified as a determining date');
  check.ok(!/CRP rule/.test(fallback.date_label), 'fallback is not named a separate CRP rule');
  check.equal(determiningAnchor(facts, { ...sources, [first]: { ...sources[first], trusted: false } }).field, payment,
    'an unreadable first-delinquency reading uses the sourced fallback');
  check.equal(determiningAnchor(facts, { ...sources, [first]: { ...sources[first], caption_count: 2 } }).field, payment,
    'duplicate first-delinquency readings do not decide the date');
  check.equal(determiningAnchor({ [payment]: facts[payment] }, { [payment]: { ...sources[payment], trusted: false } }), null,
    'an untrusted payment date is never promoted');
  check.equal(determiningAnchor(facts, sources, null, { record_index: 2 }), null, 'dates cannot be borrowed from another entry');
  check.equal(determiningAnchor(facts, sources, null, { source_file_id: 'another-report' }), null, 'dates cannot be borrowed from another file');
  check.equal(determiningAnchor({ [first]: '2019-03', [payment]: facts[payment] }).precision, 'MONTH',
    'determinate month precision is preserved without inventing a day');
  check.equal(facts[first], '2019-03-04', 'original delinquency fact remains unchanged');
  const ns = adapters.ADAPTERS.find(row => row.adapter_id === 'CA-NS-CRA-S10-3-C-LIMB-1');
  check.ok(governsAccountPeriod(ns), 'shared policy governs the existing tradeline period');
  check.equal(governsAccountPeriod({ period_years: 2, anchor_field: 'liability.closedDate' }), false,
    'an independently defined closure clock is preserved');
  check.equal(governsAccountPeriod({ period_years: 5, anchor_field: 'overdue.originalListingDate' }), false,
    'an independently defined listing clock is preserved');
  for (const [id, field] of [['AU-PRIVACY-ACT-1988-S20W-ITEM1-LIABILITY-2Y', 'liability.closedDate'],
    ['AU-PRIVACY-ACT-1988-S20W-ITEM4-DEFAULT-5Y', 'overdue.originalListingDate']]) {
    const eventFacts = { [field]: '2025-01-01', [payment]: '2010-01-01' };
    const eventSources = Object.fromEntries(Object.entries(eventFacts).map(([key, value]) => [key, source(key, value)]));
    const compared = adapters.runAdapter(id, { country: 'AU', region: 'AU-NSW', presentation: 'GENERAL-BUREAU-REPORT',
      facts: eventFacts, fact_sources: eventSources, referenceDate: '2026-10-11', assessmentDate: '2026-10-11' });
    check.equal(compared.anchor.field, field, 'last payment does not replace a resolved independent starting event');
    check.equal(compared.outcome, 'PERIOD_NOT_EXCEEDED', 'a recent closure/listing does not become an unsupported expired-period concern');
  }
  const rules = adapters.ADAPTERS.filter(row => governsAccountPeriod(row)
    && row.applicability_rule === 'ADVERSE_DEBT_EVIDENCE_ON_THIS_RECORD');
  for (const candidate of rules) {
    const applicability = resolveApplicability(candidate, null, { kind: candidate.record_kinds[0], facts: {}, printed: {} });
    check.equal(applicability.applicability, 'APPLICABLE', 'paid entries are not excluded by adverse classification');
    check.equal(applicability.evidence.status_classification_used, false, 'no favorable/adverse classification is used');
  }
  const request = { country: 'CA', region: 'CA-NS', presentation: 'GENERAL-BUREAU-REPORT',
    facts, fact_sources: sources, referenceDate: '2026-10-11', assessmentDate: '2026-10-11' };
  const result = adapters.runAdapter(ns.adapter_id, request);
  check.equal(result.anchor.field, first, 'engine uses first delinquency ahead of last payment');
  check.equal(result.arithmetic.period_years, ns.period_years, 'configured numerical period remains intact');
  const fallbackResult = adapters.runAdapter(ns.adapter_id, { ...request,
    facts: { [payment]: facts[payment] }, fact_sources: { [payment]: sources[payment] } });
  check.equal(fallbackResult.anchor.selection_rule, 'DETERMINING_FALLBACK_DATE', 'engine records determining fallback selection');
  check.equal(fallbackResult.retention_dates.determining_fallback_date, true, 'both-date comparison retains fallback provenance');
  check.equal(fallbackResult.outcome, 'PERIOD_EXCEEDED', 'old sourced payment date is compared instead of silently skipped');
  const rejectedPayment = adapters.runAdapter(ns.adapter_id, { ...request,
    facts: { [payment]: facts[payment] }, fact_sources: { [payment]: { ...sources[payment], trusted: false } } });
  check.equal(rejectedPayment.state, 'UNRESOLVED', 'engine cannot fall through to an explicitly rejected payment date');
  check.ok(!rejectedPayment.finding, 'an explicitly rejected fallback cannot become a violation');
  const formats = require('../../formats.cjs');
  const { makeSyntheticModel } = require('../../../../internal-validation/ca-ns-last-payment-six-year/document-model.cjs');
  const { evaluateCase } = require('../../evaluation.cjs');
  const issueApi = require('../../issues.cjs');
  const assess = (line, country = 'CA', region = 'CA-NS') => {
    const extraction = formats.extractWithSharedAdapter(makeSyntheticModel({ pages: [[
      'Equifax Consumer Credit Report - FICTIONAL TEST FIXTURE', 'Report Date: 11 October 2026', line
    ]] }), { mode: 'REPORT', country });
    const evaluation = evaluateCase({ country, region, extraction });
    return { extraction, evaluation, issues: issueApi.issuesFor({ evaluation, extraction }) };
  };
  const paid = assess('Account Fictional Bank Balance 0 Past Due 0 Last Payment Date 21 August 2012');
  const paidIssue = paid.issues.find(issue => issue.adapter_id === ns.adapter_id);
  check.equal(paidIssue.classification, 'VIOLATION', 'a paid account beyond its applicable period remains a violation');
  check.equal(paidIssue.eligible, true, 'the sourced period issue is selectable for the existing packet flow');
  check.ok(/determining fallback date/.test(paidIssue.request_wording), 'packet request identifies the determining fallback date');
  const publicIssue = issueApi.publicIssue(paidIssue);
  check.equal(publicIssue.determining_date.fallback, true, 'consumer projection retains the fallback identity');
  check.equal(publicIssue.determining_date.location.page, 1, 'the consumer determining date retains its source page');
  check.ok(!/CRP rule/.test(JSON.stringify(publicIssue)), 'consumer output does not call the fallback a CRP rule');
  const recent = assess('Account Fictional Bank Balance 0 Past Due 0 Last Payment Date 21 August 2025');
  check.ok(!recent.issues.some(issue => issue.adapter_id === ns.adapter_id), 'an entry inside its applicable period is not a violation');
  const knownFirst = assess('Account Fictional Bank Balance 0 Past Due 0 Last Payment Date 21 August 2012 First Delinquency Date 01 January 2025');
  check.equal(knownFirst.evaluation.results.find(row => row.machine.adapter_id === ns.adapter_id).machine.anchor.iso,
    '2025-01-01', 'reader-to-evaluator flow gives a determinable first delinquency priority');
  check.ok(!knownFirst.issues.some(issue => issue.adapter_id === ns.adapter_id), 'an older payment does not override a determinable first delinquency');
  const usPaid = assess('Account Fictional Bank Balance 0 Past Due 0 Last Payment Date 21 August 2012', 'US', 'US-NY');
  const usIssue = usPaid.issues.find(issue => issue.adapter_id === 'FCRA-605A-5-US-NATIONAL-7Y');
  check.ok(usIssue, 'ordinary US accounts with determining dates reach the period check without an adverse marker');
  check.equal(issuesLabel(usIssue), 'VIOLATION', 'the qualified expired-period result keeps the single consumer violation term');
  check.equal(usIssue.eligible, true, 'the qualified US fallback supports consumer-selected verification correspondence');
  function issuesLabel(issue) { return issueApi.consumerLabel(issue); }
  const published = require('../../published-reporting-periods.cjs');
  const fictionalRecord = (index, paymentDate) => ({ record_index: index, kind: 'TU_CA_TRADELINE', status: 'RESOLVED',
    source_file_id: 'fictional-report', facts: { [payment]: paymentDate },
    fact_sources: { [payment]: { ...source(payment, paymentDate), record_index: index } },
    report_reference_date: { raw_value: '10 January 2026', normalized_value: '2026-01-10',
      location: { file_id: 'fictional-report', page: 1, line: 1 } } });
  const fictional = { presentation_id: 'FAM-TU-CA-CONSUMER', extraction_ran: true, demonstration: false,
    records: [fictionalRecord(1, '2013-10-03'), fictionalRecord(2, '2020-08-09'), fictionalRecord(3, '2012-08-21')] };
  const periodRows = published.compare({ country: 'CA', region: 'CA-NT', extraction: fictional, assessmentDate: '2026-10-11' });
  check.equal(periodRows.length, 3, 'all own date-bearing entries receive a published-period comparison');
  check.equal(periodRows[0].periods.map(row => row.years).join(','), '6,20', 'six and twenty years remain distinct numerical periods');
  check.equal(periodRows[0].periods[1].outside_at_assessment, false, 'a thirteen-year entry is not beyond twenty years');
  check.equal(periodRows[1].periods[0].outside_at_report, false, 'six years had not ended on the earlier report date');
  check.equal(periodRows[1].periods[0].outside_at_assessment, true, 'six years ended before the current assessment');
  check.ok(periodRows.every(row => row.status_classification_used === false), 'published-period review assigns no favorable or adverse classification');
  check.equal(published.compare({ country: 'US', extraction: fictional, assessmentDate: '2026-10-11' }).length, 0,
    'a Canadian bureau publication cannot become a US period');
  const periodIssues = issueApi.issuesFor({ extraction: fictional, evaluation: { results: [], published_reporting_periods: periodRows } });
  check.equal(periodIssues.length, 3, 'expired possible periods reach the selectable verification path');
  check.ok(periodIssues.every(issue => issue.eligible), 'qualified period comparisons support selection');
  check.deepEqual(periodIssues.map(issue => issue.classification), ['POTENTIAL_VIOLATION', null, 'POTENTIAL_VIOLATION'],
    'later expiry does not become a claim that the earlier report breached its period');
  check.equal(issueApi.consumerLabel(periodIssues[1]), null, 'later expiry alone is not a historical VIOLATION');
  check.ok(periodIssues.every(issue => /which period and starting event/.test(issue.uncertainty)), 'source scope uncertainty accompanies each comparison');
  check.ok(periodIssues.every(issue => /earlier report/.test(issue.uncertainty)), 'historical uploads do not prove current file presence');
  check.ok(periodIssues.every(issue => /determining fallback date/.test(issue.request_wording)), 'selected letter identifies fallback date accurately');
  check.equal(issueApi.publicIssue(periodIssues[0]).preview_category, 'REPORTING_TIME_LIMIT', 'period finding reaches the existing preview category');
  const monthRecord = fictionalRecord(4, '2019-08');
  monthRecord.report_reference_date.normalized_value = '2025-01-10';
  const monthExtraction = { ...fictional, records: [monthRecord] };
  const monthComparison = published.compare({ country: 'CA', extraction: monthExtraction, assessmentDate: '2025-08-15' })[0];
  check.equal(monthComparison.periods[0].outside_at_assessment, false, 'month precision does not declare expiry before its latest possible boundary');
  check.equal(monthComparison.periods[0].ends_from, '2025-08-01', 'the earliest possible ending day is retained as a range');
  const monthRows = published.compare({ country: 'CA', extraction: monthExtraction, assessmentDate: '2025-09-01' });
  const monthIssue = issueApi.issuesFor({ extraction: monthExtraction, evaluation: { results: [], published_reporting_periods: monthRows } })[0];
  check.ok(/between 2025-08-01 and 2025-08-31/.test(monthIssue.explanation), 'consumer wording gives the month range without inventing an exact event day');
  const later = adapters.runAdapter(ns.adapter_id, { country: 'CA', region: 'CA-NS', presentation: 'GENERAL-BUREAU-REPORT',
    facts: fictional.records[1].facts, fact_sources: fictional.records[1].fact_sources,
    referenceDate: '2026-01-10', assessmentDate: '2026-10-11', record_index: 2 });
  const merged = issueApi.issuesFor({ extraction: fictional, evaluation: { results: [], published_reporting_periods: periodRows,
    retention_dual_date: { performed: [{ ...later.retention_dates, record_index: 2 }] } } });
  check.equal(merged.filter(issue => issue.record_index === 2).length, 1, 'a current statutory period concern is not duplicated by a published-period comparison');
  return { directive: 'CRP_OWNER_REPORTING_PERIOD_DIRECTIVE_001', production_verified: false };
}
module.exports = { run, id: 'ez-reporting-period-directive', title: 'Owner reporting-period directive: status-independent applicability and determining fallback dates' };
