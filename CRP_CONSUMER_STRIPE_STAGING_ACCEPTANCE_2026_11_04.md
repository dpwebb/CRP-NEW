# Consumer staging Stripe acceptance

Accepted on 2026-11-04 UTC for `staging.creditregulatorpro.com`, build `crp-v1-cc03edaa6460e477`, in Stripe Sandbox `acct_1UXpVvCHUEVNsXmc`.

The first staging checkout returned HTTP 502. A direct test request reproduced Stripe's HTTP 400. The Sandbox had Managed Payments enabled by default, which rejected the application's Checkout submit text. The fix was to turn off that default in the test-mode Stripe dashboard. This was a provider setting change, so there is no application patch to commit. The existing staging webhook and verified Sandbox prices remained in use.

| Currency | One report | Monthly | Annual |
| --- | ---: | ---: | ---: |
| CAD | 15.95 | 27.95 | 279.50 |
| USD | 14.95 | 25.95 | 259.50 |
| AUD | 15.95 | 27.95 | 279.50 |
| GBP | 13.15 | 24.25 | 242.50 |

All 12 fresh fictional Checkout Sessions completed and were paid at the configured price and currency. Each matched an applied Consumer activation event and a Stripe Sandbox event for the same session or invoice. One-time purchases used `checkout.session.completed`. Subscriptions used `invoice.paid`. The full matrix superseded the seven old fictional attempts as acceptance evidence. The old records were preserved and their sessions were never retried.

The CAD monthly-to-annual upgrade required a reviewed quote, applied a CA$27.95 credit, collected CA$251.55 in Sandbox, and activated the annual plan. Consumer and Stripe both recorded cancellation at the end of the billing period. Cleanup removed 12 staging test accounts and their fixture data, ended eight Sandbox subscriptions, and deleted eight Sandbox customer objects. Stripe retains its transaction history.

The following SHA-256 values identify the restricted receipts in the staging acceptance directory `/opt/crp-acceptance/new-sandbox-billing-20261104-r3`.

| Receipt | SHA-256 |
| --- | --- |
| matrix-proof.json | efbbcfb51a6dd77bf36a7091148adea26c0027ff79dfa0f71c78419820393879 |
| upgrade-proof.json | 80a5e5c54286a8697e54cd10202d74728ac6ec8091c734f8f2dca1b58b51c4d7 |
| cancel-proof.json | 9bea4b7d1f76715ed0bf91b482bcb6adcbaf6ed6eaace2b708e7a1a576f0311c |
| cleanup-proof.json | 88a3aa08856dbc9d39bf3468901a87fbb27f24af62e9c312622e083d07697d0a |

Acceptance scope is Consumer staging and Stripe Sandbox only.
