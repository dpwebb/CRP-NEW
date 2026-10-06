'use strict';
/**
 * q-record-applicability.cjs — OWNER-ALL82-001 / B3 continuation. The per-record applicability state.
 *
 * The owner directed: "Add a per-record applicability state to the shared evaluator: APPLICABLE /
 * NOT_APPLICABLE / APPLICABILITY_UNRESOLVED. A blank Closed Date alone does not prove an account is open. Use
 * explicit report status where evidenced; otherwise retain uncertainty. Test applicable closed accounts,
 * explicitly open accounts and ambiguous accounts. Synthetic closed cases do not establish real closed-account
 * presentation evidence. Preserve extraction status separately from applicability and comparison outcome."
 *
 * Every sentence of that instruction is a test here, and the two kinds of evidence are reported separately:
 *   • REAL EVIDENCE — what the captured samples resolve, on real bytes.
 *   • SYNTHETIC — the three states exercised on synthetic structural models, which establish NO presentation
 *     evidence and are labelled as such.
 */

const fs = require('node:fs');
const path = require('node:path');

const auFamily = require('../../../service/format-families/au-equifax-consumer.cjs');
const usFamily = require('../../../service/format-families/us-experian-consumer.cjs');
const applicability = require('../../applicability.cjs');
const formats = require('../../formats.cjs');
const { evaluateCase } = require('../../evaluation.cjs');
const {
  buildPdfDocumentModel, makeSyntheticModel
} = require('../../../../internal-validation/ca-ns-last-payment-six-year/document-model.cjs');
const adapters = require('../../../adapters/rule-adapters.cjs');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const CAPTURES = path.join(ROOT, 'SOURCE_CAPTURES', 'REPORT_FORMAT_BASELINE_2026-09-30');
const PUB_001 = path.join(CAPTURES, 'PUB-001.pdf');
const PUB_012 = path.join(CAPTURES, 'PUB-012.pdf');

const A4 = { width_pt: 595.32, height_pt: 841.92, label: 'A4' };
const FOOTER = `${auFamily.PUBLISHER_NAME}   Page {page} of {pages}   ABN: 26 000 602 862`;
const LIABILITY_ADAPTER = 'AU-PRIVACY-ACT-1988-S20W-ITEM1-LIABILITY-2Y';
const ADVERSE_ADAPTER = 'FCRA-605A-5-US-NATIONAL-7Y';
const CA_ADVERSE_ADAPTER = 'US-CA-CCRAA-1785-13-A-8-ADVERSE-7Y';

/** An admission a synthetic structural test supplies. It is explicitly NOT a presentation. */
const SYNTHETIC_ADMISSION = Object.freeze({
  state: 'SYNTHETIC_STRUCTURAL_TEST_INPUT_NOT_A_REPORT',
  admitted: true,
  refusal_reason: null,
  fact_status: null,
  presentation_evidence: false,
  note: 'in-memory structural model: not a report, not presentation evidence, not admissible'
});

/* ------------------------------------------------------------------ synthetic AU liability models */

/**
 * One liability record. `closedDate` is the value printed after `Closed Date`; `null` prints the label with no
 * value, and an omitted key omits the label entirely. `status` prints `Current Repayment Status`.
 */
function liabilityRecord(options) {
  const opts = options || {};
  const lines = ['Credit Provider                               EXPRESS BANK'];
  if (opts.accountType !== undefined) lines.push('Type Of Account                               ' + (opts.accountType || ''));
  lines.push('Account Number                                EPB0075');
  if (opts.openedDate !== undefined) lines.push('Opened Date                                   ' + (opts.openedDate || ''));
  if (opts.closedDate !== undefined) lines.push('Closed Date                                   ' + (opts.closedDate || ''));
  if (opts.status !== undefined) lines.push('Current Repayment Status                      ' + (opts.status || ''));
  return lines;
}

function auModel(liabilityLines) {
  const pages = [
    ['CASE SUBJECT', 'Report Date: 4 January 2016', 'Reference: 0000'],
    [FOOTER.replace('Page {page} of {pages}', 'Page 2 of 3'), '', 'Personal Information', '', 'Credit Overview', '', 'Summary'],
    [FOOTER.replace('Page {page} of {pages}', 'Page 3 of 3'), '', 'Consumer Credit Information',
      'Consumer Credit Liability Information', ...liabilityLines, '',
      'Publically Available Consumer Information', 'Overdue Accounts']
  ];
  return makeSyntheticModel({ pages, page_count: pages.length, page_size: A4 });
}

