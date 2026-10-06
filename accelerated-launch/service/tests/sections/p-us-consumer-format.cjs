'use strict';
/**
 * p-us-consumer-format.cjs — OWNER-ALL82-001 / B3 continuation. The United States consumer disclosure.
 *
 * The owner directed: "Use the existing official consumer-channel PUB-001 artifact ... Verify its custody and
 * inspect its rendered pages ... Extract text with page/coordinate evidence ... Implement a consumer-format
 * adapter and supported factual checks from fields actually present ... Test the real sample end to end, plus
 * synthetic positive/negative cases ... Refuse subscriber, screening and structurally unsupported inputs."
 *
 * This section does those things and nothing else. Two kinds of test are kept strictly apart:
 *
 *   1. REAL EVIDENCE. `PUB-001.pdf` is read where it already sits inside SOURCE_CAPTURES, read-only, through
 *      the production adapter and the authorized LOCAL OCR reader. Nothing is copied or redistributed.
 *   2. SYNTHETIC BEHAVIOUR TESTS. In-memory structural models drive the refusal and negative paths. They are
 *      labelled synthetic, they supply no presentation evidence, and passing one proves nothing about a real
 *      report.
 */

const fs = require('node:fs');
const path = require('node:path');

const usFamily = require('../../../service/format-families/us-experian-consumer.cjs');
const ocr = require('../../../service/ocr/local-ocr.cjs');
const formats = require('../../formats.cjs');
const { evaluateCase } = require('../../evaluation.cjs');
const {
  buildPdfDocumentModel, makeSyntheticModel, sha256File
} = require('../../../../internal-validation/ca-ns-last-payment-six-year/document-model.cjs');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const CAPTURES = path.join(ROOT, 'SOURCE_CAPTURES', 'REPORT_FORMAT_BASELINE_2026-09-30');
const PUB_001 = path.join(CAPTURES, 'PUB-001.pdf');
const PUB_021 = path.join(CAPTURES, 'PUB-021.pdf');
const PUB_003 = path.join(CAPTURES, 'PUB-003.pdf');
const PUB_004 = path.join(CAPTURES, 'PUB-004.pdf');
const EXP_006 = path.join(ROOT, 'SOURCE_CAPTURES', 'EXPERIAN_US_CONSUMER_FORMAT_INVESTIGATION', 'EXP-006.pdf');

const US_RELATION = 'US-FCRA-15-USC-1681C-COUNTRY-WIDE';

/* ------------------------------------------------------------------ part 0: the reader itself */

function readerAvailability(check, checkSkip) {
  const probe = ocr.resolveProgram('tesseract', ['--version']);
  if (!probe.path) {
    checkSkip('the local OCR engine', 'NO_LOCAL_OCR_ENGINE_IS_PRESENT_ON_THIS_MACHINE');
    return { available: false };
  }
  check.ok(ocr.resolveTessdata(probe.path).dir, 'the engine reports a language-data directory');
  /* An unavailable engine is reported as unavailable, never as an empty document. */
  const absent = ocr.readTextLayer(path.join(CAPTURES, 'THIS-FILE-DOES-NOT-EXIST.pdf'));
  check.equal(absent.available, false, 'a missing file is reported as unavailable, not as an empty document');
  check.equal(absent.refusal_reason, 'THE_UPLOADED_FILE_IS_NOT_PRESENT_ON_DISK');
  check.deepEqual(absent.pages, [], 'and it reports no pages at all');
  return { available: true, engine_path: probe.path };
}

/* ------------------------------------------------------------------ part 1: real captured evidence */

