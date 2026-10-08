'use strict';

// Business names for display are separate from private account/member matching keys.
const crypto = require('node:crypto');
const { sourceForField } = require('./report-fact-sources.cjs');
const cachedReads = new WeakMap();
const DISPLAY_FIELDS = ['account.display_name', 'collection.agency'];

function ownSource(record, field) {
  const direct = record.fact_sources?.[field];
  if (direct?.record_index != null && direct.record_index !== record.record_index) return null;
  return sourceForField(record, field);
}

function identityFor(record) {
  if (!record) return null;
  const fields = /COLLECTION/.test(record.kind || '')
    ? ['collection.agency', 'account.display_name', 'account.reported_identity']
    : ['account.display_name', 'account.reported_identity'];
  for (const field of fields) {
    const source = ownSource(record, field);
    const value = record.facts?.[field];
    if (!source || source.privacy_redacted || typeof value !== 'string' || !value.trim()
      || /^(?:CREDITOR|MEMBER|MASK)-[a-f0-9]+$/i.test(value) || /^Account entry \d+$/i.test(value)) continue;
    return { name: value, source_field: source.source_field, raw_value: source.raw_value,
      location: source.location };
  }
  return null;
}

function identityForIssue(issue, extraction) {
  const indexes = [issue.record_index];
  if (issue.check_id === 'COMMON-ERROR-DUPLICATE-REPORTING') indexes.push(issue.evidence?.duplicate_of_record);
  if (issue.check_id === 'COMMON-ERROR-RESPONSIBILITY-INCONSISTENCY') indexes.push(issue.evidence?.other_record);
  if (issue.check_id === 'COMMON-ERROR-COLLECTION-ORIGINAL-BOTH-DUE') indexes.push(issue.evidence?.original_record);
  const recordIndexes = [...new Set(indexes.filter(index => index != null))].sort((a, b) => a - b);
  const entries = recordIndexes
    .flatMap(index => {
      const name = identityFor(extraction?.records?.find(record => record.record_index === index));
      return name ? [{ ...name, record_index: index }] : [];
    });
  if (!entries.length) return null;
  if (recordIndexes.length === 1) return entries[0];
  const name = recordIndexes.map(index => entries.find(entry => entry.record_index === index)?.name
    || `${extraction?.records?.find(record => record.record_index === index)?.kind_label || 'report entry'} ${index}`).join(' / ');
  return { name, source_field: 'Account entry names',
    raw_value: null, location: null, entries };
}

function sameRecord(old, fresh) {
  const a = old.boundary || old.location, b = fresh.boundary || fresh.location;
  if (!a || !b || a.trusted === false || b.trusted === false || old.location?.trusted === false
    || a.page !== b.page || a.line !== b.line || old.kind !== fresh.kind) return false;
  let bound = false;
  for (const field of ['account.reported_identity', 'account.masked_identifier']) {
    if (old.facts?.[field] == null) continue;
    if (!ownSource(old, field) || !ownSource(fresh, field)
      || old.facts[field] !== fresh.facts[field]) return false;
    bound = true;
  }
  if (!bound) {
    for (const field of ['tradeline.lastPaymentDate', 'tradeline.firstDelinquencyDate', 'account.balance', 'account.amount']) {
      const source = ownSource(old, field), current = ownSource(fresh, field);
      if (source && current && old.facts[field] === fresh.facts[field]
        && source.location.page === current.location.page && source.location.line === current.location.line) bound = true;
    }
  }
  return bound;
}

// Older PR-01 extractions kept only name hashes. Read the owned original for display
// names alone; never replace its assessed facts, findings or historical result.
function freshNames(store, file) {
  if (!file || file.demonstration || file.presentation_id !== 'PR-01'
    || !file.supported_format || !file.stored_sha256 || !store.readBlob) return null;
  try {
    const bytes = store.readBlob(file.file_id);
    const digest = crypto.createHash('sha256').update(bytes).digest('hex');
    if (digest.toLowerCase() !== String(file.stored_sha256).toLowerCase() || bytes.length !== file.stored_bytes) return null;
    let cache = cachedReads.get(store);
    if (!cache) { cache = new Map(); cachedReads.set(store, cache); }
    const key = file.file_id + ':' + digest;
    if (!cache.has(key)) {
      const formats = require('./formats.cjs');
      const model = formats.buildPdfDocumentModel(store.blobPath(file.file_id));
      const fresh = formats.extractWithSharedAdapter(model, { mode: 'REPORT', country: 'CA' });
      cache.set(key, fresh.admission?.admitted && fresh.presentation_id === 'PR-01' ? fresh : null);
    }
    return cache.get(key);
  } catch { return null; }
}

function extractionForFiles(store, extraction, files) {
  const missingName = record => !identityFor(record) && !DISPLAY_FIELDS.some(field =>
    Object.hasOwn(record.facts || {}, field) || Object.hasOwn(record.fact_sources || {}, field));
  if (!extraction?.records?.some(missingName)) return extraction;
  let changed = false;
  const records = extraction.records.map(record => {
    if (!missingName(record)) return record;
    const file = record.source_file_id
      ? files.find(file => file.file_id === record.source_file_id)
      : files.length === 1 ? files[0] : null;
    const fresh = freshNames(store, file);
    const matches = (fresh?.records || []).filter(row => sameRecord(record, row));
    if (matches.length !== 1 || !identityFor(matches[0])) return record;
    const facts = { ...record.facts }, fact_sources = { ...record.fact_sources };
    for (const field of DISPLAY_FIELDS) {
      const source = ownSource(matches[0], field);
      if (!source || source.privacy_redacted) continue;
      facts[field] = matches[0].facts[field];
      fact_sources[field] = { ...source, caption_count: 1, record_index: record.record_index,
        location: { ...source.location, file_id: file.file_id } };
      changed = true;
    }
    return { ...record, facts, fact_sources };
  });
  return changed ? { ...extraction, records } : extraction;
}

function resultRow(store, row) {
  if (!row) return row;
  const ids = row.file_ids || [row.file_id];
  const files = (store.state().files || []).filter(file => ids.includes(file.file_id)
    && file.case_id === row.case_id && file.account_id === row.account_id);
  const extraction = extractionForFiles(store, row.extraction, files);
  return extraction === row.extraction ? row : { ...row, extraction };
}

module.exports = { identityFor, identityForIssue, extractionForFiles, resultRow };
