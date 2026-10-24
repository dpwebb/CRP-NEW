'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const caseId='case_'+'a'.repeat(24),orderId='11111111-1111-4111-8111-111111111111',attemptId='22222222-2222-4222-8222-222222222222';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function consumer(responder){
  const nodes=new Map(),calls=[];
  const node=id=>{if(!nodes.has(id))nodes.set(id,{value:'',innerHTML:'',textContent:'',style:{},dataset:{},querySelectorAll:()=>[],querySelector:()=>null,setAttribute(){},removeAttribute(){},focus(){}});return nodes.get(id);};
  const context={console,setTimeout,clearTimeout,Promise,URLSearchParams,Date,Map,Set,JSON,Object,Array,Number,String,Error,crypto:require('node:crypto'),document:{getElementById:node,createElement:node},navigator:{clipboard:{}},location:{hash:'',search:'',assign(){}},fetch:async(url,options={})=>{
    calls.push({url,method:options.method||'GET'});return {ok:true,status:200,json:async()=>responder(url,options)};
  }};context.window=context;vm.createContext(context);
  const source=fs.readFileSync(path.join(__dirname,'../../ui/app.js'),'utf8');
  vm.runInContext(source.slice(0,source.indexOf('/* ------------------------------------------------------------------ bootstrap */')),context);
  const evaluate=code=>vm.runInContext(code,context);
  evaluate('state.account={account_id:"fictional-return",email:"fictional@example.test"};render=()=>{renderSequence++;};');
  return {context,evaluate,calls};
}
class Element{
  constructor(tag,text=''){this.tagName=tag;this.children=[];this.text=text;this.isConnected=true;this.value='';}
  append(...nodes){this.children.push(...nodes);}
  setAttribute(name,value){this[name]=value;}
  replaceChildren(...nodes){this.children=nodes;this.text='';}
  set textContent(value){this.text=value;this.children=[];}
  get textContent(){return this.text+this.children.map(n=>typeof n==='string'?n:n.textContent).join(' ');}
  querySelectorAll(tag){return this.children.flatMap(n=>typeof n==='string'?[]:[...(n.tagName===tag?[n]:[]),...n.querySelectorAll(tag)]);}
}
async function run(unused,check){
  for(const paymentState of ['VERIFIED','UNPAID','REFUNDED']){
    const h=consumer(url=>url.endsWith('/mailing')?{attempt_id:attemptId,order:{id:orderId,payment_state:paymentState}}:url==='/api/entitlement'?{entitlement:{entitled:true}}:{view:{case:{case_id:caseId}}});
    h.context.location.search=`?mailing=complete&report=${caseId}&mail_order=${orderId}&mail_attempt=${attemptId}`;
    const context=h.evaluate('checkoutReturnContext()');check.equal(context.orderId,orderId,'return captures exact order context');
    await h.evaluate('restoreCheckoutReport(checkoutReturnContext())');
    check.equal(h.evaluate('state.caseId'),caseId,'authenticated owned report is restored');
    check.equal(h.evaluate('state.step===STEP.REVIEW'),true,'return resumes packet and mailing status');
    check.equal(h.calls.every(c=>c.method==='GET'),true,'return cannot replay payment or order writes');
    check.equal(h.evaluate('state.notice').includes('payment is confirmed'),paymentState==='VERIFIED','URL complete never substitutes for verified payment');
  }
  const wrong=consumer(url=>url.endsWith('/mailing')?{attempt_id:attemptId,order:{id:'wrong-order',payment_state:'VERIFIED'}}:url==='/api/entitlement'?{}:{view:{case:{case_id:caseId}}});
  wrong.context.location.search=`?mailing=complete&report=${caseId}&mail_order=${orderId}&mail_attempt=${attemptId}`;
  await wrong.evaluate('restoreCheckoutReport(checkoutReturnContext())');check.equal(wrong.evaluate('state.caseId'),null,'mismatched order is not restored as a paid request');
  const bad=consumer(()=>({}));
  for(const query of ['?mailing=complete','?mailing=paid&report='+caseId,`?mailing=complete&report=${caseId}&mail_order=bad&mail_attempt=${attemptId}`]){
    bad.context.location.search=query;check.equal(bad.evaluate('checkoutReturnContext()'),null,'malformed or invented return context is ignored');
  }
  let release;const pending=new Promise(resolve=>{release=resolve;});
  const stale=consumer(url=>url.endsWith('/mailing')?pending:url==='/api/entitlement'?{}:{view:{case:{case_id:caseId}}});
  stale.context.location.search=`?mailing=complete&report=${caseId}&mail_order=${orderId}&mail_attempt=${attemptId}`;
  const restore=stale.evaluate('restoreCheckoutReport(checkoutReturnContext())');await tick();
  stale.evaluate('accountEpoch++;state.account=null;state.caseId=null;');release({attempt_id:attemptId,order:{id:orderId,payment_state:'VERIFIED'}});
  let discarded=false;try{await restore;}catch(e){discarded=e.cancelled===true;}
  check.equal(discarded,true,'a delayed return is discarded after sign-out');check.equal(stale.evaluate('state.caseId'),null,'late response cannot repopulate signed-out state');

  const root=new Element('section'),calls=[],context={window:{location:{assign(){}}},document:{createElement:tag=>new Element(tag),createTextNode:text=>new Element('text',text)},Date,Intl,URL,Blob,Uint8Array,atob};
  vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../../ui/packet-mailing.js'),'utf8'),context);
  let cancelled=false;
  context.window.CRP_PACKET_MAILING.mount({root,caseId,live:true,version:'v1',ensure(){},canRequest:()=>true,request:async(method,url)=>{
    calls.push({method,url});if(method==='POST'){cancelled=true;return {order:{id:orderId,state:'CANCELLED',payment_state:'REFUNDED',mailer:'POSTGRID'}};}
    return {available:true,mailers:[{mailer:'POSTGRID'}],order:{id:orderId,state:cancelled?'CANCELLED':'QUEUED',payment_state:cancelled?'REFUNDED':'VERIFIED',mailer:'POSTGRID'},refund_status:cancelled?'succeeded':null};
  }});await tick();await tick();
  root.querySelectorAll('button').find(n=>n.textContent==='Cancel this mailing request').onclick();await tick();await tick();
  check.equal(calls.filter(c=>c.method==='POST').length,1,'cancellation sends one owned mutation');
  check.equal(calls.at(-1).method,'GET','mutation is followed by complete authoritative status');
  check.equal(root.textContent.includes('currently unavailable'),false,'missing mutation fields do not invent a route outage');
  check.equal(root.textContent.includes('stay on hold until'),false,'cancelled/refunded order has no pending print-approval instruction');
  check.equal(root.textContent.includes('Payment: refunded'),true,'terminal payment result remains visible');
  return {fictional_only:true,external_calls:0,return_writes:0,provider_proof:false};
}
module.exports={id:'gx-operational-mailing',title:'Operational mailing return binds owned state and terminal status remains truthful',run};
