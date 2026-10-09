'use strict';
// Relevant original report pages. Resolve custody from selected issue provenance,
// never from a filename, a caller's case id, or an unrelated saved report.
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { ServiceError } = require('./errors.cjs');
const { detectContainerFromBytes, PNG_MAGIC } = require('./uploads.cjs');
const { reportReference } = require('./report-fact-sources.cjs');
const MAX_REPORT_EXHIBITS = 256;
const PAGE_COUNTS = new Map();
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

function pageCount(bytes, digest, type) {
  if (type !== 'application/pdf') return 1;
  if (PAGE_COUNTS.has(digest)) return PAGE_COUNTS.get(digest);
  let info;
  try {
    info = execFileSync('pdfinfo', ['-'], { input: bytes, encoding: 'utf8',
      timeout: 10000, maxBuffer: 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'] });
  } catch { return null; }
  const count = Number(/^Pages:\s+(\d+)\s*$/m.exec(info)?.[1]);
  if (!Number.isSafeInteger(count) || count < 1) return null;
  if (PAGE_COUNTS.size >= 256) PAGE_COUNTS.delete(PAGE_COUNTS.keys().next().value);
  PAGE_COUNTS.set(digest, count);
  return count;
}

function contentType(bytes) {
  const container = detectContainerFromBytes(bytes);
  return container === 'PDF' ? 'application/pdf' : container === 'IMAGE'
    ? bytes.subarray(0, PNG_MAGIC.length).equals(PNG_MAGIC) ? 'image/png' : 'image/jpeg' : null;
}

function relatedIndices(issue) {
  return [...new Set([issue.record_index, issue.evidence?.duplicate_of_record,
    issue.evidence?.other_record, issue.evidence?.original_record,
    ...(issue.rule_assessment?.required_facts || []).filter(f => f.role !== 'earlier_report')
      .map(f => f.source?.record_index),
    ...(issue.source_facts || []).filter(f => f.role !== 'earlier_report').map(f => f.record_index)
  ].filter(index => index != null))];
}

function locations(value, visit) {
  if (!value || typeof value !== 'object') return;
  if (Number.isInteger(value.page) && value.page > 0 && value.trusted !== false) visit(value);
  for (const [key, child] of Object.entries(value)) {
    // Published external definitions do not name pages of an uploaded report.
    if (key !== 'code_definition' && key !== 'period_definition' && child && typeof child === 'object') locations(child, visit);
  }
}

/** Only real retained uploads are available. Legacy structural fixtures with no
 * custody bytes are kept internal; they do not gain a new packet prerequisite. */
function available(store, actor, current, selected) {
  const state = store.state(), references = new Map(), blocked = new Set();
  const currentCase = state.cases.find(row => row.case_id === current.case_id);
  function add(resultId, fileId, role, record, source) {
    if (!fileId) return;
    const result = state.results.find(row => row.result_id === resultId);
    const ownCase = result && state.cases.find(row => row.case_id === result.case_id);
    const file = (state.files || []).find(row => row.file_id === fileId);
    if (!result || !ownCase || !file || result.account_id !== actor.account_id
      || ownCase.account_id !== actor.account_id || file.account_id !== actor.account_id
      || ownCase.country !== currentCase?.country
      || file.case_id !== result.case_id || !(result.file_ids || []).includes(fileId)
      || result.demonstration || file.demonstration || file.stored_blob === false
      || !file.stored_sha256 || !Number.isSafeInteger(file.stored_bytes) || file.stored_bytes < 1) {
      blocked.add(fileId); return;
    }
    if (role === 'EARLIER') {
      const baseline = (current.evaluation?.reaging_baselines || []).find(row => row.result_id === resultId);
      const frozen = baseline?.extraction?.records?.find(row => row.record_index === record?.record_index);
      const live = result.extraction?.records?.find(row => row.record_index === record?.record_index);
      if (!frozen || !live || baseline.case_id !== result.case_id
        || Object.keys(frozen).some(key => JSON.stringify(frozen[key]) !== JSON.stringify(live[key]))) {
        blocked.add(fileId); return;
      }
    }
    if (source?.source_file_id && source.location?.file_id && source.source_file_id !== source.location.file_id) {
      blocked.add(source.source_file_id); blocked.add(source.location.file_id); return;
    }
    let ref = references.get(fileId);
    if (!ref) {
      ref = { file, roles: new Set(), dates: new Set(), pages: new Set(), sources: new Map() };
      references.set(fileId, ref);
    }
    ref.roles.add(role);
    const date = source?.report_reference_date || reportReference(record)?.normalized_value
      || record?.source_report_reference_date;
    if (date) ref.dates.add(date);
    ref.sources.set(resultId + ':' + (record?.record_index ?? ''), {
      result_id: resultId, case_id: result.case_id, file_ids: result.file_ids.slice().sort(),
      record_index: record?.record_index ?? null, record_sha256: sha256(Buffer.from(JSON.stringify(record || null)))
    });
    locations(source || record?.location, loc => {
      if (!loc.file_id || loc.file_id === fileId) ref.pages.add(loc.page);
    });
  }
  function fileFor(result, record, source) {
    const sourceIds = [source?.source_file_id, source?.location?.file_id].filter(Boolean);
    const recordIds = [record?.source_file_id, record?.location?.file_id].filter(Boolean);
    if (new Set(sourceIds).size > 1 || new Set(recordIds).size > 1) {
      [...sourceIds, ...recordIds].forEach(id => blocked.add(id)); return null;
    }
    const own = recordIds[0], specific = sourceIds[0];
    if (specific && own && specific !== own && !(record.continuation_merged_from || []).some(item => item.file_id === specific)) {
      [specific, own].forEach(id => blocked.add(id)); return null;
    }
    return specific || own || ((result.file_ids || []).length === 1 ? result.file_ids[0] : null);
  }
  function addFact(fact, issue) {
    const source = fact.source || fact;
    const role = fact.role === 'earlier_report' || source.role === 'earlier_report' ? 'EARLIER' : 'CURRENT';
    const resultId = role === 'EARLIER' ? source.source_result_id : current.result_id;
    if (role === 'CURRENT' && source.source_result_id && source.source_result_id !== current.result_id
      || role === 'EARLIER' && resultId !== issue.evidence?.earlier_result_id) {
      if (source.source_file_id) blocked.add(source.source_file_id); return;
    }
    const result = state.results.find(row => row.result_id === resultId);
    if (!result) { if (source.source_file_id) blocked.add(source.source_file_id); return; }
    const index = source.record_index ?? fact.record_index ?? (role === 'CURRENT' ? issue.record_index : issue.evidence?.earlier_record_index);
    const record = result.extraction?.records?.find(row => row.record_index === index);
    if (!record) { if (source.source_file_id) blocked.add(source.source_file_id); return; }
    const fileId = fileFor(result, record, source);
    add(resultId, fileId, role, record, source);
  }
  for (const issue of selected || []) {
    for (const index of relatedIndices(issue)) {
      const record = current.extraction?.records?.find(row => row.record_index === index);
      if (!record) continue;
      const fileId = fileFor(current, record);
      add(current.result_id, fileId, 'CURRENT', record, record.location);
      // A merged continuation is an explicit source of this account, not another report chosen by proximity.
      for (const continuation of record.continuation_merged_from || []) {
        add(current.result_id, continuation.file_id, 'CURRENT', record, continuation);
      }
    }
    const required = issue.rule_assessment?.required_facts || [];
    required.forEach(fact => addFact(fact, issue));
    (issue.source_facts || []).filter(fact => !required.length || fact.source_file_id || fact.location?.file_id)
      .forEach(fact => addFact(fact, issue));
    if (issue.source) addFact({ source: issue.source }, issue);
    for (const basis of issue.supported_bases || []) {
      (basis.source_facts || []).forEach(fact => addFact(fact, issue));
      if (basis.source) addFact({ source: basis.source }, issue);
    }
  }
  const out = [];
  for (const [fileId, ref] of references) {
    if (blocked.has(fileId)) continue;
    let bytes;
    try { bytes = store.readBlob(fileId); } catch { continue; }
    const digest = sha256(bytes), type = contentType(bytes);
    if (bytes.length !== ref.file.stored_bytes || digest !== ref.file.stored_sha256 || !type) continue;
    const count = pageCount(bytes, digest, type);
    if (!count || [...ref.pages].some(page => page > count)) continue;
    const roles = [...ref.roles].sort(), dates = [...ref.dates].sort();
    const role = roles.length === 1 ? roles[0] : 'CURRENT';
    const label = roles.length === 1 ? `${role === 'EARLIER' ? 'Earlier' : 'Current'} report${dates.length ? ' — ' + dates.join(', ') : ''}` : 'Report copy';
    out.push({ file_id: fileId, role, roles, label, original_filename: ref.file.original_filename,
      content_type: type, page_count: count, relevant_pages: [...ref.pages].sort((a, b) => a - b),
      scope: 'RELEVANT_PAGES', bytes, sha256: digest, sources: [...ref.sources.values()]
        .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))) });
  }
  return out.sort((a, b) => a.role.localeCompare(b.role) || a.label.localeCompare(b.label) || a.file_id.localeCompare(b.file_id));
}

