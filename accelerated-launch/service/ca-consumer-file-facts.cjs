'use strict';
/**
 * ca-consumer-file-facts.cjs — the FACTUAL VIEW of the admitted Canadian consumer credit file.
 *
 * OWNER-ALL82-001 / B3 continuation. The owner authorized "useful report consistency/completeness
 * observations ... whose meaning is demonstrable from printed report facts" for Canada, and directed that
 * they "do not require the unresolved country-wide PIPEDA record". This module is the reading half of that
 * work: it produces a bounded view of what the admitted presentation PRINTS, and decides nothing.
 *
 * It is a THIRD surface, deliberately not a rule adapter:
 *   • A rule adapter binds a RECORDED LEGAL RULE to a jurisdiction, a period and an anchor, and is
 *     applicability-gated by `applicability.cjs` and the explicit per-region records.
 *   • This module binds NOTHING. It reads the presentation's own printed facts — its summary captions, its
 *     item records and its report date — so that a factual comparison can be computed and reported without
 *     any statutory instrument being named, invented or implied.
 *
 * There is no PIPEDA provision here, no national applicability relation, and no legal question of any kind.
 *
 * Boundaries this module keeps:
 *   • IT REPORTS PRINTED FACTS, NOT CONCLUSIONS. Every field it returns is a label the report prints and the
 *     token that follows it, with the page and line it was printed on.
 *   • A MISSING LABEL IS NOT A BLANK LABEL IS NOT A MALFORMED VALUE. `NOT_PRINTED`,
 *     `LABEL_PRINTED_WITHOUT_VALUE`, `VALUE_MALFORMED_PRINTED_FORM` and `VALUE` are four distinct states
 *     and are never collapsed. A read failure on the page is a fifth and is never a blank.
 *   • IT READS ONLY WHAT IT CAN BIND. The account sections print a two-column block in which a label and its
 *     value can fall on different lines. The own Overview schema and native word geometry bind those
 *     columns; missing geometry cannot supply an association. A value that cannot be bound is unread.
 *   • IT RETAINS NO REPORT TEXT OR FULL IDENTIFIER. It returns labels, named facts, literal masked
 *     identifiers, privacy tokens for creditor matching, and source locations. Historical collection
 *     identifier readings remain redacted. Unmasked account/member numbers never leave this module.
 *   • IT NEVER MATCHES TWO RECORDS BY NAME. Two similar creditor names are not the same account, and a name
 *     is never an input to the grouping.
 */

const crypto = require('node:crypto');
const { printedAmount } = require('./report-amount.cjs');
const { FACT_STATUS } = require('../../internal-validation/ca-ns-last-payment-six-year/constants.cjs');
const {
  locateRequestDate, locateCollectionsSection, locateDebtRecords, tokenAfter, normalizePrintedDate
} = require('../../internal-validation/ca-ns-last-payment-six-year/locators.cjs');

const READER_ID = 'CA-EQUIFAX-CONSUMER-FILE-FACTS';
const PRESENTATION_ID = 'PR-01';

/** The top-level headings this reader recognises. A heading ends the region it is not. */
const HEADINGS = Object.freeze([
  'Personal Info', 'Credit Score', 'Employment', 'Accounts',
  'Accounts - Revolving', 'Accounts - Mortgage', 'Accounts - Installment', 'Accounts - Open',
  'Delinquencies', 'Payment History', 'Inquiries', 'Public Records',
  'Bankruptcy', 'Consolidated Debt', 'Collections', 'Debt Recovery', 'Judgments', 'Secured Loans',
  'Bank Information Reported', 'Alerts, Disclosures And Contact History', 'Contact Us', 'Contact TransUnion'
]);

/** The two printed summary blocks that state a count per category. */
const SUMMARY_BLOCKS = Object.freeze(['Accounts', 'Public Records']);

/** A printed category caption: a name, then its count, alone on its line. */
const SUMMARY_CAPTION = /^\s*([A-Za-z][A-Za-z'\- ]*?)\s*\((\d+)\)\s*$/;

/** The report's own affirmative statement that a category carries nothing. It is a statement, not a blank. */
const ABSENCE_STATEMENT = /You currently have no\s+(.+?)\s+(?:reported\s+)?on your credit file/i;

/** The printed marker that begins one account block inside an account section. */
const ACCOUNT_ITEM_BOUNDARY = /^\s*Overview\s*$/;

/** The label a collection record prints for the date of first delinquency. */
const FIRST_DELINQUENCY = 'First Delinquency';

/** The pair of printed identifiers that, together, securely match two records to one debt. */
const SECURE_IDENTIFIER_LABELS = Object.freeze(['Member Number', 'Account Number']);

/**
 * Labels whose printed value is used ONLY to match records to each other and is then dropped. The value
 * never leaves this module: the record's `raw` is cleared and `value_retained` records that it was read.
 */
const IDENTIFIER_LABELS = Object.freeze(['Member Number', 'Account Number']);

/** Every date the collection records print, so the reader's date set is explicit and closed. */
const COLLECTION_DATE_LABELS = Object.freeze([
  'Date Assigned', FIRST_DELINQUENCY, 'Date Paid/Settled', 'Date Verified', 'Last Payment Date'
]);

/** Every non-date field the reader names. A non-date token is never parsed as a date. */
const COLLECTION_TEXT_LABELS = Object.freeze(['Member Number', 'Account Number', 'Amount', 'Balance', 'Status']);

const COLLECTION_LABELS = Object.freeze(COLLECTION_DATE_LABELS.concat(COLLECTION_TEXT_LABELS));

/** The label that begins a collection record. It is the unit's own record boundary label. */
const RECORD_BOUNDARY_LABEL = 'Date Assigned';

/**
 * The presentation prints with typographic ligatures and curly punctuation. Matching is done on a readable
 * copy; the token that is RETAINED is always the token exactly as printed.
 */
function readable(text) {
  return String(text === undefined || text === null ? '' : text)
    .replace(/\uFB01/g, 'fi').replace(/\uFB02/g, 'fl')
    .replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-').replace(/\u00A0/g, ' ');
}

/** All lines of the model, in document order, with their page and one-based line number. */
function documentLines(model) {
  const lines = [];
  for (const page of model.pages) {
    page.lines.forEach((text, index) => lines.push({ page: page.page, line: index + 1, text }));
  }
  return lines;
}

function isHeading(text) {
  return HEADINGS.includes(String(text).trim());
}

/** The lines that follow `heading`, ending at the next heading, in document order. */
function sectionLines(model, heading) {
  const lines = documentLines(model);
  const out = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].text.trim() !== heading) continue;
    let end = lines.length;
    for (let j = i + 1; j < lines.length; j += 1) {
      if (isHeading(lines[j].text)) { end = j; break; }
    }
    out.push(...lines.slice(i + 1, end));
  }
  return out;
}

