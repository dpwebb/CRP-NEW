'use strict';
/**
 * m-au-journey.cjs — OWNER-ALL82-001 / B3. The complete consumer journey for the SECOND supported
 * country/format combination, run over the real HTTP surface against the captured public sample.
 *
 * The sample is read from where it already sits inside SOURCE_CAPTURES and posted to a loopback listener. It
 * is not copied into the repository, not written anywhere inside it, and deleted with the case at the end of
 * this section. If it is not on this machine the section reports SKIPPED with the exact reason rather than
 * substituting a synthetic report.
 *
 * Then, because one extraction is the shared extraction for a whole country, the SAME real extraction is
 * evaluated under all eight canonical Australian selections, and each region's own result count is recorded
 * for the launch matrix.
 */

const fs = require('node:fs');
const path = require('node:path');

const evaluation = require('../../evaluation.cjs');
const applicability = require('../../../adapters/applicability-records.json');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const PUB_012 = path.join(ROOT, 'SOURCE_CAPTURES', 'REPORT_FORMAT_BASELINE_2026-09-30', 'PUB-012.pdf');

const AU_REGIONS = applicability.relations
  .find((r) => r.relation_id === 'AU-PRIVACY-ACT-1988-CTH-CREDIT-REPORTING').region_rows
  .map((row) => row.region);

const EXECUTABLE_AU_CHECKS = ['AU-PRIVACY-ACT-1988-S20W-ITEM3-ENQUIRY-5Y', 'AU-PRIVACY-ACT-1988-S20W-ITEM4-DEFAULT-5Y'];

async function uploadSample(t, check, owner, caseId, bytes) {
  const upload = await t.request('POST', `/api/cases/${caseId}/files`, {
    token: owner.token,
    body: {
      originalFilename: 'australian-credit-file.pdf',
      declaredBytes: bytes.length,
      mimeType: 'application/pdf',
      contentBase64: bytes.toString('base64')
    }
  });
  check.equal(upload.status, 201, 'the captured sample is accepted for an Australian selection');
  check.equal(upload.json.receipt.format_detection.supported, true, 'and is recognised as the supported format family');
  check.equal(upload.json.receipt.format_detection.presentation_id, 'FAM-AU-EQX-CONSUMER');
  check.equal(upload.json.receipt.format_detection.read_support_is, 'EVIDENCED_STRUCTURAL_CONTRACT',
    'and the receipt says the admission path was a structural contract, not a pinned digest');
  check.equal(upload.json.receipt.extraction_summary.presentation_evidence, true);
  check.equal(upload.json.receipt.extraction_summary.reference_date_read, true, 'the report reference date is read');
  check.equal(upload.json.receipt.extraction_summary.accounts_read, 9,
    'four enquiries, two overdue accounts and three liability records are read');
  check.equal(upload.json.receipt.extraction_summary.accounts_with_readable_date, 8,
    'and eight carry a readable date: the four enquiries, the two overdue accounts and the two liability records that print an opening date');
  check.equal(upload.json.receipt.extraction_summary.result_status, 'RESOLVED');
  return upload;
}

function inspectConsumerView(check, view, specimenPath, specimenDigest) {
  const file = view.files[view.files.length - 1];
  check.ok(file.recognised_as && !/FAM-/.test(file.recognised_as), 'the consumer sees a display name, not a family identifier');
  check.ok(!file.recognised_as || /Australia/.test(file.recognised_as), 'and that name names the bureau and the country');
  const serialized = JSON.stringify(file);
  check.ok(!serialized.includes(specimenDigest), 'the consumer view carries no sample digest');
  check.ok(!serialized.includes(specimenPath), 'the consumer view carries no sample path');
  return file;
}

