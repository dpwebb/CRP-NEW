# CRP Version 1 staging offsite backup — October 9, 2026

## Scope and status

The current application already uses `PrivateStore` as its primary consumer-file store. `CRP_LOCAL_SERVICE_DATA` points the staging service to `/var/lib/private/crp-wizard-staging` outside the checkout; `state.json` and opaque `blobs/` hold account, report, document, case and packet state. The directory and blobs are mode 0700. Upload and supporting-document flows call `putBlob`, `readBlob` and `deleteBlob` with opaque IDs. Focused account-document, packet-support and upload checks passed 349/0/0 on October 9. The earlier same-host recovery rehearsal is recorded in `CRP_BACKUP_RESTORE_ROLLBACK_CLOSEOUT_2026_10_09.md`.

Encrypted offsite backup is **verified on staging**, with the daily timer enabled. This is not production-specific backup configuration, production-host recovery, launch authorization or a production blocker closure.

## Storage and identity

- Bucket: `gs://crp-v1-staging-offsite-backups-20261009`, Montréal (`northamerica-northeast1`), Standard, public access prevention and uniform bucket-level access.
- Only the dedicated `crp-v1-staging-backup@crp-beta-storage.iam.gserviceaccount.com` identity has the newly granted Storage Object Admin role on this bucket. No project-level role or service-account key was added.
- The organization's `iam.managed.disableServiceAccountKeyCreation` policy blocks JSON keys. A dedicated X.509 workload identity pool/provider (`crp-v1-staging-backup` / `crp-v1-staging-certificate`) maps the exact certificate common name to the service account. The VPS obtains short-lived credentials through federation. The leaf certificate and key, credential configuration and Cloud SDK configuration are root-only in `/etc/crp/`; the signing CA private key was moved off the VPS to the owner's restricted local key directory.
- The age recipient public key is on the VPS; the age recovery identity stays only in the owner's restricted local directory. Never place it in the repository, bucket or VPS. Preserve a separate owner-controlled recovery copy before relying on the bucket for production.

## Backup procedure and measured proof

`accelerated-launch/service/deploy/offsite-backup-staging.sh` runs as root under `crp-v1-staging-offsite-backup.service`. It checks the exact data path and rejects symlinks, takes a nonblocking lock, stops the sole staging writer, copies the complete data tree and `staging.env`, verifies copied file SHA-256 values, and restarts the service. It then writes a file manifest, creates a tar archive encrypted with age, uploads the ciphertext and `.sha256` file to the bucket using federated `gcloud`, downloads the uploaded ciphertext and compares it byte for byte. A failed upload or comparison makes the job fail. After successful verification, host-local matching archives older than 30 days are removed.

The first complete run returned `OFFSITE_BACKUP_VERIFIED crp-v1-staging-20261009T162200Z.tar.gz.age`. The 5.3 MB ciphertext and 149-byte SHA-256 companion appear in the private bucket. The ciphertext SHA-256 is `dac4da31c6f89ad85cbc00a29f2ded798bc2fdd77243e9a29a981e114ed65cc0`. The owner's local age identity decrypted the archive stream, and tar listed 81 entries; plaintext was not extracted to disk. Public staging health returned HTTP 200 afterward.

The actual systemd service was then started once through systemd, rather than by invoking the script directly. It returned `Result=success`, `ExecMainStatus=0` and `OFFSITE_BACKUP_VERIFIED crp-v1-staging-20261009T162501Z.tar.gz.age`; the staging service remained active.

Two ciphertext transfer copies remain in the owner's restricted `C:\Users\webbd\Documents\CRP-Offsite-Transfer` directory. A local cleanup attempt was blocked by the execution policy, so their removal is pending; no plaintext copy was created there.

The bucket deletes live objects at age 30 days, with 7-day soft delete. The timer is enabled and active, set for 03:30 UTC daily with up to 10 minutes of randomized delay; its first scheduled run is October 10, 2026. Check `systemctl status crp-v1-staging-offsite-backup.timer`, `journalctl -u crp-v1-staging-offsite-backup.service` and the bucket object list after that run. The X.509 leaf expires October 9, 2027 UTC and needs rotation beforehand.

## Remaining release boundary

No production host or production data directory has been designated for this job. No production account, report, document or packet was copied. Before marking the existing TRUST_AND_RELEASE production control satisfied, configure separate production custody and a schedule, preserve an offline recovery identity, perform a real production-shaped encrypted restore to an isolated service, and verify production host/build/configuration provenance and owner cutover authorization. Keep `launch_ready=false` until the other release controls also pass.
