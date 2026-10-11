# CRP referral add-on: staging certification record

Date: 2026-10-09 (America/Halifax)

## Result

The three-level referral add-on is integrated into the CRP staging service for functional testing. The active staging build is `crp-v1-375903d2be7b3a55`, from isolated commit `7ed67c6cddc95035f7f141ac3386cf54d425934d`. Its shipped-asset manifest digest is `375903D2BE7B3A55C6FED199CD6596555C11DB014AD5300B10BE2339CF017B20` (132 files). The deployed release was hash-verified before activation.

`https://staging.creditregulatorpro.com/api/health` reports this build, `deployment=staging`, `billing_mode=test`, and `launch_ready=false`. The previous release and a stopped-service data backup remain on the staging host. The activation receipt is `/opt/crp-wizard-staging/candidate-activation.json`; the latest backup is `/opt/crp-wizard-staging/backups/before-referral-20261009T230823Z`.

## Functional evidence

- The isolated referral HTTP journey passed: authenticated enrollment and attribution, three-level ancestry, first-purchase reward creation, tax-exclusive calculation, hold/reserve dates, refund handling, account deletion, privacy, and production environment isolation.
- The full candidate regression completed with 14,208 assertions passed and one failure caused by a missing generated `consumer-wizard/dist/app.js` fixture in the isolated worktree. After restoring the existing generated UI fixture to that worktree, the affected plain-text section passed 29/29. No application defect was identified in that section.
- Following the Stripe invoice-tax repair, the Stripe adapter test and referral journey passed, as did 623 focused entitlement, provider-upgrade, billing, and plain-text assertions.
- Hosted health, referral HTML/JS/CSS, authenticated API access, 82-region catalogue, and absent payout route passed. Unauthenticated referral API access returned 401. The referral static/API routes returned 404 on the production hostname.
- Five fictional accounts established a three-level chain and buyer attribution on staging. A Stripe **test-mode** monthly purchase of CAD 7.95 created these pending rewards from a verified zero-tax invoice: level 1 CAD 1.19 (15%), level 2 CAD 0.79 (10%), level 3 CAD 0.39 (5%). The initial Friday portions are CAD 1.07, CAD 0.71, and CAD 0.35, due 2026-10-30 after the 14-day hold. The 10% reserves are CAD 0.12, CAD 0.08, and CAD 0.04, due 2027-04-09 after 180 days and the next Friday schedule.
- The first sandbox purchase exposed an unknown invoice-tax value. The engine correctly withheld rewards. The adapter was repaired to read Stripe's verified `total_tax_amounts`; a fresh hosted purchase passed end to end on the revised build.

## Certification boundary

This record certifies **staging integration and functional reward accounting**, including one real Stripe sandbox checkout and signed webhook. It does not certify legal availability of referral compensation in each jurisdiction, live payout operations, a payout provider, actual Friday transfers, or production readiness. The payout endpoint is absent and all rewards remain pending. The staged program is isolated from the production hostname and from the version 1 release decision.
