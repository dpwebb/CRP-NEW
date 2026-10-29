const {test}=require('node:test');
const assert=require('node:assert/strict');
const {sourceMatches}=require('../deploy/operational-monitor.cjs');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const row={file:'accelerated-launch/service/confirmation-mail.cjs',sha256:'a'.repeat(64)};
const q={file:row.file,build_id:'crp-v1-1234567890abcdef',original_sha256:row.sha256,active_sha256:'b'.repeat(64)};
test('approved exact source tuple and original bytes pass',()=>{
 assert.equal(sourceMatches(row,row.sha256,q.build_id),true);
 assert.equal(sourceMatches(row,q.active_sha256,q.build_id,q),true);
});
test('monitor checks every release file while accepting only the approved delta',{skip:process.platform==='win32'?'Linux-host release path contract':false},async()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'monitor-qualified-'));
 try{
  const digest='1234567890abcdef'+'0'.repeat(48),build='crp-v1-'+digest.slice(0,16);
  const release=path.join(temp,'releases',build);fs.mkdirSync(path.join(release,'accelerated-launch/service'),{recursive:true});
  const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
  fs.writeFileSync(path.join(release,row.file),'approved sender');fs.writeFileSync(path.join(release,'other.cjs'),'original');
  fs.writeFileSync(path.join(release,'release-manifest.json'),JSON.stringify({manifest_digest:digest,groups:[{files:[{file:row.file,sha256:hash('old sender')},{file:'other.cjs',sha256:hash('original')}]}]}));
  fs.writeFileSync(path.join(release,'deployment-provenance.json'),JSON.stringify({build_id:build,manifest_digest:digest}));
  fs.symlinkSync(release,path.join(temp,'current'),'junction');
  const qualification={file:row.file,build_id:build,original_sha256:hash('old sender'),active_sha256:hash('approved sender')};
  const target={name:'production',url:'https://example.test',release_base:temp,approved_source_qualification:qualification};
  const dependencies={maintenance:false,fetch:async()=>({ok:true,json:async()=>({ok:true,build_id:build,deployment:'production',billing_mode:'live'})}),command:a=>a[0]==='is-active'?'active':a[0]==='is-enabled'?'enabled':'success',backups:()=>[{mtime:Date.now(),verified:true}],disk:()=>({blocks:100,bavail:50})};
  const {inspect}=require('../deploy/operational-monitor.cjs');
  assert.equal((await inspect(target,dependencies)).passed,true);
  fs.writeFileSync(path.join(release,'other.cjs'),'unexpected modification');
  assert.ok((await inspect(target,dependencies)).failures.includes('RELEASE_BYTES'));
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
test('qualification refuses unrelated files, builds, original and active bytes',()=>{
 assert.equal(sourceMatches({...row,file:'other.cjs'},q.active_sha256,q.build_id,q),false);
 assert.equal(sourceMatches(row,q.active_sha256,'crp-v1-fedcba0987654321',q),false);
 assert.equal(sourceMatches({...row,sha256:'c'.repeat(64)},q.active_sha256,q.build_id,q),false);
 assert.equal(sourceMatches(row,'c'.repeat(64),q.build_id,q),false);
 assert.equal(sourceMatches(row,q.active_sha256,q.build_id),false);
});
