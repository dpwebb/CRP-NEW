# CRP family readiness register — October 22, 2026

**Family go/no-go: NOT READY FOR PRODUCTION APPROVAL. Both staging and production deployment/activation remain held.** Main coordinates the family release; Mail completed its existing campaign and explicitly handed staging custody back to Main for coordinated preparation. The handback grants no activation authority. Readiness reporting and existing authorized campaign verification/cleanup do not authorize a new deployment, configuration change, restart, rollback, source push or retirement.

This is preparation for four separately deployed components supporting the three CRP apps. Main has performed no hosted SSO probe, installation or deployment in this continuation. Runtime entries below are the owning coordinators' latest reports, not a fresh Main runtime inspection.

## Source and artifact custody

| Component | Accepted runtime reported by owner | Prepared successor | Verification / remaining gate |
|---|---|---|---|
| Consumer | Production `crp-v1-5ab1c55ddfad7229` / `917dea2`; staging `crp-v1-068133f19c359537` / `20b2a55` | Mail-owned `20b2a55eb478847c076df15cc4e92ece19222c7f`, 191-file accepted package | Mail reports full 20035/0/0; strict 30/123/46; 12 genuine Sandbox cells, upgrade/cancel, exact packet flow and all 13 owned actors / 8 subscriptions cleaned. Final clean handoff f65a546 received; exact strict receipt independently hash-checked locally. Production remains unchanged. |
| Affiliate | Both `withdraw-604fcad3f212dcfa` / `3632ace60dcb106b370362a32257bfab6ec1e6ad`, image `sha256:b7de746456c8d0cfabdbc8413cb444c534d7c8ab8276339594c8999f01a41d29` | Isolated `codex/family-sso-affiliate`, `5b1adcc0d4505884331119569198fdf0577680c8` | Final full **100/100**, no failures/skips, on the committed integration. Withdrawal is an ancestor; all six files remain absent. Native SSO runtime packaging, independent Linux proof and hosted acceptance remain pending. |
| Mail | Both `mail-internal-692f1bc9b3efff7f` / `59127e4aff38a5adfc57268c16ef2a340259a2db`, schema10 | Isolated `codex/family-sso-mail`, `04b2c6526d815c0d21ae69f8ceb2aa8c7da50da6` | Final full **79/79**, no failures/skips, explicitly using Consumer20b2. Native recipient/provider/routes/payment/packet/worker/schema code unchanged. Runtime packaging, independent Linux proof and hosted SSO acceptance remain pending. |
| Family Admin | Both `crp-family-0ceab8619bc8b9eec832` / `ceb4201876adb6f540085a44c4739f4ba082f028`, manifest `375e9bdc3aec004976803d8284317107c1fa4df34a4e63b529d939355256fb53`, 34 files | This standalone `family-admin/` successor; exact source/release/manifest is supplied by its frozen `release.json` and private group tuple | Local implementation and browser verification completed; final exact-source test/package receipts are under `.local/evidence/`. No hosted successor, signing key or trust configuration installed. |

Native companion source archives are review/recovery snapshots of committed source, **not accepted runtime images**:

- Affiliate111 files: `.local/group-candidates/20261022-sso/affiliate-5b1adcc0d450.tar.gz`, SHA256 `848571eb04b5ab00156fffc5c42b86bcad8f361b0d85342ee2c8049299be65ac`.
- Mail99 files: `.local/group-candidates/20261022-sso/mail-04b2c6526d81.tar.gz`, SHA256 `acba62e990f9f7259c92c0da46da0e6e3951e642f9e469d0f23e46e3b21e09fd`.

No source was pushed. The canonical Consumer checkout remains unrelated dirty work and must not be blanket-packaged or blanket-merged. Affiliate's canonical accepted history and unpublished SSO successor are preserved independently. Mail has no configured Git remote. Local archives do not replace independently recoverable off-host source and private-data custody.

## Main verification and precise limits

The unified catalog and navigation cover the administrative functions listed in [ADMIN_MIGRATION.md](ADMIN_MIGRATION.md). One global CRP MFA sign-in/unlock automatically authorizes explicitly mapped Affiliate and Mail access. Ordinary permitted work reuses the session. Privileged/sensitive actions retain a fresh **global** factor, with no Affiliate password/token or Mail ticket prompt. Current primary/native membership and scope are checked for each request; in-flight financial/postal outcomes must still be reconciled rather than replayed.

Real disposable Consumer20b2 HTTP/MFA, Affiliate PostgreSQL/Fastify and Mail SQLite/Fastify acceptance verifies automatic all-three reads; real fictional organization/designation/price/campaign/contact changes; native-browser CSRF; one-use nonce handoffs and replay refusal; ordinary work after a minute without another login; fresh-factor refusal for privileged work; role/designation revocation; order assignment scope; global logout and standalone staff access after stale SSO cookies. Shared protocol/client bytes are checked across all three source trees.

