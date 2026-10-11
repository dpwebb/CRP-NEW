# CRP referral add-on candidate

This folder preserves the local visual preview and focused engine tests. Open `preview.html` locally to inspect the design. Run `node test.cjs` for the executable reward rules. The exact engine now lives in `accelerated-launch/service/referral-engine.cjs`; this folder re-exports it so the preview/tests use the same implementation. The preview uses fictional data and an intentionally invalid example link.

## Staging integration

The authenticated `/referrals.html` workspace and `/api/referrals` routes are enabled only when `CRP_DEPLOYMENT_ENV=staging`. Attribution and rewards are persisted in the private service store. Rewards are created from completed, verified first purchases, using the verified tax amount; a missing tax breakdown blocks the reward calculation. Verified full refunds reverse unpaid portions, while partial refunds hold unpaid portions for review. Run `node accelerated-launch/service/tests/referral-staging.cjs` for the staged HTTP journey. No payout provider or Friday worker is connected; the schedule can be tested without moving funds.

## Proposed program

- Level 1: the direct referrer earns 15% of the verified first purchase price before tax.
- Level 2: the person who introduced that referrer earns 10% of the same tax-exclusive price.
- Level 3: the next introducer earns 5% of the same tax-exclusive price. There is no fourth level.
- All jurisdictions qualify; this module applies no country or jurisdiction filter. The verified purchase currency is retained without conversion.
- Each reward has a 14-day hold. After the hold, 90% is scheduled for the next Friday payout batch. The other 10% is reserved for 180 days from the purchase time and scheduled for the next Friday batch after that period.
- Payout scheduling uses UTC Fridays. A hold that ends on Friday after 00:00 UTC enters the following Friday's batch. The reserve rounds up to the nearest smallest currency unit; the immediate portion is the remainder.
- No reward for enrolling, introducing a referrer, sharing a link, subscriptions renewing, or buying through one's own referral.
- Only the tax-exclusive `subtotal_minor` is the reward base. `tax_minor` and `total_minor` must reconcile, and a server-owned verifier must confirm the purchase against the payment provider.
- A verified full refund reverses unpaid portions and marks paid portions `RECOVERY_DUE`. Partial refunds and recovery collection need a later integration policy.
- The dashboard returns reward status without customer identity, credit-report contents, case details or packet information.

## Integration contract

`ReferralProgram` is an in-memory domain engine. The staging adapter persists its snapshot in CRP's private atomic store. A future live integration still needs payout verification, payout identity and tax handling, a purchase-attribution cookie/consent design, refund recovery, and an auditable Friday payout worker. Never rely on a browser flag or checkout redirect as purchase verification. The staging adapter uses existing verified checkout and billing-event state; no payout is initiated.

The program does not pay anyone or send messages. A future payout worker may consider `eligibleRewards(now)` only on Fridays after rechecking payment, refund, eligibility and the approved policy version. `markPaid` requires verified evidence of an actual Friday payout. Payment-provider or marketing integrations require separate review and authorization. The optional program does not alter CRP's Version 1 pricing, entitlements, consumer flow or 82-jurisdiction obligation.

Before launch, review the compensation terms, marketing copy, tax treatment and operation in each jurisdiction. The [FTC's MLM guidance](https://www.ftc.gov/business-guidance/resources/business-guidance-concerning-multi-level-marketing) and [Canadian Competition Bureau guidance](https://competition-bureau.canada.ca/en/how-we-foster-competition/education-and-outreach/publications/multi-level-marketing-plans-and-schemes-pyramid-selling) emphasize how compensation incentives operate in practice, especially recruitment-focused rewards. This design ties all three rewards to a verified retail purchase; that design choice is not a legal approval.
