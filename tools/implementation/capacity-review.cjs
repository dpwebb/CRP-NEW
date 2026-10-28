'use strict';
// Evaluate an explicitly supplied local measurement. Does not generate demand,
// contact any host, authorize spending or reinterpret an earlier failed tier.
function capacityReview(r,contract){
 const reasons=[],required=contract.requiredWorkloads,integrity=contract.requiredChecks;
 const valid=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
 if(r?.environment!=='local'||r?.fictional!==true)reasons.push('LOCAL_FICTIONAL_INPUT_REQUIRED');
 if(!valid(r?.durationMs)||r.durationMs<contract.proposedDurationMinutes*60000)reasons.push('MIXED_SOAK_INCOMPLETE');
 if(r?.staffSessions!==contract.staffSessions)reasons.push('TWO_STAFF_SESSIONS_REQUIRED');
 for(const name of required)if(!Number.isSafeInteger(r?.workloads?.[name])||r.workloads[name]<1)reasons.push('WORKLOAD_MISSING:'+name);
 for(const name of integrity)if(r?.integrity?.[name]!==true)reasons.push('INTEGRITY_UNPROVEN:'+name);
 const limits=contract.proposedThresholds;
 for(const [name,limit]of Object.entries(limits))if(!valid(r?.metrics?.[name])||r.metrics[name]>limit)reasons.push('METRIC_FAILED_OR_MISSING:'+name);
 if(!Number.isSafeInteger(r?.intentional503)||r.intentional503<0)reasons.push('ADMISSION_REFUSALS_UNACCOUNTED');
 return {localEnvelopeAccepted:reasons.length===0,reasons,proposedTargets:true,hostedCapacityVerified:false,customerSla:false};
}
module.exports={capacityReview};
