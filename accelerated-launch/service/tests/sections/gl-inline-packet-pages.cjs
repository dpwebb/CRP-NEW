'use strict';
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { buildPdf } = require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');
const { PDFDocument } = require('../../pdf-vendor/pdf-lib-1.17.1.min.js');
const { composePacket } = require('../../packet-composer.cjs');
const { pdfText, comparableText } = require('../packet-pdf-assertions.cjs');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const PNG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function raster(bytes, page) {
  return execFileSync('pdftoppm', ['-f', String(page), '-l', String(page), '-singlefile', '-scale-to', '1600', '-png', '-'],
    { input: bytes, timeout: 20000, maxBuffer: 12 * 1024 * 1024, windowsHide: true, env: { ...process.env, LC_ALL: 'C' } });
}

async function run(t, check) {
  const owner = await t.account('all-packet-pages@example.test');
  const other = await t.account('all-packet-pages-other@example.test');
  const request = (method, url, body) => t.request(method, url, { token: owner.token, body });
  const created = await request('POST', '/api/cases', { country: 'CA', region: 'CA-NS', bureau: 'EQUIFAX' });
  const caseId = created.json.case.case_id, base = '/api/cases/' + caseId;
  const source = buildPdf({ pages: [
    { lines: ['Equifax Consumer Credit Report', 'Report Date: June 12, 2026', 'FICTIONAL COVER ONLY'] },
    { lines: ['Fictional Packet Lender Balance $100 Opened 2020-01-01 Closed 2019-01-01',
      'Account Number: ****8524', 'ACTUAL DISPUTED SOURCE PAGE'] },
    { lines: ['UNRELATED REPORT PAGE MUST STAY OUT', 'General information'] }
  ] });
  check.equal((await request('POST', base + '/files', { originalFilename: 'fictional-inline-pages.pdf',
    mimeType: 'application/pdf', declaredBytes: source.length, contentBase64: source.toString('base64') })).status, 201,
  'fictional multipage source is uploaded through the owned route');
  check.equal((await request('POST', base + '/evaluate', {})).status, 201, 'fictional source is assessed');
  const initial = (await request('GET', base + '/packet')).json.view;
  check.equal(initial.eligible_issues.length, 1, 'fictional account dates produce the actual supported issue');
  await request('POST', base + '/packet/select', { issue_ids: initial.eligible_issues.map(issue => issue.issue_id) });
  await t.preparePostalPacket(owner, caseId);
  let view = (await request('GET', base + '/packet')).json.view;
  const supportingBytes=buildPdf({pages:[{lines:['FICTIONAL PAYMENT RECEIPT - SUPPORTING EVIDENCE']}]});
  const supporting=await request('POST','/api/account/documents',{originalFilename:'fictional-payment-receipt.pdf',mimeType:'application/pdf',declaredBytes:supportingBytes.length,contentBase64:supportingBytes.toString('base64'),document_type:'SUPPORTING',document_kind:'PAYMENT_RECEIPT'});
  check.equal(supporting.status,201,'consumer can upload optional supporting evidence through the owned account route');
  check.equal((await request('POST',base+'/packet/support',{support:{...view.support.settings,document_ids:[...view.support.settings.document_ids,supporting.json.document.file_id]}})).status,200,'optional supporting evidence is selected alongside ID/address copies');
  view=(await request('GET',base+'/packet')).json.view;
  const sourceId = view.packet.report_attachment_manifest[0].file_id;
  const factsBefore = hash(Buffer.from(JSON.stringify(t.service.store.state().results.find(row => row.case_id === caseId))));
  const originals = new Map([sourceId, ...view.support.settings.document_ids]
    .map(id => [id, hash(t.service.store.readBlob(id))]));
  const metadataUrl = version => base + '/packet/preview/pages?version=' + encodeURIComponent(version);
  const imageUrl = (version, page) => base + '/packet/preview/pages/' + page + '?version=' + encodeURIComponent(version);
  const pdfUrl = version => base + '/packet/preview?version=' + encodeURIComponent(version);
  const version = view.packet.preview_version;
  const metadata = await request('GET', metadataUrl(version));
  check.equal(metadata.status, 200, 'owned subscriber receives complete page metadata');
  const review = metadata.json;
  const preview = await request('GET', pdfUrl(version));
  const doc = await PDFDocument.load(preview.bytes);
  check.equal(review.version, version, 'all-page metadata carries the current packet version');
  check.equal(review.sha256, hash(preview.bytes), 'page metadata is bound to the complete inline PDF digest');
  check.equal(review.page_count, doc.getPageCount(), 'metadata covers every physical PDF page');
  check.deepEqual(review.review_pages.map(page => page.page), Array.from({ length: doc.getPageCount() }, (_, index) => index + 1),
    'review pages contain every physical page exactly once in print order');
  check.deepEqual(review.sections.map(section => section.kind), ['instructions', 'letter', 'report', 'document', 'document', 'document', 'document'],
    'instructions, ordinary letter, selected report pages and chosen supporting copies appear in order');
  check.deepEqual(review.sections.filter(section=>section.kind==='document').map(section=>section.label),['SUPPORTING','IDENTITY','IDENTITY','ADDRESS'],'actual supporting evidence precedes identification and address copies');
  check.equal(review.sections[0].send_to_bureau, false, 'the consumer-only instruction page is marked not to send');
  check.equal(review.sections.reduce((count, section) => count + section.page_count, 0), review.page_count,
    'section page counts account for the whole PDF');
  const reportPage = review.review_pages.find(page => page.kind === 'report');
  check.equal(reportPage.file_id, sourceId, 'report page metadata retains the owned original file identity');
  check.equal(reportPage.source_page, 2, 'report page metadata identifies the selected original page rather than the report cover');
  check.ok(reportPage.source_width > 0 && reportPage.source_height > 0, 'report annotation geometry carries original page dimensions');
  check.ok(!pdfText(preview.bytes).includes('UNRELATED REPORT PAGE MUST STAY OUT'), 'unrelated original report pages are excluded');
  for (const field of review.editable_fields) {
    check.equal(field.text, doc.getForm().getTextField(field.name).getText(), 'inline editor text equals the native PDF field: ' + field.name);
    check.ok(Number.isSafeInteger(field.page) && field.page > 1 && field.page <= review.page_count
      && ['x', 'y', 'width', 'height', 'page_width', 'page_height', 'font_size'].every(key => Number.isFinite(field[key]))
      && field.width > 0 && field.height > 0 && field.font_size >= 10
      && field.x >= 0 && field.y >= 0 && field.x + field.width <= field.page_width + 0.01
      && field.y + field.height <= field.page_height + 0.01,
    'native letter field has usable on-page editing geometry: ' + field.name);
  }
  check.equal(comparableText(review.editable_fields.map(field => field.text).join(' ')), comparableText(view.packet.correspondence_preview),
    'the inline native fields expose the whole ordinary letter');
  const pageRasters = new Map();
  for (const page of review.review_pages) {
    const response = await request('GET', imageUrl(version, page.page));
    check.equal(response.status, 200, 'owned subscriber can see physical packet page ' + page.page);
    check.equal(response.headers.get('content-type'), 'image/png', 'physical packet page is a PNG: ' + page.page);
    check.equal(response.headers.get('x-crp-packet-version'), version, 'physical packet image is version-bound: ' + page.page);
    check.ok(response.bytes.subarray(0, 8).equals(PNG), 'physical packet page has actual PNG bytes: ' + page.page);
    check.ok(response.bytes.equals(raster(preview.bytes, page.page)), 'physical page shows the same PDF page that will print: ' + page.page);
    pageRasters.set(page.page, response.bytes);
  }
  check.equal((await t.request('GET', metadataUrl(version))).status, 401, 'anonymous page metadata is refused');
  check.equal((await t.request('GET', imageUrl(version, 1))).status, 401, 'anonymous page images are refused');
  check.equal((await t.request('GET', metadataUrl(version), { token: other.token })).status, 403, 'another subscriber cannot read page metadata');
  check.equal((await t.request('GET', imageUrl(version, reportPage.page), { token: other.token })).status, 403,
    'another subscriber cannot retrieve even a cached source-page image');
  for (const bad of ['0', '-1', '1.5', '0001', 'not-a-page', String(review.page_count + 1)]) {
    check.equal((await request('GET', imageUrl(version, bad))).status, 400, 'invalid physical page is refused: ' + bad);
  }
  for (const url of [base + '/packet/preview/pages', base + '/packet/preview/pages/1', metadataUrl('0'.repeat(64)), imageUrl('0'.repeat(64), 1)]) {
    const response = await request('GET', url);
    check.ok(response.status >= 400 && response.status < 500, 'page endpoints refuse absent or obsolete packet versions: ' + url.slice(base.length));
  }
  const approved = await request('POST', base + '/packet/approve', { reviewed_version: version });
  check.equal(approved.status, 200, 'the exact all-page reviewed packet can be approved');
  check.ok((await request('GET', base + '/packet-download')).bytes.equals(preview.bytes), 'download preserves the entire reviewed PDF');
  check.ok((await request('GET', base + '/packet-print')).bytes.equals(preview.bytes), 'print preserves the entire reviewed PDF');
  const annotation = { file_id: sourceId, page: 2, x: 0.08, y: 0.08, width: 0.75, height: 0.08,
    note: 'Please compare the opened and closed dates.' };
  const invalidAnnotations = [
    null, {}, [null], [{ ...annotation, file_id: '0'.repeat(32) }], [{ ...annotation, page: 1 }],
    [{ ...annotation, page: 3 }], [{ ...annotation, page: 2.5 }], [{ ...annotation, x: -0.01 }],
    [{ ...annotation, y: 0.99 }], [{ ...annotation, width: 0 }], [{ ...annotation, width: 1 }],
    [{ ...annotation, height: -0.01 }], [{ ...annotation, x: '0.08' }], [{ ...annotation, note: 'x'.repeat(201) }],
    [{ ...annotation, note: 'hidden\u0000text' }], [{ ...annotation, issue_id: 'unselected-issue' }],
    [{ ...annotation, extra: 'unreviewed content' }], Array.from({ length: 5 }, () => annotation),
    Array.from({ length: 5000 }, () => annotation)
  ];
  for (const [index, annotations] of invalidAnnotations.entries()) {
    check.equal((await request('POST', base + '/packet/annotations', { annotations, expected_version: version })).status, 400,
      'invalid or unrelated source-page annotation is refused atomically: ' + index);
  }
  check.equal((await request('GET', base + '/packet')).json.view.packet.preview_version, version,
    'rejected annotation edits do not change the reviewed recipe');
  check.ok((await request('GET', base + '/packet-download')).bytes.equals(preview.bytes),
    'rejected annotation edits leave existing approval and bytes intact');
  check.equal((await t.request('POST', base + '/packet/annotations', { body: { annotations: [annotation], expected_version: version } })).status, 401,
    'anonymous annotation saving is refused');
  check.equal((await t.request('POST', base + '/packet/annotations', { token: other.token, body: { annotations: [annotation], expected_version: version } })).status, 403,
    'another account cannot annotate this source page');
  check.equal((await request('POST', base + '/packet/annotations', { annotations: [annotation] })).json.error.code, 'PACKET_APPROVAL_STALE',
    'annotation edits require the packet version the consumer actually reviewed');
  const saved = await request('POST', base + '/packet/annotations', { annotations: [annotation], expected_version: version });
  check.equal(saved.status, 200, 'consumer can save an annotation on the actual selected original report page');
  view = saved.json.view;
  const annotatedVersion = view.packet.preview_version;
  check.ok(annotatedVersion !== version && !view.packet.approved, 'annotation changes the version and clears previous approval');
  const packetRow = t.service.store.state().packets.find(row => row.case_id === caseId);
  check.ok(!packetRow.approved_version && !packetRow.approved_at && !packetRow.approved_pdf_sha256,
    'annotation save clears all approval identity, date and PDF digest');
  check.equal((await request('GET', imageUrl(version, reportPage.page))).json.error.code, 'PACKET_APPROVAL_STALE',
    'old raster URL refuses after annotation save, even when cached');
  check.equal((await request('GET', metadataUrl(version))).json.error.code, 'PACKET_APPROVAL_STALE', 'old page metadata refuses after annotation save');
  check.equal((await request('POST', base + '/packet/annotations', { annotations: [], expected_version: version })).json.error.code, 'PACKET_APPROVAL_STALE',
    'an outdated editor cannot overwrite annotations saved for a newer packet');
  check.equal((await request('POST', base + '/packet/approve', { reviewed_version: version })).json.error.code, 'PACKET_APPROVAL_STALE',
    'a previously reviewed version cannot approve newly annotated evidence');
  check.equal((await request('GET', base + '/packet-download')).json.error.code, 'PACKET_NOT_APPROVED', 'annotation changes require a fresh approval');
  const annotated = await request('GET', pdfUrl(annotatedVersion));
  const concurrent=await Promise.all(Array.from({length:8},()=>request('GET',imageUrl(annotatedVersion,reportPage.page))));
  check.ok(concurrent.every(response=>response.status===200),'simultaneous requests for one uncached physical page share a bounded render');
  check.ok(concurrent.every(response=>response.bytes.equals(concurrent[0].bytes)),'concurrent physical-page responses retain identical complete-PDF raster bytes');
  check.ok(comparableText(pdfText(annotated.bytes)).includes(comparableText(annotation.note)),
    'consumer annotation note is present in the actual printable PDF');
  check.ok(!(await request('GET', imageUrl(annotatedVersion, reportPage.page))).bytes.equals(pageRasters.get(reportPage.page)),
    'the selected source page visibly includes the consumer annotation');
  check.ok((await request('GET', imageUrl(annotatedVersion, 1))).bytes.equals(pageRasters.get(1)),
    'annotating evidence does not alter the consumer instruction page');
  for (const [fileId, before] of originals) check.equal(hash(t.service.store.readBlob(fileId)), before,
    'annotations leave retained original report/support bytes untouched: ' + fileId);
  check.ok((await request('GET', base + '/packet/reports/' + sourceId)).bytes.equals(source),
    'the owned original report download remains byte-for-byte unchanged');
  check.equal(hash(Buffer.from(JSON.stringify(t.service.store.state().results.find(row => row.case_id === caseId)))), factsBefore,
    'annotations do not modify extracted report facts or assessment');
  await request('POST', base + '/packet/approve', { reviewed_version: annotatedVersion });
  const longLetter = 'Morgan Fiction\n\n' + Array.from({ length: 75 }, (_, index) =>
    `Paragraph ${index + 1}: Please compare the actual opened and closed dates on the selected report page. Please explain your findings and correct the information that is wrong.`).join('\n\n')
    + '\n\nThank you,\nMorgan Fiction';
  check.equal((await request('POST', base + '/packet/letter', { letter_text: longLetter })).status, 200, 'consumer can save a long complete inline letter');
  view = (await request('GET', base + '/packet')).json.view;
  const reflow = (await request('GET', metadataUrl(view.packet.preview_version))).json;
  const longPdf = await request('GET', pdfUrl(view.packet.preview_version));
  const longDoc = await PDFDocument.load(longPdf.bytes), letterSection = reflow.sections.find(section => section.kind === 'letter');
  check.ok(letterSection.page_count > 1, 'long consumer wording reflows into continuation pages');
  check.equal(reflow.page_count, longDoc.getPageCount(), 'metadata still accounts for the complete reflowed PDF');
  check.equal(comparableText(reflow.editable_fields.map(field => longDoc.getForm().getTextField(field.name).getText()).join(' ')), comparableText(longLetter),
    'every word of the long consumer letter survives in native editable fields');
  check.ok(reflow.editable_fields.every(field => field.font_size >= 10), 'long wording keeps readable native PDF type');
  check.equal(reflow.sections.find(section => section.kind === 'report').start_page, letterSection.start_page + letterSection.page_count,
    'source evidence moves after all continuation letter pages');
  check.ok(pdfText(longPdf.bytes).includes('Paragraph 75:')
    && comparableText(pdfText(longPdf.bytes)).includes(comparableText(annotation.note)),
    'the final letter paragraph and saved evidence annotation remain printable');
  check.equal((await request('GET', imageUrl(annotatedVersion, reportPage.page))).json.error.code, 'PACKET_APPROVAL_STALE',
    'letter reflow invalidates prior physical-page image coordinates');
  check.equal((await request('GET', base + '/packet-print')).json.error.code, 'PACKET_NOT_APPROVED', 'letter reflow requires approval before printing');
  const unpaid = await t.unpaidAccount('all-packet-pages-unpaid@example.test'), unpaidId = await t.assessedCase(unpaid);
  for (const [method, suffix, body] of [['GET', '/preview/pages?version=' + version], ['GET', '/preview/pages/1?version=' + version],
    ['POST', '/annotations', { annotations: [] }]]) {
    check.equal((await t.request(method, '/api/cases/' + unpaidId + '/packet' + suffix, { token: unpaid.token, body })).status, 402,
      'all-page review and annotation route retain subscriber entitlement: ' + suffix);
  }
  const croppedDoc = await PDFDocument.load(source);
  croppedDoc.getPage(1).setCropBox(20, 30, 500, 700);
  const croppedBytes = Buffer.from(await croppedDoc.save()), croppedHash = hash(croppedBytes);
  const cropped = composePacket({ letter_text: 'Morgan Fiction\n\nPlease check the opened and closed dates.\n\nMorgan Fiction',
    reports: [{ bytes: croppedBytes, content_type: 'application/pdf', relevant_pages: [2], file_id: 'fictional-cropped-source',
      markers: [{ issue_id: 'fictional-selected-date-issue', item_number: 1, page: 2, caption: 'Opened and closed dates',
        bbox: { x0: 40, y0: 82, x1: 370, y1: 98 }, omitted_value: false }] }] });
  check.deepEqual(cropped.review_pages.map(page => page.kind), ['letter', 'report', 'report-note'],
    'cropped original artwork retains its page and receives a separate explanatory page');
  check.equal(cropped.review_pages[1].annotation_available, false, 'cropped geometry refuses guessed inline consumer rectangles');
  check.deepEqual((await PDFDocument.load(cropped.bytes)).getPage(1).getCropBox(), croppedDoc.getPage(1).getCropBox(),
    'callout fallback preserves the original source crop exactly');
  check.equal(hash(croppedBytes), croppedHash, 'cropped-page callout does not mutate the source buffer');
  const renderer=require('../../packet-page-renderer.cjs'),originalRender=renderer.renderPage;
  let releaseRender,enteredRender;const entered=new Promise(resolve=>enteredRender=resolve),gate=new Promise(resolve=>releaseRender=resolve);
  renderer.renderPage=async(...args)=>{enteredRender();await gate;return originalRender(...args);};
  try {
    const delayed=request('GET',imageUrl(view.packet.preview_version,1));await entered;
    check.equal((await request('DELETE','/api/sessions/current')).status,200,'the consumer can revoke the active session while a page is rendering');
    releaseRender();const revoked=await delayed;
    check.equal(revoked.status,401,'an asynchronously rendered page is withheld after its initiating session is revoked');
    check.ok(!revoked.bytes.subarray(0,8).equals(PNG),'revoked sessions receive no cached or newly rendered private PNG bytes');
  } finally {releaseRender();renderer.renderPage=originalRender;}
  return { all_physical_pages: true, exact_pdf_rasters: true, native_inline_editing_metadata: true,
    version_and_ownership_bound: true, bounded_annotations: true, originals_preserved: true, long_letter_reflow: true };
}
module.exports = { run, id: 'gl-inline-packet-pages', title: 'Complete owned inline page review, bounded report annotations and editable letter reflow retain exact approval custody' };
