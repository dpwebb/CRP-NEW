'use strict';

const { normalizeFactDate } = require('./evaluation-primitives.cjs');

const FIRST = ['tradeline.firstDelinquencyDate', 'collection.delinquencyDate'];
const PAYMENT = ['tradeline.lastPaymentDate', 'collection.lastPaymentDate'];

function governsAccountPeriod(adapter) {
  if (!adapter || typeof adapter !== 'object') return false;
  const fields = [adapter.anchor_field, ...(adapter.anchor_fields || [])].flat().filter(Boolean);
  // Closure and original-listing periods have their own explicitly defined
  // starting events. A payment date must never masquerade as either event.
  return adapter.period_years > 0 && fields.some(field => /^(tradeline|collection)\./.test(field)
    || field === 'reportedAccount.adverseRatingDate' && adapter.applicability_rule === 'ADVERSE_PAYMENT_RATING_ITEM_PRESENT');
}

// This selects a date; it never overwrites or relabels an extracted fact.
function determiningAnchor(facts, sources, preferredField, identity = {}) {
  facts = facts || {};
  const firstFields = FIRST.includes(preferredField) ? [preferredField, ...FIRST.filter(field => field !== preferredField)] : FIRST;
  for (const [fields, selection_rule] of [[firstFields, 'FIRST_DELINQUENCY_DATE'], [PAYMENT, 'DETERMINING_FALLBACK_DATE']]) {
    for (const field of fields) {
      const raw = facts[field];
      const source = sources && sources[field];
      if (sources && (!source || source.trusted === false || source.location?.trusted === false
        || identity.record_index != null && source.record_index != null && identity.record_index !== source.record_index
        || identity.source_file_id && source.location?.file_id && identity.source_file_id !== source.location.file_id
        || source.status && source.status !== 'RESOLVED' || source.reason
        || source.uncertainty?.reason || source.uncertainty?.status && source.uncertainty.status !== 'RESOLVED'
        || source.caption_count != null && source.caption_count !== 1
        || String(source.normalized_value) !== String(raw))) continue;
      const iso = normalizeFactDate(raw);
      const precision = source?.precision || facts[`${field}Precision`] || null;
      const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(String(raw || ''));
      if (!iso && !month) continue;
      return { field, iso: month ? String(raw) : iso, precision: month ? 'MONTH' : precision,
        value_as_supplied: raw, selection_rule, determining_fallback_date: selection_rule === 'DETERMINING_FALLBACK_DATE',
        date_label: selection_rule === 'DETERMINING_FALLBACK_DATE' ? 'Last payment date — determining fallback date' : 'Date of first delinquency',
        ...(source ? { source } : {}) };
    }
  }
  return null;
}

module.exports = { determiningAnchor, governsAccountPeriod };
