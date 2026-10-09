# Batch 70 — paid reports and cumulative upgrade credit

## Status

Implementation candidate built. Final frozen regression and measured staging verification are pending. Production remains open.

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

- Focused real-service checks verify PDF access/privacy, cumulative ledger receipts, amount/currency/account binding, canonical invoice deduplication, pending and paid upgrades, refunds, cancellation and recovery.
- The provider fixture runs locally, with signed Stripe-shaped events through the production verifier and actual HTTP service. It creates no external objects and moves no money.
- Actual local-browser tests exercise one-off payment return, report access, PDF download, subscription return, selection/review/approval and packet printing. PDF pages are rendered locally and visually reviewed.
- Actual PDF download uses a readable country/region name and the same authoritative credit quote used by Plans.
- Actual report field keys are replaced with readable labels such as Date opened and Date closed. Final visual review confirms this in the owned HTTP download. The final full run restarts after that repair; the interrupted prior run is not release evidence.
- Full frozen totals, source hashes, closure records and release provenance will be recorded after the candidate passes.
- The first completed full run found three historical test assumptions (same-plan repurchase for later cases and old wording), with 12,993 passed, 3 failed and no skips. Those sections now reuse one verified subscription and check current purchase terms; all 156 affected assertions pass. Shipped runtime bytes are unchanged. A new complete run supplies the release evidence.

## Release boundaries

Keep all 82 jurisdictions, the active 19-check scope, the sole breach label VIOLATION, and information-only court deadlines. The one-report PDF does not grant packet access. Consumers review and approve their letters and mail their packets.

Local Stripe-protocol tests do not prove the new transitions against Stripe's hosted test account. The existing API version remains pinned. Staging keeps test billing and `launch_ready=false`; production and hosted billing verification remain separate required release gates.

The unrelated owner pricing draft `IMPORTANT 2026-10-7.txt` is preserved outside this release. Isolated writers own bounded files and commits; root integrates serially and owns the release.
