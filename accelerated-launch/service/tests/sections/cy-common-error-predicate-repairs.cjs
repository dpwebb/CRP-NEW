'use strict';

const formats = require('../../formats.cjs');
const engine = require('../../evaluation.cjs');
const issues = require('../../issues.cjs');
const common = require('../../common-errors.cjs');
const { checklistFor } = require('../../common-error-checklist.cjs');
const { makeSyntheticModel } = require('../../../../internal-validation/ca-ns-last-payment-six-year/document-model.cjs');

const PAID = 'COMMON-ERROR-PAID-SETTLED-SHOWN-UNPAID';
const DATES = 'COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY';
const DUPLICATE = 'COMMON-ERROR-DUPLICATE-REPORTING';
const RESPONSIBILITY = 'COMMON-ERROR-RESPONSIBILITY-INCONSISTENCY';

function assess(lines) {
  const extraction = formats.extractWithSharedAdapter(makeSyntheticModel({ pages: [[
    'Equifax Consumer Credit Report', 'Report Date: June 12, 2026', ...lines
  ]] }), { mode: 'REPORT', country: 'CA' });
  const evaluation = engine.evaluateCase({ country: 'CA', region: 'CA-NS', extraction });
  return { extraction, evaluation, findings: issues.issuesFor({ extraction, evaluation }) };
}

function record(facts, extra = {}) {
  return { record_index: 1, status: 'RESOLVED', kind: 'CONSUMER_CREDIT_LIABILITY', facts, ...extra };
}

function paired(rows) {
  return assess(rows.flatMap(([balance, role]) => [
    `Fictional Creditor Opened 01/01/2020 Closed 01/01/2021 Balance $${balance}.00 Responsibility ${role}`,
    'Account Number ****1234'
  ]));
}

