import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inventory, sha256, verifyRelease } from '../src/release.mjs';

// Deliberately package only committed Family Admin files, independently of dirty consumer work.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const git = (...args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' }).trim();
if (git('status', '--porcelain', '--', '.')) throw Error('COMMIT_FAMILY_ADMIN_BEFORE_FREEZING');
const commit = git('rev-parse', 'HEAD');
const paths = git('ls-files', '--', '.').split(/\r?\n/).filter(Boolean);
if (paths.some(p => (p.startsWith('.') && p !== '.gitignore') || p.includes('..') || /(?:^|\/)(?:node_modules|\.local)(?:\/|$)/.test(p)))
  throw Error('PACKAGE_PATH_REFUSED');
const files = paths.map(path => {
  const bytes = readFileSync(join(root, path));
  return { path, bytes: bytes.length, sha256: sha256(bytes) };
}).sort((a, b) => a.path.localeCompare(b.path, 'en'));
const release = 'crp-family-' + sha256(JSON.stringify(files)).slice(0, 20);
const destination = resolve(process.argv[2] || join(root, '.local', 'releases', release));
if (existsSync(destination)) throw Error('RELEASE_DESTINATION_EXISTS');
mkdirSync(destination, { recursive: true, mode: 0o700 });
for (const row of files) {
  mkdirSync(dirname(join(destination, row.path)), { recursive: true });
  copyFileSync(join(root, row.path), join(destination, row.path));
}
writeFileSync(join(destination, 'release.json'), JSON.stringify({ schema: 1, release, commit, files }, null, 2) + '\n', { flag: 'wx' });
if (inventory(destination).length !== files.length + 1) throw Error('PACKAGE_INVENTORY_FAILED');
const verified = verifyRelease(destination);
process.stdout.write(JSON.stringify({ ...verified, directory: destination }) + '\n');
