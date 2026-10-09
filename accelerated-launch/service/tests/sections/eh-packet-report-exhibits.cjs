'use strict';
// Real retained upload -> selected issue -> relevant original pages -> one approved PDF.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const packets = require('../../packets.cjs');
const exhibits = require('../../packet-report-exhibits.cjs');
const zip = require('../../packet-archive.cjs');
const { pdfText, zipEntries, comparableText } = require('../packet-pdf-assertions.cjs');
const { PDFDocument } = require('../../pdf-vendor/pdf-lib-1.17.1.min.js');
const { buildPdf } = require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const upload = (bytes, name, mime = 'application/pdf') => ({ originalFilename: name, declaredBytes: bytes.length,
  mimeType: mime, contentBase64: bytes.toString('base64') });
const auth = (actor, body) => ({ token: actor.token, body });

// Independent Poppler checks: a PDF merge changes container bytes, but must not
// change the appearance or content of the original source pages it includes.
function pdfPages(bytes) {
  return execFileSync('pdftotext', ['-layout', '-', '-'], { input: bytes, encoding: 'utf8',
    timeout: 30000, maxBuffer: 32 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'] })
    .replace(/\r/g, '').split('\f').filter((page, index, all) => index < all.length - 1 || page.trim())
    .map(page => page.replace(/^\s*Page \d+ of \d+\s*$/gm, '').trim());
}
function matchingPage(bytes, text) {
  return pdfPages(bytes).findIndex(page => comparableText(page) === comparableText(text)) + 1;
}
function sameRenderedPage(check, dir, original, originalPage, packet, packetPage, label) {
  if (packetPage < 1) { check.ok(false, label + ' has its own original page in the complete PDF'); return; }
  const render = (bytes, page, name) => {
    const file = path.join(dir, name + '.pdf'), prefix = path.join(dir, name);
    fs.writeFileSync(file, bytes);
    execFileSync('pdftoppm', ['-f', String(page), '-l', String(page), '-singlefile', '-r', '72', '-png', file, prefix],
      { timeout: 30000, stdio: 'pipe' });
    return fs.readFileSync(prefix + '.png');
  };
  check.equal(hash(render(packet, packetPage, 'merged-page')), hash(render(original, originalPage, 'source-page')),
    label + ' retains the original artwork, text, page size and placement');
}

async function report(t, actor, year, anchor, name, extra = []) {
  const created = await t.request('POST', '/api/cases', auth(actor, { country: 'US', region: 'US-NY', bureau: 'EQUIFAX' }));
  const caseId = created.json.case.case_id, base = '/api/cases/' + caseId;
  const bytes = buildPdf({ pages: [{ lines: [
    'Equifax Consumer Credit Report - FICTIONAL TEST FIXTURE', `Report Date: June 12, ${year}`,
    'Creditor A Balance $100', 'Account Number ****1234', 'Status: Charged Off',
    'Opened 01/01/2010', `First Delinquency Date 01/01/${anchor}`, 'Last Payment Date 01/01/2017', ...extra
  ] }] });
  const saved = await t.request('POST', base + '/files', auth(actor, upload(bytes, name)));
  const assessed = await t.request('POST', base + '/evaluate', auth(actor));
  return { caseId, base, bytes, fileId: saved.json.receipt.file_id, resultId: assessed.json.result_id };
}
function row(t, fixture) { return t.service.store.state().results.find(item => item.result_id === fixture.resultId); }
function issue(t, fixture, id) { return packets.eligibleIssues(row(t, fixture)).find(item => item.check_id === id); }
async function select(t, actor, fixture, ids) { return t.request('POST', fixture.base + '/packet/select', auth(actor, { issue_ids: ids })); }
async function choose(t, actor, fixture, ids, pageChoices) { return t.request('POST', fixture.base + '/packet/reports',
  auth(actor, { file_ids: ids, ...(pageChoices === undefined ? {} : { page_choices: pageChoices }) })); }
async function approve(t, actor, fixture, view) {
  return t.request('POST', fixture.base + '/packet/approve', auth(actor, { reviewed_version: view.packet.preview_version }));
}
async function ready(t, actor, fixture, ids) {
  const chosen = await choose(t, actor, fixture, ids);
  if (chosen.status !== 200) throw new Error('report choice failed: ' + chosen.text);
  const view = await t.preparePostalPacket(actor, fixture.caseId);
  const approved = await approve(t, actor, fixture, view);
  if (approved.status !== 200) throw new Error('report approval failed: ' + approved.text);
  return view;
}
async function refusedCopies(t, check, actor, fixture, label) {
  for (const suffix of ['/packet', '/packet-download', '/packet-print', '/packet/reports/' + fixture.fileId]) {
    const response = await t.request('GET', fixture.base + suffix, auth(actor));
    check.equal(response.status, 409, label + ' refuses ' + suffix);
    check.equal(response.json.error.code, 'PACKET_APPROVAL_STALE', label + ' has a typed stale-custody refusal');
  }
}

async function run(t, check) {
  const actor = await t.account('eh-reports@example.test'), stranger = await t.account('eh-stranger@example.test');
  const earlier = await report(t, actor, '2025', '2018', 'earlier report.pdf');
  const current = await report(t, actor, '2026', '2020', 'current report.pdf', [
    'Creditor B Balance $300 Opened 01/01/2022 Closed 01/01/2021'
  ]);
  const unrelated = await report(t, actor, '2024', '2019', 'unrelated report.pdf');
  const reaging = issue(t, current, 'COMMON-ERROR-POTENTIAL-RE-AGING-SIGNAL');
  check.ok(reaging, 'the real owned stored report pair supports re-aging');
  if (!reaging) throw new Error('required real re-aging fixture unavailable');
  check.deepEqual((await t.request('GET', current.base + '/packet', auth(actor))).json.view.packet.report_exhibits,
    [], 'no report copies are exposed before issue selection');
  const selected = await select(t, actor, current, [reaging.issue_id]);
  check.equal(selected.status, 200, 'a real re-aging issue is selectable');
  const offered = selected.json.view.packet.report_exhibits;
  check.equal(offered.length, 2, 'only the exact earlier and current source reports are offered');
  check.deepEqual(offered.map(copy => copy.file_id).sort(), [earlier.fileId, current.fileId].sort(), 'an unrelated same-owner report is not offered');
  check.equal(offered.every(copy => copy.selected === true), true, 'selected issues automatically include their exact source report pages');
  check.deepEqual(selected.json.view.packet.report_attachment_manifest.map(copy => copy.file_id).sort(),
    [earlier.fileId, current.fileId].sort(), 'both comparison sources are part of the reviewed complete packet');
  for (const [fixture, role, date] of [[earlier, 'EARLIER', '2025-06-12'], [current, 'CURRENT', '2026-06-12']]) {
    const copy = offered.find(item => item.file_id === fixture.fileId);
    check.equal(copy.role, role, 'each copy keeps its report role');
    check.deepEqual(copy.roles, [role], 'report roles are deduplicated');
    check.equal(copy.label, `${role === 'EARLIER' ? 'Earlier' : 'Current'} report — ${date}`, 'report labels are readable and dated');
    check.equal(copy.page_count, 1, 'total original page count is shown');
    check.deepEqual(copy.relevant_pages, [1], 'actual evidence pages are shown');
    check.equal(copy.scope, 'RELEVANT_PAGES', 'only source-linked relevant pages are included');
    const opened = await t.request('GET', copy.review_url, auth(actor));
    check.equal(opened.status, 200, 'a consumer can review an allowed copy before choosing it');
    check.deepEqual(opened.bytes, fixture.bytes, 'review serves exact original uploaded bytes');
    check.equal(opened.headers.get('content-type'), 'application/pdf', 'the original PDF is served as a PDF');
    check.match(opened.headers.get('content-disposition'), /^inline;/, 'review opens the copy inline');
  }
  const evidenceBefore = hash(Buffer.from(JSON.stringify([row(t, earlier), row(t, current)])));
  const opted = await choose(t, actor, current, [earlier.fileId, current.fileId, current.fileId]);
  check.equal(opted.status, 200, 'explicit duplicate source choices are safely deduplicated');
  check.equal(opted.json.view.packet.report_attachment_manifest.length, 2, 'the reviewed manifest contains each original once');
  check.equal(opted.json.view.packet.report_exhibits.every(copy => copy.selected), true, 'compatible saved file IDs do not duplicate automatically included report pages');
  const prepared = await t.preparePostalPacket(actor, current.caseId);
  check.ok(!/Entire report|PRINT AND MAIL|EVIDENCE REFERENCES/.test(prepared.packet.correspondence_preview),
    'the bureau letter contains no whole-report manifest or consumer print instructions');
  check.ok(/report page 1/i.test(prepared.packet.correspondence_preview), 'report evidence references are written naturally in the letter');
  check.ok(prepared.packet.print_instructions.some(line => /print every page/i.test(line)), 'simple print instructions stay outside the packet');
  const preview = await t.request('GET', prepared.packet.letter_preview_url, auth(actor));
  check.equal(preview.status, 200, 'the consumer reviews the complete PDF before approval');
  check.equal((await approve(t, actor, current, prepared)).status, 200, 'the consumer approves the reviewed original-report material');
  const downloaded = await t.request('GET', current.base + '/packet-download', auth(actor));
  check.equal(downloaded.status, 200, 'the approved full packet downloads');
  check.equal(downloaded.headers.get('content-type'), 'application/pdf', 'the full approved packet is one PDF');
  check.match(downloaded.headers.get('content-disposition'), /\.pdf"?$/, 'the complete packet downloads with a PDF filename');
  const pages = pdfPages(downloaded.bytes);
  for (const fixture of [earlier, current]) {
    const originalText = pdfPages(fixture.bytes)[0], includedPage = matchingPage(downloaded.bytes, originalText);
    check.ok(includedPage > 1, 'each earlier/current original source page appears after the letter');
    sameRenderedPage(check, t.dataDir, fixture.bytes, 1, downloaded.bytes, includedPage, fixture.fileId + ' report page');
  }
  check.equal(matchingPage(downloaded.bytes, pdfPages(unrelated.bytes)[0]), 0, 'a same-owner unrelated private report stays out of the complete PDF');
  check.ok(comparableText(pages[0]).startsWith(comparableText(prepared.packet.correspondence_preview)),
    'the first PDF page contains the complete consumer-reviewed one-issue letter');
  check.equal(/Creditor B/.test(pages[0]), false,
    'an unselected account sharing the original report page adds no request to the letter');
  check.equal(/PRINT AND MAIL|Print report page|Download your packet PDF/i.test(pages.join('\n')), false,
    'consumer print and mail instructions do not become pages sent to the bureau');
  const printed = await t.request('GET', current.base + '/packet-print', auth(actor));
  check.deepEqual(printed.bytes, downloaded.bytes, 'print and download serve the same approved complete PDF');
  check.deepEqual(preview.bytes, downloaded.bytes, 'approval preserves every page of the complete PDF the consumer reviewed');
  const editable = await PDFDocument.load(downloaded.bytes);
  check.ok(editable.getForm().getFields().some(field => !field.isReadOnly()), 'the complete PDF retains consumer-editable fields');
  check.equal(hash(Buffer.from(JSON.stringify([row(t, earlier), row(t, current)]))), evidenceBefore,
    'report selection and delivery leave the source results and classifications unchanged');
  const out = path.join(__dirname, '../../out/batch66-report-exhibits'); fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'approved-packet.pdf'), downloaded.bytes);
  fs.writeFileSync(path.join(out, 'approved-preview.txt'), prepared.packet.correspondence_preview);

  check.equal((await t.request('GET', offered[0].review_url, auth(stranger))).status, 403, 'another account cannot open the packet sources');
  check.equal((await t.request('GET', offered[0].review_url)).status, 401, 'source review requires a signed-in session');
  check.equal((await choose(t, stranger, current, [current.fileId])).status, 403, 'another account cannot change report choices');
  check.equal((await t.request('GET', current.base + '/packet/reports/' + unrelated.fileId, auth(actor))).status, 400,
    'an unrelated owned report cannot be opened through a packet');
  check.equal((await choose(t, actor, current, [unrelated.fileId])).status, 400, 'an unrelated owned report cannot be added');
  const foreign = await report(t, stranger, '2026', '2020', 'foreign.pdf');
  check.equal((await choose(t, actor, current, [foreign.fileId])).status, 403, 'a foreign original cannot be selected');
  check.equal((await t.request('GET', current.base + '/packet/reports/' + foreign.fileId, auth(actor))).status, 403,
    'a foreign original cannot be opened through an owned packet');
  const unpaid = await t.unpaidAccount('eh-unpaid@example.test');
  const unpaidReport = await report(t, unpaid, '2026', '2020', 'unpaid.pdf', ['Creditor B Balance $300 Opened 01/01/2022 Closed 01/01/2021']);
  check.equal((await choose(t, unpaid, unpaidReport, [])).status, 402, 'report-copy selection retains the subscription gate');
  check.equal((await t.request('GET', unpaidReport.base + '/packet/reports/' + unpaidReport.fileId, auth(unpaid))).status, 402,
    'opening an owned report through the packet retains the subscription gate');

  const previousVersion = prepared.packet.preview_version;
  const removed = await choose(t, actor, current, [current.fileId]);
  check.equal(removed.json.view.packet.approved, false, 'changing original-copy selection clears approval');
  check.equal(removed.json.view.packet.preview_version, previousVersion, 'obsolete opt-in choices cannot remove or change automatically included source pages');
  check.deepEqual(removed.json.view.packet.report_attachment_manifest.map(copy => copy.file_id).sort(),
    [earlier.fileId, current.fileId].sort(), 'saving only a current file ID still includes the required earlier comparison page');
  check.equal((await t.request('GET', current.base + '/packet-download', auth(actor))).status, 409, 'changed copy selection requires rereview');
  await ready(t, actor, current, [earlier.fileId, current.fileId]);
  const dateIssue = issue(t, current, 'COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY');
  check.ok(dateIssue, 'the same current report has an independent second account issue');
  const changedIssue = await select(t, actor, current, [dateIssue.issue_id]);
  check.deepEqual(changedIssue.json.view.packet.report_attachment_manifest.map(copy => copy.file_id), [current.fileId],
    'changing issues removes the earlier page and includes only the new issue’s current source');
  check.equal(changedIssue.json.view.packet.report_exhibits.length, 1, 'deselected earlier evidence is no longer offered');
  await select(t, actor, current, [reaging.issue_id]);
  await ready(t, actor, current, [earlier.fileId, current.fileId]);
  t.service.store.putBlob(current.fileId, Buffer.concat([current.bytes, Buffer.from('\nTAMPERED')]));
  await refusedCopies(t, check, actor, current, 'changed original bytes');
  check.equal((await select(t, actor, current, [reaging.issue_id])).json.error.code, 'PACKET_APPROVAL_STALE',
    'saving the same issues cannot silently remove a chosen original with invalid custody');
  const resetTampered = await choose(t, actor, current, []);
  check.equal(resetTampered.status, 409, 'an obsolete empty opt-in cannot bypass changed required report custody');
  check.equal(resetTampered.json.error.code, 'PACKET_APPROVAL_STALE', 'required report pages remain bound after a reset attempt');
  t.service.store.putBlob(current.fileId, current.bytes);
  await ready(t, actor, current, [earlier.fileId, current.fileId]);
  check.equal((await t.request('GET', current.base + '/packet-download', auth(actor))).status, 200,
    'the restored exact source pages can be rereviewed');
  t.service.store.update(state => { state.files.find(file => file.file_id === current.fileId).account_id = stranger.account_id; });
  for (const suffix of ['/packet', '/packet-download', '/packet-print']) {
    check.equal((await t.request('GET', current.base + suffix, auth(actor))).json.error.code, 'PACKET_APPROVAL_STALE',
      'changed source ownership refuses the selected packet');
  }
  t.service.store.update(state => { state.files.find(file => file.file_id === current.fileId).account_id = actor.account_id; });
  const priorRecord = JSON.parse(JSON.stringify(row(t, earlier).extraction.records[0]));
  t.service.store.update(state => { state.results.find(result => result.result_id === earlier.resultId).extraction.records[0].facts['liability.openedDate'] = '2011-01-01'; });
  await refusedCopies(t, check, actor, current, 'changed earlier source record');
  t.service.store.update(state => { state.results.find(result => result.result_id === earlier.resultId).extraction.records[0] = priorRecord; });
  await t.request('DELETE', earlier.base, auth(actor));
  await refusedCopies(t, check, actor, current, 'deleted earlier source case');
  check.equal((await choose(t, actor, current, [])).json.error.code, 'PACKET_APPROVAL_STALE',
    'deleting an earlier source cannot be hidden by clearing obsolete opt-in choices');

  await multipageAndImage(t, check, actor);
  await continuationAndReset(t, check, actor, unrelated);
  archiveBounds(check);
  check.equal(t.logText().includes('Account Number ****1234'), false, 'source report content never enters service logs');
  return { original_report_pages_preserved: true, both_reaging_sources: true, automatically_included_relevant_pages: true,
    selected_issue_sources_only: true, review_and_approval_binding: true, mutation_and_deletion_refused: true,
    multipage_and_image_originals: true, editable_complete_pdf: true, legacy_unstored_fixture_compatible: true };
}

async function continuationAndReset(t, check, actor, unrelated) {
  const caseId = (await t.request('POST', '/api/cases', auth(actor, { country: 'US', region: 'US-NY', bureau: 'EQUIFAX' }))).json.case.case_id;
  const fixture = { caseId, base: '/api/cases/' + caseId }, files = [];
  for (const [name, lines] of [
    ['account-start.pdf', ['Equifax Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor C Balance $100 Opened 01/01/2022']],
    ['account-continued.pdf', ['Equifax Consumer Credit Report', 'Closed 01/01/2021']]
  ]) {
    const bytes = buildPdf({ pages: [{ lines }] });
    const response = await t.request('POST', fixture.base + '/files', auth(actor, upload(bytes, name)));
    files.push({ fileId: response.json.receipt.file_id, bytes });
  }
  fixture.resultId = (await t.request('POST', fixture.base + '/evaluate', auth(actor))).json.result_id;
  const positive = issue(t, fixture, 'COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY');
  check.ok(positive, 'real adjacent uploads support the ordinary account-continuation contradiction');
  if (!positive) throw new Error('required continuation fixture unavailable');
  const selected = await select(t, actor, fixture, [positive.issue_id]);
  check.deepEqual(selected.json.view.packet.report_exhibits.map(copy => copy.file_id).sort(), files.map(file => file.fileId).sort(),
    'both genuine source files of the selected merged account are offered');
  const source = JSON.parse(JSON.stringify(positive));
  const closure = source.rule_assessment.required_facts.find(fact => fact.field === 'liability.closedDate');
  closure.source.location.file_id = files[1].fileId;
  check.deepEqual(exhibits.available(t.service.store, actor, row(t, fixture), [source]).map(copy => copy.file_id).sort(),
    files.map(file => file.fileId).sort(), 'an explicitly located field on a declared continuation keeps both source copies available');
  const ambiguous = JSON.parse(JSON.stringify(source));
  ambiguous.rule_assessment.required_facts.find(fact => fact.field === 'liability.closedDate').source.source_file_id = files[0].fileId;
  check.deepEqual(exhibits.available(t.service.store, actor, row(t, fixture), [ambiguous]), [],
    'conflicting explicit file pointers refuse both ambiguous copies rather than choosing one');
  const escaped = JSON.parse(JSON.stringify(source));
  escaped.rule_assessment.required_facts.find(fact => fact.field === 'liability.closedDate').source.location.file_id = unrelated.fileId;
  const disallowed = exhibits.available(t.service.store, actor, row(t, fixture), [escaped]);
  check.equal(disallowed.some(copy => copy.file_id === unrelated.fileId), false,
    'an undeclared same-owner source file never becomes a continuation exhibit');
  const view = await ready(t, actor, fixture, files.map(file => file.fileId));
  const downloaded = await t.request('GET', fixture.base + '/packet-download', auth(actor));
  for (const file of files) {
    const originalText = pdfPages(file.bytes)[0], includedPage = matchingPage(downloaded.bytes, originalText);
    check.ok(includedPage > 1, 'each actual continuation source page reaches the approved complete PDF');
    sameRenderedPage(check, t.dataDir, file.bytes, 1, downloaded.bytes, includedPage, 'continuation page');
  }
  await t.request('POST', fixture.base + '/evaluate', auth(actor));
  check.equal((await choose(t, actor, fixture, [files[0].fileId])).json.error.code, 'PACKET_APPROVAL_STALE',
    'nonempty report choices cannot bypass a changed current result');
  const reset = await choose(t, actor, fixture, []);
  check.equal(reset.status, 200, 'explicit reset works after the current result changed');
  check.equal(reset.json.view.packet.approved, false, 'reset after re-evaluation removes approval');
  check.deepEqual(reset.json.view.packet.report_attachment_manifest.map(copy => copy.file_id).sort(), files.map(file => file.fileId).sort(),
    'an obsolete copy reset does not remove the actual source pages of the selected issue');
  check.equal((await t.request('GET', fixture.base + '/packet-download', auth(actor))).json.error.code, 'PACKET_NOT_APPROVED',
    'clearing approval after re-evaluation cannot deliver the obsolete selected result');
  // No eligible current issues: resetting obsolete opt-in state cannot invent a current finding.
  t.service.store.update(state => { const latest = state.results.filter(result => result.case_id === fixture.caseId).at(-1);
    latest.evaluation = {}; latest.extraction.records = []; });
  check.equal((await choose(t, actor, fixture, [])).json.error.code, 'PACKET_APPROVAL_STALE',
    'an obsolete copy reset refuses an unavailable current finding and never manufactures one');
  check.notEqual(view.packet.preview_version, reset.json.view.packet.preview_version, 'changed result remains bound to a different preview');
}

async function multipageAndImage(t, check, actor) {
  const created = await t.request('POST', '/api/cases', auth(actor, { country: 'US', region: 'US-NY', bureau: 'EQUIFAX' }));
  const fixture = { caseId: created.json.case.case_id }; fixture.base = '/api/cases/' + fixture.caseId;
  const bytes = buildPdf({ pages: [
    { lines: ['Equifax Consumer Credit Report - FICTIONAL TEST FIXTURE', 'Report Date: June 12, 2026'] },
    { lines: ['Creditor D Balance $100 Opened 01/01/2022 Closed 01/01/2021'] },
    { lines: ['Creditor E Balance $200 Opened 01/01/2020 Closed 01/01/2021'] }
  ] });
  const stored = await t.request('POST', fixture.base + '/files', auth(actor, upload(bytes, 'three-page report.pdf')));
  fixture.fileId = stored.json.receipt.file_id;
  fixture.resultId = (await t.request('POST', fixture.base + '/evaluate', auth(actor))).json.result_id;
  const positive = issue(t, fixture, 'COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY');
  check.ok(positive, 'a genuine multipage upload offers the sourced contradiction');
  const selected = await select(t, actor, fixture, [positive.issue_id]);
  const offered = selected.json.view.packet.report_exhibits[0];
  check.equal(offered.page_count, 3, 'the source report declares its original page count');
  check.deepEqual(offered.relevant_pages, [2], 'the disputed account page retains its original page number without an unrelated cover');
  const view = await ready(t, actor, fixture, [fixture.fileId]);
  check.equal(view.packet.report_attachment_manifest[0].scope, 'RELEVANT_PAGES', 'approval covers relevant source pages rather than the whole report');
  const download = await t.request('GET', fixture.base + '/packet-download', auth(actor));
  for (const page of [2]) {
    const includedPage = matchingPage(download.bytes, pdfPages(bytes)[page - 1]);
    check.ok(includedPage > 1, 'each source-linked multipage report page appears after the letter');
    sameRenderedPage(check, t.dataDir, bytes, page, download.bytes, includedPage, 'multipage report page ' + page);
  }
  check.equal(matchingPage(download.bytes, pdfPages(bytes)[0]), 0, 'the unneeded report cover is absent from the complete PDF');
  check.equal(matchingPage(download.bytes, pdfPages(bytes)[2]), 0, 'the unrelated third report page is absent from the complete PDF');
  check.equal(/Creditor E/.test(pdfText(download.bytes)), false, 'an unrelated account on an excluded page stays out of the packet');
  unknownPageChoices(t, check, actor, fixture, positive);
  // Genuine scanned image, generated from the same fictional ordinary report.
  const imagePdf = buildPdf({ pages: [{ lines: ['Equifax Consumer Credit Report', 'Report Date: June 12, 2026',
    'Creditor Image Balance $100 Opened 01/01/2022 Closed 01/01/2021'] }] });
  const input = path.join(t.dataDir, 'image-source.pdf'), prefix = path.join(t.dataDir, 'image-source');
  fs.writeFileSync(input, imagePdf);
  execFileSync('pdftoppm', ['-singlefile', '-r', '200', '-png', input, prefix], { timeout: 30000, stdio: 'pipe' });
  const png = fs.readFileSync(prefix + '.png');
  const imageCase = (await t.request('POST', '/api/cases', auth(actor, { country: 'US', region: 'US-NY', bureau: 'EQUIFAX' }))).json.case.case_id;
  const image = { caseId: imageCase, base: '/api/cases/' + imageCase };
  const imageStored = await t.request('POST', image.base + '/files', auth(actor, upload(png, 'scanned report.png', 'image/png')));
  image.fileId = imageStored.json.receipt.file_id;
  image.resultId = (await t.request('POST', image.base + '/evaluate', auth(actor))).json.result_id;
  const imageIssue = issue(t, image, 'COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY');
  check.ok(imageIssue, 'the genuine image OCR path offers the source-linked issue');
  if (!imageIssue) throw new Error('required image issue unavailable');
  const imageSelection = await select(t, actor, image, [imageIssue.issue_id]);
  const imageCopy = imageSelection.json.view.packet.report_exhibits[0];
  check.equal(imageCopy.content_type, 'image/png', 'source-copy MIME comes from original image bytes');
  check.equal(imageCopy.page_count, 1, 'an original uploaded image is one whole page');
  check.deepEqual((await t.request('GET', imageCopy.review_url, auth(actor))).bytes, png, 'image review returns the unchanged uploaded image');
  await ready(t, actor, image, []);
  const imageDownload = await t.request('GET', image.base + '/packet-download', auth(actor));
  check.equal(imageDownload.headers.get('content-type'), 'application/pdf', 'a scanned report is included in the same complete PDF');
  const imageOut = path.join(t.dataDir, 'image-packet.pdf'), extracted = path.join(t.dataDir, 'image-exhibit');
  fs.writeFileSync(imageOut, imageDownload.bytes);
  execFileSync('pdfimages', ['-png', imageOut, extracted], { timeout: 30000, stdio: 'pipe' });
  const imageFiles = fs.readdirSync(t.dataDir).filter(name => name.startsWith('image-exhibit-') && name.endsWith('.png'));
  check.ok(imageFiles.length > 0, 'the scanned report is actual embedded artwork, not an OCR transcription');
  const imagePixels = pngPixels(png);
  check.ok(imageFiles.some(name => {
    const copy = fs.readFileSync(path.join(t.dataDir, name));
    return copy.readUInt32BE(16) === png.readUInt32BE(16) && copy.readUInt32BE(20) === png.readUInt32BE(20)
      && copy.readUInt8(25) === png.readUInt8(25) && pngPixels(copy).equals(imagePixels);
  }), 'the embedded scanned artwork retains its original resolution and pixel rows');
  // A genuinely unretained historical source is represented before selection;
  // removing custody from an already-reviewed retained source is never legacy.
  const legacyFixture = await report(t, actor, '2026', '2020', 'legacy-unretained.pdf',
    ['Creditor Legacy Balance $100 Opened 01/01/2022 Closed 01/01/2021']);
  t.service.store.update(state => { const file = state.files.find(item => item.file_id === fixture.fileId);
    file.stored_blob = false; delete file.stored_sha256; });
  check.equal((await t.request('GET', fixture.base + '/packet-download', auth(actor))).json.error.code, 'PACKET_APPROVAL_STALE',
    'removing retained-source metadata cannot silently drop an approved report exhibit');
  t.service.store.update(state => { const file = state.files.find(item => item.file_id === legacyFixture.fileId);
    file.stored_blob = false; delete file.stored_sha256; });
  const legacyIssue = issue(t, legacyFixture, 'COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY');
  await select(t, actor, legacyFixture, [legacyIssue.issue_id]);
  const legacy = await t.request('GET', legacyFixture.base + '/packet', auth(actor));
  check.equal(legacy.status, 200, 'an old fixture without retained report bytes gains no mandatory evidence gate');
  check.deepEqual(legacy.json.view.packet.report_exhibits, [], 'unavailable legacy source copies stay internal');
  const legacyReady = await t.preparePostalPacket(actor, legacyFixture.caseId);
  check.equal((await approve(t, actor, legacyFixture, legacyReady)).status, 200,
    'an independently supported old fixture still approves through its existing packet gates');
  check.equal((await t.request('GET', legacyFixture.base + '/packet-download', auth(actor))).status, 200,
    'legacy packet delivery remains usable when no unavailable original was chosen');
}

function pngData(bytes) {
  const chunks = []; let offset = 8;
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset), type = bytes.toString('ascii', offset + 4, offset + 8);
    if (type === 'IDAT') chunks.push(bytes.subarray(offset + 8, offset + 8 + length));
    offset += 12 + length;
  }
  return Buffer.concat(chunks);
}
function pngPixels(bytes) {
  const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20), kind = bytes.readUInt8(25);
  if (bytes.readUInt8(24) !== 8 || ![2, 6].includes(kind) || bytes.readUInt8(28)) throw new Error('expected noninterlaced RGB/RGBA PNG');
  const channels = kind === 2 ? 3 : 4, stride = width * channels,
    input = require('node:zlib').inflateSync(pngData(bytes)), pixels = Buffer.alloc(stride * height);
  const paeth = (a, b, c) => { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c; };
  for (let row = 0; row < height; row++) {
    const start = row * (stride + 1), filter = input[start];
    if (filter > 4) throw new Error('unknown PNG filter');
    for (let at = 0; at < stride; at++) {
      const pos = row * stride + at, a = at >= channels ? pixels[pos - channels] : 0,
        b = row ? pixels[pos - stride] : 0, c = row && at >= channels ? pixels[pos - stride - channels] : 0;
      pixels[pos] = (input[start + 1 + at] + (filter === 1 ? a : filter === 2 ? b : filter === 3 ? Math.floor((a + b) / 2)
        : filter === 4 ? paeth(a, b, c) : 0)) & 255;
    }
  }
  return pixels;
}

