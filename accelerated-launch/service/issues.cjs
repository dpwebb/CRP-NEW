'use strict';
/**
 * issues.cjs — the unified, source-linked, selectable issue descriptor.
 *
 * OWNER-POTENTIAL-ISSUE-001 / Batch 1. One issue representation spans every confidence class a consumer may
 * see and choose to pursue:
 *   - DEFINITE   (existing VIOLATION findings)          -> correction request where packet-enabled
 *   - PROBABLE   (existing PROBABLE_VIOLATION findings)  -> verification request
 *   - POTENTIAL  (supported factual discrepancies)       -> verification request
 *
 * Definite and probable findings keep their existing guarded meanings. A common-error issue may additionally
 * carry a separately evaluated PROBABLE_VIOLATION basis when an admitted jurisdictional accuracy duty and
 * two source-linked contradictory readings support that qualified concern. A sourced blank-caption concern
 * may be POTENTIAL_VIOLATION. The factual verification path remains available without either legal basis.
 */

const crypto = require('node:crypto');
const { factSourcesForRecord } = require('./formats.cjs');
const commonErrorRuleAssessment = require('./common-error-rule-assessment.cjs');
const { sourceForField, reportReference } = require('./report-fact-sources.cjs');

const CONFIDENCE = Object.freeze({ DEFINITE: 'DEFINITE', PROBABLE: 'PROBABLE', POTENTIAL: 'POTENTIAL' });
const BASIS_TYPE = Object.freeze({ STATUTORY_RETENTION: 'STATUTORY_RETENTION', CONTENT_FINDING: 'CONTENT_FINDING', FACTUAL_CONSISTENCY: 'FACTUAL_CONSISTENCY', LIMITATION_ASSESSMENT: 'LIMITATION_ASSESSMENT' });
const { activeAdapter, activeRuleRef } = require('./common-error-scope.cjs');
const CHECKLIST_IDS = new Set(require('./common-error-checklist.cjs').CHECKS.map((check) => check.check_id));
const BREACH_CLASSES = new Set(['VIOLATION', 'PROBABLE_VIOLATION', 'POTENTIAL_VIOLATION']);
const REQUEST_TYPE = Object.freeze({ CORRECTION: 'CORRECTION', VERIFICATION: 'VERIFICATION' });

/**
 * Compatibility export retained for older callers and assertions. The consumerLabel and consumerText helpers
 * implement the latest owner terminology; uncertainty always describes the specific report facts.
 */
const PROBABLE_LEAD = 'Review the report details below before deciding whether to dispute this entry.';

/**
 * OWNER Batch 33 correction (consumer field names): the card, the review step, the assessment download and the
 * packet show what the report ITSELF calls a field. The internal fact name is never shown to a consumer, and a
 * field this build has no consumer name for falls back to a plain description rather than leaking the identifier.
 */
const CONSUMER_FIELD_LABELS = Object.freeze({
  'tradeline.lastPaymentDate': 'Last payment date',
  'tradeline.firstDelinquencyDate': 'First delinquency date',
  'tradeline.chargeOffDate': 'Charge-off date',
  'tradeline.openedDate': 'Opened date',
  'collection.delinquencyDate': 'Date of first delinquency on the collection entry',
  'collection.assignedDate': 'Date the account was assigned',
  'overdue.originalListingDate': 'Original listing date',
  'reportedAccount.adverseRatingDate': 'Month of the adverse payment rating',
  'reportedAccount.openedDate': 'Opened date',
  'reportedAccount.closedDate': 'Closed date',
  'liability.openedDate': 'Opened date',
  'liability.closedDate': 'Closed date',
  'publicRecord.judgmentEntryDate': 'Judgment entry date',
  'publicRecord.taxLienPaidDate': 'Date the tax lien was paid',
  'publicRecord.bankruptcyOrderForReliefDate': 'Order for relief date',
  'bankruptcy.dischargeDate': 'Discharge date'
});

/** The consumer-facing name of a printed field. Never the internal identifier. */
function consumerFieldLabel(field) {
  if (!field) return 'the printed event date';
  return CONSUMER_FIELD_LABELS[String(field)] || 'the printed event date';
}

/** The source-linked provenance of one printed fact, as the consumer surface shows it. Never fabricated. */
function sourceFactFor(entry, label, record) {
  /* The adapter's own attachment first (the anchor's source as the evaluation handed it over); otherwise the
     record's OWN printed source for the same fact. Either way the value comes from the reader, and a page or line
     is carried only when the reader recorded one. */
  let source = entry && entry.anchor_source ? entry.anchor_source : null;
  if (!source && record && record.fact_sources && entry && entry.anchor_field) {
    source = record.fact_sources[entry.anchor_field] || null;
  }
  if (!source) return [];
  const location = source.location || null;
  return [{
    field: entry && entry.anchor_field || null,
    source_field: label,
    raw_value: source.raw_value === undefined ? null : source.raw_value,
    normalized_value: source.normalized_value || (entry && entry.anchor_iso) || null,
    location
  }];
}

/** The common-error checks whose positives become selectable POTENTIAL issues (Batch 1 + ordinary-account batch). */
const POTENTIAL_ISSUE_CHECK_IDS = Object.freeze([
  'COMMON-ERROR-POTENTIAL-RE-AGING-SIGNAL',
  'COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY',
  'COMMON-ERROR-REPORTED-DATES-OUT-OF-ORDER',
  'COMMON-ERROR-STATUS-DATE-CONTRADICTION',
  'COMMON-ERROR-PAYMENT-HISTORY-INCONSISTENCY',
  'COMMON-ERROR-BALANCE-PAYMENT-INCONSISTENCY',
  'COMMON-ERROR-REVOLVING-BALANCE-ZERO-LIMIT',
  'COMMON-ERROR-DUPLICATE-REPORTING',
  'COMMON-ERROR-RESPONSIBILITY-INCONSISTENCY',
  'COMMON-ERROR-PAID-SETTLED-SHOWN-UNPAID',
  'COMMON-ERROR-LAST-PAYMENT-OR-FIRST-DELINQUENCY-DATE',
  'COMMON-ERROR-COLLECTION-ORIGINAL-BOTH-DUE',
  /* BLOCKER-REPORT-DATA-TO-ISSUE-001 (real-report repair): three completeness checks over an entry's own printed
     material and the meanings the report itself prints for its codes. Each is a POTENTIAL verification item. */
  'COMMON-ERROR-ADVERSE-ENTRY-WITHOUT-A-DELINQUENCY-ANCHOR',
  'COMMON-ERROR-WRITE-OFF-WITHOUT-A-CHARGE-OFF-DATE',
  'COMMON-ERROR-CLOSURE-STATED-WITHOUT-A-CLOSED-DATE'
]);
const POTENTIAL_ISSUE_CHECK_ID_SET = new Set(POTENTIAL_ISSUE_CHECK_IDS);

/** The three factual COMPLETENESS checks: an event the report prints whose own caption carries no date. Their
 *  public issue is marked `missing_detail` so the teaser can rank and title them as an addition, without any
 *  internal check id ever reaching the consumer. */
const COMPLETENESS_CHECK_IDS = new Set([
  'COMMON-ERROR-ADVERSE-ENTRY-WITHOUT-A-DELINQUENCY-ANCHOR',
  'COMMON-ERROR-WRITE-OFF-WITHOUT-A-CHARGE-OFF-DATE',
  'COMMON-ERROR-CLOSURE-STATED-WITHOUT-A-CLOSED-DATE'
]);

/** Per-check source-record filter: a signal whose benign explanation defeats the discrepancy is NOT promoted.
 *  A payment exceeding the current balance can be legitimate (payment type/timing/snapshot), so only the
 *  past-due-exceeds-balance contradiction becomes a selectable issue. */
const POTENTIAL_REASON_FILTER = Object.freeze({
  'COMMON-ERROR-BALANCE-PAYMENT-INCONSISTENCY': (sr) => sr.reason === 'PAST_DUE_EXCEEDS_BALANCE',
  /* The three completeness checks below promote ONLY the fact they measured. A source record that reached the
     check for a different reason is never offered to the consumer as this issue. */
  'COMMON-ERROR-ADVERSE-ENTRY-WITHOUT-A-DELINQUENCY-ANCHOR': (sr) => sr.reason === 'ADVERSE_ENTRY_WITHOUT_A_USABLE_DELINQUENCY_DATE',
  'COMMON-ERROR-WRITE-OFF-WITHOUT-A-CHARGE-OFF-DATE': (sr) => sr.reason === 'WRITE_OFF_PRINTED_WITHOUT_A_CHARGE_OFF_DATE',
  'COMMON-ERROR-CLOSURE-STATED-WITHOUT-A-CLOSED-DATE': (sr) => sr.reason === 'CLOSURE_PRINTED_WITHOUT_A_CLOSED_DATE'
});

function issueId(seed) {
  return crypto.createHash('sha256').update(seed, 'utf8').digest('hex').slice(0, 16);
}

function recordFor(extraction, recordIndex) {
  const records = extraction && Array.isArray(extraction.records) ? extraction.records : [];
  return records.find((r) => r.record_index === recordIndex) || null;
}

function recordLabel(issue) {
  const kind = issue.record && issue.record.kind_label ? issue.record.kind_label : 'a record';
  return issue.record_index != null ? `${kind} ${issue.record_index}` : 'your report';
}

/**
 * How one entry is named to the CONSUMER in an explanation: the reader's own plain kind, never an internal record
 * id or its index number ("tradeline 3"). The account itself is identified separately on the issue by the printed
 * creditor name it came from (`account_identity`), which is what the report uses and what the consumer recognises.
 */
function entryLabel(issue) {
  const kind = issue.record && issue.record.kind_label ? String(issue.record.kind_label) : '';
  if (kind === 'tradeline') return 'an account on your report';
  return kind ? `the ${kind} on your report` : 'an entry on your report';
}

/** The report/source identity a detector read its facts from (never fabricated). Falls back from the
 *  multi-file-assembly fields to the record's own bureau/reference date. */
function reportIdentityFor(record) {
  if (!record) return null;
  const reference = Object.hasOwn(record, 'report_reference_date')
    ? reportReference(record)?.normalized_value || null : record.source_report_reference_date || null;
  return {
    bureau: record.source_bureau || record.bureau || null,
    reference_date: reference,
    file_id: record.source_file_id || null
  };
}

/** The relevant fact fields whose printed source the packet states (raw + normalized + location). */
const EVIDENCE_FACT_FIELDS = Object.freeze({
  'COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY': ['liability.openedDate', 'liability.closedDate'],
  'COMMON-ERROR-REPORTED-DATES-OUT-OF-ORDER': ['reportedAccount.dateOpened', 'reportedAccount.firstReported'],
  'COMMON-ERROR-STATUS-DATE-CONTRADICTION': ['account.status', 'liability.closedDate'],
  'COMMON-ERROR-PAYMENT-HISTORY-INCONSISTENCY': [],
  'COMMON-ERROR-BALANCE-PAYMENT-INCONSISTENCY': ['account.balance', 'account.amount', 'account.pastDueAmount'],
  'COMMON-ERROR-REVOLVING-BALANCE-ZERO-LIMIT': ['account.type', 'account.balance', 'account.creditLimit'],
  'COMMON-ERROR-DUPLICATE-REPORTING': ['account.masked_identifier', 'account.reported_identity', 'account.amount', 'liability.openedDate', 'liability.closedDate'],
  'COMMON-ERROR-RESPONSIBILITY-INCONSISTENCY': ['account.masked_identifier', 'account.reported_identity', 'account.responsibility', 'account.amount'],
  'COMMON-ERROR-PAID-SETTLED-SHOWN-UNPAID': ['account.status', 'account.pastDueAmount', 'account.balance'],
  'COMMON-ERROR-LAST-PAYMENT-OR-FIRST-DELINQUENCY-DATE': ['liability.openedDate', 'tradeline.lastPaymentDate', 'tradeline.firstDelinquencyDate'],
  'COMMON-ERROR-COLLECTION-ORIGINAL-BOTH-DUE': ['account.masked_identifier', 'account.reported_identity', 'account.balance', 'account.amount']
});

/** Per-field source-linked provenance for a record's relevant facts, raw reading kept beside normalized.
 *  Amount facts store their printed raw string under `<field>Raw`, so it is used when the printed map's own
 *  entry carries no normalized value. */
