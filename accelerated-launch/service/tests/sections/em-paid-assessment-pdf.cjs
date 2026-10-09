'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { renderAssessmentPdf } = require('../../assessment-pdf.cjs');
const { renderPacketPdf } = require('../../packet-pdf.cjs');
const journey = require('../../journey.cjs');
const { pdfText, comparableText } = require('../packet-pdf-assertions.cjs');

const issue = (overrides = {}) => ({ issue_id: 'private-issue-id', check_id: 'COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY',
  confidence: 'PROBABLE', consumer_label: 'VIOLATION', eligible: true,
  account_identity: { name: 'Élodie & Müller Collections' }, account_number_in_report: 1,
  record_kind: 'collection entry', check_kind: 'Conflicting account dates',
  explanation: 'The account opened after it was closed. Both dates are printed on your report.',
  uncertainty: 'Check whether this entry is still on your current credit file.',
  rule_assessment: { requirement: 'An account cannot close before it opens.' },
  source_facts: [
    { source_field: 'Date Opened', raw_value: '01 June 2020', location: { page: 2, line: 7 } },
    { source_field: 'Date Closed', raw_value: '01 June 2019', location: { page: 2, line: 8 } },
    { source_field: 'Member Number', raw_value: 'MEMBER-private-key', privacy_redacted: true, location: { page: 2, line: 9 } }
  ], ...overrides });
const rendering = (items) => ({ jurisdiction: { country: 'CA', region: 'CA-NS' },
  assessed_on: '2026-10-08', policy: { digest: 'private-evidence-policy', policy_id: 'internal-policy-id' },
  issues: items, checks_not_run: [{ reason: 'private-unrun-reason' }], unresolved_report_fields: [{ field: 'private-unresolved-field' }] });
const quotes = { monthly: { regular_cents: 795, credit_cents: 595, first_invoice_cents: 200, renewal_cents: 795, currency: 'cad', allowed: true, eligible: true },
  annual: { regular_cents: 7950, credit_cents: 595, first_invoice_cents: 7355, renewal_cents: 7950, currency: 'cad', allowed: true, eligible: true } };

