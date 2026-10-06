'use strict';
/**
 * build_001t_fixture_suite.cjs — PHASE5-001T deliverable 1: run the fixture suite and record what it reached.
 *
 * It writes one artifact, SOURCE_CAPTURES\PHASE5-001T\fixture_suite_001t.json, and nothing else. It reads the
 * pinned evaluator, the pinned rule record and the fixture catalogue; it opens no report, runs no inherited
 * harness and writes into no earlier package.
 */
const I = require('./inputs_001t.cjs');
const K = require('./fixtures_001t.cjs');
const C = require('./fixture_catalogue_001t.cjs');

const E = K.E;
const FIXTURE_LABELS = ['VIOLATION', 'PROBABLE_VIOLATION', 'BREACH_ESTABLISHED', 'WITHIN_THE_LIMIT', 'COMPLIANT', 'PROBABLE_'];

/** The declared list of forbidden renderings is the one place a forbidden label may legitimately appear. */
function scanForForbiddenLabels(record) {
  const copy = JSON.parse(JSON.stringify(record));
  const declared = copy.forbidden_renderings || [];
  delete copy.forbidden_renderings;
  const text = JSON.stringify(copy);
  const hits = FIXTURE_LABELS.filter((l) => text.indexOf(l) !== -1);
  return { hits, declared_list_is_the_only_occurrence: declared.length > 0 && hits.length === 0 };
}

function project(result) {
  const f = result.facts || {};
  const ref = f.reference_date || null;
  const lp = f.last_payment || null;
  const perRecord = ((lp && lp.per_record) || []).map((r) => ({
    record_index: r.record_index,
    disposition: r.disposition,
    status: r.last_payment_fact ? r.last_payment_fact.status : null,
    reason: r.last_payment_fact ? r.last_payment_fact.reason : null,
    comparison_outcome: null, comparison_reason: null, anniversary: null,
    span_in_days: null, elapsed_days: null, boundary_case: null,
  }));
  const comps = (result.comparisons && result.comparisons.per_record) || [];
  comps.forEach((c) => {
    const m = perRecord.filter((x) => x.record_index === c.record_index)[0];
    if (!m) return;
    m.comparison_outcome = c.comparison_outcome; m.comparison_reason = c.reason;
    m.anniversary = c.anniversary; m.span_in_days = c.span_in_days;
    m.elapsed_days = c.elapsed_days; m.boundary_case = c.boundary_case;
  });
  const q = result.applicability_and_qualifications;
  const scan = scanForForbiddenLabels(result);
  return {
    refusal: result.refusal,
    first_failing_gate: result.first_failing_gate,
    facts_state: f.state || null,
    unit_level_status: lp && lp.unit_level ? lp.unit_level.status : null,
    unit_level_reason: lp && lp.unit_level ? lp.unit_level.reason : null,
    reference_status: ref ? ref.status : null,
    reference_reason: ref ? ref.reason : null,
    comparison_state: result.comparisons ? result.comparisons.state : null,
    per_record: perRecord,
    outcome_present: result.outcome !== null,
    emission: result.emission.state,
    ceiling: result.observation_eligibility.permitted_result_ceiling,
    packet_eligible: result.observation_eligibility.packet_eligible,
    consumer_visible: result.observation_eligibility.consumer_visible,
    finding_classes_available: result.observation_eligibility.finding_classes_available,
    boundary_qualification_mandatory: q.qualifications.boundary.mandatory_here,
    timing_qualification_mandatory: q.qualifications.timing.mandatory,
    classification_qualification_mandatory: q.qualifications.classification.mandatory,
    specimen_qualification_mandatory: q.qualifications.specimen.mandatory,
    unresolved_items_carried: q.unresolved_items_carried.length,
    applicability_temporal: q.applicability.temporal,
    forbidden_label_hits: scan.hits,
    qualified_verbatim: {
      timing: q.qualifications.timing.text,
      classification: q.qualifications.classification.text,
      boundary: q.qualifications.boundary.text,
      specimen: q.qualifications.specimen.text,
    },
  };
}

