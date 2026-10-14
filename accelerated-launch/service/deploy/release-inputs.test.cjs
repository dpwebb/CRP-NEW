'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { classify, createBaselineDescriptor, validateBaselineDescriptor, inspectPrerequisites, assertPrerequisites, resolveCommand } = require('./release-inputs.cjs');
const sha = value => crypto.createHash('sha256').update(value).digest('hex').toUpperCase();
let assertions = 0;
function equal(actual, expected, label) { assert.deepEqual(actual, expected, label); assertions++; }
function rejects(action, pattern, label) { assert.throws(action, pattern, label); assertions++; }

equal(classify(['README.md']).mode, 'OPERATIONS_OR_DOCUMENTATION');
equal(classify(['accelerated-launch/service/deploy/configure-production-stripe.cjs']).billing_journey_required, false, 'Stripe tool filename is not a product billing change');
equal(classify(['accelerated-launch/service/deploy/configure-production-stripe.cjs']).mode, 'OPERATIONS_OR_DOCUMENTATION');
for (const file of ['accelerated-launch/service/tests/run-tests.cjs', 'accelerated-launch/service/tests/verification-lanes.cjs', 'accelerated-launch/service/ui/app.js', 'accelerated-launch/service/ui/new.json', 'accelerated-launch/service/ui/reader.wasm', 'unknown/new.cjs', 'SOURCE_CAPTURES/PUB-001/report.pdf']) equal(classify([file]).mode, 'FULL', file);
for (const file of ['accelerated-launch/service/plan-catalog.cjs', 'accelerated-launch/service/pricing-location.cjs', 'accelerated-launch/service/stripe.cjs', 'accelerated-launch/service/ui/checkout.js']) {
  equal(classify([file]).mode, 'FULL', file); equal(classify([file]).billing_journey_required, true, file);
}
equal(classify(['accelerated-launch/service/payment-history-analysis.cjs']).billing_journey_required, false, 'Printed payment history is not billing');
equal(classify(['accelerated-launch/service/ui/checkout.html']).mode, 'PRESENTATION', 'Purchase markup stays focused');
equal(classify(['accelerated-launch/service/ui/checkout.html']).billing_journey_required, true);
equal(classify(['accelerated-launch/service/ui/style.css']).billing_journey_required, false);
equal(classify(['accelerated-launch/service/ui/landing.html'], { purchasePresentationFiles: ['accelerated-launch/service/ui/landing.html'] }).billing_journey_required, true);
equal(classify(['accelerated-launch/service/ui/logo.svg']).mode, 'PRESENTATION');
rejects(() => classify(['../private.cjs']), /UNSAFE_RELEASE_PATH/);

