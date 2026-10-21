import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { inventory, sha256, verifyRelease } from '../src/release.mjs';

test('immutable release verifies exact files and refuses changed, extra and forged identities', () => {
  const root = mkdtempSync(join(tmpdir(), 'crp-family-release-'));
  try {
    writeFileSync(join(root, 'app.mjs'), 'export const example = true;\n');
    const files = inventory(root);
    const manifest = { schema: 1, release: 'crp-family-' + sha256(JSON.stringify(files)).slice(0,20), commit: 'a'.repeat(40), files };
    const save = () => writeFileSync(join(root, 'release.json'), JSON.stringify(manifest));
    save();
    assert.equal(verifyRelease(root).release, manifest.release);
    writeFileSync(join(root, 'app.mjs'), 'changed');
    assert.throws(() => verifyRelease(root), /RELEASE_FILES_CHANGED/);
    writeFileSync(join(root, 'app.mjs'), 'export const example = true;\n');
    writeFileSync(join(root, 'extra'), 'unexpected');
    assert.throws(() => verifyRelease(root), /RELEASE_FILES_CHANGED/);
    rmSync(join(root, 'extra'));
    manifest.release = 'crp-family-' + '0'.repeat(20); save();
    assert.throws(() => verifyRelease(root), /RELEASE_ID_MISMATCH/);
    manifest.commit = 'not-a-commit'; save();
    assert.throws(() => verifyRelease(root), /RELEASE_MANIFEST_INVALID/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
