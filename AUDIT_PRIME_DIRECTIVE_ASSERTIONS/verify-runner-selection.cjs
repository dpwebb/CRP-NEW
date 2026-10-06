const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'accelerated-launch/service/out');
const files = ['b2-evidence.json', 'b3-evidence.json', 'b4-evidence.json', 'current-regression-evidence.json'];
const identity = () => files.map(f => [f, fs.existsSync(path.join(out, f)) ? crypto.createHash('sha256').update(fs.readFileSync(path.join(out, f))).digest('hex') : null]);
const before = identity();
const result = [];
for (const argument of ['--lane=not-a-lane', 'not-a-section']) {
  const run = spawnSync(process.execPath, [path.join(root, 'accelerated-launch/service/tests/run-tests.cjs'), argument], { encoding: 'utf8' });
  assert.equal(run.status, 2);
  assert.match(run.stderr, /unknown/);
  result.push({ argument, exit: run.status, rejected: true });
}
assert.deepEqual(identity(), before);
fs.writeFileSync(path.join(__dirname, 'runner-selection-controls.json'), JSON.stringify({ results: result, release_evidence_unchanged: true }, null, 2));
console.log('Unknown lane/section rejected with exit 2; release evidence unchanged');
