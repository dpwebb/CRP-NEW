# Architecture and access

[Knowledge base](../../KNOWLEDGE_BASE.md)

## Application responsibilities

| Application | Owns | Important boundary |
|---|---|---|
| Consumer CRP | Customer identity, report intake, assessment evidence, letters, packet versions, customer approval, downloads, subscription access, and mailing permission | The customer controls packet approval. Supported assessment coverage depends on the exact country, region, bureau, report format, and reporting dates. |
| Family Admin | A shared administrative interface and a bounded gateway to the three native applications | It checks native authority for each operation. It does not replace their databases or business rules. |
| Affiliate Operations | Partner organizations, agreements, memberships, campaigns, attribution evidence, commission records, proposals, and program operations | A proposal is not proof of money paid. Human assent, activation, payee controls, and outgoing-money authority remain separate. |
| Mail Operations | Customer-approved mailing orders, final printing approval, quotes, payment/refund custody, staff assignments, provider/manual fulfillment, and delivery evidence | Paid does not mean authorized to mail. The approved packet, current order state, and mailing permission must all support the action. |

Each application has its own storage and configuration. Family uses named, allowlisted operations and explicit per-person bindings; it does not share a broad owner credential or expose an arbitrary proxy.

## Identity and permissions

1. An eligible CRP administrator signs in with their own password and authenticator.
2. A separate fresh factor unlocks Family administration.
3. Family verifies the current Consumer membership and the person's explicit Affiliate and Mail assignments.
4. Native applications enforce their own role, organization, object, and assignment restrictions.

Matching email addresses do not create linked access. An owner role in Consumer does not create Affiliate or Mail membership. Family sign-out revokes the Family session and attempts normal native sign-out; native workspaces remain independently controlled.

Consumer administration distinguishes owners, staff with explicit capabilities, and organization-scoped partners. Affiliate roles and Mail administrator/operator designations are separate. Sensitive operations require recent MFA even while ordinary navigation remains available.

## Data and evidence boundaries

The Family activity journal records coordinated operations and request hashes. Native application audit records remain authoritative for their own business events. Family is not a complete imported history of all three apps.

Local simulations use fictional adapters. Staging uses owned fictional records and existing Sandbox/Test providers. Production can contain real customers and live configuration. A local fixture response, healthy endpoint, or UI page is not proof of a real payment, mailing, settlement, or complete release acceptance.

Sources: [Family gateway](../../family-admin/src/gateway.mjs), [catalog](../../family-admin/src/catalog.mjs), [deployment contract](../../family-admin/deploy/README.md), and [final release record](../../CRP_FAMILY_LIFECYCLE_RELEASE_2026_10_25.md).
