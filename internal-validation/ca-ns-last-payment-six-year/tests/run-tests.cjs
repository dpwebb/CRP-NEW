'use strict';
/**
 * run-tests.cjs — the PHASE5-001I-A test suite entry point.
 *
 * Runs every section in order and writes SOURCE_CAPTURES\PHASE5-001I-A\test_results_001i_a.json.
 * Run: node internal-validation/ca-ns-last-payment-six-year/tests/run-tests.cjs
 */

const { ctx, finish } = require('./harness.cjs');

const sections = [
  { id: 'A', name: 'the pinned presentation, end to end', module: require('./sections/a-pinned.cjs') },
  { id: 'B', name: 'the six-year calendar arithmetic', module: require('./sections/b-arithmetic.cjs') },
  { id: 'C', name: 'the failure and ambiguity paths', module: require('./sections/c-paths.cjs') },
  { id: 'D', name: 'record binding and isolation', module: require('./sections/d-records.cjs') },
  { id: 'E', name: 'the refusal paths', module: require('./sections/e-refusals.cjs') },
  { id: 'F', name: 'the state model', module: require('./sections/f-state.cjs') }
];

for (const section of sections) section.module.run(ctx);

process.exitCode = finish();
