'use strict';
const {execFileSync}=require('node:child_process');
const {policy,fictionalEnabled}=require('../fixture-policy.cjs');
async function run(t,check){
  check.equal(fictionalEnabled([]),true,'ordinary governed verification defaults to the authorized fictional profile');
  check.equal(fictionalEnabled(['--fictional-regression']),true,'explicit fictional profile stays fictional');
  check.equal(fictionalEnabled(['--captured-regression']),false,'preserved captured audit is a distinct explicit mode');
  check.deepEqual(require('../fictional-regression.cjs').ids.slice().sort(),policy.generated_private_specimen_substitutes.slice().sort(),'every declared private-specimen replacement has its own executed adapter');
  const result=JSON.parse(execFileSync(process.execPath,['-e',`const fs=require('fs'),original=fs.readFileSync;fs.readFileSync=function(file,...args){if(String(file).replace(/\\\\/g,'/').endsWith('/report_representation_register.json'))throw Error('Private register fallback was reached');return original.call(this,file,...args)};const h=require('./accelerated-launch/service/tests/harness.cjs');console.log(JSON.stringify(h.readPinnedSpecimen()));`],{cwd:require('../harness.cjs').REPOSITORY_ROOT,encoding:'utf8'}));
  check.equal(result.available,false,'fictional mode refuses private specimen access before even opening its pointer register');
  check.equal(result.reason,'PRIVATE_CAPTURE_EXCLUDED_BY_OWNER_FICTIONAL_REGRESSION','private refusal is explicit rather than silently supplying a substitute digest');
  check.equal(result.bytes,undefined,'excluded private specimen returns no bytes');
  check.equal(result.sha256,undefined,'excluded private specimen makes no digest claim');
  const wrong=require('../fictional-regression.cjs').wrongChannelFile(t);
  check.ok(wrong.startsWith(t.dataDir),'unknown-origin screening source is replaced inside the owned generated fixture directory');
  check.equal(policy.production_admission_changed,false,'fictional testing changes no production presentation admission');
  return{fixture_policy:policy.id,fixture_class:'GENERATED_POLICY_BOUNDARY_TEST',private_register_opened:false,original_private_capture_certified:false};
}
module.exports={id:'hd-fictional-fixture-policy',title:'Fictional fixture provenance and private-input exclusion',run};
