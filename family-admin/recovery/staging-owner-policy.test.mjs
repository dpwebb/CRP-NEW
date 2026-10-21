import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import {provision, hash, TARGET, EMAIL, DATA, BUILD} from './staging-owner-policy.mjs';
// Only native source is selected here; every test data directory is newly isolated.
const native = process.env.CRP_RECOVERY_TEST_NATIVE_ROOT || fileURLToPath(new URL('../../accelerated-launch/service/', import.meta.url));
const require = createRequire(path.join(native,'server.cjs'));
const {PrivateStore} = require('./private-store.cjs'), {AdminStore} = require('./admin-store.cjs');
const accounts = require('./accounts.cjs'), security = require('./signup-security.cjs'), access = require('./admin-access.cjs');
test('isolated native signed-store recovery, refusal matrix, one-use MFA and normal owner unlock', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(),'crp-staging-owner-policy-')), realNow = Date.now;
  let admin;
  try {
    const consumer = new PrivateStore(dir), now = realNow();
    const old=accounts.createAccount(consumer,{email:'existing-owner@example.test',password:'isolated-recovery-fixture-password'});
    consumer.update(s=>{const a=s.accounts.find(a=>a.account_id===old.account.account_id);a.account_id='acc_fixture_0';a.email_verified_at=new Date(now).toISOString();a.signup_complete_at=new Date(now).toISOString();s.sessions=[];});
    Date.now=()=>now-180000;
    const oldSetup=security.beginTwoFactor(consumer,{account_id:'acc_fixture_0'},{password:'isolated-recovery-fixture-password'});
    security.confirmTwoFactor(consumer,{account_id:'acc_fixture_0'},{code:security.totp(oldSetup.secret)});
    Date.now=()=>now;
    const created = accounts.createAccount(consumer,{email:EMAIL,password:'isolated-recovery-fixture-password'});
    consumer.update(s=>{const a=s.accounts.find(a=>a.account_id===created.account.account_id);a.account_id=TARGET;a.email_verified_at=new Date(now).toISOString();a.signup_complete_at=new Date(now).toISOString();s.sessions=[];});
    Date.now=()=>now-120000;
    const setup=security.beginTwoFactor(consumer,{account_id:TARGET},{password:'isolated-recovery-fixture-password'});
    security.confirmTwoFactor(consumer,{account_id:TARGET},{code:security.totp(setup.secret)});
    Date.now=()=>now;
    admin=new AdminStore(dir,{consumerStore:consumer});
    admin.update(s=>{s.bootstrapped_at=new Date(now).toISOString();for(let i=0;i<5;i++)s.memberships.push({admin_id:'admin_fixture_'+i,account_id:'acc_fixture_'+i,role:i?'staff':'owner',permissions:i?['overview.read']:[...access.PERMISSIONS],org_id:null,status:'ACTIVE',revision:1});});
    const original=admin.state(), primary=consumer.state();
    const intent={version:1,environment:'staging',dataDirectory:DATA,build:BUILD,accountId:TARGET,email:EMAIL,operation:'staging-owner-'+randomUUID(),ownerAuthorization:'Authorize the staging-only recovery implementation',issuedAt:new Date(now-1000).toISOString(),expiresAt:new Date(now+1800000).toISOString(),adminStateHash:hash(original),consumerStateHash:hash(primary)};
    let claims=0;
    const params={intent,consumer,admin,security,permissions:access.PERMISSIONS,code:security.totp(setup.secret),now,claim(){if(claims++)throw Error('CLAIM_ALREADY_CONSUMED');}};
    for(const [patch,message] of [
      [{environment:'production'},/STAGING_SCOPE/], [{dataDirectory:'/var/lib/private/crp-wizard-production'},/STAGING_SCOPE/], [{build:'other'},/STAGING_SCOPE/],
      [{accountId:'acc_other'},/EXACT_PERSON/], [{email:'other@example.test'},/EXACT_PERSON/], [{ownerAuthorization:'unapproved'},/OWNER_AUTHORIZATION/],
      [{operation:'../escape'},/OWNER_AUTHORIZATION/], [{expiresAt:new Date(now).toISOString()},/INTENT_EXPIRED/], [{issuedAt:new Date(now+1).toISOString()},/INTENT_EXPIRED/],
      [{adminStateHash:'0'.repeat(64)},/PREDECESSOR_CHANGED/], [{consumerStateHash:'0'.repeat(64)},/PREDECESSOR_CHANGED/]
    ])assert.throws(()=>provision({...params,intent:{...intent,...patch}}),message);
    assert.throws(()=>provision({...params,code:''}),/FRESH_MFA_REQUIRED/);
    assert.equal(claims,0);assert.deepEqual(admin.state(),original);assert.deepEqual(consumer.state(),primary);
    assert.throws(()=>access.recoverOrphanedOwner(admin,{account_id:TARGET,code:params.code,offline:true}));
    // The new policy is explicit; original recovery behavior stays unchanged.
    const wrong=String((Number(params.code)+1)%1000000).padStart(6,'0');
    assert.throws(()=>provision({...params,code:wrong}),/TWO_FACTOR_INVALID_OPERATION_CONSUMED/);
    assert.equal(claims,1);assert.deepEqual(admin.state(),original);
    const nextIntent={...intent,operation:'staging-owner-'+randomUUID(),consumerStateHash:hash(consumer.state())};
    assert.throws(()=>provision({...params,intent:nextIntent}),/CLAIM_ALREADY_CONSUMED/);
    let freshClaim=false;
    const member=provision({...params,intent:nextIntent,claim(){assert.equal(freshClaim,false);freshClaim=true;}});assert.equal(member.role,'owner');assert.equal(member.account_id,TARGET);
    const after=admin.state();assert.deepEqual(after.memberships.slice(0,5),original.memberships);assert.deepEqual(after.unlocks,original.unlocks);
    assert.equal(after.audit_events.at(-1).event,'ADMIN_STAGING_OWNER_PROVISIONED');assert.equal(after.audit_events.at(-1).actor_admin_id,null);
    const afterAccount=consumer.state().accounts.find(x=>x.account_id===TARGET), beforeAccount=primary.accounts.find(x=>x.account_id===TARGET);
    for(const key of new Set([...Object.keys(beforeAccount),...Object.keys(afterAccount)]))if(!['two_factor_last_counter','two_factor_failed_attempts','two_factor_locked_until'].includes(key))assert.deepEqual(afterAccount[key],beforeAccount[key],key);
    assert.throws(()=>provision(params),/PREDECESSOR_CHANGED/);
    // Native login and a separate fresh native MFA unlock recognize the new role.
    Date.now=()=>now+60000;
    const signed=accounts.signIn(consumer,{email:EMAIL,password:'isolated-recovery-fixture-password',code:security.totp(setup.secret)});
    assert.ok(signed.token);
    Date.now=()=>now+120000;
    const unlocked=access.unlock(admin,{account_id:TARGET},signed.token,{code:security.totp(setup.secret)});
    assert.equal(access.principal(admin,{account_id:TARGET},signed.token,unlocked.admin_token).role,'owner');
    admin.close();admin=new AdminStore(dir,{consumerStore:consumer});assert.equal(admin.state().memberships.length,6);
    // A fresh intent cannot reuse the already consumed MFA counter, nor create a duplicate.
    const replay={...intent,adminStateHash:hash(admin.state()),consumerStateHash:hash(consumer.state())};
    assert.throws(()=>provision({...params,admin,intent:replay}),/MEMBERSHIP_ALREADY_EXISTS/);
  } finally {Date.now=realNow;admin?.close();fs.rmSync(dir,{recursive:true,force:true});}
});
