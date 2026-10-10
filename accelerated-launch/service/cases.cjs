'use strict';
/**
 * cases.cjs — ownership-protected cases: explicit jurisdiction selection, status and deletion.
 *
 * OWNER-ALL82-001 / B2, plan section 4: "Jurisdiction comes from the consumer's explicit selection, never
 * report address, filename, location or bureau" and "enforce ownership on every case, file and result
 * operation". Selection goes through B1's `jurisdiction-router.cjs`, so a wrong, mismatched, aliased or
 * incomplete pair is refused by the same code path the 82-route test covers.
 *
 * REUSE LEDGER: the 404-vs-403 split and the "an inactive/absent actor cannot act" check mirror the legacy
 * `ownership()` middleware and `enforceOwnership()` in `middleware/auth.ts`.
 */

const { ServiceError } = require('./errors.cjs');
const { selectJurisdiction } = require('../jurisdiction-router.cjs');
const { adjustStatus, CASE_STATUSES } = require('./case-status.cjs');

function newCaseId() {
  return `case_${require('node:crypto').randomBytes(12).toString('hex')}`;
}

function nowIso() {
  return new Date().toISOString();
}

/** Explicit selection, validated by the shared router. Nothing is inferred from a file or a name. */
function resolveSelection(country, region) {
  try {
    return selectJurisdiction(country, region);
  } catch (err) {
    if (err && /EXPLICIT_COUNTRY_AND_REGION_REQUIRED/.test(err.message)) {
      throw new ServiceError('EXPLICIT_COUNTRY_AND_REGION_REQUIRED');
    }
    if (err && /UNSUPPORTED_OR_MISMATCHED_JURISDICTION/.test(err.message)) {
      throw new ServiceError('UNSUPPORTED_OR_MISMATCHED_JURISDICTION');
    }
    throw err;
  }
}

function createCase(store, actor, input) {
  const raw = input && typeof input === 'object' ? input : {};
  const country = typeof raw.country === 'string' ? raw.country.trim() : '';
  const region = typeof raw.region === 'string' ? raw.region.trim() : '';
  if (!country || !region) throw new ServiceError('EXPLICIT_COUNTRY_AND_REGION_REQUIRED');
  const selection = resolveSelection(country, region);
  const bureau = typeof raw.bureau === 'string' ? raw.bureau : '';
  if (bureau && !require('./bureau-dispute-requirements.cjs').catalog(selection.country).some(row => row.id === bureau)) throw new ServiceError('INVALID_REQUEST');
  return store.update((state) => {
    const created = {
      case_id: newCaseId(),
      account_id: actor.account_id,
      country: selection.country,
      region: selection.region,
      ...(bureau ? { selected_bureau: bureau } : {}),
      jurisdiction_batch: selection.batch,
      launch_ready: selection.launchReady,
      evaluation_available: selection.evaluationAvailable,
      status: CASE_STATUSES.OPEN,
      status_history: [{ status: CASE_STATUSES.OPEN, at: nowIso(), recorded_by: 'consumer' }],
      created_at: nowIso(),
      updated_at: nowIso()
    };
    state.cases.push(created);
    return created;
  });
}

function listCases(store, actor) {
  return store.state().cases
    .filter((c) => c.account_id === actor.account_id)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

/**
 * Ownership resolution used by EVERY case, file and result operation.
 *
 * An id that names no case is 404. A case that exists but belongs to another account is 403, and the body
 * carries no information about that other case — not its region, not its status, not its contents.
 */
function requireOwnedCase(store, actor, caseId) {
  const found = store.state().cases.find((c) => c.case_id === caseId);
  if (!found) throw new ServiceError('NOT_FOUND');
  if (found.account_id !== actor.account_id) throw new ServiceError('NOT_AUTHORIZED');
  return found;
}

function getCase(store, actor, caseId) {
  return requireOwnedCase(store, actor, caseId);
}

function setStatus(store, actor, caseId, nextStatus) {
  requireOwnedCase(store, actor, caseId);
  return store.update((state) => {
    const row = state.cases.find((c) => c.case_id === caseId);
    row.status = adjustStatus(row.status, nextStatus);
    row.status_history.push({ status: row.status, at: nowIso(), recorded_by: 'consumer' });
    row.updated_at = nowIso();
    return row;
  });
}

/**
 * Delete a case and everything derived from it: file rows, stored blobs, result sets and drafts. The
 * deletion is the reason a case-scoped id must stop working afterwards, so all of it goes at once.
 */
function deleteCase(store, actor, caseId) {
  const owned = requireOwnedCase(store, actor, caseId);
  const removed = store.update((state) => {
    const files = state.files.filter((f) => f.case_id === owned.case_id);
    state.cases = state.cases.filter((c) => c.case_id !== owned.case_id);
    state.files = state.files.filter((f) => f.case_id !== owned.case_id);
    state.results = state.results.filter((r) => r.case_id !== owned.case_id);
    state.drafts = state.drafts.filter((d) => d.case_id !== owned.case_id);
    state.packets = (state.packets || []).filter((p) => p.case_id !== owned.case_id);
    return files;
  });
  /* Only a row that actually had bytes on disk counts as a removed blob. */
  const removedBlobs = removed.filter((f) => f.stored_blob !== false && store.deleteBlob(f.file_id)).length;
  return { deleted: true, case_id: owned.case_id, files_removed: removed.length, blobs_removed: removedBlobs };
}

/** Delete the account and every case, file, result, draft and PURCHASE that hangs off it. */
function deleteAccount(store, actor) {
  const files = store.update((state) => {
    const owned = state.files.filter((f) => f.account_id === actor.account_id);
    state.accounts = state.accounts.filter((a) => a.account_id !== actor.account_id);
    state.sessions = state.sessions.filter((s) => s.account_id !== actor.account_id);
    state.cases = state.cases.filter((c) => c.account_id !== actor.account_id);
    state.files = state.files.filter((f) => f.account_id !== actor.account_id);
    state.results = state.results.filter((r) => r.account_id !== actor.account_id);
    state.drafts = state.drafts.filter((d) => d.account_id !== actor.account_id);
    state.packets = (state.packets || []).filter((p) => p.account_id !== actor.account_id);
    /**
     * B4: the purchase records go too. An entitlement row names the account, and a deletion that left the
     * consumer's own purchase history behind while claiming to have deleted the account would be a lie the
     * state file could be read to disprove.
     */
    state.entitlements = (state.entitlements || []).filter((e) => e.account_id !== actor.account_id);
    state.billing_events = (state.billing_events || []).filter((e) => e.account_id !== actor.account_id);
    state.checkout_sessions = (state.checkout_sessions || []).filter((c) => c.account_id !== actor.account_id);
    require('./referral-staging.cjs').purgeAccount(state, actor.account_id);
    return owned;
  });
  const removedBlobs = files.filter((f) => f.stored_blob !== false && store.deleteBlob(f.file_id)).length;
  return { deleted: true, blobs_removed: removedBlobs };
}

module.exports = {
  createCase,
  listCases,
  getCase,
  requireOwnedCase,
  setStatus,
  deleteCase,
  deleteAccount,
  resolveSelection
};
