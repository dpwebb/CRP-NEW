'use strict';

// Persisted, owned, fictional source-linked facts. Reader admission and paid API
// transport are covered by the EI/reader and BZ sections respectively.
const common = require('../../common-errors.cjs');
const issues = require('../../issues.cjs');
const comparison = require('../../comparison.cjs');
const { COLLECTION_MEMBER_PAIR_BASIS, COLLECTION_PAIR_BASIS } = require('../../duplicate-account-pair.cjs');
const CHECK = 'COMMON-ERROR-DUPLICATE-REPORTING';
const OLD_FILE = 'a'.repeat(32), NEW_FILE = 'c'.repeat(32);
const MEMBER = 'MEMBER-' + 'b'.repeat(24), IDENTITY = 'CREDITOR-' + 'd'.repeat(24);
const OLD_DATE = '2025-06-12', NEW_DATE = '2026-06-12';
const actor = { account_id: 'em-owner' };
const clone = value => JSON.parse(JSON.stringify(value));

function collection(index, slot = index, options = {}) {
  const file = options.file || OLD_FILE, date = options.date || OLD_DATE;
  const facts = { 'account.masked_identifier': '****1234', 'account.reported_identity': IDENTITY,
    'tradeline.firstDelinquencyDate': '2021-02-01', 'tradeline.lastPaymentDate': '2021-02-01',
    'account.balance': [606, 817, 900][slot - 1],
    'collection.assignedDate': ['2024-01-01', '2023-12-01', '2024-02-01'][slot - 1],
    'collection.agency': 'Fictional Collector ' + slot };
  if (options.strong !== false) facts['account.member_reference'] = MEMBER;
  const captions = { 'account.masked_identifier': 'Account Number', 'account.reported_identity': 'Member Name (creditor)',
    'tradeline.firstDelinquencyDate': 'First Delinquency', 'tradeline.lastPaymentDate': 'Last Payment Date',
    'account.balance': 'Balance', 'collection.assignedDate': 'Date Assigned', 'collection.agency': 'Collection agency',
    'account.member_reference': 'Member Number' };
  const fact_sources = Object.fromEntries(Object.entries(facts).map(([field, normalized_value], offset) => [field, {
    raw_value: String(normalized_value), normalized_value, source_field: captions[field], record_index: index,
    caption_count: 1, location: { file_id: file, page: slot, line: offset + 3, trusted: true },
    ...(['account.member_reference', 'account.reported_identity'].includes(field) ? { privacy_redacted: true } : {})
  }]));
  return { record_index: index, kind: 'COLLECTION_ACCOUNT', kind_label: 'collection entry', status: 'RESOLVED',
    location: { file_id: file, page: slot, line: 2, trusted: true }, source_file_id: file,
    source_bureau: options.bureau || 'Equifax', source_report_segment_id: file + ':segment-1',
    source_report_reference_date: date,
    report_reference_date: { raw_value: date, normalized_value: date, status: 'RESOLVED',
      location: { file_id: file, page: 1, line: 1, trusted: true } },
    facts, fact_sources, printed: {} };
}
function laterCollection(index, slot = index, options = {}) {
  return collection(index, slot, { file: NEW_FILE, date: NEW_DATE, ...options });
}
function changeFact(record, field, value) {
  record.facts[field] = value;
  record.fact_sources[field] = { ...(record.fact_sources[field] || { source_field: field,
    location: record.location, caption_count: 1, record_index: record.record_index }),
  raw_value: String(value), normalized_value: value };
}
function removeFact(record, field) { delete record.facts[field]; delete record.fact_sources[field]; }
function row(key, records, options = {}) {
  const date = key === 'old' ? OLD_DATE : NEW_DATE;
  const extraction = { presentation_id: 'GENERAL-BUREAU-REPORT', bureau: options.bureau || 'Equifax',
    reference_date: { raw_value: date, normalized_value: date, status: 'RESOLVED' },
    admission: { admitted: true }, extraction_ran: true, presentation_evidence: true,
    reading_state: { complete: true }, records };
  const evaluation = { country: options.country || 'CA', region: options.region || 'CA-ON',
    presentation: extraction.presentation_id, results: [], common_errors: common.runCommonErrorChecks({ extraction }) };
  return { account_id: actor.account_id, case_id: 'em-case-' + key, result_id: 'em-result-' + key,
    created_at: date + 'T12:00:00.000Z', extraction, evaluation };
}
function stored(before, after) {
  const state = { results: [before, after], cases: [before, after].map(result => ({
    case_id: result.case_id, account_id: result.account_id, country: result.evaluation.country, region: result.evaluation.region })),
  packets: [{ packet_id: 'em-approved-packet', approved: true, approval_hash: 'fictional-approved-hash' }] };
  return { state: () => state };
}
function view(before, after) {
  return comparison.comparisonView(stored(before, after), actor, before.result_id, after.result_id);
}
function duplicateOutcome(before, after) { return view(before, after).outcomes.find(outcome => outcome.category === CHECK); }
function withCourtInformation(result) {
  result.evaluation.limitation_assessment = { performed: [{ record_index: result.extraction.records[0].record_index,
    outcome: 'MAY_BE_OUTSIDE_THE_LIMITATION_PERIOD', jurisdiction: { region_code: 'CA-NS',
      label: 'Nova Scotia', basic_period_years: 2, start_is: 'DISCOVERY', citation: 'Fictional test citation' },
    start_date: { label: 'First Delinquency', iso: '2021-02-01', printed_value: '2021/02/01',
      location: { page: 1, line: 3 } }, period_ends: '2023-02-01', elapsed_years: 5.6,
    assessment_date: '2026-10-08', report_reference_date: NEW_DATE, unknown_conditions: [] }] };
  return result;
}

