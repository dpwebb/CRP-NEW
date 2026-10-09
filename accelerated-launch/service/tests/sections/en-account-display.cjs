'use strict';

// Display/source-contract tests use fictional retained records and a bounded reader stub.
// Real reader admission and actual generated packet bytes are exercised by EK, DQ and EI.
const crypto = require('node:crypto');
const display = require('../../account-display.cjs');
const formats = require('../../formats.cjs');
const common = require('../../common-errors.cjs');
const issues = require('../../issues.cjs');
const results = require('../../results.cjs');
const journey = require('../../journey.cjs');
const packets = require('../../packets.cjs');
const clone = value => JSON.parse(JSON.stringify(value));
const FILE = 'c'.repeat(32);
const names = ['Fictional Agency Alpha', 'Fictional Agency Beta'];

function record(index) {
  const facts = { 'account.reported_identity': 'CREDITOR-' + 'd'.repeat(24),
    'account.masked_identifier': '***4567', 'tradeline.firstDelinquencyDate': '2021-02-01',
    'tradeline.lastPaymentDate': '2021-02-01', 'account.balance': index === 1 ? 606 : 817,
    'account.display_name': names[index - 1], 'collection.agency': names[index - 1] };
  const fact_sources = Object.fromEntries(Object.entries(facts).map(([field, value], offset) => [field, {
    raw_value: value, normalized_value: value, record_index: index, caption_count: 1,
    source_field: field === 'account.reported_identity' ? 'Member Name (reporting member)' : field,
    location: { page: 16, line: index * 20 + offset, trusted: true },
    ...(field === 'account.reported_identity' ? { privacy_redacted: true } : {})
  }]));
  return { record_index: index, kind: 'COLLECTION_ACCOUNT', kind_label: 'collection entry',
    status: 'RESOLVED', location: { page: 16, line: index * 20 }, facts, fact_sources,
    source_file_id: FILE, source_bureau: 'Equifax', source_report_segment_id: FILE + ':segment-1',
    source_report_reference_date: '2026-06-12' };
}

