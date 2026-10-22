# CRP Family single sign-in staging release — October 22, 2026

## Current checkpoint

**STAGING SINGLE SIGN-IN AND ADMINISTRATIVE ACCEPTANCE COMPLETED; FINAL INDEPENDENT RECOVERY PASSED. PRODUCTION REMAINS HELD.**

The owner explicitly authorized completing Linux checks and recovery backups, deploying staging, and verifying single sign-in and all administrative functions. This supersedes the staging activation hold recorded inside the immutable candidate's earlier readiness documents. It does not authorize production activation, source publication, provider changes, financial/postal actions, redirects or retirement. Main is the sole hosted operator; Mail has returned custody and both native owners acknowledged the overlapping-operation hold.

Do not replay any installation, recovery, identity, reset-email, Mail ticket, OAuth or prior release operation. Preserve all attempts and old artifacts. A later continuation must inspect fresh custody and this checkpoint before acting.

## Exact staged tuple

| Component | Installed identity |
|---|---|
| Family Admin | `crp-family-0632e9f7b2e8ce4d8968`; source `9789097f269ea5619e4b750e5d2ea46b9b248eda`; manifest `d7bf94f79efaeaa778834ea692b733dd4bfa6649df85bee8b7bd1dcf9924076b`; 44 files |
| Affiliate | source `5b1adcc0d4505884331119569198fdf0577680c8`; image `sha256:ba182e7671c768c14b30502cece49b3cc9495f540a1677e0741a9eb796c7fe69`; withdrawal retained |
| Mail | `mail-internal-af02c6b244b30f86`; source `04b2c6526d815c0d21ae69f8ceb2aa8c7da50da6`; manifest `997b7cec23b5770bbf9e8b1259e537f07ebbaeb5fa9a2f1759da94ea4e0d2fb1`; 69 runtime source files; schema10 |
| Consumer | Existing accepted staging `crp-v1-068133f19c359537` / `20b2a55eb478847c076df15cc4e92ece19222c7f`; unchanged by this activation |

Current Family archive SHA256 `f3244c2153c8e46f860ddaecc6f141419b9fa544b95526d3eac824b44d0eda0`. Initial229c/source95ab/archivec407 remains immutable historical evidence. Native source archives remain distinct from runtime artifacts: Affiliate `848571eb04b5ab00156fffc5c42b86bcad8f361b0d85342ee2c8049299be65ac`; Mail `acba62e990f9f7259c92c0da46da0e6e3951e642f9e469d0f23e46e3b21e09fd`.

The Affiliate image uses pinned Node base `node@sha256:2c87ef9bd3c6a3bd4b472b4bec2ce9d16354b0c574f736c476489d09f560a203`. Its actual SSO module hashes match tested source, and all six withdrawn assets are absent. The native sources, Family package and passing local evidence remain unchanged.

## Linux verification

Unique isolated candidate: `/opt/crp-family-sso-candidates/sso-linux-409e340c-7044-46c9-b990-9a15876f75b8`.

Current source passes41 local tests and40 independent Linux portable package tests on hosted Node22.23.3. Affiliate100/100 and Mail79/79 pinned to Consumer20b2 remain accepted unchanged companion evidence. Comprehensive real Consumer password/MFA/unlock + PostgreSQL Affiliate + SQLite Mail SSO acceptance passes on Windows and Linux with the current Family source, including both native lock and primary logout confirmation. All fixture processes/stores are disposable; no hosted credentials/payment/postal operation was used. Current Linux frozen package is `/opt/crp-family-admin-candidates/family-verify-logout-da1a29da-5aba-4955-a9f3-5da96b5ed0be`. Current proofs: `sso-logout-order-tests.log`, `sso-logout-successor-linux.json`, `sso-logout-native-acceptance.log` and hosted `three-native-linux-logout-successor.{log,json}`. Earlier38-test package evidence is historical.

The initial Affiliate attempt skipped the native optional dependency's declared postinstall and failed missing shared libraries. Its npm process nevertheless returned zero despite failed Node test totals. That attempt and its provisional metadata are retained and are not accepted evidence. The separate r2 run hydrated only the shipped dependency symlinks, checked library resolution and explicit100-pass/0-failure totals, then passed actual three-native acceptance. No product source workaround or host library installation occurred. Final logs: `family-admin/.local/evidence/sso-*-linux-tests-r2.log`, `sso-mail-linux-tests.log`, `sso-family-portable-tests.log`, `sso-linux-acceptance-receipt-r2.json`.

## Recovery checkpoint

Whole four-component/both-environment operation: `/opt/crp-family-admin-operations/sso-recovery-91938bcf-c4fa-41f7-919a-3451222b7fd4`.

