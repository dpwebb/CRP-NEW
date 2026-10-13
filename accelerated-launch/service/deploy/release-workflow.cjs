'use strict';
// Owner-authorized change-aware execution. Historical receipts remain immutable.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {execFileSync, spawn} = require('node:child_process');
const ROOT = path.resolve(__dirname, '../../..');
const normalize = p => p.replace(/\\/g, '/');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const read = p => JSON.parse(fs.readFileSync(p));
const hash = p => sha(fs.readFileSync(p));
const git = args => execFileSync('git', args, {cwd:ROOT, encoding:'utf8', maxBuffer:32*1024*1024}).trim();
function inside(root, name) {
  const p = path.resolve(root, name);
  if (!p.startsWith(root + path.sep)) throw Error('Unsafe relative path: ' + name);
  return p;
}
function write(file, value) {
  fs.mkdirSync(path.dirname(file), {recursive:true});
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', {flag:'wx'});
}
function classify(files) {
  const docs = p => /\.md$/i.test(p);
  const ops = p => p.startsWith('accelerated-launch/service/deploy/') || p === 'accelerated-launch/service/tests/run-tests.cjs';
  const ui = p => p.startsWith('accelerated-launch/service/ui/');
  const executable = files.filter(p => !docs(p) && !ops(p));
  const billing = files.some(p => /billing|entitlement|stripe|purchase|payment-provider|checkout|upgrade-credit/i.test(p) && !docs(p));
  const full = billing || executable.some(p => !ui(p) || /\.(js|cjs)$/.test(p));
  return {mode:full ? 'FULL' : executable.length ? 'PRESENTATION' : 'OPERATIONS_OR_DOCUMENTATION',
    billing_journey_required:billing, full_regression_required:full,
    hosted_journey_required:executable.length > 0,
    reason:full ? 'Shared runtime, test, reader, rule or unknown executable dependency changed' : executable.length ? 'Served presentation changed; consumer, security and browser checks required' : 'No product executable changed'};
}
function baselineValid(receipt) {
  if (receipt.mode !== 'FULL_CURRENT_PRODUCT' || !receipt.totals || !Number.isInteger(receipt.totals.passed) || receipt.totals.passed<1 || receipt.totals.failed!==0 || receipt.totals.skipped!==0 || !Array.isArray(receipt.unrun_sections) || receipt.unrun_sections.length || !Array.isArray(receipt.source_drift) || receipt.source_drift.length || !receipt.sections?.length || !receipt.source_hashes?.length || receipt.sections.some(s => !s.completed || s.failed!==0 || s.section_exception || !Array.isArray(s.skipped) || s.skipped.length)) throw Error('Baseline is not a complete passing full regression');
}
function manifestValid(m) {
  const digest=rows=>{const h=crypto.createHash('sha256');for(const r of rows){h.update(r.file);h.update('\n');h.update(r.sha256);h.update('\n');}return h.digest('hex').toUpperCase();};
  const files=m.groups.flatMap(g=>g.files);
  if(files.length!==m.total_file_count || new Set(files.map(f=>f.file)).size!==files.length || m.groups.some(g=>digest(g.files)!==g.digest) || digest(m.groups.filter(g=>g.files.length).map(g=>({file:'group:'+g.id,sha256:g.digest})))!==m.manifest_digest)throw Error('Invalid release manifest');
  for(const f of files){inside(ROOT,f.file);if(!/^[A-F0-9]{64}$/.test(f.sha256))throw Error('Invalid source hash');}
}
function changed(base) {
  const files = [...new Set([...git(['diff', '--name-only', base, '--']).split(/\r?\n/), ...git(['ls-files','--others','--exclude-standard']).split(/\r?\n/)].filter(Boolean).map(normalize).filter(p=>!p.startsWith('branding/') && !p.startsWith('legal-drafts/')))].sort();
  const manifest = read(path.join(__dirname, 'release-manifest.json'));
  // Include changed/uncommitted shipped bytes even if omitted from Git's diff inventory.
  for (const f of manifest.groups.flatMap(g => g.files)) {
    if (!fs.existsSync(inside(ROOT, f.file)) || hash(inside(ROOT, f.file)) !== f.sha256.toUpperCase()) if (!files.includes(f.file)) files.push(f.file);
  }
  return files.sort();
}
function plan(base, baselineFile) {
  git(['rev-parse', '--verify', base + '^{commit}']);
  const files=changed(base);
  const originalManifest=JSON.parse(git(['show',base+':accelerated-launch/service/deploy/release-manifest.json']));
  const baseline = read(baselineFile); baselineValid(baseline);
  const risk = classify(files);
  const contentDiff=git(['diff','--unified=0',base,'--','accelerated-launch/service/ui/']).split(/\r?\n/).filter(l=>/^[+-][^+-]/.test(l)).join('\n');
  if(/billing|checkout|stripe|entitlement|subscription|payment|plan_code|price_/i.test(contentDiff)) {risk.billing_journey_required=true;risk.full_regression_required=true;risk.mode='FULL';risk.reason='Purchase/entitlement presentation changed';}
  const drift = baseline.source_hashes.filter(s => !fs.existsSync(inside(ROOT, normalize(s.file))) || hash(inside(ROOT, normalize(s.file))) !== s.sha256.toUpperCase()).map(s => normalize(s.file));
  // A runtime/test dependency mismatch always defeats inherited proof. Only this explicit
  // workflow infrastructure and served presentation are eligible for the narrower path.
  const unexplained = drift.filter(p => classify([p]).full_regression_required);
  if (unexplained.length) {risk.mode='FULL';risk.full_regression_required=true;risk.reason='Baseline dependency drift: ' + unexplained.join(', ');}
  const lanes = risk.mode === 'PRESENTATION' ? ['consumer', 'security', 'browser'] : [];
  const sections = baseline.sections.filter(s => /ui|auth|sign|flow|plain-text|landing|branding/i.test(s.id)).map(s => s.id);
  return {schema:1, created_at:new Date().toISOString(), base_commit:git(['rev-parse', base]), git_head:git(['rev-parse', 'HEAD']), changed_files:files.sort(), risk,
    selected_lanes:lanes, selected_sections:risk.mode === 'PRESENTATION' ? sections : [],
    baseline:{file:path.resolve(baselineFile), sha256:hash(baselineFile), build_id:'crp-v1-'+originalManifest.manifest_digest.slice(0,16).toLowerCase(),mode:baseline.mode, totals:baseline.totals, dependency_drift:drift},
    source_snapshot:Object.fromEntries([...new Set([...baseline.source_hashes.map(s => normalize(s.file)), ...read(path.join(__dirname,'release-manifest.json')).groups.flatMap(g=>g.files).map(f=>f.file), ...files])].sort().map(p => [p, fs.existsSync(inside(ROOT,p)) ? hash(inside(ROOT,p)) : null])),
    evidence_policy:'Inherited receipt retains its original build, date and scope. This plan is not a new full regression or hosted acceptance.'};
}
function sourceFrozen(p) {
  if(JSON.stringify(changed(p.base_commit))!==JSON.stringify(p.changed_files))throw Error('Changed-file inventory no longer matches plan');
  for (const [f, expected] of Object.entries(p.source_snapshot)) {
    const actual = fs.existsSync(inside(ROOT,f)) ? hash(inside(ROOT,f)) : null;
    if (actual !== expected) throw Error('Source changed after planning: ' + f);
  }
}
function frozen(p) {
  sourceFrozen(p);
  if (hash(p.baseline.file) !== p.baseline.sha256) throw Error('Baseline receipt changed');
  baselineValid(read(p.baseline.file));
}
function run(command, args, logFile) {
  return new Promise((resolve,reject) => {
    const log = fs.openSync(logFile, 'wx');
    const child = spawn(command,args,{cwd:ROOT,stdio:['ignore',log,log],shell:false});
    child.on('error',e => {fs.closeSync(log);reject(e);});
    child.on('exit',code => {fs.closeSync(log);code === 0 ? resolve() : reject(Error(command + ' failed (' + code + '); see ' + logFile));});
  });
}
async function check(p, out) {
  const started=Date.now();
  frozen(p); fs.mkdirSync(out,{recursive:true});
  // Independent syntax checks run concurrently; product sections stay serial because some
  // sections own shared compatibility files. No unsafe concurrent evidence writers.
  const syntax = p.changed_files.filter(f => /\.(cjs|js)$/.test(f) && fs.existsSync(inside(ROOT,f)));
  await Promise.all(syntax.map((f,i) => run(process.execPath,['--check',inside(ROOT,f)],path.join(out,'syntax-'+i+'.log'))));
  await run(process.execPath,[path.join(__dirname,'release-workflow.test.cjs')],path.join(out,'workflow-tests.log'));
  let receipt;
  if (p.risk.full_regression_required) {
    await run(process.execPath,['accelerated-launch/service/tests/run-tests.cjs'],path.join(out,'regression.log'));
    receipt=read(path.join(ROOT,'accelerated-launch/service/out/current-regression-evidence.json'));baselineValid(receipt);
    write(path.join(out,'full-regression.json'),receipt);
  } else if (p.risk.mode === 'PRESENTATION') {
    const file=path.join(out,'focused-regression.json');
    await run(process.execPath,['accelerated-launch/service/tests/run-tests.cjs',...p.selected_lanes.map(l=>'--lane='+l),...p.selected_sections,'--receipt='+file],path.join(out,'regression.log'));
    receipt=read(file);
    if (receipt.totals.failed || receipt.totals.skipped || receipt.execution.source_drift.length || receipt.execution.sections.some(s=>!s.completed || s.section_exception)) throw Error('Focused verification incomplete');
  }
  // A full run intentionally replaces the canonical baseline; compare frozen source only.
  sourceFrozen(p);
  const result={schema:1, verified_at:new Date().toISOString(), plan_sha256:sha(JSON.stringify(p)), mode:p.risk.mode,
    syntax_checks:syntax.length, workflow_tests:'PASS', current_tests:receipt?.totals || null,
    inherited_proof:p.risk.full_regression_required ? null : p.baseline,
    product_regression:receipt ? (p.risk.full_regression_required ? 'FRESH_FULL' : 'FRESH_FOCUSED') : 'UNCHANGED_PRODUCT_DEPENDENCIES',
    staging:'NOT_RUN', production:'NOT_RUN', source_snapshot:p.source_snapshot,duration_ms:Date.now()-started};
  write(path.join(out,'verification.json'),result);return result;
}
function packageCandidate(p, verificationFile, out) {
  const v=read(verificationFile);
  if(v.plan_sha256 !== sha(JSON.stringify(p)) || v.workflow_tests !== 'PASS') throw Error('Verification does not match plan');
  sourceFrozen(p);
  if(p.risk.full_regression_required && (v.product_regression!=='FRESH_FULL' || !v.current_tests || v.current_tests.failed!==0 || v.current_tests.skipped!==0))throw Error('Fresh full verification required');
  if(p.risk.mode==='PRESENTATION' && (v.product_regression!=='FRESH_FOCUSED' || !v.current_tests || v.current_tests.failed!==0 || v.current_tests.skipped!==0))throw Error('Fresh focused verification required');
  const m=read(path.join(__dirname,'release-manifest.json')), files=m.groups.flatMap(g=>g.files), head=git(['rev-parse','HEAD']);
  manifestValid(m);
  const target=path.join(out,'package');if(fs.existsSync(target)) throw Error('Package already exists');
  for(const f of files) {
    const source=inside(ROOT,f.file), dest=inside(target,f.file);
    if(hash(source)!==f.sha256.toUpperCase()) throw Error('Regenerate manifest before packaging: '+f.file);
    const committed=execFileSync('git',['show',head+':'+f.file],{cwd:ROOT,maxBuffer:32*1024*1024});
    if(sha(committed)!==f.sha256.toUpperCase()) throw Error('Commit shipped changes before packaging: '+f.file);
    fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(source,dest);
    if(hash(dest)!==f.sha256.toUpperCase())throw Error('Packaged copy mismatch: '+f.file);
  }
  const build='crp-v1-'+m.manifest_digest.slice(0,16).toLowerCase();
  fs.copyFileSync(path.join(__dirname,'release-manifest.json'),path.join(target,'release-manifest.json'));
  const provenance={build_id:build,manifest_digest:m.manifest_digest,git_head:head,files:files.length,verification_sha256:hash(verificationFile),verification_mode:v.product_regression};
  write(path.join(target,'deployment-provenance.json'),provenance);
  const archive=path.join(out,'candidate.tar.gz');if(fs.existsSync(archive))throw Error('Archive exists');
  execFileSync('tar',['-czf',archive,'-C',target,'.']);
  sourceFrozen(p);
  const receipt={...provenance,archive_sha256:hash(archive),archive,created_at:new Date().toISOString(),production_ready:false};
  write(path.join(out,'package-receipt.json'),receipt);return receipt;
}
async function smoke(url, build, manifest, out) {
  manifestValid(manifest);
  const base=new URL(url); if(base.protocol!=='https:' && !['127.0.0.1','localhost'].includes(base.hostname))throw Error('HTTPS required');
  const health=await fetch(new URL('/api/health',base),{signal:AbortSignal.timeout(15000)});if(!health.ok)throw Error('Health HTTP '+health.status);
  const h=await health.json();if(!h.ok || h.build_id!==build)throw Error('Wrong hosted build');
  const deployment=base.hostname==='creditregulatorpro.com'?'production':base.hostname==='staging.creditregulatorpro.com'?'staging':h.deployment;
  if(h.deployment!==deployment || h.billing_mode!==(deployment==='production'?'live':'test'))throw Error('Hosted deployment or billing mode mismatch');
  const assets=manifest.groups.find(g=>g.id==='SERVED_ASSETS');if(!assets)throw Error('Missing served assets');
  const checks=await Promise.all(assets.files.map(async f=>{
    const asset=path.basename(f.file);
    const res=await fetch(new URL('/'+asset,base),{signal:AbortSignal.timeout(15000)});
    if(deployment==='production' && /^(mailing-preview|referrals|score-simulator)\.(html|css|js)$/.test(asset)) {
      if(res.status!==404)throw Error('Optional production preview unexpectedly exposed: '+asset);
      return {file:f.file,passed:true,status:404,expected:'Optional previews disabled in production'};
    }
    if(!res.ok || sha(Buffer.from(await res.arrayBuffer()))!==f.sha256.toUpperCase())throw Error('Hosted bytes mismatch: '+asset);
    return {file:f.file,passed:true,sha256:f.sha256};
  }));
  const receipt={build_id:build,host:base.origin,checked_at:new Date().toISOString(),health:h,checks,passed:true,scope:'Public health and exact served assets; does not establish purchase or packet journey acceptance'};
  write(out,receipt);return receipt;
}
function acceptance(receipt, build, proof) {
  const required=['final_full_freeze','immutable_served_source','actual_phase1','actual_paid_activation','actual_phase2','actual_cleanup','native_order','image_order','exact_duplicates','continuation','written_dates','numeric_dates','month_precision','reference_dates','useful_recovery','bounded_unsuccessful','upload_limits','stable_support','support_isolation','account_isolation','privacy_inventory','current_plan_quotes','owned_history','chronological_linkage','changed_issue','history_isolation','packet_comparison_continuity','paid_result','paid_plan_quotes','own_ocr_locations','checklist_source_breach','actual_probable_breach','no_irrelevant_context_questions','consumer_violation_labels','serious_clear_unpaid_example','plain_consumer_explanations','internal_reading_limit_retained','packet_current_owner_version','packet_editable_visual_review','packet_exact_source_sequence','packet_inline_identity_address','packet_forms_retired','packet_browser_download_print','current_approval_navigation','genuine_unused_payment_upgrade','reporting_period_directive'];
  if(receipt.build_id!==build || receipt.passed!==true || receipt.gates!==30 || receipt.criteria!==123 || receipt.predicates?.length!==required.length || new Set(receipt.predicates.map(p=>p.id)).size!==required.length || required.some(id=>!receipt.predicates.some(p=>p.id===id && p.passed===true)) || !/^[a-fA-F0-9]{64}$/.test(receipt.measurement_receipt_sha256 || '')) throw Error('Exact-build 30-gate / 123-criterion acceptance required');
  if(!proof?.measurementFile || !proof?.evidenceRoot || !proof?.packageReceipt) throw Error('Acceptance requires the actual measurement file, evidence root and package identity');
  const pkg=proof.packageReceipt, root=path.resolve(proof.evidenceRoot), sourceRoot=path.resolve(proof.sourceRoot || ROOT);
  if(hash(proof.measurementFile)!==receipt.measurement_receipt_sha256.toUpperCase())throw Error('Acceptance measurement hash mismatch');
  if(receipt.source_commit!==pkg.git_head || receipt.manifest_digest!==pkg.manifest_digest || build!=='crp-v1-'+pkg.manifest_digest.slice(0,16).toLowerCase())throw Error('Acceptance source/package identity mismatch');
  const measured=read(proof.measurementFile);
  if(measured.passed!==true || measured.failures?.length!==0 || measured.identity?.build_id!==build || measured.identity?.served_build_id!==build || measured.manifest_digest!==pkg.manifest_digest)throw Error('Measurement build or verdict mismatch');
  for(const predicate of receipt.predicates) {
    if(typeof predicate.expected!=='string' || !predicate.expected || predicate.measured===undefined || !Array.isArray(predicate.refs) || !predicate.refs.length || JSON.stringify(predicate)!==JSON.stringify(measured.predicates?.[predicate.id]))throw Error('Acceptance predicate lacks matching measured evidence: '+predicate.id);
  }
  const manifest=read(path.join(sourceRoot,'accelerated-launch/service/deploy/release-manifest.json'));
  if(manifest.manifest_digest!==pkg.manifest_digest || manifest.total_file_count!==pkg.files)throw Error('Accepted manifest does not match package');
  for(const row of manifest.groups.flatMap(g=>g.files))if(hash(inside(sourceRoot,row.file))!==row.sha256.toUpperCase())throw Error('Accepted manifest bytes changed: '+row.file);
  for(const name of ['actual_phase1','actual_paid_activation','actual_phase2','actual_cleanup']) {
    const refs=measured.predicates[name].refs;
    if(!refs.every(ref=>fs.statSync(inside(root,normalize(ref))).isFile()))throw Error('Hosted phase evidence unavailable: '+name);
  }
  for(const name of ['actual_phase1','actual_phase2']) {
    const phase=read(inside(root,normalize(measured.predicates[name].refs[0])));
    if(phase.target!=='https://staging.creditregulatorpro.com' || phase.passed!==true || phase.identity?.build_id!==build || phase.identity?.served_build_id!==build || phase.source_proof?.passed!==true || phase.source_proof?.manifest_digest!==pkg.manifest_digest || phase.source_proof?.files?.length!==pkg.files || new Set(phase.source_proof.files.map(row=>row.file)).size!==pkg.files || phase.source_proof.files.some(row=>!manifest.groups.flatMap(g=>g.files).some(f=>f.file===row.file && f.sha256.toLowerCase()===String(row.expected).toLowerCase() && f.sha256.toLowerCase()===String(row.measured).toLowerCase())))throw Error('Hosted source/hostname proof mismatch: '+name);
  }
  const freeze=measured.source_freeze;
  const fullFile=inside(root, normalize(freeze?.file || ''));
  if(hash(fullFile)!==String(freeze?.sha256).toUpperCase())throw Error('Full regression receipt hash mismatch');
  const full=read(fullFile);baselineValid(full);
  if(JSON.stringify(full.source_hashes)!==JSON.stringify(freeze.source_hashes))throw Error('Source freeze inventory mismatch');
  for(const row of full.source_hashes)if(hash(inside(sourceRoot,normalize(row.file)))!==row.sha256.toUpperCase())throw Error('Acceptance source drift: '+row.file);
  const specs=require('./release-proof-gates.json');
  if(specs.length!==30 || specs.reduce((n,g)=>n+g.criteria.length,0)!==123)throw Error('Invalid authoritative gate policy');
  const {validateCapabilityStatus}=require('../evidence-validator.cjs');
  for(const gate of specs) {
    const verdict=validateCapabilityStatus(read(inside(root,gate.file)),{targetBuildId:build,baseDir:root,sourceRoot,requiredCriteria:gate.criteria});
    if(!verdict.passed || verdict.staging_status!=='VERIFIED_ON_STAGING')throw Error('Current staging evidence rejected: '+gate.id);
  }
}
function prepareAcceptanceProof(acceptanceFile,pkg,out,options={}) {
  const evidenceRoot=path.resolve(options.evidenceRoot || path.join(ROOT,'accelerated-launch/service/out'));
  const sourceRoot=path.resolve(options.sourceRoot || ROOT), receipt=read(acceptanceFile);
  const measurementFile=path.join(path.dirname(acceptanceFile),'measurements.json');
  acceptance(receipt,pkg.build_id,{measurementFile,evidenceRoot,sourceRoot,packageReceipt:pkg});
  const bundle=path.join(out,'acceptance-proof');if(fs.existsSync(bundle))throw Error('Proof bundle already exists');
  const measurement=read(measurementFile),full=read(inside(evidenceRoot,normalize(measurement.source_freeze.file)));
  const manifest=read(path.join(sourceRoot,'accelerated-launch/service/deploy/release-manifest.json'));
  const refs=new Set([...receipt.predicates.flatMap(p=>p.refs),measurement.source_freeze.file]);
  for(const gate of require('./release-proof-gates.json')) {
    refs.add(gate.file);
    const evidence=read(inside(evidenceRoot,gate.file));
    for(const criterion of Object.values(evidence.criteria))for(const ref of criterion.evidence_refs)refs.add(ref);
  }
  function copy(from,to) {fs.mkdirSync(path.dirname(to),{recursive:true,mode:0o700});fs.copyFileSync(from,to);if(hash(from)!==hash(to))throw Error('Proof copy mismatch');}
  for(const ref of refs)copy(inside(evidenceRoot,normalize(ref)),inside(path.join(bundle,'evidence'),normalize(ref)));
  const measurementRef=normalize(path.relative(evidenceRoot,measurementFile));
  copy(measurementFile,inside(path.join(bundle,'evidence'),measurementRef));
  for(const file of new Set([...full.source_hashes.map(r=>normalize(r.file)),...manifest.groups.flatMap(g=>g.files).map(r=>r.file)]))copy(inside(sourceRoot,file),inside(path.join(bundle,'source'),file));
  for(const name of ['release-workflow.cjs','release-proof-gates.json'])copy(path.join(__dirname,name),path.join(bundle,'verifier/deploy',name));
  copy(path.join(__dirname,'../evidence-validator.cjs'),path.join(bundle,'verifier/evidence-validator.cjs'));
  copy(acceptanceFile,path.join(bundle,'acceptance.json'));
  write(path.join(bundle,'package-identity.json'),{build_id:pkg.build_id,git_head:pkg.git_head,manifest_digest:pkg.manifest_digest,files:pkg.files,measurement_ref:measurementRef});
  // The server verifies the very same strict proof, using the frozen source and
  // referenced files. Never copy an entire private evidence directory or env file.
  acceptance(read(path.join(bundle,'acceptance.json')),pkg.build_id,{measurementFile:inside(path.join(bundle,'evidence'),measurementRef),evidenceRoot:path.join(bundle,'evidence'),sourceRoot:path.join(bundle,'source'),packageReceipt:pkg});
  const archive=path.join(out,'acceptance-proof.tar.gz');execFileSync('tar',['-czf',archive,'-C',bundle,'.']);
  return {archive,sha256:hash(archive)};
}
async function activate(target, packageFile, previous, acceptanceFile, out) {
  if(!['staging','production'].includes(target))throw Error('Unknown deployment target');
  if(!/^crp-v1-[a-f0-9]{16}$/.test(previous))throw Error('Expected previous build required');
  const r=read(packageFile);
  if(!/^crp-v1-[a-f0-9]{16}$/.test(r.build_id) || !/^[A-F0-9]{64}$/.test(r.archive_sha256) || !/^[A-F0-9]{64}$/.test(r.manifest_digest) || !/^[a-f0-9]{40}$/.test(r.git_head) || !Number.isInteger(r.files) || hash(r.archive)!==r.archive_sha256) throw Error('Invalid package receipt');
  if(r.build_id!=='crp-v1-'+r.manifest_digest.slice(0,16).toLowerCase())throw Error('Build/digest mismatch');
  const currentManifest=read(path.join(__dirname,'release-manifest.json'));manifestValid(currentManifest);
  if(r.manifest_digest!==currentManifest.manifest_digest)throw Error('Package does not match current manifest');
  if(r.build_id===previous)throw Error('Candidate is already the expected current build; no redeployment required');
  if(target==='production')acceptance(read(acceptanceFile),r.build_id,{measurementFile:path.join(path.dirname(acceptanceFile),'measurements.json'),evidenceRoot:path.join(ROOT,'accelerated-launch/service/out'),packageReceipt:r});
  fs.mkdirSync(out,{recursive:true});
  const proof=target==='production'?prepareAcceptanceProof(acceptanceFile,r,out):null;
  const script=path.join(__dirname,'activate-'+target+'.sh');
  const remote='/tmp/'+r.build_id+'-'+target;
  await run('scp',[r.archive,'hostinger-vps:'+remote+'.tar.gz'],path.join(out,'transfer-package.log'));
  await run('scp',[script,'hostinger-vps:'+remote+'.sh'],path.join(out,'transfer-script.log'));
  if(proof)await run('scp',[proof.archive,'hostinger-vps:'+remote+'-proof.tar.gz'],path.join(out,'transfer-proof.log'));
  await run('ssh',['hostinger-vps','bash',remote+'.sh',r.build_id,remote+'.tar.gz',r.archive_sha256,previous,r.manifest_digest,String(r.files),r.git_head,...(proof?[remote+'-proof.tar.gz',proof.sha256]:[])],path.join(out,'activation.log'));
  const url=target==='production'?'https://creditregulatorpro.com':'https://staging.creditregulatorpro.com';
  try {await smoke(url,r.build_id,read(path.join(__dirname,'release-manifest.json')),path.join(out,'public-smoke.json'));}
  catch(e) {await rollback(target,r.build_id,path.join(out,'failed-smoke-rollback'));throw Error('Hosted smoke failed; previous release restored: '+e.message);}
  const record={target,build_id:r.build_id,previous_build:previous,package_receipt_sha256:hash(packageFile),staging_acceptance_sha256:target==='production'?hash(acceptanceFile):null,activated_at:new Date().toISOString(),public_smoke:'PASS',journey_acceptance:target==='staging'?'PENDING':'EXACT_BUILD_STAGING_ACCEPTED'};
  write(path.join(out,'activation.json'),record);return record;
}
async function rollback(target, expected, out) {
  if(!['staging','production'].includes(target) || !/^crp-v1-[a-f0-9]{16}$/.test(expected))throw Error('Target and current build required');
  fs.mkdirSync(out,{recursive:true});
  await run('scp',[path.join(__dirname,'rollback-release.sh'),'hostinger-vps:/tmp/crp-rollback-release.sh'],path.join(out,'transfer.log'));
  await run('ssh',['hostinger-vps','bash','/tmp/crp-rollback-release.sh',target,expected],path.join(out,'rollback.log'));
  write(path.join(out,'rollback.json'),{target,expected_build:expected,completed_at:new Date().toISOString(),scope:'Previous immutable release and environment restored; current consumer data preserved',passed:true});
}
function attest(p, originalFile, out) {
  frozen(p);
  if(p.risk.full_regression_required || p.risk.billing_journey_required)throw Error('Changed shared or billing dependencies require fresh proof');
  const original=read(originalFile);
  if(!original.build_id || original.passed!==true)throw Error('Original build identity and successful proof required');
  if(original.build_id!==p.baseline.build_id)throw Error('Original receipt does not belong to the accepted baseline build');
  const dependencies=read(p.baseline.file).source_hashes.filter(s=>{
    const f=normalize(s.file);
    return !f.startsWith('accelerated-launch/service/deploy/') && f!=='accelerated-launch/service/tests/run-tests.cjs' && !f.startsWith('accelerated-launch/service/ui/');
  });
  for(const s of dependencies)if(hash(inside(ROOT,normalize(s.file)))!==s.sha256.toUpperCase())throw Error('Proof dependency changed: '+s.file);
  const record={schema:1,attested_at:new Date().toISOString(),original_receipt:{file:path.resolve(originalFile),sha256:hash(originalFile),build_id:original.build_id,original_date:original.measured_at || original.checked_at || original.activated_at || null},
    baseline_receipt_sha256:p.baseline.sha256,unchanged_dependencies:dependencies,plan_sha256:sha(JSON.stringify(p)),
    scope:'Dependency continuity only. Original execution retains its build, date, hostname and scope; this is not a fresh hosted execution or current configuration check',
    fresh_public_smoke_required:true,fresh_affected_journey_required:p.risk.hosted_journey_required,configuration_reuse:'NOT_ASSERTED'};
  write(out,record);return record;
}
async function main() {
  const [command,...args]=process.argv.slice(2);
  if(command==='plan') {const p=plan(args[0],args[1] || path.join(ROOT,'accelerated-launch/service/out/current-regression-evidence.json'));write(path.resolve(args[2] || path.join(ROOT,'accelerated-launch/service/out/release-plan-'+Date.now()+'.json')),p);console.log(JSON.stringify(p.risk));}
  else if(command==='check') {const r=await check(read(args[0]),path.resolve(args[1]));console.log(JSON.stringify({mode:r.mode,syntax_checks:r.syntax_checks,workflow_tests:r.workflow_tests,product_regression:r.product_regression,current_tests:r.current_tests,duration_ms:r.duration_ms}));}
  else if(command==='package') console.log(JSON.stringify(packageCandidate(read(args[0]),path.resolve(args[1]),path.resolve(args[2]))));
  else if(command==='smoke') {const r=await smoke(args[0],args[1],read(path.join(__dirname,'release-manifest.json')),path.resolve(args[2]));console.log(JSON.stringify({build_id:r.build_id,host:r.host,checks:r.checks.length+1,passed:r.passed}));}
  else if(command==='activate')console.log(JSON.stringify(await activate(args[0],path.resolve(args[1]),args[2],args[3]==='-'?null:path.resolve(args[3]),path.resolve(args[4]))));
  else if(command==='rollback')await rollback(args[0],args[1],path.resolve(args[2]));
  else if(command==='attest') {const r=attest(read(args[0]),path.resolve(args[1]),path.resolve(args[2]));console.log(JSON.stringify({original_build:r.original_receipt.build_id,unchanged_dependencies:r.unchanged_dependencies.length,configuration_reuse:r.configuration_reuse}));}
  else throw Error('Usage: release-workflow.cjs plan BASE [BASELINE] [PLAN] | check PLAN OUTPUT | attest PLAN ORIGINAL_RECEIPT OUTPUT | package PLAN VERIFICATION OUTPUT | smoke URL BUILD RECEIPT | activate staging|production PACKAGE EXPECTED_PREVIOUS ACCEPTANCE_OR_DASH OUTPUT | rollback TARGET EXPECTED_CURRENT OUTPUT');
}
module.exports={classify,baselineValid,manifestValid,plan,frozen,check,packageCandidate,smoke,acceptance,prepareAcceptanceProof,attest};
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
