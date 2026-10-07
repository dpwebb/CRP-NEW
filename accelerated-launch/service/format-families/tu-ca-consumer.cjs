'use strict';
/**
 * tu-ca-consumer.cjs — the family reader for the SECOND Canadian consumer presentation: the TransUnion Canada
 * consumer disclosure.
 *
 * OWNER AUTHORIZATION (2026-10-01), completion of the report-family and release-readiness work under the
 * immutable all-82 plan: "Inspect the evidenced Equifax and TransUnion consumer formats locally. Establish
 * separate structural contracts where appropriate; do not force both bureaus into one layout. Validate record
 * boundaries, field meanings, ambiguity handling and factual checks. Create new family-admission records when
 * the evidence supports them."
 *
 * WHY THIS IS A SEPARATE MODULE AND NOT A WIDENED EQUIFAX CONTRACT. The evidence says the two bureaus print
 * different documents, and a single contract would have to lie about at least one of them. Measured on the real
 * specimens on this machine, the differences are structural, not cosmetic:
 *
 *   • DATE FORM. Equifax Canada prints `DDDD/DD/DD` (four-digit year first). TransUnion prints `Mon D, YYYY`.
 *     Neither reader can read the other's dates, and a shared normalizer would silently invent a meaning.
 *   • RECORD BOUNDARY. The Equifax collection record begins at a `Date Assigned` row inside a `Collections`
 *     section. The TransUnion disclosure prints no `Collections` section at all; its account block begins at a
 *     line that is exactly `Creditor Name`.
 *   • CONTAINER. The TransUnion disclosure is an RC4-encrypted PDF whose own permission flags allow printing
 *     and copying. The Equifax specimen is not encrypted, and the Equifax gate refuses the TransUnion file at
 *     `NOT_ENCRYPTED` — which is correct for Equifax and would be wrong for TransUnion.
 *   • REFERENCE DATE. Equifax prints `Request Date` in every page header. TransUnion prints no such label: it
 *     states its own file date in prose, once, as `... as of Mon D, YYYY`.
 *   • LABEL COLUMNS. The TransUnion account block prints two label/value columns on one text line
 *     (`Reported Date ... Last Payment Date ...`), so a reader that took "the token after the label" would read
 *     a neighbouring field's label as this field's value.
 *
 * WHAT THE EVIDENCE IS, EXACTLY. One real TransUnion Canada consumer disclosure, byte-pinned by its own digest,
 * present on this machine (a 12-page, letter-size, RC4-encrypted PDF whose printed page header carries the
 * consumer's name and the bureau's file reference — neither of which this module reads, retains or returns). Its
 * pointer and digest are read from the preserved PROD-003 register record for `PR-02`, which this module does
 * NOT modify and does NOT reinterpret as an admission of anything else.
 *
 * WHAT IS NOT CLAIMED, and is a named limitation rather than an assumption:
 *   • This is ONE specimen, of ONE product, of ONE bureau, at ONE print date. It evidences the STRUCTURE this
 *     module measures and nothing more. A different TransUnion product, print date, language or layout is
 *     refused by the same predicates, and the refusal names the predicate it failed.
 *   • No rule unit is seated on this presentation. The Nova Scotia statutory limb that the Equifax presentation
 *     seats is bound to `PR-01` and stays bound to it: a TransUnion file never runs it, and this module never
 *     claims it does.
 *   • The account block's material fields — the creditor name, account type/responsibility, terms, printed
 *     payment-history counts and the monthly amount/rating table — ARE read, through the block's own printed
 *     captions and its table's own header, and are reported with the report's own legends.
 *   • An enquiry row is read only when it BEGINS with a printed date inside a named enquiry section. A printed
 *     `Mon YYYY` with no day is reported as exactly that, never completed with an invented day.
 *   • A label whose meaning this evidence does not establish is left unread rather than guessed, and the reader
 *     records that it is present.
 *   • No retention statement is recorded for this presentation, so the printed-policy observation reports
 *     NOT_APPLICABLE on a TransUnion file rather than reading a policy the report does not state.
 *
 * Boundaries this module keeps:
 *   • A DOCUMENT IS NOT MATCHED BY ITS NAME, ITS PRODUCER OR ITS FILE EXTENSION. Admission is a conjunction of
 *     measured structural predicates, and a lookalike fails on the predicate it fails.
 *   • A RECORD NEVER BORROWS A FIELD. A label is read only inside the region that prints it.
 *   • A MISSING LABEL, A BLANK LABEL, A PARTIAL DATE AND A MALFORMED VALUE ARE FOUR DIFFERENT READINGS.
 *   • IT EMITS NO FINDING AND NO STATUTORY CONCLUSION OF ANY KIND.
 */

const { FACT_STATUS, SYNTHETIC_MARKERS } = require('../../../internal-validation/ca-ns-last-payment-six-year/constants.cjs');

const FAMILY_ID = 'FAM-TU-CA-CONSUMER';
const COUNTRY = 'CA';
const PUBLISHER_NAME = 'TransUnion';
const PUBLISHER_MARKET = 'Canada';

/**
 * The section skeleton the evidenced presentation prints and this contract requires. Each of these is printed
 * as its own line. `Telephone` is deliberately NOT among them: the artifact prints that token nine times, so it
 * is a consumer-channel marker and not a section boundary, and a reader that treated it as a boundary would cut
 * records in half.
 */
const REQUIRED_HEADINGS = Object.freeze([
  'Personal Information',
  'Address(es)',
  'Account(s)',
  'Insolvency',
  'Credit Related Inquiries'
]);

/** Every heading this module treats as a section boundary, including the enquiry sections it reads rows from. */
const ALL_HEADINGS = Object.freeze(REQUIRED_HEADINGS.concat([
  'Non-Credit Related Inquiries', 'Account Related Inquiries', 'Employment', 'Telephone', 'Signature'
]));

/** The enquiry sections whose rows this module reads. A section outside this list is not read as rows. */
const INQUIRY_SECTIONS = Object.freeze([
  'Credit Related Inquiries', 'Non-Credit Related Inquiries', 'Account Related Inquiries'
]);

/** Markers the consumer channel itself prints. These are what make the document the consumer presentation. */
const CONSUMER_CHANNEL_MARKERS = Object.freeze([
  'CONSUMER DISCLOSURE', 'Personal Information', 'Social Insurance Number', 'Account(s)', 'Payment History'
]);

/** Printed markers of a subscriber, business or bureau-to-lender document. Any one of them refuses the file. */
const WRONG_CHANNEL_MARKERS = Object.freeze([
  'SUBSCRIBER', 'TOTALVIEW', 'CREDIT EXPERT', 'INTERPRETATION GUIDE', 'BUSINESS REPORT', 'SUBSCRIBER REPORT'
]);

/**
 * Markers of a fixture masquerading as a report. The synthetic factory's own producer string is included
 * because it is a marker the document CARRIES, not a guess from its file name.
 */
const FIXTURE_MARKERS = Object.freeze(SYNTHETIC_MARKERS.concat([
  'CRP-SYNTHETIC-CREDIT-REPORT-FACTORY', 'CRP_SYNTHETIC'
]));

/** Refusal reasons this family adds, and the fact status each produces. */
const FAMILY_REFUSAL_REASONS = Object.freeze({
  NOT_THE_EVIDENCED_FAMILY_STRUCTURE: FACT_STATUS.UNSUPPORTED_PRESENTATION,
  TU_CA_CONSUMER_CHANNEL_MARKERS_ABSENT: FACT_STATUS.UNSUPPORTED_PRESENTATION,
  TU_CA_WRONG_CHANNEL_MARKER: FACT_STATUS.UNSUPPORTED_PRESENTATION,
  TU_CA_SYNTHETIC_OR_FIXTURE_MARKER: FACT_STATUS.UNSUPPORTED_PRESENTATION,
  TU_CA_IMAGE_ONLY_OR_NO_TEXT_LAYER: FACT_STATUS.UNSUPPORTED_PRESENTATION,
  TU_CA_ENCRYPTED_WITHOUT_PERMISSION_TO_READ: FACT_STATUS.EXTRACTION_UNRESOLVED,
  TU_CA_IN_MEMORY_MODEL_IS_NOT_A_FILE: FACT_STATUS.UNSUPPORTED_PRESENTATION,
  TU_CA_TRADELINE_BOUNDARY_ABSENT: FACT_STATUS.UNSUPPORTED_PRESENTATION,
  TU_CA_REFERENCE_DATE_STATEMENT_ABSENT: FACT_STATUS.UNSUPPORTED_PRESENTATION,
  DOCUMENT_NOT_READABLE: FACT_STATUS.EXTRACTION_UNRESOLVED,
  NOT_A_PDF_CONTAINER: FACT_STATUS.UNSUPPORTED_PRESENTATION
});

