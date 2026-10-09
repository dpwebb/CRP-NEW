# Production backup and recovery

These files configure recovery for the CRP production service only. Installation is not proof of a successful backup, restore or production release. Record actual host, release, upload, restore and rollback receipts separately.

## Production custody

- Service: `crp-wizard-production.service`.
- Complete private store: `/var/lib/private/crp-wizard-production`, including `state.json`, its transaction backup, blobs and other saved store files.
- Settings: `/opt/crp-wizard-production/production.env`.
- Active immutable release: `/opt/crp-wizard-production/current`, pointing directly to `/opt/crp-wizard-production/releases/crp-v1-<16 lowercase hex characters>`. Each release supplies `release-manifest.json` and `deployment-provenance.json`; the production base supplies `candidate-activation.json`.
- Optional preserved legacy snapshot: `/opt/crp-wizard-production/legacy-custody`. Prepare this immutable private snapshot separately. The backup job does not connect to or dump a legacy database.
- Ciphertext destination: `gs://crp-v1-staging-offsite-backups-20261009/production/`. This reuses the existing private CRP backup bucket under a separate production prefix and with a separate production age recovery identity. Existing public access prevention, uniform bucket permissions, 30-day live-object retention and seven-day soft delete apply. The prefix is an organizational boundary, not a separate IAM grant; the existing authorized backup identity has bucket-level access. Leave staging objects, permissions and jobs unchanged.
- Host-local ciphertext: `/opt/crp-wizard-production/offsite-backups`, mode 0700. Only this job's strictly named regular archives older than 30 days are removed, after a verified upload.

Install the script, service and timer under their matching names. Root-only production authentication uses `/etc/crp/v1-production-wif-cred.json`, `/etc/crp/v1-production-gcloud` and its `certificate_config.json`; these reuse the already authorized federated backup identity through separately configured production paths, without new credential or IAM grants. The job explicitly selects that credential configuration. Keep the fresh production age public recipients in `/etc/crp/v1-production-backup-recipient.txt`. Keep the corresponding production decryption identity and a recovery copy off the VPS, outside the repository and bucket, under the owner's private custody. Check identity expiration and rotation separately. Do not copy staging application settings into production.

## Backup operation

Run `/opt/crp-wizard-production/offsite-backup-production.sh upload` as root. The optional `snapshot-only` argument creates local encrypted custody without claiming an offsite upload. The timer runs at 03:45 UTC with up to ten minutes of jitter.

The script rejects unexpected paths, symlinks and special custody entries; takes `/opt/crp-wizard-production/offsite-backups/backup.lock`; stops only the production writer if it was active; copies the complete store, settings, release metadata and any legacy snapshot; compares source and copied inventories; and restarts only a previously active service. A failure triggers the same restart attempt. Plaintext remains in one mode-0700 temporary directory and is removed on exit. Encryption happens before upload. Both uploaded ciphertext and its checksum companion are downloaded and compared byte for byte. A failed comparison makes the job fail.

**Serialize production release activation and backup using the same lock.** Retain immutable release packages and verified package hashes separately; the backup holds release identity and manifests, not every executable release file. Review `systemctl status crp-v1-production-offsite-backup.timer` and `journalctl -u crp-v1-production-offsite-backup.service` after the first actual scheduled job. Do not log environment contents, decryption keys or consumer records.

## Restore rehearsal

1. Download the selected ciphertext and companion checksum to a new restricted location. Verify the ciphertext SHA-256 before decrypting with the owner-held identity. Inspect tar members first: reject absolute paths, `..` components, symlinks, hard links and unexpected top-level entries.
2. Decrypt into a fresh isolated directory, never over the live store. Verify `MANIFEST.sha256`, private permissions, the state schema and every referenced blob's recorded size/hash. Include a damaged-copy negative control. Remove only the isolated copied writer-lock file before startup.
3. Verify the retained executable release against the copied release manifest and provenance. Start exactly one isolated loopback service on a verified free port with its own store. Exclude live provider credentials and block unnecessary egress. Do not create a shared proxy route for this service.
4. Use a controlled fictional account saved through ordinary application APIs to verify sign-in, contact details, report/case retrieval and byte-identical document downloads. Verify anonymous and unrelated-account denial, then restart the isolated service and repeat. Record results and hashes without exporting customer data.
5. Stop only the isolated service and remove only its explicitly verified temporary paths. Preserve the encrypted backup and the actual proof receipt. A successful rehearsal proves that snapshot's recovery point; it does not recover transactions saved afterward.

## Compatible release rollback

Verify the previous immutable code hashes, storage-schema compatibility and production settings first. Take a fresh complete backup and hold the production backup lock. Stop only `crp-wizard-production.service`, change only its release pointer and corresponding build identity, restart and check exact served identity plus owned account/report/document access. Preserve the current store and all non-build settings. Do not replay an older data backup for a code rollback. If data formats differ, prove a separate migration or recovery procedure before switching. Keep other VPS services, hostnames and shared router settings outside this operation.
