// Explicit local cross-repository integration: Family HTTP gateway plus real Affiliate PostgreSQL/API.
// Consumer login is the labelled Family fixture; no hosted services or browser sessions are used.
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createServer} from 'node:net';
import {fixtures,account} from './fixtures.mjs';
import {actionBody,actions} from '../src/catalog.mjs';
const native=async(root,file)=>import(pathToFileURL(resolve(root,file)));
async function freePort(){const s=createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p;}
test('Family cost form contract persists classified native costs and reversals with default and inclusive reporting',{timeout:120000},async()=>{
 const affiliateRoot=process.env.CRP_FAMILY_AFFILIATE_ROOT;assert(affiliateRoot,'Set intended isolated Affiliate candidate root');
 const {localDatabase,seedDemo}=await native(affiliateRoot,'scripts/local.mjs'),{buildApp}=await native(affiliateRoot,'src/service.mjs'),{registerOperations}=await native(affiliateRoot,'src/operations.mjs'),{config}=await native(affiliateRoot,'src/config.mjs'),{sign}=await native(affiliateRoot,'src/policy.mjs');
 const root=mkdtempSync(join(tmpdir(),'family-cost-native-'));let db,app,f;
 try{
  db=await localDatabase({root:join(root,'postgres'),port:await freePort()});await seedDemo(db.pool);
  const origin='http://127.0.0.1:'+await freePort(),secret='f'.repeat(40);
  app=await buildApp(db.pool,config({APP_ENV:'test',PUBLIC_ORIGIN:origin,DATABASE_URL:'fictional-local-only',LOCAL_AUTH_SECRET:secret,REFERRAL_SECRET:'r'.repeat(40),BINDING_SECRET:'b'.repeat(40)}),{registerOperations});await app.listen({host:'127.0.0.1',port:Number(new URL(origin).port)});
  f=await fixtures();f.portal.config.upstreams.affiliate=origin;f.portal.config.bindings[account].affiliate.subject='demo-owner';
  await f.login();const token=sign({sub:'demo-owner',aud:'affiliate-local',exp:Math.floor(Date.now()/1000)+3600},secret);
  let r=await f.request('/api/connections/affiliate',{method:'POST',body:{token}});assert.equal(r.status,200,r.text);
  const session=(await f.request('/api/session')).json;assert(session.catalog.actions.affiliate['cost.add'].fields.some(x=>x.name==='simulationRunId'&&x.onlyNonProduction&&!x.required));
  const run=randomUUID(),costs=[];
  const add=async(body)=>{const result=await f.request('/api/actions/affiliate/cost.add',{method:'POST',body:{body:actionBody(actions.affiliate['cost.add'],body),requestId:randomUUID(),confirmation:'local:affiliate:cost.add'}});assert.equal(result.status,200,result.text);assert.equal(result.json.status,'APPLIED');return result;};
  for(const currency of ['CAD','USD','GBP','AUD']){
   const body={id:randomUUID(),sourceRef:'fixture:family:'+currency,currency,amountMinor:321,category:'AI',evidenceRef:'fixture:receipt:'+currency,reviewed:true,occurredAt:new Date().toISOString(),simulationRunId:run};
   await add(body);costs.push(body);
  }
  const rows=(await db.pool.query('SELECT * FROM operating_costs')).rows;assert.equal(rows.length,4);assert(rows.every(x=>x.simulation_run_id===run));
  r=await f.request('/api/apps/affiliate/report');assert.equal(r.status,200,r.text);assert.deepEqual(r.json.data.operatingCosts,[]);
  r=await f.request('/api/apps/affiliate/report?includeSimulation=1');assert.equal(r.status,200,r.text);assert.equal(r.json.data.operatingCosts.length,4);
  r=await f.request('/api/apps/affiliate/costs');assert.equal(r.status,200,r.text);assert.deepEqual(r.json.data.items,[]);
  r=await f.request('/api/apps/affiliate/costs?includeSimulation=1');assert.equal(r.status,200,r.text);assert.equal(r.json.data.items.length,4);assert(r.json.data.items.every(c=>c.simulation_run_id===run));
  const {simulationRunId,...original}=costs[0];await add({...original,id:randomUUID(),sourceRef:'fixture:family:reverse',reversesId:original.id});
  const reversal=(await db.pool.query('SELECT * FROM operating_costs WHERE reverses_id=$1',[original.id])).rows[0];assert.equal(reversal.simulation_run_id,run);
  r=await f.request('/api/apps/affiliate/report?includeSimulation=1');assert.equal(r.json.data.operatingCosts.find(c=>c.currency==='CAD').recorded_cost_minor,'0');
  r=await f.request('/api/apps/affiliate/costs?includeSimulation=1');assert.equal(r.status,200,r.text);assert.equal(r.json.data.items.length,5);assert.equal(r.json.data.totals.find(c=>c.currency==='CAD').recorded_cost_minor,'0');assert.equal(r.json.data.totals.find(c=>c.currency==='CAD').entries,2);
  const events=f.portal.journal.events;assert.equal(events.filter(e=>e.event==='ACTION_RESULT'&&e.outcome==='APPLIED'&&e.operation==='cost.add').length,5);
 }finally{await f?.close();await app?.close();await db?.stop();rmSync(root,{recursive:true,force:true});}
});
