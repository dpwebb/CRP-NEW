'use strict';
/**
 * r-ca-factual-assessment.cjs — OWNER-ALL82-001 / B3 continuation. The Canadian factual assessment.
 *
 * The owner directed: implement "shared Canadian checks whose meaning is demonstrable from printed report
 * facts" for all thirteen explicit Canadian selections; "Exercise actual checks end to end for all 13 explicit
 * Canadian selections"; "Keep CA-NS statutory evaluation separate and restricted to its existing admission";
 * and "Explain clearly when an assessment contains factual checks but no province-specific statutory
 * evaluation."
 *
 * Every word of that is a test here, and the two kinds of evidence are reported separately:
 *   • REAL EVIDENCE — the digest-pinned Equifax Canada consumer specimen, read read-only and posted to a
 *     loopback listener, evaluated end to end under all thirteen canonical Canadian selections.
 *   • SYNTHETIC — the same named checks driven over structural views built in memory, to exercise the
 *     difference-found, not-examinable and not-applicable branches. A synthetic view establishes NO
 *     presentation evidence, carries no report, and is labelled as such throughout.
 *
 * Nothing here names a PIPEDA provision or any national applicability relation: the factual checks read only
 * what the presentation prints.
 */

const fs = require('node:fs');
const path = require('node:path');

const evaluation = require('../../evaluation.cjs');
const factualChecks = require('../../factual-checks.cjs');
const caFacts = require('../../ca-consumer-file-facts.cjs');
const applicability = require('../../../adapters/applicability-records.json');
const { readPinnedSpecimen } = require('../harness.cjs');
const FIXTURES = require('../../../../internal-validation/ca-ns-last-payment-six-year/tests/fixtures.cjs');

const CA_REGIONS = applicability.relations
  .find((r) => r.relation_id === 'CA-PIPEDA-FEDERAL-RECORDED-COUNTRY-WIDE').region_rows
  .map((row) => row.region).sort();

const FACTUAL_IDS = [
  'CA-FACT-SUMMARY-COUNT-VS-ITEMS',
  'CA-FACT-ITEM-DATE-AFTER-REPORT-DATE',
  'CA-FACT-DATE-ORDER-WITHIN-RECORD',
  'CA-FACT-SAME-DEBT-PRINTED-VALUE-CONFLICT'
];
const NS_ADAPTER = 'CA-NS-CRA-S10-3-C-LIMB-1';
const DATE_CHECK = 'COMMON-ERROR-LAST-PAYMENT-OR-FIRST-DELINQUENCY-DATE';
const COMMON_CHECKS = [
  'COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY',
  'COMMON-ERROR-BALANCE-PAYMENT-INCONSISTENCY',
  DATE_CHECK,
  'COMMON-ERROR-DUPLICATE-REPORTING',
  'COMMON-ERROR-CLOSURE-STATED-WITHOUT-A-CLOSED-DATE'
];
const OTHER_TWELVE = CA_REGIONS.filter((r) => r !== 'CA-NS');

/* ------------------------------------------------------------------ synthetic structural views (no report) */

/**
 * A structural view the checks can be driven over. It is built in memory, it is NOT produced by any reader,
 * and it carries no report evidence. `byKind` maps a record kind to the list of printed-field maps.
 */
function syntheticView(options) {
  const opts = options || {};
  const records = [];
  let index = 0;
  for (const [kind, list] of Object.entries(opts.by_kind || {})) {
    for (const printed of list) {
      index += 1;
      records.push({
        record_index: index, kind, kind_label: kind.toLowerCase(), section: kind, boundary: { page: 1, line: index },
        end: { page: 1, line: index }, page_read_failure: false, printed
      });
    }
  }
  return {
    view_id: 'SYNTHETIC_STRUCTURAL_VIEW_NOT_A_READING',
    /* B4 continuation — a factual check is written for the LABELS one layout prints, so a check is now selected
       for its own presentation. These synthetic views exercise the EQUIFAX-presentation checks, so they carry
       that presentation's id and nothing else; they still establish NO presentation evidence, and the view_id
       above and the `source` below both say so. A view with NO presentation selects NO check at all, which is
       asserted separately. */
    presentation_id: opts.presentation_id === undefined ? 'PR-01' : opts.presentation_id,
    source: 'in-memory synthetic structural view: not a report, not a reading, not presentation evidence',
    reference_date: opts.reference_date || null,
    summary_counts: opts.summary_counts || [],
    records,
    identity_groups: opts.identity_groups || [],
    policy_statements: opts.policy_statements || [],
    headings_printed: [],
    pages_not_read: [],
    report_text_retained: false,
    note: 'SYNTHETIC — establishes no presentation evidence.'
  };
}

