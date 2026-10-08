'use strict';
// Official paper forms are shipped with their reviewed source URL and verified original bytes.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { ServiceError } = require('./errors.cjs');
const DIRECTORY = path.join(__dirname, 'bureau-forms');

function materialForms(country, bureau, purpose) {
  const catalog = JSON.parse(fs.readFileSync(path.join(DIRECTORY, 'catalog.json'), 'utf8').replace(/^\uFEFF/, ''));
  const effectivePurpose = purpose === 'NEW_ADDRESS' ? 'PERSONAL' : purpose;
  return catalog.forms.filter(form => form.country === country && form.bureau === bureau &&
    (form.purpose === 'ALL' || form.purpose === effectivePurpose)).map(form => {
      if (!/^[a-z0-9-]+\.pdf$/.test(form.filename)) throw new ServiceError('SERVICE_STATE_UNAVAILABLE');
      const bytes = fs.readFileSync(path.join(DIRECTORY, form.filename));
      const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
      if (sha256 !== form.sha256 || bytes.subarray(0, 5).toString('ascii') !== '%PDF-') throw new ServiceError('SERVICE_STATE_UNAVAILABLE');
      return { filename: form.filename, label: form.label, source_url: form.source_url, sha256, instructions: form.instructions };
    });
}

function bytesFor(form) {
  if (!form || !/^[a-z0-9-]+\.pdf$/.test(form.filename)) throw new ServiceError('SERVICE_STATE_UNAVAILABLE');
  const bytes = fs.readFileSync(path.join(DIRECTORY, form.filename));
  if (crypto.createHash('sha256').update(bytes).digest('hex') !== form.sha256) throw new ServiceError('SERVICE_STATE_UNAVAILABLE');
  return { ...form, bytes };
}

module.exports = { materialForms, bytesFor };
