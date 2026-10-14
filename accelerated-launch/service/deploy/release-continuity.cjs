'use strict';
// Explicit inherited product proof. Raw executions are copied unchanged, never
// relabelled as a fresh full run. No product modules or hosted services are used.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const MANIFEST = 'accelerated-launch/service/deploy/release-manifest.json';
const RUNNER = 'accelerated-launch/service/tests/run-tests.cjs';
const LANES = 'accelerated-launch/service/tests/verification-lanes.cjs';
const MODE = 'ACCEPTED_FULL_WITH_CONTINUITY';
const POLICY = 'CRP_OWNER_CHANGE_AWARE_RELEASE_PROCESS_001';
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const hash = file => sha(fs.readFileSync(file));
const json = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const sorted = items => [...items].sort();
const substantive = (files,protectedFiles) => files.filter(file=>!/\.md$/i.test(file) || protectedFiles.has(file));
const sameSet = (a, b) => Array.isArray(a) && Array.isArray(b) && new Set(a).size === a.length && equal(sorted(a), sorted(b));
function assert(value, reason) { if (!value) throw Error('RELEASE_CONTINUITY: ' + reason); }
function name(value) {
  assert(typeof value === 'string' && value && !/[\r\n\0]/.test(value), 'invalid relative path');
  const file = value.replace(/\\/g, '/');
  assert(!/^(?:\/|[A-Za-z]:)/.test(file) && !file.split('/').some(part => !part || part === '.' || part === '..'), 'unsafe relative path');
  return file;
}
function inside(root, relative, existing = true) {
  const base = path.resolve(root), file = path.resolve(base, name(relative));
  assert(file.startsWith(base + path.sep), 'path outside root');
  if (existing) {
    const real = fs.realpathSync(file), realBase = fs.realpathSync(base);
    assert(real.startsWith(realBase + path.sep) && fs.statSync(real).isFile(), 'reference outside root or not a file');
  }
  return file;
}
function rows(values) {
  assert(Array.isArray(values), 'source inventory absent');
  const result = values.map(row => {
    assert(row && /^[a-f0-9]{64}$/i.test(row.sha256 || ''), 'invalid source hash');
    return { file: name(row.file), sha256: row.sha256.toUpperCase() };
  }).sort((a, b) => a.file.localeCompare(b.file));
  assert(new Set(result.map(row => row.file.toLowerCase())).size === result.length, 'duplicate source path');
  return result;
}
function walkSources(root) {
  const files = [];
  function visit(relative) {
    const dir = path.resolve(root, relative);
    assert(fs.existsSync(dir) && fs.statSync(dir).isDirectory(), 'source directory absent: ' + relative);
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      if (['out', 'node_modules'].includes(item.name)) continue;
      const file = name(relative + '/' + item.name);
      assert(!item.isSymbolicLink(), 'source symlink refused: ' + file);
      if (item.isDirectory()) visit(file);
      else if (item.isFile() && /\.(?:cjs|js|json|html|css)$/.test(item.name)) files.push(file);
    }
  }
  visit('accelerated-launch/service'); visit('accelerated-launch/adapters');
  return sorted(files);
}
function currentRows(root, manifestFiles, descriptor, plan) {
  const files = new Set([...walkSources(root), ...manifestFiles.map(row => row.file), ...Object.entries(plan.source_snapshot || {}).filter(([, digest]) => digest !== null).map(([file]) => name(file))]);
  for (const row of descriptor.dependencies) if (fs.existsSync(inside(root, row.file, false))) files.add(name(row.file));
  return rows([...files].map(file => ({ file, sha256: hash(inside(root, file)) })));
}
function sectionFiles(root) {
  const source = fs.readFileSync(inside(root, RUNNER), 'utf8');
  const block = /const SECTION_FILES = \[([\s\S]*?)\];/.exec(source)?.[1];
  assert(block, 'current section roster unavailable');
  const files = [...block.matchAll(/^\s*'([a-z0-9-]+\.cjs)'\s*[,\]]?/gm)].map(match => match[1]);
  assert(files.length && new Set(files).size === files.length, 'invalid current section roster');
  return files;
}
function focusedSections(root, baseline, plan, risk) {
  const presentation = risk.mode === 'PRESENTATION';
  const lanes = presentation ? ['consumer', 'security', 'browser'] : [];
  assert(sameSet(plan.selected_lanes || [], lanes), 'planned lanes differ from required policy');
  const named = presentation ? baseline.sections.filter(row => /ui|auth|sign|flow|plain-text|landing|branding|packet-review/i.test(row.id)).map(row => row.id) : [];
  if (!presentation) { assert(sameSet(plan.selected_sections || [], []), 'operations plan selected product sections'); return []; }
  const source = fs.readFileSync(inside(root, LANES), 'utf8'), required = new Set(named);
  for (const lane of lanes) {
    const block = new RegExp('(?:\\b' + lane + '|[\\\"\\\']' + lane + '[\\\"\\\'])\\s*:\\s*\\[([^\\]]*)\\]').exec(source)?.[1];
    assert(block, 'required lane unavailable: ' + lane);
    const ids = [...block.matchAll(/['"]([a-z0-9-]+)['"]/g)].map(match => match[1]);
    assert(ids.length, 'required lane empty: ' + lane);
    ids.forEach(id => required.add(id));
  }
  const inventory = baseline.sections.map(row => row.id);
  assert([...required].every(id => inventory.includes(id)), 'required lane contains unknown product section');
  assert(sameSet(plan.selected_sections || [], [...required]), 'planned sections differ from required policy');
  return sorted(required);
}
// Compare executable HTML surfaces separately from static markup. Payment
// surfaces are intentionally conservative: changes require provider acceptance.
function htmlEffects(before, after) {
  const scripts = text => [...text.matchAll(/<script\b[^>]*>[\s\S]*?(?:<\/script\s*>|$)/gi)].map(match => match[0]);
  const handlers = text => [...text.matchAll(/\bon[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi)].map(match => match[0]);
  const decoded = text => text.replace(/&#(?:x([a-f0-9]+)|(\d+));?/gi, (_, hex, number) => {
    const code = parseInt(hex || number, hex ? 16 : 10); return code <= 0x10ffff ? String.fromCodePoint(code) : '';
  }).replace(/&(?:colon|Tab|NewLine);/g, entity => ({ '&colon;': ':', '&Tab;': '\t', '&NewLine;': '\n' })[entity]);
  const urls = text => [...decoded(text).replace(/[\t\r\n]/g, '').matchAll(/(?:javascript\s*:|data\s*:\s*(?:text\/html|application\/javascript|image\/svg\+xml)|<iframe\b|<object\b|<embed\b)[^>]*/gi)].map(match => match[0]);
  const executable = !equal(scripts(before), scripts(after)) || !equal(handlers(before), handlers(after)) || !equal(urls(before), urls(after));
  const payment = /billing|checkout|stripe|entitlement|subscription|payment|plan_code|price_|purchase|\bplans?\b|[£$€]|\b(?:CAD|USD|AUD|GBP)\b/i.test(before + '\n' + after);
  return { executable, payment };
}
function portableRef(root, file) { return name(path.relative(root, path.resolve(file)).replace(/\\/g, '/')); }
function recordRef(root, file) { return { file: portableRef(root, file), sha256: hash(file) }; }
function verifyRef(root, ref) {
  assert(ref && /^[a-f0-9]{64}$/i.test(ref.sha256 || ''), 'invalid evidence reference');
  const file = inside(root, ref.file);
  assert(hash(file) === ref.sha256.toUpperCase(), 'evidence receipt changed: ' + ref.file);
  return file;
}
function write(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
}
function copyBytes(bytes, file) {
  fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, bytes, { flag: 'wx' });
}
function committedBlobs(root, commit, files) {
  assert(/^[a-f0-9]{40}$/.test(commit || ''), 'baseline commit invalid');
  const names = files.map(name), output = execFileSync('git', ['cat-file', '--batch'], {
    cwd: root, input: names.map(file => commit + ':' + file).join('\n') + '\n', maxBuffer: 128 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe']
  });
  const result = new Map(); let offset = 0;
  for (const file of names) {
    const end = output.indexOf(10, offset); assert(end >= 0, 'invalid Git blob response');
    const header = output.subarray(offset, end).toString(); offset = end + 1;
    if (header.endsWith(' missing')) { result.set(file, null); continue; }
    const match = /^[a-f0-9]{40} blob (\d+)$/.exec(header); assert(match, 'baseline source is not committed blob');
    const length = Number(match[1]); assert(Number.isSafeInteger(length) && offset + length < output.length, 'invalid Git blob length');
    result.set(file, output.subarray(offset, offset + length)); offset += length + 1;
  }
  return result;
}

function createContinuityTools(inputs) {
  const policy = () => inputs || require('./release-inputs.cjs');
  function inspect({ sourceRoot, evidenceRoot, proofFile, candidateIdentity }) {
    const tools = policy(), root = path.resolve(sourceRoot), outerEvidence = path.resolve(evidenceRoot);
    const proofPath = inside(outerEvidence, portableRef(outerEvidence, proofFile)), evidence = path.dirname(proofPath);
    const proof = json(proofPath);
    assert(proof.schema === 1 && proof.mode === MODE && proof.policy === POLICY, 'unsupported proof mode or composite chain');
    assert(proof.candidate && candidateIdentity, 'candidate identity required');
    for (const key of ['build_id', 'manifest_digest', 'git_head']) assert(proof.candidate[key] === candidateIdentity[key], 'candidate identity mismatch: ' + key);
    assert(/^[a-f0-9]{40}$/.test(proof.candidate.git_head || ''), 'candidate source commit invalid');
    const baselineFile = verifyRef(evidence, proof.baseline), baseline = json(baselineFile), descriptor = proof.baseline.descriptor;
    assert(descriptor?.schema === 1 && descriptor.receipt_sha256 === hash(baselineFile), 'baseline descriptor receipt mismatch');
    assert(/^[a-f0-9]{40}$/.test(descriptor.base_commit || ''), 'baseline descriptor commit invalid');
    const full = tools.fullReceiptIdentity(baseline, descriptor.section_ids);
    assert(sameSet(baseline.selected_sections, descriptor.section_ids), 'baseline selected section inventory mismatch');
    const declared = rows(descriptor.dependencies);
    assert(equal(declared, full.dependencies), 'baseline descriptor dependency inventory mismatch');
    assert(descriptor.dependencies.every(row => ['COMMITTED', 'CAPTURED_TEST_DEPENDENCY'].includes(row.source)), 'undeclared captured dependency');
    const beforeRows = rows(proof.before_sources), beforeByFile = new Map(proof.before_sources.map(row => [name(row.file), row]));
    for (const row of proof.before_sources) assert(hash(verifyRef(evidence, { file: row.ref, sha256: row.sha256 })) === row.sha256.toUpperCase(), 'before source mismatch');
    const beforeManifestRow = beforeByFile.get(MANIFEST); assert(beforeManifestRow, 'baseline manifest snapshot absent');
    const beforeManifestFile = verifyRef(evidence, { file: beforeManifestRow.ref, sha256: descriptor.manifest_sha256 });
    const beforeManifest = tools.manifestIdentity(json(beforeManifestFile));
    assert(beforeManifest.digest === descriptor.manifest_digest && descriptor.build_id === 'crp-v1-' + beforeManifest.digest.slice(0, 16).toLowerCase(), 'baseline manifest identity mismatch');
    for (const row of [...declared, ...beforeManifest.files]) assert(beforeByFile.get(row.file)?.sha256.toUpperCase() === row.sha256, 'baseline snapshot inventory mismatch: ' + row.file);
    const shippedBefore = new Set(beforeManifest.files.map(row => row.file));
    assert(descriptor.dependencies.every(row => row.source !== 'CAPTURED_TEST_DEPENDENCY' || !shippedBefore.has(row.file)), 'shipped dependency cannot use capture exception');
    const planFile = verifyRef(evidence, proof.plan), plan = json(planFile);
    assert(plan.base_commit === descriptor.base_commit && plan.baseline?.sha256 === descriptor.receipt_sha256 && plan.baseline?.build_id === descriptor.build_id && equal(plan.baseline?.descriptor, descriptor), 'plan baseline mismatch');
    const manifestFile = inside(root, MANIFEST), manifest = tools.manifestIdentity(json(manifestFile));
    assert(manifest.digest === proof.candidate.manifest_digest && proof.candidate.build_id === 'crp-v1-' + manifest.digest.slice(0, 16).toLowerCase(), 'candidate manifest mismatch');
    if (candidateIdentity.files !== undefined) assert(candidateIdentity.files === manifest.files.length, 'candidate file count mismatch');
    for (const row of manifest.files) assert(hash(inside(root, row.file)) === row.sha256, 'shipped source differs from manifest: ' + row.file);
    assert(plan.source_snapshot && typeof plan.source_snapshot === 'object' && !Array.isArray(plan.source_snapshot), 'planned source snapshot absent');
    for (const [file, digest] of Object.entries(plan.source_snapshot)) {
      const present = fs.existsSync(inside(root, file, false));
      assert(digest === null ? !present : present && /^[a-f0-9]{64}$/i.test(digest) && hash(inside(root, file)) === digest.toUpperCase(), 'planned source changed: ' + file);
    }
    const current = currentRows(root, manifest.files, descriptor, plan);
    assert(equal(current, rows(proof.current_source_hashes)), 'current source inventory/hash mismatch');
    assert(sameSet(sectionFiles(root), baseline.sections.map(row => row.file)), 'product section roster changed');
    const currentByFile = new Map(current.map(row => [row.file, row.sha256]));
    const protectedFiles=new Set([...declared,...beforeManifest.files,...manifest.files].map(row=>row.file));
    const comparisonFiles = new Set([...beforeRows.map(row => row.file), ...current.map(row => row.file), ...substantive((plan.changed_files || []).map(name),protectedFiles)]);
    const changes = [], purchasePresentationFiles = [];
    for (const file of sorted(comparisonFiles)) {
      const before = beforeByFile.get(file)?.sha256.toUpperCase() || null;
      const present = fs.existsSync(inside(root, file, false));
      const after = present ? hash(inside(root, file)) : null;
      if (before === after) continue;
      changes.push({ file, before_sha256: before, after_sha256: after });
      if (/\.(?:html|svg)$/i.test(file) && file.startsWith('accelerated-launch/service/ui/')) {
        const oldText = before ? fs.readFileSync(inside(evidence, beforeByFile.get(file).ref), 'utf8') : '';
        const newText = after ? fs.readFileSync(inside(root, file), 'utf8') : '';
        const effects = htmlEffects(oldText, newText);
        assert(!effects.executable, 'HTML executable surface changed: ' + file);
        if (effects.payment) purchasePresentationFiles.push(file);
      }
    }
    assert(equal(changes, proof.changed_files), 'changed source inventory mismatch');
    assert(sameSet(substantive(plan.changed_files,protectedFiles), changes.map(row => row.file)), 'plan omitted or added changed dependencies');
    const risk = tools.classify(changes.map(row => row.file), { purchasePresentationFiles });
    assert(!risk.full_regression_required && !risk.billing_journey_required, 'changed dependency requires fresh full/provider proof');
    assert(plan.risk?.mode === risk.mode && !plan.risk.full_regression_required && !plan.risk.billing_journey_required, 'plan classification mismatch');
    const required = focusedSections(root, baseline, plan, risk);
    assert(sameSet(proof.required_focused_sections, required), 'focused policy inventory mismatch');
    let focused = null;
    if (required.length) {
      const file = verifyRef(evidence, proof.focused), raw = json(file), execution = raw.execution;
      assert(raw.mode === 'FOCUSED' && execution?.mode === 'FOCUSED', 'fresh focused receipt required');
      assert(Array.isArray(execution.sections) && sameSet(execution.selected_sections, required) && sameSet(execution.sections.map(row => row.id), required), 'focused section selection mismatch');
      assert(execution.sections.every(row => baseline.sections.some(original => original.id === row.id && original.file === row.file)), 'focused section file differs from baseline contract');
      assert(execution.sections.every(row => row.completed === true && row.failed === 0 && !row.section_exception && Array.isArray(row.skipped) && row.skipped.length === 0 && Number.isInteger(row.passed) && row.passed > 0), 'focused sections incomplete or failed');
      const totals = { passed: execution.sections.reduce((n, row) => n + row.passed, 0), failed: 0, skipped: 0 };
      assert(equal(execution.totals, totals) && equal(raw.totals, totals) && execution.source_drift?.length === 0, 'focused totals or source continuity failed');
      assert(equal(rows(execution.source_hashes), rows(walkSources(root).map(file => ({ file, sha256: hash(inside(root, file)) })))), 'focused current source snapshot mismatch');
      assert(sameSet(execution.unrun_sections, descriptor.section_ids.filter(id => !required.includes(id))), 'focused unrun section inventory mismatch');
      focused = raw;
    } else assert(proof.focused === null, 'operations proof cannot claim a focused run');
    const toolsFile = verifyRef(evidence, proof.tools_verification), toolProof = json(toolsFile);
    assert(toolProof.passed === true && toolProof.plan_sha256 === sha(JSON.stringify(plan)), 'tool verification does not match plan');
    assert(Array.isArray(toolProof.checks) && toolProof.checks.length && toolProof.checks.every(row => row && typeof row.id === 'string' && row.id && row.passed === true), 'passing tool checks required');
    const originalChecks = toolProof.checks.filter(row => row.file !== undefined);
    assert(Array.isArray(proof.tool_check_refs) && proof.tool_check_refs.length === originalChecks.length, 'tool check reference inventory mismatch');
    for (let index = 0; index < originalChecks.length; index++) {
      const original = originalChecks[index], copied = proof.tool_check_refs[index];
      assert(original.id === copied.id && /^[a-f0-9]{64}$/i.test(original.sha256 || '') && original.sha256.toUpperCase() === copied.sha256, 'tool check receipt identity mismatch');
      verifyRef(evidence, copied);
    }
    const toolSources = rows(toolProof.source_hashes);
    for (const row of toolSources) assert(hash(inside(root, row.file)) === row.sha256, 'verified tool source changed');
    const checked = new Map(toolSources.map(row => [row.file, row.sha256]));
    for (const row of changes.filter(row => row.after_sha256 && row.file.startsWith('accelerated-launch/service/deploy/') && /\.(?:cjs|js|json|sh|ps1)$/.test(row.file))) assert(checked.get(row.file) === row.after_sha256, 'changed tool lacks hash-bound checks: ' + row.file);
    assert(equal(proof.unchanged_dependencies, declared.filter(row => currentByFile.get(row.file) === row.sha256)), 'unchanged dependency inventory mismatch');
    const refs = [proof.baseline, proof.plan, proof.tools_verification, ...(proof.focused ? [proof.focused] : []),
      ...proof.tool_check_refs, ...proof.before_sources.map(row => ({ file: row.ref, sha256: row.sha256 })),
      { file: portableRef(evidence, proofFile), sha256: hash(proofFile) }].map(ref => ({ file: portableRef(outerEvidence, inside(evidence, ref.file)), sha256: ref.sha256 }));
    return { kind: MODE, baselineRaw: baseline, baselineSha: hash(baselineFile), currentSourceHashes: current,
      requiredFocusedSections: required, freshFocusedRaw: focused, evidenceRefs: refs };
  }
  function buildComposite({ root, plan, baselineFile, focusedFile = null, toolsVerificationFile, candidate, outputDirectory }) {
    const tools = policy(), sourceRoot = path.resolve(root), out = path.resolve(outputDirectory);
    assert(!fs.existsSync(out), 'output directory already exists');
    const initialRisk = tools.classify(plan.changed_files || []);
    assert(!plan.risk?.full_regression_required && !plan.risk?.billing_journey_required && !initialRisk.full_regression_required && !initialRisk.billing_journey_required, 'changed dependency requires fresh full/provider proof');
    const descriptor = plan.baseline?.descriptor;
    tools.validateBaselineDescriptor({ root: sourceRoot, baseCommit: plan.base_commit, baselineFile, sectionIds: descriptor?.section_ids, descriptor });
    assert(hash(baselineFile) === plan.baseline.sha256, 'planned baseline receipt changed');
    const baselineManifestBytes = committedBlobs(sourceRoot, descriptor.base_commit, [MANIFEST]).get(MANIFEST);
    const baselineManifest = tools.manifestIdentity(JSON.parse(baselineManifestBytes.toString()));
    const protectedFiles=new Set([...descriptor.dependencies,...baselineManifest.files].map(row=>row.file));
    const allNames = sorted(new Set([...descriptor.dependencies.map(row => row.file), ...baselineManifest.files.map(row => row.file), MANIFEST, ...substantive((plan.changed_files || []).map(name),protectedFiles)]));
    const blobs = committedBlobs(sourceRoot, descriptor.base_commit, allNames), captured = new Map(descriptor.dependencies.filter(row => row.source === 'CAPTURED_TEST_DEPENDENCY').map(row => [row.file, row.sha256]));
    fs.mkdirSync(out, { recursive: true });
    const baselineDest = path.join(out, 'raw/baseline.json'), planDest = path.join(out, 'raw/plan.json'), toolsDest = path.join(out, 'raw/tools.json');
    copyBytes(fs.readFileSync(baselineFile), baselineDest); write(planDest, plan); copyBytes(fs.readFileSync(toolsVerificationFile), toolsDest);
    const toolCheckRefs = [];
    for (const check of json(toolsDest).checks || []) if (check.file !== undefined) {
      assert(typeof check.file === 'string' && /^[a-f0-9]{64}$/i.test(check.sha256 || ''), 'tool check receipt reference invalid');
      const original = path.isAbsolute(check.file) ? check.file : path.resolve(sourceRoot, check.file);
      assert(hash(original) === check.sha256.toUpperCase(), 'tool check receipt changed before capture');
      const copied = path.join(out, 'raw/tool-check-' + toolCheckRefs.length + '.json'); copyBytes(fs.readFileSync(original), copied);
      toolCheckRefs.push({ id: check.id, ...recordRef(out, copied) });
    }
    let focusedDest = null;
    if (focusedFile) { focusedDest = path.join(out, 'raw/focused.json'); copyBytes(fs.readFileSync(focusedFile), focusedDest); }
    const beforeSources = [];
    for (const file of allNames) {
      let bytes = blobs.get(file);
      if (!bytes && captured.has(file)) { bytes = fs.readFileSync(inside(sourceRoot, file)); assert(sha(bytes) === captured.get(file), 'captured dependency changed'); }
      if (!bytes) continue;
      const dest = inside(out, 'before/' + file, false); copyBytes(bytes, dest);
      beforeSources.push({ file, sha256: sha(bytes), ref: portableRef(out, dest) });
    }
    const manifest = tools.manifestIdentity(json(inside(sourceRoot, MANIFEST))), current = currentRows(sourceRoot, manifest.files, descriptor, plan);
    const beforeMap = new Map(beforeSources.map(row => [row.file, row.sha256]));
    const compareNames = sorted(new Set([...beforeSources.map(row => row.file), ...current.map(row => row.file), ...substantive((plan.changed_files || []).map(name),protectedFiles)]));
    const changed = compareNames.map(file => ({ file, before_sha256: beforeMap.get(file) || null, after_sha256: fs.existsSync(inside(sourceRoot, file, false)) ? hash(inside(sourceRoot, file)) : null })).filter(row => row.before_sha256 !== row.after_sha256);
    const proofFile = path.join(out, 'product-proof.json');
    const proof = { schema: 1, mode: MODE, policy: POLICY, created_at: new Date().toISOString(), candidate,
      baseline: { ...recordRef(out, baselineDest), descriptor }, plan: recordRef(out, planDest), tools_verification: recordRef(out, toolsDest),
      tool_check_refs: toolCheckRefs,
      focused: focusedDest ? recordRef(out, focusedDest) : null, before_sources: beforeSources, current_source_hashes: current,
      changed_files: changed, required_focused_sections: focusedSections(sourceRoot, json(baselineFile), plan, plan.risk),
      unchanged_dependencies: rows(descriptor.dependencies).filter(row => current.some(actual => actual.file === row.file && actual.sha256 === row.sha256)),
      evidence_policy: 'Original full and fresh focused executions retain separate identities, dates, scopes and totals. This composite is not a fresh full execution, hosted journey or current provider configuration check.' };
    write(proofFile, proof);
    inspect({ sourceRoot, evidenceRoot: out, proofFile, candidateIdentity: candidate });
    return { proofFile, proof, kind: MODE };
  }
  return { buildComposite, validateComposite: inspect };
}

function buildComposite(options) { return createContinuityTools().buildComposite(options); }
function validateComposite(options) { return createContinuityTools().validateComposite(options); }
module.exports = { buildComposite, validateComposite, createContinuityTools, MODE, POLICY };
