# Automatic owner routing — local implementation

Subsequent production milestone: the owner authorized “deploy”. The unchanged combined 391d candidate passed strict current-build 30/123/46 acceptance and is now deployed and verified on production. Read `CRP_EMAIL_PASSWORD_RESET_PRODUCTION_2026_10_14.md` for exact provenance, retained original full proof, account/owner/MFA preservation and backup custody. Earlier local-only, affected-flow-only and NOT_RUN statements below retain their original milestone scope.

October 14, 2026. Owner request: "Implement automatic owner routing". Status: **IMPLEMENTED_AND_TESTED_LOCALLY**. The new committed candidate is packaged and integrated into local main. It has not been deployed; the accepted administration release remains live.

## Behavior

Successful main sign-in now routes a currently eligible active owner to `/admin`, where the existing separate administrator MFA unlock still applies. An already signed-in owner opening the main `#signin` entry also routes there, including navigation that changes only the fragment of an already open consumer page.

The destination is a fixed server-owned `next_path: '/admin'` response hint, derived from the authenticated consumer session and current verified owner membership. Routing never consumes an additional authenticator code, issues an admin cookie, creates an unlock, grants a role or bypasses permission checks. Sign-in OTP replay is still refused at admin unlock. No owner email is hardcoded.

Consumers, staff, partners, disabled/ambiguous/ineligible memberships and disabled/unavailable optional administration retain their existing consumer sign-in behavior. The browser accepts only the exact `/admin` destination. Account/session guards prevent a delayed lookup from redirecting a different or signed-out account.

Valid checkout-return URLs retain their original report and plan. Existing direct consumer views remain available. The admin workspace's consumer and account-management links explicitly use `/index.html?workspace=consumer`, preventing an owner from being redirected back when choosing consumer work.

Only four of 176 shipped files changed: `admin-access.cjs`, `app.cjs`, `ui/app.js` and `ui/admin.html`. The other 172 shipped files are byte-identical to the accepted e188 release; no shipped file was added or removed. Reader/rule, billing/entitlement, packet and private-store schemas are unchanged.

## Frozen identity

| Item | Identity |
| --- | --- |
| Executable and packaged source | `4601e0a552f6ec3aac0dcb82a4a54d38293e2c1b` |
| Candidate build | `crp-v1-489d263c201f5ce3`, 176 files |
| Manifest | `489D263C201F5CE3415FB0FA9BE85B32098A150AD99A6935FC37F33CCB7A24EB` |
| Candidate archive SHA-256 | `7018A8E76E15E49178380995C8802D6305AEA0D3D2684BCA88E20EC622327A9B` |
| Source archive SHA-256 | `B5BE6A8AD27A1EC1803CFDD31F3F05E03CC2D55448CD336780C732AC17399547` |
| Verification receipt SHA-256 | `9DC1465D12FD0A51E0B7B7135E47F839DB9B86D46CCF815B503ACE38155E3600` |
| Raw full SHA-256 | `D261750796FD8BFB1D95C88057FA290727213783AE54318972E623E5786CDEE9` |

The coordinator reused its clean `admin-integration/CRP-NEW` checkout. Other agents performed read-only security and release reviews. Main integration and later documentation closure preserve the package's executable identity; documentation commits are not relabelled as tested executable source.

## Verification and proof reuse

The governed `prepare` → `check` → `record` → `package` workflow selected FULL because shared sign-in, shared UI JavaScript and test contracts changed. All 55 accepted fixture prerequisites matched before preparation. The reviewed incomplete input profile forced fresh product execution; it did not enable cached product proof. The c9a1/e188 raw 16,249/0/0 baseline remains immutable and separate.

One final full regression passed **16,272 assertions / 0 failures / 0 skips**, across 175 completed sections, with all 368 tested source hashes matching, zero source drift and no unrun current product sections. Five affected JavaScript syntax checks and ten release-tool suites passed. The full product run took 1,103,752 ms; the complete governed verification took 1,168,265 ms. No second final full was run for packaging, assembly, documentation or byte-identical main integration. The separate historical source-audit lane was not run.

The registered access section passed 38 checks and actual HTTP/Chrome section passed 59. These are included in the full total. Focused development proof retains its separate 97 passing assertions. Actual browser checks exercise main password/MFA sign-in, a separate admin unlock, sign-in-code replay denial, restored-owner entry, same-document fragment navigation, explicit consumer escape, owned checkout return, unchanged consumer view and rejection of an external destination. The saved owner-unlock screenshot was visually reviewed.

Development failures remain preserved. Two early attempts exposed a test observer's response-body race during real navigation; transient body inspection was removed while retaining actual navigation and MFA assertions. A subsequent browser timeout demonstrated the same-document `#signin` defect; current-session lookup with an account-epoch guard fixed it. The final focused browser pass and the one final full use the corrected executable state. No failing assertion was converted to a skip. Attempt two terminated before writing a focused receipt; its error remains in task history and the development custody note explicitly records that limit.

Local product-proof assembly passed against the packaged snapshot and the same raw full. It establishes no new hosted journey, current provider proof or 30-gate acceptance. The plan does not select a new billing journey for local verification. Future hosted release proof must satisfy the existing dependency/acceptance checks; historical purchases are not silently relabelled after shared `app.cjs` changed.

## Custody and operational boundary

Private evidence: `C:\Users\webbd\.codex\private\crp-owner-routing-20261014`. `evidence-custody.json` indexes 57 byte-identical copies of the plan/profile/prerequisites, verification, raw full/log and append-only execution records, package/source archives, local proof assembly, development receipts and screenshot. Custody record SHA-256: `D8E7AD959A19D0F9B6E0FBD7CADE84DF6956B6F84398561081F58405CDE539C8`. Original coordinator outputs remain in `accelerated-launch/service/out/automatic-owner-routing-20261014/`. Preserve those receipts and the original e188 evidence.

Read-only health checks confirmed production/staging still serving `crp-v1-e1882ec0a7bf63e7` with administration available, and the original local service still serving `crp-local-operational-52ee45aade7aee92`. This batch used isolated fictional local data only. It did not activate a runtime, bootstrap or modify the real owner, change hosted data/configuration, make a provider purchase, send mail, initiate a payout or push code.

Staging verification and production acceptance for the routing candidate are **NOT_RUN**. The earlier production authorization selected the frozen e188 artifact; it does not activate this new candidate. All 30-gate/123-criterion safeguards and separate staging/production activation authority remain. Other enhancements stay held. The live main sign-in therefore retains its previous behavior until this routing build is promoted.
