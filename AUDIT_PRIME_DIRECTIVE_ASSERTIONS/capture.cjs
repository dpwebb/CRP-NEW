'use strict';
// Audit-only runner: instrument a module in memory; do not alter the production runner or release evidence.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const Module = require('node:module');
const root = path.resolve(__dirname, '..');
const tests = path.join(root, 'accelerated-launch/service/tests');
const runner = path.join(tests, 'run-tests.cjs');
const files = [];
function walk(dir) {
  for (const d of fs.readdirSync(dir, {withFileTypes:true})) {
    if (['out','node_modules'].includes(d.name)) continue;
    const p = path.join(dir,d.name);
    if (d.isDirectory()) walk(p);
    else if (/\.(cjs|js|json|html|css)$/.test(d.name)) files.push(p);
  }
}
walk(path.join(root,'accelerated-launch/service'));
walk(path.join(root,'accelerated-launch/adapters'));
const manifest = files.map(p=>({path:path.relative(root,p),sha256:crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')}));
fs.writeFileSync(path.join(__dirname,'source-manifest.json'),JSON.stringify({captured_at:new Date().toISOString(),files:manifest},null,2));
let source = fs.readFileSync(runner,'utf8').replace(/\r\n/g,'\n');
function replaceExact(from,to) {
  if (!source.includes(from)) throw new Error('Audit instrumentation point absent: '+from.slice(0,80));
  source=source.replace(from,to);
}
replaceExact('const record = (label, fn) => {', `const record = (label, fn) => {
    report.assertion_calls = report.assertion_calls || [];
    const stack = new Error().stack.split('\\n').find(s => /[\\\\/]sections[\\\\/].+\\.cjs:\\d+:\\d+/.test(s)) || null;
    report.assertion_calls.push({label: label == null ? null : String(label), stack});`);
replaceExact("const section = require(path.join(__dirname, 'sections', file));\n  const report", "const section = require(path.join(__dirname, 'sections', file));\n  const auditStarted = Date.now();\n  const report");
replaceExact('  return report;\n}', `  report.audit_duration_ms = Date.now() - auditStarted;
  fs.appendFileSync(${JSON.stringify(path.join(__dirname,'section-progress.jsonl'))}, JSON.stringify(report)+'\\n');
  process.stdout.write('AUDIT section '+report.id+': '+report.passed+' passed '+report.failed+' failed '+report.audit_duration_ms+'ms\\n');
  return report;
}`);
replaceExact('  const byId = new Map(sectionReports.map((r) => [r.id, r]));', `  fs.writeFileSync(${JSON.stringify(path.join(__dirname,'executed-assertions.json'))}, JSON.stringify({
    mode:'AUDIT_ONLY', captured_at:new Date().toISOString(), totals,
    duration_ms:Date.now()-started, sections:sectionReports
  }, null, 2));
  process.stdout.write('AUDIT totals: '+JSON.stringify(totals)+' in '+(Date.now()-started)+'ms\\n');
  for (const r of sectionReports) process.stdout.write(r.id+' '+r.passed+' pass '+r.failed+' fail '+r.audit_duration_ms+'ms\\n');
  process.exitCode = totals.failed ? 1 : 0;
  return;
  const byId = new Map(sectionReports.map((r) => [r.id, r]));`);
const mod = new Module(runner,module);
mod.filename = runner;
mod.paths = Module._nodeModulePaths(tests);
process.env.CRP_B2_QUIET='1';
process.argv = [process.execPath,runner];
mod._compile(source,runner);
