'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto'),fs=require('node:fs'),path=require('node:path');
const {TestService}=require('./harness.cjs');
test('native unlocked owner can review support; locked owner and ordinary account cannot',{timeout:120000},async()=>{
 const t=await new TestService('care-admin').listen(),{AdminStore}=require('../admin-store.cjs'),access=require('../admin-access.cjs'),security=require('../signup-security.cjs'),admin=require('../admin-service.cjs');
 const store=t.service.store,adminStore=new AdminStore(t.dataDir,{consumerStore:store}),now=Date.now();
 const at=(time,fn)=>{const old=Date.now;Date.now=()=>time;try{return fn();}finally{Date.now=old;}};
 try{
 const owner=await t.unpaidAccount('care.owner@example.test'),customer=await t.unpaidAccount('care.customer@example.test');
 const setup=at(now-30000,()=>{const s=security.beginTwoFactor(store,owner,{password:'a-long-enough-password'});security.confirmTwoFactor(store,owner,{code:security.totp(s.secret,now-30000)});return s;});
 at(now,()=>access.bootstrapOwner(adminStore,{account_id:owner.account_id,code:security.totp(setup.secret,now)}));
 const token=at(now+30000,()=>access.unlock(adminStore,owner,owner.token,{code:security.totp(setup.secret,now+30000)})).admin_token;
 const call=(actor,method,pathname,body={},adminToken=token)=>admin.dispatchAdmin({store,adminStore,actor,method,pathname,req:{url:pathname},body,sessionToken:actor.token,adminToken,env:{CRP_ADMIN_ENABLED:'true'}});
 const ticket=require('../consumer-care.cjs').createTicket(store,customer,{requestId:randomUUID(),category:'billing',message:'Fictional request'}).ticket;
 assert.equal((await call(owner,'GET','/api/admin/support')).json.items.length,1);
 const summary=await call(owner,'GET','/api/admin/outcomes');assert.equal(summary.json.support.open,1);assert.ok(!JSON.stringify(summary.json).includes('care.customer@example.test'));assert.ok(!JSON.stringify(summary.json).includes('Fictional request'));
 await assert.rejects(call(owner,'GET','/api/admin/outcomes',{},''));await assert.rejects(call(customer,'GET','/api/admin/outcomes'));
 await assert.rejects(call(owner,'GET','/api/admin/support',{},''));await assert.rejects(call(customer,'GET','/api/admin/support'));
 const updated=await call(owner,'POST','/api/admin/support/'+ticket.ticketId,{requestId:randomUUID(),expectedRevision:1,status:'ACKNOWLEDGED',message:'Fictional update',nextUpdateAt:Date.now()+3600000});
 assert.equal(updated.json.ticket.owner,owner.account_id);
 assert.equal(require('../consumer-care.cjs').tickets(store,customer)[0].events.length,1);
 const normalized=require('../private-store.cjs').normalizeState(structuredClone(store.state()));
 assert.equal(normalized.accounts.find(x=>x.account_id===customer.account_id).service_requests.length,1);
 }finally{adminStore.close();await t.close();}
});
test('native unpaid support/followup preserves ownership, approval rows, idempotence and restart persistence',{timeout:120000},async()=>{
 const t=await new TestService('care-local').listen();
 try{
 const a=await t.unpaidAccount('care.a@example.test'),b=await t.unpaidAccount('care.b@example.test');
 const req=async(method,url,body,actor=a)=>t.request(method,url,{token:actor?.token,body});
 const payload={requestId:randomUUID(),category:'complaint',message:'Fictional request for assistance'};
 const created=await req('POST','/api/support/tickets',payload);assert.equal(created.status,201,created.text);assert.equal(created.json.ticket.complaintDeadline,null);
 assert.equal((await req('POST','/api/support/tickets',payload)).json.duplicate,true);
 assert.equal((await req('POST','/api/support/tickets',{...payload,message:'different'})).status,409);
 assert.equal((await req('GET','/api/support/tickets',undefined,b)).json.items.length,0);
 assert.equal((await req('GET','/api/support/tickets',undefined,null)).status,401);
 const caseId=(await req('POST','/api/cases',{country:'CA',region:'CA-NS'})).json.case.case_id;
 const before=JSON.stringify(t.service.store.state().packets);
 const event={requestId:randomUUID(),expectedRevision:0,type:'SUBMITTED',occurredAt:Date.now()-1000,note:'Fictional self-mail record'};
 const added=await req('POST',`/api/cases/${caseId}/followup`,event);assert.equal(added.status,201,added.text);assert.equal(added.json.events[0].evidenceClass,'CONSUMER_RECORDED');
 assert.equal((await req('POST',`/api/cases/${caseId}/followup`,event)).json.duplicate,true);
 assert.equal((await req('POST',`/api/cases/${caseId}/followup`,{...event,requestId:randomUUID()})).status,409);
 assert.equal((await req('GET',`/api/cases/${caseId}/followup`,undefined,b)).status,403);
 assert.equal((await req('GET',`/api/cases/${caseId}/coverage-receipt`)).json.checkInventoryAvailable,false);
 t.service.store.update(s=>s.results.push({account_id:a.account_id,case_id:caseId,result_id:'fictional-scope-result',evaluation:{common_errors:{performed:[{check_id:'fictional-check',state:'VIOLATION',detail:'paid finding'}]}},extraction:{records:[{secret:'paid record'}]}}));
 const receipt=await req('GET',`/api/cases/${caseId}/coverage-receipt`);assert.equal(receipt.status,200);assert.deepEqual(receipt.json.checks,[{checkId:'fictional-check'}]);assert.ok(!JSON.stringify(receipt.json).includes('VIOLATION'));assert.ok(!JSON.stringify(receipt.json).includes('paid record'));
 assert.equal((await req('GET',`/api/cases/${caseId}/coverage-receipt`,undefined,b)).status,403);
 assert.equal(JSON.stringify(t.service.store.state().packets),before);
 const disk=JSON.parse(fs.readFileSync(path.join(t.dataDir,'state.json'),'utf8'));assert.equal(disk.accounts.find(x=>x.account_id===a.account_id).service_requests.length,1);
 const {PrivateStore}=require('../private-store.cjs');const reader=new PrivateStore(t.dataDir,{allowMultiWriter:true});assert.equal(reader.state().cases.find(x=>x.case_id===caseId).care_events.length,1);
 const removed=await req('DELETE',`/api/cases/${caseId}`);assert.equal(removed.status,200,removed.text);assert.equal((await req('GET',`/api/cases/${caseId}/followup`)).status,404);
 assert.equal((await req('GET','/api/support/tickets')).json.items.length,1);
 }finally{await t.close();}
});
test('signed-out intake is bounded, generic, origin protected and sends no message',{timeout:30000},async()=>{
 const t=await new TestService('care-contact').listen();try{
 const payload={requestId:randomUUID(),email:'fictional.support@example.test',category:'signin',message:'Fictional sign-in assistance'};
 const r=await t.request('POST','/api/support/contact',{body:payload});assert.equal(r.status,202,r.text);assert.deepEqual(r.json,{ok:true,received:true});
 assert.equal((await t.request('POST','/api/support/contact',{body:payload,headers:{Origin:'https://wrong.example'}})).status,403);
 assert.equal(t.confirmationMessages.length,0);assert.equal(t.resetMessages.length,0);
 const original=JSON.stringify(t.service.store.state());for(let i=0;i<12;i++)await t.request('POST','/api/support/contact',{body:{...payload,requestId:randomUUID()}});
 assert.equal((await t.request('POST','/api/support/contact',{body:{...payload,requestId:randomUUID()}})).status,429);
 assert.equal(JSON.stringify(t.service.store.state()),original);
 }finally{await t.close();}
});

