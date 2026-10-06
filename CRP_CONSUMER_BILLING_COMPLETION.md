# BLOCKER-BILLING-001 — billing consumer interface and server enforcement (implementation completion)

October 3, 2026. Local implementation only; no deployment performed. The previously reported staging identity crp-wizard-77c1605b03e2aa8d is an evidence-comparison target, not proof that these local changes are served.

## Measured outcome

5,617 regression assertions passed, 0 failed, 0 skipped (was 5,582; +35 for ba-consumer-billing).

Implementation closed: 14; implementation open: 11; staging verified: 4; staging pending: 21; production launch failures: 25; launch_ready: false.

## What was implemented

BLOCKER-BILLING-001 (subscription and upgrade-credit dashboard), criteria `plan`, `renewal`, `cancellation`, `upgrade_credit`, `isolation` (hosted `journey` remains a separate pending staging criterion):

- **Consumer interface** (`ui/app.js`, new "Billing" step): shows each configured plan's price, currency, purchase type and grants from `/api/billing/plans`; shows the account's recorded access state; explains renewal (one-time purchases never imply recurring billing, recurring plans state their interval); shows a "Cancel renewal" control only for a subscription, with the truthful at-period-end effect; shows the once-only upgrade credit when eligible.
- **Server enforcement** (already present, now asserted for this blocker): configured prices/purchase types from the plan catalog; authenticated, actor-scoped billing views and actions; cancellation sets `cancel_at_period_end` while access continues to the recorded expiry (no refund or immediate termination claimed); a verified one-time payment earns an ELIGIBLE once-only CAD 5.95 credit; an unpaid account is refused paid actions with a named refusal; no provider key reaches the billing view.
- No prices, products, refund terms or billing policies were invented: all figures come from `plan-catalog.cjs` (CAD 5.95 one-time, 7.95 monthly, 79.50 annual) and the existing upgrade-credit configuration.

## Support deployment dependency (from the prior SUPPORT-001 task)

- `CRP_SUPPORT_REFERENCE_SECRET` is documented in `deploy/production.env.example` (key name only, no value) as required for production reference stability.
- A new release check `SUPPORT_REFERENCE_SECRET_IS_CONFIGURED` blocks launch when the secret is unconfigured, so ephemeral process-generated references cannot silently satisfy production readiness. Local development keeps ephemeral references available.

## Verification and evidence

- `ba-consumer-billing`: 35 assertions — pricing accuracy, purchase type, renewal, cancellation at period end, upgrade-credit eligibility, unpaid-state refusal, authentication, account isolation, and the consumer Billing step rendering.
- `consumer-billing-evidence.json` written by `SOURCE_CAPTURES/CLOSURE-POLICY-001/closure-consumer-billing.cjs` (hash-pinned source files and behavioral evidence refs, `staging_verification.status=PENDING`).
- The existing `t-entitlement` and `x-b4-pay-001` suites continue to cover activation, idempotency, signature verification, refund/dispute revocation and download entitlement.

## Status boundary

- Implementation: `IMPLEMENTED_AND_TESTED` — all five functional criteria are implemented and covered by passing behavioral tests.
- Staging verification: `PENDING_VERIFICATION` — the consumer interface and endpoints have not been exercised on a deployed build.
- Production: unresolved — the release checker still records this blocker as a production launch failure.

## Remaining boundaries

- No deployment performed; no staging/production readiness is claimed. Live billing, synthetic-vs-real payment distinction and the read-only legacy corpus are unchanged.
- The `journey` criterion (deployed sandbox consumer journey including state transitions) remains the hosted staging gap.

Next: architect review. Do not start another blocker.
