'use strict';
/**
 * au-equifax-consumer.cjs — the second admitted report-format family.
 *
 * OWNER-ALL82-001 / B3. PR-01 is admitted by DIGEST: one specimen, pinned byte for byte. A digest gate cannot
 * admit a second consumer report, because a consumer's own report is never byte-identical to a sample. This
 * module is the other kind of admission the plan asks for: a STRUCTURAL CONTRACT, evidenced from a captured
 * public artifact, that a document either satisfies or does not.
 *
 * Evidence for every literal below: `SOURCE_CAPTURES/REPORT_FORMAT_BASELINE_2026-09-30/PUB-012.pdf`
 * (SHA-256 3f6d5b3787cd15ecc8bc4a1a231d16b27968b195fe49d9ee667e25ec6648b00a), a fourteen-page sample the
 * official AU consumer route links to. It is read where it already sits; nothing is copied into this
 * repository, and no consumer report is opened by this module or by its tests.
 *
 * Boundaries this module keeps:
 *   • A DOCUMENT IS NOT MATCHED BY ITS NAME OR ITS PRODUCER. Admission is a conjunction of measured
 *     structural predicates; a lookalike fails on the predicate it fails, and the failure is reported.
 *   • AN UNREAD CELL IS NOT EVIDENCE. The family prints repayment history as a graphical grid. This module
 *     reads no cell from it, records none, and therefore binds no rule to it.
 *   • A RECORD NEVER BORROWS A FIELD. An overdue account's anchor is its OWN `Original Listing > Date`. If
 *     the record prints no original-listing block, the anchor is UNRESOLVED and is never taken from the
 *     current-listing date, a neighbouring record, another page or the summary totals.
 *   • A RELATIONSHIP IS NOT A CONCLUSION. The family's own printed `Date will be Deleted` is extracted and
 *     reported as the REPORT'S statement. It is never returned as the rule's answer.
 *   • THE SAMPLE'S OWN INCONSISTENCY IS PRESERVED. Its cover prints a 2016 report date and its URL names
 *     2017. The contract reads the printed date literally and records the inconsistency; it does not repair
 *     a timeline.
 */

const { FACT_STATUS } = require('../../../internal-validation/ca-ns-last-payment-six-year/constants.cjs');

const FAMILY_ID = 'FAM-AU-EQX-CONSUMER';

/** The publisher identity this family is evidenced for. Both strings must be present on a page footer. */
const PUBLISHER_NAME = 'Equifax Australia Information Services & Solutions Ltd';
const PUBLISHER_ABN = 'ABN: 26 000 602 862';

/** The fixed skeleton headings the sample prints on its every-report pages. */
const REQUIRED_HEADINGS = Object.freeze([
  'Personal Information',
  'Credit Overview',
  'Summary',
  'Consumer Credit Information',
  'Publically Available Consumer Information'
]);

/** Headings that begin a record-bearing block. At least one must be present. */
const CONSUMER_SECTION_HEADINGS = Object.freeze([
  'Consumer Credit Liability Information',
  'Consumer Credit Enquiries',
  'Overdue Accounts'
]);

/** Every heading the section scanner recognises. A heading ENDS the region it is not. */
const ALL_HEADINGS = Object.freeze(REQUIRED_HEADINGS.concat(CONSUMER_SECTION_HEADINGS, [
  'Proprietorship',
  'Commercial Credit Information',
  'Commercial Credit Enquiries',
  'Current Credit Provider(s)',
  'Other',
  'File Access'
]));

/** Refusal reasons this family adds. Each maps to the fact status it produces. */
const FAMILY_REFUSAL_REASONS = Object.freeze({
  NOT_THE_EVIDENCED_FAMILY_STRUCTURE: FACT_STATUS.UNSUPPORTED_PRESENTATION,
  FAMILY_BUREAU_IDENTITY_ABSENT: FACT_STATUS.UNSUPPORTED_PRESENTATION,
  FAMILY_CONSUMER_SECTIONS_ABSENT: FACT_STATUS.UNSUPPORTED_PRESENTATION,
  FAMILY_SYNTHETIC_OR_FIXTURE_MARKER: FACT_STATUS.UNSUPPORTED_PRESENTATION,
  FAMILY_WRONG_CHANNEL_MARKER: FACT_STATUS.UNSUPPORTED_PRESENTATION,
  FAMILY_IN_MEMORY_MODEL_IS_NOT_A_FILE: FACT_STATUS.UNSUPPORTED_PRESENTATION,
  FAMILY_IMAGE_ONLY_OR_NO_TEXT_LAYER: FACT_STATUS.UNSUPPORTED_PRESENTATION
});

/** Markers that mean the document is a fixture, a training aid or another channel's product. */
const FIXTURE_MARKERS = Object.freeze([
  'SYNTHETIC TEST INPUT', 'NOT A CREDIT REPORT', 'SYNTHETIC FIXTURE', 'FIXTURE'
]);
const WRONG_CHANNEL_MARKERS = Object.freeze([
  'FICTICIOUS AND IS TO BE USED FOR TRAINING',
  'TRAINING AND EDUCATIONAL PURPOSES ONLY',
  'ESOLUTIONS', 'TUXML', 'TOTALVIEW', 'ONEVIEW'
]);

