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
 * Legal findings keep their exact existing meaning; this module never promotes an observation or a factual
 * discrepancy into a VIOLATION or PROBABLE_VIOLATION. A POTENTIAL issue is a concrete, source-linked
 * discrepancy with a named uncertainty and a benign alternative — it supports a factual verification request
 * without asserting a proven breach.
 */

const crypto = require('node:crypto');
const { factSourcesForRecord } = require('./formats.cjs');

const CONFIDENCE = Object.freeze({ DEFINITE: 'DEFINITE', PROBABLE: 'PROBABLE', POTENTIAL: 'POTENTIAL' });
const BASIS_TYPE = Object.freeze({ STATUTORY_RETENTION: 'STATUTORY_RETENTION', CONTENT_FINDING: 'CONTENT_FINDING', FACTUAL_CONSISTENCY: 'FACTUAL_CONSISTENCY' });
const REQUEST_TYPE = Object.freeze({ CORRECTION: 'CORRECTION', VERIFICATION: 'VERIFICATION' });

/**
 * OWNER correction (Batch 25): the one approved lead sentence for a probable reporting issue. It is the single
 * source for the served text, so the results card, the review step and the downloaded packet cannot drift, and
 * it is never a claim that something was unreadable.
 */
const PROBABLE_LEAD = 'Your report shows a probable reporting issue. Review the details below before deciding whether to dispute it.';

/** The common-error checks whose positives become selectable POTENTIAL issues (Batch 1 + ordinary-account batch). */
const POTENTIAL_ISSUE_CHECK_IDS = Object.freeze([
  'COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY',
  'COMMON-ERROR-STATUS-DATE-CONTRADICTION',
  'COMMON-ERROR-PAYMENT-HISTORY-INCONSISTENCY',
  'COMMON-ERROR-BALANCE-PAYMENT-INCONSISTENCY',
  'COMMON-ERROR-DUPLICATE-REPORTING',
  'COMMON-ERROR-RESPONSIBILITY-INCONSISTENCY'
]);
const POTENTIAL_ISSUE_CHECK_ID_SET = new Set(POTENTIAL_ISSUE_CHECK_IDS);

/** Per-check source-record filter: a signal whose benign explanation defeats the discrepancy is NOT promoted.
 *  A payment exceeding the current balance can be legitimate (payment type/timing/snapshot), so only the
 *  past-due-exceeds-balance contradiction becomes a selectable issue. */
