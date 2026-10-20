'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),{execFileSync}=require('child_process'),{chromium}=require('C:/Users/webbd/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const R=path.resolve(__dirname,'../../../..'),{buildPdf}=require(R+'/internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs'),packets=require(R+'/accelerated-launch/service/packets.cjs'),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
async function seedSavedAnnotation(req,route,note,check){
 // Set up an existing saved annotation; Review itself no longer edits highlights.
 const view=(await req('GET',route+'/packet')).json.view;
 const metadata=(await req('GET',route+'/packet/preview/pages?version='+view.packet.preview_version)).json;
 const source=metadata.review_pages.find(page=>page.kind==='report'&&page.annotation_available!==false);
 check.ok(Boolean(source?.file_id&&source.source_page),'saved annotation fixture uses an actual selected source page');
 const annotation={file_id:source.file_id,page:source.source_page,x:0.08,y:0.08,width:0.75,height:0.08,note};
 const saved=await req('POST',route+'/packet/annotations',{annotations:[annotation],expected_version:view.packet.preview_version});
 check.equal(saved.status,200,'existing annotation fixture is saved through the unchanged owned API before Review opens');
 const annotations=saved.json.view.packet.annotations;
 check.equal(annotations.length,1,'existing annotation fixture contains exactly one saved source-page note');
 check.equal(annotations[0].note,note,'existing annotation fixture retains its exact note');
 return structuredClone(annotations);
}
async function reviewControlsAbsent(page,check,label){
 check.equal(await page.locator('#packet-edit-account').count(),0,label+': Review has no contact or upload shortcut');
 check.equal(await page.locator('#packet-edit-documents').count(),0,label+': Review has no general document-copy or upload button');
 check.equal(await page.getByRole('button',{name:'Update contact details or upload copies',exact:true}).count(),0,label+': the removed contact and upload action is absent');
 check.equal(await page.locator('.packet-highlight-tools,.packet-add-highlight,.packet-position-add,.packet-position-inputs,.packet-highlight-row').count(),0,label+': manual Add, position, Explain and Remove highlight controls are absent');
 check.equal(await page.getByRole('button',{name:/^(Add a highlight on this page|Add this highlight|Remove highlight)$/}).count(),0,label+': no manual highlight action remains under a different selector');
 check.equal(await page.getByLabel('Explain this highlight',{exact:true}).count(),0,label+': no manual highlight explanation editor remains');
}
async function recoveryChecks(t,browser,actor,source,check,out){
 const req=(method,url,body)=>t.request(method,url,{token:actor.token,body});
 async function makeCase(label){
  const c=(await req('POST','/api/cases',{country:'CA',region:'CA-NS',bureau:'EQUIFAX'})).json.case,route='/api/cases/'+c.case_id;
  check.equal((await req('POST',route+'/files',{originalFilename:'fictional-recovery-'+label+'.pdf',mimeType:'application/pdf',declaredBytes:source.length,contentBase64:source.toString('base64')})).status,201,'recovery uses a retained fictional report: '+label);
  check.equal((await req('POST',route+'/evaluate',{})).status,201,'recovery fixture is actually assessed: '+label);
  const offered=(await req('GET',route+'/packet')).json.view;
  await req('POST',route+'/packet/select',{issue_ids:offered.eligible_issues.map(issue=>issue.issue_id)});
  await t.preparePostalPacket(actor,c.case_id);return{c,route};
 }
 async function openPacket(c,configure){
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();page.setDefaultTimeout(20000);
  if(configure)await configure(page);
  await page.goto(t.base+'/index.html#signin');await page.locator('#email').fill(actor.email);await page.locator('#password').fill('a-long-enough-password');await page.locator('#signin').click();
  await page.locator('#signin-skip-two-factor').click();
  await page.locator('#open').waitFor();await page.locator('#refresh').click();await page.locator('[data-open="'+c.case_id+'"]').click();await page.locator('#create-packet').waitFor();
  await page.locator('[data-step="6"]').click();await page.locator('#packet-preview-status').waitFor();return{context,page};
 }
 const waitFallback=page=>page.waitForFunction(()=>{const editor=document.querySelector('#packet-letter');return editor&&!editor.closest('[data-packet-page]')&&editor.getClientRects().length>0;});
 async function restored(page,label){
  await page.locator('#packet-preview-reviewed:enabled').waitFor({timeout:60000});
  check.ok(await page.locator('[data-packet-page]').count()>1,label+': the complete physical packet returns');
  check.equal(await page.locator('.packet-page-image').evaluateAll(images=>images.length>1&&images.every(image=>image.complete&&image.naturalWidth>0)),true,label+': every restored page has actual rendered pixels');
  check.ok(await page.locator('#packet-letter').evaluate(node=>Boolean(node.closest('[data-packet-page]'))),label+': native page editing returns');
 }
 async function blocked(page,label){
  check.ok(await page.locator('#packet-preview-reviewed').isDisabled()&&await page.locator('#packet-approve').isDisabled()
   &&await page.locator('#packet-print').isDisabled()&&await page.locator('#packet-download').isDisabled(),label+': incomplete rendering cannot be approved, printed or downloaded');
 }
  const glyphCase=await makeCase('unsupported-glyph');
  const savedAnnotations=await seedSavedAnnotation(req,glyphCase.route,'Fictional saved evidence note must survive letter and image recovery.',check);
  const glyphUi=await openPacket(glyphCase.c);
 let repairedLetter;
 try{
  const {page}=glyphUi;await restored(page,'Initial recovery packet');
  const ordinary=await page.locator('#packet-letter').inputValue(),emoji=String.fromCodePoint(0x1f642),custom='Fictional consumer explanation must survive this repair.';
  const unsupported=ordinary+'\n'+custom+' '+emoji;
  await page.locator('#packet-letter').fill(unsupported);
  const letterSaved=page.waitForResponse(response=>new URL(response.url()).pathname===glyphCase.route+'/packet/letter'&&response.request().method()==='POST');
  const failedMetadata=page.waitForResponse(response=>new URL(response.url()).pathname===glyphCase.route+'/packet/preview/pages'&&response.status()===400);
  await page.locator('#packet-save').click();check.equal((await letterSaved).status(),200,'unsupported-glyph regression reaches the stored consumer-letter response');
  check.equal((await(await failedMetadata).json()).error.code,'INVALID_REQUEST','unsupported-glyph fixture reaches composition refusal');
  await waitFallback(page);check.equal(await page.locator('#packet-letter').inputValue(),unsupported,'composition failure preserves every custom letter character in an editable fallback');
  await blocked(page,'Unsupported glyph');
  repairedLetter=unsupported.replace(emoji,'').trim();await page.locator('#packet-letter').fill(repairedLetter);await page.locator('#packet-save').click();await restored(page,'Corrected unsupported glyph');
   const repaired=(await req('GET',glyphCase.route+'/packet')).json.view.packet;
   check.equal(repaired.letter_text,repairedLetter,'removing only the unsupported character keeps the consumer wording without resetting the letter');
   check.deepEqual(repaired.annotations,savedAnnotations,'unsupported-character fallback and letter repair preserve every existing saved annotation');
  await page.screenshot({path:path.join(out,'recovered-unsupported-glyph.png'),fullPage:true});
 }finally{await glyphUi.context.close();}

 // Hold one real raster response after metadata has created all native editors.
 // This is an explicit browser transport failure, not a substitute renderer.
 const longLetter=repairedLetter+'\n\n'+Array.from({length:40},(_,i)=>'Recovery paragraph '+(i+1)+': Please compare the actual account dates and keep my explanation when I correct this letter.').join('\n\n');
 await req('POST',glyphCase.route+'/packet/letter',{letter_text:longLetter});
 let reachedImage,releaseImage;
 const imageReached=new Promise(resolve=>{reachedImage=resolve;}),imageRelease=new Promise(resolve=>{releaseImage=resolve;});
 const imagePattern='**'+glyphCase.route+'/packet/preview/pages/2?*';
 const rejectImage=async route=>{reachedImage();await imageRelease;await route.fulfill({status:503,contentType:'text/plain',body:'Fictional page-image transport failure'});};
 const rasterUi=await openPacket(glyphCase.c,page=>page.route(imagePattern,rejectImage));
 try{
  const {page}=rasterUi;
  let imageTimer;
  try{await Promise.race([imageReached,new Promise((_,reject)=>{imageTimer=setTimeout(()=>reject(new Error('The expected second packet page image was not requested.')),60000);})]);}
  finally{clearTimeout(imageTimer);}
  check.ok(await page.locator('[data-packet-letter-page]').count()>1,'raster recovery reaches multiple real native letter pages before the delayed image fails');
  await page.locator('[data-packet-letter-page]').nth(0).fill('x'.repeat(14000));await page.locator('[data-packet-letter-page]').nth(1).fill('y'.repeat(14000));
   await reviewControlsAbsent(page,check,'Delayed raster Review');
  const draft=await page.locator('[data-packet-letter-page]').evaluateAll(nodes=>nodes.map(node=>node.value).join('\n'));
  check.ok(draft.length>24000,'partial-page failure fixture exceeds the aggregate letter limit without truncating native page drafts');
  releaseImage();await waitFallback(page);await page.unroute(imagePattern,rejectImage);
  check.equal(await page.locator('#packet-letter').inputValue(),draft,'a later raster failure preserves the whole over-limit multi-page draft in the fallback');
  await blocked(page,'Later raster failure');
  const valid=longLetter+'\nFictional wording repaired after the page-image failure.';
  await page.locator('#packet-letter').fill(valid);await page.locator('#packet-save').click();await restored(page,'Corrected failed raster');
  const saved=(await req('GET',glyphCase.route+'/packet')).json.view;
  check.equal(saved.packet.letter_text,valid,'editing the fallback replaces the rejected aggregate draft without losing valid custom wording');
   check.deepEqual(saved.packet.annotations,savedAnnotations,'raster fallback and repaired letter Save preserve every existing saved annotation exactly');
  await page.locator('#packet-preview-reviewed').check();await page.locator('#packet-approve').click();await page.locator('#packet-download:enabled').waitFor();
  check.equal((await req('GET',glyphCase.route+'/packet-download')).status,200,'recovered full raster review can be explicitly approved and downloaded');
  const approvedBeforeDate=(await req('GET',glyphCase.route+'/packet-download')).bytes;
  const dateBefore=await page.locator('#packet-letter-date').inputValue(),nextDate=dateBefore==='2026-10-16'?'2026-10-17':'2026-10-16';
  const nativeBeforeDate=await page.locator('[data-packet-letter-page]').evaluateAll(nodes=>nodes.map(node=>node.value));
  let datePosts=0;const countDatePosts=request=>{if(request.method()==='POST'&&new URL(request.url()).pathname.startsWith(glyphCase.route+'/packet/'))datePosts++;};
  page.on('request',countDatePosts);
  page.once('dialog',async dialog=>{check.equal(dialog.type(),'confirm','changing a custom native letter date asks for explicit replacement');await dialog.dismiss();});
  await page.locator('#packet-letter-date').evaluate((node,value)=>{node.value=value;node.dispatchEvent(new Event('input',{bubbles:true}));node.dispatchEvent(new Event('change',{bubbles:true}));},nextDate);
  check.equal(await page.locator('#packet-letter-date').inputValue(),dateBefore,'Cancel restores the accepted letter-date choice');
  check.deepEqual(await page.locator('[data-packet-letter-page]').evaluateAll(nodes=>nodes.map(node=>node.value)),nativeBeforeDate,'Cancel preserves every native continuation-page edit');
  check.equal(datePosts,0,'Cancel sends no packet write');
  check.ok(await page.locator('#packet-download').isEnabled()&&await page.locator('#packet-print').isEnabled(),'Cancel preserves current approval and print/download controls');
  check.ok((await req('GET',glyphCase.route+'/packet-download')).bytes.equals(approvedBeforeDate),'Cancel preserves the exact approved PDF bytes');
   check.deepEqual((await req('GET',glyphCase.route+'/packet')).json.view.packet.annotations,savedAnnotations,'date Cancel preserves every existing saved annotation');
  await page.locator('[data-packet-letter-page]').nth(0).fill('x'.repeat(14000));await page.locator('[data-packet-letter-page]').nth(1).fill('y'.repeat(14000));
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('#packet-letter-date').evaluate((node,value)=>{node.value=value;node.dispatchEvent(new Event('input',{bubbles:true}));node.dispatchEvent(new Event('change',{bubbles:true}));},nextDate);
  check.equal(await page.locator('[data-packet-letter-page]').evaluateAll(nodes=>nodes.length>1&&nodes.every(node=>node.disabled)),true,'confirmed replacement disables every old native letter page');
  await page.locator('#packet-save').click();await restored(page,'Confirmed prepared-letter date replacement');
  const dated=(await req('GET',glyphCase.route+'/packet')).json.view.packet;
  check.equal(dated.letter_date,nextDate,'confirmed replacement stores the explicitly chosen prepared-letter date');
  check.equal(dated.letter_text,null,'explicit replacement can discard an oversized unsaved native draft without silently keeping old prose');
   check.deepEqual(dated.annotations,savedAnnotations,'confirmed date replacement retains every existing saved annotation exactly');
  check.ok(await page.locator('#packet-print').isDisabled()&&await page.locator('#packet-download').isDisabled(),'replacement requires fresh review and approval before print/download');
  page.off('request',countDatePosts);
  await page.screenshot({path:path.join(out,'recovered-later-raster.png'),fullPage:true});
 }finally{releaseImage();await rasterUi.context.close();}

 const copyCase=await makeCase('unreadable-copy'),copyView=(await req('GET',copyCase.route+'/packet')).json.view;
 const customLetter=copyView.packet.correspondence_preview+'\nFictional supporting-copy explanation must survive replacement.';
 await req('POST',copyCase.route+'/packet/letter',{letter_text:customLetter});
 const unreadable=Buffer.from('%PDF-1.7\nFICTIONAL UNREADABLE SUPPORT COPY\n%%EOF\n');
 const replacement=buildPdf({pages:[{lines:['FICTIONAL SUPPORTING EVIDENCE','Payment record for the selected account']}]});
 const uploads=[];
 for(const [name,bytes] of [['unreadable',unreadable],['replacement',replacement]]){
  const response=await req('POST','/api/account/documents',{originalFilename:'fictional-recovery-'+name+'.pdf',mimeType:'application/pdf',declaredBytes:bytes.length,contentBase64:bytes.toString('base64'),document_type:'SUPPORTING',document_kind:'OTHER_EVIDENCE'});
  check.equal(response.status,201,'support-copy recovery reaches the admitted fictional '+name+' document');uploads.push(response.json.document.file_id);
 }
 await req('POST',copyCase.route+'/packet/support',{support:{...copyView.support.settings,document_ids:[...copyView.support.selected_document_ids,uploads[0]]}});
 const copyUi=await openPacket(copyCase.c);
 try{
  const {page}=copyUi;await waitFallback(page);await page.getByText('We could not add "fictional-recovery-unreadable.pdf".',{exact:false}).first().waitFor();
  check.ok((await page.locator('#packet-all-pages').innerText()).includes('Editing your letter will not fix this attachment.'),'attachment fallback distinguishes file replacement from letter editing');
  // Use the current saved version for the actual attachment refusal.
  const currentCopy=(await req('GET',copyCase.route+'/packet')).json.view;
  const attachmentError=await req('GET',copyCase.route+'/packet/preview/pages?version='+currentCopy.packet.preview_version);
  check.equal(attachmentError.json.error.detail.filename,'fictional-recovery-unreadable.pdf','owned API identifies the unreadable copy by its saved filename');
  check.equal(await page.locator('#packet-letter').inputValue(),customLetter,'an unreadable selected supporting copy leaves existing custom wording editable');
  await blocked(page,'Unreadable supporting copy');
  const corrected=customLetter+'\nFictional fallback edit remains after choosing a clear copy.';
  await page.locator('#packet-letter').fill(corrected);
  const failedAgain=page.waitForResponse(response=>new URL(response.url()).pathname===copyCase.route+'/packet/preview/pages'&&response.status()===400);
  await page.locator('#packet-save').click();check.equal((await(await failedAgain).json()).error.code,'PACKET_ATTACHMENT_UNREADABLE','saving the repaired wording still reports the genuinely unreadable selected copy');
  await waitFallback(page);check.equal(await page.locator('#packet-letter').inputValue(),corrected,'a repeated attachment refusal preserves the corrected fallback wording');
  await page.locator('#packet-prepare-missing').click();await page.locator('#packet-preparation-content').waitFor();
  const beforeValidation=(await req('GET',copyCase.route+'/packet')).json.view.packet;
  const rejectedBeforeReview=page.waitForResponse(response=>new URL(response.url()).pathname===copyCase.route+'/packet/preview/pages'&&response.status()===400);
  await page.locator('#packet-prepare-next').click();await rejectedBeforeReview;
  await page.locator('#packet-missing-items').getByText('We could not add "fictional-recovery-unreadable.pdf".',{exact:false}).waitFor();
  check.ok(await page.locator('#packet-preparation-content').isVisible(),'unreadable selected evidence is rejected before entering Review');
  check.equal(await page.locator('[data-packet-page]').count(),0,'prevalidation opens no partial packet pages');
  check.equal((await req('GET',copyCase.route+'/packet')).json.view.packet.letter_text,beforeValidation.letter_text,'prevalidation preserves the saved letter');
  const stranger=await t.account('packet-attachment-stranger@example.test');
  const hidden=await t.request('GET',copyCase.route+'/packet/preview/pages?version='+currentCopy.packet.preview_version,{token:stranger.token});
  check.equal(hidden.status,403,'a different account cannot validate or identify the selected private attachment');
  check.ok(!JSON.stringify(hidden.json).includes('fictional-recovery-unreadable.pdf'),'private filenames do not leak through ownership refusal');
  await page.locator('[data-step="3"]').click();await page.locator('#create-packet').waitFor();
  const refusedCreate=page.waitForResponse(response=>new URL(response.url()).pathname===copyCase.route+'/packet/preview/pages'&&response.status()===400);
  await page.locator('#create-packet').click();await refusedCreate;
  await page.locator('#packet-preparation-content').waitFor();
  check.ok((await page.locator('#packet-missing-items').innerText()).includes('fictional-recovery-unreadable.pdf'),'the normal results-to-packet action also names the attachment and stays in preparation');
  await page.locator('[data-packet-document="'+uploads[0]+'"]').uncheck();await page.locator('[data-packet-document="'+uploads[1]+'"]').check();
  await page.locator('#packet-prepare-next').click();await restored(page,'Replacement supporting copy');
  const saved=(await req('GET',copyCase.route+'/packet')).json.view;
  check.equal(saved.packet.letter_text,corrected,'replacing the bad copy retains the consumer letter and fallback edits');
  check.ok(!saved.support.selected_document_ids.includes(uploads[0])&&saved.support.selected_document_ids.includes(uploads[1]),'document recovery replaces only the chosen supporting copy');
  const metadata=(await req('GET',copyCase.route+'/packet/preview/pages?version='+saved.packet.preview_version)).json;
  check.deepEqual(metadata.sections.filter(section=>section.kind==='document').map(section=>section.label),['SUPPORTING','IDENTITY','IDENTITY','ADDRESS'],'recovered supporting evidence precedes the identity and address copies');
  check.ok(await page.locator('#packet-approve').isDisabled()&&await page.locator('#packet-print').isDisabled(),'a recovered copy still needs the consumer to review and approve the complete packet');
  await page.locator('#packet-preview-reviewed').check();await page.locator('#packet-approve').click();await page.locator('#packet-download:enabled').waitFor();
  const download=page.waitForEvent('download');await page.locator('#packet-download').click();await(await download).saveAs(path.join(out,'recovered-supporting-copy.pdf'));
  const bytes=fs.readFileSync(path.join(out,'recovered-supporting-copy.pdf'));
  const text=require('../packet-pdf-assertions.cjs').comparableText(require('../packet-pdf-assertions.cjs').pdfText(bytes));
  check.ok(text.includes('Fictional fallback edit remains after choosing a clear copy.')&&text.includes('FICTIONAL SUPPORTING EVIDENCE'),'the actual recovered download contains the retained words and readable replacement evidence');
  await page.screenshot({path:path.join(out,'recovered-supporting-copy.png'),fullPage:true});
  const statement=Buffer.from(require('./ew-inline-packet-composer.cjs').ENCRYPTED_FIXTURES.nocopy,'base64');
  const statementUpload=await req('POST','/api/account/documents',{originalFilename:'fictional-bank-statement.pdf',mimeType:'application/pdf',declaredBytes:statement.length,contentBase64:statement.toString('base64'),document_type:'SUPPORTING',document_kind:'OTHER_EVIDENCE'});
  check.equal(statementUpload.status,201,'print-permitted copy-restricted supporting statement uploads normally');
  const statementId=statementUpload.json.document.file_id;
  // Set up the newly uploaded supporting choice through the normal owned API;
  // the following browser action exercises its actual pre-review validation.
  const statementIds=[...saved.support.selected_document_ids.filter(id=>id!==uploads[1]),statementId];
  const statementSelection=await req('POST',copyCase.route+'/packet/support',{support:{...saved.support.settings,document_ids:statementIds,
    document_dates:Object.fromEntries(statementIds.map(id=>[id,saved.support.settings.document_dates?.[id]||'']))}});
  check.equal(statementSelection.status,200,'the ordinary owned API saves the exact statement choice and matching date fields');
  await page.locator('[data-step="5"]').click();await page.locator('#packet-preparation-content').waitFor();
  await page.locator('#packet-prepare-next').click();await restored(page,'Print-permitted restricted statement');
  check.equal(await page.getByText('This supporting copy is shown as images. Your original upload is unchanged.',{exact:true}).count(),2,'both bank-statement image pages are disclosed in the actual browser');
  const statementView=(await req('GET',copyCase.route+'/packet')).json.view;
  const statementPages=(await req('GET',copyCase.route+'/packet/preview/pages?version='+statementView.packet.preview_version)).json;
  const section=statementPages.sections.find(section=>section.file_id===statementId);
  check.deepEqual(section.source_pages,[1,2],'the reviewed statement includes both original pages in order');
  check.equal(section.original_sha256,sha(statement),'review metadata binds the image copy to the exact original statement');
  check.ok((await req('GET','/api/account/documents/'+statementId)).bytes.equals(statement),'the stored original statement stays byte-exact after image conversion');
  check.equal(statementView.packet.letter_text,corrected,'statement image conversion preserves the consumer letter');
  check.equal(statementView.packet.approved,false,'image conversion requires fresh consumer review and approval');
  await page.locator('#packet-preview-reviewed').check();await page.locator('#packet-approve').click();await page.locator('#packet-download:enabled').waitFor();
  const statementDownload=await req('GET',copyCase.route+'/packet-download'),statementPrint=await req('GET',copyCase.route+'/packet-print');
  check.ok(statementDownload.status===200&&statementPrint.bytes.equals(statementDownload.bytes),'approved statement-image packet has identical download and print bytes');
  fs.writeFileSync(path.join(out,'restricted-statement-packet.pdf'),statementDownload.bytes);
  await page.screenshot({path:path.join(out,'restricted-statement-review.png'),fullPage:true});
 }finally{await copyUi.context.close();}
  return{unsupported_glyph_wording_preserved:true,unreadable_copy_replaced:true,later_raster_letter_draft_preserved:true,saved_annotation_preserved:true,native_date_cancel_preserves_all_pages:true,confirmed_date_replacement_discards_only_accepted_letter_edits:true};
}
async function run(t,check){
 const out=path.join(R,'accelerated-launch/service/out/packet-review-mailing');fs.mkdirSync(out,{recursive:true});
 const a=await t.account('packet-review-mailing@example.test'),req=(m,u,body)=>t.request(m,u,{token:a.token,body});
 const c=(await req('POST','/api/cases',{country:'CA',region:'CA-NS',bureau:'EQUIFAX'})).json.case,route='/api/cases/'+c.case_id;
 const source=buildPdf({pages:[{lines:['Equifax Consumer Credit Report','Report Date: June 12, 2026','Creditor: Fictional Packet Bank','Account Number: ****1234','Balance $100','Opened 2020-01-01','Closed 2019-01-01']}]});
 check.equal((await req('POST',route+'/files',{originalFilename:'fictional-packet-report.pdf',mimeType:'application/pdf',declaredBytes:source.length,contentBase64:source.toString('base64')})).status,201,'native report uploaded through the owned route');
 check.equal((await req('POST',route+'/evaluate',{})).status,201,'native evidence assessed');
 const offered=(await req('GET',route+'/packet')).json.view;check.ok(offered.eligible_issues.length>0,'the report produces a supported issue');
 await req('POST',route+'/packet/select',{issue_ids:offered.eligible_issues.map(i=>i.issue_id)});await t.preparePostalPacket(a,c.case_id);
  const savedAnnotations=await seedSavedAnnotation(req,route,'Please compare these impossible account dates.',check);
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{
   const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(20000);
   let annotationPosts=0;page.on('request',request=>{if(request.method()==='POST'&&new URL(request.url()).pathname===route+'/packet/annotations')annotationPosts++;});
   await page.goto(t.base+'/index.html#signin');await page.locator('#email').fill(a.email);await page.locator('#password').fill('a-long-enough-password');await page.locator('#signin').click();await page.locator('#signin-skip-two-factor').click();await page.locator('#open').waitFor();await page.locator('#refresh').click();await page.locator('[data-open="'+c.case_id+'"]').click();await page.locator('#create-packet').waitFor();await page.locator('[data-step="6"]').click();await page.locator('#packet-pdf-review').waitFor();
  check.ok(await page.locator('#packet-selection').isHidden(),'review hides the previous issue choices');check.ok(await page.locator('#packet-preparation-content').isHidden(),'review hides previous document preparation');check.ok(!(await page.locator('#panel').innerText()).includes('Choose the issues you want the bureau'),'review does not repeat the issue-choice instruction');
  await page.locator('#packet-letter').waitFor(); await page.locator('#packet-preview-reviewed:enabled').waitFor();
  const currentView=(await req('GET',route+'/packet')).json.view,metadata=(await req('GET',route+'/packet/preview/pages?version='+currentView.packet.preview_version)).json;
  check.equal(await page.locator('[data-packet-page]').count(),metadata.page_count,'every physical page is visible inline, including report and ID/address copies');
  check.equal(await page.locator('.packet-page-image').evaluateAll(images=>images.every(image=>image.complete&&image.naturalWidth>0)),true,'every inline physical page actually rendered');
  check.equal(await page.locator('#packet-letter').evaluate(node=>Boolean(node.closest('[data-packet-page]'))),true,'the consumer edits the letter within its actual packet page');
  check.equal(await page.locator('#review').count(),0,'review does not repeat the assessment-review button');
  check.ok(await page.locator('#packet-approve').isDisabled()&&await page.locator('#packet-print').isDisabled()&&await page.locator('#packet-download').isDisabled(),'unapproved printing and downloading are blocked with clear requirements');
  const original=await page.locator('#packet-letter').inputValue();await page.locator('#packet-letter').fill(original+'\nFictional custom edit.');await page.locator('#packet-save').click();await page.getByText('Packet saved. Check your letter and every page in the PDF.',{exact:true}).waitFor();check.ok((await page.locator('#packet-letter').inputValue()).includes('Fictional custom edit.'),'Save persists the full consumer letter');
   check.deepEqual((await req('GET',route+'/packet')).json.view.packet.annotations,savedAnnotations,'ordinary letter Save preserves every existing saved annotation');
  await page.locator('#packet-reset-letter').click();await page.getByText('The prepared letter is restored. Check it and every page before approving.',{exact:true}).waitFor();check.equal(await page.locator('#packet-letter').inputValue(),original,'Use the prepared letter visibly restores it without another save click');check.equal((await req('GET',route+'/packet')).json.view.packet.letter_text,null,'reset removes the stored override through the owned API');
   check.deepEqual((await req('GET',route+'/packet')).json.view.packet.annotations,savedAnnotations,'prepared-letter reset preserves every existing saved annotation');
  await page.locator('#packet-preview-reviewed').check();check.ok(await page.locator('#packet-approve').isEnabled(),'page acknowledgement enables approval');await page.locator('#packet-approve').click();await page.locator('#packet-approved-status').waitFor();await page.locator('#packet-download:enabled').waitFor();check.ok(await page.locator('#packet-print').isEnabled()&&await page.locator('#packet-download').isEnabled(),'approval enables the actual print/download controls');
  const download=page.waitForEvent('download');await page.locator('#packet-download').click();const artifact=await download;await artifact.saveAs(path.join(out,'approved-packet.pdf'));const bytes=fs.readFileSync(path.join(out,'approved-packet.pdf'));
  const preview=(await req('GET',(await req('GET',route+'/packet')).json.view.packet.letter_preview_url)).bytes;check.ok(bytes.equals(preview),'actual browser download equals the reviewed PDF');
  const popup=page.waitForEvent('popup'),response=page.waitForResponse(r=>new URL(r.url()).pathname===route+'/packet-print');await page.locator('#packet-print').click();const printPage=await popup;await printPage.waitForURL('blob:**');check.ok((await(await response).body()).equals(bytes),'print receives those same approved bytes');await printPage.close();
  const printed=packets.packetPrint(t.service.store,a,c.case_id);check.equal(printed.sections[0].kind,'instructions','the first physical page is the consumer instruction sheet');check.equal(printed.sections[0].send_to_bureau,false,'the instruction sheet is not bureau correspondence');check.equal(printed.sections.find(s=>s.kind==='letter').start_page,2,'the sendable letter begins on page two');
  const first=execFileSync('pdftotext',['-f','1','-l','1','-layout','-','-'],{input:bytes,encoding:'utf8'}),letter=execFileSync('pdftotext',['-f','2','-l','2','-layout','-','-'],{input:bytes,encoding:'utf8'});
  check.ok(first.includes('REMOVE THIS PAGE BEFORE MAILING')&&first.includes('Print pages 2 onward')&&first.includes('Do not put this instruction sheet in the envelope'),'the standalone instruction page tells the consumer to exclude it');check.ok(!letter.includes('YOUR MAILING INSTRUCTIONS')&&letter.includes('Re: Credit report dispute'),'instructions are separate from the signed letter');
  check.ok((await page.locator('#packet-ready-status').innerText()).includes('Remove it before mailing'),'the visible ready message reinforces removal');
  const before=sha(bytes);await page.locator('[data-step="5"]').click();await page.locator('#packet-preparation-content').waitFor();
  check.equal(await page.locator('#packet-verification-requested,#packet-copies-confirmed').count(),0,'Prepare has no repeated identity or copy-quality confirmations');
  check.equal(await page.locator('#packet-account-details:visible').count(),0,'complete saved contact details and copies do not prompt another Account or upload detour');
  check.equal(await page.locator('[data-packet-document]:visible').count(),0,'complete saved document copies do not need to be selected again');
  await page.locator('#packet-prepare-next').click();await page.locator('#packet-approved-status').waitFor();check.equal(sha((await req('GET',route+'/packet-download')).bytes),before,'unchanged backward/forward navigation preserves approval and bytes');
  await page.locator('#packet-download:enabled').waitFor();
  await page.locator('#packet-letter-date').fill('2026-10-14');await page.locator('#packet-save').click();await page.locator('#packet-preview-reviewed:enabled').waitFor();
   const dated=(await req('GET',route+'/packet')).json.view.packet;
   check.equal(dated.letter_date,'2026-10-14','the consumer can set the letter date before approval');
   check.deepEqual(dated.annotations,savedAnnotations,'date Save preserves every existing saved annotation');
  const longLetter=original+'\n\n'+Array.from({length:28},(_,i)=>'Fictional paragraph '+(i+1)+': Please review the dates shown on my selected report page and explain your correction.').join('\n\n');
  await page.locator('#packet-letter').fill(longLetter);await page.locator('#packet-save').click();await page.locator('#packet-preview-reviewed:enabled').waitFor();
  check.ok(await page.locator('[data-packet-letter-page]').count()>1,'long inline wording reflows to visible editable continuation pages');
  const editorDrafts=await page.locator('[data-packet-letter-page]').evaluateAll(nodes=>nodes.map(node=>node.value));
  await page.locator('[data-packet-letter-page]').nth(0).fill('x'.repeat(14000));await page.locator('[data-packet-letter-page]').nth(1).fill('y'.repeat(14000));
  await page.locator('#packet-save').click();await page.getByText('Your letter is too long. Shorten it to 24,000 characters, then save again.',{exact:true}).waitFor();
  check.equal(await page.locator('[data-packet-letter-page]').nth(0).inputValue(),'x'.repeat(14000),'a rejected aggregate letter save preserves the first inline draft');
  check.equal(await page.locator('[data-packet-letter-page]').nth(1).inputValue(),'y'.repeat(14000),'a rejected aggregate letter save preserves continuation-page edits');
  check.ok(await page.locator('#packet-download').isDisabled()&&await page.locator('#packet-approve').isDisabled(),'a rejected save never restores old approval');
  for(let i=0;i<editorDrafts.length;i++)await page.locator('[data-packet-letter-page]').nth(i).fill(editorDrafts[i]);
  const last=page.locator('[data-packet-letter-page]').last();await last.fill((await last.inputValue())+'\nFictional final-page consumer edit.');
  await page.locator('#packet-save').click();await page.locator('#packet-preview-reviewed:enabled').waitFor();
  check.ok((await page.locator('[data-packet-letter-page]').last().inputValue()).includes('Fictional final-page consumer edit.'),'the final inline letter page is editable and saved');
  await page.locator('#packet-preview-reviewed').check();await page.locator('#packet-approve').click();await page.locator('#packet-download:enabled').waitFor();
  const finalDownload=page.waitForEvent('download');await page.locator('#packet-download').click();await(await finalDownload).saveAs(path.join(out,'complete-edited-packet.pdf'));
  const editedBytes=fs.readFileSync(path.join(out,'complete-edited-packet.pdf')),finalView=(await req('GET',route+'/packet')).json.view;
   check.deepEqual(finalView.packet.annotations,savedAnnotations,'saved annotations remain exact after long-letter edits and final approval');
  check.ok(editedBytes.equals((await req('GET',finalView.packet.letter_preview_url)).bytes),'the browser downloads the exact complete packet reviewed after all inline edits');
  const normalized=require('../packet-pdf-assertions.cjs').comparableText(require('../packet-pdf-assertions.cjs').pdfText(editedBytes));
  check.ok(normalized.includes('Fictional final-page consumer edit.')&&normalized.includes('Please compare these impossible account dates.'),'the printable packet retains the last-page edit and evidence note');
  const finalPrintResponse=page.waitForResponse(r=>new URL(r.url()).pathname===route+'/packet-print'),finalPopup=page.waitForEvent('popup');await page.locator('#packet-print').click();const finalPrintPage=await finalPopup;await finalPrintPage.waitForURL('blob:**');check.ok((await(await finalPrintResponse).body()).equals(editedBytes),'printing uses that same saved and approved edited PDF');await finalPrintPage.close();
  const recovery=await recoveryChecks(t,browser,a,source,check,out);
   const finalMetadata=(await req('GET',route+'/packet/preview/pages?version='+finalView.packet.preview_version)).json;
   for(const width of [1440,390]){
    await page.setViewportSize({width,height:1000});await reviewControlsAbsent(page,check,'Review at '+width+'px');
    check.equal(await page.locator('[data-packet-page]').count(),finalMetadata.page_count,'every physical page remains inline at '+width+'px');
    check.equal(await page.locator('.packet-page-image').evaluateAll(images=>images.length>1&&images.every(image=>image.complete&&image.naturalWidth>0)),true,'every physical page remains rendered at '+width+'px');
    check.ok(await page.locator('[data-packet-letter-page]').first().isEditable(),'inline letter editing remains available at '+width+'px');
    await page.screenshot({path:path.join(out,'review-'+width+'.png'),fullPage:true});check.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'review has no horizontal overflow at '+width+'px');
   }
   check.equal(annotationPosts,0,'Review never posts annotation edits while saving letters, dates, resets or approval');
  execFileSync('pdftoppm',['-scale-to','1000','-png',path.join(out,'complete-edited-packet.pdf'),path.join(out,'packet-page')],{timeout:30000,stdio:['ignore','pipe','pipe']});
   return{actual_browser:true,all_pages_inline:true,inline_last_page_edit:true,saved_annotation_preserved:true,manual_highlight_controls_absent:true,review_contact_upload_shortcut_absent:true,review_content_isolated:true,prepared_letter_reset:true,instruction_page_separate:true,actual_print_download:true,recovery,pdf_sha256:sha(editedBytes),original_pdf_sha256:before,sections:packets.packetPrint(t.service.store,a,c.case_id).sections,screenshots:['review-1440.png','review-390.png']};
 }finally{await browser.close();}
}
module.exports={run,id:'ga-packet-review-mailing',title:'Focused packet review, working reset/approval/print/download and removable self-mail instructions'};
