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
  if (!record || record.reader_family_id !== 'FAM-US-EXP-CONSUMER'
    || record.source_bureau && record.source_bureau !== 'Experian') return null;
  const expected = definitionForCode(cell && cell.code);
  const actual = cell && cell.code_definition;
  if (!cell || cell.location?.trusted !== true || cell.period_location?.month?.trusted !== true
    || cell.period_location?.year?.trusted !== true || cell.uncertain || cell.reason) return null;
  if (typeof cell.raw_code !== 'string' || cell.raw_code.toUpperCase() !== cell.code) return null;
  if (!expected || !actual || actual.code !== expected.code || actual.meaning !== expected.meaning
    || cell.meaning !== expected.meaning || actual.performance_usable !== expected.performance_usable
    || !actual.source || Object.keys(SOURCE).some((key) => actual.source[key] !== SOURCE[key])) return null;
  return expected;
}

module.exports = { SOURCE, definitionForCode, validatedDefinition };
