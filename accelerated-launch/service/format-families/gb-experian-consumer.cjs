'use strict';
/**
 * gb-experian-consumer.cjs — the third admitted report-format family: the GB consumer credit report.
 *
 * OWNER-ALL82-001 / B3 continuation. The owner directed: "Follow the already identified official
 * consumer-disclosure download/help routes ... Use targeted retrieval for the missing consumer
 * representation ... Inspect official consumer report examples ... Do not substitute subscriber/training
 * material or synthetic fixtures for genuine consumer-format evidence ... Implement a supported
 * consumer-format adapter and meaningful factual checks."
 *
 * WHAT THE EVIDENCE IS, EXACTLY. `SOURCE_CAPTURES/REPORT_FORMAT_BASELINE_2026-09-30/PUB-009.pdf` is the
 * captured Experian United Kingdom consumer report example linked from Experian's own consumer help route
 * (`www.experian.co.uk/creditability/Resources/mockReportV6Jun07.pdf`; 9 pages, A4, native text on every
 * page, SHA-256 5e95f3d27c4102c7772b33d0e11f3f4e0f37d253b2147e635db54e9bd328aec4). It is the document a
 * consumer received: an addressed letter headed `Your Credit Report`, with the consumer channel's own
 * section skeleton and its own item numbering (E/S/L/J/C/P/U/B/F/T). It is NOT subscriber material: it
 * carries no subscriber product, no business report and no bureau-to-lender layout, and the wrong-channel
 * predicate below refuses those by their own printed markers.
 *
 * WHAT THE EVIDENCE DOES **NOT** SUPPORT, and is not claimed:
 *   • The artifact's own face states that its information is fictitious and that it is issued for training
 *     and educational purposes. It therefore evidences the STRUCTURE of the GB consumer credit report as
 *     Experian printed it in June 2007 — and nothing about any consumer's data, and nothing about the
 *     present-day layout of any bureau's GB consumer report. Its vintage is a named remaining blocker.
 *   • It evidences ONE bureau's GB consumer presentation. No TransUnion or Equifax GB layout is claimed.
 *     The current TransUnion GB consumer route and collateral both refuse retrieval (HTTP 403), and the
 *     Equifax GB glossary URL returns 404.
 *
 * Boundaries this module keeps:
 *   • A DOCUMENT IS NOT MATCHED BY ITS NAME OR ITS PRODUCER. Admission is a conjunction of measured
 *     structural predicates; a lookalike fails on the predicate it fails, and the failure is reported.
 *   • A RECORD NEVER BORROWS A FIELD. A label is read only inside the item region that prints it, and a
 *     two-digit year is expanded only through the recorded convention below.
 *   • A MISSING LABEL, A BLANK LABEL AND A MALFORMED VALUE ARE THREE DIFFERENT READINGS.
 *   • IT EMITS NO FINDING AND NO STATUTORY CONCLUSION OF ANY KIND. It reads printed facts; the factual
 *     checks that consume it are in `factual-checks.cjs`, and they are labelled there.
 */

const { FACT_STATUS } = require('../../../internal-validation/ca-ns-last-payment-six-year/constants.cjs');

const FAMILY_ID = 'FAM-GB-EXP-CONSUMER';

/** The publisher identity this family is evidenced for, as the artifact prints it. */
const PUBLISHER_NAME = 'Experian';
const CONSUMER_HELP_ROUTE = 'www.experian.co.uk';

/** The fixed section skeleton the artifact prints. A heading ends the region it is not. */
const REQUIRED_HEADINGS = Object.freeze([
  'Application details', 'Electoral roll information', 'Aliases', 'Financial associations',
  'Public record information', 'Credit account information', 'Previous searches', 'Notice of Correction'
]);

/** Every heading the section scanner recognises, including the ones it does not read records from. */
const ALL_HEADINGS = Object.freeze(REQUIRED_HEADINGS.concat([
  'Council of Mortgage Lenders (CML) information', 'Financial associate searches', 'Linked addresses',
  'CIFAS - The UK\'s Fraud Prevention Service', 'Gone Away Information Network (GAIN)', 'Useful addresses'
]));

/** The markers the consumer channel itself prints. The letter is what makes this the consumer presentation. */
const CONSUMER_CHANNEL_MARKERS = Object.freeze(['Your Credit Report', 'Date of report:', 'Consumer Help Service', 'Useful addresses']);

/** Printed markers of a subscriber, business or bureau-to-lender document. Any one of them refuses the file. */
const WRONG_CHANNEL_MARKERS = Object.freeze(['SUBSCRIBER', 'TOTALVIEW', 'CREDIT EXPERT', 'INTERPRETATION GUIDE', 'BUSINESS REPORT']);

/** Markers of a fixture masquerading as a report. Any one of them refuses the file. */
const FIXTURE_MARKERS = Object.freeze(['SYNTHETIC TEST INPUT', 'NOT A CREDIT REPORT', 'SYNTHETIC FIXTURE', 'TEST FIXTURE', 'SAMPLE CREDIT BUREAU']);

/** Refusal reasons this family adds, and the fact status each produces. */
const FAMILY_REFUSAL_REASONS = Object.freeze({
  NOT_THE_EVIDENCED_FAMILY_STRUCTURE: FACT_STATUS.UNSUPPORTED_PRESENTATION,
  FAMILY_CONSUMER_CHANNEL_MARKERS_ABSENT: FACT_STATUS.UNSUPPORTED_PRESENTATION,
  FAMILY_WRONG_CHANNEL_MARKER: FACT_STATUS.UNSUPPORTED_PRESENTATION,
  FAMILY_SYNTHETIC_OR_FIXTURE_MARKER: FACT_STATUS.UNSUPPORTED_PRESENTATION,
  FAMILY_IMAGE_ONLY_OR_NO_TEXT_LAYER: FACT_STATUS.UNSUPPORTED_PRESENTATION,
  FAMILY_IN_MEMORY_MODEL_IS_NOT_A_FILE: FACT_STATUS.UNSUPPORTED_PRESENTATION,
  DOCUMENT_NOT_READABLE: FACT_STATUS.EXTRACTION_UNRESOLVED,
  NOT_A_PDF_CONTAINER: FACT_STATUS.UNSUPPORTED_PRESENTATION,
  DOCUMENT_ENCRYPTED: FACT_STATUS.EXTRACTION_UNRESOLVED
});

