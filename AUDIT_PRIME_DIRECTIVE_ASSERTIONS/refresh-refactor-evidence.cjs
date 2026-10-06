'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'accelerated-launch/service/out');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const report = JSON.parse(fs.readFileSync(path.join(out, 'current-regression-evidence.json'), 'utf8'));
if (report.mode !== 'FULL_CURRENT_PRODUCT' || report.totals.failed || report.source_drift?.length || report.unrun_sections.length || report.sections.some(s => !s.completed || s.failed || s.skipped.length)) throw Error('REFUSED_NONPASSING_OR_INCOMPLETE_FULL_RUN');
if (report.source_hashes.some(p => hash(path.join(root, p.file)) !== p.sha256)) throw Error('REFUSED_STALE_SOURCE');
fs.writeFileSync(path.join(__dirname, 'refactor-verified-full.json'), JSON.stringify(report, null, 2));
const scripts = [
  'closure-common-errors.cjs', 'closure-consumer-results.cjs', 'closure-consumer-explanations.cjs',
  'closure-consumer-support.cjs', 'closure-consumer-billing.cjs', 'closure-consumer-imperatives-and-privacy.cjs',
  'revalidate-gap-finding-002.cjs'
];
const results = [];
for (const file of scripts) {
  const script = path.join(root, 'SOURCE_CAPTURES/CLOSURE-POLICY-001', file);
  results.push({ file, output: execFileSync(process.execPath, [script], { cwd: root, encoding: 'utf8' }).trim() });
}
for (const [file, args] of [['build-subscription-value-evidence.cjs', ['--reuse-current']], ['finding-coverage.cjs', []]]) {
  results.push({ file, output: execFileSync(process.execPath, [path.join(root, 'accelerated-launch/service', file), ...args], { cwd: root, encoding: 'utf8' }).trim() });
}
// Identify any remaining stale active implementation source pins; never rewrite historical captures.
const stale = [];
for (const file of fs.readdirSync(out).filter(f => f.endsWith('-evidence.json'))) {
  let evidence; try { evidence = JSON.parse(fs.readFileSync(path.join(out, file), 'utf8')); } catch { continue; }
  for (const pin of evidence.implementation?.source_files || []) {
    const p = path.isAbsolute(pin.file) ? pin.file : path.join(root, pin.file);
    if (!fs.existsSync(p) || hash(p).toLowerCase() !== String(pin.sha256).toLowerCase()) stale.push({ evidence: file, source: pin.file });
  }
}
if (report.source_hashes.some(p => hash(path.join(root, p.file)) !== p.sha256)) throw Error('REFUSED_SOURCE_CHANGED_DURING_REFRESH');
fs.writeFileSync(path.join(__dirname, 'refactor-evidence-refresh.json'), JSON.stringify({ full_run: report.totals, source_drift: report.source_drift, scripts: results, remaining_stale_pins: stale }, null, 2));
console.log(JSON.stringify({ full_run: report.totals, evidence_generators: results.length, remaining_stale_pins: stale }, null, 2));
