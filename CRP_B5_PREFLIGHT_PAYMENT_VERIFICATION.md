# B5-PREFLIGHT — Payment verification record

Order: B5-PREFLIGHT. Date: 2026-10-01. Scope: distinguish mocks from real Stripe test-mode operations and
completed test payments; record actual invoice/currency/amount/status. No live charge, no live provisioning,
no deployment.

## The three levels, and where each stands

| Level | What it is | State |
| --- | --- | --- |
| 1. Local mocked tests | the service's Checkout-Session → webhook → entitlement/credit path, exercised with the in-process test adapter and a local mock Stripe server | **COMPLETE** |
| 2. Stripe test-mode API operations | real calls to `api.stripe.com` with the owner's test key: account, prices, coupon, a Checkout Session | **COMPLETE** |
| 3. Completed test payments + verified webhook deliveries | a real charge/invoice produced and a real Stripe-signed webhook delivered to and verified by the service | **PARTIAL** |

## Level 1 — local mocked tests (complete)

`accelerated-launch/service/tests/sections/x-b4-pay-001.cjs` (21 assertions) plus `test-stripe-adapter.cjs` and
`test-upgrade-credit.cjs` exercise every authorized flow against the real service over HTTP with the test
adapter and a mock Stripe server. The nine flows map as follows:

| # | Flow | Exercised at |
| --- | --- | --- |
| 1 | one-time payment → verified webhook → exactly one purchased-case download | `x-b4-pay-001` §8 |
| 2 | monthly upgrade → CAD 5.95 credit → first subtotal CAD 2.00 | `x-b4-pay-001` §2, `test-upgrade-credit` |
| 3 | annual upgrade → first subtotal CAD 73.55 | `test-upgrade-credit` (7355), `x-b4-pay-001` §3 |
| 4 | renewals at 7.95 / 79.50 | `test-upgrade-credit` (renewal_cents), `x-b4-pay-001` §2 |
| 5 | failed/expired checkout releases the reservation | `x-b4-pay-001` §5 |
| 6 | concurrent upgrade sessions cannot redeem twice | `x-b4-pay-001` §3 |
| 7 | refund/dispute prevents further use of the credit | `x-b4-pay-001` §6 |
| 8 | duplicate / out-of-order event payloads do not duplicate effects | `t-entitlement` (idempotency), `recordEvent` semantic fingerprint |
| 9 | cross-account customer/session/case references refused | `x-b4-pay-001` §8, `t-entitlement` (ownership) |

## Level 2 — Stripe test-mode API operations (complete)

Recorded in `accelerated-launch/service/out/b4-pay-evidence.json` (account, prices, coupon, session) and
re-verified in `b5-preflight-payment-evidence.json`:

- Account `acct_1RTRWOKCM3e4JIjW`, country **CA**, charges enabled, **livemode false** (test).
- Prices: `report_once` 595 one-time, `monthly` 795/month, `annual` 7950/year — all `cad`, all active, all test.
- Coupon `HG6NEm9l`: 595 cad, `duration: once` (first invoice only).
- A hosted Checkout Session `cs_test_…` was created (B4-PAY-001).

## Level 3 — completed test payments + verified webhooks (partial)

**Completed test payments: evidenced** — via the Stripe API, producing REAL charges/invoices (not a created
session, not a mock), recorded in `out/b5-preflight-payment-evidence.json`:

| Payment | Flow used | Result |
| --- | --- | --- |
| One-time | PaymentIntent + test card (NOT Checkout Session) | charge `ch_3ULsU2…`, status **succeeded**, amount_received **595 cad**, `paid: true` |
| Recurring | Subscription + first invoice (NOT Checkout Session) | invoice `in_1ULsU5…`, status **paid**, amount_due/paid **795 cad**, real month period boundary |

**Verified webhook deliveries: NOT evidenced.** A Checkout Session cannot be completed through the API — it
requires the hosted Checkout page (a browser) or the Stripe CLI. Neither the Stripe CLI (`stripe listen` /
`stripe trigger`) nor a tunnel (`ngrok`/`cloudflared`) nor a public HTTPS webhook endpoint is available in this
workspace, and a public endpoint requires a deployment that is not authorized. The service's
Checkout-Session → webhook path is therefore exercised by mocks only; its signature scheme is the exact
Stripe `Stripe-Signature` (`t=`/`v1=` HMAC-SHA256), unit-tested in `test-stripe-adapter.cjs`.

**Exact blocker for full Level 3:** the Stripe CLI (webhook forwarding + event trigger) or a public HTTPS
webhook endpoint on the deployed host — either of which requires the deployment step (B5) or a local dev tool
install, neither authorized by this order.

## Production readiness vs test-verified (kept separate)

`release-check.cjs` now distinguishes the key mode from `STRIPE_SECRET_KEY`:

- `NOT_CONFIGURED` — no keys.
- `CONFIGURED_NOT_VERIFIED` — keys present, no evidence.
- `TEST_VERIFIED_NOT_LIVE` — test keys + test evidence (the current state).
- `LIVE_READY` — requires a **live** key (`sk_live_`) AND live evidence (a real live charge), neither of which
  is authorized or present.

`PAYMENT_PROVIDER_IS_CONFIGURED_FOR_BILLING` remains **launch-blocking** in every state except `LIVE_READY`,
so test-mode evidence and test keys can never be mistaken for working live billing. Verified with a test key:
the check reports *"Stripe is test-verified (account acct_1RTRWOKCM3e4JIjW, test keys), but test-mode evidence
and test keys do not make billing live-ready."*
