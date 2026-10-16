'use strict';
// Remove copied comparison evidence without rerunning independent rules or changing assessment clocks.
const crypto = require('node:crypto');
const reaging = require('./reaging.cjs');
const results = require('./results.cjs');
const issues = require('./issues.cjs');
const { ServiceError } = require('./errors.cjs');
const CHECK_ID = reaging.CHECK_ID;
const digest = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');

function sourceIds(state, caseId) {
  return new Set([caseId, ...state.results.filter(row => row.case_id === caseId).map(row => row.result_id),
    ...state.files.filter(row => row.case_id === caseId).map(row => row.file_id)]);
}
function refersTo(value, ids) {
  if (typeof value === 'string') return ids.has(value);
  if (Array.isArray(value)) return value.some(item => refersTo(item, ids));
  return Boolean(value && typeof value === 'object' && Object.values(value).some(item => refersTo(item, ids)));
}
function eligible(row) {
  return new Map(issues.issuesFor({ evaluation: row.evaluation, extraction: row.extraction })
    .filter(issue => issue.eligible).map(issue => [issue.issue_id, issue]));
}
function reviseResult(row, baselines) {
  const next = structuredClone(row), evaluation = next.evaluation;
  const before = evaluation.common_errors?.performed || [];
  const replacement = reaging.evaluate(next.extraction, baselines);
  const performed = before.flatMap(check => check.check_id === CHECK_ID ? (replacement ? [replacement] : []) : [check]);
  if (!before.some(check => check.check_id === CHECK_ID) && replacement) performed.push(replacement);
  evaluation.reaging_baselines = baselines;
  evaluation.common_errors = { ...evaluation.common_errors, performed, summary: {
    total: performed.length, potential_issue: performed.filter(check => check.state === 'POTENTIAL_ISSUE').length,
    similar_entries_worth_reviewing: performed.filter(check => check.state === 'SIMILAR_ENTRIES_WORTH_REVIEWING').length,
    not_detected: performed.filter(check => check.state === 'NOT_DETECTED').length
  } };
  evaluation.common_error_summary = evaluation.common_errors.summary;
  if (evaluation.checks_performed_by_kind) evaluation.checks_performed_by_kind.COMMON_ERROR = performed.length;
  evaluation.checks_performed += performed.length - before.length;
  evaluation.assessment_kinds = performed.length ? (evaluation.assessment_kinds || [])
    : (evaluation.assessment_kinds || []).filter(kind => kind !== 'COMMON_ERROR');
  next.rendered = results.renderResultSet({ evaluation, extraction: next.extraction });
  next.availability = results.availabilitySummary(evaluation);
  if (next.reviewed_at) { next.previous_review_at = next.reviewed_at; next.reviewed_at = null; }
  next.comparison_source_removed = true;
  return next;
}
function reportLabel(state, caseId) {
  const own = state.cases.find(row => row.case_id === caseId);
  const filenames = state.files.filter(file => file.case_id === caseId).map(file => file.original_filename).filter(Boolean);
  const latest = state.results.filter(row => row.case_id === caseId).at(-1);
  const date = require('./report-fact-sources.cjs').reportDateValue(latest?.extraction?.reference_date);
  const bureau = require('./bureau-dispute-requirements.cjs').catalog(own?.country).find(row => row.id === own?.selected_bureau)?.label
    || latest?.extraction?.bureau || 'Credit report';
  return [filenames.join(', '), bureau, date ? `Report dated ${date}` : own?.created_at ? `Uploaded ${own.created_at.slice(0, 10)}` : '', own?.region].filter(Boolean).join(' · ');
}

