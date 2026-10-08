'use strict';
// Real retained upload -> selected issue -> opt-in original -> approval -> ZIP.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const packets = require('../../packets.cjs');
const exhibits = require('../../packet-report-exhibits.cjs');
const zip = require('../../packet-archive.cjs');
const { zipEntries, comparableText } = require('../packet-pdf-assertions.cjs');
const { buildPdf } = require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const upload = (bytes, name, mime = 'application/pdf') => ({ originalFilename: name, declaredBytes: bytes.length,
  mimeType: mime, contentBase64: bytes.toString('base64') });
const auth = (actor, body) => ({ token: actor.token, body });

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
async function choose(t, actor, fixture, ids) { return t.request('POST', fixture.base + '/packet/reports', auth(actor, { file_ids: ids })); }
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
  check.equal(offered.every(copy => copy.selected === false), true, 'whole private reports are never selected automatically');
  check.deepEqual(selected.json.view.packet.report_attachment_manifest, [], 'no report copy is in the packet before explicit opt-in');
  for (const [fixture, role, date] of [[earlier, 'EARLIER', '2025-06-12'], [current, 'CURRENT', '2026-06-12']]) {
    const copy = offered.find(item => item.file_id === fixture.fileId);
    check.equal(copy.role, role, 'each copy keeps its report role');
    check.deepEqual(copy.roles, [role], 'report roles are deduplicated');
    check.equal(copy.label, `${role === 'EARLIER' ? 'Earlier' : 'Current'} report — ${date}`, 'report labels are readable and dated');
    check.equal(copy.page_count, 1, 'total original page count is shown');
    check.deepEqual(copy.relevant_pages, [1], 'actual evidence pages are shown');
    check.equal(copy.scope, 'ENTIRE_REPORT', 'the full-file scope is explicit');
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
  check.equal(opted.json.view.packet.report_exhibits.every(copy => copy.selected), true, 'only the explicit choice marks originals selected');
  const prepared = await t.preparePostalPacket(actor, current.caseId);
  check.ok(prepared.packet.correspondence_preview.includes('Entire report (1 page).'), 'the exact correspondence preview states the complete file scope');
  check.ok(prepared.packet.print_instructions.some(line => /Print report page 1/.test(line)), 'print instructions name the actual original report page');
  check.equal((await approve(t, actor, current, prepared)).status, 200, 'the consumer approves the reviewed original-report material');
  const downloaded = await t.request('GET', current.base + '/packet-download', auth(actor));
  check.equal(downloaded.status, 200, 'the approved full packet downloads');
  const entries = zipEntries(downloaded.bytes);
  for (const fixture of [earlier, current]) {
    const manifest = prepared.packet.report_attachment_manifest.find(copy => copy.file_id === fixture.fileId);
    check.deepEqual(entries.find(entry => entry.name === manifest.archive_name)?.bytes, fixture.bytes,
      'the ZIP includes each unchanged original source report');
  }
  check.equal(entries.some(entry => entry.bytes.equals(unrelated.bytes)), false, 'a same-owner unrelated private report stays out of the ZIP');
  check.equal(comparableText(downloaded.text), comparableText(prepared.packet.correspondence_preview), 'PDF text equals the complete reviewed letter and copy manifest');
  const printed = await t.request('GET', current.base + '/packet-print', auth(actor));
  check.deepEqual(printed.bytes, entries[0].bytes, 'inline print and ZIP use the same approved correspondence PDF');
  check.equal(hash(Buffer.from(JSON.stringify([row(t, earlier), row(t, current)]))), evidenceBefore,
    'report selection and delivery leave the source results and classifications unchanged');
  const out = path.join(__dirname, '../../out/batch66-report-exhibits'); fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'approved-packet.zip'), downloaded.bytes);
  fs.writeFileSync(path.join(out, 'approved-correspondence.pdf'), printed.bytes);
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
  check.notEqual(removed.json.view.packet.preview_version, previousVersion, 'copy selection is canonical approval material');
  check.equal((await approve(t, actor, current, prepared)).json.error.code, 'PACKET_APPROVAL_STALE', 'a previous preview cannot approve different attachments');
  check.equal((await t.request('GET', current.base + '/packet-download', auth(actor))).status, 409, 'changed copy selection requires rereview');
  await ready(t, actor, current, [earlier.fileId, current.fileId]);
  const dateIssue = issue(t, current, 'COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY');
  check.ok(dateIssue, 'the same current report has an independent second account issue');
  const changedIssue = await select(t, actor, current, [dateIssue.issue_id]);
  check.deepEqual(changedIssue.json.view.packet.report_attachment_manifest.map(copy => copy.file_id), [current.fileId],
    'changing issues prunes the earlier copy and preserves a still-relevant explicit current copy');
  check.equal(changedIssue.json.view.packet.report_exhibits.length, 1, 'deselected earlier evidence is no longer offered');
  await select(t, actor, current, [reaging.issue_id]);
  await ready(t, actor, current, [earlier.fileId, current.fileId]);
  t.service.store.putBlob(current.fileId, Buffer.concat([current.bytes, Buffer.from('\nTAMPERED')]));
  await refusedCopies(t, check, actor, current, 'changed original bytes');
  check.equal((await select(t, actor, current, [reaging.issue_id])).json.error.code, 'PACKET_APPROVAL_STALE',
    'saving the same issues cannot silently remove a chosen original with invalid custody');
  const resetTampered = await choose(t, actor, current, []);
  check.equal(resetTampered.status, 200, 'an explicit empty choice clears invalid original copies');
  check.equal(resetTampered.json.view.packet.approved, false, 'explicit reset clears approval and requires rereview');
  check.deepEqual(resetTampered.json.view.packet.report_attachment_manifest, [], 'explicit reset removes every report copy from the reviewed packet');
  t.service.store.putBlob(current.fileId, current.bytes);
  await ready(t, actor, current, [earlier.fileId, current.fileId]);
  check.equal((await t.request('GET', current.base + '/packet-download', auth(actor))).status, 200,
    'the restored exact originals can be explicitly chosen and rereviewed');
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
  check.equal((await choose(t, actor, current, [])).status, 200, 'a consumer can explicitly clear unavailable originals without adding a new assessment gate');

  await multipageAndImage(t, check, actor);
  archiveBounds(check);
  check.equal(t.logText().includes('Account Number ****1234'), false, 'source report content never enters service logs');
  return { original_report_bytes: true, both_reaging_sources: true, explicit_opt_in: true,
    selected_issue_sources_only: true, review_and_approval_binding: true, mutation_and_deletion_refused: true,
    multipage_and_image_originals: true, legacy_unstored_fixture_compatible: true };
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
  check.equal(offered.page_count, 3, 'a whole multipage copy declares its complete page count');
  check.deepEqual(offered.relevant_pages, [1, 2], 'cover identity and disputed account pages retain original page numbers');
  const view = await ready(t, actor, fixture, [fixture.fileId]);
  check.ok(view.packet.correspondence_preview.includes('Entire report (3 pages).'), 'approval explicitly covers the entire three-page file');
  const download = await t.request('GET', fixture.base + '/packet-download', auth(actor));
  check.deepEqual(zipEntries(download.bytes).find(entry => entry.name === view.packet.report_attachment_manifest[0].archive_name)?.bytes,
    bytes, 'multipage original is preserved byte for byte without reconstruction or silent page removal');
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
  const imageReady = await ready(t, actor, image, [image.fileId]);
  const imageDownload = await t.request('GET', image.base + '/packet-download', auth(actor));
  check.deepEqual(zipEntries(imageDownload.bytes).find(entry => entry.name === imageReady.packet.report_attachment_manifest[0].archive_name)?.bytes,
    png, 'the approved packet contains the original image, not its OCR transcription');
  await choose(t, actor, fixture, []);
  t.service.store.update(state => { const file = state.files.find(item => item.file_id === fixture.fileId);
    file.stored_blob = false; delete file.stored_sha256; });
  const legacy = await t.request('GET', fixture.base + '/packet', auth(actor));
  check.equal(legacy.status, 200, 'an old fixture without retained report bytes gains no mandatory evidence gate');
  check.deepEqual(legacy.json.view.packet.report_exhibits, [], 'unavailable legacy source copies stay internal');
  check.equal((await approve(t, actor, fixture, legacy.json.view)).status, 200,
    'an independently supported old fixture still approves through its existing packet gates');
  check.equal((await t.request('GET', fixture.base + '/packet-download', auth(actor))).status, 200,
    'legacy packet delivery remains usable when no unavailable original was chosen');
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

module.exports = { run, id: 'eh-packet-report-exhibits', title: 'Selected-issue original reports: explicit full-copy review, source custody, approval and printable ZIP delivery' };
