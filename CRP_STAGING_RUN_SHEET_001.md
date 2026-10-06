# Version 1 staging run sheet — candidate `crp-v1-75755118a71c9399`

**Identity note (Batch 24, October 5 2026) — read before using the table below.** This run sheet describes the **deployed** staging candidate, and staging still serves it: `crp-v1-75755118a71c9399` (manifest `75755118…166A`). The local working tree has since advanced with the coordinated plain-text correction (Batch 24), which changes served wording only — no rule, permission, parse, price or scope. The **current** local candidate identity is `crp-v1-4e2acf545c282d14` (manifest `4E2ACF545C282D145CD2BF36C12C16A4DF2CECEA2616C52E495E1105E4DB2B41`, 81 files in five groups, deterministic across three consecutive runs; full local regression **PASS 5608, 0 failed, 0 skipped**), which carries OWNER-PURCHASE-FLOW-001 — upload and assessment before any purchase, the free results summary and teaser, a one-time unlock of the selected report, and a subscription for the dispute packet and the subscriber features — together with the Batch 28 addendum that refuses a one-time checkout with no valid report to unlock (missing, unknown, another account's, unassessed or already-unlocked reports are refused before the payment provider is called). **Staging now serves `crp-v1-4e2acf545c282d14`** (deployed October 6, 2026 under separate authorization recorded in `CRP_STAGING_DEPLOYMENT_2026_10_06.md`); that hosted run then found two **client** defects — a checkout request sent with no `return_url`, and one stale upload-screen sentence — whose fix is present in the working tree but not yet committed or deployed. The brief public legal-advice disclaimer in the small main-page footer is present and unchanged; step 4 of this sheet exercises it.


Owner/tester sheet. One page. Nothing here requires a secret in chat or in Git.

## 1. Candidate identity (frozen — do not rebuild before testing)

| Item | Value |
| --- | --- |
| Manifest file | `accelerated-launch/service/deploy/release-manifest.json` |
| Manifest digest | `75755118A71C93994F85EB3E9185DAD80220BD8E17FCA19E1007BD165502166A` |
| Build identity | `crp-v1-75755118a71c9399` |
| Shipped surface | 81 files, five disjoint groups (RUNTIME 51 · READER_SUPPORT 10 · RULE_CONFIGURATION 7 · RULE_CONFIGURATION_TOP_LEVEL 9 · SERVED_ASSETS 4) |
| Regression at freeze | `node accelerated-launch/service/tests/run-tests.cjs` → **PASS 5397 assertions, 0 failed, 0 skipped** |
| Statutory coverage | 82 of 82 promised regions carry at least one demonstrated path (coverage — not completeness; see the work register for the four open blockers) |

**Freeze rule:** if any executable file changes, the digest changes and this sheet must be re-issued. Regenerate with `node accelerated-launch/service/deploy/build-release-manifest.cjs` and confirm the digest above; do not hand-edit the manifest.

## 2. Host requirements

* One host with **Node ≥ 20** and **TLS termination** in front of `node accelerated-launch/service/server.cjs`.
* A **durable data directory outside the repository** — the service refuses a path that resolves inside it.
* Optional read support: a Tesseract build if image-only pages must be read; without it those pages are reported as unread, never guessed.

## 3. Configuration variables (names only — values are set on the host)

| Variable | Purpose | Notes |
| --- | --- | --- |
| `CRP_LOCAL_SERVICE_PORT` | Listen port (8792 on this staging host) | |
| `CRP_LOCAL_SERVICE_DATA` | Durable data directory | must be outside the repository |
| `CRP_BUILD_ID` | `crp-v1-75755118a71c9399` | the release check validates served evidence against it |
| `CRP_SUPPORT_REFERENCE_SECRET` | salts consumer support references | **generate on the host** (`openssl rand -hex 32`); never paste into chat, never commit |
| `CRP_TESSERACT_EXE`, `CRP_TESSDATA_DIR` | optional OCR read support | unset = native-text PDFs unaffected |
| `CRP_PAYMENT_PROVIDER=stripe`, `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_REPORT_ONCE`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_ANNUAL`, `STRIPE_UPGRADE_CREDIT_COUPON`, `STRIPE_APP_ORIGINS` | billing | **use the provider's TEST-mode values for staging** |

**Billing separation.** Staging runs entirely on **test-mode** values and test cards; the whole paid path (entitlement → packet → download) is exercisable without any live charge. **Authorization for live consumer billing is a separate decision** and is not implied by this sheet — nothing here requires live keys.

## 4. Start and rollback

1. Copy the repository to the host; set the variables above.
2. `node accelerated-launch/service/deploy/build-release-manifest.cjs` — confirm the digest equals `75755118…166A`.
3. Start: `node accelerated-launch/service/server.cjs` (or the deployment unit of your choice). Confirm the release check reports `crp-v1-75755118a71c9399`.
4. Health: load the main page; the brief public legal-advice disclaimer appears only in its small footer section.
5. **Rollback:** stop the service and restore the previous deployed directory. The data directory is external, so rollback does not touch consumer data.
6. Record the served evidence (build identity, timestamp, the journey in §5) for the release record.

## 5. Owner test sequence (upload → issue → selection → review/edit → approval → download)

Use only fictional data. Take a report that prints an ordinary account whose opened date is later than its closed date (or a judgment entry with an amount omitted, or a dismissed charge).

1. **Account** — create an account, choose country and region (e.g. Canada / Saskatchewan or Prince Edward Island).
2. **Upload** — upload the fictional report; the service detects the presentation and reads it (native text). A supported issue appears if the printed evidence establishes one.
3. **Issue** — confirm the offered card: its plain-language explanation, the **specific uncertainty** (for a probable issue), the request type (verification or correction) and the recorded rule it names.
4. **Selection** — select the issue(s) you want to dispute. An unpaid account is refused with the entitlement message; pay in **test mode** to continue.
5. **Review/edit** — fill the correspondence details (consumer name and contact) and read the packet preview exactly as it will be downloaded.
6. **Approval** — approve the packet. Changing the evidence afterwards invalidates the approval and the download refuses with the stale-approval message.
7. **Download** — download the packet; confirm it names the recorded rule, the omitted/conflicting content and a correction or verification request.

**Expected controls:** another account cannot select on or download your packet (403); an unpaid account cannot reach the packet path (402); no internal rule identifier appears in consumer-facing text.

## 6. What is *not* claimed

The owner authorized staging deployment and test-mode billing on October 6, 2026. The destination host remains pending. Live billing is not authorized. Staging status is **PENDING**; production is **BLOCKED** pending the four open blockers reconciled in the work register. One demonstrated statutory path per jurisdiction is coverage, not completeness.

## October 6 Canada-first served correction — current status

Current build: crp-v1-75755118a71c9399. Manifest SHA-256: 75755118A71C93994F85EB3E9185DAD80220BD8E17FCA19E1007BD165502166A (81 files, including the required jurisdiction-data runtime dependency). Full local regression: 5397 passed, zero failed or skipped.

Deployed to the authorized Hostinger VPS at https://staging.creditregulatorpro.com. Public health confirmed this build, staging environment and test billing mode. A real-browser fictional account selected Alberta and confirmed the active requirements/upload-to-issue-to-selected-packet wording; the obsolete no-statutory/no-check/no-TransUnion-rule statements are absent. No private report or payment was sent to staging. Complete hosted upload/checkout/packet acceptance and production readiness remain separate and pending.

The prior build and private environment/data were backed up before the service switch; activation provenance and rollback location are recorded on the host in /opt/crp-wizard-staging/candidate-activation.json. Only the staging wizard service was changed. No live charge, Git push or production deployment occurred. This current entry supersedes earlier destination-pending and candidate-identity statements.
## Checkout return correction — October 6, 2026

Current served build: crp-v1-1133cf76c411450f. Manifest: 1133CF76C411450F29F892BCACAA71CE681999DD7D3EDA70FE5864E5EF4EC1E3, 81 verified files. Full final regression PASS 5610 / 0 / 0 (including browser return-origin and selected-case assertions). An earlier full run caught one obsolete access-copy expectation; corrected and rerun successfully.

Both results and billing buttons now use the shared checkout handler, sending return_url from the application's own origin and preserving the selected case. A successful Stripe response navigates to the returned checkout.stripe.com URL. Free-assessment access wording corrected. No prices, Stripe keys, classification or entitlement rules changed.

Activated on authorized staging with environment/private-data backup and previous release retained; public health confirms this build and test mode. Real hosted browser reopened the fictional assessed case and clicked its one-time unlock; Stripe sandbox checkout loaded successfully. No payment submitted, no live charge, no private report sent, no Git push. Completed payment/webhook/unlock acceptance remains pending. Previous missing-return-url defect is closed. Activation provenance and rollback: /opt/crp-wizard-staging/candidate-activation.json.