/** True when the presentation prints the heading, whether or not it prints anything under it. */
function headingPrinted(model, heading) {
  return documentLines(model).some((l) => l.text.trim() === heading);
}

/** Which pages the model could not read at all. A read failure is not an empty page. */
function unreadPages(model) {
  return model.read_errors.filter((e) => e.stage === 'pdftotext' && e.page).map((e) => e.page);
}

/**
 * One printed value in one record. The states are exhaustive and are never collapsed: VALUE,
 * VALUE_MALFORMED_PRINTED_FORM (a date label whose token is not this presentation's printed form),
 * LABEL_PRINTED_WITHOUT_VALUE, NOT_PRINTED, and PAGE_NOT_READ. A non-date label is never parsed as a date.
 */
function printedValue(label, occurrence, pageUnread, isDate) {
  if (pageUnread) {
    return { label, state: 'PAGE_NOT_READ', raw: null, normalized: null, reason: 'THE_PAGE_CARRYING_THIS_RECORD_COULD_NOT_BE_READ', location: null };
  }
  if (!occurrence) return { label, state: 'NOT_PRINTED', raw: null, normalized: null, reason: 'LABEL_NOT_PRINTED_ON_THIS_RECORD', location: null };
  const { page, line, token, value_present: present } = occurrence;
  const location = { page, line, label };
  if (!present) {
    return { label, state: 'LABEL_PRINTED_WITHOUT_VALUE', raw: null, normalized: null, reason: 'LABEL_PRINTED_WITHOUT_VALUE', location };
  }
  if (!isDate) return { label, state: 'VALUE', raw: token, normalized: null, reason: null, location };
  const { normalized, reason } = normalizePrintedDate(token);
  if (!normalized) {
    return { label, state: 'VALUE_MALFORMED_PRINTED_FORM', raw: token, normalized: null, reason, location };
  }
  return { label, state: 'VALUE', raw: token, normalized, reason: null, location };
}

/**
 * Every occurrence of `label` inside one record region, read from the de-ligatured line. The label must be
 * the first thing the line prints, so a label mentioned inside prose is never a record's field.
 */
function hitsIn(region, label) {
  const hits = [];
  for (const entry of region) {
    const text = readable(entry.text);
    const at = text.indexOf(label);
    if (at === -1) continue;
    if (text.slice(0, at).trim() !== '') continue;
    const after = text.slice(at + label.length);
    if (after.length > 0 && !/^\s/.test(after)) continue;
    /* Status phrases and money readings require their complete caption value. A leading token can
       turn PAID AS AGREED into PAID, lose a spaced currency/sign, or hide damaged trailing text. */
    const completeValue = ['Status', 'Balance', 'Amount'].includes(label);
    let cut = after.length;
    if (completeValue) {
      for (const nextLabel of COLLECTION_LABELS) {
        if (nextLabel === label) continue;
        let nextAt = after.indexOf(nextLabel);
        while (nextAt !== -1) {
          if ((nextAt === 0 || /\s/.test(after.charAt(nextAt - 1)))
            && (nextAt + nextLabel.length === after.length || /\s/.test(after.charAt(nextAt + nextLabel.length)))) {
            cut = Math.min(cut, nextAt);
            break;
          }
          nextAt = after.indexOf(nextLabel, nextAt + 1);
        }
      }
    }
    const token = completeValue ? after.slice(0, cut).trim() : (after.match(/\S+/) || [''])[0];
    hits.push({ label, page: entry.page, line: entry.line, token, value_present: token.length > 0 });
  }
  return hits;
}

/* ------------------------------------------------------------------ the printed summary captions */

/**
 * Every printed `<Category> (n)` caption, attributed to the summary block it sits in. A caption is read only
 * inside a block the presentation prints as a summary (`Accounts`, `Public Records`); a parenthesised number
 * anywhere else is not a caption and is not read as one.
 */
