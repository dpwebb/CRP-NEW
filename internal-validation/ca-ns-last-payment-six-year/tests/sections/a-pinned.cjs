'use strict';
/** tests/sections/a-pinned.cjs — the pinned presentation, end to end, through the unit's own entry point. */

module.exports.run = function run(ctx) {
  const { test, assert, canonical, pinnedRun } = ctx;

  test('A1 admission of the pinned specimen passes every predicate', () => {
    const run = pinnedRun();
    assert(run.admission.state === 'ADMITTED_PINNED_SPECIMEN', `admission state ${run.admission.state}`);
    assert(run.admission.predicates.every((p) => p.passed), 'a predicate failed on the evidenced specimen');
    return `${run.admission.predicates.length} predicates passed`;
  });

  test('A2 the request date is the printed header value on every page', () => {
    const rd = pinnedRun().extraction.request_date;
    assert(rd.status === 'RESOLVED', `status ${rd.status}`);
    assert(rd.raw_value === '2026/05/05', `printed value ${rd.raw_value}`);
    assert(rd.normalized_value === '2026-05-05', `normalized value ${rd.normalized_value}`);
    assert(rd.pages_with_label.length === 22, `pages carrying the label: ${rd.pages_with_label.length}`);
    return `${rd.raw_value} -> ${rd.normalized_value} on ${rd.pages_with_label.length} pages`;
  });

  test('A3 the Collections section resolves to the pages that carry record rows', () => {
    const section = pinnedRun().extraction.collections_section;
    assert(section.status === 'RESOLVED', `status ${section.status}`);
    assert(section.first_page === 16 && section.last_page === 17, `pages ${section.first_page}-${section.last_page}`);
    assert(section.record_count === 2, `records ${section.record_count}`);
    return `pages ${section.first_page}-${section.last_page}, heading at line ${section.heading.line}, ${section.record_count} records`;
  });

  test('A4 both collection records are contract debt records with distinct boundaries', () => {
    const run = pinnedRun();
    assert(run.extraction.debt_records.length === 2, `records ${run.extraction.debt_records.length}`);
    assert(run.extraction.debt_records.every((r) => r.debt_record), 'a region was not the contract debt record');
    const boundaries = run.extraction.debt_records.map((r) => `${r.boundary.page}:${r.boundary.line}`);
    assert(new Set(boundaries).size === 2, `boundaries ${boundaries.join(' ')}`);
    return boundaries.join(' ');
  });

  test('A5 each record binds its own printed Last Payment Date with a precise locator', () => {
    const facts = pinnedRun().extraction.last_payment_facts;
    assert(facts.length === 2, `facts ${facts.length}`);
    for (const fact of facts) {
      assert(fact.status === 'RESOLVED', `record ${fact.record_index} status ${fact.status}`);
      assert(fact.raw_value === '2021/02/01' && fact.normalized_value === '2021-02-01', `record ${fact.record_index} value ${fact.raw_value}`);
    }
    assert(facts[0].location.page === 16 && facts[0].location.line === 32, `record 1 locator ${JSON.stringify(facts[0].location)}`);
    assert(facts[1].location.page === 17 && facts[1].location.line === 5, `record 2 locator ${JSON.stringify(facts[1].location)}`);
    return 'record 1 page 16 line 32; record 2 page 17 line 5';
  });

  test('A6 the pinned specimen reproduces the arithmetic PROD-003 recorded', () => {
    for (const c of pinnedRun().comparisons) {
      assert(c.evaluation.intervening_days === 1919, `intervening days ${c.evaluation.intervening_days}`);
      assert(c.evaluation.six_year_span_in_days === 2191, `span ${c.evaluation.six_year_span_in_days}`);
      assert(c.evaluation.anniversary === '2027-02-01', `anniversary ${c.evaluation.anniversary}`);
      assert(c.evaluation.outcome === 'PERIOD_NOT_EXCEEDED', `outcome ${c.evaluation.outcome}`);
    }
    return '1,919 days against a 2,191-day span -> PERIOD_NOT_EXCEEDED on both records';
  });

  test('A7 no state carries between runs and identical inputs reproduce identical results', () => {
    const first = canonical(pinnedRun());
    const second = canonical(pinnedRun());
    assert(first === second, 'two runs on identical inputs differ');
    return `${first.length} canonical characters reproduced exactly`;
  });

  test('A8 the evaluation reads no clock', () => {
    const before = canonical(pinnedRun());
    const realNow = Date.now;
    Date.now = () => 4102444800000;
    const after = canonical(pinnedRun());
    Date.now = realNow;
    assert(before === after, 'the result changed when the clock was changed');
    return 'the result is byte-identical while the clock is stubbed';
  });

  test('A9 the result carries the preserved classification and authorizes no finding', () => {
    const run = pinnedRun();
    assert(run.legal_finding === null, 'a legal finding was emitted');
    assert(run.finding_authorized === false, 'a finding was authorized');
    assert(run.consumer_visible === false, 'the result is consumer-visible');
    assert(run.classification.state === 'PRESERVED_LEGACY_CLASSIFICATION_NOT_OVERRIDDEN', 'the classification is not the preserved one');
    assert(run.classification.legacy_determinability_level === 'D3', 'the recorded legacy level changed');
    assert(run.classification.legacy_permitted_conclusion === 'observation', 'the preserved conclusion changed');
    assert(run.classification.effective_ceiling_for_this_unit === 'OBSERVATION_CLASS_ONLY_UNTIL_THE_OWNER_DECIDES_AT_GATE_5_4', 'the ceiling is not observation-only');
    assert(run.result_qualifications.length >= 6, 'the unresolved qualifications are not carried');
    assert(!/PROBABLE_VIOLATION/.test(JSON.stringify(run.comparison_summary)), 'the comparison summary names the probable class');
    assert(run.result_provenance.presentation_evidence === true, 'the pinned result is not stamped as presentation evidence');
    return `${run.result_qualifications.length} qualifications carried`;
  });
};
