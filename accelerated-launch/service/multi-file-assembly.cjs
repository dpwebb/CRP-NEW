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
const { reportDateValue, reportReference } = require('./report-fact-sources.cjs');
const crypto = require('node:crypto');

// Older persisted readers retained the exact page signature as text. Compare it
// with the new private digest without changing equivalent-page retention rules.
function privatePageSignature(value) {
  if (!value) return '';
  return /^PAGE-SHA256-[a-f0-9]{64}$/.test(value) ? value
    : 'PAGE-SHA256-' + crypto.createHash('sha256').update(String(value)).digest('hex');
}

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
  if (rd?.location?.file_id && fileRow.file_id && rd.location.file_id !== fileRow.file_id) return 'DATE_UNRESOLVED';
  return (rd && rd.status === 'RESOLVED' && reportDateValue(rd))
    ? reportDateValue(rd)
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
  const resolved = (readings || []).filter((rd) => rd && rd.status === 'RESOLVED' && reportDateValue(rd));
  const distinct = [...new Set(resolved.map(reportDateValue))];
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
function concernReferenceIdentity(reference) {
  if (!reference) return null;
  const loc = reference.location || {};
  return JSON.stringify({status:reference.status,raw:reference.raw_value ?? reference.raw,
    normalized:reference.normalized_value ?? reference.normalized,reason:reference.reason,
    source_field:reference.source_field,precision:reference.precision,
    location:{page:loc.page,line:loc.line,source:loc.source,trusted:loc.trusted,bbox:loc.bbox,
      x0:loc.x0,y0:loc.y0,x1:loc.x1,y1:loc.y1}});
}

