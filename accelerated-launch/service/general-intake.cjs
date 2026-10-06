'use strict';
/**
 * general-intake.cjs — the GENERAL bureau-report intake path (B6-INGEST-002).
 * Admits a document that identifies a bureau AND prints report-like data points; extracts usable facts with
 * locators, raw values, normalized dates and uncertainty. No known layout, digest or heading sequence required.
 * Bureau identity alone is insufficient. Unrelated vs unreadable are distinct outcomes. Dates are never
 * borrowed between records and values are never invented. No account number is retained.
 */

const { FACT_STATUS } = require('../../internal-validation/ca-ns-last-payment-six-year/constants.cjs');
const ocr = require('./ocr/local-ocr.cjs');
const { acceptFact, loadPolicy } = require('../reported-fact-policy.cjs');
const fdt = require('./fdt-recovery.cjs');
const paymentHistoryGrid = require('./payment-history-grid.cjs');


const GENERAL_PRESENTATION_ID = 'GENERAL-BUREAU-REPORT';
const GENERAL_ADMISSION_PATH = 'BUREAU_AND_REPORT_CONTENT_PLAUSIBILITY';

const BUREAUS = Object.freeze({ EQUIFAX: 'Equifax', TRANSUNION: 'TransUnion', EXPERIAN: 'Experian', ILLION: 'illion' });

const CONTENT_MARKERS = Object.freeze([
  'CREDIT REPORT', 'CREDIT FILE', 'CONSUMER REPORT', 'CONSUMER DISCLOSURE', 'CREDIT DISCLOSURE',
  'CREDIT ACCOUNT', 'ACCOUNT SUMMARY', 'TRADELINE', 'PAYMENT HISTORY', 'COLLECTION', 'INQUIR',
  'ENQUIR', 'PUBLIC RECORD', 'DATE OPENED', 'DATE REPORTED', 'LAST PAYMENT', 'CREDIT SCORE',
  'BALANCE', 'CREDIT LIMIT', 'CREDITOR', 'LENDER', 'OVERDUE', 'REPAYMENT', 'ADVERSE', 'DELINQUENCY',
  'ACCOUNT', 'OPENED', 'REPORTED', 'REPORT', 'CARD'
]);

const REFERENCE_DATE_HINTS = Object.freeze([
  'REPORT DATE', 'DATE OF REPORT', 'REQUEST DATE', 'PREPARED DATE', 'PREPARED', 'REPORT GENERATED',
  'FILE DATE', 'DATE ISSUED', 'ISSUE DATE', 'REPORTED ON', 'GENERATED ON', 'AS OF'
]);

/* GAP-INGEST-007: a report-issued/prepared date is stronger evidence of the report reference date than an
   account "as of", an inquiry "request date" or a rights-notice date. */
const REPORT_HEADER_DATE_HINTS = Object.freeze([
  'REPORT DATE', 'DATE OF REPORT', 'PREPARED DATE', 'REPORT GENERATED', 'FILE DATE', 'DATE ISSUED', 'ISSUE DATE', 'GENERATED ON'
]);

const UNRELATED_MESSAGE =
  'This document or image set does not seem to be a credit report. Please upload an actual credit report issued by your credit bureau.';
const UNREADABLE_MESSAGE =
  'We could not read your report clearly enough to work with it. Please upload a clearer or complete copy of the same report.';

const MONTHS = Object.freeze({
  JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
  JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12,
  JANUARY: 1, FEBRUARY: 2, MARCH: 3, APRIL: 4, JUNE: 6,
  JULY: 7, AUGUST: 8, SEPTEMBER: 9, OCTOBER: 10, NOVEMBER: 11, DECEMBER: 12
});

function pad2(n) { return String(n).padStart(2, '0'); }
function isoDate(y, m, d) { return `${String(y).padStart(4, '0')}-${pad2(m)}-${pad2(d)}`; }

function validDay(y, m, d) {
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return false;
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dim = [31, (y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return d <= dim[m - 1];
}

function normalizePrintedDate(raw, convention) {
  const s = String(raw == null ? '' : raw).trim();
  if (!s) return { normalized: null, precision: null, reason: 'EMPTY_VALUE' };
  let m;

  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m && validDay(+m[1], +m[2], +m[3])) return { normalized: isoDate(+m[1], +m[2], +m[3]), precision: 'DAY' };

  m = s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (m && validDay(+m[1], +m[2], +m[3])) return { normalized: isoDate(+m[1], +m[2], +m[3]), precision: 'DAY' };

  m = s.match(/^([A-Za-z]{3,9})[.\s]+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})$/);
  if (m && MONTHS[m[1].toUpperCase()]) {
    const mo = MONTHS[m[1].toUpperCase()], d = +m[2], y = +m[3];
    if (validDay(y, mo, d)) return { normalized: isoDate(y, mo, d), precision: 'DAY' };
  }

  m = s.match(/^(\d{1,2})(?:st|nd|rd|th)?[.\s]+([A-Za-z]{3,9})[.,\s]+(\d{4})$/);
  if (m && MONTHS[m[2].toUpperCase()]) {
    const d = +m[1], mo = MONTHS[m[2].toUpperCase()], y = +m[3];
    if (validDay(y, mo, d)) return { normalized: isoDate(y, mo, d), precision: 'DAY' };
  }

  m = s.match(/^([A-Za-z]{3,9})[.,\s]+(\d{4})$/);
  if (m && MONTHS[m[1].toUpperCase()]) {
    return { normalized: `${m[2]}-${pad2(MONTHS[m[1].toUpperCase()])}`, precision: 'MONTH' };
  }

  /* GAP-INGEST-006: a partial numeric month/year ("02/2021" or "2021/02") is a MONTH precision, never a day. */
  m = s.match(/^(\d{1,2})\/(\d{4})$/);
  if (m && +m[1] >= 1 && +m[1] <= 12) {
    return { normalized: `${m[2]}-${pad2(+m[1])}`, precision: 'MONTH' };
  }
  m = s.match(/^(\d{4})\/(\d{1,2})$/);
  if (m && +m[2] >= 1 && +m[2] <= 12) {
    return { normalized: `${m[1]}-${pad2(+m[2])}`, precision: 'MONTH' };
  }

  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const a = +m[1], b = +m[2], y = +m[3];
    /* A field above 12 is unambiguous: the first can only be a day, the second only a month. */
    if (a > 12) {
      if (validDay(y, b, a)) return { normalized: isoDate(y, b, a), precision: 'DAY', convention: 'DD/MM/YYYY' };
      return { normalized: null, precision: null, reason: 'INVALID_DATE' };
    }
    if (b > 12) {
      if (validDay(y, a, b)) return { normalized: isoDate(y, a, b), precision: 'DAY', convention: 'MM/DD/YYYY' };
      return { normalized: null, precision: null, reason: 'INVALID_DATE' };
    }
    /* Both fields could be a month: the day/month assignment is ambiguous unless a convention is evidenced. */
    if (a === b) {
      if (validDay(y, a, a)) return { normalized: isoDate(y, a, a), precision: 'DAY' };
      return { normalized: null, precision: null, reason: 'INVALID_DATE' };
    }
    const isoMMDD = isoDate(y, a, b);
    const isoDDMM = isoDate(y, b, a);
    if (convention === 'US') {
      if (validDay(y, a, b)) return { normalized: isoMMDD, precision: 'DAY', convention: 'MM/DD/YYYY', ambiguous: true, alternative: isoDDMM };
      return { normalized: null, precision: null, reason: 'INVALID_DATE' };
    }
    if (convention === 'DDMM') {
      if (validDay(y, b, a)) return { normalized: isoDDMM, precision: 'DAY', convention: 'DD/MM/YYYY', ambiguous: true, alternative: isoMMDD };
      return { normalized: null, precision: null, reason: 'INVALID_DATE' };
    }
    /* GAP-INGEST-005: no report-evidenced convention. Preserve BOTH interpretations and resolve nothing. */
    return { normalized: null, precision: 'DAY', ambiguous: true, interpretations: [isoMMDD, isoDDMM], reason: 'AMBIGUOUS_NUMERIC_DATE_WITHOUT_CONVENTION' };
  }

  return { normalized: null, precision: null, reason: 'UNRECOGNIZED_DATE_FORM' };
}

const DATE_TOKEN = /(\d{4}-\d{1,2}-\d{1,2}|\d{4}\/\d{1,2}\/\d{1,2}|\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}\/\d{4}|\d{4}\/\d{1,2}|[A-Za-z]{3,9}[.\s]+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}|\d{1,2}(?:st|nd|rd|th)?[.\s]+[A-Za-z]{3,9}[.,\s]+\d{4}|[A-Za-z]{3,9}[.,\s]+\d{4})/;
const AMOUNT_TOKEN = /\$\s?[\d,]+(?:\.\d{2})?/g;

function bureauOf(text) {
  const up = String(text || '').toUpperCase();
  if (up.includes('EQUIFAX')) return BUREAUS.EQUIFAX;
  if (up.includes('TRANSUNION') || up.includes('TRANS UNION')) return BUREAUS.TRANSUNION;
  if (up.includes('EXPERIAN')) return BUREAUS.EXPERIAN;
  if (up.includes('ILLION')) return BUREAUS.ILLION;
  return null;
}

/* GAP-INGEST-009: a line is a bureau-SECTION boundary only when it names a bureau AND carries report content.
   A bare bureau mention — boilerplate, a rights notice, or a creditor name such as "Experian Card" — is NOT a
   section boundary. */
function bureauSectionOf(text) {
  const up = String(text || '').toUpperCase();
  const bureau = bureauOf(up);
  if (!bureau) return null;
  if (/\b(RIGHTS|CONTACT|OBTAIN|VISIT|CALL|MAY|SHOULD)\b/.test(up)) return null;
  /* Require genuine report-level content: "report", "credit report/file/profile/score" or "consumer credit".
     A creditor name like "Experian Credit Card" names a bureau but is not a section boundary. */
  if (!/^\s*(EQUIFAX|EXPERIAN|TRANS\s?UNION|ILLION)\b.*\bCREDIT\s+(REPORT|FILE|PROFILE)\b/.test(up)) return null;
  const named = ['EQUIFAX', 'EXPERIAN', 'TRANSUNION', 'TRANS UNION', 'ILLION'].filter((b) => up.includes(b));
  if (new Set(named.map((b) => b.replace(' ', ''))).size > 1) return null;
  return bureau;
}

function contentMarkers(text) {
  const up = String(text || '').toUpperCase();
  return CONTENT_MARKERS.filter((marker) => up.includes(marker));
}

/* GAP-INGEST-005: infer the numeric day/month order from the report's OWN evidence, never from the consumer's
   selected jurisdiction. A numeric date whose first field exceeds 12 can only be day-first (DD/MM); one whose
   second field exceeds 12 can only be month-first (MM/DD). When no such date exists the convention is unknown.
   Contradictory evidence (a day-first and a month-first unambiguous date in the SAME segment) withholds the
   convention rather than resolving to whichever appeared first. */
function detectConvention(pages) {
  let seenDayFirst = false;
  let seenMonthFirst = false;
  for (const page of (pages || [])) {
    for (const line of (page.lines || [])) {
      const re = /(\d{1,2})\/(\d{1,2})\/(\d{4})/g;
      let m;
      while ((m = re.exec(String(line.text || '')))) {
        const a = +m[1], b = +m[2];
        if (a > 12) seenDayFirst = true;
        if (b > 12) seenMonthFirst = true;
      }
    }
  }
  if (seenDayFirst && seenMonthFirst) return null;
  if (seenDayFirst) return 'DDMM';
  if (seenMonthFirst) return 'US';
  return null;
}

/* OWNER-ACCEPT-007: statutory content markers are EXTRACTION, not legal evaluation. Each marker records its
 * source evidence (exact text, page, line, source) and its context (record content vs boilerplate/rights
 * notice/guide). Presence or absence of a keyword never establishes that a feature is absent or that an
 * obligation was breached — that is a legal-predicate decision made elsewhere. */
const STATUTORY_CONTENT_MARKERS = Object.freeze({
  medical_information: /MEDICAL|HEALTH CARE|HEALTHCARE|DIAGNOSIS|HOSPITAL|PHYSICIAN|DOCTOR|CLINIC|TREATMENT|PRESCRIPTION|MENTAL HEALTH/i,
  fraud_alert: /FRAUD ALERT|ACTIVE DUTY ALERT|INITIAL FRAUD ALERT|EXTENDED FRAUD ALERT/i,
  security_freeze: /SECURITY FREEZE|CREDIT FREEZE/i,
  dispute: /DISPUTED|CONSUMER DISPUTE|ACCOUNT IN DISPUTE|DISPUTES THIS/i,
  identity_theft: /IDENTITY THEFT|VICTIM OF IDENTITY THEFT/i,
  public_record: /PUBLIC RECORD|BANKRUPTCY|JUDGMENT|TAX LIEN/i,
  inquiry: /INQUIRY|INQUIRIES|ENQUIRY|ENQUIRIES/i
});

const BOILERPLATE_RE = /RIGHT|NOTICE|SUMMARY OF|GUIDE|HOW TO|CONTACT|DISCLOSURE|EXPLAN|INFORMATION ABOUT|LEARN|YOUR RIGHTS|IMPORTANT|PLEASE NOTE|REMINDER|GENERAL INFORMATION/i;

function classifyLineContext(text) {
  return BOILERPLATE_RE.test(String(text || '')) ? 'boilerplate' : 'record';
}

/** Detect statutory content markers across the extracted lines, preserving each match's source evidence. */
function detectStatutoryContentMarkers(pages) {
  const out = {};
  for (const key of Object.keys(STATUTORY_CONTENT_MARKERS)) out[key] = { detected: false, matches: [] };
  for (const page of pages || []) {
    for (const line of page.lines || []) {
      const up = String(line.text || '').toUpperCase();
      const context = classifyLineContext(line.text);
      for (const key of Object.keys(STATUTORY_CONTENT_MARKERS)) {
        if (STATUTORY_CONTENT_MARKERS[key].test(up)) {
          out[key].detected = true;
          out[key].matches.push({ text: line.text, page: line.page, line: line.line, source: line.source, context });
        }
      }
    }
  }
  return out;
}

