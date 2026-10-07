'use strict';
/**
 * packets.cjs — the consumer correction/verification packet (generalized).
 *
 * OWNER-POTENTIAL-ISSUE-001 / Batch 1, building on OWNER-CA-CORRECTION-PACKET-001. The packet is no longer
 * VIOLATION-only: it is assembled from the unified `issues.cjs` descriptor, so DEFINITE (correction),
 * PROBABLE (verification) and POTENTIAL (verification) issues all reach the same consumer path:
 *
 *   select issues -> review -> edit permitted wording -> approve -> entitled download.
 *
 * Approval binds to the selected issue content, evidence, classification and the consumer wording. A changed
 * selection, wording, re-evaluation, or a newly-ineligible selection invalidates the approval and the download
 * is refused rather than silently omitting the stale issue. Consumer wording stays separate from report facts.
 */

const crypto = require('node:crypto');
const { ServiceError } = require('./errors.cjs');
const cases = require('./cases.cjs');
const issues = require('./issues.cjs');

function nowIso() {
  return new Date().toISOString();
}

function newPacketId() {
  return `pkt_${crypto.randomBytes(12).toString('hex')}`;
}

function latestResult(store, caseId) {
  const rows = store.state().results.filter((r) => r.case_id === caseId);
  return rows.length ? rows[rows.length - 1] : null;
}

/** The eligible issues of one persisted result, from the unified descriptor. */
function eligibleIssues(resultRow) {
  if (!resultRow || !resultRow.evaluation) return [];
  return issues.issuesFor({ evaluation: resultRow.evaluation, extraction: resultRow.extraction })
    .filter((i) => i.eligible === true);
}

function reportIdentity(resultRow) {
  const ext = resultRow && resultRow.extraction;
  if (!ext) return null;
  return {
    bureau: ext.bureau || null,
    reference_date: ext.reference_date && ext.reference_date.normalized_value
      ? ext.reference_date.normalized_value
      : null
  };
}

/* OWNER-PACKET-CORRESPONDENCE-001: the recipient TYPE (never an address: the served surface supplies no address and
   nothing is ever sent by this service), and the consumer-entered correspondence details, which are stored on the
   packet row SEPARATELY from the report facts and are hashed into the approved version. */
const RECIPIENT_TYPE = Object.freeze({ CONSUMER_REPORTING_AGENCY: 'CONSUMER_REPORTING_AGENCY' });
const RECIPIENT_LABEL = Object.freeze({
  CONSUMER_REPORTING_AGENCY: 'the consumer reporting agency that issued this report'
});
/* The details a usable piece of correspondence needs before it is ready. A blank one is refused, never filled
   with a placeholder. */
const REQUIRED_CORRESPONDENCE_FIELDS = Object.freeze(['consumer_name', 'contact']);
const CORRESPONDENCE_FIELDS = Object.freeze(['consumer_name', 'contact', 'account_reference']);

function emptyCorrespondence() {
  return { consumer_name: '', contact: '', account_reference: '' };
}

function correspondenceOf(packet) {
  const raw = (packet && packet.correspondence) || {};
  const out = emptyCorrespondence();
  for (const field of CORRESPONDENCE_FIELDS) out[field] = typeof raw[field] === 'string' ? raw[field] : '';
  return out;
}

function missingCorrespondenceFields(packet) {
  const c = correspondenceOf(packet);
  return REQUIRED_CORRESPONDENCE_FIELDS.filter((f) => !String(c[f] || '').trim());
}

function recipientTypeOf(packet) {
  const t = packet && packet.recipient_type;
  return RECIPIENT_TYPE[t] ? t : RECIPIENT_TYPE.CONSUMER_REPORTING_AGENCY;
}
function currentPacket(store, caseId) {
  const rows = store.state().packets.filter((p) => p.case_id === caseId);
  return rows.length ? rows[rows.length - 1] : null;
}

