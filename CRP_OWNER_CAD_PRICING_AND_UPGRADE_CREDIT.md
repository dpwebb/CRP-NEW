# Owner-approved CAD pricing and upgrade offer

Date: 2026-10-01. Source: explicit owner instruction in this conversation.

| Plan | Regular price | Cadence |
| --- | --- | --- |
| One report | CAD 5.95 | One-time |
| Monthly | CAD 7.95 | Monthly |
| Annual | CAD 79.50 | Annually |

A verified one-time purchase earns a CAD 5.95 credit toward the first monthly or annual subscription invoice when upgraded within 90 days of its paid timestamp. First subscription subtotal: CAD 2.00 monthly or CAD 73.55 annual. Subsequent invoices remain CAD 7.95/month or CAD 79.50/year. These are configured subtotals, not a tax determination.

Implementation conventions: one credit per eligible paid purchase, same consumer account, applied once, no stacking in a single upgrade, no refunded/disputed purchase; expires at the paid timestamp plus 90 elapsed days. Expiry convention and anti-reuse safeguards are explicit implementation choices. Never consume a credit merely because checkout was opened; reserve atomically and redeem after verified subscription payment. Failed/abandoned checkout must not consume it. Retry and concurrent checkout must not duplicate it.

The user confirms the existing credentials belong to the intended Stripe account and Hostinger VPS root access. This records identity/price information, not an assertion that the live integration or deployment works. Secrets remain in the existing global environment source and are not copied into this repository.

The local catalog now uses owner-approved CAD pricing rather than legacy USD pricing. upgrade-credit.cjs implements and tests pure eligibility/quote policy; it is not yet wired to Stripe checkout, persistent reservations or webhook redemption. No live product/price/coupon creation, charge or deployment occurred in this change.

The intended paid report surfaces all findings actually supported and authorized by the system. Current implementation still authorizes no VIOLATION/PROBABLE_VIOLATION finding class. Payment does not change that permission; existing factual/policy observations must not be marketed as violations. The report-download entitlement must be integrated separately from packet eligibility; purchasing a report does not authorize a bureau-response packet.

Remaining implementation: Stripe Checkout Sessions, CAD Price IDs, once-only first-invoice credit, verified webhooks, transactional credit reservation/redemption, paid assessment-report download, truthful consumer copy and test-mode end-to-end validation. Current webhook secret must be bound to the actual endpoint. Production findings and release retain their own authorization boundaries.

## Verification

The full service suite passed 4,697 assertions, zero failures or skips. The upgrade-credit policy tests passed separately. Legacy-price parity assertions were replaced with explicit owner-approved CAD price assertions; legacy state-machine comparisons remain. No production integration, redemption, charge or deployment was claimed.
