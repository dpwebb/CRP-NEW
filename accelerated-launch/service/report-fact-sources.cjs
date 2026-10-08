'use strict';

/* Exact per-field report readings shared by checklist assessment and historical anchors. */
const PRINTED_LABEL = Object.freeze({
  'account.status': /status/i,
  'liability.closedDate': /clos(?:ed|ure).*date|date.*clos/i,
  'liability.openedDate': /open(?:ed|ing)?.*date|date.*open/i,
  'reportedAccount.dateOpened': /open(?:ed|ing)?.*date|date.*open/i,
  'reportedAccount.firstReported': /first.*report|report.*first/i,
  'account.balance': /balance/i,
  'account.type': /account.*type|type.*account/i,
  'account.amount': /^(?:account\.amount|amount|balance)$/i,
  'account.creditLimit': /credit.*limit|limit.*credit/i,
  'account.masked_identifier': /account.*number|masked.*identifier/i,
  'account.reported_identity': /creditor|lender|account.*name|reported.*identity/i,
  'account.responsibility': /responsib|ownership/i,
  'account.pastDueAmount': /past.?due/i,
  'account.paymentAmount': /payment.*amount|monthly.*payment|scheduled.*payment/i,
  'tradeline.lastPaymentDate': /last.*payment/i,
  'tradeline.firstDelinquencyDate': /first.*delinquen/i
});

// Shared date identities must respect the same explicit reading rejection as rule evidence.
// Legacy line-only readings remain supported; physical readers enforce their own geometry.
function reportDateValue(date) {
  if (!date || date.status && date.status !== 'RESOLVED') return null;
  if (date.trusted === false || date.location && date.location.trusted === false || date.reason
    || date.uncertainty && (date.uncertainty.reason
      || date.uncertainty.status && date.uncertainty.status !== 'RESOLVED')) return null;
  if (date.raw_value != null && date.raw != null && date.raw_value !== date.raw
    || date.normalized_value != null && date.normalized != null && date.normalized_value !== date.normalized) return null;
  return date.normalized_value ?? date.normalized ?? null;
}

function reportReference(record) {
  const date = record && record.report_reference_date;
  const normalized = reportDateValue(date);
  if (!normalized) return null;
  if (record.source_file_id && date.location?.file_id && record.source_file_id !== date.location.file_id) return null;
  const raw = date.raw_value ?? date.raw;
  return raw != null && normalized && date.location
    ? { ...date, raw_value: raw, normalized_value: normalized } : null;
}

