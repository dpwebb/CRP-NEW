'use strict';
/**
 * us-experian-consumer.cjs — the United States consumer-disclosure report-format family.
 *
 * OWNER-ALL82-001 / B3 continuation. The owner directed: "Use the existing official consumer-channel PUB-001
 * artifact ... Implement a consumer-format adapter and supported factual checks from fields actually
 * present." This module is that adapter.
 *
 * ADMISSION PATH. `EVIDENCED_STRUCTURAL_CONTRACT`, the second kind of admission the plan names: a measured
 * structure, evidenced from a captured public artifact, that a document either satisfies or does not. The
 * digest gate cannot admit a United States consumer disclosure, because a consumer's own disclosure is never
 * byte-identical to a sample.
 *
 * EVIDENCE FOR EVERY LITERAL BELOW. `SOURCE_CAPTURES/REPORT_FORMAT_BASELINE_2026-09-30/PUB-001.pdf`
 * (SHA-256 601c2387b62a1a8f1425ffffcdc80a1e64ce1de0c8b1d662922350cd1f0dec01), one page 954 x 5669 points,
 * zero native text, one embedded image. Its text is recovered by the LOCAL OCR reader in `../ocr/local-ocr.cjs`
 * (tesseract over a poppler raster, 150 dpi, mean line confidence 92.9 over 264 lines) and every string this
 * module matches was read from that reading. The artifact is read where it already sits; nothing is copied
 * into this repository.
 *
 * Boundaries this module keeps:
 *   • A DOCUMENT IS NOT MATCHED BY ITS NAME OR ITS PRODUCER. Admission is a conjunction of measured
 *     structural predicates. A lookalike fails on the predicate it fails, and the failure is named.
 *   • THE SUBSCRIBER CHANNEL IS NOT THIS FAMILY. The captured subscriber and screening artifacts
 *     (PUB-021 eSolutions, PUB-003 TotalView, PUB-004 Credit Profile, EXP-006 screening) are a different
 *     product for a different audience. Their markers refuse a document here; they are never a substitute.
 *   • AN EXTRACTED VALUE IS NOT AN APPLICABILITY ANSWER. Extraction status, applicability state and
 *     comparison outcome are three separate fields on every record and every result, and no one of them is
 *     read as another.
 *   • A LOW-CONFIDENCE READING IS UNRESOLVED, NOT ABSENT AND NOT GUESSED. When the local OCR reads a token
 *     below its recorded floor, or reads a token that is not a possible value, the fact is UNRESOLVED with
 *     the raw reading preserved beside it. It is never repaired from a neighbouring field.
 *   • AN UNREAD CELL IS NOT EVIDENCE. The account-history payment grid is graphical. This module reads no
 *     cell from it. It reads only the report's own printed annotation beside it.
 */

const { FACT_STATUS } = require('../../../internal-validation/ca-ns-last-payment-six-year/constants.cjs');
const ocr = require('../ocr/local-ocr.cjs');

const FAMILY_ID = 'FAM-US-EXP-CONSUMER';

/** The audience this family is evidenced for. It is a consumer disclosure, never a subscriber product. */
const AUDIENCE = 'CONSUMER';

/** The published artifact every literal in this module was read from. */
const EVIDENCED_ARTIFACT_ID = 'PUB-001';
const EVIDENCED_SHA256 = '601c2387b62a1a8f1425ffffcdc80a1e64ce1de0c8b1d662922350cd1f0dec01';

/** The five consumer sections whose presence proves this is the consumer disclosure presentation. */
const REQUIRED_SECTION_HEADINGS = Object.freeze([
  'Personal Information',
  'Potentially negative items',
  'Accounts in good standing',
  'Credit inquiries',
  'Important messages'
]);

/** Every heading the section scanner recognises. A heading ENDS the region it is not. */
const ALL_HEADINGS = Object.freeze(REQUIRED_SECTION_HEADINGS.concat([
  'Your credit report',
  'Personal statements',
  'Notices',
  'Dispute Cart'
]));

/** The report's own header-row labels. Their presence is the account-block skeleton. */
const ACCOUNT_HEADER_LABELS = Object.freeze(
  ['Account name', 'Account number', 'Recent balance', 'Date opened', 'Status']
);

/**
 * Every field label this presentation prints inside an account block. Longest first at read time, so
 * `Recent payment amount` is never read as `Recent balance` and `Date of status` never as `Date opened`.
 */
const ACCOUNT_LABELS = Object.freeze([
  'Account name', 'Account number', 'Recent balance', 'Date opened', 'Status',
  'Address identification number', 'Credit limit or original amount', 'Date of status', 'First reported',
  'High balance', 'Monthly payment', 'Recent payment amount', 'Past due amount',
  'Responsibility', 'Terms', 'Type'
]);

/** The report's own reference date is read from the consumer-document header line. */
const REFERENCE_DATE_LABEL = 'Report number';

/** The report's own public-record absence statement, verbatim from the evidenced artifact. */
const PUBLIC_RECORD_ABSENCE_STATEMENT = 'No Public Records appear on your report.';

/** The printed field the adverse item is anchored from. Read literally; never repaired. */
const PAYMENT_HISTORY_GUIDE_HEADING = 'Payment history guide';
const ADVERSE_RATING_FORM = /^(\d{1,3})\s+days?\s+past\s+due\s+as\s+of\s+([A-Za-z]{3,9})\s+(\d{4})$/;

/** Refusal reasons this family adds. Each maps to the fact status it produces. */
const FAMILY_REFUSAL_REASONS = Object.freeze({
  NOT_THE_EVIDENCED_FAMILY_STRUCTURE: FACT_STATUS.UNSUPPORTED_PRESENTATION,
  US_FAMILY_IN_MEMORY_MODEL_IS_NOT_A_FILE: FACT_STATUS.UNSUPPORTED_PRESENTATION,
  US_FAMILY_SYNTHETIC_OR_FIXTURE_MARKER: FACT_STATUS.UNSUPPORTED_PRESENTATION,
  US_FAMILY_WRONG_CHANNEL_MARKER: FACT_STATUS.UNSUPPORTED_PRESENTATION,
  US_FAMILY_IMAGE_ONLY_AND_NO_LOCAL_OCR: FACT_STATUS.UNSUPPORTED_PRESENTATION,
  US_FAMILY_CONSUMER_CHANNEL_IDENTITY_ABSENT: FACT_STATUS.UNSUPPORTED_PRESENTATION,
  US_FAMILY_ACCOUNT_SKELETON_ABSENT: FACT_STATUS.UNSUPPORTED_PRESENTATION,
  NOT_A_PDF_CONTAINER: FACT_STATUS.UNSUPPORTED_PRESENTATION,
  DOCUMENT_ENCRYPTED: FACT_STATUS.EXTRACTION_UNRESOLVED
});

/** Markers a fixture or a training aid carries. */
const FIXTURE_MARKERS = Object.freeze([
  'SYNTHETIC TEST INPUT', 'NOT A CREDIT REPORT', 'SYNTHETIC FIXTURE', 'FIXTURE'
]);

/**
 * Markers of the OTHER CHANNEL. Each string is evidenced by its presence in a captured subscriber or
 * screening artifact and by its ABSENCE from every line of the consumer artifact:
 *   `TotalView`      — PUB-003 (Equifax TotalView subscriber guide), 8 occurrences; 0 in PUB-001's text
 *   `Credit Profile` — PUB-004 (8) and PUB-021 (1), both subscriber products; 0 in PUB-001's text
 *   `subscriber`     — PUB-004 (14) and PUB-021 (3); 0 in PUB-001's text
 * `Small Business` is deliberately NOT a marker: the consumer artifact itself prints it inside the FCRA
 * public-record agency list ("United States Small Business Administration"), so it does not discriminate.
 * Matching is case- and whitespace-insensitive, so `Print report` matches a reading of `Printreport`.
 */
const WRONG_CHANNEL_MARKERS = Object.freeze(['TOTALVIEW', 'CREDIT PROFILE', 'SUBSCRIBER']);

