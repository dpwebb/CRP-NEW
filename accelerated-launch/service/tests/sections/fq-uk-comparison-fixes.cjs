'use strict';
const {row,put,identity}=require('./fn-au-comparison-fixes.cjs'),reviews=require('../../au-comparison-concerns.cjs'),issues=require('../../issues.cjs'),general=require('../../general-intake.cjs');
const env={country:'GB',region:'GB-ENG',assessment_clock:{assessment_date:'2026-10-12'}};
const ext=records=>({support:'ACTUAL_REPORT_EVIDENCE',source_file_id:'own-file',bureau:'Fictional UK issuer',records,report_concern_evidence:[]});
const find=(x,kind)=>reviews.concernsFor(x,env).filter(i=>i.concern_kind===kind);
async function run(t,check){
 const location=row(1).location;
 for(const [postcode,expected]of [['QS2 2CI',1],['VA3 2QT',1],['XZ2 2FX',1],['9TFL4E',1],['M1 1AA',0],['EC1A 1BB',0],['GIR 0AA',0],['BFPO 12',0],['FIQQ 1ZZ',0]]){
  const x=ext([]);x.report_concern_evidence=[{kind:'ADDRESS_COMPONENTS',role:'PREVIOUS',components:{country:'GB',postcode},raw_value:postcode,source_field:'Previous address',location,trusted:true}];
  const out=find(x,'GB_POSTCODE_FORMAT');check.equal(out.length,expected,'UK postal format '+postcode);if(out.length)check.equal(issues.isEligible(out[0]),true,'source-linked postcode issue is selectable');
  x.report_concern_evidence[0].components.country='AU';check.equal(find(x,'GB_POSTCODE_FORMAT').length,0,'foreign country does not borrow UK rule');
  x.report_concern_evidence[0].components.country='GB';x.report_concern_evidence[0].location={...location,trusted:false};check.equal(find(x,'GB_POSTCODE_FORMAT').length,0,'untrusted address is withheld');
 }
 const r=identity(row(1));const ref={...r.report_reference_date,raw:'03/06/2026',normalized:null,normalized_value:null,status:'EXTRACTION_UNRESOLVED',interpretations:['2026-03-06','2026-06-03']};r.report_reference_date=ref;
 r.au_fields={'reportedAccount.reportedDate':{raw:'03/06/2026',label:'Reported',location,interpretations:ref.interpretations}};
 check.equal(find(ext([r]),'SOURCE_DATE_CHRONOLOGY_REVIEW').length,0,'identical ambiguous dates share source convention');
 r.au_fields['reportedAccount.reportedDate']={raw:'22/06/2026',label:'Reported',location,interpretations:['2026-06-22']};
 check.equal(find(ext([r]),'SOURCE_DATE_CHRONOLOGY_REVIEW').length,1,'distinct later date retains qualified chronology');
 const collection=identity(row(2,'GENERAL_COLLECTION'));put(collection,'collection.lastReportedDate','6 June 2020','2020-06-06');collection.report_reference_date={...collection.report_reference_date,raw:'15 June 2026',normalized:'2026-06-15',normalized_value:'2026-06-15'};
 const old=find(ext([collection]),'OLD_COLLECTION_REVIEW')[0];check.ok(old,'UK six-year fallback triggers without AU extra month');check.equal(old.evidence.period_years,6,'UK period preserved');check.ok(old.uncertainty.includes('determining fallback'),'fallback is disclosed');
 put(collection,'default.defaultDate','6 June 2025','2025-06-06');check.equal(find(ext([collection]),'OLD_COLLECTION_REVIEW').length,0,'known newer primary default defeats fallback');
 for(const status of ['DEFAULT','SETTLED','PAID']){const priorDefault=identity(row(5));put(priorDefault,'account.status',status,status);put(priorDefault,'default.defaultDate','6 June 2018','2018-06-06');check.equal(find(ext([priorDefault]),'GB_DEFAULT_RETENTION_REVIEW').length,1,'printed original default clock survives '+status+' status');}
 const noDefault=identity(row(6));put(noDefault,'account.status','Default','DEFAULT');check.equal(find(ext([noDefault]),'GB_DEFAULT_RETENTION_REVIEW').length,0,'status alone does not invent original default date');
 const settled=identity(row(3));put(settled,'account.status','Settled','SETTLED');put(settled,'account.balance','GBP118',118);put(settled,'account.settlementDate','8 January 2024','2024-01-08');check.equal(find(ext([settled]),'SETTLEMENT_BALANCE_REVIEW').length,1,'settlement with positive balance is qualified review');
 put(settled,'account.reportRemarks','Partial settlement with remaining balance agreed');check.equal(find(ext([settled]),'SETTLEMENT_BALANCE_REVIEW').length,0,'explicit partial settlement is a control');
 const association=identity(row(4,'GENERAL_ASSOCIATION'));put(association,'account.reportRemarks','Consumer says no joint account and same surname is coincidental.');check.equal(find(ext([association]),'FINANCIAL_ASSOCIATION_REVIEW').length,1,'own association denial is qualified');put(association,'account.reportRemarks','Consumer shares the surname');check.equal(find(ext([association]),'FINANCIAL_ASSOCIATION_REVIEW').length,0,'surname alone is benign');
 check.equal(general.detect({pages:[{text:'United Kingdom bank statement Account number 101 Status Open Balance GBP25',has_native_text:true}]}).outcome,'UNRELATED','bank statement is not UK disclosure');
 const tables=require('../../account-summary-table.cjs'),words=[],add=(text,x,y)=>words.push({text,x0:x,y0:y,x1:x+text.length*3,y1:y+8,trusted:true});
 ['Creditor','Recent 12 Month History','Remarks'].forEach((s,i)=>add(s,[30,180,360][i],40));
 ['Fictional Lender','OK OK 30 60 OK OK','Consumer disputes after resolution'].forEach((s,i)=>add(s,[30,180,360][i],55));
 const notes=tables.summaryTableLines({page:1,source:'NATIVE_TEXT',words,lines:[]}).report_note_rows;
 check.equal(notes.length,1,'publisher history heading may contain a numeric duration');
 check.equal(notes[0]?.remarks.raw,'Consumer disputes after resolution','own status-dispute remark is retained');
 check.equal(notes[0]?.history.raw,'OK OK 30 60 OK OK','history values retained without inventing monthly labels');
 return {scope:'UK source-owned postal/date/retention/association controls; no original-report HTTP cycles'};
}
module.exports={run,id:'fq-uk-comparison-fixes',title:'UK comparison repairs preserve source custody, date conventions and qualified controls'};
