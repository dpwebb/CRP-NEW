'use strict';

/** Durable local checks only. Hosted observations, configuration checks and activation
 * must execute through their existing fresh verification/authorization paths. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const SCHEMA_VERSION = 1;
const REQUIRED_INPUTS = ['source', 'tests', 'fixtures', 'toolchain', 'environment'];
const EVENTS = new Set(['STARTED', 'FINISHED', 'REUSED', 'REUSE_REJECTED']);
const TERMINAL = new Set(['PASSED', 'FAILED', 'INTERRUPTED']);
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');

function refusal(code, detail) {
  const error = new Error(detail ? `${code}: ${detail}` : code);
  error.code = code;
  return error;
}

function canonical(value, seen = new Set()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (!value || typeof value !== 'object' || seen.has(value)) throw refusal('INVALID_EXECUTION_IDENTITY');
  if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype) throw refusal('INVALID_EXECUTION_IDENTITY');
  seen.add(value);
  const result = Array.isArray(value)
    ? `[${value.map((item) => canonical(item, seen)).join(',')}]`
    : `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key], seen)}`).join(',')}}`;
  seen.delete(value);
  return result;
}

function fingerprint(identity) {
  if (!identity || identity.execution !== 'LOCAL_DETERMINISTIC' ||
      identity.fresh === true || identity.hosted === true || identity.activation === true ||
      identity.configuration_check === true) throw refusal('LOCAL_DETERMINISTIC_CHECK_REQUIRED');
  for (const key of REQUIRED_INPUTS) {
    if (!Object.hasOwn(identity, key) || identity[key] === null) throw refusal('MISSING_EXECUTION_INPUT', key);
  }
  return sha256(canonical(identity));
}

function publishBytes(filename, bytes) {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  const temporary = `${filename}.pending-${crypto.randomUUID()}`;
  const descriptor = fs.openSync(temporary, 'wx', 0o600);
  try { fs.writeFileSync(descriptor, bytes); fs.fsyncSync(descriptor); } finally { fs.closeSync(descriptor); }
  try {
    // A hard link publishes complete bytes atomically and refuses an existing destination.
    fs.linkSync(temporary, filename);
  } finally {
    fs.unlinkSync(temporary);
  }
}

function publishJson(filename, value) {
  const bytes = Buffer.from(`${canonical(value)}\n`);
  publishBytes(filename, bytes);
  return sha256(bytes);
}

function within(directory, relative) {
  if (typeof relative !== 'string' || !relative || path.isAbsolute(relative)) throw refusal('INVALID_RECORD_PATH');
  const resolved = path.resolve(directory, relative);
  const suffix = path.relative(directory, resolved);
  if (!suffix || suffix.startsWith('..') || path.isAbsolute(suffix)) throw refusal('INVALID_RECORD_PATH');
  return resolved;
}

function readRecord(directory) {
  const root = path.resolve(directory);
  const recordDirectory = path.join(root, 'release-record');
  const files = fs.existsSync(recordDirectory) ? fs.readdirSync(recordDirectory).filter((name) => name.endsWith('.json')).sort() : [];
  const events = [], attempts = new Map();
  let previous = null;
  const metrics = { attempts_started: 0, passed: 0, failed: 0, interrupted: 0, reused: 0, avoided_invocations: 0, elapsed_ms: 0 };
  for (let index = 0; index < files.length; index++) {
    const name = files[index];
    const match = /^(\d{8})-([a-f0-9]{64})\.json$/.exec(name);
    const bytes = fs.readFileSync(path.join(recordDirectory, name));
    if (!match || Number(match[1]) !== index + 1 || sha256(bytes) !== match[2]) throw refusal('RELEASE_RECORD_INTEGRITY_FAILED', name);
    let event;
    try { event = JSON.parse(bytes); } catch { throw refusal('RELEASE_RECORD_INTEGRITY_FAILED', name); }
    if (event.schema_version !== SCHEMA_VERSION || event.sequence !== index + 1 || event.previous_sha256 !== previous ||
        !EVENTS.has(event.event) || typeof event.step_id !== 'string' || typeof event.attempt_id !== 'string') {
      throw refusal('RELEASE_RECORD_INTEGRITY_FAILED', name);
    }
    if (event.event === 'STARTED') {
      if (attempts.has(event.attempt_id) || fingerprint(event.identity) !== event.fingerprint) throw refusal('RELEASE_RECORD_INTEGRITY_FAILED', name);
      attempts.set(event.attempt_id, { ...event, status: 'PENDING' });
      metrics.attempts_started++;
    } else {
      const attempt = attempts.get(event.attempt_id);
      if (!attempt || attempt.step_id !== event.step_id || attempt.fingerprint !== event.fingerprint) throw refusal('RELEASE_RECORD_INTEGRITY_FAILED', name);
      if (event.event === 'FINISHED') {
        if (attempt.status !== 'PENDING' || !TERMINAL.has(event.status)) throw refusal('RELEASE_RECORD_INTEGRITY_FAILED', name);
        const receiptPath = within(root, event.receipt);
        let receiptBytes;
        try { receiptBytes = fs.readFileSync(receiptPath); } catch { throw refusal('RELEASE_RECEIPT_MISSING', event.receipt); }
        if (sha256(receiptBytes) !== event.receipt_sha256) throw refusal('RELEASE_RECEIPT_INTEGRITY_FAILED', event.receipt);
        let receipt;
        try { receipt = JSON.parse(receiptBytes); } catch { throw refusal('RELEASE_RECEIPT_INTEGRITY_FAILED', event.receipt); }
        if (receipt.schema_version !== SCHEMA_VERSION || receipt.step_id !== event.step_id || receipt.attempt_id !== event.attempt_id ||
            receipt.fingerprint !== event.fingerprint || receipt.status !== event.status || fingerprint(receipt.identity) !== event.fingerprint ||
            !Number.isFinite(receipt.elapsed_ms) || receipt.elapsed_ms < 0 || !Array.isArray(receipt.outputs)) {
          throw refusal('RELEASE_RECEIPT_INTEGRITY_FAILED', event.receipt);
        }
        Object.assign(attempt, { status: event.status, receipt: event.receipt, receipt_sha256: event.receipt_sha256, proof: receipt });
        metrics[event.status.toLowerCase()]++;
        metrics.elapsed_ms += receipt.elapsed_ms;
      } else if (event.event === 'REUSED') {
        if (attempt.status !== 'PASSED') throw refusal('RELEASE_RECORD_INTEGRITY_FAILED', name);
        metrics.reused++; metrics.avoided_invocations++;
      }
    }
    events.push(event);
    previous = match[2];
  }
  return { schema_version: SCHEMA_VERSION, events, attempts: [...attempts.values()], metrics, last_sha256: previous };
}

function append(directory, record, data) {
  const event = { schema_version: SCHEMA_VERSION, sequence: record.events.length + 1,
    previous_sha256: record.last_sha256, at: new Date().toISOString(), ...data };
  const bytes = Buffer.from(`${canonical(event)}\n`), digest = sha256(bytes);
  const filename = `${String(event.sequence).padStart(8, '0')}-${digest}.json`;
  publishBytes(path.join(directory, 'release-record', filename), bytes);
  record.events.push(event); record.last_sha256 = digest;
}

function alive(pid) {
  try { process.kill(pid, 0); return true; } catch (error) { return error.code !== 'ESRCH'; }
}

function acquire(directory) {
  fs.mkdirSync(directory, { recursive: true });
  const lockDirectory = path.join(directory, 'execution-locks'), token = crypto.randomUUID();
  const name = `${process.pid}-${token}.json`, filename = path.join(lockDirectory, name);
  publishJson(filename, { pid: process.pid, token, created_at: new Date().toISOString() });
  const release = () => {
    const current = JSON.parse(fs.readFileSync(filename, 'utf8'));
    if (current.token !== token || current.pid !== process.pid) throw refusal('EXECUTION_LOCK_OWNERSHIP_CHANGED');
    fs.unlinkSync(filename);
  };
  try {
    // Register before inspecting contenders. Another living registration always
    // refuses execution; simultaneous contenders may both refuse and safely retry.
    // Dead owners are ignored and preserved, never removed through a stale-lock
    // rename race that could steal a new owner's lock. Use a local filesystem.
    for (const other of fs.readdirSync(lockDirectory).filter((entry) => entry.endsWith('.json') && entry !== name)) {
      let lock;
      try { lock = JSON.parse(fs.readFileSync(path.join(lockDirectory, other), 'utf8')); }
      catch (error) { if (error.code === 'ENOENT') continue; throw refusal('EXECUTION_LOCK_UNREADABLE'); }
      if (!Number.isSafeInteger(lock.pid) || lock.pid <= 0 || typeof lock.token !== 'string') throw refusal('EXECUTION_LOCK_UNREADABLE');
      if (alive(lock.pid)) throw refusal('EXECUTION_LOCKED');
    }
    return release;
  } catch (error) { release(); throw error; }
}

function terminalReceipt(directory, record, attempt, status, fields) {
  const relative = path.join('attempts', attempt.attempt_id, `${status.toLowerCase()}.json`);
  const receipt = { schema_version: SCHEMA_VERSION, step_id: attempt.step_id, attempt_id: attempt.attempt_id,
    fingerprint: attempt.fingerprint, identity: attempt.identity, status, completed: status === 'PASSED',
    started_at: attempt.at, finished_at: new Date().toISOString(), outputs: [], elapsed_ms: 0, ...fields };
  const digest = publishJson(path.join(directory, relative), receipt);
  append(directory, record, { event: 'FINISHED', step_id: attempt.step_id, attempt_id: attempt.attempt_id,
    fingerprint: attempt.fingerprint, status, receipt: relative, receipt_sha256: digest });
  return { receipt, receiptPath: path.join(directory, relative), receipt_sha256: digest };
}

function completedValidation(value) {
  if (value === true) return { passed: true, completed: true, failed: 0, skipped: 0 };
  if (!value || value.passed !== true || value.completed !== true || value.failed !== 0 || value.skipped !== 0) {
    throw refusal('LOCAL_CHECK_NOT_COMPLETED_PASS');
  }
  canonical(value);
  return value;
}

function incomplete(value) {
  if (!value || typeof value !== 'object') return false;
  return value.completed === false || value.passed === false || value.partial === true || value.interrupted === true ||
    (typeof value.failed === 'number' && value.failed > 0) || (typeof value.skipped === 'number' && value.skipped > 0) ||
    (Array.isArray(value.skipped) && value.skipped.length > 0) ||
    ['FAILED', 'PENDING', 'INTERRUPTED', 'SKIPPED', 'PARTIAL'].includes(value.status) ||
    (value.totals && incomplete(value.totals)) || (value.execution && incomplete(value.execution));
}

function captureOutputs(directory, attemptId, names) {
  if (!Array.isArray(names) || !names.length) throw refusal('LOCAL_CHECK_OUTPUT_REQUIRED');
  if (new Set(names.map((name) => path.resolve(name))).size !== names.length) throw refusal('DUPLICATE_CHECK_OUTPUT');
  return names.map((name, index) => {
    const original = path.resolve(name);
    if (!fs.statSync(original).isFile()) throw refusal('LOCAL_CHECK_OUTPUT_NOT_FILE');
    const bytes = fs.readFileSync(original);
    const artifact = path.join('attempts', attemptId, 'artifacts', `${String(index).padStart(4, '0')}.bin`);
    publishBytes(path.join(directory, artifact), bytes);
    return { path: original, artifact, sha256: sha256(bytes), bytes: bytes.length };
  });
}

function reusable(directory, receipt) {
  if (!receipt.completed || receipt.status !== 'PASSED' || incomplete(receipt.value)) return 'INCOMPLETE_PROOF';
  try { completedValidation(receipt.validation); } catch { return 'INCOMPLETE_PROOF'; }
  if (!receipt.outputs.length) return 'OUTPUT_PROOF_MISSING';
  for (const output of receipt.outputs) {
    try {
      for (const filename of [output.path, within(directory, output.artifact)]) {
        if (typeof filename !== 'string' || !path.isAbsolute(filename) || !fs.statSync(filename).isFile()) return 'OUTPUT_MISSING';
        const bytes = fs.readFileSync(filename);
        if (bytes.length !== output.bytes || sha256(bytes) !== output.sha256) return 'OUTPUT_CHANGED';
      }
    } catch { return 'OUTPUT_MISSING'; }
  }
  return null;
}

/** identity contains exact JSON constraints for source/tests/fixtures/toolchain/environment.
 * The caller computes them from current inputs and performs any relevant post-run freeze checks.
 * run receives an isolated outputDirectory; outputs names proof files (or returns them from value).
 * validate must explicitly establish a completed pass, never a skip/partial/failed result. */
