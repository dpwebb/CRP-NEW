'use strict';

// One product checklist for every selected jurisdiction. Inclusion is not a claim that a check ran.
// Report-dependent checks run only when their required printed facts are available.
const CHECKS = Object.freeze([
  ['COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY', 'Account opened after it was closed'],
  ['COMMON-ERROR-STATUS-DATE-CONTRADICTION', 'Account shown as open with a closing date'],
  ['COMMON-ERROR-BALANCE-PAYMENT-INCONSISTENCY', 'Balances, overdue amounts or payments that do not match'],
  ['COMMON-ERROR-REVOLVING-BALANCE-ZERO-LIMIT', 'Balance on a credit card or line of credit with a credit limit of $0'],
  ['COMMON-ERROR-PAYMENT-HISTORY-INCONSISTENCY', 'Payment history that does not match other account details'],
  ['COMMON-ERROR-RESPONSIBILITY-INCONSISTENCY', 'Conflicting details about who is responsible for an account'],
  ['COMMON-ERROR-DUPLICATE-REPORTING', 'Duplicate account and collection entries'],
  ['COMMON-ERROR-SIMILAR-ENTRIES-WORTH-REVIEWING', 'Similar accounts to review'],
  ['COMMON-ERROR-REPORTED-DATES-OUT-OF-ORDER', 'Account first reported before it was opened'],
  ['COMMON-ERROR-ENTRY-REPORTED-AFTER-REPORT-DATE', 'Account reported after the report date'],
  ['COMMON-ERROR-POTENTIAL-RE-AGING-SIGNAL', 'First missed-payment date moved to a later date'],
  ['COMMON-ERROR-IDENTITY-REVIEW', 'Names, addresses and personal details to review'],
  ['COMMON-ERROR-ADVERSE-ENTRY-WITHOUT-A-DELINQUENCY-ANCHOR', 'Bad debt or collection without a first missed-payment date'],
  ['COMMON-ERROR-WRITE-OFF-WITHOUT-A-CHARGE-OFF-DATE', 'Write-off date missing for a debt marked as a loss'],
  ['COMMON-ERROR-CLOSURE-STATED-WITHOUT-A-CLOSED-DATE', 'Account marked closed or cancelled without a closing date'],
  ['COMMON-ERROR-REQUIRED-REPORT-DATA-VISIBLY-MISSING', 'Required report details left blank'],
  ['COMMON-ERROR-PAID-SETTLED-SHOWN-UNPAID', 'Paid or settled account still shown as unpaid'],
  ['COMMON-ERROR-LAST-PAYMENT-OR-FIRST-DELINQUENCY-DATE', 'Last-payment or first missed-payment date errors'],
  ['COMMON-ERROR-COLLECTION-ORIGINAL-BOTH-DUE', 'Original debt and its collection both showing money owed'],
  ['COMMON-ERROR-REPORTING-PERIOD-EXCEEDED', 'Entry appears after its applicable credit-reporting period'],
  ['COMMON-ERROR-ADDRESS-GEOGRAPHIC-INCONSISTENCY', 'Address locality and state or province do not match',
    'Uses supported location mappings. An unchecked address is not proof of accuracy.', 'VIOLATION_ASSESSMENT'],
  ['COMMON-ERROR-PAID-CLAIM-STATUS-REVIEW', 'Claim that a debt was paid while an amount is still shown owing',
    'Review the payment claim and the current status or balance; a claim is not verified payment.', 'NON_VIOLATION_REVIEW'],
  ['COMMON-ERROR-CLOSURE-DATE-DISCLOSURE-REVIEW', 'Closed account whose table gives no closing date',
    'Confirm the closing date without assuming a reporting deadline was missed.', 'NON_VIOLATION_REVIEW'],
  ['COMMON-ERROR-UNDATED-HISTORY-DISCLOSURE-REVIEW', 'Payment-history codes shown without month or year labels',
    'Ask for the periods and clear code explanations; do not guess what the codes mean.', 'NON_VIOLATION_REVIEW'],
  ['COMMON-ERROR-IDENTIFIER-HANDLING-REVIEW', 'Sensitive identifier information whose permitted handling needs review',
    'Uses a supported country-specific identifier requirement; presence alone is not unlawful handling.', 'NON_VIOLATION_REVIEW'],
  ['COMMON-ERROR-CREDIT-DATA-CATEGORY-REVIEW', 'Reported money amounts whose permitted credit-data category needs review',
    'Uses supported country-specific credit-data categories; similar amounts can have different permitted meanings.', 'NON_VIOLATION_REVIEW'],
  ['LIMITATION-PERIOD-COURT-CLAIM', 'Court deadlines and credit-report time limits',
    'A debt may stay on your report after the deadline to sue has passed. These are two separate time limits.']
].map(([check_id, label, description, action_type]) => Object.freeze({ check_id, label,
  ...(description ? { description } : {}), ...(action_type ? { action_type } : {}) })));

