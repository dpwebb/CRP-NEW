'use strict';

// Fictional source-backed assessments exercise the preview projection and ordering together. No new
// detection predicate, confidence upgrade, entitlement or private consumer report is introduced here.
const formats = require('../../formats.cjs');
const engine = require('../../evaluation.cjs');
const issues = require('../../issues.cjs');
const results = require('../../results.cjs');
const assembly = require('../../multi-file-assembly.cjs');
const clock = require('../../assessment-clock.cjs');
const common = require('../../common-errors.cjs');
const { makeSyntheticModel } = require('../../../../internal-validation/ca-ns-last-payment-six-year/document-model.cjs');
const { buildPdf } = require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');
const HEADER = ['Equifax Consumer Credit Report - FICTIONAL TEST FIXTURE', 'Report Date: June 12, 2026'];
const DUPLICATE = ['Fictional Creditor Opened 01/01/2020 Closed 01/01/2021 Balance $100', 'Account Number ****1234',
  'Fictional Creditor Opened 01/01/2020 Closed 01/01/2021 Balance $100', 'Account Number ****1234'];
const LOWER = ['Fictional Other Creditor Opened 01/01/2020 Closed 01/01/2021 Status Open Balance $200.00'];
function extracted(lines, country = 'US') {
  return formats.extractWithSharedAdapter(makeSyntheticModel({ pages: [HEADER.concat(lines)] }), { mode: 'REPORT', country });
}
function assessed(lines, region = 'US-CA') {
  const extraction = extracted(lines, region.slice(0, 2));
  const evaluation = engine.evaluateCase({ country: region.slice(0, 2), region, extraction,
    assessment_clock: clock.runStamp('2026-10-07T12:00:00Z') });
  return { extraction, evaluation };
}
function find(ctx, id) { return issues.issuesFor(ctx).find(issue => issue.check_id === 'COMMON-ERROR-' + id); }

