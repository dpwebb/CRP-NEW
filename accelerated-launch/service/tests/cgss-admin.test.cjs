'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createCgssAdmin } = require('../cgss-admin-sso.cjs');

const ADMIN_SUBJECT = 'e0dab951-27da-4d75-b1df-ced8fcb250e5';
const ADMIN_EMAIL = 'admin@compnd.systems';
const HOST = '127.0.0.1:8787';
const env = {
  CGSS_ISSUER: 'http://issuer.test/application/o/crp-new/',
  CGSS_CLIENT_ID: 'crp-new-local',
  CGSS_CLIENT_SECRET: 'local-test-secret',
  CGSS_REDIRECT_URI: `http://${HOST}/auth/admin/callback`,
  CGSS_ADMIN_SUBJECT: ADMIN_SUBJECT,
  CGSS_ADMIN_GROUP: 'portfolio-superadmin',
};

function claims(overrides = {}) {
  return {
    sub: ADMIN_SUBJECT,
    email: ADMIN_EMAIL,
    emailVerified: true,
    groups: ['portfolio-superadmin'],
    acr: 'goauthentik.io/providers/oauth2/default',
    amr: ['pwd', 'mfa'],
    authTime: 1_800_000_000,
    nonce: 'nonce',
    ...overrides,
  };
}

function fakeClient(value = claims()) {
  const calls = { begin: [], complete: [] };
  return {
    calls,
    client: {
      issuer: env.CGSS_ISSUER,
      async beginAuthorization(options = {}) {
        calls.begin.push(options);
        return { url: 'http://issuer.test/authorize?state=test-state', state: 'test-state' };
      },
      async completeAuthorization(options) {
        calls.complete.push(options);
        return { claims: value, returnTo: '/admin', tokens: {}, idToken: 'test' };
      },
    },
  };
}

function fakeAdapter() {
  return {
    requirePortfolioAdmin(value, config) {
      if (value.sub !== config.adminSubject || !value.groups.includes(config.adminGroup)) {
        throw new Error('PORTFOLIO_ADMIN_REQUIRED');
      }
      return true;
    },
  };
}

function makeHarness({ value = claims(), account = true, owner = true } = {}) {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'crp-cgss-admin-'));
  const events = { sessions: [], unlocks: [], audits: [] };
  const store = {
    dataDir,
    state: () => ({
      accounts: account ? [{ account_id: 'acc_test', email: ADMIN_EMAIL }] : [],
    }),
  };
  const adminStore = {
    state: () => ({
      memberships: owner
        ? [{ account_id: 'acc_test', role: 'owner', status: 'ACTIVE' }]
        : [],
    }),
    audit: (member, event, metadata) => events.audits.push({ member, event, metadata }),
  };
  const accounts = {
    openSessionForAccount: (source, accountId) => {
      events.sessions.push({ accountId });
      return { account: { account_id: accountId, email: ADMIN_EMAIL }, token: 'session-token' };
    },
  };
  const adminAccess = {
    unlockWithCgss: (source, actor, token) => {
      events.unlocks.push({ actor, token });
      return { admin_token: 'admin-token' };
    },
  };
  const { client } = fakeClient(value);
  const service = createCgssAdmin({
    store,
    adminStore,
    accounts,
    adminAccess,
    env,
    client,
    adapter: fakeAdapter(),
  });
  return { service, dataDir, events };
}

function request(url) {
  return { url, headers: { host: HOST } };
}

function cleanup(dataDir) {
  fs.rmSync(dataDir, { recursive: true, force: true });
}

test('start uses the safe admin return path', async () => {
  const h = makeHarness();
  try {
    assert.equal(
      await h.service.start(request('/auth/admin/start?returnTo=https://evil.example')),
      'http://issuer.test/authorize?state=test-state',
    );
  } finally {
    cleanup(h.dataDir);
  }
});

test('callback creates one native consumer session and one native admin unlock', async () => {
  const h = makeHarness();
  try {
    const first = await h.service.callback(request('/auth/admin/callback?code=test&state=test-state'));
    assert.equal(first.token, 'session-token');
    assert.equal(first.adminToken, 'admin-token');
    assert.equal(h.events.sessions.length, 1);
    assert.equal(h.events.unlocks.length, 1);
    assert.equal(h.events.unlocks[0].token, 'session-token');
    assert.equal(h.events.audits[0].event, 'ADMIN_CGSS_LINKED');

    await h.service.callback(request('/auth/admin/callback?code=test&state=test-state'));
    const links = JSON.parse(fs.readFileSync(path.join(h.dataDir, 'cgss-admin-links.json'), 'utf8'));
    assert.equal(links.length, 1);
    assert.equal(links[0].email, ADMIN_EMAIL);
    assert.equal(links[0].subject, ADMIN_SUBJECT);
  } finally {
    cleanup(h.dataDir);
  }
});

test('callback rejects a different subject before creating session or unlock', async () => {
  const h = makeHarness({ value: claims({ sub: 'different-user' }) });
  try {
    await assert.rejects(
      () => h.service.callback(request('/auth/admin/callback?code=test&state=test-state')),
      /CGSSO_ADMIN_REQUIRED/,
    );
    assert.equal(h.events.sessions.length, 0);
    assert.equal(h.events.unlocks.length, 0);
  } finally {
    cleanup(h.dataDir);
  }
});

test('callback rejects a missing MFA claim', async () => {
  const h = makeHarness({ value: claims({ amr: ['pwd'] }) });
  try {
    await assert.rejects(
      () => h.service.callback(request('/auth/admin/callback?code=test&state=test-state')),
      /CGSSO_MFA_REQUIRED/,
    );
    assert.equal(h.events.sessions.length, 0);
    assert.equal(h.events.unlocks.length, 0);
  } finally {
    cleanup(h.dataDir);
  }
});

test('callback rejects a missing owner membership', async () => {
  const h = makeHarness({ owner: false });
  try {
    await assert.rejects(
      () => h.service.callback(request('/auth/admin/callback?code=test&state=test-state')),
      /CGSSO_OWNER_REQUIRED/,
    );
    assert.equal(h.events.sessions.length, 0);
    assert.equal(h.events.unlocks.length, 0);
  } finally {
    cleanup(h.dataDir);
  }
});

test('callback rejects a missing account', async () => {
  const h = makeHarness({ account: false });
  try {
    await assert.rejects(
      () => h.service.callback(request('/auth/admin/callback?code=test&state=test-state')),
      /CGSSO_ACCOUNT_REQUIRED/,
    );
    assert.equal(h.events.sessions.length, 0);
    assert.equal(h.events.unlocks.length, 0);
  } finally {
    cleanup(h.dataDir);
  }
});
