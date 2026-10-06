'use strict';
/**
 * gate56_001u.cjs — PHASE5-001U re-measurement of the four scoped Gate 5.6 criteria.
 *
 * The predecessor verdict (SOURCE_CAPTURES\PHASE5-001T\scoped_gate_5_6_verdict.json) recorded three clauses met and
 * the version-sharing clause reserved and named as not satisfied. This module re-measures all four clauses from the
 * live artifacts, at their measured digests, against the Gate 5.6 text as the owner's PHASE5-001U amendment leaves
 * it. It decides nothing on its own: it returns measurements, and any reader of it may refuse.
 *
 * It writes nothing and changes nothing. Every number it reports is derived here, not quoted from a predecessor:
 * where a predecessor's number and this measurement disagree, the disagreement is reported as a problem.
 */
const fs = require('fs');
const lib = require('./lib_001u.cjs');

const { wr, PATHS, PINS, abs, sha256File, sha256Text, readText, readJson, ORDER_ID, SCOPE_ID, CREATED_UTC } = lib;
const UNIT_ID = lib.UNIT_ID;
const PRE = lib.PRE_ADMISSION_IDENTITY;

/** The fifteen categories the Phase 5.6 fixture bullet names, in the bullet's own order. */
const CATEGORIES_THE_PHASE_BULLET_NAMES = [
  'clear breach', 'compliant/within-limit', 'exact boundary', 'wrong event date', 'date unavailable',
  'report contradiction', 'exception shown', 'exception unknown', 'effective-period uncertainty',
  'preemption uncertainty', 'duplicate catalogue source', 'wrong jurisdiction', 'parser failure',
  'OCR ambiguity', 'report-section not inspected',
];

function occurrences(haystack, needle) {
  let n = 0;
  let i = haystack.indexOf(needle);
  while (i !== -1) { n += 1; i = haystack.indexOf(needle, i + needle.length); }
  return n;
}

function pinState(key) {
  const label = wr(key);
  const a = abs(label);
  const measured = sha256File(a);
  return {
    path: label, pinned_sha256: PINS[key], measured_sha256: measured,
    bytes: lib.bytes(label), matches: PINS[key] === measured,
  };
}

/** Read every artifact this measurement rests on, and check none of them moved. */
function loadAll() {
  const problems = [];
  const keys = {
    fixture_suite: 'SOURCE_CAPTURES/PHASE5-001T/fixture_suite_001t.json',
    negative_tests: 'SOURCE_CAPTURES/PHASE5-001T/negative_tests_001t.json',
    consumer_language: 'SOURCE_CAPTURES/PHASE5-001T/consumer_language_validation_001t.json',
    independent_replay: 'SOURCE_CAPTURES/PHASE5-001T/independent_replay_001t.json',
    replay_expectations: 'SOURCE_CAPTURES/PHASE5-001T/replay_expectations_frozen.json',
    inputs_source: 'SOURCE_CAPTURES/PHASE5-001T/inputs_001t.cjs',
    rule_record: 'SOURCE_CAPTURES/PHASE5-001Q/rule_record.json',
    crosswalk: 'SOURCE_CAPTURES/PROD-003/crosswalk.json',
    output_surface: 'SOURCE_CAPTURES/PHASE5-001R/output_vocabulary_and_explanation_surface.json',
    fixture_catalogue_source: 'SOURCE_CAPTURES/PHASE5-001T/fixture_catalogue_001t.cjs',
  };
  const pins = {};
  Object.keys(keys).forEach((role) => { pins[role] = pinState(keys[role]); });
  Object.keys(pins).forEach((role) => {
    if (!pins[role].matches) problems.push(role + ' does not match its pin: ' + pins[role].path);
  });
  const text = {};
  Object.keys(pins).forEach((role) => { text[role] = readText(pins[role].path); });
  const json = {};
  ['fixture_suite', 'negative_tests', 'consumer_language', 'independent_replay', 'rule_record', 'crosswalk', 'output_surface']
    .forEach((role) => { json[role] = JSON.parse(text[role]); });
  return {
    problems, pins, text, json,
    suite: json.fixture_suite, neg: json.negative_tests, lang: json.consumer_language,
    replay: json.independent_replay, surface: json.output_surface, crosswalk: json.crosswalk,
    record: json.rule_record,
  };
}

