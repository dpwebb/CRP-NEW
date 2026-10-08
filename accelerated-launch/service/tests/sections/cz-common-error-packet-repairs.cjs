'use strict';

const formats = require('../../formats.cjs');
const engine = require('../../evaluation.cjs');
const issues = require('../../issues.cjs');
const packets = require('../../packets.cjs');
const results = require('../../results.cjs');
const journey = require('../../journey.cjs');
const clock = require('../../assessment-clock.cjs');
const { packetText, comparableText } = require('../packet-pdf-assertions.cjs');
const { makeSyntheticModel } = require('../../../../internal-validation/ca-ns-last-payment-six-year/document-model.cjs');
const { buildPdf } = require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');

const linesFor = (year) => ['Equifax Consumer Credit Report - FICTIONAL TEST FIXTURE',
  'Report Date: June 12, 2026',
  `Collection Agency ABC Balance $500 Past Due $500 Date of First Delinquency 01 June ${year}`];

function assessed(year, date = '2026-10-07', region = 'US-CA', lines = linesFor(year)) {
  const extraction = formats.extractWithSharedAdapter(makeSyntheticModel({ pages: [lines] }),
    { mode: 'REPORT', country: 'US' });
  const evaluation = engine.evaluateCase({ country: 'US', region, extraction,
    assessment_clock: clock.runStamp(`${date}T12:00:00Z`) });
  return { extraction, evaluation };
}

function packetStore(ctx) {
  const state = { accounts: [{ account_id: 'fictional-owner' }], files: [], cases: [{ case_id: 'fictional-case', account_id: 'fictional-owner' }],
    results: [{ case_id: 'fictional-case', result_id: 'fictional-result', ...ctx }], packets: [] };
  return { state: () => state, update: (fn) => fn(state) };
}

function approve(ctx) {
  const store = packetStore(ctx), actor = { account_id: 'fictional-owner' };
  const eligible = packets.eligibleIssues(store.state().results[0]);
  packets.selectIssues(store, actor, 'fictional-case', eligible.map((i) => i.issue_id));
  packets.setCorrespondence(store, actor, 'fictional-case', {
    consumer_name: 'Fictional Consumer', contact: 'fictional@example.test' });
  packets.approvePacket(store, actor, 'fictional-case');
  return { store, actor, body: packetText(packets.packetDownload(store, actor, 'fictional-case')) };
}

