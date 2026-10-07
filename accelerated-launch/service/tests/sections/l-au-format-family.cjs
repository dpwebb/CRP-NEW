'use strict';
/**
 * l-au-format-family.cjs — OWNER-ALL82-001 / B3. The second admitted presentation, tested two ways that are
 * kept deliberately distinct:
 *
 *   1. REPRESENTATIVE REAL EVIDENCE. The captured public sample `PUB-012.pdf` is read where it already sits
 *      inside SOURCE_CAPTURES, read-only, by the same poppler method the service uses. Its digest is checked
 *      against the digest the contract names. Nothing is copied, uploaded or redistributed by this part: it
 *      asserts that the contract's predicates hold on real bytes and that the six records it prints extract
 *      with their own printed values.
 *   2. SYNTHETIC BEHAVIOUR TESTS. In-memory structural models drive the failure and ambiguity paths. They are
 *      labelled synthetic, they supply no presentation evidence, and passing them proves nothing about any
 *      real report — which is exactly why they are not used for part 1.
 *
 * A synthetic success is never presentation evidence, and real evidence is never used to paper over a
 * behaviour test. The two are reported separately.
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const auFamily = require('../../../service/format-families/au-equifax-consumer.cjs');
const formats = require('../../formats.cjs');
const { makeSyntheticModel, sha256File } = require('../../../../internal-validation/ca-ns-last-payment-six-year/document-model.cjs');
const { writeFixture, markerLines } = require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const PUB_012 = path.join(ROOT, 'SOURCE_CAPTURES', 'REPORT_FORMAT_BASELINE_2026-09-30', 'PUB-012.pdf');
const FIXTURE_DIR = path.join(os.tmpdir(), 'crp-b3-au-family-fixtures');

const A4 = { width_pt: 595.32, height_pt: 841.92, label: 'A4' };

/* ------------------------------------------------------------------ synthetic structural models */

const FOOTER = `${auFamily.PUBLISHER_NAME}   Page {page} of {pages}   ABN: 26 000 602 862`;

/** A model shaped like the family, with the sections and records the caller supplies. */
function familyModel(options) {
  const { enquiryLines = [], overdueLines = [], omitEnquiries = false, publisher = auFamily.PUBLISHER_NAME, abn = auFamily.PUBLISHER_ABN, extraMarkers = [] } = options || {};
  const pages = [
    ['CASE SUBJECT', 'Report Date: 4 January 2016', 'Reference: 0000'],
    [FOOTER.replace('Page {page} of {pages}', 'Page 2 of 4').replace(auFamily.PUBLISHER_NAME, publisher).replace('ABN: 26 000 602 862', abn),
      '', 'Personal Information', '', 'Credit Overview', '', 'Summary'],
    [FOOTER.replace('Page {page} of {pages}', 'Page 3 of 4').replace(auFamily.PUBLISHER_NAME, publisher).replace('ABN: 26 000 602 862', abn),
      '', 'Consumer Credit Information',
      ...(omitEnquiries ? [] : ['Consumer Credit Enquiries', ...enquiryLines]),
      ...extraMarkers],
    [FOOTER.replace('Page {page} of {pages}', 'Page 4 of 4').replace(auFamily.PUBLISHER_NAME, publisher).replace('ABN: 26 000 602 862', abn),
      '', 'Publically Available Consumer Information',
      'Consumer Credit Information', 'Overdue Accounts', ...overdueLines]
  ];
  return makeSyntheticModel({ pages, page_count: pages.length, page_size: A4 });
}

/** The admission a synthetic structural test supplies. It is explicitly NOT a presentation. */
const SYNTHETIC_ADMISSION = Object.freeze({
  state: 'SYNTHETIC_STRUCTURAL_TEST_INPUT_NOT_A_REPORT',
  admitted: true,
  refusal_reason: null,
  fact_status: null,
  presentation_evidence: false,
  note: 'in-memory structural model: not a report, not presentation evidence, not admissible'
});

function enquiryRecord(date) {
  return ['Enquiry Date                                   ' + date, 'Credit Provider                               SOME BANK', 'Amount                                        $1,000'];
}

