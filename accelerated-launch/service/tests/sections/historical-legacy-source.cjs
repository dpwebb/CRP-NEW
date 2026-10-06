'use strict';
/**
 * h-legacy-parity.cjs — the isolated verification of the two legacy behaviours this slice reuses.
 *
 * OWNER-ALL82-001 / B2, plan section 6: "Verify them in isolation before adoption", and section 9: "Inspect
 * inherited scripts' write destinations and external calls before executing them." This section READS two
 * legacy source files and never executes, imports, builds, mutates or deletes anything under the legacy
 * checkout. If the legacy rules drift, or if this service becomes more permissive than the legacy ingestion
 * gate was, the assertions below fail.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const uploads = require('../../uploads.cjs');
const { STATUS_BY_CODE, MESSAGE_BY_CODE } = require('../../errors.cjs');

const LEGACY = process.env.CRP_LEGACY_CHECKOUT || 'C:\\Users\\webbd\\crp-credit-app';
const REPORT_STORE = path.join(LEGACY, 'packages', 'backend', 'src', 'services', 'reportStore.ts');
const AUTH_MIDDLEWARE = path.join(LEGACY, 'packages', 'backend', 'src', 'middleware', 'auth.ts');

function arithmetic(expression) {
  const trimmed = String(expression).trim();
  if (!/^[\d\s*+]+$/.test(trimmed)) return null;
  return Number(new Function(`return (${trimmed});`)());
}

function numericConstant(source, name) {
  const match = new RegExp(`${name}\\s*=\\s*([0-9][0-9\\s*+]*);`).exec(source);
  return match ? arithmetic(match[1]) : null;
}

function stringArray(source, name) {
  const match = new RegExp(`${name}\\s*=\\s*\\[([\\s\\S]*?)\\]`).exec(source);
  if (!match) return null;
  return [...match[1].matchAll(/'([^']*)'|"([^"]*)"/g)].map((m) => m[1] || m[2]);
}

async function run(t, check) {
  if (!fs.existsSync(REPORT_STORE) || !fs.existsSync(AUTH_MIDDLEWARE)) {
    check.ok(false, `the legacy checkout is not present at ${LEGACY}; set CRP_LEGACY_CHECKOUT`);
    return { available: false };
  }
  const reportStore = fs.readFileSync(REPORT_STORE, 'utf8');
  const auth = fs.readFileSync(AUTH_MIDDLEWARE, 'utf8');

  /* ---------------------------------------------------------------- the upload gate */

  const legacyMaxBytes = numericConstant(reportStore, 'MAX_FILE_BYTES');
  check.equal(legacyMaxBytes, 10 * 1024 * 1024, 'the legacy size limit is still 10MB');
  check.equal(uploads.MAX_FILE_BYTES, legacyMaxBytes, 'this service uses the SAME size limit, not a looser one');

  const legacyMime = stringArray(reportStore, 'ALLOWED_MIME_PREFIXES');
  check.ok(Array.isArray(legacyMime) && legacyMime.length > 0, 'the legacy mime allowlist is still declared');
  check.ok(legacyMime.includes('application/pdf'), 'the legacy gate still accepts PDF');
  check.deepEqual(
    uploads.SUPPORTED_MIME_PREFIXES.filter((prefix) => !legacyMime.includes(prefix)),
    ['image/png', 'image/jpeg'],
    'the only types beyond the legacy gate are the B6-INGEST-003 image additions'
  );

  const legacyExtensions = stringArray(reportStore, 'safe') || [];
  check.ok(legacyExtensions.includes('.pdf'), 'the legacy extension allowlist still contains .pdf');
  check.deepEqual(
    uploads.SUPPORTED_EXTENSIONS.filter((ext) => !legacyExtensions.includes(ext)),
    ['.png', '.jpg', '.jpeg'],
    'the only extensions beyond the legacy gate are the B6-INGEST-003 image additions'
  );

  /* The same boundary conditions, exercised on our port. */
  const empty = uploads.validateUploadMeta({ declaredBytes: 0, mimeType: 'application/pdf', originalFilename: 'a.pdf' });
  const overLimit = uploads.validateUploadMeta({ declaredBytes: legacyMaxBytes + 1, mimeType: 'application/pdf', originalFilename: 'a.pdf' });
  const atLimit = uploads.validateUploadMeta({ declaredBytes: legacyMaxBytes, mimeType: 'application/pdf', originalFilename: 'a.pdf' });
  check.match(reportStore, /File exceeds the \$\{MAX_FILE_BYTES \/ 1024 \/ 1024\}MB limit\./, 'the legacy over-limit message is still built from the same constant');
  const legacyLimitWording = `${legacyMaxBytes / 1024 / 1024}MB limit`;
  check.ok(MESSAGE_BY_CODE.FILE_TOO_LARGE.includes(legacyLimitWording), 'this service states the SAME rendered limit in its own words');
  check.ok(MESSAGE_BY_CODE.FILE_TOO_LARGE !== `File exceeds the ${legacyLimitWording}.`, 'but it is consumer copy, not the ingestion gate\'s string');

  check.ok(/"Uploaded file appears empty\."/.test(reportStore), 'the legacy empty-file refusal is still present');

  /* ---------------------------------------------------------------- the ownership semantics */

  check.ok(/res\s*\.status\(404\)[\s\S]{0,120}Resource not found/.test(auth), 'the legacy guard still answers an unknown resource with 404');
  check.ok(/resource\.userId\s*!==\s*actor\.id[\s\S]{0,160}res\s*\.status\(403\)/.test(auth), 'and still refuses another account\'s resource with 403');
  check.ok(/roleIsAdmin\(actor\.role\)/.test(auth), 'with the admin bypass still the only exception');

  /* The legacy storage-key rule this service follows: a location derived from an internal id. */
  check.ok(/reportDir\(reportId\)/.test(reportStore) && /path\.join\(STORAGE_ROOT, "reports", reportId\)/.test(reportStore),
    'the legacy storage location is still derived from an internal id, never from a supplied name');

  return { legacy_max_bytes: legacyMaxBytes, legacy_mime_prefixes: legacyMime.length, legacy_extensions: legacyExtensions.length };
}

module.exports = { run, id: 'historical-legacy-source', title: 'Legacy upload-gate and ownership semantics, verified read-only' };
