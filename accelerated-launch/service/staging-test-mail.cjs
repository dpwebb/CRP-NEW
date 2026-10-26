'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {durableWrite}=require('./private-store.cjs');
const {ServiceError}=require('./errors.cjs');
const {messageBody}=require('./confirmation-mail.cjs');
function create(store,{environment=process.env.CRP_DEPLOYMENT_ENV,now=Date.now}={}){
  const enabled=environment==='staging',directory=path.join(store.dataDir,'test-mail');
  const eligible=to=>enabled&&typeof to==='string'&&to.length<=254&&!/\s/.test(to)&&/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@example\.test$/i.test(to);
  const digest=to=>crypto.createHash('sha256').update(to.toLowerCase()).digest('hex');
  function ordinary(file){const s=fs.lstatSync(file);if(!s.isFile()||s.isSymbolicLink()||process.platform!=='win32'&&((s.mode&0o777)!==0o600||s.uid!==process.getuid()))throw new ServiceError('ACCOUNT_SECURITY_UNAVAILABLE');}
  function key(){
    if(fs.existsSync(directory)){const s=fs.lstatSync(directory);if(!s.isDirectory()||s.isSymbolicLink()||process.platform!=='win32'&&((s.mode&0o777)!==0o700||s.uid!==process.getuid()))throw new ServiceError('ACCOUNT_SECURITY_UNAVAILABLE');}
    fs.mkdirSync(directory,{recursive:true,mode:0o700});
    const file=path.join(directory,'.key');
    if(!fs.existsSync(file)){try{const fd=fs.openSync(file,'wx',0o600);try{fs.writeFileSync(fd,crypto.randomBytes(32));fs.fsyncSync(fd);}finally{fs.closeSync(fd);}}catch(e){if(e.code!=='EEXIST')throw e;}}
    ordinary(file);const bytes=fs.readFileSync(file);if(bytes.length!==32)throw new ServiceError('ACCOUNT_SECURITY_UNAVAILABLE');return bytes;
  }
  function read(to){
    const file=path.join(directory,digest(to)+'.aesgcm');if(!fs.existsSync(file))return [];
    ordinary(file);if(fs.statSync(file).size>256*1024)throw new ServiceError('ACCOUNT_SECURITY_UNAVAILABLE');
    try{const b=fs.readFileSync(file),d=crypto.createDecipheriv('aes-256-gcm',key(),b.subarray(0,12));d.setAAD(Buffer.from(digest(to)));d.setAuthTag(b.subarray(12,28));const rows=JSON.parse(Buffer.concat([d.update(b.subarray(28)),d.final()]).toString('utf8'));if(!Array.isArray(rows)||rows.length>20)throw Error();return rows.filter(r=>r.capturedAt>now()-3600000);}
    catch{throw new ServiceError('ACCOUNT_SECURITY_UNAVAILABLE');}
  }
  function wrap(fallback){const send=async message=>{
    if(!eligible(message.to))return fallback(message);
    const text=messageBody(message);if(Buffer.byteLength(text)>12000)throw new ServiceError('INVALID_REQUEST');
    const rows=read(message.to).slice(-19);rows.push({id:crypto.randomUUID(),kind:message.kind||'email-confirmation',text,capturedAt:now(),status:'CAPTURED'});
    const iv=crypto.randomBytes(12),c=crypto.createCipheriv('aes-256-gcm',key(),iv);c.setAAD(Buffer.from(digest(message.to)));const bytes=Buffer.concat([c.update(JSON.stringify(rows),'utf8'),c.final()]);
    durableWrite(path.join(directory,digest(message.to)+'.aesgcm'),Buffer.concat([iv,c.getAuthTag(),bytes]));
    return {accepted:true,status:'CAPTURED',externalDelivery:false};
  };send.captureFor=eligible;return send;}
  function inbox(actor){if(!eligible(actor?.email))throw new ServiceError('NOT_FOUND');return {mode:'CAPTURED',externalDelivery:false,items:read(actor.email)};}
  function remove(actor){if(!eligible(actor?.email))return;const file=path.join(directory,digest(actor.email)+'.aesgcm');if(fs.existsSync(file)){ordinary(file);fs.unlinkSync(file);}}
  return {wrap,inbox,eligible,remove};
}
module.exports={create};
