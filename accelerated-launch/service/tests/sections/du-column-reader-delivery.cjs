'use strict';

// Fictional physical cards verify shared reader -> checklist -> consumer approval -> packet.
// They are behavioral fixtures, not evidence of admission for any real bureau family.
const { buildWordPdf } = require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');
const { sourceForField } = require('../../report-fact-sources.cjs');
const issues = require('../../issues.cjs');
const PAID = 'COMMON-ERROR-PAID-SETTLED-SHOWN-UNPAID';
const REAGING = require('../../reaging.cjs').CHECK_ID;

function cardPdf(input = {}) {
  const data = { report: '2026-10-07', status: 'Paid in Full', balance: '$100',
    anchor: '2020-01-01', lastPayment: '2017-01-01', closed: '2021-01-01', ...input };
  const words = [
    { text: 'Equifax Consumer Credit Report - FICTIONAL TEST FIXTURE', x: 40, y: 30 },
    { text: 'Report Date: ' + data.report, x: 40, y: 48 },
    { text: 'Creditor: Cedar Bank', x: 40, y: 80 }
  ];
  const rows = [
    [['Account Number', 'Account Start Date', 'Account Status', 'Responsibility'],
      ['****5432', '2010-01-01', data.status, 'Individual']],
    [['Current Balance', 'Past Due Amount', 'Last Payment Made', 'Account End Date'],
      [data.balance, '$0', data.lastPayment, data.closed]],
    [['First Delinquency Date', 'Account Type', 'Scheduled Payment'], [data.anchor, 'Credit Card', '$60']]
  ];
  for (const [index, [captions, values]] of rows.entries()) {
    captions.forEach((text, column) => words.push({ text, x: 40 + column * 210, y: 108 + index * 42 }));
    values.forEach((text, column) => words.push({ text, x: 40 + column * 210, y: 124 + index * 42 }));
  }
  return buildWordPdf([{ words }], { page_size: { width: 950, height: 420 }, font_size: 10,
    producer: 'Fictional physical card behavioral fixture', creator: 'Fictional physical card behavioral fixture' });
}