function unknownPageChoices(t, check, actor, fixture, positive) {
  const source = JSON.parse(JSON.stringify(row(t, fixture))), selected = JSON.parse(JSON.stringify(positive));
  const erasePages = value => { if (!value || typeof value !== 'object') return; delete value.page;
    Object.values(value).forEach(erasePages); };
  erasePages(source.extraction.records); erasePages(selected);
  const prepared = exhibits.prepare(t.service.store, actor, fixture.caseId, source, [selected], []);
  check.deepEqual(prepared.manifest[0].relevant_pages, [], 'a multipage source without page provenance is never guessed as page one');
  check.equal(prepared.missing.length, 1, 'unknown multipage provenance asks the consumer to choose the relevant pages');
  const chosen = exhibits.prepare(t.service.store, actor, fixture.caseId, source, [selected], [], { [fixture.fileId]: [2, 2] });
  check.deepEqual(chosen.manifest[0].relevant_pages, [2], 'explicit page choices are safely deduplicated');
  check.equal(chosen.missing.length, 0, 'choosing a real source page resolves the page-only packet gap');
  check.notEqual(hash(Buffer.from(JSON.stringify(chosen.material))), hash(Buffer.from(JSON.stringify(prepared.material))),
    'consumer page choices change the canonical report approval material');
  for (const pages of [[0], [4], [1.5], ['2']]) {
    let code; try { exhibits.prepare(t.service.store, actor, fixture.caseId, source, [selected], [], { [fixture.fileId]: pages }); }
    catch (error) { code = error.code; }
    check.equal(code, 'INVALID_REQUEST', 'page choices must use an actual one-based source page');
  }
}

