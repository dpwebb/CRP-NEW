'use strict';
const { packetText } = require('../packet-pdf-assertions.cjs');

// Source-shaped fictional inputs exercise existing Canadian readers; they do not enlarge admission.
const formats = require('../../formats.cjs');
const ca = require('../../ca-consumer-file-facts.cjs');
const tu = require('../../format-families/tu-ca-consumer.cjs');
const common = require('../../common-errors.cjs');
const issues = require('../../issues.cjs');
const packets = require('../../packets.cjs');
const fixtures = require('../../../../internal-validation/ca-ns-last-payment-six-year/tests/fixtures.cjs');
const { extractFacts } = require('../../../../internal-validation/ca-ns-last-payment-six-year/extraction.cjs');
const ADMISSION = { admitted: true, presentation_evidence: false,
  state: 'SYNTHETIC_STRUCTURAL_TEST_INPUT_NOT_A_REPORT' };
const HISTORY = 'COMMON-ERROR-PAYMENT-HISTORY-INCONSISTENCY';
const DATES = 'COMMON-ERROR-LAST-PAYMENT-OR-FIRST-DELINQUENCY-DATE';
const LEGEND = ['USUAL MANNER OF PAYMENT',
  '0 - Too new to rate; approved, but not used',
  '1 - Pays (or paid) within 30 days of billing pays account as agreed',
  '9 - Bad debt, placed for collection; skip', 'X - Unknown'];

function block(options = {}) {
  const head = ['Creditor Name', `${options.creditor || 'FICTIONAL CREDITOR'}                   Payment History`,
    `Reported Date ${options.reported || 'Oct 31, 2025'} Last Payment Date ${options.payment ?? 'Oct 03, 2025'}`,
    `Opened Date ${options.opened || 'Sep 03, 2020'} Posted Date Nov 02, 2025`,
    `Closed Date ${options.closed ?? ''} Charge Off Date ${options.chargeOff ?? ''} Account INSTALLMENT / INDIVIDUAL`,
    `First Delinquency Date ${options.delinquency ?? ''} Balloon Payment Date Type:`,
    ...(options.extraDates || []),
    `${' '.repeat(114)}Balloon${' '.repeat(20)}Narrative`,
    '   Date       Balance      Payment        Past Due        MOP           Terms      High Credit Credit Limit                       Charge Off',
    `${' '.repeat(114)}Payment${' '.repeat(23)}1/2`];
  const table = tu.tableColumns(head.map((text, i) => ({ page: 1, line: i + 1, text })));
  const rows = (options.rows || [{ period: 'Oct 2025', mop: '1', balance: '100', past_due: '0' }])
    .map(({ period, ...cells }) => {
      const placements = [{ end: 10, value: period }, ...Object.entries(cells)
        .filter(([, value]) => value != null).map(([key, value]) => ({
          end: table.columns.find((column) => column.key === key).edge, value: String(value)
        }))].sort((a, b) => a.end - b.end);
      let row = '';
      for (const { end, value } of placements) row += ' '.repeat(Math.max(0, end - value.length - row.length)) + value;
      return row;
    });
  return head.concat(rows);
}

function read(blocks, options = {}) {
  const page = ['This disclosure is as of Nov 02, 2025.', 'Account(s)', ...blocks.flat()];
  const model = formats.makeSyntheticModel({ pages: options.separateLegend ? [page, options.legend || LEGEND]
    : [page.concat(options.legend || LEGEND)] });
  if (options.unreadLegend) model.read_errors = [{ stage: 'pdftotext', page: 2 }];
  const extraction = { presentation_id: tu.FAMILY_ID, family_id: tu.FAMILY_ID, bureau: 'TransUnion',
    ...tu.extract(model, ADMISSION) };
  const evaluation = { country: 'CA', region: 'CA-MB', presentation: tu.FAMILY_ID, results: [],
    common_errors: common.runCommonErrorChecks({ extraction }) };
  return { extraction, evaluation, findings: issues.issuesFor({ extraction, evaluation }) };
}

function findings(ctx, id) { return ctx.findings.filter((issue) => issue.check_id === id); }