function summaryCaptions(model) {
  const captions = [];
  let block = null;
  for (const entry of documentLines(model)) {
    const text = entry.text.trim();
    if (isHeading(text)) {
      block = SUMMARY_BLOCKS.includes(text) ? text : null;
      continue;
    }
    if (!block) continue;
    const match = SUMMARY_CAPTION.exec(readable(entry.text));
    if (!match) continue;
    captions.push({
      summary_block: block,
      category: match[1].trim(),
      stated_count: Number(match[2]),
      location: { page: entry.page, line: entry.line }
    });
  }
  return captions;
}

/* ------------------------------------------------------------------ the item sections those captions count */

/**
 * Measure one category's section. It is EXAMINABLE only when the report prints the section AND prints
 * something this build can count inside it: either its own affirmative absence statement, or its own item
 * boundary. A section that prints neither is reported NOT_EXAMINABLE with the reason, and its count is never
 * assumed to be zero.
 */
function assessSection(model, heading, measure) {
  const base = {
    section_heading: heading, section_printed: false, item_boundary: null, printed_item_count: null,
    absence_statement_printed: false, absence_statement_location: null, examinable: false, reason: null
  };
  if (!headingPrinted(model, heading)) {
    return Object.assign(base, { reason: 'THE_SECTION_THIS_COUNT_REFERS_TO_IS_NOT_PRINTED_BY_THIS_PRESENTATION' });
  }
  const lines = sectionLines(model, heading);
  const unread = new Set(unreadPages(model));
  const unreadInSection = [...new Set(lines.filter((l) => unread.has(l.page)).map((l) => l.page))];
  if (unreadInSection.length) {
    return Object.assign(base, {
      section_printed: true,
      reason: 'A_PAGE_CARRYING_THIS_SECTION_COULD_NOT_BE_READ',
      pages_not_read: unreadInSection
    });
  }
  const absence = lines.find((l) => ABSENCE_STATEMENT.test(readable(l.text)));
  const measured = measure(lines);
  return Object.assign(base, {
    section_printed: true,
    item_boundary: measured.item_boundary,
    printed_item_count: measured.count,
    absence_statement_printed: Boolean(absence),
    absence_statement_location: absence ? { page: absence.page, line: absence.line } : null,
    examinable: measured.count > 0 || Boolean(absence),
    reason: measured.count > 0 || absence ? null : 'THE_SECTION_PRINTS_NO_ITEM_BOUNDARY_THIS_BUILD_RECOGNISES'
  });
}

/** Count the account blocks a section prints, by the boundary marker the presentation prints for each. */
function countAccountBlocks(lines) {
  const hits = lines.filter((l) => ACCOUNT_ITEM_BOUNDARY.test(readable(l.text)));
  return { count: hits.length, item_boundary: 'Overview', locations: hits.map((h) => ({ page: h.page, line: h.line })) };
}

/* ------------------------------------------------------------------ the collection records */

/**
 * The collection records, located by the unit's own record boundary so the record indexes the checks report
 * are the same indexes the statutory path already uses.
 *
 * The token that follows a label is read from a de-ligatured copy of the line, because this presentation
 * prints typographic ligatures inside some labels (`Date Veriﬁed`, `Narrative`). Matching on the readable
 * form is what keeps a printed label from being mis-reported as a label the report does not print; the token
 * that is RETAINED is the token as printed.
 */
function collectionRecords(model, section) {
  if (!section || section.status !== FACT_STATUS.RESOLVED) {
    return {
      status: section ? section.status : FACT_STATUS.EXTRACTION_UNRESOLVED,
      reason: section ? section.reason : 'SECTION_NOT_LOCATED',
      records: [],
      not_a_debt_record_count: 0
    };
  }
  const lines = section.lines || [];
  const starts = [];
  lines.forEach((entry, index) => {
    if (readable(entry.text).includes(RECORD_BOUNDARY_LABEL) && readable(entry.text).slice(0, readable(entry.text).indexOf(RECORD_BOUNDARY_LABEL)).trim() === '') starts.push(index);
  });
  const unitRecords = locateDebtRecords(section).records;
  const unread = new Set(unreadPages(model));

  const records = starts.map((start, position) => {
    const end = position + 1 < starts.length ? starts[position + 1] : lines.length;
    const region = lines.slice(start, end);
    const index = position + 1;
    let anyUnread = false;
    for (let p = region[0].page; p <= region[region.length - 1].page; p += 1) if (unread.has(p)) anyUnread = true;
    const printed = {};
    for (const label of COLLECTION_LABELS) {
      const hits = hitsIn(region, label);
      printed[label] = Object.assign(
        printedValue(label, hits[0] || null, anyUnread, COLLECTION_DATE_LABELS.includes(label)),
        { printed_times_in_record: hits.length }
      );
    }
    const unitRecord = unitRecords.find((r) => r.record_index === index) || null;
    return {
      record_index: index,
      kind: 'COLLECTION',
      kind_label: 'collection account',
      section: 'Collections',
      debt_record: Boolean(unitRecord && unitRecord.debt_record),
      not_a_debt_record_reason: unitRecord ? unitRecord.not_a_debt_record_reason : null,
      boundary: { page: region[0].page, line: region[0].line },
      end: { page: region[region.length - 1].page, line: region[region.length - 1].line },
      page_read_failure: anyUnread,
      printed
    };
  });
  return {
    status: FACT_STATUS.RESOLVED,
    reason: null,
    records,
    not_a_debt_record_count: records.filter((r) => !r.debt_record).length
  };
}

/**
 * Group records that print the SAME secure identifiers — a member number AND an account number, each
 * printed once with a value. A name is NEVER an input: two similar creditor names are not the same account.
 * Only the record indexes leave this function; the identifiers are hashed and discarded.
 */
