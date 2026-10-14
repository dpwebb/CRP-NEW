# CRP administration

Authority: `CRP_OWNER_ADMIN_MANAGEMENT_WORK_ORDER_001.md`. Local implementation only. Administration defaults off; this work does not enable an existing service, replace credentials, deploy, send mail or pay affiliates.

## Entry and access

With separately approved configuration `CRP_ADMIN_ENABLED=1`, `/admin` serves the portal and `/partner-access` serves consumer packet-sharing controls. Otherwise every related page, asset and API returns 404, without opening admin storage. A corrupt/unavailable optional admin store refuses admin requests while normal consumer operations continue.

Use existing CRP account sign-in. An administrator must have a verified email, completed signup and enrolled authenticator. A fresh authenticator code then unlocks administration for 15 minutes, bound to that consumer session and current MFA credential. A code used for sign-in cannot be replayed for unlock. Privileged tokens use HttpOnly, SameSite=Strict cookies scoped to `/api/admin/`; browser storage holds no credentials. Role, MFA, expiry, membership revision and organization status are checked on each operation.

| Role | Authority |
| --- | --- |
| Owner | Full administration; team and organization management; may assign another eligible owner. |
| Staff | Explicit account, case, billing, affiliate, fulfillment or activity capabilities. Cannot grant roles or manage organizations. |
| Partner | One active organization; explicitly assigned affiliate and/or fulfillment capabilities. No customer directory, billing, owner controls or unrelated report access. |

No signup body, invitation link or first logged-in user becomes an owner. Owner-only team controls require a verified, completed, MFA-enabled target account. Team controls preserve at least one active eligible owner; deleted/ineligible owner rows do not count. Consumer account deletion remains available and immediately invalidates that account's sessions.

## First owner and exceptional recovery

The offline operator tool is `deploy/admin-bootstrap.cjs`:

```text
node accelerated-launch/service/deploy/admin-bootstrap.cjs --data-dir PRIVATE_DIRECTORY --account-id EXISTING_ACCOUNT_ID
```

Supply the current authenticator code through standard input, never an argument. The tool requires exclusive access to the existing private consumer store and refuses a live writer. It creates only the first owner; it does not enable the feature or grant a consumer purchase. Do not stop the current service under this local-build authorization.

Prefer assigning another eligible owner before retiring an owner account. If every owner becomes unavailable, the same offline command accepts the explicit final flag `--recover-orphaned-owner`. This requires private operator access, a stopped writer and the chosen verified account's fresh MFA; it refuses while any active eligible owner exists. It atomically retires orphaned owner authority, revokes affected unlocks and records recovery while preserving original bootstrap history and consumer records. There is no HTTP recovery or automatic rebootstrap path. This build performed no real owner registration/recovery.

## Management workflows

Accounts, cases and billing expose permission-limited metadata and verified purchase status. These screens do not approve packets, edit report findings, grant purchases or make provider changes. Lists support bounded pagination, search and relevant status filters. Owner team/organization changes and other mutations persist their safe audit records in the same admin transaction.

Affiliate management reuses the existing three-level engine: 15%, 10% and 5%, the existing 14-day hold and 10%/180-day reserve policy. Enrollment/upline management, organization scope, tree, verified rewards, reserve schedule and review holds are available. **Reconcile verified purchases** projects only persisted verified completed first retail purchases and applied refund events; tax is excluded, renewals/recruitment are excluded and repeat reconciliation is idempotent. No provider fetch, live referral activation, payout worker or paid-status override is introduced. Review holds remain administrative restrictions; this portal cannot pay money.

For fulfillment, an owner shares an organization's manual-copy link; no message is sent by CRP. The consumer signs in to `/partner-access`, chooses their own report, reviews the organization and approves explicit access to the exact already-approved packet. Existing grants remain revocable even if the organization is disabled or its reference is missing. The grant list supplies the reviewed packet version/hash without exposing unrelated reports.

Owner/staff with `fulfillment.grants` select a current consumer grant to queue work. An assigned fulfillment partner may read the granted PDF and record review/cancellation. Every document access rechecks current consumer approval, exact version/hash, account/case ownership, entitlement, active grant, organization and role. Revocation, packet changes, lost entitlement or disabled membership stop access. Browser download equals the approved PDF. Previously downloaded copies cannot be recalled. Queue states do not claim delivery, print, payment or mailing.

## Private metadata, custody and rollback

Metadata is stored beneath the existing private data directory in `admin/`, with its own schema, writer registration, integrity key, signed append-only journal and durable high-water head. Consumer `state.json` schema and report/PDF blob storage are unchanged. MFA enrollment/unlock uses the existing consumer security machinery. Affiliate enrollment/reconciliation intentionally updates the established referral snapshot; cross-store failures reconcile before compensating and never overwrite an unrelated newer snapshot.

Do not delete or truncate the admin journal/head/key or restore a stale metadata snapshot independently of the rest of private custody. The materialized `admin/state.json` is a cache, never a permission/revocation recovery source. Corruption, missing acknowledged history or unknown authority fails closed. An interrupted initial bootstrap can require operator repair; automatic recovery of every first-write failure is not claimed.

The existing encrypted backup scripts copy and verify the entire private data tree, including this subdirectory and key when present; no hosted backup was run or changed. Disabling the feature leaves metadata in custody. Older consumer runtime rollback does not migrate this separate admin schema. Hosted restore/rollback acceptance remains pending.

Journal snapshots accumulate with history. The local 100-update/100-read probe avoids historical journal replay during steady-state reads; it is not a production capacity certificate. Windows directory fsync is unavailable through Node, matching the existing private-store platform limitation. Production activation requires the separate hosted/custody/operational gates.

## Verification and release

Registered sections: `gb-admin-access`, `gc-admin-service`, `gd-admin-http-browser`; included in security and browser selection as applicable, and all run in the default full product regression. The browser section uses actual Chrome and fictional isolated stores for owner/staff/partner views, organization creation, exact-PDF download, delayed selection protection, disabled-organization revocation and responsive navigation. Full release preparation uses `deploy/release-workflow.cjs prepare` then `check`, `record` and `package`.

Hosted smoke checks bind administration's explicit expected state. Default expectation is disabled: all six gated assets and both entry aliases must return 404 while private shipped files remain manifest-bound. With separately authorized enablement, pass `admin-enabled` after the package receipt in `smoke`, or after the output directory in `activate`; health must report enabled and available, and assets/aliases must match exact committed bytes. These verification arguments never configure or enable a server. Staging/production activation still require their respective owner authorization.
