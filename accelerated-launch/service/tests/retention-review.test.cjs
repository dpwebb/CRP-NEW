'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {retentionPreview,signDeletionReceipt,restoreDeletionReview,digest}=require('../retention-review.cjs');
const now=Date.now(),record={ref:'fictional-id',class:'identification',closedAt:now-100*86400000,references:[],holds:[],linkageVerified:true};
test('retention is review-only; holds, linked/embedded copies and missing policy retained',()=>{
 const policy={approved:true,approvedBy:'fixture',evidence:'fixture-review',classes:{identification:{periodDays:30}}};
 assert.equal(retentionPreview([record],policy,now).records[0].disposition,'CANDIDATE_FOR_REVIEW');
 for(const extra of [{holds:['UNKNOWN_PROVIDER']},{references:['approved-pdf']},{linkageVerified:false},{closedAt:null},{closedAt:now}]){
 assert.equal(retentionPreview([{...record,...extra}],policy,now).records[0].disposition,'RETAIN');}
 assert.equal(retentionPreview([record],{...policy,approved:false},now).records[0].disposition,'RETAIN');
 assert.equal(retentionPreview([record],policy,now).purgeEnabled,false);
});
test('restore review authenticates ordered receipts, preserves input and never activates',()=>{
 const key=crypto.randomBytes(32),state={accounts:[{account_id:'a'},{account_id:'b'}],cases:[{account_id:'a',case_id:'x'},{account_id:'b',case_id:'x'}]},original=JSON.stringify(state);
 const a=signDeletionReceipt({environment:'local',sequence:1,accountId:'a',deletedAt:now},key);
 const b=signDeletionReceipt({environment:'local',sequence:2,accountId:'b',caseId:'x',deletedAt:now,previousHash:digest(a)},key);
 const result=restoreDeletionReview(state,[a,b],{key,environment:'local',now});assert.equal(result.affected.accounts,1);assert.equal(result.affected.cases,2);assert.equal(result.activationAllowed,false);assert.equal(JSON.stringify(state),original);
 for(const receipts of [[b,a],[a,a],[{...a,body:{...a.body,accountId:'b'}}]])assert.throws(()=>restoreDeletionReview(state,receipts,{key,environment:'local',now}),/CUSTODY/);
 assert.throws(()=>restoreDeletionReview(state,[a],{key:crypto.randomBytes(32),environment:'local',now}),/CUSTODY/);
 assert.throws(()=>restoreDeletionReview(state,[a],{key,environment:'production',now}),/CUSTODY/);
 assert.equal(restoreDeletionReview(state,[],{key,environment:'local',now}).authenticatedReceipts,0);
});
