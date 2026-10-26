import test from 'node:test';
import assert from 'node:assert/strict';
import { fixtures } from './fixtures.mjs';

test('human activity renews idle authority without renewing MFA or the absolute cap', async t => {
  let clock = Date.now();
  const f = await fixtures({now: () => clock, singleSignIn: true});
  t.after(() => f.close());
  await f.login();
  const s = [...f.portal.gateway.sessions.values()][0];
  const cap = s.authenticatedUntil, csrf = s.csrf, factor = s.verifiedAt;
  clock += 9 * 60000;
  assert.equal((await f.request('/api/activity', {method: 'POST', body: {}})).status, 200);
  assert.equal(s.expires, clock + 15 * 60000);
  assert.equal(s.verifiedAt, factor, 'activity is not a new authentication factor');
  assert.equal(s.authenticatedUntil, cap);
  clock += 7 * 60000;
  assert.equal((await f.request('/api/apps/crp/accounts')).status, 200);
  assert.equal(s.csrf, csrf);
  assert.equal((await f.request('/api/status')).json.unlockRequired, false);
});

test('three hundred passive half-minute checks call no native resolver and never slide expiry', async t => {
  let clock = Date.now();
  const f = await fixtures({now: () => clock});
  t.after(() => f.close());
  await f.login();
  const s = [...f.portal.gateway.sessions.values()][0];
  const expires = s.expires, cap = s.authenticatedUntil, calls = f.state.calls.length;
  for (let i = 1; i <= 300; i++) {
    clock += 30000;
    const r = await f.request('/api/status');
    assert.equal(r.status, 200);
    assert.equal(r.json.unlockRequired, i >= 30);
    for (const key of ['csrf', 'subject', 'email', 'permissions', 'catalog', 'applications'])
      assert.equal(Object.hasOwn(r.json, key), false);
  }
  assert.equal(f.state.calls.length, calls);
  assert.equal(s.expires, expires);
  assert.equal(s.authenticatedUntil, cap);
});

test('idle lock preserves the session through another login and fresh unlock; absolute expiry revokes it', async t => {
  let clock = Date.now();
  const f = await fixtures({now: () => clock});
  t.after(() => f.close());
  await f.login();
  const s = [...f.portal.gateway.sessions.values()][0];
  const cookie = f.cookie, csrf = s.csrf, cap = s.authenticatedUntil;
  clock += 901000;
  assert.equal((await f.request('/api/session')).json.unlockRequired, true);
  assert.equal(f.portal.gateway.sessions.get(s.key), s);
  await f.login();
  assert.equal(f.portal.gateway.sessions.get(s.key), s, 'another login must not sweep an idle session');
  const unlocked = await f.request('/api/unlock', {method: 'POST', headers: {cookie, 'x-csrf-token': csrf}, body: {code: '654321'}});
  assert.equal(unlocked.status, 200);
  assert.equal(s.csrf, csrf);
  assert.equal(s.authenticatedUntil, cap);
  clock = cap + 1;
  assert.equal((await f.request('/api/status', {headers: {cookie}})).status, 401);
  assert.equal(f.portal.gateway.sessions.has(s.key), false);
});

test('activity rejects anonymous, foreign-origin, missing-CSRF and nonempty or nonobject inputs', async t => {
  const f = await fixtures();
  t.after(() => f.close());
  assert.equal((await f.request('/api/status')).status, 401);
  await f.login();
  const before = f.state.calls.length;
  for (const body of [[], null, 1, {renewFactor: true}])
    assert.equal((await f.request('/api/activity', {method: 'POST', body})).status, 400);
  assert.equal((await f.request('/api/activity', {method: 'POST', body: {}, headers: {'x-csrf-token': ''}})).status, 403);
  assert.equal((await f.request('/api/activity', {method: 'POST', body: {}, headers: {origin: 'https://example.invalid'}})).status, 403);
  assert.equal(f.state.calls.length, before);
});