/** The FULL material content of one issue, hashed into the approved version. Includes the rendered explanation,
 *  uncertainty, request wording, compliance/source version, evidence and its provenance — but no incidental
 *  generation timestamps. Changing any material reviewed content invalidates the approval. */
function issueContent(issue) {
  const material = {
    issue_id: issue.issue_id,
    confidence: issue.confidence,
    basis_type: issue.basis_type,
    classification: issue.classification || null,
    consumer_label: issues.consumerLabel(issue),
    request_type: issue.request_type,
    explanation: issue.explanation || null,
    uncertainty: issue.uncertainty || null,
    request_wording: issue.request_wording || null,
    citation: issue.citation || null,
    source_version: issue.source_version || null,
    rule_assessment: issue.rule_assessment || null,
    period_years: issue.period_years != null ? issue.period_years : null,
    content_inclusion: issue.content_inclusion || null,
    check_id: issue.check_id || null,
    evidence: issue.evidence || null,
    source: issue.source || null,
    source_facts: issue.source_facts || null,
    supported_bases: issue.supported_bases || null,
    retention_review: issue.retention_review || null,
    location: issue.location || null,
    report_identity: issue.report_identity || null,
    /* The credited account the issue concerns is MATERIAL reviewed content: a change to the printed identity
       between review and approval changes this hash and invalidates the approval. */
    account_identity: issue.account_identity || null,
    record_index: issue.record_index,
    record_kind: issue.record ? issue.record.kind_label : null
  };
  return JSON.stringify(material);
}

function canonicalVersion(packetRow, resultRow, selectedIssues) {
  const identity = reportIdentity(resultRow) || {};
  const ordered = [...selectedIssues].sort((a, b) => (a.issue_id < b.issue_id ? -1 : 1));
  const parts = [
    `result:${packetRow.result_id || ''}`,
    `selection:${ordered.map((i) => i.issue_id).join(',')}`,
    `issues:${ordered.map(issueContent).join(';')}`,
    `wording:${packetRow.wording || ''}`,
    `recipient:${recipientTypeOf(packetRow)}`,
    `correspondence:${JSON.stringify(correspondenceOf(packetRow))}`,

    `bureau:${identity.bureau || ''}`,
    `reference:${identity.reference_date || ''}`
  ];
  return crypto.createHash('sha256').update(parts.join('\n'), 'utf8').digest('hex');
}

function packetView(store, actor, caseId) {
  cases.requireOwnedCase(store, actor, caseId);
  const row = latestResult(store, caseId);
  const eligible = row ? eligibleIssues(row) : [];
  const packet = currentPacket(store, caseId);
  const identity = row ? reportIdentity(row) : null;

  /* The correspondence and its organized evidence, exactly as they will appear in the download, so the consumer
     reviews the same thing they will send. */
  const selectedIssues = packet
    ? (packet.selected_issue_ids || []).map((id) => eligible.find((i) => i.issue_id === id)).filter(Boolean)
    : [];
  const approvalStale = Boolean(packet && packet.approved_version && (!row
    || packet.result_id !== row.result_id
    || selectedIssues.length !== (packet.selected_issue_ids || []).length
    || canonicalVersion(packet, row, selectedIssues) !== packet.approved_version));
  const correspondenceMissing = missingCorrespondenceFields(packet);
  const correspondencePreview = selectedIssues.length
    ? correspondenceLines(packet, row, selectedIssues).concat(evidenceLines(selectedIssues)).join('\n')
    : null;
  return {
    report_identity: identity,
    eligible_issues: eligible.map(issues.publicIssue),
    packet: {
      packet_id: packet ? packet.packet_id : null,
      result_id: packet ? packet.result_id : null,
      selected_issue_ids: packet ? (packet.selected_issue_ids || []).slice() : [],
      selected_count: packet ? (packet.selected_issue_ids || []).length : 0,
      wording: packet ? packet.wording : null,
      approved: Boolean(packet && packet.approved_version && !approvalStale),
      approved_version: packet ? packet.approved_version : null,
      approved_at: packet ? packet.approved_at : null,
      approval_stale: approvalStale,
      recipient: { type: recipientTypeOf(packet), label: RECIPIENT_LABEL[recipientTypeOf(packet)] },
      correspondence: correspondenceOf(packet),
      correspondence_required: REQUIRED_CORRESPONDENCE_FIELDS.slice(),
      correspondence_missing: correspondenceMissing,
      correspondence_ready: correspondenceMissing.length === 0,
      correspondence_preview: correspondencePreview,
      download_available: Boolean(packet && packet.approved_version && !approvalStale)
    }
  };
}