async function run(t, check) {
  const fresh = { presentation_id: 'PR-01', admission: { admitted: true }, admitted: true,
    presentation_evidence: true, extraction_ran: true, bureau: 'Equifax', records: [record(1), record(2)] };
  const ctx = { extraction: fresh, evaluation: { country: 'CA', region: 'CA-NS', results: [],
    unavailable_checks: [], unresolved_checks: [], eligibility: { reason: 'CORRECTION_PACKET_ONLY' },
    common_errors: common.runCommonErrorChecks({ extraction: fresh }) } };
  const pair = issues.issuesFor(ctx).find(issue => issue.check_id === 'COMMON-ERROR-DUPLICATE-REPORTING');
  check.ok(pair, 'a source-bound fictional collection duplicate is assessed');
  check.equal(pair.account_identity.name, names.join(' / '), 'the account label names both different agencies');
  check.ok(names.every(name => pair.explanation.includes(name)), 'the explanation names both own collection entries');
  check.deepEqual(pair.account_identity.entries.map(entry => entry.location.line), [26, 46], 'each name keeps its own heading source');
  const summary = results.summariseAssessment({ issues: [issues.publicIssue(pair)] });
  check.ok(names.every(name => !JSON.stringify(summary.teaser).includes(name)), 'both agency names remain hidden in the free teaser');
  check.ok(!JSON.stringify(issues.publicIssue(pair)).includes('CREDITOR-'), 'private name-matching tokens never reach the public issue');
  for (const missingIndex of [1, 2]) {
    const partial = clone(fresh);
    const missing = partial.records.find(row => row.record_index === missingIndex);
    for (const field of ['collection.agency', 'account.display_name']) {
      delete missing.facts[field]; delete missing.fact_sources[field];
    }
    const partialIssue = issues.issuesFor({ ...ctx, extraction: partial }).find(issue => issue.check_id === 'COMMON-ERROR-DUPLICATE-REPORTING');
    const primary = partial.records.find(row => row.record_index === partialIssue.record_index);
    check.equal(partialIssue.record.account_name, display.identityFor(primary)?.name || null, 'a partial pair never assigns the other agency to its primary record');
    check.equal(partialIssue.account_identity.entries.length, 1, 'a partial pair retains its one named entry with its own provenance');
    check.equal(partialIssue.account_identity.entries[0].record_index, missingIndex === 1 ? 2 : 1, 'the remaining agency keeps its own record association');
    check.ok(partialIssue.account_identity.name.includes('collection entry ' + missingIndex), 'the group label locates the unnamed entry without borrowing its partner name');
    check.ok(partialIssue.explanation.includes('collection entry ' + missingIndex), 'the explanation locates each partial-name entry honestly');
    const projected = issues.publicIssue(partialIssue);
    check.equal(projected.account_identity.location, null, 'a partial group does not pretend the paired name source belongs to the primary record');
  }
  const short = clone(fresh);
  for (const row of short.records) for (const field of ['collection.agency', 'account.display_name']) {
    row.facts[field] = row.record_index === 1 ? 'BT' : 'O2';
    Object.assign(row.fact_sources[field], { raw_value: row.facts[field], normalized_value: row.facts[field] });
  }
  const shortPair = issues.publicIssues({ ...ctx, extraction: short }).find(issue => issue.account_identity?.entries);
  const shortTeaser = results.summariseAssessment({ issues: [shortPair] }).teaser;
  check.ok(!/\b(?:BT|O2)\b/.test(JSON.stringify(shortTeaser)), 'short business names are hidden without changing unrelated words in the free teaser');

  for (const [reason, change] of [
    ['borrowed record', row => { row.fact_sources['collection.agency'].record_index = 99; row.fact_sources['account.display_name'].record_index = 99; }],
    ['foreign file', row => { row.source_file_id = FILE; for (const field of ['collection.agency', 'account.display_name']) row.fact_sources[field].location.file_id = 'f'.repeat(32); }],
    ['untrusted heading', row => { for (const field of ['collection.agency', 'account.display_name']) row.fact_sources[field].trusted = false; }],
    ['ambiguous heading', row => { for (const field of ['collection.agency', 'account.display_name']) row.fact_sources[field].caption_count = 2; }],
    ['private name only', row => { for (const field of ['collection.agency', 'account.display_name']) { delete row.facts[field]; delete row.fact_sources[field]; } }]
  ]) {
    const row = record(1); change(row);
    check.equal(display.identityFor(row), null, reason + ' cannot supply a consumer label');
  }
  const independent = record(1); independent.fact_sources['account.display_name'].trusted = false;
  check.equal(display.identityFor(independent).name, names[0], 'an independent trusted agency source remains usable');

  const owner = await t.account('en-account-label@example.test');
  const caseId = (await t.request('POST', '/api/cases', { token: owner.token, body: { country: 'CA', region: 'CA-NS' } })).json.case.case_id;
  const bytes = Buffer.from('%PDF-fictional retained original for source-contract tests');
  t.service.store.putBlob(FILE, bytes);
  const old = clone(fresh);
  for (const row of old.records) for (const field of ['account.display_name', 'collection.agency']) {
    delete row.facts[field]; delete row.fact_sources[field];
  }
  const evaluation = { ...ctx.evaluation, common_errors: common.runCommonErrorChecks({ extraction: old }) };
  const rendered = results.renderResultSet({ extraction: old, evaluation });
  for (const issue of rendered.issues) {
    issue.account_identity = { name: 'Account entry ' + issue.account_number_in_report };
    delete issue.preview_category;
  }
  t.service.store.update(state => {
    state.files.push({ file_id: FILE, account_id: owner.account_id, case_id: caseId,
      presentation_id: 'PR-01', supported_format: true, stored_bytes: bytes.length,
      stored_sha256: crypto.createHash('sha256').update(bytes).digest('hex'), extraction: clone(old) });
    state.results.push({ result_id: 'en-old-result', case_id: caseId, account_id: owner.account_id,
      file_ids: [FILE], created_at: '2026-10-07T12:00:00.000Z', extraction: old, evaluation, rendered });
  });
  const build = formats.buildPdfDocumentModel, extract = formats.extractWithSharedAdapter;
  let reads = 0;
  formats.buildPdfDocumentModel = () => { reads++; return {}; };
  formats.extractWithSharedAdapter = () => clone(fresh);
  try {
    const fingerprint = () => crypto.createHash('sha256').update(JSON.stringify({ files: t.service.store.state().files,
      results: t.service.store.state().results })).digest('hex');
    const before = fingerprint();
    const view = (await t.request('GET', `/api/cases/${caseId}`, { token: owner.token })).json.view;
    const visible = view.result.issues.find(issue => issue.account_identity?.entries);
    check.equal(visible.account_identity.name, names.join(' / '), 'an already-uploaded report gets the agency label on normal read');
    check.ok(names.every(name => visible.explanation.includes(name)), 'saved display wording uses the same source-bound names');
    check.equal(visible.preview_category, 'DUPLICATE_REPORTING', 'an exact saved issue recovers its assessed preview category');
    check.equal(view.assessment_summary.teaser.severity, 'DUPLICATE_REPORTING', 'the historical summary uses the recovered category');
    check.equal(fingerprint(), before, 'reading labels leaves all historical stored bytes, facts and results unchanged');
    check.equal(reads, 1, 'the verified original is read once for both account display names');
    const saved = (await t.request('GET', `/api/cases/${caseId}/results/en-old-result`, { token: owner.token }));
    check.equal(saved.status, 200, 'the explicit historical result remains readable');
    const assessment = require('../packet-pdf-assertions.cjs').pdfText(journey.assessmentReport(t.service.store, owner, caseId).body);
    check.ok(names.every(name => assessment.includes(name)), 'the assessment download uses both printed agency names');
    check.ok(!/Account entry \d|CREDITOR-|MEMBER-/.test(assessment), 'the repaired assessment hides generic labels and matching keys');
    const packet = packets.packetView(t.service.store, owner, caseId);
    check.ok(packet.eligible_issues.some(issue => issue.account_identity?.name === names.join(' / ')), 'packet selection uses the same recovered agency names');
    const ownRow = t.service.store.state().results.find(row => row.result_id === 'en-old-result');
    const ownFile = t.service.store.state().files.find(row => row.file_id === FILE);
    for (const [reason, change] of [
      ['wrong original hash', row => { row.stored_sha256 = '0'.repeat(64); }],
      ['wrong byte length', row => { row.stored_bytes++; }],
      ['another account', row => { row.account_id = 'foreign-owner'; }],
      ['another case', row => { row.case_id = 'foreign-case'; }]
    ]) {
      const file = clone(ownFile); change(file);
      const state = { files: [file] };
      const store = { state: () => state, readBlob: () => bytes, blobPath: () => 'fictional-retained-path' };
      check.equal(display.resultRow(store, ownRow).extraction, ownRow.extraction, reason + ' cannot enrich an owned result');
    }
    const changed = clone(ownRow); changed.extraction.records[0].location.line++;
    check.equal(display.resultRow(t.service.store, changed).extraction.records[0].facts['account.display_name'], undefined, 'a different physical record boundary cannot borrow a name');
    const untrusted = clone(ownRow); untrusted.extraction.records[0].location.trusted = false;
    check.equal(display.resultRow(t.service.store, untrusted).extraction.records[0].facts['account.display_name'], undefined, 'an untrusted association boundary cannot borrow a name');
    const rejected = clone(ownRow); rejected.extraction.records[0].fact_sources['account.display_name'] = {
      trusted: false, normalized_value: null, reason: 'REJECTED_SOURCE' };
    check.equal(display.resultRow(t.service.store, rejected).extraction.records[0].facts['account.display_name'], undefined, 'historical recovery cannot overwrite an explicit rejected display reading');
    const rerun = await t.request('POST', `/api/cases/${caseId}/evaluate`, { token: owner.token, body: {} });
    check.equal(rerun.status, 201, 'normal re-check reuses the saved report without re-upload');
    check.equal(t.service.store.state().files.length, 1, 'the repair adds no upload or replacement file');
    check.equal(t.service.store.state().results.filter(row => row.case_id === caseId).length, 2, 're-check retains the earlier result and adds one assessment');
  } finally { formats.buildPdfDocumentModel = build; formats.extractWithSharedAdapter = extract; }
  return { source_contract: 'fictional owned original and reader stub; admission is independently covered',
    private_matching_preserved: true, historical_results_unchanged: true };
}

module.exports = { run, id: 'en-account-display', title: 'Printed business account labels, historical display recovery and private matching' };