async function run(t, check) {
  for (const status of ['Paid As Agreed', 'Paid As Agreed / Never Late', 'Current']) {
    const result = assess([`Fictional Creditor Opened 01/01/2020 Status ${status} Balance $100.00 Past Due $0.00`]);
    check.equal(result.findings.some((issue) => issue.check_id === PAID), false,
      `${status}: repayment performance does not imply paid in full`);
    if (status.startsWith('Paid As Agreed')) {
      check.equal(result.extraction.records[0].facts['account.status'], 'PAID AS AGREED',
        'the full repayment phrase survives normalization');
      check.equal(result.extraction.records[0].printed.Status.raw, 'Paid As Agreed',
        'the located source retains the full performance phrase');
    }
  }
  for (const status of ['Paid In Full', 'Settled In Full']) {
    const result = assess([`Fictional Creditor Opened 01/01/2020 Closed 01/01/2021 Status ${status} Balance $100.00 Past Due $0.00`]);
    const issue = result.findings.find((item) => item.check_id === PAID);
    check.equal(issue?.classification, 'PROBABLE_VIOLATION', `${status}: explicit final payment beside an amount due remains selectable`);
    check.equal(result.extraction.records[0].printed.Status.raw, status,
      `${status}: the closed-date caption cannot replace the status source`);
    check.ok(issue?.source_facts.some((fact) => fact.field === 'account.status' && fact.raw_value === status && fact.location.line === 3),
      `${status}: assessment retains the exact status source`);
  }
  const settled = assess(['Fictional Creditor Opened 01/01/2020 Status Settled Balance $100.00 Past Due $0.00']);
  check.equal(settled.findings.some((issue) => issue.check_id === PAID), false,
    'a partial settlement can retain a balance and is not claimed paid in full');
  const captionOnly = assess(['Fictional Creditor Opened 01/01/2020 Closed 01/01/2021 Balance $100.00']);
  check.equal(captionOnly.extraction.records[0].facts['account.status'], undefined,
    'a closed-date caption alone does not manufacture a status');
  for (const caption of ['Closed Date:', 'Date Closed:', 'Date Paid/Settled:', 'Closed:']) {
    const blankCaption = assess(['Fictional Creditor Opened 01/01/2020 Balance $100.00', caption]);
    check.equal(blankCaption.extraction.records[0].facts['account.status'], undefined,
      `${caption}: an empty date caption cannot become a status`);
  }
  const unknownStatus = assess(['Fictional Creditor Opened 01/01/2020 Closed 01/01/2021 Status Unknown Balance $100.00']);
  check.equal(unknownStatus.extraction.records[0].facts['account.status'], undefined,
    'an unrecognized explicit status cannot be replaced by a date caption');
  const explicitOpen = assess(['Fictional Creditor Opened 01/01/2020 Closed 01/01/2021 Status Open Balance $100.00']);
  check.equal(explicitOpen.findings.find((issue) => issue.check_id === 'COMMON-ERROR-STATUS-DATE-CONTRADICTION')?.classification,
    'PROBABLE_VIOLATION', 'the explicit lifecycle-open contradiction remains supported');
  const creditorWord = assess(['Open Bank Opened 01/01/2020 Closed 01/01/2021 Balance $100.00']);
  check.equal(creditorWord.extraction.records[0].facts['account.status'], undefined,
    'a creditor name cannot supply an account-status fact');
  check.equal(creditorWord.findings.some((issue) => issue.check_id === 'COMMON-ERROR-STATUS-DATE-CONTRADICTION'), false,
    'an Open Bank heading does not create an open/closed allegation');
  for (const statement of ['Open', 'This account is open', 'Account reported as open']) {
    const standalone = assess(['Fictional Creditor Opened 01/01/2020 Closed 01/01/2021 Balance $100.00', statement]);
    check.equal(standalone.findings.find((issue) => issue.check_id === 'COMMON-ERROR-STATUS-DATE-CONTRADICTION')?.classification,
      'PROBABLE_VIOLATION', `${statement}: standalone and explicit narrative statuses remain usable`);
    check.equal(standalone.extraction.records[0].printed.Status.raw.toUpperCase(), 'OPEN',
      `${statement}: the actual status token remains source linked`);
  }

  for (const opened of ['January 1, 2020', 'January 15, 2020']) {
    const result = assess([`Fictional Creditor Opened ${opened} Closed January 2020`]);
    check.equal(result.findings.some((issue) => issue.check_id === DATES), false,
      `${opened}: a day inside the closed month is not later than that month`);
    check.equal(result.extraction.records[0].facts['liability.closedDate'], '2020-01',
      'comparison preserves the printed month without inventing a day');
  }
  const before = assess(['Fictional Creditor Opened February 1, 2020 Closed January 2020']);
  check.equal(before.findings.find((issue) => issue.check_id === DATES)?.classification,
    'PROBABLE_VIOLATION', 'a whole closed month before opening still supports a contradiction');
  check.equal(common.contradictoryAccountDates([record({ 'liability.openedDate': '2020-02-29', 'liability.closedDate': '2020-02' })]).state,
    'NOT_DETECTED', 'leap day lies inside the shared calendar month range');
  check.equal(common.reportedDatesOutOfOrder([record({ 'reportedAccount.dateOpened': '2020-01-15', 'reportedAccount.firstReported': '2020-01' })]).state,
    'NOT_DETECTED', 'first-reported chronology respects overlapping month precision');
  check.equal(common.reportedDatesOutOfOrder([record({ 'reportedAccount.dateOpened': '2020-02-01', 'reportedAccount.firstReported': '2020-01' })]).state,
    'POTENTIAL_ISSUE', 'a first-reported month wholly before opening remains contradictory');
  check.equal(common.paymentOrDelinquencyDateConflict([record({ 'liability.openedDate': '2020-01-15',
    'tradeline.lastPaymentDate': '2020-01', 'tradeline.firstDelinquencyDate': '2020-01' })]).state,
  'NOT_DETECTED', 'payment and first-delinquency dates in the opening month do not predate opening');
  check.equal(common.paymentOrDelinquencyDateConflict([record({ 'tradeline.lastPaymentDate': '2026-06-30' },
    { report_reference_date: { normalized_value: '2026-06', precision: 'MONTH' } })]).state,
  'NOT_DETECTED', 'a payment within the report month is not after the report');
  check.equal(common.paymentOrDelinquencyDateConflict([record({ 'tradeline.lastPaymentDate': '2026-07' },
    { report_reference_date: { normalized_value: '2026-06-30', precision: 'DAY' } })]).state,
  'POTENTIAL_ISSUE', 'a payment month wholly after the report still supports a date conflict');

  for (const rows of [
    [[10, 'Individual'], [20, 'Individual'], [20, 'Joint']],
    [[20, 'Individual'], [20, 'Joint'], [10, 'Individual']],
    [[20, 'Joint'], [10, 'Individual'], [20, 'Individual']]
  ]) {
    const result = paired(rows);
    for (const id of [DUPLICATE, RESPONSIBILITY]) {
      const issue = result.findings.find((item) => item.check_id === id);
      check.ok(issue?.eligible, `${id}: the compatible pair survives report order ${JSON.stringify(rows)}`);
      check.equal(issue?.source_facts.length, 6, `${id}: both matched records retain their own three decisive sources`);
      const indices = [...new Set(issue?.rule_assessment.required_facts.map((item) => item.source.record_index))];
      check.equal(indices.length, 2, `${id}: the assessment refers to two distinct printed records`);
      check.ok(indices.every((index) => result.extraction.records.find((item) => item.record_index === index).facts['account.balance'] === 20),
        `${id}: the contradictory ten-dollar row cannot supply pair evidence`);
    }
  }
  const threeDuplicates = paired([[20, 'Individual'], [20, 'Individual'], [20, 'Individual']]);
  check.equal(threeDuplicates.findings.filter((issue) => issue.check_id === DUPLICATE).length, 2,
    'three identical rows yield one supported issue for each extra row, without repeating every pair');
  const differentAccounts = assess([
    'Fictional Creditor Opened 01/01/2020 Closed 01/01/2021 Balance $20.00 Responsibility Individual', 'Account Number ****1234',
    'Fictional Creditor Opened 01/01/2020 Closed 01/01/2021 Balance $20.00 Responsibility Joint', 'Account Number ****5678'
  ]);
  check.equal(differentAccounts.findings.some((issue) => [DUPLICATE, RESPONSIBILITY].includes(issue.check_id)), false,
    'compatible amounts on distinct account identifiers do not create a pair');

  const balanced = assess(['Fictional Creditor Opened 01/01/2020 Balance $100.00 Past Due $20.00 Payment $120.00']);
  check.equal(balanced.evaluation.common_errors.performed.find((item) => item.check_id === 'COMMON-ERROR-BALANCE-PAYMENT-INCONSISTENCY')?.state,
    'NOT_DETECTED', 'benign balance/past-due comparison records an actual completed check');
  check.equal(balanced.findings.some((issue) => issue.check_id === 'COMMON-ERROR-BALANCE-PAYMENT-INCONSISTENCY'), false,
    'a payment above the remaining balance does not become an issue');
  check.equal(checklistFor(balanced.evaluation).find((item) => item.check_id === 'COMMON-ERROR-BALANCE-PAYMENT-INCONSISTENCY').state,
    'PERFORMED', 'the shared checklist reflects the benign comparison');
  const inconsistent = assess(['Fictional Creditor Opened 01/01/2020 Balance $100.00 Past Due $120.00']);
  check.equal(inconsistent.findings.find((issue) => issue.check_id === 'COMMON-ERROR-BALANCE-PAYMENT-INCONSISTENCY')?.classification,
    'PROBABLE_VIOLATION', 'the sourced past-due contradiction remains selectable');
  const noBalance = assess(['Fictional Creditor Opened 01/01/2020 Credit Limit $100.00 Past Due $120.00']);
  check.equal(noBalance.extraction.records[0].facts['account.amount'], undefined,
    'a printed credit limit is never a generic amount owed');
  check.equal(noBalance.extraction.records[0].facts['account.creditLimit'], 100,
    'the independent printed credit limit keeps its own meaning');
  check.equal(noBalance.extraction.records[0].facts['account.pastDueAmount'], 120,
    'the independent printed past-due amount keeps its own meaning');
  check.equal(noBalance.extraction.records[0].facts['account.balance'], undefined,
    'a printed credit limit is not an extracted current balance');
  check.equal(noBalance.findings.some((issue) => issue.check_id === 'COMMON-ERROR-BALANCE-PAYMENT-INCONSISTENCY'), false,
    'a credit limit cannot be substituted as the balance in a past-due allegation');
  check.equal(common.formatCapability(noBalance.extraction).all_factual_checks['COMMON-ERROR-BALANCE-PAYMENT-INCONSISTENCY'].field_ready,
    false, 'balance/past-due capability requires an actual labelled balance');

  const laterDelinquency = assess(['Fictional Creditor Opened 01/01/2020 First Reported 01/01/2020 30 Days Past Due As Of January 2021']);
  check.equal(laterDelinquency.extraction.records[0].facts['reportedAccount.adverseRatingDate'], '2021-01',
    'the later adverse event remains an extracted report fact');
  check.equal(laterDelinquency.evaluation.common_errors.performed.some((item) => item.check_id === 'COMMON-ERROR-POTENTIAL-RE-AGING-SIGNAL'),
    false, 'ordinary later delinquency does not claim re-aging or a completed re-aging comparison');
  check.equal(checklistFor(laterDelinquency.evaluation).find((item) => item.check_id === 'COMMON-ERROR-POTENTIAL-RE-AGING-SIGNAL').state,
    'NOT_PERFORMED', 'the promised checklist item remains with its supported-evidence gap');
  const reAgingCapability = common.formatCapability(laterDelinquency.extraction).all_factual_checks['COMMON-ERROR-POTENTIAL-RE-AGING-SIGNAL'];
  check.equal(reAgingCapability.field_ready, false,
    'ordinary date availability is not advertised as re-aging detectability');
  check.match(reAgingCapability.additional_evidence, /OWNED_EARLIER_SAME_BUREAU_FIXED_OBLIGATION.*FORWARD_ANCHOR_CHANGE/,
    'internal capability names the separate owned report evidence required for the supported mapping');
  return { scope: 'ordinary-report status, precision, paired evidence and benign comparison repairs',
    re_aging_boundary: 'A later adverse event alone establishes neither re-aging nor its absence.' };
}

module.exports = { run, id: 'cy-common-error-predicate-repairs', title: 'Common-error predicate and source-reading repairs' };