function requireResultAndEligible(store, actor, caseId) {
  cases.requireOwnedCase(store, actor, caseId);
  const row = latestResult(store, caseId);
  if (!row) throw new ServiceError('NO_RESULT_TO_DOWNLOAD');
  const eligible = eligibleIssues(row);
  if (!eligible.length) throw new ServiceError('NO_PACKET_ELIGIBLE_FINDING');
  return { row, eligible };
}

/** Record the consumer's selection. A change of selection invalidates any prior approval. */
function selectIssues(store, actor, caseId, issueIds) {
  const { row, eligible } = requireResultAndEligible(store, actor, caseId);
  const wanted = Array.isArray(issueIds) ? issueIds : [];
  const byId = new Map(eligible.map((i) => [i.issue_id, i]));
  const seen = new Set();
  const selected = [];
  for (const id of wanted) {
    const issue = byId.get(String(id));
    if (!issue) throw new ServiceError('INVALID_FINDING_SELECTION', { issue_id: String(id) });
    if (!seen.has(issue.issue_id)) {
      seen.add(issue.issue_id);
      selected.push(issue);
    }
  }
  return store.update((state) => {
    let packet = state.packets.find((p) => p.case_id === caseId);
    if (!packet) {
      packet = {
        packet_id: newPacketId(),
        case_id: caseId,
        account_id: actor.account_id,
        result_id: row.result_id,
        selected_issue_ids: [],
        wording: null,
        recipient_type: RECIPIENT_TYPE.CONSUMER_REPORTING_AGENCY,
        correspondence: emptyCorrespondence(),
        approved_version: null,
        approved_at: null,
        created_at: nowIso()
      };
      state.packets.push(packet);
    }
    packet.result_id = row.result_id;
    packet.selected_issue_ids = selected.map((i) => i.issue_id);
    packet.approved_version = null;
    packet.approved_at = null;
    packet.updated_at = nowIso();
    return packet;
  });
}


/** Record the consumer's own request wording, stored separately from the report facts. */
function setWording(store, actor, caseId, wording) {
  const { row } = requireResultAndEligible(store, actor, caseId);
  const text = typeof wording === 'string' ? wording : '';
  return store.update((state) => {
    let packet = state.packets.find((p) => p.case_id === caseId);
    if (!packet) {
      packet = {
        packet_id: newPacketId(),
        case_id: caseId,
        account_id: actor.account_id,
        result_id: row.result_id,
        selected_issue_ids: [],
        wording: null,
        recipient_type: RECIPIENT_TYPE.CONSUMER_REPORTING_AGENCY,
        correspondence: emptyCorrespondence(),
        approved_version: null,
        approved_at: null,
        created_at: nowIso()
      };
      state.packets.push(packet);
    }
    packet.result_id = row.result_id;
    packet.wording = text;
    packet.approved_version = null;
    packet.approved_at = null;
    packet.updated_at = nowIso();
    return packet;
  });
}

/**
 * Record the consumer-entered correspondence details. They are stored on the packet row SEPARATELY from the report
 * facts (like the wording) and are bound into the approved version, so changing them invalidates a prior approval.
 * Nothing is invented here: a blank field stays blank and is refused at approval, never filled with a placeholder.
 */
