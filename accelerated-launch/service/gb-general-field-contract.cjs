'use strict';
// Batch 62: current consumer FIELD documentation on GENERAL, not dedicated PDF-layout admission.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ID = 'GB-TU-GENERAL-FIELDS-V9-2025';
const REGIONS = Object.freeze(['GB-ENG', 'GB-NIR', 'GB-SCT', 'GB-WLS']);
const SOURCE = Object.freeze({
  publisher: 'TransUnion International UK Limited',
  url: 'https://www.transunion.co.uk/content/dam/transunion/gb/consumer/collateral/your-credit-file-explained-v-9/Your%20credit%20file%20explained%20v9.pdf',
  version: 'V9.0 | April 2025', retrieved_on: '2026-10-08', pages: 55,
  locator: 'section 5.8, printed pages 15-17',
  capture_kind: 'WEB_PDF_READER_FIELD_CROSSWALK', original_pdf_sha256: null,
  original_capture_result: 'HTTP_403_FORBIDDEN',
  latest_linked_edition_verified: false,
  latest_linked_url: 'https://www.transunion.co.uk/content/dam/transunion/gb/consumer/collateral/Your-credit-file-explained-Sep.pdf',
  fields: Object.freeze([
    ['Organisation Name', 'account.reported_identity', 'account-owning organisation'],
    ['Account Number / suffix', 'account.masked_identifier', 'retain only a readable masked suffix'],
    ['Account State', 'account.status', 'literal recognized state; no inferred payment performance'],
    ['Account Type', 'account.type', 'printed product type'],
    ['Current Balance', 'account.balance', 'balance at the organisation update'],
    ['Regular Payment Value', 'account.paymentAmount', 'scheduled amount due; not payment made'],
    ['Credit Limit / Overdraft Limit', 'account.creditLimit', 'available credit or overdraft limit'],
    ['Account Start Date', 'liability.openedDate', 'account opening'],
    ['Account End Date', 'liability.closedDate', 'closure, settlement or repayment; N/A is no date'],
    ['Account Holder Start Date', null, 'participation start; never account opening'],
    ['Account Holder End Date', null, 'participation end; never account closure'],
    ['Payment Start Date', null, 'payments became due; never last payment or first delinquency'],
    ['Date Account Last Updated', null, 'organisation update; never report reference date']
  ].map(Object.freeze)),
  boundary: 'Current supported captions and their meanings on GENERAL intake only. No current complete bureau PDF geometry, populated specimen or TransUnion history-code interpretation is certified.'
});
const REQUIRED_SOURCES = Object.freeze([
  'accelerated-launch/service/gb-general-field-contract.cjs',
  'accelerated-launch/service/general-intake.cjs',
  'accelerated-launch/service/formats.cjs',
  'accelerated-launch/service/evaluation.cjs',
  'accelerated-launch/service/issues.cjs',
  'accelerated-launch/service/report-fact-sources.cjs',
  'accelerated-launch/service/packets.cjs',
  'accelerated-launch/service/tests/sections/dl-general-caption-sources.cjs'
]);
const REQUIRED_SECTIONS = Object.freeze(['dl-general-caption-sources', 'ds-column-caption-fields', 'dx-report-date-custody', 'dy-reader-date-delivery']);
function currentInventory(root = path.resolve(__dirname, '../..')) {
  const runner = fs.readFileSync(path.join(root, 'accelerated-launch/service/tests/run-tests.cjs'), 'utf8');
  const block = /const SECTION_FILES = \[([\s\S]*?)\];/.exec(runner)?.[1];
  if (!block) throw new Error('registered product section inventory is unavailable');
  const sectionFiles = [...block.matchAll(/^\s*'([a-z0-9-]+\.cjs)'\s*[,\]]?/gm)].map(match => match[1]);
  const sectionIds = sectionFiles.map(file => require(path.join(root, 'accelerated-launch/service/tests/sections', file)).id);
  if (!sectionIds.length || new Set(sectionIds).size !== sectionIds.length) throw new Error('registered product section inventory is invalid');
  const sources = [];
  function collect(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (['out', 'node_modules'].includes(entry.name)) continue;
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) collect(file);
      else if (/\.(cjs|js|json|html|css)$/.test(entry.name)) sources.push(path.relative(root, file).replace(/\\/g, '/'));
    }
  }
  collect(path.join(root, 'accelerated-launch/service'));
  collect(path.join(root, 'accelerated-launch/adapters'));
  return { sectionIds, sources };
}
function validate(evidence, root = path.resolve(__dirname, '../..')) {
  const errors = [], execution = evidence?.execution;
  if (execution?.mode !== 'FULL_CURRENT_PRODUCT' || evidence?.totals?.failed !== 0 || evidence?.totals?.skipped !== 0
    || !Array.isArray(execution?.unrun_sections) || execution.unrun_sections.length
    || !Array.isArray(execution?.source_drift) || execution.source_drift.length) errors.push('complete passing unchanged-source product proof is required');
  const sections = new Map((evidence?.sections || []).map(row => [row.id, row]));
  try {
    const inventory = currentInventory(root);
    const sameSet = (actual, expected) => Array.isArray(actual) && actual.length === expected.length
      && new Set(actual).size === expected.length && expected.every(value => actual.includes(value));
    if (!sameSet((evidence?.sections || []).map(row => row.id), inventory.sectionIds)
      || !sameSet(execution?.selected_sections, inventory.sectionIds)
      || !sameSet((execution?.sections || []).map(row => row.id), inventory.sectionIds)
      || !sameSet((execution?.source_hashes || []).map(row => String(row.file).replace(/\\/g, '/')), inventory.sources)) errors.push('proof must contain the exact registered product sections and current tested source inventory');
    const totals = (evidence?.sections || []).reduce((sum, row) => ({ passed: sum.passed + row.passed,
      failed: sum.failed + row.failed, skipped: sum.skipped + (Array.isArray(row.skipped) ? row.skipped.length : 1) }), { passed: 0, failed: 0, skipped: 0 });
    if (!(totals.passed > 0) || JSON.stringify(totals) !== JSON.stringify(evidence?.totals)
      || JSON.stringify(totals) !== JSON.stringify(execution?.totals)
      || (evidence?.sections || []).some(row => row.completed !== true || row.failed !== 0 || row.skipped?.length)
      || JSON.stringify(execution?.sections) !== JSON.stringify(evidence?.sections)) errors.push('section execution and aggregate outcomes must agree and pass');
  } catch (_) { errors.push('current complete-product inventory is unavailable'); }
  for (const id of REQUIRED_SECTIONS) {
    const row = sections.get(id);
    if (!row || row.completed !== true || row.failed !== 0 || !(row.passed > 0) || !Array.isArray(row.skipped) || row.skipped.length) errors.push('current behavioral section required: ' + id);
  }
  const measured = sections.get(REQUIRED_SECTIONS[0])?.evidence?.gb_field_contract;
  if (measured?.id !== ID || measured?.source_version !== SOURCE.version || measured?.check_id !== 'COMMON-ERROR-REVOLVING-BALANCE-ZERO-LIMIT'
    || measured?.approved_downloads !== 4 || measured?.source_isolation !== true
    || JSON.stringify(measured?.regions) !== JSON.stringify(REGIONS)) errors.push('documented field extraction, isolation and four-region approved downloads are required');
  const hashes = execution?.source_hashes;
  if (!Array.isArray(hashes) || !hashes.length) errors.push('tested source hashes are absent');
  else {
    const files = new Map(hashes.map(row => [String(row.file).replace(/\\/g, '/'), row.sha256]));
    for (const file of REQUIRED_SOURCES) if (!files.has(file)) errors.push('tested source missing: ' + file);
    for (const [file, digest] of files) {
      try {
        const full = path.resolve(root, file);
        if (!full.startsWith(path.resolve(root) + path.sep)
          || crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex') !== digest) throw new Error('changed');
      } catch (_) { errors.push('tested source unavailable or changed: ' + file); }
    }
  }
  return { passed: errors.length === 0, errors, contract_id: ID, scope: 'CURRENT_GENERAL_CONSUMER_FIELDS',
    dedicated_experian_family_currency_validated: false, source: SOURCE,
    detail: errors.length ? errors.join('; ') : 'TransUnion V9.0 April 2025 consumer fields are supported on GENERAL with current source-bound extraction, isolation and approved packets across four UK regions; complete current PDF layouts and the historical Experian family are not certified.' };
}
module.exports = { ID, SOURCE, REGIONS, REQUIRED_SOURCES, REQUIRED_SECTIONS, currentInventory, validate };