async function deepJourney(t, check, specimenPath, specimenDigest, bytes) {
  const owner = await t.account('au-owner@example.test');
  const stranger = await t.account('au-stranger@example.test');
  const opened = await t.request('POST', '/api/cases', { token: owner.token, body: { country: 'AU', region: 'AU-NSW' } });
  check.equal(opened.status, 201);
  const caseId = opened.json.case.case_id;

  await uploadSample(t, check, owner, caseId, bytes);
  check.equal(t.blobFiles().length, 1, 'exactly one blob is on disk');

  const view = (await t.request('GET', `/api/cases/${caseId}`, { token: owner.token })).json.view;
  inspectConsumerView(check, view, specimenPath, specimenDigest);

  const evaluated = await t.request('POST', `/api/cases/${caseId}/evaluate`, { token: owner.token, body: {} });
  check.equal(evaluated.status, 201);
  const result = evaluated.json.result;
  check.equal(result.support, 'ACTUAL_REPORT_EVIDENCE', 'the result is report support, not a demonstration');
  check.equal(result.presentation_evidence, true);
  check.equal(result.checks_performed, 6, 'every recorded limb of both date-anchored kinds produced a comparison');

  const enquiries = result.observations.filter((o) => o.measures_from === 'Enquiry Date');
  const overdues = result.observations.filter((o) => o.measures_from === 'Original Listing > Date');
  check.equal(enquiries.length, 4, 'the enquiry limb ran once per enquiry, on its own date');
  check.equal(overdues.length, 2, 'the default limb ran once per overdue account, on its own original listing date');
  check.equal(enquiries.length + overdues.length, result.observations.length, 'and nothing else ran');

  check.ok(result.observations.every((o) => o.is_a_finding === false), 'no observation is a finding on a not-exceeded sample');
  check.ok(result.observations.every((o) => o.output_level === 'violation'), 'each carries its recorded ceiling (violation-class rule, no breach found here)');
  check.ok(result.observations.every((o) => o.evidence && o.evidence.page && o.evidence.line), 'each names its page and line');
  check.ok(result.observations.every((o) => o.evidence.section), 'and the section it came from');
  check.ok(result.observations.every((o) => o.evidence.printed_value), 'and the value it was printed as');
  check.equal(new Set(result.observations.map((o) => `${o.evidence.page}:${o.evidence.line}`)).size, 6,
    'six observations cite six distinct printed locations');
  check.ok(result.observations.every((o) => !/Date will be Deleted/.test(o.measures_from)),
    "the report's own deletion date is never used as the rule's anchor");
  check.ok(overdues.every((o) => /overdue account/.test(o.headline)), 'an overdue comparison names the kind of entry it came from');
  check.ok(enquiries.every((o) => /enquiry/.test(o.headline)), 'and an enquiry comparison names its kind');
  check.equal(result.checks_unresolved.length, 0, 'nothing was left unresolved on this sample');
  /* The third Australian limb is bound, and on this real sample it resolves to applicability states rather
     than to a comparison: one record prints an explicit status, two print neither. */
  check.equal(result.checks_not_applicable.length, 1,
    'the bound liability limb reports exactly one record as not-applicable');
  check.equal(result.checks_applicability_unresolved.length, 2,
    'and leaves two of its records unresolved, because the sample states nothing about them');
  check.equal(result.checks_applicability_unresolved.length + result.checks_not_applicable.length
    + result.checks_performed, 9,
    'every readable record of every kind is accounted for exactly once');
  check.ok(result.checks_not_applicable.every((c) => c.applicability === 'NOT_APPLICABLE'),
    'and each carries its applicability state, not a comparison outcome');
  check.equal(result.applicability_summary.NOT_APPLICABLE, 1);
  check.equal(result.applicability_summary.APPLICABILITY_UNRESOLVED, 2);
  check.equal(result.comprehensive_legal_check, false);
  check.ok(/They are not findings that a rule was broken/.test(JSON.stringify(result.qualifications)),
  'and the qualifications say in words that a difference we report is not a finding that a rule was broken');

  const draftBefore = await t.request('GET', `/api/cases/${caseId}/response-draft`, { token: owner.token });
  check.equal(draftBefore.status, 409, 'a draft is refused before review');
  const reviewed = await t.request('POST', `/api/cases/${caseId}/review`, { token: owner.token, body: {} });
  check.equal(reviewed.status, 200);
  check.equal(reviewed.json.case_status, 'REVIEWED');
  const draft = await t.request('GET', `/api/cases/${caseId}/response-draft`, { token: owner.token });
  check.equal(draft.status, 409, 'and is still refused after review: no AU adapter is packet eligible');
  const download = await t.request('GET', `/api/cases/${caseId}/demonstration-download`, { token: owner.token });
  check.equal(download.status, 200);
  check.ok(/NOT A RESPONSE DRAFT/.test(download.text));
  check.ok(!download.text.includes(specimenDigest));

  /* Isolation, from a second account, on a case that really holds bytes. */
  check.equal((await t.request('GET', `/api/cases/${caseId}`, { token: stranger.token })).status, 403);
  check.equal((await t.request('POST', `/api/cases/${caseId}/evaluate`, { token: stranger.token, body: {} })).status, 403);
  check.equal((await t.request('DELETE', `/api/cases/${caseId}`, { token: stranger.token })).status, 403);

  check.ok(!t.logText().includes(specimenPath), 'the sample path never reaches a log record');
  check.ok(!t.logText().includes(specimenDigest), 'and neither does its digest');

  const stored = t.service.store.state().files.filter((f) => f.case_id === caseId).pop().extraction;
  const deleted = await t.request('DELETE', `/api/cases/${caseId}`, { token: owner.token });
  check.equal(deleted.json.blobs_removed, 1, 'deleting the case removes the stored report bytes');
  check.equal(t.blobFiles().length, 0, 'and nothing of the report is left on disk');
  check.equal((await t.request('GET', `/api/cases/${caseId}`, { token: owner.token })).status, 404);

  return { extraction: stored, checks: result.checks_performed };
}