function overdueRecord(options) {
  const { status = 'Outstanding', listing = '20 Jul 2015', deletion = '20 Jul 2020', originalBlock = true, currentDate = '20 Jul 2015', duplicateOriginalDate = false } = options || {};
  const lines = ['Status                                        ' + status, 'Current Listing', 'Credit Provider                               SOME BANK', 'Date                                          ' + currentDate, 'Amount                                        $1,000', 'Account Type                                  Credit Card'];
  if (originalBlock) {
    lines.push('Original Listing', 'Original Credit Provider                      SOME BANK', 'Date                                          ' + listing);
    if (duplicateOriginalDate) lines.push('Date                                          21 Jul 2015');
    lines.push('Amount                                        $1,000', 'Reason to Report                              Payment Default');
    if (deletion) lines.push('Date will be Deleted                          ' + deletion);
  }
  return lines;
}

/* ------------------------------------------------------------------ part 1: real captured evidence */

function realEvidence(check, checkSkip) {
  if (!fs.existsSync(PUB_012)) {
    checkSkip('the captured public sample', 'THE_CAPTURED_PUBLIC_SAMPLE_PUB-012_IS_NOT_PRESENT');
    return { skipped: true, reason: 'THE_CAPTURED_PUBLIC_SAMPLE_PUB-012_IS_NOT_PRESENT' };
  }
  check.equal(sha256File(PUB_012).toUpperCase(), auFamily.FAMILY_CONTRACT.evidenced_sha256.toUpperCase(),
    'the captured public sample still matches the digest the contract names');

  const model = formats.buildPdfDocumentModel(PUB_012);
  const admission = auFamily.admit(model);
  check.equal(admission.admitted, true, 'the family contract admits the captured public sample');
  check.equal(admission.predicates.filter((p) => !p.passed).length, 0, 'every structural predicate holds on real bytes');

  const x = auFamily.extract(model, admission);
  check.equal(x.reference_date.status, 'RESOLVED');
  check.equal(x.reference_date.raw_value, '4 January 2016', 'the printed report date is read literally');
  check.equal(x.reference_date.normalized_value, '2016-01-04');
  check.equal(x.summary.status, 'RESOLVED');
  check.equal(x.summary.by_kind.CREDIT_ENQUIRY.records_read, 4, 'the sample prints four consumer credit enquiries');
  check.equal(x.summary.by_kind.OVERDUE_ACCOUNT.records_read, 2, 'and two overdue accounts');
  check.equal(x.summary.by_kind.CONSUMER_CREDIT_LIABILITY.records_read, 3,
    'and three consumer credit liability records');
  check.equal(x.summary.by_kind.CONSUMER_CREDIT_LIABILITY.records_resolved, 2,
    'two of them readable as liability records, the third printing no boundary labels');
  const liabilities = x.records.filter((r) => r.kind === 'CONSUMER_CREDIT_LIABILITY');
  check.deepEqual(liabilities.map((r) => r.printed.closed_date.raw), [null, null, null],
    'every liability record in the sample prints its closure label with NO value');
  check.deepEqual(liabilities.map((r) => r.printed.closed_date.reason),
    ['LABEL_PRINTED_WITHOUT_VALUE', 'LABEL_PRINTED_WITHOUT_VALUE', 'LABEL_NOT_PRINTED_ON_THIS_RECORD'],
    'and the two readings — printed-without-a-value and not-printed — are kept distinct');
  check.equal(liabilities[1].printed.current_repayment_status.raw,
    'The consumer credit is not overdue – Current up to and including the grace period',
    "the second record prints the report's own repayment status");
  check.equal(liabilities[0].printed.current_repayment_status.raw, null,
    'and the first prints none');
  check.deepEqual(liabilities[0].facts, {
    'liability.openedDate': '2013-04-11',
    'account.reported_identity': 'EXPRESS BANK',
    'account.type': 'CREDIT CARD',
    'account.creditLimitRaw': '$10,000',
    'account.creditLimit': 10000,
    'liability.accountReference': 'EPB0075',
    'liability.accountReferenceRaw': 'EPB0075'
  }, 'a liability record supplies only the facts it actually prints: its dates plus the credited provider, the account type, the credit limit and the account reference the entry prints as a labelled value');
  check.deepEqual(x.evidence_readings.boundary_anomalies, [], 'with no record-boundary anomaly');

  const enquiries = x.records.filter((r) => r.kind === 'CREDIT_ENQUIRY');
  check.deepEqual(enquiries.map((r) => r.normalized_value), ['2014-11-14', '2014-04-10', '2014-02-24', '2012-09-10'],
    'each enquiry carries its own printed date');
  check.ok(enquiries.every((r) => r.source_field === 'Enquiry Date' && r.location.page === 9),
    'and each names the field and the page it was read from');

  const overdues = x.records.filter((r) => r.kind === 'OVERDUE_ACCOUNT');
  check.deepEqual(overdues.map((r) => r.normalized_value), ['2015-07-20', '2015-02-20'],
    'each overdue account is aged from its OWN original listing date');
  check.ok(overdues.every((r) => r.source_field === 'Original Listing > Date'),
    'and never from the current-listing date');
  check.deepEqual(overdues.map((r) => r.printed_extra.report_printed_deletion_date), ['20 Jul 2020', '20 Feb 2020'],
    "each prints the report's own deletion date beside it");

  const addYears = require('../../../adapters/evaluation-primitives.cjs').calendar.addCalendarYears;
  for (const record of overdues) {
    const reportOwn = auFamily.normalizePrintedDate(record.printed_extra.report_printed_deletion_date).normalized;
    check.equal(reportOwn, addYears(record.normalized_value, 5),
      'the report states its own five-year end date for this record');
    check.notEqual(record.normalized_value, reportOwn, "and that statement is not returned as the rule's anchor");
  }

  const locations = x.records.map((r) => `${r.location.page}:${r.location.line}`);
  check.equal(new Set(locations).size, locations.length, 'no two records share one report location');
  check.ok(!JSON.stringify(overdues[0]).includes(overdues[1].normalized_value), "account 1 does not carry account 2's date");
  check.ok(!JSON.stringify(overdues[1]).includes(overdues[0].normalized_value), "and account 2 does not carry account 1's date");
  check.deepEqual(Object.keys(enquiries[0].facts), ['enquiry.date'], "a record's fact object carries only its own value");

  return { skipped: false, digest: sha256File(PUB_012), records: x.records.length };
}


