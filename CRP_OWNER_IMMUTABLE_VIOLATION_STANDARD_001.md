# Controlling owner rule: violation determination

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
