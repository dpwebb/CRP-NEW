'use strict';
/**
 * comparison.cjs — BLOCKER-SUBSCRIPTION-VALUE-001: owned report history and evidence-based comparison.
 *
 * OWNER-SUBSCRIBER-OFFERING-001 item 7: a subscriber owns their report history and can compare a subsequent
 * report with an earlier owned report, tracking whether previously identified issues remain, change or no longer
 * appear. Absence in a later report alone never proves a correction, deletion, bureau action or compliance.
 *
 * REUSE, NOT RE-DERIVATION: every comparison reads the ALREADY-PERSISTED report facts (extractions), the
 * persisted result and the unified issue descriptor (`issues.cjs`). It never re-reads a report, never overwrites
 * an earlier fact or result, and never writes anything — it is a pure read-only view. Record matching reuses the
 * SAME supported identity evidence the duplicate check uses, never the record index, a balance, a single date or
 * a creditor name alone. Source-validated collection duplicate groups use the shared collection-pair contract;
 * ordinary account matching keeps its masked account identifier and printed creditor/account identity.
 */
const { ServiceError } = require('./errors.cjs');
const cases = require('./cases.cjs');
const issues = require('./issues.cjs');
const commonErrors = require('./common-errors.cjs');
const { reportDateValue, sourceForField } = require('./report-fact-sources.cjs');
const { COLLECTION_PAIR_BASIS, COLLECTION_MEMBER_PAIR_BASIS, COLLECTION_PAIR_FIELDS,
  isCollection, collectionPair } = require('./duplicate-account-pair.cjs');

const OUTCOME = Object.freeze({
  STILL_OBSERVED: 'STILL_OBSERVED',
  CHANGED: 'CHANGED',
  NO_LONGER_OBSERVED: 'NO_LONGER_OBSERVED',
  NOT_COMPARABLE: 'NOT_COMPARABLE'
});

const { MATCH, matchRecords, recordBureau } = require('./account-identity.cjs');
const ABSENCE_NOTE = 'A difference here is what two reports print, not proof of anything: absence in a later report alone never proves a correction, deletion, a bureau action or compliance.';

function factsOf(record) { return (record && record.facts) || {}; }

function recordReportDate(record) {
  const r = record && record.report_reference_date;
  return reportDateValue(r);
}

function issueCategory(issue) {
  if (issue.basis_type === issues.BASIS_TYPE.FACTUAL_CONSISTENCY) return issue.check_id || null;
  return issue.adapter_id || null;
}

/** The normalized fact fields the issue's own check reads. Missing on the later record = not comparable. */
function requiredFields(issue) {
  if (issue.basis_type === issues.BASIS_TYPE.FACTUAL_CONSISTENCY) return commonErrors.ISSUE_TYPE_FIELD_REQUIREMENTS[issue.check_id] || [];
  if (issue.basis_type === issues.BASIS_TYPE.CONTENT_FINDING) return (issue.source_facts || []).map((f) => f.field).filter(Boolean);
  return issue.anchor_field ? [issue.anchor_field] : [];
}

/** The value-bearing evidence of one issue, excluding source locations (which differ between reports). */
function issueSignature(issue) {
  const facts = (issue.source_facts || [])
    .map((f) => `${f.source_field || f.field || ''}=${JSON.stringify(f.normalized_value != null ? f.normalized_value : f.raw_value)}`)
    .sort();
  const evidence = issue.evidence ? JSON.stringify(issue.evidence) : '';
  return `${issueCategory(issue)}::${facts.join('|')}::${evidence}`;
}

function issueView(issue) {
  if (!issue) return null;
  return {
    category: issueCategory(issue),
    confidence: issue.confidence,
    request_type: issue.request_type || null,
    explanation: issue.explanation || null,
    uncertainty: issue.uncertainty || null,
    evidence: issue.evidence || null,
    source_facts: (issue.source_facts || []).map((f) => ({ source_field: f.source_field || f.field || null, raw_value: f.raw_value != null ? f.raw_value : null, normalized_value: f.normalized_value != null ? f.normalized_value : null }))
  };
}

