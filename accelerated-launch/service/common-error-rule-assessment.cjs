'use strict';

/* A sourced breach of a report-data rule is a product violation assessment in every
 * supported jurisdiction. A statute can supply additional context, but is never a gate. */
const { ADAPTERS, adaptersForRegion } = require('../adapters/rule-adapters.cjs');
const APPLICABILITY = require('../adapters/applicability-records.json');

const PRINTED_LABEL = Object.freeze({
  'account.status': /status/i,
  'liability.closedDate': /clos(?:ed|ure).*date|date.*clos/i,
  'liability.openedDate': /open(?:ed|ing)?.*date|date.*open/i,
  'reportedAccount.dateOpened': /open(?:ed|ing)?.*date|date.*open/i,
  'reportedAccount.firstReported': /first.*report|report.*first/i,
  'account.balance': /balance/i,
  'account.type': /account.*type|type.*account/i,
  'account.amount': /^(?:account\.amount|amount|balance)$/i,
  'account.creditLimit': /credit.*limit|limit.*credit/i,
  'account.masked_identifier': /account.*number|masked.*identifier/i,
  'account.reported_identity': /creditor|lender|account.*name|reported.*identity/i,
  'account.responsibility': /responsib|ownership/i,
  'account.pastDueAmount': /past.?due/i,
  'tradeline.lastPaymentDate': /last.*payment/i,
  'tradeline.firstDelinquencyDate': /first.*delinquen/i
});

function reportReference(record) {
  const date = record && record.report_reference_date;
  if (!date || date.status && date.status !== 'RESOLVED') return null;
  if (date.raw_value != null && date.raw != null && date.raw_value !== date.raw
    || date.normalized_value != null && date.normalized != null && date.normalized_value !== date.normalized) return null;
  const raw = date.raw_value ?? date.raw;
  const normalized = date.normalized_value ?? date.normalized;
  return raw != null && normalized && date.location
    ? { ...date, raw_value: raw, normalized_value: normalized } : null;
}

