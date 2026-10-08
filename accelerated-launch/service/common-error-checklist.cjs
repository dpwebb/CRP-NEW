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
  ['COMMON-ERROR-DUPLICATE-REPORTING', 'Possible duplicate accounts'],
  ['COMMON-ERROR-SIMILAR-ENTRIES-WORTH-REVIEWING', 'Similar accounts to review'],
  ['COMMON-ERROR-REPORTED-DATES-OUT-OF-ORDER', 'Account first reported before it was opened'],
  ['COMMON-ERROR-POTENTIAL-RE-AGING-SIGNAL', 'First missed-payment date moved to a later date'],
  ['COMMON-ERROR-IDENTITY-REVIEW', 'Names, addresses and personal details to review'],
  ['COMMON-ERROR-ADVERSE-ENTRY-WITHOUT-A-DELINQUENCY-ANCHOR', 'Bad debt or collection without a first missed-payment date'],
  ['COMMON-ERROR-WRITE-OFF-WITHOUT-A-CHARGE-OFF-DATE', 'Write-off date missing for a debt marked as a loss'],
  ['COMMON-ERROR-CLOSURE-STATED-WITHOUT-A-CLOSED-DATE', 'Account marked closed or cancelled without a closing date'],
  ['COMMON-ERROR-REQUIRED-REPORT-DATA-VISIBLY-MISSING', 'Required report details left blank'],
  ['COMMON-ERROR-PAID-SETTLED-SHOWN-UNPAID', 'Paid or settled account still shown as unpaid'],
  ['COMMON-ERROR-LAST-PAYMENT-OR-FIRST-DELINQUENCY-DATE', 'Last-payment or first missed-payment date errors'],
  ['COMMON-ERROR-COLLECTION-ORIGINAL-BOTH-DUE', 'Original debt and its collection both showing money owed'],
  ['LIMITATION-PERIOD-COURT-CLAIM', 'Time limits for court claims and keeping debts on credit reports']
].map(([check_id, label]) => Object.freeze({ check_id, label })));

function checklistFor(evaluation) {
  const common = evaluation && evaluation.common_errors && evaluation.common_errors.performed || [];
  const byId = new Map(common.map((item) => [item.check_id, item]));
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
    const performed = byId.has(item.check_id);
    return { ...item, state: performed ? 'PERFORMED' : 'NOT_PERFORMED' };
  });
}

module.exports = { CHECKS, checklistFor };
