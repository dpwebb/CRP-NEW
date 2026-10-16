'use strict';
// Fictional owned reports over the real isolated HTTP service. No hosted or provider acceptance claim.
const crypto = require('node:crypto');
const cases = require('../../cases.cjs');
const packets = require('../../packets.cjs');
const reaging = require('../../reaging.cjs');
const documents = require('../../account-documents.cjs');
const support = require('../../packet-support.cjs');
const { comparableText, pdfText } = require('../packet-pdf-assertions.cjs');
const { buildPdf } = require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');
const clone = value => structuredClone(value);
const hash = value => crypto.createHash('sha256').update(Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest('hex');
const auth = (actor, body) => ({ token: actor.token, body });
const withoutSessions = state => Object.fromEntries(Object.entries(state).filter(([key]) => key !== 'sessions'));
const independent = row => Object.fromEntries(['extraction', 'assessment_clock', 'previous_assessment_clock', 'created_at', 'clarifications', 'clarification_eligibility', 'file_id', 'file_ids']
  .map(key => [key, row[key]]).concat(['results', 'factual_checks', 'detected_report_information', 'report_concerns', 'limitation_assessment', 'payment_history_analysis']
    .map(key => [key, row.evaluation?.[key]])));

async function dateChecks(t, check, owner, stranger, dateCase, approvedCase) {
  const store = t.service.store, request = (method, suffix, body) => t.request(method, dateCase.base + suffix, auth(owner, body));
  const current = store.state().results.find(row => row.result_id === dateCase.resultId);
  const issue = packets.eligibleIssues(current).find(row => row.check_id === 'COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY');
  check.ok(Boolean(issue), 'date persistence fixture selects an independent own-report issue');
  await request('POST', '/packet/select', { issue_ids: [issue.issue_id], expected_result_id: dateCase.resultId });
  await t.preparePostalPacket(owner, dateCase.caseId);
  const initial = (await request('GET', '/packet')).json.view;
  const address = initial.support.documents.find(doc => doc.document_type === 'ADDRESS' && initial.support.selected_document_ids.includes(doc.file_id));
  const recent = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const originalPacket = clone(store.state().packets.find(row => row.case_id === approvedCase.caseId));
  const oldPreview = (await t.request('GET', approvedCase.base + '/packet', auth(owner))).json.view.packet.preview_version;
  const oldPdf = (await t.request('GET', approvedCase.base + '/packet-download', auth(owner))).bytes;
  const settings = { ...initial.support.settings, document_dates: { ...initial.support.settings.document_dates, [address.file_id]: recent } };
  check.equal((await request('POST', '/packet/support', { support: settings })).status, 200, 'an explicitly entered document date is accepted through ordinary support saving');
  const accountFile = store.state().files.find(row => row.file_id === address.file_id);
  check.equal(accountFile.document_date, recent, 'the actual document retains its entered calendar date');
  check.equal(accountFile.document_date_sha256, accountFile.sha256, 'the date is bound to the exact retained copy bytes');
  check.deepEqual(store.state().packets.find(row => row.case_id === approvedCase.caseId), originalPacket, 'remembering a reusable date never rewrites an already approved packet');
  check.equal((await t.request('GET', approvedCase.base + '/packet', auth(owner))).json.view.packet.preview_version, oldPreview, 'an approved preview version does not silently merge newly remembered dates');
  check.ok((await t.request('GET', approvedCase.base + '/packet-download', auth(owner))).bytes.equals(oldPdf), 'approved PDF bytes remain exact after reusable date metadata changes');
  check.equal((await request('DELETE', '')).status, 200, 'the report where the date was entered can be deleted');
  const listed = (await t.request('GET', '/api/account/documents', auth(owner))).json.documents;
  check.equal(listed.find(doc => doc.file_id === address.file_id).document_date, recent, 'the saved copy date survives deletion of its original packet/report');
  check.ok(!(await t.request('GET', '/api/account/documents', auth(stranger))).json.documents.some(doc => doc.file_id === address.file_id), 'the remembered copy date is not disclosed to another account');
  const replacement = await t.request('POST', '/api/account/documents', auth(owner, {
    originalFilename: address.original_filename, declaredBytes: store.readBlob(address.file_id).length, mimeType: address.content_type,
    contentBase64: store.readBlob(address.file_id).toString('base64'), document_type: address.document_type, document_kind: address.document_kind
  }));
  check.equal(replacement.status, 201, 'a separately uploaded same-name identical-byte copy has its own identity');
  check.equal(replacement.json.document.document_date, undefined, 'a new file ID does not borrow an old copy date even when filename and bytes match');
  const state = clone(store.state()), ownFile = state.files.find(row => row.file_id === address.file_id);
  delete ownFile.document_date; delete ownFile.document_date_sha256;
  const legacyDate = originalPacket.support.document_dates[address.file_id];
  const memory = { state: () => state, readBlob: id => store.readBlob(id) };
  check.equal(documents.listDocuments(memory, owner).find(doc => doc.file_id === address.file_id).document_date, legacyDate, 'legacy dates recover only from unambiguous existing packets naming the exact owned file ID');
  for (const mode of ['sole-legacy-origin', 'conflicting-legacy', 'pinned-mismatch']) {
    let legacy = clone(state);
    legacy.packets = [clone(originalPacket)];
    const legacyFile = legacy.files.find(row => row.file_id === address.file_id);
    delete legacyFile.document_date; delete legacyFile.document_date_sha256;
    if (mode === 'conflicting-legacy') legacy.packets.push({ packet_id: 'unrelated-date-packet', account_id: owner.account_id,
      case_id: 'unrelated-date-case', support: { document_ids: [address.file_id], document_dates: { [address.file_id]: '2001-01-01' } } });
    if (mode === 'pinned-mismatch') { legacyFile.document_date = recent; legacyFile.document_date_sha256 = '0'.repeat(64); }
    const unrelatedPackets = clone(legacy.packets.filter(row => row.case_id !== approvedCase.caseId));
    const privateStore = { state: () => clone(legacy), update(mutator) { const next = clone(legacy), value = mutator(next); legacy = next; return value; }, deleteBlob() { return true; } };
    cases.deleteCase(privateStore, owner, approvedCase.caseId);
    const retained = legacy.files.find(row => row.file_id === address.file_id);
    if (mode === 'sole-legacy-origin') {
      check.equal(retained.document_date, legacyDate, 'deleting the sole legacy date-origin packet preserves its supplied document date');
      check.equal(retained.document_date_sha256, retained.sha256, 'legacy migration pins only the exact unchanged copy identity');
    } else if (mode === 'conflicting-legacy') check.equal(retained.document_date_sha256, undefined, 'deletion cannot choose between conflicting legacy dates');
    else check.equal(retained.document_date_sha256, '0'.repeat(64), 'deletion never overwrites an existing mismatched date binding');
    check.deepEqual(legacy.packets, unrelatedPackets, 'legacy date preservation does not rewrite any surviving packet');
  }
  state.packets.push({ packet_id: 'fictional-conflicting-date', account_id: owner.account_id,
    support: { document_ids: [address.file_id], document_dates: { [address.file_id]: '2001-01-01' } } });
  check.equal(documents.listDocuments(memory, owner).find(doc => doc.file_id === address.file_id).document_date, undefined, 'conflicting legacy dates require fresh review');
  state.packets.pop();
  state.packets.push({ packet_id: 'fictional-foreign-date', account_id: stranger.account_id,
    support: { document_ids: [address.file_id], document_dates: { [address.file_id]: '2001-01-01' } } });
  check.equal(documents.listDocuments(memory, owner).find(doc => doc.file_id === address.file_id).document_date, legacyDate, 'another account cannot supply or conflict with an owned copy date');
  ownFile.document_date = recent; ownFile.document_date_sha256 = '0'.repeat(64);
  check.equal(documents.listDocuments(memory, owner).find(doc => doc.file_id === address.file_id).document_date, undefined, 'an explicit date hash mismatch cannot fall back to a legacy packet date');
  let corruptCode;
  try { documents.materialDocuments({ state: () => state, readBlob: () => Buffer.from('FICTIONAL CORRUPTED COPY') }, owner, [address.file_id]); }
  catch (error) { corruptCode = error.code; }
  check.equal(corruptCode, 'SERVICE_STATE_UNAVAILABLE', 'remembered dates never bypass actual stored-byte integrity checks');
  const future = new Date(Date.now() + 86400000).toISOString().slice(0, 10), expired = new Date(Date.now() - 100 * 86400000).toISOString().slice(0, 10);
  for (const date of [future, expired]) {
    const snapshot = support.snapshot(store, owner, 'CA', { ...settings, bureau: 'EQUIFAX', purpose: 'ACCOUNT', document_dates: { ...settings.document_dates, [address.file_id]: date } });
    check.ok(snapshot.missing.some(item => /date of an address document/.test(item)), 'future and expired copies still fail the existing address-age requirement');
  }
  let calendarCode;
  try { support.normalize({ ...settings, document_dates: { [address.file_id]: '2026-02-30' } }, 'US'); } catch (error) { calendarCode = error.code; }
  check.equal(calendarCode, 'INVALID_REQUEST', 'impossible calendar dates cannot become reusable metadata');
}

async function run(t, check) {
  const owner = await t.account('wizard-deletion-owner@example.test');
  const stranger = await t.account('wizard-deletion-other@example.test');
  const store = t.service.store;
  async function report(actor, name, year, anchor, mask = '1234') {
    const created = await t.request('POST', '/api/cases', auth(actor, { country: 'US', region: 'US-NY', bureau: 'EQUIFAX' }));
    check.equal(created.status, 201, name + ': owned case created');
    const caseId = created.json.case.case_id, base = '/api/cases/' + caseId;
    const bytes = buildPdf({ pages: [{ lines: [
      'Equifax Consumer Credit Report - FICTIONAL TEST FIXTURE', `Report Date: June 12, ${year}`,
      'Creditor A Balance $100', `Account Number ****${mask}`, 'Status: Charged Off', 'Opened 01/01/2010',
      `First Delinquency Date 01/01/${anchor}`, 'Last Payment Date 01/01/2016',
      'Creditor Independent Bank Balance $200', 'Account Number ****5678', 'Opened 01/01/2021', 'Closed 01/01/2020'
    ] }] });
    const uploaded = await t.request('POST', base + '/files', auth(actor, {
      originalFilename: name + '.pdf', declaredBytes: bytes.length, mimeType: 'application/pdf', contentBase64: bytes.toString('base64')
    }));
    check.equal(uploaded.status, 201, name + ': actual report bytes uploaded');
    const evaluated = await t.request('POST', base + '/evaluate', auth(actor));
    check.equal(evaluated.status, 201, name + ': report assessed');
    return { actor, caseId, base, fileId: uploaded.json.receipt.file_id, resultId: evaluated.json.result_id, bytes };
  }
  const row = fixture => store.state().results.find(item => item.result_id === fixture.resultId);
  const packet = fixture => store.state().packets.find(item => item.case_id === fixture.caseId);
  const eligible = fixture => packets.eligibleIssues(row(fixture));
  const reagingIssue = fixture => eligible(fixture).find(item => item.check_id === reaging.CHECK_ID);
  async function prepare(fixture) {
    const offered = eligible(fixture), selected = offered.filter(item => item.check_id === reaging.CHECK_ID || item.check_id === 'COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY');
    check.ok(selected.some(item => item.check_id === reaging.CHECK_ID), 'packet setup selects an actual cross-report comparison');
    check.ok(selected.some(item => item.check_id === 'COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY'), 'packet setup also selects an independent report issue');
    const saved = await t.request('POST', fixture.base + '/packet/select', auth(owner, { issue_ids: selected.map(item => item.issue_id), expected_result_id: fixture.resultId }));
    check.equal(saved.status, 200, 'the explicit current selection is saved');
    await t.preparePostalPacket(owner, fixture.caseId);
    let view = (await t.request('GET', fixture.base + '/packet', auth(owner))).json.view;
    const metadata = (await t.request('GET', fixture.base + '/packet/preview/pages?version=' + view.packet.preview_version, auth(owner))).json;
    const ownPage = metadata.review_pages.find(page => page.kind === 'report' && page.file_id === fixture.fileId && page.annotation_available !== false);
    check.ok(Boolean(ownPage), 'annotation fixture uses an actual current source report page');
    const annotation = await t.request('POST', fixture.base + '/packet/annotations', auth(owner, { expected_version: view.packet.preview_version, annotations: [{
      file_id: fixture.fileId, page: ownPage.source_page, x: 0.1, y: 0.1, width: 0.4, height: 0.1,
      issue_id: selected.find(item => item.check_id === reaging.CHECK_ID).issue_id, note: 'Fictional comparison note about earlier January 1, 2017.'
    }] }));
    check.equal(annotation.status, 200, 'a legacy current-page note can be explicitly bound to the old comparison issue');
    view = (await t.request('GET', fixture.base + '/packet', auth(owner))).json.view;
    check.equal((await t.request('POST', fixture.base + '/packet/approve', auth(owner, { reviewed_version: view.packet.preview_version }))).status, 200, 'the actual old complete packet is approved');
    check.equal((await t.request('GET', fixture.base + '/packet-download', auth(owner))).status, 200, 'the old packet was genuinely downloadable before source deletion');
    return { version: view.packet.preview_version, selected: selected.map(item => item.issue_id), dependent: selected.find(item => item.check_id === reaging.CHECK_ID).issue_id };
  }

  await report(stranger, 'fictional-foreign', '2023', '2011');
  const unrelated = await report(owner, 'fictional-unrelated', '2022', '2014', '9999');
  const a = await report(owner, 'fictional-delete-A', '2023', '2017');
  const b = await report(owner, 'fictional-surviving-B', '2024', '2018');
  const archivedB = b.resultId;
  const reassessedB = await t.request('POST', b.base + '/evaluate', auth(owner));
  check.equal(reassessedB.status, 201, 'B has an archived and a current saved assessment');
  b.resultId = reassessedB.json.result_id;
  const c = await report(owner, 'fictional-surviving-C', '2025', '2019');
  check.equal(reagingIssue(b)?.evidence.earlier_result_id, a.resultId, 'B actually depends on A before deletion');
  check.equal(reagingIssue(c)?.evidence.earlier_result_id, a.resultId, 'C initially chooses A from the retained A/B history');
  const oldB = await prepare(b), oldC = await prepare(c);
  const dateCase = await report(owner, 'fictional-date-source', '2022', '2013', '8888');
  await dateChecks(t, check, owner, stranger, dateCase, b);
  const ownLetter = await report(owner, 'fictional-independent-letter', '2026', '2020');
  const ownIssue = eligible(ownLetter).find(item => item.check_id === 'COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY');
  check.ok(Boolean(reagingIssue(ownLetter)), 'independent-letter report also has an unselected A comparison');
  await t.request('POST', ownLetter.base + '/packet/select', auth(owner, { issue_ids: [ownIssue.issue_id], expected_result_id: ownLetter.resultId }));
  await t.preparePostalPacket(owner, ownLetter.caseId);
  const ownText = (await t.request('GET', ownLetter.base + '/packet', auth(owner))).json.view.packet.correspondence_preview + '\nKeep my independent letter edit exactly.';
  await t.request('POST', ownLetter.base + '/packet/letter', auth(owner, { letter_text: ownText }));
  const ownView = (await t.request('GET', ownLetter.base + '/packet', auth(owner))).json.view;
  check.equal((await t.request('POST', ownLetter.base + '/packet/approve', auth(owner, { reviewed_version: ownView.packet.preview_version }))).status, 200, 'independent selected letter is approved before source deletion');
  const ownPacket = clone(packet(ownLetter)), ownPdf = (await t.request('GET', ownLetter.base + '/packet-download', auth(owner))).bytes;
  const affectedIds = [archivedB, b.resultId, c.resultId, ownLetter.resultId];
  const beforeRows = new Map(affectedIds.map(id => [id, clone(store.state().results.find(item => item.result_id === id))]));
  const before = clone(store.state());
  const retainedFiles = before.files.filter(file => file.case_id !== a.caseId).map(file => [file.file_id, hash(store.readBlob(file.file_id))]);
  const unrelatedBefore = hash({ case: before.cases.find(item => item.case_id === unrelated.caseId), results: before.results.filter(item => item.case_id === unrelated.caseId) });
  const billingBefore = hash(Object.fromEntries(['entitlements', 'billing_events', 'checkout_sessions', 'upgrade_credits', 'purchased_downloads'].map(key => [key, before[key]])));
  check.equal((await t.request('DELETE', a.base, auth(stranger))).status, 403, 'foreign deletion is refused before touching this account');
  check.equal((await t.request('DELETE', a.base, auth(owner))).status, 200, 'owned deletion repairs dependent records and removes A');
  const after = store.state();
  check.deepEqual(packet(ownLetter), ownPacket, 'an independently selected custom letter retains its complete packet row and approval');
  const unchangedLetter = (await t.request('GET', ownLetter.base + '/packet', auth(owner))).json.view.packet;
  check.equal(unchangedLetter.approved, true, 'removing an unselected comparison does not invalidate independent packet approval');
  check.equal(unchangedLetter.comparison_source_removed, false, 'an unaffected approved packet is not incorrectly told to approve again');
  check.ok((await t.request('GET', ownLetter.base + '/packet-download', auth(owner))).bytes.equals(ownPdf), 'an independent edited packet remains downloadable with the exact approved bytes');
  check.deepEqual(after.accounts.find(item => item.account_id === owner.account_id), before.accounts.find(item => item.account_id === owner.account_id), 'report deletion preserves saved account details and security state');
  check.deepEqual(after.files, before.files.filter(item => item.case_id !== a.caseId), 'all remaining report and account document rows remain exact');
  for (const table of ['cases', 'files', 'results', 'drafts', 'packets', 'purchased_downloads']) check.equal(after[table].filter(item => item.case_id === a.caseId).length, 0, 'A is absent from ' + table);
  check.equal(store.blobExists(a.fileId), false, 'A source bytes were physically removed');
  for (const [id, digest] of retainedFiles) check.equal(hash(store.readBlob(id)), digest, 'retained report/account document bytes remain exact');
  check.equal(hash(Object.fromEntries(Object.entries(after).filter(([, value]) => Array.isArray(value) && value !== after.sessions).map(([key, values]) => [key, values.filter(value => value.account_id === stranger.account_id)]))),
    hash(Object.fromEntries(Object.entries(before).filter(([key, value]) => key !== 'sessions' && Array.isArray(value)).map(([key, values]) => [key, values.filter(value => value.account_id === stranger.account_id)]))), 'another account remains exact excluding normal sessions');
  check.equal(hash({ case: after.cases.find(item => item.case_id === unrelated.caseId), results: after.results.filter(item => item.case_id === unrelated.caseId) }), unrelatedBefore, 'unrelated owned report and saved history remain exact');
  check.equal(hash(Object.fromEntries(['entitlements', 'billing_events', 'checkout_sessions', 'upgrade_credits', 'purchased_downloads'].map(key => [key, after[key]]))), billingBefore, 'report deletion does not cancel a subscription or rewrite payment history');
  for (const id of affectedIds) {
    const current = after.results.find(item => item.result_id === id), previous = beforeRows.get(id);
    check.deepEqual(independent(current), independent(previous), 'saved result preserves its own extraction, independent checks, statements and original clock');
    const structured = JSON.stringify({ evaluation: current.evaluation, rendered: current.rendered });
    for (const deleted of [a.caseId, a.resultId, a.fileId]) check.equal(structured.includes(deleted), false, 'all structured deleted-source references are gone from every saved result');
    check.equal(structured.includes('2017-01-01') || structured.includes('01/01/2017'), false, 'the uniquely deleted anchor does not survive in derived evidence');
    const read = await t.request('GET', '/api/cases/' + current.case_id + '/results/' + id, auth(owner));
    check.equal(read.status, 200, 'current and archived surviving assessments stay readable');
    check.equal(JSON.stringify(read.json).includes('2017-01-01') || JSON.stringify(read.json).includes('01/01/2017'), false, 'consumer assessment JSON has no deleted anchor');
    const pdf = await t.request('GET', '/api/cases/' + current.case_id + '/report-download?result_id=' + id, auth(owner));
    check.equal(pdf.status, 200, 'the specifically selected surviving assessment PDF is available');
    const text = comparableText(pdfText(pdf.bytes));
    check.equal(/earlier report dated June 12, 2023|January 1, 2017|01\/01\/2017/.test(text), false, 'historical PDF output does not retain A-derived facts');
    check.ok(text.includes('Independent Bank'), 'independent B/C account information remains in exported assessments');
  }
  check.equal(Boolean(reagingIssue(b)), false, 'B no longer raises a comparison supported only by A');
  check.ok(Boolean(reagingIssue(c)), 'C can still use independent surviving B evidence');
  check.ok(reagingIssue(c)?.evidence.earlier_result_id !== a.resultId, 'the remaining C comparison does not reference A');
  for (const [fixture, prior] of [[b, oldB], [c, oldC]]) {
    const current = packet(fixture);
    check.equal(current.selected_issue_ids.includes(prior.dependent), false, 'obsolete comparison selections are removed');
    check.ok(current.selected_issue_ids.some(id => prior.selected.includes(id)), 'the independent selected issue remains selected');
    check.equal(current.report_file_ids?.includes(a.fileId), false, 'packet source-copy selection drops the deleted original');
    check.equal(Boolean(current.report_page_choices?.[a.fileId]), false, 'packet page choices drop deleted source pages');
    check.equal((current.annotations || []).some(item => item.file_id === a.fileId), false, 'packet annotations do not retain deleted source references');
    check.equal((current.annotations || []).some(item => item.issue_id === prior.dependent), false, 'a note on a surviving page is removed when its bound comparison issue becomes obsolete');
    check.equal(Boolean(current.approved_version || current.approved_at || current.approved_pdf_sha256), false, 'every affected packet approval is invalidated');
    const old = await t.request('GET', fixture.base + '/packet/preview?version=' + prior.version, auth(owner));
    check.equal(old.status, 409, 'the old packet version cannot reopen removed evidence');
    check.equal((await t.request('GET', fixture.base + '/packet-download', auth(owner))).status, 409, 'download requires fresh review and approval');
  }
  check.equal(packet(c).selected_issue_ids.includes(reagingIssue(c)?.issue_id), false, 'a newly derived comparison is not automatically selected');
  const history = await t.request('GET', '/api/history', auth(owner));
  check.ok(history.json.assessments.every(item => item.case_id !== a.caseId && item.result_id !== a.resultId), 'history removes A while retaining surviving assessments');
  for (const suffix of ['', '/results', '/packet', '/packet-download']) check.equal((await t.request('GET', a.base + suffix, auth(owner))).status, 404, 'deleted report routes stop resolving');

  const d = await report(owner, 'fictional-delete-D', '2023', '2017');
  const e = await report(owner, 'fictional-edited-E', '2024', '2018');
  const dependent = eligible(e).find(item => item.check_id === reaging.CHECK_ID && item.evidence.earlier_result_id === d.resultId);
  check.ok(Boolean(dependent), 'edited-letter refusal fixture depends on D');
  await t.request('POST', e.base + '/packet/select', auth(owner, { issue_ids: [dependent.issue_id], expected_result_id: e.resultId }));
  await t.preparePostalPacket(owner, e.caseId);
  const prepared = (await t.request('GET', e.base + '/packet', auth(owner))).json.view.packet.correspondence_preview;
  const custom = prepared + '\nPlease preserve this independent consumer edit.';
  check.equal((await t.request('POST', e.base + '/packet/letter', auth(owner, { letter_text: custom }))).status, 200, 'consumer custom letter is stored before deletion');
  const guarded = hash(withoutSessions(store.state()));
  const refusal = await t.request('DELETE', d.base, auth(owner));
  check.equal(refusal.status, 409, 'edited-letter conflict is an actionable refusal');
  check.equal(refusal.json.error?.code, 'REPORT_USED_BY_EDITED_LETTER', 'ambiguous custom letter prevents destructive automatic merging');
  check.equal(hash(withoutSessions(store.state())), guarded, 'refusal leaves all business records and payment state exact');
  check.equal(packet(e).letter_text, custom, 'refusal preserves every consumer letter character');
  check.equal(store.blobExists(d.fileId), true, 'refusal never unlinks the source report');
  const originalBinding = refusal.json.error.detail?.replacement_binding;
  check.ok(/^[a-f0-9]{64}$/.test(originalBinding || ''), 'replacement choice is bound to the exact affected work');
  check.ok(refusal.json.error.detail?.reports?.some(item => item.case_id === e.caseId && item.packet_id === packet(e).packet_id), 'the conflict identifies the surviving report whose edited letter would change');
  check.ok(refusal.json.error.detail?.reports?.some(item => item.label.includes('fictional-edited-E.pdf') && item.label.includes('Equifax') && item.label.includes('2024-06-12')), 'affected-letter identity includes filename, bureau and report date');
  let guardedState = clone(store.state()), providerCalls = 0, guardedUnlinks = 0;
  guardedState.checkout_sessions.push({ account_id: owner.account_id, case_id: d.caseId, checkout_id: 'gn_pending_report',
    provider_id: 'stripe', provider_reference: 'cs_gn_pending_report', plan_code: 'report_once', state: 'OPEN' });
  const guardedBefore = hash(guardedState);
  const guardedStore = { state: () => clone(guardedState), update(mutator) { const next = clone(guardedState), result = mutator(next); guardedState = next; return result; }, deleteBlob() { guardedUnlinks++; return true; } };
  let guardCode;
  try {
    await cases.deleteCaseSafely(guardedStore, owner, d.caseId, {}, { provider: { provider_id: 'stripe', async cancelCheckout() { providerCalls++; return { cancelled: true }; } } });
  } catch (error) { guardCode = error.code; }
  check.equal(guardCode, 'REPORT_USED_BY_EDITED_LETTER', 'dependency preflight runs before awaited payment cancellation');
  check.equal(providerCalls, 0, 'ambiguous-letter refusal performs no provider operation');
  check.equal(guardedUnlinks, 0, 'dependency preflight performs no source unlink');
  check.equal(hash(guardedState), guardedBefore, 'preflight refusal preserves its complete pending-payment state');
  const newerCustom = custom + '\nA newer independent edit must not be silently discarded.';
  await t.request('POST', e.base + '/packet/letter', auth(owner, { letter_text: newerCustom }));
  const changedBefore = hash(withoutSessions(store.state()));
  const stale = await t.request('DELETE', d.base, auth(owner, { replace_dependent_letters: originalBinding }));
  check.equal(stale.json.error?.code, 'CASE_DELETION_STALE', 'replacement consent cannot discard a newer edit');
  check.equal(hash(withoutSessions(store.state())), changedBefore, 'stale replacement consent leaves all business records exact');
  const invalid = await t.request('DELETE', d.base, auth(owner, { replace_dependent_letters: true }));
  check.equal(invalid.status, 400, 'an unbound replacement flag cannot authorize changing another saved letter');
  check.equal(hash(withoutSessions(store.state())), changedBefore, 'invalid replacement input preserves reports and letters');
  const refreshed = await t.request('DELETE', d.base, auth(owner));
  const freshBinding = refreshed.json.error?.detail?.replacement_binding;
  check.equal(refreshed.json.error?.code, 'REPORT_USED_BY_EDITED_LETTER', 'the current letter still requires an explicit replacement choice');
  check.ok(freshBinding && freshBinding !== originalBinding, 'newer work receives a fresh exact replacement binding');
  const failureBefore = clone(store.state()), deletes = [];
  const failing = { state: () => clone(failureBefore), update(mutator) { mutator(clone(failureBefore)); throw new Error('FICTIONAL_COMMIT_FAILURE'); }, deleteBlob(id) { deletes.push(id); return true; } };
  let failure;
  try { cases.deleteCase(failing, owner, d.caseId, { replace_dependent_letters: freshBinding }); } catch (error) { failure = error.message; }
  check.equal(failure, 'FICTIONAL_COMMIT_FAILURE', 'a transaction write failure is surfaced');
  check.deepEqual(failing.state(), failureBefore, 'failed repair/deletion commits no partial result changes');
  check.equal(deletes.length, 0, 'failed state commit never starts unlinking source blobs');
  const preservedSupport = clone(packet(e).support), preservedCorrespondence = clone(packet(e).correspondence), preservedDate = packet(e).letter_date;
  check.equal((await t.request('DELETE', d.base, auth(owner, { replace_dependent_letters: freshBinding }))).status, 200, 'an explicit current replacement choice permits dependency-aware deletion');
  check.equal(store.blobExists(d.fileId), false, 'the explicitly confirmed source report is removed');
  check.equal(packet(e).letter_text, null, 'only the explicitly named affected custom letter is replaced');
  check.equal(packet(e).wording, null, 'affected freeform packet wording is removed with explicit replacement');
  check.deepEqual(packet(e).support, preservedSupport, 'replacement preserves selected ID copies and document dates');
  check.deepEqual(packet(e).correspondence, preservedCorrespondence, 'replacement preserves saved contact/reference details');
  check.equal(packet(e).letter_date, preservedDate, 'replacement preserves the signing date');
  check.equal(Boolean(packet(e).approved_version || packet(e).approved_pdf_sha256), false, 'replacement never approves an unseen new letter');
  return { fictional_only: true, actual_http: true, archived_results_repaired: true, transitive_history_repaired: true,
    selected_assessment_pdf_checked: true, ambiguous_custom_letter_refused: true, transactional_failure_checked: true,
    bound_document_dates_survive_report_deletion: true, approved_packet_date_identity_preserved: true, provider_proof: false };
}
module.exports = { run, id: 'gn-wizard-deletion-corrections', title: 'Deleting a report removes dependent facts while preserving independent report work and consumer edits' };
