'use strict';
/** Batch 59B: real private-store account data and opaque bytes, without new HTTP route dependencies. */

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const profiles = require('../../account-profile.cjs');
const documents = require('../../account-documents.cjs');
const accounts = require('../../accounts.cjs');
const cases = require('../../cases.cjs');
const uploads = require('../../uploads.cjs');
const { PrivateStore } = require('../../private-store.cjs');
const { ServiceError } = require('../../errors.cjs');

const PDF = Buffer.from('%PDF-1.4\n% Fictional supporting document; no identity data.\n%%EOF\n');
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xc0, 0, 11, 8, 0, 1, 0, 1, 1, 1, 0x11, 0, 0xff, 0xd9]);

function input(bytes, options) {
  return {
    document_type: 'IDENTITY', document_kind: 'PASSPORT', originalFilename: 'fictional.pdf',
    declaredBytes: bytes.length, mimeType: 'application/pdf', contentBase64: bytes.toString('base64'),
    ...(options || {})
  };
}

function refusal(check, callback, code, label) {
  let caught = null;
  try { callback(); } catch (error) { caught = error; }
  check.ok(caught instanceof ServiceError, `${label}: typed refusal`);
  check.equal(caught && caught.code, code, label);
  return caught;
}

async function run(t, check) {
  const store = t.service.store;
  const ownerSession = await t.unpaidAccount('account-details-owner@example.test');
  const strangerSession = await t.unpaidAccount('account-details-stranger@example.test');
  const owner = accounts.resolveSession(store, ownerSession.token);
  const stranger = accounts.resolveSession(store, strangerSession.token);
  const blank = Object.fromEntries(profiles.PROFILE_FIELDS.map((key) => [key, '']));
  check.deepEqual(profiles.getProfile(store, owner), blank, 'new account has optional empty correspondence fields');
  check.deepEqual(documents.listDocuments(store, owner), [], 'new account has no supporting documents');
  refusal(check, () => profiles.getProfile(store, null), 'AUTHENTICATION_REQUIRED', 'profile requires a resolved account');
  refusal(check, () => documents.listDocuments(store, null), 'AUTHENTICATION_REQUIRED', 'documents require a resolved account');

  const saved = profiles.setProfile(store, owner, {
    full_name: '  Fictional Sample  ', date_of_birth: '1992-02-29', phone: '+1 902 555 0100',
    contact_email: 'fictional.contact@example.test', address_line1: '10 Sample Street', address_line2: 'Unit 2',
    city: 'Halifax', region: 'Nova Scotia', postal_code: 'B3J 0A1', country: 'Canada',
    previous_address: '20 Previous Street, Halifax'
  });
  check.equal(saved.full_name, 'Fictional Sample', 'consumer correspondence is trimmed');
  check.equal(saved.date_of_birth, '1992-02-29', 'real leap day is accepted');
  check.equal(profiles.getProfile(store, owner).address_line2, 'Unit 2', 'optional address detail is retained');
  check.deepEqual(profiles.getProfile(store, stranger), blank, 'other account profile is separate');
  check.equal(store.state().accounts.find((row) => row.account_id === owner.account_id).email,
    owner.email, 'contact email cannot change the sign-in address');
  const changed = profiles.setProfile(store, owner, { phone: '', city: 'Dartmouth' });
  check.equal(changed.phone, '', 'an empty supplied string clears the field');
  check.equal(changed.city, 'Dartmouth', 'partial update changes its field');
  check.equal(changed.full_name, saved.full_name, 'partial update preserves omitted fields');
  const publicProfile = profiles.getProfile(store, owner);
  publicProfile.full_name = 'Mutation outside store';
  check.equal(profiles.getProfile(store, owner).full_name, saved.full_name, 'returned object cannot mutate persisted profile');

  const invalidProfiles = [null, [], { account_id: stranger.account_id }, { password: 'secret' },
    { full_name: 1 }, { full_name: 'x'.repeat(profiles.FIELD_LIMITS.full_name + 1) },
    { contact_email: 'invalid-address' }, { date_of_birth: '1991-02-29' }, { date_of_birth: '2026-13-01' },
    { date_of_birth: '9999-01-01' }, { date_of_birth: '01/02/1990' }, { address_line1: 'one\nInjected' }];
  for (let i = 0; i < invalidProfiles.length; i++) {
    refusal(check, () => profiles.setProfile(store, owner, invalidProfiles[i]), 'INVALID_REQUEST', `invalid profile ${i} is refused`);
  }
  check.equal(profiles.getProfile(store, owner).full_name, saved.full_name, 'refused profile updates leave saved details intact');

  const pdf = documents.receiveDocument(store, owner, input(PDF, { originalFilename: 'C:\\fakepath\\fictional.pdf' }));
  const png = documents.receiveDocument(store, owner, input(PNG, {
    document_type: 'ADDRESS', document_kind: 'UTILITY_BILL', originalFilename: 'address.png', mimeType: 'image/png'
  }));
  const jpeg = documents.receiveDocument(store, owner, input(JPEG, {
    document_type: 'SUPPORTING', document_kind: 'OTHER', originalFilename: 'support.jpeg', mimeType: 'image/jpeg'
  }));
  check.equal(pdf.original_filename, 'fictional.pdf', 'browser filename path is removed');
  check.match(pdf.file_id, /^[a-f0-9]{32}$/, 'bytes are keyed by an opaque blob id');
  check.deepEqual([pdf.content_type, png.content_type, jpeg.content_type],
    ['application/pdf', 'image/png', 'image/jpeg'], 'retained content type comes from the bytes');
  check.equal(documents.listDocuments(store, owner).length, 3, 'owned documents are listed');
  check.deepEqual(documents.listDocuments(store, stranger), [], 'another account sees none of these documents');
  const publicMetadata = JSON.stringify(documents.listDocuments(store, owner));
  check.ok(!/sha256|stored_blob|account_id|case_id|[A-Z]:\\|absolute_path/.test(publicMetadata), 'public metadata contains no custody digest or private path');
  const persisted = store.state().files.find((row) => row.file_id === pdf.file_id);
  check.equal(persisted.purpose, 'ACCOUNT_SUPPORT', 'document row is explicitly account support');
  check.equal(persisted.case_id, null, 'support document belongs to the account, not a report');
  check.equal(persisted.stored_blob, true, 'existing deletion can identify a real stored blob');
  check.equal(persisted.sha256, crypto.createHash('sha256').update(PDF).digest('hex'), 'custody records the original bytes hash');
  check.ok(!Object.hasOwn(persisted, 'extraction') && !Object.hasOwn(persisted, 'supported_format'), 'support bytes are not parsed as a report');
  check.equal(store.state().results.length, 0, 'account inputs do not generate report results');
  const download = documents.getDocument(store, owner, pdf.file_id);
  check.deepEqual(download.document, pdf, 'download carries the same public metadata');
  check.ok(download.bytes.equals(PDF), 'download returns exactly the owned uploaded bytes');
  refusal(check, () => documents.getDocument(store, stranger, pdf.file_id), 'NOT_AUTHORIZED', 'stranger download is refused');
  refusal(check, () => documents.deleteDocument(store, stranger, pdf.file_id), 'NOT_AUTHORIZED', 'stranger deletion is refused');
  refusal(check, () => documents.getDocument(store, owner, 'a'.repeat(32)), 'NOT_FOUND', 'unknown document is not found');
  check.ok(store.blobExists(pdf.file_id), 'refused ownership requests preserve the bytes');

  const material = documents.materialDocuments(store, owner, [png.file_id, pdf.file_id]);
  check.deepEqual(material.map((row) => row.file_id), [png.file_id, pdf.file_id].sort(), 'approval document material is deterministic by id');
  check.equal(material.find((row) => row.file_id === pdf.file_id).sha256, persisted.sha256, 'approval material binds the verified original digest');
  check.deepEqual(documents.materialDocuments(store, owner, []), [], 'no documents selected needs no universal identity prerequisite');
  refusal(check, () => documents.materialDocuments(store, stranger, [pdf.file_id]), 'NOT_AUTHORIZED', 'approval cannot borrow a stranger document');
  refusal(check, () => documents.materialDocuments(store, owner, [pdf.file_id, pdf.file_id]), 'INVALID_REQUEST', 'duplicate selection is refused');
  refusal(check, () => documents.materialDocuments(store, owner, ['../state.json']), 'INVALID_REQUEST', 'selection cannot inject a storage path');

  const beforeInvalid = t.blobFiles().length;
  const oversizedPng = Buffer.from(PNG);
  oversizedPng.writeUInt32BE(13000, 16);
  const invalidDocuments = [
    [input(PDF, { document_type: 'VERIFIED_ID' }), 'INVALID_REQUEST'],
    [input(PDF, { document_kind: 'x'.repeat(documents.MAX_DOCUMENT_KIND_LENGTH + 1) }), 'INVALID_REQUEST'],
    [input(PDF, { account_id: stranger.account_id }), 'INVALID_REQUEST'],
    [input(PDF, { declaredBytes: PDF.length + 1 }), 'INVALID_REQUEST'],
    [input(PDF, { mimeType: 'image/png' }), 'UNSUPPORTED_FILE_TYPE'],
    [input(PDF, { originalFilename: 'wrong.jpg' }), 'UNSUPPORTED_FILE_TYPE'],
    [input(PNG, { originalFilename: 'wrong.pdf' }), 'UNSUPPORTED_FILE_TYPE'],
    [input(PDF, { originalFilename: 'wrong.exe' }), 'UNSUPPORTED_FILE_EXTENSION'],
    [input(PDF, { contentBase64: '** malformed **' }), 'MALFORMED_UPLOAD_BODY'],
    [input(Buffer.from('not a container')), 'UNSUPPORTED_FILE_TYPE'],
    [input(oversizedPng, { originalFilename: 'large.png', mimeType: 'image/png' }), 'IMAGE_DIMENSIONS_TOO_LARGE'],
    [input(PDF, { declaredBytes: documents.MAX_FILE_BYTES + 1 }), 'FILE_TOO_LARGE']
  ];
  for (let i = 0; i < invalidDocuments.length; i++) {
    const [body, code] = invalidDocuments[i];
    refusal(check, () => documents.receiveDocument(store, owner, body), code, `invalid document ${i} is refused`);
  }
  check.equal(t.blobFiles().length, beforeInvalid, 'refused metadata/content uploads retain no bytes');

  const reloaded = new PrivateStore(t.dataDir);
  check.deepEqual(profiles.getProfile(reloaded, owner), profiles.getProfile(store, owner), 'profile survives a fresh store instance');
  check.deepEqual(documents.listDocuments(reloaded, owner), documents.listDocuments(store, owner), 'document metadata survives restart');
  check.ok(documents.getDocument(reloaded, owner, png.file_id).bytes.equals(PNG), 'document bytes survive restart');
  const changedBytes = Buffer.from(PDF);
  changedBytes[changedBytes.length - 1] ^= 1;
  store.putBlob(pdf.file_id, changedBytes);
  const changedError = refusal(check, () => documents.getDocument(store, owner, pdf.file_id),
    'SERVICE_STATE_UNAVAILABLE', 'same-size changed blob cannot be downloaded');
  check.equal(changedError.detail, null, 'integrity refusal contains no hash or path');
  refusal(check, () => documents.materialDocuments(store, owner, [pdf.file_id]),
    'SERVICE_STATE_UNAVAILABLE', 'changed blob cannot enter packet approval material');
  store.putBlob(pdf.file_id, PDF);
  store.deleteBlob(png.file_id);
  refusal(check, () => documents.getDocument(store, owner, png.file_id), 'SERVICE_STATE_UNAVAILABLE', 'missing blob cannot be downloaded');
  refusal(check, () => documents.materialDocuments(store, owner, [png.file_id]), 'SERVICE_STATE_UNAVAILABLE', 'missing blob cannot enter approval material');
  store.putBlob(png.file_id, PNG);

  const beforeFailedWrite = t.blobFiles().length;
  const failedStore = {
    state: () => store.state(), putBlob: (id, bytes) => store.putBlob(id, bytes),
    deleteBlob: (id) => store.deleteBlob(id), update: () => { throw new ServiceError('INVALID_REQUEST'); }
  };
  refusal(check, () => documents.receiveDocument(failedStore, owner, input(PDF)), 'INVALID_REQUEST', 'failed state write refuses receipt');
  check.equal(t.blobFiles().length, beforeFailedWrite, 'failed state write removes its new blob');

  const countOwner = accounts.createAccount(store, { email: 'document-count@example.test', password: 'a-long-enough-password' }).account;
  for (let i = 0; i < documents.MAX_ACCOUNT_DOCUMENTS; i++) documents.receiveDocument(store, countOwner, input(PDF));
  const beforeCountRefusal = t.blobFiles().length;
  refusal(check, () => documents.receiveDocument(store, countOwner, input(PDF)), 'ACCOUNT_DOCUMENT_LIMIT_REACHED', 'ninth account document is refused');
  check.equal(t.blobFiles().length, beforeCountRefusal, 'file count refusal retains no blob');
  const first = documents.listDocuments(store, countOwner)[0];
  check.equal(documents.deleteDocument(store, countOwner, first.file_id).blobs_removed, 1, 'owned delete removes real bytes');
  check.equal(store.blobExists(first.file_id), false, 'deleted blob is absent on disk');
  refusal(check, () => documents.getDocument(store, countOwner, first.file_id), 'NOT_FOUND', 'deleted document no longer resolves');
  check.ok(documents.receiveDocument(store, countOwner, input(PDF)).file_id, 'deletion frees an account document slot');

  const quotaOwner = accounts.createAccount(store, { email: 'document-quota@example.test', password: 'a-long-enough-password' }).account;
  const large = Buffer.alloc(documents.MAX_FILE_BYTES, 0x20);
  PDF.copy(large);
  const reportId = crypto.randomBytes(16).toString('hex');
  store.putBlob(reportId, large);
  const reportCase = cases.createCase(store, quotaOwner, { country: 'CA', region: 'CA-NS' });
  store.update((state) => {
    state.files.push({ file_id: reportId, account_id: quotaOwner.account_id, case_id: reportCase.case_id,
      stored_bytes: large.length, stored_blob: true });
    return true;
  });
  for (let i = 0; i < 3; i++) documents.receiveDocument(store, quotaOwner, input(large));
  check.equal(documents.listDocuments(store, quotaOwner).length, 3, '10 MiB documents accepted to the combined 40 MiB account cap');
  const beforeQuotaRefusal = t.blobFiles().length;
  refusal(check, () => documents.receiveDocument(store, quotaOwner, input(PDF)), 'ACCOUNT_STORAGE_QUOTA_EXCEEDED', 'report bytes count against supporting document quota');
  refusal(check, () => uploads.refuseIfOverQuota(store, quotaOwner, reportCase, 1), 'ACCOUNT_STORAGE_QUOTA_EXCEEDED', 'support bytes count against the existing report upload quota');
  check.equal(t.blobFiles().length, beforeQuotaRefusal, 'storage quota refusal retains no blob');
  const tooLarge = Buffer.alloc(documents.MAX_FILE_BYTES + 1, 0x20);
  PDF.copy(tooLarge);
  refusal(check, () => documents.receiveDocument(store, stranger, input(tooLarge, { declaredBytes: undefined })), 'FILE_TOO_LARGE', 'actual decoded file limit applies without a declaration');
  cases.deleteCase(store, quotaOwner, reportCase.case_id);
  check.equal(documents.listDocuments(store, quotaOwner).length, 3, 'deleting a report case preserves account supporting documents');
  check.ok(documents.receiveDocument(store, quotaOwner, input(PDF)).file_id, 'report case deletion frees shared account storage');

  const strangerDoc = documents.receiveDocument(store, stranger, input(PDF));
  const ownedIds = documents.listDocuments(store, owner).map((row) => row.file_id);
  const deletion = cases.deleteAccount(store, owner);
  check.equal(deletion.blobs_removed, ownedIds.length, 'existing account cascade removes every support blob');
  check.ok(ownedIds.every((id) => !store.blobExists(id)), 'account deletion removes supporting bytes from disk');
  check.ok(!store.state().accounts.some((row) => row.account_id === owner.account_id), 'account deletion removes saved correspondence');
  check.ok(!store.state().files.some((row) => row.account_id === owner.account_id), 'account deletion removes document metadata');
  refusal(check, () => accounts.resolveSession(store, ownerSession.token), 'AUTHENTICATION_REQUIRED', 'deleted account session is revoked');
  refusal(check, () => profiles.getProfile(store, owner), 'AUTHENTICATION_REQUIRED', 'deleted actor cannot read profile');
  check.ok(documents.getDocument(store, stranger, strangerDoc.file_id).bytes.equals(PDF), 'other account and document survive deletion');
  check.ok(!t.logText().includes('fictional.pdf') && !t.logText().includes('Fictional Sample'), 'private account data never enters ordinary logs');

  return { profile_validation: true, ownership: true, restart_persistence: true, content_validation: true,
    shared_storage_quota: true, download_integrity: true, approval_material_integrity: true, account_deletion: true,
    identity_validation_claimed: false, report_parsing_performed: false };
}

module.exports = { run, id: 'ea-account-profile-documents', title: 'Private account correspondence and owned supporting documents' };

/** Focused execution before the coordinator adds this section to the shared runner. */
if (require.main === module) {
  (async () => {
    const { TestService } = require('../harness.cjs');
    const t = new TestService(module.exports.id);
    let passed = 0;
    let failed = 0;
    const check = {};
    for (const method of ['ok', 'equal', 'deepEqual', 'match']) {
      check[method] = (...args) => {
        try { assert[method](...args); passed++; }
        catch (error) { failed++; process.stderr.write(`${error.message}\n`); }
      };
    }
    await t.listen();
    try { await run(t, check); }
    catch (error) { failed++; process.stderr.write(`${error.stack}\n`); }
    finally { await t.close(); }
    process.stdout.write(`${module.exports.id}: ${passed} passed, ${failed} failed, 0 skipped\n`);
    if (failed) process.exitCode = 1;
  })().catch((error) => { process.stderr.write(`${error.stack}\n`); process.exitCode = 1; });
}