function setCorrespondence(store, actor, caseId, details) {
  const { row } = requireResultAndEligible(store, actor, caseId);
  const input = details && typeof details === 'object' ? details : {};
  return store.update((state) => {
    let packet = state.packets.find((p) => p.case_id === caseId);
    if (!packet) {
      packet = {
        packet_id: newPacketId(),
        case_id: caseId,
        account_id: actor.account_id,
        result_id: row.result_id,
        selected_issue_ids: [],
        wording: null,
        recipient_type: RECIPIENT_TYPE.CONSUMER_REPORTING_AGENCY,
        correspondence: emptyCorrespondence(),
        approved_version: null,
        approved_at: null,
        created_at: nowIso()
      };
      state.packets.push(packet);
    }
    const next = correspondenceOf(packet);
    for (const field of CORRESPONDENCE_FIELDS) {
      if (input[field] !== undefined) {
        next[field] = typeof input[field] === 'string' ? input[field].trim().slice(0, 400) : '';
      }
    }
    packet.result_id = row.result_id;
    packet.correspondence = next;
    packet.approved_version = null;
    packet.approved_at = null;
    packet.updated_at = nowIso();
    return packet;
  });
}

/** Refuse approval or download while a necessary correspondence detail is blank. */
function requireCorrespondence(packet) {
  const missing = missingCorrespondenceFields(packet);
  if (missing.length) throw new ServiceError('PACKET_CORRESPONDENCE_REQUIRED', { missing });
}


/** Explicitly approve the current version. Requires a non-empty selection bound to the current result. */
function approvePacket(store, actor, caseId) {
  cases.requireOwnedCase(store, actor, caseId);
  const packet = currentPacket(store, caseId);
  if (!packet || !packet.selected_issue_ids || !packet.selected_issue_ids.length) {
    throw new ServiceError('PACKET_NO_SELECTION');
  }
  const row = latestResult(store, caseId);
  if (!row || packet.result_id !== row.result_id) throw new ServiceError('PACKET_APPROVAL_STALE');
  const eligible = eligibleIssues(row);
  const byId = new Map(eligible.map((i) => [i.issue_id, i]));
  const selected = packet.selected_issue_ids.map((id) => byId.get(id)).filter(Boolean);
  if (selected.length !== packet.selected_issue_ids.length) throw new ServiceError('PACKET_APPROVAL_STALE');
  /* A usable piece of correspondence needs its necessary details before it can be approved. */
  requireCorrespondence(packet);
  return store.update((state) => {
    const live = state.packets.find((p) => p.case_id === caseId);
    live.approved_version = canonicalVersion(live, row, selected);
    live.approved_at = nowIso();
    live.updated_at = nowIso();
    return live;
  });
}

/** Resolve the approved, non-stale selected issues (throws on any stale/ineligible selection). */
function resolveSelected(store, actor, caseId) {
  cases.requireOwnedCase(store, actor, caseId);
  const packet = currentPacket(store, caseId);
  if (!packet || !packet.approved_version) throw new ServiceError('PACKET_NOT_APPROVED');
  requireCorrespondence(packet);
  const row = latestResult(store, caseId);
  if (!row) throw new ServiceError('NO_RESULT_TO_DOWNLOAD');
  if (packet.result_id !== row.result_id) throw new ServiceError('PACKET_APPROVAL_STALE');
  const eligible = eligibleIssues(row);
  const byId = new Map(eligible.map((i) => [i.issue_id, i]));
  const selected = packet.selected_issue_ids.map((id) => byId.get(id));
  if (selected.some((i) => !i)) throw new ServiceError('PACKET_APPROVAL_STALE');
  if (canonicalVersion(packet, row, selected) !== packet.approved_version) throw new ServiceError('PACKET_APPROVAL_STALE');
  return { packet, row, selected };
}


