'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const accounts = require('../../accounts.cjs');
const legacy = require('../../legacy-password.cjs');
const bcrypt = require('../../password-vendor/bcryptjs-3.0.3.cjs');

// Fictional credentials generated independently with official bcryptjs 2.4.3 and a fixed salt.
// This tests compatibility with the earlier live application's bcrypt format, not live credentials.
const FIXTURES = [
  { password: 'oldpass8', hash: '$2a$10$N9qo8uLOickgx2ZMRZoMyeZpzef6VYuJkKS0JCPq5lpjucV9hVVVG' },
  { password: 'anciené8', hash: '$2a$10$N9qo8uLOickgx2ZMRZoMyebseWD0JSki..nqn3AEP1ZcUCDOsVjqK' },
  { password: 'x'.repeat(80), hash: '$2a$10$N9qo8uLOickgx2ZMRZoMyei43NRw/bh8w29dpv431GhmdA9d6xppu' }
];

async function run(t, check) {
  const store = t.service.store;
  const native = await t.unpaidAccount('native-continuity@example.test');
  const nativeBefore = store.state().accounts.find(a => a.account_id === native.account_id);
  const savedCompare = bcrypt.compareSync;
  let comparisons = 0;
  bcrypt.compareSync = (...args) => { comparisons++; return savedCompare(...args); };
  const imported = (email, hash, extra = {}) => {
    const account_id = 'acc_' + crypto.randomBytes(12).toString('hex');
    store.update(state => {
      state.accounts.push({ account_id, email, legacy_password_bcrypt: hash,
        created_at: new Date().toISOString(), failed_sign_ins: 0, ...extra });
      return true;
    });
    return account_id;
  };
  const signIn = (email, password, extra = {}) => t.request('POST', '/api/sessions', { body: { email, password, ...extra } });
  const row = id => store.state().accounts.find(a => a.account_id === id);

  try {
    const vendorDir = path.join(__dirname, '../../password-vendor');
    const provenance = JSON.parse(fs.readFileSync(path.join(vendorDir, 'provenance.json'), 'utf8'));
    for (const file of provenance.files) check.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(vendorDir, file.path))).digest('hex'),
      file.sha256, 'vendored original matches its verified archive digest: ' + file.path);

    const ownerId = imported('legacy-owner@example.test', FIXTURES[0].hash);
    check.equal(store.state().sessions.filter(s => s.account_id === ownerId).length, 0, 'imported credential does not import or invent a session');
    const failed = await signIn('legacy-owner@example.test', 'incorrect', { legacy_password_bcrypt: FIXTURES[0].hash });
    check.equal(failed.status, 401, 'wrong legacy password is refused even when a hash is supplied in the request');
    check.equal(row(ownerId).failed_sign_ins, 1, 'legacy credential failure is persisted in the ordinary attempt window');
    check.equal(row(ownerId).legacy_password_bcrypt, FIXTURES[0].hash, 'a refused sign-in does not replace the stored credential');
    check.ok(!row(ownerId).password_hash && !row(ownerId).password_salt, 'a refused sign-in creates no native password');
    const unknown = await signIn('unknown-continuity@example.test', FIXTURES[0].password);
    check.equal(unknown.status, failed.status, 'unknown account and wrong credential have the same response');
    check.equal(unknown.json.error.code, failed.json.error.code, 'unknown-account refusal does not disclose imported accounts');
    check.equal(row(ownerId).failed_sign_ins, 1, 'another email cannot change the imported account attempt window');
    const correct = await signIn(' LEGACY-OWNER@example.test ', FIXTURES[0].password);
    check.equal(correct.status, 200, 'correct existing short password signs in without the new-account minimum');
    check.deepEqual(correct.json.account, { account_id: ownerId, email: 'legacy-owner@example.test' }, 'sign-in retains the exact imported account identity');
    check.ok(!Object.hasOwn(row(ownerId), 'legacy_password_bcrypt'), 'successful sign-in removes the old bcrypt hash');
    check.match(row(ownerId).password_salt, /^[a-f0-9]{32}$/, 'conversion creates a native random password salt');
    check.match(row(ownerId).password_hash, /^[a-f0-9]{128}$/, 'conversion creates the current scrypt digest');
    check.equal(row(ownerId).failed_sign_ins, 0, 'success clears the prior attempt window');
    const ownerToken = /crp_session=([^;]+)/.exec(correct.setCookie || '')[1];
    check.equal((await t.request('GET', '/api/session', { token: ownerToken })).json.account.account_id,
      ownerId, 'the new session resolves to the imported account only');
    check.equal((await t.request('GET', '/api/account/security', { token: ownerToken })).json.recovery_key_available,
      false, 'an imported account has no invented recovery key');
    const issuedKey = await t.request('POST', '/api/account/recovery-key', { token: ownerToken, body: { password: FIXTURES[0].password } });
    check.equal(issuedKey.status, 200, 'signed-in existing consumer can set a recovery key with the valid original password');
    check.match(issuedKey.json.recovery_key, /^[A-Za-z0-9_-]{43}$/, 'recovery setup issues a real high-entropy key');

    let before = comparisons;
    check.equal((await signIn('legacy-owner@example.test', FIXTURES[0].password)).status, 200, 'converted short password continues to sign in with native verification');
    check.equal((await signIn(native.email, 'a-long-enough-password')).status, 200, 'existing native account still signs in');
    check.equal(comparisons, before, 'converted and existing native credentials never call bcrypt');
    const nativeAfter = row(native.account_id);
    check.equal(nativeAfter.password_hash, nativeBefore.password_hash, 'native account password hash is unchanged');
    check.equal(nativeAfter.password_salt, nativeBefore.password_salt, 'native account password salt is unchanged');
    check.equal((await t.request('POST', '/api/accounts', { body: { email: 'new-short@example.test', password: FIXTURES[0].password } })).status,
      400, 'new accounts retain the 12-character password minimum');

    for (let i = 1; i < FIXTURES.length; i++) {
      const id = imported(`legacy-encoding-${i}@example.test`, FIXTURES[i].hash);
      check.equal((await signIn(`legacy-encoding-${i}@example.test`, FIXTURES[i].password)).status, 200, 'earlier bcrypt UTF-8 or long-password credential verifies: ' + i);
      before = comparisons;
      check.equal((await signIn(`legacy-encoding-${i}@example.test`, FIXTURES[i].password)).status, 200, 'converted UTF-8 or long password verifies with scrypt: ' + i);
      check.equal(comparisons, before, 'converted encoding fixture no longer invokes bcrypt: ' + i);
      check.ok(!row(id).legacy_password_bcrypt, 'converted encoding fixture deletes legacy hash: ' + i);
      if (i === 2) check.equal((await signIn(`legacy-encoding-${i}@example.test`, 'x'.repeat(72) + 'different')).status, 401,
        'after conversion the full password is checked rather than a shared bcrypt prefix');
    }

    const lockedId = imported('legacy-lockout@example.test', FIXTURES[0].hash);
    for (let i = 0; i < accounts.MAX_FAILED_ATTEMPTS; i++) check.equal((await signIn('legacy-lockout@example.test', 'incorrect')).status,
      i === accounts.MAX_FAILED_ATTEMPTS - 1 ? 429 : 401, 'legacy failure enforces ordinary lockout at attempt ' + (i + 1));
    check.equal(row(lockedId).failed_sign_ins, accounts.MAX_FAILED_ATTEMPTS, 'all legacy failed attempts persist');
    before = comparisons;
    check.equal((await signIn('legacy-lockout@example.test', FIXTURES[0].password)).status, 429, 'correct legacy password is refused while locked');
    check.equal(comparisons, before, 'locked accounts do not perform password work');
    check.equal(row(lockedId).legacy_password_bcrypt, FIXTURES[0].hash, 'lockout leaves the imported credential intact');
    check.equal((await signIn(native.email, 'a-long-enough-password')).status, 200, 'legacy lockout does not lock an unrelated account');
    store.update(state => { state.accounts.find(a => a.account_id === lockedId).locked_until = new Date(Date.now() - 1000).toISOString(); return true; });
    check.equal((await signIn('legacy-lockout@example.test', FIXTURES[0].password)).status, 200, 'correct legacy password works after the ordinary lockout expires');
    check.ok(!row(lockedId).legacy_password_bcrypt && row(lockedId).failed_sign_ins === 0, 'expired lockout success converts the credential and clears failures');

    const invalidHashes = [FIXTURES[0].hash.replace('$10$', '$09$'), FIXTURES[0].hash.replace('$10$', '$15$'),
      FIXTURES[0].hash.replace('$10$', '$99$'), FIXTURES[0].hash.slice(0, -1), FIXTURES[0].hash.slice(0, -1) + '!', null];
    for (let i = 0; i < invalidHashes.length; i++) {
      const id = imported(`legacy-invalid-${i}@example.test`, invalidHashes[i]);
      before = comparisons;
      check.equal((await signIn(`legacy-invalid-${i}@example.test`, FIXTURES[0].password)).status, 401, 'invalid or excessive bcrypt cost refuses safely: ' + i);
      check.equal(comparisons, before, 'invalid hash performs no bcrypt work: ' + i);
      check.equal(row(id).failed_sign_ins, 1, 'invalid stored credential still uses the ordinary failure counter: ' + i);
    }
    before = comparisons;
    const oversizedId = imported('legacy-oversized@example.test', FIXTURES[0].hash);
    check.equal((await signIn('legacy-oversized@example.test', 'x'.repeat(1025))).status, 401, 'oversized password is rejected');
    check.equal(comparisons, before, 'oversized password does not enter bcrypt');
    check.equal(row(oversizedId).failed_sign_ins, 1, 'oversized attempt is counted');
    for (const prefix of ['2a', '2b', '2y']) check.equal(legacy.verifyLegacyPassword(FIXTURES[0].password, FIXTURES[0].hash.replace('$2a$', '$' + prefix + '$')),
      true, 'supported imported bcrypt prefix verifies: ' + prefix);
    for (const cost of ['10', '11', '12', '13', '14']) check.equal(legacy.validLegacyPasswordHash(FIXTURES[0].hash.replace('$10$', '$' + cost + '$')),
      true, 'bounded supported cost is admitted without exercising excessive work: ' + cost);

    const recoveryKey = crypto.randomBytes(32).toString('base64url');
    const recoveryId = imported('legacy-recovery@example.test', FIXTURES[0].hash,
      { recovery_key_digest: accounts.tokenDigest('crp-recovery-v1:' + recoveryKey) });
    const recover = password => t.request('POST', '/api/account/recover',
      { body: { email: 'legacy-recovery@example.test', recovery_key: recoveryKey, password } });
    check.equal((await recover('short')).status, 400, 'legacy recovery retains the new-password minimum');
    const replacement = 'a-new-fictional-password';
    check.equal((await recover(replacement)).status, 200, 'valid recovery proof changes an imported credential');
    check.ok(!Object.hasOwn(row(recoveryId), 'legacy_password_bcrypt'), 'recovery removes the legacy password rather than leaving a fallback');
    before = comparisons;
    check.equal((await signIn('legacy-recovery@example.test', FIXTURES[0].password)).status, 401, 'old legacy password cannot sign in after recovery');
    check.equal((await signIn('legacy-recovery@example.test', replacement)).status, 200, 'new recovery password signs in normally');
    check.equal(comparisons, before, 'recovered credentials never invoke bcrypt');
    check.equal((await t.request('GET', '/api/session', { token: native.token })).status, 200, 'legacy recovery preserves another account session');

    // Even a malformed native row cannot silently revive an old imported password.
    imported('legacy-no-fallback@example.test', FIXTURES[0].hash, { password_salt: 'invalid', password_hash: 'invalid' });
    before = comparisons;
    check.equal((await signIn('legacy-no-fallback@example.test', FIXTURES[0].password)).status, 401, 'native credential fields prohibit legacy fallback');
    check.equal(comparisons, before, 'malformed native fields do not trigger bcrypt fallback');
    const stateText = JSON.stringify(store.state());
    check.ok(!stateText.includes(FIXTURES[0].password) && !stateText.includes(replacement) && !stateText.includes(recoveryKey), 'passwords and raw recovery proofs are never persisted');
    check.ok(!t.logText().includes(FIXTURES[0].password) && !t.logText().includes(FIXTURES[0].hash) && !t.logText().includes(recoveryKey), 'logs contain no legacy hashes, passwords or recovery secrets');
    return { legacy_account_login: true, atomic_scrypt_conversion: true, ordinary_lockout: true,
      native_accounts_preserved: true, recovery_clears_legacy_password: true, bounded_local_verification: true,
      fictional_credentials_only: true, sessions_roles_or_entitlements_imported: false };
  } finally {
    bcrypt.compareSync = savedCompare;
  }
}

module.exports = { run, id: 'ey-legacy-account-continuity', title: 'Existing account password continuity and local conversion to scrypt' };

// Focused execution while the integration owner registers this section in the shared runner.
if (require.main === module) {
  (async () => {
    const { TestService } = require('../harness.cjs');
    const t = new TestService(module.exports.id);
    let passed = 0, failed = 0;
    const check = {};
    for (const method of ['ok', 'equal', 'deepEqual', 'match']) check[method] = (...args) => {
      try { assert[method](...args); passed++; }
      catch (error) { failed++; process.stderr.write(error.message + '\n'); }
    };
    await t.listen();
    try { await run(t, check); }
    catch (error) { failed++; process.stderr.write(error.stack + '\n'); }
    finally { await t.close(); }
    process.stdout.write(module.exports.id + ': ' + passed + ' passed, ' + failed + ' failed, 0 skipped\n');
    if (failed) process.exitCode = 1;
  })().catch(error => { process.stderr.write(error.stack + '\n'); process.exitCode = 1; });
}