function sourceFactsFor(record, fields) {
  if (!record || !Array.isArray(fields) || !fields.length) return [];
  const sources = factSourcesForRecord(record);
  const facts = record.facts || {};
  const out = [];
  for (const f of fields) {
    const src = sources[f];
    if (!src) continue;
    /* A field whose printed raw reading is kept under `<field>Raw` (the amount facts) uses THAT reading first,
       so a compared amount states the number the report printed rather than any record-level fallback. */
    const raw = facts[f + 'Raw'] != null ? facts[f + 'Raw'] : (src.raw_value != null ? src.raw_value : null);
    out.push({
      field: f,
      source_field: src.source_field || null,
      raw_value: raw,
      normalized_value: src.normalized_value != null ? src.normalized_value : null,
      ...(src.privacy_redacted ? { privacy_redacted: true } : {}),
      location: src.location || null
    });
  }
  return out;
}

/**
 * The credited ACCOUNT's printed identity for one issue, with the SAME source-linked provenance the other facts
 * carry (raw reading, page/line). A record that prints no account name supplies none and every presentation
 * surface renders nothing for it; no name is inferred from a neighbouring field and none is invented.
 */
function accountIdentityFor(record) {
  if (!record || !record.facts || !record.facts['account.reported_identity']) return null;
  const name = record.facts['account.reported_identity'];
  const src = factSourcesForRecord(record)['account.reported_identity'] || {};
  return {
    name: src.privacy_redacted ? `Account entry ${record.record_index}` : name,
    source_field: src.source_field || null,
    raw_value: src.privacy_redacted ? null : src.raw_value != null ? src.raw_value : name,
    location: src.location || null
  };
}

/** The record's kind plus whatever printed identity it carries, so the consumer sees WHICH account an issue is about. */
function recordRefFor(record) {
  if (!record) return null;
  return {
    kind_label: record.kind_label || null,
    source_field: record.source_field || null,
    account_name: (accountIdentityFor(record) || {}).name || null
  };
}

/**
 * The decisive report-content facts of a content finding (its required_facts), in the same shape as
 * `sourceFactsFor`, so the packet states the printed content, its role and its own source location. */
function contentFindingFacts(requiredFacts) {
  return (requiredFacts || []).map((f) => ({
    field: f.field,
    source_field: f.source && f.source.source_field || f.role || f.field,
    raw_value: f.source ? f.source.raw_value : null,
    normalized_value: f.source ? f.source.normalized_value : null,
    location: f.source ? f.source.location : null
  }));
}

/** Recorded issue-specific request wording (recorded before enabling each path — never blanket). */
const POTENTIAL_WORDING = Object.freeze({
  'COMMON-ERROR-POTENTIAL-RE-AGING-SIGNAL': {
    explain: (i) => `The same account lists ${i.evidence.earlier_anchor} as the first missed-payment date in the earlier report dated ${i.evidence.earlier_report_date}. The current report lists ${i.evidence.current_anchor} for that date and is dated ${i.evidence.current_report_date}. The date has moved forward.`,
    uncertainty: 'The later report may have corrected the old date or show a new period of missed payments. Ask the bureau to check the account history.',
    request: 'please check the first missed-payment date against the account history and correct it if wrong. Please make sure a wrong date has not restarted how long this debt can stay on my report'
  },
  'COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY': {
    explain: (i) => `This report prints ${recordLabel(i)} with an opened date later than its closed date (${(i.evidence || {}).opened} after ${(i.evidence || {}).closed}).`,
    uncertainty: 'The dates conflict. The report does not show which date needs correction, and a later correction may explain the difference.',
    request: 'please verify the opened and closed dates for this account and correct the inconsistency'
  },
  'COMMON-ERROR-STATUS-DATE-CONTRADICTION': {
    explain: (i) => `This report prints ${recordLabel(i)} whose status says it is open while the same record prints a closure date (${(i.evidence || {}).closed}).`,
    uncertainty: 'The open status and closure date conflict. The report does not show which field needs correction.',
    request: 'please verify the status and the closure date for this account and correct the inconsistency'
  },
  'COMMON-ERROR-PAYMENT-HISTORY-INCONSISTENCY': {
    explain: (i) => {
      const e = i.evidence || {};
      const readings = e.first_code != null && e.second_code != null && e.first_meaning && e.second_meaning
        ? `: "${e.first_code}" (${e.first_meaning}) and "${e.second_code}" (${e.second_meaning})` : '';
      if ((i.source_facts || []).some((fact) => fact.period_definition)) {
        return `Using the account's printed period-to date and Experian's published history order, ${recordLabel(i)} has two conflicting payment-history cells for ${e.period}${readings}.`;
      }
      return `This report prints ${recordLabel(i)} with the same payment-history period (${e.period}) twice with two different cells${readings}.`;
    },
    uncertainty: 'The same period has two different meanings. The report does not show which cell needs correction; a printing duplication may explain the conflict.',
    request: 'please verify the payment-history cells for this period and correct the inconsistency'
  },
  'COMMON-ERROR-BALANCE-PAYMENT-INCONSISTENCY': {
    explain: (i) => `This report prints ${recordLabel(i)} with a past-due amount (${(i.evidence || {}).past_due}) larger than its balance (${(i.evidence || {}).balance}).`,
    uncertainty: 'The past-due amount exceeds the current balance. The report does not show which amount needs correction; a reporting or rounding error may explain it.',
    request: 'please verify the balance and the past-due amount for this account and correct the inconsistency'
  },
  'COMMON-ERROR-DUPLICATE-REPORTING': {
    explain: (i) => (i.evidence || {}).pairing_basis?.startsWith('COLLECTION_')
      ? `These two collection entries (${recordLabel(i)} and collection entry ${(i.evidence || {}).duplicate_of_record}) have matching account references. The same debt may be listed twice. The amounts printed on each entry are shown below.`
      : `The two entries (${recordLabel(i)} and account ${(i.evidence || {}).duplicate_of_record}) have matching account details. They may list the same account twice.`,
    uncertainty: (i) => (i.evidence || {}).pairing_basis?.startsWith('COLLECTION_')
      ? 'The bureau needs to check whether both entries should be listed. A debt moving between collectors may explain the two entries.'
      : 'Similar entries may come from the original lender and a debt collector, an account transfer, or reports from different dates. Ask the bureau whether these entries list the same account twice.',
    request: (i) => (i.evidence || {}).pairing_basis?.startsWith('COLLECTION_')
      ? 'please remove the duplicate collection entry, confirm the correct balance, and tell me the original creditor and which account this debt came from'
      : 'please verify whether these two entries are the same account reported twice and correct any duplication'
  },
  'COMMON-ERROR-RESPONSIBILITY-INCONSISTENCY': {
    explain: (i) => `The same account (${recordLabel(i)} and account ${(i.evidence || {}).other_record}) has two different labels for who is responsible (${(i.evidence || {}).responsibility} and ${(i.evidence || {}).other_responsibility}) in this report.`,
    uncertainty: 'The labels may describe a joint account, someone allowed to use the account, or a change in who is responsible. Partly hidden account numbers can also look alike. The report does not show which explanation applies.',
    request: 'please verify the responsibility on this account and correct the inconsistency'
  },
  'COMMON-ERROR-REVOLVING-BALANCE-ZERO-LIMIT': {
    explain: (i) => `This report prints ${recordLabel(i)} as ${String((i.evidence || {}).type || 'revolving credit')} with a balance of ${(i.evidence || {}).balance} and an explicit credit limit of zero.`,
    uncertainty: 'The zero limit may mean the account is closed or cannot be used. The bureau should check the balance and limit. The report does not show how a lender used this account when calculating a credit score.',
    request: 'please verify the credit limit and balance for this account and correct either field if inaccurate'
  },
  'COMMON-ERROR-PAID-SETTLED-SHOWN-UNPAID': {
    explain: (i) => i.reason === 'PAID_IN_FULL_WITH_POSITIVE_BALANCE'
      ? `This report describes ${recordLabel(i)} as ${(i.evidence || {}).status || 'paid in full'} but also prints a current balance of ${(i.evidence || {}).balance}.`
      : `This report describes ${recordLabel(i)} as ${(i.evidence || {}).status || 'paid or settled'} but also prints ${(i.evidence || {}).past_due} past due.`,
    uncertainty: 'The report does not establish which printed value is current. Verify the payment or settlement and the amount due.',
    request: (i) => i.reason === 'PAID_IN_FULL_WITH_POSITIVE_BALANCE'
      ? 'please verify the paid-in-full status and current balance, and correct any inaccurate value'
      : 'please verify the paid or settled status and past-due amount, and correct any inaccurate value'
  },
  'COMMON-ERROR-LAST-PAYMENT-OR-FIRST-DELINQUENCY-DATE': {
    explain: (i) => `This report lists a ${(i.evidence || {}).field === 'last_payment' ? 'last payment' : 'first missed-payment'} date of ${(i.evidence || {}).value} for ${recordLabel(i)}. It does not agree with another date on this account or report.`,
    uncertainty: 'The report shows a date conflict. It does not establish the correct date without the account history.',
    request: 'please check the last payment date or first missed-payment date against the account history and correct it if wrong'
  },
  'COMMON-ERROR-COLLECTION-ORIGINAL-BOTH-DUE': {
    explain: (i) => `This report prints a collection entry and linked original account with amounts due (${(i.evidence || {}).collection_amount} and ${(i.evidence || {}).original_amount}).`,
    uncertainty: 'Both entries may describe the same debt. Seeing both does not prove that the debt is being collected twice or that the balance is wrong.',
    request: 'please verify how the original account and collection balances relate and correct any duplicate or inaccurate amount'
  },
  /* BLOCKER-REPORT-DATA-TO-ISSUE-001 (real-report repair): three completeness items read from an entry's own
     printed material and the meanings the report itself prints for its codes. Each is a potential issue to
     VERIFY — a completeness question about what the report prints, never a claim that a rule was broken and
     never an invented date. */
  'COMMON-ERROR-ADVERSE-ENTRY-WITHOUT-A-DELINQUENCY-ANCHOR': {
    explain: (i) => {
      const e = i.evidence || {};
      const ratings = e.adverse_payment_ratings || [];
      const codes = (e.collection_or_cancellation_codes || []).map((c) => `${c.code} - ${c.meaning_as_the_report_prints_it}`);
      const months = ratings.length === 1 ? 'one month' : `${ratings.length} months`;
      const what = ratings.length
        ? `a bad-debt payment rating printed for ${months} (most recently ${ratings[0].code} - ${ratings[0].meaning_as_the_report_prints_it})`
        : `a collection or cancellation code (${codes.join('; ')})`;
      return `This report presents ${entryLabel(i)} as a debt in trouble, printing ${what}, while its "First Delinquency Date" caption prints with no date at all. The entry shows no date for when the delinquency began.`;
    },
    uncertainty: 'The report prints the caption and leaves the value empty rather than printing a date, so no delinquency date can be read from this entry. The underlying date may still exist in the file the creditor supplied. This is a completeness question to verify, not an established reporting issue.',
    request: 'please confirm the date this debt first became delinquent and have that date printed on this entry'
  },
  'COMMON-ERROR-WRITE-OFF-WITHOUT-A-CHARGE-OFF-DATE': {
    explain: (i) => {
      const e = i.evidence || {};
      const codes = (e.write_off_codes || []).map((c) => c.literal_statement ? c.meaning_as_the_report_prints_it
        : `${c.period || ''}${c.code ? ` (${c.code}${c.meaning_as_the_report_prints_it ? ` - ${c.meaning_as_the_report_prints_it}` : ''})` : ''}`.trim());
      return `This report prints ${entryLabel(i)} with a write-off (${codes.join('; ')}) while its "Charge Off Date" caption prints with no date at all, so the entry shows no date for the write-off event.`;
    },
    uncertainty: 'The report prints the write-off in the account history and leaves the charge-off caption empty rather than printing a date. This is a completeness question to verify, not an established reporting issue.',
    request: 'please confirm the charge-off date for this account and have that date printed on this entry'
  },
  'COMMON-ERROR-CLOSURE-STATED-WITHOUT-A-CLOSED-DATE': {
    explain: (i) => {
      const e = i.evidence || {};
      const codes = (e.closure_codes || []).map((c) => c.literal_statement ? c.meaning_as_the_report_prints_it
        : `${c.code}${c.meaning_as_the_report_prints_it ? ` - ${c.meaning_as_the_report_prints_it}` : ''}${c.period ? ` (${c.period})` : ''}`);
      const caption = (i.source_facts || []).find((fact) => fact.omitted_value)?.source_field || 'Closed Date';
      return `This report states that ${entryLabel(i)} is closed or cancelled (${codes.join('; ')}) while its "${caption}" caption prints with no date at all, so the entry shows no closure date.`;
    },
    uncertainty: 'The report states the closure and leaves the closed-date caption empty rather than printing a date. The bureau should verify the underlying closure date and whether the report needs correction.',
    request: 'please confirm the date this account was closed and have that date printed on this entry'
  },

  /* BLOCKER-REPORT-DATA-TO-ISSUE-001 (Batch 31): the PAYMENT-HISTORY analyses. Each compares two things the
     same account prints; each is a potential issue to verify and none asserts a rule was broken. */
  'PH-RATING-CONTRADICTS-NARRATIVE-IN-THE-SAME-MONTH': {
    explain: (i) => {
      const e = i.evidence || {};
      return `For ${e.reporting_period || 'one month'}, this report rates ${entryLabel(i)} as "${e.rating_meaning || e.rating_code}" and in the same month prints "${e.narrative_meaning || e.narrative_code}". Those two statements do not agree.`;
    },
    uncertainty: 'Both statements come from the report itself for the same month, and an account can change status inside a month, so both may be partly right. Which one describes this account is not shown, so this is a question to verify rather than a conclusion.',
    request: 'please confirm which of these two statements about this month is correct and have the wrong one corrected'
  },
  'PH-PAYMENT-CONTRADICTS-NO-PAYMENT-NARRATIVE': {
    explain: (i) => {
      const e = i.evidence || {};
      return `For ${e.reporting_period}, this report prints a payment of ${e.payment_raw || e.payment_amount} on ${entryLabel(i)} while the same month's description says "${e.no_payment_meaning || e.no_payment_code}".`;
    },
    uncertainty: 'A payment can be posted and later reversed, and a monthly row may show when a payment was applied rather than received. Please verify which of the two readings for this month is correct.',
    request: 'please verify the payment and no-payment description for this month and correct whichever is wrong'
  },
  'PH-DELINQUENCY-ANCHOR-AFTER-THE-HISTORY-SHOWS-IT': {
    explain: (i) => {
      const e = i.evidence || {};
      const months = (e.months_already_shown_as_late || []).map((m) => m.period).slice(0, 3).join(', ');
      return `This report gives ${e.delinquency_anchor_printed || e.delinquency_anchor_iso} as the first delinquency date for ${entryLabel(i)}, but its own payment history already shows a late month before then (${months}).`;
    },
    uncertainty: 'An unknown rating, a blank cell and an unprinted month are never counted as a missed payment here, so only a printed late month is used. The report does not say whether the printed date is the first delinquency or a later one, so this is a question to verify.',
    request: 'please confirm the first delinquency date for this account and have it corrected if the printed date is wrong'
  },

  /* OWNER dual-date retention (Batch 33): the CURRENT-review side of a reporting period. The entry was inside its
     period when the uploaded report was issued and appears to be outside it now, so the useful next step is to
     check the consumer's CURRENT file — never to call the historical report a violation. */
  'RETENTION-PERIOD-ENDED-SINCE-THE-REPORT': {
    explain: (i) => {
      const r = i.retention_review || {};
      const historical = r.state === 'ALREADY_OUTSIDE_AT_REPORT_AND_ASSESSMENT';
      const period = r.anchor_precision === 'MONTH_LEVEL' && r.period_ends_from
        ? `The period appears to end somewhere between ${r.period_ends_from} and ${r.period_ends_on}, because the date it counts from is printed only to the month.`
        : `The period appears to have ended on ${r.period_ends_on}.`;
      const issued = historical
        ? `Your report was issued on ${r.report_issued}, after that apparent end date.`
        : r.report_issued
        ? `Your uploaded report was issued on ${r.report_issued}, which was before that date, so this entry was still inside its period then.`
        : 'Your uploaded report does not state a date of its own, so the earlier position cannot be established from it.';
      const account = i.account_identity && i.account_identity.name ? `${i.account_identity.name} on your report` : 'this entry on your report';
      return `${account} prints "${r.anchor_label || 'its event date'}" as ${r.anchor_printed_date || r.anchor_iso || 'the printed date'}, and the reporting period that applies to it is ${r.period_years} years. ${period} ${issued} ${historical ? 'This debt information appears to exceed the recorded reporting period. Ask the credit bureau to correct or remove it.' : 'This entry may now be too old to report. An older report shows what was reported at the time; it does not show what is on your file today.'}`;
    },
    uncertainty: (i) => {
      const r = i.retention_review || {};
      const historical = r.state === 'ALREADY_OUTSIDE_AT_REPORT_AND_ASSESSMENT';
      const extra = r.historical_position_not_established
        ? ' The report we have does not state its own date, so whether the entry was already outside its period then cannot be established, and it is not claimed either way.'
        : ' The report we have was issued before the period ended, so it cannot show the position now.';
      /* OWNER Batch 33 correction: when the rule's own exception cannot be resolved from the report, the specific
         unresolved condition is stated in the rule's words — the concern is qualified, not asserted. */
      const exception = r.exception_material_unknown && r.exception_specific_uncertainty
        ? ` One condition this period depends on is not settled by your report: ${r.exception_specific_uncertainty} If it applies to this entry, the entry may still be reported for longer, so ask the credit bureau to check it as part of the same request.`
        : '';
      return historical
        ? `The printed ${r.anchor_label || 'event date'} and the ${r.period_years}-year period support a verification request. The bureau should verify that date and correct or remove the debt information if the recorded period applies.${exception}`
        : `Check whether this entry is still on your current credit file. If it has already been removed, there is nothing to do. If it is still there, the credit bureau can confirm whether its reporting period has expired. This is a question to verify, not a statement that a rule was broken: it is about your file today, not about a fault in the report you uploaded.${extra}${exception}`;
    },
    request: (i) => i.retention_review && i.retention_review.state === 'ALREADY_OUTSIDE_AT_REPORT_AND_ASSESSMENT'
      ? `Please verify the ${i.retention_review.anchor_label || 'event date'} and remove or correct this debt information if it has exceeded the ${i.retention_review.period_years}-year reporting period.`
      : 'Please verify whether this entry remains on my current file and whether its reporting period has expired.'
  }
});