function reportIdentityOf(extraction) {
  const ext = extraction || {};
  const ref = reportDateValue(ext.reference_date);
  return { bureau: ext.bureau || null, report_date: ref, presentation_id: ext.presentation_id || null };
}

/** One owned result row, resolved through the account that owns it (404 for an unknown id, 403 for another account). */
function resultRowFor(store, actor, resultId) {
  const row = store.state().results.find((r) => r.result_id === resultId);
  if (!row) throw new ServiceError('NOT_FOUND');
  if (row.account_id !== actor.account_id) throw new ServiceError('NOT_AUTHORIZED');
  cases.requireOwnedCase(store, actor, row.case_id);
  return row;
}

function assessmentSummary(store, row) {
  const caseRow = store.state().cases.find((c) => c.case_id === row.case_id) || {};
  const ident = reportIdentityOf(row.extraction);
  const all = issues.issuesFor({ evaluation: row.evaluation, extraction: row.extraction });
  const list = all.filter(issue => issue.basis_type !== issues.BASIS_TYPE.LIMITATION_ASSESSMENT);
  return {
    result_id: row.result_id,
    case_id: row.case_id,
    country: caseRow.country || null,
    region: caseRow.region || null,
    jurisdiction: caseRow.country && caseRow.region ? `${caseRow.country}-${caseRow.region}` : null,
    bureau: ident.bureau,
    report_date: ident.report_date,
    recorded_at: row.created_at,
    issue_count: list.length,
    information_count: all.length - list.length,
    is_a_finding_case: list.some((i) => i.confidence === issues.CONFIDENCE.DEFINITE || i.confidence === issues.CONFIDENCE.PROBABLE)
  };
}

/** The account's OWNED report history: one entry per persisted assessment, newest report first. */
function historyView(store, actor) {
  const rows = store.state().results.filter((r) => r.account_id === actor.account_id);
  const assessments = rows.map((r) => assessmentSummary(store, r));
  assessments.sort((a, b) => {
    const da = a.report_date || '';
    const db = b.report_date || '';
    if (da !== db) return da < db ? 1 : -1;
    return a.recorded_at < b.recorded_at ? 1 : -1;
  });
  return { assessments, total: assessments.length };
}

const COLLECTION_DUPLICATE = 'COMMON-ERROR-DUPLICATE-REPORTING';
const COLLECTION_DETAIL_FIELDS = Object.freeze(['account.masked_identifier', 'account.member_reference',
  'account.reported_identity', 'tradeline.firstDelinquencyDate', 'tradeline.lastPaymentDate',
  'liability.openedDate', 'account.balance', 'account.amount', 'account.status',
  'collection.agency', 'collection.assignedDate']);

function ownCollectionSource(record, field) {
  const direct = record.fact_sources && record.fact_sources[field];
  if (direct && direct.record_index != null && direct.record_index !== record.record_index) return null;
  return sourceForField(record, field);
}

// Within each report the shared duplicate contract validates the actual pair.
// Across reports only its own sourced reference is compared; file IDs, report
// dates and record indexes are deliberately not cross-report account identity.
function collectionReference(record, basis) {
  if (!isCollection(record) || !recordBureau(record)) return null;
  if (record.kind === 'GENERAL_COLLECTION' && (!record.location || record.location.trusted === false
    || record.fact_sources && Object.hasOwn(record.fact_sources, 'collection.entryContext')
      && !ownCollectionSource(record, 'collection.entryContext'))) return null;
  const fields = basis === COLLECTION_MEMBER_PAIR_BASIS
    ? ['account.masked_identifier', 'account.member_reference'] : COLLECTION_PAIR_FIELDS;
  const sources = fields.map(field => ownCollectionSource(record, field));
  if (sources.some(source => !source)) return null;
  return { key: JSON.stringify([String(recordBureau(record)).toUpperCase(),
    ...sources.map(source => String(source.normalized_value))]) };
}