/**
 * The printed date forms of THIS presentation, recorded rather than generalised. `Mon D, YYYY` is the form the
 * artifact prints 142 times. `Mon YYYY` — no day — is printed 31 times and is a PARTIAL date: it is reported as
 * such and is never completed with an invented day.
 */
const FULL_DATE_FORM = /^([A-Za-z]{3,9})\s+(\d{1,2}),\s*(\d{4})$/;
const PARTIAL_DATE_FORM = /^([A-Za-z]{3,9})\s+(\d{4})$/;
const FULL_DATE_IN_TEXT = /\b([A-Z][a-z]{2})\s+(\d{1,2}),\s*(\d{4})\b/;

const MONTHS = Object.freeze({
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9,
  oct: 10, nov: 11, dec: 12
});

/** The phrase the artifact prints for its own file date. It is prose, not a labelled field. */
const REFERENCE_DATE_PHRASE = 'as of';

/** The line that begins one account block. The artifact prints it exactly, once per tradeline. */
const RECORD_BOUNDARY_LABEL = 'Creditor Name';

/**
 * The printed field labels of one account block, split by what they mean. Every one of these was measured on
 * the evidenced presentation by exact string match; none is inferred from the other bureau's layout.
 */
const TRADELINE_DATE_LABELS = Object.freeze([
  'Reported Date', 'Opened Date', 'Closed Date', 'Last Payment Date',
  'Posted Date', 'Charge Off Date', 'First Delinquency Date', 'Balloon Payment Date'
]);

/**
 * The non-date labels this contract reads from the account block, named for the family contract. They are NOT
 * read by `labeledValues`: the block's material fields are not printed as `label  value` on one line. The
 * creditor name sits on the line AFTER its caption, `Terms:` shares its line with the payment-history captions,
 * `Account` / `Type:` wraps across two lines, and the amounts live in a table whose own header names every
 * column. Each is read by its own measured rule below (`readAccountMaterial`), never by a cell-width guess.
 */
const TRADELINE_TEXT_LABELS = Object.freeze(['Creditor Name', 'Account Type', 'Terms', 'Payment History']);

/** The labels `labeledValues` reads on one line: the printed DATE labels only. */
const TRADELINE_LABELS = Object.freeze(TRADELINE_DATE_LABELS.slice());

/** The printed caption of the monthly-amount table, and the heading that introduces the report's MOP legend. */
const TABLE_HEADING_LABEL = 'Payment History';
const MOP_LEGEND_HEADING = 'USUAL MANNER OF PAYMENT';

/** The report's own account-type codes, printed in its legend immediately above the manner-of-payment legend. */
const ACCOUNT_TYPE_LEGEND_CODES = '[ORIM]';

/**
 * The columns of the monthly-amount table, in the order the block prints them. Every column is measured from the
 * block's OWN printed header caption, so a column whose caption wraps (`Past Due`, `High Credit`, `Credit Limit`,
 * `Balloon Payment`, `Charge Off`) is measured from the LAST printed word of that caption.
 */
const TABLE_HEADER_CAPTIONS = Object.freeze([
  'date', 'balance', 'payment', 'past_due', 'mop', 'terms', 'high_credit', 'credit_limit',
  'balloon_payment', 'charge_off', 'narrative'
]);

/** The report's own account-type words, as its legend prints them, and the fact this build maps them to. */
const ACCOUNT_TYPE_WORDS = Object.freeze({
  OPEN: 'OPEN_ACCOUNT',
  REVOLVING: 'REVOLVING',
  INSTALLMENT: 'INSTALLMENT',
  MORTGAGE: 'MORTGAGE'
});

/**
 * Labels the account block prints that this contract deliberately does NOT read, recorded as measured layout
 * facts so that "not read" is a stated boundary rather than an omission.
 */
const WRAPPED_OR_GRAPHICAL_LABELS_NOT_READ = Object.freeze([
  Object.freeze({
    printed_as: Object.freeze(['Account #']),
    would_mean: 'the account identifier',
    why_not_read: 'this presentation prints no account number inside an account block, so no masked identifier is read, invented or matched'
  }),
  Object.freeze({
    printed_as: Object.freeze(['Social Insurance Number']),
    would_mean: "the consumer's own identity fields",
    why_not_read: 'personal identity fields are never read, retained or returned; the account block is read only for account facts'
  })
]);

/** The kinds this presentation yields. */
const TRADELINE_KIND = 'TU_CA_TRADELINE';
const INQUIRY_KIND = 'TU_CA_INQUIRY';
const KIND_SECTIONS = Object.freeze({
  TU_CA_TRADELINE: 'Account(s)',
  TU_CA_INQUIRY: 'enquiry section'
});


/**
 * The presentation prints with typographic ligatures and curly punctuation, and uses a non-breaking space. All
 * matching is done on a readable copy; the token that is RETAINED in a record is the token as printed.
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

function wholeDocumentText(model) {
  return model.pages.map((p) => p.text).join('\n');
}

/** Whitespace-squashed, upper-cased document text, used ONLY for marker matching. Never returned as content. */
function squashedDocumentText(model) {
  return readable(wholeDocumentText(model)).replace(/\s+/g, ' ').toUpperCase();
}

function isImpossibleCalendarDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  if (m < 1 || m > 12) return true;
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return d < 1 || d > days[m - 1];
}

/**
 * Normalize one printed token under THIS presentation's recorded forms. A `Mon YYYY` token is a PARTIAL date:
 * it returns no normalized value and names its own reason, so a day is never invented for it.
 */
function normalizePrintedDate(token) {
  const text = String(token === undefined || token === null ? '' : token).trim();
  const full = FULL_DATE_FORM.exec(text);
  if (full) {
    const month = MONTHS[full[1].slice(0, 3).toLowerCase()];
    if (!month) return { normalized: null, reason: 'VALUE_MALFORMED_PRINTED_FORM' };
    const iso = `${full[3]}-${String(month).padStart(2, '0')}-${String(Number(full[2])).padStart(2, '0')}`;
    if (isImpossibleCalendarDate(iso)) return { normalized: null, reason: 'IMPOSSIBLE_CALENDAR_VALUE' };
    return { normalized: iso, reason: null };
  }
  const partial = PARTIAL_DATE_FORM.exec(text);
  if (partial) {
    const month = MONTHS[partial[1].slice(0, 3).toLowerCase()];
    if (!month) return { normalized: null, reason: 'VALUE_MALFORMED_PRINTED_FORM' };
    return {
      normalized: null,
      reason: 'PRINTED_WITHOUT_A_DAY',
      month_and_year: `${partial[2]}-${String(month).padStart(2, '0')}`
    };
  }
  return { normalized: null, reason: 'VALUE_MALFORMED_PRINTED_FORM' };
}


/**
 * Every labelled value on a line, read left to right, with each value ending where the NEXT recognised label
 * begins. That is what keeps this presentation's two-column block honest: `Reported Date   Oct 2, 2025
 * Last Payment Date   Oct 2, 2025` yields two fields, and neither one swallows the other's label.
 */
function labeledValues(lines, labels) {
  const ordered = labels.slice().sort((a, b) => b.length - a.length);
  const out = [];
  for (const entry of lines) {
    const text = readable(entry.text);
    let i = 0;
    while (i < text.length) {
      const before = i === 0 ? ' ' : text.charAt(i - 1);
      const atBoundary = i === 0 || /\s/.test(before) || before === ':';
      if (atBoundary) {
        const label = ordered.find((candidate) => text.startsWith(candidate, i)
          && (i + candidate.length === text.length || /[\s:]/.test(text.charAt(i + candidate.length))));
        if (label) {
          const after = text.slice(i + label.length);
          let cut = after.length;
          for (const other of ordered) {
            if (other === label) continue;
            let from = 0;
            for (;;) {
              const at = after.indexOf(other, from);
              if (at === -1) break;
              if (at === 0 || /[\s:]/.test(after.charAt(at - 1))) { if (at < cut) cut = at; break; }
              from = at + 1;
            }
          }
          const raw = after.slice(0, cut).trim().replace(/^[:\s]+/, '');
          out.push({ label, page: entry.page, line: entry.line, token: raw, value_present: raw.length > 0 });
          i += label.length + cut;
          continue;
        }
      }
      i += 1;
    }
  }
  return out;
}

/**
 * THE COLUMN RULE, and why it is the printed date form rather than a column width.
 *
 * The account block prints two label/value columns on one text line, and a label whose cell is EMPTY is
 * followed by the next column's label. Measured on the evidenced presentation: the gap from a label to its own
 * value runs 8–24 spaces, and the gap from a label to the NEXT column runs 22–34 spaces. Those ranges OVERLAP,
 * so no column-gap threshold can separate a printed value from an empty cell.
 *
 * The separator that does not overlap is the value's own form: every value in this block is a printed date, and
 * a date has a form. So the value of a date label is the date form that begins at that label's value position,
 * and a label whose value position does not begin with a date form is PRINTED WITHOUT A VALUE. No threshold is
 * invented, and no value is borrowed from the neighbouring column.
 */
