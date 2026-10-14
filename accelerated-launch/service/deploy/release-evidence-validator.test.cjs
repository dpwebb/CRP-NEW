'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const validator=require('./release-evidence-validator.cjs');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'crp-release-path-unit-')),build='UNIT_FIXTURE_ONLY',nested=path.join(root,'nested');fs.mkdirSync(nested);
try{
  const file=path.join(nested,'proof.json');fs.writeFileSync(file,JSON.stringify({build_id:build,scope:'UNIT_FIXTURE_ONLY'}));
  const hash=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  const evidence={passed:true,identity:{build_id:build,served_build_id:build},tests:[{passed:true}],criteria:{journey:{passed:true,expected:'UNIT_FIXTURE_ONLY',measured:'UNIT_FIXTURE_ONLY',evidence_refs:['nested\\proof.json']}},implementation:{configured:true,source_files:[{file:'nested\\proof.json',sha256:hash}],evidence_refs:[{file:'nested\\proof.json',sha256:hash}],tests:[{id:'UNIT_FIXTURE_ONLY',passed:true,expected:'UNIT_FIXTURE_ONLY',measured:'UNIT_FIXTURE_ONLY',criteria:['journey']}]}};
  const before=JSON.stringify(evidence),normalized=validator.normalizeEvidence(evidence);
  assert.equal(normalized.criteria.journey.evidence_refs[0],'nested/proof.json');assert.equal(normalized.implementation.source_files[0].file,'nested/proof.json');assert.equal(normalized.implementation.evidence_refs[0].file,'nested/proof.json');
  assert.equal(validator.validateCapabilityStatus(evidence,{targetBuildId:build,baseDir:root,sourceRoot:root,requiredCriteria:['journey']}).passed,true);
  assert.equal(validator.validateImplementationEvidence(evidence,{sourceRoot:root,requiredCriteria:['journey']}).passed,true);assert.equal(JSON.stringify(evidence),before);
  assert.equal(validator.referenceResolves('nested\\proof.json',root),true);assert.equal(validator.referenceBinds('nested\\proof.json',root,build),true);
  assert.equal(validator.validateCapabilityStatus(evidence,{targetBuildId:'wrong',baseDir:root,requiredCriteria:['journey']}).passed,false);
  assert.equal(validator.validateCapabilityStatus({...evidence,staging_verification:{status:'PENDING'}},{targetBuildId:build,baseDir:root,sourceRoot:root,requiredCriteria:['journey']}).passed,false);
  fs.writeFileSync(file,'changed');assert.equal(validator.validateImplementationEvidence(evidence,{sourceRoot:root,requiredCriteria:['journey']}).passed,false);assert.equal(validator.validateCapabilityStatus(evidence,{targetBuildId:build,baseDir:root,requiredCriteria:['journey']}).passed,false);
  console.log('PASS: 12 deployment path-portability checks; raw/shared runtime preserved, wrong identity/pending/missing proof refused');
}finally{if(!root.startsWith(path.join(os.tmpdir(),'crp-release-path-unit-')))throw Error('Unsafe fixture cleanup');fs.rmSync(root,{recursive:true,force:true});}