/**
 * The recorded two-digit-year convention. The artifact prints item dates as `DD/MM/YY` and its own report
 * date as `D Month YYYY`. Reading a `YY` form at all requires a convention, so it is recorded here rather
 * than left implicit: the artifact's item dates run from 1998 to 2007 and its report date is 2007, so a
 * two-digit year at or above 70 is read as 19YY and anything below it as 20YY.
 */
const TWO_DIGIT_YEAR_CONVENTION = Object.freeze({
  rule: 'YY >= 70 -> 19YY, otherwise 20YY',
  evidence: 'the artifact prints item dates from 1998 to 2007 and its own report date is 1 June 2007',
  boundary: 'a date this convention cannot place is reported UNRESOLVED rather than read under a second convention'
});

const SHORT_DATE_FORM = /^(\d{2})\/(\d{2})\/(\d{2})$/;
const FULL_DATE_FORM = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const LONG_DATE_FORM = /^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})$/;

const MONTHS = Object.freeze({
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8,
  september: 9, october: 10, november: 11, december: 12
});

/** `Date of report:` is the label the artifact prints for its own reference date. */
const REFERENCE_DATE_LABEL = 'Date of report:';

function readable(text) {
  return String(text === undefined || text === null ? '' : text)
    .replace(/\uFB01/g, 'fi').replace(/\uFB02/g, 'fl')
    .replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-').replace(/\u00A0/g, ' ');
}

function documentLines(model) {
  const lines = [];
  for (const page of model.pages) {
    page.lines.forEach((text, index) => lines.push({ page: page.page, line: index + 1, text }));
  }
  return lines;
}

function isHeading(text) {
  return ALL_HEADINGS.includes(String(text).trim());
}

function wholeDocumentText(model) {
  return model.pages.map((p) => readable(p.text)).join('\n');
}

/** The document's text with every run of whitespace collapsed to one space, for sentence matching. */
function squashedDocumentText(model) {
  return wholeDocumentText(model).replace(/\s+/g, ' ').trim();
}

/**
 * The lines that follow `heading`, ending at the next heading. A heading that is the same heading repeated
 * for a continued page (`<heading> continued`) does NOT end the region: the artifact prints one logical
 * section across two pages.
 */
function sectionLines(model, heading) {
  const lines = documentLines(model);
  const out = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].text.trim() !== heading) continue;
    let end = lines.length;
    for (let j = i + 1; j < lines.length; j += 1) {
      const text = lines[j].text.trim();
      if (text === `${heading} continued`) continue;
      if (isHeading(text)) { end = j; break; }
    }
    out.push(...lines.slice(i + 1, end));
  }
  return out;
}

/**
 * The printed field labels the contract depends on, hoisted above the currency record so the currency record
 * can MEASURE itself against the same list rather than restate a number that could drift from it.
 */
const PRINTED_FIELDS = Object.freeze({
  GB_CREDIT_ACCOUNT: Object.freeze(['Started', 'Balance', 'Credit Limit', 'Settled', 'Default', 'Defaulted', 'Current Balance', 'Status history', 'File updated for the period to']),
  GB_PUBLIC_RECORD: Object.freeze(['Information type', 'Date', 'End date', 'Discharged', 'Amount', 'Satisfied', 'Court name', 'Case number', 'Source:']),
  GB_PREVIOUS_SEARCH: Object.freeze(['Searched on', 'Searched by', 'Application type', 'Date of birth'])
});

const PRINTED_FIELD_COUNT = Object.values(PRINTED_FIELDS).reduce((total, list) => total + list.length, 0);

/**
 * OWNER-ALL82-001 / B4 — THE CURRENCY EVIDENCE, MEASURED RATHER THAN ASSERTED.
 *
 * B4's order was to "seek targeted current consumer-format evidence or authoritative current field/layout
 * documentation … validate or revise the family contract … Keep the 2007 sample labeled historical
 * demonstration evidence; do not advertise present-day support from it alone."
 *
 * WHAT WAS SOUGHT, AND WHAT CAME BACK (recorded verbatim; a refusal is a result, not a blank):
 *   • Experian's own CreditAbility resources index (`www.experian.co.uk/creditability/`) — HTTP 403.
 *   • Experian's consumer understanding route (`.../understanding-your-credit-report.html`) — HTTP 404.
 *   • TransUnion GB's 2024 consumer collateral PDF — HTTP 403.
 *   These are the same three bureaus and largely the same routes the 2026-09-30 baseline captured, and they
 *   refuse this client the same way. No credential, no proxy and no scraping evasion was used.
 *
 * WHAT IS ON HAND THAT IS CURRENT: exactly one official GB artifact — PUB-024, Equifax's statutory-report
 * route, captured 2026-09-30. It was MEASURED against this contract's own vocabulary (see
 * `label_currency_check` below) and it matches NOTHING: it is a product/route page that names no GB consumer
 * report section heading and no printed field label this family depends on.
 *
 * THE HONEST CONCLUSION, and the reason this is a narrowing rather than an extension: the family contract CANNOT
 * be validated against current evidence, because no current GB consumer-format artifact or layout specification
 * is available to this build. The contract is therefore left exactly as the 2007 example evidences it, and its
 * currency is recorded as UNESTABLISHED with the measurement that shows why. `present_day_support_claimed` is
 * false, and the coverage surface says so before anything is uploaded.
 */