function realEvidence(check, checkSkip, reader) {
  if (!fs.existsSync(PUB_001)) {
    checkSkip('the captured consumer artifact', 'THE_CAPTURED_ARTIFACT_PUB-001_IS_NOT_PRESENT');
    return { skipped: true, reason: 'THE_CAPTURED_ARTIFACT_PUB-001_IS_NOT_PRESENT' };
  }
  if (!reader.available) {
    checkSkip('the local OCR pass over the captured artifact', 'NO_LOCAL_OCR_ENGINE_IS_PRESENT_ON_THIS_MACHINE');
    return { skipped: true, reason: 'NO_LOCAL_OCR_ENGINE_IS_PRESENT_ON_THIS_MACHINE' };
  }

  /* 1. custody: the bytes are the bytes the inventory pinned. */
  check.equal(sha256File(PUB_001).toLowerCase(), usFamily.EVIDENCED_SHA256.toLowerCase(),
    'the artifact on disk still matches the digest the family contract names');

  const model = buildPdfDocumentModel(PUB_001);
  check.equal(model.page_count, 1, 'it is one page');
  check.equal(model.pages[0].has_native_text, false, 'and it carries no native text layer at all');

  /* 2. admission, and the text source that admitted it. */
  const admission = usFamily.admit(model);
  check.equal(admission.admitted, true, 'the structural contract admits the captured artifact');
  check.equal(admission.predicates.filter((p) => !p.passed).length, 0, 'every structural predicate holds');
  check.equal(admission.text_source, 'LOCAL_OCR', 'and the text layer came from the authorized local OCR reader');

  const reading = usFamily.textLayerFor(model).ocr_reading;
  check.equal(reading.available, true, 'the OCR reading is available');
  check.equal(reading.refusal_reason, null);
  check.ok(reading.pages[0].line_count > 100, 'it recovered the whole page as lines');
  check.ok(reading.pages[0].trusted_line_count > 100, 'and most lines are above the recorded confidence floor');
  check.ok(reading.pages[0].line_evidence.every((l) => typeof l.y0 === 'number' && typeof l.x0 === 'number'),
    'every line carries page coordinates');
  check.equal(reading.pages[0].line_evidence.filter((l) => l.trusted === false).length,
    reading.pages[0].line_count - reading.pages[0].trusted_line_count,
    'the untrusted lines are counted, not discarded');

  /* 3. extraction, asserted against what the artifact actually prints. */
  const x = usFamily.extract(model, admission);
  check.equal(x.reference_date.status, 'RESOLVED', 'the report reference date is read');
  check.equal(x.reference_date.normalized_value, '2015-06-30', 'and read literally from its own header line');
  check.equal(x.summary.by_kind.REPORTED_ACCOUNT.records_read, 3, 'the artifact prints three accounts');
  check.equal(x.summary.by_kind.PUBLIC_RECORD.status, 'ABSENT_FROM_REPORT',
    'and prints its own statement that no public records appear');
  check.equal(x.evidence_readings.public_records.absence_statement_printed, true);
  check.ok(x.evidence_readings.public_records.absence_statement_location.y0 > 0,
    'the absence statement carries its own coordinate');
  check.equal(x.evidence_readings.negative_items.accounts_printed, 1, 'one account sits in the negative-items section');
  check.equal(x.summary.by_kind.CREDIT_INQUIRY.records_read, 1, 'and one inquiry row is readable');

  const account = x.records.find((r) => r.kind === 'REPORTED_ACCOUNT' && r.section_path === 'Potentially negative items');
  check.ok(account, 'the negative-items account is read');
  check.equal(account.printed.status.raw, 'Open.', 'its printed status is read verbatim');
  check.equal(account.printed.date_opened.normalized, '2013-11', 'its printed opening date is read');
  check.equal(account.location.columns_found, 5, 'all five printed column anchors are found in its header row');
  const adverse = account.printed.adverse_payment_rating_date;
  check.equal(adverse.status, 'RESOLVED', 'its printed adverse payment rating is read');
  check.equal(adverse.raw_value, '30 days past due as of Jun 2015', 'verbatim');
  check.equal(adverse.anchor_precision, 'MONTH', 'as a month, with the precision recorded');
  check.equal(adverse.comparison_anchor, '2015-06', 'and the comparison anchor keeps the month with no invented day');
  check.ok(adverse.location.y0 > 0 && adverse.location.confidence > 60, 'with its own coordinate and confidence');

  /* A value the reader could not turn into a calendar date is UNRESOLVED with the reading preserved. */
  const firstReported = account.printed.first_reported;
  check.equal(firstReported.status, 'EXTRACTION_UNRESOLVED', 'a value that is not a possible date stays unresolved');
  check.equal(firstReported.raw, '42/2013', 'with the raw reading preserved beside it');
  check.equal(firstReported.normalized, null);
  check.ok(!account.printed.fields.some((f) => String(f.raw_value) === 'Dispute'),
    'a printed control never becomes a field value');
  check.ok(account.printed.unlabelled_lines.length > 0,
    'and an unlabelled printed line is recorded as evidence, not forced into a field');

  return {
    skipped: false,
    evidenced_artifact_id: usFamily.EVIDENCED_ARTIFACT_ID,
    ocr_engine: reading.engine_version,
    ocr_lines: reading.pages[0].line_count,
    ocr_trusted_lines: reading.pages[0].trusted_line_count,
    reference_date: x.reference_date.normalized_value,
    accounts_read: x.summary.by_kind.REPORTED_ACCOUNT.records_read,
    inquiries_read: x.summary.by_kind.CREDIT_INQUIRY.records_read,
    public_record_absence_statement: x.evidence_readings.public_records.absence_statement_text
  };
}

