'use strict';
/** Administrative projections and explicitly authorized local workflow metadata.
 * No provider purchase, payout, dispatch, reassessment or consumer approval is performed here. */
const crypto = require('node:crypto');
const { ServiceError } = require('./errors.cjs');
const cases = require('./cases.cjs');
const packets = require('./packets.cjs');
const entitlement = require('./entitlement.cjs');
const accountDocuments = require('./account-documents.cjs');
const signup = require('./signup-security.cjs');
const { ReferralProgram, ReferralError, POLICY } = require('./referral-engine.cjs');
const HOLD_REASONS = Object.freeze(['MANUAL_REVIEW', 'REFUND_REVIEW', 'ACCOUNT_REVIEW']);
const JOB_STATUSES = Object.freeze(['QUEUED', 'REVIEWED', 'CANCELLED']);
const PERMISSIONS = Object.freeze(['overview.read', 'accounts.read', 'cases.read', 'billing.read', 'affiliate.read', 'affiliate.manage',
  'fulfillment.read', 'fulfillment.prepare', 'fulfillment.grants', 'audit.read', 'team.manage', 'organizations.manage']);
const id = prefix => prefix + '_' + crypto.randomBytes(12).toString('hex');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function deny() { throw new ServiceError('NOT_AUTHORIZED'); }
function invalid(reason) { throw new ServiceError('INVALID_REQUEST', { reason }); }
function token(value) { if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(value)) invalid('INVALID_REFERENCE'); return value; }
function bodyObject(body) { if (!body || typeof body !== 'object' || Array.isArray(body)) invalid('OBJECT_REQUIRED'); return body; }
function fields(body, allowed) { bodyObject(body); if (Object.keys(body).some(key => !allowed.includes(key))) invalid('UNEXPECTED_FIELD'); }
function enabled(env) { return env?.CRP_ADMIN_ENABLED === 'true' || env?.CRP_ADMIN_ENABLED === '1'; }
function iso(now) { return new Date(now || Date.now()).toISOString(); }
function partner(principal) { return principal.role === 'partner'; }
function page(items, query) {
  const read = (name, fallback) => { const raw = query.get(name); if (raw === null) return fallback; if (!/^\d+$/.test(raw)) invalid('INVALID_PAGINATION'); return Number(raw); };
  const size = read('page_size', read('limit', 25)), number = read('page', 1);
  if (!Number.isSafeInteger(size) || size < 1 || size > 100 || !Number.isSafeInteger(number) || number < 1) invalid('INVALID_PAGINATION');
  const offset = read('offset', (number - 1) * size);
  if (!Number.isSafeInteger(offset) || offset < 0) invalid('INVALID_PAGINATION');
  return { items: items.slice(offset, offset + size), total: items.length, page: Math.floor(offset / size) + 1, page_size: size, offset, limit: size };
}
function filter(items, query, keys) {
  const q = (query.get('q') || '').trim().toLowerCase();
  if (q.length > 200) invalid('SEARCH_TOO_LONG');
  return items.filter(row => (!query.get('status') || row.status === query.get('status')) && (!q || keys.some(key => String(key.split('.').reduce((value, part) => value?.[part], row) || '').toLowerCase().includes(q))));
}
function accountView(state, account) {
  return { account_id: account.account_id, email: account.email, created_at: account.created_at,
    signup_complete: !account.signup_security_required || Boolean(account.signup_complete_at),
    two_factor_enabled: Boolean(account.two_factor_secret), case_count: state.cases.filter(row => row.account_id === account.account_id).length };
}
function currentApproval(store, caseRow) {
  const view = packets.packetView(store, { account_id: caseRow.account_id }, caseRow.case_id).packet;
  const packet = store.state().packets.find(row => row.case_id === caseRow.case_id);
  return { packet_id: view.packet_id, approved_version: view.approved_version, pdf_sha256: packet?.approved_pdf_sha256 || null,
    approved: view.approved, approval_stale: view.approval_stale };
}
function caseView(store, row) {
  const state = store.state();
  return { case_id: row.case_id, account_id: row.account_id, country: row.country, region: row.region, status: row.status,
    created_at: row.created_at, updated_at: row.updated_at, file_count: state.files.filter(file => file.case_id === row.case_id).length,
    result_count: state.results.filter(result => result.case_id === row.case_id).length, packet: currentApproval(store, row) };
}
function orgView(row) { return { org_id: row.org_id, name: row.name, status: row.status }; }
function activeFulfillmentOrganization(adminStore, orgId) {
  const metadata = adminStore.state(), org = metadata.organizations.find(row => row.org_id === orgId && row.status === 'ACTIVE');
  if (!org || !metadata.memberships.some(row => row.role === 'partner' && row.status === 'ACTIVE' && row.org_id === orgId &&
    (row.permissions || []).includes('fulfillment.read'))) throw new ServiceError('NOT_FOUND');
  return org;
}
function activeGrant(adminStore, grantId, now) {
  const grant = adminStore.state().grants.find(row => row.grant_id === grantId);
  if (!grant || grant.status !== 'ACTIVE' || grant.revoked_at || (grant.expires_at && !(Date.parse(grant.expires_at) > new Date(now || Date.now()).getTime()))) throw new ServiceError('NOT_FOUND');
  activeFulfillmentOrganization(adminStore, grant.org_id);
  return grant;
}
function approvedPdf(store, grant) {
  const owner = { account_id: grant.account_id };
  signup.requireReady(store, owner);
  const owned = cases.requireOwnedCase(store, owner, grant.case_id), approval = currentApproval(store, owned);
  if (!approval.approved || approval.approval_stale || approval.packet_id !== grant.packet_id || approval.approved_version !== grant.approved_version || approval.pdf_sha256 !== grant.pdf_sha256) throw new ServiceError('PACKET_APPROVAL_STALE');
  if (!entitlement.downloadEntitled(store, owner, grant.case_id).entitled) throw new ServiceError('DOWNLOAD_NOT_ENTITLED');
  const pdf = packets.packetPrint(store, owner, grant.case_id);
  if (pdf.approved_version !== grant.approved_version || sha(pdf.body) !== grant.pdf_sha256) throw new ServiceError('PACKET_APPROVAL_STALE');
  return pdf;
}
function grantView(adminStore, grant) {
  const org = adminStore.state().organizations.find(row => row.org_id === grant.org_id);
  return { grant_id: grant.grant_id, org_id: grant.org_id, organization_name: org?.name || '', case_id: grant.case_id,
    packet_id: grant.packet_id, approved_version: grant.approved_version, pdf_sha256: grant.pdf_sha256,
    status: grant.status, created_at: grant.created_at, revoked_at: grant.revoked_at || null };
}
function currentGrantAvailable(store, adminStore, grant, now) {
  try {
    activeGrant(adminStore, grant.grant_id, now);
    const actor = { account_id: grant.account_id }; signup.requireReady(store, actor);
    const approval = currentApproval(store, cases.requireOwnedCase(store, actor, grant.case_id));
    return approval.approved && !approval.approval_stale && approval.packet_id === grant.packet_id &&
      approval.approved_version === grant.approved_version && approval.pdf_sha256 === grant.pdf_sha256 && entitlement.downloadEntitled(store, actor, grant.case_id).entitled;
  } catch { return false; }
}
function safeAudit(row) {
  const safe = {};
  if (Number.isSafeInteger(row.sequence)) safe.sequence = row.sequence;
  for (const key of ['audit_id', 'event_id', 'event', 'at', 'created_at', 'actor_admin_id', 'actor_account_id', 'actor_role', 'admin_id', 'account_id', 'org_id', 'case_id', 'grant_id', 'job_id', 'packet_id', 'status', 'reason', 'operation', 'permission']) {
    if (typeof row[key] === 'string') safe[key] = row[key];
  }
  if (row.metadata && typeof row.metadata === 'object') {
    safe.metadata = {};
    for (const key of ['org_id', 'account_id', 'case_id', 'admin_id', 'grant_id', 'job_id', 'packet_id', 'pdf_sha256', 'approved_version', 'status', 'reason', 'operation', 'permission', 'role']) {
      if (typeof row.metadata[key] === 'string') safe.metadata[key] = row.metadata[key];
    }
    if (Array.isArray(row.metadata.permissions)) safe.metadata.permissions = row.metadata.permissions.filter(value => PERMISSIONS.includes(value));
  }
  return safe;
}
function mutateAudited(adminStore, actor, event, metadata, mutate = () => {}) {
  return adminStore.update(state => { const result = mutate(state); adminStore.appendAudit(state, actor, event, metadata); return result; });
}
function reconcileReferralFailure(store, adminStore, written, before, committed) {
  // A durable admin journal publication can precede a reported storage error.
  // Preserve that completed side; an unavailable journal is an unknown outcome.
  try { if (committed(adminStore.state())) return; } catch { return; }
  if (JSON.stringify(store.state().referral_snapshots) !== JSON.stringify([written])) return;
  store.update(state => {
    if (JSON.stringify(state.referral_snapshots) === JSON.stringify([written])) state.referral_snapshots = before;
  });
}
function referralProgram(state) {
  return new ReferralProgram({ verifyPurchase: () => false, verifyRefund: () => false, verifyPayout: () => false }).loadSnapshot(state.referral_snapshots?.[0]);
}
// Explicit, internal ledger synchronization. The request cannot supply a purchase,
// verification flag, attribution or refund. Existing accepted attribution is preserved.
function syncReferrals(store, adminStore, principal, now) {
  const state = store.state(), before = state.referral_snapshots || [];
  const verifiedPurchases = new Set(), verifiedRefunds = new Set();
  const program = new ReferralProgram({ verifyPurchase: value => verifiedPurchases.has(value.purchase_id),
    verifyRefund: value => verifiedRefunds.has(value.refund_id), verifyPayout: () => false }).loadSnapshot(before[0]);
  try {
    for (const attribution of program.purchases.values()) {
      if (attribution.purchase_id !== null) continue;
      const completed = state.checkout_sessions.filter(row => row.account_id === attribution.customer_id && row.state === 'COMPLETED' &&
        Number.isSafeInteger(row.verified_paid_cents) && row.verified_paid_cents > 0 && Number.isSafeInteger(row.verified_tax_cents) &&
        row.verified_tax_cents >= 0 && row.verified_tax_cents < row.verified_paid_cents && typeof row.verified_paid_at === 'string' &&
        typeof row.verified_payment_id === 'string' && row.verified_payment_id.length > 0).sort((a, b) => a.verified_paid_at.localeCompare(b.verified_paid_at));
      const row = completed[0]; if (!row) continue;
      verifiedPurchases.add(row.checkout_id);
      program.recordPurchase({ purchase_id: row.checkout_id, customer_id: row.account_id, subtotal_minor: row.verified_paid_cents - row.verified_tax_cents,
        tax_minor: row.verified_tax_cents, total_minor: row.verified_paid_cents, currency: String(row.currency).toUpperCase(), paid_at: row.verified_paid_at,
        kind: 'FIRST_PURCHASE' }, new Date(now || Date.now()));
    }
    for (const row of state.checkout_sessions) {
      if (program.purchases.get(row.account_id)?.purchase_id !== row.checkout_id) continue;
      const reversals = state.billing_events.filter(event => event.outcome === 'APPLIED' && event.effect === 'REVOKE' && event.account_id === row.account_id &&
        ((event.payment_intent && event.payment_intent === row.verified_payment_intent) ||
          (row.provider_id === 'test-adapter-not-a-payment' && event.session_reference === row.provider_reference)));
      if (reversals.some(event => !Number.isSafeInteger(event.refunded_cents) || (event.refunded_cents > 0 && event.refunded_cents < row.verified_paid_cents))) program.holdForPartialRefund(row.checkout_id);
      const refund = reversals.find(event => Number.isSafeInteger(event.refunded_cents) && event.refunded_cents >= row.verified_paid_cents);
      if (refund && !program.refunds.has(refund.event_id)) { verifiedRefunds.add(refund.event_id); program.recordRefund({ refund_id: refund.event_id, purchase_id: row.checkout_id, full_refund: true }); }
    }
  } catch (error) { if (error instanceof ReferralError) invalid(error.code); throw error; }
  const snapshot = program.snapshot();
  if (JSON.stringify(before[0]) !== JSON.stringify(snapshot)) {
    const auditCount = adminStore.state().audit_events.length;
    store.update(live => { live.referral_snapshots = [snapshot]; });
    try { mutateAudited(adminStore, principal, 'ADMIN_AFFILIATE_LEDGER_SYNCED', { operation: 'VERIFIED_LEDGER_SYNC' }); }
    catch (error) { reconcileReferralFailure(store, adminStore, snapshot, before, metadata => metadata.audit_events.slice(auditCount).some(row => row.event === 'ADMIN_AFFILIATE_LEDGER_SYNCED' && row.actor_admin_id === principal.admin_id)); throw error; }
  }
  return { synced: true, reward_count: program.rewards.size, refund_count: program.refunds.size, payouts_enabled: false };
}
function affiliateView(store, adminStore, principal, query) {
  const program = referralProgram(store.state()), records = adminStore.state().affiliate_records || [];
  const selectedOrg = partner(principal) ? principal.org_id : query.get('org_id');
  const visible = member => !selectedOrg || records.some(row => row.account_id === member.account_id && row.org_id === selectedOrg);
  const members = [...program.members.values()].filter(visible).map(member => {
    const record = records.find(row => row.account_id === member.account_id);
    return { account_id: member.account_id, code: member.code, introduced_by: member.introduced_by,
      org_id: record?.org_id || null, status: record?.status || 'ACTIVE', held: Boolean(record?.hold) };
  });
  const allowed = new Set(members.map(row => row.account_id));
  if (partner(principal)) for (const member of members) if (!allowed.has(member.introduced_by)) member.introduced_by = null;
  const rewards = [...program.rewards.values()].filter(row => allowed.has(row.referrer_id)).map(row => ({
    reward_id: row.reward_id, referrer_id: row.referrer_id, level: row.level, rate_bps: row.rate_bps,
    amount_minor: row.amount_minor, payout_minor: row.payout_minor, reserve_minor: row.reserve_minor, currency: row.currency, status: row.status }));
  const tranches = [...program.tranches.values()].filter(row => allowed.has(row.referrer_id)).map(row => ({
    tranche_id: row.tranche_id, reward_id: row.reward_id, referrer_id: row.referrer_id, level: row.level,
    kind: row.kind, amount_minor: row.amount_minor, currency: row.currency, due_at: row.due_at, status: row.status }));
  const holds = records.filter(row => allowed.has(row.account_id) && row.hold).map(row => ({ account_id: row.account_id, org_id: row.org_id,
    reason: row.hold.reason, held_at: row.hold.at }));
  return { policy: POLICY, members, rewards, tranches, holds, hold_reasons: HOLD_REASONS, level_count: 3,
    payouts_enabled: false, scope: 'First verified retail purchase only; no recruitment or renewal rewards' };
}
function jobView(row) {
  return Object.fromEntries(['job_id', 'grant_id', 'org_id', 'case_id', 'packet_id', 'approved_version', 'pdf_sha256', 'status', 'created_at', 'updated_at'].map(key => [key, row[key]]));
}
function fulfillmentView(store, adminStore, principal, query, now) {
  const jobs = adminStore.state().fulfillment_queue.filter(row => {
    if (!partner(principal)) return true;
    if (row.org_id !== principal.org_id) return false;
    try { return activeGrant(adminStore, row.grant_id, now).org_id === principal.org_id; } catch { return false; }
  }).map(row => {
    let available = false;
    try {
      const grant = activeGrant(adminStore, row.grant_id, now), owned = cases.requireOwnedCase(store, { account_id: grant.account_id }, grant.case_id);
      const approval = currentApproval(store, owned);
      signup.requireReady(store, { account_id: grant.account_id });
      available = row.status !== 'CANCELLED' && grant.org_id === row.org_id && grant.account_id === row.account_id && grant.case_id === row.case_id &&
        approval.approved && !approval.approval_stale && approval.packet_id === row.packet_id && approval.approved_version === row.approved_version &&
        approval.pdf_sha256 === row.pdf_sha256 && entitlement.downloadEntitled(store, { account_id: grant.account_id }, grant.case_id).entitled;
    } catch {}
    return { ...jobView(row),
      access_available: Boolean(available), packet_url: available ? '/api/admin/fulfillment/' + row.job_id + '/packet' : null };
  });
  return { ...page(filter(jobs, query, ['job_id', 'case_id', 'status']), query), mailing_enabled: false, status_options: JOB_STATUSES };
}
function overview(store, adminStore, principal, query) {
  const state = store.state(), metadata = adminStore.state();
  const permissions = new Set(principal.permissions), counts = {};
  if (partner(principal)) {
    if (permissions.has('affiliate.read')) counts.affiliate_members = metadata.affiliate_records.filter(row => row.org_id === principal.org_id).length;
    if (permissions.has('fulfillment.read')) counts.fulfillment_jobs = metadata.fulfillment_queue.filter(row => row.org_id === principal.org_id).length;
    return { counts, operations: { payouts_enabled: false, mailing_enabled: false } };
  }
  if (permissions.has('accounts.read')) counts.accounts = state.accounts.length;
  if (permissions.has('cases.read')) {
    const ownedCases = new Map(state.cases.map(row => [row.case_id, row.account_id]));
    counts.cases = state.cases.length;
    // Report uploads have no document purpose and belong to a case. Supporting
    // documents use ACCOUNT_SUPPORT; neither they nor orphan rows are reports.
    counts.reports = state.files.filter(row => row.purpose !== accountDocuments.PURPOSE && row.purpose == null &&
      typeof row.case_id === 'string' && ownedCases.has(row.case_id) && ownedCases.get(row.case_id) === row.account_id).length;
    counts.results = state.results.length;
    counts.approved_packets = state.packets.filter(row => row.approved_version).length;
  }
  if (permissions.has('affiliate.read')) counts.affiliate_members = state.referral_snapshots?.[0]?.members?.length || 0;
  if (permissions.has('fulfillment.read')) counts.fulfillment_jobs = metadata.fulfillment_queue.length;
  return { counts, operations: { payouts_enabled: false, mailing_enabled: false }, generated_at: iso() };
}
function guard(access, adminStore, principal, permission, query, scope = {}) {
  const org = scope.org_id || query.get('org_id') || (partner(principal) ? principal.org_id : undefined);
  if (partner(principal) && query.get('org_id') && query.get('org_id') !== principal.org_id) deny();
  return access.requireCapability(adminStore, principal, permission, { ...scope, ...(org ? { org_id: org } : {}) });
}
async function dispatchAdmin(options) {
  const { store, adminStore, actor, method, pathname, sessionToken, adminToken, req, env = process.env } = options;
  if (!enabled(env) || !adminStore) throw new ServiceError('NOT_FOUND');
  const access = options.access || require('./admin-access.cjs'), body = options.body || {}, now = options.now;
  const query = new URL(req?.url || pathname, 'http://127.0.0.1').searchParams;
  const response = (value, status = 200) => ({ status, json: { ok: true, ...value } });
  const matchGrant = /^\/api\/cases\/([A-Za-z0-9_-]+)\/fulfillment-grants(?:\/([A-Za-z0-9_-]+))?$/.exec(pathname);
  const matchOrg = /^\/api\/fulfillment-organizations\/([A-Za-z0-9_-]+)$/.exec(pathname);
  if (matchGrant || matchOrg) {
    signup.requireReady(store, actor);
    if (matchOrg && method === 'GET') return response({ organization: orgView(activeFulfillmentOrganization(adminStore, matchOrg[1])) });
    if (!matchGrant) return null;
    const caseId = matchGrant[1], grantId = matchGrant[2], owned = cases.requireOwnedCase(store, actor, caseId);
    if (method === 'GET' && !grantId) return response({ items: adminStore.state().grants.filter(row => row.account_id === actor.account_id && row.case_id === caseId).map(row => grantView(adminStore, row)), current_approval: currentApproval(store, owned) });
    if (method === 'POST' && !grantId) {
      fields(body, ['org_id', 'approved_version', 'pdf_sha256']);
      const org = activeFulfillmentOrganization(adminStore, token(body.org_id)), approval = currentApproval(store, owned);
      if (!approval.approved || approval.approval_stale) throw new ServiceError('PACKET_NOT_APPROVED');
      if (body.approved_version !== approval.approved_version || body.pdf_sha256 !== approval.pdf_sha256) throw new ServiceError('PACKET_APPROVAL_STALE');
      const grant = { grant_id: id('grant'), account_id: actor.account_id, case_id: caseId, org_id: org.org_id, packet_id: approval.packet_id,
        approved_version: approval.approved_version, pdf_sha256: approval.pdf_sha256, status: 'ACTIVE', created_at: iso(now) };
      approvedPdf(store, grant);
      const existing = adminStore.state().grants.find(row => row.account_id === actor.account_id && row.case_id === caseId && row.org_id === org.org_id && row.approved_version === grant.approved_version && row.pdf_sha256 === grant.pdf_sha256 && currentGrantAvailable(store, adminStore, row, now));
      if (existing) return response({ grant: grantView(adminStore, existing) });
      mutateAudited(adminStore, actor, 'ADMIN_CONSUMER_FULFILLMENT_GRANTED', { grant_id: grant.grant_id, account_id: actor.account_id, case_id: caseId, org_id: org.org_id, approved_version: grant.approved_version, pdf_sha256: grant.pdf_sha256 }, state => { state.grants.push(grant); });
      return response({ grant: grantView(adminStore, grant) }, 201);
    }
    if (method === 'DELETE' && grantId) {
      const grant = adminStore.state().grants.find(row => row.grant_id === grantId && row.account_id === actor.account_id && row.case_id === caseId);
      if (!grant) throw new ServiceError('NOT_FOUND');
      fields(body, []);
      mutateAudited(adminStore, actor, 'ADMIN_CONSUMER_FULFILLMENT_REVOKED', { grant_id: grantId, account_id: actor.account_id, case_id: caseId, org_id: grant.org_id }, state => { const live = state.grants.find(row => row.grant_id === grantId); live.status = 'REVOKED'; live.revoked_at = iso(now); });
      return response({ grant: grantView(adminStore, adminStore.state().grants.find(row => row.grant_id === grantId)) });
    }
    return null;
  }
  if (!pathname.startsWith('/api/admin/')) return null;
  if (pathname === '/api/admin/unlock' && method === 'POST') { fields(body, ['code']); return response(access.unlock(adminStore, actor, sessionToken, body)); }
  if (pathname === '/api/admin/lock' && method === 'POST') { fields(body, []); return response(access.lock(adminStore, actor, sessionToken, adminToken)); }
  const principal = access.principal(adminStore, actor, sessionToken, adminToken);
  if (pathname === '/api/admin/session' && method === 'GET') {
    const org = adminStore.state().organizations.find(row => row.org_id === principal.org_id);
    const session = { ...principal, organization: org ? orgView(org) : null };
    return response({ session, principal: session });
  }
  if (pathname === '/api/admin/overview' && method === 'GET') { guard(access, adminStore, principal, 'overview.read', query); return response({ overview: overview(store, adminStore, principal, query) }); }
  if (pathname === '/api/admin/accounts' && method === 'GET') {
    guard(access, adminStore, principal, 'accounts.read', query);
    const state = store.state(); return response(page(filter(state.accounts.map(row => accountView(state, row)), query, ['account_id', 'email']), query));
  }
  if (pathname === '/api/admin/cases' && method === 'GET') {
    guard(access, adminStore, principal, 'cases.read', query);
    return response(page(filter(store.state().cases.map(row => caseView(store, row)), query, ['case_id', 'account_id', 'country', 'region', 'status']), query));
  }
  if (pathname === '/api/admin/billing' && method === 'GET') {
    guard(access, adminStore, principal, 'billing.read', query);
    const state = store.state(), amounts = new Map();
    const items = state.checkout_sessions.map(row => ({ checkout_id: row.checkout_id, account_id: row.account_id, plan_code: row.plan_code,
      currency: row.currency, status: row.state, created_at: row.created_at, paid_at: row.verified_paid_at || null,
      verified_paid_minor: Number.isSafeInteger(row.verified_paid_cents) ? row.verified_paid_cents : null,
      entitlement: entitlement.statusFor(store, row.account_id, { now }) }));
    for (const row of items) if (row.status === 'COMPLETED' && row.verified_paid_minor !== null) { const key = String(row.currency || '').toUpperCase(), current = amounts.get(key) || { currency: key, purchase_count: 0, verified_paid_minor: 0 }; current.purchase_count++; current.verified_paid_minor += row.verified_paid_minor; amounts.set(key, current); }
    return response({ ...page(filter(items, query, ['checkout_id', 'account_id', 'plan_code', 'status']), query), totals: [...amounts.values()], money_actions_enabled: false });
  }
  if (pathname === '/api/admin/organizations') {
    guard(access, adminStore, principal, 'organizations.manage', query);
    if (method === 'GET') return response(page(filter(adminStore.state().organizations.map(orgView), query, ['org_id', 'name', 'status']), query));
    if (method === 'POST') { fields(body, ['name', 'status']); return response({ organization: access.createOrganization(adminStore, principal, body) }, 201); }
  }
  const organizationMatch = /^\/api\/admin\/organizations\/([A-Za-z0-9_-]+)$/.exec(pathname);
  if (organizationMatch && method === 'PATCH') { fields(body, ['name', 'status']); return response({ organization: access.updateOrganization(adminStore, principal, organizationMatch[1], body) }); }
  if (pathname === '/api/admin/team') {
    guard(access, adminStore, principal, 'team.manage', query);
    if (method === 'GET') return response(page(filter(adminStore.state().memberships.map(row => ({ admin_id: row.admin_id, account_id: row.account_id,
      email: store.state().accounts.find(account => account.account_id === row.account_id)?.email || '', role: row.role,
      permissions: row.permissions, org_id: row.org_id, status: row.status, revision: row.revision })), query, ['admin_id', 'account_id', 'email', 'role', 'status']), query));
    if (method === 'POST') { fields(body, ['account_id', 'role', 'permissions', 'org_id']); return response({ member: access.createMembership(adminStore, principal, body) }, 201); }
  }
  const teamMatch = /^\/api\/admin\/team\/([A-Za-z0-9_-]+)$/.exec(pathname);
  if (teamMatch && method === 'PATCH') { fields(body, ['role', 'permissions', 'org_id', 'status']); return response({ member: access.updateMembership(adminStore, principal, teamMatch[1], body) }); }
  if (pathname === '/api/admin/affiliates' && method === 'GET') { guard(access, adminStore, principal, 'affiliate.read', query); return response(affiliateView(store, adminStore, principal, query)); }
  if (pathname === '/api/admin/affiliates/sync' && method === 'POST') { fields(body, []); guard(access, adminStore, principal, 'affiliate.manage', query); return response(syncReferrals(store, adminStore, principal, now)); }
  if (pathname === '/api/admin/affiliates/enroll' && method === 'POST') {
    fields(body, ['account_id', 'introducer_code', 'org_id']); guard(access, adminStore, principal, 'affiliate.manage', query, { org_id: body.org_id });
    const accountId = token(body.account_id); if (!store.state().accounts.some(row => row.account_id === accountId)) throw new ServiceError('NOT_FOUND');
    if (body.org_id && !adminStore.state().organizations.some(row => row.org_id === token(body.org_id) && row.status === 'ACTIVE')) throw new ServiceError('NOT_FOUND');
    const before = store.state().referral_snapshots || [], program = referralProgram(store.state());
    const introducer = body.introducer_code ? [...program.members.values()].find(row => row.code === body.introducer_code)?.account_id : null;
    if (body.introducer_code && !introducer) invalid('INTRODUCER_UNKNOWN');
    let member = program.members.get(accountId);
    const record = adminStore.state().affiliate_records.find(row => row.account_id === accountId);
    if (member && body.introducer_code && member.introduced_by !== introducer) invalid('AFFILIATE_REPARENTING_FORBIDDEN');
    if (record && body.org_id && record.org_id !== body.org_id) invalid('AFFILIATE_ORGANIZATION_REASSIGNMENT_FORBIDDEN');
    if (member && record) return response({ member: { ...member, org_id: record.org_id, status: record.status, held: Boolean(record.hold) }, policy: POLICY, payouts_enabled: false });
    const newMember = !member;
    if (newMember) try { member = program.enroll({ account_id: accountId, introduced_by: introducer }); } catch (error) { if (error instanceof ReferralError) invalid(error.code); throw error; }
    const snapshot = program.snapshot(), orgId = record?.org_id || body.org_id || null;
    store.update(state => { state.referral_snapshots = [snapshot]; });
    try { mutateAudited(adminStore, principal, 'ADMIN_AFFILIATE_ENROLLED', { account_id: accountId, org_id: orgId }, state => {
      if (!state.affiliate_records.some(row => row.account_id === accountId)) state.affiliate_records.push({ account_id: accountId, org_id: orgId, status: 'ACTIVE', created_at: iso(now) });
    }); }
    catch (error) { reconcileReferralFailure(store, adminStore, snapshot, before, metadata => metadata.affiliate_records.some(row => row.account_id === accountId && row.org_id === orgId)); throw error; }
    return response({ member: { ...member, org_id: orgId, status: record?.status || 'ACTIVE', held: Boolean(record?.hold) }, policy: POLICY, payouts_enabled: false }, 201);
  }
  const holdMatch = /^\/api\/admin\/affiliates\/([A-Za-z0-9_-]+)\/hold$/.exec(pathname);
  if (holdMatch && ['POST', 'DELETE'].includes(method)) {
    guard(access, adminStore, principal, 'affiliate.manage', query);
    if (!referralProgram(store.state()).members.has(holdMatch[1])) throw new ServiceError('NOT_FOUND');
    if (method === 'POST') { fields(body, ['reason']); if (!HOLD_REASONS.includes(body.reason)) invalid('UNKNOWN_HOLD_REASON'); }
    if (method === 'DELETE') fields(body, []);
    mutateAudited(adminStore, principal, method === 'POST' ? 'ADMIN_AFFILIATE_HELD' : 'ADMIN_AFFILIATE_HOLD_CLEARED', { account_id: holdMatch[1], reason: body.reason || 'MANUAL_REVIEW' }, state => { let record = state.affiliate_records.find(row => row.account_id === holdMatch[1]); if (!record) { record = { account_id: holdMatch[1], org_id: null, status: 'ACTIVE' }; state.affiliate_records.push(record); }
      if (method === 'POST') record.hold = { reason: body.reason, at: iso(now), by: principal.admin_id }; else delete record.hold; });
    return response({ account_id: holdMatch[1], held: method === 'POST', payouts_enabled: false });
  }
  if (pathname === '/api/admin/fulfillment' && method === 'GET') { guard(access, adminStore, principal, 'fulfillment.read', query); return response(fulfillmentView(store, adminStore, principal, query, now)); }
  if (pathname === '/api/admin/fulfillment-grants' && method === 'GET') {
    guard(access, adminStore, principal, 'fulfillment.grants', query);
    const items = adminStore.state().grants.filter(grant => (!query.get('org_id') || query.get('org_id') === grant.org_id) && currentGrantAvailable(store, adminStore, grant, now)).map(grant => grantView(adminStore, grant));
    return response(page(filter(items, query, ['grant_id', 'org_id', 'case_id', 'organization_name', 'status']), query));
  }
  if (pathname === '/api/admin/fulfillment' && method === 'POST') {
    fields(body, ['grant_id']); const grant = activeGrant(adminStore, token(body.grant_id), now);
    guard(access, adminStore, principal, 'fulfillment.grants', query, grant); approvedPdf(store, grant);
    const existing = adminStore.state().fulfillment_queue.find(row => row.grant_id === grant.grant_id && row.status !== 'CANCELLED');
    if (existing) return response({ job: jobView(existing), mailing_enabled: false });
    const job = { job_id: id('job'), grant_id: grant.grant_id, org_id: grant.org_id, account_id: grant.account_id, case_id: grant.case_id,
      packet_id: grant.packet_id, approved_version: grant.approved_version, pdf_sha256: grant.pdf_sha256, status: 'QUEUED', created_at: iso(now), updated_at: iso(now) };
    mutateAudited(adminStore, principal, 'ADMIN_FULFILLMENT_QUEUED', { job_id: job.job_id, grant_id: grant.grant_id, org_id: grant.org_id, case_id: grant.case_id }, state => { state.fulfillment_queue.push(job); });
    return response({ job: jobView(job), mailing_enabled: false }, 201);
  }
  const jobMatch = /^\/api\/admin\/fulfillment\/([A-Za-z0-9_-]+)(\/packet)?$/.exec(pathname);
  if (jobMatch && ((method === 'GET' && jobMatch[2]) || (method === 'PATCH' && !jobMatch[2]))) {
    const job = adminStore.state().fulfillment_queue.find(row => row.job_id === jobMatch[1]); if (!job || job.status === 'CANCELLED') throw new ServiceError('NOT_FOUND');
    const grant = activeGrant(adminStore, job.grant_id, now); guard(access, adminStore, principal, method === 'GET' ? 'fulfillment.read' : 'fulfillment.prepare', query, grant);
    if (job.org_id !== grant.org_id || job.account_id !== grant.account_id || job.case_id !== grant.case_id || job.packet_id !== grant.packet_id || job.approved_version !== grant.approved_version || job.pdf_sha256 !== grant.pdf_sha256) throw new ServiceError('PACKET_APPROVAL_STALE');
    const pdf = approvedPdf(store, grant);
    if (method === 'GET') { mutateAudited(adminStore, principal, 'ADMIN_FULFILLMENT_PACKET_VIEWED', { job_id: job.job_id, grant_id: grant.grant_id, org_id: grant.org_id, case_id: grant.case_id });
      return { status: 200, text: pdf.body, content_type: 'application/pdf', headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="CRP-approved-packet-' + job.job_id + '.pdf"', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } }; }
    fields(body, ['status']); if (!['REVIEWED', 'CANCELLED'].includes(body.status)) invalid('UNKNOWN_FULFILLMENT_STATUS');
    mutateAudited(adminStore, principal, 'ADMIN_FULFILLMENT_STATUS_RECORDED', { job_id: job.job_id, org_id: job.org_id, status: body.status }, state => { const live = state.fulfillment_queue.find(row => row.job_id === job.job_id); live.status = body.status; live.updated_at = iso(now); });
    return response({ job: { job_id: job.job_id, status: body.status }, mailing_enabled: false });
  }
  if (pathname === '/api/admin/audit' && method === 'GET') { guard(access, adminStore, principal, 'audit.read', query); return response(page(filter(adminStore.state().audit_events.slice().reverse().map(safeAudit), query, ['event', 'actor_admin_id', 'actor_account_id', 'actor_role', 'metadata.case_id', 'metadata.org_id', 'metadata.job_id', 'metadata.role', 'metadata.permission']), query)); }
  if (pathname === '/api/admin/settings' && method === 'GET') { return response({ settings: { available_permissions: PERMISSIONS, role_options: ['owner', 'staff', 'partner'], status_options: ['ACTIVE', 'DISABLED'], hold_reasons: HOLD_REASONS, payouts_enabled: false, mailing_enabled: false, consumer_approval_required: true } }); }
  return null;
}
module.exports = { dispatchAdmin, PERMISSIONS, HOLD_REASONS, JOB_STATUSES, currentApproval, activeGrant, approvedPdf };
