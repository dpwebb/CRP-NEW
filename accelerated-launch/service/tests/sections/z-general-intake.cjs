'use strict';
/**
 * z-general-intake.cjs — B6-INGEST-002. The general bureau-report intake path: unfamiliar layouts are
 * admitted, unrelated vs unreadable are distinct, facts carry locations and raw values, dates are never
 * borrowed, and the general factual check runs while statutory checks stay bound to their own presentations.
 */

const generalIntake = require('../../general-intake.cjs');
const formats = require('../../formats.cjs');
const { makeSyntheticModel } = require('../../../../internal-validation/ca-ns-last-payment-six-year/document-model.cjs');
const { buildPdf } = require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');

function uploadBody(bytes, filename) {
  return { originalFilename: filename, declaredBytes: bytes.length, mimeType: 'application/pdf', contentBase64: bytes.toString('base64') };
}
function bureauModel(lines) { return makeSyntheticModel({ pages: [lines] }); }

async function run(t, check) {
  const evidence = {};

  check.equal(generalIntake.normalizePrintedDate('2026-06-12').normalized, '2026-06-12', 'ISO date resolves');
  check.equal(generalIntake.normalizePrintedDate('2026/06/12').normalized, '2026-06-12', 'YYYY/MM/DD resolves');
  check.equal(generalIntake.normalizePrintedDate('Jun 12, 2026').normalized, '2026-06-12', 'Mon D, YYYY resolves');
  check.equal(generalIntake.normalizePrintedDate('06/12/2026', 'US').normalized, '2026-06-12', 'an explicit US convention MM/DD resolves');
  const noConv = generalIntake.normalizePrintedDate('06/12/2026');
  check.equal(noConv.normalized, null, 'an ambiguous numeric date without a convention resolves nothing');
  check.deepEqual(noConv.interpretations, ['2026-06-12', '2026-12-06'], 'and both interpretations are preserved');
  check.equal(generalIntake.normalizePrintedDate('13/05/2021').normalized, '2021-05-13', 'a day above 12 is unambiguous DD/MM');
  check.equal(generalIntake.normalizePrintedDate('05/13/2021').normalized, '2021-05-13', 'a month above 12 is unambiguous MM/DD');
  check.equal(generalIntake.normalizePrintedDate('Jun 2026').precision, 'MONTH', 'month-only is partial');
  check.equal(generalIntake.normalizePrintedDate('not a date').normalized, null, 'unrecognised is not invented');

  /* GAP-INGEST-004: full month names. */
  check.equal(generalIntake.normalizePrintedDate('January 5, 2021').normalized, '2021-01-05', 'a full month name resolves');
  check.equal(generalIntake.normalizePrintedDate('September 3, 2020').normalized, '2020-09-03', 'a 9-letter month name resolves');
  check.equal(generalIntake.normalizePrintedDate('December 31, 2019').normalized, '2019-12-31', 'a full month with day resolves');

  /* GAP-INGEST-006: partial numeric month/year is a MONTH precision, never a day. */
  check.equal(generalIntake.normalizePrintedDate('02/2021').normalized, '2021-02', 'MM/YYYY is a month');
  check.equal(generalIntake.normalizePrintedDate('02/2021').precision, 'MONTH', 'and it is marked MONTH precision');
  check.equal(generalIntake.normalizePrintedDate('2021/02').normalized, '2021-02', 'YYYY/MM is a month too');

  /* GAP-INGEST-005: an ambiguous numeric date keeps the convention result but records the ambiguity. */
  const amb = generalIntake.normalizePrintedDate('05/06/2021', 'US');
  check.equal(amb.normalized, '2021-05-06', 'US convention resolves the value');
  check.equal(amb.ambiguous, true, 'and the other interpretation is recorded as ambiguous');
  check.equal(amb.alternative, '2021-06-05', 'with the alternative day/month assignment');
  const unambiguous = generalIntake.normalizePrintedDate('13/05/2021');
  check.equal(unambiguous.normalized, '2021-05-13', 'a day above 12 forces DD/MM');
  check.ok(!unambiguous.ambiguous, 'and is not ambiguous');
  const same = generalIntake.normalizePrintedDate('02/02/2021');
  check.ok(!same.ambiguous, 'an equal day/month is not ambiguous');

  /* GAP-INGEST-004: ordinal suffixes, day-first forms, leap years and invalid dates. */
  check.equal(generalIntake.normalizePrintedDate('January 5th, 2021').normalized, '2021-01-05', 'a month-first ordinal resolves');
  check.equal(generalIntake.normalizePrintedDate('5th January 2021').normalized, '2021-01-05', 'a day-first ordinal resolves');
  check.equal(generalIntake.normalizePrintedDate('21st December 2020').normalized, '2020-12-21', 'a 21st ordinal resolves');
  check.equal(generalIntake.normalizePrintedDate('February 29, 2020').normalized, '2020-02-29', 'a leap day resolves');
  check.equal(generalIntake.normalizePrintedDate('February 29, 2021').normalized, null, 'a non-leap February 29 is invalid');
  check.equal(generalIntake.normalizePrintedDate('February 30, 2021').normalized, null, 'an impossible day is invalid');

  /* GAP-INGEST-005: the numeric convention comes from the report's own evidence, not the jurisdiction. */
  check.equal(generalIntake.detectConvention([{ lines: [{ text: '13/05/2021' }] }]), 'DDMM', 'a day above 12 evidences day-first');
  check.equal(generalIntake.detectConvention([{ lines: [{ text: '05/13/2021' }] }]), 'US', 'a month above 12 evidences month-first');
  check.equal(generalIntake.detectConvention([{ lines: [{ text: '05/06/2021' }] }]), null, 'an all-ambiguous date evidences no convention');

  const general = bureauModel(['Equifax  Consumer Credit Report', 'Prepared Date: June 12, 2026', 'Account  Balance $1,240  Opened 01/01/2020']);
  check.equal(generalIntake.detect(general).outcome, 'GENERAL', 'bureau plus content is GENERAL');

  const bureauOnly = bureauModel(['Equifax', 'Trusted credit information since 1899']);
  check.equal(generalIntake.detect(bureauOnly).outcome, 'UNRELATED', 'bureau branding alone is UNRELATED');
  check.equal(generalIntake.detect(bureauOnly).reason, 'BUREAU_IDENTITY_BUT_NO_CREDIT_REPORT_CONTENT', 'names the missing content');

  const unrelated = bureauModel(['This is a utility bill for June.', 'Amount due: $42.00']);
  check.equal(generalIntake.detect(unrelated).outcome, 'UNRELATED', 'no bureau is UNRELATED');

  const notPdf = makeSyntheticModel({ not_a_pdf: true, pages: [] });
  check.equal(generalIntake.detect(notPdf).outcome, 'UNREADABLE', 'a non-PDF is UNREADABLE, not unrelated');

  const ext = generalIntake.extract(general, { country: 'US' });
  check.equal(ext.outcome, 'GENERAL', 'general extractor admits');
  check.equal(ext.bureau, 'Equifax', 'reads the bureau');
  check.equal(ext.reference_date.normalized, '2026-06-12', 'reads the report date');
  check.equal(ext.records.length, 1, 'one account entry read');
  check.equal(ext.records[0].status, 'RESOLVED', 'with a resolved date');
  const dateFields = Object.values(ext.records[0].printed).filter((f) => f.kind === 'date' && f.state === 'VALUE');
  check.ok(dateFields.length >= 1, 'a date field was read');
  check.equal(dateFields[0].raw, '01/01/2020', 'raw value preserved');

  const twoRecords = bureauModel([
    'TransUnion  Consumer Disclosure',
    'Report Date: 03/14/2025',
    'Creditor A  Balance $100  Opened 01/01/2020',
    'Creditor B  Balance $200  Opened 02/02/2021'
  ]);
  const twoExt = generalIntake.extract(twoRecords, { country: 'US' });
  check.equal(twoExt.bureau, 'TransUnion', 'a different bureau is read');
  check.equal(twoExt.records.length, 2, 'two entries stay separate');

  const detection = formats.detectSupportedFormat(general, { country: 'US' });
  check.equal(detection.supported, true, 'shared detector admits the general report');
  check.equal(detection.presentation_id, generalIntake.GENERAL_PRESENTATION_ID, 'as the general presentation');
  check.equal(detection.admission_path, generalIntake.GENERAL_ADMISSION_PATH, 'through the plausibility path');

  const unrelatedDetection = formats.detectSupportedFormat(unrelated, { country: 'US' });
  check.equal(unrelatedDetection.supported, false, 'unrelated is refused');
  check.equal(unrelatedDetection.refusal_reason, 'UNRELATED_DOCUMENT', 'with the UNRELATED reason');

  /* ==== HTTP end-to-end ==== */
  const owner = await t.account('owner-general-intake@example.test');
  const caseRow = (await t.request('POST', '/api/cases', { token: owner.token, body: { country: 'US', region: 'US-NY' } })).json.case;

  const generalPdf = buildPdf({ pages: [{ lines: [
    'Equifax  EFX US CONSUMER DISCLOSURE',
    'Consumer Credit Report  Prepared Date: June 12, 2026',
    'ACCOUNT SUMMARY',
    'Pioneer Bankcard  Credit Card  04/07/2023  06/12/2026  Current  $1,240'
  ] }] });
  const uploaded = await t.request('POST', `/api/cases/${caseRow.case_id}/files`, { token: owner.token, body: uploadBody(generalPdf, 'general-report.pdf') });
  check.equal(uploaded.status, 201, 'a plausible bureau report uploads');
  check.equal(uploaded.json.receipt.format_detection.supported, true, 'detected as supported');
  check.equal(uploaded.json.receipt.format_detection.presentation_id, generalIntake.GENERAL_PRESENTATION_ID, 'as a general report');

  await t.request('POST', `/api/cases/${caseRow.case_id}/evaluate`, { token: owner.token });
  const view = (await t.request('GET', `/api/cases/${caseRow.case_id}`, { token: owner.token })).json.view;
  check.equal(view.result.assessment.performed_by_kind.STATUTORY_RULE_COMPARISON, 0, 'no statutory check on the general report');
  check.ok(view.result.checks_not_run.length > 0, 'statutory checks are named as not run');
  check.ok(view.result.assessment.factual_summary, 'the general factual surface ran');

  const logoCase = (await t.request('POST', '/api/cases', { token: owner.token, body: { country: 'CA', region: 'CA-NS' } })).json.case;
  const logoPdf = buildPdf({ pages: [{ lines: ['Equifax', 'Trusted credit information since 1899'] }] });
  const refused = await t.request('POST', `/api/cases/${logoCase.case_id}/files`, { token: owner.token, body: uploadBody(logoPdf, 'logo-only.pdf') });
  check.equal(refused.status, 201, 'the upload is stored');
  check.equal(refused.json.receipt.format_detection.supported, false, 'but not a supported report');
  check.equal(refused.json.receipt.format_detection.refusal_reason, 'UNRELATED_DOCUMENT', 'refused as unrelated');

  /* B6-INGEST-003: image containers reach OCR + general intake, not a metadata refusal. */
  const uploads = require('../../uploads.cjs');
  check.equal(uploads.detectContainerFromBytes(Buffer.from('%PDF-1.4')), 'PDF', 'PDF magic is detected');
  check.equal(uploads.detectContainerFromBytes(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), 'IMAGE', 'PNG magic is detected');
  check.equal(uploads.detectContainerFromBytes(Buffer.from([0xff, 0xd8, 0xff, 0xe0])), 'IMAGE', 'JPEG magic is detected');
  check.equal(uploads.detectContainerFromBytes(Buffer.from('hello')), 'OTHER', 'other bytes are neither');

  const imageCase = (await t.request('POST', '/api/cases', { token: owner.token, body: { country: 'US', region: 'US-NY' } })).json.case;
  const tinyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  const imageUpload = await t.request('POST', `/api/cases/${imageCase.case_id}/files`, {
    token: owner.token,
    body: { originalFilename: 'scan.png', declaredBytes: tinyPng.length, mimeType: 'image/png', contentBase64: tinyPng.toString('base64') }
  });
  check.equal(imageUpload.status, 201, 'an image upload is accepted and reaches OCR/general intake, not a metadata refusal');
  check.equal(imageUpload.json.receipt.format_detection.supported, false, 'a blank 1x1 image has no readable bureau, so it is not a supported report');

  /* B6-INGEST-004: assessment-relevant fields connect the existing statutory checks. */
  const evaluation = require('../../evaluation.cjs');
  const usAdverse = makeSyntheticModel({ pages: [['Experian  Consumer Credit Report', 'Report Date: June 12, 2026', 'Account 30 days past due as of Jun 2015']] });
  const usAdverseExt = formats.extractWithSharedAdapter(usAdverse, { mode: 'REPORT', country: 'US' });
  check.equal(usAdverseExt.records.length, 1, 'a general US report yields a reported-account record');
  check.equal(usAdverseExt.records[0].kind, 'REPORTED_ACCOUNT', 'with the reported-account kind');
  const usAdverseEval = evaluation.evaluateCase({ country: 'US', region: 'US-NY', extraction: usAdverseExt });
  check.ok(usAdverseEval.results.some((r) => r.check.adapter_id === 'FCRA-605A-5-US-NATIONAL-7Y'), 'FCRA § 605(a)(5) now runs on a general US report with an adverse date');

  const auClosed = makeSyntheticModel({ pages: [['Equifax  Consumer Credit File', 'Report Date: 12 June 2026', 'Credit Provider X  Closed 15/03/2024']] });
  const auClosedExt = formats.extractWithSharedAdapter(auClosed, { mode: 'REPORT', country: 'AU' });
  check.equal(auClosedExt.records.length, 1, 'a general AU report yields a liability record');
  const auClosedEval = evaluation.evaluateCase({ country: 'AU', region: 'AU-NSW', extraction: auClosedExt });
  check.ok(auClosedEval.results.some((r) => r.check.adapter_id === 'AU-PRIVACY-ACT-1988-S20W-ITEM1-LIABILITY-2Y'), 'AU Privacy Act s.20W item 1 now runs on a general AU report with a closure date');

  /* AU enquiry (item 3) and default/overdue (item 4) — positive, negative and missing-fact cases. */
  const auEnquiry = makeSyntheticModel({ pages: [['Equifax  Consumer Credit File', 'Report Date: 12 June 2026', 'Enquiry  Enquiry Date 20/05/2022']] });
  const auEnquiryExt = formats.extractWithSharedAdapter(auEnquiry, { mode: 'REPORT', country: 'AU' });
  check.equal(auEnquiryExt.records[0].kind, 'CREDIT_ENQUIRY', 'a general AU enquiry yields a credit-enquiry record');
  const auEnquiryEval = evaluation.evaluateCase({ country: 'AU', region: 'AU-NSW', extraction: auEnquiryExt });
  check.ok(auEnquiryEval.results.some((r) => r.check.adapter_id === 'AU-PRIVACY-ACT-1988-S20W-ITEM3-ENQUIRY-5Y' && r.machine.state === 'EVALUATED'), 'AU s.20W item 3 (enquiry, 5y) now evaluates on a general AU report');

  const auOverdue = makeSyntheticModel({ pages: [['Equifax  Consumer Credit File', 'Report Date: 12 June 2026', 'Overdue Account  Original Listing 15/03/2021']] });
  const auOverdueExt = formats.extractWithSharedAdapter(auOverdue, { mode: 'REPORT', country: 'AU' });
  const auOverdueEval = evaluation.evaluateCase({ country: 'AU', region: 'AU-NSW', extraction: auOverdueExt });
  check.ok(auOverdueEval.results.some((r) => r.check.adapter_id === 'AU-PRIVACY-ACT-1988-S20W-ITEM4-DEFAULT-5Y' && r.machine.state === 'EVALUATED'), 'AU s.20W item 4 (default, 5y) now evaluates on a general AU report');

  const auClean = makeSyntheticModel({ pages: [['Equifax  Consumer Credit File', 'Report Date: 12 June 2026', 'Account  Balance $100  Opened 01/01/2020']] });
  const auCleanExt = formats.extractWithSharedAdapter(auClean, { mode: 'REPORT', country: 'AU' });
  const auCleanEval = evaluation.evaluateCase({ country: 'AU', region: 'AU-NSW', extraction: auCleanExt });
  check.equal(auCleanEval.results.length, 0, 'a clean general AU report runs no AU statutory comparison (negative case)');

  const auNoOriginal = makeSyntheticModel({ pages: [['Equifax  Consumer Credit File', 'Report Date: 12 June 2026', 'Overdue Account  Current Listing 01/01/2024']] });
  const auNoOriginalExt = formats.extractWithSharedAdapter(auNoOriginal, { mode: 'REPORT', country: 'AU' });
  const auNoOriginalEval = evaluation.evaluateCase({ country: 'AU', region: 'AU-NSW', extraction: auNoOriginalExt });
  check.equal(auNoOriginalEval.results.some((r) => r.check.adapter_id === 'AU-PRIVACY-ACT-1988-S20W-ITEM4-DEFAULT-5Y' && r.machine.state === 'EVALUATED'), false, 'an overdue record without an original-listing date is NOT aged from a current-listing date (missing-fact case)');

  evidence.general = { bureau: ext.bureau, records: ext.records.length, reference_date: ext.reference_date.normalized };
  evidence.refusals = { unrelated: true, bureau_only: true };
  return evidence;
}

module.exports = { run, id: 'z-general-intake', title: 'General bureau-report intake: plausibility admission, usable extraction, unrelated vs unreadable refusals, partial assessment' };
