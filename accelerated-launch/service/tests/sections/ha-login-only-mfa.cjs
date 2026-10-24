'use strict';
const {TestService}=require('../harness.cjs');
const accounts=require('../../accounts.cjs'),security=require('../../signup-security.cjs'),access=require('../../admin-access.cjs');
async function run(unused,check){
 const previous=process.env.CRP_ADMIN_ENABLED;process.env.CRP_ADMIN_ENABLED='1';let t;
 const password='a-long-enough-password';
 try{
  t=await new TestService('login-only-mfa').listen();const owner=await t.unpaidAccount('login-only-owner@example.test');
  const at=Date.now()-180000,realNow=Date.now;let setup;
  try{Date.now=()=>at;setup=security.beginTwoFactor(t.service.store,owner,{password});security.confirmTwoFactor(t.service.store,owner,{code:security.totp(setup.secret)});access.bootstrapOwner(t.service.adminStore,{account_id:owner.account_id,code:security.totp(setup.secret,at+30000)});}finally{Date.now=realNow;}
  check.equal((await t.request('POST','/api/admin/unlock',{token:owner.token,body:{}})).status,401,'pre-enrollment session cannot claim a login factor');
  check.equal((await t.request('POST','/api/sessions',{body:{email:owner.email,password}})).status,401,'login still requires the enrolled factor');
  const login=await t.request('POST','/api/sessions',{body:{email:owner.email,password,code:security.totp(setup.secret)}});
  check.equal(login.status,200,'password plus one valid factor signs in');
  const token=/crp_session=([^;]+)/.exec(login.setCookie)[1];
  check.ok(accounts.loginMfaVerified(t.service.store,owner,token),'only the actual login session carries server-recorded factor proof');
  check.equal(accounts.loginMfaVerified(t.service.store,owner,owner.token),false,'factor proof does not transfer to an earlier session');
  check.equal(accounts.loginMfaVerified(t.service.store,{account_id:'other'},token),false,'factor proof cannot transfer to another actor');
  const unlock=await t.request('POST','/api/admin/unlock',{token,body:{}});
  check.equal(unlock.status,200,'administration opens from the same MFA login without another code');
  check.equal('admin_token' in unlock.json,false,'administrative bearer proof stays out of response JSON');
  const admin=/crp_admin_session=([^;]+)/.exec(unlock.setCookie)[1];
  check.equal((await t.request('GET','/api/admin/session',{token,headers:{'x-crp-admin-session':admin}})).status,200,'native role and active administrative session still authorize reads');
  check.equal((await t.request('POST','/api/account/recovery-key',{token:owner.token,body:{password,loginVerified:true}})).status,401,'browser cannot supply a trusted MFA flag');
  check.equal((await t.request('POST','/api/account/recovery-key',{token,body:{password}})).status,200,'security action uses password and verified login without an action code');
  check.equal((await t.request('POST','/api/account/2fa/disable',{token,body:{password}})).status,200,'turning off MFA uses the current password and login proof');
  check.equal(accounts.loginMfaVerified(t.service.store,owner,token),false,'removing the enrolled secret invalidates its login proof');
  check.equal((await t.request('GET','/api/admin/session',{token,headers:{'x-crp-admin-session':admin}})).status,403,'removing MFA still revokes administrative eligibility');
  await t.request('DELETE','/api/sessions/current',{token});
  check.equal((await t.request('POST','/api/admin/unlock',{token,body:{}})).status,401,'signed-out session cannot reopen administration');
  return {loginOnly:true,fictionalOnly:true,providerCalls:0};
 }finally{await t?.close();if(previous===undefined)delete process.env.CRP_ADMIN_ENABLED;else process.env.CRP_ADMIN_ENABLED=previous;}
}
module.exports={id:'ha-login-only-mfa',title:'One login factor with session-bound proof, current native roles and security revocation',run};
