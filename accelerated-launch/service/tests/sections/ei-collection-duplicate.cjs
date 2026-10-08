'use strict';

// Source-contract and packet tests. The separate collection-boundary/PR-01
// sections exercise the real readers; these fixtures contain no private report.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const common = require('../../common-errors.cjs');
const rules = require('../../common-error-rule-assessment.cjs');
const issues = require('../../issues.cjs');
const packets = require('../../packets.cjs');
const pairs = require('../../duplicate-account-pair.cjs');
const formats = require('../../formats.cjs');
const journey = require('../../journey.cjs');
const results = require('../../results.cjs');
const caFacts = require('../../ca-consumer-file-facts.cjs');
const { extractFacts } = require('../../../../internal-validation/ca-ns-last-payment-six-year/extraction.cjs');
const fixtures = require('../../../../internal-validation/ca-ns-last-payment-six-year/tests/fixtures.cjs');
const { buildPdf } = require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');
const { packetText, zipEntries, comparableText } = require('../packet-pdf-assertions.cjs');
const CHECK = 'COMMON-ERROR-DUPLICATE-REPORTING';
const FILE = 'a'.repeat(32), MEMBER = 'MEMBER-' + 'b'.repeat(24);
const clone = value => JSON.parse(JSON.stringify(value));

function collection(index, strong = false, kind = 'COLLECTION_ACCOUNT') {
  const facts = { 'account.masked_identifier': '****1234', 'account.reported_identity': 'Fictional Member',
    'tradeline.firstDelinquencyDate': '2021-02-01', 'tradeline.lastPaymentDate': '2021-02-01',
    'account.balance': index === 1 ? 606 : 817, 'collection.assignedDate': index === 1 ? '2024-01-01' : '2023-12-01',
    'collection.agency': 'Fictional Collector ' + index };
  if (strong) facts['account.member_reference'] = MEMBER;
  const captions = { 'account.masked_identifier': 'Account Number', 'account.reported_identity': 'Member Name (creditor)',
    'tradeline.firstDelinquencyDate': 'First Delinquency', 'tradeline.lastPaymentDate': 'Last Payment Date',
    'account.balance': 'Balance', 'collection.assignedDate': 'Date Assigned', 'collection.agency': 'Collection agency',
    'account.member_reference': 'Member Number' };
  const fact_sources = Object.fromEntries(Object.entries(facts).map(([field, normalized_value], offset) => [field, {
    raw_value: String(normalized_value), normalized_value, source_field: captions[field], record_index: index,
    caption_count: 1, location: { file_id: FILE, page: index, line: offset + 3, trusted: true },
    ...(field === 'account.member_reference' ? { privacy_redacted: true } : {})
  }]));
  return { record_index: index, kind, kind_label: 'collection entry', status: 'RESOLVED',
    location: { file_id: FILE, page: index, line: 2, trusted: true }, source_file_id: FILE,
    source_bureau: 'Equifax', source_report_segment_id: FILE + ':segment-1',
    source_report_reference_date: '2026-06-12', facts, fact_sources, printed: {} };
}
function context(records, region = 'CA-ON') {
  const extraction = { presentation_id: 'GENERAL-BUREAU-REPORT', records };
  const evaluation = { country: region.slice(0, 2), region, presentation: extraction.presentation_id,
    results: [], common_errors: common.runCommonErrorChecks({ extraction }) };
  return { extraction, evaluation };
}
function duplicates(ctx) { return issues.issuesFor(ctx).filter(issue => issue.check_id === CHECK); }
function changeFact(record, field, value) {
  record.facts[field] = value;
  record.fact_sources[field] = { ...(record.fact_sources[field] || { source_field: field,
    location: record.location, caption_count: 1, record_index: record.record_index }), raw_value: String(value), normalized_value: value };
}
function removeFact(record, field) { delete record.facts[field]; delete record.fact_sources[field]; }