/**
 * OWNER Batch 33: the later-expiry card's own wording, so the qualified concern always delivers its specific
 * uncertainty and its conditional verification request regardless of the generic factual wording path.
 */
const RETENTION_CURRENT_REVIEW_WORDING = POTENTIAL_WORDING['RETENTION-PERIOD-ENDED-SINCE-THE-REPORT'];

/**
 * BLOCKER-REPORT-DATA-TO-ISSUE-001 (Batch 31): the COURT-ENFORCEMENT LIMITATION item. It is a different
 * question from the reporting-retention rules: if the dates suggest a court claim on the debt may now be
 * outside the time limit that applies where the consumer lives, show the timing information. This item
 * is never a dispute candidate or an allegation that a bureau broke a reporting rule.
 */
const LIMITATION_WORDING = Object.freeze({
  label: 'The dates suggest this debt may be outside the time limit for a court claim',
  explain: (i) => {
    const e = i.evidence || {};
    const reportPart = e.report_reference_date
      ? ` The report itself was issued on ${e.report_reference_date}${e.report_age_days ? `, about ${e.report_age_days} days before it was checked` : ''}.`
      : '';
    const printed = `This report shows a debt on ${entryLabel(i)} and prints ${e.start_printed_value || e.start_iso} as its ${e.start_label}.`;
    const deadline = e.screening_deadline
      ? ` Counting ${e.basic_period_years} years from that printed date gives a screening deadline of ${e.screening_deadline}.`
      : '';
    const checked = ` This report was checked on ${e.assessed_on}.`;
    const transfer = ' Selling the debt or moving it to a collection agency does not by itself give the original creditor or collector a new court deadline. The debt may still appear on a credit report because the reporting period is separate.';
    if (['CA-BC', 'CA-ON', 'CA-MB'].includes(e.jurisdiction)) {
      return `${printed} ${e.jurisdiction_label}'s ordinary two-year court-claim period starts when the claim is discovered.${deadline} The printed date does not establish when the claim was discovered or the final court deadline.${checked}${reportPart}${transfer}`;
    }
    if (String(e.start_is || '').startsWith('ACCRUAL_')) {
      const scope = e.jurisdiction === 'AU-ACT' ? 'an ordinary cause of action'
        : ['CA-NT', 'CA-NU'].includes(e.jurisdiction) ? 'an action to recover money' : 'a simple-contract claim';
      return `${printed} In ${e.jurisdiction_label}, the ordinary six-year period for ${scope} starts when the right to bring the claim arose.${deadline} The printed date does not establish when that right arose or the final court deadline.${checked}${reportPart}${transfer}`;
    }
    return `${printed} In ${e.jurisdiction_label}, the usual court time limit for a claim like this is ${e.basic_period_years} years from when the claim is discovered.${deadline}${checked}${reportPart} The dates suggest this debt may be outside the time limit for a court claim.${transfer}`;
  },
  uncertainty: (i) => {
    return 'Court time limits and credit-report time limits are separate. This information uses the dates printed on your report. Those dates alone do not prove whether someone can still sue. An expired court time limit alone does not require the bureau to remove a debt. This is information for you, not a dispute reason.';
  }
});

/** Recorded issue-specific request wording for a content finding. A content finding is a prohibition on
 *  INCLUDING report content the report itself prints (e.g. a dismissed charge). It is not aged by a retention
 *  period, so it states the prohibited content directly — no invented retention period is ever attached. */
