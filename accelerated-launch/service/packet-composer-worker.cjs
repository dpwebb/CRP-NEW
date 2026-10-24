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
// Diagnostic only: this never grants permission or converts a refused attachment.
function attachmentFailureReason(entry, kind) {
  if (entry.content_type !== 'application/pdf') return 'UNREADABLE';
  try {
    const info = execFileSync('pdfinfo', ['-upw', '', '-'], { input: Buffer.from(entry.bytes, 'base64'),
      timeout: 2000, maxBuffer: 1024 * 1024, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, LC_ALL: 'C' } }).toString('utf8');
    const lines = info.split(/\r?\n/).filter(line => /^Encrypted:/.test(line));
    if (lines.length === 1 && /^Encrypted:\s+yes \(/.test(lines[0])) {
      if (/\bprint:no\b/.test(lines[0])) return 'PDF_PRINT_PROHIBITED';
      if (kind === 'report' && /\bcopy:no\b/.test(lines[0])) return 'PDF_RESTRICTED';
    }
  } catch { /* A password, damaged file or unavailable diagnostic remains unreadable. */ }
  return 'UNREADABLE';
}
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
async function printableSupportingImages(target, bytes, position, budget) {
  // Supporting copies may be printed as images even when object/text copying is
  // disabled. Keep the uploaded blob exact; no decrypted file is saved to disk.
  const deadline = Date.now() + COPY_TIMEOUT_MS;
  const options = { input: bytes, timeout: COPY_TIMEOUT_MS, maxBuffer: COPY_MAX_BYTES, windowsHide: true,
    stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, LC_ALL: 'C' } };
  const info = execFileSync('pdfinfo', ['-upw', '', '-'], { ...options, maxBuffer: 1024 * 1024 }).toString('utf8');
  const permissionLines = info.split(/\r?\n/).filter(line => /^Encrypted:/.test(line));
  const pageLines = info.split(/\r?\n/).filter(line => /^Pages:/.test(line));
  if (permissionLines.length !== 1 || !/^Encrypted:\s+yes \(print:yes copy:(?:yes|no) change:(?:yes|no) addNotes:(?:yes|no) algorithm:[\w-]+\)\s*$/.test(permissionLines[0]) ||
      pageLines.length !== 1 || !/^Pages:\s+[1-9]\d*\s*$/.test(pageLines[0])) throw new Error('PDF');
  // Some bank PDFs contain unused invalid objects. Only read their structural
  // encryption/page metadata here; Poppler renders the actual visible pages.
  const original = await PDFDocument.load(bytes, { updateMetadata: false, ignoreEncryption: true, throwOnInvalidObject: false });
  const encryption = original.context.lookup(original.context.trailerInfo.Encrypt);
  const permissions = encryption instanceof PDFDict && encryption.lookupMaybe(name('P'), lib.PDFNumber)?.asNumber();
  const count = Number(pageLines[0].replace(/^Pages:\s+/, ''));
  let structuralCount;
  try { structuralCount = original.getPageCount(); } catch { /* Rendering metadata can recover a malformed page tree. */ }
  if (!original.isEncrypted || !(encryption instanceof PDFDict) || encryption.get(name('Filter'))?.toString() !== '/Standard' ||
      !Number.isSafeInteger(permissions) || (permissions & 4) !== 4 || (structuralCount != null && structuralCount !== count) || count < 1 || count > 400) throw new Error('PDF');
  if (target.getPageCount() + count > 400 || budget.pages + count > 400) throw coded('INVALID_REQUEST');
  // Poppler can read bank statements whose page tree pdf-lib cannot traverse.
  // Keep the independent encryption/P-bit checks above, then require complete,
  // unambiguous page geometry from the same engine that renders every page.
  const boxInfo = execFileSync('pdfinfo', ['-upw', '', '-f', '1', '-l', String(count), '-box', '-'],
    { ...options, timeout: Math.max(1, deadline-Date.now()), maxBuffer: 1024*1024 }).toString('utf8');
  const counts = boxInfo.split(/\r?\n/).filter(line=>/^Pages:/.test(line)), boxes = new Map(), rotations = new Map();
  if (counts.length !== 1 || Number(counts[0].replace(/^Pages:\s+/, '')) !== count) throw new Error('PDF');
  for (const line of boxInfo.split(/\r?\n/)) {
    const box = /^Page\s+(\d+)\s+MediaBox:\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*$/.exec(line),
      rotation = /^Page\s+(\d+)\s+rot:\s+(-?\d+)\s*$/.exec(line);
    if (box) { const page = Number(box[1]); if (boxes.has(page)) throw new Error('PDF'); boxes.set(page,box.slice(2).map(Number)); }
    if (rotation) { const page = Number(rotation[1]); if (rotations.has(page)) throw new Error('PDF'); rotations.set(page,Number(rotation[2])); }
  }
  if (boxes.size !== count || rotations.size !== count) throw new Error('PDF');
  const dpi = (permissions & 2048) === 2048 ? 200 : 150;
  const pages = [];
  for (let at = 0; at < count; at++) {
    const box = boxes.get(at+1), rotation = ((rotations.get(at+1) % 360) + 360) % 360;
    if (!box || !Number.isFinite(rotation)) throw new Error('PDF');
    if (![0, 90, 180, 270].includes(rotation)) throw new Error('PDF');
    const size = {width:box[2]-box[0],height:box[3]-box[1]}, width = rotation === 90 || rotation === 270 ? size.height : size.width,
      height = rotation === 90 || rotation === 270 ? size.width : size.height;
    if (![width, height].every(n => Number.isFinite(n) && n > 0 && n <= 14400)) throw new Error('PDF');
    const pixels = Math.ceil(width * dpi / 72) * Math.ceil(height * dpi / 72);
    budget.imagePixels = (budget.imagePixels || 0) + pixels;
    if (budget.imagePixels > 80 * 1024 * 1024 || Date.now() >= deadline) throw new Error('PDF');
    const png = execFileSync('pdftoppm', ['-upw', '', '-f', String(at + 1), '-l', String(at + 1), '-singlefile', '-r', String(dpi), '-png', '-'],
      { ...options, timeout: Math.max(1, deadline - Date.now()), maxBuffer: 12 * 1024 * 1024 });
    budget.bytes += png.length;
    if (budget.bytes > COPY_MAX_BYTES || !png.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) throw new Error('PDF');
    const image = await target.embedPng(png);
    if (Math.abs(image.width - width * dpi / 72) > 2 || Math.abs(image.height - height * dpi / 72) > 2) throw new Error('PDF');
    const page = target.insertPage(position + at, [width, height]);
    page.drawImage(image, { x: 0, y: 0, width, height }); pages.push(at + 1);
  }
  budget.pages += count;
  pages.image_copy = { rendered_as_images: true, original_sha256: digest(bytes), rendering_dpi: dpi };
  return pages;
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
async function letterPages(doc, text, signature) {
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
  let signatureLines = [];
  if (signature) {
    if(typeof signature.name!=='string'||!signature.name.trim()||signature.name.length>120||/[\x00-\x1f\x7f]/.test(signature.name)||!/^\d{4}-\d{2}-\d{2}$/.test(signature.date||''))throw coded('INVALID_REQUEST');
    signatureLines = wrapped('Signed by: ' + signature.name, font, 12, 512);
    if (signatureLines.length > 3) throw coded('INVALID_REQUEST');
  }
  const signatureSpace = signature ? (signatureLines.length + 1) * 18 + 16 : 0;
  const width = 512, height = 692 - signatureSpace, fieldY = 50 + signatureSpace, padding = 4;
  let size = 12, lines;
  for (; size >= 10; size -= .5) { lines = wrapped(text, font, size, width - padding * 2); if (lines.length * size * 1.4 <= height - padding * 2) break; }
  if (size < 10) { size = 10; lines = wrapped(text, font, size, width - padding * 2); }
  let capacity = Math.floor((height - padding * 2) / (size * 1.4));
  while (lines.length > capacity && lines.length % capacity > 0 && lines.length % capacity < 4 && capacity > 8) capacity--;
  const fields = [];
  for (let offset = 0, pageNumber = 1; offset < lines.length; offset += capacity, pageNumber++) {
    const chunk = lines.slice(offset, offset + capacity), page = doc.insertPage(pageNumber - 1, [612, 792]);
    let fieldName = `CRP_letter_page_${pageNumber}`;
    while (form.getFields().some(field => field.getName() === fieldName)) fieldName += '_';
    const field = form.createTextField(fieldName); field.enableMultiline(); field.setText(chunk.join('\n'));
    const bodyHeight=signature && offset+capacity>=lines.length ? Math.min(height,chunk.length*size*1.4+padding*2) : height;
    const bodyY=fieldY+height-bodyHeight;
    field.addToPage(page, { x: 50, y: bodyY, width, height:bodyHeight, borderWidth: 0, font, textColor: rgb(0, 0, 0), backgroundColor: rgb(1, 1, 1) });
    field.setFontSize(size);
    field.updateAppearances(font, () => chunk.flatMap((line, at) => [lib.beginText(), lib.setFillingRgbColor(0, 0, 0), lib.setFontAndSize(font.name, size),
      lib.moveText(padding, bodyHeight - padding - size - at * size * 1.4), lib.showText(font.encodeText(line)), lib.endText()]));
    // The appearance has its own local font resource; edits resolve this separate alias
    // through AcroForm DR. pdf-lib customName alone does not change PDFFont.name.
    field.acroField.setDefaultAppearance(`/${fontName} ${size} Tf 0 g`);
    fields.push({ name: fieldName, type: 'TEXT', section: 'letter', page: pageNumber, text: chunk.join('\n'),
      x: 50, y: bodyY, width, height:bodyHeight, page_width: 612, page_height: 792, font_size: size, min_font_size: 10 });
  }
  if (signature) {
    const page = doc.getPage(fields.length - 1), top = fields.at(-1).y - 22;
    signatureLines.forEach((line, index) => page.drawText(line, {x:50,y:top-index*18,size:12,font}));
    page.drawText('Signature date: ' + signature.date, {x:50,y:top-signatureLines.length*18,size:12,font});
  }
  return fields;
}
function sourceGeometry(page) {
  const size = page.getSize(), media = page.getMediaBox(), crop = page.getCropBox();
  const rotation = ((page.getRotation().angle % 360) + 360) % 360;
  const safe = rotation === 0 && media.x === 0 && media.y === 0 && crop.x === 0 && crop.y === 0
    && Math.abs(crop.width - size.width) < .01 && Math.abs(crop.height - size.height) < .01;
  return { source_width: size.width, source_height: size.height, page_width: rotation === 90 || rotation === 270 ? size.height : size.width,
    page_height: rotation === 90 || rotation === 270 ? size.width : size.height, annotation_available: safe };
}
function markerRectangle(marker, width, height) {
  const box = marker.bbox;
  if (!box || !['x0', 'y0', 'x1', 'y1'].every(key => Number.isFinite(box[key]))
      || box.x0 < 0 || box.y0 < 0 || box.x1 <= box.x0 || box.y1 <= box.y0 || box.x1 > width || box.y1 > height) return null;
  return { x: box.x0 / width, y: box.y0 / height, width: (box.x1 - box.x0) / width, height: (box.y1 - box.y0) / height };
}
async function reportMarkup(page, entry, sourcePage) {
  const geometry = sourceGeometry(page), markers = (entry.markers || []).filter(marker => marker.page === sourcePage);
  const annotations = (entry.annotations || []).filter(annotation => annotation.page === sourcePage);
  if (annotations.length && (!geometry.annotation_available || annotations.length > 4)) throw coded('INVALID_REQUEST');
  if (!markers.length && !annotations.length) return { ...geometry, annotations: [] };
  const face = fontkit.create(fs.readFileSync(path.join(__dirname, 'packet-fonts', 'NotoSans-Regular.ttf')));
  const printable = value => [...String(value)].map(char => /\s/.test(char) || face.hasGlyphForCodePoint(char.codePointAt(0)) ? char : '?').join('');
  if (annotations.some(annotation => printable(annotation.note) !== annotation.note)) throw coded('INVALID_REQUEST');
  const metadata = [], width = geometry.source_width, height = geometry.source_height;
  for (const marker of markers) {
    const rectangle = geometry.annotation_available && entry.content_type === 'application/pdf' ? markerRectangle(marker, width, height) : null;
    metadata.push({ issue_id: marker.issue_id, item_number: marker.item_number, note: marker.caption,
      omitted_value: Boolean(marker.omitted_value), automatic: true, ...(rectangle || {}) });
  }
  for (const annotation of annotations) metadata.push({ ...annotation, automatic: false });
  if (geometry.annotation_available) for (const annotation of metadata) {
    if (!Number.isFinite(annotation.x)) continue;
    page.drawRectangle({ x: annotation.x * width, y: height - (annotation.y + annotation.height) * height,
      width: annotation.width * width, height: annotation.height * height, color: rgb(1, .85, 0), opacity: .25,
      borderColor: rgb(.65, .45, .05), borderOpacity: .6, borderWidth: .5 });
  }
  // Keep source dimensions and highlights without adding explanatory print pages.
  // Notes remain available as review metadata beside their source report page.
  return { ...geometry, annotations: metadata };
}
async function appendEvidence(target, entry, isReport, position, copyBudget) {
  const bytes = Buffer.isBuffer(entry.bytes) ? entry.bytes : Buffer.from(entry.bytes || '', 'base64');
  const type = String(entry.content_type || '').toLowerCase().split(';')[0].trim();
  let source, pages;
  if (type === 'application/pdf') {
    try { source = await load(bytes, true, copyBudget); } catch (error) {
      if (error.code === 'INVALID_REQUEST') throw error;
      if (!isReport) {
        try { return await printableSupportingImages(target, bytes, position, copyBudget); }
        catch (failure) { if (failure.code === 'INVALID_REQUEST') throw failure; }
      }
      throw coded('PACKET_ATTACHMENT_UNREADABLE');
    }
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
  if (!isReport && entry.rotation) for (let at=0;at<pages.length;at++) {
    const page=target.getPage(position+at); page.setRotation(lib.degrees((page.getRotation().angle+entry.rotation)%360));
  }
  return pages;
}
function isIdentityImage(entry) {
  return entry.label === 'IDENTITY' && ['image/png', 'image/jpeg'].includes(String(entry.content_type || '').toLowerCase().split(';')[0].trim());
}
async function appendIdentitySheet(doc, entries, position) {
  entries = [...entries].sort((a,b) => {
    const first = a.entry.uploaded_at || '', second = b.entry.uploaded_at || '';
    return first < second ? -1 : first > second ? 1 : a.index - b.index;
  });
  const images = [];
  for (const { entry, index } of entries) {
    const bytes = Buffer.from(entry.bytes, 'base64');
    try {
      const image = String(entry.content_type).toLowerCase().split(';')[0].trim() === 'image/png' ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
      if (![image.width, image.height].every(n => Number.isFinite(n) && n > 0)) throw new Error('IMAGE');
      const rotation = entry.rotation || 0, sideways = rotation === 90 || rotation === 270;
      images.push({ entry, image, bytes, rotation, displayWidth: sideways ? image.height : image.width, displayHeight: sideways ? image.width : image.height });
    } catch {
      throw Object.assign(coded('PACKET_ATTACHMENT_UNREADABLE'), { attachment: { kind: 'document', index, reason: 'UNREADABLE' } });
    }
  }
  // Fit natural image proportions in rows or columns, trying both paper
  // orientations. Equal grid cells waste space around mixed card/passport sizes.
  const gap = 14, captionSpace = 18, partitions = new Map();
  const addPartition = sizes => partitions.set(sizes.join(','), sizes);
  for (let groups = 1; groups <= images.length; groups++) {
    const sizes = []; let remaining = images.length;
    for (let at = 0; at < groups; at++) { const size = Math.ceil(remaining / (groups-at)); sizes.push(size); remaining -= size; }
    addPartition(sizes);
  }
  for (let first = 1; first < images.length; first++) {
    addPartition([first, images.length-first]);
    for (let second = 1; second < images.length-first; second++) addPartition([first, second, images.length-first-second]);
  }
  let best;
  for (const [pageWidth, pageHeight] of [[612,792],[792,612]]) for (const columns of [false,true]) for (const sizes of partitions.values()) {
    const bounds = { x: 36, top: pageHeight-86, width: pageWidth-72, height: pageHeight-134 };
    let offset = 0;
    const groups = sizes.map(count => {
      const entries = images.slice(offset, offset+count); offset += count;
      const ratios = entries.map(({displayWidth,displayHeight}) => columns ? displayHeight/displayWidth : displayWidth/displayHeight), ratio = ratios.reduce((n,r)=>n+r,0);
      return { entries, ratios, ratio, factor: Math.min(...ratios.map(r=>Math.min(1,r))),
        cap: (columns ? bounds.height-count*captionSpace-(count-1)*gap : bounds.width-(count-1)*gap)/ratio };
    });
    const budget = columns ? bounds.width-(groups.length-1)*gap : bounds.height-groups.length*captionSpace-(groups.length-1)*gap;
    if (budget <= 0 || groups.some(g=>g.cap<=0)) continue;
    const edgeLimit = Math.min(...groups.map(g=>g.cap*g.factor), budget/groups.reduce((n,g)=>n+1/g.factor,0));
    for (const group of groups) group.size = edgeLimit/group.factor;
    let spare = budget-groups.reduce((n,g)=>n+g.size,0);
    for (const group of [...groups].sort((a,b)=>b.ratio*(b.cap*b.cap-b.size*b.size)-a.ratio*(a.cap*a.cap-a.size*a.size))) {
      const extra = Math.min(spare,group.cap-group.size); group.size += extra; spare -= extra;
    }
    const placements = [];
    let cursor = columns ? bounds.x+spare/2 : bounds.top-spare/2;
    for (const group of groups) {
      const cross = group.ratio*group.size+(group.entries.length-1)*gap+(columns?group.entries.length*captionSpace:0);
      let inner = columns ? bounds.top-(bounds.height-cross)/2 : bounds.x+(bounds.width-cross)/2;
      for (const [at] of group.entries.entries()) {
        const width = columns ? group.size : group.size*group.ratios[at], height = columns ? group.size*group.ratios[at] : group.size;
        const x = columns ? cursor : inner, top = columns ? inner : cursor, y = top-captionSpace-height;
        placements.push({x,y,width,height,caption_x:x,caption_y:top-10});
        inner += columns ? -(height+captionSpace+gap) : width+gap;
      }
      cursor += columns ? group.size+gap : -(group.size+captionSpace+gap);
    }
    const edge = Math.min(...placements.map(p => Math.min(p.width, p.height))), area = placements.reduce((sum, p) => sum + p.width * p.height, 0);
    if (!best || edge > best.edge + .01 || Math.abs(edge - best.edge) <= .01 && area > best.area) best = { placements, edge, area, pageWidth, pageHeight };
  }
  if (!best) throw coded('INVALID_REQUEST');
  const page = doc.insertPage(position, [best.pageWidth, best.pageHeight]), heading = await doc.embedFont(lib.StandardFonts.HelveticaBold), caption = await doc.embedFont(lib.StandardFonts.Helvetica);
  page.drawText('Identification copies', { x: 36, y: best.pageHeight-42, size: 18, font: heading, color: rgb(.1, .2, .3) });
  page.drawText('Selected identification images - complete copies, fitted proportionally', { x: 36, y: best.pageHeight-62, size: 9, font: caption, color: rgb(.25, .3, .35) });
  const sources = images.map(({ entry, image, bytes, rotation }, at) => {
    const placement = best.placements[at];
    page.drawText('Copy ' + (at + 1), { x: placement.caption_x, y: placement.caption_y, size: 10, font: heading, color: rgb(.2, .25, .3) });
    const {x,y,width,height} = placement, sideways = rotation === 90 || rotation === 270;
    page.drawImage(image, {x:x+([90,180].includes(rotation)?width:0), y:y+([180,270].includes(rotation)?height:0),
      width:sideways?height:width,height:sideways?width:height,rotate:lib.degrees(rotation)});
    return { file_id: entry.file_id || null, filename: entry.filename || '', source_page: 1, original_sha256: digest(bytes),
      rotation, image_width: image.width, image_height: image.height, x: placement.x, y: placement.y, width: placement.width, height: placement.height };
  });
  page.drawText('Check that every copy is complete and readable before printing.', { x: 36, y: 26, size: 9, font: caption, color: rgb(.25, .3, .35) });
  return { grouped_identification: true, sources, file_ids: sources.map(source => source.file_id), page_width: best.pageWidth, page_height: best.pageHeight };
}
async function compose(input) {
  const copyBudget = { bytes: 0, pages: 0 };
  if (input.forms != null && (!Array.isArray(input.forms) || input.forms.length)) throw coded('INVALID_REQUEST');
  if ((input.reports || []).length > 256 || (input.documents || []).length > 32) throw coded('INVALID_REQUEST');
  const doc = await PDFDocument.create({ updateMetadata: false });
  doc.setCreationDate(new Date('2000-01-01T00:00:00Z')); doc.setModificationDate(new Date('2000-01-01T00:00:00Z'));
  const fields = await letterPages(doc, input.letter_text, input.signature), sections = [{ kind: 'letter', label: 'My dispute letter', start_page: 1, page_count: fields.length }];
  const reviewPages = fields.map(field => ({ page: field.page, kind: 'letter', page_width: field.page_width, page_height: field.page_height, annotation_available: false }));
  let position = fields.length;
  const identityImages = (input.documents || []).map((entry, index) => ({ entry, index })).filter(({ entry }) => isIdentityImage(entry));
  let identitySheetAdded = false;
  for (const [kind, entries] of [['report', input.reports || []], ['document', input.documents || []]]) for (const [index, entry] of entries.entries()) {
    if (kind === 'document' && identityImages.length > 1 && isIdentityImage(entry)) {
      if (identitySheetAdded) continue;
      const identity = await appendIdentitySheet(doc, identityImages, position);
      reviewPages.push({ page: position + 1, kind: 'document', label: 'IDENTITY', file_id: null, annotation_available: false, ...identity });
      sections.push({ kind: 'document', label: 'IDENTITY', file_id: null, start_page: position + 1, page_count: 1, ...identity });
      position++; identitySheetAdded = true; continue;
    }
    let pages;
    try { pages = await appendEvidence(doc, entry, kind === 'report', position, copyBudget); }
    catch (error) {
      if (error.code === 'PACKET_ATTACHMENT_UNREADABLE') error.attachment = { kind, index, reason: attachmentFailureReason(entry, kind) };
      throw error;
    }
    let inserted = 0;
    for (const sourcePage of pages) {
      const page = doc.getPage(position + inserted), metadata = kind === 'report' ? await reportMarkup(page, entry, sourcePage)
        : { ...sourceGeometry(page), annotation_available: false, annotations: [], ...(pages.image_copy || {}) };
      reviewPages.push({ page: position + inserted + 1, kind, label: label(entry.label), file_id: entry.file_id || null, source_page: sourcePage, ...metadata });
      inserted++;
    }
    sections.push({ kind, label: label(entry.label), file_id: entry.file_id || null, start_page: position + 1, page_count: inserted, source_pages: [...pages], ...(pages.image_copy || {}) }); position += inserted;
  }
  if (input.instructions != null) {
    if (typeof input.instructions !== 'string' || !input.instructions.trim() || input.instructions.length > 6000) throw coded('INVALID_REQUEST');
    const page = doc.insertPage(0, [612, 792]), font = await doc.embedFont(lib.StandardFonts.Helvetica), bold = await doc.embedFont(lib.StandardFonts.HelveticaBold);
    page.drawText('YOUR MAILING INSTRUCTIONS', { x: 50, y: 730, size: 20, font: bold, color: rgb(.1,.2,.3) });
    page.drawText('FOR YOU ONLY - REMOVE THIS PAGE BEFORE MAILING', { x: 50, y: 697, size: 13, font: bold, color: rgb(.6,.1,.1) });
    const lines = wrapped(input.instructions, font, 13, 512);
    if (lines.length > 29) throw coded('INVALID_REQUEST');
    for (let i = 0; i < lines.length; i++) page.drawText(lines[i], { x: 50, y: 655 - i * 19, size: 13, font, color: rgb(0,0,0) });
    page.drawText('Do not send this instruction sheet to the bureau.', { x: 50, y: 60, size: 13, font: bold });
    for (const section of sections) section.start_page++;
    for (const field of fields) field.page++;
    for (const page of reviewPages) page.page++;
    reviewPages.unshift({ page: 1, kind: 'instructions', page_width: 612, page_height: 792, annotation_available: false });
    sections.unshift({ kind: 'instructions', label: 'For you only - remove before mailing', start_page: 1, page_count: 1, send_to_bureau: false });
  }
  if (doc.getPageCount() > 400) throw coded('INVALID_REQUEST');
  const bytes = Buffer.from(await doc.save({ useObjectStreams: false, addDefaultPage: false, updateFieldAppearances: false }));
  return { bytes: bytes.toString('base64'), sha256: digest(bytes), page_count: doc.getPageCount(), sections, editable_fields: fields, review_pages: reviewPages, version: input.version };
}
if (require.main === module) {
  try {
    const raw = fs.readFileSync(0, 'utf8'); if (Buffer.byteLength(raw) > 90 * 1024 * 1024) throw new Error('LIMIT');
    compose(JSON.parse(raw)).then(result => process.stdout.write(JSON.stringify(result))).catch(error => { process.stdout.write(JSON.stringify({ error: ['PACKET_ATTACHMENT_UNREADABLE', 'INVALID_REQUEST'].includes(error.code) ? error.code : 'SERVICE_STATE_UNAVAILABLE',
      ...(error.code === 'PACKET_ATTACHMENT_UNREADABLE' && error.attachment ? { attachment: error.attachment } : {}) })); process.exitCode = 1; });
  } catch { process.stdout.write('{"error":"PACKET_COMPOSITION_FAILED"}'); process.exitCode = 1; }
}
module.exports = { compose, wrapped };