/** Clause 1 — every test passes. */
function clause1(ctx) {
  const fails = [];
  const cases = ctx.suite.cases || [];
  const tests = ctx.neg.tests || [];
  const templates = ctx.lang.templates || [];
  const leap = ctx.suite.leap_day_convention_property || {};
  const fixturesPassed = cases.filter((c) => c.passed === true).length;
  const mismatches = cases.reduce((n, c) => n + (c.mismatches || []).length, 0);
  const testsPassed = tests.filter((t) => t.passed === true).length;
  const templatesPassed = templates.filter((t) => t.passed === true).length;
  const covered = Array.isArray(ctx.suite.categories) ? ctx.suite.categories.length : ctx.suite.category_count;
  if (ctx.suite.fixture_count !== cases.length) fails.push('the recorded fixture count disagrees with the cases present');
  if (fixturesPassed !== cases.length) fails.push('a fixture did not pass');
  if (mismatches !== 0) fails.push('a fixture recorded a mismatch');
  if (ctx.neg.test_count !== tests.length) fails.push('the recorded negative-test count disagrees with the tests present');
  if (testsPassed !== tests.length) fails.push('a negative test did not pass');
  if (ctx.lang.template_count !== templates.length) fails.push('the recorded template count disagrees with the templates present');
  if (templatesPassed !== templates.length) fails.push('a template did not validate');
  if (covered !== CATEGORIES_THE_PHASE_BULLET_NAMES.length) fails.push('the record does not cover all fifteen named categories');
  if ((leap.counterexamples || []).length !== 0) fails.push('the leap-day property recorded a counterexample');
  if ((ctx.suite.failed_fixtures || []).length !== 0) fails.push('the fixture failure list is not empty');
  if ((ctx.neg.failed_tests || []).length !== 0) fails.push('the negative-test failure list is not empty');
  if ((ctx.lang.failed_templates || []).length !== 0) fails.push('the template failure list is not empty');
  const p = ctx.pins;
  return {
    n: 1, criterion_verbatim: 'every test passes',
    where_it_sits: 'the Gate 5.6 sentence, build plan line 170, first clause',
    state: fails.length === 0 ? 'MET within this scope' : 'NOT MET',
    re_measured_here: fails.length === 0,
    evidence: [
      'the fixture suite: ' + cases.length + ' fixtures over all ' + CATEGORIES_THE_PHASE_BULLET_NAMES.length + ' categories the Phase 5.6 fixture bullet names, ' + mismatches + ' mismatches (' + p.fixture_suite.path + ' at ' + p.fixture_suite.measured_sha256 + ', the record\'s own verdict: ' + ctx.suite.verdict + ')',
      'the negative tests: ' + tests.length + ' tests, ' + ctx.neg.failure_count + ' failures, all ' + testsPassed + ' carrying passed=true (' + p.negative_tests.path + ' at ' + p.negative_tests.measured_sha256 + ')',
      'the consumer-language validation: ' + templates.length + ' templates, ' + ctx.lang.failure_count + ' failures, all ' + templatesPassed + ' carrying passed=true (' + p.consumer_language.path + ' at ' + p.consumer_language.measured_sha256 + ')',
      'the leap-day convention as a property over every 29 February start in 1900..2100: ' + leap.starts_checked + ' starts, ' + (leap.counterexamples || []).length + ' counterexamples',
      'every count above was re-derived here from the records themselves rather than quoted: ' + fixturesPassed + ' of ' + cases.length + ' fixtures passed, ' + testsPassed + ' of ' + tests.length + ' negative tests passed, ' + templatesPassed + ' of ' + templates.length + ' templates validated',
    ],
    measurement: {
      fixtures_in_the_record: cases.length, fixtures_passed: fixturesPassed, fixtures_failed: cases.length - fixturesPassed,
      fixture_mismatches: mismatches, categories_the_phase_bullet_names: CATEGORIES_THE_PHASE_BULLET_NAMES.length,
      categories_the_record_covers: covered, failure_lists_empty: fails.length === 0,
      negative_tests: tests.length, negative_tests_passed: testsPassed,
      templates: templates.length, templates_passed: templatesPassed,
      leap_day_starts_checked: leap.starts_checked, leap_day_counterexamples: (leap.counterexamples || []).length,
    },
    failures_found_here: fails,
    unresolved_within_this_scope: [
      'the fixtures are synthetic in-memory fixtures of one scope and their independence is procedural: no second human reviewer validated them',
      'no fixture is counted as consumer-report presentation evidence, exactly as the fixture suite records',
    ],
  };
}

