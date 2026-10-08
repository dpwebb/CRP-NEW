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
const support = require('./packet-support.cjs');
const accountDocuments = require('./account-documents.cjs');
const reportExhibits = require('./packet-report-exhibits.cjs');
const { archive } = require('./packet-archive.cjs');
const { renderPacketPdf } = require('./packet-pdf.cjs');
const { ServiceError } = require('./errors.cjs');
const cases = require('./cases.cjs');
const issues = require('./issues.cjs');
const accountDisplay = require('./account-display.cjs');
const CHECKLIST_LABELS = new Map(require('./common-error-checklist.cjs').CHECKS.map(check => [check.check_id, check.label]));
const { reportDateValue, reportReference } = require('./report-fact-sources.cjs');
const bureauRules = require('./bureau-dispute-requirements.cjs');

function selectedBureaus(country, row, selected) {
  const own = [...new Set(selected.map(issue => bureauRules.normalizeBureau(issue.report_identity?.bureau, country)).filter(Boolean))];
  return own.length ? own : [bureauRules.normalizeBureau(reportIdentity(row)?.bureau, country)].filter(Boolean);
}
function bureauMismatch(country, row, selected, settings) {
  return settings && selectedBureaus(country, row, selected).some(bureau => bureau !== settings.bureau);
}
function requireBureau(country, row, selected, settings) {
  if (bureauMismatch(country, row, selected, settings)) throw new ServiceError('PACKET_BUREAU_MISMATCH');
}
function packetIdentity(row, selected) {
  const identities = [...new Map(selected.filter(issue => issue.report_identity?.bureau).map(issue => [JSON.stringify(issue.report_identity), issue.report_identity])).values()];
  if (!identities.length) return reportIdentity(row) || {};
  if (identities.length === 1) return identities[0];
  return { bureau: [...new Set(identities.map(identity => identity.bureau))].join(' / '), reference_date: [...new Set(identities.map(identity => identity.reference_date).filter(Boolean))].join(', ') };
}
function purposeFor(selected) {
  const kinds = selected.map(issue => String(issue.record?.kind_label || '').toLowerCase());
  const account = kinds.some(kind => /credit account/.test(kind));
  const publicRecord = kinds.some(kind => /collection|judgment|bankruptcy|public record|tax lien/.test(kind));
  return { purpose: account ? 'ACCOUNT' : publicRecord ? 'PUBLIC_RECORD' : null, mixed: account && publicRecord };
}
function enrichedCurrentPacket(store, actor, country, caseId) {
  const packet = currentPacket(store, caseId), row = latestResult(store, caseId);
  const selected = eligibleIssues(row).filter(issue => packet?.selected_issue_ids?.includes(issue.issue_id));
  const enriched = support.enrich(store, actor, country, packet, purposeFor(selected).mixed);
  if (enriched) enriched.report_snapshot = reportExhibits.prepare(store, actor, caseId, row, selected, packet.report_file_ids);
  return enriched;
}
function purposeMismatch(country, selected, settings) {
  if (!settings || country !== 'CA' || settings.bureau !== 'EQUIFAX') return false;
  const expected = purposeFor(selected);
  return expected.purpose && (settings.purpose !== expected.purpose || (expected.mixed && settings.identity_shows_address));
}
function requirePurpose(country, selected, settings) {
  if (purposeMismatch(country, selected, settings)) throw new ServiceError('PACKET_PURPOSE_MISMATCH');
}

function nowIso() {
  return new Date().toISOString();
}

function newPacketId() {
  return `pkt_${crypto.randomBytes(12).toString('hex')}`;
}