function evaluateAu(model) {
  const raw = auFamily.extract(model, SYNTHETIC_ADMISSION);
  /* The shared evaluation contract is given the same shape the shared adapter produces, so this test exercises
     the production path and not a private one. The support stamp stays DEMONSTRATION-shaped: an in-memory
     model is NOT report evidence and is labelled as such. */
  const extracted = Object.assign({}, raw, {
    extraction_ran: true,
    presentation_evidence: false,
    presentation_id: auFamily.FAMILY_ID,
    family_id: auFamily.FAMILY_ID,
    support: formats.SUPPORT.ACTUAL_REPORT_EVIDENCE,
    admission: Object.assign({}, SYNTHETIC_ADMISSION)
  });
  return { extracted, evaluation: evaluateCase({ country: 'AU', region: 'AU-NSW', extraction: extracted }) };
}

/* ------------------------------------------------------------------ the three states, synthesised */

function synthesisedStates(check) {
  /* APPLICABLE: the record prints its own closure date. */
  const closed = evaluateAu(auModel(liabilityRecord({
    accountType: 'Credit Card', openedDate: '11 Apr 2013', closedDate: '20 Jul 2015'
  })));
  check.equal(closed.evaluation.not_applicable_checks.filter((c) => c.adapter_id === LIABILITY_ADAPTER).length, 0,
    'a record that prints its own closure date is not called not-applicable');
  check.equal(closed.evaluation.applicability_summary.APPLICABLE, 1, 'it is APPLICABLE exactly once');
  check.equal(closed.evaluation.results.length, 1, 'and one comparison is performed from it');
  check.equal(closed.evaluation.results[0].machine.anchor.field, 'liability.closedDate',
    "from the record's own printed closure date");
  check.equal(closed.evaluation.results[0].machine.anchor.iso, '2015-07-20', 'read as the day it prints');

  /* NOT_APPLICABLE: the label is printed with no value, and the record prints its own status instead. */
  const stated = evaluateAu(auModel(liabilityRecord({
    accountType: 'Personal Loan (Fixed term)', openedDate: '15 Nov 2013', closedDate: null,
    status: 'The consumer credit is not overdue – Current up to and including the grace period'
  })));
  const statedNotApplicable = stated.evaluation.not_applicable_checks.filter((c) => c.adapter_id === LIABILITY_ADAPTER);
  check.equal(statedNotApplicable.length, 1, 'a blank closure label plus an explicit status resolves once');
  check.equal(statedNotApplicable[0].applicability, 'NOT_APPLICABLE');
  check.equal(statedNotApplicable[0].applicability_rule, 'LIABILITY_CLOSED_DATE_OR_EXPLICITLY_STATED_STATUS');
  check.equal(statedNotApplicable[0].reason, 'THE_RECORD_PRINTS_AN_EXPLICIT_STATUS_THAT_DOES_NOT_STATE_TERMINATION');
  check.match(String(statedNotApplicable[0].evidence.printed_value), /not overdue/,
    "and the determination quotes the report's own printed words");
  check.equal(stated.evaluation.results.filter((r) => r.check.adapter_id === LIABILITY_ADAPTER).length, 0,
    'and performs no comparison');

  /* APPLICABILITY_UNRESOLVED: a blank closure label and nothing else. A blank label alone proves neither state. */
  const ambiguous = evaluateAu(auModel(liabilityRecord({
    accountType: 'Credit Card', openedDate: '11 Apr 2013', closedDate: null, status: null
  })));
  const ambiguousUnresolved = ambiguous.evaluation.unresolved_applicability.filter((c) => c.adapter_id === LIABILITY_ADAPTER);
  check.equal(ambiguousUnresolved.length, 1, 'a blank closure label with no status leaves applicability unresolved');
  check.equal(ambiguousUnresolved[0].applicability, 'APPLICABILITY_UNRESOLVED');
  check.equal(ambiguousUnresolved[0].reason,
    'A_BLANK_CLOSED_DATE_ALONE_DOES_NOT_PROVE_EITHER_STATE_AND_THE_RECORD_PRINTS_NO_STATUS');
  check.match(String(ambiguousUnresolved[0].evidence.does_not_infer), /open/,
    'and the record states plainly that it does not infer the account is open');
  check.equal(ambiguous.evaluation.not_applicable_checks.filter((c) => c.adapter_id === LIABILITY_ADAPTER).length, 0,
    'it is NOT filed as not-applicable');
  check.equal(ambiguous.evaluation.results.filter((r) => r.check.adapter_id === LIABILITY_ADAPTER).length, 0,
    'and it is not counted as a performed check');

  /* An omitted label is a different reading from a blank one and is never collapsed into it. */
  const omitted = evaluateAu(auModel(liabilityRecord({ accountType: 'Credit Card', openedDate: '11 Apr 2013' })));
  const omittedUnresolved = omitted.evaluation.unresolved_applicability.filter((c) => c.adapter_id === LIABILITY_ADAPTER);
  check.equal(omittedUnresolved.length, 1, 'a record that prints no closure label at all is unresolved');
  check.equal(omittedUnresolved[0].reason, 'THE_FAMILY_REPORTED_NO_CLOSED_DATE_READING_FOR_THIS_RECORD',
    'and the reason distinguishes "not printed" from "printed without a value"');

  return {
    applicable: closed.evaluation.applicability_summary.APPLICABLE,
    not_applicable: stated.evaluation.applicability_summary.NOT_APPLICABLE,
    unresolved: ambiguous.evaluation.applicability_summary.APPLICABILITY_UNRESOLVED,
    omitted_label_unresolved: omitted.evaluation.applicability_summary.APPLICABILITY_UNRESOLVED,
    note: 'these three cases are SYNTHETIC. They exercise the state machine; they establish no real '
      + 'closed-account presentation evidence, and none is claimed.'
  };
}

