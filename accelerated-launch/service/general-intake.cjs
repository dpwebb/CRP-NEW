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
const { printedAmount } = require('./report-amount.cjs');


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

const PRINTED_MONTH = '(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)';
const DATE_TOKEN = new RegExp('(\\d{4}-\\d{1,2}-\\d{1,2}|\\d{4}\\/\\d{1,2}\\/\\d{1,2}|\\d{1,2}\\/\\d{1,2}\\/\\d{4}|\\d{1,2}\\/\\d{4}|\\d{4}\\/\\d{1,2}|'
  + PRINTED_MONTH + '[.\\s]+\\d{1,2}(?:st|nd|rd|th)?,?\\s+\\d{4}|\\d{1,2}(?:st|nd|rd|th)?[.\\s]+'
  + PRINTED_MONTH + '[.,\\s]+\\d{4}|' + PRINTED_MONTH + '[.,\\s]+\\d{4})', 'i');
const AMOUNT_TOKEN = /\(?[+\-−–—]?\s*[$£€]\s*[+\-−–—]?\s*[\d,]+(?:\.\d{1,2})?\)?/g;

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
  const rows = [];
  const decode = (text) => String(text).replace(/&(?:amp|lt|gt|quot|apos);|&#(?:x[0-9a-f]+|\d+);/gi, (entity) => {
    const named = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'" };
    if (named[entity.toLowerCase()]) return named[entity.toLowerCase()];
    const value = entity.slice(2, -1);
    return String.fromCodePoint(value[0].toLowerCase() === 'x' ? parseInt(value.slice(1), 16) : Number(value));
  });
  for (const word of (p.word_boxes || []).map((word) => ({ ...word, text: decode(word.text) }))
    .sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0)) {
    let row = rows.find((r) => Math.abs(r.y0 - word.y0) < 2);
    if (!row) { row = { y0: word.y0, words: [] }; rows.push(row); }
    row.words.push(word);
  }
  const normalize = (value) => String(value).replace(/\s+/g, ' ').trim();
  const counts = new Map(), seen = new Map();
  for (const text of p.lines || []) counts.set(normalize(text), (counts.get(normalize(text)) || 0) + 1);
  return (p.lines || []).map((text, i) => {
    const matches = rows.filter((row) => normalize(row.words.sort((a, b) => a.x0 - b.x0).map((w) => w.text).join(' ')) === normalize(text));
    const occurrence = seen.get(normalize(text)) || 0; seen.set(normalize(text), occurrence + 1);
    const matched = matches.length === counts.get(normalize(text)) ? matches[occurrence] : null;
    const words = matched ? matched.words : [];
    let offset = 0;
    const evidence = words.map((word) => {
      const start = String(text).indexOf(word.text, offset); offset = start + word.text.length;
      return { ...word, start, end: offset };
    });
    return { text, page: p.page, line: i + 1, source: 'NATIVE_TEXT', confidence: null,
      trusted: !normalize(text) || !(p.word_boxes || []).length || Boolean(matched) && words.every((word) => word.trusted !== false), words: evidence,
      measured_words: (p.word_boxes || []).length > 0,
      bbox: words.length ? { x0: Math.min(...words.map((w) => w.x0)), y0: Math.min(...words.map((w) => w.y0)),
        x1: Math.max(...words.map((w) => w.x1)), y1: Math.max(...words.map((w) => w.y1)) } : null };
  });
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
    bbox: line.bbox || null,
    ...(line.caption_location ? { caption_location: line.caption_location } : {})
  };
}

const PAIRED_CAPTIONS = Object.freeze({
  'ACCOUNT NAME': 'identity', CREDITOR: 'identity', LENDER: 'identity', 'CREDIT PROVIDER': 'identity',
  'ACCOUNT NUMBER': 'identifier', 'ACCT NUMBER': 'identifier', 'ACCT NO': 'identifier',
  'ACCOUNT NUMBER / SUFFIX': 'identifier',
  STATUS: 'status', 'ACCOUNT STATUS': 'status', RESPONSIBILITY: 'role', OWNERSHIP: 'role',
  'ACCOUNT TYPE': 'type', 'TYPE OF ACCOUNT': 'type',
  BALANCE: 'money', 'CURRENT BALANCE': 'money', 'RECENT BALANCE': 'money', 'LATEST BALANCE': 'money',
  'PAST DUE': 'money', 'PAST DUE AMOUNT': 'money', 'AMOUNT PAST DUE': 'money',
  'OVERDUE AMOUNT': 'money', 'CREDIT LIMIT': 'money', 'CREDIT LINE': 'money',
  'MONTHLY PAYMENT': 'money', 'PAYMENT AMOUNT': 'money', 'SCHEDULED PAYMENT': 'money',
  OPENED: 'date', 'DATE OPENED': 'date', 'OPENED DATE': 'date',
  CLOSED: 'date', 'CLOSED DATE': 'date', 'DATE CLOSED': 'date',
  'ACCOUNT START DATE': 'date', 'ACCOUNT END DATE': 'date',
  'FIRST DELINQUENCY DATE': 'date', 'DATE OF FIRST DELINQUENCY': 'date', 'FIRST DATE OF DELINQUENCY': 'date',
  'LAST PAYMENT DATE': 'date', 'DATE OF LAST PAYMENT': 'date', 'LAST PAYMENT': 'date',
  'LAST PAYMENT MADE': 'date', 'FIRST REPORTED': 'date'
});
const captionName = (text) => String(text || '').trim().replace(/[:\-]\s*$/, '').replace(/\s+/g, ' ').toUpperCase();

/* Physical caption cards print several labels on one row and their values on the next. Whole-line native
   matching can fail when a diagonal watermark crosses that row. Only measured words in the caption's own
   column supply its value; unrelated words never supply trust, dates or an account boundary. The ignored
   captions still bound their columns, so a reporting date, payment count or party-end date cannot spill over. */
const COLUMN_BOUNDARY_CAPTIONS = Object.freeze({ ...PAIRED_CAPTIONS,
  'LAST ACTIVITY': 'ignored', 'STATUS DATE': 'ignored', 'PAYMENT RATING': 'ignored', 'HIGH CREDIT': 'ignored',
  'ACCOUNT HOLDER START DATE': 'ignored', 'ACCOUNT HOLDER END DATE': 'ignored', 'PAYMENT START DATE': 'ignored',
  'DATE ACCOUNT LAST UPDATED': 'ignored', 'DATE OF LAST UPDATE': 'ignored', DATELASTUPDATE: 'ignored',
  'NO OF OVERDUE PAYMENTS': 'ignored', 'NEXT PAYMENT AMOUNT': 'ignored' });
