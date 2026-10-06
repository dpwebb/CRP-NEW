'use strict';
/**
 * multi-file-assembly.cjs — GAP-INGEST-001. Coherent multi-file / image-set assessment.
 *
 * A consumer may upload a report as several files (one scanned page per image, or a multi-PDF). The evaluation
 * must examine EVERY uploaded page selected for the assessment, not just the last file, and it must preserve
 * file/page order and each fact's source location. This module assembles the admitted files of one case into a
 * single coherent extraction:
 *
 *   • ONLY admitted files are included; a refused file contributes nothing and is never read as absence.
 *   • An exact byte-for-byte duplicate (same stored_sha256) is recognised and skipped, so uploading the same
 *     page twice does not count its records as duplicate debts.
 *   • Files are kept in upload order; records are re-indexed globally and every record carries its source file
 *     id, its position in upload order and its original page/line.
 *   • Distinct bureau reports are kept in separate groups. Their records are never cross-borrowed (each record
 *     remains independent), and their report dates are recorded separately. If the included files print more
 *     than one distinct report date, the case-level reference date is withheld rather than borrowed.
 */
const { SUPPORT } = require('./formats.cjs');
const { GENERAL_PRESENTATION_ID } = require('./general-intake.cjs');

function isAdmitted(fileRow) {
  const e = fileRow && fileRow.extraction;
  return Boolean(
    e
    && e.admission
    && e.admission.admitted === true
    && e.support === SUPPORT.ACTUAL_REPORT_EVIDENCE
    && e.extraction_ran === true
  );
}

/** The report identity a file belongs to: a named presentation, or the bureau the report names. */
function baseIdentity(fileRow) {
  const e = fileRow.extraction;
  const presentation = e && e.presentation_id;
  if (presentation && presentation !== GENERAL_PRESENTATION_ID) return `PRESENTATION:${presentation}`;
  const bureau = e && e.bureau ? e.bureau : 'UNSPECIFIED';
  return `BUREAU:${bureau}`;
}

function dateIdentity(fileRow) {
  const e = fileRow.extraction;
  const rd = e && e.reference_date;
  return (rd && rd.status === 'RESOLVED' && (rd.normalized_value || rd.normalized))
    ? (rd.normalized_value || rd.normalized)
    : 'DATE_UNRESOLVED';
}

/* A report is a bureau/presentation AND a reference date. Two reports from the same bureau with different
   legitimate dates are different reports, never merged. */
function reportKey(fileRow) {
  return `${baseIdentity(fileRow)}|DATE:${dateIdentity(fileRow)}`;
}

/** Merge two detected-content-marker maps by union (a marker detected on any page stays detected). */
function mergeContentMarkers(into, from) {
  if (!from) return into;
  const out = into || {};
  for (const key of Object.keys(from)) {
    const src = from[key] || { detected: false, matches: [] };
    if (!out[key]) out[key] = { detected: false, matches: [] };
    if (src.detected) out[key].detected = true;
    out[key].matches = (out[key].matches || []).concat(src.matches || []);
  }
  return out;
}

/** Reconcile the reference dates the included files print. One date is kept (the full reading, unchanged);
   conflicting dates are withheld rather than borrowed. */
function reconcileReferenceDate(readings) {
  const resolved = (readings || []).filter((rd) => rd && rd.status === 'RESOLVED' && (rd.normalized_value || rd.normalized));
  const distinct = [...new Set(resolved.map((rd) => rd.normalized_value || rd.normalized))];
  if (distinct.length === 1) return resolved[0];
  if (distinct.length > 1) {
    return {
      raw: null, normalized: null, normalized_value: null, precision: null,
      status: 'EXTRACTION_UNRESOLVED',
      reason: 'CONFLICTING_REPORT_DATES_ACROSS_FILES',
      distinct_report_dates: distinct
    };
  }
  return null;
}

const ACCOUNT_KINDS = Object.freeze(['GENERAL_ACCOUNT', 'CONSUMER_CREDIT_LIABILITY', 'REPORTED_ACCOUNT', 'OVERDUE_ACCOUNT']);

function isAccountKind(kind) {
  return ACCOUNT_KINDS.includes(kind);
}

