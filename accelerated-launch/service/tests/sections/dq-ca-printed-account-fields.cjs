'use strict';

// Fictional positioned PR-01 account tables. These tests do not extend digest admission.
const fs = require('node:fs');
const formats = require('../../formats.cjs');
const ca = require('../../ca-consumer-file-facts.cjs');
const { sourceForField } = require('../../report-fact-sources.cjs');
const fixtures = require('../../../../internal-validation/ca-ns-last-payment-six-year/tests/fixtures.cjs');

function pageFromWords(words, page = 1) {
  const ys = [...new Set(words.map((w) => w.y0))].sort((a, b) => a - b);
  const lines = ys.map((y) => words.filter((w) => w.y0 === y).sort((a, b) => a.x0 - b.x0)
    .map((w) => w.text).join(' '));
  return { page, lines, text: lines.join('\n'), has_native_text: true, word_boxes: words };
}

function accountWords(options = {}) {
  const words = [];
  const word = (text, x, y) => { if (text != null && text !== '') words.push({
    text: String(text), x0: x, y0: y, x1: x + Math.min(String(text).length * 4, 52), y1: y + 10
  }); };
  word(options.section || 'Accounts - Revolving', 30, 50);
  word(options.creditor || 'FICTIONAL CREDITOR', 30, 80);
  word('Overview', 30, 100);
  for (const [text, x, y] of [
    ['Account', 30, 126], ['Number', 30, 141], ['Phone', 90, 133],
    ['Highest', 140, 126], ['Balance', 140, 141], ['Notes', 200, 133],
    ['Member', 280, 126], ['Number', 280, 141], ['Rating Code Description', 370, 133]
  ]) word(text, x, y);
  word(options.mask === undefined ? '***4321' : options.mask, 30, 176);
  word('$500', 140, 176);
  const notes = options.notes === undefined ? ['Written-off', 'Closed by', 'credit grantor'] : options.notes;
  notes.forEach((text, i) => word(text, 200, 162 + i * 14));
  word('Open - Bad debt, collection', 370, 176); // product/performance description, never current lifecycle
  word('Balance And', 30, 220); word('Amounts', 30, 235); word('Account Dates', 140, 227);
  word('Balance', 30, 260); word(options.balance ?? '$70', 90, 260);
  word('Opened', 140, 260); word(options.opened ?? '2020/01/02', 200, 260);
  word('Credit', 30, 293); word('Limit', 58, 293); word(options.limit ?? '$300', 90, 293);
  word('Last', 140, 286); word('Reported', 140, 301); word('2026/04/14', 200, 293);
  word('Payment', 30, 335); word('Due', 30, 350); word(options.scheduled ?? '', 90, 342);
  word('Last', 140, 335); word('Payment', 140, 350); word(options.payment ?? '2023/10/27', 200, 342);
  word('Actual', 30, 376); word('payment', 30, 391); word(options.actual ?? '', 90, 383);
  word('Date', 140, 376); word('Closed', 140, 391); word(options.closed ?? '2024/06/17', 200, 383);
  word('Amount', 30, 417); word('Past', 30, 432); word('Due', 55, 432); word(options.pastDue ?? '$25', 90, 424);
  word('Amount', 30, 458); word('Written', 30, 473); word('Oﬀ', 65, 473); word(options.writtenOff ?? '$70', 90, 465);
  word('Payment Details', 30, 510);
  word('Payment', 30, 552); word('Responsibility', 30, 567); word(options.role ?? 'Individual', 140, 559);
  word('Inquiries', 30, 600);
  return words;
}

function modelFor(options = {}, mutate) {
  const words = accountWords(options);
  if (mutate) mutate(words);
  const model = formats.makeSyntheticModel({ pages: [[]] });
  model.pages = [pageFromWords(words)]; model.page_count = 1;
  return model;
}

function first(options, mutate) { return ca.read(modelFor(options, mutate)).ordinary_records[0]; }

