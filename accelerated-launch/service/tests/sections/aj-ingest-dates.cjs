'use strict';
/**
 * aj-ingest-dates.cjs — OWNER-ACCEPT-009 GAP-INGEST-003..007. Reconciles OCR-uncertainty through the actual
 * assessment, and the shared date handling: written forms (ordinal/day-first/leap), numeric conventions from
 * report evidence, month-only precision via conservative range evaluation, and reference-date distinction.
 */
const generalIntake = require('../../general-intake.cjs');
const formats = require('../../formats.cjs');
const evaluation = require('../../evaluation.cjs');
const ruleAdapters = require('../../../adapters/rule-adapters.cjs');
const { makeSyntheticModel } = require('../../../../internal-validation/ca-ns-last-payment-six-year/document-model.cjs');

async function run(t, check) {
  const evidence = {};

  /* ------------------------------------------------------------------ GAP-INGEST-006: month-only anchors are a range, never a substituted day */
  const straddle = ruleAdapters.runAdapter('FCRA-605A-5-US-NATIONAL-7Y', {
    country: 'US', region: 'US-NY', presentation: 'GENERAL-BUREAU-REPORT',
    facts: { 'reportedAccount.adverseRatingDate': '2020-01', 'reportedAccount.adverseRatingDatePrecision': 'MONTH' },
    referenceDate: '2027-01-15'
  });
  check.equal(straddle.state, 'UNRESOLVED', 'a month-only anchor whose range straddles the boundary is withheld, not a finding');
  check.equal(straddle.arithmetic.reason, 'MONTH_PRECISION_STRADDLES_THE_PERIOD_BOUNDARY', 'and it says why');

  const whollyBefore = ruleAdapters.runAdapter('FCRA-605A-5-US-NATIONAL-7Y', {
    country: 'US', region: 'US-NY', presentation: 'GENERAL-BUREAU-REPORT',
    facts: { 'reportedAccount.adverseRatingDate': '2015-06', 'reportedAccount.adverseRatingDatePrecision': 'MONTH' },
    referenceDate: '2026-06-12'
  });
  check.equal(whollyBefore.outcome, 'PERIOD_EXCEEDED', 'a month wholly before the boundary is exceeded');

  const whollyWithin = ruleAdapters.runAdapter('FCRA-605A-5-US-NATIONAL-7Y', {
    country: 'US', region: 'US-NY', presentation: 'GENERAL-BUREAU-REPORT',
    facts: { 'reportedAccount.adverseRatingDate': '2025-06', 'reportedAccount.adverseRatingDatePrecision': 'MONTH' },
    referenceDate: '2026-06-12'
  });
  check.equal(whollyWithin.outcome, 'PERIOD_NOT_EXCEEDED', 'a month wholly inside the period is not exceeded');

  /* ------------------------------------------------------------------ GAP-INGEST-003: low-confidence date through the actual assessment is never a finding */
  const lowConfRecords = generalIntake.buildRecords([{
    page: 1, source: 'LOCAL_OCR',
    lines: [{ text: 'Overdue Account  Original Listing 01/01/2021', page: 1, line: 1, source: 'LOCAL_OCR', trusted: false, confidence: 42 }]
  }]);
  check.equal(lowConfRecords[0].status, 'EXTRACTION_UNRESOLVED', 'a low-confidence date is not a resolved fact');
  const lowExt = {
    presentation_id: 'GENERAL-BUREAU-REPORT',
    support: 'ACTUAL_REPORT_EVIDENCE',
    extraction_ran: true,
    admission: { admitted: true },
    bureau: 'Equifax',
    content_markers: [],
    reference_date: { normalized_value: '2026-06-12', status: 'RESOLVED' },
    records: lowConfRecords,
    summary: { status: 'EXTRACTION_UNRESOLVED' },
    evidence_readings: { sections_printed: [], records_found: 1, factual_view: null }
  };
  const lowEval = evaluation.evaluateCase({ country: 'AU', region: 'AU-NSW', extraction: lowExt });
  const performed = lowEval.results.filter((r) => r.check && /DEFAULT-5Y|ORIGINAL_LISTING|OVERDUE/.test(r.check.adapter_id || ''));
  check.equal(performed.length, 0, 'no statutory comparison was performed on an unresolved (low-confidence) anchor');
  check.ok(lowEval.unresolved_checks.length > 0, 'the check is recorded as unresolved, not a violation');
  check.ok(!lowEval.results.some((r) => r.machine && r.machine.finding_emitted === true), 'no VIOLATION or PROBABLE_VIOLATION was emitted');

  /* ------------------------------------------------------------------ GAP-INGEST-003: a high line mean never conceals an uncertain decisive character */
  const decisiveLow = generalIntake.buildRecords([{
    page: 1, source: 'LOCAL_OCR',
    lines: [{
      text: 'Original Listing 01/01/2021  Balance $1,240',
      page: 1, line: 1, source: 'LOCAL_OCR', trusted: true, confidence: 88, min_confidence: 40,
      words: [
        { text: 'Original', confidence: 96, trusted: true, start: 0, end: 8 },
        { text: 'Listing', confidence: 96, trusted: true, start: 9, end: 16 },
        { text: '01/01/2021', confidence: 40, trusted: false, start: 17, end: 27 },
        { text: 'Balance', confidence: 96, trusted: true, start: 29, end: 36 },
        { text: '$1,240', confidence: 96, trusted: true, start: 37, end: 43 }
      ]
    }]
  }]);
  check.equal(decisiveLow[0].status, 'EXTRACTION_UNRESOLVED', 'a line with a high mean but an untrusted date word yields no resolved fact');
  const decisiveDateField = Object.values(decisiveLow[0].printed).find((f) => f.kind === 'date' && f.raw === '01/01/2021');
  check.ok(decisiveDateField, 'the degraded date reading is preserved');
  check.equal(decisiveDateField.state, 'UNRESOLVED', 'and it is unresolved, not a value');
  check.equal(decisiveDateField.reason, 'LOW_CONFIDENCE_OCR_READING_ON_DECISIVE_CHARACTERS', 'and the reason names the decisive-character uncertainty');
  check.equal(decisiveDateField.location.min_confidence, 40, 'and the field location records the line minimum word confidence');
  check.equal(decisiveDateField.location.confidence, 88, 'alongside the high line mean');

  const decisiveClear = generalIntake.buildRecords([{
    page: 1, source: 'LOCAL_OCR',
    lines: [{
      text: 'Original Listing 01/01/2021  Balance $1,240',
      page: 1, line: 1, source: 'LOCAL_OCR', trusted: true, confidence: 96, min_confidence: 95,
      words: [
        { text: 'Original', confidence: 96, trusted: true, start: 0, end: 8 },
        { text: 'Listing', confidence: 96, trusted: true, start: 9, end: 16 },
        { text: '01/01/2021', confidence: 95, trusted: true, start: 17, end: 27 },
        { text: 'Balance', confidence: 96, trusted: true, start: 29, end: 36 },
        { text: '$1,240', confidence: 96, trusted: true, start: 37, end: 43 }
      ]
    }]
  }]);
  check.equal(decisiveClear[0].status, 'RESOLVED', 'a line whose decisive words are all trusted resolves the date');
  check.ok(Object.values(decisiveClear[0].printed).some((f) => f.state === 'VALUE'), 'and a resolved value is present');

  const legalText = 'Bankruptcy Order for Relief 01/01/2011 Balance $1,240';
  let cursor = 0;
  const legalWords = legalText.split(' ').map(text => {
    const start = cursor; cursor += text.length + 1;
    return { text, start, end: start + text.length, confidence: text === '01/01/2011' ? 17 : 96, trusted: text !== '01/01/2011' };
  });
  const legalRecords = generalIntake.buildRecords([{ page: 1, source: 'LOCAL_OCR', lines: [{text: legalText, page: 1, line: 3, source: 'LOCAL_OCR', trusted: true, confidence: 85, min_confidence: 17, words: legalWords}] }]);
  check.equal(legalRecords[0].facts['publicRecord.bankruptcyOrderForReliefDate'], undefined, 'legal-event acceptance never bypasses uncertain decisive-word trust');
  check.equal(legalRecords[0].printed.bankruptcy_order_for_relief_date.state, 'UNRESOLVED', 'the legal-event reading remains explicitly unresolved');
  const rendered = require('../../results.cjs').renderResultSet({ extraction: {...lowExt, records: legalRecords}, evaluation: evaluation.evaluateCase({ country: 'US', region: 'US-NY', extraction: {...lowExt, records: legalRecords} }) });
  check.ok(rendered.unresolved_report_fields.length > 0, 'consumer results retain unresolved printed fields');
  check.equal(rendered.unresolved_report_fields[0].account_number_in_report, 1, 'uncertainty keeps its owning account');
  check.equal(rendered.unresolved_report_fields[0].accepted_as_fact, false, 'consumer raw readings are never accepted values');
  check.match(rendered.unresolved_report_fields[0].plain, /could not read.*confidently/, 'uncertainty is explained in plain language');
  check.equal(rendered.unresolved_report_fields[0].location.line, 3, 'uncertainty retains its actual source line');

  /* ------------------------------------------------------------------ GAP-INGEST-007: the report-issued date wins over an account "as of" date */
  const reModel = makeSyntheticModel({ pages: [['Equifax  Consumer Credit Report', 'Report Date: June 12, 2026', 'Account A  Balance $100  As of 01/2020']] });
  const reExt = formats.extractWithSharedAdapter(reModel, { mode: 'REPORT', country: 'US' });
  check.equal(reExt.reference_date.normalized_value, '2026-06-12', 'the report header date, not the account as-of date, is the reference date');
  check.equal(reExt.reference_date.hint_basis, 'REPORT_HEADER', 'and the basis is a report header');

  /* ------------------------------------------------------------------ GAP-INGEST-004/005: resolved facts retain raw text, precision and source */
  const factModel = makeSyntheticModel({ pages: [['Equifax  Consumer Credit Report', 'Report Date: June 12, 2026', 'Account A  Balance $100  Closed February 5th, 2021']] });
  const factExt = formats.extractWithSharedAdapter(factModel, { mode: 'REPORT', country: 'US' });
  const closed = factExt.records[0] && factExt.records[0].printed.closed_date;
  check.ok(closed, 'a closure date was read');
  check.equal(closed.raw, 'February 5th, 2021', 'raw text is preserved');
  check.equal(closed.normalized, '2021-02-05', 'normalized value is resolved');
  check.equal(closed.precision, 'DAY', 'precision is recorded');
  check.ok(closed.location && typeof closed.location.page === 'number', 'and the source page is recorded');

  /* ------------------------------------------------------------------ GAP-INGEST-005: both interpretations are preserved; the comparison needs agreement */
  const agree = ruleAdapters.runAdapter('FCRA-605A-5-US-NATIONAL-7Y', {
    country: 'US', region: 'US-NY', presentation: 'GENERAL-BUREAU-REPORT',
    facts: { 'reportedAccount.adverseRatingDateInterpretations': ['2021-05-06', '2021-06-05'] },
    referenceDate: '2026-06-12'
  });
  check.equal(agree.outcome, 'PERIOD_NOT_EXCEEDED', 'two interpretations that agree both resolve to the same outcome');
  check.equal(agree.arithmetic.interpretations_agree, true, 'and the agreement is recorded');

  const disagree = ruleAdapters.runAdapter('FCRA-605A-5-US-NATIONAL-7Y', {
    country: 'US', region: 'US-NY', presentation: 'GENERAL-BUREAU-REPORT',
    facts: { 'reportedAccount.adverseRatingDateInterpretations': ['2019-05-01', '2019-07-01'] },
    referenceDate: '2026-06-12'
  });
  check.equal(disagree.state, 'UNRESOLVED', 'two interpretations that disagree are withheld, never a finding');
  check.equal(disagree.arithmetic.reason, 'AMBIGUOUS_DATE_INTERPRETATIONS_DISAGREE', 'and the reason is recorded');

  /* ------------------------------------------------------------------ GAP-INGEST-007: conflicting genuine report headers are withheld */
  const conflictModel = makeSyntheticModel({ pages: [['Equifax  Consumer Credit Report', 'Report Date: June 12, 2026', 'Date of Report: June 13, 2026', 'Account A  Balance $100']] });
  const conflictExt = formats.extractWithSharedAdapter(conflictModel, { mode: 'REPORT', country: 'US' });
  check.equal(conflictExt.reference_date.status, 'EXTRACTION_UNRESOLVED', 'conflicting report headers withhold the reference date');
  check.equal(conflictExt.reference_date.reason, 'CONFLICTING_REPORT_REFERENCE_DATES', 'and name the reason');

  /* ------------------------------------------------------------------ GAP-INGEST-006: the format-family reader no longer substitutes a first day */
  const adverse = ruleAdapters.runAdapter('FCRA-605A-5-US-NATIONAL-7Y', {
    country: 'US', region: 'US-NY', presentation: 'GENERAL-BUREAU-REPORT',
    facts: { 'reportedAccount.adverseRatingDate': '2015-06', 'reportedAccount.adverseRatingDatePrecision': 'MONTH' },
    referenceDate: '2015-06-30'
  });
  check.equal(adverse.arithmetic.anchor_month, '2015-06', 'a month-only anchor is compared as a month, no first day');

  evidence.interpretations = { agree: agree.outcome, disagree: disagree.state };
  evidence.conflicting_reference_date = { status: conflictExt.reference_date.status, reason: conflictExt.reference_date.reason };
  evidence.interval = { straddle: straddle.state, wholly_before: whollyBefore.outcome, wholly_within: whollyWithin.outcome };
  evidence.low_confidence_assessment = { performed_checks: performed.length, unresolved_checks: lowEval.unresolved_checks.length };
  evidence.reference_date = { value: reExt.reference_date.normalized_value, basis: reExt.reference_date.hint_basis };
  return evidence;
}

module.exports = { run, id: 'aj-ingest-dates', title: 'GAP-INGEST-003..007: OCR-uncertainty through assessment; written/numeric/partial/reference dates' };
