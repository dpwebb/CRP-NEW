'use strict';
/**
 * retention.cjs — the published retention and deletion behaviour, and the sweep that enforces it.
 *
 * OWNER-ALL82-001 / B4, plan section 8: "Report retention/deletion behavior matches the published policy; no
 * report text enters application logs." This module is both halves of that sentence: the policy AS PUBLISHED to
 * the consumer, and the code that makes the store match it on every start and on demand.
 *
 * THE POLICY IS DELIBERATELY BORING, and that is the honest position for this build: a report is kept until the
 * consumer deletes it, and nothing expires it behind their back. What IS swept automatically is everything the
 * consumer did not create for themselves — dead sessions, lapsed purchases, unpaid checkout intents and blobs
 * that a crash left with no row.
 */

const accounts = require('./accounts.cjs');
const entitlement = require('./entitlement.cjs');

/** Grace before an unreferenced blob is treated as garbage rather than an upload still being written. */
const ORPHAN_BLOB_GRACE_MS = 5 * 60 * 1000;

const POLICY = Object.freeze({
  account_support_documents: 'Identification, address and supporting documents stay private until you remove them or delete your account. Deleting a case does not remove documents saved in your account.',
  account_contact_details: 'Saved contact details are kept until you clear them or delete your account.',
  report_bytes:
    'A report you upload is kept, privately, on this machine until you delete the case or delete your account. ' +
    'Nothing expires it on a timer, and it is never copied into the application source tree.',
  case_records: 'A case holds your explicit selection, what was admitted, what was read and the checks that ran until you delete it.',
  demonstration_output: 'Demonstration output is never stored. It is generated for the response and discarded.',
  session_rows:
    'A session row is destroyed when you sign out, when it expires, and when it is replaced by a newer sign-in. ' +
    'Only a SHA-256 of the session token is ever stored.',
  purchase_records:
    'Entitlement and billing-event rows are kept for the life of the account so a refund, a cancellation and a ' +
    're-sent provider event can each be settled correctly. They contain no report data.',
  logs:
    'No log record can carry report text, a file name, an email address, a case id, a file id, a token or a path: ' +
    'the log sink accepts a fixed field whitelist and drops everything else. This service writes no log file.',
  public_assets:
    'No report, no identifier and no digest appears in any asset served to a browser. The static route is an allowlist.',
  account_deletion: 'Deleting an account removes its cases, its stored bytes, its results, its purchase rows and every session at once.',
  case_deletion: 'Deleting a case removes its stored bytes, its result sets and its purchase reference for that case. The id stops resolving afterwards.'
});

function policyView() {
  const keys = Object.keys(POLICY);
  return {
    policy: Object.assign({}, POLICY),
    policy_keys: keys,
    plain: 'A report stays until you delete it. Sessions, lapsed purchases and crash leftovers are cleaned up automatically. ' +
      'No report text can reach a log, and nothing of yours is placed in a public asset.',
    orphan_blob_grace_seconds: ORPHAN_BLOB_GRACE_MS / 1000
  };
}

/**
 * Bring the store into line with the policy. Safe to call at any time and on every start: every step is
 * idempotent, and the orphan sweep only touches blobs older than the grace period so an upload being written
 * right now is never deleted.
 */
function applyRetention(store, options) {
  const opts = options || {};
  const now = opts.now ? new Date(opts.now) : new Date();
  const outcome = {
    expired_sessions_removed: accounts.sweepSessions(store, now),
    entitlements_swept: entitlement.sweep(store, now),
    orphan_blobs_removed: 0,
    partial_blobs_removed: 0,
    blobs_examined: 0,
    blobs_kept_inside_the_grace_period: 0,
    ran_at: now.toISOString()
  };
  if (typeof store.listBlobs === 'function') {
    const state = store.state();
    const referenced = new Set((state.files || []).map((row) => row.file_id));
    for (const entry of store.listBlobs()) {
      outcome.blobs_examined += 1;
      const insideGrace = now.getTime() - entry.modified_ms < ORPHAN_BLOB_GRACE_MS;
      if (insideGrace) {
        outcome.blobs_kept_inside_the_grace_period += 1;
        continue;
      }
      if (entry.partial) {
        /* A partial is never a report and never referenced: past the grace it is only debris. */
        if (store.deleteBlobFile(entry.name)) outcome.partial_blobs_removed += 1;
        continue;
      }
      if (referenced.has(entry.file_id)) continue;
      if (store.deleteBlob(entry.file_id)) outcome.orphan_blobs_removed += 1;
    }
  }
  return outcome;
}

module.exports = { POLICY, ORPHAN_BLOB_GRACE_MS, policyView, applyRetention };
