'use strict';
/**
 * f-signout-and-deletion.cjs — the second half of acceptance item 6: "Sign-out and deletion prevent
 * subsequent unauthorized access."
 *
 * Deletion has to mean deletion: the stored bytes have to be gone from disk, not merely unreferenced, and the
 * case id has to stop resolving for its own owner.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const FIXTURES = require('../../../../internal-validation/ca-ns-last-payment-six-year/tests/fixtures.cjs');

async function run(t, check) {
  const owner = await t.account('owner-deletion@example.test');

  /* ---------------------------------------------------------------- sign-out destroys the session */

  const caseId = (await t.request('POST', '/api/cases', { token: owner.token, body: { country: 'CA', region: 'CA-NS' } })).json.case.case_id;
  const beforeOut = await t.request('GET', '/api/cases', { token: owner.token });
  check.equal(beforeOut.status, 200, 'the session works before signing out');

  const signedOut = await t.request('DELETE', '/api/sessions/current', { token: owner.token });
  check.equal(signedOut.status, 200);
  check.equal(signedOut.json.signed_out, true, 'the session row was destroyed');
  check.ok(/Max-Age=0/.test(signedOut.setCookie || ''), 'the cookie is cleared');

  check.equal((await t.request('GET', '/api/session', { token: owner.token })).status, 401, 'the same token is refused afterwards');
  check.equal((await t.request('GET', '/api/cases', { token: owner.token })).status, 401, 'and it cannot reach the case list');
  check.equal((await t.request('GET', `/api/cases/${caseId}`, { token: owner.token })).status, 401, 'and it cannot reach a case it owns');

  /* ---------------------------------------------------------------- case deletion removes the bytes */

  const second = await t.account('owner-deletion-2@example.test');
  const doomed = (await t.request('POST', '/api/cases', { token: second.token, body: { country: 'CA', region: 'CA-NS' } })).json.case.case_id;
  const fixtures = FIXTURES.pdfFixtures();
  const uploaded = await t.request('POST', `/api/cases/${doomed}/files`, {
    token: second.token,
    body: { originalFilename: 'lookalike.pdf', declaredBytes: 1, mimeType: 'application/pdf', contentBase64: fs.readFileSync(fixtures.unpinned).toString('base64') }
  });
  check.equal(uploaded.status, 201, 'a lookalike is stored so there are bytes to delete');
  const blobs = t.blobFiles();
  check.equal(blobs.length, 1, 'exactly one blob is on disk');
  const blobPath = require('node:path').join(t.dataDir, 'blobs', blobs[0]);
  check.ok(fs.existsSync(blobPath), 'and it is a real file before deletion');

  await t.request('POST', `/api/cases/${doomed}/demonstration`, { token: second.token, body: { scenario: 'TWO_ACCOUNTS' } });
  check.equal((await t.request('GET', `/api/cases/${doomed}/results`, { token: second.token })).json.results.length, 1, 'a result set exists before deletion');

  const deleted = await t.request('DELETE', `/api/cases/${doomed}`, { token: second.token });
  check.equal(deleted.status, 200);
  check.equal(deleted.json.blobs_removed, 1, 'the deletion reports the stored file it removed');
  check.ok(!fs.existsSync(blobPath), 'the report bytes are gone from disk, not merely dereferenced');
  check.equal(t.blobFiles().length, 0, 'no blob remains');
  check.equal((await t.request('GET', `/api/cases/${doomed}`, { token: second.token })).status, 404, 'the case id no longer resolves for its owner');
  check.equal((await t.request('GET', `/api/cases/${doomed}/results`, { token: second.token })).status, 404, 'and neither do its results');
  check.equal((await t.request('GET', `/api/cases/${doomed}/demonstration-download`, { token: second.token })).status, 404, 'and neither does its download');
  check.equal((await t.request('DELETE', `/api/cases/${doomed}`, { token: second.token })).status, 404, 'and it cannot be deleted twice');
  check.equal((await t.request('GET', '/api/cases', { token: second.token })).json.cases.length, 0, 'the case list is empty again');

  /* ---------------------------------------------------------------- account deletion cascades */

  const third = await t.account('owner-deletion-3@example.test');
  const thirdCase = (await t.request('POST', '/api/cases', { token: third.token, body: { country: 'CA', region: 'CA-NS' } })).json.case.case_id;
  await t.request('POST', `/api/cases/${thirdCase}/files`, {
    token: third.token,
    body: { originalFilename: 'lookalike.pdf', declaredBytes: 1, mimeType: 'application/pdf', contentBase64: fs.readFileSync(fixtures.unpinned).toString('base64') }
  });
  const accountGone = await t.request('DELETE', '/api/account', { token: third.token });
  check.equal(accountGone.status, 200);
  check.equal(accountGone.json.stored_files_removed, 1, 'account deletion removes stored bytes too');
  check.equal((await t.request('GET', '/api/session', { token: third.token })).status, 401, 'every session for the account is destroyed');
  check.equal((await t.request('GET', '/api/cases', { token: third.token })).status, 401, 'and the account can no longer sign in with it');
  check.equal(t.blobFiles().length, 0, 'no blob remains after account deletion');

  const reSignIn = await t.request('POST', '/api/sessions', { body: { email: third.email, password: 'a-long-enough-password' } });
  check.equal(reSignIn.status, 401, 'the deleted account cannot sign in again');

  return { blobsAfterDeletion: t.blobFiles().length };
}

module.exports = { run, id: 'f-deletion', title: 'Sign-out and deletion stop subsequent access, and remove stored bytes' };
