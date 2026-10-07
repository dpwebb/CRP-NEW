'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const gb = require('../../format-families/gb-experian-consumer.cjs');
const formats = require('../../formats.cjs');
const common = require('../../common-errors.cjs');
const issues = require('../../issues.cjs');
const packets = require('../../packets.cjs');
const { sourceForField } = require('../../report-fact-sources.cjs');
const { buildPdf } = require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');

const DATES = 'COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY';
const ZERO_LIMIT = 'COMMON-ERROR-REVOLVING-BALANCE-ZERO-LIMIT';
const REGIONS = ['GB-ENG', 'GB-NIR', 'GB-SCT', 'GB-WLS'];
const PUBLIC_PDF = path.resolve(__dirname, '../../../../SOURCE_CAPTURES/REPORT_FORMAT_BASELINE_2026-09-30/PUB-009.pdf');
const PUBLIC_SHA = '5e95f3d27c4102c7772b33d0e11f3f4e0f37d253b2147e635db54e9bd328aec4';
const STRUCTURAL_TEST = { admitted: true, presentation_evidence: false,
  state: 'SYNTHETIC_STRUCTURAL_TEST_INPUT_NOT_A_REPORT' };
const POSITIVE = ['FICTIONAL BANK CREDIT CARD', 'Started 01/01/20 Settled 01/01/19',
  'Balance £100 Credit Limit £0'];

function assess(extraction, region = 'GB-ENG') {
  const evaluation = { country: 'GB', region, results: [], common_errors: common.runCommonErrorChecks({ extraction }) };
  return { extraction, evaluation, findings: issues.issuesFor({ extraction, evaluation }) };
}

function read(lines, options = {}) {
  const model = formats.makeSyntheticModel({ pages: [['Date of report: 1 June 2026',
    'Credit account information', 'C1 Fictional Consumer', ...lines]] });
  if (options.unread) model.read_errors = [{ stage: 'pdftotext', page: 1 }];
  return assess({ presentation_id: gb.FAMILY_ID, family_id: gb.FAMILY_ID, bureau: 'Experian',
    ...gb.extract(model, STRUCTURAL_TEST) });
}

function packetStore(ctx) {
  const state = { cases: [{ case_id: 'fictional-gb', account_id: 'fictional-owner', country: 'GB', region: 'GB-ENG' }],
    results: [{ ...ctx, case_id: 'fictional-gb', account_id: 'fictional-owner', result_id: 'fictional-result' }], packets: [] };
  return { state: () => state, update: (fn) => fn(state) };
}

function approve(ctx, issueIds) {
  const store = packetStore(ctx), actor = { account_id: 'fictional-owner' };
  packets.selectIssues(store, actor, 'fictional-gb', issueIds);
  packets.setCorrespondence(store, actor, 'fictional-gb', { consumer_name: 'Fictional Consumer', contact: 'fictional@example.test' });
  packets.approvePacket(store, actor, 'fictional-gb');
  return { store, actor, body: packets.packetDownload(store, actor, 'fictional-gb').body };
}

function familyPdf(accountLines) {
  return buildPdf({ pages: [{ lines: ['Experian', 'Your Credit Report', 'Date of report: 1 June 2026',
    'Consumer Help Service', 'www.experian.co.uk', ...gb.REQUIRED_HEADINGS.slice(0, 6),
    'C1 Fictional Consumer', ...accountLines, ...gb.REQUIRED_HEADINGS.slice(6), 'Useful addresses'] }] });
}

async function upload(service, actor, region, accountLines) {
  const created = await service.request('POST', '/api/cases', { token: actor.token, body: { country: 'GB', region } });
  const caseId = created.json.case.case_id, bytes = familyPdf(accountLines);
  const receipt = await service.request('POST', `/api/cases/${caseId}/files`, { token: actor.token, body: {
    originalFilename: 'fictional-gb-report.pdf', declaredBytes: bytes.length, mimeType: 'application/pdf',
    contentBase64: bytes.toString('base64') } });
  const evaluated = await service.request('POST', `/api/cases/${caseId}/evaluate`, { token: actor.token });
  return { caseId, receipt, evaluated };
}

