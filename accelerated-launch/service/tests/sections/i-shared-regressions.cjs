'use strict';
/**
 * i-shared-regressions.cjs — acceptance item 8: "Existing all-82 routing and adapter tests still pass."
 *
 * The two B1 suites are executed as child processes, unchanged, exactly as their own headers document them.
 * Neither writes anything: `test-router.cjs` reads `launch-matrix.json` and `test-adapters.cjs` reads the
 * adapter configuration. This section executes no historical evidence suite.
 */

const assert = require('node:assert/strict');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');

function runNode(relative) {
  const script = path.join(ROOT, relative);
  const output = execFileSync(process.execPath, [script, '--json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  return { script: relative, summary: JSON.parse(output.trim().split(/\r?\n/).at(-1)) };
}

async function run(t, check) {
  const router = runNode(path.join('accelerated-launch', 'test-router.cjs'));
  check.equal(router.summary.failed, 0, 'the shared jurisdiction router suite still passes');
  check.equal(router.summary.regions, 82, 'and it still covers all 82 routes');
  check.equal(router.summary.alias_refusals, true, 'and it still exercises the alias refusals');

  const adapters = runNode(path.join('accelerated-launch', 'adapters', 'test-adapters.cjs'));
  check.ok(adapters.summary.passed > 0, 'the rule-adapter suite ran tests');
  check.equal(adapters.summary.failed, 0, 'the structured adapter result reports no failure');

  /* The catalog and matrix the router reads are the B1 artifacts, unchanged by this batch. */
  const fs = require('node:fs');
  const crypto = require('node:crypto');
  const digest = (relative) => crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, relative))).digest('hex');
  const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'accelerated-launch/adapters/rule-adapter-catalog.json'), 'utf8'));
  const config = require('../../../adapters/adapter-configs.json');
  check.equal(catalog.inputs.adapter_configs, digest('accelerated-launch/adapters/adapter-configs.json'), 'catalog is bound to the current adapter configuration digest');
  check.deepEqual(catalog.implemented_adapters, config.adapters, 'catalog adapter records match the current configuration, including finding and packet permissions');

  return { router: router.summary, adapters: adapters.summary, child_tests_are_not_parent_assertion_totals: true };
}

module.exports = { run, id: 'i-shared-regressions', title: 'The B1 all-82 routing and adapter suites still pass' };