/* An account is "open" when it is an account kind and prints no closure date; a continuation field (a closure,
   a later status) plausibly completes it. A non-account kind (collection/inquiry/public record) is never open. */
function isOpenAccount(record) {
  if (!record || !isAccountKind(record.kind)) return false;
  return !(record.facts && record.facts['liability.closedDate']);
}

function mergeRecordInto(target, candidate) {
  for (const key of Object.keys(candidate.printed || {})) {
    let k = key;
    let n = 2;
    while (target.printed[k]) { k = `${key} (${n})`; n += 1; }
    target.printed[k] = candidate.printed[key];
  }
  Object.assign(target.facts, candidate.facts || {});
  if (candidate.kind && candidate.kind !== 'GENERAL_ACCOUNT' && isAccountKind(candidate.kind)) {
    target.kind = candidate.kind;
    target.kind_label = candidate.kind_label || target.kind_label;
  }
  if (candidate.status === 'RESOLVED') {
    target.status = 'RESOLVED';
    target.reason = null;
  }
  target.continuation_merged_from = target.continuation_merged_from || [];
  target.continuation_merged_from.push({ file_id: candidate.source_file_id, page: candidate.source_page, line: candidate.source_line });
}

/* GAP-INGEST-002 cross-file continuation: attach a continuation candidate (a field line with no account in its
   own file) to the OPEN account of the immediately preceding file. Positive evidence is the combination of upload
   adjacency AND the candidate being a genuine field line AND the target being an open account of a compatible
   kind. Upload adjacency alone is NOT sufficient, and separate accounts are never merged. */
function mergeCrossFileContinuations(records) {
  const out = [];
  let lastOpen = null;
  for (const r of records) {
    const sameBureau = lastOpen && (!('source_bureau' in r) && !('source_bureau' in lastOpen.record) ||
      (r.source_bureau && r.source_bureau === lastOpen.record.source_bureau));
    const compatibleDate = lastOpen && (!r.source_report_reference_date || !lastOpen.record.source_report_reference_date ||
      r.source_report_reference_date === lastOpen.record.source_report_reference_date);
    if (r.continuation_candidate === true && lastOpen && lastOpen.record.source_file_sequence + 1 === r.source_file_sequence &&
        sameBureau && compatibleDate && isOpenAccount(lastOpen.record)) {
      mergeRecordInto(lastOpen.record, r);
      continue;
    }
    out.push(r);
    if (isOpenAccount(r)) {
      lastOpen = { record: r, sequence: r.source_file_sequence };
    }
  }
  return out;
}

