'use strict';
const fs = require('node:fs');
const path = require('node:path');
const formats = require('../../formats.cjs');
const engine = require('../../evaluation.cjs');
const issues = require('../../issues.cjs');
const { sourceForField } = require('../../report-fact-sources.cjs');
const general = require('../../general-intake.cjs');
const assembly = require('../../multi-file-assembly.cjs');
const { buildWordPdf } = require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');
const PAID = 'COMMON-ERROR-PAID-SETTLED-SHOWN-UNPAID';
let sequence = 0;
function lines(balance = '£100', status = 'Paid in Full', anchor = '2020-01-01', report = '2026-06-12') {
  return ['Equifax Consumer Credit Report', 'Report Date: ' + report, 'Creditor:', 'Cedar & Pine Bank',
    'Account Number:', 'XXXX1234', 'Opened:', '2010-01-01', 'Status:', status,
    'First Delinquency Date:', anchor, 'Last Payment Date:', '2017-01-01', 'Balance:', balance];
}
function native(t, content = lines(), amend) {
  const bytes = buildWordPdf([{ words: content.map((text, index) => ({ text, x: 40, y: 30 + index * 16 })) }],
    { producer: 'Fictional behavioral source', creator: 'Fictional behavioral source' });
  const file = path.join(t.dataDir, 'dl-native-' + (++sequence) + '.pdf'); fs.writeFileSync(file, bytes);
  const model = formats.buildPdfDocumentModel(file); if (amend) amend(model);
  return { bytes, model, extraction: formats.extractWithSharedAdapter(model, { mode: 'REPORT', country: 'GB' }) };
}
function synthetic(content) {
  return formats.extractWithSharedAdapter(formats.makeSyntheticModel({ pages: [content] }), { mode: 'REPORT', country: 'GB' });
}
function finding(extraction) {
  return issues.issuesFor({ extraction, evaluation: engine.evaluateCase({ country: 'GB', region: 'GB-ENG', extraction }) })
    .filter((issue) => issue.check_id === PAID);
}
async function run(t, check) {
  const positive = native(t), record = positive.extraction.records[0];
  check.equal(positive.extraction.presentation_id, 'GENERAL-BUREAU-REPORT', 'existing general path admits the fictional source');
  check.equal(positive.extraction.records.length, 1, 'an explicit creditor starts its own account before amounts or dates');
  check.deepEqual(['account.reported_identity', 'account.masked_identifier', 'liability.openedDate',
    'tradeline.firstDelinquencyDate', 'tradeline.lastPaymentDate', 'account.balance'].map((field) => record.facts[field]),
    ['CEDAR PINE BANK', 'MASK-1234', '2010-01-01', '2020-01-01', '2017-01-01', 100], 'caption/value pairs retain identity, anchor and currency');
  for (const [field, caption, value] of [['account.masked_identifier', 5, 6], ['liability.openedDate', 7, 8],
    ['tradeline.firstDelinquencyDate', 11, 12], ['account.balance', 15, 16]]) {
    const source = sourceForField(record, field);
    check.equal(source?.location.line, value, 'the value retains its physical line');
    check.equal(source?.location.caption_location.line, caption, 'the separate caption source is retained');
    check.ok(source?.location.bbox && source.location.caption_location.bbox, 'both physical word boxes are retained');
  }
  check.equal(sourceForField(record, 'account.reported_identity').raw_value, 'Cedar & Pine Bank', 'normalization preserves printed creditor punctuation');
  check.equal(sourceForField(record, 'account.balance').source_field, 'Balance', 'consumer balance evidence retains its literal caption instead of an internal field identifier');
  check.equal(finding(positive.extraction).length, 1, 'the supported balance/status contradiction reaches one checklist violation');
  check.equal(issues.publicIssue(finding(positive.extraction)[0]).consumer_label, 'VIOLATION', 'consumer verdict retains owner term');
  for (const [caption, field] of [['Opened Date', 'liability.openedDate'], ['Date Opened', 'liability.openedDate'],
    ['Closed Date', 'liability.closedDate'], ['Date Closed', 'liability.closedDate']]) {
    const reading = native(t, ['Equifax Credit Report', 'Report Date: 2026-06-12', 'Creditor: Cedar Bank', caption + ':', '2020-01-01']);
    check.equal(reading.extraction.records[0].facts[field], '2020-01-01', 'the whole printed date caption retains its specific meaning');
    check.equal(sourceForField(reading.extraction.records[0], field)?.location.caption_location.line, 4, 'each date alias retains its own physical caption');
  }
  for (const [amount, expected] of [['£0', 0], ['(£100)', -100], ['-£100', -100], ['£-100', -100], ['$100', 100], ['€100', 100], ['100', 100], ['0', 0], ['-100', -100]]) {
    const extraction = synthetic(lines(amount));
    check.equal(extraction.records[0].facts['account.balance'], expected, 'complete printed currency preserves its number and sign');
    check.equal(finding(extraction).length, expected > 0 ? 1 : 0, 'zero and credit balances are benign');
  }
  for (const [caption, role] of [['Individual Account', 'INDIVIDUAL'], ['Joint Account', 'JOINT'],
    ['Authorized User', 'AUTHORIZED_USER'], ['Co-Signer', 'JOINT']]) {
    const extraction = synthetic(['Equifax Credit Report', 'Report Date: 2026-06-12',
      'Creditor: Cedar Bank Opened 2020-01-01 Balance $100.00 ' + caption, 'Account Number XXXX1234']);
    check.equal(extraction.records[0].facts['account.balance'], 100, 'a following printed responsibility caption preserves the complete balance');
    check.equal(extraction.records[0].facts['account.responsibility'], role, 'the neighboring responsibility remains its own fact');
  }
  for (const raw of ['£100 garbage', '£1,00', '—£100', '++£100']) {
    const extraction = synthetic(lines().slice(0, -2).concat('Balance: ' + raw));
    check.equal(extraction.records[0].facts['account.balance'], undefined, 'a damaged monetary caption is not truncated to debt');
    check.equal(finding(extraction).length, 0, 'damaged readings cannot support the violation');
    check.equal(finding(synthetic(lines(raw))).length, 0, 'damaged split values cannot escape their caption as a generic amount');
    check.equal(finding(synthetic(lines().concat('Balance:', raw))).length, 0, 'a rejected later split balance cannot revive an earlier amount');
  }
  const duplicate = synthetic(lines().concat('Balance: £0'));
  check.equal(sourceForField(duplicate.records[0], 'account.balance'), null, 'contradictory second balance is authoritative rejection');
  check.equal(finding(duplicate).length, 0, 'neither duplicate balance supplies the violation');
  check.equal(finding(synthetic(lines().concat('Status: Current'))).length, 0, 'conflicting status captions never choose one');
  const nextCaption = synthetic(lines().slice(0, -1).concat('Credit Limit:', '£100'));
  check.equal(nextCaption.records[0].facts['account.balance'], undefined, 'next caption cannot become preceding caption value');
  check.equal(nextCaption.records[0].facts['account.creditLimit'], 100, 'next caption reads its actual own value');
  const neighbor = native(t, lines(), (model) => {
    for (const word of model.pages[0].word_boxes) if (word.text === '£100') { word.x0 += 300; word.x1 += 300; }
  });
  check.equal(neighbor.extraction.records[0].facts['account.balance'], undefined, 'neighboring column cannot supply adjacent caption');
  for (const wordText of ['Balance:', '£100', 'Paid']) {
    const unreadable = native(t, lines(), (model) => {
      for (const word of model.pages[0].word_boxes) if (word.text === wordText) word.trusted = false;
    });
    check.equal(finding(unreadable.extraction).length, 0, 'untrusted caption/value/status word cannot become evidence');
    check.equal(unreadable.extraction.records[0].facts['tradeline.firstDelinquencyDate'], '2020-01-01', 'independent readable anchor survives');
  }
  const repeated = native(t, ['Equifax Credit Report', 'Report Date: 2026-06-12',
    'Creditor: Cedar Bank Opened 2020-01-01 Closed 2019-01-01', 'Creditor: Cedar Bank Opened 2020-01-01 Closed 2019-01-01'],
    (model) => { for (const word of model.pages[0].word_boxes) if (word.text === '2019-01-01') word.trusted = false; });
  check.equal(repeated.extraction.records.some((row) => row.facts['liability.closedDate']), false, 'repeated native lines never replace ambiguous trust with certainty');
  const repeatedTrusted = native(t, ['Equifax Credit Report', 'Report Date: 2026-06-12',
    'Creditor: Cedar Bank Opened 2020-01-01', 'Account Number XXXX1234', 'Balance £100',
    'Creditor: Cedar Bank Opened 2020-01-01', 'Account Number XXXX1234', 'Balance £100']);
  check.equal(repeatedTrusted.extraction.records.length, 2, 'identical native account text retains both physical records');
  check.equal(repeatedTrusted.extraction.records.every((row) => row.facts['account.masked_identifier'] === 'MASK-1234'), true,
    'matching repeated line/row counts retain trusted native identity instead of adding a certainty gate');
  const separate = formats.makeSyntheticModel({ pages: [lines().slice(0, -1), ['£100']] });
  check.equal(formats.extractWithSharedAdapter(separate, { mode: 'REPORT', country: 'GB' }).records[0].facts['account.balance'],
    undefined, 'a value across the page boundary cannot supply a caption');
  const ownNeighbor = synthetic(lines('£0').concat('Creditor: Neighbor Bank', 'Opened 2011-01-01', 'Balance £100', 'Status Current'));
  check.equal(ownNeighbor.records.length, 2, 'next creditor creates its own account boundary');
  check.equal(finding(ownNeighbor).length, 0, 'first paid account never borrows neighbor positive balance');
  const monthEarlier = assembly.assemble([{ file_id: 'dl-month-earlier', extraction:
    native(t, lines('$100', 'Charged Off', 'January 2018', '2025-06-12')).extraction }]).extraction;
  const monthCurrent = assembly.assemble([{ file_id: 'dl-month-current', extraction:
    native(t, lines('$100', 'Charged Off', 'January 2020')).extraction }]).extraction;
  check.equal(monthCurrent.records[0].facts['tradeline.firstDelinquencyDate'], '2020-01', 'a printed original month anchor is retained without requiring an invented day');
  check.equal(monthCurrent.records[0].facts['tradeline.firstDelinquencyDatePrecision'], 'MONTH', 'original-anchor month precision stays explicit');
  const monthContext = { extraction: monthCurrent, evaluation: engine.evaluateCase({ country: 'US', region: 'US-NY',
    extraction: monthCurrent, prior_reports: [{ result_id: 'dl-month-prior', extraction: monthEarlier }] }) };
  const monthIssue = issues.issuesFor(monthContext).find((issue) => issue.check_id === 'COMMON-ERROR-POTENTIAL-RE-AGING-SIGNAL');
  check.ok(monthIssue?.eligible, 'nonoverlapping source-linked original months enable the existing re-aging verification');
  check.deepEqual(monthIssue?.source_facts.filter((fact) => fact.field === 'tradeline.firstDelinquencyDate')
    .map((fact) => [fact.raw_value, fact.normalized_value]), [['January 2018', '2018-01'], ['January 2020', '2020-01']],
  'month evidence contains no substituted first day');
  const overlap = assembly.assemble([{ file_id: 'dl-month-overlap', extraction:
    native(t, lines('$100', 'Charged Off', '2018-01-15')).extraction }]).extraction;
  check.equal(issues.issuesFor({ extraction: overlap, evaluation: engine.evaluateCase({ country: 'US', region: 'US-NY',
    extraction: overlap, prior_reports: [{ result_id: 'dl-month-prior', extraction: monthEarlier }] }) })
    .filter((issue) => issue.check_id === 'COMMON-ERROR-POTENTIAL-RE-AGING-SIGNAL').length, 0,
  'an overlapping month/day anchor does not establish forward re-aging');
  for (const [captionTrusted, valueTrusted] of [[false, true], [true, false]]) {
    const rows = [
      { text: 'Creditor: Cedar Bank', page: 1, line: 1, trusted: true },
      { text: 'Opened 2020-01-01', page: 1, line: 2, trusted: true },
      { text: 'Status: Paid in Full', page: 1, line: 3, trusted: true },
      { text: 'Balance:', page: 1, line: 4, source: 'LOCAL_OCR', trusted: true,
        words: [{ text: 'Balance:', start: 0, end: 8, trusted: captionTrusted }] },
      { text: '      $100', page: 1, line: 5, source: 'LOCAL_OCR', trusted: true,
        words: [{ text: '$100', start: 6, end: 10, trusted: valueTrusted }] }
    ];
    const extracted = general.buildRecords([{ page: 1, lines: rows }])[0];
    check.equal(extracted.facts['account.balance'], undefined, 'high OCR line mean never hides an uncertain caption or indented decisive value');
  }

  const owner = await t.unpaidAccount('dl-source-owner@example.test'); await t.pay(owner, 'monthly');
  async function upload(content) {
    const bytes = native(t, content).bytes;
    const opened = await t.request('POST', '/api/cases', { token: owner.token, body: { country: 'US', region: 'US-NY' } });
    const id = opened.json.case.case_id;
    check.equal((await t.request('POST', '/api/cases/' + id + '/files', { token: owner.token, body: {
      originalFilename: 'fictional-general.pdf', declaredBytes: bytes.length, mimeType: 'application/pdf', contentBase64: bytes.toString('base64') } })).status, 201, 'native caption source uploads');
    const assessed = await t.request('POST', '/api/cases/' + id + '/evaluate', { token: owner.token });
    check.equal(assessed.status, 201, 'existing consumer assessment runs');
    return id;
  }
  await upload(lines('$100', 'Charged Off', '2018-01-01', '2025-06-12'));
  const current = await upload(lines('$100', 'Charged Off'));
  const view = (await t.request('GET', '/api/cases/' + current + '/packet', { token: owner.token })).json.view;
  const selected = view.eligible_issues.find((issue) => issue.evidence?.earlier_anchor === '2018-01-01' && issue.evidence.current_anchor === '2020-01-01');
  check.ok(selected, 'split identity and anchor captions enable owned re-aging');
  if (selected) {
    check.equal(selected.consumer_label, 'VIOLATION', 'changed anchor uses sole consumer verdict');
    await t.request('POST', '/api/cases/' + current + '/packet/select', { token: owner.token, body: { issue_ids: [selected.issue_id] } });
    await t.request('POST', '/api/cases/' + current + '/packet/correspondence', { token: owner.token, body: { correspondence: { consumer_name: 'Fictional Consumer', contact: 'fictional@example.test' } } });
    check.equal((await t.request('POST', '/api/cases/' + current + '/packet/approve', { token: owner.token })).status, 200, 'consumer approves paired evidence');
    const download = await t.request('GET', '/api/cases/' + current + '/packet-download', { token: owner.token });
    check.equal(download.status, 200, 'approved changed-anchor packet downloads');
    check.ok(download.text.includes('2018-01-01') && download.text.includes('2020-01-01') && download.text.includes('page 1, line 12'), 'packet retains both anchors and physical value line');
    t.service.store.update((state) => { sourceForField(state.results.find((r) => r.case_id === current).extraction.records[0], 'tradeline.firstDelinquencyDate').location.caption_location.line += 1; });
    check.equal((await t.request('GET', '/api/cases/' + current + '/packet-download', { token: owner.token })).status, 409, 'changed caption provenance invalidates approval');
  }
  return { mapping: 'own account heading and adjacent caption/value', reaging_packet: 'native owned reports', deployment: 'NOT_PERFORMED' };
}
module.exports = { run, id: 'dl-general-caption-sources', title: 'General own caption/value sources and re-aging packet integration' };
