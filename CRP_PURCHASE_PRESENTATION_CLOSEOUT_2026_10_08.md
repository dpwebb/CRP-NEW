# Batch 70 — paid reports and cumulative upgrade credit

## Status

Implementation CLOSED. Measured staging VERIFIED. Corrected frozen regression passes **13,069 assertions**, with zero failures or skips, all **143 sections completed**, **246 matching source hashes**, zero drift or unrun sections, and **17/17 closure records** re-derived. The complete process exits 0. Production remains OPEN.

## Owner request delivered

- Retire consumer sample-report invitations and buttons.
- Paid assessment downloads are branded PDFs, with clear issue summaries, the printed agency names, report facts and their source locations, page numbers, and a simple next step. The one-report purchase remains separate from subscriber dispute packets.
- Show subscription benefits on Results, Plans and the paid PDF: choose and review disputes, print and mail the approved packet, compare later reports, and keep report history together.
- Count **every unused payment for a lower-priced plan**, as the owner expressly confirmed. Preserve the existing CAD catalog: one report 5.95, monthly 7.95, yearly 79.50.

## Credit and payment behavior

Only verified cash receipts count. A discounted monthly purchase contributes its actual cash payment, not the full catalog amount. Checkout and its first invoice are one receipt. Historical invoices are retrieved under the signed-in account's confirmed provider subscription; missing provider evidence refuses a guessed price.

Credits do not expire. The first upgraded bill applies available credit once; renewals use the catalog price. Any unused remainder remains in the account. Account-owned allocations reserve atomically, settle only on verified payment, and release after confirmed provider failure, expiry or voiding. Client prices and return URLs grant nothing.

A monthly-to-yearly change updates the existing provider subscription, requires a current reviewed price, and keeps monthly access until the actual yearly invoice is confirmed. A failed payment cannot create annual access. An uncertain provider response retains its request and credits; resuming reads the bound invoice before another saved-card update. Voiding a pending upgrade restores the original monthly binding. Canceling renewal first stops any pending upgrade and then cancels renewal of the same subscription.

Refunds reduce unused cash by the provider's cumulative refunded total, without rewriting the original payment or spending a refund twice. Partial refunds preserve the still-paid subscription period. Full refunds and disputes revoke the refunded purchase; an earlier refunded payment cannot revoke an independently paid later subscription. Refunded source credit invalidates an unpaid discounted upgrade and requires a new quote.

