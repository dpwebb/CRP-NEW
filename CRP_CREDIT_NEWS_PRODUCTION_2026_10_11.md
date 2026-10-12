# Credit reporting news footer — accepted production release

Owner authority: October 11, 2026 footer-banner request, followed by “Commit-push-deploy”.

## Exact release

- Production and staging: **crp-v1-9799fd768cb7cdfa**.
- Shipped source commit: **6e8c85e29a815f6c0819056e8e9bc307b80900f5**, pushed to origin/main and origin/credit-news-release.
- Manifest: **9799FD768CB7CDFA15CB128D8D61895D800FFC9E3B4E89F6037F08BB482FC9A3**, 147 shipped files.
- Production activation: October 12, 2026 01:25:05 UTC / October 11, 2026 22:25:05 Halifax.
- Previous immutable release: crp-v1-378b2463903ad652. Restricted stopped-service snapshot and previous release retained for guarded rollback.
- Statuses: implementation **IMPLEMENTED_AND_TESTED**; staging **VERIFIED_ON_STAGING**; production **ACCEPTED**, zero blocking checks.

## Bounded source changes

The release adds a responsive, accessible, multi-line news section to the Your Story landing footer. Seven curated source-linked items distinguish media experiences, regulatory action, court orders and an appeal/remand. The API uses trusted visitor-IP resolution independently of pricing choices and assessment jurisdiction. CA/US/GB/AU visitors receive their regional items; unknown or other locations receive an interleaved variety. Dates are filtered to the past five calendar years, excluding future items. Hover, focus, touch, keyboard and manual pause controls preserve readability; reduced motion disables automatic scrolling.

Exact implementation commit files:

- accelerated-launch/service/app.cjs
- accelerated-launch/service/credit-news.cjs
- accelerated-launch/service/ui/landing.html
- accelerated-launch/service/ui/credit-news.js
- accelerated-launch/service/ui/credit-news.css
- accelerated-launch/service/tests/sections/fi-credit-news.cjs
- accelerated-launch/service/tests/run-tests.cjs
- accelerated-launch/service/deploy/release-manifest.json
- CRP_VERSION_1_SEVEN_DAY_WORK_REGISTER_001.md

A reviewable source diff and sanitized evidence are in SOURCE_CAPTURES/NEWS-RELEASE-2026-10-11/. Private actor credentials, recovery keys, tokens and consumer-store snapshots were excluded. The archive manifest pins every included file. Token-bearing local regression, measurement and finding-gate details are explicit .review.json exports with redaction paths and original receipt hashes. The unmodified originals remain in the private ignored release worktree; the review exports do not replace canonical validation receipts.

The coordinator preserved C:/CRP-NEW's existing dirty policy/design tree. Implementation was integrated serially in the managed credit-news-release worktree, based on actual main commit 31b2f4c, with only the banner changes. The address-dependent jurisdiction-policy draft, unpublished policy routes, legal-document assets, unrelated branding and legal drafts are **not included**. Existing live footer navigation is preserved. The canonical dirty checkout was not reset or cleaned.

## Actual verification

- Command: node accelerated-launch/service/deploy/release-workflow.cjs check accelerated-launch/service/out/news-release/plan.json accelerated-launch/service/out/news-release/verified-checks
- Fresh full product regression: **14,966 passed / 0 failed / 0 skipped**, 154 sections, 301 pinned source files, zero source drift. Five syntax checks and workflow safeguards passed.
- An earlier full run recorded 14,941 passed / 1 failed / 0 skipped because the isolated checkout lacked ignored consumer-wizard/dist/app.js. That failed receipt is preserved. After restoring the artifact, the affected cp-consumer-plain-text section passed 29/0/0 and a complete second full run passed. No failed receipt was relabelled as passing.
- Local browser: 20 country/width layouts at 320, 390, 768 and 1440 pixels; no horizontal overflow. Automatic scrolling, pause, keyboard, reduced motion, empty and failed-loading states passed.
- Fresh staging: 43 upload/recovery/privacy/ownership checks and nine paid comparison/recovery checks passed against actual 147-file source proof.
- Fresh genuine Sandbox monthly CAD Checkout completed in the browser. Provider invoice and matching applied signed webhook established active entitlement; no injected payment state.
- Current packet: all six exact rendered pages inspected; consumer browser approval and download completed. Preview/download/print SHA-256 c52d0e3473b24289c2c0aab2086aa41d37d82145e997f289da504e863722f17e. Selected original report pages 2 and 3 and three document copies preserve source streams and rendering, with zero bureau forms. Approved controls and bytes survived navigation and report comparison.
- Fresh annual upgrade: same subscription, C$79.50 annual price, C$7.95 unused credit applied once, C$71.55 Sandbox invoice paid, signed event applied. Renewal cancellation confirmed at both provider and application; fixture subscription ended, both fictional accounts deleted and their sessions revoked.
- Fresh currency-choice browser checks: all four fixed currencies at desktop/mobile, keyboard focus and 44px target passed. Original twelve native-currency/three-plan purchase receipts remain bound to predecessor crp-v1-378b2463903ad652; separate billing-continuity.json pins those original receipts and 142 unchanged shipped dependencies. They are not presented as twelve new purchases.
- Strict current-build recovery evidence and all **30 gates / 123 criteria** passed before production activation. The standard 46 required predicates passed; the additional native-price predicate explicitly distinguishes unchanged original proof from fresh current-build payment/choice/upgrade observations.
- Production: every deployed source hash matched; files root-owned and nonwritable. Existing collections and active sessions preserved; one already-expired session removed under existing expiry policy. Anonymous cases remain 401; test-payment route remains 404.
- Actual production environment plus read-only Stripe account, twelve live prices and enabled live webhook verified with the current checker bytes. No live charge performed. Final actual release checker accepted production with zero blockers; static health launch_ready is not substituted for this acceptance receipt.
- Production browser: real IP resolved CA and the regional footer displayed the CA item at 320/390/768/1440; no overflow. Fresh staged unknown-resolution proof displays all seven items. Home and Sign In also passed at 1440/390; actual IP pricing and all four fixed-price catalogs passed. Four entry routes on each host matched exact served HTML.

## Preserved product scope

Reporting-period fixes and source-supported determining fallback dates, form-free packets, seven steps, Your Story authentication, all 82 jurisdictions, 21 common-error items, native fixed prices, billing, ownership, session, approval and download safeguards remain included. Of 147 shipped files, 142 match the accepted predecessor exactly; the five changed/new executable assets are the app route registration, news module and landing/news presentation.

## Isolated verification setup lesson

Before a long regression in a new worktree, establish its ignored test prerequisites: SOURCE_CAPTURES fixture builders, required existing out evidence, and consumer-wizard/dist/app.js built from the current source or copied from the audited matching working baseline. Run the affected artifact-dependent section first when those generated artifacts were absent. Preserve actual failed runs and keep executable freeze and activation safeguards unchanged. This avoids discovering a missing local artifact after a full regression; it adds no product scope or repeated provider prerequisite.

## Remaining boundaries

No known remaining banner defects. Jurisdiction policy addresses and final policy verification remain pending in the separate local draft. The feed is a curated source-backed set with automatic age filtering; adding newly researched items requires a source update. Historical receipts retain their original scope.