/* ------------------------------------------------------------------ part 2: synthetic behaviour */

function syntheticBehaviour(check) {
  const good = auFamily.extract(familyModel({ enquiryLines: enquiryRecord('14 Nov 2014'), overdueLines: overdueRecord({}) }), SYNTHETIC_ADMISSION);
  check.equal(good.reference_date.normalized_value, '2016-01-04');
  check.equal(good.records.length, 2);
  check.equal(good.records[0].facts['enquiry.date'], '2014-11-14');
  check.equal(good.records[1].facts['overdue.originalListingDate'], '2015-07-20');

  /* A record that prints no original-listing block is UNRESOLVED, and its current-listing date is NOT used. */
  const noBlock = auFamily.extract(familyModel({ overdueLines: overdueRecord({ originalBlock: false, currentDate: '20 Jul 2015' }) }), SYNTHETIC_ADMISSION);
  const unresolved = noBlock.records.find((r) => r.kind === 'OVERDUE_ACCOUNT');
  check.equal(unresolved.status, 'EXTRACTION_UNRESOLVED');
  check.equal(unresolved.reason, 'ORIGINAL_LISTING_BLOCK_NOT_PRINTED');
  check.equal(unresolved.normalized_value, null, 'the current-listing date is never substituted');
  check.equal(unresolved.current_listing_date, '20 Jul 2015', 'it is still read and reported separately');
  check.deepEqual(unresolved.facts, {}, 'and no fact is supplied to any rule');

  /* Two original-listing dates in one record are ambiguous: not averaged, not preferred. */
  const doubled = auFamily.extract(familyModel({ overdueLines: overdueRecord({ duplicateOriginalDate: true }) }), SYNTHETIC_ADMISSION);
  const ambiguous = doubled.records.find((r) => r.kind === 'OVERDUE_ACCOUNT');
  check.equal(ambiguous.reason, 'LABEL_PRINTED_MORE_THAN_ONCE_IN_RECORD');
  check.equal(ambiguous.normalized_value, null);

  /* A printed label with no value is unresolved, and is not the same statement as an absent label. */
  const blank = auFamily.extract(familyModel({ enquiryLines: ['Enquiry Date', 'Credit Provider SOME BANK'] }), SYNTHETIC_ADMISSION);
  check.equal(blank.records[0].reason, 'LABEL_PRINTED_WITHOUT_VALUE');
  check.equal(blank.records[0].normalized_value, null);

  /* A section that is not printed and a section that is printed but empty are different statements. */
  const omitted = auFamily.extract(familyModel({ omitEnquiries: true, overdueLines: overdueRecord({}) }), SYNTHETIC_ADMISSION);
  check.equal(omitted.summary.by_kind.CREDIT_ENQUIRY.status, 'ABSENT_FROM_REPORT');
  check.equal(omitted.summary.by_kind.CREDIT_ENQUIRY.reason, 'SECTION_NOT_PRINTED_BY_THIS_REPORT');
  check.equal(omitted.summary.by_kind.OVERDUE_ACCOUNT.status, 'RESOLVED', 'the unaffected kind still resolves');

  const empty = auFamily.extract(familyModel({ enquiryLines: [], overdueLines: overdueRecord({}) }), SYNTHETIC_ADMISSION);
  check.equal(empty.summary.by_kind.CREDIT_ENQUIRY.reason, 'SECTION_LOCATED_AND_RESOLVED_WITH_NO_RECORD');
  check.notEqual(empty.summary.by_kind.CREDIT_ENQUIRY.reason, omitted.summary.by_kind.CREDIT_ENQUIRY.reason,
    'an empty section is not reported as an unprinted one');

  /* One unusable record restricts its own check and leaves the other record's check intact. */
  const mixed = auFamily.extract(familyModel({
    enquiryLines: enquiryRecord('14 Nov 2014'),
    overdueLines: [...overdueRecord({}), ...overdueRecord({ originalBlock: false, currentDate: '1 Jan 2016' })]
  }), SYNTHETIC_ADMISSION);
  const overdueRecords = mixed.records.filter((r) => r.kind === 'OVERDUE_ACCOUNT');
  check.equal(overdueRecords.length, 2);
  check.equal(overdueRecords[0].status, 'RESOLVED');
  check.equal(overdueRecords[1].status, 'EXTRACTION_UNRESOLVED');
  check.equal(mixed.summary.by_kind.OVERDUE_ACCOUNT.status, 'RESOLVED', 'one unusable record does not disable the kind');

  /* The enquiry date is still extracted, but only the overdue retention rule belongs to the
     active common-error checklist. The retired enquiry rule must not run. */
  const evaluation = require('../../evaluation.cjs');
  const evaluated = evaluation.evaluateCase({
    country: 'AU',
    region: 'AU-NSW',
    extraction: {
      presentation_id: auFamily.FAMILY_ID,
      presentation_evidence: false,
      extraction_ran: true,
      container: 'PDF',
      support: formats.SUPPORT.ACTUAL_REPORT_EVIDENCE,
      admission: { admitted: true },
      refusal: null,
      reference_date: good.reference_date,
      records: good.records,
      summary: good.summary
    }
  });
  check.equal(evaluated.results.length, 1, 'only the checklist-backed overdue comparison runs');
  check.deepEqual(evaluated.results.map((r) => r.machine.anchor.field).sort(),
    ['overdue.originalListingDate'], 'the active comparison uses the overdue record’s own date');
  check.ok(evaluated.results.every((r) => r.machine.finding_emitted === false), 'none of them is a finding');
  check.ok(evaluated.results.every((r) => r.machine.packet_eligible === true),
    'the supported AU comparison retains packet permission (no finding here, so no packet is offered)');

  return { records: good.records.length };
}


