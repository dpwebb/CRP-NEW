// Recovery-only authenticated whole snapshot; no application credentials are used.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { pathToFileURL } from 'node:url';
const magic=Buffer.from('CRP-STAGING-RECOVERY-V1\n');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const refuse=()=>{throw Error('BACKUP_AUTHENTICATION_REFUSED');};
export function inventory(root) {
  const entries=[];
  function walk(dir,rel='') {for(const name of fs.readdirSync(dir).sort()){
    const file=path.join(dir,name),key=rel?rel+'/'+name:name,s=fs.lstatSync(file);
    if(s.isSymbolicLink()||(!s.isFile()&&!s.isDirectory()))refuse();
    if(s.isDirectory()){entries.push({path:key,type:'directory',mode:s.mode&0o777});walk(file,key);}
    else {const bytes=fs.readFileSync(file);entries.push({path:key,type:'file',mode:s.mode&0o777,size:bytes.length,sha256:sha(bytes),bytes:bytes.toString('base64')});}
  }}walk(root);return entries;
}
export function manifest(entries){return entries.map(({bytes,...metadata})=>metadata);}
export function seal(entries,key){
  if(key.length!==32)refuse();const iv=crypto.randomBytes(12),c=crypto.createCipheriv('aes-256-gcm',key,iv);c.setAAD(magic);
  const bytes=zlib.gzipSync(Buffer.from(JSON.stringify({version:1,entries}))),ciphertext=Buffer.concat([c.update(bytes),c.final()]);
  return Buffer.concat([magic,iv,c.getAuthTag(),ciphertext]);
}
export function recover(ciphertext,key,expected){
  if(key.length!==32||!ciphertext.subarray(0,magic.length).equals(magic)||ciphertext.length>1024**3)refuse();
  let payload;try{const d=crypto.createDecipheriv('aes-256-gcm',key,ciphertext.subarray(magic.length,magic.length+12));d.setAAD(magic);d.setAuthTag(ciphertext.subarray(magic.length+12,magic.length+28));payload=JSON.parse(zlib.gunzipSync(Buffer.concat([d.update(ciphertext.subarray(magic.length+28)),d.final()]),{maxOutputLength:1024**3}));}catch{refuse();}
  if(payload.version!==1||!Array.isArray(payload.entries)||JSON.stringify(manifest(payload.entries))!==JSON.stringify(expected))refuse();
  const files=new Map(),seen=new Set();for(const e of payload.entries){
    if(!e.path||e.path.startsWith('/')||e.path.includes('\\')||e.path.split('/').some(x=>!x||x==='.'||x==='..')||seen.has(e.path)||!Number.isInteger(e.mode)||e.mode<0||e.mode>0o777)refuse();seen.add(e.path);
    if(e.type==='file'){const bytes=Buffer.from(e.bytes,'base64');if(bytes.length!==e.size||sha(bytes)!==e.sha256)refuse();files.set(e.path,bytes);}else if(e.type!=='directory')refuse();
  }
  const keyBytes=files.get('data/admin/.integrity-key');if(keyBytes?.length!==32)refuse();
  const sign=value=>crypto.createHmac('sha256',keyBytes).update(JSON.stringify(value)).digest('hex');
  const journal=[...files.keys()].filter(x=>/^data\/admin\/journal\/\d{9}\.json$/.test(x)).sort();if(!journal.length)refuse();
  let previous=null,lastState;for(let i=0;i<journal.length;i++){
    if(journal[i]!=='data/admin/journal/'+String(i+1).padStart(9,'0')+'.json')refuse();const raw=files.get(journal[i]),r=JSON.parse(raw);
    if(r.sequence!==i+1||r.previous_sha256!==previous||sign({sequence:r.sequence,previous_sha256:r.previous_sha256,state:r.state})!==r.hmac)refuse();previous=sha(raw);lastState=r.state;
  }
  const head=JSON.parse(files.get('data/admin/.head'));if(head.sequence!==journal.length||head.journal_sha256!==previous||sign({version:head.version,sequence:head.sequence,journal_sha256:head.journal_sha256})!==head.hmac)refuse();
  if(JSON.stringify(JSON.parse(files.get('data/admin/state.json')))!==JSON.stringify(lastState))refuse();
  let auditHmac=null;for(let i=0;i<lastState.audit_events.length;i++){const {hmac,...event}=lastState.audit_events[i];if(event.sequence!==i+1||event.previous_hmac!==auditHmac||sign(event)!==hmac)refuse();auditHmac=hmac;}
  return {passed:true,files:files.size,entries:payload.entries.length,adminJournalRecords:journal.length,auditEvents:lastState.audit_events.length,wholeManifestExact:true,nativeSignedJournalAuthenticated:true,plaintextWrittenToDisk:false};
}
if(process.argv[1]&&pathToFileURL(fs.realpathSync(process.argv[1])).href===import.meta.url){
  try{
    const [mode,context]=process.argv.slice(2),c=JSON.parse(fs.readFileSync(context)),key=fs.readFileSync(c.key);
    if(mode==='pack'){const entries=inventory(c.snapshot);fs.writeFileSync(c.output,seal(entries,key),{flag:'wx',mode:0o600});fs.writeFileSync(c.manifest,JSON.stringify(manifest(entries)),{flag:'wx',mode:0o600});console.log(JSON.stringify(recover(fs.readFileSync(c.output),key,manifest(entries))));}
    else if(mode==='verify'){console.log(JSON.stringify(recover(fs.readFileSync(c.backup),key,JSON.parse(fs.readFileSync(c.manifest)))));}
    else refuse();
  }catch{console.error('BACKUP_AUTHENTICATION_REFUSED');process.exitCode=1;}
}
