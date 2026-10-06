'use strict';
/**
 * build_001t_independent_replay.cjs — PHASE5-001T deliverable 3: the independent replay.
 *
 * Order of operations, recorded: this harness FIRST writes the reviewer's expectations to
 * replay_expectations_frozen.json and takes that file's digest, and ONLY THEN runs the pinned evaluator on any
 * sampled case. The reviewer module reads neither the evaluator nor any result of this order.
 *
 * It writes two artifacts and nothing else: replay_expectations_frozen.json and independent_replay_001t.json.
 */
const I = require('./inputs_001t.cjs');
const K = require('./fixtures_001t.cjs');
const R = require('./reviewer_001t.cjs');

const E = K.E;
const ADMITTED = K.syntheticAdmittedCopy();

// ---------------------------------------------------------------- 1. freeze the reviewer's expectations first
const frozenFile = I.writeJson('replay_expectations_frozen.json', {
  artifact: 'replay_expectations_frozen.json',
  work_order: I.ORDER_ID,
  created_utc: I.CREATED_UTC,
  document_type: 'FROZEN INDEPENDENT EXPECTATIONS — written before the evaluator was run on any sampled case',
  purpose: 'freeze the independent reviewer\'s expectations, and the sources they were derived from, before any evaluator output for a sampled case was read',
  frozen_before_comparison: true,
  the_reviewer: R.reviewerRecord,
  expectations: R.SAMPLE.map((s) => ({ id: s.id, reproduces: s.reproduces, values: s.values, expectation: s.expectation, derived_from: s.derived_from })),
  created_by: I.ORDER_ID,
});
const frozenDigest = I.sha256File(I.abs('SOURCE_CAPTURES\\PHASE5-001T\\replay_expectations_frozen.json'));

// ---------------------------------------------------------------- 2. the reviewer's independence, measured
const reviewerSource = I.readText('SOURCE_CAPTURES\\PHASE5-001T\\reviewer_001t.cjs');
/** the reviewer's executable code, with comments and every string literal removed, so a mention in prose cannot be mistaken for a read */
const reviewerCodeOnly = reviewerSource
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^[ \t]*\/\/[^\n]*$/gm, '')
  .replace(/\s\/\/[^\n]*/g, '')
  .replace(/'(?:[^'\\\n]|\\.)*'/g, "''")
  .replace(/"(?:[^"\\\n]|\\.)*"/g, '""');
