'use strict';
/**
 * g-privacy.cjs — acceptance item 7: "Private files and identifiers never enter public assets or ordinary
 * logs", plus the structural invariant that report bytes cannot be stored inside this repository.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PrivateStore, REPOSITORY_ROOT } = require('../../private-store.cjs');
const { Logger, ALLOWED_FIELDS } = require('../../logger.cjs');
const FIXTURES = require('../../../../internal-validation/ca-ns-last-payment-six-year/tests/fixtures.cjs');

const DISTINCT_FILENAME = 'consumer-2026-09-statement.pdf';

async function run(t, check) {
  const owner = await t.account('private-identifiable-address@example.test');
  const caseId = (await t.request('POST', '/api/cases', { token: owner.token, body: { country: 'CA', region: 'CA-NS' } })).json.case.case_id;
  const fixtures = FIXTURES.pdfFixtures();
  await t.request('POST', `/api/cases/${caseId}/files`, {
    token: owner.token,
    body: { originalFilename: DISTINCT_FILENAME, declaredBytes: 1, mimeType: 'application/pdf', contentBase64: fs.readFileSync(fixtures.unpinned).toString('base64') }
  });
  await t.request('POST', `/api/cases/${caseId}/demonstration`, { token: owner.token, body: { scenario: 'TWO_ACCOUNTS' } });
  const view = await t.request('GET', `/api/cases/${caseId}`, { token: owner.token });
  const fileId = view.json.view.files[0].file_id;

  /* ---------------------------------------------------------------- the log stream */

  const logs = t.logText();
  check.ok(logs.length > 0, 'the service emitted log records');
  for (const [value, label] of [
    [owner.email, 'the consumer address'],
    [DISTINCT_FILENAME, 'the consumer file name'],
    [caseId, 'the case id'],
    [fileId, 'the internal file id'],
    [owner.token, 'the session token'],
    [t.dataDir, 'the private data path'],
    ['C:\\Users', 'any user path fragment']
  ]) {
    check.ok(!logs.includes(value), `${label} never appears in an ordinary log record`);
  }
  for (const line of t.logs) {
    const record = JSON.parse(line);
    for (const key of Object.keys(record)) check.ok(ALLOWED_FIELDS.includes(key), `log key ${key} is whitelisted`);
  }

  /* A caller cannot smuggle a field through even if it tries. */
  const smuggled = [];
  new Logger((line) => smuggled.push(JSON.parse(line))).log({ event: 'TEST_EVENT', email: owner.email, token: owner.token, path: 'C:\\secret.pdf', case_id: caseId });
  check.equal(smuggled.length, 1);
  check.deepEqual(Object.keys(smuggled[0]), ['event'], 'a non-whitelisted field is dropped at the sink');

  /* ---------------------------------------------------------------- the HTTP surface */

  check.ok(!view.text.includes('sha256'), 'a case view carries no digest');
  check.ok(!view.text.includes('absolute_path'), 'a case view carries no recorded file path');
  check.ok(!view.text.includes('C:\\\\Users'), 'a case view carries no absolute path');
  check.ok(!view.text.includes('CRP-LSRC'), 'a case view carries no source-entry identifier');
  check.ok(!/adapter_id/.test(view.text), 'a case view carries no adapter identifier');
  check.ok(!/presentation_id/.test(view.text), 'a case view carries no admission identifier');

  const traversal = await t.request('GET', '/%2e%2e%2fstate.json');
  check.equal(traversal.status, 404, 'a traversal attempt against the static route is refused');
  const stateProbe = await t.request('GET', '/state.json');
  check.equal(stateProbe.status, 404, 'the state file is not on the static allowlist');
  const unknownAsset = await t.request('GET', '/../package.json');
  check.equal(unknownAsset.status, 404, 'and neither is anything else outside the private UI tree');

  /* ---------------------------------------------------------------- the repository-privacy invariant */

  let guarded = false;
  try {
    new PrivateStore(path.join(REPOSITORY_ROOT, 'accelerated-launch', 'service', '.forbidden-data'));
  } catch (err) {
    guarded = /PRIVATE_DATA_DIRECTORY_INSIDE_REPOSITORY_REFUSED/.test(err.message);
  }
  check.ok(guarded, 'a data directory inside the repository is refused outright');
  check.ok(!t.dataDir.startsWith(REPOSITORY_ROOT), 'and this run\'s data directory is outside the repository');

  /* ---------------------------------------------------------------- public assets */

  const register = JSON.parse(fs.readFileSync(path.join(REPOSITORY_ROOT, 'SOURCE_CAPTURES', 'PROD-003', 'report_representation_register.json'), 'utf8'));
  const pinned = register.presentations.find((p) => p.presentation_id === register.selected_presentation);
  const publicTrees = [
    path.join(REPOSITORY_ROOT, 'consumer-wizard', 'dist'),
    path.join(REPOSITORY_ROOT, 'accelerated-launch', 'service', 'ui')
  ];
  const scans = [];
  for (const tree of publicTrees) {
    for (const entry of fs.readdirSync(tree)) {
      const file = path.join(tree, entry);
      if (!fs.statSync(file).isFile()) continue;
      const text = fs.readFileSync(file).toString('latin1');
      const label = path.relative(REPOSITORY_ROOT, file);
      check.ok(!text.includes(pinned.sha256), `${label} does not carry the specimen digest`);
      check.ok(!text.includes(pinned.absolute_path_outside_this_repository), `${label} does not carry the specimen path`);
      scans.push(label);
    }
  }

  return { scanned_public_assets: scans.length, log_records: t.logs.length };
}

module.exports = { run, id: 'g-privacy', title: 'No private file or identifier in logs or public assets' };
