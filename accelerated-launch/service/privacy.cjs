'use strict';
const retention = require('./retention.cjs');

/** Account-owned inventory only; never expose paths, digests or another account's metadata. */
function dashboard(store, actor) {
  const state = store.state();
  const owned = state.cases.filter(row => row.account_id === actor.account_id);
  const referrals = state.referral_snapshots?.[0] || {};
  return {
    cases: owned.map(row => ({ case_id: row.case_id, country: row.country, region: row.region, status: row.status,
      documents: state.files.filter(file => file.account_id === actor.account_id && file.case_id === row.case_id && file.stored_blob !== false).map(file => ({
        file_id: file.file_id, name: file.original_filename || file.originalFilename || 'Uploaded report',
        stored_bytes: Number(file.stored_bytes) || 0
      })),
      result_count: state.results.filter(result => result.account_id === actor.account_id && result.case_id === row.case_id).length
    })),
    account_documents: require('./account-documents.cjs').listDocuments(store, actor).map(file => ({ file_id: file.file_id, name: file.original_filename, stored_bytes: file.stored_bytes })),
    referral: {
      enrolled: (referrals.members || []).some(row => row.account_id === actor.account_id),
      attribution_saved: (referrals.purchases || []).some(row => row.customer_id === actor.account_id),
      reward_count: (referrals.rewards || []).filter(row => row.referrer_id === actor.account_id).length
    },
    retention: { mode: 'UNTIL_DELETED', adjustable: false, plain: retention.policyView().policy.report_bytes },
    deletion: {
      scope: 'ACTIVE_SERVICE_DATA',
      plain: 'Delete a case to remove its reports and results. Remove identification and address documents from Your account, or delete your account to remove all its contact details, documents, cases and sessions.',
      backups: 'Deletion from the active service does not establish erasure of separate backups. Backup erasure timing has not been verified.',
      external_billing: 'Deleting your account here does not delete payment records held separately by the payment provider.'
    }
  };
}
module.exports = { dashboard };