function leadingPrintedDate(raw) {
  const text = String(raw === undefined || raw === null ? '' : raw).trim();
  const full = /^[A-Za-z]{3,9}\s+\d{1,2},\s*\d{4}\b/.exec(text);
  if (full) return full[0];
  const partial = /^[A-Za-z]{3,9}\s+\d{4}\b/.exec(text);
  if (partial) return partial[0];
  return null;
}

/**
 * One printed value, in the same vocabulary the Canadian reader already uses, plus a sixth state this
 * presentation needs and Equifax does not: a PRINTED PARTIAL DATE. Repeated date captions keep every reading
 * as ambiguous rather than choosing the first occurrence. These states are never collapsed.
 */
function printedValue(label, hits, pageUnread, isDate) {
  if (pageUnread) {
    return { label, state: 'PAGE_NOT_READ', raw: null, normalized: null, reason: 'THE_PAGE_CARRYING_THIS_RECORD_COULD_NOT_BE_READ', location: null };
  }
  if (!hits.length) {
    return { label, state: 'NOT_PRINTED', raw: null, normalized: null, reason: 'LABEL_NOT_PRINTED_ON_THIS_RECORD', location: null };
  }
  if (isDate && hits.length > 1) {
    return { label, state: 'VALUE_AMBIGUOUS_PRINTED_FORM', raw: null, normalized: null,
      reason: 'REPEATED_DATE_CAPTION_ON_ONE_RECORD', location: { page: hits[0].page, line: hits[0].line, label },
      printed_readings: hits.map((hit) => printedValue(label, [hit], false, true)) };
  }
  const hit = hits[0];
  const location = { page: hit.page, line: hit.line, label };
  if (!isDate) return { label, state: 'VALUE', raw: hit.token, normalized: null, reason: null, location };
  const printed = leadingPrintedDate(hit.token);
  if (!hit.value_present || printed === null) {
    return {
      label,
      state: 'LABEL_PRINTED_WITHOUT_VALUE',
      raw: null,
      normalized: null,
      reason: 'NO_PRINTED_DATE_AT_THIS_LABEL_VALUE_POSITION',
      location
    };
  }
  const parsed = normalizePrintedDate(printed);
  if (!parsed.normalized) {
    return {
      label,
      state: parsed.reason === 'PRINTED_WITHOUT_A_DAY' ? 'VALUE_PRINTED_WITHOUT_A_DAY' : 'VALUE_MALFORMED_PRINTED_FORM',
      raw: printed,
      normalized: null,
      reason: parsed.reason,
      month_and_year: parsed.month_and_year || null,
      location
    };
  }
  return { label, state: 'VALUE', raw: printed, normalized: parsed.normalized, reason: null, location };
}

/** Which pages the model could not read at all. A read failure is not an empty page. */
function unreadPages(model) {
  return model.read_errors.filter((e) => e.stage === 'pdftotext' && e.page).map((e) => e.page);
}


/* ------------------------------------------------------------------ section boundaries */

/**
 * A section boundary is a line that prints ONLY a heading. `Telephone` is in ALL_HEADINGS, but it also prints
 * as a column caption inside the telephone table, so a line counts as that heading only when nothing else is on
 * it — which is what keeps the region logic from cutting a record at a column caption.
 */
function headingPrintedOn(line, heading) {
  const text = readable(line.text).trim();
  return text === heading || text === `${heading}:`;
}

function isSectionHeading(line) {
  return ALL_HEADINGS.some((heading) => headingPrintedOn(line, heading));
}

function headingNamesPrinted(model) {
  const seen = new Set();
  for (const line of documentLines(model)) {
    for (const heading of ALL_HEADINGS) if (headingPrintedOn(line, heading)) seen.add(heading);
  }
  return [...seen].sort();
}

/** The index of the next section boundary after `from`, or the end of the document. */
function nextSectionBoundary(lines, from) {
  for (let i = from + 1; i < lines.length; i += 1) if (isSectionHeading(lines[i])) return i;
  return lines.length;
}

/**
 * The lines of one enquiry section: from the heading it prints to the next section boundary. Only the three
 * enquiry headings this module names open a section; a prose mention of the phrase opens nothing.
 */
function inquirySectionLines(lines, heading) {
  const out = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (!headingPrintedOn(lines[i], heading)) continue;
    out.push(...lines.slice(i + 1, nextSectionBoundary(lines, i)));
  }
  return out;
}

/**
 * The lines of one account block. The block BEGINS at a line that is exactly the boundary label and ends at the
 * next such line or at the next section boundary, whichever comes first.
 */
function tradelineRegions(lines) {
  const starts = [];
  lines.forEach((line, index) => { if (readable(line.text).trim() === RECORD_BOUNDARY_LABEL) starts.push(index); });
  return starts.map((start) => {
    const nextBoundary = nextSectionBoundary(lines, start);
    let end = nextBoundary;
    for (let i = start + 1; i < nextBoundary; i += 1) {
      if (readable(lines[i].text).trim() === RECORD_BOUNDARY_LABEL) { end = i; break; }
    }
    return lines.slice(start, end);
  });
}


/* ------------------------------------------------------------------ the account block's printed material */

/**
 * BLOCKER-REPORT-DATA-TO-ISSUE-001 (first slice). An account block prints material facts a date-only reading
 * ignores: the creditor/account identity, the account type and responsibility, the repayment terms, the printed
 * payment-history counts and the monthly amount/rating table. These are read from the block's OWN printed
 * captions and its table's OWN header, and each reading keeps the raw text and the page/line it was printed on.
 * Nothing is inferred from the other Canadian layout, and a reading that cannot be bound is left unread.
 */

/** One line's non-space tokens with the character positions they were printed at. */
function lineTokens(text) {
  const source = String(text === undefined || text === null ? '' : text);
  const out = [];
  const re = /\S+/g;
  let m = re.exec(source);
  while (m) { out.push({ token: m[0], start: m.index, end: m.index + m[0].length }); m = re.exec(source); }
  return out;
}

/** The end position of the FIRST token equal to `word`, or null. */
function tokenPosition(tokens, word) {
  const hit = tokens.find((t) => t.token === word);
  return hit ? hit.end : null;
}

/** The end position of the first `word` token printed AFTER the token `after`, or null. */
function tokenPositionAfter(tokens, after, word) {
  const from = tokens.findIndex((t) => t.token === after);
  if (from === -1) return null;
  for (let i = from + 1; i < tokens.length; i += 1) if (tokens[i].token === word) return tokens[i].end;
  return null;
}

/**
 * THE TABLE COLUMN RULE, and why it is the block's OWN printed header rather than a cell width.
 *
 * The monthly amounts are a table. Its header names every column (`Date ... Balance ... Payment ... Past Due ...
 * MOP ... Terms ... High Credit ... Credit Limit ... Balloon Payment ... Charge Off ... Narrative`), and each
 * data cell prints so that its RIGHT edge sits under its own column's caption. Measured on the evidenced
 * presentation, a cell's right edge falls within 0-4 points of its own caption's right edge and 8-15 points from
 * the next column's, so the NEAREST caption right edge separates them with no invented threshold. A caption that
 * wraps across two lines is measured from its LAST printed word. If the header cannot be located, no cell is
 * read and the table is reported as not read.
 */
function tableColumns(region) {
  const mainIndex = region.findIndex((entry) => {
    const tokens = lineTokens(readable(entry.text)).map((t) => t.token);
    return tokens.includes('Date') && tokens.includes('Balance') && tokens.includes('MOP')
      && tokens.includes('Terms') && tokens.includes('Charge') && tokens.includes('Off');
  });
  if (mainIndex === -1) return null;
  const main = lineTokens(readable(region[mainIndex].text));
  const above = mainIndex > 0 ? lineTokens(readable(region[mainIndex - 1].text)) : [];
  const below = mainIndex + 1 < region.length ? lineTokens(readable(region[mainIndex + 1].text)) : [];
  const narrativeCaption = above.find((t) => t.token === 'Narrative');
  const edges = {
    date: tokenPosition(main, 'Date'),
    balance: tokenPosition(main, 'Balance'),
    payment: tokenPosition(main, 'Payment'),
    past_due: tokenPosition(main, 'Due'),
    mop: tokenPosition(main, 'MOP'),
    terms: tokenPosition(main, 'Terms'),
    high_credit: tokenPositionAfter(main, 'High', 'Credit'),
    credit_limit: tokenPosition(main, 'Limit'),
    balloon_payment: tokenPosition(below, 'Payment'),
    charge_off: tokenPosition(main, 'Off'),
    narrative: tokenPosition(above, 'Narrative')
  };
  const columns = TABLE_HEADER_CAPTIONS
    .filter((key) => typeof edges[key] === 'number')
    .map((key) => ({ key, edge: edges[key] }));
  if (columns.length < TABLE_HEADER_CAPTIONS.length) return null;
  return { main_index: mainIndex, columns, narrative_start: narrativeCaption ? narrativeCaption.start : null };
}