/**
 * The credited ACCOUNT one selected issue concerns, with the printed reading and the page/line it came from.
 * Never invented: an issue whose record prints no account name renders nothing here.
 */
function accountLine(issue, indent) {
  const ai = issue && issue.account_identity;
  if (!ai || !ai.name) return null;
  const pad = indent || '  ';
  const loc = ai.location && ai.location.page != null
    ? ` (page ${ai.location.page}${ai.location.line != null ? `, line ${ai.location.line}` : ''})`
    : '';
  const raw = ai.raw_value && ai.raw_value !== ai.name ? ` — printed "${ai.raw_value}"` : '';
  return `${pad}Account: ${ai.name}${raw}${loc}`;
}

/** One issue block of the packet document: the factual basis, the uncertainty and the request. */
function issueLines(issue) {
  const lines = [];
  if (issues.consumerLabel(issue)) lines.push(`  ${issues.consumerLabel(issue)}`);
  if (issue.basis_type === issues.BASIS_TYPE.STATUTORY_RETENTION) {
    lines.push(`  Rule: ${issue.citation}`);
    if (issue.source_version) lines.push(`  Rule version: ${issue.source_version}`);
    for (const basis of issue.supported_bases || []) {
      if (basis.adapter_id === issue.adapter_id) continue;
      lines.push(`  Additional supporting rule: ${basis.citation}`);
      if (basis.source_version) lines.push(`  Rule version: ${basis.source_version}`);
      if (basis.uncertainty) lines.push(`  Qualification for this rule: ${basis.uncertainty}`);
    }
    if (issue.record_index != null) lines.push(`  Record: ${(issue.record && issue.record.kind_label) || 'a record'} ${issue.record_index}`);
    if (issue.report_identity && (issue.report_identity.bureau || issue.report_identity.reference_date)) {
      lines.push(`  Report: ${issue.report_identity.bureau || 'a report'}${issue.report_identity.reference_date ? ` (reference date ${issue.report_identity.reference_date})` : ''}`);
    }
    if (issue.source && issue.source.location) {
      const loc = issue.source.location;
      const pageLine = (loc.page != null) ? `page ${loc.page}${loc.line != null ? `, line ${loc.line}` : ''}` : 'source location recorded';
      lines.push(`  Measures from: ${issue.source.source_field || (issue.record && issue.record.source_field) || 'the printed date'} — printed "${issue.source.raw_value}" (${pageLine}), normalized to ${issue.source.normalized_value}`);
    }
  } else if (issue.basis_type === issues.BASIS_TYPE.CONTENT_FINDING) {
    /* A report-content finding: the printed content a recorded rule prohibits. It states the rule and the
       decisive content facts, never a retention period. */
    lines.push(`  Rule: ${issue.citation}`);
    if (issue.source_version) lines.push(`  Rule version: ${issue.source_version}`);
    if (issue.label) lines.push(`  Finding: ${issue.label}`);
    for (const basis of issue.supported_bases || []) {
      if (basis.rule_assessment) lines.push(`  ${issues.consumerLabel(basis) || 'Reporting rule'} of report-data requirement: ${basis.rule_assessment.requirement}`);
    }
    if (issue.record_index != null) lines.push(`  Record: ${(issue.record && issue.record.kind_label) || 'a record'} ${issue.record_index}`);
    if (issue.report_identity && (issue.report_identity.bureau || issue.report_identity.reference_date)) {
      lines.push(`  Report: ${issue.report_identity.bureau || 'a report'}${issue.report_identity.reference_date ? ` (reference date ${issue.report_identity.reference_date})` : ''}`);
    }
    for (const f of (issue.source_facts || [])) {
      const loc = f.location;
      const pageLine = loc && loc.page != null ? `page ${loc.page}${loc.line != null ? `, line ${loc.line}` : ''}` : 'source location recorded';
      lines.push(f.field === 'account.paymentHistoryDefinition' ? externalDefinitionLine(f, '  ')
        : `  ${f.source_field || f.field}: printed "${f.raw_value}" (${pageLine}), normalized to ${f.normalized_value}`);
    }
  } else {
    lines.push(`  Issue: ${issue.label}`);
    for (const citation of issue.retention_review && issue.retention_review.citations || []) {
      lines.push(`  Reporting-period rule: ${citation}`);
    }
    if (issue.rule_assessment) lines.push(`  ${issues.consumerLabel(issue) || 'Reporting rule'} of report-data requirement: ${issue.rule_assessment.requirement}`);
    if (issue.rule_assessment && issue.citation) lines.push(`  Supporting statute: ${issue.citation} (source version ${issue.source_version})`);
    if (issue.rule_assessment) {
      for (const fact of issue.rule_assessment.required_facts || []) {
        if (fact.source && fact.source.omitted_value === true) {
          const loc = fact.source.location || {};
          lines.push(`  Printed caption without a value: ${fact.source.source_field} (page ${loc.page}${loc.line != null ? `, line ${loc.line}` : ''})`);
        }
      }
    }
    lines.push(`  Record: ${(issue.record && issue.record.kind_label) || 'a record'} ${issue.record_index}`);
    if (issue.report_identity && (issue.report_identity.bureau || issue.report_identity.reference_date)) {
      lines.push(`  Report: ${issue.report_identity.bureau || 'a report'}${issue.report_identity.reference_date ? ` (reference date ${issue.report_identity.reference_date})` : ''}`);
    }
    for (const f of (issue.source_facts || [])) {
      const loc = f.location;
      const pageLine = loc && loc.page != null ? `page ${loc.page}${loc.line != null ? `, line ${loc.line}` : ''}` : 'source location recorded';
      lines.push(f.field === 'account.paymentHistoryDefinition' ? externalDefinitionLine(f, '  ')
        : `  ${f.source_field || f.field}: printed "${f.raw_value}" (${pageLine}), normalized to ${f.normalized_value}`);
    }
    const loc = issue.location && issue.location.page != null ? issue.location
      : (issue.source_facts || []).map((fact) => fact.location).find((location) => location && location.page != null);
    if (loc) {
      lines.push(`  Source: ${loc.section ? loc.section + ', ' : ''}page ${loc.page}${loc.line != null ? `, line ${loc.line}` : ''}`);
    }
  }
  const account = accountLine(issue);
  if (account) lines.push(account);
  lines.push(`  What the report says: ${issue.explanation}`);
  lines.push(`  Why it merits attention: ${issue.uncertainty}`);
  lines.push(`  Request (${issue.request_type === issues.REQUEST_TYPE.CORRECTION ? 'correction' : 'verification'}): ${issue.request_wording}`);
  lines.push('');
  return lines;
}