function latestResult(store, caseId) {
  const rows = store.state().results.filter((r) => r.case_id === caseId);
  return rows.length ? accountDisplay.resultRow(store, rows[rows.length - 1]) : null;
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
    reference_date: reportDateValue(ext.reference_date)
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
    'packet-format:print-4',
    `result:${packetRow.result_id || ''}`,
    `selection:${ordered.map((i) => i.issue_id).join(',')}`,
    `issues:${ordered.map(issueContent).join(';')}`,
    `wording:${packetRow.wording || ''}`,
    `recipient:${recipientTypeOf(packetRow)}`,
    `correspondence:${JSON.stringify(correspondenceOf(packetRow))}`,
    `support:${JSON.stringify(packetRow.support_snapshot || null)}`,
    `report-copies:${JSON.stringify(packetRow.report_snapshot?.material || [])}`,

    `bureau:${identity.bureau || ''}`,
    `reference:${identity.reference_date || ''}`,
    // Supporting report identity is material too, even when account facts alone prove the issue.
    `reference-sources:${JSON.stringify({
      cover: identity.reference_date ? resultRow.extraction.reference_date : null,
      selected: ordered.map((issue) => [...new Set([
        issue.record_index, issue.evidence?.duplicate_of_record, issue.evidence?.other_record,
        issue.evidence?.original_record,
        ...(issue.rule_assessment?.required_facts || []).map((fact) => fact.source?.record_index),
        ...(issue.source_facts || []).map((fact) => fact.record_index)
      ].filter((index) => index != null))].sort((a, b) => a - b).map((index) => ({
        record_index: index, source: reportReference((resultRow.extraction.records || [])
          .find((record) => record.record_index === index))
      })))
    })}`
  ];
  return crypto.createHash('sha256').update(parts.join('\n'), 'utf8').digest('hex');
}

