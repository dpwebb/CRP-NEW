'use strict';
/**
 * locators.cjs — the locators: the request-date header, the Collections section, its debt records and the
 * binding of `Last Payment Date` to the record that prints it.
 *
 * PHASE5-001I-A. Nothing here guesses. A label that is absent, printed without a value, printed more than
 * once in one record, malformed, or contradictory leaves the fact unresolved; a value printed outside any
 * contract record is never read; and a date is never borrowed from another record, another section or
 * another page.
 */

const {
  FACT_STATUS, HEADER_LABEL, SECTION_HEADING, RECORD_BOUNDARY_LABEL, ROW_LABELS,
  DEBT_RECORD_REQUIRED_LABELS, DEBT_RECORD_MIN_OTHER_LABELS, PRINTED_DATE_FORM
} = require('./constants.cjs');

const LAST_PAYMENT_LABEL = 'Last Payment Date';

function tokenAfter(line, label) {
  const at = line.indexOf(label);
  if (at === -1) return null;
  const match = line.slice(at + label.length).match(/\S+/);
  return match ? match[0] : '';
}

function isImpossibleCalendarDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  if (m < 1 || m > 12) return true;
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return d < 1 || d > days[m - 1];
}

/** Normalize a printed token. The only accepted printed form is this presentation's DDDD/DD/DD. */
function normalizePrintedDate(token) {
  const match = PRINTED_DATE_FORM.exec(token || '');
  if (!match) return { normalized: null, reason: 'VALUE_MALFORMED_PRINTED_FORM' };
  const iso = `${match[1]}-${match[2]}-${match[3]}`;
  if (isImpossibleCalendarDate(iso)) return { normalized: null, reason: 'IMPOSSIBLE_CALENDAR_VALUE' };
  return { normalized: iso, reason: null };
}

/** The printed page header is not part of any record: it is located separately and excluded from regions. */
function headerOccurrences(model) {
  const occurrences = [];
  for (const page of model.pages) {
    page.lines.forEach((line, index) => {
      if (line.includes(HEADER_LABEL)) occurrences.push({ page: page.page, line: index + 1, token: tokenAfter(line, HEADER_LABEL) });
    });
  }
  return occurrences;
}

function locateRequestDate(model) {
  const occurrences = headerOccurrences(model);
  const base = {
    fact: 'REPORT_REFERENCE_DATE', source_field: HEADER_LABEL, section_path: 'page header, every page',
    occurrences: occurrences.map((o) => ({ page: o.page, line: o.line })),
    pages_with_label: [...new Set(occurrences.map((o) => o.page))], page_count: model.pages.length
  };
  const fail = (reason, extra) => Object.assign(base, {
    status: FACT_STATUS.EXTRACTION_UNRESOLVED, reason, raw_value: null, normalized_value: null, ...(extra || {})
  });

  if (occurrences.length === 0) return fail('REQUEST_DATE_LABEL_NOT_FOUND');
  const pagesWith = base.pages_with_label;
  if (pagesWith.length !== model.pages.length) {
    return fail('REQUEST_DATE_NOT_ON_EVERY_PAGE', { pages_missing_label: model.pages.map((p) => p.page).filter((p) => !pagesWith.includes(p)) });
  }

  const distinct = [...new Set(occurrences.map((o) => o.token))];
  if (distinct.length > 1) return fail('REQUEST_DATE_CONTRADICTORY', { distinct_token_count: distinct.length });

  const token = distinct[0];
  const { normalized, reason } = normalizePrintedDate(token);
  if (!normalized) {
    return fail(reason === 'IMPOSSIBLE_CALENDAR_VALUE' ? 'REQUEST_DATE_IMPOSSIBLE_CALENDAR_VALUE' : 'REQUEST_DATE_MALFORMED_PRINTED_FORM',
      { printed_token_form: token ? token.replace(/\d/g, 'D') : null });
  }

  return Object.assign(base, {
    status: FACT_STATUS.RESOLVED, reason: null, raw_value: token, normalized_value: normalized,
    location: `label "${HEADER_LABEL}" in the page header, identical on all ${model.pages.length} pages`
  });
}

/** The Collections section: heading page plus the contiguous pages that carry contract row labels. */
function locateCollectionsSection(model) {
  const headingLines = [];
  for (const page of model.pages) {
    page.lines.forEach((line, index) => { if (line.trim() === SECTION_HEADING) headingLines.push({ page: page.page, line: index + 1 }); });
  }
  const base = { section_path: SECTION_HEADING, heading_lines: headingLines };
  const fail = (reason, extra) => Object.assign(base, { status: FACT_STATUS.EXTRACTION_UNRESOLVED, reason, ...(extra || {}) });

  if (headingLines.length === 0) return fail('SECTION_HEADING_NOT_FOUND');
  if (headingLines.length > 1) return fail('SECTION_HEADING_NOT_UNIQUE', { heading_line_count: headingLines.length });

  const labelCountOn = (page) => ROW_LABELS.filter((l) => model.pages[page - 1].text.includes(l)).length;
  if (labelCountOn(headingLines[0].page) === 0) return fail('SECTION_HEADING_WITHOUT_RECORD_ROWS');

  let lastPage = headingLines[0].page;
  while (lastPage + 1 <= model.pages.length && labelCountOn(lastPage + 1) > 0) lastPage += 1;

  const laterRecordLabels = [];
  for (let page = lastPage + 1; page <= model.pages.length; page += 1) {
    const text = model.pages[page - 1].text;
    if (text.includes(RECORD_BOUNDARY_LABEL) || text.includes(LAST_PAYMENT_LABEL)) laterRecordLabels.push(page);
  }
  if (laterRecordLabels.length > 0) return fail('SECTION_CONTINUITY_GAP_AFTER_LAST_SECTION_PAGE', { pages_printing_record_labels_after_the_section: laterRecordLabels });

  const readFailures = model.read_errors.filter((e) => e.page && e.page >= headingLines[0].page && e.page <= lastPage);
  if (readFailures.length > 0) return fail('SECTION_READ_FAILURE', { read_failures: readFailures.map((e) => e.page) });

  const lines = [];
  for (let page = headingLines[0].page; page <= lastPage; page += 1) {
    model.pages[page - 1].lines.forEach((text, index) => {
      const line = index + 1;
      const isHeader = text.includes(HEADER_LABEL);
      const beforeHeading = page === headingLines[0].page && line < headingLines[0].line;
      if (!isHeader && !beforeHeading) lines.push({ page, line, text });
    });
  }

  return Object.assign(base, {
    status: FACT_STATUS.RESOLVED, reason: null,
    first_page: headingLines[0].page, last_page: lastPage, line_count: lines.length, lines
  });
}

