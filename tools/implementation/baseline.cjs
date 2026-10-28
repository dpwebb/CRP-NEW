'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const program=require('../../docs/implementation/program.json');
const {validateProgram}=require('./governance.cjs');validateProgram(program);
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const git=(cwd,args)=>cp.execFileSync('git',args,{cwd,encoding:'utf8',windowsHide:true,maxBuffer:32*1024*1024}).trim();
const observed=program.sources.map(s=>{const head=git(s.workspace,['rev-parse','HEAD']);if(head!==s.ref)throw Error('BASE_SOURCE_DRIFT');
 const files=git(s.workspace,['ls-files','-z']).split('\0').filter(Boolean);
 return {...s,head,tracked:files.map(file=>({file,sha256:hash(path.join(s.workspace,file))}))};});
const originals=['C:/CRP-NEW','C:/CRP-MAIL-OPS','C:/CRP-AFFILIATE-OPS'].map(workspace=>{const dirty=git(workspace,['diff','--name-only','-z']).split('\0').filter(Boolean);return {workspace,head:git(workspace,['rev-parse','HEAD']),status:git(workspace,['status','--porcelain']),dirty:dirty.map(file=>({file,sha256:fs.existsSync(path.join(workspace,file))?hash(path.join(workspace,file)):null}))};});
const dest=path.resolve(__dirname,'../../output/implementation/baseline.json');fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,JSON.stringify({version:1,createdAt:new Date().toISOString(),observed,originals,noPrivateDataRead:true},null,2),{flag:'wx'});console.log(JSON.stringify({baseline:dest,sources:observed.map(s=>({app:s.app,files:s.tracked.length,head:s.head})),originals:originals.map(s=>({workspace:s.workspace,dirty:s.dirty.length}))}));

