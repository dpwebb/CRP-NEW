'use strict';

/* PUB-001's own positioned year/month/code rows, exercised through real native PDF words.
 * The published definition remains external; no fixture supplies a fictional report legend. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const formats = require('../../formats.cjs');
const family = require('../../format-families/us-experian-consumer.cjs');
const common = require('../../common-errors.cjs');
const issues = require('../../issues.cjs');
const engine = require('../../evaluation.cjs');
const journey = require('../../journey.cjs');
const results = require('../../results.cjs');
const definitions = require('../../report-code-definitions.cjs');
const us = require('./df-us-common-error-reader.cjs').fixtures;
const { buildWordPdf } = require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');
const HISTORY = 'COMMON-ERROR-PAYMENT-HISTORY-INCONSISTENCY';

function disclosure(accounts, wordsOnly = false) {
  const model = us.disclosure(accounts.map((account) => ({ pastDue: '$0.00', ...account })), true);
  accounts.forEach((account, index) => {
    if (account.history === false) return;
    const grid = { months: ['May', 'Apr', 'Mar'], codes: ['OK', '30', 'OK'],
      years: [{ index: 0, text: '2025' }], ...account.history };
    const y = 120 + index * 180;
    model.words.push({ text: 'Account history', x: 40, y: y + 122 });
    for (const year of grid.years) model.words.push({ text: year.text, x: 40 + year.index * 42,
      y: y + 134 + (year.dy || 0) });
    grid.months.forEach((text, column) => { if (text) model.words.push({ text, x: 40 + column * 42, y: y + 146 }); });
    grid.codes.forEach((text, column) => { if (text) model.words.push({ text, x: 40 + column * 42, y: y + 159 }); });
    for (const extra of grid.extraCodes || []) model.words.push({ text: extra.text,
      x: 40 + extra.index * 42, y: y + 159 + (extra.dy || 0) });
    if (grid.guide) model.words.push({ text: 'Payment history guide', x: 40, y: y + 171 },
      { text: '60', x: 82, y: y + 184 });
  });
  if (wordsOnly) return model;
  return buildWordPdf([model], { page_size: { width: 900, height: 230 + accounts.length * 180 }, font_size: 9 });
}

function read(t, accounts, amend) { return us.read(t, [], amend, disclosure(accounts)); }
function cells(reading, index = 0) { return reading.extraction.records[index]?.facts['account.paymentHistoryCells'] || []; }
function matches(reading) {
  return common.runCommonErrorChecks({ extraction: reading.extraction }).performed
    .find((entry) => entry.check_id === HISTORY)?.source_records || [];
}

async function run(t, check) {
  const ordinary = read(t, [{}]);
  check.equal(ordinary.admission.admitted, true, 'the existing consumer family admits its own dated account grid');
  check.equal(ordinary.extraction.records[0].reader_family_id, family.FAMILY_ID,
    'the account records identify the reviewed reader for external definition scope');
  check.deepEqual(cells(ordinary).map((cell) => cell.period), ['2025-05', '2025-04', '2025-03'],
    'sparse own-year headings associate with their own months');
  check.deepEqual(cells(ordinary).map((cell) => cell.code), ['OK', '30', 'OK'], 'each printed code retains its physical column');
  check.ok(cells(ordinary).every((cell) => !cell.uncertain && cell.location?.trusted
    && cell.period_location.month?.trusted && cell.period_location.year?.trusted), 'decisive cells retain readable code/month/year locations');
  for (const cell of cells(ordinary)) {
    check.deepEqual(cell.code_definition, require('../../report-code-definitions.cjs').definitionForCode(cell.code),
      'the exact published definition accompanies each readable code');
    check.equal(cell.meaning, cell.code_definition.meaning, 'the published definition supplies the meaning');
    check.equal(cell.source_field, 'Account history', 'the printed report field is distinct from the external definition');
  }
  check.equal(ordinary.extraction.records[0].facts['account.paymentHistoryLegend'], undefined, 'no same-file legend is fabricated');
  check.equal(ordinary.extraction.records[0].facts['tradeline.firstDelinquencyDate'], undefined, 'late cells do not invent an original delinquency date');
  check.equal(matches(ordinary).length, 0, 'different monthly statuses are benign');

  const positive = read(t, [{ history: { months: ['May', 'May'], codes: ['OK', '30'] } }]);
  check.equal(matches(positive).length, 1, 'two contradictory own cells for one dated period reach the existing checklist predicate');
  check.equal(matches(positive)[0]?.evidence.period, '2025-05', 'the contradiction carries the printed dated period');
  const offered = us.offered(positive.extraction);
  const finding = offered.findings.find((issue) => issue.check_id === HISTORY);
  const publicIssue = offered.public.find((issue) => issue.issue_id === finding?.issue_id);
  check.ok(publicIssue && publicIssue.consumer_label === 'VIOLATION', 'the sourced grid reaches one selectable consumer violation');
  check.equal(finding?.rule_assessment.required_facts.length, 4, 'two own printed cells and two external definitions support the rule');
  check.deepEqual(finding?.source_facts.filter((fact) => fact.field === 'account.paymentHistoryDefinition')
    .map((fact) => [fact.location.url, fact.location.page, fact.code_definition.source.sha256]),
  [[definitions.SOURCE.url, undefined, definitions.SOURCE.sha256], [definitions.SOURCE.url, undefined, definitions.SOURCE.sha256]],
  'external definitions retain exact provenance without fictitious report pages');
  check.ok(finding?.source_facts.filter((fact) => fact.field === 'account.paymentHistoryCells')
    .every((fact) => fact.period_location.month.page === 1 && fact.period_location.year.page === 1),
  'each decisive cell retains its own printed year/month evidence');
  check.ok(publicIssue?.source_facts.filter((fact) => fact.definition_source)
    .every((fact) => fact.definition_source.version === definitions.SOURCE.version && fact.definition_source.title === definitions.SOURCE.title),
  'consumer evidence names the reviewed published edition separately');
  const definitionDownload = journey.assessmentReportBody(results.renderResultSet({
    extraction: positive.extraction, evaluation: engine.evaluateCase({ country: 'US', region: 'US-NY', extraction: positive.extraction }) }), 'fictional');
  check.ok(definitionDownload.includes('Published definition:') && definitionDownload.includes(definitions.SOURCE.url),
    'assessment downloads distinguish the external definition from printed report cells');
  const capture = path.resolve(__dirname, '../../../../SOURCE_CAPTURES/READER-CODE-DEFINITIONS-2026-10-07/experian-us-consumer-report-code-guide.html');
  if (fs.existsSync(capture)) check.equal(crypto.createHash('sha256').update(fs.readFileSync(capture)).digest('hex'),
    definitions.SOURCE.sha256, 'the reviewed public capture matches its frozen definition version');
  for (const mutate of [
    (record) => { record.facts['account.paymentHistoryCells'][0].code_definition.source.sha256 = 'changed'; },
    (record) => { delete record.facts['account.paymentHistoryCells'][0].code_definition; },
    (record) => { record.source_bureau = 'Equifax'; },
    (record) => { record.facts['account.paymentHistoryCells'][0].period_location.year.trusted = false; },
    (record) => { record.facts['account.paymentHistoryCells'][0].location.trusted = false; }
  ]) {
    const changed = JSON.parse(JSON.stringify(positive.extraction));
    mutate(changed.records[0]);
    check.equal(matches({ extraction: changed }).length, 0, 'rejected source scope, definition or physical reading cannot supply a contradiction');
    check.equal(us.offered(changed).findings.filter((issue) => issue.check_id === HISTORY).length, 0,
      'an invalid external proof cannot fall back to an eligible unsourced issue');
  }
  check.equal(matches(read(t, [{ history: { months: ['May', 'May'], codes: ['OK', 'OK'] } }])).length, 0,
    'equivalent same-period codes do not become a contradiction');
  for (const code of ['ND', '-']) {
    const nonperformance = read(t, [{ history: { months: ['May', 'May'], codes: ['30', code] } }]);
    check.equal(cells(nonperformance)[1].uncertain, false, 'a defined no-data code is retained accurately');
    check.equal(cells(nonperformance)[1].performance_usable, false, 'a no-data code cannot establish payment performance');
    check.equal(matches(nonperformance).length, 0, 'no-data is not a conflicting performance status');
  }
  for (const code of ['X', 'Pox', 'TOK', '[OK']) {
    const unknown = read(t, [{ history: { months: ['May', 'May'], codes: ['30', code] } }]);
    check.equal(cells(unknown)[1].raw_code, code, 'an unknown or damaged code is retained without correction');
    check.equal(cells(unknown)[1].uncertain, true, 'an undefined code remains uncertain');
    check.equal(matches(unknown).length, 0, 'an unknown or damaged code cannot create a violation');
  }
  for (const code of ['60', '90', '120', '150', '180']) {
    const reading = read(t, [{ history: { months: ['May'], codes: [code] } }]);
    check.equal(cells(reading)[0].meaning, require('../../report-code-definitions.cjs').definitionForCode(code).meaning,
      'each reviewed performance code uses its own published meaning');
  }
  const lower = read(t, [{ history: { months: ['May'], codes: ['oK'] } }]);
  check.equal(cells(lower)[0].code, 'OK', 'ASCII code case is normalized explicitly');
  check.equal(cells(lower)[0].raw_code, 'oK', 'the original case remains physical evidence');
  for (const [word, y] of [['2025', 254], ['May', 266], ['30', 279], ['Account', 242]]) {
    const unread = read(t, [{ history: { months: ['May', 'May'], codes: ['OK', '30'] } }], (model) => {
      for (const token of model.pages[0].word_boxes) if (token.text === word && Math.abs(token.y0 - y) < 6) token.trusted = false;
    });
    check.equal(matches(unread).length, 0, 'untrusted year, month, code or heading cannot support a contradiction');
    check.ok(cells(unread).some((cell) => cell.uncertain), 'untrusted source uncertainty is preserved');
  }
  for (const history of [
    { years: [] },
    { years: [{ index: 0, text: '2025' }, { index: 0, text: '2024' }] },
    { years: [{ index: 0, text: '2025' }, { index: 0, text: '2024', dy: 6 }] },
    { years: [{ index: 0, text: '2025' }, { index: 1, text: '2O24', dy: 6 }] },
    { years: [{ index: 0, text: '2025' }, { index: 1, text: '2O24' }] },
    { years: [{ index: 0, text: '2025' }, { index: 1, text: '202' }] },
    { years: [{ index: 0, text: '2025' }, { index: 1, text: 'ZOOO' }] },
    { years: [{ index: 0, text: '0000' }] },
    { months: ['Ma', 'May'] },
    { extraCodes: [{ index: 1, text: '60', dy: 2 }] }
  ]) {
    const ambiguous = read(t, [{ history: { months: ['May', 'May'], codes: ['OK', '30'], ...history } }]);
    check.equal(matches(ambiguous).length, 0, 'missing, damaged or competing period/cell readings do not choose decisive evidence');
    check.ok(cells(ambiguous).some((cell) => cell.uncertain), 'ambiguous grid readings stay retained but uncertain');
  }
  const years = read(t, [{ history: { months: ['Jan', 'Dec', 'Nov'], codes: ['OK', '30', 'OK'],
    years: [{ index: 0, text: '2025' }, { index: 1, text: '2010' }] } }]);
  check.deepEqual(cells(years).map((cell) => cell.period), ['2025-01', '2010-12', '2010-11'],
    'the next explicitly printed year starts a new segment without invented calendar rollover');
  const laterYear = read(t, [{ history: { months: ['May', 'May'], codes: ['OK', '30'],
    years: [{ index: 0, text: '2025' }, { index: 3, text: '2024' }] } }]);
  check.equal(matches(laterYear).length, 1,
    'an unaligned later year does not suppress independently sourced earlier cells');
  const twoBandsModel = disclosure([{ history: { months: ['May', 'Apr'], codes: ['120', '180'] } }], true);
  for (const word of twoBandsModel.words) if (word.y > 280) word.y += 60;
  twoBandsModel.words.push({ text: '2024', x: 40, y: 295 }, { text: '202', x: 82, y: 301 },
    { text: 'Dec', x: 40, y: 313 }, { text: 'Dec', x: 82, y: 313 },
    { text: 'OK', x: 40, y: 326 }, { text: '30', x: 82, y: 326 });
  const twoBands = us.read(t, [], null, buildWordPdf([twoBandsModel],
    { page_size: { width: 900, height: 470 }, font_size: 9 }));
  check.deepEqual(cells(twoBands).slice(0, 2).map((cell) => [cell.code, cell.uncertain]), [['120', false], ['180', false]],
    'a damaged later year band does not consume or invalidate the earlier code band');
  check.ok(cells(twoBands).slice(2).every((cell) => cell.uncertain && cell.period === null),
    'a truncated year in a subsequent band remains a date boundary rather than borrowing an earlier heading');
  check.equal(matches(twoBands).length, 0, 'a damaged later year band cannot fabricate a same-period contradiction');
  const neighbors = read(t, [{ history: false }, { number: 'XXXX5678' }]);
  check.equal(cells(neighbors, 0).length, 0, 'a missing account grid never borrows its neighbor');
  check.equal(cells(neighbors, 1).length, 3, 'the neighboring account retains its own grid');
  const separate = read(t, [{ history: { months: ['May'], codes: ['OK'] } },
    { number: 'XXXX5678', history: { months: ['May'], codes: ['30'] } }]);
  check.equal(matches(separate).length, 0, 'different accounts with the same period do not contradict each other');
  const guide = read(t, [{ history: { guide: true } }]);
  check.equal(cells(guide).length, 3, 'history ends at its own guide heading instead of reading later narrative tokens as cells');
  const twoPages = us.read(t, [], null, buildWordPdf([disclosure([{}], true),
    disclosure([{ history: { months: ['May', 'May'], codes: ['OK', '30'], years: [] } }], true)],
  { page_size: { width: 900, height: 410 }, font_size: 9 }));
  check.equal(twoPages.extraction.records.length, 2, 'equal coordinates on separate native pages keep separate account blocks');
  check.ok(cells(twoPages, 0).every((cell) => cell.period_location.year.page === 1), 'page one uses only its own year sources');
  check.ok(cells(twoPages, 1).every((cell) => cell.period === null && cell.period_location.year === null),
    'page two cannot borrow the equal-positioned page-one year');
  check.equal(matches(twoPages).length, 0, 'cross-page year borrowing cannot create a violation');
  const noMonth = read(t, [{ history: { months: ['May', null, 'Mar'], codes: ['OK', '30', 'OK'] } }]);
  check.ok(cells(noMonth).some((cell) => cell.raw_code === '30' && cell.period === null && cell.uncertain),
    'a code without its own aligned month is retained without shifting to another period');

  const owner = await t.unpaidAccount('dn-history-owner@example.test'); await t.pay(owner, 'monthly');
  const opened = await t.request('POST', '/api/cases', { token: owner.token, body: { country: 'US', region: 'US-NY' } });
  const caseId = opened.json.case.case_id, endpoint = '/api/cases/' + caseId;
  check.equal((await t.request('POST', endpoint + '/files', { token: owner.token, body: {
    originalFilename: 'fictional-us-history.pdf', declaredBytes: positive.bytes.length, mimeType: 'application/pdf',
    contentBase64: positive.bytes.toString('base64') } })).status, 201, 'native dated history enters the normal upload route');
  check.equal((await t.request('POST', endpoint + '/evaluate', { token: owner.token })).status, 201, 'the source history reaches checklist assessment');
  const selector = (await t.request('GET', endpoint + '/packet', { token: owner.token })).json.view;
  const selected = selector.eligible_issues.find((issue) => issue.source_facts?.some((fact) => fact.definition_source));
  check.ok(selected, 'the sourced history violation is selectable with its external basis');
  if (selected) {
    await t.request('POST', endpoint + '/packet/select', { token: owner.token, body: { issue_ids: [selected.issue_id] } });
    await t.request('POST', endpoint + '/packet/correspondence', { token: owner.token, body: {
      correspondence: { consumer_name: 'Fictional Consumer', contact: 'fictional@example.test' } } });
    check.equal((await t.request('POST', endpoint + '/packet/approve', { token: owner.token })).status, 200, 'consumer approves the report cells and published definition');
    const download = await t.request('GET', endpoint + '/packet-download', { token: owner.token });
    check.equal(download.status, 200, 'the approved history packet downloads');
    check.ok(download.text.includes('May 2025') && download.text.includes('printed "OK"') && download.text.includes('printed "30"'),
      'packet states both own printed codes and their reporting period');
    check.ok(download.text.includes('Published code definition: OK') && download.text.includes('Published code definition: 30')
      && download.text.includes(definitions.SOURCE.title) && download.text.includes(definitions.SOURCE.url),
      'packet separately cites the published definitions with their title and URL');
    check.equal(/page undefined|probable violation|potential violation/.test(download.text.toLowerCase()), false,
      'consumer packet has no invented source page or obsolete verdict');
    const { chromium } = require('C:/Users/webbd/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
    const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
    try {
      const page = await browser.newPage(); page.setDefaultTimeout(20000);
      await page.goto(t.base + '/');
      await page.locator('#email').fill('dn-history-owner@example.test');
      await page.locator('#password').fill('a-long-enough-password');
      await page.locator('#signin').click();
      await page.waitForSelector('#open'); await page.locator('#refresh').click();
      await page.locator('[data-open="' + caseId + '"]').click();
      await page.locator('#steps button[data-step="4"]').click();
      await page.waitForSelector('#packet-block');
      await page.waitForFunction(() => document.body.innerText.includes('Published code definition:'));
      const text = await page.locator('#packet-block').innerText();
      check.ok(text.includes('Published code definition:') && text.includes(definitions.SOURCE.title)
        && text.includes(definitions.SOURCE.url), 'the actual packet review screen cites the external published basis');
      check.equal(text.includes('printed Current, terms met') || text.includes('printed 30 days past due'), false,
        'published meanings are not falsely labelled as words printed in the report');
      check.ok(text.includes('printed OK') && text.includes('printed 30'), 'the actual screen still distinguishes both printed report codes');
    } finally { await browser.close(); }
    for (const [label, mutate] of [
      ['code source', (record) => { record.facts['account.paymentHistoryCells'][0].location.x0 += 1; }],
      ['month source', (record) => { record.facts['account.paymentHistoryCells'][0].period_location.month.x0 += 1; }],
      ['year source', (record) => { record.facts['account.paymentHistoryCells'][0].period_location.year.y0 += 1; }],
      ['definition version', (record) => { record.facts['account.paymentHistoryCells'][0].code_definition.source.version = 'changed'; }],
      ['definition capture', (record) => { record.facts['account.paymentHistoryCells'][0].code_definition.source.sha256 = 'changed'; }]
    ]) {
      const saved = JSON.parse(JSON.stringify(t.service.store.state().results.find((row) => row.case_id === caseId).extraction.records[0]));
      t.service.store.update((state) => { mutate(state.results.find((row) => row.case_id === caseId).extraction.records[0]); });
      check.equal((await t.request('GET', endpoint + '/packet-download', { token: owner.token })).status, 409,
        label + ' is reviewed material and invalidates prior approval');
      t.service.store.update((state) => { state.results.find((row) => row.case_id === caseId).extraction.records[0] = saved; });
      check.equal((await t.request('GET', endpoint + '/packet-download', { token: owner.token })).status, 200,
        'restoring the exact evidence restores the approved version');
    }
  }

  const publicPdf = process.env.CRP_US_EXPERIAN_PUBLIC_SPECIMEN
    || path.resolve(__dirname, '../../../../SOURCE_CAPTURES/REPORT_FORMAT_BASELINE_2026-09-30/PUB-001.pdf');
  let publicEvidence = 'not available on this host';
  if (fs.existsSync(publicPdf)) {
    check.equal(crypto.createHash('sha256').update(fs.readFileSync(publicPdf)).digest('hex'), family.EVIDENCED_SHA256,
      'the inspected public PDF remains the exact pinned source artifact');
    const extraction = formats.extractWithSharedAdapter(formats.buildPdfDocumentModel(publicPdf), { mode: 'REPORT', country: 'US' });
    const history = extraction.records.flatMap((record) => record.facts['account.paymentHistoryCells'] || []);
    check.ok(history.some((cell) => !cell.uncertain && cell.period && cell.code === 'OK'),
      'the actual pinned public sample contributes independently readable dated cells');
    check.ok(history.some((cell) => cell.uncertain && cell.raw_code), 'actual OCR damage remains raw and uncertain');
    check.equal(common.runCommonErrorChecks({ extraction }).performed.find((entry) => entry.check_id === HISTORY)?.source_records.length || 0, 0,
      'the unchanged public sample does not force a performance contradiction');
    publicEvidence = 'PUB-001 actual own dated cells retained; unreadable readings remain uncertain';
  }
  return { public_evidence: publicEvidence, scope: 'own-account dated US history with external published code definitions' };
}

module.exports = { run, id: 'dn-us-dated-history', title: 'US dated account history reaches the sourced checklist',
  fixtures: { disclosure, read, cells, matches } };