async function run(service, check) {
  // A source-proven printed blank from the account-table contract. A generic unreadable date is not a blank.
  const blankRecord = { record_index: 1, kind: 'TU_CA_TRADELINE', kind_label: 'account', status: 'RESOLVED',
    location: { page: 4, line: 1 }, facts: {}, account_material: { narrative_legend: { AC: 'Account closed' } },
    monthly_rows: [{ location: { page: 4, line: 10 }, narrative_codes: ['AC'] }],
    printed: { 'Closed Date': { state: 'LABEL_PRINTED_WITHOUT_VALUE', raw: null, location: { page: 4, line: 5 } } } };
  const blankExtraction = { presentation_id: 'FAM-TU-CA-CONSUMER', records: [blankRecord] };
  const blankContext = { extraction: blankExtraction, evaluation: { country: 'CA', region: 'CA-NS', results: [],
    common_errors: common.runCommonErrorChecks({ extraction: blankExtraction }) } };
  const representatives = [
    issues.issuesFor(assessed(['Collection Agency ABC Balance $500 Past Due $500 Date of First Delinquency 01 June 2010']))
      .find(issue => issue.basis_type === 'STATUTORY_RETENTION'),
    find(assessed(DUPLICATE), 'DUPLICATE-REPORTING'),
    find(assessed(['Fictional Creditor Opened 01/01/2020 Closed 01/01/2019']), 'ACCOUNT-DATES-CONTRADICTORY'),
    find(assessed(['Fictional Creditor Opened 01/01/2020',
      'Payment History: 2024-01=OK 2024-01=30 Key: OK=Paid as agreed 30=30 days late']), 'PAYMENT-HISTORY-INCONSISTENCY'),
    find(assessed(['Fictional Creditor Opened 01/01/2020 Balance $100.00 Credit Limit $0.00', 'Account Type: Credit Card']), 'REVOLVING-BALANCE-ZERO-LIMIT'),
    find(blankContext, 'CLOSURE-STATED-WITHOUT-A-CLOSED-DATE'),
    find(assessed(DUPLICATE.map((line, index) => index % 2 === 0 ? line + (index === 0 ? ' Responsibility Individual' : ' Responsibility Joint') : line)), 'RESPONSIBILITY-INCONSISTENCY')
  ];
  const reagingLines = (year, date) => ['Equifax Consumer Credit Report - FICTIONAL TEST FIXTURE', `Report Date: June 12, ${date}`,
    'Creditor A Balance $100', 'Account Number ****1234', 'Status: Charged Off', 'Opened 01/01/2010',
    `First Delinquency Date 01/01/${year}`, 'Last Payment Date 01/01/2017'];
  const snapshot = (id, lines) => assembly.assemble([{ file_id: id, stored_sha256: id,
    extraction: formats.extractWithSharedAdapter(makeSyntheticModel({ pages: [lines] }), { mode: 'REPORT', country: 'US' }) }]).extraction;
  const current = snapshot('fictional-current-file', reagingLines(2020, 2026));
  const prior = snapshot('fictional-earlier-file', reagingLines(2018, 2025));
  const reagingContext = { extraction: current, evaluation: engine.evaluateCase({ country: 'US', region: 'US-NY', extraction: current,
    prior_reports: [{ result_id: 'fictional-earlier-result', extraction: prior }] }) };
  representatives.push(find(reagingContext, 'POTENTIAL-RE-AGING-SIGNAL'));
  const expected = ['REPORTING_TIME_LIMIT', 'DUPLICATE_REPORTING', 'DATE_CONFLICT', 'PAYMENT_HISTORY_CONFLICT',
    'STATUS_AMOUNT_CONFLICT', 'MISSING_DATE', 'RESPONSIBILITY_IDENTITY', 'RE_AGING'];
  for (let i = 0; i < representatives.length; i++) {
    check.ok(representatives[i]?.eligible && issues.consumerLabel(representatives[i]) === 'VIOLATION', `group ${i + 1} has a real assessed eligible breach`);
  }
  if (representatives.some(issue => !issue)) return { missing_representative: true };
  const publicRows = representatives.map(issues.publicIssue);
  check.deepEqual(publicRows.map(issue => issue.preview_category), expected, 'actual rule assessments project all eight safe categories');
  for (let i = 0; i < publicRows.length - 1; i++) {
    for (const rows of [[publicRows[i + 1], publicRows[i]], [publicRows[i], publicRows[i + 1]]]) {
      check.equal(results.summariseAssessment({ issues: rows }).teaser.issue_id, publicRows[i].issue_id,
        `group ${i + 1} beats group ${i + 2} regardless of report order`);
    }
  }
  const tied = [{ ...publicRows[1], issue_id: 'zzz', confidence: 'DEFINITE' },
    { ...publicRows[1], issue_id: 'aaa', confidence: 'POTENTIAL' }];
  check.equal(results.summariseAssessment({ issues: tied }).teaser.issue_id, 'aaa', 'stable ties do not prefer internal confidence');
  const merged = results.renderResultSet(assessed(['Fictional Creditor Opened 01/01/2020 Closed 01/01/2019'], 'CA-NT')).issues[0];
  check.equal(merged.basis_type, 'CONTENT_FINDING', 'the control exercises a merged accuracy/common-rule wrapper');
  check.equal(merged.preview_category, 'DATE_CONFLICT', 'a content wrapper inherits its actual date-conflict basis rather than time-limit priority');
  const nonCandidates = [
    { ...publicRows[0], eligible: false },
    { ...publicRows[0], consumer_label: null, rule_assessment: undefined, supported_bases: [] },
    { ...publicRows[0], basis_type: 'LIMITATION_ASSESSMENT', limitation_concern: true, consumer_label: 'INFORMATION' },
    { ...publicRows[0], consumer_label: null, rule_assessment: { classification: 'UNRESOLVED' }, supported_bases: [], later_expiry_concern: true },
    { issue_id: 'review-only', basis_type: 'FACTUAL_CONSISTENCY', confidence: 'POTENTIAL', eligible: false, consumer_label: null }
  ];
  const excluded = results.summariseAssessment({ issues: nonCandidates });
  check.equal(excluded.teaser, null, 'ineligible, unresolved, informational and review-only rows cannot create a violation example');
  check.equal(excluded.distinct_total, 4, 'preview eligibility does not rewrite full reporting-issue counts');
  check.equal(excluded.information_total, 1, 'court information keeps its separate count');
  check.equal(results.summariseAssessment({ issues: [...nonCandidates, publicRows[1]] }).teaser.issue_id, publicRows[1].issue_id,
    'court and unlabeled review cards cannot outrank a supported duplicate');
  check.equal(results.summariseAssessment({ issues: [publicRows[5], publicRows[1]] }).teaser.issue_id, publicRows[1].issue_id,
    'a corroborated duplicate beats a source-proven printed blank date');
  check.equal(results.summariseAssessment({ issues: [] }).teaser, null, 'no found violation means no invented example');
  check.match(results.teaserFor(publicRows[7]).explanation, /later than.*same account.*earlier report/, 're-aging preview includes the changed date relationship');
  check.match(results.teaserFor(publicRows[2]).explanation, /dates conflict/, 'date preview describes the contradiction without private dates');
  check.match(results.teaserFor({ ...publicRows[0], confidence: 'PROBABLE' }).explanation, /does not settle every detail/, 'a qualified time-limit example preserves uncertainty');
  check.ok(!/"check_id"|COMMON-ERROR-|"rank"|"score"/.test(JSON.stringify(publicRows)), 'public categories expose no internal check IDs or numerical score');

  // The ordinary ingestion path must choose the duplicate over a supported status conflict before payment.
  const free = await service.unpaidAccount('eo-free@example.test');
  const caseRow = (await service.request('POST', '/api/cases', { token: free.token, body: { country: 'US', region: 'US-CA' } })).json.case;
  const pdf = buildPdf({ pages: [{ lines: HEADER.concat(DUPLICATE, LOWER) }] });
  await service.request('POST', `/api/cases/${caseRow.case_id}/files`, { token: free.token,
    body: { originalFilename: 'fictional-mixed-priorities.pdf', declaredBytes: pdf.length, mimeType: 'application/pdf', contentBase64: pdf.toString('base64') } });
  const evaluated = await service.request('POST', `/api/cases/${caseRow.case_id}/evaluate`, { token: free.token });
  const view = (await service.request('GET', `/api/cases/${caseRow.case_id}`, { token: free.token })).json.view;
  check.equal(evaluated.status, 201, 'the unpaid ordinary mixed report is assessed');
  check.equal(view.assessment_summary.teaser.severity, 'DUPLICATE_REPORTING', 'a real uploaded duplicate beats its status conflict');
  check.equal(view.assessment_summary.teaser.title, 'The same debt appears more than once', 'the most serious example has a simple consumer title');
  check.equal(view.assessment_summary.teaser.confidence_label, 'VIOLATION', 'the unpaid example uses the sole breach term');
  check.ok(view.assessment_summary.distinct_total >= 2, 'the lower-priority status conflict is still counted');
  check.equal(view.result, null, 'the full assessment stays behind the purchase boundary');
  check.equal(Array.isArray(view.assessment_summary.teaser), false, 'there is one preview, never an issue list');
  check.ok(!/Fictional Creditor|\*\*\*\*1234|COMMON-ERROR-/.test(JSON.stringify(view.assessment_summary.teaser)), 'the preview keeps account identities and internal check IDs private');
  return { priority_groups: 8, ordinary_unpaid_duplicate_over_status_conflict: true };
}
module.exports = { run, id: 'eo-violation-preview-priority', title: 'Most serious supported disputable VIOLATION preview before payment' };
