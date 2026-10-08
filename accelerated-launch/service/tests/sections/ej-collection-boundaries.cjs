'use strict';

// Fictional native PDFs exercise reusable collection-entry captions, not new bureau-layout admission.
const fs = require('node:fs');
const path = require('node:path');
const formats = require('../../formats.cjs');
const general = require('../../general-intake.cjs');
const { sourceForField } = require('../../report-fact-sources.cjs');
const { buildWordPdf } = require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');
let sequence = 0;
const header = ['Equifax Consumer Credit Report', 'Report Date: June 12, 2026'];
const decisive = ['account.reported_identity', 'account.masked_identifier', 'account.member_reference',
  'tradeline.firstDelinquencyDate', 'tradeline.lastPaymentDate', 'account.balance'];

function collection(options = {}) {
  return ['Collection Account: ' + (options.name || 'Fictional Collection A'),
    ...(options.mask === null ? [] : ['Account Number: ' + (options.mask || '****1234')]),
    ...(options.member === null ? [] : ['Member Number: ' + (options.member || 'FICT78901')]),
    ...(options.delinquency === null ? [] : ['First Delinquency Date: ' + (options.delinquency || 'February 1, 2021')]),
    ...(options.payment === null ? [] : ['Last Payment Date: ' + (options.payment || 'February 1, 2021')]),
    'Balance: $' + (options.balance ?? 606)];
}
function read(t, pages, amend) {
  const bytes = buildWordPdf(pages.map((lines) => ({ words: lines.map((text, index) => ({ text, x: 40, y: 30 + index * 17 })) })),
    { producer: 'Fictional collection boundary source', creator: 'Fictional collection boundary source' });
  const file = path.join(t.dataDir, 'ej-collection-' + (++sequence) + '.pdf');
  fs.writeFileSync(file, bytes);
  const model = formats.buildPdfDocumentModel(file);
  if (amend) amend(model);
  return general.extract(model);
}
const first = (t, lines, amend) => read(t, [header.concat(lines)], amend).records[0];

