'use strict';
/**
 * tests/fixtures.cjs — test input builders for PHASE5-001I-A.
 *
 * Every model here is synthetic and is labelled synthetic. The text fixtures exercise the locators and the
 * failure paths in memory; the PDF fixtures are written to a temporary directory and exercise the real
 * extraction path and the refusal predicates. None of this is report content, and none of it is presentation
 * evidence: the values are deliberately generic and no real report, name, address or account appears here.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { makeSyntheticModel } = require('../document-model.cjs');
const { writeFixture, markerLines } = require('../synthetic/make-synthetic-pdf.cjs');

const FIXTURE_DIR = path.join(os.tmpdir(), 'crp-phase5-001i-a-fixtures');
const header = (requestDate) => `Credit Report                       Request Date ${requestDate}`;

/** One collection record in the contract's shape. `Last Payment Date` can be omitted or left blank. */
function recordLines(options) {
  const {
    dateAssigned = '2024/01/01', firstDelinquency = '2021/02/01', lastPayment = '2021/02/01',
    lastPaymentMode = 'value', extraLines = [], collector = 'SYNTHETIC COLLECTION AGENCY'
  } = options || {};

  const lastPaymentLine = lastPaymentMode === 'value' ? `Last Payment Date ${lastPayment}`
    : lastPaymentMode === 'blank' ? 'Last Payment Date'
      : 'Date Verified';

  return [
    collector,
    `Date Assigned ${dateAssigned}`,
    'Member Name REFERENCE NAME',
    'Member Number 0000000',
    'First Delinquency ' + firstDelinquency,
    'Account Number 0000000',
    'Amount 1000',
    'Balance 1000',
    ...extraLines,
    lastPaymentLine
  ];
}

/** A synthetic model shaped like the contract, with the given records on the Collections page. */
function specimen(options) {
  const {
    requestDate = '2026/05/05', pageCount = 22, collectionsPage = 16, heading = 'Collections',
    records = [recordLines({})], extraPages = {}, headerOn = null, lastPaymentLabelsOutside = []
  } = options || {};

  const pages = [];
  for (let page = 1; page <= pageCount; page += 1) {
    const lines = [];
    const withHeader = headerOn === null ? true : headerOn.includes(page);
    if (withHeader) lines.push(header(requestDate));
    if (page === collectionsPage) {
      if (heading) lines.push(heading);
      for (const record of records) lines.push(...record);
    }
    if (extraPages[page]) lines.push(...extraPages[page]);
    pages.push(lines);
  }
  for (const page of Object.keys(lastPaymentLabelsOutside)) {
    pages[Number(page) - 1].push(`Last Payment Date ${lastPaymentLabelsOutside[page]}`);
  }
  return makeSyntheticModel({ pages, page_count: pageCount });
}

function headerOnlySpecimen(pageCount) {
  const pages = [];
  for (let page = 1; page <= pageCount; page += 1) pages.push([header('2026/05/05')]);
  return makeSyntheticModel({ pages, page_count: pageCount });
}

/** Write the PDF fixtures the refusal tests use, and return their paths. */
function pdfFixtures() {
  fs.rmSync(FIXTURE_DIR, { recursive: true, force: true });
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });
  const a4 = { width: 594.96, height: 841.92 };

  const marker = writeFixture(FIXTURE_DIR, 'fixture-marker-22-pages.pdf', {
    pages: Array.from({ length: 22 }, () => ({ lines: [...markerLines(), 'Collections', 'Date Assigned 2024/01/01'] })),
    page_size: a4
  });
  const unpinned = writeFixture(FIXTURE_DIR, 'unpinned-pr01-shaped-22-pages.pdf', {
    pages: Array.from({ length: 22 }, (_, index) => ({
      lines: index === 15
        ? [header('2026/05/05'), 'Collections', ...recordLines({})]
        : [header('2026/05/05')]
    })),
    page_size: a4, producer: 'Chromium', creator: 'Chromium'
  });
  const imageOnly = writeFixture(FIXTURE_DIR, 'image-only-page.pdf', {
    pages: [{ lines: [header('2026/05/05')] }, { image_only: true }],
    page_size: a4
  });
  const wrongCount = writeFixture(FIXTURE_DIR, 'three-pages.pdf', {
    pages: Array.from({ length: 3 }, () => ({ lines: [...markerLines()] })),
    page_size: a4
  });
  const notPdf = path.join(FIXTURE_DIR, 'not-a-pdf.txt');
  fs.writeFileSync(notPdf, 'this is a text file, not a PDF\n', 'utf8');
  const missing = path.join(FIXTURE_DIR, 'does-not-exist.pdf');

  return { dir: FIXTURE_DIR, marker, unpinned, imageOnly, wrongCount, notPdf, missing };
}

module.exports = { specimen, headerOnlySpecimen, recordLines, pdfFixtures, header, FIXTURE_DIR };