/**
 * The column a cell belongs to. The LAST column (Narrative) is a printed free-text tail, so any token that
 * STARTS at or after the Narrative caption's own printed start belongs to it; every other token belongs to the
 * column whose printed caption right edge is nearest to the token's right edge.
 */
function columnForTokenEnd(columns, end, start, narrativeStart) {
  if (typeof narrativeStart === 'number' && typeof start === 'number' && start >= narrativeStart) return 'narrative';
  let best = null;
  let bestDistance = Infinity;
  for (const column of columns) {
    const distance = Math.abs(column.edge - end);
    if (distance < bestDistance) { bestDistance = distance; best = column; }
  }
  return best ? best.key : null;
}

/** The monthly amount/rating rows of one account block, as the block prints them (newest first). */
function monthlyRows(region, table) {
  const rows = [];
  const rowStart = /^([A-Z][a-z]{2})\s+(\d{4})\b/;
  for (let i = table.main_index + 1; i < region.length; i += 1) {
    const entry = region[i];
    const text = readable(entry.text);
    const match = rowStart.exec(text.trim());
    if (!match) continue;
    const month = MONTHS[match[1].toLowerCase()];
    if (!month) continue;
    const tokens = lineTokens(text);
    const cells = {};
    for (let t = 2; t < tokens.length; t += 1) {   // tokens 0 and 1 are the row's own printed `Mon YYYY`
      const key = columnForTokenEnd(table.columns, tokens[t].end, tokens[t].start, table.narrative_start);
      if (!key || key === 'date') continue;
      if (Object.prototype.hasOwnProperty.call(cells, key)) {
        /* The Narrative column is the block's only printed free-text tail, so its cells are kept whole. */
        if (key === 'narrative') cells[key] = `${cells[key]} ${tokens[t].token}`;
        continue;
      }
      cells[key] = tokens[t].token;
    }
    rows.push({
      location: { page: entry.page, line: entry.line },
      raw_period: `${match[1]} ${match[2]}`,
      period: `${match[2]}-${String(month).padStart(2, '0')}`,
      cells
    });
  }
  return rows;
}


/** The creditor name the block prints on the line after its boundary caption, up to the table caption. */
function creditorNameValue(region) {
  const boundary = region[1];
  if (!boundary) return null;
  const text = readable(boundary.text);
  const captionAt = text.indexOf(TABLE_HEADING_LABEL);
  const namePart = (captionAt === -1 ? text : text.slice(0, captionAt)).trim();
  if (!namePart) return null;
  return { raw: namePart, location: { page: boundary.page, line: boundary.line, label: 'Creditor Name' } };
}

