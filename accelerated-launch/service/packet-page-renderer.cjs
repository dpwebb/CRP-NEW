'use strict';
// Render the version-bound complete PDF locally, through memory-only stdin/stdout.
// Authorization and source/version checks happen in the route before this cache is used.
const { spawn } = require('node:child_process');
const crypto = require('node:crypto');
const { ServiceError } = require('./errors.cjs');
const cache = new Map();
const pending = new Map();
const MAX_IMAGE_BYTES = 12 * 1024 * 1024, CACHE_BYTES = 24 * 1024 * 1024;
let cachedBytes = 0, active = 0;
function drop(key) { const row = cache.get(key); if (row) { clearTimeout(row.timer); cachedBytes -= row.bytes.length; row.bytes.fill(0); cache.delete(key); } }
async function renderPage(pdf, page) {
  if (!pdf || !Buffer.isBuffer(pdf.body) || pdf.body.length > 64 * 1024 * 1024 || !Number.isSafeInteger(page) || page < 1 || page > pdf.page_count) throw new ServiceError('INVALID_REQUEST');
  const key = crypto.createHash('sha256').update(pdf.body).digest('hex') + ':' + page;
  for (const [old, row] of cache) if (row.expires < Date.now()) drop(old);
  const hit = cache.get(key);
  if (hit) return Buffer.from(hit.bytes);
  if (pending.has(key)) return Buffer.from(await pending.get(key));
  // Keep expensive rendering bounded; the consumer loads pages serially.
  if (active >= 4) throw new ServiceError('SERVICE_STATE_UNAVAILABLE');
  active++;
  try {
    const rendering = new Promise((resolve, reject) => {
      const child = spawn('pdftoppm', ['-f', String(page), '-l', String(page), '-singlefile', '-scale-to', '1600', '-png', '-'], {
        windowsHide: true, env: { ...process.env, LC_ALL: 'C' }, stdio: ['pipe', 'pipe', 'pipe']
      });
      let chunks = [], length = 0, done = false;
      const finish = (error, value) => { if (done) return; done = true; clearTimeout(timer); chunks = []; error ? reject(error) : resolve(value); };
      const refuse = () => { child.kill(); finish(new ServiceError('SERVICE_STATE_UNAVAILABLE')); };
      const timer = setTimeout(refuse, 15000);
      child.on('error', refuse); child.stdin.on('error', refuse);
      child.stderr.on('data', () => {}); // Never emit private converter diagnostics.
      child.stdout.on('data', chunk => { length += chunk.length; if (length > MAX_IMAGE_BYTES) refuse(); else chunks.push(chunk); });
      child.on('close', code => {
        const value = Buffer.concat(chunks);
        if (code !== 0 || !value.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) finish(new ServiceError('SERVICE_STATE_UNAVAILABLE'));
        else finish(null, value);
      });
      child.stdin.end(pdf.body);
    });
    pending.set(key, rendering);
    const bytes = await rendering;
    if (cache.has(key)) drop(key);
    while (cache.size && (cache.size >= 24 || cachedBytes + bytes.length > CACHE_BYTES)) drop(cache.keys().next().value);
    const timer = setTimeout(() => drop(key), 60000); timer.unref();
    cache.set(key, { bytes, expires: Date.now() + 60000, timer }); cachedBytes += bytes.length;
    return Buffer.from(bytes);
  } finally { pending.delete(key); active--; }
}
module.exports = { renderPage };
