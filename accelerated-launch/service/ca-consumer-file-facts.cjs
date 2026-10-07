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
 *     value can fall on different lines. No label/value binding is attempted there, so no value is borrowed
 *     from an adjacent column: those sections contribute only their own printed item boundary. A value that
 *     cannot be bound is left unread rather than guessed.
 *   • IT RETAINS NO REPORT TEXT AND NO IDENTIFIER. It returns labels, tokens the checks name explicitly
 *     (dates, counts and status words), and page/line locations. It never returns page text. An account
 *     number or member number is used INSIDE this module only, to group records that print the same
 *     identifiers, and is replaced by the record indexes it matched before anything is returned.
 *   • IT NEVER MATCHES TWO RECORDS BY NAME. Two similar creditor names are not the same account, and a name
 *     is never an input to the grouping.
 */

const crypto = require('node:crypto');
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
    /* A status is a phrase: PAID AS AGREED is not PAID, and SETTLED IN FULL is not SETTLED.
       Keep its complete caption value, ending before another measured caption on the same line. */
    let cut = after.length;
    if (label === 'Status') {
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
    const token = label === 'Status' ? after.slice(0, cut).trim() : (after.match(/\S+/) || [''])[0];
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

/**
 * Read the factual view. This is the whole public surface of the module: labels, tokens the checks name,
 * page/line locations, and the indexes of records that print the same secure identifiers. No page text and
 * no identifier is returned.
 */
function read(model) {
  const reference = locateRequestDate(model);
  const section = locateCollectionsSection(model);
  const collections = collectionRecords(model, section);
  const identity_groups = identityGroups(collections.records);
  const records = collections.records.map(redactIdentifiers);
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
    identity_groups,
    policy_statements: [],
    headings_printed: [...new Set(documentLines(model).map((l) => l.text.trim()).filter(isHeading))].sort(),
    pages_not_read: unreadPages(model),
    report_text_retained: false,
    note: 'A reading of the presentation\'s own printed facts. It carries no legal rule, no legal conclusion and no statutory applicability, and it returns no page text, no account number and no member number.'
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
  read
};
