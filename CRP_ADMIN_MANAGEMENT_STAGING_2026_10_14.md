# CRP administration — accepted staging deployment

October 14, 2026. The owner's subsequent "You are authorized to deploy" instruction followed the proposed staging milestone. The agreed administration candidate is now deployed, enabled and **VERIFIED_ON_STAGING** at <https://staging.creditregulatorpro.com/admin>. Production promotion remains a separate owner decision. Other unspecified enhancements remain held.

## Frozen artifact and running services

| Item | Verified identity |
| --- | --- |
| Tested executable and packaged source | `c9a1e2ccd1beb01e334407998695062e9164d256` |
| Staging build | `crp-v1-e1882ec0a7bf63e7`, 176 shipped files |
| Manifest | `E1882EC0A7BF63E7B6773EA535956FE8E323CDBADE18DA98A2ADD837BA7A4F16` |
| Candidate archive SHA-256 | `07C80EB31E8694249CBB73DAFF3137633032F7FA16BC0A529C5498631D71B3A2` |
| Staging runtime | `/opt/crp-wizard-staging/releases/crp-v1-e1882ec0a7bf63e7`; PID `663141` after the verified backup restart |
| Production, unchanged | `crp-v1-a926c178ef0dfc5c`; PID `3265064`, start `2026-10-14 04:03:50 UTC`, zero automatic restarts |
| Existing local runtime, unchanged | `crp-local-operational-52ee45aade7aee92`; PID `20396`, original start `2026-10-14T09:09:28.2487297Z`, port 8890 |

The previously prepared immutable archive was activated through `release-workflow.cjs activate staging`, guarded against predecessor `crp-v1-a926c178ef0dfc5c`. Default-off smoke passed before enabling administration. Final hosted custody verified all 176 actual runtime files and the current release pointer. Later source closure commits contain documentation only and do not replace the packaged source identity.

## Administration and hosted outcomes

Administration is enabled and available on staging only. A dedicated fictional, verified, MFA-ready account was explicitly designated as the staging owner through the frozen offline bootstrap tool. No existing real consumer was elevated. One bounded staff account and three organization-scoped partner accounts remain for staging review; all five are fictional. Referral and fulfillment permissions are separate.

| Actual hosted browser phase | Passing assertions |
| --- | ---: |
| Organization/team setup and three-level attribution | 52 |
| Owner/staff/partner access, MFA, desktop/mobile navigation and denial controls | 94 |
| Three-tier affiliate ledger, scoped partner views, holds/reserves and schedules | 74 |
| Consumer grant, assigned partner approved-PDF access, foreign-organization denial and revocation | 62 |
| Total additional administration browser assertions | **282** |

The four phase receipts preserve their individual scopes; a phase's unrun sibling phases are covered by the other receipts. Fifteen saved administration screenshot/PDF artifacts match their recorded hashes. Public TLS session/CSRF checks passed separately: missing/foreign Origin, forged cookies and another consumer's privileged cookie are refused. Privileged cookies are Secure, HttpOnly, SameSite=Strict and limited to `/api/admin/`; unlock requires fresh MFA and is bound to the consumer session.

The actual first retail Sandbox purchase generated the existing three rewards, independently verified at 119/79/39 CAD cents on 795 cents excluding tax, with 12/8/4 cents reserved and six matching initial/reserve Friday tranches. Reconciliation was idempotent. Existing 15%/10%/5%, 14-day hold and 10%/180-day reserve policies were preserved. Payouts remain disabled.

Fulfillment proof used an actual consumer-approved packet and revocable grant. The assigned partner downloaded its exact approved bytes; a different organization was refused, and access was refused after consumer revocation. No mailing, printing, dispatch or delivery claim occurred.

## Exact-build release acceptance

The unchanged strict release validator accepted **30 gates / 123 criteria / 46 required predicates**. Additional administration observations remain separate from that required predicate count. The preserved full regression is **16,249 passed / 0 failed / 0 skipped**, 175 completed sections and 368 matching tested sources; no full product regression was repeated for staging.

Fresh actual hosted evidence includes owned upload/assessment and foreign-account denial, useful and bounded unsuccessful paid recovery, genuine Sandbox activation, own-history comparison, exact packet review/approval/download, annual upgrade, cancellation and cleanup. All seven packet pages were visually inspected. Removable instructions appear first, the editable letter starts on page two, original selected report pages and supporting documents retain their exact streams/order, and retired bureau forms remain absent. Approved preview/download/print bytes and comparison continuity matched PDF SHA-256 `BCCA5D69594AE17831180C3E186090F500F07A37801DB78AA49F51B1ED5931B5`.

