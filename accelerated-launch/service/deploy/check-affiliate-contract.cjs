'use strict';
// Explicit local two-checkout contract test. No runtime .env, host or provider access.
const assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const {pathToFileURL} = require('node:url');
const {randomBytes, randomUUID} = require('node:crypto');
const net = require('node:net');
const {PrivateStore} = require('../private-store.cjs');
const {create} = require('../affiliate-attribution.cjs');
async function freePort() {
  const server=net.createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const port=server.address().port;await new Promise(r=>server.close(r));return port;
}
async function main() {
  if(process.argv.length!==4 || process.argv[2]!=='--affiliate-repo') throw Error('AFFILIATE_TEST_REPOSITORY_REQUIRED');
  const repo=path.resolve(process.argv[3]);
  const load=file=>import(pathToFileURL(path.join(repo,file)).href);
  const [{localDatabase,seedDemo},{config},{buildApp},{runOne}]=await Promise.all([
    load('scripts/local.mjs'),load('src/config.mjs'),load('src/service.mjs'),load('src/worker.mjs')
  ]);
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'crp-paired-contract-'));
  const key=randomBytes(32).toString('hex'), publicOrigin='https://affiliates-staging.creditregulatorpro.com';
  let db,app,adapter,store;
  try {
    db=await localDatabase({root:path.join(root,'affiliate'),port:await freePort()});
    const partner=await seedDemo(db.pool),campaign=randomUUID();
    await db.pool.query("INSERT INTO campaigns(id,partner_id,name,country) VALUES($1,$2,'Fictional paired contract','CA')",[campaign,partner]);
    const cfg=config({APP_ENV:'test',DATABASE_URL:'fictional',PUBLIC_ORIGIN:publicOrigin,CONSUMER_ORIGIN:'https://staging.creditregulatorpro.com',REFERRAL_SECRET:randomBytes(32).toString('hex'),BINDING_SECRET:key,CONSUMER_BINDING_ENABLED:'true'});
    app=await buildApp(db.pool,cfg);
    const local=await app.listen({host:'127.0.0.1',port:0});
    const missingConsent=await fetch(local+'/r/'+campaign,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({consent:false,consentRef:'consent:fictional-paired'})});
    assert.equal(missingConsent.status,400);await missingConsent.body.cancel();
    const issued=await fetch(local+'/r/'+campaign,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({consent:true,consentRef:'consent:fictional-paired'})});
    assert.equal(issued.status,200);const handoff=await issued.json();
    const token=new URL(handoff.consumerUrl).searchParams.get('t');
    store=new PrivateStore(path.join(root,'consumer'));store.update(s=>s.accounts.push({account_id:'acc_fictional_paired'}));
    let clock=Date.now(),outage=true,deliveries=0;
    adapter=create(store,{env:{CRP_DEPLOYMENT_ENV:'staging',CRP_AFFILIATE_BINDING_ENABLED:'1',CRP_AFFILIATE_ORIGIN:publicOrigin,CRP_AFFILIATE_BINDING_KEY:key},now:()=>clock,fetcher:async(url,options)=>{
      // Fault-inject only the transport. Exact real receiver handles the signed body over loopback.
      assert.equal(url,publicOrigin+'/hooks/binding');
      if(outage)return {status:503};
      const result=await fetch(local+'/hooks/binding',options);assert.equal(result.status,200);await result.body.cancel();
      const duplicate=await fetch(local+'/hooks/binding',options);assert.equal(duplicate.status,200);await duplicate.body.cancel();deliveries+=2;
      return {status:200};
    }});
    const req={method:'GET',url:'/affiliate/referral?t='+encodeURIComponent(token),headers:{}};
    const capture=adapter.capture(req);assert.equal(capture.status,303);assert.equal(capture.headers.Location,'/');assert(capture.headers['Set-Cookie'].includes('; Secure'));
    req.headers.cookie=capture.headers['Set-Cookie'].split(';')[0];adapter.bind(req,{account_id:'acc_fictional_paired'});
    await adapter.drain();assert.equal(store.state().accounts[0].affiliate_binding.state,'READY');
    const event=store.state().accounts[0].affiliate_binding.body.eventId;
    clock+=120000;outage=false;await adapter.drain();
    assert.equal(store.state().accounts[0].affiliate_binding.state,'SENT');assert.equal(store.state().accounts[0].affiliate_binding.body.eventId,event);assert.equal(deliveries,2);
    assert.equal((await db.pool.query("SELECT count(*) n FROM inbox WHERE source='crp-binding'")).rows[0].n,'1');
    await runOne(db.pool,cfg);
    const row=(await db.pool.query('SELECT * FROM bindings WHERE consumer_ref=$1',['acc_fictional_paired'])).rows[0];
    assert.equal(row.partner_id,partner);assert.equal(row.consent_ref,'consent:fictional-paired');
    assert.equal((await db.pool.query('SELECT count(*) n FROM journal')).rows[0].n,'0');
    process.stdout.write(JSON.stringify({passed:true,scope:'LOCAL_TWO_APP_CONTRACT',explicitConsent:true,signedHandoff:true,queuedRetry:true,receiverDeduplication:true,bindingRecorded:true,commissionInvented:false,liveAttributionVerified:false})+'\n');
  } finally {
    adapter?.close();store?.close?.();await app?.close();await db?.stop();
    // Only the freshly allocated owned temporary fixture tree is removable.
    if(path.dirname(root)===path.resolve(os.tmpdir()) && path.basename(root).startsWith('crp-paired-contract-')) fs.rmSync(root,{recursive:true,force:true});
  }
}
main().catch(()=>{process.stderr.write('LOCAL_AFFILIATE_CONTRACT_FAILED\n');process.exitCode=1;});
