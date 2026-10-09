'use strict';
// A self-contained printable PDF writer. The shipped font carries its own OFL license.
// No account data is sent to a renderer, font service or external conversion tool.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
let loadedFont;

function font() {
  if (loadedFont) return loadedFont;
  const bytes = fs.readFileSync(path.join(__dirname, 'packet-fonts', 'NotoSans-Regular.ttf'));
  const tables = {};
  for (let i = 0; i < bytes.readUInt16BE(4); i++) {
    const at = 12 + 16 * i;
    tables[bytes.toString('ascii', at, at + 4)] = bytes.readUInt32BE(at + 8);
  }
  const units = bytes.readUInt16BE(tables.head + 18);
  const metrics = bytes.readUInt16BE(tables.hhea + 34);
  const cmap = tables.cmap;
  let map4, map12;
  for (let i = 0; i < bytes.readUInt16BE(cmap + 2); i++) {
    const at = cmap + 4 + i * 8, offset = cmap + bytes.readUInt32BE(at + 4);
    if (bytes.readUInt16BE(offset) === 4) map4 = offset;
    if (bytes.readUInt16BE(offset) === 12) map12 = offset;
  }
  function glyph(code) {
    if (map12) {
      const count = bytes.readUInt32BE(map12 + 12);
      let lo = 0, hi = count - 1;
      while (lo <= hi) {
        const index = (lo + hi) >>> 1, at = map12 + 16 + index * 12;
        const start = bytes.readUInt32BE(at), end = bytes.readUInt32BE(at + 4);
        if (code < start) hi = index - 1;
        else if (code > end) lo = index + 1;
        else return bytes.readUInt32BE(at + 8) + code - start;
      }
    }
    if (map4 && code <= 0xffff) {
      const count = bytes.readUInt16BE(map4 + 6) / 2;
      const end = map4 + 14, start = end + count * 2 + 2;
      const delta = start + count * 2, range = delta + count * 2;
      for (let i = 0; i < count; i++) {
        if (code > bytes.readUInt16BE(end + i * 2)) continue;
        if (code < bytes.readUInt16BE(start + i * 2)) return 0;
        const shift = bytes.readInt16BE(delta + i * 2), offset = bytes.readUInt16BE(range + i * 2);
        if (!offset) return (code + shift) & 0xffff;
        const value = bytes.readUInt16BE(range + i * 2 + offset + (code - bytes.readUInt16BE(start + i * 2)) * 2);
        return value ? (value + shift) & 0xffff : 0;
      }
    }
    return 0;
  }
  function width(character) {
    const id = glyph(character.codePointAt(0));
    return bytes.readUInt16BE(tables.hmtx + Math.min(id, metrics - 1) * 4) * 1000 / units;
  }
  loadedFont = { bytes, glyph, width, units,
    ascent: bytes.readInt16BE(tables.hhea + 4) * 1000 / units,
    descent: bytes.readInt16BE(tables.hhea + 6) * 1000 / units,
    bbox: [36, 38, 40, 42].map(at => Math.round(bytes.readInt16BE(tables.head + at) * 1000 / units)) };
  return loadedFont;
}

function wrap(text, size, limit, face) {
  const width = value => [...value].reduce((sum, character) => sum + face.width(character) * size / 1000, 0);
  const rows = [];
  let remaining = text;
  while (width(remaining) > limit) {
    const characters = [...remaining];
    let taken = 0, measured = 0, lastSpace = -1;
    while (taken < characters.length && measured + face.width(characters[taken]) * size / 1000 <= limit) {
      if (/\s/.test(characters[taken])) lastSpace = taken;
      measured += face.width(characters[taken]) * size / 1000;
      taken++;
    }
    const split = lastSpace > 0 ? lastSpace : Math.max(1, taken);
    rows.push(characters.slice(0, split).join('').trimEnd());
    remaining = characters.slice(split).join('').trimStart();
  }
  rows.push(remaining);
  return rows;
}

function unicodeHex(character) {
  return Buffer.from(character, 'utf16le').swap16().toString('hex').toUpperCase();
}

