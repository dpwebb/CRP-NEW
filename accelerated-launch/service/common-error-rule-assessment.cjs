'use strict';

/* A sourced breach of a report-data rule is a product violation assessment in every
 * supported jurisdiction. A statute can supply additional context, but is never a gate. */
const { ADAPTERS, adaptersForRegion } = require('../adapters/rule-adapters.cjs');
const APPLICABILITY = require('../adapters/applicability-records.json');

const { sourceForField, reportReference, reportSnapshotKey, validatedPrintedHistoryDefinition, requiresPrintedHistoryDefinition } = require('./report-fact-sources.cjs');
const { validatedDefinition } = require('./report-code-definitions.cjs');
const reaging = require('./reaging.cjs');

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
  'COMMON-ERROR-POTENTIAL-RE-AGING-SIGNAL': 'The first missed-payment date for the same account must not move forward unless the account history shows the old date was wrong or a new period of missed payments began.',
  'COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY': 'An account cannot close before it opened.',
  'COMMON-ERROR-REPORTED-DATES-OUT-OF-ORDER': 'An account cannot first be reported before it opened.',
  'COMMON-ERROR-STATUS-DATE-CONTRADICTION': 'An account cannot be both open and closed on the same report.',
  'COMMON-ERROR-PAID-SETTLED-SHOWN-UNPAID': 'An account marked paid in full cannot also show money still owed.',
  'COMMON-ERROR-BALANCE-PAYMENT-INCONSISTENCY': 'The past-due amount cannot be more than the current balance on the same account in the same report.',
  'COMMON-ERROR-REVOLVING-BALANCE-ZERO-LIMIT': 'A balance on a credit account with a credit limit of zero needs an explanation.',
  'COMMON-ERROR-DUPLICATE-REPORTING': 'The same account should not be listed as two separate debts in one report.',
  'COMMON-ERROR-RESPONSIBILITY-INCONSISTENCY': 'One report should not give conflicting answers about who is responsible for the same account.',
  'COMMON-ERROR-COLLECTION-ORIGINAL-BOTH-DUE': 'A debt collection entry and its linked original account should not make one debt look like two amounts still owed.',
  'COMMON-ERROR-LAST-PAYMENT-OR-FIRST-DELINQUENCY-DATE': 'A payment or first missed payment cannot happen before the account opened or after the report date.',
  'COMMON-ERROR-PAYMENT-HISTORY-INCONSISTENCY': 'One report cannot give two conflicting payment statuses for the same account and period.',
  'COMMON-ERROR-ADVERSE-ENTRY-WITHOUT-A-DELINQUENCY-ANCHOR': 'A reported account problem needs a date so it can be checked.',
  'COMMON-ERROR-WRITE-OFF-WITHOUT-A-CHARGE-OFF-DATE': 'If a report says the lender wrote off an account as a loss, it needs the write-off date so this can be checked.',
  'COMMON-ERROR-CLOSURE-STATED-WITHOUT-A-CLOSED-DATE': 'If a report says an account is closed, it needs the closed date so this can be checked.'
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
  const inPeriod = cells.filter((c) => c && c.period === e.period && c.uncertain !== true && c.performance_usable !== false
    && c.code != null && c.meaning && c.location && c.raw_period
    && (!requiresPrintedHistoryDefinition(c) || validatedPrintedHistoryDefinition(c)));
  const first = inPeriod.find((c) => c.code === e.first_code && c.meaning === e.first_meaning);
  const second = inPeriod.find((c) => c !== first && c.code === e.second_code && c.meaning === e.second_meaning);
  if (!first || !second || String(first.meaning).trim().toUpperCase() === String(second.meaning).trim().toUpperCase()) return null;
  if ([first, second].some((cell) => (cell.code_definition
    || ['FAM-US-EXP-CONSUMER', 'FAM-GB-EXP-CONSUMER'].includes(record.reader_family_id))
    && !validatedDefinition(cell, record))) return null;
  return [first, second].flatMap((cell, index) => {
    const role = index === 0 ? 'first_printed_cell' : 'second_printed_cell';
    const facts = [{ field: 'account.paymentHistoryCells', role,
      source: { raw_value: cell.raw_symbol ? 'Graphical repayment symbol' : cell.raw_code || cell.code, normalized_value: cell.code,
        source_field: cell.printed_definition && cell.source_field || `Payment history ${cell.raw_period}`,
        location: { ...cell.location, ...(cell.row_label_location ? { caption_location: cell.row_label_location } : {}) },
        record_index: record.record_index,
        ...(cell.raw_symbol ? { raw_symbol: cell.raw_symbol } : {}),
        ...(cell.legend ? { legend: cell.legend } : {}),
        ...(cell.period_location ? { period_location: cell.period_location } : {}),
        ...(cell.code_definition ? { code_definition: cell.code_definition } : {}) } }];
    const printedDefinition = validatedPrintedHistoryDefinition(cell);
    if (printedDefinition) facts.push({ field: 'account.paymentHistoryPrintedDefinition', role: `${role}_printed_definition`,
      source: { raw_value: printedDefinition.location.raw || `${printedDefinition.code}=${printedDefinition.meaning}`,
        normalized_value: printedDefinition.meaning,
        source_field: printedDefinition.heading_location?.raw || 'Report printed payment-history key',
        record_index: record.record_index, location: { ...printedDefinition.location,
          ...(printedDefinition.heading_location ? { caption_location: printedDefinition.heading_location } : {}),
          ...(printedDefinition.code_location ? { code_location: printedDefinition.code_location } : {}),
          ...(printedDefinition.meaning_location ? { meaning_location: printedDefinition.meaning_location } : {}),
          ...(printedDefinition.alternatives ? { alternatives: printedDefinition.alternatives } : {}) } } });
    if (printedDefinition) facts.push({ field: 'account.paymentHistoryPrintedPeriod', role: `${role}_printed_period`,
      source: { raw_value: cell.period_location.month.raw, normalized_value: cell.period,
        source_field: cell.period_location.month.source_field || 'Payment history period', record_index: record.record_index,
        location: { ...cell.period_location.month,
          ...(cell.period_location.label ? { caption_location: cell.period_location.label } : {}),
          ...(cell.period_location.year ? { year_location: cell.period_location.year } : {}),
          ...(cell.period_location.heading ? { heading_location: cell.period_location.heading } : {}) } } });
    const definition = cell.code_definition && validatedDefinition(cell, record);
    if (definition) facts.push({ field: 'account.paymentHistoryDefinition', role: `${role}_definition`,
      source: { raw_value: definition.meaning, normalized_value: cell.meaning,
        source_field: `Experian published meaning of ${cell.code}`, record_index: record.record_index,
        location: { url: definition.source.url, section: definition.source.section,
          source_kind: definition.source.source_kind }, code_definition: definition } });
    if (definition && cell.period_definition && cell.period_location && cell.period_location.anchor) {
      const anchor = cell.period_location.anchor;
      facts.push({ field: 'account.paymentHistoryPeriodAnchor', role: `${role}_period_anchor`, source: {
        raw_value: anchor.raw_value, normalized_value: anchor.normalized_value,
        source_field: cell.period_derivation.anchor_field, location: anchor, record_index: record.record_index } });
      const period = cell.period_definition;
      facts.push({ field: 'account.paymentHistoryPeriodDefinition', role: `${role}_period_definition`, source: {
        raw_value: 'Most recent month first; one calendar month per history cell',
        normalized_value: 'Most recent month first; one calendar month per history cell',
        source_field: 'Published payment-history order', record_index: record.record_index,
        location: { url: period.source.url, section: period.source.section, source_kind: period.source.source_kind },
        period_definition: period } });
    }
    if (cell.raw_symbol && cell.legend && cell.legend.location && cell.legend.raw_value != null) {
      facts.push({ field: 'account.paymentHistoryLegend', role: `${role}_legend`,
        source: { raw_value: cell.legend.raw_value, normalized_value: cell.meaning,
          source_field: 'Report-defined repayment symbol meaning', location: cell.legend.location,
          record_index: record.record_index, raw_symbol: cell.legend.raw_symbol || null } });
    }
    return facts;
  });
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
    || reportSnapshotKey(other) !== reportSnapshotKey(record)) return null;
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
        && String(record.facts[field]) === String(other.facts[field])
        && sourceForField(record, field) && sourceForField(other, field));
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
  if (!caption || caption.state !== 'LABEL_PRINTED_WITHOUT_VALUE' || !caption.location
    || caption.trusted === false || caption.location.trusted === false) return null;
  const e = issue.evidence || {};
  const events = spec.evidence.flatMap((key) => Array.isArray(e[key]) ? e[key] : []);
  const sameLocation = (a, b) => a && b && a.page === b.page && a.line === b.line;
  const history = (record.facts && record.facts['account.paymentHistoryCells']) || [];
  const rows = Array.isArray(record.monthly_rows) ? record.monthly_rows : [];
  const legend = record.account_material && record.account_material.narrative_legend || {};
  const event = events.find((item) => {
    if (!item || !item.location || !item.code && !item.literal_statement) return false;
    const meaning = item.meaning_as_the_report_prints_it || item.meaning;
    if (!meaning) return false;
    const rating = Array.isArray(history) && history.some((cell) => cell.code === item.code
      && cell.meaning === meaning && cell.uncertain !== true && cell.performance_usable !== false
      && sameLocation(cell.location, item.location));
    const narrative = rows.some((row) => Array.isArray(row.narrative_codes)
      && row.narrative_codes.includes(item.code) && legend[item.code] === meaning
      && sameLocation(row.location, item.location));
    const literal = item.literal_statement && (record.report_status_statements || []).some((statement) =>
      statement && statement.trusted === true && statement.caption_count === 1 && !statement.reason
      && statement.location && statement.location.trusted === true
      && statement.raw_value === meaning && statement.meaning === meaning
      && statement.source_field === item.source_field
      && JSON.stringify(statement.location) === JSON.stringify(item.location));
    return rating || narrative || literal;
  });
  if (!event) return null;
  return [
    { field: spec.caption, role: 'printed_caption_without_value', source: {
      omitted_value: true, state: caption.state, raw_value: null, normalized_value: null,
      source_field: caption.label || spec.caption, location: caption.location, record_index: record.record_index } },
    { field: 'account.reported_event', role: 'report_defined_event', source: {
      raw_value: event.literal_statement ? event.meaning_as_the_report_prints_it : event.code,
      normalized_value: event.literal_statement ? event.meaning_as_the_report_prints_it : event.code,
      source_field: event.literal_statement ? event.source_field : event.meaning_as_the_report_prints_it || event.meaning,
      location: event.location, record_index: record.record_index } }
  ];
}

