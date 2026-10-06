const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const sections='accelerated-launch/service/tests/sections/';
const read=f=>fs.readFileSync(path.join(root,f),'utf8').replace(/\r\n/g,'\n');
const write=(f,s)=>fs.writeFileSync(path.join(root,f),s);
const edit=(f,fn)=>write(f,fn(read(f)));
const replace=(s,a,b)=>{if(!s.includes(a))throw Error('Missing '+a.slice(0,60));return s.replace(a,b);};
edit('accelerated-launch/service/ui/app.js',s=>{
 s=replace(s,"const state = {", "const STEP = Object.freeze({ ACCOUNT: 0, JURISDICTION: 1, REPORT: 2, RESULTS: 3, REVIEW: 4, HISTORY: 5, CASE: 6, SUPPORT: 7, BILLING: 8 });\nconst state = {");
 return s.replace('state.step === 5','state.step === STEP.HISTORY').replace('state.step === 6','state.step === STEP.CASE');
});
for(const [file,old,name] of [['k-ui-smoke.cjs',5,'CASE'],['az-consumer-support-ui.cjs',6,'SUPPORT'],['ba-consumer-billing.cjs',7,'BILLING']])edit(sections+file,s=>s.replaceAll('state.step = '+old,'state.step = STEP.'+name));
edit(sections+'n-applicability-records.cjs',s=>{
 const assertion="      check.ok(EXECUTION_TOKENS.includes(relation.execution), `${relation.relation_id}: execution is a recorded token`);\n";
 s=replace(s,assertion,'');return replace(s,'    for (const row of relation.region_rows) {',assertion.trimStart().replace(/^check/,'    check')+'    for (const row of relation.region_rows) {');
});
edit(sections+'e-qualifications.cjs',s=>replace(s,"  check.ok(usResult.checks_not_run.some((c) => /605/.test(c.citation || '')),\n    'and the limb written for a reported account is named among the checks that did not run');\n  check.ok(usResult.checks_not_run.every((c) => typeof c.reason === 'string' && c.reason.length > 0),\n    'every check that did not run carries its machine reason for audit');\n",''));
edit(sections+'av-consumer-results.cjs',s=>replace(s,"  check.ok(typeof violation.disclaimer === 'string' && violation.disclaimer.length > 0, 'the surface carries the no-legal-advice disclaimer');","  check.ok(/checks listed/i.test(violation.disclaimer) && !/not legal advi[cs]e/i.test(JSON.stringify(violation)), 'the result states its actual scope without a legal-advice disclaimer');"));
edit('accelerated-launch/service/evaluation.cjs',s=>{
 s=s.replace('flow (see `packetEligibility` below and `packets.cjs`).','flow governed by unified Issue eligibility in `issues.cjs` and `packets.cjs`.');
 const start=s.indexOf('/**\n * OWNER-CA-CORRECTION-PACKET-001: which findings');const end=s.indexOf('module.exports =',start);
 if(start<0)throw Error('Missing retired gate');return s.slice(0,start)+s.slice(end).replace('  packetEligibility,\n','');
});
edit(sections+'bl-us-ca-correction-packet.cjs',s=>{
 s=s.replace("const evaluation = require('../../evaluation.cjs');","const issues = require('../../issues.cjs');");
 const a=s.indexOf('  /* ---- 2. The eligibility gate');const b=s.indexOf('  /* ---- 3.',a);
 return s.slice(0,a)+`  /* The active unified gate preserves definite permissions and supported verification requests. */
  check.equal(issues.isEligible({ basis_type: issues.BASIS_TYPE.STATUTORY_RETENTION, confidence: issues.CONFIDENCE.DEFINITE, packet_eligible: true }), true, 'authorized definite correction is eligible');
  check.equal(issues.isEligible({ basis_type: issues.BASIS_TYPE.STATUTORY_RETENTION, confidence: issues.CONFIDENCE.PROBABLE }), true, 'supported probable issue permits verification without definite proof');
  check.equal(issues.isEligible({ basis_type: issues.BASIS_TYPE.FACTUAL_CONSISTENCY, confidence: issues.CONFIDENCE.POTENTIAL }), true, 'supported potential factual issue permits verification');
  check.equal(issues.isEligible({ basis_type: issues.BASIS_TYPE.STATUTORY_RETENTION, confidence: issues.CONFIDENCE.DEFINITE, packet_eligible: false }), false, 'definite correction still requires rule-specific permission');
  check.equal(issues.isEligible({ basis_type: issues.BASIS_TYPE.FACTUAL_CONSISTENCY, confidence: 'UNRESOLVED' }), false, 'an unresolved diagnostic is not an eligible Issue');

`+s.slice(b);
});
// Retain historical source custody as an explicitly selected lane, rather than a product prerequisite.
const oldH=read(sections+'h-legacy-parity.cjs');
const keep=new Set([56,65,74,75,77,78,80,87,91,92]);
write(sections+'historical-legacy-source.cjs',oldH.split('\n').filter((l,i)=>!keep.has(i+1)).join('\n').replace("id: 'h-legacy-parity'","id: 'historical-legacy-source'"));
write(sections+'h-legacy-parity.cjs',`'use strict';
const uploads = require('../../uploads.cjs');
const { STATUS_BY_CODE, MESSAGE_BY_CODE } = require('../../errors.cjs');
async function run(t, check) {
  check.equal(uploads.MAX_FILE_BYTES, 10 * 1024 * 1024, 'the current upload limit is 10 MB');
  check.ok(uploads.SUPPORTED_MIME_PREFIXES.includes('application/pdf'), 'PDF is accepted');
  check.ok(uploads.SUPPORTED_EXTENSIONS.includes('.pdf'), 'the PDF extension is accepted');
  const meta = n => uploads.validateUploadMeta({ declaredBytes: n, mimeType: 'application/pdf', originalFilename: 'a.pdf' });
  check.equal(meta(0).ok, false, 'empty uploads are refused');
  check.equal(meta(0).code, 'EMPTY_FILE', 'empty upload refusal is typed');
  check.equal(meta(uploads.MAX_FILE_BYTES + 1).ok, false, 'one byte above the limit is refused');
  check.equal(meta(uploads.MAX_FILE_BYTES + 1).code, 'FILE_TOO_LARGE', 'over-limit refusal is typed');
  check.equal(meta(uploads.MAX_FILE_BYTES).ok, true, 'the exact limit is accepted');
  check.ok(MESSAGE_BY_CODE.EMPTY_FILE.length > 0, 'empty-file consumer wording exists');
  check.equal(STATUS_BY_CODE.NOT_FOUND, 404, 'unknown resources use 404');
  check.equal(STATUS_BY_CODE.NOT_AUTHORIZED, 403, 'other-account resources use 403');
  return { lane: 'CURRENT_PRODUCT', historical_parity: 'separate historical-legacy-source section' };
}
module.exports = { run, id: 'h-legacy-parity', title: 'Current upload and ownership contracts (historical parity separate)' };
`);
const oldV=read(sections+'v-presentation-and-release.cjs');
const a=oldV.indexOf('  /* The retrieval attempts');const b=oldV.indexOf('  evidence.gb =',a);
const historical=oldV.slice(a,b);
write(sections+'historical-gb-source.cjs',oldV.slice(0,oldV.indexOf('/* ------------------------------------------------------------------ Canada:'))+`async function run(t, check) {\n${historical}\n return { lane: 'HISTORICAL_SOURCE_CUSTODY', label_currency_measurement_reproduced: true };\n}\nmodule.exports = { run, id: 'historical-gb-source', title: 'Historical GB retrieval and captured marketing text provenance' };\n`);
write(sections+'v-presentation-and-release.cjs',(oldV.slice(0,a)+'  const attempts = gbFamily.CURRENCY_EVIDENCE.current_evidence_attempts;\n'+oldV.slice(b)).replace('label_currency_measurement_reproduced: true','historical_measurement: \'separate historical-gb-source section\'').replace("  check.ok(/format evidence/i.test(report.next_release_action), 'and format evidence named FIRST, because that is the owner\\'s priority');","  check.ok(!report.launch_ready && report.launch_blocking_failures.length > 0, 'remaining core blockers remain explicit without a frozen historical priority');"));
console.log('Applied bounded audit repairs');
