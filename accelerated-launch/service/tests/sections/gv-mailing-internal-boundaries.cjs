'use strict';
const crypto=require('node:crypto');
const {configuration,create}=require('../../mail-ops-internal.cjs');
async function run(t,check){
  const production={CRP_DEPLOYMENT_ENV:'production',CRP_MAIL_OPS_MODE:'production-internal',CRP_PAYMENT_PROVIDER:'stripe',STRIPE_SECRET_KEY:'sk_live_fictional',STRIPE_WEBHOOK_SECRET:'whsec_fictional',CRP_MAIL_OPS_URL:'http://127.0.0.1:4336',CRP_MAIL_OPS_KEY:'a'.repeat(64),CRP_MAIL_OPS_PAYMENT_KEY:'b'.repeat(64)};
  check.equal(configuration(production).enabled,true,'production requires the explicit internal workflow and live key mode');
  for(const change of [{CRP_DEPLOYMENT_ENV:'local'},{STRIPE_SECRET_KEY:'sk_test_fictional'},{CRP_MAIL_OPS_URL:'https://mail.creditregulatorpro.com'},{CRP_MAIL_OPS_URL:'http://localhost:4336'},{CRP_MAIL_OPS_URL:'http://127.0.0.1:4335'},{CRP_MAIL_OPS_PAYMENT_KEY:production.CRP_MAIL_OPS_KEY},{CRP_PAYMENT_PROVIDER:'test-adapter-not-a-payment'}])check.equal(configuration({...production,...change}).enabled,false,'wrong environment, key mode, transport and authority cannot enable production');
  const staging={...production,CRP_DEPLOYMENT_ENV:'staging',CRP_MAIL_OPS_MODE:'staging-internal',STRIPE_SECRET_KEY:'sk_test_fictional',CRP_MAIL_OPS_URL:'http://127.0.0.1:4335'};
  check.equal(configuration(staging).enabled,true,'internal staging uses only Stripe test mode');
  check.equal(configuration(staging).livemode,false,'staging never labels test-mode payments live');
  const service=create({state:()=>({packets:[]})},staging);
  const event={id:'evt_fictional',type:'invoice.paid',livemode:false,data:{object:{metadata:{}}}},raw=JSON.stringify(event),timestamp=Math.floor(Date.now()/1000);
  const signature=crypto.createHmac('sha256',staging.STRIPE_WEBHOOK_SECRET).update(timestamp+'.'+raw).digest('hex');
  const result=await service.webhook(raw,{'stripe-signature':`t=${timestamp},v1=${signature}`});
  check.equal(result,null,'ordinary verified subscription events continue to the existing subscription handler');
  let refused=false;try{await service.webhook(raw,{'stripe-signature':`t=${timestamp},v1=${'0'.repeat(64)}`});}catch(error){refused=error.code==='NOT_AUTHORIZED';}
  check.ok(refused,'invalid payment callbacks are rejected');
  const body={},rawBody=JSON.stringify(body),millis=String(Date.now()),nonce=crypto.randomUUID(),path='/api/mail-ops/internal/catalog';
  const mac=crypto.createHmac('sha256',staging.CRP_MAIL_OPS_KEY).update(['crp-mail-fulfillment-v1',millis,nonce,'POST',path,crypto.createHash('sha256').update(rawBody).digest('hex')].join('\n')).digest('hex');
  const headers={'x-mail-timestamp':millis,'x-mail-nonce':nonce,'x-mail-signature':mac};
  const catalog=await service.fulfillment({rawBody,headers,body,operation:'catalog'});
  check.equal(catalog.items.length,10,'scoped catalog returns only the ten published recipient routes');
  check.ok(catalog.items.every(item=>item.address&&item.sources.length),'catalog carries address and source references for administrator review');
  let replay=false;try{await service.fulfillment({rawBody,headers,body,operation:'catalog'});}catch(error){replay=error.code==='NOT_AUTHORIZED';}check.ok(replay,'signed fulfillment requests reject nonce replay');
  let wrongPath=false;try{await service.fulfillment({rawBody,headers,body,operation:'refund'});}catch(error){wrongPath=error.code==='NOT_AUTHORIZED';}check.ok(wrongPath,'read-only catalog signatures cannot authorize refunds');
  let finishDeletion;
  const deleting=service.withDeletion({account_id:'fictional-deleting'},null,()=>new Promise(resolve=>{finishDeletion=resolve;}));
  let blocked=false;try{await service.quote({account_id:'fictional-deleting'},'fictional-case',{reviewed_version:'0'.repeat(64)});}catch(error){blocked=error.code==='MAILING_ORDER_CHANGED';}
  check.ok(blocked,'an account deletion in progress blocks a competing new mailing purchase');
  finishDeletion('removed');check.equal(await deleting,'removed','the guarded deletion awaits its original deletion operation');
  for(const path of ['packet','refund','catalog','cancel'])check.equal((await t.request('POST','/api/mail-ops/internal/'+path,{body:{}})).status,403,'private fulfillment endpoints are unavailable without configured signed authority');
  return {external_provider_calls:0,production_mutations:0,live_charge:false,physical_dispatch:false};
}
module.exports={id:'gv-mailing-internal-boundaries',title:'Explicit internal mailing environment and payment namespace boundaries',run};
