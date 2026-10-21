import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { provision, DATA, BUILD } from './staging-owner-policy.mjs';
import { dropToStoreOwner } from './store-owner.mjs';
const fail = value => { throw new Error(value); };
try {
  if (process.platform !== 'linux' || process.getuid() !== 0 || process.argv.length !== 3) fail('ROOT_OFFLINE_STAGING_ONLY');
  const contextFile = process.argv[2], op = path.dirname(contextFile);
  if (!/^\/opt\/crp-family-admin-operations\/staging-owner-[a-f0-9-]{36}$/.test(op) || path.basename(contextFile) !== 'intent.json') fail('PRIVATE_OPERATION_PATH_REQUIRED');
  for (const f of [op, contextFile]) { const s = fs.lstatSync(f); if (s.isSymbolicLink() || s.uid !== 0 || (s.mode & 0o077)) fail('PRIVATE_ROOT_CUSTODY_REQUIRED'); }
  const intent = JSON.parse(fs.readFileSync(contextFile, 'utf8'));
  if (intent.operation !== path.basename(op)) fail('OPERATION_MISMATCH');
  const base = '/opt/crp-wizard-staging/current', release = fs.realpathSync(base);
  if (release !== '/opt/crp-wizard-staging/releases/' + BUILD || fs.realpathSync(DATA) !== DATA) fail('EXACT_STAGING_RELEASE_REQUIRED');
  const pid = execFileSync('systemctl', ['show', 'crp-wizard-staging.service', '-p', 'MainPID', '--value'], {encoding:'utf8'}).trim();
  if (pid !== '0') fail('STAGING_WRITER_MUST_BE_STOPPED');
  for (const name of ['private-store.cjs','admin-store.cjs','accounts.cjs','admin-access.cjs','signup-security.cjs']) {
    const file = base + '/accelerated-launch/service/' + name;
    const digest = createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    if (digest !== intent.nativeModuleHashes?.[name]) fail('NATIVE_POLICY_SOURCE_CHANGED');
  }
  const require = createRequire(base + '/accelerated-launch/service/server.cjs');
  const {PrivateStore} = require('./private-store.cjs'), {AdminStore} = require('./admin-store.cjs');
  const security = require('./signup-security.cjs'), {PERMISSIONS} = require('./admin-access.cjs');
  const code=fs.readFileSync(0,'utf8').trim();
  // The root-only operation directory remains private. Open only the exclusive
  // receipt and its directory descriptor before dropping privilege permanently.
  const claimFd=fs.openSync(path.join(op,'attempt.json'),'wx',0o600),opFd=fs.openSync(op,'r');
  dropToStoreOwner(DATA);
  const consumer = new PrivateStore(DATA); let admin;
  try {
    admin = new AdminStore(DATA, {consumerStore: consumer});
    const member = provision({intent, consumer, admin, security, permissions:PERMISSIONS, code, claim(value) {
      fs.writeFileSync(claimFd,JSON.stringify(value)+'\n');fs.fsyncSync(claimFd);fs.fsyncSync(opFd);
    }});
    console.log(JSON.stringify({provisioned:true, accountId:member.account_id, adminId:member.admin_id, role:member.role, operation:intent.operation}));
  } finally { admin?.close();fs.closeSync(claimFd);fs.closeSync(opFd); }
} catch (error) { console.error(/^[A-Z_]+$/.test(error.message) ? error.message : 'RECOVERY_REFUSED_INSPECT_PROTECTED_OPERATION'); process.exitCode=1; }
