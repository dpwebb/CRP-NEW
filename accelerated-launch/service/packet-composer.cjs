'use strict';
// Private report and document bytes travel only through a local worker's stdin/stdout.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { ServiceError } = require('./errors.cjs');
const FORMAT_VERSION = 'inline-editable-packet-v2';
const MAX_BYTES = 64 * 1024 * 1024;
let rendererVersion;
// Review, approve, print and download often request the exact same immutable recipe in quick
// succession. This bounded memory-only cache never stores input objects or writes private files.
const cache = new Map();
const CACHE_LIMIT = 16 * 1024 * 1024, CACHE_TTL_MS = 60000, CACHE_ENTRIES = 4;
let cachedBytes = 0;
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function copyResult(result) {
  return { ...result, bytes: Buffer.from(result.bytes), sections: JSON.parse(JSON.stringify(result.sections)),
    editable_fields: JSON.parse(JSON.stringify(result.editable_fields)), review_pages: JSON.parse(JSON.stringify(result.review_pages)) };
}
function forget(key) { const row = cache.get(key); if (row) { clearTimeout(row.timer); cachedBytes -= row.result.bytes.length; cache.delete(key); } }
function version() {
  if (!rendererVersion) {
    const hash = crypto.createHash('sha256');
    for (const filename of ['packet-composer.cjs', 'packet-composer-worker.cjs', 'pdf-vendor/pdf-lib-1.17.1.min.js', 'pdf-vendor/fontkit-1.1.1.min.js', 'packet-fonts/NotoSans-Regular.ttf']) {
      hash.update(filename); hash.update(fs.readFileSync(path.join(__dirname, filename)));
    }
    // Permitted encrypted evidence depends on the local Poppler copy engine. A
    // changed engine invalidates saved approval identities, even with a warm recipe.
    for (const tool of ['pdfinfo', 'pdftocairo', 'pdftoppm']) {
      const result = spawnSync(tool, ['-v'], { encoding: 'utf8', timeout: 2000, maxBuffer: 8192, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, LC_ALL: 'C' } });
      const identity = !result.error && result.status === 0 && (String(result.stdout || '') + String(result.stderr || '')).match(new RegExp(`^${tool} version ([0-9]+(?:\\.[0-9]+)+)`, 'm'));
      hash.update(tool); hash.update(identity ? identity[1] : 'unavailable');
    }
    rendererVersion = `${FORMAT_VERSION}-${hash.digest('hex').slice(0, 24)}`;
  }
  return rendererVersion;
}
function composePacket(input) {
  if (!input || typeof input.letter_text !== 'string' || !input.letter_text.trim() || input.letter_text.length > 200000) throw new ServiceError('INVALID_REQUEST');
  // OWNER-BUREAU-FORMS-RETIREMENT-001: reject retired packet components.
  if (input.forms != null && (!Array.isArray(input.forms) || input.forms.length)) throw new ServiceError('INVALID_REQUEST');
  let total = 0, markerCount = 0;
  const encode = (entries, limit, isReport = false) => {
    if (!Array.isArray(entries) || entries.length > limit) throw new ServiceError('INVALID_REQUEST');
    return entries.map(entry => {
      if (!entry || !(Buffer.isBuffer(entry.bytes) || entry.bytes instanceof Uint8Array) || !entry.bytes.length) throw new ServiceError('INVALID_REQUEST');
      const bytes = Buffer.from(entry.bytes);
      total += bytes.length;
      if (total > MAX_BYTES) throw new ServiceError('INVALID_REQUEST');
      if (isReport && (!Array.isArray(entry.relevant_pages) || !entry.relevant_pages.length || entry.relevant_pages.some(page => !Number.isSafeInteger(page) || page < 1))) throw new ServiceError('INVALID_REQUEST');
      const markers = isReport ? entry.markers || [] : [];
      if (!Array.isArray(markers) || markers.length > 1024 || (markerCount += markers.length) > 4096
          || markers.some(marker => !marker || !Number.isSafeInteger(marker.page) || marker.page < 1
            || !Number.isSafeInteger(marker.item_number) || marker.item_number < 1
            || typeof marker.issue_id !== 'string' || typeof marker.caption !== 'string' || marker.caption.length > 160)) throw new ServiceError('INVALID_REQUEST');
      const annotations = isReport ? entry.annotations || [] : [];
      if (!Array.isArray(annotations) || annotations.length > 128 || annotations.some(annotation => !annotation
          || !Number.isSafeInteger(annotation.page) || !entry.relevant_pages.includes(annotation.page)
          || !['x', 'y', 'width', 'height'].every(key => Number.isFinite(annotation[key]))
          || annotation.x < 0 || annotation.y < 0 || annotation.width <= 0 || annotation.height <= 0
          || annotation.x + annotation.width > 1 || annotation.y + annotation.height > 1
          || typeof annotation.note !== 'string' || annotation.note.length > 200)) throw new ServiceError('INVALID_REQUEST');
      return { bytes: bytes.toString('base64'), content_type: entry.content_type, relevant_pages: entry.relevant_pages,
        label: typeof entry.label === 'string' ? entry.label.slice(0, 300) : '', filename: typeof entry.filename === 'string' ? entry.filename.slice(0, 300) : '',
        file_id: entry.file_id || null, markers, annotations };
    });
  };
  if (input.instructions != null && (typeof input.instructions !== 'string' || !input.instructions.trim() || input.instructions.length > 6000)) throw new ServiceError('INVALID_REQUEST');
  const payload = { letter_text: input.letter_text, instructions: input.instructions || null, reports: encode(input.reports || [], 256, true),
    documents: encode(input.documents || [], 32), version: version() };
  const serialized = JSON.stringify(payload), key = digest(serialized), now = Date.now();
  for (const [oldKey, row] of cache) if (row.expires <= now) forget(oldKey);
  const hit = cache.get(key);
  if (hit) { cache.delete(key); cache.set(key, hit); return copyResult(hit.result); }
  const child = spawnSync(process.execPath, [path.join(__dirname, 'packet-composer-worker.cjs')], {
    input: serialized, encoding: 'utf8', timeout: 45000, maxBuffer: 128 * 1024 * 1024,
    windowsHide: true, env: { ...process.env, NODE_OPTIONS: '' }, stdio: ['pipe', 'pipe', 'pipe']
  });
  // Do not expose worker diagnostics or private packet contents in errors/logs.
  if (child.error) throw new ServiceError('SERVICE_STATE_UNAVAILABLE');
  let result;
  try { result = JSON.parse(child.stdout); } catch { throw new ServiceError('SERVICE_STATE_UNAVAILABLE'); }
  if (child.status !== 0 || result.error) {
    const error = new ServiceError(['PACKET_ATTACHMENT_UNREADABLE', 'SERVICE_STATE_UNAVAILABLE'].includes(result.error) ? result.error : 'INVALID_REQUEST');
    const failure = result.attachment;
    const entries = failure?.kind === 'report' ? payload.reports : failure?.kind === 'document' ? payload.documents : null;
    const entry = Number.isSafeInteger(failure?.index) && failure.index >= 0 ? entries?.[failure.index] : null;
    if (error.code === 'PACKET_ATTACHMENT_UNREADABLE' && entry) {
      // Resolve identity from the authorized recipe, never from worker diagnostics.
      const filename = entry.filename.replace(/[\x00-\x1f\x7f]/g, ' ').trim() || (failure.kind === 'report' ? 'Selected report' : 'Selected document');
      const reason = ['PDF_RESTRICTED', 'PDF_PRINT_PROHIBITED'].includes(failure.reason) ? failure.reason : 'UNREADABLE';
      error.detail = { file_id: entry.file_id, filename, attachment_kind: failure.kind, reason };
      error.message = reason !== 'UNREADABLE'
        ? `We could not add "${filename}". This PDF does not allow ${reason === 'PDF_PRINT_PROHIBITED' ? 'printing' : 'copying needed for report evidence'}. Replace it with an unrestricted PDF or clear JPG/PNG copies you are allowed to use, then save and review again.`
        : `We could not add "${filename}". This file cannot be read for the packet. Replace it with a valid, unlocked PDF or clear JPG/PNG copies, then save and review again.`;
    }
    throw error;
  }
  const bytes = Buffer.from(result.bytes || '', 'base64');
  if (bytes.subarray(0, 5).toString('ascii') !== '%PDF-' || result.version !== payload.version || result.sha256 !== digest(bytes) || !Number.isSafeInteger(result.page_count) || result.page_count < 1) throw new ServiceError('SERVICE_STATE_UNAVAILABLE');
  const composed = { bytes, sha256: result.sha256, page_count: result.page_count, sections: result.sections,
    editable_fields: result.editable_fields, review_pages: result.review_pages, version: result.version };
  if (bytes.length <= CACHE_LIMIT) {
    while (cache.size >= CACHE_ENTRIES || cachedBytes + bytes.length > CACHE_LIMIT) forget(cache.keys().next().value);
    const timer = setTimeout(() => forget(key), CACHE_TTL_MS); timer.unref();
    cache.set(key, { expires: now + CACHE_TTL_MS, result: composed, timer }); cachedBytes += bytes.length;
  }
  return copyResult(composed);
}
module.exports = { composePacket, version, VERSION: version() };
