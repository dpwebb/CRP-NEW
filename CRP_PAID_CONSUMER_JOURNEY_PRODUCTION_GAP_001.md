# Paid consumer journey production gap

Date: October 8, 2026 (America/Halifax).
Authority: the owner requested a production gap containing the first-visit-through-packet-printing pain points, a repair plan, and execution until the gaps are complete.

Gap ID: **GAP-PAID-CONSUMER-JOURNEY-001**. Outcomes: INTAKE, PACKETS, PURCHASE, TRUST_AND_RELEASE. This consolidates demonstrated consumer defects under the existing approved scope; it does not duplicate the existing packet, billing, account or all-82 blockers.

Implementation: **OPEN**. Staging verification: **PENDING**. Production readiness: **OPEN**.

## Owner correction: mail-in disputes

The consumer path is a paper dispute mailed to the selected bureau. Do not offer online submission as the application workflow. Every bureau is treated as having a postal dispute route unless official prima facie evidence establishes an exception. A missing address in the current mapping is a mapping gap, not proof that postal disputes are unavailable. Verify and retain official source support for postal destinations and required forms; never invent an address. CRP prepares the packet for consumer review, printing and sending; it does not send it or buy postage.

## Gaps and completion criteria

| Item | Demonstrated pain point | Required repair and evidence | Status |
|---|---|---|---|
| 1 | The first visit does not clearly state the service or next action. | Plain introduction: upload a report, review supported VIOLATION findings, select disputes, review and print the packet. Keep internal reader/check wording out of the consumer shell. | OPEN |
| 2 | Purchase differences and prices appear late. | Show configured public prices and the free summary / one-time full assessment / subscriber packet distinction before registration, preserving current entitlements and prices. | OPEN |
| 3 | Nine numbered steps make utilities appear required after download. | Preserve the wizard; show its main journey separately from account/history/deletion/support/billing tools, with an accurate progress indicator and clear completion. | OPEN |
| 4 | No visible secure forgotten-password path. | Implement a visible usable recovery path, verify account isolation, rate limits, one-time recovery, credential hashing and session revocation. Do not claim unconfigured email delivery. | OPEN |
| 5 | Upload preparation is burdensome and guidance appears late. | Before upload, provide short PDF/image preparation guidance and accessible detailed limits, preserving existing file/page/storage safeguards. | OPEN |
| 6 | Results lack a prominent next action to create a packet. | Give an entitled consumer a clear route to packet preparation; keep one-time assessment-only access truthful. | OPEN |
| 7 | Contact/document detours lose packet edits and return to upload. | Preserve the current draft before leaving review and return to the same case/result/packet after account changes. No cross-account or stale-context reuse. | OPEN |
| 8 | Approval can precede display of the current full packet, including added wording. | Show the complete current correspondence/evidence/consumer wording and attachments before approval; material edits invalidate review/approval until refreshed. Verify preview/download equivalence. | OPEN |
| 9 | Submission choices include unsupported methods. | Use the owner's postal-only consumer flow; fill verified postal mappings and display the selected bureau's destination/checklist. Keep any proved exception explicit and internal evidence retained. | OPEN |
| 10 | Download requires manual text formatting and assembly to print. | Produce readable paginated correspondence/evidence PDF, a clear print action and attachment checklist, preserving original attachment bytes and approval/entitlement binding. Reduce duplicate technical presentation without dropping selected facts or source locations. Render and inspect actual PDF output. | OPEN |

Returning consumers' saved reports must also be recognisable by bureau/date/file identity; this is included in the navigation repair.

## Execution plan — Batch 66 in the single work register

1. **66A UI:** isolated writer owns `service/ui/app.js`, `index.html`, `style.css`, and affected existing UI/browser sections K, BN, BO, BW, CP, EC, ED and AZ. Repair first visit, price visibility, progress/tools, preparation guidance, results action, saved-report identity, safe draft detour/current preview/print action and recovery UI against root's API contract. No backend or packet writer files.
2. **66B packet:** isolated writer owns `service/packets.cjs`, a bounded new PDF module, and affected existing packet sections CB, BL, BY, CZ and DC. Make preview/download match, include consumer wording, concise correspondence and one evidence appendix, approved PDF output and unchanged original attachment ZIP entries. No UI, auth, bureau mappings or deployment edits.
3. **66C coordinator:** root owns authentication/public-price/PDF HTTP endpoints, postal requirements/support/errors, register/gap record, manifest/test registration and serial integration. A read-only official-source researcher verifies postal destinations and any actual exception; source absence cannot become a postal prohibition.
4. Integrate each writer serially after diff review; run affected meaningful checks. Exercise real local first-visit/account/upload/assessment/subscriber selection/document-return/review/approval/PDF-download journeys with fictional data; reuse regional loops for all 82.
5. Render representative short/long PDF pages and verify print layout, selected evidence, original attachments, isolation, approval and price/access boundaries. Run one justified frozen full regression after executable work is stable.
6. Package and verify the authorised staging candidate with exact source/manifest/archive binding and rollback. Record actual staging outcomes separately. Production activation, live charges and bureau dispatch are not part of this repair.

Multiple writers use separate managed Git worktrees and bounded nonoverlapping ownership. Root preserves the main checkout and integrates one completed change at a time. Completed tests are implementation evidence; all gap rows need measured passing evidence before implementation closure. Production controls remain separately open.

## Measured outcomes

Pending implementation. No closure is claimed by creating this record.
