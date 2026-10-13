'use strict';
const { Worker } = require('node:worker_threads');
const path = require('node:path');
const { EventEmitter } = require('node:events');
const MAX_BODY = 20 * 1024 * 1024;
const MAX_RESPONSE = 64 * 1024 * 1024;
function refusal(res, code, status = 503) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Retry-After': '5' });
  res.end(JSON.stringify({ ok: false, error: { code, message: 'Please try again shortly.', detail: null } }));
}
class ProcessingDispatcher extends EventEmitter {
  constructor(options = {}) {
    super();
    this.limit = options.queueLimit ?? 8;
    this.timeout = options.timeoutMs ?? 180000;
    this.startupTimeout = options.startupTimeoutMs ?? 180000;
    this.workerFile = options.workerFile || path.join(__dirname, 'processing-worker.cjs');
    this.queue = []; this.active = null; this.admitted = 0; this.serial = 0; this.ready = false; this.closed = false;
    this.worker = new Worker(this.workerFile, { resourceLimits: { maxOldGenerationSizeMb: options.memoryMb ?? 4096 } });
    this.bootTimer = setTimeout(() => this.fail('PROCESSING_STARTUP_TIMEOUT'), this.startupTimeout);
    this.worker.on('message', message => {
      if (message.type === 'ready') { clearTimeout(this.bootTimer); this.ready = true; this.emit('ready', message); this.next(); return; }
      if (message.type !== 'response' || message.id !== this.active?.id) return this.fail('PROCESSING_PROTOCOL_ERROR');
      const job = this.active; clearTimeout(job.timer); this.active = null; this.admitted--;
      if (message.bytes?.length > MAX_RESPONSE) { refusal(job.res, 'PROCESSING_OUTPUT_LIMIT'); }
      else if (!job.res.destroyed) { job.res.writeHead(message.status, message.headers); job.res.end(Buffer.from(message.bytes)); }
      this.next();
    });
    this.worker.on('error', () => this.fail('PROCESSING_WORKER_FAILED'));
    this.worker.on('exit', code => { if (!this.closed) this.fail('PROCESSING_WORKER_EXIT'); });
  }
  fail(code) {
    if (this.closed) return;
    this.closed = true; this.ready = false; clearTimeout(this.bootTimer);
    for (const job of [this.active, ...this.queue].filter(Boolean)) { clearTimeout(job.timer); if (!job.res.destroyed) refusal(job.res, code); }
    this.queue = []; this.active = null; this.admitted = 0;
    this.worker.terminate(); this.emit('fatal', code);
    // The owning server exits; systemd restarts it. Do not start a second writer
    // while an old worker or its native subprocess may still be finishing.
  }
  handle(req, res) {
    if (!this.ready || this.closed) return refusal(res, 'PROCESSING_UNAVAILABLE');
    if (this.admitted >= this.limit) return refusal(res, 'PROCESSING_BUSY');
    this.admitted++;
    let bytes = 0, finished = false; const chunks = [];
    const bodyTimer = setTimeout(() => { if (!finished) { finished = true; this.admitted--; refusal(res, 'BODY_TIMEOUT', 408); req.destroy(); } }, 30000);
    const cancel = () => { if (!finished) { finished = true; clearTimeout(bodyTimer); this.admitted--; } };
    req.on('aborted', cancel); req.on('error', cancel);
    req.on('data', chunk => {
      if (finished) return;
      bytes += chunk.length;
      if (bytes > MAX_BODY) { finished = true; clearTimeout(bodyTimer); this.admitted--; refusal(res, 'FILE_TOO_LARGE', 413); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (finished) return; finished = true; clearTimeout(bodyTimer);
      this.queue.push({ id: ++this.serial, res, enqueued: Date.now(), request: { url: req.url, method: req.method, headers: req.headers, remoteAddress: req.socket?.remoteAddress, body: Buffer.concat(chunks) } });
      this.next();
    });
  }
  next() {
    if (!this.ready || this.closed || this.active) return;
    while (this.queue.length) {
      const job = this.queue.shift();
      if (job.res.destroyed || Date.now() - job.enqueued > this.timeout) { this.admitted--; if (!job.res.destroyed) refusal(job.res, 'PROCESSING_QUEUE_TIMEOUT'); continue; }
      this.active = job;
      job.timer = setTimeout(() => this.fail('PROCESSING_TIMEOUT'), this.timeout);
      this.worker.postMessage({ id: job.id, request: job.request }); return;
    }
  }
  async close() { this.closed = true; this.ready = false; clearTimeout(this.bootTimer); clearTimeout(this.active?.timer); await this.worker.terminate(); }
}
module.exports = { ProcessingDispatcher, refusal, MAX_BODY };