function nativeText(model) {
  return ((model && model.pages) || []).filter((p) => p.has_native_text).map((p) => p.text).join('\n');
}

function detect(model) {
  if (!model) return { outcome: 'UNREADABLE', reason: 'NO_DOCUMENT_MODEL', bureau: null, markers: [], needs_ocr: false };
  if (model.not_a_pdf === true) return { outcome: 'UNREADABLE', reason: 'NOT_A_PDF_CONTAINER', bureau: null, markers: [], needs_ocr: false };
  if ((model.read_errors || []).some((e) => e.stage === 'pdfinfo' || e.stage === 'open')) {
    return { outcome: 'UNREADABLE', reason: 'DOCUMENT_COULD_NOT_BE_READ', bureau: null, markers: [], needs_ocr: false };
  }
  if (model.encrypted === true && model.text_extraction_permitted !== true) {
    return { outcome: 'UNREADABLE', reason: 'ENCRYPTED_AND_NOT_COPYABLE', bureau: null, markers: [], needs_ocr: false };
  }
  const text = nativeText(model);
  if (!text.trim()) {
    return { outcome: 'GENERAL', reason: 'IMAGE_ONLY_OR_SCANNED_NEEDS_OCR', bureau: null, markers: [], needs_ocr: true };
  }
  const bureau = bureauOf(text);
  const markers = contentMarkers(text);
  if (!bureau) return { outcome: 'UNRELATED', reason: 'NO_BUREAU_IDENTITY_FOUND', bureau: null, markers: [], needs_ocr: false };
  if (!markers.length) return { outcome: 'UNRELATED', reason: 'BUREAU_IDENTITY_BUT_NO_CREDIT_REPORT_CONTENT', bureau, markers: [], needs_ocr: false };
  return { outcome: 'GENERAL', reason: 'BUREAU_AND_REPORT_CONTENT_PRESENT', bureau, markers, needs_ocr: false };
}

/* GAP-INGEST-001 / GAP-INGEST-003: a line is more than its text. Native text is trusted with no pixel
   geometry; a local-OCR line carries its mean confidence, its trusted decision and its bounding box, so an
   uncertain critical character can never silently become a resolved fact. */
function nativeLineObjects(p) {
  return (p.lines || []).map((t, i) => ({ text: t, page: p.page, line: i + 1, source: 'NATIVE_TEXT', confidence: null, trusted: true, bbox: null }));
}

function ocrLineObjects(op) {
  const evidence = op.line_evidence || [];
  const lines = op.lines || [];
  return lines.map((t, i) => {
    const ev = evidence[i] || null;
    return {
      text: t,
      page: op.page,
      line: i + 1,
      source: 'LOCAL_OCR',
      confidence: ev ? ev.confidence : null,
      trusted: ev ? ev.trusted : null,
      min_confidence: ev ? ev.min_confidence : null,
      words: ev ? (ev.words || null) : null,
      bbox: ev ? { x0: ev.x0, y0: ev.y0, x1: ev.x1, y1: ev.y1 } : null
    };
  });
}

/** The source location of a fact: page, line, reading source, OCR confidence/trust and pixel geometry.
    `min_confidence` is the line's minimum word confidence — the signal a decisive character may be uncertain
    even when the line mean is high. */
function lineLocation(line) {
  return {
    page: line.page,
    line: line.line,
    source: line.source || null,
    confidence: line.confidence != null ? line.confidence : null,
    min_confidence: line.min_confidence != null ? line.min_confidence : null,
    trusted: line.trusted != null ? line.trusted : null,
    bbox: line.bbox || null
  };
}

/* GAP-INGEST-003: a decisive date/amount token is trusted only when its OWN words are trusted. A line whose
   mean confidence is high can still carry an uncertain decisive character; this reads the per-word trust the
   OCR layer preserved and refuses the token when any of its words is untrusted. Returns null when there is no
   per-word evidence (a native or synthetic line), so the caller defers to the line-level trust. */
function decisiveWordsTrusted(line, tokenText) {
  const words = (line && Array.isArray(line.words) && line.words) || [];
  if (!words.length) return null;
  const needle = String(tokenText == null ? '' : tokenText).trim();
  if (!needle) return null;
  const idx = String(line.text || '').indexOf(needle);
  if (idx < 0) return null;
  const end = idx + needle.length;
  const overlapping = words.filter((w) => w.start < end && w.end > idx);
  if (!overlapping.length) return null;
  return overlapping.every((w) => w.trusted !== false);
}

/* GAP-INGEST-008: merge a native-text page's lines with OCR lines recovered for the SAME page. Native text is
   kept verbatim; an OCR line is added only when it is new. Identical text at DIFFERENT locations is never
   collapsed merely because the wording matches — dedup is by text AND location; a native/OCR pair is collapsed
   only when that text is unique on both sides (the same physical line). Conflicting values are both kept. */
function mergeRecoveredLines(nativeLines, ocrLines) {
  const out = (nativeLines || []).slice();
  const norm = (l) => String(l.text || '').replace(/\s+/g, ' ').trim();
  const key = (l) => {
    const t = norm(l);
    const bbox = l.bbox ? `@${l.bbox.x0},${l.bbox.y0},${l.bbox.x1},${l.bbox.y1}` : '';
    return t + bbox;
  };
  const nativeCount = new Map();
  for (const l of out) { const t = norm(l); if (t) nativeCount.set(t, (nativeCount.get(t) || 0) + 1); }
  const ocrCount = new Map();
  for (const l of (ocrLines || [])) { const t = norm(l); if (t) ocrCount.set(t, (ocrCount.get(t) || 0) + 1); }
  const seen = new Set(out.map(key).filter((k) => k.trim()));
  /* Recovered OCR lines keep their own page but get NEW line numbers that continue after the native lines, so a
     native line and a recovered line never share a line number and can never be mistaken for one another. */
  let nextLine = out.reduce((max, l) => Math.max(max, Number(l.line) || 0), 0) + 1;
  for (const line of (ocrLines || [])) {
    const t = norm(line);
    if (!t) continue;
    const k = key(line);
    if (seen.has(k)) continue;               /* an OCR line already at this location */
    seen.add(k);
    if (nativeCount.get(t) === 1 && ocrCount.get(t) === 1) continue;  /* the same unique physical line */
    out.push(Object.assign({}, line, { line: nextLine++ }));
  }
  return out;
}

function collectPages(model) {
  const native = (model && model.pages) || [];
  const missing = native.filter((p) => !p.has_native_text).map((p) => p.page);
  const incomplete = native.filter((p) => p.has_native_text && p.native_text_incomplete === true).map((p) => p.page);
  /* GAP-INGEST-008: a page with substantial native text AND an embedded image region (an account/table body
     pdftotext cannot read) is a MIXED page, not a fully read one. Detect it structurally, not by character
     count, and supplement its image region through the same bounded local-OCR recovery as a partial page. */
  const mixed = native.filter((p) => p.has_native_text && p.has_image_region === true && p.native_text_incomplete !== true).map((p) => p.page);
  const pages = [];
  for (const p of native) {
    if (p.has_native_text) {
      pages.push({ page: p.page, source: 'NATIVE_TEXT', lines: nativeLineObjects(p), words: p.word_boxes || [], native_text_incomplete: p.native_text_incomplete === true || undefined, has_image_region: p.has_image_region === true || undefined });
    }
  }
  if ((missing.length || incomplete.length || mixed.length) && model.path) {
    const reading = ocr.readTextLayer(model.path);
    if (reading.available) {
      for (const op of (reading.pages || [])) {
        if (missing.includes(op.page)) {
          pages.push({ page: op.page, source: 'LOCAL_OCR', lines: ocrLineObjects(op), words: op.word_evidence || [] });
        } else if (incomplete.includes(op.page) || mixed.includes(op.page)) {
          /* GAP-INGEST-008: supplement a partial or mixed native page with its OCR reading, deduplicated by text. */
          const target = pages.find((p) => p.page === op.page);
          if (target) {
            target.lines = mergeRecoveredLines(target.lines, ocrLineObjects(op));
            target.words = (target.words || []).concat(op.word_evidence || []);
            target.recovered_with_ocr = true;
          }
        }
      }
    }
  }
  return pages.sort((a, b) => a.page - b.page);
}

/* GAP-INGEST-001: a page is identified by its full text AND, when the reader produced geometry, its bounding
   boxes. Identical OCR text can conceal different image content (identifiers the OCR dropped); two pages are
   treated as duplicates only when their text and their geometry both match. A repeated heading (which shares
   only the header with a different body) is never mistaken for a repeated page. */
function pageSignature(page) {
  return (page.lines || []).map((l) => {
    const text = String(l.text || '').replace(/\s+/g, ' ').trim();
    const bbox = l.bbox ? `@${l.bbox.x0},${l.bbox.y0},${l.bbox.x1},${l.bbox.y1}` : '';
    return text + bbox;
  }).filter((s) => s.trim()).join('\n');
}

/* GAP-INGEST-001 (strengthened): matching text and geometry — native or OCR — can conceal different visual
   content, so it never discards a page. A page whose text+geometry matches an earlier page is a SUSPECTED
   duplicate: it is retained with an explicit flag and the skip is audited, never silently discarded. Only
   byte-identical file content (stored_sha256, handled at the file level) is a confirmed discard. */
function dedupePages(pages) {
  const seen = new Map();
  const kept = [];
  const skipped = [];
  for (const page of (pages || [])) {
    const sig = pageSignature(page);
    if (!sig || !seen.has(sig)) {
      if (sig) seen.set(sig, page);
      kept.push(page);
      continue;
    }
    const first = seen.get(sig);
    /* Retained as a suspected duplicate: not discarded, explicitly flagged, original preserved. */
    kept.push(Object.assign({}, page, { suspected_duplicate: true, duplicate_of_page: first.page }));
    skipped.push({ page: page.page, source: page.source, reason: 'SUSPECTED_DUPLICATE_RETAINED', duplicate_of_page: first.page });
  }
  return { pages: kept, skipped };
}

/* GAP-INGEST-001: identify likely missing pages ONLY where the document prints its own page numbering. When no
   numbering is printed, completeness is simply unknown and nothing is invented. */
function detectMissingPages(pages) {
  const PAGE_NUMBER_RE = /page\s+(\d{1,3})(?:\s+of\s+(\d{1,3}))?/i;
  const numbering = [];
  for (const page of (pages || [])) {
    const text = (page.lines || []).map((l) => l.text).join(' ');
    const m = text.match(PAGE_NUMBER_RE);
    if (m) numbering.push({ page: page.page, printed: Number(m[1]), total: m[2] ? Number(m[2]) : null });
  }
  if (numbering.length < 2) {
    return {
      likely_missing_pages: [],
      numbering,
      reason: numbering.length ? 'INSUFFICIENT_PAGE_NUMBER_EVIDENCE' : 'NO_PAGE_NUMBERING_DETECTED'
    };
  }
  const printed = numbering.map((n) => n.printed).sort((a, b) => a - b);
  const missing = [];
  for (let i = 1; i < printed.length; i += 1) {
    const prev = printed[i - 1];
    const cur = printed[i];
    if (cur - prev > 1) for (let g = prev + 1; g < cur; g += 1) missing.push(g);
  }
  const declared = numbering.find((n) => n.total != null);
  if (declared && declared.total > printed[printed.length - 1]) {
    for (let g = printed[printed.length - 1] + 1; g <= declared.total; g += 1) missing.push(g);
  }
  const likely = [...new Set(missing)].sort((a, b) => a - b);
  return { likely_missing_pages: likely, numbering, total_declared: declared ? declared.total : null, reason: null };
}

function labelForDate(textBefore) {
  const words = String(textBefore || '').trim().split(/[\s:]+/).filter(Boolean);
  if (!words.length) return 'Date';
  const last = words[words.length - 1];
  if (/[\d/]/.test(last)) return 'Date';
  return last.replace(/[^A-Za-z0-9 -]/g, '').toUpperCase() || 'Date';
}

function lineFacts(line, convention) {
  const text = line.text;
  const dates = [];
  let m;
  const re = new RegExp(DATE_TOKEN.source, 'g');
  while ((m = re.exec(text))) {
    const raw = m[0];
    const textBefore = text.slice(0, m.index);
    const label = labelForDate(textBefore);
    const norm = normalizePrintedDate(raw, convention);
    dates.push({ label, textBefore, raw, normalized: norm.normalized, precision: norm.precision, reason: norm.reason, convention: norm.convention || null, ambiguous: norm.ambiguous === true || undefined, alternative: norm.alternative || null, interpretations: norm.interpretations || null });
  }
  const amounts = [];
  const amt = new RegExp(AMOUNT_TOKEN.source, 'gi');
  while ((m = amt.exec(text))) amounts.push(m[0]);
  return { dates, amounts };
}

function recordKind(text) {
  const up = String(text || '').toUpperCase();
  if (/COLLECTION|PLACED FOR COLLECTION/.test(up)) return 'GENERAL_COLLECTION';
  if (/INQUIR|ENQUIR/.test(up)) return 'GENERAL_INQUIRY';
  if (/PUBLIC RECORD|JUDGMENT|BANKRUPTCY|LIEN/.test(up)) return 'GENERAL_PUBLIC_RECORD';
  return 'GENERAL_ACCOUNT';
}

function kindLabel(kind) {
  return {
    GENERAL_ACCOUNT: 'account', GENERAL_COLLECTION: 'collection entry', GENERAL_INQUIRY: 'inquiry',
    GENERAL_PUBLIC_RECORD: 'public record', REPORTED_ACCOUNT: 'reported account', CONSUMER_CREDIT_LIABILITY: 'credit account',
    CREDIT_ENQUIRY: 'credit enquiry', OVERDUE_ACCOUNT: 'overdue account'
  }[kind] || 'entry';
}