function normalizedSelection(ids) {
  if (!Array.isArray(ids) || ids.some(id => typeof id !== 'string' || !/^[a-f0-9]{32}$/.test(id))) throw new ServiceError('INVALID_REQUEST');
  const unique = [...new Set(ids)].sort();
  if (unique.length > MAX_REPORT_EXHIBITS) throw new ServiceError('INVALID_REQUEST');
  return unique;
}

function prepare(store, actor, caseId, result, selected, fileIds, pageChoices = {}) {
  const ids = normalizedSelection(fileIds || []);
  const copies = result ? available(store, actor, result, selected) : [];
  const state = store.state(), expected = new Set();
  function expect(row, record, source) {
    // Structural rule fixtures have no stored-file inventory; real stores always do.
    if (!Array.isArray(state.files)) return;
    const id = source?.source_file_id || source?.location?.file_id || record?.source_file_id || record?.location?.file_id
      || (row?.file_ids?.length === 1 ? row.file_ids[0] : null);
    const explicit = Boolean(source?.source_file_id || source?.location?.file_id || record?.source_file_id || record?.location?.file_id);
    const file = (state.files || []).find(file => file.file_id === id);
    if (id && !file?.demonstration && file?.stored_blob !== false && (file?.stored_sha256 || !file && explicit)) expected.add(id);
  }
  for (const issue of selected || []) {
    for (const index of relatedIndices(issue)) {
      const record = result.extraction?.records?.find(record => record.record_index === index);
      if (record) expect(result, record);
      for (const continuation of record?.continuation_merged_from || []) expect(result, record, { source_file_id: continuation.file_id });
    }
    for (const fact of [...(issue.source_facts || []), ...(issue.rule_assessment?.required_facts || [])]) {
      const source = fact.source || fact;
      const row = source.source_result_id ? state.results.find(row => row.result_id === source.source_result_id) : result;
      const record = row?.extraction?.records?.find(record => record.record_index === (source.record_index ?? fact.record_index));
      expect(row, record, source);
    }
  }
  if ([...expected].some(id => !copies.some(copy => copy.file_id === id))) throw new ServiceError('PACKET_APPROVAL_STALE');
  if (ids.some(id => !copies.some(copy => copy.file_id === id))) throw new ServiceError('PACKET_APPROVAL_STALE');
  if (!pageChoices || typeof pageChoices !== 'object' || Array.isArray(pageChoices)
    || Object.keys(pageChoices).some(id => !copies.some(copy => copy.file_id === id))) throw new ServiceError('INVALID_REQUEST');
  for (const copy of copies) {
    const chosen = pageChoices[copy.file_id] || [];
    if (!Array.isArray(chosen) || chosen.length > copy.page_count
      || chosen.some(page => !Number.isSafeInteger(page) || page < 1 || page > copy.page_count)) throw new ServiceError('INVALID_REQUEST');
    copy.relevant_pages = [...new Set([...copy.relevant_pages, ...chosen,
      ...(copy.page_count === 1 ? [1] : [])])].sort((a,b) => a-b);
    copy.consumer_pages = [...new Set(chosen)].sort((a,b) => a-b);
  }
  const view = copies.map(copy => {
    const { bytes, sha256: digest, sources, ...publicCopy } = copy;
    return { ...publicCopy, selected: true,
      review_url: `/api/cases/${caseId}/packet/reports/${copy.file_id}` };
  });
  const chosen = copies;
  const manifest = chosen.map((copy, index) => {
    const ext = copy.content_type === 'application/pdf' ? 'pdf' : copy.content_type === 'image/png' ? 'png' : 'jpg';
    return { ...view.find(item => item.file_id === copy.file_id),
      archive_name: `report-${String(index + 1).padStart(2, '0')}-${copy.role.toLowerCase()}.${ext}` };
  });
  return { view, manifest, material: chosen.map(copy => ({ ...manifest.find(item => item.file_id === copy.file_id),
    stored_bytes: copy.bytes.length, stored_sha256: copy.sha256, sources: copy.sources })),
    copies: chosen.map(copy => ({ name: manifest.find(item => item.file_id === copy.file_id).archive_name,
      bytes: copy.bytes, content_type: copy.content_type, relevant_pages: copy.relevant_pages, label: copy.label })),
    missing: copies.filter(copy => !copy.relevant_pages.length).map(copy => `Choose the report pages to include for ${copy.original_filename}.`) };
}

module.exports = { prepare, available, normalizedSelection, MAX_REPORT_EXHIBITS };