const CURRENCY_EVIDENCE = Object.freeze({
  status: 'HISTORICAL_DEMONSTRATION_EVIDENCE_ONLY',
  evidence_vintage: '1 June 2007',
  present_day_support_claimed: false,
  currency_validated: false,
  current_evidence_attempts: Object.freeze([
    Object.freeze({ route: 'www.experian.co.uk/creditability/', purpose: 'the publisher\'s own consumer resources index, where the 2007 example was linked from', result: 'HTTP_403_FORBIDDEN' }),
    Object.freeze({ route: 'www.experian.co.uk/consumer/credit-report/understanding-your-credit-report.html', purpose: 'a current consumer explanatory route', result: 'HTTP_404_NOT_FOUND' }),
    Object.freeze({ route: 'www.transunion.co.uk/content/dam/transunion/gb/consumer/collateral/your-credit-file-explained-2024-transunion.pdf', purpose: 'a dated-2024 consumer collateral document', result: 'HTTP_403_FORBIDDEN' }),
    Object.freeze({ route: 'www.equifax.co.uk/products/credit/statutory-report', purpose: 'the only GB artifact already captured that is current', result: 'ON_HAND_AND_MEASURED_IN_EARLIER_ATTEMPT' })
  ]),
  label_currency_check: Object.freeze({
    artifact_id: 'PUB-024',
    publisher: 'Equifax (United Kingdom)',
    captured_at: '2026-09-30',
    what_it_is: 'a product and route page for the statutory report, not a report and not a layout specification',
    headings_tested: REQUIRED_HEADINGS.length,
    /**
     * MEASURED, not asserted, against the captured current official GB artifact PUB-024: ONE of the eight
     * headings occurs in it — `Financial associations` — and it occurs inside marketing prose about the
     * product. The batch that recorded this first wrote an empty list; the live measurement (which
     * `tests/sections/v-presentation-and-release.cjs` re-runs against the captured file) shows that hit, so the
     * record now states exactly what was measured rather than what was expected.
     */
    headings_matched: Object.freeze(['Financial associations']),
    printed_fields_tested: PRINTED_FIELD_COUNT,
    /**
     * MEASURED, not asserted: five of the contract's field tokens occur in the captured HTML — `Started`,
     * `Balance`, `Default`, `Defaulted` and `Date` — and every one of them occurs inside marketing prose about
     * the product rather than as a report field label.
     */
    printed_fields_matched_as_substrings: Object.freeze(['Started', 'Balance', 'Default', 'Defaulted', 'Date']),
    interpretation:
      'EVERY OCCURRENCE OF EVERY MATCHED TOKEN IS IN MARKETING PROSE ABOUT THE PRODUCT, NOT A REPORT FIELD ' +
      'LABEL. A product page neither validates nor invalidates a report layout, so this artifact settles ' +
      'nothing about the contract.',
    measured_on: '2026-10-01',
    result: 'THE_ONLY_CURRENT_OFFICIAL_GB_ARTIFACT_ON_HAND_VALIDATES_NO_HEADING_AND_NO_FIELD_LABEL_OF_THIS_CONTRACT_AS_A_REPORT_LABEL'
  }),
  what_would_close_it:
    'a current (post-2020) bureau-issued GB consumer report artifact, or an official current layout ' +
    'specification from the publisher, captured and measured against this contract. Until then this family ' +
    'reads a 2007-shaped GB consumer report and this build does not advertise present-day GB support.'
});

const FAMILY_CONTRACT = Object.freeze({
  family_id: FAMILY_ID,
  definition: 'the GB consumer credit report evidenced by the captured official consumer report example PUB-009',
  publisher: PUBLISHER_NAME,
  market: 'GB',
  audience: 'CONSUMER',
  channel: 'BUREAU_PUBLISHED_CONSUMER_REPORT_EXAMPLE_LINKED_FROM_THE_OFFICIAL_CONSUMER_HELP_ROUTE',
  container: 'PDF',
  native_text_on_every_page: true,
  evidenced_artifact_id: 'PUB-009',
  evidenced_sha256: '5e95f3d27c4102c7772b33d0e11f3f4e0f37d253b2147e635db54e9bd328aec4',
  evidenced_pages: 9,
  evidenced_page_size: '595 x 842 pts (A4)',
  evidenced_report_date: '1 June 2007',
  evidence_source: 'SOURCE_CAPTURES/REPORT_FORMAT_BASELINE_2026-09-30/ (INVENTORY.md, file_custody_manifest.json, PUB-009.pdf)',
  reference_date_label: REFERENCE_DATE_LABEL,
  item_number_prefixes: Object.freeze({ GB_CREDIT_ACCOUNT: 'C', GB_PUBLIC_RECORD: 'J', GB_PREVIOUS_SEARCH: 'P' }),
  two_digit_year_convention: TWO_DIGIT_YEAR_CONVENTION,
  printed_fields: PRINTED_FIELDS,
  currency_evidence: CURRENCY_EVIDENCE,
  boundary: [
    'Read support is evidenced for this FAMILY, by structure, from ONE captured official consumer report example. That artifact proves the structure it exhibits; it does not prove that every current GB consumer file prints it, and it is dated 1 June 2007, so its vintage is a named remaining blocker rather than a hidden assumption.',
    'B4: NO PRESENT-DAY GB SUPPORT IS ADVERTISED FROM THIS EXAMPLE. The only current official GB artifact on hand is a product/route page (PUB-024), it names no heading and no printed label this contract depends on, and targeted retrieval of current material failed at the source (403, 404, 403). The currency of this family is therefore UNESTABLISHED, recorded in `currency_evidence`, and stated to the consumer before any upload.',
    'The artifact\'s own face states that its information is fictitious and that it is issued for training and educational purposes. It is admitted as CONSUMER-FORMAT STRUCTURE evidence only: no data on it is treated as any person\'s data, and it establishes no presentation evidence about any consumer.',
    'It evidences ONE bureau\'s GB consumer presentation. No TransUnion GB or Equifax GB layout is admitted or claimed.',
    'PR-01\'s digest gate is untouched and still governs the Canadian presentation, and the Australian and United States families are untouched. This contract is an additional admissions path, not a relaxation of any other.',
    'BLOCKER-REPORT-DATA-TO-ISSUE-001: this reader maps the printed material it ALREADY reads (balance, current balance, credit limit, default amount, status history, and the printed `JOINT ACCOUNT` marker) to the shared ordinary-account fact vocabulary. It does NOT read the creditor/type line or decode the status-history codes: the artifact prints its creditor name and account type in at least three different arrangements on its own items (so the two are not separable without a cell-width assumption), and it prints NO status-code legend (its prose points to a separate leaflet), so every status-history cell is marked uncertain and no code is guessed. No balance/past-due comparison can run on this presentation: it prints no past-due and no payment amount.'
  ]
});

function isImpossibleCalendarDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  if (m < 1 || m > 12) return true;
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return d < 1 || d > days[m - 1];
}

/** Normalize one printed date token under the recorded convention. A token that is not a date is refused. */
function normalizePrintedDate(token) {
  const text = String(token || '').trim();
  const long = LONG_DATE_FORM.exec(text);
  if (long) {
    const month = MONTHS[long[2].toLowerCase()];
    if (!month) return { normalized: null, reason: 'VALUE_MALFORMED_PRINTED_FORM' };
    const iso = `${long[3]}-${String(month).padStart(2, '0')}-${String(Number(long[1])).padStart(2, '0')}`;
    if (isImpossibleCalendarDate(iso)) return { normalized: null, reason: 'IMPOSSIBLE_CALENDAR_VALUE' };
    return { normalized: iso, reason: null };
  }
  const full = FULL_DATE_FORM.exec(text);
  if (full) {
    const iso = `${full[3]}-${full[2]}-${full[1]}`;
    if (isImpossibleCalendarDate(iso)) return { normalized: null, reason: 'IMPOSSIBLE_CALENDAR_VALUE' };
    return { normalized: iso, reason: null };
  }
  const short = SHORT_DATE_FORM.exec(text);
  if (short) {
    const year = Number(short[3]) >= 70 ? `19${short[3]}` : `20${short[3]}`;
    const iso = `${year}-${short[2]}-${short[1]}`;
    if (isImpossibleCalendarDate(iso)) return { normalized: null, reason: 'IMPOSSIBLE_CALENDAR_VALUE' };
    return { normalized: iso, reason: null, two_digit_year_expanded_by: TWO_DIGIT_YEAR_CONVENTION.rule };
  }
  return { normalized: null, reason: 'VALUE_MALFORMED_PRINTED_FORM' };
}

/* ------------------------------------------------------------------ reading labels inside a record */

/**
 * Every labelled token in a region, read left to right with longest-label-first matching and case-sensitive
 * comparison, so `Current Balance` is never read as `Balance` and `Defaulted` is never read as `Default`.
 * A label is only recognised at a word boundary, so a label named inside prose is not a record's field.
 */
function labeledTokens(lines, labels) {
  const ordered = labels.slice().sort((a, b) => b.length - a.length);
  const out = [];
  for (const entry of lines) {
    const text = readable(entry.text);
    let i = 0;
    while (i < text.length) {
      const atBoundary = i === 0 || /\s/.test(text.charAt(i - 1));
      if (atBoundary) {
        const label = ordered.find((candidate) => text.startsWith(candidate, i)
          && (i + candidate.length === text.length || /\s/.test(text.charAt(i + candidate.length))));
        if (label) {
          const after = text.slice(i + label.length);
          const offset = after.search(/\S/);
          const token = offset === -1 ? '' : (after.slice(offset).match(/\S+/) || [''])[0];
          out.push({ label, page: entry.page, line: entry.line, token, value_present: token.length > 0 });
          i += label.length + (offset === -1 ? 1 : offset + token.length);
          continue;
        }
      }
      i += 1;
    }
  }
  return out;
}

/**
 * A label whose printed value is the REST of its line up to the next recognised label — the artifact prints
 * multi-word values this way (`Information type SATISFIED JUDGMENT`). The value is retained as printed.
 */
function multiWordValues(lines, label, labels) {
  const ordered = labels.slice().sort((a, b) => b.length - a.length);
  const out = [];
  for (const entry of lines) {
    const text = readable(entry.text);
    const at = text.indexOf(label);
    if (at === -1) continue;
    if (at !== 0 && !/\s/.test(text.charAt(at - 1))) continue;
    let cut = text.length;
    for (const candidate of ordered) {
      if (candidate === label) continue;
      const next = text.indexOf(candidate, at + label.length);
      if (next !== -1 && (next === 0 || /\s/.test(text.charAt(next - 1))) && next < cut) cut = next;
    }
    const value = text.slice(at + label.length, cut).trim();
    out.push({ label, page: entry.page, line: entry.line, token: value, value_present: value.length > 0 });
  }
  return out;
}

/** The three-value reading of one label, always in the same five-state vocabulary as the Canadian reader. */
function printedValue(label, hits, pageUnread, isDate) {
  if (pageUnread) {
    return { label, state: 'PAGE_NOT_READ', raw: null, normalized: null, reason: 'THE_PAGE_CARRYING_THIS_RECORD_COULD_NOT_BE_READ', location: null };
  }
  if (!hits.length) return { label, state: 'NOT_PRINTED', raw: null, normalized: null, reason: 'LABEL_NOT_PRINTED_ON_THIS_RECORD', location: null };
  const hit = hits[0];
  const location = { page: hit.page, line: hit.line, label };
  if (!hit.value_present) {
    return { label, state: 'LABEL_PRINTED_WITHOUT_VALUE', raw: null, normalized: null, reason: 'LABEL_PRINTED_WITHOUT_VALUE', location };
  }
  if (!isDate) return { label, state: 'VALUE', raw: hit.token, normalized: null, reason: null, location };
  const { normalized, reason } = normalizePrintedDate(hit.token);
  if (!normalized) return { label, state: 'VALUE_MALFORMED_PRINTED_FORM', raw: hit.token, normalized: null, reason, location };
  return { label, state: 'VALUE', raw: hit.token, normalized, reason: null, location };
}

