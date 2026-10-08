'use strict';
/**
 * fdt-recovery.cjs — BLOCKER-FDT-001. Failure-to-detect mitigation.
 *
 * Three pure functions, so the behavior is testable and auditable without a running service:
 *   1. detectIncompleteReading(model, pages, records) — name exactly what is unread, partial, unresolved or
 *      contradictory. A page with substantial native text is never treated as fully read when its image-only
 *      content (tables, account bodies) has not been recovered.
 *   2. recoveryAudit(beforePages, afterPages) — record every attempted reading, the bounded stopping rule and
 *      which required facts recovery added. Recovery never substitutes a value.
 *   3. buildReadingLimitations(state) — which check classes are deprived of a decisive fact when reading is
 *      incomplete, and the plain explanation. Unread content is never equated with absence or "no issues".
 */

const MAX_RECOVERY_PASSES = 1;
const MAX_RECOVERY_PAGES = 40;

const CHECK_FACTS = Object.freeze([
  { check_class: 'STATUTORY_RULE_COMPARISON', decisive_facts: ['liability.openedDate', 'liability.closedDate', 'overdue.originalListingDate', 'reportedAccount.firstReported', 'reportedAccount.dateOpened', 'reportedAccount.adverseRatingDate', 'bankruptcy.dischargeDate', 'collection.delinquencyDate'] },
  { check_class: 'REPORT_FACT_CONSISTENCY', decisive_facts: ['account.amount', 'account.status', 'liability.openedDate', 'liability.closedDate'] },
  { check_class: 'COMMON_ERROR', decisive_facts: ['liability.openedDate', 'liability.closedDate', 'overdue.originalListingDate', 'reportedAccount.firstReported', 'reportedAccount.adverseRatingDate', 'account.status', 'account.amount'] }
]);

function norm(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }

const CONTENT_HINT = /ACCOUNT|CREDITOR|LENDER|BALANCE|CREDIT LIMIT|OPENED|CLOSED|COLLECTION|INQUIR|ENQUIR|PUBLIC RECORD|PAYMENT HISTORY|TRADELINE|DATE OPENED|DATE REPORTED|LAST PAYMENT|DELINQUENCY/i;

/* A recovered assessment FACT is a value a decisive check actually reads — a date or an amount — not arbitrary OCR
   noise. A line that carries no date and no amount is ordinary OCR text, never counted as a recovered fact. */
const DATE_HINT = /\b(?:19|20)\d{2}[-/]\d{1,2}[-/]\d{1,2}\b|\b\d{1,2}\/\d{1,2}\/\d{4}\b/;
const AMOUNT_HINT = /\$\s?\d/;
function isAssessmentFactText(text) {
  const t = String(text || '');
  return DATE_HINT.test(t) || AMOUNT_HINT.test(t);
}

