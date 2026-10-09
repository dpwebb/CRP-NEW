'use strict';
/* Re-derive the supported all-82 common-error journey from a complete passing
 * current-product execution. Optional statutory support is not a report-data
 * rule gate. Local implementation, reader limits and hosted acceptance remain
 * separate; this script makes no hosted or production readiness claim. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const regressionFile = 'accelerated-launch/service/out/current-regression-evidence.json';
const output = 'accelerated-launch/service/out/all82-facilitation-evidence.json';
const run = JSON.parse(fs.readFileSync(path.join(root, regressionFile), 'utf8'));
const sha = (file) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
if (run.mode !== 'FULL_CURRENT_PRODUCT' || run.totals.failed || run.totals.skipped
  || run.source_drift.length || run.unrun_sections.length || !run.source_hashes.length) {
  throw Error('A complete passing current-product run is required for all-82 implementation evidence');
}
for (const source of run.source_hashes) {
  if (sha(source.file) !== source.sha256) throw Error('Tested source changed: ' + source.file);
}
const sections = new Map(run.sections.map((section) => [section.id, section]));
const specs = [
  ['n-applicability', ['jurisdiction_inventory', 'behavioral_coverage'],
    'All 82 selected regions expose the shared common-error checklist; optional statutory support is reported separately.'],
  ['o-all82-infrastructure', ['usable_intake', 'account_isolation', 'behavioral_coverage'],
    'All 82 regions enforce owned account/case/upload/evaluation/status/deletion paths.'],
  ['bx-all82-factual-verification', ['applicable_assessment', 'consumer_delivery', 'usable_intake', 'account_isolation', 'behavioral_coverage'],
    'All 82 regions deliver a sourced checklist violation through selection, approval and entitled download with exact case/report association.'],
  ['cw-common-error-rule-assessment', ['applicable_assessment', 'behavioral_coverage'],
    'Six sourced shared checks run under every region without a mandatory statute gate; benign and missing-source controls preserve evidence thresholds.'],
  ['cx-all82-required-report-data', ['applicable_assessment', 'behavioral_coverage'],
    'All 82 regions distinguish a source-proven omission from unreadable or absent reader evidence.'],
  ['eu-general-omission-delivery', ['applicable_assessment', 'consumer_delivery', 'behavioral_coverage'],
    'Native own-account omitted dates and corroborated original/collection balances run across all 82, with four representative selected approved downloads for each check.'],
  ['dl-general-caption-sources', ['usable_intake', 'consumer_delivery'],
    'The bounded current UK GENERAL field contract reaches an owned selected packet in each of the four UK regions.'],
  ['ct-owner-common-error-scope', ['jurisdiction_inventory', 'applicable_assessment', 'behavioral_coverage'],
    'The same 19-item checklist is available in all 82 regions; retired independent statutory checks stay excluded.'],
  ['z-general-intake', ['usable_intake'],
    'General intake accepts a plausible bureau report and refuses unrelated or unreadable documents without inventing facts.'],
  ['b-refusals', ['usable_intake'],
    'Jurisdiction and upload refusals are typed and enforced, including lookalike documents.'],
  ['l-au-format-family', ['usable_intake'], 'The Australian family reader preserves its supported structural boundary.'],
  ['w-ca-second-bureau-format', ['usable_intake'], 'The TransUnion Canada reader preserves its measured family contract.'],
  ['p-us-consumer-format', ['usable_intake'], 'The United States family reader yields source-associated records.'],
  ['ap-accept-010-consistency', ['material_questions'],
    'No context-only questions are generated; retired prompts stay hidden and supplemental answers cannot replace report evidence.'],
  ['a-isolation', ['account_isolation'], 'Another account cannot read or mutate owned case/file/result data.'],
  ['bw-browser-wizzard', ['consumer_delivery', 'behavioral_coverage'],
    'The actual browser completes consumer selection, review, approval and packet download through the local service.'],
  ['m-au-journey', ['consumer_delivery'], 'The supported Australian consumer journey reaches its issue and output.']
];
const tests = specs.map(([id, criteria, expected]) => {
  const section = sections.get(id);
  if (!section || !section.completed || section.failed || section.skipped.length || !section.passed) {
    throw Error('A completed passing all-82 section is required: ' + id);
  }
  return { id, passed: true, criteria, expected, measured: `${section.passed} passed; 0 failed; 0 skipped` };
});
const journey = sections.get('bx-all82-factual-verification').evidence;
const common = sections.get('cw-common-error-rule-assessment').evidence;
const checklist = sections.get('ct-owner-common-error-scope').evidence;
const inventory = sections.get('o-all82-infrastructure').evidence;
if (journey.regions_tested !== 82 || journey.download_content_matched !== 82
  || journey.case_association_matched !== 82 || common.ordinary_report_regions !== 82
  || common.ordinary_report_checks_per_region !== 6 || common.statutory_gate !== false
  || checklist.checklist !== 19 || checklist.jurisdictions !== 82
  || inventory.regions_exercised.length !== 82) throw Error('Measured all-82 checklist journey is incomplete');
const sourceFiles = ['app.cjs', 'cases.cjs', 'journey.cjs', 'formats.cjs', 'general-intake.cjs',
  'entitlement.cjs', 'applicability.cjs', 'issues.cjs', 'results.cjs', 'packets.cjs',
  'common-error-checklist.cjs', 'common-errors.cjs', 'common-error-rule-assessment.cjs',
  'common-error-scope.cjs', 'clarification.cjs', 'ui/app.js']
  .map((file) => 'accelerated-launch/service/' + file);
sourceFiles.push('accelerated-launch/adapters/rule-adapters.cjs', 'accelerated-launch/adapters/adapter-configs.json');
const evidenceFiles = [regressionFile, 'SOURCE_CAPTURES/CLOSURE-POLICY-001/closure-all82-facilitation.cjs',
  ...specs.map(([id]) => 'accelerated-launch/service/tests/sections/' + sections.get(id).file)];
const pin = (file) => ({ file, sha256: sha(file) });
const hostedReason = 'Current served-release upload through selected, reviewed, approved and legitimately entitled packet download has not been recorded. Local all-82 implementation proof does not establish hosted paid acceptance or production readiness.';
const required = ['jurisdiction_inventory', 'usable_intake', 'applicable_assessment', 'material_questions',
  'consumer_delivery', 'account_isolation', 'behavioral_coverage', 'end_to_end_journey'];
const evidence = {
  identity: { build_id: (run.identity && run.identity.build_id) || run.build_id || null,
    served_build_id: null, local_only: true },
  passed: false,
  measured_at: new Date().toISOString(),
  scope: 'Supported common-error consumer facilitation across all 82 selections, with source-linked assessment, consumer-controlled packet delivery and account isolation. This is local implementation evidence, not every check on every layout or hosted acceptance.',
  implementation: { configured: true, status: 'IMPLEMENTED_AND_TESTED', scope: 'SUPPORTED_PATHS_ONLY',
    tests, source_files: sourceFiles.map(pin), evidence_refs: evidenceFiles.map(pin) },
  staging_verification: { status: 'PENDING', reason: hostedReason },
  facilitation_by_jurisdiction: {
    total_rows: 82, journey_exercised: journey.regions_tested,
    download_content_matched: journey.download_content_matched,
    case_association_matched: journey.case_association_matched,
    shared_checklist_items: checklist.checklist,
    ordinary_report_checks_per_region: common.ordinary_report_checks_per_region,
    statutory_support_is_mandatory: false,
    regions_exercised: inventory.regions_exercised,
    countries: { CA: 13, US: 57, GB: 4, AU: 8 }
  },
  remaining: {
    reader_coverage: 'These supported shared paths do not establish every field mapping or every checklist item for every report layout.',
    current_gb_format: 'The current bounded UK GENERAL consumer field contract is supported separately. The dedicated Experian example remains historical; whole present-day bureau layout certification is not claimed or required for these supported journeys.',
    hosted_paid_journey: hostedReason,
    production_readiness: 'OPEN; production configuration, release controls and owner authorization are separate.'
  },
  criteria: Object.fromEntries(required.map((key) => [key, {
    passed: false,
    expected: key === 'end_to_end_journey' ? 'Measured current served-release consumer journey with legitimate entitlement.'
      : tests.filter((test) => test.criteria.includes(key)).map((test) => test.expected).join(' '),
    measured: key === 'end_to_end_journey' ? hostedReason : 'Implemented and tested locally; served-release acceptance remains pending.',
    evidence_refs: []
  }])),
  tests
};
fs.writeFileSync(path.join(root, output), JSON.stringify(evidence, null, 2) + '\n');
console.log(`all82-facilitation-evidence.json: ${tests.reduce((sum, test) => sum + sections.get(test.id).passed, 0)} measured assertions; supported all-82 paths tested; reader limits retained; staging pending`);
