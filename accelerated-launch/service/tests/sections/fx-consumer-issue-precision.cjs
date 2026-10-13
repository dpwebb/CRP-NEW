'use strict';
const policy = require('../../consumer-issue-materiality.cjs');
const issues = require('../../issues.cjs');
const { row, put, identity } = require('./fn-au-comparison-fixes.cjs');
const reviews = require('../../au-comparison-concerns.cjs');

async function run(_service, check) {
  for (const kind of ['AU_AMOUNT_CATEGORY_REVIEW', 'AU_TFN_HANDLING', 'CLOSURE_DATE_REVIEW',
    'UNDATED_PAYMENT_HISTORY', 'LINKED_IDENTITY_CONTEXT_REVIEW', 'LIFECYCLE_LINKAGE_CONTEXT_REVIEW',
    'STATUS_HISTORY_CONTEXT_REVIEW', 'ENTRY_AGE_CONTEXT_REVIEW']) {
    check.equal(issues.isEligible({ concern_kind: kind, eligible: true, confidence: 'DEFINITE',
      basis_type: 'REPORT_CONCERN', classification: 'VIOLATION' }), false,
    kind + ': a saved eligibility flag cannot restore a retired default');
  }
  const dateIssue = (report, update) => ({ concern_kind: 'SOURCE_DATE_CHRONOLOGY_REVIEW',
    evidence: { report_date_alternatives: report, update_date_alternatives: update } });
  check.equal(policy.supportsConsumerIssue(dateIssue(['2026-01-10', '2026-10-01'], ['2026-06-22'])), false,
    'a benign date interpretation defeats the chronology concern');
  check.equal(policy.supportsConsumerIssue(dateIssue(['2026-01-10', '2026-10-01'], ['2026-11-22'])), true,
    'all conflicting readings preserve the date discrepancy');
  check.equal(policy.supportsConsumerIssue(dateIssue(['2026-99-99'], ['2027-01-01'])), false,
    'invalid calendar dates cannot manufacture a conflict');
  check.equal(policy.supportsConsumerIssue({ concern_kind: 'CA_HISTORY_DATE_REVIEW',
    evidence: { reporting_cadence_unverified: true, outside_dates: [] } }), false,
    'payment frequency and report counts alone are not a discrepancy');
  check.equal(policy.supportsConsumerIssue({ concern_kind: 'CA_HISTORY_DATE_REVIEW',
    evidence: { outside_dates: ['2024-06-01'] } }), true,
    'own dated events outside the printed window remain actionable');

  const account = identity(row(1), 'FICTIONAL BANK');
  account.source_bureau = account.bureau = 'Equifax';
  account.source_country = 'CA';
  put(account, 'account.status', 'OPEN', 'OPEN');
  put(account, 'account.balance', 'CAD100', 100);
  put(account, 'tradeline.lastPaymentDate', '12 June2023', '2023-06-12');
  const loc = account.location;
  put(account, 'account.datedPaymentAmounts', '2026-04 CAD25',
    [{ period: '2026-04', amount: 25, trusted: true, location: loc, period_location: loc }]);
  const extraction = { support: 'ACTUAL_REPORT_EVIDENCE', source_file_id: 'own-file', bureau: 'Equifax', records: [account] };
  const evaluation = { country: 'CA', region: 'CA-NS', assessment_clock: { assessment_date: '2026-10-13' } };
  check.equal(reviews.concernsFor(extraction, evaluation).filter(i => i.concern_kind === 'CA_HISTORY_DATE_REVIEW').length, 0,
    'ordinary payment columns cannot be treated as a receipt ledger');
  account.fact_sources['account.datedPaymentAmounts'].source_field = 'Actual payments received';
  const legitimate = reviews.concernsFor(extraction, evaluation).find(i => i.concern_kind === 'CA_HISTORY_DATE_REVIEW');
  check.ok(legitimate && issues.isEligible(legitimate), 'explicit actual receipts retain the real date mismatch');
  const forged = JSON.parse(JSON.stringify(legitimate));
  forged.source_facts.find(s => /Actual payments/.test(s.source_field)).source_field = 'Scheduled payments';
  check.equal(issues.isEligible(forged), false, 'scheduled payments cannot inherit an actual-receipt finding');
}

module.exports = { id: 'fx-consumer-issue-precision', title: 'Consumer issue materiality, saved-result exclusion and meaningful positive controls', run };
