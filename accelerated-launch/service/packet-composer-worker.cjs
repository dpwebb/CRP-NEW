'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const lib = require('./pdf-vendor/pdf-lib-1.17.1.min.js');
const fontkit = require('./pdf-vendor/fontkit-1.1.1.min.js');
const { PDFDocument, PDFName, PDFDict, PDFArray, PDFRef, PDFString, PDFHexString, PDFObjectCopier, PDFPage,
  PDFTextField, PDFDropdown, PDFOptionList, PDFCheckBox, PDFRadioGroup, PDFSignature, rgb } = lib;
const name = value => PDFName.of(value);
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const label = value => String(value || '').replace(/[\x00-\x1f\x7f]/g, ' ').trim();
const coded = code => Object.assign(new Error(code), { code });
const actionKinds = new Set(['JavaScript', 'Launch', 'GoToR', 'GoToE', 'SubmitForm', 'ImportData', 'Rendition', 'Movie', 'Sound', 'URI', 'SetOCGState', 'Hide', 'Named', 'ResetForm', 'GoTo']);
function sanitize(doc) {
  // Strip behavior, never redraw imported artwork. Recursion includes direct annotation/action dictionaries.
  const seen = new Set();
  function visit(object) {
    if (object instanceof PDFRef) object = doc.context.lookup(object);
    if (!object || seen.has(object)) return;
    seen.add(object);
    if (object instanceof PDFDict) {
      const type = object.get(name('Type'))?.toString(), subtype = object.get(name('Subtype'))?.toString();
      if (type === '/Catalog') { object.delete(name('OpenAction')); object.delete(name('AA')); }
      if (type === '/Annot' || subtype || object.has(name('FT')) || object.has(name('T')) || object.has(name('Kids'))) {
        object.delete(name('A')); object.delete(name('AA'));
      }
      const action = object.get(name('S'))?.toString().slice(1);
      if (actionKinds.has(action)) for (const [key] of object.entries()) object.delete(key);
      for (const key of ['JavaScript', 'EmbeddedFiles', 'XFA', 'Collection']) object.delete(name(key));
      for (const [, value] of object.entries()) visit(value);
    } else if (object instanceof PDFArray) for (const value of object.asArray()) visit(value);
  }
  visit(doc.catalog);
  for (const [, object] of doc.context.enumerateIndirectObjects()) visit(object);
}
const COPY_MAX_BYTES = 64 * 1024 * 1024, COPY_TIMEOUT_MS = 20000;
const PDF_LOAD_OPTIONS = { updateMetadata: false, throwOnInvalidObject: true };
// This vendored ES5 library's Error subclasses do not retain instanceof identity.
const ENCRYPTED_LOAD_MESSAGE = new lib.EncryptedPDFError().message;
async function permittedEvidenceCopy(value, budget) {
  // Only an empty-password, explicitly printable/copyable report or supporting copy is
  // eligible. Original upload bytes remain untouched; no password, path or private data
  // enters an argument, temporary file, diagnostic or external service.
  const options = { input: value, timeout: COPY_TIMEOUT_MS, maxBuffer: COPY_MAX_BYTES,
    windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, LC_ALL: 'C' } };
  const info = execFileSync('pdfinfo', ['-upw', '', '-'], { ...options, maxBuffer: 1024 * 1024 }).toString('utf8');
  const permissionLines = info.split(/\r?\n/).filter(line => /^\s*Encrypted:/.test(line));
  const pageLines = info.split(/\r?\n/).filter(line => /^\s*Pages:/.test(line));
  if (permissionLines.length !== 1 || !/^Encrypted:\s+yes \(print:yes copy:yes change:(?:yes|no) addNotes:(?:yes|no) algorithm:[\w-]+\)\s*$/.test(permissionLines[0]) ||
      pageLines.length !== 1 || !/^Pages:\s+[1-9]\d*\s*$/.test(pageLines[0])) throw new Error('PDF');
  const original = await PDFDocument.load(value, { ...PDF_LOAD_OPTIONS, ignoreEncryption: true });
  const encryption = original.context.lookup(original.context.trailerInfo.Encrypt);
  const permissions = encryption instanceof PDFDict && encryption.lookupMaybe(name('P'), lib.PDFNumber)?.asNumber();
  // Verify permission bits independently; metadata text can never grant a permission.
  if (!original.isEncrypted || !(encryption instanceof PDFDict) || encryption.get(name('Filter'))?.toString() !== '/Standard' ||
      !Number.isSafeInteger(permissions) || (permissions & 4) !== 4 || (permissions & 16) !== 16 ||
      original.getPageCount() !== Number(pageLines[0].replace(/^Pages:\s+/, '').trim()) || original.getPageCount() > 400) throw new Error('PDF');
  if (budget.pages + original.getPageCount() > 400) throw coded('INVALID_REQUEST');
  const copied = execFileSync('pdftocairo', ['-upw', '', '-pdf', '-', '-'], options);
  if (copied.subarray(0, 5).toString('ascii') !== '%PDF-') throw new Error('PDF');
  if (budget.bytes + copied.length > COPY_MAX_BYTES) throw coded('INVALID_REQUEST');
  budget.pages += original.getPageCount(); budget.bytes += copied.length;
  const doc = await PDFDocument.load(copied, PDF_LOAD_OPTIONS);
  if (doc.isEncrypted || doc.getPageCount() !== original.getPageCount()) throw new Error('PDF');
  for (let at = 0; at < doc.getPageCount(); at++) {
    const source = original.getPage(at), target = doc.getPage(at);
    const rotation = ((source.getRotation().angle % 360) + 360) % 360;
    const sourceSize = source.getSize(), targetSize = target.getSize();
    const width = rotation === 90 || rotation === 270 ? sourceSize.height : sourceSize.width;
    const height = rotation === 90 || rotation === 270 ? sourceSize.width : sourceSize.height;
    if (Math.abs(width - targetSize.width) > .02 || Math.abs(height - targetSize.height) > .02) throw new Error('PDF');
  }
  // Cairo adds wall-clock dates/trailer IDs. Neither belongs to an evidence page;
  // discard them before copying so cold previews/approvals/downloads are identical.
  doc.context.trailerInfo.Info = undefined;
  doc.context.trailerInfo.ID = undefined;
  return doc;
}
async function load(bytes, allowPermittedEvidenceCopy = false, budget) {
  const value = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes || '', 'base64');
  if (value.subarray(0, 5).toString('ascii') !== '%PDF-') throw new Error('PDF');
  let doc;
  try { doc = await PDFDocument.load(value, PDF_LOAD_OPTIONS); }
  catch (error) {
    if (!allowPermittedEvidenceCopy || error?.message !== ENCRYPTED_LOAD_MESSAGE) throw error;
    doc = await permittedEvidenceCopy(value, budget);
  }
  if (doc.isEncrypted || !doc.getPageCount()) throw new Error('PDF');
  sanitize(doc);
  return doc;
}
function defaultResources(form, doc) {
  let dr = form.acroForm.dict.lookupMaybe(name('DR'), PDFDict);
  if (!dr) { dr = doc.context.obj({}); form.acroForm.dict.set(name('DR'), dr); }
  return dr;
}
function wrapped(text, font, size, width) {
  const lines = [];
  for (const paragraph of text.split('\n')) {
    if (!paragraph) { lines.push(''); continue; }
    let line = '';
    for (const char of paragraph) {
      if (line && font.widthOfTextAtSize(line + char, size) > width) {
        const breakAt = line.lastIndexOf(' ');
        if (breakAt > 0) { lines.push(line.slice(0, breakAt)); line = line.slice(breakAt + 1); }
        else { lines.push(line); line = ''; }
      }
      line += char;
    }
    lines.push(line.trimEnd());
  }
  return lines;
}
async function letterPages(doc, text) {
  text = String(text).normalize('NFC').replace(/\r\n?/g, '\n').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '').trim();
  if (!text || text.length > 200000) throw coded('INVALID_REQUEST');
  doc.registerFontkit(fontkit);
  const fontBytes = fs.readFileSync(path.join(__dirname, 'packet-fonts', 'NotoSans-Regular.ttf')), face = fontkit.create(fontBytes);
  for (const char of text) if (!/\s/.test(char) && !face.hasGlyphForCodePoint(char.codePointAt(0))) throw coded('INVALID_REQUEST');
  const form = doc.getForm(), dr = defaultResources(form, doc);
  let fonts = dr.lookupMaybe(name('Font'), PDFDict);
  if (!fonts) { fonts = doc.context.obj({}); dr.set(name('Font'), fonts); }
  let fontName = 'CRPLetterFont'; while (fonts.has(name(fontName))) fontName += '_';
  // Full embedding allows new letters in a PDF editor. Its private resource name never
  // replaces a bureau font used by the original form's editable default appearances.
  const font = await doc.embedFont(fontBytes, { subset: false, customName: fontName });
  fonts.set(name(fontName), font.ref);
  const width = 512, height = 692, padding = 4;
  let size = 12, lines;
  for (; size >= 10; size -= .5) { lines = wrapped(text, font, size, width - padding * 2); if (lines.length * size * 1.4 <= height - padding * 2) break; }
  if (size < 10) { size = 10; lines = wrapped(text, font, size, width - padding * 2); }
  const capacity = Math.floor((height - padding * 2) / (size * 1.4)), fields = [];
  for (let offset = 0, pageNumber = 1; offset < lines.length; offset += capacity, pageNumber++) {
    const chunk = lines.slice(offset, offset + capacity), page = doc.insertPage(pageNumber - 1, [612, 792]);
    let fieldName = `CRP_letter_page_${pageNumber}`;
    while (form.getFields().some(field => field.getName() === fieldName)) fieldName += '_';
    const field = form.createTextField(fieldName); field.enableMultiline(); field.setText(chunk.join('\n'));
    field.addToPage(page, { x: 50, y: 50, width, height, borderWidth: 0, font, textColor: rgb(0, 0, 0), backgroundColor: rgb(1, 1, 1) });
    field.setFontSize(size);
    field.updateAppearances(font, () => chunk.flatMap((line, at) => [lib.beginText(), lib.setFillingRgbColor(0, 0, 0), lib.setFontAndSize(font.name, size),
      lib.moveText(padding, height - padding - size - at * size * 1.4), lib.showText(font.encodeText(line)), lib.endText()]));
    // The appearance has its own local font resource; edits resolve this separate alias
    // through AcroForm DR. pdf-lib customName alone does not change PDFFont.name.
    field.acroField.setDefaultAppearance(`/${fontName} ${size} Tf 0 g`);
    fields.push({ name: fieldName, type: 'TEXT', section: 'letter', page: pageNumber, font_size: size, min_font_size: 10 });
  }
  return fields;
}
async function appendEvidence(target, entry, isReport, position, copyBudget) {
  const bytes = Buffer.isBuffer(entry.bytes) ? entry.bytes : Buffer.from(entry.bytes || '', 'base64');
  const type = String(entry.content_type || '').toLowerCase().split(';')[0].trim();
  let source, pages;
  if (type === 'application/pdf') {
    try { source = await load(bytes, true, copyBudget); } catch (error) { throw coded(error.code === 'INVALID_REQUEST' ? error.code : 'PACKET_ATTACHMENT_UNREADABLE'); }
    // Freeze evidence fields to their saved appearances, retaining source artwork and entered values.
    try {
    const sourceForm = source.getForm();
    // A blank signature without a saved appearance is not visible report content. Do not ask
    // pdf-lib to manufacture or sign it while freezing the report's existing visible fields.
    for (const field of sourceForm.getFields()) if (field instanceof PDFSignature && !field.acroField.dict.has(name('V')) && field.acroField.getWidgets().every(widget => !widget.dict.has(name('AP')))) {
      const invisible = new Set(field.acroField.getWidgets().map(widget => widget.dict));
      for (const page of source.getPages()) {
        const annots = page.node.lookupMaybe(name('Annots'), PDFArray);
        if (annots) for (let at = annots.size() - 1; at >= 0; at--) if (invisible.has(source.context.lookup(annots.get(at)))) annots.remove(at);
      }
      // PDFForm.removeField tries to resolve an appearance first; this intentionally invisible
      // blank signature has none. Remove only its field/widget references, without drawing anything.
      sourceForm.acroForm.removeField(field.acroField);
    }
    if (sourceForm.getFields().length) sourceForm.flatten({ updateFieldAppearances: false });
    } catch { throw coded('PACKET_ATTACHMENT_UNREADABLE'); }
    pages = isReport ? entry.relevant_pages : source.getPages().map((_, index) => index + 1);
    if (!Array.isArray(pages) || !pages.length || pages.some(page => !Number.isSafeInteger(page) || page < 1 || page > source.getPageCount())) throw coded('INVALID_REQUEST');
    pages = [...new Set(pages)].sort((a, b) => a - b);
    let copies; try { copies = await target.copyPages(source, pages.map(page => page - 1)); } catch { throw coded('PACKET_ATTACHMENT_UNREADABLE'); }
    copies.forEach((page, at) => target.insertPage(position + at, page));
  } else if (type === 'image/tiff') {
    const tiff = require('./ocr/bounded-tiff.cjs'); let physical;
    try { physical = tiff.inspect(bytes); } catch { throw coded('PACKET_ATTACHMENT_UNREADABLE'); }
    copyBudget.tiffPixels = (copyBudget.tiffPixels || 0) + physical.reduce((sum,p)=>sum+p.width*p.height,0);
    if (copyBudget.tiffPixels > tiff.MAX_TOTAL_PIXELS) throw coded('INVALID_REQUEST');
    try { tiff.validate(bytes); } catch { throw coded('PACKET_ATTACHMENT_UNREADABLE'); }
    pages = isReport ? entry.relevant_pages : physical.map((_,i)=>i+1);
    if (!Array.isArray(pages) || !pages.length || pages.some(p=>!Number.isSafeInteger(p)||p<1||p>physical.length)) throw coded('INVALID_REQUEST');
    pages = [...new Set(pages)].sort((a,b)=>a-b);
    if (target.getPageCount() + pages.length > 400) throw coded('INVALID_REQUEST');
    for (const [i,n] of pages.entries()) {
      let image; try { image = await target.embedPng(tiff.png(bytes,physical[n-1])); } catch { throw coded('PACKET_ATTACHMENT_UNREADABLE'); }
      const page = target.insertPage(position+i,[612,792]), scale = Math.min(512/image.width,692/image.height);
      page.drawImage(image,{x:(612-image.width*scale)/2,y:(792-image.height*scale)/2,width:image.width*scale,height:image.height*scale});
    }
  } else if (type === 'image/png' || type === 'image/jpeg') {
    if (isReport && (!Array.isArray(entry.relevant_pages) || !entry.relevant_pages.length || entry.relevant_pages.some(page => page !== 1))) throw coded('INVALID_REQUEST');
    let image; try { image = type === 'image/png' ? await target.embedPng(bytes) : await target.embedJpg(bytes); } catch { throw coded('PACKET_ATTACHMENT_UNREADABLE'); }
    const page = target.insertPage(position, [612, 792]);
    if (!Number.isFinite(image.width) || !Number.isFinite(image.height) || image.width < 1 || image.height < 1) throw coded('PACKET_ATTACHMENT_UNREADABLE');
    const scale = Math.min(512 / image.width, 692 / image.height), width = image.width * scale, height = image.height * scale;
    page.drawImage(image, { x: (612 - width) / 2, y: (792 - height) / 2, width, height }); pages = [1];
  } else throw coded('INVALID_REQUEST');
  return pages;
}
async function compose(input) {
  const copyBudget = { bytes: 0, pages: 0 };
  if (input.forms != null && (!Array.isArray(input.forms) || input.forms.length)) throw coded('INVALID_REQUEST');
  if ((input.reports || []).length > 256 || (input.documents || []).length > 32) throw coded('INVALID_REQUEST');
  const doc = await PDFDocument.create({ updateMetadata: false });
  doc.setCreationDate(new Date('2000-01-01T00:00:00Z')); doc.setModificationDate(new Date('2000-01-01T00:00:00Z'));
  const fields = await letterPages(doc, input.letter_text), sections = [{ kind: 'letter', label: 'My dispute letter', start_page: 1, page_count: fields.length }];
  let position = fields.length;
  for (const [kind, entries] of [['report', input.reports || []], ['document', input.documents || []]]) for (const entry of entries) {
    const pages = await appendEvidence(doc, entry, kind === 'report', position, copyBudget);
    sections.push({ kind, label: label(entry.label), start_page: position + 1, page_count: pages.length, source_pages: pages }); position += pages.length;
  }
  if (doc.getPageCount() > 400) throw coded('INVALID_REQUEST');
  const bytes = Buffer.from(await doc.save({ useObjectStreams: false, addDefaultPage: false, updateFieldAppearances: false }));
  return { bytes: bytes.toString('base64'), sha256: digest(bytes), page_count: doc.getPageCount(), sections, editable_fields: fields, version: input.version };
}
if (require.main === module) {
  try {
    const raw = fs.readFileSync(0, 'utf8'); if (Buffer.byteLength(raw) > 90 * 1024 * 1024) throw new Error('LIMIT');
    compose(JSON.parse(raw)).then(result => process.stdout.write(JSON.stringify(result))).catch(error => { process.stdout.write(JSON.stringify({ error: ['PACKET_ATTACHMENT_UNREADABLE', 'INVALID_REQUEST'].includes(error.code) ? error.code : 'SERVICE_STATE_UNAVAILABLE' })); process.exitCode = 1; });
  } catch { process.stdout.write('{"error":"PACKET_COMPOSITION_FAILED"}'); process.exitCode = 1; }
}
module.exports = { compose, wrapped };
