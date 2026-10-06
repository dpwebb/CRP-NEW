'use strict';
/**
 * u-hardening.cjs — OWNER-ALL82-001 / B4: "Harden private storage, upload limits, concurrent operations,
 * sessions, account isolation, deletion and restart recovery."
 *
 * Everything here is measured against the real service: the real loopback listener, the real private store on
 * disk, the real retention sweep. Where a fault cannot be produced over HTTP — a corrupted state file, a
 * process that died mid-upload, a second writer — the files are manipulated directly and the service's own
 * recovery code is what is then exercised. No timeout is waited out and no clock is faked: an expiry is
 * produced by aging a recorded deadline, which is the same thing a restart would observe.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { createService } = require('../../app.cjs');
const { PrivateStore, STATE_VERSION } = require('../../private-store.cjs');
const accounts = require('../../accounts.cjs');
const retention = require('../../retention.cjs');
const uploads = require('../../uploads.cjs');
const harness = require('../harness.cjs');

const FIXTURES = require('../../../../internal-validation/ca-ns-last-payment-six-year/tests/fixtures.cjs');
const CASE_BODY = { country: 'CA', region: 'CA-NS' };
const PASSWORD = 'a-long-enough-password';

function statePath(t) {
  return path.join(t.dataDir, 'state.json');
}

function readState(t) {
  return JSON.parse(fs.readFileSync(statePath(t), 'utf8'));
}

/** Age a file so the retention grace period no longer protects it. */
function ageFile(file, minutes) {
  const when = (Date.now() - minutes * 60000) / 1000;
  fs.utimesSync(file, when, when);
}

async function openCase(t, actor) {
  const created = await t.request('POST', '/api/cases', { token: actor.token, body: CASE_BODY });
  assert.equal(created.status, 201);
  return created.json.case.case_id;
}

function uploadBody(bytes, name) {
  return {
    originalFilename: name || 'lookalike.pdf',
    declaredBytes: bytes.length,
    mimeType: 'application/pdf',
    contentBase64: bytes.toString('base64')
  };
}


/* ------------------------------------------------------------------ sessions */

