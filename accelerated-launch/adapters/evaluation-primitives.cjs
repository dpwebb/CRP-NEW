'use strict';
/**
 * evaluation-primitives.cjs — the shared, deterministic primitives a rule adapter evaluates with.
 *
 * OWNER-ALL82-001 / B1. This module ADDS NO SECOND EVALUATOR. The calendar arithmetic it compares with is
 * the same code the admitted CA-NS six-year unit already uses — `addCalendarYears`, `daysBetween`,
 * `parseIso`, `isLeapYear`, `daysInMonth`, `daysFromCivil` are REQUIRED from
 * `internal-validation/ca-ns-last-payment-six-year/six-year-evaluator.cjs` and re-exported here, so there is
 * one date model in this repository rather than two. What this module adds is the generalisation: the
 * elapsed-period comparison takes the period from the adapter instead of the unit's hard-coded six years.
 *
 * Boundaries, recorded so no later reader has to infer them:
 *   • The comparison is a pure function of an anchor date, a report reference date and a period in whole
 *     calendar years. It reads no clock, locale, time zone, host or session state.
 *   • `PERIOD_EXCEEDED` is an ARITHMETIC RESULT, never a legal finding. Whether an exceeded period supports
 *     any finding is a question for the rule record and the owner.
 *   • Facts are ISO (`YYYY-MM-DD`) only. Normalising a printed date into ISO is the EXTRACTION boundary's
 *     job; this module refuses anything it cannot parse rather than guessing a convention. That is why the
 *     legacy `parsePrintedDate`/`DateConvention` machinery is NOT duplicated here.
 *   • A period that is not a positive integer, or exceeds MAX_PERIOD_YEARS, is refused rather than clamped.
 */

const {
  evaluateSixYearPeriod,
  addCalendarYears,
  daysBetween,
  parseIso,
  isLeapYear,
  daysInMonth,
  daysFromCivil
} = require('../../internal-validation/ca-ns-last-payment-six-year/six-year-evaluator.cjs');

const {
  COMPARISON_OUTCOME,
  FACT_STATUS
} = require('../../internal-validation/ca-ns-last-payment-six-year/constants.cjs');

/** The widest period a single adapter may declare. Wider than any recorded retention or limitation period. */
const MAX_PERIOD_YEARS = 100;

/** Adapter-level result states. Distinct states that may never be substituted for one another. */
const RESULT_STATE = Object.freeze({
  EVALUATED: 'EVALUATED',
  WITHHELD: 'WITHHELD',
  UNRESOLVED: 'UNRESOLVED',
  REFUSED: 'REFUSED'
});

/** Fact statuses the adapters add to the unit's vocabulary. Same rule: never substituted for one another. */
const ADAPTER_FACT_STATUS = Object.freeze({
  RESOLVED: FACT_STATUS.RESOLVED,
  EXTRACTION_UNRESOLVED: FACT_STATUS.EXTRACTION_UNRESOLVED,
  UNSUPPORTED_PRESENTATION: FACT_STATUS.UNSUPPORTED_PRESENTATION,
  NOT_REPORT_EVIDENCED: 'NOT_REPORT_EVIDENCED'
});

function isPositiveInt(value) {
  return Number.isInteger(value) && value > 0;
}

/** ISO-only. Returns the trimmed ISO string when it is a real calendar date, otherwise null. */
function normalizeFactDate(value) {
  if (typeof value !== 'string') return null;
  const iso = value.trim();
  return parseIso(iso) ? iso : null;
}

/** MONTH-precision comparison. A month-only anchor is a RANGE, never a substituted day. PERIOD_EXCEEDED is
 *  reported only when even the LATEST possible day is beyond the anniversary; PERIOD_NOT_EXCEEDED only when even
 *  the EARLIEST possible day is inside; anything in between straddles the boundary and is UNRESOLVED. */
