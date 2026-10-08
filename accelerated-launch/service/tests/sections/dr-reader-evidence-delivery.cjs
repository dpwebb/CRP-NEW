'use strict';
const { packetText } = require('../packet-pdf-assertions.cjs');

const common = require('../../common-errors.cjs');
const issues = require('../../issues.cjs');
const packets = require('../../packets.cjs');
const fs = require('node:fs');
const path = require('node:path');
const formats = require('../../formats.cjs');
const CLOSED = 'COMMON-ERROR-CLOSURE-STATED-WITHOUT-A-CLOSED-DATE';

function context(change, region = 'CA-ON') {
  const noteLocation = { page: 5, line: 25, trusted: true, x0: 34, y0: 540, x1: 198, y1: 550 };
  const record = { record_index: 3, kind: 'CA_EQUIFAX_ORDINARY_ACCOUNT', kind_label: 'credit account',
    status: 'RESOLVED', location: { page: 5, line: 1 }, facts: {},
    printed: { 'Closed Date': { label: 'Date Closed', state: 'LABEL_PRINTED_WITHOUT_VALUE',
      location: { page: 5, line: 17, trusted: true } } },
    report_status_statements: [{ raw_value: 'Closed by credit grantor', meaning: 'Closed by credit grantor',
      source_field: 'Notes', caption_count: 1, trusted: true, location: noteLocation }] };
  if (change) change(record);
  const extraction = { presentation_id: 'PR-01', records: [record] };
  const evaluation = { country: region.split('-')[0], region, results: [],
    common_errors: common.runCommonErrorChecks({ extraction }) };
  return { extraction, evaluation, findings: issues.issuesFor({ extraction, evaluation }) };
}

function storeFor(ctx) {
  const state = { cases: [{ case_id: 'dr-case', account_id: 'dr-owner' }],
    results: [{ ...ctx, case_id: 'dr-case', account_id: 'dr-owner', result_id: 'dr-result' }], packets: [] };
  return { state: () => state, update: (fn) => fn(state) };
}