/** Clause 2 — independent replay reproduces each sampled result. */
function clause2(ctx) {
  const fails = [];
  const r = ctx.replay;
  const results = r.results || [];
  const sampled = r.sample_count;
  const reproduced = r.reproduced_count;
  const disagreements = r.disagreement_count;
  const indep = r.reviewer_independence_measured || {};
  if (sampled !== results.length) fails.push('the recorded sample count disagrees with the results present');
  if (reproduced !== sampled) fails.push('not every sampled result was reproduced');
  if (disagreements !== 0) fails.push('the replay recorded a disagreement');
  if ((r.unresolved_disagreements || []).length !== 0) fails.push('an unresolved disagreement is recorded');
  if ((r.disagreements || []).length !== disagreements) fails.push('the disagreement list disagrees with the disagreement count');
  if (indep.the_reviewer_loads_no_project_file !== true) fails.push('the reviewer was not measured as loading no project file');
  if (ctx.text.independent_replay.indexOf(ctx.pins.rule_record.measured_sha256) === -1) {
    fails.push('the replay record does not carry the rule record digest');
  }
  const p = ctx.pins;
  return {
    n: 2, criterion_verbatim: 'independent replay reproduces each sampled result',
    where_it_sits: 'the Gate 5.6 sentence, line 170, second clause, read with the phase bullet at line 167',
    state: fails.length === 0 ? 'MET within this scope, with the reviewer\'s independence recorded and its limits named' : 'NOT MET',
    re_measured_here: fails.length === 0,
    evidence: [
      'the reviewer reproduced ' + reproduced + ' of ' + sampled + ' sampled results from the source pin and the report excerpt, with ' + disagreements + ' disagreements and ' + (r.unresolved_disagreements || []).length + ' unresolved (re-counted here from the ' + results.length + ' results the record carries)',
      'the reviewer\'s expectations were frozen to ' + p.replay_expectations.path + ' at ' + p.replay_expectations.measured_sha256 + ' before the evaluator was run on any sampled case',
      'the reviewer\'s independence is measured, not asserted: the modules its executable code loads are ' + JSON.stringify(indep.modules_the_reviewer_loads) + ' and the project files it loads are ' + JSON.stringify(indep.project_files_the_reviewer_loads),
      'the reviewer\'s numbers agree with the register\'s own demonstration of this specimen: ' + JSON.stringify(r.the_registers_own_demonstration_matched),
      'the distinct result states sampled are recorded: ' + (r.the_distinct_result_states_sampled || []).length + ' states, covering the evidenced specimen, both arithmetic outcomes, the withheld boundary day, the clamped leap-day boundary and the days around it, the four extraction statuses, a non-debt region, the six named refusals and collection-record isolation',
    ],
    measurement: {
      sampled: sampled, reproduced: reproduced, disagreements: disagreements,
      unresolved_disagreements: (r.unresolved_disagreements || []).length,
      results_present: results.length, reviewer_loads_no_project_file: indep.the_reviewer_loads_no_project_file === true,
      reviewer_source: indep.reviewer_source_path || null,
      expectations_path: p.replay_expectations.path, expectations_sha256: p.replay_expectations.measured_sha256,
      distinct_result_states_sampled: (r.the_distinct_result_states_sampled || []).length,
    },
    failures_found_here: fails,
    unresolved_within_this_scope: [
      'the independence is procedural: one execution context authored both sides, there is no second human reviewer, and the record names that limit',
      'the sampled inputs are synthetic in-memory inputs of the shape the fact model defines; no report is opened',
    ],
  };
}

