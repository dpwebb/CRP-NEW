'use strict';

// Owner-authorized precision correction. Keep historical descriptors intact, but
// do not turn normal fields or unresolved interpretation into selectable issues.
const RETIRED_DEFAULTS = new Set([
  'AU_AMOUNT_CATEGORY_REVIEW', 'AU_TFN_HANDLING', 'CLOSURE_DATE_REVIEW',
  'UNDATED_PAYMENT_HISTORY', 'LINKED_IDENTITY_CONTEXT_REVIEW',
  'LIFECYCLE_LINKAGE_CONTEXT_REVIEW', 'STATUS_HISTORY_CONTEXT_REVIEW',
  'ENTRY_AGE_CONTEXT_REVIEW'
]);

function everyReadingConflicts(earlier, later) {
  const valid = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  return Array.isArray(earlier) && earlier.length > 0 && Array.isArray(later) && later.length > 0 &&
    earlier.every(valid) && later.every(valid) && earlier.every(a => later.every(b => a < b));
}

function supportsConsumerIssue(issue) {
  if (!issue || RETIRED_DEFAULTS.has(issue.concern_kind)) return false;
  if (issue.concern_kind === 'SOURCE_DATE_CHRONOLOGY_REVIEW') {
    return everyReadingConflicts(issue.evidence?.report_date_alternatives,
      issue.evidence?.update_date_alternatives);
  }
  if (issue.concern_kind === 'CREATOR_DATE_SEQUENCE_REVIEW') {
    return everyReadingConflicts(issue.evidence?.closed_alternatives || [issue.evidence?.closed],
      issue.evidence?.opened_alternatives);
  }
  if (issue.concern_kind === 'CA_HISTORY_DATE_REVIEW') {
    const evidence = issue.evidence || {};
    return Boolean(evidence.outside_dates?.length ||
      evidence.actual_payment_semantics_confirmed === true && evidence.periods?.length &&
      issue.source_facts?.some(source => source.trusted === true &&
        /\b(?:actual payments?|payments? received)\b/i.test(source.source_field || '')));
  }
  if (['CREATOR_SUMMARY_AMOUNT_REVIEW', 'CREATOR_SUMMARY_COUNT_REVIEW'].includes(issue.concern_kind)) {
    return issue.evidence?.comparable_scope_confirmed === true;
  }
  return true;
}

module.exports = { supportsConsumerIssue };