/* ------------------------------------------------------------------ part 3: refusal paths */

function auSkeletonPages(publisher, abn, body) {
  const footer = (page) => `${publisher}   Page ${page} of 3   ${abn}`;
  return [
    ['CASE SUBJECT', 'Report Date: 4 January 2016'],
    [footer(2), 'Personal Information', 'Credit Overview', 'Summary'],
    [footer(3), 'Consumer Credit Information', 'Publically Available Consumer Information', ...body]
  ];
}

function inspectionPredicates(check) {
  const A4MODEL = { width_pt: 595.32, height_pt: 841.92, label: 'A4' };
  const build = (pages) => makeSyntheticModel({ pages, page_count: pages.length, page_size: A4MODEL });
  /* The full SET of refusals a model raises, order-independent. `admissionPredicates` is a pure function of
     the model, so this asserts exactly which defects a document carries without depending on which one the
     gate happens to report first — the real-file tests below assert the reported first failure instead. */
  const refusalsOf = (model) => auFamily.admissionPredicates(model).filter((p) => !p.passed).map((p) => p.refusal_reason);

  const otherPublisher = refusalsOf(build(auSkeletonPages('Some Other Bureau Pty Ltd', 'ABN: 00 000 000 000', ['Consumer Credit Enquiries'])));
  check.ok(otherPublisher.includes('FAMILY_BUREAU_IDENTITY_ABSENT'), 'another publisher fails the identity predicate');

  const noConsumerSection = refusalsOf(build(auSkeletonPages(auFamily.PUBLISHER_NAME, auFamily.PUBLISHER_ABN, ['A section that is not a consumer credit section'])));
  check.ok(noConsumerSection.includes('FAMILY_CONSUMER_SECTIONS_ABSENT'), 'a document with no consumer section fails');
  check.ok(!noConsumerSection.includes('FAMILY_BUREAU_IDENTITY_ABSENT'), 'and it is not confused with an identity failure');

  const noHeadings = refusalsOf(build([
    ['CASE SUBJECT'],
    [`${auFamily.PUBLISHER_NAME}   Page 2 of 2   ${auFamily.PUBLISHER_ABN}`],
    [`${auFamily.PUBLISHER_NAME}   Page 3 of 3   ${auFamily.PUBLISHER_ABN}`, 'Consumer Credit Enquiries']
  ]));
  check.ok(noHeadings.includes('NOT_THE_EVIDENCED_FAMILY_STRUCTURE'), 'a document without the skeleton headings fails');

  const fixture = refusalsOf(build([[markerLines()[0], `${auFamily.PUBLISHER_NAME} ${auFamily.PUBLISHER_ABN}`]]));
  check.ok(fixture.includes('FAMILY_SYNTHETIC_OR_FIXTURE_MARKER'),
    'a model carrying the shared fixture marker is refused before its structure is considered');

  const training = refusalsOf(build([
    ['CASE SUBJECT'],
    [`${auFamily.PUBLISHER_NAME}   Page 2 of 2   ${auFamily.PUBLISHER_ABN}`],
    ['SAMPLE REPORT - The information in this report is FICTICIOUS and is to be used for training and educational purposes only']
  ]));
  check.ok(training.includes('FAMILY_WRONG_CHANNEL_MARKER'), 'a training aid is not a consumer report');

  const inMemory = auFamily.admit(familyModel({ enquiryLines: enquiryRecord('14 Nov 2014'), overdueLines: overdueRecord({}) }));
  check.equal(inMemory.admitted, false, 'an in-memory model with the family structure is still refused');
  check.equal(inMemory.refusal_reason, 'FAMILY_IN_MEMORY_MODEL_IS_NOT_A_FILE');
  check.ok(refusalsOf(familyModel({})).includes('FAMILY_IN_MEMORY_MODEL_IS_NOT_A_FILE'));

  return { predicate_refusals: 9 };
}