/** One printed field, in the reader's five-state vocabulary, built explicitly for the test. */
function field(state, raw, normalized) {
  const reason = state === 'NOT_PRINTED' ? 'LABEL_NOT_PRINTED_ON_THIS_RECORD' : (state === 'VALUE' ? null : state);
  return { state, raw: raw || null, normalized: normalized || null, reason, location: null, printed_times_in_record: 1 };
}

function runSynthetic(country, view) {
  return factualChecks.runFactualChecks({
    country,
    region: 'SYNTHETIC',
    extraction: { evidence_readings: { factual_view: view } }
  });
}

function byId(run, id) {
  const all = [].concat(run.performed, run.not_examinable, run.not_applicable, run.unresolved_applicability);
  return all.find((c) => c.check_id === id) || null;
}

/* ------------------------------------------------------------------ the real journey */

async function uploadSpecimen(t, check, owner, caseId, specimen, region) {
  const upload = await t.request('POST', `/api/cases/${caseId}/files`, {
    token: owner.token,
    body: {
      originalFilename: 'my-credit-report.pdf',
      declaredBytes: specimen.bytes.length,
      mimeType: 'application/pdf',
      contentBase64: specimen.bytes.toString('base64')
    }
  });
  check.equal(upload.status, 201, `${region}: the evidenced specimen is accepted by the upload gate`);
  check.equal(upload.json.receipt.format_detection.supported, true, `${region}: and admitted as the supported presentation`);
  check.equal(upload.json.receipt.format_detection.presentation_id, 'PR-01', `${region}: by the unchanged PR-01 digest gate`);
  check.equal(upload.json.receipt.format_detection.read_support_is, 'EXACT_SPECIMEN_DIGEST', `${region}: and the receipt says so`);
  check.equal(upload.json.receipt.extraction_summary.presentation_evidence, true, `${region}: it supplies presentation evidence`);
  check.equal(upload.json.receipt.extraction_summary.reference_date_read, true, `${region}: its report date is read`);
  check.ok(upload.json.receipt.extraction_summary.accounts_read >= 1, `${region}: and at least one collection entry is read`);
  return upload;
}

