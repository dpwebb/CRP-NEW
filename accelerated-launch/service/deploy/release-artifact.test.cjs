'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {packageArtifact,loadArtifact,manifestValid,assertArchive,committedRows,safe}=require('./release-artifact.cjs');
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
let count=0;const check=fn=>{fn();count++;};
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'crp-artifact-test-')),root=path.join(temp,'repo');
fs.mkdirSync(root);
const git=args=>execFileSync('git',args,{cwd:root,stdio:['pipe','pipe','pipe']}).toString().trim();
function put(name,text){const file=path.join(root,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,text);return file;}
try{
  // Source-tree tests can hide an omitted runtime data file. Exercise the policy
  // reader with only files admitted by the actual release inventory.
  const candidateRoot=path.resolve(__dirname,'../../..');
  const admitted=require('./build-release-manifest.cjs').collectGroups().flatMap(group=>group.files);
  const policyReader='accelerated-launch/adapters/report-use.cjs';
  const policyData='accelerated-launch/service/report-use-policy.json';
  const policyPackage=path.join(temp,'policy-package');
  for(const file of [policyReader,policyData]){
    const entry=admitted.find(row=>row.file===file);
    check(()=>assert.ok(entry,'Runtime policy dependency must be admitted: '+file));
    const to=path.join(policyPackage,file);fs.mkdirSync(path.dirname(to),{recursive:true});
    fs.copyFileSync(path.join(candidateRoot,file),to);
  }
  check(()=>assert.deepEqual(require(path.join(policyPackage,policyReader)).policyIdentity(),require(path.join(candidateRoot,policyReader)).policyIdentity(),'Packaged policy reader retains the exact approved policy identity'));
  git(['init']);git(['config','user.name','CRP tooling fixture']);git(['config','user.email','tooling@example.test']);git(['config','core.autocrlf','false']);
  const runtime='accelerated-launch/service/app.cjs',css='accelerated-launch/service/ui/style.css',manifestPath='accelerated-launch/service/deploy/release-manifest.json';
  put(runtime,"module.exports={fixture:true};\n");put(css,'body{color:green}\n');
  const rows=[runtime,css].map(file=>({file,sha256:sha(fs.readFileSync(path.join(root,file)))}));
  const group={id:'SERVED_ASSETS',files:rows,file_count:rows.length,digest:sha(rows.map(r=>r.file+'\n'+r.sha256+'\n').join(''))};
  const manifest={groups:[group],total_file_count:rows.length,manifest_digest:sha('group:'+group.id+'\n'+group.digest+'\n')};
  put(manifestPath,JSON.stringify(manifest,null,2)+'\n');git(['add','.']);git(['commit','-m','Disposable artifact source']);const head=git(['rev-parse','HEAD']);
  const verification=path.join(temp,'verification.json');fs.writeFileSync(verification,JSON.stringify({product_regression:'UNIT_FIXTURE_ONLY'}));
  const snapshot=Object.fromEntries([...rows,{file:manifestPath,sha256:sha(fs.readFileSync(path.join(root,manifestPath)))}].map(r=>[r.file,r.sha256]));
  check(()=>manifestValid(manifest));
  check(()=>assert.equal(committedRows(root,head,rows),2));
  check(()=>assert.throws(()=>committedRows(root,head,[{file:css,sha256:'A'.repeat(64)}]),/Committed source mismatch/));
  check(()=>assert.throws(()=>manifestValid({...manifest,total_file_count:3}),/manifest/));
  for(const bad of ['../escape','C:/escape','/escape','a/../../escape','a\nfile'])check(()=>assert.throws(()=>safe(root,bad),/Unsafe/));
  const out=path.join(temp,'candidate');
  const receipt=packageArtifact({root,manifest,head,verificationFile:verification,out,sourceSnapshot:snapshot});
  check(()=>assert.equal(receipt.files,2));
  const loaded=loadArtifact(path.join(out,'package-receipt.json'));
  check(()=>assert.equal(loaded.receipt.archive_sha256,receipt.archive_sha256));
  check(()=>assert.equal(loaded.manifest.manifest_digest,manifest.manifest_digest));
  check(()=>assert.equal(fs.readFileSync(path.join(loaded.sourceRoot,css),'utf8'),'body{color:green}\n'));
  const repeated=packageArtifact({root,manifest,head,verificationFile:verification,out,sourceSnapshot:snapshot});
  check(()=>assert.equal(repeated.reused,true));
  check(()=>assert.equal(repeated.archive_sha256,receipt.archive_sha256));
  put('release-notes.md','Bookkeeping only\n');git(['add','release-notes.md']);git(['commit','-m','Bookkeeping after frozen verification']);
  const docReuse=packageArtifact({root,manifest,head:git(['rev-parse','HEAD']),verificationFile:verification,out,sourceSnapshot:snapshot});
  check(()=>assert.equal(docReuse.reused,true));check(()=>assert.equal(docReuse.git_head,head));
  const uncommitted=put('accelerated-launch/service/deploy/uncommitted-tool.cjs','module.exports=true;\n');
  check(()=>assert.throws(()=>packageArtifact({root,manifest,head:git(['rev-parse','HEAD']),verificationFile:verification,out:path.join(temp,'uncommitted'),sourceSnapshot:{...snapshot,'accelerated-launch/service/deploy/uncommitted-tool.cjs':sha(fs.readFileSync(uncommitted))}}),/Commit shipped source/));
  // Advancing the checkout cannot change a previously packaged/promoted identity.
  put(css,'body{color:blue}\n');git(['add',css]);git(['commit','-m','Advance unrelated working source']);
  check(()=>assert.notEqual(git(['rev-parse','HEAD']),head));
  check(()=>assert.equal(loadArtifact(path.join(out,'package-receipt.json')).manifest.manifest_digest,manifest.manifest_digest));
  check(()=>assert.throws(()=>packageArtifact({root,manifest,head,verificationFile:verification,out:path.join(temp,'wrong'),sourceSnapshot:snapshot}),/Artifact bytes mismatch/));
  check(()=>assert.throws(()=>assertArchive(receipt.archive,'A'.repeat(64),[]),/archive hash/));
  check(()=>assert.throws(()=>assertArchive(receipt.archive,receipt.archive_sha256,['another-file']),/inventory/));
  const packedCss=path.join(loaded.packageRoot,css),original=fs.readFileSync(packedCss);fs.writeFileSync(packedCss,'tampered');
  check(()=>assert.throws(()=>loadArtifact(path.join(out,'package-receipt.json')),/bytes mismatch/));fs.writeFileSync(packedCss,original);
  const sourceInventory=path.join(loaded.sourceRoot,'source-inventory.json'),inventory=fs.readFileSync(sourceInventory);fs.writeFileSync(sourceInventory,'{}');
  check(()=>assert.throws(()=>loadArtifact(path.join(out,'package-receipt.json')),/inventory changed/));fs.writeFileSync(sourceInventory,inventory);
  const receiptFile=path.join(out,'package-receipt.json'),saved=fs.readFileSync(receiptFile);fs.writeFileSync(receiptFile,JSON.stringify({...receipt,git_head:'a'.repeat(40)}));
  check(()=>assert.throws(()=>loadArtifact(receiptFile),/provenance/));fs.writeFileSync(receiptFile,saved);
  console.log('PASS: '+count+' artifact inventory, committed-byte, immutable-package and advancing-checkout checks');
}finally{
  if(!path.resolve(temp).startsWith(path.join(path.resolve(os.tmpdir()),'crp-artifact-test-')))throw Error('Unsafe fixture cleanup');
  fs.rmSync(temp,{recursive:true,force:true});
}
