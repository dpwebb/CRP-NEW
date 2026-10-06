'use strict';
/**
 * assessment-clock.cjs — the ONE authoritative timestamp for an assessment run.
 *
 * OWNER correction (SOL assessment date, October 6 2026): a court-enforcement limitation assessment uses the date
 * the SERVER runs the assessment, never the printed report date, never the upload date and never anything a
 * consumer request or browser clock supplies. Every deliberate reassessment/rerun takes a FRESH stamp, and every
 * record and mechanism in that run uses the SAME value.
 *
 * The calendar basis is the application's recorded convention, America/Halifax, and it is recorded explicitly in
 * every stamp (the zone decides the calendar DATE, not just the clock time: an assessment run at 02:00Z in
 * January is still the previous day in Halifax).
 *
 * The printed report date is NOT replaced here. It stays on the extraction as source provenance and is what the
 * reporting-retention and factual checks continue to read, and what a historical comparison is measured against.
 *
 * CONTROLLED TIME IN TESTS. `CRP_ASSESSMENT_CLOCK_AT` (an ISO instant) is honoured only so tests are not
 * wall-clock dependent, and any run that uses it is stamped `clock_source: 'CONTROLLED_TEST_CLOCK'`, so a
 * controlled-time run is self-evidently a test run and can never be mistaken for a server-clock production run.
 */

const CLOCK_BASIS = 'America/Halifax';
const CONTROLLED_CLOCK_ENV = 'CRP_ASSESSMENT_CLOCK_AT';

/**
 * The request fields that must NEVER supply the clock. They are ignored and named back in the run stamp, so a
 * client cannot move the assessment date and an operator can see that it tried.
 */
const CLIENT_CLOCK_FIELDS = Object.freeze([
  'assessment_run_at',
  'assessment_date',
  'assessed_at',
  'assessed_on',
  'assessment_clock_basis',
  'assessment_clock',
  'now',
  'run_at',
  'server_now',
  'report_date',
  'report_reference_date'
]);

function datePartsIn(instant, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  }).formatToParts(instant);
  const out = {};
  for (const part of parts) out[part.type] = part.value;
  return out;
}

function offsetIn(instant, timeZone) {
  const name = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' })
    .formatToParts(instant).find((p) => p.type === 'timeZoneName');
  const text = name && name.value ? name.value : 'GMT+00:00';
  const match = /GMT([+-]\d{2}:\d{2})/.exec(text);
  return match ? match[1] : '+00:00';
}

/** The calendar date in the application's own basis, as YYYY-MM-DD. Exported for the tests and the record. */
function calendarDateFor(instant, timeZone) {
  const p = datePartsIn(instant, timeZone || CLOCK_BASIS);
  return `${p.year}-${p.month}-${p.day}`;
}

/** An ISO-8601 instant carrying the basis's own offset, so the recorded instant and date always agree. */
function runAtIsoFor(instant, timeZone) {
  const zone = timeZone || CLOCK_BASIS;
  const p = datePartsIn(instant, zone);
  const hh = p.hour === '24' ? '00' : p.hour;
  return `${p.year}-${p.month}-${p.day}T${hh}:${p.minute}:${p.second}${offsetIn(instant, zone)}`;
}

/**
 * One run's stamp. `clientFields` is the request body (or any object) whose clock-bearing fields are ignored and
 * recorded; nothing in it can change the result.
 */
function runStamp(explicitInstant, clientFields) {
  const controlled = explicitInstant === undefined || explicitInstant === null;
  const fromEnv = controlled && process.env[CONTROLLED_CLOCK_ENV] ? process.env[CONTROLLED_CLOCK_ENV] : null;
  const source = !controlled ? 'EXPLICIT_INSTANT'
    : (fromEnv ? 'CONTROLLED_TEST_CLOCK' : 'SERVER_CLOCK');
  const instant = new Date(!controlled ? explicitInstant : (fromEnv || new Date().toISOString()));
  if (Number.isNaN(instant.getTime())) return runStamp(null, clientFields);
  const ignored = clientFields && typeof clientFields === 'object'
    ? CLIENT_CLOCK_FIELDS.filter((field) => Object.prototype.hasOwnProperty.call(clientFields, field))
    : [];
  return {
    assessment_run_at: runAtIsoFor(instant),
    assessment_run_at_utc: instant.toISOString(),
    assessment_date: calendarDateFor(instant),
    assessment_clock_basis: CLOCK_BASIS,
    clock_source: source,
    client_clock_fields_ignored: ignored,
    /* Stated on the stamp itself so no reader can mistake the report date for the assessment date. */
    clock_rule: 'The assessment date is the date the server ran this assessment in America/Halifax. The printed report date is kept separately as source provenance and is never used for a court-enforcement time-limit comparison.'
  };
}

/** The internet-style mail date, or null, for display: "Assessed on 2026-01-10 (America/Halifax)". */
function assessedOnLabel(stamp) {
  if (!stamp || !stamp.assessment_date) return null;
  return `Assessed on ${stamp.assessment_date} (${stamp.assessment_clock_basis || CLOCK_BASIS})`;
}

module.exports = {
  CLOCK_BASIS,
  CONTROLLED_CLOCK_ENV,
  CLIENT_CLOCK_FIELDS,
  calendarDateFor,
  runAtIsoFor,
  runStamp,
  assessedOnLabel
};
