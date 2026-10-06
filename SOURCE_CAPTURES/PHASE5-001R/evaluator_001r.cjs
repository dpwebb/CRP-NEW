'use strict';
/**
 * evaluator_001r.cjs — PHASE5-001R deliverables 2 and 3, in executable form.
 *
 * SCOPE-CA-NS-CRA-S10-3-C-LIMB-1-PR01-LASTPAYMENT only: CA / CA-NS, the rule unit
 * CA-NS-CRA-S10-3-C-LIMB-1, the first (last-payment) limb, the byte-pinned PR-01 specimen, two printed fields.
 *
 * RANK AND CHARACTER. This is a rank-8 internal artifact. It is NOT an admitted evaluator, it is NOT wired to
 * any application surface, it admits no rule, creates no coverage and authorizes no finding class. It exists to
 * make the specification executable and testable on synthetic inputs only, so that the deterministic behaviour
 * the specification claims can be measured instead of asserted. It reads no report: the caller supplies the
 * report's resolved observations and the governed rule record as data.
 *
 * The four separable layers the specification defines, in the order it defines them:
 *   F1 resolveFactStatus(observation)      — the extraction-status layer (PRESENT / ABSENT_FROM_REPORT /
 *                                            CONTRADICTED / EXTRACTION_UNRESOLVED, and the two document- and
 *                                            record-level refusals kept in their own layer)
 *   F2 compare(start, reference)           — the date-comparison layer, carrying conventions c1 to c6
 *   F3 qualify(applies)                    — the applicability-and-qualification layer
 *   F4 evaluate(input)                     — the gate chain, which composes F1 to F3 and decides emission
 *
 * It reads no clock, locale, time zone, host or session state; it holds no module-level mutable state; every
 * function is a pure function of its arguments.
 */

const UNIT_ID = 'CA-NS-CRA-S10-3-C-LIMB-1';
const SCOPE_ID = 'SCOPE-CA-NS-CRA-S10-3-C-LIMB-1-PR01-LASTPAYMENT';
const PRESENTATION_ID = 'PR-01';
const PRESENTATION_SHA256 = 'E439A4BB1E43AF640DFE7867473BE0EF8EC13B2B8654F41C31138D86A107AE5F';
const RECORDED_MAPPING = Object.freeze({
  last_payment_fact: { fact_id: 'collection.lastPaymentDate', printed_label: 'Last Payment Date', prints_in: 'a contract debt record inside the Collections section' },
  reference_date_input: { fact_id: 'report.referenceDate', printed_label: 'Request Date', prints_in: 'the page header, with one identical value on every page' },
  event_semantics: 'the last payment made on the debt, and the report request date as the evaluation reference date; neither is the date of any other event',
});
const PERIOD_YEARS = 6;

/** Extraction statuses. These are the gate's four, no more and no fewer. */
const FACT_STATUS = Object.freeze({
  PRESENT: 'PRESENT',
  ABSENT_FROM_REPORT: 'ABSENT_FROM_REPORT',
  CONTRADICTED: 'CONTRADICTED',
  EXTRACTION_UNRESOLVED: 'EXTRACTION_UNRESOLVED',
});

/**
 * Document-level and record-level dispositions. They are NOT extraction statuses: they describe the document
 * or the region, and keeping them in this separate layer is what prevents a refused document from ever being
 * reported as an empty report, or a non-debt region from ever being read for a value.
 */
const DOCUMENT_STATE = Object.freeze({
  ELIGIBLE: 'ELIGIBLE',
  REFUSED: 'REFUSED',
});
const RECORD_DISPOSITION = Object.freeze({
  CONTRACT_DEBT_RECORD: 'CONTRACT_DEBT_RECORD',
  NOT_A_DEBT_RECORD: 'NOT_A_DEBT_RECORD',
});

const COMPARISON_OUTCOME = Object.freeze({
  PERIOD_EXCEEDED: 'PERIOD_EXCEEDED',
  PERIOD_NOT_EXCEEDED: 'PERIOD_NOT_EXCEEDED',
  UNRESOLVED: 'UNRESOLVED',
});
const BOUNDARY_CASE = Object.freeze({
  EXACTLY_AT_SIX_YEAR_ANNIVERSARY: 'BOUNDARY_CASE_EXACTLY_AT_SIX_YEAR_ANNIVERSARY',
});

