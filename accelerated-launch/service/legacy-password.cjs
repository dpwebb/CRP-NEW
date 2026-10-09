'use strict';

// Existing live account credentials are imported by the operator, never from a public request.
// Reject malformed or excessive-cost inputs before entering bcrypt's synchronous CPU work.
const LEGACY_BCRYPT_HASH = /^\$2[aby]\$(10|11|12|13|14)\$[./A-Za-z0-9]{53}$/;
const MAX_LEGACY_PASSWORD_LENGTH = 1024;

function validLegacyPasswordHash(value) {
  return typeof value === 'string' && LEGACY_BCRYPT_HASH.test(value);
}

function verifyLegacyPassword(password, hash) {
  if (typeof password !== 'string' || password.length > MAX_LEGACY_PASSWORD_LENGTH ||
      !validLegacyPasswordHash(hash)) return false;
  try {
    // Vendored original, pinned to the official npm archive: no subprocess, download or provider call.
    // Retain bcrypt's existing 72-byte input semantics until the first successful scrypt conversion.
    return require('./password-vendor/bcryptjs-3.0.3.cjs').compareSync(password, hash);
  } catch {
    return false;
  }
}

module.exports = { verifyLegacyPassword, validLegacyPasswordHash, MAX_LEGACY_PASSWORD_LENGTH };
