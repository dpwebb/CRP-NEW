# Family Admin guide

[Knowledge base](../../KNOWLEDGE_BASE.md)

## Sign in and unlock

Open the correct [production](https://admin.creditregulatorpro.com) or [staging](https://admin-staging.creditregulatorpro.com) workspace. Check its environment label before working.

Enter your approved CRP administration email, password, and current authenticator code. Then enter a distinct fresh code when asked to unlock administration. A code already consumed by sign-in cannot be replayed for unlock; use the next current code.

The overview shows whether Consumer, Affiliate, and Mail access is verified. Missing access requires review of the person's actual assignment. Do not borrow credentials, infer membership from email, or change another person's permissions to bypass a refusal.

## Idle locking and draft recovery

Family locks after 15 minutes without confirmed user activity. Visible user interaction can renew idle authority; background polling cannot. The original eight-hour absolute sign-in cap remains fixed, and activity does not refresh the age of MFA.

At an idle lock, the current page and unsent nonsecret draft are kept. Enter a fresh authenticator code to return. Password and fresh-factor fields must be entered again. The application never submits the draft automatically.

If the underlying Consumer sign-in has expired or been revoked, confirm the same person's password and MFA, then separately unlock administration. Changed identity, role, or permissions can prevent the old privileged page or draft from resuming. At the absolute cap or explicit sign-out, a new sign-in is required; do not promise recovery of every draft across logout, tab closure, or restart.

## Find the right administrative workflow

| Area | Typical work |
|---|---|
| Consumer | Accounts, cases and packets, billing, organizations, referral records, sharing tasks and grants, and settings |
| Affiliate | Partners, campaigns, commissions, payout proposals, holds, contacts, communications, assets, support tickets, onboarding, and reporting |
| Mail | Orders, pricing, routes/recipients, and fulfillment staff designations |
| Shared administration | Overview, access status, team controls, and the Family activity log |

The deployed catalog has 27 views, 43 read/document routes, and 46 administrative actions. The [complete workflow reference](family-workflows.md) lists the exact operations and required capabilities. The interface shows only the capabilities available to the current person.

## Make a change safely

1. Open the current native record and confirm its environment and identity.
2. Review the proposed fields and any version or expected-state requirement.
3. Complete the explicit environment/action confirmation. Supply a fresh factor when required.
4. Submit once. Read the outcome and the owning application's record.

If a response is uncertain, do not repeat the operation or invent a new request key. Family writes a durable intent before dispatch. An already-submitted result prevents another dispatch; an unknown result needs reconciliation. A changed permission can withhold a response after the native change has applied.

Only explicitly authorized operators should manage roles, bindings, recovery, deployment, or provider settings. First-owner bootstrap and exceptional recovery are controlled operations, not an ordinary sign-in workaround. Temporary QA privileges belong to a clearly labelled fictional identity, require a bounded grant and evidence, and must be retired after testing.

## Known presentation follow-up

The mobile Activity table can wrap long timestamps and identifiers into narrow columns. Use the desktop view for extended audit review. Viewport rendering was verified; very long full-page Activity screenshots exceeded capture limits. This is a usability follow-up, not a claim that every accessibility criterion is certified.

Current authority: [final lifecycle release report](../../CRP_FAMILY_LIFECYCLE_RELEASE_2026_10_25.md). Older local-only statements inside the frozen Family README describe earlier checkpoints and do not supersede that dated release record.
