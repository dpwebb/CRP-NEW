'use strict';
const fs=require('node:fs'),path=require('node:path');
const {TestService}=require('../harness.cjs');
const {create}=require('../../staging-test-mail.cjs');
async function run(unused,check){
 const previous=process.env.CRP_DEPLOYMENT_ENV;process.env.CRP_DEPLOYMENT_ENV='staging';let t;
 try{
  t=await new TestService('native-staging-inbox',{nativeStagingMailbox:true,autoSignup:false}).listen();
  const make=async email=>{const r=await t.request('POST','/api/accounts',{body:{email,password:'Fictional-inbox-password-2026'}});check.equal(r.status,201,'native signup succeeds with capture-only transport');check.equal(r.json.confirmation_transport,'CAPTURED','native response labels capture rather than email delivery');return {response:r,token:/crp_session=([^;]+)/.exec(r.setCookie)[1]};};
  const first=await make('first.gap.audit@example.test'),second=await make('second.gap.audit@example.test');
  const one=await t.request('GET','/api/testing/inbox',{token:first.token});
  const two=await t.request('GET','/api/testing/inbox',{token:second.token});
  check.equal(one.status,200,'own signed-in test inbox works before signup completion');check.equal(one.json.externalDelivery,false,'test inbox never claims external delivery');
  check.equal(two.text.includes('first.gap.audit@example.test'),false,'second account cannot read the first captured message');
  check.equal((await t.request('GET','/api/testing/inbox')).status,401,'anonymous inbox request is refused');
  const code=/code is (\d{6})/.exec(one.json.items[0].text)[1];
  for(const [route,body]of [['confirm-email',{code}],['confirm-recovery-key',{recovery_key:first.response.json.recovery_key}],['finish-signup',{}]])check.equal((await t.request('POST','/api/account/'+route,{token:first.token,body})).status,200,'native confirmation and signup completion use the captured code');
  check.equal((await t.request('GET','/api/account/security',{token:first.token})).json.signup_complete,true,'capture path reaches actual completed account state');
  const directory=path.join(t.dataDir,'test-mail');
  for(const file of fs.readdirSync(directory).filter(f=>f.endsWith('.aesgcm'))){const bytes=fs.readFileSync(path.join(directory,file));check.equal(bytes.includes(Buffer.from('example.test')),false,'recipient and message are encrypted at rest');check.equal(bytes.includes(Buffer.from(code)),false,'confirmation code is not stored in plaintext');}
  let forwards=0;const staging=create(t.service.store,{environment:'staging'}),send=staging.wrap(async()=>{forwards++;});
  const file=fs.readdirSync(directory).find(f=>f.endsWith('.aesgcm'));
  const bytes=fs.readFileSync(path.join(directory,file));bytes[bytes.length-1]^=1;fs.writeFileSync(path.join(directory,file),bytes);
  // Determine the exact tampered recipient through the native per-account read.
  let tampered='first.gap.audit@example.test';try{staging.inbox({email:tampered});tampered='second.gap.audit@example.test';}catch{}
  let refusal;try{await send({to:tampered,code:'123456'});}catch(e){refusal=e;}
  check.equal(Boolean(refusal),true,'corrupt capture fails closed');check.equal(forwards,0,'capture failure never falls back to external SMTP');
  const production=create(t.service.store,{environment:'production'});let denied;try{production.inbox({email:'first.gap.audit@example.test'});}catch(e){denied=e;}
  check.equal(denied?.code,'NOT_FOUND','production cannot expose a test inbox');
  await production.wrap(async()=>{forwards++;})({to:'first.gap.audit@example.test',code:'123456'});check.equal(forwards,1,'production transport routing is unchanged by the test feature');
  let realDenied;try{staging.inbox({email:'person@example.com'});}catch(e){realDenied=e;}check.equal(realDenied?.code,'NOT_FOUND','non-test recipients never get test-inbox access');
  return {native_http:true,fictional_only:true,external_mail:0,production_inbox:false,normal_idp_verified:false};
 }finally{await t?.close();if(previous===undefined)delete process.env.CRP_DEPLOYMENT_ENV;else process.env.CRP_DEPLOYMENT_ENV=previous;}
}
module.exports={id:'gz-staging-test-mail',title:'First-class staging fictional signup inbox with encrypted own-account capture and no SMTP fallback',run};