const CONTENT_FINDING_WORDING = Object.freeze({
  'CA-NS-CRA-S10-3-F-DISMISSED-CHARGE': {
    label: 'A dismissed, withdrawn or stayed criminal charge is included',
    explain: (i) => {
      const included = (i.content_inclusion && Array.isArray(i.content_inclusion.included) && i.content_inclusion.included.length)
        ? i.content_inclusion.included.join(' and ')
        : 'criminal-charge information the recorded rule prohibits';
      return `This report includes ${included} on ${recordLabel(i)}, which the recorded rule prohibits from being included in a consumer report.`;
    },
    uncertainty: 'The report itself prints the charge and a dismissed (or set aside, withdrawn or stayed) disposition, and the entry is complete, so the recorded prohibition applies to what this report shows. This is an established reporting issue under a governed rule.',
    request: 'please remove this entry because the recorded rule prohibits reporting a dismissed, set aside, withdrawn or stayed charge'
  },
  /* BATCH-12: the Manitoba judgment-content rule (The Personal Investigations Act, C.C.S.M. c. P34, s. 4(e);
     source row CRP-LSRC-0377). Manitoba own wording requires the creditor name, the creditor address and the
     amount. The provision excepts the ADDRESS where the director provided the information under The Family
     Support Enforcement Act, and the report never states that provenance, so an absent address alone is
     recorded but is not decisive; the name and the amount carry no exception. */
  'CA-MB-PIA-S4-E-JUDGMENT-CONTENT-OMISSION': {
    label: 'A judgment is reported without information the recorded rule requires',
    request_type: 'CORRECTION',
    explain: (i) => {
      const c = (i && i.content_omission) || {};
      const omitted = Array.isArray(c.omitted) && c.omitted.length
        ? c.omitted.join(' and ').replace(/^(.*) and (.*)$/, '$1 and $2')
        : 'information the recorded rule requires';
      return `This report includes ${recordLabel(i)} without ${omitted}, which the recorded rule requires a judgment entry to state.`;
    },
    uncertainty: 'The recorded rule requires a judgment entry to state the judgment creditor name, the creditor address and the amount of the judgment. This report prints the entry as a complete public record and the missing item is absent from the entry itself rather than unread. The provision excepts the creditor ADDRESS where the information was provided by the director under The Family Support Enforcement Act, and this report does not state that provenance, so an absent address on its own is not treated as established; the creditor name and the amount carry no such exception.',
    request: 'please correct this judgment entry so that it states the information the recorded rule requires, or remove the entry'
  },
  /* BATCH-14: the Prince Edward Island judgment-content rule (Consumer Reporting Act, R.S.P.E.I. 1974,
     Cap. C-18, s. 9(3)(d), official consolidation current to 30 March 2026; row CRP-LSRC-0389). The provision
     requires the creditor name, the creditor address WHERE AVAILABLE and the amount. Only an absent amount on
     a complete entry is establishable, so an absent address alone is recorded and never claimed. */
  'CA-PE-CRA-S9-3-D-JUDGMENT-CONTENT-OMISSION': {
    label: 'A judgment is reported without information the recorded rule requires',
    request_type: 'CORRECTION',
    explain: (i) => {
      const c = (i && i.content_omission) || {};
      const omitted = Array.isArray(c.omitted) && c.omitted.length
        ? c.omitted.join(' and ')
        : 'information the recorded rule requires';
      return `This report includes ${recordLabel(i)} without ${omitted}, which the recorded rule requires a judgment entry to state.`;
    },
    uncertainty: 'The recorded rule requires a judgment entry to state the judgment creditor name, the creditor address where available and the amount of the judgment. This report prints the entry as a complete public record and the missing item is absent from the entry itself rather than unread. The provision requires the creditor address only where available and this report does not state that it was unavailable, so an absent address on its own is not treated as established; the amount carries no such exception.',
    request: 'please correct this judgment entry so that it states the information the recorded rule requires, or remove the entry'
  },

  /* BATCH-9: the Alberta reporting-period rule (Credit and Personal Reports Regulation, Alta. Reg. 193/99,
     s. 4(b), under the Consumer Protection Act, R.S.A. 2000, c. C-26.3; source row CRP-LSRC-0339). The anchor
     is the TransUnion Canada tradeline's own printed Last Payment Date, which that reader maps to
     tradeline.lastPaymentDate with its printed page/line location. The provision runs from the LATER of the
     last payment and the date the debt was incurred; the second date is not printed, so the issue is a
     qualified verification and never a definite violation. */
  'CA-AB-CPA-CPRR-S4-B-DEBT-LAST-PAYMENT-6Y': {
    label: 'A debt is still being reported more than six years after the last payment printed on it',
    request_type: 'VERIFICATION',
    explain: (i) => {
      const from = (i.anchor && (i.anchor.value_as_supplied || i.anchor.iso)) || 'the date printed on this entry';
      return `This report prints ${recordLabel(i)} with a last payment on ${from}. The recorded rule does not allow unfavourable information about a debt to be reported more than six years after that debt was last paid or incurred, whichever is later.`;
    },
    uncertainty: 'The six-year period runs from the later of the date of the last payment on the debt and the date the debt was incurred. This report prints the last payment date and does not print a date for when the debt was incurred, and no other printed date on the entry is treated as one. Where the debt was incurred once, the printed last payment date is the later of the two; on a revolving account the balance may include amounts charged after that payment, so a later date cannot be excluded. This is a probable reporting issue under a governed rule, to be verified, not an established violation.',
    request: 'please verify whether this debt may still be reported, because the recorded rule does not allow unfavourable information about a debt to be reported more than six years after the last payment on it or the date it was incurred, whichever is later'
  },
  /* OWNER-CA-ORDINARY-REPORT-001 / -002: the Ontario ordinary-report reliability rule (Consumer Reporting Act,
     R.S.O. 1990, c. C.33, s. 9(3)(a)). Its recorded basis is the provision's own located words — a consumer
     reporting agency shall not include in a consumer report any credit information based on evidence that is
     not the best evidence reasonably available (see SOURCE_CAPTURES/CA-ON-ORDINARY-REPORT/
     crp-lsrc-0362-provision-retrieval.json). The report itself shows that its own two printed values for one
     account cannot both be right; it never shows which of them is unreliable, so this is recorded as a probable
     VERIFICATION, never a correction demand and never an established violation. */
  /* BATCH-17: PIPEDA Schedule 1 clause 4.6 (Accuracy) for the Northwest Territories. Applicability comes from the OPC
     statement that organizations in the three territories are federally regulated and therefore covered by
     PIPEDA. The duty relied on is accuracy — no retention period and no prohibition. */
  'CA-NT-PIPEDA-SCH1-4-6-ACCURACY': {
    label: 'A printed value cannot be accurate as printed',
    request_type: 'VERIFICATION',
    explain: (i) => `This report prints ${recordLabel(i)} with two dated values that cannot both be right, and the recorded accuracy principle requires personal information to be as accurate, complete and up-to-date as is necessary for the purposes for which it is used.`,
    uncertainty: 'Which of the two printed values is unreliable is not established, and a benign explanation — such as a data-entry or formatting difference — has not been excluded. This is not an established violation: the report shows that its own two printed values conflict and does not show which one is wrong. The recorded provision states that personal information shall be as accurate, complete and up-to-date as is necessary for the purposes for which it is to be used (Personal Information Protection and Electronic Documents Act, S.C. 2000, c. 5, Schedule 1, clause 4.6).',
    request: 'please verify which of these two printed values is correct and correct the entry'
  },
  /* BATCH-17: PIPEDA Schedule 1 clause 4.6 (Accuracy) for the Nunavut. Applicability comes from the OPC
     statement that organizations in the three territories are federally regulated and therefore covered by
     PIPEDA. The duty relied on is accuracy — no retention period and no prohibition. */
  'CA-NU-PIPEDA-SCH1-4-6-ACCURACY': {
    label: 'A printed value cannot be accurate as printed',
    request_type: 'VERIFICATION',
    explain: (i) => `This report prints ${recordLabel(i)} with two dated values that cannot both be right, and the recorded accuracy principle requires personal information to be as accurate, complete and up-to-date as is necessary for the purposes for which it is used.`,
    uncertainty: 'Which of the two printed values is unreliable is not established, and a benign explanation — such as a data-entry or formatting difference — has not been excluded. This is not an established violation: the report shows that its own two printed values conflict and does not show which one is wrong. The recorded provision states that personal information shall be as accurate, complete and up-to-date as is necessary for the purposes for which it is to be used (Personal Information Protection and Electronic Documents Act, S.C. 2000, c. 5, Schedule 1, clause 4.6).',
    request: 'please verify which of these two printed values is correct and correct the entry'
  },
  /* BATCH-17: PIPEDA Schedule 1 clause 4.6 (Accuracy) for the Yukon. Applicability comes from the OPC
     statement that organizations in the three territories are federally regulated and therefore covered by
     PIPEDA. The duty relied on is accuracy — no retention period and no prohibition. */
  'CA-YT-PIPEDA-SCH1-4-6-ACCURACY': {
    label: 'A printed value cannot be accurate as printed',
    request_type: 'VERIFICATION',
    explain: (i) => `This report prints ${recordLabel(i)} with two dated values that cannot both be right, and the recorded accuracy principle requires personal information to be as accurate, complete and up-to-date as is necessary for the purposes for which it is used.`,
    uncertainty: 'Which of the two printed values is unreliable is not established, and a benign explanation — such as a data-entry or formatting difference — has not been excluded. This is not an established violation: the report shows that its own two printed values conflict and does not show which one is wrong. The recorded provision states that personal information shall be as accurate, complete and up-to-date as is necessary for the purposes for which it is to be used (Personal Information Protection and Electronic Documents Act, S.C. 2000, c. 5, Schedule 1, clause 4.6).',
    request: 'please verify which of these two printed values is correct and correct the entry'
  },
  /* BATCH-18 */
  'CA-BC-BPCPA-S109-1-B-MOST-RELIABLE-EVIDENCE': {
    label: 'A printed value cannot be accurate as printed',
    request_type: 'VERIFICATION',
    explain: (i) => `This report prints ${recordLabel(i)} with two dated values that cannot both be right, and the recorded duty requires the information to rest on the most reliable evidence reasonably available.`,
    uncertainty: 'Which of the two printed values is unreliable is not established, and a benign explanation — such as a data-entry or formatting difference — has not been excluded. This is not an established violation: the report shows that its own two printed values conflict and does not show which one is wrong. The recorded provision is: Business Practices and Consumer Protection Act (British Columbia), S.B.C. 2004, c. 2, s. 109(1)(b) — a reporting agency must not include information not based on the most reliable evidence reasonably available.',
    request: 'please verify which of these two printed values is correct and correct the entry'
  },
  /* BATCH-18 */
  'CA-QC-P-39-1-S11-ACCURACY': {
    label: 'A printed value cannot be accurate as printed',
    request_type: 'VERIFICATION',
    explain: (i) => `This report prints ${recordLabel(i)} with two dated values that cannot both be right, and the recorded duty requires the information to rest on the most reliable evidence reasonably available.`,
    uncertainty: 'Which of the two printed values is unreliable is not established, and a benign explanation — such as a data-entry or formatting difference — has not been excluded. This is not an established violation: the report shows that its own two printed values conflict and does not show which one is wrong. The recorded provision is: Act respecting the protection of personal information in the private sector (Quebec), CQLR c. P-39.1, s. 11 — personal information held on another person must be up to date and accurate when used to make a decision about that person.',
    request: 'please verify which of these two printed values is correct and correct the entry'
  },
  /* BATCH-18: New Brunswick s.10(3)(f) judgment content, on the operative 2017 Act. */
  'CA-NB-CRSA-S10-3-F-JUDGMENT-CONTENT-OMISSION': {
    label: 'A judgment is reported without information the recorded rule requires',
    request_type: 'CORRECTION',
    explain: (i) => {
      const c = (i && i.content_omission) || {};
      const omitted = Array.isArray(c.omitted) && c.omitted.length ? c.omitted.join(' and ') : 'information the recorded rule requires';
      return `This report includes ${recordLabel(i)} without ${omitted}, which the recorded rule requires a judgment entry to state.`;
    },
    uncertainty: 'The recorded rule requires a judgment entry to state the judgment creditor name, the creditor address if available and the amount. This report prints the entry as a complete public record and the missing item is absent from the entry itself rather than unread; an absent address alone is recorded and not claimed, because the provision requires the address only if available.',
    request: 'please correct this judgment entry so that it states the information the recorded rule requires, or remove the entry'
  },
  /* BATCH-19: Saskatchewan s.18(b) accuracy. */
  'CA-SK-CRA-S18-B-MOST-RELIABLE-EVIDENCE': {
    label: 'A printed value cannot be accurate as printed',
    request_type: 'VERIFICATION',
    explain: (i) => `This report prints ${recordLabel(i)} with two dated values that cannot both be right, and the recorded duty requires the information to be based on the most reliable evidence reasonably available.`,
    uncertainty: 'Which of the two printed values is unreliable is not established, and a benign explanation — such as a data-entry or formatting difference — has not been excluded. This is not an established violation: the report shows that its own two printed values conflict and does not show which one is wrong. The recorded provision is: The Credit Reporting Act (Saskatchewan), S.S. 2004, c. C-43.2, s. 18(b) — no credit reporting agency shall include any information not based on the most reliable evidence reasonably available.',
    request: 'please verify which of these two printed values is correct and correct the entry'
  },
  /* BATCH-19: Saskatchewan s.18(j) judgment content. */
  'CA-SK-CRA-S18-J-JUDGMENT-CONTENT-OMISSION': {
    label: 'A judgment is reported without information the recorded rule requires',
    request_type: 'CORRECTION',
    explain: (i) => {
      const c = (i && i.content_omission) || {};
      const omitted = Array.isArray(c.omitted) && c.omitted.length ? c.omitted.join(' and ') : 'information the recorded rule requires';
      return `This report includes ${recordLabel(i)} without ${omitted}, which the recorded rule requires a judgment entry to state.`;
    },
    uncertainty: 'The recorded rule requires a judgment entry to state the judgment creditor name, the creditor address if available and the amount of the judgment. This report prints the entry as a complete public record and the missing item is absent from the entry itself rather than unread; an absent address alone is recorded and not claimed, because the provision requires the address only if available.',
    request: 'please correct this judgment entry so that it states the information the recorded rule requires, or remove the entry'
  },
  'CA-ON-CRA-S9-3-A-RELIABLE-EVIDENCE-BASIS': {
    label: 'The report prints two dates for one account that cannot both be right',
    request_type: 'VERIFICATION',
    explain: (i) => {
      const c = i.content_inclusion || {};
      return `This report prints ${recordLabel(i)} with an opened date of ${c.opened_date} and a closed date of ${c.closed_date}, and those two printed values cannot both be right.`;
    },
    uncertainty: 'Which of the two printed values is unreliable is not established by the report, and a benign explanation (for example a later correction of one date, or an account reopened after it was closed) may exist. The recorded Ontario provision this conflict raises — that a consumer reporting agency shall not include in a consumer report any credit information based on evidence that is not the best evidence reasonably available (Consumer Reporting Act (Ontario), R.S.O. 1990, c. C.33, s. 9(3)(a)) — makes what the report shows a probable reporting issue to verify, not an established violation.',
    request: 'please verify the opened and closed dates printed for this account and correct whichever is not based on the best evidence reasonably available'
  },
  /* CRP_VERSION_1_FINISH_ORDER_001: the GB accuracy/rectification rule (UK GDPR Articles 5(1)(d) and 16, source
     entry CRP-LSRC-0407). Its recorded basis is the provision's own words retrieved from the official publisher.
     The report shows that its own two printed values for one account cannot both be right; it never shows which
     value is inaccurate, so this is a probable VERIFICATION, never a correction demand and never an established
     violation. */
  'GB-UK-GDPR-ART5-1-D-ART16-ACCURACY': {
    label: 'The report prints two dates for one account that cannot both be right',
    request_type: 'VERIFICATION',
    explain: (i) => {
      const c = i.content_inclusion || {};
      return `This report prints ${recordLabel(i)} with an opened date of ${c.opened_date} and a closed date of ${c.closed_date}, and those two printed values cannot both be right.`;
    },
    uncertainty: 'Which of the two printed values is inaccurate is not established by the report, and a benign explanation (for example a later correction of one date, or an account reopened after it was closed) may exist. The recorded UK provision this conflict raises — that personal data must be accurate and, where necessary, kept up to date and that inaccurate personal data must be rectified without undue delay (UK GDPR, Articles 5(1)(d) and 16) — makes what the report shows a probable reporting issue to verify, not an established violation.',
    request: 'please verify the opened and closed dates printed for this account and rectify whichever is inaccurate'
  }
});

