'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),http=require('node:http');
const {spawn}=require('node:child_process');
const {once}=require('node:events');
const {ProcessingDispatcher}=require('../../processing-dispatcher.cjs');
const {inspect}=require('../../deploy/operational-monitor.cjs');
const {acceptance}=require('../../deploy/release-workflow.cjs');
const ROOT=path.resolve(__dirname,'../../../..');
async function run(_service,check) {
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'crp-operational-test-'));
  const fixture=path.join(temp,'blocked-worker.cjs');
  fs.writeFileSync(fixture,"const {parentPort}=require('node:worker_threads');parentPort.postMessage({type:'ready'});parentPort.on('message',({id})=>{const stop=Date.now()+300;while(Date.now()<stop){}parentPort.postMessage({type:'response',id,status:200,headers:{},bytes:Buffer.from('ok')});});");
  const dispatcher=new ProcessingDispatcher({workerFile:fixture,queueLimit:1,timeoutMs:2000});
  const server=http.createServer((req,res)=>{if(req.url==='/health'){res.end('alive');return;}dispatcher.handle(req,res);});
  try {
    await once(dispatcher,'ready');await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    const base='http://127.0.0.1:'+server.address().port;
    const busy=fetch(base+'/work');await new Promise(resolve=>setTimeout(resolve,40));
    const start=Date.now();check.equal(await (await fetch(base+'/health')).text(),'alive','HTTP stays responsive during synchronous worker processing');
    check.ok(Date.now()-start<250,'health does not wait for blocked processing');
    check.equal((await fetch(base+'/overflow')).status,503,'bounded queue refuses excess work');
    check.equal(await (await busy).text(),'ok','accepted work completes');
  } finally {await dispatcher.close();await new Promise(resolve=>server.close(resolve));}
  const hung=new ProcessingDispatcher({workerFile:fixture,timeoutMs:30});
  await once(hung,'ready');
  const failed=once(hung,'fatal');
  const req=new (require('node:events').EventEmitter)();Object.assign(req,{url:'/slow',method:'GET',headers:{},socket:{}});
  let refusalCode;hung.handle(req,{writeHead(){},end(text){refusalCode=JSON.parse(text).error.code;}});req.emit('end');
  await failed;check.equal(refusalCode,'PROCESSING_TIMEOUT','worker watchdog refuses a hung operation');await hung.close();
  const target={name:'production',build_id:'test',url:'https://example.test',service:'app',backup_service:'backup'};
  const healthy={fetch:async()=>({ok:true,json:async()=>({ok:true,build_id:'test',deployment:'production',billing_mode:'live'})}),command:args=>args[0]==='is-active'?'active':args[0]==='is-enabled'?'enabled':'success',backups:()=>[{mtime:Date.now(),verified:true}],disk:()=>({bavail:50,blocks:100})};
  check.equal((await inspect(target,healthy)).passed,true,'healthy operational probes pass');
  for(const [patch,code] of [[{fetch:async()=>{throw Error();}},'PUBLIC_HEALTH_UNREACHABLE'],[{backups:()=>[]},'BACKUP_STALE'],[{disk:()=>({bavail:1,blocks:100})},'DISK_LOW'],[{command:()=> 'failed'},'SERVICE_NOT_ACTIVE']])check.ok((await inspect(target,{...healthy,...patch})).failures.includes(code),'monitor surfaces '+code);
  const historical=JSON.parse(fs.readFileSync(path.join(ROOT,'SOURCE_CAPTURES/REPORTING-PERIOD-RELEASE-2026-10-11/staging-gate-summary.json')));
  let rejected=false;try{acceptance({...historical,measurement_receipt_sha256:'0'.repeat(64)},historical.build_id,{measurementFile:fixture,evidenceRoot:temp,packageReceipt:{}});}catch{rejected=true;}
  check.equal(rejected,true,'syntactically valid fabricated measurement hash cannot authorize release');
  // Real server, real single-writer store, real authentication, then restart.
  let child,base;
  async function launch() {
    child=spawn(process.execPath,[path.join(ROOT,'accelerated-launch/service/server.cjs')],{env:{...process.env,CRP_LOCAL_SERVICE_DATA:path.join(temp,'private'),CRP_LOCAL_SERVICE_PORT:'0',CRP_LOCAL_SERVICE_LOG:'silent'},stdio:['ignore','pipe','pipe']});
    // Port zero must report its actual bound port.
    base=await new Promise((resolve,reject)=>{let output='';const timer=setTimeout(()=>reject(Error('SERVER_START_TIMEOUT')),15000);child.on('exit',()=>{clearTimeout(timer);reject(Error('SERVER_START_FAILED'));});child.stdout.on('data',chunk=>{output+=chunk;const match=/listening on (http:\/\/[^\s]+)\//.exec(output);if(match){clearTimeout(timer);resolve(match[1]);}});});
  }
  async function stop(){const exited=once(child,'exit');child.kill('SIGTERM');await exited;}
  try {
    await launch();
    const created=await fetch(base+'/api/accounts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'worker-owner@example.test',password:'a-long-fictional-password'})});
    check.equal(created.status,201,'worker transport preserves account creation');
    const cookie=created.headers.get('set-cookie').split(';')[0];
    const c=await fetch(base+'/api/cases',{method:'POST',headers:{'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify({country:'CA',region:'CA-NS'})});
    check.equal(c.status,201,'worker transport preserves authenticated case writes');
    check.equal((await fetch(base+'/api/cases')).status,401,'worker preserves ownership authentication');
    await stop();await launch();
    const listed=await (await fetch(base+'/api/cases',{headers:{Cookie:cookie}})).json();
    check.equal(listed.cases.length,1,'restart retains account session and case');
  } finally {if(child?.exitCode===null)await stop();fs.rmSync(temp,{recursive:true,force:true});}
}
module.exports={id:'fy-operational-hardening',title:'Worker isolation, queue budgets, restart custody, monitoring and release-proof rejection',run};
