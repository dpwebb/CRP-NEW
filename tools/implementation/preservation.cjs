'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const root=path.resolve(__dirname,'../..'),baseline=JSON.parse(fs.readFileSync(path.join(root,'output/implementation/baseline.json')));
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const git=(cwd,args)=>cp.execFileSync('git',args,{cwd,encoding:'utf8',windowsHide:true,maxBuffer:32*1024*1024}).trim();
const allowed={
 consumer:['accelerated-launch/service/admin-service.cjs','accelerated-launch/service/app.cjs','accelerated-launch/service/errors.cjs','accelerated-launch/service/plan-catalog.cjs','accelerated-launch/service/request-policy.cjs','accelerated-launch/service/tests/sections/az-consumer-support-ui.cjs','accelerated-launch/service/tests/sections/bg-report-use.cjs','accelerated-launch/service/tests/sections/t-entitlement.cjs','accelerated-launch/service/ui/app.js','accelerated-launch/service/journey.cjs','accelerated-launch/service/tests/run-tests.cjs'],
 family:['family-admin/public/app.js','family-admin/src/catalog.mjs','family-admin/test/native-sso-acceptance.mjs'],
 mail:['WORK.md','public/staff/app.js','scripts/monitor.mjs','src/app.mjs','src/backup.mjs','src/readiness-monitor.mjs','src/readiness-status.mjs','src/staff.mjs','tests/readiness.test.mjs'],
 affiliate:['WORK.md','package.json','public/app.js','src/operations.mjs','src/service.mjs']
};
const originals=baseline.originals.map(o=>({workspace:o.workspace,headExact:git(o.workspace,['rev-parse','HEAD'])===o.head,statusExact:git(o.workspace,['status','--porcelain'])===o.status,dirtyBytesExact:o.dirty.every(f=>{const p=path.join(o.workspace,f.file);return f.sha256===null?!fs.existsSync(p):fs.existsSync(p)&&hash(p)===f.sha256;})}));
const candidates=baseline.observed.map(s=>{
 const changed=s.tracked.filter(f=>!fs.existsSync(path.join(s.workspace,f.file))||hash(path.join(s.workspace,f.file))!==f.sha256).map(f=>f.file);
 const unexpected=changed.filter(f=>!allowed[s.app]?.includes(f));
 const fresh=git(s.workspace,['ls-files','--others','--exclude-standard','-z']).split('\0').filter(f=>f&&!/^(output\/|\.playwright-cli\/)/.test(f));
 const files=[...changed,...fresh].map(file=>({file,sha256:hash(path.join(s.workspace,file))}));
 const workHistoryPreserved=!['mail','affiliate'].includes(s.app)||fs.readFileSync(path.join(s.workspace,'WORK.md'),'utf8').startsWith(cp.execFileSync('git',['show',s.head+':WORK.md'],{cwd:s.workspace,encoding:'utf8',windowsHide:true}));
 return {app:s.app,workspace:s.workspace,headExact:git(s.workspace,['rev-parse','HEAD'])===s.head,workHistoryPreserved,changed,unexpected,files};
});
const passed=originals.every(o=>o.headExact&&o.statusExact&&o.dirtyBytesExact)&&candidates.every(c=>c.headExact&&c.workHistoryPreserved&&!c.unexpected.length);
const report={version:1,checkedAt:new Date().toISOString(),passed,originals,candidates,productionAccessPerformed:false,existingPrivateStoresOpened:false,deploymentPerformed:false,sourcePushPerformed:false};
const destination=path.join(root,'output/implementation/preservation-current.json');fs.writeFileSync(destination,JSON.stringify(report,null,2));
console.log(JSON.stringify({passed,originals,candidates:candidates.map(({app,headExact,changed,unexpected,files})=>({app,headExact,changed:changed.length,unexpected,files:files.length})),receipt:destination}));
if(!passed)process.exitCode=1;