/**
 * The real end-to-end evaluation of the captured artifact, through the shared adapter and the shared
 * evaluator, for a United States region. Nothing here is inferred: the counts below are what the run produced,
 * and they are what the launch matrix reads.
 */
function realEvaluation(check) {
  const model = buildPdfDocumentModel(PUB_001);
  const extraction = formats.extractWithSharedAdapter(model, { mode: 'REPORT', country: 'US' });
  check.equal(extraction.presentation_evidence, true, 'the captured artifact is admitted as report evidence');
  const evaluation = evaluateCase({ country: 'US', region: 'US-CA', extraction });
  check.equal(evaluation.results.length, 1, 'and exactly one comparison is performed against it');
  check.equal(evaluation.results[0].check.adapter_id, 'FCRA-605A-5-US-NATIONAL-7Y');
  check.equal(evaluation.results[0].machine.state, 'EVALUATED');
  check.equal(evaluation.results[0].machine.outcome, 'PERIOD_NOT_EXCEEDED');
  check.equal(evaluation.results[0].machine.arithmetic.anchor_month, '2015-06',
    'computed from the whole printed month as a range, no day invented');
  check.equal(evaluation.results[0].machine.arithmetic.reference_date, '2015-06-30',
    "against the report's own printed reference date");
  check.equal(evaluation.results[0].machine.finding_emitted, false, 'and it is not a finding');
  check.equal(evaluation.results[0].machine.packet_eligible, false);
  check.equal(evaluation.unavailable_checks.filter((c) => /NO_RECORD_OF_THE_KIND/.test(c.reason)).length, 7,
    'seven public-record and collection limbs find no entry of their kind on this disclosure and are reported unavailable');
  check.equal(evaluation.unresolved_applicability.length, 5,
    'and the three adverse accounts are left unresolved under the fail-closed California rule (plus the two unreadable ones under the federal rule)');
  check.equal(evaluation.not_applicable_checks.length + evaluation.results.length
    + evaluation.unresolved_applicability.length + evaluation.unavailable_checks.length, 13,
    'so all thirteen United States limb resolutions are accounted for');

  const records = require('../../../adapters/applicability-records.json');
  const relation = records.relations.find((r) => r.relation_id === US_RELATION);
  check.ok(relation, 'the United States applicability relation is recorded');
  const executable = /^EXECUTABLE/.test(relation.execution);
  return {
    executed_checks_per_region: executable ? evaluation.results.length : 0,
    checks_performed_on_the_sample: evaluation.results.length,
    not_applicable_limbs_per_region: evaluation.not_applicable_checks.length,
    applicability_unresolved_limbs_per_region: evaluation.unresolved_applicability.length,
    regions_with_a_working_assessment: executable ? relation.region_rows.map((r) => r.region).sort() : [],
    presentation_id: 'US-CONSUMER-DISCLOSURE'
  };
}

