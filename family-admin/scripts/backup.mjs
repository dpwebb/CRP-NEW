import {createCipheriv,createDecipheriv,randomBytes,createHash} from 'node:crypto';
import {readFileSync,writeFileSync,existsSync,lstatSync,mkdirSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {Journal} from '../src/journal.mjs';

const hash=b=>createHash('sha256').update(b).digest('hex');
const names=['config.json','audit/integrity.key','audit/audit.jsonl'];
const ordinary=p=>{const s=lstatSync(p);if(!s.isFile()||s.isSymbolicLink())throw Error('BACKUP_ORDINARY_FILE_REQUIRED');return s;};
function keyfile(path) {const s=ordinary(path);if(process.platform!=='win32'&&(s.mode&0o777)!==0o600)throw Error('BACKUP_KEY_PRIVATE_MODE_REQUIRED');const key=readFileSync(path);if(key.length!==32)throw Error('BACKUP_KEY_INVALID');return key;}
export function pack({config,audit,key,output,release}) {
  if(existsSync(join(audit,'process.lock')))throw Error('STOP_FAMILY_ADMIN_BEFORE_BACKUP');
  if(!/^crp-family-[a-f0-9]{20}$/.test(release))throw Error('BACKUP_RELEASE_REQUIRED');
  // Opening the existing journal validates its HMAC chain; no events are appended.
  for(const p of [join(audit,'integrity.key'),join(audit,'audit.jsonl')])ordinary(p);
  const journal=new Journal(audit);journal.close();
  const sources=[config,join(audit,'integrity.key'),join(audit,'audit.jsonl')];
  const files=sources.map((p,i)=>{const s=ordinary(p),bytes=readFileSync(p),mode=process.platform==='win32'?0o600:s.mode&0o777;
    if(!(i===0?[0o600,0o640]:[0o600]).includes(mode))throw Error('BACKUP_PRIVATE_MODE_REQUIRED');
    return{path:names[i],mode,sha256:hash(bytes),data:bytes.toString('base64')};});
  const payload=gzipSync(Buffer.from(JSON.stringify({schema:1,release,files})));
  const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',keyfile(key),iv);
  const encrypted=Buffer.concat([cipher.update(payload),cipher.final()]);
  const bytes=Buffer.concat([Buffer.from('CRPFAM01'),iv,cipher.getAuthTag(),encrypted]);
  writeFileSync(output,bytes,{flag:'wx',mode:0o600});
  return {release,backupHash:hash(bytes),files:files.map(({path,mode,sha256})=>({path,mode,sha256}))};
}
export function recover({backup,key,destination}) {
  if(existsSync(destination))throw Error('RECOVERY_DESTINATION_EXISTS');
  const bytes=readFileSync(backup);
  if(bytes.length<37||bytes.length>100*1024*1024||bytes.subarray(0,8).toString()!=='CRPFAM01')throw Error('BACKUP_FORMAT_INVALID');
  const decipher=createDecipheriv('aes-256-gcm',keyfile(key),bytes.subarray(8,20));decipher.setAuthTag(bytes.subarray(20,36));
  const zipped=Buffer.concat([decipher.update(bytes.subarray(36)),decipher.final()]);
  const payload=JSON.parse(gunzipSync(zipped,{maxOutputLength:100*1024*1024}).toString('utf8'));
  if(payload.schema!==1||!/^crp-family-[a-f0-9]{20}$/.test(payload.release)||!Array.isArray(payload.files)||
      JSON.stringify(payload.files.map(x=>x.path))!==JSON.stringify(names))throw Error('BACKUP_CONTENT_INVALID');
  for(const row of payload.files){
    if(![0o600,0o640].includes(row.mode)||typeof row.data!=='string'||hash(Buffer.from(row.data,'base64'))!==row.sha256)throw Error('BACKUP_CONTENT_INVALID');
  }
  mkdirSync(destination,{mode:0o700});mkdirSync(join(destination,'audit'),{mode:0o700});
  for(const row of payload.files)writeFileSync(join(destination,row.path),Buffer.from(row.data,'base64'),{flag:'wx',mode:row.mode});
  const journal=new Journal(join(destination,'audit'));journal.close();
  return {passed:true,release:payload.release,backupHash:hash(bytes),files:payload.files.map(({path,mode,sha256})=>({path,mode,sha256})),journalIntegrityVerified:true};
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
  const [operation,context]=process.argv.slice(2),config=JSON.parse(readFileSync(context,'utf8'));
  if(!['pack','recover'].includes(operation))throw Error('Use pack or recover with a protected JSON context');
  process.stdout.write(JSON.stringify(operation==='pack'?pack(config):recover(config))+'\n');
}
