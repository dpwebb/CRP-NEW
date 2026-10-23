import test from 'node:test';
import assert from 'node:assert/strict';
import {fixtures,otherAccount} from './fixtures.mjs';

test('expired native sign-in can be renewed inside the same Family session with both factors and original cap',async()=>{
 let now=Date.now();const f=await fixtures({now:()=>now});
 try {
  await f.login();const s=[...f.portal.gateway.sessions.values()][0],csrf=s.csrf,key=s.key,cap=s.authenticatedUntil;
  f.state.primarySessionExpired=true;
  const expired=await f.request('/api/unlock',{method:'POST',body:{code:'654321'}});
  assert.equal(expired.status,401);assert.equal(expired.json.error.code,'PRIMARY_AUTHENTICATION_REQUIRED');assert.equal(s.authorized,false);
  const bad=await f.request('/api/reauthenticate',{method:'POST',body:{password:'wrong',code:'123456'}});
  assert.equal(bad.status,401);assert.equal(s.primaryAuthenticationExpired,true);assert.equal(s.authorized,false);
  const renewed=await f.request('/api/reauthenticate',{method:'POST',body:{password:'fictional-password',code:'123456'}});
  assert.equal(renewed.status,200);assert.equal(renewed.json.csrf,csrf);assert.equal(renewed.headers.get('set-cookie'),null);
  assert.equal(s.key,key);assert.equal(s.authenticatedUntil,cap);assert.equal(s.authorized,false);assert.equal(s.verifiedAt,0);
  assert.equal((await f.request('/api/apps/crp/accounts')).status,401);
  const unlocked=await f.request('/api/unlock',{method:'POST',body:{code:'654321'}});
  assert.equal(unlocked.status,200);assert.equal(s.csrf,csrf);assert.equal(s.authenticatedUntil,cap);
  assert.equal((await f.request('/api/apps/crp/accounts')).status,200);
  assert(f.portal.journal.events.some(e=>e.event==='PRIMARY_REAUTHENTICATED'));
  now=cap+1;assert.equal((await f.request('/api/reauthenticate',{method:'POST',body:{password:'fictional-password',code:'123456'}})).status,401);
  assert(!f.portal.gateway.sessions.has(key));
 }finally{await f.close();}
});

test('native recovery requires CSRF, does not switch subjects or replace unexpired native credentials',async()=>{
 const f=await fixtures();try{
  await f.login();const s=[...f.portal.gateway.sessions.values()][0];
  assert.equal((await f.request('/api/reauthenticate',{method:'POST',body:{password:'fictional-password',code:'123456'}})).status,409);
  f.state.primarySessionExpired=true;await f.request('/api/unlock',{method:'POST',body:{code:'654321'}});
  assert.equal((await f.request('/api/reauthenticate',{method:'POST',body:{password:'fictional-password',code:123456}})).status,400);
  const rejected=await fetch(f.base+'/api/reauthenticate',{method:'POST',headers:{origin:f.base,cookie:f.cookie,'content-type':'application/json'},body:JSON.stringify({password:'fictional-password',code:'123456'})});
  assert.equal(rejected.status,403);
  f.state.signInAccount=otherAccount;const changed=await f.request('/api/reauthenticate',{method:'POST',body:{password:'fictional-password',code:'123456'}});
  assert.equal(changed.status,403);assert.equal(changed.json.error.code,'IDENTITY_CHANGED');assert.equal(s.primaryAuthenticationExpired,true);assert.equal(s.authorized,false);
  assert(f.state.calls.some(e=>e.path==='/api/sessions/current'&&e.method==='DELETE'));
 }finally{await f.close();}
});

test('native recovery rechecks current permissions after fresh administration unlock',async()=>{
 const f=await fixtures();try{
  await f.login();f.state.primarySessionExpired=true;await f.request('/api/unlock',{method:'POST',body:{code:'654321'}});
  await f.request('/api/reauthenticate',{method:'POST',body:{password:'fictional-password',code:'123456'}});
  f.state.primaryRole='staff';f.state.primaryPermissions=['overview.read'];
  const r=await f.request('/api/unlock',{method:'POST',body:{code:'654321'}});assert.equal(r.status,200);assert.equal(r.json.role,'staff');
  assert.equal((await f.request('/api/apps/crp/accounts')).status,403);
 }finally{await f.close();}
});
