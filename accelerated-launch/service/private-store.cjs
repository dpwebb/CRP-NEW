'use strict';
/**
 * private-store.cjs — the private, local, atomic store the B2 service keeps its state in.
 *
 * OWNER-ALL82-001 / B2. Everything a consumer's case touches — account rows, opaque file blobs, extraction
 * records, results — lives OUTSIDE this repository, in a directory the operator owns. REUSE LEDGER: the
 * storage keying is the legacy `reportStore.ts` rule (a location derived from an immutable internal id,
 * never from a user-supplied file name), and the repository guard below makes the CA-NS unit's recorded
 * boundary — "no report content, identifier or specimen is copied into this repository" — mechanical rather
 * than a promise.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

/** The repository this service may never write report bytes into. */
const REPOSITORY_ROOT = path.resolve(__dirname, '..', '..');

const STATE_FILE = 'state.json';
const BACKUP_FILE = 'state.json.bak';
const LOCK_FILE = 'store.lock';
const BLOB_DIR = 'blobs';

/**
 * The state shape. `version` is checked on read so a file written by a newer build is refused rather than
 * silently truncated by an older one.
 *
 * B4 added the entitlement arrays. They are part of the SAME atomic state file as the cases and files, so a
 * purchase cannot be recorded while a case write is lost: one file, one rename, one moment of truth.
 *
 * B4-PAY-001 added `upgrade_credits` (the once-only CAD upgrade credit derived from a verified one-time
 * payment) and `purchased_downloads` (a one-time purchase bound to one case's assessment-report download).
 * Both live in the same atomic state file so a credit reservation cannot be lost while a checkout write is.
 */
const STATE_VERSION = 3;

const EMPTY_STATE = Object.freeze({
  version: STATE_VERSION,
  accounts: [],
  sessions: [],
  cases: [],
  files: [],
  results: [],
  drafts: [],
  packets: [],
  entitlements: [],
  billing_events: [],
  checkout_sessions: [],
  upgrade_credits: [],
  purchased_downloads: []
});

/** A missing key in an older file is an empty list, never undefined, so a v1 file stays readable. */
function normalizeState(parsed) {
  const state = JSON.parse(JSON.stringify(EMPTY_STATE));
  if (!parsed || typeof parsed !== 'object') return state;
  const version = Number.isInteger(parsed.version) ? parsed.version : 1;
  if (version > STATE_VERSION) {
    throw new Error(`STATE_FILE_VERSION_IS_NEWER_THAN_THIS_BUILD: ${version} > ${STATE_VERSION}`);
  }
  for (const key of Object.keys(EMPTY_STATE)) {
    if (key === 'version') continue;
    if (Array.isArray(parsed[key])) state[key] = parsed[key];
  }
  return state;
}

function defaultDataDir() {
  return process.env.CRP_LOCAL_SERVICE_DATA || path.join(os.homedir(), '.crp-local-service');
}

/** Is a recorded writer still running? Used to refuse a second writer without demanding a lock library. */
function isProcessAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return Boolean(err && err.code === 'EPERM');
  }
}

/**
 * The privacy invariant, enforced at construction. A data directory inside the repository would place
 * report bytes in a tree that is copied, published and reviewed, so the service refuses to start rather
 * than accept it.
 */
function assertOutsideRepository(dir) {
  const resolved = path.resolve(dir);
  const relative = path.relative(REPOSITORY_ROOT, resolved);
  const inside = relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
  if (inside) {
    throw new Error(
      `PRIVATE_DATA_DIRECTORY_INSIDE_REPOSITORY_REFUSED: ${resolved} resolves inside ${REPOSITORY_ROOT}. ` +
      'Report bytes may not be stored in this repository; set CRP_LOCAL_SERVICE_DATA to a directory outside it.'
    );
  }
  return resolved;
}

class PrivateStore {
  constructor(dataDir, options) {
    const opts = options || {};
    this.dataDir = assertOutsideRepository(dataDir || defaultDataDir());
    this.stateFile = path.join(this.dataDir, STATE_FILE);
    this.backupFile = path.join(this.dataDir, BACKUP_FILE);
    this.lockFile = path.join(this.dataDir, LOCK_FILE);
    this.blobDir = path.join(this.dataDir, BLOB_DIR);
    this.recoveredFromBackup = false;
    fs.mkdirSync(this.dataDir, { recursive: true, mode: 0o700 });
    fs.mkdirSync(this.blobDir, { recursive: true, mode: 0o700 });
    try {
      fs.chmodSync(this.dataDir, 0o700);
      fs.chmodSync(this.blobDir, 0o700);
    } catch {
      /* Windows does not implement POSIX modes; the ACLs it does have are not changed here. */
    }
    if (opts.allowMultiWriter !== true) this.claimWriterLock();
  }

  /**
   * ONE WRITER PER STATE FILE. The whole-state read-modify-write below is atomic only inside one process, so a
   * second writer would silently clobber the first. A stale lock (a writer that died) is taken over rather than
   * left to brick the service; a live one is refused with an exact message.
   */
  claimWriterLock() {
    if (fs.existsSync(this.lockFile)) {
      let held = null;
      try {
        held = JSON.parse(fs.readFileSync(this.lockFile, 'utf8'));
      } catch {
        held = null;
      }
      const alive = held && isProcessAlive(Number(held.pid)) && Number(held.pid) !== process.pid;
      if (alive) {
        throw new Error(
          `PRIVATE_STORE_ALREADY_HAS_A_WRITER: pid ${held.pid} holds ${this.lockFile}. ` +
          'Two processes must not share one private data directory; stop the other one or point this one at its own directory.'
        );
      }
    }
    fs.writeFileSync(this.lockFile, JSON.stringify({ pid: process.pid, started_at: new Date().toISOString() }), { encoding: 'utf8', mode: 0o600 });
  }

