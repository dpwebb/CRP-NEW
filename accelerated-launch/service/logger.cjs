'use strict';
/**
 * logger.cjs — the only place this service writes to a console or a log stream.
 *
 * OWNER-ALL82-001 / B2, plan section 8: "no report text enters application logs", and section 4: "Keep
 * report data private; enforce ownership on every case, file and result operation."
 *
 * Rather than trusting every call site to redact, the sink accepts a FIXED FIELD WHITELIST. A consumer
 * address, a case id, a file id, a file name, a digest, a path or any report text cannot be logged even by
 * accident, because no such key exists. `state.cjs` in the tests asserts this against a captured stream.
 */

/** The complete set of keys any log record may carry. Adding one here is the only way to log a new field. */
const ALLOWED_FIELDS = Object.freeze([
  'event',
  'region',
  'outcome',
  'adapter_id',
  'presentation_id',
  'count',
  'reason_code',
  'http_status'
]);

const ERROR_CODE = /^[A-Z][A-Z0-9_]{0,63}$/;
const CANONICAL_REGION = /^[A-Z]{2}-[A-Z0-9]{1,3}$/;

function sanitize(record) {
  const safe = {};
  for (const key of ALLOWED_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(record, key)) continue;
    const value = record[key];
    if (value === null || value === undefined) continue;
    if (key === 'region') {
      if (typeof value === 'string' && CANONICAL_REGION.test(value)) safe.region = value;
      continue;
    }
    if (key === 'reason_code' || key === 'event' || key === 'outcome' || key === 'adapter_id' || key === 'presentation_id') {
      if (typeof value === 'string' && ERROR_CODE.test(value)) safe[key] = value;
      continue;
    }
    if (key === 'count' || key === 'http_status') {
      if (Number.isInteger(value)) safe[key] = value;
      continue;
    }
  }
  return safe;
}

class Logger {
  constructor(sink) {
    this.sink = typeof sink === 'function' ? sink : (line) => process.stderr.write(`${line}\n`);
    this.enabled = process.env.CRP_LOCAL_SERVICE_LOG !== 'silent';
  }

  /** Emit one sanitized record. `event` is required; every other field is dropped unless it is whitelisted. */
  log(record) {
    if (!this.enabled) return;
    if (!record || typeof record.event !== 'string') return;
    const safe = sanitize(record);
    if (!safe.event) return;
    this.sink(JSON.stringify(safe));
  }
}

module.exports = { Logger, ALLOWED_FIELDS, sanitize };
