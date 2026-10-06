'use strict';
/** tests/sections/b-arithmetic.cjs — the six-year calendar arithmetic and its anniversary boundary. */

module.exports.run = function run(ctx) {
  const { test, assert, evaluateSixYearPeriod, addCalendarYears, daysBetween } = ctx;

  test('B1 before, at and after the sixth anniversary', () => {
    const before = evaluateSixYearPeriod('2021-02-01', '2027-01-31');
    const at = evaluateSixYearPeriod('2021-02-01', '2027-02-01');
    const after = evaluateSixYearPeriod('2021-02-01', '2027-02-02');
    assert(before.outcome === 'PERIOD_NOT_EXCEEDED' && before.boundary_case === null, `before ${JSON.stringify(before)}`);
    assert(at.outcome === 'PERIOD_NOT_EXCEEDED' && at.boundary_case === 'EXACTLY_AT_SIX_YEAR_ANNIVERSARY', `at ${JSON.stringify(at)}`);
    assert(after.outcome === 'PERIOD_EXCEEDED', `after ${after.outcome}`);
    assert(before.anniversary === '2027-02-01' && after.anniversary === '2027-02-01', 'the anniversary is not 2027-02-01');
    assert(at.anniversary_boundary_convention.length > 0, 'the boundary convention is not recorded');
    return '2027-01-31 not exceeded; 2027-02-01 not exceeded at the boundary; 2027-02-02 exceeded';
  });

  test('B2 a 29 February start clamps to 28 February in a non-leap sixth year', () => {
    assert(addCalendarYears('2020-02-29', 6) === '2026-02-28', `anniversary ${addCalendarYears('2020-02-29', 6)}`);
    const before = evaluateSixYearPeriod('2020-02-29', '2026-02-27');
    const at = evaluateSixYearPeriod('2020-02-29', '2026-02-28');
    const after = evaluateSixYearPeriod('2020-02-29', '2026-03-01');
    assert(before.outcome === 'PERIOD_NOT_EXCEEDED', `before ${before.outcome}`);
    assert(at.outcome === 'PERIOD_NOT_EXCEEDED' && at.boundary_case === 'EXACTLY_AT_SIX_YEAR_ANNIVERSARY', `at ${JSON.stringify(at)}`);
    assert(after.outcome === 'PERIOD_EXCEEDED', `after ${after.outcome}`);
    return '2020-02-29 -> 2026-02-28; the days before, at and after behave as the boundary rule records';
  });

  test('B3 the six-year span is computed, not hard-coded at 2,191 days', () => {
    const oneLeap = daysBetween('2021-02-01', '2027-02-01');
    const twoLeaps = daysBetween('2019-03-01', '2025-03-01');
    const evaluated = evaluateSixYearPeriod('2019-03-01', '2025-03-01');
    assert(oneLeap === 2191, `one-leap span ${oneLeap}`);
    assert(twoLeaps === 2192, `two-leap span ${twoLeaps}`);
    assert(oneLeap !== twoLeaps, 'the two spans are equal, so a constant may have been used');
    assert(evaluated.six_year_span_in_days === twoLeaps, 'the evaluation did not compute its own span');
    return `one leap day 2,191; two leap days ${twoLeaps}; each span is derived from its own dates`;
  });

  test('B4 a last payment after the report reference date is unresolved, never a negative period', () => {
    const result = evaluateSixYearPeriod('2022-01-01', '2021-01-01');
    assert(result.outcome === 'UNRESOLVED', `outcome ${result.outcome}`);
    assert(result.reason === 'LAST_PAYMENT_AFTER_REPORT_REFERENCE_DATE', `reason ${result.reason}`);
    assert(result.intervening_days < 0, `intervening days ${result.intervening_days}`);
    return result.reason;
  });

  test('B5 a reference date beyond the run clock is still evaluated as a pure function', () => {
    const result = evaluateSixYearPeriod('2021-02-01', '2099-01-01');
    assert(result.outcome === 'PERIOD_EXCEEDED', `outcome ${result.outcome}`);
    assert(result.clock_independence.length > 0, 'the clock-independence statement is missing');
    assert(result.leap_year_handling.length > 0, 'the leap-year handling statement is missing');
    return 'a future reference date changes nothing about how the comparison is computed';
  });
};
