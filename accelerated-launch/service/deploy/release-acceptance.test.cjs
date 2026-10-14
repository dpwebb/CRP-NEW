'use strict';
// UNIT_FIXTURE_ONLY. These synthetic files exercise verifier contracts. They are
// never hosted acceptance, provider evidence, production approval, or a release.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const workflowFile = process.env.CRP_RELEASE_WORKFLOW_MODULE
  ? path.resolve(process.env.CRP_RELEASE_WORKFLOW_MODULE) : require.resolve('./release-workflow.cjs');
const workflow = require(workflowFile);
const deployRoot = path.dirname(workflowFile), repositoryRoot = path.resolve(deployRoot, '../../..');
const inputs = require(path.join(deployRoot, 'release-inputs.cjs'));
const specifications = JSON.parse(fs.readFileSync(path.join(deployRoot, 'release-proof-gates.json'), 'utf8'));
const ids = [...workflow.acceptance.toString().match(/const required=(\[[\s\S]*?\]);/)[1].matchAll(/'([^']+)'/g)].map(match => match[1]);
const SCOPE = 'UNIT_FIXTURE_ONLY';
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const hash = file => digest(fs.readFileSync(file));
const clone = value => structuredClone(value);
let assertions = 0;
function check(action, label) { assert.doesNotThrow(action, label); assertions++; }
function equal(actual, expected, label) { assert.deepEqual(actual, expected, label); assertions++; }
function refuses(action, expression, label) { assert.throws(action, expression, label); assertions++; }
equal(specifications.length, 30, 'Use the actual authoritative gate inventory');
equal(specifications.reduce((sum, gate) => sum + gate.criteria.length, 0), 123);
equal(ids.length, 46, 'Use every actual acceptance predicate');

