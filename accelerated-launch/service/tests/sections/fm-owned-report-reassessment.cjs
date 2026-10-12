'use strict';
// An explicitly seeded legacy derived cache is reassessed through real HTTP
// using fictional original PDF bytes. Historical result and receipt identities
// are fixtures; the upload, new assessment and packet paths are production code.
const crypto=require('node:crypto');
const formats=require('../../formats.cjs');
const general=require('../../general-intake.cjs');
const assembly=require('../../multi-file-assembly.cjs');
const evaluation=require('../../evaluation.cjs');
const results=require('../../results.cjs');
const issues=require('../../issues.cjs');
const {buildFixture}=require('./fj-report-concern-reader.cjs');
const {pdfText}=require('../packet-pdf-assertions.cjs');
const clone=value=>JSON.parse(JSON.stringify(value));
const digest=value=>crypto.createHash('sha256').update(Buffer.isBuffer(value)?value:JSON.stringify(value)).digest('hex');
const upload=(bytes,key)=>({originalFilename:'fictional-retained-table.pdf',declaredBytes:bytes.length,
  mimeType:'application/pdf',contentBase64:bytes.toString('base64'),uploadKey:key});
const EXPECTED=['ADDRESS_GEOGRAPHIC_INCONSISTENCY','PAID_CLAIM','CLOSURE_DATE_REVIEW',
  'AU_TFN_HANDLING','AU_AMOUNT_CATEGORY_REVIEW'];

function legacyCache(extraction) {
  const old=clone(extraction);delete old.reader_version;delete old.report_concern_evidence;
  delete old.report_concern_associations;delete old.table_note_associations;
  old.records=Array.from({length:9},(_,i)=>({record_index:i+1,kind:i===6?'GENERAL_COLLECTION':'GENERAL_ACCOUNT',
    kind_label:i===6?'collection entry':'account',status:'RESOLVED',facts:i>=1&&i<=4?{'account.amount':i*100}:{},
    printed:{},location:{page:1,line:20+i,source:'NATIVE_TEXT',trusted:true}}));
  old.evidence_readings.factual_view.records=clone(old.records);
  old.summary={...old.summary,total_records:9};
  return old;
}
async function newCase(t,owner,bytes,key) {
  const caseId=(await t.request('POST','/api/cases',{token:owner.token,body:{country:'AU',region:'AU-ACT',bureau:'EQUIFAX'}})).json.case.case_id;
  const base='/api/cases/'+caseId;
  const received=await t.request('POST',base+'/files',{token:owner.token,body:upload(bytes,key)});
  if(received.status!==201)throw new Error('Fictional owned upload failed: '+received.text);
  return {caseId,base,fileId:received.json.receipt.file_id};
}
function downgrade(t,fileId,change) {
  t.service.store.update(state=>{
    const file=state.files.find(row=>row.file_id===fileId);file.extraction=legacyCache(file.extraction);
    delete file.reassessment_extraction;delete file.reassessment_source;if(change)change(file,state);
  });
}
function fileState(t,fileId) {return t.service.store.state().files.find(row=>row.file_id===fileId);}
function resultsFor(t,caseId) {return t.service.store.state().results.filter(row=>row.case_id===caseId);}
function frozenFile(file) {
  const result=clone(file);delete result.reassessment_extraction;delete result.reassessment_source;return result;
}