async function run(t, check) {
  const positive = first();
  check.equal(positive.kind, 'CA_EQUIFAX_ORDINARY_ACCOUNT', 'ordinary accounts are separate from historical collection indexes');
  check.equal(positive.facts['account.masked_identifier'], 'MASK-4321', 'a physically masked own account number supports identity');
  check.equal(positive.printed['Account Number'].raw, '***4321', 'only the masked printed value is retained');
  check.match(positive.facts['account.reported_identity'], /^CREDITOR-[a-f0-9]{24}$/, 'creditor matching uses a privacy token');
  check.equal(positive.facts['account.display_name'], 'FICTIONAL CREDITOR', 'the printed business heading is retained for the consumer account label');
  check.ok(!JSON.stringify(positive.fact_sources['account.reported_identity']).includes('FICTIONAL CREDITOR'), 'private matching sources still retain only a creditor token');
  check.equal(positive.facts['account.balance'], 70, 'the Balance caption supplies current balance, not Highest Balance');
  check.equal(positive.facts['account.creditLimit'], 300, 'credit limit remains a separately labelled value');
  check.equal(positive.facts['account.pastDueAmount'], 25, 'wrapped Amount Past Due owns its centered value');
  check.equal(positive.facts['tradeline.writtenOffAmount'], 70, 'the ff ligature retains the actual Amount Written Off caption');
  check.equal(positive.facts['account.status'], 'CLOSED', 'explicit own closure notes supply lifecycle despite an Open rating description');
  check.equal(positive.facts['account.responsibility'], 'INDIVIDUAL', 'wrapped responsibility binds its own literal value');
  check.equal(positive.facts['liability.openedDate'], '2020-01-02', 'opened date keeps its own caption');
  check.equal(positive.facts['tradeline.lastPaymentDate'], '2023-10-27', 'the centered payment date does not borrow the reported date');
  check.equal(positive.facts['liability.closedDate'], '2024-06-17', 'the centered closed date does not borrow the payment date');
  check.equal(positive.printed['Closed Date'].label, 'Date Closed', 'the completeness alias retains the actual printed caption');
  check.equal(positive.facts['tradeline.firstDelinquencyDate'], undefined, 'neither closure nor written-off notes invent a delinquency anchor');
  check.equal(positive.report_status_statements[0].raw_value, 'Written-off Closed by credit grantor', 'full own notes remain available to the existing completeness predicate');
  for (const field of Object.keys(positive.facts)) {
    const source = sourceForField(positive, field);
    check.ok(source && source.location.bbox && source.location.trusted, 'each supported field retains its trusted own geometry');
    check.equal(positive.fact_sources[field].caption_count, 1, 'each supported source has one own caption');
  }
  for (const field of ['account.masked_identifier', 'account.balance', 'tradeline.lastPaymentDate', 'liability.closedDate',
    'account.pastDueAmount', 'account.responsibility', 'account.status']) {
    check.ok(positive.fact_sources[field].location.caption_location.bbox, 'caption and value retain separate physical locations');
  }

  const blank = first({ mask: '', closed: '', payment: '', pastDue: '', notes: ['Closed by credit grantor'] });
  for (const [caption, field] of [['Account Number', 'account.masked_identifier'], ['Date Closed', 'liability.closedDate'],
    ['Last Payment', 'tradeline.lastPaymentDate'], ['Amount Past Due', 'account.pastDueAmount']]) {
    check.equal(blank.printed[caption].state, 'LABEL_PRINTED_WITHOUT_VALUE', 'a captioned blank remains a measured blank');
    check.equal(blank.facts[field], undefined, 'a blank cannot borrow another account field');
  }
  check.equal(blank.report_status_statements.length, 1, 'supported explicit closure remains available when its own closed date is blank');
  check.equal(blank.facts['account.status'], 'CLOSED', 'missing closed date does not erase the independent closure statement');
  check.equal(first({ notes: ['Not rated'], role: 'Joint' }).facts['account.status'], undefined, 'an Open product rating is never current open status');
  check.equal(first({ notes: ['Not rated'], role: 'Joint' }).facts['account.responsibility'], 'JOINT', 'literal Joint responsibility is independently retained');
  check.equal(first({ notes: ['Previously open; status unknown'] }).facts['account.status'], undefined,
    'a historical or qualified open reference is not a current lifecycle');
  const conflicting = first({ notes: ['Closed by consumer', 'Account Active'] });
  check.equal(conflicting.facts['account.status'], undefined, 'conflicting own notes cannot choose a lifecycle');
  check.deepEqual(conflicting.report_status_statements, [], 'conflicting lifecycle notes are unavailable to completeness checks');
  const duplicateNotes = first({}, (words) => words.push({ ...words.find((w) => w.text === 'Notes'), y0: 147, y1: 157 }));
  check.equal(duplicateNotes.facts['account.status'], undefined, 'duplicate own Notes captions cannot provide resolved status');
  check.deepEqual(duplicateNotes.report_status_statements, [], 'duplicate Notes cannot supply a trusted completeness statement');
  for (const [options, field] of [
    [{ mask: '123456789012' }, 'account.masked_identifier'],
    [{ balance: '$ 1,00' }, 'account.balance'],
    [{ balance: '$70 damaged' }, 'account.balance'],
    [{ closed: '2024/02/30' }, 'liability.closedDate'],
    [{ role: 'Principal' }, 'account.responsibility']
  ]) {
    const record = first(options);
    check.equal(record.facts[field], undefined, 'unsupported or damaged whole values remain unresolved');
    check.equal(record.fact_sources[field], undefined, 'unsupported values cannot produce authoritative sources');
  }
  check.ok(!JSON.stringify(first({ mask: '123456789012' })).includes('123456789012'), 'a full unmasked number never leaves the reader');
  const absentHeading = first({}, (words) => { words.splice(words.findIndex((w) => w.text === 'FICTIONAL CREDITOR'), 1); });
  check.equal(absentHeading.facts['account.reported_identity'], undefined, 'an account section heading cannot become creditor identity');
  check.equal(absentHeading.facts['account.masked_identifier'], 'MASK-4321', 'an absent creditor heading does not discard independent printed mask');
  for (const [field, select] of [
    ['account.masked_identifier', (w) => w.text === 'Account' && w.y0 === 126],
    ['account.masked_identifier', (w) => w.text === '***4321'],
    ['tradeline.lastPaymentDate', (w) => w.text === 'Payment' && w.x0 === 140],
    ['tradeline.lastPaymentDate', (w) => w.text === '2023/10/27'],
    ['account.balance', (w) => w.text === 'Balance' && w.y0 === 260],
    ['account.status', (w) => w.text === 'Notes'],
    ['account.reported_identity', (w) => w.text === 'FICTIONAL CREDITOR']
  ]) {
    const record = first({}, (words) => { words.find(select).trusted = false; });
    check.equal(record.facts[field], undefined, 'an untrusted own caption or value cannot supply a decisive fact');
    check.equal(record.fact_sources[field], undefined, 'untrusted sources are not silently resolved');
    check.ok(record.facts['account.creditLimit'] === 300, 'an independent trusted field stays usable');
  }
  const duplicated = first({}, (words) => {
    words.push({ text: 'Date', x0: 140, x1: 158, y0: 398, y1: 408 },
      { text: 'Closed', x0: 140, x1: 169, y0: 412, y1: 422 },
      { text: '2025/01/01', x0: 200, x1: 251, y0: 405, y1: 415 });
  });
  check.equal(duplicated.printed['Date Closed'].printed_times_in_record, 2, 'duplicate dates retain both own caption occurrences');
  check.equal(duplicated.facts['liability.closedDate'], undefined, 'duplicate same-record dates do not pick one occurrence');
  check.equal(duplicated.printed['Date Closed'].printed_readings.length, 2, 'duplicate date readings retain separate sources');

  const noGeometry = modelFor(); noGeometry.pages[0].word_boxes = [];
  check.deepEqual(ca.read(noGeometry).ordinary_records, [], 'unmeasured text cannot guess the table association');
  const unread = modelFor(); unread.read_errors = [{ stage: 'pdftotext', page: 1 }];
  check.deepEqual(ca.read(unread).ordinary_records[0].facts, {}, 'an unread page supplies no ordinary facts');
  check.deepEqual(ca.read(unread).ordinary_records[0].report_status_statements, [], 'an unread page supplies no closure statements');
  const separated = modelFor({ closed: '' });
  separated.pages.push(pageFromWords(accountWords({ creditor: 'FICTIONAL NEIGHBOR', closed: '2025/02/02' }), 2));
  separated.page_count = 2;
  const separateRead = ca.read(separated).ordinary_records;
  check.equal(separateRead.length, 2, 'different-page account blocks remain separate');
  check.equal(separateRead[0].facts['liability.closedDate'], undefined, 'a blank on one page does not borrow the next page date');
  check.equal(separateRead[1].facts['liability.closedDate'], '2025-02-02', 'the next account owns its date');
  const neighbor = modelFor({ closed: '' });
  const more = accountWords({ creditor: 'FICTIONAL NEIGHBOR', closed: '2025/02/02' })
    .filter((w) => w.text !== 'Inquiries').map((w) => ({ ...w, y0: w.y0 + 700, y1: w.y1 + 700 }));
  neighbor.pages = [pageFromWords(neighbor.pages[0].word_boxes.filter((w) => w.text !== 'Inquiries').concat(more))];
  const neighborRead = ca.read(neighbor).ordinary_records;
  check.equal(neighborRead.length, 2, 'same-page Overview accounts remain separate');
  check.equal(neighborRead[0].facts['liability.closedDate'], undefined, 'a neighboring Overview cannot supply the first account date');
  check.equal(neighborRead[1].facts['liability.closedDate'], '2025-02-02', 'the neighboring date stays on its own record');

  const collection = fixtures.specimen({ records: [fixtures.recordLines().map((line) =>
    line.startsWith('Account Number') ? 'Account Number ***5678' : line)] });
  const collectionRecord = ca.read(collection).records[0];
  check.equal(collectionRecord.shared_identity.facts['account.masked_identifier'], 'MASK-5678', 'collection masked identity becomes available to the shared path');
  check.match(collectionRecord.shared_identity.facts['account.reported_identity'], /^CREDITOR-[a-f0-9]{24}$/, 'collection own Member Name has a privacy token');
  check.equal(collectionRecord.printed['Account Number'].raw, null, 'historical identifier privacy remains unchanged');
  const plain = ca.read(fixtures.specimen()).records[0];
  check.equal(plain.shared_identity.facts['account.masked_identifier'], undefined, 'an unmasked collection number is never retained');
  check.ok(plain.shared_identity.facts['account.reported_identity'], 'an unavailable mask does not erase the independently printed creditor');

  const file = process.env.CRP_CA_EQUIFAX_SPECIMEN;
  if (file && fs.existsSync(file)) {
    const model = formats.buildPdfDocumentModel(file), detection = formats.detectSupportedFormat(model, { country: 'CA' });
    check.equal(detection.presentation_id, 'PR-01', 'the authorized actual report retains exact specimen admission');
    check.equal(model.sha256, 'E439A4BB1E43AF640DFE7867473BE0EF8EC13B2B8654F41C31138D86A107AE5F', 'actual report bytes match the original PR-01 evidence');
    const actual = ca.read(model);
    check.equal(actual.ordinary_records.length, 2, 'two actual ordinary account tables are now read');
    check.equal(actual.ordinary_records.filter((r) => r.facts['account.masked_identifier']).length, 2, 'two actual ordinary masked identifiers are sourced');
    check.equal(actual.ordinary_records.filter((r) => r.facts['account.status'] === 'CLOSED').length, 2, 'two actual own closure statements are sourced');
    check.equal(actual.ordinary_records.filter((r) => r.facts['tradeline.lastPaymentDate']).length, 2, 'two actual last-payment dates are sourced');
    check.equal(actual.ordinary_records.filter((r) => r.facts['liability.closedDate']).length, 1, 'one actual closure date is sourced and one remains blank');
    check.equal(actual.records.filter((r) => r.shared_identity.facts['account.masked_identifier']).length, 2, 'two actual collection masked identifiers are sourced');
    check.equal(actual.records.every((r) => r.printed['Account Number'].raw === null), true, 'actual historical collection identifiers remain redacted');
    check.equal(actual.ordinary_records.every((r) => !r.facts['tradeline.firstDelinquencyDate']), true, 'actual ordinary tables carry no invented first delinquency');
    check.equal(actual.records.filter((r) => r.printed['First Delinquency'].state === 'VALUE').length, 2, 'existing two collection delinquency readings remain available');
  } else check.skip('actual PR-01 local measurement', 'AUTHORIZED_LOCAL_SOURCE_NOT_PRESENT');
  return { inputs: 'fictional geometry and optional authorized local PR-01; no private report bytes or identities copied',
    fields: 'own masked identifiers, closure notes, balance/past due, responsibility and actual date captions',
    boundary: 'exact PR-01 admission unchanged; blank, malformed, duplicate and untrusted values remain unavailable' };
}

module.exports = { id: 'dq-ca-printed-account-fields', title: 'PR-01 ordinary account fields and private source association',
  makeFictionalPr01Model: modelFor, run };