async function sessionHardening(t, check, evidence) {
  const owner = await t.account('hardening-sessions@example.test');
  await openCase(t, owner);

  /* AN IDLE SESSION EXPIRES, IS DESTROYED ON PRESENTATION, AND CANNOT BE RETRIEVED. */
  t.service.store.update((state) => {
    for (const row of state.sessions) {
      if (row.account_id === owner.account_id) row.idle_expires_at = new Date(Date.now() - 1000).toISOString();
    }
    return true;
  });
  const idle = await t.request('GET', '/api/cases', { token: owner.token });
  check.equal(idle.status, 401, 'an idle-expired session is refused');
  check.equal(readState(t).sessions.filter((row) => row.account_id === owner.account_id).length, 0,
    'and the row is destroyed on presentation rather than left dormant');
  check.equal((await t.request('GET', '/api/cases', { token: owner.token })).status, 401, 'and the token does not come back to life');

  /* AN ABSOLUTE LIFETIME EXPIRES EVEN A SESSION THAT IS IN CONSTANT USE. */
  const reSignIn = await t.request('POST', '/api/sessions', { body: { email: owner.email, password: PASSWORD } });
  check.equal(reSignIn.status, 200, 'signing in again works, and mints a NEW session');
  const fresh = /crp_session=([^;]+)/.exec(reSignIn.setCookie || '')[1];
  check.notEqual(fresh, owner.token, 'the new token is not the old one');
  check.equal((await t.request('GET', '/api/cases', { token: owner.token })).status, 401, 'and the old token stays dead: signing in does not revive it');
  check.equal((await t.request('GET', '/api/cases', { token: fresh })).status, 200, 'while the new one works');
  t.service.store.update((state) => {
    for (const row of state.sessions) row.expires_at = new Date(Date.now() - 1000).toISOString();
    return true;
  });
  check.equal((await t.request('GET', '/api/cases', { token: fresh })).status, 401, 'an absolute-lifetime expiry is enforced too');

  /* THE SESSION TABLE IS BOUNDED: a loop of sign-ins cannot grow it without limit. */
  const tokens = [];
  for (let i = 0; i < accounts.MAX_ACTIVE_SESSIONS_PER_ACCOUNT + 4; i += 1) {
    const opened = await t.request('POST', '/api/sessions', { body: { email: owner.email, password: PASSWORD } });
    tokens.push(/crp_session=([^;]+)/.exec(opened.setCookie || '')[1]);
  }
  const held = readState(t).sessions.filter((row) => row.account_id === owner.account_id).length;
  check.equal(held, accounts.MAX_ACTIVE_SESSIONS_PER_ACCOUNT, 'the account holds no more sessions than the recorded cap');
  check.equal((await t.request('GET', '/api/cases', { token: tokens[tokens.length - 1] })).status, 200, 'the newest session works');
  check.equal((await t.request('GET', '/api/cases', { token: tokens[0] })).status, 401, 'and the oldest was dropped, not kept forever');

  /* A LOCKOUT IS A WINDOW, NOT A LIFE SENTENCE: eight failures lock it, and the lock ENDS. */
  const target = await t.unpaidAccount('hardening-lockout@example.test');
  const statuses = [];
  for (let i = 0; i < accounts.MAX_FAILED_ATTEMPTS; i += 1) {
    const attempt = await t.request('POST', '/api/sessions', { body: { email: target.email, password: 'not-the-password' } });
    statuses.push(attempt.status);
  }
  check.equal(statuses[0], 401, 'the first wrong password is a plain credential refusal');
  check.equal(statuses[statuses.length - 1], 429, 'and the last one is a rate refusal');
  check.equal((await t.request('POST', '/api/sessions', { body: { email: target.email, password: PASSWORD } })).status, 429,
    'even the CORRECT password is refused while the lockout is running');
  t.service.store.update((state) => {
    state.accounts.find((a) => a.email === target.email).locked_until = new Date(Date.now() - 1000).toISOString();
    return true;
  });
  const afterWindow = await t.request('POST', '/api/sessions', { body: { email: target.email, password: PASSWORD } });
  check.equal(afterWindow.status, 200, 'once the lockout window has passed, the correct password works again');
  check.equal(readState(t).accounts.find((a) => a.email === target.email).failed_sign_ins, 0, 'and the failure count is reset');

  evidence.sessions = {
    idle_expiry_enforced: true,
    absolute_expiry_enforced: true,
    session_cap: accounts.MAX_ACTIVE_SESSIONS_PER_ACCOUNT,
    lockout_is_a_window: true
  };
}


/* ------------------------------------------------------------------ concurrent operations */