// Owner's unpaid-preview order. These describe supported reporting breaches, not court-deadline information
// or review observations. A category does not establish a breach or make an issue packet-eligible.
const PREVIEW_ORDER = Object.freeze([
  'REPORTING_TIME_LIMIT', 'DUPLICATE_REPORTING', 'DATE_CONFLICT', 'PAYMENT_HISTORY_CONFLICT',
  'STATUS_AMOUNT_CONFLICT', 'MISSING_DATE', 'RESPONSIBILITY_IDENTITY', 'RE_AGING'
]);
const PREVIEW_CATEGORY_BY_CHECK = Object.freeze(Object.fromEntries([
  ['REPORTING_TIME_LIMIT', ['REPORTING-PERIOD-EXCEEDED']],
  ['DUPLICATE_REPORTING', ['DUPLICATE-REPORTING', 'COLLECTION-ORIGINAL-BOTH-DUE']],
  ['DATE_CONFLICT', ['ACCOUNT-DATES-CONTRADICTORY', 'REPORTED-DATES-OUT-OF-ORDER',
    'ENTRY-REPORTED-AFTER-REPORT-DATE', 'LAST-PAYMENT-OR-FIRST-DELINQUENCY-DATE']],
  ['PAYMENT_HISTORY_CONFLICT', ['PAYMENT-HISTORY-INCONSISTENCY']],
  ['STATUS_AMOUNT_CONFLICT', ['STATUS-DATE-CONTRADICTION', 'BALANCE-PAYMENT-INCONSISTENCY',
    'REVOLVING-BALANCE-ZERO-LIMIT', 'PAID-SETTLED-SHOWN-UNPAID']],
  ['MISSING_DATE', ['ADVERSE-ENTRY-WITHOUT-A-DELINQUENCY-ANCHOR', 'WRITE-OFF-WITHOUT-A-CHARGE-OFF-DATE',
    'CLOSURE-STATED-WITHOUT-A-CLOSED-DATE', 'REQUIRED-REPORT-DATA-VISIBLY-MISSING']],
  ['RESPONSIBILITY_IDENTITY', ['RESPONSIBILITY-INCONSISTENCY', 'ADDRESS-GEOGRAPHIC-INCONSISTENCY']],
  ['RE_AGING', ['POTENTIAL-RE-AGING-SIGNAL']]
].flatMap(([category, checks]) => checks.map(check => ['COMMON-ERROR-' + check, category]))));

function checklistFor(evaluation, extraction) {
  const common = evaluation && evaluation.common_errors && evaluation.common_errors.performed || [];
  const reviews = evaluation?.report_concerns || (extraction
    ? require('./report-concerns.cjs').measure(extraction, evaluation) : null);
  const byId = new Map([...common, ...(reviews?.performed || [])].map((item) => [item.check_id, item]));
  const limitation = evaluation && evaluation.limitation_assessment || null;
  return CHECKS.map((item) => {
    if (item.check_id === 'COMMON-ERROR-REQUIRED-REPORT-DATA-VISIBLY-MISSING') {
      const components = [
        'COMMON-ERROR-ADVERSE-ENTRY-WITHOUT-A-DELINQUENCY-ANCHOR',
        'COMMON-ERROR-WRITE-OFF-WITHOUT-A-CHARGE-OFF-DATE',
        'COMMON-ERROR-CLOSURE-STATED-WITHOUT-A-CLOSED-DATE'
      ];
      return { ...item, state: components.some((id) => byId.has(id)) ? 'PERFORMED' : 'NOT_PERFORMED',
        components: Object.fromEntries(components.map((id) => [id, byId.has(id)])) };
    }
    if (item.check_id === 'LIMITATION-PERIOD-COURT-CLAIM') {
      const courtClaim = Boolean(limitation && limitation.performed && limitation.performed.length);
      const reportingPeriod = Boolean(evaluation && evaluation.retention_dual_date
        && evaluation.retention_dual_date.performed && evaluation.retention_dual_date.performed.length);
      return { ...item, state: courtClaim && reportingPeriod ? 'PERFORMED'
        : courtClaim || reportingPeriod ? 'PARTIALLY_PERFORMED' : 'NOT_PERFORMED',
      components: { court_claim: courtClaim, reporting_period: reportingPeriod } };
    }
    if (item.check_id === 'COMMON-ERROR-REPORTING-PERIOD-EXCEEDED') {
      const performed = Boolean(evaluation && ((evaluation.retention_dual_date
        && evaluation.retention_dual_date.performed && evaluation.retention_dual_date.performed.length)
        || evaluation.published_reporting_periods?.length));
      return { ...item, state: performed ? 'PERFORMED' : 'NOT_PERFORMED' };
    }
    const performed = byId.has(item.check_id);
    return { ...item, state: performed ? 'PERFORMED' : 'NOT_PERFORMED' };
  });
}

module.exports = { CHECKS, checklistFor, PREVIEW_ORDER, PREVIEW_CATEGORY_BY_CHECK };