/** The account type and responsibility, printed to the right of the wrapped `Account` / `Type:` caption. */
function accountTypeValue(region) {
  for (const entry of region) {
    const text = readable(entry.text);
    const at = /\bAccount\b(?!\s*\()/.exec(text);
    if (!at) continue;
    const after = text.slice(at.index + 'Account'.length).trim();
    if (!after || /^Type:?$/.test(after)) continue;
    const parts = after.split('/').map((s) => s.trim()).filter(Boolean);
    if (parts.length !== 2) continue;
    const typeWord = parts[0].toUpperCase();
    return {
      raw: after,
      type_word: typeWord,
      account_type: ACCOUNT_TYPE_WORDS[typeWord] || typeWord,
      responsibility: parts[1].toUpperCase(),
      location: { page: entry.page, line: entry.line, label: 'Account Type' }
    };
  }
  return null;
}

/** The repayment terms the block prints after `Terms:`. */
function termsValue(region) {
  for (const entry of region) {
    const tokens = lineTokens(readable(entry.text));
    const at = tokens.findIndex((t) => t.token === 'Terms:');
    if (at === -1) continue;
    const next = tokens[at + 1];
    if (!next) continue;
    return { raw: next.token, location: { page: entry.page, line: entry.line, label: 'Terms' } };
  }
  return null;
}

/** The printed 30/60/90/#M counts the block prints beside `Terms:`, read under their own captions. */
function paymentHistorySummary(region) {
  for (let i = 0; i < region.length; i += 1) {
    const tokens = lineTokens(readable(region[i].text));
    const at = tokens.findIndex((t) => t.token === 'Terms:');
    if (at === -1) continue;
    const captions = tokens.slice(at + 2);   // after `Terms:` and its value: `30 60 90 #M`
    if (captions.length < 4) return null;
    const next = region[i + 1];
    if (!next) return null;
    const countTokens = lineTokens(readable(next.text)).filter((t) => t.start >= captions[0].start);
    if (countTokens.length < captions.length) return null;
    const counts = {};
    captions.forEach((caption, k) => { counts[caption.token] = countTokens[k].token; });
    return {
      raw: captions.map((c) => c.token).join(' '),
      counts,
      location: { page: next.page, line: next.line, label: 'Payment History' }
    };
  }
  return null;
}


/**
 * The narrative codes and meanings the block prints on its own `Legend:` line.
 *
 * BLOCKER-REPORT-DATA-TO-ISSUE-001 (real-report repair): the production lines of this presentation end in a
 * CARRIAGE RETURN. In JavaScript `.` never matches `\r` and, without the multiline flag, `$` matches only at the
 * very end of the string — so `(.+)$` could not match a line that ends in `\r` and every printed legend was
 * silently dropped, leaving `narrative_legend` empty on all four accounts of the supplied report while the codes
 * themselves (AC, CG, WO, TC, CZ) were still captured. The line's own native ending is removed here — nothing
 * else about the line is changed and the entry's page/line location is preserved by the caller — so the report's
 * OWN printed meanings are read instead of being lost. No code is ever decoded by guessing: a code carries a
 * meaning only when the report itself prints one.
 */
function narrativeLegend(region) {
  const legend = {};
  for (const entry of region) {
    const line = readable(entry.text).replace(/[\r\n]+/g, ' ').trim();
    const match = /^\s*Legend:\s*(.+)$/.exec(line);
    if (!match) continue;
    for (const part of match[1].split(/,\s*/)) {
      const code = /^\s*([A-Z]{1,2})\s*-\s*(.+)$/.exec(part);
      if (code) {
        const meaning = code[2].trim();
        if (meaning && !Object.prototype.hasOwnProperty.call(legend, code[1])) legend[code[1]] = meaning;
      }
    }
  }
  return legend;
}

/**
 * The report's OWN printed legend lines, read as the meaning of the codes it prints. A legend line is matched
 * anywhere on a line (this presentation prints its legend beside a second column of prose), and the meaning is
 * taken only when the report itself prints it. No code is ever decoded by guessing.
 */
function printedLegendReadings(model, heading, codeShape, { before = false, span = 24 } = {}) {
  const lines = documentLines(model);
  const at = lines.findIndex((l) => readable(l.text).trim().toUpperCase() === heading);
  if (at === -1) return [];
  const readings = [];
  const re = new RegExp(`(?:^|\\s)(${codeShape})\\s+-\\s+([A-Za-z][^\\n]*)$`);
  const start = before ? Math.max(0, at - span) : at + 1;
  const end = before ? at - 1 : Math.min(lines.length - 1, at + span);
  for (let i = start; i <= end; i += 1) {
    const match = re.exec(readable(lines[i].text));
    if (match) readings.push({ code: match[1], meaning: match[2].trim(), raw: match[0].trim(),
      location: { page: lines[i].page, line: lines[i].line, label: heading } });
  }
  return readings;
}

function printedLegend(model, heading, codeShape, options) {
  const legend = {};
  for (const reading of printedLegendReadings(model, heading, codeShape, options)) {
    if (!Object.prototype.hasOwnProperty.call(legend, reading.code)) legend[reading.code] = reading.meaning;
  }
  return legend;
}

/** The report's own manner-of-payment legend (the MOP code meanings), exactly as the report prints them. */
function mannerOfPaymentLegend(model) {
  return printedLegend(model, MOP_LEGEND_HEADING, '[0-9X]');
}

/** The report's own account-type legend (O/R/I/M), printed immediately above the manner-of-payment legend. */
function accountTypeLegend(model) {
  return printedLegend(model, MOP_LEGEND_HEADING, ACCOUNT_TYPE_LEGEND_CODES, { before: true, span: 8 });
}

/** Read one account block's material, keeping raw text and its printed location for every field found. */
function readAccountMaterial(region) {
  const creditor = creditorNameValue(region);
  const accountType = accountTypeValue(region);
  const terms = termsValue(region);
  const summary = paymentHistorySummary(region);
  const table = tableColumns(region);
  const rows = table ? monthlyRows(region, table) : [];
  return {
    creditor,
    account_type: accountType,
    terms,
    summary,
    table_found: Boolean(table),
    rows,
    narrative_legend: narrativeLegend(region)
  };
}

/** A printed non-date reading, in the same vocabulary the date readings use. */
function printedTextValue(label, reading) {
  return {
    label,
    state: 'VALUE',
    raw: reading.raw,
    normalized: null,
    reason: null,
    location: reading.location,
    printed_times_in_record: 1
  };
}

/** A printed amount as a number, only when the whole cell is a printed number; otherwise undefined (never zero). */
function amountOf(raw) {
  if (raw === undefined || raw === null) return undefined;
  const text = String(raw).trim();
  if (!/^(?:[+-]?\$?|\$[+-]?)(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(text)) return undefined;
  const value = Number(text.replace(/[$,]/g, ''));
  return Number.isFinite(value) ? value : undefined;
}

/** The narrative codes a monthly row prints, split on the block's own `/` separator and never decoded here. */
function narrativeCodesOf(raw) {
  if (!raw) return [];
  return String(raw).split('/').map((s) => s.trim().toUpperCase()).filter(Boolean);
}


function buildTradeline(region, index, unread, mopLegend, mopLegendReadings) {
  const first = region[0];
  const last = region[region.length - 1];
  const pageUnread = unread.has(first.page);
  const hits = labeledValues(region, TRADELINE_LABELS);
  const printed = {};
  for (const label of TRADELINE_LABELS) {
    const own = hits.filter((h) => h.label === label);
    printed[label] = Object.assign(
      printedValue(label, own, pageUnread, TRADELINE_DATE_LABELS.includes(label)),
      { printed_times_in_record: own.length }
    );
  }
  /* OWNER-POTENTIAL-ISSUE-001 ordinary-field batch: map the fields this family already reads (Opened/Closed Date on a
     tradeline) to the account lifecycle facts the account-dates check compares. Values are taken only from the printed
     reading; a missing or unresolved label maps nothing and never stops an independent check. */
  const facts = {};
  const factSources = {};
  /* Every existing shared date keeps its own caption source. Equal date values cannot borrow another
     caption's location; blanks, partial dates and repeated captions remain unresolved in `printed`. */
  for (const [field, caption] of [
    ['liability.openedDate', 'Opened Date'], ['liability.closedDate', 'Closed Date'],
    ['tradeline.lastPaymentDate', 'Last Payment Date'],
    ['tradeline.firstDelinquencyDate', 'First Delinquency Date'], ['tradeline.chargeOffDate', 'Charge Off Date']
  ]) {
    const reading = printed[caption];
    if (!reading || reading.state !== 'VALUE' || !reading.normalized || !reading.location) continue;
    facts[field] = reading.normalized;
    factSources[field] = { raw_value: reading.raw, normalized_value: reading.normalized,
      source_field: caption, location: { ...reading.location }, status: FACT_STATUS.RESOLVED,
      caption_count: reading.printed_times_in_record, record_index: index };
  }

  /* BLOCKER-REPORT-DATA-TO-ISSUE-001 first slice: read the block's printed MATERIAL fields through its own
     captions and its table's own header, and map them to the SAME fact vocabulary the shared checks already
     consume. A reading that cannot be bound maps NOTHING and never stops an independent check; a blank or
     unreadable cell is never guessed, never zero-filled and never a missed payment. */
  const material = pageUnread ? null : readAccountMaterial(region);
  if (material) {
    if (material.creditor) {
      printed['Creditor Name'] = Object.assign(
        printedTextValue('Creditor Name', material.creditor),
        { normalized: material.creditor.raw }
      );
    }
    if (material.account_type) {
      printed['Account Type'] = Object.assign(
        printedTextValue('Account Type', material.account_type),
        { normalized: material.account_type.account_type }
      );
    }
    if (material.terms) printed['Terms'] = printedTextValue('Terms', material.terms);
    if (material.summary) printed['Payment History'] = printedTextValue('Payment History', material.summary);
    if (material.creditor && material.creditor.raw) facts['account.reported_identity'] = material.creditor.raw;
    if (material.account_type && material.account_type.account_type) facts['account.type'] = material.account_type.account_type;
    if (material.account_type && material.account_type.responsibility) {
      facts['account.responsibility'] = material.account_type.responsibility;
      factSources['account.responsibility'] = {
        raw_value: material.account_type.raw,
        normalized_value: material.account_type.responsibility,
        source_field: 'Account Type',
        location: { ...material.account_type.location },
        record_index: index
      };
    }
    const latest = material.rows.length ? material.rows[0] : null;
    if (latest) {
      /* Each amount keeps its printed raw reading beside the number, under the `<field>Raw` key the packet's
         source-linked provenance already reads, so a compared amount can state exactly what the report printed. */
      for (const [field, cell, caption] of [
        ['account.balance', 'balance', 'Balance'],
        ['account.pastDueAmount', 'past_due', 'Past Due'],
        ['account.paymentAmount', 'payment', 'Payment'],
        ['account.amount', 'high_credit', 'High Credit'],
        ['account.creditLimit', 'credit_limit', 'Credit Limit']
      ]) {
        const value = amountOf(latest.cells[cell]);
        if (value === undefined) continue;
        facts[field] = value;
        facts[field + 'Raw'] = latest.cells[cell];
        /* A field-keyed source keeps equal numeric values on their own columns; the block's Reported Date
           and another amount with the same value are never substitutes for this row's caption and location. */
        factSources[field] = { raw_value: latest.cells[cell], normalized_value: value,
          source_field: caption, location: { ...latest.location, label: caption }, record_index: index };
      }
    }
    if (material.rows.length) {
      facts['account.paymentHistoryLegend'] = mopLegendReadings.map((reading) => ({
        ...reading, location: { ...reading.location }
      }));
      facts['account.paymentHistoryCells'] = material.rows.map((row) => {
        const code = row.cells.mop ? row.cells.mop.trim() : null;
        const meaning = code && Object.prototype.hasOwnProperty.call(mopLegend, code) ? mopLegend[code] : null;
        const noRating = meaning !== null && /\bunknown\b|too new to rate|\b(?:unrated|not rated|no (?:current )?rating)\b/i.test(meaning);
        return { period: row.period, raw_period: row.raw_period, code, meaning,
          uncertain: code !== null && (meaning === null || noRating), location: row.location };
      });
    }
  }

  return {
    record_index: index,
    kind: TRADELINE_KIND,
    kind_label: 'tradeline',
    section: KIND_SECTIONS[TRADELINE_KIND],
    boundary: { page: first.page, line: first.line },
    end: { page: last.page, line: last.line },
    page_read_failure: pageUnread,
    /* The creditor's own name is printed on the line AFTER the boundary caption. It is read as the ACCOUNT's
       printed identity (the general intake reads it the same way), never used to MATCH one record against
       another by name: two similarly named creditors stay two records. The test is on the REGION's length, not
       on line arithmetic, because a block may continue onto the next page. */
    creditor_name_printed_on_the_next_line: region.length > 1,
    creditor_name_read: Boolean(material && material.creditor && material.creditor.raw),
    account_material: material ? {
      account_type: material.account_type ? material.account_type.account_type : null,
      printed_account_type: material.account_type ? material.account_type.raw : null,
      responsibility: material.account_type ? material.account_type.responsibility : null,
      terms: material.terms ? material.terms.raw : null,
      payment_history_counts: material.summary ? material.summary.counts : null,
      table_found: material.table_found,
      monthly_row_count: material.rows.length,
      narrative_legend: material.narrative_legend
    } : null,
    monthly_rows: material ? material.rows.map((row) => ({
      location: row.location,
      raw_period: row.raw_period,
      period: row.period,
      cells: Object.assign({}, row.cells),
      narrative_codes: narrativeCodesOf(row.cells.narrative)
    })) : [],
    printed,
    facts,
    fact_sources: factSources
  };
}

/**
 * An enquiry row is a line that BEGINS with a printed date inside a named enquiry section. The row's own date is
 * the only field this module reads from it, and a `Mon YYYY` row keeps its partial state.
 */
function buildInquiryRow(sectionName, line, pageUnread) {
  const text = readable(line.text);
  const match = /^\s*([A-Z][a-z]{2})\s+(\d{1,2},\s*\d{4}|\d{4})\b/.exec(text);
  if (!match) return null;
  const token = match[0].trim();
  const parsed = normalizePrintedDate(token);
  const base = { label: 'Date', printed_times_in_record: 1 };
  let printed;
  if (pageUnread) {
    printed = Object.assign(base, { state: 'PAGE_NOT_READ', raw: null, normalized: null, reason: 'THE_PAGE_CARRYING_THIS_RECORD_COULD_NOT_BE_READ', location: null });
  } else if (parsed.normalized) {
    printed = Object.assign(base, { state: 'VALUE', raw: token, normalized: parsed.normalized, reason: null, location: { page: line.page, line: line.line, label: 'Date' } });
  } else {
    printed = Object.assign(base, {
      state: parsed.reason === 'PRINTED_WITHOUT_A_DAY' ? 'VALUE_PRINTED_WITHOUT_A_DAY' : 'VALUE_MALFORMED_PRINTED_FORM',
      raw: token,
      normalized: null,
      reason: parsed.reason,
      month_and_year: parsed.month_and_year || null,
      location: { page: line.page, line: line.line, label: 'Date' }
    });
  }
  return {
    kind: INQUIRY_KIND,
    kind_label: 'enquiry row',
    section: sectionName,
    boundary: { page: line.page, line: line.line },
    end: { page: line.page, line: line.line },
    page_read_failure: pageUnread,
    printed: { Date: printed }
  };
}

/**
 * Locate every record of every kind, in document order, and give each one its index in that order. A section
 * that is not printed yields no record and is reported separately — it is never read as "nothing on file".
 */
function locateRecords(model) {
  const unread = new Set(unreadPages(model));
  const lines = documentLines(model);
  const mopLegendReadings = printedLegendReadings(model, MOP_LEGEND_HEADING, '[0-9X]')
    .filter((reading) => !unread.has(reading.location.page));
  const mopLegend = {};
  for (const reading of mopLegendReadings) {
    // A definition on an unread page or conflicting meanings for one code cannot decode a history cell.
    const meanings = new Set(mopLegendReadings.filter((item) => item.code === reading.code).map((item) => item.meaning));
    if (meanings.size === 1) mopLegend[reading.code] = reading.meaning;
  }
  const tradelines = tradelineRegions(lines).map((region) => ({
    sort: { page: region[0].page, line: region[0].line },
    kinds: [TRADELINE_KIND],
    build: (index) => buildTradeline(region, index, unread, mopLegend, mopLegendReadings)
  }));
  const inquiries = [];
  for (const heading of INQUIRY_SECTIONS) {
    for (const line of inquirySectionLines(lines, heading)) {
      const record = buildInquiryRow(heading, line, unread.has(line.page));
      if (record) inquiries.push({ sort: { page: line.page, line: line.line }, kinds: [INQUIRY_KIND], record });
    }
  }
  const all = tradelines.concat(inquiries);
  all.sort((a, b) => (a.sort.page - b.sort.page) || (a.sort.line - b.sort.line));
  return all.map((entry, position) => (entry.build ? entry.build(position + 1) : Object.assign({}, entry.record, { record_index: position + 1 })));
}

/* ------------------------------------------------------------------ the report's own file date */

/**
 * The artifact prints no labelled report date. It states its own file date in prose, once, as
 * `... as of Mon D, YYYY`. That statement is read here, and it is read strictly: exactly one such phrase must
 * be printed and it must be followed by a date this presentation's forms can parse. Zero occurrences, more than
 * one occurrence, or an unparsable token each leave the reference date UNRESOLVED and are reported as different
 * reasons. Nothing is defaulted from a neighbouring date.
 */
function locateReferenceDate(model) {
  const text = readable(wholeDocumentText(model)).replace(/\s+/g, ' ');
  const occurrences = [];
  const phrase = new RegExp(`${REFERENCE_DATE_PHRASE} ([A-Za-z]{3,9} \\d{1,2}, \\d{4})`, 'g');
  let match = phrase.exec(text);
  while (match) {
    occurrences.push(match[1]);
    match = phrase.exec(text);
  }
  const base = {
    fact: 'REPORT_REFERENCE_DATE',
    source_field: `the printed sentence containing "${REFERENCE_DATE_PHRASE}"`,
    section_path: 'report body, page 2',
    occurrences_recorded: occurrences.length
  };
  const fail = (reason) => Object.assign(base, {
    status: FACT_STATUS.EXTRACTION_UNRESOLVED, reason, raw_value: null, normalized_value: null, location: null
  });
  if (occurrences.length === 0) return fail('REFERENCE_DATE_STATEMENT_NOT_PRINTED');
  const distinct = [...new Set(occurrences)];
  if (distinct.length > 1) return fail('REFERENCE_DATE_CONTRADICTORY');
  const parsed = normalizePrintedDate(distinct[0]);
  if (!parsed.normalized) {
    return fail(parsed.reason === 'IMPOSSIBLE_CALENDAR_VALUE' ? 'REFERENCE_DATE_IMPOSSIBLE_CALENDAR_VALUE' : 'REFERENCE_DATE_MALFORMED_PRINTED_FORM');
  }
  const located = documentLines(model).find((line) => readable(line.text).includes(REFERENCE_DATE_PHRASE));
  return Object.assign(base, {
    status: FACT_STATUS.RESOLVED,
    reason: null,
    raw_value: distinct[0],
    normalized_value: parsed.normalized,
    location: located ? { page: located.page, line: located.line, label: REFERENCE_DATE_PHRASE, section: 'report body' } : null
  });
}

/** The section each kind is read from, and whether the section was printed at all. */
function sectionPrinted(model, heading) {
  return documentLines(model).some((line) => headingPrintedOn(line, heading));
}


/* ------------------------------------------------------------------ admission gate */

/**
 * Every predicate is evaluated and recorded, so a refusal states the whole measured shape of the document
 * rather than only the first thing that failed.
 */
function admissionPredicates(model) {
  const predicates = [];
  const push = (id, passed, detail, refusal_reason) => predicates.push({
    id, passed, detail, refusal_reason: passed ? null : refusal_reason
  });
  const text = readable(wholeDocumentText(model));
  const upper = squashedDocumentText(model);
  const unreadable = model.read_errors.some((e) => e.stage === 'open' || e.stage === 'pdfinfo') || model.not_a_pdf === true;

  push('INPUT_PRESENT_AND_READABLE', !unreadable && model.pages.length > 0,
    unreadable ? 'the document could not be opened or parsed' : `${model.page_count} pages read`,
    model.not_a_pdf === true
      ? 'NOT_A_PDF_CONTAINER'
      /* An encrypted document whose own flags withhold copying has no pages to report, and the reason says so
         rather than reporting the empty page list as an unreadable document. */
      : (model.encrypted === true && model.text_extraction_permitted !== true
        ? 'TU_CA_ENCRYPTED_WITHOUT_PERMISSION_TO_READ'
        : 'DOCUMENT_NOT_READABLE'));
  push('CONTAINER_IS_A_PDF', model.not_a_pdf !== true, `kind=${model.kind}`, 'NOT_A_PDF_CONTAINER');

  /* An in-memory model is not a consumer's file, whatever it prints, and that is decided BEFORE anything about
     its content — so a fixture-shaped model is refused for being a model, not for being a fixture. */
  push('MODEL_IS_A_FILE_NOT_AN_IN_MEMORY_MODEL', model.synthetic !== true,
    model.synthetic === true ? 'the model is an in-memory synthetic model, not a file' : 'the model was read from a file',
    'TU_CA_IN_MEMORY_MODEL_IS_NOT_A_FILE');

  /* THE CONTAINER DIFFERENCE. This presentation is RC4-encrypted with printing and copying permitted, and its
     text layer reads. A PDF whose own permission flags withhold copying is refused here rather than read. */
  const encryptedWithoutPermission = model.encrypted === true && model.text_extraction_permitted !== true;
  push('ENCRYPTION_PERMITS_TEXT_EXTRACTION', !encryptedWithoutPermission,
    model.encrypted !== true
      ? 'the document is not encrypted'
      : (model.text_extraction_permitted === true
        ? `encrypted, and the document itself permits text extraction (${(model.encryption && model.encryption.raw) || 'permissions recorded'})`
        : 'the document is encrypted and withholds permission to extract its text'),
    'TU_CA_ENCRYPTED_WITHOUT_PERMISSION_TO_READ');

  const emptyPages = model.pages.filter((p) => !p.has_native_text).map((p) => p.page);
  const everyPageHasText = model.pages.length > 0 && emptyPages.length === 0
    && model.read_errors.every((e) => e.stage !== 'pdftotext');
  push('NATIVE_TEXT_ON_EVERY_PAGE', everyPageHasText,
    everyPageHasText ? 'all pages carry native text' : `pages without native text: ${emptyPages.join(',') || 'none read'}`,
    'TU_CA_IMAGE_ONLY_OR_NO_TEXT_LAYER');

  const fixtureHits = FIXTURE_MARKERS.filter((m) => upper.includes(m.toUpperCase()));
  const producerIsAFixtureFactory = /SYNTHETIC|FIXTURE|FACTORY/i.test(String(model.producer || ''));
  const fixtureDetail = fixtureHits.concat(producerIsAFixtureFactory ? ['the producer names a synthetic factory'] : []);
  push('NO_FIXTURE_OR_SYNTHETIC_MARKER', fixtureDetail.length === 0,
    fixtureDetail.length === 0 ? 'no fixture or synthetic marker' : `fixture marker present: ${fixtureDetail.join(', ')}`,
    'TU_CA_SYNTHETIC_OR_FIXTURE_MARKER');

  const channelHits = WRONG_CHANNEL_MARKERS.filter((m) => upper.includes(m.toUpperCase()));
  push('NO_WRONG_CHANNEL_MARKER', channelHits.length === 0,
    channelHits.length === 0 ? 'no subscriber or business marker' : `wrong-channel marker present: ${channelHits.join(', ')}`,
    'TU_CA_WRONG_CHANNEL_MARKER');

  const consumerHits = CONSUMER_CHANNEL_MARKERS.filter((m) => text.includes(m));
  push('CONSUMER_CHANNEL_MARKERS_PRESENT', consumerHits.length === CONSUMER_CHANNEL_MARKERS.length,
    `${consumerHits.length} of ${CONSUMER_CHANNEL_MARKERS.length} consumer-channel markers printed`,
    'TU_CA_CONSUMER_CHANNEL_MARKERS_ABSENT');

  const printed = headingNamesPrinted(model);
  const missing = REQUIRED_HEADINGS.filter((h) => !printed.includes(h));
  push('REQUIRED_STRUCTURE_HEADINGS_PRESENT', missing.length === 0,
    missing.length === 0 ? 'every required structural heading is printed' : `missing structural heading(s): ${missing.join('; ')}`,
    'NOT_THE_EVIDENCED_FAMILY_STRUCTURE');

  const boundaries = documentLines(model).filter((line) => readable(line.text).trim() === RECORD_BOUNDARY_LABEL).length;
  push('ACCOUNT_BLOCK_BOUNDARY_PRESENT', boundaries > 0,
    boundaries > 0 ? `${boundaries} account block boundary line(s) printed` : `the boundary line "${RECORD_BOUNDARY_LABEL}" is not printed`,
    'TU_CA_TRADELINE_BOUNDARY_ABSENT');

  const reference = locateReferenceDate(model);
  push('REPORT_REFERENCE_DATE_STATEMENT_PRESENT', reference.status === FACT_STATUS.RESOLVED,
    reference.status === FACT_STATUS.RESOLVED
      ? `the report states its own file date as ${reference.normalized_value}`
      : `the report's own file-date statement was not read (${reference.reason})`,
    'TU_CA_REFERENCE_DATE_STATEMENT_ABSENT');

  return predicates;
}


/**
 * Admit a document, or refuse it and name the reason and the fact status that reason produces. The contract is
 * a measured structure, not a digest gate, so admission says "this document has the family's measured
 * structure" — it does not say the document is any particular specimen.
 */
function admit(model) {
  const predicates = admissionPredicates(model);
  const firstFailure = predicates.find((p) => !p.passed);
  const family = {
    family_id: FAMILY_ID,
    evidenced_artifact_id: FAMILY_CONTRACT.evidenced_artifact_id,
    evidenced_sha256: FAMILY_CONTRACT.evidenced_sha256
  };
  if (!firstFailure) {
    return { state: 'ADMITTED_FAMILY_STRUCTURE', admitted: true, refusal_reason: null, fact_status: null, family, predicates };
  }
  return {
    state: 'REFUSED',
    admitted: false,
    refusal_reason: firstFailure.refusal_reason,
    fact_status: FAMILY_REFUSAL_REASONS[firstFailure.refusal_reason] || FACT_STATUS.UNSUPPORTED_PRESENTATION,
    family,
    predicates
  };
}

/* ------------------------------------------------------------------ reading */

/** How one kind's records were read, in one object, so a printed section and an empty one are never confused. */
function kindSummary(kind, printed, records) {
  const ofKind = records.filter((r) => r.kind === kind);
  const resolved = ofKind.filter((r) => r.status === FACT_STATUS.RESOLVED).length;
  let status;
  let reason;
  if (!printed) {
    status = FACT_STATUS.ABSENT_FROM_REPORT;
    reason = 'THE_SECTION_IS_NOT_PRINTED_BY_THIS_REPORT';
  } else if (!ofKind.length) {
    status = FACT_STATUS.ABSENT_FROM_REPORT;
    reason = 'THE_SECTION_IS_PRINTED_AND_CARRIES_NO_ITEM_THIS_READER_RECOGNISES';
  } else if (resolved > 0) {
    status = FACT_STATUS.RESOLVED;
    reason = null;
  } else {
    status = FACT_STATUS.EXTRACTION_UNRESOLVED;
    reason = 'NO_ITEM_OF_THIS_KIND_CARRIED_A_READABLE_DATE';
  }
  return { kind, section_printed: printed, records_read: ofKind.length, records_resolved: resolved, status, reason };
}


/**
 * The factual view the shared factual checks read. It carries this presentation's own printed facts, the page
 * and line each was printed on, the report's OWN printed legends, and nothing else: no page text and no account
 * identifier. A material field's raw reading is carried as printed; it is never normalized beyond what the
 * report itself prints.
 */
function buildFactualView(model, records, referenceDate) {
  return {
    view_id: 'CA-TRANSUNION-CONSUMER-FILE-FACTS',
    presentation_id: FAMILY_ID,
    source: 'the digest-pinned TransUnion Canada consumer disclosure, read read-only; the page text is built in memory and is not retained',
    reader_evidence: 'read-only local extraction of the evidenced presentation; no page text is returned and no identifier is retained',
    text_source: model.text_extraction_tool,
    reference_date: {
      status: referenceDate.status,
      reason: referenceDate.reason || null,
      raw: referenceDate.raw_value || null,
      normalized: referenceDate.normalized_value || null,
      source_field: referenceDate.source_field,
      location: referenceDate.location || null,
      occurrences_recorded: referenceDate.occurrences_recorded
    },
    summary_counts: [],
    records,
    identity_groups: [],
    policy_statements: [],
    headings_printed: headingNamesPrinted(model),
    pages_not_read: unreadPages(model),
    label_forms: {
      full_date: 'Mon D, YYYY',
      partial_date: 'Mon YYYY — printed without a day; reported as such and never completed',
      recorded_from: 'the evidenced presentation, by exact string match'
    },
    printed_but_not_read: WRAPPED_OR_GRAPHICAL_LABELS_NOT_READ.map((row) => ({
      printed_as: row.printed_as.slice(),
      would_mean: row.would_mean,
      why_not_read: row.why_not_read
    })),
    printed_legends: {
      usual_manner_of_payment: mannerOfPaymentLegend(model),
      account_type: accountTypeLegend(model)
    },
    report_text_retained: false,
    note:
      'A reading of the presentation\'s own printed facts and its own printed legends. It carries no legal rule, ' +
      'no legal conclusion and no statutory applicability, and it returns no page text and no account identifier.'
  };
}


/**
 * Extract the family's records and the case-level printed evidence the factual checks read. Nothing is dropped
 * silently: a section that is not printed and a section that is printed but carries no recognised item are
 * reported as two different things, and the graphical payment-history grid is reported as not read.
 */
function extract(model, admission) {
  const referenceDate = locateReferenceDate(model);
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
      evidence_readings: { sections_printed: [], records_found: 0, policy_statements: [], factual_view: null }
    };
  }
  const records = locateRecords(model).map((record) => {
    const anchor = record.printed[TRADELINE_DATE_LABELS[0]] || null;
    const readableAnchor = anchor && anchor.state === 'VALUE' ? anchor : null;
    return Object.assign(record, {
      status: FACT_STATUS.RESOLVED,
      reason: null,
      normalized_value: readableAnchor ? readableAnchor.normalized : null,
      raw_value: readableAnchor ? readableAnchor.raw : null,
      source_field: TRADELINE_DATE_LABELS[0],
      section_path: record.section,
      ...(referenceDate.status === FACT_STATUS.RESOLVED && referenceDate.raw_value != null
        && referenceDate.normalized_value && referenceDate.location ? {
          report_reference_date: { ...referenceDate, location: { ...referenceDate.location } }
        } : {})
    });
  });
  const byKind = {
    [TRADELINE_KIND]: kindSummary(TRADELINE_KIND, sectionPrinted(model, KIND_SECTIONS[TRADELINE_KIND]), records),
    [INQUIRY_KIND]: kindSummary(INQUIRY_KIND, INQUIRY_SECTIONS.some((h) => sectionPrinted(model, h)), records)
  };
  return {
    reference_date: referenceDate,
    records,
    summary: {
      status: records.length ? FACT_STATUS.RESOLVED : FACT_STATUS.ABSENT_FROM_REPORT,
      reason: records.length ? null : 'NO_RECORD_OF_ANY_FAMILY_KIND',
      records_read: records.length,
      resolved_fact_count: records.length,
      by_kind: byKind
    },
    evidence_readings: {
      sections_printed: headingNamesPrinted(model),
      policy_statements: [],
      records_found: records.length,
      factual_view: buildFactualView(model, records, referenceDate)
    }
  };
}