function collectionGroups(records, reportIssues) {
  const groups = new Map();
  for (const issue of reportIssues) {
    const basis = issue.evidence?.pairing_basis;
    if (issue.check_id !== COLLECTION_DUPLICATE
      || ![COLLECTION_PAIR_BASIS, COLLECTION_MEMBER_PAIR_BASIS].includes(basis)) continue;
    const record = records.find(row => row.record_index === issue.record_index);
    const other = records.find(row => row.record_index === issue.evidence.duplicate_of_record);
    if (!record || !other || !collectionPair(record, other, issue.evidence)) continue;
    const reference = collectionReference(record, basis);
    if (!reference) continue;
    const scope = [record.source_file_id || '', record.source_report_segment_id || '',
      record.source_report_reference_date || recordReportDate(record) || ''];
    const key = JSON.stringify([basis, reference.key, scope]);
    if (!groups.has(key)) groups.set(key, { basis, reference, records: new Map(), issues: [] });
    const group = groups.get(key);
    group.records.set(record.record_index, record); group.records.set(other.record_index, other);
    group.issues.push(issue);
  }
  return [...groups.values()].map(group => ({ ...group, records: [...group.records.values()] }));
}

function compareCollectionDetails(earlier, later) {
  const all = [...earlier, ...later];
  const fields = COLLECTION_DETAIL_FIELDS.filter(field => all.every(record => ownCollectionSource(record, field)));
  const complete = COLLECTION_DETAIL_FIELDS.every(field => fields.includes(field)
    || all.every(record => !ownCollectionSource(record, field)));
  const signature = records => records.map(record => JSON.stringify(fields.map(field =>
    [field, String(ownCollectionSource(record, field).normalized_value)]))).sort();
  return { same: JSON.stringify(signature(earlier)) === JSON.stringify(signature(later)), complete };
}

function collectionView(records, issue) {
  const sourceFacts = records.flatMap(record => COLLECTION_DETAIL_FIELDS.flatMap(field => {
    const source = ownCollectionSource(record, field);
    if (!source) return [];
    const privateLabel = field === 'account.member_reference' ? 'Member number matched from the report'
      : /Member Name/i.test(source.source_field || '') ? 'Reporting member matched from the report'
        : 'Creditor identity matched from the report';
    const privateValue = field === 'account.member_reference' || source.privacy_redacted === true;
    const loc = source.location || {};
    const where = loc.page != null ? ` (page ${loc.page}${loc.line != null ? `, line ${loc.line}` : ''})` : '';
    return [{ source_field: (source.source_field || field) + where,
      raw_value: privateValue ? privateLabel : source.raw_value,
      normalized_value: privateValue ? privateLabel : source.normalized_value }];
  }));
  return { category: COLLECTION_DUPLICATE, confidence: issue?.confidence || null,
    request_type: issue?.request_type || null,
    explanation: `This report lists ${records.length} collection entr${records.length === 1 ? 'y' : 'ies'} with the matching account reference.`,
    uncertainty: issue?.uncertainty || null, evidence: { collection_entry_count: records.length }, source_facts: sourceFacts };
}

function incompleteCollectionReport(extraction) {
  if (!extraction || extraction.refusal || extraction.admitted === false
    || extraction.admission?.admitted === false || extraction.extraction_ran === false
    || extraction.presentation_evidence === false || extraction.reading_state?.complete === false
    || extraction.reading_limitations?.incomplete === true
    || extraction.missing_pages?.likely_missing_pages?.length) return true;
  return (extraction.records || []).some(record => isCollection(record)
    && (record.page_read_failure === true || record.continuation_candidate === true));
}

