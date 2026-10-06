'use strict';
/**
 * server.cjs — start the local consumer-journey service.
 *
 *   node accelerated-launch/service/server.cjs
 *
 * OWNER-ALL82-001 / B2. This is the local development service the plan permits. It binds loopback only, it
 * serves one private UI tree, and it makes no outbound request of any kind: no bureau contact, no mailing, no
 * payment provider, no model provider, no telemetry.
 */

const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { createService } = require('./app.cjs');
const { PrivateStore, defaultDataDir } = require('./private-store.cjs');
const { readSupportQualification } = require('./coverage-matrix.cjs');

const HOST = process.env.CRP_LOCAL_SERVICE_HOST || '127.0.0.1';
const PORT = Number(process.env.CRP_LOCAL_SERVICE_PORT || 8787);

let service;
let recovery;
try {
  service = createService({ dataDir: process.env.CRP_LOCAL_SERVICE_DATA });
  /* B4: reconcile BEFORE serving anyone. A state file that cannot be read stops the service rather than
     quietly presenting an empty one. */
  recovery = service.startup();
} catch (err) {
  process.stderr.write([
    'The service refused to start.',
    String(err && err.message ? err.message : err),
    err && /PRIVATE_STORE_ALREADY_HAS_A_WRITER/.test(err.message)
      ? 'Stop the other process using this data directory, or set CRP_LOCAL_SERVICE_DATA to a directory of its own.'
      : 'Repair or restore the private state file, or point CRP_LOCAL_SERVICE_DATA at a directory of its own.',
    ''
  ].join('\n'));
  process.exit(1);
}

const server = http.createServer((req, res) => {
  service.handle(req, res).catch(() => {
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Nothing was sent anywhere.', detail: null } }));
    }
  });
});

server.listen(PORT, HOST, () => {
  const dataDir = service.store.dataDir;
  /* A data directory inside the operating system's temporary area is a warning, not a refusal: it is the right
     place for a test run and the wrong place for a consumer's only copy of a report. */
  const tempDir = path.resolve(os.tmpdir());
  const inTemp = dataDir === tempDir || dataDir.startsWith(tempDir + path.sep);
  process.stdout.write([
    `CRP local consumer-journey service listening on http://${HOST}:${PORT}/`,
    `Private data directory: ${dataDir} (verified outside the repository)`,
    inTemp
      ? '⚠ WARNING: that directory is inside the operating system temp area, which the system may clean. Set ' +
        'CRP_LOCAL_SERVICE_DATA to a durable path before serving a real consumer.'
      : 'That directory is outside the operating system temp area.',
    `Start-up recovery: ${recovery.expired_sessions_removed} lapsed session(s) removed, ` +
      `${recovery.orphan_blobs_removed} unreferenced blob(s) cleared, state readable: ${recovery.state.readable}`,
    `Payment: ${recovery.payment.state} — ${recovery.payment.plain}`,
    '',
    readSupportQualification(),
    'The Experian United Kingdom presentation is evidenced from a 2007 example; present-day GB support is NOT established.',
    'Which checks can run depends on the region you select, and the wizard states that before you upload.',
    'The paid steps are refused until a purchase is recorded, and NO PAYMENT PROVIDER IS CONNECTED, so',
    'nothing can be purchased here. Demonstration mode is labelled and counts as nothing.',
    'No jurisdiction is advertised as launch ready. Press Ctrl+C to stop.',
    ''
  ].join('\n'));
  service.logger.log({ event: 'SERVICE_LISTENING', outcome: 'OK', http_status: 200 });
});

function shutdown() {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 2000).unref();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

module.exports = { server, service, PrivateStore, defaultDataDir, HOST, PORT };
