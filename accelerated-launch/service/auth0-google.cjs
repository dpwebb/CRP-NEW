'use strict';
// Server-side authorization-code/PKCE handoff. Provider tokens and temporary proof
// stay in this process; only a verified issuer/subject binding reaches account storage.
const crypto = require('node:crypto');
const accounts = require('./accounts.cjs');
const { ServiceError } = require('./errors.cjs');
const COOKIE = 'crp_google_flow';
const CALLBACK = '/api/auth/google/callback';
const TTL = 5 * 60000;
const random = () => crypto.randomBytes(32).toString('base64url');
const digest = value => crypto.createHash('sha256').update(value).digest('base64url');
const failure = code => new ServiceError(code || 'GOOGLE_SIGN_IN_INVALID');

function configuration(env = process.env) {
  if (env.CRP_AUTH0_GOOGLE_ENABLED !== '1') return null;
  try {
    const domain = env.CRP_AUTH0_DOMAIN || '';
    if (!/^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.auth0\.com$/.test(domain)) throw Error();
    const clientId = env.CRP_AUTH0_CLIENT_ID;
    if (typeof clientId !== 'string' || !/^[A-Za-z0-9_-]{16,128}$/.test(clientId)) throw Error();
    const origin = new URL(env.CRP_AUTH0_PUBLIC_ORIGIN);
    const local = env.CRP_DEPLOYMENT_ENV !== 'production' && env.CRP_DEPLOYMENT_ENV !== 'staging' &&
      origin.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(origin.hostname);
    if ((!local && origin.protocol !== 'https:') || origin.origin !== env.CRP_AUTH0_PUBLIC_ORIGIN || origin.username || origin.password) throw Error();
    const expected = { production: 'https://creditregulatorpro.com', staging: 'https://staging.creditregulatorpro.com' }[env.CRP_DEPLOYMENT_ENV];
    if (expected && origin.origin !== expected) throw Error();
    return { issuer: 'https://' + domain + '/', clientId, origin: origin.origin, callback: origin.origin + CALLBACK, secure: origin.protocol === 'https:' };
  } catch { throw failure('GOOGLE_SIGN_IN_UNAVAILABLE'); }
}

function browserCookie(req) {
  const matches = String(req.headers.cookie || '').split(';').map(v => v.trim()).filter(v => v.startsWith(COOKIE + '='));
  return matches.length === 1 && /^[A-Za-z0-9_-]{43}$/.test(matches[0].slice(COOKIE.length + 1)) ? matches[0].slice(COOKIE.length + 1) : '';
}
function flowCookie(value, config) {
  return `${COOKIE}=${value}; HttpOnly; SameSite=Lax; Path=/api/auth/google; Max-Age=${value ? TTL / 1000 : 0}${config.secure ? '; Secure' : ''}`;
}
function jsonPart(value) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw failure();
  const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw failure();
  return parsed;
}

