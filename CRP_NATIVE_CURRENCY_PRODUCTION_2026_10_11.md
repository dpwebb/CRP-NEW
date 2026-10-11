# Native-currency production acceptance — October 11, 2026

## Accepted live build

Production: https://creditregulatorpro.com

- Source commit: `b910f9f714e37e2235f6ef888385052f67fd67ba` (pushed to `origin/main`).
- Runtime: `crp-v1-378b2463903ad652`.
- Manifest: `378B2463903AD6521601917C1644426CE461C26C79262EB1D5C240776B386E7B`; 144 shipped files.
- Guarded production activation: October 11 at 23:25:56 UTC, replacing `crp-v1-de359a619a602584`.
- Fresh full regression: **14,897 passed / 0 failed / 0 skipped**, 153 sections, 297 source hashes.
- Exact-build staging and final production acceptance: **30 gates / 123 criteria**, zero blockers.

| Status | Outcome |
|---|---|
| Implementation | Implemented, committed, full regression passed |
| Staging verification | Exact-build consumer and genuine Stripe Sandbox journeys passed |
| Production readiness | Accepted; live activation and post-activation checks passed |

## Controlling pricing and settlement

| Plan | Canada — CAD | US — USD | Australia — AUD | UK — GBP |
|---|---:|---:|---:|---:|
| One-time | C$5.95 | US$4.95 | A$5.95 | £3.15 |
| Monthly | C$7.95 | US$5.95 | A$7.95 | £4.25 |
| Annual | C$79.50 | US$59.50 | A$79.50 | £42.50 |

The visitor's observed IP determines initial currency. Other countries, unavailable location and lookup failure use US prices. Consumers can choose CAD, USD, AUD or GBP before paying. There is no universal CAD base price and no exchange-rate or Adaptive Pricing calculation. The authenticated currency selector is available on results/purchase and Plans surfaces. Existing subscriptions and pending checkouts retain their contracted currency. Credits apply only to purchases charged in the same currency.

The owner explicitly authorized conversion for unsupported settlement currencies. The Canadian Stripe account does not support AUD/GBP bank settlement. Actual bank-currency configuration was not verified; this receipt does not claim a USD settlement bank exists. No bank/payout configuration was changed. Consumer charges retain their selected fixed native currency regardless of merchant settlement conversion.

Country.is resolves only the proxy-observed public visitor IP. Report, account and payment contents are not sent to it. Failure returns the approved USD fallback. Untrusted forwarded headers cannot replace a remote peer; the actual Traefik/nginx loopback chain is covered by regression. The privacy disclosure identifies this lookup.

## Current-build verification

- Twelve genuine Stripe Sandbox purchases: all three plans in all four currencies. Actual browser submission and provider return, fixed amount/currency, owned Price IDs, successful PaymentIntents/invoices, applied signed webhooks and active entitlements verified. Adaptive Pricing was disabled.
- Every purchase unlocked its original assessed report without reupload/reassessment. Complete assessment/PDF access passed. One-time packet routes returned 402; subscriber packet routes returned 200.
- The actual Canadian browser IP selected CAD. Four consumer currency choices and all twelve prices passed at 1440px and 390px; local checks additionally covered 768px and 320px, keyboard focus and 44px targets.
- The form-free packet contained the editable consumer letter, two selected original report pages, two identity copies and one address copy. All six rendered pages were visually inspected. Browser approval/download passed; preview, download and print bytes matched. Navigation through steps 5–7 retained approval and download controls.
- Subscriber history/comparison passed. Monthly-to-annual upgrade retained one Stripe subscription, applied C$7.95 once, charged C$71.55 and preserved C$79.50 renewal pricing. Browser cancellation and actual application/provider cancellation flags passed.
- All fictional accounts and test subscriptions were cleaned up. No live card charge was performed.
- Current live account charges/payouts enabled; all twelve live Price cells and eight required webhook events verified. Production retained its existing full-wordmark, currency-neutral product names; Sandbox labels were aligned to them. Earlier provider screenshots retain the names displayed when captured.
- All 144 production file hashes matched; production code remained root-owned and nonwritable. The stopped-service snapshot comparison preserved original data collections and active sessions; only already-expired sessions could be removed. Anonymous cases returned 401 and the test-payment route returned 404.
- Actual live browser/API checks passed for initial IP currency, all twelve fixed prices, latest Your Story homepage and Sign In at desktop/mobile widths.

The accepted runtime retains the reporting-period fixes, determining fallback date terminology, form-free packet scope, seven-step flow, Your Story homepage/authentication screens, 21-item governed checklist and all 82 jurisdictions. Their source/evidence checks passed in this fresh full run. Previous release receipts retain their original build, date and scope.

## Changes and review

Exact files: [changed-files.json](SOURCE_CAPTURES/NATIVE-CURRENCY-RELEASE-2026-10-11/changed-files.json). Reviewable source diff: [source-review.diff](SOURCE_CAPTURES/NATIVE-CURRENCY-RELEASE-2026-10-11/source-review.diff).

Runtime work covers IP pricing resolution, fixed plan catalog, checkout/provider currency verification, billing/entitlement/credit handling, consumer pricing controls and privacy disclosure. Tests cover native prices, forwarding-header security, signed-event currency mismatches, currency-isolated credit, original-assessment access, packet entitlements and legacy-store compatibility. Reporting rules/readers were preserved.

The original 205 unrelated files under `branding/` and `legal-drafts/` retain their baseline hashes. They were not included in this release.

## Commands and actual results

```text
node accelerated-launch/service/tests/run-tests.cjs fg-native-currency-pricing dc-consumer-violation-term ec-account-packet-ui --receipt=<focused receipt>
349 passed / 0 failed / 0 skipped

node accelerated-launch/service/deploy/release-workflow.cjs check <plan-native-legacy-final.json> <checks-native-legacy-final>
FULL: 14,897 passed / 0 failed / 0 skipped; 23 syntax checks; workflow tests PASS

node accelerated-launch/service/tests/run-tests.cjs --lane=source-audit --receipt=<source-audit-final.json>
23 passed / 0 failed / 0 skipped; focused scope only

node accelerated-launch/service/deploy/release-workflow.cjs package <plan> <verification> <candidate>
144 committed files packaged; exact source/manifest/verification hashes bound

node accelerated-launch/service/deploy/release-workflow.cjs activate staging <package receipt> crp-v1-de359a619a602584 - <staging output>
PASS; hosted acceptance followed

node accelerated-launch/service/deploy/release-workflow.cjs activate production <package receipt> crp-v1-de359a619a602584 <staging-gate-summary.json> <production output>
PASS; exact-build staging acceptance required; final production acceptance PASS
```

Evidence: [SOURCE_CAPTURES/NATIVE-CURRENCY-RELEASE-2026-10-11](SOURCE_CAPTURES/NATIVE-CURRENCY-RELEASE-2026-10-11). Includes acceptance, payment/cleanup, source/package/activation, screenshot and preserved-work receipts. Compressed full-regression and hosted measurement receipts retain their original bytes and hash bindings.

The prior failed full run (14,875 passing assertions, two failures) remains in the private operational directory with its original source identity. Both defects were corrected and their focused sections passed before the new full run; it is not represented as passing proof. Browser-script timeouts are retained separately and do not replace actual successful receipts. The unactivated Adaptive Pricing proposal is superseded by the owner's fixed-price correction.

Concrete remaining release defects: **none identified by these checks**. Unsupported native bank settlement remains the explicitly approved conversion boundary.