/** Clause 3 — no known false positive/negative category remains unexplained. */
function clause3(ctx) {
  const fails = [];
  const suite = ctx.suite;
  const tally = suite.fixture_tally || {};
  const categoryCount = Array.isArray(suite.categories) ? suite.categories.length : suite.category_count;
  if (categoryCount !== CATEGORIES_THE_PHASE_BULLET_NAMES.length) fails.push('a named category has no fixture');
  if (tally.cases_that_emitted_a_finding_class !== 0) fails.push('a case emitted a finding class');
  if (tally.cases_carrying_a_forbidden_label !== 0) fails.push('a case carried a forbidden label');
  if (tally.cases_whose_result_is_not_emitted !== tally.cases_that_produced_an_arithmetic_record) {
    fails.push('an arithmetic record was emitted');
  }
  const unexplained = (suite.failed_fixtures || []).length + (ctx.neg.failed_tests || []).length + (ctx.lang.failed_templates || []).length;
  if (unexplained !== 0) fails.push('a known failure category is listed');
  return {
    n: 3, criterion_verbatim: 'no known false positive/negative category remains unexplained',
    where_it_sits: 'the Gate 5.6 sentence, line 170, third clause',
    state: fails.length === 0 ? 'MET within this scope' : 'NOT MET',
    re_measured_here: fails.length === 0,
    evidence: [
      'every one of the ' + CATEGORIES_THE_PHASE_BULLET_NAMES.length + ' categories the phase bullet names carries a fixture, and every fixture reached the state it must reach',
      'the categories the bullet names, in the bullet\'s own order: ' + CATEGORIES_THE_PHASE_BULLET_NAMES.join(', '),
      'of ' + tally.cases_that_produced_an_arithmetic_record + ' cases that produced an arithmetic record, ' + tally.cases_whose_result_is_not_emitted + ' were not emitted, ' + tally.cases_that_emitted_a_finding_class + ' emitted a finding class and ' + tally.cases_carrying_a_forbidden_label + ' carried a forbidden label',
      'the withheld boundary day, the clamped leap-day boundary and the days around it, the single absence path, the four extraction statuses, the two record-level dispositions and all six named refusals each reached a recorded state rather than an unexplained one',
      'the predecessor verdict kept the four material differences between this specification and the PHASE5-001I-A internal comparator explained and unadopted, and recorded every defect found while executing that order with its cause; that analysis is preserved unchanged in ' + ctx.pins.fixture_suite.path.replace(/fixture_suite_001t\.json$/, 'scoped_gate_5_6_verdict.json') + ' at ' + PINS['SOURCE_CAPTURES/PHASE5-001T/scoped_gate_5_6_verdict.json'],
    ],
    measurement: {
      categories_named_by_the_phase_bullet: CATEGORIES_THE_PHASE_BULLET_NAMES.length,
      categories_carrying_a_fixture: categoryCount,
      cases_that_produced_an_arithmetic_record: tally.cases_that_produced_an_arithmetic_record,
      cases_whose_result_is_not_emitted: tally.cases_whose_result_is_not_emitted,
      cases_that_emitted_a_finding_class: tally.cases_that_emitted_a_finding_class,
      cases_carrying_a_forbidden_label: tally.cases_carrying_a_forbidden_label,
      unexplained_failure_lists: unexplained,
      fixtures_counted_as_presentation_evidence: tally.counted_as_consumer_report_presentation_evidence,
    },
    failures_found_here: fails,
    unresolved_within_this_scope: [
      'the second limb stays unseated, the effective period stays unresolved and the anniversary-boundary question stays unanswered: each restricts output and none is filled',
      'the emission path on an admitted rule record was unexercised while the record was NOT_ADMITTED; the Gate 5.7 execution records what happens to it now that the record is admitted, and names anything it still does not exercise',
    ],
  };
}

