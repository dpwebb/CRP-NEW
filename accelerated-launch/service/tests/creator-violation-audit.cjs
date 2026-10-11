'use strict';

/* Private, per-report blind comparison. The oracle is opened only after CRP has
 * extracted, evaluated and snapshotted the report. No report text is logged. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const formats = require('../formats.cjs');
const evaluation = require('../evaluation.cjs');
const issues = require('../issues.cjs');
const { CHECKLIST_STATUTORY_SUPPORT } = require('../common-error-scope.cjs');

function audit(reportPath, country, region, oraclePath, outputDir) {
  if (!['US', 'CA', 'GB', 'AU'].includes(country) || !region.startsWith(country + '-'))
    throw new Error('Country and region must name one supported country and its own jurisdiction.');
  const bytes = fs.readFileSync(reportPath);
  const digest = crypto.createHash('sha256').update(bytes).digest('hex');
  const extraction = formats.extractWithSharedAdapter(formats.buildPdfDocumentModel(reportPath),
    { mode: 'REPORT', country });
  const assessed = evaluation.evaluateCase({ country, region, extraction });
  const detected = issues.issuesFor({ evaluation: assessed, extraction }).filter((issue) => issue.eligible)
    .map((issue) => ({ check_id: issue.check_id ||
        (issue.basis_type === 'STATUTORY_RETENTION' && CHECKLIST_STATUTORY_SUPPORT[issue.adapter_id]
          ? 'COMMON-ERROR-REPORTING-PERIOD-EXCEEDED' : null) ||
        issue.supported_bases?.find((basis) => basis.check_id)?.check_id || null,
      primary_check_id: issue.check_id || null,
      merged_factual_basis: !issue.check_id && Boolean(issue.supported_bases?.some((basis) => basis.check_id)),
      record_index: issue.record_index,
      classification: issue.classification || null, confidence: issue.confidence || null,
      source_fields: issue.basis_type === 'STATUTORY_RETENTION'
        ? [issue.anchor_field, 'report.referenceDate'].flat().filter(Boolean)
        : (issue.source_facts || []).map((fact) => fact.field),
      source_locations: (issue.basis_type === 'STATUTORY_RETENTION'
        ? [issue.source?.location, extraction.reference_date?.location]
        : (issue.source_facts || []).map((fact) => fact.location))
        .filter(Boolean).map((location) => ({ page: location.page || null, line: location.line || null })) }));
  // The report and detection have been processed before the Creator's answer key is read.
  const oracle = JSON.parse(fs.readFileSync(oraclePath, 'utf8'));
  if (!Array.isArray(oracle.seeds)) throw new Error('Creator oracle must contain a seeds array.');
  const seeds = oracle.seeds.map((seed) => {
    const matches = detected.filter((item) => item.check_id === seed.check_id
      && (seed.record_index == null || item.record_index === seed.record_index));
    if (!['DETECT', 'ABSENT', 'REVIEW_REQUIRED'].includes(seed.expectation))
      throw new Error(`Invalid expectation for seed ${seed.seed_id}.`);
    const outcome = seed.expectation === 'REVIEW_REQUIRED' ? 'SEED_REVIEW_REQUIRED'
      : seed.expectation === 'DETECT' ? matches.length ? 'PASS' : 'FAIL_MISSED'
        : matches.length ? 'FAIL_UNEXPECTED' : 'PASS';
    return { seed_id: seed.seed_id, check_id: seed.check_id, record_index: seed.record_index ?? null,
      expectation: seed.expectation, outcome,
      matched_count: matches.length, matched_detections: matches, adjudication: seed.adjudication || null,
      first_blocking_layer: seed.first_blocking_layer || null, fix: seed.fix || null,
      repair_history: seed.repair_history || null };
  });
  const additional = detected.filter((item) => !seeds.some((seed) => seed.check_id === item.check_id
    && (seed.record_index == null || seed.record_index === item.record_index)));
  const log = { version: 1, mode: 'PRIVATE_ENGINE_LOCAL', report_name: path.basename(reportPath),
    report_sha256: digest, country, region, presentation: extraction.presentation_id || null,
    records_read: extraction.records?.length || 0, seeds, additional_detections: additional,
    detected_count: detected.length, created_at: new Date().toISOString(),
    boundary: 'Synthetic inputs exercise this reader and engine path; they do not certify all bureau layouts.' };
  fs.mkdirSync(outputDir, { recursive: true });
  const safeName = path.basename(reportPath).replace(/[^a-z0-9_.-]/gi, '_');
  const out = path.join(outputDir, `${safeName}.json`);
  if (fs.existsSync(out)) {
    const previous = JSON.parse(fs.readFileSync(out, 'utf8'));
    log.previous_attempts = [...(previous.previous_attempts || []), {
      created_at: previous.created_at, seeds: previous.seeds, additional_detections: previous.additional_detections,
      detected_count: previous.detected_count }];
  }
  fs.writeFileSync(out, JSON.stringify(log, null, 2) + '\n', { flag: 'w' });
  return { out, log };
}

if (require.main === module) {
  const [reportPath, country, region, oraclePath, outputDir] = process.argv.slice(2);
  if (!reportPath || !country || !region || !oraclePath || !outputDir)
    throw new Error('Usage: node creator-violation-audit.cjs REPORT.pdf COUNTRY REGION ORACLE.json OUTPUT_DIR');
  const result = audit(reportPath, country, region, oraclePath, outputDir);
  process.stdout.write(JSON.stringify({ log: result.out, seeds: result.log.seeds,
    additional_detections: result.log.additional_detections.length }) + '\n');
}

module.exports = { audit };