  /**
   * Whole-state read. A missing state file is an empty store, never an error and never a partial read.
   *
   * A CORRUPT state file is a refusal, not an empty store: returning empty would look exactly like "the
   * consumer has no cases" and would be the most dangerous possible lie. If the backup written by the last
   * successful update is intact, it is restored and reported through `recoveredFromBackup`; if neither parses,
   * the caller gets a typed failure and the service refuses the request rather than guessing.
   */
  state() {
    if (!fs.existsSync(this.stateFile)) return normalizeState(null);
    try {
      return normalizeState(JSON.parse(fs.readFileSync(this.stateFile, 'utf8')));
    } catch (primaryError) {
      if (fs.existsSync(this.backupFile)) {
        try {
          const recovered = normalizeState(JSON.parse(fs.readFileSync(this.backupFile, 'utf8')));
          fs.copyFileSync(this.backupFile, this.stateFile);
          this.recoveredFromBackup = true;
          return recovered;
        } catch {
          /* Fall through to the typed refusal below. */
        }
      }
      const error = new Error(`PRIVATE_STORE_STATE_UNREADABLE: ${primaryError.message}`);
      error.code = 'SERVICE_STATE_UNAVAILABLE';
      throw error;
    }
  }

  /**
   * Read-modify-write. The mutator runs synchronously, and the new bytes are written to a temporary name and
   * renamed into place, so a crash mid-write cannot leave a half-written state file. The PREVIOUS contents are
   * kept as a backup, which is what makes the recovery above possible.
   */
  update(mutator) {
    const next = this.state();
    const returned = mutator(next);
    const serialized = JSON.stringify(next, null, 2);
    if (fs.existsSync(this.stateFile)) {
      try {
        fs.copyFileSync(this.stateFile, this.backupFile);
      } catch {
        /* A backup that cannot be written must not stop the write itself. */
      }
    }
    const temp = `${this.stateFile}.tmp`;
    fs.writeFileSync(temp, serialized, { encoding: 'utf8', mode: 0o600 });
    fs.renameSync(temp, this.stateFile);
    return returned;
  }

  /** Report state integrity without mutating anything. Used by the release check and on start. */
  integrity() {
    const report = {
      state_file: STATE_FILE,
      present: fs.existsSync(this.stateFile),
      readable: false,
      version: null,
      backup_present: fs.existsSync(this.backupFile),
      record_counts: null
    };
    try {
      const state = this.state();
      report.readable = true;
      report.version = state.version;
      report.record_counts = Object.fromEntries(
        Object.entries(state).filter(([, value]) => Array.isArray(value)).map(([key, value]) => [key, value.length])
      );
    } catch (err) {
      report.error = err.message;
    }
    return report;
  }

  /** Blobs are keyed by an opaque internal id the caller generated — never by a consumer file name. */
  blobPath(fileId) {
    if (typeof fileId !== 'string' || !/^[a-f0-9]{32}$/.test(fileId)) throw new Error('INVALID_INTERNAL_FILE_ID');
    return path.join(this.blobDir, `${fileId}.bin`);
  }

  putBlob(fileId, bytes) {
    const file = this.blobPath(fileId);
    /* Written under a temporary name and renamed, so a crash cannot leave a half blob that looks complete. */
    const temp = `${file}.part`;
    fs.writeFileSync(temp, bytes, { mode: 0o600 });
    fs.renameSync(temp, file);
    return file;
  }

  readBlob(fileId) {
    return fs.readFileSync(this.blobPath(fileId));
  }

  blobExists(fileId) {
    try {
      return fs.statSync(this.blobPath(fileId)).isFile();
    } catch {
      return false;
    }
  }

  deleteBlob(fileId) {
    try {
      fs.unlinkSync(this.blobPath(fileId));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Every blob on disk, with its age and whether it is a PARTIAL.
   *
   * `putBlob` writes under `<file>.part` and renames it, so a process that dies between the two leaves a
   * `.part` file that no row will ever reference and that is never a valid report. Both kinds are reported, so
   * the retention sweep can clear them: a `.part` older than the grace period is garbage, while a referenced
   * blob is never touched however old it is.
   */
  listBlobs() {
    const entries = fs.existsSync(this.blobDir) ? fs.readdirSync(this.blobDir) : [];
    const blobs = [];
    for (const name of entries) {
      const match = /^([a-f0-9]{32})\.bin(\.part)?$/.exec(name);
      if (!match) continue;
      try {
        const stat = fs.statSync(path.join(this.blobDir, name));
        blobs.push({ file_id: match[1], name, partial: Boolean(match[2]), bytes: stat.size, modified_ms: stat.mtimeMs });
      } catch {
        /* A blob that vanished mid-listing is simply not listed. */
      }
    }
    return blobs;
  }

  /** Remove one stored file by its name, used only for partials the sweep has decided are garbage. */
  deleteBlobFile(name) {
    if (!/^[a-f0-9]{32}\.bin(\.part)?$/.test(String(name))) throw new Error('INVALID_BLOB_FILE_NAME');
    try {
      fs.unlinkSync(path.join(this.blobDir, String(name)));
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = {
  PrivateStore,
  EMPTY_STATE,
  STATE_VERSION,
  STATE_FILE,
  BACKUP_FILE,
  LOCK_FILE,
  REPOSITORY_ROOT,
  assertOutsideRepository,
  isProcessAlive,
  normalizeState,
  defaultDataDir
};
