'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
async function run(t,check){
  class Element{
    constructor(tag){this.tagName=tag;this.children=[];this.textContent='';this.isConnected=true;this.hidden=false;}
    setAttribute(){} append(...nodes){this.children.push(...nodes);} prepend(...nodes){this.children.unshift(...nodes);}
    replaceChildren(...nodes){this.children=[...nodes];}
    querySelectorAll(tag){return this.children.flatMap(node=>node instanceof Element?[...(node.tagName===tag?[node]:[]),...node.querySelectorAll(tag)]:[]);}
  }
  const script=fs.readFileSync(path.join(__dirname,'../../ui/packet-mailing.js'),'utf8');
  const context={document:{createElement:tag=>new Element(tag),createTextNode:text=>({textContent:text})},window:{location:{assign(){throw Error('Checkout must not open during visibility checks');}}},Intl,Date};
  vm.runInNewContext(script,context);
  const turn=()=>new Promise(resolve=>setImmediate(resolve));
  const mount=(request)=>{const root=new Element('section');context.window.CRP_PACKET_MAILING.mount({root,caseId:'fictional-case',version:'fictional-version',request,ensure(){},canRequest:()=>true,live:true});return root;};
  let answer;
  const initial=mount(()=>new Promise(resolve=>{answer=resolve;}));
  check.equal(initial.hidden,true,'no mailing offer flashes before jurisdiction availability resolves');
  answer({available:false,quote:null,order:null});await turn();
  check.equal(initial.hidden,true,'inactive jurisdiction has no visible mailing service');
  const down=mount(async()=>{throw Error('Local service unavailable');});await turn();
  check.equal(down.hidden,true,'service failure cannot expose an unavailable mailing option');
  let available=true;
  const active=mount(async()=>({available,quote:null,order:null}));await turn();
  check.equal(active.hidden,false,'active jurisdiction exposes the optional mailing service');
  check.ok(active.querySelectorAll('button').some(b=>b.id==='packet-mailing-quote'),'active jurisdiction can request its mailing total');
  available=false;active.querySelectorAll('button').find(b=>b.id==='packet-mailing-refresh').onclick();await turn();
  check.equal(active.hidden,true,'deactivating a jurisdiction hides its new-order offer on refresh');
  const existing=mount(async()=>({available:false,quote:null,order:{id:'fictional-order',state:'AWAITING_PAYMENT',payment_state:'UNPAID'},checkout_url:'https://checkout.stripe.com/fictional'}));await turn();
  check.equal(existing.hidden,false,'inactive jurisdiction retains existing-order status and cancellation');
  check.ok(existing.querySelectorAll('button').some(b=>b.id==='packet-mailing-cancel'),'an existing inactive-jurisdiction request can still be canceled');
  check.ok(!existing.querySelectorAll('button').some(b=>['packet-mailing-quote','packet-mailing-confirm','packet-mailing-checkout'].includes(b.id)),'inactive jurisdiction exposes no new quote, payment or confirmation');
  check.equal(existing.children[0].textContent,'Your mailing request','existing-order heading does not advertise an inactive service');
  const quote=mount(async()=>({available:true,order:null,quote:{quote_id:'fictional-quote',amount_minor:2200,currency:'USD',expires_at:Date.now()+600000,page_count:6,recipient_label:'Fictional U.S. bureau',recipient_address:'Fictional U.S. address',origin_country:'CA',service:'Packet printing and postal mailing'}}));await turn();
  const text=element=>[element.textContent,...element.children.map(child=>child instanceof Element?text(child):child.textContent||'')].join(' ');
  check.ok(!/Printing and posting country|Canada/.test(text(quote)),'consumer confirmation does not display the internal posting origin');
  check.ok(/Fictional U.S. bureau/.test(text(quote)) && /USD/.test(text(quote)),'consumer still sees the actual recipient and quoted currency');
  check.ok(quote.querySelectorAll('input').some(input=>input.id==='packet-mailing-authorize'),'exact-packet mailing authorization is retained');
  return {inactive_hidden:true,active_offered:true,existing_orders_retained:true,external_calls:0};
}
module.exports={id:'gw-mailing-jurisdiction-visibility',title:'Jurisdiction mailing visibility and existing-order continuity',run};