/** The consumer-facing label for a content finding, and a recorded-content fallback for an unknown adapter. */
function contentFindingPolicy(issue) {
  const recorded = CONTENT_FINDING_WORDING[issue.adapter_id];
  if (recorded) return recorded;
  return {
    label: 'The report includes content a recorded rule prohibits',
    explain: (i) => {
      const included = (i.content_inclusion && Array.isArray(i.content_inclusion.included) && i.content_inclusion.included.length)
        ? i.content_inclusion.included.join(' and ')
        : 'report content a recorded rule prohibits';
      return `This report includes ${included} on ${recordLabel(i)}.`;
    },
    uncertainty: 'The recorded rule prohibits this content from being included in a consumer report, and the report itself prints the content and the facts that establish it. This is an established reporting issue under a governed rule.',
    request: 'please verify this entry and correct it if the recorded rule prohibits it'
  };
}

/** The explanation and specific uncertainty for one issue, and its recorded request wording. */
function describeWording(issue) {
  if (issue.basis_type === BASIS_TYPE.CONTENT_FINDING) {
    /* OWNER-POTENTIAL-ISSUE-001 reconciliation: a content finding is a prohibition on INCLUDING report content
       the report itself prints. It gets its own content evidence + template representation, never a retention
       period. */
    const policy = contentFindingPolicy(issue);
    return {
      explanation: policy.explain(issue),
      uncertainty: policy.uncertainty,
      /* A recorded content rule states its own request type: the dismissed-charge prohibition is a correction,
         the Ontario reliability rule is a verification. Unrecorded falls back to correction. */
      request_type: policy.request_type || REQUEST_TYPE.CORRECTION,
      request_wording: policy.request
    };
  }
  if (issue.basis_type === BASIS_TYPE.STATUTORY_RETENTION) {
    const years = issue.period_years;
    const where = recordLabel(issue);
    if (issue.confidence === CONFIDENCE.DEFINITE) {
      return {
        explanation: `More than ${years} years have passed since the date this rule measures from on ${where}.`,
        uncertainty: 'Every report-determinable fact is resolved, and this is an established reporting issue under a governed retention rule.',
        request_type: REQUEST_TYPE.CORRECTION,
        request_wording: 'please correct or remove this entry because the recorded retention period has been exceeded'
      };
    }
    /* Branch B: an unresolved exception (kept unknown) versus the historical-verification qualifier. Both are
       PROBABLE verification requests; the consumer wording names the actual uncertainty. */
    if (issue.decisive_fact_unavailable && String(issue.decisive_fact_unavailable).indexOf('exception:') === 0) {
      const alternatives = (issue.unresolved_exceptions && issue.unresolved_exceptions.length)
        ? ` A permitted use may apply, for example: ${issue.unresolved_exceptions.join('; ')}.`
        : '';
      return {
        explanation: `Your report contains an entry older than the ordinary reporting period for this rule (more than ${years} years have passed since the date this rule measures from on ${where}). Whether a recorded exception to that period applies cannot be determined from your report.`,
        uncertainty: `The entry appears to exceed the period, but whether a recorded exception applies cannot be established from the report itself, so it stays unknown — it is not shown to be absent.${alternatives} This is a probable reporting issue, not an established one.`,
        request_type: REQUEST_TYPE.VERIFICATION,
        request_wording: 'please verify whether an exception to this retention period applies to this entry and correct or remove it if no exception applies'
      };
    }
    return {
      explanation: `More than ${years} years have passed since the date this rule measures from on ${where}, and your report states that date's correspondence to the actual event is unverified.`,
      uncertainty: 'The actual event date cannot be established from this report, so this is a probable reporting issue, not an established one.',
      request_type: REQUEST_TYPE.VERIFICATION,
      request_wording: 'please verify the event date this rule measures from and correct or remove the entry if the recorded retention period has elapsed'
    };
  }
  if (issue.basis_type === BASIS_TYPE.LIMITATION_ASSESSMENT) {
    /* Court timing is information only; the latest owner direction excludes it from disputes. */
    return {
      explanation: LIMITATION_WORDING.explain(issue),
      uncertainty: LIMITATION_WORDING.uncertainty(issue),
      request_type: null,
      request_wording: null
    };
  }
  const policy = POTENTIAL_WORDING[issue.check_id] || {
    explain: (i) => `This report prints a factual discrepancy on ${recordLabel(i)}.`,
    uncertainty: 'The report does not show which printed value needs correction.',
    request: 'please verify and correct this entry'
  };
  /* OWNER Batch 33 correction: a policy entry may state its uncertainty or its request as a FUNCTION of the issue
     (as the limitation and later-expiry entries do). Resolving it here, exactly as `explain` is always resolved,
     keeps the rule-specific wording on the card instead of leaving an unserialisable function in its place. */
  const resolvePolicyValue = (value) => (typeof value === 'function' ? value(issue) : value);
  return {
    explanation: policy.explain(issue),
    uncertainty: resolvePolicyValue(policy.uncertainty),
    request_type: REQUEST_TYPE.VERIFICATION,
    request_wording: resolvePolicyValue(policy.request)
  };
}

/** One public breach term, derived from an existing checklist assessment, never from confidence or eligibility. */
function consumerLabel(issue) {
  if (!issue) return null;
  if (issue.basis_type === BASIS_TYPE.LIMITATION_ASSESSMENT) return 'INFORMATION';
  const classification = issue.rule_assessment && issue.rule_assessment.classification || issue.classification;
  const scopedRule = issue.rule_assessment && (!issue.check_id || CHECKLIST_IDS.has(issue.check_id));
  if (BREACH_CLASSES.has(classification) && (scopedRule || activeAdapter(issue.adapter_id))) return 'VIOLATION';
  if ((issue.supported_bases || []).some((basis) => consumerLabel(basis) === 'VIOLATION')) return 'VIOLATION';
  // Public issues carry the server's decision after internal rule identifiers have been removed.
  return issue.consumer_label === 'VIOLATION' ? 'VIOLATION' : null;
}

/** Normalize only generated confidence boilerplate, including saved wording. Printed evidence is untouched. */
function consumerText(text) {
  if (text == null) return text;
  return String(text)
    .replace(/, so this is a probable reporting issue, not an established one\./gi, '.')
    .replace(/Your report shows a probable reporting issue\.\s*/gi, '')
    .replace(/\s*This is a probable reporting issue(?: under a governed rule, to be verified)?,? not an established (?:one|violation)\./gi, '')
    .replace(/\s*This is an established reporting issue under a governed rule\./gi, '')
    .replace(/makes what the report shows a probable reporting issue to verify, not an established violation\./gi, 'supports a verification request.')
    .replace(/\s*This is a qualified potential-duplicate review, not a definite finding\./gi, '')
    .replace(/This is a completeness question to verify, not an established reporting issue\./gi, 'Please verify the missing detail.')
    .replace(/This is not an established violation: the report/gi, 'The report')
    .replace(/, and this is an established reporting issue under a governed retention rule\./gi, '.')
    .trim();
}

/** A presentation projection for newly generated and saved issues; it does not change the assessment or facts. */
function projectConsumerIssue(issue, label = consumerLabel(issue)) {
  const out = { ...issue, consumer_label: label };
  if (issue.basis_type === BASIS_TYPE.LIMITATION_ASSESSMENT) {
    out.consumer_label = 'INFORMATION';
    out.eligible = false;
    out.request_type = null;
    out.request_wording = null;
    out.uncertainty = LIMITATION_WORDING.uncertainty(issue);
  }
  for (const field of ['explanation', 'uncertainty', 'request_wording']) {
    if (Object.hasOwn(out, field)) out[field] = consumerText(out[field]);
  }
  if (issue.supported_bases) out.supported_bases = issue.supported_bases.map((basis) => projectConsumerIssue(basis));
  return out;
}

/** Preserve specific uncertainty while keeping the engine's confidence tier out of consumer wording. */
function describe(issue) {
  const wording = describeWording(issue);
  return { ...wording, uncertainty: consumerText(wording.uncertainty) };
}

/** Whether one issue is eligible for a consumer correction packet (issue-specific, not a blanket flag). A
 *  statutory finding (retention OR content) is eligible when its per-rule permission authorizes a VIOLATION
 *  packet, or when it is a PROBABLE verification request. */
function isEligible(issue) {
  /* Court timing is informational and cannot be selected into bureau correspondence. */
  if (issue.basis_type === BASIS_TYPE.LIMITATION_ASSESSMENT) return false;
  if (issue.basis_type === BASIS_TYPE.STATUTORY_RETENTION || issue.basis_type === BASIS_TYPE.CONTENT_FINDING) {
    if (issue.confidence === CONFIDENCE.DEFINITE) return issue.packet_eligible === true;
    return issue.confidence === CONFIDENCE.PROBABLE;
  }
  return Boolean(issue.confidence === CONFIDENCE.POTENTIAL
    || (issue.basis_type === BASIS_TYPE.FACTUAL_CONSISTENCY
      && issue.rule_assessment && ['VIOLATION', 'PROBABLE_VIOLATION', 'POTENTIAL_VIOLATION'].includes(issue.classification)));
}


/** Statutory findings -> DEFINITE (VIOLATION) / PROBABLE (PROBABLE_VIOLATION) issues. */
function statutoryIssues(extraction, results) {
  const issues = [];
  for (const row of results || []) {
    const m = row.machine;
    const finding = m && m.finding;
    if (!finding) continue;
    const classification = finding.classification;
    if (classification !== 'VIOLATION' && classification !== 'PROBABLE_VIOLATION') continue;
    /* OWNER-POTENTIAL-ISSUE-001 reconciliation: a finding is either a retention comparison (period_years +
       arithmetic) or a report-CONTENT finding (the report includes content a recorded rule prohibits). A content
       finding carries its own content + decisive-fact evidence and is NOT aged by a retention period, so it is
       never dropped for lacking one. */
    const content = finding.content_inclusion || finding.content_omission || finding.content || null;
    const isContentFinding = finding.period_years == null && content != null;
    if (finding.period_years == null && !isContentFinding) continue;
    const requiredFacts = (finding.evaluation && Array.isArray(finding.evaluation.required_facts)) ? finding.evaluation.required_facts : [];
    const anchorFact = requiredFacts[0] || null;
    const record = recordFor(extraction, row.record_index);
    const issue = {
      issue_id: issueId(`statutory:${m.adapter_id}:${row.record_index}:${classification}`),
      confidence: classification === 'VIOLATION' ? CONFIDENCE.DEFINITE : CONFIDENCE.PROBABLE,
      basis_type: isContentFinding ? BASIS_TYPE.CONTENT_FINDING : BASIS_TYPE.STATUTORY_RETENTION,
      classification,
      adapter_id: m.adapter_id,
      rule_id: m.adapter_id,
      legacy_rule_id: m.legacy_rule_id || null,
      packet_eligible: m.packet_eligible === true,
      record_index: row.record_index,
      citation: finding.citation || null,
      source_version: finding.source_version || null,
      period_years: isContentFinding ? null : finding.period_years,
      arithmetic: finding.arithmetic || null,
      content_inclusion: isContentFinding && !finding.content_omission ? content : null,
      content_omission: isContentFinding && finding.content_omission ? finding.content_omission : null,
      decisive_fact_unavailable: finding.decisive_fact_unavailable || null,
      unresolved_exceptions: (finding.evaluation && finding.evaluation.exceptions && Array.isArray(finding.evaluation.exceptions.unresolved_items))
        ? finding.evaluation.exceptions.unresolved_items.map((u) => u.text || u.evaluation_basis).filter(Boolean)
        : [],
      anchor_field: isContentFinding ? null : (anchorFact ? anchorFact.field : null),
      source: isContentFinding ? null : (anchorFact ? anchorFact.source : null),
      record: recordRefFor(record),
      report_identity: reportIdentityFor(record),
      account_identity: accountIdentityFor(record)
    };
    if (isContentFinding) {
      /* The content finding's evidence is its decisive content facts, not a retention anchor. */
      issue.label = contentFindingPolicy(issue).label;
      issue.source_facts = contentFindingFacts(requiredFacts);
    }
    issue.eligible = isEligible(issue);
    Object.assign(issue, describe(issue));
    issues.push(issue);
  }
  return issues;
}

