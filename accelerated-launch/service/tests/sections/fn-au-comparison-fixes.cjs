'use strict';
const reviews=require('../../au-comparison-concerns.cjs');
const concerns=require('../../report-concerns.cjs');
const general=require('../../general-intake.cjs');
const {printedAmount}=require('../../report-amount.cjs');
const issues=require('../../issues.cjs');
const crypto=require('node:crypto');

const loc=(page=1,line=1)=>({page,line,source:'NATIVE_TEXT',trusted:true,bbox:{x0:30,y0:line*12,x1:180,y1:line*12+8},file_id:'own-file'});
function row(index,kind='GENERAL_ACCOUNT') {
  return {record_index:index,kind,kind_label:'account',status:'RESOLVED',shared_facts_status:'RESOLVED',source_file_id:'own-file',
    source_bureau:'Unidentified Australian issuer',report_segment_id:'segment-1',facts:{},fact_sources:{},printed:{},
    location:loc(1,index),report_reference_date:{raw:'12 Jun 2026',normalized:'2026-06-12',normalized_value:'2026-06-12',status:'RESOLVED',location:loc(1,1)}};
}
function put(row,field,raw,value=raw,location=loc(1,row.record_index+1)) {
  row.facts[field]=value;
  row.fact_sources[field]={raw_value:raw,normalized_value:value,source_field:field,record_index:row.record_index,
    trusted:true,status:'RESOLVED',caption_count:1,location};return row;
}
function identity(row,name='Fictional Lender',id='source-token') {
  put(row,'account.reported_identity',name,name.toUpperCase());put(row,'account.sourceLocatorToken','Source reference [redacted]',id);
  return row;
}
const extraction=records=>({support:'ACTUAL_REPORT_EVIDENCE',bureau:'Unidentified Australian issuer',source_file_id:'own-file',records,report_concern_evidence:[]});
const evaluation={country:'AU',region:'AU-NSW',assessment_clock:{assessment_date:'2026-10-12'}};
const find=(records,kind)=>reviews.concernsFor(extraction(records),evaluation).filter(issue=>issue.concern_kind===kind);