const MONTHS = Object.freeze({
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5,
  jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9,
  oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12
});

/** The printed date form of this family: `4 January 2016`, `11 Apr 2013`. Read literally, never repaired. */
const PRINTED_DATE_FORM = /^(\d{1,2})\s+([A-Za-z]{3,9})\s*(\d{4})$/;

const FAMILY_CONTRACT = Object.freeze({
  family_id: FAMILY_ID,
  definition: 'the Equifax Australia consumer credit file evidenced by the captured public sample PUB-012',
  publisher: 'Equifax Australia Information Services & Solutions Ltd (ABN 26 000 602 862)',
  market: 'AU',
  audience: 'CONSUMER',
  channel: 'BUREAU_PUBLISHED_SAMPLE_LINKED_FROM_THE_OFFICIAL_CONSUMER_ROUTE',
  container: 'PDF',
  native_text_on_every_page: true,
  evidenced_artifact_id: 'PUB-012',
  evidenced_sha256: '3f6d5b3787cd15ecc8bc4a1a231d16b27968b195fe49d9ee667e25ec6648b00a',
  evidenced_pages: 14,
  evidence_source: 'SOURCE_CAPTURES/REPORT_FORMAT_BASELINE_2026-09-30/ (INVENTORY.md and reviewed_manifest.json)',
  reference_date_label: 'Report Date:',
  record_kinds: Object.freeze(['CREDIT_ENQUIRY', 'OVERDUE_ACCOUNT', 'CONSUMER_CREDIT_LIABILITY']),
  printed_fields: Object.freeze({
    CREDIT_ENQUIRY: Object.freeze(['Enquiry Date', 'Credit Provider', 'Amount', 'Reason for Enquiry', 'Association', 'Reference Number']),
    OVERDUE_ACCOUNT: Object.freeze(['Status', 'Credit Provider', 'Date', 'Amount', 'Reason to Report', 'Association Code', 'Co Borrower', 'Account Number', 'Account Type', 'Original Credit Provider', 'Date will be Deleted']),
    CONSUMER_CREDIT_LIABILITY: Object.freeze(['Credit Provider', 'Type Of Account', 'Credit Limit', 'Loan Term Type', 'Loan Term in Months', 'Account Number', 'Opened Date', 'Closed Date', 'Re-Opened Date', 'Current Repayment Status'])
  }),
  boundary: [
    "Read support is evidenced for this FAMILY, by structure, from one captured public sample. That sample proves the structure it exhibits; it does not prove that every current Equifax Australia consumer file prints it, and the baseline records that the sample's own dates are not a proven current version date.",
    "PR-01's digest gate is untouched and still governs the Canadian presentation. This contract is an additional admissions path, not a relaxation of that one.",
    'A document that satisfies every predicate but is not a real consumer report is still refused by the fixture and wrong-channel markers, and a synthetic model can be read only through the labelled test-input path, which supplies no presentation evidence.'
  ]
});

/** All lines of the model, in document order, with their page and one-based line number. */
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
  return model.pages.map((p) => p.text).join('\n');
}

/** The region that follows each instance of `heading`, ending at the next heading. */
function sectionRegions(model, heading) {
  const lines = documentLines(model);
  const regions = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].text.trim() !== heading) continue;
    let end = lines.length;
    for (let j = i + 1; j < lines.length; j += 1) {
      if (isHeading(lines[j].text)) { end = j; break; }
    }
    regions.push({ heading_line: lines[i], lines: lines.slice(i + 1, end) });
  }
  return regions;
}

function isImpossibleCalendarDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  if (m < 1 || m > 12) return true;
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return d < 1 || d > days[m - 1];
}

/** The only accepted printed form is this family's `D Month YYYY`. Anything else is malformed, not guessed. */
function normalizePrintedDate(token) {
  const match = PRINTED_DATE_FORM.exec(String(token || '').trim());
  if (!match) return { normalized: null, reason: 'VALUE_MALFORMED_PRINTED_FORM' };
  const month = MONTHS[match[2].toLowerCase()];
  if (!month) return { normalized: null, reason: 'VALUE_MALFORMED_PRINTED_FORM' };
  const iso = `${match[3]}-${String(month).padStart(2, '0')}-${String(Number(match[1])).padStart(2, '0')}`;
  if (isImpossibleCalendarDate(iso)) return { normalized: null, reason: 'IMPOSSIBLE_CALENDAR_VALUE' };
  return { normalized: iso, reason: null };
}

/**
 * OWNER-ORDINARY-FIELD-001: the admitted PUB-012 sample prints a date label whose value carries the report own
 * trailing classification on the same printed line (`15 Nov 2013 Secured or Partially Secured`). The LEADING
 * printed date is read, and the whole printed value is retained verbatim as the raw reading, so the consumer
 * packet states exactly what the report prints. Nothing is inferred: a value whose leading token is not in this
 * family printed form stays malformed, the trailing text is never interpreted, and no day is invented for a
 * month-only value.
 */
