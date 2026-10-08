'use strict';

// PUB-009 proves the existing consumer presentation. Separate issuer sources
// define codes and ordering. Fictional native files exercise contradictions.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const formats = require('../../formats.cjs');
const family = require('../../format-families/gb-experian-consumer.cjs');
const definitions = require('../../report-code-definitions.cjs');
const common = require('../../common-errors.cjs');
const issues = require('../../issues.cjs');
const { buildWordPdf } = require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');
const HISTORY = 'COMMON-ERROR-PAYMENT-HISTORY-INCONSISTENCY';
const ROOT = path.resolve(__dirname, '../../../..');
let sequence = 0;

function nativePdf(accounts = [{}]) {
  const words = [], put = (text, y, x = 36) => words.push({ text, x, y });
  ['Experian', 'Your Credit Report', 'Date of report: 1 June 2026', 'Consumer Help Service', 'www.experian.co.uk',
    ...family.REQUIRED_HEADINGS.slice(0, 6)].forEach((text, index) => put(text, 30 + index * 18));
  accounts.forEach((changes, index) => {
    const account = { type: 'CREDIT CARD', history: ['01', '00'], update: '01/01/26', ...changes };
    const y = 250 + index * 180;
    put(`C${index + 1} Fictional Consumer`, y);
    put(`FICTIONAL BANK ${account.type}`, y + 18);
    put('Started 01/01/20 Balance £100 Credit Limit £500', y + 36);
    account.history.forEach((raw, position) => { put('Status history', y + 54 + position * 18);
      if (raw != null) put(raw, y + 54 + position * 18, 230); });
    (account.extra || []).forEach((text, position) => put(text, y + 108 + position * 18));
    if (account.update !== undefined) put(`File updated for the period to ${account.update}`, y + 144);
  });
  [...family.REQUIRED_HEADINGS.slice(6), 'Useful addresses'].forEach((text, index) =>
    put(text, 440 + accounts.length * 180 + index * 18));
  return buildWordPdf([{ words }], { page_size: { width: 800, height: 550 + accounts.length * 180 }, font_size: 10 });
}

function read(service, accounts, amend) {
  const bytes = nativePdf(accounts), file = path.join(service.dataDir, `do-gb-${++sequence}.pdf`);
  fs.writeFileSync(file, bytes);
  const model = formats.buildPdfDocumentModel(file); if (amend) amend(model);
  return { bytes, model, extraction: formats.extractWithSharedAdapter(model, { mode: 'REPORT', country: 'GB' }) };
}
function cells(reading, index = 0) { return reading.extraction.records[index]?.facts['account.paymentHistoryCells'] || []; }
function assess(reading) {
  const extraction = reading.extraction;
  const evaluation = { country: 'GB', region: 'GB-ENG', results: [], common_errors: common.runCommonErrorChecks({ extraction }) };
  return { evaluation, findings: issues.issuesFor({ extraction, evaluation }).filter((issue) => issue.check_id === HISTORY) };
}

