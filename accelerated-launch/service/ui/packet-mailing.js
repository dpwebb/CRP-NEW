'use strict';
(() => {
  const node = (tag, text) => { const value = document.createElement(tag); if (text !== undefined) value.textContent = text; return value; };
  const states = { AWAITING_PAYMENT:'Waiting for simulated payment', QUEUED:'Queued for simulated mailing', SUBMITTING:'Simulating submission', ACCEPTED:'Simulated provider acceptance', DISPATCHED:'Simulated dispatch', DELIVERED:'Simulated delivery', RETURNED:'Simulated return', UNKNOWN:'Uncertain result — held for review', FAILED:'Simulated submission failed', CANCELLED:'Cancelled' };
  function mount({ root, caseId, version, request, ensure, canRequest, live=false, testMode=false }) {
    const labels=live?{AWAITING_PAYMENT:'Waiting for payment',QUEUED:'Waiting for staff preparation',ACCEPTED:'Prepared by staff',SUBMITTING:'Postal handoff in progress',DISPATCHED:'Posted - recorded by staff',DELIVERED:'Delivery recorded by staff',RETURNED:'Return recorded by staff',UNKNOWN:'Held for staff review',FAILED:'Unable to proceed',CANCELLED:'Cancelled'}:states;
    let latest = null, busy = false, available = !live, chosenMailer='POSTGRID',returnDraft=null,previewCache=null,reviewedPrintHash=null,renderSequence=0;
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
      finally { busy = false; for (const button of content.querySelectorAll('button')) button.disabled = button.prerequisiteDisabled === true; }
    }
    function button(text, fn, id) { const value = node('button',text); value.type = 'button'; value.className = 'secondary'; if(id)value.id=id; value.onclick=()=>action(fn); return value; }
    function render() {
      const renderId=++renderSequence;reviewedPrintHash=null;
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
          if(review?.previewAvailable&&order.state==='QUEUED'&&!review.approved){
            content.append(button('Load final mailing copy',async()=>{
              const result=await request('POST',path+'/print-preview',{});
              if(!/^[a-f0-9-]{36}$/.test(result.order_id||'')||!/^[a-f0-9]{64}$/.test(result.preview_hash||''))throw Error('Refresh the mailing status before reviewing this copy.');
              const url=path+'/print-preview/'+encodeURIComponent(result.order_id)+'/'+result.preview_hash,info=await request('GET',url+'/pages');
              if(info.order_id!==result.order_id||info.preview_hash!==result.preview_hash||!Number.isSafeInteger(info.page_count)||info.page_count<1||info.page_count>400)throw Error('We could not load the complete final copy. Refresh the mailing status and try again.');
              previewCache={orderId:result.order_id,hash:result.preview_hash,url,pageCount:info.page_count};reviewedPrintHash=null;
            },'packet-mailing-print-load'));
            if(previewCache?.orderId===order.id&&previewCache.hash===review.previewHash){
              const count=previewCache.pageCount,toolbar=node('div');toolbar.className='packet-page-toolbar';
              toolbar.append(node('strong',`${count} pages in your final mailing copy`));
              const jumpLabel=node('label','Go to final-copy page '),jump=node('select'),zoomLabel=node('label','Final-copy page size '),zoom=node('select');
              jump.id='packet-mailing-page-jump';zoom.id='packet-mailing-page-zoom';
              for(let page=1;page<=count;page++){const option=node('option',page===1?'1: Address cover':`${page}: Final copy page ${page}`);option.value=String(page);jump.append(option);}
              for(const[value,text]of [['100','Fit to screen'],['readable','Full size for reading'],['150','150%'],['200','200%']]){const option=node('option',text);option.value=value;zoom.append(option);}
              jumpLabel.append(jump);zoomLabel.append(zoom);toolbar.append(jumpLabel,zoomLabel);
              const link=node('a','Open the final PDF in a new tab (optional)');link.href=previewCache.url;link.target='_blank';link.rel='noopener';
              link.onclick=()=>refreshApproval();toolbar.append(link);content.append(toolbar);
              content.append(node('p','Read every page below. Check your return address on the address cover. You can enlarge the pages before approving.'));
              const pageStatus=node('p',`Loading final-copy page 1 of ${count}...`);pageStatus.id='packet-mailing-page-status';pageStatus.setAttribute('role','status');content.append(pageStatus);
              const pages=node('div');pages.className='packet-page-list';pages.setAttribute('aria-label','Complete final mailing copy');content.append(pages);
              const sheets=new Map(),images=[];
              for(let page=1;page<=count;page++){
                const sheet=node('section');sheet.className='packet-page';sheet.id='mailing-copy-sheet-'+page;sheet.setAttribute('aria-label',`Final mailing copy page ${page} of ${count}`);
                sheet.append(node('h4',`Page ${page} of ${count} - ${page===1?'Address cover':'Final mailing copy'}`));
                const scroll=node('div'),paper=node('div'),img=node('img');scroll.className='packet-sheet-scroll';paper.className='packet-sheet';img.className='packet-page-image';img.style.height='auto';img.alt=`Final mailing copy - page ${page}`;
                paper.append(img);scroll.append(paper);sheet.append(scroll);pages.append(sheet);sheets.set(page,sheet);images.push({img,paper,page});
              }
              jump.onchange=()=>{ensure();sheets.get(Number(jump.value))?.scrollIntoView({block:'start',behavior:'instant'});};
              zoom.onchange=()=>{ensure();for(const{paper}of images)paper.style.width=zoom.value==='readable'?'max(100%, 960px)':zoom.value+'%';};
              const label=node('label'),checked=node('input');checked.type='checkbox';checked.id='packet-mailing-print-checked';
              checked.disabled=true;
              label.append(checked,document.createTextNode(' I checked every packet page and my return address on the added address cover. CRP staff manage the bureau mailing address. Pages may be resized to fit the mailing paper. I apply my typed signature to this exact final copy and approve it for PostGrid to print and mail.'));content.append(label);
              const approvalButton=button('Approve this final mailing copy',async()=>{
                checkCurrent();if(!checked.checked||reviewedPrintHash!==previewCache.hash||renderId!==renderSequence)throw Error('Wait for every final-copy page, review it and tick the approval box.');
                latest=await request('POST',path+'/approve-print',{order_id:order.id,reviewed_version:version,preview_hash:previewCache.hash,approve_print:true,approve_signature:true});
              },'packet-mailing-print-approve');
              const refreshApproval=()=>{approvalButton.prerequisiteDisabled=!checked.checked||reviewedPrintHash!==previewCache.hash||renderId!==renderSequence||!canRequest();approvalButton.disabled=busy||approvalButton.prerequisiteDisabled;};
              checked.onchange=refreshApproval;refreshApproval();content.append(approvalButton);
              content.append(node('p','Wait for every page to load. Check the final copy, then tick the review box to enable approval.'));
              const current=()=>{ensure();if(!root.isConnected||renderId!==renderSequence||latest?.order?.id!==order.id||latest.order.state!=='QUEUED'||latest.packet_changed||previewCache?.hash!==review.previewHash)throw Object.assign(new Error('Final-copy view closed.'),{cancelled:true});checkCurrent();};
              (async()=>{
                try{
                  for(const{img,page}of images){
                    current();
                    await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('We could not show every final-copy page. Refresh the mailing status and load the copy again.'));img.src=previewCache.url+'/pages/'+page;});current();
                    pageStatus.textContent=page===count?`All ${count} final-copy pages are ready to review.`:`Loading final-copy page ${page+1} of ${count}...`;
                  }
                  current();reviewedPrintHash=previewCache.hash;checked.checked=false;checked.disabled=false;refreshApproval();
                }catch(error){if(error.cancelled||renderId!==renderSequence||!root.isConnected)return;reviewedPrintHash=null;checked.checked=false;checked.disabled=true;pageStatus.textContent=error.message||'The complete final copy could not be shown.';refreshApproval();}
              })();
            }
          }
        }
        if(live && order.payment_hold && order.payment_state!=='REFUNDED')content.append(node('p','Your payment needs staff review. Further posting is held.'));
        if(live && (latest.refund_status||order.refund_status))content.append(node('p',`Refund status: ${latest.refund_status||order.refund_status}.`));
        let status=labels[order.state] || order.state;
        if(live && order.state==='QUEUED' && order.mailer==='POSTGRID'){
          const review=order.print_review;
          status=review?.approved?'Approved by you — waiting for staff to submit':review?.previewAvailable?'Final printing copy ready — review and approve':review?.state==='DRAFT_PREPARED'?'Staff prepared the draft — waiting for the print preview':'Waiting for staff to prepare the draft';
        }
        const title = node('p',`Mailing status: ${status}`); title.id='packet-mailing-status'; content.append(title);
        content.append(node('p',`Request reference: ${order.id}. Payment: ${order.payment_state === 'VERIFIED' ? (live?'verified':'simulated — no charge') : order.payment_state.toLowerCase().replaceAll('_',' ')}.`));
        const successfulRefunds=(order.refunds||[]).filter(r=>r.status==='succeeded');
        if(live && order.payment_state==='REFUNDED'){
          const amount=Number.isSafeInteger(order.amount_minor)&&/^[A-Z]{3}$/.test(order.currency||'')?new Intl.NumberFormat('en',{style:'currency',currency:order.currency,currencyDisplay:'code'}).format(order.amount_minor/100):null;
          content.append(node('p',amount?`Refunded ${amount}. No further payment action is needed.`:'Your payment was refunded. No further payment action is needed.'));
        }
        else if(live&&successfulRefunds.length&&/^[A-Z]{3}$/.test(order.currency||'')&&successfulRefunds.every(r=>r.currency===order.currency&&Number.isSafeInteger(r.amountMinor)&&r.amountMinor>0)){
          const total=successfulRefunds.reduce((sum,r)=>sum+r.amountMinor,0);
          if(Number.isSafeInteger(total))content.append(node('p',`Refunded ${new Intl.NumberFormat('en',{style:'currency',currency:order.currency,currencyDisplay:'code'}).format(total/100)} so far.`));
        }
        if(live&&successfulRefunds.length)content.append(node('p',`Refund ${successfulRefunds.length===1?'reference':'references'}: ${successfulRefunds.map(r=>r.id).join(', ')}.`));
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