/** The consumer-document header chrome the evidenced artifact prints, and a subscriber product does not. */
const CONSUMER_CHANNEL_MARKERS = Object.freeze(['Report number', 'Print report']);

/** Case- and whitespace-insensitive form, so a single OCR space error cannot change a measured predicate. */
function squash(text) {
  return String(text == null ? '' : text).toUpperCase().replace(/\s+/g, '');
}

const FAMILY_CONTRACT = Object.freeze({
  family_id: FAMILY_ID,
  definition: 'the United States consumer credit disclosure evidenced by the captured official consumer-channel artifact PUB-001',
  publisher: 'Experian (United States, consumer channel)',
  market: 'US',
  audience: AUDIENCE,
  channel: 'OFFICIAL_CONSUMER_EDUCATIONAL_SAMPLE_PUBLISHED_BY_THE_BUREAU',
  container: 'PDF',
  native_text_on_every_page: false,
  admitted_text_sources: Object.freeze(['NATIVE_TEXT_LAYER', 'LOCAL_OCR']),
  evidenced_artifact_id: EVIDENCED_ARTIFACT_ID,
  evidenced_sha256: EVIDENCED_SHA256,
  evidenced_pages: 1,
  evidenced_geometry_pt: Object.freeze({ width: 954, height: 5669 }),
  evidence_source: 'SOURCE_CAPTURES/REPORT_FORMAT_BASELINE_2026-09-30/PUB-001.pdf (+ INVENTORY.md); the text is evidenced by the local OCR reading recorded as `ocr_reading` on every extraction',
  reference_date_label: REFERENCE_DATE_LABEL,
  record_kinds: Object.freeze(['PUBLIC_RECORD', 'REPORTED_ACCOUNT', 'CREDIT_INQUIRY']),
  printed_fields: Object.freeze({
    REPORTED_ACCOUNT: ACCOUNT_LABELS,
    PUBLIC_RECORD: Object.freeze([PUBLIC_RECORD_ABSENCE_STATEMENT]),
    CREDIT_INQUIRY: Object.freeze(['Inquiries shared with others', 'Inquiries shared only with you'])
  }),
  boundary: [
    'Read support is evidenced for this FAMILY, by structure, from one captured official consumer-channel artifact. That artifact proves the structure it exhibits. It does not prove that every current Experian United States consumer disclosure prints it, and it is an educational sample rather than a production disclosure.',
    'The artifact is a RASTER with no native text. Admission therefore accepts a text layer produced by the authorized LOCAL OCR reader and records which source answered. The Canadian digest gate and the Australian structural contract are untouched: each family admits only through its own path.',
    'A subscriber, business or screening artifact is refused by its own markers. It is never used as a substitute for a consumer disclosure, and its medical marker is never borrowed.'
  ]
});

/** The text layer a model is read through, resolved once per model. */
const TEXT_LAYER_CACHE = new WeakMap();

function resolveOcrLayer(model) {
  if (!model || model.not_a_pdf === true) {
    return { source: 'LOCAL_OCR', pages: [], ocr_reading: null, available: false, refusal_reason: 'NOT_A_PDF_CONTAINER' };
  }
  const reading = ocr.readTextLayer(model.path);
  if (!reading.available) {
    return {
      source: 'LOCAL_OCR',
      pages: [],
      ocr_reading: reading,
      available: false,
      refusal_reason: 'US_FAMILY_IMAGE_ONLY_AND_NO_LOCAL_OCR'
    };
  }
  return { source: 'LOCAL_OCR', pages: reading.pages, ocr_reading: reading, available: true, refusal_reason: null };
}

/**
 * Resolve the text layer of a model: its own native text when every page carries one, otherwise the
 * authorized local OCR reading. The choice is RECORDED, never assumed, and an OCR failure is reported as a
 * refusal reason rather than as an empty document.
 */
function textLayerFor(model) {
  if (model && TEXT_LAYER_CACHE.has(model)) return TEXT_LAYER_CACHE.get(model);
  const nativeEverywhere = model && Array.isArray(model.pages) && model.pages.length > 0
    && model.pages.every((page) => page.has_native_text === true);
  const resolved = nativeEverywhere
    ? { source: 'NATIVE_TEXT_LAYER', pages: model.pages, ocr_reading: null, available: true, refusal_reason: null }
    : resolveOcrLayer(model);
  if (model && typeof model === 'object') TEXT_LAYER_CACHE.set(model, resolved);
  return resolved;
}

/* ------------------------------------------------------------------ lines and sections */

/** Every line of the resolved text layer, in document order, with its page, index and coordinate evidence. */
function documentLines(model) {
  const layer = textLayerFor(model);
  const lines = [];
  for (const page of layer.pages) {
    const evidence = Array.isArray(page.line_evidence) ? page.line_evidence : null;
    (page.lines || []).forEach((text, index) => {
      const line = { page: page.page, line: index + 1, text: String(text) };
      if (evidence && evidence[index]) {
        line.evidence = evidence[index];
        line.x0 = evidence[index].x0;
        line.y0 = evidence[index].y0;
        line.x1 = evidence[index].x1;
        line.y1 = evidence[index].y1;
        line.confidence = evidence[index].confidence;
        line.trusted = evidence[index].trusted;
      }
      lines.push(line);
    });
  }
  return lines;
}

function isHeading(text) {
  return ALL_HEADINGS.includes(String(text).trim());
}

function wholeDocumentText(model) {
  const layer = textLayerFor(model);
  return layer.pages.map((page) => page.text || '').join('\n');
}

/**
 * The region that follows each instance of `heading`, ending at the next heading. The HEADING LINE is not
 * part of the region; the region is what the heading introduces.
 */
function sectionRegions(model, heading) {
  const lines = documentLines(model);
  const regions = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (String(lines[i].text).trim() !== heading) continue;
    const body = [];
    for (let j = i + 1; j < lines.length; j += 1) {
      if (isHeading(lines[j].text)) break;
      body.push(lines[j]);
    }
    regions.push({ heading: lines[i], lines: body });
  }
  return regions;
}

/** Rows of words: one entry per printed line, each word tagged with the column band it belongs to. */
function wordRows(model) {
  const layer = textLayerFor(model);
  const rows = [];
  for (const page of layer.pages) {
    if (!Array.isArray(page.word_evidence)) continue;
    const byLine = new Map();
    for (const word of page.word_evidence) {
      const key = `${page.page}:${word.line_key}`;
      if (!byLine.has(key)) byLine.set(key, []);
      byLine.get(key).push(word);
    }
    for (const [, words] of byLine) {
      words.sort((a, b) => a.x0 - b.x0);
      rows.push({
        page: page.page,
        y0: Math.min(...words.map((w) => w.y0)),
        y1: Math.max(...words.map((w) => w.y1)),
        x0: Math.min(...words.map((w) => w.x0)),
        words
      });
    }
  }
  return rows.sort((a, b) => (a.y0 - b.y0) || (a.x0 - b.x0));
}

/**
 * The report's own reference date. The evidenced artifact prints it in the consumer-document header line as
 * `... | June 30, 2015 | Print report | Logout`, beside the label `Report number`. Read literally from its own
 * line; never inferred from a file timestamp, a URL or a neighbouring field.
 */
const REFERENCE_DATE_FORMS = [
  /([A-Za-z]{3,9})\s+(\d{1,2}),\s*(\d{4})/,       // June 30, 2015
  /(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})/,          // 30 June 2015
  /(\d{4})-(\d{2})-(\d{2})/                         // 2015-06-30
];

