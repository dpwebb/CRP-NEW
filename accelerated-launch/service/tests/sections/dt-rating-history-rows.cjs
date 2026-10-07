'use strict';

/* Batch 56G: fictional physical PDFs, read by native Poppler bbox extraction. The official TU web sample
 * supplies semantic row-label examples only; these fixtures do not admit a genuine TU PDF layout/family. */
const fs = require('node:fs');
const path = require('node:path');
const formats = require('../../formats.cjs');
const general = require('../../general-intake.cjs');
const grid = require('../../payment-history-grid.cjs');
const common = require('../../common-errors.cjs');
const evaluation = require('../../evaluation.cjs');
const issues = require('../../issues.cjs');
const { buildWordPdf } = require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');
const HISTORY = 'COMMON-ERROR-PAYMENT-HISTORY-INCONSISTENCY';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
let sequence = 0;

function ratingWords(options = {}) {
  const opts = { year: '2024', months: MONTHS, codes: ['OK', 'OK', 'OK', '30', 'OK', 'OK'],
    category: true, rating: true, financial: true, legend: [{ code: 'OK', meaning: 'Current' },
      { code: '30', meaning: '30 Days Late' }], account: 'FICTIONAL CARD', header: true, base: 0,
    paymentDate: false, ...options };
  const words = [], put = (text, x, y) => words.push({ text, x, y: y + opts.base });
  if (opts.header) {
    words.push({ text: 'SYNTHETIC TEST INPUT - NOT A CREDIT REPORT', x: 40, y: 15 },
      { text: 'TransUnion Consumer Credit Report - FICTIONAL GRID TEST', x: 40, y: 32 },
      { text: 'Report Date: June 30, 2026', x: 40, y: 48 });
  }
  if (opts.account) put('Creditor ' + opts.account + ' Opened January 1, 2020', 40, 70);
  if (opts.paymentDate) put('Last Payment Made: June 16, 2024', 40, 87);
  put((opts.year == null ? '' : opts.year + ' ') + 'Payment History' + (opts.continued ? ' Continued' : ''), 40, 112);
  if (opts.category) put('Category:', 40, 135);
  opts.months.forEach((month, i) => { if (month != null) put(month, 130 + 37 * i, 135); });
  if (opts.financial) ['Balance:', 'Sched Paymnt:', 'Amount Paid:', 'Past Due:'].forEach((label, row) => {
    put(label, 40, 155 + 19 * row);
    opts.codes.forEach((code, i) => put(row === 0 ? '$100' : row === 3 ? '$0' : '$15', 130 + 37 * i, 155 + 19 * row));
  });
  const y = opts.financial ? 238 : 155;
  if (opts.rating) put('Rating:', 40, y);
  if (!opts.noCodes) opts.codes.forEach((code, i) => { if (code != null) put(code, 130 + 37 * i + (opts.offset || 0), y); });
  if (opts.legend !== false) {
    if (opts.equals) put('Key: ' + opts.legend.map((item) => item.code + '=' + item.meaning).join(' '), 40, y + 25);
    else {
      put('Ratings Key', 40, y + 25);
      opts.legend.forEach((item, i) => { put(item.code, 40, y + 42 + 17 * i); put(item.meaning, 90, y + 42 + 17 * i); });
    }
  }
  for (const word of opts.extraWords || []) words.push(word);
  return words;
}

function ratingPdf(options = {}, additionalPages = []) {
  return buildWordPdf([{ words: ratingWords(options) }, ...additionalPages.map((words) => ({ words }))],
    { font_size: 9, producer: 'CRP fictional rating-grid behavioral fixture', creator: 'CRP fictional test input' });
}

function read(t, options, amend, bytesOverride) {
  const bytes = bytesOverride || ratingPdf(options);
  fs.mkdirSync(t.dataDir, { recursive: true });
  const file = path.join(t.dataDir, 'dt-rating-history-' + ++sequence + '.pdf');
  fs.writeFileSync(file, bytes);
  const model = formats.buildPdfDocumentModel(file);
  if (amend) amend(model);
  const pages = general.collectPages(model);
  return { bytes, model, grids: grid.assembleGrids(pages),
    extraction: formats.extractWithSharedAdapter(model, { mode: 'REPORT', country: 'US' }) };
}