function assess(issue, record, evaluation, extraction) {
  if (!issue || !record || !evaluation || !evaluation.region
    || record.status !== 'RESOLVED' && record.shared_facts_status !== 'RESOLVED') return null;
  let requirement = REPORT_RULES[issue.check_id];
  if (issue.check_id === 'COMMON-ERROR-LAST-PAYMENT-OR-FIRST-DELINQUENCY-DATE') {
    if (issue.reason === 'DATE_AFTER_REPORT_ISSUED') requirement = 'A payment or first missed payment cannot happen after the report date.';
    else if (issue.reason === 'DATE_BEFORE_ACCOUNT_OPENED') requirement = 'A payment or first missed payment cannot happen before the account opened.';
  }
  if (!requirement) return null;
  const historical = reaging.validatedSources(issue, extraction, evaluation.reaging_baselines);
  if (issue.check_id === reaging.CHECK_ID && !historical) return null;
  const omission = completenessSources(issue, record);
  const paymentHistory = omission ? null : paymentHistorySources(issue, record);
  const paired = omission || paymentHistory ? null : pairedRecordSources(issue, record, extraction);
  const fields = omission || paymentHistory || paired ? null : decisiveFields(issue, record);
  const required = historical || omission || paymentHistory || paired || (fields && fields.length >= 2
    ? fields.map((field) => ({ field, source: sourceForField(record, field) })) : null);
  if (!required || required.length < 2) return null;
  if (!historical && !required.every(({ field, source, record_index }) => source
    && source.record_index === (record_index == null ? record.record_index : record_index)
    && source.location && (source.raw_value != null || source.omitted_value === true)
    && (source.omitted_value === true || field === 'account.paymentHistoryCells'
      || field === 'account.paymentHistoryDefinition' && paymentHistory && source.code_definition
        && source.normalized_value === source.code_definition.meaning
      || field === 'account.paymentHistoryPeriodAnchor' && paymentHistory
      || ['account.paymentHistoryPrintedDefinition', 'account.paymentHistoryPrintedPeriod'].includes(field) && paymentHistory
      || field === 'account.paymentHistoryPeriodDefinition' && paymentHistory && source.period_definition
      || field === 'account.paymentHistoryLegend' && paymentHistory
        && source.raw_value === source.normalized_value
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
    'COMMON-ERROR-POTENTIAL-RE-AGING-SIGNAL',
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
    unresolved: historical ? 'The later report may have corrected the old date or show a new period of missed payments.' : omission
      ? 'The missing date may be needed to check this entry. The bureau or lender may have the date in its records.'
      : 'The report does not show which value is wrong or how the information was checked.'
  };
}

/** Preserve supported legacy verification paths, but never offer a decisive reading the reader explicitly rejected. */
function hasUnusableDecisiveSource(issue, record, extraction) {
  if (!record) return true;
  if (issue.check_id === 'COMMON-ERROR-PAYMENT-HISTORY-INCONSISTENCY'
    && (['FAM-US-EXP-CONSUMER', 'FAM-GB-EXP-CONSUMER'].includes(record.reader_family_id)
      || (record.facts?.['account.paymentHistoryCells'] || []).some(requiresPrintedHistoryDefinition))
    && !paymentHistorySources(issue, record)) return true;
  if (issue.check_id === 'COMMON-ERROR-LAST-PAYMENT-OR-FIRST-DELINQUENCY-DATE'
    && issue.reason === 'DATE_AFTER_REPORT_ISSUED' && Object.hasOwn(record, 'report_reference_date') && !reportReference(record)) return true;
  const rejected = (row, fields) => Boolean(row && fields && fields.some((field) =>
    row.fact_sources && Object.hasOwn(row.fact_sources, field) && !sourceForField(row, field)));
  const fields = decisiveFields(issue, record);
  if (fields) return rejected(record, fields);
  const paired = ['COMMON-ERROR-DUPLICATE-REPORTING', 'COMMON-ERROR-RESPONSIBILITY-INCONSISTENCY',
    'COMMON-ERROR-COLLECTION-ORIGINAL-BOTH-DUE'];
  if (!paired.includes(issue.check_id)) return false;
  const e = issue.evidence || {};
  const index = e.duplicate_of_record ?? e.other_record ?? e.original_record;
  const other = extraction && (extraction.records || []).find((row) => row.record_index === index);
  if (!other || other.source_bureau !== record.source_bureau
    || reportSnapshotKey(other) !== reportSnapshotKey(record)) return true;
  const identity = ['account.masked_identifier', 'account.reported_identity'];
  if (rejected(record, identity) || rejected(other, identity)) return true;
  if (issue.check_id === 'COMMON-ERROR-DUPLICATE-REPORTING') {
    const shared = ['account.amount', 'account.creditLimit', 'account.status'].filter((field) =>
      record.facts[field] != null && other && String(record.facts[field]) === String((other.facts || {})[field]));
    return shared.length > 0 && shared.every((field) => rejected(record, [field]) || rejected(other, [field]));
  }
  const extra = issue.check_id === 'COMMON-ERROR-RESPONSIBILITY-INCONSISTENCY' ? ['account.responsibility']
    : issue.check_id === 'COMMON-ERROR-COLLECTION-ORIGINAL-BOTH-DUE' ? ['account.balance', 'account.amount']
      : ['account.amount', 'account.creditLimit', 'account.status'];
  return rejected(record, extra) || rejected(other, extra);
}

module.exports = { assess, hasUnusableDecisiveSource, RULE_BY_REGION, REPORT_RULES };
