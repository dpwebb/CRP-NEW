'use strict';
const { Worker } = require('node:worker_threads');
const path = require('node:path');
const { EventEmitter } = require('node:events');
const { createMetrics } = require('./processing-metrics.cjs');
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
    // One response budget includes receiving, waiting and executing. Leave a
    // margin below the existing 180-second proxy deadline.
    this.timeout = options.timeoutMs ?? 150000;
    this.startupTimeout = options.startupTimeoutMs ?? 180000;
    this.workerFile = options.workerFile || path.join(__dirname, 'processing-worker.cjs');
    this.queue = []; this.active = null; this.admitted = 0; this.serial = 0; this.ready = false; this.closed = false;
    this.metrics = options.metrics || createMetrics(options.metricsOptions);
    this.worker = new Worker(this.workerFile, { resourceLimits: { maxOldGenerationSizeMb: options.memoryMb ?? 4096 } });
    this.bootTimer = setTimeout(() => this.fail('PROCESSING_STARTUP_TIMEOUT'), this.startupTimeout);
    this.worker.on('message', message => {
      if(message.type==='readiness'){this.storage=message.proof;this.storageCheckedAt=message.checkedAt;return;}
      if (message.type === 'ready') { clearTimeout(this.bootTimer); this.ready = true; this.emit('ready', message); this.next(); return; }
      if (message.type !== 'response' || message.id !== this.active?.id) return this.fail('PROCESSING_PROTOCOL_ERROR');
      const job = this.active; clearTimeout(job.timer); clearTimeout(job.queueTimer); this.active = null; this.admitted--;
      const respondedAt = Date.now();
      const status = message.bytes?.length > MAX_RESPONSE ? 503 : message.status;
      this.observe(job.req, job.startedAt, status, job.dispatchedAt - job.receivedAt, respondedAt - job.dispatchedAt, respondedAt);
      if (message.bytes?.length > MAX_RESPONSE) { refusal(job.res, 'PROCESSING_OUTPUT_LIMIT'); }
      else if (!job.res.destroyed) { job.res.writeHead(message.status, message.headers); job.res.end(Buffer.from(message.bytes)); }
      this.next();
    });
    this.worker.on('error', () => this.fail('PROCESSING_WORKER_FAILED'));
    this.worker.on('exit', code => { if (!this.closed) this.fail('PROCESSING_WORKER_EXIT'); });
  }
  get queueDepth() { return this.queue.length; }
  observe(req, startedAt, status, queueMs = 0, runMs = 0, observedAt = Date.now()) {
    try {
      this.metrics.record({ method: req?.method, url: req?.url, status, queueMs, runMs, totalMs: observedAt - startedAt });
    } catch {
      // Timing must never change the response.
    }
  }
  fail(code) {
    if (this.closed) return;
    this.closed = true; this.ready = false; clearTimeout(this.bootTimer);
    for (const job of [this.active, ...this.queue].filter(Boolean)) { clearTimeout(job.timer); clearTimeout(job.queueTimer); this.observe(job.req, job.startedAt, 503); if (!job.res.destroyed) refusal(job.res, code); }
    this.queue = []; this.active = null; this.admitted = 0;
    this.worker.terminate(); this.emit('fatal', code);
    // The owning server exits; systemd restarts it. Do not start a second writer
    // while an old worker or its native subprocess may still be finishing.
  }
  handle(req, res) {
    const received = Date.now();
    if (!this.ready || this.closed) { this.observe(req, received, 503); return refusal(res, 'PROCESSING_UNAVAILABLE'); }
    if (this.admitted >= this.limit) { this.observe(req, received, 503); return refusal(res, 'PROCESSING_BUSY'); }
    this.admitted++;
    let bytes = 0, finished = false; const chunks = [];
    const bodyTimer = setTimeout(() => { if (!finished) { finished = true; this.admitted--; this.observe(req, received, 408); refusal(res, 'BODY_TIMEOUT', 408); req.destroy(); } }, 30000);
    const cancel = () => { if (!finished) { finished = true; clearTimeout(bodyTimer); this.admitted--; } };
    req.on('aborted', cancel); req.on('error', cancel);
    req.on('data', chunk => {
      if (finished) return;
      bytes += chunk.length;
      if (bytes > MAX_BODY) { finished = true; clearTimeout(bodyTimer); this.admitted--; this.observe(req, received, 413); refusal(res, 'FILE_TOO_LARGE', 413); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (finished) return; finished = true; clearTimeout(bodyTimer);
      const job = { id: ++this.serial, req, startedAt: received, receivedAt: Date.now(), res, deadline: received + this.timeout, request: { url: req.url, method: req.method, headers: req.headers, remoteAddress: req.socket?.remoteAddress, body: Buffer.concat(chunks) } };
      job.queueTimer = setTimeout(() => {
        const index = this.queue.indexOf(job);
        if (index < 0) return;
        this.queue.splice(index, 1); this.admitted--; this.observe(req, received, 503);
        if (!res.destroyed) refusal(res, 'PROCESSING_QUEUE_TIMEOUT');
      }, Math.max(1, job.deadline - Date.now()));
      this.queue.push(job);
      this.next();
    });
  }
  next() {
    if (!this.ready || this.closed || this.active) return;
    while (this.queue.length) {
      const job = this.queue.shift();
      clearTimeout(job.queueTimer);
      if (job.res.destroyed || Date.now() >= job.deadline) { this.admitted--; this.observe(job.req, job.startedAt, 503); if (!job.res.destroyed) refusal(job.res, 'PROCESSING_QUEUE_TIMEOUT'); continue; }
      this.active = job;
      job.dispatchedAt = Date.now();
      job.timer = setTimeout(() => this.fail('PROCESSING_TIMEOUT'), Math.max(1, job.deadline - Date.now()));
      this.worker.postMessage({ id: job.id, request: job.request }); return;
    }
  }
  async close() { this.closed = true; this.ready = false; clearTimeout(this.bootTimer); clearTimeout(this.active?.timer); for(const job of this.queue)clearTimeout(job.queueTimer); await this.worker.terminate(); }
}
module.exports = { ProcessingDispatcher, refusal, MAX_BODY };
