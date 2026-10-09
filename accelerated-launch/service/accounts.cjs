'use strict';
/**
 * accounts.cjs — local account creation, sign-in, sign-out and session resolution.
 *
 * OWNER-ALL82-001 / B2. This is identity for a LOCAL, single-operator service: it establishes that one
 * consumer's cases belong to one account and that nobody else can read them. It is deliberately not an
 * identity provider integration — plan section 5 excludes speculative infrastructure, and the legacy
 * Auth0 wiring is unreachable and read-only here.
 *
 * Secrets: passwords use salted scrypt; explicitly imported bcrypt credentials convert on valid sign-in.
 * The session token
 * itself is NEVER stored — only its SHA-256. A leaked state file therefore yields no usable credential and
 * no usable session.
 */

const crypto = require('node:crypto');
const net = require('node:net');
const { ServiceError } = require('./errors.cjs');
const { verifyLegacyPassword } = require('./legacy-password.cjs');

const MIN_PASSWORD_LENGTH = 12;
const MAX_FAILED_ATTEMPTS = 8;
/** A lockout WINDOW, not a lifetime counter. The B2 shape locked an account for ever after eight total
 *  failures, which turns a typo-prone consumer into a permanently dead account — a real defect, corrected here. */
const FAILED_ATTEMPT_WINDOW_MINUTES = 15;
const LOCKOUT_MINUTES = 15;
/** How long a session may live at all, and how long it may sit unused. */
const SESSION_ABSOLUTE_HOURS = 24;
const SESSION_IDLE_MINUTES = 120;
/** How many sessions one account may hold at once; the oldest is dropped, never the newest. */
const MAX_ACTIVE_SESSIONS_PER_ACCOUNT = 10;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RECOVERY_WINDOW_MS = 15 * 60000;
const recoveryAttempts = new WeakMap();

function recoveryKey() { return crypto.randomBytes(32).toString('base64url'); }
function recoveryDigest(key) { return tokenDigest(`crp-recovery-v1:${key}`); }

// A private peer may be the reverse proxy shared by every customer. Never use a
// caller-supplied forwarding header as recovery proof or as a trusted address.
function publicRecoveryPeer(client) {
  const ip = String(client || '').replace(/^::ffff:/, '');
  if (net.isIP(ip) === 4) {
    const p = ip.split('.').map(Number);
    return !(p[0] === 127 || p[0] === 10 || p[0] === 0 ||
      (p[0] === 172 && p[1] >= 16 && p[1] <= 31) ||
      (p[0] === 192 && p[1] === 168) || (p[0] === 169 && p[1] === 254));
  }
  return net.isIP(ip) === 6 && ip !== '::1' && ip !== '::' && !/^(fc|fd|fe[89ab])/i.test(ip);
}

/** Bound unauthenticated attempts without storing email addresses or raw credentials. */
function countRecoveryAttempt(store, email, client) {
  let attempts = recoveryAttempts.get(store);
  if (!attempts) { attempts = new Map(); recoveryAttempts.set(store, attempts); }
  const now = Date.now();
  for (const [key, row] of attempts) if (now - row.started >= RECOVERY_WINDOW_MS) attempts.delete(key);
  const keys = [[`email:${tokenDigest(email)}`, 8]];
  if (publicRecoveryPeer(client)) keys.push([`client:${tokenDigest(client)}`, 40]);
  for (const [key, limit] of keys) {
    const row = attempts.get(key) || { started: now, count: 0 };
    if (row.count >= limit) throw new ServiceError('TOO_MANY_RECOVERY_ATTEMPTS');
  }
  for (const [key] of keys) {
    const row = attempts.get(key) || { started: now, count: 0 };
    row.count++; attempts.set(key, row);
  }
  // Bound memory without turning unrelated failed addresses into a global lock.
  while (attempts.size > 4096) attempts.delete(attempts.keys().next().value);
}

function sameDigest(actual, expected) {
  const a = Buffer.from(actual || '', 'hex'), b = Buffer.from(expected || '', 'hex');
  return a.length === 32 && b.length === 32 && crypto.timingSafeEqual(a, b);
}

function newId(prefix) {
  return `${prefix}_${crypto.randomBytes(12).toString('hex')}`;
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function hashPassword(password, saltHex) {
  return crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), 64).toString('hex');
}