async function run(t,check) {
  const owner=await t.unpaidAccount('owned-reassessment@example.test');
  const stranger=await t.unpaidAccount('foreign-reassessment@example.test');
  const bytes=buildFixture(), key='reassessment-original-upload-key';
  const first=await newCase(t,owner,bytes,key);
  check.equal(fileState(t,first.fileId).extraction.reader_version,general.GENERAL_READER_VERSION,'new GENERAL uploads stamp the current reader version');
  downgrade(t,first.fileId);
  const original=fileState(t,first.fileId), historicalExtraction=assembly.assemble([original]).extraction;
  const historicalEvaluation=evaluation.evaluateCase({country:'AU',region:'AU-ACT',extraction:historicalExtraction});
  const historicalRendered=results.renderResultSet({evaluation:historicalEvaluation,extraction:historicalExtraction});
  check.equal(issues.issuesFor({evaluation:historicalEvaluation,extraction:historicalExtraction}).filter(issue=>issue.eligible).length,0,'recorded legacy cache reproduces no selectable issues');
  const historical={result_id:'fm-historical-result',case_id:first.caseId,account_id:owner.account_id,
    file_id:first.fileId,file_ids:[first.fileId],support:formats.SUPPORT.ACTUAL_REPORT_EVIDENCE,demonstration:false,
    extraction:historicalExtraction,evaluation:historicalEvaluation,rendered:historicalRendered,
    clarification_eligibility:[],created_at:'2026-10-11T12:00:00.000Z',reviewed_at:null};
  t.service.store.update(state=>state.results.push(historical));
  const historicalHash=digest(historical), sourceFileHash=digest(frozenFile(original));
  const legacyReceipt=(await t.request('POST',first.base+'/files',{token:owner.token,body:upload(bytes,key)})).json.receipt;
  const build=formats.buildPdfDocumentModel, extract=formats.extractWithSharedAdapter;
  let readerCalls=0;
  formats.buildPdfDocumentModel=(...args)=>{readerCalls++;return build(...args);};
  try {
    check.equal((await t.request('GET',first.base,{token:owner.token})).status,200,'GET keeps the recorded historical result readable');
    check.equal(readerCalls,0,'GET does not refresh legacy reader data');
    const fresh=await t.request('POST',first.base+'/evaluate',{token:owner.token});
    check.equal(fresh.status,201,'explicit reassessment refreshes the old owned cache through HTTP');
    check.equal(readerCalls,1,'the owned native original is parsed once');
    const current=resultsFor(t,first.caseId).at(-1);
    check.notEqual(current.result_id,historical.result_id,'new assessment gets a distinct result identity');
    check.deepEqual(current.extraction.records.map(row=>row.kind),['GENERAL_ACCOUNT','GENERAL_ACCOUNT','GENERAL_ACCOUNT','GENERAL_ACCOUNT','GENERAL_COLLECTION','GENERAL_INQUIRY','GENERAL_INQUIRY'],'fresh extraction recovers four accounts, one collection and two inquiries');
    const surfaced=issues.issuesFor({evaluation:current.evaluation,extraction:current.extraction});
    check.deepEqual([...new Set(surfaced.filter(issue=>issue.report_concern).map(issue=>issue.concern_kind))].sort(),EXPECTED.slice().sort(),'five actionable concern categories reach the new result while all-OK histories are disregarded');
    check.equal(surfaced.filter(issue=>issue.report_concern&&!issue.non_violation).length,3,'fresh result retains three sourced geography violations');
    check.equal(surfaced.filter(issue=>issue.report_concern&&issue.non_violation).length,7,'fresh result retains seven bounded review concerns');
    check.equal(fileState(t,first.fileId).reassessment_extraction.reader_version,general.GENERAL_READER_VERSION,'only derived reassessment data is cached with the new version');
    check.equal(digest(frozenFile(fileState(t,first.fileId))),sourceFileHash,'original file metadata and upload-time extraction stay unchanged');
    check.equal(digest(t.service.store.readBlob(first.fileId)),digest(bytes),'owned original bytes remain exact');
    check.equal(digest(resultsFor(t,first.caseId).find(row=>row.result_id===historical.result_id)),historicalHash,'historical facts, findings and result timestamp stay unchanged');
    const retry=(await t.request('POST',first.base+'/files',{token:owner.token,body:upload(bytes,key)})).json.receipt;
    check.deepEqual(retry,legacyReceipt,'retry returns the original upload receipt without new reader counts');
    await t.pay(owner,'monthly');
    const selected=(await t.request('GET',first.base+'/packet',{token:owner.token})).json.view.eligible_issues;
    check.equal((await t.request('POST',first.base+'/packet/select',{token:owner.token,body:{issue_ids:selected.map(issue=>issue.issue_id)}})).status,200,'consumer selects the recovered violations and concerns');
    await t.preparePostalPacket(owner,first.caseId);
    check.equal((await t.request('POST',first.base+'/packet/approve',{token:owner.token})).status,200,'fresh selected packet can be reviewed and approved');
    const downloaded=await t.request('GET',first.base+'/packet-download',{token:owner.token});
    check.equal(downloaded.status,200,'actual packet from refreshed sources downloads');
    check.ok(/paid|payment/i.test(pdfText(downloaded.bytes)),'packet contains the sourced payment-verification request');
    const approved=t.service.store.state().packets.find(row=>row.case_id===first.caseId), approvedHash=digest(approved);
    // Simulate another old derived-reader stamp: a fresh assessment must use a
    // new result, without changing the prior consumer approval record.
    t.service.store.update(state=>{state.files.find(row=>row.file_id===first.fileId).reassessment_extraction.reader_version=0;});
    readerCalls=0;
    check.equal((await t.request('POST',first.base+'/evaluate',{token:owner.token})).status,201,'an older derived stamp refreshes on explicit reassessment');
    check.equal(readerCalls,1,'old derived stamp causes exactly one new native read');
    check.equal(digest(t.service.store.state().packets.find(row=>row.case_id===first.caseId)),approvedHash,'old approval remains stored with its original result and version');
    check.equal((await t.request('GET',first.base+'/packet-download',{token:owner.token})).status,409,'new result makes the previous approval stale');
    readerCalls=0;
    check.equal((await t.request('POST',first.base+'/evaluate',{token:owner.token})).status,201,'current derived extraction can be assessed again');
    check.equal(readerCalls,0,'current derived version is not reparsed');
    check.equal((await t.request('GET',first.base+'/results/'+historical.result_id,{token:owner.token})).status,200,'explicit historical result remains available after refresh');
    check.equal(readerCalls,0,'history reads never refresh the original');
    check.equal(digest(resultsFor(t,first.caseId).find(row=>row.result_id===historical.result_id)),historicalHash,'repeated checks preserve the original historical result');
    check.equal((await t.request('POST',first.base+'/evaluate',{token:stranger.token})).status,403,'foreign account cannot trigger original access or reassessment');
    check.equal(readerCalls,0,'foreign case refusal happens before reading the source');
  } finally {formats.buildPdfDocumentModel=build;formats.extractWithSharedAdapter=extract;}

  const current=await newCase(t,owner,bytes,'reassessment-current-upload-key');
  let nativeReads=0;
  formats.buildPdfDocumentModel=(...args)=>{nativeReads++;return build(...args);};
  try {
    check.equal((await t.request('POST',current.base+'/evaluate',{token:owner.token})).status,201,'current upload-time version remains usable');
    check.equal(nativeReads,0,'current upload-time version does not reparse its PDF');
  } finally {formats.buildPdfDocumentModel=build;}

  for(const [label,change,status] of [
    ['foreign account',file=>{file.account_id=stranger.account_id;},403],
    ['foreign case',file=>{file.case_id='case_foreign';},409],
    ['malformed hash',file=>{file.stored_sha256='bad-hash';},503],
    ['wrong stored hash',file=>{file.stored_sha256='0'.repeat(64);},503],
    ['wrong byte length',file=>{file.stored_bytes++;},503],
    ['invalid byte length',file=>{file.stored_bytes=-1;},503],
    ['blob declared absent',file=>{file.stored_blob=false;},503],
    ['mismatched presentation',file=>{file.presentation_id='PR-01';},503],
    ['mismatched container',file=>{file.container='IMAGE';},503],
    ['invalid reader stamp',file=>{file.extraction.reader_version='invalid';},503],
    ['tampered blob',file=>{t.service.store.putBlob(file.file_id,Buffer.concat([bytes,Buffer.from('tampered')]));},503]
  ]) {
    const bad=await newCase(t,owner,bytes,'reassessment-bad-'+crypto.randomBytes(8).toString('hex'));
    downgrade(t,bad.fileId,change);
    const before=digest(resultsFor(t,bad.caseId));
    const refused=await t.request('POST',bad.base+'/evaluate',{token:owner.token,body:{fileId:bad.fileId}});
    check.equal(refused.status,status,label+' fails closed');
    check.equal(digest(resultsFor(t,bad.caseId)),before,label+' cannot persist a guessed result');
    check.equal(fileState(t,bad.fileId)?.reassessment_extraction,undefined,label+' cannot persist refreshed decisive facts');
  }
  const reopened=await newCase(t,owner,bytes,'reassessment-reopened-path-key');downgrade(t,reopened.fileId);
  const alteredPath=await newCase(t,owner,buildFixture({benign:true}),'reassessment-other-path-key');
  const blobPath=t.service.store.blobPath.bind(t.service.store);
  t.service.store.blobPath=id=>id===reopened.fileId?blobPath(alteredPath.fileId):blobPath(id);
  // readBlob is deliberately kept pointed at the original, while the PDF
  // builder reopens a different owned blob. Both custody checks are required.
  const readBlob=t.service.store.readBlob.bind(t.service.store);
  t.service.store.readBlob=id=>id===reopened.fileId?require('node:fs').readFileSync(blobPath(reopened.fileId)):readBlob(id);
  try {check.equal((await t.request('POST',reopened.base+'/evaluate',{token:owner.token})).status,503,'different bytes at reopened model path cannot replace the validated original');}
  finally {t.service.store.blobPath=blobPath;t.service.store.readBlob=readBlob;}
  check.equal(fileState(t,reopened.fileId).reassessment_extraction,undefined,'model custody mismatch caches no new facts');
  const changedDuringRead=await newCase(t,owner,bytes,'reassessment-read-drift-key');downgrade(t,changedDuringRead.fileId);
  formats.buildPdfDocumentModel=(...args)=>{
    const model=build(...args);t.service.store.putBlob(changedDuringRead.fileId,buildFixture({benign:true}));return model;
  };
  try {check.equal((await t.request('POST',changedDuringRead.base+'/evaluate',{token:owner.token})).status,503,'original changed during the native read cannot be cached or evaluated');}
  finally {formats.buildPdfDocumentModel=build;}
  check.equal(fileState(t,changedDuringRead.fileId).reassessment_extraction,undefined,'read-time byte drift caches no decisive facts');

  const explicit=await newCase(t,owner,bytes,'reassessment-explicit-good-key');
  const another=await t.request('POST',explicit.base+'/files',{token:owner.token,body:upload(buildFixture({benign:true}),'reassessment-explicit-bad-key')});
  downgrade(t,explicit.fileId);downgrade(t,another.json.receipt.file_id,file=>{file.stored_sha256='0'.repeat(64);});
  check.equal((await t.request('POST',explicit.base+'/evaluate',{token:owner.token,body:{fileId:explicit.fileId}})).status,201,'explicit file selection refreshes only that file despite an unrelated corrupt stale source');
  check.equal(fileState(t,another.json.receipt.file_id).reassessment_extraction,undefined,'unselected corrupt source is not refreshed');

  const changed=await newCase(t,owner,bytes,'reassessment-changed-admission-key');downgrade(t,changed.fileId);
  formats.extractWithSharedAdapter=(...args)=>({...extract(...args),presentation_id:'PR-01'});
  try {check.equal((await t.request('POST',changed.base+'/evaluate',{token:owner.token})).status,503,'changed presentation cannot inherit old GENERAL admission');}
  finally {formats.extractWithSharedAdapter=extract;}
  check.equal(fileState(t,changed.fileId).reassessment_extraction,undefined,'changed presentation caches no decisive facts');

  // Reader migration exclusion controls use retained derived-state fixtures.
  // Container/pinned admission itself remains covered by its existing suites.
  for(const [label,change] of [
    ['image',file=>{file.container='IMAGE';file.extraction.container='IMAGE';file.extraction.reading_state.image_only_pages=[1];}],
    ['mixed PDF',file=>{file.extraction.reading_state.mixed_native_pages=[1];}],
    ['scanned PDF',file=>{file.extraction.reading_state.image_only_pages=[1];}],
    ['demonstration',file=>{file.demonstration=true;file.extraction.demonstration=true;file.extraction.support=formats.SUPPORT.DEMONSTRATION_ONLY_NOT_REPORT_SUPPORT;}],
    ['pinned family',file=>{file.presentation_id='PR-01';file.extraction.presentation_id='PR-01';file.extraction.records=[];file.extraction.evidence_readings.factual_view.records=[];}]
  ]) {
    const excluded=await newCase(t,owner,bytes,'reassessment-excluded-'+crypto.randomBytes(8).toString('hex'));
    downgrade(t,excluded.fileId,change);
    const before=digest(fileState(t,excluded.fileId));let reads=0;
    formats.buildPdfDocumentModel=(...args)=>{reads++;return build(...args);};
    try {
      check.equal((await t.request('POST',excluded.base+'/evaluate',{token:owner.token})).status,201,label+' stays on its existing assessment path');
      check.equal(reads,0,label+' is not migrated or broadly reread');
      check.equal(digest(fileState(t,excluded.fileId)),before,label+' cached upload extraction remains unchanged');
    } finally {formats.buildPdfDocumentModel=build;}
  }
  const goodCache=clone(fileState(t,first.fileId).reassessment_source), beforeCacheRefusal=resultsFor(t,first.caseId).length;
  t.service.store.update(state=>{state.files.find(file=>file.file_id===first.fileId).reassessment_source.account_id=stranger.account_id;});
  check.equal((await t.request('POST',first.base+'/evaluate',{token:owner.token})).status,503,'foreign derived-cache custody cannot supply current decisive facts');
  check.equal(resultsFor(t,first.caseId).length,beforeCacheRefusal,'invalid cache custody creates no result');
  t.service.store.update(state=>{state.files.find(file=>file.file_id===first.fileId).reassessment_source=goodCache;});

  const foreignRow=await newCase(t,owner,bytes,'reassessment-before-blob-key');
  downgrade(t,foreignRow.fileId,file=>{file.account_id=stranger.account_id;});
  const ownedRead=t.service.store.readBlob.bind(t.service.store);let blobReads=0;
  t.service.store.readBlob=(...args)=>{blobReads++;return ownedRead(...args);};
  try {
    check.equal((await t.request('POST',foreignRow.base+'/evaluate',{token:owner.token})).status,403,'file ownership is checked before original access');
    check.equal(blobReads,0,'foreign file metadata causes no blob access');
  } finally {t.service.store.readBlob=ownedRead;}
  return {scope:'explicit owned native GENERAL reassessment only',historical_result_unchanged:true,
    original_receipt_unchanged:true,custody_fail_closed:true,current_reader_not_reparsed:true,packet_approval_stale_on_new_result:true};
}
module.exports={id:'fm-owned-report-reassessment',title:'Explicit reassessment refreshes stale owned GENERAL facts without changing historical evidence',run};
