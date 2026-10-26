# CRP Family Admin

## October 25 local lifecycle repair candidate

This checkout starts from production Family source `3f60497` / release `crp-family-4da6f430ef63abe2262c` and repairs FAM-01/FAM-02 locally. Production is unchanged. Its27 views,43 read/document routes and46 administrative actions are retained; held Creative Studio and postponed cost work are not included.

Family sign-in has an original eight-hour absolute cap. Trusted visible user activity renews its15-minute idle authority through the native activity endpoint without renewing MFA. Idle locking keeps the page, unsent non-secret fields, Family session and CSRF value. A normal fresh factor unlocks administration again. If the underlying Consumer sign-in has expired, the same person must confirm their password and MFA, then separately unlock administration; identity/permission reductions fail closed and drafts are never submitted automatically.

Background browser polling uses the minimal `/api/status` endpoint. It reads only local lock/expiry flags and never resolves the Consumer session or advances its native idle deadline. Every actual read, action, full session load and unlock still performs native authorization. Cookie lifetime, idle renewal and recovery never extend the original absolute cap.

Tests use fictional actors and existing source-bound Sandbox evidence. `CRP_FAMILY_CONSUMER_ROOT` selects the certified Consumer checkout for native tests. This candidate does not authorize deployment, provider changes, real mail, production authentication or Git publication. The preserved baseline documentation below retains its historical release descriptions; the lifecycle contract above supersedes its older fixed-session behavior.

## Preserved baseline documentation

The deployed legacy portal is complete. The new single-sign-in and unified-admin successor is being verified locally; see [ADMIN_MIGRATION.md](ADMIN_MIGRATION.md) for coverage, trust and staged retirement gates. Individual admin pages remain available until complete acceptance.

A standalone administration portal and bounded server-side gateway for CRP, Affiliate Operations and Mail Operations. This directory is an independent local build on `codex/family-admin-build`. No consumer runtime, release manifest, packet/mail release source, provider configuration or hosted data is changed.

## Run the fictional preview

Requires Node.js 22.17 or later; no packages need installing.

```powershell
Set-Location C:\Users\webbd\.codex\worktrees\family-admin-build\CRP-NEW\family-admin
npm run demo
```

Open http://127.0.0.1:4396. These credentials belong only to the local fictional services:

- CRP: `owner@example.test`, password `fictional-password`, authenticator `123456`.
- Administration unlock: `654321`.
- Affiliate access token: `fixture-affiliate-bearer-only`.
- Mail one-use code: `aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`.

The demo is labelled fictional throughout. Its three native-contract servers use ephemeral loopback ports; changes affect only in-memory fixture records and a unique temporary audit directory. Do not use real credentials in the demo. Stop it with Ctrl+C. The preview uses a new temporary state directory at each start.

## What is implemented

- One responsive workspace covering consumer accounts/cases/billing, actual Affiliate Operations partners/campaigns/commission journal/payout proposals, and Mail Operations orders/pricing/routes/designated staff.
- CRP password/MFA sign-in followed by its existing separate administration unlock; private upstream cookies stay in the gateway's memory, never browser storage. Sessions expire after 15 minutes. Every operation revalidates CRP administration. Privileged actions require a factor verified within the last minute.
- Per-person explicit Affiliate subject/role and Mail role/designation bindings. Neither matching email addresses nor being a CRP owner creates membership in the other applications.
- Existing native APIs, cookies/bearer authentication, origin checks, Mail CSRF and object/assignment permissions remain authoritative. There is no database sharing, new business ledger, broad service-account token or generic URL proxy.
- Named management actions: CRP team/organization changes; Affiliate partner applications/activation, campaign creation, scoped operator/analyst membership changes, commission-hold release and payout proposal preparation; Mail notes, assignment, cancellation, eligible refund requests, designation/revocation and version-checked pricing. Bodies and available fields come from a fixed operation catalogue. Native services validate the domain rules again.
- Explicit action/environment confirmation, fresh MFA for owner changes/refunds, a synchronized intent written before dispatch, and no automatic mutation retries. Duplicate request keys are not dispatched again. A matching unresolved request also blocks a new key. Check the owning application's record when an outcome is unknown; do not delete the journal to retry.
- An authenticated, HMAC-chained, fsynced activity journal containing actor/application/operation/record and request hashes, not request bodies or credentials. Only one gateway process may own its journal directory. Truncation, modified rows, a missing key or a second process fail closed. Previous intents survive restart; login sessions do not.
- Distinct local/staging/production configurations, fixed permitted upstream hosts, strict portal Host/Origin/CSRF checks, request/response bounds, per-address login limits, secret-field redaction, unavailable-state handling and revoked-response withholding.

## Authentication boundary

With the new explicit `familySso:true` configuration and both native adapters installed, one normal CRP MFA sign-in/unlock automatically authenticates the person's assigned Affiliate and Mail access. No separate provider login or Mail code is requested. Native permissions, dynamic bindings, scopes, global fresh-factor checks and logout remain enforced. The protected signing key is included in authenticated version-2 backup/recovery. This successor has not been activated on hosted environments. See ADMIN_MIGRATION.md.