/** Equivalent period breaches on one report entry are one consumer concern. Keep the complete
 * per-rule bases; the primary card uses an existing eligible basis and never invents a stronger class. */
function consolidateRetentionIssues(rows) {
  const groups = new Map();
  for (const issue of rows) {
    if (issue.basis_type !== BASIS_TYPE.STATUTORY_RETENTION) continue;
    const a = issue.arithmetic || {};
    const key = JSON.stringify([issue.record_index, issue.anchor_field, a.anchor_date,
      a.reference_date, a.anniversary, issue.period_years]);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(issue);
  }
  const replacements = new Map();
  const consumed = new Set();
  const rank = { DEFINITE: 0, PROBABLE: 1, POTENTIAL: 2 };
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const ordered = group.slice().sort((a, b) => Number(b.eligible) - Number(a.eligible)
      || rank[a.confidence] - rank[b.confidence] || a.issue_id.localeCompare(b.issue_id));
    const primary = ordered[0];
    primary.supported_bases = ordered.map((basis) => ({
      basis_type: basis.basis_type, issue_id: basis.issue_id, adapter_id: basis.adapter_id,
      rule_id: basis.rule_id, legacy_rule_id: basis.legacy_rule_id,
      classification: basis.classification, confidence: basis.confidence,
      citation: basis.citation, source_version: basis.source_version,
      source: basis.source, anchor_field: basis.anchor_field,
      period_years: basis.period_years, arithmetic: basis.arithmetic,
      explanation: basis.explanation, uncertainty: basis.uncertainty,
      request_type: basis.request_type, request_wording: basis.request_wording,
      packet_eligible: basis.packet_eligible, eligible: basis.eligible
    }));
    replacements.set(group[0].issue_id, primary);
    group.slice(1).forEach((issue) => consumed.add(issue.issue_id));
  }
  return rows.filter((issue) => !consumed.has(issue.issue_id))
    .map((issue) => replacements.get(issue.issue_id) || issue);
}

/** The three in-scope common-error positives -> POTENTIAL issues. */
function potentialIssues(extraction, commonErrors, evaluation) {
  const issues = [];
  const performed = commonErrors && Array.isArray(commonErrors.performed) ? commonErrors.performed : [];
  for (const entry of performed) {
    if (entry.state !== 'POTENTIAL_ISSUE') continue;
    if (!POTENTIAL_ISSUE_CHECK_ID_SET.has(entry.check_id)) continue;
    for (const sr of entry.source_records || []) {
      const filter = POTENTIAL_REASON_FILTER[entry.check_id];
      if (filter && !filter(sr)) continue;
      const record = recordFor(extraction, sr.record_index);
      const issue = {
        issue_id: issueId(`factual:${entry.check_id}:${sr.record_index}:${JSON.stringify(sr.evidence || {})}`),
        confidence: CONFIDENCE.POTENTIAL,
        basis_type: BASIS_TYPE.FACTUAL_CONSISTENCY,
        classification: null,
        check_id: entry.check_id,
        label: entry.label || null,
        reason: sr.reason || null,
        record_index: sr.record_index,
        evidence: sr.evidence || null,
        location: sr.location || null,
        record: recordRefFor(record),
        report_identity: reportIdentityFor(record),
        account_identity: accountIdentityFor(record),
        source_facts: sourceFactsFor(record, EVIDENCE_FACT_FIELDS[entry.check_id] || [])
      };
      if (entry.check_id === 'COMMON-ERROR-COLLECTION-ORIGINAL-BOTH-DUE' && sr.evidence && sr.evidence.original_record != null) {
        const original = recordFor(extraction, sr.evidence.original_record);
        if (original) issue.source_facts.push(...sourceFactsFor(original, EVIDENCE_FACT_FIELDS[entry.check_id]));
      }
      const assessment = commonErrorRuleAssessment.assess(issue, record, evaluation, extraction);
      if (!assessment && commonErrorRuleAssessment.hasUnusableDecisiveSource(issue, record, extraction)) continue;
      if (['COMMON-ERROR-REPORTED-DATES-OUT-OF-ORDER', 'COMMON-ERROR-POTENTIAL-RE-AGING-SIGNAL'].includes(entry.check_id) && !assessment) continue;
      if (assessment) {
        issue.classification = assessment.classification;
        if (assessment.classification === 'PROBABLE_VIOLATION') issue.confidence = CONFIDENCE.PROBABLE;
        issue.citation = assessment.citation;
        issue.source_version = assessment.source_version;
        issue.rule_assessment = assessment;
        issue.source_facts = assessment.required_facts.map((f) => ({
          field: f.field, source_field: f.role === 'earlier_report' || f.role === 'current_report'
            ? `${f.role === 'earlier_report' ? 'Earlier' : 'Current'} report ${f.source.report_reference_date}: ${f.source.source_field}`
            : assessment.required_facts.some((item) => item.source.record_index !== f.source.record_index)
            ? `Account ${f.source.record_index}: ${f.source.source_field}` : f.source.source_field,
          raw_value: f.source.raw_value, normalized_value: f.source.normalized_value,
          ...(f.source.omitted_value ? { omitted_value: true, state: f.source.state } : {}),
          ...(f.source.code_definition ? { code_definition: f.source.code_definition } : {}),
          ...(f.source.period_definition ? { period_definition: f.source.period_definition } : {}),
          ...(f.source.privacy_redacted ? { privacy_redacted: true } : {}),
          ...(f.source.period_location ? { period_location: f.source.period_location } : {}),
          location: f.source.location, ...(f.source.report_reference_date ? {
            role: f.role, source_result_id: f.source.source_result_id, source_file_id: f.source.source_file_id,
            bureau: f.source.bureau, report_reference_date: f.source.report_reference_date } : {})
        }));
        const dateField = issue.evidence && issue.evidence.field === 'first_delinquency'
          ? 'tradeline.firstDelinquencyDate' : issue.evidence && issue.evidence.field === 'last_payment'
            ? 'tradeline.lastPaymentDate' : null;
        const decisiveSource = dateField && assessment.required_facts.find((fact) => fact.field === dateField);
        if (decisiveSource) issue.location = decisiveSource.source.location;
      }
      // The optional own masked suffix identifies this account in the packet; it is not a rule prerequisite.
      if (entry.check_id === 'COMMON-ERROR-REVOLVING-BALANCE-ZERO-LIMIT'
        && !issue.source_facts.some(fact => fact.field === 'account.masked_identifier')
        && sourceForField(record, 'account.masked_identifier')) {
        issue.source_facts.push(...sourceFactsFor(record, ['account.masked_identifier']));
      }
      issue.eligible = isEligible(issue);
      Object.assign(issue, describe(issue));
      issues.push(issue);
    }
  }
  return issues;
}

/* OWNER-CA-ORDINARY-REPORT-002: one printed conflict must reach the consumer once. When a report-content
   finding measures the same discrepancy on the SAME record that a factual check already describes, the factual
   observation is folded into that finding's issue as a second supported base instead of being offered as a
   separate card. Nothing is discarded or re-classified: the factual check id, its label, its evidence and its
   source facts stay on the issue as provenance, the internal classifications stay distinct, and the factual
   check keeps running (it is only the duplicate CARD that is suppressed, and only for the overlapping record). */
const FACTUAL_OVERLAP = Object.freeze({
  'FCRA-607B-US-NATIONAL-ACCURACY': 'COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY',
  'CA-ON-CRA-S9-3-A-RELIABLE-EVIDENCE-BASIS': 'COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY',
  'GB-UK-GDPR-ART5-1-D-ART16-ACCURACY': 'COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY',
  'CA-NT-PIPEDA-SCH1-4-6-ACCURACY': 'COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY',
  'CA-NU-PIPEDA-SCH1-4-6-ACCURACY': 'COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY',
  'CA-YT-PIPEDA-SCH1-4-6-ACCURACY': 'COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY',
  'CA-BC-BPCPA-S109-1-B-MOST-RELIABLE-EVIDENCE': 'COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY',
  'CA-QC-P-39-1-S11-ACCURACY': 'COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY',
  'CA-SK-CRA-S18-B-MOST-RELIABLE-EVIDENCE': 'COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY'
});

/** The two printed values a content finding measured, as one comparable key. */
function contentFindingValueKey(issue) {
  const c = issue.content_inclusion || {};
  return `${c.opened_date || ''}|${c.closed_date || ''}`;
}

/** The two printed values a factual observation measured, in the same shape. */
function factualValueKey(issue) {
  const e = issue.evidence || {};
  return `${e.opened || ''}|${e.closed || ''}`;
}

/** Fold every overlapping factual observation into its content finding; return the factual issues not consumed. */
function mergeOverlappingFactualIssues(statutory, factual) {
  const consumed = new Set();
  for (const s of statutory) {
    const check = s.basis_type === BASIS_TYPE.CONTENT_FINDING ? FACTUAL_OVERLAP[s.adapter_id] : null;
    if (!check || s.record_index == null) continue;
    const match = factual.find((f) => !consumed.has(f.issue_id)
      && f.check_id === check
      && f.record_index === s.record_index
      && factualValueKey(f) === contentFindingValueKey(s));
    if (!match) continue;
    consumed.add(match.issue_id);
    if (!Array.isArray(s.supported_bases)) s.supported_bases = [];
    s.supported_bases.push({
      basis_type: BASIS_TYPE.FACTUAL_CONSISTENCY,
      check_id: match.check_id,
      label: match.label || null,
      issue_id: match.issue_id,
      confidence: match.confidence,
      classification: match.classification,
      rule_assessment: match.rule_assessment || null,
      evidence: match.evidence || null,
      source_facts: match.source_facts || [],
      location: match.location || null
    });
    s.supported_bases.push({
      basis_type: BASIS_TYPE.CONTENT_FINDING,
      adapter_id: s.adapter_id,
      citation: s.citation || null,
      source_version: s.source_version || null,
      confidence: s.confidence,
      classification: s.classification,
      uncertainty: s.uncertainty,
      source_facts: s.source_facts || []
    });
    s.merged_factual_issue_ids = [...(s.merged_factual_issue_ids || []), match.issue_id];
  }
  return factual.filter((f) => !consumed.has(f.issue_id));
}

/** The unified issue list for one result: statutory (definite/probable) then potential. A factual observation
 *  that duplicates a content finding on the same record is folded into it rather than offered twice. */
/** The payment-history analyses whose positives become POTENTIAL issues, in the common-error entry shape. */
const PAYMENT_HISTORY_CHECK_IDS = new Set([
  'PH-RATING-CONTRADICTS-NARRATIVE-IN-THE-SAME-MONTH',
  'PH-PAYMENT-CONTRADICTS-NO-PAYMENT-NARRATIVE',
  'PH-DELINQUENCY-ANCHOR-AFTER-THE-HISTORY-SHOWS-IT'
]);

/** The payment-history positives -> POTENTIAL issues, each naming the account and the two printed statements. */
function paymentHistoryIssues(extraction, analysis) {
  const issues = [];
  const performed = analysis && Array.isArray(analysis.performed) ? analysis.performed : [];
  for (const entry of performed) {
    if (entry.state !== 'POTENTIAL_ISSUE') continue;
    if (!PAYMENT_HISTORY_CHECK_IDS.has(entry.check_id)) continue;
    for (const source of entry.source_records || []) {
      const record = recordFor(extraction, source.record_index);
      const issue = {
        issue_id: issueId(`ph:${entry.check_id}:${source.record_index}:${JSON.stringify(source.evidence || {})}`),
        confidence: CONFIDENCE.POTENTIAL,
        basis_type: BASIS_TYPE.FACTUAL_CONSISTENCY,
        classification: null,
        check_id: entry.check_id,
        label: entry.label || null,
        reason: source.reason || null,
        record_index: source.record_index,
        evidence: source.evidence || null,
        location: source.location || null,
        record: recordRefFor(record),
        report_identity: reportIdentityFor(record),
        account_identity: accountIdentityFor(record),
        source_facts: []
      };
      issue.eligible = isEligible(issue);
      Object.assign(issue, describe(issue));
      issues.push(issue);
    }
  }
  return issues;
}

