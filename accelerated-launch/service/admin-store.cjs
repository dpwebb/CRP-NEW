'use strict';
// Separate operator metadata. Consumer state and report/PDF blobs never migrate here.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const {assertOutsideRepository, isProcessAlive, durableWrite} = require('./private-store.cjs');
const keys = new WeakMap(), caches = new WeakMap(), transactions = new WeakSet();
const COLLECTIONS = Object.freeze(['memberships', 'organizations', 'unlocks', 'grants', 'affiliate_records', 'fulfillment_queue', 'audit_events']);
const AUDIT_FIELDS = new Set(['org_id', 'account_id', 'case_id', 'admin_id', 'grant_id', 'job_id', 'packet_id', 'pdf_sha256', 'approved_version', 'status', 'reason', 'operation', 'permission', 'role', 'permissions']);
const empty = () => ({version: 1, bootstrapped_at: null, ...Object.fromEntries(COLLECTIONS.map(k => [k, []]))});
const clone = value => JSON.parse(JSON.stringify(value));
function freeze(value) {if (value && typeof value === 'object' && !Object.isFrozen(value)) {for (const child of Object.values(value)) freeze(child); Object.freeze(value);} return value;}
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function error(code = 'ADMIN_STATE_UNAVAILABLE') {const e = new Error(code); e.code = code; e.status = 503; return e;}
function stamp(file) {
  const s = fs.lstatSync(file, {bigint: true});
  if (!s.isFile() || s.isSymbolicLink()) throw error();
  return [s.dev, s.ino, s.size, s.mtimeNs, s.ctimeNs].join(':');
}
function syncDirectory(dir) {
  // Match private-store durability: Node does not expose directory fsync on Windows.
  // POSIX failures are never suppressed; acknowledged journal entries are directory-synced.
  if (process.platform === 'win32') return;
  const fd = fs.openSync(dir, 'r'); try {fs.fsyncSync(fd);} finally {fs.closeSync(fd);}
}
function atomicNew(file, bytes) {
  const temporary = file + '.pending-' + crypto.randomUUID(), fd = fs.openSync(temporary, 'wx', 0o600);
  try {fs.writeFileSync(fd, bytes); fs.fsyncSync(fd);} finally {fs.closeSync(fd);}
  try {fs.linkSync(temporary, file); syncDirectory(path.dirname(file));}
  finally {fs.unlinkSync(temporary); syncDirectory(path.dirname(file));}
}
function safeDirectory(dir) {
  if (fs.existsSync(dir) && (!fs.lstatSync(dir).isDirectory() || fs.lstatSync(dir).isSymbolicLink())) throw error();
  fs.mkdirSync(dir, {recursive: true, mode: 0o700});
  syncDirectory(path.dirname(dir));
}
class AdminStore {
  constructor(consumerDataDir, {consumerStore} = {}) {
    const parent = assertOutsideRepository(path.resolve(consumerDataDir));
    if (!fs.existsSync(parent) || !fs.lstatSync(parent).isDirectory() || fs.lstatSync(parent).isSymbolicLink()) throw error();
    assertOutsideRepository(fs.realpathSync(parent));
    this.dataDir = path.join(parent, 'admin'); this.consumerStore = consumerStore; this.closed = false;
    safeDirectory(this.dataDir); this.journalDir = path.join(this.dataDir, 'journal'); this.lockDir = path.join(this.dataDir, 'writers');
    safeDirectory(this.journalDir); safeDirectory(this.lockDir);
    this.metrics = {journal_reads: 0, journal_bytes: 0, cache_reads: 0};
    this.lockToken = crypto.randomUUID(); this.lockFile = path.join(this.lockDir, process.pid + '-' + this.lockToken + '.json');
    // Publish before examining contenders: simultaneous claimants cannot both win.
    atomicNew(this.lockFile, JSON.stringify({pid: process.pid, token: this.lockToken}));
    try {
      for (const name of fs.readdirSync(this.lockDir).filter(n => n.endsWith('.json') && path.join(this.lockDir, n) !== this.lockFile)) {
        let row; try {row = JSON.parse(fs.readFileSync(path.join(this.lockDir, name), 'utf8'));}
        catch (e) {if (e.code === 'ENOENT') continue; throw error();}
        if (!Number.isInteger(row.pid) || row.pid < 1 || typeof row.token !== 'string') throw error();
        if (isProcessAlive(row.pid)) throw error('ADMIN_STORE_ALREADY_HAS_WRITER');
      }
      this.keyFile = path.join(this.dataDir, '.integrity-key');
      if (!fs.existsSync(this.keyFile)) {
        if (fs.readdirSync(this.journalDir).some(n => n.endsWith('.json')) || fs.existsSync(path.join(this.dataDir, '.initialized'))) throw error();
        atomicNew(this.keyFile, crypto.randomBytes(32));
      }
      this.keyStamp = stamp(this.keyFile); const key = fs.readFileSync(this.keyFile);
      if (key.length !== 32) throw error(); keys.set(this, key);
      this.state();
    } catch (e) {this.close(); throw e;}
  }
  signature(value) {return crypto.createHmac('sha256', keys.get(this)).update(JSON.stringify(value)).digest('hex');}
  assertWriter() {
    if (this.closed || stamp(this.keyFile) !== this.keyStamp) throw error();
    stamp(this.lockFile); const row = JSON.parse(fs.readFileSync(this.lockFile, 'utf8'));
    if (row.pid !== process.pid || row.token !== this.lockToken) throw error();
    for (const dir of [this.dataDir, this.journalDir, this.lockDir]) if (fs.lstatSync(dir).isSymbolicLink()) throw error();
  }
  publishHead(sequence, journal_sha256) {
    const payload = {version: 1, sequence, journal_sha256};
    durableWrite(path.join(this.dataDir, '.head'), JSON.stringify({...payload, hmac: this.signature(payload)}) + '\n');
  }
  state() {
    try {
      this.assertWriter();
      const files = fs.readdirSync(this.journalDir).filter(n => n.endsWith('.json')).sort();
      for (let i = 0; i < files.length; i++) if (files[i] !== String(i + 1).padStart(9, '0') + '.json') throw error();
      const initialized = fs.existsSync(path.join(this.dataDir, '.initialized')), headFile = path.join(this.dataDir, '.head');
      let head = null;
      if (initialized) {
        stamp(headFile); head = JSON.parse(fs.readFileSync(headFile, 'utf8'));
        const payload = {version: head.version, sequence: head.sequence, journal_sha256: head.journal_sha256};
        if (head.version !== 1 || !Number.isInteger(head.sequence) || head.sequence < 1 || head.sequence > files.length || this.signature(payload) !== head.hmac) throw error();
      } else if (files.length || fs.existsSync(headFile)) throw error();
      const cached = caches.get(this);
      if (cached && (files.length < cached.sequence || (head?.sequence || 0) < cached.committed)) throw error();
      const stamps = files.map(name => stamp(path.join(this.journalDir, name)));
      if (cached) for (let i = 0; i < cached.sequence; i++) if (stamps[i] !== cached.stamps[i]) throw error();
      let next = cached ? cached.state : empty(), previous = cached ? cached.previous : null;
      const hashes = cached ? [...cached.hashes] : [];
      for (let i = cached?.sequence || 0; i < files.length; i++) {
        const bytes = fs.readFileSync(path.join(this.journalDir, files[i])); this.metrics.journal_reads++; this.metrics.journal_bytes += bytes.length;
        const r = JSON.parse(bytes), payload = {sequence: r.sequence, previous_sha256: r.previous_sha256, state: r.state};
        if (r.sequence !== i + 1 || r.previous_sha256 !== previous || this.signature(payload) !== r.hmac) throw error();
        this.validate(r.state, next); next = r.state; previous = sha(bytes); hashes.push(previous);
      }
      if (head && hashes[head.sequence - 1] !== head.journal_sha256) throw error();
      // A synced journal tail whose head publication was interrupted is retained,
      // never silently rolled back. Missing acknowledged tails fail closed above.
      if (head && head.sequence < files.length) this.publishHead(files.length, previous);
      this.sequence = files.length; this.previous = previous;
      caches.set(this, {sequence: files.length, committed: files.length, previous, hashes, stamps, state: freeze(next)});
      if (cached && cached.sequence === files.length) this.metrics.cache_reads++;
      return clone(next);
    } catch {throw error();}
  }
  validate(next, previous) {
    if (!next || next.version !== 1 || COLLECTIONS.some(k => !Array.isArray(next[k]) || next[k].some(r => !r || typeof r !== 'object' || Array.isArray(r)))) throw error();
    if (previous.bootstrapped_at && next.bootstrapped_at !== previous.bootstrapped_at) throw error('ADMIN_BOOTSTRAP_IMMUTABLE');
    const length = previous.audit_events.length;
    if (next.audit_events.length < length || JSON.stringify(next.audit_events.slice(0, length)) !== JSON.stringify(previous.audit_events)) throw error('ADMIN_AUDIT_IMMUTABLE');
    let last = previous.audit_events.at(-1)?.hmac || null;
    for (let i = length; i < next.audit_events.length; i++) {
      const {hmac, ...event} = next.audit_events[i];
      if (event.sequence !== i + 1 || event.previous_hmac !== last || this.signature(event) !== hmac) throw error('ADMIN_AUDIT_IMMUTABLE');
      last = hmac;
    }
  }
  update(mutator) {
    if (transactions.has(this)) throw error('ADMIN_TRANSACTION_REENTRANT');
    transactions.add(this);
    try {
    const before = this.state(), next = clone(before), result = mutator(next);
    if (result && typeof result.then === 'function') throw error('ADMIN_TRANSACTION_MUST_BE_SYNCHRONOUS');
    this.validate(next, before);
    const payload = {sequence: this.sequence + 1, previous_sha256: this.previous, state: next}, record = {...payload, hmac: this.signature(payload)};
    const bytes = JSON.stringify(record) + '\n', filename = String(payload.sequence).padStart(9, '0') + '.json';
    atomicNew(path.join(this.journalDir, filename), bytes);
    this.publishHead(payload.sequence, sha(bytes));
    if (!fs.existsSync(path.join(this.dataDir, '.initialized'))) durableWrite(path.join(this.dataDir, '.initialized'), 'CRP_ADMIN_STORE_INITIALIZED\n');
    const cached = caches.get(this);
    caches.set(this, {sequence: payload.sequence, committed: payload.sequence, previous: sha(bytes), hashes: [...cached.hashes, sha(bytes)], stamps: [...cached.stamps, stamp(path.join(this.journalDir, filename))], state: freeze(next)});
    this.sequence = payload.sequence; this.previous = sha(bytes);
    // This materialized cache is never used for permission or grant recovery.
    try {durableWrite(path.join(this.dataDir, 'state.json'), JSON.stringify(next) + '\n');}
    catch {this.materialization_pending = true;}
    return result === undefined ? undefined : clone(result);
    } finally {transactions.delete(this);}
  }
  appendAudit(state, actor, event, metadata = {}) {
    if (typeof event !== 'string' || !/^ADMIN_[A-Z0-9_]{1,70}$/.test(event)) throw error('ADMIN_AUDIT_EVENT_INVALID');
    const safe = {};
    for (const [key, value] of Object.entries(metadata || {})) {
      if (!AUDIT_FIELDS.has(key)) continue;
      if (key === 'permissions' && Array.isArray(value) && value.length <= 32 && value.every(p => typeof p === 'string' && /^[a-z]+\.[a-z]+$/.test(p))) safe[key] = [...value];
      else if (['string', 'number', 'boolean'].includes(typeof value)) safe[key] = typeof value === 'string' ? value.slice(0, 500) : value;
    }
    const row = {sequence: state.audit_events.length + 1, previous_hmac: state.audit_events.at(-1)?.hmac || null, at: new Date().toISOString(), event,
      actor_admin_id: typeof actor?.admin_id === 'string' ? actor.admin_id : null, actor_account_id: typeof actor?.account_id === 'string' ? actor.account_id : null, metadata: safe};
    state.audit_events.push({...row, hmac: this.signature(row)}); return state.audit_events.at(-1);
  }
  audit(actor, event, metadata) {return this.update(state => this.appendAudit(state, actor, event, metadata));}
  close() {
    if (this.closed) return; this.closed = true; keys.delete(this); caches.delete(this);
    if (this.lockFile && fs.existsSync(this.lockFile)) {
      const row = JSON.parse(fs.readFileSync(this.lockFile, 'utf8')); if (row.token !== this.lockToken) throw error();
      fs.unlinkSync(this.lockFile); syncDirectory(this.lockDir);
    }
  }
}
function openAdminStore({consumerStore, enabled = false}) {return enabled === true ? new AdminStore(consumerStore.dataDir, {consumerStore}) : null;}
module.exports = {AdminStore, openAdminStore, COLLECTIONS, AUDIT_FIELDS};
