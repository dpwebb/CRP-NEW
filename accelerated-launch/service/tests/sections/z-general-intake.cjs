'use strict';
/**
 * z-general-intake.cjs — B6-INGEST-002. The general bureau-report intake path: unfamiliar layouts are
 * admitted, unrelated vs unreadable are distinct, facts carry locations and raw values, dates are never
 * borrowed, and the general factual check runs while statutory checks stay bound to their own presentations.
 */

const generalIntake = require('../../general-intake.cjs');
const formats = require('../../formats.cjs');
const commonErrors = require('../../common-errors.cjs');
const issues = require('../../issues.cjs');
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

  const pairedHeading = makeSyntheticModel({ pages: [[
    'Equifax Consumer Credit Report', 'Report Date: 2026/01/10', 'Accounts - Revolving',
    'Sample Motor Finance', 'Account', 'Number', '****4130', 'Balance', '$100 CAD',
    'Past Due', '$125 CAD', 'Accounts - Revolving (continued)', 'Example Community Bank',
    'Account', 'Number', '****6486', 'Balance', '$0 CAD'
  ]] });
  const pairedExtraction = formats.extractWithSharedAdapter(pairedHeading, { mode: 'REPORT', country: 'CA' });
  check.equal(pairedExtraction.records[0].facts['account.reported_identity'], 'SAMPLE MOTOR FINANCE', 'plain creditor heading belongs to the first account');
  check.equal(pairedExtraction.records[1].facts['account.reported_identity'], 'EXAMPLE COMMUNITY BANK', 'continued heading starts a separate account');
  check.equal(pairedExtraction.records[0].facts['account.balance'], 100, 'complete CAD balance resolves');
  check.equal(pairedExtraction.records[0].facts['account.pastDueAmount'], 125, 'complete CAD past-due amount resolves');
  check.equal(pairedExtraction.records[1].facts['account.balance'], 0, 'the second account keeps its own balance');
  const accountDateCaptions = [
    { country: 'CA', header: 'Equifax Canada Consumer Credit Report', date: '2026/06/22', caption: 'Last Reported: 2026/07/22' },
    { country: 'GB', header: 'Equifax UK Statutory Credit Report', date: '22/06/2026', caption: 'As of: 23/06/2026' },
    { country: 'AU', header: 'Equifax Australia Consumer Credit Report', date: '22/06/2026', caption: 'Last Updated: 23/06/2026' },
    { country: 'US', header: 'Equifax US Credit File Disclosure', date: '07/13/2026', caption: 'Last Updated Date: 08/14/2026' }
  ];
  for (const sample of accountDateCaptions) {
    const model = makeSyntheticModel({ pages: [[sample.header, `Report Date: ${sample.date}`,
      'Creditor Name: Sample Motor Finance', sample.caption]] });
    const result = formats.extractWithSharedAdapter(model, { mode: 'REPORT', country: sample.country });
    check.ok(Boolean(result.records[0]?.facts['reportedAccount.reportedDate']),
      `${sample.country} account-owned ${sample.caption.split(':')[0]} is source-linked as a reporting date`);
  }

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
  check.equal(ext.extraction_coverage.records.length, 1, 'internal coverage inventories the extracted account');
  check.ok(ext.extraction_coverage.records[0].fact_fields.length > 0, 'internal coverage names recovered fact fields');
  check.equal(JSON.stringify(ext.extraction_coverage).includes('1,240'), false, 'coverage inventory does not copy printed amounts');
  const unbound = generalIntake.extractionCoverage([{ page: 1 }], ext.records,
    [{ page: 1, cells: [{ period: '2025-01' }] }], ['UNBOUND']);
  check.equal(unbound.unbound_history_grids, 1, 'a visible but unbound history grid remains measurable');
  check.equal(unbound.history_grids[0].record_index, null, 'an unbound grid is never assigned to a nearby account');
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

  const missingPaymentSeed = bureauModel([
    'TransUnion Canada Consumer Disclosure', 'Report Date: 2026-01-10', 'Account Information',
    'Creditor Name: Example Community Bank', 'Account Number: ****2952',
    'Opened Date: 2022-03-15', 'Reported Date: 2026-06-22', 'Status: Current',
    'Creditor Name: Sample Motor Finance', 'Account Number: ****9819',
    'Opened Date: 2021-11-04', 'Reported Date: 2026-06-22',
    'Last Payment Date: 2025-12-15', 'Status: Closed'
  ]);
  const missingPaymentExt = generalIntake.extract(missingPaymentSeed, { country: 'CA' });
  check.equal(missingPaymentExt.records.length, 2, 'seeded account sections remain separate');
  check.deepEqual(missingPaymentExt.records.map((r) => r.facts['account.reported_identity']),
    ['EXAMPLE COMMUNITY BANK', 'SAMPLE MOTOR FINANCE'], 'each account retains its own identity');
  check.ok(!missingPaymentExt.records[0].facts['tradeline.lastPaymentDate'],
    'a missing first-account payment date is never borrowed from the next account');
  check.equal(missingPaymentExt.records[1].facts['tradeline.lastPaymentDate'], '2025-12-15',
    'the printed second-account payment date stays with that account');
  check.ok(missingPaymentExt.records.every((r) => Object.values(r.printed || {}).some((p) =>
    p.kind === 'date' && p.label === 'REPORTED DATE' && p.normalized === '2026-06-22')),
  'both accounts retain their printed reported dates');
  const dated = commonErrors.runCommonErrorChecks({ extraction: missingPaymentExt });
  const future = dated.performed.find((c) => c.check_id === 'COMMON-ERROR-ENTRY-REPORTED-AFTER-REPORT-DATE');
  check.equal(future.state, 'POTENTIAL_ISSUE', 'future account reported dates are detected');
  check.deepEqual(future.source_records.map((r) => r.record_index), [1, 2],
    'the detection preserves both account identities');
  const datedIssues = issues.issuesFor({ extraction: missingPaymentExt,
    evaluation: { region: 'CA-NS', presentation: 'GENERAL-BUREAU-REPORT', results: [], common_errors: dated } });
  const futureIssues = datedIssues.filter((i) => i.check_id === future.check_id);
  check.equal(futureIssues.length, 2, 'both date conflicts reach the issue path');
  check.ok(futureIssues.every((i) => i.eligible && i.source_facts.length === 2),
    'each issue remains selectable with both report and account date sources');
  const ordinaryDates = generalIntake.extract(bureauModel([
    'TransUnion Canada Consumer Disclosure', 'Report Date: 2026-07-10',
    'Creditor Name: Example Community Bank', 'Opened Date: 2022-03-15',
    'Reported Date: 2026-06-22', 'Status: Current'
  ]), { country: 'CA' });
  const ordinaryCheck = commonErrors.runCommonErrorChecks({ extraction: ordinaryDates }).performed
    .find((c) => c.check_id === future.check_id);
  check.equal(ordinaryCheck.state, 'NOT_DETECTED', 'a reported date before the report date stays clean');

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
  check.equal(JSON.stringify(uploaded.json).includes('extraction_coverage'), false, 'private coverage is not exposed in the upload receipt');

  await t.request('POST', `/api/cases/${caseRow.case_id}/evaluate`, { token: owner.token });
  const view = (await t.request('GET', `/api/cases/${caseRow.case_id}`, { token: owner.token })).json.view;
  check.equal(view.result.assessment.performed_by_kind.STATUTORY_RULE_COMPARISON, 0, 'no statutory check on the general report');
  check.ok(view.result.checks_not_run.length > 0, 'statutory checks are named as not run');
  check.ok(view.result.assessment.factual_summary, 'the general factual surface ran');

  const dateCase = (await t.request('POST', '/api/cases', { token: owner.token,
    body: { country: 'CA', region: 'CA-NS' } })).json.case;
  const datePdf = buildPdf({ pages: [{ lines: [
    'TransUnion Canada Consumer Disclosure', 'Report Date: 2026-01-10', 'Account Information',
    'Creditor Name: Fictional Cedar Bank', 'Account Number: ****2952',
    'Opened Date: 2022-03-15', 'Reported Date: 2026-06-22', 'Status: Current',
    'Creditor Name: Fictional Motor Finance', 'Account Number: ****9819',
    'Opened Date: 2021-11-04', 'Reported Date: 2025-12-15', 'Status: Closed'
  ] }] });
  const dateEndpoint = `/api/cases/${dateCase.case_id}`;
  const dateUpload = await t.request('POST', dateEndpoint + '/files', { token: owner.token,
    body: uploadBody(datePdf, 'fictional-reported-date.pdf') });
  const dateEvaluation = await t.request('POST', dateEndpoint + '/evaluate', { token: owner.token });
  check.ok(dateUpload.status === 201 && dateEvaluation.status === 201,
    'fictional native report reaches the ordinary upload and assessment path');
  const datePacket = (await t.request('GET', dateEndpoint + '/packet', { token: owner.token })).json.view;
  const dateChoices = datePacket.eligible_issues.filter((i) => i.check_kind === future.label);
  check.equal(dateChoices.length, 1, 'only the future-dated account is offered for this violation');
  check.ok(dateChoices[0]?.eligible && dateChoices[0]?.consumer_label === 'VIOLATION'
    && dateChoices[0]?.source_facts?.length === 2,
  'the selectable violation retains report and account date evidence');
  const dateChoice = await t.request('POST', dateEndpoint + '/packet/select', { token: owner.token,
    body: { issue_ids: dateChoices.map((i) => i.issue_id) } });
  await t.request('POST', dateEndpoint + '/packet/correspondence', { token: owner.token,
    body: { correspondence: { consumer_name: 'Fictional Consumer', contact: 'fictional@example.test' } } });
  await t.preparePostalPacket(owner, dateCase.case_id);
  const dateApproval = await t.request('POST', dateEndpoint + '/packet/approve', { token: owner.token });
  const dateDownload = await t.request('GET', dateEndpoint + '/packet-download', { token: owner.token });
  check.ok(dateChoice.status === 200 && dateApproval.status === 200 && dateDownload.status === 200,
    'consumer selection, approval and complete packet download succeed for this violation');
  if (dateDownload.status === 200) {
    const { PDFDocument } = require('../../pdf-vendor/pdf-lib-1.17.1.min.js');
    const document = await PDFDocument.load(dateDownload.bytes);
    const letter = document.getForm().getFields().filter((f) => /^CRP_letter_page_\d+$/.test(f.getName()))
      .map((f) => f.getText()).join('\n');
    check.ok(letter.includes('FICTIONAL CEDAR BANK') && letter.includes('June 22, 2026')
      && !letter.includes('FICTIONAL MOTOR FINANCE'),
    'the editable letter names the selected account and excludes the benign account');
  }

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

  /* Enquiry extraction remains available, but the out-of-checklist retention limb is retired. */
  const auEnquiry = makeSyntheticModel({ pages: [['Equifax  Consumer Credit File', 'Report Date: 12 June 2026', 'Enquiry  Enquiry Date 20/05/2022']] });
  const auEnquiryExt = formats.extractWithSharedAdapter(auEnquiry, { mode: 'REPORT', country: 'AU' });
  check.equal(auEnquiryExt.records[0].kind, 'CREDIT_ENQUIRY', 'a general AU enquiry yields a credit-enquiry record');
  const auEnquiryEval = evaluation.evaluateCase({ country: 'AU', region: 'AU-NSW', extraction: auEnquiryExt });
  check.ok(!auEnquiryEval.results.some((r) => r.check.adapter_id === 'AU-PRIVACY-ACT-1988-S20W-ITEM3-ENQUIRY-5Y'),
    'AU enquiry retention is not an active common-error statutory comparison');

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
