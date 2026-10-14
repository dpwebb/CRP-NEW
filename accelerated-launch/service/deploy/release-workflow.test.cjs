'use strict';
const assert=require('node:assert/strict');
const {classify,baselineValid,manifestValid,plan,frozen,sourceFrozen,contentImpact,acceptance}=require('./release-workflow.cjs');
assert.equal(classify(['README.md']).mode,'OPERATIONS_OR_DOCUMENTATION');
assert.equal(classify(['accelerated-launch/service/ui/styles.css']).mode,'PRESENTATION');
for(const f of ['accelerated-launch/service/issues.cjs','accelerated-launch/adapters/rules.json','consumer-wizard/dist/jurisdiction-data.js','unknown/new.cjs','accelerated-launch/service/tests/sections/a-isolation.cjs'])assert.equal(classify([f]).full_regression_required,true,f);
assert.equal(classify(['accelerated-launch/service/billing.cjs']).billing_journey_required,true);
assert.equal(classify(['accelerated-launch/service/ui/checkout.js']).billing_journey_required,true);
assert.equal(classify(['accelerated-launch/service/payment-history-analysis.cjs']).billing_journey_required,false);
assert.equal(classify(['SOURCE_CAPTURES/PUB-001/report.pdf']).full_regression_required,true);
assert.equal(classify(['accelerated-launch/service/ui/app.js']).full_regression_required,true);
const pass={mode:'FULL_CURRENT_PRODUCT',totals:{passed:1,failed:0,skipped:0},unrun_sections:[],source_drift:[],source_hashes:[{file:'a',sha256:'b'}],sections:[{completed:true,failed:0,skipped:[]}]};
baselineValid(pass);
for(const patch of [{mode:'FOCUSED'},{totals:{failed:1}},{unrun_sections:['x']},{source_drift:['x']},{sections:[{completed:false}]},{sections:[]},{source_hashes:[]}])assert.throws(()=>baselineValid({...pass,...patch}));
console.log('PASS: classification, unknown dependencies and incomplete baseline rejection');
// A structural unit fixture, never a hosted acceptance receipt. No ignored historical file is required.
const predicateIds=[...acceptance.toString().match(/const required=(\[[\s\S]*?\]);/)[1].matchAll(/'([^']+)'/g)].map(m=>m[1]);
const gate={build_id:'crp-v1-'+'a'.repeat(16),passed:true,gates:30,criteria:123,predicates:predicateIds.map(id=>({id,passed:true})),measurement_receipt_sha256:'A'.repeat(64)};
assert.throws(()=>acceptance(gate,gate.build_id),/actual measurement/);
for(const patch of [{build_id:'old'},{passed:false},{gates:29},{criteria:122},{predicates:[{passed:false}]},{measurement_receipt_sha256:null},{predicates:[...gate.predicates.slice(1),gate.predicates[1]]}])assert.throws(()=>acceptance({...gate,...patch},gate.build_id));
console.log('PASS: production rejects wrong build, incomplete or failing gate receipts');
const manifest=require('./release-manifest.json');manifestValid(manifest);
assert.throws(()=>manifestValid({...manifest,total_file_count:manifest.total_file_count-1}));
assert.throws(()=>manifestValid({...manifest,manifest_digest:'A'.repeat(64)}));
const path=require('node:path');
const fs=require('node:fs'),os=require('node:os'),crypto=require('node:crypto');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'crp-workflow-test-')),fixtureRoot=path.join(temp,'repo');fs.mkdirSync(fixtureRoot);
const {execFileSync}=require('node:child_process');
const fixtureGit=args=>execFileSync('git',args,{cwd:fixtureRoot,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
const put=(file,value)=>{const full=path.join(fixtureRoot,file);fs.mkdirSync(path.dirname(full),{recursive:true});fs.writeFileSync(full,value);return full;};
const fixtureHash=file=>crypto.createHash('sha256').update(fs.readFileSync(path.join(fixtureRoot,file))).digest('hex');
fixtureGit(['init']);fixtureGit(['config','user.name','CRP release unit fixture']);fixtureGit(['config','user.email','unit@example.test']);fixtureGit(['config','core.autocrlf','false']);
const file='accelerated-launch/service/issues.cjs',fixtureRunner='accelerated-launch/service/tests/run-tests.cjs',fixtureSection='accelerated-launch/service/tests/sections/one.cjs',fixtureCss='accelerated-launch/service/ui/style.css';
put(file,'module.exports={unit:true};\n');put(fixtureRunner,"const SECTION_FILES = ['one.cjs'];\n");put(fixtureSection,"module.exports={id:'one',run(){}};\n");put(fixtureCss,'body{color:green}\n');
const digest=rows=>crypto.createHash('sha256').update(rows.map(r=>r.file+'\n'+r.sha256+'\n').join('')).digest('hex').toUpperCase();
const fixtureRows=[file,fixtureCss].map(file=>({file,sha256:fixtureHash(file).toUpperCase()}));
const fixtureGroup={id:'SERVED_ASSETS',files:fixtureRows,file_count:fixtureRows.length,digest:digest(fixtureRows)},fixtureManifest={groups:[fixtureGroup],total_file_count:2,manifest_digest:digest([{file:'group:SERVED_ASSETS',sha256:fixtureGroup.digest}])};
put('accelerated-launch/service/deploy/release-manifest.json',JSON.stringify(fixtureManifest));
fixtureGit(['add','.']);fixtureGit(['commit','-m','Complete unit source anchor']);const fixtureCommit=fixtureGit(['rev-parse','HEAD']);
const baseline=path.join(temp,'baseline.json');
const unitBaseline={...pass,sections:[{id:'one',file:'one.cjs',completed:true,passed:1,failed:0,skipped:[]}],source_hashes:[file,fixtureRunner,fixtureSection,fixtureCss,'accelerated-launch/service/deploy/release-manifest.json'].map(file=>({file,sha256:fixtureHash(file)}))};
fs.writeFileSync(baseline,JSON.stringify(unitBaseline));
const p=plan(fixtureCommit,baseline,{root:fixtureRoot});frozen(p);
assert.throws(()=>frozen({...p,changed_files:[...p.changed_files,'__tampered_inventory__']}));
assert.throws(()=>frozen({...p,baseline:{...p.baseline,sha256:'A'.repeat(64)}}));
const source=Object.keys(p.source_snapshot).find(f=>f.endsWith('/issues.cjs'));
assert.throws(()=>frozen({...p,source_snapshot:{...p.source_snapshot,[source]:'A'.repeat(64)}}));
put('release-notes.md','Bookkeeping only\n');sourceFrozen(p);
put(file,'module.exports={unit:false};\n');assert.throws(()=>sourceFrozen(p),/inventory|Source changed/);put(file,'module.exports={unit:true};\n');
put('accelerated-launch/service/ui/checkout.html','<p>USD 9.00</p><button>Pay</button>');
const htmlImpact=contentImpact(fixtureRoot,fixtureCommit,['accelerated-launch/service/ui/checkout.html']);assert.equal(htmlImpact.purchasePresentationFiles.length,1);
put('accelerated-launch/service/ui/new.html','<script>window.changed=true</script>');assert.equal(contentImpact(fixtureRoot,fixtureCommit,['accelerated-launch/service/ui/new.html']).executableHtml.length,1);
for(const markup of ['<a href="java&#x09;script:go()">Link</a>','<iframe src="data:text/html,payload"></iframe>','<script>unclosed','<object data="anything"></object>','<embed src="thing">']){
  put('accelerated-launch/service/ui/new.html',markup);assert.equal(contentImpact(fixtureRoot,fixtureCommit,['accelerated-launch/service/ui/new.html']).executableHtml.length,1);
}
put('accelerated-launch/service/ui/new.html','<p>Text &#999999999999;</p>');assert.doesNotThrow(()=>contentImpact(fixtureRoot,fixtureCommit,['accelerated-launch/service/ui/new.html']));
const canonical=path.join(fixtureRoot,'accelerated-launch/service/out/current-regression-evidence.json');assert.throws(()=>plan(fixtureCommit,canonical,{root:fixtureRoot}),/mutable canonical/);
put(fixtureRunner,"const SECTION_FILES = ['one.cjs','two.cjs'];\n");put('accelerated-launch/service/tests/sections/two.cjs',"module.exports={id:'two',run(){}};\n");
const registryPlan=plan(fixtureCommit,baseline,{root:fixtureRoot});assert.equal(registryPlan.risk.full_regression_required,true);frozen(registryPlan);
put(fixtureRunner,"const SECTION_FILES = ['one.cjs'];\n");
assert.equal(plan(fixtureCommit,baseline,{root:fixtureRoot}).risk.full_regression_required,true); // New executable/purchase markup conservatively requires full.
const {prepareInputs,verifyBinding}=require('./release-workflow.cjs');
const ops={...p,selected_sections:[],risk:{mode:'OPERATIONS_OR_DOCUMENTATION',full_regression_required:false}};
const prepared=prepareInputs(ops);assert.equal(prepared.productReuse,false);verifyBinding(prepared.binding);
for(const key of ['CRP_RELEASE_INPUTS_TEST_MODULE','CRP_RELEASE_WORKFLOW_MODULE']){
  const before=process.env[key];process.env[key]='UNIT_FIXTURE_ONLY';assert.throws(()=>prepareInputs(ops),/alternate test-module/);if(before===undefined)delete process.env[key];else process.env[key]=before;
}
put(fixtureCss,'body{color:black}\n');assert.throws(()=>verifyBinding(prepared.binding),/input changed/);put(fixtureCss,'body{color:green}\n');
const oldOption=process.env.CRP_TOOL_TEST_OPTION;process.env.CRP_TOOL_TEST_OPTION='changed';assert.throws(()=>verifyBinding(prepared.binding),/environment changed/);if(oldOption===undefined)delete process.env.CRP_TOOL_TEST_OPTION;else process.env.CRP_TOOL_TEST_OPTION=oldOption;
assert.throws(()=>prepareInputs({...ops,risk:{mode:'FULL',full_regression_required:true}}),/harness/);
put('accelerated-launch/service/tests/harness.cjs','module.exports={};\n');
const external=path.join(temp,'binary'),profile=path.join(temp,'profile.json');fs.writeFileSync(external,'fictional binary');
fs.writeFileSync(profile,JSON.stringify({schema:1,complete:true,reviewed_by:'UNIT_FIXTURE_ONLY',selected_sections:['one'],files:[],commands:[],external_files:[external]}));
const bound=prepareInputs({...ops,risk:{mode:'FULL',full_regression_required:true}},{profileFile:profile});assert.equal(bound.productReuse,true);verifyBinding(bound.binding);
fs.writeFileSync(profile,JSON.stringify({schema:1,complete:false,reuse_product:false,reviewed_by:'UNIT_FIXTURE_ONLY',selected_sections:['one'],files:[],commands:[],external_files:[]}));
const partial=prepareInputs({...ops,risk:{mode:'FULL',full_regression_required:true}},{profileFile:profile});assert.equal(partial.productReuse,false);verifyBinding(partial.binding);
fs.writeFileSync(profile,JSON.stringify({schema:1,complete:true,reviewed_by:'UNIT_FIXTURE_ONLY',selected_sections:['one'],files:[],commands:[],external_files:[],injected_commands:[{command:'fixture'}]}));
assert.throws(()=>prepareInputs({...ops,risk:{mode:'FULL',full_regression_required:true}},{profileFile:profile}),/require fresh product execution/);
fs.writeFileSync(external,'replacement binary');assert.throws(()=>verifyBinding(bound.binding),/input changed/);
fs.writeFileSync(profile,JSON.stringify({schema:1,complete:true,reviewed_by:'UNIT_FIXTURE_ONLY',selected_sections:['wrong'],files:[],commands:[],external_files:[]}));assert.throws(()=>prepareInputs({...ops,risk:{mode:'FULL',full_regression_required:true}},{profileFile:profile}),/selection/);
console.log('PASS: manifest/baseline custody, bookkeeping continuity and new executable/purchase markup rejection');
console.log('PASS: historical registry binding, canonical receipt protection, prerequisite and fixture/binary/environment reuse guards');
if(!path.resolve(temp).startsWith(path.join(path.resolve(os.tmpdir()),'crp-workflow-test-')))throw Error('Unsafe unit fixture cleanup');
fs.rmSync(temp,{recursive:true,force:true});
// Explicit unit fixtures, never usable as release receipts. Exercise numeric
// FDT gates independently of the broader file/source/hostname custody guard.
const {validateFdtProof}=require('./release-workflow.cjs');
const acceptanceMetrics={implementation_passed:true,recovery_rate:1,incorrect_decisive_facts:0,cross_record_or_bureau_borrowing:0,unsupported_violations:0,missing_expected_violations:0,record_collapse_errors:0,withhold_errors:0,every_miss_accounted:true,freeze_unchanged:true,source_unchanged:true,source_files:[]};
const benchmark={passed:true,baseline:'UNIT_FIXTURE_ONLY',metrics:{missed_fact_rate:0,incorrect_reading_rate:0}};
const raw={acceptance:acceptanceMetrics,benchmark_full:benchmark,local_recovery:{useful_facts:1,useful_attempts:1,unsuccessful_facts:0,unsuccessful_attempts:1,pass_limit:1}};
const fullFixture={sections:[{id:'am-fdt-recovery',completed:true,passed:1,evidence:raw}],source_hashes:[]};
const fixtureBuild='UNIT_FIXTURE_ONLY',fixtureSha='A'.repeat(64);
const recoveryCase=scenario=>({scenario,case_id:'UNIT_FIXTURE_ONLY',input_sha256:'a'.repeat(64),input_page_count:1,upload_status:201,result_status:201,recovery:{bounded:true,substitution_forbidden:true,recovery_attempts:1,facts_added:scenario==='USEFUL'?[{page:1,line:1,source:'LOCAL_OCR'}]:[]},reading_limitations:{incomplete:true,never_equates_unread_with_absence:true}});
const gateFixture={acceptance:acceptanceMetrics,benchmark:{...benchmark.metrics,baseline:benchmark.baseline},implementation:{configured:true,source_files:[],evidence_refs:[{sha256:fixtureSha}]},served_recovery:{identity:{build_id:fixtureBuild,served_build_id:fixtureBuild},recovery_cases:[recoveryCase('USEFUL'),recoveryCase('UNSUCCESSFUL')]}};
const sourceRoot=path.resolve(__dirname,'../../..');
assert.doesNotThrow(()=>validateFdtProof(gateFixture,fullFixture,sourceRoot,fixtureSha,fixtureBuild));
for(const corrupt of [
  (g,f)=>{g.acceptance.recovery_rate=f.sections[0].evidence.acceptance.recovery_rate=0.2;},
  (g,f)=>{g.benchmark.missed_fact_rate=f.sections[0].evidence.benchmark_full.metrics.missed_fact_rate=0.5;},
  (g,f)=>{g.acceptance.recovered=123;},
  (g,f)=>{g.served_recovery=null;},
  (g,f)=>{g.implementation.evidence_refs[0].sha256='0'.repeat(64);}
]) {
  const g=structuredClone(gateFixture),f=structuredClone(fullFixture);corrupt(g,f);
  assert.throws(()=>validateFdtProof(g,f,sourceRoot,fixtureSha,fixtureBuild));
}
console.log('PASS: FDT numeric thresholds, raw-receipt mismatch and missing hosted/custody proof rejection');
(async()=>{
  const originalFetch=global.fetch;let requests=0;global.fetch=async()=>{requests++;throw Error('UNIT_FIXTURE_ONLY refuses network');};
  try{await assert.rejects(()=>require('./release-workflow.cjs').smoke('https://fictional.invalid','crp-v1-'+'0'.repeat(16),manifest,'UNIT_FIXTURE_ONLY'),/artifact manifest/);assert.equal(requests,0);console.log('PASS: mismatched smoke artifact/build rejected before any hosted request');}
  finally{global.fetch=originalFetch;}
})().catch(error=>{console.error(error);process.exitCode=1;});
