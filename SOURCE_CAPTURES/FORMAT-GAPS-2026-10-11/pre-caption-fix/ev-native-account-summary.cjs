'use strict';
const fs=require('node:fs');
const path=require('node:path');
const formats=require('../../formats.cjs');
const evaluation=require('../../evaluation.cjs');
const issues=require('../../issues.cjs');
const {sourceForField}=require('../../report-fact-sources.cjs');
const {buildWordPdf}=require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');
let sequence=0;
function source(t, country, future=true, alter) {
  const words=[{text:'Experian Consumer Credit Report - FICTIONAL TEST FIXTURE',x:35,y:25},
    {text:'Report Date: September 12, 2026',x:35,y:45}];
  const xs=[35,185,270,385,450,535];
  const rows=[['Account / creditor','Type','Status','Balance','Opened','Reported'],
    ['Cedar Bank','Revolving','Open','$100','2020-01-15',future?'2027-09-12':'2026-09-12'],
    ['Pine Loan','Installment','Closed','$0','2021-02-16','2026-09-12']];
  rows.forEach((row,index)=>row.forEach((text,i)=>{if(text)words.push({text,x:xs[i],y:90+index*22});}));
  words.push({text:'ACCOUNT DETAIL',x:35,y:170},{text:'Past Due: $125',x:35,y:192},
    {text:'Account Number: XXXX1234',x:35,y:214});
  const bytes=buildWordPdf([{words}],{producer:'Fictional summary-table behavior',creator:'Fictional summary-table behavior'});
  const file=path.join(t.dataDir,'summary-'+(++sequence)+'.pdf');fs.writeFileSync(file,bytes);
  const model=formats.buildPdfDocumentModel(file);if(alter)alter(model);
  const extraction=formats.extractWithSharedAdapter(model,{mode:'REPORT',country});
  const assessed=evaluation.evaluateCase({country,region:country==='GB'?'GB-WLS':country==='US'?'US-TX':country==='CA'?'CA-NS':'AU-VIC',extraction});
  return {bytes,extraction,found:issues.issuesFor({extraction,evaluation:assessed}).filter(i=>i.eligible)};
}
async function run(t,check) {
  for(const country of ['CA','US','GB','AU']) {
    const actual=source(t,country), rows=actual.extraction.records.filter(r=>r.facts['account.reported_identity']);
    check.equal(rows.length,2,country+' reads two separate physical account rows');
    check.equal(rows[0]?.facts['account.balance'],100,'first own balance');
    check.equal(rows[1]?.facts['account.balance'],0,'second own balance');
    check.equal(rows[0]?.facts['liability.openedDate'],'2020-01-15','first own opening date');
    check.equal(rows[1]?.facts['liability.openedDate'],'2021-02-16','second own opening date');
    check.ok(rows.every(r=>!r.facts['account.pastDueAmount']&&!r.facts['account.masked_identifier']),
      'unlinked detail values are never assigned to the last account');
    check.ok(sourceForField(rows[0],'account.balance')?.location?.caption_location?.bbox,
      'own caption and value geometry is retained');
    const selected=actual.found.filter(i=>i.check_id==='COMMON-ERROR-ENTRY-REPORTED-AFTER-REPORT-DATE');
    check.equal(selected.length,1,'one future report date reaches the existing checklist');
    check.equal(selected[0]?.record_index,rows[0]?.record_index,'only first account supplies the issue');
    check.equal(source(t,country,false).found.filter(i=>i.check_id==='COMMON-ERROR-ENTRY-REPORTED-AFTER-REPORT-DATE').length,0,
      'inside-report-date guard is benign');
  }
  for(const token of ['$100','Balance','2027-09-12','Reported']) {
    const own=source(t,'GB',true,model=>{for(const w of model.pages[0].word_boxes)if(w.text===token)w.trusted=false;});
    const row=own.extraction.records.find(r=>r.facts['account.reported_identity']==='CEDAR BANK');
    const field=token==='$100'||token==='Balance'?'account.balance':'reportedAccount.reportedDate';
    check.equal(sourceForField(row,field),null,'untrusted own caption/value withholds decisive fact');
    check.equal(row?.facts['liability.openedDate'],'2020-01-15','independent readable opening date survives');
    if(field==='reportedAccount.reportedDate')check.equal(own.found.filter(i=>i.check_id==='COMMON-ERROR-ENTRY-REPORTED-AFTER-REPORT-DATE').length,0,
      'untrusted date cannot become a violation');
  }
  const missing=source(t,'GB',true,model=>{model.pages[0].word_boxes=model.pages[0].word_boxes.filter(w=>w.text!=='$100');});
  const missingRow=missing.extraction.records.find(r=>r.facts['account.reported_identity']==='CEDAR BANK');
  check.equal(sourceForField(missingRow,'account.balance'),null,'blank own balance cannot borrow second-row zero');
  check.equal(missingRow?.facts['reportedAccount.reportedDate'],'2027-09-12','blank unrelated balance does not suppress own date');
  const oldOpening=source(t,'GB',false,model=>{for(const w of model.pages[0].word_boxes)if(w.text==='2020-01-15')w.text='2010-01-15';});
  check.equal(oldOpening.found.filter(i=>i.basis_type==='STATUTORY_RETENTION'||i.check_id==='COMMON-ERROR-REPORTING-PERIOD-EXCEEDED').length,0,
    'an old opening date is not a UK default/settlement anchor or invented temporal violation');
  const owner=await t.unpaidAccount('summary-table@example.test');await t.pay(owner,'monthly');
  const src=source(t,'GB');const opened=await t.request('POST','/api/cases',{token:owner.token,body:{country:'GB',region:'GB-WLS'}});
  const id=opened.json.case.case_id, endpoint='/api/cases/'+id;
  check.equal((await t.request('POST',endpoint+'/files',{token:owner.token,body:{originalFilename:'fictional-summary.pdf',declaredBytes:src.bytes.length,mimeType:'application/pdf',contentBase64:src.bytes.toString('base64')}})).status,201,'native summary uploads');
  check.equal((await t.request('POST',endpoint+'/evaluate',{token:owner.token})).status,201,'native summary evaluates');
  const view=(await t.request('GET',endpoint+'/packet',{token:owner.token})).json.view;
  const selected=view.eligible_issues.find(i=>i.issue_id===src.found.find(i=>i.check_id==='COMMON-ERROR-ENTRY-REPORTED-AFTER-REPORT-DATE')?.issue_id)
    ||view.eligible_issues.find(i=>i.source_facts?.some(f=>f.normalized_value==='2027-09-12'));
  check.ok(selected,'source-linked summary issue is selectable');
  if(selected) {
    check.equal((await t.request('POST',endpoint+'/packet/select',{token:owner.token,body:{issue_ids:[selected.issue_id]}})).status,200,'select own issue');
    await t.preparePostalPacket(owner,id);
    check.equal((await t.request('POST',endpoint+'/packet/approve',{token:owner.token})).status,200,'approve selected packet');
    const download=await t.request('GET',endpoint+'/packet-download',{token:owner.token});
    check.equal(download.status,200,'approved actual packet downloads');
    check.ok(download.text.includes('Cedar Bank')&&download.text.includes('2027-09-12'),'packet preserves own creditor and decisive date');
  }
  return {scope:'fictional native six-column summary family, four country routes; one GB packet',
    unsupported:'not bureau-wide certification; no missing identity or UK temporal authority fabricated'};
}
module.exports={id:'ev-native-account-summary',title:'Physical summary rows deliver own sourced checklist issues',run};