function normalizeDateWithTrailingClassification(token) {
  const text = String(token || '').trim();
  const whole = normalizePrintedDate(text);
  if (whole.normalized) return whole;
  const match = /^(\d{1,2})\s+([A-Za-z]{3,9})\s*(\d{4})\s+\S.*$/.exec(text);
  if (!match) return whole;
  const leading = normalizePrintedDate(`${match[1]} ${match[2]} ${match[3]}`);
  return leading.normalized ? leading : whole;
}

/** A label's value is the remainder of its own line. It is never taken from the following line. */
function valueAfterLabel(line, label) {
  const at = String(line).indexOf(label);
  if (at !== 0) return null;
  return String(line).slice(label.length).trim();
}

/* ------------------------------------------------------------------ admission */

/**
 * Every predicate is evaluated and recorded, so a refusal states the whole measured shape of the document
 * rather than only the first thing that failed. The admission outcome is the FIRST failing predicate, and
 * the reason names exactly what a caller would have to fix or what the document is not.
 */
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

  /* An in-memory model is not a file and can never be a submitted report. Its container reads as
     IN_MEMORY_MODEL_NOT_A_FILE, so a synthetic model is refused here rather than admitted with no
     presentation evidence and then counted as a read report. */
  push('MODEL_IS_A_FILE_NOT_AN_IN_MEMORY_MODEL', model.synthetic !== true,
    model.synthetic === true ? 'the model is an in-memory synthetic model, not a file' : 'the model was read from a file',
    'FAMILY_IN_MEMORY_MODEL_IS_NOT_A_FILE');

  const channelHits = WRONG_CHANNEL_MARKERS.filter((m) => upper.includes(m));
  push('NO_WRONG_CHANNEL_MARKER', channelHits.length === 0,
    channelHits.length === 0 ? 'no subscriber, business or training marker' : `wrong-channel marker present: ${channelHits.join(', ')}`,
    'FAMILY_WRONG_CHANNEL_MARKER');

  const identityPages = model.pages.filter((p) => p.text.includes(PUBLISHER_NAME) && p.text.includes(PUBLISHER_ABN)).map((p) => p.page);
  const pagesAfterCover = model.pages.slice(1).map((p) => p.page);
  const footerOnEveryPageAfterCover = pagesAfterCover.length > 0;
  const covered = pagesAfterCover.filter((page) => identityPages.includes(page));
  push('BUREAU_IDENTITY_ON_EVERY_FOOTER_AFTER_THE_COVER', footerOnEveryPageAfterCover && covered.length === pagesAfterCover.length,
    `${covered.length} of ${pagesAfterCover.length} pages after the cover carry the publisher name and ABN`,
    'FAMILY_BUREAU_IDENTITY_ABSENT');

  const headingsSeen = [...new Set(documentLines(model).filter((l) => isHeading(l.text)).map((l) => l.text.trim()))];
  const missingHeadings = REQUIRED_HEADINGS.filter((h) => !headingsSeen.includes(h));
  push('REQUIRED_STRUCTURE_HEADINGS_PRESENT', missingHeadings.length === 0,
    missingHeadings.length === 0 ? 'every required structural heading is printed' : `missing structural heading(s): ${missingHeadings.join('; ')}`,
    'NOT_THE_EVIDENCED_FAMILY_STRUCTURE');

  const consumerSections = CONSUMER_SECTION_HEADINGS.filter((h) => headingsSeen.includes(h));
  push('CONSUMER_SECTIONS_PRESENT', consumerSections.length > 0,
    consumerSections.length ? `consumer sections printed: ${consumerSections.join(', ')}` : 'no consumer credit section heading is printed',
    'FAMILY_CONSUMER_SECTIONS_ABSENT');

  return predicates;
}

/**
 * Admit a document, or refuse it and name the reason and the fact status that reason produces. The contract
 * is not a digest gate, so admission says "this document has the family's measured structure" — it does not
 * say the document is any particular specimen.
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
      family: {
        family_id: FAMILY_ID,
        evidenced_artifact_id: FAMILY_CONTRACT.evidenced_artifact_id,
        evidenced_sha256: FAMILY_CONTRACT.evidenced_sha256
      },
      predicates
    };
  }
  return {
    state: 'REFUSED',
    admitted: false,
    refusal_reason: firstFailure.refusal_reason,
    fact_status: FAMILY_REFUSAL_REASONS[firstFailure.refusal_reason] || FACT_STATUS.UNSUPPORTED_PRESENTATION,
    family: {
      family_id: FAMILY_ID,
      evidenced_artifact_id: FAMILY_CONTRACT.evidenced_artifact_id,
      evidenced_sha256: FAMILY_CONTRACT.evidenced_sha256
    },
    predicates
  };
}

/* ------------------------------------------------------------------ locators */

const ENQUIRY_LABELS = Object.freeze(['Reference Number', 'Reason for Enquiry', 'Enquiry Date', 'Credit Provider', 'Association', 'Amount']);
const OVERDUE_LABELS = Object.freeze([
  'Date will be Deleted', 'Original Credit Provider', 'Association Code', 'Original Listing', 'Current Listing',
  'Reason to Report', 'Account Number', 'Account Type', 'Credit Provider', 'Co Borrower', 'Status', 'Date', 'Amount'
]);

