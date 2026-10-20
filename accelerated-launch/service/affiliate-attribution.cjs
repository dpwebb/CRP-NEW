'use strict';
// Dedicated integration only. No payment, document or general-purpose dispatch API.
const crypto = require('node:crypto');
const COOKIE = 'crp_aff_ref';
const DAY = 86400000;
const opaque = value => typeof value === 'string' && /^[a-zA-Z0-9_:./-]{1,200}$/.test(value);
function create(store, options = {}) {
  const env = options.env || process.env, now = options.now || Date.now;
  const enabled = env.CRP_AFFILIATE_BINDING_ENABLED === '1';
  if (env.CRP_AFFILIATE_BINDING_ENABLED !== undefined && !['0','1'].includes(env.CRP_AFFILIATE_BINDING_ENABLED)) throw Error('AFFILIATE_CONFIGURATION_INVALID');
  const key = env.CRP_AFFILIATE_BINDING_KEY || '';
  const origin = env.CRP_AFFILIATE_ORIGIN || (env.CRP_DEPLOYMENT_ENV === 'staging' ? 'https://affiliates-staging.creditregulatorpro.com' : 'https://affiliates.creditregulatorpro.com');
  if (enabled && (!['production','staging'].includes(env.CRP_DEPLOYMENT_ENV) || key.length < 32 || !['https://affiliates.creditregulatorpro.com', 'https://affiliates-staging.creditregulatorpro.com'].includes(origin)
    || (env.CRP_DEPLOYMENT_ENV === 'production' && origin !== 'https://affiliates.creditregulatorpro.com')
    || (env.CRP_DEPLOYMENT_ENV === 'staging' && origin !== 'https://affiliates-staging.creditregulatorpro.com'))) throw Error('AFFILIATE_CONFIGURATION_INVALID');
  const fetcher = options.fetcher || fetch;
  const flags = '; HttpOnly; SameSite=Lax; Path=/' + (['production','staging'].includes(env.CRP_DEPLOYMENT_ENV) || env.CRP_LOCAL_SERVICE_SECURE_COOKIE === '1' ? '; Secure' : '');
  const cookie = req => String(req.headers?.cookie || '').split(';').map(v => v.trim()).find(v => v.startsWith(COOKIE + '='))?.slice(COOKIE.length + 1);
  function verify(token) {
    if (typeof token !== 'string' || token.length > 3500) throw Error('AFFILIATE_HANDOFF_INVALID');
    const [body, mac, extra] = token.split('.');
    if (!body || !mac || extra !== undefined || !/^[A-Za-z0-9_-]+$/.test(body) || !/^[A-Za-z0-9_-]+$/.test(mac)) throw Error('AFFILIATE_HANDOFF_INVALID');
    const expected = crypto.createHmac('sha256', key).update(body).digest(), actual = Buffer.from(mac, 'base64url');
    if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) throw Error('AFFILIATE_HANDOFF_INVALID');
    const value = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (Object.keys(value).sort().join(',') !== 'consentRef,expiresAt,issuedAt,origin,referralHandle,v' || value.v !== 1 || value.origin !== origin
      || !opaque(value.consentRef) || typeof value.referralHandle !== 'string' || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value.referralHandle) || value.referralHandle.length > 2000
      || !Number.isSafeInteger(value.issuedAt) || !Number.isSafeInteger(value.expiresAt) || value.issuedAt > now() + 300000
      || value.expiresAt <= now() || value.expiresAt <= value.issuedAt || value.expiresAt - value.issuedAt > 90 * DAY) throw Error('AFFILIATE_HANDOFF_INVALID');
    return value;
  }
  function capture(req) {
    if (!enabled || req.method !== 'GET') return null;
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname !== '/affiliate/referral') return null;
    try {
      const token = url.searchParams.get('t'), value = verify(token);
      return { status: 303, headers: { Location: '/', 'Set-Cookie': COOKIE + '=' + token + flags + '; Max-Age=' + Math.max(1, Math.floor((value.expiresAt - now()) / 1000)) } };
    } catch { return { status: 303, headers: { Location: '/' } }; }
  }
  function bind(req, actor) {
    if (!enabled || !actor?.account_id) return null;
    let value; try { value = verify(cookie(req)); } catch { return null; }
    // Local atomic persistence only. A downstream outage cannot delay signup.
    store.update(state => {
      const account = state.accounts.find(a => a.account_id === actor.account_id);
      if (!account || account.affiliate_binding || state.checkout_sessions.some(c => c.account_id === account.account_id && c.state === 'COMPLETED')) return;
      const boundAt = new Date(now()).toISOString();
      account.affiliate_binding = { state: 'READY', attempts: 0, next_at: now(), body: { version: 1, eventId: 'binding:' + crypto.randomUUID(), binding: {
        consumerRef: account.account_id, referralHandle: value.referralHandle, consentRef: value.consentRef, boundAt
      } } };
    });
    return COOKIE + '=' + flags + '; Max-Age=0';
  }
  let busy = false, stopped = false, timer;
  async function drain() {
    if (!enabled || busy || stopped) return false;
    busy = true;
    try {
      if (!store.state().accounts.some(a => a.affiliate_binding && ['READY', 'SENDING'].includes(a.affiliate_binding.state) && a.affiliate_binding.next_at <= now())) return false;
      let selected;
      store.update(state => {
        const account = state.accounts.find(a => a.affiliate_binding && ['READY', 'SENDING'].includes(a.affiliate_binding.state) && a.affiliate_binding.next_at <= now());
        if (!account) return;
        const row = account.affiliate_binding;
        row.state = 'SENDING'; row.attempts++; row.next_at = now() + 60000;
        selected = { accountId: account.account_id, body: JSON.stringify(row.body), eventId: row.body.eventId };
      });
      if (!selected) return false;
      const timestamp = String(Math.floor(now() / 1000));
      const signature = crypto.createHmac('sha256', key).update(timestamp + '.').update(selected.body).digest('hex');
      let status = 0;
      try { const r = await fetcher(origin + '/hooks/binding', { method: 'POST', redirect: 'error', headers: { 'Content-Type': 'application/json', 'X-Affiliate-Signature': 't=' + timestamp + ',v1=' + signature }, body: selected.body, signal: AbortSignal.timeout(5000) });
        status = r.status; await r.body?.cancel();
      } catch { /* Exact same event/body can safely reconcile receiver inbox deduplication. */ }
      store.update(state => {
        const row = state.accounts.find(a => a.account_id === selected.accountId)?.affiliate_binding;
        if (!row || row.body.eventId !== selected.eventId) return;
        if (status >= 200 && status < 300) { row.state = 'SENT'; row.accepted_at = new Date(now()).toISOString(); delete row.last_error; }
        // A reverse proxy can temporarily lose its Docker route during a receiver restart.
        // Its 404 is retriable within the same bounded outbox, with the same event/body.
        else { row.state = ([400, 401, 403, 409, 422].includes(status) || row.attempts >= 48) ? 'DEAD' : 'READY'; row.last_error = status ? 'RECEIVER_HTTP_' + status : 'RECEIVER_UNAVAILABLE'; row.next_at = now() + Math.min(3600000, 10000 * 2 ** Math.min(row.attempts, 9)); }
      });
      const delivered = store.state().accounts.find(a => a.account_id === selected.accountId)?.affiliate_binding;
      if (delivered?.body.eventId === selected.eventId && typeof options.log === 'function') {
        try { options.log({event:'AFFILIATE_BINDING_DELIVERY',outcome:delivered.state,count:delivered.attempts,http_status:status}); } catch { /* Observability must not break durable delivery. */ }
      }
      return true;
    } finally { busy = false; }
  }
  function start() { if (enabled && !timer) { timer = setInterval(() => { void drain().catch(() => {}); }, 30000); timer.unref(); } }
  function close() { stopped = true; clearInterval(timer); }
  return { enabled, capture, bind, drain, start, close };
}
module.exports = { create };