function locateReferenceDate(model) {
  const candidates = documentLines(model).filter((line) => line.text.includes(REFERENCE_DATE_LABEL));
  const base = {
    fact: 'REPORT_REFERENCE_DATE',
    source_field: REFERENCE_DATE_LABEL,
    section_path: 'consumer document header',
    occurrences: candidates.map((line) => ({ page: line.page, line: line.line }))
  };
  const fail = (reason, raw) => Object.assign(base, {
    status: FACT_STATUS.EXTRACTION_UNRESOLVED, reason, raw_value: raw || null,
    normalized_value: null, location: null
  });
  if (!candidates.length) return fail('REPORT_DATE_LABEL_NOT_FOUND');

  const found = [];
  for (const line of candidates) {
    for (const form of REFERENCE_DATE_FORMS) {
      const match = line.text.match(form);
      if (match) { found.push({ line, raw: match[0], match }); break; }
    }
  }
  if (!found.length) return fail('REPORT_DATE_NOT_PRINTED_WITH_THE_LABEL', candidates[0].text.slice(0, 120));
  const distinct = [...new Set(found.map((f) => f.raw))];
  if (distinct.length > 1) return fail('REPORT_DATE_CONTRADICTORY', distinct.join(' | '));

  const { normalized, reason } = normalizePrintedDate(found[0].raw);
  if (!normalized) return fail(reason || 'REPORT_DATE_NOT_READABLE_AS_A_CALENDAR_DATE', found[0].raw);
  return Object.assign(base, {
    status: FACT_STATUS.RESOLVED,
    reason: null,
    raw_value: found[0].raw,
    normalized_value: normalized,
    location: { page: found[0].line.page, line: found[0].line.line, label: REFERENCE_DATE_LABEL, section: 'consumer document header' }
  });
}

/* ------------------------------------------------------------------ printed dates */

const MONTHS = Object.freeze({
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5,
  jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9,
  oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12
});

function pad(value) {
  return String(value).padStart(2, '0');
}

function isValidDay(year, month, day) {
  const probe = new Date(Date.UTC(year, month - 1, day));
  return probe.getUTCFullYear() === year && probe.getUTCMonth() === month - 1 && probe.getUTCDate() === day;
}

/**
 * Normalize one printed date. This presentation prints `June 30, 2015`, `11/2013`, `06/03/2015` and
 * `Jun 2015`. A value that is not a possible calendar value is NOT repaired and is NOT guessed: it returns
 * `IMPOSSIBLE_CALENDAR_VALUE`, and the caller records the fact as UNRESOLVED with the raw reading preserved.
 * A month-only value keeps month precision, so a comparison is never computed from a day that was not printed.
 */
function normalizePrintedDate(raw) {
  const text = String(raw == null ? '' : raw).trim();
  if (!text) return { normalized: null, precision: null, reason: 'NO_VALUE_PRINTED' };

  let match = text.match(/^([A-Za-z]{3,9})\s+(\d{1,2}),?\s*(\d{4})$/);
  if (match) {
    const month = MONTHS[match[1].toLowerCase()];
    if (!month) return { normalized: null, precision: null, reason: 'MONTH_NOT_RECOGNISED' };
    const day = Number(match[2]);
    const year = Number(match[3]);
    if (!isValidDay(year, month, day)) return { normalized: null, precision: null, reason: 'IMPOSSIBLE_CALENDAR_VALUE' };
    return { normalized: `${year}-${pad(month)}-${pad(day)}`, precision: 'DAY', reason: null };
  }

  match = text.match(/^([A-Za-z]{3,9})\s+(\d{4})$/);
  if (match) {
    const month = MONTHS[match[1].toLowerCase()];
    if (!month) return { normalized: null, precision: null, reason: 'MONTH_NOT_RECOGNISED' };
    return { normalized: `${Number(match[2])}-${pad(month)}`, precision: 'MONTH', reason: null };
  }

  match = text.match(/^(\d{1,2})\/(\d{4})$/);
  if (match) {
    const month = Number(match[1]);
    const year = Number(match[2]);
    if (month < 1 || month > 12) return { normalized: null, precision: null, reason: 'IMPOSSIBLE_CALENDAR_VALUE' };
    return { normalized: `${year}-${pad(month)}`, precision: 'MONTH', reason: null };
  }

  match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const month = Number(match[1]);
    const day = Number(match[2]);
    const year = Number(match[3]);
    if (!isValidDay(year, month, day)) return { normalized: null, precision: null, reason: 'IMPOSSIBLE_CALENDAR_VALUE' };
    return { normalized: `${year}-${pad(month)}-${pad(day)}`, precision: 'DAY', reason: null };
  }

  match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (!isValidDay(year, month, day)) return { normalized: null, precision: null, reason: 'IMPOSSIBLE_CALENDAR_VALUE' };
    return { normalized: `${year}-${pad(month)}-${pad(day)}`, precision: 'DAY', reason: null };
  }

  return { normalized: null, precision: null, reason: 'MALFORMED_PRINTED_DATE_FORM' };
}

/* ------------------------------------------------------------------ admission */

/**
 * Every predicate is evaluated and recorded, so a refusal states the whole measured shape of the document
 * rather than only the first thing that failed. The admission outcome is the first failing predicate.
 */
function admissionPredicates(model) {
  const predicates = [];
  const push = (id, passed, detail, refusal_reason) => predicates.push({
    id, passed, detail, refusal_reason: passed ? null : refusal_reason
  });

  const unreadable = !model || model.not_a_pdf === true
    || (Array.isArray(model.read_errors) && model.read_errors.some((e) => e.stage === 'open' || e.stage === 'pdfinfo'));
  push('INPUT_PRESENT_AND_READABLE', !unreadable,
    unreadable ? 'the document could not be opened or parsed' : `${model.page_count} page(s) read`,
    model && model.not_a_pdf ? 'NOT_A_PDF_CONTAINER' : 'NOT_THE_EVIDENCED_FAMILY_STRUCTURE');

  const layer = model ? textLayerFor(model) : { available: false, source: null, pages: [] };
  push('TEXT_LAYER_IS_AVAILABLE_BY_NATIVE_TEXT_OR_AUTHORIZED_LOCAL_OCR',
    layer.available === true && layer.pages.length > 0,
    layer.available
      ? `text layer resolved from ${layer.source}`
      : `no native text layer and local OCR did not answer: ${(layer.ocr_reading && layer.ocr_reading.refusal_reason) || 'not attempted'}`,
    (layer.ocr_reading && layer.ocr_reading.refusal_reason === 'NOT_A_PDF_CONTAINER')
      ? 'NOT_A_PDF_CONTAINER'
      : 'US_FAMILY_IMAGE_ONLY_AND_NO_LOCAL_OCR');

  push('NOT_ENCRYPTED', !model || model.encrypted !== true, `encrypted=${model ? model.encrypted : 'unknown'}`,
    'DOCUMENT_ENCRYPTED');

  push('MODEL_IS_A_FILE_NOT_AN_IN_MEMORY_MODEL', !model || model.synthetic !== true,
    model && model.synthetic === true ? 'the model is an in-memory synthetic model, not a file' : 'the model was read from a file',
    'US_FAMILY_IN_MEMORY_MODEL_IS_NOT_A_FILE');

  const text = layer.available ? wholeDocumentText(model) : '';
  const squashed = squash(text);

  const fixtureHits = FIXTURE_MARKERS.filter((m) => squashed.includes(squash(m)));
  push('NO_FIXTURE_OR_SYNTHETIC_MARKER', fixtureHits.length === 0,
    fixtureHits.length === 0 ? 'no fixture or synthetic marker' : `fixture marker present: ${fixtureHits.join(', ')}`,
    'US_FAMILY_SYNTHETIC_OR_FIXTURE_MARKER');

  const channelHits = WRONG_CHANNEL_MARKERS.filter((m) => squashed.includes(squash(m)));
  push('NO_SUBSCRIBER_OR_SCREENING_CHANNEL_MARKER', channelHits.length === 0,
    channelHits.length === 0 ? 'no subscriber, business or screening marker'
      : `another channel's marker present: ${channelHits.join(', ')}`,
    'US_FAMILY_WRONG_CHANNEL_MARKER');

  const identityHits = CONSUMER_CHANNEL_MARKERS.filter((m) => squashed.includes(squash(m)));
  push('CONSUMER_CHANNEL_DOCUMENT_IDENTITY_PRESENT', identityHits.length === CONSUMER_CHANNEL_MARKERS.length,
    `${identityHits.length} of ${CONSUMER_CHANNEL_MARKERS.length} consumer-document header markers present`,
    'US_FAMILY_CONSUMER_CHANNEL_IDENTITY_ABSENT');

  const headingsSeen = [...new Set(documentLines(model).filter((l) => isHeading(l.text)).map((l) => l.text.trim()))];
  const missingHeadings = REQUIRED_SECTION_HEADINGS.filter((h) => !headingsSeen.includes(h));
  push('REQUIRED_CONSUMER_SECTIONS_PRESENT', missingHeadings.length === 0,
    missingHeadings.length === 0 ? 'every required consumer section heading is printed'
      : `missing consumer section heading(s): ${missingHeadings.join('; ')}`,
    'NOT_THE_EVIDENCED_FAMILY_STRUCTURE');

  const headerRows = documentLines(model).filter((l) => ACCOUNT_HEADER_LABELS.every((label) => l.text.includes(label)));
  push('ACCOUNT_BLOCK_SKELETON_PRESENT', headerRows.length > 0,
    headerRows.length > 0 ? `${headerRows.length} account header row(s) printed with: ${ACCOUNT_HEADER_LABELS.join(', ')}`
      : 'no printed account header row carries the presentation\'s own column labels',
    'US_FAMILY_ACCOUNT_SKELETON_ABSENT');

  return predicates;
}