const parent = path.resolve(os.tmpdir()), temporary = fs.mkdtempSync(path.join(parent, 'crp-release-acceptance-unit-'));
const sourceRoot = path.join(temporary, 'source'), evidenceRoot = path.join(temporary, 'evidence');
fs.mkdirSync(sourceRoot); fs.mkdirSync(evidenceRoot);
function put(root, file, value) {
  const target = path.join(root, file); fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value, null, 2) + '\n');
  return target;
}
function filesUnder(root, directory = root) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(root, file) : [path.relative(root, file).replace(/\\/g, '/')];
  }).sort();
}
function recoveryCase(scenario) {
  return { scope: SCOPE, scenario, case_id: SCOPE, input_sha256: digest(SCOPE), input_page_count: 1,
    upload_status: 201, result_status: 201,
    recovery: { bounded: true, substitution_forbidden: true, recovery_attempts: 1,
      facts_added: scenario === 'USEFUL' ? [{ page: 1, line: 1, source: 'LOCAL_OCR' }] : [] },
    reading_limitations: { incomplete: true, never_equates_unread_with_absence: true } };
}
try {
  // Copy only code/declared module dependencies. No report, account store, env
  // file, historical receipt, or private evidence directory is copied.
  const verifierNames = ['release-workflow.cjs', 'release-inputs.cjs', 'release-execution.cjs', 'release-artifact.cjs',
    'release-continuity.cjs', 'release-transfer.cjs', 'release-evidence-validator.cjs', 'release-proof-gates.json'];
  const entryFiles = ['accelerated-launch/service/fdt-acceptance.cjs', 'accelerated-launch/service/evidence-validator.cjs',
    ...verifierNames.map(file => 'accelerated-launch/service/deploy/' + file)];
  const graph = inputs.inspectPrerequisites({ root: repositoryRoot, sections: [], files: entryFiles });
  for (const file of graph.dependencies) {
    const original = path.join(repositoryRoot, file);
    if (!fs.existsSync(original) || !fs.statSync(original).isFile()) throw Error('Unit verifier module unavailable: ' + file);
    put(sourceRoot, file, fs.readFileSync(original));
  }
  const runtimeFile = 'fictional/runtime.cjs', htmlFile = 'fictional/consumer.html';
  put(sourceRoot, runtimeFile, "module.exports={scope:'UNIT_FIXTURE_ONLY'};\n");
  put(sourceRoot, htmlFile, '<!doctype html><title>UNIT_FIXTURE_ONLY</title>\n');
  const manifestRows = [runtimeFile, htmlFile].map(file => ({ file, sha256: hash(path.join(sourceRoot, file)).toUpperCase() }));
  const rowDigest = rows => digest(rows.map(row => row.file + '\n' + row.sha256 + '\n').join('')).toUpperCase();
  const group = { id: 'UNIT_FIXTURE_ONLY', file_count: 2, files: manifestRows, digest: rowDigest(manifestRows) };
  const manifest = { scope: SCOPE, groups: [group], total_file_count: 2,
    manifest_digest: rowDigest([{ file: 'group:' + group.id, sha256: group.digest }]) };
  put(sourceRoot, 'accelerated-launch/service/deploy/release-manifest.json', manifest);
  const build = 'crp-v1-' + manifest.manifest_digest.slice(0, 16).toLowerCase();
  const pkg = { scope: SCOPE, build_id: build, git_head: 'a'.repeat(40), manifest_digest: manifest.manifest_digest, files: 2 };
  const bound = { scope: SCOPE, passed: true, identity: { build_id: build, served_build_id: build }, note: 'Synthetic verifier fixture; never a hosted observation' };
  put(sourceRoot, 'unit-bound-evidence.json', bound);
  const sourceHashes = filesUnder(sourceRoot).map(file => ({ file, sha256: hash(path.join(sourceRoot, file)) }));
  const recoverySource = sourceHashes.find(row => row.file === 'accelerated-launch/service/fdt-recovery.cjs');
  assert(recoverySource, 'The real FDT recovery dependency must be frozen'); assertions++;
  const rawAcceptance = { implementation_passed: true, recovery_rate: 1, incorrect_decisive_facts: 0,
    cross_record_or_bureau_borrowing: 0, unsupported_violations: 0, missing_expected_violations: 0,
    record_collapse_errors: 0, withhold_errors: 0, every_miss_accounted: true,
    freeze_unchanged: true, source_unchanged: true, source_files: [recoverySource] };
  const benchmark = { passed: true, baseline: SCOPE, metrics: { missed_fact_rate: 0, incorrect_reading_rate: 0 } };
  function state() {
    const full = { scope: SCOPE, mode: 'FULL_CURRENT_PRODUCT', selected_sections: ['am-fdt-recovery'],
      totals: { passed: 1, failed: 0, skipped: 0 }, unrun_sections: [], source_drift: [], source_hashes: clone(sourceHashes),
      sections: [{ id: 'am-fdt-recovery', completed: true, passed: 1, failed: 0, skipped: [], section_exception: null,
        evidence: { acceptance: clone(rawAcceptance), benchmark_full: clone(benchmark),
          local_recovery: { useful_facts: 1, useful_attempts: 1, unsuccessful_facts: 0, unsuccessful_attempts: 1, pass_limit: 1 } } }] };
    const phase = () => ({ scope: SCOPE, target: 'https://staging.creditregulatorpro.com', passed: true,
      identity: { build_id: build, served_build_id: build }, source_proof: { passed: true,
        manifest_digest: manifest.manifest_digest, files: manifestRows.map(row => ({ file: row.file, expected: row.sha256, measured: row.sha256 })) } });
    const phases = { 'phase1.json': phase(), 'phase2.json': phase(), 'paid.json': clone(bound), 'cleanup.json': clone(bound) };
    const predicateRefs = { actual_phase1: 'phase1.json', actual_phase2: 'phase2.json', actual_paid_activation: 'paid.json', actual_cleanup: 'cleanup.json' };
    const predicates = ids.map(id => ({ id, passed: true, expected: SCOPE + ': ' + id,
      measured: SCOPE + ': measured fixture', refs: [predicateRefs[id] || 'unit-bound-evidence.json'] }));
    const measured = { scope: SCOPE, passed: true, failures: [], identity: { build_id: build, served_build_id: build },
      manifest_digest: manifest.manifest_digest, predicates: Object.fromEntries(predicates.map(row => [row.id, row])),
      source_freeze: { file: 'full-regression.json', sha256: null, source_hashes: clone(sourceHashes) } };
    const gates = Object.fromEntries(specifications.map(spec => [spec.file, { scope: SCOPE, passed: true,
      identity: { build_id: build, served_build_id: build }, staging_verification: { status: 'VERIFIED' },
      tests: [{ id: SCOPE, passed: true, expected: SCOPE, measured: SCOPE }],
      criteria: Object.fromEntries(spec.criteria.map(key => [key, { passed: true, expected: SCOPE + ': ' + key,
        measured: SCOPE, evidence_refs: ['unit-bound-evidence.json'] }])),
      implementation: { configured: true, tests: [{ id: SCOPE, passed: true, expected: SCOPE, measured: SCOPE, criteria: spec.criteria }],
        source_files: clone(sourceHashes), evidence_refs: [{ file: 'unit-bound-evidence.json', sha256: null }] } }]));
    const fdt = gates['fdt-mitigation-evidence.json'];
    fdt.acceptance = clone(rawAcceptance); fdt.benchmark = { ...benchmark.metrics, baseline: benchmark.baseline };
    fdt.implementation.source_files = [...clone(sourceHashes), ...clone(rawAcceptance.source_files)];
    fdt.implementation.evidence_refs = [{ file: 'full-regression.json', sha256: null }];
    fdt.served_recovery = { scope: SCOPE, identity: { build_id: build, served_build_id: build },
      recovery_cases: [recoveryCase('USEFUL'), recoveryCase('UNSUCCESSFUL')] };
    const receipt = { scope: SCOPE, passed: true, build_id: build, source_commit: pkg.git_head,
      manifest_digest: pkg.manifest_digest, gates: 30, criteria: 123, predicates, measurement_receipt_sha256: null };
    return { full, phases, gates, measured, receipt };
  }
  function publish(fixture) {
    put(evidenceRoot, 'unit-bound-evidence.json', bound);
    const fullFile = put(evidenceRoot, 'full-regression.json', fixture.full), fullSha = hash(fullFile);
    fixture.measured.source_freeze.sha256 = fullSha;
    for (const [file, gate] of Object.entries(fixture.gates)) {
      gate.implementation.evidence_refs[0].sha256 = file === 'fdt-mitigation-evidence.json' ? fullSha : hash(path.join(evidenceRoot, 'unit-bound-evidence.json'));
      put(evidenceRoot, file, gate);
    }
    for (const [file, phase] of Object.entries(fixture.phases)) put(evidenceRoot, file, phase);
    const measurementFile = put(evidenceRoot, 'measurements.json', fixture.measured);
    fixture.receipt.measurement_receipt_sha256 = hash(measurementFile);
    const acceptanceFile = put(evidenceRoot, 'acceptance.json', fixture.receipt);
    return { measurementFile, acceptanceFile, evidenceRoot, sourceRoot, packageReceipt: pkg };
  }
  const initial = state(); let proof = publish(initial);
  check(() => workflow.acceptance(initial.receipt, build, proof), 'Every real gate/criterion/predicate accepts a complete UNIT_FIXTURE_ONLY structure');
  const mutations = [
    { name: 'wrong actual staging hostname', change: f => { f.phases['phase1.json'].target = 'https://other.invalid'; }, error: /Hosted source\/hostname/ },
    { name: 'wrong measured hosted file bytes', change: f => { f.phases['phase2.json'].source_proof.files[0].measured = '0'.repeat(64); }, error: /Hosted source\/hostname/ },
    { name: 'missing required criterion', change: f => { const spec = specifications[1]; delete f.gates[spec.file].criteria[spec.criteria[0]]; }, error: /Current staging evidence rejected/ },
    { name: 'arbitrary substituted criterion', change: f => { const spec = specifications[1]; f.gates[spec.file].criteria.unapproved = f.gates[spec.file].criteria[spec.criteria[0]]; }, error: /Current staging evidence rejected/ },
    { name: 'pending staging boundary', change: f => { f.gates[specifications[1].file].staging_verification = { status: 'PENDING', reason: SCOPE }; }, error: /Current staging evidence rejected/ },
    { name: 'gate served identity mismatch', change: f => { f.gates[specifications[1].file].identity.served_build_id = 'old'; }, error: /Current staging evidence rejected/ },
    { name: 'coherently changed raw FDT recovery threshold', change: f => { f.full.sections[0].evidence.acceptance.recovery_rate = f.gates['fdt-mitigation-evidence.json'].acceptance.recovery_rate = 0.2; }, error: /FDT raw recovery\/accuracy/ },
    { name: 'raw FDT incorrect decisive facts', change: f => { f.full.sections[0].evidence.acceptance.incorrect_decisive_facts = f.gates['fdt-mitigation-evidence.json'].acceptance.incorrect_decisive_facts = 1; }, error: /FDT raw recovery\/accuracy/ },
    { name: 'gate FDT differs from raw metrics', change: f => { f.gates['fdt-mitigation-evidence.json'].acceptance.extra = SCOPE; }, error: /FDT gate differs/ },
    { name: 'missing useful served recovery', change: f => { f.gates['fdt-mitigation-evidence.json'].served_recovery.recovery_cases[0].recovery.facts_added = []; }, error: /FDT current hosted/ },
    { name: 'wrong served recovery identity', change: f => { f.gates['fdt-mitigation-evidence.json'].served_recovery.identity.served_build_id = 'old'; }, error: /FDT current hosted/ },
    { name: 'missing source-freeze dependency hash', change: f => { f.measured.source_freeze.source_hashes[0].sha256 = '0'.repeat(64); }, error: /Source freeze inventory/ },
    { name: 'duplicate required predicate', change: f => { f.receipt.predicates[0] = clone(f.receipt.predicates[1]); }, error: /30-gate \/ 123-criterion/ }
  ];
  for (const mutation of mutations) {
    const fixture = state(); mutation.change(fixture); const current = publish(fixture);
    refuses(() => workflow.acceptance(fixture.receipt, build, current), mutation.error, mutation.name);
  }
  const restored = state(); proof = publish(restored);
  refuses(() => workflow.acceptance(restored.receipt, build, { ...proof, packageReceipt: { ...pkg, git_head: 'b'.repeat(40) } }), /source\/package identity/, 'Wrong package source commit');
  refuses(() => workflow.acceptance(restored.receipt, build, { ...proof, packageReceipt: { ...pkg, manifest_digest: '0'.repeat(64) } }), /source\/package identity/, 'Wrong package manifest');
  put(evidenceRoot, 'measurements.json', { ...restored.measured, unexpected: SCOPE });
  refuses(() => workflow.acceptance(restored.receipt, build, proof), /measurement hash mismatch/, 'Raw measurement must retain its hash');
  proof = publish(restored);
  const originalRuntime = fs.readFileSync(path.join(sourceRoot, runtimeFile)); put(sourceRoot, runtimeFile, SCOPE + ': altered source');
  refuses(() => workflow.acceptance(restored.receipt, build, proof), /manifest bytes changed/, 'Committed-looking identity cannot hide changed source bytes');
  put(sourceRoot, runtimeFile, originalRuntime);
  fs.unlinkSync(path.join(evidenceRoot, 'unit-bound-evidence.json'));
  refuses(() => workflow.acceptance(restored.receipt, build, proof), /Current staging evidence rejected/, 'Missing build-bound referenced evidence');
  proof = publish(restored);
  check(() => workflow.acceptance(restored.receipt, build, proof), 'Restored fixture still passes strict acceptance');

  const promotionOutput=path.join(temporary,'promotion-output');fs.mkdirSync(promotionOutput);
  const firstPromotion=workflow.preparePromotionProof(proof.acceptanceFile,pkg,promotionOutput,{evidenceRoot,sourceRoot});
  const nextPromotion=workflow.preparePromotionProof(proof.acceptanceFile,pkg,promotionOutput,{evidenceRoot,sourceRoot});
  equal(nextPromotion.reused,true,'Unchanged proof assembly is reused without rebuilding its archive');
  equal(nextPromotion.sha256,firstPromotion.sha256,'Promotion retains the identical proof archive');
  const alternativeAcceptance=path.join(evidenceRoot,'another-acceptance.json');fs.copyFileSync(proof.acceptanceFile,alternativeAcceptance);
  refuses(()=>workflow.preparePromotionProof(alternativeAcceptance,pkg,promotionOutput,{evidenceRoot,sourceRoot}),/identity changed/,'Another supplied acceptance path cannot silently reuse a different server proof');
  const gatePath=path.join(evidenceRoot,specifications[1].file),gateBytes=fs.readFileSync(gatePath);fs.appendFileSync(gatePath,'\n');
  refuses(()=>workflow.preparePromotionProof(proof.acceptanceFile,pkg,promotionOutput,{evidenceRoot,sourceRoot}),/input changed/,'Referenced gate changes invalidate proof resume');fs.writeFileSync(gatePath,gateBytes);

  const output = path.join(temporary, 'proof-output'); fs.mkdirSync(output);
  const prepared = workflow.prepareAcceptanceProof(proof.acceptanceFile, pkg, output, { evidenceRoot, sourceRoot });
  equal(prepared.sha256, hash(prepared.archive).toUpperCase(), 'Frozen proof archive is hash-bound');
  const bundle = path.join(output, 'acceptance-proof');
  equal(fs.existsSync(path.join(bundle, 'source', '.git')), false, 'Portable proof has no Git checkout');
  const portable = require(path.join(bundle, 'verifier/deploy/release-workflow.cjs'));
  const portableReceipt = JSON.parse(fs.readFileSync(path.join(bundle, 'acceptance.json')));
  const portablePackage = JSON.parse(fs.readFileSync(path.join(bundle, 'package-identity.json')));
  const portableProof = { measurementFile: path.join(bundle, 'evidence', portablePackage.measurement_ref),
    evidenceRoot: path.join(bundle, 'evidence'), sourceRoot: path.join(bundle, 'source'), packageReceipt: portablePackage };
  check(() => portable.acceptance(portableReceipt, build, portableProof), 'Copied real verifier validates frozen UNIT_FIXTURE_ONLY proof without Git');
  put(sourceRoot, runtimeFile, SCOPE + ': next unrelated original source');
  put(evidenceRoot, specifications[0].file, { scope: SCOPE, passed: false });
  check(() => portable.acceptance(portableReceipt, build, portableProof), 'Advancing original source/evidence cannot invalidate the frozen proof');
  const frozenPhasePath = path.join(bundle, 'evidence/phase1.json'), frozenPhase = JSON.parse(fs.readFileSync(frozenPhasePath));
  put(path.join(bundle, 'evidence'), 'phase1.json', { ...frozenPhase, target: 'https://wrong.invalid' });
  refuses(() => portable.acceptance(portableReceipt, build, portableProof), /Hosted source\/hostname/, 'Frozen proof still rejects its own corrupted actual-host evidence');
  console.log('PASS: ' + assertions + ' UNIT_FIXTURE_ONLY acceptance assertions; 30 gates, 123 criteria, 46 predicates and portable proof custody. No hosted acceptance claimed.');
} finally {
  const target = path.resolve(temporary);
  if (!target.startsWith(parent + path.sep + 'crp-release-acceptance-unit-') || target === parent) throw Error('Unsafe unit fixture cleanup');
  fs.rmSync(target, { recursive: true, force: true });
}