/** The per-record fact object a rule adapter would read. This family binds no rule, so it supplies none. */
function factsForRecord(record) {
  return record && record.facts ? Object.assign({}, record.facts) : {};
}


/* ------------------------------------------------------------------ the recorded evidence and the contract */

const { PR_02_SPECIMEN, pointerFor } = require('../../../internal-validation/ca-ns-last-payment-six-year/runtime-config.cjs');

/**
 * The preserved record this family's evidence pointer comes from, as a runtime constant. It is NOT read from
 * the historical PROD-003 register at runtime and no checkout path is hardcoded: the pinned digest and identity
 * are constants, and the specimen's on-disk path comes from CRP_CA_TRANSUNION_SPECIMEN (only needed to re-read
 * the original bytes). If the host does not hold the specimen, `available` is false and the digest cannot be
 * re-measured, but the structural contract itself still works from its embedded values.
 */
function readSecondCanadianPointer() {
  const pointer = pointerFor(PR_02_SPECIMEN, 'CRP_CA_TRANSUNION_SPECIMEN');
  return Object.assign({}, pointer, {
    register_status_as_recorded: 'SECONDARY_CORROBORATING_PRESENTATION_NOT_ADMITTED_FOR_A_RULE_UNIT'
  });
}

/** Re-verify the specimen's bytes against the recorded digest. Read-only; nothing is copied or written. */
function verifySpecimenDigest(pointer) {
  const fs = require('node:fs');
  const crypto = require('node:crypto');
  if (!pointer || pointer.available !== true) {
    return { verified: false, reason: (pointer && pointer.reason) || 'NO_POINTER', digest: null, recorded_digest: null };
  }
  const digest = crypto.createHash('sha256').update(fs.readFileSync(pointer.absolute_path)).digest('hex').toUpperCase();
  const recorded = String(pointer.sha256).toUpperCase();
  const verified = digest === recorded;
  return { verified, reason: verified ? null : 'THE_FILE_NO_LONGER_MATCHES_THE_RECORDED_DIGEST', digest, recorded_digest: recorded };
}