const modulesTheReviewerLoads = Array.from(reviewerSource.matchAll(/require\(([^)]*)\)/g))
  .map((m) => m[1].replace(/['"]/g, '').trim());
const projectFilesTheReviewerLoads = modulesTheReviewerLoads.filter((m) => m.indexOf('/') !== -1 || m.indexOf('\\') !== -1);
const independenceMeasured = {
  reviewer_source_path: 'SOURCE_CAPTURES\\PHASE5-001T\\reviewer_001t.cjs',
  modules_the_reviewer_loads: modulesTheReviewerLoads,
  project_files_the_reviewer_loads: projectFilesTheReviewerLoads,
  the_reviewer_loads_no_project_file: projectFilesTheReviewerLoads.length === 0,
  the_reviewers_executable_code_names_the_evaluator: reviewerCodeOnly.indexOf('evaluator_001r') !== -1,
  the_reviewers_executable_code_names_the_fixture_kit: reviewerCodeOnly.indexOf('fixtures_001t') !== -1,
  the_reviewers_executable_code_names_the_catalogue: reviewerCodeOnly.indexOf('fixture_catalogue') !== -1,
  the_reviewer_names_them_only_in_its_own_declaration_of_what_it_does_not_read:
    reviewerSource.indexOf('evaluator_001r') !== -1 && reviewerCodeOnly.indexOf('evaluator_001r') === -1,
  the_reviewer_reads_a_result_record_of_this_order: /fixture_suite_001t|negative_tests_001t|independent_replay_001t/.test(reviewerCodeOnly),
  expectations_were_frozen_before_any_evaluator_run: true,
  the_frozen_file_digest: frozenDigest,
};

// ---------------------------------------------------------------- 3. the sampled inputs, built from the reviewer's own values
const printed = (iso) => String(iso).replace(/-/g, '/');
const SAMPLED = {
  'RS-01': () => K.inputOf({ ruleRecord: ADMITTED, reference: K.refObs(printed(R.SAMPLE.filter((s) => s.id === 'RS-01')[0].values.reference_date)), collections: K.collectionsOf([K.debtRecord(2, printed(R.SAMPLE.filter((s) => s.id === 'RS-01')[0].values.clock_start))]) }),
  'RS-02': () => K.inputOf({ ruleRecord: ADMITTED, reference: K.refObs('2026/05/05'), collections: K.collectionsOf([K.debtRecord(2, '2019/01/01')]) }),
  'RS-03': () => K.inputOf({ ruleRecord: ADMITTED, reference: K.refObs('2027/02/01'), collections: K.collectionsOf([K.debtRecord(2, '2021/02/01')]) }),
  'RS-04': () => K.inputOf({ ruleRecord: ADMITTED, reference: K.refObs('2022/02/28'), collections: K.collectionsOf([K.debtRecord(2, '2016/02/29')]) }),
  'RS-05': () => K.inputOf({ ruleRecord: ADMITTED, reference: K.refObs('2022/02/27'), collections: K.collectionsOf([K.debtRecord(2, '2016/02/29')]) }),
  'RS-06': () => K.inputOf({ ruleRecord: ADMITTED, reference: K.refObs('2022/03/01'), collections: K.collectionsOf([K.debtRecord(2, '2016/02/29')]) }),
  'RS-07': () => K.inputOf({ ruleRecord: ADMITTED, reference: K.refObs('2020/05/01'), collections: K.collectionsOf([K.debtRecord(2, '2020/06/15')]) }),
  'RS-08': () => K.inputOf({ ruleRecord: ADMITTED, reference: K.refObsContradictory(['2026/05/05', '2026/05/06']), collections: K.collectionsOf([K.debtRecord(2, '2021/02/01')]) }),
  'RS-09': () => K.inputOf({ ruleRecord: ADMITTED, reference: K.refObs('2026/05/05'), collections: K.collectionsOf([K.blankRecord(2)]) }),
  'RS-10': () => K.inputOf({ ruleRecord: ADMITTED, reference: K.refObs('2026/05/05'), collections: K.collectionsNoRecords() }),
  'RS-11': () => K.inputOf({ ruleRecord: ADMITTED, reference: K.refObs('2026/05/05'), collections: K.collectionsUnresolved('SECTION_NOT_INSPECTED') }),
  'RS-12': () => K.inputOf({ presentation: K.REFUSED_DESCRIPTOR('SYNTHETIC_OR_FIXTURE_MARKER'), reference: K.refObs('2026/05/05'), collections: K.collectionsOf([K.debtRecord(2, '2021/02/01')]) }),
  'RS-13': () => K.inputOf({ mapping: K.WRONG_LABEL_MAPPING, reference: K.refObs('2026/05/05'), collections: K.collectionsOf([K.debtRecord(2, '2021/02/01')]) }),
  'RS-14': () => K.inputOf({ ruleRecord: ADMITTED, secondLimb: true, reference: K.refObs('2026/05/05'), collections: K.collectionsOf([K.debtRecord(2, '2021/02/01')]) }),
  'RS-15': () => K.inputOf({ reference: K.refObs('2026/05/05'), collections: K.collectionsOf([K.debtRecord(2, '2021/02/01')]) }),
  'RS-16': () => K.inputOf({ selection: K.CA_ON, reference: K.refObs('2026/05/05'), collections: K.collectionsOf([K.debtRecord(2, '2021/02/01')]) }),
  'RS-17': () => K.inputOf({ ruleRecord: ADMITTED, reference: K.refObs('2026/05/05'), collections: K.collectionsOf([K.debtRecord(2, '2010/01/01'), K.debtRecord(3, '2021/02/01')]) }),
};

// ---------------------------------------------------------------- 4. run, compare, reconcile
function observe(res) {
  const per = (res.facts.last_payment && res.facts.last_payment.per_record) || [];
  const unit = res.facts.last_payment ? res.facts.last_payment.unit_level : null;
  const ref = res.facts.reference_date;
  return {
    refusal: res.refusal,
    first_failing_gate: res.first_failing_gate,
    outcome: res.outcome,
    facts_layer_runs: res.facts.state === 'RUN',
    comparison_runs: res.comparisons.state === 'RUN' || res.comparisons.state === 'RUN_NO_RECORD',
    comparison_layer_state: res.comparisons.state,
    reference_date_status: ref ? ref.status : null,
    reference_date_reason: ref ? ref.reason : null,
    last_payment_status: per[0] ? per[0].last_payment_fact.status : null,
    last_payment_reason: per[0] ? per[0].last_payment_fact.reason : null,
    unit_level_status: unit ? unit.status : null,
    unit_level_reason: unit ? unit.reason : null,
    per_record_comparisons: res.comparisons.per_record,
  };
}
const COMPARISON_KEYS = ['clock_start', 'reference_date', 'anniversary', 'span_in_days', 'elapsed_days', 'comparison_outcome', 'reason', 'boundary_case', 'conventions_carried', 'outcome_withheld'];
/** value equality, so that an array or an object is compared by value and not by object identity */
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
/**
 * Two of the reviewer's expectations are its own derivations and have no counterpart field in the evaluator's
 * record. They are checked against what they were derived from, and how each is read is recorded:
 *   outcome_withheld          — read as the boundary case being reached (the reference date equalling the
 *                               sixth anniversary), which is the reviewer's own reading of convention c6
 *   comparison_runs           — read as a comparison producing an outcome (PERIOD_EXCEEDED or
 *                               PERIOD_NOT_EXCEEDED), not as the comparison layer being reached
 *   facts_layer_runs          — read as the fact layer state being RUN
 */
const COMPARISON_KEY_DEFINITIONS = {
  outcome_withheld: 'the reviewer\'s own reading of convention c6: true when the comparison returns UNRESOLVED with the boundary case EXACTLY_AT_SIX_YEAR_ANNIVERSARY. Compared against the boundary case in the evaluator\'s record.',
  comparison_runs: 'true when a comparison produces an outcome (PERIOD_EXCEEDED or PERIOD_NOT_EXCEEDED). A record on which the layer runs but returns UNRESOLVED has not had a comparison run.',
  facts_layer_runs: 'true when the fact layer state is RUN.',
  conventions_carried: 'read as the six conventions the specification says every comparison carries, compared by value.',
};
const outcomeWithheld = (c) => c && c.boundary_case === 'BOUNDARY_CASE_EXACTLY_AT_SIX_YEAR_ANNIVERSARY';
const anOutcomeRan = (obs) => obs.per_record_comparisons.some((c) => c.comparison_outcome === 'PERIOD_EXCEEDED' || c.comparison_outcome === 'PERIOD_NOT_EXCEEDED');

function compareOne(exp, obs, id, fails) {
  Object.keys(exp).forEach((k) => {
    if (k === 'per_record') {
      const want = exp.per_record;
      const got = obs.per_record_comparisons;
      if (!got || got.length !== want.length) { fails.push({ case: id, field: 'per_record', expected: want.length + ' records', observed: got ? got.length + ' records' : 'none' }); return; }
      want.forEach((w, i) => {
        Object.keys(w).forEach((wk) => {
          if (wk === 'outcome_withheld') {
            const observed = outcomeWithheld(got[i]);
            if (w[wk] !== observed) fails.push({ case: id, field: 'per_record[' + i + '].' + wk, expected: w[wk], observed });
            return;
          }
          if (!same(w[wk], got[i][wk])) fails.push({ case: id, field: 'per_record[' + i + '].' + wk, expected: w[wk], observed: got[i][wk] });
        });
      });
      return;
    }
    if (k === 'the_registers_own_demonstration' || k === 'ties_to_the_registers_own_demonstration') {
      // the reviewer's own tie to the register: checked against the register, not against the evaluator
      const demo = I.readJson(I.PATHS.register).deterministic_evaluation_demonstration;
      const ok = k === 'ties_to_the_registers_own_demonstration'
        ? exp[k] === true
        : same(exp[k].intervening_days, demo.inputs.intervening_days)
          && same(exp[k].six_year_span_in_days, demo.inputs.six_year_span_in_days)
          && same(exp[k].six_year_boundary_from_last_payment, demo.inputs.six_year_boundary_from_last_payment)
          && same(exp[k].result_on_this_specimen, demo.result_on_this_specimen);
      if (!ok) fails.push({ case: id, field: k, expected: exp[k], observed: 'the register records different numbers' });
      return;
    }
    if (k === 'outcome_withheld') {
      const observed = outcomeWithheld(obs.per_record_comparisons[0]);
      if (exp[k] !== observed) fails.push({ case: id, field: k, expected: exp[k], observed });
      return;
    }
    if (k === 'comparison_runs') {
      const observed = anOutcomeRan(obs);
      if (exp[k] !== observed) fails.push({ case: id, field: k, expected: exp[k], observed });
      return;
    }
    if (COMPARISON_KEYS.indexOf(k) !== -1) {
      const got = obs.per_record_comparisons[0] || {};
      if (!same(exp[k], got[k])) fails.push({ case: id, field: k, expected: exp[k], observed: got[k] });
      return;
    }
    if (k === 'fact_statuses') {
      Object.keys(exp.fact_statuses).forEach((f) => {
        const observed = f === 'reference_date' ? obs.reference_date_status : obs.last_payment_status;
        if (exp.fact_statuses[f] !== observed) fails.push({ case: id, field: 'fact_statuses.' + f, expected: exp.fact_statuses[f], observed });
      });
      return;
    }
    if (k === 'no_merged_value') {
      const observed = obs.per_record_comparisons.length > 1;
      if (exp[k] !== observed) fails.push({ case: id, field: k, expected: exp[k], observed });
      return;
    }
    if (k === 'outcome') {
      const observed = obs.outcome === null ? null : 'an observation record';
      const expected = exp[k] === null ? null : 'an observation record';
      if (!same(expected, observed)) fails.push({ case: id, field: k, expected, observed });
      return;
    }
    if (!same(exp[k], obs[k])) fails.push({ case: id, field: k, expected: exp[k], observed: obs[k] });
  });
}

const results = [];
R.SAMPLE.forEach((s) => {
  const build = SAMPLED[s.id];
  if (!build) { results.push({ id: s.id, reproduced: false, disagreements: [{ case: s.id, field: 'sample', expected: 'a sampled input', observed: 'none built' }] }); return; }
  const input = build();
  const res = E.evaluate(input);
  const obs = observe(res);
  const fails = [];
  compareOne(s.expectation, obs, s.id, fails);
  results.push({
    id: s.id,
    reproduces: s.reproduces,
    the_reviewers_frozen_expectation: s.expectation,
    what_the_evaluator_returned: obs,
    disagreements: fails,
    reconciled: fails.length === 0,
    reproduced: fails.length === 0,
  });
});

const disagreements = results.flatMap((r) => r.disagreements.map((d) => Object.assign({}, d)));
/**
 * Reconciliation. Each disagreement is classified by what it touches, and the reconciliation states which
 * reading the record can act on. A disagreement that the pinned text does not settle is recorded as UNRESOLVED
 * rather than closed, and no disagreement is repaired silently.
 */
const reconciliations = disagreements.map((d) => {
  const arithmetic = COMPARISON_KEYS.concat(['per_record']).indexOf(d.field) !== -1;
  const numeric = /span_in_days|elapsed_days|anniversary|boundary_case|comparison_outcome/.test(d.field || '');
  return Object.assign({}, d, {
    what_it_touches: arithmetic ? 'the date arithmetic or a date-derived status' : (String(d.field).indexOf('refusal') !== -1 || String(d.field).indexOf('gate') !== -1 ? 'a refusal or a gate' : 'a status or a layer state'),
    the_reviewers_reading: JSON.stringify(d.expected),
    the_evaluators_reading: JSON.stringify(d.observed),
    reconciliation: numeric
      ? 'the reviewer computes from the source pin and the report excerpt with its own algorithm, and the register carries its own demonstration of this specimen\'s numbers. Both independent numbers are compared with the evaluator\'s on the record.'
      : 'the reviewer reads the condition out of the pinned specification text and the pinned status vocabulary; the disagreement is recorded against the text it cites.',
    sustained_reading: numeric
      ? 'RECORDED AS A DEFECT FOR THIS SCOPE — the reviewer\'s derivation stands on the record beside the evaluator\'s, and this order may not repair the evaluator: the defect and its required repair scope are reported'
      : 'RECORDED AS A DEFECT FOR THIS SCOPE — the pinned text is the reference, and this order reports the divergence rather than deciding it',
    closed: false,
  });
});
const unresolved = reconciliations.filter((r) => !r.closed).map((r) => r.case + '.' + r.field);

// ---------------------------------------------------------------- 5. write the replay record
const reproduced = results.filter((r) => r.reproduced).length;
const pins = I.pinReport();
const pinFailures = pins.filter((p) => p.state !== 'MATCHES_THE_PIN');
const register = I.readJson(I.PATHS.register);
const demonstration = register.deterministic_evaluation_demonstration;

const written = I.writeJson('independent_replay_001t.json', {
  artifact: 'independent_replay_001t.json',
  work_order: I.ORDER_ID,
  created_utc: I.CREATED_UTC,
  document_type: 'INDEPENDENT REPLAY RESULT — one scope only. NOT ADMITTED, no emission, no consumer-visible output',
  purpose: 'record the independent replay the Phase 5.6 bullet requires: a sample of each result reproduced from the source pin and the report excerpt by a reviewer that did not see the evaluator or its output first, with every disagreement reconciled and recorded, or recorded as unresolved',
  the_governing_text_read: {
    document: I.PATHS.plan,
    clause: 'section 3, Phase 5.6 bullet 3 (the independent replay)',
    line: 167,
    text: '- Use an independent reviewer to reproduce a sample of each result from the source pin and report excerpt without seeing the evaluator output first. Reconcile any disagreement before rule approval.',
  },
  order_of_operations: {
    step_1: 'the comparison harness writes replay_expectations_frozen.json, the reviewer\'s expectations, and takes its digest',
    step_2: 'only then does it run the pinned evaluator on the sampled cases',
    the_frozen_file: 'SOURCE_CAPTURES\\PHASE5-001T\\replay_expectations_frozen.json',
    the_frozen_file_sha256: frozenDigest,
    why_this_matters: 'the digest, not a statement of intent, is what shows the expectations were written first',
  },
  reviewer_independence_measured: independenceMeasured,
  reviewer_independence: R.independence,
  how_the_reviewers_own_derived_fields_are_read: COMPARISON_KEY_DEFINITIONS,
  transcription_identity_reproduced_from_the_source_pin: R.reviewerRecord.transcription_identity_reproduced_from_the_source_pin,
  the_report_excerpt_the_reviewer_read: R.reviewerRecord.the_report_excerpt_as_the_reviewer_read_it,
  the_registers_own_demonstration_matched: demonstration.inputs.intervening_days === 1919
    && demonstration.inputs.six_year_span_in_days === 2191
    && demonstration.result_on_this_specimen === 'PERIOD_NOT_EXCEEDED'
    && results.filter((r) => r.id === 'RS-01')[0].reproduced,
  sampled_inputs_are_synthetic: 'every sampled input is an in-memory fixture of the shape the report fact model defines. The two printed values the specimen carries are read from the register\'s own field records and are converted from the register\'s ISO form to the presentation\'s printed DDDD/DD/DD form for the in-memory observation. No report is opened.',
  sample_count: results.length,
  reproduced_count: reproduced,
  disagreement_count: disagreements.length,
  disagreements,
  reconciliations,
  unresolved_disagreements: unresolved,
  the_distinct_result_states_sampled: [
    'PERIOD_EXCEEDED', 'PERIOD_NOT_EXCEEDED', 'the withheld boundary day', 'the clamped leap-day boundary',
    'the day before and the day after the clamp', 'a reference date preceding the printed date',
    'CONTRADICTED', 'EXTRACTION_UNRESOLVED', 'ABSENT_FROM_REPORT', 'a non-debt region',
    'each of the six named refusals', 'collection-record isolation with two records',
  ],
  results,
  pin_verification: { pins, all_match: pinFailures.length === 0, mismatches: pinFailures },
  verdict: disagreements.length === 0
    ? 'EVERY SAMPLED RESULT WAS REPRODUCED — ' + results.length + ' samples, 0 disagreements'
    : 'DISAGREEMENTS REMAIN: ' + disagreements.length + ' recorded, ' + unresolved.length + ' unresolved',
  what_this_record_does_not_do: [
    'it admits no rule, creates no coverage or candidate and authorises no finding class',
    'it is not independent legal review: it reproduces arithmetic and statuses against pinned text',
    'it does not claim a second human reviewer, and it records the procedural limits of its independence',
    'it does not conform, modify or adopt the internal comparator of PHASE5-001I-A and does not run its suite',
    'it does not decide the effective period, the exception or the anniversary-boundary question',
  ],
  created_by: I.ORDER_ID,
});

console.log('independent replay: ' + results.length + ' samples | reproduced: ' + reproduced + ' | disagreements: ' + disagreements.length + ' | unresolved: ' + unresolved.length + ' | pin mismatches: ' + pinFailures.length + ' | written ' + written.bytes + ' bytes');
results.filter((r) => !r.reproduced).forEach((r) => console.log('  DISAGREEMENT ' + r.id + ': ' + JSON.stringify(r.disagreements)));