async function run(service, check) {
  const positive = read(POSITIVE), record = positive.extraction.records[0];
  const expectedSources = [
    ['liability.openedDate', 'Started', '01/01/20', '2020-01-01', 5],
    ['liability.closedDate', 'Settled', '01/01/19', '2019-01-01', 5],
    ['account.balance', 'Balance', '£100', 100, 6],
    ['account.creditLimit', 'Credit Limit', '£0', 0, 6],
    ['account.reported_identity', 'Lender and account type heading', 'FICTIONAL BANK CREDIT CARD', 'FICTIONAL BANK CREDIT CARD', 4],
    ['account.type', 'Account type in lender heading', 'CREDIT CARD', 'CREDIT CARD', 4]
  ];
  for (const [field, caption, raw, normalized, line] of expectedSources) {
    const source = sourceForField(record, field);
    check.deepEqual([source?.source_field, source?.raw_value, source?.normalized_value], [caption, raw, normalized],
      `${field} has its own caption, raw reading and exact normalized value`);
    check.deepEqual([source?.location.page, source?.location.line, source?.record_index], [1, line, 1],
      `${field} keeps its account and physical source location`);
  }
  check.deepEqual(positive.findings.map((issue) => issue.check_id), [DATES, ZERO_LIMIT],
    'two distinct printed concerns each reach the checklist once');
  check.deepEqual(positive.findings.map((issue) => issue.classification), ['PROBABLE_VIOLATION', 'POTENTIAL_VIOLATION'],
    'source linkage retains the existing internal evidence thresholds');
  check.ok(positive.findings.every((issue) => issues.publicIssue(issue).consumer_label === 'VIOLATION'),
    'the consumer sees the sole VIOLATION breach term');
  check.deepEqual(positive.findings[0].source_facts.map((fact) => fact.source_field), ['Started', 'Settled'],
    'the date conflict retains the report captions instead of substituting opened/closed captions');

  const separate = read(['FICTIONAL BANK CREDIT CARD', 'Balance £100 Credit Limit £0',
    'C2 Fictional Consumer', 'FICTIONAL BANK CREDIT CARD', 'Balance £200']);
  check.equal(separate.extraction.records.length, 2, 'each physical C item retains its own account boundary');
  check.deepEqual(separate.findings.map((issue) => issue.record_index), [1],
    'the second account cannot borrow the first account credit limit or issue');
  check.equal(separate.extraction.records[1].fact_sources['account.balance'].record_index, 2,
    'the second account numeric source belongs to its own record');
  check.equal(separate.extraction.records[1].fact_sources['account.reported_identity'].location.line, 7,
    'equal lender headings retain separate physical sources');

  const equal = read(['FICTIONAL BANK CREDIT CARD', 'Started 01/01/20 Settled 01/01/20',
    'Balance £100 Credit Limit £100']).extraction.records[0];
  check.equal(equal.fact_sources['liability.closedDate'].source_field, 'Settled',
    'an equal lifecycle date cannot borrow Started as its source');
  check.equal(equal.fact_sources['account.creditLimit'].source_field, 'Credit Limit',
    'an equal numeric value cannot borrow the balance source');
  check.equal(equal.fact_sources['account.creditLimit'].raw_value, '£100', 'equal amounts retain the full printed money reading');
  for (const type of ['CURRENT ACCOUNT', 'LOAN', 'RENTAL']) {
    const nonrevolving = read([`FICTIONAL BANK ${type}`, 'Balance £100 Credit Limit £0']);
    check.equal(nonrevolving.extraction.records[0].facts['account.type'], type, 'nonrevolving types retain their exact printed words');
    check.equal(nonrevolving.extraction.records[0].fact_sources['account.type'].raw_value, type,
      'nonrevolving type has its own heading reading');
    check.deepEqual(nonrevolving.findings, [], 'a nonrevolving type does not become a zero-limit violation');
  }

  const joint = read(['JOINT ACCOUNT', 'FICTIONAL BANK LOAN', 'Started 01/01/20',
    'Default £100 Defaulted 01/01/21', 'Balance Satisfied', 'Status history 8',
    'File updated for the period to 01/01/22']).extraction.records[0];
  check.deepEqual([joint.facts['account.responsibility'], joint.fact_sources['account.responsibility'].raw_value,
    joint.fact_sources['account.responsibility'].source_field, joint.fact_sources['account.responsibility'].location.line],
  ['JOINT', 'JOINT ACCOUNT', 'JOINT ACCOUNT', 4], 'JOINT keeps its own explicit marker and location');
  check.equal(joint.fact_sources['account.defaultAmount'].source_field, 'Default', 'default amount keeps its own caption');
  check.equal(joint.facts['account.balanceRaw'], 'Satisfied', 'the nonnumeric balance reading is retained verbatim');
  for (const field of ['account.balance', 'account.status', 'account.pastDueAmount', 'tradeline.lastPaymentDate',
    'tradeline.firstDelinquencyDate', 'account.masked_identifier', 'reportedAccount.firstReported'])
    check.equal(joint.facts[field], undefined, `${field} is not invented from default/update/satisfied captions`);
  check.ok(joint.facts['account.paymentHistoryCells'].every((cell) => cell.period === null && cell.meaning === null
    && cell.uncertain === true && cell.location?.line === 9), 'undated history has its own location but no guessed period or meaning');

  const current = read(['FICTIONAL BANK CREDIT CARD', 'Balance Satisfied', 'Current Balance £100 Credit Limit £0']);
  check.equal(current.extraction.records[0].printed.Balance.raw, 'Satisfied', 'the distinct satisfied reading remains in printed facts');
  check.equal(current.extraction.records[0].facts['account.balance'], 100, 'Satisfied does not hide a separately printed current amount');
  check.equal(current.findings[0]?.source_facts.find((fact) => fact.field === 'account.balance')?.source_field,
    'Current Balance', 'the current amount is tied to Current Balance, never Balance Satisfied');
  const currentPacket = approve(current, current.findings.map((issue) => issue.issue_id)).body;
  check.match(currentPacket, /Current Balance: printed "£100"/, 'the selected packet uses the own current-balance caption');
  check.equal(currentPacket.includes('Balance: printed "Satisfied"'), false,
    'the packet never substitutes the nonnumeric reading as the decisive balance evidence');
  const conflicting = read(['FICTIONAL BANK CREDIT CARD', 'Balance £200 Current Balance £100 Credit Limit £0']);
  check.equal(conflicting.extraction.records[0].facts['account.balance'], undefined, 'conflicting balance captions choose no amount');
  check.deepEqual(conflicting.findings, [], 'an ambiguous current amount does not manufacture a zero-limit issue');

  for (const lines of [
    ['FICTIONAL BANK CREDIT CARD', 'Started 01/01/20 Started 01/01/18 Settled 01/01/19'],
    ['FICTIONAL BANK CREDIT CARD', 'Started unreadable Settled 01/01/19'],
    ['FICTIONAL BANK CREDIT CARD', 'Started 32/01/20 Settled 01/01/19'],
    ['FICTIONAL BANK CREDIT CARD', 'Balance £100 Balance £200 Credit Limit £0'],
    ['FICTIONAL BANK CREDIT CARD', 'Balance £100 Credit Limit £0 Credit Limit £100'],
    ['FICTIONAL BANK CREDIT CARD', 'OTHER BANK CREDIT CARD', 'Balance £100 Credit Limit £0']
  ]) check.deepEqual(read(lines).findings, [], 'repeated/malformed decisive captions and repeated headings do not select a first value');
  const duplicateJoint = read(['JOINT ACCOUNT', 'JOINT ACCOUNT', 'FICTIONAL BANK LOAN']).extraction.records[0];
  check.equal(duplicateJoint.facts['account.responsibility'], undefined, 'a repeated JOINT marker is not silently resolved');
  const unread = read(['JOINT ACCOUNT', ...POSITIVE, 'Status history 8'], { unread: true });
  check.deepEqual(unread.extraction.records[0].facts, {}, 'an unread page emits no account, identity or responsibility facts');
  check.deepEqual(unread.extraction.records[0].fact_sources, {}, 'an unread page emits no usable sources');
  check.deepEqual(unread.findings, [], 'unread material produces no violation');
  const blank = read(['FICTIONAL BANK CREDIT CARD', 'Started Settled 01/01/19', 'Balance Credit Limit £0']).extraction.records[0];
  check.equal(blank.printed.Started.state, 'LABEL_PRINTED_WITHOUT_VALUE', 'a following caption is not a Started value');
  check.equal(blank.printed.Balance.state, 'LABEL_PRINTED_WITHOUT_VALUE', 'a following caption is not a Balance value');
  check.deepEqual([blank.facts['liability.closedDate'], blank.facts['account.creditLimit']], ['2019-01-01', 0],
    'blank preceding captions do not consume independent usable fields');

  for (const change of [
    (source) => { source.caption_count = 2; },
    (source) => { source.status = 'EXTRACTION_UNRESOLVED'; },
    (source) => { source.reason = 'UNTRUSTED_SOURCE'; },
    (source) => { source.trusted = false; },
    (source) => { source.location.trusted = false; },
    (source) => { source.normalized_value = '2018-01-01'; },
    (source) => { source.raw_value = null; },
    (source) => { source.location = null; }
  ]) {
    const mutated = read(POSITIVE);
    change(mutated.extraction.records[0].fact_sources['liability.closedDate']);
    const findings = assess(mutated.extraction).findings;
    check.equal(findings.some((issue) => issue.check_id === DATES), false,
      'an authoritative rejected date source cannot fall back to another printed source or legacy issue');
    check.equal(findings.some((issue) => issue.check_id === ZERO_LIMIT), true,
      'a rejected date source preserves the independently supported amount/limit concern');
  }

  const selected = approve(positive, positive.findings.map((issue) => issue.issue_id));
  check.match(selected.body, /Selected issues: 2/, 'the approved packet preserves two distinct concerns on one account');
  check.match(selected.body, /Started: printed "01\/01\/20"/, 'the packet uses the exact Started reading');
  check.match(selected.body, /Settled: printed "01\/01\/19"/, 'the packet uses the exact Settled reading');
  check.match(selected.body, /Credit Limit: printed "£0"/, 'the packet uses the exact numeric caption and raw zero');
  check.match(selected.body, /FICTIONAL BANK CREDIT CARD/, 'the packet retains the source-linked account heading');
  check.match(selected.body, /Request \(verification\)/, 'the concerns support verification without raising confidence');
  record.fact_sources['liability.closedDate'].location.line += 1;
  let stale = null;
  try { packets.packetDownload(selected.store, selected.actor, 'fictional-gb'); } catch (error) { stale = error.code; }
  check.equal(stale, 'PACKET_APPROVAL_STALE', 'a changed decisive source invalidates the reviewed approval');

  /* The captured public PDF proves source mapping only, not a current layout or a forced positive finding. */
  check.ok(fs.existsSync(PUBLIC_PDF), 'the accepted public GB example is present for native-reader proof');
  const sourceSha = crypto.createHash('sha256').update(fs.readFileSync(PUBLIC_PDF)).digest('hex');
  check.equal(sourceSha, PUBLIC_SHA, 'the public native fixture is the accepted pinned capture');
  const real = formats.extractWithSharedAdapter(formats.buildPdfDocumentModel(PUBLIC_PDF), { mode: 'REPORT', country: 'GB' });
  const accounts = real.records.filter((row) => row.kind === 'GB_CREDIT_ACCOUNT');
  check.equal(accounts.length, 5, 'the accepted example still maps five separate credit accounts');
  check.deepEqual(accounts.map((row) => row.facts['account.balance']), [344, 1126, 0, undefined, 695],
    'each actual balance retains its meaning and Satisfied is never coerced to zero');
  check.deepEqual(accounts.map((row) => row.facts['account.type']), ['CURRENT ACCOUNT', 'CREDIT CARD', 'LOAN', 'RENTAL', 'RENTAL'],
    'all physically printed account types are retained without changing their meaning');
  for (const row of accounts) {
    check.equal(sourceForField(row, 'liability.openedDate')?.source_field, 'Started', 'each actual Started caption is sourced');
    check.equal(sourceForField(row, 'account.reported_identity')?.raw_value, row.facts['account.reported_identity'],
      'each actual account keeps its own lender/type heading source');
    check.ok(row.facts['account.paymentHistoryCells'].every((cell) => cell.uncertain && cell.period === null
      && cell.meaning === null && cell.location?.page > 0), 'actual raw history is located and remains undecoded');
  }
  check.equal(sourceForField(accounts[2], 'liability.closedDate')?.source_field, 'Settled', 'actual settlement uses Settled');
  check.equal(accounts[2].printed.Settled.printed_times_in_record, 1,
    'the actual Settled retention paragraph is not a second date caption');
  check.equal(sourceForField(accounts[4], 'account.balance')?.source_field, 'Current Balance', 'actual current balance uses its own caption');
  check.equal(assess(real).findings.length, 0, 'no common-error issue is forced from the benign public account example');
  check.equal(gb.CURRENCY_EVIDENCE.present_day_support_claimed, false, 'historical structural evidence does not become current-format proof');

  /* Fictional, file-backed reports traverse admission, extraction, assessment, selection and approved download. */
  const owner = await service.unpaidAccount('dj-gb@example.test');
  await service.pay(owner, 'monthly');
  for (const region of REGIONS) {
    const ctx = await upload(service, owner, region, POSITIVE);
    check.equal(ctx.receipt.status, 201, `${region}: native fictional report upload succeeds`);
    check.equal(ctx.receipt.json.receipt.format_detection.presentation_id, gb.FAMILY_ID, `${region}: the GB family reads the file`);
    check.equal(ctx.evaluated.status, 201, `${region}: the real evaluation endpoint succeeds`);
    const view = (await service.request('GET', `/api/cases/${ctx.caseId}/packet`, { token: owner.token })).json.view;
    check.equal(view.eligible_issues.length, 2, `${region}: each distinct concern is offered once`);
    check.ok(view.eligible_issues.every((issue) => issue.consumer_label === 'VIOLATION'), `${region}: only VIOLATION is public`);
    await service.request('POST', `/api/cases/${ctx.caseId}/packet/select`, { token: owner.token,
      body: { issue_ids: view.eligible_issues.map((issue) => issue.issue_id) } });
    await service.request('POST', `/api/cases/${ctx.caseId}/packet/correspondence`, { token: owner.token,
      body: { correspondence: { consumer_name: 'Fictional Consumer', contact: 'fictional@example.test' } } });
    const approved = await service.request('POST', `/api/cases/${ctx.caseId}/packet/approve`, { token: owner.token });
    check.equal(approved.status, 200, `${region}: the consumer approves the reviewed packet`);
    const download = await service.request('GET', `/api/cases/${ctx.caseId}/packet-download`, { token: owner.token });
    check.equal(download.status, 200, `${region}: the entitled approved packet downloads`);
    check.match(download.text, /Started: printed "01\/01\/20"/, `${region}: the download carries Started evidence`);
    check.match(download.text, /Settled: printed "01\/01\/19"/, `${region}: the download carries Settled evidence`);
    check.match(download.text, /Credit Limit: printed "£0"/, `${region}: the download carries the actual numeric limit`);
    check.equal(/undefined|value omitted|PROBABLE_VIOLATION|POTENTIAL_VIOLATION/.test(download.text), false,
      `${region}: no missing source text or internal classification leaks into the packet`);
  }
  const benign = await upload(service, owner, 'GB-ENG', ['FICTIONAL BANK CREDIT CARD',
    'Started 01/01/19 Settled 01/01/20', 'Balance £100 Credit Limit £500', 'Status history 32100U']);
  const benignView = (await service.request('GET', `/api/cases/${benign.caseId}/packet`, { token: owner.token })).json.view;
  check.deepEqual(benignView.eligible_issues, [], 'a native benign report with undecoded history offers no invented issue');
  check.equal(crypto.createHash('sha256').update(fs.readFileSync(PUBLIC_PDF)).digest('hex'), sourceSha,
    'the public fixture remains unchanged after testing');
  return { source_artifact: 'PUB-009 accepted historical public native PDF, unchanged',
    test_inputs: 'fictional GB structural models and native PDF reports; no private report',
    fields: expectedSources.map(([field]) => field).concat('account.responsibility', 'account.defaultAmount', 'account.paymentHistoryCells'),
    outcomes: 'sourced contradictory-date and zero-limit violations -> selection -> approval -> entitled packet in all four GB regions',
    remaining_source_dependencies: ['no printed masked account identifier', 'no printed monetary past due',
      'no printed last-payment or first-delinquency date', 'undated status history without an own code legend',
      'present-day GB layout evidence remains unestablished'] };
}

module.exports = { run, id: 'dj-gb-reader-completion',
  title: 'GB Experian own-caption sources, rejected/undated boundaries and approved native-report packets' };
