'use strict';
// The HTTP process serves public assets and liveness; one bounded worker owns
// authentication, report reading, packets and the sole private-store writer.
const http = require('node:http');
const { staticResponse, SECURITY_HEADERS } = require('./app.cjs');
const { ProcessingDispatcher, refusal } = require('./processing-dispatcher.cjs');
const HOST = process.env.CRP_LOCAL_SERVICE_HOST || '127.0.0.1';
const PORT = Number(process.env.CRP_LOCAL_SERVICE_PORT || 8787);
const dispatcher = new ProcessingDispatcher();
const requestPolicy=require('./request-policy.cjs').policy();
let recovery;
const identity = () => ({ ok: dispatcher.ready && !dispatcher.closed, build_id: process.env.CRP_BUILD_ID || 'local-development', deployment: process.env.CRP_DEPLOYMENT_ENV || 'local', billing_mode: recovery?.payment?.key_mode || null, launch_ready: false });
const server = http.createServer((req, res) => {
  let pathname;
  try { pathname = new URL(req.url, 'http://localhost').pathname; } catch { return refusal(res, 'INVALID_REQUEST', 400); }
  try{requestPolicy(req);}catch(error){return refusal(res,error.code,error.status || 400);}
  if ((req.method === 'GET' || req.method === 'HEAD') && pathname === '/api/health') {
    res.writeHead(identity().ok ? 200 : 503, { ...SECURITY_HEADERS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    return res.end(req.method === 'HEAD' ? '' : JSON.stringify(identity()));
  }
  if((req.method==='GET'||req.method==='HEAD') && pathname==='/api/ready') {
    const ready=identity().ok && dispatcher.storage?.readable===true && dispatcher.storage?.writable===true && Date.now()-dispatcher.storageCheckedAt<60000 && dispatcher.admitted<dispatcher.limit;
    res.writeHead(ready?200:503,{...SECURITY_HEADERS,'Content-Type':'application/json','Cache-Control':'no-store'});
    return res.end(req.method==='HEAD'?'':JSON.stringify({...identity(),ok:ready,storage_ready:ready,storage_recovered:dispatcher.storage?.recovered===true}));
  }
  if ((req.method === 'GET' || req.method === 'HEAD') && !pathname.startsWith('/api/')) {
    const asset = staticResponse(req, pathname);
    if (!asset) return refusal(res, 'NOT_FOUND', 404);
    res.writeHead(asset.status, { ...SECURITY_HEADERS, 'Content-Type': asset.content_type, 'Cache-Control': 'no-store' });
    return res.end(req.method === 'HEAD' ? '' : asset.text);
  }
  dispatcher.handle(req, res);
});
server.requestTimeout = 30000;
server.headersTimeout = 10000;
server.maxConnections = 128;
dispatcher.on('ready', message => {
  recovery = message.recovery;
  server.listen(PORT, HOST, () => {
    process.stdout.write(`CRP consumer-journey service listening on http://${HOST}:${server.address().port}/\n`);
    process.stdout.write(`Processing: one store writer, bounded queue; payment: ${recovery.payment.state}\n`);
  });
});
dispatcher.on('fatal', code => {
  // Code only: never write private request, credentials, state or worker error text.
  process.stderr.write(code + '\n');
  server.close(); dispatcher.worker.terminate().finally(() => process.exit(1));
});
async function shutdown() {
  server.close();
  // Finish an active operation before normal shutdown, bounded by systemd's stop
  // deadline. This avoids interrupting a provider call or committed store write.
  const deadline = Date.now() + 180000;
  while (dispatcher.active && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 100));
  await dispatcher.close(); process.exit(0);
}
process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
module.exports = { server, dispatcher, HOST, PORT };
