'use strict';
(() => {
  const node = (tag, text) => { const value = document.createElement(tag); if (text !== undefined) value.textContent = text; return value; };
  const states = { AWAITING_PAYMENT:'Waiting for simulated payment', QUEUED:'Queued for simulated mailing', SUBMITTING:'Simulating submission', ACCEPTED:'Simulated provider acceptance', DISPATCHED:'Simulated dispatch', DELIVERED:'Simulated delivery', RETURNED:'Simulated return', UNKNOWN:'Uncertain result — held for review', FAILED:'Simulated submission failed', CANCELLED:'Cancelled' };
  function mount({ root, caseId, version, request, ensure, canRequest, live=false, testMode=false }) {
    const labels=live?{AWAITING_PAYMENT:'Waiting for payment',QUEUED:'Waiting for staff preparation',ACCEPTED:'Prepared by staff',SUBMITTING:'Postal handoff in progress',DISPATCHED:'Posted - recorded by staff',DELIVERED:'Delivery recorded by staff',RETURNED:'Return recorded by staff',UNKNOWN:'Held for staff review',FAILED:'Unable to proceed',CANCELLED:'Cancelled'}:states;
    let latest = null, busy = false, available = !live, chosenMailer='POSTGRID',returnDraft=null,previewCache=null,reviewedPrintHash=null;
    root.hidden = true;
    const path = `/api/cases/${caseId}/mailing`;
    const message = node('p'); message.setAttribute('role','status');
    const content = node('div');
    const heading=node('h3','Would you like us to mail your packet?');
    const introduction=node('p','You can still download your PDF and mail it yourself. Or try the optional mailing service below.');
    root.replaceChildren(heading,introduction,
      node('p',live?'PostGrid is our usual printing and mailing service. CRP staff manage the bureau mailing address. You approve your own return address and packet. After payment, check and approve the final printing copy before staff submit it. Manual mailing is an emergency option only when offered. Posting and delivery records do not prove a bureau investigated or corrected your report.':'SIMULATION ONLY: no charge and nothing is printed or mailed. Prices are invented examples. Unsigned packets include an instruction sheet. Add your signature, then review and approve the signed PDF before any real mailing.'), content, message);
    if(testMode)root.prepend(node('p','STAGING TEST ONLY: use fictional packets and Stripe test payments. No real charge or postal handoff is authorized here.'));
    function checkout(url){if(typeof url!=='string'||!/^https:\/\/checkout\.stripe\.com\//.test(url))throw Error('Secure checkout is unavailable. Refresh the order.');window.location.assign(url);}
    function checkCurrent() { ensure(); if (!canRequest()) throw Error('Save your changes, check every page and approve this packet before choosing mailing.'); }
    async function action(fn) {
      if (busy) return; busy = true; message.textContent = '';
      for (const button of content.querySelectorAll('button')) button.disabled = true;
      try {
        await fn(); ensure();
        // Mutation responses need not contain route availability or mailer choices.
        // Read the complete owned status instead of turning missing fields into an outage.
        if(live && typeof latest?.available!=='boolean'){latest=await request('GET',path);ensure();}
        if(typeof latest?.available==='boolean')available=latest.available;
        render();
      }
      catch (error) { if (!error.cancelled && root.isConnected) { if(live){try{latest=await request('GET',path);available=latest.available===true;ensure();render();}catch{available=false;if(!latest?.order)root.hidden=true;}} message.textContent = error.message || 'Mailing could not be loaded. Please try again.'; } }
      finally { busy = false; for (const button of content.querySelectorAll('button')) button.disabled = false; }
    }
    function button(text, fn, id) { const value = node('button',text); value.type = 'button'; value.className = 'secondary'; if(id)value.id=id; value.onclick=()=>action(fn); return value; }
    function render() {
      content.replaceChildren();
      root.hidden=live&&!available&&!latest?.order;
      if(root.hidden)return;
      heading.textContent=live&&!available?'Your mailing request':'Would you like us to mail your packet?';
      introduction.textContent=live&&!available?'You can check or cancel your existing request below. Downloading and mailing your packet yourself remains available.':'You can still download your PDF and mail it yourself. Or try the optional mailing service below.';
      if (latest?.packet_changed) content.append(node('p','This request belongs to an earlier packet version. Review the current packet before requesting another mailing.'));
      const order = latest?.order;
      if (order) {
        const terminal=['CANCELLED','FAILED','RETURNED','DELIVERED'].includes(order.state);
        if(live&&order.mailer==='POSTGRID'&&!terminal){
          const review=order.print_review;
          if(review?.returnAddress){const r=review.returnAddress;content.append(node('p',`${review.addressStandardized?'PostGrid standardized your return address. Check it carefully:':'Return address on the final copy:'} ${[r.firstName,r.lastName,r.addressLine1,r.addressLine2,r.city,r.provinceOrState,r.postalOrZip,r.countryCode].filter(Boolean).join(', ')}.`));}
          content.append(node('p',review?.approved?'You approved the PostGrid mailing copy.':'The mailing will stay on hold until you approve the final PostGrid mailing copy.'));
          if(review?.previewAvailable&&order.state==='QUEUED'){
            content.append(button('Load final mailing copy',async()=>{
              const result=await request('POST',path+'/print-preview',{});
              if(previewCache?.url)URL.revokeObjectURL(previewCache.url);
              const binary=atob(result.pdf_base64),bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
              previewCache={orderId:result.order_id,hash:result.preview_hash,url:URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}))};reviewedPrintHash=null;
            },'packet-mailing-print-load'));
            if(previewCache?.orderId===order.id&&previewCache.hash===review.previewHash){
              const link=node('a','Open and review every page of the final mailing copy');link.href=previewCache.url;link.target='_blank';link.rel='noopener';
              link.onclick=()=>{reviewedPrintHash=previewCache.hash;};content.append(link);
              const label=node('label'),checked=node('input');checked.type='checkbox';checked.id='packet-mailing-print-checked';
              label.append(checked,document.createTextNode(' I checked every packet page and my return address on the added address cover. CRP staff manage the bureau mailing address. Pages may be resized to fit the mailing paper. I apply my typed signature to this exact final copy and approve it for PostGrid to print and mail.'));content.append(label);
              content.append(button('Approve this final mailing copy',async()=>{
                checkCurrent();if(!checked.checked||reviewedPrintHash!==previewCache.hash)throw Error('Open the final mailing copy, review it and tick the approval box.');
                latest=await request('POST',path+'/approve-print',{order_id:order.id,reviewed_version:version,preview_hash:previewCache.hash,approve_print:true,approve_signature:true});
              },'packet-mailing-print-approve'));
            }
          }
        }
        if(live && order.payment_hold)content.append(node('p','Your payment needs staff review. Further posting is held.'));
        if(live && (latest.refund_status||order.refund_status))content.append(node('p',`Refund status: ${latest.refund_status||order.refund_status}.`));
        const title = node('p',`Mailing status: ${labels[order.state] || order.state}`); title.id='packet-mailing-status'; content.append(title);
        content.append(node('p',`Request reference: ${order.id}. Payment: ${order.payment_state === 'VERIFIED' ? (live?'verified':'simulated — no charge') : order.payment_state.toLowerCase()}.`));
        if (order.state === 'UNKNOWN') content.append(node('p','Keep this request held for staff review. Do not send another request for the same packet.'));
        if (['CANCELLED','FAILED','RETURNED'].includes(order.state) && order.payment_state === 'VERIFIED') content.append(node('p',live?'Your payment is marked for staff refund review. A cancellation or return does not itself confirm a refund.':'The simulated payment remains marked for staff refund review. No actual money was charged.'));
        if(live && available && order.state==='AWAITING_PAYMENT' && !latest?.packet_changed && latest?.checkout_url)content.append(button('Continue to secure payment',async()=>checkout(latest.checkout_url),'packet-mailing-checkout'));
        if (['AWAITING_PAYMENT','QUEUED','FAILED'].includes(order.state) || live && order.state==='ACCEPTED') content.append(button('Cancel this mailing request', async()=>{ latest=await request('POST',path+'/cancel',{order_id:order.id}); },'packet-mailing-cancel'));
      }
      content.append(button('Refresh mailing status',async()=>{latest=await request('GET',path);},'packet-mailing-refresh'));
      const q=latest?.quote, canConfirm=available && q && (!order || latest?.payment_pending) && (!latest?.packet_changed) && (q.expires_at>Date.now() || latest?.pending || latest?.payment_pending);
      if (canConfirm) {
        content.append(node('h4',`${live?'Mailing total':'Sample mailing price'}: ${new Intl.NumberFormat('en',{style:'currency',currency:q.currency,currencyDisplay:'code'}).format(q.amount_minor/100)}`),
          node('p',`${live?'Bureau destination (managed by CRP)':'Recipient'}: ${q.recipient_label}. ${q.recipient_address}`),node('p',`${q.page_count} reviewed PDF pages. ${q.service}.${live?' Staff check the bureau destination and postal route before posting.':' Postal support is not verified.'}`),
          node('p',`Price expires: ${new Date(q.expires_at).toLocaleString()}.`));
        if(live&&q.return_address){const r=q.return_address;content.append(node('p',`Your return address: ${[r.firstName,r.lastName,r.addressLine1,r.addressLine2,r.city,r.provinceOrState,r.postalOrZip,r.countryCode].filter(Boolean).join(', ')}.`),
          node('p','The total includes an address cover page. Your approved source PDF stays unchanged. PostGrid receives it and the mailing addresses to prepare your final printing copy. You must check every page and approve that copy before it is submitted.'));}
        const approveLabel=node('label'),approve=node('input');approve.type='checkbox';approve.id='packet-mailing-authorize';
        approveLabel.append(approve,document.createTextNode(live?(q.mailer==='POSTGRID'?' I authorize CRP to share my exact approved signed packet and these mailing addresses with PostGrid. I approve the return address shown. My final print approval is still required before mailing. This authorization expires in seven days.':' I choose emergency manual mailing and authorize CRP staff to print and mail this exact approved signed packet to this recipient. This authorization expires in seven days if it has not been posted.'):' I authorize this simulated mailing of my approved packet to the recipient shown, at this sample price.'));
        const payLabel=node('label'),pay=node('input');pay.type='checkbox';pay.id='packet-mailing-payment';
        payLabel.append(pay,document.createTextNode(live?' I accept the total shown and want to continue to payment.':' Simulate payment only. Do not charge me.'));
        content.append(approveLabel,payLabel,button(live?'Authorize mailing and continue to payment':latest?.pending||latest?.payment_pending?'Resume this simulation safely':'Confirm simulated payment and mailing',async()=>{
          checkCurrent(); if(!approve.checked||!pay.checked)throw Error('Tick both confirmation boxes before continuing.');
          latest=live?await request('POST',path+'/confirm',{quote_id:q.quote_id,reviewed_version:version,authorize_mailing:true,accept_price:true}):await request('POST',path+'/confirm',{quote_id:q.quote_id,reviewed_version:version,authorize_mailing:true,simulate_payment:true});
          if(live && latest.checkout_url)checkout(latest.checkout_url);
        },'packet-mailing-confirm'));
      } else if (available && (!order || ['CANCELLED','FAILED'].includes(order.state) || latest?.packet_changed)) {
        if(live){
          const methods=latest?.mailers||[],select=node('select');select.id='packet-mailing-method';
          for(const [value,label]of [['POSTGRID','PostGrid (usual mailing service)'],['MANUAL','Emergency manual mailing']]){
            const option=node('option',label);option.value=value;option.disabled=!methods.some(r=>r.mailer===value);select.append(option);
          }select.value=chosenMailer;const methodLabel=node('label','Mailing service');methodLabel.append(select);content.append(methodLabel);
          if(!methods.some(r=>r.mailer==='POSTGRID'))content.append(node('p','PostGrid is currently unavailable for this route. You may choose the emergency manual option if it is offered.'));
          if(!returnDraft)returnDraft={...(latest?.return_address_suggestion||{})};
          const address=node('fieldset');address.append(node('legend','Your return address'));
          for(const [key,label]of [['firstName','Full name'],['addressLine1','Street address'],['addressLine2','Apartment or unit (optional)'],['city','City or town'],['provinceOrState','Province, state or county'],['postalOrZip','Postal code or ZIP code']]){
            const field=node('input');field.value=returnDraft[key]||'';field.maxLength=key==='addressLine1'?600:250;field.oninput=()=>{returnDraft[key]=field.value.trim();};const wrapper=node('label',label);wrapper.append(field);address.append(wrapper);
          }
          const country=node('select');for(const [code,label]of [['','Choose your return-address country'],['CA','Canada'],['US','United States'],['GB','United Kingdom'],['AU','Australia']]){const option=node('option',label);option.value=code;country.append(option);}country.value=returnDraft.countryCode||'';country.onchange=()=>{returnDraft.countryCode=country.value;};const countryLabel=node('label','Return-address country');countryLabel.append(country);address.append(countryLabel);content.append(address);
          address.hidden=chosenMailer!=='POSTGRID';select.onchange=()=>{chosenMailer=select.value;address.hidden=chosenMailer!=='POSTGRID';};
        }
        content.append(button(live?'Mail my signed packet — show total':'Mail my packet — show sample price',async()=>{
          checkCurrent();const body={reviewed_version:version};if(live){
            if(!latest?.mailers?.some(r=>r.mailer===chosenMailer))throw Error('Choose an available mailing service.');
            body.mailer=chosenMailer;body.return_address=chosenMailer==='POSTGRID'?{firstName:returnDraft.firstName||'',lastName:returnDraft.lastName||'',addressLine1:returnDraft.addressLine1||'',addressLine2:returnDraft.addressLine2||'',city:returnDraft.city||'',provinceOrState:returnDraft.provinceOrState||'',postalOrZip:returnDraft.postalOrZip||'',countryCode:returnDraft.countryCode||''}:null;
          }
          latest={...await request('POST',path+'/quote',body),order:null};
        },'packet-mailing-quote'));
        if(!canRequest())content.append(node('p',live?'Add your signature, check every page and approve this version before choosing mailing.':'Approve the current packet after reviewing every page to see a sample mailing price.'));
      }
    }
    render();
    action(async()=>{latest=await request('GET',path);});
  }
  window.CRP_PACKET_MAILING={mount};
})();
