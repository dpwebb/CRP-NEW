'use strict';
// Invoke the unchanged default product runner, preserving its evidence and exit status.
// Keep execution diagnostics separate from release evidence if the host terminates a process.
const fs = require('node:fs'), path = require('node:path');
const started = Date.now();
const events = path.join(__dirname, 'final-run-process.jsonl');
const record = value => fs.appendFileSync(events, JSON.stringify({ at: new Date().toISOString(), ...value }) + '\n');
record({ event: 'START', pid: process.pid });
process.on('beforeExit', code => record({ event: 'BEFORE_EXIT', code, elapsed_ms: Date.now() - started }));
process.on('exit', code => record({ event: 'EXIT', code, elapsed_ms: Date.now() - started }));
const runner = path.join(__dirname, '../accelerated-launch/service/tests/run-tests.cjs');
process.argv = [process.execPath, runner];
require(runner);