const parent = path.resolve(os.tmpdir()), root = fs.mkdtempSync(path.join(parent, 'crp-release-inputs-'));
const manifestPath = 'accelerated-launch/service/deploy/release-manifest.json';
const files = { runtime: 'accelerated-launch/service/runtime.cjs', section: 'accelerated-launch/service/tests/sections/selected.cjs' };
function write(file, value) { const target = path.join(root, file); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, value); }
function command(args) { return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim(); }
function commit() { command(['add', '.']); command(['-c', 'user.name=CRP release input tests', '-c', 'user.email=release-inputs@example.invalid', 'commit', '-m', 'Fixture source']); return command(['rev-parse', 'HEAD']); }
function manifestFor(names) {
  const rows = names.map(file => ({ file, sha256: sha(fs.readFileSync(path.join(root, file))) }));
  const digest = rows => sha(rows.map(row => row.file + '\n' + row.sha256 + '\n').join(''));
  const groups = [{ id: 'RUNTIME', file_count: rows.length, files: rows, digest: digest(rows) }];
  return { groups, total_file_count: rows.length, manifest_digest: digest(groups.map(group => ({ file: 'group:' + group.id, sha256: group.digest }))) };
}
function baselineFor(names) {
  return { mode: 'FULL_CURRENT_PRODUCT', totals: { passed: 5, failed: 0, skipped: 0 }, unrun_sections: [], source_drift: [],
    sections: [{ id: 'selected', completed: true, passed: 5, failed: 0, skipped: [], section_exception: null }],
    source_hashes: names.map(file => ({ file, sha256: sha(fs.readFileSync(path.join(root, file))).toLowerCase() })) };
}
try {
  command(['init', '-q']);
  write('.gitignore', 'ignored/\nbaseline.json\n');
  write(files.runtime, "'use strict'; module.exports = 1;\n");
  write(files.section, "'use strict'; const runtime=require('../../runtime.cjs'); module.exports={id:'selected'};\n");
  const manifest = manifestFor([files.runtime]); write(manifestPath, JSON.stringify(manifest));
  const acceptedCommit = commit();
  const receipt = baselineFor([files.runtime, files.section, manifestPath]); write('baseline.json', JSON.stringify(receipt));
  const options = { root, baseCommit: acceptedCommit, baselineFile: path.join(root, 'baseline.json'), sectionIds: ['selected'], manifest };
  const descriptor = createBaselineDescriptor(options);
  equal(descriptor.base_commit, acceptedCommit);
  equal(descriptor.receipt_sha256, sha(fs.readFileSync(options.baselineFile)));
  equal(descriptor.manifest_sha256, sha(fs.readFileSync(path.join(root, manifestPath))));
  equal(descriptor.section_ids, ['selected']);
  equal(descriptor.dependencies.map(row => row.source), ['COMMITTED', 'COMMITTED', 'COMMITTED']);
  equal(validateBaselineDescriptor({ ...options, descriptor }), descriptor, 'Real Git source/manifest/receipt binding verifies');
  rejects(() => createBaselineDescriptor({ ...options, sectionIds: ['other'] }), /BASELINE_SECTION_INVENTORY_MISMATCH/);
  rejects(() => createBaselineDescriptor({ ...options, sectionIds: [] }), /EXPECTED_SECTION_INVENTORY_REQUIRED/);
  rejects(() => validateBaselineDescriptor({ ...options, descriptor: { ...descriptor, receipt_sha256: 'A'.repeat(64) } }), /BASELINE_DESCRIPTOR_MISMATCH/);
  rejects(() => validateBaselineDescriptor({ ...options, descriptor: { ...descriptor, dependencies: descriptor.dependencies.slice(1) } }), /BASELINE_DESCRIPTOR_MISMATCH/);
  const changedReceipt = { ...receipt, totals: { passed: 6, failed: 0, skipped: 0 } }; write('baseline.json', JSON.stringify(changedReceipt));
  rejects(() => createBaselineDescriptor(options), /BASELINE_TOTALS_MISMATCH/);
  write('baseline.json', JSON.stringify({ ...receipt, sections: [...receipt.sections, receipt.sections[0]] }));
  rejects(() => createBaselineDescriptor(options), /BASELINE_SECTION_INVENTORY_MISMATCH/);
  write('baseline.json', JSON.stringify({ ...receipt, source_hashes: [...receipt.source_hashes, receipt.source_hashes[0]] }));
  rejects(() => createBaselineDescriptor(options), /DUPLICATE_BASELINE_DEPENDENCY/);
  write('baseline.json', JSON.stringify(receipt));
  write(files.runtime, "'use strict'; module.exports = 2;\n");
  const nextManifest = manifestFor([files.runtime]); write(manifestPath, JSON.stringify(nextManifest)); const nextCommit = commit();
  rejects(() => createBaselineDescriptor({ ...options, baseCommit: nextCommit, manifest: undefined }), /BASELINE_DEPENDENCY_NOT_BASE_COMMIT/, 'Passing wrong-source baseline is rejected');
  rejects(() => createBaselineDescriptor({ ...options, manifest: nextManifest }), /BASE_MANIFEST_IDENTITY_MISMATCH/);
  equal(validateBaselineDescriptor({ ...options, descriptor }), descriptor, 'Current working bytes do not redefine accepted historical source');

  const catalog = [{ id: 'selected', file: files.section }, { id: 'unselected', file: 'missing-unselected.cjs' }];
  equal(inspectPrerequisites({ root, sections: ['selected'], sectionCatalog: catalog }).passed, true, 'Only selected test graph is inspected');
  equal(inspectPrerequisites({ root, sections: ['missing'], sectionCatalog: catalog }).issues[0].code, 'UNKNOWN_SELECTED_SECTION');
  write(files.section, "'use strict'; const builder=require('../../../../ignored/build.cjs'); module.exports={id:'selected'};\n");
  let expensiveCalls = 0;
  rejects(() => { assertPrerequisites({ root, sections: ['selected'], sectionCatalog: catalog }); expensiveCalls++; }, /MISSING_REQUIRED_MODULE.*ignored\/build.cjs/, 'Missing ignored builder stops before expensive callback');
  equal(expensiveCalls, 0);
  write('ignored/build.cjs', "'use strict'; throw Error('Preflight must never execute this module');\n");
  equal(inspectPrerequisites({ root, sections: ['selected'], sectionCatalog: catalog }).passed, true, 'Source is inspected, never required');
  const capturedReceipt = baselineFor(['ignored/build.cjs']); write('baseline.json', JSON.stringify(capturedReceipt));
  const capturedOptions = { ...options, manifest: undefined, capturedDependencies: [{ file: 'ignored/build.cjs', sha256: capturedReceipt.source_hashes[0].sha256 }] };
  rejects(() => createBaselineDescriptor({ ...capturedOptions, capturedDependencies: [] }), /DECLARE_CAPTURE/);
  const capturedDescriptor = createBaselineDescriptor(capturedOptions);
  equal(capturedDescriptor.dependencies[0].source, 'CAPTURED_TEST_DEPENDENCY');
  equal(validateBaselineDescriptor({ ...capturedOptions, descriptor: capturedDescriptor }), capturedDescriptor);
  write('ignored/build.cjs', "'use strict'; module.exports=3;\n");
  rejects(() => validateBaselineDescriptor({ ...capturedOptions, descriptor: capturedDescriptor }), /CAPTURED_BASELINE_DEPENDENCY_UNAVAILABLE/);
  write('baseline.json', JSON.stringify(receipt));

  write(files.section, "'use strict'; const files=['consumer-wizard/dist/app.js']; module.exports={id:'selected'};\n");
  equal(inspectPrerequisites({ root, sections: ['selected'], sectionCatalog: catalog }).issues[0].file, 'consumer-wizard/dist/app.js');
  write('consumer-wizard/dist/app.js', "throw Error('Generated browser fixture is not executed');\n");
  equal(inspectPrerequisites({ root, sections: ['selected'], sectionCatalog: catalog }).passed, true);
  write(files.section, "'use strict'; // require('./commented-out.cjs')\nconst text=\"https://fixture.invalid\"; /* require('./also-commented.cjs') */ module.exports={id:'selected'};\n");
  equal(inspectPrerequisites({ root, sections: ['selected'], sectionCatalog: catalog }).passed, true, 'Commented examples are not prerequisites');
  write(files.section, "'use strict'; const sample=\"require('./string-only.cjs')\"; const command=\"execFileSync('missing-string-command')\"; module.exports={id:'selected'};\n");
  equal(inspectPrerequisites({ root, sections: ['selected'], sectionCatalog: catalog }).passed, true, 'Quoted example code is not required or executed');
  equal(inspectPrerequisites({ root, sections: ['selected'], sectionCatalog: catalog }).dynamic_dependencies, []);
  write(files.section, "'use strict'; const path=require('node:path'); const builder=require(path.join(__dirname,'../../../../ignored/build.cjs')); module.exports={id:'selected'};\n");
  equal(inspectPrerequisites({ root, sections: ['selected'], sectionCatalog: catalog }).dependencies.includes('ignored/build.cjs'), true, 'Literal dirname graph is resolved');
  write(files.section, "'use strict'; const R='unused'; const builder=require(R+'/ignored/build.cjs'); module.exports={id:'selected'};\n");
  equal(inspectPrerequisites({ root, sections: ['selected'], sectionCatalog: catalog }).dependencies.includes('ignored/build.cjs'), true, 'Common root alias is inspected without executing');
  equal(inspectPrerequisites({ root, sections: ['selected'], sectionCatalog: catalog, commands: [process.execPath] }).passed, true);
  equal(inspectPrerequisites({ root, sections: ['selected'], sectionCatalog: catalog, commands: ['crp-deliberately-missing-command'] }).issues.some(row => row.code === 'MISSING_PREREQUISITE_COMMAND'), true);
  equal(resolveCommand(process.execPath), process.execPath);
  equal(inspectPrerequisites({ root, sections: [], files: ['../private.cjs'] }).issues[0].code, 'UNSAFE_PREREQUISITE_PATH');

  write(files.section, "'use strict'; module.exports={id:'selected'};\n");
  const currentManifest = manifestFor([files.runtime]); write(manifestPath, JSON.stringify(currentManifest)); const currentCommit = commit();
  equal(inspectPrerequisites({ root, sections: ['selected'], sectionCatalog: catalog, committedManifest: true, candidateCommit: currentCommit }).passed, true, 'Committed candidate manifest/shipped bytes verify');
  write(files.runtime, "'use strict'; module.exports=99;\n");
  equal(inspectPrerequisites({ root, sections: [], committedManifest: true }).issues.some(row => row.code === 'CANDIDATE_MANIFEST_STALE'), true);
  const uncommittedManifest = manifestFor([files.runtime]); write(manifestPath, JSON.stringify(uncommittedManifest));
  const uncommitted = inspectPrerequisites({ root, sections: [], committedManifest: true });
  equal(uncommitted.issues.some(row => row.code === 'CANDIDATE_MANIFEST_NOT_COMMITTED'), true);
  equal(uncommitted.issues.some(row => row.code === 'SHIPPED_FILE_NOT_COMMITTED_AT_CANDIDATE'), true);
  equal(inspectPrerequisites({ root, sections: [], committedManifest: true, manifest: currentManifest }).issues[0].code, 'CANDIDATE_MANIFEST_ARGUMENT_MISMATCH');
  console.log('PASS: ' + assertions + ' release input assertions; real Git baseline binding, scoped prerequisites and classifier contracts');
} finally {
  // This is the exact disposable directory created above, never a workspace path.
  const target = path.resolve(root);
  if (!target.startsWith(parent + path.sep + 'crp-release-inputs-') || target === parent) throw Error('Unsafe fixture cleanup target');
  fs.rmSync(target, { recursive: true, force: true });
}
