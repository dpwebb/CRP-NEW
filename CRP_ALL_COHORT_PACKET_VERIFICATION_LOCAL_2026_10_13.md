# All-cohort upload-to-approved-packet verification — October 13, 2026

Status: COMPLETE_LOCAL_VERIFICATION. Owner authorized exhaustive local verification and resolution of the existing test-account storage cap while preserving its data and credentials. No staging or production deployment was authorized or performed.

## Verified matrix

| Cohort | Original reports | Approved PDF downloads | No eligible issues; approval/download correctly blocked | Remaining failures |
| --- | ---: | ---: | ---: | ---: |
| AU | 104 | 103 | 1 | 0 |
| UK | 97 | 78 | 19 | 0 |
| US | 102 | 100 | 2 | 0 |
| CA | 93 | 92 | 1 | 0 |
| Creator | 40 | 38 | 2 | 0 |
| Total | 436 | 411 | 25 | 0 |

Every report completed original-byte upload and assessment over real authenticated loopback HTTP using the unchanged existing credentials and full-access entitlement. Every nonempty eligible selection completed support preparation, explicit approval and PDF download. All 436 original-source custody checks passed; the 411 downloads match their stored approval PDF hashes and exact selected issue IDs. Original source hashes and physical page references remain intact. The 25 empty-result cases return the expected `PACKET_NO_SELECTION` and `PACKET_NOT_APPROVED` refusal codes, not server errors. Empty results do not establish compliance or complete legal coverage.

The exhaustive matrix uses retained isolated private stores copied from the existing account and entitlement. It is not 436 new journeys written into the primary full-history store at localhost:8890. That store repeatedly parses about 500 MB of history, making the exhaustive run impractical there. Each verification copy validates the same credentials through the ordinary login and entitlement APIs. Clearly fictional correspondence and supporting documents are used only in these copies; nothing is mailed or dispatched. Unbranded Australian fixtures use an explicit test recipient; this does not establish their source issuer. Historical verification-harness routing failures and interrupted attempts remain recorded; corrected runs pass.

## Storage and preservation

The named local verification account now has a bounded 1 GiB upload allowance. The exception requires local deployment, a matching configured account ID and a valid bounded byte allowance. Other accounts and hosted environments retain the ordinary 40 MiB cap, with existing per-file and case limits unchanged. The local launcher retains this configuration across its local restarts; credentials and entitlement were not reseeded.

The actual primary account accepted an original-file upload beyond its former cap: stored report bytes are 42,023,033. All pre-existing persistent rows remain exactly unchanged, excluding ephemeral sessions. All 430 original private blobs retain their original hashes and byte lengths. Additive quota-verification cases, files, results and the unapproved selection are preserved; nothing was deleted to free space. The primary account profile remains unchanged.

## Source and validation

- Clean enhanced checkout: `C:\Users\webbd\.codex\worktrees\synthetic-corpus-fixes\CRP-NEW`.
- Final source: `3f378e622e58a5fa5daeecbc704c8fada9e8309c`; quota implementation commit `87257888ea8e5fa952f2a5e3edf240d4cc58970f`.
- Running URL: http://127.0.0.1:8890/.
- Build: `crp-local-four-country-52d60d9a31ff4537`; manifest `52D60D9A31FF45373103CD3CD853AB1461A3D5DE2F971C5DA160706DAE1B7464`, 159 runtime files.
- Fresh full regression on the quota runtime bytes: 16,027 passed, zero failed/skipped, no unrun sections or source drift. The code was then committed unchanged; only manifest metadata changed afterward. The change-aware workflow verified that metadata and unchanged product dependencies before guarded private packaging. This is not a second full execution after commit.
- Quota boundary checks: 48 passed. Existing storage/concurrency/recovery/intake regression: 151 passed. Changed-code syntax and release-workflow tests passed.
- All 158 other prior runtime files are byte-identical to the preceding synthetic candidate. AU 18, UK 6, US 6, CA 12, Creator 7 and synthetic 10 TODO mechanisms remain preserved. Readers, assessment, packet composition, public assets and billing/entitlement code were not changed by this batch.
- Final local restart verified clean source, login and full access. All 13 public assets and the homepage match committed bytes; nine staging-only prototype assets remain correctly refused locally. Representative letter and source-image renderings were inspected; this is not visual inspection of every page.

Private evidence: `C:\Users\webbd\.codex\private\crp-ai-comparison\implementation-2026-10-13\all-cohort-packet-verification`. Key receipts: `implementation-closure.json`, `matrix-summary.json`, five cohort ledgers/summaries, retained `isolated-stores`, `custody-summary.json`, `empty-result-guards.json`, `original-hashes.json`, `final-live-preservation.json`, `live-quota-upload.json`, `full-regression.json`, `final-source-continuity.json`, `visual-review.json`, `local-served-byte-verification.json`, `final-local-runtime.json`, and `local-guarded-package/package-receipt.json`. Credentials remain at the existing private credential pointer; no secrets or report content are committed.

The primary product checkout remains preserved; only this receipt and the work register were maintained there. There was no push, primary-source merge, provider purchase, external dispatch, staging/production activation or hosted acceptance. The private package remains unactivated and `production_ready:false`. This closes the requested bounded local matrix, not universal format/bureau coverage or unrelated all-82 and release obligations.
