'use strict';

/* One checklist mapping over frozen, owned report snapshots. Later adverse/update/placement
 * dates are never substitutes for a first-delinquency anchor. */
const { MATCH, matchRecords, recordBureau } = require('./account-identity.cjs');
const { sourceForField, reportReference } = require('./report-fact-sources.cjs');
const { calendar: { parseIso, daysInMonth } } = require('../adapters/evaluation-primitives.cjs');
const CHECK_ID = 'COMMON-ERROR-POTENTIAL-RE-AGING-SIGNAL';
const ANCHOR = 'tradeline.firstDelinquencyDate';
const IDENTITY = ['account.masked_identifier', 'account.reported_identity'];

function interval(value, precision) {
  if (typeof value !== 'string') return null;
  const month = /^(\d{4})-(\d{2})(?:-\d{2})?$/.exec(value);
  if (month && (value.length === 7 || /^MONTH(?:_LEVEL)?$/.test(precision || ''))) {
    const year = +month[1], number = +month[2];
    if (number < 1 || number > 12) return null;
    const prefix = `${month[1]}-${month[2]}`;
    return { first: `${prefix}-01`, last: `${prefix}-${String(daysInMonth(year, number)).padStart(2, '0')}` };
  }
  return parseIso(value) ? { first: value, last: value } : null;
}

function resolved(record) {
  return record && (record.status === 'RESOLVED' || record.shared_facts_status === 'RESOLVED');
}

function anchorRange(record) {
  const source = sourceForField(record, ANCHOR);
  const printed = Object.values(record.printed || {}).find((p) => p && p.normalized === record.facts[ANCHOR]);
  const range = source && interval(source.normalized_value, record.facts[`${ANCHOR}Precision`]
    || source.precision || (printed && printed.precision));
  const opened = interval((record.facts || {})['liability.openedDate'], record.facts['liability.openedDatePrecision']);
  const report = reportRange(record);
  return range && report && range.first <= report.last && (!opened || range.last >= opened.first) ? range : null;
}

function reportDate(record) {
  const reference = reportReference(record);
  return reference && reportRange(record) ? reference.normalized_value : null;
}

function reportRange(record) {
  const reference = reportReference(record);
  return reference && interval(reference.normalized_value, reference.precision);
}

function fixedEvidence(record) {
  if (/COLLECTION/.test(record.kind || '')) return [];
  const status = sourceForField(record, 'account.status');
  if (status && /collection|charg(?:e|ed)[ -]?off|written[ -]?off|default/i.test(status.normalized_value)) return [];
  const history = record.facts && record.facts['account.paymentHistoryCells'];
  const legend = record.facts && record.facts['account.paymentHistoryLegend'];
  if (!Array.isArray(history) || !Array.isArray(legend)) return null;
  for (const cell of history) {
    if (!cell || cell.uncertain === true || !cell.code || !cell.raw_period || !cell.location
      || cell.location.trusted === false || !historyPeriod(cell.period)
      || historyPeriod(cell.period).first > reportRange(record).last
      || !/collection|write[ -]?off|bad debt|charge[ -]?off/i.test(cell.meaning || '')) continue;
    const definition = legend.find((item) => item.code === cell.code && item.meaning === cell.meaning
      && item.location && item.location.trusted !== false);
    if (!definition) continue;
    return [{ field: 'account.fixed_obligation_history', source: { raw_value: cell.code,
      normalized_value: cell.code, source_field: `Payment history ${cell.raw_period}`, location: cell.location,
      record_index: record.record_index } },
    { field: 'account.fixed_obligation_legend', source: { raw_value: `${definition.code}=${definition.meaning}`,
      normalized_value: definition.meaning, source_field: 'Report-defined payment history meaning',
      location: definition.location, record_index: record.record_index } }];
  }
  return null;
}

function resetEvidence(record) {
  const status = sourceForField(record, 'account.status');
  if (status && /paid|settled|satisf|current|cured|reopen|reset|new obligation|transfer/i.test(status.normalized_value)) return true;
  // Explicit reopen/reset captions exclude the pair even when no shared fact is mapped.
  return Object.entries(record.printed || {}).some(([key, reading]) => reading && reading.location
    && reading.raw != null && reading.state !== 'LABEL_PRINTED_WITHOUT_VALUE'
    && /reopen|cured|reset|new obligation/i.test(`${key} ${reading.label || ''}`));
}

