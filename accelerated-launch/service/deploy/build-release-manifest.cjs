'use strict';
/**
 * build-release-manifest.cjs — the candidate's shipped-asset manifest.
 *
 * OWNER seven-day procedure, task 2: *"Create a manifest/digest covering the actual shipped runtime,
 * adapters/rule configuration, HTML, CSS and other served assets."*
 *
 * It reads the tree read-only and writes ONE file beside itself. It makes no outbound call, reads no secret and
 * changes no source. The groups below are the surfaces a staging candidate actually ships:
 *
 *   RUNTIME                 the single-process service modules, the format-family readers and the local OCR reader
 *   READER_SUPPORT          the modules the runtime `require`s at start-up (the Canadian document model, contract,
 *                           extraction and pinned runtime configuration)
 *   RULE_CONFIGURATION      the adapters and the recorded rule/applicability/format configuration a check reads
 *   SERVED_ASSETS           the private UI tree the allowlist serves (HTML, CSS, JS, icon)
 *
 * Usage:  node accelerated-launch/service/deploy/build-release-manifest.cjs
 */
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const OUT = path.join(__dirname, 'release-manifest.json');

function listFiles(dir, filter, options) {
  const opts = options || {};
  const recursive = opts.recursive !== false;
  const exclude = opts.exclude || [];
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  const out = [];
  const walk = (d) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
      const full = path.join(d, entry.name);
      const rel = path.relative(ROOT, full).split(path.sep).join('/');
      if (exclude.some((prefix) => rel === prefix.replace(/\/$/, '') || rel.startsWith(prefix))) continue;
      if (entry.isDirectory()) { if (recursive) walk(full); continue; }
      if (filter(entry.name)) out.push(rel);
    }
  };
  walk(abs);
  return out.sort();
}

/* Each surface is listed ONCE and only once: the groups are disjoint, so a file cannot be counted twice and the
   manifest cannot include itself. `SERVICE_NON_SHIPPED` is the service's own test/evidence/deploy/UI tree, which
   is NOT part of the runtime surface (the UI is its own group). */
const SERVICE_NON_SHIPPED = [
  'accelerated-launch/service/out/',
  'accelerated-launch/service/tests/',
  'accelerated-launch/service/deploy/',
  'accelerated-launch/service/ui/',
  'accelerated-launch/service/password-vendor/',
  'accelerated-launch/service/bureau-forms/',
  'accelerated-launch/service/bureau-forms.cjs',
  'accelerated-launch/service/bureau-form-worker.cjs',
  'accelerated-launch/service/bureau-form-mappings.cjs'
];

// Reviewed exclusions, not filename heuristics. Keep these sources and their
// historical tests in Git/source proof; they are not running-service dependencies.
// FDT validators/benchmarks, the synthetic PDF factory and store diagnostics stay
// shipped because the frozen operator/recovery tools still depend on them.
const REVIEWED_NON_SHIPPED = Object.freeze([
  { file: 'accelerated-launch/service/packet-archive.cjs', reason: 'Legacy ZIP helper; current packets use the single-PDF compositor.' },
  { file: 'accelerated-launch/service/upgrade-credit.cjs', reason: 'Legacy standalone quote helper; current credits use billing-credits.cjs.' },
  { file: 'accelerated-launch/service/build-subscription-value-evidence.cjs', reason: 'Local test/evidence builder, not a served-service or frozen-operator dependency.' },
  { file: 'accelerated-launch/service/finding-coverage.cjs', reason: 'Local coverage evidence builder; the operator validates its recorded proof separately.' },
  { file: 'internal-validation/ca-ns-last-payment-six-year/run-internal-validation.cjs', reason: 'Standalone internal-validation runner; preserve its imported reader modules.' },
  { file: 'accelerated-launch/adapters/test-adapters.cjs', reason: 'Standalone adapter test runner.' },
  { file: 'accelerated-launch/benchmark-ingestion.cjs', reason: 'Standalone ingestion benchmark runner.' },
  { file: 'accelerated-launch/test-router.cjs', reason: 'Standalone jurisdiction-router test runner.' }
].map(row => Object.freeze(row)));

const GROUPS = [
  { id: 'RUNTIME_ASSETS', dirs: ['accelerated-launch/service/packet-fonts', 'accelerated-launch/service/pdf-vendor', 'accelerated-launch/service/password-vendor'], filter: () => true },
  { id: 'RUNTIME', dirs: ['accelerated-launch/service'], filter: (n) => n.endsWith('.cjs') || n === 'release-scope.json' || n === 'report-use-policy.json', exclude: SERVICE_NON_SHIPPED },
  { id: 'READER_SUPPORT', dirs: ['internal-validation/ca-ns-last-payment-six-year', 'consumer-wizard/dist'], filter: (n) => n.endsWith('.cjs') || n === 'jurisdiction-data.js', exclude: ['internal-validation/ca-ns-last-payment-six-year/tests/'] },
  { id: 'RULE_CONFIGURATION', dirs: ['accelerated-launch/adapters'], filter: (n) => /\.(json|cjs)$/.test(n) },
  { id: 'RULE_CONFIGURATION_TOP_LEVEL', dirs: ['accelerated-launch'], filter: (n) => /\.(json|cjs)$/.test(n), recursive: false },
  { id: 'SERVED_ASSETS', dirs: ['accelerated-launch/service/ui'], filter: () => true }
];

function sha256(rel) {
  return crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, rel))).digest('hex');
}

function digestOf(rows) {
  const h = crypto.createHash('sha256');
  for (const row of rows) { h.update(row.file); h.update('\n'); h.update(row.sha256); h.update('\n'); }
  return h.digest('hex').toUpperCase();
}

function collectGroups() {
  const excluded = new Set(REVIEWED_NON_SHIPPED.map(row => row.file));
  const groups = GROUPS.map((group) => {
    const files = [...new Set(group.dirs.flatMap((dir) => listFiles(dir, group.filter, { recursive: group.recursive, exclude: group.exclude })))].filter(file => !excluded.has(file));
    const rows = files.map((file) => ({ file, sha256: sha256(file).toUpperCase() }));
    return { id: group.id, file_count: rows.length, digest: digestOf(rows), files: rows };
  });
  return groups;
}

function main() {
  const groups = collectGroups();
  const manifest = {
    generator: 'accelerated-launch/service/deploy/build-release-manifest.cjs',
    generated_at: new Date().toISOString(),
    read_only: true,
    note: 'Hashes of the surfaces a staging candidate ships. Regenerate at freeze; the manifest digest BINDS no secret and is not itself the served build identity.',
    groups
  };
  manifest.manifest_digest = digestOf(groups.flatMap((g) => g.files.length ? [{
    file: `group:${g.id}`, sha256: g.digest
  }] : []));
  manifest.total_file_count = groups.reduce((n, g) => n + g.file_count, 0);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(manifest, null, 2)}\n`);
  process.stdout.write([
    'release-manifest.json written',
    `total files: ${manifest.total_file_count}`,
    `manifest digest: ${manifest.manifest_digest}`,
    ...groups.map((g) => `  ${g.id}: ${g.file_count} files, digest ${g.digest.slice(0, 12)}…`)
  ].join('\n') + '\n');
  return manifest;
}

if (require.main === module) main();

module.exports = { main, collectGroups, GROUPS, OUT, REVIEWED_NON_SHIPPED };