/**
 * The court-limitation items: one per account whose printed dates the assessment found may be outside the time
 * limit. The item carries the jurisdiction, the statute, the printed date it counted from, what that date can
 * bear, the years elapsed and the conditions the report does not show.
 */
function limitationIssues(extraction, limitation) {
  const issues = [];
  const performed = limitation && Array.isArray(limitation.performed) ? limitation.performed : [];
  for (const assessment of performed) {
    if (assessment.outcome !== 'MAY_BE_OUTSIDE_THE_LIMITATION_PERIOD') continue;
    const start = assessment.start_date || {};
    const record = recordFor(extraction, assessment.record_index);
    const issue = {
      issue_id: issueId(`limitation:${assessment.jurisdiction.region_code}:${assessment.record_index}:${start.iso}`),
      confidence: CONFIDENCE.POTENTIAL,
      basis_type: BASIS_TYPE.LIMITATION_ASSESSMENT,
      classification: null,
      check_id: 'LIMITATION-PERIOD-COURT-CLAIM',
      label: ['CA-BC', 'CA-ON', 'CA-MB'].includes(assessment.jurisdiction.region_code)
        || String(assessment.jurisdiction.start_is || '').startsWith('ACCRUAL_')
        ? 'The age of this debt may warrant checking the time limit for a court claim'
        : LIMITATION_WORDING.label,
      reason: start.selection_rule || null,
      record_index: assessment.record_index,
      anchor: { field: start.label || null, iso: start.iso || null, value_as_supplied: start.printed_value || null },
      evidence: {
        jurisdiction: assessment.jurisdiction.region_code,
        jurisdiction_label: assessment.jurisdiction.label,
        statute: assessment.jurisdiction.citation,
        start_is: assessment.jurisdiction.start_is,
        basic_period_years: assessment.jurisdiction.basic_period_years,
        ultimate_period_years: assessment.jurisdiction.ultimate_period_years,
        start_label: start.label || null,
        start_iso: start.iso || null,
        start_printed_value: start.printed_value || null,
        start_basis: start.basis || null,
        start_location: start.location || null,
        other_printed_dates: assessment.other_printed_dates || [],
        /* THE OPERATIVE DATE: when the server ran this assessment. */
        assessed_on: assessment.assessment_date || null,
        assessment_run_at: assessment.assessment_run_at || null,
        assessment_clock_basis: assessment.assessment_clock_basis || null,
        reference_date: assessment.assessment_date || null,
        /* PROVENANCE and the historical comparison: the printed report date, kept separate. */
        report_reference_date: assessment.report_reference_date || null,
        report_age_days: assessment.report_age_days === undefined ? null : assessment.report_age_days,
        at_report_date: assessment.at_report_date || null,
        elapsed_years: assessment.elapsed_years,
        screening_deadline: assessment.period_ends || null,
        unknown_conditions: assessment.unknown_conditions || [],
        uncertainty_since_report: assessment.uncertainty_since_report || null,
        acknowledgment_rule: assessment.acknowledgment_rule || null,
        not_a_reporting_requirement: assessment.not_a_reporting_requirement || null
      },
      location: start.location || null,
      record: recordRefFor(record),
      report_identity: reportIdentityFor(record),
      account_identity: accountIdentityFor(record),
      source_facts: start.iso && start.location ? [{ source_field: start.label || 'Printed debt date',
        raw_value: start.printed_value || start.iso, normalized_value: start.iso, location: start.location }] : []
    };
    issue.eligible = isEligible(issue);
    Object.assign(issue, describe(issue));
    issues.push(issue);
  }
  return issues;
}

function issuesFor(ctx) {
  const evaluation = ctx && ctx.evaluation;
  const extraction = ctx && ctx.extraction;
  if (!evaluation) return [];
  const statutory = consolidateRetentionIssues(statutoryIssues(extraction, (evaluation.results || [])
    .filter((row) => row && row.machine && row.machine.finding
      && activeAdapter((row.check && row.check.adapter_id) || row.machine.adapter_id))));
  const factual = potentialIssues(extraction, evaluation.common_errors, evaluation);
  const paymentHistory = paymentHistoryIssues(extraction, evaluation.payment_history_analysis);
  const scopedRetention = evaluation.retention_dual_date ? {
    ...evaluation.retention_dual_date,
    performed: (evaluation.retention_dual_date.performed || []).filter((row) => activeRuleRef(row.rule))
  } : null;
  const retentionReview = retentionCurrentReviewIssues(extraction, scopedRetention, statutory);
  const limitation = limitationIssues(extraction, evaluation.limitation_assessment);
  return statutory.concat(mergeOverlappingFactualIssues(statutory, factual), paymentHistory, retentionReview, limitation)
    .map((issue) => {
      const record = recordFor(extraction, issue.record_index);
      if (!record) return issue;
      // Own printed references and listing roles locate the selected entry; they do not establish account identity or ownership.
      const fields = record.kind === 'OVERDUE_ACCOUNT'
        ? ['overdue.associationCode', 'overdue.coBorrower', 'overdue.accountReference']
        : record.kind === 'CONSUMER_CREDIT_LIABILITY' ? ['liability.accountReference'] : [];
      const supporting = fields.flatMap((field) => {
        const source = sourceForField(record, field);
        return source ? [{ field, ...source, supporting_evidence: true }] : [];
      });
      if (supporting.length) issue.source_facts = [...(issue.source_facts || []), ...supporting];
      return issue;
    });
}

/**
 * OWNER dual-date retention (Batch 33): one current-review item per entry+rule whose reporting period was still
 * running when the uploaded report was issued and appears to have ended since. When the same entry+rule ALREADY
 * carries a historical finding (the entry was outside its period at the report date), no second card is created:
 * the historical finding is the stronger, already-classified statement about the same entry and rule.
 */
function retentionCurrentReviewIssues(extraction, dualDate, statutoryIssuesAlready) {
  const issues = [];
  const performed = dualDate && Array.isArray(dualDate.performed) ? dualDate.performed : [];
  const alreadyCovered = new Set((statutoryIssuesAlready || [])
    .filter((i) => i && i.basis_type === BASIS_TYPE.STATUTORY_RETENTION)
    .flatMap((i) => [i, ...(i.supported_bases || [])].flatMap((basis) =>
      [basis.adapter_id, basis.rule_id, basis.legacy_rule_id, basis.citation]
        .filter(Boolean).map((identity) => `${i.record_index}|${identity}`))));
  /* ONE coherent concern per entry and period, not one per limb: two recorded limbs that measure the same entry
     from the same anchor to the same end date are the same underlying concern, so they merge into one card with
     both citations rather than inflating the count. */
  const groups = new Map();
  for (const entry of performed) {
    if (!entry.current_review_warranted && entry.state !== 'ALREADY_OUTSIDE_AT_REPORT_AND_ASSESSMENT') continue;
    if (entry.exceptions && entry.exceptions.established_defeating) continue;
    const key = `${entry.record_index}|${entry.anchor_iso}|${entry.at_assessment_date ? entry.at_assessment_date.period_ends_on : ''}`;
    if (!groups.has(key)) groups.set(key, { entry, citations: [], rule_refs: [], materials: [] });
    const group = groups.get(key);
    if (entry.citation && !group.citations.includes(entry.citation)) group.citations.push(entry.citation);
    if (entry.rule && !group.rule_refs.includes(entry.rule)) group.rule_refs.push(entry.rule);
    group.materials.push(entry);
  }
  for (const group of groups.values()) {
    const entry = group.entry;
    if (group.materials.some((material) => [material.adapter_id, material.rule, material.citation]
      .filter(Boolean).some((identity) => alreadyCovered.has(`${entry.record_index}|${identity}`)))) continue;
    const record = recordFor(extraction, entry.record_index);
    const label = consumerFieldLabel(entry.anchor_field);
    const sourceFacts = sourceFactFor(entry, label, record);
    /* The consumer-safe evidence only: dates, states and the source the reader recorded. The raw machine entry
       stays internal, under `machine`, exactly as the other issue producers keep their audit payload. */
    const issue = {
      issue_id: issueId(`retention-current:${entry.anchor_iso}:${entry.record_index}:${entry.assessment_date}`),
      confidence: CONFIDENCE.POTENTIAL,
      basis_type: BASIS_TYPE.FACTUAL_CONSISTENCY,
      classification: null,
      check_id: 'RETENTION-PERIOD-ENDED-SINCE-THE-REPORT',
      label: 'This entry may now be too old to report',
      reason: entry.state,
      record_index: entry.record_index,
      anchor: { field: label, iso: entry.anchor_iso || null, value_as_supplied: entry.anchor_printed_date || null },
      retention_review: {
        citation: group.citations[0] || null,
        citations: group.citations.slice(),
        region: entry.region || null,
        anchor_label: label,
        anchor_printed_date: entry.anchor_printed_date || null,
        anchor_iso: entry.anchor_iso || null,
        anchor_precision: entry.anchor_precision || null,
        period_years: entry.period_years === undefined ? null : entry.period_years,
        period_ends_on: entry.at_assessment_date ? entry.at_assessment_date.period_ends_on : null,
        period_ends_from: entry.at_assessment_date ? entry.at_assessment_date.period_ends_from : null,
        report_issued: entry.report_reference_date || null,
        assessed_on: entry.assessment_date || null,
        state: entry.state,
        historical_position_not_established: Boolean(entry.historical_position_not_established),
        exception_recorded: Boolean(entry.exceptions && entry.exceptions.recorded),
        exception_material_unknown: Boolean(entry.exceptions && entry.exceptions.material_unknown),
        exception_specific_uncertainty: entry.exceptions ? entry.exceptions.specific_uncertainty_text || entry.exceptions.specific_uncertainty || null : null,
        exception_resolved_against_applicability: Boolean(entry.exceptions && entry.exceptions.resolved_against_applicability),
        comparison_basis: entry.comparison_basis || null
      },
      evidence: {
        state: entry.state,
        anchor_field_label: label,
        anchor_printed_value: entry.anchor_printed_date || null,
        anchor_normalized_value: entry.anchor_iso || null,
        anchor_precision: entry.anchor_precision || null,
        period_years: entry.period_years === undefined ? null : entry.period_years,
        period_ends_on: entry.at_assessment_date ? entry.at_assessment_date.period_ends_on : null,
        report_reference_date: entry.reference_date || entry.report_reference_date || null,
        assessment_date: entry.assessment_date || null,
        source_page: sourceFacts.length && sourceFacts[0].location ? sourceFacts[0].location.page : null,
        source_line: sourceFacts.length && sourceFacts[0].location ? sourceFacts[0].location.line : null
      },
      /* The audit payload: the raw comparison entries, never rendered to a consumer. */
      machine: { retention_dates: group.materials, internal_rule_refs: group.rule_refs.slice() },
      location: sourceFacts.length ? sourceFacts[0].location : null,
      source_facts: sourceFacts,
      record: recordRefFor(record),
      report_identity: reportIdentityFor(record),
      account_identity: accountIdentityFor(record)
    };
    issue.eligible = isEligible(issue);
    Object.assign(issue, describe(issue));
    /* The rule's own uncertainty and the conditional verification request are delivered on this card, so the
       qualified concern can never reach a consumer without them. */
    issue.uncertainty = issue.uncertainty || RETENTION_CURRENT_REVIEW_WORDING.uncertainty(issue);
    issue.request_wording = issue.request_wording || RETENTION_CURRENT_REVIEW_WORDING.request(issue);
    issue.request_type = issue.request_type || REQUEST_TYPE.VERIFICATION;
    issues.push(issue);
  }
  return issues;
}


/** The supported bases of a merged issue, in consumer language. Internal adapter and check ids are never exposed;
 *  the recorded rule is named by its citation and the factual base by the plain-language kind of observation. */
