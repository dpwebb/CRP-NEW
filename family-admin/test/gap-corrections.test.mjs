import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import vm from 'node:vm';
import {fixtures,account,permissions} from './fixtures.mjs';

const loginBody={email:'owner@example.test',password:'fictional-password',code:'123456'};
const request=(name,key=randomUUID())=>({body:{confirm:'I_HAVE_CHECKED_THIS_ORDER'},id:'44444444-4444-4444-8444-444444444444',requestId:key,confirmation:'local:mail:'+name});
async function done(f,key){for(let i=0;i<200;i++){if(!f.portal.gateway.pendingOperations.has(key))return;await new Promise(r=>setTimeout(r,10));}throw Error('operation did not finish');}

test('second login preserves idle A, CSRF and original absolute cap; true expiry closes native links',async()=>{
 let clock=Date.now();const f=await fixtures({now:()=>clock});
 try{await f.login();const cookieA=f.cookie,csrfA=f.csrf,s=[...f.portal.gateway.sessions.values()][0],absolute=s.authenticatedUntil;
 clock+=901000;
 assert.equal((await f.request('/api/session')).json.unlockRequired,true);
 await f.request('/api/login',{method:'POST',body:loginBody});
 assert(f.portal.gateway.sessions.has(s.key));assert.equal(s.authenticatedUntil,absolute);
 const r=await fetch(f.base+'/api/unlock',{method:'POST',headers:{origin:f.base,cookie:cookieA,'x-csrf-token':csrfA,'content-type':'application/json'},body:JSON.stringify({code:'654321'})});
 assert.equal(r.status,200);assert.equal(s.csrf,csrfA);assert.equal(s.authenticatedUntil,absolute);
 clock=absolute+1;await f.request('/api/login',{method:'POST',body:loginBody});
 assert(!f.portal.gateway.sessions.has(s.key));assert.deepEqual(s.links,{});assert(f.portal.journal.events.some(r=>r.event==='SIGNED_OUT'));
 }finally{await f.close();}
});

test('self-revocation acknowledges once without returning revoked member data or deleting another session',async()=>{
 const f=await fixtures();try{await f.login();const first=[...f.portal.gateway.sessions.values()][0];await f.login();const current=[...f.portal.gateway.sessions.values()].at(-1);
 f.state.writeResult={member:{admin_id:'self-fixture',account_id:account,status:'DISABLED',private:'must not return'}};
 const r=await f.request('/api/actions/crp/team.update',{method:'POST',body:{id:'self-fixture',body:{role:'owner',status:'DISABLED',permissions},requestId:randomUUID(),confirmation:'local:crp:team.update'}});
 assert.equal(r.status,200);assert.equal(r.json.status,'APPLIED');assert.equal(r.json.accessRemoved,true);assert(!r.json.data);assert(!r.text.includes('must not return'));
 assert(!f.portal.gateway.sessions.has(current.key));assert(f.portal.gateway.sessions.has(first.key));assert.match(r.headers.get('set-cookie'),/Max-Age=0/);assert.equal((await f.request('/api/session')).status,401);
 assert(!f.portal.journal.events.some(r=>r.outcome==='APPLIED_RESPONSE_WITHHELD'));
 }finally{await f.close();}
});

test('provider operation returns promptly beyond old deadline and completes once with a durable receipt',async()=>{
 const f=await fixtures();try{await f.login();await f.connect();let release;f.state.beforeWrite=()=>new Promise(r=>{release=r;});
 const input=request('provider.preview'),start=Date.now();const r=await f.request('/api/actions/mail/provider.preview',{method:'POST',body:input});
 assert.equal(r.status,202);assert.equal(r.json.status,'PENDING');assert(Date.now()-start<1500);
 while(!release)await new Promise(r=>setTimeout(r,5));
 assert.equal((await f.request('/api/operations/'+input.requestId)).json.status,'PENDING');
 assert.equal((await f.request('/api/operations')).json.items[0].requestId,input.requestId);
 assert.equal((await f.request('/api/actions/mail/provider.preview',{method:'POST',body:input})).json.status,'ALREADY_SUBMITTED');
 assert.equal((await f.request('/api/actions/mail/provider.preview',{method:'POST',body:{...input,requestId:randomUUID()}})).status,409);
 await new Promise(r=>setTimeout(r,12500));release();await done(f,input.requestId);
 assert.equal((await f.request('/api/operations/'+input.requestId)).json.status,'APPLIED');assert.equal(f.state.writes.length,1);
 }finally{await f.close();}
});

test('uncertain provider result remains nonreplayable after restart; refusal has a distinct receipt',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'family-uncertain-'));let f;
 try{f=await fixtures({dir:directory});await f.login();await f.connect();f.state.fault='drop';const input=request('provider.send');
 assert.equal((await f.request('/api/actions/mail/provider.send',{method:'POST',body:input})).status,202);await done(f,input.requestId);
 assert.equal((await f.request('/api/operations/'+input.requestId)).json.status,'UNKNOWN');assert.equal(f.state.writes.length,1);
 await f.close();f=await fixtures({dir:directory});await f.login();await f.connect();
 assert.equal((await f.request('/api/operations/'+input.requestId)).json.status,'UNKNOWN');
 assert.equal((await f.request('/api/actions/mail/provider.send',{method:'POST',body:{...input,requestId:randomUUID()}})).status,409);assert.equal(f.state.writes.length,0);
 f.state.fault='reject';const refused=request('provider.cancel');await f.request('/api/actions/mail/provider.cancel',{method:'POST',body:refused});await done(f,refused.requestId);
 assert.equal((await f.request('/api/operations/'+refused.requestId)).json.status,'REFUSED');
 assert.equal((await f.request('/api/operations/'+randomUUID())).status,404);
 }finally{await f?.close();rmSync(directory,{recursive:true,force:true});}
});

test('record revision fills on typing, paste, delayed options and preselected IDs without submission',async()=>{
 const code=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');const fn=code.slice(code.indexOf('async function recordChoices('),code.indexOf('function actionButtons('));
 class Input extends EventTarget{constructor(value=''){super();this.value=value;this.parentElement={append(){}};}setAttribute(){}}
 let resolve;const input=new Input(),revision=new Input(),nodes=new Map([['recordId',{input}],['expectedRevision',{input:revision,f:{type:'number'}}]]),dialog={nodes};
 const context=vm.createContext({S:{dialog,session:{catalog:{reads:{affiliate:['tickets']}}}},api:()=>new Promise(r=>{resolve=r;}),items:v=>v,el:()=>({append(){}}),crypto:{randomUUID}});
 vm.runInContext(fn,context);const pending=context.recordChoices('affiliate','ticket.update');input.value=' ticket-owned ';resolve({data:[{id:'ticket-owned',revision:7}]});await pending;assert.equal(revision.value,7);
 input.value='ticket-owned';revision.value='';input.dispatchEvent(new Event('input'));assert.equal(revision.value,7);revision.value='';input.dispatchEvent(new Event('change'));assert.equal(revision.value,7);
 context.S.dialog=null;revision.value='';input.dispatchEvent(new Event('input'));assert.equal(revision.value,'');
});