function identityGroups(records) {
  const byKey = new Map();
  for (const record of records) {
    const parts = SECURE_IDENTIFIER_LABELS.map((label) => {
      const field = record.printed[label];
      if (!field || field.state !== 'VALUE' || field.printed_times_in_record !== 1) return null;
      return readable(field.raw).trim();
    });
    if (parts.some((p) => !p)) continue;
    const key = crypto.createHash('sha256').update(parts.join('\u0000')).digest('hex').slice(0, 16);
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(record.record_index);
  }
  return [...byKey.values()]
    .filter((indexes) => indexes.length > 1)
    .map((indexes) => ({ record_indexes: indexes.slice().sort((a, b) => a - b), matched_on: [...SECURE_IDENTIFIER_LABELS] }));
}

/* ------------------------------------------------------------------ the view */

/** The section a printed caption's count refers to. */
function sectionHeadingFor(caption) {
  return caption.summary_block === 'Accounts' ? `Accounts - ${caption.category}` : caption.category;
}

/**
 * Assess one caption's section. The collections category is measured through this build's own collection
 * record boundary; every other category is measured by the account boundary marker the presentation prints.
 */
function assessBlockSection(model, caption, collections) {
  const heading = sectionHeadingFor(caption);
  const isCollections = caption.summary_block === 'Public Records' && caption.category === 'Collections';
  if (!isCollections) return assessSection(model, heading, countAccountBlocks);
  const base = {
    section_heading: heading, section_printed: headingPrinted(model, heading), item_boundary: 'Date Assigned',
    printed_item_count: null, absence_statement_printed: false, absence_statement_location: null,
    examinable: false, reason: null
  };
  if (!base.section_printed) {
    return Object.assign(base, { reason: 'THE_SECTION_THIS_COUNT_REFERS_TO_IS_NOT_PRINTED_BY_THIS_PRESENTATION' });
  }
  if (collections.status !== FACT_STATUS.RESOLVED) return Object.assign(base, { reason: collections.reason });
  return Object.assign(base, { printed_item_count: collections.records.length, examinable: true });
}

/**
 * Drop the printed value of an identifier once it has done its job. The matching already happened; what
 * remains is only whether the label was printed with a value, so no member number and no account number is
 * ever returned by this module.
 */
function redactIdentifiers(record) {
  const printed = {};
  for (const [label, value] of Object.entries(record.printed)) {
    printed[label] = IDENTIFIER_LABELS.includes(label)
      ? Object.assign({}, value, {
        raw: null,
        printed_with_a_value: value.state === 'VALUE',
        value_retained: false,
        not_retained_because: 'THIS_PRINTED_VALUE_WAS_USED_ONLY_TO_MATCH_RECORDS_AND_IS_NOT_RETURNED'
      })
      : value;
  }
  return Object.assign({}, record, { printed });
}

/* PR-01's ordinary account tables use positioned, wrapped captions. Values sit between
   caption baselines: text-line adjacency cannot bind them to the correct column. Read
   only the measured native geometry inside an own Overview block. No family admission
   or whole-report text fallback is introduced here. */
function decodedWord(text) {
  return readable(String(text || '').replace(/\uFB00/g, 'ff').replace(/\uFB03/g, 'ffi')
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (raw, n) => {
      const code = n[0].toLowerCase() === 'x' ? parseInt(n.slice(1), 16) : Number(n);
      return code <= 0x10ffff ? String.fromCodePoint(code) : raw;
    })
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'"));
}

function textKey(text) { return decodedWord(text).replace(/\s+/g, ' ').trim(); }

function nativeRows(page) {
  const rows = [];
  for (const word of (page.word_boxes || []).slice().sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0)) {
    if (![word.x0, word.y0, word.x1, word.y1].every(Number.isFinite)) continue;
    let row = rows.find((r) => Math.abs(r.y - word.y0) <= 2);
    if (!row) { row = { y: word.y0, words: [] }; rows.push(row); }
    row.words.push({ ...word, text: decodedWord(word.text) });
  }
  const native = page.lines.map((line, index) => ({ text: textKey(line), line: index + 1 }));
  for (const row of rows) {
    row.words.sort((a, b) => a.x0 - b.x0);
    const joined = (items) => textKey(items.flatMap((r) => r.words).sort((a, b) => a.x0 - b.x0).map((w) => w.text).join(' '));
    const next = rows.find((r) => r.y > row.y && r.y - row.y <= 8), previous = rows.slice().reverse().find((r) => r.y < row.y && row.y - r.y <= 8);
    const choices = [[row], ...(next ? [[row, next]] : []), ...(previous ? [[previous, row]] : [])];
    const choice = choices.find((items) => native.some((line) => line.text === joined(items)));
    row.matchText = choice ? joined(choice) : null;
    row.matchY = choice ? Math.min(...choice.map((r) => r.y)) : row.y;
  }
  for (const row of rows) {
    const matches = row.matchText ? native.filter((line) => line.text === row.matchText) : [];
    const physical = [...new Set(rows.filter((r) => r.matchText === row.matchText).map((r) => r.matchY))].sort((a, b) => a - b);
    row.line = matches.length === 1 ? matches[0].line : matches.length && matches.length === physical.length
      ? matches[physical.indexOf(row.matchY)].line : null;
  }
  return rows;
}