/** Every refusal state of this unit, named. The gate names five emission conditions; each has one of these. */
const REFUSALS = Object.freeze({
  NO_JURISDICTION_SELECTION: 'REFUSED_NO_JURISDICTION_SELECTION_SUPPLIED',
  JURISDICTION_NOT_THIS_UNIT: 'REFUSED_JURISDICTION_NOT_AUTHORIZED_FOR_THIS_UNIT',
  UNSUPPORTED_PRESENTATION: 'REFUSED_UNSUPPORTED_PRESENTATION',
  WRONG_EVENT_DATE_MAPPING: 'REFUSED_WRONG_EVENT_DATE_MAPPING',
  RULE_RECORD_NOT_ADMITTED: 'REFUSED_RULE_RECORD_NOT_ADMITTED',
  UNRESOLVED_AFFIRMATIVE_ELEMENT: 'REFUSED_UNRESOLVED_AFFIRMATIVE_ELEMENT',
});
const EMISSION = Object.freeze({
  NOT_EMITTED: 'NOT_EMITTED',
  NO_CONSUMER_SURFACE_AND_NO_FINDING_CLASS_AUTHORIZED: 'NOT_EMITTED_NO_CONSUMER_SURFACE_AND_NO_FINDING_CLASS_AUTHORIZED',
});

