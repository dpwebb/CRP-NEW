# Version 1 staging run sheet — candidate `crp-v1-4a88438669cba533`

Owner/tester sheet. One page. Nothing here requires a secret in chat or in Git.

## 1. Candidate identity (frozen — do not rebuild before testing)

| Item | Value |
| --- | --- |
| Manifest file | `accelerated-launch/service/deploy/release-manifest.json` |
| Manifest digest | `4A88438669CBA53349B99591C84B51F36FE1BE96B1E1E67BF7159A2737273572` |
| Build identity | `crp-v1-4a88438669cba533` |
| Shipped surface | 80 files, five disjoint groups (RUNTIME 51 · READER_SUPPORT 9 · RULE_CONFIGURATION 7 · RULE_CONFIGURATION_TOP_LEVEL 9 · SERVED_ASSETS 4) |
| Regression at freeze | `node accelerated-launch/service/tests/run-tests.cjs` → **PASS 5283 assertions, 0 failed, 0 skipped** |
| Statutory coverage | 82 of 82 promised regions carry at least one demonstrated path (coverage — not completeness; see the work register for the four open blockers) |

**Freeze rule:** if any executable file changes, the digest changes and this sheet must be re-issued. Regenerate with `node accelerated-launch/service/deploy/build-release-manifest.cjs` and confirm the digest above; do not hand-edit the manifest.

## 2. Host requirements

* One host with **Node ≥ 20** and **TLS termination** in front of `node accelerated-launch/service/server.cjs`.
* A **durable data directory outside the repository** — the service refuses a path that resolves inside it.
* Optional read support: a Tesseract build if image-only pages must be read; without it those pages are reported as unread, never guessed.

## 3. Configuration variables (names only — values are set on the host)

| Variable | Purpose | Notes |
| --- | --- | --- |
| `CRP_PORT` | Listen port (default 8080) | |
| `CRP_LOCAL_SERVICE_DATA` | Durable data directory | must be outside the repository |
| `CRP_BUILD_ID` | `crp-v1-4a88438669cba533` | the release check validates served evidence against it |
| `CRP_SUPPORT_REFERENCE_SECRET` | salts consumer support references | **generate on the host** (`openssl rand -hex 32`); never paste into chat, never commit |
| `CRP_TESSERACT_EXE`, `CRP_TESSDATA_DIR` | optional OCR read support | unset = native-text PDFs unaffected |
| `CRP_PAYMENT_PROVIDER=stripe`, `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_REPORT_ONCE`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_ANNUAL`, `STRIPE_UPGRADE_CREDIT_COUPON`, `STRIPE_APP_ORIGINS` | billing | **use the provider's TEST-mode values for staging** |

**Billing separation.** Staging runs entirely on **test-mode** values and test cards; the whole paid path (entitlement → packet → download) is exercisable without any live charge. **Authorization for live consumer billing is a separate decision** and is not implied by this sheet — nothing here requires live keys.

## 4. Start and rollback

1. Copy the repository to the host; set the variables above.
2. `node accelerated-launch/service/deploy/build-release-manifest.cjs` — confirm the digest equals `4A884386…3572`.
3. Start: `node accelerated-launch/service/server.cjs` (or the deployment unit of your choice). Confirm the release check reports `crp-v1-4a88438669cba533`.
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
