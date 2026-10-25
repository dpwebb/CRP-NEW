'use strict';
// Real HTTP/authentication/storage/packet paths; the external Mail PDF response is explicitly mocked.
const {TestService}=require('../harness.cjs');
const crypto=require('node:crypto');
const link=require('../../mail-ops-link.cjs');
const {buildPdf}=require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
async function run(unused,check){
  const originalCreate=link.create,originalFetch=global.fetch;
  const env={...process.env,CRP_DEPLOYMENT_ENV:'staging',CRP_MAIL_OPS_MODE:'staging-internal',CRP_PAYMENT_PROVIDER:'stripe',STRIPE_SECRET_KEY:'sk_test_fictional',STRIPE_WEBHOOK_SECRET:'whsec_fictional',CRP_MAIL_OPS_URL:'http://127.0.0.1:4335',CRP_MAIL_OPS_KEY:'a'.repeat(64),CRP_MAIL_OPS_PAYMENT_KEY:'b'.repeat(64)};
  let t,pending,entered,preview=buildPdf({pages:[{lines:['FICTIONAL PROVIDER FINAL COPY','Not real mail or an identity document']}]}),remoteCalls=0;
  const orderId='11111111-1111-4111-8111-111111111111';
  try{
    // Billing uses the existing signed local test adapter; this test does not exercise Stripe callbacks.
    link.create=store=>{const value=originalCreate(store,env);delete value.webhook;return value;};
    t=new TestService('https-mailing-preview');link.create=originalCreate;await t.listen();
    const owner=await t.account('https-preview-owner@example.test'),other=await t.account('https-preview-other@example.test');
    const caseId=await t.assessedCase(owner),base='/api/cases/'+caseId;
    let view=(await t.request('GET',base+'/packet',{token:owner.token})).json.view;
    await t.request('POST',base+'/packet/select',{token:owner.token,body:{issue_ids:view.eligible_issues.filter(i=>i.eligible).map(i=>i.issue_id)}});
    await t.preparePostalPacket(owner,caseId);view=(await t.request('GET',base+'/packet',{token:owner.token})).json.view;
    view=(await t.request('POST',base+'/packet/signature',{token:owner.token,body:{reviewed_version:view.packet.preview_version,signature:{name:'Fictional Morgan Sample',date:'2026-10-24',consent:true}}})).json.view;
    await t.request('POST',base+'/packet/approve',{token:owner.token,body:{reviewed_version:view.packet.preview_version}});
    const packet=(await t.request('GET',base+'/packet-download',{token:owner.token})).bytes,packetHash=sha(packet),previewHash=sha(preview);
    const record={id:'22222222-2222-4222-8222-222222222222',order_id:orderId,packet_version:view.packet.preview_version,packet_hash:packetHash,quote:{snapshot:{fulfillment:{mailer:'POSTGRID'},ownerRef:'crp:'+crypto.createHmac('sha256',env.CRP_MAIL_OPS_KEY).update('owner:'+owner.account_id).digest('hex')}},order:{state:'QUEUED'}};
    t.service.store.update(s=>{s.packets.find(p=>p.case_id===caseId).mailing_internal=[record];});
    global.fetch=async(url,options)=>{
      if(String(url).startsWith(env.CRP_MAIL_OPS_URL+'/api/v1/')){
        remoteCalls++;if(entered)entered();if(pending)await pending;
        return new Response(JSON.stringify({orderId,packetHash,previewHash:sha(preview),pdfBase64:preview.toString('base64')}),{status:200,headers:{'Content-Type':'application/json'}});
      }
      return originalFetch(url,options);
    };
    const url=base+'/mailing/print-preview/'+orderId+'/'+previewHash;
    const req=(token=owner.token,suffix=url)=>t.request('GET',suffix,{token});
    check.equal((await req(null)).status,401,'anonymous final-copy opening requires a session');
    check.equal((await req(other.token)).status,403,'other consumers cannot open an owned final mailing PDF');
    check.equal((await req(owner.token,base+'/mailing/print-preview/'+orderId+'/invalid')).status,400,'malformed final-copy hashes are refused');
    check.equal((await req(owner.token,url.replace(orderId,'33333333-3333-4333-8333-333333333333'))).status,409,'an older or different order URL cannot open the current order');
    const opened=await req();check.equal(opened.status,200,'authenticated owner opens the actual final-copy PDF through HTTP');
    check.ok(opened.bytes.equals(preview),'served bytes match the independently supplied provider fixture');
    check.equal(opened.headers.get('content-type'),'application/pdf','response declares a PDF');
    check.equal(opened.headers.get('cache-control'),'private, no-store','protected final copy cannot be cached publicly');
    check.equal(opened.headers.get('x-content-type-options'),'nosniff','the PDF keeps nosniff');
    check.match(opened.headers.get('content-disposition'),/^inline; filename="final-mailing-copy-/,'normal browser PDF viewing is inline');
    check.equal(opened.headers.get('x-crp-preview-hash'),previewHash,'response is bound to the reviewed hash');
    const info=await req(owner.token,url+'/pages');
    check.equal(info.status,200,'owner can obtain the actual final-PDF page count');
    check.equal(info.json.page_count,1,'metadata counts the real provider fixture, rather than guessing from the source packet');
    check.equal(info.json.order_id,orderId,'inline metadata retains the owned order');
    check.equal(info.json.preview_hash,previewHash,'inline metadata retains the exact provider hash');
    const image=await req(owner.token,url+'/pages/1');
    check.equal(image.status,200,'owner can review a physical final-copy page');
    check.equal(image.headers.get('content-type'),'image/png','inline review uses ordinary protected page images');
    check.ok(image.bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),'the page is a real locally rasterized PNG');
    check.equal(image.headers.get('x-crp-preview-hash'),previewHash,'each page image identifies its exact provider PDF');
    check.equal(image.headers.get('cache-control'),'private, no-store','final-copy images cannot enter a public cache');
    for(const suffix of ['/pages','/pages/1']){
      check.equal((await req(null,url+suffix)).status,401,'inline metadata and pages require a session');
      check.equal((await req(other.token,url+suffix)).status,403,'other consumers cannot review an owned final-copy page');
      check.equal((await req(owner.token,url.replace(previewHash,'invalid')+suffix)).status,400,'inline review refuses malformed hash identities');
      check.equal((await req(owner.token,url.replace(orderId,'33333333-3333-4333-8333-333333333333')+suffix)).status,409,'inline review refuses another order identity');
    }
    for(const page of ['0','-1','1.5','2','401','1000'])check.equal((await req(owner.token,url+'/pages/'+page)).status,400,'invalid or nonexistent physical pages are refused');
    const renderer=require('../../packet-page-renderer.cjs');
    const renew=async()=>{const login=await t.request('POST','/api/sessions',{body:{email:owner.email,password:'a-long-enough-password'}});owner.token=/crp_session=([^;]+)/.exec(login.setCookie)[1];};
    async function duringRender(method,suffix,change,status,restore){
      const saved=renderer[method];let release,entered;const wait=new Promise(r=>{release=r;}),started=new Promise(r=>{entered=r;});
      renderer[method]=async(...args)=>{const value=await saved(...args);entered();await wait;return value;};
      const request=req(owner.token,url+suffix);
      try{await Promise.race([started,request.then(()=>{throw Error('Inline request ended before its renderer checkpoint');})]);await change();release();check.equal((await request).status,status,'inline '+suffix+' rechecks authorization/current-copy state after '+method);}
      finally{release();renderer[method]=saved;if(restore)await restore();}
    }
    const cancel=()=>t.service.store.update(s=>{s.packets.find(p=>p.case_id===caseId).mailing_internal[0].order.state='CANCELLED';});
    const uncancel=()=>t.service.store.update(s=>{s.packets.find(p=>p.case_id===caseId).mailing_internal[0].order.state='QUEUED';});
    await duringRender('pageCount','/pages',cancel,409,uncancel);
    await duringRender('pageCount','/pages',()=>t.request('DELETE','/api/sessions/current',{token:owner.token}),401,renew);
    await duringRender('renderPage','/pages/1',cancel,409,uncancel);
    await duringRender('renderPage','/pages/1',()=>t.request('DELETE','/api/sessions/current',{token:owner.token}),401,renew);
    await duringRender('renderPage','/pages/1',()=>{preview=buildPdf({pages:[{lines:['A DIFFERENT FICTIONAL PROVIDER COPY']}]});},409,()=>{preview=opened.bytes;});
    const savedPacket=structuredClone(t.service.store.state().packets.find(p=>p.case_id===caseId));
    await duringRender('renderPage','/pages/1',()=>t.request('POST',base+'/packet/letter',{token:owner.token,body:{letter_text:view.packet.correspondence_preview+'\nA new fictional inline edit.'}}),409,()=>t.service.store.update(s=>{s.packets[s.packets.findIndex(p=>p.case_id===caseId)]=savedPacket;}));
    const {PDFDocument}=require('../../pdf-vendor/pdf-lib-1.17.1.min.js'),twoPages=await PDFDocument.create();twoPages.addPage();twoPages.addPage();twoPages.setTitle('Fictional metadata example\nPages: 1');preview=Buffer.from(await twoPages.save());
    const multilineMetadata=await req(owner.token,base+'/mailing/print-preview/'+orderId+'/'+sha(preview)+'/pages');
    // Poppler versions either escape metadata newlines or print them literally.
    // Literal duplicate Pages rows must remain a safe refusal, never a false count.
    check.ok(multilineMetadata.status===503||(multilineMetadata.status===200&&multilineMetadata.json.page_count===2),'multiline metadata cannot claim an incorrect physical page count');
    twoPages.setTitle('Fictional metadata example Pages: 1');preview=Buffer.from(await twoPages.save());
    check.equal((await req(owner.token,base+'/mailing/print-preview/'+orderId+'/'+sha(preview)+'/pages')).json.page_count,2,'ordinary misleading title text cannot override the physical two-page count');
    preview=Buffer.from('%PDF- malformed fictional provider response');
    check.equal((await req(owner.token,base+'/mailing/print-preview/'+orderId+'/'+sha(preview)+'/pages')).status,503,'an unrenderable provider copy cannot claim complete inline review');
    preview=opened.bytes;
    preview=buildPdf({pages:[{lines:['CHANGED FICTIONAL PROVIDER COPY']}]});
    check.equal((await req()).status,409,'provider regeneration cannot silently change bytes behind a reviewed URL');preview=opened.bytes;
    t.service.store.update(s=>{s.packets.find(p=>p.case_id===caseId).mailing_internal[0].order.state='CANCELLED';});
    check.equal((await req()).status,409,'a canceled current order refuses the final-copy URL');
    t.service.store.update(s=>{s.packets.find(p=>p.case_id===caseId).mailing_internal[0].order.state='QUEUED';});
    let cancelRelease;pending=new Promise(r=>{cancelRelease=r;});const cancelReached=new Promise(r=>{entered=r;});
    const canceledOpening=req();await cancelReached;
    t.service.store.update(s=>{s.packets.find(p=>p.case_id===caseId).mailing_internal[0].order.state='CANCELLED';});cancelRelease();
    check.equal((await canceledOpening).status,409,'cancellation during the provider read refuses the late PDF');pending=null;entered=null;
    t.service.store.update(s=>{s.packets.find(p=>p.case_id===caseId).mailing_internal[0].order.state='QUEUED';});
    let release;pending=new Promise(r=>{release=r;});const reached=new Promise(r=>{entered=r;});
    const opening=req();await reached;await t.request('DELETE','/api/sessions/current',{token:owner.token});release();
    check.equal((await opening).status,401,'logout while provider bytes are loading refuses the late PDF');pending=null;entered=null;
    const login=await t.request('POST','/api/sessions',{body:{email:owner.email,password:'a-long-enough-password'}});owner.token=/crp_session=([^;]+)/.exec(login.setCookie)[1];
    let editRelease;pending=new Promise(r=>{editRelease=r;});const editReached=new Promise(r=>{entered=r;});
    const editedOpening=req();await editReached;
    await t.request('POST',base+'/packet/letter',{token:owner.token,body:{letter_text:view.packet.correspondence_preview+'\nA new fictional edit.'}});editRelease();
    check.equal((await editedOpening).status,409,'editing the approved source during provider loading refuses the late PDF');pending=null;entered=null;
    return {fictional_only:true,real_loopback_http:true,real_storage_and_packet:true,provider_boundary:'MOCKED_PDF_ONLY',external_provider_calls:0,remote_calls:remoteCalls,posting_calls:0};
  }finally{link.create=originalCreate;global.fetch=originalFetch;if(t)await t.close();}
}
module.exports={id:'hc-mailing-https-preview',title:'Authenticated exact-hash final mailing PDF opening with stale/session race refusals',run};