async function run(t, check) {
  const positive = context(), issue = positive.findings.find((entry) => entry.check_id === CLOSED);
  check.ok(issue?.rule_assessment, 'literal own closure and an explicitly blank own caption support the existing checklist rule');
  check.equal(issue && issues.publicIssue(issue).consumer_label, 'VIOLATION', 'the consumer receives the sole breach term');
  check.deepEqual(issue?.source_facts.map((fact) => [fact.source_field, fact.raw_value]),
    [['Date Closed', null], ['Notes', 'Closed by credit grantor']], 'the actual blank caption and literal Notes remain separate source evidence');
  check.equal(issue?.rule_assessment.required_facts[0].source.source_field, 'Date Closed', 'the missing date keeps the actual printed caption');
  check.ok(!/null|undefined/.test(issue?.explanation || ''), 'the consumer explanation never describes a nonexistent narrative code');
  const protectedCtx = context((record) => {
    record.facts['account.reported_identity'] = 'INTERNAL-CREDITOR-MATCH-TOKEN';
    record.fact_sources = { 'account.reported_identity': { raw_value: 'INTERNAL-CREDITOR-MATCH-TOKEN',
      normalized_value: 'INTERNAL-CREDITOR-MATCH-TOKEN', source_field: 'Creditor heading', privacy_redacted: true,
      location: { page: 5, line: 2, trusted: true }, caption_count: 1 } };
  });
  const protectedIssue = protectedCtx.findings[0];
  check.equal(protectedIssue?.account_identity.name, 'Account entry 3', 'a privacy-preserving creditor key remains an account reference');
  check.equal(JSON.stringify(issues.publicIssue(protectedIssue)).includes('INTERNAL-CREDITOR-MATCH-TOKEN'), false,
    'the consumer never sees an internal creditor match token');
  const fictionalCa = require('./dq-ca-printed-account-fields.cjs').makeFictionalPr01Model();
  const viewCa = require('../../ca-consumer-file-facts.cjs').read(fictionalCa);
  viewCa.ordinary_records.push(JSON.parse(JSON.stringify(viewCa.ordinary_records[0])));
  const duplicateExtraction = { presentation_id: 'PR-01', ...formats.normalizeExtraction({
    last_payment_facts: [], debt_records: [], last_payment_fact_summary: {}, request_date: {
      status: 'RESOLVED', raw_value: '2026/04/14', normalized_value: '2026-04-14',
      location: { page: 1, line: 1, trusted: true } } }, viewCa) };
  const duplicateEvaluation = { country: 'CA', region: 'CA-MB', results: [],
    common_errors: common.runCommonErrorChecks({ extraction: duplicateExtraction }) };
  const duplicate = issues.issuesFor({ extraction: duplicateExtraction, evaluation: duplicateEvaluation })
    .find((entry) => entry.check_id === 'COMMON-ERROR-DUPLICATE-REPORTING');
  check.ok(duplicate?.rule_assessment, 'matching sourced ordinary identifiers and corroborating facts reach duplicate verification');
  check.equal(/CREDITOR-?[a-f0-9]{24}/i.test(JSON.stringify(issues.publicIssue(duplicate))), false,
    'duplicate consumer evidence preserves privacy without exposing the matching token');
  if (duplicate) {
    const store = storeFor({ extraction: duplicateExtraction, evaluation: duplicateEvaluation }), actor = { account_id: 'dr-owner' };
    packets.selectIssues(store, actor, 'dr-case', [duplicate.issue_id]);
    packets.setCorrespondence(store, actor, 'dr-case', { consumer_name: 'Fictional Consumer', contact: 'fictional@example.test' });
    packets.approvePacket(store, actor, 'dr-case');
    const body = packetText(packets.packetDownload(store, actor, 'dr-case'));
    check.equal(/CREDITOR-?[a-f0-9]{24}/i.test(body), false, 'the approved duplicate packet has no internal creditor key');
    check.ok(body.includes('***4321') && body.includes('Creditor identity matched from the report'),
      'duplicate packet retains the actual masked identifier and located creditor match');
  }

  for (const [label, change] of [
    ['no closure wording', (r) => { r.report_status_statements[0].raw_value = r.report_status_statements[0].meaning = 'Payments up to date'; }],
    ['untrusted words', (r) => { r.report_status_statements[0].trusted = false; }],
    ['untrusted geometry', (r) => { r.report_status_statements[0].location.trusted = false; }],
    ['duplicate Notes', (r) => { r.report_status_statements[0].caption_count = 2; }],
    ['changed meaning', (r) => { r.report_status_statements[0].meaning = 'Cancelled account'; }],
    ['caption not printed', (r) => { r.printed['Closed Date'].state = 'NOT_PRINTED'; }],
    ['populated date', (r) => { r.printed['Closed Date'].state = 'VALUE'; r.printed['Closed Date'].raw = '2025-01-01'; }],
    ['untrusted date caption', (r) => { r.printed['Closed Date'].location.trusted = false; }]
  ]) {
    check.equal(context(change).findings.filter((entry) => entry.check_id === CLOSED).length, 0,
      label + ' cannot create a source-supported completeness violation');
  }
  for (const region of ['CA-ON', 'CA-NS', 'US-NY', 'GB-ENG', 'AU-NSW']) {
    check.equal(context(null, region).findings.find((entry) => entry.check_id === CLOSED)?.rule_assessment.rule_id,
      CLOSED, region + ' applies the same sourced report-data rule without a statute gate');
  }

  if (issue) {
    const store = storeFor(positive), actor = { account_id: 'dr-owner' };
    packets.selectIssues(store, actor, 'dr-case', [issue.issue_id]);
    packets.setCorrespondence(store, actor, 'dr-case', { consumer_name: 'Fictional Consumer', contact: 'fictional@example.test' });
    packets.approvePacket(store, actor, 'dr-case');
    const body = packetText(packets.packetDownload(store, actor, 'dr-case'));
    check.ok(body.includes('VIOLATION') && body.includes('Notes: printed "Closed by credit grantor"'),
      'the selected approved packet states the actual own Notes phrase');
    check.ok(body.includes('Printed caption without a value: Date Closed') && body.includes('page 5'),
      'packet gives the actual blank caption and physical page');
    check.equal(/printed "null"|published code definition|potential violation|probable violation/i.test(body), false,
      'literal closure packets invent no code definition or consumer confidence verdict');
    store.update((state) => { state.results[0].extraction.records[0].report_status_statements[0].location.x0 += 1; });
    let error;
    try { packets.packetDownload(store, actor, 'dr-case'); } catch (caught) { error = caught.code; }
    check.equal(error, 'PACKET_APPROVAL_STALE', 'changing the selected own Notes evidence invalidates approval');
  }
  const owner = await t.unpaidAccount('dr-evidence-owner@example.test'); await t.pay(owner, 'monthly');
  const upload = async (country, region, bytes, filename) => {
    const opened = await t.request('POST', '/api/cases', { token: owner.token, body: { country, region } });
    const endpoint = '/api/cases/' + opened.json.case.case_id;
    check.equal((await t.request('POST', endpoint + '/files', { token: owner.token, body: {
      originalFilename: filename, declaredBytes: bytes.length, mimeType: 'application/pdf',
      contentBase64: bytes.toString('base64') } })).status, 201, country + ' file enters the ordinary local upload path');
    check.equal((await t.request('POST', endpoint + '/evaluate', { token: owner.token })).status, 201,
      country + ' reader evidence reaches assessment');
    return endpoint;
  };
  const approve = async (endpoint, selected) => {
    await t.request('POST', endpoint + '/packet/select', { token: owner.token, body: { issue_ids: [selected.issue_id] } });
    await t.request('POST', endpoint + '/packet/correspondence', { token: owner.token, body: {
      correspondence: { consumer_name: 'Fictional Consumer', contact: 'fictional@example.test' } } });
    await t.preparePostalPacket(owner, endpoint.split('/').at(-1));
    check.equal((await t.request('POST', endpoint + '/packet/approve', { token: owner.token })).status, 200,
      'the consumer approves the recovered source evidence');
    const downloaded = await t.request('GET', endpoint + '/packet-download', { token: owner.token });
    check.equal(downloaded.status, 200, 'the selected approved evidence packet downloads');
    return downloaded.text;
  };
  // Private source bytes remain inside this loopback harness and are removed with its data directory.
  const localCa = process.env.CRP_CA_EQUIFAX_LOCAL_SPECIMEN || 'C:/Users/webbd/CREDIT REPORTS/CA/CA Equifax 001.pdf';
  if (fs.existsSync(localCa)) {
    const endpoint = await upload('CA', 'CA-NS', fs.readFileSync(localCa), 'local-canadian-report.pdf');
    const state = t.service.store.state(), caseId = endpoint.split('/').at(-1);
    const stored = state.results.find((row) => row.case_id === caseId);
    check.equal(stored.extraction.records.length, 4, 'actual PR-01 stores two collections and two recovered ordinary accounts');
    check.equal(stored.extraction.records.filter((r) => r.kind === 'CA_EQUIFAX_ORDINARY_ACCOUNT'
      && r.facts?.['tradeline.lastPaymentDate']).length, 2,
      'actual recovered ordinary last-payment dates reach the shared result');
    check.deepEqual(stored.evaluation.results.map((result) => result.record_index), [1, 2],
      'actual ordinary dates do not expand the accepted collection statutory comparison scope');
    const ordinary = stored.extraction.records.find((record) => record.kind === 'CA_EQUIFAX_ORDINARY_ACCOUNT');
    check.deepEqual(formats.factsForRecord(ordinary), {},
      'statutory fact access cannot consume ordinary checklist-only facts');
    const view = (await t.request('GET', endpoint + '/packet', { token: owner.token })).json.view;
    const selected = view.eligible_issues.find((entry) => entry.source_facts?.some((fact) => fact.source_field === 'Notes'));
    check.ok(selected, 'actual source-linked closure with its own blank date is selectable');
    if (selected) {
      const body = await approve(endpoint, selected);
      check.ok(body.includes('VIOLATION'), 'actual recovered Canadian closure packet uses the breach term');
      const ownNote = selected.source_facts.find((fact) => fact.source_field === 'Notes').raw_value;
      check.ok(/closed by credit grantor/i.test(ownNote) && body.includes(`Notes: printed "${ownNote}"`),
        'actual packet includes the complete literal own closure note');
      check.ok(body.includes('Date Closed'), 'actual packet includes the exact blank closure-date caption');
      check.ok(body.includes('page 7'), 'actual recovered Canadian closure packet references its physical page');
      check.equal(/CA-CREDITOR-|INTERNAL-CREDITOR-|page undefined/.test(body), false,
        'the private-source packet exposes no internal creditor token or invented page');
    }
  } else check.skip('authorized local Canadian delivery', 'LOCAL_SOURCE_NOT_PRESENT');

  const gbBytes = require('./do-gb-history-definitions.cjs').nativePdf();
  const endpoint = await upload('GB', 'GB-ENG', gbBytes, 'fictional-uk-history.pdf');
  const view = (await t.request('GET', endpoint + '/packet', { token: owner.token })).json.view;
  const selected = view.eligible_issues.find((entry) => entry.source_facts?.some((fact) => fact.definition_source?.kind === 'HISTORY_PERIOD'));
  check.ok(selected, 'the derived UK period has a separate published basis in consumer packet review');
  if (selected) {
    const body = await approve(endpoint, selected);
    check.ok(body.includes('File updated for the period to: printed "01/01/26"')
      && body.includes('Published history-period definition:') && body.includes('Published code definition:'),
    'packet distinguishes the own date anchor, published ordering and published code meanings');
    const issueSummary = body.split('EVIDENCE REFERENCES')[1].split('PRINT AND MAIL')[0];
    check.ok(issueSummary.includes('printed "1"') && issueSummary.includes('printed "0"') && issueSummary.includes('page 1'),
      'the single evidence appendix retains both physical code readings separately from the definitions');
    const report = await t.request('GET', endpoint + '/report-download', { token: owner.token });
    check.equal(report.status, 200, 'the same recovered UK violation reaches the assessment download');
    check.ok(report.text.includes('Published payment-history order') && report.text.includes('most recent')
      && report.text.includes('File updated for the period to'), 'assessment cites the published period basis and actual report date');
    const caseId = endpoint.split('/').at(-1), saved = JSON.parse(JSON.stringify(t.service.store.state().results.find((r) => r.case_id === caseId).extraction.records[0]));
    for (const [label, change] of [
      ['period definition version', (r) => { r.facts['account.paymentHistoryCells'].find((cell) => cell.period === selected.evidence.period).period_definition.source.version = 'changed'; }],
      ['own period date geometry', (r) => { r.facts['account.paymentHistoryCells'].find((cell) => cell.period === selected.evidence.period).period_location.anchor.x0 += 1; }]
    ]) {
      t.service.store.update((state) => { change(state.results.find((r) => r.case_id === caseId).extraction.records[0]); });
      check.equal((await t.request('GET', endpoint + '/packet-download', { token: owner.token })).status, 409,
        label + ' invalidates approval');
      t.service.store.update((state) => { state.results.find((r) => r.case_id === caseId).extraction.records[0] = JSON.parse(JSON.stringify(saved)); });
      check.equal((await t.request('GET', endpoint + '/packet-download', { token: owner.token })).status, 200,
        'restoring the exact period evidence restores the approved version');
    }
    const { chromium } = require('C:/Users/webbd/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
    const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
    try {
      const page = await browser.newPage(); page.setDefaultTimeout(20000); await page.goto(t.base + '/');
      await page.locator('#email').fill('dr-evidence-owner@example.test');
      await page.locator('#password').fill('a-long-enough-password'); await page.locator('#signin').click();
      await page.waitForSelector('#open'); await page.locator('#refresh').click();
      await page.locator('[data-open="' + caseId + '"]').click();
      await page.locator('#steps button[data-step="4"]').click(); await page.waitForSelector('#packet-block');
      await page.waitForFunction(() => document.querySelector('#packet-block').innerText.includes('Published history-period definition'));
      const text = await page.locator('#packet-block').innerText();
      check.ok(text.includes('Published history-period definition') && text.includes('File updated for the period to')
        && text.includes('printed 1') && text.includes('printed 0'), 'actual browser review separates published ordering from the own printed date and codes');
      check.equal(/printed Most recent month first|printed Creditor identity matched|potential violation|probable violation/i.test(text), false,
        'actual review presents no calculated definition as report text or obsolete breach term');
    } finally { await browser.close(); }
  }
  const nativePdf = require('./do-gb-history-definitions.cjs').nativePdf;
  for (const code of ['D', 'U', '8']) {
    const file = path.join(t.dataDir, 'nonperformance-' + code + '.pdf'); fs.writeFileSync(file, nativePdf([{ history: ['0' + code, '00'] }]));
    const extraction = formats.extractWithSharedAdapter(formats.buildPdfDocumentModel(file), { mode: 'REPORT', country: 'GB' });
    const cell = extraction.records[0].facts['account.paymentHistoryCells'].find((entry) => entry.code === code);
    cell.performance_usable = true;
    check.equal(common.runCommonErrorChecks({ extraction }).performed.find((entry) => entry.check_id === 'COMMON-ERROR-PAYMENT-HISTORY-INCONSISTENCY')?.source_records.length || 0,
      0, code + ' cannot become performance evidence by changing a local flag');
  }
  const file = path.join(t.dataDir, 'raw-period-proof.pdf'); fs.writeFileSync(file, gbBytes);
  const extraction = formats.extractWithSharedAdapter(formats.buildPdfDocumentModel(file), { mode: 'REPORT', country: 'GB' });
  extraction.records[0].facts['account.paymentHistoryCells'][1].raw_period = 'individually printed December 2024';
  check.equal(common.runCommonErrorChecks({ extraction }).performed.find((entry) => entry.check_id === 'COMMON-ERROR-PAYMENT-HISTORY-INCONSISTENCY')?.source_records.length || 0,
    0, 'a fabricated printed-period caption cannot accompany the calculated month');
  return { scope: 'literal source-backed closure completeness and approved evidence delivery' };
}

module.exports = { run, id: 'dr-reader-evidence-delivery', title: 'Recovered reader facts reach source-linked consumer packets' };
