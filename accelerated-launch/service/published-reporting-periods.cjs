'use strict';

const { determiningAnchor } = require('../adapters/reporting-period-anchor.cjs');
const { calendar: { addCalendarYears, parseIso } } = require('../adapters/evaluation-primitives.cjs');
const { factSourcesForRecord } = require('./formats.cjs');
const { reportReference } = require('./report-fact-sources.cjs');

// Preserve the publisher's scopes as evidence, without assigning a positive or
// negative category to an account. Unresolved scope produces a verification
// comparison, never a claim that the shorter period is universally applicable.
const SOURCE = Object.freeze({ publisher: 'TransUnion Canada', title: 'Frequently Asked Credit Questions',
  url: 'https://www.transunion.ca/customer-support/faq', verified_on: '2026-10-11',
  periods: Object.freeze([
    { years: 6, published_scope: 'Accounts with adverse credit history and collections; original default date' },
    { years: 20, published_scope: 'Paid accounts without adverse information; last activity date' }
  ]) });

function compare(context) {
  const extraction = context.extraction;
  // The actual reader proves the bureau and country. A user's bureau selection
  // alone must not apply one bureau's publication to a different uploaded file.
  if (context.country !== 'CA' || extraction?.presentation_id !== 'FAM-TU-CA-CONSUMER'
    || extraction.extraction_ran !== true || extraction.demonstration === true) return [];
  const assessed = context.assessment_clock?.assessment_date || context.assessmentDate;
  const comparisons = [];
  for (const record of extraction.records || []) {
    if (!['TU_CA_TRADELINE', 'COLLECTION_ACCOUNT', 'GENERAL_COLLECTION'].includes(record.kind)
      || record.status && record.status !== 'RESOLVED') continue;
    const anchor = determiningAnchor(record.facts, factSourcesForRecord(record), null, record);
    const reported = reportReference(record)?.normalized_value;
    if (!anchor || !parseIso(reported) || !parseIso(assessed)) continue;
    // At month precision, use the latest possible day before declaring expiry.
    const latest = anchor.precision === 'MONTH' ? (() => {
      const [year, month] = anchor.iso.split('-').map(Number);
      return `${anchor.iso}-${String(new Date(Date.UTC(year, month, 0)).getUTCDate()).padStart(2, '0')}`;
    })() : anchor.iso;
    const collection = record.kind === 'COLLECTION_ACCOUNT' || record.kind === 'GENERAL_COLLECTION';
    const periods = SOURCE.periods.filter(period => !collection || period.years === 6).map(period => {
      const end = addCalendarYears(latest, period.years);
      return { ...period, ends_on: end,
        ...(anchor.precision === 'MONTH' ? { ends_from: addCalendarYears(anchor.iso + '-01', period.years), precision: 'MONTH' } : {}),
        outside_at_report: reported > end, outside_at_assessment: assessed > end };
    });
    comparisons.push({ record_index: record.record_index, anchor, report_date: reported, assessed_on: assessed,
      source: SOURCE, periods, status_classification_used: false,
      review_warranted: periods.some(period => period.outside_at_assessment),
      current_presence_requires_verification: reported !== assessed });
  }
  return comparisons;
}

module.exports = { compare, SOURCE };