/**
 * The correspondence block: who it is addressed to BY TYPE, the consumer-entered details, and one request per
 * SELECTED issue and nothing else. No address, remedy, deadline, signature or submitted status is ever invented.
 */
function correspondenceLines(packet, row, selected) {
  const identity = reportIdentity(row) || {};
  const c = correspondenceOf(packet);
  const lines = [];
  lines.push('CORRESPONDENCE TO SEND (you send this; this service sends nothing)');
  lines.push('='.repeat(72));
  lines.push(`To: ${RECIPIENT_LABEL[recipientTypeOf(packet)]}`);
  lines.push(`From: ${c.consumer_name || '(not supplied yet)'}`);
  lines.push(`Reply to: ${c.contact || '(not supplied yet)'}`);
  if (c.account_reference) lines.push(`Your reference: ${c.account_reference}`);
  lines.push(`About: ${identity.bureau || 'a supported report'}${identity.reference_date ? ` (reference date ${identity.reference_date})` : ''}`);
  const accounts = [...new Set(selected.map((i) => i.account_identity && i.account_identity.name).filter(Boolean))];
  if (accounts.length) lines.push(`Account(s) concerned: ${accounts.join('; ')}`);
  lines.push('');
  lines.push('I am writing about the report identified above. Please verify or correct the following matters, which I have identified in that report:');
  lines.push('');
  let n = 0;
  for (const issue of selected) {
    n += 1;
    lines.push(`  ${n}. ${issue.request_wording}`);
  }
  lines.push('');
  lines.push('The facts each request rests on are listed under EVIDENCE REFERENCES below.');
  lines.push('');
  return lines;
}

