'use strict';
/** tests/sections/f-state.cjs — the state model: five distinct statuses, no substitution, separated concerns. */

module.exports.run = function run(ctx) {
  const { test, assert, constants, fixtures, pinnedRun, syntheticRun } = ctx;

  test('F1 the five fact statuses are five distinct states', () => {
    const values = Object.values(constants.FACT_STATUS);
    assert(values.length === 5, `statuses ${values.length}`);
    assert(new Set(values).size === 5, `duplicate status value among ${values.join(',')}`);
    assert(constants.FACT_STATUS.EXTRACTION_UNRESOLVED !== constants.FACT_STATUS.ABSENT_FROM_REPORT, 'EXTRACTION_UNRESOLVED equals ABSENT_FROM_REPORT');
    return values.join(' | ');
  });

  test('F2 no recorded refusal reason ever produces ABSENT_FROM_REPORT', () => {
    for (const [reason, status] of Object.entries(constants.REFUSAL_REASONS)) {
      assert(status !== constants.FACT_STATUS.ABSENT_FROM_REPORT, `${reason} maps to ABSENT_FROM_REPORT`);
    }
    return `${Object.keys(constants.REFUSAL_REASONS).length} refusal reasons, none of them absence`;
  });

  test('F3 a status and its value agree in every fact of the pinned run', () => {
    const run = pinnedRun();
    const facts = run.extraction.last_payment_facts.concat([run.extraction.request_date]);
    for (const fact of facts) {
      if (fact.status === constants.FACT_STATUS.RESOLVED) {
        assert(typeof fact.raw_value === 'string' && fact.raw_value.length > 0, `resolved ${fact.fact} has no printed value`);
        assert(typeof fact.normalized_value === 'string', `resolved ${fact.fact} has no normalized value`);
        assert(fact.reason === null, `resolved ${fact.fact} carries a reason`);
      } else {
        assert(fact.raw_value === null, `unresolved ${fact.fact} carries a printed value`);
        assert(typeof fact.reason === 'string' && fact.reason.length > 0, `unresolved ${fact.fact} carries no reason`);
      }
    }
    return `${facts.length} fact records consistent`;
  });

  test('F4 no comparison runs while either fact is unresolved', () => {
    const run = syntheticRun(fixtures.specimen({ records: [fixtures.recordLines({ lastPaymentMode: 'blank' })] }));
    const comparison = run.comparisons[0].evaluation;
    assert(comparison.outcome === 'UNRESOLVED', `outcome ${comparison.outcome}`);
    assert(/^LAST_PAYMENT_FACT_/.test(comparison.reason), `reason ${comparison.reason}`);
    assert(comparison.intervening_days === null && comparison.anniversary === null, 'an unresolved comparison carries arithmetic');
    return comparison.reason;
  });

  test('F5 the outcomes are exactly the three internal results and never a finding class', () => {
    const allowed = Object.values(constants.COMPARISON_OUTCOME);
    assert(allowed.join(',') === 'PERIOD_NOT_EXCEEDED,PERIOD_EXCEEDED,UNRESOLVED', `outcomes ${allowed.join(',')}`);
    const run = pinnedRun();
    for (const c of run.comparisons) assert(allowed.includes(c.evaluation.outcome), `unexpected outcome ${c.evaluation.outcome}`);
    assert(!/VIOLATION/.test(JSON.stringify(run.comparisons)), 'a finding class appears in the comparisons');
    return allowed.join(' | ');
  });

  test('F6 the selection must be explicit, authorized and enumerated', () => {
    const good = ctx.checkSelection('CA', 'CA-NS');
    const wrongRegion = ctx.checkSelection('CA', 'CA-ON');
    const inferred = ctx.checkSelection(null, null);
    assert(good.verdict === 'AUTHORIZED' && good.enumerated_region_found === true, `good ${JSON.stringify(good)}`);
    assert(wrongRegion.verdict === 'REFUSED' && wrongRegion.enumerated_region_found === true, 'another enumerated region was accepted for this unit');
    assert(inferred.verdict === 'REFUSED' && inferred.explicit_selection_supplied === false, 'an absent selection was accepted');
    assert(inferred.jurisdiction_is_never_inferred_from_the_report === true, 'inference is not refused');
    return 'authorized CA/CA-NS only; CA/CA-ON and an absent selection are refused';
  });
};
