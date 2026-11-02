'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {DEFINITIONS,evaluate}=require('../deploy/operational-gap-readiness.cjs');
const now=Date.parse('2026-11-02T12:00:00Z');
function input(){return Object.fromEntries(Object.entries(DEFINITIONS).map(([app,{gates}])=>[app,{build:'fictional-build',generation:'fictional-generation',evidence:Object.fromEntries(gates.map(g=>[g,{build:'fictional-build',generation:'fictional-generation',receipt:'fixture://'+app+'/'+g,acceptedAt:'2026-11-02T11:00:00Z',freshness:'generation-bound',passed:true}]))}]))}
function consumer(i){return evaluate(i,now).find(r=>r.app==='consumer');}
test('Consumer capacity has its own mandatory gate without changing other app gates',()=>{
 assert.deepEqual(DEFINITIONS.consumer.gates,['service','administration','access','recovery','accuracy','capacity']);
 assert.deepEqual(DEFINITIONS.family.gates,['service','access','recovery','staffing']);
 assert.deepEqual(DEFINITIONS.partner.gates,['service','access','recovery','attribution','settlement']);
 assert.deepEqual(DEFINITIONS.mail.gates,['service','access','recovery','staffing','alertAcknowledgement','fulfillment']);
});
test('unaccepted capacity cannot be hidden by all other accepted Consumer gates',()=>{
 const cases=[['missing',r=>delete r.evidence.capacity,'MISSING_EVIDENCE'],['failed',r=>r.evidence.capacity.passed=false,'NOT_ACCEPTED'],['stale',r=>Object.assign(r.evidence.capacity,{freshness:'expires',validUntil:'2026-11-02T12:00:00Z'}),'STALE_EVIDENCE'],['wrong build',r=>r.evidence.capacity.build='other','TARGET_MISMATCH'],['wrong generation',r=>r.evidence.capacity.generation='other','TARGET_MISMATCH'],['no receipt',r=>r.evidence.capacity.receipt='','MISSING_RECEIPT']];
 for(const [name,change,reason] of cases){const i=input(),before=evaluate(i,now).filter(r=>r.app!=='consumer');change(i.consumer);const result=consumer(i);assert.equal(result.acceptedForDeclaredScope,false,name);assert.deepEqual(result.blockers.map(r=>[r.gate,r.reason]),[['capacity',reason]],name);assert.deepEqual(evaluate(i,now).filter(r=>r.app!=='consumer'),before,name);}
});
test('accepted capacity alone cannot stand in for any other Consumer gate',()=>{
 for(const gate of DEFINITIONS.consumer.gates.filter(g=>g!=='capacity')){const i=input();delete i.consumer.evidence[gate];assert.equal(consumer(i).acceptedForDeclaredScope,false,gate);assert.equal(consumer(i).blockers[0].gate,gate);}
});
test('complete matching capacity evidence passes only the advisory declared scope and does not mutate input',()=>{
 const i=input(),before=JSON.stringify(i);const r=consumer(i);assert.equal(r.acceptedForDeclaredScope,true);assert.deepEqual(r.blockers,[]);assert.match(r.scope,/local evidence assessment; not deployment approval/);assert.equal(JSON.stringify(i),before);assert.equal(Object.hasOwn(r,'launch_ready'),false);assert.equal(Object.hasOwn(r,'deploy'),false);
});