/** The consumer-facing factual surface, asserted from the rendered result set. */
function assertFactualSurface(check, result, label, expectStatutory) {
  check.equal(result.checks_performed, result.observations.length + result.report_consistency_checks.length
    + result.common_errors.length + result.detected_report_information.length,
    `${label}: the performed count includes every comparison that actually ran`);
  check.deepEqual(result.common_errors.map((c) => c.check_name), COMMON_CHECKS,
    `${label}: recovered own-account facts run the five supported checklist checks`);
  const dateCheck = result.common_errors.find((c) => c.check_name === DATE_CHECK);
  check.equal(dateCheck?.state, 'NOT_DETECTED', `${label}: the specimen date check is benign`);
  check.deepEqual(dateCheck?.source_records, [], `${label}: benign dates create no issue matches`);
  check.equal(result.common_errors.find((c) => c.check_name === COMMON_CHECKS[4])?.source_records.length, 1,
    `${label}: one sourced closure with an explicitly blank own date creates an issue match`);
  check.equal(result.assessment.common_error_checks_performed, 5, `${label}: the summary counts all five completed common checks`);
  check.equal(result.common_errors.find(c => c.check_name === 'COMMON-ERROR-DUPLICATE-REPORTING')?.source_records.length, 1,
    `${label}: the actual duplicate collections now reach the shared check`);
  check.equal(result.report_consistency_checks.length, 4, `${label}: all four Canadian factual checks ran`);
  check.deepEqual(result.report_consistency_checks.map((c) => c.check_name).length, 4, `${label}: each is reported at case level`);
  check.deepEqual([...new Set(result.report_consistency_checks.map((c) => c.check_class))], ['REPORT_FACT_CONSISTENCY'],
    `${label}: every one of them is a report-fact consistency check and none is a policy observation`);
  check.ok(result.report_consistency_checks.every((c) => c.is_a_finding === false), `${label}: none is a finding`);
  check.ok(result.report_consistency_checks.every((c) => c.output_level === 'observation'), `${label}: each is capped at an observation`);
  check.ok(result.report_consistency_checks.every((c) => typeof c.qualification === 'string' && c.qualification.length > 0),
    `${label}: each carries its own qualification sentence`);
  check.ok(result.report_consistency_checks.every((c) => /not a finding that a rule was broken/.test(c.qualification)),
    `${label}: and each qualification states in words that it is not a legal or statutory finding`);
  const kinds = result.assessment.kinds;
  check.ok(kinds.includes('REPORT_FACT_CONSISTENCY'), `${label}: the assessment names the factual class`);
  check.ok(kinds.includes('COMMON_ERROR'), `${label}: the assessment records the shared date comparison`);
  check.equal(kinds.includes('STATUTORY_RULE_COMPARISON'), expectStatutory,
    `${label}: and names the statutory class only where a statutory comparison actually ran`);
  check.equal(result.assessment.performed_by_kind.REPORT_FACT_CONSISTENCY, 4, `${label}: four factual checks are counted as factual`);
  check.equal(result.assessment.statutory_checks_performed, result.observations.length, `${label}: and no factual check is counted as statutory`);
  if (!expectStatutory) {
    check.equal(result.assessment.statutory_checks_performed, 0, `${label}: no statutory comparison ran for this selection`);
    check.match(result.assessment.plain, /common-error checklist using the report facts/, `${label}: the assessment names the shared checklist and the report evidence`);
  }
  check.equal(result.comprehensive_legal_check, false, `${label}: no comprehensive legal check is implied`);
  for (const observation of result.observations) {
    check.ok(observation.is_a_finding === false, `${label}: no statutory observation is a finding`);
  }
}

async function journeyFor(t, check, owner, specimen, region) {
  const caseId = (await t.request('POST', '/api/cases', { token: owner.token, body: { country: 'CA', region } })).json.case.case_id;
  await uploadSpecimen(t, check, owner, caseId, specimen, region);
  const evaluated = await t.request('POST', `/api/cases/${caseId}/evaluate`, { token: owner.token, body: {} });
  check.equal(evaluated.status, 201, `${region}: the case evaluates`);
  const result = evaluated.json.result;
  const stored = t.service.store.state().files.filter((f) => f.case_id === caseId).pop().extraction;
  const view = (await t.request('GET', `/api/cases/${caseId}`, { token: owner.token })).json.view;

  check.equal(stored.admission.admitted, true, `${region}: the stored extraction is an admitted one`);
  check.ok(stored.evidence_readings && stored.evidence_readings.factual_view, `${region}: and carries the presentation's factual view`);
  check.equal(stored.evidence_readings.factual_view.report_text_retained, false, `${region}: the view retains no report text`);
  check.equal(view.result.support, 'ACTUAL_REPORT_EVIDENCE', `${region}: the consumer sees what kind of evidence this is`);
  check.equal(view.result.assessment.factual_summary.statutory_checks_named, 0,
    `${region}: the factual surface names no statutory check`);

  return { caseId, result, stored, view };
}

/* ------------------------------------------------------------------ all thirteen selections */

/**
 * The same admitted extraction, evaluated under every canonical Canadian selection. This is what makes the
 * claim "all thirteen explicit Canadian selections run actual checks" a measurement rather than a summary.
 */