// A consent token binds the precise letters and assessments shown before provider cancellation.
// No copied evidence or old letter is retained as a deletion audit snapshot.
function prepare(state, actor, caseId, replacementBinding) {
  const owned = state.cases.find(row => row.case_id === caseId);
  if (!owned) throw new ServiceError('NOT_FOUND');
  if (owned.account_id !== actor.account_id) throw new ServiceError('NOT_AUTHORIZED');
  if (replacementBinding !== undefined && (typeof replacementBinding !== 'string' || !/^[a-f0-9]{64}$/.test(replacementBinding))) throw new ServiceError('INVALID_REQUEST');
  const ids = sourceIds(state, caseId), replacements = new Map(), packetRepairs = new Map(), conflicts = [];
  for (const row of state.results) {
    if (row.case_id === caseId || row.account_id !== actor.account_id) continue;
    const baselines = row.evaluation?.reaging_baselines;
    if (!Array.isArray(baselines) || !baselines.some(baseline => refersTo(baseline, ids))) continue;
    replacements.set(row.result_id, reviseResult(row, baselines.filter(baseline => !refersTo(baseline, ids))));
  }
  for (const packet of state.packets || []) {
    if (packet.case_id === caseId || packet.account_id !== actor.account_id) continue;
    const previous = state.results.find(row => row.result_id === packet.result_id && row.case_id === packet.case_id);
    const revised = replacements.get(packet.result_id);
    const before = revised && previous ? eligible(previous) : new Map(), after = revised ? eligible(revised) : new Map();
    const obsolete = new Set((packet.selected_issue_ids || []).filter(id => revised &&
      (!after.has(id) || JSON.stringify(before.get(id)) !== JSON.stringify(after.get(id)))));
    const hasSource = (packet.report_file_ids || []).some(id => ids.has(id))
      || (packet.annotations || []).some(note => ids.has(note.file_id));
    if (!obsolete.size && !hasSource) continue;
    const next = structuredClone(packet);
    next.selected_issue_ids = (next.selected_issue_ids || []).filter(id => !obsolete.has(id));
    const retainedIssues = next.selected_issue_ids.map(id => after.get(id)).filter(Boolean);
    const allowed = new Set(next.selected_issue_ids.length ? [...(revised?.file_ids || previous?.file_ids || []),
      ...state.files.filter(file => !ids.has(file.file_id) && retainedIssues.some(issue => refersTo(issue, new Set([file.file_id])))).map(file => file.file_id)] : []);
    next.report_file_ids = (next.report_file_ids || []).filter(id => !ids.has(id) && allowed.has(id));
    next.report_page_choices = Object.fromEntries(Object.entries(next.report_page_choices || {}).filter(([id]) => next.report_file_ids.includes(id)));
    next.annotations = (next.annotations || []).filter(note => next.report_file_ids.includes(note.file_id) && !obsolete.has(note.issue_id));
    if (packet.letter_text || packet.wording) {
      conflicts.push({ case_id: packet.case_id, label: reportLabel(state, packet.case_id), packet_id: packet.packet_id });
      next.letter_text = null; next.wording = null;
    }
    next.approved_version = null; next.approved_at = null; next.approved_pdf_sha256 = null;
    delete next.approved_form_digests;
    next.comparison_source_removed = true;
    packetRepairs.set(packet.packet_id, next);
  }
  const binding = digest({ case: owned, files: state.files.filter(row => row.case_id === caseId),
    results: state.results.filter(row => replacements.has(row.result_id)),
    packets: (state.packets || []).filter(row => packetRepairs.has(row.packet_id)) });
  if (replacementBinding !== undefined && replacementBinding !== binding) throw new ServiceError('CASE_DELETION_STALE');
  if (conflicts.length && replacementBinding !== binding) throw new ServiceError('REPORT_USED_BY_EDITED_LETTER', {
    reports: conflicts, replacement_binding: binding
  });
  return { replacements, packetRepairs, affected_reports: new Set([...replacements.values()].map(row => row.case_id)).size };
}
function repair(state, actor, caseId, replacementBinding) {
  const plan = prepare(state, actor, caseId, replacementBinding);
  state.results = state.results.map(row => plan.replacements.get(row.result_id) || row);
  state.packets = (state.packets || []).map(row => plan.packetRepairs.get(row.packet_id) || row);
  return plan.affected_reports;
}
module.exports = { prepare, repair };
