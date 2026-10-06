# B5-PREFLIGHT-002 — Local webhook completion

## What was done

- Installed the Stripe CLI (`stripe` 1.53.0) locally via `winget` (official distribution).
- Authenticated with the owner's test account through the `STRIPE_API_KEY` environment variable only — the key
  was never placed in a command argument, source, report or log.
- Ran `stripe listen --forward-to http://127.0.0.1:8787/api/billing/events` to obtain a temporary `whsec_`
  signing secret and forward real Stripe-signed events to the service's actual webhook route.
- Started the service with the listener's signing secret supplied only to that local process (via
  `STRIPE_WEBHOOK_SECRET`); the production template's webhook secret was not touched.
- Stopped the listener and the service after verification, and removed the temporary data directory.

## Real forwarded webhook evidence

A real Stripe-signed `checkout.session.completed` event was forwarded by `stripe listen` and verified by the
service's `verifyWebhookSignature` (Stripe's `t=`/`v1=` HMAC-SHA256 scheme):

```
Stripe-Signature: t=1790894931,v1=be292a81…,v0=f902bdd3…
verify result: { verified: true }
```

This is **forwarded delivery**, not a mocked signature: the signature header and raw body came from Stripe's
listener, and the verification used the listener's real `whsec`. No secret was printed or written.

## What a generic `stripe trigger` event does vs. a matched checkout

- **Generic trigger** (`stripe trigger checkout.session.completed`, no parameters) fires a session with
  `client_reference_id: null`, empty `metadata`, and a foreign session id. The service **verifies the
  signature** and **refuses** (no account/plan can be resolved → no grant). This is the fail-closed path.
- **Matched checkout** (an event whose session id equals a checkout the service created) is **not achievable via
  `stripe trigger`**: the trigger creates a *new* session (its `id` is server-assigned and cannot be overridden
  with `--add checkout_session:id=…`, which Stripe rejects as an unknown parameter). Completing a specific
  Checkout Session requires the hosted Checkout page (a browser) or a production webhook from an actually-paid
  session.

Therefore the matched-grant path (one-time access, monthly/annual upgrade credit, renewal, refund/revocation)
is exercised by the in-process test adapter and the local mock Stripe server (`x-b4-pay-001`,
`test-stripe-adapter`), and the **forwarded-delivery + signature-verification path is proven real**; the two are
kept distinct in the records.

## Payment flows verified vs. remaining gaps

| Flow | Real forwarded webhook | Local mock |
| --- | --- | --- |
| signature verification of a forwarded event | ✅ verified (see above) | ✅ |
| one-time → purchased-case download | ❌ (needs hosted page/production) | ✅ |
| monthly/annual upgrade credit (CAD 2.00 / 73.55) | ❌ | ✅ |
| renewal at full price | ❌ | ✅ (quote + a real test invoice paid 795 cad) |
| failed/expired checkout release | ❌ | ✅ |
| concurrent upgrades | ❌ | ✅ |
| refund/dispute revocation | ❌ | ✅ |
| duplicate / out-of-order | ❌ | ✅ |

**Remaining gap:** a real, matched `checkout.session.completed` webhook for a service-created session — which
requires either the hosted Checkout page in a browser, or a production webhook endpoint on the deployed host.
Neither is available here, and neither is authorized to be fabricated.

## Smallest remaining owner/external action

Provision (or authorize) a way to complete a Checkout Session end-to-end — the hosted Checkout page in a test
browser, or a production webhook endpoint — so a *matched* completed payment can be delivered and verified
against a service-created checkout. Until then, "matched grant" stays mock-tested and "forwarded delivery" stays
proven real.