/**
 * The same REAL extraction, evaluated under every canonical Australian selection. An association is only
 * real if every region the relation names can actually run the checks, so each one is exercised.
 */
function everyAuRegion(check, extraction) {
  const perRegion = {};
  for (const region of AU_REGIONS) {
    const evaluated = evaluation.evaluateCase({ country: 'AU', region, extraction });
    const performed = evaluated.results.filter((r) => r.machine.state === 'EVALUATED');
    perRegion[region] = {
      checks_performed: performed.length,
      check_ids: [...new Set(evaluated.results.map((r) => r.machine.adapter_id))].sort(),
      anchors: [...new Set(evaluated.results.map((r) => r.machine.anchor.field))].sort(),
      unavailable: evaluated.unavailable_checks.length,
      unresolved: evaluated.unresolved_checks.length
    };
    check.equal(performed.length, 6, `${region}: every recorded limb produces a comparison`);
    check.deepEqual(perRegion[region].check_ids, EXECUTABLE_AU_CHECKS.slice().sort(), `${region}: and exactly the two recorded AU adapters ran`);
    check.deepEqual(perRegion[region].anchors, ['enquiry.date', 'overdue.originalListingDate'], `${region}: each on its own field`);
    check.equal(perRegion[region].unavailable, 0, `${region}: nothing was held back`);
    check.equal(perRegion[region].unresolved, 0, `${region}: and nothing was left unresolved`);
    check.ok(evaluated.results.every((r) => r.machine.packet_eligible === true), `${region}: the demonstrated AU findings are packet eligible`);
  }
  return perRegion;
}

async function run(t, check) {
  if (!fs.existsSync(PUB_012)) {
    check.skip('the Australian consumer journey', 'THE_CAPTURED_PUBLIC_SAMPLE_PUB-012_IS_NOT_PRESENT');
    return { skipped: true, reason: 'THE_CAPTURED_PUBLIC_SAMPLE_PUB-012_IS_NOT_PRESENT' };
  }
  const bytes = fs.readFileSync(PUB_012);
  const digest = require('node:crypto').createHash('sha256').update(bytes).digest('hex');

  const deep = await deepJourney(t, check, PUB_012, digest, bytes);
  const perRegion = everyAuRegion(check, deep.extraction);

  return {
    skipped: false,
    presentation_id: 'FAM-AU-EQX-CONSUMER',
    evidenced_artifact_id: 'PUB-012',
    checks_performed_on_the_sample: deep.checks,
    records_read: deep.extraction.records.length,
    regions: perRegion,
    regions_with_a_working_assessment: AU_REGIONS.slice().sort()
  };
}

module.exports = { run, id: 'm-au-journey', title: 'The complete Australian consumer journey on the captured public sample' };