async function run(t, check) {
  const owner = await t.unpaidAccount('du-column-owner@example.test'); await t.pay(owner, 'monthly');
  const stranger = await t.unpaidAccount('du-column-stranger@example.test'); await t.pay(stranger, 'monthly');
  async function upload(actor, country, region, options) {
    const opened = await t.request('POST', '/api/cases', { token: actor.token, body: { country, region } });
    const caseId = opened.json.case.case_id, endpoint = '/api/cases/' + caseId, bytes = options?.pdfBytes || cardPdf(options);
    check.equal((await t.request('POST', endpoint + '/files', { token: actor.token, body: {
      originalFilename: 'fictional-caption-card.pdf', declaredBytes: bytes.length, mimeType: 'application/pdf',
      contentBase64: bytes.toString('base64') } })).status, 201, country + ' physical card uploads');
    const assessed = await t.request('POST', endpoint + '/evaluate', { token: actor.token });
    check.equal(assessed.status, 201, country + ' physical card reaches assessment');
    return { caseId, endpoint, assessed, stored: t.service.store.state().results.find((row) => row.case_id === caseId) };
  }
  async function approve(reading, issue) {
    check.equal((await t.request('POST', reading.endpoint + '/packet/select', { token: owner.token,
      body: { issue_ids: [issue.issue_id] } })).status, 200, 'the recovered supported violation is selectable');
    await t.request('POST', reading.endpoint + '/packet/correspondence', { token: owner.token, body: {
      correspondence: { consumer_name: 'Fictional Consumer', contact: 'fictional@example.test' } } });
    check.equal((await t.request('POST', reading.endpoint + '/packet/approve', { token: owner.token })).status, 200,
      'the consumer approves the recovered physical sources');
    const body = await t.request('GET', reading.endpoint + '/packet-download', { token: owner.token });
    check.equal(body.status, 200, 'the approved recovered-source packet downloads'); return body.text;
  }
  for (const [country, region] of [['CA', 'CA-ON'], ['US', 'US-NY'], ['GB', 'GB-ENG'], ['AU', 'AU-NSW']]) {
    const reading = await upload(owner, country, region);
    const record = reading.stored.extraction.records.find((row) => row.facts?.['account.masked_identifier'] === 'MASK-5432');
    check.ok(record, country + ' own column mask survives the transport and shared reader');
    if (!record) continue;
    check.equal(record.facts['tradeline.lastPaymentDate'], '2017-01-01', 'Last Payment Made keeps its own payment meaning');
    check.equal(record.facts['liability.closedDate'], '2021-01-01', 'Account End Date keeps its own closure meaning');
    for (const field of ['account.masked_identifier', 'account.balance', 'tradeline.lastPaymentDate', 'liability.closedDate']) {
      const source = sourceForField(record, field);
      check.ok(source?.location?.bbox && source.location.caption_location?.bbox,
        field + ' retains its own physical value and caption locations');
    }
    check.equal(sourceForField(record, 'tradeline.lastPaymentDate')?.source_field, 'Last Payment Made',
      'the actual payment caption is available to consumer evidence');
    check.equal(sourceForField(record, 'liability.closedDate')?.source_field, 'Account End Date',
      'the actual closure caption is available to consumer evidence');
    check.equal(sourceForField(record, 'account.paymentAmount')?.raw_value, '$60',
      'the optional own scheduled amount has a shared physical source');
    const competing = JSON.parse(JSON.stringify(record));
    competing.printed = { Ownership: { ...competing.printed['account.responsibility'], label: 'Ownership' }, ...competing.printed };
    check.equal(sourceForField(competing, 'account.responsibility')?.source_field, 'Responsibility',
      'equal ownership wording never replaces the exact consumer-role source');
    const view = (await t.request('GET', reading.endpoint + '/packet', { token: owner.token })).json.view;
    const offered = issues.issuesFor(reading.stored).find((entry) => entry.check_id === PAID);
    const issue = view.eligible_issues.find((entry) => entry.issue_id === offered?.issue_id);
    check.ok(issue, country + ' paid status with an own positive balance supports the checklist violation');
    if (!issue) continue;
    check.equal(issue.consumer_label, 'VIOLATION', 'the consumer receives the sole breach term');
    const assessment = await t.request('GET', reading.endpoint + '/report-download', { token: owner.token });
    check.equal(assessment.status, 200, 'the recovered issue reaches the assessment download');
    check.ok(assessment.text.includes('Current Balance') && assessment.text.includes('page 1'),
      'assessment wording retains the actual caption and physical page');
    check.equal(/potential violation|probable violation|COMMON-ERROR-/i.test(assessment.text), false,
      'assessment text contains no obsolete verdict or internal check ID');
    const body = await approve(reading, issue);
    check.ok(body.includes('VIOLATION') && body.includes('Current Balance') && body.includes('page 1'),
      'the approved packet carries the actual own balance source');
    check.equal(/potential violation|probable violation|COMMON-ERROR-|undefined/i.test(body), false,
      'the recovered packet has no obsolete verdict or invented source');
    check.equal((await t.request('GET', reading.endpoint + '/packet-download', { token: stranger.token })).status, 403,
      'another consumer cannot download this physical evidence');
  }

  const old = await upload(owner, 'US', 'US-NY', { status: 'Charged Off', report: '2025-10-07', anchor: '2018-01-01', closed: '2020-01-01' });
  const current = await upload(owner, 'US', 'US-NY', { status: 'Charged Off', anchor: '2020-01-01', closed: '2020-01-01' });
  const reaging = issues.issuesFor(current.stored).find((entry) => entry.check_id === REAGING);
  check.ok(reaging, 'own recovered identity and dates support the owned earlier/current anchor comparison');
  if (reaging) {
    const body = await approve(current, reaging);
    check.ok(body.includes('Earlier report 2025-10-07') && body.includes('Current report 2026-10-07'),
      'the approved changed-anchor packet carries both owned report dates');
    check.ok(body.includes('2018-01-01') && body.includes('2020-01-01'), 'both actual original-delinquency readings reach the packet');
    const record = current.stored.extraction.records.find((row) => row.facts?.['account.masked_identifier'] === 'MASK-5432');
    const anchorSource = sourceForField(record, 'tradeline.firstDelinquencyDate');
    check.ok(anchorSource?.location.caption_location?.bbox, 'the decisive original-delinquency caption has its own physical source');
    t.service.store.update((state) => {
      const activeRecord = state.results.find((row) => row.case_id === current.caseId).extraction.records
        .find((row) => row.facts?.['account.masked_identifier'] === 'MASK-5432');
      sourceForField(activeRecord, 'tradeline.firstDelinquencyDate').location.caption_location.bbox.x0 += 1;
    });
    check.equal((await t.request('GET', current.endpoint + '/packet-download', { token: owner.token })).status, 409,
      'changing a decisive physical caption invalidates the approved download');
  }
  check.equal(old.stored.extraction.records.some((row) => row.facts?.['tradeline.firstDelinquencyDate'] === '2018-01-01'), true,
    'the earlier owned result keeps its own recovered anchor');
  const ratingPdf = require('./dt-rating-history-rows.cjs').fixtures.ratingPdf;
  const equivalent = require('./dt-rating-history-rows.cjs').fixtures.read(t, { months: ['May', 'May'],
    codes: ['OK', '30'], financial: false, legend: [{ code: 'OK', meaning: 'Current' },
      { code: 'OK', meaning: 'CURRENT' }, { code: '30', meaning: '30 Days Late' }] });
  const equivalentIssue = issues.issuesFor({ extraction: equivalent.extraction,
    evaluation: require('../../evaluation.cjs').evaluateCase({ country: 'US', region: 'US-NY', extraction: equivalent.extraction }) })
    .find((entry) => entry.check_id === 'COMMON-ERROR-PAYMENT-HISTORY-INCONSISTENCY');
  check.ok(equivalentIssue?.rule_assessment, 'equivalent repeated key casing preserves the supported same-period rule');
  const history = await upload(owner, 'US', 'US-NY', { pdfBytes: ratingPdf({ months: ['May', 'May'],
    codes: ['OK', '30'], financial: false, paymentDate: true }) });
  const historyId = 'COMMON-ERROR-PAYMENT-HISTORY-INCONSISTENCY';
  const historyIssue = issues.issuesFor(history.stored).find((entry) => entry.check_id === historyId);
  check.ok(historyIssue?.rule_assessment, 'own dated Rating cells and the printed key reach a sourced checklist rule');
  if (historyIssue) {
    check.equal(historyIssue.source_facts.filter((fact) => fact.source_field === 'Rating:').length, 2,
      'the issue retains the two actual code captions');
    check.equal(historyIssue.source_facts.filter((fact) => fact.source_field === 'Ratings Key').length, 2,
      'each decisive code includes its own literal printed key');
    const body = await approve(history, historyIssue);
    check.ok(body.includes('Rating:') && body.includes('Category:') && body.includes('Ratings Key')
      && body.includes('May 2024') && body.includes('OK Current') && body.includes('30 30 Days Late'),
      'packet review states the actual captions, separate calendar sources and printed code meanings');
    const caseId = history.caseId;
    const records = history.stored.extraction.records;
    const recordIndex = records.findIndex((record) => record.facts?.['account.paymentHistoryCells']);
    const saved = JSON.parse(JSON.stringify(records[recordIndex]));
    for (const [label, change] of [
      ['key geometry', (cell) => { cell.printed_definition.meaning_location.x0 += 1; }],
      ['key heading', (cell) => { cell.printed_definition.heading_location.x0 += 1; }],
      ['code caption', (cell) => { cell.row_label_location.x0 += 1; }],
      ['own year', (cell) => { cell.period_location.year.x0 += 1; }],
      ['untrusted meaning', (cell) => { cell.printed_definition.meaning_location.trusted = false; }],
      ['changed meaning', (cell) => { cell.printed_definition.meaning = cell.meaning = 'Changed literal meaning'; }],
      ['removed key', (cell) => { delete cell.printed_definition; }]
    ]) {
      t.service.store.update((state) => {
        change(state.results.find((row) => row.case_id === caseId).extraction.records[recordIndex]
          .facts['account.paymentHistoryCells'][0]);
      });
      check.equal((await t.request('GET', history.endpoint + '/packet-download', { token: owner.token })).status, 409,
        label + ' cannot retain an approved history packet');
      t.service.store.update((state) => {
        state.results.find((row) => row.case_id === caseId).extraction.records[recordIndex] = JSON.parse(JSON.stringify(saved));
      });
      check.equal((await t.request('GET', history.endpoint + '/packet-download', { token: owner.token })).status, 200,
        'restoring the exact own printed evidence restores approval');
    }
  }
  return { countries: ['CA', 'US', 'GB', 'AU'], layout: 'fictional positioned multi-caption cards',
    outcome: 'source-linked checklist findings, assessment download, owned comparison and approved packets', deployment: 'NOT_PERFORMED' };
}
module.exports = { run, cardPdf, id: 'du-column-reader-delivery', title: 'Physical card facts reach checklist assessment and approved packets' };
