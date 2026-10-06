# B5-PREFLIGHT-003 — Matched hosted test payments (owner browser step)

**Test mode confirmed:** Stripe account `acct_1RTRWOKCM3e4JIjW`, country CA, `sk_test_` key, `livemode:false`,
charges enabled. Every link below is a **test-mode** hosted Checkout — no live charge occurs.

This Cline environment has **no browser tool**, so the hosted Checkout completion is paused for owner
completion. The script is corrected to run the flows **sequentially**, waiting for each matched,
signature-verified webhook before the next step, and using **separate test accounts** so one credit never funds
both upgrades.

## Run it

```
node SOURCE_CAPTURES/B5-PREFLIGHT/prepare-matched-checkouts.cjs
```

The script starts `stripe listen` (forwarding to `http://127.0.0.1:8787/api/billing/events`) and the local
service, then presents **five** links, one at a time, in this order. The listener and service stay running for
the whole run (up to `CRP_MATCHED_WINDOW_MS`, default 15 minutes) and are stopped only by the script when it
finishes.

## Owner action — complete each link in order

Pay each hosted Checkout with the official Stripe **test card**: `4242 4242 4242 4242`, any future expiry, any
CVC, any name.

| # | Link | Purpose | Expected after completion |
| --- | --- | --- | --- |
| 1 | ONE-TIME (CAD 5.95), bound to a case | establishes the eligible credit + the purchased-case download | credit eligible; report download gate passes (HTTP 409 = entitled, no result yet) |
| 2 | MONTHLY prerequisite ONE-TIME | separate account's own credit | credit eligible for that account |
| 3 | MONTHLY upgrade | applies the CAD 5.95 credit once | first invoice subtotal **CAD 2.00**, renewal CAD 7.95 |
| 4 | ANNUAL prerequisite ONE-TIME | separate account's own credit | credit eligible for that account |
| 5 | ANNUAL upgrade | applies the CAD 5.95 credit once | first invoice subtotal **CAD 73.55**, renewal CAD 79.50 |

The script waits at each step for the matched webhook, verifies the entitlement/credit transition, then records
sanitized evidence to `accelerated-launch/service/out/b5-matched-payment-evidence.json` (including the actual
Stripe invoice amounts with tax kept separate, and no credential or customer identifier).

## What this flow does not re-test (already covered elsewhere)

- **Duplicate delivery** and **unpaid / unrelated sessions**: the service's idempotency (same event id or
  semantic fingerprint) and its refusal of `payment_verified:false` and foreign session ids are already exercised
  by the mock suite (`t-entitlement`, `x-b4-pay-001`) and by the generic `stripe trigger` delivery in
  B5-PREFLIGHT-002. A hosted Checkout always pays, so those paths cannot be reproduced from a real browser
  completion.

## Security

The signing secret is supplied only to the local process. No credential, full event payload or customer
identifier is published or written. The temporary data directory is removed when the script exits.