async function run(t, check) {
  const ordinary = ['Account: Fictional Ordinary Bank', 'Account Number: ****5678',
    'Opened: January 2, 2020', 'Balance: $100'];
  const extracted = read(t, [header.concat(collection(), collection({ name: 'Fictional Collection B', balance: 817 }), ordinary)]);
  check.equal(extracted.records.length, 3, 'two multiline collections and the adjacent ordinary account remain three records');
  const [a, b, normal] = extracted.records;
  check.deepEqual([a.kind, b.kind, normal.kind], ['GENERAL_COLLECTION', 'GENERAL_COLLECTION', 'CONSUMER_CREDIT_LIABILITY'],
    'collection entry headings preserve collection semantics while the ordinary account ends that context');
  check.deepEqual([a.facts['account.balance'], b.facts['account.balance'], normal.facts['account.balance']], [606, 817, 100],
    'unequal balances remain on their own entries instead of overwriting or deleting each other');
  check.deepEqual([a.facts['account.masked_identifier'], b.facts['account.masked_identifier'], normal.facts['account.masked_identifier']],
    ['MASK-1234', 'MASK-1234', 'MASK-5678'], 'each masked reference stays within its own block');
  check.equal(a.facts['account.member_reference'], b.facts['account.member_reference'], 'the same printed member reference produces the same private token');
  check.match(a.facts['account.member_reference'], /^MEMBER-[a-f0-9]{24}$/, 'member references are privacy tokens');
  check.equal(JSON.stringify(extracted).includes('FICT78901'), false, 'the raw member reference is absent from returned report data');
  check.ok(extracted.page_signatures.every((signature) => /^PAGE-SHA256-[a-f0-9]{64}$/.test(signature)),
    'page signatures retain private page equality without returning full report text');
  check.equal(normal.facts['account.member_reference'], undefined, 'ordinary accounts cannot inherit a collection member reference');
  for (const [record, start] of [[a, 3], [b, 9]]) {
    check.deepEqual([record.facts['tradeline.firstDelinquencyDate'], record.facts['tradeline.lastPaymentDate']],
      ['2021-02-01', '2021-02-01'], 'each collection retains both explicitly printed fixed dates');
    for (const [offset, field] of decisive.entries()) {
      const source = sourceForField(record, field);
      check.ok(source?.location.bbox && source.location.trusted && source.location.page === 1
        && source.location.line === start + offset, 'each decisive field retains its own trusted physical source');
      check.equal(record.fact_sources[field]?.caption_count, 1, 'each decisive field has one own caption');
    }
    check.match(sourceForField(record, 'account.reported_identity')?.source_field, /Collection account name/,
      'collection identity keeps its collector-entry role');
    check.equal(record.fact_sources['account.member_reference'].privacy_redacted, true, 'member source values remain private');
  }
  const different = read(t, [header.concat(collection(), collection({ mask: '****9876', member: 'FICT65432',
    delinquency: 'March 3, 2022', payment: 'April 4, 2022', balance: 250 }))]);
  check.notEqual(different.records[0].facts['account.member_reference'], different.records[1].facts['account.member_reference'],
    'different member references are not collapsed by similar collector names');
  check.deepEqual([different.records[1].facts['account.masked_identifier'], different.records[1].facts['tradeline.firstDelinquencyDate'],
    different.records[1].facts['tradeline.lastPaymentDate']], ['MASK-9876', '2022-03-03', '2022-04-04'], 'different debt fields remain distinct');

  for (const [caption, field] of [['Account Number: ****1234', 'account.masked_identifier'],
    ['Member Number: FICT78901', 'account.member_reference'], ['First Delinquency Date: February 1, 2021', 'tradeline.firstDelinquencyDate'],
    ['Last Payment Date: February 1, 2021', 'tradeline.lastPaymentDate'], ['Balance: $606', 'account.balance']]) {
    const repeated = first(t, collection().concat(caption));
    check.equal(repeated.facts[field], undefined, 'a repeated own collection caption is withheld rather than choosing a value');
    check.equal(sourceForField(repeated, field), null, 'a repeated caption cannot provide decisive source evidence');
    check.equal(repeated.fact_sources[field]?.caption_count, 2, 'the repeated physical captions remain recorded internally');
  }
  const missing = first(t, collection({ mask: null, member: null, payment: null }));
  check.ok(['account.masked_identifier', 'account.member_reference', 'tradeline.lastPaymentDate']
    .every((field) => missing.facts[field] === undefined && sourceForField(missing, field) === null),
  'absent identity/date fields are not supplied by another field');
  check.equal(missing.facts['account.balance'], 606, 'independent readable balance survives missing identity/date fields');
  const ambiguous = first(t, collection({ delinquency: '03/04/2021' }));
  check.equal(ambiguous.facts['tradeline.firstDelinquencyDate'], undefined, 'ambiguous numeric delinquency remains unresolved');
  check.equal(sourceForField(ambiguous, 'tradeline.firstDelinquencyDate'), null, 'country does not resolve an ambiguous own date');
  for (const [word, field] of [['FICT78901', 'account.member_reference'], ['****1234', 'account.masked_identifier'],
    ['$606', 'account.balance'], ['February', 'tradeline.firstDelinquencyDate']]) {
    const untrusted = first(t, collection(), (model) => {
      for (const token of model.pages[0].word_boxes) if (token.text === word) token.trusted = false;
    });
    check.equal(untrusted.facts[field], undefined, 'untrusted decisive characters cannot provide a collection fact');
    check.equal(sourceForField(untrusted, field), null, 'untrusted fields have no usable decisive source');
  }
  const role = first(t, collection().concat('Original Creditor: Fictional Original Bank'));
  check.equal(role.facts['account.reported_identity'], 'FICTIONAL COLLECTION A', 'the original-creditor caption does not replace collector identity');
  check.equal(sourceForField(role, 'account.reported_identity')?.raw_value, 'Fictional Collection A', 'collector identity remains bound to its own entry heading');
  const repeatedName = first(t, ['Collection Account: Fictional Collection A', 'Collector: Fictional Collection A', ...collection().slice(1)]);
  check.equal(sourceForField(repeatedName, 'account.reported_identity'), null, 'two own collector-name captions remain ambiguous for the weaker identity match');
  check.equal(repeatedName.facts['account.balance'], 606, 'ambiguous identity does not suppress independent balance evidence');
  const inlineDelinquency = first(t, ['Collection Account: Fictional Collection A Date of First Delinquency: February 1, 2021',
    'Account Number: ****1234', 'Last Payment Date: February 1, 2021', 'Balance: $606']);
  check.equal(inlineDelinquency.facts['tradeline.firstDelinquencyDate'], '2021-02-01',
    'an explicitly collection-bound first-delinquency caption also reaches the shared fixed-date field');
  check.equal(sourceForField(inlineDelinquency, 'tradeline.firstDelinquencyDate')?.location.line, 3,
    'the shared first-delinquency alias keeps its own inline source');
  const overdue = read(t, [header.concat(['Creditor: Fictional Bank', 'Account Number: ****1234', 'Past Due: $606'])]);
  check.equal(overdue.records.some((record) => record.kind === 'GENERAL_COLLECTION'), false, 'an overdue balance alone is not collection context');
  const following = read(t, [header.concat(ordinary, ['Collection Agency: Fictional Collection A',
    'Account Number: ****1234', 'Balance: $606'])]);
  check.deepEqual(following.records.map((record) => [record.kind, record.facts['account.balance']]),
    [['CONSUMER_CREDIT_LIABILITY', 100], ['GENERAL_COLLECTION', 606]],
  'an explicit collection-agency caption also starts a fresh collection after an ordinary account');
  const agencies = read(t, [header.concat(['Collection Agency: Fictional Collection A', ...collection().slice(1),
    'Collection Agency: Fictional Collection B', ...collection({ name: 'Fictional Collection B', mask: '****9876',
      member: 'FICT65432', delinquency: 'March 3, 2022', payment: 'April 4, 2022', balance: 817 }).slice(1)])]);
  check.equal(agencies.records.length, 2, 'successive collection-agency headings create separate entries without a section heading');
  check.deepEqual(agencies.records.map((record) => [record.kind, record.facts['account.masked_identifier'],
    record.facts['tradeline.firstDelinquencyDate'], record.facts['tradeline.lastPaymentDate'], record.facts['account.balance']]),
  [['GENERAL_COLLECTION', 'MASK-1234', '2021-02-01', '2021-02-01', 606],
    ['GENERAL_COLLECTION', 'MASK-9876', '2022-03-03', '2022-04-04', 817]],
  'each agency retains its own distinct reference, dates and unequal balance');
  check.ok(agencies.records.every((record) => decisive.every((field) => sourceForField(record, field)?.location.trusted)),
    'each agency retains usable own source evidence instead of contradictory merged captions');
  const immediateAlias = read(t, [header.concat(['Collection Agency: Fictional Collection A',
    'Collector: Fictional Alternate Name', ...collection().slice(1)])]);
  check.equal(immediateAlias.records.length, 1, 'an immediate alternate collector caption before account facts stays within one entry');
  check.equal(sourceForField(immediateAlias.records[0], 'account.reported_identity'), null,
    'the immediate alternate collector caption leaves the same-entry name association ambiguous');
  check.equal(immediateAlias.records[0].facts['account.balance'], 606, 'the ambiguous immediate alias preserves the independent own balance');
  const sectionAlias = read(t, [header.concat(['Collections', 'Collection Agency: Fictional Collection A',
    'Collector: Fictional Alternate Name', ...collection().slice(1)])]);
  check.equal(sectionAlias.records.length, 1, 'a section heading does not split immediate alternate names into separate debt entries');
  check.equal(sourceForField(sectionAlias.records[0], 'account.reported_identity'), null,
    'an immediate alternate name under a collection section is also ambiguous');
  const compact = read(t, [header.concat([
    'Collection Agency ABC Balance $500 Past Due $500 Date of First Delinquency 01 June 2010',
    'Collection Agency DEF Balance $300 Past Due $300 Date of First Delinquency 01 June 2011'
  ])]);
  check.equal(compact.records.length, 2, 'successive compact agency rows remain separate collection entries');
  check.deepEqual(compact.records.map((record) => [record.facts['account.reported_identity'], record.facts['account.balance'],
    record.facts['account.pastDueAmount'], record.facts['collection.delinquencyDate']]),
  [['ABC', 500, 500, '2010-06-01'], ['DEF', 300, 300, '2011-06-01']],
  'compact entry identity, balance, past due and delinquency remain on their own row');
  check.deepEqual(compact.records.map((record) => sourceForField(record, 'account.balance')?.location.line), [3, 4],
    'compact balances retain distinct own source lines');
  const compactAlias = read(t, [header.concat(['Collection Agency ABC', 'Collection Agency Alternate Name', ...collection().slice(1)])]);
  check.equal(compactAlias.records.length, 1, 'immediate non-colon agency aliases without account facts stay in one entry');
  check.equal(sourceForField(compactAlias.records[0], 'account.reported_identity'), null,
    'immediate non-colon alternate agency names remain ambiguous');
  check.equal(compactAlias.records[0].facts['account.balance'], 606,
    'the ambiguous non-colon alias retains its own subsequent balance');
  const numberedHeader = ['Experian  Consumer Credit Report', 'Report Date: 12 June 2026'];
  const numbered = read(t, [numberedHeader.concat([
    'Account 1  Collection  Date of First Delinquency: 01/01/2018',
    'Account 2  Collection  Date of First Delinquency: 01/01/2023  Transferred 01/01/2025'
  ])]);
  check.equal(numbered.records.length, 2, 'explicit numbered collection headings remain separate entries');
  check.deepEqual(numbered.records.map((record) => record.facts['collection.delinquencyDate']),
    ['2018-01-01', '2023-01-01'], 'each numbered entry keeps its own original delinquency despite a later transfer');
  check.deepEqual(numbered.records.map((record) => formats.factsForRecord(record)['collection.delinquencyDate']),
    ['2018-01-01', '2023-01-01'], 'the historical reporting-period interface also retains both own anchors');
  check.deepEqual(numbered.records.map((record) => sourceForField(record, 'tradeline.firstDelinquencyDate')?.location.line),
    [3, 4], 'numbered entry fixed dates retain their own source lines');
  check.ok(numbered.records.every((record) => sourceForField(record, 'tradeline.firstDelinquencyDate')?.location.bbox
    && sourceForField(record, 'tradeline.firstDelinquencyDate')?.location.trusted),
  'numbered entry anchors retain trusted own native geometry');
  const transferContinuation = read(t, [numberedHeader.concat([
    'Account 1  Collection  Date of First Delinquency: 01/01/2018',
    'Collection Date Placed 01/01/2025', 'Transferred 01/01/2025'
  ])]);
  check.equal(transferContinuation.records.length, 1, 'same-entry collection placement and transfer dates remain continuations');
  check.equal(transferContinuation.records[0].facts['collection.delinquencyDate'], '2018-01-01',
    'same-entry later placement and transfer do not reset original delinquency');
  check.equal(sourceForField(transferContinuation.records[0], 'tradeline.firstDelinquencyDate')?.location.line, 3,
    'a transfer continuation does not replace the original anchor source');

  const section = read(t, [header.concat(['Collections', 'Collector: Fictional Collection A', 'Account Number: ****1234',
    'First Delinquency Date: February 1, 2021', 'Last Payment Date: February 1, 2021', 'Balance: $606',
    'Collector: Fictional Collection B', 'Account Number: ****9876', 'Balance: $817', 'Inquiries', 'Date: January 1, 2022'])]);
  check.deepEqual(section.records.filter((record) => record.kind === 'GENERAL_COLLECTION').map((record) => record.facts['account.balance']),
    [606, 817], 'explicit collection section and collector captions keep separate entries');
  check.equal(section.records[1].facts['tradeline.firstDelinquencyDate'], undefined, 'a second collector cannot inherit the first collector delinquency');
  const wrapped = first(t, ['Collection Account:', 'Fictional Collection A', 'Account Number:', '****1234',
    'Member Number:', 'FICT78901', 'First Delinquency Date:', 'February 1, 2021', 'Last Payment Date:', 'February 1, 2021', 'Balance:', '$606']);
  check.equal(wrapped.kind, 'GENERAL_COLLECTION', 'adjacent own collection captions and values retain collection semantics');
  check.equal(wrapped.facts['account.balance'], 606, 'wrapped balance remains its own collection value');
  check.ok(sourceForField(wrapped, 'account.member_reference')?.location.caption_location?.bbox,
    'wrapped member reference retains caption and value geometry');

  const isolated = read(t, [header.concat(collection({ payment: null, balance: 606 })),
    ['Equifax Consumer Credit Report', 'Last Payment Date: May 5, 2022', 'Balance: $999']]);
  check.equal(isolated.records[0].facts['tradeline.lastPaymentDate'], undefined, 'an anonymous following page cannot supply a previous collection payment date');
  check.equal(isolated.records[0].facts['account.balance'], 606, 'a following page cannot overwrite the previous collection balance');
  const continued = read(t, [header.concat(collection({ payment: null })),
    ['Equifax Consumer Credit Report', 'Collections continued', 'Last Payment Date: May 5, 2022']]);
  check.equal(continued.records[0].facts['tradeline.lastPaymentDate'], '2022-05-05', 'explicit collection continuation permits its own following-page field');
  check.equal(sourceForField(continued.records[0], 'tradeline.lastPaymentDate')?.location.page, 2,
    'the continued field keeps its actual page location');
  const untrustedContinuation = read(t, [header.concat(collection({ payment: null })),
    ['Equifax Consumer Credit Report', 'Collections continued', 'Last Payment Date: May 5, 2022']], (model) => {
    for (const word of model.pages[1].word_boxes) if (word.text === 'continued') word.trusted = false;
  });
  check.equal(untrustedContinuation.records[0].facts['tradeline.lastPaymentDate'], undefined,
    'untrusted continuation wording cannot associate a following page with the prior collection');
  const untrustedSection = read(t, [header.concat(['Collections', 'Member Name: Fictional Member', 'Account Number: ****1234', 'Balance: $606'])], (model) => {
    for (const word of model.pages[0].word_boxes) if (word.text === 'Collections') word.trusted = false;
  });
  check.equal(untrustedSection.records.some((record) => record.kind === 'GENERAL_COLLECTION'), false,
    'an untrusted section cannot make a generic Member Name caption a collection');
  const newPage = read(t, [header.concat(collection()), ['Equifax Consumer Credit Report',
    ...collection({ name: 'Fictional Collection B', mask: '****9876', member: 'FICT65432', balance: 817 })]]);
  check.deepEqual(newPage.records.map((record) => record.facts['account.balance']), [606, 817], 'a fresh collection heading on another page starts a separate entry');
  check.notEqual(newPage.page_signatures[0], newPage.page_signatures[1], 'different page text retains different content signatures');
  const identical = read(t, [header.concat(collection()), header.concat(collection())]);
  check.equal(identical.page_signatures[0], identical.page_signatures[1], 'identical page text and geometry retain equal signatures');
  check.equal(identical.records.length, 2, 'matching page signatures retain both collection entries');
  check.equal(identical.skipped_pages[0]?.reason, 'SUSPECTED_DUPLICATE_RETAINED', 'matching signatures remain a suspected duplicate, never a discard');
  return { family: 'explicit collection entry and collection-section captions; fictional native PDFs',
    fields: decisive, boundaries: ['entry', 'ordinary account', 'section', 'page', 'explicit continuation'],
    member_reference: 'privacy token with unique own caption; no raw reference retained' };
}

module.exports = { run, id: 'ej-collection-boundaries', title: 'Source-bound multiline collection entries and isolation' };
