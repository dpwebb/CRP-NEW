'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto'),custody=require('./deletion-custody.cjs');
const fixture=()=>({dir:fs.mkdtempSync(path.join(os.tmpdir(),'crp-fictional-custody-')),key:crypto.randomBytes(32),environment:'local'});
test('persistent custody is atomic, idempotent, restart readable and blocks an old restored account without mutation',()=>{
 const x=fixture(),options={...x},empty=custody.initialize(x.dir,options),input={requestId:'fictional-request-1',accountId:'fictional-account',deletedAt:Date.now()-1000,evidenceHash:'a'.repeat(64)};
 const first=custody.append(x.dir,input,options);assert.equal(custody.append(x.dir,input,options).duplicate,true);assert.equal(custody.read(x.dir,x.key,'local').entries.length,1);
 assert.throws(()=>custody.append(x.dir,{...input,evidenceHash:'b'.repeat(64)},options),/COLLISION/);
 const state={accounts:[{account_id:input.accountId},{account_id:'other'}],packets:[{account_id:input.accountId,embedded:'fictional-id'}]},before=JSON.stringify(state);
 const gate=custody.restoreGate(x.dir,state,{...options,expectedAnchor:first.anchor});assert.equal(gate.serviceOpeningAllowed,false);assert.equal(gate.affected.accounts,1);assert.equal(gate.blobErasureVerified,false);assert.equal(JSON.stringify(state),before);
 assert.throws(()=>custody.restoreGate(x.dir,state,{...options,expectedAnchor:empty}),/ANCHOR/);
 assert.throws(()=>custody.restoreGate(x.dir,state,options),/ANCHOR/);
 const clean=custody.restoreGate(x.dir,{accounts:[{account_id:'other'}]},{...options,expectedAnchor:first.anchor});assert.equal(clean.deletionIdentifiersAbsent,true);assert.equal(clean.serviceOpeningAllowed,false);
});
test('tamper, truncation, wrong key/environment and competing writers refuse; failed writes do not erase history',()=>{
 const x=fixture();custody.initialize(x.dir,x);const first=custody.append(x.dir,{requestId:'fictional-request-2',accountId:'a',caseId:'c',deletedAt:Date.now()-1000,evidenceHash:'a'.repeat(64)},x),file=path.join(x.dir,'deletion-custody.json'),bytes=fs.readFileSync(file);
 fs.mkdirSync(path.join(x.dir,'deletion-custody.writer'));assert.throws(()=>custody.append(x.dir,{requestId:'fictional-request-3',accountId:'a',deletedAt:Date.now()-1000,evidenceHash:'a'.repeat(64)},x),/BUSY/);fs.rmdirSync(path.join(x.dir,'deletion-custody.writer'));assert.deepEqual(fs.readFileSync(file),bytes);
 assert.throws(()=>custody.read(x.dir,crypto.randomBytes(32),'local'),/CHAIN/);assert.throws(()=>custody.read(x.dir,x.key,'production'),/IDENTITY/);
 const j=JSON.parse(bytes);j.entries[0].body.accountId='other';fs.writeFileSync(file,JSON.stringify(j));assert.throws(()=>custody.read(x.dir,x.key,'local'),/CHAIN/);
 fs.writeFileSync(file,JSON.stringify({version:1,environment:'local',entries:[]}));assert.throws(()=>custody.restoreGate(x.dir,{},{...x,expectedAnchor:first.anchor}),/ANCHOR/);
 fs.writeFileSync(file,bytes);assert.throws(()=>custody.initialize(x.dir,x),/EXISTS/);
 const scoped=custody.restoreGate(x.dir,{cases:[{account_id:'a',case_id:'c'},{account_id:'b',case_id:'c'}]},{...x,expectedAnchor:first.anchor});assert.equal(scoped.affected.cases,1);
});
test('directory junction/symlink refuses without changing the authentic journal',()=>{
 const x=fixture();custody.initialize(x.dir,x);const link=x.dir+'-link';fs.symlinkSync(x.dir,link,process.platform==='win32'?'junction':'dir');
 assert.throws(()=>custody.read(link,x.key,'local'),/DIRECTORY_REFUSED/);assert.equal(custody.read(x.dir,x.key,'local').entries.length,0);
});