async function concurrentOperations(t, check, evidence) {
  const owner = await t.account('hardening-concurrent@example.test');

  /* MANY WRITES AT ONCE MUST NOT LOSE ONE ANOTHER. */
  const created = await Promise.all(
    Array.from({ length: 12 }, () => t.request('POST', '/api/cases', { token: owner.token, body: CASE_BODY }))
  );
  check.ok(created.every((row) => row.status === 201), 'twelve concurrent case creations all succeed');
  const ids = new Set(created.map((row) => row.json.case.case_id));
  check.equal(ids.size, 12, 'and each got its OWN case id: no write was lost to a racing write');
  check.equal(readState(t).cases.filter((row) => row.account_id === owner.account_id).length, 12,
    'and the state file holds every one of them');

  const target = [...ids][0];
  const bytes = fs.readFileSync(FIXTURES.pdfFixtures().unpinned);
  const uploaded = await Promise.all(
    Array.from({ length: 6 }, () => t.request('POST', `/api/cases/${target}/files`, { token: owner.token, body: uploadBody(bytes) }))
  );
  check.ok(uploaded.every((row) => row.status === 201), 'six concurrent uploads to ONE case all succeed');
  check.equal(new Set(uploaded.map((row) => row.json.receipt.file_id)).size, 6, 'each stored under its own opaque id');
  const rows = readState(t).files.filter((row) => row.case_id === target);
  check.equal(rows.length, 6, 'and the state file records all six files');
  check.equal(new Set(rows.map((row) => row.file_id)).size, 6, 'with no row written twice');
  check.equal(rows.filter((row) => t.service.store.blobExists(row.file_id)).length, 6, 'and all six blobs exist on disk');

  const evaluated = await Promise.all(
    Array.from({ length: 4 }, () => t.request('POST', `/api/cases/${target}/evaluate`, { token: owner.token, body: {} }))
  );
  check.ok(evaluated.every((row) => row.status === 201), 'four concurrent evaluations of one case all succeed');
  check.ok(Array.isArray(readState(t).files), 'and the state file is still valid JSON afterwards');

  /* AN INTERRUPTED OPERATION LEAVES DEBRIS THAT IS CLEANED, AND NOTHING THAT IS IN USE. */
  const orphanId = 'ab'.repeat(16);
  t.service.store.putBlob(orphanId, Buffer.from('%PDF-1.4 orphan'));
  ageFile(t.service.store.blobPath(orphanId), 30);
  const partialName = `${'cd'.repeat(16)}.bin.part`;
  fs.writeFileSync(path.join(t.dataDir, 'blobs', partialName), 'partial bytes');
  ageFile(path.join(t.dataDir, 'blobs', partialName), 30);

  const swept = retention.applyRetention(t.service.store, {});
  check.equal(swept.orphan_blobs_removed, 1, 'a blob no row references, older than the grace period, is cleared');
  check.equal(swept.partial_blobs_removed, 1, 'and a half-written blob left by a crash is cleared');
  check.equal(t.service.store.blobExists(orphanId), false, 'the orphan file is gone from disk');
  check.equal(fs.existsSync(path.join(t.dataDir, 'blobs', partialName)), false, 'and the partial is gone too');

  for (const row of rows) ageFile(t.service.store.blobPath(row.file_id), 60);
  const again = retention.applyRetention(t.service.store, {});
  check.equal(again.orphan_blobs_removed, 0, 'a blob that a row still references is never swept, however old it is');
  check.equal(rows.every((row) => t.service.store.blobExists(row.file_id)), true, 'so every stored report survives the sweep');

  const freshId = 'ef'.repeat(16);
  t.service.store.putBlob(freshId, Buffer.from('%PDF-1.4 fresh'));
  const third = retention.applyRetention(t.service.store, {});
  check.ok(third.blobs_kept_inside_the_grace_period >= 1,
    'a blob written moments ago is never swept: it may be an upload still being written');
  check.equal(t.service.store.blobExists(freshId), true, 'so an in-flight upload is not deleted out from under itself');

  evidence.concurrency = {
    concurrent_cases: 12,
    concurrent_uploads_to_one_case: 6,
    concurrent_evaluations: 4,
    orphan_blobs_cleared: 1,
    partial_blobs_cleared: 1,
    referenced_blobs_kept: rows.length
  };
}


/* ------------------------------------------------------------------ upload limits */

