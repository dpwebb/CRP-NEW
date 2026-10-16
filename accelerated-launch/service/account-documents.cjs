'use strict';
/** Private account supporting documents. Bytes are retained without parsing, OCR or identity assertions. */

const crypto = require('node:crypto');
const path = require('node:path');
const { ServiceError } = require('./errors.cjs');
const uploads = require('./uploads.cjs');

const PURPOSE = 'ACCOUNT_SUPPORT';
const DOCUMENT_TYPES = Object.freeze(['IDENTITY', 'ADDRESS', 'SUPPORTING']);
const MAX_ACCOUNT_DOCUMENTS = 8;
const MAX_DOCUMENT_KIND_LENGTH = 80;
const INPUT_FIELDS = new Set(['document_type', 'document_kind', 'originalFilename', 'declaredBytes', 'mimeType', 'contentBase64']);

function requireAccount(state, actor) {
  if (!actor || typeof actor.account_id !== 'string' || !actor.account_id ||
      !state.accounts.some((row) => row.account_id === actor.account_id)) {
    throw new ServiceError('AUTHENTICATION_REQUIRED');
  }
}

function isAccountDocument(row) {
  return row.purpose === PURPOSE && row.case_id === null;
}

function validDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
function savedDocumentDate(state, row) {
  if (row.document_date_sha256 !== undefined) {
    return row.document_date_sha256 === row.sha256 && validDate(row.document_date) ? row.document_date : null;
  }
  // Older packets already recorded a date for this immutable owned file. Conflicting dates need review.
  const dates = [...new Set((state?.packets || []).filter(packet => packet.account_id === row.account_id
    && packet.support?.document_ids?.includes(row.file_id)).map(packet => packet.support.document_dates?.[row.file_id]).filter(validDate))];
  return dates.length === 1 ? dates[0] : null;
}
function publicDocument(row, state) {
  return {
    file_id: row.file_id,
    purpose: PURPOSE,
    document_type: row.document_type,
    document_kind: row.document_kind,
    original_filename: row.original_filename,
    content_type: row.content_type,
    stored_bytes: row.stored_bytes,
    created_at: row.created_at,
    ...(savedDocumentDate(state, row) ? { document_date: savedDocumentDate(state, row) } : {})
  };
}

function requireOwnedDocument(store, actor, fileId) {
  const state = store.state();
  requireAccount(state, actor);
  const row = state.files.find((file) => file.file_id === fileId && isAccountDocument(file));
  if (!row) throw new ServiceError('NOT_FOUND');
  if (row.account_id !== actor.account_id) throw new ServiceError('NOT_AUTHORIZED');
  return row;
}

function contentType(bytes) {
  const container = uploads.detectContainerFromBytes(bytes);
  if (container === 'PDF') return 'application/pdf';
  if (container === 'IMAGE') {
    uploads.validateImageDimensions(bytes);
    return bytes.subarray(0, uploads.PNG_MAGIC.length).equals(uploads.PNG_MAGIC) ? 'image/png' : 'image/jpeg';
  }
  throw new ServiceError('UNSUPPORTED_FILE_TYPE');
}

function validateInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      Object.keys(input).some((key) => !INPUT_FIELDS.has(key)) || !DOCUMENT_TYPES.includes(input.document_type)) {
    throw new ServiceError('INVALID_REQUEST');
  }
  for (const key of ['document_kind', 'originalFilename', 'mimeType']) {
    if (input[key] !== undefined && typeof input[key] !== 'string') throw new ServiceError('INVALID_REQUEST');
  }
  const kind = (input.document_kind || '').trim();
  if (kind.length > MAX_DOCUMENT_KIND_LENGTH || /[\x00-\x1f\x7f]/.test(kind)) throw new ServiceError('INVALID_REQUEST');
  if (input.originalFilename && (input.originalFilename.length > 512 || /[\x00-\x1f\x7f]/.test(input.originalFilename))) {
    throw new ServiceError('INVALID_REQUEST');
  }
  const meta = uploads.validateUploadMeta(input);
  if (!meta.ok) throw new ServiceError(meta.code);
  const bytes = uploads.decodeUploadBody(input);
  if (input.declaredBytes !== undefined && input.declaredBytes !== null && input.declaredBytes !== bytes.length) {
    throw new ServiceError('INVALID_REQUEST');
  }
  const type = contentType(bytes);
  const mime = (input.mimeType || '').toLowerCase().split(';')[0].trim();
  const extension = path.extname(input.originalFilename || '').toLowerCase();
  const extensions = { 'application/pdf': ['.pdf'], 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'] };
  if ((mime && mime !== type) || (extension && !extensions[type].includes(extension))) {
    throw new ServiceError('UNSUPPORTED_FILE_TYPE');
  }
  const fallback = type === 'application/pdf' ? 'document.pdf' : type === 'image/png' ? 'document.png' : 'document.jpg';
  // Handle either browser filename separator; this name is display metadata only.
  const filename = uploads.safeFilename((input.originalFilename || fallback).replace(/\\/g, '/'));
  return { bytes, type, kind, filename };
}