// Preserve the reader's field-specific report identity. A file-wide bureau/date
// is unsuitable when the uploaded PDF contains several source reports.
function annotateReportConcern(reading, fileRow) {
  if (!reading || !reading.location || reading.trusted !== true || reading.location.trusted !== true
    || reading.location.caption_location?.page !== reading.location.page
    || reading.location.caption_location?.trusted !== true) return null;
  const segment = (fileRow.extraction.report_segments || []).find(own=>own.segment_id===reading.report_segment_id);
  const foreign = reading.source_file_id && reading.source_file_id !== fileRow.file_id
    || [reading.location,reading.location?.caption_location,reading.report_reference_date?.location]
      .some(loc=>loc?.file_id && loc.file_id !== fileRow.file_id);
  if (!segment || segment.ambiguous || !segment.bureau || foreign || reading.source_bureau !== segment.bureau
    || Array.isArray(segment.source_pages) && !segment.source_pages.includes(reading.location.page)
    || !reading.report_reference_date || concernReferenceIdentity(reading.report_reference_date)!==concernReferenceIdentity(segment.reference_date)) return null;
  const own = JSON.parse(JSON.stringify(reading));
  own.source_file_id = fileRow.file_id;
  own.source_report_segment_id = fileRow.file_id + ':' + reading.report_segment_id;
  own.report_segment_id = own.source_report_segment_id;
  own.location.file_id = fileRow.file_id;
  if (own.location.caption_location) own.location.caption_location.file_id = fileRow.file_id;
  if (own.report_reference_date.location) own.report_reference_date.location.file_id = fileRow.file_id;
  return own;
}

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
    const sigs = (f.extraction && Array.isArray(f.extraction.page_signatures) ? f.extraction.page_signatures : []).map(privatePageSignature).sort();
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
  function annotate(record, fileRow, sequence, index, bureau) {
    const loc = record && record.location ? record.location : {};
    const ownReference = Object.hasOwn(record, 'report_reference_date') || record.report_segment_id
      ? record.report_reference_date : fileRow.extraction.reference_date;
    const reference = ownReference ? JSON.parse(JSON.stringify(ownReference)) : null;
    if (reference?.location && !reference.location.file_id) reference.location = { ...reference.location, file_id: fileRow.file_id };
    const referenceRecord = { source_file_id: fileRow.file_id, report_reference_date: reference };
    const factSources = record.fact_sources ? JSON.parse(JSON.stringify(record.fact_sources)) : record.fact_sources;
    for (const source of Object.values(factSources || {})) {
      if (!source || typeof source !== 'object') continue;
      if (source.record_index != null) {
        if (source.record_index === record.record_index) source.record_index = index;
        else source.trusted = false;
      }
      if (source.location && !source.location.file_id) source.location.file_id = fileRow.file_id;
    }
    const printed = record.printed ? JSON.parse(JSON.stringify(record.printed)) : record.printed;
    for (const reading of Object.values(printed || {})) {
      // These readings came from this per-file reader. Preserve an explicit
      // foreign identity for rejection; fill only missing custody metadata on
      // the copied measured source, including its own caption geometry.
      for (const location of [reading?.location,reading?.location?.caption_location,reading?.uncertainty?.location]) {
        if(location&&!location.file_id)location.file_id=fileRow.file_id;
      }
    }
    return Object.assign({}, record, {
      record_index: index,
      source_file_id: fileRow.file_id,
      source_file_sequence: sequence,
      source_page: loc.page != null ? loc.page : null,
      source_line: loc.line != null ? loc.line : null,
      source_bureau: record.report_segment_id ? (record.bureau || null) : (bureau || null),
      ...(ownReference || Object.hasOwn(record, 'report_reference_date')
        ? { report_reference_date: reference } : {}),
      source_report_reference_date: reportReference(referenceRecord)?.normalized_value || null,
      source_report_segment_id: record.report_segment_id ? fileRow.file_id + ':' + record.report_segment_id : null,
      location: Object.assign({}, loc, { file_id: fileRow.file_id }),
      /* Deep-copy the mutable fact surfaces so a cross-file merge never mutates the original per-file record. */
      printed,
      facts: record.facts ? JSON.parse(JSON.stringify(record.facts)) : record.facts,
      fact_sources: factSources
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
      if (dateIdentity(f) !== 'DATE_UNRESOLVED' && !referenceDate) referenceDate = e.reference_date;
    }
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
        groupStat.push(annotate(r, f, unique.indexOf(f), statIndex, bureau));
      }

      const view = e.evidence_readings && e.evidence_readings.factual_view;
      if (view && Array.isArray(view.records)) {
        hasFactualView = true;
        if (view.reference_date && view.reference_date.status === 'RESOLVED' && reportDateValue(view.reference_date)
          && (!view.reference_date.location?.file_id || view.reference_date.location.file_id === f.file_id)) factualReferenceDates.push(view.reference_date);
        for (const fr of view.records) {
          factIndex += 1;
          groupFact.push(annotate(fr, f, unique.indexOf(f), factIndex, bureau));
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

  let referenceDate = reconcileReferenceDate(extractionReferenceDates) || (base.reference_date || null);
  const baseFile = unique.find((file) => file.extraction === base);
  if (referenceDate?.status === 'RESOLVED' && (!reportDateValue(referenceDate)
    || referenceDate === base.reference_date && baseFile && dateIdentity(baseFile) === 'DATE_UNRESOLVED')) referenceDate = {
    ...referenceDate, status: 'EXTRACTION_UNRESOLVED', normalized_value: null, normalized: null,
    reason: referenceDate.reason || 'REPORT_DATE_SOURCE_NOT_READABLE'
  };

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

  const concernAssociations = unique.flatMap(file=>(file.extraction.report_concern_associations || []).map(item=>({
    ...item,source_file_id:file.file_id,location:{...(item.location || {}),file_id:file.file_id}})));
  const concernEvidence = unique.flatMap(file=>(file.extraction.report_concern_evidence || []).flatMap(reading=>{
    const own = annotateReportConcern(reading,file);
    if (own) return [own];
    concernAssociations.push({kind:reading.kind,source_file_id:file.file_id,
      location:{...(reading.location || {}),file_id:file.file_id},state:'UNRESOLVED',
      reason:'REPORT_CONCERN_SOURCE_ASSOCIATION_MISMATCH'});
    return [];
  }));
  const extraction = Object.assign({}, base, {
    records: mergedRecords,
    // These are completed source readings, kept with their own uploaded file.
    // A report-level identity concern must never inherit a neighbouring file's identity.
    report_concern_evidence: concernEvidence,
    report_context_readings:concernEvidence.filter(reading=>reading.context_signal===true),
    identity_groups:unique.flatMap(file=>(file.extraction.identity_groups||[]).flatMap(reading=>{
      const segments=file.extraction.report_segments||[],segment=segments.find(s=>s.segment_id===reading.report_segment_id);
      if(segments.length&&(!segment||segment.ambiguous||!segment.bureau||reading.source_bureau!==segment.bureau))return [];
      if(reading.location?.file_id&&reading.location.file_id!==file.file_id)return [];
      const own=file.file_id+':'+(reading.report_segment_id||'single-layout-report');
      return[{...reading,source_file_id:file.file_id,source_report_segment_id:own,report_segment_id:own,location:{...reading.location,file_id:file.file_id}}];
    })),
    creator_summaries:unique.flatMap(file=>(file.extraction.creator_summaries||[]).map(sum=>({...sum,source_file_id:file.file_id,fields:Object.fromEntries(Object.entries(sum.fields).map(([key,field])=>[key,{...field,location:{...field.location,file_id:file.file_id}}]))}))),
    report_concern_associations:concernAssociations,
    extraction_coverage: base.extraction_coverage ? {
      ...base.extraction_coverage,
      table_row_census: unique.flatMap(file => (file.extraction.extraction_coverage?.table_row_census || []).map(table => ({
        ...table, source_file_id: file.file_id,
        location: { ...(table.location || {}), file_id: file.file_id }
      })))
    } : undefined,
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
        reference_date: g.reference_date ? { raw: g.reference_date.raw, normalized: reportDateValue(g.reference_date), status: g.reference_date.status } : null,
        record_count: g.record_count,
        files_in_group: g.files_in_group
      })),
      distinct_report_dates: referenceDate && referenceDate.distinct_report_dates
        ? referenceDate.distinct_report_dates
        : (reportDateValue(referenceDate) ? [reportDateValue(referenceDate)] : [])
    }
  });

  return { extraction, files_examined: admitted.length, files_included: unique.length, included_file_ids, duplicate_files_skipped: duplicates, suspected_equivalent_files: suspectedEquivalentFiles, report_groups: reportGroups };
}

module.exports = { assemble, isAdmitted, reportKey, baseIdentity, dateIdentity, reconcileReferenceDate, mergeCrossFileContinuations, isOpenAccount };
