'use strict';
/**
 * uploads.cjs — private local upload: metadata validation, supported-format detection and extraction.
 *
 * OWNER-ALL82-001 / B2. REUSE LEDGER: the metadata gate is a PORT of the legacy ingestion gate in
 * `packages/backend/src/services/reportStore.ts` (`MAX_FILE_BYTES`, `ALLOWED_MIME_PREFIXES`, the extension
 * allowlist and the empty-file refusal). `tests/sections/h-legacy-parity.cjs` reads that source read-only and
 * fails if our values drift or if we become more permissive than it was.
 *
 * Two further boundaries:
 *   • A FILE NAME IS METADATA, NOT AN INPUT. Only the basename is kept, it is never used to build a path,
 *     and it never influences validation, detection or evaluation. Byte storage is keyed by an opaque
 *     internal id (legacy `reportStore.ts` rule).
 *   • BYTES STAY OUTSIDE THE REPOSITORY. `PrivateStore` refuses a data directory inside the checkout, and
 *     case deletion removes the blob.
 */

const crypto = require('node:crypto');
const path = require('node:path');
const { ServiceError } = require('./errors.cjs');
const formats = require('./formats.cjs');

/** Legacy parity constants. Change these only with the legacy source in front of you. B6-INGEST-003 adds the
 *  image types as an owner-authorized extension of the PDF gate, kept separate from the legacy allowlist. */
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const SUPPORTED_MIME_PREFIXES = Object.freeze(['application/pdf', 'image/png', 'image/jpeg']);
const SUPPORTED_EXTENSIONS = Object.freeze(['.pdf', '.png', '.jpg', '.jpeg']);
const PDF_MAGIC = Buffer.from('%PDF-', 'ascii');
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff]);
const BASE64 = /^[A-Za-z0-9+/]*={0,2}$/;

/** Which container a byte buffer is: PDF, image (PNG/JPEG), or neither. */
function detectContainerFromBytes(bytes) {
  if (!bytes || bytes.length < 4) return 'OTHER';
  if (bytes.subarray(0, PDF_MAGIC.length).equals(PDF_MAGIC)) return 'PDF';
  if (bytes.subarray(0, PNG_MAGIC.length).equals(PNG_MAGIC)) return 'IMAGE';
  if (bytes.subarray(0, JPEG_MAGIC.length).equals(JPEG_MAGIC)) return 'IMAGE';
  return 'OTHER';
}

/**
 * B4: a per-file limit is not a storage limit. These two caps bound what one case and one account may hold, so
 * an authenticated consumer cannot fill the operator's disk with a loop of valid uploads.
 */
const MAX_CASE_FILES = 8;
const MAX_ACCOUNT_STORED_BYTES = 40 * 1024 * 1024;

/**
 * Refuse BEFORE anything is written when the case or the account is already at its cap.
 *
 * `receiveReport` is fully synchronous from this check to `putBlob`, and Node runs one JavaScript frame at a
 * time, so two concurrent requests cannot both pass this check and then both store: the interleaving this
 * would need is impossible without an await between the check and the write, and there is none.
 */
function refuseIfOverQuota(store, actor, caseRow, incomingBytes) {
  const state = store.state();
  const caseFiles = state.files.filter((f) => f.case_id === caseRow.case_id);
  if (caseFiles.length >= MAX_CASE_FILES) {
    throw new ServiceError('FILE_COUNT_LIMIT_REACHED', { limit: MAX_CASE_FILES, held: caseFiles.length });
  }
  const held = state.files
    .filter((f) => f.account_id === actor.account_id)
    .reduce((total, f) => total + (Number(f.stored_bytes) || 0), 0);
  if (held + incomingBytes > MAX_ACCOUNT_STORED_BYTES) {
    throw new ServiceError('ACCOUNT_STORAGE_QUOTA_EXCEEDED', { limit: MAX_ACCOUNT_STORED_BYTES, held });
  }
  return { case_files_held: caseFiles.length, account_bytes_held: held };
}

/**
 * Deterministic metadata validation. Declared type, extension sanity and declared size — the same three the
 * legacy gate checked, with a narrower allowlist.
 */