async function run(t, check) {
  const before = row('old', [collection(1), collection(2)]);
  const ownIssue = issues.issuesFor(before).find(issue => issue.check_id === CHECK);
  check.equal(ownIssue?.evidence.pairing_basis, COLLECTION_MEMBER_PAIR_BASIS,
    'the comparison fixture uses the shared source-bound owner member/account contract');
  const singleton = row('new', [laterCollection(7, 1)]);
  const gone = duplicateOutcome(before, singleton);
  check.equal(gone?.outcome, 'NO_LONGER_OBSERVED', 'two earlier duplicate entries can track one later sourced collection');
  check.equal(gone?.match.state, 'CONFIDENT', 'group tracking uses the own matching member and masked account references');
  check.equal(gone?.earlier.evidence.collection_entry_count, 2, 'the before view retains the two separately sourced entries');
  check.equal(gone?.later.evidence.collection_entry_count, 1, 'the after view shows the single later sourced entry');
  check.match(gone?.uncertainty, /not proof.*corrected or deleted/i, 'no longer observed never claims correction or deletion');
  check.equal(gone?.match.cross_bureau, false, 'collection tracking does not merge different bureaus');
  const safe = JSON.stringify(gone);
  check.equal(safe.includes(MEMBER), false, 'the private member token is absent from comparison output');
  check.equal(safe.includes(IDENTITY), false, 'the private reporting-member identity token is absent from comparison output');
  check.ok(gone?.earlier.source_facts.some(fact => fact.raw_value === 'Member number matched from the report'),
    'the safe member evidence uses its own plain label');
  check.ok(gone?.earlier.source_facts.some(fact => fact.raw_value === 'Reporting member matched from the report'),
    'a printed Member Name is not relabeled as the original creditor');
  check.ok(gone?.earlier.source_facts.some(fact => fact.normalized_value === 606 && /page 1/.test(fact.source_field)),
    'the group exposes its own readable balance and source page');

  const unchanged = row('new', [laterCollection(9, 2), laterCollection(4, 1)]);
  const still = duplicateOutcome(before, unchanged);
  check.equal(still?.outcome, 'STILL_OBSERVED', 'the same duplicate group survives changed report/date/row ordering');
  check.equal(still?.later.evidence.collection_entry_count, 2, 'the later duplicate count is retained');
  const stringBalances = [laterCollection(1), laterCollection(2)];
  stringBalances.forEach(record => changeFact(record, 'account.balance', String(record.facts['account.balance'])));
  check.equal(duplicateOutcome(before, row('new', stringBalances))?.outcome, 'STILL_OBSERVED',
    'equivalent sourced normalized amounts cannot create a change merely from JSON number/string storage');
  const changedRows = [laterCollection(9, 2), laterCollection(4, 1)];
  changeFact(changedRows[0], 'account.balance', 999);
  const changed = duplicateOutcome(before, row('new', changedRows));
  check.equal(changed?.outcome, 'CHANGED', 'a sourced balance change keeps the duplicate observed with changed details');
  check.ok(changed?.earlier.source_facts.some(fact => fact.normalized_value === 817)
    && changed?.later.source_facts.some(fact => fact.normalized_value === 999), 'changed comparisons retain their before and after amounts');

  const triple = row('old', [collection(1, 1), collection(2, 2), collection(3, 3)]);
  const reordered = row('new', [laterCollection(12, 3), laterCollection(5, 1), laterCollection(8, 2)]);
  const tripleView = view(triple, reordered);
  check.equal(tripleView.outcomes.filter(outcome => outcome.category === CHECK).length, 1,
    'three collection entries form one comparison group rather than several index-dependent outcomes');
  check.equal(duplicateOutcome(triple, reordered)?.outcome, 'STILL_OBSERVED', 're-indexing three entries cannot create a false changed outcome');
  const fewer = duplicateOutcome(triple, unchanged);
  check.equal(fewer?.outcome, 'CHANGED', 'three to two entries still shows duplicates with a changed count');
  check.match(fewer?.uncertainty, /still lists duplicate.*does not prove/i, 'a reduced duplicate count is not described as a correction');

  const strongBeforeRows = [collection(1), collection(2)], strongAfterRows = [laterCollection(7, 1)];
  [...strongBeforeRows, ...strongAfterRows].forEach(record =>
    ['account.reported_identity', 'tradeline.firstDelinquencyDate', 'tradeline.lastPaymentDate'].forEach(field => removeFact(record, field)));
  check.equal(duplicateOutcome(row('old', strongBeforeRows), row('new', strongAfterRows))?.outcome, 'NO_LONGER_OBSERVED',
    'the owner strong member/account criterion does not acquire a name or fixed-date gate in comparison');
  const weakBefore = row('old', [collection(1, 1, { strong: false }), collection(2, 2, { strong: false })]);
  check.equal(issues.issuesFor(weakBefore).find(issue => issue.check_id === CHECK)?.evidence.pairing_basis, COLLECTION_PAIR_BASIS,
    'the weak fixture independently satisfies the shared own-name/account/both-fixed-dates contract');
  check.equal(duplicateOutcome(weakBefore, row('new', [laterCollection(8, 1, { strong: false })]))?.outcome, 'NO_LONGER_OBSERVED',
    'the weaker own name and both fixed dates can also track a later singleton');
  check.equal(duplicateOutcome(weakBefore, unchanged)?.outcome, 'STILL_OBSERVED',
    'a later stronger same-reference duplicate group remains comparable to an earlier weak group');

  const partialDetails = [laterCollection(1), laterCollection(2)];
  partialDetails[1].fact_sources['account.balance'].location.trusted = false;
  const partial = duplicateOutcome(before, row('new', partialDetails));
  check.equal(partial?.outcome, 'STILL_OBSERVED', 'an unreadable optional amount does not erase a supported duplicate');
  check.equal(partial?.detail_comparison, 'PARTIAL', 'unreadable optional details are not represented as a complete change comparison');
  check.equal(/same readable details/.test(partial?.uncertainty), false, 'partial detail comparison does not claim all readable details are unchanged');

  for (const [label, amend] of [
    ['different member', records => changeFact(records[0], 'account.member_reference', 'MEMBER-' + 'e'.repeat(24))],
    ['different mask', records => changeFact(records[0], 'account.masked_identifier', '****5678')],
    ['different bureau', records => { records[0].source_bureau = 'TransUnion'; }],
    ['missing member', records => removeFact(records[0], 'account.member_reference')],
    ['missing mask', records => removeFact(records[0], 'account.masked_identifier')],
    ['untrusted member', records => { records[0].fact_sources['account.member_reference'].location.trusted = false; }],
    ['rejected mask', records => { records[0].fact_sources['account.masked_identifier'].reason = 'UNREADABLE'; }],
    ['duplicated member caption', records => { records[0].fact_sources['account.member_reference'].caption_count = 2; }],
    ['borrowed member index', records => { records[0].fact_sources['account.member_reference'].record_index = 1; }],
    ['borrowed member file', records => { records[0].fact_sources['account.member_reference'].location.file_id = OLD_FILE; }],
    ['ordinary account with the same reference', records => { records[0].kind = 'GENERAL_ACCOUNT'; }],
    ['rejected collection context', records => { records[0].kind = 'GENERAL_COLLECTION'; changeFact(records[0], 'collection.entryContext', 'Collection'); records[0].fact_sources['collection.entryContext'].trusted = false; }]
  ]) {
    const records = [laterCollection(7, 1)]; amend(records);
    check.equal(duplicateOutcome(before, row('new', records))?.outcome, 'NOT_COMPARABLE',
      label + ' cannot support a disappeared duplicate');
  }
  for (const field of ['account.reported_identity', 'tradeline.firstDelinquencyDate', 'tradeline.lastPaymentDate']) {
    const records = [laterCollection(7, 1, { strong: false })]; removeFact(records[0], field);
    check.equal(duplicateOutcome(weakBefore, row('new', records))?.outcome, 'NOT_COMPARABLE',
      'the weak alternative cannot track a later entry missing its own ' + field);
  }
  check.equal(duplicateOutcome(before, row('new', [laterCollection(7, 1)], { country: 'US', region: 'US-CA' }))?.outcome,
    'NOT_COMPARABLE', 'collection duplicate tracking does not merge reports from different countries');
  check.equal(duplicateOutcome(before, row('new', []))?.outcome, 'NOT_COMPARABLE',
    'no supported later account is not evidence that the duplicate was removed');
  const unknown = [laterCollection(7, 1), laterCollection(8, 2)]; removeFact(unknown[1], 'account.member_reference');
  check.equal(duplicateOutcome(before, row('new', unknown))?.outcome, 'NOT_COMPARABLE',
    'a second collection with unresolved matching reference cannot be hidden by a later singleton');
  const unrelated = [laterCollection(7, 1), laterCollection(8, 2)]; removeFact(unrelated[1], 'account.member_reference');
  changeFact(unrelated[1], 'account.masked_identifier', '****9876');
  check.equal(duplicateOutcome(before, row('new', unrelated))?.outcome, 'NO_LONGER_OBSERVED',
    'a separately sourced different mask does not prevent tracking the known singleton');

  for (const [label, amend] of [
    ['refused extraction', result => { result.extraction.refusal = { reason: 'FICTIONAL_REFUSAL' }; }],
    ['not admitted extraction', result => { result.extraction.admission.admitted = false; }],
    ['unread extraction', result => { result.extraction.extraction_ran = false; }],
    ['incomplete reading', result => { result.extraction.reading_state.complete = false; }],
    ['known missing page', result => { result.extraction.missing_pages = { likely_missing_pages: [2] }; }],
    ['unread collection page', result => { result.extraction.records[0].page_read_failure = true; }],
    ['unresolved collection continuation', result => { result.extraction.records[0].continuation_candidate = true; }]
  ]) {
    const after = row('new', [laterCollection(7, 1)]); amend(after);
    check.equal(duplicateOutcome(before, after)?.outcome, 'NOT_COMPARABLE', label + ' cannot establish that the duplicate is no longer observed');
  }
  const legacyMetadata = row('new', [laterCollection(7, 1)]); delete legacyMetadata.extraction.reading_state;
  check.equal(duplicateOutcome(before, legacyMetadata)?.outcome, 'NO_LONGER_OBSERVED',
    'supported legacy source readings are not blocked merely for lacking optional completeness metadata');
  const splitFiles = [laterCollection(1), laterCollection(2, 2, { file: 'f'.repeat(32) })];
  check.equal(duplicateOutcome(before, row('new', splitFiles))?.outcome, 'NOT_COMPARABLE',
    'matching short references on separate later files are not collapsed into one duplicate group');
  const splitSegments = [laterCollection(1), laterCollection(2)]; splitSegments[1].source_report_segment_id += ':other';
  check.equal(duplicateOutcome(before, row('new', splitSegments))?.outcome, 'NOT_COMPARABLE',
    'matching short references on separate later segments are not collapsed');
  const otherEarlier = [collection(3, 1, { file: 'f'.repeat(32) }), collection(4, 2, { file: 'f'.repeat(32) })];
  const ambiguousBefore = row('old', [collection(1), collection(2), ...otherEarlier]);
  const ambiguousOutcomes = view(ambiguousBefore, singleton).outcomes.filter(outcome => outcome.category === CHECK);
  check.equal(ambiguousOutcomes.length, 2, 'two independently sourced earlier duplicate groups are retained');
  check.ok(ambiguousOutcomes.every(outcome => outcome.outcome === 'NOT_COMPARABLE'),
    'separate earlier source groups cannot both claim one later singleton');
  const unassessed = row('new', [laterCollection(1), laterCollection(2)]); unassessed.evaluation.common_errors.performed = [];
  check.equal(duplicateOutcome(before, unassessed)?.outcome, 'NOT_COMPARABLE',
    'comparison cannot invent a new later duplicate finding when the persisted assessment lacks it');

  const mixedBefore = withCourtInformation(clone(before)), mixedAfter = withCourtInformation(clone(singleton));
  const mixedStore = stored(mixedBefore, mixedAfter), snapshot = JSON.stringify(mixedStore.state());
  const mixedHistory = comparison.historyView(mixedStore, actor);
  const oldHistory = mixedHistory.assessments.find(assessment => assessment.result_id === mixedBefore.result_id);
  const newHistory = mixedHistory.assessments.find(assessment => assessment.result_id === mixedAfter.result_id);
  check.equal(oldHistory.issue_count, 1, 'history counts the reporting violation separately from court information');
  check.equal(oldHistory.information_count, 1, 'history preserves a separate informational count');
  check.equal(newHistory.issue_count, 0, 'a singleton with court information is not counted as a reporting issue');
  check.equal(newHistory.information_count, 1, 'the later court item remains informational');
  const mixedView = comparison.comparisonView(mixedStore, actor, mixedBefore.result_id, mixedAfter.result_id);
  check.equal(mixedView.summary.total, 1, 'court information does not become a null-category comparison outcome');
  check.equal(mixedView.outcomes[0].category, CHECK, 'the mixed comparison retains only its reporting issue group');
  check.equal(mixedView.summary.no_longer_observed, 1, 'informational court items do not alter reporting outcome totals');
  check.equal(JSON.stringify(mixedStore.state()), snapshot, 'history/comparison leave facts, assessments and approved packets immutable');
  let denied; try { comparison.comparisonView(mixedStore, { account_id: 'em-stranger' }, before.result_id, singleton.result_id); }
  catch (error) { denied = error.code; }
  check.equal(denied, 'NOT_AUTHORIZED', 'collection group comparison retains owned-result authorization');

  return { scope: 'source-validated collection duplicate groups in persisted owned report comparison',
    outcomes: ['STILL_OBSERVED', 'CHANGED', 'NO_LONGER_OBSERVED', 'NOT_COMPARABLE'],
    fictional_only: true, ordinary_identity_matcher: 'unchanged; existing BZ regression reused',
    court_information_excluded_from_issue_counts: true, physical_print_or_mail: false };
}

module.exports = { run, id: 'em-collection-comparison', title: 'Owned collection duplicate groups, honest absence and informational history' };
