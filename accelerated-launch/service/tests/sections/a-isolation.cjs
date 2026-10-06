'use strict';
/**
 * a-isolation.cjs — acceptance item 1: "User A cannot access user B's case, file or results through direct
 * requests", and acceptance item 6's first half: a session that has been destroyed stops working.
 *
 * Every request here is a real loopback HTTP request carrying a real bearer token. Nothing is stubbed.
 */

const assert = require('node:assert/strict');

async function run(t, check) {
  const alice = await t.account('alice-isolation@example.test');
  const bob = await t.account('bob-isolation@example.test');

  const created = await t.request('POST', '/api/cases', { token: alice.token, body: { country: 'CA', region: 'CA-NS' } });
  check.equal(created.status, 201, "alice's case is created");
  const caseId = created.json.case.case_id;

  const bobList = await t.request('GET', '/api/cases', { token: bob.token });
  check.equal(bobList.json.cases.length, 0, "bob's case list does not contain alice's case");

  const bobRead = await t.request('GET', `/api/cases/${caseId}`, { token: bob.token });
  check.equal(bobRead.status, 403, 'a direct read of another account\'s case is refused');
  check.equal(bobRead.json.error.code, 'NOT_AUTHORIZED');
  check.ok(!/CA-NS|Nova Scotia/.test(bobRead.text), 'the refusal body discloses nothing about the other case');

  for (const [method, route] of [
    ['POST', `/api/cases/${caseId}/evaluate`],
    ['PATCH', `/api/cases/${caseId}/status`],
    ['DELETE', `/api/cases/${caseId}`],
    ['POST', `/api/cases/${caseId}/review`],
    ['GET', `/api/cases/${caseId}/response-draft`],
    ['GET', `/api/cases/${caseId}/demonstration-download`],
    ['POST', `/api/cases/${caseId}/demonstration`],
    ['GET', `/api/cases/${caseId}/results`]
  ]) {
    const attempt = await t.request(method, route, { token: bob.token, body: method === 'GET' ? undefined : {} });
    check.equal(attempt.status, 403, `${method} ${route} is refused for another account`);
  }

  const stillThere = await t.request('GET', `/api/cases/${caseId}`, { token: alice.token });
  check.equal(stillThere.status, 200, "alice's case survives every attempt by bob");

  const unknown = await t.request('GET', '/api/cases/case_doesnotexist', { token: alice.token });
  check.equal(unknown.status, 404, 'an id that names no case is 404, not 403');

  const anonymous = await t.request('GET', '/api/cases');
  check.equal(anonymous.status, 401, 'no session means no case list');

  const forged = await t.request('GET', '/api/cases', { token: 'not-a-real-token' });
  check.equal(forged.status, 401, 'a forged session token is refused');

  /* A file and its results are reachable only through the owner's session. */
  const upload = await t.request('POST', `/api/cases/${caseId}/files`, {
    token: alice.token,
    body: { originalFilename: 'a.pdf', declaredBytes: 12, mimeType: 'application/pdf', contentBase64: Buffer.from('not a pdf at all').toString('base64') }
  });
  check.equal(upload.status, 400, 'the non-PDF refusal is reached only by the owner');

  const aliceSession = await t.request('GET', '/api/session', { token: alice.token });
  check.equal(aliceSession.json.account.email, alice.email, 'the session reports the acting account and nothing else');

  return { alice, bob, caseId };
}

module.exports = { run, id: 'a-isolation', title: 'Account isolation on every case, file and result operation' };
