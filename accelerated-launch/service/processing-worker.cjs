'use strict';
// One worker owns the private store. HTTP never opens a second writer.
const { parentPort } = require('node:worker_threads');
const { EventEmitter } = require('node:events');
const { createService } = require('./app.cjs');
const service = createService({ dataDir: process.env.CRP_LOCAL_SERVICE_DATA });
const recovery = service.startup();
parentPort.postMessage({ type: 'ready', recovery, dataDir: service.store.dataDir });
parentPort.on('message', async ({ id, request }) => {
  const req = new EventEmitter();
  Object.assign(req, request, { socket: { remoteAddress: request.remoteAddress }, destroy() {} });
  let status = 200, headers = {}, finished = false;
  const res = {
    headersSent: false,
    writeHead(code, values) { status = code; headers = values; this.headersSent = true; },
    end(bytes) { if (finished) return; finished = true; parentPort.postMessage({ type: 'response', id, status, headers, bytes: Buffer.from(bytes || '') }); }
  };
  const handling = service.handle(req, res);
  // handle() installs body listeners synchronously before its first await.
  if (request.body?.length) req.emit('data', Buffer.from(request.body));
  req.emit('end');
  try { await handling; }
  catch { if (!finished) res.writeHead(500, { 'Content-Type': 'application/json' }), res.end('{"ok":false,"error":{"code":"INTERNAL_ERROR"}}'); }
});
