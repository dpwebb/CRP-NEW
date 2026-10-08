'use strict';
const { packetText } = require('../packet-pdf-assertions.cjs');
const fs = require('node:fs');
const path = require('node:path');
const formats = require('../../formats.cjs');
const assembly = require('../../multi-file-assembly.cjs');
const engine = require('../../evaluation.cjs');
const issues = require('../../issues.cjs');
const reaging = require('../../reaging.cjs');
const packets = require('../../packets.cjs');
const journey = require('../../journey.cjs');
const results = require('../../results.cjs');
const { makeSyntheticModel } = require('../../../../internal-validation/ca-ns-last-payment-six-year/document-model.cjs');
const { buildPdf } = require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');
const clone = (value) => JSON.parse(JSON.stringify(value));
const CHECK = reaging.CHECK_ID;

function lines(anchor = '2020', report = '2026', status = 'Charged Off', bureau = 'Equifax') {
  return [`${bureau} Consumer Credit Report - FICTIONAL TEST FIXTURE`, `Report Date: June 12, ${report}`,
    'Creditor A Balance $100', 'Account Number ****1234', `Status: ${status}`,
    'Opened 01/01/2010', `First Delinquency Date 01/01/${anchor}`, 'Last Payment Date 01/01/2017'];
}
function extracted(id, content, country = 'US') {
  const extraction = formats.extractWithSharedAdapter(makeSyntheticModel({ pages: [content] }), { mode: 'REPORT', country });
  return assembly.assemble([{ file_id: id, stored_sha256: id, extraction }]).extraction;
}
function context(current, earlier, country = 'US', region = 'US-NY') {
  return { extraction: current, evaluation: engine.evaluateCase({ country, region, extraction: current,
    prior_reports: earlier ? [{ result_id: 'fictional-earlier-result', extraction: earlier }] : [] }) };
}
const violations = (ctx) => issues.issuesFor(ctx).filter((issue) => issue.check_id === CHECK);
function packetStore(ctx) {
  const state = { cases: [{ case_id: 'fictional-case', account_id: 'fictional-owner' }],
    results: [{ case_id: 'fictional-case', result_id: 'fictional-result', ...ctx }], packets: [] };
  return { state: () => state, update: (fn) => fn(state) };
}
function approved(ctx) {
  const store = packetStore(ctx), actor = { account_id: 'fictional-owner' };
  packets.selectIssues(store, actor, 'fictional-case', [violations(ctx)[0].issue_id]);
  packets.setCorrespondence(store, actor, 'fictional-case', { consumer_name: 'Fictional Consumer', contact: 'fictional@example.test' });
  packets.approvePacket(store, actor, 'fictional-case');
  return { store, actor, body: packetText(packets.packetDownload(store, actor, 'fictional-case')) };
}
function regions() {
  const text = fs.readFileSync(path.resolve(__dirname, '../../../../consumer-wizard/dist/jurisdiction-data.js'), 'utf8');
  return JSON.parse(text.slice(text.indexOf('window.CRP_JURISDICTION_DATA = ') + 30).trim().replace(/;\s*$/, '')).regions;
}
async function run(service, check) {
  const current = extracted('fictional-current-file', lines());
  const earlier = extracted('fictional-earlier-file', lines('2018', '2025'));
  check.equal(current.records[0].facts['tradeline.firstDelinquencyDate'], '2020-01-01', 'a multiline delinquency date survives the opened-date kind change');
  check.equal(current.records[0].facts['tradeline.lastPaymentDate'], '2017-01-01', 'the following last-payment continuation also remains mapped');
  check.equal(current.records[0].printed['tradeline.firstDelinquencyDate'].location.line, 7, 'the continuation keeps its exact own line');
  const ctx = context(current, earlier), issue = violations(ctx)[0];
  check.equal(violations(ctx).length, 1, 'one same-account anchor change produces one checklist issue');
  check.equal(issue.classification, 'POTENTIAL_VIOLATION', 'corrected-date/new-episode uncertainty keeps internal potential confidence');
  check.equal(issues.publicIssue(issue).consumer_label, 'VIOLATION', 'the consumer uses the sole breach term');
  check.equal(issue.eligible, true, 'the supported verification packet is selectable');
  check.match(issue.uncertainty, /earlier date was corrected.*separate delinquency episode/, 'the remaining uncertainty is stated specifically');
  check.deepEqual(issue.source_facts.filter((fact) => fact.field === 'tradeline.firstDelinquencyDate')
    .map((fact) => [fact.raw_value, fact.normalized_value, fact.location.line, fact.source_file_id, fact.report_reference_date]),
  [['01/01/2018', '2018-01-01', 7, 'fictional-earlier-file', '2025-06-12'],
    ['01/01/2020', '2020-01-01', 7, 'fictional-current-file', '2026-06-12']], 'both readings preserve separate report provenance despite identical page/line');
  const packet = approved(ctx);
  check.equal((packet.body.split('EVIDENCE REFERENCES')[0].match(/^\s*\d+\. /gm) || []).length, 1, 'one chosen violation creates one request');
  check.match(packet.body, /Earlier report 2025-06-12:.*printed "01\/01\/2018"/, 'the packet names the earlier raw anchor and report');
  check.match(packet.body, /Current report 2026-06-12:.*printed "01\/01\/2020"/, 'the packet names the current raw anchor and report');
  check.match(packet.body, /reporting period has not been restarted/, 'the request asks for anchor verification and correction of an unsupported restart');
  check.equal(/probable violation|potential violation|undefined/i.test(packet.body), false, 'consumer packet wording contains no obsolete verdict or invented source');
  check.match(journey.assessmentReportBody(results.renderResultSet(ctx), 'fictional'), /Earlier report 2025-06-12/, 'assessment downloads retain the same earlier source');
  const bound = JSON.parse(packets.issueContent(issue));
  check.equal(bound.source_facts.filter((fact) => fact.role === 'earlier_report').every((fact) => fact.source_result_id === 'fictional-earlier-result'), true, 'approval material binds the complete earlier snapshot identity');

  const controls = [
    ['unchanged anchor', extracted('same', lines('2018'))],
    ['backward correction', extracted('back', lines('2016'))],
    ['same report date', extracted('same-date', lines('2020', '2025'))],
    ['earlier report date', extracted('older', lines('2020', '2024'))],
    ['different bureau', extracted('other-bureau', lines('2020', '2026', 'Charged Off', 'TransUnion'))],
    ['printed cured status', extracted('cured', lines('2020', '2026', 'Current'))],
    ['printed transfer', extracted('transfer', lines('2020', '2026', 'Transferred'))],
    ['different obligation opening', extracted('new-opening', lines().map((line) => line.replace('01/01/2010', '01/01/2011')))],
    ['ordinary later adverse date alone', extracted('later-adverse', lines().filter((line) => !line.startsWith('First Delinquency')).concat('30 Days Past Due As Of January 2021'))]
  ];
  for (const [label, extraction] of controls) check.equal(violations(context(extraction, earlier)).length, 0, `${label} does not become re-aging`);
  check.equal(violations(context(current, null)).length, 0, 'one report alone cannot establish a changed anchor');
  const monthOpening = extracted('month-opening', lines().map((line) => line.replace('Opened 01/01/2010', 'Opened January 2010')));
  check.equal(violations(context(monthOpening, earlier)).length, 1, 'compatible opening month/day evidence does not add an unnecessary certainty gate');
  for (const rejectedDate of [{ status: 'EXTRACTION_UNRESOLVED' }, { location: { page: 1, line: 2, trusted: false } }]) {
    const futureContext = context(extracted('future-with-rejected-date', lines('2027')), null);
    Object.assign(futureContext.extraction.records[0].report_reference_date, rejectedDate);
    check.equal(issues.issuesFor(futureContext).some((item) => item.reason === 'DATE_AFTER_REPORT_ISSUED'), false,
      'an explicitly rejected report date cannot survive as an eligible unsourced future-date request');
  }
  const duplicate = extracted('duplicate-with-alternative', lines().filter((line) => !line.startsWith('First Delinquency'))
    .concat('Credit Limit $500', ...lines().slice(2).filter((line) => !line.startsWith('First Delinquency')), 'Credit Limit $500'));
  for (const record of duplicate.records) record.fact_sources = { 'account.amount': {
    raw_value: '$100', normalized_value: 100, location: record.location, caption_count: 2, trusted: false } };
  const duplicateIssue = issues.issuesFor(context(duplicate, null)).find((item) => item.check_id === 'COMMON-ERROR-DUPLICATE-REPORTING');
  check.equal(duplicateIssue?.classification, 'POTENTIAL_VIOLATION', 'a rejected amount does not suppress an independently sourced matching credit-limit duplicate');
  check.equal(duplicateIssue?.source_facts.some((fact) => fact.field === 'account.creditLimit'), true, 'the rule uses the usable alternative third fact');
  const monthPrior = extracted('month-prior', lines('2018', '2025').map((line) => line.replace('June 12,', 'June')));
  const monthCurrent = extracted('month-current', lines().map((line) => line.replace('June 12,', 'June')));
  const monthPair = context(monthCurrent, monthPrior);
  check.equal(violations(monthPair).length, 1, 'nonoverlapping report months establish order without inventing a day');
  check.equal(violations(monthPair)[0].evidence.earlier_report_date, '2025-06', 'the earlier report month keeps month precision');
  check.match(approved(monthPair).body, /Earlier report 2025-06:.*printed "June 2025"/, 'the packet preserves the actual printed report month');
  check.equal(violations(context(monthCurrent, extracted('overlap-month', lines('2018', '2026')))).length, 0,
    'overlapping report-month/day intervals do not establish report order');
  const curedLines = lines().concat('Payment History: 2019-06=OK Key: OK=Paid as agreed');
  const sourcedCure = extracted('sourced-cure', curedLines);
  check.equal(sourcedCure.records[0].facts['account.paymentHistoryCells'][0].location.line, 9,
    'the actual inline payment-history cell keeps its source line');
  check.equal(violations(context(sourcedCure, earlier)).length, 0, 'a report-defined cured month between the anchors defeats the same-episode inference');
  for (const period of ['2017-06', '2025-06']) {
    check.equal(violations(context(extracted(`outside-cure-${period}`, lines().concat(`Payment History: ${period}=OK Key: OK=Paid as agreed`)), earlier)).length, 1,
      'a paid month outside the changed-anchor interval cannot explain a new episode between the anchors');
  }
  const historyCurrent = extracted('history-current', lines('2020', '2026', 'Closed').concat('Payment History: 2021-06=R9 Key: R9=Bad debt'));
  const historyPrior = extracted('history-prior', lines('2018', '2025', 'Closed').concat('Payment History: 2021-06=R9 Key: R9=Bad debt'));
  const historyContext = context(historyCurrent, historyPrior), historyPacket = approved(historyContext);
  check.match(historyPacket.body, /R9=Bad debt/, 'the decisive adverse history and report-defined meaning reach the packet');
  check.match(historyPacket.body, /Payment history 2021-06/, 'the decisive history period is identified');
  const historyRow = historyCurrent.records[0].facts['account.paymentHistoryCells'][0];
  historyRow.location.line += 1;
  let historyStale = null;
  try { packets.packetDownload(historyPacket.store, historyPacket.actor, 'fictional-case'); }
  catch (error) { historyStale = error.code; }
  check.ok(/STALE|INVALID_FINDING_SELECTION/.test(historyStale || ''), 'changing a decisive adverse history source invalidates approved download');
  for (const [label, mutateCurrent, mutatePrior] of [
    ['current identity collision', (ext) => ext.records.push(clone(ext.records[0])), () => {}],
    ['earlier identity collision', () => {}, (ext) => ext.records.push(clone(ext.records[0]))],
    ['unreadable earlier identity collision', () => {}, (ext) => {
      const twin = clone(ext.records[0]); delete twin.report_reference_date; ext.records.push(twin); }],
    ['one-sided identifier', (ext) => delete ext.records[0].facts['account.reported_identity'], () => {}],
    ['unreadable anchor', (ext) => { for (const p of Object.values(ext.records[0].printed)) if (p.normalized === '2020-01-01') p.location.trusted = false; }, () => {}],
    ['unresolved report date', (ext) => { ext.records[0].report_reference_date.status = 'UNRESOLVED'; }, () => {}],
    ['explicit reopening', (ext) => { ext.records[0].printed.Reopened = { raw: '01/01/2019', location: { page: 1, line: 9 } }; }, () => {}],
    ['month precision overlap', (ext) => { ext.records[0].facts['tradeline.firstDelinquencyDatePrecision'] = 'MONTH'; }, (ext) => {
      ext.records[0].facts['tradeline.firstDelinquencyDate'] = '2020-01-25';
      for (const p of Object.values(ext.records[0].printed)) if (p.normalized === '2018-01-01') p.normalized = '2020-01-25'; }],
    ['report-defined cure between anchors', (ext) => { ext.records[0].facts['account.paymentHistoryCells'] = [
      { period: '2019-06', raw_period: 'Jun 2019', code: '1', meaning: 'Pays as agreed', location: { page: 1, line: 9 } }]; }, () => {}]
  ]) {
    const a = clone(current), b = clone(earlier); mutateCurrent(a); mutatePrior(b);
    check.equal(violations(context(a, b)).length, 0, `${label} prevents an unsupported changed-anchor issue`);
  }
  const repeated = context(current, earlier);
  repeated.evaluation = engine.evaluateCase({ country: 'US', region: 'US-NY', extraction: current,
    prior_reports: [{ result_id: 'fictional-earlier-result', extraction: earlier },
      { result_id: 'fictional-later-baseline', extraction: extracted('prior-stable', lines('2020', '2025')) }] });
  check.equal(violations(repeated).length, 1, 'multiple earlier snapshots do not duplicate one changed-anchor violation');
  check.equal(violations(repeated)[0].evidence.earlier_anchor, '2018-01-01', 'a subsequent unchanged date does not erase the earlier fixed anchor');
  const resetSnapshot = extracted('reset-middle', lines('2018', '2025', 'Paid'));
  resetSnapshot.records[0].report_reference_date.normalized_value = '2025-12-01';
  resetSnapshot.records[0].report_reference_date.normalized = '2025-12-01';
  repeated.evaluation = engine.evaluateCase({ country: 'US', region: 'US-NY', extraction: current,
    prior_reports: [{ result_id: 'earlier', extraction: earlier }, { result_id: 'reset', extraction: resetSnapshot }] });
  check.equal(violations(repeated).length, 0, 'an intervening known cure/reset prevents carrying an older episode forward');

  check.equal(regions().length, 82, 'all promised jurisdictions remain in the loop');
  for (const region of regions()) {
    const regional = context(current, earlier, region.country_code, region.region_code);
    const rows = violations(regional);
    check.equal(rows.length, 1, `${region.region_code}: sourced anchor change works without a statute gate`);
    check.equal(issues.publicIssue(rows[0]).consumer_label, 'VIOLATION', `${region.region_code}: consistent consumer terminology`);
    check.match(approved(regional).body, /Earlier report 2025-06-12/, `${region.region_code}: the selected packet carries both snapshots`);
  }
  const previous = JSON.stringify(earlier);
  earlier.records[0].facts['tradeline.firstDelinquencyDate'] = '1901-01-01';
  check.equal(violations(ctx)[0].evidence.earlier_anchor, '2018-01-01', 'the assessed historical source is a frozen copy, not a later live read');
  Object.assign(earlier, JSON.parse(previous));
  for (const reading of Object.values(packet.store.state().results[0].evaluation.reaging_baselines[0].extraction.records[0].printed)) {
    if (reading.normalized === '2018-01-01') reading.raw = 'changed decisive source';
  }
  let stale = null;
  try { packets.packetDownload(packet.store, packet.actor, 'fictional-case'); } catch (error) { stale = error.code; }
  check.ok(/STALE|INVALID_FINDING_SELECTION/.test(stale || ''), 'changing a frozen decisive source invalidates approved packet access');

  const owner = await service.account('reaging-owner@example.test');
  const other = await service.account('reaging-other@example.test');
  async function uploadAndAssess(actor, content, input = {}) {
    const caseId = (await service.request('POST', '/api/cases', { token: actor.token, body: { country: 'US', region: 'US-NY' } })).json.case.case_id;
    const bytes = buildPdf({ pages: [{ lines: content }] });
    check.equal((await service.request('POST', `/api/cases/${caseId}/files`, { token: actor.token, body: {
      originalFilename: 'fictional.pdf', declaredBytes: bytes.length, mimeType: 'application/pdf', contentBase64: bytes.toString('base64') } })).status, 201, 'the fictional native report uploads');
    const response = await service.request('POST', `/api/cases/${caseId}/evaluate`, { token: actor.token, body: input });
    check.equal(response.status, 201, 'the owned report is assessed');
    return { caseId, response };
  }
  await uploadAndAssess(other, lines('2012', '2025'));
  const oldReport = await uploadAndAssess(owner, lines('2018', '2025'));
  const snapshot = await service.request('GET', `/api/cases/${oldReport.caseId}/results/${oldReport.response.json.result_id}`, { token: owner.token });
  check.equal(snapshot.status, 200, 'the earlier persisted result is actually readable');
  check.equal(snapshot.json.result.issues.length, 0, 'the earlier account need not already have an issue to support a later anchor-change assessment');
  const now = await uploadAndAssess(owner, lines(), { prior_reports: [{ result_id: 'forged', extraction: extracted('forged', lines('2011', '2025')) }] });
  const positive = now.response.json.result.issues.find((row) => row.check_kind === issue.label);
  check.equal(positive?.consumer_label, 'VIOLATION', 'the real assessment discovers the changed anchor even when the earlier assessment had no issue');
  check.deepEqual([positive?.evidence.earlier_anchor, positive?.evidence.current_anchor], ['2018-01-01', '2020-01-01'], 'other-account history and client-supplied baselines are excluded');
  await service.request('POST', `/api/cases/${now.caseId}/packet/select`, { token: owner.token, body: { issue_ids: [positive.issue_id] } });
  await service.request('POST', `/api/cases/${now.caseId}/packet/correspondence`, { token: owner.token, body: { correspondence: { consumer_name: 'Fictional Consumer', contact: 'fictional@example.test' } } });
  await service.preparePostalPacket(owner, now.caseId);
  check.equal((await service.request('POST', `/api/cases/${now.caseId}/packet/approve`, { token: owner.token })).status, 200, 'the consumer approves the current verification packet');
  const download = await service.request('GET', `/api/cases/${now.caseId}/packet-download`, { token: owner.token });
  check.equal(download.status, 200, 'the approved packet downloads through the real service');
  check.match(download.text, /Earlier report 2025-06-12/, 'the HTTP packet retains the earlier own report');
  check.equal((await service.request('GET', `/api/cases/${now.caseId}/packet-download`, { token: other.token })).status, 403, 'another account cannot download the paired evidence');
  const after = await service.request('GET', `/api/cases/${oldReport.caseId}/results/${oldReport.response.json.result_id}`, { token: owner.token });
  check.deepEqual(after.json, snapshot.json, 'new assessment and packet creation preserve the previous result and its clock');
  return { mapping: 'owned chronological same-bureau fixed-anchor change', jurisdictions: 82,
    packet: 'one source-linked verification request with frozen earlier/current evidence', deployment: 'NOT_PERFORMED' };
}
module.exports = { run, id: 'dg-owned-reaging', title: 'Owned report anchor changes reach one VIOLATION and approved packet' };
