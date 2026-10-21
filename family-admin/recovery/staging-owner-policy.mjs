// Explicit owner-authorized offline recovery policy. Never imported by the portal.
import { createHash, randomBytes } from 'node:crypto';
export const TARGET = 'acc_ce3d670855d98e0d8b3e9596';
export const EMAIL = 'admin@creditregulatorpro.com';
export const DATA = '/var/lib/private/crp-wizard-staging';
export const BUILD = 'crp-v1-5ab1c55ddfad7229';
export const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const refuse = code => { throw new Error(code); };
export function provision({ intent, consumer, admin, security, permissions, code, claim, now = Date.now() }) {
  if (intent.version !== 1 || intent.environment !== 'staging' || intent.dataDirectory !== DATA || intent.build !== BUILD) refuse('STAGING_SCOPE_REQUIRED');
  if (intent.accountId !== TARGET || intent.email !== EMAIL) refuse('EXACT_PERSON_REQUIRED');
  if (!/^staging-owner-[a-f0-9-]{36}$/.test(intent.operation || '') || intent.ownerAuthorization !== 'Authorize the staging-only recovery implementation') refuse('OWNER_AUTHORIZATION_REQUIRED');
  const issued = Date.parse(intent.issuedAt), expires = Date.parse(intent.expiresAt);
  if (!Number.isFinite(issued) || !Number.isFinite(expires) || issued > now || expires <= now || expires - issued > 3600000) refuse('INTENT_EXPIRED_OR_INVALID');
  const before = admin.state(), primary = consumer.state();
  if (hash(before) !== intent.adminStateHash || hash(primary) !== intent.consumerStateHash) refuse('PREDECESSOR_CHANGED');
  if (before.memberships.some(x => x.account_id === TARGET)) refuse('MEMBERSHIP_ALREADY_EXISTS');
  if (!before.bootstrapped_at || before.memberships.length !== 5 || !before.memberships.some(x => x.role === 'owner' && x.status === 'ACTIVE')) refuse('EXPECTED_EXISTING_AUTHORITY_REQUIRED');
  const matches = primary.accounts.filter(x => x.account_id === TARGET || x.email?.toLowerCase() === EMAIL);
  if (matches.length !== 1 || matches[0].account_id !== TARGET || matches[0].email?.toLowerCase() !== EMAIL) refuse('EXACT_PERSON_REQUIRED');
  const account = matches[0];
  if (!Number.isFinite(Date.parse(account.email_verified_at)) || !Number.isFinite(Date.parse(account.signup_complete_at)) || !account.two_factor_secret) refuse('VERIFIED_PERSONAL_MFA_REQUIRED');
  if (!/^\d{6}$/.test(code || '')) refuse('FRESH_MFA_REQUIRED');
  if (!Array.isArray(permissions) || !permissions.includes('team.manage') || new Set(permissions).size !== permissions.length) refuse('NATIVE_PERMISSIONS_REQUIRED');
  // Claim durably before verification/writes. Any failure consumes this operation.
  claim({operation: intent.operation, accountId: TARGET, intentHash: hash(intent), status: 'ATTEMPTED'});
  const valid = consumer.update(state => security.verifySignIn(consumer, state.accounts.find(x => x.account_id === TARGET), code));
  if (!valid) refuse('TWO_FACTOR_INVALID_OPERATION_CONSUMED');
  return admin.update(state => {
    if (hash(state) !== intent.adminStateHash) refuse('AUTHORITY_CHANGED_AFTER_MFA');
    const member = {admin_id: 'admin_' + randomBytes(12).toString('hex'), account_id: TARGET, role: 'owner', permissions: [...permissions], org_id: null, status: 'ACTIVE', revision: 1, created_at: new Date(now).toISOString()};
    state.memberships.push(member);
    // Null actor explicitly records offline operator authority; no synthetic login.
    admin.appendAudit(state, null, 'ADMIN_STAGING_OWNER_PROVISIONED', {account_id: TARGET, admin_id: member.admin_id, role: 'owner', permissions: member.permissions, operation: intent.operation, reason: 'OWNER_AUTHORIZED_STAGING_ACCESS_RECOVERY'});
    return member;
  });
}
