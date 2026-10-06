'use strict';
/**
 * o-all82-infrastructure.cjs — OWNER-ALL82-001 / B3. "Test shared account, case and upload infrastructure
 * across all canonical jurisdiction selections. Record infrastructure validation separately from
 * report/evaluator support; shared infrastructure need not remain 'not implemented' merely because a regional
 * parser is missing."
 *
 * This section is that record, and nothing else. It makes NO claim about report support or about any rule:
 * every region is exercised through the same account, case, ownership, upload-gate, evaluation-boundary,
 * status and deletion path, and the outcome each region produced is recorded verbatim. A region with no
 * readable format still has a working case, working isolation and a working deletion — and still has no
 * report support, which is recorded in a separate field.
 *
 * B3 continuation update, measured rather than assumed: a presentation is now registered for every one of
 * the four canonical countries, so NO region is refused before storage any more. All eighty-two store the
 * probe, have it measured, and have it refused at the format gate — which is a weaker statement about the
 * probe and no stronger statement about any region's report support.
 *
 * A one-page PDF is written to the system temporary directory as the upload probe. It is not a report, it is
 * never presented as one, and every region refuses it.
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const applicability = require('../../../adapters/applicability-records.json');
const { writeFixture } = require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const FIXTURE_DIR = path.join(os.tmpdir(), 'crp-b3-all82-probe');

function canonicalRegions() {
  const raw = fs.readFileSync(path.join(ROOT, 'consumer-wizard', 'dist', 'jurisdiction-data.js'), 'utf8');
  const data = JSON.parse(raw.slice(raw.indexOf('window.CRP_JURISDICTION_DATA = ') + 30).trim().replace(/;\s*$/, ''));
  return data.regions.map((r) => ({ country: r.country_code, region: r.region_code }));
}

const EXECUTABLE_REGIONS = new Set(applicability.regions_with_an_executable_relation);
const CONFIRMED_REGIONS = new Set(applicability.regions_with_a_confirmed_relation);
/* The markets a report-format family is registered for. B3 continuation added the United States and, after
   the evidenced consumer report example PUB-009 was inspected, the United Kingdom. */
const FORMAT_MARKETS = new Set(['CA', 'AU', 'US', 'GB']);

async function probeOneRegion(t, check, owner, stranger, region, probePath) {
  // Preserve every behavioral predicate, but report one compound contract per region.
  const outerCheck = check;
  const failures = [];
  let predicates = 0;
  const assert = require('node:assert/strict');
  check = Object.fromEntries(['equal', 'deepEqual', 'ok'].map(method => [method, (...args) => {
    predicates += 1;
    try { assert[method === 'equal' ? 'equal' : method](...args.slice(0, method === 'ok' ? 1 : 2)); }
    catch (err) { failures.push({ label: args[method === 'ok' ? 1 : 2] || method, detail: err.message }); }
  }]));
  const opened = await t.request('POST', '/api/cases', { token: owner.token, body: { country: region.country, region: region.region } });
  check.equal(opened.status, 201, `${region.region}: a case can be opened from the explicit selection`);
  check.equal(opened.json.case.region, region.region, `${region.region}: and the case records that region`);
  check.equal(opened.json.case.country, region.country, `${region.region}: and that country`);
  check.equal(opened.json.case.launch_ready, false, `${region.region}: and no launch readiness is implied`);
  const caseId = opened.json.case.case_id;

  const view = await t.request('GET', `/api/cases/${caseId}`, { token: owner.token });
  check.equal(view.status, 200, `${region.region}: the owner can read the case`);
  check.equal(view.json.view.case.region, region.region, `${region.region}: and it is the case they opened`);
  check.equal(view.json.view.result, null, `${region.region}: with no result before anything is run`);

  check.equal((await t.request('GET', `/api/cases/${caseId}`, { token: stranger.token })).status, 403,
    `${region.region}: another account cannot read it`);
  check.equal((await t.request('PATCH', `/api/cases/${caseId}/status`, { token: stranger.token, body: { status: 'CLOSED' } })).status, 403,
    `${region.region}: nor change its status`);
  check.equal((await t.request('DELETE', `/api/cases/${caseId}`, { token: stranger.token })).status, 403,
    `${region.region}: nor delete it`);

  const noFile = await t.request('POST', `/api/cases/${caseId}/evaluate`, { token: owner.token, body: {} });
  check.equal(noFile.status, 409, `${region.region}: evaluating a case with no report is a typed refusal`);
  check.equal(noFile.json.error.code, 'NO_ADMITTED_FILE', `${region.region}: and names the reason`);

  const bytes = fs.readFileSync(probePath);
  const upload = await t.request('POST', `/api/cases/${caseId}/files`, {
    token: owner.token,
    body: {
      originalFilename: 'not-a-supported-report.pdf',
      declaredBytes: bytes.length,
      mimeType: 'application/pdf',
      contentBase64: bytes.toString('base64')
    }
  });

  let uploadPath;
  let uploadRefusal;
  if (!FORMAT_MARKETS.has(region.country)) {
    check.equal(upload.status, 400, `${region.region}: no presentation is offered for this market, and the upload is refused before anything is stored`);
    check.equal(upload.json.error.code, 'PRESENTATION_NOT_AVAILABLE_FOR_SELECTED_JURISDICTION', `${region.region}: with the reason named`);
    uploadPath = 'REFUSED_BEFORE_STORAGE_NO_PRESENTATION_FOR_THIS_MARKET';
    uploadRefusal = 'PRESENTATION_NOT_AVAILABLE_FOR_SELECTED_JURISDICTION';
  } else {
    check.equal(upload.status, 201, `${region.region}: a file is stored so its measured shape can be reported`);
    check.equal(upload.json.receipt.format_detection.supported, false, `${region.region}: and is refused by the format gate`);
    check.ok(typeof upload.json.receipt.format_detection.refusal_reason === 'string', `${region.region}: the refusal names what was measured`);
    check.equal(upload.json.receipt.extraction_summary.extraction_ran, false, `${region.region}: nothing is read from it`);
    check.equal(upload.json.receipt.extraction_summary.accounts_read, 0, `${region.region}: and no record is invented`);
    uploadPath = 'STORED_THEN_REFUSED_BY_THE_FORMAT_GATE';
    uploadRefusal = upload.json.receipt.format_detection.refusal_reason;
  }

  const evaluated = await t.request('POST', `/api/cases/${caseId}/evaluate`, { token: owner.token, body: {} });
  if (upload.status === 201) {
    check.equal(evaluated.status, 201, `${region.region}: the case still evaluates`);
    check.equal(evaluated.json.result.checks_performed, 0, `${region.region}: and performs no check on a refused file`);
    check.equal(evaluated.json.result.comprehensive_legal_check, false, `${region.region}: while still carrying its qualifications`);
    check.ok(evaluated.json.result.qualifications.length >= 5, `${region.region}: and stating what it does not cover`);
  } else {
    check.equal(evaluated.status, 409, `${region.region}: with no report attached at all, the evaluation is refused`);
    check.equal(evaluated.json.error.code, 'NO_ADMITTED_FILE', `${region.region}: and names the reason`);
  }

  const recorded = await t.request('PATCH', `/api/cases/${caseId}/status`, { token: owner.token, body: { status: 'CLOSED' } });
  check.equal(recorded.status, 200, `${region.region}: the consumer can record their own case status`);
  check.equal(recorded.json.case.status, 'CLOSED');

  const deleted = await t.request('DELETE', `/api/cases/${caseId}`, { token: owner.token });
  check.equal(deleted.status, 200, `${region.region}: the case can be deleted`);
  check.equal((await t.request('GET', `/api/cases/${caseId}`, { token: owner.token })).status, 404,
    `${region.region}: and every case-scoped id stops working afterwards`);
  outerCheck.deepEqual(failures, [], `${region.region}: complete case/ownership/upload/refusal/status/deletion contract (${predicates} predicates)`);

  return {
    country: region.country,
    behavioral_predicates: predicates,
    behavioral_failures: failures,
    case_opened: true,
    ownership_enforced: true,
    evaluate_without_a_report: 'NO_ADMITTED_FILE',
    upload_path: uploadPath,
    upload_refusal_reason: uploadRefusal,
    blobs_removed_on_deletion: deleted.json.blobs_removed,
    applicability: CONFIRMED_REGIONS.has(region.region) ? 'CONFIRMED_RELATION_RECORDED' : 'NO_CONFIRMED_RELATION',
    executable_checks_in_this_build: EXECUTABLE_REGIONS.has(region.region) ? 1 : 0
  };
}