function checkQuota(state, actor, bytes) {
  const owned = state.files.filter((row) => row.account_id === actor.account_id);
  if (owned.filter(isAccountDocument).length >= MAX_ACCOUNT_DOCUMENTS) {
    throw new ServiceError('ACCOUNT_DOCUMENT_LIMIT_REACHED', { limit: MAX_ACCOUNT_DOCUMENTS });
  }
  const held = owned.reduce((total, row) => total + (Number(row.stored_bytes) || 0), 0);
  if (held + bytes > uploads.MAX_ACCOUNT_STORED_BYTES) {
    throw new ServiceError('ACCOUNT_STORAGE_QUOTA_EXCEEDED', { limit: uploads.MAX_ACCOUNT_STORED_BYTES });
  }
}

function listDocuments(store, actor) {
  const state = store.state();
  requireAccount(state, actor);
  return state.files.filter((row) => row.account_id === actor.account_id && isAccountDocument(row))
    .map(row => publicDocument(row, state)).sort((a, b) => a.created_at.localeCompare(b.created_at) || a.file_id.localeCompare(b.file_id));
}

function rememberDates(state, actor, dates, material) {
  for (const document of material) {
    const date = dates[document.file_id];
    if (!date) continue;
    const row = state.files.find(file => file.file_id === document.file_id && file.account_id === actor.account_id && isAccountDocument(file));
    if (!row || row.sha256 !== document.sha256 || !validDate(date)) throw new ServiceError('SERVICE_STATE_UNAVAILABLE');
    row.document_date = date;
    row.document_date_sha256 = row.sha256;
  }
}
function preserveLegacyDates(state, actor, caseId) {
  const referenced = new Set((state.packets || []).filter(packet => packet.account_id === actor.account_id && packet.case_id === caseId)
    .flatMap(packet => packet.support?.document_ids || []));
  for (const row of state.files) {
    if (row.account_id !== actor.account_id || !isAccountDocument(row) || !referenced.has(row.file_id)
      || row.document_date_sha256 !== undefined || !row.sha256) continue;
    const date = savedDocumentDate(state, row);
    if (date) { row.document_date = date; row.document_date_sha256 = row.sha256; }
  }
}

function receiveDocument(store, actor, input) {
  const state = store.state();
  requireAccount(state, actor);
  const { bytes, type, kind, filename } = validateInput(input);
  checkQuota(state, actor, bytes.length);
  const fileId = crypto.randomBytes(16).toString('hex');
  store.putBlob(fileId, bytes);
  try {
    const row = store.update((next) => {
      requireAccount(next, actor);
      checkQuota(next, actor, bytes.length);
      const created = {
        file_id: fileId,
        account_id: actor.account_id,
        case_id: null,
        purpose: PURPOSE,
        document_type: input.document_type,
        document_kind: kind,
        original_filename: filename,
        content_type: type,
        stored_bytes: bytes.length,
        stored_blob: true,
        sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
        created_at: new Date().toISOString()
      };
      next.files.push(created);
      return created;
    });
    return publicDocument(row);
  } catch (error) {
    store.deleteBlob(fileId);
    throw error;
  }
}

/** Private failures never expose a disk path or digest in a consumer error. */
function verifiedBytes(store, row) {
  let bytes;
  try { bytes = store.readBlob(row.file_id); } catch { throw new ServiceError('SERVICE_STATE_UNAVAILABLE'); }
  const digest = crypto.createHash('sha256').update(bytes).digest('hex');
  if (row.stored_blob !== true || bytes.length !== row.stored_bytes || digest !== row.sha256) {
    throw new ServiceError('SERVICE_STATE_UNAVAILABLE');
  }
  return bytes;
}

function getDocument(store, actor, fileId) {
  const row = requireOwnedDocument(store, actor, fileId);
  return { document: publicDocument(row), bytes: verifiedBytes(store, row) };
}

function deleteDocument(store, actor, fileId) {
  requireOwnedDocument(store, actor, fileId);
  store.update((state) => {
    state.files = state.files.filter((row) => row.file_id !== fileId);
    return true;
  });
  return { deleted: true, file_id: fileId, blobs_removed: store.deleteBlob(fileId) ? 1 : 0 };
}

/** Internal approval material only: every selected document is owned and its current bytes match custody. */
function materialDocuments(store, actor, fileIds) {
  requireAccount(store.state(), actor);
  if (!Array.isArray(fileIds) || fileIds.length > MAX_ACCOUNT_DOCUMENTS ||
      fileIds.some((id) => typeof id !== 'string' || !/^[a-f0-9]{32}$/.test(id)) ||
      new Set(fileIds).size !== fileIds.length) throw new ServiceError('INVALID_REQUEST');
  return fileIds.slice().sort().map((id) => {
    const row = requireOwnedDocument(store, actor, id);
    verifiedBytes(store, row);
    return {
      file_id: row.file_id,
      sha256: row.sha256,
      document_type: row.document_type,
      document_kind: row.document_kind,
      original_filename: row.original_filename,
      content_type: row.content_type,
      stored_bytes: row.stored_bytes
    };
  });
}

module.exports = {
  listDocuments, receiveDocument, getDocument, deleteDocument, materialDocuments, rememberDates, preserveLegacyDates,
  PURPOSE, DOCUMENT_TYPES, MAX_ACCOUNT_DOCUMENTS, MAX_DOCUMENT_KIND_LENGTH,
  MAX_FILE_BYTES: uploads.MAX_FILE_BYTES,
  MAX_ACCOUNT_STORED_BYTES: uploads.MAX_ACCOUNT_STORED_BYTES
};