function detectIncompleteReading(model, pages, records) {
  const state = {
    complete: true,
    read: Boolean(pages && pages.length),
    unreadable_pages: [],
    image_only_pages: [],
    partial_native_pages: [],
    mixed_native_pages: [],
    unread_image_regions: [],
    untrusted_lines: [],
    unresolved_record_boundaries: [],
    contradictory_extraction: [],
    apparent_content_without_records: false,
    reasons: []
  };

  const native = (model && model.pages) || [];
  for (const p of native) {
    const wasRead = (pages || []).some((pg) => pg.page === p.page && Array.isArray(pg.lines) && pg.lines.length > 0);
    if (!wasRead) state.unreadable_pages.push(p.page);
    /* GAP-INGEST-008: a page carrying an image-only region is a complete read only when the OCR pass actually
       recovered NEW content from that region (lines beyond the native text). If nothing new was recovered, the
       region is unread and the page is incomplete — never silently treated as fully read. */
    if (p.has_image_region === true && p.has_native_text) {
      const collected = (pages || []).find((pg) => pg.page === p.page);
      const nativeTexts = new Set((p.lines || []).map((l) => norm(l.text)).filter(Boolean));
      const ocrNew = (collected && collected.lines ? collected.lines : []).some((l) => l.source === 'LOCAL_OCR' && !nativeTexts.has(norm(l.text)));
      if (ocrNew) state.mixed_native_pages.push(p.page);
      else state.unread_image_regions.push(p.page);
    }
  }

  for (const pg of (pages || [])) {
    if (pg.source === 'LOCAL_OCR') state.image_only_pages.push(pg.page);
    else if (pg.native_text_incomplete) state.partial_native_pages.push(pg.page);
    for (const l of (pg.lines || [])) {
      if (l.trusted === false) state.untrusted_lines.push({ page: pg.page, line: l.line, text: norm(l.text), confidence: l.confidence });
    }
  }
  state.image_only_pages = [...new Set(state.image_only_pages)].sort((a, b) => a - b);
  state.partial_native_pages = [...new Set(state.partial_native_pages)].sort((a, b) => a - b);
  state.mixed_native_pages = [...new Set(state.mixed_native_pages)].sort((a, b) => a - b);
  state.unread_image_regions = [...new Set(state.unread_image_regions)].sort((a, b) => a - b);
  state.unreadable_pages = [...new Set(state.unreadable_pages)].sort((a, b) => a - b);

  for (const r of (records || [])) {
    if (r.continuation_candidate) state.unresolved_record_boundaries.push({ record_index: r.record_index, kind: r.kind_label || r.kind });
  }

  const resolved = (records || []).filter((r) => r.status === 'RESOLVED').length;
  const hasContentHint = (pages || []).some((pg) => (pg.lines || []).some((l) => CONTENT_HINT.test(String(l.text || '').toUpperCase())));
  if (hasContentHint && resolved === 0) state.apparent_content_without_records = true;

  const byLoc = new Map();
  for (const pg of (pages || [])) {
    for (const l of (pg.lines || [])) {
      const k = `${pg.page}:${l.line}`;
      if (!byLoc.has(k)) byLoc.set(k, []);
      byLoc.get(k).push(l);
    }
  }
  for (const [k, lines] of byLoc) {
    const texts = [...new Set(lines.map((l) => norm(l.text)).filter(Boolean))];
    if (texts.length > 1) state.contradictory_extraction.push({ location: k, readings: lines.map((l) => ({ text: norm(l.text), source: l.source, confidence: l.confidence })) });
  }

  state.complete =
    state.unreadable_pages.length === 0 &&
    state.partial_native_pages.length === 0 &&
    state.unread_image_regions.length === 0 &&
    state.untrusted_lines.length === 0 &&
    state.unresolved_record_boundaries.length === 0 &&
    state.contradictory_extraction.length === 0 &&
    state.apparent_content_without_records === false;

  if (!state.complete) {
    if (state.unreadable_pages.length) state.reasons.push(`${state.unreadable_pages.length} page(s) could not be read (${state.unreadable_pages.join(', ')}).`);
    if (state.partial_native_pages.length) state.reasons.push(`${state.partial_native_pages.length} page(s) had a partial native text layer (${state.partial_native_pages.join(', ')}).`);
    if (state.unread_image_regions.length) state.reasons.push(`${state.unread_image_regions.length} page(s) carried an image-only region that could not be recovered (${state.unread_image_regions.join(', ')}).`);
    if (state.image_only_pages.length) state.reasons.push(`${state.image_only_pages.length} page(s) are image-only and read through the local OCR reader.`);
    if (state.mixed_native_pages.length) state.reasons.push(`${state.mixed_native_pages.length} page(s) had a native text layer plus an image-only region recovered by local OCR.`);
    if (state.untrusted_lines.length) state.reasons.push(`${state.untrusted_lines.length} OCR line(s) were below the recorded confidence floor and are preserved as unresolved.`);
    if (state.unresolved_record_boundaries.length) state.reasons.push(`${state.unresolved_record_boundaries.length} record(s) had unresolved boundaries (continuation candidates).`);
    if (state.contradictory_extraction.length) state.reasons.push(`${state.contradictory_extraction.length} reading(s) disagree between readers and are kept unresolved.`);
    if (state.apparent_content_without_records) state.reasons.push('Account/table content appears to be printed but no record facts could be resolved from it.');
  }
  return state;
}

