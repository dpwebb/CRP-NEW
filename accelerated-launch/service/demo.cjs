'use strict';
/**
 * demo.cjs — the explicitly labelled demonstration models.
 *
 * OWNER-ALL82-001 / B2. Plan section 8: "Synthetic tests do not establish real report-format support."
 * These models exist to exercise the UI and to let the negative extraction paths be driven end to end. Every
 * model they build is labelled synthetic by `makeSyntheticModel`, so the entry point refuses to read it as a
 * report, and every result reached through them is stamped `DEMONSTRATION_ONLY_NOT_REPORT_SUPPORT`.
 *
 * The values are deliberately generic. No real report, name, address or account appears in this file.
 */

const { makeSyntheticModel } = require('./formats.cjs');

const PAGE_SIZE = Object.freeze({ width_pt: 594.96, height_pt: 841.92, label: 'A4' });
const REFERENCE_DATE = '2026/05/05';
const HEADER = `Credit Report                       Request Date ${REFERENCE_DATE}`;
const SECTION_HEADING = 'Collections';
const COLLECTIONS_PAGE = 16;
const PAGE_COUNT = 22;

/** One contract-shaped collection account. `lastPayment` may be a date, blank, or omitted entirely. */
function account(options) {
  const opts = options || {};
  const { dateAssigned = '2024/01/01', firstDelinquency = '2021/02/01', lastPayment = '2021/02/01', lastPaymentMode = 'value' } = opts;
  const lines = [
    'EXAMPLECOLLECTION AGENCY',
    `Date Assigned ${dateAssigned}`,
    'Member Name REFERENCE NAME',
    'Member Number 0000000',
    `First Delinquency ${firstDelinquency}`,
    'Account Number 0000000',
    'Amount 1000',
    'Balance 1000'
  ];
  if (lastPaymentMode === 'value') lines.push(`Last Payment Date ${lastPayment}`);
  else if (lastPaymentMode === 'blank') lines.push('Last Payment Date');
  return lines;
}

/** Build a 22-page labelled model whose Collections page carries exactly the lines given. */
function model(options) {
  const { collectionsLines = [SECTION_HEADING], extraPageLines = {} } = options || {};
  const pages = [];
  for (let page = 1; page <= PAGE_COUNT; page += 1) {
    const lines = [HEADER];
    if (page === COLLECTIONS_PAGE) lines.push(...collectionsLines);
    if (extraPageLines[page]) lines.push(...extraPageLines[page]);
    pages.push(lines);
  }
  return makeSyntheticModel({ pages, page_count: PAGE_COUNT, page_size: PAGE_SIZE });
}

const SCENARIOS = Object.freeze({
  TWO_ACCOUNTS: 'TWO_ACCOUNTS',
  DATE_LABEL_WITHOUT_VALUE: 'DATE_LABEL_WITHOUT_VALUE',
  DATE_LABEL_ABSENT_FROM_ACCOUNT: 'DATE_LABEL_ABSENT_FROM_ACCOUNT',
  NO_COLLECTION_ACCOUNTS: 'NO_COLLECTION_ACCOUNTS',
  DATE_OUTSIDE_ANY_ACCOUNT: 'DATE_OUTSIDE_ANY_ACCOUNT'
});

const BUILDERS = Object.freeze({
  /** Two accounts with different dates, so record isolation is visible in the result set. */
  [SCENARIOS.TWO_ACCOUNTS]: () => model({
    collectionsLines: [
      SECTION_HEADING,
      ...account({ dateAssigned: '2024/01/01', firstDelinquency: '2015/03/01', lastPayment: '2015/03/01' }),
      ...account({ dateAssigned: '2024/02/02', firstDelinquency: '2021/02/01', lastPayment: '2021/02/01' })
    ]
  }),

  /** The account prints the label, but no value follows it. The fact is UNRESOLVED, not absent. */
  [SCENARIOS.DATE_LABEL_WITHOUT_VALUE]: () => model({
    collectionsLines: [SECTION_HEADING, ...account({ lastPaymentMode: 'blank' })]
  }),

  /** The account does not print the label at all. Still UNRESOLVED — the report simply does not carry it here. */
  [SCENARIOS.DATE_LABEL_ABSENT_FROM_ACCOUNT]: () => model({
    collectionsLines: [SECTION_HEADING, ...account({ lastPaymentMode: 'omitted' })]
  }),

  /** The section is read, and it contains no account at all. This is absence, and only this is absence. */
  [SCENARIOS.NO_COLLECTION_ACCOUNTS]: () => model({
    collectionsLines: [SECTION_HEADING, 'Status ACTIVE']
  }),

  /** The label is printed outside any account, so the fact cannot be bound to one. UNRESOLVED, not absent. */
  [SCENARIOS.DATE_OUTSIDE_ANY_ACCOUNT]: () => model({
    collectionsLines: [SECTION_HEADING, 'Last Payment Date 2020/01/01']
  })
});

function listScenarios() {
  return Object.keys(SCENARIOS);
}

function buildScenario(name) {
  const builder = BUILDERS[String(name)];
  if (!builder) {
    const error = new Error('UNKNOWN_DEMONSTRATION_SCENARIO');
    error.code = 'INVALID_REQUEST';
    throw error;
  }
  return builder();
}

module.exports = { SCENARIOS, listScenarios, buildScenario, PAGE_SIZE, REFERENCE_DATE, HEADER };
