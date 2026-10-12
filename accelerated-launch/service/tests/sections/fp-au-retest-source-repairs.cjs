'use strict';
const fs=require('node:fs'),path=require('node:path');
const formats=require('../../formats.cjs'),issues=require('../../issues.cjs');
const tables=require('../../account-summary-table.cjs');
const assembly=require('../../multi-file-assembly.cjs'),reviews=require('../../au-comparison-concerns.cjs');
const {pdfText}=require('../packet-pdf-assertions.cjs');
const {buildWordPdf}=require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');

// Fictional positioned source reproduces the geometry defects, with no original
// consumer PDF, identifiers, filename expectation or report-owned authority.
function fixture({differentReference=false,combinedType=false}={}) {
  const words=[],put=(text,x,y)=>words.push({text,x,y});
  put('Equifax Consumer Credit Report - FICTIONAL TEST DATA',30,20);
  put('Report date: 12 June 2026',30,40);
  put('PREVIOUS ADDRESS',310,60);put('19 Fictional Road, Unverified',310,73);
  put('DATE OF BIRTH',30,75);put('City, AU ABC123, Australia',310,85);
  put('CONTACT',310,100);put('+61 555 0100',310,113);
  put('ACCOUNT SUMMARY',30,145);
  const xs=[30,140,180,240,335,430,525,615,710,805];
  ['Creditor','Account','Type','Opened','Closed','Reported','Status','Balance','Limit','Payment'].forEach((text,i)=>put(text,xs[i],165));
  for(let r=0;r<2;r++) {
    const cells=['Fictional Card',r&&differentReference?'****5678':'****1234','Credit Card','09/10/2023','N/A','12/06/2026','Current','AUD 250','AUD 500','AUD 25'];
    if(combinedType){cells[1]='Credit Card';cells[2]='';}
    cells.forEach((text,i)=>{if(text)put(text,xs[i],185+r*24);});
  }
  put('DEFAULTS',30,255);
  ['Credit provider','Account','Default date','Default amount','Paid date','Status','Remarks'].forEach((text,i)=>put(text,[30,140,240,335,430,525,615][i],275));
  ['Fictional Default','****9876','12 Mar 2021','AUD 300','24 Mar 2022','Unpaid','Paid in full on 24 March 2022'].forEach((text,i)=>put(text,[30,140,240,335,430,525,615][i],295));
  return buildWordPdf([{words}],{page_size:{width:1100,height:400},font_size:8,
    producer:'Fictional AU retest source geometry',creator:'Fictional AU retest source geometry'});
}
function read(t,options) {
  const file=path.join(t.dataDir,'fictional-retest-'+(options?.differentReference?'different':options?.combinedType?'combined':'same')+'.pdf');
  fs.writeFileSync(file,fixture(options));
  return formats.extractWithSharedAdapter(formats.buildPdfDocumentModel(file),{mode:'REPORT',country:'AU'});
}
async function run(t,check) {
  const x=read(t);
  const accounts=x.records.filter(row=>row.kind==='GENERAL_ACCOUNT'&&row.facts['account.reported_identity']==='FICTIONAL CARD');
  check.equal(accounts.length,2,'close headings preserve the two physical account rows');
  check.ok(accounts.every(row=>row.facts['account.masked_identifier']==='MASK-1234'),'masked references remain attached to their own measured cells');
  check.ok(accounts.every(row=>row.facts['account.type']==='CREDIT CARD'),'Account/Type split retains the independent type');
  check.ok(accounts.every(row=>Object.values(row.printed).some(value=>value.kind==='date'&&value.interpretations?.length===2)),
    'ambiguous opened date keeps both readings rather than inventing a convention');
  const malformed=x.report_concern_evidence.find(row=>row.components?.postcode==='ABC123');
  check.ok(malformed?.trusted,'other-column caption does not truncate the own wrapped postcode');
  check.ok(!JSON.stringify(malformed).includes('+61'),'phone is not included in address evidence');
  const custodyInput=JSON.parse(JSON.stringify(x));
  const custodyAccount=custodyInput.records.find(row=>row.facts['account.masked_identifier']==='MASK-1234');
  custodyAccount.printed['account.masked_identifier'].location.file_id='foreign-file';
  const before=JSON.stringify(custodyInput);
  const assembled=assembly.assemble([{file_id:'fixture-file',sequence:1,stored_sha256:'fictional-fixture-digest',extraction:custodyInput}]).extraction;
  const custodyOutput=assembled.records.find(row=>row.facts['account.masked_identifier']==='MASK-1234');
  check.equal(custodyOutput.printed.Status.location.file_id,'fixture-file','legacy printed geometry receives the measured per-file custody');
  check.equal(custodyOutput.printed['account.masked_identifier'].location.file_id,'foreign-file','explicit foreign field identity is retained for rejection');
  check.equal(reviews.own(custodyOutput,'account.masked_identifier'),null,'foreign identifying source cannot support a pair');
  check.equal(JSON.stringify(custodyInput),before,'assembly annotation does not mutate the persisted per-file readings');
  const combined=read(t,{combinedType:true});
  check.ok(combined.records.filter(row=>row.facts['account.reported_identity']==='FICTIONAL CARD')
    .every(row=>!row.facts['account.masked_identifier']),'genuine combined Account Type header is not split without an aligned identifying cell');
  const different=read(t,{differentReference:true});
  const differentIssues=issues.issuesFor({extraction:different,evaluation:{country:'AU',region:'AU-NSW',assessment_clock:{assessment_date:'2026-10-12'}}});
  check.equal(differentIssues.filter(row=>row.concern_kind==='CORROBORATED_PRINTED_DUPLICATE').length,0,'different own references do not create a duplicate concern');

  const owner=await t.account('fictional-au-retest@example.test');
  const id=(await t.request('POST','/api/cases',{token:owner.token,body:{country:'AU',region:'AU-NSW',bureau:'EQUIFAX'}})).json.case.case_id;
  const endpoint='/api/cases/'+id,bytes=fixture();
  check.equal((await t.request('POST',endpoint+'/files',{token:owner.token,body:{originalFilename:'fictional-native-retest.pdf',declaredBytes:bytes.length,mimeType:'application/pdf',contentBase64:bytes.toString('base64')}})).status,201,'fictional measured source uploads');
  check.equal((await t.request('POST',endpoint+'/evaluate',{token:owner.token})).status,201,'fictional measured source reaches actual assessment');
  const stored=t.service.store.state().results.find(row=>row.case_id===id);
  const actual=issues.issuesFor({extraction:stored.extraction,evaluation:stored.evaluation});
  const kinds=['CORROBORATED_PRINTED_DUPLICATE','AU_POSTCODE_FORMAT','DEFAULT_PAID_STATEMENT'];
  const chosen=actual.filter(row=>kinds.includes(row.concern_kind));
  check.equal(chosen.length,3,'each repaired defect reaches one source-bound issue');
  check.equal(chosen.find(row=>row.concern_kind=== 'CORROBORATED_PRINTED_DUPLICATE')?.confidence,'PROBABLE','masked collision uncertainty remains probable');
  check.equal(chosen.find(row=>row.concern_kind=== 'AU_POSTCODE_FORMAT')?.confidence,'DEFINITE','printed postcode format discrepancy remains definite');
  check.equal(chosen.find(row=>row.concern_kind=== 'DEFAULT_PAID_STATEMENT')?.confidence,'DEFINITE','printed unpaid/paid-note conflict remains definite');
  check.ok(chosen.every(issues.isEligible),'all repaired findings qualify for consumer-selected factual packets');
  check.ok(chosen.every(row=>row.source_facts.every(source=>source.location?.file_id===row.report_identity.file_id)),
    'each issue retains own source-file association: '+JSON.stringify(chosen.map(row=>({kind:row.concern_kind,report_file_known:!!row.report_identity?.file_id,
      sources:row.source_facts.map(source=>({field:source.field,supporting:source.supporting_evidence===true,file_known:!!source.location?.file_id,
        matches:source.location?.file_id===row.report_identity?.file_id}))}))));
  check.equal((await t.request('POST',endpoint+'/packet/select',{token:owner.token,body:{issue_ids:chosen.map(row=>row.issue_id)}})).status,200,'consumer can select the three repaired findings');
  await t.preparePostalPacket(owner,id);
  const preview=(await t.request('GET',endpoint+'/packet',{token:owner.token})).json.view;
  check.ok(/different accounts.*same last digits/i.test(preview.packet.correspondence_preview),'duplicate alternatives remain understandable in review');
  check.ok(/September 10, 2023.*October 9, 2023/i.test(preview.packet.correspondence_preview),'both source-supported opening-date readings remain in review');
  check.ok(/actual payment|payment clearance|verify the payment|check the payment/i.test(preview.packet.correspondence_preview),'printed payment conflict does not establish actual payment');
  check.equal((await t.request('POST',endpoint+'/packet/approve',{token:owner.token})).status,200,'consumer approves the current reviewed source packet');
  const download=await t.request('GET',endpoint+'/packet-download',{token:owner.token});
  check.equal(download.status,200,'approved packet downloads');
  const text=pdfText(download.bytes);
  check.ok(/postcode/i.test(text)&&/two rows|duplicate/i.test(text)&&/payment/i.test(text),'download retains all three selected requests');
  check.ok(!/not legal advice|COMMON-ERROR-/i.test(text),'consumer packet exposes no internal IDs or legal-advice disclaimer');
  const out=path.join(__dirname,'../../out/au-retest-source-repairs');fs.mkdirSync(out,{recursive:true});
  fs.writeFileSync(path.join(out,'fictional-repaired-packet.pdf'),download.bytes);
  return {scope:'fictional measured native source and selected packet; not additional original-corpus cycles or hosted proof'};
}
module.exports={id:'fp-au-retest-source-repairs',title:'AU wrapped-address, close-header and printed payment conflicts reach selected packets',run,fixture};
