'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
async function run(t,check){
 const wrapped=require('../../packet-composer-worker.cjs').wrapped;let widthCalls=0;
 const font={widthOfTextAtSize(value,size){widthCalls++;return Array.from(value).length*size;}};
 const repeated=Array.from({length:100},()=> 'AB CD EF').join('\n');
 check.equal(JSON.stringify(wrapped(repeated,font,1,5)),JSON.stringify(Array.from({length:100},()=>['AB','CD EF']).flat()),'repeated paragraphs keep exact word wrapping');
 check.ok(widthCalls<30,'identical font widths are measured once instead of for every repeated paragraph');
 check.equal(JSON.stringify(wrapped('AB CD EF',font,2,8)),JSON.stringify(['AB','CD','EF']),'a different font size uses independent measurements');
 check.equal(JSON.stringify(wrapped('AB\n\nCD',font,1,5)),JSON.stringify(['AB','','CD']),'measurement reuse preserves blank paragraphs');
 const navSource=fs.readFileSync(path.join(__dirname,'../../ui/app.js'),'utf8'),scope={state:{step:'billing',error:'Choose a report',notice:'Earlier saved notice'},STEP:{BILLING:'billing'},visibleStep:v=>v,signInChallenge:null,packetLeave:null,el:()=>null,render(){},focusStepHeading(){}};vm.createContext(scope);vm.runInContext(navSource.slice(navSource.indexOf('function navigateStep('),navSource.indexOf('function banner(')),scope);vm.runInContext("navigateStep('history')",scope);check.equal(scope.state.error,null,'changing tasks clears the previous panel validation error');check.equal(scope.state.notice,null,'changing tasks clears the previous panel success notice');scope.state.error='Current validation';vm.runInContext("navigateStep('history')",scope);check.equal(scope.state.error,'Current validation','staying on the same task retains its current validation');

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
