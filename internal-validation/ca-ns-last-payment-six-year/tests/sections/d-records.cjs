'use strict';
/**
 * tests/sections/d-records.cjs — record binding: non-debt regions, multiple records, other sections and
 * section continuity. Every model here is synthetic test input.
 */

module.exports.run = function run(ctx) {
  const { test, assert, fixtures, syntheticRun } = ctx;

  test('D1 a field label printed outside any record is never read', () => {
    const run = syntheticRun(fixtures.specimen({ records: [], extraPages: { 16: ['Last Payment Date 2025/01/01'] } }));
    assert(run.extraction.last_payment_fact_summary.status === 'EXTRACTION_UNRESOLVED', `summary ${run.extraction.last_payment_fact_summary.status}`);
    assert(run.extraction.last_payment_fact_summary.reason === 'FIELD_LABEL_OUTSIDE_ANY_RECORD', `reason ${run.extraction.last_payment_fact_summary.reason}`);
    assert(run.extraction.collections_section.preamble_labels_outside_any_record.includes('Last Payment Date'), 'the stray label was not recorded');
    assert(JSON.stringify(run.comparisons).indexOf('2025-01-01') === -1, 'the stray value reached a comparison');
    return run.extraction.last_payment_fact_summary.reason;
  });

  test('D2 a region that is not the contract debt record is never read', () => {
    const run = syntheticRun(fixtures.specimen({ records: [['Date Assigned 2024/01/01', 'Amount 100']] }));
    const fact = run.extraction.last_payment_facts[0];
    assert(fact.status === 'NOT_A_DEBT_RECORD', `status ${fact.status}`);
    assert(fact.raw_value === null, 'a non-debt region produced a value');
    assert(run.extraction.last_payment_fact_summary.status === 'NOT_A_DEBT_RECORD', `summary ${run.extraction.last_payment_fact_summary.status}`);
    return `${fact.status} — ${fact.not_a_debt_record_reason}`;
  });

  test('D3 multiple records do not contaminate one another', () => {
    const run = syntheticRun(fixtures.specimen({
      records: [
        fixtures.recordLines({ lastPayment: '2021/02/01' }),
        fixtures.recordLines({ lastPaymentMode: 'omitted', dateAssigned: '2023/12/01' })
      ]
    }));
    const first = run.extraction.last_payment_facts[0];
    const second = run.extraction.last_payment_facts[1];
    assert(first.status === 'RESOLVED' && first.raw_value === '2021/02/01', `record 1 ${first.status}/${first.raw_value}`);
    assert(second.status === 'EXTRACTION_UNRESOLVED', `record 2 status ${second.status}`);
    assert(second.reason === 'LABEL_NOT_PRINTED_ON_RECORD', `record 2 reason ${second.reason}`);
    assert(second.raw_value === null, 'record 2 borrowed record 1 value');
    assert(run.extraction.debt_records.length === 2, 'the two records were not separated');
    return 'record 1 resolved 2021/02/01; record 2 unresolved with no borrowed value';
  });

  test('D4 a Last Payment Date printed in another section is never used', () => {
    const run = syntheticRun(fixtures.specimen({ lastPaymentLabelsOutside: { 12: '2019/09/09' } }));
    const facts = run.extraction.last_payment_facts;
    assert(facts.length === 1, `facts ${facts.length}`);
    assert(facts[0].raw_value === '2021/02/01', `value ${facts[0].raw_value}`);
    assert(facts[0].location.section === 'Collections', 'the fact was bound outside Collections');
    assert(JSON.stringify(run.comparisons).indexOf('2019-09-09') === -1, 'a value from another section was used');
    return 'the account-page date is not read for a Collections fact';
  });

  test('D5 a record-shaped label after the section is a continuity gap, not a silent truncation', () => {
    const run = syntheticRun(fixtures.specimen({ extraPages: { 18: ['Date Assigned 2024/01/01'] } }));
    assert(run.extraction.collections_section.status === 'EXTRACTION_UNRESOLVED', `status ${run.extraction.collections_section.status}`);
    assert(run.extraction.collections_section.reason === 'SECTION_CONTINUITY_GAP_AFTER_LAST_SECTION_PAGE', `reason ${run.extraction.collections_section.reason}`);
    return run.extraction.collections_section.reason;
  });
};