The following describes the deployed legacy mode (`familySso` absent or false):

This build provides one **portal sign-in**, with explicit native application links. It does not replace the three applications' identity systems. Affiliate can use normal sign-in through its existing dedicated issuer/client when the protected `affiliateLogin` settings and exact callback are configured; its native JWT verifier and existing membership remain authoritative. The local preview also supports its fictional token link. Mail accepts an existing one-use staff code. Links expire with native access and must be reconnected. CRP credentials cannot sign someone into an unrelated Affiliate or Mail identity.

Affiliate OAuth uses the existing **public PKCE client**, one-use state and nonce, with a five-minute flow lifetime. No client secret is needed or accepted. Its cross-site callback captures only the temporary code and returns to a clean portal URL. Exchange requires the original CRP session and CSRF; no identity token reaches browser storage. Uncertain exchanges are not retried. The existing environment-specific client must retain its current native callback and add only `https://admin-staging.creditregulatorpro.com/auth/affiliate/callback` (staging) or `https://admin.creditregulatorpro.com/auth/affiliate/callback` (production). Keep its existing client ID/audience and `openid` scope; do not add profile/metadata access or a different issuer. This integration does not mint tokens, extract browser cookies, copy consumer credentials into Affiliate, or grant native staff membership.

## Configure a real environment later

Copy `config.example.json` to a protected configuration file outside this source directory. Set an existing private audit directory and the correct origin; run as a dedicated unprivileged OS account with a reverse proxy to the loopback listener. Restrict directory/config/key/journal access to that account (0700 directories, 0600 files, or equivalent Windows ACLs). Preserve and encrypt the complete journal and integrity key in backups. The process lock is not automatically removed after a crash; verify the old process has exited before recovering it. Never clear an uncertain intent or discard the audit history.

Populate `bindings` only from verified existing memberships, using the immutable CRP account ID and the Affiliate identity subject or Mail designation ID. Example shape (illustrative IDs only):

```json
{
  "acc_aaaaaaaaaaaaaaaaaaaaaaaa": {
    "affiliate": {
      "subject": "verified-dedicated-issuer-subject",
      "roles": ["owner"],
      "permissions": ["affiliate.read", "affiliate.manage"]
    },
    "mail": {
      "role": "operator",
      "memberId": "existing-country-designation-uuid",
      "permissions": ["fulfillment.read", "fulfillment.prepare"]
    }
  }
}
```

An explicitly authorized existing Mail administrator can instead be bound with `role:"admin"`. The one-use code still must have been issued for that role. Administrators do not receive a fictitious designation; operators must match the exact active native designation. Portal capabilities are the intersection of the current CRP permissions and the configured application permissions. Native membership and object-level scope are checked on every operation before and after asynchronous reads; native handlers enforce writes independently.

```powershell
$env:CRP_FAMILY_CONFIG='C:\protected\crp-family-admin-staging.json'
node src/server.mjs
```

The owner has authorized a separate staging/production release after Mail completes its release and custody handoff. The separate release requires a verified configuration/binding inventory, TLS/reverse-proxy setup, backups/recovery and exact-build staging acceptance. See [the independent deployment instructions](deploy/README.md). Hosted startup refuses changed or incomplete release files and reports exact provenance in `/health`. Preparation is not proof of deployment; current hosted acceptance is recorded in WORK.md.

## Existing application workflows retained

Consumer identity/recovery, credit-document access, reassessment and customer packet approval stay in CRP. Affiliate assent/payee verification, outgoing-money release and independent settlement stay in Affiliate's approved human process. Prepared proposals and their native exports are available for review; the portal exposes no payout execution endpoint. Provider submission, approved mailing PDFs/cover/return-address review, manual handoff evidence and route/provider edits remain in the native Mail workspace. The portal cannot bypass customer approval or the in-progress PostGrid release. Shared overview totals retain their source and currency; commission ledger movements are not labelled paid commissions.

The gateway activity page shows its own coordinated actions. Each app's native audit remains authoritative; this portal does not claim to have imported a complete historical audit across all apps. The gateway is optional: native admin workspaces remain independent if it is unavailable.

## Validation

```powershell
npm run check
npm test
```

Integration tests cover genuine isolated CRP HTTP login, replay-protected MFA, native listing and revoked admin unlocks. Affiliate and Mail connector tests use loopback native-contract fixtures; they do not prove hosted OIDC, paid transactions, physical posting or production readiness. Security tests cover explicit identity mismatch, permission changes, revocation during reads, CSRF, Host and environment isolation, field/path allowlists, uncertain/duplicate writes, recent-factor checks, bounded sessions/login attempts and durable/tamper-evident audit records.

Desktop and mobile review uses the fictional preview only. Screenshots and raw local test logs belong under `.local/`; they are not release certificates. Native contracts were inspected in CRP `admin-service.cjs`/`admin-access.cjs`, Affiliate `service.mjs`/`operations.mjs`/`auth.mjs` and Mail `staff.mjs`/`pricing.mjs`/`team.mjs`. Hosted acceptance must recheck the actual deployed versions.
