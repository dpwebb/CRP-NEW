'use strict';
const crypto=require('node:crypto');
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
function campaignDecision(claims,{country,offer,channel,copy}) {
 const m=claims.markets.find(m=>m.country===country),o=m?.offers.find(o=>o.offer===offer),c=m?.channels.find(c=>c.channel===channel);
 const supported=["assessment_once","subscription","mailing","affiliate_promotion"].includes(offer);
 const hash=typeof copy==='string'?sha(copy):null;
 const current=x=>x?.decision==='CLEARED'&&typeof x.reviewer==='string'&&x.reviewer.trim()&&typeof x.evidence==='string'&&x.evidence.trim()&&Number.isFinite(Date.parse(x.reviewedAt));
 const blocked=claims.prohibitedClaims.some(x=>typeof copy==='string'&&copy.toLowerCase().includes(x.toLowerCase()));
 return {eligibleForReview:supported&&!blocked,cleared:!!(supported&&!blocked&&current(o)&&current(c)&&c.approvedCopyHash===hash),activationAuthorized:false,
  reasons:[...(!m?['MARKET_UNSUPPORTED']:[]),...(!supported?['OFFER_UNSUPPORTED']:[]),...(blocked?['PROHIBITED_CLAIM']:[]),...(!current(o)?['OFFER_DECISION_REQUIRED']:[]),...(!current(c)?['CHANNEL_DECISION_REQUIRED']:[]),...(c?.approvedCopyHash!==hash?['EXACT_COPY_REVIEW_REQUIRED']:[])],copyHash:hash};
}
function validateProgram(p) {
 const ids=new Set(p.items.map(i=>i.id));
 if(p.version!==1||ids.size!==13||p.items.length!==13)throw Error('INVALID_PROGRAM');
 for(const i of p.items)if(!i.owner||!i.nextAction||i.dependencies.some(d=>!ids.has(d)||d===i.id)||i.deployment!=='NOT_AUTHORIZED')throw Error('INVALID_ITEM');
 const visiting=new Set(),done=new Set();
 function visit(id){if(visiting.has(id))throw Error('CYCLIC_DEPENDENCY');if(done.has(id))return;visiting.add(id);p.items.find(i=>i.id===id).dependencies.forEach(visit);visiting.delete(id);done.add(id);}
 ids.forEach(visit);return {valid:true,items:ids.size,deploymentAuthorized:false};
}
module.exports={campaignDecision,validateProgram,sha};

