'use strict';
const assert = require('node:assert/strict');
const {upgradeQuote,WINDOW_MS} = require('../upgrade-credit.cjs');
const purchase={account_id:'a',payment_id:'paid_1',verified_payment:true,plan_code:'report_once',currency:'cad',
  amount_cents:595,status:'paid',paid_at:'2026-10-01T12:00:00.000Z'};
const base={accountId:'a',purchase,targetPlan:'monthly',now:'2026-10-02T12:00:00.000Z'};
assert.equal(upgradeQuote(base).first_invoice_cents,200);
assert.equal(upgradeQuote(base).renewal_cents,795);
assert.equal(upgradeQuote({...base,targetPlan:'annual'}).first_invoice_cents,7355);
assert.equal(upgradeQuote({...base,targetPlan:'annual'}).renewal_cents,7950);
const expiry=Date.parse(purchase.paid_at)+WINDOW_MS;
assert.equal(upgradeQuote({...base,now:new Date(expiry-1).toISOString()}).eligible,true);
assert.equal(upgradeQuote({...base,now:new Date(expiry).toISOString()}).eligible,false);
for(const patch of [{account_id:'b'},{verified_payment:false},{currency:'usd'},{amount_cents:1},
  {refunded:true},{disputed:true},{credit_redeemed:true},{status:'pending'},{payment_id:null},{paid_at:'invalid'}])
  assert.equal(upgradeQuote({...base,purchase:{...purchase,...patch}}).credit_cents,0);
assert.equal(upgradeQuote({...base,now:'2026-09-01T00:00:00Z'}).eligible,false);
assert.throws(()=>upgradeQuote({...base,targetPlan:'report_once'}));
console.log('PASS: CAD pricing, first-invoice credit, renewals unchanged, expiry and ownership/payment/refund/reuse refusals');