function computeElapsedPeriodRange(anchorMonth, referenceDate, periodYears) {
  const un = (reason, extra) => Object.assign({
    outcome: COMPARISON_OUTCOME.UNRESOLVED,
    reason,
    anchor_month: anchorMonth,
    reference_date: referenceDate,
    month_start: null,
    month_end: null,
    anniversary_start: null,
    anniversary_end: null,
    period_years: periodYears
  }, extra || {});

  const m = /^(\d{4})-(\d{1,2})$/.exec(String(anchorMonth || '').trim());
  if (!m) return un('ANCHOR_MONTH_IS_NOT_A_RESOLVED_MONTH');
  const y = +m[1], mo = +m[2];
  if (mo < 1 || mo > 12) return un('ANCHOR_MONTH_IS_NOT_A_RESOLVED_MONTH');
  if (!isPositiveInt(periodYears) || periodYears > MAX_PERIOD_YEARS) return un('PERIOD_YEARS_IS_NOT_A_SUPPORTED_POSITIVE_INTEGER');
  if (!normalizeFactDate(referenceDate)) return un('REFERENCE_DATE_IS_NOT_A_RESOLVED_DATE');

  const pad = (n) => String(n).padStart(2, '0');
  const monthStart = `${String(y).padStart(4, '0')}-${pad(mo)}-01`;
  const monthEnd = `${String(y).padStart(4, '0')}-${pad(mo)}-${pad(daysInMonth(y, mo))}`;
  const anniversaryStart = addCalendarYears(monthStart, periodYears);
  const anniversaryEnd = addCalendarYears(monthEnd, periodYears);

  if (daysBetween(monthEnd, referenceDate) < 0) {
    return un('ANCHOR_MONTH_AFTER_REPORT_REFERENCE_DATE', { month_start: monthStart, month_end: monthEnd });
  }
  /* reference is after the latest anniversary: the whole month is exceeded. */
  if (daysBetween(anniversaryEnd, referenceDate) > 0) {
    return Object.assign(un(null), {
      outcome: COMPARISON_OUTCOME.PERIOD_EXCEEDED,
      reason: null,
      month_start: monthStart, month_end: monthEnd,
      anniversary_start: anniversaryStart, anniversary_end: anniversaryEnd
    });
  }
  /* reference is on or before the earliest anniversary: the whole month is inside. */
  if (daysBetween(referenceDate, anniversaryStart) >= 0) {
    return Object.assign(un(null), {
      outcome: COMPARISON_OUTCOME.PERIOD_NOT_EXCEEDED,
      reason: null,
      month_start: monthStart, month_end: monthEnd,
      anniversary_start: anniversaryStart, anniversary_end: anniversaryEnd
    });
  }
  return un('MONTH_PRECISION_STRADDLES_THE_PERIOD_BOUNDARY', {
    month_start: monthStart, month_end: monthEnd,
    anniversary_start: anniversaryStart, anniversary_end: anniversaryEnd
  });
}

/** First resolved field in a declared priority order. A field that is absent or unparseable is skipped. */
function resolvePriorityAnchor(facts, fields) {
  const source = facts && typeof facts === 'object' ? facts : {};
  const order = Array.isArray(fields) ? fields : [];
  for (const field of order) {
    const iso = normalizeFactDate(source[field]);
    if (iso) {
      return {
        field,
        iso,
        value_as_supplied: source[field],
        selection_rule: 'FIRST_RESOLVED_FIELD_IN_DECLARED_PRIORITY'
      };
    }
  }
  return null;
}

/** Days since 1970-01-01 for a proleptic Gregorian date (re-exported from the shared calendar unit). */
function civilFromDays(z) {
  const Z = z + 719468;
  const era = Math.floor(Z / 146097);
  const doe = Z - era * 146097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  const y = yoe + era * 400;
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const m = mp + (mp < 10 ? 3 : -9);
  const yy = m <= 2 ? y + 1 : y;
  return { y: yy, m, d };
}

