# Credit Regulator Pro application knowledge base

Owner and operator guide for Consumer CRP, Family Administration, Affiliate Operations, and Mail Operations. Updated October 25, 2026, Halifax time.

Start here to find the right workspace, understand a workflow, or resolve an operational problem. Release facts below come from the dated acceptance records; they are not continuous live telemetry.

## Find an answer

| Question | Guide |
|---|---|
| What does each application own? | [Architecture and access](docs/knowledge-base/architecture.md) |
| How does a customer prepare and approve a packet? | [Consumer workflow](docs/knowledge-base/consumer.md) |
| How do I sign in, unlock, manage work, or recover a draft? | [Family Admin guide](docs/knowledge-base/family-admin.md) |
| Which administrative reads and actions exist? | [Complete Family workflow reference](docs/knowledge-base/family-workflows.md) |
| How do I handle a refusal, unknown result, or release? | [Operations and troubleshooting](docs/knowledge-base/operations.md) |
| What was deployed and what evidence supports it? | [Release and evidence register](docs/knowledge-base/releases.md) |

## Open a workspace

| Application | Production | Staging |
|---|---|---|
| Consumer | [Customer workspace](https://creditregulatorpro.com) | [Fictional testing](https://staging.creditregulatorpro.com) |
| Family Admin | [Administration](https://admin.creditregulatorpro.com) | [Staging administration](https://admin-staging.creditregulatorpro.com) |
| Affiliate | [Partner workspace](https://affiliates.creditregulatorpro.com) | [Staging partner workspace](https://affiliates-staging.creditregulatorpro.com) |
| Mail | [Native staff workspace](https://mail.creditregulatorpro.com/staff) | [Staging staff workspace](https://mail-staging.creditregulatorpro.com/staff) |

## Existing specialist knowledge bases

- Affiliate public help: [Partnership guide](https://affiliates.creditregulatorpro.com/knowledge). Its editorial version must be checked separately from the application release. New local articles do not become live automatically.
- Mail staff and administrator help: [Existing Mail knowledge base](C:/CRP-MAIL-OPS/docs/KNOWLEDGE-BASE.md). That guide records the searchable native-dashboard help dialog as a local successor awaiting a separate release.
- This central guide adds Family and cross-application guidance. It does not add a help button or publish documentation inside the hosted applications.

## Recorded production status

Family release `crp-family-adae364ba65a91df162e`, source `74f1e8a`, passed its scoped Go/No-Go assessment with **103 PASS and 0 FAIL** and was promoted at **2026-10-26 02:04:34 UTC**. Existing customer data and configuration were preserved. See the [final production report](CRP_FAMILY_LIFECYCLE_RELEASE_2026_10_25.md) for the exact proof and limits.

The frozen source, final production report, and this knowledge base are included in the owner-authorized publication to main. This source publication is separate from the completed deployment and performs no production operation.

## Maintaining this knowledge base

Update the relevant guide and release register when behavior or a verified release changes. Preserve dated reports and failed attempts. Distinguish local implementation, staging acceptance, and production verification. Use sanitized evidence hashes; keep credentials, raw reports, customer identifiers, session material, recovery keys, screenshots, and private QA payloads outside Git.

This documentation update changes no application runtime, configuration, provider setting, or production data.
