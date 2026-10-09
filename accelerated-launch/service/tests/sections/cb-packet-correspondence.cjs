'use strict';
/**
 * cb-packet-correspondence.cjs — OWNER-PACKET-CORRESPONDENCE-001: the completed, consumer-controlled packet.
 *
 * The packet now carries (a) the recipient TYPE, (b) the consumer-supplied correspondence details stored SEPARATELY
 * from the report facts, (c) a coherent correspondence covering only the issues the consumer selected and (d) an
 * short report-page references integrated into its plain business letter, followed by the relevant source
 * pages, document copies and original bureau forms. Nothing is invented: no address, remedy, deadline,
 * signature or submitted status appears, and this service never sends the packet — the consumer does.
 *
 * Covered here: potential verification, probable verification and definite correction; partial selection; edited
 * correspondence invalidating the approval; a missing necessary detail refusing approval and download; a stale
 * approval; ownership and entitlement refusals; the consumer review preview matching the download; and the
 * readability of the downloaded correspondence.
 */
const crypto = require('node:crypto');
const auFamily = require('../../format-families/au-equifax-consumer.cjs');
const commonErrors = require('../../common-errors.cjs');
const issues = require('../../issues.cjs');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const Module = require('node:module');
const { comparableText } = require('../packet-pdf-assertions.cjs');
const { makeSyntheticModel } = require('../../../../internal-validation/ca-ns-last-payment-six-year/document-model.cjs');
const { buildPdf } = require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');

const DETAILS = Object.freeze({
  consumer_name: 'José François Łukasz',
  contact: 'dana.whitfield@example.test',
  account_reference: 'CRP-REF-1',
  bureau_reference: 'BUREAU-FILE-4321'
});

function letterText(file) {
  const section = file.sections.find(section => section.kind === 'letter');
  if (!section || section.start_page !== 1) throw new Error('packet has no first letter section');
  return execFileSync('pdftotext', ['-f', '1', '-l', String(section.page_count), '-layout', '-', '-'], {
    input: file.body, encoding: 'utf8', timeout: 30000, maxBuffer: 32 * 1024 * 1024
  }).replace(/\r/g, '').replace(/^\s*Page \d+ of \d+\s*$/gm, '').replace(/\f/g, '\n').trim();
}

const uploadBody = (bytes, filename) => ({
  originalFilename: filename,
  declaredBytes: bytes.length,
  mimeType: 'application/pdf',
  contentBase64: bytes.toString('base64')
});

async function payReportOnce(service, actor, caseId) {
  const checkout = await service.request('POST', '/api/billing/checkout', {
    token: actor.token, body: { plan_code: 'monthly' }
  });
  const c = checkout.json.checkout;
  const posted = await service.postEvent({
    id: `test_evt_${crypto.randomBytes(8).toString('hex')}`,
    type: 'checkout.session.completed', account_reference: actor.account_id, plan_code: c.plan.plan_code,
    session_reference: c.provider_reference, amount_cents: c.plan.amount_cents, currency: c.plan.currency,
    occurred_at: new Date().toISOString()
  });
  if (posted.status !== 200 || posted.json.event.accepted !== true) throw new Error(`entitlement failed ${posted.status}`);
}

const A4 = { width_pt: 595.32, height_pt: 841.92, label: 'A4' };
const FOOTER = `${auFamily.PUBLISHER_NAME}   Page {page} of {pages}   ABN: ${auFamily.PUBLISHER_ABN}`;
const SYNTHETIC_ADMISSION = Object.freeze({
  state: 'SYNTHETIC_STRUCTURAL_TEST_INPUT_NOT_A_REPORT', admitted: true, refusal_reason: null,
  fact_status: null, presentation_evidence: false,
  note: 'in-memory structural model: not a report, not presentation evidence'
});

function auExtraction(liabilityLines) {
  const pages = [
    ['CASE SUBJECT', 'Report Date: 4 January 2016', 'Reference: 0000'],
    [FOOTER.replace('Page {page} of {pages}', 'Page 2 of 3'), '', 'Personal Information', '', 'Credit Overview', '', 'Summary'],
    [FOOTER.replace('Page {page} of {pages}', 'Page 3 of 3'), '', 'Consumer Credit Liability Information', ...liabilityLines]
  ];
  const model = makeSyntheticModel({ pages, page_count: pages.length, page_size: A4 });
  return { presentation_id: auFamily.FAMILY_ID, family_id: auFamily.FAMILY_ID, records: auFamily.extract(model, SYNTHETIC_ADMISSION).records };
}

