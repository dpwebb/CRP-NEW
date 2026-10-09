'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const crypto = require('node:crypto');
const lib = require('../../pdf-vendor/pdf-lib-1.17.1.min.js');
const fontkit = require('../../pdf-vendor/fontkit-1.1.1.min.js');
const { composePacket, VERSION } = require('../../packet-composer.cjs');
const bureauForms = require('../../bureau-forms.cjs');
const { pdfText, comparableText } = require('../packet-pdf-assertions.cjs');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const n = value => lib.PDFName.of(value);
const LETTER = 'Morgan Fiction\n12 Example Street\nHalifax NS B3H 0A0\n\nOctober 9, 2026\n\nCredit bureau\nConsumer account: FICTIONAL-REF-001\n\nDear credit bureau,\n\nPlease check the two collection entries from Cedar Agency and Maple Agency. Both show account ****1234 for the same debt. Please correct the duplicate.\n\nMy report shows both entries on page 2. I have included that page and copies of my identification and proof of address.\n\nThank you,\nMorgan Fiction';
async function document(lines, formControls = false) {
  const doc = await lib.PDFDocument.create({ updateMetadata: false });
  doc.setCreationDate(new Date('2000-01-01T00:00:00Z')); doc.setModificationDate(new Date('2000-01-01T00:00:00Z'));
  for (const [index, line] of lines.entries()) { const page = doc.addPage([612, 792]); page.drawText(line, { x: 40, y: 700, size: 12 }); page.drawRectangle({ x: 40, y: 640, width: 80 + index * 20, height: 20, color: lib.rgb(.1, .3, .5) }); }
  if (formControls) {
    const form = doc.getForm(), page = doc.getPage(0);
    const text = form.createTextField('Name'); text.setText('Original consumer'); text.setMaxLength(80); text.addToPage(page, { x: 40, y: 590, width: 250, height: 25 });
    const dropdown = form.createDropdown('Province'); dropdown.addOptions(['NS', 'QC', 'ON']); dropdown.select('NS'); dropdown.addToPage(page, { x: 40, y: 550, width: 150, height: 25 });
    const radio = form.createRadioGroup('Delivery'); radio.addOptionToPage('Mail', page, { x: 40, y: 510, width: 20, height: 20 }); radio.addOptionToPage('Email', page, { x: 85, y: 510, width: 20, height: 20 }); radio.select('Mail');
    form.createCheckBox('Consent').addToPage(page, { x: 40, y: 475, width: 20, height: 20 });
    form.createOptionList('Reasons').addToPage(page, { x: 40, y: 390, width: 200, height: 60 }); form.getOptionList('Reasons').addOptions(['Duplicate', 'Balance']); form.getOptionList('Reasons').select('Duplicate');
    const signature = doc.context.obj({ Type: 'Annot', Subtype: 'Widget', FT: 'Sig', T: lib.PDFHexString.fromText('Signature'), Rect: [40, 350, 250, 380], P: page.ref });
    const sigRef = doc.context.register(signature); page.node.addAnnot(sigRef); form.acroForm.addField(sigRef);
    const action = doc.context.obj({ S: 'JavaScript', JS: lib.PDFString.of('app.alert("not allowed")') });
    doc.catalog.set(n('OpenAction'), doc.context.register(action)); text.acroField.dict.set(n('AA'), doc.context.obj({ K: action }));
  }
  return Buffer.from(await doc.save({ useObjectStreams: false }));
}
function streams(doc, page) {
  const contents = page.node.lookup(n('Contents'));
  return (contents instanceof lib.PDFArray ? contents.asArray() : [contents]).map(ref => doc.context.lookup(ref)).filter(value => value instanceof lib.PDFRawStream).map(value => Buffer.from(value.getContents()));
}
function render(bytes, page) {
  return execFileSync('pdftoppm', ['-f', String(page), '-l', String(page), '-scale-to', '900', '-png', '-singlefile', '-'], { input: bytes, timeout: 30000, maxBuffer: 8 * 1024 * 1024, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
}
function refuses(check, input, description, code = 'INVALID_REQUEST') { let caught; try { composePacket(input); } catch (error) { caught = error; } check.equal(caught?.code, code, description); }
async function run(t, check) {
  const report = await document(['REPORT PAGE 1 NOT RELEVANT', 'REPORT PAGE 2 CEDAR AND MAPLE COLLECTIONS', 'REPORT PAGE 3 NOT RELEVANT', 'REPORT PAGE 4 SUPPORTING AMOUNT']);
  const address = await document(['FICTIONAL PROOF OF ADDRESS']);
  // A valid local PNG fixture is deliberately reused as both an image report and an identification copy.
  const png = render(await document(['FICTIONAL PHOTO IDENTIFICATION']), 1);
  const form = await document(['ORIGINAL BUREAU ARTWORK'], true);
  const input = { letter_text: LETTER, reports: [{ bytes: report, content_type: 'application/pdf', relevant_pages: [4, 2, 2], label: 'Relevant report pages' }],
    documents: [{ bytes: png, content_type: 'image/png', label: 'Identification' }, { bytes: address, content_type: 'application/pdf', label: 'Proof of address' }],
    forms: [{ bytes: form, filename: 'bureau-one.pdf' }, { bytes: form, filename: 'bureau-two.pdf' }] };
  const packet = composePacket(input), repeat = composePacket(input), loaded = await lib.PDFDocument.load(packet.bytes);
  check.equal(packet.version, VERSION, 'actual output is bound to the wrapper, worker, fonts and local PDF library version');
  check.equal(packet.sha256, hash(packet.bytes), 'approval digest describes the actual single complete PDF');
  check.ok(packet.bytes.equals(repeat.bytes), 'unchanged recipe renders byte-identically for review, approval and download');
  repeat.bytes[0] = 0; repeat.sections[0].label = 'mutated caller value';
  const protectedRepeat = composePacket(input);
  check.ok(protectedRepeat.bytes.equals(packet.bytes) && protectedRepeat.sections[0].label === 'My dispute letter', 'caller mutation cannot corrupt cached approved bytes or metadata');
  check.notEqual(composePacket({ ...input, letter_text: LETTER.replace('Please correct the duplicate.', 'Please remove the duplicate.') }).sha256, packet.sha256, 'an edited letter gets a new output rather than a cached earlier approval');
  check.equal(packet.page_count, 7, 'single packet contains one letter, two relevant pages, two copies and two original forms');
  check.deepEqual(packet.sections.map(section => [section.kind, section.start_page, section.page_count]), [['letter', 1, 1], ['report', 2, 2], ['document', 4, 1], ['document', 5, 1], ['form', 6, 1], ['form', 7, 1]], 'single PDF follows letter, source evidence, identification/address and bureau form order');
  check.deepEqual(packet.sections[1].source_pages, [2, 4], 'relevant pages are unique and retain their original report order');
  const text = pdfText(packet.bytes);
  check.ok(text.includes('REPORT PAGE 2') && text.includes('REPORT PAGE 4') && !text.includes('REPORT PAGE 1') && !text.includes('REPORT PAGE 3'), 'irrelevant source report pages are absent from the actual printable packet');
  check.ok(text.includes('Consumer account: FICTIONAL-REF-001'), 'supplied bureau consumer account number is printed on the letter');
  check.ok(!text.includes('Print and mail') && !text.includes('Evidence References'), 'composer adds no mailing instructions or separate technical evidence-reference sheet');
  check.equal(comparableText(loaded.getForm().getTextField('CRP_letter_page_1').getText()), comparableText(LETTER), 'ordinary complete letter is a genuine editable PDF text field');
  check.ok(packet.editable_fields.find(field => field.section === 'letter').font_size >= 10, 'letter text remains at least 10 points');
  const original = await lib.PDFDocument.load(form);
  for (const page of [5, 6]) {
    const originalStreams = streams(original, original.getPage(0)), finalStreams = streams(loaded, loaded.getPage(page));
    check.ok(originalStreams.every(source => finalStreams.some(copy => copy.equals(source))), 'native bureau page artwork streams remain unchanged: ' + (page + 1));
    check.ok(render(form, 1).equals(render(packet.bytes, page + 1)), 'independent printed rendering of native bureau artwork and saved controls is unchanged: ' + (page + 1));
  }
  for (const prefix of ['', 'bureau_form_2.']) {
    const finalForm = loaded.getForm();
    check.equal(finalForm.getTextField(prefix + 'Name').getText(), 'Original consumer', 'each same-name native text value survives merging: ' + prefix);
    check.equal(finalForm.getTextField(prefix + 'Name').getMaxLength(), 80, 'native field constraints survive: ' + prefix);
    check.deepEqual(finalForm.getDropdown(prefix + 'Province').getOptions(), ['NS', 'QC', 'ON'], 'native dropdown options survive: ' + prefix);
    check.deepEqual(finalForm.getDropdown(prefix + 'Province').getSelected(), ['NS'], 'native selected dropdown survives: ' + prefix);
    check.deepEqual(finalForm.getRadioGroup(prefix + 'Delivery').getOptions(), ['Mail', 'Email'], 'native radio export options survive: ' + prefix);
    check.equal(finalForm.getRadioGroup(prefix + 'Delivery').getSelected(), 'Mail', 'native radio selection survives: ' + prefix);
    check.deepEqual(finalForm.getOptionList(prefix + 'Reasons').getSelected(), ['Duplicate'], 'native option-list selection survives: ' + prefix);
    check.equal(finalForm.getCheckBox(prefix + 'Consent').isChecked(), false, 'blank consumer consent remains blank: ' + prefix);
    check.ok(finalForm.getSignature(prefix + 'Signature') instanceof lib.PDFSignature && !finalForm.getSignature(prefix + 'Signature').acroField.dict.has(n('V')), 'native signature field remains blank and available: ' + prefix);
  }
  check.ok(!loaded.catalog.has(n('OpenAction')) && loaded.getForm().getFields().every(field => !field.acroField.dict.has(n('AA'))), 'untrusted imported executable actions are removed');
  const finalForm = loaded.getForm();
  finalForm.getTextField('CRP_letter_page_1').setText('Morgan Fiction\n\nPlease correct the duplicate collection.\n\nThank you,\nMorgan Fiction');
  finalForm.getTextField('Name').setText('Changed first form'); finalForm.getTextField('bureau_form_2.Name').setText('Changed second form');
  finalForm.getDropdown('Province').select('QC'); finalForm.getDropdown('bureau_form_2.Province').select('ON');
  finalForm.getRadioGroup('bureau_form_2.Delivery').select('Email');
  loaded.registerFontkit(fontkit);
  const editFont = await loaded.embedFont(fs.readFileSync(path.join(__dirname, '../../packet-fonts/NotoSans-Regular.ttf')), { subset: false });
  finalForm.getTextField('CRP_letter_page_1').updateAppearances(editFont);
  const saved = Buffer.from(await loaded.save({ useObjectStreams: false })), reloaded = (await lib.PDFDocument.load(saved)).getForm();
  check.equal(reloaded.getTextField('Name').getText(), 'Changed first form', 'saved first form edit remains independent');
  check.equal(reloaded.getTextField('bureau_form_2.Name').getText(), 'Changed second form', 'saved second form edit remains independent');
  check.deepEqual(reloaded.getDropdown('Province').getSelected(), ['QC'], 'consumer can change native dropdown and save');
  check.deepEqual(reloaded.getDropdown('bureau_form_2.Province').getSelected(), ['ON'], 'same-name second native dropdown remains independently editable');
  check.equal(reloaded.getRadioGroup('bureau_form_2.Delivery').getSelected(), 'Email', 'consumer can change native radio and save');
  check.ok(pdfText(saved).includes('Please correct the duplicate collection.') && !pdfText(saved).includes('both entries on page 2'), 'saved letter edit changes the actual printable appearance');
  check.ok(!render(packet.bytes, 1).equals(render(saved, 1)), 'independent renderer prints the saved edited letter');
  check.ok(render(packet.bytes, 2).equals(render(saved, 2)), 'letter and form edits leave the source evidence page unchanged');
  const longLetter = 'Morgan Fiction\n\n' + Array.from({ length: 180 }, (_, index) => `Item ${index + 1}: Please check the two collection entries and correct the duplicate account. The same masked number is printed on both entries.`).join('\n\n') + '\n\nThank you,\nMorgan Fiction';
  const long = composePacket({ letter_text: longLetter }), longDoc = await lib.PDFDocument.load(long.bytes);
  check.ok(long.page_count > 1, 'a long letter has clean continuation pages instead of clipping or smaller type');
  check.ok(long.editable_fields.every(field => field.font_size >= 10), 'every long-letter page remains at least 10 points');
  check.equal(comparableText(long.editable_fields.map(field => longDoc.getForm().getTextField(field.name).getText()).join(' ')), comparableText(longLetter), 'all long-letter text survives editable pagination');
  const longText = comparableText(pdfText(long.bytes));
  check.ok(longText.includes('Item 1:') && longText.includes('Item 180:') && longText.endsWith('Morgan Fiction'), 'first and last long-letter content print without truncation');
  for (const field of long.editable_fields) {
    const widget = longDoc.getForm().getTextField(field.name).acroField.getWidgets()[0], rectangle = widget.getRectangle();
    check.ok(rectangle.y >= 40 && rectangle.y + rectangle.height <= 752, 'continuation letter text remains within printable page margins: ' + field.page);
  }
  const imageReport = composePacket({ letter_text: LETTER, reports: [{ bytes: png, content_type: 'image/png', relevant_pages: [1] }] });
  check.equal(imageReport.page_count, 2, 'single-page image report is included inline as the exact relevant source');
  check.ok((await lib.PDFDocument.load(imageReport.bytes)).getPage(1).node.Resources().lookup(n('XObject'), lib.PDFDict).keys().length > 0, 'image evidence is actually embedded, not an external file reference');
  const interactiveReport = composePacket({ letter_text: LETTER, reports: [{ bytes: form, content_type: 'application/pdf', relevant_pages: [1] }] });
  check.ok((await lib.PDFDocument.load(interactiveReport.bytes)).getForm().getFields().every(field => field.getName().startsWith('CRP_letter')), 'report form values are frozen as evidence, never consumer-editable report facts');
  check.ok(pdfText(interactiveReport.bytes).includes('Original consumer'), 'frozen original report values still print');
  for (const pages of [undefined, [], [0], [-1], [1.5], [5]]) refuses(check, { letter_text: LETTER, reports: [{ bytes: report, content_type: 'application/pdf', relevant_pages: pages }] }, 'missing or invalid relevant source pages cannot silently include the whole report: ' + JSON.stringify(pages));
  refuses(check, { letter_text: LETTER, reports: [{ bytes: png, content_type: 'image/png', relevant_pages: [2] }] }, 'image source refuses an invented page number');
  refuses(check, { letter_text: LETTER, documents: [{ bytes: Buffer.from('%PDF-1.7\ninvalid'), content_type: 'application/pdf' }] }, 'damaged support PDF cannot silently disappear from the complete packet', 'PACKET_ATTACHMENT_UNREADABLE');
  refuses(check, { letter_text: LETTER, forms: [{ bytes: Buffer.from('%PDF-1.7\ninvalid') }] }, 'damaged bureau PDF cannot produce a partial packet', 'SERVICE_STATE_UNAVAILABLE');
  refuses(check, { letter_text: LETTER, documents: [{ bytes: png, content_type: 'image/gif' }] }, 'unsupported document type is refused rather than omitted');
  const tu = bureauForms.materialForms('CA', 'TRANSUNION', 'ACCOUNT')[0], native = bureauForms.populateForm(tu, { profile: { given_name: 'Morgan', family_name: 'Fiction', region: 'NS' }, items: [{ name: 'Cedar Agency', account_reference: '****1234', request: 'Please correct the duplicate entry.' }], settings: {} });
  const nativePacket = composePacket({ letter_text: LETTER, forms: [{ bytes: native.bytes, filename: tu.filename }] }), nativeForm = (await lib.PDFDocument.load(nativePacket.bytes)).getForm();
  check.deepEqual(nativeForm.getDropdown('Prov1').getOptions(), (await lib.PDFDocument.load(native.bytes)).getForm().getDropdown('Prov1').getOptions(), 'actual completed original TransUnion dropdown options survive final packet creation');
  check.equal(nativeForm.getRadioGroup('request that it be incorporated into').getSelected(), undefined, 'actual original bureau consent stays unselected in final packet');
  check.equal(nativeForm.getTextField('Signature').getText(), undefined, 'actual original bureau consumer signature stays blank in final packet');
  check.ok(render(native.bytes, 1).equals(render(nativePacket.bytes, 2)), 'actual completed bureau form page remains visually identical in the single packet');
  const nativePair = composePacket({ letter_text: LETTER, forms: [{ bytes: native.bytes, filename: tu.filename }, { bytes: native.bytes, filename: tu.filename }] });
  const pairForm = (await lib.PDFDocument.load(nativePair.bytes)).getForm();
  check.equal(pairForm.getTextField('bureau_form_2.Account1').getText(), '****1234', 'a second actual original bureau form retains its independently editable account value');
  check.deepEqual(pairForm.getDropdown('bureau_form_2.Prov1').getOptions(), nativeForm.getDropdown('Prov1').getOptions(), 'second actual original bureau dropdown retains its complete original option set');
  check.ok(render(native.bytes, 1).equals(render(nativePair.bytes, native.page_count + 2)), 'second actual bureau form preserves original artwork and filled appearances after resource grafting');
  const originalFonts = (await lib.PDFDocument.load(native.bytes)).getForm().acroForm.dict.lookup(n('DR'), lib.PDFDict).lookup(n('Font'), lib.PDFDict).keys().map(key => key.decodeText());
  const finalFonts = pairForm.acroForm.dict.lookup(n('DR'), lib.PDFDict).lookup(n('Font'), lib.PDFDict).keys().map(key => key.decodeText());
  check.ok(originalFonts.every(key => finalFonts.includes(key)) && finalFonts.includes('CRPLetterFont'), 'editable letter font has a separate resource name and leaves original bureau fonts available');
  if (t?.dataDir) for (const [filename, bytes] of [['inline-editable-packet.pdf', packet.bytes], ['inline-edited-packet.pdf', saved], ['inline-long-letter.pdf', long.bytes], ['inline-original-tu.pdf', nativePacket.bytes]]) fs.writeFileSync(path.join(t.dataDir, filename), bytes);
  return { single_complete_pdf: true, original_native_controls: true, source_pages_only: true, editable_letter: true, deterministic_approval_bytes: true, independent_print_rendering: true };
}
module.exports = { run, id: 'ew-inline-packet-composer', title: 'One editable letter and original forms with exact inline evidence/document copies' };
