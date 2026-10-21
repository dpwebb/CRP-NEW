'use strict';
(() => {
  const node = (tag, text) => { const value = document.createElement(tag); if (text !== undefined) value.textContent = text; return value; };
  const states = { AWAITING_PAYMENT:'Waiting for simulated payment', QUEUED:'Queued for simulated mailing', SUBMITTING:'Simulating submission', ACCEPTED:'Simulated provider acceptance', DISPATCHED:'Simulated dispatch', DELIVERED:'Simulated delivery', RETURNED:'Simulated return', UNKNOWN:'Uncertain result — held for review', FAILED:'Simulated submission failed', CANCELLED:'Cancelled' };
  function mount({ root, caseId, version, request, ensure, canRequest }) {
    let latest = null, busy = false;
    const path = `/api/cases/${caseId}/mailing`;
    const message = node('p'); message.setAttribute('role','status');
    const content = node('div');
    root.replaceChildren(node('h3','Would you like us to mail your packet?'),
      node('p','You can still download your PDF and mail it yourself. Or try the optional mailing service below.'),
      node('p','SIMULATION ONLY: no charge and nothing is printed or mailed. Prices are invented examples. The current PDF includes your instruction sheet; a sendable, signed packet must be verified before any real mailing.'), content, message);
    function checkCurrent() { ensure(); if (!canRequest()) throw Error('Save your changes, check every page and approve this packet before choosing mailing.'); }
    async function action(fn) {
      if (busy) return; busy = true; message.textContent = '';
      for (const button of content.querySelectorAll('button')) button.disabled = true;
      try { await fn(); ensure(); render(); }
      catch (error) { if (!error.cancelled && root.isConnected) message.textContent = error.message || 'Mailing could not be loaded. Please try again.'; }
      finally { busy = false; for (const button of content.querySelectorAll('button')) button.disabled = false; }
    }
    function button(text, fn, id) { const value = node('button',text); value.type = 'button'; value.className = 'secondary'; if(id)value.id=id; value.onclick=()=>action(fn); return value; }
    function render() {
      content.replaceChildren();
      if (latest?.packet_changed) content.append(node('p','This request belongs to an earlier packet version. Review the current packet before requesting another mailing.'));
      const order = latest?.order;
      if (order) {
        const title = node('p',`Mailing status: ${states[order.state] || order.state}`); title.id='packet-mailing-status'; content.append(title);
        content.append(node('p',`Request reference: ${order.id}. Payment: ${order.payment_state === 'VERIFIED' ? 'simulated — no charge' : order.payment_state.toLowerCase()}.`));
        if (order.state === 'UNKNOWN') content.append(node('p','Keep this request held for staff review. Do not send another request for the same packet.'));
        if (['CANCELLED','FAILED'].includes(order.state) && order.payment_state === 'VERIFIED') content.append(node('p','The simulated payment remains marked for staff refund review. No actual money was charged.'));
        if (['AWAITING_PAYMENT','QUEUED','FAILED'].includes(order.state)) content.append(button('Cancel this mailing request', async()=>{ latest=await request('POST',path+'/cancel',{order_id:order.id}); },'packet-mailing-cancel'));
      }
      content.append(button('Refresh mailing status',async()=>{latest=await request('GET',path);},'packet-mailing-refresh'));
      const q=latest?.quote, canConfirm=q && (!order || latest?.payment_pending) && (!latest?.packet_changed) && (q.expires_at>Date.now() || latest?.pending || latest?.payment_pending);
      if (canConfirm) {
        content.append(node('h4',`Sample mailing price: ${new Intl.NumberFormat('en',{style:'currency',currency:q.currency,currencyDisplay:'code'}).format(q.amount_minor/100)}`),
          node('p',`Recipient: ${q.recipient_label}. ${q.recipient_address}`),node('p',`${q.page_count} reviewed PDF pages. ${q.service}. Postal support is not verified.`),
          node('p',`Price expires: ${new Date(q.expires_at).toLocaleString()}.`));
        const approveLabel=node('label'),approve=node('input');approve.type='checkbox';approve.id='packet-mailing-authorize';
        approveLabel.append(approve,document.createTextNode(' I authorize this simulated mailing of my approved packet to the recipient shown, at this sample price.'));
        const payLabel=node('label'),pay=node('input');pay.type='checkbox';pay.id='packet-mailing-payment';
        payLabel.append(pay,document.createTextNode(' Simulate payment only. Do not charge me.'));
        content.append(approveLabel,payLabel,button(latest?.pending||latest?.payment_pending?'Resume this simulation safely':'Confirm simulated payment and mailing',async()=>{
          checkCurrent(); if(!approve.checked||!pay.checked)throw Error('Tick both confirmation boxes before continuing.');
          latest=await request('POST',path+'/confirm',{quote_id:q.quote_id,reviewed_version:version,authorize_mailing:true,simulate_payment:true});
        },'packet-mailing-confirm'));
      } else if (!order || ['CANCELLED','FAILED'].includes(order.state) || latest?.packet_changed) {
        content.append(button('Mail my packet — show sample price',async()=>{checkCurrent();latest={...await request('POST',path+'/quote',{reviewed_version:version}),order:null};},'packet-mailing-quote'));
        if(!canRequest())content.append(node('p','Approve the current packet after reviewing every page to see a sample mailing price.'));
      }
    }
    render();
    action(async()=>{latest=await request('GET',path);});
  }
  window.CRP_PACKET_MAILING={mount};
})();