function compatibleOpening(a, b) {
  const field = 'liability.openedDate';
  const av = (a.facts || {})[field], bv = (b.facts || {})[field];
  if (av == null || bv == null) return true;
  const as = sourceForField(a, field), bs = sourceForField(b, field);
  const ar = as && interval(av, a.facts[`${field}Precision`]);
  const br = bs && interval(bv, b.facts[`${field}Precision`]);
  return Boolean(ar && br && ar.first <= br.last && br.first <= ar.last);
}

function cureBetween(earlier, current) {
  const cells = (current.facts || {})['account.paymentHistoryCells'];
  return Array.isArray(cells) && cells.some((cell) => {
    const period = cell && historyPeriod(cell.period);
    return period && cell.location && cell.uncertain !== true && cell.code != null
      && /current|satisf|on[ -]?time|paid as agreed|pays as agreed/i.test(cell.meaning || '')
      && period.first > anchorRange(earlier).last && period.last < anchorRange(current).first;
  });
}

function historyPeriod(value) {
  const raw = String(value || '').trim();
  const numeric = /^(?:(\d{4})-(\d{1,2})|(\d{1,2})\/(\d{4}))$/.exec(raw);
  if (numeric) return interval(`${numeric[1] || numeric[4]}-${String(numeric[2] || numeric[3]).padStart(2, '0')}`, 'MONTH');
  const written = /^([A-Za-z]+)\s+(\d{4})$/.exec(raw);
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const number = written && months.indexOf(written[1].slice(0, 3).toLowerCase()) + 1;
  return number ? interval(`${written[2]}-${String(number).padStart(2, '0')}`, 'MONTH') : null;
}

function corroborated(a, b) {
  return resolved(a) && resolved(b) && matchRecords(a, b).state === MATCH.CONFIDENT
    && recordBureau(a) && recordBureau(b)
    && String(recordBureau(a)).toUpperCase() === String(recordBureau(b)).toUpperCase()
    && IDENTITY.every((field) => sourceForField(a, field) && sourceForField(b, field))
    && compatibleOpening(a, b);
}

function evidenceFacts(record, role, snapshot) {
  const fields = ['report.referenceDate', ...IDENTITY, ANCHOR];
  if (sourceForField(record, 'liability.openedDate')) fields.push('liability.openedDate');
  if (sourceForField(record, 'account.status')) fields.push('account.status');
  return [...fields.map((field) => ({ field, source: sourceForField(record, field) })), ...(fixedEvidence(record) || [])]
    .map(({ field, source }) => ({ field, role, record_index: record.record_index,
    source: { ...source, role,
      source_result_id: snapshot ? snapshot.result_id : null,
      source_file_id: record.source_file_id,
      bureau: recordBureau(record), report_reference_date: reportDate(record) } }));
}

