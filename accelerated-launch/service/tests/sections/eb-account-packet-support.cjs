'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const rules = require('../../bureau-dispute-requirements.cjs');
const supportModule = require('../../packet-support.cjs');
const { pdfText, comparableText } = require('../packet-pdf-assertions.cjs');
const { buildPdf } = require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');
const PROFILE = { full_name: 'Morgan Fiction', given_name: 'Morgan', family_name: 'Fiction', date_of_birth: '1980-04-12', phone: '555-0100', contact_email: 'morgan@example.test',
  address_line1: '12 Example Street', address_line2: '', city: 'Halifax', region: 'NS', postal_code: 'B3H 0A0', country: 'Canada', previous_address: '' };
function options(ids = [], purpose = 'ACCOUNT') { return { bureau: 'EQUIFAX', channel: 'POSTAL', purpose, document_ids: ids, use_account_profile: true,
  identity_reference: '', no_ssn_issued: false, identity_shows_address: false, verification_requested: false, copies_confirmed: true, document_dates: {}, other_identity_details: '' }; }
function unzipStored(bytes) {
  const entries = []; let offset = 0;
  while (bytes.readUInt32LE(offset) === 0x04034b50) {
    const size = bytes.readUInt32LE(offset + 18), length = bytes.readUInt16LE(offset + 26), extra = bytes.readUInt16LE(offset + 28);
    const start = offset + 30 + length + extra;
    entries.push({ name: bytes.subarray(offset + 30, offset + 30 + length).toString(), bytes: bytes.subarray(start, start + size) });
    offset = start + size;
  }
  return entries;
}
async function run(t, check) {
  const actor = await t.account('packet-support@example.test'), stranger = await t.account('packet-stranger@example.test');
  const auth = body => ({ token: actor.token, body });
  check.equal((await t.request('GET', '/api/account/profile')).status, 401, 'account profile requires authentication');
  check.equal((await t.request('PUT', '/api/account/profile', auth({ profile: PROFILE }))).status, 200, 'HTTP contact details save');
  const savedProfile = (await t.request('GET', '/api/account/profile', { token: actor.token })).json.profile;
  check.deepEqual(Object.fromEntries(Object.keys(PROFILE).map(key => [key, savedProfile[key]])), PROFILE, 'every supplied contact and name field is returned exactly');
  check.equal((await t.request('GET', '/api/account/profile', { token: stranger.token })).json.profile.full_name, '', 'other account has no contact disclosure');
  const pdf = label => buildPdf({ pages: [{ lines: ['FICTIONAL SUPPORTING DOCUMENT', label] }] });
  const identityBytes = pdf('Fictional ID'), addressBytes = pdf('Fictional address'), passportBytes = pdf('Fictional passport'), unusedBytes = pdf('Unselected ID');
  async function upload(bytes, type, kind) {
    const r = await t.request('POST', '/api/account/documents', auth({ originalFilename: kind + '.pdf', declaredBytes: bytes.length,
      mimeType: 'application/pdf', contentBase64: bytes.toString('base64'), document_type: type, document_kind: kind }));
    check.equal(r.status, 201, 'owned document accepted through HTTP'); return r.json.document.file_id;
  }
  const identity = await upload(identityBytes, 'IDENTITY', 'DRIVING_LICENCE');
  const address = await upload(addressBytes, 'ADDRESS', 'UTILITY_BILL');
  const passport = await upload(passportBytes, 'IDENTITY', 'PASSPORT');
  const unused = await upload(unusedBytes, 'IDENTITY', 'GOVERNMENT_ID');
  check.equal((await t.request('GET', '/api/privacy', { token: actor.token })).json.account_documents.length, 4, 'privacy inventory includes owned supporting documents');
  check.equal((await t.request('GET', '/api/privacy', { token: stranger.token })).json.account_documents.length, 0, 'privacy inventory does not disclose another account’s documents');
  check.equal((await t.request('GET', '/api/account/documents/' + identity, { token: stranger.token })).status, 403, 'stranger cannot download ID');
  check.equal((await t.request('DELETE', '/api/account/documents/' + identity, { token: stranger.token })).status, 403, 'stranger cannot delete ID');
  const read = await fetch(t.base + '/api/account/documents/' + identity, { headers: { Authorization: 'Bearer ' + actor.token } });
  check.ok(Buffer.from(await read.arrayBuffer()).equals(identityBytes), 'owned ID download preserves original bytes');
  const id = await t.assessedCase(actor), base = '/api/cases/' + id;
  const view = (await t.request('GET', base + '/packet', { token: actor.token })).json.view;
  await t.request('POST', base + '/packet/select', auth({ issue_ids: [view.eligible_issues[0].issue_id] }));
  await t.request('POST', base + '/packet/correspondence', auth({ correspondence: { consumer_name: PROFILE.full_name, contact: PROFILE.address_line1 } }));
  check.equal((await t.request('POST', base + '/packet/approve', auth({}))).json.error.code, 'PACKET_SUPPORT_REQUIRED', 'HTTP consumer packet cannot approve without a verified mail checklist');
  check.equal((await t.request('GET', base + '/packet', { token: actor.token })).json.view.packet.approved, false, 'refused mail approval records no approval');
  const support = { ...options([identity, address, passport]), document_dates: { [address]: new Date().toISOString().slice(0, 10) } };
  check.equal((await t.request('POST', base + '/packet/support', auth({ support }))).status, 200, 'bureau-specific supporting selection saved');
  const ready = (await t.request('GET', base + '/packet', { token: actor.token })).json.view;
  check.match(ready.packet.correspondence_preview, /^\s*1\. .+$/m,
    'the complete bureau mail packet names the selected account in a numbered request');
  check.ok(!/\bopened_date\b|\bclosed_date\b/.test(ready.packet.correspondence_preview),
    'saved details and bureau forms do not reintroduce internal date keys into the review');
  check.equal(ready.packet.correspondence.consumer_name, PROFILE.full_name, 'saved name used for correspondence');
  check.ok(ready.packet.correspondence_preview.includes(PROFILE.address_line1), 'saved postal address appears in actual review');
  check.ok(ready.packet.correspondence_preview.includes('Box 190') && ready.packet.correspondence_preview.includes('Signature:'), 'review includes sourced destination and unsigned signature line');
  check.equal(ready.support.requirements.identity_count, 2, 'ordinary account uses the account form’s two-ID requirement');
  check.equal(ready.support.missing.length, 0, 'two complete IDs and recent address proof fulfill the account checklist');
  check.equal((await t.request('POST', base + '/packet/approve', auth({ reviewed_version: 'stale-preview' }))).json.error.code, 'PACKET_APPROVAL_STALE', 'HTTP approval binds to the displayed current preview');
  check.equal((await t.request('POST', base + '/packet/approve', auth({}))).status, 200, 'complete selected content approved');
  let download = await fetch(t.base + base + '/packet-download', { headers: { Authorization: 'Bearer ' + actor.token } });
  check.equal(download.headers.get('content-type'), 'application/zip', 'packet with selected documents is a real archive');
  const bytes = Buffer.from(await download.arrayBuffer()), entries = unzipStored(bytes);
  check.equal(entries.length, 5, 'archive contains correspondence, required form and exactly three selected documents');
  check.equal(comparableText(pdfText(entries[0].bytes)), comparableText(ready.packet.correspondence_preview), 'actual PDF matches the complete reviewed packet');
  const form = entries.find(entry => entry.name === 'ca-equifax-account.pdf');
  check.equal(ready.packet.required_form_manifest[0].template_sha256, 'c7b9e9742f94fef44cb3d6fcf066418f4127193a0c297a81f11b82c8312b4383', 'filled form identifies its exact original bureau template');
  check.ok(pdfText(form.bytes).includes(PROFILE.family_name) && pdfText(form.bytes).includes(PROFILE.given_name), 'original form blanks are automatically populated with the saved consumer name');
  const printed = await t.request('GET', base + '/packet-print', { token: actor.token });
  check.ok(printed.bytes.equals(entries[0].bytes), 'print endpoint serves the same approved letter and evidence PDF');
  check.equal((await t.request('GET', base + '/packet-print', { token: stranger.token })).status, 403, 'stranger cannot print another consumer packet');
  t.service.store.update(state => { state.packets.find(packet => packet.case_id === id).support.channel = 'ONLINE'; });
  check.equal((await t.request('POST', base + '/packet/approve', auth({}))).json.error.code, 'PACKET_SUPPORT_REQUIRED', 'persisted old online settings must be resaved for mail');
  check.equal((await t.request('POST', base + '/packet/support', auth({ support: { ...support, channel: 'ONLINE' } }))).json.error.code, 'PACKET_SUBMISSION_METHOD_REQUIRED', 'new support cannot choose online submission');
  await t.request('POST', base + '/packet/support', auth({ support }));
  await t.request('POST', base + '/packet/approve', auth({}));
  check.ok(entries.some(entry => entry.bytes.equals(identityBytes)) && entries.some(entry => entry.bytes.equals(addressBytes)), 'selected source document bytes included exactly');
  check.ok(!entries.some(entry => entry.bytes.equals(unusedBytes)), 'unselected ID never enters archive');
  fs.writeFileSync(path.join(t.dataDir, 'fictional-approved-packet.zip'), bytes);
  await t.request('PUT', '/api/account/profile', auth({ profile: { phone: '555-0199' } }));
  check.equal((await t.request('GET', base + '/packet-download', { token: actor.token })).json.error.code, 'PACKET_APPROVAL_STALE', 'changed saved contact invalidates approval');
  await t.request('POST', base + '/packet/approve', auth({}));
  await t.request('DELETE', '/api/account/documents/' + address, { token: actor.token });
  check.equal((await t.request('GET', base + '/packet', { token: actor.token })).json.view.packet.approval_stale, true, 'removed selected proof makes visible approval stale');
  check.equal((await t.request('GET', base + '/packet-download', { token: actor.token })).json.error.code, 'PACKET_APPROVAL_STALE', 'removed selected proof cannot silently drop from download');
  const accountSupport = options([identity], 'ACCOUNT');
  await t.request('POST', base + '/packet/support', auth({ support: accountSupport }));
  check.equal((await t.request('POST', base + '/packet/approve', auth({}))).json.error.code, 'PACKET_SUPPORT_REQUIRED', 'account form cannot use collection one-ID requirement');
  check.equal((await t.request('POST', base + '/packet/support', auth({ support: { ...support, bureau: 'TRANSUNION', document_ids: [], document_dates: {} } }))).json.error.code, 'PACKET_BUREAU_MISMATCH', 'wrong bureau cannot receive this report packet');
  const ordinaryTU = rules.requirements('CA', 'TRANSUNION', options());
  check.equal(ordinaryTU.identity_count, 0, 'report-access ID rules never become ordinary TU dispute gate');
  check.ok(ordinaryTU.postal.includes('Hamilton'), 'current CA TU route supersedes stale PDF address');
  check.equal(rules.requirements('US', 'EXPERIAN', { channel: 'ONLINE' }).identity_count, 1, 'US requirements always use the mail ID rule');
  check.equal(rules.requirements('US', 'EQUIFAX', { channel: 'POSTAL' }).ssn_required, true, 'US Equifax mail rule retains explicit SSN requirement');
  check.equal(rules.requirements('US', 'TRANSUNION', { channel: 'POSTAL' }).ssn_required, false, 'US TU as-much-as-possible wording is not mandatory SSN');
  check.equal(rules.requirements('US', 'TRANSUNION', { purpose: 'NEW_ADDRESS', channel: 'POSTAL' }).address_count, 2, 'new-address amendment uses its specific two documents');
  check.ok(rules.requirements('GB', 'EXPERIAN').postal.includes('9000'), 'UK correction-specific destination chosen');
  check.equal(rules.requirements('GB', 'TRANSUNION').identity_count, 0, 'UK subject-access ID count is not self-dispute requirement');
  check.ok(rules.missing(rules.requirements('GB', 'TRANSUNION'), { full_name: PROFILE.full_name }, [], options()).some(line => /street address/.test(line)), 'UK missing-address prompt matches the visible account label');
  check.equal(rules.requirements('AU', 'illion').bureau, 'EXPERIAN', 'former illion uses current combined Experian route');
  check.equal(rules.requirements('AU', 'EXPERIAN').points_required, undefined, 'conditional AU verification is not universal self-dispute gate');
  check.equal(rules.requirements('AU', 'EXPERIAN', { verification_requested: true }).points_required, 100, 'requested AU verification retains sourced points');
  const doc = (kind, index, type = 'IDENTITY') => ({ file_id: String(index).padStart(32, '0'), sha256: String(index), document_kind: kind, document_type: type, stored_bytes: 50 });
  const confirmed = { ...options(), identity_shows_address: true };
  check.equal(rules.missing(rules.requirements('CA', 'EQUIFAX', confirmed), PROFILE, [doc('GOVERNMENT_ID', 1), doc('GOVERNMENT_ID', 2)], confirmed).length, 0, 'two distinct complete valid IDs may share a category');
  check.equal(rules.requirements('CA', 'EQUIFAX', { ...confirmed, channel: 'ONLINE' }).channel, 'POSTAL', 'old online options cannot reinstate an electronic submission path');
  const ex = { ...options(), bureau: 'EXPERIAN', identity_reference: '123456789' };
  check.ok(rules.missing(rules.requirements('US', ex.bureau, ex), PROFILE, [doc('BIRTH_CERTIFICATE', 1), doc('OTHER', 2, 'ADDRESS')], ex).length >= 2, 'Experian ID-card and statement requirements reject unqualified types');
  check.equal(rules.missing(rules.requirements('US', ex.bureau, ex), PROFILE, [doc('DRIVING_LICENCE', 1), doc('INSURANCE_STATEMENT', 2, 'ADDRESS')], ex).length, 0, 'Experian accepts sourced card and home-insurance alternatives');
  const tuPersonal = { ...options(), bureau: 'TRANSUNION', purpose: 'PERSONAL' };
  check.ok(rules.missing(rules.requirements('US', tuPersonal.bureau, tuPersonal), PROFILE, [], tuPersonal).some(line => /supporting/.test(line)), 'TU personal correction requires valid supporting evidence');
  const au = { ...options(), verification_requested: true, document_dates: Object.fromEntries([2, 3, 4].map(index => [String(index).padStart(32, '0'), new Date().toISOString().slice(0, 10)])) };
  const auReq = rules.requirements('AU', 'EQUIFAX', au);
  check.ok(rules.missing(auReq, PROFILE, [doc('DRIVING_LICENCE', 1), ...[2, 3, 4].map(index => doc('BANK_STATEMENT', index, 'ADDRESS'))], au).some(line => /100 points/.test(line)), 'third bank statement cannot overcome the two-account points cap');
  check.equal(rules.missing(auReq, PROFILE, [doc('PASSPORT', 1), doc('RATES_NOTICE', 2, 'ADDRESS'), doc('BANK_STATEMENT', 3, 'ADDRESS')], au).length, 0, 'Equifax rates notice contributes its sourced 25 points');
  check.ok(rules.missing(auReq, PROFILE, [doc('PASSPORT', 1), doc('BIRTH_CERTIFICATE', 2)], au).length > 0, 'unclassified birth certificate never receives full Australian birth points');
  check.equal(rules.missing(auReq, PROFILE, [doc('PASSPORT', 1), doc('AU_FULL_BIRTH_CERTIFICATE', 2)], au).length, 0, 'full Australian birth certificate has the sourced 40 points');
  check.ok(rules.missing(auReq, PROFILE, [doc('PASSPORT', 1), doc('FOREIGN_BIRTH_CERTIFICATE_TRANSLATED', 2)], au).length > 0, 'translated foreign birth certificate contributes15, not40');
  check.equal(rules.missing(auReq, PROFILE, [doc('STATUTORY_DECLARATION', 1, 'SUPPORTING')], au).length, 0, 'Equifax’s stated statutory-declaration alternative remains available');
  check.ok(rules.missing(auReq, PROFILE, [doc('PASSPORT', 1), doc('UTILITY_BILL', 2, 'ADDRESS'), doc('UTILITY_BILL', 3, 'ADDRESS')], { ...au, document_dates: {} }).length > 0, 'undated utilities cannot earn age-limited verification points');
  for (const invalid of [{ ...options(), identity_reference: '123456789', no_ssn_issued: true }, { ...options([identity]), document_dates: { [identity]: '2026-09-31' } }]) {
    let code; try { supportModule.normalize(invalid, 'US'); } catch (error) { code = error.code; }
    check.equal(code, 'INVALID_REQUEST', 'contradictory declarations and impossible dates are rejected');
  }
  const surface = (await t.request('GET', '/api/jurisdictions')).json.surface;
  check.equal(surface.regions.length, 82, 'bureau selection preserves all82 jurisdictions');
  for (const region of surface.regions) {
    const choices = surface.bureau_choices[region.country];
    const opened = await t.request('POST', '/api/cases', auth({ country: region.country, region: region.value, bureau: choices[0].id }));
    check.equal(opened.json?.case?.selected_bureau, choices[0].id, region.value + ' persists a valid country-specific bureau selection');
  }
  check.equal((await t.request('POST', '/api/cases', auth({ country: 'CA', region: 'CA-NS', bureau: 'EXPERIAN' }))).status, 400, 'bureau from a different country is rejected');
  await mixedBureau(t, check);
  await mixedForms(t, check);
  check.ok(!t.logText().includes(PROFILE.full_name) && !t.logText().includes('Fictional ID'), 'contact and ID content do not reach logs');
  const deleted = await t.request('DELETE', '/api/account', { token: actor.token });
  check.equal(deleted.status, 200, 'account removal available after supporting uploads');
  check.ok(!t.service.store.blobExists(identity) && !t.service.store.blobExists(passport) && !t.service.store.blobExists(unused), 'account deletion removes retained support bytes');
  return { http_ownership: true, selected_document_archive: true, contact_and_document_approval_binding: true, sourced_bureau_purpose_channel: true };
}
async function mixedForms(t, check) {
  const actor = await t.account('mixed-forms@example.test');
  const id = (await t.request('POST', '/api/cases', { token: actor.token, body: { country: 'CA', region: 'CA-NS', bureau: 'EQUIFAX' } })).json.case.case_id;
  const base = '/api/cases/' + id;
  const bytes = buildPdf({ pages: [{ lines: ['Equifax Consumer Credit Report', 'Report Date: June 12, 2026',
    'Creditor A Balance $100 Opened 01/01/2020 Closed 01/01/2019',
    'Collection Account: Fictional Collector A', 'Account Number: ****1234', 'Member Number: FICT78901',
    'First Delinquency Date: February 1, 2021', 'Last Payment Date: February 1, 2021', 'Balance: $500',
    'Collection Account: Fictional Collector B', 'Account Number: ****1234', 'Member Number: FICT78901',
    'First Delinquency Date: February 1, 2021', 'Last Payment Date: February 1, 2021', 'Balance: $300'] }] });
  await t.request('POST', base + '/files', { token: actor.token, body: { originalFilename: 'fictional-mixed.pdf', declaredBytes: bytes.length, mimeType: 'application/pdf', contentBase64: bytes.toString('base64') } });
  await t.request('POST', base + '/evaluate', { token: actor.token });
  const view = (await t.request('GET', base + '/packet', { token: actor.token })).json.view;
  check.ok(view.eligible_issues.some(issue => /credit account/i.test(issue.record_kind)), 'mixed report has a supported ordinary account issue');
  check.ok(view.eligible_issues.some(issue => /collection/i.test(issue.record_kind)
    && /duplicate/i.test(issue.check_kind) && issue.consumer_label === 'VIOLATION'),
    'mixed report has a supported collection duplicate violation');
  check.ok(view.eligible_issues.every(issue => !issue.limitation_concern && issue.basis_type !== 'LIMITATION_ASSESSMENT'),
    'mixed forms use reporting violations and never court time-limit information');
  await t.request('POST', base + '/packet/select', { token: actor.token, body: { issue_ids: view.eligible_issues.map(issue => issue.issue_id) } });
  const ready = await t.preparePostalPacket(actor, id);
  check.deepEqual(ready.packet.required_form_manifest.map(form => form.filename).sort(), ['ca-equifax-account.pdf', 'ca-equifax-public-record.pdf'], 'mixed selected kinds require both relevant official Equifax forms');
  check.equal((await t.request('POST', base + '/packet/approve', { token: actor.token, body: { reviewed_version: ready.packet.preview_version } })).status, 200, 'mixed mail packet approves its reviewed complete form set');
  const download = await t.request('GET', base + '/packet-download', { token: actor.token });
  const entries = unzipStored(download.bytes);
  check.ok(entries.some(entry => entry.name === 'ca-equifax-account.pdf') && entries.some(entry => entry.name === 'ca-equifax-public-record.pdf'), 'actual mixed packet archive includes both required forms');
}
async function mixedBureau(t, check) {
  const actor = await t.account('mixed-packet@example.test'), auth = body => ({ token: actor.token, body });
  await t.request('PUT', '/api/account/profile', auth({ profile: PROFILE }));
  const created = await t.request('POST', '/api/cases', auth({ country: 'CA', region: 'CA-NS', bureau: 'TRANSUNION' }));
  const base = '/api/cases/' + created.json.case.case_id;
  for (const [bureau, creditor] of [['Equifax', 'Fictional Creditor EQ'], ['TransUnion', 'Fictional Creditor TU']]) {
    const bytes = buildPdf({ pages: [{ lines: [bureau + ' Consumer Credit Report', 'Report Date: June 12, 2026', creditor + ' Balance $100 Opened 02/13/2020 Closed 01/01/2019'] }] });
    await t.request('POST', base + '/files', auth({ originalFilename: bureau + '.pdf', declaredBytes: bytes.length, mimeType: 'application/pdf', contentBase64: bytes.toString('base64') }));
  }
  await t.request('POST', base + '/evaluate', { token: actor.token });
  const view = (await t.request('GET', base + '/packet', { token: actor.token })).json.view;
  const eq = view.eligible_issues.find(issue => /Equifax/i.test(issue.report_identity?.bureau)), tu = view.eligible_issues.find(issue => /TransUnion/i.test(issue.report_identity?.bureau));
  check.ok(eq && tu, 'each report owns its own eligible issue');
  await t.request('POST', base + '/packet/select', auth({ issue_ids: [tu.issue_id] }));
  const settings = { ...options(), bureau: 'TRANSUNION' };
  check.equal((await t.request('POST', base + '/packet/support', auth({ support: settings }))).status, 200, 'second bureau selected is accepted despite aggregate first bureau');
  check.equal((await t.request('POST', base + '/packet/approve', auth({}))).status, 200, 'second-bureau correspondence approves');
  const download = await t.request('GET', base + '/packet-download', { token: actor.token });
  check.ok(/Report: TransUnion\b/.test(download.text) && /TransUnion investigation form/.test(comparableText(download.text)), 'correspondence and attached form identify the selected report bureau');
  await t.request('POST', base + '/packet/select', auth({ issue_ids: [eq.issue_id] }));
  check.equal((await t.request('POST', base + '/packet/approve', auth({}))).json.error.code, 'PACKET_BUREAU_MISMATCH', 'selection changed to another bureau cannot approve old recipient');
  check.equal((await t.request('POST', base + '/packet/support', auth({ support: { ...settings, bureau: 'EQUIFAX', purpose: 'PUBLIC_RECORD' } }))).json.error.code, 'PACKET_PURPOSE_MISMATCH', 'ordinary account cannot bypass account ID requirements with public-record purpose');
  await t.request('POST', base + '/packet/select', auth({ issue_ids: [eq.issue_id, tu.issue_id] }));
  check.equal((await t.request('POST', base + '/packet/support', auth({ support: settings }))).json.error.code, 'PACKET_BUREAU_MISMATCH', 'different bureaus need separate selected packets');
}
module.exports = { run, id: 'eb-account-packet-support', title: 'Saved consumer details and sourced bureau documents reach the approved packet', unzipStored };
if (require.main === module) {
  (async () => { const { TestService } = require('../harness.cjs'); const t = new TestService(module.exports.id); let passed = 0, failed = 0;
    const check = Object.fromEntries(['ok', 'equal', 'deepEqual', 'match'].map(method => [method, (...args) => { try { assert[method](...args); passed++; } catch (error) { failed++; console.error(error.message); } }]));
    await t.listen(); try { await run(t, check); } catch (error) { failed++; console.error(error.stack); } finally { await t.close(); }
    console.log(`${module.exports.id}: ${passed} passed, ${failed} failed, 0 skipped`); if (failed) process.exitCode = 1;
  })().catch(error => { console.error(error.stack); process.exitCode = 1; });
}
