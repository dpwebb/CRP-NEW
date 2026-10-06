'use strict';
const uploads = require('../../uploads.cjs');
const { STATUS_BY_CODE, MESSAGE_BY_CODE } = require('../../errors.cjs');
async function run(t, check) {
  check.equal(uploads.MAX_FILE_BYTES, 10 * 1024 * 1024, 'the current upload limit is 10 MB');
  check.ok(uploads.SUPPORTED_MIME_PREFIXES.includes('application/pdf'), 'PDF is accepted');
  check.ok(uploads.SUPPORTED_EXTENSIONS.includes('.pdf'), 'the PDF extension is accepted');
  const meta = n => uploads.validateUploadMeta({ declaredBytes: n, mimeType: 'application/pdf', originalFilename: 'a.pdf' });
  check.equal(meta(0).ok, false, 'empty uploads are refused');
  check.equal(meta(0).code, 'EMPTY_FILE', 'empty upload refusal is typed');
  check.equal(meta(uploads.MAX_FILE_BYTES + 1).ok, false, 'one byte above the limit is refused');
  check.equal(meta(uploads.MAX_FILE_BYTES + 1).code, 'FILE_TOO_LARGE', 'over-limit refusal is typed');
  check.equal(meta(uploads.MAX_FILE_BYTES).ok, true, 'the exact limit is accepted');
  check.ok(MESSAGE_BY_CODE.EMPTY_FILE.length > 0, 'empty-file consumer wording exists');
  check.equal(STATUS_BY_CODE.NOT_FOUND, 404, 'unknown resources use 404');
  check.equal(STATUS_BY_CODE.NOT_AUTHORIZED, 403, 'other-account resources use 403');
  return { lane: 'CURRENT_PRODUCT', historical_parity: 'separate historical-legacy-source section' };
}
module.exports = { run, id: 'h-legacy-parity', title: 'Current upload and ownership contracts (historical parity separate)' };