async function run(service, check) {
  const historical = assessed('2010');
  const rows = issues.issuesFor(historical);
  check.equal(rows.length, 1, 'one expired collection produces one consumer issue, including federal and state support');
  const primary = rows[0];
  check.equal(primary.classification, 'VIOLATION', 'the primary classification is the established state rule finding');
  check.equal(primary.confidence, 'DEFINITE', 'the consolidated confidence comes from that actual rule');
  check.equal(primary.eligible, true, 'the admitted state correction permission remains available');
  check.equal(historical.evaluation.results.length, 2, 'both separate statutory assessments remain intact internally');
  check.deepEqual(primary.supported_bases.map((b) => b.classification).sort(),
    ['PROBABLE_VIOLATION', 'VIOLATION'], 'the federal basis keeps its weaker classification');
  check.ok(primary.supported_bases.every((b) => b.citation && b.source_version
    && b.source.raw_value === '01 June 2010' && b.source.location.line === 3),
  'both bases keep their exact citation, source version and decisive report reading');
  const publicPrimary = issues.publicIssue(primary);
  check.equal(publicPrimary.supported_bases.length, 2, 'both bases survive consumer projection');
  check.ok(publicPrimary.supported_bases.every((b) => b.source_facts[0].location.page === 1),
    'each consumer basis keeps its own source location');
  check.equal(issues.issuesFor(assessed('2010', '2026-10-07', 'US-NY'))[0].confidence,
    'PROBABLE', 'the federal-only case is not upgraded by consolidation');
  const permissionLimited = assessed('2010');
  permissionLimited.evaluation.results.find((r) => r.machine.adapter_id === 'US-CA-CCRAA-1785-13-A-5-COLLECTION-7Y')
    .machine.packet_eligible = false;
  const eligibleBasis = issues.issuesFor(permissionLimited)[0];
  check.equal(eligibleBasis.confidence, 'PROBABLE', 'a packet-disabled definite basis does not upgrade the eligible federal basis');
  check.equal(eligibleBasis.request_type, 'VERIFICATION', 'consolidation preserves the eligible basis request permission');
  check.equal(eligibleBasis.supported_bases.some((b) => b.classification === 'VIOLATION' && !b.eligible), true,
    'the nonselectable definite basis is preserved without granting its correction permission');
  const two = assessed('2010', '2026-10-07', 'US-CA', linesFor('2010').concat(
    'Collection Agency DEF Balance $300 Past Due $300 Date of First Delinquency 01 June 2011'));
  check.deepEqual(issues.issuesFor(two).map((i) => i.record_index), [1, 2],
    'equivalent rule bases on different collection records remain distinct issues');

  const historicalPacket = approve(historical);
  const letter = historicalPacket.body.split('EVIDENCE REFERENCES')[0];
  check.equal((letter.match(/^\s*\d+\. /gm) || []).length, 1, 'the approved letter has one request for the underlying concern');
  check.match(historicalPacket.body, /Additional supporting rule: FCRA/,
    'the packet names the federal support without a consumer confidence label');
  check.match(comparableText(historicalPacket.body), /Qualification for this rule:.*exception applies/,
    'the packet preserves the federal exception uncertainty');
  const approval = historicalPacket.store.state().packets[0].approved_version;
  const federal = historical.evaluation.results.find((r) => r.machine.adapter_id === 'FCRA-605A-4-US-NATIONAL-7Y');
  federal.machine.finding.evaluation.exceptions.unresolved_items[0].text += ' (changed material qualification)';
  let staleCode = null;
  try { packets.packetDownload(historicalPacket.store, historicalPacket.actor, 'fictional-case'); }
  catch (error) { staleCode = error.code; }
  check.equal(staleCode, 'PACKET_APPROVAL_STALE', 'changing a secondary basis invalidates the approved download');
  check.equal(historicalPacket.store.state().packets[0].approved_version, approval,
    'the failed download does not invent a new approval');
  const staleView = packets.packetView(historicalPacket.store, historicalPacket.actor, 'fictional-case');
  check.equal(staleView.packet.approval_stale, true, 'the review screen recognizes the changed supporting qualification');
  check.equal(staleView.packet.approved, false, 'the screen enables approval of the changed packet');
  check.equal(staleView.packet.download_available, false, 'the screen withholds the stale download');
  check.match(staleView.packet.correspondence_preview, /changed material qualification/,
    'the new review displays the changed qualification before renewed approval');
  packets.approvePacket(historicalPacket.store, historicalPacket.actor, 'fictional-case');
  check.equal(packets.packetView(historicalPacket.store, historicalPacket.actor, 'fictional-case').packet.approved,
    true, 'renewed approval restores the current packet view');
  check.match(packetText(packets.packetDownload(historicalPacket.store, historicalPacket.actor, 'fictional-case')),
    /changed material qualification/, 'the newly approved download matches the reviewed qualification');

  const review = assessed('2019', '2027-06-13');
  const reviewIssue = issues.issuesFor(review)[0];
  const publicReview = issues.publicIssue(reviewIssue);
  check.equal(publicReview.confidence, 'POTENTIAL', 'later expiry remains a supported potential current-file review');
  check.equal(publicReview.source_facts[0].raw_value, '01 June 2019', 'the source raw value survives projection');
  check.deepEqual([publicReview.source_facts[0].location.page, publicReview.source_facts[0].location.line],
    [1, 3], 'the raw date retains its actual page and line');
  check.equal(publicReview.source_evidence.normalized_value, '2019-06-01',
    'the printed-date evidence stays separate from the shifted retention anchor');
  check.equal(publicReview.evidence.anchor_normalized_value, '2019-11-28', 'the 180-day arithmetic remains unchanged');
  const reviewPacket = approve(review).body;
  check.match(reviewPacket, /Date of first delinquency on the collection entry: printed "01 June 2019" \(page 1, line 3\)/,
    'the packet carries the actual first-delinquency reading');
  check.equal(/undefined|value omitted/.test(reviewPacket), false, 'the packet never fabricates missing evidence from a source-shape mismatch');
  check.match(reviewPacket, /current file/, 'the later-expiry request is conditional on continued reporting');
  const report = journey.assessmentReportBody(results.renderResultSet(review), 'fictional-produced-at');
  check.match(report, /Source: Date of first delinquency on the collection entry — printed "01 June 2019" \(page 1, line 3\)/,
    'the assessment uses the same raw reading and source location');
  check.equal(report.includes(publicReview.uncertainty), true, 'the assessment preserves the complete material uncertainty');
  check.equal(/undefined|value omitted|identified no violation/.test(report), false,
    'the assessment contains supported issues without leaking negative internal comparisons');

  const qualifiedHistorical = assessed('2010');
  qualifiedHistorical.evaluation.results = [];
  const fallback = issues.issuesFor(qualifiedHistorical)[0];
  check.match(fallback.uncertainty, /first delinquency.*7-year/, 'historical verification names its actual anchor and period');
  check.match(fallback.request_wording, /first delinquency.*7-year/, 'the historical request uses the same anchor and period');
  check.equal(/last-payment|six-year/.test(fallback.uncertainty + fallback.request_wording), false,
    'a collection verification never substitutes last payment or six years');

  const rendered = results.renderResultSet(review);
  rendered.common_errors.push({ state: 'POTENTIAL_ISSUE', label: 'UNSELECTABLE INTERNAL SIGNAL',
    detail: 'A benign later adverse date was called re-aging', source_records: [] });
  rendered.observations.push({ headline: 'DUPLICATED INTERNAL COMPARISON', assessment_completed: true });
  check.equal(/UNSELECTABLE|re-aging|DUPLICATED/.test(journey.assessmentReportBody(rendered, 'fictional')), false,
    'downloads use unified issues and do not publish raw internal signals or duplicate comparisons');
  const empty = { ...rendered, issues: [] };
  check.match(journey.assessmentReportBody(empty, 'fictional'), /No findings available\./,
    'an empty unified result does not claim compliance or publish internal signals');

  const dateRecord = { record_index: 1, status: 'RESOLVED', kind: 'COLLECTION_ACCOUNT',
    kind_label: 'collection entry', location: { page: 2, line: 11 },
    source_field: 'Last payment', report_reference_date: { raw_value: 'June 12, 2026',
      normalized_value: '2026-06-12', location: { page: 1, line: 2 } },
    facts: { 'liability.openedDate': '2020-01-01', 'tradeline.firstDelinquencyDate': '2019-01-01' },
    fact_sources: {
      'liability.openedDate': { source_field: 'Opened date', raw_value: 'Jan 1, 2020',
        normalized_value: '2020-01-01', location: { page: 2, line: 5 } },
      'tradeline.firstDelinquencyDate': { source_field: 'First delinquency date', raw_value: 'Jan 1, 2019',
        normalized_value: '2019-01-01', location: { page: 2, line: 7 } }
    } };
  const common = require('../../common-errors.cjs').runCommonErrorChecks({ extraction: { records: [dateRecord] } });
  const dateIssue = issues.publicIssues({ extraction: { records: [dateRecord] }, evaluation: {
    country: 'US', region: 'US-NY', presentation: 'GENERAL-BUREAU-REPORT', results: [], common_errors: common } })[0];
  check.deepEqual([dateIssue.source_location.page, dateIssue.source_location.line], [2, 7],
    'a first-delinquency issue identifies that decisive field instead of a legacy last-payment source');

  const historyExtraction = formats.extractWithSharedAdapter(makeSyntheticModel({ pages: [[
    'Equifax Consumer Credit Report', 'Report Date: June 12, 2026',
    'Creditor A Opened 01/01/2020 Balance $100',
    'Payment History: 2024-01=OK 2024-01=30 Key: OK=Paid as agreed 30=30 days late'
  ]] }), { mode: 'REPORT', country: 'CA' });
  const history = { extraction: historyExtraction,
    evaluation: engine.evaluateCase({ country: 'CA', region: 'CA-NS', extraction: historyExtraction }) };
  const historyIssue = issues.publicIssues(history).find((i) => i.check_kind === 'a payment-history inconsistency');
  check.equal(historyIssue.confidence, 'PROBABLE', 'both inline cells now carry their actual printed source line into the report-data rule');
  check.match(historyIssue.explanation, /"OK" \(Paid as agreed\).*"30" \(30 days late\)/,
    'the unified consumer wording preserves both codes and their report-defined meanings');
  const historyReport = journey.assessmentReportBody(results.renderResultSet(history), 'fictional');
  check.match(historyReport, /"OK" \(Paid as agreed\).*"30" \(30 days late\)/,
    'the assessment retains the supported history readings without raw diagnostics');
  check.match(historyReport, /Source: Payment history 2024-01.*printed "OK" \(page 1, line 4\)/,
    'the assessment identifies the actual inline history source instead of substituting the account heading');
  check.match(approve(history).body, /"OK" \(Paid as agreed\).*"30" \(30 days late\)/,
    'the reviewed and approved packet uses the same supported history readings');

  const accuracyExtraction = formats.extractWithSharedAdapter(makeSyntheticModel({ pages: [[
    'Equifax Consumer Credit Report', 'Report Date: June 12, 2026',
    'Fictional Creditor Opened 01/01/2025 Closed 01/01/2020 Balance $100.00'
  ]] }), { mode: 'REPORT', country: 'CA' });
  const accuracyEvaluation = engine.evaluateCase({ country: 'CA', region: 'CA-ON', extraction: accuracyExtraction });
  const accuracy = issues.publicIssues({ extraction: accuracyExtraction, evaluation: accuracyEvaluation })[0];
  check.equal(accuracy.supported_bases.length, 2, 'one accuracy concern retains both statutory and report-data support');
  check.ok(accuracy.supported_bases.every((b) => b.classification === 'PROBABLE_VIOLATION'),
    'the merged accuracy bases retain their individual probable classifications');
  check.ok(accuracy.supported_bases.every((b) => b.source_facts.length === 2
    && b.source_facts.every((f) => f.raw_value && f.location.page === 1)),
  'the merged consumer bases preserve both decisive date readings');

  await httpJourney(service, check);
  return { historical_concerns: 1, statutory_bases: 2, later_expiry_confidence: 'POTENTIAL',
    per_rule_classes_preserved: true, approved_secondary_evidence_bound: true };
}

