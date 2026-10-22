import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, randomBytes } from 'node:crypto';
import { FamilySso } from '../src/family-sso.mjs';
import { FamilySsoClient } from '../native/family-sso-client.mjs';
import { trustedConfiguration } from '../native/family-sso-client.mjs';
import { mkdtempSync,writeFileSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { issueProof, verifyProof, hash, requestHash } from '../native/family-sso-protocol.mjs';
import { fixtures, account } from './fixtures.mjs';

const keys = () => generateKeyPairSync('ed25519');
const claims = () => ({iss:'https://admin.example.test',aud:'https://native.example.test',env:'staging',sub:account,sid:'b'.repeat(64),asub:'native-owner',scp:['affiliate.read'],csh:'c'.repeat(64),jti:randomBytes(32).toString('base64url'),vat:Math.floor(Date.now()/1000),req:requestHash('GET','/api/me')});
test('native trust pins environment hosts, public key and individual roles without email inference',()=>{
  const directory=mkdtempSync(join(tmpdir(),'family-trust-')),path=join(directory,'trust.json');
  const config={issuer:'https://admin-staging.creditregulatorpro.com',audience:'https://affiliates-staging.creditregulatorpro.com',environment:'staging',publicKey:keys().publicKey.export({type:'spki',format:'pem'}),bindings:{[account]:{subject:'native-owner',roles:['owner'],permissions:['affiliate.read']}}};
  const check=value=>{writeFileSync(path,JSON.stringify(value),{mode:0o600});return trustedConfiguration(path,{app:'affiliate',origin:config.audience,environment:'staging'});};
  try {
    assert.equal(check(config).issuer,config.issuer);
    for(const change of [{issuer:'https://admin.creditregulatorpro.com'},{audience:'https://affiliates.creditregulatorpro.com'},{environment:'production'},{bindings:{'owner@example.test':config.bindings[account]}},{bindings:{[account]:{...config.bindings[account],roles:['superadmin']}}},{bindings:{[account]:{...config.bindings[account],permissions:['fulfillment.prepare']}}},{privateKey:'forbidden'}])assert.throws(()=>check({...config,...change}));
  } finally {rmSync(directory,{recursive:true,force:true});}
});
test('delegation pins key, purpose, audience, environment, expiry and exact request', () => {
  const {privateKey,publicKey}=keys(), p=claims();
  const token=issueProof(privateKey,p), options={publicKey,issuer:p.iss,audience:p.aud,environment:p.env,request:{method:'GET',path:'/api/me'}};
  assert.equal(verifyProof(token,options).sub,account);
  for(const change of [{issuer:'https://other.test'},{audience:'https://other.test'},{environment:'production'},{use:'lease'},{publicKey:keys().publicKey},{now:Date.now()+46000},{request:{method:'POST',path:'/api/me'}},{request:{method:'GET',path:'/api/me?x=1'}}])assert.throws(()=>verifyProof(token,{...options,...change}),/FAMILY_SSO_REFUSED/);
  assert.throws(()=>verifyProof(token.slice(0,-5)+'ABCDE',options));
  assert.throws(()=>verifyProof(issueProof(privateKey,{...p,role:'owner'}),options));
  assert.equal(requestHash('POST','/api/item',{b:2,a:1}),requestHash('POST','/api/item',{a:1,b:2}));
});

async function singleLogin(t) {
  let clock=Date.now();const f=await fixtures({now:()=>clock}), {privateKey}=keys();
  t.after(()=>f.close());
  f.portal.config.familySso=true;
  const issuer=f.portal.gateway.sso=new FamilySso(f.portal.config,f.portal.gateway,{privateKey,now:()=>clock});
  const normal=f.portal.gateway.fetcher, clients={}, roles={affiliate:'owner',mail:'admin'};
  for(const app of ['affiliate','mail'])clients[app]=new FamilySsoClient({app,issuer:f.base,audience:f.portal.config.upstreams[app],environment:'local',publicKey:issuer.publicKey,now:()=>clock,
    binding:sub=>f.portal.config.bindings[sub]?.[app],
    resolveActor:b=>{if((app==='affiliate'&&!b.roles.includes(roles[app]))||(app==='mail'&&b.role!==roles[app]))throw Error('REVOKED');return app==='affiliate'?{subject:b.subject,role:roles[app]}:{role:roles[app]};},
    permission:req=>req.url.includes('prepare')||req.url.endsWith('/api/me')||req.url.endsWith('/api/session')?null:app==='affiliate'?'affiliate.read':'fulfillment.read'});
  const calls=[];
  f.portal.gateway.fetcher=async(target,options)=>{
    const app=['affiliate','mail'].find(a=>new URL(target).origin===f.portal.config.upstreams[a]);
    if(!app)return normal(target,options);
    assert.equal(options.headers.cookie,undefined,'primary cookies must never reach native apps');
    const url=new URL(target), req={method:options.method,url:url.pathname+url.search,headers:options.headers,body:options.body?JSON.parse(options.body):undefined};
    calls.push(req);const context=await clients[app].authenticate(req);assert.ok(context);
    if(req.url==='/api/me')return Response.json(context.actor);
    if(req.url==='/staff/api/session')return Response.json({authenticated:true,role:context.actor.role,csrfToken:context.csrf});
    return Response.json({items:[]});
  };
  return {f,issuer,clients,calls,roles,advance:n=>clock+=n};
}
test('one primary login/unlock automatically verifies both apps without provider login or Mail ticket',async t=>{
  const {f,calls}=await singleLogin(t);
  const result=await f.login();assert.equal(result.status,200,JSON.stringify(result.json));
  for(const app of ['crp','affiliate','mail'])assert.equal(result.json.applications[app].linked,true);
  assert.equal(result.json.applications.mail.managedSignIn,true);
  assert.equal((await f.request('/api/apps/affiliate/partners')).status,200);
  assert.equal((await f.request('/api/apps/mail/orders')).status,200);
  assert(!calls.some(c=>/login|token|ticket/.test(c.url)));
  assert.equal((await f.request('/api/connections/mail',{method:'POST',body:{code:'a'.repeat(48)}})).status,409);
  assert.equal((await f.request('/api/connections/affiliate',{method:'DELETE'})).status,409);
});
test('native delegation refuses replay, changed body, missing CSRF, removed native membership and global logout',async t=>{
  const {f,issuer,clients,roles}=await singleLogin(t);await f.login();const s=[...f.portal.gateway.sessions.values()][0], client=clients.affiliate;
  async function request(path='/api/me',method='GET',body) {return {url:path,method,body,headers:{authorization:'Bearer '+await issuer.proof(s,'affiliate',{method,path,body}),'x-csrf-token':s.links.affiliate.csrf}};}
  const first=await request();assert.ok(await client.authenticate(first));await assert.rejects(client.authenticate({...first}),/FAMILY_SSO_REFUSED/);
  const changed=await request('/api/item','POST',{a:1});changed.body={a:2};await assert.rejects(client.authenticate(changed));
  const csrf=await request();delete csrf.headers['x-csrf-token'];await assert.rejects(client.authenticate(csrf));
  roles.affiliate='analyst';await assert.rejects(client.authenticate(await request()));roles.affiliate='owner';
  const pending=await request();await f.request('/api/logout',{method:'POST'});await assert.rejects(client.authenticate(pending));
});
test('current primary permissions, binding removal and fresh global MFA gate native browser leases',async t=>{
  const {f,issuer,clients,advance}=await singleLogin(t);await f.login();const s=[...f.portal.gateway.sessions.values()][0];
  const lease=await issuer.proof(s,'affiliate',null,true), cookie='d'.repeat(64), csrf='e'.repeat(64),client=clients.affiliate;
  client.sessions.set(hash(cookie),{lease,csrf,until:s.expires});
  const req=(method='GET')=>({method,url:'/api/partners',headers:{cookie:client.cookie+'='+cookie,origin:client.audience,'x-csrf-token':csrf}});
  assert.ok(await client.authenticate(req()));advance(61000);await assert.rejects(client.authenticate(req('POST')),/FRESH_FACTOR_REQUIRED/);
  f.state.primaryPermissions=f.state.primaryPermissions.filter(p=>p!=='affiliate.read');await assert.rejects(client.authenticate(req()));
  delete f.portal.config.bindings[account].affiliate;await assert.rejects(client.authenticate(req()));
});
test('browser handoff binds original Family session and consumes an intent only once',async t=>{
  const {f,issuer}=await singleLogin(t);await f.login();const s=[...f.portal.gateway.sessions.values()][0];
  const handoff=await issuer.handoff(s,'affiliate'), id=new URL(handoff.url).searchParams.get('request'), challenge='a'.repeat(64);
  await assert.rejects(issuer.authorizeHandoff({...s,key:'f'.repeat(64)},new URLSearchParams({request:id,challenge})),/SSO_HANDOFF_EXPIRED/);
  const original=f.portal.gateway.call.bind(f.portal.gateway);
  f.portal.gateway.call=async(app,path,...rest)=>path==='/auth/family/prepare'?{code:'b'.repeat(64)}:original(app,path,...rest);
  assert.equal(await issuer.authorizeHandoff(s,new URLSearchParams({request:id,challenge})),f.portal.config.upstreams.affiliate+'/auth/family/callback?code='+'b'.repeat(64));
  await assert.rejects(issuer.authorizeHandoff(s,new URLSearchParams({request:id,challenge})),/SSO_HANDOFF_EXPIRED/);
});
