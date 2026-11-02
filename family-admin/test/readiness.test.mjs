import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {readinessSummary} from '../src/readiness.mjs';
import {fixtures} from './fixtures.mjs';

test('readiness records retain four apps, review date, blockers and scoped evidence',()=>{
  const r=readinessSummary('production');
  assert.equal(r.status,'NOT_FULLY_VERIFIED');assert.equal(r.applications.length,4);assert.equal(r.reviewedAt,'2026-11-01');
  for(const app of r.applications){assert.equal(app.status,'BLOCKERS_REMAIN');assert.ok(app.accepted.length);assert.ok(app.blockers.length);}
  assert.match(r.applications[0].accepted.join(' '),/obsolete writer claim is absent/);assert.doesNotMatch(r.applications[0].blockers.join(' '),/obsolete writer/);assert.match(r.applications[2].blockers.join(' '),/human-only/);
  assert.match(r.limitations,/not launch readiness/);
});
test('production receipts never certify staging or local; outputs cannot mutate retained records',()=>{
  for(const env of ['staging','local']){const r=readinessSummary(env);assert.ok(r.applications.every(a=>a.status==='ENVIRONMENT_NOT_ACCEPTED'&&a.accepted.length===0));assert.match(r.evidenceNote,/do not accept this environment/);}
  const r=readinessSummary('production');r.applications[0].blockers.length=0;r.sharedBlockers.length=0;
  assert.ok(readinessSummary('production').applications[0].blockers.length);assert.ok(readinessSummary('production').sharedBlockers.length);
});
test('readiness endpoint enforces normal sign-in, native unlock, permission and read-only behavior',async()=>{
  const f=await fixtures();try{
    assert.equal((await f.request('/api/readiness')).status,401);await f.login();
    const before=JSON.stringify(f.state.data),writes=f.state.writes.length,calls=f.state.calls.length;
    const response=await f.request('/api/readiness');assert.equal(response.status,200);const r=response.json;assert.equal(r.applications.length,4);assert.match(response.headers.get('cache-control'),/no-store/);
    assert.equal(JSON.stringify(f.state.data),before);assert.equal(f.state.writes.length,writes);
    assert.ok(f.state.calls.slice(calls).every(c=>c.method==='GET'&&c.path==='/api/admin/session'));
    assert.equal((await f.request('/api/readiness?receipt=untrusted')).status,400);
    f.state.primaryPermissions=f.state.primaryPermissions.filter(p=>p!=='overview.read');assert.equal((await f.request('/api/readiness')).status,403);
    f.state.primaryPermissions.push('overview.read');f.state.active=false;assert.equal((await f.request('/api/readiness')).status,401);
  }finally{await f.close();}
});
test('readiness renderer shows qualified evidence and safe text without write controls',()=>{
  const source=readFileSync(new URL('../public/app.js',import.meta.url),'utf8'),code=source.slice(source.indexOf('function operationalReadiness('),source.indexOf('async function overview('));
  const el=(tag,text='',className='')=>({tag,text:text??'',className,children:[],setAttribute(){},append(...x){this.children.push(...x);}});
  const ctx=vm.createContext({el,human:x=>x});vm.runInContext(code,ctx);const root=el('div'),r=readinessSummary('production');r.unresolvedGates[0].reason='<img src=x onerror=steal()>';ctx.operationalReadiness(root,r);
  const tags=[],texts=[];const walk=n=>{tags.push(n.tag);texts.push(n.text);n.children.forEach(walk);};walk(root);
  assert.ok(texts.includes('Unresolved readiness gates'));assert.ok(texts.includes('Not fully verified'));assert.ok(texts.includes('Historical evidence reviewed 2026-11-01 · production'));
  assert.ok(texts.includes('<img src=x onerror=steal()>'));assert.ok(!tags.includes('img'));assert.ok(!tags.includes('button'));assert.ok(!tags.includes('form'));
  for(const name of ['Consumer','Family / Admin','Partner','Mail / Staff'])assert.ok(texts.includes(name));
});

