# Owner-directed staging deployment — October 7, 2026

Authority: the owner's explicit "commit-push-deploy to staging" instruction. Target remains https://staging.creditregulatorpro.com on the configured hostinger-vps alias (srv1616603, 187.127.252.51). Only crp-wizard-staging.service was activated; existing domain routing and test billing configuration were reused.

## Exact candidate and source

- Runtime source commit: bdc5e87e3473a4108d2265a079c666596758ece3, pushed to origin/main.
- Source state: clean committed working tree; no executable source changed during deployment.
- Served build: crp-v1-a9740d383ab0bf94.
- Frozen manifest: A9740D383AB0BF94051587E79A85D31A85B1195ED32FB48E62CE2FBEB25593F3, 92 shipped files.
- Archive SHA-256: BF5045C3655D4865312D7349E898AB6BA96AC8E2F5B896E2069F19E68A485ABE.
- Release: /opt/crp-wizard-staging/releases/crp-v1-a9740d383ab0bf94; current resolves to that directory.
- Activation timestamp: 2026-10-07T21:48:17.905Z.
- Local frozen product regression reused: 9,735 passed, 0 failed, 0 skipped, 115 completed sections, no source drift or unrun sections. Separate source audit: 23 passed, 0 failed, 0 skipped.

The package contains exactly the manifest-listed runtime/configuration/reader/UI files, including consumer-wizard/dist/jurisdiction-data.js, plus release-manifest.json and deployment-provenance.json. All 92 hashes and the composite manifest digest were checked before packaging and on the host before activation. Archive SHA-256 matched after transfer. No private report or configuration file entered the package.

## Backup, activation and rollback

Previous release: /opt/crp-wizard-staging/releases/crp-v1-fb3c7033f5cb2bf7.

Restricted snapshot: /opt/crp-wizard-staging/backups/before-crp-v1-a9740d383ab0bf94-1791409696.

The staging service was stopped before copying the real /var/lib/private/crp-wizard-staging directory. All 72 regular files in the stopped-service snapshot were verified byte-for-byte by hash. The private environment backup retains mode 600 in a mode-700 backup directory. Only CRP_BUILD_ID changed in the active environment; Stripe secret and publishable key modes were verified as test without printing values. Existing configuration, consumer data and production services were preserved.

Activation used an LF-only transferred script with automatic rollback on service or local health failure. The service is active. Exact source, manifest, archive, previous release and backup pointers are retained in /opt/crp-wizard-staging/candidate-activation.json.

Rollback: stop only crp-wizard-staging.service; restore the snapshot's staging.env and repoint current to the retained previous release; start that staging service and verify its health. Preserve current private data. Do not restore/delete data blindly.

## Measured public and hosted verification

Public HTTPS health confirms:

- ok=true
- build_id=crp-v1-a9740d383ab0bf94
- deployment=staging
- billing_mode=test
- launch_ready=false

The jurisdiction endpoint retains 82 selections. Node v22.23.3, Poppler pdfinfo/pdftotext/pdftoppm/pdftohtml v24.02.0 and Tesseract 5.3.4 are available on the host.

Thirty-two hosted smoke checks passed against the actual public HTTPS service using one disposable fictional account and five generated native PDFs:

- General split-caption paid-status/positive-balance report: one VIOLATION; zero-balance control: zero issues.
- US own May 2025 OK/30 contradiction: one VIOLATION; ordinary different-period history: zero issues.
- AU own overdue listing with literal association/co-borrower captions: accepted and assessed, one supported checklist issue.
- All five reports uploaded and assessed before purchase; free summaries remained available.
- Unpaid packet access correctly returned 402.
- Real Chrome browser loaded the HTTPS Wizzard, signed in, opened the US result and showed VIOLATION without probable/potential violation labels.
- The three assessment purchase choices were present. No checkout or payment was performed.

The account and all five stored uploads were deleted, and its session then returned 401. The earlier smoke-driver attempts used an incorrect response-property path and a nonexistent DOM selector; those driver assumptions were corrected and the full hosted smoke passed. They required no application or release change.

Local operational artifacts: accelerated-launch/service/out/staging-2026-10-07/package-receipt.json, hosted-verification.json, fictional-staging-summary.png, package-candidate.cjs, activate-candidate.sh and verify-hosted.cjs. These artifacts contain only fictional inputs or non-secret release metadata.

## Precise remaining acceptance boundaries

**Staging activation and representative native intake/free-assessment/browser smoke are verified.** Hosted subscription/payment/webhook completion, owned-report re-aging and selected/approved subscriber packet downloads remain PENDING. An unpaid account does not prove those paid journeys; no host state was changed to fabricate entitlement.

The local approved-packet evidence remains valid implementation evidence. The accepted-report field dependencies from Batch 53 remain open. This deployment does not establish every reader/check path, complete all-82 substantive coverage or production readiness. Production was not deployed or changed; no live charge, private-report egress or external correspondence occurred.
