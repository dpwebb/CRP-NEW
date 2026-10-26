# CRP Family single sign-in production release — October 22, 2026

## Current checkpoint

**PRODUCTION DEPLOYED AND AUTHENTICATED ALL-THREE SINGLE SIGN-IN VERIFIED; FINAL PRESERVATION AND INDEPENDENT RECOVERY PASSED. NATIVE ADMIN PAGES REMAIN INTACT.**

Owner directly authorized: “Deploy the verified unified admin and single sign-in to production, coordinate with the group release, and verify all three apps before redirecting or retiring their individual admin pages.” This supersedes the earlier production hold for this bounded promotion. It does not authorize payments, refunds, payouts, postal dispatch, provider configuration changes, native security recovery, source publication or unrelated Consumer promotion. The exact accepted staging evidence is recorded in CRP_FAMILY_SSO_STAGING_2026_10_22.md. Frozen package documents retain historical holds and are not regenerated to change their wording.

Main is the sole hosted operator. Planning, Mail and Affiliate each confirmed no active/queued overlap or newer known predecessor and acknowledged Main's mutation custody. Their reports were followed by fresh direct host inspection. No helper agent was spawned; no shared service/router reboot occurred.

## Exact production artifacts

| Component | Installed production identity |
|---|---|
| Family Admin | `crp-family-0632e9f7b2e8ce4d8968`; source `9789097f269ea5619e4b750e5d2ea46b9b248eda`; manifest `d7bf94f79efaeaa778834ea692b733dd4bfa6649df85bee8b7bd1dcf9924076b`; 44files; identical accepted staging package |
| Affiliate | source `5b1adcc0d4505884331119569198fdf0577680c8`; image `sha256:ba182e7671c768c14b30502cece49b3cc9495f540a1677e0741a9eb796c7fe69`; identical accepted staging image; six withdrawn assets remain absent |
| Mail | `mail-internal-af02c6b244b30f86`; source `04b2c6526d815c0d21ae69f8ceb2aa8c7da50da6`; manifest `997b7cec23b5770bbf9e8b1259e537f07ebbaeb5fa9a2f1759da94ea4e0d2fb1`; 69runtime files; schema10; identical accepted staging artifact |
| Consumer | Existing `crp-v1-5ab1c55ddfad7229` / `917dea2`; runtime, PID, configuration and entire private store unchanged during promotion; staging-only Consumer0681 was not promoted |

Family archive SHA256 `f3244c2153c8e46f860ddaecc6f141419b9fa544b95526d3eac824b44d0eda0` remains unchanged. Existing41local/40Linux Family checks, current genuine Windows/Linux three-native acceptance and native100Affiliate/79Mail tests remain exact-source evidence; passing suites were not repeated during promotion. Production account and native endpoint checks supplement these tests, rather than representing Consumer917 as the disposable20b2 test source.

## Fresh production custody and per-person access

Fresh inspection verified every expected source, PID, image and protected configuration hash against staging closure before recovery. Production personal principal `acc_c64c6b8804a301810ac486d4` / `admin@creditregulatorpro.com` remains verified, active native Consumer owner and unlocked from lockout. Existing Affiliate mapping resolves to actual native owner `user_3KsnNv145lYHPFscfHk2CfVUDki`; existing Mail admin mapping and capabilities remain exact. No email inference, new membership or broad machine-owner grant was added. Password/MFA values, session cookies, seeds and tokens were not inspected. No production password, authenticator or recovery operation was performed.

Mail had0production orders and no customer provider intent in flight at the bounded release guard. Existing schema10/24tables, recipient policy, PostGrid routes, assignment rules, provider configuration and normal dispatch behavior remain intact. No dispatch pause switch or provider retry was used.

## Whole recovery checkpoint and independent restoration

Unique operation `/opt/crp-family-admin-operations/sso-production-recovery-c162e346-28df-4852-a432-7e1c5526a4dd` created a fresh all-four-component/both-environment authenticated encrypted checkpoint, without stopping any service.

- Ciphertext SHA256 `922ea491665a6df3ececf530bf85a06891c564f4db8568bad0971cad675c3a70`.
- Manifest SHA256 `64daf987fe9ae68b525d79b423db7bbf7ba0c807f8aa6e0ef5da01aa63dd36f8`.
- 654files/701entries; staging Consumer44signed journal records; production201files/205entries/14signed journal records.
- Both Mail coherent WAL-inclusive SQLite snapshots pass integrity/foreign-key checks for24tables each.
- Both Affiliate custom dumps were genuinely restored into a separate disposable desktop PostgreSQL cluster; all26tables/row values/sequences match.
- Both Family HMAC journals authenticate; staging four-file SSO backup and production legacy three-file backup recover independently.
- Private desktop directory ACL grants only the current owner and SYSTEM. Recovery key is separately held in that directory and0600 on the protected host.

