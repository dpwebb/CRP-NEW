'use strict';
const fs = require('node:fs');
const fixtures = require('../../../../internal-validation/ca-ns-last-payment-six-year/tests/fixtures.cjs');

async function run(t, check) {
  const a = await t.account('support-a@example.test');
  const b = await t.account('support-b@example.test');

  /* A holds a case with a name-bearing report and a result, so any leak would be visible. */
  const caseId = (await t.request('POST', '/api/cases', { token: a.token, body: { country: 'US', region: 'US-CA' } })).json.case.case_id;
  const upload = await t.request('POST', `/api/cases/${caseId}/files`, { token: a.token, body: { originalFilename: 'john-smith-credit-report.pdf', declaredBytes: 1, mimeType: 'application/pdf', contentBase64: fs.readFileSync(fixtures.pdfFixtures().unpinned).toString('base64') } });
  check.equal(upload.status, 201, 'owned document stored');
  check.equal((await t.request('POST', `/api/cases/${caseId}/demonstration`, { token: a.token, body: { scenario: 'TWO_ACCOUNTS' } })).status, 201, 'a result exists');

  /* reference — an owned, stable, opaque token. */
  const info = await t.request('GET', '/api/support', { token: a.token });
  check.equal(info.status, 200, 'support reference available to the owner');
  check.match(info.json.reference, /^crp-ref-[0-9a-f]{24}$/, 'the reference is an opaque token');
  check.equal(typeof info.json.build_id, 'string', 'the build id is present');
  check.equal(info.json.category, 'RESULT_PRESENT', 'the category reflects the account lifecycle');
  check.deepEqual(info.json.jurisdiction, [{ country: 'US', region: 'US-CA' }], 'jurisdiction is present for reproduction');
  check.equal(info.json.case_count, 1, 'own case count present');
  check.equal(info.json.file_count, 1, 'own file count present');
  check.equal(info.json.result_count, 1, 'own result count present');
  const again = await t.request('GET', '/api/support', { token: a.token });
  check.equal(again.json.reference, info.json.reference, 'the reference is stable across requests');

  /* redaction — no report content, names, credentials, payment details or legal-source identifiers. */
  check.ok(!/john-smith/.test(info.text), 'original document names are not exposed');
  check.ok(!/crp_session=|Bearer /.test(info.text), 'session credentials are not exposed');
  check.ok(!info.text.includes(a.token), 'the account session token is not exposed');
  check.ok(!info.text.includes(a.payment.reference) && !info.text.includes(a.payment.checkout_id), 'payment tokens are not exposed');
  check.ok(!/adapter_id|source_entry_id|policy_digest|stored_path|original_filename/.test(info.text), 'internal identifiers and storage paths are not exposed');
  for (const key of ['ok', 'reference', 'build_id', 'category', 'jurisdiction', 'case_count', 'file_count', 'result_count', 'generated_at', 'plain']) {
    check.ok(Object.prototype.hasOwnProperty.call(info.json, key), `support view carries the safe field ${key}`);
  }
  check.deepEqual(Object.keys(info.json).filter((k) => !['ok', 'reference', 'build_id', 'category', 'jurisdiction', 'case_count', 'file_count', 'result_count', 'generated_at', 'plain'].includes(k)), [], 'support view carries no field beyond the safe operational set');

  /* access — authentication and ownership enforcement. */
  check.equal((await t.request('GET', '/api/support')).status, 401, 'support requires authentication');
  check.equal((await t.request('GET', `/api/support/references/${info.json.reference}`, { token: b.token })).status, 404, 'a reference owned by another account is refused');
  check.equal((await t.request('GET', '/api/support/references/crp-ref-000000000000000000000000', { token: a.token })).status, 404, 'an unknown reference is refused');
  const owned = await t.request('GET', `/api/support/references/${info.json.reference}`, { token: a.token });
  check.equal(owned.status, 200, 'the owner can read their own reference back');
  check.equal(owned.json.reference, info.json.reference, 'lookup returns the same reference');

  /* usefulness — a fresh account has no case, and the category says so. */
  const fresh = await t.request('GET', '/api/support', { token: b.token });
  check.equal(fresh.status, 200, 'support view available to any authenticated account');
  check.equal(fresh.json.category, 'NO_CASE', 'a fresh account reports NO_CASE');
  check.equal(fresh.json.case_count, 0, 'a fresh account has no cases');

  return { reference: true, redaction: true, access: true, usefulness: true };
}

module.exports = { run, id: 'ay-consumer-support', title: 'Privacy-safe account-owned diagnostic reference (reference, redaction, access, usefulness)' };