async function run(t, check) {
  const report = rendering([issue(), issue({ issue_id: 'private-information-id', basis_type: 'LIMITATION_ASSESSMENT',
    consumer_label: 'INFORMATION', limitation_concern: true, check_kind: 'Court time limits',
    explanation: 'The printed debt date is outside the usual court claim period.', source_facts: [],
    request_wording: 'PRIVATE RETIRED COURT QUESTION', rule_assessment: null }),
  issue({ issue_id: 'private-review-id', consumer_label: null, confidence: 'POTENTIAL', eligible: false,
    check_kind: 'Similar accounts to review', rule_assessment: null, explanation: 'Compare these similar entries with your own records.' })]);
  const original = JSON.stringify(report);
  const pdf = renderAssessmentPdf(report, '2026-10-08T23:59:59Z', { plan_code: 'report_once', upgrade_quotes: quotes });
  const read = pdfText(pdf.bytes), text = comparableText(read);
  check.ok(Buffer.isBuffer(pdf.bytes) && pdf.bytes.subarray(0, 8).toString() === '%PDF-1.7', 'the download is a real PDF with an embedded Unicode font');
  check.ok(text.includes('CREDIT REGULATOR PRO') && text.includes('Your credit report review'), 'the paid report has the application brand and a plain title');
  check.ok(text.includes('Élodie & Müller Collections'), 'accented printed collection names survive actual PDF extraction');
  check.ok(text.includes('VIOLATION') && !/probable violation|potential violation|PROBABLE_VIOLATION/.test(text), 'breaches use the one approved consumer term');
  check.ok(text.includes('Date Opened - printed "01 June 2020" (page 2, line 7)')
    && text.includes('Date Closed - printed "01 June 2019" (page 2, line 8)'), 'both own report readings retain separate exact source locations');
  check.ok(text.includes('Reporting rule: An account cannot close before it opens.'), 'the PDF names the breached reporting requirement');
  check.ok(text.includes('Why it merits attention: Check whether this entry is still on your current credit file.'), 'material uncertainty remains visible');
  check.ok(text.includes('Member number matched from the report (page 2, line 9)'), 'redacted matching evidence is located without disclosing its private key');
  check.ok(!/COMMON-ERROR-|MEMBER-private-key|private-issue-id|internal-policy-id|private-evidence-policy|private-unrun-reason|private-unresolved-field/.test(text), 'internal identifiers and incomplete-check reasons never appear in the PDF');
  check.ok(text.includes('INFORMATION') && text.includes('It is not a reason to dispute the entry with the credit bureau.'), 'court deadlines stay consumer information outside packet requests');
  check.ok(!text.includes('PRIVATE RETIRED COURT QUESTION'), 'the assessment PDF does not ask the bureau about litigation exceptions');
  check.ok(text.includes('Similar accounts to review') && text.includes('REVIEW'), 'weaker-evidence review entries are retained without turning them into violations');
  check.ok(text.includes('Build your dispute packet') && text.includes('print and mail') && text.includes('Check your next report')
    && text.includes('Keep your reports together'), 'subscription value covers selected packets, new reports and history in simple words');
  check.ok(text.includes('Monthly: CAD 2.00 for your first payment after CAD 5.95 credit. Then CAD 7.95 a month.')
    && text.includes('Yearly: CAD 73.55 for your first payment after CAD 5.95 credit. Then CAD 79.50 a year.'), 'the one-off PDF distinguishes authoritative first-payment credit from renewal price');
  check.ok(text.includes('Your unused payments for cheaper plans count toward an upgrade.'), 'the owner-approved accumulated credit benefit is stated');
  check.ok(!/not legal advi[cs]e|guarantee|raise your score|delete the debt/i.test(text), 'the report contains no prohibited disclaimer or result promise');
  check.ok(text.includes('Assessed on: 2026-10-08') && text.includes('Report prepared: 2026-10-08'), 'the persisted check date is distinct from the report preparation date');
  check.equal(JSON.stringify(report), original, 'PDF creation leaves the saved assessment, facts and issue ordering unchanged');
  check.ok(pdf.layout.some(page => page.some(item => item.type === 'link' && item.url === 'https://creditregulatorpro.com/')), 'the simple return-to-account link is clickable in the PDF');

  const empty = pdfText(renderAssessmentPdf(rendering([]), '2026-10-08', { plan_code: 'report_once' }).bytes);
  check.ok(empty.includes('No findings available.') && !/no violations|fully compliant/i.test(empty), 'an empty assessment does not claim compliance');
  check.ok(!/CAD \d/.test(empty), 'without a server quote the PDF asks the consumer to view Plans without inventing a price');
  const subscriber = comparableText(pdfText(renderAssessmentPdf(rendering([issue()]), '2026-10-08', { plan_code: 'monthly' }).bytes));
  check.ok(subscriber.includes('Your subscription includes dispute packets.') && subscriber.includes('Your next step'), 'subscriber downloads give usable next steps for features already held');
  check.ok(!subscriber.includes('Sign in and open Plans to see your credit and upgrade price.'), 'a subscriber is not asked to repurchase their subscription');
  const zeroQuote = comparableText(pdfText(renderAssessmentPdf(rendering([issue()]), '2026-10-08', { plan_code: 'report_once',
    upgrade_quotes: { monthly: { ...quotes.monthly, credit_cents: 795, first_invoice_cents: 0 } } }).bytes));
  check.ok(zeroQuote.includes('Monthly: CAD 0.00 for your first payment after CAD 7.95 credit.'), 'full first-bill credit never becomes a negative PDF price');
  const merged = comparableText(pdfText(renderAssessmentPdf(rendering([issue({ supported_bases: [{
    citation: 'Published report guide, payment history', rule_source_version: '2026-07',
    uncertainty: 'Verify which reporting month the bureau used.',
    source_facts: [{ source_field: 'Published payment-history order', normalized_value: 'most recent first',
      definition_source: { publisher: 'Fictional Bureau', title: 'Report guide', version: '2026-07' },
      location: { source_kind: 'EXTERNAL_REPORT_PERIOD_DEFINITION', section: 'Payment-history dates', url: 'https://example.test/report-guide' } }]
  }] })]), '2026-10-08').bytes));
  check.ok(merged.includes('Additional supporting rule: Published report guide, payment history (version 2026-07)')
    && merged.includes('Note for this rule: Verify which reporting month the bureau used.'), 'merged supporting rules retain their own version and material uncertainty');
  check.ok(merged.includes('Published definition: Published payment-history order - most recent first.')
    && merged.includes('Fictional Bureau, Report guide (version 2026-07). Payment-history dates. https://example.test/report-guide'), 'published reading definitions remain separate and sourced in the paid PDF');

  const large = rendering(Array.from({ length: 14 }, (_, index) => issue({ issue_id: 'private-long-' + index,
    account_identity: { name: `Account ${index + 1}: ` + 'Élodie Northern Collection Agency '.repeat(12) },
    source_facts: [{ source_field: 'Description', raw_value: `FACT-${index + 1}-START ` + 'A lengthy printed account detail '.repeat(85) + ` FACT-${index + 1}-END`, location: { page: index + 1, line: 17 } }] })));
  const largePdf = renderAssessmentPdf(large, '2026-10-08', { plan_code: 'report_once', upgrade_quotes: quotes });
  const largeText = comparableText(pdfText(largePdf.bytes));
  check.ok(largePdf.page_count > 5, 'long evidence uses as many printable pages as needed');
  check.ok(Array.from({ length: 14 }, (_, index) => [`FACT-${index + 1}-START`, `FACT-${index + 1}-END`]).flat().every(marker => largeText.includes(marker)), 'every long evidence value survives from beginning to end without truncation');
  const bodyText = largePdf.layout.flat().filter(item => item.type === 'text' && item.y > 55);
  check.ok(bodyText.every(item => item.y >= 72 && item.y <= 754 && item.x >= 48 && item.x + item.width <= 564.01), 'long titles and facts stay inside page margins and clear the footer');
  check.ok(largePdf.layout.every((page, index) => page.some(item => item.text === `Page ${index + 1} of ${largePdf.page_count}`)), 'every continuation page has its correct printed page number');

  // Actual HTTP entitlement/payment/download, using a fictional report and a verified test-provider event.
  const owner = await t.unpaidAccount('em-paid-pdf-owner@example.test');
  const caseId = await t.assessedCase(owner);
  const endpoint = `/api/cases/${caseId}/report-download`;
  check.equal((await t.request('GET', endpoint, { token: owner.token })).status, 402, 'a PDF is not available until the owned assessment is paid for');
  await t.pay(owner, 'report_once', caseId);
  const response = await t.request('GET', endpoint, { token: owner.token });
  check.equal(response.status, 200, 'the signed-event one-report purchase unlocks the PDF');
  check.equal(response.headers.get('content-type'), 'application/pdf', 'the real endpoint serves the PDF media type');
  check.ok(/attachment; filename="CRP-credit-report-review-.*\.pdf"/.test(response.headers.get('content-disposition')), 'the real endpoint supplies a printable PDF filename');
  check.ok(response.bytes.subarray(0, 5).toString() === '%PDF-' && /Creditor A/i.test(response.text), 'real downloaded bytes carry the owned report creditor and PDF structure');
  check.ok(/Date opened - printed/.test(response.text) && /Date closed - printed/.test(response.text), 'actual report evidence uses readable date labels');
  check.ok(!/opened_date|closed_date|normalized value/.test(response.text), 'internal field names do not reach the consumer PDF');
  check.equal(journey.assessmentReport(t.service.store, owner, caseId).is_a_response_packet, false, 'the paid assessment remains distinct from a dispute packet');
  check.equal((await t.request('GET', `/api/cases/${caseId}/packet`, { token: owner.token })).status, 402, 'a one-report PDF does not grant subscriber packet access');
  const other = await t.unpaidAccount('em-paid-pdf-other@example.test');
  check.equal((await t.request('GET', endpoint, { token: other.token })).status, 403, 'another signed-in account cannot read the paid PDF');
  const otherCase = await t.assessedCase(owner);
  check.equal((await t.request('GET', `/api/cases/${otherCase}/report-download`, { token: owner.token })).status, 402, 'one purchased PDF does not unlock another report');

  const artifactDir = path.join(__dirname, '..', '..', 'out', 'assessment-pdf');
  fs.mkdirSync(artifactDir, { recursive: true });
  fs.writeFileSync(path.join(artifactDir, 'fictional-credit-report-review.pdf'), pdf.bytes);
  fs.writeFileSync(path.join(artifactDir, 'fictional-long-credit-report-review.pdf'), largePdf.bytes);
  const packet = renderPacketPdf('CREDIT REPORT DISPUTE\nFictional Agency Élodie\nPRINT AND MAIL\nPrint this packet.');
  check.ok(pdfText(packet.bytes).includes('Fictional Agency Élodie'), 'additive branded drawing keeps the existing Unicode packet renderer working');
  return { paid_pdf_pages: pdf.page_count, long_pdf_pages: largePdf.page_count,
    paid_pdf_sha256: crypto.createHash('sha256').update(pdf.bytes).digest('hex'), real_download_bytes: response.bytes.length };
}

module.exports = { run, id: 'em-paid-assessment-pdf', title: 'Paid branded assessment PDFs, readable evidence, subscription value and account isolation' };