function compareProjection(expected, observed, path, fails) {
  Object.keys(expected).forEach((k) => {
    const e = expected[k];
    const o = observed[k];
    if (Array.isArray(e)) {
      if (!Array.isArray(o) || o.length !== e.length) {
        fails.push({ field: path + '.' + k, expected: e, observed: o });
        return;
      }
      e.forEach((item, i) => {
        if (item && typeof item === 'object') compareProjection(item, o[i] || {}, path + '.' + k + '[' + i + ']', fails);
        else if (item !== o[i]) fails.push({ field: path + '.' + k + '[' + i + ']', expected: item, observed: o[i] });
      });
    } else if (e !== o) {
      fails.push({ field: path + '.' + k, expected: e, observed: o });
    }
  });
}

// ---------------------------------------------------------------- run
const pins = I.pinReport();
const pinFailures = pins.filter((p) => p.state !== 'MATCHES_THE_PIN');
const cases = [];
const allHits = [];
let emitted = 0;
let outcomeProduced = 0;

C.FIXTURES.forEach((fx) => {
  const raw = E.evaluate(fx.input);
  const observed = project(raw);
  const fails = [];
  compareProjection(fx.expected, observed, fx.id, fails);

  let identity = null;
  if (fx.second_input) {
    const raw2 = E.evaluate(fx.second_input);
    const a = JSON.stringify(raw);
    const b = JSON.stringify(raw2);
    identity = {
      second_input_checked: true,
      the_two_renderings_produce_byte_identical_records: a === b,
      record_sha256_first: I.sha256Text(a),
      record_sha256_second: I.sha256Text(b),
    };
    if (a !== b) fails.push({ field: fx.id + '.duplicate_catalogue_identity', expected: 'byte-identical records', observed: 'different records' });
  }

  if (observed.emission === 'NOT_EMITTED_NO_CONSUMER_SURFACE_AND_NO_FINDING_CLASS_AUTHORIZED') emitted++;
  if (observed.outcome_present) outcomeProduced++;
  if (observed.forbidden_label_hits.length > 0) allHits.push({ id: fx.id, hits: observed.forbidden_label_hits });

  cases.push({
    id: fx.id,
    categories: fx.categories,
    synthetic: true,
    synthetic_label: K.SYNTHETIC_LABEL,
    what_it_is: fx.what_it_is,
    the_state_it_must_reach: fx.the_state_it_must_reach,
    input_provenance: fx.input_provenance,
    rule_record_used: fx.rule_record_used,
    counted_as_consumer_report_presentation_evidence: false,
    is_a_presentation: false,
    expected: fx.expected,
    observed,
    record_identity_across_duplicate_catalogue_renderings: identity,
    mismatches: fails,
    passed: fails.length === 0,
  });
});

// ---------------------------------------------------------------- the leap-day convention, measured as a property
const leapScan = (() => {
  const counterexamples = [];
  let checked = 0;
  for (let y = 1900; y <= 2100; y++) {
    if (!E.isLeapYear(y)) continue;
    const start = y + '-02-29';
    const anniversary = E.addCalendarYears(start, 6);
    checked++;
    if (anniversary !== (y + 6) + '-02-28') counterexamples.push({ start, anniversary });
  }
  return {
    what: 'every 29 February start in 1900..2100 is checked against convention c2: the sixth-year anniversary must clamp to 28 February, because six years after a leap year is never itself a leap year',
    starts_checked: checked,
    counterexamples,
    clamped_to_28_february_in_every_case: counterexamples.length === 0,
  };
})();

const failed = cases.filter((c) => !c.passed).map((c) => c.id);
const categoryTally = C.CATEGORIES.map((cat) => ({
  category: cat.id,
  phase_bullet_text: cat.bullet_text,
  fixtures: cases.filter((c) => c.categories.indexOf(cat.id) !== -1).map((c) => c.id),
  covered: cases.some((c) => c.categories.indexOf(cat.id) !== -1),
}));