function wordsLocation(page, rows, words, label) {
  if (!words.length) return null;
  const row = rows.find((r) => Math.abs(r.y - words[0].y0) <= 2);
  return { page: page.page, line: row && row.line, label, source: 'NATIVE_TEXT',
    bbox: { x0: Math.min(...words.map((w) => w.x0)), y0: Math.min(...words.map((w) => w.y0)),
      x1: Math.max(...words.map((w) => w.x1)), y1: Math.max(...words.map((w) => w.y1)), units: 'pt' },
    trusted: words.every((w) => w.trusted !== false) };
}

function captionReadings(page, rows, label, minX, maxX, minY, maxY) {
  const want = label.toLowerCase();
  const candidates = rows.filter((r) => r.y >= minY && r.y < maxY)
    .map((r) => ({ y: r.y, words: r.words.filter((w) => w.x0 >= minX && w.x0 < maxX) }))
    .filter((r) => r.words.length);
  const found = [];
  for (let i = 0; i < candidates.length; i += 1) {
    const first = candidates[i], next = candidates[i + 1];
    const a = textKey(first.words.map((w) => w.text).join(' ')).toLowerCase();
    const wrapped = next && next.y - first.y <= 18
      ? first.words.concat(next.words) : null;
    const b = wrapped && textKey(wrapped.map((w) => w.text).join(' ')).toLowerCase();
    if (a === want || b === want) found.push({ words: a === want ? first.words : wrapped,
      top: first.y, bottom: a === want ? first.y : next.y });
  }
  return found;
}

function positionedReading(page, rows, label, captions, valueMin, valueMax, normalize) {
  const base = { label, raw: null, normalized: null, printed_times_in_record: captions.length,
    state: captions.length ? 'LABEL_PRINTED_WITHOUT_VALUE' : 'NOT_PRINTED', reason: 'LABEL_NOT_PRINTED_ON_THIS_RECORD',
    location: null };
  if (!captions.length) return base;
  const readings = captions.map((caption) => {
    const values = rows.filter((r) => r.y >= caption.top - 1 && r.y <= caption.bottom + 12)
      .flatMap((r) => r.words.filter((w) => w.x0 >= valueMin && w.x0 < valueMax));
    const raw = textKey(values.map((w) => w.text).join(' '));
    const captionLocation = wordsLocation(page, rows, caption.words, label);
    const location = wordsLocation(page, rows, values, label) || (captionLocation && { ...captionLocation });
    if (location) location.caption_location = captionLocation;
    const trusted = caption.words.concat(values).every((w) => w.trusted !== false);
    const value = raw && trusted ? normalize(raw) : null;
    return { ...base, raw: raw || null, normalized: value, location,
      trusted, state: !trusted ? 'SOURCE_UNTRUSTED' : !raw ? 'LABEL_PRINTED_WITHOUT_VALUE'
        : value == null ? 'VALUE_MALFORMED_PRINTED_FORM' : 'VALUE',
      reason: !trusted ? 'CAPTION_OR_VALUE_WORD_UNTRUSTED' : !raw ? 'LABEL_PRINTED_WITHOUT_VALUE'
        : value == null ? 'VALUE_NOT_SUPPORTED_BY_PRINTED_CAPTION' : null };
  });
  if (readings.length === 1) return readings[0];
  return { ...base, state: 'VALUE_AMBIGUOUS_PRINTED_FORM', reason: 'MULTIPLE_OWN_CAPTION_READINGS',
    location: readings[0].location, printed_readings: readings };
}