async function run(t,check) {
  for(const [raw,value] of [['AUD 250',250],['AUD 6,500',6500],['$132 AUD',132],['AUD -25',-25],['(AUD 25)',-25],['AUD 25 USD',null],['Not reported',null],['AUD 12,34',null],['AUD 250 historical',null]])
    check.equal(printedAmount(raw),value,'complete printed currency amount '+raw);
  check.equal(general.detect({pages:[{text:'Australia consumer credit report. Consumer Credit Report. Credit Account Information. Account number X-101. Opened 12 Jun 2020. Status Open. Credit Enquiries. Report date 12 Jun 2026',lines:[],has_native_text:true}]}).outcome,'UNRELATED','report words alone without the actual native account structure do not admit an unbranded document');
  check.equal(general.detect({pages:[{text:'Australia bank statement. Account number 101. Status Open. Balance $25',lines:[],has_native_text:true}]}).outcome,'UNRELATED','ordinary bank statement remains unrelated');
  const owned=identity(row(1));put(owned,'account.reportRemarks','Consumer states account does not belong to them');
  check.equal(find([owned],'ACCOUNT_OWNERSHIP_REVIEW').length,1,'explicit source-owned ownership denial is selectable');
  put(owned,'account.reportRemarks','Creditor name is unfamiliar');
  check.equal(find([owned],'ACCOUNT_OWNERSHIP_REVIEW').length,0,'unfamiliar name alone is benign');
  const status=identity(row(2));put(status,'account.status','Charge Off','CHARGE OFF');put(status,'account.reportRemarks','Consumer disputes account status');
  check.equal(find([status],'ACCOUNT_STATUS_DISPUTE').length,1,'attributed adverse-status dispute is a potential review');
  put(status,'account.reportRemarks','Account previously past due. OK OK');
  check.equal(find([status],'ACCOUNT_STATUS_DISPUTE').length,0,'undated good history never disproves a charge-off');
  const balance=identity(row(3));put(balance,'account.balance','AUD 7,240',7240);put(balance,'account.creditLimit','AUD 6,500',6500);put(balance,'account.reportRemarks','Balance amount disputed by consumer');
  const balanceIssue=find([balance],'ACCOUNT_BALANCE_DISPUTE')[0];
  check.equal(balanceIssue.confidence,'POTENTIAL','balance dispute does not become a definite error');
  check.equal(issues.isEligible(balanceIssue),true,'governed balance verification reaches packet eligibility');
  put(balance,'account.reportRemarks','Balance includes interest and fees');
  check.equal(find([balance],'ACCOUNT_BALANCE_DISPUTE').length,0,'over-limit balance without dispute is benign');
  const inquiry=identity(row(4,'GENERAL_INQUIRY'));put(inquiry,'enquiry.authorized','No');put(inquiry,'enquiry.purpose','Credit application');
  check.equal(find([inquiry],'INQUIRY_PURPOSE_REVIEW').length,1,'affirmative no calls for purpose verification, not a consent breach');
  for(const value of ['Yes','Not verified','']) {put(inquiry,'enquiry.authorized',value);check.equal(find([inquiry],'INQUIRY_PURPOSE_REVIEW').length,0,'authorization '+value+' is not denial');}
  const collection=identity(row(5,'GENERAL_COLLECTION'));put(collection,'reportedAccount.reportedDate','13/06/2020','2020-06-13');
  check.equal(find([collection],'OLD_COLLECTION_REVIEW').length,1,'old last-reported collection supports qualified review');
  put(collection,'reportedAccount.reportedDate','31 May 2026','2026-05-31');put(collection,'collection.assignedDate','18 Jan 2019','2019-01-18');
  check.equal(find([collection],'OLD_COLLECTION_REVIEW').length,0,'old assignment alone does not trigger collection expiry');
  const court=identity(row(6,'GENERAL_PUBLIC_RECORD'));put(court,'publicRecord.type','Civil Judgment');put(court,'publicRecord.filedDate','18 Jan 2017','2017-01-18');
  check.equal(find([court],'OLD_COURT_ENTRY_REVIEW').length,1,'old filing is a potential verification concern');
  put(court,'publicRecord.judgmentEntryDate','12 Jun 2025','2025-06-12');
  check.equal(find([court],'OLD_COURT_ENTRY_REVIEW').length,0,'known later judgment resolves old-filing-only concern');
  const defaultRow=identity(row(7,'AU_DEFAULT_INFORMATION'));put(defaultRow,'default.originalAmount','$132',132);put(defaultRow,'default.defaultDate','18 Jan 2020','2020-01-18');
  const minimum=find([defaultRow],'AU_MINIMUM_DEFAULT_REVIEW')[0];
  check.equal(minimum.confidence,'PROBABLE','subminimum original amount is qualified probable');
  check.ok(minimum.uncertainty.includes('remaining amount'),'original versus residual amount distinction retained');
  check.equal(find([defaultRow],'AU_CATEGORY_RETENTION_REVIEW').length,1,'old default does not fabricate a bureau-collection anchor');
  put(defaultRow,'default.originalAmount','$150',150);
  check.equal(find([defaultRow],'AU_MINIMUM_DEFAULT_REVIEW').length,0,'threshold amount does not become subminimum');
  delete defaultRow.facts['default.originalAmount'];put(defaultRow,'account.balance','$132',132);
  check.equal(find([defaultRow],'AU_MINIMUM_DEFAULT_REVIEW').length,0,'residual balance is not original default amount');
  const hardship=identity(row(8,'AU_HARDSHIP_INFORMATION'));put(hardship,'hardship.periods','Mar 2024 - Apr 2024',['2024-03','2024-04']);
  check.equal(find([hardship],'AU_CATEGORY_RETENTION_REVIEW')[0].evidence.period_years,1,'hardship uses one year rather than default or RHI period');
  const account=identity(row(9));put(account,'liability.openedDate','15 May 2020','2020-05-15');put(account,'account.datedRepaymentHistory','Dated repayment months',[
    {period:'2024-06',code:'0',trusted:true,location:loc(1,20),period_location:loc(1,19)},
    {period:'2024-08',code:'A',trusted:true,location:loc(1,20),period_location:loc(1,19)}]);
  check.equal(find([account],'AU_CATEGORY_RETENTION_REVIEW')[0].evidence.current_file_contents_unknown,true,'old PDF supports current-file verification only');
  check.equal(find([account,hardship],'HARDSHIP_PERIOD_REVIEW').length,1,'linked different hardship representations remain potential');
  put(hardship,'account.sourceLocatorToken','Other source reference','other-token');
  check.equal(find([account,hardship],'HARDSHIP_PERIOD_REVIEW').length,0,'another account hardship cannot be borrowed');
  check.equal(find([account,defaultRow],'DEFAULT_OPENING_ORDER_REVIEW').length,1,'same exact source reference permits event-order verification');
  put(defaultRow,'account.sourceLocatorToken','Other source reference','other-token');
  check.equal(find([account,defaultRow],'DEFAULT_OPENING_ORDER_REVIEW').length,0,'same creditor with different reference is not the same facility');
  const clone=JSON.parse(JSON.stringify(balanceIssue));clone.request_wording='please remove every account';
  check.equal(issues.isEligible(clone),false,'changed evidence-bound request invalidates eligibility');
  const foreign=JSON.parse(JSON.stringify(balanceIssue));foreign.source_facts[0].location.file_id='foreign-file';
  check.equal(issues.isEligible(foreign),false,'foreign evidence cannot retain packet eligibility');
  const untrusted=identity(row(10));put(untrusted,'account.reportRemarks','Consumer states account does not belong to them');untrusted.fact_sources['account.reportRemarks'].trusted=false;
  check.equal(find([untrusted],'ACCOUNT_OWNERSHIP_REVIEW').length,0,'untrusted source statement is not affirmative evidence');
  const wrongCountry={...evaluation,country:'CA',region:'CA-NS'};
  check.equal(reviews.concernsFor(extraction([court,defaultRow]),wrongCountry).length,0,'AU-only rules stay outside other countries');
  const open=identity(row(11));open.au_source_mapping=true;put(open,'account.status','Open','OPEN');put(open,'liability.closedDate','04 Dec 2024','2024-12-04');
  const printedConflict=find([open],'OPEN_CLOSED_STATEMENT')[0];
  check.equal(printedConflict.confidence,'DEFINITE','definite printed contradiction remains distinct from a statutory breach');
  check.ok(printedConflict.uncertainty.includes('statute'),'printed conflict does not assert a definite statutory breach');
  put(open,'liability.closedDate','04 Dec 2027','2027-12-04');
  check.equal(find([open],'OPEN_CLOSED_STATEMENT').length,0,'future closure is not a definite past-closure contradiction');
  const ambiguous=identity(row(12,'GENERAL_COLLECTION'));
  ambiguous.printed.first={kind:'date',label:'Last Reported',raw:'04/06/2020',normalized:null,location:loc(1,30)};
  ambiguous.printed.own={kind:'date',label:'Last Reported',raw:'04/06/2020',normalized:null,interpretations:['2020-04-06','2020-06-04'],location:loc(1,30)};
  check.equal(find([ambiguous],'OLD_COLLECTION_REVIEW').length,1,'identical raw date readings retain their conservative alternatives');
  ambiguous.printed.conflict={kind:'date',label:'Last Reported',raw:'04/06/2026',normalized:null,interpretations:['2026-04-06','2026-06-04'],location:loc(1,31)};
  check.equal(find([ambiguous],'OLD_COLLECTION_REVIEW').length,0,'conflicting date captions do not select a convenient old date');
  const duplicateA=identity(row(13)),duplicateB=identity(row(14));
  for(const record of [duplicateA,duplicateB]) {
    put(record,'account.masked_identifier','****1234','MASK-1234');put(record,'account.status','Open','OPEN');put(record,'account.balance','AUD 250',250);
    record.printed.date={kind:'date',label:'Opened Date',raw:'09/10/2023',normalized:null,interpretations:['2023-09-10','2023-10-09'],location:loc(1,record.record_index)};
  }
  check.equal(find([duplicateA,duplicateB],'CORROBORATED_PRINTED_DUPLICATE').length,1,'raw date corroboration does not force a date convention');
  put(duplicateB,'account.balance','AUD 251',251);
  check.equal(find([duplicateA,duplicateB],'CORROBORATED_PRINTED_DUPLICATE').length,0,'conflicting independent amount defeats duplicate pairing');
  const addresses=require('../../account-summary-table.cjs');const words=[];
  const word=(text,x,y)=>words.push({text,x0:x,y0:y,x1:x+text.length*4,y1:y+7});
  word('PREVIOUS ADDRESS',310,40);word('19 Example Road, Unverified',310,53);word('CONTACT',310,62);word('City, AU ABC123, Australia',310,65);word('+61 1234',310,80);
  const read=addresses.reportConcernEvidence({page:1,source:'NATIVE_TEXT',words});
  check.ok(read.some(item=>item.components?.postcode==='ABC123'),'own wrapped malformed postcode survives an overlapping contact caption');
  const post=extraction([]);post.reference_date=row(1).report_reference_date;post.report_concern_evidence=read;
  const postcode=reviews.concernsFor(post,evaluation).find(issue=>issue.concern_kind==='AU_POSTCODE_FORMAT');
  check.equal(postcode?.confidence,'DEFINITE','explicit AU alphanumeric postcode is a definite format discrepancy');
  check.ok(!JSON.stringify(read).includes('+61'),'phone value is not captured as address content');
  const wrappedWords=[];
  const wrapWord=(text,x,y)=>wrappedWords.push({text,x0:x,y0:y,x1:x+text.length*4,y1:y+7});
  wrapWord('PREVIOUS ADDRESS',310,40);wrapWord('19 Example Road, Unverified',310,53);
  wrapWord('DATE OF BIRTH',30,55);wrapWord('City, AU ABC123, Australia',310,65);
  wrapWord('CONTACT',310,80);wrapWord('+61 1234',310,92);
  const otherColumn=addresses.reportConcernEvidence({page:1,source:'NATIVE_TEXT',words:wrappedWords});
  check.ok(otherColumn.some(item=>item.components?.postcode==='ABC123'),'left-column caption does not truncate the own right-column address wrap');
  check.ok(!JSON.stringify(otherColumn).includes('+61'),'contact data remains outside the continued address');
  const paidDefault=identity(row(32,'AU_DEFAULT_INFORMATION'));put(paidDefault,'account.status','Unpaid','UNPAID');
  put(paidDefault,'account.reportRemarks','Paid in full on 24 March 2022');
  put(paidDefault,'account.consumerStatement','I dispute this unpaid status.');
  const printedPaid=find([paidDefault],'DEFAULT_PAID_STATEMENT')[0];
  check.equal(printedPaid?.confidence,'DEFINITE','own direct paid-in-full report note retains definite printed-conflict confidence');
  check.ok(printedPaid?.source_facts.some(source=>source.field==='account.reportRemarks'),'consumer statement does not replace the stronger own report note');
  check.ok(printedPaid?.uncertainty.includes('actual payment clearance'),'printed conflict does not establish actual payment or a statutory breach');
  put(paidDefault,'account.reportRemarks','Consumer says paid in full on 24 March 2022');
  check.equal(find([paidDefault],'DEFAULT_PAID_STATEMENT')[0]?.confidence,'POTENTIAL','attributed consumer payment claim remains a qualified verification request');
  put(paidDefault,'account.reportRemarks','Paid in full then payment reversed');
  check.equal(find([paidDefault],'DEFAULT_PAID_STATEMENT').length,0,'source-explained reversal does not establish a printed contradiction');
  const chron=identity(row(15));chron.report_reference_date={raw:'10/01/2026',normalized:null,status:'EXTRACTION_UNRESOLVED',interpretations:['2026-01-10','2026-10-01'],location:loc(1,33)};
  put(chron,'reportedAccount.reportedDate','22/06/2026','2026-06-22');
  check.equal(find([chron],'SOURCE_DATE_CHRONOLOGY_REVIEW')[0]?.confidence,'POTENTIAL','concrete header/update ambiguity becomes one qualified review');
  chron.report_reference_date.interpretations=['2026-11-10','2026-12-10'];
  check.equal(find([chron],'SOURCE_DATE_CHRONOLOGY_REVIEW').length,0,'updates earlier than every viable report-date reading are benign');
  const original=identity(row(16),'Fictional Original','original-token');put(original,'account.status','Closed / sold','CLOSED / SOLD');put(original,'account.balance','AUD 0',0);
  const purchaser=identity(row(17),'Fictional Recovery','purchaser-token');put(purchaser,'collection.originalCreditor','Fictional Original','FICTIONAL ORIGINAL');put(purchaser,'collection.sourceOriginalLocator','Source locator [redacted]','original-token');
  put(purchaser,'account.consumerStatement','I dispute Fictional Recovery because it appears to duplicate the Fictional Original account locator.');put(purchaser,'account.balance','AUD 400',400);
  const relationship=find([original,purchaser],'PURCHASER_RELATIONSHIP_REVIEW')[0];
  check.equal(relationship?.evidence.duplicate_debt_established,false,'attributed purchaser concern never becomes duplicate debt');
  delete purchaser.facts['account.consumerStatement'];
  check.equal(find([original,purchaser],'PURCHASER_RELATIONSHIP_REVIEW').length,0,'legitimate transfer without a source dispute remains benign');
  const generic=identity(row(18));put(generic,'account.reportRemarks','Consumer states account does not belong to them');
  check.ok(reviews.concernsFor(extraction([generic]),{country:'GB',region:'GB-ENG'}).some(issue=>issue.concern_kind==='ACCOUNT_OWNERSHIP_REVIEW'),
    'independent sourced accuracy concern remains useful in another supported country');
  check.ok(reviews.concernsFor(extraction([generic]),{country:'GB',region:'GB-ENG'}).every(issue=>issue.concern_sources.length===0),
    'generic UK verification does not inherit AU legal guidance');
  const grid=find([account],'AU_CATEGORY_RETENTION_REVIEW')[0];
  const publicGrid=issues.publicIssue(grid);
  check.ok(!JSON.stringify(publicGrid.source_facts).includes('[object Object]'),'dated history is presented as a concise reading rather than a raw object');
  check.ok(publicGrid.source_facts.some(fact=>typeof fact.normalized_value==='string'&&fact.normalized_value.includes('dated repayment entries')),
    'public history evidence retains the number and range of source-read entries');
  const secondAccount=JSON.parse(JSON.stringify(account));secondAccount.record_index=30;
  Object.values(secondAccount.fact_sources).forEach(source=>source.record_index=30);
  check.equal(find([account,secondAccount],'AU_CATEGORY_RETENTION_REVIEW').filter(issue=>issue.evidence.category==='RHI').length,1,
    'same-report dated history reviews group into one source-owned issue');
  secondAccount.source_file_id='second-file';secondAccount.report_segment_id='segment-2';secondAccount.location.file_id='second-file';
  secondAccount.report_reference_date.location.file_id='second-file';
  Object.values(secondAccount.fact_sources).forEach(source=>source.location.file_id='second-file');
  const separate=find([account,secondAccount],'AU_CATEGORY_RETENTION_REVIEW').filter(issue=>issue.evidence.category==='RHI');
  check.equal(separate.length,2,'separate source reports retain separate history reviews');
  check.ok(separate.every(reviews.isGovernedIssue),'multi-report history reviews retain eligibility and file custody');
  const foreignDefault=identity(row(31,'AU_DEFAULT_INFORMATION'));put(foreignDefault,'default.originalAmount','USD 132',132);
  check.equal(find([foreignDefault],'AU_MINIMUM_DEFAULT_REVIEW').length,0,'foreign-currency amount does not establish an AUD threshold concern');
  for(const symbol of ['£','€']) {
    put(foreignDefault,'default.originalAmount',symbol+'132',132);
    check.equal(find([foreignDefault],'AU_MINIMUM_DEFAULT_REVIEW').length,0,'foreign currency symbol '+symbol+' is not compared with an AUD minimum');
  }
  const currencyWords=[];
  function currencyWord(text,x,y){currencyWords.push({text,x0:x,y0:y,x1:x+text.length*4,y1:y+8,trusted:true});}
  [['Credit provider',30],['Account',170],['Default date',280],['Default amount',420]].forEach(([text,x])=>currencyWord(text,x,30));
  [['Fictional',30],['TEST-USD',170],['12 Mar 2019',280],['USD 132',420]].forEach(([text,x])=>currencyWord(text,x,50));
  const currencyRows=require('../../au-disclosure-fields.cjs').tableRecords({page:1,source:'NATIVE_TEXT',words:currencyWords},()=>({normalized:'2019-03-12'}),null).records;
  check.equal(currencyRows[0]?.facts['account.currency'],'USD','AU table reader retains an explicit foreign currency rather than relabelling it AUD');
  return {implemented_review_kinds:reviews.KINDS.length,source_version:reviews.VERSION,scope:'fictional typed facts; not original-corpus or hosted verification'};
}
module.exports={run,row,put,identity,id:'fn-au-comparison-fixes',title:'AU source-linked comparison fixes and qualified benign controls'};
