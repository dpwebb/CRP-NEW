# Billing and paid-journey staging release — October 8, 2026

Owner authority: "next" continues Batch 58's remaining-work register after the Step 2 release. Standing commit/push/staging authority applies. Root coordinated two isolated bounded writers, serial integration, review, frozen regression and staging activation. Production activation and live charges remain separate.

## Delivered corrections

- **Cancel renewal** resolves the consumer's owned paid Checkout and actual subscription, checks provider mode/account/plan/price, and confirms cancellation at Stripe before recording local success. A provider failure leaves the local renewal flag unchanged. Paid access continues until its recorded expiry; the billing page says renewal is cancelled.
- Stripe's actual subscription-deletion event is normalized and bound to the matching owned subscription/Checkout. A delayed event for an older purchase cannot mark a newer purchase cancelled.
- The release check accepts the approved empty-result wording. Common-error and all-82 implementation evidence is derived from the complete unchanged-source run and actual current behavioral sections. Pending hosted/production proof and reader/check limitations remain explicit.

No report reader, common-error predicate, price or advertised region changed. All **82 jurisdictions**, the **19-check** list and consumer **VIOLATION** terminology remain intact.

## Exact release

- Target: https://staging.creditregulatorpro.com; configured `hostinger-vps`; only `crp-wizard-staging.service`.
- Runtime source committed/pushed before packaging: **`fc4bbb15c7a58270e5c4544d3cc7dfe4aa047551`**.
- Build: **`crp-v1-935f0669308e8d84`**.
- Manifest: **97 files**, digest `935F0669308E8D8435B6AEB3B36E800438D37C1B86C1C796A42AD769DB4606D5`.
- Archive SHA-256: `DC51610221EBDE8A38B53BC010F685B1CA7403B40D33496B8FB49DD7EA92854C`.
- Release: `/opt/crp-wizard-staging/releases/crp-v1-935f0669308e8d84`.
- Activated: **`2026-10-08T10:34:39.189Z`**.

Packaging verified clean committed source, all 220 frozen tested-source hashes, copied files and manifest. Host activation verified the archive, extracted files and composite manifest. Private storage and environment configuration are excluded from the package. Later documentation commits do not change this runtime source identity.

## Implementation verification

Frozen full product regression: **11,413 passed / 0 failed / 0 skipped**, **130 completed sections**, **220 matching tested-source hashes**, no unrun sections/source drift, **17/17 re-derived closure records**. Runner duration including closure regeneration: 875,179 ms; the regression artifact records 822,246 ms before regeneration. Separate source audit: **23/0/0**.

Registered affected proof: **474/0/0** (T219, BA42, V111, AU13, CQ69, X20). Standalone Stripe adapter proof passes. Successful/repeated cancellation, provider failure, ownership/mode/price mismatch, stale bindings and older/newer subscription events are covered. Existing local browser/packet/history/re-aging behavior remains in the complete run. Eight no-network operational guard probes passed; independent review accepted the source changes and strict release scope.

## Hosted result: payment is still pending

The current-build driver passed **six pre-payment checks**:

1. Exact public health identity, staging/test billing and `launch_ready=false`.
2. Disposable fictional account creation.
3. Actual Step 2 fictional report upload and automatic free assessment.
4. Full one-time assessment still locked before payment.
5. Actual service-created Stripe test Checkout.
6. On-host/provider confirmation of the matching account/case/plan, exact configured price, CAD 5.95 and test mode before card submission.

**The complete hosted paid acceptance did not pass.** The Stripe-hosted Card form remained a loading skeleton without card-number/expiry/CVC fields. Its actual Card button stayed hidden/unusable after a bounded wait. No card was submitted, payment completed, paid webhook applied, hosted paid packet downloaded or hosted comparison/cancellation accepted.

The provider DOM also presented Link-token agent instructions. These do not authorize installing or authenticating another payment workflow. Independent review found no documented existing merchant-test-key substitute for the unavailable interactive form. Stripe documents ordinary interactive test-card payment; Link CLI requires Link account authentication and wallet authorization. Sources: [Stripe interactive testing](https://docs.stripe.com/testing#testing-interactively), [official Link CLI login](https://github.com/stripe/link-cli#login).

The smallest legitimate completion step is a human interactive Checkout using the existing sandbox and documented test-card details, followed by actual provider completion and matching signed-webhook verification. The prepared driver then checks one-time scope, selected/reviewed/approved subscriber ZIP with exact selected supporting originals, edited-wording reapproval, ownership, owned report comparison/re-aging and actual provider cancellation. No injected entitlement or fabricated webhook counts as acceptance.

## Failed attempts and cleanup

The first two attempts exposed a browser-driver response-body race during the immediate Stripe redirect. The ignored driver now forwards the real request, captures the exact actual response, then releases it to the browser. Subsequent bounded field discovery and an attempted click on the actual Card button established the provider-form limitation; the invisible button could not be clicked. These are failed hosted attempts; their repeated passing six-check subset is counted once.

Corrected attempts explicitly expired their owned open unpaid test Checkout, deleted the fictional account (200) and revoked its session (401). The first original race did not capture the provider session identifier: its application account/session was deleted/revoked, no card/subscription was created, and the first unpaid provider session was **not explicitly expired**. No recurring test subscription was created in any attempt. The cleanup helper retains account/Checkout ownership if provider cleanup fails, rather than deleting the recovery binding.

## Backup and rollback

Previous release: `/opt/crp-wizard-staging/releases/crp-v1-33e439f5210bb181`.

Restricted backup: `/opt/crp-wizard-staging/backups/before-crp-v1-935f0669308e8d84-1791455677`.

Activation stopped only the staging service and hash-verified **72 private regular data files** in its snapshot. Existing billing/OCR configuration was reused; only `CRP_BUILD_ID` changed. Automatic rollback on service/local-health failure remained enabled. Public health confirms exact staging/test identity and `launch_ready=false`.

Rollback: stop the staging service, restore its backed-up environment, repoint `current` to the retained previous release, restart and verify health. Preserve current consumer storage; restore its snapshot only for a demonstrated recovery need.

## Evidence and remaining boundaries

Ignored local evidence: `accelerated-launch/service/out/staging-paid-2026-10-08/`, including package/activation receipts, full regression/source audit, guard scripts, current failed `hosted-paid-verification.json`, separately preserved failed redirect/field/Card-selection attempts, provider cleanup proof and the captured provider form. The served runtime was not modified to bypass provider verification.

**Implementation corrections CLOSED; staging activation VERIFIED; hosted paid journey PENDING; production OPEN.** Current UK dedicated-family evidence, explicit absent/ambiguous reader fields and production configuration/restoration/capacity/rollback/provenance/owner cutover remain separate. No private report, live charge, production activation or bureau correspondence occurred. The single current schedule is `CRP_VERSION_1_SEVEN_DAY_WORK_REGISTER_001.md`.
