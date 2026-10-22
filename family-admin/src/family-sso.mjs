import { readFileSync, lstatSync } from 'node:fs';
import { createPublicKey, randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { signingKey, issueProof, verifyProof, hash, requestHash } from '../native/family-sso-protocol.mjs';

const nonce = () => randomBytes(32).toString('base64url');
const fail = code => { throw Object.assign(Error(code), { code, status: 401 }); };
export class FamilySso {
  constructor(config, gateway, { now = Date.now, privateKey } = {}) {
    this.config = config; this.gateway = gateway; this.now = now; this.pending = new Map();
    const path = join(config.auditDirectory, 'sso-signing.pem');
    if (!privateKey) {
      const stat = lstatSync(path);
      if (!stat.isFile() || stat.isSymbolicLink() || (process.platform !== 'win32' && (stat.mode & 0o777) !== 0o600)) fail('SSO_PRIVATE_KEY_REQUIRED');
    }
    this.key = signingKey(privateKey || readFileSync(path));
    this.publicKey = createPublicKey(this.key).export({ type: 'spki', format: 'pem' });
  }
  claims(s, app) {
    const b = this.gateway.binding(s, app);
    if (!b || !['affiliate','mail'].includes(app) || !this.config.upstreams[app]) fail('APPLICATION_BINDING_REQUIRED');
    const scp = b.permissions.filter(p => s.principal.permissions.includes(p));
    if (!scp.length) fail('LINKED_PERMISSION_REQUIRED');
    const link = s.links[app] ||= { mode: 'sso', csrf: randomBytes(32).toString('hex') };
    return { iss: this.config.origin, aud: this.config.upstreams[app], env: this.config.environment,
      sub: s.subject, sid: s.key, asub: app === 'affiliate' ? b.subject : b.role === 'admin' ? 'admin:' + s.subject : b.memberId,
      scp, csh: hash(link.csrf), jti: nonce(), vat: Math.floor(s.verifiedAt / 1000) };
  }
  async proof(s, app, request, lease = false) {
    await this.gateway.authorize(s);
    const claims = this.claims(s, app), remaining = Math.floor((s.expires - this.now()) / 1000);
    if (remaining < 1) fail('SESSION_REQUIRED');
    if (!lease) claims.req = requestHash(request.method, request.path, request.body);
    return issueProof(this.key, claims, { now: this.now(), use: lease ? 'lease' : 'request', ttl: Math.min(remaining, lease ? 900 : 45) });
  }
  async introspect(token, origin) {
    try {
      const app = ['affiliate','mail'].find(a => this.config.upstreams[a] === origin);
      if (!app) return { active: false };
      let p;
      for (const use of ['request','lease']) {
        try { p = verifyProof(token, { publicKey: this.publicKey, issuer: this.config.origin, audience: origin, environment: this.config.environment, use, now: this.now() }); break; } catch {}
      }
      if (!p) return { active: false };
      const s = this.gateway.sessions.get(p.sid);
      if (!s || s.subject !== p.sub) return { active: false };
      await this.gateway.authorize(s);
      const current = this.claims(s, app);
      if (current.asub !== p.asub || current.csh !== p.csh || current.vat !== p.vat || p.scp.some(v => !current.scp.includes(v))) return { active: false };
      return { active: true, sub: p.sub, asub: p.asub, sid: p.sid, aud: p.aud, scp: p.scp, exp: p.exp };
    } catch { return { active: false }; }
  }
  async handoff(s, app) {
    await this.gateway.nativeIdentity(s, app);
    for (const [id,p] of this.pending) if (p.until <= this.now()) this.pending.delete(id);
    if (this.pending.size >= 100) fail('SSO_HANDOFF_CAPACITY');
    const id = nonce(); this.pending.set(hash(id), { session: s.key, app, until: this.now() + 45000 });
    return { url: this.config.upstreams[app] + '/auth/family/start?request=' + id };
  }
  async authorizeHandoff(s, params) {
    const request = params.get('request'), challenge = params.get('challenge');
    const pending = typeof request === 'string' && this.pending.get(hash(request));
    if (!pending || pending.session !== s.key || pending.until <= this.now() || !/^[a-f0-9]{64}$/.test(challenge || '')) fail('SSO_HANDOFF_EXPIRED');
    this.pending.delete(hash(request));
    const lease = await this.proof(s, pending.app, null, true);
    const result = await this.gateway.call(pending.app, '/auth/family/prepare', s, { method: 'POST', body: { request, challenge, lease } });
    if (!/^[a-f0-9]{64}$/.test(result.code || '')) fail('SSO_HANDOFF_REFUSED');
    return this.config.upstreams[pending.app] + '/auth/family/callback?code=' + result.code;
  }
}
