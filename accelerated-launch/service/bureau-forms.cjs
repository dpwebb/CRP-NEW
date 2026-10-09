'use strict';
// Official paper forms are shipped with their reviewed source URL and verified original bytes.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { ServiceError } = require('./errors.cjs');
const { MAPS, VERSION, province } = require('./bureau-form-mappings.cjs');
const DIRECTORY = path.join(__dirname, 'bureau-forms');
let renderVersion;
function mappingVersion(id) {
  if (!MAPS[id]) throw new ServiceError('SERVICE_STATE_UNAVAILABLE');
  if (!renderVersion) {
    const hash = crypto.createHash('sha256');
    for (const filename of ['bureau-form-mappings.cjs','bureau-form-worker.cjs','pdf-vendor/pdf-lib-1.17.1.min.js','pdf-vendor/fontkit-1.1.1.min.js','packet-fonts/NotoSans-Regular.ttf']) {
      hash.update(filename); hash.update(fs.readFileSync(path.join(__dirname, filename)));
    }
    renderVersion = `${VERSION}-${hash.digest('hex').slice(0, 24)}`;
  }
  return renderVersion;
}
function catalog() { return JSON.parse(fs.readFileSync(path.join(DIRECTORY, 'catalog.json'), 'utf8').replace(/^\uFEFF/, '')); }
function descriptor(form) {
  if (!form || !/^[a-z0-9-]+\.pdf$/.test(form.filename)) throw new ServiceError('SERVICE_STATE_UNAVAILABLE');
  const row = catalog().forms.find(item => item.filename === form.filename);
  if (!row || row.sha256 !== form.sha256 || ['id','country','bureau','purpose','source_url'].some(key => form[key] != null && row[key] !== form[key])) throw new ServiceError('SERVICE_STATE_UNAVAILABLE');
  const mapping_version = mappingVersion(row.id);
  if (form.mapping_version && form.mapping_version !== mapping_version) throw new ServiceError('SERVICE_STATE_UNAVAILABLE');
  return { ...row, template_sha256: row.sha256, source_sha256:row.sha256, mapping_version, population_mode: MAPS[row.id].mode, native_controls: row.native_controls || [] };
}

function materialForms(country, bureau, purpose) {
  const current = catalog();
  const effectivePurpose = purpose === 'NEW_ADDRESS' ? 'PERSONAL' : purpose;
  return current.forms.filter(form => form.country === country && form.bureau === bureau &&
    (form.purpose === 'ALL' || form.purpose === effectivePurpose)).map(form => {
      if (!/^[a-z0-9-]+\.pdf$/.test(form.filename)) throw new ServiceError('SERVICE_STATE_UNAVAILABLE');
      const bytes = fs.readFileSync(path.join(DIRECTORY, form.filename));
      const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
      if (sha256 !== form.sha256 || bytes.subarray(0, 5).toString('ascii') !== '%PDF-') throw new ServiceError('SERVICE_STATE_UNAVAILABLE');
      return descriptor(form);
    });
}

function bytesFor(form) {
  const checked = descriptor(form), bytes = fs.readFileSync(path.join(DIRECTORY, checked.filename));
  if (crypto.createHash('sha256').update(bytes).digest('hex') !== checked.sha256) throw new ServiceError('SERVICE_STATE_UNAVAILABLE');
  return { ...checked, bytes };
}

function missingFormFields(form, payload = {}) {
  const checked = descriptor(form), map = MAPS[checked.id], profile = payload.profile || {}, missing = [];
  if (map.name_parts) {
    if (!String(profile.given_name || '').trim()) missing.push('Enter your first or given name so we can fill the bureau form.');
    if (!String(profile.family_name || '').trim()) missing.push('Enter your last or family name so we can fill the bureau form.');
  } else if (!String(profile.full_name || payload.correspondence?.consumer_name || '').trim()) missing.push('Enter your full name so we can fill the bureau form.');
  if (checked.id === 'ca-transunion' && !province(profile.region)) missing.push('Choose your province or territory so we can fill the bureau form.');
  return missing;
}
function populateForm(form, payload) {
  const checked = bytesFor(form), { bytes: original, ...row } = checked;
  if (!payload || typeof payload !== 'object' || !Array.isArray(payload.items) || payload.items.length > 200) throw new ServiceError('INVALID_REQUEST');
  const input = JSON.stringify({ descriptor: row, payload });
  if (Buffer.byteLength(input) > 2 * 1024 * 1024) throw new ServiceError('INVALID_REQUEST');
  const child = spawnSync(process.execPath, [path.join(__dirname, 'bureau-form-worker.cjs')], {
    input, encoding: 'utf8', timeout: 20000, maxBuffer: 24 * 1024 * 1024, windowsHide: true,
    env: { ...process.env, NODE_OPTIONS: '' }, stdio: ['pipe','pipe','pipe']
  });
  // Do not expose private stdin or renderer diagnostics to logs or the consumer.
  if (child.error || child.status !== 0) throw new ServiceError('SERVICE_STATE_UNAVAILABLE');
  let result;
  try { result = JSON.parse(child.stdout); } catch { throw new ServiceError('SERVICE_STATE_UNAVAILABLE'); }
  const bytes = Buffer.from(result.bytes || '', 'base64');
  if (result.error || bytes.subarray(0,5).toString('ascii') !== '%PDF-' || crypto.createHash('sha256').update(bytes).digest('hex') !== result.sha256 || result.mapping_version !== row.mapping_version || result.template_sha256 !== row.sha256) throw new ServiceError('SERVICE_STATE_UNAVAILABLE');
  return { ...row, ...result, bytes, template_sha256: row.sha256 };
}
module.exports = { materialForms, bytesFor, populateForm, missingFormFields, mappingVersion };