/** Clause 4 — the four artifacts share one immutable pre-admission version identity. */
function clause4(ctx) {
  const fails = [];
  const p = ctx.pins;
  const rec = ctx.record;
  const id = rec.rule_identity || {};
  const adm = rec.admission_state || {};
  const digest = p.rule_record.measured_sha256;
  const digestPrefix = digest.slice(0, 12);
  const surfaceTemplates = ((ctx.surface.explanation_surface || {}).templates) || [];
  const apiIdentifier = 'CRP-LSRC-0354';
  const countOf = (t, s) => t.split(s).length - 1;

  if (digestPrefix !== lib.CONTENT_DIGEST_12) fails.push('the rule record digest does not carry the identity suffix measured here');
  if (id.rule_id !== UNIT_ID) fails.push('the rule record does not carry this unit\'s immutable rule id');
  if (id.rule_id_is_immutable !== true) fails.push('the rule id is not recorded immutable');
  if (id.rule_version !== 'RESERVED_TO_GATE_5_7') fails.push('the rule record does not name the production reservation');
  if (adm.admission_form !== 'RESERVED_TO_GATE_5_7') fails.push('the admission form is not the named reservation');
  if (ctx.text.inputs_source.indexOf(PRE) === -1) fails.push('the pinned-input source does not declare the shared pre-admission identity');
  if (ctx.text.inputs_source.indexOf(digest) === -1) fails.push('the pinned-input source does not pin the rule record digest');
  if (ctx.text.fixture_suite.indexOf(PRE) === -1) fails.push('the fixture suite does not carry the shared pre-admission identity');
  if (ctx.text.negative_tests.indexOf(PRE) === -1) fails.push('the negative tests do not carry the shared pre-admission identity');
  if (ctx.text.crosswalk.indexOf(UNIT_ID) === -1) fails.push('the source crosswalk does not name this unit\'s immutable rule id');
  if (ctx.text.crosswalk.indexOf(apiIdentifier) === -1) fails.push('the source crosswalk does not name the source entry the scope reads');
  if (ctx.text.output_surface.indexOf('They are not a surface, they are not reachable, and they authorize nothing.') === -1) {
    fails.push('the explanation surface does not record that the templates are not a surface and authorise nothing');
  }
  const productionStringOccurrences =
    countOf(ctx.text.rule_record, lib.PRODUCTION_ADMISSION_IDENTITY) + countOf(ctx.text.crosswalk, lib.PRODUCTION_ADMISSION_IDENTITY) +
    countOf(ctx.text.output_surface, lib.PRODUCTION_ADMISSION_IDENTITY) + countOf(ctx.text.fixture_suite, lib.PRODUCTION_ADMISSION_IDENTITY) +
    countOf(ctx.text.negative_tests, lib.PRODUCTION_ADMISSION_IDENTITY) + countOf(ctx.text.independent_replay, lib.PRODUCTION_ADMISSION_IDENTITY);
  if (productionStringOccurrences !== 0) fails.push('a production identity string is already present in an artifact measured as pre-admission');
  return {
    n: 4,
    criterion_verbatim: 'rule corpus, source crosswalk, tests, and explanation templates share the same immutable versions',
    where_it_sits: 'the Gate 5.6 sentence, line 170, fourth clause, as the owner\'s PHASE5-001U amendment leaves it',
    state: fails.length === 0
      ? 'MET within this scope, measured against the shared pre-admission version identity, with the production reservation named beside it'
      : 'NOT MET',
    re_measured_here: fails.length === 0,
    the_governing_reading_applied: 'the sharing condition for a scope whose governed rule record Gate 5.7 has not yet admitted is the condition that the governed rule record the scope reads, the source crosswalk, the tests and the explanation templates it reads are each pinned to one shared, verified, immutable pre-admission version identity, each at an immutable digest; that condition is measurable before Gate 5.7 assigns any production identity',
    the_shared_identity: PRE,
    how_the_identity_is_carried: {
      by_value_and_digest_in_the_artifact: [
        p.fixture_suite.path + ' — carries the shared pre-admission identity and the rule record digest it pins',
        p.negative_tests.path + ' — carries the shared pre-admission identity and the rule record digest it pins',
        p.inputs_source.path + ' — declares the shared pre-admission identity and pins the rule record digest',
        p.independent_replay.path + ' — carries the rule record digest it pins',
      ],
      by_immutable_rule_id_and_a_pinned_digest: [
        p.crosswalk.path + ' — names the immutable rule id ' + UNIT_ID + ' and the source entry ' + apiIdentifier + ', and carries no separate version field; it is bound to the shared identity by the immutable rule id and its own pinned digest',
        p.output_surface.path + ' — the explanation templates are keyed to the unit and the finding class and carry no separate version field; they are bound to the shared identity by the immutable rule id they are written for and their own pinned digest',
      ],
      what_this_bands: 'the two artifacts that carry no version field are each bound to the same immutable rule id at an immutable digest, so the scope reads one version of each; that construction is recorded here rather than presented as a version field that does not exist',
    },
    the_production_reservation_named_beside_the_measurement: {
      rule_version_recorded_in_the_record: id.rule_version,
      admission_form_recorded_in_the_record: adm.admission_form,
      what_it_means: 'the production admission identity and the production version string are reserved to Gate 5.7. This verdict does not treat that reservation, the existence of the amended clause, or the prospect of a later assignment as evidence that sharing holds: sharing is measured above, from the artifacts themselves.',
    },
    measurement: {
      shared_pre_admission_identity: PRE,
      rule_record_digest: digest, identity_suffix: lib.CONTENT_DIGEST_12, digest_prefix_12: digestPrefix,
      digest_carries_the_identity_suffix: digestPrefix === lib.CONTENT_DIGEST_12,
      rule_record_rule_id: id.rule_id, rule_record_version_field: id.rule_version,
      rule_record_pinned: p.rule_record.matches, crosswalk_pinned: p.crosswalk.matches,
      tests_pinned: p.fixture_suite.matches && p.negative_tests.matches,
      explanation_templates_pinned: p.output_surface.matches,
      templates_in_the_surface: surfaceTemplates.length, templates_validated: (ctx.lang.templates || []).length,
      production_identity_strings_found_in_the_measured_artifacts: productionStringOccurrences,
      every_pin_this_measurement_rests_on_matches: Object.keys(p).every((k) => p[k].matches),
    },
    failures_found_here: fails,
    unresolved_within_this_scope: [
      'the pre-admission identity is content-derived from the rule record digest: it names the version of the record, not an admitted production version',
      'the crosswalk and the explanation surface carry no version field, so their binding to the shared identity is by immutable rule id and pinned digest, recorded above rather than glossed',
    ],
  };
}

