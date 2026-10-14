'use strict';
const crypto = require('node:crypto');
const { ServiceError } = require('./errors.cjs');
const accounts = require('./accounts.cjs');

const TOKEN_LIFETIME_MS = 30 * 60000;
const WINDOW_MS = 15 * 60000;
const REQUEST_MESSAGE = 'If an account uses that email, we will send a password reset link. Check your inbox and spam folder.';
const digest = token => accounts.tokenDigest('crp-email-password-reset-v1:' + token);

// Deployment identity is operator-controlled. Never construct an email link from
// Host, Origin, forwarding headers, a profile contact address or request data.
function resetOrigin(localOrigin, env = process.env) {
  if (env.CRP_DEPLOYMENT_ENV === 'production') return 'https://creditregulatorpro.com';
  if (env.CRP_DEPLOYMENT_ENV === 'staging') return 'https://staging.creditregulatorpro.com';
  if (env.CRP_DEPLOYMENT_ENV && env.CRP_DEPLOYMENT_ENV !== 'local') throw new ServiceError('ACCOUNT_SECURITY_UNAVAILABLE');
  const value = typeof localOrigin === 'function' ? localOrigin() : localOrigin;
  const url = new URL(value || 'http://127.0.0.1:' + (env.CRP_LOCAL_SERVICE_PORT || 8787));
  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new ServiceError('ACCOUNT_SECURITY_UNAVAILABLE');
  return url.origin;
}

function create(store, { mailer, origin, logger } = {}) {
  const attempts = new Map(), queued = [], waiting = [];
  let active = 0;
  function countAttempt(identity) {
    const now = Date.now();
    for (const [key, row] of attempts) if (now - row.started >= WINDOW_MS) attempts.delete(key);
    const key = accounts.tokenDigest(identity), row = attempts.get(key) || { started: now, count: 0 };
    if (row.count >= 8) throw new ServiceError('TOO_MANY_RECOVERY_ATTEMPTS');
    while (attempts.size >= 4096 && !attempts.has(key)) attempts.delete(attempts.keys().next().value);
    row.count++; attempts.set(key, row);
  }
  function pump() {
    while (active < 2 && queued.length) {
      const job = queued.shift(); active++;
      Promise.resolve().then(job).catch(() => {
        logger?.log({ event: 'PASSWORD_RESET_EMAIL', outcome: 'UNAVAILABLE' });
      }).finally(() => {
        active--; pump();
        if (!active && !queued.length) for (const resolve of waiting.splice(0)) resolve();
      });
    }
  }
  function enqueue(job) {
    if(active + queued.length >= 32) { logger?.log({event:'PASSWORD_RESET_EMAIL',outcome:'UNAVAILABLE'}); return; }
    queued.push(job); setImmediate(pump);
  }
  function request(input) {
    const email = accounts.normalizeEmail(input?.email);
    countAttempt('request:' + email);
    const response = { reset_requested: true, message: REQUEST_MESSAGE };
    // The same response is returned for malformed, absent, throttled and failed
    // delivery. SMTP is bounded and asynchronous, so it is not an email oracle.
    if (email.length > 254 || !/^[^\s@<>\r\n]+@[^\s@<>\r\n]+\.[^\s@<>\r\n]+$/.test(email) || active + queued.length >= 16) return response;
    const base = resetOrigin(origin);
    // Defer account lookup AND durable writes until after the generic HTTP
    // response. Even account-size-dependent disk latency is not an email oracle.
    enqueue(async () => {
      const now = Date.now(), eligible = account => account && !(now - Date.parse(account.password_reset_last_sent_at || '') < 60000) && !(now - Date.parse(account.password_reset_window_started_at || '') < WINDOW_MS && account.password_reset_send_count >= 3);
      if (!eligible(store.state().accounts.find(a => a.email === email))) return;
      const token = crypto.randomBytes(32).toString('base64url'), tokenDigest = digest(token);
      const target = store.update(state => {
        const account = state.accounts.find(a => a.email === email);
        if (!eligible(account)) return null;
        const currentWindow = now - Date.parse(account.password_reset_window_started_at || '') < WINDOW_MS;
        account.password_reset_window_started_at = currentWindow ? account.password_reset_window_started_at : new Date(now).toISOString();
        account.password_reset_send_count = currentWindow ? (account.password_reset_send_count || 0) + 1 : 1;
        account.password_reset_last_sent_at = new Date(now).toISOString();
        account.password_reset = { digest: tokenDigest, expires_at: new Date(now + TOKEN_LIFETIME_MS).toISOString() };
        return { id: account.account_id, to: account.email };
      });
      if (!target) return;
      const current = store.state().accounts.find(a => a.account_id === target.id);
      if (current?.password_reset?.digest !== tokenDigest || Date.parse(current.password_reset.expires_at) <= Date.now()) return;
      try { await mailer({ to: target.to, from: 'support@creditregulatorpro.com', kind: 'password-reset', url: base + '/index.html#reset-password=' + token }); }
      catch (error) {
        if(store.state().accounts.find(a => a.account_id === target.id)?.password_reset?.digest === tokenDigest) store.update(state => { const a = state.accounts.find(a => a.account_id === target.id); if (a?.password_reset?.digest === tokenDigest) delete a.password_reset; return true; });
        throw error;
      }
    });
    return response;
  }
  function complete(input) {
    const token = input?.token, password = input?.password;
    if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) throw new ServiceError('INVALID_PASSWORD_RESET');
    countAttempt('complete:' + token);
    if (typeof password !== 'string' || password.length < accounts.MIN_PASSWORD_LENGTH || password.length > 1024) throw new ServiceError('INVALID_ACCOUNT_DETAILS');
    const supplied = Buffer.from(digest(token), 'hex');
    const findTarget = state => state.accounts.find(a => {
        const pending = a.password_reset;
        if (!pending || !/^[a-f0-9]{64}$/i.test(pending.digest || '') || !Number.isFinite(Date.parse(pending.expires_at)) || Date.parse(pending.expires_at) <= Date.now()) return false;
        return crypto.timingSafeEqual(supplied, Buffer.from(pending.digest, 'hex'));
      });
    if (!findTarget(store.state())) throw new ServiceError('INVALID_PASSWORD_RESET');
    const target = store.update(state => {
      const account = findTarget(state);
      if (!account) return null;
      const salt = crypto.randomBytes(16);
      account.password_salt = salt.toString('hex');
      account.password_hash = crypto.scryptSync(password, salt, 64).toString('hex');
      delete account.legacy_password_bcrypt;
      delete account.password_reset;
      // An unfinished enrollment was authorized with the old password. Enabled
      // MFA, its replay counter and lockout state are deliberately untouched.
      delete account.two_factor_pending;
      account.failed_sign_ins = 0; account.failed_window_started_at = null; account.locked_until = null;
      state.sessions = state.sessions.filter(row => row.account_id !== account.account_id);
      return { to: account.email };
    });
    if (!target) throw new ServiceError('INVALID_PASSWORD_RESET');
    enqueue(() => mailer({ to: target.to, from: 'support@creditregulatorpro.com', kind: 'password-reset-complete' }));
    logger?.log({ event: 'PASSWORD_RESET_COMPLETED', outcome: 'OK' });
    return { password_reset: true };
  }
  return { request, complete, drain: () => active || queued.length ? new Promise(resolve => waiting.push(resolve)) : Promise.resolve() };
}
module.exports = { create, resetOrigin, TOKEN_LIFETIME_MS, REQUEST_MESSAGE };