function evaluate(extraction, snapshots) {
  const records = extraction && extraction.records || [];
  const matches = [];
  let applicable = false;
  for (const current of records) {
    if (!resolved(current) || !current.source_file_id || !fixedEvidence(current)
      || resetEvidence(current) || !anchorRange(current) || !reportDate(current)) continue;
    const candidates = [];
    for (const snapshot of snapshots || []) {
      if (!snapshot || !snapshot.result_id || !snapshot.extraction) continue;
      const priorRecords = snapshot.extraction.records || [];
      // Count identity collisions before eligibility/reading filters: an unreadable twin is still ambiguous.
      const forward = priorRecords.filter((record) => matchRecords(record, current).state === MATCH.CONFIDENT);
      if (forward.length !== 1) continue;
      const earlier = forward[0];
      const reverse = records.filter((record) => matchRecords(earlier, record).state === MATCH.CONFIDENT);
      if (reverse.length !== 1 || !corroborated(earlier, current) || !earlier.source_file_id
        || !reportRange(earlier) || reportRange(earlier).last >= reportRange(current).first) continue;
      candidates.push({ earlier, snapshot });
    }
    const resetDates = candidates.filter(({ earlier }) => resetEvidence(earlier)).map(({ earlier }) => reportRange(earlier).last);
    const resetCutoff = resetDates.sort().at(-1);
    const valid = candidates.filter(({ earlier }) => fixedEvidence(earlier) && !resetEvidence(earlier)
      && (!resetCutoff || reportRange(earlier).first > resetCutoff) && anchorRange(earlier));
    if (valid.length) applicable = true;
    const changed = valid.filter(({ earlier }) => anchorRange(current).first > anchorRange(earlier).last && !cureBetween(earlier, current))
      .sort((a, b) => anchorRange(a.earlier).first.localeCompare(anchorRange(b.earlier).first)
        || reportDate(a.earlier).localeCompare(reportDate(b.earlier)) || a.snapshot.result_id.localeCompare(b.snapshot.result_id));
    if (!changed.length) continue;
    const { earlier, snapshot } = changed[0];
    matches.push({ record_index: current.record_index, kind: current.kind, kind_label: current.kind_label,
      source_file_id: current.source_file_id, location: sourceForField(current, ANCHOR).location,
      reason: 'SAME_FIXED_OBLIGATION_DELINQUENCY_ANCHOR_MOVED_FORWARD',
      evidence: { earlier_anchor: earlier.facts[ANCHOR], current_anchor: current.facts[ANCHOR],
        earlier_report_date: reportDate(earlier), current_report_date: reportDate(current),
        earlier_result_id: snapshot.result_id, earlier_record_index: earlier.record_index,
        facts: [...evidenceFacts(earlier, 'earlier_report', snapshot), ...evidenceFacts(current, 'current_report', null)] } });
  }
  return applicable ? { check_id: CHECK_ID, check_class: 'COMMON_ERROR',
    label: 'a changed first-delinquency date on the same obligation',
    state: matches.length ? 'POTENTIAL_ISSUE' : 'NOT_DETECTED', output_ceiling: 'observation', source_records: matches,
    plain: matches.length ? 'The same obligation prints a later first-delinquency date in a later report.'
      : 'No forward first-delinquency change was detected in the corroborated report pairs assessed.' } : null;
}

function validatedSources(issue, extraction, snapshots) {
  if (issue.check_id !== CHECK_ID) return null;
  const result = evaluate(extraction, snapshots);
  const match = result && result.source_records.find((item) => item.record_index === issue.record_index
    && item.reason === issue.reason && JSON.stringify(item.evidence) === JSON.stringify(issue.evidence));
  return match ? match.evidence.facts : null;
}

/** Retain only identity-related earlier records; collisions/reset evidence stay in the frozen pair. */
function freezeBaselines(extraction, snapshots) {
  const current = extraction && extraction.records || [];
  const selected = (snapshots || []).flatMap((snapshot) => {
    if (!snapshot || !snapshot.result_id || !snapshot.extraction) return [];
    const records = (snapshot.extraction.records || []).filter((earlier) => current.some((later) =>
      matchRecords(earlier, later).state === MATCH.CONFIDENT));
    const datedPair = records.some((earlier) => current.some((later) =>
      matchRecords(earlier, later).state === MATCH.CONFIDENT && recordBureau(earlier) && recordBureau(later)
      && String(recordBureau(earlier)).toUpperCase() === String(recordBureau(later)).toUpperCase()
      && reportRange(earlier) && reportRange(later) && reportRange(earlier).last < reportRange(later).first));
    if (!datedPair) return [];
    const fields = ['record_index', 'kind', 'kind_label', 'status', 'shared_facts_status', 'facts', 'printed',
      'fact_sources', 'bureau', 'source_bureau', 'source_file_id', 'report_reference_date', 'source_report_reference_date'];
    return [{ result_id: snapshot.result_id, case_id: snapshot.case_id,
      extraction: { records: records.map((record) => Object.fromEntries(fields.filter((field) => record[field] !== undefined)
        .map((field) => [field, record[field]]))) } }];
  });
  return JSON.parse(JSON.stringify(selected));
}

module.exports = { CHECK_ID, evaluate, validatedSources, freezeBaselines };
