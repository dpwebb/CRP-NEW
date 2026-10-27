'use strict';
// An owned, version-bound reading companion. Never OCR, replace or rewrite evidence.
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { ServiceError } = require('./errors.cjs');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const FORMAT = 'packet-reading-v1';
const MAX_TEXT = 24000, MAX_TOTAL = 240000;
const pageLabel = page => page.sources?.length > 1 ? 'Identification copies' : ({instructions:'Instructions for you',letter:'Your dispute letter',IDENTITY:'Identification copy',ADDRESS:'Address verification copy',SUPPORTING:'Supporting evidence'}[page.label] || (page.kind === 'report' ? 'Report copy' : page.label));
function extractedPages(bytes, count) {
  const result = spawnSync('pdftotext', ['-enc', 'UTF-8', '-layout', '-', '-'], {
    input: bytes, timeout: 20000, maxBuffer: 8 * 1024 * 1024, windowsHide: true,
    stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, LC_ALL: 'C' }
  });
  if (result.error || result.status !== 0) throw new ServiceError('PACKET_RENDER_UNAVAILABLE');
  const pages = result.stdout.toString('utf8').split('\f');
  if (!pages.at(-1)?.trim()) pages.pop();
  if (pages.length !== count) throw new ServiceError('PACKET_RENDER_UNAVAILABLE');
  return pages.map(text => text.replace(/\r\n?/g, '\n').trim());
}
function manifest(pdf, packet, version) {
  if (pdf.review_pages.length !== pdf.page_count || pdf.review_pages.some((page,index) => page.page !== index + 1)) throw new ServiceError('PACKET_RENDER_UNAVAILABLE');
  const extracted = extractedPages(pdf.bytes, pdf.page_count);
  const saved = packet.accessible_reading?.pdf_sha256 === pdf.sha256 ? packet.accessible_reading : null;
  const pages = pdf.review_pages.map(meta => {
    const generated = meta.kind === 'letter' || meta.kind === 'instructions';
    const alternative = saved?.pages.find(page => page.page === meta.page);
    const fields = pdf.editable_fields.filter(field => field.page === meta.page);
    // AcroForm extraction varies by page/font. Never append extracted body text to
    // exact composer chunks: some readers expose both, duplicating a long letter.
    const lastLetter = pdf.editable_fields.at(-1)?.page === meta.page;
    const signature = lastLetter && pdf.reading_signature ? `\n\nSigned by: ${pdf.reading_signature.name}\nSignature date: ${pdf.reading_signature.date}` : '';
    const text = meta.kind === 'letter' ? fields.map(field => field.text).join('\n') + signature
      : generated ? extracted[meta.page - 1] : alternative?.text || extracted[meta.page - 1];
    return { page: meta.page, kind: meta.kind, label: meta.label || meta.kind,
      source_page: meta.source_page || null, file_id: meta.file_id || null,
      sources: meta.sources || [], text, confirmed: generated ? Boolean(text.trim()) : Boolean(alternative),
      text_source: generated ? 'generated_packet_content' : alternative ? 'consumer_confirmed_alternative' : 'unverified_pdf_extraction',
      notes: (meta.annotations || []).map(note => ({ text: note.note || '', automatic: Boolean(note.automatic) })) };
  });
  for (const page of pages) page.label = pageLabel(page);
  const content = { format: FORMAT, packet_version: version, pdf_sha256: pdf.sha256, page_count: pdf.page_count, pages };
  return { ...content, complete: pages.length === pdf.page_count && pages.every(page => page.confirmed),
    reading_sha256: hash(JSON.stringify(content)) };
}
function normalize(input, pdf) {
  if (!input || Object.keys(input).sort().join(',') !== 'confirmed,pages,pdf_sha256' || input.confirmed !== true
      || input.pdf_sha256 !== pdf.sha256 || !Array.isArray(input.pages)) throw new ServiceError('INVALID_REQUEST');
  const required = pdf.review_pages.filter(meta => !['letter', 'instructions'].includes(meta.kind)).map(meta => meta.page);
  if (input.pages.length !== required.length) throw new ServiceError('INVALID_REQUEST');
  const pages = []; let total = 0;
  for (const page of input.pages) {
    if (!page || Object.keys(page).sort().join(',') !== 'page,text' || !required.includes(page.page)
      || pages.some(other => other.page === page.page) || typeof page.text !== 'string'
      || !page.text.trim() || page.text.length > MAX_TEXT || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(page.text)) throw new ServiceError('INVALID_REQUEST');
    total += page.text.length; if (total > MAX_TOTAL) throw new ServiceError('INVALID_REQUEST');
    pages.push({ page: page.page, text: page.text.replace(/\r\n?/g, '\n').trim() });
  }
  pages.sort((a,b) => a.page - b.page);
  return { format: FORMAT, pdf_sha256: pdf.sha256, pages };
}
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function html(reading, approved) {
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Packet text reading</title><style>body{font:1rem/1.6 system-ui;color:#172b40;background:white;max-width:64rem;margin:2rem auto;padding:0 1rem}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit}footer code{overflow-wrap:anywhere}a{color:#163f78}:focus-visible{outline:3px solid #163f78;outline-offset:3px}</style><body><a href="#packet-content">Skip to packet content</a><main id="packet-content"><h1>Packet text reading</h1><p>${approved ? 'Approved version.' : 'Reading companion for review. This does not approve or send your packet.'} ${reading.complete ? 'Every page has generated text or a confirmed alternative.' : 'Incomplete: attachment alternatives still need confirmation. Do not rely on this as a complete packet reading.'}</p><p>Original uploaded files and the PDF are unchanged. Confirmed alternatives are supplied by the consumer, not findings or verified report facts.</p><nav aria-label="Packet pages"><ol>${reading.pages.map(page => `<li><a href="#page-${page.page}">Page ${page.page}: ${escape(page.label)}</a></li>`).join('')}</ol></nav>${reading.pages.map(page => `<section aria-labelledby="page-${page.page}"><h2 id="page-${page.page}">Page ${page.page} of ${reading.page_count}: ${escape(page.label)}</h2>${page.kind === 'instructions' ? '<p>For you only. Remove this page before mailing.</p>' : ''}<p>${escape(page.text_source.replaceAll('_',' '))}${page.confirmed ? '' : ' — not confirmed as complete'}</p>${page.sources.length ? `<ul>${page.sources.map(source=>`<li>${escape(source.filename || 'Identification copy')}</li>`).join('')}</ul>` : ''}<pre>${escape(page.text || 'No text could be extracted. A complete alternative is required.')}</pre>${page.notes.length ? `<h3>Review notes, separate from the original page</h3><ul>${page.notes.map(note=>`<li>${escape(note.text)}</li>`).join('')}</ul>` : ''}</section>`).join('')}<footer><p>Packet version: <code>${escape(reading.packet_version)}</code></p><p>PDF SHA-256: <code>${escape(reading.pdf_sha256)}</code></p><p>Reading SHA-256: <code>${escape(reading.reading_sha256)}</code></p></footer></main></body></html>`;
}
module.exports = { manifest, normalize, html, FORMAT };