async function run(service, check) {
  const positive = read(service, [{}]), record = positive.extraction.records[0];
  check.equal(positive.extraction.admission.admitted, true, 'the existing GB structure admits the fictional native account');
  check.equal(record.reader_family_id, family.FAMILY_ID, 'each account identifies its reviewed code-definition scope');
  check.deepEqual(cells(positive).map((cell) => cell.period), ['2026-01', '2025-12', '2026-01', '2025-12'],
    'published newest-first ordering uses the own update month with calendar rollover');
  check.deepEqual(cells(positive).map((cell) => cell.raw_code), ['0', '1', '0', '0'], 'printed characters retain their exact own readings');
  for (const cell of cells(positive)) {
    check.deepEqual(cell.code_definition, definitions.gbDefinitionForCode(cell.code, 'CREDIT CARD'), 'each code keeps its separately published meaning');
    check.ok(definitions.validatedDefinition(cell, record), 'source, type, own raw character and period derivation validate together');
    check.ok(cell.location.trusted && Number.isFinite(cell.location.x0), 'history reading has its own native source geometry');
    check.equal(cell.period_location.anchor.raw_value, '01/01/26', 'the own raw reporting-period caption is retained');
    check.deepEqual(cell.period_definition, definitions.gbPeriodDefinition(), 'monthly ordering retains its separately pinned published basis');
  }
  check.notEqual(cells(positive)[0].location.line, cells(positive)[2].location.line,
    'separate history captions remain separate physical readings');
  const finding = assess(positive).findings[0];
  check.equal(assess(positive).findings.length, 1, 'one own same-month contradiction reaches the active checklist');
  check.equal(finding?.source_facts.filter((source) => source.field === 'account.paymentHistoryCells').length, 2,
    'shared proof includes both conflicting report cells');
  check.equal(finding?.source_facts.filter((source) => source.field === 'account.paymentHistoryDefinition').length, 2,
    'shared proof includes both separately published code definitions');
  check.equal(finding && issues.publicIssue(finding).consumer_label, 'VIOLATION', 'the consumer breach label remains VIOLATION');
  check.equal(assess(read(service, [{ history: ['01', '01'] }])).findings.length, 0, 'identical repeated readings create no contradiction');
  check.equal(assess(read(service, [{ history: ['01'] }])).findings.length, 0, 'a normal overdue cell alone creates no violation');
  check.equal(assess(read(service, [{ history: ['0?', '00'] }])).findings.length, 0, 'an unknown monthly code creates no performance assertion');
  check.equal(assess(read(service, [{ history: ['01 damaged', '00'] }])).findings.length, 0, 'trailing damage is retained rather than discarded to choose a code');
  const dormant = read(service, [{ history: ['0DU8'] }]);
  check.ok(cells(dormant).filter((cell) => /[DU8]/.test(cell.code)).every((cell) => cell.performance_usable === false),
    'dormant, unclassified and default codes do not become repayment-performance assertions');
  const current = read(service, [{ type: 'CURRENT ACCOUNT' }]);
  check.equal(cells(current)[1].meaning, 'Account outside terms for one to two months', 'CURRENT ACCOUNT uses its distinct source-defined meaning');
  check.equal(cells(current)[1].code_definition.source.section.includes('page 19'), true, 'current-account meaning cites the applicable guide section');
  check.notEqual(cells(current)[1].meaning, cells(positive)[1].meaning, 'current-account and ordinary repayment semantics remain distinct');

  for (const changes of [
    { update: undefined }, { update: '' }, { update: '32/01/26' },
    { extra: ['File updated for the period to 01/02/26'] },
    { extra: ['Settled 04/01/26'] }, { extra: ['Settled'] },
    { extra: ['Defaulted 01/01/26'] }, { extra: ['Default £100'] }, { extra: ['Balance Satisfied'] }
  ]) {
    const rejected = read(service, [changes]);
    check.ok(cells(rejected).every((cell) => cell.period === null && cell.uncertain), 'a missing, ambiguous, settled or default timeline acquires no guessed month');
    check.equal(assess(rejected).findings.length, 0, 'an unresolved own timeline creates no contradiction');
  }
  const neighbor = read(service, [{ history: ['01'], update: undefined }, { history: ['00'] }]);
  check.ok(cells(neighbor).every((cell) => cell.period === null), 'an account without update cannot borrow its neighboring account period');
  check.equal(assess(neighbor).findings.length, 0, 'separate accounts do not become a same-record history contradiction');
  for (const target of ['01', '01/01/26', 'FICTIONAL']) {
    const rejected = read(service, [{}], (model) => {
      const word = model.pages[0].word_boxes.find((box) => box.text === target); if (word) word.trusted = false;
    });
    check.equal(assess(rejected).findings.length, 0, 'untrusted code, own update or lender/type source cannot create a contradiction');
  }
  for (const mutate of [
    (cell) => { cell.code_definition.source.sha256 = 'changed'; },
    (cell) => { cell.code_definition.source.url = 'https://example.test/changed'; },
    (cell) => { cell.code_definition.account_type = 'CURRENT ACCOUNT'; },
    (cell) => { cell.period = '2025-11'; }, (cell) => { cell.code_index = 1; },
    (cell) => { cell.raw_history = '00'; }, (cell) => { cell.period_location.anchor.line += 1; },
    (cell) => { cell.period_location.anchor.x0 += 1; }, (cell) => { cell.location.y0 += 1; },
    (cell) => { cell.period_definition.source.sha256 = 'changed'; },
    (cell) => { cell.period_definition.order = 'OLDEST_FIRST'; },
    (cell) => { cell.period_derivation.anchor_date = '2026-02-01'; }
  ]) {
    const rejected = read(service, [{}]); mutate(cells(rejected)[1]);
    check.equal(definitions.validatedDefinition(cells(rejected)[1], rejected.extraction.records[0]), null,
      'tampered source, type, raw reading or derived period fails the reviewed-definition check');
    check.equal(assess(rejected).findings.length, 0, 'tampered decisive history cannot surface a violation');
  }

  const publicFile = path.join(ROOT, 'SOURCE_CAPTURES/REPORT_FORMAT_BASELINE_2026-09-30/PUB-009.pdf');
  check.equal(crypto.createHash('sha256').update(fs.readFileSync(publicFile)).digest('hex'), family.FAMILY_CONTRACT.evidenced_sha256,
    'native source proof uses the exact accepted PUB-009 bytes');
  const publicReading = { extraction: formats.extractWithSharedAdapter(formats.buildPdfDocumentModel(publicFile), { mode: 'REPORT', country: 'GB' }) };
  const actual = publicReading.extraction.records.filter((row) => row.kind === 'GB_CREDIT_ACCOUNT');
  check.equal(actual.length, 5, 'the accepted source still retains five separate accounts');
  check.equal(actual.reduce((total, row) => total + row.facts['account.paymentHistoryCells'].length, 0), 32,
    'all 32 actual history characters remain retained');
  check.deepEqual(actual[0].facts['account.paymentHistoryCells'].map((cell) => cell.period),
    ['2007-05', '2007-04', '2007-03', '2007-02', '2007-01', '2006-12', '2006-11'], 'actual C1 dates use only its own May reporting period');
  check.equal(actual[1].facts['account.paymentHistoryCells'][0].period, '2007-03', 'actual C2 starts at its distinct own March period');
  check.ok(actual.slice(2).every((row) => row.facts['account.paymentHistoryCells'].every((cell) => cell.period === null)),
    'actual settled/default timelines keep unresolved periods');
  check.equal(actual[2].facts['account.paymentHistoryCells'][0].meaning, definitions.gbDefinitionForCode('0', 'LOAN').meaning,
    'unresolved timeline does not lose its independently sourced code meaning');
  check.equal(assess(publicReading).findings.length, 0, 'no history violation is manufactured from the accepted source');
  for (const [file, expected] of [
    ['experian-uk-consumer-code-guide.pdf', definitions.GB_SOURCE.sha256],
    ['experian-uk-cais-faq.html', definitions.GB_CAIS_SOURCE.sha256]
  ]) check.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,
    'SOURCE_CAPTURES/READER-CODE-DEFINITIONS-2026-10-07', file))).digest('hex'), expected, 'published definition source is the exact reviewed capture');

  const owner = await service.unpaidAccount('do-gb-history@example.test'); await service.pay(owner, 'monthly');
  const opened = await service.request('POST', '/api/cases', { token: owner.token, body: { country: 'GB', region: 'GB-ENG' } });
  const endpoint = `/api/cases/${opened.json.case.case_id}`;
  check.equal((await service.request('POST', endpoint + '/files', { token: owner.token, body: {
    originalFilename: 'fictional-gb-history.pdf', declaredBytes: positive.bytes.length, mimeType: 'application/pdf',
    contentBase64: positive.bytes.toString('base64') } })).status, 201, 'the dated history enters the ordinary native upload route');
  check.equal((await service.request('POST', endpoint + '/evaluate', { token: owner.token })).status, 201, 'the native history reaches live checklist assessment');
  const view = (await service.request('GET', endpoint + '/packet', { token: owner.token })).json.view;
  const offered = view.eligible_issues.find((issue) => issue.source_facts?.some((fact) => fact.definition_source));
  check.ok(offered, 'a source-defined same-period violation is offered for consumer selection');
  if (offered) {
    await service.request('POST', endpoint + '/packet/select', { token: owner.token, body: { issue_ids: [offered.issue_id] } });
    await service.request('POST', endpoint + '/packet/correspondence', { token: owner.token,
      body: { correspondence: { consumer_name: 'Fictional Consumer', contact: 'fictional@example.test' } } });
    await service.preparePostalPacket(owner, opened.json.case.case_id);
    check.equal((await service.request('POST', endpoint + '/packet/approve', { token: owner.token })).status, 200, 'the consumer approves the selected native history evidence');
    const download = await service.request('GET', endpoint + '/packet-download', { token: owner.token });
    check.equal(download.status, 200, 'the selected approved history packet downloads');
    check.ok(download.text.includes('printed "1"') && download.text.includes('printed "0"'), 'both conflicting own report codes remain printed evidence');
    const joinedPacket = download.text.replace(/\s/g, '');
    check.ok(joinedPacket.includes(definitions.GB_SOURCE.url.replace(/\s/g, '')) && joinedPacket.includes(definitions.GB_CAIS_SOURCE.url.replace(/\s/g, '')),
      'code meanings remain separate published citations in the packet');
    check.equal(/page undefined|probable violation|potential violation/i.test(download.text), false, 'packet has no invented source page or retired breach label');
  }
  return { source_artifact: 'PUB-009 accepted historical native source, plus separately pinned Experian UK guide and CAIS code definitions',
    actual_history_characters: 32, actual_periods_calculated: 18,
    supported_outcomes: 'own ongoing period + published history order/meaning -> same-period contradiction -> VIOLATION -> selected approved packet',
    remaining_source_dependencies: ['settled/default exact history periods', 'masked account identity', 'monetary past due', 'last-payment or first-delinquency caption', 'current UK layout evidence'] };
}

module.exports = { run, id: 'do-gb-history-definitions', title: 'GB source-defined history, own period derivation and native selected packet', nativePdf };
