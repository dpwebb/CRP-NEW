'use strict';
// Offline custody primitive. No application delete, purge, blob rewrite or listener.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const mac=(x,key)=>crypto.createHmac('sha256',key).update(JSON.stringify(x)).digest('hex');
const hex=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const ident=x=>typeof x==='string'&&/^[A-Za-z0-9_-]{1,120}$/.test(x);
function requireKey(key){if(!Buffer.isBuffer(key)||key.length<32)throw Error('CUSTODY_KEY_REQUIRED');}
function sameMac(value,expected){return hex(value)&&crypto.timingSafeEqual(Buffer.from(value,'hex'),Buffer.from(expected,'hex'));}
function directory(dir){const s=fs.lstatSync(dir);if(!s.isDirectory()||s.isSymbolicLink())throw Error('CUSTODY_DIRECTORY_REFUSED');}
function read(dir,key,environment){
 requireKey(key);if(!['local','staging','production'].includes(environment))throw Error('CUSTODY_IDENTITY_REFUSED');directory(dir);const file=path.join(dir,'deletion-custody.json'),s=fs.lstatSync(file);
 if(!s.isFile()||s.isSymbolicLink()||s.size>8*1024*1024)throw Error('CUSTODY_FILE_REFUSED');
 const journal=JSON.parse(fs.readFileSync(file,'utf8'));if(journal.version!==1||journal.environment!==environment||!Array.isArray(journal.entries)||journal.entries.length>10000)throw Error('CUSTODY_IDENTITY_REFUSED');
 let previousHash=null,sequence=0;const requests=new Set();
 for(const e of journal.entries){const b=e?.body;
  if(!b||b.version!==1||!ident(b.requestId)||requests.has(b.requestId)||!ident(b.accountId)||b.caseId!==null&&!ident(b.caseId)||!hex(b.evidenceHash)||
   !Number.isSafeInteger(b.deletedAt)||b.deletedAt<=0||b.environment!==environment||b.sequence!==++sequence||b.previousHash!==previousHash||!sameMac(e.mac,mac(b,key)))throw Error('CUSTODY_CHAIN_REFUSED');
  previousHash=hash(e);requests.add(b.requestId);
 }
 return journal;
}
function anchor(journal,key){const body={version:1,environment:journal.environment,sequence:journal.entries.length,head:journal.entries.length?hash(journal.entries.at(-1)):null};return {body,mac:mac(body,key)};}
function write(dir,journal){const p=path.join(dir,'deletion-custody.json'),tmp=p+'.'+crypto.randomUUID()+'.tmp',fd=fs.openSync(tmp,'wx',0o600);try{fs.writeFileSync(fd,JSON.stringify(journal));fs.fsyncSync(fd);}finally{fs.closeSync(fd);}fs.renameSync(tmp,p);}
function locked(dir,fn){directory(dir);const lock=path.join(dir,'deletion-custody.writer');try{fs.mkdirSync(lock,{mode:0o700});}catch{throw Error('CUSTODY_WRITER_BUSY');}try{return fn();}finally{fs.rmdirSync(lock);}}
function initialize(dir,{key,environment}){
 requireKey(key);if(!['local','staging','production'].includes(environment))throw Error('CUSTODY_IDENTITY_REFUSED');
 return locked(dir,()=>{const file=path.join(dir,'deletion-custody.json');let present=false;try{fs.lstatSync(file);present=true;}catch(e){if(e.code!=='ENOENT')throw e;}if(present)throw Error('CUSTODY_ALREADY_EXISTS');const j={version:1,environment,entries:[]};write(dir,j);return anchor(j,key);});
}
function append(dir,input,{key,environment,now=Date.now()}){
 requireKey(key);if(!input||Object.keys(input).some(k=>!['requestId','accountId','caseId','deletedAt','evidenceHash'].includes(k))||!ident(input.requestId)||!ident(input.accountId)||input.caseId!=null&&!ident(input.caseId)||!hex(input.evidenceHash)||!Number.isSafeInteger(input.deletedAt)||input.deletedAt<=0||input.deletedAt>now)throw Error('CUSTODY_INPUT_REFUSED');
 return locked(dir,()=>{const j=read(dir,key,environment),payload={requestId:input.requestId,accountId:input.accountId,caseId:input.caseId??null,deletedAt:input.deletedAt,evidenceHash:input.evidenceHash},old=j.entries.find(e=>e.body.requestId===input.requestId);
  if(old){if(Object.keys(payload).some(k=>old.body[k]!==payload[k]))throw Error('CUSTODY_REQUEST_COLLISION');return {duplicate:true,anchor:anchor(j,key)};}
  if(j.entries.length>=10000)throw Error('CUSTODY_CAPACITY_REVIEW_REQUIRED');
  const body={...payload,version:1,environment,sequence:j.entries.length+1,previousHash:j.entries.length?hash(j.entries.at(-1)):null};j.entries.push({body,mac:mac(body,key)});write(dir,j);return {duplicate:false,anchor:anchor(j,key)};
 });
}
function restoreGate(dir,state,{key,environment,expectedAnchor,now=Date.now()}){
 const j=read(dir,key,environment),actual=anchor(j,key),expected=expectedAnchor;
 if(!expected?.body||!sameMac(expected.mac,mac(expected.body,key))||JSON.stringify(expected.body)!==JSON.stringify(actual.body))throw Error('CURRENT_INDEPENDENT_ANCHOR_REQUIRED');
 if(j.entries.some(e=>e.body.deletedAt>now))throw Error('CUSTODY_FUTURE_RECEIPT');
 const deletedAccounts=new Set(j.entries.filter(e=>e.body.caseId===null).map(e=>e.body.accountId)),deletedCases=new Set(j.entries.filter(e=>e.body.caseId!==null).map(e=>e.body.accountId+'\0'+e.body.caseId));
 const affected={};for(const [name,rows]of Object.entries(state))if(Array.isArray(rows))affected[name]=rows.filter(r=>deletedAccounts.has(r.account_id)||deletedCases.has(r.account_id+'\0'+r.case_id)).length;
 const blocked=Object.values(affected).some(n=>n>0);
 return {deletionIdentifiersAbsent:!blocked,serviceOpeningAllowed:false,requiresCurrentIndependentAnchor:true,affected,authenticatedReceipts:j.entries.length,
  sourceChanged:false,blobErasureVerified:false,embeddedCopyErasureVerified:false,policyEnforcementEnabled:false,
  nextAction:blocked?'Keep the restore offline; reconcile rows, approved/embedded copies and blobs under approved deletion authority.':'No deleted identifiers reappeared in supplied rows. Verify complete blob/config inventory and other recovery gates before opening any service.'};
}
module.exports={initialize,append,read,restoreGate};
