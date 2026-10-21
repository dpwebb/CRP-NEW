import { createHash, createHmac, randomBytes } from "node:crypto";
import {
  openSync,
  readFileSync,
  writeFileSync,
  existsSync,
  lstatSync,
  fsyncSync,
  writeSync,
  closeSync,
  mkdirSync,
  unlinkSync,
  realpathSync,
} from "node:fs";
import { resolve, join } from "node:path";
export const digest = (x) => createHash("sha256").update(x).digest("hex");
export class Journal {
  constructor(directory) {
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    if (lstatSync(directory).isSymbolicLink()) throw Error("AUDIT_SYMLINK");
    this.directory = realpathSync(directory);
    this.lock = join(this.directory, "process.lock");
    this.lockFd = openSync(this.lock, "wx", 0o600);
    writeSync(this.lockFd, String(process.pid));
    this.file = join(this.directory, "audit.jsonl");
    this.keyfile = join(this.directory, "integrity.key");
    this.intents = new Map();
    this.events = [];
    this.tail = "0".repeat(64);
    try {
      for (const f of [this.file, this.keyfile])
        if (
          existsSync(f) &&
          (!lstatSync(f).isFile() || lstatSync(f).isSymbolicLink())
        )
          throw Error("AUDIT_ORDINARY_FILE_REQUIRED");
      if (!existsSync(this.keyfile)) {
        if (existsSync(this.file)) throw Error("AUDIT_KEY_MISSING");
        writeFileSync(this.keyfile, randomBytes(32), {
          flag: "wx",
          mode: 0o600,
        });
      }
      this.key = readFileSync(this.keyfile);
      if (this.key.length !== 32) throw Error("AUDIT_KEY_INVALID");
      if (existsSync(this.file)) {
        const text = readFileSync(this.file, "utf8");
        if (text && !text.endsWith("\n")) throw Error("AUDIT_TRUNCATED");
        for (const line of text.split("\n").filter(Boolean)) {
          const row = JSON.parse(line),
            { mac, ...value } = row;
          if (
            value.previous !== this.tail ||
            mac !== this.sign(value) ||
            value.sequence !== this.events.length + 1
          )
            throw Error("AUDIT_INTEGRITY_FAILED");
          this.events.push(row);
          this.tail = mac;
          if (row.event === "ACTION_INTENT") this.intents.set(row.key, row);
        }
      }
      this.fd = openSync(this.file, "a", 0o600);
    } catch (e) {
      this.close();
      throw e;
    }
  }
  sign(value) {
    return createHmac("sha256", this.key)
      .update(JSON.stringify(value))
      .digest("hex");
  }
  append(event, details = {}) {
    const value = {
      sequence: this.events.length + 1,
      at: new Date().toISOString(),
      event,
      ...details,
      previous: this.tail,
    };
    const row = { ...value, mac: this.sign(value) };
    writeSync(this.fd, JSON.stringify(row) + "\n");
    fsyncSync(this.fd);
    this.events.push(row);
    this.tail = row.mac;
    if (event === "ACTION_INTENT") this.intents.set(details.key, row);
    return row;
  }
  reserve(key, details) {
    const old = this.intents.get(key);
    if (old) {
      if (
        old.subject !== details.subject ||
        old.requestHash !== details.requestHash
      )
        throw Object.assign(Error("IDEMPOTENCY_CONFLICT"), { status: 409 });
      return false;
    }
    for (const prior of this.intents.values())
      if (
        prior.subject === details.subject &&
        prior.requestHash === details.requestHash
      ) {
        const outcome = this.events
          .filter((e) => e.key === prior.key && e.event !== "ACTION_INTENT")
          .at(-1);
        if (!outcome || outcome.outcome === "UNKNOWN")
          throw Object.assign(Error("PREVIOUS_OUTCOME_UNRESOLVED"), {
            status: 409,
          });
      }
    this.append("ACTION_INTENT", { key, ...details });
    return true;
  }
  close() {
    if (this.fd !== undefined) {
      closeSync(this.fd);
      this.fd = undefined;
    }
    if (this.lockFd !== undefined) {
      closeSync(this.lockFd);
      this.lockFd = undefined;
      unlinkSync(this.lock);
    }
  }
}