/**
 * The organized evidence references: for each SELECTED issue, the report and record identity, the raw printed
 * readings, the normalized values and the available source locations, plus the recorded rule only where a statutory
 * duty applies. A factual verification request carries no citation, and none is invented for it.
 */
/** The raw readings of one issue, from whichever shape the unified descriptor uses: the printed facts of a
 *  factual/content finding, or the single printed date a statutory comparison measures from. */
function evidenceFacts(issue) {
  const out = [];
  const seen = new Set();
  const push = (field, raw, normalized, location, provenance, definition) => {
    if (raw == null && normalized == null) return;
    const loc = location || {};
    const key = `${field}|${raw}|${normalized}|${loc.page}|${loc.line}|${JSON.stringify(provenance || null)}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ field: field || null, raw, normalized, location: location || null, code_definition: definition || null });
  };
  for (const f of (issue.source_facts || [])) {
    push(f.source_field || f.field, f.raw_value, f.normalized_value, f.location,
      f.report_reference_date ? [f.role, f.source_file_id, f.source_result_id, f.bureau, f.report_reference_date] : null,
      f.field === 'account.paymentHistoryDefinition' ? f.code_definition : null);
  }
  if (issue.source) {
    push(issue.source.source_field || (issue.record && issue.record.source_field), issue.source.raw_value, issue.source.normalized_value, issue.source.location || issue.location);
  }
  for (const basis of issue.supported_bases || []) {
    for (const f of basis.source_facts || []) {
      push(f.source_field || f.field, f.raw_value, f.normalized_value, f.location);
    }
    if (basis.source) push(basis.source.source_field || basis.anchor_field,
      basis.source.raw_value, basis.source.normalized_value, basis.source.location);
  }
  return out;
}

function externalDefinitionLine(fact, indent) {
  const definition = fact.code_definition, source = definition.source;
  return `${indent}Published code definition: ${definition.code} = ${definition.meaning}; ${source.publisher}, ${source.title}, ${source.section} (version ${source.version}); ${source.url}`;
}

function evidenceLines(selected) {
  const lines = [];
  lines.push(selected.some((issue) => (issue.source_facts || []).some((fact) => fact.field === 'account.paymentHistoryDefinition'))
    ? 'EVIDENCE REFERENCES (report readings and published code definitions)' : 'EVIDENCE REFERENCES (from your report)');
  lines.push('='.repeat(72));
  let n = 0;
  for (const issue of selected) {
    n += 1;
    const kind = issue.request_type === issues.REQUEST_TYPE.CORRECTION ? 'correction' : 'verification';
    const heading = issue.label || (issue.record && issue.record.kind_label) || 'a reporting matter';
    lines.push(`  ${n}. ${heading} - ${kind}`);
    if (issue.report_identity && (issue.report_identity.bureau || issue.report_identity.reference_date)) {
      lines.push(`     Report: ${issue.report_identity.bureau || 'a report'}${issue.report_identity.reference_date ? ` (reference date ${issue.report_identity.reference_date})` : ''}`);
    }
    if (issue.record_index != null) lines.push(`     Record: ${(issue.record && issue.record.kind_label) || 'a record'} ${issue.record_index}`);
    const account = accountLine(issue, '     ');
    if (account) lines.push(account);
    if (issue.citation) lines.push(`     Recorded rule: ${issue.citation}${issue.source_version ? ` (source version ${issue.source_version})` : ''}`);
    for (const citation of issue.retention_review && issue.retention_review.citations || []) {
      lines.push(`     Reporting-period rule: ${citation}`);
    }
    /* OWNER-CA-ORDINARY-REPORT-002: an issue may rest on more than one supported base. Each factual base is
       stated in plain language so the correspondence shows what the issue rests on, not only its recorded rule. */
    for (const b of (issue.supported_bases || [])) {
      if (b.basis_type === issues.BASIS_TYPE.FACTUAL_CONSISTENCY) {
        lines.push(`     Also rests on: what the report prints — ${b.label || 'a factual discrepancy the report prints'}`);
      }
      if (b.basis_type === issues.BASIS_TYPE.STATUTORY_RETENTION && b.adapter_id !== issue.adapter_id) {
        lines.push(`     Additional supporting rule: ${b.citation}${b.source_version ? ` (source version ${b.source_version})` : ''}`);
        if (b.uncertainty) lines.push(`     Qualification for this rule: ${b.uncertainty}`);
      }
    }
    for (const f of evidenceFacts(issue)) {
      const loc = f.location;
      const pageLine = loc && loc.page != null ? `page ${loc.page}${loc.line != null ? `, line ${loc.line}` : ''}` : 'source location recorded';
      const label = f.field ? `${f.field}: ` : '';
      lines.push(f.code_definition ? externalDefinitionLine(f, '     ')
        : `     ${label}printed "${f.raw}" (${pageLine})${f.normalized != null ? `, normalized to ${f.normalized}` : ', not normalized'}`);
    }
    lines.push('');
  }
  return lines;
}

/** Assemble the full packet document, bound to the approved version. */
function packetDocumentBody(store, actor, caseId) {
  const { packet, row, selected } = resolveSelected(store, actor, caseId);
  const identity = reportIdentity(row) || {};
  const lines = [];
  lines.push('CRP CORRECTION PACKET');
  lines.push('Source-supported reporting issue correction and verification requests');
  lines.push('='.repeat(72));
  lines.push(`Produced: ${nowIso()}`);
  lines.push(`Report: ${identity.bureau || 'a supported report'}${identity.reference_date ? ` (reference date ${identity.reference_date})` : ''}`);
  lines.push(`Approved version: ${packet.approved_version}`);
  lines.push(`Selected issues: ${selected.length}`);
  lines.push('');
  lines.push(...correspondenceLines(packet, row, selected));
  lines.push('ISSUES AND THE FACTS THEY CAME FROM');
  lines.push('');
  for (const issue of selected) {
    lines.push(...issueLines(issue));
  }
  lines.push(...evidenceLines(selected));
  if (packet.wording) {
    lines.push('YOUR OWN WORDS (added by you; kept separate from the report facts above)');
    lines.push('');
    lines.push(packet.wording);
    lines.push('');
  }
  lines.push('='.repeat(72));
  lines.push('This packet states the reporting issues found in your report, the facts they came from and their uncertainty.');
  lines.push('It is assembled locally for you to review, edit and send yourself. This service supplies no address and sends nothing: sending it is your decision.');
  lines.push('');
  return lines.join('\n');
}

/** The downloadable packet file, bound to the approved version. */
function packetDownload(store, actor, caseId) {
  const body = packetDocumentBody(store, actor, caseId);
  const packet = currentPacket(store, caseId);
  return {
    filename: `CRP-correction-packet-${caseId}.txt`,
    content_type: 'text/plain; charset=utf-8',
    body,
    approved_version: packet.approved_version,
    is_a_response_packet: true,
    is_fictional: false
  };
}

module.exports = {
  packetView,
  selectIssues,
  setWording,
  setCorrespondence,
  approvePacket,
  packetDownload,
  eligibleIssues,
  canonicalVersion,
  issueContent,
  RECIPIENT_TYPE
};

