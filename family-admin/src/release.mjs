import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, lstatSync } from 'node:fs';
import { join, resolve } from 'node:path';

export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export function inventory(root, prefix = '') {
  const rows = [];
  for (const name of readdirSync(join(root, prefix)).sort()) {
    const path = prefix ? prefix + '/' + name : name;
    const stat = lstatSync(join(root, path));
    if (stat.isSymbolicLink()) throw Error('RELEASE_SYMLINK_REFUSED');
    if (stat.isDirectory()) rows.push(...inventory(root, path));
    else if (stat.isFile()) rows.push({ path, bytes: stat.size, sha256: sha256(readFileSync(join(root, path))) });
    else throw Error('RELEASE_SPECIAL_FILE_REFUSED');
  }
  return rows.sort((a, b) => a.path.localeCompare(b.path, 'en'));
}
export function verifyRelease(directory) {
  const root = resolve(directory);
  if (lstatSync(root).isSymbolicLink()) throw Error('RELEASE_SYMLINK_REFUSED');
  const manifest = JSON.parse(readFileSync(join(root, 'release.json'), 'utf8'));
  if (manifest.schema !== 1 || !/^[a-f0-9]{40}$/.test(manifest.commit) || !Array.isArray(manifest.files))
    throw Error('RELEASE_MANIFEST_INVALID');
  const actual = inventory(root).filter(row => row.path !== 'release.json');
  if (JSON.stringify(actual) !== JSON.stringify(manifest.files)) throw Error('RELEASE_FILES_CHANGED');
  const id = 'crp-family-' + sha256(JSON.stringify(actual)).slice(0, 20);
  if (manifest.release !== id) throw Error('RELEASE_ID_MISMATCH');
  return { release: id, commit: manifest.commit, manifest: sha256(readFileSync(join(root, 'release.json'))), files: actual.length };
}
