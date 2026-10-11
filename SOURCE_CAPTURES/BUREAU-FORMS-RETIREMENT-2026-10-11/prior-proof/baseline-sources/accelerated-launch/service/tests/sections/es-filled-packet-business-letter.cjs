'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { pdfText, comparableText } = require('../packet-pdf-assertions.cjs');
const letter = require('../../consumer-dispute-letter.cjs');
const { buildPdf } = require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');

async function run(t, check) {
  const partialPair = letter.itemsFor({ extraction: { records: [{ record_index: 1, kind: 'COLLECTION', kind_label: 'Collection entry' },
    { record_index: 2, kind: 'COLLECTION', kind_label: 'Collection entry' }] } }, [{ issue_id: 'pair', record_index: 1,
    check_id: 'COMMON-ERROR-DUPLICATE-REPORTING', evidence: { duplicate_of_record: 2 },
    account_identity: { entries: [{ record_index: 1, name: 'Fictional Collector A' }] }, request_wording: 'Please check these entries.' }]);
  check.deepEqual(partialPair.map(item => item.name), ['Fictional Collector A', 'Collection entry 2'], 'a related entry without a sourced name remains represented without borrowing the other agency name');
  const owner = await t.account('filled-business-letter@example.test');
  const stranger = await t.account('filled-form-stranger@example.test');
  const auth = body => ({ token: owner.token, body });
  const id = (await t.request('POST', '/api/cases', auth({ country: 'CA', region: 'CA-NS', bureau: 'EQUIFAX' }))).json.case.case_id;
  const base = '/api/cases/' + id;
  const source = buildPdf({ pages: [{ lines: ['Equifax Consumer Credit Report', 'Report Date: June 12, 2026',
    'Creditor: Fictional Cedar Bank', 'Account Number: ****1234', 'Opened 2020-01-01', 'Closed 2019-01-01', 'Balance $100'] }] });
  await t.request('POST', base + '/files', auth({ originalFilename: 'fictional-named-account.pdf', declaredBytes: source.length,
    mimeType: 'application/pdf', contentBase64: source.toString('base64') }));
  await t.request('POST', base + '/evaluate', auth());
  const initial = (await t.request('GET', base + '/packet', auth())).json.view;
  await t.request('POST', base + '/packet/select', auth({ issue_ids: [initial.eligible_issues[0].issue_id] }));
  await t.request('POST', base + '/packet/correspondence', auth({ correspondence: { bureau_reference: '8421864201' } }));
  let ready = await t.preparePostalPacket(owner, id);
  const savedVersion = ready.packet.preview_version;
  check.equal(ready.packet.form_previews.length, 1, 'only the selected report bureau and entry kind get a form preview');
  const formUrl = ready.packet.form_previews[0].review_url;
  const preview = await t.request('GET', ready.packet.letter_preview_url, auth());
  const form = await t.request('GET', formUrl, auth());
  check.equal(preview.status, 200, 'consumer can review the complete packet PDF before approval');
  check.equal(form.status, 200, 'consumer can review the populated original form before approval');
  check.equal(preview.headers.get('content-type'), 'application/pdf', 'complete review is a real printable PDF');
  check.equal(form.headers.get('x-crp-packet-version'), savedVersion, 'form preview binds to the same reviewed packet version');
  check.ok(comparableText(pdfText(preview.bytes)).startsWith(comparableText(ready.packet.correspondence_preview)), 'the complete packet begins with the saved editable letter');
  check.equal(ready.packet.preview_ready, true, 'only the complete prepared PDF is ready for consumer approval');
  check.ok(pdfText(form.bytes).includes('Morgan') && pdfText(form.bytes).includes('Fiction'), 'original form blanks carry the consumer-supplied name parts');
  check.ok(pdfText(form.bytes).replace(/\s/g, '').includes('8421864201'), 'the original Equifax Canada character boxes carry the exact bureau reference in order');
  check.equal((await t.request('GET', formUrl, { token: stranger.token })).status, 403, 'other account cannot read a filled form');
  check.equal((await t.request('GET', ready.packet.letter_preview_url, { token: stranger.token })).status, 403, 'other account cannot read a letter preview');
  check.equal((await t.request('GET', base + '/packet/forms/unselected.pdf', auth())).status, 404, 'preview allowlist rejects an unrelated original');
  check.equal((await t.request('GET', formUrl)).status, 401, 'form preview requires sign-in');
  check.equal((await t.request('GET', ready.packet.letter_preview_url)).status, 401, 'complete packet preview requires sign-in');
  const body = ready.packet.correspondence_preview;
  const sender = body.indexOf('Morgan Fiction'), date = body.indexOf(letter.dateLabel(t.service.store.state().packets.find(p => p.case_id === id).created_at.slice(0, 10)));
  const subject = body.indexOf('Re: Credit report dispute'), salutation = body.indexOf('Dear '), closing = body.indexOf('Sincerely,');
  check.ok(sender === 0 && date > sender && subject > date && salutation > subject && closing > salutation, 'ordinary business letter orders sender, date, recipient, subject, greeting and closing');
  check.ok(/\n1\. Fictional Cedar Bank\b/i.test(body), 'request heading names the actual tradeline');
  check.ok(/Please check/.test(body) && /Signature: _+/.test(body), 'letter asks plainly and leaves the signature unsigned');
  check.ok(body.includes('My bureau file or account number: 8421864201'), 'the same bureau file number appears in the business letter');
  check.ok(/Please see report page 1/.test(body), 'short evidence references are integrated with the selected request');
  check.ok(!/EVIDENCE REFERENCES|PRINT AND MAIL|Download your packet|Sign and date the letter/i.test(body), 'the letter has no evidence appendix or consumer print and mail instructions');
  check.ok(!/generated by|our platform|algorithm|remedy|not legal advice|my score fell|refused a loan|caused me stress/i.test(body), 'letter contains no computer voice, disclaimer or invented experience');
  check.equal((await t.request('POST', base + '/packet/approve', auth({ reviewed_version: savedVersion }))).status, 200, 'consumer approves the exact reviewed letter and forms');
  const downloaded = await t.request('GET', base + '/packet-download', auth());
  check.equal(downloaded.headers.get('content-type'), 'application/pdf', 'the complete packet is one PDF, never a ZIP');
  check.ok(downloaded.bytes.equals(preview.bytes), 'the approved download equals the complete PDF reviewed before approval');
  check.ok(pdfText(downloaded.bytes).includes('Fictional Cedar Bank') && pdfText(downloaded.bytes).includes('****1234'), 'the relevant source page and named account remain inline');
  const printed = require('../../packets.cjs').packetPrint(t.service.store, owner, id);
  check.ok(printed.body.equals(downloaded.bytes), 'print opens those exact approved bytes');
  check.deepEqual([...new Set(printed.sections.map(section => section.kind))], ['letter', 'report', 'document', 'form'], 'one PDF orders letter, report pages, document copies, then original forms');
  const letterPages = printed.sections.find(section => section.kind === 'letter').page_count;
  const renderedLetter = execFileSync('pdftotext', ['-f', '1', '-l', String(letterPages), '-layout', '-', '-'], { input: printed.body, encoding: 'utf8' });
  check.equal(comparableText(renderedLetter), comparableText(body), 'the letter pages contain only the fully reviewed letter');
  const approved = t.service.store.state().packets.find(p => p.case_id === id);
  check.equal(approved.approved_form_digests.length, 1, 'approval records the exact generated form digest');
  check.equal(approved.approved_form_digests[0].template_sha256, ready.packet.required_form_manifest[0].template_sha256, 'approval keeps original template provenance');

  // A consumer may rewrite the complete letter, independently of the immutable assessment and attachments.
  const sourceBeforeEdit = JSON.stringify(t.service.store.state().results.filter(result => result.case_id === id));
  const editedLetter = body.replace('Thank you for your help.', 'Thank you. Please reply to me at the address above.');
  const edited = await t.request('POST', base + '/packet/letter', auth({ letter_text: editedLetter }));
  check.equal(edited.status, 200, 'consumer can save the entire letter text');
  check.equal(edited.json.view.packet.correspondence_preview, editedLetter.trim(), 'the full edited letter is returned for review');
  check.equal(edited.json.view.packet.approved, false, 'editing the full letter invalidates the old approval');
  check.equal((await t.request('GET', base + '/packet-download', auth())).json.error.code, 'PACKET_NOT_APPROVED', 'the earlier approved download is refused after a letter edit');
  check.equal((await t.request('POST', base + '/packet/approve', auth({ reviewed_version: savedVersion }))).json.error.code, 'PACKET_APPROVAL_STALE', 'an old displayed version cannot approve a rewritten letter');
  check.equal((await t.request('POST', base + '/packet/letter', { token: stranger.token, body: { letter_text: editedLetter } })).status, 403, 'another account cannot rewrite the letter');
  check.equal((await t.request('POST', base + '/packet/letter', { body: { letter_text: editedLetter } })).status, 401, 'rewriting the letter requires sign-in');
  for (const invalid of ['', 'x'.repeat(24001), 'Letter\u0000control', 123]) {
    check.equal((await t.request('POST', base + '/packet/letter', auth({ letter_text: invalid }))).status, 400, 'invalid complete letter input is refused');
  }
  check.equal(JSON.stringify(t.service.store.state().results.filter(result => result.case_id === id)), sourceBeforeEdit, 'letter edits never alter extracted report facts or violations');
  const reset = await t.request('POST', base + '/packet/letter', auth({ letter_text: null }));
  check.equal(reset.json.view.packet.correspondence_preview, body, 'the consumer can restore the prepared letter');
  check.equal((await t.request('POST', base + '/packet/approve', auth({ reviewed_version: reset.json.view.packet.preview_version }))).status, 200, 'the prepared letter needs its own fresh review and approval');
  await t.request('PUT', '/api/account/profile', auth({ profile: { given_name: '', family_name: '' } }));
  ready = (await t.request('GET', base + '/packet', auth())).json.view;
  check.ok(ready.support.missing.some(v => /name/i.test(v)), 'genuinely missing original name fields get a plain prompt');
  check.equal((await t.request('GET', formUrl, auth())).json.error.code, 'PACKET_APPROVAL_STALE', 'a saved profile change invalidates the old form preview');
  check.equal((await t.request('POST', base + '/packet/approve', auth({}))).json.error.code, 'PACKET_SUPPORT_REQUIRED', 'full name is not silently guessed into separate original fields');
  await t.request('PUT', '/api/account/profile', auth({ profile: { given_name: 'Morgan', family_name: 'Fiction', phone: '555-0199' } }));
  ready = (await t.request('GET', base + '/packet', auth())).json.view;
  check.equal(ready.packet.approval_stale, true, 'changed contact details require a new review');
  check.equal((await t.request('GET', base + '/packet-download', auth())).json.error.code, 'PACKET_APPROVAL_STALE', 'changed details cannot bypass approval on download');
  check.equal((await t.request('POST', base + '/packet/approve', auth({ reviewed_version: ready.packet.preview_version }))).status, 200, 'updated populated packet can be approved again');
  const output = path.join(__dirname, '../../out/bureau-form-review/output/pdf');
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(path.join(output, 'complete-editable-dispute-packet.pdf'), preview.bytes);
  fs.writeFileSync(path.join(output, 'owned-ca-equifax-account.pdf'), form.bytes);
  const multi = (await t.request('POST', '/api/cases', auth({ country: 'CA', region: 'CA-NS', bureau: 'EQUIFAX' }))).json.case.case_id;
  const multiBase = '/api/cases/' + multi;
  const multiPdf = buildPdf({ pages: [{ lines: ['Equifax Consumer Credit Report', 'Report Date: June 12, 2026',
    'Creditor: Fictional Alpha', 'Account Number: ****1111', 'Balance $100', 'Opened 2020-01-01', 'Closed 2019-01-01',
    'Creditor: Fictional Beta', 'Account Number: ****2222', 'Balance $200', 'Opened 2020-02-01', 'Closed 2019-02-01'] }] });
  await t.request('POST', multiBase + '/files', auth({ originalFilename: 'fictional-ordered.pdf', declaredBytes: multiPdf.length,
    mimeType: 'application/pdf', contentBase64: multiPdf.toString('base64') }));
  await t.request('POST', multiBase + '/evaluate', auth());
  const issues = (await t.request('GET', multiBase + '/packet', auth())).json.view.eligible_issues;
  check.equal(issues.length, 2, 'two distinct supported accounts provide an order regression');
  const reverse = issues.map(i => i.issue_id).reverse();
  await t.request('POST', multiBase + '/packet/select', auth({ issue_ids: reverse }));
  const ordered = await t.preparePostalPacket(owner, multi);
  const orderedForm = await t.request('GET', ordered.packet.form_previews[0].review_url, auth());
  const formText = pdfText(orderedForm.bytes).toLowerCase();
  const orderedLetter = ordered.packet.correspondence_preview.toLowerCase();
  check.ok(orderedLetter.includes('1. fictional beta') && orderedLetter.includes('2. fictional alpha'), 'letter numbering follows the consumer selected order');
  check.ok(formText.includes('fictional beta') && formText.indexOf('fictional beta') < formText.indexOf('fictional alpha'), 'original form slots follow the same letter order');
  await t.request('POST', multiBase + '/packet/select', auth({ issue_ids: issues.map(i => i.issue_id) }));
  const reordered = (await t.request('GET', multiBase + '/packet', auth())).json.view;
  check.ok(reordered.packet.preview_version !== ordered.packet.preview_version, 'reordering the letter items changes the approved material version');
  check.equal((await t.request('GET', ordered.packet.form_previews[0].review_url, auth())).json.error.code, 'PACKET_APPROVAL_STALE', 'old form numbering cannot be reviewed as the reordered packet');
  const oneOff = await t.unpaidAccount('one-off-form-access@example.test');
  const oneId = await t.assessedCase(oneOff);
  await t.pay(oneOff, 'report_once', oneId);
  check.equal((await t.request('GET', '/api/cases/' + oneId + '/packet/preview', { token: oneOff.token })).status, 402, 'one-off assessment purchase does not grant subscriber packet access');
  check.equal((await t.request('POST', '/api/cases/' + oneId + '/packet/letter', { token: oneOff.token, body: { letter_text: 'Please check this report.' } })).status, 402, 'a one-off assessment purchase cannot bypass subscription through the full letter editor');
  check.ok(!t.logText().includes('Morgan Fiction'), 'filled consumer details are absent from application logs');
  return { owned_actual_pdf_review: true, original_form_approval_digest: true, name_parts_not_guessed: true, ordinary_business_letter: true };
}
module.exports = { run, id: 'es-filled-packet-business-letter', title: 'Populated originals and ordinary consumer letters stay reviewed, owned and approval-bound' };
