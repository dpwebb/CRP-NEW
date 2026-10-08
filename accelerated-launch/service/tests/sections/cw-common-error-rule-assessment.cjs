'use strict';

const common = require('../../common-errors.cjs');
const rules = require('../../common-error-rule-assessment.cjs');
const issues = require('../../issues.cjs');
const formats = require('../../formats.cjs');
const evaluationEngine = require('../../evaluation.cjs');
const fs = require('node:fs');
const path = require('node:path');
const { buildPdf } = require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');
const { makeSyntheticModel } = require('../../../../internal-validation/ca-ns-last-payment-six-year/document-model.cjs');

function canonicalRegions() {
  const file = path.resolve(__dirname, '..', '..', '..', '..', 'consumer-wizard', 'dist', 'jurisdiction-data.js');
  const raw = fs.readFileSync(file, 'utf8');
  return JSON.parse(raw.slice(raw.indexOf('window.CRP_JURISDICTION_DATA = ') + 30).trim().replace(/;\s*$/, ''))
    .regions.map((r) => ({ country: r.country_code, region: r.region_code }));
}

function readOrdinaryReport(country, region, lines) {
  const extraction = formats.extractWithSharedAdapter(makeSyntheticModel({ pages: [[
    'Equifax Consumer Credit Report', 'Report Date: June 12, 2026', ...lines
  ]] }), { mode: 'REPORT', country });
  const evaluation = evaluationEngine.evaluateCase({ country, region, extraction });
  return { extraction, findings: issues.issuesFor({ extraction, evaluation }) };
}

function record(facts, withSource = true) {
  const printed = {};
  if (withSource) Object.entries(facts).forEach(([field, value], index) => {
    printed[field] = { label: field, raw: String(value), normalized: value,
      location: { page: 2, line: index + 4 } };
  });
  return { record_index: 1, kind: 'CONSUMER_CREDIT_LIABILITY', kind_label: 'account',
    status: 'RESOLVED', location: { page: 2, line: 4 }, source_file_id: 'fictional-report',
    source_bureau: 'Fictional Bureau', source_report_reference_date: '2026-10-01',
    facts, printed };
}

function offer(facts, region = 'CA-ON', withSource = true) {
  const r = record(facts, withSource);
  const evaluation = { country: region.slice(0, 2), region, presentation: 'GENERAL-BUREAU-REPORT',
    results: [], common_errors: common.runCommonErrorChecks({ extraction: { records: [r] } }) };
  return issues.issuesFor({ extraction: { records: [r] }, evaluation });
}

