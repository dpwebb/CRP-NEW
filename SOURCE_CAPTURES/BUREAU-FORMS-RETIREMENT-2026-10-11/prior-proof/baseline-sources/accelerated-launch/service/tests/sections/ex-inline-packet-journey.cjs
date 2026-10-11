'use strict';
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { buildPdf } = require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');
const { pdfText, comparableText } = require('../packet-pdf-assertions.cjs');
const exhibits = require('../../packet-report-exhibits.cjs');
const packets = require('../../packets.cjs');
const formats = require('../../formats.cjs');
const general = require('../../general-intake.cjs');
const accountDisplay = require('../../account-display.cjs');
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

async function run(t, check) {
  for (const name of ['Fictional Creditor CA-AB', 'First Fictional Lender CA-ON', 'Fictional Balance Lender']) {
    const intro = name + ' Balance $100 Opened 2020-01-01 Closed 2019-01-01';
    const file = path.join(t.dataDir, 'inline-name-' + digest(Buffer.from(name)).slice(0,8) + '.pdf');
    fs.writeFileSync(file, buildPdf({ pages:[{ lines:['Equifax Consumer Credit Report', 'Report Date: June 12, 2026', intro] }] }));
    const model = formats.buildPdfDocumentModel(file), row = general.extract(model).records[0];
    check.equal(accountDisplay.identityFor(row)?.name, name, 'own printed name keeps punctuation and legitimate words removed from its private matching token');
    check.equal(row.facts['account.reported_identity'], general.accountIdentityToken(intro), 'display recovery leaves the existing private matching token unchanged');
    for (const word of model.pages[0].word_boxes) if (word.text === 'Fictional') word.trusted = false;
    check.equal(accountDisplay.identityFor(general.extract(model).records[0]), null, 'untrusted source cannot supply an account display name');
  }
  const guarded = path.join(t.dataDir, 'inline-private-number-name.pdf');
  fs.writeFileSync(guarded, buildPdf({pages:[{lines:['Equifax Consumer Credit Report', 'Report Date: June 12, 2026',
    'Fictional Creditor CA-AB 1234567 Balance $100 Opened 2020-01-01 Closed 2019-01-01']}]}));
  check.equal(accountDisplay.identityFor(general.extract(formats.buildPdfDocumentModel(guarded)).records[0]), null,
    'new prefix recovery does not expose an uncaptioned long personal or account number');
  for (const caption of ['Name', 'Subject', 'Co-Borrower']) {
    const file = path.join(t.dataDir, 'inline-personal-caption-' + caption + '.pdf');
    fs.writeFileSync(file, buildPdf({pages:[{lines:['Equifax Consumer Credit Report', 'Report Date: June 12, 2026',
      caption + ': First Fictional Lender CA-AB Balance $100 Opened 2020-01-01 Closed 2019-01-01']}]}));
    check.equal(accountDisplay.identityFor(general.extract(formats.buildPdfDocumentModel(file)).records[0]), null,
      'personal-role captions cannot supply a recovered tradeline name');
  }
  const owner = await t.account('inline-packet-consumer@example.test');
  const stranger = await t.account('inline-packet-other@example.test');
  const auth = body => ({ token: owner.token, body });
  const id = (await t.request('POST', '/api/cases', auth({ country:'CA', region:'CA-NS', bureau:'EQUIFAX' }))).json.case.case_id;
  const base = '/api/cases/' + id;
  const bytes = buildPdf({ pages: [
    { lines: ['Equifax Consumer Credit Report', 'Report Date: June 12, 2026', 'COVER PAGE ONLY'] },
    { lines: ['Fictional Creditor CA-AB Balance $100 Opened 2020-01-01 Closed 2019-01-01', 'Account Number: ****8642', 'SELECTED SOURCE PAGE'] },
    { lines: ['UNRELATED PAGE MUST STAY OUT', 'General information'] }
  ] });
  await t.request('POST', base + '/files', auth({ originalFilename:'fictional-three-pages.pdf', declaredBytes:bytes.length,
    mimeType:'application/pdf', contentBase64:bytes.toString('base64') }));
  await t.request('POST', base + '/evaluate', auth());
  const initial = (await t.request('GET', base + '/packet', auth())).json.view;
  check.equal(initial.eligible_issues.length, 1, 'native multipage report produces its actual account-date violation');
  await t.request('POST', base + '/packet/select', auth({ issue_ids:[initial.eligible_issues[0].issue_id] }));
  await t.preparePostalPacket(owner, id);
  await t.request('POST', base + '/packet/correspondence', auth({ correspondence:{ bureau_reference:'8421864201' } }));
  let view = (await t.request('GET', base + '/packet', auth())).json.view;
  check.deepEqual(view.packet.report_attachment_manifest[0].relevant_pages, [2], 'only the actual account page is included automatically');
  check.ok(view.packet.correspondence_preview.includes('My bureau file or account number: 8421864201'), 'optional consumer-supplied bureau number appears in the letter');
  check.ok(/report page 2/i.test(view.packet.correspondence_preview), 'plain report-page reference is integrated in the letter');
  check.ok(view.packet.correspondence_preview.includes('Fictional Creditor CA-AB'), 'consumer letter names the source-linked selected account rather than a generic entry');
  check.ok(!/PRINT AND MAIL|EVIDENCE REFERENCES|documents folder|stored_sha256|COMMON-ERROR-/.test(view.packet.correspondence_preview), 'letter has no mailing instructions or internal appendix');
  const result = t.service.store.state().results.find(row => row.case_id === id);
  const reportFactsBefore = digest(Buffer.from(JSON.stringify(result)));
  const oldUrl = view.packet.letter_preview_url;
  const edited = view.packet.correspondence_preview.replace('Please check the following', 'Please look at the following') + '\nPlease write back to me when you finish.\n';
  const saved = await t.request('POST', base + '/packet/letter', auth({ letter_text:edited }));
  check.equal(saved.status, 200, 'consumer can save the complete edited letter');
  view = saved.json.view;
  check.equal(view.packet.correspondence_preview, edited.trim(), 'review uses the complete consumer-edited letter');
  check.equal(digest(Buffer.from(JSON.stringify(t.service.store.state().results.find(row => row.case_id === id)))), reportFactsBefore,
    'letter edits never change report facts or assessment');
  check.equal((await t.request('GET', oldUrl, auth())).json.error.code, 'PACKET_APPROVAL_STALE', 'old preview version refuses after a letter edit');
  check.equal((await t.request('POST', base + '/packet/letter', { token:stranger.token, body:{ letter_text:edited } })).status, 403, 'another account cannot edit this letter');
  check.equal((await t.request('POST', base + '/packet/letter', { body:{ letter_text:edited } })).status, 401, 'anonymous letter editing is refused');
  check.equal((await t.request('POST', base + '/packet/letter', auth({ letter_text:' ' }))).status, 400, 'empty edited letter is refused');
  const preview = await t.request('GET', view.packet.letter_preview_url, auth());
  check.equal(preview.status, 200, 'owned subscriber reviews one complete PDF');
  check.equal(preview.headers.get('x-frame-options'), 'SAMEORIGIN', 'owned preview can appear inline only on the same site');
  check.ok(/frame-ancestors 'self'/.test(preview.headers.get('content-security-policy')), 'preview refuses foreign-site framing');
  check.ok(pdfText(preview.bytes).includes('SELECTED SOURCE PAGE'), 'actual source page is inside the PDF');
  check.ok(!pdfText(preview.bytes).includes('UNRELATED PAGE MUST STAY OUT'), 'unrelated report page is excluded');
  check.ok(comparableText(pdfText(preview.bytes)).startsWith(comparableText(edited)), 'editable consumer letter leads the PDF');
  await t.request('POST', base + '/packet/approve', auth({ reviewed_version:view.packet.preview_version }));
  const download = await t.request('GET', base + '/packet-download', auth());
  const printed = await t.request('GET', base + '/packet-print', auth());
  check.equal(download.headers.get('content-type'), 'application/pdf', 'consumer receives one PDF rather than a ZIP');
  check.ok(/\.pdf"$/.test(download.headers.get('content-disposition')), 'download has one PDF filename');
  check.deepEqual(download.bytes, preview.bytes, 'download is exactly the complete reviewed PDF');
  check.deepEqual(printed.bytes, preview.bytes, 'print opens exactly the complete reviewed PDF');
  const approved = t.service.store.state().packets.find(row => row.case_id === id);
  check.equal(approved.approved_pdf_sha256, digest(download.bytes), 'approval records the whole generated PDF digest');
  const recipe = packets.packetPrint(t.service.store, owner, id);
  check.deepEqual(recipe.sections.map(section => section.kind), ['letter','report','document','document','document','form'], 'actual PDF follows letter, relevant report, identity/address and bureau form order');
  const out = path.join(__dirname, '../../out/inline-packet-review');
  fs.mkdirSync(out, {recursive:true});
  fs.writeFileSync(path.join(out, 'complete-approved-packet.pdf'), download.bytes);
  fs.writeFileSync(path.join(out, 'complete-approved-packet.json'), JSON.stringify({sections:recipe.sections, sha256:digest(download.bytes)}, null, 2));

  // Controlled unknown-page provenance test; no claim that this is a new reader layout.
  const row = t.service.store.state().results.find(item => item.case_id === id);
  const selected = packets.eligibleIssues(row).slice(0,1);
  const fileId = row.file_ids[0];
  const stripped = JSON.parse(JSON.stringify(row));
  function removePages(value) { if (!value || typeof value !== 'object') return; delete value.page; for (const child of Object.values(value)) removePages(child); }
  removePages(stripped.extraction);
  removePages(selected);
  const state = t.service.store.state();
  const controlledStore = { state:() => ({...state, results:state.results.map(item => item.result_id === row.result_id ? stripped : item)}), readBlob:t.service.store.readBlob.bind(t.service.store) };
  const unknown = exhibits.prepare(controlledStore, owner, id, stripped, selected, [fileId]);
  check.deepEqual(unknown.copies[0].relevant_pages, [], 'unknown multipage source never guesses page one or includes the whole report');
  check.equal(unknown.missing.length, 1, 'owned report page choice is requested without suppressing the supported issue');
  const chosen = exhibits.prepare(controlledStore, owner, id, stripped, selected, [fileId], {[fileId]:[2]});
  check.deepEqual(chosen.copies[0].relevant_pages, [2], 'consumer attachment page choice supplies the selected page');
  check.notDeepEqual(chosen.material, unknown.material, 'attachment page choice is material to approval');
  let invalid = false;
  try { exhibits.prepare(controlledStore, owner, id, stripped, selected, [fileId], {[fileId]:[4]}); } catch(error) { invalid=error.code==='INVALID_REQUEST'; }
  check.ok(invalid, 'out-of-range manual attachment page is refused');
  await t.request('POST', base + '/packet/letter', auth({letter_text:null}));
  view = (await t.request('GET', base + '/packet', auth())).json.view;
  check.equal(view.packet.letter_text, null, 'consumer can restore the prepared letter');
  check.ok(!view.packet.correspondence_preview.includes('Please write back to me when you finish.'), 'reset removes only the custom letter override');
  check.equal((await t.request('GET', base + '/packet-download', auth())).json.error.code, 'PACKET_NOT_APPROVED', 'letter reset requires a fresh review and approval');
  const unpaid = await t.unpaidAccount('inline-packet-unpaid@example.test');
  const unpaidId = await t.assessedCase(unpaid);
  check.equal((await t.request('POST', '/api/cases/'+unpaidId+'/packet/letter', {token:unpaid.token,body:{letter_text:edited}})).status,402,'new editing route retains subscriber entitlement');
  check.ok(!t.logText().includes('8421864201'), 'bureau file number is absent from application logs');
  return { single_complete_pdf:true, letter_editor:true, exact_review_approval_download:true,
    relevant_report_pages:true, manual_attachment_page_bound:true, optional_bureau_reference:true, ownership_and_entitlement:true };
}
module.exports={run,id:'ex-inline-packet-journey',title:'One consumer-edited packet preserves exact source pages, inline documents and review approval'};
