'use strict';
// Deployment-only path portability. Keep the shipped shared validator and the
// original evidence bytes untouched in preserved/older source checkouts.
const shared=require('../evidence-validator.cjs');
const portable=value=>typeof value==='string'?value.replace(/\\/g,'/'):value;
function normalizeEvidence(evidence){
  if(!evidence || typeof evidence!=='object' || Array.isArray(evidence))return evidence;
  const result={...evidence};
  if(evidence.criteria && typeof evidence.criteria==='object' && !Array.isArray(evidence.criteria))result.criteria=Object.fromEntries(Object.entries(evidence.criteria).map(([key,row])=>[key,row && typeof row==='object'?{...row,...(Array.isArray(row.evidence_refs)?{evidence_refs:row.evidence_refs.map(portable)}:{})}:row]));
  if(evidence.implementation && typeof evidence.implementation==='object'){
    result.implementation={...evidence.implementation};
    for(const key of ['source_files','evidence_refs'])if(Array.isArray(evidence.implementation[key]))result.implementation[key]=evidence.implementation[key].map(row=>row && typeof row==='object'?{...row,file:portable(row.file)}:row);
  }
  return result;
}
module.exports={...shared,normalizeEvidence,
  validateCapabilityStatus:(evidence,options)=>shared.validateCapabilityStatus(normalizeEvidence(evidence),options),
  validateCapabilityEvidence:(evidence,options)=>shared.validateCapabilityEvidence(normalizeEvidence(evidence),options),
  validateImplementationEvidence:(evidence,options)=>shared.validateImplementationEvidence(normalizeEvidence(evidence),options),
  referenceResolves:(ref,root)=>shared.referenceResolves(portable(ref),root),
  referenceBinds:(ref,root,build)=>shared.referenceBinds(portable(ref),root,build)};
