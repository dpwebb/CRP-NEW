'use strict';
/** Local projections and read-only package inventory. No hosted/provider action. */
const fs = require('node:fs');
const path = require('node:path');
const service = require('../../admin-service.cjs');
const documents = require('../../account-documents.cjs');
const manifest = require('../../deploy/build-release-manifest.cjs');
const ROOT = path.resolve(__dirname, '../../../..');

async function projection(state, principal, metadata = {}) {
  const access = { principal: () => principal, requireCapability: (_store, value, permission) => {
    if (!value.permissions.includes(permission)) throw new Error('Fixture capability denied');
    return value;
  } };
  const result = await service.dispatchAdmin({ store: { state: () => state },
    adminStore: { state: () => ({ affiliate_records: [], fulfillment_queue: [], ...metadata }) },
    actor: { account_id: 'fictional_owner' }, method: 'GET', pathname: '/api/admin/overview',
    req: { url: '/api/admin/overview' }, env: { CRP_ADMIN_ENABLED: '1' }, access });
  return result.json.overview;
}

function runtimeDependencies() {
  // Workers are started by pathname rather than require(), so each is an explicit
  // root. This verifies the live service graph, not the local evidence/test graph.
  const pending = ['accelerated-launch/service/server.cjs', 'accelerated-launch/service/processing-worker.cjs',
    'accelerated-launch/service/packet-composer-worker.cjs'];
  const visited = new Set();
  while (pending.length) {
    const relative = pending.pop();
    if (visited.has(relative)) continue;
    visited.add(relative);
    if (!/\.(?:cjs|js)$/.test(relative)) continue;
    const source = fs.readFileSync(path.join(ROOT, relative), 'utf8');
    for (const match of source.matchAll(/require\(\s*['"](\.[^'"]+)['"]\s*\)/g)) {
      const resolved = path.resolve(ROOT, path.dirname(relative), match[1]);
      const dependency = path.relative(ROOT, resolved).split(path.sep).join('/');
      if (dependency.startsWith('../') || path.isAbsolute(dependency)) throw new Error('Runtime dependency leaves source root');
      if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) throw new Error('Runtime dependency missing: ' + dependency);
      pending.push(dependency);
    }
  }
  return visited;
}

