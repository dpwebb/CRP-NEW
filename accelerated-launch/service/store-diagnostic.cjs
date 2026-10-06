'use strict';
// Inspection only: never construct PrivateStore, create directories, claim a lock or recover backups.
const fs = require('node:fs');
const path = require('node:path');
const { STATE_FILE, STATE_VERSION, EMPTY_STATE } = require('./private-store.cjs');

function inspectStateReadOnly(dir) {
  const file = path.join(dir, STATE_FILE);
  try {
    if (!fs.existsSync(file)) {
      // Existing files without their index must not be mistaken for a fresh store.
      if (fs.existsSync(dir)) {
        const entries = fs.readdirSync(dir);
        // First startup creates an empty blobs directory and writer lock before its first transaction.
        const scaffoldingOnly = entries.every(name => name === 'store.lock' ||
          (name === 'blobs' && fs.statSync(path.join(dir,name)).isDirectory() &&
           fs.readdirSync(path.join(dir,name)).length === 0));
        if (!scaffoldingOnly) return { passed:false, detail:'STATE_INDEX_MISSING_IN_NONEMPTY_DIRECTORY' };
      }
      return { passed:true, detail:'NO_STATE_FILE_YET' };
    }
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
      return { passed:false, detail:'INVALID_STATE_OBJECT' };
    const version = parsed.version === undefined ? 1 : parsed.version;
    if (!Number.isInteger(version) || version < 1 || version > STATE_VERSION)
      return { passed:false, detail:'UNSUPPORTED_STATE_VERSION' };
    const counts = {};
    for (const key of Object.keys(EMPTY_STATE)) {
      if (key === 'version') continue;
      if (parsed[key] !== undefined && !Array.isArray(parsed[key]))
        return { passed:false, detail:'INVALID_STATE_COLLECTION' };
      counts[key] = parsed[key] ? parsed[key].length : 0;
    }
    return { passed:true, detail:`state version ${version}, records ${JSON.stringify(counts)}` };
  } catch {
    // Parser exceptions can contain state excerpts. Never publish them.
    return { passed:false, detail:'STATE_UNREADABLE_REQUIRES_SERVICE_RECOVERY' };
  }
}
module.exports = { inspectStateReadOnly };
