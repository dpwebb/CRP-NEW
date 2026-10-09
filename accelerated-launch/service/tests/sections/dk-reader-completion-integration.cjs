'use strict';
const { packetText } = require('../packet-pdf-assertions.cjs');

const formats = require('../../formats.cjs');
const common = require('../../common-errors.cjs');
const issues = require('../../issues.cjs');
const packets = require('../../packets.cjs');
const amounts = require('../../report-amount.cjs');
const us = require('./df-us-common-error-reader.cjs').fixtures;
const ca = require('../../ca-consumer-file-facts.cjs');
const { extractFacts } = require('../../../../internal-validation/ca-ns-last-payment-six-year/extraction.cjs');
const fixtures = require('../../../../internal-validation/ca-ns-last-payment-six-year/tests/fixtures.cjs');
const PAID = 'COMMON-ERROR-PAID-SETTLED-SHOWN-UNPAID';
const REVOLVING = 'COMMON-ERROR-REVOLVING-BALANCE-ZERO-LIMIT';

function canadian(status, balance = '100.00', amend, options = {}) {
  const lines = fixtures.recordLines({ lastPayment: '2020/01/01', ...options }).map((line) =>
    /^Status(?:\s|$)/.test(line) ? `Status ${status}` : /^Balance(?:\s|$)/.test(line) ? `Balance ${balance}` : line);
  if (!lines.some((line) => /^Status(?:\s|$)/.test(line))) lines.push(`Status ${status}`);
  const model = fixtures.specimen({ requestDate: '2026/06/12', records: [lines] });
  const raw = extractFacts(model, null, { synthetic_test_input: true });
  const view = ca.read(model);
  if (amend) amend(view);
  const extraction = { presentation_id: 'PR-01', ...formats.normalizeExtraction(raw, view) };
  const evaluation = { country: 'CA', region: 'CA-MB', presentation: 'PR-01', results: [],
    common_errors: common.runCommonErrorChecks({ extraction }) };
  return { raw, extraction, evaluation, findings: issues.issuesFor({ extraction, evaluation }) };
}

function download(ctx, issue) {
  const state = { cases: [{ case_id: 'dk-case', account_id: 'dk-owner', country: ctx.evaluation.country,
    region: ctx.evaluation.region }], results: [{ ...ctx, case_id: 'dk-case', account_id: 'dk-owner', result_id: 'dk-result' }], packets: [] };
  const store = { state: () => state, update: (fn) => fn(state) }, actor = { account_id: 'dk-owner' };
  packets.selectIssues(store, actor, 'dk-case', [issue.issue_id]);
  packets.setCorrespondence(store, actor, 'dk-case', { consumer_name: 'Fictional Consumer', contact: 'fictional@example.test' });
  packets.approvePacket(store, actor, 'dk-case');
  return packetText(packets.packetDownload(store, actor, 'dk-case'));
}

