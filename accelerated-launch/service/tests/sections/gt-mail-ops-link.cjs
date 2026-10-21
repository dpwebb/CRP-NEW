'use strict';
const fs = require('node:fs'), path = require('node:path');
const {configuration}=require('../../mail-ops-link.cjs');
async function run(service,check){
  const base={CRP_MAIL_OPS_MODE:'local-simulation',CRP_DEPLOYMENT_ENV:'local',CRP_PAYMENT_PROVIDER:'test-adapter-not-a-payment',CRP_ALLOW_TEST_PAYMENT_ADAPTER:'1',
    CRP_MAIL_OPS_URL:'http://127.0.0.1:4331',CRP_MAIL_OPS_KEY:'a'.repeat(64),CRP_MAIL_OPS_PAYMENT_KEY:'b'.repeat(64)};
  check.equal(configuration({}).enabled,false,'mailing link is disabled without explicit local configuration');
  check.equal(configuration(base).enabled,true,'explicit local simulation uses separate scoped keys');
  const stage={...base,CRP_MAIL_OPS_MODE:'staging-simulation',CRP_DEPLOYMENT_ENV:'staging',CRP_PAYMENT_PROVIDER:'stripe',STRIPE_SECRET_KEY:'sk_test_fictional',CRP_MAIL_OPS_URL:'http://127.0.0.1:4335'};
  check.equal(configuration(stage).enabled,true,'staging simulation preserves Sandbox subscription billing');
  check.equal(configuration(stage).source,'CRP_STAGING_SIMULATION','staging quotes carry their actual simulation source');
  for(const change of [{CRP_DEPLOYMENT_ENV:'production'},{STRIPE_SECRET_KEY:'sk_live_fictional'},{STRIPE_SECRET_KEY:''},{CRP_MAIL_OPS_URL:'http://127.0.0.1:4331'},{CRP_MAIL_OPS_URL:'https://mail-staging.creditregulatorpro.com'},{CRP_MAIL_OPS_KEY:base.CRP_MAIL_OPS_PAYMENT_KEY}])check.equal(configuration({...stage,...change}).enabled,false,'staging cannot use production/live billing/public transport/reused keys');
  for(const change of [{CRP_DEPLOYMENT_ENV:'production'},{CRP_DEPLOYMENT_ENV:'staging'},{CRP_PAYMENT_PROVIDER:'stripe'},
    {CRP_MAIL_OPS_URL:'https://example.com'},{CRP_MAIL_OPS_URL:'http://localhost:4331'},{CRP_MAIL_OPS_KEY:base.CRP_MAIL_OPS_PAYMENT_KEY}]){
    check.equal(configuration({...base,...change}).enabled,false,'hosted, live-provider, non-literal-loopback and reused-key configurations cannot enable mailing');
  }
  const ui=fs.readFileSync(path.resolve(__dirname,'../../ui/packet-mailing.js'),'utf8');
  check.ok(ui.includes('authorize_mailing:true')&&ui.includes('simulate_payment:true'),'consumer confirmation supplies both explicit simulation choices');
  check.ok(ui.includes('nothing is printed or mailed')&&ui.includes('instruction sheet'),'consumer copy discloses simulation and the non-sendable instruction sheet');
  check.ok(!ui.includes('CRP_MAIL_OPS_KEY')&&!ui.includes('x-mail-signature'),'browser receives no service signing key or HMAC authority');
  return {local_and_staging_simulation:true,external_calls:0,live_payments:false,postal_dispatch:false};
}
module.exports={id:'gt-mail-ops-link',title:'Optional local mailing simulation boundaries',run};
