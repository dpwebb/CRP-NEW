'use strict';
const fs = require('node:fs');
const path = require('node:path');
const formats = require('../../formats.cjs');
const general = require('../../general-intake.cjs');
const evaluation = require('../../evaluation.cjs');
const issues = require('../../issues.cjs');
const { sourceForField } = require('../../report-fact-sources.cjs');
const { buildWordPdf } = require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');
const PAID = 'COMMON-ERROR-PAID-SETTLED-SHOWN-UNPAID';
let sequence = 0;
function cardWords(card = {}, y = 65) {
  const xs = [40, 170, 300, 430];
  const rows = card.rows || [
    [['Account Type', 'Credit card'], ['Account Number / suffix', 'XXXX1234'], ['Ownership', 'Individual'], ['Responsibility', 'Sole']],
    [['Account Start Date', '2010-01-01'], ['Account End Date', '2020-01-01'], ['Last Payment Made', '2019-12-20'], ['First Delinquency Date', '2018-01-01']],
    [['Account Status', card.status || 'Paid in Full'], ['Status Date', '2026-06-12'], ['Payment Rating', '0'], ['High Credit', '£500']],
    [['Credit Limit', '£500'], ['Latest Balance', card.balance ?? '£100'], ['Past Due Amount', '£20'], ['Scheduled Payment', '£10']]
  ];
  const words = card.explicitHeading
    ? [{ text: 'Creditor: ' + (card.name || 'Cedar & Pine Bank'), x: 40, y }]
    : [{ text: card.name || 'Cedar & Pine Bank', x: 40, y }, { text: card.status || 'Paid in Full', x: 430, y }];
  rows.forEach((row, ri) => row.forEach(([caption, value], ci) => {
    const x = xs[ci], top = y + 18 + ri * 25;
    words.push({ text: caption, x, y: top });
    if (value !== null && value !== '') words.push({ text: value, x, y: top + 12 });
  }));
  if (card.history !== false) words.push({ text: 'Payment history: 0 0 0 0 (oldest to newest)', x: 40, y: y + 125 });
  return words;
}
function buildCardPdf(cards = [{}], options = {}) {
  const pages = options.pages || [{ words: [{ text: 'Equifax Consumer Credit Report', x: 40, y: 20 },
    { text: 'Report Date: 2026-06-12', x: 40, y: 36 }, ...cards.flatMap((card, i) => cardWords(card, 65 + i * 150)),
    ...(options.extraWords || [])] }];
  return buildWordPdf(pages, { font_size: 7, producer: 'Fictional positioned caption controls',
    creator: 'Fictional positioned caption controls' });
}
function nativePdf(t, cards = [{}], options = {}, amend) {
  const bytes = buildCardPdf(cards, options), file = path.join(t.dataDir, 'ds-columns-' + (++sequence) + '.pdf');
  fs.writeFileSync(file, bytes);
  const model = formats.buildPdfDocumentModel(file); if (amend) amend(model);
  return { bytes, model, extraction: formats.extractWithSharedAdapter(model, { mode: 'REPORT', country: options.country || 'GB' }) };
}
function findings(extraction) {
  return issues.issuesFor({ extraction, evaluation: evaluation.evaluateCase({ country: 'GB', region: 'GB-ENG', extraction }) })
    .filter((issue) => issue.check_id === PAID);
}
function changeValue(card, caption, value) {
  const rows = card.rows || [
    [['Account Type', 'Credit card'], ['Account Number / suffix', 'XXXX1234'], ['Ownership', 'Individual'], ['Responsibility', 'Sole']],
    [['Account Start Date', '2010-01-01'], ['Account End Date', '2020-01-01'], ['Last Payment Made', '2019-12-20'], ['First Delinquency Date', '2018-01-01']],
    [['Account Status', card.status || 'Paid in Full'], ['Status Date', '2026-06-12'], ['Payment Rating', '0'], ['High Credit', '£500']],
    [['Credit Limit', '£500'], ['Latest Balance', card.balance ?? '£100'], ['Past Due Amount', '£20'], ['Scheduled Payment', '£10']]
  ];
  return { ...card, rows: rows.map((row) => row.map(([label, raw]) => [label, label === caption ? value : raw])) };
}
async function run(t, check) {
  const positive = nativePdf(t), record = positive.extraction.records[0];
  check.equal(positive.extraction.presentation_id, general.GENERAL_PRESENTATION_ID, 'native physical cards use the existing shared general path');
  check.equal(positive.extraction.records.length, 1, 'old caption/value rows do not produce duplicate accounts');
  const fields = ['account.reported_identity', 'account.masked_identifier', 'account.status', 'account.responsibility',
    'liability.openedDate', 'liability.closedDate', 'tradeline.lastPaymentDate', 'tradeline.firstDelinquencyDate',
    'account.balance', 'account.pastDueAmount', 'account.creditLimit', 'account.paymentAmount'];
  check.deepEqual(fields.map((field) => record.facts[field]), ['CEDAR PINE BANK', 'MASK-1234', 'PAID IN FULL', 'INDIVIDUAL',
    '2010-01-01', '2020-01-01', '2019-12-20', '2018-01-01', 100, 20, 500, 10], 'own physical columns retain their distinct printed meanings');
  for (const field of fields) {
    const source = field === 'account.paymentAmount' ? record.printed[field] : sourceForField(record, field);
    check.ok(source && source.location.trusted && source.location.bbox, 'each usable field retains trusted own value geometry');
    if (!['account.reported_identity', 'account.status'].includes(field)) check.ok(source?.location.caption_location?.bbox, 'each separate caption retains its own geometry');
  }
  check.equal(sourceForField(record, 'tradeline.lastPaymentDate').source_field, 'Last Payment Made', 'US payment alias preserves the exact printed caption');
  check.equal(sourceForField(record, 'liability.closedDate').source_field, 'Account End Date', 'UK closure alias preserves the exact printed caption');
  check.equal(sourceForField(record, 'account.balance').source_field, 'Latest Balance', 'UK latest balance retains its exact printed caption');
  check.equal(sourceForField(record, 'account.reported_identity').raw_value, 'Cedar & Pine Bank', 'XML escaping never changes printed creditor punctuation');
  check.equal(findings(positive.extraction).length, 1, 'own paid status and positive balance reach one checklist violation');
  check.equal(issues.publicIssue(findings(positive.extraction)[0]).consumer_label, 'VIOLATION', 'the consumer term remains VIOLATION');
  check.equal((record.facts['account.paymentHistoryCells'] || []).length, 0, 'undated profile codes never acquire guessed periods');
  const explicit = nativePdf(t, [{ explicitHeading: true }]);
  check.equal(explicit.extraction.records.length, 1, 'an explicit own creditor caption bounds a following multi-column card');
  check.equal(findings(explicit.extraction).length, 1, 'own column status supplies the explicit-heading account');
  const multiple = nativePdf(t, [changeValue({ balance: '£0' }, 'Past Due Amount', '£0'), { name: 'Maple Bank', status: 'Current', balance: '£100' }]);
  check.equal(multiple.extraction.records.length, 2, 'two physical card headings preserve two records');
  check.deepEqual(multiple.extraction.records.map((r) => r.facts['account.balance']), [0, 100], 'neighbor balance belongs only to its own card');
  check.equal(findings(multiple.extraction).length, 0, 'a paid card never borrows another card balance');
  for (const [caption, field] of [['Latest Balance', 'account.balance'], ['Past Due Amount', 'account.pastDueAmount'],
    ['Last Payment Made', 'tradeline.lastPaymentDate'], ['Account End Date', 'liability.closedDate']]) {
    for (const raw of [null, '', 'N/A', 'damaged value']) {
      const e = nativePdf(t, [changeValue({}, caption, raw)]).extraction;
      check.equal(e.records[0].facts[field], undefined, 'missing/blank/damaged own value is never supplied by a neighboring column');
      check.ok(Object.values(e.records[0].printed).some((p) => p.label === caption && p.normalized == null), 'the own unresolved caption remains evidence');
      check.equal(e.records[0].facts['account.masked_identifier'], 'MASK-1234', 'independent readable identity survives an unrelated missing value');
    }
  }
  const ambiguous = nativePdf(t, [changeValue(changeValue({}, 'Account End Date', '01/05/2024'), 'Last Payment Made', '01/10/2026')]).extraction.records[0];
  check.equal(ambiguous.facts['liability.closedDate'], undefined, 'selected UK jurisdiction supplies no ambiguous day/month convention');
  check.equal(ambiguous.facts['tradeline.lastPaymentDate'], undefined, 'an ambiguous last-payment day remains unresolved independently');
  check.equal(ambiguous.printed.closed_date.interpretations.length, 2, 'both own closure interpretations remain available internally');
  for (const token of ['Latest', '£100', 'Last', 'XXXX1234', 'Paid']) {
    const e = nativePdf(t, [changeValue({}, 'Past Due Amount', '£0')], {}, (model) => {
      model.pages[0].word_boxes.filter((w) => w.text === token).forEach((w) => { w.trusted = false; });
    }).extraction;
    check.equal(e.records[0].facts['liability.openedDate'], '2010-01-01', 'independent readable date survives an untrusted decisive word');
    if (['Latest', '£100'].includes(token)) check.equal(findings(e).length, 0, 'untrusted own money caption/value cannot support the violation');
    if (token === 'XXXX1234') check.equal(e.records[0].facts['account.masked_identifier'], undefined, 'untrusted masked digits are withheld');
    if (token === 'Last') check.equal(e.records[0].facts['tradeline.lastPaymentDate'], undefined, 'untrusted payment caption is withheld');
    if (token === 'Paid') check.equal(findings(e).length, 0, 'untrusted decisive status cannot establish the violation');
  }
  const decoration = nativePdf(t, [{}], { extraWords: [{ text: 'WATERMARK', x: 520, y: 111 }] }, (model) => {
    model.pages[0].word_boxes.filter((w) => w.text === 'WATERMARK').forEach((w) => { w.y1 = w.y0 + 80; w.trusted = false; });
  }).extraction;
  check.equal(decoration.records[0].facts['account.balance'], 100, 'unrelated oversized watermark words do not withdraw readable own money');
  check.equal(decoration.records[0].facts['tradeline.lastPaymentDate'], '2019-12-20', 'unrelated decoration does not change a decisive date trust');
  check.equal(findings(decoration).length, 1, 'the supported independent issue survives decoration');
  const misaligned = nativePdf(t, [{}], {}, (model) => {
    model.pages[0].word_boxes.filter((w) => w.text === '£100').forEach((w) => { w.x0 += 45; w.x1 += 45; });
  }).extraction;
  check.equal(misaligned.records[0].facts['account.balance'], undefined, 'unbound value elsewhere in a column is never guessed');
  check.equal(misaligned.records[0].facts['account.pastDueAmount'], 20, 'the neighboring own past-due value remains independently readable');
  const duplicateRow = nativePdf(t, [changeValue({}, 'Past Due Amount', '£0')], { extraWords: [{ text: '£0', x: 170, y: 177 }] }).extraction;
  check.equal(duplicateRow.records[0].facts['account.balance'], undefined, 'two baselines supplying one money caption remain unresolved');
  check.equal(findings(duplicateRow).length, 0, 'a duplicated own-column value cannot become a positive balance');
  const unmasked = nativePdf(t, [changeValue({}, 'Account Number / suffix', '123456789012')]).extraction;
  check.equal(unmasked.records[0].facts['account.masked_identifier'], undefined, 'full account numbers never become masked identifiers');
  check.equal(JSON.stringify(unmasked.records).includes('123456789012'), false, 'unmasked numbers are not retained in readings');
  const unsafe = nativePdf(t, [{ rows: [
    [['Account Type', 'Credit card'], ['Account Number', 'XXXX1234'], ['Account Status', 'Current'], ['Responsibility', 'Joint']],
    [['Account Holder End Date', '2020-01-01'], ['Payment Start Date', '2018-01-01'], ['DateLastUpdate', '2026-06-12'], ['No of Overdue Payments', '9']]
  ] }]).extraction.records[0];
  for (const field of ['liability.closedDate', 'tradeline.lastPaymentDate', 'tradeline.firstDelinquencyDate', 'account.pastDueAmount'])
    check.equal(unsafe.facts[field], undefined, 'party end, due-start, reporting date and overdue counts never substitute requested facts');
  const crosspageWords = cardWords({});
  const split = nativePdf(t, [], { pages: [
    { words: [{ text: 'Equifax Consumer Credit Report', x: 40, y: 20 }, ...crosspageWords.filter((w) => w.y < 113)] },
    { words: crosspageWords.filter((w) => w.y >= 113) }
  ] }).extraction;
  check.equal(split.records[0].facts['tradeline.lastPaymentDate'], undefined, 'own physical values never supply a caption across pages');
  check.equal(findings(split).length, 0, 'the previous page paid heading cannot borrow a subsequent page balance');
  check.equal(split.records[0].printed.closed_date.reason, 'OWN_COLUMN_VALUE_NOT_READ', 'unread continuation is distinct from an explicitly printed blank');
  const noHeading = nativePdf(t, [], { pages: [{ words: [{ text: 'Equifax Consumer Credit Report', x: 40, y: 20 },
    ...cardWords(changeValue({ balance: '£0' }, 'Past Due Amount', '£0')), ...cardWords({ name: 'Neighbor Bank', balance: '£100' }, 215).filter((w) => w.y !== 215)] }] }).extraction;
  check.equal(findings(noHeading).length, 0, 'a card missing its own heading cannot borrow the preceding paid account');
  const prose = nativePdf(t, [changeValue({ balance: '£0' }, 'Past Due Amount', '£0')], { extraWords: [
    { text: 'Total credit limit: £9000', x: 40, y: 205 },
    { text: 'UK judgments are reportable for 6 years from the judgment date', x: 40, y: 220 },
    { text: 'Co-applicants / Joint holders', x: 40, y: 235 },
    { text: 'Fictional Person Joint mortgage 1234 Fictional Street', x: 40, y: 250 },
    { text: 'Balance: £9000 Status: Paid in Full', x: 40, y: 265 }
  ] }).extraction;
  check.equal(prose.records.length, 1, 'summary, explanatory guide and co-applicant sections do not create creditor/public records');
  check.equal(prose.records[0].facts['account.balance'], 0, 'later boilerplate never changes an own card balance');
  check.equal(findings(prose).length, 0, 'guide/table words never fabricate a checklist violation');
  const roleNote = nativePdf(t, [{ status: 'Current', balance: '£0' }], { extraWords: [
    { text: 'Authorized user on primary cardholder account', x: 40, y: 205 }
  ] }).extraction;
  check.equal(roleNote.records.length, 1, 'an unlabelled own responsibility note is not a new creditor account');
  const separateRole = nativePdf(t, [changeValue({}, 'Responsibility', 'Authorized User')]).extraction.records[0];
  check.equal(separateRole.facts['account.responsibility'], 'AUTHORIZED_USER', 'explicit consumer responsibility preserves its different ownership axis');
  check.equal(separateRole.printed['account.ownership'].raw, 'Individual', 'own printed ownership remains independently retained');
  check.equal(sourceForField(separateRole, 'account.responsibility').source_field, 'Responsibility', 'consumer role uses its actual own responsibility caption');
  const overview = nativePdf(t, [], { pages: [{ words: [
    { text: 'Equifax Consumer Credit Report File opened: 2010-01-01', x: 40, y: 20 },
    { text: 'Date of birth: 1980-01-01', x: 40, y: 40 },
    { text: 'Derogatory 0 Total balance £9000', x: 40, y: 60 },
    { text: 'Financial associates', x: 40, y: 80 },
    { text: 'Fictional Associate Joint mortgage 1234 Test Street', x: 40, y: 100 }
  ] }] }).extraction;
  check.equal(overview.records.length, 0, 'header, identity, summary and associates tables do not become account records');
  const employer = nativePdf(t, [], { pages: [{ words: [
    { text: 'Equifax Consumer Credit Report', x: 40, y: 20 },
    { text: 'Employers', x: 40, y: 40 }, { text: 'Fictional Systems Inc 2020-01-01', x: 40, y: 55 },
    ...cardWords({}, 85)
  ] }] }).extraction;
  check.equal(employer.records.length, 1, 'employer reporting dates never become accounts and a subsequent own card resumes normal reading');
}
module.exports = { id: 'ds-column-caption-fields', title: 'Physical own-column account captions and bounded report facts',
  run, cardWords, buildCardPdf, nativePdf, changeValue };
