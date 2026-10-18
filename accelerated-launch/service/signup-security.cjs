'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {ServiceError}=require('./errors.cjs');
const accountFor=(store,actor)=>{const a=store.state().accounts.find(a=>a.account_id===actor.account_id);if(!a)throw new ServiceError('AUTHENTICATION_REQUIRED');return a;};
function key(store){
  const file=path.join(store.dataDir,'.account-security-key');
  if(!fs.existsSync(file)){
    if(store.state().accounts.some(a=>a.email_confirmation||a.two_factor_secret||a.two_factor_pending))throw new ServiceError('ACCOUNT_SECURITY_UNAVAILABLE');
    const fd=fs.openSync(file,'wx',0o600);try{fs.writeFileSync(fd,crypto.randomBytes(32));fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
  }
  if(!fs.lstatSync(file).isFile()||fs.lstatSync(file).isSymbolicLink())throw new ServiceError('ACCOUNT_SECURITY_UNAVAILABLE');
  const value=fs.readFileSync(file);if(value.length!==32)throw new ServiceError('ACCOUNT_SECURITY_UNAVAILABLE');return value;
}
function seal(store,id,secret){const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',key(store),iv);cipher.setAAD(Buffer.from(id));return {iv:iv.toString('hex'),data:Buffer.concat([cipher.update(secret,'utf8'),cipher.final()]).toString('hex'),tag:cipher.getAuthTag().toString('hex')};}
function open(store,id,value){try{const d=crypto.createDecipheriv('aes-256-gcm',key(store),Buffer.from(value.iv,'hex'));d.setAAD(Buffer.from(id));d.setAuthTag(Buffer.from(value.tag,'hex'));return Buffer.concat([d.update(Buffer.from(value.data,'hex')),d.final()]).toString('utf8');}catch{throw new ServiceError('ACCOUNT_SECURITY_UNAVAILABLE');}}
function base32(bytes){const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';let bits=0,value=0,result='';for(const byte of bytes){value=(value<<8)|byte;bits+=8;while(bits>=5){bits-=5;result+=alphabet[(value>>>bits)&31];}}if(bits)result+=alphabet[(value<<(5-bits))&31];return result;}
function decode(secret){let bits=0,value=0,bytes=[];for(const c of secret){const n='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.indexOf(c);if(n<0)throw Error('INVALID_SECRET');value=(value<<5)|n;bits+=5;if(bits>=8){bits-=8;bytes.push((value>>>bits)&255);}}return Buffer.from(bytes);}
// RFC 4226 dynamic truncation; RFC 6238 uses a 30-second moving counter.
function totp(secret,now=Date.now(),digits=6){const counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(Math.floor(now/30000)));const digest=crypto.createHmac('sha1',decode(secret)).update(counter).digest(),offset=digest.at(-1)&15;return String((digest.readUInt32BE(offset)&0x7fffffff)%10**digits).padStart(digits,'0');}
function counterFor(secret,code,now=Date.now()){if(typeof code!=='string'||!/^\d{6}$/.test(code))return null;for(const offset of [0,-1,1]){const time=now+offset*30000;if(time>=0&&crypto.timingSafeEqual(Buffer.from(totp(secret,time)),Buffer.from(code)))return Math.floor(time/30000);}return null;}
function view(store,actor){const a=accountFor(store,actor);return {recovery_key_available:Boolean(a.recovery_key_digest),signup_security_required:Boolean(a.signup_security_required),email_verified:Boolean(a.email_verified_at),recovery_key_saved:Boolean(a.recovery_key_saved_at),signup_complete:!a.signup_security_required||Boolean(a.signup_complete_at),two_factor_enabled:Boolean(a.two_factor_secret),...((a.external_identities||[]).some(i=>i.provider==='auth0_google')?{google_connected:true}:{})};}
function requireReady(store,actor){if(!view(store,actor).signup_complete)throw new ServiceError('SIGNUP_SECURITY_REQUIRED');}
function emailDigest(store,id,nonce,code){return crypto.createHmac('sha256',key(store)).update(id+'\n'+nonce+'\n'+code).digest('hex');}
async function sendConfirmation(store,actor,mailer){
  const account=accountFor(store,actor);if(account.email_verified_at)return {confirmation_sent:false,already_verified:true};
  if(account.last_email_send_attempt_at&&Date.now()-Date.parse(account.last_email_send_attempt_at)<60000)throw new ServiceError('EMAIL_CONFIRMATION_WAIT');
  const code=String(crypto.randomInt(0,1000000)).padStart(6,'0'),nonce=crypto.randomBytes(16).toString('hex'),digest=emailDigest(store,actor.account_id,nonce,code);
  store.update(s=>{const a=s.accounts.find(a=>a.account_id===actor.account_id);a.last_email_send_attempt_at=new Date().toISOString();a.email_confirmation={digest,nonce,expires_at:new Date(Date.now()+30*60000).toISOString(),sent_at:new Date().toISOString(),failed_attempts:0};return true;});
  try{await mailer({to:account.email,code,from:'support@creditregulatorpro.com'});}catch{
    store.update(s=>{const a=s.accounts.find(a=>a.account_id===actor.account_id);if(a?.email_confirmation?.nonce===nonce)delete a.email_confirmation;return true;});
    throw new ServiceError('CONFIRMATION_EMAIL_UNAVAILABLE');
  }
  return {confirmation_sent:true};
}
function confirmEmail(store,actor,input){
  const code=input?.code;let refusal;
  store.update(s=>{const a=s.accounts.find(a=>a.account_id===actor.account_id),pending=a.email_confirmation;
    if(a.email_verified_at)return true;
    if(!pending||Date.parse(pending.expires_at)<=Date.now()){refusal='EMAIL_CONFIRMATION_EXPIRED';return false;}
    if(pending.failed_attempts>=5){refusal='EMAIL_CONFIRMATION_LOCKED';return false;}
    const valid=typeof code==='string'&&/^\d{6}$/.test(code)&&crypto.timingSafeEqual(Buffer.from(emailDigest(store,a.account_id,pending.nonce,code),'hex'),Buffer.from(pending.digest,'hex'));
    if(!valid){pending.failed_attempts++;refusal='EMAIL_CONFIRMATION_INVALID';return false;}
    a.email_verified_at=new Date().toISOString();delete a.email_confirmation;return true;
  });if(refusal)throw new ServiceError(refusal);return view(store,actor);
}
function confirmRecovery(store,actor,input){const a=accountFor(store,actor),code=input?.recovery_key;const expected=typeof code==='string'?crypto.createHash('sha256').update('crp-recovery-v1:'+code).digest('hex'):'';if(expected.length!==64||a.recovery_key_digest?.length!==64||!crypto.timingSafeEqual(Buffer.from(expected,'hex'),Buffer.from(a.recovery_key_digest||'','hex')))throw new ServiceError('INVALID_RECOVERY_KEY');store.update(s=>{s.accounts.find(a=>a.account_id===actor.account_id).recovery_key_saved_at=new Date().toISOString();return true;});return view(store,actor);}
function reauthenticate(store,actor,password){const a=accountFor(store,actor),outcome=store.update(s=>require('./accounts.cjs').checkCredentials(s,a.email,password));if(outcome.refuse)throw new ServiceError(outcome.refuse);return outcome.account;}
function beginTwoFactor(store,actor,input){const a=reauthenticate(store,actor,input?.password);if(a.two_factor_secret)throw new ServiceError('TWO_FACTOR_ALREADY_ENABLED');const secret=base32(crypto.randomBytes(20)),encrypted=seal(store,a.account_id,secret);store.update(s=>{s.accounts.find(a=>a.account_id===actor.account_id).two_factor_pending={secret:encrypted,expires_at:new Date(Date.now()+10*60000).toISOString(),failed_attempts:0};return true;});return {secret,otpauth_uri:'otpauth://totp/'+encodeURIComponent('Credit Regulator Pro:'+a.email)+'?secret='+secret+'&issuer=Credit%20Regulator%20Pro&algorithm=SHA1&digits=6&period=30'};}
function confirmTwoFactor(store,actor,input){let refusal;store.update(s=>{const a=s.accounts.find(a=>a.account_id===actor.account_id),p=a.two_factor_pending;if(!p||Date.parse(p.expires_at)<=Date.now()||p.failed_attempts>=5){refusal='TWO_FACTOR_SETUP_EXPIRED';return false;}const counter=counterFor(open(store,a.account_id,p.secret),input?.code);if(counter===null){p.failed_attempts++;refusal='TWO_FACTOR_INVALID';return false;}a.two_factor_secret=p.secret;a.two_factor_last_counter=counter;delete a.two_factor_pending;return true;});if(refusal)throw new ServiceError(refusal);return view(store,actor);}
function verifySignIn(store,account,code){if(!account.two_factor_secret)return true;const now=Date.now();if(Date.parse(account.two_factor_locked_until||'')>now)return false;const counter=counterFor(open(store,account.account_id,account.two_factor_secret),code);if(counter===null||counter<=(account.two_factor_last_counter??-1)){account.two_factor_failed_attempts=(account.two_factor_failed_attempts||0)+1;if(account.two_factor_failed_attempts>=5){account.two_factor_locked_until=new Date(now+15*60000).toISOString();account.two_factor_failed_attempts=0;}return false;}account.two_factor_last_counter=counter;account.two_factor_failed_attempts=0;account.two_factor_locked_until=null;return true;}
function disableTwoFactor(store,actor,input){reauthenticate(store,actor,input?.password);let valid=false;store.update(s=>{const a=s.accounts.find(a=>a.account_id===actor.account_id);valid=verifySignIn(store,a,input?.code);if(valid){delete a.two_factor_secret;delete a.two_factor_pending;delete a.two_factor_last_counter;}return valid;});if(!valid)throw new ServiceError('TWO_FACTOR_INVALID');return view(store,actor);}
function finish(store,actor,input){const current=view(store,actor);if(!current.email_verified||!current.recovery_key_saved)throw new ServiceError('SIGNUP_SECURITY_REQUIRED');if(input?.enable_two_factor===true&&!current.two_factor_enabled)throw new ServiceError('TWO_FACTOR_INVALID');store.update(s=>{const a=s.accounts.find(a=>a.account_id===actor.account_id);a.signup_complete_at=new Date().toISOString();delete a.two_factor_pending;return true;});return view(store,actor);}
module.exports={view,requireReady,sendConfirmation,confirmEmail,confirmRecovery,beginTwoFactor,confirmTwoFactor,disableTwoFactor,finish,verifySignIn,totp,base32};