function verifyPassword(password, saltHex, expectedHex) {
  if (typeof saltHex !== 'string' || !/^[a-f0-9]{32}$/i.test(saltHex) ||
      typeof expectedHex !== 'string' || !/^[a-f0-9]{128}$/i.test(expectedHex)) return false;
  const actual = Buffer.from(hashPassword(password, saltHex), 'hex');
  const expected = Buffer.from(expectedHex, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function tokenDigest(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function validateAccountDetails(email, password) {
  if (!EMAIL.test(email) || typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    throw new ServiceError('INVALID_ACCOUNT_DETAILS');
  }
}

function createSessionRow(accountId) {
  const token = crypto.randomBytes(32).toString('base64url');
  const now = nowIso();
  return {
    token,
    row: {
      session_id: newId('ses'),
      token_sha256: tokenDigest(token),
      account_id: accountId,
      created_at: now,
      last_seen_at: now,
      /* B4: a session now carries its own deadlines, so an abandoned browser cannot stay signed in for ever. */
      expires_at: new Date(Date.now() + SESSION_ABSOLUTE_HOURS * 3600000).toISOString(),
      idle_expires_at: new Date(Date.now() + SESSION_IDLE_MINUTES * 60000).toISOString()
    }
  };
}

/** True when a session row has passed either of its deadlines. Absent deadlines are treated as expired. */
function sessionExpired(row, nowMs) {
  const absolute = Date.parse(row.expires_at || '');
  const idle = Date.parse(row.idle_expires_at || row.expires_at || '');
  if (Number.isNaN(absolute) || Number.isNaN(idle)) return true;
  return absolute <= nowMs || idle <= nowMs;
}

/** Drop every dead session row. Called on start and by the retention sweep. Returns how many were removed. */
function sweepSessions(store, now) {
  const nowMs = now ? new Date(now).getTime() : Date.now();
  return store.update((state) => {
    const before = state.sessions.length;
    state.sessions = state.sessions.filter((row) => {
      const dead = sessionExpired(row, nowMs);
      const orphaned = !state.accounts.some((account) => account.account_id === row.account_id);
      return !dead && !orphaned;
    });
    return before - state.sessions.length;
  });
}

/** Keep at most MAX_ACTIVE_SESSIONS_PER_ACCOUNT rows per account, dropping the oldest by creation time. */
function trimSessions(state, accountId) {
  const mine = state.sessions.filter((row) => row.account_id === accountId);
  if (mine.length <= MAX_ACTIVE_SESSIONS_PER_ACCOUNT) return;
  const doomed = new Set(
    mine
      .slice()
      .sort((a, b) => (a.created_at < b.created_at ? -1 : 1))
      .slice(0, mine.length - MAX_ACTIVE_SESSIONS_PER_ACCOUNT)
      .map((row) => row.session_id)
  );
  state.sessions = state.sessions.filter((row) => !doomed.has(row.session_id));
}

/** Create an account and open its first session. Returns the account plus the raw session token. */
function createAccount(store, input) {
  const email = normalizeEmail(input && input.email);
  const password = input && input.password;
  validateAccountDetails(email, password);
  const saltHex = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPassword(password, saltHex);
  const session = createSessionRow(null);
  const key = recoveryKey();
  const account = store.update((state) => {
    if (state.accounts.some((a) => a.email === email)) throw new ServiceError('EMAIL_ALREADY_REGISTERED');
    const created = {
      account_id: newId('acc'),
      email,
      password_salt: saltHex,
      password_hash: passwordHash,
      recovery_key_digest: recoveryDigest(key),
      recovery_key_created_at: nowIso(),
      created_at: nowIso(),
      failed_sign_ins: 0
    };
    state.accounts.push(created);
    session.row.account_id = created.account_id;
    state.sessions.push(session.row);
    trimSessions(state, created.account_id);
    return { account_id: created.account_id, email: created.email };
  });
  return { account, token: session.token, recovery_key: key };
}

/** Only an explicitly imported password row uses bcrypt; native credentials never fall back to it. */
function verifyAccountPassword(account, password) {
  if (typeof password !== 'string') return false;
  if (Object.hasOwn(account, 'password_salt') || Object.hasOwn(account, 'password_hash')) {
    return verifyPassword(password, account.password_salt, account.password_hash);
  }
  if (!verifyLegacyPassword(password, account.legacy_password_bcrypt)) return false;
  // The same atomic update that opens the session replaces the old credential. No password is retained.
  const salt = crypto.randomBytes(16).toString('hex');
  account.password_salt = salt;
  account.password_hash = hashPassword(password, salt);
  delete account.legacy_password_bcrypt;
  return true;
}

/** A secret is revealed only when issued. Existing accounts may set one up while signed in. */
function securityView(store, actor) {
  const account = store.state().accounts.find(a => a.account_id === actor.account_id);
  if (!account) throw new ServiceError('AUTHENTICATION_REQUIRED');
  return { recovery_key_available: Boolean(account.recovery_key_digest) };
}

function issueRecoveryKey(store, actor, input) {
  const account = store.state().accounts.find(a => a.account_id === actor.account_id);
  if (!account) throw new ServiceError('AUTHENTICATION_REQUIRED');
  if (!input || typeof input.password !== 'string' || input.password.length > 1024) throw new ServiceError('INVALID_CREDENTIALS');
  const key = recoveryKey();
  const outcome = store.update(state => {
    // Verify the password with the same persisted attempt window, without opening or trimming sessions.
    const checked = checkCredentials(state, account.email, input.password);
    if (checked.refuse) return checked;
    const owned = checked.account;
    owned.recovery_key_digest = recoveryDigest(key);
    owned.recovery_key_created_at = nowIso();
    return { recovery_key: key };
  });
  if (outcome.refuse) throw new ServiceError(outcome.refuse);
  return outcome;
}

/** Recovery proof is high entropy, stored hashed, one use, and never an account/email lookup. */
function recoverAccount(store, input, client) {
  const email = normalizeEmail(input && input.email);
  countRecoveryAttempt(store, email, client);
  const key = input && input.recovery_key, password = input && input.password;
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH || password.length > 1024) {
    throw new ServiceError('INVALID_ACCOUNT_DETAILS');
  }
  const suppliedDigest = typeof key === 'string' && /^[A-Za-z0-9_-]{43}$/.test(key.trim()) ? recoveryDigest(key.trim()) : '';
  const nextKey = recoveryKey();
  const recovered = store.update(state => {
    const account = state.accounts.find(a => a.email === email);
    if (!account || !sameDigest(suppliedDigest, account.recovery_key_digest)) return false;
    const salt = crypto.randomBytes(16).toString('hex');
    account.password_salt = salt;
    account.password_hash = hashPassword(password, salt);
    delete account.legacy_password_bcrypt;
    account.recovery_key_digest = recoveryDigest(nextKey);
    account.recovery_key_created_at = nowIso();
    account.failed_sign_ins = 0;
    account.failed_window_started_at = null;
    account.locked_until = null;
    state.sessions = state.sessions.filter(row => row.account_id !== account.account_id);
    return true;
  });
  if (!recovered) throw new ServiceError('INVALID_RECOVERY_KEY');
  return { recovered: true, recovery_key: nextKey };
}

/**
 * Sign in and open a session. Failed attempts are counted per account WITHIN A WINDOW, and a lockout expires,
 * so a local service is not a free oracle and is not a life sentence either.
 *
 * B4 DEFECT CORRECTED, with its cause recorded: the B2 shape threw the refusal from INSIDE the store mutator
 * (`throw new ServiceError('TOO_MANY_FAILED_SIGN_INS')`). `PrivateStore.update` writes only after the mutator
 * returns, so that throw discarded the increment with it and the count was never persisted — every attempt saw
 * zero failures and the lockout could never fire. The decision is therefore taken inside the transaction and
 * the REFUSAL IS THROWN AFTER THE WRITE, so what was counted is what was saved.
 */
function signIn(store, input) {
  const email = normalizeEmail(input && input.email);
  const password = input && input.password;
  const session = createSessionRow(null);
  const outcome = store.update((state) => {
    const checked = checkCredentials(state, email, password);
    if (checked.refuse) return checked;
    const account = checked.account;
    session.row.account_id = account.account_id;
    state.sessions.push(session.row);
    trimSessions(state, account.account_id);
    return { account: { account_id: account.account_id, email: account.email } };
  });
  if (outcome.refuse) throw new ServiceError(outcome.refuse);
  return { account: outcome.account, token: session.token };
}

function checkCredentials(state, email, password) {
    const account = state.accounts.find((a) => a.email === email);
    if (account && account.locked_until && Date.parse(account.locked_until) > Date.now()) {
      return { refuse: 'TOO_MANY_FAILED_SIGN_INS' };
    }
    if (!account || !verifyAccountPassword(account, password)) {
      if (account) {
        const windowStart = Date.parse(account.failed_window_started_at || '');
        const insideWindow = !Number.isNaN(windowStart) && Date.now() - windowStart < FAILED_ATTEMPT_WINDOW_MINUTES * 60000;
        account.failed_sign_ins = insideWindow ? (account.failed_sign_ins || 0) + 1 : 1;
        account.failed_window_started_at = insideWindow ? account.failed_window_started_at : nowIso();
        if (account.failed_sign_ins >= MAX_FAILED_ATTEMPTS) {
          account.locked_until = new Date(Date.now() + LOCKOUT_MINUTES * 60000).toISOString();
          return { refuse: 'TOO_MANY_FAILED_SIGN_INS', failed: account.failed_sign_ins };
        }
      }
      return { refuse: 'INVALID_CREDENTIALS' };
    }
    account.failed_sign_ins = 0;
    account.failed_window_started_at = null;
    account.locked_until = null;
    return { account };
}

/**
 * Resolve a bearer token to its account. Unknown, expired, destroyed and absent tokens are one refusal: a
 * caller cannot tell a lapsed session from a forged one, and neither one works.
 */
function resolveSession(store, token) {
  if (typeof token !== 'string' || !token) throw new ServiceError('AUTHENTICATION_REQUIRED');
  const digest = tokenDigest(token);
  const state = store.state();
  const session = state.sessions.find((s) => s.token_sha256 === digest);
  if (!session) throw new ServiceError('AUTHENTICATION_REQUIRED');
  const account = state.accounts.find((a) => a.account_id === session.account_id);
  if (!account) throw new ServiceError('AUTHENTICATION_REQUIRED');
  if (sessionExpired(session, Date.now())) {
    /* A lapsed session is destroyed on presentation, so it cannot be retried into life. */
    store.update((s) => {
      s.sessions = s.sessions.filter((row) => row.session_id !== session.session_id);
      return true;
    });
    throw new ServiceError('AUTHENTICATION_REQUIRED');
  }
  store.update((s) => {
    const live = s.sessions.find((row) => row.session_id === session.session_id);
    if (!live) return false;
    live.last_seen_at = nowIso();
    live.idle_expires_at = new Date(Date.now() + SESSION_IDLE_MINUTES * 60000).toISOString();
    return true;
  });
  return { account_id: account.account_id, email: account.email };
}

/** Sign out: the session row is destroyed, so the same token is refused afterwards. */
function signOut(store, token) {
  if (typeof token !== 'string' || !token) return { signed_out: false };
  const digest = tokenDigest(token);
  return store.update((state) => {
    const before = state.sessions.length;
    state.sessions = state.sessions.filter((s) => s.token_sha256 !== digest);
    return { signed_out: state.sessions.length < before };
  });
}

/** Remove every session for an account (used by account deletion). */
function signOutEverywhere(store, accountId) {
  return store.update((state) => {
    state.sessions = state.sessions.filter((s) => s.account_id !== accountId);
    return { removed_sessions: true };
  });
}

module.exports = {
  securityView,
  issueRecoveryKey,
  recoverAccount,
  createAccount,
  signIn,
  signOut,
  signOutEverywhere,
  resolveSession,
  sweepSessions,
  sessionExpired,
  normalizeEmail,
  tokenDigest,
  MIN_PASSWORD_LENGTH,
  MAX_FAILED_ATTEMPTS,
  FAILED_ATTEMPT_WINDOW_MINUTES,
  LOCKOUT_MINUTES,
  SESSION_ABSOLUTE_HOURS,
  SESSION_IDLE_MINUTES,
  MAX_ACTIVE_SESSIONS_PER_ACCOUNT
};