Accepted independent proof: `family-admin/.local/evidence/sso-production-independent-desktop-recovery.json`. No active database was restored or overwritten. Existing artifacts, failed attempts, credentials custody and earlier checkpoints remain preserved.

## Installation, refusal and separate continuation

First unique operation `/opt/crp-family-admin-operations/sso-production-bafb6ecf-f8f4-4ebc-a250-b37d2eed20ed` refused `MAIL_CHANGED_BEFORE_ACTIVATION`: normal native shutdown removes `runtime.worker`, whereas the original guard expected that row to remain. No new runtime/configuration activated. It had created protected signer/trust and copied verified immutable release directories. Those artifacts and the failure are preserved. Original Family restarted; the follow-up verified the original Mail source/environment before restarting Mail. The refusal handler's missed Mail restart is explicitly recorded, not hidden as uninterrupted uptime. No database or private-state restore occurred.

Source review confirms native `worker.mjs` deletes only that worker registration on shutdown. Separate continuation `/opt/crp-family-admin-operations/sso-production-r2-62916891-2238-40a7-a129-f91ea782e428` verifies the already-created exact signer/public pins/per-person bindings and artifact hashes, with fresh custody and a new intent. It permits only the identified zero-or-one worker registration/heartbeat lifecycle; all23other tables remain exact, and all raw before/after rows are retained. The failed operation was not replayed. No passing source/package tests were rerun to overcome the guard.

The successful continuation saved whole stopped Family and Mail private-store snapshots and metadata, installed both native adapters/trust before enabling Family SSO, and started only the changed instances. Separate production Ed25519 signer is0600/service-owned; root-owned native trust files are0640 with a dedicated read-only group. Mail environment changed only its build and SSO trust path plus a supplementary-group drop-in. Affiliate retained every existing environment value/network/security/resource setting, adding only the exact SSO trust mount/path/group and source/operation labels.

Old Family/Mail releases and configuration remain preserved. Original withdrawn-artwork Affiliate container is retained stopped as `crp-affiliate-production-app-1-pre-sso-production-r2-62916891-2238-40a7-a129-f91ea782e428`. Rollback restores compatible code/configuration, never older native databases or business transactions. Consumer and all staging runtime/PIDs/configuration remain unchanged.

## Production public acceptance and current configuration recovery

Actual production HTTPS checks pass120: all3served assets hash to the exact accepted manifest;43read resources and46action routes reject anonymous access; foreign Origins and forged delegations fail closed;24retired Affiliate asset GET/HEAD/query cases stay410/no-store. Proof: `sso-production-public-checks.json`. Public success is not authenticated all-three acceptance.

Post-install operation `/opt/crp-family-admin-operations/sso-production-config-recovery-e994bd20-42b8-4941-9b16-5e6a6b8d378b` seals the current four-file Family configuration/integrity key/HMAC journal/production SSO signer plus the paired native-trust/Mail configuration delta. Family backup SHA256 `25b3f7186c13c43ca5a753f8a335b4af662ec50377b2b328b5d83c1e24ff1112`; delta `e5c0743511a557f79d06b90b225345bdff46b932855b2d3d5134cc66d03b6ae3`; delta manifest `69f55128511702442356bb915e6bed1e964929bf056d57da32997f279aee93d1`. Host and independent desktop recovery pass, including signer equality to both native public pins and exact production per-person bindings. No services restarted for this backup. Proof: `sso-production-postconfig-desktop-recovery.json`.

Fresh post-install preservation `/opt/crp-family-admin-operations/sso-production-preservation-d7bbb688-83b8-4ffb-b5a9-da2982f82313` verifies both Affiliate26table raw fingerprints/sequences exact, all23Mail business tables exact with only recorded worker lifecycle qualified, complete staging Consumer private bytes exact and production Consumer changed paths empty. Both Family manifests and both Mail69runtime manifests authenticate. No unqualified raw live SQLite/WAL equality is claimed.

## Completed normal human production acceptance

The owner replied “Production SSO unlocked.” Retained Chrome Work8082 was signed out; inventory located the actual owner-unlocked production session in1499638092, which had previously hosted staging. Verification used that genuine current session without reloading it or extracting any credential, authenticator value, cookie, token or browser storage. The primary personal production account and native Affiliate/Mail mappings remained the existing verified bindings.

Current0632 actual production overview confirms CRP6accounts/109cases/109reports/112results, Affiliate2clicks/1binding/0payments/0commission entries and Mail0refund-review/0reconciliation flags. All three display Access verified through the one normal global MFA sign-in/unlock, with no Affiliate provider login or Mail ticket. Application access explicitly confirms global sign-in and current native permissions checked on every operation. This is current hosted evidence, not inherited legacy-link screenshots or an inference from healthy URLs.