function packetView(store, actor, caseId) {
  const owned = cases.requireOwnedCase(store, actor, caseId);
  const row = latestResult(store, caseId);
  const eligible = row ? eligibleIssues(row) : [];
  const packet = enrichedCurrentPacket(store, actor, owned.country, caseId);
  const identity = row ? reportIdentity(row) : null;

  /* The correspondence and its organized evidence, exactly as they will appear in the download, so the consumer
     reviews the same thing they will send. */
  const selectedIssues = packet
    ? (packet.selected_issue_ids || []).map((id) => eligible.find((i) => i.issue_id === id)).filter(Boolean)
    : [];
  const wrongBureau = bureauMismatch(owned.country, row, selectedIssues, packet?.support);
  const wrongPurpose = purposeMismatch(owned.country, selectedIssues, packet?.support);
  if (wrongBureau && packet.support_snapshot) packet.support_snapshot.missing.push('Choose the bureau that issued the selected report. Prepare separate packets for different bureaus.');
  if (wrongPurpose && packet.support_snapshot) packet.support_snapshot.missing.push('Choose the checklist for the selected entries. Account corrections need the account checklist; collections and public records need their own checklist. Mixed entries also need address proof.');
  const approvalStale = Boolean(packet && packet.approved_version && (!row
    || wrongBureau || wrongPurpose || packet.result_id !== row.result_id
    || selectedIssues.length !== (packet.selected_issue_ids || []).length
    || canonicalVersion(packet, row, selectedIssues) !== packet.approved_version));
  const correspondenceMissing = missingCorrespondenceFields(packet);
  const correspondencePreview = selectedIssues.length
    ? documentText(packet, row, selectedIssues)
    : null;
  return {
    report_identity: identity,
    eligible_issues: eligible.map(issues.publicIssue),
    support: { ...support.publicView(store, actor, owned.country, selectedBureaus(owned.country, row, selectedIssues)[0] || owned.selected_bureau || identity?.bureau, packet), suggested_purpose: purposeFor(selectedIssues.length ? selectedIssues : eligible).purpose },
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
      preview_version: packet && row && selectedIssues.length ? canonicalVersion(packet, row, selectedIssues) : null,
      attachment_manifest: attachmentManifest(packet),
      report_exhibits: packet?.report_snapshot?.view || [],
      report_attachment_manifest: reportAttachmentManifest(packet),
      required_form_manifest: requiredFormManifest(packet),
      print_instructions: printingInstructions(packet),
      print_available: Boolean(packet && packet.approved_version && !approvalStale),
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
  const previous = currentPacket(store, caseId);
  if (previous?.report_file_ids?.length) {
    const previousResult = accountDisplay.resultRow(store, store.state().results.find(result => result.result_id === previous.result_id && result.case_id === caseId));
    const previousSelected = eligibleIssues(previousResult).filter(issue => previous.selected_issue_ids.includes(issue.issue_id));
    reportExhibits.prepare(store, actor, caseId, previousResult, previousSelected, previous.report_file_ids);
  }
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
  const allowedReports = reportExhibits.available(store, actor, row, selected).map(copy => copy.file_id);
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
    packet.report_file_ids = (packet.report_file_ids || []).filter(id => allowedReports.includes(id));
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

/** Consumer-selected bureau route and account documents, separate from report facts. */
function setSupport(store, actor, caseId, input) {
  const owned = cases.requireOwnedCase(store, actor, caseId);
  const packet = currentPacket(store, caseId), row = latestResult(store, caseId);
  if (!packet || !row) throw new ServiceError('PACKET_NO_SELECTION');
  const settings = support.normalize(input, owned.country);
  const selected = eligibleIssues(row).filter(issue => packet.selected_issue_ids.includes(issue.issue_id));
  requireBureau(owned.country, row, selected, settings);
  requirePurpose(owned.country, selected, settings);
  accountDocuments.materialDocuments(store, actor, settings.document_ids);
  store.update(state => {
    const live = state.packets.find(item => item.packet_id === packet.packet_id);
    live.support = settings; live.approved_version = null; live.approved_at = null; live.updated_at = nowIso();
  });
}

/** Include only report copies the consumer chose after seeing their full scope. */
function setReportFiles(store, actor, caseId, fileIds) {
  cases.requireOwnedCase(store, actor, caseId);
  const packet = currentPacket(store, caseId);
  if (!packet) throw new ServiceError('PACKET_NO_SELECTION');
  const ids = reportExhibits.normalizedSelection(fileIds);
  if (!ids.length) {
    store.update(state => {
      const live = state.packets.find(item => item.packet_id === packet.packet_id);
      live.report_file_ids = []; live.approved_version = null; live.approved_at = null; live.updated_at = nowIso();
    });
    return;
  }
  const { row, eligible } = requireResultAndEligible(store, actor, caseId);
  if (!packet.selected_issue_ids?.length) throw new ServiceError('PACKET_NO_SELECTION');
  if (packet.result_id !== row.result_id) throw new ServiceError('PACKET_APPROVAL_STALE');
  const selected = packet.selected_issue_ids.map(id => eligible.find(issue => issue.issue_id === id));
  if (selected.some(issue => !issue)) throw new ServiceError('PACKET_APPROVAL_STALE');
  const available = reportExhibits.available(store, actor, row, selected);
  for (const id of ids) {
    const file = store.state().files.find(item => item.file_id === id);
    if (file && file.account_id !== actor.account_id) throw new ServiceError('NOT_AUTHORIZED');
    if (!available.some(copy => copy.file_id === id)) throw new ServiceError('INVALID_FINDING_SELECTION');
  }
  store.update(state => {
    const live = state.packets.find(item => item.packet_id === packet.packet_id);
    live.report_file_ids = ids; live.approved_version = null; live.approved_at = null; live.updated_at = nowIso();
  });
}

/** Before approval, open an exact original allowed by the current issue selection. */
function packetReport(store, actor, caseId, fileId) {
  cases.requireOwnedCase(store, actor, caseId);
  const file = store.state().files.find(item => item.file_id === fileId);
  if (!file) throw new ServiceError('NOT_FOUND');
  if (file.account_id !== actor.account_id) throw new ServiceError('NOT_AUTHORIZED');
  const packet = enrichedCurrentPacket(store, actor, cases.getCase(store, actor, caseId).country, caseId);
  const row = latestResult(store, caseId);
  if (!packet?.selected_issue_ids?.length) throw new ServiceError('PACKET_NO_SELECTION');
  if (packet.result_id !== row?.result_id) throw new ServiceError('PACKET_APPROVAL_STALE');
  const selected = eligibleIssues(row).filter(issue => packet.selected_issue_ids.includes(issue.issue_id));
  if (selected.length !== packet.selected_issue_ids.length) throw new ServiceError('PACKET_APPROVAL_STALE');
  const copy = reportExhibits.available(store, actor, row, selected).find(item => item.file_id === fileId);
  if (!copy) throw new ServiceError('INVALID_FINDING_SELECTION');
  const ext = copy.content_type === 'application/pdf' ? 'pdf' : copy.content_type === 'image/png' ? 'png' : 'jpg';
  return { body: copy.bytes, content_type: copy.content_type, filename: `report-copy.${ext}` };
}

/** Refuse approval or download while a necessary correspondence detail is blank. */
function requireCorrespondence(packet) {
  const missing = missingCorrespondenceFields(packet);
  if (missing.length) throw new ServiceError('PACKET_CORRESPONDENCE_REQUIRED', { missing });
}


/** Explicitly approve the current version. Requires a non-empty selection bound to the current result. */
function approvePacket(store, actor, caseId, expectedVersion, requirePostal) {
  const owned = cases.requireOwnedCase(store, actor, caseId);
  const packet = enrichedCurrentPacket(store, actor, owned.country, caseId);
  if (!packet || !packet.selected_issue_ids || !packet.selected_issue_ids.length) {
    throw new ServiceError('PACKET_NO_SELECTION');
  }
  const row = latestResult(store, caseId);
  if (!row || packet.result_id !== row.result_id) throw new ServiceError('PACKET_APPROVAL_STALE');
  const eligible = eligibleIssues(row);
  const byId = new Map(eligible.map((i) => [i.issue_id, i]));
  const selected = packet.selected_issue_ids.map((id) => byId.get(id)).filter(Boolean);
  if (selected.length !== packet.selected_issue_ids.length) throw new ServiceError('PACKET_APPROVAL_STALE');
  requireBureau(owned.country, row, selected, packet.support);
  requirePurpose(owned.country, selected, packet.support);
  /* A usable piece of correspondence needs its necessary details before it can be approved. */
  requireCorrespondence(packet);
  if (requirePostal && (packet.support?.channel !== 'POSTAL' || !packet.support_snapshot?.requirements?.postal)) throw new ServiceError('PACKET_SUPPORT_REQUIRED');
  if (packet.support_snapshot?.missing.length) throw new ServiceError('PACKET_SUPPORT_REQUIRED');
  if (expectedVersion != null && canonicalVersion(packet, row, selected) !== expectedVersion) throw new ServiceError('PACKET_APPROVAL_STALE');
  return store.update((state) => {
    const live = state.packets.find((p) => p.case_id === caseId);
    live.approved_version = canonicalVersion(packet, row, selected);
    live.approved_at = nowIso();
    live.updated_at = nowIso();
    return live;
  });
}

/** Resolve the approved, non-stale selected issues (throws on any stale/ineligible selection). */
function resolveSelected(store, actor, caseId) {
  const owned = cases.requireOwnedCase(store, actor, caseId);
  const packet = enrichedCurrentPacket(store, actor, owned.country, caseId);
  if (!packet || !packet.approved_version) throw new ServiceError('PACKET_NOT_APPROVED');
  requireCorrespondence(packet);
  const row = latestResult(store, caseId);
  if (!row) throw new ServiceError('NO_RESULT_TO_DOWNLOAD');
  if (packet.result_id !== row.result_id) throw new ServiceError('PACKET_APPROVAL_STALE');
  const eligible = eligibleIssues(row);
  const byId = new Map(eligible.map((i) => [i.issue_id, i]));
  const selected = packet.selected_issue_ids.map((id) => byId.get(id));
  if (selected.some((i) => !i)) throw new ServiceError('PACKET_APPROVAL_STALE');
  requireBureau(owned.country, row, selected, packet.support);
  requirePurpose(owned.country, selected, packet.support);
  if (canonicalVersion(packet, row, selected) !== packet.approved_version) throw new ServiceError('PACKET_APPROVAL_STALE');
  if (packet.support_snapshot?.missing.length) throw new ServiceError('PACKET_SUPPORT_REQUIRED');
  return { packet, row, selected };
}


/**
 * The credited ACCOUNT one selected issue concerns, with the printed reading and the page/line it came from.
 * Never invented: an issue whose record prints no account name renders nothing here.
 */
function accountLine(issue, indent) {
  const ai = issue && issue.account_identity;
  if (!ai || !ai.name) return null;
  if (ai.entries) return ai.entries.map(entry => accountLine({ account_identity: entry }, indent)).join('\n');
  const pad = indent || '  ';
  const loc = ai.location && ai.location.page != null
    ? ` (page ${ai.location.page}${ai.location.line != null ? `, line ${ai.location.line}` : ''})`
    : '';
  const raw = ai.raw_value && ai.raw_value !== ai.name ? ` — printed "${ai.raw_value}"` : '';
  return `${pad}Account: ${ai.name}${raw}${loc}`;
}

/**
 * The correspondence block: who it is addressed to BY TYPE, the consumer-entered details, and one request per
 * SELECTED issue and nothing else. No address, remedy, deadline, signature or submitted status is ever invented.
 */
function correspondenceLines(packet, row, selected) {
  const identity = packetIdentity(row, selected);
  const c = correspondenceOf(packet);
  const lines = [];
  lines.push('CREDIT REPORT DISPUTE');
  lines.push('');
  lines.push(`To: ${packet.support_snapshot?.requirements?.label || RECIPIENT_LABEL[recipientTypeOf(packet)]}`);
  if (packet.support_snapshot?.requirements?.postal) lines.push(packet.support_snapshot.requirements.postal);
  lines.push(`From: ${c.consumer_name || '(not supplied yet)'}`);
  lines.push(`Reply to: ${c.contact || '(not supplied yet)'}`);
  if (c.account_reference) lines.push(`Your reference: ${c.account_reference}`);
  lines.push(`Report: ${identity.bureau || 'a supported report'}${identity.reference_date ? ` (report date ${identity.reference_date})` : ''}`);
  const extra = packet.support_snapshot;
  if (extra?.settings.use_account_profile && extra.profile.date_of_birth) lines.push(`Date of birth: ${extra.profile.date_of_birth}`);
  if (extra?.settings.use_account_profile && extra.profile.previous_address) lines.push(`Previous address: ${extra.profile.previous_address}`);
  if (extra?.settings.identity_reference) lines.push(`${extra.requirements.country === 'US' ? 'Social Security number' : 'Identification reference'}: ${extra.settings.identity_reference}`);
  if (extra?.settings.no_ssn_issued && extra.requirements.country === 'US') lines.push('I have never been issued a Social Security number.');
  if (extra?.settings.other_identity_details) lines.push(extra.settings.other_identity_details);
  lines.push('');
  lines.push('Please check the items below in my credit report. Correct any wrong information and send me your reply.');
  lines.push('');
  let n = 0;
  for (const issue of selected) {
    n += 1;
    const account = issue.account_identity?.name;
    lines.push(`  ${n}. ${account ? account + ': ' : ''}${issue.request_wording}`);
  }
  lines.push('');
  if (packet.wording) {
    lines.push('My added message:');
    lines.push(packet.wording);
    lines.push('');
  }
  lines.push('The attached evidence pages show the report details for each item.');
  if (attachmentManifest(packet).length) lines.push(`I have included ${attachmentManifest(packet).length} supporting document${attachmentManifest(packet).length === 1 ? '' : 's'}. They are listed at the end.`);
  lines.push('');
  lines.push('Signature: ________________________');
  lines.push('Date: ________________________');
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
function privateFactDescription(field, caption) {
  if (field === 'account.member_reference') return 'Member number matched from the report';
  if (/Member Name/i.test(caption || '')) return 'Reporting member matched from the report';
  return 'Creditor identity matched from the report';
}

function evidenceFacts(issue) {
  const out = [];
  const seen = new Set();
  const push = (field, raw, normalized, location, provenance, definition, periodDefinition, privacyRedacted, omitted, factField) => {
    if (raw == null && normalized == null && !omitted) return;
    const loc = location || {};
    const key = `${field}|${raw}|${normalized}|${loc.page}|${loc.line}|${JSON.stringify(provenance || null)}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ field: field || null, fact_field: factField || field || null, raw, normalized, location: location || null,
      code_definition: definition || null, period_definition: periodDefinition || null,
      ...(omitted ? { omitted_value: true } : {}),
      ...(privacyRedacted ? { privacy_redacted: true } : {}) });
  };
  for (const f of (issue.source_facts || [])) {
    push(f.source_field || f.field, f.privacy_redacted ? privateFactDescription(f.field, f.source_field) : f.raw_value,
      f.privacy_redacted ? null : f.normalized_value, f.location,
      f.report_reference_date ? [f.role, f.source_file_id, f.source_result_id, f.bureau, f.report_reference_date] : null,
      f.field === 'account.paymentHistoryDefinition' ? f.code_definition : null,
      f.period_definition, f.privacy_redacted, f.omitted_value, f.field);
  }
  if (issue.source) {
    push(issue.source.source_field || (issue.record && issue.record.source_field), issue.source.raw_value, issue.source.normalized_value, issue.source.location || issue.location);
  }
  for (const basis of issue.supported_bases || []) {
    for (const f of basis.source_facts || []) {
      push(f.source_field || f.field, f.raw_value, f.normalized_value, f.location, null, null, null, false, false, f.field);
    }
    if (basis.source) push(basis.source.source_field || basis.anchor_field,
      basis.source.raw_value, basis.source.normalized_value, basis.source.location);
  }
  return out;
}

function externalDefinitionLine(fact, indent) {
  if (fact.period_definition) {
    const source = fact.period_definition.source;
    return `${indent}Published history-period definition: most recent month first; one calendar month per cell; ${source.publisher}, ${source.title}, ${source.section}${sourceVersionSuffix(source.version)}; ${source.url}`;
  }
  const definition = fact.code_definition, source = definition.source;
  return `${indent}Published code definition: ${definition.code} = ${definition.meaning}; ${source.publisher}, ${source.title}, ${source.section}${sourceVersionSuffix(source.version)}; ${source.url}`;
}
function sourceVersionSuffix(value) {
  return typeof value === 'string' && value && !/^[a-f0-9]{32,128}$/i.test(value) ? ` (source version ${value})` : '';
}
function materialUncertainty(value) {
  return value && !/^(?:Every|All) report-determinable fact(?:s)? (?:is|are) resolved\.?$/i.test(value.trim()) ? value : null;
}
function factLabel(value) {
  if (!value) return value;
  // Report/account context belongs to the reading, but its final field may still
  // be an internal key. Keep that context and genuine spaced bureau captions.
  const contextual = /^((?:(?:Earlier|Current) report [^:]+|Account \d+):\s*)(.+)$/.exec(value);
  if (contextual) return contextual[1] + factLabel(contextual[2]);
  if (/\s/.test(value) || !/^[A-Za-z][A-Za-z0-9_.]*$/.test(value)) return value;
  const field = value.split('.').pop();
  const familiar = {
    openeddate: 'Date opened', dateopened: 'Date opened',
    closeddate: 'Date closed', dateclosed: 'Date closed',
    firstdelinquencydate: 'First missed-payment date', firstdelinquency: 'First missed-payment date',
    lastpaymentdate: 'Last payment date', lastpayment: 'Last payment date',
    pastdueamount: 'Amount overdue', creditlimit: 'Credit limit',
    maskedidentifier: 'Account number', reportedidentifier: 'Account number',
    reportedidentity: 'Account name on the report'
  }[field.replace(/_/g, '').toLowerCase()];
  if (familiar) return familiar;
  if (!/[_ .]|[a-z][A-Z]/.test(value)) return value;
  const words = field.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function evidenceLines(selected) {
  const lines = [];
  lines.push(selected.some((issue) => (issue.source_facts || []).some((fact) => fact.code_definition || fact.period_definition))
    ? 'EVIDENCE REFERENCES (report readings and published definitions)' : 'EVIDENCE REFERENCES (from your report)');
  lines.push('These are the report details for the items in my letter.');
  lines.push('');
  let n = 0;
  for (const issue of selected) {
    n += 1;
    const kind = issue.request_type === issues.REQUEST_TYPE.CORRECTION ? 'correction' : 'verification';
    const heading = CHECKLIST_LABELS.get(issue.check_id) || issue.label || (issue.record && issue.record.kind_label) || 'a reporting matter';
    lines.push(`  ${n}. ${heading} - ${kind}`);
    if (issues.consumerLabel(issue)) lines.push(`     ${issues.consumerLabel(issue)}`);
    if (issue.report_identity && (issue.report_identity.bureau || issue.report_identity.reference_date)) {
      lines.push(`     Report: ${issue.report_identity.bureau || 'a report'}${issue.report_identity.reference_date ? ` (reference date ${issue.report_identity.reference_date})` : ''}`);
    }
    if (issue.record_index != null) lines.push(`     Record: ${(issue.record && issue.record.kind_label) || 'a record'} ${issue.record_index}`);
    const account = accountLine(issue, '     ');
    if (account) lines.push(account);
    if (issue.rule_assessment?.requirement) lines.push(`     Reporting rule: ${issue.rule_assessment.requirement}`);
    if (issue.citation) lines.push(`     Recorded rule: ${issue.citation}${sourceVersionSuffix(issue.source_version)}`);
    for (const citation of issue.retention_review && issue.retention_review.citations || []) {
      lines.push(`     Reporting-period rule: ${citation}`);
    }
    /* OWNER-CA-ORDINARY-REPORT-002: an issue may rest on more than one supported base. Each factual base is
       stated in plain language so the correspondence shows what the issue rests on, not only its recorded rule. */
    for (const b of (issue.supported_bases || [])) {
      if (b.basis_type === issues.BASIS_TYPE.FACTUAL_CONSISTENCY) {
        if (!issue.rule_assessment?.requirement && b.rule_assessment?.requirement) lines.push(`     Reporting rule: ${b.rule_assessment.requirement}`);
      }
      if (b.basis_type === issues.BASIS_TYPE.STATUTORY_RETENTION && b.adapter_id !== issue.adapter_id) {
        lines.push(`     Additional supporting rule: ${b.citation}${sourceVersionSuffix(b.source_version)}`);
        if (materialUncertainty(b.uncertainty)) lines.push(`     Qualification for this rule: ${b.uncertainty}`);
      }
    }
    for (const f of evidenceFacts(issue)) {
      const loc = f.location;
      const pageLine = loc && loc.page != null ? `page ${loc.page}${loc.line != null ? `, line ${loc.line}` : ''}` : 'source location recorded';
      const label = f.field ? `${factLabel(f.field)}: ` : '';
      const internalMaskedReference = f.fact_field === 'account.masked_identifier' && /^MASK-/.test(String(f.normalized));
      lines.push(f.code_definition || f.period_definition ? externalDefinitionLine(f, '     ')
        : f.omitted_value ? `     Printed caption without a value: ${factLabel(f.field)} (${pageLine})`
        : f.privacy_redacted ? `     ${privateFactDescription(f.fact_field, f.field)} (${pageLine})`
        : `     ${label}printed "${f.raw}" (${pageLine})${!internalMaskedReference && f.normalized != null && String(f.normalized) !== String(f.raw) ? `; read as ${f.normalized}` : ''}`);
    }
    if (issue.explanation) lines.push(`     What the report says: ${issue.explanation}`);
    if (materialUncertainty(issue.uncertainty)) lines.push(`     What needs checking: ${issue.uncertainty}`);
    lines.push('');
  }
  return lines;
}

/** Assemble the full packet document, bound to the approved version. */
function attachmentManifest(packet) {
  return (packet?.support_snapshot?.documents || []).map((document, index) => {
    const ext = document.content_type === 'application/pdf' ? 'pdf' : document.content_type === 'image/png' ? 'png' : 'jpg';
    return { file_id: document.file_id, original_filename: document.original_filename,
      document_type: document.document_type,
      archive_name: `documents/${String(index + 1).padStart(2, '0')}-${document.document_type.toLowerCase()}.${ext}` };
  });
}
function reportAttachmentManifest(packet) {
  return packet?.report_snapshot?.manifest || [];
}
function printingInstructions(packet) {
  const attached = attachmentManifest(packet).length;
  const forms = requiredFormManifest(packet);
  return [
    'Print this letter and all evidence pages. Sign and date the letter.',
    ...(attached ? ['Open the documents folder in your download. Print each listed document and add it to your letter.'] : []),
    ...reportAttachmentManifest(packet).map(copy => `Open ${copy.archive_name} (${copy.label}). ${copy.relevant_pages.length ? `Print report page${copy.relevant_pages.length === 1 ? '' : 's'} ${copy.relevant_pages.join(', ')} and add ${copy.relevant_pages.length === 1 ? 'it' : 'them'} to your letter.` : 'Print this report copy and add it to your letter.'}`),
    ...forms.map(form => `Print ${form.filename} (${form.label}). ${form.instructions}`),
    ...(packet?.support_snapshot?.requirements?.items || []),
    'Keep a copy. Mail the packet to the bureau address shown in your letter.'
  ];
}
function requiredFormManifest(packet) {
  return (packet?.support_snapshot?.form_assets || []).map(form => ({
    filename: form.filename, label: form.label, source_url: form.source_url, sha256: form.sha256, instructions: form.instructions
  }));
}
function documentText(packet, row, selected) {
  const lines = [...correspondenceLines(packet, row, selected), ...evidenceLines(selected), 'PRINT AND MAIL', ''];
  for (const item of printingInstructions(packet)) lines.push('- ' + item);
  const attachments = attachmentManifest(packet);
  if (attachments.length) {
    lines.push('', 'Documents to print and include:');
    attachments.forEach(document => lines.push(`- ${document.archive_name}: ${document.original_filename} (${document.document_type.toLowerCase().replace(/_/g, ' ')})`));
  }
  const reports = reportAttachmentManifest(packet);
  if (reports.length) {
    lines.push('', 'Report copies in your download:');
    reports.forEach(copy => lines.push(`- ${copy.archive_name}: ${copy.label}; ${copy.original_filename}. Entire report (${copy.page_count} page${copy.page_count === 1 ? '' : 's'}).${copy.relevant_pages.length ? ` The disputed information is on page${copy.relevant_pages.length === 1 ? '' : 's'} ${copy.relevant_pages.join(', ')}.` : ''}`));
  }
  return lines.join('\n').replace(/\r\n?/g, '\n').replace(/\t/g, '    ');
}
function packetDocumentBody(store, actor, caseId) {
  const { packet, row, selected } = resolveSelected(store, actor, caseId);
  return documentText(packet, row, selected);
}

/** The same approved PDF is opened for printing and included in the download. */
function packetPrint(store, actor, caseId) {
  const body = packetDocumentBody(store, actor, caseId);
  const packet = currentPacket(store, caseId), pdf = renderPacketPdf(body);
  return { filename: `CRP-dispute-letter-${caseId}.pdf`, content_type: 'application/pdf',
    body: pdf.bytes, approved_version: packet.approved_version, page_count: pdf.page_count,
    is_a_response_packet: true, is_fictional: false };
}

/** The downloadable packet file, bound to the approved version. */
function packetDownload(store, actor, caseId) {
  const printed = packetPrint(store, actor, caseId);
  const body = printed.body;
  const owned = cases.requireOwnedCase(store, actor, caseId);
  const packet = enrichedCurrentPacket(store, actor, owned.country, caseId);
  const forms = support.requiredForms ? support.requiredForms(packet) : [];
  if (packet.support?.document_ids?.length || forms.length || packet.report_snapshot?.copies.length) {
    const entries = [{ name: '01-correspondence.pdf', bytes: body }];
    for (const form of forms) entries.push({ name: form.filename, bytes: form.bytes });
    entries.push(...(packet.report_snapshot?.copies || []));
    (packet.support?.document_ids || []).forEach((id, index) => {
      const file = accountDocuments.getDocument(store, actor, id);
      const ext = file.document.content_type === 'application/pdf' ? 'pdf' : file.document.content_type === 'image/png' ? 'png' : 'jpg';
      entries.push({ name: `documents/${String(index + 1).padStart(2, '0')}-${file.document.document_type.toLowerCase()}.${ext}`, bytes: file.bytes });
    });
    return { filename: `CRP-dispute-packet-${caseId}.zip`, content_type: 'application/zip', body: archive(entries), approved_version: packet.approved_version, is_a_response_packet: true, is_fictional: false };
  }
  return printed;
}

module.exports = {
  packetView,
  selectIssues,
  setWording,
  setCorrespondence,
  setSupport,
  setReportFiles,
  packetReport,
  approvePacket,
  packetDownload,
  packetPrint,
  eligibleIssues,
  canonicalVersion,
  issueContent,
  RECIPIENT_TYPE
};

