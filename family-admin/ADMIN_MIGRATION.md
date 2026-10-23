# Unified administration and single sign-in

Owner instruction: proceed with single sign-in and move all administrative functions to the unified panel; verify everything before redirecting and retiring the individual admin pages.

This is a successor to the deployed `0ceab861` portal. The deployed manual-link release remains immutable. Current successor work is local, in the Family checkout and separate `family-sso-affiliate` / `family-sso-mail` checkouts. Mail completed its hosted consumer verification/cleanup and handed staging custody to Main for coordinated preparation; no activation authority was transferred. No redirect, retirement or hosted SSO activation has occurred. The owner now explicitly holds group deployment preparation: no staging or production activation, restart, redirect or retirement before a new deployment instruction.

## Administrative coverage

| Existing area | Unified location and native operations |
|---|---|
| CRP overview, accounts, cases and billing | Existing Family overview and CRP lists; native scoped projections |
| CRP team and organizations | Team & access / Organizations; add and update through native membership rules |
| CRP internal referral ledger | Consumer referral ledger; read, synchronize verified ledger, enroll, hold and release |
| CRP shared-packet work | Consumer sharing grants / tasks; create from a current consumer grant, review/cancel, authorized exact-byte PDF download |
| CRP settings and audit | CRP settings / Activity log; native safe settings and permission-scoped audit |
| Affiliate financial and operating overview | Affiliate program report, Family overview, commission journal and native status |
| Affiliate partners and campaigns | Partners / Campaigns; applications, native qualification-gated activation with current agreement version, independently verified payee reference, campaign creation, creative brief and QR download |
| Affiliate risk and human payout review | Commission holds / concern evidence / Payout review; evidenced concern creation, release, proposal preparation and exact export. Human payment execution stays external |
| Affiliate staff and audit | Team & access / Activity log; existing scoped membership methods and native audit |
| Affiliate contacts and communications | Contacts / Communications; add/suppress, authorized template queue. Native suppression, assent, budget and sending rules remain mandatory |
| Affiliate onboarding and support | Partner onboarding / Partner support; start, advance, owner review, pause/resume, support tickets and bounded AI task requests |
| Affiliate approved content | Approved resources (four markets), campaign assets and creative brief; approved asset publishing |
| Mail orders and assignments | Mailing orders; full detail, notes, assignment, guarded cancellation and eligible refund request |
| Mail packet and fulfillment work | Exact authorized packet / provider print-preview downloads, checked fulfillment transitions, evidence and tracking |
| Mail provider controls | Order provider state, prepare, preview refresh, customer-authorized submit, reconcile uncertain result and cancel |
| Mail staff, pricing and routes | Team & access / Mailing prices / Mailing routes; designate/revoke, versioned pricing, evidence-bound routes, bureau recipient review and explicit manual emergency |

Partner self-application, agreement assent, training acknowledgement, publishing-platform declaration and launch declaration remain personal partner workflows. Consumer grant/packet approval remains consumer-controlled. Fulfillment staff retain assigned-order workspaces. Webhooks, provider service configuration and human external money release are not administrative screens to remove.

The catalog has fixed paths, methods and fields. Native service validation remains authoritative. Adding a screen or catalog entry is implementation evidence, not proof that every business transition has passed hosted acceptance. Local real-service acceptance currently exercises primary MFA, all-three reads, representative real native writes, PostgreSQL role changes, Mail designation revocation, nonce-bound handoffs and global logout. Provider submission, payments and real postal actions are not performed for verification.

## Single sign-in

Set `familySso:true` only after both native adapters and protected environment-specific trust files are installed and verified. One normal CRP password/MFA sign-in and administration unlock automatically checks the person's assigned Affiliate and Mail access. The panel does not ask for an Affiliate login/token or Mail ticket in this mode. Manual legacy linking is refused by the server, not merely hidden.

The portal signs short-lived Ed25519 delegation proofs, bound to the person, primary session, environment, exact native audience, method, path, body and per-link CSRF value. Native apps pin only the public key, check replay and current per-person bindings, introspect the active unlocked primary session on every request and apply their own current role/designation/order scope. No native membership is inferred from an email address. Native stores and provider identity configuration remain separate.

The signing key is `auditDirectory/sso-signing.pem`, an ordinary private 0600 Ed25519 PKCS8 file created through a fresh protected setup operation. It is separate from the journal integrity key. Startup refuses a missing key; do not silently regenerate it. Version-2 authenticated backups contain configuration, integrity key, journal and SSO key; version-1 recovery remains supported for the legacy three-file release. Signing-key rotation requires a coordinated native trust update and fresh acceptance.

Each native trust file is an ordinary protected JSON file referenced by `FAMILY_SSO_CONFIG_PATH`, with `issuer`, `audience`, `environment`, `publicKey` and `bindings`. Exact staging/production host pairs are required. Its `bindings` map uses immutable CRP IDs and the same explicit existing native subject/roles (Affiliate) or role/memberId (Mail), plus permitted capabilities. Both the native binding and the primary permissions must allow the delegation. Native bindings are re-read on requests so revocation takes effect immediately.

Privileged and sensitive changes require a fresh global factor. This is a step-up in the unified panel, not an application-specific sign-in. Reads reuse the existing unlocked session. Central logout, expiry, primary revocation or loss of native binding invalidates native SSO access. Native browser handoffs use a fresh browser nonce and one-use callback; they create only separate in-memory native sessions and do not manufacture persistent legacy sessions. The unified panel's normal navigation stays in the panel.

## Acceptance and retirement gates

1. Reconcile the isolated Mail adapter and migrated controls against Mail's final handed-off source/configuration. Preserve all prior source, failed operations and accepted artifacts.
2. Freeze exact separate Family/Affiliate/Mail source artifacts and bind their identities in a new coordinated release record. Run syntax, Family security/document/backup tests, native regressions and real disposable cross-repository acceptance. Independently verify portable tests and all exact artifact hashes on Linux.
3. Obtain fresh hosted custody. Snapshot and authenticate recoverable backups of every changed service/configuration/private store. Native data is never restored as a shortcut for a failed portal release. Use expected-predecessor guards, isolated stops and data-preserving rollback.
4. Install adapters and trust on staging with the exact accepted package; keep old admin entry points. Human uses normal staging password/MFA. Verify all-three automatic access without provider login or staff code, every migrated view and guarded action/refusal, exact document downloads, current roles/scopes/revocation, logout, desktop/mobile layouts and backup recovery. Use only owned fictional staging mutations. Actions that send money or mail require isolated simulation or refusal-path evidence, not a real transaction.
5. Promote identical accepted source artifacts with independent production bindings, then verify normal human production sign-in and all-three authorized reads, role boundaries, public protection, backup/recovery and preservation.
6. Only after the full parity and access evidence is accepted, activate role-aware redirects for old administrative entry points. `/admin` can redirect to the matching environment's Family origin. Affiliate `/` and Mail `/staff` are shared with partners/operators: redirect authenticated administrators only; preserve partner/staff paths and normal authentication. Do not redirect APIs, webhooks, OAuth callbacks or customer pages. Keep a tested rollback before later deleting retired admin-only assets.

Redirects and deletion are deliberately absent until these gates pass. A healthy public URL, fixture browser screenshot or representative local test cannot authorize claiming that all hosted workflows are verified.

## Creative Studio integration — October 23
Owner-approved successor: Affiliate partner Studio remains in the existing Affiliate site; its library/review/publishing controls are exposed through Family Admin using native role-scoped API boundaries. Implementation only; no redirect, deployment or source publication authority. Editable designs remain draft pending explicit human review. See the native CREATIVE_STUDIO.md contract.