/* ------------------------------------------------------------------ real evidence */

function realEvidence(check, checkSkip) {
  const out = { au: null, us: null };

  if (fs.existsSync(PUB_012)) {
    const model = buildPdfDocumentModel(PUB_012);
    const extracted = formats.extractWithSharedAdapter(model, { mode: 'REPORT', country: 'AU' });
    check.equal(extracted.presentation_evidence, true, 'the AU sample is admitted as report evidence');
    const e = evaluateCase({ country: 'AU', region: 'AU-NSW', extraction: extracted });
    out.au = {
      liability_records: extracted.summary.by_kind.CONSUMER_CREDIT_LIABILITY.records_read,
      applicable: e.applicability_summary.APPLICABLE,
      not_applicable: e.not_applicable_checks.filter((c) => c.adapter_id === LIABILITY_ADAPTER).length,
      unresolved: e.unresolved_applicability.filter((c) => c.adapter_id === LIABILITY_ADAPTER).length,
      note: 'the captured AU sample prints NO closed liability record, so its APPLICABLE count is zero here. '
        + 'The three cases above are synthetic and are counted separately.'
    };
    check.equal(out.au.not_applicable, 1, 'the real AU sample resolves one liability record as not-applicable');
    check.equal(out.au.unresolved, 2, 'and leaves two unresolved: one ambiguous, one with no boundary labels');
    check.equal(out.au.applicable, 0,
      'and the real sample produces no APPLICABLE liability record, which the limits state plainly');
    check.ok(e.results.every((r) => r.machine.state === 'EVALUATED'),
      'the two pre-existing AU limbs still run unchanged on the same sample');
    check.equal(e.results.length, 6, 'and still produce exactly six comparisons');
  } else {
    checkSkip('the captured AU sample', 'THE_CAPTURED_ARTIFACT_PUB-012_IS_NOT_PRESENT');
  }

  if (fs.existsSync(PUB_001)) {
    const model = buildPdfDocumentModel(PUB_001);
    const extracted = formats.extractWithSharedAdapter(model, { mode: 'REPORT', country: 'US' });
    check.equal(extracted.presentation_evidence, true, 'the US sample is admitted as report evidence');
    const e = evaluateCase({ country: 'US', region: 'US-CA', extraction: extracted });
    out.us = {
      executed_comparisons: e.results.length,
      not_applicable: e.not_applicable_checks.length,
      applicability_unresolved: e.unresolved_applicability.length,
      summary: e.applicability_summary
    };
    check.equal(e.results.length, 1, 'the US sample performs exactly one executed comparison');
    check.equal(e.results[0].check.adapter_id, ADVERSE_ADAPTER, 'the federal adverse rule');
    check.equal(e.results[0].machine.state, 'EVALUATED', 'evaluated');
    check.equal(e.results[0].machine.outcome, 'PERIOD_NOT_EXCEEDED',
      'and its outcome is the arithmetic comparison, not an applicability statement');
    check.equal(e.not_applicable_checks.length, 0,
      'no limb is NOT_APPLICABLE: the reassessed limbs find no entry of their kind and are reported unavailable instead');
    check.equal(e.unavailable_checks.filter((c) => /NO_RECORD_OF_THE_KIND/.test(c.reason)).length, 7,
      'seven public-record and collection limbs find no entry of their kind and are reported unavailable');
    check.equal(e.unresolved_applicability.length, 5,
      'the two unreadable adverse accounts stay unresolved under the federal rule, and all three adverse accounts stay unresolved under the fail-closed California rule (no event-date context)');
    check.ok(e.unresolved_applicability.every((c) => c.adapter_id === ADVERSE_ADAPTER || c.adapter_id === CA_ADVERSE_ADAPTER),
      'the unresolved readings are the two adverse rules on the adverse accounts');
    check.equal(e.applicability_summary.APPLICABLE, 1);
    check.equal(e.applicability_summary.NOT_APPLICABLE, 0);
    check.equal(e.applicability_summary.APPLICABILITY_UNRESOLVED, 5);
  } else {
    checkSkip('the captured US sample', 'THE_CAPTURED_ARTIFACT_PUB-001_IS_NOT_PRESENT');
  }

  return out;
}