The conservative purchase-related plan required fresh native-price evidence. All twelve plan/currency cells passed actual Sandbox Checkout, fixed-price/provider objects, applied signed events, owned entitlements, unchanged original assessments and real downloads/packet access boundaries. The completed CAD monthly purchase was reused with its original browser timestamp/session; eleven new purchases completed once. Eleven new Checkouts were observed at 390px before submission and on return; CAD monthly retains its original Checkout/return proof plus a fresh 390px postpayment observation. Four currency choices passed desktop/mobile checks. The same CAD subscription then upgraded with the existing 795-cent credit applied once, 7,155 cents paid and 7,950-cent annual renewal, followed by verified cancellation and test-subscription termination. No live charge occurred.

All eleven additional native purchase accounts and the two core consumer/stranger accounts were deleted through their authenticated API, with sessions revoked and owned test subscriptions ended. Minimal existing billing/download retention behavior remains unchanged. The five fictional administrative principals remain for staging review.

Evidence assembly preserved failures honestly. The original Linux FDT derivation could not resolve Windows backslash paths in the immutable raw full receipt. Pure derivation and strict validation subsequently passed on Windows using the same raw full and byte-identical actual hosted receipts; no raw metrics, product source or historical receipt was translated. Packet helper offsets were updated for the already-approved first instruction page. Three inherited supplemental signup/results/binary observations were explicitly NOT_SELECTED only because they belong to neither the authoritative 46 predicates nor any of the 123 criterion mappings. No required gate was removed. A partial preparation missing the exact full-receipt filename alias remains preserved beside the later passing preparation; both aliases have identical C5 full-receipt bytes.

## Preservation, backup and recovery boundaries

The canonical data path was made explicit as `/var/lib/private/crp-wizard-staging`, the same existing directory inode behind the prior symlink. Consumer schema, existing accounts, credentials, provider/security keys and secure-cookie settings were preserved. Bootstrap ran with the writer stopped under the existing backup lock, after a verified complete private-tree snapshot; private ownership/modes were restored before starting the service.

Final comparison preserves all original 25 accounts, 66 cases, 100 files/blobs, 150 results, 13 packets, 17 entitlements, 16 checkouts, 51 upgrade-credit rows, 13 purchased-download rows and all original referral members/purchases/rewards/tranches. Every original blob hash matched. Normal sessions are excluded. Twenty-nine old unowned REJECTED webhook diagnostics rotated under the unchanged bounded rejection-retention policy; their complete original rows remain in the stopped snapshot. Original account-bound and settled billing records are unchanged.

Preserved stopped snapshots:

- `/opt/crp-wizard-staging/backups/before-crp-v1-e1882ec0a7bf63e7-1791986631`
- `/opt/crp-wizard-staging/backups/before-admin-enable-20261014T141422Z`; 106 verified files, manifest SHA-256 `43B14F45ECFBBB6ACC3819EE823959FD5D960EA9E7DD491B0E681E79C6315960`.

The existing staging offsite-backup unit succeeded at 14:55:48–14:56:06 UTC, including upload, checksum upload, download and exact ciphertext comparison. Archive `crp-v1-staging-20261014T145548Z.tar.gz.age` has SHA-256 `8A55177584F3F66D3197D5354F5E4ED3B604C4AD3A3498A876ADB000A4E74F15`. Local authenticated decryption through the owner-held recovery identity verified all 139 manifested files, including the private consumer security key, admin integrity key, head/initialization markers, all 27 contiguous journal entries and the audit HMAC chain. Plaintext was processed in memory without extraction. This installed backup covers private data plus `staging.env`; immutable runtime archives/source proof and historical stopped snapshots retain separate custody. A running application restore was not performed.

Post-backup exact-build smoke passed 31 checks. A new legitimate owner sign-in with MFA and a separate fresh MFA unlock successfully read the persisted administration and affiliate views after restart. Production and the original local process/build remained unchanged. For a staging administration problem, disable administration through the controlled configuration/restart procedure while preserving current data and audit files; use the expected-current guarded artifact rollback if needed. Do not restore old private state over newer consumer data.

## Durable evidence and remaining authority

Private evidence root: `C:\Users\webbd\.codex\private\crp-admin-implementation-20261014\staging-release`. Summary `staging-summary.json` SHA-256: `2D7F8CEDA38BA5A7B51841CA162B5AB9FD8DA9A46CE07E322DC85916ABA80EF2`. The exact acceptance, measurements, thirty gate candidates, original raw full, hosted phase receipts, provider/browser proofs, custody translations and retained failed attempts are hash-bound there. Separate private custody archives preserve the complete browser artifacts and acceptance/FDT directories; `custody-archives.json` records their inventories/hashes. No secrets are included in this report or committed documentation.

Source administration remains disabled by default. Staging enablement does not authorize production enablement or select a real production owner. Production administration acceptance is NOT_RUN. Production promotion, a real-owner designation/bootstrap, live payouts, mailing, real-customer outreach and push remain NOT_AUTHORIZED; other enhancements remain ON_HOLD. Staging health still reports `launch_ready:false`; this accepted administration milestone does not silently close unrelated coverage or production-readiness obligations. No production runtime/configuration was changed.
