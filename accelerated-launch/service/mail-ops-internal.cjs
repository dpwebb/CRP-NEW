'use strict';
// One-time mailing purchases remain separate from subscription entitlements.
const crypto=require('node:crypto');
const stripe=require('./stripe.cjs'),cases=require('./cases.cjs'),packets=require('./packets.cjs'),entitlement=require('./entitlement.cjs');
const {ServiceError}=require('./errors.cjs');
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const fail=()=>{throw new ServiceError('MAILING_SERVICE_UNAVAILABLE');};
function configuration(env=process.env){
  const production=env.CRP_DEPLOYMENT_ENV==='production'&&env.CRP_MAIL_OPS_MODE==='production-internal'&&/^sk_live_/.test(env.STRIPE_SECRET_KEY||'')&&env.CRP_MAIL_OPS_URL==='http://127.0.0.1:4336';
  const staging=env.CRP_DEPLOYMENT_ENV==='staging'&&env.CRP_MAIL_OPS_MODE==='staging-internal'&&/^sk_test_/.test(env.STRIPE_SECRET_KEY||'')&&env.CRP_MAIL_OPS_URL==='http://127.0.0.1:4335';
  const enabled=(production||staging)&&env.CRP_PAYMENT_PROVIDER==='stripe'&&/^[a-f0-9]{64}$/.test(env.CRP_MAIL_OPS_KEY||'')&&/^[a-f0-9]{64}$/.test(env.CRP_MAIL_OPS_PAYMENT_KEY||'')&&env.CRP_MAIL_OPS_KEY!==env.CRP_MAIL_OPS_PAYMENT_KEY;
  return {enabled,internal:enabled,livemode:production,source:production?'CRP_PRODUCTION_INTERNAL':'CRP_STAGING_INTERNAL',origin:env.CRP_MAIL_OPS_URL,key:env.CRP_MAIL_OPS_KEY,paymentKey:env.CRP_MAIL_OPS_PAYMENT_KEY,
    consumerOrigin:production?'https://creditregulatorpro.com':'https://staging.creditregulatorpro.com'};
}
function exact(body,keys){if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).sort().join(',')!==keys.sort().join(','))throw new ServiceError('INVALID_REQUEST');}
function create(store,env=process.env){
  const busy=new Set(),readNonces=new Map(),deletingAccounts=new Set(),deletingCases=new Set();
  const config=()=>{const value=configuration(env);if(!value.enabled)fail();return value;};
  function row(actor,caseId,state=store.state()){const p=state.packets.find(p=>p.case_id===caseId&&p.account_id===actor.account_id);if(!p)throw new ServiceError('NOT_FOUND');return p;}
  function authorize(actor,caseId){if(deletingAccounts.has(actor.account_id)||deletingCases.has(actor.account_id+':'+caseId))throw new ServiceError('MAILING_ORDER_CHANGED');cases.requireOwnedCase(store,actor,caseId);entitlement.requireSubscriberFeature(store,actor);return config();}
  const records=(actor,caseId)=>(row(actor,caseId).mailing_internal||[]).map(record=>structuredClone(record));
  function update(actor,caseId,id,values){if(!actor?.account_id)return;store.update(state=>{const item=row(actor,caseId,state).mailing_internal.find(r=>r.id===id);if(!item)fail();Object.assign(item,values);});}
  async function locked(actor,caseId,fn){const id=actor.account_id+':'+caseId;if(busy.has(id))throw new ServiceError('MAILING_ORDER_CHANGED');busy.add(id);try{return await fn();}finally{busy.delete(id);}}
  async function remote(c,principal,method,path,data){
    const raw=data===undefined?'':JSON.stringify(data),timestamp=String(Date.now()),nonce=crypto.randomUUID();
    const signature=crypto.createHmac('sha256',principal==='payment'?c.paymentKey:c.key).update(['crp-mail-v1',principal,timestamp,nonce,method,path,sha(raw)].join('\n')).digest('hex');
    try{
      const printPreview=method==='GET'&&/^\/api\/v1\/orders\/[a-f0-9-]{36}\/print-preview\?ownerRef=crp%3A[a-f0-9]{64}$/.test(path);
      const response=await fetch(c.origin+path,{method,redirect:'error',signal:AbortSignal.timeout(printPreview?60000:5000),headers:{'content-type':'application/json','x-mail-principal':principal,'x-mail-timestamp':timestamp,'x-mail-nonce':nonce,'x-mail-signature':signature},...(raw?{body:raw}:{})});
      let size=0;const chunks=[];for await(const part of response.body){size+=part.length;if(size>(printPreview?90*1024*1024:65536))throw Error('BOUND');chunks.push(part);}
      const result=JSON.parse(Buffer.concat(chunks).toString());
      if(!response.ok){
        if(result.error==='MAILING_ROUTE_UNAVAILABLE')throw new ServiceError('MAILING_ROUTE_UNAVAILABLE');
        if(['QUOTE_EXPIRED','AUTHORIZATION_EXPIRED','APPROVAL_INVALID'].includes(result.error))throw new ServiceError('MAILING_QUOTE_STALE');
        if(['SUBMISSION_MAY_HAVE_OCCURRED','ORDER_NOT_PAYABLE','PAYMENT_ALREADY_REFUNDED'].includes(result.error))throw new ServiceError('MAILING_ORDER_CHANGED');
        fail();
      }
      return result;
    }catch(error){if(error instanceof ServiceError)throw error;fail();}
  }
  async function provider(method,path,params,idempotencyKey){
    let response;try{response=await stripe.request({method,path,params,idempotencyKey,secretKey:env.STRIPE_SECRET_KEY,timeoutMs:20000});}catch{fail();}
    if(response.status<200||response.status>=300)fail();return response.json;
  }
  function current(actor,caseId,version,c){
    const owned=cases.requireOwnedCase(store,actor,caseId),view=packets.packetView(store,actor,caseId);
    require('./packet-support.cjs').requirePostalPacket(view);
    if(!view.packet.signature?.current)throw new ServiceError('PACKET_APPROVAL_STALE');
    const file=packets.packetDownload(store,actor,caseId),destination=view.support.requirements;
    if(file.approved_version!==version||!destination?.postal||file.sections.some(section=>section.kind==='instructions'))throw new ServiceError('PACKET_APPROVAL_STALE');
    const ownerRef='crp:'+crypto.createHmac('sha256',c.key).update('owner:'+actor.account_id).digest('hex'),packetHash=sha(file.body);
    return {file,packetHash,label:destination.label,address:destination.postal,payload:{source:c.source,ownerRef,
      packet:{version,sha256:packetHash,pages:file.page_count,signed:true},recipient:{bureau:destination.bureau,country:owned.country,addressRef:'crp:'+sha(destination.postal)},service:'INTERNAL_POSTAL'}};
  }
  function quoteView(record){const q=record.quote,mailer=q.snapshot.fulfillment?.mailer||'MANUAL';return {simulation:false,mail_ready:true,quote_id:q.id,amount_minor:q.amountMinor,currency:q.currency,expires_at:q.expiresAt,packet_hash:record.packet_hash,packet_version:record.packet_version,page_count:q.snapshot.packet.pages,recipient_label:record.label,recipient_address:record.address,
    mailer,emergency_manual:q.snapshot.emergencyManual===true,return_address:q.snapshot.returnAddress||null,print_review_required:mailer==='POSTGRID',service:mailer==='POSTGRID'?'PostGrid printing and postal mailing':q.snapshot.emergencyManual===true?'Emergency manual printing and postal mailing':'Packet printing and postal mailing'};}
  function orderView(order,record){
    if(!order||order.simulated!==false||!/^[a-f0-9-]{36}$/.test(order.id)||order.ownerRef!==record.quote.snapshot.ownerRef||order.quoteId!==record.quote.id||order.packetHash!==record.packet_hash||order.snapshotHash!==record.quote.snapshotHash||order.amountMinor!==record.quote.amountMinor||order.currency!==record.quote.currency||(record.order_id&&record.order_id!==order.id))fail();
    return {id:order.id,state:order.state,payment_state:order.paymentState,payment_hold:order.paymentHold,refund_status:order.refundStatus,amount_minor:order.amountMinor,currency:order.currency,packet_hash:order.packetHash,simulation:false,
      mailer:order.mailer||record.quote.snapshot.fulfillment?.mailer||'MANUAL',print_review:order.printReview||null};
  }
  function metadata(record){return {crp_service:'internal-mailing-v1',mail_order_id:record.order_id,mail_owner_ref:record.quote.snapshot.ownerRef,mail_attempt_id:record.id,packet_hash:record.packet_hash,quote_hash:record.quote.snapshotHash};}
  async function custody(c,record,phase,sessionId){return remote(c,'integration','POST',`/api/v1/orders/${record.order_id}/checkout`,{ownerRef:record.quote.snapshot.ownerRef,approvalRef:'crp:'+record.id,snapshotHash:record.quote.snapshotHash,phase,...(sessionId?{sessionId}:{})});}
  async function refundStatus(c,record,refund){
    if(refund.payment_intent!==record.payment_ref||refund.amount!==record.quote.amountMinor||refund.currency!==record.quote.currency.toLowerCase()||!/^re_[A-Za-z0-9]+$/.test(refund.id||'')||!['pending','requires_action','succeeded','failed','canceled'].includes(refund.status))fail();
    await remote(c,'payment','POST','/api/v1/payments',{eventId:'refund-state:'+refund.id+':'+refund.status,orderId:record.order_id,paymentRef:record.payment_ref,amountMinor:record.quote.amountMinor,currency:record.quote.currency,type:'STRIPE_REFUND_STATUS',livemode:c.livemode,refundRef:refund.id,refundStatus:refund.status});
  }
  async function checkFunding(record,c){
    if(!record.payment_ref)fail();
    const payment=await provider('GET','/v1/payment_intents/'+record.payment_ref);
    if(payment.id!==record.payment_ref||payment.status!=='succeeded'||payment.livemode!==c.livemode||payment.amount_received!==record.quote.amountMinor||payment.currency!==record.quote.currency.toLowerCase()||Object.entries(metadata(record)).some(([k,v])=>payment.metadata?.[k]!==v)||!/^ch_[A-Za-z0-9]+$/.test(payment.latest_charge||''))fail();
    const charge=await provider('GET','/v1/charges/'+payment.latest_charge);
    if(charge.payment_intent!==record.payment_ref||charge.livemode!==c.livemode||charge.amount!==record.quote.amountMinor||charge.currency!==record.quote.currency.toLowerCase()||charge.paid!==true)fail();
    if(charge.amount_refunded>0||charge.disputed===true||charge.refunded===true){
      const type=charge.amount_refunded===record.quote.amountMinor?'STRIPE_REFUNDED':'STRIPE_HOLD';
      const order=orderView(await remote(c,'payment','POST','/api/v1/payments',{eventId:type.toLowerCase()+':'+charge.id,orderId:record.order_id,paymentRef:record.payment_ref,amountMinor:record.quote.amountMinor,currency:record.quote.currency,type,livemode:c.livemode}),record);
      update({account_id:record.account_id},record.case_id,record.id,{order,...(type==='STRIPE_REFUNDED'?{refund_status:'succeeded'}:{})});
      return false;
    }
    return true;
  }
  async function syncRefund(actor,caseId,record,c){
    if(!record.refund_id)return;
    const refund=await provider('GET','/v1/refunds/'+record.refund_id);
    if(refund.id!==record.refund_id||refund.payment_intent!==record.payment_ref||refund.amount!==record.quote.amountMinor||refund.currency!==record.quote.currency.toLowerCase())fail();
    await refundStatus(c,record,refund);
    update(actor,caseId,record.id,{refund_status:refund.status});
    if(refund.status==='succeeded'){
      const order=orderView(await remote(c,'payment','POST','/api/v1/payments',{eventId:'refund:'+refund.id,orderId:record.order_id,paymentRef:record.payment_ref,amountMinor:record.quote.amountMinor,currency:record.quote.currency,type:'STRIPE_REFUNDED',livemode:c.livemode}),record);
      update(actor,caseId,record.id,{order});
    }
  }
  async function reconcile(actor,caseId,record,c){
    if(!record.checkout_session)return;
    const session=await provider('GET','/v1/checkout/sessions/'+encodeURIComponent(record.checkout_session));
    const expected=metadata(record);
    if(session.id!==record.checkout_session||session.mode!=='payment'||session.livemode!==c.livemode||session.amount_total!==record.quote.amountMinor||session.currency!==record.quote.currency.toLowerCase()||Object.entries(expected).some(([k,v])=>session.metadata?.[k]!==v))fail();
    if(session.payment_status==='paid'){
      if(!/^pi_[A-Za-z0-9]+$/.test(session.payment_intent||''))fail();
      const payment=await provider('GET','/v1/payment_intents/'+session.payment_intent);
      if(payment.id!==session.payment_intent||payment.status!=='succeeded'||payment.livemode!==c.livemode||payment.amount_received!==record.quote.amountMinor||payment.currency!==record.quote.currency.toLowerCase()||Object.entries(expected).some(([k,v])=>payment.metadata?.[k]!==v))fail();
      const order=orderView(await remote(c,'payment','POST','/api/v1/payments',{eventId:'paid:'+session.id,orderId:record.order_id,paymentRef:payment.id,amountMinor:record.quote.amountMinor,currency:record.quote.currency,type:'STRIPE_PAID',livemode:c.livemode}),record);
      update(actor,caseId,record.id,{order,payment_ref:payment.id});
      record.order=order;record.payment_ref=payment.id;
    }
  }
  async function stopRecord(actor,caseId,record,c){
    const order=await remote(c,'integration','GET',`/api/v1/orders/${record.order_id}?ownerRef=${encodeURIComponent(record.quote.snapshot.ownerRef)}`);orderView(order,record);
    const sessionId=record.checkout_session||order.checkoutSession;
    if(sessionId){
      record.checkout_session=sessionId;
      const session=await provider('GET','/v1/checkout/sessions/'+sessionId);
      if(session.id!==sessionId||session.livemode!==c.livemode||Object.entries(metadata(record)).some(([key,value])=>session.metadata?.[key]!==value))fail();
      if(session.status==='open')await provider('POST','/v1/checkout/sessions/'+sessionId+'/expire');
      else if(session.payment_status==='paid'&&order.paymentState==='UNPAID')await reconcile(actor,caseId,record,c);
    }
    const withdrawn=orderView(await remote(c,'integration','POST',`/api/v1/orders/${record.order_id}/withdraw`,{ownerRef:record.quote.snapshot.ownerRef}),record);
    update(actor,caseId,record.id,{order:withdrawn});return withdrawn;
  }
  async function withDeletion(actor,caseId,remove){
    const c=config();
    if(caseId)cases.requireOwnedCase(store,actor,caseId);
    const affected=(store.state().packets||[]).filter(packet=>packet.account_id===actor.account_id&&(!caseId||packet.case_id===caseId));
    const keys=[...new Set([...affected.map(packet=>actor.account_id+':'+packet.case_id),...(caseId?[actor.account_id+':'+caseId]:[])])];
    if(deletingAccounts.has(actor.account_id)||keys.some(key=>busy.has(key)||deletingCases.has(key)))throw new ServiceError('MAILING_ORDER_CHANGED');
    if(!caseId)deletingAccounts.add(actor.account_id);for(const key of keys){busy.add(key);deletingCases.add(key);}
    try{
      for(const packet of affected)for(const record of packet.mailing_internal||[])if(record.order_id)await stopRecord(actor,packet.case_id,structuredClone(record),c);
      return await remove();
    }finally{if(!caseId)deletingAccounts.delete(actor.account_id);for(const key of keys){busy.delete(key);deletingCases.delete(key);}}
  }
  async function status(actor,caseId){
    const c=authorize(actor,caseId),record=records(actor,caseId).at(-1);
    const methods=await availableMethods(actor,caseId,c),available=methods.length>0;
    const profile=require('./account-profile.cjs').getProfile?require('./account-profile.cjs').getProfile(store,actor):store.state().accounts.find(a=>a.account_id===actor.account_id)?.profile||{};
    const country=({Canada:'CA','United States':'US','United Kingdom':'GB',Australia:'AU'})[profile.country]||(['CA','US','GB','AU'].includes(profile.country)?profile.country:'');
    const return_address_suggestion={firstName:profile.full_name||[profile.given_name,profile.family_name].filter(Boolean).join(' '),lastName:'',addressLine1:profile.address_line1||'',addressLine2:profile.address_line2||'',city:profile.city||'',provinceOrState:profile.region||'',postalOrZip:profile.postal_code||'',countryCode:country};
    if(!record)return {simulation:false,available,mailers:methods.map(r=>({mailer:r.mailer||'MANUAL',emergency:r.emergency===true})),default_mailer:'POSTGRID',return_address_suggestion,quote:null,order:null};
    const packet=packets.packetView(store,actor,caseId).packet;
    const changed=packet.approved_version!==record.packet_version||!packet.approved||!packet.signature?.current;
    if(record.order_id){
      if(changed)await stopRecord(actor,caseId,record,c);
      if(record.order?.payment_state==='UNPAID'&&record.checkout_session)await reconcile(actor,caseId,record,c);
      if(record.payment_ref && record.order?.payment_state==='VERIFIED')await checkFunding({...record,account_id:actor.account_id,case_id:caseId},c);
      if(record.refund_id)await syncRefund(actor,caseId,record,c);
      const order=orderView(await remote(c,'integration','GET',`/api/v1/orders/${record.order_id}?ownerRef=${encodeURIComponent(record.quote.snapshot.ownerRef)}`),record);update(actor,caseId,record.id,{order});
    }
    const latest=records(actor,caseId).at(-1);
    return {simulation:false,available,mailers:methods.map(r=>({mailer:r.mailer||'MANUAL',emergency:r.emergency===true})),default_mailer:'POSTGRID',return_address_suggestion,quote:quoteView(latest),order:latest.order||null,packet_changed:packet.approved_version!==latest.packet_version||!packet.approved,checkout_url:available?latest.checkout_url||null:null,refund_status:latest.refund_status||null};
  }
  async function availability(actor,caseId,c){
    return (await availableMethods(actor,caseId,c)).length>0;
  }
  async function availableMethods(actor,caseId,c){
    const owned=cases.requireOwnedCase(store,actor,caseId),view=packets.packetView(store,actor,caseId),destination=view.support?.requirements;
    if(!destination?.postal||!destination?.bureau)return [];
    try{
      const result=await remote(c,'integration','GET','/api/v1/availability');
      return Array.isArray(result.routes)?result.routes.filter(route=>route.country===owned.country&&route.bureau===destination.bureau&&route.addressRef==='crp:'+sha(destination.postal)&&Number.isInteger(route.maxPages)&&route.maxPages>0):[];
    }catch{return [];}
  }
  async function quote(actor,caseId,body){
    const c=authorize(actor,caseId),legacy=Object.keys(body||{}).sort().join(',')==='reviewed_version';
    exact(body,legacy?['reviewed_version']:['reviewed_version','mailer','return_address']);
    return locked(actor,caseId,async()=>{
      const methods=await availableMethods(actor,caseId,c);
      const mailer=legacy&&!c.livemode&&methods.some(r=>(r.mailer||'MANUAL')==='MANUAL'&&!r.emergency)?'MANUAL':body.mailer||'POSTGRID';
      if(!methods.some(r=>(r.mailer||'MANUAL')===mailer))throw new ServiceError('MAILING_ROUTE_UNAVAILABLE');
      const prepared=current(actor,caseId,body.reviewed_version,c),history=records(actor,caseId);
      if(!legacy){
        if(!['POSTGRID','MANUAL'].includes(mailer))throw new ServiceError('INVALID_REQUEST');
        Object.assign(prepared.payload,{mailer,...(mailer==='MANUAL'?{emergencyManual:true}:{returnAddress:body.return_address,recipientAddress:{companyName:prepared.label,addressLine1:prepared.address,countryCode:prepared.payload.recipient.country}})});
      }
      if(history.some(r=>r.confirmed_at&&!['CANCELLED','FAILED'].includes(r.order?.state)))throw new ServiceError('MAILING_ORDER_CHANGED');
      const last=history.at(-1);if(last&&!last.confirmed_at&&last.packet_hash===prepared.packetHash&&last.quote.expiresAt>Date.now()
        && (last.quote.snapshot.mailer||'MANUAL')===mailer && JSON.stringify(last.quote.snapshot.returnAddress)===JSON.stringify(prepared.payload.returnAddress))return {simulation:false,quote:quoteView(last)};
      if(history.length>=20)throw new ServiceError('MAILING_ORDER_CHANGED');
      const q=await remote(c,'integration','POST','/api/v1/quotes',prepared.payload);
      if(!q||q.simulated!==false||q.snapshotHash!==sha(JSON.stringify(q.snapshot))||!Number.isSafeInteger(q.amountMinor)||q.amountMinor<1||q.currency!==({CA:'CAD',US:'USD',GB:'GBP',AU:'AUD'})[prepared.payload.recipient.country]||q.expiresAt<=Date.now()||q.expiresAt>Date.now()+1800000||q.snapshot.pricing.amountMinor!==q.amountMinor||q.snapshot.pricing.currency!==q.currency||q.snapshot.quoteId!==q.id||q.snapshot.expiresAt!==q.expiresAt)fail();
      for(const key of Object.keys(prepared.payload))if(JSON.stringify(q.snapshot[key])!==JSON.stringify(prepared.payload[key]))fail();
      if(!q.snapshot.fulfillment||!['CA','US','GB','AU'].includes(q.snapshot.fulfillment.originCountry)||typeof q.snapshot.fulfillment.postalService!=='string'||!q.snapshot.fulfillment.postalService.trim())fail();
      if(current(actor,caseId,body.reviewed_version,c).packetHash!==prepared.packetHash)throw new ServiceError('PACKET_APPROVAL_STALE');
      const record={id:crypto.randomUUID(),quote:q,packet_hash:prepared.packetHash,packet_version:body.reviewed_version,label:prepared.label,address:prepared.address};
      store.update(state=>{(row(actor,caseId,state).mailing_internal||=[]).push(record);});return {simulation:false,quote:quoteView(record)};
    });
  }
  async function printpreview(actor,caseId,body){
    const c=authorize(actor,caseId),record=records(actor,caseId).at(-1);exact(body,[]);
    if(!record?.order_id||record.quote.snapshot.fulfillment?.mailer!=='POSTGRID')throw new ServiceError('NOT_AUTHORIZED');
    const prepared=current(actor,caseId,record.packet_version,c);if(prepared.packetHash!==record.packet_hash)throw new ServiceError('PACKET_APPROVAL_STALE');
    const result=await remote(c,'integration','GET',`/api/v1/orders/${record.order_id}/print-preview?ownerRef=${encodeURIComponent(record.quote.snapshot.ownerRef)}`);
    const bytes=Buffer.from(result.pdfBase64||'','base64');
    if(result.orderId!==record.order_id||result.packetHash!==record.packet_hash||sha(bytes)!==result.previewHash||bytes.subarray(0,5).toString()!=='%PDF-')fail();
    return {order_id:record.order_id,packet_hash:record.packet_hash,preview_hash:result.previewHash,pdf_base64:result.pdfBase64};
  }
  async function approveprint(actor,caseId,body){
    const c=authorize(actor,caseId);exact(body,['order_id','reviewed_version','preview_hash','approve_print','approve_signature']);
    if(body.approve_print!==true||body.approve_signature!==true||!/^[a-f0-9]{64}$/.test(body.preview_hash||''))throw new ServiceError('INVALID_REQUEST');
    return locked(actor,caseId,async()=>{
      const record=records(actor,caseId).find(r=>r.order_id===body.order_id);if(!record||record.packet_version!==body.reviewed_version)throw new ServiceError('MAILING_ORDER_CHANGED');
      const prepared=current(actor,caseId,body.reviewed_version,c);if(prepared.packetHash!==record.packet_hash)throw new ServiceError('PACKET_APPROVAL_STALE');
      await remote(c,'integration','POST',`/api/v1/orders/${record.order_id}/approve-print`,{ownerRef:record.quote.snapshot.ownerRef,previewHash:body.preview_hash,snapshotHash:record.quote.snapshotHash,approvalRef:'crp:'+record.id,signatureConsent:true});
      update(actor,caseId,record.id,{print_preview_approved_hash:body.preview_hash,print_preview_approved_at:Date.now()});
      return status(actor,caseId);
    });
  }
  async function confirm(actor,caseId,body){
    const c=authorize(actor,caseId);exact(body,['quote_id','reviewed_version','authorize_mailing','accept_price']);
    if(body.authorize_mailing!==true||body.accept_price!==true)throw new ServiceError('MAILING_CONFIRMATION_REQUIRED');
    return locked(actor,caseId,async()=>{
      if(!await availability(actor,caseId,c))throw new ServiceError('MAILING_ROUTE_UNAVAILABLE');
      let record=records(actor,caseId).find(r=>r.quote.id===body.quote_id);
      if(!record||record.packet_version!==body.reviewed_version)throw new ServiceError('MAILING_QUOTE_STALE');
      const methods=await availableMethods(actor,caseId,c),mailer=record.quote.snapshot.fulfillment?.mailer||'MANUAL';
      if(!methods.some(r=>(r.mailer||'MANUAL')===mailer))throw new ServiceError('MAILING_ROUTE_UNAVAILABLE');
      const packet=current(actor,caseId,body.reviewed_version,c);
      if(packet.packetHash!==record.packet_hash||packet.address!==record.address)throw new ServiceError('MAILING_QUOTE_STALE');
      if(!record.confirmed_at){if(record.quote.expiresAt<=Date.now())throw new ServiceError('MAILING_QUOTE_STALE');update(actor,caseId,record.id,{confirmed_at:Date.now(),approval_expires_at:Date.now()+7*86400000});record=records(actor,caseId).find(r=>r.id===record.id);}
      const order=orderView(await remote(c,'integration','POST','/api/v1/orders',{ownerRef:record.quote.snapshot.ownerRef,quoteId:record.quote.id,idempotencyKey:'crp:'+record.id,approval:{ref:'crp:'+record.id,snapshotHash:record.quote.snapshotHash,approvedAt:record.confirmed_at,expiresAt:record.approval_expires_at}}),record);
      update(actor,caseId,record.id,{order_id:order.id,order});record=records(actor,caseId).find(r=>r.id===record.id);
      if(order.payment_state!=='UNPAID')return {simulation:false,quote:quoteView(record),order};
      if(order.state!=='AWAITING_PAYMENT')throw new ServiceError('MAILING_ORDER_CHANGED');
      const durable=await custody(c,record,'INTENT');
      update(actor,caseId,record.id,{checkout_started_at:durable.checkoutStartedAt,...(durable.checkoutSession?{checkout_session:durable.checkoutSession}:{})});record=records(actor,caseId).find(r=>r.id===record.id);
      if(!record.checkout_session){
        // Persist intent before the provider call. Reuse this exact idempotency key after uncertain outcomes.
        if(Date.now()-record.checkout_started_at>23*3600000)throw new ServiceError('MAILING_ORDER_CHANGED');
        const meta=metadata(record),session=await provider('POST','/v1/checkout/sessions',{mode:'payment',client_reference_id:record.id,success_url:c.consumerOrigin+'/index.html?mailing=complete',cancel_url:c.consumerOrigin+'/index.html?mailing=cancelled',
          metadata:meta,payment_intent_data:{metadata:meta},line_items:[{quantity:1,price_data:{currency:record.quote.currency.toLowerCase(),unit_amount:record.quote.amountMinor,product_data:{name:'CRP packet printing and postal mailing'}}}]},'crp-mail-checkout:'+record.id);
        if(!/^cs_(test_|live_)?[A-Za-z0-9]+$/.test(session.id||'')||session.livemode!==c.livemode||session.mode!=='payment'||session.amount_total!==record.quote.amountMinor||session.currency!==record.quote.currency.toLowerCase()||Object.entries(meta).some(([key,value])=>session.metadata?.[key]!==value)||!/^https:\/\/checkout\.stripe\.com\//.test(session.url||''))fail();
        await custody(c,record,'SESSION',session.id);
        update(actor,caseId,record.id,{checkout_session:session.id,checkout_url:session.url});
      }
      if(record.checkout_session&&!record.checkout_url){
        const session=await provider('GET','/v1/checkout/sessions/'+record.checkout_session);
        if(session.id!==record.checkout_session||session.livemode!==c.livemode||session.mode!=='payment'||session.amount_total!==record.quote.amountMinor||session.currency!==record.quote.currency.toLowerCase()||Object.entries(metadata(record)).some(([key,value])=>session.metadata?.[key]!==value))fail();
        if(session.payment_status==='paid')await reconcile(actor,caseId,record,c);
        else if(session.status==='open'&&/^https:\/\/checkout\.stripe\.com\//.test(session.url||''))update(actor,caseId,record.id,{checkout_url:session.url});
        else throw new ServiceError('MAILING_ORDER_CHANGED');
      }
      const latest=records(actor,caseId).find(r=>r.id===record.id);return {simulation:false,quote:quoteView(latest),order:latest.order,checkout_url:latest.checkout_url};
    });
  }
  async function cancel(actor,caseId,body){const c=authorize(actor,caseId);exact(body,['order_id']);return locked(actor,caseId,async()=>{
    const record=records(actor,caseId).find(r=>r.order_id===body.order_id);if(!record)throw new ServiceError('NOT_FOUND');
    // Close any open Checkout first, so a canceled unpaid order cannot subsequently be charged.
    if(record.checkout_session){const session=await provider('GET','/v1/checkout/sessions/'+record.checkout_session);if(session.status==='open')await provider('POST','/v1/checkout/sessions/'+record.checkout_session+'/expire');else if(session.payment_status==='paid'&&record.order?.payment_state==='UNPAID')await reconcile(actor,caseId,record,c);}
    const order=orderView(await remote(c,'integration','POST',`/api/v1/orders/${record.order_id}/cancel`,{ownerRef:record.quote.snapshot.ownerRef}),record);update(actor,caseId,record.id,{order});return {simulation:false,quote:quoteView(record),order};
  });}
  function authenticateInternal(rawBody,headers,path){
    const c=config(),timestamp=headers['x-mail-timestamp'],nonce=headers['x-mail-nonce'],signature=headers['x-mail-signature'];
    if(!/^\d{13}$/.test(timestamp||'')||Math.abs(Date.now()-Number(timestamp))>60000||!/^[-a-f0-9]{36}$/.test(nonce||'')||!/^[a-f0-9]{64}$/.test(signature||''))throw new ServiceError('NOT_AUTHORIZED');
    const expected=crypto.createHmac('sha256',c.key).update(['crp-mail-fulfillment-v1',timestamp,nonce,'POST',path,sha(rawBody)].join('\n')).digest('hex');
    if(!crypto.timingSafeEqual(Buffer.from(expected,'hex'),Buffer.from(signature,'hex')))throw new ServiceError('NOT_AUTHORIZED');
    for(const [key,expires]of readNonces)if(expires<=Date.now())readNonces.delete(key);
    if(readNonces.has(nonce)||readNonces.size>=10000)throw new ServiceError('NOT_AUTHORIZED');readNonces.set(nonce,Date.now()+120000);return c;
  }
  async function findRecord(body,c){
    for(const packet of store.state().packets||[]){const record=packet.mailing_internal?.find(r=>r.order_id===body.orderId&&r.packet_hash===body.packetHash&&r.quote.snapshot.ownerRef===body.ownerRef);if(record)return {record:structuredClone(record),actor:{account_id:packet.account_id},caseId:packet.case_id};}
    const order=await remote(c,'integration','GET',`/api/v1/orders/${encodeURIComponent(body.orderId)}?ownerRef=${encodeURIComponent(body.ownerRef)}`);
    if(order.simulated!==false||order.ownerRef!==body.ownerRef||order.packetHash!==body.packetHash||!/^crp:[a-f0-9-]{36}$/.test(order.approvalRef||''))throw new ServiceError('NOT_FOUND');
    const record={id:order.approvalRef.slice(4),order_id:order.id,packet_hash:order.packetHash,packet_version:order.packetVersion,approval_expires_at:order.approvalExpiresAt,
      checkout_session:order.checkoutSession,checkout_started_at:order.checkoutStartedAt,payment_ref:order.paymentRef,refund_id:order.refundRef,refund_status:order.refundStatus,
      quote:{id:order.quoteId,snapshotHash:order.snapshotHash,amountMinor:order.amountMinor,currency:order.currency,snapshot:{ownerRef:order.ownerRef}}};
    orderView(order,record);return {record,actor:{account_id:null},caseId:null};
  }
  async function fulfillment({rawBody,headers,body,operation}){
    const c=authenticateInternal(rawBody,headers,'/api/mail-ops/internal/'+operation);
    if(operation==='catalog'){
      exact(body,[]);const rules=require('./bureau-dispute-requirements.cjs');
      return {items:['CA','US','GB','AU'].flatMap(country=>rules.catalog(country).map(item=>({country,bureau:item.id,label:item.label,address:item.postal,sources:item.sources})))};
    }
    exact(body,['refund','cancel'].includes(operation)?['orderId','ownerRef','packetHash','requestId','reason']:['orderId','ownerRef','packetHash']);
    const {record,actor,caseId}=await findRecord(body,c);
    const order=await remote(c,'integration','GET',`/api/v1/orders/${record.order_id}?ownerRef=${encodeURIComponent(body.ownerRef)}`);orderView(order,record);
    if(operation==='cancel'){
      if(!/^[a-f0-9-]{36}$/.test(body.requestId)||typeof body.reason!=='string'||body.reason.trim().length<3||body.reason.length>500)throw new ServiceError('INVALID_REQUEST');
      if(!['AWAITING_PAYMENT','QUEUED','ACCEPTED','FAILED','CANCELLED'].includes(order.state))throw new ServiceError('MAILING_ORDER_CHANGED');
      if(record.checkout_session){const session=await provider('GET','/v1/checkout/sessions/'+record.checkout_session);if(session.status==='open')await provider('POST','/v1/checkout/sessions/'+record.checkout_session+'/expire');else if(session.payment_status==='paid'&&order.paymentState==='UNPAID')await reconcile(actor,caseId,record,c);}
      const cancelled=orderView(await remote(c,'integration','POST',`/api/v1/orders/${record.order_id}/cancel`,{ownerRef:record.quote.snapshot.ownerRef}),record);
      update(actor,caseId,record.id,{order:cancelled,staff_cancellation_reason:body.reason});return {ok:true,order:cancelled};
    }
    if(operation==='refund'){
      if(!/^[a-f0-9-]{36}$/.test(body.requestId)||typeof body.reason!=='string'||body.reason.trim().length<3||body.reason.length>500||!['CANCELLED','FAILED','RETURNED'].includes(order.state)||order.paymentState!=='VERIFIED'||!record.payment_ref)throw new ServiceError('NOT_AUTHORIZED');
      if(!await checkFunding({...record,account_id:actor.account_id,case_id:caseId},c)){
        const latest=await remote(c,'integration','GET',`/api/v1/orders/${record.order_id}?ownerRef=${encodeURIComponent(record.quote.snapshot.ownerRef)}`);
        return {ok:true,status:latest.paymentState==='REFUNDED'?'succeeded':'requires_review'};
      }
      const payment=await provider('GET','/v1/payment_intents/'+record.payment_ref);
      const previous=await provider('GET','/v1/refunds?charge='+encodeURIComponent(payment.latest_charge)+'&limit=100');
      if(!Array.isArray(previous.data)||previous.has_more!==false)fail();
      const matched=previous.data.filter(item=>item.payment_intent===record.payment_ref && item.amount===record.quote.amountMinor && item.currency===record.quote.currency.toLowerCase() && ['pending','requires_action','succeeded'].includes(item.status));
      if(matched.length>1)throw new ServiceError('MAILING_ORDER_CHANGED');
      if(!matched.length && previous.data.some(item=>!['failed','canceled'].includes(item.status)))throw new ServiceError('MAILING_ORDER_CHANGED');
      // Reconcile provider records before retrying any uncertain refund, including after key retention expires.
      update(actor,caseId,record.id,{refund_started_at:record.refund_started_at||Date.now(),refund_reason:body.reason});
      const created=matched[0]||await provider('POST','/v1/refunds',{payment_intent:record.payment_ref,amount:record.quote.amountMinor,metadata:metadata(record)},'crp-mail-refund:'+record.order_id);
      if(!/^re_[A-Za-z0-9]+$/.test(created.id||''))fail();
      const refund=await provider('GET','/v1/refunds/'+created.id);
      await refundStatus(c,record,refund);
      update(actor,caseId,record.id,{refund_id:refund.id,refund_reason:body.reason,refund_status:refund.status});
      if(refund.status==='succeeded'&&refund.payment_intent===record.payment_ref&&refund.amount===record.quote.amountMinor&&refund.currency===record.quote.currency.toLowerCase()){
        const updated=orderView(await remote(c,'payment','POST','/api/v1/payments',{eventId:'refund:'+refund.id,orderId:record.order_id,paymentRef:record.payment_ref,amountMinor:record.quote.amountMinor,currency:record.quote.currency,type:'STRIPE_REFUNDED',livemode:c.livemode}),record);update(actor,caseId,record.id,{order:updated});
      }
      return {ok:true,status:refund.status};
    }
    if(!actor.account_id||order.paymentState!=='VERIFIED'||order.authorizationWithdrawn||order.paymentHold||['CANCELLED','FAILED','UNKNOWN'].includes(order.state)||record.approval_expires_at<=Date.now())throw new ServiceError('NOT_AUTHORIZED');
    if(!await checkFunding({...record,account_id:actor.account_id,case_id:caseId},c))throw new ServiceError('MAILING_ORDER_CHANGED');
    const prepared=current(actor,caseId,record.packet_version,c);
    if(prepared.packetHash!==record.packet_hash||prepared.address!==record.address)throw new ServiceError('PACKET_APPROVAL_STALE');
    return {authorized:true,pdfBase64:prepared.file.body.toString('base64'),packetHash:record.packet_hash,packetVersion:record.packet_version,recipient:{...record.quote.snapshot.recipient,address:record.address}};
  }
  async function webhook(rawBody,headers){
    const c=config(),verified=stripe.verifyWebhookSignature({rawBody,headers,secret:env.STRIPE_WEBHOOK_SECRET});
    if(!verified.verified)throw new ServiceError('NOT_AUTHORIZED');
    const event=verified.event,object=event?.data?.object;
    const chargeEvent=['charge.refunded','charge.dispute.created'].includes(event?.type);
    const knownPayment=chargeEvent && (store.state().packets||[]).some(packet=>packet.mailing_internal?.some(record=>record.payment_ref && record.payment_ref===object?.payment_intent));
    if(object?.metadata?.crp_service!=='internal-mailing-v1' && !knownPayment)return null;
    if(event.livemode!==c.livemode)throw new ServiceError('NOT_AUTHORIZED');
    if(['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type)){
      const found=await findRecord({orderId:object.metadata.mail_order_id,ownerRef:object.metadata.mail_owner_ref,packetHash:object.metadata.packet_hash},c);
      if(found.record.checkout_session && found.record.checkout_session!==object.id)fail();
      found.record.checkout_session=object.id;
      await custody(c,found.record,'SESSION',object.id);
      update(found.actor,found.caseId,found.record.id,{checkout_session:object.id});
      await reconcile(found.actor,found.caseId,found.record,c);
      if(found.record.payment_ref)await checkFunding({...found.record,account_id:found.actor.account_id,case_id:found.caseId},c);
      if(!found.actor.account_id)await remote(c,'integration','POST',`/api/v1/orders/${found.record.order_id}/withdraw`,{ownerRef:found.record.quote.snapshot.ownerRef});
    }
    if(['refund.created','refund.updated','refund.failed'].includes(event.type)){
      const found=await findRecord({orderId:object.metadata.mail_order_id,ownerRef:object.metadata.mail_owner_ref,packetHash:object.metadata.packet_hash},c);
      if(found.record.refund_id&&found.record.refund_id!==object.id)fail();found.record.refund_id=object.id;
      await syncRefund(found.actor,found.caseId,found.record,c);
    }
    if(['charge.refunded','charge.dispute.created'].includes(event.type)){
      const paymentRef=object.payment_intent;
      for(const packet of store.state().packets||[]){const record=packet.mailing_internal?.find(r=>r.payment_ref===paymentRef);if(record)await checkFunding({...record,account_id:packet.account_id,case_id:packet.case_id},c);}
    }
    return {accepted:true,service:'internal-mailing-v1'};
  }
  return {status,quote,confirm,cancel,printpreview,approveprint,fulfillment,webhook,withDeletion};
}
module.exports={configuration,create};
