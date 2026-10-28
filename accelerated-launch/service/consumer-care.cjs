'use strict';
const crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path');
const {ServiceError}=require('./errors.cjs'),cases=require('./cases.cjs');
const invalid=()=>{throw new ServiceError('INVALID_REQUEST');};
function fields(b,n){if(!b||typeof b!=='object'||Array.isArray(b)||Object.keys(b).some(k=>!n.includes(k)))invalid();}
function text(s,max=1500){if(typeof s!=='string'||!s.trim()||s.length>max||/[\u0000-\u0008]/.test(s))invalid();return s.trim();}
function requestId(s){if(typeof s!=='string'||!/^[A-Za-z0-9_-]{8,100}$/.test(s))invalid();return s;}
const sha=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const id=p=>p+'_'+crypto.randomBytes(12).toString('hex');
function account(state,actor){const row=state.accounts.find(a=>a.account_id===actor?.account_id);if(!row)throw new ServiceError('NOT_AUTHORIZED');return row;}
function createTicket(store,actor,b,now=Date.now()){
 fields(b,['requestId','category','message']);requestId(b.requestId);text(b.message);
 if(!['support','billing','complaint','privacy'].includes(b.category))invalid();
 return store.update(s=>{const a=account(s,actor),rows=a.service_requests||[],hash=sha(b),old=rows.find(t=>t.requestId===b.requestId);
 if(old){if(old.requestHash!==hash)throw new ServiceError('CARE_REVISION_CHANGED');return {ticket:structuredClone(old),duplicate:true};}
 if(rows.length>=100||rows.filter(t=>now-t.createdAt<60000).length>=3)throw new ServiceError('CARE_RATE_LIMITED');
 const ticket={ticketId:id('help'),requestId:b.requestId,requestHash:hash,category:b.category,message:b.message.trim(),createdAt:now,revision:1,status:'OPEN',owner:null,nextUpdateAt:null,
  complaintDeadline:null,complaintClockBasis:'NOT_CONFIGURED',events:[]};
 rows.push(ticket);a.service_requests=rows;return {ticket:structuredClone(ticket),message:'Your request is saved. No email or report was sent.'};});
}
function tickets(store,actor){return structuredClone(account(store.state(),actor).service_requests||[]);}
function publicFile(store){return path.join(store.dataDir,'support-inquiries.json');}
function publicTickets(store){
 try{const p=publicFile(store),stat=fs.lstatSync(p);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>4*1024*1024)throw Error('SUPPORT_INTAKE_REFUSED');
 const data=JSON.parse(fs.readFileSync(p,'utf8'));if(data.version!==1||!Array.isArray(data.items))throw Error('SUPPORT_INTAKE_REFUSED');return data.items;
 }catch(e){if(e.code==='ENOENT')return [];throw e;}
}
function contact(store,b,now=Date.now()){
 fields(b,['requestId','email','category','message']);requestId(b.requestId);text(b.message);if(typeof b.email!=='string'||b.email.length>254||!/^\S+@\S+\.\S+$/.test(b.email)||!['signin','support','complaint','privacy'].includes(b.category))invalid();
 const rows=publicTickets(store),hash=sha(b),old=rows.find(t=>t.requestId===b.requestId);
 if(old){if(old.requestHash!==hash)throw new ServiceError('CARE_REVISION_CHANGED');return {received:true};}
 if(rows.length>=1000)throw new ServiceError('CARE_RATE_LIMITED');
 // A separate additive file survives old-code rollback; no consumer account is created or enumerated.
 rows.push({ticketId:id('contact'),requestId:b.requestId,requestHash:hash,email:b.email.trim(),category:b.category,message:b.message.trim(),createdAt:now,status:'OPEN',owner:null,revision:1,events:[]});
 const p=publicFile(store),temp=p+'.'+crypto.randomUUID()+'.tmp',fd=fs.openSync(temp,'wx',0o600);
 try{fs.writeFileSync(fd,JSON.stringify({version:1,items:rows}));fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
 fs.renameSync(temp,p);return {received:true};
}
function reviewPublicTicket(store,actor,ticketId,b,now){
 const rows=publicTickets(store),row=rows.find(t=>t.ticketId===ticketId);if(!row)throw new ServiceError('NOT_FOUND');
 const hash=sha(b),old=row.events.find(e=>e.requestId===b.requestId);
 if(old){if(old.requestHash!==hash)throw new ServiceError('CARE_REVISION_CHANGED');return {ticket:structuredClone(row),duplicate:true};}
 if(row.revision!==b.expectedRevision)throw new ServiceError('CARE_REVISION_CHANGED');if(row.events.length>=100)throw new ServiceError('CARE_RATE_LIMITED');
 row.events.push({requestId:b.requestId,requestHash:hash,actor:actor.account_id,at:now,status:b.status,message:b.message.trim(),nextUpdateAt:b.nextUpdateAt});
 row.status=b.status;row.owner=actor.account_id;row.nextUpdateAt=b.nextUpdateAt;row.revision++;
 const p=publicFile(store),temp=p+'.'+crypto.randomUUID()+'.tmp',fd=fs.openSync(temp,'wx',0o600);
 try{fs.writeFileSync(fd,JSON.stringify({version:1,items:rows}));fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
 fs.renameSync(temp,p);return {ticket:structuredClone(row),outgoingMessageSent:false};
}
function queue(store){
 return [...store.state().accounts.flatMap(a=>(a.service_requests||[]).map(t=>({...t,accountId:a.account_id}))),
 ...publicTickets(store).map(t=>({...t,accountId:null}))].map(t=>{const {requestHash,requestId,...safe}=t;return safe;});
}
function reviewTicket(store,actor,ticketId,b,now=Date.now()){
 fields(b,['requestId','expectedRevision','status','message','nextUpdateAt']);requestId(b.requestId);text(b.message);
 if(!Number.isInteger(b.expectedRevision)||!['OPEN','ACKNOWLEDGED','RESOLVED'].includes(b.status)||!Number.isSafeInteger(b.nextUpdateAt)||b.nextUpdateAt<now||b.nextUpdateAt>now+90*86400000)invalid();
 if(!store.state().accounts.some(a=>(a.service_requests||[]).some(t=>t.ticketId===ticketId)))return reviewPublicTicket(store,actor,ticketId,b,now);
 return store.update(s=>{const row=s.accounts.flatMap(a=>a.service_requests||[]).find(t=>t.ticketId===ticketId);if(!row)throw new ServiceError('NOT_FOUND');
 const hash=sha(b),old=row.events.find(e=>e.requestId===b.requestId);if(old){if(old.requestHash!==hash)throw new ServiceError('CARE_REVISION_CHANGED');return {ticket:structuredClone(row),duplicate:true};}
 if(row.revision!==b.expectedRevision)throw new ServiceError('CARE_REVISION_CHANGED');
 if(row.events.length>=100)throw new ServiceError('CARE_RATE_LIMITED');
 row.events.push({requestId:b.requestId,requestHash:hash,actor:actor.account_id,at:now,status:b.status,message:b.message.trim(),nextUpdateAt:b.nextUpdateAt});
 row.status=b.status;row.owner=actor.account_id;row.nextUpdateAt=b.nextUpdateAt;row.revision++;return {ticket:structuredClone(row)};});
}
const followTypes=['SUBMITTED','RECEIPT_RECORDED','RESPONSE_RECEIVED','UNCHANGED','RESOLVED','UNCERTAIN','NOTE'];
function mailingHistory(state,actor,caseId){
 const history=[];
 for(const packet of state.packets.filter(p=>p.account_id===actor.account_id&&p.case_id===caseId))for(const [field,simulation]of [['mailing_internal',false],['mailing_simulations',true]]){
  for(const r of packet[field]||[])if(r.order)history.push({orderId:r.order.id||r.order_id||null,state:r.order.state||'UNKNOWN',paymentState:r.order.payment_state||r.order.paymentState||'UNKNOWN',
   simulation,evidenceClass:simulation?'SIMULATED_MAIL_STATE':'CACHED_NATIVE_MAIL_STATE',observedAt:null,freshness:'UNKNOWN',providerAcceptanceVerified:false,carrierDeliveryVerified:false,bureauResponseVerified:false});
 }
 return history.slice(-100);
}
function followup(store,actor,caseId){const c=cases.requireOwnedCase(store,actor,caseId);return {events:structuredClone(c.care_events||[]),revision:(c.care_events||[]).length,mailingHistory:mailingHistory(store.state(),actor,caseId),
 evidenceLabel:'These entries were recorded by you. They do not verify posting, delivery or correction.',legalDeadline:null,automaticAction:false};}
function addFollowup(store,actor,caseId,b,now=Date.now()){
 cases.requireOwnedCase(store,actor,caseId);fields(b,['requestId','expectedRevision','type','occurredAt','note','documentId','nextReviewAt','respondent','submissionMethod','correctsEventId']);requestId(b.requestId);text(b.note,1000);
 if(b.respondent!=null)text(b.respondent,120);
 if(b.submissionMethod!=null&&!['POST','ONLINE','PHONE','OTHER','UNKNOWN'].includes(b.submissionMethod))invalid();
 if(b.correctsEventId!=null&&(typeof b.correctsEventId!=='string'||b.correctsEventId.length>100))invalid();
 if(!followTypes.includes(b.type)||!Number.isInteger(b.expectedRevision)||!Number.isSafeInteger(b.occurredAt)||b.occurredAt<=0||b.occurredAt>now||
 b.nextReviewAt!=null&&(!Number.isSafeInteger(b.nextReviewAt)||b.nextReviewAt<now||b.nextReviewAt>now+365*86400000))invalid();
 return store.update(s=>{const c=s.cases.find(c=>c.account_id===actor.account_id&&c.case_id===caseId);if(!c)throw new ServiceError('NOT_FOUND');
 const rows=c.care_events||[],hash=sha(b),old=rows.find(e=>e.requestId===b.requestId);
 if(old){if(old.requestHash!==hash)throw new ServiceError('CARE_REVISION_CHANGED');return {events:structuredClone(rows),revision:rows.length,duplicate:true};}
 if(rows.length!==b.expectedRevision)throw new ServiceError('CARE_REVISION_CHANGED');if(rows.length>=200)throw new ServiceError('CARE_RATE_LIMITED');
 if(b.correctsEventId&&!rows.some(e=>e.eventId===b.correctsEventId))throw new ServiceError('NOT_FOUND');
 if(b.documentId){const file=s.files.find(f=>f.file_id===b.documentId&&f.account_id===actor.account_id&&f.stored_blob!==false);if(!file)throw new ServiceError('NOT_FOUND');}
 rows.push({eventId:id('follow'),requestId:b.requestId,requestHash:hash,type:b.type,occurredAt:b.occurredAt,recordedAt:now,note:b.note.trim(),documentId:b.documentId||null,
 nextReviewAt:b.nextReviewAt||null,respondent:b.respondent?.trim()||null,submissionMethod:b.submissionMethod||'UNKNOWN',evidenceClass:'CONSUMER_RECORDED',correctsPriorEvent:!!b.correctsEventId,correctsEventId:b.correctsEventId||null});
 c.care_events=rows;return {events:structuredClone(rows),revision:rows.length,automaticAction:false};});
}
function coverageReceipt(store,actor,caseId){
 cases.requireOwnedCase(store,actor,caseId);
 const results=store.state().results.filter(r=>r.account_id===actor.account_id&&r.case_id===caseId),r=results.at(-1);
 const performed=r?.evaluation?.common_errors?.performed;
 return {resultId:r?.result_id||null,reportSuppliedBy:'consumer',scope:'Recorded checks only; not a complete legal review.',checks:Array.isArray(performed)?performed.map(p=>({checkId:p.check_id})):[],
  checkInventoryAvailable:Array.isArray(performed),sourceLinkedRecords:r?.extraction?.records?.length??null,
  noIssueMeans:'We did not find a supported issue in what we could review. Other information or checks may be missing.',automaticMonitoring:false};
}
function outcomeSummary(store,now=Date.now()){
 const state=store.state(),items=queue(store),open=items.filter(t=>t.status!=='RESOLVED'),age=t=>Math.max(0,now-t.createdAt),outcomes={};
 let withFacts=0,inventoryAvailable=0;const latest=new Map();for(const r of state.results)latest.set(r.account_id+'\0'+r.case_id,r);
 for(const c of state.cases){const result=latest.get(c.account_id+'\0'+c.case_id);
  if(Array.isArray(result?.extraction?.records)&&result.extraction.records.length)withFacts++;
  if(Array.isArray(result?.evaluation?.common_errors?.performed))inventoryAvailable++;
  const declaration=(c.care_events||[]).at(-1)?.type||'NOT_RECORDED';outcomes[declaration]=(outcomes[declaration]||0)+1;
 }
 return {version:1,observedAt:now,scope:'AUTHORIZED_CONSUMER_STORE_ONLY',support:{total:items.length,open:open.length,unowned:open.filter(t=>!t.owner).length,
  nextUpdatePassed:open.filter(t=>Number.isSafeInteger(t.nextUpdateAt)&&t.nextUpdateAt<now).length,ageBuckets:{underOneDay:open.filter(t=>age(t)<86400000).length,oneToSevenDays:open.filter(t=>age(t)>=86400000&&age(t)<7*86400000).length,sevenDaysOrMore:open.filter(t=>age(t)>=7*86400000).length}},
  reading:{cases:state.cases.length,casesWithExtractedRecords:withFacts,casesWithRecordedCheckInventory:inventoryAvailable,unassessedOrNoExtractedRecords:state.cases.length-withFacts},
  latestConsumerDeclarations:outcomes,correctionsIndependentlyVerified:false,complaintDeadlinesConfigured:false,
  limits:'Store-wide counts may include local/test records. Source facts are not finding accuracy; consumer declarations are not verified corrections. Age buckets and next updates are not legal deadlines or an SLA.'};
}
module.exports={createTicket,tickets,contact,queue,reviewTicket,followup,addFollowup,coverageReceipt,outcomeSummary};

