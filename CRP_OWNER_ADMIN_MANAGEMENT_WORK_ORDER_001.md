# WO-ADMIN-MANAGEMENT-001 — isolated local administration

October 14, 2026. The owner asked whether CRP was ready for Admin UI implementation and then directed: “continue autonomously as owner and do not require additional input from me unless a critical decision is required.” This explicitly lifts the earlier implementation hold for the agreed administration scope. No deployment is authorized.

## Outcome and boundaries

Build an owner/staff administration portal and separate outside-partner workspaces for referrals and fulfillment, including management of the existing three-level affiliate program. Preserve the current consumer wizard, accounts, reports, assessment rules, prices, packet selection/review/approval and entitlements. Other unspecified enhancements remain held.

Administration is disabled by default behind CRP_ADMIN_ENABLED=1. Administrative metadata has separate private storage; enabling or disabling it must not migrate consumer state. Existing credentials, reports and the running local service are untouched. Development and browser proof use separate fictional accounts and data. No production/staging activation, provider configuration, live payouts, mailing, external communication or push is authorized.

Owner/staff permissions are server-owned. Ordinary signup never grants administrative access. Bootstrap is an explicit offline operation against an existing verified account with MFA. Administrative access requires a verified, ready account and session-specific MFA proof. Owner-only membership and organization management must prevent self-escalation and loss of the last owner. Staff receive explicit capabilities. Referral access never grants consumer report access. Partners see only their organization and permitted work.

Fulfillment requires an explicit revocable consumer grant tied to a current consumer-approved packet. Recheck ownership, packet version/approval, entitlement and grant on every document access; assignment does not constitute consumer approval. Queue/status work is local administration only, without external dispatch. Reuse the established three-level referral calculations and verified purchase records; do not invent purchases, balances, payout completion or new commission rates.

## Single batch assignments

| Writer | Isolated managed worktree | Exclusive files |
| --- | --- | --- |
| Coordinator | admin-integration/CRP-NEW | app.cjs integration, registered verification, manifest, this directive, AGENTS.md, single work register, browser evidence and final integration |
| admin_access_review | admin-access/CRP-NEW | service/admin-access.cjs, admin-store.cjs, deploy/admin-bootstrap.cjs, tests/sections/gb-admin-access.cjs and focused access tests |
| admin_capabilities | admin-service/CRP-NEW | service/admin-service.cjs, tests/sections/gc-admin-service.cjs and focused business tests |
| release_repetition_review | admin-portal/CRP-NEW | consumer-wizard/dist/admin.html, admin.js, admin.css and focused portal tests |

All writers start from reconciled 95617bad7a476641b7e083e63413f25b15495afa. No shared mutable implementation checkout. Coordinator reviews and integrates commits serially. Agents do not merge, deploy or message other chats.

## Acceptance and release process

Meaningful focused checks cover default-off behavior, MFA/session binding, forged permissions, last-owner protection, CSRF, revocation, cross-organization denial, data minimization, append-only audit, three-tier attribution/holds and stale packet refusal. Verify actual owner/staff/partner screens in a real browser at desktop/mobile widths. Use the adopted change-aware release workflow with one final full product regression because shared dispatch/security dependencies change. Retain failed evidence honestly. Implementation, local browser verification, hosted acceptance and production readiness remain separate statuses.

Stop only for a critical decision that cannot safely be resolved within these boundaries. Routine implementation choices are authorized. Current status: AUTHORIZED_IN_PROGRESS; hosted acceptance and activation NOT_AUTHORIZED.
