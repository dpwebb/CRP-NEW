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
function freeze(value) {
  if(value && typeof value==='object' && !Object.isFrozen(value)) { for(const child of Object.values(value))freeze(child);Object.freeze(value); }
  return value;
}
function stamp(file) {const s=fs.statSync(file,{bigint:true});return [s.ino,s.size,s.mtimeNs,s.ctimeNs].join(':');}
function syncDirectory(dir) {
  // Windows does not expose a directory fsync through Node. File data is still
  // flushed there; POSIX also flushes the renamed directory entry.
  if(process.platform==='win32')return;
  const fd=fs.openSync(dir,'r');try{fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
}
function durableWrite(file,bytes) {
  const temp=file+'.tmp',fd=fs.openSync(temp,'w',0o600);
  try{fs.writeFileSync(fd,bytes);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
  fs.renameSync(temp,file);syncDirectory(path.dirname(file));
}

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
  purchased_downloads: [],
  referral_snapshots: []
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

/** An existing state file must prove its shape; only an absent, new store may be empty by default. */
function parsePersistedState(bytes) {
  const parsed=JSON.parse(bytes);
  if(parsed && Number.isInteger(parsed.version) && parsed.version>STATE_VERSION) {
    const error=new Error('PRIVATE_STORE_SCHEMA_UNSUPPORTED');error.unsupportedVersion=true;throw error;
  }
  if(!parsed || typeof parsed!=='object' || Array.isArray(parsed) || !Array.isArray(parsed.accounts)
    || (parsed.version!==undefined && (!Number.isInteger(parsed.version) || parsed.version<1)))throw Error('PRIVATE_STORE_STATE_SHAPE_INVALID');
  const version=parsed.version || 1;
  for(const key of Object.keys(EMPTY_STATE).filter(key=>key!=='version')) {
    if(parsed[key]!==undefined && (!Array.isArray(parsed[key]) || parsed[key].some(row=>!row || typeof row!=='object' || Array.isArray(row))))throw Error('PRIVATE_STORE_STATE_SHAPE_INVALID');
  }
  if(version===STATE_VERSION && ['sessions','cases','files','results'].some(key=>!Array.isArray(parsed[key])))throw Error('PRIVATE_STORE_STATE_SHAPE_INVALID');
  return normalizeState(parsed);
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
    this.initializedFile = path.join(this.dataDir, '.state-initialized');
    this.lockFile = path.join(this.dataDir, LOCK_FILE);
    this.blobDir = path.join(this.dataDir, BLOB_DIR);
    this.recoveredFromBackup = false;
    this.cache=null; this.cacheStamp=null;
    fs.mkdirSync(this.dataDir, { recursive: true, mode: 0o700 });
    fs.mkdirSync(this.blobDir, { recursive: true, mode: 0o700 });
    try {
      fs.chmodSync(this.dataDir, 0o700);
      fs.chmodSync(this.blobDir, 0o700);
    } catch {
      /* Windows does not implement POSIX modes; the ACLs it does have are not changed here. */
    }
    if (opts.allowMultiWriter !== true) this.claimWriterLock();
    if (opts.allowMultiWriter !== true && (fs.existsSync(this.stateFile) || fs.existsSync(this.backupFile)) && !fs.existsSync(this.initializedFile)) durableWrite(this.initializedFile, 'CRP_PRIVATE_STORE_INITIALIZED\n');
  }

  /**
   * ONE WRITER PER STATE FILE. The whole-state read-modify-write below is atomic only inside one process, so a
   * second writer would silently clobber the first. A stale lock (a writer that died) is taken over rather than
   * left to brick the service; a live one is refused with an exact message.
   */
  claimWriterLock() {
    const {identity}=require('./process-identity.cjs');
    const ownIdentity=identity(process.pid);
    const replacement=JSON.stringify({pid:process.pid,process_identity:ownIdentity,started_at:new Date().toISOString()});
    const write=()=>fs.writeFileSync(this.lockFile,replacement,{encoding:'utf8',mode:0o600,flag:'wx'});
    try {write();return;}catch(error){if(error.code!=='EEXIST')throw error;}
    // Serialize stale-lock reclamation; a simultaneous starter must retry rather
    // than unlink a replacement lock that it did not inspect.
    const reclaim=this.lockFile+'.reclaim';let guard;
    try {guard=fs.openSync(reclaim,'wx',0o600);}catch{throw Error('PRIVATE_STORE_LOCK_RECLAMATION_BUSY');}
    try {
    if (fs.existsSync(this.lockFile)) {
      let held = null;
      try {
        held = JSON.parse(fs.readFileSync(this.lockFile, 'utf8'));
      } catch {
        held = null;
      }
      const pid=Number(held?.pid),live=held&&isProcessAlive(pid);
      const actual=live&&pid!==process.pid?identity(pid):ownIdentity;
      // Legacy/unknown identities stay fail-closed while their PID is live.
      const alive = live && pid!==process.pid && (!held.process_identity || !actual || held.process_identity===actual);
      if (alive) {
        throw new Error(
          `PRIVATE_STORE_ALREADY_HAS_A_WRITER: pid ${held.pid} holds ${this.lockFile}. ` +
          'Two processes must not share one private data directory; stop the other one or point this one at its own directory.'
        );
      }
      fs.unlinkSync(this.lockFile);
    }
    write();
    }finally{fs.closeSync(guard);fs.unlinkSync(reclaim);}
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
    if (!fs.existsSync(this.stateFile) && !this.cache && !fs.existsSync(this.backupFile) && !fs.existsSync(this.initializedFile) && fs.readdirSync(this.blobDir).length===0) return freeze(normalizeState(null));
    try {
      const current=stamp(this.stateFile);
      if(this.cache && current===this.cacheStamp)return this.cache;
      this.cache=freeze(parsePersistedState(fs.readFileSync(this.stateFile, 'utf8')));
      this.cacheStamp=current;
      return this.cache;
    } catch (primaryError) {
      if (!primaryError.unsupportedVersion && fs.existsSync(this.backupFile)) {
        try {
          const recovered = parsePersistedState(fs.readFileSync(this.backupFile, 'utf8'));
          durableWrite(this.stateFile,fs.readFileSync(this.backupFile));
          this.recoveredFromBackup = true;
          this.cache=freeze(recovered);this.cacheStamp=stamp(this.stateFile);return this.cache;
        } catch {
          /* Fall through to the typed refusal below. */
        }
      }
      const error = new Error('PRIVATE_STORE_STATE_UNREADABLE');
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
    const next = structuredClone(this.state());
    const returned = mutator(next);
    // Persist identical values without display indentation: report-rich stores
    // otherwise allocate and flush hundreds of MB of whitespace per transaction.
    const serialized = JSON.stringify(next);
    if (fs.existsSync(this.stateFile)) {
      const backupTemp=this.backupFile+'.tmp';
      fs.copyFileSync(this.stateFile,backupTemp);
      const fd=fs.openSync(backupTemp,'r+');try{fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
      fs.renameSync(backupTemp,this.backupFile);syncDirectory(this.dataDir);
    }
    if (!fs.existsSync(this.initializedFile)) durableWrite(this.initializedFile, 'CRP_PRIVATE_STORE_INITIALIZED\n');
    durableWrite(this.stateFile,serialized);
    this.cache=freeze(next);this.cacheStamp=stamp(this.stateFile);
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
  readiness() {
    let probe,fd;
    try {
      this.state();
      probe=path.join(this.dataDir,'.readiness-'+require('node:crypto').randomUUID()+'.tmp');
      fd=fs.openSync(probe,'wx',0o600);fs.writeFileSync(fd,'CRP_STORAGE_PROBE');fs.fsyncSync(fd);fs.closeSync(fd);fd=undefined;
      fs.unlinkSync(probe);probe=undefined;syncDirectory(this.dataDir);
      return {readable:true,writable:true,recovered:this.recoveredFromBackup};
    } catch {return {readable:false,writable:false,recovered:this.recoveredFromBackup};}
    finally {if(fd!==undefined)fs.closeSync(fd);if(probe)try{fs.unlinkSync(probe);}catch{}}
  }

  /** Blobs are keyed by an opaque internal id the caller generated — never by a consumer file name. */
  blobPath(fileId) {
    if (typeof fileId !== 'string' || !/^[a-f0-9]{32}$/.test(fileId)) throw new Error('INVALID_INTERNAL_FILE_ID');
    return path.join(this.blobDir, `${fileId}.bin`);
  }

  putBlob(fileId, bytes) {
    const file = this.blobPath(fileId);
    /* Written under a temporary name and renamed, so a crash cannot leave a half blob that looks complete. */
    const temp = `${file}.part`,fd=fs.openSync(temp,'w',0o600);
    try{fs.writeFileSync(fd,bytes);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
    fs.renameSync(temp,file);syncDirectory(this.blobDir);
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
  defaultDataDir,
  durableWrite
};
