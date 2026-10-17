'use strict';
// Public presentation only: never use this for account/API or consumer output.
const { gzipSync } = require('node:zlib');
function representation(body, contentType, acceptEncoding) {
  const payload = Buffer.isBuffer(body) ? body : Buffer.from(body, 'utf8');
  const headers = { 'Content-Length': payload.length };
  if (!/^(?:text\/|application\/xml|image\/svg\+xml)/i.test(contentType)) return { payload, headers };
  headers.Vary = 'Accept-Encoding';
  const accepted = String(acceptEncoding || '').toLowerCase().split(',').map(part => {
    const [name, ...parameters] = part.trim().split(';');
    const quality = parameters.find(value => value.trim().startsWith('q='));
    return { name, q: quality === undefined ? 1 : Number(quality.trim().slice(2)) };
  });
  const explicit = accepted.find(row => row.name === 'gzip');
  const quality = explicit || accepted.find(row => row.name === '*');
  if (payload.length < 1024 || !quality || !Number.isFinite(quality.q) || quality.q <= 0 || quality.q > 1) return { payload, headers };
  const zipped = gzipSync(payload);
  if (zipped.length >= payload.length) return { payload, headers };
  return { payload: zipped, headers: { ...headers, 'Content-Length': zipped.length, 'Content-Encoding': 'gzip' } };
}
module.exports = { representation };