function everyCaRegion(check, extraction) {
  const perRegion = {};
  for (const region of CA_REGIONS) {
    const evaluated = evaluation.evaluateCase({ country: 'CA', region, extraction });
    const factual = evaluated.factual_checks;
    const statutory = evaluated.results;
    perRegion[region] = {
      statutory_checks_performed: statutory.length,
      factual_checks_performed: factual ? factual.performed.length : 0,
      factual_differences_found: factual ? factual.summary.a_difference_was_found : 0,
      unsupported_by_this_build: evaluated.unavailable_checks.length,
      assessment_kinds: evaluated.assessment_kinds
    };
    check.ok(factual, `${region}: the factual surface is registered for a Canadian selection`);
    check.equal(factual.performed.length, 4, `${region}: all four factual checks ran on the real presentation`);
    check.deepEqual(factual.summary.check_ids.slice().sort(), FACTUAL_IDS.slice().sort(),
      `${region}: and they are exactly the four named Canadian factual checks`);
    check.equal(factual.summary.statutory_checks_named, 0, `${region}: no statutory check is among them`);
    const common = evaluated.common_errors.performed;
    check.deepEqual(common.map((c) => c.check_id), COMMON_CHECKS, `${region}: the five source-supported shared checks ran`);
    const dateCheck = common.find((c) => c.check_id === DATE_CHECK);
    check.equal(dateCheck?.state, 'NOT_DETECTED', `${region}: the date check remains benign`);
    check.deepEqual(dateCheck?.source_records, [], `${region}: the benign date comparison creates no issue matches`);
    check.equal(common.find((c) => c.check_id === COMMON_CHECKS[4])?.source_records.length, 1,
      `${region}: the ordinary-account blank closure date remains in the shared checklist scope`);
    check.equal(common.find(c => c.check_id === 'COMMON-ERROR-DUPLICATE-REPORTING')?.source_records.length, 1,
      `${region}: the real report's duplicate collections reach the same shared rule`);
    check.equal(evaluated.checks_performed, statutory.length + factual.performed.length
      + common.length + evaluated.detected_report_information.performed.length,
      `${region}: the performed count is exactly what ran`);
    if (region === 'CA-NS') {
      check.equal(statutory.length, 2, 'CA-NS: its last-payment limb still runs once per accepted collection entry');
      check.deepEqual([...new Set(statutory.map((r) => r.check.adapter_id))].sort(),
        ['CA-NS-CRA-S10-3-C-LIMB-1'],
        'CA-NS: and it is the collection last-payment adapter within the active common-error scope');
      check.deepEqual([...new Set(statutory.map((r) => r.record_index))], [1, 2],
        'CA-NS: each collection entry carries its own comparison');
      check.ok(!evaluated.unavailable_checks.some((u) => u.adapter_id === 'CA-NS-CRA-S10-3-E-BANKRUPTCY-6Y'),
        'CA-NS: the out-of-checklist bankruptcy adapter is absent from active assessment, including unavailable checks');
      check.deepEqual(evaluated.assessment_kinds, ['STATUTORY_RULE_COMPARISON', 'REPORT_FACT_CONSISTENCY', 'COMMON_ERROR'],
        'CA-NS: its internal mechanism inventory includes the shared date check and retained last-payment limb');
    } else {
      check.equal(statutory.length, 0, `${region}: no statutory comparison runs, because none is recorded for it`);
      check.deepEqual(evaluated.assessment_kinds, ['REPORT_FACT_CONSISTENCY', 'COMMON_ERROR'],
        `${region}: the shared date check is recorded without adding a statutory comparison`);
    }
    check.ok(factual.performed.every((c) => c.legal_finding === undefined), `${region}: no factual check carries a legal finding`);
  }
  return perRegion;
}

/* ------------------------------------------------------------------ the admitted presentation's own facts */

