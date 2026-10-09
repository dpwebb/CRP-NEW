# Account, report and document recovery — staging rehearsal

**VERIFIED on October 9, 2026. Production-specific backup configuration remains unverified.**

## What was demonstrated

1. Saved two fictional accounts, one evaluated native PDF report, contact details and three supporting documents through ordinary staging APIs. No records or entitlements were injected.
2. Briefly stopped the actual staging service and copied the complete resolved private data directory and its configuration into a restricted host backup. Verified every copied file by size and SHA-256 before restarting staging.
3. Restored that actual backup into a new private directory on the same host. The complete directory matched before startup. Every referenced report/document blob matched its recorded hash and size. A deliberately damaged fictional report copy failed verification; its original bytes were restored before starting any copied-store service.
4. Started the copy on **127.0.0.1:8947**, verified its actual service PID/listener and private-store lock, and kept provider credentials absent. Configured systemd loopback network restrictions, strict filesystem protection and no-new-privileges. No proxy or production routing points to this copy.
5. Used real password sign-in to verify the restored account, saved profile, report/case and assessment, plus three byte-identical document downloads. Anonymous access returned 401; the unrelated account received 403. Repeated after restarting the copied service and on the retained previous release. No customer report contents or configuration secrets were downloaded from the host.
6. Actually switched **public staging** to the previous immutable release, checked its served build/source/assets and owned account/report/document access, then returned staging to the newest release. Kept current live data throughout; no older data backup was replayed over it.
7. Verified all existing record collections after removing only the fictional canary accounts/files. Stopped the copied-store services, removed both temporary restore directories and deleted the temporary credential file. Retained the root-only backup and metadata receipts.

## Release and backup identity

| Item | Measured value |
|---|---|
| Target | `https://staging.creditregulatorpro.com` |
| Newest/final build | `crp-v1-133f36eb9b5dc1eb` |
| Newest source | `53d31469acb2608834de4a82547933819a43e6e0` |
| Newest manifest | `133F36EB9B5DC1EB7E5D43E53458A23AC9A45A0563A7965E93234A583353DA43` |
| Previous build | `crp-v1-80731ca9bd1d4290` |
| Previous source | `9f65be929ad92654132d82819465bf645a7c0237` |
| Previous manifest | `80731CA9BD1D42902860CDFAF8C7BD6B6FB84965144F8BCABA3C64BDE757EFCF` |
| Shipped files | 125 verified per release; storage/auth/profile/document/billing/case/packet modules identical |
| Backup | `/opt/crp-wizard-staging/recovery-rehearsals/2026-10-09-b74/backup` |
| Snapshot | `2026-10-09T13:07:03.770Z`, 80 files; inventory digest `6b9e2cc90d853bbfa9165aab6572b306359843ab93dd564d86cd862858ad45ed` |
| Snapshot contents | Schema 3; 21 accounts, 50 cases, 77 file blobs, 137 assessments and all packet/billing/history collections. Includes disposable canaries. |
| Hosted acceptance receipt | `accelerated-launch/service/out/staging-backup-recovery-2026-10-09/backup-recovery-acceptance.json` |
| Receipt SHA-256 | `6a4da2bb30b0d33bb1a365577c5183c6afb06d3934ad7c7cbb4f736f24f7e2c1` |

Backup directories are mode 0700; the configuration and metadata receipts are private files. Original customer blobs, account data and environment contents remain on the host. The local ignored evidence folder holds only controlled fictional input and metadata/hash receipts. The full private backup manifest is retained on the host rather than copied into the workspace.

## Measured timings and preservation

| Successful operation | Measured duration |
|---|---:|
| Snapshot stop to healthy staging | 1.640 seconds |
| Fresh restore copy to verified account/document reads | 7.673 seconds |
| Switch to previous release to loopback health | 1.209 seconds |
| Return to newest release to loopback health | 1.239 seconds |

These are successful-step measurements for this staging dataset, not a production recovery-time guarantee. Both releases also passed public health and four served asset hash checks.

During actual code switching, **11 core record collection hashes and all 77 referenced blob hashes remained equal** to the fresh pre-switch live baseline. Session access timestamps change during normal reads and were excluded from that intermediate whole-collection comparison; the original canary sessions still worked on both releases. After cleanup, **all 12 pre-existing record collections**, including sessions, matched the pre-test contents exactly. The two canary accounts, one case/assessment and four blobs were removed; pre-existing counts are 19 accounts, 49 cases, 73 blobs and 136 assessments. Configuration bytes match the protected original. The newest staging service is active, test billing is retained, and the isolated listener is closed.

## Corrected attempts retained honestly

- The first proposed isolated address, port 8793, was occupied by an existing nginx staging proxy. Its API calls reached the primary service; those receipts are excluded from isolated restore acceptance. The corrected run verified the free port, service PID, listener, store lock and absent-provider health on 8947.
- An initial pre-switch comparison to the older snapshot refused execution because successful test sign-ins had added normal lockout bookkeeping to two fictional accounts. Staging had not been stopped. Verified that no other account/data fields changed, captured a fresh live baseline, and preserved that current state through the successful release switch.
- The error handler returns the service to the newest code/configuration without replaying old data. No forced live activation failure was injected; this handler is recorded as configured, rather than claimed as a tested failure scenario. Network restrictions are recorded as configured; an independent egress probe was not performed.

## Reusable recovery procedure and release boundary

Restore the **complete stopped-service state-and-blob directory** into a fresh restricted location; validate the snapshot inventory, schema, every referenced blob and permissions before startup. Remove only the copied writer lock, start one isolated loopback process with provider credentials absent, and verify real account/report/document access before any routing decision. `state.json.bak` is a prior-transaction index, not a replacement for a full report/document backup.

For a compatible code rollback, verify immutable release hashes, matching storage format and current configuration; stop the sole writer, change only the release pointer/build ID, restart and check exact served identity plus owned data. Preserve current data and non-build configuration. If storage formats differ, do not apply this same-data rollback procedure without a separately proven migration/restoration plan.

This closes the requested **staging recovery and previous-release rehearsal**. Runtime source did not change; the matching frozen product regression is reused. No production release or live billing change was performed, and `launch_ready` remains false. Production backup cadence, retention, off-host custody and host/configuration recovery remain unverified. This manual snapshot restores its recorded point in time; later transactions are not automatically replayed. Those production choices remain in the existing release boundary, not in a new feature queue.