function validateUploadMeta(input) {
  const opts = input || {};
  const checks = [];
  const push = (id, passed, detail) => checks.push({ id, passed, detail });

  const declaredBytes = opts.declaredBytes;
  if (declaredBytes !== undefined && declaredBytes !== null) {
    const sizeOk = Number.isInteger(declaredBytes) && declaredBytes > 0 && declaredBytes <= MAX_FILE_BYTES;
    push('DECLARED_SIZE_WITHIN_LIMIT', sizeOk, `declared ${declaredBytes} bytes, limit ${MAX_FILE_BYTES}`);
    if (!sizeOk) return { ok: false, code: declaredBytes > MAX_FILE_BYTES ? 'FILE_TOO_LARGE' : 'EMPTY_FILE', checks };
  } else {
    push('DECLARED_SIZE_WITHIN_LIMIT', true, 'not declared; byte count is enforced after decoding');
  }

  const mime = typeof opts.mimeType === 'string' ? opts.mimeType.toLowerCase().split(';')[0].trim() : '';
  if (mime) {
    const allowed = SUPPORTED_MIME_PREFIXES.some((p) => mime === p);
    push('DECLARED_TYPE_IS_SUPPORTED', allowed, `declared type ${mime}`);
    if (!allowed) return { ok: false, code: 'UNSUPPORTED_FILE_TYPE', checks };
  } else {
    push('DECLARED_TYPE_IS_SUPPORTED', true, 'not declared; the container is detected from the bytes');
  }

  if (opts.originalFilename) {
    const ext = path.extname(String(opts.originalFilename)).toLowerCase();
    const allowed = SUPPORTED_EXTENSIONS.includes(ext);
    push('FILE_EXTENSION_IS_SUPPORTED', allowed, `extension ${ext || '(none)'}`);
    if (!allowed) return { ok: false, code: 'UNSUPPORTED_FILE_EXTENSION', checks };
  } else {
    push('FILE_EXTENSION_IS_SUPPORTED', true, 'not declared');
  }

  return { ok: true, code: null, checks };
}

function decodeUploadBody(input) {
  const base64 = input && typeof input.contentBase64 === 'string' ? input.contentBase64.replace(/\s+/g, '') : '';
  if (!base64 || !BASE64.test(base64)) throw new ServiceError('MALFORMED_UPLOAD_BODY');
  const bytes = Buffer.from(base64, 'base64');
  if (!bytes.length) throw new ServiceError('EMPTY_FILE');
  if (bytes.length > MAX_FILE_BYTES) throw new ServiceError('FILE_TOO_LARGE');
  return bytes;
}

/** The consumer's own file name, reduced to a name and nothing else. It is never used to build a path. */
function safeFilename(value) {
  if (typeof value !== 'string' || !value.trim()) return 'upload.pdf';
  return path.basename(value.trim()).slice(0, 120);
}

/** Store the bytes under an opaque internal id. Returns the id. */
function storeBytes(store, bytes) {
  const fileId = crypto.randomBytes(16).toString('hex');
  store.putBlob(fileId, bytes);
  return fileId;
}

/**
 * Receive, validate, detect and extract one uploaded report.
 *
 * A metadata refusal or a non-PDF container is refused BEFORE anything is stored: nothing is written and no
 * bytes are retained. A PDF that is simply not the evidenced specimen IS stored and then refused by the
 * admission gate, so the refusal can name the measured shape of the document rather than guess.
 */

// Bound decoded image work as well as compressed bytes, before storage or OCR.
function validateImageDimensions(bytes) {
  let width = 0, height = 0;
  if (bytes.subarray(0, PNG_MAGIC.length).equals(PNG_MAGIC) && bytes.length >= 24) {
    width = bytes.readUInt32BE(16); height = bytes.readUInt32BE(20);
  } else if (bytes.subarray(0, 3).equals(JPEG_MAGIC)) {
    let i = 2;
    while (i + 4 <= bytes.length) {
      if (bytes[i] !== 0xff) { i++; continue; }
      const marker = bytes[i + 1];
      if (marker === 0xda || marker === 0xd9) break;
      if (marker === 0xd8 || marker === 0x01 || marker >= 0xd0 && marker <= 0xd7) { i += 2; continue; }
      const length = bytes.readUInt16BE(i + 2);
      if (length < 2 || i + 2 + length > bytes.length) break;
      if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker) && length >= 7) {
        height = bytes.readUInt16BE(i + 5); width = bytes.readUInt16BE(i + 7); break;
      }
      i += length + 2;
    }
  }
  if (!width || !height) throw new ServiceError('UNSUPPORTED_FILE_TYPE');
  if (width > 12000 || height > 12000 || width * height > 25000000) throw new ServiceError('IMAGE_DIMENSIONS_TOO_LARGE');
}

