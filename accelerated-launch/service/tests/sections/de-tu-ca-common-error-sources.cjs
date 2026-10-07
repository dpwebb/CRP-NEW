'use strict';

// Fictional downstream reader inputs exercise the measured TU-CA layout, not report admission.
// No private specimen is needed, and the production presentation predicates remain unchanged.
const formats = require('../../formats.cjs');
const tu = require('../../format-families/tu-ca-consumer.cjs');
const common = require('../../common-errors.cjs');
const issues = require('../../issues.cjs');
const packets = require('../../packets.cjs');

const ZERO_LIMIT = 'COMMON-ERROR-REVOLVING-BALANCE-ZERO-LIMIT';
const FUTURE_DATE = 'COMMON-ERROR-LAST-PAYMENT-OR-FIRST-DELINQUENCY-DATE';
const ADMISSION = { admitted: true, presentation_evidence: false,
  state: 'SYNTHETIC_STRUCTURAL_TEST_INPUT_NOT_A_REPORT' };
const NUMERIC_FIELDS = [
  ['account.balance', 'balance', 'Balance'],
  ['account.pastDueAmount', 'past_due', 'Past Due'],
  ['account.paymentAmount', 'payment', 'Payment'],
  ['account.amount', 'high_credit', 'High Credit'],
  ['account.creditLimit', 'credit_limit', 'Credit Limit']
];

function accountBlock(options = {}) {
  const head = [
    'Creditor Name',
    `${options.creditor || 'FICTIONAL CREDITOR'}                         Payment History`,
    `Reported Date Oct 31, 2025 Last Payment Date ${options.paymentDate ?? 'Oct 03, 2025'}`,
    'Opened Date Sep 03, 2020 Posted Date Nov 02, 2025',
    `Closed Date Charge Off Date${options.accountType === null ? ''
      : ` Account ${options.accountType || 'REVOLVING'} / ${options.responsibility || 'INDIVIDUAL'}`}`,
    'First Delinquency Date Balloon Payment Date Type:',
    `${' '.repeat(114)}Balloon${' '.repeat(20)}Narrative`,
    '   Date       Balance      Payment        Past Due        MOP           Terms      High Credit Credit Limit                       Charge Off',
    `${' '.repeat(114)}Payment${' '.repeat(23)}1/2`
  ];
  const table = tu.tableColumns(head.map((text, index) => ({ page: 1, line: index + 1, text })));
  const rows = options.rows || [{ period: 'Oct 2025', balance: '100', payment: '0', past_due: '0',
    high_credit: '100', credit_limit: '0', mop: '1' }];
  const lines = rows.map(({ period = 'Oct 2025', ...cells }) => {
    const placements = [{ end: 10, value: period }, ...Object.entries(cells).filter(([, value]) => value != null)
      .map(([cell, value]) => ({ end: table.columns.find((column) => column.key === cell).edge,
        value: String(value) }))].sort((a, b) => a.end - b.end);
    let line = '';
    for (const { end, value } of placements) line += ' '.repeat(Math.max(0, end - value.length - line.length)) + value;
    return line;
  });
  if (options.noTableHeader) head[7] = 'The monthly table heading cannot be read';
  return head.concat(lines, ['Legend: AC-Account closed/rating non derogatory']);
}

function read(blocks, options = {}) {
  const reference = options.reference === undefined ? ['This disclosure is as of Nov 02, 2025.'] : options.reference;
  const model = formats.makeSyntheticModel({ pages: [[...reference, 'Account(s)', ...blocks.flat()]] });
  if (options.unread) model.read_errors = [{ stage: 'pdftotext', page: 1 }];
  const extraction = { presentation_id: tu.FAMILY_ID, family_id: tu.FAMILY_ID, bureau: 'TransUnion',
    ...tu.extract(model, ADMISSION) };
  const evaluation = { country: 'CA', region: 'CA-MB', presentation: tu.FAMILY_ID, results: [],
    common_errors: common.runCommonErrorChecks({ extraction }) };
  return { extraction, evaluation, findings: issues.issuesFor({ extraction, evaluation }) };
}

