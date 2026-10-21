import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {AffiliateLogin} from '../src/affiliate-login.mjs';
import {configuration} from '../src/config.mjs';

function fixture() {
  const settings={issuer:'https://identity.example.test',clientId:'fixture-client',clientSecret:'fictional-client-secret-only'};
  const session={key:'primary-session-one',subject:'primary-account-one',links:{}};
  const config={origin:'https://admin.example.test',affiliateLogin:settings,bindings:{[session.subject]:{affiliate:{}}}};
  const calls=[];let claims,active=true,rejectNative=false,exchanges=0;
  const now=()=>1_800_000_000_000;
  const token=()=>Buffer.from('{}').toString('base64url')+'.'+Buffer.from(JSON.stringify(claims)).toString('base64url')+'.fictional-signature';
  const gateway={authorize:async s=>{if(!active || s!==session)throw Error('PRIMARY_REVOKED');},connect:async(s,app,body)=>{
    // Contract stub only. Genuine Affiliate verifies this exact ID token with
    // its existing jose verifier and active DB membership on /api/me.
    if(rejectNative)throw Error('INVALID_NATIVE_SIGNATURE_OR_MEMBERSHIP');
    assert.equal(body.token,token());calls.push({app,body});s.links.affiliate={bearer:body.token};
  }};
  const broker=new AffiliateLogin(config,gateway,{now,fetcher:async(url,opts)=>{
    if(url.endsWith('/.well-known/openid-configuration'))return Response.json({issuer:settings.issuer,authorization_endpoint:settings.issuer+'/authorize',token_endpoint:settings.issuer+'/token'});
    assert.equal(url,settings.issuer+'/token');assert.equal(opts.redirect,'error');
    assert.equal(opts.headers.authorization,'Basic '+Buffer.from('fixture-client:fictional-client-secret-only').toString('base64'));
    const body=new URLSearchParams(opts.body);assert.equal(body.get('grant_type'),'authorization_code');
    const challenge=createHash('sha256').update(body.get('code_verifier')).digest('base64url');assert.equal(challenge,flowUrl.searchParams.get('code_challenge'));
    assert.equal(body.get('redirect_uri'),'https://admin.example.test/auth/affiliate/callback');
    exchanges++;return Response.json({id_token:token(),access_token:'discarded-fixture-access-token'});
  }});
  let flowUrl;
  return {broker,session,calls,settings,config,now,
    async start(){flowUrl=new URL((await broker.start(session)).url);claims={iss:settings.issuer,aud:settings.clientId,sub:'affiliate-fixture-subject',nonce:flowUrl.searchParams.get('nonce'),iat:now()/1000,exp:now()/1000+300};return flowUrl;},
    callback(url=flowUrl){broker.callback(new URLSearchParams({state:url.searchParams.get('state'),code:'fictional-auth-code'}));},
    claims:()=>claims,revoke(){active=false;},refuseNative(){rejectNative=true;},exchanges:()=>exchanges};
}
test('Affiliate sign-in binds state PKCE nonce and original CRP session, then uses native JWT authority',async()=>{
  const f=fixture(),url=await f.start();assert.equal(url.origin,f.settings.issuer);assert.equal(url.searchParams.get('scope'),'openid');
  assert.equal(url.searchParams.get('code_challenge_method'),'S256');assert.equal(url.searchParams.has('client_secret'),false);
  assert.deepEqual(await f.broker.finish(f.session),{pending:true});f.callback();
  assert.deepEqual(await f.broker.finish(f.session),{linked:true});assert.equal(f.calls.length,1);
  assert.equal(f.session.links.affiliate.bearer,f.calls[0].body.token);assert.equal(f.exchanges(),1);
  assert.throws(()=>f.callback(),/EXPIRED/);assert.deepEqual(await f.broker.finish(f.session),{pending:false});assert.equal(f.exchanges(),1);
});
test('wrong state, callback issuer, duplicate callback and unrelated primary session cannot connect',async()=>{
  const f=fixture(),url=await f.start();assert.throws(()=>f.broker.callback(new URLSearchParams('state=wrong&code=x')),/EXPIRED/);
  assert.throws(()=>f.broker.callback(new URLSearchParams({state:url.searchParams.get('state'),code:'x',iss:'https://other.invalid'})),/INVALID/);
  await assert.rejects(f.broker.finish({...f.session,key:'different'}),/PRIMARY_REVOKED/);
  f.callback();assert.throws(()=>f.callback(),/EXPIRED/);assert.equal(f.exchanges(),0);
});
test('nonce audience issuer and expiry failures consume the flow without linking or retry',async()=>{
  for(const change of [c=>c.nonce='wrong',c=>c.aud='another-client',c=>c.iss='https://other.invalid',c=>c.exp=0,c=>c.iat=0]) {
    const f=fixture();await f.start();change(f.claims());f.callback();await assert.rejects(f.broker.finish(f.session),/IDENTITY_NOT_VERIFIED/);
    assert.equal(f.calls.length,0);assert.deepEqual(await f.broker.finish(f.session),{pending:false});assert.equal(f.exchanges(),1);
  }
});
test('native signature/membership refusal and primary revocation prevent connection',async()=>{
  const f=fixture();await f.start();f.callback();f.refuseNative();await assert.rejects(f.broker.finish(f.session),/INVALID_NATIVE/);assert.equal(f.calls.length,0);
  assert.deepEqual(await f.broker.finish(f.session),{pending:false});
  const g=fixture();await g.start();g.callback();g.revoke();await assert.rejects(g.broker.finish(g.session),/PRIMARY_REVOKED/);assert.equal(g.exchanges(),0);
});
test('identity configuration refuses arbitrary issuer origins and local secret configuration',()=>{
  const raw={environment:'staging',origin:'https://admin-staging.creditregulatorpro.com',upstreams:{},affiliateLogin:{issuer:'https://gorgeous-monkfish-8241.clerk.accounts.dev',clientId:'fixture-client',clientSecret:'fixture-secret-only'}};
  assert.ok(configuration(raw).affiliateLogin);
  assert.throws(()=>configuration({...raw,affiliateLogin:{...raw.affiliateLogin,issuer:'https://attacker.invalid'}}),/CONFIGURATION_INVALID/);
  assert.throws(()=>configuration({...raw,environment:'local',origin:'http://127.0.0.1:4395'}),/CONFIGURATION_INVALID/);
});
