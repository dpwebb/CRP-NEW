import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, statSync, symlinkSync, linkSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { Journal } from '../src/journal.mjs';

const linux = {skip: process.platform !== 'linux'};
const moduleUrl = new URL('../src/journal.mjs', import.meta.url).href;
const start = (dir) => spawn(process.execPath, ['--input-type=module', '-e', `import {Journal} from ${JSON.stringify(moduleUrl)};const j=new Journal(process.argv[1]);j.append('CRASH_PROOF');console.log('ready');setInterval(()=>{},1000);`, dir], {stdio:['ignore','pipe','pipe']});
const probe = (dir) => spawnSync(process.execPath, ['--input-type=module','-e',`import {Journal} from ${JSON.stringify(moduleUrl)};const j=new Journal(process.argv[1]);j.close();`,dir], {encoding:'utf8'});

test('kernel ownership survives helper exit, excludes other processes and automatically releases after SIGKILL',linux,async()=>{
 const dir=mkdtempSync(join(tmpdir(),'family-kernel-'));let child;
 try {
  child=start(dir);await once(child.stdout,'data');
  const before=readFileSync(join(dir,'audit.jsonl'));const key=readFileSync(join(dir,'integrity.key'));
  const inode=statSync(join(dir,'process.kernel.lock')).ino;
  for(let i=0;i<8;i++)assert.notEqual(probe(dir).status,0);
  assert.deepEqual(readFileSync(join(dir,'audit.jsonl')),before);
  child.kill('SIGKILL');await once(child,'exit');child=undefined;
  for(let i=0;i<4;i++)assert.equal(probe(dir).status,0);
  assert.equal(statSync(join(dir,'process.kernel.lock')).ino,inode);
  assert.deepEqual(readFileSync(join(dir,'integrity.key')),key);
  assert.deepEqual(readFileSync(join(dir,'audit.jsonl')),before);
 }finally {child?.kill('SIGKILL');rmSync(dir,{recursive:true,force:true});}
});

test('empty and arbitrary prior-boot PID content do not block a released kernel lock',linux,()=>{
 const dir=mkdtempSync(join(tmpdir(),'family-boot-'));
 try {for(const text of ['', 'kernel-flock-v1\n1\n', 'kernel-flock-v1\n999999999\n']){
  writeFileSync(join(dir,'process.kernel.lock'),text,{mode:0o600});
  const j=new Journal(dir);j.close();assert.equal(probe(dir).status,0);
 }}finally{rmSync(dir,{recursive:true,force:true});}
});

test('legacy locks require explicit stopped migration; no PID guessing or unlink',linux,()=>{
 const dir=mkdtempSync(join(tmpdir(),'family-legacy-'));
 try {for(const text of ['',String(process.pid),'999999999']){
  writeFileSync(join(dir,'process.lock'),text,{mode:0o600});
  assert.throws(()=>new Journal(dir),/LEGACY_LOCK_REQUIRES_STOPPED_MIGRATION/);
  assert.equal(readFileSync(join(dir,'process.lock'),'utf8'),text);
 }}finally{rmSync(dir,{recursive:true,force:true});}
});

test('lock symlinks, hard links and loose modes refuse without changing targets',linux,()=>{
 const dir=mkdtempSync(join(tmpdir(),'family-link-')),file=join(dir,'process.kernel.lock'),target=join(dir,'target');
 try {
  writeFileSync(target,'preserve',{mode:0o600});symlinkSync(target,file);
  assert.throws(()=>new Journal(dir));assert.equal(readFileSync(target,'utf8'),'preserve');rmSync(file);
  linkSync(target,file);assert.throws(()=>new Journal(dir),/PRIVATE_ORDINARY/);rmSync(file);
  writeFileSync(file,'',{mode:0o600});chmodSync(file,0o644);assert.throws(()=>new Journal(dir),/PRIVATE_ORDINARY/);
  assert.equal(readFileSync(target,'utf8'),'preserve');
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('reclaimed lock never repairs truncated or tampered journals and keeps unresolved intents',linux,()=>{
 const dir=mkdtempSync(join(tmpdir(),'family-chain-'));
 try {
  let j=new Journal(dir);j.reserve('unknown',{subject:'owner',requestHash:'a'});j.close();
  const file=join(dir,'audit.jsonl'),bytes=readFileSync(file);
  j=new Journal(dir);assert.equal(j.reserve('unknown',{subject:'owner',requestHash:'a'}),false);
  assert.throws(()=>j.reserve('new',{subject:'owner',requestHash:'a'}),/PREVIOUS_OUTCOME_UNRESOLVED/);j.close();
  writeFileSync(file,bytes.subarray(0,-1));assert.throws(()=>new Journal(dir),/AUDIT_TRUNCATED/);
  writeFileSync(file,bytes.toString().replace('owner','other'));assert.throws(()=>new Journal(dir),/AUDIT_INTEGRITY_FAILED/);
  writeFileSync(file,bytes);rmSync(join(dir,'integrity.key'));assert.throws(()=>new Journal(dir),/AUDIT_KEY_MISSING/);
  assert.deepEqual(readFileSync(file),bytes);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