function uniqueKey(printed, base) {
  if (!printed[base]) return base;
  let i = 2;
  while (printed[`${base} (${i})`]) i += 1;
  return `${base} (${i})`;
}

function isAccountLine(text) {
  return /ACCOUNT|CREDITOR|LENDER|CREDIT PROVIDER|PROVIDER|LIABILITY|CREDIT CARD|CARD|LOAN|REVOLVING|INSTALLMENT|MORTGAGE|AUTO|BALANCE|LIMIT|TRADELINE/.test(String(text || '').toUpperCase());
}

/* ------------------------------------------------------------------ B6-INGEST-004 assessment semantics */

/** The FCRA adverse annotation: "NN days past due as of Mon YYYY". */
const ADVERSE_RATING_PATTERN = /(\d{1,3})\s*days?\s*past\s*due\s+as\s+of\s+([A-Za-z]{3,9}[.\s]+\d{4})/i;

const CLOSURE_LABELS = Object.freeze(['CLOSED', 'CLOSED DATE', 'DATE CLOSED', 'DATE PAID', 'PAID', 'SETTLED', 'DATE PAID/SETTLED', 'DATE SETTLED', 'DATE PAID OR SETTLED']);
const OPENED_LABELS = Object.freeze(['OPENED', 'OPENED DATE', 'DATE OPENED', 'OPEN DATE']);

/* GAP-INGEST: a printed account status word, used only for data-consistency comparison, never to infer a legal
   state. "Open" vs "Closed" is a printed label, not a conclusion about the account's actual state. */
const STATUS_WORDS = Object.freeze(['OPEN', 'CLOSED', 'PAID', 'CURRENT', 'ACTIVE', 'CHARGED OFF', 'CHARGE OFF', 'SETTLED', 'DEFAULT', 'IN COLLECTION']);
function statusWordOf(text) {
  const up = String(text || '').toUpperCase();
  for (const w of STATUS_WORDS) {
    if (new RegExp(`\\b${w.replace(/\s+/g, '\\s+')}\\b`).test(up)) return w;
  }
  return null;
}

/* OWNER-ACCEPT-009 item 3: distinct printed amounts. The flat amount list is preserved as account.amount, but a
   label that immediately precedes a dollar amount gives it a PRINTED MEANING: a current balance, a past-due
   amount, a payment amount, or a credit limit. Each is stored under its own fact with its printed meaning; an
   amount with no recognised label stays unclassified (account.amount only). No arithmetic is inferred from a
   printed amount, and a label is matched only from text immediately before the amount. */
function labeledAmounts(text) {
  const out = {};
  const src = String(text || '');
  const re = new RegExp(AMOUNT_TOKEN.source, 'gi');
  const items = [];
  let m;
  while ((m = re.exec(src))) items.push({ raw: m[0], index: m.index, end: m.index + m[0].length });
  for (let i = 0; i < items.length; i++) {
    // The label context is the text between the previous amount and this amount (or the line start).
    const prevEnd = i === 0 ? 0 : items[i - 1].end;
    const prefix = src.slice(prevEnd, items[i].index).toUpperCase();
    const raw = items[i].raw;
    const numeric = Number(String(raw).replace(/[$,]/g, ''));
    if (!Number.isFinite(numeric)) continue;
    let key = null;
    if (/PAST\s*DUE|OVERDUE/.test(prefix)) key = 'account.pastDueAmount';
    else if (/PAYMENT/.test(prefix)) key = 'account.paymentAmount';
    else if (/CREDIT\s*LIMIT|CREDIT\s*LINE|\bLIMIT\b|HIGH\s*CREDIT|HIGH\s*BALANCE/.test(prefix)) key = 'account.creditLimit';
    else if (/BALANCE/.test(prefix)) key = 'account.balance';
    if (key && !(key in out)) out[key] = { raw, numeric };
  }
  return out;
}

/* OWNER-ACCEPT-009 item 2: printed account responsibility. Only an explicit ownership/role label is read
   (individual, joint, authorized user, co-signer); a label alone is never a conclusion that an account is or is
   not the consumer's, and an unfamiliar creditor/name alone never becomes identity theft or incorrect ownership. */
function responsibilityOf(text) {
  const up = String(text || '').toUpperCase();
  if (/AUTHORI[ZS]ED\s+USER/.test(up)) return { responsibility: 'AUTHORIZED_USER', raw: 'AUTHORIZED USER' };
  if (/JOINT|JOINTLY|CO[- ]?(SIGNER|BORROWER|APPLICANT)/.test(up)) return { responsibility: 'JOINT', raw: 'JOINT' };
  if (/\bINDIVIDUAL\b/.test(up)) return { responsibility: 'INDIVIDUAL', raw: 'INDIVIDUAL' };
  return null;
}

/* OWNER-ACCEPT-009 item 4: report-internal identity fields. A printed name/address/alias/co-applicant is read
   ONLY with its explicit role (primary, historical, alias, co-applicant) and, where printed, its applicable date.
   Values are reduced to non-identifying tokens (never the raw name/address retained). Aliases, historical
   addresses and co-applicants are preserved as DISTINCT roles and never become identity theft; an unfamiliar
   detail alone never establishes incorrect ownership, and this module states when the report cannot establish
   whose information is correct. */
const IDENTITY_FIELD_RE = /^(NAME|CONSUMER NAME|CONSUMER|SUBJECT|CURRENT ADDRESS|ADDRESS|RESIDENTIAL ADDRESS|PREVIOUS ADDRESS|FORMER ADDRESS|PRIOR ADDRESS|ALSO KNOWN AS|AKA|ALIAS|OTHER NAMES|CO-APPLICANT|JOINT APPLICANT|CO-BORROWER|SPOUSE)\s*[:：]\s*(.+)$/i;

function identityFacts(text) {
  const m = IDENTITY_FIELD_RE.exec(String(text || '').trim());
  if (!m) return null;
  const label = m[1].toUpperCase();
  const value = m[2].trim();
  if (!value) return null;
  const token = value.toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!token) return null;
  let role;
  if (/ALSO KNOWN AS|AKA|ALIAS|OTHER NAMES/.test(label)) role = 'ALIAS';
  else if (/CO-APPLICANT|JOINT APPLICANT|CO-BORROWER|SPOUSE/.test(label)) role = 'CO_APPLICANT';
  else if (/PREVIOUS|FORMER|PRIOR/.test(label)) role = 'HISTORICAL';
  else if (/ADDRESS/.test(label)) role = 'CURRENT';
  else role = 'PRIMARY';
  return { field: label, role, token };
}


/* OWNER-ACCEPT-009 item 1: payment history. Only a clearly printed grid is read: a "Payment History"/
   "Payment Profile"/"Repayment History" label, an explicit code->meaning legend, and period=code cells. A blank
   cell is absent/unknown (never a missed payment), a code without a printed legend keeps UNKNOWN meaning (never
   guessed), and chronological order is never invented beyond the periods the report itself prints. */