/**
 * THE MEASURED CONTRACT. Every value here was measured on the evidenced presentation by exact string match,
 * and each one is re-measured by the suite so the record cannot drift from the document.
 */
const FAMILY_CONTRACT = Object.freeze({
  family_id: FAMILY_ID,
  definition: 'the TransUnion Canada consumer-channel consumer disclosure evidenced by the preserved PROD-003 register record for PR-02',
  publisher: 'TransUnion (Canada, consumer channel)',
  market: 'CA',
  country: COUNTRY,
  audience: 'CONSUMER',
  container: 'PDF',
  encryption: 'RC4, print permitted, copy permitted, change and annotation refused',
  page_count: 12,
  page_size_label: 'letter',
  observed_geometry: Object.freeze({ width_pt: 612, height_pt: 792 }),
  page_size_tolerance_pt: 0.5,
  native_text_on_every_page: true,
  required_headings: REQUIRED_HEADINGS,
  record_boundary_label: RECORD_BOUNDARY_LABEL,
  printed_date_forms: Object.freeze(['Mon D, YYYY', 'Mon YYYY (no day — reported as a partial date)']),
  printed_fields: Object.freeze({
    TU_CA_TRADELINE: TRADELINE_DATE_LABELS.concat(TRADELINE_TEXT_LABELS),
    TU_CA_INQUIRY: Object.freeze(['Date'])
  }),
  reference_date_statement: `the printed sentence containing "${REFERENCE_DATE_PHRASE}" followed by Mon D, YYYY`,
  evidenced_artifact_id: 'LEG-CONSUMER-TU-CA',
  evidenced_sha256: '244D58080254D9879468A43D56DA02BC952A20579E1BE9A51F83B7378439EFB4',
  evidenced_bytes: 362891,
  evidence_source: 'SOURCE_CAPTURES\\PROD-003\\report_representation_register.json presentations[PR-02] (read-only), re-verified by digest at run time',
  additive_evidence_package: 'SOURCE_CAPTURES\\B4-CA-CONSUMER-FAMILIES\\tu-ca-family-admission.json',
  boundary: Object.freeze([
    'Read support is evidenced for this STRUCTURE, measured on ONE real TransUnion Canada consumer disclosure. A document that does not satisfy the predicates is refused, and the refusal names the predicate it failed.',
    'It is not a claim about every report from this bureau, and it is not a claim about another TransUnion product, another print date or another language.',
    'PR-01\'s digest gate is untouched and still governs the Equifax presentation, and the Nova Scotia statutory limb stays bound to PR-01. This contract is an ADDITIONAL admissions path, never a relaxation of any other.',
    'The account block\'s material fields are read through its own printed captions and table header. No account identifier is read, invented or returned: this presentation prints no account number inside an account block, so no masked identifier is ever matched.'
  ])
});

