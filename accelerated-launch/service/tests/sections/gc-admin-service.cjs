'use strict';
/** Fictional local service tests. No hosted acceptance, payment, payout or mail. */
const assert = require('node:assert/strict');
const path = require('node:path');
const crypto = require('node:crypto');
const service = require('../../admin-service.cjs');
const security = require('../../signup-security.cjs');
const { ReferralProgram } = require('../../referral-engine.cjs');
const { buildPdf } = require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');
const moduleRoot = process.env.CRP_ADMIN_ACCESS_MODULE ? path.dirname(process.env.CRP_ADMIN_ACCESS_MODULE) : path.resolve(__dirname, '../..');
const access = require(path.join(moduleRoot, 'admin-access.cjs'));
const { AdminStore } = require(path.join(moduleRoot, 'admin-store.cjs'));
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function atTime(instant, fn) { const original = Date.now; Date.now = () => instant; try { return fn(); } finally { Date.now = original; } }

async function run(t, check) {
  const store = t.service.store, adminStore = t.service.adminStore || new AdminStore(t.dataDir, { consumerStore: store });
  const ownsAdmin = !t.service.adminStore;
  const now = Date.now(), password = 'a-long-enough-password';
  const call = (actor, method, url, body = {}, extra = {}) => service.dispatchAdmin({ store, adminStore, actor,
    sessionToken: actor.token, adminToken: actor.adminToken, method, pathname: new URL(url, 'http://127.0.0.1').pathname,
    req: { url }, body, env: { CRP_ADMIN_ENABLED: 'true' }, access, ...extra });
  const refuse = async (label, fn, codes) => {
    let error; try { await fn(); } catch (caught) { error = caught; }
    check.ok(Boolean(error) && (!codes || codes.includes(error.code)), label);
    assert.ok(error, label); return error;
  };
  const secureAccount = async email => {
    const actor = await t.unpaidAccount(email);
    const setup = security.beginTwoFactor(store, actor, { password });
    security.confirmTwoFactor(store, actor, { code: security.totp(setup.secret, now - 30000) });
    return { ...actor, secret: setup.secret };
  };
  const unlock = (actor, instant = now) => {
    actor.adminToken = atTime(instant, () => access.unlock(adminStore, actor, actor.token, { code: security.totp(actor.secret, instant) })).admin_token;
    return actor;
  };
  const injectAuditFailure = async fn => {
    const append = adminStore.appendAudit;
    adminStore.appendAudit = () => { throw Object.assign(new Error('FICTIONAL_AUDIT_FAILURE'), { code: 'FICTIONAL_AUDIT_FAILURE' }); };
    try { await fn(); } finally { adminStore.appendAudit = append; }
  };
  try {
    const owner = await secureAccount('admin-service-owner@example.test');
    access.bootstrapOwner(adminStore, { account_id: owner.account_id, code: security.totp(owner.secret, now) });
    unlock(owner, now + 30000);
    const locked = { ...owner, adminToken: undefined };
    await refuse('ordinary consumer login cannot access the admin projection', () => call(locked, 'GET', '/api/admin/accounts'), ['TWO_FACTOR_REQUIRED']);
    await refuse('feature flag off hides the entire service', () => call(owner, 'GET', '/api/admin/session', {}, { env: {} }), ['NOT_FOUND']);
    const session = (await call(owner, 'GET', '/api/admin/session')).json;
    check.equal(session.principal.role, 'owner', 'separate MFA-unlocked owner role is returned');
    check.equal(session.session.admin_id, session.principal.admin_id, 'session and principal aliases agree');
    check.ok(!JSON.stringify(session).includes(owner.adminToken), 'session projection never returns the admin token');

    const orgA = (await call(owner, 'POST', '/api/admin/organizations', { name: 'Fictional Fulfillment A' })).json.organization;
    const orgB = (await call(owner, 'POST', '/api/admin/organizations', { name: 'Fictional Referral B' })).json.organization;
    const orgC = (await call(owner, 'POST', '/api/admin/organizations', { name: 'Fictional Fulfillment C' })).json.organization;
    const staff = await secureAccount('admin-service-staff@example.test');
    const partnerA = await secureAccount('admin-service-partner-a@example.test');
    const partnerB = await secureAccount('admin-service-partner-b@example.test');
    const partnerC = await secureAccount('admin-service-partner-c@example.test');
    const readOnlyStaff = await secureAccount('admin-service-case-reader@example.test');
    const memberships = [
      [staff, { role: 'staff', permissions: ['overview.read', 'accounts.read', 'cases.read', 'billing.read', 'affiliate.read', 'affiliate.manage', 'fulfillment.read', 'fulfillment.prepare', 'fulfillment.grants', 'audit.read'] }],
      [partnerA, { role: 'partner', org_id: orgA.org_id, permissions: ['overview.read', 'affiliate.read', 'fulfillment.read', 'fulfillment.prepare'] }],
      [partnerB, { role: 'partner', org_id: orgB.org_id, permissions: ['overview.read', 'affiliate.read'] }],
      [partnerC, { role: 'partner', org_id: orgC.org_id, permissions: ['fulfillment.read', 'fulfillment.prepare'] }],
      [readOnlyStaff, { role: 'staff', permissions: ['cases.read'] }]
    ];
    for (const [actor, values] of memberships) { actor.member = (await call(owner, 'POST', '/api/admin/team', { account_id: actor.account_id, ...values })).json.member; unlock(actor); }
    for (const route of ['accounts', 'cases', 'billing', 'audit', 'team', 'organizations']) await refuse('partner cannot read global ' + route, () => call(partnerA, 'GET', '/api/admin/' + route), ['NOT_AUTHORIZED']);
    await refuse('staff cannot administer membership', () => call(staff, 'POST', '/api/admin/team', { account_id: partnerA.account_id, role: 'staff', permissions: [] }), ['NOT_AUTHORIZED']);
    await refuse('staff cannot promote a partner to owner', () => call(staff, 'PATCH', '/api/admin/team/' + partnerA.member.admin_id, { role: 'owner' }), ['NOT_AUTHORIZED']);
    await refuse('partner cannot promote itself to owner', () => call(partnerA, 'PATCH', '/api/admin/team/' + partnerA.member.admin_id, { role: 'owner' }), ['NOT_AUTHORIZED']);
    check.equal((await call(readOnlyStaff, 'GET', '/api/admin/settings')).status, 200, 'settings work without overview permission');
    const referralCounts = (await call(partnerB, 'GET', '/api/admin/overview')).json.overview.counts;
    check.ok(!Object.hasOwn(referralCounts, 'fulfillment_jobs'), 'referral-only partner cannot see fulfillment counts');
    await refuse('partner cannot select another organization', () => call(partnerA, 'GET', '/api/admin/affiliates?org_id=' + orgB.org_id), ['NOT_AUTHORIZED']);
    await refuse('consumer grant review refuses a referral-only organization', () => call(owner, 'GET', '/api/fulfillment-organizations/' + orgB.org_id), ['NOT_FOUND']);

    // The enrolled graph is immutable; its accepted financial engine remains 15/10/5.
    const affiliates = [owner, staff, readOnlyStaff]; let introducer;
    for (const actor of affiliates) {
      const enrolled = (await call(owner, 'POST', '/api/admin/affiliates/enroll', { account_id: actor.account_id, org_id: orgA.org_id, ...(introducer ? { introducer_code: introducer } : {}) })).json.member;
      introducer = enrolled.code;
    }
    const countBefore = adminStore.state().affiliate_records.length;
    const duplicate = await call(owner, 'POST', '/api/admin/affiliates/enroll', { account_id: owner.account_id, org_id: orgA.org_id });
    check.equal(duplicate.status, 200, 'repeated enrollment is idempotent');
    check.equal(adminStore.state().affiliate_records.length, countBefore, 'repeat enrollment does not append duplicate organization records');
    await refuse('repeat enrollment cannot reassign organization', () => call(owner, 'POST', '/api/admin/affiliates/enroll', { account_id: owner.account_id, org_id: orgB.org_id }), ['INVALID_REQUEST']);
    await refuse('repeat enrollment cannot self refer or reparent', () => call(owner, 'POST', '/api/admin/affiliates/enroll', { account_id: owner.account_id, introducer_code: duplicate.json.member.code }), ['INVALID_REQUEST']);
    const originalUpdate = adminStore.update;
    adminStore.update = function (mutate) { originalUpdate.call(this, mutate); throw Object.assign(new Error('FICTIONAL_AFTER_COMMIT_FAILURE'), { code: 'FICTIONAL_AFTER_COMMIT_FAILURE' }); };
    try { await refuse('ambiguous post-publication enrollment outcome is reported', () => call(owner, 'POST', '/api/admin/affiliates/enroll', { account_id: partnerC.account_id, org_id: orgC.org_id })); }
    finally { adminStore.update = originalUpdate; }
    check.ok(store.state().referral_snapshots[0].members.some(row => row.account_id === partnerC.account_id), 'durably committed organization enrollment never rolls back its engine member');
    check.equal((await call(owner, 'POST', '/api/admin/affiliates/enroll', { account_id: partnerC.account_id, org_id: orgC.org_id })).status, 200, 'post-publication enrollment retry reconciles safely');
    check.equal(adminStore.state().affiliate_records.filter(row => row.account_id === partnerC.account_id).length, 1, 'reconciliation never duplicates organization mappings');
    const consumer = await t.account('admin-service-consumer@example.test');
    const program = new ReferralProgram({ verifyPurchase: () => false, verifyRefund: () => false }).loadSnapshot(store.state().referral_snapshots[0]);
    program.attribute({ customer_id: consumer.account_id, referrer_code: introducer });
    program.attribute({ customer_id: partnerB.account_id, referrer_code: introducer });
    store.update(state => { state.referral_snapshots = [program.snapshot()]; });
    // Fixture-only verified ledger row. No actual provider call or purchase claim.
    const paidAt = new Date(now - 60000).toISOString();
    store.update(state => { state.checkout_sessions.push({ checkout_id: 'fictional_verified_retail', account_id: consumer.account_id, state: 'COMPLETED', verified_paid_cents: 12000,
      verified_tax_cents: 2000, verified_paid_at: paidAt, verified_payment_id: 'fictional_payment', verified_payment_intent: 'fictional_intent', currency: 'CAD', provider_id: 'fictional-ledger-only' }); });
    store.update(state => { state.checkout_sessions.push({ checkout_id: 'fictional_unverified_retail', account_id: partnerB.account_id, state: 'COMPLETED', amount_cents: 10000, tax_cents: 0,
      paid_at: paidAt, verified: true, currency: 'CAD' }); });
    await refuse('sync accepts no caller-supplied purchase authority', () => call(owner, 'POST', '/api/admin/affiliates/sync', { verified: true }), ['INVALID_REQUEST']);
    const stateBeforeGet = JSON.stringify(store.state().referral_snapshots);
    await call(owner, 'GET', '/api/admin/affiliates');
    check.equal(JSON.stringify(store.state().referral_snapshots), stateBeforeGet, 'affiliate GET never synchronizes or mutates finances');
    await injectAuditFailure(async () => {
      await refuse('audit failure refuses ledger synchronization', () => call(owner, 'POST', '/api/admin/affiliates/sync'));
      check.equal(JSON.stringify(store.state().referral_snapshots), stateBeforeGet, 'failed ledger synchronization restores the preexisting referral snapshot');
    });
    check.equal((await call(owner, 'POST', '/api/admin/affiliates/sync')).json.reward_count, 3, 'persisted verified first retail purchase creates exactly three rewards');
    check.equal(store.state().referral_snapshots[0].purchases.find(row => row.customer_id === partnerB.account_id).purchase_id, null, 'claimed completion without verified ledger fields creates no commission');
    const projection = (await call(owner, 'GET', '/api/admin/affiliates')).json;
    check.equal(projection.policy.level1_bps, 1500, 'level one uses accepted fifteen percent');
    check.equal(projection.policy.level2_bps, 1000, 'level two uses accepted ten percent');
    check.equal(projection.policy.level3_bps, 500, 'level three uses accepted five percent');
    check.equal(projection.rewards.map(row => row.amount_minor).join(','), '1500,1000,500', 'tax is excluded from all three commission bases');
    check.equal(projection.tranches.length, 6, 'held payment and reserve tranches remain separate');
    check.equal((await call(owner, 'POST', '/api/admin/affiliates/sync')).json.reward_count, 3, 'repeated synchronization cannot duplicate commissions');
    check.ok(!JSON.stringify((await call(partnerA, 'GET', '/api/admin/affiliates')).json).includes(consumer.account_id), 'affiliate organization views omit customer identity and all report data');
    check.equal((await call(partnerB, 'GET', '/api/admin/affiliates')).json.members.length, 0, 'other organization has no access to this affiliate tree');
    await refuse('partner cannot enroll or sync affiliates', () => call(partnerA, 'POST', '/api/admin/affiliates/sync'), ['NOT_AUTHORIZED']);
    await injectAuditFailure(async () => {
      await refuse('hold and audit fail together', () => call(owner, 'POST', '/api/admin/affiliates/' + staff.account_id + '/hold', { reason: 'MANUAL_REVIEW' }));
      check.ok(!adminStore.state().affiliate_records.find(row => row.account_id === staff.account_id).hold, 'failed hold does not persist');
    });
    await call(staff, 'POST', '/api/admin/affiliates/' + staff.account_id + '/hold', { reason: 'MANUAL_REVIEW' });
    check.equal((await call(owner, 'GET', '/api/admin/affiliates')).json.holds.length, 1, 'authorized manual review hold is visible');
    await call(staff, 'DELETE', '/api/admin/affiliates/' + staff.account_id + '/hold');
    store.update(state => { state.billing_events.push({ event_id: 'fictional_partial_refund', account_id: consumer.account_id, outcome: 'APPLIED', effect: 'REVOKE', payment_intent: 'fictional_intent', refunded_cents: 1000 }); });
    await call(owner, 'POST', '/api/admin/affiliates/sync');
    check.ok((await call(owner, 'GET', '/api/admin/affiliates')).json.tranches.every(row => row.status === 'REVIEW_HOLD'), 'verified partial refund holds every level for review');
    store.update(state => { state.billing_events.push({ event_id: 'fictional_full_refund', account_id: consumer.account_id, outcome: 'APPLIED', effect: 'REVOKE', payment_intent: 'fictional_intent', refunded_cents: 12000 }); });
    check.equal((await call(owner, 'POST', '/api/admin/affiliates/sync')).json.refund_count, 1, 'verified applied full refund reverses the existing purchase');
    check.ok((await call(owner, 'GET', '/api/admin/affiliates')).json.rewards.every(row => row.status === 'REFUNDED'), 'all three levels preserve refund reversals');
    check.ok(!projection.payouts_enabled, 'commission review never enables payout workers');

    const http = (method, route, body) => t.request(method, route, { token: consumer.token, body });
    const created = await http('POST', '/api/cases', { country: 'CA', region: 'CA-NS', bureau: 'EQUIFAX' });
    assert.equal(created.status, 201); const caseId = created.json.case.case_id, route = '/api/cases/' + caseId;
    const report = buildPdf({ pages: [{ lines: ['Equifax Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor: Fictional Packet Bank', 'Account Number: ****1234', 'Balance $100', 'Opened 2020-01-01', 'Closed 2019-01-01'] }] });
    assert.equal((await http('POST', route + '/files', { originalFilename: 'fictional-admin-report.pdf', declaredBytes: report.length, mimeType: 'application/pdf', contentBase64: report.toString('base64') })).status, 201);
    assert.equal((await http('POST', route + '/evaluate', {})).status, 201);
    const offered = (await http('GET', route + '/packet')).json.view;
    assert.ok(offered.eligible_issues.length);
    await http('POST', route + '/packet/select', { issue_ids: offered.eligible_issues.map(row => row.issue_id) });
    await t.preparePostalPacket(consumer, caseId);
    await refuse('unapproved packet cannot be granted', () => call(consumer, 'POST', route + '/fulfillment-grants', { org_id: orgA.org_id }), ['PACKET_NOT_APPROVED']);
    const preview = (await http('GET', route + '/packet')).json.view.packet;
    assert.equal((await http('POST', route + '/packet/approve', { approved_version: preview.preview_version })).status, 200);
    const approval = (await call(consumer, 'GET', route + '/fulfillment-grants')).json.current_approval;
    const grantBody = { org_id: orgA.org_id, approved_version: approval.approved_version, pdf_sha256: approval.pdf_sha256 };
    await refuse('cross-consumer case ownership remains enforced', () => call(owner, 'GET', route + '/fulfillment-grants'), ['NOT_FOUND', 'NOT_AUTHORIZED']);
    await refuse('grant cannot substitute different approved PDF hash', () => call(consumer, 'POST', route + '/fulfillment-grants', { ...grantBody, pdf_sha256: '0'.repeat(64) }), ['PACKET_APPROVAL_STALE']);
    await injectAuditFailure(async () => {
      await refuse('grant persistence fails closed if its audit fails', () => call(consumer, 'POST', route + '/fulfillment-grants', grantBody));
      check.equal(adminStore.state().grants.length, 0, 'audit failure cannot leave an active consumer grant');
    });
    const grant = (await call(consumer, 'POST', route + '/fulfillment-grants', grantBody)).json.grant;
    check.equal((await call(staff, 'GET', '/api/admin/fulfillment-grants?org_id=' + orgA.org_id)).json.items[0].grant_id, grant.grant_id, 'operator can select a current consumer grant by organization');
    await refuse('partner cannot enumerate consumer grant assignments', () => call(partnerA, 'GET', '/api/admin/fulfillment-grants'), ['NOT_AUTHORIZED']);
    check.equal((await call(consumer, 'POST', route + '/fulfillment-grants', grantBody)).json.grant.grant_id, grant.grant_id, 'consumer grant retry is idempotent');
    await refuse('partner cannot assign itself a fulfillment job', () => call(partnerA, 'POST', '/api/admin/fulfillment', { grant_id: grant.grant_id }), ['NOT_AUTHORIZED']);
    await injectAuditFailure(async () => {
      await refuse('queue mutation fails with its audit', () => call(owner, 'POST', '/api/admin/fulfillment', { grant_id: grant.grant_id }));
      check.equal(adminStore.state().fulfillment_queue.length, 0, 'failed queue action leaves no job');
    });
    const job = (await call(staff, 'POST', '/api/admin/fulfillment', { grant_id: grant.grant_id })).json.job;
    const retry = (await call(staff, 'POST', '/api/admin/fulfillment', { grant_id: grant.grant_id })).json.job;
    check.equal(retry.job_id, job.job_id, 'queue retries do not duplicate jobs');
    check.ok(!Object.hasOwn(job, 'account_id') && !Object.hasOwn(retry, 'account_id'), 'new and existing job projections exclude consumer account identifiers');
    const jobs = (await call(partnerA, 'GET', '/api/admin/fulfillment')).json;
    check.equal(jobs.total, 1, 'assigned organization sees its grant-bound queue');
    check.ok(jobs.items[0].access_available, 'current approval and entitlement permit packet access');
    const pdf = await call(partnerA, 'GET', '/api/admin/fulfillment/' + job.job_id + '/packet');
    check.equal(pdf.content_type, 'application/pdf', 'partner download has actual PDF media type');
    check.equal(digest(pdf.text), approval.pdf_sha256, 'partner receives only the exact consumer approved immutable PDF');
    check.ok(pdf.headers['Content-Disposition'].startsWith('attachment;') && pdf.headers['Cache-Control'] === 'no-store', 'partner packet is attachment-only and never cached');
    await refuse('cross-organization packet fetch denied', () => call(partnerB, 'GET', '/api/admin/fulfillment/' + job.job_id + '/packet'), ['NOT_AUTHORIZED']);
    check.equal((await call(partnerC, 'GET', '/api/admin/fulfillment')).json.total, 0, 'fulfillment-permitted second organization sees no other organization jobs');
    await refuse('fulfillment-permitted other partner cannot fetch a foreign PDF', () => call(partnerC, 'GET', '/api/admin/fulfillment/' + job.job_id + '/packet'), ['NOT_AUTHORIZED']);
    await refuse('fulfillment-permitted other partner cannot edit a foreign job', () => call(partnerC, 'PATCH', '/api/admin/fulfillment/' + job.job_id, { status: 'REVIEWED' }), ['NOT_AUTHORIZED']);
    await injectAuditFailure(async () => {
      await refuse('PDF access does not return bytes when audit fails', () => call(partnerA, 'GET', '/api/admin/fulfillment/' + job.job_id + '/packet'));
      await refuse('status update fails atomically with audit', () => call(partnerA, 'PATCH', '/api/admin/fulfillment/' + job.job_id, { status: 'REVIEWED' }));
      check.equal(adminStore.state().fulfillment_queue[0].status, 'QUEUED', 'failed status update is absent');
    });
    await call(partnerA, 'PATCH', '/api/admin/fulfillment/' + job.job_id, { status: 'REVIEWED' });
    await refuse('fulfillment has no sent or automatic mailing state', () => call(owner, 'PATCH', '/api/admin/fulfillment/' + job.job_id, { status: 'SENT' }), ['INVALID_REQUEST']);
    // Entitlement is rechecked on each queue projection and actual access.
    const entitlementBefore = store.state().entitlements;
    store.update(state => { state.entitlements = state.entitlements.filter(row => row.account_id !== consumer.account_id); });
    check.ok(!(await call(partnerA, 'GET', '/api/admin/fulfillment')).json.items[0].access_available, 'revoked payment entitlement disables access availability');
    check.equal((await call(staff, 'GET', '/api/admin/fulfillment-grants')).json.total, 0, 'operator grant picker excludes lost entitlements');
    await refuse('revoked payment entitlement blocks approved PDF access', () => call(partnerA, 'GET', '/api/admin/fulfillment/' + job.job_id + '/packet'), ['DOWNLOAD_NOT_ENTITLED']);
    store.update(state => { state.entitlements = entitlementBefore; });
    await injectAuditFailure(async () => {
      await refuse('revocation and its audit fail together', () => call(consumer, 'DELETE', route + '/fulfillment-grants/' + grant.grant_id));
      check.equal(adminStore.state().grants[0].status, 'ACTIVE', 'failed audited revocation does not silently change grant state');
    });
    await call(consumer, 'DELETE', route + '/fulfillment-grants/' + grant.grant_id);
    await refuse('consumer revocation blocks every subsequent packet access', () => call(partnerA, 'GET', '/api/admin/fulfillment/' + job.job_id + '/packet'), ['NOT_FOUND']);
    check.equal((await call(partnerA, 'GET', '/api/admin/fulfillment')).json.total, 0, 'revoked consumer references are hidden from the partner queue');
    const newGrant = (await call(consumer, 'POST', route + '/fulfillment-grants', grantBody)).json.grant;
    const newJob = (await call(owner, 'POST', '/api/admin/fulfillment', { grant_id: newGrant.grant_id })).json.job;
    const packetBefore = store.state().packets.find(row => row.case_id === caseId);
    store.update(state => { state.packets.find(row => row.case_id === caseId).letter_text = 'Fictional changed consumer letter.'; });
    await refuse('a later letter change invalidates granted approved PDF access', () => call(partnerA, 'GET', '/api/admin/fulfillment/' + newJob.job_id + '/packet'), ['PACKET_APPROVAL_STALE']);
    check.ok(!(await call(partnerA, 'GET', '/api/admin/fulfillment')).json.items[0].access_available, 'stale approval is visible as unavailable');
    check.equal((await call(staff, 'GET', '/api/admin/fulfillment-grants')).json.total, 0, 'operator grant picker excludes stale approvals');
    store.update(state => { const index = state.packets.findIndex(row => row.case_id === caseId); state.packets[index] = packetBefore; });
    const audit = (await call(owner, 'GET', '/api/admin/audit?q=ADMIN_FULFILLMENT_PACKET_VIEWED&page_size=1')).json;
    check.ok(audit.total >= 1 && audit.items.every(row => row.event === 'ADMIN_FULFILLMENT_PACKET_VIEWED'), 'audit search filters before pagination');
    check.equal(audit.items[0].actor_account_id, partnerA.account_id, 'audit identifies the actual account who accessed the PDF');
    check.equal(audit.items[0].actor_admin_id, partnerA.member.admin_id, 'audit identifies the actual administration principal');
    check.ok(!JSON.stringify(audit).includes(consumer.token) && !JSON.stringify(audit).includes('Fictional Packet Bank'), 'audit retains references rather than report contents or tokens');
    const accounts = (await call(staff, 'GET', '/api/admin/accounts?q=admin-service-consumer')).json;
    check.equal(accounts.total, 1, 'safe account projection supports bounded search');
    check.ok(!JSON.stringify(accounts).includes('password') && !JSON.stringify(accounts).includes(consumer.token), 'account projections omit credentials and session tokens');
    const billing = (await call(owner, 'GET', '/api/admin/billing')).json;
    check.equal(billing.money_actions_enabled, false, 'billing view cannot perform money actions');
    await call(owner, 'PATCH', '/api/admin/team/' + partnerA.member.admin_id, { status: 'DISABLED' });
    await refuse('membership disablement immediately revokes the existing unlocked partner', () => call(partnerA, 'GET', '/api/admin/fulfillment/' + newJob.job_id + '/packet'), ['NOT_AUTHORIZED']);
    check.equal((await call(owner, 'PATCH', '/api/admin/team/' + readOnlyStaff.member.admin_id, { role: 'owner' })).json.member.role, 'owner', 'fresh authorized owner can promote an eligible MFA-enrolled account');
    return { fictional_only: true, actual_service_dispatch: true, actual_admin_access: true, exact_consumer_approved_pdf: true,
      three_level_policy_preserved: true, partner_scope_isolated: true, mailing_enabled: false, payouts_enabled: false };
  } finally { if (ownsAdmin) adminStore.close(); }
}
module.exports = { run, id: 'gc-admin-service', title: 'Owner/staff/partner administration, three-level commissions and revocable exact-packet fulfillment grants' };
