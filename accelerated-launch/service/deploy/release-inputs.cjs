'use strict';
// Read-only release input checks. No product module is loaded and no receipt is written.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { createRequire, isBuiltin } = require('node:module');

const MANIFEST_FILE = 'accelerated-launch/service/deploy/release-manifest.json';
const sha = value => crypto.createHash('sha256').update(value).digest('hex').toUpperCase();
const normalize = value => String(value).replace(/\\/g, '/');
const hashPattern = /^[a-f0-9]{64}$/i;
function fail(code, file) {
  const error = new Error(code + (file ? ': ' + file : ''));
  error.code = code;
  throw error;
}
function relativeName(value) {
  if (typeof value !== 'string' || !value || /[\r\n\0]/.test(value)) fail('INVALID_RELEASE_PATH');
  const file = normalize(value);
  if (path.isAbsolute(value) || /^[A-Za-z]:/.test(file) || file.startsWith('/') || file.split('/').includes('..')) fail('UNSAFE_RELEASE_PATH', file);
  return file.replace(/^\.\//, '');
}
function inside(root, value) {
  const file = relativeName(value), absolute = path.resolve(root, file);
  if (!absolute.startsWith(path.resolve(root) + path.sep)) fail('UNSAFE_RELEASE_PATH', file);
  if (fs.existsSync(absolute)) {
    const realRoot = fs.realpathSync(root), realFile = fs.realpathSync(absolute);
    if (!realFile.startsWith(realRoot + path.sep)) fail('RELEASE_INPUT_SYMLINK_OUTSIDE_WORKSPACE', file);
  }
  return absolute;
}
function readJson(file, code) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { fail(code); }
}
function git(root, args, input) {
  try { return execFileSync('git', args, { cwd: root, input, maxBuffer: 128 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'] }); }
  catch { fail('GIT_RELEASE_INPUT_UNAVAILABLE'); }
}
function resolveCommit(root, commit) {
  if (typeof commit !== 'string' || !commit || commit.startsWith('-') || /[\r\n\0]/.test(commit)) fail('INVALID_BASE_COMMIT');
  const resolved = git(root, ['rev-parse', '--verify', commit + '^{commit}']).toString('utf8').trim();
  if (!/^[a-f0-9]{40}$/.test(resolved)) fail('INVALID_BASE_COMMIT');
  return resolved;
}
// One Git process for the entire inventory, including binary blobs.
function committedBlobs(root, commit, files) {
  if (!files.length) return new Map();
  const names = files.map(relativeName), specs = names.map(file => commit + ':' + file);
  const output = git(root, ['cat-file', '--batch'], specs.join('\n') + '\n');
  const result = new Map(); let offset = 0;
  for (const file of names) {
    const end = output.indexOf(10, offset);
    if (end < 0) fail('INVALID_GIT_BLOB_RESPONSE');
    const header = output.subarray(offset, end).toString('utf8'); offset = end + 1;
    if (header.endsWith(' missing')) { result.set(file, null); continue; }
    const match = /^[a-f0-9]{40} blob (\d+)$/.exec(header);
    if (!match) fail('RELEASE_INPUT_IS_NOT_COMMITTED_FILE', file);
    const length = Number(match[1]);
    if (!Number.isSafeInteger(length) || offset + length >= output.length) fail('INVALID_GIT_BLOB_RESPONSE');
    result.set(file, output.subarray(offset, offset + length)); offset += length + 1;
  }
  return result;
}

function classify(files, options = {}) {
  const purchase = new Set((options.purchasePresentationFiles || []).map(relativeName));
  const billingFiles = new Set((options.billingFiles || []).map(relativeName));
  const classifications = [...new Set(files.map(relativeName))].sort().map(file => {
    if (/\.md$/i.test(file)) return { file, component: 'documentation', full: false, billing: false };
    // A tool's filename must not turn a tooling-only edit into a provider purchase.
    if (file.startsWith('accelerated-launch/service/deploy/')) return { file, component: 'operations', full: false, billing: false };
    const ui = file.startsWith('accelerated-launch/service/ui/');
    const staticUi = ui && /\.(html|css|svg|png|jpe?g|webp|gif|ico|ttf|woff2?|txt)$/i.test(file);
    const billing = billingFiles.has(file) || purchase.has(file) ||
      /(?:^|\/)(?:billing[^/]*|entitlement|stripe|payment-provider|checkout(?:-purchase)?|upgrade-credit|plan-catalog|pricing-location)\.(?:cjs|js|mjs|json|html)$/i.test(file) ||
      (staticUi && /\/(?:checkout|purchase|pricing|billing|subscription)[^/]*\.html$/i.test(file));
    if (staticUi) return { file, component: 'presentation', full: false, billing };
    if (file.startsWith('accelerated-launch/service/tests/')) return { file, component: 'test_contract', full: true, billing };
    return { file, component: billing ? 'billing' : ui ? 'shared_ui' : 'shared_or_unknown', full: true, billing };
  });
  const full = classifications.some(row => row.full), presentation = classifications.some(row => row.component === 'presentation');
  return {
    mode: full ? 'FULL' : presentation ? 'PRESENTATION' : 'OPERATIONS_OR_DOCUMENTATION',
    full_regression_required: full,
    billing_journey_required: classifications.some(row => row.billing),
    hosted_journey_required: full || presentation,
    reason: full ? 'Shared runtime, test contract or unknown executable dependency changed' : presentation ? 'Served presentation changed; affected consumer, security and browser checks required' : 'No product executable changed',
    classifications
  };
}

function manifestIdentity(manifest) {
  if (!manifest || !Array.isArray(manifest.groups)) fail('INVALID_RELEASE_MANIFEST');
  const files = [], groupRows = [], groupIds = new Set(), names = new Set();
  const digest = rows => sha(rows.map(row => row.file + '\n' + row.sha256 + '\n').join(''));
  for (const group of manifest.groups) {
    if (!group || typeof group.id !== 'string' || !group.id || groupIds.has(group.id) || !Array.isArray(group.files)) fail('INVALID_RELEASE_MANIFEST');
    groupIds.add(group.id);
    for (const row of group.files) {
      if (!row || !hashPattern.test(row.sha256 || '')) fail('INVALID_MANIFEST_FILE_HASH');
      const file = relativeName(row.file);
      if (names.has(file)) fail('DUPLICATE_MANIFEST_FILE', file);
      names.add(file); files.push({ file, sha256: row.sha256.toUpperCase() });
    }
    if (group.file_count !== group.files.length || digest(group.files) !== group.digest) fail('INVALID_MANIFEST_GROUP_DIGEST', group.id);
    if (group.files.length) groupRows.push({ file: 'group:' + group.id, sha256: group.digest });
  }
  if (files.length !== manifest.total_file_count || digest(groupRows) !== manifest.manifest_digest) fail('INVALID_RELEASE_MANIFEST_DIGEST');
  return { digest: manifest.manifest_digest, files };
}
function sectionInventory(ids) {
  if (!Array.isArray(ids) || !ids.length || ids.some(id => typeof id !== 'string' || !/^[A-Za-z0-9_-]+$/.test(id)) || new Set(ids).size !== ids.length) fail('EXPECTED_SECTION_INVENTORY_REQUIRED');
  return [...ids].sort();
}
function fullReceiptIdentity(receipt, sectionIds) {
  const expected = sectionInventory(sectionIds);
  if (!receipt || receipt.mode !== 'FULL_CURRENT_PRODUCT' || !Number.isInteger(receipt.totals?.passed) || receipt.totals.passed < 1 || receipt.totals.failed !== 0 || receipt.totals.skipped !== 0 || !Array.isArray(receipt.unrun_sections) || receipt.unrun_sections.length || !Array.isArray(receipt.source_drift) || receipt.source_drift.length || !Array.isArray(receipt.sections) || !Array.isArray(receipt.source_hashes) || !receipt.source_hashes.length) fail('COMPLETE_PASSING_FULL_BASELINE_REQUIRED');
  if (receipt.sections.some(row => !row || !row.completed || row.failed !== 0 || row.section_exception || !Array.isArray(row.skipped) || row.skipped.length || !Number.isInteger(row.passed) || row.passed < 0)) fail('INCOMPLETE_BASELINE_SECTION');
  const actual = receipt.sections.map(row => row.id).sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) fail('BASELINE_SECTION_INVENTORY_MISMATCH');
  if (receipt.sections.reduce((sum, row) => sum + row.passed, 0) !== receipt.totals.passed) fail('BASELINE_TOTALS_MISMATCH');
  const dependencies = receipt.source_hashes.map(row => {
    if (!row || !hashPattern.test(row.sha256 || '')) fail('INVALID_BASELINE_DEPENDENCY_HASH');
    return { file: relativeName(row.file), sha256: row.sha256.toUpperCase() };
  }).sort((a, b) => a.file.localeCompare(b.file));
  if (new Set(dependencies.map(row => row.file)).size !== dependencies.length) fail('DUPLICATE_BASELINE_DEPENDENCY');
  return { sectionIds: expected, dependencies };
}
function createBaselineDescriptor(options) {
  const root = path.resolve(options.root), commit = resolveCommit(root, options.baseCommit);
  const baselineFile = path.resolve(options.baselineFile);
  let receiptBytes; try { receiptBytes = fs.readFileSync(baselineFile); } catch { fail('BASELINE_RECEIPT_UNREADABLE'); }
  const receipt = readJson(baselineFile, 'BASELINE_RECEIPT_UNREADABLE');
  const full = fullReceiptIdentity(receipt, options.sectionIds);
  const blobs = committedBlobs(root, commit, [MANIFEST_FILE, ...full.dependencies.map(row => row.file).filter(file => file !== MANIFEST_FILE)]);
  const manifestBytes = blobs.get(MANIFEST_FILE);
  if (!manifestBytes) fail('BASE_MANIFEST_NOT_COMMITTED');
  let manifest; try { manifest = JSON.parse(manifestBytes.toString('utf8')); } catch { fail('BASE_MANIFEST_UNREADABLE'); }
  const identity = manifestIdentity(manifest);
  if (options.manifest && manifestIdentity(options.manifest).digest !== identity.digest) fail('BASE_MANIFEST_IDENTITY_MISMATCH');
  const shippedBlobs = committedBlobs(root, commit, identity.files.map(row => row.file));
  for (const row of identity.files) if (!shippedBlobs.get(row.file) || sha(shippedBlobs.get(row.file)) !== row.sha256) fail('BASE_MANIFEST_DOES_NOT_MATCH_COMMITTED_SOURCE', row.file);
  const shipped = new Set(identity.files.map(row => row.file));
  const captured = new Map((options.capturedDependencies || []).map(row => [relativeName(row.file), String(row.sha256).toUpperCase()]));
  for (const [file, digest] of captured) if (!hashPattern.test(digest) || shipped.has(file)) fail('INVALID_CAPTURED_TEST_DEPENDENCY', file);
  const dependencies = full.dependencies.map(row => {
    const committed = blobs.get(row.file);
    if (committed) {
      if (sha(committed) !== row.sha256) fail('BASELINE_DEPENDENCY_NOT_BASE_COMMIT', row.file);
      return { ...row, source: 'COMMITTED' };
    }
    if (captured.get(row.file) !== row.sha256) fail('BASELINE_DEPENDENCY_NOT_COMMITTED_DECLARE_CAPTURE', row.file);
    const file = inside(root, row.file);
    if (!fs.existsSync(file) || !fs.statSync(file).isFile() || sha(fs.readFileSync(file)) !== row.sha256) fail('CAPTURED_BASELINE_DEPENDENCY_UNAVAILABLE', row.file);
    return { ...row, source: 'CAPTURED_TEST_DEPENDENCY' };
  });
  for (const file of captured.keys()) if (!dependencies.some(row => row.file === file && row.source === 'CAPTURED_TEST_DEPENDENCY')) fail('UNUSED_CAPTURED_DEPENDENCY_DECLARATION', file);
  return { schema: 1, base_commit: commit, build_id: 'crp-v1-' + identity.digest.slice(0, 16).toLowerCase(), manifest_digest: identity.digest,
    manifest_sha256: sha(manifestBytes), receipt_sha256: sha(receiptBytes), section_ids: full.sectionIds, dependencies };
}
function validateBaselineDescriptor(options) {
  const descriptor = options.descriptor;
  if (!descriptor || descriptor.schema !== 1 || !Array.isArray(descriptor.dependencies)) fail('ACCEPTED_BASELINE_DESCRIPTOR_REQUIRED');
  const expected = createBaselineDescriptor({ ...options, capturedDependencies: options.capturedDependencies || descriptor.dependencies.filter(row => row.source === 'CAPTURED_TEST_DEPENDENCY') });
  for (const key of ['base_commit', 'build_id', 'manifest_digest', 'manifest_sha256', 'receipt_sha256', 'section_ids', 'dependencies']) {
    if (JSON.stringify(descriptor[key]) !== JSON.stringify(expected[key])) fail('BASELINE_DESCRIPTOR_MISMATCH', key);
  }
  return expected;
}

function withoutComments(source) {
  // Preserve quoted strings; commented-out require examples must not become prerequisites.
  return source.replace(/(['"`])(?:\\[\s\S]|(?!\1)[^\\])*?\1|\/\*[\s\S]*?\*\/|\/\/[^\r\n]*/g, value => value.startsWith('/') ? ' '.repeat(value.length) : value);
}
function codeMask(source) {
  return source.replace(/(['"`])(?:\\[\s\S]|(?!\1)[^\\])*?\1/g, value => ' '.repeat(value.length));
}
function resolveCommand(command, options = {}) {
  if (typeof command !== 'string' || !command || /[\r\n\0]/.test(command)) return null;
  const env = options.env || process.env, platform = options.platform || process.platform;
  const extensions = platform === 'win32' ? ['', ...(env.PATHEXT || '.COM;.EXE;.BAT;.CMD').split(';').filter(Boolean)] : [''];
  const absolute = path.isAbsolute(command) || /^[A-Za-z]:[\\/]/.test(command);
  const dirs = absolute ? [''] : String(env.PATH || env.Path || '').split(path.delimiter).filter(Boolean);
  for (const dir of dirs) for (const ext of extensions) {
    const file = absolute ? command + ext : path.join(dir, command + ext);
    try { if (fs.statSync(file).isFile()) { if (platform !== 'win32') fs.accessSync(file, fs.constants.X_OK); return file; } } catch {}
  }
  return null;
}
function inspectPrerequisites(options) {
  const root = path.resolve(options.root), issues = [], dependencies = new Set(), tools = new Set(options.commands || []), dynamic = [];
  const queue = [], scanned = new Set();
  const addIssue = (code, file, section) => issues.push({ code, ...(file ? { file } : {}), ...(section ? { section } : {}) });
  const catalog = new Map();
  const rawCatalog = options.sectionCatalog || [];
  for (const entry of Array.isArray(rawCatalog) ? rawCatalog : Object.entries(rawCatalog).map(([id, value]) => typeof value === 'string' ? { id, file: value } : { ...value, id })) {
    if (!entry || typeof entry.id !== 'string' || !entry.file || catalog.has(entry.id)) fail('INVALID_SECTION_CATALOG');
    catalog.set(entry.id, entry);
  }
  function addFile(name, section) {
    let file; try { file = relativeName(name); } catch { addIssue('UNSAFE_PREREQUISITE_PATH', undefined, section); return; }
    dependencies.add(file);
    let absolute; try { absolute = inside(root, file); } catch { addIssue('UNSAFE_PREREQUISITE_PATH', file, section); return; }
    if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) { addIssue('MISSING_PREREQUISITE_FILE', file, section); return; }
    if (/\.(?:cjs|js|mjs)$/.test(file) && !file.includes('/node_modules/')) queue.push({ file, section });
  }
  for (const selection of options.sections || []) {
    const id = typeof selection === 'string' ? selection : selection.id;
    const section = catalog.get(id);
    if (!section) { addIssue('UNKNOWN_SELECTED_SECTION', undefined, id); continue; }
    addFile(section.file, id);
    for (const file of section.files || []) addFile(file, id);
    for (const command of section.commands || []) tools.add(command);
  }
  for (const file of options.files || []) addFile(file);
  for (let index = 0; index < queue.length; index++) {
    const { file, section } = queue[index];
    if (scanned.has(file)) continue; scanned.add(file);
    const absolute = inside(root, file), source = withoutComments(fs.readFileSync(absolute, 'utf8')), mask = codeMask(source);
    const specs = [], recognized = new Set();
    function record(match, spec) { if (mask[match.index] === 'r') { specs.push(spec); recognized.add(match.index); } }
    for (const match of source.matchAll(/\brequire\s*\(\s*(['"`])([^'"`\r\n]+)\1\s*\)/g)) if (!match[2].includes('${')) record(match, match[2]);
    // Common repository-root aliases are resolved statically, never evaluated.
    for (const match of source.matchAll(/\brequire\s*\(\s*(?:ROOT|R|REPOSITORY_ROOT)\s*\+\s*(['"])(\/[^'"\r\n]+)\1\s*\)/g)) {
      if (mask[match.index] === 'r') record(match, inside(root, match[2].slice(1)));
    }
    for (const match of source.matchAll(/\brequire\s*\(\s*path\.(?:join|resolve)\(\s*__dirname\s*((?:,\s*(['"])[^'"]+\2)+)\s*\)\s*\)/g)) {
      const parts = [...match[1].matchAll(/(['"])([^'"]+)\1/g)].map(row => row[2]); record(match, path.resolve(path.dirname(absolute), ...parts));
    }
    for (const spec of specs) {
      if (isBuiltin(spec)) continue;
      let resolved; try { resolved = createRequire(absolute).resolve(spec); } catch {
        const candidate = spec.startsWith('.') || path.isAbsolute(spec) ? path.resolve(path.dirname(absolute), spec) : null;
        const missing = candidate?.startsWith(root + path.sep) ? normalize(path.relative(root, candidate)) : spec;
        if (candidate?.startsWith(root + path.sep)) dependencies.add(missing);
        addIssue('MISSING_REQUIRED_MODULE', missing, section); continue;
      }
      if (resolved.startsWith(root + path.sep)) addFile(normalize(path.relative(root, resolved)), section);
      else if (spec.startsWith('.')) addIssue('REQUIRED_MODULE_OUTSIDE_WORKSPACE', file, section);
      // External installed modules are resolved without loading or reading them.
    }
    for (const match of source.matchAll(/(['"])(consumer-wizard\/dist\/(?:app\.js|index\.html|jurisdiction-data\.js))\1/g)) addFile(match[2], section);
    for (const match of source.matchAll(/\b(?:execFileSync|execFile|spawnSync|spawn)\s*\(\s*(['"])([^'"\r\n]+)\1/g)) if (mask[match.index] !== ' ') tools.add(match[2]);
    if ([...mask.matchAll(/\brequire\s*\(/g)].some(match => !recognized.has(match.index))) dynamic.push({ file, section, scope: 'Caller must declare any additional computed dependencies in files/commands' });
  }
  for (const command of [...tools].sort()) if (!resolveCommand(command, options.commandOptions)) addIssue('MISSING_PREREQUISITE_COMMAND', command);
  if (options.committedManifest) {
    try {
      const commit = resolveCommit(root, options.candidateCommit || 'HEAD');
      const manifestFile = inside(root, MANIFEST_FILE);
      const manifest = options.manifest || readJson(manifestFile, 'CANDIDATE_MANIFEST_UNREADABLE');
      const identity = manifestIdentity(manifest);
      if (manifestIdentity(readJson(manifestFile, 'CANDIDATE_MANIFEST_UNREADABLE')).digest !== identity.digest) fail('CANDIDATE_MANIFEST_ARGUMENT_MISMATCH');
      const blobs = committedBlobs(root, commit, [MANIFEST_FILE, ...identity.files.map(row => row.file)]);
      const committed = blobs.get(MANIFEST_FILE);
      if (!committed || sha(committed) !== sha(fs.readFileSync(manifestFile))) addIssue('CANDIDATE_MANIFEST_NOT_COMMITTED', MANIFEST_FILE);
      for (const row of identity.files) {
        const absolute = inside(root, row.file); dependencies.add(row.file);
        if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) addIssue('MISSING_SHIPPED_FILE', row.file);
        else if (sha(fs.readFileSync(absolute)) !== row.sha256) addIssue('CANDIDATE_MANIFEST_STALE', row.file);
        if (!blobs.get(row.file) || sha(blobs.get(row.file)) !== row.sha256) addIssue('SHIPPED_FILE_NOT_COMMITTED_AT_CANDIDATE', row.file);
      }
    } catch (error) { addIssue(error.code || 'COMMITTED_MANIFEST_INSPECTION_FAILED'); }
  }
  const unique = [...new Map(issues.map(row => [JSON.stringify(row), row])).values()];
  return { passed: unique.length === 0, issues: unique, dependencies: [...dependencies].sort(), commands: [...tools].sort(),
    dynamic_dependencies: dynamic, scope: 'Selected sections and literal/explicitly declared inputs only; no modules or commands executed' };
}
function assertPrerequisites(options) {
  const result = inspectPrerequisites(options);
  if (!result.passed) {
    const error = new Error('RELEASE_PREREQUISITES_MISSING: ' + result.issues.map(row => row.code + (row.file ? ': ' + row.file : '') + (row.section ? ' (' + row.section + ')' : '')).join('; '));
    error.code = 'RELEASE_PREREQUISITES_MISSING'; error.issues = result.issues; throw error;
  }
  return result;
}
module.exports = { classify, createBaselineDescriptor, validateBaselineDescriptor, inspectPrerequisites, assertPrerequisites,
  manifestIdentity, fullReceiptIdentity, resolveCommand };
