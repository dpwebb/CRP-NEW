'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{inspect,MAX_RESULT_BYTES}=require('../assessment-budget.cjs'),{TestService}=require('./harness.cjs'),{buildPdf}=require('../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');
test('bounded JSON sizing counts repeated provenance, escaping and Unicode without allocating expansion',()=>{
 const shared={text:'é\n"\u0000',list:[true,false,null,12]},value={a:shared,b:[shared,shared],omitted:undefined};assert.equal(inspect(value).bytes,Buffer.byteLength(JSON.stringify(value)));
 const repeated=Array(10000).fill({text:'x'.repeat(10000)});assert.equal(inspect(repeated).within,false);assert.equal(inspect({text:'normal'}).within,true);
 const cycle={};cycle.self=cycle;assert.equal(inspect(cycle).within,false);assert.throws(()=>inspect({},MAX_RESULT_BYTES+1),/INVALID/);
});
test('dense physical report refuses before persistence without truncation or changing previous evidence',{timeout:120000},async()=>{
 const t=await new TestService('fictional-dense-result-budget').listen();try{const actor=await t.account('fictional.dense@example.test'),caseId=await t.assessedCase(actor),base='/api/cases/'+caseId;
 const view=(await t.request('GET',base+'/packet',{token:actor.token})).json.view;await t.request('POST',base+'/packet/select',{token:actor.token,body:{issue_ids:view.eligible_issues.map(x=>x.issue_id)}});await t.preparePostalPacket(actor,caseId);
 const pdf=buildPdf({pages:Array.from({length:40},(_,n)=>({lines:['Equifax Consumer Credit Report','Report Date: June 12, 2026','Fictional page '+(n+1),...Array.from({length:30},(_,i)=>'Fictional Lender '+n+' '+i+' Balance $100 Opened 01/01/2020 Closed 01/01/2019')]}))});
 const upload=await t.request('POST',base+'/files',{token:actor.token,body:{originalFilename:'fictional-dense.pdf',declaredBytes:pdf.length,mimeType:'application/pdf',contentBase64:pdf.toString('base64')}});assert.equal(upload.status,201,upload.text);
 const state=t.service.store.state(),before={results:JSON.stringify(state.results),packets:JSON.stringify(state.packets)},blobs=state.files.map(f=>[f.file_id,crypto.createHash('sha256').update(t.service.store.readBlob(f.file_id)).digest('hex')]);
 const evaluated=await t.request('POST',base+'/evaluate',{token:actor.token});assert.equal(evaluated.status,422,evaluated.text);assert.equal(evaluated.json.error.code,'ASSESSMENT_REVIEW_LIMIT');assert.equal(evaluated.json.error.detail.partial_result_saved,false);
 assert.equal(JSON.stringify(t.service.store.state().results),before.results);assert.equal(JSON.stringify(t.service.store.state().packets),before.packets);for(const [id,h]of blobs)assert.equal(crypto.createHash('sha256').update(t.service.store.readBlob(id)).digest('hex'),h);
 assert.equal((await t.request('GET','/api/health')).status,200);
 }finally{await t.close();}
});
