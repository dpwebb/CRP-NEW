'use strict';
// Offline preparation contracts only. None can authorize a job, payment or dispatch.
const digest=s=>typeof s==='string'&&/^[a-f0-9]{64}$/i.test(s);
function reserve({availableBytes,requiredWorkingBytes,reserveBytes}){
  const values=[availableBytes,requiredWorkingBytes,reserveBytes];
  if(values.some(n=>!Number.isSafeInteger(n)||n<0)||!Number.isSafeInteger(requiredWorkingBytes+reserveBytes))return {admitted:false,reason:'INVALID_CAPACITY_INPUT'};
  return {admitted:availableBytes>=requiredWorkingBytes+reserveBytes,reason:availableBytes>=requiredWorkingBytes+reserveBytes?'CAPACITY_ACCEPTED':'RESERVE_INSUFFICIENT',sideEffects:false};
}
function recoveryIndex(targets,receipts){
  return targets.map(t=>{if(['app','build','generation'].some(k=>typeof t[k]!=='string'||!t[k].trim()))return {app:t.app||null,gaps:['TARGET_BINDING_MISSING'],receipt:null};const r=receipts.find(r=>r.app===t.app&&r.build===t.build&&r.generation===t.generation);const gaps=[];
    if(!r)gaps.push('MATCHING_RECOVERY_RECEIPT_MISSING');
    else {for(const [field,code]of [['encrypted','ENCRYPTION_UNVERIFIED'],['ownerKeyCustody','OWNER_KEY_CUSTODY_UNVERIFIED'],['independentReadback','INDEPENDENT_READBACK_UNVERIFIED'],['isolatedRestore','ISOLATED_RESTORE_UNVERIFIED']])if(r[field]!==true)gaps.push(code);if(!r.receipt)gaps.push('RECEIPT_REFERENCE_MISSING');if(r.destination==='whelastic')gaps.push('RETIRED_DESTINATION');if(r.scheduledWitness!==true)gaps.push('SCHEDULED_WITNESS_MISSING');}
    return {app:t.app,gaps,receipt:r?.receipt||null};});
}
function alertAcknowledgement(event){
  const gaps=[];if(!event.incidentRef)gaps.push('INCIDENT_REFERENCE_MISSING');if(!event.deliveryReceipt)gaps.push('ARRIVAL_UNVERIFIED');if(!event.acknowledgementReceipt||!event.operatorRef)gaps.push('HUMAN_ACKNOWLEDGEMENT_MISSING');
  return {accepted:gaps.length===0,gaps,relayAcceptanceIsArrival:false,sendPerformed:false};
}
function settlementCandidate(proposal,evidence){
  const gaps=[];
  for(const k of ['partnerRef','destinationRef','currency','amountMinor','proposalHash'])if(typeof proposal[k]!=='string'||!proposal[k]||proposal[k]!==evidence[k])gaps.push('MISMATCH_'+k);
  if(!/^[A-Z]{3}$/.test(evidence.currency||''))gaps.push('INVALID_CURRENCY');
  if(!/^[1-9][0-9]*$/.test(evidence.amountMinor||''))gaps.push('INVALID_AMOUNT');
  if(!digest(evidence.proposalHash)||!digest(evidence.sourceSha256))gaps.push('SOURCE_BINDING_MISSING');
  if(!evidence.transactionRef||!evidence.sourceRef)gaps.push('TRANSACTION_EVIDENCE_MISSING');
  if(evidence.sourceClass==='synthetic')gaps.push('SYNTHETIC_NOT_BANK_EVIDENCE');
  if(evidence.independentlyVerified!==true)gaps.push('INDEPENDENT_VERIFICATION_MISSING');
  if(!evidence.reviewReceipt||!evidence.humanReviewerRef)gaps.push('HUMAN_REVIEW_MISSING');
  return {candidateComplete:gaps.length===0,gaps,settled:false,paymentExecution:false,providerConfigured:false};
}
function fulfillmentEvidence(input){
  const gaps=[];
  if(!digest(input.approvedSha256)||input.packetSha256!==input.approvedSha256||!Number.isSafeInteger(input.approvedVersion)||input.approvedVersion<1||input.approvedVersion!==input.packetVersion)gaps.push('APPROVED_PACKET_DRIFT');
  if(!input.grantRef||!input.recipientRef||!input.addressReviewRef)gaps.push('FULFILLMENT_AUTHORITY_INCOMPLETE');
  if(input.cancelled===true)gaps.push('CANCELLED');
  if(input.duplicateDispatch===true)gaps.push('DUPLICATE_DISPATCH');
  const stages=['submitted','staffAccepted','printed','mailed','delivered','bureauResponse'];let last='unproven';
  for(let n=0;n<stages.length;n++){const stage=stages[n],r=input.evidence?.[stage];if(!r)break;if(!r.receipt||r.packetSha256!==input.approvedSha256||r.packetVersion!==input.approvedVersion){gaps.push('UNBOUND_'+stage);break;}if(['mailed','delivered','bureauResponse'].includes(stage)&&r.independent!==true){gaps.push('INDEPENDENT_'+stage+'_EVIDENCE_MISSING');break;}last=stage;}
  if(gaps.length)last='blocked';
  return {lastProvenStage:last,gaps,dispatchAuthorized:false,dispatchPerformed:false};
}
module.exports={reserve,recoveryIndex,alertAcknowledgement,settlementCandidate,fulfillmentEvidence};
