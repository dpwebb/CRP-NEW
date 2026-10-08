'use strict';

/* The existing PUB-001 contract supplies the captions and column boundaries.
 * Fictional files vary their printed values to exercise those boundaries; they
 * supply behavioral evidence, never new presentation evidence. */
const fs = require('node:fs');
const path = require('node:path');
const formats = require('../../formats.cjs');
const family = require('../../format-families/us-experian-consumer.cjs');
const common = require('../../common-errors.cjs');
const issues = require('../../issues.cjs');
const evaluation = require('../../evaluation.cjs');
const { buildWordPdf } = require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');
const { sha256File } = require('../../../../internal-validation/ca-ns-last-payment-six-year/document-model.cjs');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const REVOLVING = 'COMMON-ERROR-REVOLVING-BALANCE-ZERO-LIMIT';
const DUPLICATE = 'COMMON-ERROR-DUPLICATE-REPORTING';
const RESPONSIBILITY = 'COMMON-ERROR-RESPONSIBILITY-INCONSISTENCY';
const PAID = 'COMMON-ERROR-PAID-SETTLED-SHOWN-UNPAID';
const SHARED = {
  'account.reported_identity': ['Account name', 'Cedar Bank'],
  'account.masked_identifier': ['Account number', 'XXXX1234'],
  'account.type': ['Type', 'CREDIT CARD'],
  'account.responsibility': ['Responsibility', 'INDIVIDUAL'],
  'account.status': ['Status', 'OPEN'],
  'liability.openedDate': ['Date opened', '2020-01']
};
let sequence = 0;

function disclosure(accounts, wordsOnly = false) {
  const words = [];
  const put = (text, x, y) => { if (text != null && text !== '') words.push({ text: String(text), x, y }); };
  put('Report number 12345 June 12, 2026 Print report', 40, 30);
  put('Personal Information', 40, 60);
  put('Potentially negative items', 40, 90);
  accounts.forEach((changes, i) => {
    const a = { name: 'Cedar Bank', number: 'XXXX1234', balance: '$100.00', opened: '01/2020',
      status: 'Open.', type: 'Credit card', responsibility: 'Individual', limit: '$1000.00',
      first: '02/2020', pastDue: '$20.00', payment: '$10.00', ...changes };
    const y = 120 + i * 180;
    for (const [label, x] of [['Account name', 40], ['Account number', 200], ['Recent balance', 350],
      ['Date opened', 530], ['Status', 680]]) put(label, x, y);
    for (const [value, x] of [[a.name, 40], [a.number, 200], [a.balance, 350], [a.opened, 530], [a.status, 680]])
      put(value, x, y + 18);
    for (const [label, value, x] of [['Type', a.type, 200], ['Credit limit or original amount', a.limit, 350],
      ['First reported', a.first, 530], ['Responsibility', a.responsibility, 680]]) {
      if (value === undefined) continue;
      if (a.inlineType && label === 'Type') put(`${label}: ${value}`, x, y + 44);
      else { put(label, x, y + 44); put(value, x, y + 62); }
    }
    for (const [label, value, x] of [['Monthly payment', a.payment, 200], ['Past due amount', a.pastDue, 350]]) {
      if (value === undefined) continue;
      put(label, x, y + 86); put(value, x, y + 104);
    }
    for (const extra of a.extras || []) {
      put(extra.label, extra.x, y + 128); put(extra.value, extra.x, y + 146);
    }
  });
  const end = 130 + accounts.length * 180;
  put('Accounts in good standing', 40, end);
  put('Credit inquiries', 40, end + 25);
  put('Important messages', 40, end + 50);
  if (wordsOnly) return { words };
  return buildWordPdf([{ words }], { page_size: { width: 900, height: end + 100 }, font_size: 9,
    producer: 'CRP fictional behavioral input', creator: 'CRP fictional behavioral input' });
}