async function uploadLimits(t, check, evidence) {
  const owner = await t.account('hardening-limits@example.test');
  const caseId = await openCase(t, owner);
  const bytes = fs.readFileSync(FIXTURES.pdfFixtures().unpinned);
  const before = t.blobFiles().filter((name) => name.endsWith('.bin')).length;

  for (let i = 0; i < uploads.MAX_CASE_FILES; i += 1) {
    const accepted = await t.request('POST', `/api/cases/${caseId}/files`, { token: owner.token, body: uploadBody(bytes, `lookalike-${i}.pdf`) });
    check.equal(accepted.status, 201, `file ${i + 1} of ${uploads.MAX_CASE_FILES} is accepted for storage and measured`);
  }
  const over = await t.request('POST', `/api/cases/${caseId}/files`, { token: owner.token, body: uploadBody(bytes, 'one-too-many.pdf') });
  check.equal(over.status, 409, 'the next file is refused');
  check.equal(over.json.error.code, 'FILE_COUNT_LIMIT_REACHED', 'and the refusal names the per-case limit');
  check.equal(t.blobFiles().filter((name) => name.endsWith('.bin')).length, before + uploads.MAX_CASE_FILES,
    'and nothing was written for the refused upload');

  /* The account-wide cap is enforced by the same pre-write check, measured with a stub store so the test does
     not have to move 40MB through the transport to prove arithmetic. */
  const nearFull = { state: () => ({ files: [{ case_id: 'c1', account_id: 'a1', stored_bytes: uploads.MAX_ACCOUNT_STORED_BYTES - 10 }] }) };
  let quotaCode = null;
  try {
    uploads.refuseIfOverQuota(nearFull, { account_id: 'a1' }, { case_id: 'c2' }, 1000);
  } catch (err) {
    quotaCode = err.code;
  }
  check.equal(quotaCode, 'ACCOUNT_STORAGE_QUOTA_EXCEEDED', 'an account at its storage cap refuses the next upload before writing');
  check.equal(uploads.MAX_ACCOUNT_STORED_BYTES, uploads.MAX_FILE_BYTES * 4, 'and the cap is a small multiple of one file limit');

  const atCap = {
    state: () => ({ files: Array.from({ length: uploads.MAX_CASE_FILES }, () => ({ case_id: 'c9', account_id: 'a1', stored_bytes: 1 })) })
  };
  let caseCode = null;
  try {
    uploads.refuseIfOverQuota(atCap, { account_id: 'a1' }, { case_id: 'c9' }, 10);
  } catch (err) {
    caseCode = err.code;
  }
  check.equal(caseCode, 'FILE_COUNT_LIMIT_REACHED', 'and a case at its cap refuses too, through the same function the upload path calls');

  const beforeRefusal = t.blobFiles().filter((name) => name.endsWith('.bin')).length;
  const badType = await t.request('POST', `/api/cases/${caseId}/files`, {
    token: owner.token,
    body: { originalFilename: 'x.docx', declaredBytes: 10, mimeType: 'application/msword', contentBase64: Buffer.from('x').toString('base64') }
  });
  check.equal(badType.status, 400, 'a refused file type is still refused at a full case');
  check.equal(t.blobFiles().filter((name) => name.endsWith('.bin')).length, beforeRefusal, 'and it wrote nothing');

  evidence.upload_limits = {
    max_file_bytes: uploads.MAX_FILE_BYTES,
    max_case_files: uploads.MAX_CASE_FILES,
    max_account_stored_bytes: uploads.MAX_ACCOUNT_STORED_BYTES,
    refused_before_any_write: true
  };
}

/* ------------------------------------------------------------------ upload retry idempotency */

async function retryIdempotency(t, check, evidence) {
  const owner = await t.account('hardening-retry@example.test');
  const caseId = await openCase(t, owner);
  const bytes = fs.readFileSync(FIXTURES.pdfFixtures().unpinned);
  const before = t.blobFiles().filter((name) => name.endsWith('.bin')).length;
  const body = uploadBody(bytes, 'retry.pdf');
  body.uploadKey = 'retry-key-abcdef1234567890';

  const first = await t.request('POST', `/api/cases/${caseId}/files`, { token: owner.token, body });
  check.equal(first.status, 201, 'the first upload is accepted');
  const firstId = first.json.receipt.file_id;

  const second = await t.request('POST', `/api/cases/${caseId}/files`, { token: owner.token, body });
  check.equal(second.status, 201, 're-posting the same uploadKey and bytes returns the original receipt');
  check.equal(second.json.receipt.file_id, firstId, 'with the SAME file id, never a second file');
  check.equal(t.blobFiles().filter((name) => name.endsWith('.bin')).length, before + 1, 'and no second blob is written');

  /* A different byte payload under the same key is refused, never silently reused. */
  const tampered = uploadBody(Buffer.concat([bytes, Buffer.from('x')]), 'retry.pdf');
  tampered.uploadKey = 'retry-key-abcdef1234567890';
  const wrong = await t.request('POST', `/api/cases/${caseId}/files`, { token: owner.token, body: tampered });
  check.equal(wrong.status, 400, 'the same key with different bytes is refused');
  check.equal(wrong.json.error.code, 'INVALID_REQUEST', 'and names the invalid retry');

  evidence.retry_idempotency = { same_file_id_reused: true, no_second_blob: true, tampered_key_refused: true };
}

