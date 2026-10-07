'use strict';

// Reviewed issuer definitions are external evidence, never a legend invented on the report.
// Capture: SOURCE_CAPTURES/READER-CODE-DEFINITIONS-2026-10-07/experian-us-consumer-report-code-guide.html
const SOURCE = Object.freeze({
  publisher: 'Experian',
  title: 'Understanding Your Experian Credit Report',
  url: 'https://www.experian.com/blogs/ask-experian/credit-education/report-basics/understanding-your-experian-credit-report/',
  section: 'Payment History',
  published_date: '2024-06-10',
  version: '2024-06-10/captured-2026-10-07',
  retrieved_on: '2026-10-07',
  sha256: 'dbf4096a4ed96a37dc54c8167de4956fa5776934b0a49d4d05d3dac82210d131',
  source_kind: 'EXTERNAL_REPORT_CODE_DEFINITION'
});
const MEANINGS = Object.freeze({ OK: 'Current, terms met',
  '30': '30 days past due', '60': '60 days past due', '90': '90 days past due',
  '120': '120 days past due', '150': '150 days past due', '180': '180 days past due',
  ND: 'No data for this period', '-': 'No data for this period' });

function definitionForCode(code) {
  if (!Object.hasOwn(MEANINGS, code)) return null;
  return { code, meaning: MEANINGS[code], performance_usable: code !== 'ND' && code !== '-', source: { ...SOURCE } };
}

function validatedDefinition(cell, record) {
  if (record && record.reader_family_id === 'FAM-GB-EXP-CONSUMER') return validatedGbDefinition(cell, record);
  if (!record || record.reader_family_id !== 'FAM-US-EXP-CONSUMER'
    || record.source_bureau && record.source_bureau !== 'Experian') return null;
  const expected = definitionForCode(cell && cell.code);
  const actual = cell && cell.code_definition;
  if (!cell || cell.location?.trusted !== true || cell.period_location?.month?.trusted !== true
    || cell.period_location?.year?.trusted !== true || cell.uncertain || cell.reason) return null;
  if (typeof cell.raw_code !== 'string' || cell.raw_code.toUpperCase() !== cell.code) return null;
  if (!expected || !actual || actual.code !== expected.code || actual.meaning !== expected.meaning
    || cell.meaning !== expected.meaning || cell.performance_usable !== expected.performance_usable
    || actual.performance_usable !== expected.performance_usable
    || !actual.source || Object.keys(SOURCE).some((key) => actual.source[key] !== SOURCE[key])) return null;
  return expected;
}

// The guide defines meanings and monthly ordering; it is not admitted as a consumer report.
const GB_SOURCE = Object.freeze({
  publisher: 'Experian', title: 'Understanding your Experian Credit Report and Credit Score',
  url: 'https://www.experian.co.uk/content/dam/noindex/uki/uk/cais/Experian-Credit-Report-guide.pdf',
  section: 'What do the status codes mean? (page 12)',
  version: 'PDF modified 2020-06-17/captured-2026-10-07', retrieved_on: '2026-10-07',
  sha256: '0e4ea5438d4742c10f1f13a4b13a858924c680e74ad1d677cad4e4da63b90170',
  source_kind: 'EXTERNAL_REPORT_CODE_DEFINITION'
});
const GB_CAIS_SOURCE = Object.freeze({
  publisher: 'Experian', title: 'CAIS - FAQ', url: 'https://www.experian.co.uk/cais/faqs',
  section: 'How should the CAIS account status codes be used?', version: 'captured-2026-10-07',
  retrieved_on: '2026-10-07', sha256: '9f29067e83b7e5eaaa1534103660eb5754d05725272b4fcd07f9f604743b52e0',
  source_kind: 'EXTERNAL_REPORT_CODE_DEFINITION'
});
const GB_GENERAL = Object.freeze({ '0': 'Up to date or less than one payment overdue', '1': 'Up to one month late',
  '2': 'Up to two months late', '3': 'Up to three months late', '4': 'Up to four months late',
  '5': 'Up to five months late', '6': 'Six or more months late',
  D: 'Dormant; no payment history provided', U: 'Unclassified for this month', '8': 'Default' });
const GB_CURRENT = Object.freeze({ '0': 'Within account terms',
  '1': 'Account outside terms for one to two months', '2': 'Account outside terms for two to three months',
  '3': 'Account outside terms for more than three months',
  '4': 'Repayment arrangement to bring account into order',
  '5': 'Repayment arrangement to bring account into order',
  '6': 'Repayment arrangement to bring account into order',
  '8': 'Defaulted current account', U: 'New or unused current account', D: GB_GENERAL.D });