async function httpJourney(service, check) {
  const actor = await service.account('cz-packet-repairs@example.test');
  const other = await service.account('cz-other-owner@example.test');
  const caseId = (await service.request('POST', '/api/cases', { token: actor.token,
    body: { country: 'US', region: 'US-CA' } })).json.case.case_id;
  const pdf = buildPdf({ pages: [{ lines: linesFor('2019') }] });
  check.equal((await service.request('POST', `/api/cases/${caseId}/files`, { token: actor.token,
    body: { originalFilename: 'fictional-later-expiry.pdf', declaredBytes: pdf.length,
      mimeType: 'application/pdf', contentBase64: pdf.toString('base64') } })).status, 201,
  'the fictional report uploads through the real route');
  const previous = process.env[clock.CONTROLLED_CLOCK_ENV];
  process.env[clock.CONTROLLED_CLOCK_ENV] = '2027-06-13T12:00:00Z';
  try { await service.request('POST', `/api/cases/${caseId}/evaluate`, { token: actor.token }); }
  finally {
    if (previous === undefined) delete process.env[clock.CONTROLLED_CLOCK_ENV];
    else process.env[clock.CONTROLLED_CLOCK_ENV] = previous;
  }
  const view = (await service.request('GET', `/api/cases/${caseId}/packet`, { token: actor.token })).json.view;
  check.equal(view.eligible_issues.length, 1, 'the served packet selection contains one supported later-expiry concern');
  await service.request('POST', `/api/cases/${caseId}/packet/select`, { token: actor.token,
    body: { issue_ids: [view.eligible_issues[0].issue_id] } });
  await service.request('POST', `/api/cases/${caseId}/packet/correspondence`, { token: actor.token,
    body: { correspondence: { consumer_name: 'Fictional Consumer', contact: 'fictional@example.test' } } });
  check.equal((await service.request('GET', `/api/cases/${caseId}/packet-download`, { token: actor.token })).status,
    409, 'the real route refuses the download before approval');
  check.equal((await service.request('POST', `/api/cases/${caseId}/packet/approve`, { token: actor.token })).status,
    200, 'the owner approves the current evidence and request');
  const download = await service.request('GET', `/api/cases/${caseId}/packet-download`, { token: actor.token });
  check.equal(download.status, 200, 'the subscribed owner downloads the approved packet');
  check.match(download.text, /printed "01 June 2019" \(page 1, line 3\)/,
    'the actual HTTP packet download contains the corrected decisive source');
  check.equal((await service.request('GET', `/api/cases/${caseId}/packet-download`, { token: other.token })).status,
    403, 'a different owner cannot download the corrected packet');
  const assessment = await service.request('GET', `/api/cases/${caseId}/report-download`, { token: actor.token });
  check.equal(assessment.status, 200, 'the entitled assessment download remains available');
  check.match(assessment.text, /Why it merits attention: Check whether this entry is still on your current credit file/,
    'the actual assessment route preserves its material uncertainty');
}

module.exports = { run, id: 'cz-common-error-packet-repairs',
  title: 'Unified issue packets: exact retention sources, equivalent concern consolidation and qualified downloads' };
