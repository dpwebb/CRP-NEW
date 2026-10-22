# CRP Family single sign-in production release — October 22, 2026

## Current checkpoint

**PRODUCTION INSTALLED; PUBLIC SECURITY, PRESERVATION AND INDEPENDENT RECOVERY PASSED. CURRENT HUMAN PRODUCTION SIGN-IN / ALL-THREE AUTHENTICATED ACCEPTANCE PENDING. NATIVE ADMIN PAGES REMAIN INTACT.**

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

## Pending normal human production acceptance

Retained Chrome Work tab1499638082 at https://admin.creditregulatorpro.com was refreshed to the installed source and handed to the owner, with only the known business email filled. The owner must enter the production password/current authenticator and the next fresh code for separate administration unlock. The asynchronous prompt awaits “Production SSO unlocked” or only the displayed error. No secret should enter chat.

After this normal human sign-in, verify current-source authorized reads across all three apps, migrated desktop/mobile views and safe controls/native authorization boundaries, activity histories and logout/revocation. Native monetary, postal or provider business actions are covered by accepted isolated suites/simulations/refusals, never executed on live records for release verification. Preserve current business data and seal fresh post-acceptance audit/auth recovery. Do not infer current production SSO from old legacy-link screenshots or healthy URLs.

Individual admin pages, partner/operator workspaces, APIs, callbacks, webhooks and recovery paths remain intact. No redirect or deletion is implemented or activated at this checkpoint. Production authenticated verification must pass before considering a separately tested role-aware entry-point migration; never redirect shared Affiliate/Mail paths indiscriminately. This production deployment is installed but its authenticated acceptance is not yet complete. No source push occurred.
