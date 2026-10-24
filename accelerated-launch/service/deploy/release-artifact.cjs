'use strict';
// Release archives and their source proof belong to the candidate, not an advancing checkout.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {execFileSync} = require('node:child_process');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const hash = file => sha(fs.readFileSync(file));
const read = file => JSON.parse(fs.readFileSync(file));
const portable = name => name.replace(/\\/g, '/');
function safe(root, name) {
  if (typeof name !== 'string' || !name || /[\r\n\0]/.test(name) || path.isAbsolute(name) || /^[A-Za-z]:/.test(name)) throw Error('Unsafe artifact path');
  const normalized = portable(name);
  if (normalized.split('/').some(part => part === '..')) throw Error('Unsafe artifact path');
  const file = path.resolve(root, normalized);
  if (!file.startsWith(path.resolve(root) + path.sep)) throw Error('Unsafe artifact path');
  return file;
}
function write(file, value) {
  fs.mkdirSync(path.dirname(file), {recursive:true,mode:0o700});
  fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600});
}
function manifestValid(m) {
  if (!m || !Array.isArray(m.groups)) throw Error('Invalid artifact manifest');
  const digest = rows => sha(Buffer.from(rows.map(r=>r.file+'\n'+r.sha256+'\n').join('')));
  const rows=m.groups.flatMap(g=>g.files||[]);
  const names=rows.map(r=>portable(r.file).toLowerCase());
  if (!rows.length || rows.length!==m.total_file_count || new Set(names).size!==rows.length || m.groups.some(g=>digest(g.files)!==g.digest) || digest(m.groups.filter(g=>g.files.length).map(g=>({file:'group:'+g.id,sha256:g.digest})))!==m.manifest_digest) throw Error('Invalid artifact manifest');
  for(const row of rows){safe(path.resolve('.'),row.file);if(!/^[A-F0-9]{64}$/.test(row.sha256))throw Error('Invalid artifact source digest');}
  return rows;
}
function verifyFiles(root, rows) {
  const realRoot=fs.realpathSync(root);
  for(const row of rows){const file=safe(root,row.file),real=fs.realpathSync(file);if(!real.startsWith(realRoot+path.sep) || !fs.statSync(file).isFile() || fs.lstatSync(file).isSymbolicLink() || hash(file)!==row.sha256.toUpperCase())throw Error('Artifact bytes mismatch: '+row.file);}
}
function archiveFiles(archive) {
  const listing=execFileSync('tar',['-tzf',archive],{encoding:'utf8',maxBuffer:16*1024*1024});
  const verbose=execFileSync('tar',['-tvzf',archive],{encoding:'utf8',maxBuffer:16*1024*1024});
  if(verbose.split(/\r?\n/).filter(Boolean).some(line=>!['-','d'].includes(line[0])))throw Error('Artifact archive links or special files refused');
  const names=listing.split(/\r?\n/).filter(Boolean).map(n=>portable(n).replace(/^\.\//,''));
  const files=names.filter(n=>n && n!=='.' && !n.endsWith('/'));
  for(const name of names)if(name!=='.' && name!=='')safe(path.resolve('.'),name.replace(/\/$/,''));
  if(new Set(files.map(n=>n.toLowerCase())).size!==files.length)throw Error('Duplicate artifact archive entry');
  return files;
}
function assertArchive(archive, expectedHash, expectedFiles) {
  if(!/^[A-F0-9]{64}$/.test(expectedHash||'') || hash(archive)!==expectedHash)throw Error('Artifact archive hash mismatch');
  const actual=archiveFiles(archive).sort(),expected=[...expectedFiles].sort();
  if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error('Artifact archive inventory mismatch');
}
function copy(root,target,rows) {
  verifyFiles(root,rows);
  for(const row of rows){const to=safe(target,row.file);fs.mkdirSync(path.dirname(to),{recursive:true,mode:0o700});fs.copyFileSync(safe(root,row.file),to);}
  verifyFiles(target,rows);
}
function committedRows(root,head,rows) {
  // One Git process for all blobs; no per-file Git startup cost.
  const input=rows.map(r=>head+':'+r.file).join('\n')+'\n';
  const buffer=execFileSync('git',['cat-file','--batch'],{cwd:root,input,maxBuffer:128*1024*1024});
  let offset=0;
  for(const row of rows){
    const end=buffer.indexOf(10,offset);if(end<0)throw Error('Incomplete committed source');
    const header=buffer.subarray(offset,end).toString('utf8').split(' ');
    const size=Number(header[2]);
    if(header[1]!=='blob' || !Number.isSafeInteger(size) || size<0)throw Error('Commit shipped source before packaging: '+row.file);
    offset=end+1;
    if(sha(buffer.subarray(offset,offset+size))!==row.sha256.toUpperCase())throw Error('Committed source mismatch: '+row.file);
    offset+=size+1;
  }
  return rows.length;
}
function windowsPathPreflight(out,files,platform=process.platform) {
  if(platform!=='win32')return;
  const attempt='attempt-00000000-0000-4000-8000-000000000000';
  if(files.some(file=>path.resolve(out,attempt,'source',file).length>=260))throw Error('Package output path is too long for Windows tar. Choose a shorter dedicated output directory before packaging.');
}
function packageArtifact({root,manifest,head,verificationFile,out,sourceSnapshot,capturedDependencies=[]}) {
  manifestValid(manifest);
  if(!/^[a-f0-9]{40}$/.test(head))throw Error('Invalid committed package source');
  const rows=manifest.groups.flatMap(g=>g.files);
  const inputs=[...rows.map(row=>row.file),...Object.keys(sourceSnapshot).filter(file=>sourceSnapshot[file]!==null),'source-inventory.json','deployment-provenance.json','release-manifest.json'];
  windowsPathPreflight(out,inputs);
  verifyFiles(root,rows);committedRows(root,head,rows);
  const receiptFile=path.join(out,'package-receipt.json');
  if(fs.existsSync(receiptFile)){
    const prior=loadArtifact(receiptFile);
    if(prior.receipt.manifest_digest!==manifest.manifest_digest || prior.receipt.verification_sha256!==hash(verificationFile))throw Error('Existing package belongs to another candidate');
    for(const [file,digest] of Object.entries(sourceSnapshot))if(digest!==null && (!prior.sourceRoot || hash(safe(prior.sourceRoot,file))!==digest.toUpperCase()))throw Error('Existing package source proof mismatch');
    return {...prior.receipt,reused:true};
  }
  fs.mkdirSync(out,{recursive:true,mode:0o700});
  const attempt=path.join(out,'attempt-'+crypto.randomUUID()),target=path.join(attempt,'package'),sources=path.join(attempt,'source');
  fs.mkdirSync(attempt,{mode:0o700});
  copy(root,target,rows);
  write(path.join(target,'release-manifest.json'),manifest);
  const build='crp-v1-'+manifest.manifest_digest.slice(0,16).toLowerCase();
  const provenance={build_id:build,manifest_digest:manifest.manifest_digest,git_head:head,files:rows.length,verification_sha256:hash(verificationFile),verification_mode:read(verificationFile).product_regression};
  write(path.join(target,'deployment-provenance.json'),provenance);
  const sourceRows=Object.entries(sourceSnapshot).filter(([,digest])=>digest!==null).map(([file,digest])=>({file,sha256:digest.toUpperCase()}));
  const byFile=new Map([...sourceRows,...rows].map(row=>[row.file,row]));
  const captured=new Map(capturedDependencies.map(r=>[r.file,r.sha256.toUpperCase()]));
  if(rows.some(row=>captured.has(row.file)))throw Error('Shipped source cannot use captured test exception');
  for(const row of sourceRows.filter(row=>captured.has(row.file)))if(row.sha256!==captured.get(row.file))throw Error('Captured test dependency changed');
  committedRows(root,head,sourceRows.filter(row=>!captured.has(row.file)));
  copy(root,sources,[...byFile.values()]);
  if(!byFile.has('accelerated-launch/service/deploy/release-manifest.json'))write(safe(sources,'accelerated-launch/service/deploy/release-manifest.json'),manifest);
  const sourceInventory=[...byFile.values()];
  if(!sourceInventory.some(r=>r.file==='accelerated-launch/service/deploy/release-manifest.json'))sourceInventory.push({file:'accelerated-launch/service/deploy/release-manifest.json',sha256:hash(safe(sources,'accelerated-launch/service/deploy/release-manifest.json'))});
  write(path.join(sources,'source-inventory.json'),{schema:1,git_head:head,files:sourceInventory});
  const archive=path.join(attempt,'candidate.tar.gz'),sourceArchive=path.join(attempt,'source-proof.tar.gz');
  execFileSync('tar',['-czf',archive,'-C',target,'.']);
  execFileSync('tar',['-czf',sourceArchive,'-C',sources,'.']);
  const receipt={schema:2,...provenance,archive,archive_sha256:hash(archive),manifest_file:path.join(target,'release-manifest.json'),source_archive:sourceArchive,source_archive_sha256:hash(sourceArchive),source_directory:sources,source_inventory_sha256:hash(path.join(sources,'source-inventory.json')),created_at:new Date().toISOString(),production_ready:false};
  assertArchive(archive,receipt.archive_sha256,[...rows.map(r=>r.file),'release-manifest.json','deployment-provenance.json']);
  assertArchive(sourceArchive,receipt.source_archive_sha256,[...sourceInventory.map(r=>r.file),'source-inventory.json']);
  write(receiptFile,receipt);
  loadArtifact(receiptFile);
  return receipt;
}
function loadArtifact(packageFile) {
  const receipt=read(packageFile);
  if(!/^crp-v1-[a-f0-9]{16}$/.test(receipt.build_id||'') || !/^[a-f0-9]{40}$/.test(receipt.git_head||'') || !Number.isInteger(receipt.files))throw Error('Invalid package receipt');
  // Older verified packages remain usable while their original extracted snapshot is available.
  const manifestFile=receipt.manifest_file || path.join(path.dirname(packageFile),'package','release-manifest.json');
  const manifest=read(manifestFile),rows=manifestValid(manifest);
  if(receipt.manifest_digest!==manifest.manifest_digest || receipt.files!==rows.length || receipt.build_id!=='crp-v1-'+manifest.manifest_digest.slice(0,16).toLowerCase())throw Error('Artifact identity mismatch');
  assertArchive(receipt.archive,receipt.archive_sha256,[...rows.map(r=>r.file),'release-manifest.json','deployment-provenance.json']);
  verifyFiles(path.dirname(manifestFile),rows);
  const provenance=read(path.join(path.dirname(manifestFile),'deployment-provenance.json'));
  for(const key of ['build_id','manifest_digest','git_head','files','verification_sha256','verification_mode'])if(provenance[key]!==receipt[key])throw Error('Artifact provenance mismatch: '+key);
  let sourceRoot=null;
  if(receipt.schema===2){
    sourceRoot=receipt.source_directory;
    const inventoryFile=path.join(sourceRoot,'source-inventory.json');
    if(hash(inventoryFile)!==receipt.source_inventory_sha256)throw Error('Artifact source inventory changed');
    const inventory=read(inventoryFile);
    if(inventory.git_head!==receipt.git_head)throw Error('Artifact source commit mismatch');
    assertArchive(receipt.source_archive,receipt.source_archive_sha256,[...inventory.files.map(r=>r.file),'source-inventory.json']);
    verifyFiles(sourceRoot,inventory.files);
  }
  return {receipt,manifest,sourceRoot,packageRoot:path.dirname(manifestFile)};
}
module.exports={manifestValid,verifyFiles,assertArchive,committedRows,packageArtifact,loadArtifact,safe,windowsPathPreflight};
