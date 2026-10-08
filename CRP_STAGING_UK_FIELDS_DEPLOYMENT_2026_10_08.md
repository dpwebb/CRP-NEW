# UK consumer-field staging release — October 8, 2026

Owner authority: work on UK report evidence and finish the online search; standing commit/push/staging authority continues. Root coordinated a bounded isolated reader writer, read-only source/release review, serial integration, frozen verification and staging activation. Production remains OPEN.

## Delivered

Verified [TransUnion V9 April 2025 consumer field documentation](https://www.transunion.co.uk/content/dam/transunion/gb/consumer/collateral/your-credit-file-explained-v-9/Your%20credit%20file%20explained%20v9.pdf), section 5.8 pp15–17, supports the narrowly defined current GENERAL field contract. Exact organisation headings, account dates/states, scheduled payments and the full credit/overdraft-limit caption now retain the correct account and their own source locations. Optional trusted masked suffixes survive the assessed issue into an approved packet; missing/untrusted suffixes do not suppress independently supported violations or leak into evidence.

The current local country gate credits only full current-source behavioral proof of this bounded contract. It does not promote the separately admitted historical Experian family. All 82 jurisdictions, 19 active checklist checks, VIOLATION wording, privacy/ownership, entitlement and approval safeguards remain.

## Exact release

- Target: **https://staging.creditregulatorpro.com**, configured `hostinger-vps`, only `crp-wizard-staging.service`.
- Runtime source committed and pushed before clean-source packaging: **`3a5a35a41ae84447c0e14052114d8317411aa5c9`**. Isolated reader commit `411e2ad` integrated serially as `0baca78`.
- Build: **`crp-v1-f0b8fc4e0f06d97a`**.
- Manifest: **98 files**, digest **`F0B8FC4E0F06D97A710A1DF38FBAFE1ECEE86A27F5FA32AD39DC59E2C89C8F0D`**.
- Archive SHA-256: **`F6C4AC3203B0893F01A969EB43EC1C6E2E8451F2194BE47EEC4946B18C552F58`**.
- Activated: **`2026-10-08T11:49:22.016Z`**.
- Release: `/opt/crp-wizard-staging/releases/crp-v1-f0b8fc4e0f06d97a`.

Packaging verified clean committed source, all 221 frozen tested-source hashes and copied shipped hashes. Activation verified archive, extracted files and composite manifest. Public HTTPS health confirms the exact build, staging, test billing and `launch_ready=false`. Private storage and configuration are excluded from packaging; later documentation commits do not change the served runtime identity.

## Verification

Full product regression **11,549 passed / 0 failed / 0 skipped**, **130 completed sections**, **221 unchanged tested-source hashes**, no unrun sections or source drift, **17/17 re-derived closure records**, total runner duration **886,806 ms**. Separate source audit **23/0/0**. Final DL **224/0/0** and V **127/0/0**. Actual native uploads -> source-linked zero-limit checklist issue -> consumer selection/correspondence/review/approval -> downloaded packet pass locally in all four UK regions. The owning creditor, masked suffix, decisive amounts and physical source locations are retained.

Current-build hosted API verification passed **nine checks**: exact staging/test identity, 82 selections, disposable fictional account, UK case with selected TransUnion bureau, ordinary native caption upload, free assessment, owned stored report/free result, one supported VIOLATION and unpaid packet 402 refusal. Fixture cleanup passed account deletion 200 and session revocation 401. The first operational attempt sent output field `selected_bureau` rather than request field `bureau`; its selection assertion failed and its account/session was deleted/revoked. The corrected operational driver uses the actual existing request contract. This failed fixture attempt is retained and is not counted as passing or a runtime defect.

These hosted results establish the free UK intake/assessment and existing payment boundary. They do **not** establish a hosted paid packet download. The earlier legitimate provider Card form dependency remains pending; no hosted entitlement injection, fabricated webhook, card submission or payment occurred.

## Backup and rollback

Previous release: `/opt/crp-wizard-staging/releases/crp-v1-935f0669308e8d84`.

Restricted backup: `/opt/crp-wizard-staging/backups/before-crp-v1-f0b8fc4e0f06d97a-1791460160`.

Activation stopped only the staging service and hash-verified all **72 private regular files** in its stopped-service snapshot. Existing test billing/OCR configuration was reused; only `CRP_BUILD_ID` changed. Automatic rollback on activation/local-health failure remained enabled. To roll back: stop staging, restore its backed-up environment, repoint `current` to the retained previous release, restart and verify health. Preserve current consumer storage unless a demonstrated recovery need requires its retained snapshot.

## Remaining boundaries and evidence

**Research and supported field/packet implementation CLOSED; staging activation and these free hosted paths VERIFIED; hosted paid packet acceptance PENDING; production OPEN.** Source guide original-byte downloads returned 403; the structured crosswalk is not an original PDF hash. Latest linked Sep guide content and complete current export geometry are unverified. Available supported values are delivered; unavailable/ambiguous report values are not fabricated. Source/version/capture detail: `CRP_UK_CURRENT_FIELD_EVIDENCE_2026_10_08.md`.

Ignored local evidence: `accelerated-launch/service/out/staging-gb-2026-10-08/`, containing final regression/source audit, package/activation receipts, hosted API outcomes/cleanup and preserved failed operational selection input. No private-report egress, bureau correspondence, live charge or production activation occurred. Current schedule: `CRP_VERSION_1_SEVEN_DAY_WORK_REGISTER_001.md`.
