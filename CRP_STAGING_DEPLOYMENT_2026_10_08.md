# Owner-directed staging deployment — October 8, 2026

Authority: the owner's explicit instruction, "make a note of these gaps and commit-push-deploy to staging." The five closeout gaps and their measured statuses are recorded in the single `CRP_VERSION_1_SEVEN_DAY_WORK_REGISTER_001.md`, Batch 58. Target: https://staging.creditregulatorpro.com, configured `hostinger-vps` host (srv1616603, 187.127.252.51). Only `crp-wizard-staging.service` was activated.

## Exact source and release

- Runtime source commit: `f71585e32430f4273a3b8d6a1eca878fc792c48e`, pushed to `origin/main` before packaging; clean committed source.
- Served build: `crp-v1-0680404381fe7a71`.
- Manifest digest: `0680404381FE7A713D02FC845799D439ED448B3D5B4F89BC1255F3E8A449C461`, **92 shipped files**.
- Archive SHA-256: `320D4F6EA33F127F15AABE1C895C28285957F55ACE4D48BA3829FC5F9F88A090`.
- Current release: `/opt/crp-wizard-staging/releases/crp-v1-0680404381fe7a71`.
- Activation timestamp: `2026-10-08T03:47:55.249Z`.
- Frozen implementation evidence reused: **11,006 passed / 0 failed / 0 skipped**, **126 completed sections**, **211 tested-source hashes matching**, no source drift or unrun sections; separate source audit **23/0/0**, **17/17 implementation closure records**.

Packaging checked the current frozen source hashes, all manifest-listed runtime/reader/configuration/UI files, the copied files and clean Git state. The package includes only those 92 files plus `release-manifest.json` and non-secret `deployment-provenance.json`; it contains no private reports or environment configuration. Transfer archive and extracted host hashes/composite digest matched before activation. Subsequent deployment-record commits change documentation only; the runtime source identity above remains the release's provenance.

## Backup, activation and rollback

Previous release: `/opt/crp-wizard-staging/releases/crp-v1-a9740d383ab0bf94`.

Restricted snapshot: `/opt/crp-wizard-staging/backups/before-crp-v1-0680404381fe7a71-1791431273`.

Activation stopped the staging service before copying `/var/lib/private/crp-wizard-staging`; all **72 regular files** in the snapshot matched by hash. Environment backup mode is 600 in a mode-700 backup directory. Existing test billing and OCR configuration were reused; only `CRP_BUILD_ID` changed. The script retained automatic rollback on service/local-health failure. It recorded source, manifest, archive, prior release and backup pointers in `/opt/crp-wizard-staging/candidate-activation.json`.

Rollback: stop only `crp-wizard-staging.service`; restore the backed-up staging environment and repoint `current` to the retained prior release; restart and verify its health. Preserve current private consumer data; do not overwrite it from a snapshot without a separate demonstrated recovery need.

## Measured hosted verification

Public HTTPS health returns HTTP 200, `ok=true`, exact build `crp-v1-0680404381fe7a71`, `deployment=staging`, `billing_mode=test` and `launch_ready=false`. The jurisdiction endpoint retains **82 selections**. The staging service is active. Host reader tools are available: Node v22.23.3, Poppler tools v24.02.0 and Tesseract 5.3.4 with installed English data.

**32 hosted checks passed**, reusing the accepted native/browser smoke:

- Five generated fictional PDFs uploaded and assessed before purchase.
- Split-caption paid-status/positive-balance contradiction yields one **VIOLATION**; the zero-balance control yields none.
- Same-period US `OK`/`30` history yields one **VIOLATION**; ordinary different periods yield none.
- AU listing with literal association/co-borrower captions retains its supported checklist issue.
- Free summaries remain accessible and unpaid packet access returns 402.
- Actual Chrome browser loads the HTTPS Wizzard, opens the US result, shows **VIOLATION** without probable/potential violation wording, and retains all three purchase choices.
- The disposable account was deleted, all five stored uploads removed, and its session returned 401.

**9 physical OCR checks passed** against the deployed module on Linux: the clear fictional glyph remains `OK` with RGB source custody; red, yellow and faint-yellow unknown prefixes remain unresolved rather than becoming a known code. The first standalone driver lacked the service's systemd OCR variables; the corrected driver read only the existing non-secret OCR variable whitelist. No application or host configuration change was needed. This is regional OCR safeguard proof, not a complete image-report upload or paid-packet journey.

Local ignored operational evidence: `accelerated-launch/service/out/staging-2026-10-08/`, including `package-receipt.json`, `candidate-activation.json`, `activation.log`, `hosted-verification.json`, `hosted-ocr-verification.json`, native/browser screenshot and the packaging/activation/verification scripts. The initial failed standalone OCR driver log remains separate from passing evidence.

## Remaining boundaries

**Staging deployment and the measured native/browser/physical OCR smoke are VERIFIED.** Legitimate hosted checkout/payment/webhook confirmation, selected/reviewed/approved subscriber packet download and continuing owned-report comparison/re-aging remain **PENDING**. No payment was performed and no host entitlement was fabricated.

Current UK dedicated-family evidence, release-check/evidence reconciliation and production configuration/capacity/restoration/provenance closeout remain open in Batch 58. Four US month readings and absent/ambiguous report fields remain explicit source limits. This deployment does not establish every checklist category in every bureau layout or production readiness. Production services and live billing were not changed; no private report or external correspondence was transmitted.
