'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {TestService}=require('../harness.cjs');
const accounts=require('../../accounts.cjs'),security=require('../../signup-security.cjs');
const reset=require('../../password-reset.cjs'),mail=require('../../confirmation-mail.cjs');
const password='a-long-enough-password',replacement='a-new-long-enough-password';
const REQUEST='/api/account/password-reset/request',COMPLETE='/api/account/password-reset/complete';
const tokenFor=m=>new URL(m.url).hash.slice('#reset-password='.length);
const row=(t,id)=>t.service.store.state().accounts.find(a=>a.account_id===id);
async function request(t,email,extra={}){const r=await t.request('POST',REQUEST,{body:{email,...extra}});await t.service.passwordReset.drain();return r;}
const complete=(t,token,value=replacement)=>t.request('POST',COMPLETE,{body:{token,password:value}});
const resetMail=(t,email)=>t.resetMessages.findLast(m=>m.to===email&&m.kind==='password-reset');
const head=t=>fs.readFileSync(path.join(t.dataDir,'admin','.head'),'utf8');
async function run(t,check){
  const actor=await t.unpaidAccount('email-reset@example.test'),other=await t.unpaidAccount('reset-other@example.test');
  const original=structuredClone(row(t,actor.account_id));
  const absent=await request(t,'nobody@example.test'),malformed=await request(t,'bad\r\nBcc: attacker@example.test');
  check.deepEqual(absent.json,{ok:true,reset_requested:true,message:reset.REQUEST_MESSAGE},'unknown email receives generic confirmation');
  check.deepEqual(malformed.json,absent.json,'malformed email does not disclose account information');
  check.equal(t.resetMessages.length,0,'unknown and malformed addresses send no message');
  const known=await request(t,' EMAIL-RESET@example.test ',{url:'https://attacker.test',contact_email:other.email});
  check.equal(known.status,absent.status,'known and unknown request status matches');
  check.deepEqual(known.json,absent.json,'known and unknown request body matches');
  check.match(known.headers.get('cache-control'),/no-store/,'reset responses are never cached');
  check.equal(known.headers.get('referrer-policy'),'no-referrer','reset responses prevent referrer leakage');
  const firstMessage=resetMail(t,actor.email),first=tokenFor(firstMessage);
  check.equal(firstMessage.to,actor.email,'only canonical login email receives the reset');
  check.equal(new URL(firstMessage.url).origin,t.base,'untrusted redirects cannot change link origin');
  check.match(first,/^[A-Za-z0-9_-]{43}$/,'email token contains 256 random bits');
  check.equal(row(t,actor.account_id).password_reset.digest,accounts.tokenDigest('crp-email-password-reset-v1:'+first),'only domain-separated digest is persisted');
  check.ok(!JSON.stringify(t.service.store.state()).includes(first),'raw token is absent from state');
  check.equal(row(t,actor.account_id).password_hash,original.password_hash,'request does not change credentials');
  check.equal((await t.request('GET','/api/session',{token:actor.token})).status,200,'request does not revoke sessions');
  const count=t.resetMessages.length;
  check.deepEqual((await request(t,actor.email)).json,absent.json,'cooldown has same generic response');
  check.equal(t.resetMessages.length,count,'persisted cooldown prevents flooding');
  check.equal((await t.request('GET','/index.html#reset-password='+first)).status,200,'link preview only serves static content');
  check.equal((await t.request('GET',COMPLETE)).status,404,'GET cannot reset credentials');
  check.equal((await complete(t,first,'short')).json.error.code,'INVALID_ACCOUNT_DETAILS','password minimum is preserved');
  check.equal((await complete(t,first,'x'.repeat(1025))).status,400,'oversized password is rejected');
  check.equal((await complete(t,'<invalid>')).json.error.code,'INVALID_PASSWORD_RESET','malformed reset token is refused');
  check.ok(Boolean(row(t,actor.account_id).password_reset),'invalid password does not consume valid link');
  t.service.store.update(s=>{s.accounts.find(a=>a.account_id===actor.account_id).password_reset_last_sent_at=new Date(Date.now()-61000).toISOString();return true;});
  await request(t,actor.email);const fresh=tokenFor(resetMail(t,actor.email));
  check.notEqual(fresh,first,'later allowed request generates fresh token');
  check.equal((await complete(t,first)).status,400,'superseded link is invalid');
  const results=await Promise.all([complete(t,fresh),complete(t,fresh)]);
  check.deepEqual(results.map(r=>r.status).sort(),[200,400],'concurrent submissions have exactly one winner');
  const success=results.find(r=>r.status===200);
  check.deepEqual(success.json,{ok:true,password_reset:true},'success neither signs in nor reveals keys');
  check.match(success.setCookie,/crp_session=;.*Max-Age=0/,'consumer cookie is cleared');
  check.match(success.setCookie,/crp_admin_session=;.*Max-Age=0/,'admin unlock cookie is cleared');
  check.equal((await t.request('GET','/api/session',{token:actor.token})).status,401,'target sessions are revoked');
  check.equal((await t.request('GET','/api/session',{token:other.token})).status,200,'other account sessions remain valid');
  for(const field of ['recovery_key_digest','recovery_key_saved_at','signup_complete_at','email_verified_at'])check.equal(row(t,actor.account_id)[field],original[field],'email reset preserves '+field);
  check.equal(row(t,actor.account_id).password_reset,undefined,'successful reset consumes token');
  check.equal((await t.request('POST','/api/sessions',{body:{email:actor.email,password}})).status,401,'old password no longer signs in');
  check.equal((await t.request('POST','/api/sessions',{body:{email:actor.email,password:replacement}})).status,200,'new password uses ordinary sign-in');
  await t.service.passwordReset.drain();
  check.equal(t.resetMessages.filter(m=>m.kind==='password-reset-complete').length,1,'one completion notification is captured');
  check.ok(!JSON.stringify(t.resetMessages.at(-1)).includes(replacement),'notification has no password');
  check.ok(!JSON.stringify(t.service.store.state()).includes(replacement)&&!t.logText().includes(first)&&!t.logText().includes(fresh),'state and logs contain no raw reset credentials');

  for(const expiry of [new Date(Date.now()-1).toISOString(),'invalid',null]){
    const user=await t.unpaidAccount('expiry-'+crypto.randomBytes(4).toString('hex')+'@example.test');await request(t,user.email);const token=tokenFor(resetMail(t,user.email));
    t.service.store.update(s=>{s.accounts.find(a=>a.account_id===user.account_id).password_reset.expires_at=expiry;return true;});
    check.equal((await complete(t,token)).json.error.code,'INVALID_PASSWORD_RESET','expired/malformed deadline fails closed: '+expiry);
  }
  const keyUser=await t.request('POST','/api/accounts',{body:{email:'saved-key@example.test',password}});
  await request(t,'saved-key@example.test');const abandoned=tokenFor(resetMail(t,'saved-key@example.test'));
  check.equal((await t.request('POST','/api/account/recover',{body:{email:'saved-key@example.test',recovery_key:keyUser.json.recovery_key,password:replacement}})).status,200,'existing recovery-key path remains usable');
  check.equal((await complete(t,abandoned)).status,400,'key-based recovery invalidates email token');
  const keyRotate=await t.unpaidAccount('key-rotate@example.test');await request(t,keyRotate.email);const rotateToken=tokenFor(resetMail(t,keyRotate.email));
  check.equal((await t.request('POST','/api/account/recovery-key',{token:keyRotate.token,body:{password}})).status,200,'current-password key rotation remains usable');
  check.equal((await complete(t,rotateToken)).status,400,'key rotation invalidates outstanding email token');

  // A read-only precheck prevents full durable-store rewrites for public failures.
  let writes=0;const update=t.service.store.update.bind(t.service.store);t.service.store.update=fn=>{writes++;return update(fn);};
  try{await request(t,'no-write@example.test');await request(t,actor.email);await complete(t,crypto.randomBytes(32).toString('base64url'));check.equal(writes,0,'unknown/cooldown/invalid requests do not rewrite full private state');}
  finally{t.service.store.update=update;}

  const enabled=process.env.CRP_ADMIN_ENABLED;process.env.CRP_ADMIN_ENABLED='1';
  const admin=new TestService('email-reset-mfa');await admin.listen();
  try{
    const owner=await admin.unpaidAccount('reset-owner@example.test');let seed;const clock=Date.now,past=clock()-180000;
    try{Date.now=()=>past;seed=security.beginTwoFactor(admin.service.store,owner,{password}).secret;security.confirmTwoFactor(admin.service.store,owner,{code:security.totp(seed)});require('../../admin-access.cjs').bootstrapOwner(admin.service.adminStore,{account_id:owner.account_id,code:security.totp(seed,past+30000)});}finally{Date.now=clock;}
    const unlock=await admin.request('POST','/api/admin/unlock',{token:owner.token,body:{code:security.totp(seed)}});
    check.equal(unlock.status,200,'fixture owner unlocks administration with fresh MFA');const cookie=unlock.setCookie?.split(';')[0];
    admin.service.store.update(s=>{const a=s.accounts.find(a=>a.account_id===owner.account_id);a.two_factor_failed_attempts=2;a.two_factor_locked_until=new Date(Date.now()+900000).toISOString();a.two_factor_pending={secret:'stale-enrollment'};a.locked_until=new Date(Date.now()+900000).toISOString();return true;});
    const before=structuredClone(row(admin,owner.account_id)),journal=head(admin);
    await request(admin,owner.email);const token=tokenFor(resetMail(admin,owner.email));
    check.equal((await complete(admin,token)).status,200,'email reset changes password without disabling MFA');const after=row(admin,owner.account_id);
    for(const field of ['two_factor_secret','two_factor_last_counter','two_factor_failed_attempts','two_factor_locked_until','recovery_key_digest'])check.deepEqual(after[field],before[field],'email reset preserves '+field);
    check.equal(after.two_factor_pending,undefined,'pending MFA enrollment authorized with old password is cleared');
    check.equal(after.locked_until,null,'password lockout is cleared independently of MFA');
    check.equal((await admin.request('POST','/api/sessions',{body:{email:owner.email,password:replacement}})).json.error.code,'TWO_FACTOR_REQUIRED','new password alone cannot bypass MFA');
    check.equal((await admin.request('GET','/api/admin/session',{token:owner.token,headers:{Cookie:cookie,Origin:admin.base}})).status,401,'revoked consumer session invalidates old admin unlock');
    check.equal(head(admin),journal,'email reset preserves signed administration authority');
    admin.service.store.update(s=>{s.accounts.find(a=>a.account_id===owner.account_id).two_factor_locked_until=null;return true;});
    const now=Date.now;try{const future=now()+60000;Date.now=()=>future;const login=await admin.request('POST','/api/sessions',{body:{email:owner.email,password:replacement,code:security.totp(seed)}});check.equal(login.status,200,'new password plus unchanged authenticator restores ordinary access');check.equal(login.json.next_path,'/admin','owner routing is preserved after email password reset');}finally{Date.now=now;}
  }finally{await admin.close();if(enabled===undefined)delete process.env.CRP_ADMIN_ENABLED;else process.env.CRP_ADMIN_ENABLED=enabled;}

  let release;const gate=new Promise(resolve=>{release=resolve;});let delivered=false;
  const slow=new TestService('reset-mail-failure',{passwordResetMailer:async m=>{if(m.kind==='password-reset'){await gate;delivered=true;throw Error('private fictional mail failure');}}});await slow.listen();
  try{const user=await slow.unpaidAccount('slow@example.test');const response=await slow.request('POST',REQUEST,{body:{email:user.email}});
    check.deepEqual(response.json,absent.json,'slow SMTP does not delay generic HTTP response');check.equal(delivered,false,'HTTP responds before delivery finishes');
    await new Promise(resolve=>setImmediate(resolve));const token=tokenFor(resetMail(slow,user.email));release();await slow.service.passwordReset.drain();
    check.equal(row(slow,user.account_id).password_reset,undefined,'failed delivery removes undelivered token');check.equal((await complete(slow,token)).status,400,'undelivered link is unusable');check.ok(!slow.logText().includes('private fictional')&&!slow.logText().includes(token),'mail failure details and token stay out of logs');
  }finally{release();await slow.close();}
  // A delayed failure belongs only to its own reservation; it cannot erase a
  // newer link issued while the old SMTP delivery is in flight.
  let failOld;const oldGate=new Promise((_,reject)=>{failOld=()=>reject(Error('old delivery failed'));});let sends=0;
  const race=new TestService('reset-mail-race',{passwordResetMailer:async m=>{if(m.kind==='password-reset'&&++sends===1)await oldGate;}});await race.listen();
  try{const user=await race.unpaidAccount('mail-race@example.test');await race.request('POST',REQUEST,{body:{email:user.email}});await new Promise(resolve=>setImmediate(resolve));
    race.service.store.update(s=>{s.accounts.find(a=>a.account_id===user.account_id).password_reset_last_sent_at=new Date(Date.now()-61000).toISOString();return true;});
    await race.request('POST',REQUEST,{body:{email:user.email}});await new Promise(resolve=>setImmediate(resolve));const latest=tokenFor(resetMail(race,user.email));
    failOld();await race.service.passwordReset.drain();check.equal((await complete(race,latest)).status,200,'late failed delivery cannot delete a newer valid link');
  }finally{failOld();await race.close();}
  const notify=new TestService('reset-notify-failure',{passwordResetMailer:async m=>{if(m.kind==='password-reset-complete')throw Error('notification failed');}});await notify.listen();
  try{const user=await notify.unpaidAccount('notify@example.test');await request(notify,user.email);check.equal((await complete(notify,tokenFor(resetMail(notify,user.email)))).status,200,'notification failure cannot reverse successful reset');await notify.service.passwordReset.drain();check.equal((await notify.request('POST','/api/sessions',{body:{email:user.email,password:replacement}})).status,200,'new password remains valid after notification failure');}finally{await notify.close();}
  for(let i=0;i<8;i++)await request(t,'limited-reset@example.test');check.equal((await request(t,'limited-reset@example.test')).status,429,'request rate limit applies even to unknown emails');
  for(const route of [REQUEST,COMPLETE]){const limiter=require('../../request-policy.cjs').policy({limit:1}),req={method:'POST',url:route,headers:{},socket:{remoteAddress:'203.0.113.4'}};limiter(req);let code;try{limiter(req);}catch(e){code=e.code;}check.equal(code,'TOO_MANY_FAILED_SIGN_INS','trusted requester limiter covers '+route);}
  check.equal(reset.resetOrigin('https://attacker.test',{CRP_DEPLOYMENT_ENV:'production'}),'https://creditregulatorpro.com','production canonical origin ignores injected origin');
  check.equal(reset.resetOrigin('https://attacker.test',{CRP_DEPLOYMENT_ENV:'staging'}),'https://staging.creditregulatorpro.com','staging canonical origin ignores injected origin');
  for(const bad of ['https://attacker.test','http://127.0.0.1/path','http://user@localhost','http://localhost/?next=evil']){let refused=false;try{reset.resetOrigin(bad,{});}catch{refused=true;}check.equal(refused,true,'local configuration rejects '+bad);}
  const body=mail.messageBody(firstMessage);check.ok(body.includes(firstMessage.url)&&body.includes('expires in 30 minutes')&&body.includes('authenticator stays on'),'reset email has usable link, expiry and MFA guidance');
  check.match(mail.messageBody({to:actor.email,code:'123456'}),/confirmation code is 123456/,'signup email template remains supported');
  check.ok(mail.messageBody({to:actor.email,kind:'password-reset-complete'}).includes('saved recovery key still works'),'notification explains preserved saved key');
  for(const bad of [{...firstMessage,to:'victim@example.test\r\nBcc: attacker@example.test'},{...firstMessage,url:'https://attacker.test/index.html#reset-password='+first},{...firstMessage,url:t.base+'/index.html?leak='+first+'#reset-password='+first}]){let refused=false;try{mail.messageBody(bad);}catch{refused=true;}check.equal(refused,true,'mail template rejects address/link injection');}
  // Exercise the actual SMTP parser/commands with an injected transport, without
  // connecting to a provider. The server accepts DATA then disconnects on QUIT.
  const {EventEmitter}=require('node:events'),vm=require('node:vm');
  let transcript=[],socket;
  const fakeTls={connect(){socket=new EventEmitter();let step=0;socket.setTimeout=()=>{};socket.destroy=()=>{};socket.write=line=>{transcript.push(line);const codes=[250,334,334,235,250,250,354,250];const status=codes[step++];setImmediate(()=>{if(status)socket.emit('data',Buffer.from(status+' accepted\r\n'));else socket.emit('close');});};setImmediate(()=>socket.emit('data',Buffer.from('220 ready\r\n')));return socket;}};
  const sandbox={module:{exports:{}},require:name=>name==='node:tls'?fakeTls:require(name),Buffer,URL,process};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../../confirmation-mail.cjs'),'utf8'),sandbox);
  const accepted=await sandbox.module.exports.smtp({SMTP_USER:'fixture-user',SMTP_PASSWORD:'fixture-password'},firstMessage);
  check.equal(accepted.accepted,true,'DATA acceptance survives disconnect on QUIT');
  check.ok(transcript.some(line=>line.includes(firstMessage.url)),'SMTP DATA contains actual reset link');
  check.equal(transcript.at(-1),'QUIT\r\n','SMTP parser attempted normal connection shutdown');
  return {local_http:true,captured_email_only:true,one_use_expiring_links:true,mfa_and_admin_preserved:true,recovery_key_preserved:true};
}
module.exports={id:'gf-email-password-reset',title:'Email password reset, private delivery, one-use expiry and preserved MFA/key/admin security',run};