function selected(ctx, checkId) { return ctx.findings.filter((issue) => issue.check_id === checkId); }

function packetStore(ctx) {
  const state = { cases: [{ case_id: 'fictional-tu-case', account_id: 'fictional-owner', country: 'CA', region: 'CA-MB' }],
    results: [{ ...ctx, case_id: 'fictional-tu-case', account_id: 'fictional-owner', result_id: 'fictional-result' }],
    packets: [] };
  return { state: () => state, update: (fn) => fn(state) };
}

function approveAndDownload(ctx, issue, check) {
  const store = packetStore(ctx), actor = { account_id: 'fictional-owner' }, caseId = 'fictional-tu-case';
  packets.selectIssues(store, actor, caseId, [issue.issue_id]);
  check.equal(packets.packetView(store, actor, caseId).eligible_issues
    .find((item) => item.issue_id === issue.issue_id)?.consumer_label, 'VIOLATION',
  'the existing packet selection uses the sole public breach term');
  packets.setCorrespondence(store, actor, caseId, { consumer_name: 'Fictional Consumer', contact: 'fictional@example.test' });
  packets.approvePacket(store, actor, caseId);
  const body = packets.packetDownload(store, actor, caseId).body;
  check.match(body, /VIOLATION/, 'the approved packet names the supported breach');
  check.ok(body.includes(issue.rule_assessment.requirement), 'the packet carries the existing report-data requirement');
  check.match(body, /verify|verification/i, 'the supported uncertain issue retains a verification request');
  for (const fact of issue.source_facts) {
    check.ok(body.includes(String(fact.raw_value)), 'the packet includes the decisive printed reading');
    check.ok(body.includes(`page ${fact.location.page}, line ${fact.location.line}`),
      'the packet includes the decisive reading\'s source location');
  }
  return { store, actor, caseId, body };
}