/* ------------------------------------------------------------------ part 2: synthetic structural tests */

/** A model shaped like the consumer presentation, with the sections the caller supplies. */
function consumerModel(options) {
  const opts = options || {};
  const {
    omit = [], accountLines = ['Account name Account number Recent balance Date opened Status'],
    extra = [], fixtureMarker = null
  } = opts;
  const present = usFamily.REQUIRED_SECTION_HEADINGS.filter((h) => !omit.includes(h));
  const pages = [[
    'Experian   | Report number 0000-0000-00 | June 30, 2015 | Print report | Logout',
    'Your credit report',
    ...present,
    ...accountLines,
    ...extra
  ]];
  if (fixtureMarker) pages[0].push(fixtureMarker);
  return makeSyntheticModel({ pages, page_count: 1 });
}

function syntheticTests(check) {
  const inMemory = usFamily.admit(consumerModel({}));
  check.equal(inMemory.text_source, 'NATIVE_TEXT_LAYER',
    'an in-memory model with the structure resolves a native text layer');
  check.equal(inMemory.predicates.find((p) => p.id === 'MODEL_IS_A_FILE_NOT_AN_IN_MEMORY_MODEL').passed, false,
    'and is still refused for not being a file');
  check.equal(inMemory.admitted, false);
  check.equal(inMemory.refusal_reason, 'US_FAMILY_IN_MEMORY_MODEL_IS_NOT_A_FILE');

  const missingSection = usFamily.admit(consumerModel({ omit: ['Accounts in good standing'] }));
  check.equal(missingSection.predicates.find((p) => p.id === 'REQUIRED_CONSUMER_SECTIONS_PRESENT').passed, false,
    'a model missing a required consumer section fails that predicate');
  check.equal(missingSection.refusal_reason, 'US_FAMILY_IN_MEMORY_MODEL_IS_NOT_A_FILE',
    'and the in-memory refusal is reported first, because a synthetic model is never a file');

  const noSkeleton = usFamily.admit(consumerModel({ accountLines: [] }));
  check.equal(noSkeleton.admitted, false, 'a model with no printed account header row is refused');

  const fixture = usFamily.admit(consumerModel({ fixtureMarker: 'SYNTHETIC FIXTURE' }));
  check.equal(fixture.predicates.find((p) => p.id === 'NO_FIXTURE_OR_SYNTHETIC_MARKER').passed, false,
    'a fixture marker is measured');

  /* An image-only model whose OCR cannot answer reports the OCR reason, and reports NO records: a refusal is
     never an empty report. */
  const blind = makeSyntheticModel({ pages: [['']], page_count: 1 });
  blind.pages[0].has_native_text = false;
  const blindAdmission = usFamily.admit(blind);
  check.equal(blindAdmission.refusal_reason, 'US_FAMILY_IMAGE_ONLY_AND_NO_LOCAL_OCR',
    'an image-only document with no OCR answer names the OCR reason');
  check.equal(blindAdmission.predicates.find((p) => p.id === 'TEXT_LAYER_IS_AVAILABLE_BY_NATIVE_TEXT_OR_AUTHORIZED_LOCAL_OCR').passed,
    false, 'and fails the text-layer predicate, not a structural one');
  const blindExtraction = usFamily.extract(blind, blindAdmission);
  check.deepEqual(blindExtraction.records, [], 'and reports no records at all');
  check.equal(blindExtraction.summary.records_read, 0);
  check.match(blindExtraction.summary.reason, /DOCUMENT_REFUSED:/,
    'so a refusal can never be read as an empty report');

  return {
    in_memory_refusal: inMemory.refusal_reason,
    structure_refusal: missingSection.refusal_reason,
    skeleton_refusal: noSkeleton.refusal_reason,
    image_only_refusal: blindAdmission.refusal_reason
  };
}