function compareCollectionGroup(group, earlierRow, laterRow, earlierGroups, laterRecords, laterGroups) {
  const primary = group.issues[0];
  const base = { category: COLLECTION_DUPLICATE, confidence: primary.confidence,
    basis_type: primary.basis_type, eligible: primary.eligible === true,
    earlier: collectionView(group.records, primary) };
  const unavailable = reason => ({ ...base, outcome: OUTCOME.NOT_COMPARABLE, reason,
    match: { state: MATCH.QUALIFIED, reason }, later: null,
    uncertainty: 'The later report does not show enough matching collection details to compare this issue. Nothing here establishes that an entry was corrected or removed.' });
  if (incompleteCollectionReport(earlierRow.extraction) || incompleteCollectionReport(laterRow.extraction)) {
    return unavailable('COLLECTION_REPORT_NOT_FULLY_READ');
  }
  if (earlierRow.evaluation?.country && laterRow.evaluation?.country
    && earlierRow.evaluation.country !== laterRow.evaluation.country) return unavailable('DIFFERENT_REPORT_COUNTRY');
  if (earlierGroups.filter(other => other.basis === group.basis
    && other.reference.key === group.reference.key).length !== 1) return unavailable('AMBIGUOUS_EARLIER_COLLECTION_GROUP');
  const candidates = laterRecords.filter(record => collectionReference(record, group.basis)?.key === group.reference.key);
  if (!candidates.length) return unavailable('NO_SUPPORTED_MATCH_IN_LATER_REPORT');
  const knownMembers = [...group.records, ...candidates].map(record =>
    ownCollectionSource(record, 'account.member_reference')?.normalized_value).filter(Boolean);
  if (group.basis === COLLECTION_PAIR_BASIS && new Set(knownMembers).size > 1) return unavailable('CONFLICTING_COLLECTION_MEMBER');
  const match = { state: MATCH.CONFIDENT, reason: 'SOURCE_BOUND_COLLECTION_REFERENCE', cross_bureau: false,
    earlier_entry_count: group.records.length, later_entry_count: candidates.length };
  const matchingGroups = laterGroups.filter(later => later.records.every(record =>
    collectionReference(record, group.basis)?.key === group.reference.key));
  if (candidates.length > 1) {
    // Multiple uploads or an unassessed pair must not be collapsed into one debt.
    if (matchingGroups.length !== 1 || matchingGroups[0].records.length !== candidates.length
      || candidates.some(record => !matchingGroups[0].records.includes(record))) return unavailable('AMBIGUOUS_LATER_COLLECTION_GROUP');
    const laterGroup = matchingGroups[0];
    const details = compareCollectionDetails(group.records, laterGroup.records);
    const same = group.records.length === laterGroup.records.length && details.same;
    return { ...base, outcome: same ? OUTCOME.STILL_OBSERVED : OUTCOME.CHANGED, match,
      later: collectionView(laterGroup.records, laterGroup.issues[0]),
      later_record_facts: { collection_entry_count: laterGroup.records.length },
      detail_comparison: details.complete ? 'COMPLETE' : 'PARTIAL',
      uncertainty: same ? details.complete ? 'The later report still lists the duplicate collection entries with the same readable details.'
        : 'The later report still lists duplicate collection entries. This does not prove a correction or bureau action.'
        : 'The later report still lists duplicate collection entries, but their number or readable details differ. This does not prove a correction or bureau action.' };
  }
  // A partially identified collection could hide a second matching entry. Never
  // turn a missing/untrusted reference into evidence that the duplicate is gone.
  for (const other of laterRecords.filter(record => isCollection(record) && record !== candidates[0])) {
    const otherReference = collectionReference(other, group.basis);
    if (otherReference) continue;
    const mask = ownCollectionSource(other, 'account.masked_identifier')?.normalized_value;
    const knownMask = ownCollectionSource(candidates[0], 'account.masked_identifier').normalized_value;
    const member = ownCollectionSource(other, 'account.member_reference')?.normalized_value;
    const knownMember = ownCollectionSource(candidates[0], 'account.member_reference')?.normalized_value;
    if ((!mask || String(mask) === String(knownMask))
      && (!member || !knownMember || String(member) === String(knownMember))) return unavailable('UNRESOLVED_LATER_COLLECTION_REFERENCE');
  }
  return { ...base, outcome: OUTCOME.NO_LONGER_OBSERVED, match, later: collectionView(candidates, null),
    later_record_facts: { collection_entry_count: 1 },
    uncertainty: 'The later report lists this collection once. The duplicate is no longer observed in that report. This is not proof that the bureau corrected or deleted anything.' };
}