test('structured follow-up corrections preserve earlier evidence, cached Mail is read-only and never certifies delivery',{timeout:30000},async()=>{
 const t=await new TestService('care-structured').listen();try{
 const a=await t.unpaidAccount('follow.structured@example.test'),b=await t.unpaidAccount('follow.other@example.test'),care=require('../consumer-care.cjs');
 const caseId=(await t.request('POST','/api/cases',{token:a.token,body:{country:'CA',region:'CA-NS'}})).json.case.case_id;
 const post=body=>t.request('POST',`/api/cases/${caseId}/followup`,{token:a.token,body});
 const input={requestId:randomUUID(),expectedRevision:0,type:'SUBMITTED',occurredAt:Date.now()-1000,note:'Fictional sent record',respondent:'Fictional bureau',submissionMethod:'POST'};
 const first=await post(input);assert.equal(first.status,201,first.text);const old=structuredClone(first.json.events[0]);
 const correction={...input,requestId:randomUUID(),expectedRevision:1,note:'Fictional corrected date',correctsEventId:old.eventId};
 const second=await post(correction);assert.equal(second.status,201,second.text);assert.deepEqual(second.json.events[0],old);assert.equal(second.json.events[1].correctsEventId,old.eventId);assert.equal((await post(correction)).json.duplicate,true);
 assert.equal((await post({...correction,requestId:randomUUID(),expectedRevision:2,correctsEventId:'other-case-event'})).status,404);
 assert.equal((await post({...input,requestId:randomUUID(),expectedRevision:2,submissionMethod:'VERIFIED_CARRIER'})).status,400);
 t.service.store.update(s=>s.packets.push({account_id:a.account_id,case_id:caseId,mailing_internal:[{order:{id:'fictional-order',state:'DELIVERED',payment_state:'VERIFIED'}}],mailing_simulations:[{order:{id:'fictional-simulation',state:'UNKNOWN',paymentState:'UNPAID'}}]},{account_id:b.account_id,case_id:caseId,mailing_internal:[{order:{id:'private-other-order',state:'DELIVERED'}}]}));
 const before=JSON.stringify(t.service.store.state()),view=care.followup(t.service.store,a,caseId);assert.equal(view.mailingHistory.length,2);assert.equal(view.mailingHistory[0].carrierDeliveryVerified,false);assert.equal(view.mailingHistory[0].freshness,'UNKNOWN');assert.equal(view.mailingHistory[1].simulation,true);assert.ok(!JSON.stringify(view).includes('private-other-order'));assert.equal(JSON.stringify(t.service.store.state()),before);
 const summary=care.outcomeSummary(t.service.store);assert.equal(summary.latestConsumerDeclarations.SUBMITTED,1);assert.equal(summary.correctionsIndependentlyVerified,false);assert.ok(!JSON.stringify(summary).includes('Fictional bureau'));assert.equal(JSON.stringify(t.service.store.state()),before);
 }finally{await t.close();}
});