const POTENTIAL_REASON_FILTER = Object.freeze({
  'COMMON-ERROR-BALANCE-PAYMENT-INCONSISTENCY': (sr) => sr.reason === 'PAST_DUE_EXCEEDS_BALANCE'
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

/** The report/source identity a detector read its facts from (never fabricated). Falls back from the
 *  multi-file-assembly fields to the record's own bureau/reference date. */
function reportIdentityFor(record) {
  if (!record) return null;
  const reference = record.source_report_reference_date
    || (record.report_reference_date && record.report_reference_date.normalized_value)
    || null;
  return {
    bureau: record.source_bureau || record.bureau || null,
    reference_date: reference,
    file_id: record.source_file_id || null
  };
}

/** The relevant fact fields whose printed source the packet states (raw + normalized + location). */
const EVIDENCE_FACT_FIELDS = Object.freeze({
  'COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY': ['liability.openedDate', 'liability.closedDate'],
  'COMMON-ERROR-STATUS-DATE-CONTRADICTION': ['account.status', 'liability.closedDate'],
  'COMMON-ERROR-PAYMENT-HISTORY-INCONSISTENCY': [],
  'COMMON-ERROR-BALANCE-PAYMENT-INCONSISTENCY': ['account.balance', 'account.amount', 'account.pastDueAmount'],
  'COMMON-ERROR-DUPLICATE-REPORTING': ['account.masked_identifier', 'account.reported_identity', 'account.amount', 'liability.openedDate', 'liability.closedDate'],
  'COMMON-ERROR-RESPONSIBILITY-INCONSISTENCY': ['account.masked_identifier', 'account.reported_identity', 'account.responsibility', 'account.amount']
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
    name,
    source_field: src.source_field || null,
    raw_value: src.raw_value != null ? src.raw_value : name,
    location: src.location || null
  };
}

/** The record's kind plus whatever printed identity it carries, so the consumer sees WHICH account an issue is about. */
function recordRefFor(record) {
  if (!record) return null;
  return {
    kind_label: record.kind_label || null,
    source_field: record.source_field || null,
    account_name: (record.facts && record.facts['account.reported_identity']) || null
  };
}

/**
 * The decisive report-content facts of a content finding (its required_facts), in the same shape as
 * `sourceFactsFor`, so the packet states the printed content, its role and its own source location. */
function contentFindingFacts(requiredFacts) {
  return (requiredFacts || []).map((f) => ({
    field: f.field,
    source_field: f.role || f.field,
    raw_value: f.source ? f.source.raw_value : null,
    normalized_value: f.source ? f.source.normalized_value : null,
    location: f.source ? f.source.location : null
  }));
}

/** Recorded issue-specific request wording (recorded before enabling each path — never blanket). */
const POTENTIAL_WORDING = Object.freeze({
  'COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY': {
    explain: (i) => `This report prints ${recordLabel(i)} with an opened date later than its closed date (${(i.evidence || {}).opened} after ${(i.evidence || {}).closed}).`,
    uncertainty: 'A factual inconsistency in the report: one of the two printed dates is likely wrong. It is not, by itself, an established legal violation, and a benign explanation (for example, a later correction of one date) may exist.',
    request: 'please verify the opened and closed dates for this account and correct the inconsistency'
  },
  'COMMON-ERROR-STATUS-DATE-CONTRADICTION': {
    explain: (i) => `This report prints ${recordLabel(i)} whose status says it is open while the same record prints a closure date (${(i.evidence || {}).closed}).`,
    uncertainty: 'A factual inconsistency in the report: an open status and a printed closure date cannot both describe the same account at the same time. It is not, by itself, an established legal violation, and a benign explanation may exist.',
    request: 'please verify the status and the closure date for this account and correct the inconsistency'
  },
  'COMMON-ERROR-PAYMENT-HISTORY-INCONSISTENCY': {
    explain: (i) => `This report prints ${recordLabel(i)} with the same payment-history period (${(i.evidence || {}).period}) twice with two different cells.`,
    uncertainty: 'A factual inconsistency for the same reporting period: the same period is printed twice with different meanings. It is not, by itself, an established legal violation, and a benign explanation (for example, a printing duplication) may exist.',
    request: 'please verify the payment-history cells for this period and correct the inconsistency'
  },
  'COMMON-ERROR-BALANCE-PAYMENT-INCONSISTENCY': {
    explain: (i) => `This report prints ${recordLabel(i)} with a past-due amount (${(i.evidence || {}).past_due}) larger than its balance (${(i.evidence || {}).balance}).`,
    uncertainty: 'A past-due amount cannot exceed the balance it is part of. It is not, by itself, an established legal violation, and a benign explanation (for example, a reporting or rounding error) may exist.',
    request: 'please verify the balance and the past-due amount for this account and correct the inconsistency'
  },
  'COMMON-ERROR-DUPLICATE-REPORTING': {
    explain: (i) => `This report prints two records (${recordLabel(i)} and account ${(i.evidence || {}).duplicate_of_record}) with the same kind, identifying dates, source report, masked account identifier and a matching printed fact, which may be the same account reported twice.`,
    uncertainty: 'The identity is corroborated but duplication is unconfirmed: a legitimate original-creditor entry and a collector entry, a transfer, or different report snapshots can produce similar entries. This is a qualified potential-duplicate review, not a definite finding.',
    request: 'please verify whether these two entries are the same account reported twice and correct any duplication'
  },
  'COMMON-ERROR-RESPONSIBILITY-INCONSISTENCY': {
    explain: (i) => `This report prints the same corroborated account (${recordLabel(i)} and account ${(i.evidence || {}).other_record}) with two different responsibility labels (${(i.evidence || {}).responsibility} and ${(i.evidence || {}).other_responsibility}) in the same reporting snapshot.`,
    uncertainty: 'A joint account, an authorized-user role, a changed responsibility over time, or a masked-identifier collision can produce different labels. It is not, by itself, an established legal violation.',
    request: 'please verify the responsibility on this account and correct the inconsistency'
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
  const policy = POTENTIAL_WORDING[issue.check_id] || {
    explain: (i) => `This report prints a factual discrepancy on ${recordLabel(i)}.`,
    uncertainty: 'A factual inconsistency in the report. It is not, by itself, an established legal violation.',
    request: 'please verify and correct this entry'
  };
  return {
    explanation: policy.explain(issue),
    uncertainty: policy.uncertainty,
    request_type: REQUEST_TYPE.VERIFICATION,
    request_wording: policy.request
  };
}

/**
 * OWNER correction (Batch 25): a PROBABLE issue leads with the one approved sentence and is then followed by
 * that issue's own, specific uncertainty. The uncertainty is never reduced to "a fact was not readable": a value
 * that could not be read is named as a reading failure by the module that actually measured it, while an
 * unverified fact or an exception the report cannot establish is named as exactly that.
 */
function describe(issue) {
  const described = describeWording(issue);
  if (issue.confidence !== CONFIDENCE.PROBABLE) return described;
  return Object.assign({}, described, { uncertainty: `${PROBABLE_LEAD} ${described.uncertainty}` });
}

/** Whether one issue is eligible for a consumer correction packet (issue-specific, not a blanket flag). A
 *  statutory finding (retention OR content) is eligible when its per-rule permission authorizes a VIOLATION
 *  packet, or when it is a PROBABLE verification request. */
function isEligible(issue) {
  if (issue.basis_type === BASIS_TYPE.STATUTORY_RETENTION || issue.basis_type === BASIS_TYPE.CONTENT_FINDING) {
    if (issue.confidence === CONFIDENCE.DEFINITE) return issue.packet_eligible === true;
    return issue.confidence === CONFIDENCE.PROBABLE;
  }
  return issue.confidence === CONFIDENCE.POTENTIAL;
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

/** The three in-scope common-error positives -> POTENTIAL issues. */
function potentialIssues(extraction, commonErrors) {
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
      evidence: match.evidence || null,
      source_facts: match.source_facts || [],
      location: match.location || null
    });
    s.supported_bases.push({
      basis_type: BASIS_TYPE.CONTENT_FINDING,
      adapter_id: s.adapter_id,
      citation: s.citation || null,
      source_version: s.source_version || null,
      confidence: s.confidence
    });
    s.merged_factual_issue_ids = [...(s.merged_factual_issue_ids || []), match.issue_id];
  }
  return factual.filter((f) => !consumed.has(f.issue_id));
}

/** The unified issue list for one result: statutory (definite/probable) then potential. A factual observation
 *  that duplicates a content finding on the same record is folded into it rather than offered twice. */
function issuesFor(ctx) {
  const evaluation = ctx && ctx.evaluation;
  const extraction = ctx && ctx.extraction;
  if (!evaluation) return [];
  const statutory = statutoryIssues(extraction, evaluation.results);
  const factual = potentialIssues(extraction, evaluation.common_errors);
  return statutory.concat(mergeOverlappingFactualIssues(statutory, factual));
}


/** The supported bases of a merged issue, in consumer language. Internal adapter and check ids are never exposed;
 *  the recorded rule is named by its citation and the factual base by the plain-language kind of observation. */
function publicBases(bases) {
  return (bases || []).map((b) => (b.basis_type === BASIS_TYPE.CONTENT_FINDING
    ? { basis_type: b.basis_type, kind: 'recorded_rule', citation: b.citation || null }
    : { basis_type: b.basis_type, kind: 'what_the_report_prints', check_kind: b.label || null }));
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
  } else if (issue.basis_type === BASIS_TYPE.CONTENT_FINDING) {
    /* A content finding states the prohibited content and its decisive facts — never a retention period. */
    out.citation = issue.citation || null;
    out.rule_source_version = issue.source_version || null;
    out.content_kind = issue.label || null;
    /* A merged issue carries every base its finding rests on, so the consumer sees one issue with its
       supported bases rather than the same discrepancy twice. */
    if (issue.supported_bases && issue.supported_bases.length) out.supported_bases = publicBases(issue.supported_bases);
    out.content_included = (issue.content_inclusion && issue.content_inclusion.included) ? issue.content_inclusion.included.slice() : null;
    if (issue.source_facts && issue.source_facts.length) {
      out.source_facts = issue.source_facts.map((f) => ({
        source_field: f.source_field,
        raw_value: f.raw_value,
        normalized_value: f.normalized_value,
        location: f.location ? { section: f.location.section || null, page: f.location.page, line: f.location.line } : null
      }));
    }
  } else {
    out.check_kind = issue.label || null;
    out.evidence = issue.evidence || null;
    if (issue.source_facts && issue.source_facts.length) {
      out.source_facts = issue.source_facts.map((f) => ({
        source_field: f.source_field,
        raw_value: f.raw_value,
        normalized_value: f.normalized_value,
        location: f.location ? { section: f.location.section || null, page: f.location.page, line: f.location.line } : null
      }));
    }
  }
  if (loc) {
    out.source_location = { section: loc.section || null, page: loc.page, line: loc.line };
  }
  return out;
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
  issueId,
  isEligible
};

