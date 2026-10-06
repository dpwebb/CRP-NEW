'use strict';
/**
 * support.cjs — BLOCKER-SUPPORT-001. A privacy-safe, account-owned diagnostic reference.
 *
 * The reference is an opaque HMAC token derived from the account id with a server-side secret, so it is
 * stable (the consumer quotes the same reference each time) and never derived from report content. The
 * diagnostic view exposes only operational details (build id, coarse lifecycle category, jurisdiction,
 * counts) — never report text, document names, credentials, payment details, legal-source identifiers or
 * other-account information. Lookup is authenticated and ownership-scoped; a reference that belongs to
 * another account is indistinguishable from one that does not exist. No message is sent to any external
 * support service.
 */
const crypto = require('node:crypto');
const { ServiceError } = require('./errors.cjs');

const SECRET_ENV = 'CRP_SUPPORT_REFERENCE_SECRET';
/* The reference secret is supplied by configuration (CRP_SUPPORT_REFERENCE_SECRET). There is NO hardcoded
   fallback secret in source: when the operator has not configured one, a random secret is generated once per
   service process. A generated secret is stable within that process but NOT across restarts, so production
   must configure a stable secret for reference stability. The secret is used only server-side in the HMAC and
   is never returned to any caller. */
let generatedSecret = null;
function resolveSecret() {
  const configured = process.env[SECRET_ENV];
  if (configured) return configured;
  if (!generatedSecret) generatedSecret = crypto.randomBytes(32).toString('hex');
  return generatedSecret;
}

function referenceFor(accountId) {
  return 'crp-ref-' + crypto.createHmac('sha256', resolveSecret()).update(String(accountId)).digest('hex').slice(0, 24);
}

/** Coarse operational stage derived from the account's own lifecycle. Never report content, never a finding. */
function categoryFor(owned) {
  if (!owned.cases.length) return 'NO_CASE';
  if (!owned.files.length) return 'CASE_WITHOUT_UPLOAD';
  if (!owned.results.length) return 'UPLOAD_WITHOUT_RESULT';
  return 'RESULT_PRESENT';
}

/** Redacted, account-owned support information. */
function supportInfo(store, actor) {
  const state = store.state();
  const cases = state.cases.filter((c) => c.account_id === actor.account_id);
  const files = state.files.filter((f) => f.account_id === actor.account_id && f.stored_blob !== false);
  const results = state.results.filter((r) => r.account_id === actor.account_id);
  return {
    reference: referenceFor(actor.account_id),
    build_id: process.env.CRP_BUILD_ID || 'local-development',
    category: categoryFor({ cases, files, results }),
    jurisdiction: cases.map((c) => ({ country: c.country, region: c.region })),
    case_count: cases.length,
    file_count: files.length,
    result_count: results.length,
    generated_at: new Date().toISOString(),
    plain: 'Quote this reference when you report a problem. It lets support identify the build you ran and the step you reached, without seeing your report.'
  };
}

/** Protected lookup: only the account that owns the reference can read it back. */
function lookup(store, actor, reference) {
  if (reference !== referenceFor(actor.account_id)) throw new ServiceError('NOT_FOUND');
  return supportInfo(store, actor);
}

module.exports = { supportInfo, lookup, referenceFor, categoryFor };
