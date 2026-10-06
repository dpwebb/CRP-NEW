'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const validator=require('../../evidence-validator.cjs');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
async function run(t,check){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'crp-closure-'));
 try{
  fs.writeFileSync(path.join(root,'runtime.cjs'),'module.exports=true;');
  fs.writeFileSync(path.join(root,'behavior.json'),JSON.stringify({executed:true,passed:true}));
  const e={passed:false,implementation:{configured:true,source_files:[{file:'runtime.cjs',sha256:hash(fs.readFileSync(path.join(root,'runtime.cjs')))}],evidence_refs:[{file:'behavior.json',sha256:hash(fs.readFileSync(path.join(root,'behavior.json')))}],tests:[{id:'behavior',passed:true,criteria:['behavior'],expected:null,measured:null}]}};
  const opts={sourceRoot:root,baseDir:root,requiredCriteria:['behavior','end_to_end_journey'],targetBuildId:'current'};
  const status=validator.validateCapabilityStatus(e,opts);
  check.equal(status.implementation_status,'IMPLEMENTED_AND_TESTED','local behavioral tests close implementation without served identity');
  check.equal(status.staging_status,'PENDING_VERIFICATION','implementation closure never implies staging proof');
  check.equal(status.passed,false,'pending staging cannot clear production gate');
  fs.writeFileSync(path.join(root,'staging.json'),JSON.stringify({identity:{build_id:'current',served_build_id:'current'}}));
  const staged={passed:true,identity:{build_id:'current',served_build_id:'current'},criteria:{behavior:{passed:true,expected:'works',measured:'works',evidence_refs:['staging.json']},end_to_end_journey:{passed:true,expected:'works',measured:'works',evidence_refs:['staging.json']}},tests:[{id:'served-behavior',passed:true}]};
  check.equal(validator.validateCapabilityStatus(staged,opts).implementation_status,'IMPLEMENTED_AND_TESTED','legacy current-release behavioral acceptance also earns implementation credit');
  check.equal(validator.validateCapabilityStatus(staged,opts).staging_status,'VERIFIED_ON_STAGING','actual staged evidence retains verified status');
  /* OWNER-CLOSURE-001 accounting regression: an explicitly recorded pending staging boundary (a journey whose
     purchased download measured a non-200) must keep staging PENDING and the production gate unresolved, even
     when earlier evidence fields (passed=true, criteria) report a pass — and it must NOT erase implementation
     closure earned by the implementation object. */
  const pending={passed:true,identity:{build_id:'current',served_build_id:'current'},implementation:{configured:true,source_files:[{file:'runtime.cjs',sha256:hash(fs.readFileSync(path.join(root,'runtime.cjs')))}],evidence_refs:[{file:'behavior.json',sha256:hash(fs.readFileSync(path.join(root,'behavior.json')))}],tests:[{id:'behavior',passed:true,criteria:['behavior'],expected:'works',measured:'works'}]},staging_verification:{status:'PENDING',reason:'purchased download measured HTTP 402',download_status:402},criteria:{behavior:{passed:true,expected:'works',measured:'works',evidence_refs:['staging.json']},end_to_end_journey:{passed:true,expected:'works',measured:'works',evidence_refs:['staging.json']}},tests:[{id:'served-behavior',passed:true}]};
  const pendingStatus=validator.validateCapabilityStatus(pending,opts);
  check.equal(pendingStatus.implementation_status,'IMPLEMENTED_AND_TESTED','a pending staging boundary does not erase implementation closure');
  check.equal(pendingStatus.staging_status,'PENDING_VERIFICATION','an explicitly pending staging boundary stays pending, never verified');
  check.equal(pendingStatus.passed,false,'an explicitly pending staging boundary leaves the production gate unresolved');
  check.equal(validator.validateImplementationEvidence({implementation:{configured:true}},opts).passed,false,'configuration alone cannot close implementation');
  const failed=structuredClone(e);failed.implementation.tests[0].passed=false;
  check.equal(validator.validateImplementationEvidence(failed,opts).passed,false,'failed functional tests block closure');
  check.equal(validator.validateImplementationEvidence(e,{...opts,requiredCriteria:['another_behavior']}).passed,false,'uncovered functional requirement blocks closure');
  const missing=structuredClone(e);missing.implementation.evidence_refs[0].file='missing.json';
  check.equal(validator.validateImplementationEvidence(missing,opts).passed,false,'absent behavioral evidence blocks closure');
  fs.writeFileSync(path.join(root,'runtime.cjs'),'module.exports=false;');
  check.equal(validator.validateImplementationEvidence(e,opts).passed,false,'changed relevant source reopens implementation');
 }finally{if(!path.resolve(root).startsWith(path.resolve(os.tmpdir())+path.sep+'crp-closure-'))throw new Error('Unexpected cleanup target');fs.rmSync(root,{recursive:true,force:true});}
 return {closure_policy:'OWNER-CLOSURE-001'};
}
module.exports={run,id:'au-closure-policy',title:'Implementation closure and staging verification are separate'};