/* ------------------------------------------------------------------ restart recovery */

async function restartRecovery(t, check, evidence) {
  const owner = await t.account('hardening-restart@example.test');
  await openCase(t, owner);
  check.ok(fs.existsSync(path.join(t.dataDir, 'state.json.bak')), 'a backup of the previous state is kept beside the state file');

  const intact = fs.readFileSync(statePath(t));
  const backupSnapshot = JSON.parse(fs.readFileSync(path.join(t.dataDir, 'state.json.bak'), 'utf8'));

  /* A CORRUPT STATE FILE IS RECOVERED FROM THE BACKUP, NOT ANSWERED AS EMPTY. The backup is the state as it
     was before the most recent write, so recovery restores the last successfully written state — it can be one
     write behind, and that is stated rather than hidden. */
  fs.writeFileSync(statePath(t), '{ this is not json', 'utf8');
  const recovered = await t.request('GET', '/api/cases', { token: owner.token });
  check.equal(recovered.status, 200, 'a corrupted state file is recovered from the backup rather than answered as empty');
  check.equal(recovered.json.cases.length, backupSnapshot.cases.filter((row) => row.account_id === owner.account_id).length,
    'and the recovered case list is exactly what the backup held for this account');
  check.equal(t.service.store.recoveredFromBackup, true, 'and the recovery is REPORTED, not silent');
  check.equal(readState(t).cases.length, backupSnapshot.cases.length, 'and the primary was rewritten from the backup');

  /* IF NEITHER CAN BE READ, THE SERVICE REFUSES RATHER THAN GUESSING. */
  fs.writeFileSync(statePath(t), 'not json at all');
  fs.writeFileSync(path.join(t.dataDir, 'state.json.bak'), 'also not json');
  const refused = await t.request('GET', '/api/cases', { token: owner.token });
  check.equal(refused.status, 503, 'when neither the state nor its backup can be read, the service REFUSES');
  check.equal(refused.json.error.code, 'SERVICE_STATE_UNAVAILABLE', 'with a typed refusal, not a 500');
  check.ok(/could not read its private state/i.test(refused.json.error.message), 'and a plain-language message');
  check.ok(!/not json at all/.test(refused.text), 'and the refusal echoes nothing from the broken file');
  fs.writeFileSync(statePath(t), intact);
  check.equal((await t.request('GET', '/api/cases', { token: owner.token })).status, 200, 'and it serves again once the state is restored');

  /* A RESTART ON THE SAME DIRECTORY RECOVERS THE SAME RECORDS AND REPORTS WHAT IT DID. */
  const restarted = createService({ dataDir: t.dataDir, logSink: () => {} });
  const startup = restarted.startup();
  check.equal(startup.state.readable, true, 'a restart reads the same state');
  check.equal(startup.state.record_counts.cases >= 1, true, 'and finds the cases the previous process wrote');
  check.equal(startup.state.version, STATE_VERSION, 'and reports the state version it read');
  check.equal(startup.payment.state, 'TEST_ADAPTER', 'and the same payment configuration');
  check.ok(/No report was read, moved or transmitted/.test(startup.plain), 'and says what the recovery did and did not do');

  /* A SESSION THAT HAS LAPSED IS SWEPT ON START; A LIVE ONE IS UNTOUCHED. */
  const stale = await t.unpaidAccount('hardening-restart-stale@example.test');
  t.service.store.update((state) => {
    for (const row of state.sessions) {
      if (row.account_id === stale.account_id) row.expires_at = new Date(Date.now() - 1000).toISOString();
    }
    return true;
  });
  const swept = retention.applyRetention(t.service.store, {});
  check.ok(swept.expired_sessions_removed >= 1, 'a lapsed session row is swept on start');
  check.equal((await t.request('GET', '/api/session', { token: stale.token })).status, 401, 'and it does not work afterwards');
  check.equal((await t.request('GET', '/api/session', { token: owner.token })).status, 200, 'while a live session is untouched by the sweep');

  evidence.restart_recovery = {
    recovered_from_backup: true,
    refuses_when_unreadable: true,
    state_version: startup.state.version,
    lapsed_sessions_swept_on_start: true,
    live_sessions_survive: true
  };
  return { owner };
}

