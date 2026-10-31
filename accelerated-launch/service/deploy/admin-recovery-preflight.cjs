'use strict';
// Offline inspection only. Never instantiate AdminStore, claim a writer, or repair data.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {AdminStore,COLLECTIONS}=require('../admin-store.cjs');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function regular(file){const s=fs.lstatSync(file);if(!s.isFile()||s.isSymbolicLink())throw Error('UNSAFE_FILE');return fs.readFileSync(file);}
function directory(dir){const s=fs.lstatSync(dir);if(!s.isDirectory()||s.isSymbolicLink())throw Error('UNSAFE_DIRECTORY');}
function probe(pid){
  try{process.kill(pid,0);}catch(e){if(e.code==='ESRCH')return {alive:false};return {alive:true,identity:null};}
  try{const boot=fs.readFileSync('/proc/sys/kernel/random/boot_id','utf8').trim(),stat=fs.readFileSync(`/proc/${pid}/stat`,'utf8'),start=stat.slice(stat.lastIndexOf(')')+2).split(/\s+/)[19];if(!/^[a-f0-9-]{36}$/.test(boot)||!/^\d+$/.test(start))throw Error();return {alive:true,identity:{boot,start}};}catch{return {alive:true,identity:null};}
}
function inspect({dataDir,expectedSourceSha256},dependencies={}){
  const blockers=[],writers=[];let journalRecords=0,sourceBound=false,journalValid=false;
  try{
    if(!path.isAbsolute(dataDir)||! /^[a-f0-9]{64}$/i.test(expectedSourceSha256||''))throw Error('TARGET_BINDING_REQUIRED');
    // Refuse symlink traversal, including ancestor aliases. Caller selects the canonical private path.
    let ancestor=path.resolve(dataDir);for(;;){directory(ancestor);const parent=path.dirname(ancestor);if(parent===ancestor)break;ancestor=parent;}
    sourceBound=hash(regular(path.join(__dirname,'../admin-store.cjs'))).toLowerCase()===expectedSourceSha256.toLowerCase();
    if(!sourceBound)throw Error('SOURCE_MISMATCH');
    const admin=path.join(dataDir,'admin');directory(admin);directory(path.join(admin,'journal'));directory(path.join(admin,'writers'));
    const key=regular(path.join(admin,'.integrity-key'));if(key.length!==32)throw Error('KEY_INVALID');
    const signature=value=>crypto.createHmac('sha256',key).update(JSON.stringify(value)).digest('hex');
    if(regular(path.join(admin,'.initialized')).toString()!=='CRP_ADMIN_STORE_INITIALIZED\n')throw Error('INITIALIZATION_INVALID');
    const files=fs.readdirSync(path.join(admin,'journal')).filter(n=>n.endsWith('.json')).sort();
    let previous=null,state={version:1,bootstrapped_at:null,...Object.fromEntries(COLLECTIONS.map(k=>[k,[]]))};const hashes=[];
    files.forEach((name,i)=>{if(name!==String(i+1).padStart(9,'0')+'.json')throw Error('JOURNAL_SEQUENCE');const bytes=regular(path.join(admin,'journal',name)),r=JSON.parse(bytes),payload={sequence:r.sequence,previous_sha256:r.previous_sha256,state:r.state};if(r.sequence!==i+1||r.previous_sha256!==previous||signature(payload)!==r.hmac)throw Error('JOURNAL_SIGNATURE');AdminStore.prototype.validate.call({signature},r.state,state);state=r.state;previous=hash(bytes);hashes.push(previous);});
    const h=JSON.parse(regular(path.join(admin,'.head'))),payload={version:h.version,sequence:h.sequence,journal_sha256:h.journal_sha256};
    if(h.version!==1||!Number.isInteger(h.sequence)||h.sequence<1||h.sequence>files.length||signature(payload)!==h.hmac||hashes[h.sequence-1]!==h.journal_sha256)throw Error('ACKNOWLEDGED_HEAD_INVALID');
    journalRecords=files.length;journalValid=true;
    if(h.sequence!==files.length)blockers.push('UNPUBLISHED_JOURNAL_TAIL_REVIEW_REQUIRED');
    for(const name of fs.readdirSync(path.join(admin,'writers')).filter(n=>n.endsWith('.json'))){
      const row=JSON.parse(regular(path.join(admin,'writers',name)));
      if(!Number.isInteger(row.pid)||row.pid<1||typeof row.token!=='string')throw Error('WRITER_MALFORMED');
      if(row.identity!=null&&(typeof row.identity!=='object'||Object.keys(row.identity).sort().join(',')!=='boot,start'||!/^[a-f0-9-]{36}$/.test(row.identity.boot||'')||!/^\d+$/.test(row.identity.start||'')))throw Error('WRITER_IDENTITY_MALFORMED');
      const current=(dependencies.probe||probe)(row.pid);let status;
      if(!current.alive)status='DEAD_PROCESS_CLAIM';
      else if(!row.identity)status='AMBIGUOUS_LEGACY_LIVE_PID';
      else if(!current.identity)status='LIVE_IDENTITY_UNAVAILABLE';
      else status=row.identity.boot===current.identity.boot&&row.identity.start===current.identity.start?'LIVE_WRITER':'STALE_IDENTITY_CLAIM';
      writers.push({status});if(['LIVE_WRITER','AMBIGUOUS_LEGACY_LIVE_PID','LIVE_IDENTITY_UNAVAILABLE'].includes(status))blockers.push(status);
    }
  }catch(e){blockers.push(/^[A-Z_]+$/.test(e.message)?e.message:'ADMIN_EVIDENCE_INVALID');}
  return {readOnly:true,sourceBound,journalValid,journalRecords,writers,blockers:[...new Set(blockers)],offlineOpenEligible:blockers.length===0,repairPerformed:false};
}
module.exports={inspect};
if(require.main===module){let result;try{if(process.argv.length!==4)throw Error();result=inspect({dataDir:process.argv[2],expectedSourceSha256:process.argv[3]});}catch{result={readOnly:true,offlineOpenEligible:false,blockers:['USAGE_REQUIRES_CANONICAL_DATA_DIR_AND_ADMIN_SOURCE_SHA256']};}process.stdout.write(JSON.stringify(result)+'\n');if(!result.offlineOpenEligible)process.exitCode=2;}