function sourceForField(record, field) {
  if (field === 'report.referenceDate') {
    const date = reportReference(record);
    if (!date) return null;
    return { raw_value: date.raw_value, normalized_value: date.normalized_value,
      location: date.location, source_field: date.source_field || 'Report date',
      record_index: record.record_index };
  }
  const value = record.facts && record.facts[field];
  const label = PRINTED_LABEL[field];
  if (value == null || !label) return null;
  const printed = record.printed || {};
  const reading = Object.entries(printed).find(([key, p]) => p && (field === 'account.amount'
    ? label.test(key) : label.test(`${key} ${p.label || ''}`))
    && p.raw != null && p.location && String(p.normalized) === String(value));
  if (reading) {
    return { raw_value: reading[1].raw, normalized_value: value, location: reading[1].location,
      source_field: reading[1].label || reading[0], record_index: record.record_index };
  }
  const direct = record.fact_sources && record.fact_sources[field];
  if (direct && direct.raw_value != null && direct.location
    && String(direct.normalized_value) === String(value)) {
    return { raw_value: direct.raw_value, normalized_value: value,
      location: direct.location, source_field: direct.source_field || field,
      record_index: record.record_index };
  }
  /* The TU-CA table keeps numeric cell readings in its own row rather than the caption map. Use
     that row's raw cell and location; never substitute the account block's aggregate raw text. */
  const cell = field === 'account.balance' ? 'balance'
    : field === 'account.pastDueAmount' ? 'past_due' : null;
  const row = cell && Array.isArray(record.monthly_rows) ? record.monthly_rows[0] : null;
  const raw = row && row.cells ? row.cells[cell] : null;
  if (raw == null || !row.location) return null;
  const number = Number(String(raw).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(number) && number === value
    ? { raw_value: raw, normalized_value: value, location: row.location,
      source_field: cell, record_index: record.record_index } : null;
}

const RULE_BY_REGION = Object.freeze({
  'CA-ON': 'CA-ON-CRA-S9-3-A-RELIABLE-EVIDENCE-BASIS',
  'CA-BC': 'CA-BC-BPCPA-S109-1-B-MOST-RELIABLE-EVIDENCE',
  'CA-SK': 'CA-SK-CRA-S18-B-MOST-RELIABLE-EVIDENCE',
  'CA-QC': 'CA-QC-P-39-1-S11-ACCURACY',
  'CA-NT': 'CA-NT-PIPEDA-SCH1-4-6-ACCURACY',
  'CA-NU': 'CA-NU-PIPEDA-SCH1-4-6-ACCURACY',
  'CA-YT': 'CA-YT-PIPEDA-SCH1-4-6-ACCURACY',
  'GB-ENG': 'GB-UK-GDPR-ART5-1-D-ART16-ACCURACY',
  'GB-NIR': 'GB-UK-GDPR-ART5-1-D-ART16-ACCURACY',
  'GB-SCT': 'GB-UK-GDPR-ART5-1-D-ART16-ACCURACY',
  'GB-WLS': 'GB-UK-GDPR-ART5-1-D-ART16-ACCURACY'
});

const REPORT_RULES = Object.freeze({
  'COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY': 'An account cannot close before it opened.',
  'COMMON-ERROR-REPORTED-DATES-OUT-OF-ORDER': 'An account cannot first be reported before it opened.',
  'COMMON-ERROR-STATUS-DATE-CONTRADICTION': 'An account cannot be both open and closed on the same report.',
  'COMMON-ERROR-PAID-SETTLED-SHOWN-UNPAID': 'An account reported paid in full cannot also show a positive amount currently due.',
  'COMMON-ERROR-BALANCE-PAYMENT-INCONSISTENCY': 'A past-due amount cannot exceed the current balance on the same account snapshot.',
  'COMMON-ERROR-REVOLVING-BALANCE-ZERO-LIMIT': 'The reported revolving balance and explicit credit-limit fields must be reconcilable.',
  'COMMON-ERROR-DUPLICATE-REPORTING': 'One account should not be presented as two separate current obligations in the same report.',
  'COMMON-ERROR-RESPONSIBILITY-INCONSISTENCY': 'One account should not carry contradictory responsibility labels in the same reporting snapshot.',
  'COMMON-ERROR-COLLECTION-ORIGINAL-BOTH-DUE': 'A collection and its linked original account should not misstate one obligation as two amounts currently due.',
  'COMMON-ERROR-LAST-PAYMENT-OR-FIRST-DELINQUENCY-DATE': 'A payment or first delinquency cannot predate account opening or occur after the report was issued.',
  'COMMON-ERROR-PAYMENT-HISTORY-INCONSISTENCY': 'One account and period cannot carry two contradictory report-defined payment statuses.',
  'COMMON-ERROR-ADVERSE-ENTRY-WITHOUT-A-DELINQUENCY-ANCHOR': 'A reported adverse event needs a usable date anchor to permit verification.',
  'COMMON-ERROR-WRITE-OFF-WITHOUT-A-CHARGE-OFF-DATE': 'A reported write-off needs a usable charge-off date to permit verification.',
  'COMMON-ERROR-CLOSURE-STATED-WITHOUT-A-CLOSED-DATE': 'A reported closure needs a usable closed date to permit verification.'
});

/* Only report-internal conflicts with two identifiable printed values are admitted in this batch.
 * A missing caption, similar entry, later adverse event, or original/collector pair does not
 * establish that an accuracy duty was breached. Its factual verification path remains intact. */
function decisiveFields(issue, record) {
  const e = issue.evidence || {};
  const f = record.facts || {};
  switch (issue.check_id) {
    case 'COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY':
      return e.opened === f['liability.openedDate'] && e.closed === f['liability.closedDate']
        ? ['liability.openedDate', 'liability.closedDate'] : null;
    case 'COMMON-ERROR-REPORTED-DATES-OUT-OF-ORDER':
      return e.opened === f['reportedAccount.dateOpened'] && e.first_reported === f['reportedAccount.firstReported']
        ? ['reportedAccount.dateOpened', 'reportedAccount.firstReported'] : null;
    case 'COMMON-ERROR-REVOLVING-BALANCE-ZERO-LIMIT':
      return e.balance === f['account.balance'] && e.credit_limit === f['account.creditLimit']
        && e.type === f['account.type']
        ? ['account.type', 'account.balance', 'account.creditLimit'] : null;
    case 'COMMON-ERROR-STATUS-DATE-CONTRADICTION':
      return e.status === f['account.status'] && e.closed === f['liability.closedDate']
        ? ['account.status', 'liability.closedDate'] : null;
    case 'COMMON-ERROR-PAID-SETTLED-SHOWN-UNPAID':
      if (issue.reason === 'PAID_IN_FULL_WITH_POSITIVE_BALANCE') {
        return e.status === String(f['account.status'] || '').toUpperCase().trim()
          && e.balance === f['account.balance'] ? ['account.status', 'account.balance'] : null;
      }
      return e.status === String(f['account.status'] || '').toUpperCase().trim()
        && e.past_due === f['account.pastDueAmount']
        ? ['account.status', 'account.pastDueAmount'] : null;
    case 'COMMON-ERROR-BALANCE-PAYMENT-INCONSISTENCY': {
      if (issue.reason !== 'PAST_DUE_EXCEEDS_BALANCE' || e.past_due !== f['account.pastDueAmount']) return null;
      return f['account.balance'] === e.balance ? ['account.balance', 'account.pastDueAmount'] : null;
    }
    case 'COMMON-ERROR-LAST-PAYMENT-OR-FIRST-DELINQUENCY-DATE': {
      const dateField = e.field === 'last_payment' ? 'tradeline.lastPaymentDate'
        : e.field === 'first_delinquency' ? 'tradeline.firstDelinquencyDate' : null;
      if (!dateField || e.value !== f[dateField]) return null;
      if (issue.reason === 'DATE_BEFORE_ACCOUNT_OPENED' && e.opened === f['liability.openedDate']
        && e.value < e.opened)
        return ['liability.openedDate', dateField];
      if (issue.reason === 'DATE_AFTER_REPORT_ISSUED'
        && e.report_date === (reportReference(record) || {}).normalized_value && e.value > e.report_date)
        return ['report.referenceDate', dateField];
      return null;
    }
    default: return null;
  }
}

function paymentHistorySources(issue, record) {
  if (issue.check_id !== 'COMMON-ERROR-PAYMENT-HISTORY-INCONSISTENCY'
    || issue.reason !== 'SAME_PERIOD_CONTRADICTORY_CELLS') return null;
  const e = issue.evidence || {};
  const cells = (record.facts && record.facts['account.paymentHistoryCells']) || [];
  if (!Array.isArray(cells)) return null;
  const inPeriod = cells.filter((c) => c && c.period === e.period && c.uncertain !== true
    && c.code != null && c.meaning && c.location && c.raw_period);
  const first = inPeriod.find((c) => c.code === e.first_code && c.meaning === e.first_meaning);
  const second = inPeriod.find((c) => c !== first && c.code === e.second_code && c.meaning === e.second_meaning);
  if (!first || !second || String(first.meaning).trim().toUpperCase() === String(second.meaning).trim().toUpperCase()) return null;
  return [first, second].map((cell, index) => ({
    field: 'account.paymentHistoryCells', role: index === 0 ? 'first_printed_cell' : 'second_printed_cell',
    source: { raw_value: cell.code, normalized_value: cell.code,
      source_field: `Payment history ${cell.raw_period}`, location: cell.location,
      record_index: record.record_index }
  }));
}

function pairedRecordSources(issue, record, extraction) {
  const e = issue.evidence || {};
  const otherIndex = issue.check_id === 'COMMON-ERROR-DUPLICATE-REPORTING' ? e.duplicate_of_record
    : issue.check_id === 'COMMON-ERROR-RESPONSIBILITY-INCONSISTENCY' ? e.other_record
      : issue.check_id === 'COMMON-ERROR-COLLECTION-ORIGINAL-BOTH-DUE' ? e.original_record : null;
  if (otherIndex == null || !extraction || !Array.isArray(extraction.records)) return null;
  const other = extraction.records.find((r) => r.record_index === otherIndex);
  if (!other || other.status !== 'RESOLVED' || other.record_index === record.record_index
    || other.source_bureau !== record.source_bureau
    || other.source_report_reference_date !== record.source_report_reference_date) return null;
  const fields = ['account.masked_identifier', 'account.reported_identity'];
  const sameIdentity = fields.every((field) => record.facts[field] != null
    && String(record.facts[field]) === String((other.facts || {})[field]));
  if (!sameIdentity) return null;
  let additional;
  if (issue.check_id === 'COMMON-ERROR-RESPONSIBILITY-INCONSISTENCY') {
    if (record.facts['account.responsibility'] !== e.responsibility
      || other.facts['account.responsibility'] !== e.other_responsibility
      || e.responsibility === e.other_responsibility) return null;
    additional = ['account.responsibility'];
  } else if (issue.check_id === 'COMMON-ERROR-COLLECTION-ORIGINAL-BOTH-DUE') {
    const amountField = (r) => r.facts['account.balance'] != null ? 'account.balance' : 'account.amount';
    const a = amountField(record), b = amountField(other);
    if (record.facts[a] !== e.collection_amount || other.facts[b] !== e.original_amount
      || e.collection_amount <= 0 || e.original_amount <= 0) return null;
    additional = [a, b];
  } else {
    const shared = ['account.amount', 'account.creditLimit', 'account.status']
      .find((field) => record.facts[field] != null
        && String(record.facts[field]) === String(other.facts[field]));
    if (!shared) return null;
    additional = [shared];
  }
  const fieldsFor = (r, extra) => [...fields, ...extra].map((field) => ({
    field, source: sourceForField(r, field), record_index: r.record_index
  }));
  return [...fieldsFor(record, issue.check_id === 'COMMON-ERROR-COLLECTION-ORIGINAL-BOTH-DUE'
    ? [additional[0]] : additional),
  ...fieldsFor(other, issue.check_id === 'COMMON-ERROR-COLLECTION-ORIGINAL-BOTH-DUE'
    ? [additional[1]] : additional)];
}

const COMPLETENESS = Object.freeze({
  'COMMON-ERROR-ADVERSE-ENTRY-WITHOUT-A-DELINQUENCY-ANCHOR': {
    caption: 'First Delinquency Date', evidence: ['adverse_payment_ratings', 'collection_or_cancellation_codes'] },
  'COMMON-ERROR-WRITE-OFF-WITHOUT-A-CHARGE-OFF-DATE': {
    caption: 'Charge Off Date', evidence: ['write_off_codes'] },
  'COMMON-ERROR-CLOSURE-STATED-WITHOUT-A-CLOSED-DATE': {
    caption: 'Closed Date', evidence: ['closure_codes'] }
});

function completenessSources(issue, record) {
  const spec = COMPLETENESS[issue.check_id];
  if (!spec) return null;
  const caption = record.printed && record.printed[spec.caption];
  if (!caption || caption.state !== 'LABEL_PRINTED_WITHOUT_VALUE' || !caption.location) return null;
  const e = issue.evidence || {};
  const events = spec.evidence.flatMap((key) => Array.isArray(e[key]) ? e[key] : []);
  const sameLocation = (a, b) => a && b && a.page === b.page && a.line === b.line;
  const history = (record.facts && record.facts['account.paymentHistoryCells']) || [];
  const rows = Array.isArray(record.monthly_rows) ? record.monthly_rows : [];
  const legend = record.account_material && record.account_material.narrative_legend || {};
  const event = events.find((item) => {
    if (!item || !item.code || !item.location) return false;
    const meaning = item.meaning_as_the_report_prints_it || item.meaning;
    if (!meaning) return false;
    const rating = Array.isArray(history) && history.some((cell) => cell.code === item.code
      && cell.meaning === meaning && cell.uncertain !== true && sameLocation(cell.location, item.location));
    const narrative = rows.some((row) => Array.isArray(row.narrative_codes)
      && row.narrative_codes.includes(item.code) && legend[item.code] === meaning
      && sameLocation(row.location, item.location));
    return rating || narrative;
  });
  if (!event) return null;
  return [
    { field: spec.caption, role: 'printed_caption_without_value', source: {
      omitted_value: true, state: caption.state, raw_value: null, normalized_value: null,
      source_field: spec.caption, location: caption.location, record_index: record.record_index } },
    { field: 'account.reported_event', role: 'report_defined_event', source: {
      raw_value: event.code, normalized_value: event.code,
      source_field: event.meaning_as_the_report_prints_it || event.meaning,
      location: event.location, record_index: record.record_index } }
  ];
}

function assess(issue, record, evaluation, extraction) {
  if (!issue || !record || !evaluation || !evaluation.region
    || record.status !== 'RESOLVED' && record.shared_facts_status !== 'RESOLVED') return null;
  let requirement = REPORT_RULES[issue.check_id];
  if (issue.check_id === 'COMMON-ERROR-LAST-PAYMENT-OR-FIRST-DELINQUENCY-DATE') {
    if (issue.reason === 'DATE_AFTER_REPORT_ISSUED') requirement = 'A payment or first delinquency cannot occur after the report was issued.';
    else if (issue.reason === 'DATE_BEFORE_ACCOUNT_OPENED') requirement = 'A payment or first delinquency cannot predate the opening of its account.';
  }
  if (!requirement) return null;
  const omission = completenessSources(issue, record);
  const paymentHistory = omission ? null : paymentHistorySources(issue, record);
  const paired = omission || paymentHistory ? null : pairedRecordSources(issue, record, extraction);
  const fields = omission || paymentHistory || paired ? null : decisiveFields(issue, record);
  const required = omission || paymentHistory || paired || (fields && fields.length >= 2
    ? fields.map((field) => ({ field, source: sourceForField(record, field) })) : null);
  if (!required || required.length < 2) return null;
  if (!required.every(({ field, source, record_index }) => source
    && source.record_index === (record_index == null ? record.record_index : record_index)
    && source.location && (source.raw_value != null || source.omitted_value === true)
    && (source.omitted_value === true || field === 'account.paymentHistoryCells'
      || field === 'account.reported_event' || String(source.normalized_value) === String(
        field === 'report.referenceDate' ? (reportReference(record) || {}).normalized_value :
        record_index == null || record_index === record.record_index ? record.facts[field]
          : extraction.records.find((r) => r.record_index === record_index).facts[field])))) return null;
  const adapterId = RULE_BY_REGION[evaluation.region];
  const candidate = adapterId && adaptersForRegion(evaluation.region)
    .some((entry) => entry.adapter_id === adapterId && entry.confirmed === true)
    ? ADAPTERS.find((a) => a.adapter_id === adapterId) : null;
  const presentations = candidate && (Array.isArray(candidate.presentation_required)
    ? candidate.presentation_required : [candidate.presentation_required]);
  const rule = candidate && presentations.includes(evaluation.presentation)
    && (!Array.isArray(candidate.record_kinds) || candidate.record_kinds.includes(record.kind))
    && candidate.source_entry_id && candidate.source_version && candidate.citation
    ? candidate : null;
  const classification = omission || ['COMMON-ERROR-REVOLVING-BALANCE-ZERO-LIMIT',
    'COMMON-ERROR-REPORTED-DATES-OUT-OF-ORDER',
    'COMMON-ERROR-DUPLICATE-REPORTING',
    'COMMON-ERROR-COLLECTION-ORIGINAL-BOTH-DUE'].includes(issue.check_id)
    ? 'POTENTIAL_VIOLATION' : 'PROBABLE_VIOLATION';
  return {
    classification,
    rule_id: issue.check_id,
    requirement,
    supporting_statutes: rule ? [{ rule_id: adapterId, citation: rule.citation,
      source_entry_id: rule.source_entry_id, source_version: rule.source_version }] : [],
    citation: rule ? rule.citation : null,
    source_entry_id: rule ? rule.source_entry_id : null,
    source_version: rule ? rule.source_version : null,
    jurisdiction: evaluation.region,
    required_facts: required,
    unresolved: omission
      ? 'The report does not establish whether the missing date is necessary for this information to be complete for its use or whether the underlying file contains it.'
      : 'The report does not establish which printed value is inaccurate or the source records and procedures used to prepare it.'
  };
}

module.exports = { assess, RULE_BY_REGION, REPORT_RULES };
