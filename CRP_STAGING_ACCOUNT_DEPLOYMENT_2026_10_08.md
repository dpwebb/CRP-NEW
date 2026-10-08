# Account and bureau staging release — October 8, 2026

Authority: the owner requested a simpler signed-in Account step, saved contact details, identity/address uploads and sourced bureau-specific packet requirements, then suggested jurisdiction-to-bureau selection. The standing commit/push/staging authorization applies. Root integrated the isolated account writer and owns this release. Target: https://staging.creditregulatorpro.com, configured `hostinger-vps` (187.127.252.51); only `crp-wizard-staging.service` was activated.

## Delivered consumer path

- Sign-in still opens Step 2. Returning to Step 1 shows contact information and documents without asking the signed-in consumer to sign in again.
- Step 2 offers relevant bureau choices after jurisdiction selection and saves the choice with the case. All 82 jurisdiction selections remain. Selected issue/report provenance determines and validates the actual packet recipient.
- Consumers can save contact details and privately upload, view or remove ID, proof-of-address and supporting copies. Requirements vary by country, bureau, dispute purpose and submission channel; official sources are in `CRP_ACCOUNT_PACKET_DOCUMENT_REQUIREMENTS_2026_10_08.md`.
- Packet review uses saved contact information and the relevant document checklist. Only consumer-selected documents are included. Changed material contact/document information invalidates approval. Consumer declarations remain separate from report facts; the application does not claim document authenticity or contact a bureau automatically.
- Delayed case requests preserve the current account form and selected file; the latest Open choice wins.

## Exact source and release

- Runtime source: **`f8b3c7acc087d9ee51f4536fd17c2d1b305e728c`**, committed and pushed to `origin/main` before packaging.
- Served build: **`crp-v1-cf3c51ed6af136d9`**.
- Manifest digest: `CF3C51ED6AF136D9F991ED37CE884571FB25676C8961908B2A2C0631AFC60657`, **97 shipped files**.
- Archive SHA-256: `A604131965149654531C78D5A6F036F42E5FFE73D64AC1A79AED7F20F2A72ADF`.
- Release: `/opt/crp-wizard-staging/releases/crp-v1-cf3c51ed6af136d9`.
- Activation: **`2026-10-08T05:33:26.953Z`**.
- Frozen implementation: **11,333 passed / 0 failed / 0 skipped**, **130 completed sections**, **220 matching tested-source hashes**, no source drift or unrun sections; separate source audit **23/0/0** and **17/17 re-derived closure records**.

Packaging checked clean committed Git state, frozen tested-source hashes, the pinned manifest and every copied file. Archive, extracted host hashes and composite digest matched before activation. Packages exclude private account/report data and environment configuration. This deployment record and subsequent documentation commits do not change the runtime source identity above.

## Backup and rollback

Previous release: `/opt/crp-wizard-staging/releases/crp-v1-6c186087edd245b8`.

Restricted backup: `/opt/crp-wizard-staging/backups/before-crp-v1-cf3c51ed6af136d9-1791437605`.

Activation stopped the staging service before copying private storage; all **72 regular data files** matched by hash. The backup retains the restricted staging environment. Existing test billing and OCR configuration were reused; only `CRP_BUILD_ID` changed. Automatic rollback on service/local-health failure remained in place. Public health confirms the exact build, `deployment=staging`, `billing_mode=test` and `launch_ready=false`.

Rollback: stop only `crp-wizard-staging.service`, restore the backed-up staging environment and repoint `current` to the retained previous release, then restart and verify health. Preserve current private consumer data; do not overwrite it from a snapshot without a demonstrated recovery need. The earlier Batch 58 release and its proof remain recorded in `CRP_STAGING_DEPLOYMENT_2026_10_08.md`.

## Measured hosted acceptance

**All 22 hosted checks passed**, using two disposable accounts, fictional contact details and a generated fictional PDF:

- Exact staging/test build; all 82 selections have bureau choices; both test accounts created.
- Sign-in opens Step 2; actual browser offers Canadian Equifax/TransUnion; selected TransUnion persists with its case.
- Back navigation displays account details without auth prompts or confusing provider/build text; saved contact is returned only to its owner.
- A case-list response is deliberately held until after the consumer returns to Account and selects a passport file. Releasing it preserves the Account screen, document type and selected file.
- An unpaid account uploads ID; owned retrieval returns exact original bytes; another account cannot retrieve or delete it and sees no contact inventory from the owner.
- Privacy inventory includes the supporting file; reload retains contact/documents without sign-in prompts.
- Unpaid subscriber packet access still returns 402; consumer removal succeeds and the removed file returns 404.

Both fictional accounts were deleted with HTTP 200 and their sessions then returned 401. Browser screenshot review confirms the intended signed-in account layout. No payment was performed or entitlement fabricated. The local actual Wizzard test separately downloads an approved ZIP with exactly three selected original support documents; an independent Python ZIP reader verified CRC, Unicode filenames and exact binary contents.

## Preserved failed evidence

The first account candidate (`181c838`, build `crp-v1-6c186087edd245b8`) passed its local frozen run but failed hosted acceptance after ten checks: a delayed case response navigated away from the Account form. Both test accounts were cleaned up. Root corrected context guards and cancellation redraws, verified the repair independently, repeated the full frozen regression and passed the held-response hosted test above. The initial hosted failure remains failure evidence.

A focused run with 130 passing behavioral assertions failed its source-freeze gate because the manifest was regenerated while it ran. That record is also preserved as failed evidence; the final unchanged-source full run is the release evidence. Earlier development/fixture failures are retained separately and are not reported as passing runs.

## Evidence locations and remaining boundaries

Ignored local operational evidence: `accelerated-launch/service/out/staging-account-repair-2026-10-08/`, including `package-receipt.json`, `candidate-activation.json`, `activation.log`, `hosted-account-verification.json`, `fictional-account-staging.png`, separate source audit and packaging/activation/verification scripts. Final full regression: `accelerated-launch/service/out/current-regression-evidence.json`. Initial candidate and failed hosted records: `accelerated-launch/service/out/staging-account-2026-10-08/`.

**Account/contact/document/bureau implementation CLOSED; hosted account flow VERIFIED.** Legitimate hosted checkout/payment/webhook confirmation, approved subscriber packet download and owned comparison/re-aging acceptance remain **PENDING** in Batch 58. The approved selected-document packet mechanism is locally tested; unpaid hosted refusal does not establish the paid journey.

Current UK dedicated-family evidence, release-check/evidence reconciliation and production configuration/capacity/backup-restoration/provenance remain open. Four US month readings and absent/ambiguous source fields retain their documented limits. All 82 promised selections and the 19 active common-error checks remain intact. This release does not establish every check in every bureau layout or production readiness. No private report, payment, production activation or external correspondence occurred.
