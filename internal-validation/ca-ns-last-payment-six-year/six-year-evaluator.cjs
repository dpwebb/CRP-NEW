'use strict';
/**
 * six-year-evaluator.cjs — the deterministic six-calendar-year comparison.
 *
 * PHASE5-001I-A. The comparison is a pure function of two resolved dates. It does not read a clock, a locale,
 * a time zone, a host or any accumulated state, and it does not hard-code a day count: the six-year span is
 * computed from the two dates by calendar arithmetic, so a six-year interval that contains two leap days is
 * wider than one that contains one.
 *
 * The comparison outcome is not a legal finding. `PERIOD_EXCEEDED` alone is an arithmetic result and settles
 * nothing: the unit's ceiling is `observation`, and whether an exceeded period may support any finding is a
 * question for the rule record and the owner, not for this evaluator.
 */

const { COMPARISON_OUTCOME, PERIOD_YEARS } = require('./constants.cjs');

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseIso(iso) {
  const match = ISO_DATE.exec(iso || '');
  if (!match) return null;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (m < 1 || m > 12 || d < 1 || d > daysInMonth(y, m)) return null;
  return { y, m, d };
}

function isLeapYear(y) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

function daysInMonth(y, m) {
  return [31, isLeapYear(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
}

/** Days since 1970-01-01 for a proleptic Gregorian date. Integer arithmetic only: no time zone, no clock. */
function daysFromCivil(y, m, d) {
  const yy = m <= 2 ? y - 1 : y;
  const era = Math.floor(yy / 400);
  const yoe = yy - era * 400;
  const doy = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + d - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

function daysBetween(fromIso, toIso) {
  const a = parseIso(fromIso);
  const b = parseIso(toIso);
  if (!a || !b) return null;
  return daysFromCivil(b.y, b.m, b.d) - daysFromCivil(a.y, a.m, a.d);
}

/**
 * Add calendar years with a month-end clamp: 29 February maps to 28 February in a non-leap target year.
 * The clamp is documented here because it is the only place the arithmetic departs from a plain field copy,
 * and it is tested on both a leap-day start and an ordinary start.
 */
function addCalendarYears(iso, years) {
  const parsed = parseIso(iso);
  if (!parsed) return null;
  const year = parsed.y + years;
  const day = Math.min(parsed.d, daysInMonth(year, parsed.m));
  return `${String(year).padStart(4, '0')}-${String(parsed.m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * The comparison. `referenceDate` is the report's printed reference date; `lastPaymentDate` is the printed
 * last-payment date bound to one contract debt record.
 */
function evaluateSixYearPeriod(lastPaymentDate, referenceDate) {
  const un = (reason, extra) => Object.assign({
    outcome: COMPARISON_OUTCOME.UNRESOLVED, reason, last_payment_date: lastPaymentDate, reference_date: referenceDate,
    anniversary: null, intervening_days: null, six_year_span_in_days: null, boundary_case: null
  }, extra || {});

  if (!parseIso(lastPaymentDate)) return un('LAST_PAYMENT_DATE_IS_NOT_A_RESOLVED_DATE');
  if (!parseIso(referenceDate)) return un('REFERENCE_DATE_IS_NOT_A_RESOLVED_DATE');

  const anniversary = addCalendarYears(lastPaymentDate, PERIOD_YEARS);
  const interveningDays = daysBetween(lastPaymentDate, referenceDate);
  const spanDays = daysBetween(lastPaymentDate, anniversary);

  if (interveningDays < 0) return un('LAST_PAYMENT_AFTER_REPORT_REFERENCE_DATE', { anniversary, intervening_days: interveningDays, six_year_span_in_days: spanDays });

  let outcome;
  let boundaryCase = null;
  if (interveningDays > spanDays) outcome = COMPARISON_OUTCOME.PERIOD_EXCEEDED;
  else {
    outcome = COMPARISON_OUTCOME.PERIOD_NOT_EXCEEDED;
    if (interveningDays === spanDays) boundaryCase = 'EXACTLY_AT_SIX_YEAR_ANNIVERSARY';
  }

  return {
    outcome, reason: null, last_payment_date: lastPaymentDate, reference_date: referenceDate,
    anniversary, intervening_days: interveningDays, six_year_span_in_days: spanDays, boundary_case: boundaryCase,
    comparison: 'intervening_days > six_year_span_in_days',
    period_years: PERIOD_YEARS,
    period_basis: 'CALENDAR_YEARS_FROM_THE_LAST_PAYMENT — the anniversary is computed and the day span is derived from the two dates; no day count is hard-coded',
    anniversary_boundary_convention:
      'the sixth anniversary day is inside the period, so the period is exceeded only after it; whether "more than six years after" is inclusive or exclusive of that day is a legal question reserved to the rule record',
    leap_year_handling: 'a 29 February start maps to 28 February in a non-leap target year (month-end clamp); a six-year span containing two leap days is one day wider than one containing a single leap day',
    clock_independence: 'the evaluation reads no clock, locale, time zone, host or session state'
  };
}

module.exports = { evaluateSixYearPeriod, addCalendarYears, daysBetween, parseIso, isLeapYear, daysInMonth, daysFromCivil };