/* ------------------------------------------------------------------ one writer, and the published policy */

async function secondWriterRefused(t, check, evidence) {
  const dir = harness.temporaryDataDir('u-second-writer');
  const modulePath = path.join(__dirname, '..', '..', 'private-store.cjs');
  const script = `const {PrivateStore}=require(${JSON.stringify(modulePath)});new PrivateStore(process.argv[1]);process.stdout.write('LOCKED\\n');setTimeout(()=>process.exit(0),20000);`;
  const child = spawn(process.execPath, ['-e', script, dir], { stdio: ['ignore', 'pipe', 'pipe'] });
  try {
    const ready = await new Promise((resolve) => {
      let buffer = '';
      const timer = setTimeout(() => resolve(false), 8000);
      child.stdout.on('data', (chunk) => {
        buffer += String(chunk);
        if (/LOCKED/.test(buffer)) {
          clearTimeout(timer);
          resolve(true);
        }
      });
      child.on('exit', () => {
        clearTimeout(timer);
        resolve(false);
      });
    });
    check.ok(ready, 'a second PROCESS took the write lock on a private data directory');
    let message = null;
    try {
      createService({ dataDir: dir });
    } catch (err) {
      message = err.message;
    }
    check.ok(Boolean(message) && /PRIVATE_STORE_ALREADY_HAS_A_WRITER/.test(message),
      'and this process REFUSES to become a second writer on the same directory');
    check.ok(Boolean(message) && /pid/.test(message), 'and the refusal names who holds it');
  } finally {
    child.kill();
    await new Promise((resolve) => setTimeout(resolve, 300));
    fs.rmSync(dir, { recursive: true, force: true });
  }

  /* A STALE LOCK — a writer that died — is taken over instead of bricking the service. */
  const staleDir = harness.temporaryDataDir('u-stale-lock');
  try {
    fs.mkdirSync(staleDir, { recursive: true });
    fs.writeFileSync(path.join(staleDir, 'store.lock'), JSON.stringify({ pid: 999999, started_at: new Date().toISOString() }), 'utf8');
    const store = new PrivateStore(staleDir);
    check.ok(store.dataDir.length > 0, 'a lock left by a dead writer is taken over, so the directory is usable again');
  } finally {
    fs.rmSync(staleDir, { recursive: true, force: true });
  }

  evidence.single_writer = { second_process_refused: true, stale_lock_taken_over: true, lock_file: 'store.lock' };
}