/**
 * Split the resolved section into records at its record-boundary label, and decide for each region whether it
 * is the contract's debt record. A region that is not the debt record is never read.
 */
function locateDebtRecords(section) {
  const lines = section.lines || [];
  const boundaries = lines.map((l, index) => (l.text.includes(RECORD_BOUNDARY_LABEL) ? index : -1)).filter((i) => i !== -1);

  const preamble = boundaries.length === 0 ? lines : lines.slice(0, boundaries[0]);
  const preambleLabels = [...new Set(preamble
    .flatMap((l) => ROW_LABELS.filter((label) => l.text.includes(label))))];

  const records = boundaries.map((startIndex, position) => {
    const endIndex = position + 1 < boundaries.length ? boundaries[position + 1] : lines.length;
    const region = lines.slice(startIndex, endIndex);
    const labels = [];
    for (const l of region) {
      for (const label of ROW_LABELS) {
        if (!l.text.includes(label)) continue;
        const token = tokenAfter(l.text, label);
        labels.push({ label, page: l.page, line: l.line, token, value_present: (token || '').length > 0 });
      }
    }
    const present = [...new Set(labels.map((l) => l.label))];
    const missingRequired = DEBT_RECORD_REQUIRED_LABELS.filter((l) => !present.includes(l));
    const otherCount = present.filter((l) => l !== RECORD_BOUNDARY_LABEL).length;
    const isDebtRecord = missingRequired.length === 0 && otherCount >= DEBT_RECORD_MIN_OTHER_LABELS;
    return {
      record_index: position + 1,
      boundary: { page: region[0].page, line: region[0].line },
      end: { page: region[region.length - 1].page, line: region[region.length - 1].line },
      labels_present: present, labels,
      debt_record: isDebtRecord,
      not_a_debt_record_reason: isDebtRecord ? null : (missingRequired.length > 0
        ? `the region does not print: ${missingRequired.join(', ')}`
        : `the region prints only ${otherCount} of the contract's other row labels`)
    };
  });

  return { records, preamble_labels_outside_any_record: preambleLabels };
}

/** Bind `Last Payment Date` to the record that prints it. Never borrow, never default, never guess. */
function bindLastPaymentDate(record) {
  const occurrences = record.labels.filter((l) => l.label === LAST_PAYMENT_LABEL);
  const base = { fact: 'DEBT_LAST_PAYMENT_DATE', source_field: LAST_PAYMENT_LABEL, section_path: SECTION_HEADING, record_index: record.record_index };
  const fail = (status, reason, extra) => Object.assign(base, { status, reason, raw_value: null, normalized_value: null, ...(extra || {}) });

  if (occurrences.length === 0) return fail(FACT_STATUS.EXTRACTION_UNRESOLVED, 'LABEL_NOT_PRINTED_ON_RECORD');
  if (occurrences.length > 1) return fail(FACT_STATUS.EXTRACTION_UNRESOLVED, 'LABEL_PRINTED_MORE_THAN_ONCE_IN_RECORD', { occurrence_count: occurrences.length });
  const occurrence = occurrences[0];
  if (!occurrence.value_present) return fail(FACT_STATUS.EXTRACTION_UNRESOLVED, 'LABEL_PRINTED_WITHOUT_VALUE', { location: { page: occurrence.page, line: occurrence.line } });

  const { normalized, reason } = normalizePrintedDate(occurrence.token);
  if (!normalized) return fail(FACT_STATUS.EXTRACTION_UNRESOLVED, reason, { location: { page: occurrence.page, line: occurrence.line } });

  return Object.assign(base, {
    status: FACT_STATUS.RESOLVED, reason: null, raw_value: occurrence.token, normalized_value: normalized,
    location: {
      page: occurrence.page, line: occurrence.line, label: LAST_PAYMENT_LABEL, section: SECTION_HEADING,
      record_index: record.record_index, record_starts_at: record.boundary, record_ends_at: record.end
    }
  });
}

module.exports = {
  locateRequestDate, locateCollectionsSection, locateDebtRecords, bindLastPaymentDate,
  tokenAfter, normalizePrintedDate, isImpossibleCalendarDate, LAST_PAYMENT_LABEL
};


