'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const { executeStep, readRecord, fingerprint } = require('./release-execution.cjs');

const identity = (changes = {}) => ({ execution: 'LOCAL_DETERMINISTIC', source: { commit: 'fictional-source', sha256: 'a'.repeat(64) },
  tests: ['fictional-test-v1'], fixtures: ['fixture-sha'], toolchain: { node: process.version }, environment: { provider: 'none' }, ...changes });
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'crp-release-execution-test-'));
let checks = 0;
const check = (message, action) => { action(); checks++; console.log(`PASS: ${message}`); };

function invocation(directory, counter, changes = {}) {
  return { directory, id: 'fixture-check', identity: identity(),
    run: async ({ outputDirectory }) => { counter.count++; const file = path.join(outputDirectory, 'proof.json');
      fs.writeFileSync(file, JSON.stringify({ passed: true, completed: true, failed: 0, skipped: 0, invocation: counter.count }));
      return { passed: true, completed: true, failed: 0, skipped: 0, file }; },
    validate: (value) => value.passed === true,
    outputs: (value) => [value.file], ...changes };
}

async function main() {
  const directory = path.join(temporary, 'reuse'), counter = { count: 0 }, request = invocation(directory, counter);
  const first = await executeStep(request), firstBytes = fs.readFileSync(first.receiptPath);
  const reused = await executeStep(request);
  check('an unchanged pass reuses proof without invoking the callback', () => {
    assert.equal(counter.count, 1); assert.equal(first.reused, false); assert.equal(reused.reused, true);
    assert.equal(reused.receipt_sha256, first.receipt_sha256); assert.equal(reused.metrics.avoided_invocations, 1);
    assert.deepEqual(fs.readFileSync(first.receiptPath), firstBytes);
  });
  for (const input of ['source', 'tests', 'fixtures', 'toolchain', 'environment']) {
    const changed = invocation(directory, counter, { identity: identity({ [input]: [`changed-${input}`] }) });
    const result = await executeStep(changed);
    check(`${input} changes require a new invocation and preserve prior attempts`, () => {
      assert.equal(result.reused, false); assert.notEqual(result.receipt.fingerprint, first.receipt.fingerprint);
      assert.equal(readRecord(directory).attempts.at(-1).reason, 'INPUT_IDENTITY_CHANGED');
      assert.ok(readRecord(directory).attempts.at(-1).changed_inputs.includes(input));
      assert.deepEqual(fs.readFileSync(first.receiptPath), firstBytes);
    });
  }
  check('canonical identity is independent of object key ordering', () => {
    const original = identity(), reverse = Object.fromEntries(Object.entries(original).reverse());
    assert.equal(fingerprint(original), fingerprint(reverse));
  });
  for (const patch of [{ execution: 'HOSTED' }, { hosted: true }, { fresh: true }, { activation: true }, { configuration_check: true }]) {
    await assert.rejects(executeStep(invocation(path.join(temporary, 'refused'), counter, { identity: identity(patch) })), /LOCAL_DETERMINISTIC_CHECK_REQUIRED/);
  }
  check('fresh hosted/configuration/activation checks are refused before callback execution', () => assert.equal(counter.count, 6));
  for (const id of ['activate-production', 'hosted-gates', 'production-promotion', 'provider-purchase', 'configuration-check', 'smoke']) {
    await assert.rejects(executeStep(invocation(path.join(temporary, 'refused'), counter, { id })), /FRESH_OR_PRIVILEGED_STEP_NOT_REUSABLE/);
  }
  check('known hosted or privileged step names cannot be mislabeled as local checks', () => assert.equal(counter.count, 6));
  check('missing identity constraints fail closed', () => {
    const invalid = identity(); delete invalid.fixtures;
    assert.throws(() => fingerprint(invalid), /MISSING_EXECUTION_INPUT/);
    assert.throws(() => fingerprint(identity({ tests: undefined })), /INVALID_EXECUTION_IDENTITY/);
  });

  for (const tamper of ['original', 'artifact', 'missing']) {
    const dir = path.join(temporary, `output-${tamper}`), counted = { count: 0 }, step = invocation(dir, counted);
    const original = await executeStep(step), output = original.receipt.outputs[0];
    if (tamper === 'missing') fs.unlinkSync(output.path);
    else fs.writeFileSync(tamper === 'artifact' ? path.join(dir, output.artifact) : output.path, 'tampered');
    const next = await executeStep(step);
    check(`${tamper} output proof cannot be reused`, () => {
      assert.equal(counted.count, 2); assert.equal(next.reused, false);
      assert.ok(readRecord(dir).events.some((event) => event.event === 'REUSE_REJECTED'));
    });
  }

  const failedDir = path.join(temporary, 'failed'), failedCounter = { count: 0 };
  await assert.rejects(executeStep(invocation(failedDir, failedCounter, { run: () => { failedCounter.count++; throw new Error('fictional failure'); } })), /fictional failure/);
  const failedRecord = readRecord(failedDir), failedBytes = fs.readFileSync(path.join(failedDir, failedRecord.attempts[0].receipt));
  const recovered = await executeStep(invocation(failedDir, failedCounter));
  check('a failed attempt is preserved and a retry executes the callback', () => {
    assert.equal(recovered.reused, false); assert.equal(failedCounter.count, 2);
    assert.equal(readRecord(failedDir).metrics.failed, 1);
    assert.deepEqual(fs.readFileSync(path.join(failedDir, failedRecord.attempts[0].receipt)), failedBytes);
  });

  for (const [name, value, validation] of [
    ['skipped', { skipped: 1 }, true], ['partial', { completed: false }, true],
    ['failed-summary', { totals: { failed: 1 } }, true], ['failed-validation', { passed: true }, false],
    ['incomplete-validation', { passed: true }, { passed: true }]
  ]) {
    await assert.rejects(executeStep(invocation(path.join(temporary, name), { count: 0 }, { run: () => value, validate: () => validation, outputs: [] })), /LOCAL_CHECK_NOT_COMPLETED_PASS/);
    check(`${name} never produces reusable proof`, () => assert.equal(readRecord(path.join(temporary, name)).metrics.passed, 0));
  }
  const noProof = path.join(temporary, 'no-output');
  await assert.rejects(executeStep(invocation(noProof, { count: 0 }, { outputs: [] })), /LOCAL_CHECK_OUTPUT_REQUIRED/);
  check('missing proof cannot become a completed pass', () => assert.equal(readRecord(noProof).metrics.failed, 1));

  const abortDir = path.join(temporary, 'abort'), abortCounter = { count: 0 };
  await assert.rejects(executeStep(invocation(abortDir, abortCounter, { run: () => { const error = new Error('fictional interruption'); error.name = 'AbortError'; throw error; } })), /fictional interruption/);
  const aborted = await executeStep(invocation(abortDir, abortCounter));
  check('an explicit interruption requires a fresh attempt', () => {
    assert.equal(aborted.reused, false); assert.equal(readRecord(abortDir).metrics.interrupted, 1);
  });

  const interruptedDir = path.join(temporary, 'process-exit');
  const modulePath = path.join(__dirname, 'release-execution.cjs');
  const script = `const {executeStep}=require(${JSON.stringify(modulePath)});executeStep({directory:process.argv[1],id:'fixture-check',identity:${JSON.stringify(identity())},run:()=>process.exit(23),validate:()=>true,outputs:[]});`;
  const exited = spawnSync(process.execPath, ['-e', script, interruptedDir], { encoding: 'utf8', timeout: 10000 });
  assert.equal(exited.status, 23);
  check('a process exit leaves a pending attempt rather than passing evidence', () => assert.equal(readRecord(interruptedDir).attempts[0].status, 'PENDING'));
  const resumed = await executeStep(invocation(interruptedDir, { count: 0 }));
  check('resume preserves the pending attempt as interrupted and takes over only a dead lock', () => {
    assert.equal(resumed.reused, false); assert.equal(readRecord(interruptedDir).metrics.interrupted, 1);
    assert.equal(fs.readdirSync(path.join(interruptedDir, 'execution-locks')).length, 1);
  });

  const concurrentDir = path.join(temporary, 'concurrent'), counted = { count: 0 };
  let continueRun, entered;
  const started = new Promise((resolve) => { entered = resolve; });
  const hold = new Promise((resolve) => { continueRun = resolve; });
  const blocking = invocation(concurrentDir, counted);
  const originalRun = blocking.run;
  blocking.run = async (context) => { entered(); await hold; return originalRun(context); };
  const running = executeStep(blocking);
  await started;
  await assert.rejects(executeStep(invocation(concurrentDir, counted)), /EXECUTION_LOCKED/);
  continueRun(); await running;
  check('competing same-candidate execution is refused without invoking its callback', () => assert.equal(counted.count, 1));

  const processDir = path.join(temporary, 'competing-process'), readyFile = path.join(processDir, 'ready'), finishFile = path.join(processDir, 'finish');
  fs.mkdirSync(processDir);
  const childScript = `const fs=require('node:fs'),path=require('node:path'),{executeStep}=require(${JSON.stringify(modulePath)});executeStep({directory:process.argv[1],id:'fixture-check',identity:${JSON.stringify(identity())},run:async({outputDirectory})=>{fs.writeFileSync(${JSON.stringify(readyFile)},'ready');await new Promise(resolve=>{const wait=()=>fs.existsSync(${JSON.stringify(finishFile)})?resolve():setTimeout(wait,5);wait();});const file=path.join(outputDirectory,'proof.json');fs.writeFileSync(file,'{}');return {file};},validate:()=>true,outputs:value=>[value.file]}).then(()=>process.exit(0)).catch(error=>{console.error(error);process.exit(1)});`;
  const child = spawn(process.execPath, ['-e', childScript, processDir], { stdio: 'pipe' });
  const exitedChild = new Promise((resolve) => child.on('exit', (code) => resolve(code)));
  try {
    const deadline = Date.now() + 10000;
    while (!fs.existsSync(readyFile) && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 10));
    assert.ok(fs.existsSync(readyFile), 'the isolated child reaches its callback');
    await assert.rejects(executeStep(invocation(processDir, { count: 0 })), /EXECUTION_LOCKED/);
    fs.writeFileSync(finishFile, 'finish');
    assert.equal(await exitedChild, 0);
    check('a living separate process also excludes competing execution', () => assert.equal(readRecord(processDir).metrics.passed, 1));
  } finally { if (child.exitCode === null) child.kill(); }

  const changing = identity();
  await assert.rejects(executeStep(invocation(path.join(temporary, 'mutation'), { count: 0 }, {
    identity: changing, validate: () => { changing.tests = ['modified while running']; return true; }
  })), /EXECUTION_INPUTS_CHANGED/);
  check('input payload mutation during execution refuses success', () => assert.equal(readRecord(path.join(temporary, 'mutation')).metrics.passed, 0));

  const immutableDir = path.join(temporary, 'record'), imm = await executeStep(invocation(immutableDir, { count: 0 }));
  const eventDirectory = path.join(immutableDir, 'release-record'), eventFiles = fs.readdirSync(eventDirectory), originals = eventFiles.map((name) => fs.readFileSync(path.join(eventDirectory, name)));
  await executeStep(invocation(immutableDir, { count: 0 }));
  check('reuse appends a record event without rewriting prior events or receipts', () => {
    assert.equal(fs.readdirSync(eventDirectory).length, 3);
    eventFiles.forEach((name, index) => assert.deepEqual(fs.readFileSync(path.join(eventDirectory, name)), originals[index]));
  });
  fs.writeFileSync(path.join(eventDirectory, eventFiles[0]), 'changed existing event');
  await assert.rejects(executeStep(invocation(immutableDir, { count: 0 })), /RELEASE_RECORD_INTEGRITY_FAILED/);
  check('changed append-only record bytes fail integrity verification', () => assert.throws(() => readRecord(immutableDir), /RELEASE_RECORD_INTEGRITY_FAILED/));

  const receiptDir = path.join(temporary, 'receipt-tamper'), receipt = await executeStep(invocation(receiptDir, { count: 0 }));
  fs.writeFileSync(receipt.receiptPath, '{}');
  await assert.rejects(executeStep(invocation(receiptDir, { count: 0 })), /RELEASE_RECEIPT_INTEGRITY_FAILED/);
  check('changed receipt bytes cannot be accepted', () => assert.throws(() => readRecord(receiptDir), /RELEASE_RECEIPT_INTEGRITY_FAILED/));
  console.log(`PASS: ${checks} release-execution behavior checks; no product services or hosted operations`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => {
  const resolved = path.resolve(temporary);
  if (!resolved.startsWith(path.resolve(os.tmpdir()) + path.sep)) throw new Error('Unsafe test cleanup');
  fs.rmSync(resolved, { recursive: true, force: true });
});
