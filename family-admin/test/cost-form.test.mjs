import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {actions,actionBody} from '../src/catalog.mjs';
import {fixtures} from './fixtures.mjs';
const cost={id:'11111111-1111-4111-8111-111111111111',sourceRef:'fixture:form:cost',currency:'CAD',amountMinor:123,category:'AI',evidenceRef:'fixture:receipt',reviewed:true,occurredAt:'2026-10-23T12:00:00Z'};
const input=body=>({body,requestId:randomUUID(),confirmation:'local:affiliate:cost.add'});
test('actual cost confirmation form offers optional simulation tag outside production and submits the entered run unchanged',async()=>{
 const code=readFileSync(new URL('../public/app.js',import.meta.url),'utf8'),fn=code.slice(code.indexOf('async function confirmAction('),code.indexOf('async function followOperation('));
 for(const environment of ['local','staging','production']){
  let shown,submitted;
  const context=vm.createContext({S:{session:{environment,catalog:{actions:{affiliate:{'cost.add':{...actions.affiliate['cost.add'],requiresStepUp:true}}}}}},api:async(path,options)=>{submitted={path,...options};return {status:'APPLIED'};},labels:{affiliate:'Affiliate'},crypto:{randomUUID},recordChoices:async()=>{},notice(){},dialog:(title,message,fields,submit)=>{shown={title,fields,submit};}});
  vm.runInContext(fn,context);await context.confirmAction('affiliate','cost.add');
  const tag=shown.fields.find(f=>f.name==='simulationRunId');assert.equal(!!tag,environment!=='production');
  if(tag){assert.equal(tag.required,false);const run=randomUUID();await shown.submit({...cost,simulationRunId:run,freshCode:'654321',confirmText:environment+':affiliate:cost.add'});assert.equal(submitted.body.body.simulationRunId,run);assert.equal(submitted.body.body.freshCode,undefined);}
  assert.equal(shown.fields.find(f=>f.name==='freshCode').required,true);
 }
 assert.deepEqual(actionBody(actions.affiliate['cost.add'],{...cost,simulationRunId:''}),cost,'blank optional tag is omitted for legacy costs and inherited reversals');
});
test('Family forwards cost simulation tag once and rejects forged production fields before native mutation or intent',async()=>{
 const f=await fixtures();try{
  await f.login();await f.connect();const run=randomUUID();let r=await f.request('/api/actions/affiliate/cost.add',{method:'POST',body:input({...cost,simulationRunId:run})});assert.equal(r.status,200,r.text);assert.equal(r.json.status,'APPLIED');
  assert.equal(f.state.writes.filter(w=>w.path==='/api/operating-costs').length,1);assert.equal(f.state.writes.find(w=>w.path==='/api/operating-costs').body.simulationRunId,run);
  const before=f.portal.journal.events.filter(e=>e.event==='ACTION_INTENT').length;
  f.portal.config.environment='production';
  r=await f.request('/api/actions/affiliate/cost.add',{method:'POST',body:{...input({...cost,simulationRunId:run}),confirmation:'production:affiliate:cost.add'}});
  assert.equal(r.status,403,r.text);assert.equal(r.json.error.code,'SIMULATION_REQUIRES_ISOLATED_ENVIRONMENT');assert.equal(f.state.writes.filter(w=>w.path==='/api/operating-costs').length,1);assert.equal(f.portal.journal.events.filter(e=>e.event==='ACTION_INTENT').length,before);
 }finally{await f.close();}
});