For a nonzero first bill below CAD 0.50, apply a slightly smaller credit so the bill remains chargeable and leave the remaining cents in the account. Fully credited bills still cost zero. This avoids Stripe automatically deferring an invoice below its minimum to a later bill. See [Stripe's invoice behavior](https://docs.stripe.com/api/invoices) and [currency minimums](https://docs.stripe.com/currencies#minimum-and-maximum-charge-amounts).

## Verification

- Historical hosted defect on `crp-v1-69ef065334b3386a`: all 115 hashes, public assets and unpaid locks were verified. Actual Stripe test billing accepted a CAD 71.55 yearly invoice after CAD 7.95 unused monthly credit, on the same subscription. The application refused its signed event because the endpoint uses `2025-04-30.basil`, which omits the invoice fields expected by the pinned `2024-06-20` REST contract. Access remained monthly, but the paid upgrade was unconfirmed. This defect is fixed and verified below.
- Smallest repair: verify the signature and event mode, retrieve that signed invoice ID through the existing pinned REST API, and validate invoice/subscription identity and mode before applying the existing account, price and amount gates. A stale failed-payment snapshot cannot undo a canonically paid invoice. Faithful modern webhook tests exercise the actual schema rather than changing the provider version.
- Read-only review identified a related delayed same-plan receipt defect: the old receipt could replace the current payment identity, letting its refund revoke newer paid access. The fix records its verified cash once while preserving a newer paid period and payment identity. Both repairs passed **724 affected assertions**, the separate Stripe adapter test and the new complete frozen gate.

- Focused real-service checks verify PDF access/privacy, cumulative ledger receipts, amount/currency/account binding, canonical invoice deduplication, pending and paid upgrades, refunds, cancellation and recovery.
- The provider fixture runs locally, with signed Stripe-shaped events through the production verifier and actual HTTP service. It creates no external objects and moves no money.
- Actual local-browser tests exercise one-off payment return, report access, PDF download, subscription return, selection/review/approval and packet printing. PDF pages are rendered locally and visually reviewed.
- Actual PDF download uses a readable country/region name and the same authoritative credit quote used by Plans.
- Actual report field keys are replaced with readable labels such as Date opened and Date closed. Final visual review confirms this in the owned HTTP download. The final full run restarts after that repair; the interrupted prior run is not release evidence.
- Full frozen totals, source hashes, closure records and release provenance are recorded below.
- The first completed full run found three historical test assumptions (same-plan repurchase for later cases and old wording), with 12,993 passed, 3 failed and no skips. Those sections now reuse one verified subscription and check current purchase terms; all 156 affected assertions pass. Shipped runtime bytes are unchanged. A new complete run supplies the release evidence.
- Pre-repair frozen full run: **13,001 passed / 0 failed / 0 skipped**, all **143 sections completed**, **246 source hashes** still matching, no source drift or unrun sections, and **17/17 implementation closure records** re-derived. The complete process exits 0. Historical manifest **69EF065334B3386A96DE911A60EF3C9A9E6BB7F02A40AE59BBDC10FEDED07B2E**, **115 shipped files**. The corrected complete run above supersedes this candidate.
- A fresh fictional monthly purchase on the preceding staging release was confirmed by the actual Stripe test Checkout and its matching applied signed webhook. The corrected candidate used that existing account to verify historical-credit import and the in-place yearly upgrade.

## Corrected staging release

Source **3274897295dac89e15ec86a9666ff730730f9ef6**, build **crp-v1-6671d7a0dd3c9d27**, activated **2026-10-09T02:36:46.733Z**. Manifest **6671D7A0DD3C9D270575AD1DC11FA7244FCEEB06E5A79313603D271C119FE325**, **115 shipped files**, archive **4D978EC5308AA8E6F29388208EBD0FA2134EDF9BAB70BAA59F124F4555E051CD**. Every deployed hash matches. The preceding release and a verified restricted 77-file stopped-service snapshot remain available for rollback.

Five public source/health checks pass. The owned unpaid account has matching authoritative quotes on Plans and access, no borrowed payment, no pending purchase, and 402 locks on Results, PDF and packet routes. Actual served Plans show the benefit graphics, readable prices and the all-unused-payment explanation; sample invitations are absent.

Actual Stripe test-mode verification passes: existing monthly cash **795 cents** is imported once; the reviewed yearly upgrade pays **7,155 cents**, with annual renewal **7,950 cents**, on the same provider subscription. Stripe itself resent the original paid invoice through its official event retry mechanism. The matching genuine signed event is **APPLIED / UPGRADE**, and the owned API confirms active annual access. No synthetic re-signing or second charge was used. The actual owned assessment PDF downloads successfully. Renewal cancellation is confirmed at the provider and application. The temporary test subscription is ended; its account, files and session are deleted, and the local credential binding is sanitized.

Ignored local proof: `accelerated-launch/service/out/staging-purchase-webhook-2026-10-08/` contains the full log, frozen package/activation receipts, public-source checks, unpaid locks, before-fix invoice evidence and served Plans screenshot. `out/staging-purchase-2026-10-08/hosted-upgrade-verification.json` and its cleaned fictional fixture retain the actual hosted upgrade/cancellation/cleanup evidence. No private consumer artifact or credential is committed.

## Release boundaries

Keep all 82 jurisdictions, the active 19-check scope, the sole breach label VIOLATION, and information-only court deadlines. The one-report PDF does not grant packet access. Consumers review and approve their letters and mail their packets.

The measured hosted test-mode transition is verified in addition to local Stripe-protocol tests. The existing REST API version remains pinned. Staging keeps test billing and `launch_ready=false`; live billing and independent production release gates remain OPEN.

The unrelated owner pricing draft `IMPORTANT 2026-10-7.txt` is preserved outside this release. Isolated writers own bounded files and commits; root integrates serially and owns the release.