async function executeStep({ directory, id, identity, run, validate, outputs }) {
  if (typeof directory !== 'string' || !directory || typeof id !== 'string' || !/^[a-z0-9][a-z0-9._-]{0,79}$/i.test(id) ||
      typeof run !== 'function' || typeof validate !== 'function') throw refusal('INVALID_LOCAL_STEP');
  if (/(^|[._-])(hosted|activate|activation|deploy|promotion|promote|rollback|smoke|purchase|configuration)([._-]|$)/i.test(id)) {
    throw refusal('FRESH_OR_PRIVILEGED_STEP_NOT_REUSABLE');
  }
  if (/^[\\/]{2}/.test(directory)) throw refusal('LOCAL_RECORD_DIRECTORY_REQUIRED');
  const digest = fingerprint(identity), frozenIdentity = JSON.parse(canonical(identity));
  const root = path.resolve(directory), release = acquire(root);
  try {
    let record = readRecord(root);
    for (const attempt of record.attempts.filter((row) => row.status === 'PENDING')) {
      terminalReceipt(root, record, attempt, 'INTERRUPTED', { error: { code: 'PREVIOUS_EXECUTION_INTERRUPTED' } });
    }
    record = readRecord(root);
    let rejectedOutput = false;
    for (const prior of [...record.attempts].reverse().filter((row) => row.step_id === id && row.fingerprint === digest && row.status === 'PASSED')) {
      const reason = reusable(root, prior.proof);
      if (!reason) {
        append(root, record, { event: 'REUSED', step_id: id, attempt_id: prior.attempt_id, fingerprint: digest });
        return { reused: true, status: 'PASSED', value: prior.proof.value, receipt: prior.proof,
          receiptPath: within(root, prior.receipt), receipt_sha256: prior.receipt_sha256, metrics: readRecord(root).metrics };
      }
      rejectedOutput = true;
      append(root, record, { event: 'REUSE_REJECTED', step_id: id, attempt_id: prior.attempt_id, fingerprint: digest, reason });
    }
    const attemptId = `${id}-${crypto.randomUUID()}`, outputDirectory = path.join(root, 'attempts', attemptId, 'outputs');
    fs.mkdirSync(outputDirectory, { recursive: true });
    const previous = record.attempts.filter((row) => row.step_id === id).pop();
    const changedInputs = previous ? REQUIRED_INPUTS.filter((key) => canonical(previous.identity[key]) !== canonical(frozenIdentity[key])) : [];
    const reason = rejectedOutput ? 'OUTPUT_PROOF_INVALID' : !previous ? 'FIRST_EXECUTION' : previous.fingerprint !== digest ? 'INPUT_IDENTITY_CHANGED'
      : previous.status === 'INTERRUPTED' ? 'RESUME_AFTER_INTERRUPTION' : 'RETRY_AFTER_FAILURE';
    const start = { event: 'STARTED', step_id: id, attempt_id: attemptId, fingerprint: digest, identity: frozenIdentity,
      reason, changed_inputs: changedInputs };
    append(root, record, start);
    const attempt = record.events[record.events.length - 1], context = { attempt: attemptId, outputDirectory };
    const started = Date.now();
    try {
      const result = await run(context), value = result === undefined ? null : result;
      canonical(value);
      if (incomplete(value)) throw refusal('LOCAL_CHECK_NOT_COMPLETED_PASS');
      const validation = completedValidation(await validate(value, context));
      if (fingerprint(identity) !== digest) throw refusal('EXECUTION_INPUTS_CHANGED');
      const captured = captureOutputs(root, attemptId, typeof outputs === 'function' ? await outputs(value, context) : outputs);
      const finished = terminalReceipt(root, record, attempt, 'PASSED', { value, validation, outputs: captured, elapsed_ms: Date.now() - started });
      return { reused: false, status: 'PASSED', value, ...finished, metrics: readRecord(root).metrics };
    } catch (thrown) {
      const error = thrown instanceof Error ? thrown : refusal('LOCAL_CHECK_FAILED', String(thrown));
      // Publication succeeded: any subsequent integrity failure must refuse the
      // result without manufacturing a contradictory second terminal event.
      if (record.events.some((event) => event.event === 'FINISHED' && event.attempt_id === attemptId)) throw error;
      const interrupted = error.name === 'AbortError' || error.code === 'INTERRUPTED';
      const finished = terminalReceipt(root, record, attempt, interrupted ? 'INTERRUPTED' : 'FAILED', {
        elapsed_ms: Date.now() - started, error: { name: String(error.name || 'Error'), code: String(error.code || 'LOCAL_CHECK_FAILED'),
          message: String(error.message || error).slice(0, 1024) } });
      error.execution_receipt = finished.receiptPath;
      throw error;
    }
  } finally { release(); }
}

module.exports = { SCHEMA_VERSION, executeStep, readRecord, fingerprint };
