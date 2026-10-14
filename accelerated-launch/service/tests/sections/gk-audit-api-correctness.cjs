'use strict';
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const support = require('../../support.cjs');
const { TestService } = require('../harness.cjs');
const security = require('../../signup-security.cjs');
const access = require('../../admin-access.cjs');
const accounts = require('../../accounts.cjs');
const payments = require('../../payment-provider.cjs');
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

function recordedSubscription(state, actor, suffix, expiry) {
  state.entitlements.push({ account_id: actor.account_id, entitlement_id: 'ent_' + suffix, checkout_id: 'chk_' + suffix,
    source: 'stripe', state: 'ACTIVE', access_via: 'SUBSCRIPTION', plan_code: 'monthly', currency: 'cad',
    provider_reference: 'cs_' + suffix, provider_subscription_reference: 'sub_' + suffix,
    expires_at: expiry, cancel_at_period_end: false });
  state.checkout_sessions.push({ account_id: actor.account_id, checkout_id: 'chk_' + suffix,
    provider_id: 'stripe', state: 'COMPLETED', plan_code: 'monthly', currency: 'cad',
    provider_reference: 'cs_' + suffix, provider_subscription_reference: 'sub_' + suffix });
}

async function administrationDeletionControls(check) {
  const previous = process.env.CRP_ADMIN_ENABLED;
  process.env.CRP_ADMIN_ENABLED = '1';
  const service = new TestService('audit-deletion-authority');
  await service.listen();
  try {
    const secure = async (email, owner = false) => {
      const actor = await service.unpaidAccount(email), now = Date.now, fixture = now() - 180000;
      let setup;
      try {
        Date.now = () => fixture;
        setup = security.beginTwoFactor(service.service.store, actor, { password: 'a-long-enough-password' });
        security.confirmTwoFactor(service.service.store, actor, { code: security.totp(setup.secret) });
        if (owner) access.bootstrapOwner(service.service.adminStore, { account_id: actor.account_id, code: security.totp(setup.secret, fixture + 30000) });
      } finally { Date.now = now; }
      return { ...actor, secret: setup.secret };
    };
    const owner = await secure('audit-authority-owner@example.test', true);
    const before = JSON.stringify(service.service.adminStore.state());
    const denied = await service.request('DELETE', '/api/account', { token: owner.token });
    check.equal(denied.status, 409, 'consumer deletion cannot orphan active owner authority');
    check.equal(denied.json.error.code, 'ACCOUNT_DELETION_ADMIN_ACCESS_ACTIVE', 'owner receives an actionable authority-removal boundary');
    check.equal(JSON.stringify(service.service.adminStore.state()), before, 'refused owner deletion preserves signed administrative metadata');
    const unlocked = await service.request('POST', '/api/admin/unlock', { token: owner.token, body: { code: security.totp(owner.secret) } });
    check.equal(unlocked.status, 200, 'preserved owner still unlocks with actual fictional MFA');
    const adminToken = /crp_admin_session=([^;]+)/.exec(unlocked.setCookie)[1];
    const principal = access.principal(service.service.adminStore, accounts.resolveSession(service.service.store, owner.token), owner.token, adminToken);
    const staff = await secure('audit-authority-staff@example.test');
    const member = access.createMembership(service.service.adminStore, principal, { account_id: staff.account_id, role: 'staff', permissions: ['cases.read'] });
    check.equal((await service.request('DELETE', '/api/account', { token: staff.token })).status, 409, 'active staff also retain their signed access binding');
    access.updateMembership(service.service.adminStore, principal, member.admin_id, { status: 'DISABLED' });
    check.equal((await service.request('DELETE', '/api/account', { token: staff.token })).status, 200, 'signed removal permits ordinary account deletion');

    const ordinary = await secure('audit-deletion-race@example.test');
    service.service.store.update(state => recordedSubscription(state, ordinary, 'authority_race', '2099-01-01T00:00:00.000Z'));
    let entered, finish;
    const started = new Promise(resolve => { entered = resolve; });
    const pending = new Promise(resolve => { finish = resolve; });
    const originalProvider = payments.resolveProvider;
    payments.resolveProvider = () => ({ provider_id: 'stripe', async cancelAccountSubscription(request) {
      entered(); await pending;
      return { renewal_cancelled: true, subscription_reference: request.subscription_reference, subscription_status: 'canceled' };
    } });
    try {
      const deleting = service.request('DELETE', '/api/account', { token: ordinary.token });
      await Promise.race([started, new Promise((_, reject) => setTimeout(() => reject(Error('Cancellation did not start')), 5000))]);
      access.createMembership(service.service.adminStore, principal, { account_id: ordinary.account_id, role: 'staff', permissions: ['cases.read'] });
      finish();
      const response = await deleting;
      check.equal(response.status, 409, 'new authority during provider await is protected at the final transaction');
      check.equal(response.json.error.code, 'ACCOUNT_DELETION_ADMIN_ACCESS_ACTIVE', 'final authority refusal remains specific');
      check.ok(service.service.store.state().accounts.some(row => row.account_id === ordinary.account_id), 'final refusal keeps the administrative account');
    } finally { finish?.(); payments.resolveProvider = originalProvider; }
  } finally {
    await service.close();
    if (previous === undefined) delete process.env.CRP_ADMIN_ENABLED; else process.env.CRP_ADMIN_ENABLED = previous;
  }
  const disabledPrevious = process.env.CRP_ADMIN_ENABLED;
  process.env.CRP_ADMIN_ENABLED = '0';
  const disabled = new TestService('audit-deletion-custody'); await disabled.listen();
  try {
    const actor = await disabled.unpaidAccount('audit-preserved-custody@example.test');
    fs.mkdirSync(path.join(disabled.dataDir, 'admin'));
    check.equal((await disabled.request('DELETE', '/api/account', { token: actor.token })).status, 503, 'flag-off administrative custody cannot bypass authority preservation');
    check.ok(disabled.service.store.state().accounts.some(row => row.account_id === actor.account_id), 'unavailable authority keeps consumer data');
  } finally {
    await disabled.close();
    if (disabledPrevious === undefined) delete process.env.CRP_ADMIN_ENABLED; else process.env.CRP_ADMIN_ENABLED = disabledPrevious;
  }
}

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
  // Both demonstrations may have no eligible findings. Distinct fictional
  // history dates make an accidental latest-result PDF substitution observable.
  t.service.store.update(state => {
    const stored = state.results.find(row => row.result_id === olderId);
    const historical = new Date(Date.now() - 86400000).toISOString();
    stored.created_at = historical;
    stored.rendered.assessed_on = historical.slice(0, 10);
  });
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
  check.equal(publicSurface.json.surface.payment_actions.cancel_unfinished_checkout, true, 'public capability names the actual unfinished-payment action');
  t.service.store.update(state => state.checkout_sessions.push({ account_id: owner.account_id,
    checkout_id: 'chk_case_delete_api', case_id: otherCase, provider_id: 'stripe', provider_reference: 'cs_case_delete_api',
    state: 'OPEN', plan_code: 'report_once', currency: 'cad' }));
  let stoppedCheckouts = 0;
  const originalProvider = payments.resolveProvider;
  payments.resolveProvider = () => ({ provider_id: 'stripe', async cancelCheckout(request) {
    check.equal(request.case_id, otherCase, 'public report deletion stops only its owned checkout');
    stoppedCheckouts++; return { cancelled: true };
  } });
  try {
    check.equal((await t.request('DELETE', '/api/cases/' + otherCase, { token: owner.token })).status, 200, 'public report deletion awaits provider-confirmed cleanup');
    check.equal(stoppedCheckouts, 1, 'public deletion actually invokes the provider cleanup seam');
    check.equal((await t.request('GET', '/api/cases/' + otherCase, { token: owner.token })).status, 404, 'case disappears only after its payment is stopped');
  } finally { payments.resolveProvider = originalProvider; }
  const renewalActor = await t.unpaidAccount('audit-replacement-subscription@example.test');
  t.service.store.update(state => {
    recordedSubscription(state, renewalActor, 'expired_duplicate', new Date(Date.now() - 1000).toISOString());
    state.entitlements.push({ account_id: renewalActor.account_id, entitlement_id: 'ent_active_one_time',
      checkout_id: 'chk_active_one_time', state: 'ACTIVE', source: 'TEST_ADAPTER_NOT_A_PAYMENT',
      access_via: 'ONE_TIME_CREDIT', plan_code: 'report_once', expires_at: '2099-01-01T00:00:00.000Z' });
  });
  const refused = await t.request('POST', '/api/billing/checkout', { token: renewalActor.token, body: { plan_code: 'monthly', currency: 'cad' } });
  check.equal(refused.status, 409, 'one-time paid access cannot hide outstanding earlier renewal');
  check.equal(refused.json.error.code, 'SUBSCRIPTION_RENEWAL_UNCONFIRMED', 'replacement purchase directs cancellation first');
  t.service.store.update(state => state.checkout_sessions.push({ account_id: renewalActor.account_id,
    checkout_id: 'chk_pending_duplicate', provider_id: process.env.CRP_PAYMENT_PROVIDER, state: 'OPEN', plan_code: 'monthly', currency: 'cad' }));
  const resume = await t.request('POST', '/api/billing/checkout', { token: renewalActor.token, body: { plan_code: 'monthly', resume_checkout_id: 'chk_pending_duplicate' } });
  check.equal(resume.status, 409, 'ordinary pending subscription resume has the same duplicate guard');
  check.equal(resume.json.error.code, 'SUBSCRIPTION_RENEWAL_UNCONFIRMED', 'resume does not skip renewal safety');
  check.equal(t.service.store.state().checkout_sessions.filter(row => row.account_id === renewalActor.account_id).length, 2, 'refused new and resumed purchases create no checkout');
  await administrationDeletionControls(check);
  return { public_support: true, selected_assessment_bytes: true, ownership: true, current_contract: true };
}

module.exports = { run, id: 'gk-audit-api-correctness', title: 'Selected assessment downloads, public support and current capability contracts' };