/* ------------------------------------------------------------------ record boundaries */

/** The lines of one item, from its own printed number to the next item number in the same region. */
/** A printed VALUE reading, or null: a label that is not printed, is blank or could not be read maps nothing. */
function valueOf(field) {
  return field && field.state === 'VALUE' && field.raw ? field : null;
}

/**
 * A printed GB money amount as a number, only when the whole value is a printed amount; otherwise undefined.
 * A word such as `Satisfied` is a printed reading, not a number, and is never coerced to zero.
 */
function amountOf(raw) {
  if (raw === undefined || raw === null) return undefined;
  const text = String(raw).replace(/[£,\s]/g, '');
  if (!/^\d+(\.\d+)?$/.test(text)) return undefined;
  const value = Number(text);
  return Number.isFinite(value) ? value : undefined;
}

/**
 * The printed status-history characters of one credit account, as raw cells. The artifact does NOT print its
 * status-code legend: its own prose directs the reader to a separate explanatory leaflet. So NO cell is given a
 * meaning, no cell is given a period (the artifact prints none), and every cell is marked UNCERTAIN. An unread
 * or unlistable code is never decoded by guessing and is never treated as a missed payment.
 */
function statusHistoryCells(raw) {
  if (raw === undefined || raw === null) return [];
  return String(raw).replace(/[^A-Za-z0-9]/g, '').split('').map((code) => ({
    period: null,
    code,
    meaning: null,
    uncertain: true
  }));
}

/**
 * The artifact prints `JOINT ACCOUNT` as its own line on a jointly held credit account and prints nothing on a
 * solely held one. Absence is NEVER read as `INDIVIDUAL`: only the printed marker is mapped.
 */
function jointMarkerPrinted(region) {
  return region.some((entry) => readable(entry.text).trim().toUpperCase() === 'JOINT ACCOUNT');
}

function itemRegions(model, heading, prefix) {
  const lines = sectionLines(model, heading);
  const marker = new RegExp(`^${prefix}\\d+\\s`);
  const starts = [];
  lines.forEach((entry, index) => {
    if (marker.test(readable(entry.text).trim())) starts.push(index);
  });
  return starts.map((start, position) => {
    const end = position + 1 < starts.length ? starts[position + 1] : lines.length;
    return lines.slice(start, end);
  });
}

function unreadPages(model) {
  return model.read_errors.filter((e) => e.stage === 'pdftotext' && e.page).map((e) => e.page);
}

/* ------------------------------------------------------------------ the retention statements the artifact prints */

/**
 * The four retention statements the artifact prints about its own item classes, recorded verbatim. A policy
 * observation is computed from these ONLY when the report itself prints the sentence: a policy an artifact
 * does not state is not a policy this build may read into it.
 */
const PRINTED_RETENTION_POLICIES = Object.freeze([
  Object.freeze({
    policy_id: 'GB-PRINTED-POLICY-SATISFIED-JUDGMENT-6Y',
    sentence: 'Satisfied judgments are automatically removed from your report after six years.',
    item_kind: 'GB_PUBLIC_RECORD',
    applies_when_field: 'Information type',
    applies_when_value_contains: 'SATISFIED JUDGMENT',
    anchor_label: 'Date',
    period_years: 6
  }),
  Object.freeze({
    policy_id: 'GB-PRINTED-POLICY-VOLUNTARY-ARRANGEMENT-COMPLETE-6Y',
    sentence: 'Details of the Voluntary Arrangement will continue to be held on your report for six years from the date of the Arrangement.',
    item_kind: 'GB_PUBLIC_RECORD',
    applies_when_field: 'Information type',
    applies_when_value_contains: 'VOLUNTARY ARRANGEMENT COMPLETE',
    anchor_label: 'Date',
    period_years: 6
  }),
  Object.freeze({
    policy_id: 'GB-PRINTED-POLICY-SETTLED-ACCOUNT-6Y',
    sentence: 'Settled accounts are kept on file for six years from the settlement date.',
    item_kind: 'GB_CREDIT_ACCOUNT',
    applies_when_field: 'Settled',
    applies_when_value_present: true,
    anchor_label: 'Settled',
    period_years: 6
  }),
  Object.freeze({
    policy_id: 'GB-PRINTED-POLICY-DEFAULTED-ACCOUNT-6Y',
    sentence: 'A defaulted account is removed from your report after six years whether or not you have paid the debt in full.',
    item_kind: 'GB_CREDIT_ACCOUNT',
    applies_when_field: 'Defaulted',
    applies_when_value_present: true,
    anchor_label: 'Defaulted',
    period_years: 6
  })
]);

/** Which of those statements the document actually prints, matched on whitespace-collapsed text. */
function retentionStatementsPrinted(model) {
  const squashed = squashedDocumentText(model);
  return PRINTED_RETENTION_POLICIES.map((policy) => ({
    policy_id: policy.policy_id,
    sentence: policy.sentence,
    printed: squashed.includes(policy.sentence.replace(/\s+/g, ' ')),
    item_kind: policy.item_kind,
    applies_when_field: policy.applies_when_field,
    applies_when_value_contains: policy.applies_when_value_contains || null,
    applies_when_value_present: policy.applies_when_value_present === true,
    anchor_label: policy.anchor_label,
    period_years: policy.period_years
  }));
}

/* ------------------------------------------------------------------ building the records */

const DATE_FIELDS = Object.freeze({
  GB_CREDIT_ACCOUNT: Object.freeze(['Started', 'Settled', 'Defaulted', 'File updated for the period to']),
  GB_PUBLIC_RECORD: Object.freeze(['Date', 'End date', 'Discharged', 'Satisfied']),
  GB_PREVIOUS_SEARCH: Object.freeze(['Searched on'])
});

const MULTI_WORD_FIELDS = Object.freeze({
  GB_CREDIT_ACCOUNT: Object.freeze([]),
  GB_PUBLIC_RECORD: Object.freeze(['Information type']),
  GB_PREVIOUS_SEARCH: Object.freeze([])
});

