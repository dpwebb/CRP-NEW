'use strict';

/* PUB-012 remains the presentation authority. Positioned fictional native PDFs
 * vary its captions, periods and own-legend glyph relationships for behavior;
 * these files are not new presentation evidence. No private report is opened. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const formats = require('../../formats.cjs');
const family = require('../../format-families/au-equifax-consumer.cjs');
const evaluation = require('../../evaluation.cjs');
const issues = require('../../issues.cjs');
const { sourceForField } = require('../../report-fact-sources.cjs');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const HISTORY = 'COMMON-ERROR-PAYMENT-HISTORY-INCONSISTENCY';
const DATES = 'COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ON_TIME = 'Payment Received on Time', OVERDUE = '30-59 Days Overdue';
let sequence = 0;

/* Minimal positioned image/text PDF, using separate image XObjects for the
 * account cells and identical own-legend glyphs. Test glyphs have no universal
 * meaning: only the literal legend printed in this same account supplies it. */
function imagePdf(pages) {
  const objects = [], add = (body) => { objects.push(body); return objects.length; };
  const catalog = add(null), tree = add(null);
  const font = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const escape = (s) => String(s).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const glyphs = [[40, 180, 50], [220, 20, 20], [10, 10, 230]].map((rgb) => {
    const data = Buffer.alloc(8 * 8 * 3);
    for (let i = 0; i < 64; i += 1) rgb.forEach((v, channel) => { data[i * 3 + channel] = i % 9 === 0 ? 255 : v; });
    return add(`<< /Type /XObject /Subtype /Image /Width 8 /Height 8 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Length ${data.length} >>\nstream\n${data.toString('latin1')}\nendstream`);
  });
  const pageIds = pages.map((page) => {
    const text = page.words.map((word) => `BT /F1 9 Tf ${word.x} ${841 - word.y - 9} Td (${escape(word.text)}) Tj ET`);
    const images = (page.images || []).map((image) => `q 15 0 0 15 ${image.x} ${841 - image.y - 15} cm /Im${image.glyph} Do Q`);
    const content = text.concat(images).join('\n');
    const stream = add(`<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}\nendstream`);
    return add(`<< /Type /Page /Parent ${tree} 0 R /MediaBox [0 0 595 841] /Resources << /Font << /F1 ${font} 0 R >> /XObject << ${glyphs.map((g, i) => `/Im${i} ${g} 0 R`).join(' ')} >> >> /Contents ${stream} 0 R >>`);
  });
  objects[catalog - 1] = `<< /Type /Catalog /Pages ${tree} 0 R >>`;
  objects[tree - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;
  let output = '%PDF-1.4\n', offsets = [];
  objects.forEach((body, i) => { offsets.push(Buffer.byteLength(output, 'latin1')); output += `${i + 1} 0 obj\n${body}\nendobj\n`; });
  const xref = Buffer.byteLength(output, 'latin1');
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(output, 'latin1');
}

function disclosure(accounts = [{}], overdue = [], returnPages = false) {
  const pages = [{ words: [{ text: 'Report Date: 4 January 2016', x: 40, y: 50 }] }, { words: [] }, { words: [], images: [] }];
  const put = (p, text, x, y) => { if (text != null) p.words.push({ text: String(text), x, y }); };
  ['Personal Information', 'Credit Overview', 'Summary', 'Consumer Credit Information', 'Publically Available Consumer Information']
    .forEach((heading, i) => put(pages[1], heading, 40, 60 + i * 25));
  put(pages[2], 'Consumer Credit Information', 40, 30);
  put(pages[2], 'Consumer Credit Liability Information', 40, 55);
  accounts.forEach((changes, i) => {
    const a = { provider: 'Cedar Bank', type: 'Credit Card', limit: '$10,000', reference: `LIST${i + 1}`,
      opened: '11 Apr 2013', closed: '', reopened: '', repayment: '', years: ['2015'], legend: true, ...changes };
    const p = pages[2], base = 85 + i * 350;
    for (const [label, value, row] of [['Credit Provider', a.provider, 0], ['Type Of Account', a.type, 1],
      ['Credit Limit', a.limit, 2], ['Account Number', a.reference, 3], ['Opened Date', a.opened, 4],
      ['Closed Date', a.closed, 5], ['Re-Opened Date', a.reopened, 6], ['Current Repayment Status', a.repayment, 7]]) {
      if (value === undefined) continue;
      put(p, label, 36, base + row * 18); if (value !== '') put(p, value, 240, base + row * 18);
    }
    (a.extra || []).forEach((extra, n) => { put(p, extra.label, 36, base + 144 + n * 16); put(p, extra.value, 240, base + 144 + n * 16); });
    const monthY = base + 185 + (a.extra || []).length * 16;
    MONTHS.forEach((month, index) => { if (month !== a.missingMonth) put(p, month, 76 + index * 28, monthY); });
    a.years.forEach((year, row) => {
      put(p, year, 36, monthY + 22 + row * 22);
      MONTHS.forEach((month, col) => {
        const glyph = a.unknown && col === 0 ? 2 : a.contradiction && row === 1 && col === 0 ? 1 : 0;
        if (!a.missingCell || col !== 0) p.images.push({ glyph, x: 73 + col * 28, y: monthY + 18 + row * 22 });
      });
    });
    const legendY = monthY + 25 + a.years.length * 22;
    if (a.legend) {
      put(p, 'Legend', 50, legendY);
      for (const [glyph, meaning, row] of [[0, a.meaning || ON_TIME, 0], [1, OVERDUE, 1]]) {
        p.images.push({ glyph, x: 36, y: legendY + 18 + row * 22 });
        put(p, meaning, 65, legendY + 20 + row * 22);
      }
    }
  });
  if (overdue.length) {
    const p = { words: [] }; pages.push(p);
    put(p, 'Overdue Accounts', 36, 60);
    overdue.forEach((a, i) => {
      const lines = ['Status Outstanding', 'Current Listing', 'Credit Provider Cedar Bank', 'Date 20 Jul 2015',
        `Amount ${a.current || '$300'}`, 'Account Number REF-123', 'Account Type Credit Card',
        ...(a.noOriginal ? [] : ['Original Listing', 'Original Credit Provider Cedar Bank', 'Date 20 Jul 2014', `Amount ${a.original || '$700'}`]),
        ...(a.extra || [])];
      lines.forEach((text, row) => put(p, text, 36, 90 + i * 290 + row * 18));
    });
  }
  pages.slice(1).forEach((p, i) => put(p, `${family.PUBLISHER_NAME} Page ${i + 2} of ${pages.length} ${family.PUBLISHER_ABN}`, 24, 800));
  return returnPages ? pages : imagePdf(pages);
}

function read(t, accounts, amend, overdue, bytesOverride) {
  const bytes = bytesOverride || disclosure(accounts, overdue), file = path.join(t.dataDir, `di-au-${++sequence}.pdf`);
  fs.mkdirSync(t.dataDir, { recursive: true }); fs.writeFileSync(file, bytes);
  const model = formats.buildPdfDocumentModel(file);
  if (amend) amend(model);
  return { bytes, model, admission: family.admit(model), extraction: formats.extractWithSharedAdapter(model, { mode: 'REPORT', country: 'AU' }) };
}

function offered(extraction, assessmentClock) {
  const assessed = evaluation.evaluateCase({ country: 'AU', region: 'AU-NSW', extraction, assessment_clock: assessmentClock });
  return { assessed, findings: issues.issuesFor({ extraction, evaluation: assessed }), public: issues.publicIssues({ extraction, evaluation: assessed }) };
}

async function run(t, check) {
  const ordinary = read(t, [{}]);
  check.equal(ordinary.admission.admitted, true, 'the native behavioral PDF satisfies the unchanged AU family admission');
  const record = ordinary.extraction.records[0], cells = record.facts['account.paymentHistoryCells'] || [];
  check.equal(cells.length, 12, 'all twelve positioned cells retain their own printed month/year');
  check.equal(cells.every((cell) => cell.meaning === ON_TIME && !cell.uncertain), true, 'the own legend defines every known glyph');
  check.equal(cells[0]?.raw_period, 'Jan 2015', 'the period keeps the printed month/year');
  check.ok(cells[0]?.raw_symbol?.sha256 && cells[0].location.x0 != null && cells[0].legend?.location.page === 3,
    'cell glyph and own legend retain exact geometry');
  check.equal(cells[0]?.legend?.raw_symbol?.sha256, cells[0]?.raw_symbol?.sha256, 'the retained own legend glyph proves the exact image match');
  check.equal(offered(ordinary.extraction).findings.some((issue) => [HISTORY, DATES].includes(issue.check_id)), false,
    'a consistent normal native history/date reading offers no false breach');
  for (const [field, label, raw, value] of [['account.reported_identity', 'Credit Provider', 'Cedar Bank', 'Cedar Bank'],
    ['account.type', 'Type Of Account', 'Credit Card', 'CREDIT CARD'], ['account.creditLimit', 'Credit Limit', '$10,000', 10000],
    ['liability.openedDate', 'Opened Date', '11 Apr 2013', '2013-04-11']]) {
    check.equal(record.facts[field], value, `${field} retains its own printed value`);
    const source = sourceForField(record, field);
    check.equal(source?.source_field, label, `${field} retains the exact caption`);
    check.equal(source?.raw_value, raw, `${field} retains the printed raw reading`);
    check.ok(source?.location?.page === 3 && Number.isFinite(source.location.y0), `${field} retains its own source geometry`);
  }
  const closed = read(t, [{ opened: '11 Apr 2013', closed: '10 Apr 2013', reopened: '12 Apr 2013', repayment: 'The consumer credit is not overdue' }]).extraction.records[0];
  check.equal(closed.facts['liability.reopenedDate'], '2013-04-12', 'a readable Re-Opened Date retains its own separate date');
  check.equal(closed.fact_sources['liability.reopenedDate'].source_field, 'Re-Opened Date', 'the reopening source remains distinct');
  check.equal(closed.facts['liability.currentRepaymentStatus'], 'The consumer credit is not overdue', 'explicit repayment performance is retained literally');
  check.equal(closed.facts['account.status'], undefined, 'repayment performance is never promoted to current lifecycle status');
  for (const field of ['account.balance', 'account.pastDueAmount', 'account.masked_identifier', 'account.responsibility',
    'tradeline.firstDelinquencyDate', 'tradeline.lastPaymentDate']) check.equal(record.facts[field], undefined, `${field} is not invented`);
  check.equal(record.facts['liability.accountReference'], 'LIST1', 'the bureau listing reference retains its proper namespace');
  for (const [raw, value] of [['$1,000.25', 1000.25], ['$-200.00', -200], ['($200.00)', -200], ['-$200.00', -200],
    ['$1,00', undefined], ['$1 000', undefined], ['$100 extra', undefined], ['AAA$100', undefined], ['$10,000 $20', undefined]]) {
    const amount = read(t, [{ limit: raw }]).extraction.records[0];
    check.equal(amount.facts['account.creditLimitRaw'], raw, 'the complete AU monetary reading is preserved');
    check.equal(amount.facts['account.creditLimit'], value, `${raw} is validated without dropping grouping, signs or trailing text`);
    check.equal(amount.fact_sources['account.creditLimit'].raw_value, raw, 'the limit source retains the complete printed amount');
    if (value === undefined) check.equal(sourceForField(amount, 'account.creditLimit'), null, 'a malformed amount supplies no usable decisive source');
  }

  for (const [name, a, amend, field] of [
    ['duplicate opening caption', { opened: '11 Apr 2013', closed: '10 Apr 2013', extra: [{ label: 'Opened Date', value: '9 Apr 2013' }] }, null, 'liability.openedDate'],
    ['duplicate closure caption', { opened: '11 Apr 2013', closed: '10 Apr 2013', extra: [{ label: 'Closed Date', value: '12 Apr 2013' }] }, null, 'liability.closedDate'],
    ['untrusted opening source', { opened: '11 Apr 2013', closed: '10 Apr 2013' }, (m) => { m.pages[2].word_boxes.filter((w) => w.text === '2013' && w.y0 < 170).forEach((w) => { w.trusted = false; }); }, 'liability.openedDate']
  ]) {
    const extraction = read(t, [a], amend).extraction;
    check.equal(sourceForField(extraction.records[0], field), null, `${name} is not a usable source`);
    check.equal(offered(extraction).findings.some((issue) => issue.check_id === DATES), false, `${name} cannot become a selectable dates violation`);
  }
  const clock = { assessment_date: '2026-10-07', assessed_at: '2026-10-07T12:00:00Z' };
  const periodIssue = (finding) => finding.eligible && (finding.adapter_id === 'AU-PRIVACY-ACT-1988-S20W-ITEM1-LIABILITY-2Y'
    || finding.adapter_id === 'AU-PRIVACY-ACT-1988-S20W-ITEM4-DEFAULT-5Y'
    || finding.check_id === 'RETENTION-PERIOD-ENDED-SINCE-THE-REPORT');
  const markYearUntrusted = (page, year) => (model) => {
    model.pages[page - 1].word_boxes.filter((word) => word.text === year).forEach((word) => { word.trusted = false; });
  };
  for (const [name, changes, amend] of [
    ['untrusted closed-date anchor', { opened: '11 Apr 2005', closed: '10 Apr 2010' }, markYearUntrusted(3, '2010')],
    ['duplicate closed-date anchor', { opened: '11 Apr 2005', closed: '10 Apr 2010', extra: [{ label: 'Closed Date', value: '10 Apr 2015' }] }, null]
  ]) {
    const extraction = read(t, [changes], amend).extraction;
    check.equal(extraction.records[0].facts['liability.closedDate'], '2010-04-10', 'the legacy closure reading remains available internally');
    check.equal(formats.factsForRecord(extraction.records[0])['liability.closedDate'], undefined, `${name} is withheld from the active adapter facts`);
    check.equal(offered(extraction, clock).findings.some(periodIssue), false, `${name} cannot become a selectable reporting-period issue`);
  }
  const independentClosed = read(t, [{ opened: '11 Apr 2005', closed: '10 Apr 2010' }], markYearUntrusted(3, '2005')).extraction;
  check.equal(formats.factsForRecord(independentClosed.records[0])['liability.closedDate'], '2010-04-10', 'a trusted closure anchor survives an unrelated untrusted opening reading');
  check.equal(offered(independentClosed, clock).findings.some(periodIssue), true, 'the independently sourced closure still supports its reporting-period issue');
  const rejectedOriginal = read(t, [], markYearUntrusted(4, '2014'), [{}]).extraction;
  check.equal(rejectedOriginal.records[0].facts['overdue.originalListingDate'], '2014-07-20', 'the legacy original-listing date reading remains available internally');
  check.equal(formats.factsForRecord(rejectedOriginal.records[0])['overdue.originalListingDate'], undefined, 'an explicitly untrusted original-listing date is withheld from the adapter facts');
  check.equal(offered(rejectedOriginal, clock).findings.some(periodIssue), false, 'an untrusted original-listing anchor cannot become a current reporting-period issue');
  const duplicateOriginal = read(t, [], null, [{ extra: ['Original Listing', 'Date 20 Jul 2013'] }]).extraction;
  check.equal(offered(duplicateOriginal, clock).findings.some(periodIssue), false, 'duplicate original-listing dates supply no arbitrary reporting-period anchor');
  const independentOriginal = read(t, [], markYearUntrusted(4, '2015'), [{}]).extraction;
  check.equal(formats.factsForRecord(independentOriginal.records[0])['overdue.originalListingDate'], '2014-07-20', 'a trusted original-listing anchor survives an unrelated untrusted current-listing date');
  check.equal(offered(independentOriginal, clock).findings.some(periodIssue), true, 'the independently sourced original listing still supports its current reporting-period issue');
  for (const [name, changes, amend] of [['missing own legend', { legend: false }, null],
    ['missing month caption', { missingMonth: 'Jan' }, null], ['absent native geometry', {}, (m) => { m.pages[2].word_boxes = []; }],
    ['untrusted printed year', {}, (m) => { m.pages[2].word_boxes.filter((w) => w.text === '2015').forEach((w) => { w.trusted = false; }); }]]) {
    const extraction = read(t, [changes], amend).extraction;
    check.equal(extraction.records[0].facts['account.paymentHistoryCells'], undefined, `${name} supplies no guessed cells`);
    check.equal(offered(extraction).findings.some((issue) => issue.check_id === HISTORY), false, `${name} supplies no history breach`);
  }
  const unknown = read(t, [{ unknown: true }]).extraction.records[0];
  check.equal(unknown.facts['account.paymentHistoryCells'][0].meaning, null, 'a glyph absent from the own legend remains unresolved');
  check.equal(unknown.facts['account.paymentHistoryCells'][0].uncertain, true, 'the unknown glyph retains its uncertainty');
  check.equal(unknown.printed.repayment_history.cells_readable, false, 'an unknown glyph does not claim fully readable cells');
  check.equal(read(t, [{ missingCell: true }]).extraction.records[0].facts['account.paymentHistoryCells'].length, 11, 'a blank graphical cell is not invented');
  const neighbors = read(t, [{ legend: false, provider: 'First Bank' }, { provider: 'Second Bank', meaning: 'Account Closed' }]).extraction.records;
  check.equal(neighbors[0].facts['account.paymentHistoryCells'], undefined, 'the first account does not borrow the neighboring account legend');
  check.equal(neighbors[1].facts['account.paymentHistoryCells'][0].meaning, 'Account Closed', 'the neighboring account keeps its own literal glyph meaning');
  check.equal(neighbors[1].facts['account.status'], undefined, 'historical Account Closed cells do not become current lifecycle status');
  check.equal(neighbors[0].printed.repayment_history.legend_lines.length, 0, 'the first account legend stops at its own record boundary');
  const pageParts = disclosure([{ provider: 'First Bank', legend: false }], [], true);
  pageParts.push(disclosure([{ provider: 'Second Bank', meaning: 'Account Closed' }], [], true)[2]);
  pageParts.slice(1).forEach((p, i) => { p.words.find((w) => w.text.startsWith(family.PUBLISHER_NAME)).text =
    `${family.PUBLISHER_NAME} Page ${i + 2} of 4 ${family.PUBLISHER_ABN}`; });
  const pageAccounts = read(t, [], null, [], imagePdf(pageParts)).extraction.records;
  check.equal(pageAccounts.length, 2, 'two pages with equal coordinates retain separate AU accounts');
  check.equal(pageAccounts[0].facts['account.paymentHistoryCells'], undefined, 'a missing page-three legend is not supplied by page four');
  check.equal(pageAccounts[1].facts['account.paymentHistoryCells'][0].location.page, 4, 'page four retains its own cell source page');
  check.equal(pageAccounts[1].facts['account.paymentHistoryCells'][0].legend.location.page, 4, 'page four retains its own legend source page');
  const wrongSource = read(t, [{}], (m) => { m.path = ordinary.model.path; }).extraction.records[0];
  // Bytes are identical here, so point the native model at a genuinely different report before reading.
  const otherSource = read(t, [{ meaning: 'Account Closed' }]);
  const swapped = read(t, [{}], (m) => { m.path = otherSource.model.path; }).extraction.records[0];
  check.equal(swapped.facts['account.paymentHistoryCells'], undefined, 'a different report cannot supply glyphs for the native text reading');
  check.equal(swapped.printed.repayment_history.reason, 'SOURCE_FILE_DOES_NOT_MATCH_THE_NATIVE_TEXT_READING', 'the mismatched own-PDF source remains an internal unresolved reading');
  check.equal(wrongSource.facts['account.paymentHistoryCells'].length, 12, 'an identical byte reading preserves the source association');

  const over = read(t, [], null, [{}]).extraction.records[0];
  check.equal(over.facts['overdue.currentListingAmount'], 300, 'current listing amount is retained separately');
  check.equal(over.facts['overdue.originalListingAmount'], 700, 'original listing amount is retained separately');
  check.equal(over.facts['overdue.originalListingDate'], '2014-07-20', 'the original listing anchor is unchanged');
  check.equal(over.facts['overdue.currentListingDate'], '2015-07-20', 'the current listing date is retained without replacing the anchor');
  check.equal(over.facts['account.balance'], undefined, 'a listing amount is not a current account balance');
  check.equal(over.facts['account.masked_identifier'], undefined, 'a listing reference is not a creditor account identifier');
  check.equal(over.fact_sources['overdue.currentListingAmount'].source_field, 'CURRENT Listing > Amount', 'current amount retains its exact sub-block');
  const noOriginal = read(t, [], null, [{ noOriginal: true }]).extraction.records[0];
  check.equal(noOriginal.facts['overdue.originalListingDate'], undefined, 'missing original listing is not supplied by current listing');
  check.equal(noOriginal.facts['overdue.currentListingAmount'], 300, 'an unresolved original anchor does not drop an independent printed current listing amount');
  const repeatedAmount = read(t, [], null, [{ extra: ['Current Listing', 'Amount $400'] }]).extraction.records[0];
  check.equal(repeatedAmount.facts['overdue.currentListingAmount'], undefined, 'two current amount captions supply no arbitrary amount');
  for (const [raw, value] of [['$-200', -200], ['($200)', -200], ['$7,346', 7346], ['$7,34', undefined], ['$200 trailing', undefined]]) {
    const amount = read(t, [], null, [{ current: raw }]).extraction.records[0];
    check.equal(amount.facts['overdue.currentListingAmount'], value, `${raw} is strictly read in its current listing block`);
    check.equal(amount.fact_sources['overdue.currentListingAmount'].raw_value, raw, 'the listing source retains its complete amount reading');
    check.equal(amount.facts['account.balance'], undefined, 'even a signed listing amount never becomes a current balance');
  }

  const positive = read(t, [{ years: ['2015', '2015'], contradiction: true }]);
  const found = offered(positive.extraction), issue = found.findings.find((i) => i.check_id === HISTORY);
  check.ok(issue?.eligible === true, 'two own cells disagreeing for the same printed period produce a selectable issue');
  check.equal(found.public.find((i) => i.issue_id === issue?.issue_id)?.consumer_label, 'VIOLATION', 'the history breach uses VIOLATION');
  check.ok(issue?.rule_assessment?.required_facts?.length === 4 && issue.rule_assessment.required_facts.every((f) => f.source?.location?.page === 3),
    'the shared checklist assessment uses both exact cell and own-legend sources');
  check.equal(issue?.rule_assessment?.required_facts?.filter((f) => f.field === 'account.paymentHistoryCells')
    .every((f) => f.source.raw_value === 'Graphical repayment symbol'), true, 'a graphical symbol is not misrepresented as printed cell text');
  check.deepEqual(issue?.rule_assessment?.required_facts?.filter((f) => f.field === 'account.paymentHistoryLegend').map((f) => f.source.raw_value),
    [ON_TIME, OVERDUE], 'the separate legend facts retain the actual printed meanings');
  const differentPeriods = read(t, [{ years: ['2014', '2015'], contradiction: true }]).extraction;
  check.equal(offered(differentPeriods).findings.some((i) => i.check_id === HISTORY), false, 'different years may legitimately report different repayment performance');
  check.equal(offered(read(t, [{ years: ['2015', '2015'] }]).extraction).findings.some((i) => i.check_id === HISTORY), false,
    'two printed cells with the same period and meaning are benign');
  check.equal(offered(read(t, [{ years: ['2015', '2015'], contradiction: true, unknown: true }]).extraction).findings.some((i) => i.check_id === HISTORY), false,
    'an unresolved own-legend glyph supplies no contradictory status');
  for (const meaning of ['Account Closed', 'Payment Not Reported', 'Outside Reporting Window']) {
    const extraction = read(t, [{ years: ['2015', '2015'], contradiction: true, meaning }]).extraction;
    const cell = extraction.records[0].facts['account.paymentHistoryCells'][0];
    check.equal(cell.meaning, meaning, 'a decoded non-rating glyph retains its literal own-legend meaning');
    check.equal(cell.uncertain, false, 'a known non-rating glyph remains physically resolved');
    check.equal(cell.performance_usable, false, `${meaning} is explicitly unavailable for performance comparison`);
    check.equal(extraction.records[0].printed.repayment_history.cells_readable, true, 'all printed non-rating and rating glyphs are still physically decoded');
    check.equal(offered(extraction).findings.some((i) => i.check_id === HISTORY), false,
      `${meaning} beside a payment rating for the same period is not a contradictory performance issue`);
  }

  const owner = await t.unpaidAccount('di-au-reader-owner@example.test'); await t.pay(owner, 'monthly');
  const caseId = (await t.request('POST', '/api/cases', { token: owner.token, body: { country: 'AU', region: 'AU-NSW' } })).json.case.case_id;
  check.equal((await t.request('POST', `/api/cases/${caseId}/files`, { token: owner.token,
    body: { originalFilename: 'fictional-au-history.pdf', declaredBytes: positive.bytes.length, mimeType: 'application/pdf', contentBase64: positive.bytes.toString('base64') } })).status,
  201, 'the native AU report uploads through the normal file route');
  check.equal((await t.request('POST', `/api/cases/${caseId}/evaluate`, { token: owner.token })).status, 201, 'the uploaded report reaches checklist assessment');
  const view = (await t.request('GET', `/api/cases/${caseId}/packet`, { token: owner.token })).json.view;
  const selectable = (view.eligible_issues || []).find((i) => i.rule_assessment?.requirement ===
    'One account and period cannot carry two contradictory report-defined payment statuses.');
  check.ok(selectable, 'the uploaded graphical history breach reaches the packet selector');
  if (selectable) {
    check.equal(selectable.consumer_label, 'VIOLATION', 'the selector displays VIOLATION');
    check.equal((await t.request('POST', `/api/cases/${caseId}/packet/select`, { token: owner.token, body: { issue_ids: [selectable.issue_id] } })).status, 200, 'the consumer selects the supported history breach');
    check.equal((await t.request('POST', `/api/cases/${caseId}/packet/correspondence`, { token: owner.token,
      body: { correspondence: { consumer_name: 'Dana Whitfield', contact: 'dana@example.test' } } })).status, 200, 'the consumer supplies correspondence details');
    check.equal((await t.request('POST', `/api/cases/${caseId}/packet/approve`, { token: owner.token })).status, 200, 'the consumer approves the history packet');
    const downloaded = await t.request('GET', `/api/cases/${caseId}/packet-download`, { token: owner.token });
    check.equal(downloaded.status, 200, 'the approved history packet downloads');
    check.ok(downloaded.text.includes('Cedar Bank') && downloaded.text.includes('Jan 2015') && downloaded.text.includes(ON_TIME)
      && downloaded.text.includes(OVERDUE), 'the downloaded packet states both printed meanings and their own disputed period/account');
    check.ok(downloaded.text.includes('Graphical repayment symbol') && downloaded.text.includes('Report-defined repayment symbol meaning'),
      'the downloaded packet locates the graphical cell and its separate printed legend honestly');
    check.equal(downloaded.text.includes(positive.extraction.records[0].facts['account.paymentHistoryCells'][0].raw_symbol.sha256), false,
      'the private image-match hash is not consumer packet wording');
    for (const [name, change] of [
      ['own legend geometry', (cell) => { cell.legend.location.x0 += 1; }],
      ['own legend glyph', (cell) => { cell.legend.raw_symbol.sha256 = '0'.repeat(64); }],
      ['cell glyph', (cell) => { cell.raw_symbol.sha256 = '0'.repeat(64); }]
    ]) {
      const row = t.service.store.state().results.find((r) => r.case_id === caseId);
      const saved = JSON.parse(JSON.stringify(row.extraction.records[0].facts['account.paymentHistoryCells']));
      t.service.store.update((state) => {
        const current = state.results.find((r) => r.case_id === caseId);
        change(current.extraction.records[0].facts['account.paymentHistoryCells'][0]);
      });
      const changedView = (await t.request('GET', `/api/cases/${caseId}/packet`, { token: owner.token })).json.view;
      check.equal(changedView.packet.approval_stale, true, `${name} is material to the approved packet`);
      const staleDownload = await t.request('GET', `/api/cases/${caseId}/packet-download`, { token: owner.token });
      check.equal(staleDownload.status, 409, `changed ${name} requires another review before download`);
      check.equal(staleDownload.json.error.code, 'PACKET_APPROVAL_STALE', `${name} invalidates the existing approval`);
      t.service.store.update((state) => {
        state.results.find((r) => r.case_id === caseId).extraction.records[0].facts['account.paymentHistoryCells'] = saved;
      });
      check.equal((await t.request('GET', `/api/cases/${caseId}/packet-download`, { token: owner.token })).status, 200,
        'restoring identical material source evidence restores the approved version');
    }
  }

  const sample = process.env.CRP_AU_EQUIFAX_PUBLIC_SPECIMEN || path.join(ROOT, 'SOURCE_CAPTURES', 'REPORT_FORMAT_BASELINE_2026-09-30', 'PUB-012.pdf');
  let publicEvidence = 'not present on this host';
  if (fs.existsSync(sample)) {
    check.equal(crypto.createHash('sha256').update(fs.readFileSync(sample)).digest('hex'), family.FAMILY_CONTRACT.evidenced_sha256, 'the accepted public specimen matches its pinned digest');
    const extraction = formats.extractWithSharedAdapter(formats.buildPdfDocumentModel(sample), { mode: 'REPORT', country: 'AU' });
    const liabilities = extraction.records.filter((r) => r.kind === 'CONSUMER_CREDIT_LIABILITY');
    check.deepEqual(liabilities.map((r) => (r.facts['account.paymentHistoryCells'] || []).length), [36, 36, 0], 'the public specimen supplies exactly its own two 36-cell grids');
    check.equal(liabilities.slice(0, 2).every((r) => r.printed.repayment_history.cells_readable), true, 'all 72 public graphical cells match their own printed legends');
    const first = liabilities[0].facts['account.paymentHistoryCells'], second = liabilities[1].facts['account.paymentHistoryCells'];
    for (const [list, period, meaning] of [[first, '2014-01', 'Outside Reporting Window'], [first, '2014-06', 'Payment Not Reported'],
      [first, '2014-12', ON_TIME], [first, '2015-05', OVERDUE], [first, '2015-06', '60-89 Days Overdue'],
      [second, '2015-03', ON_TIME], [second, '2016-06', 'Outside Reporting Window']]) {
      check.equal(list.find((c) => c.period === period)?.meaning, meaning, `the accepted public ${period} cell retains its own printed meaning`);
    }
    check.equal(liabilities.some((r) => r.printed.repayment_history.legend_lines.some((l) => /MEMBER NUMBER|JOAN/.test(l.text))), false, 'the public legends contain no neighboring-page identity header');
    check.equal(liabilities[2].facts['account.type'], undefined, 'the incomplete page-eight record does not borrow page-seven type');
    check.equal(liabilities[2].facts['account.creditLimit'], undefined, 'the incomplete page-eight record does not borrow page-seven limit');
    check.equal(offered(extraction).findings.some((i) => [HISTORY, DATES].includes(i.check_id)), false, 'the normal public specimen produces no forced date/history breach');
    publicEvidence = 'PUB-012 read in place, 72 own-legend cells with exact account/period geometry';
  }
  return { public_evidence: publicEvidence, packet_journey: 'native AU graphical history upload -> assessment -> VIOLATION selection -> approval -> downloaded packet' };
}

module.exports = { run, id: 'di-au-reader-completion', title: 'AU own-legend graphical repayment evidence, exact field sources and approved packet' };