async function run(_t, check) {
  const state = {
    accounts: [{ account_id: 'a' }, { account_id: 'b' }],
    cases: [{ case_id: 'case_a', account_id: 'a' }, { case_id: 'case_b', account_id: 'b' }],
    files: [
      { file_id: 'report_a', case_id: 'case_a', account_id: 'a', supported_format: true },
      { file_id: 'report_b', case_id: 'case_b', account_id: 'b', supported_format: false },
      { file_id: 'identity', case_id: null, account_id: 'a', purpose: documents.PURPOSE, document_type: 'IDENTITY' },
      { file_id: 'address', case_id: null, account_id: 'a', purpose: documents.PURPOSE, document_type: 'ADDRESS' },
      { file_id: 'support', case_id: null, account_id: 'b', purpose: documents.PURPOSE, document_type: 'SUPPORTING' },
      { file_id: 'legacy_support', case_id: null, account_id: 'b', purpose: 'ACCOUNT_DOCUMENT' },
      { file_id: 'misassociated_support', case_id: 'case_a', account_id: 'a', purpose: documents.PURPOSE },
      { file_id: 'orphan', case_id: 'missing_case', account_id: 'a' },
      { file_id: 'unassociated', case_id: null, account_id: 'a' },
      { file_id: 'foreign_owner', case_id: 'case_a', account_id: 'b' },
      { file_id: 'unknown_purpose', case_id: 'case_a', account_id: 'a', purpose: 'UNKNOWN_DOCUMENT' }
    ],
    results: [{ result_id: 'r1' }, { result_id: 'r2' }, { result_id: 'r3' }],
    packets: [{ approved_version: 'v1' }, { approved_version: null }]
  };
  const before = JSON.stringify(state);
  const owner = { role: 'owner', permissions: ['overview.read', 'accounts.read', 'cases.read'] };
  const counts = (await projection(state, owner)).counts;
  check.deepEqual(counts, { accounts: 2, cases: 2, reports: 2, results: 3, approved_packets: 1 },
    'admin inventory counts both admitted and refused report uploads without supporting, orphan or foreign-owner rows');
  check.equal(JSON.stringify(state), before, 'inventory projection preserves every original row');
  check.equal((await projection(state, { role: 'staff', permissions: ['overview.read', 'cases.read'] })).counts.reports, 2,
    'permissioned staff receive the same correct report inventory');
  check.deepEqual((await projection(state, { role: 'staff', permissions: ['overview.read'] })).counts, {},
    'overview permission alone does not disclose report or account totals');
  const partner = await projection(state, { role: 'partner', org_id: 'org_a', permissions: ['overview.read', 'affiliate.read'] },
    { affiliate_records: [{ org_id: 'org_a' }, { org_id: 'org_b' }] });
  check.deepEqual(partner.counts, { affiliate_members: 1 }, 'partner overview remains organization-scoped without global report counts');

  const frozenManifest = fs.readFileSync(manifest.OUT, 'utf8');
  const groups = manifest.collectGroups(), files = groups.flatMap(group => group.files.map(row => row.file));
  const shipped = new Set(files), excluded = manifest.REVIEWED_NON_SHIPPED;
  check.equal(files.length, shipped.size, 'packaged groups remain disjoint');
  check.ok(excluded.every(row => row.reason && fs.existsSync(path.join(ROOT, row.file)) && !shipped.has(row.file)),
    'reviewed legacy/test runners leave deployment packaging while their source and explicit reasons remain');
  check.deepEqual([...runtimeDependencies()].filter(file => !shipped.has(file)), [],
    'every local dependency of the service and both worker entrypoints remains packaged');
  const operatorDependencies = [
    'accelerated-launch/service/evidence-validator.cjs', 'accelerated-launch/service/fdt-acceptance.cjs',
    'accelerated-launch/service/fdt-benchmark.cjs', 'accelerated-launch/service/release-check.cjs',
    'accelerated-launch/service/store-diagnostic.cjs',
    'internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs'
  ];
  check.deepEqual(operatorDependencies.filter(file => !shipped.has(file)), [],
    'frozen operator, recovery and FDT dependencies remain packaged');
  const readerDependencies = ['constants.cjs', 'document-model.cjs', 'extraction.cjs', 'locators.cjs',
    'presentation-contract.cjs', 'runtime-config.cjs', 'six-year-evaluator.cjs']
    .map(name => 'internal-validation/ca-ns-last-payment-six-year/' + name);
  check.deepEqual(readerDependencies.filter(file => !shipped.has(file)), [], 'the Canadian pinned reader contract remains complete');
  check.ok(['accelerated-launch/service/pdf-vendor/pdf-lib-1.17.1.min.js',
    'accelerated-launch/service/pdf-vendor/fontkit-1.1.1.min.js', 'accelerated-launch/service/packet-fonts/NotoSans-Regular.ttf',
    'accelerated-launch/service/ui/admin.js', 'accelerated-launch/service/ui/partner-access.js']
    .every(file => shipped.has(file)), 'packet fonts/renderers and authorized administration/partner assets remain packaged');
  check.equal(fs.readFileSync(manifest.OUT, 'utf8'), frozenManifest,
    'read-only inventory collection does not replace the frozen manifest');
  return { fictional_only: true, mixed_report_inventory: true, runtime_dependencies_preserved: true,
    operator_dependencies_preserved: true, source_history_preserved: true, reviewed_package_exclusions: excluded.map(row => row.file),
    proposed_shipped_files: files.length };
}

module.exports = { run, id: 'gj-audit-maintenance', title: 'Correct report inventories and reviewed deployment exclusions with complete runtime dependencies' };
