'use strict';
// Operator-only, host-local migration. Source database, old object references and sessions remain untouched.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const [mode,release,sourceDir,reportPath,idPath]=process.argv.slice(2);
assert.ok(['inspect','apply'].includes(mode));
assert.match(release,/^\/opt\/crp-wizard-production\/releases\/crp-v1-[a-f0-9]{16}$/);
assert.equal(fs.realpathSync(release),release);
assert.match(sourceDir,/^\/opt\/crp-wizard-production\/backups\/legacy-[A-Za-z0-9_-]+$/);
assert.equal(fs.realpathSync(sourceDir),sourceDir);
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const sourceBytes=fs.readFileSync(sourceDir+'/private-migration-source.json'),source=JSON.parse(sourceBytes);
assert.equal(source.version,'CRP-LEGACY-PRODUCTION-PRIVATE-EXPORT-1');assert.equal(source.source_database_untouched,true);
const rows=source.rows,service=release+'/accelerated-launch/service';
const moduleAt=name=>require(service+'/'+name+'.cjs');
const manifest=JSON.parse(fs.readFileSync(release+'/release-manifest.json'));
for(const group of manifest.groups)for(const f of group.files){const p=path.resolve(release,f.file);assert.ok(p.startsWith(release+'/'));assert.equal(sha(fs.readFileSync(p)).toUpperCase(),f.sha256);}
const env=Object.fromEntries(fs.readFileSync('/opt/crp-wizard-production/production.env','utf8').split(/\r?\n/).filter(l=>/^[A-Z][A-Z0-9_]*=/.test(l)).map(l=>{const i=l.indexOf('=');return[l.slice(0,i),l.slice(i+1).replace(/^(['"])(.*)\1$/,'$2')];}));
assert.equal(env.CRP_DEPLOYMENT_ENV,'production');assert.match(env.STRIPE_SECRET_KEY,/^sk_live_/);
async function stripe(route){const r=await fetch('https://api.stripe.com/v1/'+route,{headers:{Authorization:'Bearer '+env.STRIPE_SECRET_KEY,'Stripe-Version':'2024-06-20'},signal:AbortSignal.timeout(30000)});const v=await r.json();if(!r.ok)throw Error('PROVIDER_VERIFICATION_FAILED_'+r.status);return v;}
(async()=>{
  const account=await stripe('account');assert.equal(account.id,'acct_1RTRWOKCM3e4JIjW');
  const seen=new Set(),mapped=new Map();
  for(const user of rows.users){
    const email=user.email.trim().toLowerCase();assert.ok(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));assert.ok(!seen.has(email));seen.add(email);
    const password=rows.user_passwords.find(r=>r.user_id===user.id);assert.ok(password&&moduleAt('legacy-password').validLegacyPasswordHash(password.password_hash));
    assert.ok(!mapped.has(String(user.id)));
    mapped.set(String(user.id),{account_id:'acc_legacy_'+sha(String(user.id)).slice(0,24),email,legacy_password_bcrypt:password.password_hash,
      created_at:user.created_at,failed_sign_ins:0,legacy_import:{source_user_sha256:sha(String(user.id)),source_export_sha256:sha(sourceBytes)}});
  }
  const profileKeys={full_name:'full_name',address_line1:'address_line1',address_line2:'address_line2',city:'city',province:'region',postal_code:'postal_code',date_of_birth:'date_of_birth',phone:'phone'};
  for(const old of rows.user_account){const next=mapped.get(String(old.user_id));assert.ok(next);next.profile={};for(const [from,to]of Object.entries(profileKeys))if(old[from]!=null){let value=String(old[from]);if(to==='date_of_birth'&&/^\d{4}-\d{2}-\d{2}/.test(value))value=value.slice(0,10);next.profile[to]=value;}next.profile.contact_email=old.email||next.email;}
  const access=[];
  for(const old of rows.subscriptions){
    const next=mapped.get(String(old.user_id));assert.ok(next);
    const subscription=await stripe('subscriptions/'+encodeURIComponent(old.stripe_subscription_id));
    assert.equal(subscription.livemode,true);assert.equal(subscription.customer,old.stripe_customer_id);
    assert.equal(subscription.metadata?.userId,String(old.user_id));
    const invoiceId=typeof subscription.latest_invoice==='string'?subscription.latest_invoice:subscription.latest_invoice?.id;
    const invoice=await stripe('invoices/'+invoiceId);
    assert.equal(invoice.livemode,true);assert.equal(invoice.customer,old.stripe_customer_id);assert.equal(invoice.subscription,subscription.id);
    assert.equal(invoice.status,'paid');assert.equal(invoice.paid,true);
    // The existing verified complimentary period has zero cash and renewal already turned off.
    assert.equal(subscription.status,'active');assert.equal(subscription.cancel_at_period_end,true);
    assert.equal(invoice.amount_paid,0);assert.equal(subscription.items.data.length,1);
    const item=subscription.items.data[0];assert.equal(item.quantity,1);assert.equal(item.price.unit_amount,0);
    assert.equal(item.price.recurring.interval,'year');assert.equal(item.price.recurring.interval_count,1);
    assert.ok(subscription.metadata.complimentary==='true'||subscription.metadata.complimentary==='1');
    const expires=new Date(subscription.current_period_end*1000).toISOString();assert.ok(expires>new Date().toISOString());
    access.push({entitlement_id:'ent_legacy_'+sha(subscription.id).slice(0,24),account_id:next.account_id,state:'COMPLIMENTARY',
      access_via:'SUBSCRIPTION',plan_code:'annual',source:'stripe',granted_at:new Date(subscription.current_period_start*1000).toISOString(),
      expires_at:expires,cancel_at_period_end:true,provider_subscription_reference:subscription.id,provider_customer_reference:subscription.customer,
      provider_payment_reference:invoice.id,legacy_import:{provider_account_id:account.id,verified_at:new Date().toISOString(),
        source_export_sha256:sha(sourceBytes),cash_paid_cents:0,upgrade_credit_granted:false}});
  }
  assert.equal(rows.report_artifact.length,1);assert.equal(rows.consumer_identification_document.length,1);
  const oldReport=rows.report_artifact[0],oldId=rows.consumer_identification_document[0];
  assert.ok(mapped.has(String(oldReport.user_id))&&mapped.has(String(oldId.user_id)));
  const recovered=(file,expected)=>{if(!file||!fs.existsSync(file))return null;assert.equal(fs.realpathSync(file),file);const bytes=fs.readFileSync(file);assert.equal(sha(bytes),expected);return bytes;};
  const report=recovered(reportPath,oldReport.sha256),id=recovered(idPath,oldId.sha256);
  const receipt={mode,build_id:'crp-v1-'+manifest.manifest_digest.slice(0,16).toLowerCase(),manifest_digest:manifest.manifest_digest,
    source_export_sha256:sha(sourceBytes),accounts:mapped.size,profiles:rows.user_account.length,verified_complimentary_access:access.length,
    cash_upgrade_credits:0,original_sessions_imported:0,roles_imported:0,original_database_unmodified:true,
    report_original_recovered:Boolean(report),id_original_recovered:Boolean(id),anonymous_custody_references_retained:source.all_report_custody_references.filter(r=>!r.user_id).length,
    measured_at:new Date().toISOString(),passed:false};
  if(mode==='apply'){
    assert.ok(report&&id,'BOTH_AUTHENTIC_ORIGINAL_FILES_REQUIRED');assert.equal(id.length,Number(oldId.file_size_bytes));
    assert.equal(oldReport.data.jurisdictionCode,'CA');assert.equal(oldReport.data.caseJurisdictionCode,'NS');
    const data='/var/lib/private/crp-wizard-production';assert.equal(env.CRP_LOCAL_SERVICE_DATA,'/var/lib/crp-wizard-production');
    assert.ok(!fs.existsSync(data+'/state.json'),'EMPTY_DESTINATION_REQUIRED');
    fs.mkdirSync(data,{recursive:true,mode:0o700});assert.equal(fs.realpathSync(data),data);
    const store=new(moduleAt('private-store').PrivateStore)(data);
    try{
      store.update(state=>{assert.equal(state.accounts.length,0);state.accounts.push(...mapped.values());state.entitlements.push(...access);});
      const actor=mapped.get(String(oldReport.user_id)),caseRow=moduleAt('cases').createCase(store,actor,{country:'CA',region:'CA-NS'});
      const reportReceipt=moduleAt('uploads').receiveReport(store,actor,caseRow,{originalFilename:oldReport.data.fileName||'credit-report.pdf',mimeType:'application/pdf',declaredBytes:report.length,contentBase64:report.toString('base64')});
      moduleAt('journey').evaluateCase(store,actor,caseRow.case_id);
      const document=moduleAt('account-documents').receiveDocument(store,mapped.get(String(oldId.user_id)),{document_type:'IDENTITY',document_kind:'IDENTIFICATION',originalFilename:oldId.file_name,mimeType:oldId.file_type,declaredBytes:id.length,contentBase64:id.toString('base64')});
      store.update(state=>{state.cases.find(c=>c.case_id===caseRow.case_id).legacy_import={source_report_sha256:oldReport.sha256,source_selection:'explicit recorded CA / NS',source_export_sha256:sha(sourceBytes)};});
      receipt.actual_private_files=store.state().files.length;receipt.current_checklist_reassessed=true;receipt.legacy_findings_imported=0;receipt.passed=true;
    }finally{
      const lock=JSON.parse(fs.readFileSync(store.lockFile,'utf8'));
      assert.equal(lock.pid,process.pid);fs.unlinkSync(store.lockFile);
    }
    fs.writeFileSync('/opt/crp-wizard-production/legacy-migration-receipt.json',JSON.stringify(receipt,null,2)+'\n',{mode:0o600});
  }
  console.log(JSON.stringify(receipt,null,2));
})().catch(err=>{console.error(err.code||err.message);process.exitCode=1;});
