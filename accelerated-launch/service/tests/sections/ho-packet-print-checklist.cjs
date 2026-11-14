'use strict';
/**
 * ho-packet-print-checklist.cjs — the printable side of the results-to-approved-packet journey.
 *
 * The removable instruction sheet opens with one bounded checklist: the sheet itself (not mailed), the
 * letter and signing step, the exact selected report pages, the number of selected document copies (named in
 * the letter) and the packet's recorded bureau destination. This section checks the real composed PDF, the
 * approval binding, the download/print output and the signed-artifact boundary. Fictional fixtures only.
 */
const { pdfText, comparableText } = require('../packet-pdf-assertions.cjs');
const packets = require('../../packets.cjs');

async function run(t, check) {
  const owner = await t.account('packet-checklist@example.test');
  const caseId = await t.assessedCase(owner);
  const base = `/api/cases/${caseId}`;
  const req = (method, path, body) => t.request(method, base + path, { token: owner.token, body });

  const initial = (await req('GET', '/packet')).json.view;
  await req('POST', '/packet/select', {
    issue_ids: initial.eligible_issues.filter(issue => issue.eligible).map(issue => issue.issue_id)
  });
  const ready = await t.preparePostalPacket(owner, caseId);
  const version = ready.packet.preview_version;
  const requirements = ready.support.requirements;
  const pages = [...new Set((ready.packet.report_exhibits || []).flatMap(copy => copy.relevant_pages || []))]
    .sort((a, b) => a - b);
  const documentCount = ready.support.selected_document_ids.length;

  const preview = await req('GET', '/packet/preview?version=' + version);
  check.equal(preview.status, 200, 'the prepared packet preview is available to its owner');
  const flat = comparableText(pdfText(preview.bytes));
  check.ok(flat.startsWith('YOUR MAILING INSTRUCTIONS'), 'the removable instruction sheet still opens the packet');
  check.ok(flat.includes('PACKET CHECKLIST'), 'one checklist is printed on the instruction sheet');
  check.ok(flat.includes('[ ] This sheet - keep it; do not put it in the envelope.'), 'the checklist excludes the instruction sheet from mailing');
  check.ok(flat.includes('[ ] Letter - starts on page 2; sign and date it.'), 'the checklist names the letter and its signing step');
  check.ok(flat.includes(`[ ] Report pages - ${pages.length} selected: ${pages.join(', ')}.`), 'the checklist lists the exact selected report pages');
  check.ok(flat.includes(`[ ] Document copies - ${documentCount} selected (listed in your letter).`), 'the checklist counts the selected copies and points to the letter list');
  check.ok(flat.includes(`[ ] Mail to - ${requirements.label}: ${requirements.postal}.`), 'the checklist repeats the packet recorded bureau destination');
  check.ok(flat.indexOf('PACKET CHECKLIST') < flat.indexOf('1. Keep this instruction sheet'), 'the checklist appears before the numbered mailing steps');

  const approved = await req('POST', '/packet/approve', { reviewed_version: version });
  check.equal(approved.status, 200, 'the packet containing the checklist is approved through the existing version gate');
  const printed = packets.packetPrint(t.service.store, owner, caseId);
  check.equal(printed.sections[0].kind, 'instructions', 'the checklist remains on the first, non-mailable sheet');
  check.equal(printed.sections[0].send_to_bureau, false, 'the checklist sheet is never bureau correspondence');
  check.equal(printed.sections.find(section => section.kind === 'letter').start_page, 2, 'the sendable letter still begins on page two');
  check.ok(comparableText(pdfText(printed.body)).includes(`[ ] Mail to - ${requirements.label}: ${requirements.postal}.`), 'the approved print keeps the same checklist destination');
  const download = await req('GET', '/packet-download');
  check.equal(download.status, 200, 'the approved download is available');
  check.ok(comparableText(pdfText(download.bytes)).includes('PACKET CHECKLIST'), 'the download carries the same checklist');

  /* The signed mailing artifact deliberately has no private instruction sheet, so it carries no checklist. */
  const signature = { name: 'Fictional Morgan Sample', date: '2026-10-21', consent: true };
  const signed = await req('POST', '/packet/signature', { reviewed_version: version, signature });
  check.equal(signed.status, 200, 'the owner can choose the signed mailing artifact');
  const signedPreview = await req('GET', '/packet/preview?version=' + signed.json.view.packet.preview_version);
  check.equal(comparableText(pdfText(signedPreview.bytes)).includes('PACKET CHECKLIST'), false, 'the signed mailing copy carries no private checklist sheet');

  /* Bounded helper: a large packet cannot push the fixed one-page sheet past its line limit. */
  const synthetic = {
    report_snapshot: { copies: [{ relevant_pages: [7, 3, 3] }, { relevant_pages: Array.from({ length: 38 }, (_, index) => index + 1) }] },
    support_snapshot: { requirements: { label: 'Fictional Bureau', postal: 'PO Box 1, Example City' }, documents: new Array(8).fill({}) }
  };
  const lines = packets.packetChecklistLines(synthetic);
  check.equal(lines.length, 6, 'the checklist stays six short lines regardless of attachment count');
  check.ok(lines[3].includes('38 selected: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12 and 26 more'), 'the page list is deduplicated, sorted and honestly bounded');
  check.ok(lines.every(line => line.length < 200), 'no checklist line can overwhelm the fixed instruction sheet');
  check.deepEqual(packets.packetChecklistLines({}), [], 'no recorded postal destination means no invented checklist');
  check.deepEqual(packets.packetChecklistLines({ support_snapshot: { requirements: { label: 'Bureau', postal: null } } }), [], 'a missing destination is never invented');

  return {
    checklist_on_instruction_sheet: true,
    exact_report_pages: pages,
    destination_label: requirements.label,
    signed_copy_excludes_checklist: true,
    bounded_lines: true,
    live_charge: false,
    postal_dispatch: false
  };
}

module.exports = {
  run,
  id: 'ho-packet-print-checklist',
  title: 'Printable packet checklist: pages, selected copies and the recorded bureau destination on the removable instruction sheet'
};

