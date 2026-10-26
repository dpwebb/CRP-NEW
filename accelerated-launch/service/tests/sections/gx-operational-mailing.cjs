'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const caseId='case_'+'a'.repeat(24),orderId='11111111-1111-4111-8111-111111111111',attemptId='22222222-2222-4222-8222-222222222222';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function consumer(responder){
  const nodes=new Map(),calls=[],listeners=[];
  const node=id=>{if(!nodes.has(id))nodes.set(id,{value:'',innerHTML:'',textContent:'',style:{},dataset:{},querySelectorAll:()=>[],querySelector:()=>null,setAttribute(){},removeAttribute(){},focus(){}});return nodes.get(id);};
  const context={console,setTimeout,clearTimeout,Promise,URLSearchParams,Date,Map,Set,JSON,Object,Array,Number,String,Error,crypto:require('node:crypto'),document:{getElementById:node,createElement:node,addEventListener:(type,handler,capture)=>listeners.push({type,handler,capture})},navigator:{clipboard:{}},location:{hash:'',search:'',assign(){}},fetch:async(url,options={})=>{
    calls.push({url,method:options.method||'GET'});return {ok:true,status:200,json:async()=>responder(url,options)};
  }};context.window=context;vm.createContext(context);
  const source=fs.readFileSync(path.join(__dirname,'../../ui/app.js'),'utf8');
  vm.runInContext(source.slice(0,source.indexOf('/* ------------------------------------------------------------------ bootstrap */')),context);
  const evaluate=code=>vm.runInContext(code,context);
  evaluate('state.account={account_id:"fictional-return",email:"fictional@example.test"};render=()=>{renderSequence++;};');
  return {context,evaluate,calls,listeners};
}
class Element{
  constructor(tag,text=''){this.tagName=tag;this.children=[];this.text=text;this.isConnected=true;this.value='';this.style={};}
  append(...nodes){this.children.push(...nodes);}
  setAttribute(name,value){this[name]=value;}
  getAttribute(name){return this[name]??null;}
  removeAttribute(name){delete this[name];}
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
  const revoked=[],expired=consumer(()=>({}));
  expired.context.URL={revokeObjectURL:url=>revoked.push(url)};
  expired.context.location.search=`?mailing=complete&report=${caseId}&mail_order=${orderId}&mail_attempt=${attemptId}`;
  expired.context.fetch=async()=>({ok:false,status:401,json:async()=>({error:{code:'AUTHENTICATION_REQUIRED',message:'Sign in to continue.'}})});
  expired.evaluate('state.caseId="'+caseId+'";state.view={private:true};state.entitlement={entitled:true};openedDocumentUrls.add("blob:fictional");');
  let authError;try{await expired.evaluate('api("GET","/api/cases")');}catch(e){authError=e;}
  check.equal(authError?.cancelled,true,'expired private request cancels its stale caller');
  check.equal(expired.evaluate('state.account'),null,'confirmed authentication expiry clears signed-in identity');
  check.equal(expired.evaluate('state.view'),null,'confirmed authentication expiry removes private report panel');
  check.equal(expired.evaluate('state.entitlement'),null,'old paid status cannot remain after authentication expiry');
  check.equal(expired.context.location.hash,'#signin','expiry exposes direct normal sign-in route');
  check.equal(expired.context.location.search.includes(orderId),true,'expiry retains exact closed order context');
  check.equal(revoked[0],'blob:fictional','expiry revokes previously opened protected document URL');
  const notices=consumer(()=>({}));
  notices.evaluate('state.notice="Your yearly upgrade was requested. We will confirm your payment before changing your access.";settleAccessNotice({entitled:true,plan_code:"annual"});');
  check.equal(notices.evaluate('state.notice'),'Your yearly plan is active. Your payment is confirmed.','verified annual access replaces the old upgrade-request notice');
  notices.evaluate('settleAccessNotice({entitled:false});');check.equal(notices.evaluate('state.notice'),null,'refunded or ended access removes a stale yearly-active notice');
  notices.evaluate('state.notice="Packet saved. Loading your pages for review.";settlePacketLoadingNotice(true);');check.equal(notices.evaluate('state.notice').includes('pages are ready'),true,'completed packet loading replaces its loading notice');
  notices.evaluate('state.notice="Packet saved. Loading your pages for review.";settlePacketLoadingNotice(false);');check.equal(notices.evaluate('state.notice'),null,'failed packet loading removes its stale loading success notice');
  for(const [review,text]of [[null,'prepare the draft'],[{state:'DRAFT_PREPARED'},'waiting for the print preview'],[{previewAvailable:true},'review and approve'],[{previewAvailable:true,approved:true},'waiting for staff to submit']]){
    const r=new Element('section');let writes=0;
    context.window.CRP_PACKET_MAILING.mount({root:r,caseId,live:true,version:'v1',ensure(){},canRequest:()=>true,request:async(method)=>{if(method!=='GET')writes++;return {available:true,order:{id:orderId,state:'QUEUED',payment_state:'VERIFIED',mailer:'POSTGRID',print_review:review}};}});
    await tick();await tick();check.equal(r.textContent.includes(text),true,'queued status explains exact provider review substate');check.equal(writes,0,'status display never advances provider operation');
    if(review?.approved)check.equal(r.querySelectorAll('button').some(b=>b.id==='packet-mailing-print-load'),false,'already approved copy does not invite another approval');
  }
  const refunded=new Element('section');
  context.window.CRP_PACKET_MAILING.mount({root:refunded,caseId,live:true,version:'v1',ensure(){},canRequest:()=>true,request:async()=>({available:false,order:{id:orderId,state:'CANCELLED',payment_state:'REFUNDED',payment_hold:true,amount_minor:930,currency:'CAD',refunds:[{id:'re_fictional',status:'succeeded'}]}})});
  await tick();await tick();check.equal(refunded.textContent.includes('staff review'),false,'full refund hides an internal posting hold from the payment next step');
  check.equal(/Refunded CAD\s*9\.30/.test(refunded.textContent),true,'full refund shows ordinary exact currency amount');
  check.equal(refunded.textContent.includes('re_fictional'),true,'full refund exposes its own successful reference');
  const partial=new Element('section');
  context.window.CRP_PACKET_MAILING.mount({root:partial,caseId,live:true,version:'v1',ensure(){},canRequest:()=>true,request:async()=>({available:false,order:{id:orderId,state:'CANCELLED',payment_state:'VERIFIED',amount_minor:930,currency:'CAD',refunds:[{id:'re_partial',amountMinor:230,currency:'CAD',status:'succeeded'},{id:'re_pending',amountMinor:700,currency:'CAD',status:'pending'}]}})});
  await tick();await tick();check.equal(/Refunded CAD\s*2\.30 so far/.test(partial.textContent),true,'partial summary uses only successful native ledger rows');check.equal(partial.textContent.includes('No further payment action'),false,'partial refund does not claim complete financial closure');
  check.equal(partial.textContent.includes('re_pending'),false,'unconfirmed provider refund is not labelled a successful reference');
  const reviewRoot=new Element('section');let approved=false,previewPosts=0,approvalPosts=0;
  context.window.CRP_PACKET_MAILING.mount({root:reviewRoot,caseId,live:true,version:'v1',ensure(){},canRequest:()=>true,request:async(method,url)=>{
    if(url.endsWith('/print-preview')){previewPosts++;return {order_id:orderId,preview_hash:'a'.repeat(64),pdf_base64:Buffer.from('%PDF-1.4 fictional unit bytes').toString('base64')};}
    if(url.endsWith('/pages'))return {order_id:orderId,preview_hash:'a'.repeat(64),page_count:3};
    if(url.endsWith('/approve-print')){approvalPosts++;approved=true;}
    return {available:true,order:{id:orderId,state:'QUEUED',payment_state:'VERIFIED',mailer:'POSTGRID',print_review:{previewAvailable:true,previewHash:'a'.repeat(64),approved}}};
  }});await tick();await tick();
  reviewRoot.querySelectorAll('button').find(n=>n.id==='packet-mailing-print-load').onclick();await tick();await tick();
  const approve=reviewRoot.querySelectorAll('button').find(n=>n.id==='packet-mailing-print-approve'),checked=reviewRoot.querySelectorAll('input').find(n=>n.id==='packet-mailing-print-checked');
  check.equal(approve.disabled,true,'final approval stays disabled after asynchronous load until review prerequisites hold');
  check.equal(reviewRoot.querySelectorAll('a')[0].href, '/api/cases/'+caseId+'/mailing/print-preview/'+orderId+'/'+'a'.repeat(64), 'final-copy link uses the authenticated exact-order/hash HTTPS path');
  // Dispatch the actual component link through app.js's document capture listeners first.
  // Testing only link.onclick misses the shared downloader that can turn HTTPS back into blob:.
  const finalLink=reviewRoot.querySelectorAll('a')[0],navigation=consumer(()=>({}));let prevented=false,windowOpens=0;
  navigation.context.open=()=>{windowOpens++;return {location:{replace(){}},close(){}};};
  const event={target:{closest:selector=>selector==='button'?null:finalLink},preventDefault(){prevented=true;}};
  for(const listener of navigation.listeners.filter(l=>l.type==='click'))listener.handler(event);
  check.equal(prevented,false,'shared document capture preserves native HTTPS final-copy navigation');
  check.equal(windowOpens,0,'final-copy click creates no downloader about:blank window');
  check.equal(navigation.calls.length,0,'final-copy navigation does not fetch and rebuild a blob URL');
  check.equal(finalLink.getAttribute('aria-busy'),null,'native final-copy opening does not enter the legacy download lifecycle');
  await tick();await tick();
  for(const href of ['/api/cases/'+caseId+'/packet/preview?version=v1',finalLink.href.replace(/a{64}$/,'invalid'),finalLink.href.replace(orderId,'not-an-order')]){
    const legacy=consumer(()=>({})),anchor=new Element('a','Private document');anchor.href=href;anchor.target='_blank';let intercepted=false,opens=0;
    legacy.context.open=()=>{opens++;return {location:{replace(){}},close(){}};};
    for(const listener of legacy.listeners.filter(l=>l.type==='click'))listener.handler({target:{closest:selector=>selector==='button'?null:anchor},preventDefault(){intercepted=true;}});
    check.equal(intercepted,true,'other private document and malformed final-copy links retain the existing guarded downloader');
    check.equal(opens,1,'legacy interception retains its single owned preview window');
    check.equal(legacy.calls[0]?.url,href,'legacy downloader still requests the exact selected private document');
    await tick();await tick();
  }
  reviewRoot.querySelectorAll('a')[0].onclick();check.equal(approve.disabled,true,'opening the copy alone does not supply review consent');
  checked.checked=true;checked.onchange();check.equal(approve.disabled,true,'a review check cannot bypass final-copy image loading');
  check.equal(checked.disabled,true,'review consent stays disabled while a final-copy page is missing');
  const images=reviewRoot.querySelectorAll('img');check.equal(images.length,3,'all declared physical final-copy pages have their own review image');
  for(const [index,img]of images.entries()){
    check.equal(img.src,reviewRoot.querySelectorAll('a')[0].href+'/pages/'+(index+1),'serial image requests retain the exact owned order/hash/page URL');
    img.onload();await tick();
    if(index<images.length-1)check.equal(approve.disabled,true,'partial final-copy loading cannot enable approval');
  }
  check.equal(checked.disabled,false,'every final-copy image must load before consent becomes available');
  check.equal(checked.checked,false,'early or restored consent is reset after all pages finish');
  check.equal(approve.disabled,true,'all pages loaded still requires a fresh explicit review check');
  checked.checked=true;checked.onchange();check.equal(approve.disabled,false,'all exact-copy pages and fresh explicit consent enable approval');
  approve.onclick();await tick();await tick();check.equal(approvalPosts,1,'one enabled approval submits once');check.equal(previewPosts,1,'approval does not fetch or prepare another provider copy');
  check.equal(reviewRoot.querySelectorAll('button').some(n=>n.id==='packet-mailing-print-approve'),false,'successful approval does not invite repeated approval');
  async function inlineFixture(metadata={}){
    const r=new Element('section'),state={hash:'a'.repeat(64),live:true,writes:0};
    context.window.CRP_PACKET_MAILING.mount({root:r,caseId,live:true,version:'v1',ensure(){if(!state.live)throw Object.assign(Error('Signed out'),{cancelled:true});},canRequest:()=>true,request:async(method,url)=>{
      if(url.endsWith('/print-preview'))return {order_id:orderId,preview_hash:state.hash};
      if(url.endsWith('/pages'))return {order_id:orderId,preview_hash:state.hash,page_count:2,...metadata};
      if(method==='POST')state.writes++;
      return {available:true,order:{id:orderId,state:'QUEUED',payment_state:'VERIFIED',mailer:'POSTGRID',print_review:{previewAvailable:true,previewHash:state.hash,approved:false}}};
    }});await tick();await tick();
    await r.querySelectorAll('button').find(n=>n.id==='packet-mailing-print-load').onclick();await tick();
    return {root:r,state};
  }
  const failed=await inlineFixture(),failedImages=failed.root.querySelectorAll('img');failedImages[0].onload();await tick();failedImages[1].onerror();await tick();
  check.equal(failed.root.querySelectorAll('input').find(n=>n.id==='packet-mailing-print-checked').disabled,true,'a failed final-copy image keeps consent unavailable');
  check.equal(failed.root.querySelectorAll('button').find(n=>n.id==='packet-mailing-print-approve').disabled,true,'a later image failure cannot leave final approval enabled');
  check.equal(failed.root.textContent.includes('could not show every final-copy page'),true,'incomplete review gives a clear refresh/load recovery instruction');
  check.equal(failed.state.writes,0,'an image failure never submits approval or mailing');
  const refreshed=await inlineFixture(),oldImage=refreshed.root.querySelectorAll('img')[0];
  await refreshed.root.querySelectorAll('button').find(n=>n.id==='packet-mailing-refresh').onclick();await tick();oldImage.onload();await tick();
  check.equal(refreshed.root.querySelectorAll('input').find(n=>n.id==='packet-mailing-print-checked').disabled,true,'a late image from a previous render cannot complete the new review');
  check.equal(refreshed.root.querySelectorAll('button').find(n=>n.id==='packet-mailing-print-approve').disabled,true,'refresh resets the current every-page approval gate');
  const changed=await inlineFixture(),changedImage=changed.root.querySelectorAll('img')[0];changed.state.hash='b'.repeat(64);
  await changed.root.querySelectorAll('button').find(n=>n.id==='packet-mailing-refresh').onclick();await tick();changedImage.onload();await tick();
  check.equal(changed.root.querySelectorAll('img').length,0,'a changed preview hash removes every old final-copy page');
  check.equal(changed.root.querySelectorAll('button').some(n=>n.id==='packet-mailing-print-approve'),false,'a stale preview cannot offer approval for a changed final copy');
  const closed=await inlineFixture();closed.root.isConnected=false;closed.root.querySelectorAll('img')[0].onload();await tick();
  check.equal(closed.root.querySelectorAll('input').find(n=>n.id==='packet-mailing-print-checked').disabled,true,'a closed final-copy view never completes consent');
  const signedOut=await inlineFixture();signedOut.state.live=false;signedOut.root.querySelectorAll('img')[0].onload();await tick();
  check.equal(signedOut.root.querySelectorAll('button').find(n=>n.id==='packet-mailing-print-approve').disabled,true,'account expiry during page loading cannot enable approval');
  for(const invalid of [{page_count:401},{preview_hash:'b'.repeat(64)}]){
    const bad=await inlineFixture(invalid);
    check.equal(bad.root.querySelectorAll('img').length,0,'invalid or mismatched final-copy metadata creates no review pages');
    check.equal(bad.root.querySelectorAll('button').some(n=>n.id==='packet-mailing-print-approve'),false,'invalid metadata cannot expose a final approval action');
  }
  return {fictional_only:true,external_calls:0,return_writes:0,provider_proof:false};
}
module.exports={id:'gx-operational-mailing',title:'Operational mailing return binds owned state and terminal status remains truthful',run};
