'use strict';
/* Build a SINGLE-page PDF that carries substantial native text AND an image-only account/table region on the
 * SAME page. The native text is a real Helvetica text layer (readable by pdftotext); the account/table body is
 * rendered to a JPEG by poppler pdftoppm and embedded as a DCTDecode image XObject, so pdftotext sees nothing
 * for it. This is the GAP-INGEST-008 "readable header plus image-only account body on the same page" fixture.
 *
 * `image_position` ('bottom' | 'top') moves the image region so the equivalent-layout test can prove recovery is
 * positional, not just a fallback for an otherwise-blank page. */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { buildPdf } = require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');

function pdftoppm() {
  const env = process.env.CRP_PDFTOPPM_EXE;
  if (env) return env;
  return 'pdftoppm';
}

function jpegSize(buf) {
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) { i += 1; continue; }
    const marker = buf[i + 1];
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd9)) { i += 2; continue; }
    const len = buf.readUInt16BE(i + 2);
    if ((marker >= 0xc0 && marker <= 0xcf) && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      const height = buf.readUInt16BE(i + 5);
      const width = buf.readUInt16BE(i + 7);
      return { width, height };
    }
    i += 2 + len;
  }
  return { width: 0, height: 0 };
}

function escapePdfText(t) { return String(t).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)'); }

/** Render `imageLines` to a JPEG and return the raw bytes plus their pixel size. The image text is rendered at a
 *  larger size so it stays OCR-readable once scaled into the on-page image region. */
function renderImageRegion(imageLines, pageSize) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'crp-mixed-'));
  try {
    const bodyPdf = buildPdf({
      pages: [{ lines: imageLines, text_options: { font_size: 16, leading: 22, left: 40, top: 800 } }],
      page_size: pageSize
    });
    const bodyPath = path.join(tmp, 'body.pdf');
    fs.writeFileSync(bodyPath, bodyPdf);
    const ppm = path.join(tmp, 'body');
    execFileSync(pdftoppm(), ['-jpeg', '-r', '150', '-singlefile', bodyPath, ppm], { stdio: ['ignore', 'ignore', 'ignore'], timeout: 20000, windowsHide: true });
    const jpeg = fs.readFileSync(ppm + '.jpg');
    const { width, height } = jpegSize(jpeg);
    return { jpeg, width, height };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

/**
 * Build a single-page mixed PDF.
 *   nativeLines:        the substantial native text layer (header + report-like lines).
 *   imageLines:         the image-only account/table body (recovered only through OCR).
 *   image_position:     'bottom' (default) or 'top'.
 * Returns a Buffer.
 */
function buildMixedPagePdf(options) {
  const { nativeLines = [], imageLines = [], image_position = 'bottom' } = options || {};
  const pageSize = { width: 594.96, height: 841.92 };
  const { jpeg, width, height } = renderImageRegion(imageLines, pageSize);

  const objects = [];
  const add = (b) => { objects.push(b); return objects.length; };
  const catalogId = add(null);
  const pagesId = add(null);
  const fontId = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');

  const regionH = pageSize.height * 0.55;
  const scale = Math.min(pageSize.width / width, regionH / height);
  const w = width * scale;
  const h = height * scale;
  const imageTop = image_position === 'top';
  const imageY = imageTop ? pageSize.height - h : 0;
  const textTopY = imageTop ? pageSize.height - h - 12 : 810;

  const textOps = nativeLines.map((line, i) => {
    const op = i === 0 ? `40 ${textTopY} Td` : 'T*';
    return `${op} (${escapePdfText(line)}) Tj`;
  }).join('\n');
  const textContent = `BT /F1 11 Tf 13 TL\n${textOps}\nET`;

  const imgContent = `q ${w.toFixed(2)} 0 0 ${h.toFixed(2)} 0 ${imageY.toFixed(2)} cm /Im1 Do Q`;
  const content = `${textContent}\n${imgContent}`;

  const imgId = add(`<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);
  const contentId = add(`<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}\nendstream`);
  const resources = `<< /Font << /F1 ${fontId} 0 R >> /XObject << /Im1 ${imgId} 0 R >> >>`;
  const pageId = add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageSize.width} ${pageSize.height}] /Resources ${resources} /Contents ${contentId} 0 R >>`);

  const infoId = add('<< /Producer (crp-gap-ingest-008-mixed-page-fixture) >>');
  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageId} 0 R] /Count 1 >>`;

  const chunks = [];
  const offsets = [];
  let offset = 0;
  const push = (txt) => { const b = Buffer.from(txt, 'latin1'); chunks.push(b); offset += b.length; };
  const imgStreamIndex = imgId - 1;
  const raw = Buffer.from(jpeg);
  push('%PDF-1.4\n');
  objects.forEach((body, index) => {
    offsets[index] = offset;
    if (index === imgStreamIndex) {
      push(`${index + 1} 0 obj\n${body}`);
      chunks.push(raw); offset += raw.length;
      push('\nendstream\nendobj\n');
    } else {
      push(`${index + 1} 0 obj\n${body}\nendobj\n`);
    }
  });
  const xrefOffset = offset;
  push(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`);
  for (const o of offsets) push(`${String(o).padStart(10, '0')} 00000 n \n`);
  push(`trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R /Info ${infoId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);
  return Buffer.concat(chunks);
}

/** Freeze the expected account facts and source regions BEFORE extraction. */
function freezeExpected(options) {
  const { nativeLines = [], imageLines = [], image_position = 'bottom' } = options || {};
  return {
    native_lines: nativeLines.slice(),
    image_lines: imageLines.slice(),
    image_position,
    source_regions: {
      native: { page: 1, kind: 'NATIVE_TEXT_LAYER', lines: nativeLines.slice() },
      image: { page: 1, kind: 'IMAGE_ONLY_REGION', lines: imageLines.slice(), position: image_position }
    }
  };
}

module.exports = { buildMixedPagePdf, freezeExpected, jpegSize };
