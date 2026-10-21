import { randomBytes, createHash } from 'node:crypto';

const fail = (code, status = 403) => { throw Object.assign(Error(code), { code, status }); };
const random = () => randomBytes(32).toString('base64url');
const hash = value => createHash('sha256').update(value).digest('base64url');

// Native Affiliate /api/me is the JWT signature/issuer/audience/expiry and membership
// authority. This broker additionally binds that exact verified token to its own
// one-use OAuth state, PKCE verifier, nonce and already-unlocked CRP principal.
export class AffiliateLogin {
  constructor(config, gateway, { fetcher = fetch, now = Date.now } = {}) {
    this.config = config; this.gateway = gateway; this.fetcher = fetcher; this.now = now;
    this.flows = new Map();
  }
  async request(url, options = {}) {
    let r;
    try { r = await this.fetcher(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(12000) }); }
    catch { fail('AFFILIATE_SIGNIN_UNAVAILABLE', 502); }
    const chunks = []; let count = 0;
    for await (const chunk of r.body || []) {
      count += chunk.length;
      if (count > 65536) { fail('AFFILIATE_SIGNIN_UNAVAILABLE', 502); }
      chunks.push(Buffer.from(chunk));
    }
    const data = Buffer.concat(chunks);
    let value;
    try { value = JSON.parse(data.toString('utf8')); } catch { fail('AFFILIATE_SIGNIN_UNAVAILABLE', 502); }
    if (!r.ok) fail('AFFILIATE_SIGNIN_REFUSED', 401);
    return value;
  }
  async start(session) {
    await this.gateway.authorize(session);
    if (!this.config.affiliateLogin) fail('AFFILIATE_SIGNIN_NOT_CONFIGURED', 503);
    if (!this.config.bindings[session.subject]?.affiliate) fail('APPLICATION_BINDING_REQUIRED');
    if (session.links.affiliate) fail('APPLICATION_ALREADY_LINKED', 409);
    for (const [key, flow] of this.flows) if (flow.expires <= this.now() || flow.subject === session.subject) this.flows.delete(key);
    if (this.flows.size >= 200) fail('SESSION_CAPACITY', 503);
    const settings = this.config.affiliateLogin;
    const metadata = await this.request(settings.issuer + '/.well-known/openid-configuration');
    if (metadata.issuer !== settings.issuer) fail('AFFILIATE_IDENTITY_CONFIGURATION_INVALID', 503);
    for (const name of ['authorization_endpoint', 'token_endpoint']) {
      const u = new URL(metadata[name]);
      if (u.origin !== settings.issuer || u.username || u.password || u.hash || u.search)
        fail('AFFILIATE_IDENTITY_CONFIGURATION_INVALID', 503);
    }
    await this.gateway.authorize(session);
    const state = random(), verifier = random(), nonce = random();
    const redirect = this.config.origin + '/auth/affiliate/callback';
    this.flows.set(state, { key: session.key, subject: session.subject, verifier, nonce, redirect,
      tokenEndpoint: metadata.token_endpoint, expires: this.now() + 300000, code: null });
    const target = new URL(metadata.authorization_endpoint);
    for (const [key, value] of Object.entries({ client_id: settings.clientId, redirect_uri: redirect,
      response_type: 'code', scope: 'openid', state, nonce, code_challenge: hash(verifier), code_challenge_method: 'S256' }))
      target.searchParams.set(key, value);
    return { url: target.href };
  }
  // The cross-site callback cannot access a SameSite=Strict primary cookie. Capture
  // only a one-use opaque code, return to a clean same-origin page, and require the
  // original CRP session plus CSRF before exchanging or linking it.
  callback(params) {
    if ([...params.keys()].some(k => !['state','code','error','error_description','iss'].includes(k))) fail('INVALID_AFFILIATE_CALLBACK', 400);
    const state = params.get('state'), flow = this.flows.get(state);
    if (!flow || flow.expires <= this.now() || flow.code || flow.failed) fail('AFFILIATE_SIGNIN_EXPIRED', 401);
    if (params.getAll('state').length !== 1 || params.getAll('code').length > 1) fail('INVALID_AFFILIATE_CALLBACK', 400);
    if (params.has('iss') && params.get('iss') !== this.config.affiliateLogin.issuer) fail('INVALID_AFFILIATE_CALLBACK', 400);
    if (params.has('error')) { flow.failed = true; return; }
    const code = params.get('code');
    if (!code || code.length > 4096 || /[\r\n]/.test(code)) fail('INVALID_AFFILIATE_CALLBACK', 400);
    flow.code = code;
  }
  async finish(session) {
    await this.gateway.authorize(session);
    const pair = [...this.flows].find(([, f]) => f.key === session.key && f.subject === session.subject);
    if (!pair) return { pending: false };
    const [state, flow] = pair;
    if (flow.expires <= this.now() || flow.failed) { this.flows.delete(state); fail('AFFILIATE_SIGNIN_EXPIRED', 401); }
    if (!flow.code) return { pending: true };
    // Consume before the external exchange. An uncertain exchange is never retried.
    this.flows.delete(state);
    const settings = this.config.affiliateLogin;
    const tokens = await this.request(flow.tokenEndpoint, { method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'authorization_code', client_id: settings.clientId, code: flow.code, redirect_uri: flow.redirect, code_verifier: flow.verifier }).toString() });
    const token = tokens.id_token;
    if (typeof token !== 'string' || token.length > 8192 || token.split('.').length !== 3) fail('AFFILIATE_IDENTITY_NOT_VERIFIED', 401);
    let claims;
    try { claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8')); }
    catch { fail('AFFILIATE_IDENTITY_NOT_VERIFIED', 401); }
    if (claims.nonce !== flow.nonce || claims.iss !== settings.issuer ||
        !(Array.isArray(claims.aud) ? claims.aud.includes(settings.clientId) && claims.azp === settings.clientId : claims.aud === settings.clientId) ||
        !Number.isFinite(claims.exp) || claims.exp * 1000 <= this.now() ||
        !Number.isFinite(claims.iat) || claims.iat * 1000 > this.now() + 30000 || claims.iat * 1000 < this.now() - 330000)
      fail('AFFILIATE_IDENTITY_NOT_VERIFIED', 401);
    await this.gateway.connect(session, 'affiliate', { token });
    // connect passes the same token to native Affiliate /api/me for cryptographic
    // verification and exact configured subject/role checks before accepting it.
    return { linked: true };
  }
  forget(session) { for (const [key, flow] of this.flows) if (flow.key === session.key) this.flows.delete(key); }
}