function approvedPacket(ctx, issue) {
  const actor = { account_id: 'fictional-owner' }, caseId = 'fictional-ca-case';
  const state = { cases: [{ case_id: caseId, account_id: actor.account_id }],
    results: [{ ...ctx, case_id: caseId, account_id: actor.account_id, result_id: 'fictional-result' }], packets: [] };
  const store = { state: () => state, update: (fn) => fn(state) };
  packets.selectIssues(store, actor, caseId, [issue.issue_id]);
  packets.setCorrespondence(store, actor, caseId, { consumer_name: 'Fictional Consumer', contact: 'fictional@example.test' });
  packets.approvePacket(store, actor, caseId);
  return packetText(packets.packetDownload(store, actor, caseId));
}

async function run(t, check) {
  // PR-01 keeps full status phrases but leaves amounts, dates and identifier privacy unchanged.
  for (const phrase of ['PAID AS AGREED', 'Paid As Agreed / Never Late', 'PAID IN FULL', 'SETTLED IN FULL',
    'SETTLED', 'UNPAID', 'CURRENT']) {
    const model = fixtures.specimen({ records: [fixtures.recordLines({ extraLines: [`Status ${phrase}`] })] });
    const record = ca.read(model).records[0];
    check.equal(record.printed.Status.raw, phrase, 'the complete status phrase is retained without paid-in-full inference');
    check.equal(record.printed.Status.state, 'VALUE', 'the existing printed-value state is retained');
    check.equal(record.printed.Status.location.label, 'Status', 'the status retains its exact caption location');
    check.equal(record.printed.Balance.raw, '1000', 'the balance token remains independent');
    check.equal(record.printed['Last Payment Date'].normalized, '2021-02-01', 'the payment-date reading is unchanged');
    check.equal(record.printed['Account Number'].raw, null, 'account numbers are still discarded before return');
  }
  const combined = ca.read(fixtures.specimen({ records: [fixtures.recordLines({
    extraLines: ['Status PAID AS AGREED Balance 1000'] })] })).records[0];
  check.equal(combined.printed.Status.raw, 'PAID AS AGREED', 'a following measured caption does not become part of the status');
  const blank = ca.read(fixtures.specimen({ records: [fixtures.recordLines({ extraLines: ['Status'] })] })).records[0];
  check.equal(blank.printed.Status.state, 'LABEL_PRINTED_WITHOUT_VALUE', 'a printed blank status remains blank');
  const absent = ca.read(fixtures.specimen()).records[0];
  check.equal(absent.printed.Status.state, 'NOT_PRINTED', 'an absent status remains distinct from a blank');
  const repeated = ca.read(fixtures.specimen({ records: [fixtures.recordLines({
    extraLines: ['Status PAID IN FULL', 'Status UNPAID'] })] })).records[0];
  check.equal(repeated.printed.Status.printed_times_in_record, 2, 'repeated status captions remain visible for the shared bridge to reject');
  const unreadModel = fixtures.specimen({ records: [fixtures.recordLines({ extraLines: ['Status PAID AS AGREED'] })] });
  unreadModel.read_errors = [{ stage: 'pdftotext', page: 16 }];
  check.deepEqual(ca.read(unreadModel).records, [], 'an unread collection section supplies no resolved status phrase');

  // Money values must reach the strict shared bridge without truncating signs or damaged trailing text.
  for (const [rawValue, expected] of [['$ 100', 100], ['$ -100', -100], ['( $ 100 )', -100],
    ['100 garbage', undefined], ['$ 1,00', undefined]]) {
    const lines = fixtures.recordLines({ extraLines: ['Status PAID IN FULL'] })
      .map((line) => /^(?:Balance|Amount)(?:\s|$)/.test(line) ? `${line.split(' ')[0]} ${rawValue}` : line);
    const model = fixtures.specimen({ records: [lines] }), view = ca.read(model);
    const extraction = { presentation_id: 'PR-01', ...formats.normalizeExtraction(
      extractFacts(model, null, { synthetic_test_input: true }), view) };
    const evaluation = { country: 'CA', region: 'CA-MB', results: [],
      common_errors: common.runCommonErrorChecks({ extraction }) };
    const ctx = { extraction, evaluation, findings: issues.issuesFor({ extraction, evaluation }) };
    for (const [caption, field] of [['Balance', 'account.balance'], ['Amount', 'account.amount']]) {
      check.equal(view.records[0].printed[caption].raw, rawValue, 'the complete money reading reaches validation');
      check.equal(extraction.records[0].facts[field], expected, 'only the complete valid reading maps its signed amount');
    }
    const paid = findings(ctx, 'COMMON-ERROR-PAID-SETTLED-SHOWN-UNPAID');
    check.equal(paid.length, expected > 0 ? 1 : 0, 'credit or damaged balances cannot produce the paid-in-full violation');
    if (expected > 0) {
      check.equal(issues.publicIssue(paid[0]).consumer_label, 'VIOLATION', 'a valid spaced monetary value supports the existing breach');
      check.equal(paid[0].source_facts.find((fact) => fact.field === 'account.balance').raw_value, rawValue,
        'the violation retains the complete amount source');
      check.ok(approvedPacket(ctx, paid[0]).includes(rawValue), 'the approved packet retains the spaced printed amount');
    }
  }
  for (const caption of ['Balance', 'Amount']) {
    const record = ca.read(fixtures.specimen({ records: [fixtures.recordLines({})
      .map((line) => line.startsWith(`${caption} `) ? `${caption} $ 100 Status PAID IN FULL` : line)] })).records[0];
    check.equal(record.printed[caption].raw, '$ 100', 'a following measured caption is not monetary trailing text');
  }

  // The TU legend keeps its own location and definition, including a report-defined Unknown/non-rating code.
  const history = read([block({ rows: [{ period: 'Oct 2025', mop: '1' }, { period: 'Oct 2025', mop: '9' }] })]);
  const record = history.extraction.records[0];
  check.deepEqual(record.facts['account.paymentHistoryLegend'].map(({ code, meaning }) => [code, meaning]),
    [['0', LEGEND[1].slice(4)], ['1', LEGEND[2].slice(4)], ['9', LEGEND[3].slice(4)], ['X', 'Unknown']],
    'the shared history legend contains only the report-printed definitions');
  for (const definition of record.facts['account.paymentHistoryLegend']) {
    check.ok(definition.raw.includes(`${definition.code} - ${definition.meaning}`), 'each definition retains its printed reading');
    check.equal(definition.location.label, 'USUAL MANNER OF PAYMENT', 'the definition retains the report legend caption');
    check.ok(definition.location.page > 0 && definition.location.line > 0, 'the definition retains page and line');
  }
  const [historyIssue] = findings(history, HISTORY);
  check.equal(historyIssue?.classification, 'PROBABLE_VIOLATION', 'known contradictory same-period performance remains supported');
  check.equal(issues.publicIssue(historyIssue).consumer_label, 'VIOLATION', 'the supported history breach has the sole public term');
  const body = approvedPacket(history, historyIssue);
  check.match(body, /VIOLATION/, 'the existing approved history packet remains usable');
  check.ok(historyIssue.source_facts.every((fact) => body.includes(String(fact.raw_value))), 'the packet retains both printed codes');
  for (const code of ['X', '0', 'unrecognized']) {
    const ctx = read([block({ rows: [{ period: 'Oct 2025', mop: '1' }, { period: 'Oct 2025', mop: code }] })]);
    const cell = ctx.extraction.records[0].facts['account.paymentHistoryCells'][1];
    check.equal(cell.code, code, 'the raw unknown/non-rating code is retained');
    check.equal(cell.uncertain, true, 'unknown, too-new and unrecognized codes are unresolved performance');
    check.deepEqual(findings(ctx, HISTORY), [], 'unresolved performance cannot contradict the resolved payment rating');
  }
  const noLegend = read([block({ rows: [{ period: 'Oct 2025', mop: '1' }, { period: 'Oct 2025', mop: '9' }] })], { legend: [] });
  check.deepEqual(noLegend.extraction.records[0].facts['account.paymentHistoryLegend'], [], 'a missing legend supplies no definitions');
  check.deepEqual(findings(noLegend, HISTORY), [], 'an unprinted definition is never guessed');
  const unreadLegend = read([block({ rows: [{ period: 'Oct 2025', mop: '1' }, { period: 'Oct 2025', mop: '9' }] })],
    { separateLegend: true, unreadLegend: true });
  check.deepEqual(unreadLegend.extraction.records[0].facts['account.paymentHistoryLegend'], [], 'an unread legend supplies no trusted definition');
  check.deepEqual(findings(unreadLegend, HISTORY), [], 'unread legend text cannot establish a history conflict');
  const conflictLegend = read([block({ rows: [{ period: 'Oct 2025', mop: '1' }, { period: 'Oct 2025', mop: '9' }] })],
    { legend: [...LEGEND, '1 - Unknown'] });
  check.equal(conflictLegend.extraction.records[0].facts['account.paymentHistoryCells'][0].uncertain, true,
    'contradictory report definitions for one code cannot decode it');
  check.deepEqual(findings(conflictLegend, HISTORY), [], 'a contradictory definition is not an affirmative rating');
  check.equal(record.facts['account.status'], undefined, 'MOP1 is not current lifecycle status');
  check.equal(record.facts['account.masked_identifier'], undefined, 'the new legend does not supply account identity');

  // Existing date values acquire their exact own-caption sources even when another date has the same value.
  const sourced = read([block({ reported: 'Oct 31, 2025', payment: 'Oct 31, 2025', opened: 'Sep 03, 2020',
    closed: 'Oct 31, 2025', delinquency: 'Oct 31, 2025', chargeOff: 'Oct 31, 2025' })]);
  const dated = sourced.extraction.records[0], sources = formats.factSourcesForRecord(dated);
  for (const [field, caption] of [['liability.openedDate', 'Opened Date'], ['liability.closedDate', 'Closed Date'],
    ['tradeline.lastPaymentDate', 'Last Payment Date'], ['tradeline.firstDelinquencyDate', 'First Delinquency Date'],
    ['tradeline.chargeOffDate', 'Charge Off Date']]) {
    check.equal(sources[field].source_field, caption, 'equal date values do not substitute another caption\'s source');
    check.equal(sources[field].raw_value, dated.printed[caption].raw, 'the exact own printed date is retained');
    check.deepEqual(sources[field].location, dated.printed[caption].location, 'the date retains its own caption location');
  }
  for (const [first, second] of [['Jan 01, 2027', 'Oct 03, 2025'], ['Oct 03, 2025', 'Jan 01, 2027'],
    ['Jan 01, 2027', 'Jan 01, 2027']]) {
    const ctx = read([block({ payment: first, extraDates: [`Last Payment Date ${second}`] })]);
    const r = ctx.extraction.records[0], reading = r.printed['Last Payment Date'];
    check.equal(reading.state, 'VALUE_AMBIGUOUS_PRINTED_FORM', 'multiple same-record date captions cannot choose a resolved occurrence');
    check.deepEqual(reading.printed_readings.map((item) => item.raw), [first, second], 'every printed reading is retained with its original order');
    check.equal(reading.printed_readings.every((item) => item.location?.page > 0 && item.location?.line > 0), true,
      'ambiguous readings retain their separate caption locations');
    check.equal(r.facts['tradeline.lastPaymentDate'], undefined, 'no one date is silently chosen for the shared fact');
    check.equal(r.fact_sources['tradeline.lastPaymentDate'], undefined, 'no resolved source is fabricated for the ambiguous date');
    check.deepEqual(findings(ctx, DATES), [], 'neither caption order can create the future-payment violation');
  }
  const independent = read([block({ payment: 'Jan 01, 2027', extraDates: ['Last Payment Date Oct 03, 2025'],
    delinquency: 'Jan 01, 2027', rows: [{ period: 'Oct 2025', mop: '1', balance: '100', past_due: '200' }] })]);
  check.deepEqual(findings(independent, DATES).map((issue) => issue.evidence.field), ['first_delinquency'],
    'an independent resolved delinquency conflict survives the ambiguous payment caption');
  check.equal(independent.findings.some((issue) => issue.check_id === 'COMMON-ERROR-BALANCE-PAYMENT-INCONSISTENCY'), true,
    'independent sourced numeric checks remain usable');
  const neighbors = read([block({ payment: 'Jan 01, 2027', extraDates: ['Last Payment Date Oct 03, 2025'] }),
    block({ creditor: 'FICTIONAL NEIGHBOR', payment: 'Jan 01, 2027' })]);
  check.deepEqual(findings(neighbors, DATES).map((issue) => issue.record_index), [2],
    'one account\'s ambiguous caption does not suppress its neighbor\'s supported date issue');
  const partial = read([block({ payment: 'Nov 2027' })]).extraction.records[0];
  check.equal(partial.printed['Last Payment Date'].state, 'VALUE_PRINTED_WITHOUT_A_DAY', 'a partial date retains the existing precision boundary');
  check.equal(partial.fact_sources['tradeline.lastPaymentDate'], undefined, 'the source mapping does not invent a day');
  return { inputs: 'fictional downstream PR-01/TU-CA layout models; no admission change or private specimen dependency',
    repaired: ['complete PR-01 status and money caption values', 'TU sourced legend and unknown-rating handling',
      'TU duplicate date ambiguity and exact own-caption date sources'] };
}

module.exports = { run, id: 'dh-ca-reader-completion', title: 'Canadian complete status/money and sourced history/date ambiguity controls' };