async function run(t, check) {
  const positive = read([accountBlock()]), record = positive.extraction.records[0];
  for (const [field, cell, caption] of NUMERIC_FIELDS) {
    const source = record.fact_sources[field];
    check.equal(source.raw_value, record.monthly_rows[0].cells[cell], `${caption} retains its own printed cell`);
    check.equal(source.normalized_value, record.facts[field], `${caption} retains its own numeric value, including zero`);
    check.equal(source.source_field, caption, 'equal numeric values keep separate caption identities');
    check.deepEqual(source.location, { ...record.monthly_rows[0].location, label: caption },
      'each numeric source comes from the same latest row');
    check.equal(source.record_index, record.record_index, 'the source belongs to its account');
  }
  check.deepEqual(record.fact_sources['account.responsibility'], {
    raw_value: 'REVOLVING / INDIVIDUAL', normalized_value: 'INDIVIDUAL', source_field: 'Account Type',
    location: record.printed['Account Type'].location, record_index: 1
  }, 'responsibility keeps the full combined printed reading and its own location');
  check.deepEqual(record.report_reference_date, positive.extraction.reference_date,
    'the account keeps the full resolved report-date reading');
  check.equal(record.facts['account.status'], undefined, 'neither repayment nor historical closure becomes current status');
  check.equal(record.facts['account.masked_identifier'], undefined, 'no account identifier is guessed');

  const [zeroIssue] = selected(positive, ZERO_LIMIT);
  check.equal(zeroIssue?.classification, 'POTENTIAL_VIOLATION', 'the existing zero-limit rule receives its decisive sources');
  check.equal(zeroIssue?.confidence, 'POTENTIAL', 'source linkage preserves the existing evidence threshold');
  check.equal(issues.publicIssue(zeroIssue).consumer_label, 'VIOLATION', 'the consumer term is VIOLATION');
  check.deepEqual(zeroIssue.source_facts.map((fact) => fact.source_field), ['Account Type', 'Balance', 'Credit Limit'],
    'the rule uses the type caption and both exact numeric columns');
  check.equal(zeroIssue.source_facts.every((fact) => fact.location?.page > 0 && fact.location?.line > 0), true,
    'all three decisive readings have locations');
  const packet = approveAndDownload(positive, zeroIssue, check);
  record.fact_sources['account.creditLimit'].location.line += 1;
  let changedSourceError = null;
  try { packets.packetDownload(packet.store, packet.actor, packet.caseId); }
  catch (error) { changedSourceError = error.code; }
  check.equal(changedSourceError, 'PACKET_APPROVAL_STALE', 'changed numeric provenance invalidates reviewed approval');

  const benign = read([accountBlock({ rows: [{ balance: '100', credit_limit: '300', past_due: '0' }] })]);
  check.deepEqual(selected(benign, ZERO_LIMIT), [], 'a positive limit produces no zero-limit issue');
  check.equal(benign.evaluation.common_errors.performed.find((item) => item.check_id === ZERO_LIMIT)?.state,
    'NOT_DETECTED', 'the benign comparison is recorded as performed');
  for (const options of [
    { rows: [{ balance: '0', credit_limit: '0', past_due: '0' }] },
    { rows: [{ balance: '100', past_due: '0' }] },
    { rows: [{ balance: '100', credit_limit: 'unreadable', past_due: '0' }] },
    { rows: [{ balance: '100', credit_limit: 'unreadable0', past_due: '0' }] },
    { accountType: null }, { noTableHeader: true }, { accountType: 'OPEN' }
  ]) check.deepEqual(selected(read([accountBlock(options)]), ZERO_LIMIT), [],
    'zero balance, absent/malformed limit, missing type/header and open account type do not manufacture an issue');
  for (const [raw, value] of [['$1,000.50', 1000.5], ['+1,000.50', 1000.5], ['-$100.00', -100], ['$-100.00', -100]]) {
    const ctx = read([accountBlock({ rows: [{ balance: raw, credit_limit: '3000' }] })]);
    check.equal(ctx.extraction.records[0].facts['account.balance'], value,
      'a complete signed/currency/comma cell keeps its amount and sign');
    check.equal(ctx.extraction.records[0].fact_sources['account.balance'].raw_value, raw,
      'the numeric source retains the exact complete printed cell');
  }
  const negative = read([accountBlock({ rows: [{ balance: '-$100.00', credit_limit: '0' }] })]);
  check.deepEqual(selected(negative, ZERO_LIMIT), [], 'a printed credit balance is not converted to a positive balance');
  check.equal(negative.evaluation.common_errors.performed.find((item) => item.check_id === ZERO_LIMIT)?.state,
    'NOT_DETECTED', 'the signed amount remains usable in the benign zero-limit comparison');
  for (const raw of ['unreadable0', '10,00', '$', '', '100abc']) {
    const ctx = read([accountBlock({ rows: [{ balance: '100', credit_limit: raw }] })]);
    check.equal(ctx.extraction.records[0].facts['account.creditLimit'], undefined,
      'a malformed or empty cell does not manufacture a numeric limit');
    check.equal(ctx.extraction.records[0].fact_sources['account.creditLimit'], undefined,
      'a malformed or empty cell supplies no normalized field source');
    check.deepEqual(selected(ctx, ZERO_LIMIT), [], 'embedded digits cannot establish the zero-limit breach');
  }
  const rows = read([accountBlock({ rows: [{ period: 'Oct 2025', balance: '100', credit_limit: '300' },
    { period: 'Sep 2025', balance: '200', credit_limit: '0' }] })]);
  check.deepEqual(selected(rows, ZERO_LIMIT), [], 'an older zero limit is not the latest account snapshot');
  check.equal(rows.extraction.records[0].fact_sources['account.creditLimit'].raw_value, '300',
    'the latest limit source is retained rather than the historical zero');
  const missingLatest = read([accountBlock({ rows: [{ period: 'Oct 2025', balance: '100' },
    { period: 'Sep 2025', balance: '200', credit_limit: '0' }] })]);
  check.equal(missingLatest.extraction.records[0].fact_sources['account.creditLimit'], undefined,
    'a missing latest limit has no borrowed historical source');
  check.deepEqual(selected(missingLatest, ZERO_LIMIT), [], 'a historical value does not repair the missing latest field');
  const neighbors = read([accountBlock({ creditor: 'FICTIONAL FIRST', rows: [{ credit_limit: '0' }] }),
    accountBlock({ creditor: 'FICTIONAL SECOND', rows: [{ balance: '100', credit_limit: '300' }] })]);
  check.deepEqual(selected(neighbors, ZERO_LIMIT), [], 'one account\'s balance is not paired with its neighbor\'s limit');

  const future = read([accountBlock({ paymentDate: 'Jan 01, 2027' }), accountBlock({ creditor: 'FICTIONAL BENIGN' })]);
  const [futureIssue] = selected(future, FUTURE_DATE);
  check.deepEqual(selected(future, FUTURE_DATE).map((issue) => issue.record_index), [1],
    'the future payment concern stays on its owning account');
  check.equal(futureIssue.classification, 'PROBABLE_VIOLATION', 'the existing future-payment rule reaches its assessment');
  check.equal(futureIssue.confidence, 'PROBABLE', 'the date mapping preserves confidence');
  check.deepEqual(futureIssue.source_facts.map((fact) => [fact.field, fact.raw_value]),
    [['report.referenceDate', 'Nov 02, 2025'], ['tradeline.lastPaymentDate', 'Jan 01, 2027']],
    'the issue keeps both decisive dates, without an unrelated opening-date substitution');
  check.equal(common.formatCapability(future.extraction).all_factual_checks[FUTURE_DATE].field_ready, true,
    'per-report capability sees the sourced report reference on the same account');
  approveAndDownload(future, futureIssue, check);
  for (const paymentDate of ['Nov 02, 2025', 'Nov 01, 2025', '', 'unreadable', 'Nov 2027'])
    check.deepEqual(selected(read([accountBlock({ paymentDate })]), FUTURE_DATE), [],
      'on/before report dates and unresolved event readings do not become future-date issues');
  for (const reference of [[], ['This disclosure is as of Nov 32, 2025.'],
    ['This disclosure is as of Nov 02, 2025.', 'It also says as of Nov 03, 2025.']]) {
    const ctx = read([accountBlock({ paymentDate: 'Jan 01, 2027' })], { reference });
    check.equal(ctx.extraction.records[0].report_reference_date, undefined, 'unresolved report dates are not attached as facts');
    check.deepEqual(selected(ctx, FUTURE_DATE), [], 'a missing, impossible or contradictory reference cannot establish a future event');
  }
  const unread = read([accountBlock({ paymentDate: 'Jan 01, 2027' })], { unread: true });
  check.deepEqual(unread.extraction.records[0].fact_sources, {}, 'unread account material supplies no numeric sources');
  check.deepEqual(unread.findings, [], 'unread account captions and cells supply no issue');
  check.equal(positive.evaluation.common_errors.performed.some((item) => item.check_id === 'COMMON-ERROR-POTENTIAL-RE-AGING-SIGNAL'),
    false, 'source linkage does not activate an unsupported re-aging predicate');
  return { inputs: 'fictional TU-CA layout models, downstream only; production admission unchanged',
    fields: NUMERIC_FIELDS.map(([field]) => field).concat('account.responsibility', 'report.referenceDate'),
    outcomes: 'existing zero-limit and future-date rules -> VIOLATION -> selected, approved verification packets' };
}

module.exports = { run, id: 'de-tu-ca-common-error-sources',
  title: 'TU Canada exact numeric/responsibility sources and report-date issue/packet linkage' };
