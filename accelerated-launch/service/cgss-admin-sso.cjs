'use strict';
// Local CGSSO identity for the CRP Consumer owner. CGSSO provider MFA replaces
// the native TOTP code only after the exact admin subject, admin group and an
// owner membership are verified. The native consumer session and admin unlock
// row are still created and bound by admin-access.cjs.
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const DEFAULT_ADMIN_GROUP = 'portfolio-superadmin';
const ADAPTER_PATH = process.env.CGSSO_ADAPTER_PATH || path.resolve(__dirname, '../../../../governance/portfolio/sso/adapter/index.mjs');
let adapter;
let client;

function failure(code, statusCode = 403) {
  return Object.assign(new Error(code), { statusCode });
}

function config(env) {
  const value = name => {
    const item = env[name]?.trim();
    if (!item) throw failure('CGSSO_NOT_CONFIGURED', 503);
    return item;
  };
  return {
    issuer: value('CGSS_ISSUER'),
    clientId: value('CGSS_CLIENT_ID'),
    clientSecret: value('CGSS_CLIENT_SECRET'),
    redirectUri: value('CGSS_REDIRECT_URI'),
    adminSubject: value('CGSS_ADMIN_SUBJECT'),
    adminGroup: env.CGSS_ADMIN_GROUP?.trim() || DEFAULT_ADMIN_GROUP,
    clientAuthMethod: env.CGSS_CLIENT_AUTH_METHOD?.trim() || 'client_secret_basic',
  };
}

async function modules() {
  if (adapter) return adapter;
  try {
    adapter = await import('@compnd/cgsso-adapter');
  } catch {
    // Local tests and the governed source checkout may run before npm install.
    adapter = await import(pathToFileURL(ADAPTER_PATH).href);
  }
  return adapter;
}

async function cgssClient(env) {
  if (client) return client;
  const c = config(env);
  const { createMemoryTransactionStore, createOidcClient } = await modules();
  client = createOidcClient({
    issuer: c.issuer,
    clientId: c.clientId,
    clientSecret: c.clientSecret,
    redirectUri: c.redirectUri,
    adminSubject: c.adminSubject,
    adminGroup: c.adminGroup,
    transactionStore: createMemoryTransactionStore({ maxEntries: 200 }),
    clientAuthMethod: c.clientAuthMethod,
  });
  return client;
}

function safeReturnTo(value) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/admin';
}

function assertHost(req, env) {
  const expected = new URL(env.CGSS_REDIRECT_URI).host;
  if (req.headers.host !== expected) throw failure('CGSSO_HOST_REQUIRED', 403);
}

function writeLink(store, record) {
  const file = path.join(store.dataDir, 'cgss-admin-links.json');
  let existing = [];
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (Array.isArray(parsed)) existing = parsed;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const next = existing.filter(item => item && item.email !== record.email);
  next.push(record);
  fs.writeFileSync(file, `${JSON.stringify(next)}\n`, { mode: 0o600 });
}

function createCgssAdmin({ store, adminStore, accounts, adminAccess, logger, env = process.env, client: injectedClient = null, adapter: injectedAdapter = null }) {
  if (injectedAdapter) adapter = injectedAdapter;
  if (injectedClient) client = injectedClient;

  async function start(req) {
    assertHost(req, env);
    const requestUrl = new URL(req.url, 'http://local');
    const authorization = await (await cgssClient(env)).beginAuthorization({
      returnTo: safeReturnTo(requestUrl.searchParams.get('returnTo')),
    });
    return authorization.url;
  }

  async function callback(req) {
    assertHost(req, env);
    const requestUrl = new URL(req.url, 'http://local');
    const code = requestUrl.searchParams.get('code') || '';
    const state = requestUrl.searchParams.get('state') || '';
    if (!code || !state) throw failure('CGSSO_RESPONSE_INCOMPLETE', 400);

    let completed;
    try {
      completed = await (await cgssClient(env)).completeAuthorization({ code, state });
    } catch {
      throw failure('CGSSO_TOKEN_INVALID', 401);
    }

    const c = config(env);
    const { requirePortfolioAdmin } = await modules();
    try {
      requirePortfolioAdmin(completed.claims, { adminSubject: c.adminSubject, adminGroup: c.adminGroup });
    } catch {
      throw failure('CGSSO_ADMIN_REQUIRED', 403);
    }
    if (!Array.isArray(completed.claims.amr) || !completed.claims.amr.includes('mfa')) {
      throw failure('CGSSO_MFA_REQUIRED', 403);
    }

    const email = completed.claims.email?.trim().toLowerCase();
    if (!email) throw failure('CGSSO_EMAIL_REQUIRED', 403);
    const account = store.state().accounts.find(item => item.email === email);
    if (!account) throw failure('CGSSO_ACCOUNT_REQUIRED', 403);
    const member = adminStore.state().memberships.find(
      item => item.account_id === account.account_id && item.role === 'owner' && item.status === 'ACTIVE',
    );
    if (!member) throw failure('CGSSO_OWNER_REQUIRED', 403);

    const opened = accounts.openSessionForAccount(store, account.account_id);
    const unlocked = adminAccess.unlockWithCgss(adminStore, opened.account, opened.token);
    writeLink(store, {
      issuer: completed.claims.iss ?? c.issuer,
      subject: completed.claims.sub,
      email,
      updated_at: new Date().toISOString(),
    });
    adminStore.audit(member, 'ADMIN_CGSS_LINKED', { operation: 'CGSSO_MFA' });
    logger?.log?.({ event: 'CGSSO_ADMIN_SIGN_IN', outcome: 'OK' });
    return { token: opened.token, adminToken: unlocked.admin_token, email };
  }

  return { start, callback };
}

module.exports = { createCgssAdmin };