function archiveBounds(check) {
  const seventeen = Array.from({ length: 17 }, (_, index) => ({ name: `report-${index}.pdf`, bytes: Buffer.from('original-' + index) }));
  check.equal(zipEntries(zip.archive(seventeen)).length, 17, 'actual ZIP entries exceed the obsolete 16-entry cap and retain CRC-valid originals');
  const bounded = Array.from({ length: zip.MAX_ARCHIVE_ENTRIES }, (_, index) => ({ name: `report-${index}.pdf`, bytes: Buffer.from([index % 256]) }));
  check.equal(zipEntries(zip.archive(bounded)).length, zip.MAX_ARCHIVE_ENTRIES, 'the declared bounded entry capacity has a complete valid central directory');
  let rejected = false; try { zip.archive([...bounded, { name: 'overflow.pdf', bytes: Buffer.from('overflow') }]); } catch { rejected = true; }
  check.ok(rejected, 'entry overflow is refused before producing a packet');
  rejected = false; try { zip.archive([seventeen[0], seventeen[0]]); } catch { rejected = true; }
  check.ok(rejected, 'duplicate archive names cannot hide or replace a reviewed original');
  rejected = false; try { exhibits.normalizedSelection(Array.from({ length: exhibits.MAX_REPORT_EXHIBITS + 1 }, (_, index) => index.toString(16).padStart(32, '0'))); } catch { rejected = true; }
  check.ok(rejected, 'original-copy selection stays within the archive capacity');
}

module.exports = { run, pdfPages, matchingPage, sameRenderedPage, id: 'eh-packet-report-exhibits',
  title: 'Selected-issue relevant report pages, source custody, approval and one editable printable PDF' };