/**
 * Admit a document, or refuse it and name the reason and the fact status that reason produces. The contract
 * is not a digest gate, so admission says "this document has the family's measured structure" — it does not
 * say the document is any particular specimen, and it does not say it is a current production disclosure.
 */
function admit(model) {
  const layer = model ? textLayerFor(model) : { source: null, ocr_reading: null };
  const predicates = admissionPredicates(model);
  const firstFailure = predicates.find((p) => !p.passed);
  const base = {
    family: {
      family_id: FAMILY_ID,
      evidenced_artifact_id: FAMILY_CONTRACT.evidenced_artifact_id,
      evidenced_sha256: FAMILY_CONTRACT.evidenced_sha256
    },
    text_source: layer.source,
    presentation_evidence: !firstFailure,
    predicates
  };
  if (!firstFailure) return Object.assign({ state: 'ADMITTED_FAMILY_STRUCTURE', admitted: true, refusal_reason: null, fact_status: null }, base);
  return Object.assign({
    state: 'REFUSED',
    admitted: false,
    refusal_reason: firstFailure.refusal_reason,
    fact_status: FAMILY_REFUSAL_REASONS[firstFailure.refusal_reason] || FACT_STATUS.UNSUPPORTED_PRESENTATION
  }, base);
}

/* ------------------------------------------------------------------ column-aware field reader */

const LABELS_LONGEST_FIRST = ACCOUNT_LABELS.slice().sort((a, b) => b.length - a.length);

/** The known label a text is, or `null`. Longest first, so `Recent balance` never wins over `Recent payment amount`. */
function exactLabel(text) {
  const norm = String(text).trim();
  return LABELS_LONGEST_FIRST.includes(norm) ? norm : null;
}

/** A known label whose text begins with `prefix`, used to continue a label printed across two visual lines. */
function labelExtendedBy(prefix) {
  const norm = String(prefix).trim();
  return LABELS_LONGEST_FIRST.find((label) => label.length > norm.length && label.startsWith(`${norm} `)) || null;
}

/**
 * `Label value` printed on one line. Only the LONGEST complete label counts, and the remainder must be
 * non-empty, so a bare label line never becomes a field with an empty value.
 */
function inlineSplit(text) {
  const norm = String(text).trim();
  for (const label of LABELS_LONGEST_FIRST) {
    if (norm === label) return null;
    if (norm.startsWith(`${label} `)) return { label, value: norm.slice(label.length + 1).trim() };
  }
  return null;
}

/**
 * The column anchors a header row prints, taken from its own words.
 *
 * The row's words are gathered across its whole printed band (a label may be split over two OCR line
 * groups — `Account` on one and `name` on the next), sorted left to right, and each header label is then
 * matched as a CONTIGUOUS run. Empty when the text layer carries no word coordinates, in which case the
 * reader falls back to line-level label/value pairing.
 */
function columnAnchors(model, headerRow) {
  const words = [];
  for (const row of wordRows(model)) {
    /* Only the header label's own printed band. The row that FOLLOWS carries the values and would break a
       label printed across two OCR line groups into a non-contiguous run. */
    if (Math.abs(row.y0 - headerRow.y0) > 6) continue;
    words.push(...row.words);
  }
  if (!words.length) return [];
  words.sort((a, b) => (a.x0 - b.x0) || (a.y0 - b.y0));

  const anchors = [];
  for (const label of ACCOUNT_HEADER_LABELS) {
    const parts = label.split(' ');
    for (let i = 0; i + parts.length <= words.length; i += 1) {
      if (parts.every((part, k) => words[i + k].text === part)) {
        anchors.push({ label, x: words[i].x0 });
        break;
      }
    }
  }
  return anchors.sort((a, b) => a.x - b.x);
}

/**
 * The entries of one account block: every printed line inside the block, split into the column band its words
 * sit in. With no column anchors (a text layer without word coordinates) the whole line is one band, and the
 * reader falls back to line-level label/value pairing.
 */
function blockEntries(model, startY, endY, anchors, headerY0) {
  const entries = [];
  const controls = [];
  const lower = Number.isFinite(startY) ? startY : 0;
  const upper = Number.isFinite(endY) ? endY : Number.POSITIVE_INFINITY;

  /* A printed control begins at a `+` token and runs to the end of its printed row. It is recorded as a
     control and is never allowed into a column's text. */
  const splitControl = (words) => {
    const index = words.findIndex((w) => String(w.text).startsWith('+'));
    return index === -1
      ? { fields: words, control: [] }
      : { fields: words.slice(0, index), control: words.slice(index) };
  };

  /* A word belongs to the column whose anchor is the nearest one to its LEFT, because these columns are
     left-aligned: a label is wider than the gap between anchors and would otherwise be split. */
  const bandOf = (x) => {
    let chosen = anchors[0];
    for (const anchor of anchors) {
      if (anchor.x <= x + 5 && anchor.x >= chosen.x) chosen = anchor;
    }
    return chosen.x;
  };

  for (const row of wordRows(model)) {
    if (row.y0 < lower || row.y0 > upper) continue;
    /* The header row prints the labels. It carries no values, so every entry on it is tagged and skipped
       when a value is collected. */
    const inHeaderRow = Number.isFinite(headerY0) && Math.abs(row.y0 - headerY0) <= 6;
    const { fields, control } = splitControl(row.words);
    if (control.length) {
      controls.push({
        text: control.map((w) => w.text).join(' '),
        location: { page: row.page, y0: row.y0, x0: control[0].x0 }
      });
    }
    if (!fields.length) continue;

    if (!anchors.length) {
      entries.push({
        band: 0, y0: row.y0, y1: row.y1, in_header_row: inHeaderRow,
        text: fields.map((w) => w.text).join(' '), words: fields
      });
      continue;
    }
    const buckets = new Map();
    for (const word of fields) {
      const band = bandOf(word.x0);
      if (!buckets.has(band)) buckets.set(band, []);
      buckets.get(band).push(word);
    }
    for (const [band, words] of buckets) {
      words.sort((a, b) => a.x0 - b.x0);
      entries.push({
        band,
        y0: Math.min(...words.map((w) => w.y0)),
        y1: Math.max(...words.map((w) => w.y1)),
        in_header_row: inHeaderRow,
        text: words.map((w) => w.text).join(' '),
        words
      });
    }
  }
  return { entries: entries.sort((a, b) => (a.y0 - b.y0) || (a.band - b.band)), controls };
}

/** The reading of one blocked value: its text, its status and every token that fell below the floor. */
function readingFrom(parts) {
  const tokens = parts.flatMap((part) => part.words || []);
  const untrusted = tokens.filter((t) => t.trusted === false)
    .map((t) => ({ token: t.text, confidence: t.confidence }));
  const raw = parts.map((p) => p.text).join(' ').replace(/\s+/g, ' ').trim();
  return { raw, untrusted, trusted: untrusted.length === 0 };
}

