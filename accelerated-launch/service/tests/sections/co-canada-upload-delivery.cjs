'use strict';
// Canada-first: actual local HTTP PDF uploads; no private report leaves loopback.
const fs=require('node:fs');
const crypto=require('node:crypto');
const formats=require('../../formats.cjs');
const evaluation=require('../../evaluation.cjs');
const tu=require('../../format-families/tu-ca-consumer.cjs');
const {buildPdf}=require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');
const uploadBody=(b,name)=>({originalFilename:name,declaredBytes:b.length,mimeType:'application/pdf',contentBase64:b.toString('base64')});
async function pay(t,owner,caseId){
 const c=(await t.request('POST','/api/billing/checkout',{token:owner.token,body:{plan_code:'monthly'}})).json.checkout;
 await t.postEvent({id:'test_evt_'+crypto.randomBytes(8).toString('hex'),type:'checkout.session.completed',account_reference:owner.account_id,plan_code:c.plan.plan_code,session_reference:c.provider_reference,amount_cents:c.plan.amount_cents,currency:c.plan.currency,occurred_at:new Date().toISOString()});
}
async function run(t,check){
 const surface=(await t.request('GET','/api/jurisdictions')).json.surface;
 const canadian=surface.regions.filter(r=>r.country==='CA');
 check.equal(canadian.length,13,'all thirteen Canadian selections remain available');
 const alberta=canadian.find(r=>r.value==='CA-AB');
 check.ok(alberta.executable_checks>0,'Alberta current registry advertises applicable rules rather than the obsolete zero');
 check.ok(alberta.supported_format_families.includes(tu.FAMILY_ID),'Alberta names the actual TransUnion path');
 check.ok(!/No statutory evaluation/.test(alberta.availability.plain),'Alberta does not claim no statutory evaluation');
 // The real consumer file is transmitted ONLY to the local test HTTP service and removed on harness close.
 const pointer=tu.readSecondCanadianPointer();
 check.ok(pointer.available&&tu.verifySpecimenDigest(pointer).verified,'the existing authorized real Canadian PDF is available');
 const actor=await t.unpaidAccount('canada-real-upload@example.test');
 const ca=(await t.request('POST','/api/cases',{token:actor.token,body:{country:'CA',region:'CA-ON'}})).json.case;
 await pay(t,actor,ca.case_id);
 const up=await t.request('POST',`/api/cases/${ca.case_id}/files`,{token:actor.token,body:uploadBody(fs.readFileSync(pointer.absolute_path),'canada-authorized-local.pdf')});
 check.equal(up.status,201,'real TransUnion PDF uploads through HTTP');
 check.equal(up.json.receipt.format_detection.presentation_id,tu.FAMILY_ID,'HTTP routes to the admitted reader');
 const ev=await t.request('POST',`/api/cases/${ca.case_id}/evaluate`,{token:actor.token});
 check.equal(ev.status,201,'the uploaded report evaluates');
 const persisted=t.service.store.state().results.filter(r=>r.case_id===ca.case_id).at(-1);
 check.equal(persisted.extraction.records.filter(r=>r.kind===tu.TRADELINE_KIND).length,4,'four actual accounts survive HTTP persistence');
 check.ok(persisted.evaluation.results.some(r=>r.check.adapter_id==='CA-ON-CRA-S9-3-A-RELIABLE-EVIDENCE-BASIS'),'Ontario accuracy actually evaluates TransUnion record facts');
 const onView=(await t.request('GET',`/api/cases/${ca.case_id}`,{token:actor.token})).json.view;
 const onConcern=onView.result.issues.find(i=>i.limitation_concern===true);
 check.ok(onConcern,'the actual local Ontario upload reaches a qualified court-limit concern');
 check.ok(onConcern&&/does not establish when the claim was discovered/.test(onConcern.explanation),
  'the concern does not claim the printed date proves legal discovery');
 check.equal((await t.request('POST',`/api/cases/${ca.case_id}/packet/select`,
  {token:actor.token,body:{issue_ids:[onConcern.issue_id]}})).status,200,'the Ontario concern can be selected');
 check.equal((await t.request('POST',`/api/cases/${ca.case_id}/packet/correspondence`,
  {token:actor.token,body:{correspondence:{consumer_name:'Fictional Canadian Tester',contact:'tester@example.test'}}})).status,
  200,'Ontario correspondence is reviewed');
 check.equal((await t.request('POST',`/api/cases/${ca.case_id}/packet/approve`,{token:actor.token})).status,
  200,'the Ontario selection is approved');
 check.equal((await t.request('GET',`/api/cases/${ca.case_id}/packet-download`,{token:actor.token})).status,
  200,'and its entitled packet downloads from the actual local upload');
 const mb=(await t.request('POST','/api/cases',{token:actor.token,body:{country:'CA',region:'CA-MB'}})).json.case;
 const mbUpload=await t.request('POST',`/api/cases/${mb.case_id}/files`,
  {token:actor.token,body:uploadBody(fs.readFileSync(pointer.absolute_path),'canada-authorized-local.pdf')});
 check.equal(mbUpload.status,201,'the same authorized local report uploads for Manitoba');
 check.equal((await t.request('POST',`/api/cases/${mb.case_id}/evaluate`,{token:actor.token})).status,
  201,'Manitoba assesses the uploaded reader facts');
 const mbView=(await t.request('GET',`/api/cases/${mb.case_id}`,{token:actor.token})).json.view;
 const mbConcern=mbView.result.issues.find(i=>i.limitation_concern===true);
 check.ok(mbConcern,'the actual Manitoba upload reaches a qualified court-limit concern');
 check.ok(mbConcern&&/does not establish when the claim was discovered/.test(mbConcern.explanation),
  'the Manitoba issue does not equate report dates with discovery');
 check.equal((await t.request('POST',`/api/cases/${mb.case_id}/packet/select`,
  {token:actor.token,body:{issue_ids:[mbConcern.issue_id]}})).status,200,'the Manitoba concern is selectable');
 check.equal((await t.request('POST',`/api/cases/${mb.case_id}/packet/correspondence`,
  {token:actor.token,body:{correspondence:{consumer_name:'Fictional Canadian Tester',contact:'tester@example.test'}}})).status,
  200,'Manitoba correspondence is reviewed');
 check.equal((await t.request('POST',`/api/cases/${mb.case_id}/packet/approve`,{token:actor.token})).status,
  200,'the Manitoba selection is approved');
 check.equal((await t.request('GET',`/api/cases/${mb.case_id}/packet-download`,{token:actor.token})).status,
  200,'and its entitled packet downloads from the local upload');
 const bc=(await t.request('POST','/api/cases',{token:actor.token,body:{country:'CA',region:'CA-BC'}})).json.case;
 check.equal((await t.request('POST',`/api/cases/${bc.case_id}/files`,
  {token:actor.token,body:uploadBody(fs.readFileSync(pointer.absolute_path),'canada-authorized-local.pdf')})).status,
  201,'the authorized local report uploads for British Columbia');
 check.equal((await t.request('POST',`/api/cases/${bc.case_id}/evaluate`,{token:actor.token})).status,
  201,'British Columbia assesses the uploaded reader facts');
 const bcView=(await t.request('GET',`/api/cases/${bc.case_id}`,{token:actor.token})).json.view;
 const bcConcern=bcView.result.issues.find(i=>i.limitation_concern===true);
 check.ok(bcConcern,'the actual British Columbia upload reaches a qualified court-limit concern');
 check.ok(bcConcern&&/does not establish when the claim was discovered/.test(bcConcern.explanation),
  'the BC issue does not equate report dates with discovery');
 check.equal((await t.request('POST',`/api/cases/${bc.case_id}/packet/select`,
  {token:actor.token,body:{issue_ids:[bcConcern.issue_id]}})).status,200,'the BC concern is selectable');
 check.equal((await t.request('POST',`/api/cases/${bc.case_id}/packet/correspondence`,
  {token:actor.token,body:{correspondence:{consumer_name:'Fictional Canadian Tester',contact:'tester@example.test'}}})).status,
  200,'British Columbia correspondence is reviewed');
 check.equal((await t.request('POST',`/api/cases/${bc.case_id}/packet/approve`,{token:actor.token})).status,
  200,'the British Columbia selection is approved');
 check.equal((await t.request('GET',`/api/cases/${bc.case_id}/packet-download`,{token:actor.token})).status,
  200,'and its entitled packet downloads from the local upload');
 const nt=(await t.request('POST','/api/cases',{token:actor.token,body:{country:'CA',region:'CA-NT'}})).json.case;
 check.equal((await t.request('POST',`/api/cases/${nt.case_id}/files`,
  {token:actor.token,body:uploadBody(fs.readFileSync(pointer.absolute_path),'canada-authorized-local.pdf')})).status,
  201,'the authorized local report uploads for Northwest Territories');
 check.equal((await t.request('POST',`/api/cases/${nt.case_id}/evaluate`,{token:actor.token})).status,
  201,'Northwest Territories assesses the uploaded reader facts');
 const ntView=(await t.request('GET',`/api/cases/${nt.case_id}`,{token:actor.token})).json.view;
 const ntConcern=ntView.result.issues.find(i=>i.limitation_concern===true);
 check.ok(ntConcern,'the actual Northwest Territories upload reaches a qualified court-limit concern');
 check.ok(ntConcern&&/does not establish legal accrual/.test(ntConcern.explanation),
  'the territory issue does not equate report dates with accrual');
 check.equal((await t.request('POST',`/api/cases/${nt.case_id}/packet/select`,
  {token:actor.token,body:{issue_ids:[ntConcern.issue_id]}})).status,200,'the territory concern is selectable');
 check.equal((await t.request('POST',`/api/cases/${nt.case_id}/packet/correspondence`,
  {token:actor.token,body:{correspondence:{consumer_name:'Fictional Canadian Tester',contact:'tester@example.test'}}})).status,
  200,'Northwest Territories correspondence is reviewed');
 check.equal((await t.request('POST',`/api/cases/${nt.case_id}/packet/approve`,{token:actor.token})).status,
  200,'the territory selection is approved');
 check.equal((await t.request('GET',`/api/cases/${nt.case_id}/packet-download`,{token:actor.token})).status,
  200,'and its entitled packet downloads from the local upload');
 const nu=(await t.request('POST','/api/cases',{token:actor.token,body:{country:'CA',region:'CA-NU'}})).json.case;
 check.equal((await t.request('POST',`/api/cases/${nu.case_id}/files`,
  {token:actor.token,body:uploadBody(fs.readFileSync(pointer.absolute_path),'canada-authorized-local.pdf')})).status,
  201,'the authorized local report uploads for Nunavut');
 check.equal((await t.request('POST',`/api/cases/${nu.case_id}/evaluate`,{token:actor.token})).status,
  201,'Nunavut assesses the uploaded reader facts');
 const nuView=(await t.request('GET',`/api/cases/${nu.case_id}`,{token:actor.token})).json.view;
 const nuConcern=nuView.result.issues.find(i=>i.limitation_concern===true);
 check.ok(nuConcern,'the actual Nunavut upload reaches a qualified court-limit concern');
 check.ok(nuConcern&&/does not establish legal accrual/.test(nuConcern.explanation),
  'the Nunavut issue does not equate report dates with accrual');
 check.equal((await t.request('POST',`/api/cases/${nu.case_id}/packet/select`,
  {token:actor.token,body:{issue_ids:[nuConcern.issue_id]}})).status,200,'the Nunavut concern is selectable');
 check.equal((await t.request('POST',`/api/cases/${nu.case_id}/packet/correspondence`,
  {token:actor.token,body:{correspondence:{consumer_name:'Fictional Canadian Tester',contact:'tester@example.test'}}})).status,
  200,'Nunavut correspondence is reviewed');
 check.equal((await t.request('POST',`/api/cases/${nu.case_id}/packet/approve`,{token:actor.token})).status,
  200,'the Nunavut selection is approved');
 check.equal((await t.request('GET',`/api/cases/${nu.case_id}/packet-download`,{token:actor.token})).status,
  200,'and its entitled packet downloads from the local upload');
 const real=persisted.extraction;
 for(const region of ['CA-BC','CA-QC','CA-SK','CA-NT','CA-NU','CA-YT']){
  const evaluated=evaluation.evaluateCase({country:'CA',region,extraction:real});
  check.ok(evaluated.results.some(r=>r.check.adapter_id.startsWith(region+'-')&&r.machine.content),'each applicable accuracy rule consumes this reader own facts: '+region);
 }
 const pdf=buildPdf({pages:[{lines:['Equifax Consumer Credit Report','Report Date: June 12, 2026','Account: Fictional Canadian Lender Balance $100 Opened 01/01/2020 Closed 01/01/2019']}]});
 // Each Canadian region: actual fictional PDF upload -> selected issue -> reviewed correspondence -> download.
 for(const region of canadian){
  const owner=await t.unpaidAccount('canada-'+region.value.toLowerCase()+'@example.test');
  const c=(await t.request('POST','/api/cases',{token:owner.token,body:{country:'CA',region:region.value}})).json.case;
  await pay(t,owner,c.case_id);
  const uploaded=await t.request('POST',`/api/cases/${c.case_id}/files`,{token:owner.token,body:uploadBody(pdf,'fictional-canadian-account.pdf')});
  check.equal(uploaded.status,201,region.value+' fictional PDF uploads');
  check.equal((await t.request('POST',`/api/cases/${c.case_id}/evaluate`,{token:owner.token})).status,201,region.value+' evaluates uploaded facts');
  const view=(await t.request('GET',`/api/cases/${c.case_id}/packet`,{token:owner.token})).json.view;
  check.ok(view.eligible_issues.length>0,region.value+' exposes a supported selectable reporting issue');
  const issue=view.eligible_issues[0];
  check.equal((await t.request('POST',`/api/cases/${c.case_id}/packet/select`,{token:owner.token,body:{issue_ids:[issue.issue_id]}})).status,200,region.value+' selection persists');
  await t.request('POST',`/api/cases/${c.case_id}/packet/correspondence`,{token:owner.token,body:{correspondence:{consumer_name:'Fictional Canadian Tester',contact:'tester@example.test'}}});
  check.equal((await t.request('POST',`/api/cases/${c.case_id}/packet/approve`,{token:owner.token})).status,200,region.value+' approves correspondence');
  const download=await t.request('GET',`/api/cases/${c.case_id}/packet-download`,{token:owner.token});
  check.equal(download.status,200,region.value+' entitled packet downloads');
  check.ok(download.text.includes('Fictional Canadian Tester'),region.value+' packet contains reviewed correspondence');
 }
 return {real_canadian_http_upload:true,canadian_actual_pdf_packet_journeys:13,private_report_egress:false};
}
module.exports={id:'co-canada-upload-delivery',title:'Canada real HTTP intake and thirteen selected packet journeys',run};