Encrypted backup SHA256 `27face4a71d2097aae8d9e721f779d1f92710c18adbb458b2e8c8b1474e0631a`; manifest SHA256 `9e109f35abc37056a0445199f679bb8b6553ca6fc1e1a58c089bc780a33a70f7`. All643 files/688 entries authenticate. Both Consumer native signed journals authenticate; independent production subset has201 files/14 journal records, staging39 journal records. Mail coherent WAL-inclusive SQLite snapshots pass integrity/foreign-key checks for24 tables each. Both Family HMAC journals authenticate. Both Affiliate custom dumps independently restore on the desktop and match all26 tables, all rows and sequence values. Runtime archives, private documents, configuration/service/router definitions and the current container definition are included. Production services were never stopped or restarted.

The independent desktop directory is ACL-restricted to the current owner and SYSTEM. No secrets or customer data are included in public receipts. Recovery comparison attempts are retained: the embedded development package lacked `pg_restore`; the dedicated existing PostgreSQL18 tool was used subsequently. Windows timezone and JSON object serialization/order initially invalidated textual equality; the final comparison uses UTC and field-value/row-set equality, with original-source raw fingerprints independently reconfirmed against the exact checkpoint before generating value references. No data changes or backup replacement were used to fix comparisons. Accepted proof is `family-admin/.local/evidence/sso-independent-desktop-recovery-r5.json`; every earlier failure remains unaccepted.

Post-install operation `/opt/crp-family-admin-operations/sso-stage-config-recovery-a8c5ee5f-62a5-450c-ae1c-ba70922b6817` seals the complete four-file Family config/integrity key/HMAC journal/SSO signer and an explicitly paired native-trust/configuration delta. Family backup SHA256 `b6bd3997526e193f37e2267d623d4dc9375ecc9a2921511596e0082d4cdd8649`; delta SHA256 `5aca51efa2ca22c79f711341b41c35c6f902031e8072b61442b04617e37df802`. Host and desktop recovery passed; restored signer public key matches both native pins and exact per-person bindings. This delta is paired with the whole predecessor checkpoint; it is not labelled a second whole-business snapshot. No services stopped/restarted for this online coherent-copy backup. Accepted desktop proof: `sso-postconfig-desktop-recovery.json`.

## Guarded staging installation

Successful unique operation `/opt/crp-family-admin-operations/sso-stage-4a48aa05-63fc-46d7-829b-28c1e97feeea`.

Expected predecessor source/image/configuration/PID guards passed against the fresh backup checkpoint. Both native adapters/trust were installed before enabling `familySso:true`. The existing verified personal staging owner `acc_ce3d670855d98e0d8b3e9596` and native Affiliate owner subject remain unchanged. Existing roles/permissions were copied exactly; no email inference or machine-owner grant was added. A separate protected Ed25519 signer and root-owned group-readable public trust files were created. Only the Mail build line, new SSO trust path and dedicated read-only trust supplementary group changed its service configuration. Existing Affiliate environment values were preserved exactly, with one added SSO trust-file path and read-only mount. Existing provider clients/scopes, integration keys/switches and native identities remain intact.

Actual staging health reports the exact Family manifest, Mail health succeeds and Affiliate database health succeeds. Immediate pre/post inventories prove all production runtime/configuration/PIDs and the staging Consumer runtime/PID unchanged. This is not an unqualified raw live production database equality claim. No native database was restored. The old Affiliate withdrawal container is retained stopped under `crp-affiliate-staging-app-1-pre-sso-stage-4a48aa05-63fc-46d7-829b-28c1e97feeea`; old Mail and Family releases/configuration remain available for data-preserving rollback.

Current successor public HTTPS acceptance passes120 checks: exact3 Family assets; all43 read resources and46 action routes refuse anonymous access; foreign-Origin requests and forged delegation fail closed; all24 withdrawn Affiliate asset GET/HEAD/query cases remain410/no-store. Proof: `sso-staging-successor-public-checks.json`. The earlier `sso-staging-public-checks.json` remains predecessor evidence.

## Current authenticated acceptance and fixes

The owner completed normal staging password/MFA and separate administration unlock, then repeated normal sign-in after the portal-only update and replied “Updated staging unlocked.” Current0632 genuine hosted acceptance confirmed automatic access to Consumer, Affiliate and Mail without separate Affiliate authentication or Mail ticket. Consumer reads47accounts/119cases/155reports/204results; Affiliate reads2clicks/1binding/1payment/2commission entries; Mail reports0review/reconciliation flags. No password, MFA code, cookie, seed or token was extracted.

All27views passed at1440desktop and390mobile, without overflow; mobile navigation closes. All46action forms opened and canceled with no dispatch during traversal. Native Consumer and Affiliate activity histories now load; Mail order history/provider metadata and all four Affiliate resource markets passed under the same global session. Evidence: `sso-current-0632-desktop-views.json`, `sso-current-0632-mobile-views.json`, `sso-current-0632-46-action-forms.json`, `sso-current-four-market-resources.json` and current screenshots in `.local/evidence`.

