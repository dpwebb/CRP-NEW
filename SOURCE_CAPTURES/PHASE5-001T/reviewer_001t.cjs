'use strict';
/**
 * reviewer_001t.cjs — PHASE5-001T deliverable 3, the independent side of it.
 *
 * The independent reviewer reproduces a sample of each result from the source pin and the report excerpt,
 * WITHOUT seeing the evaluator or its output. It therefore:
 *   - does NOT require, import, read or name the executable evaluator, and does not read its output anywhere;
 *   - carries its own date arithmetic, written as a different algorithm from the specification's day-count
 *     helper (a whole-year and whole-month accumulation, not a civil-day formula);
 *   - derives every expectation from the accepted source pin read at its recorded digest, from the report
 *     excerpt as the register records it, and from the pinned specification's own convention and decision-rule
 *     text.
 *
 * Its expectations are frozen to a file by the comparison harness BEFORE any result is read, and the order of
 * operations is recorded. Its independence is procedural and is recorded as such, with its limits.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = 'C:\\CRP-NEW';
const LEGACY = 'C:\\Users\\webbd\\crp-credit-app';
const SPECIALISATION = 'SOURCE_CAPTURES\\PHASE5-001T\\reviewer_001t.cjs';

const READ = {
  source_pin: 'C:\\Users\\webbd\\crp-credit-app\\packages\\backend\\src\\services\\legalCorpus\\rules.canada.ts',
  report_excerpt: 'C:\\CRP-NEW\\SOURCE_CAPTURES\\PROD-003\\report_representation_register.json',
  specification_text: 'C:\\CRP-NEW\\SOURCE_CAPTURES\\PHASE5-001R\\deterministic_evaluator_specification.json',
  status_vocabulary_text: 'C:\\CRP-NEW\\SOURCE_CAPTURES\\PHASE5-001R\\extraction_status_vocabulary.json',
  rule_record_text: 'C:\\CRP-NEW\\SOURCE_CAPTURES\\PHASE5-001Q\\rule_record.json',
  work_order_pins: 'C:\\CRP-NEW\\SOURCE_CAPTURES\\PHASE5-001S\\next_work_order.json',
};
const NOT_READ = [
  'SOURCE_CAPTURES\\PHASE5-001R\\evaluator_001r.cjs (the executable form) — not required, not imported, not read',
  'SOURCE_CAPTURES\\PHASE5-001T\\fixtures_001t.cjs (which loads the executable form for its constants) — not required',
  'any result record of this order: no fixture result, no negative-test result and no evaluator output was read before these expectations were written',
];
const PINNED_DIGESTS = {
  source_pin: '90A05625AFEC4F81BDEB6568249BDEE5A45C178A20026FEA9D4F50A18AF174CF',
  report_excerpt: '2F03DBC807EB1475F97B2FE974E8A4CF752A09475D6B7F371AB62F1BC190036A',
  specification_text: '6D92F4296EAE573D78B567BA0E482ABDA5708DD87C913F58BBA378C678D20755',
  status_vocabulary_text: 'FBD1EDFE8BA7B2CDD00174771D1B99615371FF414B42C941AF537D167AE273A7',
  rule_record_text: 'C24CA3FD3AA38FC7C789BD29D91EAC36DCA989DE5AAD923CF88D2AEAC401F023',
};

function sha256(p) { return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex').toUpperCase(); }
function text(p) { return fs.readFileSync(p, 'utf8'); }
function json(p) { return JSON.parse(text(p)); }

// ---------------------------------------------------------------- the reviewer's own arithmetic
function isALeapYear(y) { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; }
function monthLengths(y) { return [31, isALeapYear(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]; }
function parse(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return null;
  const y = Number(m[1]); const mo = Number(m[2]); const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > monthLengths(y)[mo - 1]) return null;
  return { y, m: mo, d };
}
/** whole days from 0001-01-01, accumulated a year and a month at a time: a different algorithm */
function dayNumber(iso) {
  const p = parse(iso);
  if (!p) return null;
  let days = 0;
  for (let y = 1; y < p.y; y++) days += isALeapYear(y) ? 366 : 365;
  const ml = monthLengths(p.y);
  for (let m = 1; m < p.m; m++) days += ml[m - 1];
  return days + (p.d - 1);
}
function elapsedDays(fromIso, toIso) { return dayNumber(toIso) - dayNumber(fromIso); }
/** convention c1 with the c2 clamp, written from the convention text rather than from any code */
function anniversaryOf(iso, years) {
  const p = parse(iso);
  if (!p) return null;
  const y = p.y + years;
  const limit = monthLengths(y)[p.m - 1];
  const d = p.d > limit ? limit : p.d;
  return String(y).padStart(4, '0') + '-' + String(p.m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
}
function comparisonOf(clockStart, referenceDate) {
  const anniversary = anniversaryOf(clockStart, 6);
  const span = elapsedDays(clockStart, anniversary);
  const elapsed = elapsedDays(clockStart, referenceDate);
  const conventions = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'];
  const base = { clock_start: clockStart, reference_date: referenceDate, anniversary, span_in_days: span, elapsed_days: elapsed, conventions_carried: conventions };
  if (elapsed < 0) return Object.assign(base, { comparison_outcome: 'UNRESOLVED', reason: 'REFERENCE_DATE_PRECEDES_THE_STATED_LAST_PAYMENT', boundary_case: null, outcome_withheld: false });
  if (elapsed === span) return Object.assign(base, { comparison_outcome: 'UNRESOLVED', reason: 'THE_REFERENCE_DATE_IS_THE_SIXTH_ANNIVERSARY_AND_THE_TEXT_DOES_NOT_SETTLE_INCLUSION', boundary_case: 'BOUNDARY_CASE_EXACTLY_AT_SIX_YEAR_ANNIVERSARY', outcome_withheld: true });
  if (elapsed > span) return Object.assign(base, { comparison_outcome: 'PERIOD_EXCEEDED', reason: null, boundary_case: null, outcome_withheld: false });
  return Object.assign(base, { comparison_outcome: 'PERIOD_NOT_EXCEEDED', reason: null, boundary_case: null, outcome_withheld: false });
}

// ---------------------------------------------------------------- what the reviewer reads, and what it finds
const SOURCE_PIN_SHA = sha256(READ.source_pin);
const REPORT_SHA = sha256(READ.report_excerpt);
const SPEC_SHA = sha256(READ.specification_text);
const STATUS_SHA = sha256(READ.status_vocabulary_text);
const RULE_SHA = sha256(READ.rule_record_text);

const pinLines = text(READ.source_pin).split(/\r?\n/);
/** the rule-corpus rendering of the provision: the concatenated statutory text of the rule entry */
const ruleCorpusRendering = (() => {
  const at = pinLines.findIndex((l) => l.indexOf('requiredReportFields: ["tradeline.lastPaymentDate"]') !== -1);
  const start = pinLines.slice(0, at).reduce((best, l, i) => (/"A consumer reporting agency shall not include/.test(l) ? i : best), 0);
  const quoted = pinLines.slice(start, at)
    .map((l) => l.replace(/^\s*/, ''))
    .join(' ')
    .split('"')
    .filter((s, i) => i % 2 === 1)
    .join('');
  return {
    lines: 'the accepted source pin, the rule entry for this unit: the concatenated statutory text immediately above requiredReportFields',
    quote: quoted.replace(/\s+/g, ' ').trim(),
  };
})();
/** the timing-determination rendering of the provision */
const timingRendering = (() => {
  const at = pinLines.findIndex((l) => l.indexOf('statedInProvision:') !== -1);
  const quoted = pinLines.slice(at, at + 3)
    .join(' ')
    .split('"')
    .filter((s, i) => i % 2 === 1)
    .join('');
  return { lines: 'the accepted source pin, the NS_S10_3_C_TIMING determination, its statedInProvision', quote: quoted.replace(/\s+/g, ' ').trim() };
})();

const register = json(READ.report_excerpt);
const fact02 = register.field_records.filter((f) => f.field_id === 'FACT-02')[0];
const fact03 = register.field_records.filter((f) => f.field_id === 'FACT-03')[0];
const demonstration = register.deterministic_evaluation_demonstration;
const ruleRecordText = json(READ.rule_record_text);
const spec = json(READ.specification_text);
const statusVocab = json(READ.status_vocabulary_text);

/** the transcription identity the reviewer reproduces from the source pin itself */
const transcriptionCheck = (() => {
  const recorded = ruleRecordText.legal_proposition.statutory_text_quoted_verbatim.replace(/\s+/g, ' ').trim();
  const fromCorpus = ruleCorpusRendering.quote.replace(/\s+/g, ' ').trim();
  const fromTiming = timingRendering.quote.replace(/\s+/g, ' ').trim();
  return {
    recorded_statutory_text: recorded,
    reproduced_from_the_source_pin_rule_corpus_rendering: fromCorpus,
    reproduced_from_the_source_pin_timing_rendering: fromTiming,
    the_rule_corpus_rendering_matches_the_record_exactly: fromCorpus === recorded,
    both_renderings_state_the_same_period_and_the_same_start:
      /six years/.test(fromCorpus) && /last payment was made on the debt/.test(fromCorpus)
      && /six years/.test(fromTiming) && /last payment was made on the debt/.test(fromTiming),
    neither_rendering_states_a_comparison_date_a_boundary_rule_or_a_day_count:
      !/reference date|comparison date|measuring date|day count|\binclusive\b|\bexclusive\b|boundary/i.test(fromCorpus)
      && !/reference date|comparison date|measuring date|day count|\binclusive\b|\bexclusive\b|boundary/i.test(fromTiming),
    source_pin_sha256: SOURCE_PIN_SHA,
    source_pin_sha256_matches_the_recorded_pin: SOURCE_PIN_SHA === PINNED_DIGESTS.source_pin,
    what_the_text_does_not_state: ruleRecordText.legal_proposition.what_the_text_does_not_state,
  };
})();

// ---------------------------------------------------------------- the sample, and what each sample must be
const FROM_THE_REGISTER = 'the report excerpt as the register records it: field FACT-02 (Last Payment Date) and field FACT-03 (Request Date), and the register\'s own demonstration of the arithmetic on this specimen';
const FROM_THE_PIN = 'the accepted source pin, read at its recorded digest, and the provision text reproduced from it';
const FROM_THE_SPEC_TEXT = 'the pinned deterministic evaluator specification, read as text: its six conventions, its fixed gate order, its decision rules R1 to R6 and its status rules S1 to S7';

const S = [];
function sample(o) { S.push(o); return o; }

sample({
  id: 'RS-01',
  reproduces: 'the evidenced specimen: both facts PRESENT, the arithmetic PERIOD_NOT_EXCEEDED',
  values: { clock_start: fact02.raw_value_observed, reference_date: fact03.raw_value_observed },
  derived_from: [FROM_THE_REGISTER, FROM_THE_PIN, FROM_THE_SPEC_TEXT],
  expectation: Object.assign(
    { fact_statuses: { last_payment: 'PRESENT', reference_date: 'PRESENT' }, refusal: null },
    comparisonOf('2021-02-01', '2026-05-05'),
    {
      the_registers_own_demonstration: {
        intervening_days: demonstration.inputs.intervening_days,
        six_year_span_in_days: demonstration.inputs.six_year_span_in_days,
        six_year_boundary_from_last_payment: demonstration.inputs.six_year_boundary_from_last_payment,
        result_on_this_specimen: demonstration.result_on_this_specimen,
      },
      ties_to_the_registers_own_demonstration: demonstration.inputs.intervening_days === 1919
        && demonstration.inputs.six_year_span_in_days === 2191
        && demonstration.result_on_this_specimen === 'PERIOD_NOT_EXCEEDED',
    }),
});

sample({
  id: 'RS-02',
  reproduces: 'a clear breach of the arithmetic: PERIOD_EXCEEDED',
  values: { clock_start: '2019-01-01', reference_date: '2026-05-05' },
  derived_from: [FROM_THE_SPEC_TEXT, FROM_THE_PIN],
  expectation: Object.assign({ refusal: null, fact_statuses: { last_payment: 'PRESENT' } }, comparisonOf('2019-01-01', '2026-05-05')),
});

sample({
  id: 'RS-03',
  reproduces: 'the exact sixth-anniversary day: the outcome is WITHHELD',
  values: { clock_start: '2021-02-01', reference_date: '2027-02-01' },
  derived_from: [FROM_THE_SPEC_TEXT, FROM_THE_PIN],
  expectation: Object.assign({ refusal: null, fact_statuses: { last_payment: 'PRESENT' } }, comparisonOf('2021-02-01', '2027-02-01')),
});

sample({
  id: 'RS-04',
  reproduces: 'a 29 February start: convention c2 clamps the anniversary, and the clamped day is itself withheld',
  values: { clock_start: '2016-02-29', reference_date: '2022-02-28' },
  derived_from: [FROM_THE_SPEC_TEXT, FROM_THE_PIN],
  expectation: Object.assign({ refusal: null, fact_statuses: { last_payment: 'PRESENT' } }, comparisonOf('2016-02-29', '2022-02-28')),
});

sample({
  id: 'RS-05',
  reproduces: 'the day before the clamped anniversary',
  values: { clock_start: '2016-02-29', reference_date: '2022-02-27' },
  derived_from: [FROM_THE_SPEC_TEXT],
  expectation: Object.assign({ refusal: null, fact_statuses: { last_payment: 'PRESENT' } }, comparisonOf('2016-02-29', '2022-02-27')),
});

sample({
  id: 'RS-06',
  reproduces: 'the day after the clamped anniversary',
  values: { clock_start: '2016-02-29', reference_date: '2022-03-01' },
  derived_from: [FROM_THE_SPEC_TEXT],
  expectation: Object.assign({ refusal: null, fact_statuses: { last_payment: 'PRESENT' } }, comparisonOf('2016-02-29', '2022-03-01')),
});

sample({
  id: 'RS-07',
  reproduces: 'a reference date before the printed last payment date',
  values: { clock_start: '2020-06-15', reference_date: '2020-05-01' },
  derived_from: [FROM_THE_SPEC_TEXT],
  expectation: Object.assign({ refusal: null, fact_statuses: { last_payment: 'PRESENT' } }, comparisonOf('2020-06-15', '2020-05-01')),
});

sample({
  id: 'RS-08',
  reproduces: 'a report contradiction: the header carries two different Request Dates',
  values: { clock_start: '2021-02-01' },
  derived_from: [FROM_THE_SPEC_TEXT, 'the pinned extraction-status vocabulary'],
  expectation: { reference_date_status: 'CONTRADICTED', reference_date_reason: 'REQUEST_DATE_DIFFERS_BETWEEN_PAGES', comparison_runs: false, refusal: null },
});

sample({
  id: 'RS-09',
  reproduces: 'a date unavailable: the record prints the label with no value',
  values: { clock_start: '2021-02-01', reference_date: '2026-05-05' },
  derived_from: [FROM_THE_SPEC_TEXT, 'the pinned extraction-status vocabulary'],
  expectation: { last_payment_status: 'EXTRACTION_UNRESOLVED', last_payment_reason: 'LABEL_PRINTED_WITHOUT_VALUE', comparison_outcome: 'UNRESOLVED', refusal: null },
});

sample({
  id: 'RS-10',
  reproduces: 'the single absence path: the section is resolved and prints no contract debt record',
  values: { reference_date: '2026/05/05' },
  derived_from: [FROM_THE_SPEC_TEXT, 'the pinned extraction-status vocabulary'],
  expectation: { unit_level_status: 'ABSENT_FROM_REPORT', unit_level_reason: 'SECTION_LOCATED_AND_RESOLVED_WITH_NO_CONTRACT_DEBT_RECORD', refusal: null },
});

sample({
  id: 'RS-11',
  reproduces: 'a report section that was never inspected',
  values: { reference_date: '2026/05/05' },
  derived_from: [FROM_THE_SPEC_TEXT],
  expectation: { unit_level_status: 'EXTRACTION_UNRESOLVED', unit_level_reason: 'SECTION_NOT_INSPECTED', refusal: null },
});

sample({
  id: 'RS-12',
  reproduces: 'a document that declares itself a fixture: the presentation gate refuses it',
  values: { reference_date: '2026/05/05' },
  derived_from: [FROM_THE_SPEC_TEXT, 'the pinned extraction-status vocabulary'],
  expectation: { refusal: 'REFUSED_UNSUPPORTED_PRESENTATION', first_failing_gate: 'G3_PRESENTATION_ELIGIBILITY', facts_layer_runs: false },
});

sample({
  id: 'RS-13',
  reproduces: 'a declared event-date mapping other than the recorded one',
  values: { reference_date: '2026/05/05' },
  derived_from: [FROM_THE_SPEC_TEXT, FROM_THE_REGISTER],
  expectation: { refusal: 'REFUSED_WRONG_EVENT_DATE_MAPPING', first_failing_gate: 'G4_EVENT_DATE_MAPPING', facts_layer_runs: false },
});

sample({
  id: 'RS-14',
  reproduces: 'an input resolving to the excluded second limb',
  values: { reference_date: '2026/05/05' },
  derived_from: [FROM_THE_SPEC_TEXT, FROM_THE_PIN],
  expectation: { refusal: 'REFUSED_UNRESOLVED_AFFIRMATIVE_ELEMENT', first_failing_gate: 'G5_NO_UNRESOLVED_AFFIRMATIVE_ELEMENT', comparison_runs: false },
});

sample({
  id: 'RS-15',
  reproduces: 'the operative state of this scope: a fully eligible document against the record as it stands, NOT ADMITTED',
  values: { reference_date: '2026/05/05', clock_start: '2021/02/01' },
  derived_from: [FROM_THE_SPEC_TEXT, 'the governed rule record at its pinned digest, whose admission state is NOT_ADMITTED', FROM_THE_PIN],
  expectation: { refusal: 'REFUSED_RULE_RECORD_NOT_ADMITTED', first_failing_gate: 'G6_RULE_RECORD_ADMITTED', comparison_runs: false, outcome: null },
});

sample({
  id: 'RS-16',
  reproduces: 'a jurisdiction other than CA / CA-NS',
  values: { reference_date: '2026/05/05', selected_region: 'CA-ON' },
  derived_from: [FROM_THE_SPEC_TEXT],
  expectation: { refusal: 'REFUSED_JURISDICTION_NOT_AUTHORIZED_FOR_THIS_UNIT', first_failing_gate: 'G2_JURISDICTION_AUTHORIZED_FOR_THIS_UNIT', facts_layer_runs: false },
});

sample({
  id: 'RS-17',
  reproduces: 'collection-record isolation: two contract debt records, each with its own printed date',
  values: { records: [{ clock_start: '2010/01/01' }, { clock_start: '2021/02/01' }], reference_date: '2026/05/05' },
  derived_from: [FROM_THE_SPEC_TEXT, FROM_THE_REGISTER],
  expectation: {
    refusal: null,
    per_record: [
      Object.assign({ record_index: 2 }, comparisonOf('2010-01-01', '2026-05-05')),
      Object.assign({ record_index: 3 }, comparisonOf('2021-02-01', '2026-05-05')),
    ],
    no_merged_value: true,
  },
});

// ---------------------------------------------------------------- the reviewer's own record, and the freeze
const independence = {
  who_reviewed: 'a second derivation written inside this order, from the source side of the record rather than from the evaluator: ' + SPECIALISATION,
  what_independence_means_here: 'the reviewer reads different inputs (the accepted source pin, the report excerpt as the register records it, and the pinned specification and status vocabulary as text) and carries its own arithmetic, written as a different algorithm; it does not read, require, import or execute the evaluator, and it reads no result of this order before its expectations are frozen',
  what_independence_does_not_mean_here: [
    'it is not a second human reviewer: the same execution context authored both sides, so the independence is procedural and of derivation path, not of person',
    'it is not independent legal review, and it decides no question of law: it reproduces arithmetic and reads statuses out of pinned text',
    'it does not re-extract the report: the report excerpt is read as the register records it, and the specimen PDF is not opened by this order',
  ],
  order_of_operations: 'the comparison harness writes these expectations to replay_expectations_frozen.json and takes that file\'s digest BEFORE it runs the evaluator on any sampled case. The frozen digest is recorded in the comparison record, so the freeze is measurable rather than asserted.',
  sources_read: Object.keys(READ).map((k) => ({ role: k, path: READ[k], sha256: sha256(READ[k]), pinned: PINNED_DIGESTS[k] || null, matches_its_pin: !PINNED_DIGESTS[k] || PINNED_DIGESTS[k] === sha256(READ[k]) })),
  sources_deliberately_not_read: NOT_READ,
  the_reviewers_own_arithmetic: 'whole days accumulated a year and a month at a time from 0001-01-01, with month lengths computed from the leap-year rule; the anniversary is built by adding six calendar years and clamping to the target month\'s length. The specification\'s helper uses a civil-day formula instead, so the two derivations do not share code.',
};

const reviewerRecord = {
  specialisation: SPECIALISATION,
  reviewer_identity: 'PHASE5-001T independent reviewer (procedural independence, recorded)',
  sample_count: S.length,
  expectations: S,
  transcription_identity_reproduced_from_the_source_pin: transcriptionCheck,
  the_provision_as_the_reviewer_read_it_from_the_pin: {
    rule_corpus_rendering: ruleCorpusRendering,
    timing_rendering: timingRendering,
  },
  the_report_excerpt_as_the_reviewer_read_it: {
    fact_02_last_payment_date: { raw_value_observed: fact02.raw_value_observed, raw_value_form: fact02.raw_value_form, normalized_value: fact02.normalized_value, location: fact02.location },
    fact_03_request_date: { raw_value_observed: fact03.raw_value_observed, raw_value_form: fact03.raw_value_form, normalized_value: fact03.normalized_value, location: fact03.location },
    the_registers_own_demonstration: demonstration,
  },
  the_pinned_text_the_reviewer_derived_the_gates_from: {
    gate_order: spec.gate_order_is_fixed.order,
    the_order_rule: spec.gate_order_is_fixed.rule,
    decision_rules: spec.decision_rules.map((r) => ({ id: r.id, precedence: r.precedence, result: r.result })),
    six_conventions: spec.conventions.map((c) => ({ id: c.id, convention: c.convention, is_a_requirement_of_the_text: c.is_a_requirement_of_the_text })),
    boundary_withheld: spec.boundary_withheld,
    statuses: statusVocab.statuses.map((s) => s.status || s.id || s),
  },
  independence,
};

module.exports = { SAMPLE: S, reviewerRecord, independence, comparisonOf, elapsedDays, anniversaryOf, dayNumber, READ, PINNED_DIGESTS };