test('closed gaps retain receipt scope and are not repeated as blockers',()=>{
  const r=readinessSummary('production'),family=r.applications.find(a=>a.app==='family'),mail=r.applications.find(a=>a.app==='mail');
  assert.match(family.accepted.join(' '),/single-person model/);assert.match(family.accepted.join(' '),/not a second-device decryption/);
  assert.doesNotMatch(family.blockers.join(' '),/coverage hours|response targets|vault.*unverified/);
  assert.match(mail.accepted.join(' '),/two October29 incident messages/);assert.doesNotMatch(mail.blockers.join(' '),/Alert inbox arrival|acknowledgement/);
  assert.match(r.sharedAccepted.join(' '),/genuine calendar witness/);assert.doesNotMatch(r.sharedBlockers.join(' '),/successful staging scheduled-backup run.*needs/);
  assert.match(family.blockers.join(' '),/earlier Family package/);assert.equal(r.status,'NOT_FULLY_VERIFIED');
});
test('remaining technical gaps stay visible without turning local or owner evidence into global acceptance',()=>{
  const r=readinessSummary('production');const blockers=[...r.sharedBlockers,...r.applications.flatMap(a=>a.blockers)].join(' ');
  for(const pattern of [/customer, publisher and other staff MFA/,/role.grant restoration/,/DNS.TLS/,/OCR capacity/,/settled-transaction/,/Genuine customer attribution/,/latency failure/,/delivery evidence/,/measured detection accuracy/])assert.match(blockers,pattern);
  assert.equal(readinessSummary('staging').sharedAccepted.length,0);
});
test('shared accepted evidence is rendered separately from remaining gates',()=>{
  const source=readFileSync(new URL('../public/app.js',import.meta.url),'utf8'),code=source.slice(source.indexOf('function operationalReadiness('),source.indexOf('async function overview('));
  const el=(tag,text='',className='')=>({tag,text:text??'',className,children:[],setAttribute(){},append(...x){this.children.push(...x);}});
  const ctx=vm.createContext({el,human:x=>x});vm.runInContext(code,ctx);const root=el('div');ctx.operationalReadiness(root,readinessSummary('production'));
  const texts=[];const walk=n=>{texts.push(n.text);n.children.forEach(walk);};walk(root);assert.ok(texts.includes('Shared evidence accepted'));assert.ok(texts.includes('Accepted evidence — historical and scope-limited'));assert.ok(texts.includes('Recovery'));assert.ok(texts.includes('Provider controls'));
});


test('unresolved gates keep separate categories, stable identities and dated candidate failures',()=>{
  const result=readinessSummary('production'),gates=result.unresolvedGates;
  assert.equal(new Set(gates.map(g=>g.id)).size,gates.length);
  for(const category of ['capacity','access','recovery','customer','provider','finance','release'])assert.ok(gates.some(g=>g.category===category));
  const capacity=gates.find(g=>g.id==='consumer-hosted-capacity');assert.equal(capacity.status,'FAILED');assert.equal(capacity.candidate,'e2ca4e3');assert.match(capacity.reason,/3.01 seconds/);assert.match(capacity.reason,/soak was skipped/);
  const mail=gates.find(g=>g.id==='mail-status-activation');assert.equal(mail.status,'AWAITING_ACTIVATION');assert.match(mail.reason,/not performed/);
  assert.equal(gates.find(g=>g.id==='family-current-recovery').reviewedAt,'2026-11-01');assert.equal(capacity.reviewedAt,'2026-11-02');
  result.unresolvedGates[0].reason='changed';assert.notEqual(readinessSummary('production').unresolvedGates[0].reason,'changed');
  for(const env of ['local','staging'])assert.ok(readinessSummary(env).unresolvedGates.every(g=>g.status==='ENVIRONMENT_NOT_ACCEPTED'));
});

test('missing structured gate data falls back to unresolved legacy records without claiming readiness',()=>{
  const source=readFileSync(new URL('../public/app.js',import.meta.url),'utf8'),code=source.slice(source.indexOf('function operationalReadiness('),source.indexOf('async function overview('));
  const el=(tag,text='',className='')=>({tag,text:text??'',className,children:[],setAttribute(){},append(...x){this.children.push(...x);}});
  const ctx=vm.createContext({el,human:x=>x});vm.runInContext(code,ctx);
  for(const structured of [false,true]){
    const root=el('div'),r=readinessSummary('production');if(structured)r.unresolvedGates=[];else delete r.unresolvedGates;
    ctx.operationalReadiness(root,r);const texts=[];const walk=n=>{texts.push(n.text);n.children.forEach(walk);};walk(root);
    assert.ok(texts.includes('Not fully verified'));
    assert.ok(texts.some(t=>structured?t.includes('does not establish launch readiness'):t.includes('Detailed gate data is unavailable')));
    if(!structured)assert.ok(texts.includes(r.applications[0].blockers[0]));
  }
});