// ---------------------------------------------------------------- proleptic Gregorian integer day arithmetic
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function isLeapYear(y) { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; }
function daysInMonth(y, m) { return [31, isLeapYear(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]; }

function parseIso(iso) {
  const match = ISO_DATE.exec(iso || '');
  if (!match) return null;
  const y = Number(match[1]); const m = Number(match[2]); const d = Number(match[3]);
  if (m < 1 || m > 12 || d < 1 || d > daysInMonth(y, m)) return null;
  return { y, m, d };
}

/** Days since 1970-01-01, integer arithmetic only. No clock, no time zone, no locale. */
function daysFromCivil(y, m, d) {
  const yy = m <= 2 ? y - 1 : y;
  const era = Math.floor(yy / 400);
  const yoe = yy - era * 400;
  const doy = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + d - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

function daysBetween(fromIso, toIso) {
  const a = parseIso(fromIso); const b = parseIso(toIso);
  if (!a || !b) return null;
  return daysFromCivil(b.y, b.m, b.d) - daysFromCivil(a.y, a.m, a.d);
}

/** Convention c1 with the c2 clamp: add calendar years, a 29 February start clamping to 28 February. */
function addCalendarYears(iso, years) {
  const p = parseIso(iso);
  if (!p) return null;
  const year = p.y + years;
  const day = Math.min(p.d, daysInMonth(year, p.m));
  return `${String(year).padStart(4, '0')}-${String(p.m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// ---------------------------------------------------------------- F1: the extraction-status layer
/**
 * Resolve one fact's extraction status from the caller's recorded observations of the located scope. This
 * function decides nothing legally and compares nothing: it maps observations to the gate's four statuses.
 *
 * `observation` for the rule-read fact:
 *   { section_state: 'RESOLVED' | 'NOT_RESOLVED', section_reason,
 *     contract_debt_record_count, region: { record_disposition, label_occurrences: [ { token, value_present } ] } }
 * `observation` for the reference-date input:
 *   { label_present_on_pages: [page numbers], page_count, tokens: [printed tokens in page order] }
 */
function resolveFactStatus(factId, observation) {
  const base = { fact_id: factId, status: null, reason: null, raw_value: null, normalized_value: null };
  const done = (status, reason, extra) => Object.assign({}, base, { status, reason }, extra || {});

  if (factId === 'report.referenceDate') {
    const pages = observation.label_present_on_pages || [];
    const tokens = observation.tokens || [];
    if (pages.length === 0) return done(FACT_STATUS.EXTRACTION_UNRESOLVED, 'HEADER_LABEL_NOT_FOUND');
    if (pages.length !== observation.page_count) return done(FACT_STATUS.EXTRACTION_UNRESOLVED, 'HEADER_LABEL_NOT_ON_EVERY_PAGE');
    const distinct = [...new Set(tokens)];
    if (distinct.length > 1) return done(FACT_STATUS.CONTRADICTED, 'REQUEST_DATE_DIFFERS_BETWEEN_PAGES', { distinct_token_count: distinct.length });
    const token = distinct[0];
    const parsed = parseIso(normalizePrinted(token));
    if (!parsed) return done(FACT_STATUS.EXTRACTION_UNRESOLVED, 'REQUEST_DATE_NOT_A_WELL_FORMED_PRINTED_DATE');
    return done(FACT_STATUS.PRESENT, null, { raw_value: token, normalized_value: normalizePrinted(token) });
  }

  if (factId === 'collection.lastPaymentDate') {
    if (observation.section_state !== 'RESOLVED') {
      return done(FACT_STATUS.EXTRACTION_UNRESOLVED, observation.section_reason || 'SECTION_NOT_RESOLVED');
    }
    if (observation.section_prints_no_contract_debt_record === true) {
      // The single reachable ABSENT_FROM_REPORT path: the section is located and resolved and prints no
      // contract debt record. It is a resolved reading, never a parser silence. A label printed inside the
      // section but outside any contract debt record is NOT that clean reading: the field appears in the
      // section without a record to bind it to, and a value is never read outside a record, so the fact stays
      // unresolved rather than being reported as absent.
      if (observation.stray_label_outside_any_contract_debt_record === true) {
        return done(FACT_STATUS.EXTRACTION_UNRESOLVED, 'FIELD_LABEL_OUTSIDE_ANY_RECORD');
      }
      return done(FACT_STATUS.ABSENT_FROM_REPORT, 'SECTION_LOCATED_AND_RESOLVED_WITH_NO_CONTRACT_DEBT_RECORD');
    }
    const region = observation.region;
    if (!region || region.record_disposition !== RECORD_DISPOSITION.CONTRACT_DEBT_RECORD) {
      // a region that is not the contract's debt record is never read for a value; that is a record-level
      // disposition, not an extraction status, so no fact status is produced here.
      return done(null, 'NOT_A_DEBT_RECORD', { record_disposition: RECORD_DISPOSITION.NOT_A_DEBT_RECORD });
    }
    const occurrences = region.label_occurrences || [];
    if (occurrences.length === 0) return done(FACT_STATUS.EXTRACTION_UNRESOLVED, 'LABEL_NOT_PRINTED_ON_RECORD');
    if (occurrences.length > 1) return done(FACT_STATUS.EXTRACTION_UNRESOLVED, 'LABEL_PRINTED_MORE_THAN_ONCE_IN_RECORD', { occurrence_count: occurrences.length });
    const only = occurrences[0];
    if (!only.value_present) return done(FACT_STATUS.EXTRACTION_UNRESOLVED, 'LABEL_PRINTED_WITHOUT_VALUE');
    const printed = normalizePrinted(only.token);
    if (!parseIso(printed)) return done(FACT_STATUS.EXTRACTION_UNRESOLVED, 'VALUE_NOT_A_WELL_FORMED_PRINTED_DATE');
    return done(FACT_STATUS.PRESENT, null, { raw_value: only.token, normalized_value: printed });
  }

  throw new Error('REFUSED_INTERNAL_INVARIANT: unknown fact id ' + factId);
}

/** This presentation prints DDDD/DD/DD (four-digit year, month, day). Any other form is not this form. */
function normalizePrinted(token) {
  const m = /^(\d{4})\/(\d{2})\/(\d{2})$/.exec(String(token || ''));
  if (!m) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

// ---------------------------------------------------------------- F2: the date-comparison layer
/**
 * The comparison, carrying the six recorded conventions. Conventions c1 to c5 are arithmetic; c6 withholds the
 * outcome on the exact sixth-anniversary day. The boundary test is an exact date equality evaluated BEFORE the
 * "greater than" branch, so the withheld day can never fall into PERIOD_NOT_EXCEEDED by accident of ordering.
 */
function compare(clockStart, referenceDate) {
  const carried = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'];
  const un = (reason, extra) => Object.assign({
    comparison_outcome: COMPARISON_OUTCOME.UNRESOLVED, reason,
    anniversary: null, span_in_days: null, elapsed_days: null, boundary_case: null,
    conventions_carried: carried,
  }, extra || {});

  if (!parseIso(clockStart)) return un('LAST_PAYMENT_DATE_NOT_A_RESOLVED_DATE', { clock_start: clockStart, reference_date: referenceDate });
  if (!parseIso(referenceDate)) return un('REFERENCE_DATE_NOT_A_RESOLVED_DATE', { clock_start: clockStart, reference_date: referenceDate });

  const anniversary = addCalendarYears(clockStart, PERIOD_YEARS);
  const span = daysBetween(clockStart, anniversary);
  const elapsed = daysBetween(clockStart, referenceDate);
  const base = { clock_start: clockStart, reference_date: referenceDate, anniversary, span_in_days: span, elapsed_days: elapsed, conventions_carried: carried, comparison: 'elapsed_days > span_in_days' };

  if (elapsed < 0) return un('REFERENCE_DATE_PRECEDES_THE_STATED_LAST_PAYMENT', Object.assign(base, { boundary_case: null }));
  if (elapsed === span) {
    return un('THE_REFERENCE_DATE_IS_THE_SIXTH_ANNIVERSARY_AND_THE_TEXT_DOES_NOT_SETTLE_INCLUSION',
      Object.assign(base, { boundary_case: BOUNDARY_CASE.EXACTLY_AT_SIX_YEAR_ANNIVERSARY }));
  }
  if (elapsed > span) return Object.assign(base, { comparison_outcome: COMPARISON_OUTCOME.PERIOD_EXCEEDED, reason: null, boundary_case: null });
  return Object.assign(base, { comparison_outcome: COMPARISON_OUTCOME.PERIOD_NOT_EXCEEDED, reason: null, boundary_case: null });
}

// ---------------------------------------------------------------- F3: the applicability-and-qualification layer
/**
 * The qualifications are carried, not invented: they are read out of the governed rule record the evaluator is
 * given. Every one of them narrows what the unit may say.
 */
function qualify(ruleRecord) {
  const q = (ruleRecord && ruleRecord.consumer_facing_qualifications) || {};
  const timing = q.timing || {};
  const classification = q.classification || {};
  const boundary = q.boundary || {};
  const specimen = q.specimen || {};
  return {
    applicability: {
      jurisdiction: 'explicit CA / CA-NS selection required; never inferred',
      limb: 'first limb only — six years after the last payment was made on the debt',
      temporal: (ruleRecord && ruleRecord.applicability && ruleRecord.applicability.temporal_half) || 'UNRESOLVED_MISSING_EVIDENCE',
    },
    qualifications: {
      timing: { mandatory: timing.mandatory === true, text: timing.text || null },
      classification: { mandatory: classification.mandatory === true, text: classification.text || null },
      boundary: { mandatory_when_reached: boundary.mandatory_when_reached === true, text: boundary.text || null, mandatory_here: false },
      specimen: { mandatory: specimen.mandatory === true, text: specimen.text || null },
    },
    unresolved_items_carried: (ruleRecord && ruleRecord.unresolved_dependencies_carried) || [],
    effect: 'every qualification narrows what may be said; none widens it',
  };
}

// ---------------------------------------------------------------- F4: the gate chain, and emission
/**
 * The evaluator. Its inputs are the caller's explicit selection, the caller's recorded observations of the
 * uploaded report, the caller's declared event-date mapping, and the governed rule record. It reads nothing
 * else: no clock, no locale, no time zone, no host, no session state, no module-level mutable state.
 *
 * The gates are evaluated in a fixed order and every gate's state is recorded, so the refusal is the FIRST
 * failing gate and never depends on which failure happened to be noticed first.
 */
const GATE_ORDER = Object.freeze([
  'G1_JURISDICTION_SELECTION_SUPPLIED',
  'G2_JURISDICTION_AUTHORIZED_FOR_THIS_UNIT',
  'G3_PRESENTATION_ELIGIBILITY',
  'G4_EVENT_DATE_MAPPING',
  'G5_NO_UNRESOLVED_AFFIRMATIVE_ELEMENT',
  'G6_RULE_RECORD_ADMITTED',
]);

function evaluate(input) {
  const i = input || {};
  const selection = i.selection || {};
  const presentation = i.presentation || {};
  const declared = i.declared_event_date_mapping || {};
  const report = i.report || {};
  const ruleRecord = i.rule_record || {};
  const admission = (ruleRecord.admission_state || {}).state || 'NOT_RECORDED';

  const gates = [];
  const gate = (id, passed, detail, refusal) => gates.push({ gate: id, passed, detail, refusal: passed ? null : refusal });
  const sameMapping = (a, b) => Boolean(a && b && a.fact_id === b.fact_id && a.printed_label === b.printed_label);
  const documentEligible = presentation.document_state === DOCUMENT_STATE.ELIGIBLE
    && presentation.presentation_id === PRESENTATION_ID
    && String(presentation.sha256 || '').toUpperCase() === PRESENTATION_SHA256;

  gate('G1_JURISDICTION_SELECTION_SUPPLIED', Boolean(selection.country_code && selection.region_code),
    selection.country_code && selection.region_code ? selection.country_code + ' / ' + selection.region_code : 'no explicit selection supplied',
    REFUSALS.NO_JURISDICTION_SELECTION);
  gate('G2_JURISDICTION_AUTHORIZED_FOR_THIS_UNIT', selection.country_code === 'CA' && selection.region_code === 'CA-NS',
    'this unit is authorized only for CA / CA-NS', REFUSALS.JURISDICTION_NOT_THIS_UNIT);
  gate('G3_PRESENTATION_ELIGIBILITY', documentEligible,
    documentEligible ? 'the documented contract shape and the evidenced digest' : (presentation.document_refusal_cause || 'NOT_THE_EVIDENCED_SPECIMEN'),
    REFUSALS.UNSUPPORTED_PRESENTATION);
  gate('G4_EVENT_DATE_MAPPING',
    sameMapping(declared.last_payment_fact, RECORDED_MAPPING.last_payment_fact) && sameMapping(declared.reference_date_input, RECORDED_MAPPING.reference_date_input),
    'the declared mapping must be exactly the recorded mapping, both event roles included', REFUSALS.WRONG_EVENT_DATE_MAPPING);
  const affirmativeUnresolved = i.second_limb_input_present === true || i.other_unresolved_affirmative_element === true;
  gate('G5_NO_UNRESOLVED_AFFIRMATIVE_ELEMENT', !affirmativeUnresolved,
    affirmativeUnresolved ? 'an input resolving to the excluded second limb, or another unresolved affirmative element, was supplied' : 'none: the first limb has no unresolved affirmative element on this reading',
    REFUSALS.UNRESOLVED_AFFIRMATIVE_ELEMENT);
  gate('G6_RULE_RECORD_ADMITTED', admission === 'ADMITTED',
    'the governed rule record for this unit is ' + admission, REFUSALS.RULE_RECORD_NOT_ADMITTED);

  const firstFailing = gates.find((g) => !g.passed) || null;
  const documentLayerRuns = gates[0].passed && gates[1].passed && gates[2].passed && gates[3].passed;
  const comparisonLayerRuns = documentLayerRuns && gates[4].passed && gates[5].passed;

  let facts = { state: 'NOT_RUN_DOCUMENT_OR_MAPPING_GATE_FAILED', reference_date: null, last_payment: null };
  let comparisons = { state: 'NOT_RUN', gate_that_stopped_it: firstFailing ? firstFailing.gate : null, per_record: [] };

  if (documentLayerRuns) {
    const referenceDate = resolveFactStatus('report.referenceDate', report.reference_date_observation || {});
    const collections = report.collections || {};
    const records = collections.contract_debt_records || [];
    const perRecord = records.map((region) => {
      const disposition = region.record_disposition || RECORD_DISPOSITION.CONTRACT_DEBT_RECORD;
      return {
        record_index: region.record_index,
        disposition,
        last_payment_fact: resolveFactStatus('collection.lastPaymentDate', {
          section_state: collections.section_state, section_reason: collections.section_reason,
          region: Object.assign({}, region, { record_disposition: disposition }),
        }),
      };
    });
    const unitLevel = perRecord.length === 0
      ? resolveFactStatus('collection.lastPaymentDate', {
        section_state: collections.section_state, section_reason: collections.section_reason,
        section_prints_no_contract_debt_record: true,
        stray_label_outside_any_contract_debt_record: collections.stray_label_outside_any_contract_debt_record === true,
      })
      : null;
    facts = {
      state: 'RUN', reference_date: referenceDate,
      last_payment: {
        unit_level: unitLevel, per_record: perRecord,
        isolation: 'one fact per contract debt record, bound to its own record; no value is ever borrowed across records, sections or pages',
      },
    };
  }

    if (comparisonLayerRuns && facts.last_payment.per_record.length > 0) {
      const referenceValue = facts.reference_date.status === FACT_STATUS.PRESENT ? facts.reference_date.normalized_value : null;
      comparisons = {
        state: 'RUN', gate_that_stopped_it: null,
        per_record: facts.last_payment.per_record.map((r) => {
          const startValue = r.last_payment_fact.status === FACT_STATUS.PRESENT ? r.last_payment_fact.normalized_value : null;
          if (startValue === null || referenceValue === null) {
            return {
              record_index: r.record_index, comparison_outcome: COMPARISON_OUTCOME.UNRESOLVED,
              reason: 'THE_COMPARISON_DOES_NOT_RUN_UNLESS_BOTH_THE_CLOCK_START_AND_THE_REFERENCE_DATE_ARE_PRESENT',
              anniversary: null, span_in_days: null, elapsed_days: null, boundary_case: null,
              conventions_carried: ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'],
            };
          }
          return Object.assign({ record_index: r.record_index }, compare(startValue, referenceValue));
        }),
      };
    } else if (documentLayerRuns && !comparisonLayerRuns) {
      comparisons.state = 'NOT_RUN';
    } else if (documentLayerRuns) {
      comparisons = { state: 'NOT_RUN_NO_CONTRACT_DEBT_RECORD', gate_that_stopped_it: null, per_record: [] };
    }

  const qualification = qualify(ruleRecord);
  const boundaryReached = comparisons.state === 'RUN'
    && comparisons.per_record.some((c) => c.boundary_case === BOUNDARY_CASE.EXACTLY_AT_SIX_YEAR_ANNIVERSARY);
  qualification.qualifications.boundary.mandatory_here = boundaryReached;

  return {
    spec: 'CA-NS-CRA-S10-3-C-LIMB-1 report evaluation specification, PHASE5-001R',
    unit_id: UNIT_ID,
    scope_id: SCOPE_ID,
    gates,
    first_failing_gate: firstFailing ? firstFailing.gate : null,
    refusal: firstFailing ? firstFailing.refusal : null,
    outcome: firstFailing ? null : { per_record_comparisons: comparisons.per_record, not_a_finding: true },
    facts,
    comparisons,
    applicability_and_qualifications: qualification,
    observation_eligibility: {
      permitted_result_ceiling: 'OBSERVATION_CLASS_ONLY',
      permitted_conclusion: 'observation',
      determinability: 'D3',
      recorded_conclusion: 'REPORT_RELEVANT_BUT_NOT_DETECTABLE',
      finding_classes_available: [],
      packet_eligible: false,
      consumer_visible: false,
      reachable_from_a_consumer_surface: false,
      observation_state: 'INTERNAL_OBSERVATION_RECORD_ONLY',
    },
    emission: firstFailing
      ? { state: EMISSION.NOT_EMITTED, first_failing_gate: firstFailing.gate, refusal: firstFailing.refusal }
      : { state: EMISSION.NO_CONSUMER_SURFACE_AND_NO_FINDING_CLASS_AUTHORIZED, first_failing_gate: null, refusal: null },
    forbidden_renderings: ['VIOLATION', 'PROBABLE_VIOLATION', 'BREACH_ESTABLISHED', 'COMPLIANT', 'WITHIN_THE_LIMIT'],
    determinism: {
      clock_independence: true,
      module_level_mutable_state: false,
      reads_only: ['the caller\'s explicit selection', 'the caller\'s recorded observations of the report', 'the caller\'s declared event-date mapping', 'the governed rule record'],
    },
  };
}

module.exports = {
  UNIT_ID, SCOPE_ID, PRESENTATION_ID, PRESENTATION_SHA256, RECORDED_MAPPING, PERIOD_YEARS,
  FACT_STATUS, DOCUMENT_STATE, RECORD_DISPOSITION, COMPARISON_OUTCOME, BOUNDARY_CASE, REFUSALS, EMISSION, GATE_ORDER,
  resolveFactStatus, compare, qualify, evaluate, normalizePrinted,
  parseIso, isLeapYear, daysInMonth, daysFromCivil, daysBetween, addCalendarYears,
};