/** Rebuild the upload receipt from an already-stored row (retry of the same uploadKey and bytes), so a lost
 *  response never causes a duplicate file or a second quota draw. The stored `receipt_detection` already
 *  carries the encryption result, so no re-extraction is performed. */
function receiptFor(row, detection) {
  return {
    file_id: row.file_id,
    original_filename: row.original_filename,
    stored_bytes: row.stored_bytes,
    upload_gate: row.upload_gate,
    format_detection: {
      container: row.container,
      supported: row.supported_format,
      presentation_id: row.presentation_id,
      read_support_is: detection.admission_path,
      refusal_reason: row.refusal_reason,
      predicates: row.format_predicates,
      family_predicates: detection.family_predicates,
      refusals: detection.refusals,
      refusal_selection_rule: detection.refusal_selection_rule || null,
      encryption: detection.encryption
    },
    extraction_summary: {
      extraction_ran: row.extraction.extraction_ran,
      presentation_evidence: row.extraction.presentation_evidence,
      support: row.extraction.support,
      reference_date_read: Boolean(row.extraction.reference_date && row.extraction.reference_date.status === 'RESOLVED'),
      accounts_read: row.extraction.records.length,
      accounts_with_readable_date: row.extraction.records.filter((r) => r.status === 'RESOLVED').length,
      result_status: row.extraction.summary.status
    }
  };
}

function receiveReport(store, actor, caseRow, input) {
  if (!formats.formatsForCountry(caseRow.country).length) {
    throw new ServiceError('PRESENTATION_NOT_AVAILABLE_FOR_SELECTED_JURISDICTION');
  }

  const meta = validateUploadMeta(input);
  if (!meta.ok) throw new ServiceError(meta.code, meta.checks);

  const bytes = decodeUploadBody(input);
  const container = detectContainerFromBytes(bytes);
  if (container === 'OTHER') throw new ServiceError('NOT_A_PDF_CONTAINER');

  // A retry after a lost response reuses the original receipt, before quota checks.
  const uploadKey = input && input.uploadKey;
  if (uploadKey !== undefined && !/^[a-zA-Z0-9-]{16,80}$/.test(uploadKey)) throw new ServiceError('INVALID_REQUEST');
  const digest = crypto.createHash('sha256').update(bytes).digest('hex');
  const existing = uploadKey && store.state().files.find(f => f.case_id === caseRow.case_id && f.account_id === actor.account_id && f.upload_key === uploadKey);
  if (existing) {
    if (existing.stored_sha256 !== digest) throw new ServiceError('INVALID_REQUEST');
    return receiptFor(existing, existing.receipt_detection);
  }

  if (container === 'IMAGE') validateImageDimensions(bytes);

  /* B4: the caps are checked before the first byte is written, so a refused upload retains nothing. */
  const quota = refuseIfOverQuota(store, actor, caseRow, bytes.length);

  const fileId = storeBytes(store, bytes);
  const blobPath = store.blobPath(fileId);
  const model = container === 'IMAGE'
    ? formats.buildImageDocumentModel(blobPath)
    : formats.buildPdfDocumentModel(blobPath);
  const detection = formats.detectSupportedFormat(model, { country: caseRow.country });
  const extraction = formats.extractWithSharedAdapter(model, { mode: 'REPORT', country: caseRow.country });

  /* B6-INGEST-002: the receipt's supported/refusal come from the EXTRACTION, which is authoritative for the
     general path (an image-only admit may be downgraded to UNREADABLE/UNRELATED once OCR runs). */
  const admitted = Boolean(extraction.admission && extraction.admission.admitted === true);
  const effectiveRefusal = admitted ? null : (extraction.refusal ? extraction.refusal.reason : detection.refusal_reason);

  const row = store.update((state) => {
    const created = {
      file_id: fileId,
      upload_key: uploadKey || null,
      receipt_detection: { ...detection, encryption: formats.detectEncryption(model) },
      case_id: caseRow.case_id,
      account_id: actor.account_id,
      original_filename: safeFilename(input && input.originalFilename),
      stored_bytes: bytes.length,
      /* GAP-INGEST-001: a content hash lets the multi-file assembly recognise the SAME page uploaded twice
         (an exact byte-for-byte duplicate) and not count its records as duplicate debts. It is never a
         filename and never leaves the case as a consumer-visible identifier. */
      stored_sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
      upload_gate: { state: 'ACCEPTED_BY_UPLOAD_GATE', checks: meta.checks },
      quota_at_acceptance: quota,
      container: detection.container,
      supported_format: admitted,
      presentation_id: admitted ? extraction.presentation_id : null,
      format_predicates: detection.predicates,
      refusal_reason: effectiveRefusal,
      extraction,
      created_at: new Date().toISOString()
    };
    state.files.push(created);
    return created;
  });

  return {
    file_id: row.file_id,
    original_filename: row.original_filename,
    stored_bytes: row.stored_bytes,
    upload_gate: row.upload_gate,
    format_detection: {
      container: row.container,
      supported: row.supported_format,
      presentation_id: row.presentation_id,
      read_support_is: detection.admission_path,
      refusal_reason: row.refusal_reason,
      predicates: row.format_predicates,
      family_predicates: detection.family_predicates,
      /* B4 continuation: EVERY admission path's refusal is reported on the receipt, including the ones that
         refused while another path admitted the file. A receipt that says "admitted by structure" and drops the
         fact that the pinned-specimen gate refused the same bytes would be telling half the story. */
      refusals: detection.refusals,
      refusal_selection_rule: detection.refusal_selection_rule || null,
      encryption: formats.detectEncryption(model)
    },
    extraction_summary: {
      extraction_ran: extraction.extraction_ran,
      presentation_evidence: extraction.presentation_evidence,
      support: extraction.support,
      reference_date_read: Boolean(extraction.reference_date && extraction.reference_date.status === 'RESOLVED'),
      accounts_read: extraction.records.length,
      accounts_with_readable_date: extraction.records.filter((r) => r.status === 'RESOLVED').length,
      result_status: extraction.summary.status
    }
  };
}

