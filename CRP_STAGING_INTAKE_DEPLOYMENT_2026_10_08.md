# Step 2 report-upload staging release — October 8, 2026

Owner authority: guide users directly through current country/region, bureau and report upload in Step 2, remove confusing case/build/coverage wording, explain use of their selected current location, and show the assessment results. The standing commit/push/staging authorization applies. Root owns implementation and integration; read-only peer reviews accepted the navigation, ownership and release safeguards.

## Delivered flow

**Sign in → Step 2: country, region, bureau, report → automatic assessment → results.** The main action is **Upload your report**. Location choices preserve a report selected first. The note says:

> Choose the country and region where you live now. We use this selection to check your report, even if it shows a different or previous address.

This describes application behavior; it adds no report-address match or new legal prerequisite. The existing multi-file upload, limits, idempotent pending-file retry, free assessment, purchase access and selected/approved packet path are reused. Partial uploads retain recovery and optional saved-file assessment. **Continue a saved report** resumes existing reports or their results. Account/navigation changes cancel stale follow-up writes and redraws. Returning during assessment offers guarded **Refresh results** for the same owned report.

## Exact release

- Target: https://staging.creditregulatorpro.com; configured `hostinger-vps` (187.127.252.51), only `crp-wizard-staging.service`.
- Runtime source, committed and pushed before packaging: **`54972c433d9a5d38358b6237d18e73a64503283f`**.
- Served build: **`crp-v1-33e439f5210bb181`**.
- Manifest: **97 files**, digest `33E439F5210BB1816D0ECDC1F285F9CAAD1283B8AC6E937A3E8F7C7F01378DE5`.
- Archive SHA-256: `A93E220571EE90C150BC7C0E26C9B5833B9A823722C0361BBE9DD0DBCF7D2EBC`.
- Release: `/opt/crp-wizard-staging/releases/crp-v1-33e439f5210bb181`.
- Activated: **`2026-10-08T06:10:30.282Z`**.

Packaging validated clean committed Git state, all frozen tested-source hashes, the manifest and copied files. Host activation verified the archive, all extracted hashes and composite digest. Private reports, account storage and environment configuration are excluded from the package. Subsequent documentation commits do not change this runtime source identity.

## Verification

Frozen full product regression: **11,349 passed / 0 failed / 0 skipped**, **130 completed sections**, **220 matching tested-source hashes**, no unrun sections or source drift; **17/17 re-derived closure records**. Final separate source audit: **23/0/0**. EC deferred-response tests passed **27**, actual Chrome account/upload tests **20**, UI smoke **68**, and the existing approved packet browser journeys **88**.

**All 28 hosted checks passed**. Actual Chrome on HTTPS staging confirmed:

- Sign-in opens Step 2 with the real file picker, clear upload action and current-location explanation; all 82 selections retain bureau choices.
- A fictional report selected before country/region/bureau remains selected. Upload stores one report on the correct owned case, preserves the chosen bureau, automatically assesses before purchase and shows one supported **VIOLATION**.
- Signed-in Step 1 has contact/documents without repeat auth prompts or provider/build explanations. A deliberately held saved-report refresh preserves the Account screen and its selected passport file.
- Saved contact/document data survives reload; original document bytes match; stranger retrieval/deletion is refused; the private inventory and removal behave correctly; unpaid packet access still returns 402.

Both disposable fictional accounts were deleted (200) and their sessions revoked (401). Step 2 and results screenshots were visually reviewed. No payment or hosted entitlement fabrication occurred. This is representative hosted upload/account acceptance; local full tests retain broader reader, all-82 and selected-packet proof.

## Backup and rollback

Previous release: `/opt/crp-wizard-staging/releases/crp-v1-cf3c51ed6af136d9`.

Restricted backup: `/opt/crp-wizard-staging/backups/before-crp-v1-33e439f5210bb181-1791439828`.

Activation stopped the staging service and hash-verified its **72 regular private data files** in the snapshot. Existing test billing/OCR configuration was reused; only `CRP_BUILD_ID` changed. Automatic rollback on service/local-health failure remained enabled. Public health verifies the exact staging/test build and `launch_ready=false`.

Rollback: stop only the staging service, restore its backed-up environment and repoint `current` to the retained prior release, then restart and verify health. Preserve current private consumer data; do not overwrite it from a snapshot without a demonstrated recovery need.

## Evidence and boundaries

Ignored local evidence: `accelerated-launch/service/out/staging-intake-2026-10-08/`, including package/activation receipts and log, `final-regression-evidence.json`, separate source audit, `hosted-intake-verification.json`, Step 2/results/account screenshots and guarded deployment/verification scripts. Initial focused failures are retained in `failed-ui-fixtures.json`. The first full run was interrupted after its exact old-sentence requirement failed; `interrupted-first-full.json` records that failure. The corrected final full run supplies completion evidence.

**Implementation CLOSED; measured hosted Step 2/account paths VERIFIED.** Hosted paid checkout/payment/webhook confirmation, approved subscriber packet download and owned comparison/re-aging acceptance remain **PENDING** under Batch 58. Current UK dedicated-family evidence, release-check reconciliation and production configuration/capacity/restoration/provenance remain open. Reader source limits and the active 19-check scope remain recorded; all 82 promised selections are preserved. Production readiness remains **OPEN**. No private report, payment, production activation or external correspondence was transmitted.