function publicBases(bases) {
  return (bases || []).map((b) => {
    if (b.basis_type === BASIS_TYPE.STATUTORY_RETENTION) {
      const source = b.source || {};
      return { basis_type: b.basis_type, kind: 'recorded_rule', citation: b.citation || null,
        classification: b.classification, confidence: b.confidence,
        rule_source_version: b.source_version || null, period_years: b.period_years,
        explanation: b.explanation, uncertainty: b.uncertainty,
        source_facts: [{ source_field: source.source_field || consumerFieldLabel(b.anchor_field),
          raw_value: source.raw_value, normalized_value: source.normalized_value,
          location: source.location || null }] };
    }
    if (b.basis_type === BASIS_TYPE.CONTENT_FINDING) {
      return { basis_type: b.basis_type, kind: 'recorded_rule', citation: b.citation || null,
        classification: b.classification, confidence: b.confidence,
        rule_source_version: b.source_version || null, uncertainty: b.uncertainty,
        source_facts: (b.source_facts || []).map((f) => ({ source_field: f.source_field,
          raw_value: f.raw_value, normalized_value: f.normalized_value, location: f.location || null })) };
    }
    if (b.basis_type === BASIS_TYPE.LIMITATION_ASSESSMENT) {
      return { basis_type: b.basis_type, kind: 'court_enforcement_time_limit', citation: b.citation || null };
    }
    return { basis_type: b.basis_type, kind: 'what_the_report_prints', check_kind: b.label || null,
      classification: b.classification, confidence: b.confidence,
      requirement: b.rule_assessment ? b.rule_assessment.requirement : null,
      source_facts: (b.source_facts || []).map((f) => ({ source_field: f.source_field,
        raw_value: f.raw_value, normalized_value: f.normalized_value, location: f.location || null })) };
  }).map((basis, index) => projectConsumerIssue(basis, consumerLabel(bases[index])));
}

/** The consumer-facing view of one issue: no internal adapter/check ids, no machine classification leaks. */
function publicIssue(issue) {
  const src = issue.source || null;
  const loc = src && src.location ? src.location : (issue.location || null);
  const out = {
    issue_id: issue.issue_id,
    confidence: issue.confidence,
    basis_type: issue.basis_type,
    request_type: issue.request_type,
    eligible: issue.eligible === true,
    explanation: issue.explanation || null,
    uncertainty: issue.uncertainty || null,
    account_number_in_report: issue.record_index,
    record_kind: issue.record ? issue.record.kind_label : null
  };
  if (issue.basis_type !== BASIS_TYPE.STATUTORY_RETENTION && COMPLETENESS_CHECK_IDS.has(issue.check_id)) {
    out.missing_detail = true;
  }
  if (issue.basis_type === BASIS_TYPE.LIMITATION_ASSESSMENT) {
    const e = issue.evidence || {};
    out.limitation_concern = true;
    out.request_wording = issue.request_wording || null;
    out.limitation = {
      jurisdiction_label: e.jurisdiction_label || null,
      statute: e.statute || null,
      basic_period_years: e.basic_period_years || null,
      counted_from: e.start_printed_value || e.start_iso || null,
      counted_from_label: e.start_label || null,
      counted_from_because: e.start_basis || null,
      screening_deadline: e.screening_deadline || null,
      /* The date the server ran this assessment: the operative date, shown as "Assessed on …". */
      assessed_on: e.assessed_on || null,
      assessment_clock_basis: e.assessment_clock_basis || null,
      /* The printed report date, kept separate as provenance. */
      report_date: e.report_reference_date || null,
      report_age_days: e.report_age_days === undefined ? null : e.report_age_days,
      years_since: e.elapsed_years === undefined ? null : e.elapsed_years,
      what_the_report_does_not_show: e.unknown_conditions || [],
      uncertainty_since_report: e.uncertainty_since_report || null,
      note: e.not_a_reporting_requirement || null
    };
  }
  /* OWNER dual-date retention (Batch 33): the CURRENT-review card carries BOTH dates and the period's apparent
     end, so the consumer can see what the report said then and what the position appears to be now. */
  if (issue.retention_review) {
    const r = issue.retention_review;
    if (r.state === 'ALREADY_OUTSIDE_AT_REPORT_AND_ASSESSMENT') out.reporting_period_concern = true;
    else out.later_expiry_concern = true;
    /* The qualified concern carries its own uncertainty and its conditional verification request on the public
       card, exactly as the limitation item does. */
    out.uncertainty = issue.uncertainty || null;
    out.request_wording = issue.request_wording || null;
    out.request_type = issue.request_type || null;
    out.retention_review = {
      /* The recorded statutory citation only — no internal adapter or rule identifier reaches a consumer. */
      citation: r.citation || null,
      citations: r.citations || [r.citation].filter(Boolean),
      /* The consumer-facing name of the printed field, and the printed value it read. */
      anchor_label: r.anchor_label || null,
      anchor_printed_date: r.anchor_printed_date || null,
      anchor_precision: r.anchor_precision || null,
      period_years: r.period_years === undefined ? null : r.period_years,
      period_appears_to_end_on: r.period_ends_on || null,
      period_appears_to_end_from: r.period_ends_from || null,
      report_issued: r.report_issued || null,
      assessed_on: r.assessed_on || null,
      arose_through_later_passage_of_time: r.state === 'INSIDE_AT_REPORT_OUTSIDE_AT_ASSESSMENT',
      historical_position_not_established: Boolean(r.historical_position_not_established),
      exception_recorded: Boolean(r.exception_recorded),
      exception_material_unknown: Boolean(r.exception_material_unknown),
      exception_specific_uncertainty: r.exception_specific_uncertainty || null,
      exception_resolved_against_applicability: Boolean(r.exception_resolved_against_applicability),
      based_on: r.comparison_basis || null
    };
    /* The source evidence the card, the review step, the download and the packet all carry. */
    out.source_evidence = {
      field_label: (issue.source_facts && issue.source_facts[0] ? issue.source_facts[0].source_field : null) || r.anchor_label || null,
      printed_value: issue.source_facts && issue.source_facts[0] ? issue.source_facts[0].raw_value : null,
      normalized_value: issue.source_facts && issue.source_facts[0] ? issue.source_facts[0].normalized_value : null,
      page: issue.source_facts && issue.source_facts[0] && issue.source_facts[0].location ? issue.source_facts[0].location.page : null,
      line: issue.source_facts && issue.source_facts[0] && issue.source_facts[0].location ? issue.source_facts[0].location.line : null
    };
  }
  if (issue.report_identity) {
    out.report_identity = {
      bureau: issue.report_identity.bureau,
      reference_date: issue.report_identity.reference_date
    };
  }
  if (issue.account_identity) {
    out.account_identity = {
      name: issue.account_identity.name,
      source_field: issue.account_identity.source_field || null,
      raw_value: issue.account_identity.raw_value || null,
      location: issue.account_identity.location
        ? { section: issue.account_identity.location.section || null, page: issue.account_identity.location.page, line: issue.account_identity.location.line }
        : null
    };
  }
  if (issue.basis_type === BASIS_TYPE.STATUTORY_RETENTION) {
    out.citation = issue.citation || null;
    out.rule_source_version = issue.source_version || null;
    out.period_years = issue.period_years || null;
    out.printed_value = src ? src.raw_value : null;
    out.normalized_value = src ? src.normalized_value : null;
    out.source_facts = src ? [{ source_field: src.source_field || consumerFieldLabel(issue.anchor_field),
      raw_value: src.raw_value, normalized_value: src.normalized_value,
      location: src.location || null }] : [];
    out.source_facts.push(...(issue.source_facts || []).filter((fact) => fact.supporting_evidence === true)
      .map((fact) => ({ source_field: fact.source_field, raw_value: consumerFactValue(fact, 'raw_value'),
        normalized_value: consumerFactValue(fact, 'normalized_value'),
        ...(fact.privacy_redacted ? { privacy_redacted: true } : {}), location: fact.location || null })));
    if (issue.supported_bases && issue.supported_bases.length) out.supported_bases = publicBases(issue.supported_bases);
  } else if (issue.basis_type === BASIS_TYPE.CONTENT_FINDING) {
    /* A content finding states the prohibited content and its decisive facts — never a retention period. */
    out.citation = issue.citation || null;
    out.rule_source_version = issue.source_version || null;
    out.content_kind = issue.label || null;
    /* A merged issue carries every base its finding rests on, so the consumer sees one issue with its
       supported bases rather than the same discrepancy twice. */
    if (issue.supported_bases && issue.supported_bases.length) {
      out.supported_bases = publicBases(issue.supported_bases);
      const dataRule = issue.supported_bases.find((b) => b.rule_assessment);
      if (dataRule) out.rule_assessment = { classification: dataRule.classification,
        requirement: dataRule.rule_assessment.requirement };
    }
    out.content_included = (issue.content_inclusion && issue.content_inclusion.included) ? issue.content_inclusion.included.slice() : null;
    if (issue.source_facts && issue.source_facts.length) {
      out.source_facts = issue.source_facts.map((f) => ({
        source_field: f.source_field,
        raw_value: consumerFactValue(f, 'raw_value'),
        normalized_value: consumerFactValue(f, 'normalized_value'),
        ...(f.omitted_value ? { omitted_value: true, state: f.state } : {}),
        ...(f.privacy_redacted ? { privacy_redacted: true } : {}),
        location: publicFactLocation(f.location), ...publicDefinitionSource(f)
      }));
    }
  } else {
    out.check_kind = issue.label || null;
    if (issue.rule_assessment) {
      out.citation = issue.citation;
      out.rule_source_version = issue.source_version;
      out.rule_assessment = { classification: issue.classification,
        requirement: issue.rule_assessment.requirement };
    }
    out.evidence = issue.check_id === 'COMMON-ERROR-POTENTIAL-RE-AGING-SIGNAL' && issue.evidence
      ? { earlier_anchor: issue.evidence.earlier_anchor, current_anchor: issue.evidence.current_anchor,
        earlier_report_date: issue.evidence.earlier_report_date, current_report_date: issue.evidence.current_report_date }
      : issue.evidence || null;
    if (out.evidence && (issue.source_facts || []).some((fact) => fact.privacy_redacted)) {
      out.evidence = { ...out.evidence };
      if (Object.hasOwn(out.evidence, 'corroborated_identity')) {
        delete out.evidence.corroborated_identity;
        out.evidence.account_identity_matched = true;
      }
    }
    if (issue.source_facts && issue.source_facts.length) {
      out.source_facts = issue.source_facts.map((f) => ({
        source_field: f.source_field,
        raw_value: consumerFactValue(f, 'raw_value'),
        normalized_value: consumerFactValue(f, 'normalized_value'),
        ...(f.omitted_value ? { omitted_value: true, state: f.state } : {}),
        ...(f.privacy_redacted ? { privacy_redacted: true } : {}),
        location: publicFactLocation(f.location), ...publicDefinitionSource(f)
      }));
    }
  }
  if (loc) {
    out.source_location = { section: loc.section || null, page: loc.page, line: loc.line };
  }
  return projectConsumerIssue(out, consumerLabel(issue));
}

function consumerFactValue(fact, key) {
  return fact.privacy_redacted ? fact.field === 'account.member_reference'
    ? 'Member number matched from the report' : /Member Name/i.test(fact.source_field || '')
      ? 'Reporting member matched from the report' : 'Creditor identity matched from the report' : fact[key];
}

function publicFactLocation(location) {
  if (!location) return null;
  if (['EXTERNAL_REPORT_CODE_DEFINITION', 'EXTERNAL_REPORT_PERIOD_DEFINITION'].includes(location.source_kind)) return {
    section: location.section, url: location.url, source_kind: location.source_kind
  };
  return { section: location.section || null, page: location.page, line: location.line };
}

function publicDefinitionSource(fact) {
  const period = fact.field === 'account.paymentHistoryPeriodDefinition';
  const definition = period ? fact.period_definition : fact.field === 'account.paymentHistoryDefinition' && fact.code_definition;
  if (!definition) return {};
  const { publisher, title, url, section, version } = definition.source;
  return { definition_source: { publisher, title, url, section, version, ...(period ? { kind: 'HISTORY_PERIOD' } : {}) } };
}

function publicIssues(ctx) {
  return issuesFor(ctx).map(publicIssue);
}

module.exports = {
  CONFIDENCE,
  BASIS_TYPE,
  REQUEST_TYPE,
  PROBABLE_LEAD,
  POTENTIAL_ISSUE_CHECK_IDS,
  issuesFor,
  publicIssues,
  publicIssue,
  consumerLabel,
  consumerText,
  projectConsumerIssue,
  issueId,
  isEligible
};