function buildRecord(kind, region, index, unread) {
  const labels = FAMILY_CONTRACT.printed_fields[kind];
  const dateFields = DATE_FIELDS[kind];
  let pageUnread = false;
  const first = region[0];
  const last = region[region.length - 1];
  for (let p = first.page; p <= last.page; p += 1) if (unread.has(p)) pageUnread = true;

  const tokens = labeledTokens(region, labels);
  const printed = {};
  for (const label of labels) {
    const hits = MULTI_WORD_FIELDS[kind].includes(label)
      ? multiWordValues(region, label, labels)
      : tokens.filter((t) => t.label === label);
    printed[label] = Object.assign(
      printedValue(label, hits, pageUnread, dateFields.includes(label)),
      { printed_times_in_record: hits.length }
    );
  }
  /* OWNER-POTENTIAL-ISSUE-001 ordinary-field batch: map the fields this family already reads (Started/Settled on a
     credit account) to the account lifecycle facts the account-dates check compares. Values are taken only from the
     printed reading; a missing or unresolved label maps nothing and never stops an independent check. */
  const facts = {};
  if (kind === 'GB_CREDIT_ACCOUNT') {
    if (printed.Started && printed.Started.normalized) facts['liability.openedDate'] = printed.Started.normalized;
    if (printed.Settled && printed.Settled.normalized) facts['liability.closedDate'] = printed.Settled.normalized;
    /* BLOCKER-REPORT-DATA-TO-ISSUE-001 (GB slice): this reader ALREADY reads the account's printed balance,
       current balance, credit limit, default amount and status history — and dropped them before the shared
       checks, so a GB report reached only the account-dates check. Map them now, keeping each printed raw
       reading. A presented reading the artifact does not print stays unmapped; nothing here is inferred. */
    const balanceSource = valueOf(printed.Balance) || valueOf(printed['Current Balance']);
    if (balanceSource) {
      facts['account.balanceRaw'] = balanceSource.raw;
      const balance = amountOf(balanceSource.raw);
      if (balance !== undefined) facts['account.balance'] = balance;
    }
    const limit = valueOf(printed['Credit Limit']);
    if (limit) {
      facts['account.creditLimitRaw'] = limit.raw;
      const creditLimit = amountOf(limit.raw);
      if (creditLimit !== undefined) facts['account.creditLimit'] = creditLimit;
    }
    const defaulted = valueOf(printed.Default);
    if (defaulted) {
      facts['account.defaultAmountRaw'] = defaulted.raw;
      const defaultAmount = amountOf(defaulted.raw);
      if (defaultAmount !== undefined) facts['account.defaultAmount'] = defaultAmount;
    }
    const history = valueOf(printed['Status history']);
    if (history) {
      facts['account.statusHistoryRaw'] = history.raw;
      const cells = statusHistoryCells(history.raw);
      if (cells.length) facts['account.paymentHistoryCells'] = cells;
    }
    if (jointMarkerPrinted(region)) facts['account.responsibility'] = 'JOINT';
    /* BATCH-22 (BLOCKER-REPORT-DATA-TO-ISSUE-001, GB slice): the artifact PRINTS each credit account's heading —
       the lender name followed by the account type — on the line above its fields, and this reader already used
       that line to open the block but dropped the name. It is mapped now, so a GB account can take part in the
       identity-based comparison and in the identity-keyed checks; the value is the printed heading exactly as the
       artifact prints it (never reconstructed), and the account-type words are the ones MEASURED on the captured
       official example (CURRENT ACCOUNT / CREDIT CARD / LOAN / RENTAL — five accounts across those four forms).
       A block whose heading does not carry one of those printed forms maps no identity. */
    const GB_ACCOUNT_HEADING_FORMS = ['CURRENT ACCOUNT', 'CREDIT CARD', 'LOAN', 'RENTAL'];
    const headingEntry = region.find((l) => {
      const text = String(readable(l.text)).trim().replace(/\s+/g, ' ');
      return GB_ACCOUNT_HEADING_FORMS.some((form) => new RegExp('\\s' + form + '$').test(text));
    });
    const headingLine = headingEntry && String(readable(headingEntry.text)).trim().replace(/\s+/g, ' ');
    if (headingLine) {
      facts['account.reported_identity'] = headingLine;
      facts['account.reported_identityRaw'] = headingLine;
      /* The heading's exact CREDIT CARD suffix is an account-type reading even when the
         lender/type boundary cannot be separated for identity matching. Other forms are
         not assigned revolving semantics. */
      if (/\sCREDIT CARD$/.test(headingLine)) {
        facts['account.type'] = 'CREDIT CARD';
        printed['account.type'] = { label: 'Account type', state: 'VALUE', raw: 'CREDIT CARD',
          normalized: 'CREDIT CARD', location: { page: headingEntry.page, line: headingEntry.line } };
      }
    }
  }
  return {
    record_index: index,
    kind,
    kind_label: kind === 'GB_CREDIT_ACCOUNT' ? 'credit account' : (kind === 'GB_PUBLIC_RECORD' ? 'public record' : 'previous search'),
    section: kind === 'GB_CREDIT_ACCOUNT' ? 'Credit account information'
      : (kind === 'GB_PUBLIC_RECORD' ? 'Public record information' : 'Previous searches'),
    boundary: { page: first.page, line: first.line },
    end: { page: last.page, line: last.line },
    page_read_failure: pageUnread,
    printed,
    facts
  };
}

/** Which section each kind is read from, and the item-number prefix the artifact prints for it. */
const KIND_SECTIONS = Object.freeze({
  GB_CREDIT_ACCOUNT: 'Credit account information',
  GB_PUBLIC_RECORD: 'Public record information',
  GB_PREVIOUS_SEARCH: 'Previous searches'
});