/** Longest label first, so `Date will be Deleted` is never read as `Date` and `Association Code` never as `Association`. */
function readLabeledFields(lines, labels) {
  const ordered = labels.slice().sort((a, b) => b.length - a.length);
  const fields = [];
  for (const entry of lines) {
    const text = String(entry.text).trimEnd();
    const marker = text.trim();
    const label = ordered.find((candidate) => marker === candidate
      || (marker.startsWith(candidate) && /\s/.test(marker.charAt(candidate.length))));
    if (!label) continue;
    fields.push({ label, page: entry.page, line: entry.line, value: marker.slice(label.length).trim() });
  }
  return fields;
}

function valueOf(fields, label) {
  const hits = fields.filter((f) => f.label === label);
  if (hits.length === 0) return { present: false, count: 0, value: null, location: null };
  return { present: true, count: hits.length, value: hits[0].value, location: { page: hits[0].page, line: hits[0].line } };
}

function unresolvedRecord(kind, index, reason, extra) {
  return Object.assign({
    record_index: index,
    kind,
    kind_label: kind === 'CREDIT_ENQUIRY' ? 'enquiry' : 'overdue account',
    status: FACT_STATUS.EXTRACTION_UNRESOLVED,
    reason,
    normalized_value: null,
    raw_value: null,
    location: null,
    facts: {}
  }, extra || {});
}

/** The report's own reference date. Read literally from its own label; never inferred, never repaired. */
function locateReferenceDate(model) {
  const occurrences = [];
  for (const entry of documentLines(model)) {
    const value = valueAfterLabel(String(entry.text).trim(), FAMILY_CONTRACT.reference_date_label);
    if (value !== null) occurrences.push({ page: entry.page, line: entry.line, token: value });
  }
  const base = {
    fact: 'REPORT_REFERENCE_DATE',
    source_field: FAMILY_CONTRACT.reference_date_label,
    section_path: 'report cover',
    occurrences: occurrences.map((o) => ({ page: o.page, line: o.line })),
    pages_with_label: [...new Set(occurrences.map((o) => o.page))]
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
    location: { page: occurrences[0].page, line: occurrences[0].line, label: FAMILY_CONTRACT.reference_date_label, section: 'report cover' }
  });
}

/** Enquiry records. The boundary label carries its own value; a label without a value stays unresolved. */
function locateEnquiryRecords(model) {
  const found = [];
  for (const region of sectionRegions(model, 'Consumer Credit Enquiries')) {
    const boundaries = [];
    region.lines.forEach((entry, index) => {
      if (String(entry.text).trim().startsWith('Enquiry Date')) boundaries.push(index);
    });
    boundaries.forEach((start, position) => {
      const end = position + 1 < boundaries.length ? boundaries[position + 1] : region.lines.length;
      const lines = region.lines.slice(start, end);
      found.push({ sort: { page: lines[0].page, line: lines[0].line }, lines });
    });
  }
  return found;
}

/**
 * Overdue-account records. The boundary is the pair `Status` followed by `Current Listing`; the sample
 * prints the two markers adjacent for one record and separated by a blank line for another, so blank lines
 * between them are tolerated and NOTHING else is. A `Status` line whose next non-blank line is not
 * `Current Listing` is recorded as an anomaly rather than silently treated as a record start.
 */
function locateOverdueRecords(model) {
  const found = [];
  const anomalies = [];
  const nextNonBlank = (lines, from) => {
    for (let i = from; i < lines.length; i += 1) {
      if (String(lines[i].text).trim() !== '') return i;
    }
    return -1;
  };
  for (const region of sectionRegions(model, 'Overdue Accounts')) {
    const starts = [];
    region.lines.forEach((entry, index) => {
      if (!String(entry.text).trim().startsWith('Status')) return;
      const marker = nextNonBlank(region.lines, index + 1);
      if (marker !== -1 && String(region.lines[marker].text).trim() === 'Current Listing') starts.push({ status: index, marker });
      else anomalies.push({ page: entry.page, line: entry.line, detail: 'a Status line is not followed by Current Listing' });
    });
    starts.forEach((start, position) => {
      const end = position + 1 < starts.length ? starts[position + 1].status : region.lines.length;
      found.push({
        sort: { page: region.lines[start.status].page, line: region.lines[start.status].line },
        boundary: region.lines[start.status],
        lines: region.lines.slice(start.marker + 1, end)
      });
    });
  }
  return { records: found, anomalies };
}

/** Tag each printed label with the sub-block it sits in. `Current Listing` and `Original Listing` switch block. */
function taggedFields(lines, labels) {
  const ordered = labels.filter((l) => l !== 'Current Listing' && l !== 'Original Listing').sort((a, b) => b.length - a.length);
  let block = 'CURRENT';
  const fields = [];
  const markers = [];
  for (const entry of lines) {
    const marker = String(entry.text).trim();
    if (marker === 'Original Listing' || marker === 'Current Listing') {
      block = marker === 'Original Listing' ? 'ORIGINAL' : 'CURRENT';
      markers.push({ marker, page: entry.page, line: entry.line });
      continue;
    }
    const label = ordered.find((candidate) => marker === candidate
      || (marker.startsWith(candidate) && /\s/.test(marker.charAt(candidate.length))));
    if (!label) continue;
    fields.push({ label, block, page: entry.page, line: entry.line, value: marker.slice(label.length).trim() });
  }
  return { fields, markers };
}