const written = I.writeJson('fixture_suite_001t.json', {
  artifact: 'fixture_suite_001t.json',
  work_order: I.ORDER_ID,
  created_utc: I.CREATED_UTC,
  document_type: 'FIXTURE SUITE RESULT — synthetic fixtures only, one scope only. NOT ADMITTED, no emission, no consumer-visible output',
  purpose: 'run the fixture suite for this unit over every category the Phase 5.6 fixture bullet names, and record the state each fixture reached against the state it must reach',
  the_governing_text_read: {
    document: I.PATHS.plan,
    clause: 'section 3, Phase 5.6 bullet 1 (the fixture suite)',
    line: 165,
    text: '- Create synthetic and legally reviewed fixtures for each rule unit: clear breach, compliant/within-limit, exact boundary, wrong event date, date unavailable, report contradiction, exception shown, exception unknown, effective-period uncertainty, preemption uncertainty, duplicate catalogue source, wrong jurisdiction, parser failure, OCR ambiguity, and report-section not inspected.',
  },
  subject_under_test: {
    what: 'the deterministic evaluator the Gate 5.5 scoped verdict specified, at its pinned digest',
    path: I.PATHS.evaluator,
    sha256: I.PINS[I.PATHS.evaluator],
    not_the_older_comparator: 'this suite exercises the evaluator the specification defines. It does not read, import, run or conform the PHASE5-001I-A internal comparator, whose boundary treatment the rule record does not adopt; that suite is not re-run and its passing tests are not evidence for this gate.',
  },
  rule_record_read: {
    path: I.PATHS.rule_record,
    sha256: I.PINS[I.PATHS.rule_record],
    pre_admission_identity: I.PRE_ADMISSION_IDENTITY,
    state: 'NOT_ADMITTED — read as data, never as an admission',
    the_synthetic_admitted_copy: 'fixtures that must reach the arithmetic layer use a synthetic in-memory copy of this record with its admission state marked ADMITTED. That copy admits no governed rule, creates no coverage and is not evidence for any gate.',
  },
  pin_verification: { pins: pins, all_match: pinFailures.length === 0, mismatches: pinFailures },
  fixture_count: cases.length,
  category_count: C.CATEGORIES.length,
  categories_covered: categoryTally.filter((c) => c.covered).length,
  categories: categoryTally,
  failure_count: failed.length,
  failed_fixtures: failed,
  fixture_tally: {
    cases_whose_result_is_not_emitted: emitted,
    cases_that_produced_an_arithmetic_record: outcomeProduced,
    cases_that_emitted_a_finding_class: 0,
    cases_carrying_a_forbidden_label: allHits.length,
    counted_as_consumer_report_presentation_evidence: 0,
    synthetic_fixtures_all_labelled_synthetic: cases.every((c) => c.synthetic === true && c.synthetic_label === K.SYNTHETIC_LABEL),
  },
  leap_day_convention_property: leapScan,
  cases,
  verdict: failed.length === 0
    ? 'EVERY FIXTURE REACHED THE STATE IT MUST REACH — ' + cases.length + ' fixtures, ' + C.CATEGORIES.length + ' categories, 0 mismatches'
    : 'FIXTURES DID NOT REACH THEIR REQUIRED STATE: ' + failed.join(', '),
  what_this_record_does_not_do: [
    'it admits no rule, creates no coverage or candidate and authorises no finding class',
    'it produces no consumer-visible output of any class and changes no application behaviour',
    'it does not claim that any synthetic fixture is consumer-report presentation evidence: the specimen was not opened, parsed or re-exported',
    'it does not decide the effective period, the exception, the anniversary-boundary reading or the convention set',
    'it does not conform, modify or adopt the internal comparator of PHASE5-001I-A, and it does not run any harness that writes into an earlier package',
  ],
  created_by: I.ORDER_ID,
});

console.log('fixture suite: ' + cases.length + ' fixtures | categories covered: ' + categoryTally.filter((c) => c.covered).length + ' of ' + C.CATEGORIES.length + ' | failures: ' + failed.length + ' | pin mismatches: ' + pinFailures.length + ' | written ' + written.bytes + ' bytes');
if (failed.length) {
  cases.filter((c) => !c.passed).forEach((c) => console.log('  FAIL ' + c.id + ': ' + JSON.stringify(c.mismatches)));
}
if (allHits.length) console.log('  FORBIDDEN LABELS: ' + JSON.stringify(allHits));