/** Assemble the admitted files of a case into one extraction. */
function assemble(files) {
  const admitted = (files || []).filter(isAdmitted);
  if (!admitted.length) {
    return { extraction: null, files_examined: 0, files_included: 0, included_file_ids: [], duplicate_files_skipped: 0, report_groups: [] };
  }

  const seen = new Set();
  const unique = [];
  let duplicates = 0;
  for (const f of admitted) {
    const hash = f.stored_sha256 || f.file_id;
    if (hash && seen.has(hash)) { duplicates += 1; continue; }
    if (hash) seen.add(hash);
    unique.push(f);
  }
  const included_file_ids = unique.map((f) => f.file_id);

  /* GAP-INGEST-001: a non-byte-identical equivalent image across files (same full-page text+geometry) is a
     SUSPECTED duplicate, never a confirmed discard. It is retained with an explicit flag and an audit entry;
     only byte-identical content (stored_sha256) is confirmed and skipped. */
  const contentSig = (f) => {
    const sigs = (f.extraction && Array.isArray(f.extraction.page_signatures) ? f.extraction.page_signatures : []).slice().sort();
    return sigs.length ? sigs.join('\u0001') : null;
  };
  const sigSeen = new Map();
  const suspectedEquivalentFiles = [];
  for (const f of unique) {
    const sig = contentSig(f);
    if (!sig) continue;
    const first = sigSeen.get(sig);
    if (first) {
      f.suspected_equivalent_duplicate = true;
      f.equivalent_of = first.file_id;
      suspectedEquivalentFiles.push({ file_id: f.file_id, equivalent_of: first.file_id, reason: 'SUSPECTED_EQUIVALENT_IMAGE_RETAINED' });
    } else {
      sigSeen.set(sig, f);
    }
  }

  /* GAP-INGEST-001: group by base identity (bureau/presentation) AND reference date. A continuation page that
     prints no date is attached to the sole dated report of the same bureau; when the same bureau prints more
     than one date, the undated page cannot be attributed and stays separate. */
  const baseGroups = new Map();
  for (const f of unique) {
    const base = baseIdentity(f);
    if (!baseGroups.has(base)) baseGroups.set(base, new Map());
    const dateMap = baseGroups.get(base);
    const date = dateIdentity(f);
    if (!dateMap.has(date)) dateMap.set(date, []);
    dateMap.get(date).push(f);
  }
  const groups = new Map();
  for (const [base, dateMap] of baseGroups) {
    const resolvedDates = [...dateMap.keys()].filter((d) => d !== 'DATE_UNRESOLVED');
    const unresolved = dateMap.get('DATE_UNRESOLVED') || [];
    if (resolvedDates.length === 1 && unresolved.length) {
      /* GAP-INGEST-001 (reassessed): the sole dated report of a bureau is NOT, by itself, enough to attach a
         dateless page. The page must be contiguous (immediately adjacent in upload order) to that report;
         otherwise it is retained unresolved and no reference date is borrowed onto it. */
      const datedFiles = dateMap.get(resolvedDates[0]);
      const datedIds = new Set(datedFiles.map((f) => f.file_id));
      const attach = [];
      const keep = [];
      for (const f of unresolved) {
        const i = unique.indexOf(f);
        const prev = i > 0 ? unique[i - 1] : null;
        const next = i < unique.length - 1 ? unique[i + 1] : null;
        const contiguous = (prev && datedIds.has(prev.file_id)) || (next && datedIds.has(next.file_id));
        if (contiguous) attach.push(f); else keep.push(f);
      }
      datedFiles.push(...attach);
      if (keep.length) dateMap.set('DATE_UNRESOLVED', keep);
      else dateMap.delete('DATE_UNRESOLVED');
    }
    for (const [date, files] of dateMap) {
      if (!files.length) continue;
      groups.set(`${base}|DATE:${date}`, files);
    }
  }

  /* GAP-INGEST-001: a record is re-indexed globally and annotated with its source file/page/line, so a fact on an
     earlier image and a fact on a later image both reach the assessment with their own provenance, and neither
     borrows from another account. */
  function annotate(record, fileRow, sequence, index, bureau, reportReferenceDate) {
    const loc = record && record.location ? record.location : {};
    return Object.assign({}, record, {
      record_index: index,
      source_file_id: fileRow.file_id,
      source_file_sequence: sequence,
      source_page: loc.page != null ? loc.page : null,
      source_line: loc.line != null ? loc.line : null,
      source_bureau: record.report_segment_id ? (record.bureau || null) : (bureau || null),
      source_report_reference_date: record.report_segment_id ? (record.report_reference_date && record.report_reference_date.status === 'RESOLVED' ? record.report_reference_date.normalized_value : null) : (reportReferenceDate || null),
      source_report_segment_id: record.report_segment_id ? fileRow.file_id + ':' + record.report_segment_id : null,
      location: Object.assign({}, loc, { file_id: fileRow.file_id }),
      /* Deep-copy the mutable fact surfaces so a cross-file merge never mutates the original per-file record. */
      printed: record.printed ? JSON.parse(JSON.stringify(record.printed)) : record.printed,
      facts: record.facts ? JSON.parse(JSON.stringify(record.facts)) : record.facts
    });
  }

  let statIndex = 0;
  let factIndex = 0;
  const mergedRecords = [];
  const mergedFactualRecords = [];
  const extractionReferenceDates = [];
  const factualReferenceDates = [];
  const reportGroups = [];
  let base = null;
  let mergedContentMarkers = null;
  let hasFactualView = false;

  for (const [key, groupFiles] of groups) {
    /* First pass: the report identity and its own reference date, so every record can be tied to its report. */
    let bureau = null;
    let presentationId = null;
    let referenceDate = null;
    for (const f of groupFiles) {
      const e = f.extraction;
      if (!base) base = e;
      if (e.bureau) bureau = e.bureau;
      if (e.presentation_id) presentationId = e.presentation_id;
      if (e.reference_date && e.reference_date.status === 'RESOLVED' && !referenceDate) referenceDate = e.reference_date;
    }
    const referenceDateValue = referenceDate ? (referenceDate.normalized_value || referenceDate.normalized || null) : null;
    if (referenceDate) extractionReferenceDates.push(referenceDate);

    let groupCount = 0;
    const groupStat = [];
    const groupFact = [];
    for (const f of groupFiles) {
      const e = f.extraction;
      mergedContentMarkers = mergeContentMarkers(mergedContentMarkers, e.content_markers);

      for (const r of (e.records || [])) {
        statIndex += 1;
        groupCount += 1;
        groupStat.push(annotate(r, f, unique.indexOf(f), statIndex, bureau, referenceDateValue));
      }

      const view = e.evidence_readings && e.evidence_readings.factual_view;
      if (view && Array.isArray(view.records)) {
        hasFactualView = true;
        if (view.reference_date && view.reference_date.status === 'RESOLVED') factualReferenceDates.push(view.reference_date);
        for (const fr of view.records) {
          factIndex += 1;
          groupFact.push(annotate(fr, f, unique.indexOf(f), factIndex, bureau, referenceDateValue));
        }
      }
    }
    const statMerged = mergeCrossFileContinuations(groupStat);
    const factMerged = mergeCrossFileContinuations(groupFact);
    for (const r of statMerged) mergedRecords.push(r);
    for (const r of factMerged) mergedFactualRecords.push(r);
    reportGroups.push({ key, bureau, presentation_id: presentationId, reference_date: referenceDate, record_count: groupCount, files_in_group: groupFiles.length });
  }

  if (!base) {
    return { extraction: null, files_examined: admitted.length, files_included: unique.length, included_file_ids, duplicate_files_skipped: duplicates, suspected_equivalent_files: suspectedEquivalentFiles, report_groups: reportGroups };
  }

  const referenceDate = reconcileReferenceDate(extractionReferenceDates) || (base.reference_date || null);

  let evidenceReadings = base.evidence_readings || {};
  const baseView = evidenceReadings.factual_view;
  if (baseView) {
    const factualReferenceDate = reconcileReferenceDate(factualReferenceDates) || (baseView.reference_date || null);
    evidenceReadings = Object.assign({}, evidenceReadings, {
      factual_view: Object.assign({}, baseView, {
        bureau: reportGroups.length ? reportGroups[0].bureau : (baseView.bureau || null),
        records: hasFactualView ? mergedFactualRecords : (baseView.records || []),
        reference_date: factualReferenceDate
      })
    });
  }

  const extraction = Object.assign({}, base, {
    records: mergedRecords,
    reference_date: referenceDate,
    content_markers: mergedContentMarkers || base.content_markers,
    evidence_readings: evidenceReadings,
    multi_file_assembly: {
      files_examined: admitted.length,
      files_included: unique.length,
      duplicate_files_skipped: duplicates,
      report_groups: reportGroups.map((g) => ({
        bureau: g.bureau,
        presentation_id: g.presentation_id,
        reference_date: g.reference_date ? { raw: g.reference_date.raw, normalized: g.reference_date.normalized_value || g.reference_date.normalized || null, status: g.reference_date.status } : null,
        record_count: g.record_count,
        files_in_group: g.files_in_group
      })),
      distinct_report_dates: referenceDate && referenceDate.distinct_report_dates
        ? referenceDate.distinct_report_dates
        : (referenceDate && referenceDate.normalized_value ? [referenceDate.normalized_value] : [])
    }
  });

  return { extraction, files_examined: admitted.length, files_included: unique.length, included_file_ids, duplicate_files_skipped: duplicates, suspected_equivalent_files: suspectedEquivalentFiles, report_groups: reportGroups };
}

module.exports = { assemble, isAdmitted, reportKey, baseIdentity, dateIdentity, reconcileReferenceDate, mergeCrossFileContinuations, isOpenAccount };
