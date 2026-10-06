'use strict';
/**
 * build_001i_a_evaluation_record.cjs — the pinned run's evaluation record.
 *
 * PHASE5-001I-A. Runs the same pinned run as the extraction record (require executes it once) and writes
 * SOURCE_CAPTURES\PHASE5-001I-A\evaluation_results.json: the arithmetic, the boundary convention, the
 * classification and ceiling that govern the result, and the explicit statement that none of it is a finding.
 */

const fs = require('fs');
const path = require('path');

const { RUN, MODEL, EVIDENCE, OUT, TODAY, write, UNIT, PRESERVED_CLASSIFICATION, COMPARISON_OUTCOME } =
  require('./build_001i_a_extraction_record.cjs');

const comparisons = RUN.comparisons.map((c) => ({
  record_index: c.record_index,
  last_payment_fact_status: c.last_payment_fact_status,
  last_payment_fact_reason: c.last_payment_fact_reason,
  last_payment_printed_value: c.last_payment_printed_value,
  last_payment_normalized_value: c.last_payment_date,
  last_payment_locator: c.last_payment_locator,
  reference_date_printed_value: RUN.extraction.request_date.raw_value,
  reference_date_normalized_value: c.reference_date,
  evaluation: c.evaluation
}));

write('evaluation_results.json', {
  artifact: 'evaluation_results.json',
  work_order: 'PHASE5-001I-A',
  created_utc: TODAY,
  purpose: 'the deterministic internal comparison on the pinned presentation: its arithmetic, its boundary convention, its unresolved qualifications and the classification that governs what may be concluded',
  unit: { unit_id: UNIT.unit_id, limb: UNIT.limb, citation: UNIT.citation },
  inputs: {
    evidenced_artifact_id: EVIDENCE.artifact_id, evidence_sha256: EVIDENCE.sha256,
    reference_date_field: 'Request Date (printed page header, identical on all pages)',
    payment_date_field: 'Last Payment Date (printed inside a Collections collection record)'
  },
  arithmetic: {
    period_years: 6,
    comparison: 'intervening_days > six_year_span_in_days',
    no_day_count_is_hard_coded: true,
    day_span_is_derived_from_the_two_dates: true,
    leap_year_handling: 'a 29 February start maps to 28 February in a non-leap target year (month-end clamp); a six-year span with two leap days is one day wider than one with a single leap day (2,191 against 2,192 measured)',
    anniversary_boundary_convention: 'the sixth anniversary day is inside the period: the period is exceeded only after it. Whether "more than six years after" is inclusive or exclusive of that day is a legal question reserved to the rule record (Gate 5.4) and is not decided here.',
    clock_independence: 'the evaluation reads no clock, locale, time zone, host or session state; a reference date beyond the run clock changes nothing about how the comparison is computed'
  },
  comparisons,
  comparison_summary: RUN.comparison_summary,
  reproduced_from_prod003: {
    source: 'SOURCE_CAPTURES\\PROD-003\\report_representation_register.json deterministic_evaluation_demonstration',
    recorded: { intervening_days: 1919, six_year_span_in_days: 2191, boundary: '2027-02-01', result: 'PERIOD_NOT_EXCEEDED' },
    reproduced_here: {
      intervening_days: comparisons[0].evaluation.intervening_days,
      six_year_span_in_days: comparisons[0].evaluation.six_year_span_in_days,
      anniversary: comparisons[0].evaluation.anniversary,
      outcome: comparisons[0].evaluation.outcome
    },
    verdict: comparisons.every((c) => c.evaluation.intervening_days === 1919 && c.evaluation.six_year_span_in_days === 2191
      && c.evaluation.anniversary === '2027-02-01' && c.evaluation.outcome === 'PERIOD_NOT_EXCEEDED')
      ? 'REPRODUCED' : 'NOT_REPRODUCED'
  },
  classification_governing_the_result: PRESERVED_CLASSIFICATION,
  what_this_result_is_not: [
    'PERIOD_EXCEEDED, were it reached, would not be a legal finding: it is an arithmetic result on two printed dates',
    'the unit may not emit VIOLATION at all, and may not emit PROBABLE_VIOLATION under the owner decision recorded for this order',
    'the ceiling recorded in PROD-003 section 7.4 is a proposal conditioned on the owners rule-corpus amendment; it is not authorization and is not relied on here',
    'the results carry the unresolved timing and classification qualifications; neither is resolved by this order'
  ],
  legal_finding: null,
  finding_authorized: false,
  consumer_visible: false,
  boundaries: RUN.boundaries
});

for (const c of comparisons) {
  console.log(`record ${c.record_index}: ${c.last_payment_normalized_value} vs ${c.reference_date_normalized_value} -> ${c.evaluation.outcome} (${c.evaluation.intervening_days} of ${c.evaluation.six_year_span_in_days} days)`);
}
console.log(`comparison outcomes: ${JSON.stringify(RUN.comparison_summary.outcomes)}`);
