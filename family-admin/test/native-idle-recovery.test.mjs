import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {resolve, join} from 'node:path';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {generateKeyPairSync} from 'node:crypto';
import {createPortal} from '../src/server.mjs';

test('real native idle timestamps survive passive polling; same-person MFA recovery retains Family identity and cap', async () => {
  const require = createRequire(import.meta.url);
  const root = process.env.CRP_FAMILY_CONSUMER_ROOT || fileURLToPath(new URL('../..', import.meta.url));
  const {TestService} = require(resolve(root, 'accelerated-launch/service/tests/harness.cjs'));
  const security = require(resolve(root, 'accelerated-launch/service/signup-security.cjs'));
  const access = require(resolve(root, 'accelerated-launch/service/admin-access.cjs'));
  const directory = mkdtempSync(join(tmpdir(), 'family-native-idle-'));
  const originalNow = Date.now, enabled = process.env.CRP_ADMIN_ENABLED;
  let clock = originalNow(), consumer, portal;
  process.env.CRP_ADMIN_ENABLED = '1';
  try {
    consumer = await new TestService('family-native-idle').listen();
    const owner = await consumer.unpaidAccount('fictional-native-idle@example.invalid');
    Date.now = () => clock - 180000;
    const setup = security.beginTwoFactor(consumer.service.store, owner, {password: 'a-long-enough-password'});
    security.confirmTwoFactor(consumer.service.store, owner, {code: security.totp(setup.secret)});
    access.bootstrapOwner(consumer.service.adminStore, {account_id: owner.account_id, code: security.totp(setup.secret, clock - 150000)});
    Date.now = () => clock;
    const {privateKey} = generateKeyPairSync('ed25519');
    portal = createPortal({environment: 'local', familySso: true, origin: 'http://127.0.0.1:0',
      upstreams: {crp: consumer.base}, auditDirectory: directory, bindings: {}},
    {ssoPrivateKey: privateKey, now: () => clock});
    await new Promise(r => portal.server.listen(0, '127.0.0.1', r));
    const base = 'http://127.0.0.1:' + portal.server.address().port;
    portal.config.origin = base;
    portal.config.port = portal.server.address().port;
    portal.config.host = '127.0.0.1:' + portal.config.port;
    let cookie = '', csrf = '';
    const request = async (path, method = 'GET', body) => {
      const response = await fetch(base + path, {method, headers: {origin: base, cookie,
        'x-csrf-token': csrf, ...(body ? {'content-type': 'application/json'} : {})},
      ...(body ? {body: JSON.stringify(body)} : {})});
      for (const value of response.headers.getSetCookie())
        if (value.startsWith('crp_family=')) cookie = value.split(';')[0];
      const data = await response.json();
      if (data.csrf) csrf = data.csrf;
      return {status: response.status, data};
    };
    assert.equal((await request('/api/login', 'POST', {email: owner.email,
      password: 'a-long-enough-password', code: security.totp(setup.secret, clock)})).status, 200);
    clock += 30000;
    assert.equal((await request('/api/unlock', 'POST', {code: security.totp(setup.secret, clock)})).status, 200);
    const session = [...portal.gateway.sessions.values()][0];
    const identity = {key: session.key, csrf: session.csrf, cap: session.authenticatedUntil};
    const before = consumer.service.store.state().sessions;
    for (let i = 0; i < 300; i++) {
      clock += 30000;
      assert.equal((await request('/api/status')).status, 200);
    }
    assert.deepEqual(consumer.service.store.state().sessions, before,
      'passive status must not resolve, renew or remove native sessions');
    const expired = await request('/api/unlock', 'POST', {code: security.totp(setup.secret, clock)});
    assert.equal(expired.status, 401);
    assert.equal(expired.data.error.code, 'PRIMARY_AUTHENTICATION_REQUIRED');
    const recovered = await request('/api/reauthenticate', 'POST', {password: 'a-long-enough-password',
      code: security.totp(setup.secret, clock)});
    assert.equal(recovered.status, 200);
    assert.equal(session.authorized, false, 'primary recovery alone never unlocks administration');
    assert.equal(session.verifiedAt, 0);
    assert.equal((await request('/api/apps/crp/accounts')).status, 401);
    clock += 30000;
    assert.equal((await request('/api/unlock', 'POST', {code: security.totp(setup.secret, clock)})).status, 200);
    assert.deepEqual({key: session.key, csrf: session.csrf, cap: session.authenticatedUntil}, identity);
    assert.equal((await request('/api/apps/crp/accounts')).status, 200);
    assert(portal.journal.events.some(e => e.event === 'PRIMARY_REAUTHENTICATED'));
    clock = identity.cap + 1;
    assert.equal((await request('/api/status')).status, 401);
    assert.equal(portal.gateway.sessions.has(identity.key), false);
  } finally {
    Date.now = originalNow;
    if (portal) await portal.close();
    if (consumer) await consumer.close();
    if (enabled === undefined) delete process.env.CRP_ADMIN_ENABLED;
    else process.env.CRP_ADMIN_ENABLED = enabled;
    const relative = resolve(directory).startsWith(resolve(tmpdir()) + '\\') || resolve(directory).startsWith(resolve(tmpdir()) + '/');
    assert(relative && directory.includes('family-native-idle-'));
    rmSync(directory, {recursive: true, force: true});
  }
});
