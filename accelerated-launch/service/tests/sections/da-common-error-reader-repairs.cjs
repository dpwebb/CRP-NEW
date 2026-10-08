'use strict';

/* Fictional structural PR-01 reader input exercises the production readers and
 * normalizer without admitting a new report or relaxing the pinned digest. The
 * separate HTTP journey exercises the future-date rule and approved packet on
 * the general reader, whose ordinary fictional PDFs are admitted normally. */
const formats = require('../../formats.cjs');
const caFacts = require('../../ca-consumer-file-facts.cjs');
const common = require('../../common-errors.cjs');
const rules = require('../../common-error-rule-assessment.cjs');
const issues = require('../../issues.cjs');
const packets = require('../../packets.cjs');
const results = require('../../results.cjs');
const evaluation = require('../../evaluation.cjs');
const { extractFacts } = require('../../../../internal-validation/ca-ns-last-payment-six-year/extraction.cjs');
const fixtures = require('../../../../internal-validation/ca-ns-last-payment-six-year/tests/fixtures.cjs');
const { buildPdf } = require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');

const DATE_CHECK = 'COMMON-ERROR-LAST-PAYMENT-OR-FIRST-DELINQUENCY-DATE';
const FUTURE_REQUIREMENT = 'A payment or first missed payment cannot happen after the report date.';

function pr01(options = {}, amendView) {
  const model = fixtures.specimen({ requestDate: options.requestDate || '2026/06/12',
    records: options.records || [fixtures.recordLines(options)] });
  const raw = extractFacts(model, null, { synthetic_test_input: true });
  const view = caFacts.read(model);
  if (amendView) amendView(view);
  return { raw, extraction: formats.normalizeExtraction(raw, view) };
}

function offered(extraction) {
  const evaluation = { country: 'CA', region: 'CA-MB', presentation: 'PR-01', results: [],
    common_errors: common.runCommonErrorChecks({ extraction }) };
  return issues.issuesFor({ extraction, evaluation }).filter((issue) => issue.check_id === DATE_CHECK);
}

function futureAssessment(record, field = 'last_payment') {
  const fact = field === 'last_payment' ? 'tradeline.lastPaymentDate' : 'tradeline.firstDelinquencyDate';
  return rules.assess({ check_id: DATE_CHECK, reason: 'DATE_AFTER_REPORT_ISSUED',
    evidence: { field, value: record.facts[fact], report_date: '2026-06-12' } }, record,
  { country: 'CA', region: 'CA-MB', presentation: 'PR-01' });
}

