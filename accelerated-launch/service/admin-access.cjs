'use strict';
const crypto=require('node:crypto'),accounts=require('./accounts.cjs'),security=require('./signup-security.cjs');
const PERMISSIONS=Object.freeze(['overview.read','accounts.read','cases.read','billing.read','affiliate.read','affiliate.manage','fulfillment.read','fulfillment.prepare','fulfillment.grants','audit.read','team.manage','organizations.manage']);
const OWNER_ONLY=new Set(['team.manage','organizations.manage']);
const PARTNER_ALLOWED=new Set(['overview.read','affiliate.read','fulfillment.read','fulfillment.prepare']);
const actors=new WeakMap();const UNLOCK_MS=15*60000;
class AdminError extends Error{constructor(code,status=403){super(({TWO_FACTOR_REQUIRED:'Enter a fresh authenticator code to unlock administration.',TWO_FACTOR_INVALID:'That authenticator code did not match. Use the next current code.',ADMIN_SECURITY_REQUIRED:'Complete email verification, account setup and two-factor authentication before using administration.',ADMIN_LAST_OWNER:'Keep at least one active owner.',ADMIN_STATE_UNAVAILABLE:'Administration is temporarily unavailable.'})[code]||'That administration action is unavailable.');this.code=code;this.status=status;}}
const fail=(code,status)=>{throw new AdminError(code,status);};
const id=prefix=>prefix+'_'+crypto.randomBytes(12).toString('hex');
const digest=value=>crypto.createHash('sha256').update(value).digest('hex');
const mfaFingerprint=account=>digest(JSON.stringify(account.two_factor_secret));
const isEligible=a=>Boolean(a&&Number.isFinite(Date.parse(a.email_verified_at))&&Number.isFinite(Date.parse(a.signup_complete_at))&&a.two_factor_secret);
function accountSession(store,actor,token){
  if(!store.consumerStore||typeof token!=='string'||!token)fail('AUTHENTICATION_REQUIRED',401);
  const state=store.consumerStore.state(),session=state.sessions.find(r=>r.token_sha256===accounts.tokenDigest(token));
  if(!session||session.account_id!==actor?.account_id||accounts.sessionExpired(session,Date.now()))fail('AUTHENTICATION_REQUIRED',401);
  const account=state.accounts.find(r=>r.account_id===session.account_id);
  if(!account)fail('AUTHENTICATION_REQUIRED',401);
  if(!isEligible(account))fail('ADMIN_SECURITY_REQUIRED',403);
  return {account,session};
}
function memberFor(store,accountId){const state=store.state(),members=state.memberships.filter(r=>r.account_id===accountId&&r.status==='ACTIVE'),member=members[0];if(members.length!==1||!['owner','staff','partner'].includes(member.role)||!Number.isInteger(member.revision)||member.revision<1||!Array.isArray(member.permissions)||new Set(member.permissions).size!==member.permissions.length||member.permissions.some(p=>!PERMISSIONS.includes(p)))fail('NOT_AUTHORIZED',403);if(member.role==='staff'&&member.permissions.some(p=>OWNER_ONLY.has(p))||member.role==='partner'&&(member.permissions.some(p=>!PARTNER_ALLOWED.has(p))||!state.organizations.some(r=>r.org_id===member.org_id&&r.status==='ACTIVE')))fail('NOT_AUTHORIZED',403);return member;}
// A navigation hint only: never consumes MFA or creates an administrative unlock.
// Optional administration must not prevent an otherwise valid consumer sign-in.
function ownerSignInPath(store,actor,consumerSessionToken){
  try{const {account}=accountSession(store,actor,consumerSessionToken);return memberFor(store,account.account_id).role==='owner'?'/admin':null;}
  catch{return null;}
}
function unlock(store,actor,consumerSessionToken,input){
  const {account,session}=accountSession(store,actor,consumerSessionToken),member=memberFor(store,account.account_id);
  if(!input?.code)fail('TWO_FACTOR_REQUIRED',401);
  const valid=store.consumerStore.update(state=>{const row=state.accounts.find(r=>r.account_id===account.account_id);return security.verifySignIn(store.consumerStore,row,input.code);});
  if(!valid){store.audit(member,'ADMIN_UNLOCK_DENIED',{reason:'TWO_FACTOR_INVALID'});fail('TWO_FACTOR_INVALID',401);}
  const token=crypto.randomBytes(32).toString('base64url'),expires=new Date(Date.now()+UNLOCK_MS).toISOString();
  store.update(state=>{for(const row of state.unlocks)if(row.session_id===session.session_id&&!row.revoked_at)row.revoked_at=new Date().toISOString();state.unlocks.push({unlock_id:id('adm_unlock'),token_sha256:digest(token),admin_id:member.admin_id,account_id:account.account_id,session_id:session.session_id,revision:member.revision,mfa_sha256:mfaFingerprint(account),expires_at:expires,revoked_at:null});store.appendAudit(state,member,'ADMIN_UNLOCKED',{});});
  return {admin_token:token,expires_at:expires};
}
function principal(store,actor,consumerSessionToken,adminToken){
  const {account,session}=accountSession(store,actor,consumerSessionToken),member=memberFor(store,account.account_id);
  if(typeof adminToken!=='string'||!adminToken)fail('TWO_FACTOR_REQUIRED',401);
  const row=store.state().unlocks.find(r=>r.token_sha256===digest(adminToken));
  if(!row||row.revoked_at||row.session_id!==session.session_id||row.account_id!==account.account_id||row.admin_id!==member.admin_id||row.revision!==member.revision||row.mfa_sha256!==mfaFingerprint(account)||!Number.isFinite(Date.parse(row.expires_at))||Date.parse(row.expires_at)<=Date.now())fail('TWO_FACTOR_REQUIRED',401);
  const result=Object.freeze({admin_id:member.admin_id,account_id:account.account_id,email:account.email,role:member.role,permissions:Object.freeze([...member.permissions]),org_id:member.org_id||null,expires_at:row.expires_at});
  actors.set(result,{store,actor:{account_id:account.account_id},consumerSessionToken,adminToken});return result;
}
function requireCapability(store,actor,permission,scope={}){
  const context=actors.get(actor);if(!context||context.store!==store||!PERMISSIONS.includes(permission))fail('NOT_AUTHORIZED',403);
  const current=principal(store,context.actor,context.consumerSessionToken,context.adminToken);
  if(!current.permissions.includes(permission)||OWNER_ONLY.has(permission)&&current.role!=='owner')fail('NOT_AUTHORIZED',403);
  if(current.role==='partner'){
    if(!scope.org_id||scope.org_id!==current.org_id)fail('NOT_AUTHORIZED',403);
    if(scope.account_id||scope.case_id){const now=Date.now();if(!store.state().grants.some(g=>g.status==='ACTIVE'&&!g.revoked_at&&g.org_id===current.org_id&&(!scope.account_id||g.account_id===scope.account_id)&&(!scope.case_id||g.case_id===scope.case_id)&&(!g.expires_at||Date.parse(g.expires_at)>now)))fail('NOT_AUTHORIZED',403);}
  }
  return current;
}
function lock(store,actor,consumerSessionToken,adminToken){
  if(typeof adminToken!=='string'||!adminToken)return {locked:true};
  const state=store.consumerStore.state(),session=state.sessions.find(r=>r.token_sha256===accounts.tokenDigest(consumerSessionToken||''));
  if(!session||session.account_id!==actor?.account_id)fail('AUTHENTICATION_REQUIRED',401);
  store.update(state=>{const row=state.unlocks.find(r=>r.token_sha256===digest(adminToken));if(row&&row.session_id===session.session_id&&row.account_id===actor.account_id){row.revoked_at=new Date().toISOString();store.appendAudit(state,actor,'ADMIN_LOCKED',{});}});return {locked:true};
}
function fields(store,input,previous=null){
  const role=String(input.role??previous?.role??'').toLowerCase();if(!['owner','staff','partner'].includes(role))fail('INVALID_REQUEST',400);
  const requested=input.permissions??previous?.permissions??[];
  if(!Array.isArray(requested)||new Set(requested).size!==requested.length||requested.some(p=>!PERMISSIONS.includes(p)))fail('INVALID_REQUEST',400);
  const permissions=role==='owner'?[...PERMISSIONS]:requested;
  if(role==='staff'&&permissions.some(p=>OWNER_ONLY.has(p))||role==='partner'&&permissions.some(p=>!PARTNER_ALLOWED.has(p)))fail('INVALID_REQUEST',400);
  const org_id=role==='partner'?(input.org_id??previous?.org_id):null;
  if(role==='partner'&&(!org_id||!store.state().organizations.some(o=>o.org_id===org_id&&o.status==='ACTIVE')))fail('INVALID_REQUEST',400);
  const status=input.status??previous?.status??'ACTIVE';if(!['ACTIVE','DISABLED'].includes(status))fail('INVALID_REQUEST',400);
  return {role,permissions,org_id,status};
}
function eligibleAccount(store,accountId){const a=store.consumerStore.state().accounts.find(r=>r.account_id===accountId);if(!isEligible(a))fail('ADMIN_SECURITY_REQUIRED',403);return a;}
function hasOtherEligibleOwner(store,state,adminId){const eligible=new Set(store.consumerStore.state().accounts.filter(isEligible).map(a=>a.account_id));return state.memberships.some(r=>r.admin_id!==adminId&&r.role==='owner'&&r.status==='ACTIVE'&&eligible.has(r.account_id));}
function bootstrapOwner(store,{account_id,code}){
  const before=store.state();if(before.bootstrapped_at||before.memberships.length)fail('NOT_AUTHORIZED',403);
  const account=eligibleAccount(store,account_id);if(!code)fail('TWO_FACTOR_REQUIRED',401);
  if(!store.consumerStore.update(state=>security.verifySignIn(store.consumerStore,state.accounts.find(r=>r.account_id===account.account_id),code)))fail('TWO_FACTOR_INVALID',401);
  return store.update(state=>{if(state.bootstrapped_at||state.memberships.length)fail('NOT_AUTHORIZED',403);const member={admin_id:id('admin'),account_id,role:'owner',permissions:[...PERMISSIONS],org_id:null,status:'ACTIVE',revision:1,created_at:new Date().toISOString()};state.memberships.push(member);state.bootstrapped_at=new Date().toISOString();store.appendAudit(state,member,'ADMIN_OWNER_BOOTSTRAPPED',{});return member;});
}
// Offline operator recovery only. Never dispatch this export from an HTTP route.
// Deleting a consumer account remains permitted; it does not reset bootstrap state.
function recoverOrphanedOwner(store,{account_id,code,offline=false}){
  if(offline!==true)fail('NOT_AUTHORIZED',403);
  const before=store.state();
  if(!before.bootstrapped_at||hasOtherEligibleOwner(store,before,null))fail('NOT_AUTHORIZED',403);
  const account=eligibleAccount(store,account_id);if(!code)fail('TWO_FACTOR_REQUIRED',401);
  if(!store.consumerStore.update(state=>security.verifySignIn(store.consumerStore,state.accounts.find(r=>r.account_id===account.account_id),code)))fail('TWO_FACTOR_INVALID',401);
  return store.update(state=>{
    if(!state.bootstrapped_at||hasOtherEligibleOwner(store,state,null))fail('NOT_AUTHORIZED',403);
    eligibleAccount(store,account_id);
    const matches=state.memberships.filter(r=>r.account_id===account_id);
    if(matches.length>1)fail('ADMIN_STATE_UNAVAILABLE',503);
    const changed=new Set(),at=new Date().toISOString();
    for(const row of state.memberships)if(row.role==='owner'&&row.status==='ACTIVE'){
      row.status='DISABLED';row.revision=(row.revision||0)+1;changed.add(row.admin_id);
      store.appendAudit(state,null,'ADMIN_MEMBERSHIP_UPDATED',{admin_id:row.admin_id,account_id:row.account_id,role:row.role,permissions:row.permissions,status:row.status,operation:'OFFLINE_RECOVERY'});
    }
    let member=matches[0];
    if(member){Object.assign(member,{role:'owner',permissions:[...PERMISSIONS],org_id:null,status:'ACTIVE',revision:(member.revision||0)+1});}
    else{member={admin_id:id('admin'),account_id,role:'owner',permissions:[...PERMISSIONS],org_id:null,status:'ACTIVE',revision:1,created_at:at};state.memberships.push(member);}
    changed.add(member.admin_id);
    for(const row of state.unlocks)if(changed.has(row.admin_id)&&!row.revoked_at)row.revoked_at=at;
    store.appendAudit(state,member,'ADMIN_OWNER_RECOVERED',{admin_id:member.admin_id,account_id,role:member.role,permissions:member.permissions,operation:'OFFLINE_RECOVERY',reason:'NO_ACTIVE_ELIGIBLE_OWNER'});
    return member;
  });
}
// Only an already unlocked owner may add another owner. Initial ownership is offline.
function createMembership(store,actor,input){requireCapability(store,actor,'team.manage');eligibleAccount(store,input.account_id);const values=fields(store,input);return store.update(state=>{if(state.memberships.some(r=>r.account_id===input.account_id))fail('INVALID_REQUEST',409);const member={admin_id:id('admin'),account_id:input.account_id,...values,revision:1,created_at:new Date().toISOString()};state.memberships.push(member);store.appendAudit(state,actor,'ADMIN_MEMBERSHIP_CREATED',{admin_id:member.admin_id,org_id:member.org_id||'',status:member.status,role:member.role,permissions:member.permissions});return member;});}
function updateMembership(store,actor,adminId,input){requireCapability(store,actor,'team.manage');const before=store.state().memberships.find(r=>r.admin_id===adminId);if(!before)fail('NOT_FOUND',404);const values=fields(store,input,before);if(values.status==='ACTIVE')eligibleAccount(store,before.account_id);return store.update(state=>{const member=state.memberships.find(r=>r.admin_id===adminId);if(member.role==='owner'&&member.status==='ACTIVE'&&(values.role!=='owner'||values.status!=='ACTIVE')&&!hasOtherEligibleOwner(store,state,adminId))fail('ADMIN_LAST_OWNER',409);Object.assign(member,values,{revision:member.revision+1});for(const row of state.unlocks)if(row.admin_id===adminId&&!row.revoked_at)row.revoked_at=new Date().toISOString();store.appendAudit(state,actor,'ADMIN_MEMBERSHIP_UPDATED',{admin_id:adminId,status:member.status,org_id:member.org_id||'',role:member.role,permissions:member.permissions});return member;});}
function createOrganization(store,actor,input){requireCapability(store,actor,'organizations.manage');const name=typeof input.name==='string'?input.name.trim():'',status=input.status??'ACTIVE';if(!name||name.length>120||!['ACTIVE','DISABLED'].includes(status))fail('INVALID_REQUEST',400);return store.update(state=>{const org={org_id:id('org'),name,status,created_at:new Date().toISOString()};state.organizations.push(org);store.appendAudit(state,actor,'ADMIN_ORGANIZATION_CREATED',{org_id:org.org_id,status});return org;});}
function updateOrganization(store,actor,orgId,input){requireCapability(store,actor,'organizations.manage');if(input.status!==undefined&&!['ACTIVE','DISABLED'].includes(input.status)||input.name!==undefined&&(typeof input.name!=='string'||!input.name.trim()||input.name.trim().length>120))fail('INVALID_REQUEST',400);return store.update(state=>{const org=state.organizations.find(r=>r.org_id===orgId);if(!org)fail('NOT_FOUND',404);if(input.name!==undefined)org.name=input.name.trim();if(input.status!==undefined){org.status=input.status;const admins=new Set(state.memberships.filter(r=>r.org_id===orgId).map(r=>r.admin_id));for(const row of state.unlocks)if(admins.has(row.admin_id)&&!row.revoked_at)row.revoked_at=new Date().toISOString();}store.appendAudit(state,actor,'ADMIN_ORGANIZATION_UPDATED',{org_id:orgId,status:org.status});return org;});}
const addAudit=(store,actor,event,metadata)=>store.audit(actor,event,metadata);
module.exports={AdminError,PERMISSIONS,PARTNER_ALLOWED,UNLOCK_MS,principal,unlock,lock,ownerSignInPath,requireCapability,bootstrapOwner,recoverOrphanedOwner,createMembership,updateMembership,createOrganization,updateOrganization,addAudit};