/** Shift an ISO date by a whole number of days (integer, time-zone-free). Used for the FCRA § 605(c)(1) 180-day rule. */
function addDays(iso, days) {
  const p = parseIso(iso);
  if (!p) return null;
  const r = civilFromDays(daysFromCivil(p.y, p.m, p.d) + days);
  return `${String(r.y).padStart(4, '0')}-${String(r.m).padStart(2, '0')}-${String(r.d).padStart(2, '0')}`;
}

/**
 * The generalised comparison. `anchorDate` is the resolved start the rule names; `referenceDate` is the
 * report's printed reference date; `periodYears` is the period the adapter declares.
 */
function computeElapsedPeriod(anchorDate, referenceDate, periodYears) {
  const un = (reason, extra) => Object.assign({
    outcome: COMPARISON_OUTCOME.UNRESOLVED,
    reason,
    anchor_date: anchorDate,
    reference_date: referenceDate,
    anniversary: null,
    intervening_days: null,
    period_span_in_days: null,
    boundary_case: null,
    period_years: periodYears
  }, extra || {});

  if (!isPositiveInt(periodYears) || periodYears > MAX_PERIOD_YEARS) {
    return un('PERIOD_YEARS_IS_NOT_A_SUPPORTED_POSITIVE_INTEGER');
  }
  if (!normalizeFactDate(anchorDate)) return un('ANCHOR_DATE_IS_NOT_A_RESOLVED_DATE');
  if (!normalizeFactDate(referenceDate)) return un('REFERENCE_DATE_IS_NOT_A_RESOLVED_DATE');

  const anniversary = addCalendarYears(anchorDate, periodYears);
  const interveningDays = daysBetween(anchorDate, referenceDate);
  const spanDays = daysBetween(anchorDate, anniversary);

  if (interveningDays < 0) {
    return un('ANCHOR_DATE_AFTER_REPORT_REFERENCE_DATE', {
      anniversary,
      intervening_days: interveningDays,
      period_span_in_days: spanDays
    });
  }

  let outcome;
  let boundaryCase = null;
  if (interveningDays > spanDays) {
    outcome = COMPARISON_OUTCOME.PERIOD_EXCEEDED;
  } else {
    outcome = COMPARISON_OUTCOME.PERIOD_NOT_EXCEEDED;
    if (interveningDays === spanDays) boundaryCase = `EXACTLY_AT_${periodYears}_YEAR_ANNIVERSARY`;
  }

  return {
    outcome,
    reason: null,
    anchor_date: anchorDate,
    reference_date: referenceDate,
    anniversary,
    intervening_days: interveningDays,
    period_span_in_days: spanDays,
    boundary_case: boundaryCase,
    period_years: periodYears,
    comparison: 'intervening_days > period_span_in_days',
    period_basis:
      'CALENDAR_YEARS_FROM_THE_ANCHOR_DATE — the anniversary is computed and the day span is derived from ' +
      'the two dates; no day count is hard-coded',
    anniversary_boundary_convention:
      'the anniversary day is inside the period, so the period is exceeded only after it; whether ' +
      '"more than N years after" is inclusive or exclusive of that day is a legal question reserved to the ' +
      'rule record',
    leap_year_handling:
      'a 29 February start maps to 28 February in a non-leap target year (month-end clamp); a span ' +
      'containing two leap days is one day wider than one containing a single leap day',
    clock_independence: 'the evaluation reads no clock, locale, time zone, host or session state'
  };
}

module.exports = {
  computeElapsedPeriod,
  computeElapsedPeriodRange,
  /** The CA-NS unit's own comparison, kept reachable so the six-year path has one call site, not two. */
  evaluateSixYearPeriod,
  resolvePriorityAnchor,
  normalizeFactDate,
  isPositiveInt,
  COMPARISON_OUTCOME,
  ADAPTER_FACT_STATUS,
  RESULT_STATE,
  MAX_PERIOD_YEARS,
  calendar: { addCalendarYears, daysBetween, parseIso, isLeapYear, daysInMonth, daysFromCivil, addDays }
};
