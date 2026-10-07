'use strict';
/**
 * cb-packet-correspondence.cjs — OWNER-PACKET-CORRESPONDENCE-001: the completed, consumer-controlled packet.
 *
 * The packet now carries (a) the recipient TYPE, (b) the consumer-supplied correspondence details stored SEPARATELY
 * from the report facts, (c) a coherent correspondence covering only the issues the consumer selected and (d) an
 * ORGANIZED evidence-reference section carrying the report/record identity, the raw printed readings, the
 * normalized values and the available source locations. Nothing is invented: no address, remedy, deadline,
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
const { makeSyntheticModel } = require('../../../../internal-validation/ca-ns-last-payment-six-year/document-model.cjs');
const { buildPdf } = require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');

const DETAILS = Object.freeze({
  consumer_name: 'Dana Whitfield',
  contact: 'dana.whitfield@example.test',
  account_reference: 'CRP-REF-1'
});

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



  /* ---- 3. The consumer review shows the correspondence and the organized evidence. ---- */
  const preview = withDetails.json.view.packet.correspondence_preview;
  check.ok(/^CORRESPONDENCE TO SEND \(you send this; this service sends nothing\)$/m.test(preview), 'the review shows the correspondence, stating that the consumer sends it');
  check.ok(/^EVIDENCE REFERENCES \(from your report\)$/m.test(preview), 'and the organized evidence references');
  check.ok(/^To: the consumer reporting agency that issued this report$/m.test(preview), 'addressed by TYPE, never a fabricated address');
  check.ok(preview.includes(`From: ${DETAILS.consumer_name}`) && preview.includes(`Reply to: ${DETAILS.contact}`), 'carrying the details the consumer supplied');
  check.ok(preview.includes(`Your reference: ${DETAILS.account_reference}`), 'including the optional reference when supplied');
  check.ok(/\n\s*\d+\. \S/.test(preview), 'with one numbered request per selected issue');
  check.ok(/Recorded rule: /.test(preview), 'and the recorded rule identity for the correction request');
  check.ok(/printed "1 January 2019"/.test(preview), 'with the raw printed reading');
  check.ok(/normalized to 2019-01-01/.test(preview), 'and its normalized value');
  check.ok(/\(page \d+(, line \d+)?\)/.test(preview), 'and the source location');

  /* ---- 4. Approve and download: the actual correspondence and evidence. ---- */
  const approved = await service.request('POST', `/api/cases/${caseId}/packet/approve`, { token: owner.token });
  check.equal(approved.status, 200, 'the packet approves once the details are supplied');
  check.equal(approved.json.view.packet.download_available, true, 'and the download becomes available');
  const dl = await service.request('GET', `/api/cases/${caseId}/packet-download`, { token: owner.token });
  check.equal(dl.status, 200, 'and the approved packet downloads');
  check.ok(dl.text.startsWith('CRP CORRECTION PACKET'), 'as a readable document');
  check.ok(/^CORRESPONDENCE TO SEND/m.test(dl.text), 'carrying the sendable correspondence');
  check.ok(dl.text.includes(`From: ${DETAILS.consumer_name}`) && dl.text.includes(`Reply to: ${DETAILS.contact}`), 'with the consumer-supplied details');
  check.ok(/^ISSUES AND THE FACTS THEY CAME FROM$/m.test(dl.text), 'and the per-issue factual basis');
  check.ok(/^EVIDENCE REFERENCES \(from your report\)$/m.test(dl.text), 'and the organized evidence-reference section');
  check.ok(/SOME BANK|credit account 1|liability 1/i.test(dl.text), 'naming the record the finding concerns');
  check.ok(!/not legal advi/i.test(dl.text), 'with no legal-advice disclaimer anywhere in the packet');
  check.ok(!/has been (submitted|sent|filed)|we have sent|was submitted to/i.test(dl.text), 'and no claim that anything was submitted or sent');
  check.ok(!/Dear Sir|Sincerely|Signature|sign here/i.test(dl.text), 'with no invented salutation, signature or signing request');
  check.ok(!/within \d+ (days|weeks)|by \d{1,2} [A-Z][a-z]+ \d{4}/.test(dl.text), 'and no invented deadline');
  check.ok(!/\b(remedy|remedies)\b/i.test(dl.text), 'and no invented remedy');
  check.ok(!/\d+ [A-Z][a-z]+ (Street|Avenue|Road|Blvd)|P\.O\. Box/i.test(dl.text), 'and no invented mailing address');
  check.ok(dl.text.includes(preview.trim().split('\n')[0]), 'the reviewed correspondence is the downloaded correspondence');

  /* ---- 5. Editing a correspondence detail after approval invalidates the approval. ---- */
  const edited = await service.request('POST', `/api/cases/${caseId}/packet/correspondence`, { token: owner.token, body: { correspondence: { contact: 'corrected-reply@example.test' } } });
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
    const row = state.packets.find((p) => p.case_id === caseId);
    row.correspondence = { consumer_name: '', contact: '', account_reference: '' };
  });
  const strippedDownload = await service.request('GET', `/api/cases/${caseId}/packet-download`, { token: owner.token });
  check.equal(strippedDownload.status, 409, 'a packet whose necessary correspondence details are gone is refused, not produced');
  check.equal(strippedDownload.json.error.code, 'PACKET_CORRESPONDENCE_REQUIRED', 'with the correspondence refusal, never a silently incomplete document');
  service.service.store.update((state) => {
    const row = state.packets.find((p) => p.case_id === caseId);
    row.correspondence = { consumer_name: DETAILS.consumer_name, contact: 'corrected-reply@example.test', account_reference: DETAILS.account_reference };
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
  const partialPreview = partial.json.view.packet.correspondence_preview;
  const correspondenceOnly = partialPreview.split('EVIDENCE REFERENCES')[0];
  check.equal(correspondenceOnly.split('\n').filter((l) => /^\s*\d+\. \S/.test(l)).length, 1, 'the correspondence states exactly one request');
  check.ok(partialPreview.includes(`credit account ${only.account_number_in_report}`), 'the evidence references name the selected record');
  check.equal(partialPreview.includes(`credit account ${other.account_number_in_report}`), false, 'and never the unselected record');
  check.equal(/Recorded rule:/.test(partialPreview), false, 'with no citation, which a factual verification request does not need');
  await service.request('POST', `/api/cases/${multiCase.case_id}/packet/approve`, { token: multiOwner.token });
  const partialDl = await service.request('GET', `/api/cases/${multiCase.case_id}/packet-download`, { token: multiOwner.token });
  check.equal(partialDl.status, 200, 'the partially selected packet downloads');
  check.ok(!partialDl.text.includes(`credit account ${other.account_number_in_report}`), 'and never includes the unselected issue');
  check.ok(/ - verification/.test(partialDl.text) && !/potential, verification/.test(partialDl.text), 'the packet states the requested action without a confidence tier');


  /* ---- 8. Probable verification: the correspondence preserves the qualification and adds no citation. ---- */
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
  await service.request('POST', `/api/cases/${probCase.case_id}/packet/approve`, { token: probOwner.token });
  const probDl = await service.request('GET', `/api/cases/${probCase.case_id}/packet-download`, { token: probOwner.token });
  check.equal(probDl.status, 200, 'the probable packet downloads');
  check.ok(/ - verification/.test(probDl.text) && !/probable, verification/.test(probDl.text), 'the evidence reference states the requested action without a confidence tier');
  check.ok(/Recorded rule: /.test(probDl.text), 'and the recorded rule identity of the proposed rule');
  check.ok(/not shown to be absent/.test(probDl.text), 'preserving the specific uncertainty, never an absent exception');
  check.ok(!/established violation|definite breach/i.test(probDl.text), 'and never turning a probable issue into a categorical allegation');
  check.ok(/Request \(verification\): /.test(probDl.text), 'with a verification request, never a correction demand');

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
  check.ok(/ - correction/.test(dl.text) && !/definite, correction/.test(dl.text), 'the evidence reference states the requested correction without a confidence tier');
  check.ok(/Request \(correction\): /.test(dl.text), 'with a correction request, never a mere verification');
  check.ok(/to review, edit and send yourself/.test(dl.text), 'the document says the consumer reviews, edits and sends it');
  check.ok(/This service supplies no address and sends nothing/.test(dl.text), 'and that this service supplies no address and sends nothing');
  check.ok(!/Please (find|see) (the )?enclosed/i.test(dl.text), 'with no claim of an enclosure this service never made');
  check.ok(!/Please (find|see) (the )?enclosed/i.test(dl.text), 'with no claim of an enclosure this service never made');

  evidence.definite_correction = { case_id: caseId, recipient_type: 'CONSUMER_REPORTING_AGENCY', downloaded_chars: (dl.text || '').length };
  evidence.potential_verification = { case_id: multiCase.case_id, downloaded_chars: (partialDl.text || '').length };
  evidence.probable_verification = { case_id: probCase.case_id, downloaded_chars: (probDl.text || '').length };
  evidence.separation = 'the consumer-entered details live on the packet row and never in the report result, extraction or evaluation';
  evidence.sending = 'consumer-controlled: the packet is prepared for the consumer to send; this service supplies no address and sends nothing';
  return evidence;
}

module.exports = {
  run,
  id: 'cb-packet-correspondence',
  title: 'OWNER-PACKET-CORRESPONDENCE-001: recipient type, consumer-supplied correspondence details and organized correspondence/evidence across definite, probable and potential issues'
};