function columnCaptionLines(page) {
  if (page.source !== 'NATIVE_TEXT' || !(page.words || []).length) return page.lines;
  const normalize = (s) => String(s).replace(/\s+/g, ' ').trim();
  const rows = [];
  const heights = page.words.map((w) => w.y1 - w.y0).filter((n) => n > 0).sort((a, b) => a - b);
  const ordinaryHeight = heights[Math.floor(heights.length / 2)];
  for (const rawWord of page.words.slice().sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0)) {
    const word = { ...rawWord, text: String(rawWord.text).replace(/&(?:amp|lt|gt|quot|apos);/gi,
      (s) => ({ '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'" })[s.toLowerCase()]) };
    if (![word.x0, word.x1, word.y0, word.y1].every(Number.isFinite)) continue;
    // Oversized diagonal decoration has no common account-row baseline. It never changes decisive word trust.
    if (word.y1 - word.y0 > ordinaryHeight * 1.8) continue;
    let row = rows.find((r) => Math.abs(r.y - word.y0) < 2);
    if (!row) rows.push(row = { y: word.y0, words: [] });
    row.words.push(word);
  }
  const box = (words) => words.length ? { x0: Math.min(...words.map((w) => w.x0)), y0: Math.min(...words.map((w) => w.y0)),
    x1: Math.max(...words.map((w) => w.x1)), y1: Math.max(...words.map((w) => w.y1)) } : null;
  const chunks = (row) => {
    const result = [];
    for (const word of row.words.slice().sort((a, b) => a.x0 - b.x0)) {
      let chunk = result[result.length - 1];
      if (!chunk || word.x0 - chunk.words[chunk.words.length - 1].x1 > 12) result.push(chunk = { words: [] });
      chunk.words.push(word);
    }
    return result.map((c) => ({ ...c, text: normalize(c.words.map((w) => w.text).join(' ')), bbox: box(c.words) }));
  };
  rows.forEach((row) => { row.chunks = chunks(row); });
  const captionRows = rows.filter((row) => row.chunks.length >= 2 && row.chunks.length <= 6
    && row.chunks.filter((c) => COLUMN_BOUNDARY_CAPTIONS[captionName(c.text)]).length >= 2
    && row.chunks.every((c, i) => !i || c.bbox.x0 - row.chunks[i - 1].bbox.x1 > 12));
  if (!captionRows.length) return page.lines;
  const replacements = new Map(), removed = new Set(), assigned = new Map();
  // Text ties are resolved by the physical occurrence, just as nativeLineObjects resolves repeated rows.
  let nativeFloor = 0;
  const contains = (text, token) => new RegExp('(?:^|\\s)' + String(token).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?=$|\\s)').test(normalize(text));
  for (const row of rows) {
    const texts = row.chunks.map((c) => c.text).filter(Boolean);
    const claimed = [...assigned.values()].flatMap((l) => l._column_originals || [l]);
    const candidates = page.lines.filter((line, i) => i >= nativeFloor && !claimed.includes(line)
      && (line.bbox ? Math.abs(line.bbox.y0 - row.y) < 2
        : texts.length >= 2 && texts.every((s) => contains(line.text, s))
          || texts.some((s) => s.length >= 4 && contains(line.text, s))));
    if (candidates.length) {
      const full = candidates.find((line) => (line.bbox || texts.every((s) => contains(line.text, s)))
        && line.line - candidates[0].line <= 16);
      const nearby = candidates.filter((line) => line.line - candidates[0].line <= 16);
      const selected = full ? [full] : [...new Set(texts.filter((s) => s.length >= 4)
        .map((s) => nearby.find((line) => contains(line.text, s))).filter(Boolean))];
      if (selected.length) {
        selected.sort((a, b) => a.line - b.line); selected[0]._column_originals = selected;
        assigned.set(row, selected[0]); nativeFloor = Math.max(...selected.map((l) => page.lines.indexOf(l))) + 1;
      }
    }
  }
  let fallback = Math.max(0, ...page.lines.map((l) => l.line)) + 1;
  function reading(words, row, text, caption) {
    let offset = caption ? caption.text.length + 2 : 0;
    const evidence = words.map((w) => { const start = offset; offset += String(w.text).length + 1;
      return { ...w, start, end: offset - 1 }; });
    const original = assigned.get(row);
    return { text, page: page.page, line: original ? original.line : fallback++, source: 'NATIVE_TEXT',
      confidence: null, trusted: words.every((w) => w.trusted !== false) && (!caption || caption.words.every((w) => w.trusted !== false)),
      measured_words: true, words: evidence, bbox: box(words),
      ...(caption ? { caption_label: caption.text, caption_location: { page: page.page,
        line: assigned.get(caption.row)?.line || fallback++, source: 'NATIVE_TEXT', confidence: null, min_confidence: null,
        trusted: caption.words.every((w) => w.trusted !== false), bbox: caption.bbox },
        column_field: COLUMN_BOUNDARY_CAPTIONS[captionName(caption.text)], column_raw: words.map((w) => w.text).join(' ') } : {}) };
  }
  function replaceRow(row, lines) {
    const original = assigned.get(row);
    if (original) { (original._column_originals || [original]).forEach((l) => removed.add(l));
      replacements.set(original, (replacements.get(original) || []).concat(lines)); }
    else { row.added = (row.added || []).concat(lines); }
  }
  let active = false, previousCaption = null;
  for (const row of captionRows) {
    const startsCard = row.chunks.some((c) => COLUMN_BOUNDARY_CAPTIONS[captionName(c.text)] === 'identifier')
      && row.chunks.some((c) => ['type', 'role'].includes(COLUMN_BOUNDARY_CAPTIONS[captionName(c.text)]));
    if (startsCard) {
      active = false;
      const preceding = rows.filter((r) => r.y < row.y && row.y - r.y <= 30 && !captionRows.includes(r)).at(-1);
      if (preceding && preceding.chunks.length === 1 && explicitAccountIdentity(preceding.chunks[0].text)) {
        const name = preceding.chunks[0], identity = explicitAccountIdentity(name.text);
        const heading = reading(name.words, preceding, name.text);
        heading.column_field = 'identity'; heading.column_boundary = true;
        heading.column_raw = identity.raw;
        replaceRow(preceding, [heading]); active = true;
      } else if (preceding && preceding.chunks.length === 2) {
        const [name, status] = preceding.chunks;
        const statusText = status.text.replace(/\s*[—–-]\s*/g, ' ');
        const statusReading = statusReadingOf('Status: ' + statusText, []);
        const nameOkay = /^[A-Za-z][A-Za-z0-9 &'.-]*$/.test(name.text) && !BOILERPLATE_RE.test(name.text)
          && !isReportHeaderLine(name.text) && !/^(?:ACCOUNT|CREDIT REPORT|PAYMENT HISTORY)\b/i.test(name.text);
        if (nameOkay && statusReading && status.bbox.x0 - name.bbox.x1 > 24
          && Math.abs(name.bbox.x0 - row.chunks[0].bbox.x0) < 5) {
          const heading = reading(name.words, preceding, 'Creditor: ' + name.text);
          heading.words = heading.words.map((word) => ({ ...word, start: word.start + 10, end: word.end + 10 }));
          heading.caption_label = 'Printed account heading';
          heading.column_field = 'identity'; heading.column_boundary = true;
          const ownStatus = reading(status.words, preceding, 'Status: ' + status.text);
          ownStatus.words = ownStatus.words.map((word) => ({ ...word, start: word.start + 8, end: word.end + 8 }));
          ownStatus.column_field = 'status'; ownStatus.column_raw = status.text;
          ownStatus.caption_label = 'Printed account heading';
          replaceRow(preceding, [heading, ownStatus]); active = true;
        }
      }
      // An unowned card must not continue the preceding account (including an account on the preceding page).
      if (!active) replaceRow(row, [{ text: '', page: page.page, line: assigned.get(row)?.line || fallback++, column_reset: true }]);
    }
    if (previousCaption && !startsCard && row.y - previousCaption.y > 50) active = false;
    previousCaption = row;
    const nextCaption = captionRows.find((r) => r.y > row.y);
    const candidates = rows.filter((r) => r.y > row.y + 2 && r.y - row.y <= 24
      && (!nextCaption || r.y < nextCaption.y - 2));
    // All actual values on this card row share a baseline. Conflicting or wrapped rows are unresolved.
    const valueRows = candidates.filter((r) => row.chunks.some((c) => r.words.some((w) => Math.abs(w.x0 - c.bbox.x0) < 5)));
    const valueRow = valueRows[0] || null;
    if (!active) { replaceRow(row, []); if (valueRow) replaceRow(valueRow, []); previousCaption = row; continue; }
    const lines = [];
    for (let i = 0; i < row.chunks.length; i++) {
      const caption = { ...row.chunks[i], row }, name = captionName(caption.text), kind = COLUMN_BOUNDARY_CAPTIONS[name];
      if (!kind || kind === 'ignored') continue;
      const right = row.chunks[i + 1]?.bbox.x0 ?? caption.bbox.x0 + (caption.bbox.x0 - row.chunks[i - 1].bbox.x0);
      let words = valueRow ? valueRow.words.filter((w) => w.x0 >= caption.bbox.x0 - 2 && w.x1 < right - 2) : [];
      if (words.length && Math.abs(words[0].x0 - caption.bbox.x0) >= 5) words = [];
      const raw = words.map((w) => w.text).join(' ');
      const line = reading(words, valueRow || row, name + ': ' + raw, caption);
      if (name === 'OWNERSHIP' && valueRow) {
        const roleIndex = row.chunks.findIndex((c) => captionName(c.text) === 'RESPONSIBILITY');
        if (roleIndex >= 0) {
          const roleCaption = row.chunks[roleIndex], roleRight = row.chunks[roleIndex + 1]?.bbox.x0
            ?? roleCaption.bbox.x0 + (roleCaption.bbox.x0 - row.chunks[roleIndex - 1].bbox.x0);
          const roleWords = valueRow.words.filter((w) => w.x0 >= roleCaption.bbox.x0 - 2 && w.x1 < roleRight - 2);
          const rawRole = roleWords.map((w) => w.text).join(' ');
          if (roleWords.length && Math.abs(roleWords[0].x0 - roleCaption.bbox.x0) < 5
            && roleWords.every((w) => w.trusted !== false) && roleCaption.words.every((w) => w.trusted !== false)
            && responsibilityOf('Responsibility: ' + rawRole)) line.column_field = 'ownership';
        }
      }
      if (valueRows.slice(1).some((r) => r.words.some((w) => Math.abs(w.x0 - caption.bbox.x0) < 5))) {
        line.trusted = false; line.column_conflict = true;
      }
      if (!words.length) { line.column_raw = ''; line.column_missing = true; line.bbox = null; }
      if (kind === 'identifier' && !maskedIdentifierToken(line.text)) {
        line.text = name + ': [unmasked or unreadable identifier withheld]'; line.column_raw = '[identifier withheld]';
      }
      lines.push(line);
    }
    replaceRow(row, []);
    if (valueRow) { replaceRow(valueRow, lines); valueRows.slice(1).forEach((r) => replaceRow(r, [])); }
    else replaceRow(row, lines);
  }
  const out = page.lines.flatMap((line) => removed.has(line) ? replacements.get(line) || [] : [line]);
  // Unmatched source rows carry geometry but no invented original line number. Insert by physical vertical order.
  for (const row of rows.filter((r) => r.added)) {
    const at = out.findIndex((line) => line.bbox && line.bbox.y0 > row.y);
    out.splice(at < 0 ? out.length : at, 0, ...row.added);
  }
  return out;
}
function pairedCaptionLines(lines) {
  const out = [];
  for (let index = 0; index < lines.length; index++) {
    const caption = lines[index], next = lines[index + 1], name = captionName(caption.text), kind = PAIRED_CAPTIONS[name];
    if (!kind || !next || caption.page !== next.page || !String(next.text || '').trim()
      || PAIRED_CAPTIONS[captionName(next.text)] || isReportHeaderLine(next.text)) { out.push(caption); continue; }
    const raw = String(next.text).trim();
    const valid = kind === 'money' ? printedAmount(raw) != null || /^[\s(+-−–—]*[$£€]/.test(raw)
      : kind === 'date' ? Boolean(normalizePrintedDate(raw).normalized || normalizePrintedDate(raw).interpretations)
        || /^(?:[-—–]|N\/?A)$/i.test(raw)
        : kind === 'identifier' ? Boolean(maskedIdentifierToken(`${name} ${raw}`))
          : kind === 'status' ? Boolean(statusReadingOf(`Status: ${raw}`, []))
            : kind === 'role' ? Boolean(responsibilityOf(`${name}: ${raw}`))
              : kind === 'type' ? /^(?:CREDIT CARD|REVOLVING|LINE OF CREDIT)$/i.test(raw)
                : /^[A-Za-z][A-Za-z0-9 &'.-]*$/.test(raw) && !BOILERPLATE_RE.test(raw);
    const geometry = caption.bbox && next.bbox;
    const aligned = geometry ? next.bbox.x0 <= caption.bbox.x1 && next.bbox.x1 >= caption.bbox.x0
      && next.bbox.y0 >= caption.bbox.y0 && next.bbox.y0 - caption.bbox.y1 < 45
      : !caption.measured_words && !next.measured_words;
    if (!valid || !aligned) { out.push(caption); continue; }
    const prefix = `${name}: `, leading = String(next.text).length - String(next.text).trimStart().length;
    const words = (next.words || []).map((word) => ({ ...word,
      start: word.start - leading + prefix.length, end: word.end - leading + prefix.length }));
    out.push({ ...next, text: prefix + raw, words, trusted: caption.trusted !== false && next.trusted !== false
      && decisiveWordsTrusted(caption, caption.text) !== false,
      caption_location: lineLocation(caption), caption_label: String(caption.text).trim().replace(/:\s*$/, '') });
    index++;
  }
  return out;
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
      const page = { page: p.page, source: 'NATIVE_TEXT', lines: nativeLineObjects(p), words: p.word_boxes || [], native_text_incomplete: p.native_text_incomplete === true || undefined, has_image_region: p.has_image_region === true || undefined };
      page.lines = columnCaptionLines(page);
      pages.push(page);
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
  const tail = String(textBefore || '').toUpperCase().replace(/[^A-Z ]/g, ' ').replace(/\s+/g, ' ').trim();
  if (/(?:DATE OF )?FIRST DELINQUENCY(?: DATE)?$|FIRST DATE OF DELINQUENCY$/.test(tail)) return 'FIRST DELINQUENCY DATE';
  if (/(?:DATE OF )?LAST PAYMENT(?: DATE| MADE)?$/.test(tail)) return 'LAST PAYMENT DATE';
  if (/(?:DATE )?FIRST REPORTED(?: DATE)?$/.test(tail)) return 'FIRST REPORTED';
  if (/\b(?:OPENED DATE|OPEN DATE)$/.test(tail)) return 'OPENED';
  if (/\bCLOSED DATE$/.test(tail)) return 'CLOSED';
  if (/\bACCOUNT START DATE$/.test(tail)) return 'OPENED';
  if (/\bACCOUNT END DATE$/.test(tail)) return 'CLOSED';
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
  const re = new RegExp(DATE_TOKEN.source, 'gi');
  while ((m = re.exec(text))) {
    const raw = m[0];
    const textBefore = text.slice(0, m.index);
    const label = labelForDate(textBefore);
    const norm = normalizePrintedDate(raw, convention);
    dates.push({ label, textBefore, raw, normalized: norm.normalized, precision: norm.precision, reason: norm.reason, convention: norm.convention || null, ambiguous: norm.ambiguous === true || undefined, alternative: norm.alternative || null, interpretations: norm.interpretations || null });
  }
  // Explicit own blank/damaged date fields remain source evidence; no date is supplied by a neighboring field.
  const ownCaption = /^\s*([^:]+):\s*(.*?)\s*$/.exec(text);
  if (!dates.length && ownCaption && PAIRED_CAPTIONS[captionName(ownCaption[1])] === 'date') {
    const raw = ownCaption[2];
    dates.push({ label: labelForDate(ownCaption[1]), textBefore: ownCaption[1], raw,
      normalized: null, precision: null, reason: line.column_missing ? 'OWN_COLUMN_VALUE_NOT_READ'
        : /^(?:[-—–]|N\/?A)?$/i.test(raw) ? 'PRINTED_DATE_BLANK' : 'DATE_NOT_RECOGNISED' });
  }
  const amounts = [];
  const amt = new RegExp(AMOUNT_TOKEN.source, 'gi');
  while ((m = amt.exec(text))) amounts.push(m[0]);
  return { dates, amounts };
}

function recordKind(text) {
  const up = String(text || '').toUpperCase();
  if (/COLLECTION|PLACED FOR COLLECTION/.test(up)) return 'GENERAL_COLLECTION';
  if (/INQUIR|ENQUIR|\b(?:CREDIT|QUOTATION|ACCOUNT MANAGEMENT|IDENTITY) SEARCH(?:ES)?\b/.test(up)) return 'GENERAL_INQUIRY';
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
const STATUS_WORDS = Object.freeze(['PAID AS AGREED', 'PAID IN FULL', 'SETTLED IN FULL',
  'NOT OVERDUE', 'UP TO DATE', 'CHARGED OFF', 'CHARGE OFF', 'IN COLLECTION',
  'OPEN', 'CLOSED', 'PAID', 'CURRENT', 'ACTIVE', 'SETTLED', 'DEFAULT']);
const STATUS_PATTERN = STATUS_WORDS.map((word) => word.replace(/\s+/g, '\\s+')).join('|');

function isAccountStatusLine(text) {
  return new RegExp(`^\\s*(?:(?:THIS|THE)\\s+)?ACCOUNT\\s+(?:STATUS\\b|IS\\b|REPORTED\\s+AS\\b|(?:${STATUS_PATTERN})\\s*[.!]?\\s*$)`, 'i')
    .test(String(text || ''));
}

function statusReadingOf(text, dates) {
  const raw = String(text || '');
  const explicit = new RegExp(`\\b(?:ACCOUNT\\s+)?STATUS\\s*[:\\-]?\\s*(?:IS\\s+)?(${STATUS_PATTERN})\\b`, 'i').exec(raw);
  if (explicit) return { value: explicit[1].toUpperCase().replace(/\s+/g, ' '), raw: explicit[1] };
  // An explicit, unrecognized status must not be replaced by a word in a different field.
  if (/\bSTATUS\b/i.test(raw)) return null;
  const escape = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (/^\s*(?:OPEN|CLOSED|PAID|SETTLED)\s*:\s*$/i.test(raw)) return null;
  let remaining = raw;
  const dateCaptions = [...CLOSURE_LABELS, ...OPENED_LABELS].filter((label) => /\bDATE\b/.test(label))
    .sort((a, b) => b.length - a.length).map((label) => escape(label).replace(/\s+/g, '\\s+'));
  remaining = remaining.replace(new RegExp(`\\b(?:${dateCaptions.join('|')})\\b`, 'gi'),
    (value) => ' '.repeat(value.length));
  for (const date of dates || []) {
    if (!date.label || !date.raw) continue;
    const caption = new RegExp(`\\b${escape(date.label)}\\s*[:\\-]?\\s*${escape(date.raw)}`, 'gi');
    remaining = remaining.replace(caption, (value) => ' '.repeat(value.length));
  }
  // A date caption or creditor name is not a status. Unlabelled input must be a standalone status
  // or an explicit statement about the account, such as "This account is open".
  const word = new RegExp(`^\\s*(?:ACCOUNT\\s+)?(${STATUS_PATTERN})\\s*[.!]?\\s*$`, 'i').exec(remaining)
    || new RegExp(`\\bACCOUNT\\s+(?:IS|REPORTED\\s+AS)\\s+(${STATUS_PATTERN})\\b`, 'i').exec(remaining);
  return word ? { value: word[1].toUpperCase().replace(/\s+/g, ' '), raw: word[1] } : null;
}

/* OWNER-ACCEPT-009 item 3: distinct printed amounts. The flat amount list is preserved as account.amount, but a
   label that immediately precedes a dollar amount gives it a PRINTED MEANING: a current balance, a past-due
   amount, a payment amount, or a credit limit. Each is stored under its own fact with its printed meaning; an
   amount with no recognised label stays unclassified (account.amount only). No arithmetic is inferred from a
   printed amount, and a label is matched only from text immediately before the amount. */
function labeledAmounts(text) {
  const out = {};
  const src = String(text || '');
  if (PAYMENT_HISTORY_HEADER_RE.test(src)) return out;
  const ownCaption = captionName(src.split(':')[0]);
  if (PAIRED_CAPTIONS[ownCaption] === 'date' || COLUMN_BOUNDARY_CAPTIONS[ownCaption] === 'ignored') return out;
  const labels = [...src.matchAll(/\b(PAST\s+DUE(?:\s+AMOUNT)?|AMOUNT\s+PAST\s+DUE|OVERDUE(?:\s+AMOUNT)?|CREDIT\s+LIMIT|CREDIT\s+LINE|HIGH\s+CREDIT|HIGH\s+BALANCE|LIMIT|(?:CURRENT\s+|RECENT\s+|LATEST\s+)?BALANCE|MONTHLY\s+PAYMENT|SCHEDULED\s+PAYMENT|(?:RECENT\s+)?PAYMENT(?:\s+AMOUNT)?)\b\s*:?\s*/gi)];
  for (let index = 0; index < labels.length; index++) {
    const match = labels[index], label = match[1].toUpperCase();
    if (/\b(?:LAST|DATE OF LAST)\s*$/i.test(src.slice(0, match.index)) && /^PAYMENT$/i.test(label)) continue;
    const rest = src.slice(match.index + match[0].length, labels[index + 1]?.index ?? src.length);
    const boundary = /\b(?:ACCOUNT\s+(?:NUMBER|STATUS|TYPE)|(?:INDIVIDUAL|JOINT)\s+ACCOUNT|AUTHORI[ZS]ED\s+USER|CO[- ]?(?:SIGNER|BORROWER|APPLICANT)|STATUS|RESPONSIBILITY|OPENED|CLOSED|DATE\s+OPENED|DATE\s+CLOSED|FIRST\s+DELINQUENCY|LAST\s+PAYMENT\s+DATE|FIRST\s+REPORTED)\b/i.exec(rest);
    const raw = rest.slice(0, boundary?.index ?? rest.length).trim();
    if ((!raw || !/[$£€\d]/.test(raw)) && !PAIRED_CAPTIONS[captionName(src.split(':')[0])]) continue;
    const key = /PAST\s+DUE|OVERDUE/.test(label) ? 'account.pastDueAmount'
      : /PAYMENT/.test(label) ? 'account.paymentAmount'
        : /LIMIT|CREDIT|HIGH/.test(label) ? 'account.creditLimit' : 'account.balance';
    const numeric = printedAmount(raw, { allowAsOf: true });
    if (key in out) { out[key].numeric = null; out[key].reason = 'MULTIPLE_VALUES_FOR_PRINTED_CAPTION'; }
    else out[key] = { raw, numeric, label: match[1], reason: numeric == null ? 'UNRECOGNIZED_AMOUNT_VALUE' : null };
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
  if (/\b(?:RESPONSIBILITY|OWNERSHIP)\s*:\s*SOLE\s*$/i.test(String(text || ''))) return { responsibility: 'INDIVIDUAL', raw: 'Sole' };
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
const COLLECTION_DELINQUENCY_LABELS = Object.freeze(['DELINQUENCY', 'FIRST DELINQUENCY DATE', 'DOFD']);
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
      if (d.precision === 'DAY' && ['GENERAL_ACCOUNT', 'REPORTED_ACCOUNT', 'CONSUMER_CREDIT_LIABILITY'].includes(currentKind)) {
        facts['reportedAccount.dateOpened'] = d.normalized;
      }
      canonicalPrinted['opened_date'] = {
        label: 'opened_date', state: 'VALUE', status: 'RESOLVED', raw: d.raw, normalized: d.normalized, reason: null,
        location: null, kind: 'date', precision: d.precision || null,
        anchor_precision: d.precision || null, comparison_anchor: d.normalized,
        ambiguous: d.ambiguous === true ? true : undefined, alternative_normalized: d.alternative || null
      };
      if (kind === null) kind = 'CONSUMER_CREDIT_LIABILITY';
    } else if (['GENERAL_ACCOUNT', 'REPORTED_ACCOUNT', 'CONSUMER_CREDIT_LIABILITY'].includes(currentKind) && ['DAY', 'MONTH'].includes(d.precision)
      && ['FIRST REPORTED', 'LAST PAYMENT DATE', 'FIRST DELINQUENCY DATE'].includes(up)) {
      const field = up === 'FIRST REPORTED' ? 'reportedAccount.firstReported'
        : up === 'LAST PAYMENT DATE' ? 'tradeline.lastPaymentDate' : 'tradeline.firstDelinquencyDate';
      facts[field] = d.normalized;
      facts[field + 'Precision'] = d.precision;
      canonicalPrinted[field] = { label: up, state: 'VALUE', status: 'RESOLVED',
        raw: d.raw, normalized: d.normalized, reason: null, location: null,
        kind: 'date', precision: d.precision };
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
  if (kind === null && !line.column_field && /OVERDUE|DEFAULT/.test(upText)) kind = 'OVERDUE_ACCOUNT';

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
const IDENTITY_LABEL_STRIP = /\b(OPENED|CLOSED|BALANCE|LIMIT|CREDIT LIMIT|DATE OPENED|DATE CLOSED|DATE PAID|PAYMENT|PAST DUE|OVERDUE|STATUS|ACCOUNT|TRADELINE|REPORT DATE|CREDIT REPORT|CONSUMER|REPORT|DATE|OF|ON|INDIVIDUAL|JOINT|JOINTLY|AUTHORIZED USER|AUTHORISED USER|CO-SIGNER|CO-BORROWER|RESPONSIBILITY|TYPE|CREDIT CARD|REVOLVING|LINE OF CREDIT|FIRST|LAST|REPORTED|DELINQUENCY)\b/gi;

function accountIdentityToken(text) {
  let t = String(text || '');
  t = t.replace(new RegExp(DATE_TOKEN.source, 'gi'), ' ');
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
  let m = /(?:ACCOUNT|ACCT)\s*(?:NUMBER|NO\.?|#)?(?:\s*\/\s*SUFFIX)?\s*[:#]?\s*[*#Xx·•]{2,}[\s\-]?(\d{3,4})(?!\d)/i.exec(s);
  if (!m) m = /(?:ACCOUNT|ACCT)\s*(?:NUMBER|NO\.?|#)?(?:\s*\/\s*SUFFIX)?\s*[:#]?\s*(?:ENDING|LAST|#)\s*(\d{3,4})(?!\d)/i.exec(s);
  if (!m) return null;
  const digits = String(m[1]).replace(/\D/g, '');
  if (digits.length < 3 || digits.length > 4) return null;
  return 'MASK-' + digits.padStart(4, '0');
}

function explicitAccountIdentity(text) {
  const match = /^\s*(?:ACCOUNT\s+NAME|CREDITOR|LENDER|CREDIT\s+PROVIDER)\s*:\s*(.+)$/i.exec(String(text || '').trim());
  if (!match) return null;
  const raw = match[1].split(/\s+(?=ACCOUNT\s+(?:NUMBER|TYPE|STATUS)|OPENED|CLOSED|BALANCE|CREDIT\s+LIMIT|STATUS|RESPONSIBILITY)/i)[0].trim();
  const normalized = raw.toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  return normalized && !BOILERPLATE_RE.test(raw) ? { raw, normalized } : null;
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
      label: line.caption_label || d.label || 'Date', state, raw: d.raw, normalized: value ? d.normalized : null,
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
  for (const d of facts.dates) {
    const field = CLOSURE_LABELS.includes(d.label) ? 'closed_date' : OPENED_LABELS.includes(d.label) ? 'opened_date'
      : d.label === 'LAST PAYMENT DATE' ? 'tradeline.lastPaymentDate'
        : d.label === 'FIRST DELINQUENCY DATE' ? 'tradeline.firstDelinquencyDate'
          : d.label === 'FIRST REPORTED' ? 'reportedAccount.firstReported' : null;
    if (field && (!trusted || !d.normalized || decisiveWordsTrusted(line, d.raw) === false)) {
      canonical.canonicalPrinted[field] = { label: line.caption_label || d.textBefore.trim().replace(/:\s*$/, '') || d.label,
        state: 'UNRESOLVED', status: 'EXTRACTION_UNRESOLVED', raw: d.raw, normalized: null,
        reason: trusted ? d.reason || 'UNTRUSTED_VALUE' : 'UNTRUSTED_VALUE', location: lineLocation(line),
        kind: 'date', precision: d.precision || null, ...(d.interpretations ? { interpretations: d.interpretations.slice() } : {}) };
    }
  }
  /* GAP-INGEST: preserve the printed amount, its currency marker and the printed status as facts, so
     common-error checks compare COMPATIBLE facts only. A printed amount is not an assertion that the account
     is or is not in any particular state. */
  const amountsByLabel = labeledAmounts(line.text);
  if (facts.amounts.length > 0 && !Object.values(amountsByLabel).some((value) => value.numeric == null)
    && trusted && decisiveWordsTrusted(line, facts.amounts[0]) !== false) {
    canonical.facts['account.amountRaw'] = facts.amounts[0];
    const numeric = printedAmount(facts.amounts[0]);
    if (numeric != null) canonical.facts['account.amount'] = numeric;
    if (facts.amounts[0].indexOf('$') >= 0) canonical.facts['account.currency'] = 'USD_SYMBOL_PRINTED';
  }
  for (const [key, val] of Object.entries(amountsByLabel)) {
    const usable = trusted && val.numeric != null && decisiveWordsTrusted(line, val.raw) !== false;
    printed[key] = { label: line.caption_label || val.label, raw: val.raw, normalized: usable ? val.numeric : null,
      state: usable ? 'VALUE' : 'UNRESOLVED', status: usable ? 'RESOLVED' : 'EXTRACTION_UNRESOLVED',
      reason: usable ? null : val.reason || 'UNTRUSTED_VALUE', location: lineLocation(line), kind: 'amount' };
    if (usable) {
      canonical.facts[key] = val.numeric;
      canonical.facts[`${key}Raw`] = val.raw;
      if (val.raw.indexOf('$') >= 0) canonical.facts['account.currency'] = 'USD_SYMBOL_PRINTED';
    }
  }
  const printedStatus = PAYMENT_HISTORY_HEADER_RE.test(String(line.text || '').toUpperCase())
    ? null : statusReadingOf(line.text, facts.dates);
  const statusTrusted = trusted && printedStatus && decisiveWordsTrusted(line, printedStatus.raw) !== false;
  if (statusTrusted) canonical.facts['account.status'] = printedStatus.value;
  /* BLOCKER-FDT-001 / duplicate corroboration: an account-intro line contributes its printed account/creditor
     identity as a normalized, non-identifying token. A continuation line never adds one. */
  if (kind === 'GENERAL_ACCOUNT' && ACCOUNT_INTRO_RE.test(String(line.text || '').toUpperCase())
    && !ACCOUNT_NUMBER_LABEL_RE.test(String(line.text || '').toUpperCase()) && !isAccountStatusLine(line.text)
    && (!line.column_field || line.column_field === 'identity')) {
    const identity = explicitAccountIdentity(line.text)?.normalized || accountIdentityToken(line.text);
    if (trusted && identity) canonical.facts['account.reported_identity'] = identity;
  }
  const masked = maskedIdentifierToken(line.text);
  if (trusted && masked) canonical.facts['account.masked_identifier'] = masked;
  const accountType = /\b(?:ACCOUNT\s+TYPE|TYPE\s+OF\s+ACCOUNT)\s*[:\-]?\s*(CREDIT\s+CARD|REVOLVING|LINE\s+OF\s+CREDIT)\b/i.exec(String(line.text || ''));
  if (trusted && accountType) canonical.facts['account.type'] = accountType[1].toUpperCase().replace(/\s+/g, ' ');
  if (trusted) {
    const resp = responsibilityOf(line.text);
    if (resp) {
      const roleField = line.column_field === 'ownership' ? 'account.ownership' : 'account.responsibility';
      canonical.facts[roleField] = resp.responsibility;
      canonical.facts[roleField + 'Raw'] = resp.raw;
    }
    const ph = paymentHistoryFacts(line.text);
    if (ph) {
      canonical.facts['account.paymentHistoryLegend'] = ph.legend.map((item) => ({ ...item, location: lineLocation(line) }));
      canonical.facts['account.paymentHistoryCells'] = ph.cells.map((cell) => ({ ...cell,
        raw_period: cell.period, location: lineLocation(line) }));
    }
  }
  for (const key of Object.keys(canonical.canonicalPrinted)) {
    const field = canonical.canonicalPrinted[key];
    if (field.location === null) field.location = lineLocation(line);
    if (line.caption_label) field.label = line.caption_label;
    else if (PAIRED_CAPTIONS[captionName(line.text.split(':')[0])] === 'date') field.label = line.text.split(':')[0].trim();
    printed[key] = field;
  }
  /* Keep the exact line-level source for ordinary-account values used in an accuracy assessment.
     The fact map alone is not a printed reading: it must carry its own raw token and location. */
  if (printedStatus) {
    printed.Status = { label: line.caption_label || 'Status', state: statusTrusted ? 'VALUE' : 'UNRESOLVED',
      raw: line.column_field === 'status' ? line.column_raw : printedStatus.raw, normalized: statusTrusted ? printedStatus.value : null,
      status: statusTrusted ? 'RESOLVED' : 'EXTRACTION_UNRESOLVED', reason: statusTrusted ? null : 'UNTRUSTED_VALUE',
      location: lineLocation(line), kind: 'status' };
  }
  if (trusted && masked) {
    const rawMask = /[*#Xx·•]{2,}[\s\-]?\d{3,4}|(?:ENDING|LAST)\s*\d{3,4}/i.exec(String(line.text || ''));
    if (rawMask) printed['account.masked_identifier'] = { label: line.caption_label || 'Masked account number',
      state: 'VALUE', raw: rawMask[0], normalized: masked,
      location: lineLocation(line), kind: 'identifier' };
  }
  const reportedIdentity = canonical.facts['account.reported_identity'];
  if (trusted && reportedIdentity) {
    const at = String(line.text || '').toUpperCase().indexOf(reportedIdentity);
    const explicitRaw = explicitAccountIdentity(line.text)?.raw;
    if (explicitRaw || at >= 0) printed['account.reported_identity'] = { label: 'Creditor or account name',
      state: 'VALUE', raw: explicitRaw || String(line.text).slice(at, at + reportedIdentity.length),
      normalized: reportedIdentity, location: lineLocation(line), kind: 'account_identity' };
  }
  const responsibility = canonical.facts['account.responsibility'];
  if (trusted && responsibility && canonical.facts['account.responsibilityRaw']) {
    printed['account.responsibility'] = { label: line.caption_label || 'Responsibility', state: 'VALUE',
      raw: line.column_field === 'role' ? line.column_raw : canonical.facts['account.responsibilityRaw'], normalized: responsibility,
      location: lineLocation(line), kind: 'responsibility' };
  }
  if (trusted && canonical.facts['account.ownership']) printed['account.ownership'] = {
    label: line.caption_label, state: 'VALUE', raw: line.column_raw, normalized: canonical.facts['account.ownership'],
    location: lineLocation(line), kind: 'ownership' };
  if (trusted && accountType) printed['account.type'] = { label: 'Account type', state: 'VALUE',
    raw: accountType[1], normalized: canonical.facts['account.type'],
    location: lineLocation(line), kind: 'account_type' };
  if (line.column_field && !['identity', 'date', 'money'].includes(line.column_field)) {
    const field = { status: 'Status', identifier: 'account.masked_identifier',
      role: trusted && line.column_raw && !responsibilityOf(line.text) ? 'Printed responsibility' : 'account.responsibility', type: 'account.type' }[line.column_field];
    if (field && !printed[field]) printed[field] = { label: line.caption_label, state: 'UNRESOLVED', status: 'EXTRACTION_UNRESOLVED',
      raw: line.column_raw, normalized: null, reason: trusted ? 'UNRECOGNIZED_OWN_COLUMN_VALUE' : 'UNTRUSTED_VALUE',
      location: lineLocation(line), kind: line.column_field };
  }
  for (const [field, label] of [['account.balance', 'Balance'], ['account.pastDueAmount', 'Past Due'],
    ['account.creditLimit', 'Credit Limit']]) {
    const raw = canonical.facts[`${field}Raw`];
    if (raw == null || canonical.facts[field] == null) continue;
    printed[label] = { label, state: 'VALUE', raw, normalized: canonical.facts[field],
      location: lineLocation(line), kind: 'amount' };
  }
  if (canonical.facts['account.amount'] != null && canonical.facts['account.amountRaw'] != null) {
    printed['account.amount'] = { label: 'Amount', state: 'VALUE',
      raw: canonical.facts['account.amountRaw'], normalized: canonical.facts['account.amount'],
      location: lineLocation(line), kind: 'amount' };
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
  if (/\bNOT\s+PROCEEDED(\s+WITH|\s+AGAINST)?\b/.test(up) || /\bNO\s+FURTHER\s+PROCEEDINGS\b/.test(up)) return 'NOT_PROCEEDED';
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

  /* BATCH-17: the disposition CATEGORY bound to an identified charge, exposed for a provision that names its own
     categories (Prince Edward Island s.9(3)(j): dismissed, set aside or not proceeded with). Only an unambiguous
     single binding sets it; an ambiguous, unbound or unsupported disposition leaves it null, so no finding is
     produced from it. The shared prohibited-disposition state is unchanged, so every other province is
     unaffected. */
  let boundCategory = null;
  if (charge_present === 'PRESENT') {
    const bound = dispositionEntries.filter((d) => (d.number != null ? chargeEntries.some((c) => c.number === d.number) : chargeEntries.length === 1));
    boundCategory = bound.length === 1 ? bound[0].classification : null;
  }

  return {
    charge_present,
    dismissed_disposition,
    disposition_category: boundCategory,
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
  let nonAccountSection = false;
  let seenBureau = null;
  for (const page of pages) {
    // A physical card's missing heading cannot borrow the preceding page's record.
    if (page.lines.some((line) => line.column_boundary || line.column_reset)) current = null;
    for (const line of pairedCaptionLines(page.lines)) {
      if (line.column_reset) { current = null; continue; }
      const text = String(line.text || '').trim();
      if (/^(?:CO[- ]?APPLICANTS|JOINT HOLDERS|RELATED PARTIES|FINANCIAL ASSOCIATES|EMPLOYMENT|EMPLOYERS)(?:\s|\/|$)/i.test(text)) {
        current = null; nonAccountSection = true; continue;
      }
      if (nonAccountSection) {
        if (line.column_boundary || bureauSectionOf(text) || explicitAccountIdentity(text) || /^\s*(?:PUBLIC RECORD|INQUIR|ENQUIR|CREDIT SEARCH|ACCOUNTS\b|TRADELINES\b)/i.test(text)) nonAccountSection = false;
        else continue;
      }
      // Report segmentation already separates bureaus and distinct report dates. Repeated headers
      // retained inside one supported continuation must not split its existing account.
      const sectionBureau = bureauSectionOf(text);
      if (sectionBureau) {
        if (seenBureau !== sectionBureau) current = null;
        seenBureau = sectionBureau;
        continue;
      }
      if (/^(?:GENERATED|FILE OPENED)\s*:/i.test(text)
        || /^TOTAL\s+(?:CREDIT\s+LIMIT|BALANCE|PAST DUE|ACCOUNTS)\b/i.test(text)
        || /\bTOTAL\s+(?:BALANCE|CREDIT LIMIT)\s*:?\s*[$£€\d]/i.test(text)
        || /^(?:DATE OF BIRTH|CURRENT ADDRESS|PREVIOUS ADDRESS)\b|^(?:PREVIOUS|FORMER|CURRENT)\s+(?:\d+|FLAT\b)/i.test(text)
        || /^(?:REVOLVING UTILISATION|REVOLVING UTILIZATION|CREDIT SCORE|ACCOUNT SUMMARY)\b/i.test(text)) {
        current = null; continue;
      }
      if (/\b(?:are reportable|bureaus suppress|exercise (?:your|the) parser)\b/i.test(text)) continue;
      const ownCaption = captionName(String(line.text).split(':')[0]);
      if (COLUMN_BOUNDARY_CAPTIONS[ownCaption] === 'ignored') continue;
      if (/^\s*(REPORT DATE|DATE OF REPORT|PREPARED(?: ON)?|REQUEST DATE|AS OF)\s*:/i.test(line.text)) continue;
      const facts = lineFacts(line, convention);
      const hasDate = facts.dates.some((d) => d.normalized);
      const up = String(line.text || '').toUpperCase();
      /* A payment-history grid or a responsibility label is a value line even though it carries no date or
         dollar amount: it is still a report-supported fact worth reading (and never a missed-payment guess). */
      const hasPaymentHistory = PAYMENT_HISTORY_HEADER_RE.test(up);
      const hasResponsibility = responsibilityOf(line.text) !== null;
      const hasAccountType = /\b(?:ACCOUNT\s+TYPE|TYPE\s+OF\s+ACCOUNT)\s*[:\-]?\s*(?:CREDIT\s+CARD|REVOLVING|LINE\s+OF\s+CREDIT)\b/i.test(line.text);
      /* OWNER-GAP-FINDING-002-RESOURCE-001: a public-record header and an explicit historical-verification line
         are value lines too — the header starts the record, the verification line is a record-owned fact. */
      const hasPublicRecordHeader = PUBLIC_RECORD_HEADER_RE.test(up) && recordKind(line.text) === 'GENERAL_PUBLIC_RECORD';
      /* A line that starts or continues the historical-verification statement is a value line even when the
         statement is word-wrapped across OCR lines, so the accumulator sees every part of it. */
      const hasHistoricalVerification = HISTORICAL_VERIFICATION_LABEL.test(up) || UNVERIFIED_PHRASE.test(up);
      /* GAP-INGEST-002: a printed account status (e.g. "Status: Charged Off") or a masked account identifier
         (e.g. "Account Number ****1234") is a report-supported fact worth reading even when the continuation
         line carries no date or dollar amount, so it reaches its owning record. */
      const hasStatus = statusReadingOf(line.text, facts.dates) !== null;
      const hasIdentifier = maskedIdentifierToken(line.text) !== null;
      /* OWNER-CANDIDATE-002/003: a Judgment or criminal-charge context line, and a judgment/criminal content
         field line (or a truncation marker) while a public record is open, are value lines even without a date or
         amount — they carry the public record's own content and completeness evidence. */
      const hasPublicRecordContent = /JUDGMENT|JUDGEMENT|CIVIL SUIT|CIVIL ACTION/i.test(up)
        || CRIMINAL_CHARGE_IDENTITY_RE.test(up)
        || (current && current.kind === 'GENERAL_PUBLIC_RECORD'
          && (JUDGMENT_CONTENT_LINE_RE.test(up) || CRIMINAL_CONTENT_LINE_RE.test(up)
            || JUDGMENT_TRUNCATION_MARKERS.test(up)));
      const hasValue = hasDate || Boolean(line.column_field) || facts.dates.some((d) => CLOSURE_LABELS.includes(d.label)
        || OPENED_LABELS.includes(d.label) || ['LAST PAYMENT DATE', 'FIRST DELINQUENCY DATE', 'FIRST REPORTED'].includes(d.label))
        || facts.amounts.length > 0 || Object.keys(labeledAmounts(line.text)).length > 0
        || hasPaymentHistory || hasResponsibility || hasAccountType || explicitAccountIdentity(line.text)
        || hasPublicRecordHeader || hasHistoricalVerification || Boolean(current && current._hvAccumulating)
        || hasStatus || hasIdentifier || hasPublicRecordContent;
      if (!hasValue) continue;
      const trusted = line.trusted !== false;
      const kind = line.column_field ? 'GENERAL_ACCOUNT' : recordKind(line.text);
      const isNonAccount = kind !== 'GENERAL_ACCOUNT';
      const isPublicRecordHeader = hasPublicRecordHeader;
      const isAccountIntro = kind === 'GENERAL_ACCOUNT' && ACCOUNT_INTRO_RE.test(up)
        && !ACCOUNT_NUMBER_LABEL_RE.test(up) && !hasAccountType && !isAccountStatusLine(line.text)
        && PAIRED_CAPTIONS[ownCaption] !== 'date' && (!line.column_field || line.column_boundary)
        && !/^\s*(?:AUTHORI[ZS]ED USER|INDIVIDUAL|JOINT)\s+(?:ON|ACCOUNT\b)/i.test(line.text);

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
      record.facts['criminalCharge.dismissedDispositionCategory'] = evidence.disposition_category;
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
        disposition_category: evidence.disposition_category,
        entry_complete: evidence.entry_complete, evidence: evidence.evidence
      };
    }
  }
  return records;
}

// Exact ordinary-account readings are authoritative, including a later rejected/contradictory caption.
function bindOrdinarySources(record) {
  const mapping = {
    'account.status': 'Status', 'account.balance': 'account.balance',
    'account.pastDueAmount': 'account.pastDueAmount', 'account.creditLimit': 'account.creditLimit',
    'account.paymentAmount': 'account.paymentAmount', 'account.amount': 'account.amount',
    'account.reported_identity': 'account.reported_identity', 'account.masked_identifier': 'account.masked_identifier',
    'account.type': 'account.type', 'account.responsibility': 'account.responsibility',
    'liability.openedDate': 'opened_date', 'reportedAccount.dateOpened': 'opened_date',
    'liability.closedDate': 'closed_date', 'tradeline.firstDelinquencyDate': 'tradeline.firstDelinquencyDate',
    'tradeline.lastPaymentDate': 'tradeline.lastPaymentDate', 'reportedAccount.firstReported': 'reportedAccount.firstReported'
  };
  record.fact_sources = { ...(record.fact_sources || {}) };
  for (const [field, base] of Object.entries(mapping)) {
    const readings = Object.entries(record.printed || {}).filter(([key]) => key === base || key.startsWith(base + ' ('))
      .map(([, reading]) => reading);
    const dateLabel = field === 'tradeline.firstDelinquencyDate' ? 'FIRST DELINQUENCY DATE'
      : field === 'tradeline.lastPaymentDate' ? 'LAST PAYMENT DATE'
        : field === 'reportedAccount.firstReported' ? 'FIRST REPORTED'
          : field === 'liability.openedDate' || field === 'reportedAccount.dateOpened' ? 'OPENED'
            : field === 'liability.closedDate' ? 'CLOSED' : null;
    if (dateLabel) readings.push(...Object.values(record.printed || {}).filter((reading) =>
      reading && reading.kind === 'date' && String(reading.label).toUpperCase() === dateLabel));
    if (!readings.length) continue;
    const first = readings[0], values = new Set(readings.map((reading) => String(reading.normalized)));
    const rejected = readings.some((reading) => reading.normalized == null || reading.state === 'UNRESOLVED'
      || reading.reason || reading.location?.trusted === false);
    const usable = !rejected && values.size === 1;
    if (usable) continue; // Existing single-reading source stays live; do not cache a second copy of its evidence.
    record.fact_sources[field] = { raw_value: first.raw, normalized_value: usable ? first.normalized : null,
      location: first.location, source_field: first.label, precision: first.precision || null,
      status: usable ? 'RESOLVED' : 'EXTRACTION_UNRESOLVED',
      reason: usable ? null : 'CONTRADICTORY_OR_UNTRUSTED_CAPTION', trusted: usable };
    if (!usable) {
      delete record.facts[field];
      if (field === 'account.balance') {
        delete record.facts['account.amount'];
        record.fact_sources['account.amount'] = { ...record.fact_sources[field] };
      }
    }
  }
  return record;
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
  const records = segments.flatMap((segment, index) => buildRecords(segment.pages, null).map(bindOrdinarySources).map((record) =>
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