/** Whether the later report's record still supports the same check on the matched record, and the outcome. */
function compareIssues(earlierRow, laterRow) {
  const earlierRecords = (earlierRow.extraction && earlierRow.extraction.records) || [];
  const laterRecords = (laterRow.extraction && laterRow.extraction.records) || [];
  const reportingOnly = row => issues.issuesFor({ evaluation: row.evaluation, extraction: row.extraction })
    .filter(issue => issue.basis_type !== issues.BASIS_TYPE.LIMITATION_ASSESSMENT);
  const earlierIssues = reportingOnly(earlierRow);
  const laterIssues = reportingOnly(laterRow);
  const outcomes = [];
  const earlierGroups = collectionGroups(earlierRecords, earlierIssues);
  const laterGroups = collectionGroups(laterRecords, laterIssues);
  const groupedIssueIds = new Set(earlierGroups.flatMap(group => group.issues.map(issue => issue.issue_id)));
  for (const group of earlierGroups) outcomes.push(compareCollectionGroup(group, earlierRow, laterRow, earlierGroups, laterRecords, laterGroups));
  for (const issue of earlierIssues) {
    if (groupedIssueIds.has(issue.issue_id)) continue;
    const record = earlierRecords.find((r) => r.record_index === issue.record_index) || null;
    const base = {
      category: issueCategory(issue),
      confidence: issue.confidence,
      basis_type: issue.basis_type,
      eligible: issue.eligible === true,
      earlier: issueView(issue)
    };
    const candidates = laterRecords.map((lr) => ({ record: lr, match: matchRecords(record, lr) }));
    const confident = candidates.filter((c) => c.match.state === MATCH.CONFIDENT);
    const partial = candidates.filter((c) => c.match.state === MATCH.QUALIFIED);
    let candidate = confident.length === 1 ? confident[0].record : null;
    let match = confident.length === 1 ? confident[0].match
      : { state: partial.length || confident.length ? MATCH.QUALIFIED : MATCH.NONE,
        reason: confident.length > 1 ? 'AMBIGUOUS_LATER_ACCOUNT_IDENTITY' : partial.length ? 'PARTIAL_ACCOUNT_IDENTITY' : 'NO_LATER_RECORD',
        candidate_count: confident.length || partial.length };
    // A unique forward candidate is insufficient if several earlier accounts claim it.
    if (candidate && earlierRecords.filter((er) => matchRecords(er, candidate).state === MATCH.CONFIDENT).length !== 1) {
      candidate = null;
      match = { state: MATCH.QUALIFIED, reason: 'AMBIGUOUS_EARLIER_ACCOUNT_IDENTITY' };
    }
    if (!record || match.state === MATCH.NONE) {
      outcomes.push(Object.assign({}, base, { outcome: OUTCOME.NOT_COMPARABLE, reason: 'NO_SUPPORTED_MATCH_IN_LATER_REPORT', match, later: null, uncertainty: 'The account this issue came from carries no supported identity evidence that also appears in the later report, so the two entries cannot be treated as the same account. They are not merged.' }));
      continue;
    }
    if (match.state === MATCH.QUALIFIED) {
      outcomes.push(Object.assign({}, base, { outcome: OUTCOME.NOT_COMPARABLE, reason: 'UNCERTAIN_MATCH', match, later: null, uncertainty: 'The printed identity evidence does not establish a unique account match between these reports. Masked identifiers can overlap, and a creditor name alone is insufficient. These entries are not merged or treated as a resolved issue.' }));
      continue;
    }
    const required = requiredFields(issue);
    const lf = factsOf(candidate);
    const missing = required.filter((f) => lf[f] == null);
    if (missing.length) {
      outcomes.push(Object.assign({}, base, { outcome: OUTCOME.NOT_COMPARABLE, reason: 'FIELD_NOT_READ_IN_LATER_REPORT', match, missing_fields: missing, later: null, uncertainty: 'The later report does not show the field(s) this check reads, so whether the issue is still present cannot be established from it.' }));
      continue;
    }
    const matchedLaterIssue = laterIssues.find((li) => issueCategory(li) === base.category && li.record_index === candidate.record_index) || null;
    if (!matchedLaterIssue) {
      outcomes.push(Object.assign({}, base, { outcome: OUTCOME.NO_LONGER_OBSERVED, match, later: null, later_record_facts: relevantFacts(candidate, required), uncertainty: 'The later report shows this same account but does not show this issue on it. That is what the later report prints, not proof that anything was corrected, deleted or acted on.' }));
      continue;
    }
    const same = issueSignature(matchedLaterIssue) === issueSignature(issue);
    outcomes.push(Object.assign({}, base, {
      outcome: same ? OUTCOME.STILL_OBSERVED : OUTCOME.CHANGED,
      match,
      later: issueView(matchedLaterIssue),
      later_record_facts: relevantFacts(candidate, required),
      uncertainty: same
        ? 'The later report still shows the same issue on this same account with the same printed facts.'
        : 'The later report still shows this issue on this same account, but the facts it prints differ from the earlier report.'
    }));
  }
  return outcomes;
}