function realPresentationFacts(check, view) {
  check.equal(view.summary_counts.length, 9, 'the report prints nine category counts for this build to compare');
  check.ok(view.summary_counts.every((c) => c.examinable), 'and every one of them is examinable from what the report prints');
  check.equal(view.summary_counts.filter((c) => c.absence_statement_printed).length, 6,
    'six of them are accompanied by the report own affirmative absence statement');
  check.equal(view.records.length, 2, 'the report prints two collection entries');
  check.ok(view.records.every((r) => r.kind === 'COLLECTION'), 'and each is read as its own entry');
  check.equal(view.identity_groups.length, 1, 'two of those entries print the same member number and account number');
  check.deepEqual(view.identity_groups[0].record_indexes, [1, 2], 'so they are matched as one debt and no other');
  check.deepEqual(view.identity_groups[0].matched_on, ['Member Number', 'Account Number'],
    'matched on printed identifiers only, never on a creditor name');
  check.equal(view.reference_date.status, 'RESOLVED', 'the report date is read');
  const blank = view.records[0].printed['Date Paid/Settled'];
  check.equal(blank.state, 'LABEL_PRINTED_WITHOUT_VALUE', 'a date label printed with no value is read as exactly that');
  const absent = view.records[0].printed['Date Verified'];
  check.equal(absent.state, 'LABEL_PRINTED_WITHOUT_VALUE', 'and a ligature-printed label is still read as printed');
  const identifierFields = view.records
    .flatMap((r) => ['Member Number', 'Account Number'].map((label) => r.printed[label]));
  check.equal(identifierFields.length, 4, 'each entry carries its two printed identifiers as readings');
  check.ok(identifierFields.every((f) => f.raw === null && f.value_retained === false),
    'and neither value is retained by the view: they are used only to match records and are never returned');
  check.ok(identifierFields.every((f) => f.printed_with_a_value === true),
    'while the fact that the report printed a value for each is kept');
  check.ok(identifierFields.every((f) => f.normalized === null && f.state === 'VALUE'),
    'and an identifier is never parsed as a date either');
  return {
    categories_compared: view.summary_counts.length,
    collection_entries: view.records.length,
    identity_groups: view.identity_groups.length
  };
}

/* ------------------------------------------------------------------ synthetic branches (no report evidence) */

const VALID = '2021/02/01';
const LATER = '2024/01/01';

/** A collection entry with the given values. Each value is a [state, printed] pair. */
function entry(overrides) {
  const base = {
    'Date Assigned': ['VALUE', LATER, '2024-01-01'],
    'First Delinquency': ['VALUE', VALID, '2021-02-01'],
    'Date Paid/Settled': ['BLANK'],
    'Date Verified': ['NOT_PRINTED'],
    'Last Payment Date': ['VALUE', VALID, '2021-02-01'],
    'Member Number': ['VALUE', 'M1'],
    'Account Number': ['VALUE', 'A1']
  };
  const printed = {};
  for (const [label, value] of Object.entries(Object.assign(base, overrides || {}))) {
    const [state, raw, normalized] = value;
    const named = state === 'BLANK' ? 'LABEL_PRINTED_WITHOUT_VALUE' : state;
    printed[label] = state === 'VALUE'
      ? Object.assign(field('VALUE', raw, normalized || null), { printed_times_in_record: 1 })
      : Object.assign(field(named), { printed_times_in_record: 1 });
  }
  return printed;
}

function caption(category, stated, entries, examinable, absence) {
  return {
    summary_block: 'Public Records', category, stated_count: stated, caption_location: { page: 1, line: 1 },
    section_heading: category, section_printed: true, item_boundary: 'Overview',
    printed_item_count: examinable ? entries : null, absence_statement_printed: Boolean(absence),
    absence_statement_location: null, examinable, reason: examinable ? null : 'THE_SECTION_PRINTS_NO_ITEM_BOUNDARY_THIS_BUILD_RECOGNISES'
  };
}

const REFERENCE = { status: 'RESOLVED', reason: null, raw: '2026/05/05', normalized: '2026-05-05', source_field: 'Request Date', location: null };

/**
 * Every branch of every Canadian check, driven over structural views that are NOT readings of any report.
 * The synthetic section establishes no presentation evidence and is reported as its own kind below.
 */
