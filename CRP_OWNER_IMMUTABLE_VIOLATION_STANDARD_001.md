# Controlling owner rule: violation determination

## October 11 source-supported non-violation concerns

Owner instruction: "Fix these gaps and surface these concerns violation and non-violation on the report", followed by "Also add these to the common-errors list and have CRP look for these in other credit reports in jurisdictions that have similar requirements".

Add the supported address-geography, payment-claim/status, closure-date disclosure, undated payment-history disclosure, identifier-handling and credit-data-category mechanisms to the shared checklist. A completed, source-supported concern whose breach predicate is not established may appear as **NON-VIOLATION CONCERN**, with its specific facts and consumer-controlled verification request. This classification does not assert compliance, legal wrongdoing, a proven payment, a reporting deadline breach or unlawful identifier disclosure. Supported checklist breaches retain **VIOLATION** and their existing evidence gates. Failed/unrun checks, unread fields and internal extraction diagnostics remain internal.

Reuse shared readers and facts across reports, with jurisdiction-specific requirements, effective dates and exceptions. Generic factual review concerns do not acquire an Australian legal rule when used elsewhere. New source mappings must remain bounded and supported. Preserve selection, review/approval, source custody, ownership, privacy and entitlement controls. This private implementation instruction does not authorize public deployment.

## October 11 reporting-period amendment

The owner's explicit reporting-period directive is recorded in `CRP_OWNER_REPORTING_PERIOD_DIRECTIVE_001.md`. Reporting-period assessment must not exclude tradelines or collections based on favorable/adverse classification. Retain applicable numerical periods. First delinquency is the determining date when available; otherwise last payment is the determining fallback date, with its own source evidence and original field identity. This is a date-selection instruction, not a separate CRP rule or a claim that a statute prescribes that fallback. Implementation and release statuses must remain distinct.

## October 10, 2026 owner scope amendment

The owner expressly authorizes expanding CRP's violation detection to cover existing and newly identified common errors. Every new supported error must be added to the shared common-error checklist and carried through extraction, bounded determination, the consumer issue and selected packet. Each added violation must name a supported reporting requirement, use source-linked report evidence, preserve honest confidence and the existing consumer selection and packet safeguards, and pass positive and benign regression tests. The former list remains a priority and regression baseline, not a fixed numerical ceiling. Seeded temporal errors, including exceeded credit-reporting periods, belong in this test program when their dates and applicable rule are specified. Do not infer a violation from a missing field unless the requirement and the report's own facts support that conclusion. This amendment authorizes private build and testing; it does not authorize public release or deployment. The October 7 provisions below continue to govern matters this amendment does not change.

## Latest owner amendment — one consumer violation term

October 7, 2026: the owner explicitly directed that when the system determines an element of the common-error checklist has been breached, its platform terminology is **VIOLATION**. Only **VIOLATION** is surfaced as the breach classification; do not display probable or potential violation wording. The owner confirmed that this rule supersedes other terminology directives.

This amendment changes consumer terminology. Preserve internal confidence classifications, evidence thresholds, source custody, specific uncertainty, packet eligibility and approval safeguards. Do not add a certainty gate, change a rule predicate, or invent a breach for an unrun or unresolved check to implement the wording.

**Owner direction, October 7, 2026, amended by the owner's explicit October 7 instruction naming this document.** This rule controls later work orders, implementation batches, reviews, tests, and consumer language. A later work order may refine evidence, but it may not silently restore a legal-finding category, a mandatory statute gate, a second-statute threshold, or retired out-of-checklist violation checks.

CRP's job and consumer promise is to surface a **violation** when source-linked credit-report evidence supports a breach of a defined reporting rule, statute, or requirement within the active common-error checklist. The product does **not** determine legal findings. The checklist is the active version 1 violation scope. Independently sourced statutory violations outside the checklist are retired from runtime assessment, consumer findings, packets, and active test expectations. Preserve their source records for later review. Statutes may guide and support a listed check when an applicable, accepted mapping exists; their absence does not suppress a violation supported by that check's report-data rule or reporting requirement.

The implementation must:

1. Name the breached rule or requirement and the report facts or explicit omission that satisfy its predicate. Keep each fact tied to its own report record and source location.
2. Use definite, probable, and potential confidence according to the evidence. Do not upgrade an ambiguous signal merely because a statute exists, or downgrade a sourced rule breach merely because a statute is unmapped.
3. Apply the same listed report-data rules to every supported jurisdiction where the required presentation and facts are available. Jurisdiction-specific statutes that support a listed check remain scoped and sourced.
4. Surface violations in the consumer result and let the consumer select them for a reviewable correction or verification packet. Do not describe these as “legal findings” or require a legal-violation classification to make them selectable.
5. Preserve source, evidence, privacy, packet approval, and release safeguards. An unrun or unresolved check does not establish either compliance or a violation.
6. Keep all downstream product functions available: consumer selection, dispute review and approval, packet generation and download, continuing comparison, and other authorized application flows. This rule changes violation determination and wording; it is not a stop condition for packet delivery.

Any future work order that changes this rule requires an explicit owner instruction identifying this document and the intended replacement. Regression tests must fail if a common-error violation again depends on a jurisdictional statute or if the consumer flow reintroduces a legal-finding category.