function fieldsIn(fields, label, block) {
  return fields.filter((f) => f.label === label && (block === undefined || f.block === block));
}

function buildEnquiryRecord(entry, index) {
  const fields = readLabeledFields(entry.lines, ENQUIRY_LABELS);
  const boundary = entry.lines[0];
  const section = 'Consumer Credit Enquiries';
  const start = { page: boundary.page, line: boundary.line };
  const last = entry.lines[entry.lines.length - 1];
  const end = { page: last.page, line: last.line };
  const fact = fields.find((f) => f.label === 'Enquiry Date');

  if (!fact) return unresolvedRecord('CREDIT_ENQUIRY', index, 'RECORD_BOUNDARY_LABEL_NOT_ON_THE_RECORD', { boundary: start, end, section_path: section });
  if (!fact.value) return unresolvedRecord('CREDIT_ENQUIRY', index, 'LABEL_PRINTED_WITHOUT_VALUE', { boundary: start, end, section_path: section });
  const { normalized, reason } = normalizePrintedDate(fact.value);
  if (!normalized) return unresolvedRecord('CREDIT_ENQUIRY', index, reason, { raw_value: fact.value, boundary: start, end, section_path: section });

  return {
    record_index: index,
    kind: 'CREDIT_ENQUIRY',
    kind_label: 'enquiry',
    status: FACT_STATUS.RESOLVED,
    reason: null,
    normalized_value: normalized,
    raw_value: fact.value,
    source_field: 'Enquiry Date',
    section_path: section,
    boundary: start,
    end,
    location: {
      page: fact.page, line: fact.line, label: 'Enquiry Date', section,
      record_index: index, record_starts_at: start, record_ends_at: end
    },
    facts: { 'enquiry.date': normalized }
  };
}

function buildOverdueRecord(entry, index) {
  const section = 'Overdue Accounts';
  const boundary = { page: entry.boundary.page, line: entry.boundary.line };
  const last = entry.lines[entry.lines.length - 1];
  const end = last ? { page: last.page, line: last.line } : boundary;
  const { fields, markers } = taggedFields(entry.lines, OVERDUE_LABELS);
  const sawOriginal = markers.some((m) => m.marker === 'Original Listing');
  const originalDates = fieldsIn(fields, 'Date', 'ORIGINAL');
  const currentDates = fieldsIn(fields, 'Date', 'CURRENT');
  const deletion = fieldsIn(fields, 'Date will be Deleted');

  const printedExtra = {
    current_listing_date: currentDates.length ? currentDates[0].value : null,
    current_listing_date_location: currentDates.length ? { page: currentDates[0].page, line: currentDates[0].line } : null,
    report_printed_deletion_date: deletion.length ? deletion[0].value : null,
    report_printed_deletion_date_location: deletion.length ? { page: deletion[0].page, line: deletion[0].line } : null,
    note: "report_printed_deletion_date is THE REPORT'S OWN statement. It is reported beside the comparison and is never substituted for the rule's arithmetic."
  };
  const base = { boundary, end, section_path: section, printed_extra: printedExtra, current_listing_date: currentDates.length ? currentDates[0].value : null };

  /* An anchor is never taken from the current-listing block, a neighbouring record or another page. */
  if (!sawOriginal) return unresolvedRecord('OVERDUE_ACCOUNT', index, 'ORIGINAL_LISTING_BLOCK_NOT_PRINTED', base);
  if (originalDates.length === 0) return unresolvedRecord('OVERDUE_ACCOUNT', index, 'LABEL_NOT_PRINTED_ON_RECORD', base);
  if (originalDates.length > 1) return unresolvedRecord('OVERDUE_ACCOUNT', index, 'LABEL_PRINTED_MORE_THAN_ONCE_IN_RECORD', base);
  const anchor = originalDates[0];
  if (!anchor.value) return unresolvedRecord('OVERDUE_ACCOUNT', index, 'LABEL_PRINTED_WITHOUT_VALUE', Object.assign({}, base, { location: { page: anchor.page, line: anchor.line } }));
  const { normalized, reason } = normalizePrintedDate(anchor.value);
  if (!normalized) return unresolvedRecord('OVERDUE_ACCOUNT', index, reason, Object.assign({}, base, { raw_value: anchor.value }));

  return Object.assign(base, {
    record_index: index,
    kind: 'OVERDUE_ACCOUNT',
    kind_label: 'overdue account',
    status: FACT_STATUS.RESOLVED,
    reason: null,
    normalized_value: normalized,
    raw_value: anchor.value,
    source_field: 'Original Listing > Date',
    location: {
      page: anchor.page, line: anchor.line, label: 'Date', section,
      record_index: index, record_starts_at: boundary, record_ends_at: end
    },
    facts: { 'overdue.originalListingDate': normalized }
  });
}