/**
 * Read the labelled fields of one band.
 *
 * A label is a known label printed in the band; its value is what follows in the SAME band, below the label,
 * until the next label or a vertical gap. So a value is never taken from another column, from the row above
 * its own label, or from a neighbouring record.
 *
 * A printed control (`+ Dispute`, `+ Options`) is a user-interface affordance rather than a report field: it
 * is recorded as a control, it ends the value it interrupts, and it never becomes a value. A printed line
 * that belongs to no field is recorded as an unlabelled line, not forced into the field above it.
 */
function scanBand(entries) {
  const fields = [];
  const controls = [];
  const unlabelled = [];

  let i = 0;
  while (i < entries.length) {
    const entry = entries[i];
    if (entry.text.trim().startsWith('+')) {
      controls.push({ text: entry.text.trim(), location: { page: entry.page || null, y0: entry.y0 } });
      i += 1;
      continue;
    }

    let assembled = '';
    let matched = null;
    let j = i;
    while (j < entries.length) {
      assembled = assembled ? `${assembled} ${entries[j].text.trim()}` : entries[j].text.trim();
      if (exactLabel(assembled)) { matched = { label: assembled, end: j }; break; }
      if (!labelExtendedBy(assembled)) break;
      j += 1;
    }

    if (!matched) {
      const inline = inlineSplit(entry.text);
      if (inline) {
        fields.push({
          label: inline.label, kind: 'INLINE',
          value: { raw: inline.value, untrusted: [], trusted: true },
          entry, valueParts: []
        });
        i += 1;
        continue;
      }
      /* A line that is neither a label nor a labelled value belongs to no field. It is recorded as an
         unlabelled printed line rather than forced into the field above it. A header-row word that is not a
         label is part of the label row and is simply consumed. */
      if (!entry.in_header_row) {
        unlabelled.push({ text: entry.text, location: { page: entry.page || null, y0: entry.y0 } });
      }
      i += 1;
      continue;
    }

    const valueParts = [];
    let k = matched.end + 1;
    let previousY = entries[matched.end].y1;
    while (k < entries.length) {
      const candidate = entries[k];
      /* A printed control interrupts nothing and becomes no value. */
      if (candidate.text.trim().startsWith('+')) {
        controls.push({ text: candidate.text.trim(), location: { page: candidate.page || null, y0: candidate.y0 } });
        k += 1;
        continue;
      }
      /* The label row carries labels only. */
      if (candidate.in_header_row) { k += 1; continue; }
      if (exactLabel(candidate.text) || labelExtendedBy(candidate.text) || inlineSplit(candidate.text)) break;
      if (candidate.y0 - previousY > 40) break;
      valueParts.push(candidate);
      previousY = candidate.y1;
      k += 1;
    }
    fields.push({ label: matched.label, kind: 'BLOCK', value: null, entry, valueParts });
    i = k;
  }

  for (const field of fields) {
    if (field.value) continue;
    field.value = readingFrom(field.valueParts);
  }
  return { fields, controls, unlabelled };
}

/** Strip leading punctuation OCR attaches to a value (`—06/2015` is the same printed value as `06/2015`). */
function sanitizeValue(raw) {
  return String(raw == null ? '' : raw).replace(/^[^A-Za-z0-9$]+/, '').trim();
}

/** A printed amount read as a finite number, or null when the reading carries no amount. Only the LEADING printed
 *  number is used (a value like "$273 as of 06/03/2015" is the balance $273 plus a date annotation, never one number
 *  "27306032015"); nothing is inferred from a later token. */
