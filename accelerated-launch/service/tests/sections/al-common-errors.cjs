'use strict';
/**
 * al-common-errors.cjs — BLOCKER-COMMON-ERRORS-001. Data-consistency checks across assembled records: a
 * qualifying example, a legitimate lookalike, missing/ambiguous evidence and an equivalent layout, and the
 * invariant that a factual inconsistency never becomes a legal finding.
 */
const formats = require('../../formats.cjs');
const evaluation = require('../../evaluation.cjs');
const commonErrors = require('../../common-errors.cjs');
const issues = require('../../issues.cjs');
const { makeSyntheticModel } = require('../../../../internal-validation/ca-ns-last-payment-six-year/document-model.cjs');

function rec(over) {
  return Object.assign({ record_index: 1, kind: 'CONSUMER_CREDIT_LIABILITY', kind_label: 'credit account', status: 'RESOLVED', location: { page: 1, line: 1 }, facts: {} }, over);
}

async function run(t, check) {
  const evidence = {};

  /* ------------------------------------------------------------------ qualifying: contradictory opened/closed */
  const contradictory = commonErrors.contradictoryAccountDates([
    rec({ facts: { 'liability.openedDate': '2020-02-01', 'liability.closedDate': '2019-01-01' } })
  ]);
  check.equal(contradictory.state, 'POTENTIAL_ISSUE', 'an account opened after its closed date is a potential issue');
  check.equal(contradictory.is_legal_finding, false, 'and it is never a legal finding');

  /* ------------------------------------------------------------------ legitimate lookalike: opened before closed */
  const okDates = commonErrors.contradictoryAccountDates([
    rec({ facts: { 'liability.openedDate': '2018-01-01', 'liability.closedDate': '2020-01-01' } })
  ]);
  check.equal(okDates.state, 'NOT_DETECTED', 'an account opened before its closed date is not flagged');

  /* ------------------------------------------------------------------ duplicate reporting: masked identifier + creditor name + a matching additional account fact corroborate; dates alone do not */
  const dup = commonErrors.duplicateReporting([
    rec({ record_index: 1, facts: { 'liability.openedDate': '2018-01-01', 'liability.closedDate': '2020-01-01', 'account.masked_identifier': 'MASK-1234', 'account.reported_identity': 'CREDITOR A', 'account.amount': 100 } }),
    rec({ record_index: 2, facts: { 'liability.openedDate': '2018-01-01', 'liability.closedDate': '2020-01-01', 'account.masked_identifier': 'MASK-1234', 'account.reported_identity': 'CREDITOR A', 'account.amount': 100 } })
  ]);
  check.equal(dup.state, 'POTENTIAL_ISSUE', 'same masked identifier + creditor name + a matching printed balance is a potential duplicate');
  /* OWNER-ACCEPT-009 item 4: same creditor name + same masked trailing digits can still collide between two
     accounts. Without an additional compatible account fact this is NOT described as a duplicate. */
  const sameCreditorSameMaskNoThirdFact = commonErrors.duplicateReporting([
    rec({ record_index: 1, facts: { 'liability.openedDate': '2018-01-01', 'liability.closedDate': '2020-01-01', 'account.masked_identifier': 'MASK-1234', 'account.reported_identity': 'CREDITOR A' } }),
    rec({ record_index: 2, facts: { 'liability.openedDate': '2018-01-01', 'liability.closedDate': '2020-01-01', 'account.masked_identifier': 'MASK-1234', 'account.reported_identity': 'CREDITOR A' } })
  ]);
  check.equal(sameCreditorSameMaskNoThirdFact, null, 'creditor name + masked trailing digits without additional compatible evidence is not a duplicate');
  const collisionSimilar = commonErrors.similarEntriesWorthReviewing([
    rec({ record_index: 1, facts: { 'liability.openedDate': '2018-01-01', 'liability.closedDate': '2020-01-01', 'account.masked_identifier': 'MASK-1234', 'account.reported_identity': 'CREDITOR A' } }),
    rec({ record_index: 2, facts: { 'liability.openedDate': '2018-01-01', 'liability.closedDate': '2020-01-01', 'account.masked_identifier': 'MASK-1234', 'account.reported_identity': 'CREDITOR A' } })
  ]);
  check.equal(collisionSimilar.state, 'SIMILAR_ENTRIES_WORTH_REVIEWING', 'the specific collision remains a qualified similarity observation');
  check.ok(collisionSimilar.source_records.some((m) => m.evidence && m.evidence.shared_identity_without_additional_evidence === true), 'and it records that the identity matched without additional evidence');
  /* Contradictory additional evidence (different balances) refutes the duplicate. */
  const contradicted = commonErrors.duplicateReporting([
    rec({ record_index: 1, facts: { 'liability.openedDate': '2018-01-01', 'liability.closedDate': '2020-01-01', 'account.masked_identifier': 'MASK-1234', 'account.reported_identity': 'CREDITOR A', 'account.amount': 100 } }),
    rec({ record_index: 2, facts: { 'liability.openedDate': '2018-01-01', 'liability.closedDate': '2020-01-01', 'account.masked_identifier': 'MASK-1234', 'account.reported_identity': 'CREDITOR A', 'account.amount': 250 } })
  ]);
  check.equal(contradicted, null, 'different balances with the same masked identifier and creditor name are not a duplicate');
  /* Masked trailing digits can collide: same masked identifier but DIFFERENT creditor name is never a duplicate. */
  const maskedCollision = commonErrors.duplicateReporting([
    rec({ record_index: 1, facts: { 'liability.openedDate': '2018-01-01', 'liability.closedDate': '2020-01-01', 'account.masked_identifier': 'MASK-1234', 'account.reported_identity': 'CREDITOR A' } }),
    rec({ record_index: 2, facts: { 'liability.openedDate': '2018-01-01', 'liability.closedDate': '2020-01-01', 'account.masked_identifier': 'MASK-1234', 'account.reported_identity': 'CREDITOR B' } })
  ]);
  check.equal(maskedCollision, null, 'matching masked trailing digits with different creditors are not a duplicate');
  /* Two accounts with the SAME creditor name and dates, but DIFFERENT masked identifiers, are never a duplicate. */
  const sameCreditorDifferentMask = commonErrors.duplicateReporting([
    rec({ record_index: 1, facts: { 'liability.openedDate': '2018-01-01', 'liability.closedDate': '2020-01-01', 'account.reported_identity': 'CREDITOR A', 'account.masked_identifier': 'MASK-1234' } }),
    rec({ record_index: 2, facts: { 'liability.openedDate': '2018-01-01', 'liability.closedDate': '2020-01-01', 'account.reported_identity': 'CREDITOR A', 'account.masked_identifier': 'MASK-5678' } })
  ]);
  check.equal(sameCreditorDifferentMask, null, 'two accounts with the same creditor name and dates but different masked identifiers are not a duplicate');
  /* The normalized creditor name alone (no masked identifier) is never sufficient to assert a duplicate. */
  const sameCreditorNoMask = commonErrors.duplicateReporting([
    rec({ record_index: 1, facts: { 'liability.openedDate': '2018-01-01', 'liability.closedDate': '2020-01-01', 'account.reported_identity': 'CREDITOR A' } }),
    rec({ record_index: 2, facts: { 'liability.openedDate': '2018-01-01', 'liability.closedDate': '2020-01-01', 'account.reported_identity': 'CREDITOR A' } })
  ]);
  check.equal(sameCreditorNoMask, null, 'a normalized creditor name alone never establishes a duplicate');
  const datesOnly = commonErrors.duplicateReporting([
    rec({ record_index: 1, facts: { 'liability.openedDate': '2018-01-01', 'liability.closedDate': '2020-01-01' } }),
    rec({ record_index: 2, facts: { 'liability.openedDate': '2018-01-01', 'liability.closedDate': '2020-01-01' } })
  ]);
  check.equal(datesOnly, null, 'matching dates alone never establish a duplicate');
  const similarOnly = commonErrors.similarEntriesWorthReviewing([
    rec({ record_index: 1, facts: { 'liability.openedDate': '2018-01-01', 'liability.closedDate': '2020-01-01' } }),
    rec({ record_index: 2, facts: { 'liability.openedDate': '2018-01-01', 'liability.closedDate': '2020-01-01' } })
  ]);
  check.equal(similarOnly.state, 'SIMILAR_ENTRIES_WORTH_REVIEWING', 'entries with matching dates but no corroboration are similar entries worth reviewing');
  const notDup = commonErrors.duplicateReporting([
    rec({ record_index: 1, facts: { 'liability.openedDate': '2018-01-01', 'liability.closedDate': '2020-01-01' } }),
    rec({ record_index: 2, facts: { 'liability.openedDate': '2019-01-01', 'liability.closedDate': '2021-01-01' } })
  ]);
  check.equal(notDup, null, 'similar entries with different dates are not treated as duplicates');

  /* ------------------------------------------------------------------ re-aging signal and out-of-order dates */
  const reAge = commonErrors.adverseAfterFirstReport([
    rec({ facts: { 'reportedAccount.adverseRatingDate': '2021-01-01', 'reportedAccount.firstReported': '2020-01-01' } })
  ]);
  check.equal(issues.issuesFor({ extraction: { records: [] }, evaluation: { results: [], common_errors: { performed: [reAge] } } }).length, 0, 'adverse-after-first-report alone may describe later delinquency and is not a selectable re-aging issue');
  const outOfOrder = commonErrors.reportedDatesOutOfOrder([
    rec({ facts: { 'reportedAccount.dateOpened': '2021-01-01', 'reportedAccount.firstReported': '2020-01-01' } })
  ]);
  check.equal(outOfOrder.state, 'POTENTIAL_ISSUE', 'an opened date after first-reported is out of order');

  /* ------------------------------------------------------------------ missing facts: not applicable, never a finding */
  const missing = commonErrors.runCommonErrorChecks({ extraction: { records: [rec({ facts: {} })] } });
  check.equal(missing.performed.length, 0, 'checks without their facts are not performed, not invented');
  check.equal(missing.summary.legal_findings_emitted, 0, 'and none emits a legal finding');

  /* ------------------------------------------------------------------ status/date contradiction (open status + closed date) */
  const statusContra = commonErrors.accountStatusDateContradiction([
    rec({ facts: { 'account.status': 'OPEN', 'liability.closedDate': '2020-01-01' } })
  ]);
  check.equal(statusContra.state, 'POTENTIAL_ISSUE', 'an open status with a closure date is a potential issue');
  const closedWithBalance = commonErrors.accountStatusDateContradiction([
    rec({ facts: { 'account.status': 'CLOSED', 'account.amount': 100, 'liability.closedDate': '2020-01-01' } })
  ]);
  check.equal(closedWithBalance, null, 'a closed account with a balance is never flagged');

  /* ------------------------------------------------------------------ balance/payment consistency (OWNER-ACCEPT-009 item 3) */
  const pastDueExceeds = commonErrors.balancePaymentConsistency([
    rec({ facts: { 'account.balance': 100, 'account.pastDueAmount': 150 } })
  ]);
  check.equal(pastDueExceeds.state, 'POTENTIAL_ISSUE', 'a past-due amount above the printed balance is a potential issue');
  const paymentExceeds = commonErrors.balancePaymentConsistency([
    rec({ facts: { 'account.balance': 100, 'account.paymentAmount': 120 } })
  ]);
  check.equal(issues.issuesFor({ extraction: { records: [rec({ facts: { 'account.balance': 100, 'account.paymentAmount': 120 } })] }, evaluation: { results: [], common_errors: { performed: [paymentExceeds] } } }).length, 0, 'payment above a current balance can be a post-payment snapshot or overpayment and is not a selectable contradiction');
  const balanced = commonErrors.balancePaymentConsistency([
    rec({ facts: { 'account.balance': 500, 'account.pastDueAmount': 50, 'account.paymentAmount': 120 } })
  ]);
  check.equal(balanced, null, 'a past-due/payment amount at or below the balance is never flagged');
  const missingAmounts = commonErrors.balancePaymentConsistency([rec({ facts: { 'account.balance': 100 } })]);
  check.equal(missingAmounts, null, 'a missing past-due/payment amount is skipped, never invented');

  /* ------------------------------------------------------------------ end-to-end: distinct printed amounts through assessment */
  const amountModel = makeSyntheticModel({ pages: [['Equifax Consumer Credit Report', 'Report Date: June 12, 2026',
    'Creditor A Opened 01/01/2020 Balance $1,250.00 Past Due $50.00 Payment $25.00 Credit Limit $5,000.00']] });
  const amountExt = formats.extractWithSharedAdapter(amountModel, { mode: 'REPORT', country: 'US' });
  const amountRec = (amountExt.records || []).find((r) => r.facts && r.facts['account.balance'] !== undefined);
  check.ok(amountRec, 'a balance/payment/limit line is read into a record');
  check.equal(amountRec && amountRec.facts['account.balance'], 1250, 'the printed current balance is extracted distinctly');
  check.equal(amountRec && amountRec.facts['account.pastDueAmount'], 50, 'the printed past-due amount is extracted distinctly');
  check.equal(amountRec && amountRec.facts['account.paymentAmount'], 25, 'the printed payment amount is extracted distinctly');
  check.equal(amountRec && amountRec.facts['account.creditLimit'], 5000, 'the printed credit limit is extracted distinctly');
  check.equal(amountRec && amountRec.facts['account.currency'], 'USD_SYMBOL_PRINTED', 'the printed currency marker is preserved');
  const amountEv = evaluation.evaluateCase({ country: 'US', region: 'US-NY', extraction: amountExt });
  check.ok(!amountEv.common_errors.performed.some((c) => c.check_id === 'COMMON-ERROR-BALANCE-PAYMENT-INCONSISTENCY' && c.state === 'POTENTIAL_ISSUE'), 'consistent printed amounts produce no balance/payment inconsistency');

  /* ------------------------------------------------------------------ payment-history consistency (OWNER-ACCEPT-009 item 2, corrected) */
  const payHistQualifying = commonErrors.paymentHistoryConsistency([
    rec({ facts: { 'account.paymentHistoryCells': [ { period: '2024-01', code: 'OK', meaning: 'Paid as agreed' }, { period: '2024-01', code: '30', meaning: '30 days late' } ] } })
  ]);
  check.equal(payHistQualifying.state, 'POTENTIAL_ISSUE', 'the same period printed twice with different cells is a genuine contradiction');
  const payHistStaleStatus = commonErrors.paymentHistoryConsistency([
    rec({ facts: { 'account.status': 'CHARGED OFF', 'account.paymentHistoryCells': [ { period: '2024-01', code: 'OK', meaning: 'Paid as agreed' }, { period: '2024-02', code: 'OK', meaning: 'Paid as agreed' } ] } })
  ]);
  check.equal(payHistStaleStatus, null, 'a clean latest cell beside a charged-off status is never automatically inconsistent');
  const payHistHistoricalChargeOff = commonErrors.paymentHistoryConsistency([
    rec({ facts: { 'account.status': 'CURRENT', 'account.paymentHistoryCells': [ { period: '2024-01', code: '30', meaning: '30 days late' }, { period: '2024-02', code: 'CO', meaning: 'Charged off' }, { period: '2024-03', code: 'OK', meaning: 'Paid as agreed' } ] } })
  ]);
  check.equal(payHistHistoricalChargeOff, null, 'historical charge-off followed by a later payment is never flagged');
  const payHistUnknownCell = commonErrors.paymentHistoryConsistency([
    rec({ facts: { 'account.paymentHistoryCells': [ { period: '2024-01', code: 'X', meaning: null, uncertain: true } ] } })
  ]);
  check.equal(payHistUnknownCell, null, 'a cell with no printed legend meaning is never decoded by guessing');
  const payHistMissing = commonErrors.paymentHistoryConsistency([rec({ facts: { 'account.status': 'CHARGED OFF' } })]);
  check.equal(payHistMissing, null, 'a missing history grid is skipped, never invented');

  /* ------------------------------------------------------------------ responsibility consistency (OWNER-ACCEPT-009 item 3, corrected) */
  const respQualifying = commonErrors.responsibilityInconsistency([
    rec({ record_index: 1, source_bureau: 'Equifax', source_report_reference_date: '2026-06-12', facts: { 'account.masked_identifier': 'MASK-1234', 'account.reported_identity': 'CREDITOR A', 'account.responsibility': 'INDIVIDUAL', 'account.amount': 100 } }),
    rec({ record_index: 2, source_bureau: 'Equifax', source_report_reference_date: '2026-06-12', facts: { 'account.masked_identifier': 'MASK-1234', 'account.reported_identity': 'CREDITOR A', 'account.responsibility': 'JOINT', 'account.amount': 100 } })
  ]);
  check.equal(respQualifying.state, 'POTENTIAL_ISSUE', 'the same corroborated account with two responsibility labels in the same snapshot is a potential issue');
  const respDifferentSnapshot = commonErrors.responsibilityInconsistency([
    rec({ record_index: 1, source_bureau: 'Equifax', source_report_reference_date: '2026-06-12', facts: { 'account.masked_identifier': 'MASK-1234', 'account.reported_identity': 'CREDITOR A', 'account.responsibility': 'INDIVIDUAL', 'account.amount': 100 } }),
    rec({ record_index: 2, source_bureau: 'Equifax', source_report_reference_date: '2026-01-01', facts: { 'account.masked_identifier': 'MASK-1234', 'account.reported_identity': 'CREDITOR A', 'account.responsibility': 'JOINT', 'account.amount': 100 } })
  ]);
  check.equal(respDifferentSnapshot, null, 'a changed responsibility across different snapshots is never flagged');
  const respNoCorroboration = commonErrors.responsibilityInconsistency([
    rec({ record_index: 1, source_bureau: 'Equifax', source_report_reference_date: '2026-06-12', facts: { 'account.masked_identifier': 'MASK-1234', 'account.reported_identity': 'CREDITOR A', 'account.responsibility': 'INDIVIDUAL' } }),
    rec({ record_index: 2, source_bureau: 'Equifax', source_report_reference_date: '2026-06-12', facts: { 'account.masked_identifier': 'MASK-1234', 'account.reported_identity': 'CREDITOR A', 'account.responsibility': 'JOINT' } })
  ]);
  check.equal(respNoCorroboration, null, 'a masked-identifier collision without corroboration is never a responsibility conflict');
  const respLookalike = commonErrors.responsibilityInconsistency([
    rec({ record_index: 1, source_bureau: 'Equifax', source_report_reference_date: '2026-06-12', facts: { 'account.masked_identifier': 'MASK-1234', 'account.reported_identity': 'CREDITOR A', 'account.responsibility': 'INDIVIDUAL', 'account.amount': 100 } }),
    rec({ record_index: 2, source_bureau: 'Equifax', source_report_reference_date: '2026-06-12', facts: { 'account.masked_identifier': 'MASK-5678', 'account.reported_identity': 'CREDITOR B', 'account.responsibility': 'AUTHORIZED_USER', 'account.amount': 200 } })
  ]);
  check.equal(respLookalike, null, 'two different accounts with different roles are never a responsibility conflict');
  const respSame = commonErrors.responsibilityInconsistency([
    rec({ record_index: 1, source_bureau: 'Equifax', source_report_reference_date: '2026-06-12', facts: { 'account.masked_identifier': 'MASK-1234', 'account.reported_identity': 'CREDITOR A', 'account.responsibility': 'INDIVIDUAL', 'account.amount': 100 } }),
    rec({ record_index: 2, source_bureau: 'Equifax', source_report_reference_date: '2026-06-12', facts: { 'account.masked_identifier': 'MASK-1234', 'account.reported_identity': 'CREDITOR A', 'account.responsibility': 'INDIVIDUAL', 'account.amount': 100 } })
  ]);
  check.equal(respSame, null, 'the same responsibility on the same account is never flagged');
  const respMissing = commonErrors.responsibilityInconsistency([
    rec({ record_index: 1, facts: { 'account.masked_identifier': 'MASK-1234', 'account.reported_identity': 'CREDITOR A' } })
  ]);
  check.equal(respMissing, null, 'a missing responsibility label is skipped, never invented');

  /* ------------------------------------------------------------------ identity discrepancy (OWNER-ACCEPT-009 item 4) */
  const idQualifying = commonErrors.identityDiscrepancy([
    { field: 'CURRENT ADDRESS', role: 'CURRENT', token: '123 MAIN ST' },
    { field: 'CURRENT ADDRESS', role: 'CURRENT', token: '789 OTHER AVE' }
  ]);
  check.equal(idQualifying.state, 'SIMILAR_ENTRIES_WORTH_REVIEWING', 'two current addresses with different values are a qualified review observation, never a contradiction');
  const idLookalike = commonErrors.identityDiscrepancy([
    { field: 'NAME', role: 'PRIMARY', token: 'JOHN SMITH' },
    { field: 'ALSO KNOWN AS', role: 'ALIAS', token: 'J SMITH' },
    { field: 'PREVIOUS ADDRESS', role: 'HISTORICAL', token: '456 OLD RD' },
    { field: 'CO-APPLICANT', role: 'CO_APPLICANT', token: 'JANE SMITH' }
  ]);
  check.equal(idLookalike, null, 'an alias, a former address and a co-applicant are distinct roles, never a discrepancy');
  const idSame = commonErrors.identityDiscrepancy([
    { field: 'CURRENT ADDRESS', role: 'CURRENT', token: '123 MAIN ST' },
    { field: 'CURRENT ADDRESS', role: 'CURRENT', token: '123 MAIN ST' }
  ]);
  check.equal(idSame, null, 'the same current address repeated is never flagged');
  const idMissing = commonErrors.identityDiscrepancy([]);
  check.equal(idMissing, null, 'no printed identity fields is skipped, never invented');

  /* ------------------------------------------------------------------ end-to-end: identity fields through assessment */
  const idModel = makeSyntheticModel({ pages: [['Equifax Consumer Credit Report', 'Report Date: June 12, 2026',
    'Name: John Smith', 'Current Address: 123 Main St', 'Current Address: 789 Other Ave',
    'Creditor A Opened 01/01/2020']] });
  const idExt = formats.extractWithSharedAdapter(idModel, { mode: 'REPORT', country: 'US' });
  check.ok(Array.isArray(idExt.identity_groups) && idExt.identity_groups.length >= 3, 'printed identity fields are extracted with their roles');
  const idEv = evaluation.evaluateCase({ country: 'US', region: 'US-NY', extraction: idExt });
  check.ok(idEv.common_errors.performed.some((c) => c.check_id === 'COMMON-ERROR-IDENTITY-REVIEW' && c.state === 'SIMILAR_ENTRIES_WORTH_REVIEWING'), 'and a conflicting identity field is surfaced as a review observation, never identity theft');

  /* ------------------------------------------------------------------ end-to-end: payment-history grid + responsibility through assessment */
  const gridModel = makeSyntheticModel({ pages: [['Equifax Consumer Credit Report', 'Report Date: June 12, 2026',
    'Creditor A Opened 01/01/2020 Individual Account',
    'Payment History: 2024-01=OK 2024-02=OK 2024-03=30 2024-04=CO Key: OK=Paid as agreed 30=30 days late CO=Charged off']] });
  const gridExt = formats.extractWithSharedAdapter(gridModel, { mode: 'REPORT', country: 'US' });
  const gridRec = (gridExt.records || []).find((r) => r.facts && Array.isArray(r.facts['account.paymentHistoryCells']));
  check.ok(gridRec, 'a payment-history grid is read into a record');
  check.equal(gridRec && gridRec.facts['account.responsibility'], 'INDIVIDUAL', 'the printed responsibility is extracted');
  check.equal(gridRec && gridRec.facts['account.paymentHistoryLegend'].length, 3, 'the printed legend (code -> meaning) is extracted');
  check.equal(gridRec && gridRec.facts['account.paymentHistoryCells'].length, 4, 'the printed cells are extracted with their periods');
  check.ok(gridRec && gridRec.facts['account.paymentHistoryCells'].every((c) => c.meaning !== null && c.uncertain === false), 'every cell is decoded only from the printed legend, never guessed');

  /* ------------------------------------------------------------------ equivalent layout: different header and period form, UK spelling of role */
  const altModel = makeSyntheticModel({ pages: [['Equifax Consumer Credit Report', 'Report Date: June 12, 2026',
    'Creditor A Opened 01/01/2020 Authorised User Account',
    'Repayment History: JAN 2024:OK FEB 2024:30 Key: OK=Paid as agreed 30=30 days late']] });
  const altExt = formats.extractWithSharedAdapter(altModel, { mode: 'REPORT', country: 'US' });
  const altRec = (altExt.records || []).find((r) => r.facts && Array.isArray(r.facts['account.paymentHistoryCells']));
  check.ok(altRec, 'an equivalent "Repayment History" layout is read into a record');
  check.equal(altRec && altRec.facts['account.responsibility'], 'AUTHORIZED_USER', 'the UK spelling "Authorised User" is read as the same role');
  check.ok(altRec && altRec.facts['account.paymentHistoryCells'].some((c) => c.period === 'JAN 2024' && c.code === 'OK'), 'an equivalent period form (JAN 2024:OK) is decoded from the printed legend');

  /* ------------------------------------------------------------------ full journey: contradictory account through assessment */
  const model = makeSyntheticModel({ pages: [['Equifax Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor A Opened February 1, 2020 Closed January 1, 2019']] });
  const ext = formats.extractWithSharedAdapter(model, { mode: 'REPORT', country: 'US' });
  const ev = evaluation.evaluateCase({ country: 'US', region: 'US-NY', extraction: ext });
  check.ok(ev.common_errors && ev.common_errors.performed.length >= 1, 'the common-error checks run through assessment');
  check.ok(ev.common_errors.performed.some((c) => c.check_id === 'COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY' && c.state === 'POTENTIAL_ISSUE'), 'and the contradictory account is flagged');
  check.ok(ev.common_errors.performed.every((c) => c.is_legal_finding === false), 'and none of them is a legal finding');
  check.ok(!ev.results.some((r) => r.machine && r.machine.finding_emitted === true), 'no VIOLATION/PROBABLE_VIOLATION is emitted from a factual inconsistency');

  /* ------------------------------------------------------------------ rendered result exposes the common_errors bucket */
  const results = require('../../results.cjs');
  const rendered = results.renderResultSet({ evaluation: ev, extraction: ext });
  check.ok(Array.isArray(rendered.common_errors), 'the consumer result exposes the common_errors bucket');
  check.ok(rendered.common_errors.some((c) => c.state === 'POTENTIAL_ISSUE' && c.is_a_finding === false), 'and a potential issue is visible, never a finding');

  evidence.qualifying = { contradictory: contradictory.state, duplicate: dup.state, re_aging: reAge.state, status_date: statusContra.state };
  evidence.lookalikes = { ok_dates: okDates.state, not_duplicate: notDup === null, similar_only: similarOnly.state, closed_with_balance: closedWithBalance === null };
  evidence.legal_findings_emitted = ev.common_errors.summary.legal_findings_emitted;
  return evidence;
}

module.exports = { run, id: 'al-common-errors', title: 'BLOCKER-COMMON-ERRORS-001: data-consistency checks, never a legal finding' };