/* ------------------------------------------------------------------ extraction */

function kindSummary(kind, sectionPrinted, records) {
  const resolved = records.filter((r) => r.status === FACT_STATUS.RESOLVED).length;
  let status;
  let reason;
  if (records.length === 0) {
    status = FACT_STATUS.ABSENT_FROM_REPORT;
    reason = sectionPrinted ? 'SECTION_LOCATED_AND_RESOLVED_WITH_NO_RECORD' : 'SECTION_NOT_PRINTED_BY_THIS_REPORT';
  } else if (resolved > 0) {
    status = FACT_STATUS.RESOLVED;
    reason = null;
  } else {
    status = FACT_STATUS.EXTRACTION_UNRESOLVED;
    reason = records[0].reason;
  }
  return { kind, section_printed: sectionPrinted, records_read: records.length, records_resolved: resolved, status, reason };
}

/**
 * The family's third record kind: the consumer credit liability records the sample prints under `Consumer
 * Credit Liability Information`, each bounded by `Credit Provider`.
 *
 * `Closed Date` is read with its own presence-and-value distinction, so a label printed with no value and a
 * label that is not printed at all are different readings. `Current Repayment Status` is read as the report's
 * OWN explicit statement about the credit. Neither is ever used to age a period.
 */
/**
 * A printed AU money amount as a number, only when the whole value is a printed amount; otherwise undefined.
 */
function amountOf(raw) {
  if (raw === undefined || raw === null) return undefined;
  const text = String(raw).replace(/[$,A\s]/g, '');
  if (!/^\d+(\.\d+)?$/.test(text)) return undefined;
  const value = Number(text);
  return Number.isFinite(value) ? value : undefined;
}

