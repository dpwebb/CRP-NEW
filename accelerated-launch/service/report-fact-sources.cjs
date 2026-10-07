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
  'tradeline.lastPaymentDate': /last.*payment/i,
  'tradeline.firstDelinquencyDate': /first.*delinquen/i
});

function reportReference(record) {
  const date = record && record.report_reference_date;
  if (!date || date.status && date.status !== 'RESOLVED') return null;
  if (date.trusted === false || date.location && date.location.trusted === false) return null;
  if (date.raw_value != null && date.raw != null && date.raw_value !== date.raw
    || date.normalized_value != null && date.normalized != null && date.normalized_value !== date.normalized) return null;
  const raw = date.raw_value ?? date.raw;
  const normalized = date.normalized_value ?? date.normalized;
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
  if (value == null || !label) return null;
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
      precision: direct.precision || direct.uncertainty && direct.uncertainty.precision || record.facts[`${field}Precision`] || null };
  }
  const printed = record.printed || {};
  const reading = Object.entries(printed).find(([key, p]) => p && (field === 'account.amount'
    ? label.test(key) : label.test(`${key} ${p.label || ''}`))
    && p.raw != null && p.location && p.location.trusted !== false && p.trusted !== false
    && (!p.status || p.status === 'RESOLVED') && !p.reason
    && String(p.normalized) === String(value));
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

module.exports = { sourceForField, reportReference };