async function run(t, check) {
  const fixed = context([collection(1), collection(2)]), first = duplicates(fixed)[0];
  check.equal(duplicates(fixed).length, 1, 'two separately sourced collections with fixed matching debt dates yield one issue despite unequal balances/assignment dates');
  check.equal(first?.evidence.pairing_basis, pairs.COLLECTION_PAIR_BASIS, 'the existing-record alternative records its exact source contract');
  check.equal(first?.classification, 'POTENTIAL_VIOLATION', 'collection pairing keeps internal potential confidence');
  check.equal(first?.eligible, true, 'the collection duplicate can be selected');
  check.equal(first && issues.publicIssue(first).consumer_label, 'VIOLATION', 'the consumer sees the sole owner breach term');
  check.deepEqual(first?.source_facts.filter(f => f.field === 'account.balance').map(f => [f.raw_value, f.location.page]),
    [['817', 2], ['606', 1]], 'both unequal balances retain their own source pages');
  check.deepEqual(first?.source_facts.filter(f => f.field === 'collection.assignedDate').map(f => f.raw_value),
    ['2023-12-01', '2024-01-01'], 'different assignment dates stay evidence rather than a duplicate veto');
  check.equal(first?.source_facts.filter(f => f.field === 'collection.agency').length, 2, 'both own collector headings survive assessment replacement of the initial evidence');
  check.match(first?.request_wording, /remove the duplicate collection entry.*confirm the correct balance.*original creditor.*which account this debt came from/,
    'the selected collection request asks for correction, the right amount and the original account');
  check.equal(/original lender and a debt collector|reports from different dates/.test(first?.uncertainty || ''), false,
    'collection uncertainty does not contradict the two-collection same-report evidence');
  check.equal(common.formatCapability(fixed.extraction).all_factual_checks[CHECK].field_ready, true,
    'capability records the fixed-date collection alternative without ordinary opened/closed dates');

  const strongRows = [collection(1, true), collection(2, true)];
  strongRows.forEach(record => ['account.reported_identity', 'tradeline.firstDelinquencyDate', 'tradeline.lastPaymentDate'].forEach(field => removeFact(record, field)));
  const strong = context(strongRows), memberIssue = duplicates(strong)[0];
  check.equal(memberIssue?.evidence.pairing_basis, pairs.COLLECTION_MEMBER_PAIR_BASIS,
    'the explicit owner member/account criterion independently supports the stronger source contract');
  check.equal(memberIssue?.eligible, true, 'missing dates do not block the independently sourced member/account match');
  check.equal(memberIssue && issues.publicIssue(memberIssue).consumer_label, 'VIOLATION', 'member/account duplicate projects the platform breach term');
  check.equal(JSON.stringify(issues.publicIssue(memberIssue)).includes(MEMBER), false, 'the private member equality token never enters public evidence');
  check.ok(issues.publicIssue(memberIssue).source_facts.some(fact => fact.raw_value === 'Member number matched from the report'),
    'public member evidence has its own plain label rather than being called a creditor');
  check.equal(common.formatCapability(strong.extraction).all_factual_checks[CHECK].field_ready, true,
    'capability includes the member/account alternative independently of dates');
  check.equal(common.formatCapability(strong.extraction).checks[CHECK].supported, true,
    'tracked duplicate capability agrees with the runnable member/account alternative without a creditor name');

  const contrary = [collection(1, true), collection(2, true)];
  changeFact(contrary[1], 'tradeline.firstDelinquencyDate', '2022-03-01');
  changeFact(contrary[1], 'tradeline.lastPaymentDate', '2022-04-01');
  check.equal(duplicates(context(contrary)).length, 1, 'the owner member/account criterion does not silently restore a mandatory date gate');
  check.ok(duplicates(context(contrary))[0].source_facts.some(f => f.raw_value === '2022-03-01'),
    'contrary fixed-date evidence remains in the stronger match for bureau review');

  for (const [label, amend, strongOnly] of [
    ['different masked account', rows => changeFact(rows[1], 'account.masked_identifier', '****5678')],
    ['different member', rows => changeFact(rows[1], 'account.member_reference', 'MEMBER-' + 'c'.repeat(24)), true],
    ['missing member reference', rows => removeFact(rows[1], 'account.member_reference'), true],
    ['untrusted member reference', rows => { rows[1].fact_sources['account.member_reference'].location.trusted = false; }, true],
    ['wrong source record', rows => { rows[1].fact_sources['account.masked_identifier'].record_index = 1; }],
    ['reference from another file', rows => { rows[1].fact_sources['account.masked_identifier'].location.file_id = 'wrong'; }],
    ['duplicate mask caption', rows => { rows[1].fact_sources['account.masked_identifier'].caption_count = 2; }],
    ['different fixed delinquency date', rows => changeFact(rows[1], 'tradeline.firstDelinquencyDate', '2022-01-01')],
    ['different fixed payment date', rows => changeFact(rows[1], 'tradeline.lastPaymentDate', '2022-01-01')],
    ['untrusted fixed date', rows => { rows[1].fact_sources['tradeline.lastPaymentDate'].trusted = false; }],
    ['creditor/mask without both fixed dates', rows => removeFact(rows[1], 'tradeline.lastPaymentDate')],
    ['name without account reference', rows => removeFact(rows[1], 'account.masked_identifier')],
    ['same date in a different report segment', rows => { rows[1].source_report_segment_id += '-another'; }],
    ['same date in a different physical upload', rows => {
      rows[1].source_file_id = 'd'.repeat(32); rows[1].source_report_segment_id = rows[0].source_report_segment_id;
      rows[1].location.file_id = rows[1].source_file_id;
      Object.values(rows[1].fact_sources).forEach(source => { source.location.file_id = rows[1].source_file_id; });
    }],
    ['different bureau', rows => { rows[1].source_bureau = 'TransUnion'; }],
    ['different report date', rows => { rows[1].source_report_reference_date = '2026-06-13'; }],
    ['explicit paid zero transfer', rows => { changeFact(rows[0], 'account.status', 'PAID'); changeFact(rows[0], 'account.balance', 0); }]
  ]) {
    const rows = [collection(1, Boolean(strongOnly)), collection(2, Boolean(strongOnly))];
    if (strongOnly) rows.forEach(record => ['tradeline.firstDelinquencyDate', 'tradeline.lastPaymentDate'].forEach(field => removeFact(record, field)));
    amend(rows);
    check.equal(duplicates(context(rows)).length, 0, label + ' cannot produce a source-supported collection duplicate');
  }
  for (const kind of ['GENERAL_ACCOUNT', 'REPORTED_ACCOUNT', 'OVERDUE_ACCOUNT']) {
    const rows = [collection(1, false, kind), collection(2, false, kind)];
    check.equal(duplicates(context(rows)).length, 0, kind + ' is not silently reclassified as a collection by matching dates');
  }
  const generic = [collection(1, false, 'GENERAL_COLLECTION'), collection(2, false, 'GENERAL_COLLECTION')];
  check.equal(duplicates(context(generic)).length, 1, 'the same shared contract supports explicit general collection entries');
  generic[1].location.trusted = false;
  check.equal(duplicates(context(generic)).length, 0, 'untrusted general collection heading cannot establish the entry context');
  const noLegacyStatus = [collection(1), collection(2)]; noLegacyStatus[0].status = 'EXTRACTION_UNRESOLVED';
  check.equal(duplicates(context(noLegacyStatus)).length, 1, 'legacy aggregate status does not suppress independently sourced decisive fields');
  check.equal(duplicates(context(noLegacyStatus))[0]?.classification, 'POTENTIAL_VIOLATION',
    'independent collection sources still receive their rule assessment despite the legacy aggregate status');
  const closed = [collection(1), collection(2)]; changeFact(closed[0], 'account.status', 'CLOSED');
  check.equal(duplicates(context(closed)).length, 1, 'CLOSED alone does not become paid or erase an amount still owed');
  check.ok(duplicates(context(closed))[0].source_facts.some(fact => fact.field === 'account.status' && fact.raw_value === 'CLOSED'),
    'the contrary own lifecycle status remains visible supporting evidence');
  const legacyFence = [collection(1), collection(2)];
  legacyFence.forEach(row => { changeFact(row, 'liability.openedDate', '2020-01-01'); changeFact(row, 'account.amount', 100); });
  legacyFence[1].source_file_id = 'd'.repeat(32);
  check.equal(common.duplicateReporting(legacyFence), null, 'ordinary duplicate fields cannot bypass the collection physical-file fence');
  const triple = [collection(1, true), collection(2, true), collection(3, true)];
  triple.forEach(row => changeFact(row, 'liability.openedDate', '2020-01-01'));
  check.equal(duplicates(context(triple)).length, 2, 'three collection entries produce one concern for each extra entry, without every-pair cards');
  check.equal(common.similarEntriesWorthReviewing(triple), null, 'source-supported duplicates are not also repeated as overlapping similarities');

  const prRows = [606, 817].map((amount, index) => fixtures.recordLines({ dateAssigned: index ? '2023/12/01' : '2024/01/01' })
    .map(line => line === 'Account Number 0000000' ? 'Account Number ****1234'
      : line === 'Amount 1000' ? 'Amount ' + amount : line === 'Balance 1000' ? 'Balance ' + amount : line));
  const model = fixtures.specimen({ records: prRows });
  const prExtraction = formats.normalizeExtraction(extractFacts(model, null, { synthetic_test_input: true }), caFacts.read(model));
  check.equal(duplicates(context(prExtraction.records)).length, 1,
    'existing PR-01 source-normalized collection fields reach the fixed-date branch without a reader reread dependency');
  for (const region of ['CA-MB', 'CA-ON', 'US-NY', 'GB-ENG', 'AU-NSW']) {
    check.equal(duplicates(context(clone(fixed.extraction.records), region))[0]?.rule_assessment.rule_id, CHECK,
      region + ' uses the same checklist rule without a statute prerequisite');
  }

  // A court-time screening result remains information,
  // separate from the collection duplicate and from the reporting period.
  const timingContext = context([collection(1)]);
  timingContext.evaluation.limitation_assessment = { performed: [{ record_index: 1,
    outcome: 'MAY_BE_OUTSIDE_THE_LIMITATION_PERIOD', jurisdiction: { region_code: 'CA-NS',
      label: 'Nova Scotia', basic_period_years: 2, start_is: 'DISCOVERY', citation: 'Fictional test citation' },
    start_date: { label: 'First Delinquency', iso: '2021-02-01', printed_value: '2021/02/01',
      location: { page: 1, line: 3 } }, period_ends: '2023-02-01', elapsed_years: 5.6,
    assessment_date: '2026-10-08', report_reference_date: '2026-06-12',
    unknown_conditions: ['whether a qualifying payment occurred before expiry'] }] };
  const timing = issues.publicIssues(timingContext).find(issue => issue.limitation_concern);
  check.equal(timing?.limitation.screening_deadline, '2023-02-01', 'the consumer court screening date comes from the existing assessment');
  check.ok(timing?.explanation.includes('2021/02/01') && timing.explanation.includes('2 years')
    && timing.explanation.includes('2023-02-01'), 'court information shows the printed date, local years and screening deadline before any selection');
  check.match(timing?.explanation, /original creditor or collector a new court deadline.*reporting period is separate/,
    'court information explains transfer and the separate reporting period plainly');
  check.equal(timing?.consumer_label, 'INFORMATION', 'a timing screening concern alone is INFORMATION rather than VIOLATION');
  check.match(timing?.uncertainty, /Those dates alone do not prove whether someone can still sue/,
    'court information preserves the limit of report-date screening');
  check.equal(timing?.eligible, false, 'court screening information is not a dispute candidate');
  check.equal(timing?.request_type, null, 'court information has no verification request type');
  check.equal(timing?.request_wording, null, 'court information never asks the consumer or bureau to verify a court claim');
  check.ok(timing?.limitation.what_the_report_does_not_show.some(condition => condition.includes('before expiry')),
    'the governing before-expiry condition remains in the assessment evidence');
  check.ok(timing?.source_facts.some(fact => fact.raw_value === '2021/02/01' && fact.location.page === 1),
    'the timing information keeps the printed date and its own source page');
  check.equal(issues.projectConsumerIssue({ ...timing, eligible: true, request_type: 'VERIFICATION',
    request_wording: 'old saved request' }).eligible, false, 'saved court information cannot recover retired packet eligibility');
  const savedTiming = issues.projectConsumerIssue({ ...timing, eligible: true, request_type: 'VERIFICATION',
    request_wording: 'Ask the bureau about a court case, judgment and qualifying payment',
    uncertainty: 'Ask the bureau about any timely court case, judgment or payment.' });
  check.equal(savedTiming.request_wording, null, 'old saved bureau inquiries are removed');
  check.equal(/ask the bureau/i.test(savedTiming.uncertainty), false, 'old saved uncertainty cannot preserve a bureau inquiry');
  const timingSummary = results.summariseAssessment({ issues: [savedTiming] });
  check.equal(timingSummary.distinct_total, 0, 'court information does not inflate reporting issue counts');
  check.equal(timingSummary.information_total, 1, 'court information is counted separately');
  check.equal(timingSummary.teaser, null, 'court information cannot become a reporting issue teaser');

  // Production packet mechanisms receive a fictional stored result and retained
  // bytes; this is source-contract/packet integration, not a reader-admission test.
  const original = buildPdf({ pages: [1, 2].map(index => ({ lines: ['FICTIONAL COLLECTION REPORT COPY',
    'Fictional Collector ' + index, 'Account Number ****1234', 'Member Number FICTIONAL REFERENCE',
    'First Delinquency 2021/02/01', 'Last Payment Date 2021/02/01', 'Balance ' + (index === 1 ? 606 : 817)] })) });
  const packetRows = [collection(1, true), collection(2, true)], packetCtx = context(packetRows), actor = { account_id: 'ei-owner' };
  const state = { accounts: [{ account_id: actor.account_id }], cases: [{ case_id: 'ei-case', account_id: actor.account_id }],
    results: [{ ...packetCtx, case_id: 'ei-case', account_id: actor.account_id, result_id: 'ei-result', file_ids: [FILE] }],
    files: [{ file_id: FILE, case_id: 'ei-case', account_id: actor.account_id, stored_blob: true,
      original_filename: 'fictional-collection-report.pdf', stored_bytes: original.length,
      stored_sha256: crypto.createHash('sha256').update(original).digest('hex') }], packets: [] };
  const store = { state: () => state, update: fn => fn(state), readBlob: id => { if (id !== FILE) throw new Error('not owned'); return original; } };
  const selected = duplicates(packetCtx)[0];
  const assessment = journey.assessmentReportBody({ jurisdiction: { country: 'CA', region: 'CA-ON' },
    presentation_evidence: true, checks_performed: 1, issues: [issues.publicIssue(selected)] }, '2026-10-08T00:00:00.000Z');
  check.ok(/member number matched from the report/i.test(assessment), 'downloaded assessment gives private member references their own plain label');
  check.ok(assessment.includes('606') && assessment.includes('817') && assessment.includes('Fictional Collector 1')
    && assessment.includes('Fictional Collector 2'), 'downloaded assessment keeps both unequal amounts and collection agency headings');
  check.equal(assessment.includes(MEMBER), false, 'downloaded assessment never prints the private member equality token');
  packets.selectIssues(store, actor, 'ei-case', [selected.issue_id]);
  packets.setCorrespondence(store, actor, 'ei-case', { consumer_name: 'Fictional Consumer', contact: 'fictional@example.test' });
  packets.setReportFiles(store, actor, 'ei-case', [FILE]);
  const preview = packets.packetView(store, actor, 'ei-case').packet.correspondence_preview;
  packets.approvePacket(store, actor, 'ei-case');
  const zip = packets.packetDownload(store, actor, 'ei-case'), printed = packets.packetPrint(store, actor, 'ei-case');
  const entries = zipEntries(zip.body), text = packetText(zip);
  check.equal(zip.content_type, 'application/zip', 'selected collection source report yields a real ZIP');
  check.deepEqual(entries.find(entry => entry.name.startsWith('report-'))?.bytes, original, 'the ZIP preserves the exact two-page original report bytes');
  check.deepEqual(entries.find(entry => entry.name === '01-correspondence.pdf')?.bytes, printed.body, 'ZIP and inline print have the same approved actual PDF');
  check.equal(comparableText(text), comparableText(preview), 'the printed correspondence equals the full consumer-reviewed preview');
  check.ok(text.includes('606') && text.includes('817') && text.includes('page 1') && text.includes('page 2'), 'approved PDF states both amounts and their separate evidence pages');
  check.ok(text.includes('Fictional Collector 1') && text.includes('Fictional Collector 2'), 'both collector headings appear in the actual packet');
  check.ok(text.includes('VIOLATION') && text.includes('original creditor') && text.includes('which account this debt came from'), 'actual correspondence retains the owner term and original-account request');
  check.equal(text.includes(MEMBER), false, 'private member token is absent from preview/PDF');
  check.ok(/Member number matched from the report/i.test(text), 'approved actual PDF correctly names the member-number evidence');
  check.equal(/court claim|qualifying payment|judgment/i.test(text), false, 'duplicate packet does not include proactive court inquiries');
  const out = path.resolve(__dirname, '../../out/batch67-collection-pair'); fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'approved-collection-packet.zip'), zip.body);
  fs.writeFileSync(path.join(out, 'approved-collection-correspondence.pdf'), printed.body);
  fs.writeFileSync(path.join(out, 'approved-collection-preview.txt'), preview);
  const originalContext = clone(state.results[0]);
  const originalPacket = clone(state.packets[0]);
  state.results[0].evaluation.limitation_assessment = clone(timingContext.evaluation.limitation_assessment);
  const legacyTiming = issues.publicIssues(state.results[0]).find(issue => issue.limitation_concern);
  state.packets[0].selected_issue_ids = [legacyTiming.issue_id];
  let retiredApproval, retiredDownload;
  try { packets.approvePacket(store, actor, 'ei-case'); } catch (caught) { retiredApproval = caught.code; }
  try { packets.packetDownload(store, actor, 'ei-case'); } catch (caught) { retiredDownload = caught.code; }
  check.equal(retiredApproval, 'PACKET_APPROVAL_STALE', 'an old saved court selection cannot be approved');
  check.equal(retiredDownload, 'PACKET_APPROVAL_STALE', 'an old approved court selection cannot be downloaded');
  state.results[0] = clone(originalContext);
  state.packets[0] = clone(originalPacket);
  for (const [label, amend] of [
    ['mask source removed', rows => { rows[0].fact_sources['account.masked_identifier'] = null; }],
    ['member source removed', rows => { rows[0].fact_sources['account.member_reference'] = null;
      ['tradeline.firstDelinquencyDate', 'tradeline.lastPaymentDate'].forEach(field => removeFact(rows[0], field)); }],
    ['different supporting segment', rows => { rows[0].source_report_segment_id += '-changed'; }]
  ]) {
    state.results[0] = clone(originalContext); amend(state.results[0].extraction.records);
    check.equal(duplicates(state.results[0]).length, 0, label + ' cannot resurrect a persisted detection');
    let error; try { packets.packetDownload(store, actor, 'ei-case'); } catch (caught) { error = caught.code; }
    check.equal(error, 'PACKET_APPROVAL_STALE', label + ' invalidates approved delivery');
  }
  state.results[0] = clone(originalContext);
  state.results[0].extraction.records[0].fact_sources['account.member_reference'].location.line += 1;
  let stale; try { packets.packetDownload(store, actor, 'ei-case'); } catch (caught) { stale = caught.code; }
  check.equal(stale, 'PACKET_APPROVAL_STALE', 'a changed still-matching member source location requires fresh approval');
  return { scope: 'shared collection source contract and actual packet PDF/ZIP; reader admission covered separately',
    owner_member_account_criterion: true, ordinary_matching_preserved: true, original_report_pages: 2,
    packet_proof: path.relative(path.resolve(__dirname, '../../../../'), out), physical_print_or_mail: false };
}

module.exports = { run, id: 'ei-collection-duplicate', title: 'Shared collection duplicate references, fixed-date alternative and packet custody' };
