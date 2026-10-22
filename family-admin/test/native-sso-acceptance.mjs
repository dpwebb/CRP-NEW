// Explicit cross-repository acceptance: real disposable CRP HTTP service,
// native Mail SQLite/Fastify and native Affiliate PostgreSQL/Fastify.
// Set CRP_FAMILY_CONSUMER_ROOT, CRP_FAMILY_MAIL_ROOT and CRP_FAMILY_AFFILIATE_ROOT to the intended isolated candidates.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { pathToFileURL,fileURLToPath } from 'node:url';
import { resolve, join } from 'node:path';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createServer } from 'node:net';
import { generateKeyPairSync, randomUUID } from 'node:crypto';
import { createPortal } from '../src/server.mjs';
import { permissions } from './fixtures.mjs';
const require=createRequire(import.meta.url);
const native=async(root,file)=>import(pathToFileURL(resolve(root,file)));
async function freePort(){const s=createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p;}

test('real native services accept one CRP MFA login, preserve scopes and revoke native SSO on global sign-out',{timeout:180000},async()=>{
  const mailRoot=process.env.CRP_FAMILY_MAIL_ROOT,affiliateRoot=process.env.CRP_FAMILY_AFFILIATE_ROOT,consumerRoot=process.env.CRP_FAMILY_CONSUMER_ROOT;
  assert(mailRoot&&affiliateRoot&&consumerRoot,'Set all three intended isolated native checkout roots');
  const {TestService}=require(resolve(consumerRoot,'accelerated-launch/service/tests/harness.cjs'));
  const security=require(resolve(consumerRoot,'accelerated-launch/service/signup-security.cjs')),access=require(resolve(consumerRoot,'accelerated-launch/service/admin-access.cjs'));
  for(const name of ['family-sso-protocol.mjs','family-sso-client.mjs'])for(const checkout of [mailRoot,affiliateRoot])
    assert.deepEqual(readFileSync(resolve(checkout,'src',name)),readFileSync(new URL('../native/'+name,import.meta.url)), 'Native shared protocol bytes must match the Family candidate');
  const root=mkdtempSync(join(tmpdir(),'crp-family-all-native-')),originalNow=Date.now,enabled=process.env.CRP_ADMIN_ENABLED;
  let consumer,mail,affiliate,db,pg,portal,clock=originalNow();
  const observations=[];
  process.env.CRP_ADMIN_ENABLED='1';
  try {
    consumer=new TestService('family-sso-native');await consumer.listen();
    const owner=await consumer.unpaidAccount('fictional-global-owner@example.test');
    Date.now=()=>clock-180000;
    const setup=security.beginTwoFactor(consumer.service.store,owner,{password:'a-long-enough-password'});
    security.confirmTwoFactor(consumer.service.store,owner,{code:security.totp(setup.secret)});
    access.bootstrapOwner(consumer.service.adminStore,{account_id:owner.account_id,code:security.totp(setup.secret,clock-150000)});
    Date.now=()=>clock;
    const mailPort=await freePort(),affiliatePort=await freePort(),familyPort=await freePort();
    const origin='http://127.0.0.1:'+familyPort,mailOrigin='http://127.0.0.1:'+mailPort,affiliateOrigin='http://127.0.0.1:'+affiliatePort;
    const {privateKey,publicKey}=generateKeyPairSync('ed25519'),publicPem=publicKey.export({type:'spki',format:'pem'});
    const bindings={affiliate:{subject:'demo-owner',roles:['owner'],permissions:['affiliate.read','affiliate.manage','team.manage']},mail:{role:'admin',permissions:['fulfillment.read','fulfillment.prepare','team.manage','billing.read']}};
    const trust=(app,audience)=>{const path=join(root,app+'-trust.json');writeFileSync(path,JSON.stringify({issuer:origin,audience,environment:'local',publicKey:publicPem,bindings:{[owner.account_id]:bindings[app]}}),{mode:0o600});return path;};
    const {fixtureConfig}=await native(mailRoot,'scripts/fixtures.mjs'),{openStore}=await native(mailRoot,'src/store.mjs'),{createApp}=await native(mailRoot,'src/app.mjs');
    const mailConfig={...fixtureConfig(join(root,'mail')),port:mailPort,familySsoConfigPath:trust('mail',mailOrigin)};
    db=openStore(mailConfig.databasePath,{initialize:true});mail=createApp(mailConfig,db);await mail.listen({port:mailPort,host:'127.0.0.1'});
    const {localDatabase,seedDemo}=await native(affiliateRoot,'scripts/local.mjs'),{config:readConfig}=await native(affiliateRoot,'src/config.mjs'),{buildApp}=await native(affiliateRoot,'src/service.mjs'),{registerOperations}=await native(affiliateRoot,'src/operations.mjs');
    pg=await localDatabase({root:join(root,'postgres'),port:await freePort()});const partner=await seedDemo(pg.pool);
    const affiliateConfig=readConfig({APP_ENV:'test',PUBLIC_ORIGIN:affiliateOrigin,PORT:affiliatePort,DATABASE_URL:'fictional-local-only',REFERRAL_SECRET:'r'.repeat(40),BINDING_SECRET:'b'.repeat(40),WORKER_ENABLED:'false',FAMILY_SSO_CONFIG_PATH:trust('affiliate',affiliateOrigin)});
    affiliate=await buildApp(pg.pool,affiliateConfig,{registerOperations});await affiliate.listen({port:affiliatePort,host:'127.0.0.1'});
    const retired=['/banners.js','/banner-gallery.js','/banners.css','/partner-desktop.svg','/partner-mobile.svg','/partner-email.png'];
    for(const path of retired)for(const method of ['GET','HEAD'])for(const query of ['', '?legacy=1']) {
      const response=await fetch(affiliateOrigin+path+query,{method});assert.equal(response.status,410,path);
      assert.equal(response.headers.get('cache-control'),'no-store');
    }
    portal=createPortal({environment:'local',familySso:true,origin,upstreams:{crp:consumer.base,affiliate:affiliateOrigin,mail:mailOrigin},auditDirectory:join(root,'family'),bindings:{[owner.account_id]:bindings}},{ssoPrivateKey:privateKey,now:()=>clock});
    await new Promise(r=>portal.server.listen(familyPort,'127.0.0.1',r));
    clock=originalNow();Date.now=()=>clock;
    let cookie='',csrf='';
    const request=async(path,method='GET',body)=>{
      const r=await fetch(origin+path,{method,headers:{origin,cookie,'x-csrf-token':csrf,...(body===undefined?{}:{'content-type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body),redirect:'manual'});
      for(const value of r.headers.getSetCookie())if(value.startsWith('crp_family='))cookie=value.split(';')[0];
      const data=await r.json();if(data.csrf)csrf=data.csrf;return {status:r.status,data};
    };
    let r=await request('/api/login','POST',{email:'fictional-global-owner@example.test',password:'a-long-enough-password',code:security.totp(setup.secret,clock)});assert.equal(r.status,200,JSON.stringify(r.data));
    clock+=30000;r=await request('/api/unlock','POST',{code:security.totp(setup.secret,clock)});assert.equal(r.status,200,JSON.stringify(r.data));
    for(const app of ['crp','affiliate','mail']){
      if(!r.data.applications[app].linked)await portal.gateway.nativeIdentity([...portal.gateway.sessions.values()][0],app);
      assert.equal(r.data.applications[app].linked,true,app+' automatic native access');
    }
    for(const path of ['/api/apps/crp/accounts','/api/apps/affiliate/partners','/api/apps/mail/orders']){r=await request(path);assert.equal(r.status,200,JSON.stringify(r.data));observations.push({path,status:r.status});}
    assert.equal(db.prepare('SELECT count(*) n FROM staff_tickets').get().n,0);assert.equal(db.prepare('SELECT count(*) n FROM staff_sessions').get().n,0);
    assert.equal((await pg.pool.query('SELECT count(*)::int n FROM sessions')).rows[0].n,0);
    const action=async(app,name,body,id)=>{
      const result=await request('/api/actions/'+app+'/'+name,'POST',{body,id,requestId:randomUUID(),confirmation:'local:'+app+':'+name});
      assert.equal(result.status,200,JSON.stringify(result.data));assert.equal(result.data.status,'APPLIED');return result.data.data;
    };
    await action('crp','organization.add',{name:'Fictional unified administration'});
    const designation=await action('mail','team.add',{name:'Fictional designated operator',country:'CA',kind:'individual'});
    const prices=await request('/api/apps/mail/pricing'),price=prices.data.data.items.find(x=>x.country==='CA');
    await action('mail','pricing.update',{country:'CA',expectedRevision:price.revision,firstPageMinor:price.firstPageMinor+1,additionalPageMinor:price.additionalPageMinor,reason:'Fictional unified admin acceptance'});
    const createdCampaign=await action('affiliate','campaign.add',{partnerId:partner,name:'Fictional unified campaign',country:'CA'});
    const creative=await request('/api/apps/affiliate/creative?id='+createdCampaign.id);
    assert.equal(creative.status,200);assert.equal(creative.data.data.visualCollateral.status,'WITHDRAWN');
    assert.deepEqual(creative.data.data.frames,[]);assert.deepEqual(creative.data.data.banners,[]);
    assert.equal(creative.data.data.publishing.imageUrl,null);
    observations.push({withdrawnCollateralPreserved:true,legacyPathRefusals:24});
    await action('affiliate','contact.add',{name:'Fictional support contact',email:'fictional-contact@example.test',sourceUrl:'https://example.test/consent',purpose:'partner_service',partnerId:partner});
    observations.push({nativeAdministrativeWrites:['CRP organization','Mail designation','Mail versioned price','Affiliate campaign','Affiliate contact'],fictionalOnly:true});
    // Native nonce and one-use callback run over real HTTP redirects; no provider sign-in.
    const nativeCookies={};
    for(const app of ['affiliate','mail']){
      r=await request('/api/sso/handoff/'+app,'POST',{});assert.equal(r.status,200,JSON.stringify(r.data));
      const begin=await fetch(r.data.url,{redirect:'manual'});assert.equal(begin.status,302);
      const handoffCookie=begin.headers.getSetCookie()[0].split(';')[0];
      const authorize=await fetch(begin.headers.get('location'),{headers:{cookie},redirect:'manual'});assert.equal(authorize.status,303,await authorize.clone().text());
      const callback=authorize.headers.get('location');
      const wrong=await fetch(callback,{redirect:'manual'});assert.equal(wrong.status,401);
      const finish=await fetch(callback,{headers:{cookie:handoffCookie},redirect:'manual'});assert.equal(finish.status,302,await finish.clone().text());
      nativeCookies[app]=finish.headers.getSetCookie().find(x=>x.startsWith('crp_family_'+app+'=')).split(';')[0];
      assert(finish.headers.getSetCookie().some(x=>x.startsWith((app==='affiliate'?'aff_session':'crp_mail_staff')+'=;')&&x.includes('Max-Age=0')),'An older native browser identity must not survive the SSO handoff');
      assert.equal((await fetch(callback,{headers:{cookie:handoffCookie},redirect:'manual'})).status,401);
      const target=app==='mail'?mailOrigin+'/staff/api/session':affiliateOrigin+'/api/me';
      const who=await fetch(target,{headers:{cookie:nativeCookies[app]}});assert.equal(who.status,200);
      if(app==='affiliate') {
        const identity=await who.json();assert.match(identity.familyCsrf,/^[a-f0-9]{64}$/);
        const body=JSON.stringify({partnerId:partner,name:'Fictional native browser campaign',country:'CA'});
        assert.equal((await fetch(affiliateOrigin+'/api/campaigns',{method:'POST',headers:{cookie:nativeCookies[app],origin:affiliateOrigin,'content-type':'application/json'},body})).status,401);
        const changed=await fetch(affiliateOrigin+'/api/campaigns',{method:'POST',headers:{cookie:nativeCookies[app],origin:affiliateOrigin,'content-type':'application/json','x-csrf-token':identity.familyCsrf},body});
        assert.equal(changed.status,200,await changed.clone().text());
      }
      observations.push({app,nativeHandoff:'nonce-bound, one-use, authenticated'});
    }
    clock+=61000;
    const browserIdentity=await (await fetch(affiliateOrigin+'/api/me',{headers:{cookie:nativeCookies.affiliate}})).json();
    const browserHeaders={cookie:nativeCookies.affiliate,origin:affiliateOrigin,'content-type':'application/json','x-csrf-token':browserIdentity.familyCsrf};
    assert.equal((await fetch(affiliateOrigin+'/api/campaigns',{method:'POST',headers:browserHeaders,body:JSON.stringify({partnerId:partner,name:'Fictional ordinary work without reauthentication',country:'CA'})})).status,200);
    assert.equal((await fetch(affiliateOrigin+'/api/members',{method:'POST',headers:browserHeaders,body:'{}'})).status,401);
    const stepup=await request('/api/actions/affiliate/partner.activate','POST',{id:partner,body:{termsVersion:'irrelevant-until-fresh-unlock'},requestId:randomUUID(),confirmation:'local:affiliate:partner.activate'});
    assert.equal(stepup.status,401);assert.equal(stepup.data.error.code,'FRESH_FACTOR_REQUIRED');
    observations.push({ordinaryNativeWorkReusesGlobalSignIn:true,privilegedChangeRequiresFreshGlobalFactor:true});
    // Actual PostgreSQL role revocation takes effect without restarting either service.
    await pg.pool.query("UPDATE members SET role='agent' WHERE subject='demo-owner'");
    assert.equal((await request('/api/apps/affiliate/partners')).status,401);
    await pg.pool.query("UPDATE members SET role='owner' WHERE subject='demo-owner'");
    assert.equal((await request('/api/apps/affiliate/partners')).status,200);
    // Per-person Mail operator mapping cannot retain global admin power or other orders.
    bindings.mail={...bindings.mail,role:'operator',memberId:designation.id,permissions:['fulfillment.read','fulfillment.prepare']};
    portal.config.bindings[owner.account_id].mail=bindings.mail;trust('mail',mailOrigin);
    const {paidOrder}=await native(mailRoot,'tests/helpers.mjs'),{assignOrder}=await native(mailRoot,'src/team.mjs');
    const assigned=paidOrder(db,clock,'fictional:sso:assigned').order,unassigned=paidOrder(db,clock,'fictional:sso:other').order;
    assignOrder(db,assigned.id,{memberId:designation.id},'a'.repeat(64),clock);
    const scoped=await request('/api/apps/mail/orders');assert.equal(scoped.status,200);
    assert.deepEqual(scoped.data.data.items.map(x=>x.id),[assigned.id]);
    assert.equal((await request('/api/apps/mail/order?id='+unassigned.id)).status,404);
    const forbidden=await request('/api/actions/mail/team.add','POST',{body:{name:'Forbidden operator escalation',country:'US',kind:'individual'},requestId:randomUUID(),confirmation:'local:mail:team.add'});
    assert.equal(forbidden.status,403);
    db.prepare('UPDATE fulfillment_members SET revoked_at=? WHERE id=?').run(clock,designation.id);
    assert.equal((await request('/api/apps/mail/orders')).status,403);
    observations.push({nativeAffiliateDowngradeDenied:true,nativeMailOperatorAdminEscalationDenied:true,nativeDesignationRevocationDenied:true});
    assert.equal((await request('/api/logout','POST',{})).status,200);
    for(const [app,url]of [['affiliate',affiliateOrigin+'/api/me'],['mail',mailOrigin+'/staff/api/session']])assert.equal((await fetch(url,{headers:{cookie:nativeCookies[app]}})).status,401);
    assert.equal(db.prepare('SELECT count(*) n FROM staff_sessions').get().n,0);
    for(const [app,url]of [['affiliate',affiliateOrigin+'/auth/logout'],['mail',mailOrigin+'/staff/api/logout']]) {
      const nativeOrigin=app==='affiliate'?affiliateOrigin:mailOrigin;
      assert.equal((await fetch(url,{method:'POST',headers:{cookie:nativeCookies[app],origin:'https://foreign.example.test','content-type':'application/json'},body:'{}'})).status,403);
      const out=await fetch(url,{method:'POST',headers:{cookie:nativeCookies[app],origin:nativeOrigin,'content-type':'application/json'},body:'{}'});
      assert.equal(out.status,200);assert(out.headers.getSetCookie().some(x=>x.startsWith('crp_family_'+app+'=;')&&x.includes('Max-Age=0')));
    }
    const {issueStaffTicket}=await native(mailRoot,'src/staff.mjs');
    const standalone=await fetch(mailOrigin+'/staff/api/login',{method:'POST',headers:{origin:mailOrigin,cookie:nativeCookies.mail,'content-type':'application/json'},body:JSON.stringify({code:issueStaffTicket(db,clock,'admin')})});
    assert.equal(standalone.status,200);const standaloneCsrf=(await standalone.json()).csrfToken;
    assert(standalone.headers.getSetCookie().some(x=>x.startsWith('crp_family_mail=;')&&x.includes('Max-Age=0')));
    const standaloneCookie=standalone.headers.getSetCookie().find(x=>x.startsWith('crp_mail_staff=')).split(';')[0];
    assert.equal((await fetch(mailOrigin+'/staff/api/session',{headers:{cookie:standaloneCookie}})).status,200);
    assert.equal((await fetch(mailOrigin+'/staff/api/logout',{method:'POST',headers:{cookie:standaloneCookie,origin:mailOrigin,'content-type':'application/json','x-csrf-token':standaloneCsrf},body:'{}'})).status,200);
    assert.equal(db.prepare('SELECT count(*) n FROM staff_sessions').get().n,0);
    observations.push({singlePrimaryLogin:true,nativePasswordRequestsForGlobalSignIn:0,mailTicketsRequiredForGlobalSignIn:0,standaloneCompatibilityTickets:1,globalLogoutRevokedBoth:true});
    const evidence=fileURLToPath(new URL('../.local/evidence/',import.meta.url));
    mkdirSync(evidence,{recursive:true});writeFileSync(join(evidence,'local-native-sso-'+randomUUID()+'.json'),JSON.stringify({passed:true,fictionalOnly:true,permissionsCount:permissions.length,observations},null,2));
  } finally {
    Date.now=originalNow;
    if(portal)await portal.close();if(affiliate)await affiliate.close();if(mail)await mail.close();if(db)db.close();
    if(pg)await pg.stop();if(consumer)await consumer.close();
    if(enabled===undefined)delete process.env.CRP_ADMIN_ENABLED;else process.env.CRP_ADMIN_ENABLED=enabled;
    rmSync(root,{recursive:true,force:true});
  }
});
