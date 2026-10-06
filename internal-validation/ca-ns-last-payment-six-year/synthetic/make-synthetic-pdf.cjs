'use strict';
/**
 * make-synthetic-pdf.cjs — a minimal, deterministic PDF writer for TEST INPUT ONLY.
 *
 * PHASE5-001I-A. Every document it writes carries the marker text the contract refuses, so a document from
 * this writer can never be mistaken for a report and can never be admitted: it exists to exercise the
 * structural predicates, the refusal paths and the locator's failure paths against real extraction. A
 * synthetic success is never presentation evidence.
 */

const fs = require('fs');
const path = require('path');

const MARKER = 'SYNTHETIC TEST INPUT - NOT A CREDIT REPORT';

function escapePdfText(text) {
  return String(text).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function textStream(lines, options) {
  const { font_size = 9, leading = 11, left = 40, top = 800, font = 'F1' } = options || {};
  const body = lines.map((line, index) => {
    const op = index === 0 ? `${left} ${top} Td` : 'T*';
    return `${op} (${escapePdfText(line)}) Tj`;
  }).join('\n');
  return `BT /${font} ${font_size} Tf ${leading} TL\n${body}\nET`;
}

/**
 * Build a PDF.
 *   pages: array of { lines: [...], image_only: false } — an `image_only` page carries an image and no text.
 */
function buildPdf(options) {
  const {
    pages, page_size = { width: 594.96, height: 841.92 }, producer = 'crp-001i-a-test-fixture-writer',
    creator = 'crp-001i-a-test-fixture-writer', title_omitted = true
  } = options;

  const objects = [];
  const add = (body) => { objects.push(body); return objects.length; };

  const catalogId = add(null); // placeholder, patched below
  const pagesId = add(null);
  const fontId = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');

  const pageIds = [];
  for (const page of pages) {
    const imageOnly = page.image_only === true;
    let imageId = null;
    let content;
    if (imageOnly) {
      imageId = add('<< /Type /XObject /Subtype /Image /Width 1 /Height 1 /ColorSpace /DeviceGray /BitsPerComponent 8 /Length 1 >>\nstream\n\u0000\nendstream');
      content = `q ${page_size.width} 0 0 ${page_size.height} 0 0 cm /Im1 Do Q`;
    } else {
      content = textStream(page.lines || [], page.text_options);
    }
    const contentId = add(`<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}\nendstream`);
    const resources = imageOnly
      ? `<< /XObject << /Im1 ${imageId} 0 R >> >>`
      : `<< /Font << /F1 ${fontId} 0 R >> >>`;
    pageIds.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${page_size.width} ${page_size.height}] ` +
      `/Resources ${resources} /Contents ${contentId} 0 R >>`));
  }

  const infoId = add(`<< /Producer (${escapePdfText(producer)}) /Creator (${escapePdfText(creator)}) >>`);
  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;

  const chunks = [];
  const offsets = [];
  let offset = 0;
  const push = (text) => { const buffer = Buffer.from(text, 'latin1'); chunks.push(buffer); offset += buffer.length; };
  push('%PDF-1.4\n');
  objects.forEach((body, index) => {
    offsets[index] = offset;
    push(`${index + 1} 0 obj\n${body}\nendobj\n`);
  });
  const xrefOffset = offset;
  push(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`);
  for (const o of offsets) push(`${String(o).padStart(10, '0')} 00000 n \n`);
  push(`trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R /Info ${infoId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);
  return Buffer.concat(chunks);
}

function writeFixture(directory, name, options) {
  fs.mkdirSync(directory, { recursive: true });
  const file = path.join(directory, name);
  fs.writeFileSync(file, buildPdf(options));
  return file;
}

/**
 * Build a PDF whose every WORD is placed at an explicit (x, y) — top-left origin, in points — so a table's
 * headings, cells and legend are SEPARATE positioned elements, not one inline string. Used to exercise the
 * geometry-aware grid assembler against real positional extraction.
 */
function buildWordPdf(pages, options) {
  const opts = options || {};
  const page_size = opts.page_size || { width: 594.96, height: 841.92 };
  const font_size = opts.font_size || 9;
  const producer = opts.producer || 'crp-001i-a-test-fixture-writer';
  const creator = opts.creator || 'crp-001i-a-test-fixture-writer';
  const objects = [];
  const add = (body) => { objects.push(body); return objects.length; };
  const catalogId = add(null);
  const pagesId = add(null);
  const fontId = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const pageIds = [];
  for (const page of pages) {
    const body = (page.words || []).map((w) => {
      const pdfY = page_size.height - (w.y || 0) - font_size;
      return `BT /F1 ${font_size} Tf ${w.x || 40} ${pdfY.toFixed(2)} Td (${escapePdfText(w.text)}) Tj ET`;
    }).join('\n');
    const contentId = add(`<< /Length ${Buffer.byteLength(body, 'latin1')} >>\nstream\n${body}\nendstream`);
    const resources = `<< /Font << /F1 ${fontId} 0 R >> >>`;
    pageIds.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${page_size.width} ${page_size.height}] /Resources ${resources} /Contents ${contentId} 0 R >>`));
  }
  const infoId = add(`<< /Producer (${escapePdfText(producer)}) /Creator (${escapePdfText(creator)}) >>`);
  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;
  const chunks = [];
  const offsets = [];
  let offset = 0;
  const push = (text) => { const buffer = Buffer.from(text, 'latin1'); chunks.push(buffer); offset += buffer.length; };
  push('%PDF-1.4\n');
  objects.forEach((body, index) => {
    offsets[index] = offset;
    push(`${index + 1} 0 obj\n${body}\nendobj\n`);
  });
  const xrefOffset = offset;
  push(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`);
  for (const o of offsets) push(`${String(o).padStart(10, '0')} 00000 n \n`);
  push(`trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R /Info ${infoId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);
  return Buffer.concat(chunks);
}

/** The marker every fixture carries, so a fixture can never be admitted as a report. */
function markerLines() {
  return [MARKER];
}

module.exports = { buildPdf, buildWordPdf, writeFixture, markerLines, MARKER, textStream };
