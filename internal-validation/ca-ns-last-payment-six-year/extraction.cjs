'use strict';
/**
 * extraction.cjs — the bounded extraction: two facts, five distinct statuses, one record per fact target.
 *
 * PHASE5-001I-A. The extraction status of a fact is never the comparison outcome, and no status is ever
 * substituted for another: an unresolved label is not an absent field, a non-debt region is not a failed
 * parse, and a refused document is not an empty report.
 */

const { FACT_STATUS, HEADER_LABEL } = require('./constants.cjs');
const { admitDocument } = require('./presentation-contract.cjs');
const { locateRequestDate, locateCollectionsSection, locateDebtRecords, bindLastPaymentDate } = require('./locators.cjs');

function refusedFact(status, reason, extra) {
  return Object.assign({
    fact: 'DEBT_LAST_PAYMENT_DATE', source_field: 'Last Payment Date', section_path: 'Collections',
    record_index: null, status, reason, raw_value: null, normalized_value: null
  }, extra || {});
}

/**
 * Extract the two facts. `options.synthetic_test_input` exists ONLY for the test suite: it is refused unless
 * the model is synthetic, and it stamps the admission so no result reached that way can be read as
 * presentation evidence for a real report.
 */
function extractFacts(model, evidence, options) {
  const opts = options || {};
  let admission;
  if (opts.synthetic_test_input === true) {
    if (!model.synthetic) throw new Error('REFUSED_INTERNAL_INVARIANT: synthetic_test_input requires a synthetic model');
    admission = {
      state: 'SYNTHETIC_TEST_INPUT_NOT_A_REPORT', admitted: true, refusal_reason: null, fact_status: null,
      presentation_evidence: false,
      note: 'in-memory synthetic test input: not a report, not presentation evidence, not admissible',
      predicates: [{ id: 'SYNTHETIC_TEST_INPUT', passed: true, detail: 'in-memory synthetic text model', refusal_reason: null }]
    };
  } else {
    admission = Object.assign({ presentation_evidence: true }, admitDocument(model, evidence));
  }
  const requestDate = locateRequestDate(model);

  if (!admission.admitted) {
    const status = admission.fact_status;
    return {
      admission, request_date: requestDate,
      collections_section: null, debt_records: [],
      last_payment_facts: [refusedFact(status, `DOCUMENT_REFUSED:${admission.refusal_reason}`)],
      last_payment_fact_summary: { status, reason: `DOCUMENT_REFUSED:${admission.refusal_reason}`, resolved_fact_count: 0, contract_debt_record_count: 0 }
    };
  }

  const section = locateCollectionsSection(model);
  if (section.status !== FACT_STATUS.RESOLVED) {
    return {
      admission, request_date: requestDate,
      collections_section: { status: section.status, reason: section.reason, heading_lines: section.heading_lines },
      debt_records: [],
      last_payment_facts: [refusedFact(FACT_STATUS.EXTRACTION_UNRESOLVED, section.reason)],
      last_payment_fact_summary: { status: FACT_STATUS.EXTRACTION_UNRESOLVED, reason: section.reason, resolved_fact_count: 0, contract_debt_record_count: 0 }
    };
  }

  const located = locateDebtRecords(section);
  const sectionView = {
    status: section.status, first_page: section.first_page, last_page: section.last_page,
    heading: section.heading_lines[0], preamble_labels_outside_any_record: located.preamble_labels_outside_any_record,
    record_count: located.records.length
  };
  const recordViews = located.records.map((r) => ({
    record_index: r.record_index, boundary: r.boundary, end: r.end, debt_record: r.debt_record,
    labels_present: r.labels_present, not_a_debt_record_reason: r.not_a_debt_record_reason
  }));

  const lastPaymentFacts = located.records.map((r) => (r.debt_record
    ? bindLastPaymentDate(r)
    : refusedFact(FACT_STATUS.NOT_A_DEBT_RECORD, 'NOT_A_DEBT_RECORD', {
      record_index: r.record_index,
      measured_labels: r.labels_present,
      not_a_debt_record_reason: r.not_a_debt_record_reason
    })));

  const resolvedCount = lastPaymentFacts.filter((f) => f.status === FACT_STATUS.RESOLVED).length;
  const contractDebtRecordCount = located.records.filter((r) => r.debt_record).length;
  let summary;
  if (lastPaymentFacts.length === 0) {
    const strayLabel = located.preamble_labels_outside_any_record.includes('Last Payment Date');
    summary = {
      status: strayLabel ? FACT_STATUS.EXTRACTION_UNRESOLVED : FACT_STATUS.ABSENT_FROM_REPORT,
      reason: strayLabel ? 'FIELD_LABEL_OUTSIDE_ANY_RECORD' : 'SECTION_LOCATED_AND_RESOLVED_WITH_NO_COLLECTION_RECORD'
    };
  } else if (resolvedCount > 0) {
    summary = { status: FACT_STATUS.RESOLVED, reason: null };
  } else if (contractDebtRecordCount > 0) {
    summary = { status: FACT_STATUS.EXTRACTION_UNRESOLVED, reason: lastPaymentFacts[0].reason };
  } else {
    summary = { status: FACT_STATUS.NOT_A_DEBT_RECORD, reason: 'NO_CONTRACT_DEBT_RECORD_IN_RESOLVED_SECTION' };
  }

  return {
    admission, request_date: requestDate, collections_section: sectionView, debt_records: recordViews,
    last_payment_facts: lastPaymentFacts,
    last_payment_fact_summary: Object.assign(summary, { resolved_fact_count: resolvedCount, contract_debt_record_count: contractDebtRecordCount })
  };
}

module.exports = { extractFacts, HEADER_LABEL };