const PAYMENT_HISTORY_HEADER_RE = /PAYMENT\s+HISTORY|PAYMENT\s+PROFILE|REPAYMENT\s+HISTORY/i;
const LEGEND_PAIR_RE = /([A-Z0-9]{1,4})\s*=\s*([A-Za-z0-9][A-Za-z0-9\s\/-]*?)(?=\s+[A-Z0-9]{1,4}\s*=|\s*$)/g;
const CELL_RE = /([A-Z]{3,9}\s+\d{4}|\d{4}-\d{1,2}|\d{1,2}\/\d{4}|\d{4})\s*[:=]\s*([A-Z0-9*#.-]{1,4})/g;

function paymentHistoryFacts(text) {
  const src = String(text || '');
  if (!PAYMENT_HISTORY_HEADER_RE.test(src.toUpperCase())) return null;
  const legend = [];
  let m;
  const lg = new RegExp(LEGEND_PAIR_RE.source, 'g');
  while ((m = lg.exec(src))) legend.push({ code: m[1].toUpperCase(), meaning: m[2].trim() });
  const legendMap = new Map(legend.map((l) => [l.code, l.meaning]));
  const cells = [];
  const cl = new RegExp(CELL_RE.source, 'g');
  while ((m = cl.exec(src))) {
    const code = m[2].toUpperCase();
    const known = legendMap.has(code);
    cells.push({ period: m[1].trim(), code, meaning: known ? legendMap.get(code) : null, uncertain: !known });
  }
  return { legend, cells };
}


const DISCHARGE_LABELS = Object.freeze(['DISCHARGED', 'DISCHARGE DATE', 'DATE OF DISCHARGE', 'DATE DISCHARGED']);
const OVERDUE_LABELS = Object.freeze(['ORIGINAL LISTING', 'ORIGINAL LISTING DATE', 'ORIGINAL LISTING > DATE', 'DATE ORIGINAL LISTING', 'DEFAULT', 'DATE OF DEFAULT', 'DEFAULT DATE', 'OVERDUE', 'DATE OVERDUE']);

/* OWNER-EVIDENCE-001: the record a bankruptcy discharge date must sit on. A discharge printed on a
   collection or account line is a different word ("the debt was discharged"), so it is NOT a bankruptcy
   discharge and is withheld. A trustee's discharge is a different legal event and is never substituted. */
const BANKRUPTCY_CONTEXT = /BANKRUPTCY|BANKRUPT|INSOLVENC|CHAPTER\s*(7|11|12|13)/i;
const TRUSTEE_DISCHARGE_LABEL = /TRUSTEE'?S?\s+DISCHARGE|DISCHARGE\s+OF\s+TRUSTEE/i;

/* ACCEPT-002 §2: explicit bureau-reported legal-event facts are usable under OWNER-EVIDENCE-001. These are
   the clearly-labelled public-record legal-event anchors, each accepted ONLY from an explicit label on the
   correct record kind, day-precision, and free of same-record contradiction. A semantically different label
   (a filing date, an update date) is never substituted. */
const JUDGMENT_CONTEXT = /JUDGMENT|JUDGEMENT|CIVIL SUIT|CIVIL ACTION/i;
const TAX_LIEN_CONTEXT = /TAX LIEN|LIEN/i;
const COLLECTION_CONTEXT = /COLLECTION|CHARGE[- ]?OFF|PLACED FOR COLLECTION/i;
/* Labels are matched on the last printed word before the date (labelForDate), so each legal-event label is
   its trailing word. "Date of Entry" -> ENTRY, "Order for Relief" -> RELIEF, "Date Released" -> RELEASED,
   "Date Paid" -> PAID. A generic trailing word (DATE) is never a legal-event label. */
const ORDER_FOR_RELIEF_LABELS = Object.freeze(['RELIEF']);
const ADJUDICATION_LABELS = Object.freeze(['ADJUDICATED', 'ADJUDICATION']);
const JUDGMENT_ENTRY_LABELS = Object.freeze(['ENTRY', 'ENTERED']);
const TAX_LIEN_PAID_LABELS = Object.freeze(['PAID', 'RELEASED', 'SATISFIED']);
const JUDGMENT_SATISFACTION_LABELS = Object.freeze(['SATISFIED', 'SATISFACTION']);
const COLLECTION_DELINQUENCY_LABELS = Object.freeze(['DELINQUENCY', 'DOFD']);
/* OWNER-CANDIDATE-006 (A): a generic "Delinquency"/"Delinquent" trailing word is NOT sufficient — the particular
   date must be explicitly bound to the commencement-of-delinquency meaning: "Date of First Delinquency" or "DOFD"
   (Date of First Delinquency). "Date Delinquent", "Delinquency Date" and a bare "Delinquency: <date>" do not carry
   that meaning, and an unrelated "Update Date"/"Date Paid" elsewhere on the line never satisfies it. */
const COLLECTION_DOFD_RELATION = /\bDATE\s+OF\s+FIRST\s+DELINQUENCY\b|\bDOFD\b|\bD\.?O\.?F\.?D\.?\b/i;

/* OWNER-GAP-FINDING-002-RESOURCE-001: a public-record header starts a bankruptcy/judgment/lien record, and a
   "historical verification" line that expressly states the printed legal-event date is unverified/unavailable is
   its own record-owned fact. Neither is inferred from silence, a missing attachment or a generic disclaimer. */
const PUBLIC_RECORD_HEADER_RE = /PUBLIC\s+RECORD\s*:/i;
const HISTORICAL_VERIFICATION_LABEL = /HISTORICAL\s+VERIFICATION/i;
const UNVERIFIED_PHRASE = /UNVERIFIED|NOT\s+VERIFIED|CANNOT\s+BE\s+ESTABLISHED|UNAVAILABLE|CANNOT\s+BE\s+DETERMINED/i;
const PUBLIC_RECORD_IDENTITY_RE = /PUBLIC\s+RECORD\s*:\s*([A-Z0-9][A-Z0-9-]*)/i;

/**
 * ACCEPT-002 §2: accept a clearly-labelled legal-event fact. Collects every day-precision date whose label
 * matches the spec, requires the record context, and either accepts the single unambiguous value or withholds
 * the whole reading as a same-record contradiction. Returns the set of date objects it consumed so the
 * generic date loop never re-reads them as a closure or overdue date.
 */
function acceptLegalEventFact(facts, canonicalPrinted, text, dates, spec, line, currentKind) {
  const consumed = new Set();
  const norm = (d) => String(d.label || '').toUpperCase().replace(/[^A-Z0-9 />-]/g, '').trim();
  const candidates = dates.filter((d) => d.normalized && d.precision === 'DAY' && !consumed.has(d) && spec.labelMatch(norm(d))
    && (!spec.requireTextBefore || spec.requireTextBefore.test(d.textBefore || '')));
  if (!candidates.length) return consumed;
  if (spec.exclude && spec.exclude(text)) return consumed;
  if (!spec.context.test(text) && currentKind !== 'GENERAL_PUBLIC_RECORD') return consumed;
  for (const c of candidates) consumed.add(c);
  // Legal-event fields use the same decisive-word gate as ordinary date fields.
  // One uncertain candidate withholds the whole field, including any conflicting alternative.
  if (candidates.some(c => decisiveWordsTrusted(line, c.raw) === false)) {
    canonicalPrinted[spec.printedKey] = {
      label: spec.printedKey, state: 'UNRESOLVED', status: 'EXTRACTION_UNRESOLVED',
      raw: candidates.map(c => c.raw).join(' | '), normalized: null,
      reason: 'LOW_CONFIDENCE_OCR_READING_ON_DECISIVE_CHARACTERS',
      location: null, kind: 'date', precision: null
    };
    return consumed;
  }
  const distinct = [...new Set(candidates.map((d) => d.normalized))];
  /* The shared reported-fact interface is the single decision point: a same-record contradiction is a
     material contradiction, so the reading is withheld, never defaulted to one of the two values. */
  const decision = acceptFact({
    label: candidates[0].label,
    raw: candidates[0].raw,
    normalized: candidates[0].normalized,
    ambiguous: false,
    associated: true,
    contradictions: distinct.length > 1
      ? candidates.map((c) => ({ record: spec.printedKey, label: c.label, value: c.normalized }))
      : []
  });
  if (!decision.accepted) {
    canonicalPrinted[spec.printedKey] = {
      label: spec.printedKey, state: 'UNRESOLVED', status: 'UNRESOLVED',
      raw: candidates.map((c) => c.raw).join(' | '), normalized: null,
      reason: 'CONTRADICTORY_SAME_RECORD_READINGS',
      contradictions: candidates.map((c) => ({ raw: c.raw, normalized: c.normalized })),
      location: null, kind: 'date', precision: null,
      policy: 'OWNER-EVIDENCE-001', policy_version: '1.0'
    };
    return consumed;
  }
  const d = candidates[0];
  facts[spec.factKey] = d.normalized;
  canonicalPrinted[spec.printedKey] = {
    label: spec.printedKey, state: 'VALUE', status: 'RESOLVED', raw: d.raw, normalized: d.normalized, reason: null,
    location: null, kind: 'date', precision: d.precision,
    anchor_precision: d.precision, comparison_anchor: d.normalized,
    policy: 'OWNER-EVIDENCE-001', policy_version: '1.0', source: 'CLEARLY_LABELLED_REPORTED_FACT'
  };
  return consumed;
}

const LEGAL_EVENT_SPECS = [
  { factKey: 'publicRecord.taxLienPaidDate', printedKey: 'tax_lien_paid_date', labelMatch: (up) => TAX_LIEN_PAID_LABELS.includes(up), context: TAX_LIEN_CONTEXT },
  { factKey: 'publicRecord.judgmentEntryDate', printedKey: 'judgment_entry_date', labelMatch: (up) => JUDGMENT_ENTRY_LABELS.includes(up), context: JUDGMENT_CONTEXT },
  { factKey: 'publicRecord.judgmentSatisfactionDate', printedKey: 'judgment_satisfaction_date', labelMatch: (up) => JUDGMENT_SATISFACTION_LABELS.includes(up), context: JUDGMENT_CONTEXT },
  { factKey: 'publicRecord.bankruptcyOrderForReliefDate', printedKey: 'bankruptcy_order_for_relief_date', labelMatch: (up) => ORDER_FOR_RELIEF_LABELS.includes(up), context: BANKRUPTCY_CONTEXT },
  { factKey: 'publicRecord.bankruptcyAdjudicationDate', printedKey: 'bankruptcy_adjudication_date', labelMatch: (up) => ADJUDICATION_LABELS.includes(up), context: BANKRUPTCY_CONTEXT },
  { factKey: 'bankruptcy.dischargeDate', printedKey: 'bankruptcy_discharge_date', labelMatch: (up) => DISCHARGE_LABELS.includes(up) || /DISCHARGE/.test(up), context: BANKRUPTCY_CONTEXT, exclude: (t) => TRUSTEE_DISCHARGE_LABEL.test(t) },
  { factKey: 'collection.delinquencyDate', printedKey: 'collection_delinquency_date', labelMatch: (up) => COLLECTION_DELINQUENCY_LABELS.includes(up), context: COLLECTION_CONTEXT, requireTextBefore: COLLECTION_DOFD_RELATION }
];

/**
 * Map the dates a general line prints to the canonical assessment facts and record types the existing checks
 * read. A label is mapped ONLY where the printed wording is unambiguous; an unrecognised label is left as a
 * raw reading and never mapped to a legal meaning.
 *
 * GAP-INGEST-003: `trusted` is false for a low-confidence OCR line. Such a line is still recognised by its
 * words (its record kind is decided by wording, never by confidence), but it contributes NO resolved date fact:
 * a low-confidence date is preserved as UNRESOLVED and never becomes a resolved calendar fact.
 */
function canonicalAssessmentFields(text, dates, convention, currentKind, trusted, line, recordIdentity) {
  const ok = trusted !== false;
  const facts = {};
  const canonicalPrinted = {};
  let kind = null;

  const adverse = ADVERSE_RATING_PATTERN.exec(String(text || ''));
  if (adverse) {
    const norm = normalizePrintedDate(adverse[2], convention);
    if (ok && decisiveWordsTrusted(line, adverse[2]) !== false && norm.normalized) {
      /* GAP-INGEST-006: a MONTH-precision anchor keeps its month and precision; no day is invented for it.
         The elapsed-period comparison measures the whole-month range, never a substituted first day. */
      const anchor = norm.normalized;
      facts['reportedAccount.adverseRatingDate'] = anchor;
      facts['reportedAccount.adverseRatingDatePrecision'] = norm.precision;
      canonicalPrinted['adverse_payment_rating_date'] = {
        label: 'adverse_payment_rating_date', state: 'VALUE', status: 'RESOLVED', raw: adverse[2], normalized: norm.normalized, reason: null,
        location: null, kind: 'date', precision: norm.precision,
        source_field: 'adverse_payment_rating_date', raw_value: adverse[0],
        anchor_precision: norm.precision, comparison_anchor: anchor,
        anchor_day_convention: null,
        does_not_establish: 'the date of first delinquency'
      };
      kind = 'REPORTED_ACCOUNT';
    }
  }

  /* Original listing date (overdue/default): the date that follows "Original Listing" in the text. This is the
     recorded ambiguity rule's anchor — it is never taken from a current-listing date. */
  const origListing = /ORIGINAL\s+LISTING[^0-9A-Za-z]*(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{1,2}-\d{1,2}|\d{4}\/\d{1,2}\/\d{1,2}|[A-Za-z]{3,9}[.\s]+\d{1,2},?\s+\d{4}|\d{1,2}[.\s]+[A-Za-z]{3,9}[.,\s]+\d{4})/i.exec(String(text || ''));
  if (origListing) {
    const norm = normalizePrintedDate(origListing[1], convention);
    if (ok && decisiveWordsTrusted(line, origListing[1]) !== false && norm.normalized) {
      facts['overdue.originalListingDate'] = norm.normalized;
      facts['overdue.originalListingDatePrecision'] = norm.precision;
      canonicalPrinted['original_listing_date'] = {
        label: 'original_listing_date', state: 'VALUE', status: 'RESOLVED', raw: origListing[1], normalized: norm.normalized, reason: null,
        location: null, kind: 'date', precision: norm.precision,
        anchor_precision: norm.precision, comparison_anchor: norm.normalized
      };
      kind = 'OVERDUE_ACCOUNT';
    }
  }

  /* ACCEPT-002 §2: accept the clearly-labelled legal-event facts first. Each accepts a single unambiguous
     value or withholds the whole reading as a same-record contradiction. Consumed dates never re-enter the
     generic closure/overdue loop below, so a tax-lien "Date Paid" is a paid-lien date, not an account closure. */
  const consumed = new Set();
  if (ok) {
    for (const spec of LEGAL_EVENT_SPECS) {
      for (const c of acceptLegalEventFact(facts, canonicalPrinted, text, dates, spec, line, currentKind)) consumed.add(c);
    }
  }
  if (facts['publicRecord.taxLienPaidDate'] || facts['publicRecord.judgmentEntryDate']
    || facts['publicRecord.judgmentSatisfactionDate']
    || facts['publicRecord.bankruptcyOrderForReliefDate'] || facts['publicRecord.bankruptcyAdjudicationDate']
    || facts['bankruptcy.dischargeDate']) {
    if (kind === null) kind = 'GENERAL_PUBLIC_RECORD';
  }
  if (facts['collection.delinquencyDate'] && kind === null) kind = 'GENERAL_COLLECTION';

  /* OWNER-CANDIDATE-007 (B): record the ESTABLISHED (b) account/action context — the record's own printed
     COLLECTION / CHARGE-OFF / PLACED FOR COLLECTION wording — as a tri-state fact with source provenance. The
     three states the (a)(8) branch gates on are: COLLECTION_OR_CHARGE_OFF (established (b) context → defer to
     (a)(5)), EVENT_DATE_SUPPORTED (established event-date context → event-date timing; NO extraction basis
     produces this yet), and the default UNKNOWN (no such wording; absence does NOT establish (b) inapplicable
     because (b) also covers "any similar action"). A repossession/foreclosure/write-off word is NOT assigned the
     legal meaning of "similar action" here. */
  if (COLLECTION_CONTEXT.test(String(text || ''))) {
    facts['reportedAccount.accountActionContext'] = 'COLLECTION_OR_CHARGE_OFF';
  }

  /* OWNER-GAP-FINDING-002-RESOURCE-001: extract the explicit historical-verification statement as its own
     record-owned report fact. It triggers ONLY when the line expressly names "historical verification" AND states
     the printed date is unverified/unavailable. A missing attachment, absence of a case number, a generic
     disclaimer or silence does NOT establish this, and neither does a consumer's denial. */
  const upForHv = String(text || '').toUpperCase();
  const hvForMatch = /HISTORICAL\s+VERIFICATION\s+FOR\s+([A-Z0-9][A-Z0-9-]*)/i.exec(String(text || ''));
  const hvReferenced = hvForMatch ? hvForMatch[1].toUpperCase() : null;
  const hvAssociates = !hvReferenced || !recordIdentity || hvReferenced === String(recordIdentity).toUpperCase();
  if (ok && HISTORICAL_VERIFICATION_LABEL.test(upForHv) && UNVERIFIED_PHRASE.test(upForHv)
      && (currentKind === 'GENERAL_PUBLIC_RECORD' || BANKRUPTCY_CONTEXT.test(upForHv))
      && hvAssociates) {
    facts['publicRecord.bankruptcyOrderForReliefDate.historicalVerification'] = 'UNVERIFIED';
    canonicalPrinted['historical_verification'] = {
      label: 'historical_verification', state: 'VALUE', status: 'RESOLVED',
      raw: String(text || ''), normalized: 'UNVERIFIED', reason: null,
      location: lineLocation(line), kind: 'text', precision: null,
      policy: 'OWNER-EVIDENCE-001', policy_version: '1.0', source: 'EXPLICIT_RECORD_OWNED_HISTORICAL_VERIFICATION_STATEMENT'
    };
    if (kind === null) kind = 'GENERAL_PUBLIC_RECORD';
  }

  for (const d of dates) {
    if (consumed.has(d)) continue;
    const up = String(d.label || '').toUpperCase().replace(/[^A-Z0-9 />-]/g, '').trim();
    /* GAP-INGEST-005: an ambiguous numeric date with no report-evidenced convention preserves BOTH
       interpretations and contributes NO resolved date, so it can never drive a finding. */
    if (ok && !d.normalized && Array.isArray(d.interpretations) && d.interpretations.length > 1) {
      if (CLOSURE_LABELS.includes(up)) {
        facts['liability.closedDateInterpretations'] = d.interpretations.slice();
        canonicalPrinted['closed_date'] = { label: 'closed_date', state: 'UNRESOLVED', status: 'EXTRACTION_UNRESOLVED', raw: d.raw, normalized: null, reason: d.reason, location: null, kind: 'date', precision: d.precision, interpretations: d.interpretations.slice() };
        if (kind === null) kind = 'CONSUMER_CREDIT_LIABILITY';
      } else if (OVERDUE_LABELS.includes(up)) {
        facts['overdue.originalListingDateInterpretations'] = d.interpretations.slice();
        canonicalPrinted['original_listing_date'] = { label: 'original_listing_date', state: 'UNRESOLVED', status: 'EXTRACTION_UNRESOLVED', raw: d.raw, normalized: null, reason: d.reason, location: null, kind: 'date', precision: d.precision, interpretations: d.interpretations.slice() };
        if (kind === null) kind = 'OVERDUE_ACCOUNT';
      }
      continue;
    }
    if (!ok || decisiveWordsTrusted(line, d.raw) === false || !d.normalized) continue;
    if (CLOSURE_LABELS.includes(up)) {
      facts['liability.closedDate'] = d.normalized;
      facts['liability.closedDatePrecision'] = d.precision || null;
      canonicalPrinted['closed_date'] = {
        label: 'closed_date', state: 'VALUE', status: 'RESOLVED', raw: d.raw, normalized: d.normalized, reason: null,
        location: null, kind: 'date', precision: d.precision || null,
        anchor_precision: d.precision || null, comparison_anchor: d.normalized,
        ambiguous: d.ambiguous === true ? true : undefined, alternative_normalized: d.alternative || null
      };
      if (kind === null) kind = 'CONSUMER_CREDIT_LIABILITY';
    } else if (OPENED_LABELS.includes(up)) {
      facts['liability.openedDate'] = d.normalized;
      facts['liability.openedDatePrecision'] = d.precision || null;
      canonicalPrinted['opened_date'] = {
        label: 'opened_date', state: 'VALUE', status: 'RESOLVED', raw: d.raw, normalized: d.normalized, reason: null,
        location: null, kind: 'date', precision: d.precision || null,
        anchor_precision: d.precision || null, comparison_anchor: d.normalized,
        ambiguous: d.ambiguous === true ? true : undefined, alternative_normalized: d.alternative || null
      };
      if (kind === null) kind = 'CONSUMER_CREDIT_LIABILITY';
    } else if (OVERDUE_LABELS.includes(up)) {
      facts['overdue.originalListingDate'] = d.normalized;
      facts['overdue.originalListingDatePrecision'] = d.precision || null;
      canonicalPrinted['original_listing_date'] = {
        label: 'original_listing_date', state: 'VALUE', status: 'RESOLVED', raw: d.raw, normalized: d.normalized, reason: null,
        location: null, kind: 'date', precision: d.precision || null,
        anchor_precision: d.precision || null, comparison_anchor: d.normalized,
        ambiguous: d.ambiguous === true ? true : undefined, alternative_normalized: d.alternative || null
      };
      if (kind === null) kind = 'OVERDUE_ACCOUNT';
    }
  }

  /* A credit enquiry record: its own printed date is the information-request date. */
  if (currentKind === 'GENERAL_INQUIRY') {
    const firstDate = dates.find((d) => d.normalized);
    if (ok && firstDate) facts['enquiry.date'] = firstDate.normalized;
    kind = 'CREDIT_ENQUIRY';
  }

  /* An overdue/default record whose original-listing date was not printed: the check runs with an unresolved
     anchor — the current-listing date is never borrowed (recorded ambiguity rule). */
  const upText = String(text || '').toUpperCase();
  if (kind === null && /OVERDUE|DEFAULT/.test(upText)) kind = 'OVERDUE_ACCOUNT';

  return { facts, canonicalPrinted, kind };
}

/* GAP-INGEST-002: a value line introduces a NEW account only when it carries an account/creditor boundary word.
   A field label alone (Balance, Opened, Closed, Limit …) is a continuation of the account that precedes it,
   never a new account. Two records are never merged merely because they share a bureau, creditor or amount. */
const ACCOUNT_INTRO_RE = /ACCOUNT|CREDITOR|LENDER|PROVIDER|LIABILITY|TRADELINE|CARD|LOAN|REVOLVING|INSTALLMENT|MORTGAGE|AUTO/i;
/* GAP-INGEST-002: an identifier label ("Account Number …", "Acct # …") prints the word "Account" but is a FIELD,
   not an account name, so it never starts a new account nor contributes an account identity. */
const ACCOUNT_NUMBER_LABEL_RE = /\b(?:ACCOUNT|ACCT)\s*(?:NUMBER|NO\.?|#|ID)\b/i;

/* BLOCKER-FDT-001 / common-error duplicate corroboration: a report-supported account identity, taken from the
   account/creditor name printed on the account-intro line. It is normalized to a non-identifying token (never an
   account number, never a consumer name) and is used ONLY to decide whether two records with identical dates and
   source report are corroborated as the SAME account. A name the report prints is report-supported; an account
   number is never retained. */
const IDENTITY_LABEL_STRIP = /\b(OPENED|CLOSED|BALANCE|LIMIT|CREDIT LIMIT|DATE OPENED|DATE CLOSED|DATE PAID|PAYMENT|PAST DUE|OVERDUE|STATUS|ACCOUNT|TRADELINE|REPORT DATE|CREDIT REPORT|CONSUMER|REPORT|DATE|OF|ON|INDIVIDUAL|JOINT|JOINTLY|AUTHORIZED USER|AUTHORISED USER|CO-SIGNER|CO-BORROWER|RESPONSIBILITY)\b/gi;

function accountIdentityToken(text) {
  let t = String(text || '');
  t = t.replace(new RegExp(DATE_TOKEN.source, 'g'), ' ');
  t = t.replace(new RegExp(AMOUNT_TOKEN.source, 'g'), ' ');
  t = t.replace(IDENTITY_LABEL_STRIP, ' ');
  const token = t.replace(/[^A-Za-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
  if (!token || token.length < 2) return null;
  if (/^(OPENED|CLOSED|BALANCE|LIMIT|ACCOUNT|TRADELINE|CREDIT|REPORT|CONSUMER|DATE)$/.test(token)) return null;
  return token;
}

/* BLOCKER-FDT-001 / duplicate corroboration: a MASKED account identifier, taken from a printed masked account
   number (e.g. "Account Number ****1234" / "Acct # XXXX 5678"). Only the trailing digits are retained as a
   privacy-preserving token; the full number is never kept. This — not the creditor name — is what corroborates
   two records as the SAME debt. */
function maskedIdentifierToken(text) {
  const s = String(text || '');
  let m = /(?:ACCOUNT|ACCT)\s*(?:NUMBER|NO|#)?\s*[:#]?\s*[*#Xx·•]{2,}[\s\-]?(\d{3,4})/i.exec(s);
  if (!m) m = /(?:ACCOUNT|ACCT)\s*(?:NUMBER|NO|#)?\s*[:#]?\s*(?:ENDING|LAST|#)\s*(\d{3,4})/i.exec(s);
  if (!m) return null;
  const digits = String(m[1]).replace(/\D/g, '');
  if (digits.length < 3 || digits.length > 4) return null;
  return 'MASK-' + digits.padStart(4, '0');
}


/* A report-header date (Report Date / Prepared / Request / As Of) is the report's own metadata, not an account
   field. It is never a continuation of an account. */
function isReportHeaderLine(text) {
  const up = String(text || '').toUpperCase();
  return REFERENCE_DATE_HINTS.some((h) => up.includes(h));
}

/* Collect the fields one line contributes, without deciding yet whether it starts or continues a record. */
function collectLineFields(line, facts, kind, convention, trusted, recordIdentity) {
  const printed = {};
  let resolved = 0;
  for (const d of facts.dates) {
    const key = uniqueKey(printed, d.label || 'Date');
    /* GAP-INGEST-003: a date is resolved only when the line is trusted AND the token's own words are trusted. */
    const decisiveTrusted = trusted && decisiveWordsTrusted(line, d.raw) !== false;
    const value = decisiveTrusted && d.normalized;
    const state = value ? 'VALUE' : 'UNRESOLVED';
    if (state === 'VALUE') resolved += 1;
    printed[key] = {
      label: d.label || 'Date', state, raw: d.raw, normalized: value ? d.normalized : null,
      reason: value ? null : (!trusted ? 'LOW_CONFIDENCE_OCR_READING' : (decisiveWordsTrusted(line, d.raw) === false ? 'LOW_CONFIDENCE_OCR_READING_ON_DECISIVE_CHARACTERS' : (d.reason || 'DATE_NOT_RECOGNISED'))),
      location: lineLocation(line), kind: 'date', precision: d.precision || null
    };
  }
  for (const amount of facts.amounts) {
    const key = uniqueKey(printed, 'Amount');
    const decisiveTrusted = trusted && decisiveWordsTrusted(line, amount) !== false;
    printed[key] = {
      label: 'Amount', state: decisiveTrusted ? 'VALUE' : 'UNRESOLVED', raw: amount, normalized: null,
      reason: decisiveTrusted ? null : (!trusted ? 'LOW_CONFIDENCE_OCR_READING' : 'LOW_CONFIDENCE_OCR_READING_ON_DECISIVE_CHARACTERS'), location: lineLocation(line), kind: 'amount'
    };
  }
  const canonical = canonicalAssessmentFields(line.text, facts.dates, convention, kind, trusted, line, recordIdentity);
  /* GAP-INGEST: preserve the printed amount, its currency marker and the printed status as facts, so
     common-error checks compare COMPATIBLE facts only. A printed amount is not an assertion that the account
     is or is not in any particular state. */
  if (facts.amounts.length > 0 && trusted && decisiveWordsTrusted(line, facts.amounts[0]) !== false) {
    canonical.facts['account.amountRaw'] = facts.amounts[0];
    const numeric = Number(String(facts.amounts[0]).replace(/[$,]/g, ''));
    if (Number.isFinite(numeric)) canonical.facts['account.amount'] = numeric;
    if (facts.amounts[0].indexOf('$') >= 0) canonical.facts['account.currency'] = 'USD_SYMBOL_PRINTED';
  }
  if (trusted) {
    for (const [key, val] of Object.entries(labeledAmounts(line.text))) {
      if (decisiveWordsTrusted(line, val.raw) === false) continue;
      canonical.facts[key] = val.numeric;
      canonical.facts[`${key}Raw`] = val.raw;
      if (val.raw.indexOf('$') >= 0) canonical.facts['account.currency'] = 'USD_SYMBOL_PRINTED';
    }
  }
  const printedStatus = PAYMENT_HISTORY_HEADER_RE.test(String(line.text || '').toUpperCase()) ? null : statusWordOf(line.text);
  if (printedStatus) canonical.facts['account.status'] = printedStatus;
  /* BLOCKER-FDT-001 / duplicate corroboration: an account-intro line contributes its printed account/creditor
     identity as a normalized, non-identifying token. A continuation line never adds one. */
  if (kind === 'GENERAL_ACCOUNT' && ACCOUNT_INTRO_RE.test(String(line.text || '').toUpperCase()) && !ACCOUNT_NUMBER_LABEL_RE.test(String(line.text || '').toUpperCase())) {
    const identity = accountIdentityToken(line.text);
    if (identity) canonical.facts['account.reported_identity'] = identity;
  }
  const masked = maskedIdentifierToken(line.text);
  if (masked) canonical.facts['account.masked_identifier'] = masked;
  if (trusted) {
    const resp = responsibilityOf(line.text);
    if (resp) {
      canonical.facts['account.responsibility'] = resp.responsibility;
      canonical.facts['account.responsibilityRaw'] = resp.raw;
    }
    const ph = paymentHistoryFacts(line.text);
    if (ph) {
      canonical.facts['account.paymentHistoryLegend'] = ph.legend;
      canonical.facts['account.paymentHistoryCells'] = ph.cells;
    }
  }
  for (const key of Object.keys(canonical.canonicalPrinted)) {
    const field = canonical.canonicalPrinted[key];
    if (field.location === null) field.location = lineLocation(line);
    printed[key] = field;
  }
  return { printed, resolved, canonical };
}

/* GAP-INGEST-009: the bureau in effect at each line of each page, so a record built from a combined report is
   attributed to the section that printed it, never to another section's bureau. */
function bureauSectionMap(pages) {
  const map = new Map();
  for (const page of (pages || [])) {
    let current = null;
    const perLine = new Map();
    for (const line of (page.lines || [])) {
      const section = bureauSectionOf(line.text);
      if (section) current = section;
      perLine.set(line.line, current);
    }
    map.set(page.page, perLine);
  }
  return map;
}

// Segment the reading before account assembly. A continuation never crosses a bureau header.
function reportSegments(pages) {
  const segments = [];
  let current = null;
  for (const page of pages) {
    for (const line of page.lines || []) {
      const bureau = bureauSectionOf(line.text);
      const ambiguous = !bureau && !/\b(RIGHTS|CONTACT|OBTAIN|VISIT|CALL|MAY|SHOULD)\b/i.test(line.text) && /^\s*(EQUIFAX|EXPERIAN|TRANS\s?UNION|ILLION)\b.*\bCREDIT\s+(REPORT|FILE|PROFILE)\b/i.test(line.text);
      if (!current || bureau || ambiguous) {
        current = { bureau: bureau || null, ambiguous, pages: [] };
        segments.push(current);
      }
      let p = current.pages[current.pages.length - 1];
      if (!p || p.page !== page.page) { p = Object.assign({}, page, { lines: [] }); current.pages.push(p); }
      p.lines.push(line);
    }
  }
  // Repeated headers with the same date (or a dateless continuation) remain one report.
  const merged = [];
  for (const segment of segments) {
    segment.reference_date = findReferenceDate(segment.pages, null);
    const previous = merged[merged.length - 1];
    const a = previous && previous.reference_date;
    const b = segment.reference_date;
    if (previous && segment.bureau && previous.bureau === segment.bureau && a.status === 'RESOLVED' &&
        ((b.status === 'RESOLVED' && a.normalized_value === b.normalized_value) ||
          (b.reason === 'NO_REPORT_DATE_FOUND' && segment.pages[0].page <= previous.pages[previous.pages.length - 1].page + 1 &&
            segment.pages.some((p) => p.lines.some((l) => /\bCONTINUED\b|CONT'D/i.test(l.text)))))) {
      previous.pages.push(...segment.pages);
    } else merged.push(segment);
  }
  return merged;
}

/* OWNER-CANDIDATE-002 (corrected): judgment-content presence is FIELD-VALUE evidence, never label presence.
   A field is PRESENT only when its label carries a non-blank VALUE. A blank label is not a value. An unlabelled
   value is not a verified omission. A dollar amount without the judgment-amount label is not the judgment amount.
   Zero is an amount (PRESENT). Conflicts and unsupported representations are UNRESOLVED. VERIFIED_ABSENT requires
   POSITIVE completeness, never the mere absence of a continuation marker. */
const JUDGMENT_CREDITOR_ADDRESS_FIELD_RE = /^(JUDGMENT\s+CREDITOR\s+ADDRESS|CREDITOR\s+ADDRESS|ADDRESS\s+OF\s+(?:THE\s+)?JUDGMENT\s+CREDITOR)\s*[:：-]\s*(.+)$/i;
const JUDGMENT_CREDITOR_ADDRESS_LABEL_ONLY_RE = /^(JUDGMENT\s+CREDITOR\s+ADDRESS|CREDITOR\s+ADDRESS|ADDRESS\s+OF\s+(?:THE\s+)?JUDGMENT\s+CREDITOR)\s*[:：-]?\s*$/i;
const JUDGMENT_CREDITOR_FIELD_RE = /^(JUDGMENT\s+CREDITOR|CREDITOR|PLAINTIFF|IN\s+FAVOU?R\s+OF|AWARDED\s+TO)\s*[:：-]\s*(.+)$/i;
const JUDGMENT_CREDITOR_LABEL_ONLY_RE = /^(JUDGMENT\s+CREDITOR|CREDITOR|PLAINTIFF|IN\s+FAVOU?R\s+OF|AWARDED\s+TO)\s*[:：-]?\s*$/i;
const JUDGMENT_AMOUNT_FIELD_RE = /^(JUDGMENT\s+AMOUNT|AMOUNT\s+OF\s+JUDGMENT|AMOUNT|AWARD)\s*[:：-]\s*(\$?\s*[\d,]+(?:\.\d{2})?)\s*$/i;
const JUDGMENT_AMOUNT_LABEL_ONLY_RE = /^(JUDGMENT\s+AMOUNT|AMOUNT\s+OF\s+JUDGMENT|AMOUNT|AWARD)\s*[:：-]?\s*$/i;
const JUDGMENT_ASSIGNEE_FIELD_RE = /^(ASSIGNEE|ASSIGNED\s+TO|ASSIGNMENT)\s*[:：-]\s*(.+)$/i;
const JUDGMENT_DOLLAR_RE = /\$\s?[\d,]+(?:\.\d{2})?/;
const JUDGMENT_TRUNCATION_MARKERS = /CONTINUED|CONT\s*\.|SEE\s+NEXT|MORE\s+ON|PAGE\s+\d+\s+OF/i;
/* A line that belongs to the open public record rather than a new account or a standalone record. */
const JUDGMENT_CONTENT_LINE_RE = /^(JUDGMENT|TYPE|CREDITOR|PLAINTIFF|JUDGMENT\s+CREDITOR|IN\s+FAVOU?R\s+OF|AWARDED\s+TO|AMOUNT|JUDGMENT\s+AMOUNT|AMOUNT\s+OF\s+JUDGMENT|AWARD|ASSIGNEE|ASSIGNED\s+TO|CASE|DOCKET|COURT|DATE\s+OF\s+ENTRY|DATE\s+ENTERED)\b/i;

/* Field-value presence for one judgment entry. `lines` is the entry's own lines; `allTrusted` is false when any
   line was untrusted; `positivelyBounded` is true only when the entry closed at an accepted presentation boundary
   (a new public-record header or a section/account boundary), never merely because no continuation marker was seen. */
function judgmentContentEvidence(lines, allTrusted, positivelyBounded) {
  const list = lines || [];
  const complete = allTrusted === true
    && positivelyBounded === true
    && !list.some((l) => JUDGMENT_TRUNCATION_MARKERS.test(String(l.text || '')));

  const creditorNames = [];
  const creditorAddresses = [];
  const amountValues = [];
  const assignees = [];
  let dollarAmounts = 0;
  let blankCreditorLabel = false;
  let blankAddressLabel = false;
  let blankAmountLabel = false;

  for (const l of list) {
    const text = String(l.text || '').replace(/\r/g, '');
    let m;
    /* BATCH-12: the creditor ADDRESS caption is tested FIRST, because `CREDITOR ADDRESS: 12 Main St` would
       otherwise satisfy the creditor-name pattern and be read as the creditor's name. */
    if ((m = JUDGMENT_CREDITOR_ADDRESS_FIELD_RE.exec(text))) creditorAddresses.push(m[2].trim());
    else if (JUDGMENT_CREDITOR_ADDRESS_LABEL_ONLY_RE.test(text)) blankAddressLabel = true;
    if ((m = JUDGMENT_CREDITOR_FIELD_RE.exec(text))) creditorNames.push(m[2].trim());
    else if (JUDGMENT_CREDITOR_LABEL_ONLY_RE.test(text)) blankCreditorLabel = true;
    if ((m = JUDGMENT_AMOUNT_FIELD_RE.exec(text))) amountValues.push(m[2].trim());
    else if (JUDGMENT_AMOUNT_LABEL_ONLY_RE.test(text)) blankAmountLabel = true;
    if ((m = JUDGMENT_ASSIGNEE_FIELD_RE.exec(text))) assignees.push(m[2].trim());
    if (JUDGMENT_DOLLAR_RE.test(text)) dollarAmounts += 1;
  }

  /* A blank label or a conflicting (0 or >1) label never establishes presence; an unlabelled name cannot be a
     verified omission, so the creditor name is PRESENT only for exactly one labelled, non-blank value. */
  const creditor_name = creditorNames.length === 1 ? 'PRESENT' : 'UNRESOLVED';
  /* BATCH-12: the creditor address, read from its own caption. VERIFIED_ABSENT only on a complete entry that
     prints neither an address caption nor a blank address label. */
  let creditor_address;
  if (creditorAddresses.length === 1) creditor_address = 'PRESENT';
  else if (creditorAddresses.length > 1) creditor_address = 'UNRESOLVED';
  else if (complete && !blankAddressLabel) creditor_address = 'VERIFIED_ABSENT';
  else creditor_address = 'UNRESOLVED';
  /* The amount is PRESENT only for exactly one labelled monetary value (zero included). It is VERIFIED_ABSENT only
     on a complete entry with no amount label and no dollar amount anywhere. A dollar amount elsewhere (court costs,
     fees) is not the judgment amount and keeps the amount UNRESOLVED. */
  let amount;
  if (amountValues.length === 1) amount = 'PRESENT';
  else if (amountValues.length > 1) amount = 'UNRESOLVED';
  else if (complete && dollarAmounts === 0 && !blankAmountLabel) amount = 'VERIFIED_ABSENT';
  else amount = 'UNRESOLVED';
  /* The assignment alternative is off-report: an assignee label+value is PRESENT, but its absence never proves the
     judgment was not assigned, so absence stays UNRESOLVED. */
  const assignee = assignees.length >= 1 ? 'PRESENT' : 'UNRESOLVED';

  return {
    creditor_name,
    creditor_address,
    amount,
    assignee,
    entry_complete: complete,
    evidence: {
      creditor_values: creditorNames.length,
      creditor_address_values: creditorAddresses.length,
      amount_values: amountValues.length,
      assignee_values: assignees.length,
      dollar_amounts: dollarAmounts,
      blank_creditor_label: blankCreditorLabel,
      blank_address_label: blankAddressLabel,
      blank_amount_label: blankAmountLabel
    }
  };
}

/* OWNER-CANDIDATE-003 (corrected after architect review): Nova Scotia Consumer Reporting Act s.10(3)(f) —
   dismissed/set-aside/withdrawn/stayed criminal-charge prohibition. A report shall not include information about
   a criminal or summary conviction charge whose disposition is dismissed, set aside, withdrawn, or stayed.
   A criminal charge is POSITIVELY identified by a "criminal" or "summary conviction" context PLUS a charge value
   — never inferred from generic "charge", "offence", "arrest" or a monetary charge alone. The disposition is
   bound to the same charge and classified semantically: a positive final disposition is required; negation,
   pending/requested outcomes, applications rather than charges, reversed/superseded dispositions and conflicting
   readings are NOT positive. Unsupported wording stays UNRESOLVED. Raw wording, charge identity and source
   locations are preserved. */
const CRIMINAL_CHARGE_IDENTITY_RE = /\bCRIMINAL\b|\bSUMMARY\s+CONVICTION\b/i;
const CHARGE_LABEL_RE = /^(CRIMINAL\s+CHARGES?|SUMMARY\s+CONVICTION\s+OFFENCES?|CHARGES?|COUNTS?|OFFENCES?|OFFENSES?)(?:\s+(\d+))?\s*[:：-]\s*(.+)$/i;
const DISPOSITION_LABEL_RE = /^(DISPOSITIONS?|STATUS(?:ES)?|RESULTS?|OUTCOMES?|VERDICTS?|FINDINGS?)(?:\s+(\d+))?\s*[:：-]\s*(.+)$/i;
const DISPOSITION_EMPTY_LABEL_RE = /^(DISPOSITIONS?|STATUS(?:ES)?|RESULTS?|OUTCOMES?|VERDICTS?|FINDINGS?)\s*[:：-]\s*$/i;
const CRIMINAL_CONTENT_LINE_RE = /^(CRIMINAL|SUMMARY\s+CONVICTION|CHARGE|CHARGES|COUNT|COUNTS|OFFENCE|OFFENSE|OFFENCES|OFFENSES|DISPOSITION|DISPOSITIONS|STATUS|RESULT|RESULTS|OUTCOME|VERDICT|FINDING)\b/i;

/* Classify a disposition VALUE (not the whole record) semantically. Only a positive, final, charge-level
   disposition (DISMISSED / WITHDRAWN / SET_ASIDE / STAYED) is prohibited. Everything else is NOT positive. */
function classifyDisposition(value) {
  const up = String(value || '').trim().toUpperCase();
  if (!up) return 'UNRESOLVED';
  /* Negated, hypothetical, requested, questioned, superseded and application-level wording is NOT a positive
     charge-level disposition. These come BEFORE the positive forms so a keyword never flips them to positive. */
  if (/\bNOT\s+(DISMISSED|WITHDRAWN|SET\s+ASIDE|STAYED|STAY\s+OF\s+PROCEEDINGS)\b/.test(up)) return 'NEGATED';
  if (/\bNEVER\s+(DISMISSED|WITHDRAWN|SET\s+ASIDE|STAYED)\b/.test(up)) return 'NEGATED';
  if (/\bNO\s+(DISMISSAL|WITHDRAWAL|STAY)\b/.test(up)) return 'NEGATED';
  if (/\b(WOULD|COULD|MAY|MIGHT|IF|HAD\s+BEEN)\s+(BE\s+)?(DISMISSED|WITHDRAWN|SET\s+ASIDE|STAYED)\b/.test(up)) return 'HYPOTHETICAL';
  if (/\b(DISMISSAL|WITHDRAWAL|STAY)\s+(REQUESTED|SOUGHT|APPLIED\s+FOR)\b/.test(up) || /\bREQUEST(ED)?\s+(DISMISSAL|WITHDRAWAL|STAY)\b/.test(up)) return 'REQUESTED';
  if (/\?/.test(up)) return 'QUESTIONED';
  if (/\b(PENDING|REMAINS?\s+PENDING|PROCEEDING|ACTIVE|ONGOING|UPCOMING|SCHEDULED|ADJOURNED|BEFORE\s+THE\s+COURT)\b/.test(up)) return 'PENDING';
  if (/\b(REVERSED|OVERTURNED|VACATED|QUASHED|SUPERSEDED|RESCINDED)\b/.test(up)) return 'REVERSED';
  if (/\b(APPLICATION|MOTION|REQUEST|NOTICE)\s+TO\s+(DISMISS|WITHDRAW|SET\s+ASIDE|STAY)\b/.test(up)) return 'APPLICATION';
  if (/\bDISMISSED\b/.test(up)) return 'DISMISSED';
  if (/\bWITHDRAW(N|AL)?\b/.test(up)) return 'WITHDRAWN';
  if (/\bSET\s+ASIDE\b/.test(up)) return 'SET_ASIDE';
  if (/\bSTAY\s+OF\s+PROCEEDINGS\b/.test(up) || /\bSTAYED\b/.test(up)) return 'STAYED';
  /* Known non-prohibited final dispositions — the charge was resolved in another way. */
  if (/\bCONVICTED\b|\bGUILTY\b|\bFOUND\s+GUILTY\b/.test(up)) return 'CONVICTED';
  if (/\bACQUITTED\b|\bFOUND\s+NOT\s+GUILTY\b|\bNOT\s+GUILTY\b/.test(up)) return 'ACQUITTED';
  return 'UNRESOLVED';
}

function isProhibitedDisposition(cls) {
  return cls === 'DISMISSED' || cls === 'WITHDRAWN' || cls === 'SET_ASIDE' || cls === 'STAYED';
}

function criminalChargeEvidence(lines, allTrusted, positivelyBounded) {
  const list = lines || [];
  /* The document model's line text carries a carriage return from pdftotext; strip it for matching while the
     record's raw text is preserved elsewhere for evidence. */
  const clean = (t) => String(t || '').replace(/\r/g, '');
  const text = list.map((l) => clean(l.text)).join(' ');
  const truncated = list.some((l) => JUDGMENT_TRUNCATION_MARKERS.test(clean(l.text)));
  const dangling = list.some((l) => DISPOSITION_EMPTY_LABEL_RE.test(clean(l.text)));
  const complete = allTrusted === true && positivelyBounded === true && !truncated && !dangling;

  const criminalContext = CRIMINAL_CHARGE_IDENTITY_RE.test(text);

  const chargeEntries = [];
  const dispositionEntries = [];
  for (const l of list) {
    const raw = clean(l.text);
    const cm = CHARGE_LABEL_RE.exec(raw);
    if (cm) {
      const number = cm[2] || null;
      for (const v of String(cm[3]).split(/[,;]|\band\b/i).map((s) => s.trim()).filter(Boolean)) chargeEntries.push({ value: v, number, page: l.page, line: l.line });
    }
    const dm = DISPOSITION_LABEL_RE.exec(raw);
    if (dm) dispositionEntries.push({ value: dm[3].trim(), number: dm[2] || null, classification: classifyDisposition(dm[3]), page: l.page, line: l.line });
  }

  const charge_present = criminalContext && chargeEntries.length > 0 ? 'PRESENT' : (complete ? 'VERIFIED_ABSENT' : 'UNRESOLVED');

  let dismissed_disposition = 'UNRESOLVED';
  if (charge_present === 'PRESENT') {
    const prohibited = dispositionEntries.filter((d) => isProhibitedDisposition(d.classification));
    const anyUnresolved = dispositionEntries.some((d) => d.classification === 'UNRESOLVED');
    if (prohibited.length > 0) {
      /* A prohibited disposition binds only to an identified charge: a numbered disposition binds to the charge
         with the same number, and an unnumbered disposition binds only when there is a single charge. Equal
         charge/disposition counts alone never establish pairing. */
      const anyBound = prohibited.some((d) => (
        d.number != null ? chargeEntries.some((c) => c.number === d.number) : chargeEntries.length === 1
      ));
      dismissed_disposition = anyBound ? 'PRESENT' : 'UNRESOLVED';
    } else if (dispositionEntries.length === 0 || anyUnresolved) {
      dismissed_disposition = 'UNRESOLVED';
    } else {
      dismissed_disposition = complete ? 'VERIFIED_ABSENT' : 'UNRESOLVED';
    }
  } else if (complete) {
    dismissed_disposition = 'VERIFIED_ABSENT';
  }

  return {
    charge_present,
    dismissed_disposition,
    entry_complete: complete,
    evidence: {
      criminal_context: criminalContext,
      charge_values: chargeEntries.map((c) => (c.number != null ? c.number + ': ' : '') + c.value),
      dispositions: dispositionEntries.map((d) => ({ value: d.value, number: d.number, classification: d.classification, page: d.page, line: d.line })),
      dispositions: dispositionEntries.map((d) => ({ value: d.value, classification: d.classification, page: d.page, line: d.line })),
      truncated,
      dangling_disposition_label: dangling
    }
  };
}

function buildRecords(pages, convention) {
  const records = [];
  let index = 0;
  let current = null;
  for (const page of pages) {
    for (const line of page.lines) {
      if (/^\s*(REPORT DATE|DATE OF REPORT|PREPARED(?: ON)?|REQUEST DATE|AS OF)\s*:/i.test(line.text)) continue;
      const facts = lineFacts(line, convention);
      const hasDate = facts.dates.some((d) => d.normalized);
      const up = String(line.text || '').toUpperCase();
      /* A payment-history grid or a responsibility label is a value line even though it carries no date or
         dollar amount: it is still a report-supported fact worth reading (and never a missed-payment guess). */
      const hasPaymentHistory = PAYMENT_HISTORY_HEADER_RE.test(up);
      const hasResponsibility = responsibilityOf(line.text) !== null;
      /* OWNER-GAP-FINDING-002-RESOURCE-001: a public-record header and an explicit historical-verification line
         are value lines too — the header starts the record, the verification line is a record-owned fact. */
      const hasPublicRecordHeader = PUBLIC_RECORD_HEADER_RE.test(up) && recordKind(line.text) === 'GENERAL_PUBLIC_RECORD';
      /* A line that starts or continues the historical-verification statement is a value line even when the
         statement is word-wrapped across OCR lines, so the accumulator sees every part of it. */
      const hasHistoricalVerification = HISTORICAL_VERIFICATION_LABEL.test(up) || UNVERIFIED_PHRASE.test(up);
      /* GAP-INGEST-002: a printed account status (e.g. "Status: Charged Off") or a masked account identifier
         (e.g. "Account Number ****1234") is a report-supported fact worth reading even when the continuation
         line carries no date or dollar amount, so it reaches its owning record. */
      const hasStatus = statusWordOf(line.text) !== null;
      const hasIdentifier = maskedIdentifierToken(line.text) !== null;
      /* OWNER-CANDIDATE-002/003: a Judgment or criminal-charge context line, and a judgment/criminal content
         field line (or a truncation marker) while a public record is open, are value lines even without a date or
         amount — they carry the public record's own content and completeness evidence. */
      const hasPublicRecordContent = /JUDGMENT|JUDGEMENT|CIVIL SUIT|CIVIL ACTION/i.test(up)
        || CRIMINAL_CHARGE_IDENTITY_RE.test(up)
        || (current && current.kind === 'GENERAL_PUBLIC_RECORD'
          && (JUDGMENT_CONTENT_LINE_RE.test(up) || CRIMINAL_CONTENT_LINE_RE.test(up)
            || JUDGMENT_TRUNCATION_MARKERS.test(up)));
      const hasValue = hasDate || facts.amounts.length > 0 || hasPaymentHistory || hasResponsibility
        || hasPublicRecordHeader || hasHistoricalVerification || Boolean(current && current._hvAccumulating)
        || hasStatus || hasIdentifier || hasPublicRecordContent;
      if (!hasValue) continue;
      const trusted = line.trusted !== false;
      const kind = recordKind(line.text);
      const isNonAccount = kind !== 'GENERAL_ACCOUNT';
      const isPublicRecordHeader = hasPublicRecordHeader;
      const isAccountIntro = kind === 'GENERAL_ACCOUNT' && ACCOUNT_INTRO_RE.test(up) && !ACCOUNT_NUMBER_LABEL_RE.test(up);

      /* OWNER-CANDIDATE-002: a judgment-content line (Judgment context, creditor/amount/assignee, case/docket,
         date of entry) continues the OPEN public record — it is a field of the judgment, not a new account and
         not a standalone record. Captured with its own line so presence/completeness is field-value evidence. */
      if (current && current.kind === 'GENERAL_PUBLIC_RECORD' && !isPublicRecordHeader
        && (JUDGMENT_CONTENT_LINE_RE.test(up) || CRIMINAL_CONTENT_LINE_RE.test(up)
          || JUDGMENT_TRUNCATION_MARKERS.test(up))) {
        current._text = (current._text || '') + ' ' + String(line.text || '');
        current._judgmentLines = current._judgmentLines || [];
        current._judgmentLines.push({ text: String(line.text || ''), trusted, page: line.page, line: line.line });
        if (trusted === false) current._allTrusted = false;
        const fields = collectLineFields(line, facts, current.kind, convention, trusted, current.public_record_identity || null);
        for (const key of Object.keys(fields.printed)) current.printed[uniqueKey(current.printed, key)] = fields.printed[key];
        for (const key of Object.keys(fields.canonical.facts)) {
          if (current.facts[key] === undefined) current.facts[key] = fields.canonical.facts[key];
        }
        if (fields.canonical.kind) { current.kind = fields.canonical.kind; current.kind_label = kindLabel(fields.canonical.kind); }
        if (fields.resolved > 0) { current.status = 'RESOLVED'; current.reason = null; }
        continue;
      }

      if (isNonAccount) {
        const fields = collectLineFields(line, facts, kind, convention, trusted);
        const finalKind = fields.canonical.kind || kind;
        const record = {
          record_index: index += 1,
          kind: finalKind,
          kind_label: kindLabel(finalKind),
          status: fields.resolved > 0 ? 'RESOLVED' : 'EXTRACTION_UNRESOLVED',
          reason: fields.resolved > 0 ? null : 'NO_RESOLVED_DATE_OR_AMOUNT_ON_THIS_ENTRY',
          location: lineLocation(line),
          printed: fields.printed,
          facts: fields.canonical.facts,
          _text: String(line.text || ''),
          _allTrusted: trusted,
          _judgmentLines: [{ text: String(line.text || ''), trusted, page: line.page, line: line.line }]
        };
        const identity = PUBLIC_RECORD_IDENTITY_RE.exec(line.text);
        if (identity) record.public_record_identity = identity[1];
        records.push(record);
        /* A public-record header opens a record its continuation lines (Order for Relief, Historical verification)
           join; any other non-account line is a standalone record. OWNER-CANDIDATE-002: a judgment public-record
           line (without a header) also opens a record its creditor/amount/assignee continuation lines join. */
        current = (isPublicRecordHeader || (finalKind === 'GENERAL_PUBLIC_RECORD' && /JUDGMENT|JUDGEMENT|CIVIL SUIT|CIVIL ACTION/i.test(up))) ? record : null;
        continue;
      }

      if (isAccountIntro) {
        const fields = collectLineFields(line, facts, kind, convention, trusted);
        const finalKind = fields.canonical.kind || kind;
        const record = {
          record_index: index += 1,
          kind: finalKind,
          kind_label: kindLabel(finalKind),
          status: fields.resolved > 0 ? 'RESOLVED' : 'EXTRACTION_UNRESOLVED',
          reason: fields.resolved > 0 ? null : 'NO_RESOLVED_DATE_OR_AMOUNT_ON_THIS_ENTRY',
          location: lineLocation(line),
          printed: fields.printed,
          facts: fields.canonical.facts
        };
        records.push(record);
        current = record;
        continue;
      }

      /* A field line (no account/creditor boundary, no other record kind). It is a continuation ONLY when an
         account precedes it; otherwise a date-only field line (a report header, an ambiguous "Opened") is not
         invented into a record. */
      if (current) {
        current._text = (current._text || '') + ' ' + String(line.text || '');
        if (trusted === false) current._allTrusted = false;
        const fields = collectLineFields(line, facts, current.kind, convention, trusted, current.public_record_identity || null);
        for (const key of Object.keys(fields.printed)) {
          current.printed[uniqueKey(current.printed, key)] = fields.printed[key];
        }
        /* OWNER-EVIDENCE-001 / GAP-INGEST-006: a second, different DATE for the same field on the same record is a
           same-record contradiction and withholds the date — the later line never silently overwrites it, whatever
           its precision. Once contradicted, the field stays withheld: a later reading never restores a resolved
           fact. The order-for-relief date keeps its specific printed contradiction marker. */
        for (const key of Object.keys(fields.canonical.facts)) {
          const existing = current.facts[key];
          const incoming = fields.canonical.facts[key];
          if (/Date$/.test(key)) {
            const contradicted = Array.isArray(current._contradictedDateFields) && current._contradictedDateFields.includes(key);
            if (contradicted) continue;
            if (existing !== undefined && existing !== incoming) {
              delete current.facts[key];
              current._contradictedDateFields = current._contradictedDateFields || [];
              current._contradictedDateFields.push(key);
              if (key === 'publicRecord.bankruptcyOrderForReliefDate') {
                current.printed['bankruptcy_order_for_relief_date'] = {
                  label: 'bankruptcy_order_for_relief_date', state: 'UNRESOLVED', status: 'UNRESOLVED',
                  raw: [existing, incoming].join(' | '), normalized: null,
                  reason: 'CONTRADICTORY_SAME_RECORD_READINGS', location: lineLocation(line), kind: 'date', precision: null
                };
              }
              continue;
            }
          }
          current.facts[key] = incoming;
        }
        if (fields.canonical.kind) {
          current.kind = fields.canonical.kind;
          current.kind_label = kindLabel(fields.canonical.kind);
        }
        /* OWNER-GAP-FINDING-002-RESOURCE-001: a wrapped historical-verification statement spans several OCR lines.
           Accumulate it across the public record's continuation lines and extract the fact once the unverified
           phrase is read, with the identity association. */
        if (current.kind === 'GENERAL_PUBLIC_RECORD' && trusted !== false && !current.facts['publicRecord.bankruptcyOrderForReliefDate.historicalVerification']) {
          const upLine = String(line.text || '').toUpperCase();
          if (HISTORICAL_VERIFICATION_LABEL.test(upLine) && !current._hvAccumulating) {
            current._hvAccumulating = true;
            current._hvText = String(line.text || '');
          } else if (current._hvAccumulating) {
            current._hvText = (current._hvText || '') + ' ' + String(line.text || '');
          }
          if (current._hvAccumulating && UNVERIFIED_PHRASE.test(String(current._hvText || '').toUpperCase())) {
            const hvForMatch = /HISTORICAL\s+VERIFICATION\s+FOR\s+([A-Z0-9][A-Z0-9-]*)/i.exec(current._hvText || '');
            const hvReferenced = hvForMatch ? hvForMatch[1].toUpperCase() : null;
            const hvAssociates = !hvReferenced || !current.public_record_identity || hvReferenced === String(current.public_record_identity).toUpperCase();
            if (hvAssociates) {
              current.facts['publicRecord.bankruptcyOrderForReliefDate.historicalVerification'] = 'UNVERIFIED';
              current.printed['historical_verification'] = {
                label: 'historical_verification', state: 'VALUE', status: 'RESOLVED',
                raw: String(current._hvText).trim(), normalized: 'UNVERIFIED', reason: null,
                location: lineLocation(line), kind: 'text', precision: null,
                policy: 'OWNER-EVIDENCE-001', policy_version: '1.0', source: 'EXPLICIT_RECORD_OWNED_HISTORICAL_VERIFICATION_STATEMENT'
              };
            }
            current._hvAccumulating = false;
          }
        }
        if (fields.resolved > 0) {
          current.status = 'RESOLVED';
          current.reason = null;
        }
        continue;
      }

      /* GAP-INGEST-002: a field line with no account in THIS file is retained as a continuation candidate so a
         cross-file pass can attach it to the open account of the preceding page. A report-header date (Report
         Date / Prepared / Request) is not an account field and is never invented. */
      if (facts.amounts.length > 0 || (hasDate && !isReportHeaderLine(line.text))) {
        const fields = collectLineFields(line, facts, kind, convention, trusted);
        const isCandidate = facts.amounts.length === 0;
        const record = {
          record_index: index += 1,
          kind: fields.canonical.kind || kind,
          kind_label: kindLabel(fields.canonical.kind || kind),
          status: fields.resolved > 0 ? 'RESOLVED' : 'EXTRACTION_UNRESOLVED',
          reason: fields.resolved > 0 ? null : 'NO_RESOLVED_DATE_OR_AMOUNT_ON_THIS_ENTRY',
          location: lineLocation(line),
          printed: fields.printed,
          facts: fields.canonical.facts,
          continuation_candidate: isCandidate ? true : undefined
        };
        records.push(record);
        current = record;
      }
    }
  }
  /* OWNER-CANDIDATE-002/003: assess judgment-content and criminal-charge presence at the RECORD level. A judgment
     or criminal charge is POSITIVELY identified by its own printed context (never inferred from a date).
     Completeness is POSITIVE: trusted lines, a recognized identity, no truncation marker and no dangling field
     label (absence of a continuation marker does NOT prove completeness). */
  for (const record of records) {
    if (record.kind !== 'GENERAL_PUBLIC_RECORD') continue;
    const text = String(record._text || '');
    const upText = text.toUpperCase();
    const isJudgment = /JUDGMENT|JUDGEMENT|CIVIL SUIT|CIVIL ACTION/i.test(upText);
    const isCriminalCharge = !isJudgment && CRIMINAL_CHARGE_IDENTITY_RE.test(upText);
    if (!isJudgment && !isCriminalCharge) continue;
    const lines = record._judgmentLines || [];
    const truncation = lines.some((l) => JUDGMENT_TRUNCATION_MARKERS.test(String(l.text || '')));

    if (isJudgment) {
      const dangling = (() => {
        if (!lines.length) return true;
        const last = String(lines[lines.length - 1].text || '');
        return JUDGMENT_CREDITOR_LABEL_ONLY_RE.test(last) || JUDGMENT_AMOUNT_LABEL_ONLY_RE.test(last);
      })();
      const positivelyBounded = !dangling && !truncation;
      const evidence = judgmentContentEvidence(lines, record._allTrusted, positivelyBounded);
      record.facts['judgment.recordIdentified'] = true;
      /* BATCH-12: `status` answers "could this record's own content be read at all?". For a judgment the content
         is its own stated fields, so the record is RESOLVED when the entry is complete and each required content
         state is resolved — either printed or established absent. It is NOT left unresolved merely because the
         entry prints no date or amount: a judgment whose amount is genuinely absent is exactly the entry a
         content rule must be able to assess. */
      if (evidence.entry_complete === true
        && (evidence.creditor_name === 'PRESENT' || evidence.creditor_name === 'VERIFIED_ABSENT')
        && (evidence.amount === 'PRESENT' || evidence.amount === 'VERIFIED_ABSENT')) {
        record.status = 'RESOLVED';
        record.reason = null;
      }
      record.facts['judgment.creditorNameState'] = evidence.creditor_name;
      record.facts['judgment.creditorAddressState'] = evidence.creditor_address;
      record.facts['judgment.amountState'] = evidence.amount;
      record.facts['judgment.assigneeState'] = evidence.assignee;
      record.facts['judgment.entryComplete'] = evidence.entry_complete;
      record.printed['judgment_content'] = {
        label: 'judgment_content', state: 'VALUE', status: 'RESOLVED',
        raw: text.trim(), normalized: null, reason: null,
        location: record.location, kind: 'text', precision: null,
        creditor_name: evidence.creditor_name, creditor_address: evidence.creditor_address, amount: evidence.amount,
        assignee: evidence.assignee, entry_complete: evidence.entry_complete,
        evidence: evidence.evidence
      };
      continue;
    }

    if (isCriminalCharge) {
      const evidence = criminalChargeEvidence(lines, record._allTrusted, !truncation);
      record.facts['criminalCharge.recordIdentified'] = true;
      record.facts['criminalCharge.chargeState'] = evidence.charge_present;
      record.facts['criminalCharge.dismissedDispositionState'] = evidence.dismissed_disposition;
      record.facts['criminalCharge.entryComplete'] = evidence.entry_complete;
      if (evidence.charge_present === 'PRESENT') {
        record.status = 'RESOLVED';
        record.reason = null;
      }
      record.printed['criminal_charge_content'] = {
        label: 'criminal_charge_content', state: 'VALUE', status: 'RESOLVED',
        raw: text.trim(), normalized: null, reason: null,
        location: record.location, kind: 'text', precision: null,
        charge_state: evidence.charge_present, dismissed_disposition: evidence.dismissed_disposition,
        entry_complete: evidence.entry_complete, evidence: evidence.evidence
      };
    }
  }
  return records;
}

function findReferenceDate(pages, convention) {
  const candidates = [];
  for (const page of pages) {
    for (const line of page.lines) {
      /* GAP-INGEST-003: a report date read from a low-confidence OCR line is not a resolved report date. */
      if (line.trusted === false) continue;
      if (classifyLineContext(line.text) === 'boilerplate') continue;
      const up = line.text.toUpperCase();
      if (!REFERENCE_DATE_HINTS.some((h) => up.includes(h))) continue;
      const strong = REPORT_HEADER_DATE_HINTS.some((h) => up.includes(h));
      const facts = lineFacts(line, convention);
      for (const d of facts.dates) {
        if (d.normalized) candidates.push({ d, location: lineLocation(line), strong });
      }
    }
  }
  if (!candidates.length) {
    return { raw: null, normalized: null, normalized_value: null, precision: null, status: 'EXTRACTION_UNRESOLVED', reason: 'NO_REPORT_DATE_FOUND', location: null };
  }
  /* GAP-INGEST-007: prefer a report-issued/prepared date over an account "as of" / inquiry "request date",
     and an unambiguous, full-precision candidate over an ambiguous or month-only one. */
  const score = (c) => ((c.strong ? 3 : 1) + (c.d.precision === 'DAY' ? 2 : 0) + (c.d.ambiguous ? 0 : 1));
  candidates.sort((a, b) => score(b) - score(a));

  /* GAP-INGEST-007: two genuine report headers that materially conflict (different dates) cannot be resolved by
     a label-priority score alone; withhold the reference date. */
  const strongDates = [...new Set(candidates.filter((c) => c.strong && c.d.normalized).map((c) => c.d.normalized))];
  if (strongDates.length > 1) {
    return { raw: null, normalized: null, normalized_value: null, precision: null, status: 'EXTRACTION_UNRESOLVED', reason: 'CONFLICTING_REPORT_REFERENCE_DATES', location: null, conflicting_dates: strongDates };
  }

  const best = candidates[0];
  const d = best.d;
  return { raw: d.raw, normalized: d.normalized, normalized_value: d.normalized, precision: d.precision, status: 'RESOLVED', reason: null, location: best.location, ambiguous: d.ambiguous === true || undefined, alternative: d.alternative || null, hint_basis: best.strong ? 'REPORT_HEADER' : 'AMBIGUOUS_DATE_HINT' };
}

function summaryFor(records, status, reason) {
  const byKind = {};
  for (const r of records) byKind[r.kind] = (byKind[r.kind] || 0) + 1;
  return { status, reason, records_read: records.length, resolved_fact_count: records.filter((r) => r.status === 'RESOLVED').length, by_kind: byKind };
}

function refused(result, outcome, reason) {
  return Object.assign(result, {
    admitted: false, outcome, reason,
    reference_date: null, records: [],
    summary: summaryFor([], FACT_STATUS.UNSUPPORTED_PRESENTATION, `DOCUMENT_${outcome}:${reason}`),
    evidence_readings: { sections_printed: [], records_found: 0, factual_view: null }
  });
}

function extract(model, opts) {
  const o = opts || {};
  const det = detect(model);
  const base = { admitted: false, outcome: det.outcome, reason: det.reason, bureau: det.bureau, markers: det.markers };

  if (det.outcome === 'UNREADABLE') return refused(base, 'UNREADABLE', det.reason);
  if (det.outcome === 'UNRELATED') return refused(base, 'UNRELATED', det.reason);

  let pages;
  let bureau = det.bureau;
  let markers = det.markers;
  if (det.needs_ocr) {
    const reading = model.is_image ? ocr.readImage(model.path) : ocr.readTextLayer(model.path);
    if (!reading.available) return refused(base, 'UNREADABLE', reading.refusal_reason || 'OCR_UNAVAILABLE');
    pages = (reading.pages || []).map((op) => ({ page: op.page, source: 'LOCAL_OCR', lines: ocrLineObjects(op), words: op.word_evidence || [] }));
    const text = pages.map((p) => p.lines.map((l) => l.text).join('\n')).join('\n');
    bureau = bureauOf(text);
    markers = contentMarkers(text);
    if (!bureau) return refused(base, 'UNRELATED', 'NO_BUREAU_IDENTITY_FOUND');
    if (!markers.length) return refused(base, 'UNRELATED', 'BUREAU_IDENTITY_BUT_NO_CREDIT_REPORT_CONTENT');
  } else {
    pages = collectPages(model);
  }

  /* BLOCKER-FDT-001: the pre-recovery page snapshot (native text only), so the recovery audit can name exactly
     which facts the local OCR pass added. Originals are preserved; recovery never substitutes a value. */
  const nativeBefore = (model && model.pages ? model.pages : []).filter((p) => p.has_native_text).map((p) => ({ page: p.page, lines: nativeLineObjects(p) }));

  /* GAP-INGEST-001: within one document, a repeated page (identical full text) is skipped with an audit, and a
     likely missing page is flagged ONLY where the document prints its own page numbering. */
  const dedup = dedupePages(pages);
  pages = dedup.pages;
  const missingPages = detectMissingPages(pages);
  /* GAP-INGEST-001: retain each page's full-text+geometry signature so the multi-file assembly can recognise a
     non-byte-identical equivalent page across separately-uploaded images and flag it as a SUSPECTED duplicate
     rather than discard it. */
  const page_signatures = (pages || []).map((p) => pageSignature(p)).filter((s) => s);

  /* GAP-INGEST-005: the numeric day/month order is never propagated from one field to another. An unambiguous
     numeric date (day or month above 12) resolves independently; an ambiguous date stays unresolved with both
     interpretations preserved. The consumer's selected jurisdiction is never used, and one field's format never
     supplies another field's convention. */
  const reference_date = findReferenceDate(pages, null);
  const segments = reportSegments(pages);
  if (segments.length === 1 && !segments[0].ambiguous && !segments[0].bureau) segments[0].bureau = bureau;
  for (const segment of segments) if (segment.ambiguous || (segments.length > 1 && !segment.bureau)) {
    segment.reference_date = { status: 'EXTRACTION_UNRESOLVED', normalized: null, normalized_value: null, reason: 'AMBIGUOUS_REPORT_SEGMENT', raw: null };
  }
  const records = segments.flatMap((segment, index) => buildRecords(segment.pages, null).map((record) =>
    Object.assign(record, { bureau: segment.bureau, report_segment_id: 'segment-' + (index + 1), report_reference_date: segment.reference_date })));
  records.forEach((record, index) => { record.record_index = index + 1; });
  /* OWNER-ACCEPT-009 item 4: report-internal identity fields (name/address/alias/co-applicant) read with their
     roles from every page, so an identity discrepancy can be surfaced from the report itself. */
  const identity_groups = [];
  for (const page of pages) {
    for (const line of (page.lines || [])) {
      const idf = identityFacts(line.text);
      if (idf) identity_groups.push(Object.assign({}, idf, { location: lineLocation(line) }));
    }
  }
  /* OWNER-ACCEPT-009 (geometry): assemble payment-history grids from positioned words, then attach each grid's
     cells and legend to the record its account line identifies. Ambiguous alignment is left unresolved. */
  const grids = paymentHistoryGrid.assembleGrids(pages);
  for (const grid of grids) {
    const identity = grid.account ? accountIdentityToken(grid.account) : null;
    /* OWNER-ACCEPT-009 item 1: a grid is attached to a record only by a COMPATIBLE account/section boundary
       (same page, same printed account identity), never merely because a record is nearby. When more than one
       record matches, the association is left ambiguous and the grid is not silently attached. */
    const candidates = identity
      ? records.filter((r) => (r.facts || {})['account.reported_identity'] === identity)
      : records.filter((r) => r.location && r.location.page === grid.page);
    const samePage = candidates.filter((r) => r.location && r.location.page === grid.page);
    const target = samePage.length === 1 ? samePage[0] : (candidates.length === 1 ? candidates[0] : null);
    if (!target) continue;
    target.facts['account.paymentHistoryLegend'] = grid.legend;
    target.facts['account.paymentHistoryCells'] = grid.cells;
    target.facts['account.paymentHistoryGrid'] = { page: grid.page, source: grid.source, heading: grid.heading, layout: grid.layout, legend_transformations: grid.legend_transformations, continued_from_page: grid.continued_from_page || null, location: grid.location };
  }
  /* GAP-INGEST-009: attribute each record to the bureau section that printed it. */
  const sectionMap = bureauSectionMap(pages);
  for (const r of records) {
    const loc = r.location || {};
    const perLine = sectionMap.get(loc.page);
    const sectionBureau = perLine ? (perLine.get(loc.line) || null) : null;
    if (!r.report_segment_id && sectionBureau) r.bureau = sectionBureau;
  }
  const bureaus = [...new Set(records.map((r) => r.bureau).filter(Boolean))];
  const content_markers = detectStatutoryContentMarkers(pages);
  /* BLOCKER-FDT-001: name what is unread/partial/unresolved/contradictory, which checks are affected, and the
     bounded recovery audit. These ride the extraction so the result and download can explain the limitation. */
  const reading_state = fdt.detectIncompleteReading(model, pages, records);
  const reading_limitations = fdt.buildReadingLimitations(reading_state);
  const recovery_audit = fdt.recoveryAudit(nativeBefore, pages);
  const status = records.some((r) => r.status === 'RESOLVED') ? FACT_STATUS.RESOLVED : (records.length ? FACT_STATUS.EXTRACTION_UNRESOLVED : FACT_STATUS.ABSENT_FROM_REPORT);
  const reportedFactPolicy = loadPolicy();
  const factual_view = {
    view_id: GENERAL_PRESENTATION_ID,
    presentation_id: GENERAL_PRESENTATION_ID,
    bureau,
    records,
    reference_date,
    summary_counts: [],
    identity_groups,
    policy_statements: [{ policy_id: reportedFactPolicy.policy.policy_id, version: reportedFactPolicy.policy.version }],
    report_text_retained: false
  };
  return {
    admitted: true,
    outcome: 'GENERAL',
    reason: det.reason,
    bureau,
    bureaus,
    report_segments: segments.map((s, i) => ({ segment_id: 'segment-' + (i + 1), bureau: s.bureau, reference_date: s.reference_date })),
    markers,
    convention: null,
    convention_basis: null,
    reference_date,
    records,
    content_markers,
    skipped_pages: dedup.skipped,
    missing_pages: missingPages,
    page_signatures,
    reading_state,
    reading_limitations,
    recovery_audit,
    identity_groups,
    summary: summaryFor(records, status, status === FACT_STATUS.RESOLVED ? null : 'NO_RESOLVED_RECORD_FACT_COULD_BE_READ'),
    evidence_readings: {
      sections_printed: markers.slice().sort(),
      records_found: records.length,
      skipped_pages: dedup.skipped,
      missing_pages: missingPages,
      factual_view
    }
  };
}

module.exports = {
  GENERAL_PRESENTATION_ID,
  GENERAL_ADMISSION_PATH,
  BUREAUS,
  CONTENT_MARKERS,
  REFERENCE_DATE_HINTS,
  UNRELATED_MESSAGE,
  UNREADABLE_MESSAGE,
  normalizePrintedDate,
  detectConvention,
  bureauOf,
  bureauSectionOf,
  contentMarkers,
  detectStatutoryContentMarkers,
  classifyLineContext,
  nativeText,
  detect,
  extract,
  buildRecords,
  collectPages,
  dedupePages,
  detectMissingPages,
  mergeRecoveredLines,
  accountIdentityToken,
  maskedIdentifierToken,
  lineLocation
};


