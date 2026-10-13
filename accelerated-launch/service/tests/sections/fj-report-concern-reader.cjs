'use strict';
const fs=require('node:fs');
const path=require('node:path');
const formats=require('../../formats.cjs');
const {sourceForField}=require('../../report-fact-sources.cjs');
const assembly=require('../../multi-file-assembly.cjs');
const concerns=require('../../report-concerns.cjs');
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
function readSegmentFixture(t,options={},mutate) {
  function report(bureau,date,offset=0,second=false) {
    const words=[], put=(text,y)=>{if(text)words.push({text,x:30,y:y+offset});};
    put(bureau+' Consumer Credit Report - FICTIONAL TEST FIXTURE',20);
    put(date?'Prepared Date: '+date:'No report date printed',40);
    put('CONSUMER IDENTIFICATION',65);put('CURRENT ADDRESS',85);
    put(second?'29 Fictional Lane, Canberra, VIC 5841, Australia':'19 Example Lane, Melbourne, ACT 7728, Australia',100);
    put('TAX FILE NUMBER',120);put('XXX XXX 9876',135);
    if(options.crossBoundary&&!second)put('CURRENT ADDRESS',195);
    return words;
  }
  const secondBureau=options.ambiguous?'Equifax Experian':options.sameBureau?'Equifax':'Experian';
  const secondDate=options.undatedSecond?null:'07/07/2026';
  const pages=options.samePage?[{words:[...report('Equifax','06/06/2026'),...report(secondBureau,secondDate,190,true)]}]
    :[{words:report('Equifax','06/06/2026')},{words:report(secondBureau,secondDate,0,true)}];
  if(options.crossBoundary)pages[0].words.push({text:'18 Boundary Lane, Melbourne, ACT 7728, Australia',x:300,y:210});
  const file=path.join(t.dataDir,'report-concern-segments-'+(++sequence)+'.pdf');
  fs.writeFileSync(file,buildWordPdf(pages,{page_size:{width:600,height:800},font_size:8,
    producer:'Fictional source-segment custody fixture',creator:'Fictional source-segment custody fixture'}));
  const model=formats.buildPdfDocumentModel(file);if(mutate)mutate(model);
  return formats.extractWithSharedAdapter(model,{mode:'REPORT',country:'AU'});
}
function assembledExtraction(extraction,fileId='report-file') {
  return assembly.assemble([{file_id:fileId,stored_sha256:fileId,extraction}]).extraction;
}
function readNoteScopeFixture(t,options={},mutate) {
  const xs=[30,185,245,325,410,495,575,665,755];
  function block(second=false,offset=0) {
    const words=[],put=(text,x,y)=>words.push({text,x,y:y+offset});
    put((second?(options.sameBureau?'Equifax':'Experian'):'Equifax')+' Consumer Credit Report - FICTIONAL TEST FIXTURE',30,20);
    put('Prepared Date: '+(second?'05/05/2025':'06/06/2026'),30,40);
    if(!second||!options.foreignOnly) {
      put('ACCOUNT SUMMARY',30,60);
      ['Creditor','Account','Type','Opened','Reported','Status','Balance','Limit','Payment'].forEach((text,i)=>put(text,xs[i],80));
      ['Cedar Card',second?'****2233':'****1122','Credit Card','15/01/2021',second?'05/05/2025':'06/06/2026','Current','$1,240 AUD','$6,500 AUD','$45 AUD'].forEach((text,i)=>put(text,xs[i],105));
      if(!second&&options.duplicateName)['Cedar Card','****3344','Credit Card','16/01/2021','06/06/2026','Current','$320 AUD','$2,200 AUD','$30 AUD'].forEach((text,i)=>put(text,xs[i],124));
    }
    if(second||!options.foreignOnly) {
      put('PAYMENT HISTORY AND REMARKS',30,145);
      ['Creditor','Recent Payment History','Remarks'].forEach((text,i)=>put(text,[30,210,630][i],164));
      if(options.crossBoundary&&!second)put('Experian Consumer Credit Report - FICTIONAL TEST FIXTURE',30,174);
      ['Cedar Card',Array(24).fill(second?'Z9':'OK').join(' '),second?'Closed at consumer request':'Account in good standing'].forEach((text,i)=>put(text,[30,210,630][i],184));
    }
    return words;
  }
  const pages=options.crossBoundary?[{words:block()}]:options.samePage?[{words:[...block(),...block(true,250)]}]:[{words:block()},{words:block(true)}];
  const file=path.join(t.dataDir,'note-source-scope-'+(++sequence)+'.pdf');
  fs.writeFileSync(file,buildWordPdf(pages,{page_size:{width:1050,height:800},font_size:8,
    producer:'Fictional note-segment custody fixture',creator:'Fictional note-segment custody fixture'}));
  const model=formats.buildPdfDocumentModel(file);if(mutate)mutate(model);
  return formats.extractWithSharedAdapter(model,{mode:'REPORT',country:'AU'});
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
  for(const options of [{},{samePage:true},{sameBureau:true},{samePage:true,sameBureau:true}]) {
    const segmented=readSegmentFixture(t,options), readings=segmented.report_concern_evidence;
    check.equal(readings.length,4,'two source reports retain both owned address and identifier fields '+JSON.stringify(options));
    check.deepEqual(readings.map(item=>item.source_bureau),['Equifax','Equifax',options.sameBureau?'Equifax':'Experian',options.sameBureau?'Equifax':'Experian'],'each reading keeps its own source bureau');
    check.deepEqual(readings.map(item=>item.report_reference_date.normalized),['2026-06-06','2026-06-06','2026-07-07','2026-07-07'],'each field keeps its own report date even when document-level dates disagree');
    check.deepEqual(readings.map(item=>item.report_segment_id),['segment-1','segment-1','segment-2','segment-2'],'field association identifies the correct source segment');
    const before=JSON.stringify(segmented), assembled=assembledExtraction(segmented);
    check.deepEqual(assembled.report_concern_evidence.map(item=>item.source_bureau),readings.map(item=>item.source_bureau),'assembly preserves field-specific bureau instead of document-global bureau');
    check.deepEqual(assembled.report_concern_evidence.map(item=>item.report_reference_date.normalized),readings.map(item=>item.report_reference_date.normalized),'assembly preserves own report dates');
    check.deepEqual(assembled.report_concern_evidence.map(item=>item.report_segment_id),['report-file:segment-1','report-file:segment-1','report-file:segment-2','report-file:segment-2'],'assembly namespaces each source segment to its uploaded file');
    check.ok(assembled.report_concern_evidence.every(item=>item.location.file_id==='report-file'&&item.report_reference_date.location.file_id==='report-file'),'own field and own report-date locations receive exact file custody');
    check.equal(JSON.stringify(segmented),before,'assembly does not mutate persisted per-file concern readings');
    const surfaced=concerns.concernsFor(assembled,{country:'AU',region:'AU-ACT'});
    check.deepEqual(surfaced.map(issue=>issue.report_identity.reference_date).sort(),['2026-06-06','2026-07-07'],'consumer violations and concerns keep their source-specific report dates');
  }
  const undated=assembledExtraction(readSegmentFixture(t,{undatedSecond:true}));
  check.ok(undated.report_concern_evidence.filter(item=>item.report_segment_id.endsWith('segment-2')).every(item=>item.report_reference_date.normalized==null),'undated second report never borrows first report date');
  check.ok(concerns.concernsFor(undated,{country:'AU',region:'AU-ACT'}).filter(issue=>issue.report_identity.segment_id.endsWith('segment-2')).every(issue=>issue.report_identity.reference_date==null),'date-free own segment custody stays date-free in consumer issue identity');
  const ambiguous=readSegmentFixture(t,{samePage:true,ambiguous:true});
  check.equal(ambiguous.report_concern_evidence.length,2,'ambiguous second bureau boundary withholds only its concern associations');
  check.ok(ambiguous.report_concern_associations.some(item=>item.state==='UNRESOLVED'),'withheld segment associations remain internal diagnostics');
  check.equal(concerns.concernsFor(assembledExtraction(ambiguous),{country:'AU',region:'AU-ACT'}).length,1,'assembly cannot restore ambiguous second-report concerns using global identity');
  const untrustedBoundary=readSegmentFixture(t,{samePage:true},model=>{for(const word of model.pages[0].word_boxes)if(word.text==='Experian')word.trusted=false;});
  check.equal(untrustedBoundary.report_concern_evidence.length,2,'untrusted second report title never establishes bureau association');
  const crossing=readSegmentFixture(t,{samePage:true,crossBoundary:true});
  check.equal(crossing.report_concern_evidence.length,4,'field heading before a boundary cannot claim a value after the boundary');
  check.ok(crossing.report_concern_associations.some(item=>item.state==='UNRESOLVED'),'cross-boundary field association is retained as an internal refusal');
  const own=readSegmentFixture(t);
  for(const [label,change] of [
    ['wrong own date',item=>{item.report_reference_date.normalized='2026-08-08';item.report_reference_date.normalized_value='2026-08-08';}],
    ['wrong own bureau',item=>{item.source_bureau='TransUnion';}],
    ['wrong source segment',item=>{item.report_segment_id='segment-2';}],
    ['foreign date file',item=>{item.report_reference_date.location.file_id='foreign-file';}],
    ['foreign field file',item=>{item.location.file_id='foreign-file';}],
    ['foreign header file',item=>{item.location.caption_location.file_id='foreign-file';}],
    ['foreign source page',item=>{item.location.page=3;item.location.caption_location.page=3;}],
    ['mismatched header page',item=>{item.location.caption_location.page=2;}],
    ['missing field location',item=>{delete item.location;}]
  ]) {
    const mismatch=structuredClone(own);change(mismatch.report_concern_evidence[0]);
    const assembled=assembledExtraction(mismatch);
    check.equal(assembled.report_concern_evidence.length,3,label+' withholds that association without rewriting source');
    check.equal(concerns.concernsFor(assembled,{country:'AU',region:'AU-ACT'}).length,1,label+' cannot create a source-borrowed consumer issue');
    check.ok(assembled.report_concern_associations.some(item=>item.reason==='REPORT_CONCERN_SOURCE_ASSOCIATION_MISMATCH'),label+' remains internally recorded');
  }
  const twoFiles=assembly.assemble([{file_id:'one',stored_sha256:'one',extraction:own},
    {file_id:'two',stored_sha256:'two',extraction:readSegmentFixture(t,{sameBureau:true})}]).extraction;
  check.equal(new Set(twoFiles.report_concern_evidence.map(item=>item.report_segment_id)).size,4,'identical local segment IDs in two uploads retain four distinct file-bound identities');
  for(const options of [{},{samePage:true},{sameBureau:true},{samePage:true,sameBureau:true}]) {
    const scoped=readNoteScopeFixture(t,options), first=scoped.records.find(record=>record.facts['account.masked_identifier']==='MASK-1122'),second=scoped.records.find(record=>record.facts['account.masked_identifier']==='MASK-2233');
    check.equal(first.facts['account.reportRemarks'],'Account in good standing','first source keeps its own remarks '+JSON.stringify(options));
    check.equal(second.facts['account.closureStatement'],'Closed at consumer request','second source owns its closure despite repeated creditor name');
    check.equal(first.facts['account.closureStatement'],undefined,'later report closure cannot attach to the earlier account');
    check.equal(first.facts['account.undatedPaymentHistory']?.tokens[0],'OK','first account owns first report history');
    check.equal(second.facts['account.undatedPaymentHistory']?.tokens[0],'Z9','second account owns second report literal history');
    check.ok(scoped.table_note_associations.every(row=>row.binding!=='UNBOUND'),'unique names per source report stay usable even with cross-report duplicates');
  }
  for(const options of [{foreignOnly:true},{foreignOnly:true,samePage:true},{foreignOnly:true,sameBureau:true},{foreignOnly:true,samePage:true,sameBureau:true}]) {
    const scoped=readNoteScopeFixture(t,options), account=scoped.records.find(record=>record.facts['account.masked_identifier']==='MASK-1122');
    check.equal(account.facts['account.closureStatement'],undefined,'a different report cannot lend its closure to the only matching creditor '+JSON.stringify(options));
    check.equal(account.facts['account.undatedPaymentHistory'],undefined,'a different report cannot lend its history to the only matching creditor');
    check.equal(account.facts['account.balance'],1240,'independent first-report balance survives note refusal');
    check.ok(scoped.table_note_associations.some(row=>row.binding==='UNBOUND'),'cross-report note refusal remains internal');
  }
  const duplicateNotes=readNoteScopeFixture(t,{duplicateName:true,samePage:true});
  check.ok(duplicateNotes.records.filter(record=>record.report_segment_id==='segment-1').every(record=>!record.facts['account.reportRemarks']&&!record.facts['account.undatedPaymentHistory']),'two own matching accounts leave the first segment note unbound');
  check.equal(duplicateNotes.records.find(record=>record.report_segment_id==='segment-2').facts['account.closureStatement'],'Closed at consumer request','duplicate names in an earlier segment cannot suppress a unique later segment note');
  const crossedNote=readNoteScopeFixture(t,{crossBoundary:true});
  const crossingAccount=crossedNote.records.find(record=>record.facts['account.masked_identifier']==='MASK-1122');
  check.equal(crossingAccount.facts['account.reportRemarks'],undefined,'a note header before a new bureau cannot claim the value after it');
  check.equal(crossingAccount.facts['account.undatedPaymentHistory'],undefined,'crossed history caption/value boundary is withheld');
  check.equal(crossingAccount.facts['account.balance'],1240,'crossed note boundary leaves independent account facts usable');
  const untrustedNote=readNoteScopeFixture(t,{samePage:true},model=>{for(const word of model.pages[0].word_boxes)if(word.text==='Remarks'&&word.y0<200)word.trusted=false;});
  const independent=untrustedNote.records.find(record=>record.facts['account.masked_identifier']==='MASK-1122');
  check.equal(independent.facts['account.reportRemarks'],undefined,'untrusted own remarks caption cannot support that field');
  check.equal(independent.facts['account.undatedPaymentHistory']?.count,24,'independent trusted history caption and value stay usable');
  check.equal(untrustedNote.records.find(record=>record.facts['account.masked_identifier']==='MASK-2233').facts['account.closureStatement'],'Closed at consumer request','untrusted earlier remarks do not suppress later supported note fields');
  return {scope:'fictional native nine-column account/collection/history/identification/inquiry layout',
    source_rows:7,source_remarks:5,undated_histories:4,privacy_redacted_identification:true,shipped_six_column_regression_required:true};
}
module.exports={id:'fj-report-concern-reader',title:'Own table columns, wrapped remarks and private identification evidence',run,buildFixture};