function sourceForField(record, field) {
  if (field === 'report.referenceDate') {
    const date = reportReference(record);
    if (!date) return null;
    return { raw_value: date.raw_value, normalized_value: date.normalized_value,
      location: date.location, source_field: date.source_field || 'Report date',
      record_index: record.record_index, precision: date.precision || null };
  }
  const value = record.facts && record.facts[field];
  const label = PRINTED_LABEL[field];
  if (value == null) return null;
  // A reader's exact field association is authoritative, including an explicit unreadable/duplicate reading.
  if (record.fact_sources && Object.hasOwn(record.fact_sources, field)) {
    const direct = record.fact_sources[field];
    if (!direct || direct.raw_value == null || !direct.location || direct.location.trusted === false
      || direct.trusted === false || direct.status && direct.status !== 'RESOLVED' || direct.reason
      || direct.uncertainty && (direct.uncertainty.status && direct.uncertainty.status !== 'RESOLVED' || direct.uncertainty.reason)
      || direct.caption_count != null && direct.caption_count !== 1
      || String(direct.normalized_value) !== String(value)
      || record.source_file_id && direct.location.file_id && record.source_file_id !== direct.location.file_id) return null;
    return { raw_value: direct.raw_value, normalized_value: value, location: direct.location,
      source_field: direct.source_field || field, record_index: record.record_index,
      ...(direct.privacy_redacted ? { privacy_redacted: true } : {}),
      precision: direct.precision || direct.uncertainty && direct.uncertainty.precision || record.facts[`${field}Precision`] || null };
  }
  if (!label) return null;
  const printed = record.printed || {};
  const readings = Object.entries(printed).filter(([key, p]) => p && (field === 'account.amount'
    ? label.test(key) : label.test(`${key} ${p.label || ''}`))
    && p.raw != null && p.location && p.location.trusted !== false && p.trusted !== false
    && (!p.status || p.status === 'RESOLVED') && !p.reason
    && String(p.normalized) === String(value));
  const reading = readings.find(([key]) => key === field) || readings[0];
  if (reading) {
    return { raw_value: reading[1].raw, normalized_value: value, location: reading[1].location,
      source_field: reading[1].label || reading[0], record_index: record.record_index,
      precision: reading[1].precision || record.facts[`${field}Precision`] || null };
  }
  /* The TU-CA table keeps numeric cell readings in its own row rather than the caption map. Use
     that row's raw cell and location; never substitute the account block's aggregate raw text. */
  const cell = field === 'account.balance' ? 'balance'
    : field === 'account.pastDueAmount' ? 'past_due' : null;
  const row = cell && Array.isArray(record.monthly_rows) ? record.monthly_rows[0] : null;
  const raw = row && row.cells ? row.cells[cell] : null;
  if (raw == null || !row.location) return null;
  const number = Number(String(raw).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(number) && number === value
    ? { raw_value: raw, normalized_value: value, location: row.location,
      source_field: cell, record_index: record.record_index } : null;
}

// Positioned history keeps the report's own key separate from the cell's interpreted meaning.
// Recheck that association whenever a stored result is assessed or an approved packet is downloaded.
function validatedPrintedHistoryDefinition(cell) {
  const definition = cell && cell.printed_definition;
  if (!definition || definition.trusted !== true || definition.performance_usable === false
    || definition.code !== cell.code || definition.meaning !== cell.meaning || !definition.location
    || !cell.location || cell.location.trusted === false || !cell.period_location) return null;
  const normalized = (value) => String(value ?? '').trim().replace(/\s+/g, ' ').toUpperCase();
  if (normalized(cell.raw_code || cell.location.raw) !== normalized(cell.code)) return null;
  const month = cell.period_location.month, year = cell.period_location.year;
  if (!month?.raw || normalized(cell.raw_period) !== normalized(month.raw)
    && normalized(cell.raw_period) !== normalized(month.raw + ' ' + (year?.raw || ''))) return null;
  if (normalized(cell.period) !== normalized(year ? month.raw + ' ' + year.raw : month.raw)) return null;
  if (definition.code_location || definition.meaning_location) {
    if (normalized(definition.code_location?.raw) !== normalized(definition.code)
      || normalized(definition.meaning_location?.raw) !== normalized(definition.meaning)) return null;
  } else {
    const escape = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pair = new RegExp('(?:^|\\s)' + escape(definition.code) + '\\s*=\\s*'
      + escape(definition.meaning) + '(?=\\s+[A-Z0-9]{1,4}\\s*=|\\s*$)', 'i');
    if (!pair.test(definition.location.raw || '')) return null;
  }
  const locations = [definition.location, definition.code_location, definition.meaning_location,
    definition.heading_location, cell.row_label_location, ...Object.values(cell.period_location)].filter(Boolean);
  if (locations.some((loc) => loc.trusted === false || loc.page !== cell.location.page
    || loc.file_id && cell.location.file_id && loc.file_id !== cell.location.file_id)) return null;
  if ((definition.alternatives || []).some((entry) => entry.trusted !== true
    || normalized(entry.code) !== normalized(definition.code)
    || normalized(entry.meaning) !== normalized(definition.meaning) || entry.location?.trusted === false)) return null;
  return definition;
}

// With no usable date, only the same physical report/segment establishes a shared snapshot.
// Rejected dates on separate uploads must never collapse into one empty-date snapshot.
function reportSnapshotKey(record) {
  const bureau = record.source_bureau || record.bureau || '';
  const date = Object.hasOwn(record, 'report_reference_date')
    ? reportReference(record)?.normalized_value : record.source_report_reference_date;
  const ownSource = record.source_report_segment_id || record.source_file_id;
  return `${bureau}|${date || (ownSource ? `SOURCE:${ownSource}` : '')}`;
}

function requiresPrintedHistoryDefinition(cell) {
  return Boolean(cell && (Object.hasOwn(cell, 'printed_definition') || /^Rating:?$/i.test(cell.source_field || '')));
}

module.exports = { sourceForField, reportReference, reportDateValue, reportSnapshotKey, validatedPrintedHistoryDefinition, requiresPrintedHistoryDefinition };
