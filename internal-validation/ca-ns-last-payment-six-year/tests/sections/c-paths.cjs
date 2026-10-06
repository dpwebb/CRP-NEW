'use strict';
/**
 * tests/sections/c-paths.cjs — failure and ambiguity paths.
 * Every model in this section is synthetic test input and is stamped as such by the unit's provenance record.
 */

module.exports.run = function run(ctx) {
  const { test, assert, fixtures, syntheticRun, makeSyntheticModel } = ctx;

  test('C1 a printed label with no value is unresolved, never absent', () => {
    const run = syntheticRun(fixtures.specimen({ records: [fixtures.recordLines({ lastPaymentMode: 'blank' })] }));
    const fact = run.extraction.last_payment_facts[0];
    assert(fact.status === 'EXTRACTION_UNRESOLVED', `status ${fact.status}`);
    assert(fact.reason === 'LABEL_PRINTED_WITHOUT_VALUE', `reason ${fact.reason}`);
    assert(fact.raw_value === null, 'a value was recorded for a blank label');
    assert(run.extraction.last_payment_fact_summary.status !== 'ABSENT_FROM_REPORT', 'a blank value was collapsed into absence');
    return `${fact.status} / ${fact.reason}`;
  });

  test('C2 a record that does not print the label is unresolved, never absent', () => {
    const run = syntheticRun(fixtures.specimen({ records: [fixtures.recordLines({ lastPaymentMode: 'omitted' })] }));
    const fact = run.extraction.last_payment_facts[0];
    assert(fact.status === 'EXTRACTION_UNRESOLVED' && fact.reason === 'LABEL_NOT_PRINTED_ON_RECORD', `${fact.status}/${fact.reason}`);
    return `${fact.status} / ${fact.reason}`;
  });

  test('C3 a malformed request date leaves the reference date unresolved', () => {
    const run = syntheticRun(fixtures.specimen({ requestDate: '2026-05-05' }));
    assert(run.extraction.request_date.status === 'EXTRACTION_UNRESOLVED', `status ${run.extraction.request_date.status}`);
    assert(run.extraction.request_date.reason === 'REQUEST_DATE_MALFORMED_PRINTED_FORM', `reason ${run.extraction.request_date.reason}`);
    assert(run.comparisons[0].evaluation.outcome === 'UNRESOLVED', 'a comparison ran on a malformed date');
    return run.extraction.request_date.reason;
  });

  test('C4 contradictory request dates across pages are rejected', () => {
    const pages = [];
    for (let page = 1; page <= 22; page += 1) {
      pages.push([fixtures.header(page === 22 ? '2026/05/06' : '2026/05/05')]);
      if (page === 16) pages[page - 1].push('Collections', ...fixtures.recordLines({}));
    }
    const run = syntheticRun(makeSyntheticModel({ pages, page_count: 22 }));
    assert(run.extraction.request_date.status === 'EXTRACTION_UNRESOLVED', `status ${run.extraction.request_date.status}`);
    assert(run.extraction.request_date.reason === 'REQUEST_DATE_CONTRADICTORY', `reason ${run.extraction.request_date.reason}`);
    assert(run.comparisons[0].evaluation.outcome === 'UNRESOLVED', 'a comparison ran on contradictory headers');
    return run.extraction.request_date.reason;
  });

  test('C5 an impossible calendar date is unresolved in both facts', () => {
    const reference = syntheticRun(fixtures.specimen({ requestDate: '2026/02/30' }));
    assert(reference.extraction.request_date.reason === 'REQUEST_DATE_IMPOSSIBLE_CALENDAR_VALUE', `reference reason ${reference.extraction.request_date.reason}`);
    const printed = syntheticRun(fixtures.specimen({ records: [fixtures.recordLines({ lastPayment: '2026/02/30' })] }));
    assert(printed.extraction.last_payment_facts[0].reason === 'IMPOSSIBLE_CALENDAR_VALUE', `printed reason ${printed.extraction.last_payment_facts[0].reason}`);
    return 'an impossible reference date and an impossible printed payment date are both unresolved';
  });

  test('C6 a header label missing from some pages is unresolved', () => {
    const pages = [];
    for (let page = 1; page <= 22; page += 1) {
      pages.push(page === 22 ? ['Credit Report'] : [fixtures.header('2026/05/05')]);
      if (page === 16) pages[page - 1].push('Collections', ...fixtures.recordLines({}));
    }
    const run = syntheticRun(makeSyntheticModel({ pages, page_count: 22 }));
    assert(run.extraction.request_date.reason === 'REQUEST_DATE_NOT_ON_EVERY_PAGE', `reason ${run.extraction.request_date.reason}`);
    return run.extraction.request_date.reason;
  });

  test('C7 a missing Collections heading is unresolved, never an absence', () => {
    const run = syntheticRun(fixtures.specimen({ heading: null }));
    assert(run.extraction.collections_section.status === 'EXTRACTION_UNRESOLVED', `status ${run.extraction.collections_section.status}`);
    assert(run.extraction.collections_section.reason === 'SECTION_HEADING_NOT_FOUND', `reason ${run.extraction.collections_section.reason}`);
    assert(run.extraction.last_payment_facts[0].status === 'EXTRACTION_UNRESOLVED', 'a missing section was read as absence');
    assert(run.extraction.last_payment_fact_summary.status !== 'ABSENT_FROM_REPORT', 'a missing section was collapsed into absence');
    return run.extraction.collections_section.reason;
  });

  test('C8 a resolved section with no collection record is a demonstrable absence', () => {
    const run = syntheticRun(fixtures.specimen({ records: [], extraPages: { 16: ['Balance 0'] } }));
    assert(run.extraction.collections_section.status === 'RESOLVED', `section status ${run.extraction.collections_section.status}`);
    assert(run.extraction.last_payment_fact_summary.status === 'ABSENT_FROM_REPORT', `summary ${run.extraction.last_payment_fact_summary.status}`);
    assert(run.extraction.last_payment_fact_summary.reason === 'SECTION_LOCATED_AND_RESOLVED_WITH_NO_COLLECTION_RECORD', `reason ${run.extraction.last_payment_fact_summary.reason}`);
    return `ABSENT_FROM_REPORT / ${run.extraction.last_payment_fact_summary.reason}`;
  });
};