function maskedValue(raw) {
  const m = /^[*#Xx\u2022\u00b7]{2,}\s*-?\s*(\d{3,4})$/.exec(raw);
  return m ? `MASK-${m[1].padStart(4, '0')}` : null;
}

function nameToken(raw) {
  const name = textKey(raw).toUpperCase();
  return name ? `CREDITOR-${crypto.createHash('sha256').update(name).digest('hex').slice(0, 24)}` : null;
}

function putShared(reading, field, facts, sources) {
  if (!reading || reading.state !== 'VALUE' || reading.normalized == null || !reading.location
    || reading.location.trusted === false || reading.trusted === false || reading.printed_times_in_record !== 1) return;
  facts[field] = reading.normalized;
  sources[field] = { raw_value: reading.raw, normalized_value: reading.normalized, source_field: reading.label,
    location: reading.location, caption_count: 1, status: FACT_STATUS.RESOLVED,
    ...(reading.precision ? { precision: reading.precision } : {}),
    ...(reading.privacy_redacted ? { privacy_redacted: true } : {}) };
}

function ordinaryRecords(model) {
  const records = [], unread = new Set(unreadPages(model));
  for (const page of model.pages) {
    const rows = nativeRows(page);
    if (!rows.length) continue;
    let section = null;
    const starts = [];
    page.lines.forEach((line, index) => {
      const text = textKey(line);
      if (isHeading(text)) section = /^Accounts - /.test(text) ? text : null;
      if (text === 'Overview' && section) starts.push({ index, section });
    });
    for (let n = 0; n < starts.length; n += 1) {
      const start = starts[n], overview = rows.find((r) => r.line === start.index + 1);
      if (!overview) continue;
      const next = starts[n + 1], nextRow = next && rows.find((r) => r.line === next.index + 1);
      const stopLine = page.lines.findIndex((line, i) => i > start.index && isHeading(textKey(line)));
      const stopRow = stopLine >= 0 && rows.find((r) => r.line === stopLine + 1);
      const maxY = Math.min(nextRow ? nextRow.y : Infinity, stopRow ? stopRow.y : Infinity);
      const region = rows.filter((r) => r.y > overview.y && r.y < maxY);
      const words = region.flatMap((r) => r.words);
      const header = words.filter((w) => w.y0 < overview.y + 65);
      const account = header.find((w) => w.text === 'Account'), number = account && header.find((w) =>
        w.text === 'Number' && Math.abs(w.x0 - account.x0) < 2 && w.y0 > account.y0 && w.y0 - account.y0 <= 18);
      const phone = header.find((w) => w.text === 'Phone'), highest = header.find((w) => w.text === 'Highest');
      const notes = header.find((w) => w.text === 'Notes'), member = header.find((w) => w.text === 'Member');
      const panel = region.find((r) => textKey(r.words.filter((w) => account && w.x0 >= account.x0 - 1
        && phone && w.x0 < phone.x0).map((w) => w.text).join(' ')) === 'Balance And');
      if (!account || !number || !phone || !highest || !notes || !member || !panel
        || !(account.x0 < phone.x0 && phone.x0 < highest.x0 && highest.x0 < notes.x0 && notes.x0 < member.x0)) continue;
      const printed = {}, facts = {}, sources = {};
      const tableFloor = Math.max(...header.filter((w) => w.y0 <= number.y0 + 2).map((w) => w.y1));
      const idCaptions = captionReadings(page, rows, 'Account Number', account.x0 - 1, phone.x0,
        overview.y + 1, tableFloor + 1);
      const idWords = words.filter((w) => w.x0 >= account.x0 - 1 && w.x0 < phone.x0
        && w.y0 > tableFloor && w.y0 < panel.y);
      const idLocation = wordsLocation(page, rows, idWords, 'Account Number') || wordsLocation(page, rows, [account, number], 'Account Number');
      idLocation.caption_location = wordsLocation(page, rows, [account, number], 'Account Number');
      const idRaw = textKey(idWords.map((w) => w.text).join(' '));
      printed['Account Number'] = { label: 'Account Number', state: !idRaw ? 'LABEL_PRINTED_WITHOUT_VALUE'
        : maskedValue(idRaw) == null ? 'VALUE_MALFORMED_PRINTED_FORM' : 'VALUE',
        raw: maskedValue(idRaw) == null ? null : idRaw, normalized: maskedValue(idRaw),
        printed_times_in_record: idCaptions.length, trusted: [account, number, ...idWords].every((w) => w.trusted !== false),
        location: idLocation };
      if (!printed['Account Number'].trusted) {
        printed['Account Number'].state = 'SOURCE_UNTRUSTED'; printed['Account Number'].normalized = null;
      }
      if (idCaptions.length !== 1) {
        printed['Account Number'].state = 'VALUE_AMBIGUOUS_PRINTED_FORM'; printed['Account Number'].normalized = null;
      }
      const noteWords = words.filter((w) => w.x0 >= notes.x0 - 1 && w.x0 < member.x0
        && w.y0 > tableFloor && w.y0 < panel.y);
      const noteRaw = textKey(noteWords.map((w) => w.text).join(' '));
      const closed = /\bclosed by (?:credit grantor|consumer)\b/i.test(noteRaw);
      const hasOpen = /\b(?:open|active)\b/i.test(noteRaw);
      const open = /^(?:Open|Active|Account(?: is)? (?:open|active))$/i.test(noteRaw);
      const noteLocation = wordsLocation(page, rows, noteWords, 'Notes') || wordsLocation(page, rows, [notes], 'Notes');
      noteLocation.caption_location = wordsLocation(page, rows, [notes], 'Notes');
      const noteCaptionCount = header.filter((w) => w.text === 'Notes' && Math.abs(w.x0 - notes.x0) < 2).length;
      printed.Notes = { label: 'Notes', raw: noteRaw || null, normalized: closed && !hasOpen ? 'CLOSED' : !closed && open ? 'OPEN' : null,
        state: !noteRaw ? 'LABEL_PRINTED_WITHOUT_VALUE' : closed && hasOpen ? 'VALUE_AMBIGUOUS_PRINTED_FORM'
          : closed || open ? 'VALUE' : 'VALUE_MALFORMED_PRINTED_FORM',
        location: noteLocation, printed_times_in_record: noteCaptionCount, trusted: header.filter((w) => w.text === 'Notes').concat(noteWords).every((w) => w.trusted !== false) };
      if (!printed.Notes.trusted) { printed.Notes.state = 'SOURCE_UNTRUSTED'; printed.Notes.normalized = null; }
      if (noteCaptionCount !== 1) { printed.Notes.state = 'VALUE_AMBIGUOUS_PRINTED_FORM'; printed.Notes.normalized = null; }
      const panelMin = panel.y + 25, details = region.find((r) => textKey(r.words.filter((w) =>
        w.x0 >= account.x0 - 1 && w.x0 < highest.x0).map((w) => w.text).join(' ')) === 'Payment Details');
      const panelMax = details ? details.y : maxY;
      for (const [caption, field] of [['Balance', 'account.balance'], ['Credit Limit', 'account.creditLimit'],
        ['Amount Past Due', 'account.pastDueAmount'], ['Payment Due', 'account.scheduledPaymentAmount'],
        ['Actual payment', 'account.actualPaymentAmount'], ['Amount Written Off', 'tradeline.writtenOffAmount']]) {
        const caps = captionReadings(page, rows, caption, account.x0 - 1, phone.x0, panelMin, panelMax);
        printed[caption] = positionedReading(page, rows, caption, caps, phone.x0, highest.x0, printedAmount);
        putShared(printed[caption], field, facts, sources);
      }
      for (const [caption, field] of [['Opened', 'liability.openedDate'], ['Last Reported', 'account.lastReportedDate'],
        ['Last Payment', 'tradeline.lastPaymentDate'], ['Date Closed', 'liability.closedDate']]) {
        const caps = captionReadings(page, rows, caption, highest.x0 - 1, notes.x0, panelMin, panelMax);
        printed[caption] = positionedReading(page, rows, caption, caps, notes.x0, member.x0,
          (raw) => normalizePrintedDate(raw).normalized);
        printed[caption].precision = 'DAY';
        putShared(printed[caption], field, facts, sources);
      }
      printed['Closed Date'] = printed['Date Closed'];
      const roleCaps = captionReadings(page, rows, 'Payment Responsibility', account.x0 - 1, highest.x0,
        details ? details.y + 1 : panelMax, maxY);
      printed['Payment Responsibility'] = positionedReading(page, rows, 'Payment Responsibility', roleCaps,
        highest.x0, member.x0, (raw) => /^(?:Individual|Joint)$/i.test(raw) ? raw.toUpperCase() : null);
      putShared(printed['Payment Responsibility'], 'account.responsibility', facts, sources);
      putShared(printed['Account Number'], 'account.masked_identifier', facts, sources);
      putShared(printed.Notes, 'account.status', facts, sources);
      const previous = page.lines.slice(0, start.index).map((line, i) => ({ text: textKey(line), line: i + 1 }))
        .filter((line) => line.text).at(-1);
      const previousRow = previous && rows.find((r) => r.line === previous.line);
      if (previous && previousRow && !isHeading(previous.text)
        && !/\b(?:Credit Report|Request Date)\b/i.test(previous.text)
        && overview.y - previousRow.y >= 10 && overview.y - previousRow.y <= 40
        && Math.abs(previousRow.words[0].x0 - account.x0) <= 2) {
        const creditorRows = rows.filter((r) => r.line === previous.line);
        const creditorWords = creditorRows.flatMap((r) => r.words);
        const token = nameToken(previous.text), location = wordsLocation(page, rows, creditorWords, 'Creditor Name (account heading)');
        const reading = { label: 'Creditor Name (account heading)', raw: token, normalized: token,
          state: token && location ? 'VALUE' : 'SOURCE_UNTRUSTED', location, trusted: creditorWords.every((w) => w.trusted !== false),
          printed_times_in_record: 1, privacy_redacted: true };
        printed['Creditor Name'] = reading; putShared(reading, 'account.reported_identity', facts, sources);
      }
      if (unread.has(page.page)) {
        for (const reading of Object.values(printed)) { reading.state = 'PAGE_NOT_READ'; reading.normalized = null; }
        for (const key of Object.keys(facts)) delete facts[key];
        for (const key of Object.keys(sources)) delete sources[key];
      }
      const report_status_statements = printed.Notes.raw && printed.Notes.trusted
        && printed.Notes.printed_times_in_record === 1 && printed.Notes.state !== 'VALUE_AMBIGUOUS_PRINTED_FORM'
        && !unread.has(page.page) && printed.Notes.location && printed.Notes.location.trusted !== false
        ? [{ raw_value: printed.Notes.raw, meaning: printed.Notes.raw, location: printed.Notes.location,
          source_field: 'Notes', caption_count: 1, trusted: true }] : [];
      records.push({ record_index: records.length + 1, kind: 'CA_EQUIFAX_ORDINARY_ACCOUNT', kind_label: 'credit account',
        section: start.section, status: unread.has(page.page) ? FACT_STATUS.EXTRACTION_UNRESOLVED : FACT_STATUS.RESOLVED,
        boundary: { page: page.page, line: start.index + 1 }, end: { page: page.page, line: stopLine >= 0 ? stopLine : page.lines.length },
        printed, facts, fact_sources: sources, report_status_statements });
    }
  }
  return records;
}

function collectionSharedIdentity(record, model) {
  const facts = {}, fact_sources = {}, account = record.printed['Account Number'];
  if (record.page_read_failure) return { facts, fact_sources };
  const normalized = account.state === 'VALUE' && account.printed_times_in_record === 1
    ? maskedValue(textKey(account.raw)) : null;
  const ownLocation = (reading) => {
    const page = model.pages.find((p) => p.page === reading.location.page), rows = nativeRows(page);
    const row = rows.find((r) => r.line === reading.location.line);
    return row ? wordsLocation(page, rows, row.words, reading.label)
      : { ...reading.location, trusted: !(page.word_boxes || []).length };
  };
  if (normalized) putShared({ ...account, normalized, location: ownLocation(account) }, 'account.masked_identifier', facts, fact_sources);
  const member = record.printed['Member Number'];
  if (member && member.state === 'VALUE' && member.printed_times_in_record === 1 && member.raw) {
    const value = readable(member.raw).toUpperCase().replace(/[\s-]/g, '');
    const token = value && `MEMBER-${crypto.createHash('sha256').update(value).digest('hex').slice(0, 24)}`;
    if (token) putShared({ ...member, raw: token, normalized: token, location: ownLocation(member),
      privacy_redacted: true }, 'account.member_reference', facts, fact_sources);
  }
  const region = documentLines(model).filter((line) => (line.page > record.boundary.page || line.page === record.boundary.page && line.line >= record.boundary.line)
    && (line.page < record.end.page || line.page === record.end.page && line.line <= record.end.line));
  const hits = hitsIn(region, 'Member Name');
  if (hits.length === 1 && hits[0].value_present) {
    const lineText = readable(region.find((line) => line.page === hits[0].page && line.line === hits[0].line).text);
    const raw = lineText.slice(lineText.indexOf('Member Name') + 'Member Name'.length).trim();
    const token = nameToken(raw), page = model.pages.find((p) => p.page === hits[0].page), rows = nativeRows(page);
    const row = rows.find((r) => r.line === hits[0].line);
    const location = row ? wordsLocation(page, rows, row.words, 'Member Name (reporting member)')
      : { page: hits[0].page, line: hits[0].line, label: 'Member Name (reporting member)', trusted: !(page.word_boxes || []).length };
    putShared({ label: 'Member Name (reporting member)', raw: token, normalized: token, state: 'VALUE',
      printed_times_in_record: 1, location, privacy_redacted: true }, 'account.reported_identity', facts, fact_sources);
  }
  const assigned = record.printed['Date Assigned'];
  if (assigned && assigned.state === 'VALUE' && assigned.printed_times_in_record === 1)
    putShared({ ...assigned, location: ownLocation(assigned) }, 'collection.assignedDate', facts, fact_sources);
  // The agency heading precedes this layout's own Date Assigned boundary. It is
  // a collection label, never evidence of the original creditor's identity.
  const page = model.pages.find((p) => p.page === record.boundary.page);
  const previous = page && page.lines.slice(0, record.boundary.line - 1).map((text, i) => ({
    text: textKey(text), page: page.page, line: i + 1
  })).filter((line) => line.text).at(-1);
  if (previous && !isHeading(previous.text) && !COLLECTION_LABELS.some((label) => previous.text.startsWith(label))
    && !/Credit Report|Request Date|\d{4}[/-]\d{2}[/-]\d{2}|\$/.test(previous.text)) {
    const reading = { label: 'Collection agency (entry heading)', raw: previous.text, normalized: previous.text,
      state: 'VALUE', printed_times_in_record: 1, location: { page: previous.page, line: previous.line } };
    putShared({ ...reading, location: ownLocation(reading) }, 'collection.agency', facts, fact_sources);
  }
  return { facts, fact_sources };
}

/**
 * Read the factual view. This is the whole public surface of the module: labels, tokens the checks name,
 * page/line locations, and the indexes of records that print the same secure identifiers. No page text and
 * no full identifier is returned; literal masked identity and source-linked privacy tokens support shared checks.
 */
function read(model) {
  const reference = locateRequestDate(model);
  const section = locateCollectionsSection(model);
  const collections = collectionRecords(model, section);
  const identity_groups = identityGroups(collections.records);
  const records = collections.records.map((record) => ({ ...redactIdentifiers(record),
    shared_identity: collectionSharedIdentity(record, model) }));
  const summary_counts = summaryCaptions(model).map((caption) => Object.assign({
    summary_block: caption.summary_block,
    category: caption.category,
    stated_count: caption.stated_count,
    caption_location: caption.location
  }, assessBlockSection(model, caption, collections)));

  return {
    reader_id: READER_ID,
    presentation_id: PRESENTATION_ID,
    reader_evidence: 'the digest-pinned Equifax Canada consumer specimen (PR-01), read read-only; the page text is built in memory and is not retained',
    text_source: model.text_extraction_tool,
    report_reference_date: {
      status: reference.status,
      reason: reference.reason || null,
      raw: reference.raw_value || null,
      normalized: reference.normalized_value || null,
      source_field: reference.source_field,
      location: reference.location || null
    },
    reference_date: {
      status: reference.status,
      reason: reference.reason || null,
      raw: reference.raw_value || null,
      normalized: reference.normalized_value || null,
      source_field: reference.source_field,
      location: reference.location || null
    },
    summary_counts,
    collection_section: {
      status: collections.status,
      reason: collections.reason,
      records_read: collections.records.length,
      not_a_debt_record_count: collections.not_a_debt_record_count
    },
    records,
    ordinary_records: ordinaryRecords(model),
    identity_groups,
    policy_statements: [],
    headings_printed: [...new Set(documentLines(model).map((l) => l.text.trim()).filter(isHeading))].sort(),
    pages_not_read: unreadPages(model),
    report_text_retained: false,
    note: 'A reading of the presentation\'s own printed facts. It carries no legal rule, no legal conclusion or statutory applicability. It returns no page text, full account number or member number; printed masks and source-linked creditor privacy tokens support shared comparisons.'
  };
}

module.exports = {
  READER_ID,
  PRESENTATION_ID,
  HEADINGS,
  SUMMARY_BLOCKS,
  COLLECTION_LABELS,
  COLLECTION_DATE_LABELS,
  COLLECTION_TEXT_LABELS,
  RECORD_BOUNDARY_LABEL,
  FIRST_DELINQUENCY,
  SECURE_IDENTIFIER_LABELS,
  IDENTIFIER_LABELS,
  readable,
  hitsIn,
  redactIdentifiers,
  documentLines,
  sectionLines,
  headingPrinted,
  unreadPages,
  summaryCaptions,
  sectionHeadingFor,
  assessSection,
  assessBlockSection,
  countAccountBlocks,
  collectionRecords,
  identityGroups,
  ordinaryRecords,
  collectionSharedIdentity,
  read
};
