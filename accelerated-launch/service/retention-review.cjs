'use strict';
const crypto=require('node:crypto');
const digest=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
function retentionPreview(records,policy,now=Date.now()){
 if(!Array.isArray(records)||records.length>100000)throw Error('INVALID_RETENTION_INVENTORY');
 return {dryRun:true,purgeEnabled:false,policyApproved:policy?.approved===true,
  records:records.map(r=>{
   const period=policy?.classes?.[r.class]?.periodDays,reasons=[];
   if(typeof r.ref!=='string'||!r.ref||!Array.isArray(r.references)||!Array.isArray(r.holds))throw Error('INVALID_RETENTION_RECORD');
   if(policy?.approved!==true||!policy.approvedBy||!policy.evidence)reasons.push('POLICY_NOT_APPROVED');
   if(!Number.isSafeInteger(period)||period<1)reasons.push('PERIOD_UNDECIDED');
   if(r.linkageVerified!==true)reasons.push('REFERENCE_INVENTORY_UNVERIFIED');
   if(r.references.length)reasons.push('LINKED_OR_EMBEDDED_COPY');
   if(r.holds.length)reasons.push('ACTIVE_HOLD');
   if(!Number.isSafeInteger(r.closedAt)||r.closedAt<=0||r.closedAt>now)reasons.push('NO_CONFIRMED_FINAL_DATE');
   else if(Number.isSafeInteger(period)&&now-r.closedAt<period*86400000)reasons.push('WITHIN_PERIOD');
   return {ref:r.ref,class:r.class,disposition:reasons.length?'RETAIN':'CANDIDATE_FOR_REVIEW',reasons};
  })};
}
function signDeletionReceipt({environment,sequence,accountId,caseId=null,deletedAt,previousHash=null},key){
 if(!Buffer.isBuffer(key)||key.length<32||!['local','staging','production'].includes(environment)||!Number.isSafeInteger(sequence)||sequence<1||
 typeof accountId!=='string'||!accountId||caseId!==null&&typeof caseId!=='string'||!Number.isSafeInteger(deletedAt)||deletedAt<=0)throw Error('INVALID_DELETION_RECEIPT');
 const body={version:1,environment,sequence,accountId,caseId,deletedAt,previousHash};
 return {body,mac:crypto.createHmac('sha256',key).update(JSON.stringify(body)).digest('hex')};
}
// No persistence/deletion entry point: review only, on a separately restored copy.
function restoreDeletionReview(state,receipts,{key,environment,now=Date.now()}){
 if(!Buffer.isBuffer(key)||key.length<32||!Array.isArray(receipts)||!['local','staging','production'].includes(environment))throw Error('INVALID_RESTORE_REVIEW');
 let previousHash=null,sequence=0;const accounts=new Set(),cases=new Set();
 for(const r of receipts){
  const b=r?.body,expected=crypto.createHmac('sha256',key).update(JSON.stringify(b||null)).digest('hex');
  if(!b||!/^([a-f0-9]{64})$/.test(r.mac||'')||!crypto.timingSafeEqual(Buffer.from(expected,'hex'),Buffer.from(r.mac,'hex'))||
    b.version!==1||b.environment!==environment||b.sequence!==sequence+1||b.previousHash!==previousHash||!Number.isSafeInteger(b.deletedAt)||b.deletedAt>now)throw Error('DELETION_CUSTODY_REFUSED');
  previousHash=digest(r);sequence=b.sequence;if(b.caseId===null)accounts.add(b.accountId);else cases.add(b.accountId+'\0'+b.caseId);
 }
 const affected={};
 for(const [collection,rows]of Object.entries(state))if(Array.isArray(rows))affected[collection]=rows.filter(r=>accounts.has(r.account_id)||cases.has(r.account_id+'\0'+r.case_id)).length;
 return {dryRun:true,activationAllowed:false,authenticatedReceipts:sequence,affected,sourceChanged:false,
  nextAction:sequence?'Review deletion reconciliation and blob references on an isolated restore before opening a service.':'Obtain current authenticated deletion custody; an empty receipt list does not prove erasure.'};
}
module.exports={retentionPreview,signDeletionReceipt,restoreDeletionReview,digest};