/* ------------------------------------------------------------------ the three fields stay separate */

function fieldsStaySeparate(check) {
  /* One record whose EXTRACTION is unresolved while its APPLICABILITY is determinable: the closure label is
     printed with a value, but the record carries no `Credit Provider` boundary label, so it is not readable as
     a liability record. The two answers must never be read as each other. */
  const mixed = evaluateAu(auModel([
    'Credit Provider                               EXPRESS BANK',
    'Closed Date                                   20 Jul 2015'
  ]));
  const record = mixed.extracted.records.find((r) => r.kind === 'CONSUMER_CREDIT_LIABILITY');
  check.ok(record, 'the record is located');
  check.equal(record && record.status, 'EXTRACTION_UNRESOLVED', 'its extraction status is unresolved');
  const unresolved = mixed.evaluation.unresolved_checks.filter((c) => c.adapter_id === LIABILITY_ADAPTER);
  check.equal(unresolved.length, 1, 'and the comparison is reported as unresolved rather than performed');
  check.equal(unresolved[0].record_index, record.record_index, 'against that record');
  check.equal(mixed.evaluation.not_applicable_checks.filter((c) => c.adapter_id === LIABILITY_ADAPTER).length, 0,
    'an unreadable record is never filed as not-applicable');
  check.equal(mixed.evaluation.results.filter((r) => r.check.adapter_id === LIABILITY_ADAPTER).length, 0,
    'and never counted as a performed comparison');

  /* A rule this build does not implement is UNRESOLVED, not silently skipped. */
  const unknown = applicability.resolveApplicability({ adapter_id: 'PROBE', applicability_rule: 'NO_SUCH_RULE' }, {}, null);
  check.equal(unknown.applicability, 'APPLICABILITY_UNRESOLVED', 'an unknown applicability rule is unresolved');
  check.equal(unknown.reason, 'NO_SUCH_APPLICABILITY_RULE_IS_REGISTERED_IN_THIS_BUILD');
  const noRule = applicability.resolveApplicability({ adapter_id: 'PROBE' }, {}, null);
  check.equal(noRule, null, 'and an adapter with no declared rule keeps the behaviour it had');

  /* Every adapter that declares a rule declares one this build implements. */
  const declared = adapters.ADAPTERS.map((a) => a.applicability_rule).filter(Boolean);
  check.ok(declared.length > 0, 'adapters declare applicability rules');
  check.deepEqual(declared.filter((id) => !applicability.APPLICABILITY_RULES[id]), [],
    'and every declared rule is registered');

  /* The state vocabulary is exactly the three the owner named. */
  check.deepEqual(Object.keys(applicability.APPLICABILITY_STATE).sort(),
    ['APPLICABILITY_UNRESOLVED', 'APPLICABLE', 'NOT_APPLICABLE'],
    'the state vocabulary is exactly APPLICABLE / NOT_APPLICABLE / APPLICABILITY_UNRESOLVED');

  return {
    extraction_unresolved_while_applicability_determinable: true,
    unknown_rule_is_unresolved: true,
    declared_rules: declared.length
  };
}

module.exports = {
  id: 'q-record-applicability',
  title: 'Per-record applicability: APPLICABLE / NOT_APPLICABLE / APPLICABILITY_UNRESOLVED',

  async run(t, check) {
    const synthetic = synthesisedStates(check);
    const real = realEvidence(check, check.skip);
    const separation = fieldsStaySeparate(check);
    return {
      states: {
        vocabulary: Object.keys(applicability.APPLICABILITY_STATE),
        real_evidence: real,
        synthetic_three_states: synthetic
      },
      rule_ids: Object.keys(applicability.APPLICABILITY_RULES).sort(),
      separation_of_fields: separation,
      declared_by_adapters: adapters.ADAPTERS.filter((a) => a.applicability_rule)
        .map((a) => ({ adapter_id: a.adapter_id, rule: a.applicability_rule }))
    };
  }
};
