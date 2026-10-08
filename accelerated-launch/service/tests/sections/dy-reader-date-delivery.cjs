'use strict';

const fs = require('node:fs');
const path = require('node:path');
const formats = require('../../formats.cjs');
const assembly = require('../../multi-file-assembly.cjs');
const common = require('../../common-errors.cjs');
const evaluationEngine = require('../../evaluation.cjs');
const comparison = require('../../comparison.cjs');
const issues = require('../../issues.cjs');
const { sourceForField, reportReference } = require('../../report-fact-sources.cjs');
const { nativePdf } = require('./dv-au-reference-delivery.cjs');
const { buildWordPdf } = require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');
const DATE_CHECK = 'COMMON-ERROR-LAST-PAYMENT-OR-FIRST-DELINQUENCY-DATE';
const INDEPENDENT = 'COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY';
const clone = (value) => JSON.parse(JSON.stringify(value));
const row = (extraction, id) => ({ file_id: id, stored_sha256: id, extraction });

async function run(t, check) {
  for (const [country, specimen] of [['GB', 'PUB-009'], ['AU', 'PUB-012']]) {
    const file = path.resolve(__dirname, '../../../../SOURCE_CAPTURES/REPORT_FORMAT_BASELINE_2026-09-30', specimen + '.pdf');
    const extraction = formats.extractWithSharedAdapter(formats.buildPdfDocumentModel(file), { mode: 'REPORT', country });
    check.ok(extraction.records.length > 0, country + ' accepted report still reads own records');
    for (const record of extraction.records) {
      const source = sourceForField(record, 'report.referenceDate');
      check.equal(source?.normalized_value, extraction.reference_date.normalized_value, country + ' shared record retains its own cover date');
      check.ok(Number.isFinite(source?.location.x0), country + ' shared date keeps physical geometry');
    }
    const merged = assembly.assemble([row(extraction, country + '-own')]).extraction;
    check.ok(merged.records.every((record) => sourceForField(record, 'report.referenceDate')?.location.file_id === country + '-own'),
      country + ' re-indexing retains own source file on the date');
    const rejected = clone(extraction);
    rejected.reference_date.trusted = false;
    for (const record of rejected.records) record.report_reference_date.trusted = false;
    check.equal(assembly.dateIdentity(row(rejected, 'rejected')), 'DATE_UNRESOLVED', country + ' rejected source cannot group as a dated report');
    const mixed = assembly.assemble([row(rejected, country + '-bad'), row(extraction, country + '-good')]).extraction;
    for (const record of mixed.records) {
      if (record.source_file_id === country + '-bad') {
        check.equal(record.source_report_reference_date, null, country + ' rejected date never borrows adjacent good date');
        check.equal(reportReference(record), null, country + ' rejection remains explicit after assembly');
      } else check.equal(sourceForField(record, 'report.referenceDate')?.location.file_id, country + '-good', country + ' good date remains on its own file');
    }
    check.equal(extraction.reference_date.trusted, true, country + ' assembly never mutates the original trusted reading');
    const foreign = clone(extraction);
    foreign.reference_date.location.file_id = 'foreign-cover';
    foreign.records.forEach((record) => { record.report_reference_date.location.file_id = 'foreign-record'; });
    const foreignRow = row(foreign, country + '-owner');
    check.equal(assembly.dateIdentity(foreignRow), 'DATE_UNRESOLVED', country + ' foreign cover cannot group as an own dated report');
    const rejectedForeign = assembly.assemble([foreignRow]).extraction;
    check.equal(rejectedForeign.reference_date.normalized_value, null, country + ' foreign cover cannot restore a case date');
    check.ok(rejectedForeign.records.every((record) => record.report_reference_date.location.file_id === 'foreign-record'),
      country + ' assembly preserves a conflicting file ID for rejection');
    check.ok(rejectedForeign.records.every((record) => !reportReference(record) && !record.source_report_reference_date),
      country + ' assembly cannot rewrite a foreign reference into accepted own evidence');
  }

  // A physical general-reader control prints both an independent account contradiction and a future payment.
  const futureFile = path.join(t.dataDir, 'dy-fictional-date-control.pdf');
  const futureBytes = buildWordPdf([{ words: [
    'Equifax Consumer Credit Report', 'Report Date: June 12, 2026', 'Account Name: Fictional Cedar',
    'Account Number: XXXX1111', 'Opened Date: January 1, 2025', 'Closed Date: January 1, 2024',
    'Last Payment Date: January 1, 2027', 'Balance: $100'
  ].map((text, index) => ({ text, x: 36, y: 40 + index * 22 })) }]);
  fs.writeFileSync(futureFile, futureBytes);
  const dated = formats.extractWithSharedAdapter(formats.buildPdfDocumentModel(futureFile), { mode: 'REPORT', country: 'US' });
  const matches = (extraction, id) => common.runCommonErrorChecks({ extraction }).performed.find((entry) => entry.check_id === id)?.source_records || [];
  check.equal(matches(dated, DATE_CHECK).length, 1, 'trusted own report date supports the actual future-payment contradiction');
  const unread = clone(dated);
  unread.reference_date.trusted = false;
  check.equal(comparison.reportIdentityOf(unread).report_date, null, 'owned history withholds a rejected date');
  const earlier = { result_id: 'earlier', case_id: 'earlier', account_id: 'date-owner', extraction: dated,
    evaluation: { results: [], common_errors: common.runCommonErrorChecks({ extraction: dated }) } };
  const later = { ...earlier, result_id: 'later', case_id: 'later', extraction: unread };
  const compareState = { results: [earlier, later], cases: [earlier, later].map((entry) => ({ case_id: entry.case_id, account_id: entry.account_id })) };
  const compared = comparison.comparisonView({ state: () => compareState }, { account_id: 'date-owner' }, 'earlier', 'later');
  check.equal(compared.direction_claimed, false, 'owned comparison cannot claim chronology from a rejected report date');
  for (const record of unread.records) {
    record.report_reference_date.trusted = false;
    record.source_report_reference_date = '2026-06-12'; // A deliberately stale scalar cannot resurrect a rejected reading.
  }
  check.equal(matches(unread, DATE_CHECK).length, 0, 'stale scalar cannot create a report-date violation after source rejection');
  check.equal(matches(unread, INDEPENDENT).length, 1, 'independent own opening/closure contradiction survives');
  const datedEvaluation = evaluationEngine.evaluateCase({ country: 'US', region: 'US-NY', extraction: dated });
  check.equal(issues.issuesFor({ extraction: dated, evaluation: datedEvaluation }).filter((issue) => issue.check_id === DATE_CHECK && issue.eligible).length,
    1, 'own physical date supports the pre-mutation eligible finding');
  const missingDate = clone(dated);
  missingDate.records.forEach((record) => { record.report_reference_date = null; });
  check.equal(matches(missingDate, DATE_CHECK).length, 0, 'explicitly absent own date defeats fresh date-based detection');
  check.equal(issues.issuesFor({ extraction: missingDate, evaluation: datedEvaluation }).filter((issue) => issue.check_id === DATE_CHECK && issue.eligible).length,
    0, 'persisted date-based finding cannot survive an explicitly absent own reading');
  check.equal(issues.issuesFor({ extraction: missingDate, evaluation: datedEvaluation }).filter((issue) => issue.check_id === INDEPENDENT && issue.eligible).length,
    1, 'independent sourced account contradiction survives the missing own date');
  const wrongFile = clone(dated.records[0]);
  wrongFile.source_file_id = 'one'; wrongFile.report_reference_date.location.file_id = 'another';
  check.equal(reportReference(wrongFile), null, 'a reference bound to another physical file cannot support the record');
  const snapshotRecords = [clone(unread.records[0]), clone(unread.records[0])];
  snapshotRecords.forEach((record, index) => {
    record.record_index = index + 1; record.source_file_id = 'own-report-' + index;
    record.report_reference_date.location.file_id = record.source_file_id;
    record.facts['account.creditLimit'] = 150;
    record.facts['account.responsibility'] = index ? 'JOINT' : 'INDIVIDUAL';
  });
  const paired = { records: snapshotRecords };
  for (const id of ['COMMON-ERROR-DUPLICATE-REPORTING', 'COMMON-ERROR-RESPONSIBILITY-INCONSISTENCY']) {
    check.equal(matches(paired, id).length, 0, 'separate rejected-date uploads cannot create ' + id);
    const samePhysical = clone(paired);
    samePhysical.records[1].source_file_id = samePhysical.records[0].source_file_id;
    samePhysical.records[1].report_reference_date.location.file_id = samePhysical.records[0].source_file_id;
    check.equal(matches(samePhysical, id).length, 1, 'same physical report retains its independent ' + id);
  }

  // A persisted paired finding must follow both current sources, not a stale detection result.
  const pairOwner = await t.account('dy-paired-source-owner@example.test');
  const pairCreated = await t.request('POST', '/api/cases', { token: pairOwner.token, body: { country: 'US', region: 'US-NY' } });
  const pairCaseId = pairCreated.json.case.case_id, pairEndpoint = '/api/cases/' + pairCaseId;
  for (const responsibility of ['Individual', 'Joint']) {
    const pairBytes = buildWordPdf([{ words: [
      'Equifax Consumer Credit Report', 'Report Date: June 12, 2026', 'Account Name: Fictional Cedar',
      'Account Number: XXXX1111', 'Opened Date: January 1, 2020', 'Balance: $100',
      'Credit Limit: $150', 'Responsibility: ' + responsibility
    ].map((text, index) => ({ text, x: 36, y: 40 + index * 22 })) }]);
    check.equal((await t.request('POST', pairEndpoint + '/files', { token: pairOwner.token, body: {
      originalFilename: 'fictional-pair-' + responsibility + '.pdf', declaredBytes: pairBytes.length,
      mimeType: 'application/pdf', contentBase64: pairBytes.toString('base64')
    } })).status, 201, 'each paired own physical source enters upload');
  }
  check.equal((await t.request('POST', pairEndpoint + '/evaluate', { token: pairOwner.token })).status, 201, 'both own sources reach assessment');
  const pairResult = t.service.store.state().results.find((entry) => entry.case_id === pairCaseId);
  const pairSaved = clone(pairResult.extraction);
  const duplicateId = 'COMMON-ERROR-DUPLICATE-REPORTING';
  const pairIssue = issues.issuesFor(pairResult).find((issue) => issue.check_id === duplicateId && issue.eligible);
  check.ok(pairIssue?.rule_assessment, 'own dated pair has a source-linked rule assessment');
  if (pairIssue) {
    await t.request('POST', pairEndpoint + '/packet/select', { token: pairOwner.token, body: { issue_ids: [pairIssue.issue_id] } });
    await t.request('POST', pairEndpoint + '/packet/correspondence', { token: pairOwner.token, body: {
      correspondence: { consumer_name: 'Fictional Consumer', contact: 'fictional@example.test' }
    } });
    check.equal((await t.request('POST', pairEndpoint + '/packet/approve', { token: pairOwner.token })).status, 200, 'consumer approves the complete paired evidence');
    check.equal((await t.request('GET', pairEndpoint + '/packet-download', { token: pairOwner.token })).status, 200, 'approved paired packet downloads');
    const pairAmend = (fn) => t.service.store.update((state) => {
      const own = state.results.find((entry) => entry.case_id === pairCaseId); own.extraction = clone(pairSaved); fn(own.extraction);
    });
    const supportingIndex = pairIssue.evidence.duplicate_of_record;
    pairAmend((extraction) => { extraction.records.find((record) => record.record_index === supportingIndex).report_reference_date.location.x0 += 1; });
    check.equal((await t.request('GET', pairEndpoint + '/packet-download', { token: pairOwner.token })).status, 409, 'paired supporting date geometry requires renewed approval');
    pairAmend(() => {});
    check.equal((await t.request('GET', pairEndpoint + '/packet-download', { token: pairOwner.token })).status, 200, 'restoring exact paired date evidence restores approval');
    pairAmend((extraction) => { extraction.records.find((record) => record.record_index === supportingIndex).report_reference_date.trusted = false; });
    const stalePair = t.service.store.state().results.find((entry) => entry.case_id === pairCaseId);
    for (const id of [duplicateId, 'COMMON-ERROR-RESPONSIBILITY-INCONSISTENCY']) {
      check.equal(matches(stalePair.extraction, id).length, 0, 'fresh detector rejects the changed pair snapshot for ' + id);
      check.equal(issues.issuesFor(stalePair).filter((issue) => issue.check_id === id && issue.eligible).length, 0,
        'persisted detection cannot resurrect the rejected pair through legacy fallback for ' + id);
    }
    const pairView = (await t.request('GET', pairEndpoint + '/packet', { token: pairOwner.token })).json.view;
    check.equal(pairView.eligible_issues.some((issue) => issue.issue_id === pairIssue.issue_id), false, 'stale paired finding is absent from the actual selector');
    check.equal((await t.request('GET', pairEndpoint + '/packet-download', { token: pairOwner.token })).status, 409, 'stale paired finding cannot download under old approval');
    pairAmend((extraction) => { extraction.records = extraction.records.filter((record) => record.record_index !== supportingIndex); });
    const removed = t.service.store.state().results.find((entry) => entry.case_id === pairCaseId);
    check.equal(issues.issuesFor(removed).some((issue) => issue.check_id === duplicateId && issue.eligible), false, 'missing paired source cannot be revived by stored detection');
  }

  // The exact uploaded native AU file proves source changes invalidate approval for an independent issue.
  const owner = await t.account('dy-date-source-owner@example.test');
  const created = await t.request('POST', '/api/cases', { token: owner.token, body: { country: 'AU', region: 'AU-NSW' } });
  const caseId = created.json.case.case_id, endpoint = '/api/cases/' + caseId;
  const bytes = nativePdf([{}], []);
  check.equal((await t.request('POST', endpoint + '/files', { token: owner.token, body: {
    originalFilename: 'fictional-own-date.pdf', declaredBytes: bytes.length, mimeType: 'application/pdf', contentBase64: bytes.toString('base64')
  } })).status, 201, 'fictional physical source enters the actual upload route');
  check.equal((await t.request('POST', endpoint + '/evaluate', { token: owner.token })).status, 201, 'uploaded source reaches assessment');
  const result = t.service.store.state().results.find((entry) => entry.case_id === caseId);
  const saved = clone(result.extraction);
  const view = (await t.request('GET', endpoint + '/packet', { token: owner.token })).json.view;
  const independent = issues.issuesFor({ extraction: result.extraction, evaluation: result.evaluation })
    .find((issue) => issue.check_id === INDEPENDENT && issue.eligible);
  const selected = view.eligible_issues.find((issue) => issue.issue_id === independent?.issue_id);
  check.ok(selected, 'independent violation reaches the consumer packet selector');
  if (!selected) return { boundary: 'independent selector missing' };
  await t.request('POST', endpoint + '/packet/select', { token: owner.token, body: { issue_ids: [selected.issue_id] } });
  await t.request('POST', endpoint + '/packet/correspondence', { token: owner.token, body: {
    correspondence: { consumer_name: 'Fictional Consumer', contact: 'fictional@example.test' }
  } });
  check.equal((await t.request('POST', endpoint + '/packet/approve', { token: owner.token })).status, 200, 'consumer approves own evidence');
  check.equal((await t.request('GET', endpoint + '/packet-download', { token: owner.token })).status, 200, 'approved independent packet downloads');
  const amend = (fn) => t.service.store.update((state) => {
    const own = state.results.find((entry) => entry.case_id === caseId); own.extraction = clone(saved); fn(own.extraction);
  });
  for (const [label, mutate] of [
    ['cover geometry', (extraction) => { extraction.reference_date.location.x0 += 1; }],
    ['own record date geometry', (extraction) => { extraction.records[0].report_reference_date.location.x0 += 1; }],
    ['cover trust', (extraction) => { extraction.reference_date.trusted = false; }]
  ]) {
    amend(mutate);
    check.equal((await t.request('GET', endpoint + '/packet-download', { token: owner.token })).status, 409,
      label + ' change requires fresh approval even when account facts independently prove the issue');
  }
  amend((extraction) => {
    extraction.reference_date.trusted = false;
    extraction.records.forEach((record) => { record.report_reference_date.trusted = false; });
  });
  const withheld = (await t.request('GET', endpoint + '/packet', { token: owner.token })).json.view;
  check.equal(withheld.report_identity.reference_date, null, 'consumer packet identity withholds the rejected cover date');
  check.ok(withheld.eligible_issues.some((issue) => issue.issue_id === selected.issue_id), 'independent selected violation remains available with date withheld');
  check.equal((await t.request('POST', endpoint + '/packet/approve', { token: owner.token })).status, 200, 'consumer can approve independent evidence with date withheld');
  const final = await t.request('GET', endpoint + '/packet-download', { token: owner.token });
  check.equal(final.status, 200, 'independent approved packet remains usable');
  check.ok(final.text.includes('VIOLATION'), 'consumer terminology remains VIOLATION');
  check.ok(!final.text.includes('reference date 2026-01-04'), 'rejected report date is absent from the selected packet');
  return { scope: 'own family date -> assembly -> checklist -> selected approved packet', boundaries: 'rejected sources cannot resurrect through scalar identities; independent violations survive' };
}

module.exports = { run, id: 'dy-reader-date-delivery', title: 'Own report-date custody through assessment and approved packets' };