function gbDefinitionForCode(code, accountType) {
  if (!['CURRENT ACCOUNT', 'CREDIT CARD', 'LOAN', 'RENTAL'].includes(accountType)) return null;
  const meanings = accountType === 'CURRENT ACCOUNT' ? GB_CURRENT : GB_GENERAL;
  if (!Object.hasOwn(meanings, code)) return null;
  return { code, meaning: meanings[code], account_type: accountType,
    performance_usable: /^[0-6]$/.test(code), source: { ...GB_SOURCE,
      ...(accountType === 'CURRENT ACCOUNT' && code !== 'D'
        ? { section: 'How are status codes used on current accounts? (page 19)' } : {}),
      ...(accountType !== 'CURRENT ACCOUNT' && code === '0' ? GB_CAIS_SOURCE : {}) } };
}

function gbPeriodDefinition() {
  return { order: 'MOST_RECENT_FIRST', interval: 'CALENDAR_MONTH',
    source: { ...GB_SOURCE, source_kind: 'EXTERNAL_REPORT_PERIOD_DEFINITION' } };
}

function gbPeriodAt(anchor, ordinal) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(anchor)) || !Number.isInteger(ordinal) || ordinal < 1 || ordinal > 12) return null;
  const [year, month, day] = anchor.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  const period = new Date(Date.UTC(year, month - ordinal, 1));
  return `${period.getUTCFullYear()}-${String(period.getUTCMonth() + 1).padStart(2, '0')}`;
}

function sameSource(actual, expected) {
  return actual && Object.keys(expected).every((key) => actual[key] === expected[key]);
}

function validatedGbDefinition(cell, record) {
  if (record.source_bureau && record.source_bureau !== 'Experian') return null;
  const type = record.printed?.['account.type'];
  if (!type || type.raw !== record.facts?.['account.type'] || type.location?.trusted !== true
    || type.state !== 'VALUE' || type.reason || type.printed_times_in_record !== 1) return null;
  const expected = gbDefinitionForCode(cell?.code, record.facts?.['account.type']);
  const actual = cell?.code_definition;
  if (!expected || !actual || cell.uncertain || cell.reason || cell.location?.trusted !== true
    || cell.raw_code !== cell.code || actual.code !== expected.code || actual.meaning !== expected.meaning
    || cell.meaning !== expected.meaning || cell.performance_usable !== expected.performance_usable
    || actual.performance_usable !== expected.performance_usable
    || actual.account_type !== expected.account_type || !sameSource(actual.source, expected.source)) return null;
  const anchor = cell.period_location?.anchor;
  const derivation = cell.period_derivation;
  const periodDefinition = gbPeriodDefinition();
  if (!anchor || anchor.trusted !== true || !derivation || derivation.kind !== 'OWN_UPDATE_MONTH_AND_PUBLISHED_ORDER'
    || derivation.anchor_field !== 'File updated for the period to' || !sameSource(cell.period_definition?.source, periodDefinition.source)
    || cell.period_definition?.order !== periodDefinition.order || cell.period_definition?.interval !== periodDefinition.interval
    || !Number.isInteger(cell.code_index) || derivation.ordinal !== cell.code_index
    || typeof cell.raw_history !== 'string' || !/^[0-9A-Z?]{1,12}$/.test(cell.raw_history)
    || cell.raw_history[cell.code_index - 1] !== cell.raw_code
    || cell.raw_period !== `reporting period to ${derivation.anchor_raw}; most recent first; position ${cell.code_index}`
    || cell.period !== gbPeriodAt(derivation.anchor_date, cell.code_index)) return null;
  const update = record.printed?.['File updated for the period to'];
  const locatedUpdate = update?.location;
  const closed = record.printed?.Settled, defaulted = record.printed?.Defaulted, defaultAmount = record.printed?.Default;
  if (!update || update.state !== 'VALUE' || update.printed_times_in_record !== 1 || update.reason
    || update.normalized !== derivation.anchor_date || update.raw !== derivation.anchor_raw
    || update.location?.trusted !== true || locatedUpdate?.page !== anchor.page || locatedUpdate?.line !== anchor.line
    || closed?.state !== 'NOT_PRINTED' || defaulted?.state !== 'NOT_PRINTED' || defaultAmount?.state !== 'NOT_PRINTED'
    || record.printed?.Balance?.readings?.some((reading) => /^Satisfied$/i.test(String(reading.raw || '')))) return null;
  const reading = record.printed?.['Status history']?.readings?.find((entry) => entry.raw === cell.raw_history
    && entry.location?.page === cell.location.page && entry.location?.line === cell.location.line
    && entry.location?.trusted === true);
  if (!reading || ['x0', 'y0', 'x1', 'y1'].some((key) => reading.location[key] !== cell.location[key])
    || ['x0', 'y0', 'x1', 'y1'].some((key) => locatedUpdate[key] !== anchor[key])
    || anchor.raw_value !== update.raw || anchor.normalized_value !== update.normalized) return null;
  return expected;
}

module.exports = { SOURCE, definitionForCode, validatedDefinition, GB_SOURCE, GB_CAIS_SOURCE, gbDefinitionForCode,
  gbPeriodDefinition, gbPeriodAt };