async function run(t, check) {
  const keyedRecord = { facts: { 'liability.closedDate': '2010-04-10',
    'overdue.originalListingDate': '2014-01-01', 'account.balance': 100 }, fact_sources: {
    'liability.closedDate': { raw_value: '10 Apr 2010', normalized_value: '2010-04-10',
      location: { page: 1 }, trusted: false },
    'overdue.originalListingDate': { raw_value: '1 Jan 2014', normalized_value: '2014-01-01',
      location: { page: 2 }, status: 'RESOLVED' }
  } };
  check.deepEqual(formats.factsForRecord(keyedRecord), {
    'overdue.originalListingDate': '2014-01-01', 'account.balance': 100
  }, 'an explicitly rejected field cannot supply an adapter anchor; independently supported and legacy facts remain');
  check.equal(common.usableField(keyedRecord, 'liability.closedDate'), false,
    'coverage cannot count an explicitly rejected source as a usable field');
  for (const source of [null, { raw_value: '1 Jan 2014', normalized_value: '2014-01-01',
    location: { page: 2 }, caption_count: 2 }, { raw_value: '1 Jan 2014', normalized_value: '2015-01-01',
    location: { page: 2 } }]) {
    check.equal(formats.factsForRecord({ ...keyedRecord, fact_sources: {
      ...keyedRecord.fact_sources, 'overdue.originalListingDate': source
    } })['overdue.originalListingDate'], undefined, 'missing, ambiguous or mismatched own sources cannot supply a rule date');
  }
  for (const [raw, expected] of [['0', 0], ['$1,234.50', 1234.5], ['-$273.00', -273], ['$-273.00', -273],
    ['($273.00)', -273], ['unreadable0', null], ['$1,00', null], ['$100 garbage', null], ['++100', null]])
    check.equal(amounts.printedAmount(raw), expected, 'only a complete signed monetary reading becomes a number');
  const paid = canadian('PAID IN FULL'), record = paid.extraction.records[0];
  const issue = paid.findings.find((item) => item.check_id === PAID);
  check.ok(issue?.eligible, 'a complete sourced paid-in-full phrase and positive balance support selection');
  check.deepEqual(issue?.source_facts.map((fact) => [fact.field, fact.raw_value]),
    [['account.status', 'PAID IN FULL'], ['account.balance', '100.00']], 'the issue uses its own complete status and balance captions');
  check.equal(issues.publicIssues(paid).find((item) => item.issue_id === issue?.issue_id)?.consumer_label,
    'VIOLATION', 'the sourced Canadian breach uses the sole consumer term');
  check.deepEqual(formats.factsForRecord(record), { 'tradeline.lastPaymentDate': '2020-01-01' },
    'shared collection fields do not enlarge the historical statutory fact surface');
  const rejectedPayment = JSON.parse(JSON.stringify(record));
  rejectedPayment.fact_sources['tradeline.lastPaymentDate'].trusted = false;
  check.deepEqual(formats.factsForRecord(rejectedPayment), {},
    'the legacy collection surface also rejects its explicitly untrusted payment anchor');
  const rejectedOtherDate = JSON.parse(JSON.stringify(record));
  rejectedOtherDate.fact_sources['tradeline.firstDelinquencyDate'] = { trusted: false };
  check.deepEqual(formats.factsForRecord(rejectedOtherDate), { 'tradeline.lastPaymentDate': '2020-01-01' },
    'rejection of an independent shared date leaves the valid legacy payment anchor intact');
  const packet = download(paid, issue);
  check.match(packet, /PAID IN FULL/, 'the approved packet preserves the full decisive phrase');
  check.match(packet, /current balance of 100\b/, 'the approved human letter preserves its sourced balance amount');
  check.equal(/page (?:undefined|null)/.test(packet), false, 'packet sources never print a missing page');
  for (const status of ['PAID AS AGREED', 'CURRENT', 'UNPAID', 'SETTLED', 'PAID PARTIALLY'])
    check.equal(canadian(status).findings.some((item) => item.check_id === PAID), false,
      'repayment, partial payment and uncertain settlement phrases do not imply paid-in-full');
  for (const balance of ['0', '-100.00', '(100.00)', 'unreadable0', '1,00', '100 garbage', ''])
    check.equal(canadian('PAID IN FULL', balance).findings.some((item) => item.check_id === PAID), false,
      'zero, credit balances and unreadable amounts do not establish unpaid paid-in-full debt');
  for (const amend of [(view) => { view.records[0].printed.Status.printed_times_in_record = 2; },
    (view) => { view.records[0].printed.Balance.printed_times_in_record = 2; },
    (view) => { view.records[0].printed.Status.location.trusted = false; },
    (view) => { view.records[0].boundary.line += 1; }])
    check.equal(canadian('PAID IN FULL', '100.00', amend).findings.some((item) => item.check_id === PAID), false,
      'ambiguous, untrusted and misassociated Canadian readings cannot supply the decisive facts');
  check.equal(common.presentationCapability('PR-01').all_factual_checks[PAID].field_ready, true,
    'the capability inventory records the working shared paid/balance bridge');
  const independentPaid = canadian('PAID IN FULL', '100.00', null, { lastPaymentMode: 'blank' });
  check.ok(independentPaid.findings.some((item) => item.check_id === PAID && item.eligible),
    'a missing legacy statutory payment anchor does not suppress a sourced paid/balance rule breach');

  for (const [raw, expected] of [['£ 100', 100], ['-£100', -100], ['(£100)', -100],
    ['100 garbage', undefined], ['£1,00', undefined]]) {
    const model = formats.makeSyntheticModel({ pages: [['Credit account information', 'C1 Fictional Consumer',
      'FICTIONAL CREDIT CARD', 'Started 19/10/06', `Balance ${raw} Credit Limit £0`, 'Previous searches']] });
    const extraction = { presentation_id: formats.gbFamily.FAMILY_ID,
      ...formats.gbFamily.extract(model, { admitted: true, presentation_evidence: false }) };
    check.equal(extraction.records[0].facts['account.balance'], expected,
      'the GB reader retains complete signed values and rejects damaged monetary readings');
    const evaluation = { country: 'GB', region: 'GB-ENG', results: [],
      common_errors: common.runCommonErrorChecks({ extraction }) };
    check.equal(issues.issuesFor({ extraction, evaluation }).some((item) => item.check_id === REVOLVING), expected > 0,
      'the GB zero-limit rule requires a supported positive balance');
  }
  for (const [started, expected] of [['1 January 2020', '2020-01-01'], ['01/01/20 unreadable', undefined]]) {
    const model = formats.makeSyntheticModel({ pages: [['Credit account information', 'C1 Fictional Consumer',
      'FICTIONAL CREDIT CARD', `Started ${started} Settled 1 January 2019`]] });
    const extraction = { presentation_id: formats.gbFamily.FAMILY_ID,
      ...formats.gbFamily.extract(model, { admitted: true, presentation_evidence: false }) };
    check.equal(extraction.records[0].facts['liability.openedDate'], expected,
      'complete date readings preserve multiword dates and reject damaged trailing text');
    const evaluation = { country: 'GB', region: 'GB-ENG', results: [],
      common_errors: common.runCommonErrorChecks({ extraction }) };
    check.equal(issues.issuesFor({ extraction, evaluation }).some((item) =>
      item.check_id === 'COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY'), expected != null,
      'a valid complete lifecycle date reaches its rule while damaged date text cannot');
  }

  for (const [balance, expected] of [['-$273.00', -273], ['$-273.00', -273], ['($273.00)', -273], ['+$273.00', 273],
    ['$1,234.50 as of 06/03/2015', 1234.5], ['unreadable0', undefined], ['$1,00', undefined]]) {
    const read = us.read(t, [{ balance, status: 'Paid in full', pastDue: '$0.00', limit: '$0.00' }]);
    check.equal(read.extraction.records[0].facts['account.balance'], expected, 'the US native reader retains sign and rejects damaged numbers');
    const assessed = us.offered(read.extraction);
    check.equal(assessed.findings.some((item) => item.check_id === PAID || item.check_id === REVOLVING),
      expected > 0, 'credit balances and unusable readings cannot become positive-balance violations');
  }
  const native = us.read(t, [{ balance: '$1,234.50 as of 06/03/2015', limit: '$0.00' }]);
  check.deepEqual(native.extraction.records[0].report_reference_date.normalized_value,
    native.extraction.reference_date.normalized_value, 'the US account retains its own sourced report date');
  check.equal(native.extraction.records[0].report_reference_date.trusted, true,
    'the report date comes from readable own-header geometry');
  const rejectedReference = us.read(t, [{}], (model) => {
    for (const word of model.pages[0].word_boxes) if (word.y0 < 40 && /2026/.test(word.text)) word.trusted = false;
  });
  check.equal(rejectedReference.extraction.records[0].report_reference_date.trusted, false,
    'an untrusted date word cannot supply shared report-date evidence');
  check.equal(common.usableField(rejectedReference.extraction.records[0], 'report.referenceDate'), false,
    'the coverage inventory also rejects the untrusted report-date source');
  const adverseInput = [{ extras: [{ label: 'Payment history guide', value: '30 days past due as of Jun 2010', x: 40 }] }];
  const trustedAdverse = us.offered(us.read(t, adverseInput).extraction);
  check.ok(trustedAdverse.findings.some((finding) => finding.adapter_id === 'FCRA-605A-5-US-NATIONAL-7Y'
    && finding.eligible), 'a trusted own report date retains the supported report-period issue');
  const rejectedAdverse = us.offered(us.read(t, adverseInput, (model) => {
    for (const word of model.pages[0].word_boxes) if (word.y0 < 40 && /2026/.test(word.text)) word.trusted = false;
  }).extraction);
  check.equal(rejectedAdverse.findings.some((finding) => finding.adapter_id === 'FCRA-605A-5-US-NATIONAL-7Y'
    && finding.eligible), false, 'an explicitly rejected own report date cannot fall back to the legacy global date');
  for (const prefix of ['\u0096', '\u0097']) {
    const read = us.read(t, [{ balance: `${prefix}273.00`, status: 'Paid in full', limit: '$0.00', pastDue: '$0.00' }]);
    check.equal(read.extraction.records[0].facts['account.balance'], undefined,
      'native WinAnsi dash-prefixed money remains unresolved instead of becoming positive debt');
    check.equal(us.offered(read.extraction).findings.some((finding) => [PAID, REVOLVING].includes(finding.check_id)), false,
      'a damaged native monetary sign produces no positive-balance violation');
  }
  const numeric = us.offered(native.extraction);
  const zeroLimit = numeric.findings.find((item) => item.check_id === REVOLVING);
  check.ok(zeroLimit?.eligible, 'a complete amount with the measured as-of annotation preserves the supported US rule');
  const nativePacket = download({ extraction: native.extraction,
    evaluation: numeric.assessed }, zeroLimit);
  check.ok(nativePacket.includes('Cedar Bank') && nativePacket.includes('$1,234.50 as of 06/03/2015')
    && nativePacket.includes('$0.00') && nativePacket.includes('Please check the credit limit and balance')
    && nativePacket.includes('report page 1'),
  'the selected numeric breach reaches a human request with its own measured amount, limit, account and page');
  for (const [raw, expected] of [['−$100', -100], ['–$100', null], ['—$100', null]])
    check.equal(amounts.printedAmount(formats.usFamily.sanitizeValue(raw)), expected,
      'a sign-like prefix cannot be stripped to turn credit or uncertainty into positive debt');
  return { scope: 'complete PR status/balance bridge and signed complete US native amount readings',
    boundaries: 'shared facts retain legacy statutory scope; malformed, duplicate, untrusted and cross-record sources rejected' };
}

module.exports = { run, id: 'dk-reader-completion-integration', title: 'Remaining reader mappings connected to sourced violations and approved packets' };
