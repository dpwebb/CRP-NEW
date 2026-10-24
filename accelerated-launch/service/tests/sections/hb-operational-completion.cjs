'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
async function run(t,check){
 const source=fs.readFileSync(path.join(__dirname,'../../ui/app.js'),'utf8'),nodes=new Map();
 const node=id=>{if(!nodes.has(id))nodes.set(id,{innerHTML:'',textContent:'',value:'',focus(){}});return nodes.get(id);};
 const ctx={console,URLSearchParams,Map,Set,Date,JSON,Object,Array,Number,String,Error,setTimeout,clearTimeout,document:{getElementById:node},navigator:{clipboard:{}},location:{search:'',hash:''}};ctx.window=ctx;vm.createContext(ctx);vm.runInContext(source.slice(0,source.indexOf('/* ------------------------------------------------------------------ bootstrap */')),ctx);ctx.panel={innerHTML:''};ctx.transitions=[];
 vm.runInContext("state.account={account_id:'fictional-history'};state.step=STEP.HISTORY;navigateStep=step=>transitions.push(step);",ctx);
 for(const scenario of [{code:'SUBSCRIPTION_REQUIRED',status:402,subscription:true},{code:'SERVICE_STATE_UNAVAILABLE',status:503,subscription:false}]){
  ctx.refusal=scenario;vm.runInContext("api=async()=>{throw Object.assign(Error('fixture'),refusal);};renderHistory(panel);",ctx);await new Promise(setImmediate);await new Promise(setImmediate);
  const html=node('history-body').innerHTML;
  check.equal(html.includes('Report history and comparison need a subscription'),scenario.subscription,'subscription access is distinguished from an outage');
  check.equal(html.includes('id="history-retry"'),!scenario.subscription,'only actual service failure offers retry');
  if(scenario.subscription){node('history-saved-files').onclick();node('history-plans').onclick();check.equal(ctx.transitions.length,2,'both saved-file and plan actions remain available');}
 }
 const actor=await t.unpaidAccount('history-gate@example.test');check.equal((await t.request('GET','/api/history',{token:actor.token})).status,402,'unpaid history API authorization remains unchanged');
 const events=[],store=t.service.store;store.retentionObserver=record=>events.push(record);
 store.update(s=>{s.billing_events.push(...[1,2,3].map(n=>({outcome:'REJECTED',received_at:'fictional-'+n,fingerprint:'private-test-'+n,account_id:null,entitlement_id:null,effect:null})));});
 store.update(s=>{s.billing_events=s.billing_events.slice(2);});
 check.equal(events.length,1,'one committed removal emits one bounded observation');check.equal(events[0].count,2,'observation counts exact removed diagnostic rows');check.equal(Object.keys(events[0]).sort().join(','),'count,event,outcome','runtime diagnostics expose no identifiers or content');
 store.retentionObserver=()=>{throw Error('fixture sink failure');};store.update(s=>{s.billing_events=[];});check.equal(JSON.parse(fs.readFileSync(store.stateFile)).billing_events.length,0,'observer failure never misreports an already committed write');
 return {history_402_distinct:true,retention_counts:true,fictional_only:true};
}
module.exports={id:'hb-operational-completion',title:'History access guidance and durable bounded diagnostic observations',run};
