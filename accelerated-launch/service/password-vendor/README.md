# Legacy account password verifier

The unmodified CommonJS/UMD build of [bcryptjs 3.0.3](https://github.com/dcodeIO/bcrypt.js) is retained locally for verification of existing live-account password hashes. The operator imports the hash as `legacy_password_bcrypt`; public account requests cannot create that field. A successful sign-in converts the supplied password to the existing salted scrypt format and removes the legacy hash in the same private-store update.

The official npm archive's SHA-512 integrity and the selected files' SHA-256 digests were verified before copying. Exact sources and checksums are in `provenance.json`; the original BSD 3-Clause license is in `bcryptjs-LICENSE.txt`. The runtime uses no network access or password-bearing subprocess.

Only bcrypt 2a, 2b or 2y hashes at costs 10 through 14 are accepted, with the existing 1,024-character password ceiling. Existing short passwords remain valid at sign-in; new-account and recovery passwords retain the current 12-character minimum. Native scrypt credentials take precedence and never fall back to bcrypt. Bcrypt's existing 72-byte input behavior is preserved for the first verification; subsequent sign-ins verify the full password entered during conversion.