function relevantFacts(record, fields) {
  const f = factsOf(record);
  const out = {};
  for (const key of fields) if (f[key] != null) out[key] = f[key];
  return out;
}

/** Compare two owned assessments. Read-only: nothing is written, and no earlier fact or packet is changed. */
function comparisonView(store, actor, leftResultId, rightResultId) {
  if (!leftResultId || !rightResultId) throw new ServiceError('TWO_RESULTS_REQUIRED');
  if (leftResultId === rightResultId) throw new ServiceError('SAME_RESULT_SELECTED');
  const leftRow = resultRowFor(store, actor, leftResultId);
  const rightRow = resultRowFor(store, actor, rightResultId);
  const left = assessmentSummary(store, leftRow);
  const right = assessmentSummary(store, rightRow);

  let order;
  if (left.report_date && right.report_date) {
    if (left.report_date === right.report_date) order = { state: 'SAME_REPORT_DATE', earlier: 'left', later: 'right', direction_claimed: false, note: 'Both reports print the same report date, so neither is treated as the earlier report. A difference between them is what the two reports print, not a change over time.' };
    else if (left.report_date < right.report_date) order = { state: 'DETERMINED', earlier: 'left', later: 'right', direction_claimed: true, note: 'The order is taken from the report dates the two reports print.' };
    else order = { state: 'DETERMINED', earlier: 'right', later: 'left', direction_claimed: true, note: 'The order is taken from the report dates the two reports print (the earlier report is compared with the later one).' };
  } else {
    order = { state: 'UNCERTAIN', earlier: 'left', later: 'right', direction_claimed: false, note: 'At least one report does not print a report date, so the chronological order cannot be established. Differences are shown without claiming improvement or deterioration.' };
  }

  const earlierRow = order.earlier === 'right' ? rightRow : leftRow;
  const laterRow = order.later === 'right' ? rightRow : leftRow;
  const differentBureau = Boolean(left.bureau && right.bureau && String(left.bureau).toUpperCase() !== String(right.bureau).toUpperCase());
  const outcomes = compareIssues(earlierRow, laterRow);
  const count = (o) => outcomes.filter((x) => x.outcome === o).length;

  return {
    left,
    right,
    order,
    different_bureau: differentBureau,
    direction_claimed: order.direction_claimed === true,
    outcomes,
    summary: {
      total: outcomes.length,
      still_observed: count(OUTCOME.STILL_OBSERVED),
      changed: count(OUTCOME.CHANGED),
      no_longer_observed: count(OUTCOME.NO_LONGER_OBSERVED),
      not_comparable: count(OUTCOME.NOT_COMPARABLE)
    },
    note: ABSENCE_NOTE
  };
}

module.exports = { historyView, comparisonView, matchRecords, issueCategory, requiredFields, reportIdentityOf, OUTCOME, MATCH, ABSENCE_NOTE };
