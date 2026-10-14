'use strict';
// Owner-authorized change-aware execution. Historical receipts remain immutable.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {execFileSync, spawn} = require('node:child_process');
const inputs = require('./release-inputs.cjs');
const execution = require('./release-execution.cjs');
const artifact = require('./release-artifact.cjs');
const transfers = require('./release-transfer.cjs');
const ROOT = path.resolve(__dirname, '../../..');
const normalize = p => p.replace(/\\/g, '/');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const read = p => JSON.parse(fs.readFileSync(p));
const hash = p => sha(fs.readFileSync(p));
const git = (args, root=ROOT) => execFileSync('git', args, {cwd:root, encoding:'utf8', maxBuffer:32*1024*1024,stdio:['pipe','pipe','pipe']}).trim();
function inside(root, name) {
  const p = path.resolve(root, name);
  if (!p.startsWith(root + path.sep)) throw Error('Unsafe relative path: ' + name);
  return p;
}
function write(file, value) {
  fs.mkdirSync(path.dirname(file), {recursive:true});
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', {flag:'wx'});
}
const classify = (files, options) => inputs.classify(files,options);
function baselineValid(receipt) {
  if (receipt.mode !== 'FULL_CURRENT_PRODUCT' || !receipt.totals || !Number.isInteger(receipt.totals.passed) || receipt.totals.passed<1 || receipt.totals.failed!==0 || receipt.totals.skipped!==0 || !Array.isArray(receipt.unrun_sections) || receipt.unrun_sections.length || !Array.isArray(receipt.source_drift) || receipt.source_drift.length || !receipt.sections?.length || !receipt.source_hashes?.length || receipt.sections.some(s => !s.completed || s.failed!==0 || s.section_exception || !Array.isArray(s.skipped) || s.skipped.length)) throw Error('Baseline is not a complete passing full regression');
}
function manifestValid(m) {
  const digest=rows=>{const h=crypto.createHash('sha256');for(const r of rows){h.update(r.file);h.update('\n');h.update(r.sha256);h.update('\n');}return h.digest('hex').toUpperCase();};
  const files=m.groups.flatMap(g=>g.files);
  if(files.length!==m.total_file_count || new Set(files.map(f=>f.file)).size!==files.length || m.groups.some(g=>digest(g.files)!==g.digest) || digest(m.groups.filter(g=>g.files.length).map(g=>({file:'group:'+g.id,sha256:g.digest})))!==m.manifest_digest)throw Error('Invalid release manifest');
  for(const f of files){inside(ROOT,f.file);if(!/^[A-F0-9]{64}$/.test(f.sha256))throw Error('Invalid source hash');}
}
function changed(base,root=ROOT) {
  const files = [...new Set([...git(['diff', '--name-only', base, '--'],root).split(/\r?\n/), ...git(['ls-files','--others','--exclude-standard'],root).split(/\r?\n/)].filter(Boolean).map(normalize).filter(p=>!p.startsWith('branding/') && !p.startsWith('legal-drafts/')))].sort();
  const manifest = read(path.join(root, 'accelerated-launch/service/deploy/release-manifest.json'));
  // Include changed/uncommitted shipped bytes even if omitted from Git's diff inventory.
  for (const f of manifest.groups.flatMap(g => g.files)) {
    if (!fs.existsSync(inside(root, f.file)) || hash(inside(root, f.file)) !== f.sha256.toUpperCase()) if (!files.includes(f.file)) files.push(f.file);
  }
  return files.sort();
}
function sectionCatalog(root=ROOT,commit=null) {
  const get=file=>commit?git(['show',commit+':'+file],root):fs.readFileSync(inside(root,file),'utf8');
  const text=get('accelerated-launch/service/tests/run-tests.cjs');
  const block=text.match(/const SECTION_FILES\s*=\s*\[([\s\S]*?)\];/);
  if(!block)throw Error('Product section inventory is unavailable');
  return [...block[1].matchAll(/['"]([^'"]+\.cjs)['"]/g)].map(match=>{
    const file='accelerated-launch/service/tests/sections/'+match[1];
    const text=get(file);
    const id=[...text.matchAll(/module\.exports\s*=\s*\{[\s\S]*?\bid\s*:\s*['"]([^'"]+)['"]/g)].pop();
    if(!id)throw Error('Declarative section identity unavailable: '+file);
    return {id:id[1],file};
  });
}
function contentImpact(root,base,files) {
  const purchasePresentationFiles=[],executableHtml=[];
  for(const file of files.filter(f=>f.startsWith('accelerated-launch/service/ui/') && /\.(html|svg)$/.test(f))){
    let before='';try{before=git(['show',base+':'+file],root);}catch(_){}
    const after=fs.existsSync(inside(root,file))?fs.readFileSync(inside(root,file),'utf8'):'';
    const decoded=text=>text.replace(/&#(?:x([0-9a-f]+)|([0-9]+));?/gi,(_,hex,decimal)=>{const point=Number.parseInt(hex||decimal,hex?16:10);return point<=0x10ffff?String.fromCodePoint(point):'\ufffd';}).replace(/&colon;/gi,':').replace(/&(?:Tab|NewLine);/gi,'');
    const scripts=text=>[...decoded(text).matchAll(/<script\b[\s\S]*?<\/script\s*>|\bon[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi),...decoded(text).replace(/[\t\r\n]/g,'').matchAll(/(?:javascript\s*:|data\s*:\s*(?:text\/html|application\/javascript|image\/svg\+xml)|<iframe\b|<object\b|<embed\b)[^>]*/gi)].map(m=>m[0]);
    const unclosed=text=>(decoded(text).match(/<script\b/gi)||[]).length!==(decoded(text).match(/<\/script\s*>/gi)||[]).length;
    if(unclosed(after)||JSON.stringify(scripts(before))!==JSON.stringify(scripts(after)))executableHtml.push(file);
    // The checkout shell is an affected purchase surface even when only a price or control changes.
    if((/\/(checkout|purchase|pricing|billing|subscription)[^/]*\.html$/i.test(file)||/billing|checkout|stripe|entitlement|subscription|payment|plan_code|price_|currency|purchase|\b(?:USD|CAD|AUD|GBP|amount|subtotal|tax|total)\b|[$£€]/i.test(before+'\n'+after)) && before!==after)purchasePresentationFiles.push(file);
  }
  return {purchasePresentationFiles,executableHtml};
}
function plan(base, baselineFile, options={}) {
  const root=path.resolve(options.root||ROOT);
  if(normalize(path.resolve(baselineFile)).endsWith('/accelerated-launch/service/out/current-regression-evidence.json'))throw Error('Capture the mutable canonical baseline first with the prepare/plan CLI');
  const commit=git(['rev-parse', '--verify', base + '^{commit}'],root);
  const files=changed(commit,root);
  const originalManifest=JSON.parse(git(['show',commit+':accelerated-launch/service/deploy/release-manifest.json'],root));
  const baseline = read(baselineFile); baselineValid(baseline);
  const catalog=options.sectionCatalog||sectionCatalog(root,commit),impact=contentImpact(root,commit,files);
  const risk = classify(files,impact);
  if(impact.executableHtml.length){risk.mode='FULL';risk.full_regression_required=true;risk.reason='Executable HTML changed: '+impact.executableHtml.join(', ');}
  if(risk.billing_journey_required && risk.mode==='PRESENTATION'){risk.mode='FULL';risk.full_regression_required=true;risk.reason='Purchase presentation requires fresh full and provider proof; continuity does not cover changed payment surfaces';}
  const descriptor=inputs.createBaselineDescriptor({root,baseCommit:commit,baselineFile,sectionIds:catalog.map(r=>r.id),manifest:originalManifest,capturedDependencies:options.capturedDependencies||[]});
  const drift = baseline.source_hashes.filter(s => !fs.existsSync(inside(root, normalize(s.file))) || hash(inside(root, normalize(s.file))) !== s.sha256.toUpperCase()).map(s => normalize(s.file));
  // A runtime/test dependency mismatch always defeats inherited proof. Only this explicit
  // workflow infrastructure and served presentation are eligible for the narrower path.
  const unexplained = drift.filter(p => classify([p]).full_regression_required);
  if (unexplained.length) {risk.mode='FULL';risk.full_regression_required=true;risk.reason='Baseline dependency drift: ' + unexplained.join(', ');}
  const lanes = risk.mode === 'PRESENTATION' ? ['consumer', 'security', 'browser'] : [];
  const laneDefinitions=lanes.length?require(path.join(root,'accelerated-launch/service/tests/verification-lanes.cjs')).LANE_IDS:{};
  const sections=[...new Set([...lanes.flatMap(l=>laneDefinitions[l]||[]),...baseline.sections.filter(s => /ui|auth|sign|flow|plain-text|landing|branding|packet-review/i.test(s.id)).map(s => s.id)])].sort();
  const deployDir=path.join(root,'accelerated-launch/service/deploy'),orchestration=fs.readdirSync(deployDir).filter(f=>/\.(cjs|js|json|sh|ps1)$/.test(f)).map(f=>'accelerated-launch/service/deploy/'+f);
  const sourceFiles=[...new Set([...baseline.source_hashes.map(s=>normalize(s.file)),...read(path.join(root,'accelerated-launch/service/deploy/release-manifest.json')).groups.flatMap(g=>g.files).map(f=>f.file),...orchestration,...files.filter(f=>!/\.md$/i.test(f))])].sort();
  return {schema:2, created_at:new Date().toISOString(), workspace_root:root, base_commit:commit, git_head:git(['rev-parse', 'HEAD'],root), changed_files:files.sort(), bookkeeping_files:files.filter(f=>/\.md$/i.test(f)), risk,
    selected_lanes:lanes, selected_sections:risk.mode === 'PRESENTATION' ? sections : [],
    baseline:{file:path.resolve(baselineFile), sha256:hash(baselineFile), build_id:'crp-v1-'+originalManifest.manifest_digest.slice(0,16).toLowerCase(),mode:baseline.mode, totals:baseline.totals, dependency_drift:drift,descriptor},
    source_snapshot:Object.fromEntries(sourceFiles.map(p=>[p,fs.existsSync(inside(root,p))?hash(inside(root,p)):null])),
    evidence_policy:'Inherited receipt retains its original build, date and scope. This plan is not a new full regression or hosted acceptance.'};
}
function sourceFrozen(p) {
  const root=p.workspace_root||ROOT;
  const relevant=files=>files.filter(f=>p.schema<2||!/\.md$/i.test(f));
  if(JSON.stringify(relevant(changed(p.base_commit,root)))!==JSON.stringify(relevant(p.changed_files)))throw Error('Changed-file inventory no longer matches plan');
  for (const [f, expected] of Object.entries(p.source_snapshot)) {
    const actual = fs.existsSync(inside(root,f)) ? hash(inside(root,f)) : null;
    if (actual !== expected) throw Error('Source changed after planning: ' + f);
  }
}
function frozen(p) {
  sourceFrozen(p);
  if (hash(p.baseline.file) !== p.baseline.sha256) throw Error('Baseline receipt changed');
  baselineValid(read(p.baseline.file));
  if(p.schema>=2)inputs.validateBaselineDescriptor({root:p.workspace_root||ROOT,baseCommit:p.base_commit,baselineFile:p.baseline.file,descriptor:p.baseline.descriptor,sectionIds:sectionCatalog(p.workspace_root||ROOT,p.base_commit).map(r=>r.id)});
}
function run(command, args, logFile,root=ROOT) {
  return new Promise((resolve,reject) => {
    const log = fs.openSync(logFile, 'wx');
    const child = spawn(command,args,{cwd:root,stdio:['ignore',log,log],shell:false});
    child.on('error',e => {fs.closeSync(log);reject(e);});
    child.on('exit',code => {fs.closeSync(log);if(code===0)resolve();else{const error=Error(command + ' failed (' + code + '); see ' + logFile);error.exit_code=code;reject(error);}});
  });
}
async function check(p, out, options={}) {
  const started=Date.now();
  const root=p.workspace_root||ROOT;
  frozen(p); fs.mkdirSync(out,{recursive:true,mode:0o700});
  const manifest=read(path.join(root,'accelerated-launch/service/deploy/release-manifest.json'));
  const prepared=prepareInputs(p,options),binding=prepared.binding;
  if((p.risk.full_regression_required || p.risk.mode==='PRESENTATION') && (process.env.CRP_DEPLOYMENT_ENV==='production' || /^sk_live_/.test(process.env.STRIPE_SECRET_KEY||'')))throw Error('Product verification refuses a production environment');
  const syntax = p.changed_files.filter(f => /\.(cjs|js)$/.test(f) && fs.existsSync(inside(root,f)));
  const toolNames=prepared.toolNames;
  if(!toolNames.length)throw Error('No release tooling checks available');
  const toolDirectory=inside(root,'accelerated-launch/service/deploy');
  const toolSources={};
  for(const f of fs.readdirSync(toolDirectory).filter(f=>/\.(cjs|json|sh)$/.test(f)))toolSources['accelerated-launch/service/deploy/'+f]=hash(path.join(toolDirectory,f));
  const identity={execution:'LOCAL_DETERMINISTIC',source:p.source_snapshot,tests:toolSources,fixtures:{files:binding.files,external_files:binding.external_files,profile_sha256:binding.profile_sha256},toolchain:{node:process.version,platform:process.platform,arch:process.arch,binaries:binding.binaries},environment:{sha256:binding.environment_sha256},verification:{mode:p.risk.mode,selected_sections:p.selected_sections,baseline_sha256:p.baseline.sha256}};
  const tools=await execution.executeStep({directory:out,id:'local-tooling',identity,run:async({outputDirectory})=>{
    await Promise.all(syntax.map((f,i)=>run(process.execPath,['--check',inside(root,f)],path.join(outputDirectory,'syntax-'+i+'.log'),root)));
    await Promise.all(toolNames.map(f=>run(process.execPath,[path.join(toolDirectory,f)],path.join(outputDirectory,f+'.log'),root)));
    verifyBinding(binding);sourceFrozen(p);
    return {passed:true,completed:true,failed:0,skipped:0,syntax_checks:syntax.length,tool_suites:toolNames,source_snapshot:p.source_snapshot};
  },validate:value=>value.passed===true && value.completed===true && value.failed===0 && value.skipped===0,outputs:(value,context)=>fs.readdirSync(context.outputDirectory).filter(f=>f.endsWith('.log')).map(f=>path.join(context.outputDirectory,f))});
  let receipt;
  let product=null;
  if(p.risk.full_regression_required || p.risk.mode==='PRESENTATION'){
    const productIdentity={...identity,fixtures:{files:binding.files,external_files:binding.external_files,profile_sha256:binding.profile_sha256},verification:{...identity.verification,...(!prepared.productReuse?{fresh_attempt:crypto.randomUUID()}:{}),reuse_scope:prepared.productReuse?'REVIEWED_COMPLETE_INPUT_PROFILE':'FRESH_UNBOUND_DYNAMIC_INPUTS'}};
    product=await execution.executeStep({directory:out,id:'product-verification',identity:productIdentity,run:async({outputDirectory})=>{
      const file=path.join(outputDirectory,p.risk.full_regression_required?'full-regression.json':'focused-regression.json');
      const args=['accelerated-launch/service/tests/run-tests.cjs',...(p.risk.full_regression_required?[]:[...p.selected_sections,'--receipt='+file])];
      await run(process.execPath,args,path.join(outputDirectory,'regression.log'),root);
      if(p.risk.full_regression_required){const raw=read(path.join(root,'accelerated-launch/service/out/current-regression-evidence.json'));baselineValid(raw);write(file,raw);}
      const raw=read(file);
      if(p.risk.full_regression_required)baselineValid(raw);
      else if(raw.totals.failed || raw.totals.skipped || raw.execution.source_drift.length || raw.execution.sections.some(s=>!s.completed || s.section_exception))throw Error('Focused verification incomplete');
      verifyBinding(binding);sourceFrozen(p);
      return {passed:true,completed:true,failed:0,skipped:0,receipt_file:file,receipt_sha256:hash(file)};
    },validate:value=>value.passed===true && value.completed===true && value.failed===0 && value.skipped===0 && hash(value.receipt_file)===value.receipt_sha256,outputs:value=>[value.receipt_file]});
    receipt=read(product.value.receipt_file);
  }
  // A full run intentionally replaces the canonical baseline; compare frozen source only.
  verifyBinding(binding);sourceFrozen(p);
  const result={schema:2, passed:true,verified_at:new Date().toISOString(), plan_sha256:sha(JSON.stringify(p)), mode:p.risk.mode,
    syntax_checks:syntax.length, workflow_tests:'PASS', current_tests:receipt?.totals || null,
    inherited_proof:p.risk.full_regression_required ? null : p.baseline,
    product_regression:receipt ? (p.risk.full_regression_required ? 'FRESH_FULL' : 'FRESH_FOCUSED') : 'UNCHANGED_PRODUCT_DEPENDENCIES',
    staging:'NOT_RUN', production:'NOT_RUN',input_binding:binding,product_reuse:prepared.productReuse?'REVIEWED_COMPLETE_INPUT_PROFILE':'DISABLED_WITHOUT_COMPLETE_INPUT_PROFILE',source_hashes:Object.entries(p.source_snapshot).filter(([,digest])=>digest!==null).map(([file,sha256])=>({file,sha256})),source_snapshot:p.source_snapshot,duration_ms:Date.now()-started,
    product_receipt:product?.value||null,checks:[{id:'local-tooling',passed:true,file:tools.receiptPath,sha256:hash(tools.receiptPath),tool_suites:tools.value.tool_suites}],resumed_steps:[tools,product].filter(r=>r?.reused).length,avoided_invocations:tools.reused?syntax.length+toolNames.length:0};
  if(product?.reused)result.avoided_invocations++;
  // Preserve the original package-authoritative receipt. Resume observations belong
  // to the append-only execution record rather than changing its verification hash.
  const pointer=path.join(out,'verification.json');
  if(tools.reused && (!product || product.reused) && fs.existsSync(pointer)){
    const prior=readVerification(pointer);
    if(prior.value.plan_sha256===result.plan_sha256 && JSON.stringify(prior.value.input_binding)===JSON.stringify(binding) && prior.value.product_receipt?.receipt_sha256===result.product_receipt?.receipt_sha256){
      return {...prior.value,duration_ms:result.duration_ms,resumed_steps:result.resumed_steps,avoided_invocations:result.avoided_invocations,verification_file:prior.file,reused:true};
    }
  }
  const file=path.join(out,'verification-'+crypto.randomUUID()+'.json');write(file,result);
  const tmp=pointer+'.'+crypto.randomUUID();
  write(tmp,{schema:2,receipt_file:file,sha256:hash(file)});fs.renameSync(tmp,pointer);
  return {...result,verification_file:file};
}
function readVerification(file){const raw=read(file);if(raw.receipt_file){if(hash(raw.receipt_file)!==raw.sha256)throw Error('Verification pointer mismatch');return {file:raw.receipt_file,value:read(raw.receipt_file)};}return {file,value:raw};}
function environmentIdentity(){return sha(JSON.stringify(Object.entries(process.env).sort(([a],[b])=>a.localeCompare(b))));}
function verifyBinding(binding){
  if(environmentIdentity()!==binding.environment_sha256)throw Error('Verification environment changed');
  for(const row of [...binding.files,...binding.external_files,...binding.binaries])if(hash(row.path)!==row.sha256)throw Error('Verification input changed: '+row.path);
  if(binding.profile_file && hash(binding.profile_file)!==binding.profile_sha256)throw Error('Reviewed input profile changed');
}
function prepareInputs(p,options={}){
  if(process.env.CRP_RELEASE_INPUTS_TEST_MODULE || process.env.CRP_RELEASE_WORKFLOW_MODULE)throw Error('Release checks refuse alternate test-module overrides; standalone tooling development tests may use them');
  const root=p.workspace_root||ROOT,catalog=sectionCatalog(root),product=p.risk.full_regression_required || p.risk.mode==='PRESENTATION',sections=p.risk.full_regression_required?catalog.map(r=>r.id):p.selected_sections;
  const deploy='accelerated-launch/service/deploy/',toolNames=['release-workflow.test.cjs','release-inputs.test.cjs','release-execution.test.cjs','release-artifact.test.cjs','release-continuity.test.cjs','release-proof-adapter.test.cjs','release-transfer.test.cjs','release-acceptance.test.cjs','release-host-probe.test.cjs','release-evidence-validator.test.cjs'].filter(f=>fs.existsSync(inside(root,deploy+f)));
  const profileFile=options.profileFile?path.resolve(options.profileFile):null,profile=profileFile?read(profileFile):null;
  const partialFreshProfile = profile?.complete === false && profile?.reuse_product === false;
  if(profile && (profile.schema!==1 || (profile.complete!==true && !partialFreshProfile) || !profile.reviewed_by || !Array.isArray(profile.files) || !Array.isArray(profile.commands) || !Array.isArray(profile.external_files) || JSON.stringify([...profile.selected_sections||[]].sort())!==JSON.stringify([...sections].sort())))throw Error('Invalid reviewed input profile or selection');
  if (profile?.injected_commands?.length && profile.complete === true) throw Error('Injected-command reviews require fresh product execution');
  const files=[...toolNames.map(f=>deploy+f),...(product?['accelerated-launch/service/tests/run-tests.cjs','accelerated-launch/service/tests/harness.cjs']:[]),...(profile?.files||[])];
  const preflight=inputs.assertPrerequisites({root,sections,sectionCatalog:catalog,files,commands:[process.execPath,'git','tar',...(profile?.commands||[])],injectedCommands:profile?.injected_commands||[],discoverGeneratedAssets:product,committedManifest:true,candidateCommit:git(['rev-parse','HEAD'],root)});
  const rows=paths=>[...new Set(paths)].sort().map(file=>{const actual=fs.realpathSync(file);if(!fs.statSync(actual).isFile())throw Error('Expected input file: '+file);return {path:actual,sha256:hash(actual)};});
  const binaries=preflight.commands.map(command=>{const file=inputs.resolveCommand(command);if(!file)throw Error('Missing command: '+command);return file;});
  for(const file of profile?.external_files||[])if(!path.isAbsolute(file))throw Error('External input paths must be absolute');
  const binding={files:rows(preflight.dependencies.map(f=>inside(root,f))),external_files:rows(profile?.external_files||[]),binaries:rows(binaries),environment_sha256:environmentIdentity(),profile_file:profileFile,profile_sha256:profileFile?hash(profileFile):null};
  return {toolNames,preflight,binding,productReuse:profile?.complete === true};
}
function packageCandidate(p, verificationFile, out) {
  const verification=readVerification(verificationFile),v=verification.value;
  if(v.plan_sha256 !== sha(JSON.stringify(p)) || v.workflow_tests !== 'PASS') throw Error('Verification does not match plan');
  sourceFrozen(p);
  if(v.input_binding)verifyBinding(v.input_binding);
  if(p.risk.full_regression_required && (v.product_regression!=='FRESH_FULL' || !v.current_tests || v.current_tests.failed!==0 || v.current_tests.skipped!==0))throw Error('Fresh full verification required');
  if(p.risk.mode==='PRESENTATION' && (v.product_regression!=='FRESH_FOCUSED' || !v.current_tests || v.current_tests.failed!==0 || v.current_tests.skipped!==0))throw Error('Fresh focused verification required');
  const root=p.workspace_root||ROOT,m=read(path.join(root,'accelerated-launch/service/deploy/release-manifest.json')),head=git(['rev-parse','HEAD'],root);
  const receipt=artifact.packageArtifact({root,manifest:m,head,verificationFile:verification.file,out,sourceSnapshot:p.source_snapshot,capturedDependencies:p.baseline.descriptor.dependencies.filter(r=>r.source==='CAPTURED_TEST_DEPENDENCY')});
  sourceFrozen(p);
  return receipt;
}
async function smoke(url, build, manifest, out) {
  manifestValid(manifest);
  if(build!=='crp-v1-'+manifest.manifest_digest.slice(0,16).toLowerCase())throw Error('Smoke build does not match the artifact manifest');
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
function validateFdtProof(evidence,full,sourceRoot,fullSha,build,productContext=null) {
  const section=full.sections.find(row=>row.id==='am-fdt-recovery'),raw=section?.evidence;
  const a=raw?.acceptance,b=raw?.benchmark_full,r=raw?.local_recovery;
  if(!section?.completed || !section.passed || a?.implementation_passed!==true || !Number.isFinite(a.recovery_rate) || a.recovery_rate<0.95 || a.recovery_rate>1 || ['incorrect_decisive_facts','cross_record_or_bureau_borrowing','unsupported_violations','missing_expected_violations','record_collapse_errors','withhold_errors'].some(key=>a[key]!==0) || ['every_miss_accounted','freeze_unchanged','source_unchanged'].some(key=>a[key]!==true) || b?.passed!==true || !b.baseline || !Number.isFinite(b.metrics?.missed_fact_rate) || b.metrics.missed_fact_rate<0 || b.metrics.missed_fact_rate>0.05 || b.metrics.incorrect_reading_rate!==0 || !(r?.useful_facts>0) || r.useful_attempts!==1 || r.unsuccessful_facts!==0 || r.unsuccessful_attempts!==1 || r.pass_limit!==1)throw Error('FDT raw recovery/accuracy thresholds failed');
  const composite=productContext?.kind==='ACCEPTED_FULL_WITH_CONTINUITY';
  const currentSources=composite?productContext.currentSourceHashes:full.source_hashes;
  const expectedSources=[...currentSources,...a.source_files].map(row=>composite?{...row,sha256:row.sha256.toLowerCase()}:row);
  const refs=evidence.implementation?.evidence_refs||[];
  if(JSON.stringify(evidence.acceptance)!==JSON.stringify(a) || JSON.stringify(evidence.benchmark)!==JSON.stringify({...b.metrics,baseline:b.baseline}) || evidence.implementation?.configured!==true || JSON.stringify(evidence.implementation.source_files)!==JSON.stringify(expectedSources) || (composite?(!refs.some(r=>r.sha256?.toUpperCase()===fullSha.toUpperCase()) || !refs.some(r=>r.sha256?.toUpperCase()===productContext.proofSha?.toUpperCase()) || evidence.verification_scope!=='Inherited full FDT metrics, current dependency continuity, and fresh hosted recovery'):refs.length!==1 || refs[0].sha256.toUpperCase()!==fullSha.toUpperCase()))throw Error('FDT gate differs from its hashed complete regression');
  if(composite)for(const ref of refs){const f=inside(productContext.evidenceRoot,normalize(ref.file));if(hash(f)!==ref.sha256.toUpperCase())throw Error('FDT continuity reference changed');}
  for(const row of a.source_files||[])if(hash(inside(sourceRoot,normalize(row.file)))!==row.sha256.toUpperCase())throw Error('FDT recovery dependency changed');
  if(!require(path.join(sourceRoot,'accelerated-launch/service/fdt-acceptance.cjs')).hostedRecoveryPassed(evidence.served_recovery,build))throw Error('FDT current hosted useful and bounded unsuccessful recovery proof failed');
}
function validateProductProof(freeze,proof,build) {
  const root=path.resolve(proof.evidenceRoot),sourceRoot=path.resolve(proof.sourceRoot||ROOT),file=inside(root,normalize(freeze?.file||''));
  if(hash(file)!==String(freeze?.sha256).toUpperCase())throw Error('Product verification receipt hash mismatch');
  const raw=read(file);
  if(raw.mode==='ACCEPTED_FULL_WITH_CONTINUITY'){
    const context=require('./release-continuity.cjs').validateComposite({sourceRoot,evidenceRoot:root,proofFile:file,candidateIdentity:{build_id:build,git_head:proof.packageReceipt.git_head,manifest_digest:proof.packageReceipt.manifest_digest}});
    if(JSON.stringify(context.currentSourceHashes)!==JSON.stringify(freeze.source_hashes))throw Error('Composite freeze inventory mismatch');
    return {...context,proofSha:hash(file),evidenceRoot:root};
  }
  baselineValid(raw);
  if(JSON.stringify(raw.source_hashes)!==JSON.stringify(freeze.source_hashes))throw Error('Source freeze inventory mismatch');
  for(const row of raw.source_hashes)if(hash(inside(sourceRoot,normalize(row.file)))!==row.sha256.toUpperCase())throw Error('Acceptance source drift: '+row.file);
  return {kind:'FRESH_FULL',baselineRaw:raw,baselineSha:hash(file),currentSourceHashes:raw.source_hashes,evidenceRefs:[normalize(freeze.file)],proofSha:hash(file),evidenceRoot:root};
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
  const productContext=validateProductProof(measured.source_freeze,{...proof,sourceRoot},build),full=productContext.baselineRaw;
  if(productContext.kind==='ACCEPTED_FULL_WITH_CONTINUITY' && !/continuity|inherited|focused/i.test(measured.predicates.final_full_freeze.expected))throw Error('Composite verification must disclose its inherited scope');
  const specs=require('./release-proof-gates.json');
  if(specs.length!==30 || specs.reduce((n,g)=>n+g.criteria.length,0)!==123)throw Error('Invalid authoritative gate policy');
  const {validateCapabilityStatus}=require('./release-evidence-validator.cjs');
  for(const gate of specs) {
    const evidence=read(inside(root,gate.file));
    const verdict=validateCapabilityStatus(evidence,{targetBuildId:build,baseDir:root,sourceRoot,requiredCriteria:gate.criteria});
    if(!verdict.passed || verdict.staging_status!=='VERIFIED_ON_STAGING')throw Error('Current staging evidence rejected: '+gate.id);
    if(gate.file==='fdt-mitigation-evidence.json')validateFdtProof(evidence,full,sourceRoot,productContext.baselineSha,build,productContext);
  }
}
function prepareAcceptanceProof(acceptanceFile,pkg,out,options={}) {
  const evidenceRoot=path.resolve(options.evidenceRoot || path.join(ROOT,'accelerated-launch/service/out'));
  const sourceRoot=path.resolve(options.sourceRoot || ROOT), receipt=read(acceptanceFile);
  const measurementFile=path.join(path.dirname(acceptanceFile),'measurements.json');
  acceptance(receipt,pkg.build_id,{measurementFile,evidenceRoot,sourceRoot,packageReceipt:pkg});
  const bundle=path.join(out,'acceptance-proof');if(fs.existsSync(bundle))throw Error('Proof bundle already exists');
  const measurement=read(measurementFile),context=validateProductProof(measurement.source_freeze,{evidenceRoot,sourceRoot,packageReceipt:pkg},pkg.build_id),full=context.baselineRaw;
  const manifest=read(path.join(sourceRoot,'accelerated-launch/service/deploy/release-manifest.json'));
  const refs=new Set([...receipt.predicates.flatMap(p=>p.refs),measurement.source_freeze.file,...context.evidenceRefs.map(r=>typeof r==='string'?r:r.file)]);
  for(const gate of require('./release-proof-gates.json')) {
    refs.add(gate.file);
    const evidence=read(inside(evidenceRoot,gate.file));
    for(const criterion of Object.values(evidence.criteria))for(const ref of criterion.evidence_refs)refs.add(ref);
    for(const ref of evidence.implementation?.evidence_refs||[])refs.add(ref.file);
  }
  const inputHashes=new Map();
  function copy(from,to) {fs.mkdirSync(path.dirname(to),{recursive:true,mode:0o700});fs.copyFileSync(from,to);const digest=hash(from);if(digest!==hash(to))throw Error('Proof copy mismatch');inputHashes.set(path.resolve(from),digest);}
  for(const ref of refs)copy(inside(evidenceRoot,normalize(ref)),inside(path.join(bundle,'evidence'),normalize(ref)));
  const measurementRef=normalize(path.relative(evidenceRoot,measurementFile));
  copy(measurementFile,inside(path.join(bundle,'evidence'),measurementRef));
  for(const file of new Set([...context.currentSourceHashes.map(r=>normalize(r.file)),...manifest.groups.flatMap(g=>g.files).map(r=>r.file)]))copy(inside(sourceRoot,file),inside(path.join(bundle,'source'),file));
  for(const name of ['release-workflow.cjs','release-inputs.cjs','release-execution.cjs','release-artifact.cjs','release-continuity.cjs','release-transfer.cjs','release-evidence-validator.cjs','release-proof-gates.json'])copy(inside(sourceRoot,'accelerated-launch/service/deploy/'+name),path.join(bundle,'verifier/deploy',name));
  copy(inside(sourceRoot,'accelerated-launch/service/evidence-validator.cjs'),path.join(bundle,'verifier/evidence-validator.cjs'));
  copy(acceptanceFile,path.join(bundle,'acceptance.json'));
  write(path.join(bundle,'package-identity.json'),{build_id:pkg.build_id,git_head:pkg.git_head,manifest_digest:pkg.manifest_digest,files:pkg.files,measurement_ref:measurementRef});
  // The server verifies the very same strict proof, using the frozen source and
  // referenced files. Never copy an entire private evidence directory or env file.
  acceptance(read(path.join(bundle,'acceptance.json')),pkg.build_id,{measurementFile:inside(path.join(bundle,'evidence'),measurementRef),evidenceRoot:path.join(bundle,'evidence'),sourceRoot:path.join(bundle,'source'),packageReceipt:pkg});
  const archive=path.join(out,'acceptance-proof.tar.gz');execFileSync('tar',['-czf',archive,'-C',bundle,'.']);
  return {archive,sha256:hash(archive),input_hashes:[...inputHashes].map(([file,sha256])=>({file,sha256}))};
}
function preparePromotionProof(acceptanceFile,pkg,out,options){
  const file=path.join(out,'promotion-proof.json');
  const request={acceptance_file:path.resolve(acceptanceFile),acceptance_sha256:hash(acceptanceFile),measurement_sha256:hash(path.join(path.dirname(acceptanceFile),'measurements.json')),evidence_root:path.resolve(options.evidenceRoot),source_root:path.resolve(options.sourceRoot)};
  if(fs.existsSync(file)){
    const proof=read(file);
    if(JSON.stringify(proof.request)!==JSON.stringify(request) || proof.package_identity!==sha(JSON.stringify({build_id:pkg.build_id,git_head:pkg.git_head,manifest_digest:pkg.manifest_digest,files:pkg.files})) || hash(proof.archive)!==proof.sha256 || !proof.input_hashes?.length)throw Error('Promotion proof identity changed');
    for(const row of proof.input_hashes)if(hash(row.file)!==row.sha256)throw Error('Promotion proof input changed; use a fresh verified promotion directory');
    return {...proof,reused:true};
  }
  const proof=prepareAcceptanceProof(acceptanceFile,pkg,out,options);
  write(file,{...proof,request,package_identity:sha(JSON.stringify({build_id:pkg.build_id,git_head:pkg.git_head,manifest_digest:pkg.manifest_digest,files:pkg.files}))});return proof;
}
async function activate(target, packageFile, previous, acceptanceFile, out) {
  if(!['staging','production'].includes(target))throw Error('Unknown deployment target');
  if(!/^crp-v1-[a-f0-9]{16}$/.test(previous))throw Error('Expected previous build required');
  const candidate=artifact.loadArtifact(packageFile),r=candidate.receipt,currentManifest=candidate.manifest;
  if(r.build_id===previous)throw Error('Candidate is already the expected current build; no redeployment required');
  if(!candidate.sourceRoot)throw Error('Activation requires a frozen schema-2 source artifact; retain older receipts as historical proof');
  const sourceRoot=candidate.sourceRoot,evidenceRoot=target==='production'?evidenceRootFor(acceptanceFile):null;
  if(target==='production')acceptance(read(acceptanceFile),r.build_id,{measurementFile:path.join(path.dirname(acceptanceFile),'measurements.json'),evidenceRoot,sourceRoot,packageReceipt:r});
  fs.mkdirSync(out,{recursive:true});
  const completed=path.join(out,'activation.json');
  const url=target==='production'?'https://creditregulatorpro.com':'https://staging.creditregulatorpro.com';
  const attempt=path.join(out,'attempt-'+crypto.randomUUID());fs.mkdirSync(attempt,{mode:0o700});
  const remote='/tmp/'+r.build_id+'-'+target,script=inside(sourceRoot,'accelerated-launch/service/deploy/activate-'+target+'.sh'),probeScript=inside(sourceRoot,'accelerated-launch/service/deploy/probe-activation.sh');
  let phase=0;
  const record=async value=>write(path.join(attempt,'phase-'+String(++phase).padStart(3,'0')+'.json'),{...value,observed_at:new Date().toISOString(),package_receipt_sha256:hash(packageFile)});
  const transfer=async(source,destination,expectedSha)=>transfers.transfer({source,destination,expectedSha,probe:remoteHash,record,upload:async(from,to)=>run('scp',[from,'hostinger-vps:'+to],path.join(attempt,'transfer-'+crypto.randomUUID()+'.log'))});
  const probeRemote=remote+'-'+hash(probeScript).slice(0,16).toLowerCase()+'.sh';
  await transfer(probeScript,probeRemote,hash(probeScript));
  const probe=async()=>{try{await run('ssh',['hostinger-vps','bash',probeRemote,target,r.build_id,r.archive_sha256,r.manifest_digest,String(r.files),r.git_head,previous],path.join(attempt,'host-probe-'+crypto.randomUUID()+'.log'));return true;}catch(error){if(error.exit_code===3)return false;throw error;}};
  if(fs.existsSync(completed)){
    const prior=read(completed);
    if(prior.build_id!==r.build_id || prior.target!==target || prior.previous_build!==previous || prior.package_receipt_sha256!==hash(packageFile))throw Error('Completed activation belongs to another artifact or predecessor');
    if(!await probe())throw Error('Previously completed artifact is no longer current on the host');
    await smoke(url,r.build_id,currentManifest,path.join(out,'fresh-smoke-'+crypto.randomUUID()+'.json'));
    return {...prior,reused:true,fresh_exact_host:true,fresh_public_smoke:true};
  }
  const proof=target==='production'?require(inside(sourceRoot,'accelerated-launch/service/deploy/release-workflow.cjs')).preparePromotionProof(acceptanceFile,r,out,{evidenceRoot,sourceRoot}):null;
  const activationRemote=remote+'-'+hash(script).slice(0,16).toLowerCase()+'.sh';
  try{
    await transfer(r.archive,remote+'.tar.gz',r.archive_sha256);
    await transfer(script,activationRemote,hash(script));
    if(proof)await transfer(proof.archive,remote+'-proof.tar.gz',proof.sha256);
    await transfers.activateObserved({probe,record,activate:async()=>run('ssh',['hostinger-vps','bash',activationRemote,r.build_id,remote+'.tar.gz',r.archive_sha256,previous,r.manifest_digest,String(r.files),r.git_head,...(proof?[remote+'-proof.tar.gz',proof.sha256]:[])],path.join(attempt,'activation.log'))});
  }catch(error){write(path.join(attempt,'failed.json'),{target,build_id:r.build_id,failed_at:new Date().toISOString(),passed:false,reason:error.message});throw error;}
  try {await smoke(url,r.build_id,currentManifest,path.join(attempt,'public-smoke.json'));}
  catch(e) {await rollback(target,r.build_id,path.join(attempt,'failed-smoke-rollback'),sourceRoot);throw Error('Hosted smoke failed; previous release restored: '+e.message);}
  const completedRecord={target,build_id:r.build_id,previous_build:previous,package_receipt_sha256:hash(packageFile),staging_acceptance_sha256:target==='production'?hash(acceptanceFile):null,activated_at:new Date().toISOString(),public_smoke:'PASS',journey_acceptance:target==='staging'?'PENDING':'EXACT_BUILD_STAGING_ACCEPTED'};
  write(path.join(out,'activation.json'),completedRecord);return completedRecord;
}
function evidenceRootFor(file){const name=normalize(path.resolve(file)),marker='/accelerated-launch/service/out/';return name.includes(marker)?path.resolve(name.slice(0,name.indexOf(marker))+marker):path.dirname(path.resolve(file));}
function assembleProductProof(packageFile,proofFile,evidenceRoot,out,fdtTemplate=null){
  const candidate=artifact.loadArtifact(packageFile),root=path.resolve(evidenceRoot),raw=read(proofFile);
  if(!candidate.sourceRoot)throw Error('Proof assembly requires frozen candidate source');
  const file=normalize(path.relative(root,path.resolve(proofFile))),freeze={file,sha256:hash(proofFile),source_hashes:raw.mode==='ACCEPTED_FULL_WITH_CONTINUITY'?raw.current_source_hashes:raw.source_hashes};
  const context=validateProductProof(freeze,{evidenceRoot:root,sourceRoot:candidate.sourceRoot,packageReceipt:candidate.receipt},candidate.receipt.build_id);
  const inherited=context.kind==='ACCEPTED_FULL_WITH_CONTINUITY';
  const result={schema:1,build_id:candidate.receipt.build_id,source_freeze:freeze,final_full_freeze:{id:'final_full_freeze',passed:true,expected:inherited?'Accepted full baseline, exact dependency continuity and required fresh focused proof':'Complete fresh full regression with exact current source',measured:inherited?{mode:context.kind,inherited_totals:context.baselineRaw.totals,fresh_focused_totals:context.freshFocusedRaw?.totals||null}:{mode:context.kind,totals:context.baselineRaw.totals},refs:[file]},scope:'Local proof assembly only; remaining actual hosted measurements, provider configuration and 30/123 gates still required'};
  if(fdtTemplate){
    if(!inherited)throw Error('FDT adapter is only for explicit inherited continuity');
    const gate=require('./release-proof-adapter.cjs').deriveFdtEvidence({context,evidence:read(fdtTemplate),candidate:candidate.receipt});
    if(gate.passed===true)validateFdtProof(gate,context.baselineRaw,candidate.sourceRoot,context.baselineSha,candidate.receipt.build_id,context);
    write(path.join(out,'fdt-mitigation-evidence.json'),gate);
    result.fdt_scope=gate.verification_scope;result.hosted_fdt_status=gate.passed===true?'SUPPLIED_HOSTED_PROOF_VALIDATED':'PENDING';
  }
  write(path.join(out,'product-proof-assembly.json'),result);return result;
}
async function rollback(target, expected, out, sourceRoot=ROOT) {
  if(!['staging','production'].includes(target) || !/^crp-v1-[a-f0-9]{16}$/.test(expected))throw Error('Target and current build required');
  fs.mkdirSync(out,{recursive:true});
  const script=inside(sourceRoot,'accelerated-launch/service/deploy/rollback-release.sh'),digest=hash(script),remote='/tmp/'+expected+'-'+target+'-'+digest.slice(0,16).toLowerCase()+'.sh';
  const attempt=path.join(out,'attempt-'+crypto.randomUUID());fs.mkdirSync(attempt,{mode:0o700});
  await transfers.transfer({source:script,destination:remote,expectedSha:digest,probe:remoteHash,upload:async(from,to)=>run('scp',[from,'hostinger-vps:'+to],path.join(attempt,'transfer.log')),record:async receipt=>write(path.join(attempt,'transfer.json'),receipt)});
  await run('ssh',['hostinger-vps','bash',remote,target,expected],path.join(attempt,'rollback.log'));
  write(path.join(out,'rollback.json'),{target,expected_build:expected,completed_at:new Date().toISOString(),scope:'Previous immutable release and environment restored; current consumer data preserved',passed:true});
}
async function remoteHash(destination){
  if(!/^\/tmp\/crp-v1-[a-f0-9]{16}-(?:staging|production)(?:-[a-f0-9]{16})?(?:-proof)?\.(?:tar\.gz|sh)$/.test(destination))throw Error('Unsafe remote transfer path');
  try{const output=execFileSync('ssh',['hostinger-vps','sha256sum '+destination],{encoding:'utf8',stdio:['pipe','pipe','pipe'],timeout:30000});const digest=output.trim().split(/\s/)[0].toUpperCase();if(!/^[A-F0-9]{64}$/.test(digest))throw Error('Invalid remote hash');return digest;}catch(error){if(error.status===1)return null;throw error;}
}
function attest(p, originalFile, out, kind='provider') {
  frozen(p);
  if(!['provider','packet','product'].includes(kind))throw Error('Unknown evidence kind');
  if(kind==='provider' && p.risk.billing_journey_required)throw Error('Changed billing dependencies require fresh proof');
  if(kind!=='provider' && p.risk.full_regression_required)throw Error('Changed shared dependencies require fresh proof');
  const original=read(originalFile);
  if(!original.build_id || original.passed!==true)throw Error('Original build identity and successful proof required');
  if(original.build_id!==p.baseline.build_id)throw Error('Original receipt does not belong to the accepted baseline build');
  const dependencies=read(p.baseline.file).source_hashes.filter(s=>{
    const f=normalize(s.file);
    if(kind==='provider')return classify([f]).billing_journey_required || ['accelerated-launch/service/accounts.cjs','accelerated-launch/service/private-store.cjs','accelerated-launch/service/app.cjs'].includes(f);
    return !f.startsWith('accelerated-launch/service/deploy/') && !f.startsWith('accelerated-launch/service/ui/');
  });
  if(!dependencies.length)throw Error('Evidence dependency set is empty');
  for(const s of dependencies)if(hash(inside(p.workspace_root||ROOT,normalize(s.file)))!==s.sha256.toUpperCase())throw Error('Proof dependency changed: '+s.file);
  const record={schema:1,attested_at:new Date().toISOString(),original_receipt:{file:path.resolve(originalFile),sha256:hash(originalFile),build_id:original.build_id,original_date:original.measured_at || original.checked_at || original.activated_at || null},
    baseline_receipt_sha256:p.baseline.sha256,evidence_kind:kind,unchanged_dependencies:dependencies,plan_sha256:sha(JSON.stringify(p)),
    scope:'Dependency continuity only. Original execution retains its build, date, hostname and scope; this is not a fresh hosted execution or current configuration check',
    fresh_public_smoke_required:true,fresh_affected_journey_required:p.risk.hosted_journey_required,configuration_reuse:'NOT_ASSERTED'};
  write(out,record);return record;
}
async function main() {
  const [command,...args]=process.argv.slice(2);
  if(command==='plan' || command==='prepare') {
    const source=args[1]||path.join(ROOT,'accelerated-launch/service/out/current-regression-evidence.json'),destination=path.resolve(args[2]||path.join(ROOT,'accelerated-launch/service/out/release-plan-'+Date.now()+'.json'));
    const anchor=path.join(path.dirname(destination),'accepted-baseline-'+hash(source).slice(0,16)+'.json');
    if(!fs.existsSync(anchor)){fs.mkdirSync(path.dirname(anchor),{recursive:true,mode:0o700});fs.writeFileSync(anchor,fs.readFileSync(source),{flag:'wx',mode:0o600});}
    if(hash(anchor)!==hash(source))throw Error('Captured baseline receipt mismatch');
    const p=plan(args[0],anchor);
    if(command==='prepare')prepareInputs(p,{profileFile:args[3]});
    write(destination,p);console.log(JSON.stringify({...p.risk,plan_file:destination}));
  }
  else if(command==='preflight'){const p=read(args[0]);frozen(p);const r=prepareInputs(p,{profileFile:args[1]});console.log(JSON.stringify({...r.preflight,product_reuse:r.productReuse?'REVIEWED_COMPLETE_INPUT_PROFILE':'DISABLED_WITHOUT_COMPLETE_INPUT_PROFILE'}));}
  else if(command==='check') {const r=await check(read(args[0]),path.resolve(args[1]),{profileFile:args[2]});console.log(JSON.stringify({mode:r.mode,syntax_checks:r.syntax_checks,workflow_tests:r.workflow_tests,product_regression:r.product_regression,current_tests:r.current_tests,duration_ms:r.duration_ms,resumed_steps:r.resumed_steps,avoided_invocations:r.avoided_invocations,verification_file:r.verification_file}));}
  else if(command==='package') console.log(JSON.stringify(packageCandidate(read(args[0]),path.resolve(args[1]),path.resolve(args[2]))));
  else if(command==='smoke') {const candidate=args[3]?artifact.loadArtifact(path.resolve(args[3])):null;const r=await smoke(args[0],args[1],candidate?candidate.manifest:read(path.join(__dirname,'release-manifest.json')),path.resolve(args[2]));console.log(JSON.stringify({build_id:r.build_id,host:r.host,checks:r.checks.length+1,passed:r.passed}));}
  else if(command==='continuity') {const p=read(args[0]),candidate=artifact.loadArtifact(path.resolve(args[2])),v=readVerification(path.resolve(args[1]));const result=require('./release-continuity.cjs').buildComposite({root:p.workspace_root||ROOT,plan:p,baselineFile:p.baseline.file,focusedFile:v.value.product_receipt?.receipt_file||null,toolsVerificationFile:v.file,candidate:candidate.receipt,outputDirectory:path.resolve(args[3])});console.log(JSON.stringify({kind:result.kind,proof_file:result.proofFile}));}
  else if(command==='assemble')console.log(JSON.stringify(assembleProductProof(path.resolve(args[0]),path.resolve(args[1]),path.resolve(args[2]),path.resolve(args[3]),args[4]?path.resolve(args[4]):null)));
  else if(command==='record')console.log(JSON.stringify(execution.readRecord(path.resolve(args[0]))));
  else if(command==='activate')console.log(JSON.stringify(await activate(args[0],path.resolve(args[1]),args[2],args[3]==='-'?null:path.resolve(args[3]),path.resolve(args[4]))));
  else if(command==='rollback')await rollback(args[0],args[1],path.resolve(args[2]));
  else if(command==='attest') {const r=attest(read(args[0]),path.resolve(args[1]),path.resolve(args[2]),args[3]||'provider');console.log(JSON.stringify({original_build:r.original_receipt.build_id,unchanged_dependencies:r.unchanged_dependencies.length,configuration_reuse:r.configuration_reuse}));}
  else throw Error('Usage: release-workflow.cjs prepare|plan BASE [BASELINE] [PLAN] | preflight PLAN [PROFILE_JSON] | check PLAN OUTPUT [PROFILE_JSON] | record OUTPUT | attest PLAN ORIGINAL_RECEIPT OUTPUT [provider|packet|product] | package PLAN VERIFICATION OUTPUT | continuity PLAN VERIFICATION PACKAGE OUTPUT | assemble PACKAGE PRODUCT_PROOF EVIDENCE_ROOT OUTPUT [FDT_TEMPLATE] | smoke URL BUILD RECEIPT [PACKAGE] | activate staging|production PACKAGE EXPECTED_PREVIOUS ACCEPTANCE_OR_DASH OUTPUT | rollback TARGET EXPECTED_CURRENT OUTPUT');
}
module.exports={classify,baselineValid,manifestValid,plan,frozen,sourceFrozen,sectionCatalog,contentImpact,prepareInputs,verifyBinding,check,readVerification,packageCandidate,smoke,acceptance,prepareAcceptanceProof,preparePromotionProof,validateProductProof,validateFdtProof,assembleProductProof,attest};
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