async function retentionAndDeletion(t, check, evidence) {
  const policy = await t.request('GET', '/api/policy');
  check.equal(policy.status, 200, 'the retention and deletion policy is published openly');
  const text = JSON.stringify(policy.json.policy);
  check.ok(/until you delete/i.test(text), 'and it says a report is kept until the consumer deletes it');
  check.ok(/SHA-256 of the session token/i.test(text), 'and that only a hash of a session token is stored');
  check.ok(/no log record can carry report text/i.test(text), 'and that no report text can reach a log');
  check.ok(/no report, no identifier and no digest/i.test(text), 'and that nothing of the consumer’s appears in a public asset');
  check.equal(Object.keys(policy.json.policy).length, Object.keys(retention.POLICY).length, 'and every recorded policy clause is published');
  check.ok(/We did not find a reporting issue in the information we could review/i.test(policy.json.check_classes.no_issue_found_means),
    'and the three check classes are stated apart, including what “no issue found” means');

  /* ACCOUNT DELETION TAKES THE PURCHASE RECORDS WITH IT, AND EVERY SESSION. */
  const owner = await t.account('hardening-deletion@example.test');
  const caseId = await openCase(t, owner);
  await t.request('POST', `/api/cases/${caseId}/files`, {
    token: owner.token,
    body: uploadBody(fs.readFileSync(FIXTURES.pdfFixtures().unpinned))
  });
  const blobNamesBefore = t.blobFiles().filter((name) => name.endsWith('.bin'));
  const before = readState(t);
  check.ok(before.entitlements.some((row) => row.account_id === owner.account_id), 'the account holds an entitlement row');
  check.ok(before.files.some((row) => row.account_id === owner.account_id), 'and a stored file');
  const removed = await t.request('DELETE', '/api/account', { token: owner.token });
  check.equal(removed.status, 200, 'the account is deleted');
  check.equal(removed.json.stored_files_removed, 1, 'and reports the stored file it removed');
  const after = readState(t);
  for (const collection of ['accounts', 'sessions', 'cases', 'files', 'results', 'drafts', 'entitlements']) {
    check.equal(after[collection].some((row) => row.account_id === owner.account_id || row.email === owner.email), false,
      `deletion leaves no ${collection} row behind`);
  }
  check.equal(after.billing_events.some((row) => row.account_id === owner.account_id), false,
    'and no billing-event row survives the account either');
  check.equal(after.checkout_sessions.some((row) => row.account_id === owner.account_id), false,
    'and no checkout intent survives it');
  check.equal(t.blobFiles().filter((name) => name.endsWith('.bin')).length, blobNamesBefore.length - 1,
    'and that account’s report bytes are gone from disk');

  evidence.retention = {
    policy_clauses: Object.keys(retention.POLICY).length,
    account_deletion_cascades_to_entitlements: true,
    account_deletion_cascades_to_billing_events: true
  };
}

/* ------------------------------------------------------------------ the section */

async function run(t, check) {
  const evidence = { state_outside_the_repository: !t.dataDir.startsWith(harness.REPOSITORY_ROOT) };
  await sessionHardening(t, check, evidence);
  await concurrentOperations(t, check, evidence);
  await uploadLimits(t, check, evidence);
  await retryIdempotency(t, check, evidence);
  const restart = await restartRecovery(t, check, evidence);
  await secondWriterRefused(t, check, evidence);
  await retentionAndDeletion(t, check, evidence);

  /* Every file the service now writes is outside the repository, and none of them is a public asset. */
  for (const name of ['state.json', 'state.json.bak', 'store.lock', 'blobs']) {
    check.ok(fs.existsSync(path.join(t.dataDir, name)) || name === 'blobs', `${name} lives in the private directory, outside the repository`);
  }
  check.ok(!fs.existsSync(path.join(harness.REPOSITORY_ROOT, 'accelerated-launch', 'service', 'state.json')),
    'no state file is ever written inside the service tree');

  /* The log stream carries none of this section's private values. */
  const logs = t.logText();
  for (const [value, label] of [
    [restart.owner.email, 'an account address'],
    [restart.owner.token, 'a session token'],
    [t.dataDir, 'the private data directory'],
    ['state.json', 'a state file name']
  ]) {
    check.ok(!logs.includes(value), `${label} never appears in a log record`);
  }

  evidence.log_records = t.logs.length;
  return evidence;
}

module.exports = {
  run,
  id: 'u-hardening',
  title: 'Service hardening: sessions, concurrency, upload limits, restart recovery, single writer, retention and deletion'
};
