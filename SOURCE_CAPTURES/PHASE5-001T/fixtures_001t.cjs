'use strict';
/**
 * fixtures_001t.cjs — PHASE5-001T deliverable 1, in data form: the fixture suite for
 * CA-NS-CRA-S10-3-C-LIMB-1 on PR-01, covering every category the Phase 5.6 fixture bullet names.
 *
 * Every fixture in this file is SYNTHETIC. Nothing here is a presentation, a report, a consumer document or
 * evidence of one: the fixture inputs are in-memory observations of the shape report_fact_model.json defines,
 * and the specimen PR-01 is never opened, parsed or re-exported by this order. A synthetic fixture may never
 * be counted as consumer-report presentation evidence.
 *
 * Each fixture states the state it must reach, in `the_state_it_must_reach`, and carries the projection it
 * must produce in `expected`. The state statements are read out of the pinned text: the governed rule record,
 * the deterministic evaluator specification (its decision rules, its gate order and its six conventions), the
 * extraction-status vocabulary and the output vocabulary. The builder compares; it does not choose.
 */
const { PATHS, readJson, requireEvaluator } = require('./inputs_001t.cjs');

const E = requireEvaluator();
const RULE_RECORD = readJson(PATHS.rule_record);

/** The pinned rule record as it stands: NOT_ADMITTED, the operative state of this scope. */
function pinnedRuleRecord() { return JSON.parse(JSON.stringify(RULE_RECORD)); }

/**
 * A synthetic in-memory copy of the same record with its admission state marked ADMITTED, so that the
 * arithmetic layer behind gate G6 can be exercised at all. This is NOT an admission, it is not an admission
 * in any part of this workspace, and it is not evidence for any gate: the evaluator still emits nothing.
 */
function syntheticAdmittedCopy() {
  const c = pinnedRuleRecord();
  c.admission_state.state = 'ADMITTED';
  c.admission_state.synthetic_only = true;
  c.admission_state.note = 'SYNTHETIC IN-MEMORY COPY MARKED ADMITTED BY PHASE5-001T FOR FIXTURE PURPOSES ONLY. It admits no governed rule, creates no coverage and is not evidence for any gate.';
  return c;
}

const SELECTION = (country, region) => ({ country_code: country, region_code: region });
const CA_NS = SELECTION('CA', 'CA-NS');
const CA_ON = SELECTION('CA', 'CA-ON');
const NO_SELECTION = {};

const ELIGIBLE_DESCRIPTOR = {
  document_state: E.DOCUMENT_STATE.ELIGIBLE,
  presentation_id: E.PRESENTATION_ID,
  sha256: E.PRESENTATION_SHA256,
  descriptor: 'SYNTHETIC_IN_MEMORY_DESCRIPTOR_OF_THE_PINNED_PRESENTATION — the specimen file is not opened',
};
const REFUSED_DESCRIPTOR = (cause) => ({
  document_state: E.DOCUMENT_STATE.REFUSED,
  presentation_id: E.PRESENTATION_ID,
  sha256: null,
  document_refusal_cause: cause,
});

const RECORDED_MAPPING = {
  last_payment_fact: Object.assign({}, E.RECORDED_MAPPING.last_payment_fact),
  reference_date_input: Object.assign({}, E.RECORDED_MAPPING.reference_date_input),
};
const WRONG_LABEL_MAPPING = {
  last_payment_fact: { fact_id: 'collection.lastPaymentDate', printed_label: 'Date Paid/Settled' },
  reference_date_input: Object.assign({}, E.RECORDED_MAPPING.reference_date_input),
};
const SWAPPED_ROLE_MAPPING = {
  last_payment_fact: Object.assign({}, E.RECORDED_MAPPING.reference_date_input),
  reference_date_input: Object.assign({}, E.RECORDED_MAPPING.last_payment_fact),
};

const PAGE_COUNT_PR01 = 22;
const pages = (n) => Array.from({ length: n }, (_, i) => i + 1);
const refObs = (token, n = PAGE_COUNT_PR01) => ({
  label_present_on_pages: pages(n), page_count: n, tokens: Array(n).fill(token),
});
const refObsAbsent = (n = PAGE_COUNT_PR01) => ({ label_present_on_pages: [], page_count: n, tokens: [] });
const refObsPartial = (token, presentOn, n = PAGE_COUNT_PR01) => ({
  label_present_on_pages: presentOn, page_count: n, tokens: Array(presentOn.length).fill(token),
});
const refObsContradictory = (tokens) => ({
  label_present_on_pages: pages(tokens.length), page_count: tokens.length, tokens,
});

const debtRecord = (index, token, extra) => Object.assign({
  record_index: index,
  label_occurrences: token === null ? [] : [{ token, value_present: true }],
}, extra || {});
const blankRecord = (index, extra) => Object.assign({
  record_index: index, label_occurrences: [{ token: null, value_present: false }],
}, extra || {});
const collectionsOf = (records) => ({ section_state: 'RESOLVED', contract_debt_records: records });
const collectionsUnresolved = (reason) => ({ section_state: 'NOT_RESOLVED', section_reason: reason, contract_debt_records: [] });
const collectionsNoRecords = (extra) => Object.assign({ section_state: 'RESOLVED', contract_debt_records: [] }, extra || {});

function inputOf(o) {
  return {
    selection: o.selection || CA_NS,
    presentation: o.presentation || ELIGIBLE_DESCRIPTOR,
    declared_event_date_mapping: o.mapping || RECORDED_MAPPING,
    report: { reference_date_observation: o.reference, collections: o.collections },
    rule_record: o.ruleRecord || pinnedRuleRecord(),
    second_limb_input_present: o.secondLimb === true,
    other_unresolved_affirmative_element: o.otherAffirmative === true,
  };
}

const SYNTHETIC_LABEL = 'SYNTHETIC — IN-MEMORY FIXTURE. NOT A PRESENTATION, NOT A REPORT, NOT CONSUMER EVIDENCE.';

module.exports = {
  E, RULE_RECORD, SYNTHETIC_LABEL, PAGE_COUNT_PR01,
  pinnedRuleRecord, syntheticAdmittedCopy,
  CA_NS, CA_ON, NO_SELECTION, ELIGIBLE_DESCRIPTOR, REFUSED_DESCRIPTOR,
  RECORDED_MAPPING, WRONG_LABEL_MAPPING, SWAPPED_ROLE_MAPPING,
  refObs, refObsAbsent, refObsPartial, refObsContradictory,
  debtRecord, blankRecord, collectionsOf, collectionsUnresolved, collectionsNoRecords, inputOf,
};
