'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../ui/app.js'),'utf8').split('/* ------------------------------------------------------------------ bootstrap */')[0];
function browser(responder=async()=>({ok:true})) {
  const nodes=new Map(),calls=[],revoked=[],classes=new Map();
  function node(id){if(!nodes.has(id))nodes.set(id,{id,hidden:false,disabled:false,textContent:'',innerHTML:'',style:{},dataset:{},setAttribute(){},removeAttribute(){},querySelector(){return null;},querySelectorAll(){return[];},focus(){},scrollIntoView(){},prepend(){},classList:{toggle(){}}});return nodes.get(id);}
  const context={console,URLSearchParams,setTimeout,clearTimeout,requestAnimationFrame:fn=>fn(),fetch:async(url,options={})=>{calls.push({url,method:options.method||'GET'});const response=await responder(url,options);return{ok:response.status!==503,status:response.status||200,json:async()=>response};},URL:{revokeObjectURL:url=>revoked.push(url)},document:{getElementById:node,querySelectorAll:()=>[],createElement:node,addEventListener(){},body:{classList:{toggle:(key,value)=>classes.set(key,value)}}},location:{hash:'#signin',search:'?workspace=consumer',pathname:'/index.html'},history:{replaceState(_state,_title,url){context.destination=url;}}};
  context.window=context;vm.createContext(context);vm.runInContext(source,context);
  const evaluate=code=>vm.runInContext(code,context);
  evaluate(`surface={countries:[],regions:[],bureau_choices:{},entitlement:{payment_mode:'live'}};state.account={account_id:'fictional-account',email:'fictional@example.test'};state.accountSecurity={signup_complete:true};for(const item of Object.values(STEP_VIEWS))item.render=()=>{};`);
  return{evaluate,node,calls,context,revoked,classes};
}
test('shared header exposes sign out on every signed-in consumer view, including signup invitation',()=>{
  const b=browser(),count=b.evaluate('STEP_KEYS.length');
  for(let step=0;step<count;step++){b.evaluate(`state.step=${step};render()`);assert.equal(b.node('workspace-signout').hidden,false);assert.equal(typeof b.node('workspace-signout').onclick,'function');}
  b.evaluate('state.accountSecurity.signup_complete=false;render()');assert.equal(b.node('workspace-signout').hidden,false);assert.equal(b.classes.get('signed-in'),true);
  b.evaluate('state.account=null;render()');assert.equal(b.node('workspace-signout').hidden,true);assert.equal(b.classes.get('signed-in'),false);
  assert.equal(b.calls.length,0,'rendering the button sends no business or authentication requests');
});
test('sign out revokes the current server session before clearing private client state, once for simultaneous controls',async()=>{
  let complete;const pending=new Promise(resolve=>complete=resolve),b=browser(async()=>pending);
  b.evaluate(`state.cases=[{case_id:'fictional-case'}];state.caseId='fictional-case';state.view={private:'packet'};state.accountDocuments=[{private:'id'}];state.packetChoices={private:'choice'};state.packetRepair={private:'draft'};state.signInInvitation={private:'setup'};state.googleSignInPending={private:'google'};state.accountSecurity={private:'security'};state.billing={private:'billing'};state.pending_checkout={private:'checkout'};state.recoveryKey='fictional-recovery-key';`);
  const first=b.evaluate('signOutCurrentAccount()'),second=b.evaluate('signOutCurrentAccount()');
  assert.equal(first,second);assert.equal(b.calls.length,1);assert.equal(b.evaluate('state.account.account_id'),'fictional-account');
  assert.deepEqual(b.calls,[{url:'/api/sessions/current',method:'DELETE'}]);
  complete({ok:true});await first;
  for(const field of ['account','caseId','view','packetChoices','packetRepair','signInInvitation','googleSignInPending','accountSecurity','billing','pending_checkout','recoveryKey'])assert.equal(b.evaluate('state.'+field),null,field+' cleared');
  assert.equal(b.evaluate('state.cases.length+state.accountDocuments.length'),0);
  assert.equal(b.context.destination,'/index.html?workspace=consumer#signin');
  b.evaluate('render()');assert.equal(b.node('workspace-signout').hidden,true);
});
test('a refused session revocation keeps the account visible and permits an explicit retry',async()=>{
  let unavailable=true;const b=browser(async()=>unavailable?{status:503,error:{message:'Session service unavailable'}}:{ok:true});
  await assert.rejects(b.evaluate('signOutCurrentAccount()'),/Session service unavailable/);
  assert.equal(b.evaluate('state.account.account_id'),'fictional-account');assert.equal(b.context.destination,undefined);
  unavailable=false;await b.evaluate('signOutCurrentAccount()');assert.equal(b.evaluate('state.account'),null);assert.equal(b.calls.length,2);
});
test('sign out invalidates earlier asynchronous account views without changing stored reports',async()=>{
  const b=browser();const earlier=b.evaluate('accountContext()');await b.evaluate('signOutCurrentAccount()');assert.throws(earlier,error=>error.cancelled===true);
  assert.deepEqual(b.calls,[{url:'/api/sessions/current',method:'DELETE'}]);
});
test('homepage login links explicitly select consumer workspace and header is keyboard accessible',()=>{
  const home=fs.readFileSync(path.join(__dirname,'../ui/landing.html'),'utf8'),shell=fs.readFileSync(path.join(__dirname,'../ui/index.html'),'utf8');
  assert.equal((home.match(/href="\/index.html\?workspace=consumer#signin"/g)||[]).length,3);
  assert.match(shell,/<button id="workspace-signout" type="button" class="secondary" hidden>Sign out<\/button>/);
});