/**
 * THE CURRENCY EVIDENCE, MEASURED RATHER THAN ASSERTED. Unlike the GB family's 2007 fictitious example, this
 * specimen is a real, present-day consumer disclosure the bureau itself generated for a consumer, and its own
 * printed content dates it. That is what lets present-day support be claimed FOR THIS STRUCTURE — and the
 * boundary states exactly how far that reaches.
 */
const CURRENCY_EVIDENCE = Object.freeze({
  status: 'EVIDENCED_FROM_ONE_REAL_PRESENT_DAY_CONSUMER_DISCLOSURE',
  evidence_is_a_real_consumer_document: true,
  present_day_support_claimed: true,
  currency_validated: true,
  validated_against: 'the evidenced presentation itself: a TransUnion-generated consumer disclosure, read read-only on this machine',
  specimens_measured: 1,
  reason_the_claim_is_bounded:
    'ONE specimen, of ONE product, of ONE bureau, at ONE print date. The STRUCTURE it measures is what is admitted; a different layout is refused by the same predicates.',
  what_would_strengthen_it: Object.freeze([
    'a second TransUnion Canada consumer disclosure at a different print date, so the structural contract is measured across documents and not from one',
    'an official TransUnion Canada field/layout specification, measured against the specimen',
    'an Equifax Canada second specimen, for the same reason, if the Equifax presentation is ever to move from exact-specimen to family'
  ])
});

module.exports = {
  FAMILY_ID,
  COUNTRY,
  PUBLISHER_NAME,
  PUBLISHER_MARKET,
  FAMILY_CONTRACT,
  CURRENCY_EVIDENCE,
  FAMILY_REFUSAL_REASONS,
  REQUIRED_HEADINGS,
  ALL_HEADINGS,
  INQUIRY_SECTIONS,
  CONSUMER_CHANNEL_MARKERS,
  WRONG_CHANNEL_MARKERS,
  FIXTURE_MARKERS,
  RECORD_BOUNDARY_LABEL,
  REFERENCE_DATE_PHRASE,
  TRADELINE_KIND,
  INQUIRY_KIND,
  KIND_SECTIONS,
  TRADELINE_DATE_LABELS,
  TRADELINE_TEXT_LABELS,
  TRADELINE_LABELS,
  WRAPPED_OR_GRAPHICAL_LABELS_NOT_READ,
  readSecondCanadianPointer,
  verifySpecimenDigest,
  admissionPredicates,
  admit,
  extract,
  factsForRecord,
  locateReferenceDate,
  locateRecords,
  labeledValues,
  readAccountMaterial,
  monthlyRows,
  tableColumns,
  mannerOfPaymentLegend,
  accountTypeLegend,
  narrativeCodesOf,
  amountOf,
  TABLE_HEADING_LABEL,
  TABLE_HEADER_CAPTIONS,
  normalizePrintedDate,
  headingNamesPrinted,
  headingPrintedOn,
  sectionPrinted,
  buildFactualView,
  readable,
  documentLines,
  wholeDocumentText,
  squashedDocumentText,
  unreadPages
};

