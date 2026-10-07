'use strict';

// One product checklist for every selected jurisdiction. Inclusion is not a claim that a check ran.
// Report-dependent checks run only when their required printed facts are available.
const CHECKS = Object.freeze([
  ['COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY', 'Account opened after it was closed'],
  ['COMMON-ERROR-STATUS-DATE-CONTRADICTION', 'Open status with a closed date'],
  ['COMMON-ERROR-BALANCE-PAYMENT-INCONSISTENCY', 'Balance, past-due or payment inconsistency'],
  ['COMMON-ERROR-REVOLVING-BALANCE-ZERO-LIMIT', 'Revolving balance with an explicit zero credit limit'],
  ['COMMON-ERROR-PAYMENT-HISTORY-INCONSISTENCY', 'Payment-history inconsistency'],
  ['COMMON-ERROR-RESPONSIBILITY-INCONSISTENCY', 'Account-responsibility inconsistency'],
  ['COMMON-ERROR-DUPLICATE-REPORTING', 'Potential duplicate reporting'],
  ['COMMON-ERROR-SIMILAR-ENTRIES-WORTH-REVIEWING', 'Similar entries worth reviewing'],
  ['COMMON-ERROR-REPORTED-DATES-OUT-OF-ORDER', 'Opened date after first-reported date'],
  ['COMMON-ERROR-POTENTIAL-RE-AGING-SIGNAL', 'Re-aging: original delinquency date moved forward'],
  ['COMMON-ERROR-IDENTITY-REVIEW', 'Identity fields worth reviewing'],
  ['COMMON-ERROR-ADVERSE-ENTRY-WITHOUT-A-DELINQUENCY-ANCHOR', 'Adverse entry without a delinquency anchor'],
  ['COMMON-ERROR-WRITE-OFF-WITHOUT-A-CHARGE-OFF-DATE', 'Write-off without a charge-off date'],
  ['COMMON-ERROR-CLOSURE-STATED-WITHOUT-A-CLOSED-DATE', 'Closure or cancellation without a closed date'],
  ['COMMON-ERROR-REQUIRED-REPORT-DATA-VISIBLY-MISSING', 'Required report data visibly missing'],
  ['COMMON-ERROR-PAID-SETTLED-SHOWN-UNPAID', 'Paid or settled account still shown as unpaid'],
  ['COMMON-ERROR-LAST-PAYMENT-OR-FIRST-DELINQUENCY-DATE', 'Incorrect last-payment or first-delinquency date'],
  ['COMMON-ERROR-COLLECTION-ORIGINAL-BOTH-DUE', 'Collection and original account both showing amounts due'],
  ['LIMITATION-PERIOD-COURT-CLAIM', 'SOL: court-claim and applicable reporting-period limits for tradelines and collections']
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