function syntheticBranches(check) {
  const branches = {};

  /* --- the printed category count, against the entries printed under it */
  const mismatch = runSynthetic('CA', syntheticView({
    summary_counts: [caption('Judgments', 3, 1, true)],
    by_kind: { COLLECTION: [entry(), entry({ 'Member Number': ['VALUE', 'M2'], 'Account Number': ['VALUE', 'A2'] })] }
  }));
  branches.summary_count_mismatch = byId(mismatch, 'CA-FACT-SUMMARY-COUNT-VS-ITEMS');
  check.equal(branches.summary_count_mismatch.agreement, 'A_DIFFERENCE_WAS_FOUND',
    'a printed count that differs from the printed entries is reported as a difference');
  check.equal(branches.summary_count_mismatch.outcome, 'A_PRINTED_CATEGORY_COUNT_DIFFERS_FROM_THE_ENTRIES_PRINTED_UNDER_IT');

  const noCaption = runSynthetic('CA', syntheticView({ reference_date: REFERENCE, by_kind: { COLLECTION: [entry()] } }));
  branches.summary_count_not_applicable = byId(noCaption, 'CA-FACT-SUMMARY-COUNT-VS-ITEMS');
  check.equal(noCaption.not_applicable.length, 2, 'a report that prints no category count has nothing for that check to compare');
  check.equal(branches.summary_count_not_applicable.reason, 'THE_REPORT_PRINTS_NO_CATEGORY_COUNT');

  const uncountable = runSynthetic('CA', syntheticView({
    reference_date: REFERENCE,
    summary_counts: [caption('Judgments', 2, null, false)],
    by_kind: { COLLECTION: [entry()] }
  }));
  check.equal(uncountable.unresolved_applicability.length, 1, 'a count whose section cannot be counted is unresolved, not a pass');
  check.equal(byId(uncountable, 'CA-FACT-SUMMARY-COUNT-VS-ITEMS').reason,
    'NO_PRINTED_CATEGORY_COULD_BE_COUNTED_FROM_THE_REPORT', 'and it says exactly which comparison was not made');

  /* --- a date later than the report gives for itself */
  const lateDate = runSynthetic('CA', syntheticView({
    reference_date: { status: 'RESOLVED', reason: null, raw: '2022/01/01', normalized: '2022-01-01', source_field: 'Request Date', location: null },
    by_kind: { COLLECTION: [entry()] }
  }));
  branches.item_date_after_report_date = byId(lateDate, 'CA-FACT-ITEM-DATE-AFTER-REPORT-DATE');
  check.equal(branches.item_date_after_report_date.agreement, 'A_DIFFERENCE_WAS_FOUND',
    'a date printed later than the report date is a difference');
  check.equal(branches.item_date_after_report_date.evidence.dates_later_than_the_report_date.length, 1,
    'and the entry and the label are named');

  const noReportDate = runSynthetic('CA', syntheticView({
    reference_date: { status: 'EXTRACTION_UNRESOLVED', reason: 'REQUEST_DATE_LABEL_NOT_FOUND', raw: null, normalized: null, source_field: 'Request Date', location: null },
    by_kind: { COLLECTION: [entry()] }
  }));
  check.equal(noReportDate.unresolved_applicability.length, 1, 'an unreadable report date leaves that check unresolved, not passed');

  /* --- the order of two printed dates on one entry */
  const wrongOrder = runSynthetic('CA', syntheticView({
    reference_date: REFERENCE,
    by_kind: { COLLECTION: [entry({ 'First Delinquency': ['VALUE', '2024/06/01', '2024-06-01'] })] }
  }));
  branches.date_order = byId(wrongOrder, 'CA-FACT-DATE-ORDER-WITHIN-RECORD');
  check.equal(branches.date_order.agreement, 'A_DIFFERENCE_WAS_FOUND', 'two printed dates in the wrong order are a difference');
  check.deepEqual(branches.date_order.evidence.pairs_out_of_order[0].pair, ['First Delinquency', 'Date Assigned'],
    'and the pair is named');

  /* A blank label restricts only its own pair: the pairs that can still be read are still compared. */
  const partial = runSynthetic('CA', syntheticView({
    reference_date: REFERENCE,
    by_kind: { COLLECTION: [entry()] }
  }));
  branches.partial_dates = byId(partial, 'CA-FACT-DATE-ORDER-WITHIN-RECORD');
  check.equal(branches.partial_dates.agreement, 'NO_DIFFERENCE_FOUND', 'the pair that can be read is compared and agrees');
  check.equal(branches.partial_dates.evidence.pairs_examined, 1, 'exactly the pairs that could be read ran');
  check.equal(branches.partial_dates.not_examinable.length, 2, 'and both pairs the blank and unprinted labels restricted are named');
  check.deepEqual(branches.partial_dates.not_examinable.map((c) => c.because.reason).sort(),
    ['LABEL_NOT_PRINTED_ON_THIS_RECORD', 'LABEL_PRINTED_WITHOUT_VALUE'], 'with the reading that blocked each one');

  /* --- values printed about one securely matched debt */
  const conflict = runSynthetic('CA', syntheticView({
    reference_date: REFERENCE,
    identity_groups: [{ record_indexes: [1, 2], matched_on: ['Member Number', 'Account Number'] }],
    by_kind: { COLLECTION: [entry(), entry({ 'First Delinquency': ['VALUE', '2019/05/05', '2019-05-05'] })] }
  }));
  branches.same_debt = byId(conflict, 'CA-FACT-SAME-DEBT-PRINTED-VALUE-CONFLICT');
  check.equal(branches.same_debt.agreement, 'A_DIFFERENCE_WAS_FOUND',
    'one debt carrying two printed first-delinquency dates is a difference');
  check.equal(conflict.performed.length, 3, 'and the two entry-level checks still ran alongside it');

  const noGroup = runSynthetic('CA', syntheticView({
    reference_date: REFERENCE,
    by_kind: { COLLECTION: [entry(), entry({ 'Account Number': ['VALUE', 'A2'] })] }
  }));
  branches.same_debt_not_applicable = byId(noGroup, 'CA-FACT-SAME-DEBT-PRINTED-VALUE-CONFLICT');
  check.equal(noGroup.not_applicable.length, 2, 'two entries that do not print the same identifiers are not matched');
  check.equal(branches.same_debt_not_applicable.reason, 'NO_TWO_RECORDS_PRINT_THE_SAME_MEMBER_NUMBER_AND_ACCOUNT_NUMBER');

  const noRecords = runSynthetic('CA', syntheticView({ reference_date: REFERENCE, by_kind: {} }));
  check.equal(noRecords.performed.length, 0, 'a view with no entry of the kind performs nothing at all');
  check.equal(noRecords.not_applicable.length, 4, 'and every registered check says exactly why it does not reach it');
  check.equal(noRecords.summary.performed + noRecords.summary.not_applicable + noRecords.summary.applicability_unresolved
    + noRecords.summary.not_examinable, 4, 'while every registered check is still accounted for in exactly one bucket');

  for (const [name, outcome] of Object.entries(branches)) {
    if (!outcome || !outcome.check_id) continue;
    check.equal(outcome.check_class, 'REPORT_FACT_CONSISTENCY', `synthetic ${name}: still a report-fact consistency check`);
    check.equal(outcome.is_a_finding, false, `synthetic ${name}: and never a finding`);
  }
  return {
    synthetic_structural_views_only: true,
    establishes_no_presentation_evidence: true,
    branches_exercised: Object.keys(branches).sort()
  };
}

