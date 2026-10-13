'use strict';
const assert=require('node:assert/strict');
const {classify,baselineValid,manifestValid,plan,frozen,acceptance}=require('./release-workflow.cjs');
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
const gate=require('../../../SOURCE_CAPTURES/REPORTING-PERIOD-RELEASE-2026-10-11/staging-gate-summary.json');
assert.throws(()=>acceptance(gate,gate.build_id),/actual measurement/);
for(const patch of [{build_id:'old'},{passed:false},{gates:29},{criteria:122},{predicates:[{passed:false}]},{measurement_receipt_sha256:null},{predicates:[...gate.predicates.slice(1),gate.predicates[1]]}])assert.throws(()=>acceptance({...gate,...patch},gate.build_id));
console.log('PASS: production rejects wrong build, incomplete or failing gate receipts');
const manifest=require('./release-manifest.json');manifestValid(manifest);
assert.throws(()=>manifestValid({...manifest,total_file_count:manifest.total_file_count-1}));
assert.throws(()=>manifestValid({...manifest,manifest_digest:'A'.repeat(64)}));
const path=require('node:path');
const fs=require('node:fs'),os=require('node:os'),crypto=require('node:crypto');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'crp-workflow-test-'));
const baseline=path.join(temp,'baseline.json');
const file='accelerated-launch/service/issues.cjs';
fs.writeFileSync(baseline,JSON.stringify({...pass,source_hashes:[{file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.resolve(__dirname,'../../..',file))).digest('hex')}]}));
const p=plan('HEAD',baseline);frozen(p);
assert.throws(()=>frozen({...p,changed_files:[...p.changed_files,'__tampered_inventory__']}));
assert.throws(()=>frozen({...p,baseline:{...p.baseline,sha256:'A'.repeat(64)}}));
const source=Object.keys(p.source_snapshot).find(f=>f.endsWith('/issues.cjs'));
assert.throws(()=>frozen({...p,source_snapshot:{...p.source_snapshot,[source]:'A'.repeat(64)}}));
console.log('PASS: manifest integrity, dependency drift, receipt tampering and changed-file inventory rejection');
fs.unlinkSync(baseline);fs.rmdirSync(temp);
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
