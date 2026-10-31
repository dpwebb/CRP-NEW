'use strict';
// Pure local evidence evaluator. No HTTP, writes, provider calls or switch changes.
const DEFINITIONS=Object.freeze({
  consumer:{owner:'Consumer custodian',gates:['service','administration','access','recovery','accuracy']},
  family:{owner:'Family/Admin custodian',gates:['service','access','recovery','staffing']},
  partner:{owner:'Partner custodian / human finance owner',gates:['service','access','recovery','attribution','settlement']},
  mail:{owner:'Mail custodian',gates:['service','access','recovery','staffing','alertAcknowledgement','fulfillment']}
});
function evaluate(input,now=Date.now()){
  return Object.entries(DEFINITIONS).map(([app,definition])=>{
    const target=input[app]||{},blockers=[];
    for(const gate of definition.gates){
      const r=target.evidence?.[gate];let reason=null;
      if(!r)reason='MISSING_EVIDENCE';
      else if(typeof target.build!=='string'||!target.build||typeof target.generation!=='string'||!target.generation||r.build!==target.build||r.generation!==target.generation)reason='TARGET_MISMATCH';
      else if(typeof r.receipt!=='string'||!r.receipt.trim())reason='MISSING_RECEIPT';
      else if(!Number.isFinite(Date.parse(r.acceptedAt))||Date.parse(r.acceptedAt)>now)reason='INVALID_ACCEPTANCE_TIME';
      else if(!['generation-bound','expires'].includes(r.freshness)||r.freshness==='expires'&&r.validUntil===undefined)reason='FRESHNESS_POLICY_REQUIRED';
      else if(r.validUntil!==undefined&&(!Number.isFinite(Date.parse(r.validUntil))||Date.parse(r.validUntil)<=now))reason='STALE_EVIDENCE';
      else if(r.passed!==true)reason='NOT_ACCEPTED';
      if(reason)blockers.push({gate,reason,owner:definition.owner,evidence:r?.receipt||null});
    }
    return {app,owner:definition.owner,scope:'local evidence assessment; not deployment approval',acceptedForDeclaredScope:blockers.length===0,blockers};
  });
}
module.exports={DEFINITIONS,evaluate};
if(require.main===module){try{const fs=require('node:fs'),input=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));const result=evaluate(input);process.stdout.write(JSON.stringify(result,null,2)+'\n');if(result.some(r=>!r.acceptedForDeclaredScope))process.exitCode=2;}catch{console.error('READINESS_INPUT_INVALID');process.exitCode=1;}}