Hosted testing found two defects: unified Activity omitted native audit histories; simultaneous primary logout/admin lock could report an unconfirmed lock. Current0632 includes native histories and orders native lock before primary logout, while still revoking primary access after a lock refusal. Delayed-lock and refusal regressions and real native acceptance pass. Original false-confirmation audit event remains preserved. Portal-only update `/opt/crp-family-admin-operations/sso-activity-logout-r2-006b4926-763d-45c3-adfe-7747fe43523f` preserved configuration, keys, journal and every companion runtime/PID. The first guarded update refused before mutation; intermediate f9 package was never deployed. All originals remain retained.

Four distinct hosted intents have terminal outcomes, zero unknown: owned fictional organization create and disable both APPLIED; campaign creation against an already suspended QA partner refused PARTNER_NOT_ACTIVE; note creation against a nonexistent order refused ORDER_NOT_FOUND. The new unstaffed organization `org_1072d20fdd44759fe6fdb9b6` (“FICTIONAL FAMILY SSO QA 20261022 9789097”) remains DISABLED with zero members for audit; the normal app has no delete. Existing business rows were not used for successful mutations.

An actual authorized QR download on disk is2980bytes, SHA256 `745d1db8d493ef4339eda19b508611a5ada71911a3d599518bceb1224f33f5ec`, exact to the authenticated DOCUMENT_VIEWED journal hash. The original browser download-event wait timed out and was not replayed; direct disk verification supplies the accepted evidence. Existing inactive campaigns correctly refuse creative access. Existing refunded Mail orders correctly refuse packet access with DISPATCH_PRECONDITION_FAILED. No current positive hosted approved-packet case was available; positive document/business paths are covered by genuine isolated native tests and prior unchanged Mail acceptance, not represented as new hosted execution.

Financial, provider-submit, postal, external communications and real-role changes were not executed against hosted business records. Their native domain suites, isolated fixtures and hosted guards/refusals supply bounded verification. This is not a live sale attribution, payout, refund or mailing execution claim. Normal final sign-out confirms BOTH native administration lock and primary session revocation; owner primary sessions0 and new native Mail tickets/sessions0. Browser viewport was reset and the retained staging tab shows Welcome.

## Final authenticated recovery and preservation

Final operation `/opt/crp-family-admin-operations/sso-staging-accepted-r3-5bbb2673-ca6a-42f6-8f06-67b3fd015011` passed host and independent desktop recovery. Four-file Family backup SHA256 `95c534d0cae55e18871e9bef4f4faded3c5994b80484a40f079178db77f0190b`; current Consumer/SSO configuration delta SHA256 `5488ea57026fbfe80d5ff2d8c58f5f3b6ee9ad9df6426c0179224f1c06b4cb07`; delta manifest `60af8acffdd35c5f3daa70078c06e6e7d0db23329b9f0cf4456f1be340011d08`. This314file/322entry delta pairs with the original whole four-component/both-environment checkpoint. All four Family private files match, HMAC integrity passes and current Consumer44-record signed journal authenticates. Accepted proof: `sso-final-accepted-desktop.json`. No services were stopped or restarted for final sealing.

Original staging47accounts/reports/cases/billing/entitlements and other private data are preserved except the owner's actual MFA counter, normally revoked own sessions, bounded own admin unlock/audit rows and the retained disabled QA organization. Exactly16 oldest eligible unowned diagnostics rotated; removed and added rows have explicit null event/account/entitlement IDs, REJECTED outcome, null effect and STRIPE_EVENT_UNRECOGNISED reason. Retained/protected billing rows remain exact. All production Consumer and Family private bytes/security/config/runtime remain exact. Both Affiliate26table row fingerprints and sequences remain exact. Both Mail24table row sets remain exact except the precisely recorded pre-existing production worker heartbeat; raw live SQLite/WAL equality is not claimed. Failed strict diagnostic/event-count guards remain retained; corrected separately named seals did not replay actions or restore data.

Final runtime custody verifies installed Family44files and Mail69runtime bytes, exact companion source/PIDs/configuration, signer/trust ownership/modes and all production runtime preservation. Production remains Consumer5ab1/source917dea2, Mail692f/source59127e4, Affiliate withdrawal imageb7de7464 and Family0ceab/sourceceb420. No production SSO trust directory or activation exists. No source push occurred.

## Release boundary

Staging is available at https://admin-staging.creditregulatorpro.com. Existing native admin pages and partner/operator workspaces remain intact. Production deployment, restarts, redirects and retirement remain HELD. Production requires a later direct owner authorization, fresh live custody and authenticated recovery, exact accepted artifact promotion and normal production-person authorization verification. Documentation closure does not regenerate the manifest, repeat passing suites or change the frozen runtime source identity.
