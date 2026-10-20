'use strict';
// Local/read-only configuration check. Never deploys, provisions keys or grants release authority.
const fs = require('node:fs');
const { parseEnv } = require('node:util');
const ENVS = Object.freeze({
  staging: { crp:'https://staging.creditregulatorpro.com', affiliate:'https://affiliates-staging.creditregulatorpro.com', billing:'test' },
  production: { crp:'https://creditregulatorpro.com', affiliate:'https://affiliates.creditregulatorpro.com', billing:'live' }
});
function fail(code) { throw Object.assign(new Error(code), { code }); }
function readEnv(file) {
  let raw;
  try { raw = fs.readFileSync(file, 'utf8'); } catch { fail('INTEGRATION_ENV_UNREADABLE'); }
  const seen = new Set();
  for (const m of raw.matchAll(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/gm)) {
    if (seen.has(m[1])) fail('INTEGRATION_ENV_DUPLICATE_KEY');
    seen.add(m[1]);
  }
  try { return parseEnv(raw); } catch { fail('INTEGRATION_ENV_INVALID'); }
}
function checkPair(environment, crp, affiliate, requireKeys) {
  const target = ENVS[environment];
  if (crp.CRP_DEPLOYMENT_ENV !== environment || crp.CRP_AFFILIATE_ORIGIN !== target.affiliate || affiliate.APP_ENV !== 'production'
    || affiliate.PUBLIC_ORIGIN !== target.affiliate || affiliate.CONSUMER_ORIGIN !== target.crp) fail('INTEGRATION_ORIGIN_MISMATCH');
  if (!['0','1'].includes(crp.CRP_AFFILIATE_BINDING_ENABLED) || !['false','true'].includes(affiliate.CONSUMER_BINDING_ENABLED)) fail('INTEGRATION_SWITCH_INVALID');
  const enabled = crp.CRP_AFFILIATE_BINDING_ENABLED === '1';
  if (enabled !== (affiliate.CONSUMER_BINDING_ENABLED === 'true')) fail('INTEGRATION_SWITCH_MISMATCH');
  if (crp.CRP_LOCAL_SERVICE_SECURE_COOKIE !== '1') fail('INTEGRATION_SECURE_COOKIE_REQUIRED');
  if (affiliate.STRIPE_MODE !== target.billing) fail('INTEGRATION_BILLING_MODE_MISMATCH');
  // Do not load payment-execution or consumer database credentials into the affiliate app.
  if (Object.keys(affiliate).some(k => /^(STRIPE_SECRET_KEY|BANK_|PAYOUT_EXECUTION_|CONSUMER_DATABASE|CRP_DATABASE)/.test(k))) fail('INTEGRATION_FORBIDDEN_CREDENTIAL');
  if (affiliate.STRIPE_READ_KEY && !affiliate.STRIPE_READ_KEY.startsWith('rk_' + target.billing + '_')) fail('INTEGRATION_RESTRICTED_READER_REQUIRED');
  const key = crp.CRP_AFFILIATE_BINDING_KEY || '', peer = affiliate.BINDING_SECRET || '';
  if (key !== peer) fail('INTEGRATION_KEY_MISMATCH');
  const installed = key.length >= 32 && !/[\s]/.test(key) && !/replace|placeholder|change.?me/i.test(key);
  if ((key || peer || enabled || requireKeys) && !installed) fail('INTEGRATION_KEY_REQUIRED');
  if (installed && key === affiliate.REFERRAL_SECRET) fail('INTEGRATION_KEY_PURPOSE_REUSE');
  return { enabled, keysInstalled:installed };
}
function checkRecord(record) {
  const exactKeys = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join(',') === keys.slice().sort().join(',');
  if (!exactKeys(record,['version','deploymentOrder','releases']) || !exactKeys(record.releases,['staging','production'])) fail('INTEGRATION_RELEASE_RECORD_INVALID');
  if (record?.version !== 1 || JSON.stringify(record.deploymentOrder) !== JSON.stringify(['affiliate','crp','verify','enable'])) fail('INTEGRATION_RELEASE_RECORD_INVALID');
  for (const environment of Object.keys(ENVS)) {
    const r = record.releases?.[environment];
    if (!exactKeys(r,['crp','affiliate']) || !exactKeys(r.crp,['sourceCommit','buildId','expectedPreviousBuildId']) || !exactKeys(r.affiliate,['sourceCommit','imageDigest','expectedPreviousImageDigest'])) fail('INTEGRATION_RELEASE_RECORD_INVALID');
    for (const app of ['crp','affiliate']) if (!/^[a-f0-9]{40}$/i.test(r?.[app]?.sourceCommit || '') || /^0+$/.test(r[app].sourceCommit)) fail('INTEGRATION_SOURCE_COMMIT_REQUIRED');
    if (!/^crp-v1-[a-f0-9]{16}$/.test(r.crp.buildId || '') || !/^crp-v1-[a-f0-9]{16}$/.test(r.crp.expectedPreviousBuildId || '')
      || !/^sha256:[a-f0-9]{64}$/.test(r.affiliate.imageDigest || '') || !/^sha256:[a-f0-9]{64}$/.test(r.affiliate.expectedPreviousImageDigest || '')) fail('INTEGRATION_IMMUTABLE_RELEASE_REQUIRED');
  }
}
function checkConfiguration(input) {
  if (!['dormant','activation'].includes(input.mode) || !ENVS[input.environment]) fail('INTEGRATION_MODE_INVALID');
  checkRecord(input.record);
  const pairs = {};
  for (const environment of Object.keys(ENVS)) {
    if (!input[environment]?.crp || !input[environment]?.affiliate) fail('INTEGRATION_BOTH_ENVIRONMENTS_REQUIRED');
    pairs[environment] = checkPair(environment, input[environment].crp, input[environment].affiliate, input.mode === 'activation' && environment === input.environment);
  }
  if (input.mode === 'activation') {
    const billing = input[input.environment].affiliate;
    if (!/^acct_[A-Za-z0-9]+$/.test(billing.STRIPE_ACCOUNT_ID || '') || !billing.STRIPE_READ_KEY || !/^whsec_[A-Za-z0-9]+$/.test(billing.STRIPE_WEBHOOK_SECRET || '')) fail('INTEGRATION_BILLING_CONFIGURATION_REQUIRED');
  }
  const s = input.staging, p = input.production;
  if (pairs.staging.keysInstalled && s.crp.CRP_AFFILIATE_BINDING_KEY === p.crp.CRP_AFFILIATE_BINDING_KEY) fail('INTEGRATION_CROSS_ENVIRONMENT_KEY_REUSE');
  const secrets = pair => [pair.crp.CRP_AFFILIATE_BINDING_KEY,...['REFERRAL_SECRET','STRIPE_READ_KEY','STRIPE_WEBHOOK_SECRET'].map(k => pair.affiliate[k])].filter(Boolean);
  if (secrets(s).some(value => secrets(p).includes(value))) fail('INTEGRATION_CROSS_ENVIRONMENT_SECRET_REUSE');
  if (input.mode === 'dormant' && pairs[input.environment].enabled) fail('INTEGRATION_DORMANT_SWITCH_REQUIRED');
  if (input.mode === 'activation' && !pairs[input.environment].enabled) fail('INTEGRATION_ACTIVATION_SWITCH_REQUIRED');
  return {configurationValid:true, configurationOnly:true, environment:input.environment, mode:input.mode, pairs,
    declaredRelease:input.record.releases[input.environment], hostedAcceptanceVerified:false, productionReady:false};
}
function main(args) {
  try {
    const flags = {};
    const allowed = ['environment','mode','staging-crp','staging-affiliate','production-crp','production-affiliate','record'];
    for (let i=0; i<args.length; i+=2) {
      const name = args[i]?.replace(/^--/, '');
      if (!args[i]?.startsWith('--') || !allowed.includes(name) || flags[name] || !args[i+1] || args[i+1].startsWith('--')) fail('INTEGRATION_ARGUMENTS_INVALID');
      flags[name] = args[i+1];
    }
    if (allowed.some(k => !flags[k])) fail('INTEGRATION_ARGUMENTS_REQUIRED');
    let record;
    try { record = JSON.parse(fs.readFileSync(flags.record, 'utf8')); } catch { fail('INTEGRATION_RELEASE_RECORD_UNREADABLE'); }
    const input = {environment:flags.environment, mode:flags.mode, record};
    for (const env of Object.keys(ENVS)) input[env] = {crp:readEnv(flags[env+'-crp']), affiliate:readEnv(flags[env+'-affiliate'])};
    process.stdout.write(JSON.stringify(checkConfiguration(input), null, 2)+'\n');
  } catch (error) {
    // Never print environment values, parser errors, credentials, tokens or private paths.
    process.stderr.write((/^INTEGRATION_[A-Z_]+$/.test(error.code || '') ? error.code : 'INTEGRATION_PREFLIGHT_FAILED')+'\n');
    process.exitCode = 1;
  }
}
module.exports = {checkConfiguration, readEnv};
if (require.main === module) main(process.argv.slice(2));