function renderPacketPdf(text) {
  const face = font(), pages = [[]];
  const left = 54, right = 558, top = 736, bottom = 64;
  let y = top;
  const headings = new Set(['CREDIT REPORT DISPUTE', 'Re: Credit report dispute', 'EVIDENCE REFERENCES (from your report)',
    'EVIDENCE REFERENCES (report readings and published definitions)', 'PRINT AND MAIL']);
  const originals = String(text).split('\n');
  for (let index = 0; index < originals.length; index++) {
    const original = originals[index];
    if (original.startsWith('EVIDENCE REFERENCES') && pages[pages.length - 1].length) {
      pages.push([]); y = top;
    }
    if (!original) { y -= 8; continue; }
    const heading = headings.has(original), size = original === 'CREDIT REPORT DISPUTE' ? 18
      : original === 'Re: Credit report dispute' ? 11 : heading ? 13 : 11;
    const indent = /^\s/.test(original) ? 12 : 0;
    const lines = wrap(original.trim(), size, right - left - indent, face);
    // Keep each letter paragraph and its item name together where it fits on one page.
    const next = /^\d+\. /.test(original) ? wrap((originals[index + 1] || '').trim(), 11, right - left, face).length : 0;
    const blockHeight = (lines.length + next) * 15 + (original === 'Sincerely,' ? 68 : 0);
    if (blockHeight < top - bottom && y - blockHeight < bottom) { pages.push([]); y = top; }
    if (heading && y - 45 < bottom) { pages.push([]); y = top; }
    for (const line of lines) {
      if (y < bottom) { pages.push([]); y = top; }
      const width = [...line].reduce((sum, character) => sum + face.width(character) * size / 1000, 0);
      pages[pages.length - 1].push({ text: line, x: left + indent, y, size, width });
      y -= heading ? 20 : 15;
    }
  }
  if (!pages[pages.length - 1].length && pages.length > 1) pages.pop();
  const characters = [...new Set([...text, ...pages.map((_, i) => `Page ${i + 1} of ${pages.length}`).join('')])];
  const cid = new Map(characters.map((character, i) => [character, i + 1]));
  const encode = value => [...value].map(character => cid.get(character).toString(16).padStart(4, '0')).join('');
  const objects = [null];
  const add = object => { objects.push(Buffer.isBuffer(object) ? object : Buffer.from(object)); return objects.length - 1; };
  const stream = (bytes, extra = '') => Buffer.concat([Buffer.from(`<< /Length ${bytes.length} ${extra} >>\nstream\n`), bytes, Buffer.from('\nendstream')]);
  const catalog = add(''), pageTree = add('');
  const fontFile = add(stream(zlib.deflateSync(face.bytes), `/Filter /FlateDecode /Length1 ${face.bytes.length}`));
  const descriptor = add(`<< /Type /FontDescriptor /FontName /NotoSans-Regular /Flags 32 /FontBBox [${face.bbox.join(' ')}] /ItalicAngle 0 /Ascent ${Math.round(face.ascent)} /Descent ${Math.round(face.descent)} /CapHeight 714 /StemV 80 /FontFile2 ${fontFile} 0 R >>`);
  const glyphMap = Buffer.alloc((characters.length + 1) * 2);
  characters.forEach((character, i) => glyphMap.writeUInt16BE(face.glyph(character.codePointAt(0)), (i + 1) * 2));
  const gid = add(stream(glyphMap));
  const widths = characters.map(character => Math.round(face.width(character))).join(' ');
  const descendant = add(`<< /Type /Font /Subtype /CIDFontType2 /BaseFont /NotoSans-Regular /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor ${descriptor} 0 R /CIDToGIDMap ${gid} 0 R /DW 600 /W [1 [${widths}]] >>`);
  const mappings = [];
  for (let i = 0; i < characters.length; i += 100) {
    const group = characters.slice(i, i + 100);
    mappings.push(`${group.length} beginbfchar`, ...group.map((character, j) => `<${(i + j + 1).toString(16).padStart(4, '0')}> <${unicodeHex(character)}>`), 'endbfchar');
  }
  const cmap = add(stream(Buffer.from(`/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n/CMapName /CRPUnicode def\n/CMapType 2 def\n1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n${mappings.join('\n')}\nendcmap\nCMapName currentdict /CMap defineresource pop\nend\nend`)));
  const type0 = add(`<< /Type /Font /Subtype /Type0 /BaseFont /NotoSans-Regular /Encoding /Identity-H /DescendantFonts [${descendant} 0 R] /ToUnicode ${cmap} 0 R >>`);
  const ids = pages.map((lines, i) => {
    const commands = lines.map(line => `BT /F1 ${line.size} Tf 1 0 0 1 ${line.x} ${line.y} Tm <${encode(line.text)}> Tj ET`);
    commands.push(`BT /F1 9 Tf 1 0 0 1 54 36 Tm <${encode(`Page ${i + 1} of ${pages.length}`)}> Tj ET`);
    const content = add(stream(Buffer.from(commands.join('\n'))));
    return add(`<< /Type /Page /Parent ${pageTree} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${type0} 0 R >> >> /Contents ${content} 0 R >>`);
  });
  objects[catalog] = Buffer.from(`<< /Type /Catalog /Pages ${pageTree} 0 R >>`);
  objects[pageTree] = Buffer.from(`<< /Type /Pages /Count ${ids.length} /Kids [${ids.map(id => `${id} 0 R`).join(' ')}] >>`);
  const chunks = [Buffer.from('%PDF-1.7\n%\xE2\xE3\xCF\xD3\n', 'latin1')], offsets = [0];
  let length = chunks[0].length;
  for (let i = 1; i < objects.length; i++) {
    offsets.push(length);
    const item = Buffer.concat([Buffer.from(`${i} 0 obj\n`), objects[i], Buffer.from('\nendobj\n')]);
    chunks.push(item); length += item.length;
  }
  chunks.push(Buffer.from(`xref\n0 ${objects.length}\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length} /Root ${catalog} 0 R >>\nstartxref\n${length}\n%%EOF\n`));
  return { bytes: Buffer.concat(chunks), page_count: pages.length, layout: pages };
}
/** Additive drawing surface for branded assessment reports. Existing packet rendering is unchanged. */
function measurePdfText(text, size = 11) {
  const face = font();
  return [...String(text)].reduce((sum, character) => sum + face.width(character) * size / 1000, 0);
}
function wrapPdfText(text, size, width) { return wrap(String(text), size, width, font()); }

