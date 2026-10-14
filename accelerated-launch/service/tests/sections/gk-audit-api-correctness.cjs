'use strict';
const crypto = require('node:crypto');
const support = require('../../support.cjs');
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

async function run(t, check) {
  const publicSurface = await t.request('GET', '/api/jurisdictions');
  check.equal(publicSurface.status, 200, 'public help contact needs no account');
  check.deepEqual(publicSurface.json.surface.support_contact, support.publicContact(), 'public surface supplies established support address');
  check.ok(!JSON.stringify(publicSurface.json.surface.support_contact).includes('secret'), 'public contact has no credential fields');
  for (const route of ['/', '/index.html']) {
    const page = await t.request('GET', route);
    check.ok(page.text.includes('mailto:' + support.publicContact().email), 'public entry has an actionable help link: ' + route);
  }

  const owner = await t.account('audit-download-owner@example.test');
  const stranger = await t.account('audit-download-stranger@example.test');
  const create = async actor => (await t.request('POST', '/api/cases', { token: actor.token, body: { country: 'US', region: 'US-CA' } })).json.case.case_id;
  const assess = async (caseId, scenario, actor = owner) => (await t.request('POST', '/api/cases/' + caseId + '/demonstration', { token: actor.token, body: { scenario } })).json;
  const caseId = await create(owner);
  const first = await assess(caseId, 'TWO_ACCOUNTS');
  const olderId = first.result_id;
  check.ok(Boolean(olderId), 'first assessment has a stable result identity');
  const before = await t.request('GET', '/api/cases/' + caseId + '/report-download', { token: owner.token });
  check.equal(before.status, 200, 'first assessment download is available to subscriber');
  const second = await assess(caseId, 'NO_COLLECTION_ACCOUNTS');
  check.notEqual(second.result_id, olderId, 'later assessment is distinct');
  const selected = await t.request('GET', '/api/cases/' + caseId + '/report-download?result_id=' + encodeURIComponent(olderId), { token: owner.token });
  check.equal(selected.status, 200, 'explicit older owned assessment downloads');
  check.equal(digest(selected.bytes), digest(before.bytes), 'older download retains its own exact assessment bytes');
  const latest = await t.request('GET', '/api/cases/' + caseId + '/report-download', { token: owner.token });
  check.notEqual(digest(latest.bytes), digest(selected.bytes), 'latest download does not replace explicitly selected older result');
  check.equal((await t.request('GET', '/api/cases/' + caseId + '/report-download?result_id=', { token: owner.token })).status, 400, 'explicit empty result never falls back to latest');
  check.equal((await t.request('GET', '/api/cases/' + caseId + '/report-download?result_id=' + olderId + '&result_id=' + second.result_id, { token: owner.token })).status, 400, 'ambiguous selection is refused');
  check.equal((await t.request('GET', '/api/cases/' + caseId + '/report-download?result_id=res_missing', { token: owner.token })).status, 404, 'unknown selection never falls back to latest');
  const otherCase = await create(owner);
  const other = await assess(otherCase, 'TWO_ACCOUNTS');
  check.equal((await t.request('GET', '/api/cases/' + caseId + '/report-download?result_id=' + other.result_id, { token: owner.token })).status, 404, 'result from another owned case is refused');
  check.equal((await t.request('GET', '/api/cases/' + caseId + '/report-download?result_id=' + olderId, { token: stranger.token })).status, 403, 'foreign-account selected download is refused');
  const currentView = (await t.request('GET', '/api/cases/' + caseId, { token: owner.token })).json.view;
  check.ok(!/caps its conclusion|demonstration file is offered instead/i.test(currentView.download.reason_plain), 'current download contract no longer advertises observation-only output');
  check.ok(!publicSurface.json.surface.paid_actions.includes('REQUEST_RESPONSE_DRAFT'), 'paid capability list does not advertise permanently refused legacy draft');
  return { public_support: true, selected_assessment_bytes: true, ownership: true, current_contract: true };
}

module.exports = { run, id: 'gk-audit-api-correctness', title: 'Selected assessment downloads, public support and current capability contracts' };