function create(store, options = {}) {
  const env = options.env || process.env, fetcher = options.fetch || fetch, now = options.now || Date.now;
  const flows = new Map(), starts = new Map();
  let keyCache = null, keyRequest = null, lastKeyFetch = -Infinity;
  function configured() { const config = configuration(env); if (!config) throw failure('GOOGLE_SIGN_IN_UNAVAILABLE'); return config; }
  function expire() { for (const [key, row] of flows) if (row.expires <= now()) flows.delete(key); }
  function sameOrigin(req, config) {
    if (req.headers.origin !== config.origin) throw new ServiceError('NOT_AUTHORIZED');
  }
  function noSignedInAccount(req) {
    const raw = /^Bearer\s+(.+)$/i.exec(req.headers.authorization || '')?.[1] ||
      /(?:^|;\s*)crp_session=([^;]+)/.exec(req.headers.cookie || '')?.[1];
    if (raw) {
      try { accounts.resolveSession(store, decodeURIComponent(raw)); }
      catch (error) { if (error.code === 'AUTHENTICATION_REQUIRED') return; throw error; }
      throw failure('GOOGLE_SIGN_IN_SIGN_OUT_FIRST');
    }
  }
  function transaction(req) {
    expire(); const row = flows.get(digest(browserCookie(req)));
    if (!row) throw failure('GOOGLE_SIGN_IN_EXPIRED');
    return row;
  }
  async function readJson(url, init = {}) {
    try {
      const response = await fetcher(url, { ...init, redirect: 'error', signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw Error();
      const length = Number(response.headers.get('content-length'));
      if (length > 128 * 1024) throw Error();
      const reader = response.body.getReader(); let bytes = 0; const chunks = [];
      try {
        while (true) {
          const part = await reader.read(); if (part.done) break;
          bytes += part.value.length; if (bytes > 128 * 1024) { await reader.cancel(); throw Error(); }
          chunks.push(Buffer.from(part.value));
        }
      } finally { reader.releaseLock(); }
      return JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch { throw failure('GOOGLE_SIGN_IN_UNAVAILABLE'); }
  }
  async function keys(config, kid) {
    if (keyCache?.expires > now() && keyCache.keys.some(key => key.kid === kid)) return keyCache.keys;
    // Coalesce refreshes and bound unknown-kid abuse while permitting normal rotation.
    if (!keyRequest && now() - lastKeyFetch >= 30000) {
      lastKeyFetch = now();
      keyRequest = readJson(config.issuer + '.well-known/jwks.json').then(value => {
        if (!Array.isArray(value.keys) || value.keys.length > 32) throw failure();
        keyCache = { keys: value.keys, expires: now() + 10 * 60000 }; return value.keys;
      }).finally(() => { keyRequest = null; });
    }
    if (keyRequest) return keyRequest;
    throw failure();
  }
  async function identity(token, row, config) {
    try {
      if (typeof token !== 'string' || token.length > 20000) throw failure();
      const parts = token.split('.'); if (parts.length !== 3 || !/^[A-Za-z0-9_-]+$/.test(parts[2])) throw failure();
      const header = jsonPart(parts[0]), claims = jsonPart(parts[1]);
      if (header.alg !== 'RS256' || typeof header.kid !== 'string' || header.kid.length > 200 || header.crit || header.jku || header.jwk || header.x5u) throw failure();
      const matches = (await keys(config, header.kid)).filter(key => key.kid === header.kid && key.kty === 'RSA' && (!key.use || key.use === 'sig') && (!key.alg || key.alg === 'RS256'));
      if (matches.length !== 1 || matches[0].key_ops && !matches[0].key_ops.includes('verify')) throw failure();
      const publicKey = crypto.createPublicKey({ key: matches[0], format: 'jwk' });
      if ((publicKey.asymmetricKeyDetails?.modulusLength || 0) < 2048 ||
          !crypto.verify('RSA-SHA256', Buffer.from(parts[0] + '.' + parts[1]), publicKey, Buffer.from(parts[2], 'base64url'))) throw failure();
      const time = Math.floor(now() / 1000), audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
      if (claims.iss !== config.issuer || !audiences.includes(config.clientId) ||
          (audiences.length > 1 && claims.azp !== config.clientId) || (claims.azp !== undefined && claims.azp !== config.clientId) ||
          !Number.isInteger(claims.exp) || claims.exp <= time || !Number.isInteger(claims.iat) || claims.iat > time + 30 || claims.iat < time - 600 || claims.exp <= claims.iat ||
          (claims.nbf !== undefined && (!Number.isInteger(claims.nbf) || claims.nbf > time + 30)) ||
          claims.nonce !== row.nonce || typeof claims.sub !== 'string' || !/^google-oauth2\|[A-Za-z0-9_-]{1,200}$/.test(claims.sub) ||
          claims.email_verified !== true || typeof claims.email !== 'string' || claims.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(claims.email)) throw failure();
      return Object.freeze({ issuer: config.issuer, subject: claims.sub, email: accounts.normalizeEmail(claims.email) });
    } catch (error) { if (error.code === 'GOOGLE_SIGN_IN_UNAVAILABLE') throw error; throw failure(); }
  }
  function publicPending(row) {
    if (row.phase !== 'verified') throw failure('GOOGLE_SIGN_IN_EXPIRED');
    const linked = store.state().accounts.find(a => (a.external_identities || []).some(i => i.issuer === row.identity.issuer && i.subject === row.identity.subject));
    const account = linked || store.state().accounts.find(a => a.email === row.identity.email);
    return { email: row.identity.email, action: linked ? 'SIGN_IN' : account ? 'LINK_ACCOUNT' : 'CREATE_ACCOUNT', two_factor_required: Boolean(account?.two_factor_secret) };
  }
  return {
    status() { try { return { enabled: Boolean(configuration(env)) }; } catch { return { enabled: false }; } },
    start(req) {
      const config = configured(); sameOrigin(req, config); noSignedInAccount(req); expire();
      const peer = String(req.socket?.remoteAddress || 'unknown');
      for (const [ip, row] of starts) if (row.expires <= now()) starts.delete(ip);
      const bucket = starts.get(peer) || { count: 0, expires: now() + TTL };
      if (bucket.count >= 60 || flows.size >= 1024 || starts.size >= 4096 && !starts.has(peer)) throw new ServiceError('TOO_MANY_FAILED_SIGN_INS');
      bucket.count++; starts.set(peer, bucket);
      flows.delete(digest(browserCookie(req)));
      const cookie = random(), row = { state: random(), nonce: random(), verifier: random(), expires: now() + TTL, phase: 'started' };
      flows.set(digest(cookie), row);
      const url = new URL('authorize', config.issuer);
      url.search = new URLSearchParams({ response_type: 'code', client_id: config.clientId, redirect_uri: config.callback, scope: 'openid email', connection: 'google-oauth2', state: row.state, nonce: row.nonce, code_challenge: digest(row.verifier), code_challenge_method: 'S256', prompt: 'select_account' }).toString();
      return { status: 200, json: { ok: true, authorize_url: url.href }, headers: { 'Set-Cookie': flowCookie(cookie, config) } };
    },
    async callback(req) {
      const config = configured();
      try {
        noSignedInAccount(req); const row = transaction(req), query = new URL(req.url, config.origin).searchParams;
        const state = query.getAll('state'), code = query.getAll('code');
        if (row.phase !== 'started' || state.length !== 1 || state[0] !== row.state) throw failure();
        row.phase = 'exchanging';
        if (query.has('error')) throw failure('GOOGLE_SIGN_IN_CANCELLED');
        if (code.length !== 1 || !code[0] || code[0].length > 4096) throw failure();
        const tokens = await readJson(config.issuer + 'oauth/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'authorization_code', client_id: config.clientId, code: code[0], redirect_uri: config.callback, code_verifier: row.verifier }).toString() });
        const verified = await identity(tokens.id_token, row, config);
        if (row.expires <= now() || flows.get(digest(browserCookie(req))) !== row) throw failure();
        row.identity = verified; delete row.verifier; delete row.nonce; delete row.state; row.phase = 'verified';
        return { status: 303, text: '', content_type: 'text/plain', headers: { Location: '/index.html#google-signin' } };
      } catch {
        flows.delete(digest(browserCookie(req)));
        return { status: 303, text: '', content_type: 'text/plain', headers: { Location: '/index.html#google-signin-error', 'Set-Cookie': flowCookie('', config) } };
      }
    },
    pending(req) { configured(); noSignedInAccount(req); return { ok: true, ...publicPending(transaction(req)) }; },
    finish(req, input) {
      const config = configured(); sameOrigin(req, config); noSignedInAccount(req);
      const row = transaction(req); publicPending(row);
      if ((row.attempts || 0) >= 8) { flows.delete(digest(browserCookie(req))); throw failure('GOOGLE_SIGN_IN_EXPIRED'); }
      row.attempts = (row.attempts || 0) + 1;
      const opened = accounts.signInWithGoogle(store, row.identity, input);
      flows.delete(digest(browserCookie(req)));
      return { opened, clearCookie: flowCookie('', config) };
    },
    cancel(req) {
      const config = configured(); sameOrigin(req, config); flows.delete(digest(browserCookie(req)));
      return { status: 200, json: { ok: true, cancelled: true }, headers: { 'Set-Cookie': flowCookie('', config) } };
    },
    close() { flows.clear(); starts.clear(); keyCache = null; }
  };
}
module.exports = { create, configuration, CALLBACK };