function renderDrawingPdf(pages, { title = 'Credit Regulator Pro report' } = {}) {
  const face = font();
  const characters = [...new Set(pages.flatMap(page => page.filter(item => item.type === 'text')
    .flatMap(item => [...String(item.text)])))];
  if (characters.length >= 65535) throw new Error('PDF_CHARACTER_LIMIT');
  const cid = new Map(characters.map((character, index) => [character, index + 1]));
  const encode = value => [...String(value)].map(character => cid.get(character).toString(16).padStart(4, '0')).join('');
  const number = value => Number(value.toFixed(3));
  const color = value => (value || [0, 0, 0]).map(number).join(' ');
  const objects = [null];
  const add = object => { objects.push(Buffer.isBuffer(object) ? object : Buffer.from(object)); return objects.length - 1; };
  const stream = (bytes, extra = '') => Buffer.concat([Buffer.from(`<< /Length ${bytes.length} ${extra} >>\nstream\n`), bytes, Buffer.from('\nendstream')]);
  const catalog = add(''), pageTree = add('');
  const fontFile = add(stream(zlib.deflateSync(face.bytes), `/Filter /FlateDecode /Length1 ${face.bytes.length}`));
  const descriptor = add(`<< /Type /FontDescriptor /FontName /NotoSans-Regular /Flags 32 /FontBBox [${face.bbox.join(' ')}] /ItalicAngle 0 /Ascent ${Math.round(face.ascent)} /Descent ${Math.round(face.descent)} /CapHeight 714 /StemV 80 /FontFile2 ${fontFile} 0 R >>`);
  const glyphMap = Buffer.alloc((characters.length + 1) * 2);
  characters.forEach((character, index) => glyphMap.writeUInt16BE(face.glyph(character.codePointAt(0)), (index + 1) * 2));
  const gid = add(stream(glyphMap));
  const descendant = add(`<< /Type /Font /Subtype /CIDFontType2 /BaseFont /NotoSans-Regular /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor ${descriptor} 0 R /CIDToGIDMap ${gid} 0 R /DW 600 /W [1 [${characters.map(character => Math.round(face.width(character))).join(' ')}]] >>`);
  const mappings = [];
  for (let index = 0; index < characters.length; index += 100) {
    const group = characters.slice(index, index + 100);
    mappings.push(`${group.length} beginbfchar`, ...group.map((character, offset) => `<${(index + offset + 1).toString(16).padStart(4, '0')}> <${unicodeHex(character)}>`), 'endbfchar');
  }
  const cmap = add(stream(Buffer.from(`/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n/CMapName /CRPAssessmentUnicode def\n/CMapType 2 def\n1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n${mappings.join('\n')}\nendcmap\nCMapName currentdict /CMap defineresource pop\nend\nend`)));
  const type0 = add(`<< /Type /Font /Subtype /Type0 /BaseFont /NotoSans-Regular /Encoding /Identity-H /DescendantFonts [${descendant} 0 R] /ToUnicode ${cmap} 0 R >>`);
  const ids = pages.map(items => {
    const commands = items.filter(item => item.type !== 'link').map(item => {
      if (item.type === 'rect') return `q ${color(item.fill)} rg ${item.stroke ? `${color(item.stroke)} RG ${item.line_width || 1} w` : ''} ${number(item.x)} ${number(item.y)} ${number(item.width)} ${number(item.height)} re ${item.stroke ? 'B' : 'f'} Q`;
      if (item.type === 'line') return `q ${color(item.color)} RG ${item.width || 1} w ${number(item.x)} ${number(item.y)} m ${number(item.x2)} ${number(item.y2)} l S Q`;
      return `q ${color(item.color)} rg ${item.bold ? `${color(item.color)} RG 0.22 w` : ''} BT /F1 ${item.size} Tf ${item.bold ? '2 Tr ' : ''}1 0 0 1 ${number(item.x)} ${number(item.y)} Tm <${encode(item.text)}> Tj ET Q`;
    });
    const annotations = items.filter(item => item.type === 'link').map(item => {
      if (!/^https:\/\//i.test(item.url)) return null;
      const uri = Buffer.from(item.url, 'utf8').toString('hex');
      return add(`<< /Type /Annot /Subtype /Link /Rect [${number(item.x)} ${number(item.y)} ${number(item.x + item.width)} ${number(item.y + item.height)}] /Border [0 0 0] /A << /S /URI /URI <${uri}> >> >>`);
    }).filter(Boolean);
    const content = add(stream(Buffer.from(commands.join('\n'))));
    return add(`<< /Type /Page /Parent ${pageTree} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${type0} 0 R >> >> /Contents ${content} 0 R ${annotations.length ? `/Annots [${annotations.map(id => `${id} 0 R`).join(' ')}]` : ''} >>`);
  });
  objects[catalog] = Buffer.from(`<< /Type /Catalog /Pages ${pageTree} 0 R >>`);
  objects[pageTree] = Buffer.from(`<< /Type /Pages /Count ${ids.length} /Kids [${ids.map(id => `${id} 0 R`).join(' ')}] >>`);
  const info = add(`<< /Title <FEFF${unicodeHex(title)}> /Author (Credit Regulator Pro) /Creator (Credit Regulator Pro) >>`);
  const chunks = [Buffer.from('%PDF-1.7\n%\xE2\xE3\xCF\xD3\n', 'latin1')], offsets = [0];
  let length = chunks[0].length;
  for (let index = 1; index < objects.length; index++) {
    offsets.push(length);
    const item = Buffer.concat([Buffer.from(`${index} 0 obj\n`), objects[index], Buffer.from('\nendobj\n')]);
    chunks.push(item); length += item.length;
  }
  chunks.push(Buffer.from(`xref\n0 ${objects.length}\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length} /Root ${catalog} 0 R /Info ${info} 0 R >>\nstartxref\n${length}\n%%EOF\n`));
  return { bytes: Buffer.concat(chunks), page_count: pages.length, layout: pages };
}
module.exports = { renderPacketPdf, renderDrawingPdf, measurePdfText, wrapPdfText };