/** The three classifications, each measured on a real admitted/uploaded path. */
async function makeCorrectionCase(service, check) {
  const owner = await service.unpaidAccount(`cb-correction-${crypto.randomBytes(4).toString('hex')}@example.test`);
  const caseRow = (await service.request('POST', '/api/cases', { token: owner.token, body: { country: 'AU', region: 'AU-NSW' } })).json.case;
  await payReportOnce(service, owner, caseRow.case_id);
  const pdf = buildPdf({ pages: [
    { lines: ['CASE SUBJECT', 'Report Date: 1 January 2026', 'Reference: 0000'] },
    { lines: [auFamily.PUBLISHER_NAME + '   Page 2 of 3   ' + auFamily.PUBLISHER_ABN, '', 'Personal Information', '', 'Credit Overview', '', 'Summary'] },
    { lines: [auFamily.PUBLISHER_NAME + '   Page 3 of 3   ' + auFamily.PUBLISHER_ABN, '', 'Consumer Credit Information', 'Publically Available Consumer Information', 'Consumer Credit Liability Information', 'Credit Provider  SOME BANK', 'Type Of Account  Credit Card', 'Opened Date  1 January 2018', 'Closed Date  1 January 2019'] }
  ] });
  await service.request('POST', `/api/cases/${caseRow.case_id}/files`, { token: owner.token, body: uploadBody(pdf, 'cb-taxlien.pdf') });
  await service.request('POST', `/api/cases/${caseRow.case_id}/evaluate`, { token: owner.token });
  const view = (await service.request('GET', `/api/cases/${caseRow.case_id}/packet`, { token: owner.token })).json.view;
  const definite = (view.eligible_issues || []).find((i) => i.confidence === 'DEFINITE' && i.request_type === 'CORRECTION');
  check.ok(definite, 'the AU liability case offers an in-list DEFINITE correction issue');
  check.ok(definite.citation, 'with its recorded rule identity');
  return { owner, caseId: caseRow.case_id, definite };
}
async function run(service, check) {
  const evidence = {};

  /* ---- 1. The recipient TYPE, and the refusal while a necessary detail is missing. ---- */
  const correction = await makeCorrectionCase(service, check);
  const caseId = correction.caseId;
  const owner = correction.owner;
  const pv0 = (await service.request('GET', `/api/cases/${caseId}/packet`, { token: owner.token })).json.view;
  check.equal(pv0.packet.recipient.type, 'CONSUMER_REPORTING_AGENCY', 'the packet names an explicit recipient TYPE');
  check.ok(/consumer reporting agency that issued this report/.test(pv0.packet.recipient.label), 'in consumer language and without an address');
  check.equal(pv0.packet.correspondence_ready, false, 'and reports that the necessary correspondence details are not supplied yet');
  check.deepEqual(pv0.packet.correspondence_missing, ['consumer_name', 'contact'], 'naming exactly the two necessary details');
  check.equal(pv0.packet.download_available, false, 'with no download available');

  await service.request('POST', `/api/cases/${caseId}/packet/select`, { token: owner.token, body: { issue_ids: [correction.definite.issue_id] } });
  const refusedApproval = await service.request('POST', `/api/cases/${caseId}/packet/approve`, { token: owner.token });
  check.equal(refusedApproval.status, 409, 'approval without the necessary correspondence details is refused');
  check.equal(refusedApproval.json.error.code, 'PACKET_CORRESPONDENCE_REQUIRED', 'with a typed refusal');
  const preDetailDownload = await service.request('GET', `/api/cases/${caseId}/packet-download`, { token: owner.token });
  check.equal(preDetailDownload.status, 409, 'and there is no approved packet to download');
  check.equal(preDetailDownload.json.error.code, 'PACKET_NOT_APPROVED', 'because the packet was never approved');

  /* ---- 2. The consumer supplies the details; they are kept SEPARATE from the report facts. ---- */
  const withDetails = await service.request('POST', `/api/cases/${caseId}/packet/correspondence`, { token: owner.token, body: { correspondence: DETAILS } });
  check.equal(withDetails.status, 200, 'the consumer-supplied correspondence details are recorded');
  check.deepEqual(withDetails.json.view.packet.correspondence, DETAILS, 'and returned for review exactly as entered');
  check.equal(withDetails.json.view.packet.correspondence_ready, true, 'so the correspondence is ready');
  check.equal(withDetails.json.view.packet.approved, false, 'and the packet is not approved yet');
  const caseView = (await service.request('GET', `/api/cases/${caseId}`, { token: owner.token })).json.view;
  check.equal(JSON.stringify(caseView).includes(DETAILS.contact), false, 'the details never enter the case view or the report facts');
  const resultRow = service.service.store.state().results.find((r) => r.case_id === caseId);
  check.equal(JSON.stringify(resultRow).includes(DETAILS.consumer_name), false, 'and never enter the persisted report result');
  check.equal(JSON.stringify(resultRow).includes(DETAILS.contact), false, 'nor its extraction or evaluation');



  /* ---- 3. The consumer reviews a plain letter with integrated report-page references. ---- */
  const mailView = await service.preparePostalPacket(owner, caseId);
  const preview = mailView.packet.correspondence_preview;
  check.ok(/^Re: Credit report dispute$/m.test(preview), 'the review shows the business-letter subject');
  check.ok(/Please see report page \d+(?:, line \d+)? in the attached copies\./.test(preview), 'and short report-page references beside the request');
  check.ok(preview.includes(mailView.support.requirements.label) && mailView.support.requirements.postal.split(/,\s*/).every(part => preview.includes(part)), 'addressed to the selected bureau and its verified mailing address');
  check.ok(preview.startsWith(DETAILS.consumer_name) && preview.includes(DETAILS.contact), 'carrying the details the consumer supplied in the sender block');
  check.ok(preview.includes(`My reference: ${DETAILS.account_reference}`), 'including the optional reference when supplied');
  check.ok(preview.includes(`My bureau file or account number: ${DETAILS.bureau_reference}`), 'including the separately supplied bureau file number');
  check.ok(/\n\s*\d+\. \S/.test(preview), 'with one numbered request per selected issue');
  check.ok(/2019-01-01|January 1, 2019|1 January 2019/.test(preview), 'the temporal correction request retains its source-derived closing date');
  check.ok(!/Recorded rule:|EVIDENCE REFERENCES|read as/.test(preview), 'the letter avoids a dense internal evidence appendix');

  /* ---- 4. Approve, download and print the same complete inline PDF. ---- */
  const approved = await service.request('POST', `/api/cases/${caseId}/packet/approve`, { token: owner.token });
  check.equal(approved.status, 200, 'the packet approves once the details are supplied');
  check.equal(approved.json.view.packet.download_available, true, 'and the download becomes available');
  const dl = await service.request('GET', `/api/cases/${caseId}/packet-download`, { token: owner.token });
  check.equal(dl.status, 200, 'and the approved packet downloads');
  check.equal(dl.headers.get('content-type'), 'application/pdf', 'as one complete printable PDF');
  check.ok(dl.text.startsWith(DETAILS.consumer_name) && /Re: Credit report dispute/.test(dl.text), 'carrying the sendable business letter');
  check.ok(dl.text.includes(DETAILS.consumer_name) && dl.text.includes(DETAILS.contact), 'with the consumer-supplied details');
  check.ok(!/EVIDENCE REFERENCES/.test(preview), 'the letter needs no separate evidence appendix');
  check.ok(/report page \d+/.test(preview), 'the letter directs the bureau to the included source page');
  check.ok(/SOME BANK|credit account 1|liability 1/i.test(dl.text), 'naming the record the finding concerns');
  check.ok(!/not legal advi/i.test(dl.text), 'with no legal-advice disclaimer anywhere in the packet');
  check.ok(!/has been (submitted|sent|filed)|we have sent|was submitted to/i.test(dl.text), 'and no claim that anything was submitted or sent');
  check.ok(/Signature: _+/.test(dl.text), 'with a blank signature line for the consumer to sign');
  check.ok(!/within \d+ (days|weeks)|by \d{1,2} [A-Z][a-z]+ \d{4}/.test(dl.text), 'and no invented deadline');
  check.ok(!/\b(remedy|remedies)\b/i.test(dl.text), 'and no invented remedy');
  check.ok(mailView.support.requirements.postal.split(/,\s*/).every(part => comparableText(dl.text).includes(part)), 'the packet uses every line of the reviewed verified mailing address');
  check.equal(/Approved version:|Produced:|[a-f0-9]{64}/i.test(preview), false, 'the consumer letter contains no internal approval or source hash or generated timestamp');
  const again = await service.request('GET', `/api/cases/${caseId}/packet-download`, { token: owner.token });
  check.deepEqual(again.bytes, dl.bytes, 'the same approved PDF is deterministic across downloads');
  const packetModule = require('../../packets.cjs');
  const printFile = packetModule.packetPrint(service.service.store, owner, caseId);
  const correspondencePdf = dl.bytes;
  check.deepEqual(printFile.body, correspondencePdf, 'printing and downloading use the exact same approved PDF');
  const completePreview = await service.request('GET', mailView.packet.letter_preview_url, { token: owner.token });
  check.deepEqual(completePreview.bytes, dl.bytes, 'the complete reviewed PDF equals the approved printable download');
  check.equal(comparableText(letterText(printFile)), comparableText(preview), 'independent extraction of the letter pages matches the full editable letter');
  check.ok(printFile.page_count >= 2, 'the letter and inline attachments have separate printable pages');
  const out = path.join(__dirname, '..', '..', 'out', 'packet-print');
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'approved-correspondence.pdf'), correspondencePdf);
  fs.writeFileSync(path.join(out, 'approved-preview.txt'), preview);

  /* ---- 5. Editing a correspondence detail after approval invalidates the approval. ---- */
  const edited = await service.request('POST', `/api/cases/${caseId}/packet/correspondence`, { token: owner.token, body: { correspondence: { contact: 'corrected-reply@example.test' } } });
  await service.request('PUT', '/api/account/profile', { token: owner.token, body: { profile: {
    address_line1: '12 Example Street', contact_email: 'corrected-reply@example.test' } } });
  check.equal(edited.json.view.packet.approved, false, 'editing a detail after approval leaves the packet unapproved');
  const staleDownload = await service.request('GET', `/api/cases/${caseId}/packet-download`, { token: owner.token });
  check.equal(staleDownload.status, 409, 'so the packet the consumer no longer sees approved cannot be downloaded');
  check.equal(staleDownload.json.error.code, 'PACKET_NOT_APPROVED', 'with a typed refusal: the edited version is not the approved one');
  const reapproved = await service.request('POST', `/api/cases/${caseId}/packet/approve`, { token: owner.token });
  check.equal(reapproved.status, 200, 're-approving the edited correspondence succeeds');
  const dl2 = await service.request('GET', `/api/cases/${caseId}/packet-download`, { token: owner.token });
  check.equal(dl2.status, 200, 'and the corrected packet downloads');
  check.ok(dl2.text.includes('corrected-reply@example.test') && !dl2.text.includes(DETAILS.contact), 'carrying the corrected detail and not the replaced one');

  /* ---- 6. The download re-checks the necessary details: they are never omitted silently. ---- */
  service.service.store.update((state) => {
    state.accounts.find(account => account.account_id === owner.account_id).profile.full_name = '';
  });
  const strippedDownload = await service.request('GET', `/api/cases/${caseId}/packet-download`, { token: owner.token });
  check.equal(strippedDownload.status, 409, 'a packet whose necessary correspondence details are gone is refused, not produced');
  check.equal(strippedDownload.json.error.code, 'PACKET_CORRESPONDENCE_REQUIRED', 'with the correspondence refusal, never a silently incomplete document');
  service.service.store.update((state) => {
    state.accounts.find(account => account.account_id === owner.account_id).profile.full_name = DETAILS.consumer_name;
  });
  await service.request('POST', `/api/cases/${caseId}/packet/approve`, { token: owner.token });
  check.equal((await service.request('GET', `/api/cases/${caseId}/packet-download`, { token: owner.token })).status, 200, 'and restoring them restores the download');

  /* A re-evaluation after approval is a genuine STALE approval: the approved packet no longer matches the result. */
  await service.request('POST', `/api/cases/${caseId}/evaluate`, { token: owner.token });
  const afterEval = (await service.request('GET', `/api/cases/${caseId}/packet`, { token: owner.token })).json.view;
  check.equal(afterEval.packet.approval_stale, true, 'the view marks the approval stale rather than silently reusing it');
  const staleAfterEval = await service.request('GET', `/api/cases/${caseId}/packet-download`, { token: owner.token });
  check.equal(staleAfterEval.status, 409, 'and a re-evaluated case cannot serve the earlier approved packet');
  check.equal(staleAfterEval.json.error.code, 'PACKET_APPROVAL_STALE', 'with a typed stale-approval refusal');


  /* ---- 7. Partial selection: the correspondence covers only the selected issue. ---- */
  const multiOwner = await service.unpaidAccount(`cb-partial-${crypto.randomBytes(4).toString('hex')}@example.test`);
  const multiCase = (await service.request('POST', '/api/cases', { token: multiOwner.token, body: { country: 'US', region: 'US-CA' } })).json.case;
  await payReportOnce(service, multiOwner, multiCase.case_id);
  const multiPdf = buildPdf({ pages: [{ lines: [
    'Equifax  Consumer Credit Report', 'Report Date: June 12, 2026',
    'Creditor A  Balance $100  Opened 01/01/2020  Closed 01/01/2019',
    'Creditor B  Balance $200  Opened 01/01/2021  Closed 01/01/2020'
  ] }] });
  await service.request('POST', `/api/cases/${multiCase.case_id}/files`, { token: multiOwner.token, body: uploadBody(multiPdf, 'cb-multi.pdf') });
  await service.request('POST', `/api/cases/${multiCase.case_id}/evaluate`, { token: multiOwner.token });
  const multiView = (await service.request('GET', `/api/cases/${multiCase.case_id}/packet`, { token: multiOwner.token })).json.view;
  check.equal(multiView.eligible_issues.length, 2, 'two contradictory accounts offer two selectable issues');
  check.equal(multiView.eligible_issues.every((i) => i.confidence === 'PROBABLE'
    && i.rule_assessment && i.request_type === 'VERIFICATION'), true,
  'each a source-linked probable violation with a verification request and no statute prerequisite');
  const only = multiView.eligible_issues[0];
  const other = multiView.eligible_issues[1];
  await service.request('POST', `/api/cases/${multiCase.case_id}/packet/select`, { token: multiOwner.token, body: { issue_ids: [only.issue_id] } });
  const partial = await service.request('POST', `/api/cases/${multiCase.case_id}/packet/correspondence`, { token: multiOwner.token, body: { correspondence: DETAILS } });
  const partialMailView = await service.preparePostalPacket(multiOwner, multiCase.case_id);
  const partialPreview = partialMailView.packet.correspondence_preview;
  check.match(partialPreview, /^\s*1\. .+$/m, 'the letter names the selected account');
  check.ok(partialPreview.includes('opened on January 1, 2020') && partialPreview.includes('closed on January 1, 2019'),
    'the contradictory dates remain clear in the plain request');
  const correspondenceOnly = partialPreview;
  check.equal(correspondenceOnly.split('\n').filter((l) => /^\s*\d+\. \S/.test(l)).length, 1, 'the correspondence states exactly one request');
  check.ok(/Creditor A/i.test(partialPreview), 'the request names the selected tradeline');
  check.equal(/Creditor B/i.test(partialPreview), false, 'and never the unselected tradeline');
  check.equal(/Recorded rule:/.test(partialPreview), false, 'with no citation, which a factual verification request does not need');
  await service.request('POST', `/api/cases/${multiCase.case_id}/packet/approve`, { token: multiOwner.token });
  const partialDl = await service.request('GET', `/api/cases/${multiCase.case_id}/packet-download`, { token: multiOwner.token });
  check.equal(partialDl.status, 200, 'the partially selected packet downloads');
  check.ok(!/Creditor B/i.test(letterText(packetModule.packetPrint(service.service.store, multiOwner, multiCase.case_id))), 'the letter never requests an unselected issue, even when it shares an included source page');
  check.ok(/Please check/.test(partialPreview) && !/potential, verification/.test(partialPreview), 'the letter states the requested action without a confidence tier');
  const priorPreviewVersion = partialMailView.packet.preview_version;
  const longWording = 'My message: José François Łukasz.\n' + 'LongReference'.repeat(220) + '\n' + 'Please check my account. '.repeat(180);
  packetModule.setWording(service.service.store, multiOwner, multiCase.case_id, longWording);
  const longView = packetModule.packetView(service.service.store, multiOwner, multiCase.case_id);
  check.equal(longView.packet.approved, false, 'added consumer wording invalidates the approved packet');
  check.ok(longView.packet.correspondence_preview.includes(longWording), 'the complete preview includes every line of added wording');
  let oldReviewCode = null;
  try { packetModule.approvePacket(service.service.store, multiOwner, multiCase.case_id, priorPreviewVersion); }
  catch (error) { oldReviewCode = error.code; }
  check.equal(oldReviewCode, 'PACKET_APPROVAL_STALE', 'approval based on an earlier displayed preview is refused');
  packetModule.approvePacket(service.service.store, multiOwner, multiCase.case_id, longView.packet.preview_version);
  const longPrinted = packetModule.packetPrint(service.service.store, multiOwner, multiCase.case_id);
  const longText = letterText(longPrinted);
  check.equal(longText.replace(/\s/g, ''), longView.packet.correspondence_preview.replace(/\s/g, ''),
    'independent PDF extraction preserves every character of the current preview including long unbroken input');
  check.ok(longPrinted.page_count > 2, 'long added wording paginates beyond the short packet');
  const info = execFileSync('pdfinfo', ['-'], { input: longPrinted.body, encoding: 'utf8' });
  check.equal(Number(/^Pages:\s+(\d+)/m.exec(info)[1]), longPrinted.page_count, 'the independent PDF reader confirms the actual page count');
  const letterPages = longPrinted.sections.find(section => section.kind === 'letter').page_count;
  const bbox = execFileSync('pdftotext', ['-f', '1', '-l', String(letterPages), '-bbox', '-', '-'], { input: longPrinted.body, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  const words = [...bbox.matchAll(/<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">/g)];
  check.ok(words.length > 200, 'the independent renderer reads the long packet text geometry');
  check.ok(words.every(word => +word[1] >= 53.9 && +word[3] <= 558.1 && +word[2] >= 35 && +word[4] <= 765),
    'all actual letter words remain inside printable page margins without clipping; original artwork keeps its own margins');
  fs.writeFileSync(path.join(out, 'approved-long-correspondence.pdf'), longPrinted.body);
  fs.writeFileSync(path.join(out, 'approved-long-preview.txt'), longView.packet.correspondence_preview);


  /* ---- 8. Probable verification stays a qualified request without a categorical allegation. ---- */
  const probOwner = await service.unpaidAccount(`cb-probable-${crypto.randomBytes(4).toString('hex')}@example.test`);
  const probCase = (await service.request('POST', '/api/cases', { token: probOwner.token, body: { country: 'US', region: 'US-NY' } })).json.case;
  await payReportOnce(service, probOwner, probCase.case_id);
  const probPdf = buildPdf({ pages: [{ lines: [
    'Experian Consumer Credit Report - FICTIONAL TEST FIXTURE', 'Report Date: June 12, 2026',
    'Account 30 days past due as of Jun 2015'
  ] }] });
  await service.request('POST', `/api/cases/${probCase.case_id}/files`, { token: probOwner.token, body: uploadBody(probPdf, 'cb-probable.pdf') });
  await service.request('POST', `/api/cases/${probCase.case_id}/evaluate`, { token: probOwner.token });
  const probView = (await service.request('GET', `/api/cases/${probCase.case_id}/packet`, { token: probOwner.token })).json.view;
  const probable = (probView.eligible_issues || []).find((i) => i.confidence === 'PROBABLE');
  check.ok(probable, 'the adverse-rating case offers a PROBABLE issue');
  check.equal(probable.request_type, 'VERIFICATION', 'as a verification request');
  check.ok(probable.citation, 'whose recorded rule identity is stated');
  await service.request('POST', `/api/cases/${probCase.case_id}/packet/select`, { token: probOwner.token, body: { issue_ids: [probable.issue_id] } });
  await service.request('POST', `/api/cases/${probCase.case_id}/packet/correspondence`, { token: probOwner.token, body: { correspondence: DETAILS } });
  await service.preparePostalPacket(probOwner, probCase.case_id);
  await service.request('POST', `/api/cases/${probCase.case_id}/packet/approve`, { token: probOwner.token });
  const probDl = await service.request('GET', `/api/cases/${probCase.case_id}/packet-download`, { token: probOwner.token });
  check.equal(probDl.status, 200, 'the probable packet downloads');
  check.ok(/Please check/.test(probDl.text) && !/probable, verification/.test(probDl.text), 'the letter states the requested action without a confidence tier');
  check.ok(!/Recorded rule: /.test(probDl.text), 'the plain letter omits an internal rule caption');
  check.ok(!/established violation|definite breach/i.test(probDl.text), 'and never turning a probable issue into a categorical allegation');
  check.ok(/Please check whether an exception/.test(comparableText(probDl.text)), 'with a verification request, never a correction demand');

  /* ---- 9. Ownership and entitlement are enforced on the correspondence itself. ---- */
  const stranger = await service.unpaidAccount(`cb-stranger-${crypto.randomBytes(4).toString('hex')}@example.test`);
  const strangerWrite = await service.request('POST', `/api/cases/${caseId}/packet/correspondence`, { token: stranger.token, body: { correspondence: DETAILS } });
  check.equal(strangerWrite.status, 403, 'a stranger cannot record correspondence on another account packet');
  check.equal((await service.request('GET', `/api/cases/${caseId}/packet-download`, { token: stranger.token })).status, 403, 'nor download it');
  const unpaid = await service.unpaidAccount(`cb-unpaid-${crypto.randomBytes(4).toString('hex')}@example.test`);
  const unpaidCase = (await service.request('POST', '/api/cases', { token: unpaid.token, body: { country: 'US', region: 'US-CA' } })).json.case;
  const unpaidWrite = await service.request('POST', `/api/cases/${unpaidCase.case_id}/packet/correspondence`, { token: unpaid.token, body: { correspondence: DETAILS } });
  check.equal(unpaidWrite.status, 402, 'an unpaid account cannot record correspondence for a packet');
  check.equal(unpaidWrite.json.error.code, 'SUBSCRIPTION_REQUIRED', 'with the subscription refusal');

  /* ---- 10. The definite correction, the sending control and the classification on the real download. ---- */
  check.ok(/Please check/.test(preview) && !/definite, correction/.test(preview), 'the letter states the requested correction without a confidence tier');
  const reviewedCorrection = packetModule.eligibleIssues(resultRow).find(issue => issue.issue_id === correction.definite.issue_id);
  check.ok(comparableText(dl.text).includes(comparableText(require('../../consumer-dispute-letter.cjs').requestFor(reviewedCorrection))), 'with the selected plain correction request');
  check.ok(!/Sign and date the letter|Mail the packet to the bureau address|PRINT AND MAIL/i.test(preview), 'print and mail instructions stay outside the consumer letter');
  check.ok(/I have included copies of my identification and address documents/.test(preview), 'the letter accurately names the copies included inline');

  await reagingLanguage(service, check);

  evidence.definite_correction = { case_id: caseId, recipient_type: 'CONSUMER_REPORTING_AGENCY', downloaded_chars: (dl.text || '').length };
  evidence.potential_verification = { case_id: multiCase.case_id, downloaded_chars: (partialDl.text || '').length };
  evidence.probable_verification = { case_id: probCase.case_id, downloaded_chars: (probDl.text || '').length };
  evidence.separation = 'the consumer-entered details live on the packet row and never in the report result, extraction or evaluation';
  evidence.sending = 'consumer-controlled: the packet is prepared for the consumer to submit with the relevant bureau instructions; this service sends nothing';
  return evidence;
}

async function reagingLanguage(service, check) {
  const actor = await service.account(`cb-reaging-language-${crypto.randomBytes(4).toString('hex')}@example.test`);
  const reports = [];
  for (const [year, anchor] of [['2025', '2018'], ['2026', '2020']]) {
    const opened = await service.request('POST', '/api/cases', { token: actor.token, body: { country: 'US', region: 'US-NY', bureau: 'EQUIFAX' } });
    const id = opened.json.case.case_id, pdf = buildPdf({ pages: [{ lines: [
      'Equifax Consumer Credit Report - FICTIONAL TEST FIXTURE', `Report Date: June 12, ${year}`,
      'Creditor A Balance $100', 'Account Number ****1234', 'Status: Charged Off',
      'Opened 01/01/2010', `First Delinquency Date 01/01/${anchor}`, 'Last Payment Date 01/01/2017'
    ] }] });
    await service.request('POST', `/api/cases/${id}/files`, { token: actor.token, body: uploadBody(pdf, `cb-language-${year}.pdf`) });
    await service.request('POST', `/api/cases/${id}/evaluate`, { token: actor.token }); reports.push(id);
  }
  const id = reports[1], base = `/api/cases/${id}`;
  const view = (await service.request('GET', base + '/packet', { token: actor.token })).json.view;
  const row = service.service.store.state().results.find(result => result.case_id === id);
  const internal = require('../../packets.cjs').eligibleIssues(row).find(issue => issue.check_id === 'COMMON-ERROR-POTENTIAL-RE-AGING-SIGNAL');
  const reaging = view.eligible_issues.find(issue => issue.issue_id === internal?.issue_id);
  check.ok(reaging, 'the ordinary owned report pair offers the supported re-aging issue');
  if (!reaging) return;
  const before = JSON.stringify(service.service.store.state().results.filter(result => reports.includes(result.case_id)));
  await service.request('POST', base + '/packet/select', { token: actor.token, body: { issue_ids: [reaging.issue_id] } });
  const ready = await service.preparePostalPacket(actor, id), preview = ready.packet.correspondence_preview;
  check.match(preview, /^\s*1\. Creditor A/im, 'the real re-aging letter names the actual tradeline');
  check.ok(/changed from January 1, 2018 on my earlier report dated June 12, 2025 to January 1, 2020 on this report dated June 12, 2026/.test(preview),
    'the re-aging request retains both first missed-payment dates and the dates of their earlier/current source reports');
  check.ok(/report page 1(?:, line \d+)?/.test(preview), 'the plain request retains a report page pointer');
  check.ok(preview.includes('****1234') && !preview.includes('MASK-1234'), 'the account heading uses the exact printed masked number, never a normalized token');
  check.ok(!/account\.\w+|EVIDENCE REFERENCES|read as/.test(preview), 'internal source labels and normalized data dumps stay out of the letter');
  // Produce a real approval over this exact packet's material using the previous
  // format stamp. The independent module is never cached or written to disk.
  const filename = require.resolve('../../packets.cjs'), legacy = new Module(filename, module);
  legacy.paths = Module._nodeModulePaths(path.dirname(filename));
  legacy._compile(fs.readFileSync(filename, 'utf8').replace(/'packet-format:[^']+'/g, "'packet-format:print-4'"), filename);
  const oldView = legacy.exports.packetView(service.service.store, actor, id);
  legacy.exports.approvePacket(service.service.store, actor, id, oldView.packet.preview_version, true);
  check.notEqual(oldView.packet.preview_version, ready.packet.preview_version, 'the previous format approval differs even with identical selected evidence and consumer input');
  const refreshed = (await service.request('GET', base + '/packet', { token: actor.token })).json.view;
  check.equal(refreshed.packet.approval_stale, true, 'the filled-form business-letter format requires rereview of an already approved print-4 packet');
  check.equal((await service.request('GET', base + '/packet-download', { token: actor.token })).json.error.code, 'PACKET_APPROVAL_STALE',
    'old format approval cannot download refreshed consumer text');
  check.equal((await service.request('GET', base + '/packet-print', { token: actor.token })).json.error.code, 'PACKET_APPROVAL_STALE',
    'old format approval cannot print refreshed consumer text');
  check.equal((await service.request('POST', base + '/packet/approve', { token: actor.token, body: { reviewed_version: oldView.packet.preview_version } })).json.error.code, 'PACKET_APPROVAL_STALE',
    'an earlier displayed format version cannot approve the current preview');
  check.equal((await service.request('POST', base + '/packet/approve', { token: actor.token, body: { reviewed_version: ready.packet.preview_version } })).status, 200,
    'the plain preview still approves through the existing displayed-version gate');
  const download = await service.request('GET', base + '/packet-download', { token: actor.token });
  check.equal(comparableText(letterText(require('../../packets.cjs').packetPrint(service.service.store, actor, id))), comparableText(preview), 'the approved letter pages carry exactly the plain reviewed letter');
  const printed = await service.request('GET', base + '/packet-print', { token: actor.token });
  check.equal(printed.status, 200, 'rereviewed plain packet is available as its approved printable PDF');
  const out = path.join(__dirname, '../../out/batch66-packet-language'); fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'reaging-correspondence.pdf'), printed.bytes);
  fs.writeFileSync(path.join(out, 'reaging-preview.txt'), preview);
  check.equal(JSON.stringify(service.service.store.state().results.filter(result => reports.includes(result.case_id))), before,
    'formatting leaves all source results, predicates, confidence and issue IDs unchanged');
}

module.exports = {
  run,
  id: 'cb-packet-correspondence',
  title: 'OWNER-PACKET-CORRESPONDENCE-001: plain consumer letters and one reviewed editable PDF across definite, probable and potential issues'
};