/* ------------------------------------------------------------------ part 3: other channels refused */

function otherChannelRefusals(check, checkSkip) {
  const outcomes = {};
  for (const file of [PUB_021, PUB_003, PUB_004]) {
    if (!fs.existsSync(file)) {
      checkSkip(path.basename(file), 'THE_CAPTURED_ARTIFACT_IS_NOT_PRESENT');
      continue;
    }
    const model = buildPdfDocumentModel(file);
    const detection = formats.detectSupportedFormat(model, { country: 'US' });
    outcomes[path.basename(file)] = {
      supported: detection.supported,
      refusal_reason: detection.refusal_reason,
      encrypted: model.encrypted,
      copy_permitted: model.encryption ? model.encryption.copy_allowed : null
    };
    /* B6-INGEST-002: a subscriber product is no longer blanket-refused. It is read by the general intake
       (bureau plus report content) or refused as UNREADABLE when its container withholds its text. It is never
       admitted as the US consumer-disclosure family. */
    if (model.encrypted === true && model.text_extraction_permitted !== true) {
      check.equal(detection.supported, false, `${path.basename(file)}: an encrypted subscriber product is refused`);
      check.equal(detection.refusal_reason, 'UNREADABLE_DOCUMENT', `${path.basename(file)}: as unreadable`);
      check.equal(model.encryption.copy_allowed, false, `${path.basename(file)}: the document withholds permission to copy its text`);
      check.equal(model.pages.length, 0, `${path.basename(file)}: so its pages are not read at all`);
    } else {
      check.equal(detection.supported, true, `${path.basename(file)}: a readable subscriber product is read by the general intake`);
      check.equal(detection.presentation_id, 'GENERAL-BUREAU-REPORT', `${path.basename(file)}: as a general report`);
      check.notEqual(detection.presentation_id, 'US-CONSUMER-DISCLOSURE', `${path.basename(file)}: and NOT as the US consumer family`);
    }
  }
  if (fs.existsSync(EXP_006)) {
    const detection = formats.detectSupportedFormat(buildPdfDocumentModel(EXP_006), { country: 'US' });
    outcomes['EXP-006.pdf'] = { supported: detection.supported, refusal_reason: detection.refusal_reason };
    check.equal(detection.supported, true, 'EXP-006.pdf: a screening artifact is read by the general intake');
    check.equal(detection.presentation_id, 'GENERAL-BUREAU-REPORT', 'EXP-006.pdf: as a general report, not the US consumer family');
  }
  return outcomes;
}

module.exports = {
  id: 'p-us-consumer-format',
  title: 'The United States consumer disclosure, read by authorized local OCR',

  async run(t, check) {
    const reader = readerAvailability(check, check.skip);
    const real = realEvidence(check, check.skip, reader);
    const evaluation = real.skipped === true ? null : realEvaluation(check);
    const synthetic = syntheticTests(check);
    const otherChannels = otherChannelRefusals(check, check.skip);
    return {
      skipped: real.skipped === true,
      reason: real.reason || null,
      real_evidence: real,
      local_ocr: reader,
      synthetic,
      other_channel_refusals: otherChannels,
      presentation_id: 'US-CONSUMER-DISCLOSURE',
      evidenced_artifact_id: usFamily.EVIDENCED_ARTIFACT_ID,
      /* What the real run produced, per region. The launch matrix reads these and never infers them. */
      ...(evaluation || {})
    };
  }
};
