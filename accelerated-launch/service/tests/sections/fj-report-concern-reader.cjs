'use strict';
const fs=require('node:fs');
const path=require('node:path');
const formats=require('../../formats.cjs');
const {sourceForField}=require('../../report-fact-sources.cjs');
const {buildWordPdf}=require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');
let sequence=0;

// Fictional, explicitly marked layout input. No attached consumer PDF or copied
// identifiers are included in source control. Exported for the delivery tests.
function buildFixture(options={}) {
  const words=[], put=(text,x,y)=>{if(text) words.push({text,x,y});};
  put('Equifax Consumer Credit Report - FICTIONAL TEST FIXTURE',30,20);
  put('Prepared Date: 06/06/2026',710,40);
  put('CONSUMER IDENTIFICATION',30,65);
  put('NAME',30,85);put('CURRENT ADDRESS',510,85);
  put('Fictional Sample Person',30,99);put(options.currentAddress || (options.benign?'19 Sample Lane, Melbourne, VIC 3000, Australia':'19 Sample Lane, Melbourne, ACT 7728, Australia'),510,99);
  put('ALIASES',30,115);put('PREVIOUS ADDRESS',510,115);
  put('Fictional Sample',30,129);put(options.benign?'31 Example Road, Canberra, ACT 2601, Australia':'31 Example Road, Melbourne, NSW 1006, Australia; 42 Test Road,',510,129);
  if(!options.benign) put('Canberra, VIC 5841, Australia',510,141);
  put('DATE OF BIRTH',30,145);put('01/01/1980',30,159);
  put('TAX FILE NUMBER',30,172);put(options.tfnValue || 'XXX XXX 1234',30,185);
  put('ACCOUNT SUMMARY',30,208);
  let headers=['Creditor','Account','Type','Opened','Reported','Status','Balance','Limit','Payment'];
  if(options.reordered) headers=['Status','Balance','Creditor','Reported','Account','Payment','Type','Limit','Opened'];
  if(options.extraColumn) headers.push('Comment');
  if(options.closedDateColumn) headers.push('Closed Date');
  const xs=[30,185,245,325,410,495,575,665,755,850,920];
  const accounts=[
    {Creditor:'Cedar Card',Account:'****1122',Type:'Credit Card',Opened:'02/12/2018',Reported:'06/06/2026',Status:'Current',Balance:'$1,240 AUD',Limit:'$6,500 AUD',Payment:'$45 AUD'},
    {Creditor:options.duplicateName?'Cedar Card':'Birch Auto Finance',Account:'****2233',Type:'Auto Loan',Opened:'15/01/2021',Reported:'06/06/2026',Status:'Current',Balance:'$11,420 AUD',Limit:'N/A',Payment:'$318 AUD'},
    {Creditor:'Maple Retail',Account:'****3344',Type:'Retail Card',Opened:'21/03/2024',Reported:'06/06/2026',Status:'Current',Balance:'$320 AUD',Limit:'$2,200 AUD',Payment:'$30 AUD'},
    {Creditor:'Alder Education Loan',Account:'****4455',Type:'Student Loan',Opened:'16/11/2021',Reported:'06/06/2026',Status:'Paid',Balance:'$0 AUD',Limit:'N/A',Payment:'$0 AUD'}
  ];
  headers.forEach((header,i)=>put(header,xs[i],226));
  accounts.forEach((row,index)=>headers.forEach((header,i)=>put(options.omitBalance&&index===0&&header==='Balance'?'':header==='Comment'?'printed extra':row[header],xs[i],245+index*23)));
  put('PAYMENT HISTORY AND REMARKS',30,354);
  ['Creditor','Recent Payment History','Remarks'].forEach((text,i)=>put(text,[30,210,630][i],374));
  for(let i=0;i<4;i++) {
    const y=393+i*34, name=i===3?'Alder Education':accounts[i].Creditor;
    put(name,30,y);put(Array(21).fill(options.historyToken||'OK').join(' '),210,y);
    put(i===3?(options.negatedClosure?'Account paid in full; Not closed at consumer':'Account paid in full; Closed at consumer'):'Account in good standing',630,y);
    if(i===3) put('Loan',30,y+12);
    put(Array(3).fill(options.historyToken||'OK').join(' '),210,y+12);
    if(i===3) put('request',630,y+12);
  }
  put('COLLECTIONS',30,546);
  const collectionHeaders=['Agency','Original','Account','Assigned','Last','Status','Balance','Remarks'];
  const cx=[30,180,290,380,470,560,620,730];
  collectionHeaders.forEach((text,i)=>put(text,cx[i],566));
  put('Creditor',180,578);put('Reported',470,578);
  ['Acorn Recoveries','Maple Retail','****5566','31/01/2026','26/05/2026',options.benign?'Paid':'Open',options.benign?'$0 AUD':'$1,860 AUD',options.benign?'Account paid in full':'Consumer states collection was paid'].forEach((text,i)=>put(text,cx[i],597));
  put('Australia',30,609);if(!options.benign)put('before latest report',730,609);
  put('PUBLIC RECORDS',30,642);put('No public record information is reporting.',30,660);
  put('INQUIRIES',30,689);
  ['Subscriber','Date','Type','Purpose','Authorized'].forEach((text,i)=>put(text,[30,400,510,610,820][i],708));
  ['Fictional Mortgage Review','25/04/2026','Hard','Credit application','Yes'].forEach((text,i)=>put(text,[30,400,510,610,820][i],728));
  const second=[];
  ['Subscriber','Date','Type','Purpose','Authorized'].forEach((text,i)=>second.push({text,x:[30,400,510,610,820][i],y:30}));
  ['Fictional Account Review','29/05/2026','Soft','Account review','Yes'].forEach((text,i)=>second.push({text,x:[30,400,510,610,820][i],y:50}));
  return buildWordPdf([{words},{words:second}],{page_size:{width:1050,height:800},font_size:8,
    producer:'Fictional report-concern table fixture',creator:'Fictional report-concern table fixture'});
}
function readFixture(t,options={},mutate) {
  const file=path.join(t.dataDir,'report-concern-reader-'+(++sequence)+'.pdf');fs.writeFileSync(file,buildFixture(options));
  const model=formats.buildPdfDocumentModel(file);if(mutate)mutate(model);
  return formats.extractWithSharedAdapter(model,{mode:'REPORT',country:options.country||'AU'});
}
async function run(t,check) {
  const x=readFixture(t), accounts=x.records.filter(r=>r.kind==='GENERAL_ACCOUNT'), collection=x.records.find(r=>r.kind==='GENERAL_COLLECTION');
  check.equal(accounts.length,4,'nine-column summary yields exactly four accounts, no identity/DOB/history/inquiry phantom accounts');
  check.equal(x.records.filter(r=>r.kind==='GENERAL_INQUIRY').length,2,'inquiries on both pages keep their record kind');
  check.equal(x.records.length,7,'all seven owned entries have bounded source sections');
  check.deepEqual(accounts.map(r=>r.facts['account.balance']),[1240,11420,320,0],'each account owns its balance');
  check.deepEqual(accounts.map(r=>r.facts['account.paymentAmount']),[45,318,30,0],'payments retain their own column meaning');
  check.ok(accounts.every(r=>r.facts['account.currency']==='AUD'),'explicit AUD is retained independently of the dollar symbol');
  check.equal(accounts[0].facts['liability.openedDate'],undefined,'ambiguous numeric opening date is not guessed from Australia selection');
  check.equal(accounts[1].facts['liability.openedDate'],'2021-01-15','unambiguous own opening date resolves');
  check.equal(sourceForField(accounts[0],'account.balance')?.raw_value,'$1,240 AUD','exact balance currency stays in source evidence');
  check.equal(sourceForField(accounts[0],'account.balance')?.location.caption_location.printed_caption,'Balance','physical header and value geometry survives');
  check.equal(sourceForField(accounts[0],'reportedAccount.reportedDate')?.location.caption_location.printed_caption,'Reported','printed date caption is retained alongside normalized label');
  check.equal(accounts[1].facts['account.creditLimit'],undefined,'N/A limit never becomes zero');
  check.equal(collection.facts['account.display_name'],'Acorn Recoveries Australia','wrapped agency belongs to its own collection');
  check.equal(collection.facts['account.status'],'OPEN','consumer payment assertion never replaces furnished Open status');
  check.equal(sourceForField(collection,'account.reportRemarks')?.raw_value,'Consumer states collection was paid before latest report','wrapped assertion remains a source-linked statement');
  check.equal(sourceForField(collection,'reportedAccount.reportedDate')?.normalized_value,'2026-05-26','collection last-reported date retains source ownership');
  check.equal(collection.facts['collection.assignedDate'],'2026-01-31','assignment is distinct from last reported');
  check.ok(accounts.every(r=>sourceForField(r,'account.undatedPaymentHistory')?.normalized_value.count===24),'all four 24-token histories are linked by unique own name');
  check.ok(accounts.every(r=>!r.facts['account.paymentHistoryCells']?.length),'undated OK tokens never become dated payment-performance cells');
  check.equal(sourceForField(accounts[3],'account.closureStatement')?.raw_value,'Closed at consumer request','wrapped closure note links only to education account');
  check.equal(accounts[3].table_row_coverage.field_presence.closed_date,false,'bounded table records truly absent closed-date column separately from unread values');
  check.equal(accounts[3].table_row_coverage.complete,true,'physical row completeness is evidenced by its own populated columns');
  check.equal(x.report_concern_evidence.filter(e=>e.kind==='ADDRESS_COMPONENTS').length,3,'two-column current and wrapped former addresses produce component evidence');
  check.equal(x.report_concern_evidence.find(e=>e.kind==='IDENTIFIER_FIELD')?.raw_value,'Tax file number shown (masked)','TFN evidence contains no digits');
  const privateStructure=JSON.stringify(x.report_concern_evidence);
  check.ok(!/Sample Lane|Example Road|Test Road|Fictional Sample Person|XXX XXX|1234/.test(privateStructure),'new concern evidence excludes names, streets and TFN tail');
  check.ok(x.extraction_coverage.table_row_census.filter(row=>row.section!=='HISTORY_REMARKS').every(row=>row.visible_rows===row.parsed_rows),'internal source row census reconciles each account/collection/inquiry table');
  for(const country of ['CA','US','GB','AU']) {
    const variant=readFixture(t,{country,reordered:true,extraColumn:true});
    check.deepEqual(variant.records.filter(r=>r.kind==='GENERAL_ACCOUNT').map(r=>r.facts['account.balance']),[1240,11420,320,0],country+' shared layout handles changed header order and extra column');
    check.equal(variant.records.filter(r=>r.kind==='GENERAL_INQUIRY').length,2,country+' table layout never turns inquiries into accounts');
  }
  const unknown=readFixture(t,{historyToken:'Z9'});
  check.equal(unknown.records[0].facts['account.undatedPaymentHistory'].tokens[0],'Z9','unknown history code remains literal and unqualified');
  check.equal(unknown.records[0].facts['account.paymentHistoryCells'],undefined,'unknown token never becomes a missed payment');
  const duplicate=readFixture(t,{duplicateName:true});
  check.ok(duplicate.records.filter(r=>r.facts['account.reported_identity']==='CEDAR CARD').every(r=>!r.facts['account.reportRemarks']),'duplicate same-page names cannot borrow either remarks row');
  check.ok(duplicate.table_note_associations.some(row=>row.binding==='UNBOUND'),'ambiguous notes remain explicitly unbound internally');
  const missing=readFixture(t,{omitBalance:true});
  check.equal(sourceForField(missing.records[0],'account.balance'),null,'missing balance cannot borrow next row or payment column');
  check.equal(missing.records[0].table_row_coverage.complete,false,'missing own cell never proves physical row completeness');
  for(const token of ['Balance','$1,240']) {
    const untrusted=readFixture(t,{},model=>{for(const w of model.pages[0].word_boxes)if(w.text===token&&w.y0>220&&w.y0<260)w.trusted=false;});
    check.equal(sourceForField(untrusted.records[0],'account.balance'),null,'untrusted own '+token+' withholds balance');
    check.equal(sourceForField(untrusted.records[0],'account.paymentAmount')?.normalized_value,45,'untrusted balance does not suppress independent payment');
  }
  const untrustedIdentity=readFixture(t,{},model=>{for(const w of model.pages[0].word_boxes)if(w.text==='Cedar'&&w.y0>240&&w.y0<260)w.trusted=false;});
  check.equal(untrustedIdentity.records[0].facts['account.reportRemarks'],undefined,'untrusted identity never owns an otherwise readable remarks row');
  const absentIdentity=readFixture(t,{},model=>{model.pages[0].word_boxes=model.pages[0].word_boxes.filter(w=>!(w.x0<180&&w.y0>240&&w.y0<260));});
  check.equal(absentIdentity.records.filter(r=>r.kind==='GENERAL_ACCOUNT').length,4,'visible row with blank identity remains a separate unread identity row');
  check.equal(absentIdentity.records[0].facts['account.reported_identity'],undefined,'blank own identity cannot borrow neighbour name');
  check.equal(absentIdentity.records[0].facts['account.balance'],1240,'readable own amount survives missing unrelated identity');
  check.equal(absentIdentity.records[1].facts['account.display_name'],'Birch Auto Finance','blank first identity never contaminates second account');
  check.equal(readFixture(t,{negatedClosure:true}).records[3].facts['account.closureStatement'],undefined,'negated closure wording never becomes an affirmative closure statement');
  const untrustedPrivacy=readFixture(t,{},model=>{for(const w of model.pages[0].word_boxes)if(w.text==='ACT'||w.text==='1234')w.trusted=false;});
  check.ok(!untrustedPrivacy.report_concern_evidence.some(e=>e.role==='CURRENT'||e.kind==='IDENTIFIER_FIELD'),'untrusted address component or identifier cell produces no trusted concern evidence');
  const foreign=structuredClone(accounts[0]);foreign.source_file_id='other-file';foreign.fact_sources['account.reportRemarks'].location.file_id='original-file';
  check.equal(sourceForField(foreign,'account.reportRemarks'),null,'wrong-owner/file remarks source is refused');
  const benign=readFixture(t,{benign:true});
  const unmasked=readFixture(t,{tfnValue:'123 456 789'});
  check.ok(unmasked.report_concern_evidence.some(e=>e.kind==='IDENTIFIER_FIELD'&&e.masked===false),
    'an unmasked identifier field also produces privacy-safe presence evidence');
  check.ok(!JSON.stringify(unmasked.report_concern_evidence).includes('123 456 789'),
    'unmasked identifier digits never enter the new concern evidence');
  check.equal(benign.records.find(r=>r.kind==='GENERAL_COLLECTION').facts['account.balance'],0,'paid-zero collection is preserved as benign source evidence');
  return {scope:'fictional native nine-column account/collection/history/identification/inquiry layout',
    source_rows:7,source_remarks:5,undated_histories:4,privacy_redacted_identification:true,shipped_six_column_regression_required:true};
}
module.exports={id:'fj-report-concern-reader',title:'Own table columns, wrapped remarks and private identification evidence',run,buildFixture};