/** Locate every record of every kind, in document order, and give each one index in that order. */
function locateRecords(model) {
  const unread = new Set(unreadPages(model));
  const found = [];
  for (const kind of Object.keys(KIND_SECTIONS)) {
    for (const region of itemRegions(model, KIND_SECTIONS[kind], FAMILY_CONTRACT.item_number_prefixes[kind])) {
      found.push({ kind, region, sort: { page: region[0].page, line: region[0].line } });
    }
  }
  found.sort((a, b) => (a.sort.page - b.sort.page) || (a.sort.line - b.sort.line));
  return found.map((entry, position) => buildRecord(entry.kind, entry.region, position + 1, unread));
}

/* ------------------------------------------------------------------ the report's own reference date */

function locateReferenceDate(model) {
  const occurrences = [];
  for (const entry of documentLines(model)) {
    const text = readable(entry.text).trim();
    if (!text.startsWith(REFERENCE_DATE_LABEL)) continue;
    occurrences.push({ page: entry.page, line: entry.line, token: text.slice(REFERENCE_DATE_LABEL.length).trim() });
  }
  const base = {
    fact: 'REPORT_REFERENCE_DATE', source_field: REFERENCE_DATE_LABEL, section_path: 'report cover letter',
    occurrences: occurrences.map((o) => ({ page: o.page, line: o.line }))
  };
  const fail = (reason) => Object.assign(base, { status: FACT_STATUS.EXTRACTION_UNRESOLVED, reason, raw_value: null, normalized_value: null, location: null });
  if (occurrences.length === 0) return fail('REPORT_DATE_LABEL_NOT_FOUND');
  const distinct = [...new Set(occurrences.map((o) => o.token))];
  if (distinct.length > 1) return fail('REPORT_DATE_CONTRADICTORY');
  const { normalized, reason } = normalizePrintedDate(distinct[0]);
  if (!normalized) return fail(reason === 'IMPOSSIBLE_CALENDAR_VALUE' ? 'REPORT_DATE_IMPOSSIBLE_CALENDAR_VALUE' : 'REPORT_DATE_MALFORMED_PRINTED_FORM');
  return Object.assign(base, {
    status: FACT_STATUS.RESOLVED,
    reason: null,
    raw_value: distinct[0],
    normalized_value: normalized,
    location: { page: occurrences[0].page, line: occurrences[0].line, label: REFERENCE_DATE_LABEL, section: 'report cover letter' }
  });
}

/* ------------------------------------------------------------------ admission */

function admissionPredicates(model) {
  const predicates = [];
  const push = (id, passed, detail, refusal_reason) => predicates.push({
    id, passed, detail, refusal_reason: passed ? null : refusal_reason
  });
  const text = wholeDocumentText(model);
  const upper = text.toUpperCase();

  const unreadable = model.read_errors.some((e) => e.stage === 'open' || e.stage === 'pdfinfo') || model.not_a_pdf === true;
  push('INPUT_PRESENT_AND_READABLE', !unreadable && model.pages.length > 0,
    unreadable ? 'the document could not be opened or parsed' : `${model.page_count} pages read`,
    model.not_a_pdf === true ? 'NOT_A_PDF_CONTAINER' : 'DOCUMENT_NOT_READABLE');
  push('CONTAINER_IS_A_PDF', model.not_a_pdf !== true, `kind=${model.kind}`, 'NOT_A_PDF_CONTAINER');
  push('NOT_ENCRYPTED', model.encrypted !== true, `encrypted=${model.encrypted}`, 'DOCUMENT_ENCRYPTED');

  const emptyPages = model.pages.filter((p) => !p.has_native_text).map((p) => p.page);
  const everyPageHasText = model.pages.length > 0 && emptyPages.length === 0
    && model.read_errors.every((e) => e.stage !== 'pdftotext');
  push('NATIVE_TEXT_ON_EVERY_PAGE', everyPageHasText,
    everyPageHasText ? 'all pages carry native text' : `pages without native text: ${emptyPages.join(',') || 'none read'}`,
    'FAMILY_IMAGE_ONLY_OR_NO_TEXT_LAYER');

  const fixtureHits = FIXTURE_MARKERS.filter((m) => upper.includes(m));
  push('NO_FIXTURE_OR_SYNTHETIC_MARKER', fixtureHits.length === 0,
    fixtureHits.length === 0 ? 'no fixture or synthetic marker' : `fixture marker present: ${fixtureHits.join(', ')}`,
    'FAMILY_SYNTHETIC_OR_FIXTURE_MARKER');

  push('MODEL_IS_A_FILE_NOT_AN_IN_MEMORY_MODEL', model.synthetic !== true,
    model.synthetic === true ? 'the model is an in-memory synthetic model, not a file' : 'the model was read from a file',
    'FAMILY_IN_MEMORY_MODEL_IS_NOT_A_FILE');

  const channelHits = WRONG_CHANNEL_MARKERS.filter((m) => upper.includes(m));
  push('NO_WRONG_CHANNEL_MARKER', channelHits.length === 0,
    channelHits.length === 0 ? 'no subscriber or business marker' : `wrong-channel marker present: ${channelHits.join(', ')}`,
    'FAMILY_WRONG_CHANNEL_MARKER');

  const consumerHits = CONSUMER_CHANNEL_MARKERS.filter((m) => text.includes(m));
  push('CONSUMER_CHANNEL_MARKERS_PRESENT', consumerHits.length === CONSUMER_CHANNEL_MARKERS.length,
    `${consumerHits.length} of ${CONSUMER_CHANNEL_MARKERS.length} consumer-channel markers printed`,
    'FAMILY_CONSUMER_CHANNEL_MARKERS_ABSENT');

  const headingsSeen = [...new Set(documentLines(model).map((l) => l.text.trim()).filter(isHeading))];
  const missing = REQUIRED_HEADINGS.filter((h) => !headingsSeen.includes(h));
  push('REQUIRED_STRUCTURE_HEADINGS_PRESENT', missing.length === 0,
    missing.length === 0 ? 'every required structural heading is printed' : `missing structural heading(s): ${missing.join('; ')}`,
    'NOT_THE_EVIDENCED_FAMILY_STRUCTURE');

  return predicates;
}