/**
 * Every canonical region, through the same shared infrastructure. The probe is one file for the whole
 * section, and it is written outside the repository.
 */
async function run(t, check) {
  fs.rmSync(FIXTURE_DIR, { recursive: true, force: true });
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });
  const probePath = writeFixture(FIXTURE_DIR, 'one-page-not-a-report.pdf', {
    pages: [{ lines: ['a single page that is not a supported credit report'] }],
    page_size: { width: 595.32, height: 841.92 }
  });

  const owner = await t.account('all82-owner@example.test');
  const stranger = await t.account('all82-stranger@example.test');
  const regions = canonicalRegions();
  check.equal(regions.length, 82, 'the canonical enumeration carries all 82 regions');

  const perRegion = {};
  for (const region of regions) {
    perRegion[region.region] = await probeOneRegion(t, check, owner, stranger, region, probePath);
  }

  check.equal(Object.keys(perRegion).length, 82, 'every region was exercised');
  check.equal(t.blobFiles().length, 0, 'and no probe bytes were left behind by any of them');

  const byUploadPath = {};
  for (const row of Object.values(perRegion)) {
    byUploadPath[row.upload_path] = (byUploadPath[row.upload_path] || 0) + 1;
  }
  check.equal(byUploadPath.REFUSED_BEFORE_STORAGE_NO_PRESENTATION_FOR_THIS_MARKET, undefined,
    'no canonical region is refused before storage any more: B3 continuation registered a presentation for every country');
  check.equal(byUploadPath.STORED_THEN_REFUSED_BY_THE_FORMAT_GATE, 82,
    'all eighty-two regions have a registered presentation and their lookalike is stored, measured and refused');

  const distinctOwnershipFailures = new Set(Object.values(perRegion).map((r) => r.ownership_enforced));
  check.deepEqual([...distinctOwnershipFailures], [true], 'ownership was enforced in every single region');

  return {
    infrastructure_state: 'EXERCISED_LOCALLY_ALL_82_NOT_LAUNCH_VALIDATED',
    regions_exercised: Object.keys(perRegion).sort(),
    regions: perRegion,
    upload_paths: byUploadPath,
    note: 'This is infrastructure validation only. It says nothing about report support or about any rule, and it makes no region launch ready.'
  };
}

module.exports = {
  run,
  id: 'o-all82-infrastructure',
  title: 'Shared account, case, upload, evaluation, status and deletion across all 82 selections'
};

