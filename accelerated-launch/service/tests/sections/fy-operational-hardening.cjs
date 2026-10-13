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
  const budgeted=new ProcessingDispatcher({workerFile:fixture,timeoutMs:450});
  const budgetServer=http.createServer((req,res)=>budgeted.handle(req,res));
  try {
    await once(budgeted,'ready');await new Promise(resolve=>budgetServer.listen(0,'127.0.0.1',resolve));
    const base='http://127.0.0.1:'+budgetServer.address().port;
    const first=fetch(base+'/first');await new Promise(resolve=>setTimeout(resolve,30));
    const started=Date.now(),second=fetch(base+'/second',{signal:AbortSignal.timeout(1000)});
    check.equal((await first).status,200,'first job fits the response budget');
    check.equal((await second).status,503,'queued job cannot receive a fresh execution budget');
    check.ok(Date.now()-started<900,'queue plus execution refusal arrives before the proxy budget');
  } finally {await budgeted.close();await new Promise(resolve=>budgetServer.close(resolve));}
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
  const {PrivateStore}=require('../../private-store.cjs');
  const store=new PrivateStore(path.join(temp,'durability'));
  store.update(state=>state.accounts.push({account_id:'retained'}));
  const first=store.state();check.equal(store.state(),first,'unchanged reads reuse the immutable state snapshot');
  check.equal(Object.isFrozen(first.accounts),true,'cached account collections cannot be mutated outside a transaction');
  store.update(state=>state.accounts.push({account_id:'second'}));
  fs.unlinkSync(store.stateFile);
  check.equal(store.state().accounts[0].account_id,'retained','missing primary recovers the preceding durable backup');
  check.equal(store.recoveredFromBackup,true,'recovery is observable for operational alerts');
  fs.writeFileSync(store.stateFile,'invalid');fs.writeFileSync(store.backupFile,'invalid');
  check.equal(store.readiness().readable,false,'corrupt primary and backup refuse readiness');
  fs.unlinkSync(store.stateFile);fs.unlinkSync(store.backupFile);
  const lost=new PrivateStore(path.join(temp,'durability'),{allowMultiWriter:true});
  check.equal(lost.readiness().readable,false,'restart with both state files missing refuses an initialized store');
  const orphan=new PrivateStore(path.join(temp,'orphan-store'));fs.writeFileSync(path.join(orphan.blobDir,'original.bin'),'retained');
  check.equal(orphan.readiness().readable,false,'missing state never treats existing blobs as a new empty account store');
  check.equal(fs.readFileSync(path.join(orphan.blobDir,'original.bin'),'utf8'),'retained','failed readiness leaves report bytes intact');
  let apiCalls=0;const apiDelivery=await require('../../deploy/operational-alert.cjs').send({HOSTINGER_MAIL_TOKEN:'fictional-token',HOSTINGER_MAIL_ACCOUNT:'admin@creditregulatorpro.com'},'Fixture','No consumer data',{fetch:async(url,options)=>{apiCalls++;if(url.endsWith('/me'))return{ok:true,json:async()=>({data:{mailboxes:[{address:'admin@creditregulatorpro.com',resourceId:'ACfixture'}]}})};check.deepEqual(JSON.parse(options.body).to,['admin@creditregulatorpro.com'],'API delivery targets only the confirmed operational recipient');return{status:204};}});
  check.equal(apiDelivery.accepted,true,'provider acceptance is required for an API alert acknowledgement');
  const requestPolicy=require('../../request-policy.cjs').policy({limit:2});
  const request={method:'POST',url:'/api/sessions',headers:{host:'localhost',origin:'http://localhost','content-type':'application/json','content-length':'2'},socket:{remoteAddress:'192.0.2.1'}};
  let error;try{requestPolicy({...request,headers:{...request.headers,origin:'https://foreign.test'}});}catch(e){error=e;}
  check.equal(error?.code,'NOT_AUTHORIZED','foreign origin cannot mutate local service');
  requestPolicy(request);requestPolicy({...request,headers:{...request.headers,'x-forwarded-for':'192.0.2.9'}});
  error=null;try{requestPolicy({...request,headers:{...request.headers,'x-forwarded-for':'192.0.2.10'}});}catch(e){error=e;}
  check.equal(error?.code,'TOO_MANY_FAILED_SIGN_INS','forged forwarding headers cannot evade peer throttling');
  const alert=require('../../deploy/operational-alert.cjs'),outage={checked_at:new Date().toISOString(),results:[{target:'production',passed:false,failures:['SERVICE_NOT_READY']}]};
  let sends=0;const delivery=await alert.notify(outage,null,async()=>sends++);
  await alert.notify(outage,delivery,async()=>sends++);check.equal(sends,1,'unchanged outages do not spam the operator');
  await alert.notify({...outage,results:[{target:'production',passed:true,failures:[]}]},delivery,async()=>sends++);check.equal(sends,2,'recovery sends one operator notice');
  let deliveryFailed=false;try{await alert.notify(outage,null,async()=>{throw Error('offline');});}catch{deliveryFailed=true;}check.equal(deliveryFailed,true,'failed delivery cannot acknowledge an outage');
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
    const c=await fetch(base+'/api/cases',{method:'POST',headers:{'Content-Type':'application/json',Cookie:cookie,Origin:base},body:JSON.stringify({country:'CA',region:'CA-NS'})});
    check.equal(c.status,201,'worker transport preserves authenticated case writes');
    check.equal((await fetch(base+'/api/cases')).status,401,'worker preserves ownership authentication');
    await stop();await launch();
    const listed=await (await fetch(base+'/api/cases',{headers:{Cookie:cookie}})).json();
    check.equal(listed.cases.length,1,'restart retains account session and case');
  } finally {if(child?.exitCode===null)await stop();fs.rmSync(temp,{recursive:true,force:true});}
}
module.exports={id:'fy-operational-hardening',title:'Worker isolation, queue budgets, restart custody, monitoring and release-proof rejection',run};