async function run(t, check) {
  const regions = canonicalRegions();
  check.equal(regions.length, 82, 'the canonical jurisdiction list still contains 82 regions');
  for (const { country, region } of regions) {
    const status = readOrdinaryReport(country, region, [
      'Fictional Creditor Opened 01/01/2020 Closed 01/01/2021 Status Open Balance $100.00'
    ]).findings.find((i) => i.check_id === 'COMMON-ERROR-STATUS-DATE-CONTRADICTION');
    check.equal(status?.classification, 'PROBABLE_VIOLATION', `${region}: status/date rule applies`);
    check.ok(status?.rule_assessment?.required_facts.every((f) => f.source?.location),
      `${region}: status/date decisive facts are source linked`);

    const revolving = readOrdinaryReport(country, region, [
      'Fictional Creditor Opened 01/01/2020 Balance $100.00 Credit Limit $0.00',
      'Account Type: Credit Card'
    ]).findings.find((i) => i.check_id === 'COMMON-ERROR-REVOLVING-BALANCE-ZERO-LIMIT');
    check.equal(revolving?.classification, 'POTENTIAL_VIOLATION', `${region}: revolving balance/limit rule applies`);
    check.equal(revolving?.rule_assessment?.required_facts.length, 3,
      `${region}: type, balance, and limit each have report evidence`);

    const chronology = readOrdinaryReport(country, region, [
      'Fictional Creditor Opened 01/01/2020 First Reported 01/01/2019 Last Payment Date 01/01/2018'
    ]).findings;
    for (const [id, classification] of [
      ['COMMON-ERROR-REPORTED-DATES-OUT-OF-ORDER', 'POTENTIAL_VIOLATION'],
      ['COMMON-ERROR-LAST-PAYMENT-OR-FIRST-DELINQUENCY-DATE', 'PROBABLE_VIOLATION']
    ]) {
      const item = chronology.find((i) => i.check_id === id);
      check.equal(item?.classification, classification, `${region}: ${id} uses exact printed dates`);
      check.ok(item?.rule_assessment?.required_facts.every((f) => f.source?.location),
        `${region}: ${id} retains source locations`);
    }

    const paired = readOrdinaryReport(country, region, [
      'Fictional Creditor Opened 01/01/2020 Closed 01/01/2021 Balance $100.00 Responsibility Individual',
      'Account Number ****1234',
      'Fictional Creditor Opened 01/01/2020 Closed 01/01/2021 Balance $100.00 Responsibility Joint',
      'Account Number ****1234'
    ]).findings;
    for (const [id, classification] of [
      ['COMMON-ERROR-DUPLICATE-REPORTING', 'POTENTIAL_VIOLATION'],
      ['COMMON-ERROR-RESPONSIBILITY-INCONSISTENCY', 'PROBABLE_VIOLATION']
    ]) {
      const item = paired.find((i) => i.check_id === id);
      check.equal(item?.classification, classification, `${region}: ${id} applies`);
      check.ok(item?.rule_assessment?.required_facts.every((f) => f.source?.location),
        `${region}: both account readings are source linked for ${id}`);
    }
  }
  const splitChronology = readOrdinaryReport('US', 'US-NY', [
    'Fictional Creditor A Opened 01/01/2020',
    'Fictional Creditor B First Reported 01/01/2019'
  ]).findings;
  check.equal(splitChronology.some((i) => i.check_id === 'COMMON-ERROR-REPORTED-DATES-OUT-OF-ORDER'),
    false, 'opened and first-reported dates are never borrowed between creditors');
  const usDateRecord = { ...record({ 'reportedAccount.dateOpened': '2020-01-01',
    'reportedAccount.firstReported': '2019-01-01' }, false), kind: 'REPORTED_ACCOUNT',
  printed: {
    date_opened: { label: 'Date opened', raw: '01/01/2020', normalized: '2020-01-01',
      location: { page: 1, y0: 110 } },
    first_reported: { label: 'First reported', raw: '01/01/2019', normalized: '2019-01-01',
      location: { page: 1, y0: 130 } }
  } };
  const usExtraction = { records: [usDateRecord] };
  const usEvaluation = { country: 'US', region: 'US-NY', presentation: 'US-CONSUMER-DISCLOSURE',
    results: [], common_errors: common.runCommonErrorChecks({ extraction: usExtraction }) };
  const usDateIssue = issues.issuesFor({ extraction: usExtraction, evaluation: usEvaluation })
    .find((i) => i.check_id === 'COMMON-ERROR-REPORTED-DATES-OUT-OF-ORDER');
  check.equal(usDateIssue?.classification, 'POTENTIAL_VIOLATION',
    'US column-source dates can support the reported-date violation when both are resolved');
  check.deepEqual(usDateIssue.rule_assessment.required_facts.map((f) => f.source.location.y0), [110, 130],
    'each US date keeps its own column coordinate');
  const gbCard = { ...record({ 'account.type': 'CREDIT CARD', 'account.balance': 100,
    'account.creditLimit': 0 }, false), kind: 'GB_CREDIT_ACCOUNT', printed: {
    'account.type': { label: 'Account type', raw: 'CREDIT CARD', normalized: 'CREDIT CARD',
      location: { page: 2, line: 4 } },
    Balance: { label: 'Balance', raw: '£100', normalized: 100, location: { page: 2, line: 5 } },
    'Credit Limit': { label: 'Credit Limit', raw: '£0', normalized: 0, location: { page: 2, line: 6 } }
  } };
  const gbExtraction = { records: [gbCard] };
  const gbEvaluation = { country: 'GB', region: 'GB-ENG', presentation: 'FAM-GB-EXP-CONSUMER',
    results: [], common_errors: common.runCommonErrorChecks({ extraction: gbExtraction }) };
  const gbIssue = issues.issuesFor({ extraction: gbExtraction, evaluation: gbEvaluation })
    .find((i) => i.check_id === 'COMMON-ERROR-REVOLVING-BALANCE-ZERO-LIMIT');
  check.equal(gbIssue?.classification, 'POTENTIAL_VIOLATION',
    'GB sourced card type, balance and explicit zero limit reach the shared violation rule');
  check.equal(gbIssue.rule_assessment.required_facts.length, 3,
    'the GB rule requires all three located readings');
  const cases = [
    ['COMMON-ERROR-STATUS-DATE-CONTRADICTION', { 'account.status': 'OPEN', 'liability.closedDate': '2020-01-01' }],
    ['COMMON-ERROR-PAID-SETTLED-SHOWN-UNPAID', { 'account.status': 'PAID IN FULL', 'account.pastDueAmount': 50 }],
    ['COMMON-ERROR-PAID-SETTLED-SHOWN-UNPAID', { 'account.status': 'PAID IN FULL', 'account.balance': 50 }],
    ['COMMON-ERROR-BALANCE-PAYMENT-INCONSISTENCY', { 'account.balance': 20, 'account.pastDueAmount': 50 }],
    ['COMMON-ERROR-LAST-PAYMENT-OR-FIRST-DELINQUENCY-DATE', { 'liability.openedDate': '2020-01-01', 'tradeline.lastPaymentDate': '2019-01-01' }]
  ];
  for (const [id, facts] of cases) {
    for (const region of ['CA-ON', 'CA-NS', 'US-CA', 'GB-ENG', 'AU-NSW']) {
      const item = offer(facts, region).find((i) => i.check_id === id);
      check.ok(item && item.eligible, `${region}: ${id} is selectable`);
      check.equal(item.classification, 'PROBABLE_VIOLATION', `${region}: the data rule determines the violation`);
      check.equal(item.rule_assessment.rule_id, id, `${region}: the breached rule is named`);
      check.ok(item.rule_assessment.required_facts.every((f) => f.source.location.page === 2),
        `${region}: both decisive values have source locations`);
      check.equal(Object.hasOwn(item, 'legal_assessment'), false, `${region}: no legal-finding category`);
    }
    check.equal(offer(facts, 'CA-ON', false).find((i) => i.check_id === id).classification,
      null, `${id}: unresolved source readings cannot be upgraded`);
  }
  check.equal(offer(cases[0][1], 'CA-NS')[0].rule_assessment.supporting_statutes.length, 0,
    'a statute is not required');
  check.equal(offer(cases[0][1], 'CA-ON')[0].rule_assessment.supporting_statutes.length, 1,
    'an accepted statute can be included as context');
  check.equal(offer({ 'account.status': 'PAID IN FULL', 'account.pastDueAmount': 0 })
    .some((i) => i.check_id === 'COMMON-ERROR-PAID-SETTLED-SHOWN-UNPAID'), false,
  'a consistent zero amount creates no violation');
  const paidBalance = offer({ 'account.status': 'PAID IN FULL', 'account.balance': 50,
    'account.pastDueAmount': 0 }).find((i) => i.check_id === 'COMMON-ERROR-PAID-SETTLED-SHOWN-UNPAID');
  check.deepEqual(paidBalance.source_facts.map((f) => f.field).sort(),
    ['account.balance', 'account.status'],
    'a classified issue and its packet carry exactly the two decisive sourced fields');
  const omissionRecord = {
    ...record({}, true), kind: 'TU_CA_TRADELINE',
    account_material: { narrative_legend: { AC: 'Account closed' } },
    monthly_rows: [{ location: { page: 4, line: 10 }, narrative_codes: ['AC'] }],
    printed: { 'Closed Date': { state: 'LABEL_PRINTED_WITHOUT_VALUE', raw: null,
      location: { page: 4, line: 5 } } }
  };
  const omissionIssue = { check_id: 'COMMON-ERROR-CLOSURE-STATED-WITHOUT-A-CLOSED-DATE',
    evidence: { closure_codes: [{ code: 'AC', meaning_as_the_report_prints_it: 'Account closed',
      location: { page: 4, line: 10 } }] } };
  const omission = rules.assess(omissionIssue, omissionRecord,
    { region: 'CA-NS', presentation: 'FAM-TU-CA-CONSUMER' });
  check.equal(omission.classification, 'POTENTIAL_VIOLATION',
    'a report-defined event and explicit blank caption support a qualified completeness violation');
  check.equal(omission.required_facts[0].source.omitted_value, true,
    'the missing value is not fabricated');
  const unreadable = { ...omissionRecord, printed: { 'Closed Date': {
    state: 'VALUE_UNRESOLVED', raw: null, location: { page: 4, line: 5 } } } };
  check.equal(rules.assess(omissionIssue, unreadable,
    { region: 'CA-NS', presentation: 'FAM-TU-CA-CONSUMER' }), null,
  'an unreadable value is not an established omission');
  const shared = { 'account.masked_identifier': '****1234',
    'account.reported_identity': 'Fictional Creditor', 'account.amount': 100,
    'liability.openedDate': '2020-01-01' };
  const first = record({ ...shared, 'account.responsibility': 'INDIVIDUAL' });
  const second = { ...record({ ...shared, 'account.responsibility': 'JOINT' }), record_index: 2 };
  for (const reading of Object.values(second.printed)) reading.location.page = 3;
  const pairedExtraction = { records: [first, second] };
  const pairedEvaluation = { country: 'CA', region: 'CA-NS',
    presentation: 'GENERAL-BUREAU-REPORT', results: [],
    common_errors: common.runCommonErrorChecks({ extraction: pairedExtraction }) };
  const pairedIssues = issues.issuesFor({ extraction: pairedExtraction, evaluation: pairedEvaluation });
  const responsibility = pairedIssues.find((i) => i.check_id === 'COMMON-ERROR-RESPONSIBILITY-INCONSISTENCY');
  check.equal(responsibility.classification, 'PROBABLE_VIOLATION',
    'contradictory roles on the corroborated same-snapshot account support a probable violation');
  check.equal(responsibility.rule_assessment.required_facts.length, 6,
    'both accounts supply identity and responsibility facts');
  check.ok(responsibility.source_facts.some((f) => /^Fictional Creditor:/.test(f.source_field) && f.location.page === 2)
    && responsibility.source_facts.some((f) => /^Fictional Creditor:/.test(f.source_field) && f.location.page === 3),
  'both printed business labels reach the packet evidence with their separate source pages');
  const duplicate = pairedIssues.find((i) => i.check_id === 'COMMON-ERROR-DUPLICATE-REPORTING');
  check.equal(duplicate.classification, 'POTENTIAL_VIOLATION',
    'corroborated duplicate entries support a potential violation pending verification');
  const unlinked = { ...second, printed: {} };
  const unlinkedExtraction = { records: [first, unlinked] };
  const unlinkedEvaluation = { ...pairedEvaluation,
    common_errors: common.runCommonErrorChecks({ extraction: unlinkedExtraction }) };
  check.equal(issues.issuesFor({ extraction: unlinkedExtraction, evaluation: unlinkedEvaluation })
    .find((i) => i.check_id === 'COMMON-ERROR-DUPLICATE-REPORTING').classification, null,
  'a second entry without its own sourced fields is not upgraded');
  const wrongAmountSource = [first, second].map((r) => ({ ...r, printed: {
    ...r.printed, 'account.amount': undefined,
    'Past Due Amount': { label: 'Past Due Amount', raw: '$100.00', normalized: 100,
      location: { page: 2, line: 20 } }
  } }));
  const wrongAmountExtraction = { records: wrongAmountSource };
  const wrongAmountEvaluation = { ...pairedEvaluation,
    common_errors: common.runCommonErrorChecks({ extraction: wrongAmountExtraction }) };
  check.equal(issues.issuesFor({ extraction: wrongAmountExtraction, evaluation: wrongAmountEvaluation })
    .find((i) => i.check_id === 'COMMON-ERROR-DUPLICATE-REPORTING').classification, null,
  'a past-due caption cannot be substituted as the duplicate corroboration amount source');
  const owner = await t.unpaidAccount('cw-rule-owner@example.test');
  await t.pay(owner, 'monthly');
  const caseId = (await t.request('POST', '/api/cases', { token: owner.token,
    body: { country: 'CA', region: 'CA-ON' } })).json.case.case_id;
  const pdf = buildPdf({ pages: [{ lines: ['Equifax Consumer Credit Report', 'Report Date: June 12, 2026',
    'Fictional Creditor Balance $100.00 Opened 01/01/2019 Closed 01/01/2020 Status Open'] }] });
  check.equal((await t.request('POST', `/api/cases/${caseId}/files`, { token: owner.token,
    body: { originalFilename: 'fictional-status.pdf', declaredBytes: pdf.length,
      mimeType: 'application/pdf', contentBase64: pdf.toString('base64') } })).status, 201, 'the report uploads');
  check.equal((await t.request('POST', `/api/cases/${caseId}/evaluate`, { token: owner.token })).status,
    201, 'the report is assessed');
  const view = (await t.request('GET', `/api/cases/${caseId}/packet`, { token: owner.token })).json.view;
  const issue = (view.eligible_issues || []).find((i) => i.rule_assessment && i.rule_assessment.classification === 'PROBABLE_VIOLATION');
  check.ok(issue, 'the violation reaches consumer selection');
  if (issue) {
    check.equal((await t.request('POST', `/api/cases/${caseId}/packet/select`, { token: owner.token,
      body: { issue_ids: [issue.issue_id] } })).status, 200, 'the consumer selects it');
    check.equal((await t.request('POST', `/api/cases/${caseId}/packet/correspondence`, { token: owner.token,
      body: { correspondence: { consumer_name: 'Dana Whitfield', contact: 'dana@example.test' } } })).status,
      200, 'the consumer supplies correspondence details');
    await t.preparePostalPacket(owner, caseId);
    check.equal((await t.request('POST', `/api/cases/${caseId}/packet/approve`, { token: owner.token })).status,
      200, 'the consumer approves the packet');
    const downloaded = await t.request('GET', `/api/cases/${caseId}/packet-download`, { token: owner.token });
    check.equal(downloaded.status, 200, 'the packet downloads');
    check.match(downloaded.text, /VIOLATION[\s\S]*Reporting rule: An account cannot be both open and closed/,
      'the actual PDF names the violation and its reporting rule');
  }
  return { source_linked_cases: cases.length, statutory_gate: false,
    ordinary_report_regions: regions.length, ordinary_report_checks_per_region: 6 };
}

module.exports = { run, id: 'cw-common-error-rule-assessment',
  title: 'Common-error violation assessment from source-linked report-data rules' };
