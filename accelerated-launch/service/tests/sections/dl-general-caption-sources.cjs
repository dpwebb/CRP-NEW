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
const ZERO_LIMIT = 'COMMON-ERROR-REVOLVING-BALANCE-ZERO-LIMIT';
const GB_REGIONS = ['GB-ENG', 'GB-NIR', 'GB-SCT', 'GB-WLS'];
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

/* Official TransUnion V9 consumer field definitions guide the caption contract. These native PDFs are
   explicitly fictional behavioral inputs, not bureau specimens or evidence for a complete PDF layout. */
function gbFields({ name = 'Cedar & Pine Bank', mask = 'XXXX1234', state = 'Normal', balance = '£100',
  limit = '£0', opened = '2010-01-02', closed = 'N/A' } = {}) {
  return ['Organisation Name:', name, 'Account Number / suffix:', mask, 'Account State:', state,
    'Account Type:', 'Credit Card', 'Current Balance:', balance, 'Credit Limit / Overdraft Limit:', limit,
    'Regular Payment Value:', '£25', 'Account Start Date:', opened, 'Account End Date:', closed];
}
function gbReport(fields = gbFields()) {
  return ['TransUnion Consumer Credit Report', 'Report Date: 2026-10-08', ...fields];
}
function zeroLimitIssues(extraction) {
  return issues.issuesFor({ extraction, evaluation: engine.evaluateCase({ country: 'GB', region: 'GB-ENG', extraction }) })
    .filter((issue) => issue.check_id === ZERO_LIMIT);
}
async function gbFieldContract(t, check) {
  let sourceIsolation = true;
  const isolated = (condition, label) => { sourceIsolation = sourceIsolation && Boolean(condition); check.ok(condition, label); };
  const actual = native(t, gbReport()), record = actual.extraction.records[0];
  check.equal(actual.extraction.presentation_id, 'GENERAL-BUREAU-REPORT', 'fictional TU captions use the existing general reader');
  check.equal(actual.extraction.records.length, 1, 'organisation heading owns all account captions');
  check.deepEqual(['account.reported_identity', 'account.masked_identifier', 'account.status', 'account.balance',
    'account.creditLimit', 'account.paymentAmount', 'liability.openedDate'].map((field) => record.facts[field]),
  ['CEDAR PINE BANK', 'MASK-1234', 'NORMAL', 100, 0, 25, '2010-01-02'], 'exact captions map their own literal facts');
  for (const [field, label, caption, value] of [['account.reported_identity', 'Organisation Name', 3, 4],
    ['account.masked_identifier', 'Account Number / suffix', 5, 6], ['account.status', 'Account State', 7, 8],
    ['account.balance', 'Current Balance', 11, 12], ['account.creditLimit', 'Credit Limit / Overdraft Limit', 13, 14],
    ['account.paymentAmount', 'Regular Payment Value', 15, 16], ['liability.openedDate', 'Account Start Date', 17, 18]]) {
    const source = sourceForField(record, field);
    check.equal(source?.source_field, label, 'the field keeps its own publisher caption');
    isolated(source?.location.line === value && source?.location.caption_location?.line === caption
      && source?.location.bbox && source?.location.caption_location?.bbox, 'both physical caption and value locations remain bound');
  }
  check.equal(record.facts['tradeline.lastPaymentDate'], undefined, 'scheduled payment value establishes no last-payment date');
  check.equal(zeroLimitIssues(actual.extraction).length, 1, 'documented type/balance/limit facts reach the existing checklist issue');
  const inline = gbFields().reduce((rows, text, index, fields) => index % 2 ? rows : rows.concat(text + ' ' + fields[index + 1]), []);
  const inlineRecord = native(t, gbReport(inline)).extraction.records[0];
  isolated(inlineRecord.facts['account.reported_identity'] === 'CEDAR PINE BANK'
    && sourceForField(inlineRecord, 'account.reported_identity')?.raw_value === 'Cedar & Pine Bank',
  'account start-date text never supplies identity START or contradicts its organisation');
  const noColon = native(t, gbReport(['Organisation Name: Cedar & Pine Bank', 'Account Number / suffix: XXXX1234',
    'Account Start Date 2010-01-02', 'Account End Date 2020-07-08'])).extraction;
  isolated(noColon.records.length === 1 && noColon.records[0].facts['account.reported_identity'] === 'CEDAR PINE BANK'
    && noColon.records[0].facts['liability.openedDate'] === '2010-01-02'
    && noColon.records[0].facts['liability.closedDate'] === '2020-07-08', 'own date captions without punctuation remain account fields, not account headings');

  const two = native(t, gbReport(gbFields().concat(gbFields({ name: 'Fir Bank', mask: 'XXXX5678', balance: '£250',
    limit: '£500', opened: '2019-02-03' })))).extraction;
  isolated(two.records.length === 2 && two.records[0].facts['account.masked_identifier'] === 'MASK-1234'
    && two.records[1].facts['account.masked_identifier'] === 'MASK-5678'
    && two.records[0].facts['liability.openedDate'] === '2010-01-02'
    && two.records[1].facts['liability.openedDate'] === '2019-02-03'
    && two.records[0].facts['account.balance'] === 100 && two.records[1].facts['account.balance'] === 250,
  'two organisation headings preserve separate identities, dates and balances');
  check.equal(zeroLimitIssues(two).length, 1, 'only the first account has the zero-limit violation');
  const benign = native(t, gbReport(gbFields({ limit: '£500' }))).extraction;
  check.equal(zeroLimitIssues(benign).length, 0, 'positive compatible limit is benign');
  for (const state of ['Normal', 'Satisfied', 'Defaulted']) {
    const own = native(t, gbReport(gbFields({ state, limit: '£500', closed: '2020-07-08' }))).extraction;
    check.equal(own.records[0].facts['account.status'], state.toUpperCase(), 'publisher account state retains its literal meaning');
    check.equal(finding(own).length, 0, 'literal state is never upgraded to final-payment wording');
  }
  const conflictingState = native(t, gbReport(gbFields().concat('Account State:', 'Satisfied'))).extraction.records[0];
  isolated(sourceForField(conflictingState, 'account.status') === null && conflictingState.facts['account.status'] === undefined,
    'contradictory own states never choose one value');
  const ambiguous = native(t, gbReport(gbFields({ opened: '03/04/2020' }))).extraction.records[0];
  isolated(ambiguous.facts['liability.openedDate'] === undefined && sourceForField(ambiguous, 'liability.openedDate') === null
    && ambiguous.facts['account.reported_identity'] === 'CEDAR PINE BANK', 'ambiguous opening date neither resolves by country nor destroys the own identity');
  const irrelevant = ['Account Holder Start Date:', '2015-03-04', 'Account Holder End Date:', '2018-05-06',
    'Payment Start Date:', '2010-02-03', 'Date Account Last Updated:', '2026-09-30'];
  const ownDatesMissing = native(t, gbReport(gbFields({ opened: 'N/A' }).concat(irrelevant))).extraction.records[0];
  isolated(['liability.openedDate', 'liability.closedDate', 'tradeline.lastPaymentDate', 'tradeline.firstDelinquencyDate']
    .every((field) => ownDatesMissing.facts[field] === undefined), 'holder, payment-start and update dates do not replace absent account anchors');
  for (const [wordText, field] of [['Organisation', 'account.reported_identity'], ['Normal', 'account.status'],
    ['State:', 'account.status'], ['Value:', 'account.paymentAmount'], ['£25', 'account.paymentAmount'],
    ['£0', 'account.creditLimit']]) {
    const unread = native(t, gbReport(), (model) => {
      for (const word of model.pages[0].word_boxes) if (word.text === wordText) word.trusted = false;
    }).extraction;
    isolated(unread.records[0].facts[field] === undefined && sourceForField(unread.records[0], field) === null,
      'untrusted own caption/value never resolves the affected field');
    check.equal(unread.records[0].facts['account.balance'], 100, 'independent own readable balance survives');
    if (field === 'account.creditLimit') check.equal(zeroLimitIssues(unread).length, 0, 'untrusted decisive limit supplies no violation');
  }
  const missingLimit = gbFields(); missingLimit.splice(10, 2);
  check.equal(zeroLimitIssues(native(t, gbReport(missingLimit)).extraction).length, 0, 'missing limit cannot borrow regular payment value');
  for (const maskState of ['trusted', 'untrusted', 'absent']) {
    // Controlled issue-assembly regression for the existing no-assessment branch, not a layout specimen.
    const legacy = synthetic(['Equifax Credit Report', 'Report Date: 2026-06-12', 'Creditor: Cedar Bank',
      ...(maskState === 'absent' ? [] : ['Account Number: XXXX1234']),
      'Account Type: Credit Card', 'Balance: 100', 'Credit Limit: 0']);
    // Preserve this controlled legacy assembly branch explicitly. Ordinary own
    // numeric captions now resolve the native record instead of leaving it here.
    legacy.records[0].status = 'EXTRACTION_UNRESOLVED';
    legacy.records[0].reason = 'CONTROLLED_LEGACY_UNRESOLVED_RECORD';
    if (maskState === 'untrusted') legacy.records[0].fact_sources = { ...legacy.records[0].fact_sources,
      'account.masked_identifier': { raw_value: 'XXXX1234', normalized_value: 'MASK-1234',
        location: { page: 1, line: 4, trusted: false } } };
    const issue = zeroLimitIssues(legacy)[0];
    check.equal(issue?.eligible, true, 'optional identifier trust never becomes a zero-limit eligibility prerequisite');
    check.equal(Boolean(issue?.rule_assessment), false, 'the existing no-assessment issue branch is exercised');
    check.equal(issue?.source_facts.filter(fact => fact.field === 'account.masked_identifier').length,
      maskState === 'trusted' ? 1 : 0, 'only a trusted own optional mask reaches issue evidence');
    check.equal(issues.publicIssue(issue).source_facts.filter(fact => fact.source_field === 'Masked account number').length,
      maskState === 'trusted' ? 1 : 0, 'public optional identifier evidence preserves the same trust boundary');
  }
  const owner = await t.unpaidAccount('dl-gb-field-contract@example.test'); await t.pay(owner, 'monthly');
  let approvedDownloads = 0;
  for (const region of GB_REGIONS) {
    const opened = await t.request('POST', '/api/cases', { token: owner.token, body: { country: 'GB', region } });
    check.equal(opened.status, 201, region + ' opens the ordinary consumer case');
    const id = opened.json.case.case_id, endpoint = '/api/cases/' + id;
    const upload = await t.request('POST', endpoint + '/files', { token: owner.token, body: {
      originalFilename: 'fictional-tu-field-contract.pdf', declaredBytes: actual.bytes.length,
      mimeType: 'application/pdf', contentBase64: actual.bytes.toString('base64') } });
    check.equal(upload.status, 201, region + ' uploads the actual fictional native PDF');
    const assessed = await t.request('POST', endpoint + '/evaluate', { token: owner.token });
    check.equal(assessed.status, 201, region + ' evaluates supported general-reader facts');
    const view = (await t.request('GET', endpoint + '/packet', { token: owner.token })).json.view;
    const selected = view.eligible_issues.find((issue) => issue.check_kind === zeroLimitIssues(actual.extraction)[0].label);
    check.ok(selected, region + ' delivers the existing zero-limit checklist issue');
    if (!selected) continue;
    check.equal(selected.consumer_label, 'VIOLATION', region + ' uses the sole consumer verdict');
    const ownRecord = t.service.store.state().results.find((result) => result.case_id === id).extraction.records[0];
    const physicalFacts = ['account.type', 'account.balance', 'account.creditLimit'].map((field) => sourceForField(ownRecord, field));
    const publicFacts = selected.source_facts.filter((fact) => ['ACCOUNT TYPE', 'CURRENT BALANCE', 'CREDIT LIMIT / OVERDRAFT LIMIT'].includes(fact.source_field.toUpperCase()));
    isolated(publicFacts.length === 3 && publicFacts.every((fact) => fact.location?.page === 1 && fact.location?.line)
      && physicalFacts.every((fact) => fact?.location?.bbox && fact?.location?.caption_location?.bbox),
    region + ' issue retains its own public references and internal physical caption/value sources');
    const choice = await t.request('POST', endpoint + '/packet/select', { token: owner.token, body: { issue_ids: [selected.issue_id] } });
    check.equal(choice.status, 200, region + ' consumer selects the violation');
    const correspondence = await t.request('POST', endpoint + '/packet/correspondence', { token: owner.token, body: {
      correspondence: { consumer_name: 'Fictional Consumer', contact: 'fictional@example.test' } } });
    check.equal(correspondence.status, 200, region + ' prepares reviewable correspondence');
    const reviewed = await t.request('GET', endpoint + '/packet', { token: owner.token });
    check.equal(reviewed.status, 200, region + ' consumer reviews the selected packet');
    await t.preparePostalPacket(owner, id);
    const approval = await t.request('POST', endpoint + '/packet/approve', { token: owner.token });
    check.equal(approval.status, 200, region + ' consumer approves the selected evidence');
    const download = await t.request('GET', endpoint + '/packet-download', { token: owner.token });
    check.equal(download.status, 200, region + ' actual approved packet downloads');
    const packetWords = download.text.replace(/\s+/g, ' ');
    const ownCreditor = packetWords.includes('Cedar & Pine Bank'), ownMask = packetWords.includes('XXXX1234');
    const ownValues = packetWords.includes('£100') && packetWords.includes('£0');
    const ownLocations = packetWords.includes('report page 1') && packetWords.includes('Current Balance:')
      && packetWords.includes('Credit Limit / Overdraft Limit:');
    const ownRequest = packetWords.includes('Please check the credit limit and balance')
      && !/probable violation|potential violation/i.test(packetWords);
    check.ok(ownCreditor, region + ' downloaded packet names the own printed creditor');
    check.ok(ownMask, region + ' downloaded packet retains the own masked account suffix');
    check.ok(ownValues && ownLocations, region + ' packet retains decisive values on the original captioned page and a plain page reference');
    check.ok(ownRequest, region + ' human letter makes the selected correction request without retired verdict wording');
    const ownedEvidence = ownCreditor && ownMask && ownValues && ownLocations && ownRequest;
    if ([opened.status, upload.status, assessed.status, choice.status, correspondence.status, reviewed.status, approval.status, download.status]
      .every((status, index) => status === (index < 3 ? 201 : 200)) && ownedEvidence && selected.consumer_label === 'VIOLATION'
      && physicalFacts.length === 3 && physicalFacts.every((fact) => fact.location?.bbox && fact.location?.caption_location?.bbox)) approvedDownloads++;
  }
  check.equal(approvedDownloads, GB_REGIONS.length, 'all four current-field consumer paths complete their actual approved downloads');
  return { id: 'GB-TU-GENERAL-FIELDS-V9-2025', source_version: 'V9.0 | April 2025', regions: GB_REGIONS,
    check_id: ZERO_LIMIT, source_isolation: sourceIsolation, approved_downloads: approvedDownloads };
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
    await t.preparePostalPacket(owner, current);
    check.equal((await t.request('POST', '/api/cases/' + current + '/packet/approve', { token: owner.token })).status, 200, 'consumer approves paired evidence');
    const download = await t.request('GET', '/api/cases/' + current + '/packet-download', { token: owner.token });
    check.equal(download.status, 200, 'approved changed-anchor packet downloads');
    check.ok(download.text.includes('2018-01-01') && download.text.includes('2020-01-01')
      && download.text.includes('report page 1') && download.text.includes('First Delinquency Date:'),
    'packet retains both original anchor readings and the plain reference to their unchanged source pages');
    t.service.store.update((state) => { sourceForField(state.results.find((r) => r.case_id === current).extraction.records[0], 'tradeline.firstDelinquencyDate').location.caption_location.line += 1; });
    check.equal((await t.request('GET', '/api/cases/' + current + '/packet-download', { token: owner.token })).status, 409, 'changed caption provenance invalidates approval');
  }
  const gbFieldEvidence = await gbFieldContract(t, check);
  return { mapping: 'own account heading and adjacent caption/value', reaging_packet: 'native owned reports',
    gb_field_contract: gbFieldEvidence, deployment: 'NOT_PERFORMED' };
}
module.exports = { run, id: 'dl-general-caption-sources', title: 'General own caption/value sources and re-aging packet integration' };