async function run(t, check) {
  const future = pr01({ lastPayment: '2027/01/01' });
  const record = future.extraction.records[0];
  const legacy = future.raw.last_payment_facts[0];
  check.equal(record.kind, 'COLLECTION_ACCOUNT', 'the PR-01 legacy collection kind is preserved');
  for (const key of ['status', 'reason', 'normalized_value', 'raw_value', 'location', 'source_field'])
    check.deepEqual(record[key], legacy[key], `the PR-01 statutory adapter retains its original ${key}`);
  check.deepEqual(formats.factsForRecord(record), { 'tradeline.lastPaymentDate': '2027-01-01' },
    'the statutory anchor keeps its exact original fact surface without the shared delinquency field');
  check.deepEqual(future.extraction.reference_date, future.raw.request_date,
    'the statutory report reference remains the original resolved header fact');
  check.deepEqual(record.report_reference_date.location, { page: 1, line: 1 },
    'the shared report reference uses an occurrence actually located by the existing reader');
  const [paymentIssue] = offered(future.extraction);
  check.equal(paymentIssue?.classification, 'PROBABLE_VIOLATION',
    'a sourced PR-01 last-payment date after the report date reaches a probable reporting issue');
  check.equal(paymentIssue?.eligible, true, 'the supported PR-01 date issue is selectable');
  check.equal(paymentIssue?.rule_assessment.requirement, FUTURE_REQUIREMENT,
    'the named requirement describes the actual report-date comparison');
  check.deepEqual(paymentIssue?.source_facts.map((fact) => [fact.field, fact.raw_value, fact.normalized_value]),
    [['report.referenceDate', '2026/06/12', '2026-06-12'],
      ['tradeline.lastPaymentDate', '2027/01/01', '2027-01-01']],
    'only the two decisive printed dates are carried to the issue and packet');
  check.deepEqual(paymentIssue?.source_facts[1].location, legacy.location,
    'the payment keeps its own account and exact source location');
  const material = packets.issueContent(paymentIssue);
  check.ok(material.includes('2026/06/12') && material.includes('2027/01/01')
    && material.includes(FUTURE_REQUIREMENT), 'PR-01 packet material carries both readings and their requirement');

  const independent = pr01({ lastPaymentMode: 'blank', firstDelinquency: '2027/01/01' });
  const independentRecord = independent.extraction.records[0];
  check.equal(independentRecord.status, 'EXTRACTION_UNRESOLVED',
    'the unreadable legacy last-payment fact remains unresolved for its statutory check');
  check.equal(independentRecord.normalized_value, null, 'no legacy last-payment date is invented');
  check.equal(Object.hasOwn(formats.factsForRecord(independentRecord), 'tradeline.lastPaymentDate'), false,
    'the statutory fact surface does not borrow the first-delinquency date as a payment');
  const [delinquencyIssue] = offered(independent.extraction);
  check.equal(delinquencyIssue?.classification, 'PROBABLE_VIOLATION',
    'an independently sourced first-delinquency conflict survives a missing last-payment value');
  check.deepEqual(delinquencyIssue?.source_facts.map((fact) => fact.field),
    ['report.referenceDate', 'tradeline.firstDelinquencyDate'],
    'the independent issue uses the delinquency source and report reference');
  check.equal(delinquencyIssue?.source_facts[1].location.label, 'First Delinquency',
    'the delinquency source points to its own printed field');
  const independentExtraction = { ...independent.extraction, presentation_id: 'PR-01',
    support: formats.SUPPORT.ACTUAL_REPORT_EVIDENCE, extraction_ran: true, admission: { admitted: true } };
  const independentResult = results.renderResultSet({ extraction: independentExtraction,
    evaluation: evaluation.evaluateCase({ country: 'CA', region: 'CA-MB', extraction: independentExtraction }) });
  check.equal(independentResult.read_but_no_usable_facts, null,
    'a sourced shared date is a usable fact even when the legacy statutory payment is unresolved');
  check.match(independentResult.assessment.plain, /reviewed your report against the common-error checklist/,
    'the independent date result accurately describes its completed review');

  check.deepEqual(offered(pr01({ lastPayment: '2026/06/12' }).extraction), [],
    'a payment on the report date with an earlier delinquency produces no issue');
  check.deepEqual(offered(pr01({ lastPaymentMode: 'blank', firstDelinquency: 'unreadable' }).extraction), [],
    'missing payment and unreadable delinquency values are not inferred');
  check.deepEqual(offered(pr01({ lastPayment: '2027/01/01', requestDate: '2026/13/12' }).extraction), [],
    'an unresolved report-reference date does not establish a future-event conflict');
  const duplicated = pr01({ lastPaymentMode: 'blank', firstDelinquency: '2027/01/01',
    extraLines: ['First Delinquency 2028/01/01'] });
  check.equal(Object.hasOwn(duplicated.extraction.records[0].facts || {}, 'tradeline.firstDelinquencyDate'), false,
    'multiple printed delinquency values do not become a single resolved shared fact');
  check.deepEqual(offered(duplicated.extraction), [], 'the ambiguous date pair does not produce an issue');
  const mismatched = pr01({ lastPaymentMode: 'blank', firstDelinquency: '2027/01/01' },
    (view) => { view.records[0].boundary.line += 1; });
  check.deepEqual(offered(mismatched.extraction), [],
    'matching indexes cannot borrow a factual field from a different collection boundary');
  const anotherAccount = pr01({ records: [
    fixtures.recordLines({ lastPaymentMode: 'blank', firstDelinquency: '2027/01/01' }),
    fixtures.recordLines({ lastPayment: '2021/01/01', firstDelinquency: '2021/01/01' })
  ] });
  check.deepEqual(offered(anotherAccount.extraction).map((issue) => issue.record_index), [1],
    'a conflict stays on its source account and the benign neighboring account is not flagged');

  for (const reportReference of [
    { raw_value: '2026/06/12', normalized_value: '2026-06-12', location: { page: 1, line: 1 } },
    { raw: 'June 12, 2026', normalized: '2026-06-12', location: { page: 1, line: 1 } }
  ]) {
    const assessment = futureAssessment({ ...record, report_reference_date: reportReference });
    check.equal(assessment?.classification, 'PROBABLE_VIOLATION',
      'both existing reader reference-date shapes support the same sourced rule');
    check.equal(assessment?.requirement, FUTURE_REQUIREMENT, 'the future-date reason selects the report-date requirement');
  }
  for (const reportReference of [
    { raw: null, normalized: '2026-06-12', location: { page: 1, line: 1 } },
    { raw: 'June 12, 2026', normalized: '2026-06-12', location: null },
    { raw: 'June 12, 2026', normalized: '2026-06-12', status: 'EXTRACTION_UNRESOLVED', location: { page: 1, line: 1 } },
    { raw: 'June 12, 2026', normalized: '2026-06-12', normalized_value: '2025-06-12', location: { page: 1, line: 1 } }
  ]) check.equal(futureAssessment({ ...record, report_reference_date: reportReference }), null,
    'missing, unreadable or contradictory report-reference provenance cannot establish the rule breach');
  const missingEventSource = { ...record, printed: {}, fact_sources: {} };
  check.equal(futureAssessment(missingEventSource), null,
    'a normalized event date without its own printed source cannot establish the rule breach');
  const benignRecord = pr01({ lastPayment: '2026/06/12' }).extraction.records[0];
  check.equal(futureAssessment(benignRecord), null,
    'a future-event reason cannot upgrade a sourced date on the report date');
  const beforeOpening = rules.assess({ check_id: DATE_CHECK, reason: 'DATE_BEFORE_ACCOUNT_OPENED',
    evidence: { field: 'last_payment', value: '2027-01-01', opened: '2028-01-01' } },
  { ...record, facts: { ...record.facts, 'liability.openedDate': '2028-01-01' }, printed: {
    ...record.printed, 'Opened Date': { label: 'Opened Date', raw: '2028/01/01', normalized: '2028-01-01',
      location: { page: 16, line: 3 } }
  } }, { region: 'CA-MB', presentation: 'PR-01' });
  check.equal(beforeOpening?.requirement, 'A payment or first missed payment cannot happen before the account opened.',
    'a before-opening conflict retains its own requirement');

  const owner = await t.unpaidAccount('da-reader-owner@example.test');
  await t.pay(owner, 'monthly');
  const caseId = (await t.request('POST', '/api/cases', { token: owner.token,
    body: { country: 'CA', region: 'CA-MB' } })).json.case.case_id;
  const pdf = buildPdf({ pages: [{ lines: ['Equifax Consumer Credit Report', 'Report Date: June 12, 2026',
    'Fictional Creditor Opened 01/01/2020 Last Payment Date 01/01/2027 First Delinquency Date 01/01/2021 Balance $100.00'] }] });
  check.equal((await t.request('POST', `/api/cases/${caseId}/files`, { token: owner.token,
    body: { originalFilename: 'fictional-future-payment.pdf', declaredBytes: pdf.length,
      mimeType: 'application/pdf', contentBase64: pdf.toString('base64') } })).status, 201,
  'the ordinary fictional future-payment report uploads through admission');
  check.equal((await t.request('POST', `/api/cases/${caseId}/evaluate`, { token: owner.token })).status, 201,
    'the uploaded report reaches shared assessment');
  const view = (await t.request('GET', `/api/cases/${caseId}/packet`, { token: owner.token })).json.view;
  const candidate = (view.eligible_issues || []).find((issue) => issue.rule_assessment?.requirement === FUTURE_REQUIREMENT);
  check.ok(candidate, 'the future-date probable reporting issue reaches consumer selection');
  if (candidate) {
    check.equal(candidate.rule_assessment.classification, 'PROBABLE_VIOLATION',
      'the ordinary reader raw-reference shape receives the sourced probable classification');
    check.equal((await t.request('POST', `/api/cases/${caseId}/packet/select`, { token: owner.token,
      body: { issue_ids: [candidate.issue_id] } })).status, 200, 'the consumer selects the future-date issue');
    check.equal((await t.request('POST', `/api/cases/${caseId}/packet/correspondence`, { token: owner.token,
      body: { correspondence: { consumer_name: 'Dana Whitfield', contact: 'dana@example.test' } } })).status,
      200, 'the consumer supplies the packet correspondence details');
    await t.preparePostalPacket(owner, caseId);
    check.equal((await t.request('POST', `/api/cases/${caseId}/packet/approve`, { token: owner.token })).status, 200,
      'the selected date issue reaches consumer approval');
    const downloaded = await t.request('GET', `/api/cases/${caseId}/packet-download`, { token: owner.token });
    check.equal(downloaded.status, 200, 'the approved future-date packet downloads');
    check.ok(downloaded.text.includes('June 12, 2026') && downloaded.text.includes('01/01/2027')
      && downloaded.text.includes(FUTURE_REQUIREMENT), 'the downloaded packet carries both decisive dates and the correct rule');
    check.equal(downloaded.text.includes('cannot happen before the account opened'), false,
      'the future-date packet does not attribute the conflict to the unrelated opening-date rule');
  }
  return { pr01_fixture: 'fictional structural reader input; pinned report admission unchanged',
    retained_shared_fields: ['tradeline.lastPaymentDate', 'tradeline.firstDelinquencyDate'],
    report_date_shapes: ['raw_value/normalized_value', 'raw/normalized'],
    packet_journey: 'normally admitted fictional general report: upload, assess, select, approve, download' };
}

module.exports = { run, id: 'da-common-error-reader-repairs',
  title: 'PR-01 sourced shared dates and future-date issue/approved-packet repair' };