async function refusalPaths(t, check) {
  fs.rmSync(FIXTURE_DIR, { recursive: true, force: true });
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });
  const A4MODEL = { width: 595.32, height: 841.92 };

  const otherPublisher = writeFixture(FIXTURE_DIR, 'au-shaped-other-publisher.pdf', {
    pages: auSkeletonPages('Some Other Bureau Pty Ltd', 'ABN: 00 000 000 000', ['Consumer Credit Enquiries', 'Enquiry Date 14 Nov 2014'])
      .map((lines) => ({ lines })),
    page_size: A4MODEL
  });
  const imageOnly = writeFixture(FIXTURE_DIR, 'au-image-only-page.pdf', {
    pages: [{ lines: ['CASE SUBJECT'] }, { image_only: true }],
    page_size: A4MODEL
  });

  const otherModel = formats.buildPdfDocumentModel(otherPublisher);
  const otherAdmission = auFamily.admit(otherModel);
  check.equal(otherAdmission.admitted, false, 'a real PDF from another publisher is not admitted');
  check.equal(otherAdmission.refusal_reason, 'FAMILY_BUREAU_IDENTITY_ABSENT');
  const imageAdmission = auFamily.admit(formats.buildPdfDocumentModel(imageOnly));
  check.equal(imageAdmission.refusal_reason, 'FAMILY_IMAGE_ONLY_OR_NO_TEXT_LAYER',
    'a page with no text layer is refused rather than read as an empty page');

  /* Detection is scoped by market: an Australian selection is measured against the Australian family only,
     and a document from an unrecognised bureau falls to the general intake, which refuses it as unrelated. */
  const auDetection = formats.detectSupportedFormat(otherModel, { country: 'AU' });
  check.equal(auDetection.supported, false);
  check.equal(auDetection.refusal_reason, 'UNRELATED_DOCUMENT', 'an AU refusal from an unrecognised bureau is unrelated');
  check.equal(auDetection.family_predicates.length, 1, 'and records what was measured for that market');
  const caDetection = formats.detectSupportedFormat(otherModel, { country: 'CA' });
  check.equal(caDetection.refusal_reason, 'UNRELATED_DOCUMENT',
    'the same unrecognised document is unrelated for a Canadian selection too');
  check.ok(!/^FAMILY_/.test(caDetection.refusal_reason));

  /* Over HTTP: stored so the measured shape can be reported, then refused, with nothing read. */
  const owner = await t.account('au-family-owner@example.test');
  const caseId = (await t.request('POST', '/api/cases', { token: owner.token, body: { country: 'AU', region: 'AU-NSW' } })).json.case.case_id;
  const before = t.blobFiles().length;

  const upload = await t.request('POST', `/api/cases/${caseId}/files`, {
    token: owner.token,
    body: {
      originalFilename: 'my-credit-report.pdf',
      declaredBytes: fs.statSync(otherPublisher).size,
      mimeType: 'application/pdf',
      contentBase64: fs.readFileSync(otherPublisher).toString('base64')
    }
  });
  check.equal(upload.status, 201, 'a lookalike is stored so its measured shape can be reported');
  check.equal(upload.json.receipt.format_detection.supported, false);
  check.equal(upload.json.receipt.format_detection.refusal_reason, 'UNRELATED_DOCUMENT',
    'a lookalike from an unrecognised bureau is refused as unrelated');
  check.equal(upload.json.receipt.format_detection.read_support_is, 'REFUSED');
  check.equal(upload.json.receipt.extraction_summary.extraction_ran, false);
  check.equal(upload.json.receipt.extraction_summary.accounts_read, 0);
  check.equal(t.blobFiles().length, before + 1);

  const evaluate = await t.request('POST', `/api/cases/${caseId}/evaluate`, { token: owner.token, body: {} });
  check.equal(evaluate.status, 201);
  check.equal(evaluate.json.result.checks_performed, 0, 'a refused file produces no check at all');
  check.ok(evaluate.json.result.checks_not_run.length > 0, 'and says so, rather than implying an empty report');

  const deleted = await t.request('DELETE', `/api/cases/${caseId}`, { token: owner.token });
  check.equal(deleted.json.blobs_removed, 1);
  check.equal(t.blobFiles().length, 0);
  return { fixtures: 2 };
}

async function run(t, check) {
  const real = realEvidence(check, check.skip);
  const synthetic = syntheticBehaviour(check);
  const predicates = inspectionPredicates(check);
  const refusals = await refusalPaths(t, check);
  return { real_evidence: real, synthetic, predicates, refusals };
}

module.exports = {
  run,
  id: 'l-au-format-family',
  title: 'The AU consumer format family: real captured evidence, synthetic behaviour, refusals'
};

