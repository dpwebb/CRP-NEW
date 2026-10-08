'use strict';
/* Reapply only measured implementation evidence from a successful current-product run.
 * Supported checklist paths, incomplete mappings and hosted verification remain separate. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const output = 'accelerated-launch/service/out/common-errors-evidence.json';
const regressionFile = 'accelerated-launch/service/out/current-regression-evidence.json';
const read = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const sha = (file) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
const run = read(regressionFile);
if (run.mode !== 'FULL_CURRENT_PRODUCT' || run.totals.failed || run.totals.skipped
  || run.source_drift.length || run.unrun_sections.length || !run.source_hashes.length) {
  throw Error('A complete passing current-product run is required for common-error implementation evidence');
}
const ids = ['al-common-errors', 'ct-owner-common-error-scope', 'cw-common-error-rule-assessment',
  'cx-all82-required-report-data', 'cy-common-error-predicate-repairs', 'cz-common-error-packet-repairs',
  'da-common-error-reader-repairs', 'db-common-error-surface-repairs', 'dc-consumer-violation-term',
  'de-tu-ca-common-error-sources', 'df-us-common-error-reader', 'dg-owned-reaging',
  'dh-ca-reader-completion', 'di-au-reader-completion', 'dj-gb-reader-completion', 'dk-reader-completion-integration',
  'dl-general-caption-sources', 'dm-au-role-packet-evidence', 'dn-us-dated-history',
  'do-gb-history-definitions', 'dp-us-cell-recovery', 'dq-ca-printed-account-fields', 'dr-reader-evidence-delivery',
  'ds-column-caption-fields', 'dt-rating-history-rows', 'du-column-reader-delivery', 'dv-au-reference-delivery',
  'dw-us-history-completion', 'dx-report-date-custody', 'dy-reader-date-delivery'];
// These sections exercise checklist predicates alongside benign, missing-source,
// retired-adapter and account-association controls. Bind the release criteria to
// those measured behaviors rather than an unrelated umbrella tag.
const predicateSections = new Set(['al-common-errors', 'ct-owner-common-error-scope',
  'cw-common-error-rule-assessment', 'cx-all82-required-report-data',
  'cy-common-error-predicate-repairs', 'cz-common-error-packet-repairs']);
const tests = ids.map((id) => {
  const section = run.sections.find((row) => row.id === id);
  if (!section || !section.completed || section.failed || section.skipped.length || !section.passed) {
    throw Error('A completed passing common-error section is required: ' + id);
  }
  const criteria = ['supported_checklist_paths'];
  if (predicateSections.has(id)) criteria.push('checks_implemented', 'no_false_finding');
  return { id, passed: true, assertions: section.passed, criteria,
    expected: 'completed passing behavioral section', measured: `${section.passed} passed; 0 failed; 0 skipped` };
});
// Check every source in the frozen product run before recording its status.
for (const source of run.source_hashes) {
  if (sha(source.file) !== source.sha256) throw Error('Tested source changed: ' + source.file);
}
const sourceFiles = ['accelerated-launch/service/common-error-checklist.cjs',
  'accelerated-launch/service/common-errors.cjs', 'accelerated-launch/service/common-error-rule-assessment.cjs',
  'accelerated-launch/service/general-intake.cjs', 'accelerated-launch/service/formats.cjs',
  'accelerated-launch/service/issues.cjs', 'accelerated-launch/service/results.cjs',
  'accelerated-launch/service/journey.cjs', 'accelerated-launch/service/packets.cjs',
  'accelerated-launch/service/app.cjs', 'accelerated-launch/service/ui/app.js'];
sourceFiles.push('accelerated-launch/service/reaging.cjs', 'accelerated-launch/service/report-fact-sources.cjs',
  'accelerated-launch/service/account-identity.cjs', 'accelerated-launch/service/format-families/tu-ca-consumer.cjs',
  'accelerated-launch/service/format-families/us-experian-consumer.cjs');
sourceFiles.push('accelerated-launch/service/report-amount.cjs', 'accelerated-launch/service/ca-consumer-file-facts.cjs',
  'accelerated-launch/service/report-code-definitions.cjs',
  'accelerated-launch/service/format-families/au-equifax-consumer.cjs',
  'accelerated-launch/service/format-families/gb-experian-consumer.cjs');
sourceFiles.push('accelerated-launch/service/ocr/local-ocr.cjs');
sourceFiles.push('accelerated-launch/service/payment-history-grid.cjs');
sourceFiles.push('accelerated-launch/service/multi-file-assembly.cjs');
const checklist = require(path.join(root, 'accelerated-launch/service/common-error-checklist.cjs')).CHECKS;
const remaining = {
  re_aging: 'Owned same-bureau fixed-obligation first-delinquency changes have a sourced verification mapping. Reader layouts without corroborated identity, sourced anchors or report dates remain gaps. Ordinary later delinquency does not establish re-aging or its absence.',
  reader_coverage: 'These passing paths do not establish every field mapping or every checklist item for every report layout.',
  staging_journey: 'Current served-release common-error upload-to-selected-approved-packet evidence is pending.'
};
const evidenceRefs = [regressionFile, 'SOURCE_CAPTURES/CLOSURE-POLICY-001/closure-common-errors.cjs']
  .map((file) => ({ file, sha256: sha(file) }));
const evidence = {
  identity: { local_only: true, served_build_id: null },
  passed: false,
  measured_at: new Date().toISOString(),
  scope: 'Active common-error checklist: supported report-data and scoped statutory-support paths tested locally. Source-linked report-data breaches may be platform violations; CRP does not determine legal findings. This record does not establish complete checklist coverage or hosted readiness.',
  implementation: { configured: true, status: 'IMPLEMENTED_AND_TESTED', scope: 'SUPPORTED_PATHS_ONLY',
    tests, source_files: sourceFiles.map((file) => ({ file, sha256: sha(file) })), evidence_refs: evidenceRefs },
  staging_verification: { status: 'PENDING', reason: remaining.staging_journey },
  active_checklist: checklist,
  remaining,
  coverage: {
    supported_checklist_paths: { passed: true,
      expected: 'positive, benign and qualification controls on supported shared checklist paths',
      measured: `${tests.reduce((sum, test) => sum + test.assertions, 0)} assertions across ${tests.length} sections; full product run ${run.totals.passed} passed`,
      evidence_refs: evidenceRefs },
    complete_checklist_coverage: { passed: false, expected: 'supported evidence mappings for all checklist items and relevant layouts',
      measured: remaining.re_aging + ' ' + remaining.reader_coverage, evidence_refs: [] }
  },
  criteria: {
    checks_implemented: { passed: true, expected: 'supported checklist mechanisms tested with positive and benign controls',
      measured: `${tests.reduce((sum, test) => sum + test.assertions, 0)} measured assertions; supported paths only; remaining mappings listed separately`,
      evidence_refs: evidenceRefs },
    no_false_finding: { passed: true, expected: 'source-linked checklist assessments remain separate from raw comparisons; no legal findings',
      measured: 'Passing common-rule, benign, retired-adapter, neutral-review and confidence-preservation controls',
      evidence_refs: evidenceRefs },
    end_to_end_journey: { passed: false, expected: 'current served-release upload through selected approved packet',
      measured: remaining.staging_journey, evidence_refs: [] }
  },
  tests
};
fs.writeFileSync(path.join(root, output), JSON.stringify(evidence, null, 2) + '\n');
console.log(`common-errors-evidence.json: ${tests.reduce((sum, test) => sum + test.assertions, 0)} measured assertions; supported paths tested; complete coverage open; staging pending`);