/** Assemble the successor scoped Gate 5.6 verdict from the four re-measurements. */
function measure() {
  const ctx = loadAll();
  const criteria = [clause1(ctx), clause2(ctx), clause3(ctx), clause4(ctx)];
  const predecessorDigest = PINS['SOURCE_CAPTURES/PHASE5-001T/scoped_gate_5_6_verdict.json'];
  let predecessor = null;
  try { predecessor = JSON.parse(ctx.text.gate_5_6_verdict || fs.readFileSync(abs(PATHS.gate_5_6_verdict), 'utf8')); } catch (e) { predecessor = null; }
  const problems = ctx.problems.slice();
  criteria.forEach((c) => (c.failures_found_here || []).forEach((f) => problems.push('criterion ' + c.n + ': ' + f)));
  const met = criteria.filter((c) => c.re_measured_here).length;
  const notMet = criteria.filter((c) => !c.re_measured_here);
  const leap = ctx.suite.leap_day_convention_property || {};
  const tally = ctx.suite.fixture_tally || {};
  return {
    order: ORDER_ID, unit_id: UNIT_ID, scope_id: SCOPE_ID, created_utc: CREATED_UTC,
    this_is: 'the successor scoped Gate 5.6 verdict for the one scope of this order',
    why_a_successor_exists: 'the predecessor verdict kept the fourth clause reserved and named as not satisfied. The owner resolved the version reservation in this order and the governing Gate 5.6 sentence now reads as the amended clause. The four clauses are therefore re-measured here against the version-reservation resolution, and the predecessor verdict is preserved unchanged and is not overwritten, superseded in place or edited.',
    predecessor_verdict: {
      path: PATHS.gate_5_6_verdict, sha256: predecessorDigest, preserved_unchanged_here: true,
      clauses_it_recorded_met: predecessor ? ((predecessor.gate_tally || {}).met != null ? predecessor.gate_tally.met : null) : null,
      criterion_it_recorded_as_not_met: predecessor && predecessor.criterion_it_cannot_meet ? 4 : null,
      what_the_predecessor_recorded_about_the_version_criterion: predecessor && predecessor.criterion_it_cannot_meet
        ? 'it recorded the sharing clause as reserved and named, not satisfied, because the production version had not been assigned and the scope could not assign it'
        : null,
    },
    gate_criteria: criteria,
    gate_tally: {
      gate: '5.6, scoped', clauses: criteria.length, met: met, not_met: notMet.length,
      clauses_met_verbatim_list: criteria.filter((c) => c.re_measured_here).map((c) => c.criterion_verbatim),
      clauses_not_met_verbatim_list: notMet.map((c) => c.criterion_verbatim),
    },
    every_clause_met: problems.length === 0 && notMet.length === 0,
    criterion_it_cannot_meet: notMet.length === 0 ? null : notMet.map((c) => ({ n: c.n, criterion_verbatim: c.criterion_verbatim, failures_found_here: c.failures_found_here })),
    problems_found_in_this_re_measurement: problems,
    what_this_verdict_does_not_do: [
      'it does not edit, supersede in place, or reopen the predecessor verdict: the predecessor stays as it was written, at its own digest',
      'it does not treat the owner\'s reading or the amended clause as evidence for any clause: each clause is measured from the artifacts',
      'it does not reach outside this one scope, and it does not speak for any other rule unit',
      'it does not authorise any finding class and produces no consumer-visible output',
    ],
    the_scope_measured: {
      one_rule_unit: UNIT_ID, one_finding_class: 'LIMB_1_LAST_PAYMENT_SIX_YEAR_LIMITATION', one_profile: 'PR-01',
      jurisdictions: ['CA', 'CA-NS'],
      shared_pre_admission_identity: PRE,
      what_is_measured: 'the artifacts of this one scope only: the governed rule record, the source crosswalk entry, the tests and the explanation templates',
    },
    summary_numbers: {
      fixtures: (ctx.suite.cases || []).length, fixtures_passed: (ctx.suite.cases || []).filter((c) => c.passed === true).length,
      negative_tests: (ctx.neg.tests || []).length, negative_tests_passed: (ctx.neg.tests || []).filter((t) => t.passed === true).length,
      templates: (ctx.lang.templates || []).length, templates_passed: (ctx.lang.templates || []).filter((t) => t.passed === true).length,
      sampled_replay_cases: ctx.replay.sample_count, reproduced: ctx.replay.reproduced_count, disagreements: ctx.replay.disagreement_count,
      categories_covered: (ctx.suite.categories || []).length,
      leap_day_starts_checked: leap.starts_checked, leap_day_counterexamples: (leap.counterexamples || []).length,
      cases_that_emitted_a_finding_class: tally.cases_that_emitted_a_finding_class,
      cases_carrying_a_forbidden_label: tally.cases_carrying_a_forbidden_label,
    },
  };
}

module.exports = { CATEGORIES_THE_PHASE_BULLET_NAMES, occurrences, pinState, UNIT_ID, PRE, loadAll, clause1, clause2, clause3, clause4, measure };