Withdrawal acceptance on the integrated successor includes all 24 GET/HEAD/query410/no-store checks and WITHDRAWN/empty frames/banners/null publishing image URL. The final clean100/100 integration run is new evidence; it does not relabel the older withdrawal run's 98-pass/2-obsolete-expectation failure as a clean historical run. The earlier Mail78/79 run against its stale default Consumer checkout is retained; pinned20b2 final79/79 is distinct.

The actual local browser passed all **27 views at1440px and27 at390px**, without document overflow or an open mobile menu after navigation. Managed-access UI has no separate connect/disconnect/sign-in prompts. Address/code fields remain separate and blank, expiry uses a date/time control, and a uniquely owned fictional form submission passed. Initial INVALID_QUERY observations remain retained; those two views were corrected and rechecked. Temporary viewport, browser session/tab and local preview listener are cleaned up. These are fixture browser checks plus separate real native-service HTTP acceptance, not hosted human sign-in or provider acceptance.

Exact document bytes are retained and withheld on post-fetch access revocation. Authenticated backup/recovery tests cover the separate SSO signing key and legacy backups. Local Docker Linux engine is unavailable; no shared engine or hosted service was started to manufacture an independent Linux proof. No actual new four-component recovery checkpoint has been created under the hold.

Read-only source reconciliation confirms the packet-only8e0f9aa composer and all five touched test sections are byte-identical in accepted Consumer917dea2 (`.local/evidence/packet-source-reconciliation.json`). This reconciles code history, not a new deployment or PDF acceptance. Older intermediate packet work orders remain historical; do not replay40d2 or any prior packet release.

## Blocking gates and ownership

| Gate | Owner | Exit evidence |
|---|---|---|
| Hold on both environment activations | Human owner / Main | Explicit authorization for the intended staging transition; production stays held until its separate go-ahead |
| Existing staging campaign and custody — COMPLETE | Mail → Main | Handoff f65a546; exact acceptance SHA85987CF05C71C3A0F9EC948ED57C2F4758CF1CD8FFC700FA4237579CBFE169C4 verified from disk. All13QA actors /8subscriptions cleaned; one unpaid quote retained and expired; no Mail hosted operator/browser remains. No activation authority transferred. |
| Native SSO runtime artifacts and Linux verification | Main with native owners | Exact tested companion artifacts/build identities and independent Linux verification, retaining withdrawal and current Mail policy |
| Protected per-person SSO trust and recovery | Main after release authorization | Separate environment signers/public-key pins, verified current individual bindings, complete authenticated backups plus independent recovery for all affected components |
| Complete hosted SSO/admin parity | Main after authorized staging activation | Normal human sign-in/MFA/unlock; all three automatic authorized reads; every migrated function's safe domain/permission/refusal evidence; expiry/replay/logout/scopes; exact documents and desktop/mobile acceptance |
| Production verification and retirement | Main after separate production authorization | Identical accepted artifacts, fresh live-order custody, authenticated recovery, all-three authorized live reads and rollback proof; only then role-aware old-admin redirects and later asset retirement |

Consumer/Mail `launch_ready:false` and Affiliate `realAttributionVerified:false` do not authorize cosmetic flag changes or experiments with a real sale/charge/refund/payout/letter. Genuine staging operational and Sandbox payment evidence can support release readiness within its measured scope. A real production attributed sale/commission/settlement is a separate commercial claim and remains unproved here.

## Later execution order and rollback

After the hold is explicitly released: receiving native Affiliate/Mail adapters and protected trust first while existing access stays available; enable the matching Family successor only when both contracts pass; use Consumer0681's accepted artifact if that promotion is separately authorized. Stage first, verify the entire affected family, then seek production approval. Preserve all current orders, provider intents, approvals, documents, payments, signed authority, accounts, native identity clients and switches. No incidental provider activation, schema migration or shared reboot.

Fresh coordinated encrypted recovery must cover both environments and all four components: Consumer private/security/billing/documents, Affiliate nonempty26tables/sequences/config, Mail SQLite/orders/previews/config, and Family configuration/journal/integrity/signing keys/service/router. Current accepted backups are retained; an October20 checkpoint is not current recovery for these successors.

Rollback restores each immediate accepted code/image and compatible configuration while preserving later data. Affiliate must retain the withdrawal image above, never the earlier banner image. Mail keeps live orders/payment/provider/preview custody and reconciles UNKNOWN outcomes. Family retains journal/key/intent history and can disable new delegation while native access remains available. No old database overwrite, transaction undo assumption, credential rollback or old-operation replay. Old admin pages and partner/staff workspaces stay available until replacement, access and recovery are verified.