function printedAmount(raw) {
  const m = /[\d][\d,]*(?:\.\d+)?/.exec(String(raw == null ? '' : raw));
  if (!m) return null;
  const n = Number(m[0].replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

/** One printed field of a record: its raw reading, its location, and whether the reading is trusted. */
function fieldOf(fields, label) {
  const hits = fields.filter((f) => f.label === label);
  if (!hits.length) return { present: false, count: 0, raw: null, reason: 'LABEL_NOT_PRINTED_ON_THIS_RECORD', location: null, trusted: null };
  const value = sanitizeValue(hits[0].value.raw);
  const location = hits[0].entry
    ? { page: hits[0].entry.page || null, y0: hits[0].entry.y0, band_x0: hits[0].entry.band }
    : null;
  if (!value) return { present: true, count: hits.length, raw: null, reason: 'LABEL_PRINTED_WITHOUT_VALUE', location, trusted: null };
  if (hits[0].value.trusted !== true) {
    return {
      present: true, count: hits.length, raw: value, reason: 'READING_BELOW_THE_RECORDED_CONFIDENCE_FLOOR',
      location, trusted: false, untrusted_tokens: hits[0].value.untrusted
    };
  }
  return { present: true, count: hits.length, raw: value, reason: null, location, trusted: true };
}

/** A printed field read as a date, or UNRESOLVED with the raw reading preserved beside its reason. */
/**
 * The comparison anchor for a printed value that carries less than a full day.
 *
 * `evaluation-primitives.cjs` is ISO-day only, and it is right to be: normalising a printed date is the
 * extraction boundary's job. When this presentation prints a MONTH and no day (`30 days past due as of Jun
 * 2015`), the day is NOT invented. The comparison runs against the whole month as a RANGE, and the convention
 * is carried on the reading itself, so no reader can mistake the anchor for a printed day.
 */
const MONTH_PRECISION_DAY_CONVENTION =
  'the printed value is a month with no day. The whole month is the comparison range; no day is invented for it.';

function comparisonAnchor(normalized, precision) {
  if (!normalized) return null;
  if (precision === 'DAY') return normalized;
  if (precision === 'MONTH') return normalized;
  return null;
}

function dateFieldOf(fields, label) {
  const field = fieldOf(fields, label);
  if (field.reason === 'LABEL_NOT_PRINTED_ON_THIS_RECORD' || field.reason === 'LABEL_PRINTED_WITHOUT_VALUE') {
    return Object.assign(field, { status: FACT_STATUS.EXTRACTION_UNRESOLVED, normalized_value: null });
  }
  const { normalized, precision, reason } = normalizePrintedDate(field.raw);
  if (!normalized) return Object.assign(field, { status: FACT_STATUS.EXTRACTION_UNRESOLVED, normalized_value: null, reason });
  if (field.trusted !== true) return Object.assign(field, { status: FACT_STATUS.EXTRACTION_UNRESOLVED, normalized_value: null, precision });
  return Object.assign(field, { status: FACT_STATUS.RESOLVED, normalized_value: normalized, precision });
}

/* ------------------------------------------------------------------ records */

function isAccountHeaderRow(line) {
  return ACCOUNT_HEADER_LABELS.every((label) => line.text.includes(label));
}

/** Every account block the two account-bearing sections print, with the section it sits in. */
function accountBlocks(model) {
  const blocks = [];
  for (const heading of ['Potentially negative items', 'Accounts in good standing']) {
    for (const region of sectionRegions(model, heading)) {
      const headerIndexes = [];
      region.lines.forEach((line, index) => { if (isAccountHeaderRow(line)) headerIndexes.push(index); });
      headerIndexes.forEach((index, position) => {
        const end = position + 1 < headerIndexes.length ? headerIndexes[position + 1] : region.lines.length;
        const body = region.lines.slice(index, end);
        blocks.push({
          section: heading,
          header: region.lines[index],
          startY: region.lines[index].y0,
          endY: body[body.length - 1].y1,
          lines: body
        });
      });
    }
  }
  return blocks;
}

/**
 * The report's own printed annotation of this account's most recent adverse payment rating, read from the
 * `Payment history guide` line inside the record. It is the account's own statement of the date of the
 * adverse rating; it is NOT the date of first delinquency, which this presentation does not print, and it is
 * never taken from the graphical grid above it.
 */
function locateAdverseRating(lines) {
  const base = {
    fact: 'ADVERSE_PAYMENT_RATING_DATE',
    source_field: `${PAYMENT_HISTORY_GUIDE_HEADING} — "NN days past due as of <Mon YYYY>"`
  };
  const guideIndex = lines.findIndex((line) => line.text.trim() === PAYMENT_HISTORY_GUIDE_HEADING);
  if (guideIndex === -1) {
    return Object.assign(base, {
      status: FACT_STATUS.EXTRACTION_UNRESOLVED, reason: 'PAYMENT_HISTORY_GUIDE_NOT_PRINTED_ON_THIS_RECORD',
      raw_value: null, normalized_value: null, location: null
    });
  }
  const candidates = lines.slice(guideIndex + 1, guideIndex + 4).filter((line) => ADVERSE_RATING_FORM.test(line.text.trim()));
  if (!candidates.length) {
    return Object.assign(base, {
      status: FACT_STATUS.EXTRACTION_UNRESOLVED, reason: 'NO_ADVERSE_RATING_ANNOTATION_PRINTED_UNDER_THE_GUIDE_HEADING',
      raw_value: null, normalized_value: null, location: { page: lines[guideIndex].page, y0: lines[guideIndex].y0 }
    });
  }
  const line = candidates[0];
  const match = line.text.trim().match(ADVERSE_RATING_FORM);
  const location = { page: line.page, line: line.line, y0: line.y0, confidence: line.confidence, section: 'account block' };
  const { normalized, precision, reason } = normalizePrintedDate(`${match[2]} ${match[3]}`);
  if (!normalized) {
    return Object.assign(base, {
      status: FACT_STATUS.EXTRACTION_UNRESOLVED, reason, raw_value: line.text.trim(),
      normalized_value: null, location
    });
  }
  if (line.trusted !== true) {
    return Object.assign(base, {
      status: FACT_STATUS.EXTRACTION_UNRESOLVED, reason: 'READING_BELOW_THE_RECORDED_CONFIDENCE_FLOOR',
      raw_value: line.text.trim(), normalized_value: null, location
    });
  }
  return Object.assign(base, {
    status: FACT_STATUS.RESOLVED,
    reason: null,
    raw_value: line.text.trim(),
    normalized_value: normalized,
    precision,
    /* The anchor the comparison uses. For a month-only reading this is the first day of that month, and the
       convention that produced it travels with the reading. */
    comparison_anchor: comparisonAnchor(normalized, precision),
    anchor_precision: precision,
    anchor_day_convention: precision === 'MONTH' ? MONTH_PRECISION_DAY_CONVENTION : null,
    days_past_due_as_printed: Number(match[1]),
    location,
    does_not_establish: 'the date of first delinquency; this presentation prints no such field'
  });
}

function buildAccountRecord(block, index, model) {
  const anchors = columnAnchors(model, block.header);
  const blocked = blockEntries(model, block.startY, block.endY, anchors, block.header.y0);
  const entries = blocked.entries;
  const fields = [];
  const controls = blocked.controls.slice();
  const unlabelled = [];
  for (const band of [...new Set(entries.map((e) => e.band))]) {
    const scanned = scanBand(entries.filter((e) => e.band === band));
    fields.push(...scanned.fields);
    controls.push(...scanned.controls);
    unlabelled.push(...scanned.unlabelled);
  }

  const name = fieldOf(fields, 'Account name');
  const status = fieldOf(fields, 'Status');
  const dateOpened = dateFieldOf(fields, 'Date opened');
  const dateOfStatus = dateFieldOf(fields, 'Date of status');
  const firstReported = dateFieldOf(fields, 'First reported');
  const adverse = locateAdverseRating(block.lines);
  const lastLine = block.lines[block.lines.length - 1];
  /* OWNER-POTENTIAL-ISSUE-001 ordinary-field batch: the additional printed fields this family already reads, mapped
     to the account facts the shared common-error checks compare. */
  const balance = fieldOf(fields, 'Recent balance');
  const pastDue = fieldOf(fields, 'Past due amount');
  const creditLimit = fieldOf(fields, 'Credit limit or original amount');
  const monthlyPayment = fieldOf(fields, 'Monthly payment');

  const facts = {};
  if (status.raw) facts['reportedAccount.status'] = status.raw;
  if (dateOpened.normalized_value) facts['reportedAccount.dateOpened'] = dateOpened.normalized_value;
  if (firstReported.normalized_value) facts['reportedAccount.firstReported'] = firstReported.normalized_value;
  if (adverse.comparison_anchor) facts['reportedAccount.adverseRatingDate'] = adverse.comparison_anchor;
  if (adverse.anchor_precision) facts['reportedAccount.adverseRatingDatePrecision'] = adverse.anchor_precision;
  /* OWNER-POTENTIAL-ISSUE-001: values are taken only from the printed reading; a missing or unreadable label maps
     nothing and never stops an independent check. */
  const balanceAmount = printedAmount(balance.raw);
  if (balanceAmount != null) facts['account.balance'] = balanceAmount;
  const pastDueAmount = printedAmount(pastDue.raw);
  if (pastDueAmount != null) facts['account.pastDueAmount'] = pastDueAmount;
  const creditLimitAmount = printedAmount(creditLimit.raw);
  if (creditLimitAmount != null) facts['account.creditLimit'] = creditLimitAmount;
  const paymentAmount = printedAmount(monthlyPayment.raw);
  if (paymentAmount != null) facts['account.paymentAmount'] = paymentAmount;

  const readableFields = fields.map((f) => ({
    label: f.label,
    raw_value: sanitizeValue(f.value.raw) || null,
    trusted: f.value.trusted === true,
    location: f.entry ? { page: f.entry.page || null, y0: f.entry.y0, band_x0: f.entry.band } : null
  }));

  return {
    record_index: index,
    kind: 'REPORTED_ACCOUNT',
    kind_label: 'reported account',
    /* Extraction status: was this record readable at all? Applicability is a SEPARATE field, resolved by the
       shared evaluation contract, and comparison outcome is a third field. None is read as another. */
    status: name.present ? FACT_STATUS.RESOLVED : FACT_STATUS.EXTRACTION_UNRESOLVED,
    reason: name.present ? null : (name.reason || 'ACCOUNT_NAME_NOT_PRINTED_ON_THIS_RECORD'),
    normalized_value: null,
    raw_value: name.raw,
    section_path: block.section,
    /* The printed field this record is measured from when it carries one: the report's own annotation of the
       account's adverse payment rating. When it prints none, the record's own boundary label is named instead,
       so a consumer surface never has to invent one. */
    source_field: adverse.status === FACT_STATUS.RESOLVED ? adverse.source_field : 'Account name',
    boundary: { page: block.header.page, line: block.header.line, y0: block.header.y0 },
    end: { page: lastLine.page, line: lastLine.line, y1: lastLine.y1 },
    location: {
      page: block.header.page,
      line: block.header.line,
      y0: block.header.y0,
      section: block.section,
      record_index: index,
      record_starts_at: { page: block.header.page, line: block.header.line },
      record_ends_at: { page: lastLine.page, line: lastLine.line },
      columns_found: anchors.length
    },
    /* What the record PRINTED. An applicability rule reads these and decides; the family decides nothing. */
    printed: {
      status: { raw: status.raw, status: status.reason ? FACT_STATUS.EXTRACTION_UNRESOLVED : FACT_STATUS.RESOLVED, reason: status.reason },
      date_opened: { raw: dateOpened.raw, normalized: dateOpened.normalized_value, status: dateOpened.status, reason: dateOpened.reason },
      date_of_status: { raw: dateOfStatus.raw, normalized: dateOfStatus.normalized_value, status: dateOfStatus.status, reason: dateOfStatus.reason },
      first_reported: { raw: firstReported.raw, normalized: firstReported.normalized_value, status: firstReported.status, reason: firstReported.reason },
      adverse_payment_rating_date: adverse,
      recent_balance: { label: 'Recent balance', raw: balance.raw, normalized: balanceAmount != null ? balanceAmount : null, status: balance.reason ? FACT_STATUS.EXTRACTION_UNRESOLVED : FACT_STATUS.RESOLVED, reason: balance.reason, location: balance.location },
      past_due_amount: { label: 'Past due amount', raw: pastDue.raw, normalized: pastDueAmount != null ? pastDueAmount : null, status: pastDue.reason ? FACT_STATUS.EXTRACTION_UNRESOLVED : FACT_STATUS.RESOLVED, reason: pastDue.reason, location: pastDue.location },
      credit_limit: { label: 'Credit limit or original amount', raw: creditLimit.raw, normalized: creditLimitAmount != null ? creditLimitAmount : null, status: creditLimit.reason ? FACT_STATUS.EXTRACTION_UNRESOLVED : FACT_STATUS.RESOLVED, reason: creditLimit.reason, location: creditLimit.location },
      monthly_payment: { label: 'Monthly payment', raw: monthlyPayment.raw, normalized: paymentAmount != null ? paymentAmount : null, status: monthlyPayment.reason ? FACT_STATUS.EXTRACTION_UNRESOLVED : FACT_STATUS.RESOLVED, reason: monthlyPayment.reason, location: monthlyPayment.location },
      fields: readableFields,
      untrusted_field_count: readableFields.filter((f) => f.trusted === false).length,
      /* Printed controls are recorded, not read as values. Unlabelled lines are recorded as evidence. */
      controls: controls.map((c) => c.text),
      unlabelled_lines: unlabelled.map((u) => u.text)
    },
    facts
  };
}

/**
 * What the report PRINTS about public records. Only two states are evidenced from the artifact: the section
 * prints its own absence statement, or it does not. This build has no evidenced public-record ITEM structure
 * for this presentation, so it never claims that an item is present — that is left UNRESOLVED on purpose.
 */
function locatePublicRecordState(model) {
  const regions = sectionRegions(model, 'Potentially negative items');
  const allLines = documentLines(model);
  const statementLines = allLines.filter((line) => line.text.trim() === PUBLIC_RECORD_ABSENCE_STATEMENT);
  const linesBeforeFirstAccount = regions.length
    ? regions[0].lines.slice(0, Math.max(0, regions[0].lines.findIndex((l) => isAccountHeaderRow(l)))).map((l) => l.text)
    : [];
  return {
    section_printed: regions.length > 0,
    absence_statement_printed: statementLines.length > 0,
    absence_statement_text: statementLines.length ? PUBLIC_RECORD_ABSENCE_STATEMENT : null,
    absence_statement_location: statementLines.length
      ? { page: statementLines[0].page, line: statementLines[0].line, y0: statementLines[0].y0, confidence: statementLines[0].confidence }
      : null,
    lines_printed_before_the_first_account_block: linesBeforeFirstAccount,
    note: 'a state is reported only for what the presentation prints; no public-record item structure is evidenced for this presentation, so item presence is never asserted'
  };
}

function countFromPrinted(raw) {
  const text = String(raw || '').trim();
  /* The only count this presentation states is the literal word `None`. The `(?)` glyph printed beside each
     heading is a help control, not a count, and is never read as one. */
  if (/^none\.?$/i.test(text)) return 0;
  const match = text.match(/^\((\d+)\)$/);
  return match ? Number(match[1]) : null;
}

const INQUIRY_HEADINGS = Object.freeze({
  'Inquiries shared with others': 'shared_with_others',
  'Inquiries shared only with you': 'shared_only_with_you'
});

/** The two inquiry subsections this presentation prints, and the rows each prints under its own heading. */
function locateInquiries(model) {
  const out = { shared_with_others: null, shared_only_with_you: null, rows_printed: [], anomalies: [] };
  for (const region of sectionRegions(model, 'Credit inquiries')) {
    let current = null;
    for (let index = 0; index < region.lines.length; index += 1) {
      const line = region.lines[index];
      const text = line.text.trim();
      const headingKey = Object.keys(INQUIRY_HEADINGS)
        .find((heading) => text === heading || text.startsWith(`${heading} `));
      if (headingKey) {
        const key = INQUIRY_HEADINGS[headingKey];
        const trailing = text.slice(headingKey.length).trim();
        const next = region.lines[index + 1];
        const printed = next ? next.text.trim() : null;
        current = key;
        out[key] = {
          heading: headingKey,
          /* The glyph printed beside the heading is a control. It is recorded, never read as a value. */
          trailing_control_glyph: trailing || null,
          next_line_printed: printed,
          stated_count: countFromPrinted(printed),
          count_is_stated: countFromPrinted(printed) !== null,
          location: { page: line.page, line: line.line, y0: line.y0 },
          rows: [],
          /* Readings waiting to be paired with the other half of the printed row. */
          pending: []
        };
        continue;
      }
      const parts = text.match(/^([A-Za-z0-9 .&'-]{3,})\s+(\d{2}\/\d{2}\/\d{4})$/);
      if (current && parts && out[current]) {
        out[current].pending.push({ name: parts[1].trim(), raw: parts[2], line });
        continue;
      }
      /* This presentation sometimes prints the request date and the inquirer's name on separate lines. Both
         readings are kept and paired afterwards by position; neither is invented. */
      const dateOnly = text.replace(/^[^0-9]+/, '').match(/^(\d{2}\/\d{2}\/\d{4})$/);
      if (current && dateOnly && out[current]) {
        out[current].pending.push({ name: null, raw: dateOnly[1], line });
        continue;
      }
      const nameOnly = /^[A-Za-z][A-Za-z0-9 .&'-]{2,}$/.test(text);
      if (current && nameOnly && out[current]) {
        out[current].pending.push({ name: text, raw: null, line });
        continue;
      }
      if (current && text && text !== 'Account name Date of request(s) + Options') {
        out.anomalies.push({
          page: line.page, line: line.line,
          detail: `line under ${current} was not a readable inquiry row: ${text.slice(0, 80)}`
        });
      }
    }
    /* Pair each date reading with the nearest name reading in the same subsection. */
    for (const key of ['shared_with_others', 'shared_only_with_you']) {
      const section = out[key];
      if (!section) continue;
      const dates = section.pending.filter((p) => p.raw);
      const names = section.pending.filter((p) => p.name);
      for (const date of dates) {
        let nearest = null;
        for (const name of names) {
          if (nearest === null || Math.abs(name.line.y0 - date.line.y0) < Math.abs(nearest.line.y0 - date.line.y0)) {
            nearest = name;
          }
        }
        const { normalized, precision, reason } = normalizePrintedDate(date.raw);
        const row = {
          kind: 'CREDIT_INQUIRY',
          kind_label: 'credit inquiry',
          status: normalized ? FACT_STATUS.RESOLVED : FACT_STATUS.EXTRACTION_UNRESOLVED,
          reason,
          raw_value: date.raw,
          normalized_value: normalized,
          precision,
          sharer_name: nearest ? nearest.name : null,
          shared_with: key === 'shared_with_others' ? 'OTHERS' : 'ONLY_YOU',
          section_path: 'Credit inquiries',
          location: { page: date.line.page, line: date.line.line, y0: date.line.y0, confidence: date.line.confidence },
          facts: Object.assign(
            { 'inquiry.sharedWith': key === 'shared_with_others' ? 'OTHERS' : 'ONLY_YOU' },
            normalized ? { 'inquiry.date': normalized } : {}
          )
        };
        section.rows.push(row);
        out.rows_printed.push(row);
      }
      section.pending = [];
    }
  }
  return out;
}

/* ------------------------------------------------------------------ extraction */

/**
 * Extract the family's three record kinds and the case-level printed evidence the applicability rules read.
 * Nothing is dropped silently: a section that is not printed is reported as not printed, a section printed
 * with no record is reported as carrying no record, and those two statements never collapse into each other.
 */
function extract(model, admission) {
  const referenceDate = locateReferenceDate(model);
  const layer = model ? textLayerFor(model) : { source: null, ocr_reading: null };
  const ocrReading = layer.ocr_reading
    ? {
        engine: layer.ocr_reading.engine,
        engine_version: layer.ocr_reading.engine_version,
        raster_dpi: layer.ocr_reading.raster_dpi,
        trusted_confidence_floor: layer.ocr_reading.trusted_confidence_floor,
        geometry_source: layer.ocr_reading.geometry_source,
        refusal_reason: layer.ocr_reading.refusal_reason,
        pages: layer.ocr_reading.pages.map((p) => ({
          page: p.page, line_count: p.line_count, trusted_line_count: p.trusted_line_count, raster_pixels: p.raster_pixels
        })),
        limits: layer.ocr_reading.limits,
        no_report_text_retained: true
      }
    : null;

  if (!admission || admission.admitted !== true) {
    return {
      reference_date: referenceDate,
      records: [],
      summary: {
        status: admission ? admission.fact_status : FACT_STATUS.EXTRACTION_UNRESOLVED,
        reason: admission ? `DOCUMENT_REFUSED:${admission.refusal_reason}` : 'DOCUMENT_NOT_ADMITTED',
        records_read: 0,
        resolved_fact_count: 0,
        by_kind: {}
      },
      evidence_readings: { text_source: layer.source, ocr_reading: ocrReading, sections_printed: [] }
    };
  }

  const headingsSeen = [...new Set(documentLines(model).filter((l) => isHeading(l.text)).map((l) => l.text.trim()))].sort();
  const publicRecords = locatePublicRecordState(model);
  const accounts = accountBlocks(model).map((block, position) => buildAccountRecord(block, position + 1, model));
  const inquiries = locateInquiries(model);

  const negativeAccounts = accounts.filter((a) => a.section_path === 'Potentially negative items');
  const records = accounts.concat(inquiries.rows_printed);
  records.forEach((record, position) => { record.record_index = position + 1; });

  const resolvedCount = records.filter((r) => r.status === FACT_STATUS.RESOLVED).length;

  return {
    reference_date: referenceDate,
    records,
    summary: {
      status: resolvedCount > 0 ? FACT_STATUS.RESOLVED
        : (records.length ? FACT_STATUS.EXTRACTION_UNRESOLVED : FACT_STATUS.ABSENT_FROM_REPORT),
      reason: resolvedCount > 0 ? null : (records.length ? records[0].reason : 'NO_RECORD_OF_ANY_FAMILY_KIND'),
      records_read: records.length,
      resolved_fact_count: resolvedCount,
      by_kind: {
        PUBLIC_RECORD: {
          kind: 'PUBLIC_RECORD',
          section_printed: publicRecords.section_printed,
          records_read: 0,
          records_resolved: 0,
          status: publicRecords.absence_statement_printed ? FACT_STATUS.ABSENT_FROM_REPORT : FACT_STATUS.EXTRACTION_UNRESOLVED,
          reason: publicRecords.absence_statement_printed
            ? 'THE_SECTION_PRINTS_ITS_OWN_ABSENCE_STATEMENT'
            : 'NO_PUBLIC_RECORD_ITEM_STRUCTURE_IS_EVIDENCED_FOR_THIS_PRESENTATION'
        },
        REPORTED_ACCOUNT: {
          kind: 'REPORTED_ACCOUNT',
          section_printed: headingsSeen.includes('Potentially negative items') || headingsSeen.includes('Accounts in good standing'),
          records_read: accounts.length,
          records_resolved: accounts.filter((r) => r.status === FACT_STATUS.RESOLVED).length,
          negative_section_accounts: negativeAccounts.length,
          status: accounts.some((r) => r.status === FACT_STATUS.RESOLVED) ? FACT_STATUS.RESOLVED : FACT_STATUS.EXTRACTION_UNRESOLVED
        },
        CREDIT_INQUIRY: {
          kind: 'CREDIT_INQUIRY',
          section_printed: headingsSeen.includes('Credit inquiries'),
          records_read: inquiries.rows_printed.length,
          records_resolved: inquiries.rows_printed.filter((r) => r.status === FACT_STATUS.RESOLVED).length,
          status: inquiries.rows_printed.some((r) => r.status === FACT_STATUS.RESOLVED) ? FACT_STATUS.RESOLVED : FACT_STATUS.EXTRACTION_UNRESOLVED
        }
      }
    },
    evidence_readings: buildEvidenceReadings(layer, headingsSeen, publicRecords, inquiries, negativeAccounts, records)
  };
}

/**
 * The case-level printed evidence. This is what the applicability rules read: the report's own statements,
 * recorded raw, with the rule — and only the rule — drawing the applicability state from them.
 */
function buildEvidenceReadings(layer, headingsSeen, publicRecords, inquiries, negativeAccounts, records) {
  return {
    text_source: layer.source,
    sections_printed: headingsSeen,
    public_records: publicRecords,
    inquiries: {
      shared_with_others: inquiries.shared_with_others,
      shared_only_with_you: inquiries.shared_only_with_you,
      rows_printed: inquiries.rows_printed.length,
      anomalies: inquiries.anomalies,
      /* A completeness observation, recorded as EVIDENCE. It is not a statutory check, it is not counted as
         one, and it is never presented as a finding. Only a subsection that STATES a count is compared. */
      count_consistency: (function () {
        const parts = [];
        for (const key of ['shared_with_others', 'shared_only_with_you']) {
          const section = inquiries[key];
          if (!section) continue;
          parts.push({
            subsection: key,
            count_is_stated: section.count_is_stated,
            stated_count: section.stated_count,
            rows_printed: section.rows.length,
            consistent: section.count_is_stated ? section.stated_count === section.rows.length : null
          });
        }
        const stated = parts.filter((p) => p.count_is_stated);
        if (!stated.length) return { subsections: parts, consistent: null, reason: 'NO_INQUIRY_COUNT_IS_PRINTED' };
        const mismatched = stated.filter((p) => p.consistent === false);
        return {
          subsections: parts,
          consistent: mismatched.length === 0,
          reason: mismatched.length === 0 ? null
            : 'A_STATED_INQUIRY_COUNT_DIFFERS_FROM_THE_ROWS_THIS_PRESENTATION_PRINTS'
        };
      })()
    },
    negative_items: {
      section_printed: headingsSeen.includes('Potentially negative items'),
      accounts_printed: negativeAccounts.length,
      /* Recorded as raw printed evidence only: the printed `Status` of every account in the section. */
      printed_status_values: negativeAccounts
        .map((a) => (a.printed && a.printed.status ? a.printed.status.raw : null))
        .filter(Boolean),
      note: 'this build evidences no presentation of an account placed for collection or charged to profit or loss, so it never asserts that one is or is not present'
    },
    records_found: records.length,
    report_text_retained: false
  };
}

/** The per-record fact object a rule adapter reads. It contains ONLY this record's own values. */
function factsForRecord(record) {
  return record && record.facts ? Object.assign({}, record.facts) : {};
}

module.exports = {
  FAMILY_ID,
  FAMILY_CONTRACT,
  FAMILY_REFUSAL_REASONS,
  AUDIENCE,
  EVIDENCED_ARTIFACT_ID,
  EVIDENCED_SHA256,
  REQUIRED_SECTION_HEADINGS,
  ALL_HEADINGS,
  ACCOUNT_HEADER_LABELS,
  ACCOUNT_LABELS,
  REFERENCE_DATE_LABEL,
  PUBLIC_RECORD_ABSENCE_STATEMENT,
  PAYMENT_HISTORY_GUIDE_HEADING,
  ADVERSE_RATING_FORM,
  WRONG_CHANNEL_MARKERS,
  CONSUMER_CHANNEL_MARKERS,
  textLayerFor,
  admissionPredicates,
  admit,
  extract,
  factsForRecord,
  documentLines,
  isHeading,
  sectionRegions,
  wordRows,
  columnAnchors,
  scanBand,
  normalizePrintedDate,
  sanitizeValue,
  locateReferenceDate,
  locatePublicRecordState,
  locateInquiries,
  accountBlocks,
  locateAdverseRating,
  squash
};