const MONTH_CAPTIONS = Object.freeze(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']);

/**
 * The REPAYMENT-HISTORY evidence this presentation prints as TEXT.
 *
 * THE GRID ITSELF IS NOT READABLE, AND THIS IS MEASURED, NOT ASSUMED. On the evidenced sample the grid is drawn
 * as VECTOR GRAPHICS: `pdftotext -bbox` on the grid page returns the month captions (y≈418) and the year
 * captions (y≈437/458/479) and then nothing until the legend (y≈500) — no text object exists where the cells
 * are — and `pdfimages -list` shows no grid image either. `pdfimages` alone therefore could not decide this and
 * is not what decides it. Because no cell is readable, NO cell is invented and no payment-history comparison can
 * run on this presentation.
 *
 * What IS printed as text — and is read here — is the period the grid covers (its printed month captions and
 * year labels) and the artifact's own legend block, kept verbatim with its page/line.
 */
function repaymentHistoryEvidence(lines) {
  const months = [];
  const years = [];
  const legend = [];
  let inLegend = false;
  for (const entry of lines) {
    const text = String(entry.text).trim();
    if (!text) continue;
    if (text === 'Legend') { inLegend = true; continue; }
    const tokens = text.split(/\s+/);
    if (tokens.length === 12 && tokens.every((t) => MONTH_CAPTIONS.includes(t))) {
      tokens.forEach((t, index) => months.push({ month: t, position: index + 1, location: { page: entry.page, line: entry.line } }));
      continue;
    }
    if (/^(19|20)\d{2}$/.test(text)) {
      years.push({ year: Number(text), location: { page: entry.page, line: entry.line } });
      continue;
    }
    if (inLegend && !isHeading(text) && !/^Equifax Australia/i.test(text) && !/\bPage \d+ of \d+\b/.test(text)) {
      legend.push({ text, location: { page: entry.page, line: entry.line } });
    }
  }
  return {
    period_months: months.map((m) => m.month),
    period_years: years.map((y) => y.year),
    legend_lines: legend,
    cells_readable: false,
    reason: 'THE_REPAYMENT_HISTORY_CELLS_ARE_DRAWN_AS_VECTOR_GRAPHICS_CARRYING_NO_TEXT_OBJECT',
    locations: {
      first_month: months.length ? months[0].location : null,
      first_year: years.length ? years[0].location : null
    }
  };
}

const LIABILITY_LABELS = Object.freeze([
  'Current Repayment Status', 'Loan Repayment Arrangement', 'Loan Term in Months', 'Type Of Account',
  'Loan Term Type', 'Re-Opened Date', 'Closed Date', 'Opened Date', 'Credit Provider', 'Account Number',
  'Credit Limit', 'Unlimited Credit'
]);

function readLiabilityFields(lines) {
  const ordered = LIABILITY_LABELS.slice().sort((a, b) => b.length - a.length);
  const fields = [];
  for (const entry of lines) {
    const marker = String(entry.text).trim();
    const label = ordered.find((candidate) => marker === candidate
      || (marker.startsWith(candidate) && /\s/.test(marker.charAt(candidate.length))));
    if (!label) continue;
    fields.push({ label, page: entry.page, line: entry.line, value: marker.slice(label.length).trim() });
  }
  return fields;
}

function liField(fields, label) {
  const hits = fields.filter((f) => f.label === label);
  if (hits.length === 0) {
    return { present: false, count: 0, value: null, location: null, reason: 'LABEL_NOT_PRINTED_ON_THIS_RECORD' };
  }
  return {
    present: true,
    count: hits.length,
    value: hits[0].value || null,
    location: { page: hits[0].page, line: hits[0].line, label },
    reason: hits[0].value ? (hits.length > 1 ? 'LABEL_PRINTED_MORE_THAN_ONCE_IN_RECORD' : null) : 'LABEL_PRINTED_WITHOUT_VALUE'
  };
}

/** Liability records. Each record starts at `Credit Provider` and ends at the next one, or at the page end. */
function locateLiabilityRecords(model) {
  const found = [];
  const anomalies = [];
  for (const region of sectionRegions(model, 'Consumer Credit Liability Information')) {
    const starts = [];
    region.lines.forEach((entry, index) => {
      if (String(entry.text).trim().startsWith('Credit Provider')) starts.push(index);
    });
    if (!starts.length) {
      anomalies.push({
        page: region.heading_line.page, line: region.heading_line.line,
        detail: 'the section is printed with no record boundary'
      });
      continue;
    }
    starts.forEach((start, position) => {
      const end = position + 1 < starts.length ? starts[position + 1] : region.lines.length;
      found.push({
        sort: { page: region.lines[start].page, line: region.lines[start].line },
        boundary: region.lines[start],
        lines: region.lines.slice(start, end)
      });
    });
  }
  return { records: found, anomalies };
}

function buildLiabilityRecord(entry, index) {
  const fields = readLiabilityFields(entry.lines);
  const boundary = entry.lines[0];
  const section = 'Consumer Credit Liability Information';
  const start = { page: boundary.page, line: boundary.line };
  const last = entry.lines[entry.lines.length - 1];
  const end = { page: last.page, line: last.line };
  const provider = liField(fields, 'Credit Provider');
  const opened = liField(fields, 'Opened Date');
  const closed = liField(fields, 'Closed Date');
  const reopened = liField(fields, 'Re-Opened Date');
  const status = liField(fields, 'Current Repayment Status');
  const accountType = liField(fields, 'Type Of Account');
  const creditLimit = liField(fields, 'Credit Limit');
  const repaymentHistory = repaymentHistoryEvidence(entry.lines);

  const openedDate = opened.value ? normalizeDateWithTrailingClassification(opened.value) : { normalized: null, reason: opened.reason };
  const closedDate = closed.value ? normalizeDateWithTrailingClassification(closed.value) : { normalized: null, reason: closed.reason };

  /* Extraction status answers one question only: was this record readable as a liability record? It is NOT an
     applicability state and NOT a comparison outcome; those are two further, separate fields. */
  const readable = provider.present && accountType.present;
  const facts = {};
  if (openedDate.normalized) facts['liability.openedDate'] = openedDate.normalized;
  /* GAP-INGEST-006: a month-only closure keeps its month; no day is invented for the comparison. */
  if (closedDate.normalized) facts['liability.closedDate'] = closedDate.normalized;
  if (closedDate.precision) facts['liability.closedDatePrecision'] = closedDate.precision;
  /* BLOCKER-REPORT-DATA-TO-ISSUE-001 (AU slice): the two facts this record prints as a labelled value — the
     credited provider's name and the credit limit — reach the shared fact vocabulary, each with its raw reading.
     The repayment-history EVIDENCE the record prints as text is recorded; NO cell is emitted, because the cells
     are vector graphics and nothing readable exists to put in them. */
  if (provider.value) facts['account.reported_identity'] = provider.value;
  if (accountType.value) facts['account.type'] = accountType.value.toUpperCase();
  if (creditLimit.value) {
    facts['account.creditLimitRaw'] = creditLimit.value;
    const limit = amountOf(creditLimit.value);
    if (limit !== undefined) facts['account.creditLimit'] = limit;
  }

  return {
    record_index: index,
    kind: 'CONSUMER_CREDIT_LIABILITY',
    kind_label: 'consumer credit liability',
    status: readable ? FACT_STATUS.RESOLVED : FACT_STATUS.EXTRACTION_UNRESOLVED,
    reason: readable ? null : 'LIABILITY_RECORD_BOUNDARY_LABELS_NOT_PRINTED',
    normalized_value: closedDate.normalized,
    raw_value: closed.value,
    source_field: 'Closed Date',
    section_path: section,
    boundary: start,
    end,
    location: {
      page: boundary.page, line: boundary.line, label: 'Credit Provider', section,
      record_index: index, record_starts_at: start, record_ends_at: end
    },
    /* What the record PRINTS, each with its own presence distinction. A label printed without a value and a
       label not printed at all are different readings and are never collapsed. */
    printed: {
      credit_provider: provider.value,
      account_type: accountType.value,
      opened_date: {
        raw: opened.value, normalized: openedDate.normalized,
        status: openedDate.normalized ? FACT_STATUS.RESOLVED : FACT_STATUS.EXTRACTION_UNRESOLVED,
        reason: openedDate.reason || null, location: opened.location
      },
      closed_date: {
        raw: closed.value, normalized: closedDate.normalized,
        status: closedDate.normalized ? FACT_STATUS.RESOLVED : FACT_STATUS.EXTRACTION_UNRESOLVED,
        reason: closedDate.reason || null, location: closed.location,
        /* GAP-INGEST-006: the comparison anchor is the month itself; no day is invented. */
        comparison_anchor: closedDate.normalized || null,
        anchor_precision: closedDate.precision || 'DAY'
      },
      re_opened_date: {
        raw: reopened.value, status: reopened.value ? FACT_STATUS.RESOLVED : FACT_STATUS.EXTRACTION_UNRESOLVED,
        reason: reopened.reason || null, location: reopened.location
      },
      current_repayment_status: {
        raw: status.value, status: status.value ? FACT_STATUS.RESOLVED : FACT_STATUS.EXTRACTION_UNRESOLVED,
        reason: status.reason || null, location: status.location
      },
      credit_limit: {
        raw: creditLimit.value, status: creditLimit.value ? FACT_STATUS.RESOLVED : FACT_STATUS.EXTRACTION_UNRESOLVED,
        reason: creditLimit.reason || null, location: creditLimit.location
      },
      /* The repayment-history evidence the artifact prints as TEXT (its period captions and its own legend).
         The CELLS are vector graphics and are not read; `cells_readable` states that rather than leaving it out. */
      repayment_history: {
        period_months: repaymentHistory.period_months,
        period_years: repaymentHistory.period_years,
        legend_lines: repaymentHistory.legend_lines,
        cells_readable: repaymentHistory.cells_readable,
        reason: repaymentHistory.reason,
        locations: repaymentHistory.locations
      }
    },
    facts
  };
}

/**
 * Extract the family's record kinds. Nothing is dropped silently: a section that is not printed is
 * reported as not printed, and a section that is printed but carries no record is reported as carrying no
 * record. Those are different statements and they never collapse into each other.
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
      evidence_readings: { sections_printed: [], records_found: 0 }
    };
  }

  const enquiryRegions = sectionRegions(model, 'Consumer Credit Enquiries');
  const overdue = locateOverdueRecords(model);
  const liability = locateLiabilityRecords(model);
  const headingsSeen = new Set(documentLines(model).filter((l) => isHeading(l.text)).map((l) => l.text.trim()));

  const merged = locateEnquiryRecords(model).map((entry) => Object.assign(entry, { kind: 'CREDIT_ENQUIRY' }))
    .concat(overdue.records.map((entry) => Object.assign(entry, { kind: 'OVERDUE_ACCOUNT' })))
    .concat(liability.records.map((entry) => Object.assign(entry, { kind: 'CONSUMER_CREDIT_LIABILITY' })));
  merged.sort((a, b) => (a.sort.page - b.sort.page) || (a.sort.line - b.sort.line));

  const records = merged.map((entry, position) => {
    if (entry.kind === 'CREDIT_ENQUIRY') return buildEnquiryRecord(entry, position + 1);
    if (entry.kind === 'OVERDUE_ACCOUNT') return buildOverdueRecord(entry, position + 1);
    return buildLiabilityRecord(entry, position + 1);
  });

  const enquiries = records.filter((r) => r.kind === 'CREDIT_ENQUIRY');
  const overdues = records.filter((r) => r.kind === 'OVERDUE_ACCOUNT');
  const liabilities = records.filter((r) => r.kind === 'CONSUMER_CREDIT_LIABILITY');
  const byKind = {
    CREDIT_ENQUIRY: kindSummary('CREDIT_ENQUIRY', enquiryRegions.length > 0, enquiries),
    OVERDUE_ACCOUNT: kindSummary('OVERDUE_ACCOUNT', headingsSeen.has('Overdue Accounts'), overdues),
    CONSUMER_CREDIT_LIABILITY: kindSummary('CONSUMER_CREDIT_LIABILITY',
      headingsSeen.has('Consumer Credit Liability Information'), liabilities)
  };
  const resolvedCount = records.filter((r) => r.status === FACT_STATUS.RESOLVED).length;
  const summary = {
    status: resolvedCount > 0 ? FACT_STATUS.RESOLVED : (records.length ? FACT_STATUS.EXTRACTION_UNRESOLVED : FACT_STATUS.ABSENT_FROM_REPORT),
    reason: resolvedCount > 0 ? null : (records.length ? records[0].reason : 'NO_RECORD_OF_EITHER_FAMILY_KIND'),
    records_read: records.length,
    resolved_fact_count: resolvedCount,
    by_kind: byKind
  };

  return {
    reference_date: referenceDate,
    records,
    summary,
    evidence_readings: {
      sections_printed: [...headingsSeen].sort(),
      boundary_anomalies: overdue.anomalies,
      liability_boundary_anomalies: liability.anomalies,
      records_found: records.length
    }
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
  PUBLISHER_NAME,
  PUBLISHER_ABN,
  REQUIRED_HEADINGS,
  CONSUMER_SECTION_HEADINGS,
  LIABILITY_LABELS,
  admissionPredicates,
  admit,
  extract,
  factsForRecord,
  locateReferenceDate,
  locateEnquiryRecords,
  locateOverdueRecords,
  locateLiabilityRecords,
  normalizePrintedDate,
  documentLines,
  isHeading
};