function buildReadingLimitations(state) {
  if (!state) return { limited: false, affected_checks: [], incomplete: true, plain: null, never_equates_unread_with_absence: true };
  const affected = [];
  const readingCompromised =
    state.unreadable_pages.length > 0 ||
    state.partial_native_pages.length > 0 ||
    state.unread_image_regions.length > 0 ||
    state.untrusted_lines.length > 0 ||
    state.contradictory_extraction.length > 0;
  if (readingCompromised) affected.push('STATUTORY_RULE_COMPARISON', 'REPORT_FACT_CONSISTENCY', 'COMMON_ERROR');
  if (state.apparent_content_without_records) affected.push('COMMON_ERROR');
  if (state.unresolved_record_boundaries.length) affected.push('COMMON_ERROR');
  const unique = [...new Set(affected)];
  return {
    limited: unique.length > 0 || state.complete === false,
    incomplete: state.complete === false,
    affected_checks: unique,
    plain: state.complete === false
      ? 'Some of your report could not be read completely, so the checks named below could not examine every part of it. A value that could not be read is not the same as a value that is absent, and nothing here treats unread content as "no issues" or as proof of compliance.'
      : null,
    never_equates_unread_with_absence: true
  };
}

function recoveryAudit(beforePages, afterPages) {
  const attempts = [];
  const facts_added = [];
  const ordinary_ingestion = [];
  for (const pg of (afterPages || [])) {
    if (pg.source === 'LOCAL_OCR' || pg.recovered_with_ocr === true) {
      attempts.push({ page: pg.page, strategy: 'LOCAL_OCR_TEXT_LAYER', bounded: true, pass_limit: MAX_RECOVERY_PASSES, page_limit: MAX_RECOVERY_PAGES });
    }
    /* A page with NO native "before" reading is image-only: its OCR content is ordinary ingestion, not a
       supplement to native text. It is NOT skipped — its genuine assessment facts are recorded with their source
       location, while the whole OCR text is kept separately as ordinary ingestion. */
    const before = (beforePages || []).find((b) => b.page === pg.page);
    const beforeTexts = before ? new Set((before.lines || []).map((l) => norm(l.text)).filter(Boolean)) : new Set();
    const imageOnly = !before;
    for (const l of (pg.lines || [])) {
      if (l.source !== 'LOCAL_OCR') continue;
      const t = norm(l.text);
      if (!t) continue;
      if (beforeTexts.has(t)) continue; // already present in the native reading — not recovered
      if (imageOnly) {
        ordinary_ingestion.push({ page: pg.page, line: l.line, text: t, source: l.source, confidence: l.confidence });
      }
      /* Do not count arbitrary OCR text: only a genuine assessment fact (date/amount) is a recovered fact. */
      if (!isAssessmentFactText(t)) continue;
      facts_added.push({ page: pg.page, line: l.line, text: t, source: l.source, confidence: l.confidence });
    }
  }
  return {
    recovery_attempts: attempts,
    recovery_pass_limit: MAX_RECOVERY_PASSES,
    recovery_page_limit: MAX_RECOVERY_PAGES,
    stopping_rule: 'at most one recovery pass per page; no retry without new input; never above the OCR page bound',
    facts_added,
    ordinary_ingestion,
    facts_corrected: [],
    disagreements: [],
    substitution_forbidden: true,
    policy: 'recovered facts must pass the reported-fact policy (acceptFact); a disagreement is kept unresolved'
  };
}

module.exports = {
  MAX_RECOVERY_PASSES,
  MAX_RECOVERY_PAGES,
  CHECK_FACTS,
  detectIncompleteReading,
  buildReadingLimitations,
  recoveryAudit,
  isAssessmentFactText
};