function read(t, accounts, amend, bytesOverride) {
  const bytes = bytesOverride || disclosure(accounts);
  const file = path.join(t.dataDir, `df-us-reader-${++sequence}.pdf`);
  fs.mkdirSync(t.dataDir, { recursive: true });
  fs.writeFileSync(file, bytes);
  const model = formats.buildPdfDocumentModel(file);
  if (amend) amend(model);
  const admission = family.admit(model);
  return { bytes, model, admission, extraction: formats.extractWithSharedAdapter(model, { mode: 'REPORT', country: 'US' }) };
}

function offered(extraction) {
  const assessed = evaluation.evaluateCase({ country: 'US', region: 'US-CA', extraction });
  return { assessed, findings: issues.issuesFor({ extraction, evaluation: assessed }),
    public: issues.publicIssues({ extraction, evaluation: assessed }) };
}

function lowValue(model, text, y) {
  for (const word of model.pages[0].word_evidence || model.pages[0].word_boxes) {
    if (Math.abs(word.y0 - y) < 6 && text.includes(word.text)) { word.trusted = false; word.confidence = 20; }
  }
}

async function run(t, check) {
  const ordinary = read(t, [{}]);
  check.equal(ordinary.admission.admitted, true, 'an existing consumer disclosure structure admits the fictional behavioral file');
  check.equal(ordinary.extraction.presentation_id, 'US-CONSUMER-DISCLOSURE', 'the production wrapper chooses the US reader');
  const account = ordinary.extraction.records[0];
  check.equal(ordinary.model.pages[0].has_native_text, true, 'the file is read through its real native text layer');
  check.equal(account.location.columns_found, 5, 'the native bounding boxes preserve all five existing column anchors');
  check.equal(family.documentLines(ordinary.model).find((line) => line.text.includes('Account name')).confidence,
    undefined, 'native geometry does not invent an OCR confidence score');
  for (const [field, [label, value]] of Object.entries(SHARED)) {
    check.equal(account.facts[field], value, `${field} comes from its own printed caption`);
    check.equal(account.fact_sources[field].source_field, label, `${field} retains the exact source caption`);
    check.equal(account.fact_sources[field].normalized_value, value, `${field} retains its normalized reading`);
    check.equal(account.fact_sources[field].trusted, true, `${field} has a trusted source`);
    check.ok(account.fact_sources[field].raw_value && account.fact_sources[field].location.page === 1
      && typeof account.fact_sources[field].location.y0 === 'number', `${field} retains the raw reading and caption coordinate`);
  }
  check.equal(account.facts['reportedAccount.status'], 'Open.', 'the legacy status keeps the literal reading');
  check.equal(account.facts['reportedAccount.dateOpened'], '2020-01', 'the legacy opening date remains unchanged');
  check.equal(account.fact_sources['liability.openedDate'].uncertainty.precision, 'MONTH', 'the alias retains month precision without inventing a day');
  check.equal(account.facts['liability.closedDate'], undefined, 'Date of status does not become a closure date');
  check.equal(account.facts['tradeline.firstDelinquencyDate'], undefined, 'the reader does not invent a first delinquency');
  const adverseInput = [{ extras: [{ label: 'Payment history guide', value: '30 days past due as of Jun 2019', x: 40 }] }];
  const adverse = read(t, adverseInput).extraction.records[0];
  check.equal(adverse.facts['reportedAccount.adverseRatingDate'], '2019-06', 'a readable native adverse annotation reaches its existing comparison anchor');
  check.equal(adverse.facts['reportedAccount.adverseRatingDatePrecision'], 'MONTH', 'the adverse month keeps its recorded precision');
  check.equal(adverse.printed.adverse_payment_rating_date.raw_value, '30 days past due as of Jun 2019', 'the exact annotation is retained');
  check.equal(adverse.printed.adverse_payment_rating_date.location.confidence, undefined, 'native trust does not invent a confidence score');
  check.equal(adverse.facts['tradeline.firstDelinquencyDate'], undefined, 'an adverse annotation is still not a first-delinquency anchor');
  for (const amend of [(model) => {
    const line = family.documentLines(model).find((entry) => entry.text.trim() === '30 days past due as of Jun 2019');
    lowValue(model, '30 days past due as of Jun 2019', line.y0);
  }, (model) => { model.pages[0].word_boxes = []; }]) {
    check.equal(read(t, adverseInput, amend).extraction.records[0].facts['reportedAccount.adverseRatingDate'], undefined,
      'untrusted words or absent measured geometry never supply a native adverse anchor');
  }
  const escapedName = read(t, [{ name: 'Cedar & Pine Bank' }]).extraction.records[0];
  check.equal(escapedName.facts['account.reported_identity'], 'Cedar & Pine Bank', 'native XML escaping does not alter the printed account name');
  check.equal(escapedName.fact_sources['account.reported_identity'].raw_value, 'Cedar & Pine Bank', 'the name source preserves the actual printed ampersand');
  const missingBoxes = read(t, [{}], (model) => { model.pages[0].word_boxes = []; }).extraction.records[0];
  check.equal(Object.keys(missingBoxes.facts).length, 0, 'native text without measured word geometry invents no account fields');
  check.equal(offered(ordinary.extraction).findings.some((i) => [REVOLVING, PAID, DUPLICATE, RESPONSIBILITY].includes(i.check_id)),
    false, 'the ordinary benign account produces none of the newly available breach types');

  const zero = read(t, [{ limit: '$0.00', payment: '$0.00' }]).extraction.records[0];
  check.equal(zero.fact_sources['account.creditLimit'].source_field, 'Credit limit or original amount', 'equal zero values retain distinct limit provenance');
  check.equal(zero.fact_sources['account.paymentAmount'].source_field, 'Monthly payment', 'equal zero values retain distinct payment provenance');
  check.ok(zero.fact_sources['account.creditLimit'].location.y0 !== zero.fact_sources['account.paymentAmount'].location.y0,
    'equal values do not collapse their caption coordinates');
  for (const [reason, input, amend] of [
    ['MULTIPLE_VALUES_FOR_PRINTED_CAPTION', { limit: '$0.00', extras: [{ label: 'Credit limit or original amount', value: '$1000.00', x: 350 }] }, null],
    ['READING_BELOW_THE_RECORDED_CONFIDENCE_FLOOR', { limit: '$0.00' }, (model) => lowValue(model, '$0.00', 182)]
  ]) {
    const disputedLimit = read(t, [input], amend).extraction.records[0];
    check.equal(disputedLimit.facts['account.creditLimit'], 0, 'legacy amount extraction remains unchanged');
    check.equal(disputedLimit.fact_sources['account.creditLimit'].trusted, false, 'legacy amount provenance does not promote an ambiguous or unreadable caption');
    check.equal(disputedLimit.fact_sources['account.creditLimit'].uncertainty.status, 'EXTRACTION_UNRESOLVED', 'the shared source states the unresolved amount reading');
    check.equal(disputedLimit.fact_sources['account.creditLimit'].uncertainty.reason, reason, 'the precise source reason travels with the retained legacy amount');
  }
  for (const [id, field, input, amend] of [
    [REVOLVING, 'account.creditLimit', { limit: '$0.00', extras: [{ label: 'Credit limit or original amount', value: '$1000.00', x: 350 }] }, null],
    [REVOLVING, 'account.creditLimit', { limit: '$0.00' }, (model) => lowValue(model, '$0.00', 182)],
    [PAID, 'account.balance', { status: 'Paid in full', pastDue: '$0.00', extras: [{ label: 'Recent balance', value: '$0.00', x: 350 }] }, null],
    [PAID, 'account.balance', { status: 'Paid in full', pastDue: '$0.00' }, (model) => lowValue(model, '$100.00', 138)],
    ['COMMON-ERROR-BALANCE-PAYMENT-INCONSISTENCY', 'account.pastDueAmount', { pastDue: '$200.00', extras: [{ label: 'Past due amount', value: '$20.00', x: 350 }] }, null],
    ['COMMON-ERROR-BALANCE-PAYMENT-INCONSISTENCY', 'account.pastDueAmount', { pastDue: '$200.00' }, (model) => lowValue(model, '$200.00', 224)],
    ['COMMON-ERROR-REPORTED-DATES-OUT-OF-ORDER', 'reportedAccount.dateOpened', { first: '12/2019', extras: [{ label: 'Date opened', value: '01/2019', x: 530 }] }, null],
    ['COMMON-ERROR-REPORTED-DATES-OUT-OF-ORDER', 'reportedAccount.firstReported', { first: '12/2019', extras: [{ label: 'First reported', value: '02/2020', x: 530 }] }, null]
  ]) {
    const extraction = read(t, [input], amend).extraction;
    check.ok(extraction.records[0].facts[field] != null, `${field} retains the existing legacy reading`);
    check.equal(extraction.records[0].fact_sources[field].trusted, false, `${field} retains its unusable decisive source`);
    check.equal(offered(extraction).findings.some((issue) => issue.check_id === id), false,
      `${id} is not offered from an ambiguous or unreadable decisive legacy source`);
  }

  for (const [field, key, label, x] of [
    ['account.type', 'type', 'Type', 200], ['account.responsibility', 'responsibility', 'Responsibility', 680],
    ['account.status', 'status', 'Status', 680], ['account.reported_identity', 'name', 'Account name', 40],
    ['account.masked_identifier', 'number', 'Account number', 200], ['liability.openedDate', 'opened', 'Date opened', 530]
  ]) {
    const repeated = read(t, [{ extras: [{ label, value: '01/2020', x }] }]).extraction.records[0];
    check.equal(repeated.facts[field], undefined, `${field} is withheld when its caption repeats`);
    const blank = read(t, [{ [key]: '' }]).extraction.records[0];
    check.equal(blank.facts[field], undefined, `${field} is withheld when its value is blank`);
    const untrusted = read(t, [{}], (model) => lowValue(model, key === 'opened' ? '01/2020'
      : key === 'name' ? 'Cedar Bank' : key === 'number' ? 'XXXX1234' : key === 'status' ? 'Open.'
        : key === 'type' ? 'Credit card' : 'Individual', ['type', 'responsibility'].includes(key) ? 182 : 138)).extraction.records[0];
    check.equal(untrusted.facts[field], undefined, `${field} is withheld below the OCR confidence floor`);
  }
  const unreadStatus = read(t, [{}], (model) => lowValue(model, 'Open.', 138)).extraction.records[0];
  check.equal(unreadStatus.facts['reportedAccount.status'], 'Open.', 'untrusted status does not change the legacy presentation fact');
  const inline = read(t, [{ inlineType: true }], (model) => lowValue(model, 'Credit card', 164)).extraction.records[0];
  check.equal(inline.facts['account.type'], undefined, 'inline Type does not bypass token confidence');
  check.equal(read(t, [{ type: undefined }]).extraction.records[0].facts['account.type'], undefined, 'a missing Type caption supplies no type');

  const neighbor = read(t, [{ type: '', responsibility: '', opened: '', name: 'First Bank', number: 'XXXX1111' },
    { type: 'Auto', responsibility: 'Joint', name: 'Second Bank', number: 'XXXX2222' }]).extraction.records;
  check.equal(neighbor[0].facts['account.type'], undefined, 'a blank type is not borrowed from the next account');
  check.equal(neighbor[0].facts['account.responsibility'], undefined, 'a blank responsibility is not borrowed from an adjacent column');
  check.equal(neighbor[0].facts['liability.openedDate'], undefined, 'a blank opening date is not borrowed from the next account');
  check.equal(neighbor[1].facts['account.type'], 'AUTO', 'the neighboring account keeps its own type');
  const twoPagePdf = buildWordPdf([disclosure([{ type: undefined, name: 'First Bank', number: 'XXXX1111' }], true),
    disclosure([{ type: 'Auto', name: 'Second Bank', number: 'XXXX2222' }], true)],
  { page_size: { width: 900, height: 410 }, font_size: 9 });
  const pages = read(t, [], null, twoPagePdf).extraction.records;
  check.equal(pages.length, 2, 'the two native pages retain their own account boundaries');
  check.equal(pages[0].facts['account.type'], undefined, 'a missing page-one Type is not borrowed from equal coordinates on page two');
  check.equal(pages[1].facts['account.type'], 'AUTO', 'page two keeps its own printed Type');
  check.deepEqual(pages.map((r) => r.facts['account.reported_identity']), ['First Bank', 'Second Bank'], 'equal-y accounts on different pages keep their own names');
  check.deepEqual(pages.map((r) => r.fact_sources['account.masked_identifier'].location.page), [1, 2], 'the fact sources keep the correct source page');
  check.equal(read(t, [{ status: 'Current.' }]).extraction.records[0].facts['account.status'], 'CURRENT', 'repayment performance is not promoted to OPEN');
  for (const type of ['Auto', 'Rental']) {
    const facts = offered(read(t, [{ type, limit: '$0.00' }]).extraction);
    check.equal(facts.findings.some((i) => i.check_id === REVOLVING), false, `${type} original amount is not a revolving credit limit`);
  }

  const positives = [
    [REVOLVING, [{ limit: '$0.00' }]],
    [PAID, [{ status: 'Paid in full', pastDue: '$0.00' }]],
    [DUPLICATE, [{}, {}]],
    [RESPONSIBILITY, [{}, { responsibility: 'Joint' }]]
  ];
  for (const [id, accounts] of positives) {
    const offeredIssues = offered(read(t, accounts).extraction);
    const found = offeredIssues.findings.find((i) => i.check_id === id);
    check.ok(found && found.eligible === true, `${id} is selectable from the source-shaped reader output`);
    check.equal(offeredIssues.public.find((i) => i.issue_id === found?.issue_id)?.consumer_label, 'VIOLATION', `${id} has the owner-required consumer label`);
    check.ok(found?.rule_assessment?.required_facts?.length > 0
      && found.rule_assessment.required_facts.every((fact) => fact.source?.raw_value != null && fact.source?.location),
      `${id} carries the decisive printed sources`);
  }
  check.equal(offered(read(t, [{}, { number: 'XXXX5678' }]).extraction).findings.some((i) => i.check_id === DUPLICATE), false,
    'separate account numbers do not become a duplicate');
  check.equal(offered(read(t, [{}, { status: 'Closed' }]).extraction).findings.some((i) => i.check_id === DUPLICATE), false,
    'contradictory additional status evidence refutes a duplicate');
  check.equal(offered(read(t, [{}, { number: 'XXXX5678', responsibility: 'Joint' }]).extraction).findings.some((i) => i.check_id === RESPONSIBILITY), false,
    'separate accounts with different roles do not become an ownership conflict');
  check.equal(offered(read(t, [{ status: 'Paid in full', balance: '$0.00', pastDue: '$0.00' }]).extraction).findings.some((i) => i.check_id === PAID), false,
    'a paid account with zero balance and past due is benign');

  const owner = await t.unpaidAccount('df-us-reader-owner@example.test');
  await t.pay(owner, 'monthly');
  const caseId = (await t.request('POST', '/api/cases', { token: owner.token, body: { country: 'US', region: 'US-CA' } })).json.case.case_id;
  const pdf = disclosure([{ limit: '$0.00' }]);
  check.equal((await t.request('POST', `/api/cases/${caseId}/files`, { token: owner.token,
    body: { originalFilename: 'fictional-us-consumer.pdf', declaredBytes: pdf.length, mimeType: 'application/pdf', contentBase64: pdf.toString('base64') } })).status,
  201, 'the fictional US family report uploads normally');
  check.equal((await t.request('POST', `/api/cases/${caseId}/evaluate`, { token: owner.token })).status, 201, 'the uploaded family report reaches assessment');
  const view = (await t.request('GET', `/api/cases/${caseId}/packet`, { token: owner.token })).json.view;
  const candidate = (view.eligible_issues || []).find((issue) => issue.rule_assessment?.check_id === REVOLVING
    || issue.rule_assessment?.requirement === 'The reported revolving balance and explicit credit-limit fields must be reconcilable.');
  check.ok(candidate, 'the real HTTP journey offers the revolving issue for selection');
  if (candidate) {
    check.equal(candidate.consumer_label, 'VIOLATION', 'the selectable issue uses VIOLATION');
    check.equal((await t.request('POST', `/api/cases/${caseId}/packet/select`, { token: owner.token, body: { issue_ids: [candidate.issue_id] } })).status,
      200, 'the consumer selects the sourced issue');
    check.equal((await t.request('POST', `/api/cases/${caseId}/packet/correspondence`, { token: owner.token,
      body: { correspondence: { consumer_name: 'Dana Whitfield', contact: 'dana@example.test' } } })).status, 200, 'correspondence details are supplied');
    await t.preparePostalPacket(owner, caseId);
    check.equal((await t.request('POST', `/api/cases/${caseId}/packet/approve`, { token: owner.token })).status, 200, 'the consumer approves the packet');
    const downloaded = await t.request('GET', `/api/cases/${caseId}/packet-download`, { token: owner.token });
    check.equal(downloaded.status, 200, 'the approved packet downloads');
    check.ok(downloaded.text.includes('Cedar Bank') && downloaded.text.includes('Credit limit or original amount')
      && downloaded.text.includes('$0.00') && downloaded.text.includes('Recent balance') && downloaded.text.includes('$100.00')
      && downloaded.text.includes('Credit card'), 'the downloaded packet carries the account and exact decisive captions and values');
  }

  const sample = process.env.CRP_US_EXPERIAN_PUBLIC_SPECIMEN || path.join(ROOT, 'SOURCE_CAPTURES', 'REPORT_FORMAT_BASELINE_2026-09-30', 'PUB-001.pdf');
  let publicEvidence = 'not present on this host';
  if (fs.existsSync(sample)) {
    check.equal(sha256File(sample).toLowerCase(), family.EVIDENCED_SHA256.toLowerCase(), 'the public source specimen has its pinned digest');
    const extraction = formats.extractWithSharedAdapter(formats.buildPdfDocumentModel(sample), { mode: 'REPORT', country: 'US' });
    const accounts = extraction.records.filter((r) => r.kind === 'REPORTED_ACCOUNT');
    check.equal(accounts.length, 3, 'the captured source keeps its three account boundaries');
    check.equal(accounts[0].facts['account.type'], undefined, 'the captured unreadable credit-card Type remains withheld');
    check.equal(accounts[0].facts['account.status'], 'OPEN', 'the captured readable Open status is retained');
    check.equal(accounts[1].facts['account.type'], 'AUTO', 'the captured Auto Type is retained literally');
    check.equal(accounts[2].facts['account.type'], 'RENTAL', 'the captured Rental Type is retained literally');
    check.equal(accounts[2].facts['account.responsibility'], 'INDIVIDUAL', 'the captured readable Individual responsibility is retained');
    check.equal(accounts.some((r) => r.facts['account.reported_identity'] != null), false, 'no captured unreadable account-name field is promoted');
    check.equal(common.runCommonErrorChecks({ extraction }).performed.some((c) => c.check_id === REVOLVING), false,
      'the captured original amounts and unreadable revolving Type open no revolving check');
    publicEvidence = 'PUB-001 pinned public sample read in place; no new specimen copied';
  }
  return { retained_fields: Object.keys(SHARED), public_evidence: publicEvidence,
    packet_journey: 'US family upload, assessment, VIOLATION selection, correspondence, approval and download' };
}

module.exports = { run, id: 'df-us-common-error-reader', title: 'US consumer captions retained as sourced checklist facts and approved packet',
  fixtures: { disclosure, read, offered } };
