'use strict';
// Read-only payment history for an owned report. A return URL never grants access.
const cases=require('./cases.cjs');
const codes=['report_once','monthly','annual'];
function forCase(store,actor,caseId){
 cases.requireOwnedCase(store,actor,caseId);
 const state=store.state();
 return Object.fromEntries(codes.map(code=>{
  const rows=(state.checkout_sessions||[]).filter(c=>c.account_id===actor.account_id&&c.plan_code===code&&
   (code==='report_once'?c.case_id===caseId:!c.case_id||c.case_id===caseId));
  if(rows.length!==1)return [code,{status:rows.length?'AMBIGUOUS':'NONE'}];
  const row=rows[0],intent=row.verified_payment_intent;
  const paid=row.state==='COMPLETED'&&Number.isSafeInteger(row.verified_paid_cents)&&row.verified_paid_cents>0&&
   ['cad','usd','aud','gbp'].includes(row.currency)&&typeof intent==='string'&&intent.length>0;
  if(paid){
   const events=(state.billing_events||[]).filter(e=>e.account_id===actor.account_id&&e.outcome==='APPLIED'&&
    e.effect==='REVOKE'&&e.payment_intent===intent&&e.currency===row.currency);
   if(events.some(e=>e.type==='charge.dispute.created'))return [code,{status:'REVERSED'}];
   const refunded=Math.max(0,...events.filter(e=>e.type==='charge.refunded'&&Number.isSafeInteger(e.refunded_cents)&&
    e.refunded_cents>=0&&e.refunded_cents<=row.verified_paid_cents).map(e=>e.refunded_cents));
   if(refunded===row.verified_paid_cents)return [code,{status:'REFUNDED',amount_cents:row.verified_paid_cents,refunded_cents:refunded,currency:row.currency}];
   const reversed=(state.upgrade_credits||[]).some(c=>c.account_id===actor.account_id&&c.verified_payment===true&&
    c.payment_intent===intent&&c.source_plan_code===code&&c.currency===row.currency&&(c.refunded||c.disputed));
   return [code,{status:reversed?'REVERSED':'PAID'}];
  }
  return [code,{status:['OPEN','OPENING','CREDIT_REVOKED'].includes(row.state)?'PENDING':
   ['CANCELLED','EXPIRED','FAILED'].includes(row.state)?'CANCELLED':'UNAVAILABLE'}];
 }));
}
module.exports={forCase};
