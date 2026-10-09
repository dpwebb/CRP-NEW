'use strict';
// Host-only provisioning for this account and origin. Credential values never leave the host.
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const mode=process.argv[2]||'inspect'; assert.ok(['inspect','apply'].includes(mode));
const base='/opt/crp-wizard-production',file=base+'/production.env';
function parse(text){return Object.fromEntries(text.split(/\r?\n/).filter(l=>/^[A-Z][A-Z0-9_]*=/.test(l)).map(l=>{const i=l.indexOf('=');let v=l.slice(i+1).trim();if(/^(['"]).*\1$/.test(v))v=v.slice(1,-1);return[l.slice(0,i),v];}));}
const old=parse(fs.readFileSync('/opt/creditregulatorpro/app/.env','utf8'));
const env=fs.existsSync(file)?parse(fs.readFileSync(file,'utf8')):{};
const key=env.STRIPE_SECRET_KEY||old.STRIPE_SECRET_KEY;
assert.match(key,/^sk_live_/); assert.match(old.STRIPE_PUBLISHABLE_KEY,/^pk_live_/);
async function api(method,route,args,idempotency){
  const headers={Authorization:'Bearer '+key,'Stripe-Version':'2024-06-20'};
  let body;if(method==='POST'){headers['Content-Type']='application/x-www-form-urlencoded';body=new URLSearchParams(args);}
  if(idempotency)headers['Idempotency-Key']=idempotency;
  const r=await fetch('https://api.stripe.com/v1/'+route,{method,headers,body,signal:AbortSignal.timeout(30000)}),v=await r.json();
  if(!r.ok)throw Error('Stripe '+r.status+' '+(v.error?.code||v.error?.type||'request_failed'));return v;
}
async function list(route){const rows=[];let after='';do{const r=await api('GET',route+(route.includes('?')?'&':'?')+'limit=100'+(after?'&starting_after='+after:''));rows.push(...r.data);after=r.has_more?r.data.at(-1).id:'';}while(after);return rows;}
(async()=>{
  const account=await api('GET','account');
  assert.equal(account.id,'acct_1RTRWOKCM3e4JIjW');assert.equal(account.charges_enabled,true);
  assert.equal(account.details_submitted,true);assert.equal(account.capabilities.card_payments,'active');
  const receipt={account_id:account.id,live:true,charges_enabled:true,payouts_enabled:account.payouts_enabled,
    origin:'https://creditregulatorpro.com',api_version:'2024-06-20',mode,prices:[]};
  const existing=await list('prices?active=true');
  for(const [code,amount,interval,name] of [['report_once',595,null,'One report'],['monthly',795,'month','Monthly'],['annual',7950,'year','Yearly']]){
    const setting='STRIPE_PRICE_'+(code==='report_once'?'REPORT_ONCE':code.toUpperCase());
    let p=env[setting]?await api('GET','prices/'+env[setting]):existing.find(p=>p.livemode&&p.currency==='cad'&&p.unit_amount===amount&&p.metadata?.crp_v1_plan===code&&(p.recurring?.interval||null)===interval);
    if(!p&&mode==='apply'){
      const product=await api('POST','products',{name:'Credit Regulator Pro — '+name,'metadata[crp_v1_plan]':code,'metadata[managed_by]':'crp-v1-production'},'crp-v1-production-product-'+code);
      const args={product:product.id,unit_amount:String(amount),currency:'cad','metadata[crp_v1_plan]':code,'metadata[managed_by]':'crp-v1-production'};
      if(interval){args['recurring[interval]']=interval;args['recurring[interval_count]']='1';}
      p=await api('POST','prices',args,'crp-v1-production-price-'+code);
    }
    if(p){assert.equal(p.active,true);assert.equal(p.livemode,true);assert.equal(p.currency,'cad');assert.equal(p.unit_amount,amount);assert.equal(p.recurring?.interval||null,interval);if(interval)assert.equal(p.recurring.interval_count,1);env[setting]=p.id;}
    receipt.prices.push({plan:code,amount_cents:amount,currency:'cad',interval,price_id:p?.id||null,verified:Boolean(p)});
  }
  const events=['checkout.session.completed','checkout.session.async_payment_succeeded','invoice.paid','invoice.payment_failed','invoice.voided','customer.subscription.deleted','charge.refunded','charge.dispute.created'];
  const endpoints=await list('webhook_endpoints');
  receipt.preserved_existing_endpoints=endpoints.map(e=>({id:e.id,url:e.url,status:e.status,api_version:e.api_version}));
  let endpoint=endpoints.find(e=>e.url==='https://creditregulatorpro.com/api/billing/events'&&e.livemode);
  if(endpoint&&mode==='apply')assert.ok(env.STRIPE_WEBHOOK_SECRET,'Retained signing secret required; never replace an existing endpoint');
  if(!endpoint&&mode==='apply'){
    const args={url:'https://creditregulatorpro.com/api/billing/events',api_version:'2024-06-20',description:'Credit Regulator Pro version 1 production','metadata[managed_by]':'crp-v1-production'};
    events.forEach((e,i)=>args['enabled_events['+i+']']=e);
    endpoint=await api('POST','webhook_endpoints',args,'crp-v1-production-webhook-20261009');
    assert.match(endpoint.secret,/^whsec_/);env.STRIPE_WEBHOOK_SECRET=endpoint.secret;
  }
  if(endpoint){assert.equal(endpoint.status,'enabled');assert.equal(endpoint.api_version,'2024-06-20');events.forEach(e=>assert.ok(endpoint.enabled_events.includes(e)));receipt.webhook={id:endpoint.id,url:endpoint.url,api_version:endpoint.api_version,events,enabled:true};}
  if(mode==='apply'){
    fs.mkdirSync(base,{recursive:true,mode:0o700});
    Object.assign(env,{CRP_DEPLOYMENT_ENV:'production',CRP_LOCAL_SERVICE_HOST:'127.0.0.1',CRP_LOCAL_SERVICE_PORT:'8794',CRP_LOCAL_SERVICE_SECURE_COOKIE:'1',CRP_LOCAL_SERVICE_DATA:'/var/lib/crp-wizard-production',CRP_PAYMENT_PROVIDER:'stripe',STRIPE_SECRET_KEY:key,STRIPE_PUBLISHABLE_KEY:old.STRIPE_PUBLISHABLE_KEY,STRIPE_APP_ORIGINS:'https://creditregulatorpro.com',CRP_TESSERACT_EXE:'/usr/bin/tesseract'});
    env.CRP_SUPPORT_REFERENCE_SECRET ||= crypto.randomBytes(32).toString('hex');assert.ok(env.STRIPE_WEBHOOK_SECRET);
    assert.ok(Object.values(env).every(v=>typeof v==='string'&&!/[\r\n]/.test(v)));
    fs.writeFileSync(file+'.tmp',Object.entries(env).map(([k,v])=>k+'='+v).join('\n')+'\n',{mode:0o600});fs.renameSync(file+'.tmp',file);fs.chmodSync(file,0o600);
  }
  receipt.live_config_verified=receipt.prices.every(p=>p.verified)&&Boolean(receipt.webhook&&env.STRIPE_WEBHOOK_SECRET);
  receipt.measured_at=new Date().toISOString();if(mode==='apply')fs.writeFileSync(base+'/stripe-config-receipt.json',JSON.stringify(receipt,null,2)+'\n',{mode:0o600});
  console.log(JSON.stringify(receipt,null,2));
})().catch(err=>{console.error(err.message);process.exitCode=1;});