function cells(reading, index = 0) { return reading.extraction.records[index]?.facts['account.paymentHistoryCells'] || []; }
function matches(reading) {
  return common.runCommonErrorChecks({ extraction: reading.extraction }).performed
    .find((entry) => entry.check_id === HISTORY)?.source_records || [];
}
function offered(extraction) {
  const assessed = evaluation.evaluateCase({ country: 'US', region: 'US-NY', extraction });
  return { findings: issues.issuesFor({ extraction, evaluation: assessed }),
    public: issues.publicIssues({ extraction, evaluation: assessed }) };
}
function untrust(text, y) {
  return (model) => { for (const word of model.pages[0].word_boxes) {
    if (word.text === text && Math.abs(word.y0 - y) < 6) { word.trusted = false; word.confidence = 20; }
  } };
}

async function run(t, check) {
  const ordinary = read(t, {}), ordinaryCells = cells(ordinary);
  check.equal(ordinary.model.pages[0].has_native_text, true, 'the fictional physical PDF uses actual native text extraction');
  check.ok(ordinary.model.synthetic_markers_found.length > 0, 'the physical fixture visibly identifies itself as synthetic');
  check.equal(ordinary.extraction.presentation_id, 'GENERAL-BUREAU-REPORT', 'the existing general path reads the fixture without a TU family admission');
  check.equal(ordinary.extraction.records.length, 1, 'Rating and key captions create no extra account records');
  check.equal(ordinary.grids.length, 1, 'the labelled financial table produces its own single history grid');
  check.equal(ordinaryCells.length, 12, 'all twelve positioned month columns remain accounted for');
  check.deepEqual(ordinaryCells.slice(0, 6).map((cell) => cell.period), MONTHS.slice(0, 6).map((month) => month + ' 2024'),
    'the explicit own heading year anchors the month columns');
  check.deepEqual(ordinaryCells.slice(0, 6).map((cell) => cell.code), ['OK', 'OK', 'OK', '30', 'OK', 'OK'],
    'the Rating row supplies performance codes instead of financial amounts');
  check.ok(ordinaryCells.slice(0, 6).every((cell) => !cell.uncertain && cell.meaning && cell.performance_usable),
    'the grid resolves only its own readable printed key');
  check.ok(ordinaryCells.slice(6).every((cell) => cell.uncertain && cell.code === null && cell.reason === 'NO_CELL'),
    'unprinted later cells remain blank rather than missed payments');
  for (const cell of ordinaryCells.slice(0, 6)) {
    check.equal(cell.raw_period, cell.period_location.month.raw, 'raw_period names only the physically printed month');
    check.equal(cell.period_location.year.raw, '2024', 'the heading year retains its separate literal reading');
    check.ok(cell.location.trusted && cell.period_location.month.trusted && cell.period_location.year.trusted
      && cell.legend_location.trusted, 'code, month, heading year and key have their own trusted locations');
    check.ok(cell.location.page === 1 && cell.period_location.month.page === 1 && cell.period_location.year.page === 1
      && cell.printed_definition.heading_location.page === 1, 'all decisive locations belong to the same physical page');
    check.equal(cell.source_field, 'Rating:', 'the code records its actual printed row caption');
    check.equal(cell.period_location.month.source_field, 'Category:', 'the month records its actual printed header caption');
  }
  for (const field of ['tradeline.firstDelinquencyDate', 'tradeline.lastPaymentDate', 'liability.closedDate']) {
    check.equal(ordinary.extraction.records[0].facts[field], undefined, 'history cells never manufacture ' + field);
  }
  check.equal(matches(ordinary).length, 0, 'different month statuses in an ordinary table are benign');

  const positiveOptions = { months: ['May', 'May'], codes: ['OK', '30'], financial: false };
  const positive = read(t, positiveOptions);
  check.equal(matches(positive).length, 1, 'two physically distinct contradictory cells for one explicit dated period reach the checklist');
  check.equal(matches(positive)[0]?.evidence.period, 'May 2024', 'the predicate uses the grid year rather than the report date');
  const offeredPositive = offered(positive.extraction);
  const finding = offeredPositive.findings.find((item) => item.check_id === HISTORY);
  check.ok(finding, 'the history contradiction reaches an eligible finding');
  check.equal(offeredPositive.public.find((item) => item.issue_id === finding?.issue_id)?.consumer_label, 'VIOLATION',
    'the consumer sees the controlling violation term');
  check.equal(matches(read(t, { ...positiveOptions, codes: ['OK', 'OK'] })).length, 0, 'equivalent duplicated periods are benign');

  for (const code of ['X9', '[OK']) {
    const unknown = read(t, { ...positiveOptions, codes: ['30', code] });
    check.equal(cells(unknown)[1].raw_code, code, 'an unknown/damaged Rating reading remains literal');
    check.equal(cells(unknown)[1].uncertain, true, 'an unknown/damaged Rating reading stays unresolved');
    check.equal(matches(unknown).length, 0, 'an unknown/damaged code cannot create a contradiction');
  }
  for (const [code, meaning] of [['?', 'Unknown'], ['N/R', 'Not Reported']]) {
    const noData = read(t, { ...positiveOptions, codes: ['30', code], legend: [{ code: '30', meaning: '30 Days Late' }, { code, meaning }] });
    check.equal(cells(noData)[1].meaning, meaning, 'the grid preserves its own nonperformance key meaning');
    check.equal(cells(noData)[1].performance_usable, false, 'unknown/no-data meanings are not performance evidence');
    check.equal(matches(noData).length, 0, 'nonperformance codes cannot create a contradiction');
  }
  for (const [text, y] of [['2024', 112], ['Payment', 112], ['May', 135], ['Category:', 135],
    ['Rating:', 155], ['30', 155], ['Ratings', 180], ['Current', 197], ['30', 214]]) {
    const unread = read(t, positiveOptions, untrust(text, y));
    check.equal(matches(unread).length, 0, 'untrusted own ' + text + ' evidence cannot create a contradiction');
    check.ok(cells(unread).some((cell) => cell.uncertain), 'the untrusted ' + text + ' reading remains internally unresolved');
  }
  for (const year of [null, '0000', '2O24', '202', '2024 2025']) {
    const unread = read(t, { ...positiveOptions, year });
    check.ok(cells(unread).every((cell) => cell.period === null && cell.uncertain), 'absent/damaged/competing own years do not select a reporting date');
    check.equal(matches(unread).length, 0, 'the report date never repairs an unread own heading year');
  }
  const conflict = read(t, { ...positiveOptions, legend: [{ code: 'OK', meaning: 'Current' },
    { code: 'OK', meaning: '60 Days Late' }, { code: '30', meaning: '30 Days Late' }] });
  check.equal(cells(conflict)[0].reason, 'CONFLICTING_LEGEND', 'competing own key definitions remain unresolved');
  check.equal(matches(conflict).length, 0, 'a conflicting key cannot choose a convenient performance meaning');
  const missingKey = read(t, { ...positiveOptions, legend: false });
  check.ok(cells(missingKey).every((cell) => cell.uncertain && cell.meaning === null), 'a grid without its own key never borrows meanings');
  check.equal(matches(missingKey).length, 0, 'missing meanings do not create a contradiction');
  const displaced = read(t, { ...positiveOptions, offset: 22 });
  check.ok(cells(displaced).every((cell) => cell.uncertain), 'misaligned code glyphs do not shift into neighboring month columns');
  check.equal(matches(displaced).length, 0, 'misaligned codes cannot create a contradiction');
  const duplicateCells = read(t, { ...positiveOptions, extraWords: [{ text: '60', x: 167, y: 157 }] });
  check.ok(cells(duplicateCells).some((cell) => cell.reason === 'AMBIGUOUS_MULTIPLE_CELLS'), 'competing glyphs in one own column stay ambiguous');
  check.equal(matches(duplicateCells).length, 0, 'multiple own glyphs cannot choose a decisive cell');
  const repeatedHeader = read(t, { ...positiveOptions, extraWords: [{ text: 'Category:', x: 40, y: 146 },
    { text: 'May', x: 130, y: 146 }, { text: 'May', x: 167, y: 146 }] });
  check.equal(matches(repeatedHeader).length, 0, 'competing month rows cannot choose a decisive period');
  const financeOnly = read(t, { ...positiveOptions, financial: true, rating: false, noCodes: true });
  check.equal(financeOnly.grids.length, 0, 'a labelled financial table without Rating is not a payment-code grid');

  const neighbors = read(t, null, null, buildWordPdf([{ words: ratingWords({ ...positiveOptions, account: 'FICTIONAL A', legend: false })
    .concat(ratingWords({ ...positiveOptions, account: 'FICTIONAL B', base: 260, header: false })) }]));
  check.equal(neighbors.extraction.records.length, 2, 'neighboring Rating/key tables create exactly their two account records');
  check.ok(cells(neighbors, 0).every((cell) => cell.uncertain), 'account A never borrows account B printed key');
  check.ok(cells(neighbors, 1).every((cell) => !cell.uncertain), 'account B keeps its own printed key');
  const crossAccount = read(t, null, null, buildWordPdf([{ words: ratingWords({ months: ['May', 'Jun'], codes: ['OK', 'OK'], financial: false,
    account: 'FICTIONAL A' }).concat(ratingWords({ months: ['May', 'Jun'], codes: ['30', '30'], financial: false,
    account: 'FICTIONAL B', base: 260, header: false })) }]));
  check.equal(matches(crossAccount).length, 0, 'same month in different accounts is not a report-internal contradiction');
  const crossPage = read(t, {}, null, ratingPdf({}, [ratingWords({ ...positiveOptions, year: null,
    account: null, header: false, continued: true })]));
  check.ok(crossPage.grids[1].cells.every((cell) => cell.period === null && cell.period_location.year === null),
    'an explicit continuation never borrows page one heading year');
  const ownPage = read(t, {}, null, ratingPdf({}, [ratingWords({ ...positiveOptions, year: '2022', account: 'FICTIONAL B', header: false })]));
  check.ok(ownPage.grids[1].cells.every((cell) => cell.period === 'May 2022' && cell.period_location.year.page === 2),
    'a later page retains only its own explicit year sources');
  const globalKey = read(t, { ...positiveOptions, base: 60, legend: false, extraWords: [
    { text: 'Ratings Key', x: 40, y: 70 }, { text: 'OK', x: 40, y: 87 }, { text: 'Current', x: 90, y: 87 },
    { text: '30', x: 40, y: 104 }, { text: '30 Days Late', x: 90, y: 104 }] });
  check.ok(cells(globalKey).every((cell) => cell.uncertain), 'a report-wide key before the account is not silently borrowed');
  const legacy = read(t, { category: false, rating: false, equals: true });
  check.equal(cells(legacy).filter((cell) => !cell.uncertain).length, 6, 'existing bare code rows and equals keys remain supported');

  const owner = await t.account('dt-rating-owner@example.test');
  const created = await t.request('POST', '/api/cases', { token: owner.token, body: { country: 'US', region: 'US-NY' } });
  const endpoint = '/api/cases/' + created.json.case.case_id;
  check.equal((await t.request('POST', endpoint + '/files', { token: owner.token, body: {
    originalFilename: 'fictional-dated-rating-grid.pdf', declaredBytes: positive.bytes.length, mimeType: 'application/pdf',
    contentBase64: positive.bytes.toString('base64') } })).status, 201, 'the labelled physical table enters the ordinary upload route');
  check.equal((await t.request('POST', endpoint + '/evaluate', { token: owner.token })).status, 201,
    'the uploaded dated Rating row reaches checklist evaluation');
  const selector = (await t.request('GET', endpoint + '/packet', { token: owner.token })).json.view;
  const selected = selector.eligible_issues.find((issue) => issue.check_id === HISTORY || issue.issue_id === finding?.issue_id);
  check.ok(selected, 'the uploaded same-period contradiction is selectable for a packet');
  if (selected) {
    await t.request('POST', endpoint + '/packet/select', { token: owner.token, body: { issue_ids: [selected.issue_id] } });
    await t.request('POST', endpoint + '/packet/correspondence', { token: owner.token, body: {
      correspondence: { consumer_name: 'Fictional Consumer', contact: 'fictional@example.test' } } });
    check.equal((await t.request('POST', endpoint + '/packet/approve', { token: owner.token })).status, 200,
      'the consumer approves the source-linked dated Rating issue');
    const download = await t.request('GET', endpoint + '/packet-download', { token: owner.token });
    check.equal(download.status, 200, 'the approved issue reaches the actual entitled packet download');
    check.ok(download.text.includes('May 2024') && download.text.includes('OK') && download.text.includes('30'),
      'the downloaded packet retains its own dated period and both printed codes');
    check.equal(/probable violation|potential violation|page undefined/i.test(download.text), false,
      'the packet has no obsolete consumer verdict or invented source page');
  }
  return { synthetic_physical_layout_only: true, genuine_tu_pdf_family_admission: false,
    fixture_sha256: ordinary.model.sha256, records: ordinary.extraction.records.length, month_columns: ordinaryCells.length,
    resolved_cells: ordinaryCells.filter((cell) => !cell.uncertain).length, blank_cells: ordinaryCells.filter((cell) => cell.reason === 'NO_CELL').length,
    printed_key_entries: ordinary.grids[0].legend.length, positive_history_matches: matches(positive).length };
}

module.exports = { run, id: 'dt-rating-history-rows', title: 'Own dated Category/Rating rows and positioned printed keys',
  fixtures: { ratingWords, ratingPdf, read } };