/* ------------------------------------------------------------------ the section */

async function run(t, check) {
  const specimen = readPinnedSpecimen();
  if (!specimen.available) {
    check.skip('the Canadian factual assessment', specimen.reason);
    return { skipped: true, reason: specimen.reason };
  }

  const owner = await t.account('ca-factual-owner@example.test');

  /* The real journey on the real report, for a selection with NO recorded statutory limb and for CA-NS. */
  const on = await journeyFor(t, check, owner, specimen, 'CA-ON');
  assertFactualSurface(check, on.result, 'CA-ON', false);
  check.equal(on.result.observations.length, 0, 'CA-ON: no statutory observation is produced for it, because none is recorded');
  check.ok(!/[A-Z]{2}-(PIPEDA|CRA)/.test(JSON.stringify(on.result)), 'CA-ON: and no statutory instrument is named anywhere in its result');
  const facts = realPresentationFacts(check, on.stored.evidence_readings.factual_view);

  const ns = await journeyFor(t, check, owner, specimen, 'CA-NS');
  assertFactualSurface(check, ns.result, 'CA-NS', true);
  check.equal(ns.result.observations.length, 2,
    'CA-NS: its last-payment limb produces one comparison per accepted collection entry; ordinary tables do not expand statutory admission');
  check.match(ns.result.assessment.plain, /common-error checklist using the report facts/, 'CA-NS: the assessment describes one checklist for the supported checks');

  const perRegion = everyCaRegion(check, on.stored);
  check.equal(Object.keys(perRegion).length, 13, 'all thirteen canonical Canadian selections were evaluated');
  check.deepEqual(Object.keys(perRegion).sort(), CA_REGIONS, 'and exactly the thirteen the recorded relation names');
  check.equal(OTHER_TWELVE.filter((r) => perRegion[r].factual_checks_performed === 4).length, 12,
    'each of the twelve selections with no recorded statutory limb ran all four factual checks');

  /* A refused file and a synthetic model produce no factual surface at all. */
  const lookalikeCase = (await t.request('POST', '/api/cases', { token: owner.token, body: { country: 'CA', region: 'CA-ON' } })).json.case.case_id;
  const lookalikeBytes = fs.readFileSync(FIXTURES.pdfFixtures().unpinned);
  const lookalike = await t.request('POST', `/api/cases/${lookalikeCase}/files`, {
    token: owner.token,
    body: { originalFilename: 'report.pdf', declaredBytes: lookalikeBytes.length, mimeType: 'application/pdf', contentBase64: lookalikeBytes.toString('base64') }
  });
  check.equal(lookalike.status, 201, 'a structurally similar PDF is stored so its measured shape can be reported');
  check.equal(lookalike.json.receipt.format_detection.supported, false, 'and is refused at the format gate');
  check.equal(lookalike.json.receipt.extraction_summary.extraction_ran, false, 'so nothing is read from it');
  const refusedStored = t.service.store.state().files.filter((f) => f.case_id === lookalikeCase).pop().extraction;
  check.equal(refusedStored.evidence_readings, undefined, 'and a refused file carries no factual view to run checks over');
  const refusedResult = (await t.request('POST', `/api/cases/${lookalikeCase}/evaluate`, { token: owner.token, body: {} })).json.result;
  check.equal(refusedResult.checks_performed, 0, 'so a refused file performs no factual check either');
  check.equal(refusedResult.report_consistency_checks.length, 0, 'and reports none');

  const demoCase = (await t.request('POST', '/api/cases', { token: owner.token, body: { country: 'CA', region: 'CA-ON' } })).json.case.case_id;
  await t.request('POST', `/api/cases/${demoCase}/demonstration`, { token: owner.token, body: { scenario: 'TWO_ACCOUNTS' } });
  const demoView = (await t.request('GET', `/api/cases/${demoCase}`, { token: owner.token })).json.view.result;
  check.equal(demoView.report_consistency_checks.length, 0, 'a demonstration model produces no factual check, because it is not a report');
  check.equal(demoView.checks_performed, 0, 'and performs nothing at all');

  const synthetic = syntheticBranches(check);

  check.ok(!t.logText().includes(specimen.path), 'the specimen path never reaches a log record');
  check.ok(!t.logText().includes(specimen.sha256), 'and neither does its digest');
  for (const caseId of [on.caseId, ns.caseId, lookalikeCase, demoCase]) {
    const deleted = await t.request('DELETE', `/api/cases/${caseId}`, { token: owner.token });
    check.equal(deleted.status, 200);
  }
  check.equal(t.blobFiles().length, 0, 'nothing of the report is left on disk');

  return {
    skipped: false,
    presentation_id: 'PR-01',
    real_evidence: facts,
    regions: perRegion,
    regions_with_a_working_assessment: CA_REGIONS,
    regions_with_no_statutory_evaluation_but_a_real_factual_assessment: OTHER_TWELVE,
    ca_ns_statutory_evaluation: { unchanged: true, adapter_ids: [NS_ADAPTER] },
    synthetic
  };
}

module.exports = {
  run,
  id: 'r-ca-factual-assessment',
  title: 'Canadian factual assessment for all 13 Canadian selections, with CA-NS statutory evaluation kept separate'
};