All27views passed at1440desktop and390mobile with no document overflow and mobile navigation closing after each selection. All46administrative forms opened and canceled; confirmation controls were present and zero submissions were dispatched. Current native CRP/Affiliate activity histories loaded; all four approved Affiliate resource markets loaded with visual collateral still WITHDRAWN. Production has no Mail orders or economic commission entries, so no new positive hosted packet, payment, payout, refund or provider/letter execution is claimed. Business transition, role/designation revocation, CSRF/replay/expiry and document boundary evidence remains the accepted genuine isolated native suites and bounded staging acceptance. No real role, price, route, partner, order, payment or provider data was changed for this production verification.

Normal production sign-out returned Welcome and the authenticated journal confirms BOTH native administration lock and primary logout succeeded. Current owner primary sessions0; native administration gained exactly one personal unlock, now revoked, and exactly ADMIN_UNLOCKED/ADMIN_LOCKED events. Old native membership/organizations/grants/tasks/unlocks and signed journal prefix remain exact. No new native Mail tickets or session rows were created. Temporary viewport was reset; retained1499638092 shows the signed-out production page. Proof files are `sso-production-0632-desktop-views.json`, `sso-production-0632-mobile-views.json`, `sso-production-0632-46-action-forms.json`, `sso-production-four-market-resources.json`, `sso-production-application-access.txt` and current production screenshots in `.local/evidence`.

## Final acceptance recovery and preservation

Successful unique seal `/opt/crp-family-admin-operations/sso-production-accepted-r5-b44865a5-b40a-4c11-9338-a50553bb8e9c` pairs the fresh whole checkpoint with full current Consumer copies from both environments and both current Family configurations/audit custody. Final production four-file Family backup SHA256 `b1463301f2479deffe6887cc75bd48b741aa6be29f3b55a5a6117aa633e1cb1c`; current-state delta `109eaf549b87a41870c5074006fdbcf63a5aba55a7fb6010d8f196717e1bf542`; manifest `54730a2cbe4fdcd589f2a39d8f20521cd6b07051954314f33a3ae3a6c97e6ce6`. Host and independent desktop recovery pass524files/538entries, production16-record and staging46-record native signed journals, both complete four-file Family recoveries/HMAC chains, actual all-three current read events and final confirmed production logout. Independent proof: `sso-production-final-accepted-desktop.json`. Final sealing did not stop or restart services.

Production billing rows are exact with zero diagnostic rotation; all other Consumer private data and business rows remain exact except the owner's advancing MFA counter and normal own session history. The saved preceding state may retain the immediately prior own session; current state has zero. Both Affiliate26table raw fingerprints/sequences remain exact. Both Mail23business tables remain exact, with the separately identified worker registration/heartbeat lifecycle retained rather than a raw live SQLite/WAL equality claim.

Staging also observed one normal personal owner unlock and subsequent lock, the same principal's advancing MFA counter and normal session history, without modifying any other account or native administrative business record. Exactly17 oldest rejected diagnostics rotated in each current/previous state:12null-event unrecognized rejections,1null-event receipt mismatch and4specifically identified nonpayable-checkout event IDs were removed;17new explicit-null unrecognized/no-effect diagnostics were added. All removed rows have null account/entitlement/effect, every retained row remains in order and all protected billing rows remain exact. The native source bounds retention by the oldest REJECTED prefix; the four non-null event IDs are retained in protected comparison evidence, without claiming fresh provider acceptance or all-null removed IDs. Complete current staging state and journal are included in the authenticated delta. No original raw whole-staging equality is claimed across this owner activity/retention interval.

All earlier strict seal refusals remain preserved: initial staging whole-row equality, the too-narrow all-null diagnostic qualifier, the already-existing prior own session in staging's saved preceding state, and the subsequent normal staging lock observed during sealing. Corrected separately named seals checked the exact observed owner/retention changes without replaying sign-in, logout, deployment, financial or postal actions and without restoring any database. Final runtime custody `/opt/crp-family-admin-operations/sso-production-final-custody-217fa114-eb39-4794-b98f-01d378720778` verifies every runtime/PID/configuration still exact since successful promotion, both Family and Mail manifests, both environments' dedicated signer/trust ownership/modes/public pins and exact existing per-person bindings.

## Remaining entry-point migration boundary

The unified panel is live and its production single-sign-in/access verification is complete within the measured scope above. Individual admin pages, partner/operator workspaces, APIs, callbacks, webhooks and recovery paths remain intact; no redirect or deletion was implemented or activated in this artifact promotion. Role-aware old-entry redirects and later asset retirement remain a separate implementation/verification step and must preserve shared Affiliate partner/Mail staff entry paths and tested recovery. Do not label those pages retired or silently change the accepted artifacts. No source push occurred.
