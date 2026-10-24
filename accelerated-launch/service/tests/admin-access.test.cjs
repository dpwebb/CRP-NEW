'use strict';
// Fictional temporary stores only; no service, provider, hosted actions or report data.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const {spawnSync} = require('node:child_process');
const {performance} = require('node:perf_hooks');
const {PrivateStore} = require('../private-store.cjs');
const {AdminStore, openAdminStore} = require('../admin-store.cjs');
const access = require('../admin-access.cjs'), accounts = require('../accounts.cjs'), security = require('../signup-security.cjs');
const PASSWORD = 'Fictional-Admin-Test-Password-109';
async function run(onCheck) {
  let passed = 0, clock = Math.floor(Date.now() / 30000) * 30000 + 2000;
  const realNow = Date.now, directories = [], stores = [];
  Date.now = () => clock;
  const check = (name, fn) => {try {fn();} catch (error) {onCheck?.(false, name, error); throw error;} passed++; onCheck?.(true, name); process.stdout.write('PASS ' + name + '\n');};
  const refuses = (fn, code) => assert.throws(fn, e => e.code === code);
  const directory = () => {const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'crp-admin-access-')); directories.push(dir); return dir;};
  const open = (dir, consumerStore) => {const s = new AdminStore(dir, {consumerStore}); stores.push(s); return s;};
  const consumer = new PrivateStore(directory());
  function user(name, ready = true, target = consumer) {
    const created = accounts.createAccount(target, {email: name + '@example.invalid', password: PASSWORD}, {requireSignupSecurity: true});
    const actor = created.account;
    if (!ready) return {actor, token: created.token};
    const {secret} = security.beginTwoFactor(target, actor, {password: PASSWORD});
    security.confirmTwoFactor(target, actor, {code: security.totp(secret, clock - 30000)});
    target.update(state => {const a = state.accounts.find(a => a.account_id === actor.account_id); a.email_verified_at = new Date().toISOString(); a.recovery_key_saved_at = new Date().toISOString(); a.signup_complete_at = new Date().toISOString();});
    return {actor, token: created.token, secret};
  }
  function unlock(user, store) {
    clock += 30000;
    const result = access.unlock(store, user.actor, user.token, {code: security.totp(user.secret, clock)});
    return {token: result.admin_token, principal: access.principal(store, user.actor, user.token, result.admin_token)};
  }
  try {
    check('feature-off does not create admin storage', () => {
      assert.equal(openAdminStore({consumerStore: consumer}), null);
      assert.equal(openAdminStore({consumerStore: consumer, enabled: 'true'}), null);
      assert.equal(fs.existsSync(path.join(consumer.dataDir, 'admin')), false);
    });
    const owner = user('owner'), staff = user('staff'), partner = user('partner'), second = user('second-owner'), unfinished = user('unfinished', false);
    const admin = open(consumer.dataDir, consumer);
    check('initial owner requires verified email, completed signup and enrolled MFA', () => refuses(() => access.bootstrapOwner(admin, {account_id: unfinished.actor.account_id, code: '000000'}), 'ADMIN_SECURITY_REQUIRED'));
    check('offline bootstrap requires real fresh OTP and only initializes once', () => {
      refuses(() => access.bootstrapOwner(admin, {account_id: owner.actor.account_id}), 'TWO_FACTOR_REQUIRED');
      const record = access.bootstrapOwner(admin, {account_id: owner.actor.account_id, code: security.totp(owner.secret, clock)});
      assert.equal(record.role, 'owner'); assert.deepEqual(record.permissions, access.PERMISSIONS);
      refuses(() => access.bootstrapOwner(admin, {account_id: second.actor.account_id, code: security.totp(second.secret, clock)}), 'NOT_AUTHORIZED');
    });
    check('pre-enrollment consumer session does not count as admin MFA proof', () => refuses(() => access.principal(admin, owner.actor, owner.token), 'TWO_FACTOR_REQUIRED'));
    check('owner routing verifies the current session without consuming MFA or unlocking administration', () => {
      const beforeAdmin = JSON.stringify(admin.state()), beforeConsumer = JSON.stringify(consumer.state());
      assert.equal(access.ownerSignInPath(admin, owner.actor, owner.token), '/admin');
      assert.equal(access.ownerSignInPath(admin, owner.actor, staff.token), null);
      assert.equal(access.ownerSignInPath(admin, owner.actor, 'forged-session'), null);
      assert.equal(access.ownerSignInPath(null, owner.actor, owner.token), null);
      assert.equal(JSON.stringify(admin.state()), beforeAdmin); assert.equal(JSON.stringify(consumer.state()), beforeConsumer);
      refuses(() => access.principal(admin, owner.actor, owner.token), 'TWO_FACTOR_REQUIRED');
    });
    check('owner routing suppresses ineligible, expired, ambiguous and unavailable authority', () => {
      const state = consumer.state(), account = state.accounts.find(row => row.account_id === owner.actor.account_id), session = state.sessions.find(row => row.token_sha256 === accounts.tokenDigest(owner.token));
      for (const key of ['email_verified_at', 'signup_complete_at', 'two_factor_secret']) {
        consumer.update(next => { next.accounts.find(row => row.account_id === owner.actor.account_id)[key] = null; });
        assert.equal(access.ownerSignInPath(admin, owner.actor, owner.token), null);
        consumer.update(next => { next.accounts.find(row => row.account_id === owner.actor.account_id)[key] = account[key]; });
      }
      consumer.update(next => { next.sessions.find(row => row.session_id === session.session_id).idle_expires_at = new Date(clock - 1).toISOString(); });
      assert.equal(access.ownerSignInPath(admin, owner.actor, owner.token), null);
      consumer.update(next => { Object.assign(next.sessions.find(row => row.session_id === session.session_id), session); });
      const unavailable = { consumerStore: consumer, state() { throw new Error('unavailable signed admin state'); } };
      assert.equal(access.ownerSignInPath(unavailable, owner.actor, owner.token), null);
      const ambiguous = { consumerStore: consumer, state() { const current = admin.state(); current.memberships.push({...current.memberships[0], admin_id: 'duplicate-owner'}); return current; } };
      assert.equal(access.ownerSignInPath(ambiguous, owner.actor, owner.token), null);
      assert.equal(access.ownerSignInPath(admin, owner.actor, owner.token), '/admin');
    });
    let ownerAccess = unlock(owner, admin);
    check('unlock is bound to one consumer session and refuses OTP replay', () => {
      const other = accounts.signIn(consumer, {email: owner.actor.email, password: PASSWORD, code: security.totp(owner.secret, clock + 30000)});
      refuses(() => access.principal(admin, owner.actor, other.token, ownerAccess.token), 'TWO_FACTOR_REQUIRED');
      refuses(() => access.unlock(admin, owner.actor, owner.token, {code: security.totp(owner.secret, clock)}), 'TWO_FACTOR_INVALID');
      assert.equal(access.requireCapability(admin, ownerAccess.principal, 'team.manage').role, 'owner');
    });
    check('fabricated principals have no capabilities', () => refuses(() => access.requireCapability(admin, {...ownerAccess.principal}, 'team.manage'), 'NOT_AUTHORIZED'));
    const organization = access.createOrganization(admin, ownerAccess.principal, {name: 'Fictional delivery partner'});
    const foreignOrganization = access.createOrganization(admin, ownerAccess.principal, {name: 'Fictional other partner'});
    check('organization creation honors disabled status and rejects invalid status', () => {
      const disabled = access.createOrganization(admin, ownerAccess.principal, {name: 'Disabled fictional partner', status: 'DISABLED'});
      assert.equal(disabled.status, 'DISABLED');
      refuses(() => access.createOrganization(admin, ownerAccess.principal, {name: 'Invalid partner', status: 'DELETED'}), 'INVALID_REQUEST');
    });
    let staffMember, partnerMember;
    check('owner assigns explicit staff and partner capabilities', () => {
      staffMember = access.createMembership(admin, ownerAccess.principal, {account_id: staff.actor.account_id, role: 'staff', permissions: ['overview.read', 'accounts.read']});
      partnerMember = access.createMembership(admin, ownerAccess.principal, {account_id: partner.actor.account_id, role: 'partner', permissions: ['overview.read', 'fulfillment.read', 'fulfillment.prepare'], org_id: organization.org_id});
      refuses(() => access.createMembership(admin, ownerAccess.principal, {account_id: unfinished.actor.account_id, role: 'staff', permissions: []}), 'ADMIN_SECURITY_REQUIRED');
      refuses(() => access.updateMembership(admin, ownerAccess.principal, staffMember.admin_id, {permissions: ['team.manage']}), 'INVALID_REQUEST');
      refuses(() => access.updateMembership(admin, ownerAccess.principal, partnerMember.admin_id, {permissions: ['accounts.read']}), 'INVALID_REQUEST');
      const audit = admin.state().audit_events.at(-1); assert.equal(audit.metadata.role, 'partner'); assert.deepEqual(audit.metadata.permissions, partnerMember.permissions);
    });
    let staffAccess = unlock(staff, admin), partnerAccess = unlock(partner, admin);
    check('staff, partner and ordinary consumer memberships do not select the owner destination', () => {
      for (const user of [staff, partner, second, unfinished]) assert.equal(access.ownerSignInPath(admin, user.actor, user.token), null);
    });
    check('staff cannot grant owners or manage organizations', () => {
      assert.equal(access.requireCapability(admin, staffAccess.principal, 'accounts.read').role, 'staff');
      refuses(() => access.createMembership(admin, staffAccess.principal, {account_id: second.actor.account_id, role: 'owner'}), 'NOT_AUTHORIZED');
      refuses(() => access.createOrganization(admin, staffAccess.principal, {name: 'Escalation'}), 'NOT_AUTHORIZED');
      refuses(() => access.requireCapability(admin, staffAccess.principal, 'billing.read'), 'NOT_AUTHORIZED');
    });
    check('partner requires own organization scope on every action', () => {
      refuses(() => access.requireCapability(admin, partnerAccess.principal, 'fulfillment.read'), 'NOT_AUTHORIZED');
      refuses(() => access.requireCapability(admin, partnerAccess.principal, 'fulfillment.read', {org_id: foreignOrganization.org_id}), 'NOT_AUTHORIZED');
      assert.equal(access.requireCapability(admin, partnerAccess.principal, 'fulfillment.read', {org_id: organization.org_id}).org_id, organization.org_id);
      refuses(() => access.requireCapability(admin, partnerAccess.principal, 'accounts.read', {org_id: organization.org_id}), 'NOT_AUTHORIZED');
    });
    const scope = {org_id: organization.org_id, account_id: 'fictional-consumer', case_id: 'fictional-case'};
    check('partner consumer access requires an active scoped grant', () => {
      refuses(() => access.requireCapability(admin, partnerAccess.principal, 'fulfillment.read', scope), 'NOT_AUTHORIZED');
      admin.update(state => {state.grants.push({grant_id: 'fictional-grant', ...scope, status: 'ACTIVE'}); admin.appendAudit(state, ownerAccess.principal, 'ADMIN_GRANT_CREATED', {grant_id: 'fictional-grant'});});
      access.requireCapability(admin, partnerAccess.principal, 'fulfillment.read', scope);
      admin.update(state => {state.grants[0].revoked_at = new Date().toISOString();});
      refuses(() => access.requireCapability(admin, partnerAccess.principal, 'fulfillment.read', scope), 'NOT_AUTHORIZED');
      admin.update(state => {delete state.grants[0].revoked_at;});
      refuses(() => access.requireCapability(admin, partnerAccess.principal, 'fulfillment.read', {...scope, case_id: 'foreign-case'}), 'NOT_AUTHORIZED');
      admin.update(state => {state.grants[0].status = 'REVOKED'; admin.appendAudit(state, ownerAccess.principal, 'ADMIN_GRANT_REVOKED', {grant_id: 'fictional-grant'});});
      refuses(() => access.requireCapability(admin, partnerAccess.principal, 'fulfillment.read', scope), 'NOT_AUTHORIZED');
    });
    check('active membership changes immediately revoke existing admin proof', () => {
      access.updateMembership(admin, ownerAccess.principal, staffMember.admin_id, {permissions: ['overview.read']});
      refuses(() => access.requireCapability(admin, staffAccess.principal, 'accounts.read'), 'TWO_FACTOR_REQUIRED');
      staffAccess = unlock(staff, admin);
      refuses(() => access.requireCapability(admin, staffAccess.principal, 'accounts.read'), 'NOT_AUTHORIZED');
    });
    check('organization disable revokes partner proof and prevents new unlock', () => {
      access.updateOrganization(admin, ownerAccess.principal, organization.org_id, {status: 'DISABLED'});
      refuses(() => access.principal(admin, partner.actor, partner.token, partnerAccess.token), 'NOT_AUTHORIZED');
      refuses(() => access.unlock(admin, partner.actor, partner.token, {code: security.totp(partner.secret, clock)}), 'NOT_AUTHORIZED');
      access.updateOrganization(admin, ownerAccess.principal, organization.org_id, {status: 'ACTIVE'});
      refuses(() => access.principal(admin, partner.actor, partner.token, partnerAccess.token), 'TWO_FACTOR_REQUIRED');
    });
    check('last owner cannot be disabled or demoted', () => {
      refuses(() => access.updateMembership(admin, ownerAccess.principal, ownerAccess.principal.admin_id, {status: 'DISABLED'}), 'ADMIN_LAST_OWNER');
      refuses(() => access.updateMembership(admin, ownerAccess.principal, ownerAccess.principal.admin_id, {role: 'staff', permissions: ['overview.read']}), 'ADMIN_LAST_OWNER');
    });
    check('existing owner can add an eligible owner and then demote one', () => {
      const added = access.createMembership(admin, ownerAccess.principal, {account_id: second.actor.account_id, role: 'owner'});
      const secondAccess = unlock(second, admin);
      consumer.update(state => {state.accounts.find(a => a.account_id === second.actor.account_id).email_verified_at = null;});
      assert.equal(access.ownerSignInPath(admin, second.actor, second.token), null);
      refuses(() => access.updateMembership(admin, ownerAccess.principal, ownerAccess.principal.admin_id, {status: 'DISABLED'}), 'ADMIN_LAST_OWNER');
      consumer.update(state => {state.accounts.find(a => a.account_id === second.actor.account_id).email_verified_at = new Date().toISOString();});
      access.updateMembership(admin, secondAccess.principal, ownerAccess.principal.admin_id, {status: 'DISABLED'});
      assert.equal(access.ownerSignInPath(admin, owner.actor, owner.token), null);
      access.updateMembership(admin, secondAccess.principal, ownerAccess.principal.admin_id, {status: 'ACTIVE'});
      access.updateMembership(admin, secondAccess.principal, ownerAccess.principal.admin_id, {role: 'staff', permissions: ['overview.read']});
      assert.equal(access.ownerSignInPath(admin, owner.actor, owner.token), null);
      assert.equal(admin.state().memberships.find(m => m.admin_id === added.admin_id).role, 'owner');
      refuses(() => access.requireCapability(admin, ownerAccess.principal, 'team.manage'), 'TWO_FACTOR_REQUIRED');
    });
    check('MFA credential replacement invalidates previously unlocked proof', () => {
      staffAccess = unlock(staff, admin);
      clock += 30000;
      security.disableTwoFactor(consumer, staff.actor, {password: PASSWORD, code: security.totp(staff.secret, clock)});
      refuses(() => access.principal(admin, staff.actor, staff.token, staffAccess.token), 'ADMIN_SECURITY_REQUIRED');
      const replacement = security.beginTwoFactor(consumer, staff.actor, {password: PASSWORD});
      security.confirmTwoFactor(consumer, staff.actor, {code: security.totp(replacement.secret, clock)}); staff.secret = replacement.secret;
      refuses(() => access.principal(admin, staff.actor, staff.token, staffAccess.token), 'TWO_FACTOR_REQUIRED');
      staffAccess = unlock(staff, admin);
    });
    check('admin unlock expiration and consumer expiration are rechecked', () => {
      admin.update(state => {state.unlocks.find(u => u.token_sha256 === accounts.tokenDigest(staffAccess.token)).expires_at = new Date(clock - 1).toISOString();});
      refuses(() => access.requireCapability(admin, staffAccess.principal, 'overview.read'), 'TWO_FACTOR_REQUIRED');
      staffAccess = unlock(staff, admin);
      consumer.update(state => {state.sessions.find(s => s.token_sha256 === accounts.tokenDigest(staff.token)).idle_expires_at = new Date(clock - 1).toISOString();});
      refuses(() => access.requireCapability(admin, staffAccess.principal, 'overview.read'), 'AUTHENTICATION_REQUIRED');
    });
    partnerAccess = unlock(partner, admin);
    check('lock revokes only the bound consumer session admin proof', () => {
      access.lock(admin, partner.actor, partner.token, partnerAccess.token);
      refuses(() => access.principal(admin, partner.actor, partner.token, partnerAccess.token), 'TWO_FACTOR_REQUIRED');
    });
    check('deleted owner consumer account cannot access or rebootstrap', () => {
      const secondAccess = unlock(second, admin);
      consumer.update(state => {state.accounts = state.accounts.filter(a => a.account_id !== second.actor.account_id);});
      refuses(() => access.requireCapability(admin, secondAccess.principal, 'team.manage'), 'AUTHENTICATION_REQUIRED');
      refuses(() => access.bootstrapOwner(admin, {account_id: owner.actor.account_id, code: security.totp(owner.secret, clock)}), 'NOT_AUTHORIZED');
    });
    check('audit rejects edits, preserves permission detail, and omits secret fields', () => {
      admin.audit({account_id: 'fictional'}, 'ADMIN_TEST', {permissions: ['overview.read'], role: 'staff', code: '123456', admin_token: 'secret', report: 'private bytes'});
      assert.deepEqual(admin.state().audit_events.at(-1).metadata, {permissions: ['overview.read'], role: 'staff'});
      refuses(() => admin.update(state => {state.audit_events[0].event = 'ADMIN_FORGED';}), 'ADMIN_AUDIT_IMMUTABLE');
      refuses(() => admin.update(state => {state.audit_events.pop();}), 'ADMIN_AUDIT_IMMUTABLE');
      refuses(() => admin.update(state => {state.bootstrapped_at = null;}), 'ADMIN_BOOTSTRAP_IMMUTABLE');
      refuses(() => admin.update(async state => {state.grants.push({status: 'ACTIVE'});}), 'ADMIN_TRANSACTION_MUST_BE_SYNCHRONOUS');
      refuses(() => admin.update(() => admin.audit({}, 'ADMIN_TEST', {})), 'ADMIN_TRANSACTION_REENTRANT');
    });
    check('sole writer refuses same-process and external-process contenders', () => {
      refuses(() => new AdminStore(consumer.dataDir, {consumerStore: consumer}), 'ADMIN_STORE_ALREADY_HAS_WRITER');
      const child = spawnSync(process.execPath, ['-e', "const {AdminStore}=require(process.argv[1]);try{new AdminStore(process.argv[2]);process.exit(2)}catch(e){console.log(e.code);process.exit(e.code==='ADMIN_STORE_ALREADY_HAS_WRITER'?0:3)}", path.resolve(__dirname, '../admin-store.cjs'), consumer.dataDir], {encoding: 'utf8'});
      assert.equal(child.status, 0, child.stderr); assert.match(child.stdout, /ADMIN_STORE_ALREADY_HAS_WRITER/);
    });
    check('legacy live claims and malformed identity fail closed without removing evidence', () => {
      const dir = directory(), original = open(dir);
      const claim = JSON.parse(fs.readFileSync(original.lockFile, 'utf8'));
      original.close();
      const file = path.join(dir, 'admin', 'writers', 'legacy.json');
      fs.writeFileSync(file, JSON.stringify({pid:process.pid,token:claim.token}));
      refuses(() => new AdminStore(dir), 'ADMIN_STORE_ALREADY_HAS_WRITER');
      assert.equal(fs.existsSync(file), true);
      fs.writeFileSync(file, JSON.stringify({...claim,identity:{boot:'invalid',start:'0'}}));
      refuses(() => new AdminStore(dir), 'ADMIN_STATE_UNAVAILABLE');
      assert.equal(fs.existsSync(file), true);
    });
    if (process.platform === 'linux') check('reused PID identity is stale while signed journal and old claim remain intact', () => {
      const dir = directory(), original = open(dir);
      original.audit({}, 'ADMIN_TEST', {});
      const before = JSON.stringify(original.state());
      const claim = JSON.parse(fs.readFileSync(original.lockFile, 'utf8'));
      assert.match(claim.identity.start, /^\d+$/);
      original.close();
      const file = path.join(dir, 'admin', 'writers', 'old-process.json');
      const bytes = JSON.stringify({...claim,identity:{...claim.identity,start:'0'}});
      fs.writeFileSync(file, bytes);
      const successor = open(dir);
      assert.equal(JSON.stringify(successor.state()), before);
      assert.equal(fs.readFileSync(file, 'utf8'), bytes);
      refuses(() => new AdminStore(dir), 'ADMIN_STORE_ALREADY_HAS_WRITER');
    });
    check('stale materialized state cannot resurrect revoked grants', () => {
      fs.writeFileSync(path.join(admin.dataDir, 'state.json'), '{broken or old cache');
      assert.equal(admin.state().grants[0].status, 'REVOKED');
      admin.close(); const reopened = open(consumer.dataDir, consumer);
      assert.equal(reopened.state().grants[0].status, 'REVOKED'); reopened.close();
    });
    check('offline CLI consumes OTP through stdin and releases its admin registration', () => {
      const c = new PrivateStore(directory()), u = user('offline-owner', true, c), cli = require('../deploy/admin-bootstrap.cjs');
      const read = fs.readFileSync, log = console.log; let printed;
      fs.readFileSync = (file, ...args) => file === 0 ? security.totp(u.secret, clock) : read(file, ...args);
      console.log = value => {printed = JSON.parse(value);};
      try {cli.main(['--data-dir', c.dataDir, '--account-id', u.actor.account_id]);}
      finally {fs.readFileSync = read; console.log = log;}
      assert.equal(printed.created, true); assert.equal(printed.role, 'owner'); assert.equal('code' in printed, false);
      const reopened = open(c.dataDir, c); assert.equal(reopened.state().memberships[0].account_id, u.actor.account_id);
      assert.throws(() => cli.main([]), /Usage/);
      const child = spawnSync(process.execPath, [path.resolve(__dirname, '../deploy/admin-bootstrap.cjs'), '--data-dir', c.dataDir, '--account-id', u.actor.account_id], {input: '000000', encoding: 'utf8'});
      assert.equal(child.status, 1); assert.match(child.stderr, /PRIVATE_STORE_ALREADY_HAS_A_WRITER/);
    });
    const recoveryConsumer = new PrivateStore(directory()), original = user('retired-owner', true, recoveryConsumer), successor = user('successor-staff', true, recoveryConsumer), unready = user('unready-successor', false, recoveryConsumer);
    let recovery = open(recoveryConsumer.dataDir, recoveryConsumer);
    check('orphan recovery refuses uninitialized stores and implicit intent', () => {
      refuses(() => access.recoverOrphanedOwner(recovery, {account_id: successor.actor.account_id, code: security.totp(successor.secret, clock)}), 'NOT_AUTHORIZED');
      refuses(() => access.recoverOrphanedOwner(recovery, {account_id: successor.actor.account_id, code: security.totp(successor.secret, clock), offline: true}), 'NOT_AUTHORIZED');
    });
    const initialOwner = access.bootstrapOwner(recovery, {account_id: original.actor.account_id, code: security.totp(original.secret, clock)});
    const initialAccess = unlock(original, recovery);
    const successorMember = access.createMembership(recovery, initialAccess.principal, {account_id: successor.actor.account_id, role: 'staff', permissions: ['overview.read']});
    const successorAccess = unlock(successor, recovery);
    const originalBootstrap = recovery.state().bootstrapped_at;
    check('offline recovery refuses while any active eligible owner exists without consuming OTP', () => {
      const consumerBefore = JSON.stringify(recoveryConsumer.state()), adminBefore = JSON.stringify(recovery.state());
      refuses(() => access.recoverOrphanedOwner(recovery, {account_id: successor.actor.account_id, code: security.totp(successor.secret, clock + 30000), offline: true}), 'NOT_AUTHORIZED');
      assert.equal(JSON.stringify(recoveryConsumer.state()), consumerBefore); assert.equal(JSON.stringify(recovery.state()), adminBefore);
    });
    recoveryConsumer.update(state => {state.accounts = state.accounts.filter(a => a.account_id !== original.actor.account_id); state.cases.push({case_id: 'fictional-surviving-case', account_id: successor.actor.account_id});});
    recovery.update(state => {state.grants.push({grant_id: 'fictional-revoked-recovery-grant', status: 'REVOKED'});});
    check('orphan recovery still requires verified completed MFA target and fresh OTP', () => {
      const before = JSON.stringify(recovery.state());
      refuses(() => access.recoverOrphanedOwner(recovery, {account_id: unready.actor.account_id, code: '000000', offline: true}), 'ADMIN_SECURITY_REQUIRED');
      refuses(() => access.recoverOrphanedOwner(recovery, {account_id: successor.actor.account_id, offline: true}), 'TWO_FACTOR_REQUIRED');
      refuses(() => access.recoverOrphanedOwner(recovery, {account_id: successor.actor.account_id, code: 'invalid', offline: true}), 'TWO_FACTOR_INVALID');
      refuses(() => access.recoverOrphanedOwner(recovery, {account_id: successor.actor.account_id, code: security.totp(successor.secret, clock), offline: true}), 'TWO_FACTOR_INVALID');
      assert.equal(JSON.stringify(recovery.state()), before);
    });
    recovery.close();
    const cli = require('../deploy/admin-bootstrap.cjs');
    function recoveryCli(extra, code) {
      const read = fs.readFileSync, log = console.log; let printed;
      fs.readFileSync = (file, ...args) => file === 0 ? code : read(file, ...args);
      console.log = value => {printed = JSON.parse(value);};
      try {const member = cli.main(['--data-dir', recoveryConsumer.dataDir, '--account-id', successor.actor.account_id, ...extra]); return {member, printed};}
      finally {fs.readFileSync = read; console.log = log;}
    }
    check('CLI never falls back to orphan recovery without its exact flag', () => {
      refuses(() => recoveryCli([], security.totp(successor.secret, clock + 30000)), 'NOT_AUTHORIZED');
      assert.throws(() => recoveryCli(['--recover-owner'], '000000'), /Usage/);
      assert.throws(() => recoveryCli(['--recover-orphaned-owner', '--recover-orphaned-owner'], '000000'), /Usage/);
    });
    check('explicit recovery CLI refuses the live consumer writer', () => {
      const child = spawnSync(process.execPath, [path.resolve(__dirname, '../deploy/admin-bootstrap.cjs'), '--data-dir', recoveryConsumer.dataDir, '--account-id', successor.actor.account_id, '--recover-orphaned-owner'], {input: '000000', encoding: 'utf8'});
      assert.equal(child.status, 1); assert.match(child.stderr, /PRIVATE_STORE_ALREADY_HAS_A_WRITER/);
    });
    check('explicit offline recovery promotes successor and atomically retires orphaned owner proof', () => {
      const cases = JSON.stringify(recoveryConsumer.state().cases); clock += 30000;
      const {member, printed} = recoveryCli(['--recover-orphaned-owner'], security.totp(successor.secret, clock));
      assert.equal(printed.recovered, true); assert.equal(printed.created, false); assert.equal(member.admin_id, successorMember.admin_id); assert.equal(member.revision, 2);
      recovery = open(recoveryConsumer.dataDir, recoveryConsumer);
      const state = recovery.state(), retired = state.memberships.find(m => m.admin_id === initialOwner.admin_id);
      assert.equal(retired.status, 'DISABLED'); assert.equal(retired.revision, 2); assert.equal(state.bootstrapped_at, originalBootstrap);
      assert.deepEqual(member.permissions, access.PERMISSIONS); assert.equal(member.org_id, null);
      assert.ok(state.unlocks.filter(u => [initialOwner.admin_id, successorMember.admin_id].includes(u.admin_id)).every(u => u.revoked_at));
      assert.equal(state.audit_events.at(-1).event, 'ADMIN_OWNER_RECOVERED'); assert.equal(state.audit_events.at(-1).metadata.operation, 'OFFLINE_RECOVERY');
      assert.equal(state.grants[0].status, 'REVOKED'); assert.equal(JSON.stringify(recoveryConsumer.state().cases), cases);
      assert.equal(recoveryConsumer.state().accounts.some(a => a.account_id === original.actor.account_id), false);
      refuses(() => access.principal(recovery, successor.actor, successor.token, successorAccess.token), 'TWO_FACTOR_REQUIRED');
      assert.equal(unlock(successor, recovery).principal.role, 'owner');
      refuses(() => access.recoverOrphanedOwner(recovery, {account_id: successor.actor.account_id, code: security.totp(successor.secret, clock + 30000), offline: true}), 'NOT_AUTHORIZED');
    });
    check('offline recovery can create a membership for an eligible existing consumer without restoring deleted accounts', () => {
      recoveryConsumer.update(state => {state.accounts = state.accounts.filter(a => a.account_id !== successor.actor.account_id);});
      const newOwner = user('successor-new-owner', true, recoveryConsumer); clock += 30000;
      const member = access.recoverOrphanedOwner(recovery, {account_id: newOwner.actor.account_id, code: security.totp(newOwner.secret, clock), offline: true});
      assert.equal(member.revision, 1); assert.equal(member.role, 'owner'); assert.equal(recovery.state().bootstrapped_at, originalBootstrap);
      assert.equal(recoveryConsumer.state().accounts.some(a => [original.actor.account_id, successor.actor.account_id].includes(a.account_id)), false);
      assert.equal(recovery.state().memberships.filter(m => m.status === 'ACTIVE' && m.role === 'owner').length, 1);
    });
    check('journal tampering is detected while cached and after restart', () => {
      const dir = directory(), s = open(dir); s.update(state => {state.grants.push({status: 'REVOKED'});});
      const file = path.join(s.journalDir, '000000001.json'); fs.appendFileSync(file, ' ');
      refuses(() => s.state(), 'ADMIN_STATE_UNAVAILABLE'); s.close();
      refuses(() => new AdminStore(dir), 'ADMIN_STATE_UNAVAILABLE');
    });
    check('deleting acknowledged journal tail cannot restore earlier privileges', () => {
      const dir = directory(), s = open(dir); s.update(state => {state.grants.push({status: 'ACTIVE'});}); s.update(state => {state.grants[0].status = 'REVOKED';});
      fs.unlinkSync(path.join(s.journalDir, '000000002.json'));
      refuses(() => s.state(), 'ADMIN_STATE_UNAVAILABLE'); s.close();
      refuses(() => new AdminStore(dir), 'ADMIN_STATE_UNAVAILABLE');
    });
    check('missing integrity key refuses recovery instead of generating new authority', () => {
      const dir = directory(), s = open(dir); s.update(state => {state.grants.push({status: 'REVOKED'});}); s.close(); fs.unlinkSync(path.join(s.dataDir, '.integrity-key'));
      refuses(() => new AdminStore(dir), 'ADMIN_STATE_UNAVAILABLE');
    });
    check('interrupted head publication retains fully synced journal revocation', () => {
      const dir = directory(), s = open(dir); s.update(state => {state.grants.push({status: 'ACTIVE'});});
      const rename = fs.renameSync;
      fs.renameSync = (a, b) => {if (b === path.join(s.dataDir, '.head')) throw Object.assign(new Error('fictional disk failure'), {code: 'EIO'}); return rename(a, b);};
      try {assert.throws(() => s.update(state => {state.grants[0].status = 'REVOKED';}), /fictional disk failure/);} finally {fs.renameSync = rename;}
      assert.equal(s.state().grants[0].status, 'REVOKED'); s.close();
      const recovered = open(dir); assert.equal(recovered.state().grants[0].status, 'REVOKED');
    });
    check('100 updates and 100 reads avoid full journal replay while retaining source checks', () => {
      const dir = directory(), s = open(dir), started = performance.now();
      for (let i = 0; i < 100; i++) s.update(state => {state.grants.push({grant_id: String(i), status: 'REVOKED'}); s.appendAudit(state, {}, 'ADMIN_TEST', {grant_id: String(i)});});
      const reads = s.metrics.journal_reads;
      for (let i = 0; i < 100; i++) assert.equal(s.state().grants.length, 100);
      assert.equal(s.metrics.journal_reads, reads); assert.equal(reads, 0); assert.equal(s.metrics.cache_reads, 200);
      const elapsed = Math.round(performance.now() - started); s.close();
      const reopened = open(dir); assert.equal(reopened.metrics.journal_reads, 100); const before = reopened.metrics.journal_reads;
      for (let i = 0; i < 100; i++) reopened.state(); assert.equal(reopened.metrics.journal_reads, before);
      process.stdout.write(JSON.stringify({updates: 100, reads: 100, elapsed_ms: elapsed, steady_state_journal_reads: reads, restart_journal_reads: 100}) + '\n');
    });
    process.stdout.write('Admin access/storage: ' + passed + ' checks passed\n');
    return {passed};
  } finally {
    Date.now = realNow;
    for (const s of stores) s.close();
    for (const dir of directories) {
      const resolved = path.resolve(dir), temporaryRoot = path.resolve(os.tmpdir()) + path.sep;
      assert.ok(resolved.startsWith(temporaryRoot) && path.basename(resolved).startsWith('crp-admin-access-'));
      fs.rmSync(resolved, {recursive: true, force: true});
    }
  }
}
if (require.main === module) run().catch(e => {console.error(e); process.exitCode = 1;});
module.exports = {run};
