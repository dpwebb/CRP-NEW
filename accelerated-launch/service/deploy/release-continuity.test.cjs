'use strict';
// Fictional temporary repositories test proof reuse and refusal. These are
// tooling unit fixtures, never product, hosted or provider acceptance receipts.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const inputs = require(process.env.CRP_RELEASE_INPUTS_TEST_MODULE || './release-inputs.cjs');
const { createContinuityTools, MODE } = require('./release-continuity.cjs');
const { buildComposite, validateComposite } = createContinuityTools(inputs);
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const hash = file => sha(fs.readFileSync(file));
const MANIFEST = 'accelerated-launch/service/deploy/release-manifest.json';
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'crp-continuity-unit-'));
let cases = 0;
function write(root, file, bytes) { const target = path.join(root, file); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, bytes); return target; }
function writeJson(root, file, value) { return write(root, file, JSON.stringify(value, null, 2) + '\n'); }
function git(root, args) { return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim(); }
function sources(root) {
  const result = [];
  function visit(relative) {
    for (const item of fs.readdirSync(path.join(root, relative), { withFileTypes: true })) {
      const file = relative + '/' + item.name;
      if (item.isDirectory()) visit(file);
      else if (/\.(?:cjs|js|json|html|css)$/.test(item.name)) result.push({ file, sha256: hash(path.join(root, file)) });
    }
  }
  visit('accelerated-launch/service'); visit('accelerated-launch/adapters');
  return result.sort((a, b) => a.file.localeCompare(b.file));
}
function manifest(root) {
  const definitions = [
    ['RUNTIME', ['accelerated-launch/service/app.cjs']],
    ['SERVED_ASSETS', ['accelerated-launch/service/ui/page.html', 'accelerated-launch/service/ui/styles.css']]
  ];
  const digest = rows => sha(rows.map(row => row.file + '\n' + row.sha256 + '\n').join(''));
  const groups = definitions.map(([id, names]) => {
    const files = names.filter(file => fs.existsSync(path.join(root, file))).map(file => ({ file, sha256: hash(path.join(root, file)) }));
    return { id, files, file_count: files.length, digest: digest(files) };
  });
  const result = { groups, total_file_count: groups.reduce((n, row) => n + row.file_count, 0), manifest_digest: digest(groups.filter(row => row.files.length).map(row => ({ file: 'group:' + row.id, sha256: row.digest }))) };
  writeJson(root, MANIFEST, result); return result;
}
function fixture(label, mutate, options = {}) {
  const base = path.join(temp, label), root = path.join(base, 'repo'); fs.mkdirSync(root, { recursive: true });
  git(root, ['init', '-q']); git(root, ['config', 'user.name', 'CRP Tool Unit Fixture']); git(root, ['config', 'user.email', 'fictional@example.invalid']);
  write(root, 'accelerated-launch/service/app.cjs', "'use strict'; module.exports = { fictional: true };\n");
  write(root, 'accelerated-launch/adapters/rule.cjs', "'use strict'; module.exports = { fixtureOnly: true };\n");
  write(root, 'accelerated-launch/service/ui/page.html', '<html><main>Fictional preview</main></html>\n');
  write(root, 'accelerated-launch/service/ui/styles.css', 'main { color: green; }\n');
  write(root, 'accelerated-launch/service/deploy/unit-tool.cjs', "'use strict'; module.exports = true;\n");
  write(root,'accelerated-launch/service/deploy/unchanged-control.sh','#!/bin/sh\nexit 0\n');
  write(root, 'accelerated-launch/service/tests/run-tests.cjs', "const SECTION_FILES = [\n  'a-core.cjs',\n  'b-ui.cjs',\n  'c-security.cjs'\n];\n");
  write(root, 'accelerated-launch/service/tests/verification-lanes.cjs', "const LANE_IDS = { consumer: ['b-ui'], security: ['c-security'], browser: ['b-ui'] };\n" + (options.laneAdditions || '') + "module.exports = { LANE_IDS };\n");
  for (const id of ['a-core', 'b-ui', 'c-security']) write(root, 'accelerated-launch/service/tests/sections/' + id + '.cjs', "module.exports = { id: '" + id + "' };\n");
  const capturedName = 'accelerated-launch/service/tests/captured-helper.cjs';
  if (options.captured) {
    write(root, '.gitignore', capturedName + '\n');
    write(root, capturedName, "module.exports = { fictionalCapturedFixture: true };\n");
  }
  manifest(root); git(root, ['add', '.']); git(root, ['commit', '-qm', 'fictional baseline']);
  const baseCommit = git(root, ['rev-parse', 'HEAD']);
  const sections = ['a-core', 'b-ui', 'c-security'].map(id => ({ id, file: id + '.cjs', completed: true, passed: 1, failed: 0, skipped: [], evidence: { fixture_only: true } }));
  const baseline = { mode: 'FULL_CURRENT_PRODUCT', selected_sections: sections.map(row => row.id), sections, totals: { passed: 3, failed: 0, skipped: 0 }, unrun_sections: [], source_drift: [], source_hashes: sources(root) };
  const baselineFile = writeJson(base, 'baseline.json', baseline);
  const descriptor = inputs.createBaselineDescriptor({ root, baseCommit, baselineFile, sectionIds: sections.map(row => row.id),
    capturedDependencies: options.captured ? [{ file: capturedName, sha256: hash(path.join(root, capturedName)) }] : [] });
  if (mutate) mutate(root);
  const candidateManifest = manifest(root);
  git(root, ['add', '.']);
  if (git(root, ['diff', '--cached', '--name-only'])) git(root, ['commit', '-qm', 'fictional candidate']);
  const changedFiles = git(root, ['diff', '--name-only', baseCommit, '--']).split(/\r?\n/).filter(Boolean).sort();
  const risk = inputs.classify(changedFiles);
  const selected = risk.mode === 'PRESENTATION' ? (options.selectedSections || ['b-ui', 'c-security']) : [];
  const snapshot = Object.fromEntries(sources(root).map(row => [row.file, row.sha256]));
  snapshot['accelerated-launch/service/deploy/unchanged-control.sh']=hash(path.join(root,'accelerated-launch/service/deploy/unchanged-control.sh'));
  for (const file of changedFiles.filter(file=>!/\.md$/i.test(file))) snapshot[file] = fs.existsSync(path.join(root, file)) ? hash(path.join(root, file)) : null;
  const plan = { schema: 2, base_commit: baseCommit, git_head: git(root, ['rev-parse', 'HEAD']), changed_files: changedFiles, risk,
    selected_lanes: selected.length ? ['consumer', 'security', 'browser'] : [], selected_sections: selected,
    baseline: { file: baselineFile, sha256: hash(baselineFile), build_id: descriptor.build_id, descriptor }, source_snapshot: snapshot };
  const candidate = { git_head: plan.git_head, manifest_digest: candidateManifest.manifest_digest, build_id: 'crp-v1-' + candidateManifest.manifest_digest.slice(0, 16).toLowerCase(), files: candidateManifest.total_file_count };
  const stepFile = writeJson(base, 'tool-step.json', { passed: true, fixture_only: true, command: 'UNIT_TOOL_CHECK_ONLY' });
  const tool = { passed: true, plan_sha256: sha(JSON.stringify(plan)), source_hashes: sources(root), checks: [{ id: 'UNIT_TOOL_CHECK_ONLY', passed: true, file: stepFile, sha256: hash(stepFile) }], workflow_tests: 'PASS' };
  const toolsVerificationFile = writeJson(base, 'tools.json', tool);
  let focusedFile = null;
  if (selected.length) {
    const focusedSections = sections.filter(row => selected.includes(row.id));
    const execution = { mode: 'FOCUSED', selected_sections: selected, sections: focusedSections, totals: { passed: focusedSections.length, failed: 0, skipped: 0 }, unrun_sections: sections.filter(row => !selected.includes(row.id)).map(row => row.id), source_drift: [], source_hashes: sources(root) };
    focusedFile = writeJson(base, 'focused.json', { mode: 'FOCUSED', execution, totals: execution.totals });
  }
  const buildOptions = { root, plan, baselineFile, focusedFile, toolsVerificationFile, candidate, outputDirectory: path.join(base, 'proof') };
  if (options.beforeBuild) options.beforeBuild(buildOptions);
  return { base, root, baseline, descriptor, plan, candidate, buildOptions };
}
function accepted(label, mutate, options) {
  const f = fixture(label, mutate, options), built = buildComposite(f.buildOptions);
  const args = { sourceRoot: f.root, evidenceRoot: f.buildOptions.outputDirectory, proofFile: built.proofFile, candidateIdentity: f.candidate };
  const verdict = validateComposite(args);
  assert.equal(verdict.kind, MODE); cases++; return { ...f, built, args, verdict };
}
function rejected(label, mutate, match = /RELEASE_CONTINUITY|BASELINE/, options) {
  const f = fixture(label, mutate, options); assert.throws(() => buildComposite(f.buildOptions), match); cases++;
}
function editedProof(f, mutate) {
  const value = JSON.parse(fs.readFileSync(f.built.proofFile)); mutate(value);
  fs.writeFileSync(f.built.proofFile, JSON.stringify(value, null, 2) + '\n');
}
function editRef(f, key, mutate) {
  editedProof(f, proof => {
    const target = path.join(f.args.evidenceRoot, proof[key].file), value = JSON.parse(fs.readFileSync(target)); mutate(value);
    fs.writeFileSync(target, JSON.stringify(value, null, 2) + '\n'); proof[key].sha256 = hash(target);
  });
}
try {
  const presentation = accepted('css', root => write(root, 'accelerated-launch/service/ui/styles.css', 'main { color: blue; }\n'));
  assert.deepEqual(presentation.verdict.requiredFocusedSections, ['b-ui', 'c-security']);
  assert.equal(presentation.verdict.baselineRaw.totals.passed, 3);
  assert.equal(presentation.verdict.freshFocusedRaw.totals.passed, 2);
  const additions = "LANE_IDS.security.unshift('a-core');\nLANE_IDS.consumer.unshift('c-security', 'a-core');\nLANE_IDS.browser.unshift('a-core');\n";
  const extended = accepted('lane-additions', root => write(root, 'accelerated-launch/service/ui/styles.css', 'main { color: navy; }\n'), { laneAdditions: additions, selectedSections: ['a-core', 'b-ui', 'c-security'] });
  assert.deepEqual(extended.verdict.requiredFocusedSections, ['a-core', 'b-ui', 'c-security']);
  assert.equal(extended.verdict.freshFocusedRaw.totals.passed, 3);
  accepted('lane-bracket-push-no-execution', root => write(root, 'accelerated-launch/service/ui/styles.css', 'main { color: navy; }\n'), { laneAdditions: "LANE_IDS['browser'].push('a-core');\nthrow Error('Lane source must never execute during proof validation');\n", selectedSections: ['a-core', 'b-ui', 'c-security'] });
  rejected('omitted-lane-addition', root => write(root, 'accelerated-launch/service/ui/styles.css', 'main { color: navy; }\n'), /planned sections/, { laneAdditions: additions });
  rejected('unknown-lane-addition', root => write(root, 'accelerated-launch/service/ui/styles.css', 'main { color: navy; }\n'), /unknown product section/, { laneAdditions: "LANE_IDS.security.unshift('unknown-section');\n" });
  rejected('dynamic-lane-addition', root => write(root, 'accelerated-launch/service/ui/styles.css', 'main { color: navy; }\n'), /literal section/, { laneAdditions: "LANE_IDS.security.unshift(extraSections);\n" });
  assert.equal(hash(presentation.buildOptions.baselineFile), hash(path.join(presentation.args.evidenceRoot, 'raw/baseline.json')));
  assert.equal(hash(presentation.buildOptions.focusedFile), hash(path.join(presentation.args.evidenceRoot, 'raw/focused.json')));
  assert(presentation.verdict.evidenceRefs.some(row => row.file.startsWith('before/')));
  assert(presentation.verdict.evidenceRefs.some(row => row.file === 'raw/tool-check-0.json'));
  const nested = validateComposite({ ...presentation.args, evidenceRoot: presentation.base });
  assert(nested.evidenceRefs.every(row => row.file.startsWith('proof/'))); cases++;
  assert.throws(() => buildComposite(presentation.buildOptions), /already exists/); cases++;
  const frozenRoot = path.join(presentation.base, 'frozen-source');
  for (const row of presentation.verdict.currentSourceHashes) write(frozenRoot, row.file, fs.readFileSync(path.join(presentation.root, row.file)));
  assert.equal(fs.existsSync(path.join(frozenRoot, '.git')), false);
  assert.equal(validateComposite({ ...presentation.args, sourceRoot: frozenRoot }).kind, MODE); cases++;
  write(frozenRoot, 'accelerated-launch/service/unknown-new.cjs', 'module.exports = true;\n');
  assert.throws(() => validateComposite({ ...presentation.args, sourceRoot: frozenRoot }), /current source inventory/); cases++;
  const operations = accepted('tool', root => write(root, 'accelerated-launch/service/deploy/unit-tool.cjs', "'use strict'; module.exports = false;\n"));
  assert(operations.built.proof.before_sources.some(row=>row.file.endsWith('/unchanged-control.sh')),'Unchanged orchestration outside full receipt hashes retains its committed baseline bytes');
  assert.deepEqual(operations.verdict.requiredFocusedSections, []); assert.equal(operations.verdict.freshFocusedRaw, null);
  const bookkeeping=accepted('bookkeeping',root=>write(root,'release-notes.md','Bookkeeping only\n'));
  const bookkeepingFrozen=path.join(bookkeeping.base,'frozen-source');
  for(const row of bookkeeping.verdict.currentSourceHashes)write(bookkeepingFrozen,row.file,fs.readFileSync(path.join(bookkeeping.root,row.file)));
  assert.equal(fs.existsSync(path.join(bookkeepingFrozen,'release-notes.md')),false);
  assert.equal(validateComposite({...bookkeeping.args,sourceRoot:bookkeepingFrozen}).kind,MODE);cases++;
  accepted('markup', root => write(root, 'accelerated-launch/service/ui/page.html', '<html><main>Fictional dashboard preview</main></html>\n'));
  const captured = accepted('captured', undefined, { captured: true });
  assert(captured.descriptor.dependencies.some(row => row.source === 'CAPTURED_TEST_DEPENDENCY'));
  rejected('captured-drift', root => write(root, 'accelerated-launch/service/tests/captured-helper.cjs', 'module.exports = false;\n'), /CAPTURED_BASELINE_DEPENDENCY_UNAVAILABLE/, { captured: true });
  rejected('runtime', root => write(root, 'accelerated-launch/service/app.cjs', "module.exports = { fictional: false };\n"), /fresh full\/provider/);
  rejected('reader-new', root => write(root, 'accelerated-launch/service/reader-new.cjs', 'module.exports = true;\n'), /fresh full\/provider/);
  rejected('test', root => write(root, 'accelerated-launch/service/tests/sections/a-core.cjs', "module.exports = { id: 'a-core', changed: true };\n"), /fresh full\/provider/);
  rejected('shared-js', root => write(root, 'accelerated-launch/service/ui/app.js', 'window.fixture = true;\n'), /fresh full\/provider/);
  rejected('unknown-ui', root => write(root, 'accelerated-launch/service/ui/config.json', '{"changed":true}\n'), /fresh full\/provider/);
  rejected('unknown-binary', root => write(root, 'accelerated-launch/service/ui/unknown.wasm', Buffer.from([0, 97, 115, 109])), /fresh full\/provider/);
  rejected('runtime-deletion', root => fs.unlinkSync(path.join(root, 'accelerated-launch/service/app.cjs')), /fresh full\/provider/);
  rejected('inline-script', root => write(root, 'accelerated-launch/service/ui/page.html', '<html><script>window.fixture = true;</script></html>\n'), /HTML executable/);
  rejected('unclosed-script', root => write(root, 'accelerated-launch/service/ui/page.html', '<html><script>window.fixture = true;'), /HTML executable/);
  rejected('handler', root => write(root, 'accelerated-launch/service/ui/page.html', '<html><main onclick="window.fixture=true">Fictional preview</main></html>\n'), /HTML executable/);
  rejected('script-url', root => write(root, 'accelerated-launch/service/ui/page.html', '<html><a href="javascript:alert(1)">Fictional preview</a></html>\n'), /HTML executable/);
  rejected('encoded-script-url', root => write(root, 'accelerated-launch/service/ui/page.html', '<html><a href="java&#115;cript&colon;alert(1)">Fictional preview</a></html>\n'), /HTML executable/);
  rejected('purchase-amount', root => write(root, 'accelerated-launch/service/ui/page.html', '<html><main>Fictional preview $7.95</main></html>\n'), /fresh full\/provider/);
  rejected('missing-fresh', root => write(root, 'accelerated-launch/service/ui/styles.css', 'main { color: pink; }\n'), /invalid evidence reference/, { beforeBuild: options => { options.focusedFile = null; } });
  rejected('incomplete-lane', root => write(root, 'accelerated-launch/service/ui/styles.css', 'main { color: pink; }\n'), /planned sections/, { beforeBuild: options => { options.plan.selected_sections = ['b-ui']; } });
  rejected('invalid-baseline-totals', undefined, /BASELINE_TOTALS_MISMATCH/, { beforeBuild: options => { const raw = JSON.parse(fs.readFileSync(options.baselineFile)); raw.totals.passed = 100; fs.writeFileSync(options.baselineFile, JSON.stringify(raw)); } });
  rejected('composite-baseline', undefined, /COMPLETE_PASSING_FULL_BASELINE_REQUIRED/, { beforeBuild: options => { const raw = JSON.parse(fs.readFileSync(options.baselineFile)); raw.mode = MODE; fs.writeFileSync(options.baselineFile, JSON.stringify(raw)); } });
  const failedFocused = accepted('failed-focused', root => write(root, 'accelerated-launch/service/ui/styles.css', 'main { color: gray; }\n'));
  editRef(failedFocused, 'focused', raw => { raw.execution.sections[0].completed = false; });
  assert.throws(() => validateComposite(failedFocused.args), /focused sections incomplete/); cases++;
  const forgedSelection = accepted('forged-selection', root => write(root, 'accelerated-launch/service/ui/styles.css', 'main { color: tan; }\n'));
  editRef(forgedSelection, 'focused', raw => { raw.execution.selected_sections = ['b-ui']; });
  assert.throws(() => validateComposite(forgedSelection.args), /focused section selection/); cases++;
  const staleFocused = accepted('stale-focused', root => write(root, 'accelerated-launch/service/ui/styles.css', 'main { color: black; }\n'));
  editRef(staleFocused, 'focused', raw => { raw.execution.source_hashes[0].sha256 = '0'.repeat(64); });
  assert.throws(() => validateComposite(staleFocused.args), /focused current source snapshot/); cases++;
  const drifted = accepted('drifted', root => write(root, 'accelerated-launch/service/ui/styles.css', 'main { color: plum; }\n'));
  write(drifted.root, 'accelerated-launch/service/ui/styles.css', 'main { color: red; }\n');
  assert.throws(() => validateComposite(drifted.args), /manifest|planned source|inventory/); cases++;
  const rawTamper = accepted('raw-tamper');
  fs.appendFileSync(path.join(rawTamper.args.evidenceRoot, 'raw/baseline.json'), '\n');
  assert.throws(() => validateComposite(rawTamper.args), /receipt changed/); cases++;
  const beforeTamper = accepted('before-tamper');
  fs.appendFileSync(path.join(beforeTamper.args.evidenceRoot, 'before/accelerated-launch/service/app.cjs'), '// changed\n');
  assert.throws(() => validateComposite(beforeTamper.args), /receipt changed/); cases++;
  const wrongIdentity = accepted('identity');
  assert.throws(() => validateComposite({ ...wrongIdentity.args, candidateIdentity: { ...wrongIdentity.candidate, git_head: '0'.repeat(40) } }), /candidate identity/); cases++;
  const wrongTools = accepted('wrong-tools', root => write(root, 'accelerated-launch/service/deploy/unit-tool.cjs', 'module.exports = 3;\n'));
  editRef(wrongTools, 'tools_verification', raw => { raw.plan_sha256 = '0'.repeat(64); });
  assert.throws(() => validateComposite(wrongTools.args), /tool verification does not match/); cases++;
  const unchecked = accepted('unchecked-tool', root => write(root, 'accelerated-launch/service/deploy/unit-tool.cjs', 'module.exports = 4;\n'));
  editRef(unchecked, 'tools_verification', raw => { raw.source_hashes = raw.source_hashes.filter(row => !row.file.endsWith('/unit-tool.cjs')); });
  assert.throws(() => validateComposite(unchecked.args), /lacks hash-bound checks/); cases++;
  const noChecks = accepted('no-tool-checks');
  editRef(noChecks, 'tools_verification', raw => { raw.checks = []; });
  assert.throws(() => validateComposite(noChecks.args), /passing tool checks/); cases++;
  const stepTamper = accepted('step-tamper');
  fs.appendFileSync(path.join(stepTamper.args.evidenceRoot, 'raw/tool-check-0.json'), '\n');
  assert.throws(() => validateComposite(stepTamper.args), /receipt changed/); cases++;
  const dup = accepted('duplicate-path');
  editedProof(dup, proof => { proof.current_source_hashes.push({ ...proof.current_source_hashes[0], file: proof.current_source_hashes[0].file.toUpperCase() }); });
  assert.throws(() => validateComposite(dup.args), /duplicate source path/); cases++;
  const outside = accepted('outside-ref');
  editedProof(outside, proof => { proof.baseline.file = '../baseline.json'; });
  assert.throws(() => validateComposite(outside.args), /unsafe relative path/); cases++;
  console.log('PASS: ' + cases + ' continuity reuse/refusal checks; fictional temporary repositories only; no product or hosted acceptance claimed');
} finally {
  const resolved = path.resolve(temp), intended = path.resolve(os.tmpdir());
  assert(resolved.startsWith(intended + path.sep) && path.basename(resolved).startsWith('crp-continuity-unit-'));
  fs.rmSync(resolved, { recursive: true, force: true });
}