/** GAP-INGEST-010: the one place the upload limits are described, so the server and the consumer surface read
 *  the same statement. */
function uploadLimits() {
  return {
    max_file_bytes: MAX_FILE_BYTES,
    max_case_files: MAX_CASE_FILES,
    max_account_stored_bytes: MAX_ACCOUNT_STORED_BYTES,
    supported_mime_prefixes: SUPPORTED_MIME_PREFIXES.slice(),
    supported_extensions: SUPPORTED_EXTENSIONS.slice(),
    max_image_pixels: 25000000,
    max_image_dimension: 12000,
    max_scanned_pdf_pages: require('./ocr/local-ocr.cjs').MAX_OCR_PAGES,

    unsupported_containers: ['HEIC', 'HEIF', 'TIFF', 'ZIP'],
    recovery: 'Export HEIC/HEIF or TIFF images as PNG/JPEG, or combine pages into a PDF. ZIP archives are not accepted. Scanned PDFs are read up to 40 pages per file; split longer scans into parts of at most 40 pages. For files over 10 MB, export a smaller readable PDF or split at page boundaries into parts under 10 MB; keep every page in order and preserve the printed report header/reference date with each part. Combine screenshot pages into a PDF if more than 8 files are needed. Check the saved file list after an interrupted upload; retry pending files only. Delete an unneeded case to free account storage.',
    guidance: 'One case holds at most 8 files and one account at most 40 MB; a single file is at most 10 MB. PDF, PNG and JPEG are supported. A refused or interrupted upload is never reported as a complete review.'
  };
}

module.exports = {
  MAX_FILE_BYTES,
  MAX_CASE_FILES,
  MAX_ACCOUNT_STORED_BYTES,
  SUPPORTED_MIME_PREFIXES,
  SUPPORTED_EXTENSIONS,
  uploadLimits,
  PDF_MAGIC,
  PNG_MAGIC,
  JPEG_MAGIC,
  detectContainerFromBytes,
  validateUploadMeta,
  decodeUploadBody,
  safeFilename,
  refuseIfOverQuota,
  validateImageDimensions,
  receiptFor,
  receiveReport,
  formats
};
