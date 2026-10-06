# B5-PREFLIGHT-002 — Live-readiness criterion correction

The prior `release-check.cjs` made `LIVE_READY` depend on `evidence.live_verified === true`, i.e. on a **real
live charge**. That is wrong: every order to date forbids live charges, so the criterion made an *unauthorized
real transaction* a prerequisite for readiness. This correction removes that prerequisite.

## Correction (applied)

`PAYMENT_PROVIDER_IS_CONFIGURED_FOR_BILLING` now computes:

- `TEST_VERIFIED_NOT_LIVE` — test keys + test evidence (the current state).
- `LIVE_READY` — `sk_live_` keys **and** read-only live-configuration evidence (`live_config_verified`, i.e.
  live prices/account/webhook verified with `livemode:true`). **No live charge is required.**

The launch-blocking check never requires a real transaction. A production smoke transaction is a **separate,
owner-authorized** step, tracked apart from the code gate.

## The four things, separated

| Layer | What it is | How it is satisfied | Requires a charge? |
| --- | --- | --- | --- |
| Test-mode end-to-end | test keys + forwarded webhook + entitlement/credit transitions | test evidence + `stripe listen`/`trigger` | no |
| Live configuration | live keys, live CAD prices, live webhook secret, live origins | read-only `GET /v1/account` + `GET /v1/prices` + webhook endpoint config | no |
| Live webhook endpoint | a live endpoint registered and delivering signed events | the operator registers the endpoint + supplies `whsec_live_` | no |
| Production smoke transaction | one real charge to confirm live billing | **owner-authorized, one-time** | yes — owner's explicit authorization only |

## What this does and does not do

- It **does** keep `PAYMENT` launch-blocking until live keys + live configuration are verified — test keys and
  test evidence still never count as live billing.
- It **does not** silently waive any requirement: live configuration verification and webhook endpoint readiness
  are still explicit prerequisites.
- It **does not** create a live charge and **does not** make one a code prerequisite. The owner may later
  authorize a smoke transaction as a discrete action; that is a governance decision, not a build gate.

## Verification

With a test key and test evidence, the check still reports
*"Stripe is test-verified (account …, test keys), but test-mode evidence and test keys do not make billing
live-ready."* With live keys and `live_config_verified`, it reports `LIVE_READY` **without** any charge.
