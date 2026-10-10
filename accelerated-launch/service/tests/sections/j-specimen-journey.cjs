'use strict';
/**
 * j-specimen-journey.cjs — the REAL journey, on the evidenced specimen, when it is present.
 *
 * OWNER-ALL82-001 / B2. The specimen is read from where the register pins it, never from this repository, and
 * it is never copied in. The bytes travel only into this run's private data directory outside the repository,
 * and the deletion assertion at the end proves they are removed again.
 *
 * If the register or the file is absent, the section reports SKIPPED with the exact reason rather than
 * weakening its assertions or inventing a substitute report.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { readPinnedSpecimen } = require('../harness.cjs');

async function uploadAndAdmit(t, check, owner, caseId, specimen) {
  const upload = await t.request('POST', `/api/cases/${caseId}/files`, {
    token: owner.token,
    body: {
      originalFilename: 'my-credit-report.pdf',
      declaredBytes: specimen.bytes.length,
      mimeType: 'application/pdf',
      contentBase64: specimen.bytes.toString('base64')
    }
  });
  check.equal(upload.status, 201, 'the evidenced specimen is accepted by the upload gate');
  check.equal(upload.json.receipt.format_detection.supported, true, 'and recognised as the supported presentation');
  check.equal(upload.json.receipt.format_detection.container, 'PDF');
  check.equal(upload.json.receipt.extraction_summary.presentation_evidence, true, 'a real report supplies presentation evidence');
  check.equal(upload.json.receipt.extraction_summary.reference_date_read, true, 'the report reference date is read');
  check.ok(upload.json.receipt.extraction_summary.accounts_read > 0, 'at least one collection account is read');
  check.equal(t.blobFiles().length, 1, 'exactly one blob is on disk');

  const view = (await t.request('GET', `/api/cases/${caseId}`, { token: owner.token })).json.view;
  const file = view.files[0];
  check.ok(file.recognised_as && !/PR-0/.test(file.recognised_as), 'the consumer sees a display name, not an admission identifier');
  check.ok(!JSON.stringify(file).includes(specimen.sha256), 'the consumer view carries no specimen digest');
  check.ok(!JSON.stringify(file).includes(specimen.path), 'the consumer view carries no specimen path');
  return view;
}

async function evaluateAndInspect(t, check, owner, caseId) {
  const evaluated = await t.request('POST', `/api/cases/${caseId}/evaluate`, { token: owner.token, body: {} });
  check.equal(evaluated.status, 201, 'the case evaluates');
  const result = evaluated.json.result;
  check.ok(result.checks_performed >= 1, 'at least one applicable observation was produced');
  check.ok(result.observations.every((o) => o.is_a_finding === false), 'none of them is a finding');
  check.ok(result.observations.every((o) => ['observation', 'none', 'violation'].includes(o.output_level)), 'each carries its recorded ceiling without becoming a finding');
  check.equal(result.comprehensive_legal_check, false);
  const withEvidence = result.observations.filter((o) => o.evidence && o.evidence.page);
  check.ok(withEvidence.length >= 1, 'at least one observation names the page and line it came from');
  check.ok(withEvidence.every((o) => o.measures_from === 'Last Payment Date'), 'and the field it was measured from');
  return result;
}

async function recordIndependence(t, check, caseId, result) {
  const records = t.service.store.state().files.filter((f) => f.case_id === caseId).pop().extraction.records;
  check.ok(records.length >= 2, 'the specimen yields more than one account record');
  check.equal(new Set(records.map((r) => r.record_index)).size, records.length, 'each account carries its own record index');

  const locations = records.map((r) => `${r.location && r.location.page}:${r.location && r.location.line}`);
  check.equal(new Set(locations).size, locations.length, 'each account is located at its own page and line');

  const readable = records.filter((r) => r.kind === 'COLLECTION_ACCOUNT' && r.status === 'RESOLVED');
  const accountObservations = result.observations.filter((o) => o.account_number_in_report !== null);
  check.equal(accountObservations.length, readable.length, 'one statutory comparison was attempted for every accepted readable collection account');

  const citedPages = accountObservations.map((o) => o.evidence && o.evidence.page);
  check.ok(citedPages.every((p) => Number.isInteger(p)), 'and every comparison cites the page it came from');
  check.equal(new Set(citedPages).size, citedPages.length, 'no two comparisons cite the same page');
  check.ok(
    accountObservations.every((o) => /More than \d+ years|years have not yet passed/.test(o.headline)),
    'each account received its own comparison statement'
  );
}

async function reviewAndDownloadBoundary(t, check, owner, caseId, specimen) {
  const draftBeforeReview = await t.request('GET', `/api/cases/${caseId}/response-draft`, { token: owner.token });
  check.equal(draftBeforeReview.status, 409, 'a draft is refused before review');
  check.equal(draftBeforeReview.json.error.code, 'REVIEW_REQUIRED_BEFORE_DRAFT');

  const reviewed = await t.request('POST', `/api/cases/${caseId}/review`, { token: owner.token, body: {} });
  check.equal(reviewed.status, 200, 'the consumer can record their review');
  check.equal(reviewed.json.case_status, 'REVIEWED', 'and the case status follows it');

  const draft = await t.request('GET', `/api/cases/${caseId}/response-draft`, { token: owner.token });
  check.equal(draft.status, 409, 'a draft is still refused: response drafts are not implemented in this build');
  check.equal(draft.json.error.code, 'RESULT_NOT_ELIGIBLE_FOR_DRAFT');
  check.equal(draft.json.error.detail.recorded_permission, 'response drafts are not implemented in this build; correction packets are a separate entitlement-gated flow');

  const download = await t.request('GET', `/api/cases/${caseId}/demonstration-download`, { token: owner.token });
  check.equal(download.status, 200, 'the download interface itself is exercised');
  check.ok(/NOT A RESPONSE DRAFT/.test(download.text), 'and its content says on its face that it is not a response draft');
  check.ok(/DEMONSTRATION OUTPUT/.test(download.text), 'and that it is demonstration output');
  check.ok(!download.text.includes(specimen.sha256), 'and it carries no report content');
}

async function run(t, check) {
  const specimen = readPinnedSpecimen();
  if (!specimen.available) {
    check.skip('the real specimen journey', specimen.reason);
    return { skipped: true, reason: specimen.reason };
  }

  const owner = await t.account('specimen-owner@example.test');
  const caseId = (await t.request('POST', '/api/cases', { token: owner.token, body: { country: 'CA', region: 'CA-NS' } })).json.case.case_id;

  await uploadAndAdmit(t, check, owner, caseId, specimen);
  const result = await evaluateAndInspect(t, check, owner, caseId);
  await recordIndependence(t, check, caseId, result);
  await reviewAndDownloadBoundary(t, check, owner, caseId, specimen);

  const recorded = await t.request('PATCH', `/api/cases/${caseId}/status`, { token: owner.token, body: { status: 'RESPONSE_RECORDED' } });
  check.equal(recorded.status, 200, 'the consumer can record a response status');
  check.equal(recorded.json.case.status, 'RESPONSE_RECORDED');

  check.ok(!t.logText().includes(specimen.path), 'the specimen path never reaches a log record');
  check.ok(!t.logText().includes(specimen.sha256), 'and neither does its digest');

  const removed = await t.request('DELETE', `/api/cases/${caseId}`, { token: owner.token });
  check.equal(removed.status, 200);
  check.equal(removed.json.blobs_removed, 1, 'deleting the case removes the stored report bytes');
  check.equal(t.blobFiles().length, 0, 'and nothing of the report is left on disk');

  return {
    checked_in: true,
    presentation_id: specimen.presentation_id,
    artifact_id: specimen.artifact_id,
    observations: result.checks_performed
  };
}

module.exports = { run, id: 'j-specimen-journey', title: 'The real journey on the evidenced specimen' };