/**
 * Admit a document, or refuse it and name the reason and the fact status that reason produces. The contract
 * is not a digest gate, so admission says "this document has the family's measured structure" — it does not
 * say the document is any particular specimen, and it says nothing about the artifact's own vintage.
 */
function admit(model) {
  const predicates = admissionPredicates(model);
  const firstFailure = predicates.find((p) => !p.passed);
  if (!firstFailure) {
    return {
      state: 'ADMITTED_FAMILY_STRUCTURE',
      admitted: true,
      refusal_reason: null,
      fact_status: null,
      family: { family_id: FAMILY_ID, evidenced_artifact_id: FAMILY_CONTRACT.evidenced_artifact_id, evidenced_sha256: FAMILY_CONTRACT.evidenced_sha256 },
      predicates
    };
  }
  return {
    state: 'REFUSED',
    admitted: false,
    refusal_reason: firstFailure.refusal_reason,
    fact_status: FAMILY_REFUSAL_REASONS[firstFailure.refusal_reason] || FACT_STATUS.UNSUPPORTED_PRESENTATION,
    family: null,
    predicates,
    failed_predicate: firstFailure.id
  };
}

/* ------------------------------------------------------------------ extraction */

function buildFactualView(model, records, referenceDate) {
  const headingsSeen = [...new Set(documentLines(model).map((l) => l.text.trim()).filter(isHeading))].sort();
  return {
    view_id: 'GB-EXPERIAN-CONSUMER-FILE-FACTS',
    presentation_id: FAMILY_ID,
    source: 'the captured official UK consumer report example PUB-009, read read-only; the page text is built in memory and is not retained',
    reader_evidence: FAMILY_CONTRACT.boundary[0],
    text_source: model.text_extraction_tool,
    reference_date: {
      status: referenceDate.status,
      reason: referenceDate.reason || null,
      raw: referenceDate.raw_value || null,
      normalized: referenceDate.normalized_value || null,
      source_field: referenceDate.source_field,
      location: referenceDate.location || null
    },
    summary_counts: [],
    records,
    identity_groups: [],
    policy_statements: retentionStatementsPrinted(model),
    headings_printed: headingsSeen,
    pages_not_read: unreadPages(model),
    report_text_retained: false,
    note: 'A reading of the presentation\'s own printed facts. It carries no legal rule, no legal conclusion and no statutory applicability, and it returns no page text.'
  };
}

function kindSummary(kind, sectionPrinted, records) {
  const resolved = records.filter((r) => r.kind === kind && r.status === FACT_STATUS.RESOLVED).length;
  const ofKind = records.filter((r) => r.kind === kind);
  let status;
  let reason;
  if (ofKind.length === 0) {
    status = FACT_STATUS.ABSENT_FROM_REPORT;
    reason = sectionPrinted ? 'SECTION_LOCATED_AND_RESOLVED_WITH_NO_RECORD' : 'SECTION_NOT_PRINTED_BY_THIS_REPORT';
  } else if (resolved > 0) {
    status = FACT_STATUS.RESOLVED;
    reason = null;
  } else {
    status = FACT_STATUS.EXTRACTION_UNRESOLVED;
    reason = ofKind[0].reason;
  }
  return { kind, section_printed: sectionPrinted, records_read: ofKind.length, records_resolved: resolved, status, reason };
}

/**
 * Extract the family's records and the case-level printed evidence the factual checks read. Nothing is
 * dropped silently: a section that is not printed and a section that is printed but carries no item are
 * reported as two different things.
 */
function extract(model, admission) {
  const referenceDate = locateReferenceDate(model);
  const headingsSeen = [...new Set(documentLines(model).map((l) => l.text.trim()).filter(isHeading))];
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
  const records = locateRecords(model).map((record) => Object.assign(record, {
    status: FACT_STATUS.RESOLVED,
    reason: null,
    normalized_value: record.printed[DATE_FIELDS[record.kind][0]] ? record.printed[DATE_FIELDS[record.kind][0]].normalized : null,
    raw_value: record.printed[DATE_FIELDS[record.kind][0]] ? record.printed[DATE_FIELDS[record.kind][0]].raw : null,
    source_field: DATE_FIELDS[record.kind][0],
    section_path: record.section
  }));
  const byKind = {};
  for (const kind of Object.keys(KIND_SECTIONS)) {
    byKind[kind] = kindSummary(kind, headingsSeen.includes(KIND_SECTIONS[kind]), records);
  }
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
      sections_printed: headingsSeen.slice().sort(),
      policy_statements: retentionStatementsPrinted(model),
      records_found: records.length,
      factual_view: buildFactualView(model, records, referenceDate)
    }
  };
}

/** The per-record fact object a rule adapter would read. This family binds no rule, so it supplies none. */
function factsForRecord(record) {
  return record && record.facts ? Object.assign({}, record.facts) : {};
}

module.exports = {
  FAMILY_ID,
  FAMILY_CONTRACT,
  CURRENCY_EVIDENCE,
  FAMILY_REFUSAL_REASONS,
  PUBLISHER_NAME,
  CONSUMER_HELP_ROUTE,
  REQUIRED_HEADINGS,
  ALL_HEADINGS,
  CONSUMER_CHANNEL_MARKERS,
  WRONG_CHANNEL_MARKERS,
  FIXTURE_MARKERS,
  PRINTED_RETENTION_POLICIES,
  TWO_DIGIT_YEAR_CONVENTION,
  REFERENCE_DATE_LABEL,
  KIND_SECTIONS,
  DATE_FIELDS,
  admissionPredicates,
  admit,
  extract,
  factsForRecord,
  locateReferenceDate,
  locateRecords,
  labeledTokens,
  multiWordValues,
  normalizePrintedDate,
  retentionStatementsPrinted,
  buildFactualView,
  readable,
  sectionLines,
  squashedDocumentText
};
