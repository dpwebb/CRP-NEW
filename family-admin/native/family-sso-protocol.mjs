import { createHash, createPrivateKey, createPublicKey, sign, verify } from 'node:crypto';

const refuse = () => { throw Object.assign(Error('FAMILY_SSO_REFUSED'), { code: 'FAMILY_SSO_REFUSED', status: 401, statusCode: 401 }); };
export const hash = value => createHash('sha256').update(value).digest('hex');
export function canonical(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
}
export const requestHash = (method, path, body) => hash(method + '\n' + path + '\n' + canonical(body ?? null));
const publicPart = key => key?.type === 'public' ? key : createPublicKey(key);
export const keyId = key => hash(publicPart(key).export({ type: 'spki', format: 'der' })).slice(0, 32);
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
export function signingKey(pem) {
  const key = pem?.type === 'private' ? pem : createPrivateKey(pem);
  if (key.asymmetricKeyType !== 'ed25519') refuse();
  return key;
}
export function issueProof(key, claims, { use = 'request', now = Date.now(), ttl = use === 'lease' ? 900 : 45 } = {}) {
  const at = Math.floor(now / 1000), limit = use === 'lease' ? 900 : 45;
  if (!Number.isInteger(ttl) || ttl < 1 || ttl > limit || !['lease', 'request'].includes(use)) refuse();
  const header = { alg: 'EdDSA', typ: `crp-family-${use}+jwt`, kid: keyId(key) };
  const value = { ...claims, iat: at, nbf: at, exp: at + ttl };
  const input = encode(header) + '.' + encode(value);
  return 'crpfam1.' + input + '.' + sign(null, Buffer.from(input), key).toString('base64url');
}
export function verifyProof(token, { publicKey, issuer, audience, environment, use = 'request', now = Date.now(), request } = {}) {
  try {
    if (typeof token !== 'string' || token.length > 16384 || !/^crpfam1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) refuse();
    const [, head, body, signature] = token.split('.'), h = JSON.parse(Buffer.from(head, 'base64url')), p = JSON.parse(Buffer.from(body, 'base64url'));
    const key = publicPart(publicKey), at = Math.floor(now / 1000);
    if (key.asymmetricKeyType !== 'ed25519' || Object.keys(h).sort().join(',') !== 'alg,kid,typ' || h.alg !== 'EdDSA' || h.typ !== `crp-family-${use}+jwt` || h.kid !== keyId(publicKey) || !verify(null, Buffer.from(head + '.' + body), key, Buffer.from(signature, 'base64url'))) refuse();
    if (p.iss !== issuer || p.aud !== audience || p.env !== environment || !/^acc_[a-f0-9]{24}$/.test(p.sub || '') || !/^[a-f0-9]{64}$/.test(p.sid || '') || typeof p.asub !== 'string' || !p.asub || p.asub.length > 200 || !/^[a-f0-9]{64}$/.test(p.csh || '') || !/^[A-Za-z0-9_-]{32,64}$/.test(p.jti || '')) refuse();
    if (!Array.isArray(p.scp) || !p.scp.length || p.scp.length > 32 || new Set(p.scp).size !== p.scp.length || p.scp.some(s => typeof s !== 'string' || !/^[a-z]+\.[a-z]+$/.test(s))) refuse();
    if (Object.keys(p).some(k => !['iss','aud','env','sub','sid','asub','scp','csh','jti','iat','nbf','exp','req','vat'].includes(k)) || !Number.isSafeInteger(p.vat) || p.vat > at + 5 || p.vat > p.iat) refuse();
    if (![p.iat,p.nbf,p.exp].every(Number.isSafeInteger) || p.nbf !== p.iat || p.iat > at + 5 || p.exp <= at || p.exp <= p.iat || p.exp - p.iat > (use === 'lease' ? 900 : 45)) refuse();
    if (use === 'request' && (!/^[a-f0-9]{64}$/.test(p.req || '') || (request && p.req !== requestHash(request.method, request.path, request.body)))) refuse();
    if (use === 'lease' && p.req !== undefined) refuse();
    return p;
  } catch { refuse(); }
}
