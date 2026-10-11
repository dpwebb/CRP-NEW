# Optional mailing UI on staging — October 9, 2026

The owner requested integration of the isolated mailing UI into the CRP staging platform for review. The staged result is a **sample-only design preview**, available at https://staging.creditregulatorpro.com/mailing-preview.html. The existing packet page links to it only on staging when a packet is approved and downloadable. Production does not serve the preview assets (HTTPS 404 verified).

## Served identity and scope

- Staging build: `crp-v1-6632ae5725809c02`; manifest digest: `6632AE5725809C0282FE0818FEE3CB575E5AD6B74D55AC3900B5595CDF9C95CE`.
- Base: the then-served staging commit `7ed67c6cddc95035f7f141ac3386cf54d425934d`, preserving its referral preview and test-billing configuration. Five-file overlay: `accelerated-launch/service/app.cjs`, `accelerated-launch/service/ui/app.js`, and `ui/mailing-preview.{html,css,js}`. All 135 manifest files were SHA-256 verified locally and after transfer.
- Prior release: `/opt/crp-wizard-staging/releases/crp-v1-375903d2be7b3a55`. Activation and rollback pointer: `/opt/crp-wizard-staging/candidate-activation.json`. Pre-activation environment and private-data backup: `/opt/crp-wizard-staging/backups/before-crp-v1-6632ae5725809c02-20261009T234738Z`.
- Only `crp-wizard-staging.service` was switched. Its public health returns the new build, `deployment=staging`, `billing_mode=test`, `launch_ready=false`; the service is active. The preview HTML, CSS and JS and the prior referral page return HTTPS 200.

## Verification and boundary

- The earlier five-file overlay on the previous staging base passed the complete local regression: **14,233 passed, 0 failed, 0 skipped**. When the staging base changed concurrently, the same overlay was rebased onto the new served commit. That final candidate passed **360 focused packet/UI/browser assertions**, the referral staging HTTP journey, syntax checks, the staging-versus-production static gate, and host/public health checks. A second full regression of the rebased referral-plus-mailing candidate was **not** run; these statuses must not be conflated.
- A real browser loaded the hosted preview. Canada and US selections showed the appropriate local service names and changed the illustrative subtotal; the approval dialog opened and the pay/mail control remained disabled.
- Prices and addresses are fictional layout examples. There is no supplier quote, packet upload to a supplier, postal order, mail dispatch, mailing-specific checkout, or payment. The isolated `optional-addons/postal-fulfillment` library is not invoked by the staging preview. This deployment establishes UI review only, not fulfillment readiness or production authorization.
