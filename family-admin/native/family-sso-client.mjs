import { readFileSync, lstatSync } from 'node:fs';
import { randomBytes, timingSafeEqual, createPublicKey } from 'node:crypto';
import { hash, verifyProof } from './family-sso-protocol.mjs';

const fail = () => { throw Object.assign(Error('FAMILY_SSO_REFUSED'), { code: 'FAMILY_SSO_REFUSED', status: 401, statusCode: 401 }); };
const random = () => randomBytes(32).toString('hex');
const equal = (a,b) => typeof a === 'string' && typeof b === 'string' && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a),Buffer.from(b));
function readCookie(req,name) {
  const values = String(req.headers.cookie || '').split(';').map(v=>v.trim()).filter(v=>v.startsWith(name+'='));
  if (values.length > 1) fail();
  return values[0]?.slice(name.length+1);
}
export function trustedConfiguration(path, { app, origin, environment }) {
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 65536 || (process.platform !== 'win32' && (stat.mode & 0o022))) fail();
  const c = JSON.parse(readFileSync(path,'utf8').replace(/^\uFEFF/,''));
  const expected = environment === 'local' ? (() => {
    const i=new URL(c.issuer), a=new URL(origin);
    if([i,a].some(u=>u.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(u.hostname)||u.username||u.password||u.origin!==u.href.replace(/\/$/,''))||i.origin===a.origin)fail();
    return {issuer:i.origin,[app]:origin};
  })() : {
    staging: { issuer:'https://admin-staging.creditregulatorpro.com', affiliate:'https://affiliates-staging.creditregulatorpro.com', mail:'https://mail-staging.creditregulatorpro.com' },
    production: { issuer:'https://admin.creditregulatorpro.com', affiliate:'https://affiliates.creditregulatorpro.com', mail:'https://mail.creditregulatorpro.com' }
  }[environment];
  if (!expected || expected[app] !== origin || c.issuer !== expected.issuer || c.audience !== origin || c.environment !== environment || Object.keys(c).some(k=>!['issuer','audience','environment','publicKey','bindings'].includes(k))) fail();
  if (typeof c.publicKey !== 'string' || !c.publicKey.includes('PUBLIC KEY') || !c.bindings || typeof c.bindings !== 'object' || Array.isArray(c.bindings)) fail();
  if(createPublicKey(c.publicKey).asymmetricKeyType!=='ed25519')fail();
  for(const [subject,b]of Object.entries(c.bindings)) {
    const allowed=app==='affiliate'?['subject','roles','permissions']:['role','memberId','permissions'];
    const scopes=app==='affiliate'?['affiliate.read','affiliate.manage','team.manage']:['fulfillment.read','fulfillment.prepare','team.manage','billing.read'];
    if(!/^acc_[a-f0-9]{24}$/.test(subject)||!b||typeof b!=='object'||Array.isArray(b)||Object.keys(b).some(k=>!allowed.includes(k))||!Array.isArray(b.permissions)||!b.permissions.length||new Set(b.permissions).size!==b.permissions.length||b.permissions.some(p=>!scopes.includes(p)))fail();
    if(app==='affiliate' ? (typeof b.subject!=='string'||!b.subject||b.subject.length>200||!Array.isArray(b.roles)||!b.roles.length||b.roles.some(r=>!['owner','agent','operator','analyst'].includes(r)))
      : (!['admin','operator'].includes(b.role)||(b.role==='operator'&&typeof b.memberId!=='string')||(b.role==='admin'&&b.memberId)))fail();
  }
  return c;
}
export class FamilySsoClient {
  constructor({ app, issuer, audience, environment, publicKey, binding, resolveActor, permission, freshFactor = req => !['GET','HEAD'].includes(req.method), fetcher = fetch, now = Date.now }) {
    Object.assign(this,{app,issuer,audience,environment,publicKey,binding,resolveActor,permission,freshFactor,fetcher,now});
    this.nonces=new Map();this.codes=new Map();this.sessions=new Map();this.used=new Map();this.cache=new WeakMap();this.cookie='crp_family_'+app;
    this.secure=environment!=='local';
  }
  flags(age=900) { return '; HttpOnly; SameSite=Strict; Path=/; Max-Age='+age+(this.secure?'; Secure':''); }
  verify(token,use,request) { return verifyProof(token,{publicKey:this.publicKey,issuer:this.issuer,audience:this.audience,environment:this.environment,use,now:this.now(),request}); }
  async active(token,p) {
    let response;
    try {
      response=await this.fetcher(this.issuer+'/internal/sso/introspect',{method:'POST',headers:{origin:this.audience,'content-type':'application/json'},body:JSON.stringify({token}),redirect:'error',signal:AbortSignal.timeout(5000)});
      if(!response.ok || Number(response.headers.get('content-length')||0)>16384)fail();
      const chunks=[];let length=0;const reader=response.body.getReader();
      while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>16384){await reader.cancel();fail();}chunks.push(Buffer.from(value));}
      const value=JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if(!value.active||value.sub!==p.sub||value.asub!==p.asub||value.sid!==p.sid||value.aud!==p.aud||value.exp!==p.exp||JSON.stringify(value.scp)!==JSON.stringify(p.scp))fail();
    } catch { fail(); }
    const b=await this.binding(p.sub);
    if(!b || (this.app==='affiliate' ? b.subject : b.role==='admin'?'admin:'+p.sub:b.memberId)!==p.asub)fail();
    if(!Array.isArray(b.permissions)||p.scp.some(scope=>!b.permissions.includes(scope)))fail();
    const actor=await this.resolveActor(b,p);if(!actor)fail();return actor;
  }
  async authenticate(req) {
    if(this.cache.has(req))return this.cache.get(req);
    const token=/^Bearer (crpfam1\.[^ ]+)$/.exec(req.headers.authorization||'')?.[1], cookie=readCookie(req,this.cookie);
    if(!token&&!cookie)return null;
    if(cookie&&!/^[a-f0-9]{64}$/.test(cookie))fail();
    if(cookie&&req.headers.authorization)fail();
    const path=new URL(req.url,this.audience).pathname+new URL(req.url,this.audience).search;
    let p,actor,csrf,lease;
    if(token) {
      p=this.verify(token,'request',{method:req.method,path,body:req.body});csrf=req.headers['x-csrf-token'];
      for(const [key,until]of this.used)if(until<=this.now())this.used.delete(key);
      if(this.used.has(p.jti)||this.used.size>=5000)fail();
      this.used.set(p.jti,p.exp*1000);
      if(!/^[a-f0-9]{64}$/.test(csrf||'')||hash(csrf)!==p.csh)fail();actor=await this.active(token,p);
    } else {
      const saved=this.sessions.get(hash(cookie));if(!saved||saved.until<=this.now())fail();
      lease=saved.lease;csrf=saved.csrf;p=this.verify(lease,'lease');actor=await this.active(lease,p);
      if(!['GET','HEAD'].includes(req.method) && (req.headers.origin!==this.audience||!equal(req.headers['x-csrf-token'],csrf)))fail();
    }
    const permission=this.permission?.(req);
    if(permission&&!p.scp.includes(permission))fail();
    // A native workspace may not bypass the global fresh-factor requirement.
    if(!['GET','HEAD'].includes(req.method)&&!['/auth/family/prepare','/auth/logout','/staff/api/logout'].includes(path)&&this.freshFactor(req)&&this.now()-p.vat*1000>60000)
      throw Object.assign(Error('FRESH_FACTOR_REQUIRED'),{code:'FRESH_FACTOR_REQUIRED',status:401,statusCode:401});
    const result={actor,claims:p,lease,csrf,session:{...actor,member_id:actor.member_id??null,csrf_token:csrf,expires_at:p.exp*1000,family:true}};
    this.cache.set(req,result);return result;
  }
  trim() {
    for(const map of [this.nonces,this.codes,this.sessions])for(const [key,value]of map)if(value.until<=this.now())map.delete(key);
    if(this.nonces.size+this.codes.size>=200||this.sessions.size>=200)fail();
  }
  hasBrowserSession(req) { return readCookie(req,this.cookie) !== undefined; }
  register(app,{destination,legacyCookies=[]}) {
    const host = new URL(this.audience).host;
    const guard = async req => {
      if (req.headers.host !== host || (req.headers.origin && req.headers.origin !== this.audience) ||
          (req.method === 'POST' && req.headers.origin !== this.audience)) fail();
    };
    app.get('/auth/family/start',{preHandler:guard},async(req,reply)=>{
      this.trim();const request=req.query?.request;if(!/^[A-Za-z0-9_-]{43}$/.test(request||''))fail();
      const nonce=random(),challenge=hash(nonce);this.nonces.set(challenge,{request,until:this.now()+45000});
      reply.header('cache-control','no-store');reply.header('referrer-policy','no-referrer');
      reply.header('set-cookie',this.cookie+'_handoff='+nonce+this.flags(45));
      return reply.redirect(this.issuer+'/auth/family/authorize?request='+request+'&challenge='+challenge);
    });
    app.post('/auth/family/prepare',{preHandler:guard},async(req,reply)=>{
      this.trim();const context=await this.authenticate(req), b=req.body;
      if(!context||context.lease||Object.keys(b||{}).sort().join(',')!=='challenge,lease,request')fail();
      const saved=this.nonces.get(b.challenge);if(!saved||saved.request!==b.request||saved.until<=this.now())fail();
      const lease=this.verify(b.lease,'lease');
      if(lease.sub!==context.claims.sub||lease.sid!==context.claims.sid||lease.asub!==context.claims.asub||lease.csh!==context.claims.csh||JSON.stringify(lease.scp)!==JSON.stringify(context.claims.scp))fail();
      this.nonces.delete(b.challenge);const code=random();this.codes.set(hash(code),{challenge:b.challenge,lease:b.lease,until:this.now()+45000});
      reply.header('cache-control','no-store');return {code};
    });
    app.get('/auth/family/callback',{preHandler:guard},async(req,reply)=>{
      const code=req.query?.code,nonce=readCookie(req,this.cookie+'_handoff');
      if(!/^[a-f0-9]{64}$/.test(code||'')||!/^[a-f0-9]{64}$/.test(nonce||''))fail();
      const saved=this.codes.get(hash(code));if(!saved||saved.until<=this.now()||saved.challenge!==hash(nonce))fail();
      this.codes.delete(hash(code));const p=this.verify(saved.lease,'lease');await this.active(saved.lease,p);this.trim();
      const token=random();this.sessions.set(hash(token),{lease:saved.lease,csrf:random(),until:p.exp*1000});
      reply.header('cache-control','no-store');reply.header('referrer-policy','no-referrer');
      reply.header('set-cookie',[this.cookie+'='+token+this.flags(Math.max(1,p.exp-Math.floor(this.now()/1000))),this.cookie+'_handoff='+this.flags(0),
        ...legacyCookies.map(({name,path})=>name+'=; HttpOnly; SameSite=Strict; Path='+path+'; Max-Age=0'+(this.secure?'; Secure':''))]);
      return reply.redirect(destination);
    });
  }
  logout(req,reply) {
    const value=readCookie(req,this.cookie);if(value)this.sessions.delete(hash(value));
    const existing=reply.getHeader?.('set-cookie');
    reply.header('set-cookie',[...(existing?(Array.isArray(existing)?existing:[existing]):[]),this.cookie+'='+this.flags(0)]);
  }
}
