# OWNER-COMMON-ERROR-CHECKS-001 — Required common-error assessments

Issued October 2, 2026, America/Halifax. Authority: explicit human-owner instruction to add common credit-report error checks as required implementation and a production blocker.

Target: CRP_IMMUTABLE_ALL_82_WIZARD_BUILD_PLAN.md section 8.1.

Insertion: add the complete BLOCKER-COMMON-ERRORS-001 requirements recorded in the companion build-plan edit immediately before the Release enforcement paragraph. Status is OPEN.

Exact release-enforcement clause being replaced:

> **Release enforcement:** implement named checks for both blocker IDs in the production release checker. Missing, stale, mismatched-build or failed acceptance evidence keeps the blocker OPEN and release not ready. Close only on implementation plus tested release-candidate evidence, recording build, tests, measurements and limitations in CRP_FINAL_ACCEPTANCE_REGISTER_PLAIN_ENGLISH.md. A document edit, question endpoint alone, upload acceptance or aggregate assertion count cannot clear either blocker. Revalidate affected evidence after subsequent relevant code changes.

Exact replacement:

> **Release enforcement:** implement named checks for all three blocker IDs in the production release checker: BLOCKER-FDT-001, BLOCKER-CLARIFY-001 and BLOCKER-COMMON-ERRORS-001. Missing, stale, mismatched-build or failed acceptance evidence keeps the affected blocker OPEN and release not ready. Close only on implementation plus tested release-candidate evidence, recording build, tests, measurements and limitations in CRP_FINAL_ACCEPTANCE_REGISTER_PLAIN_ENGLISH.md. A document edit, question endpoint alone, upload acceptance or aggregate assertion count cannot clear any blocker. Revalidate affected evidence after subsequent relevant code changes.

Reason: retention/date consistency alone does not cover the consumer's expected report-error assessment. Required outcome is meaningful source-linked checks for status, balances, duplicate reporting, payment history, identity/responsibility inconsistencies, re-aging and applicable content duties, alongside existing retention/date checks.

Consumer effect: explanations identify the exact affected records, printed facts, scope of the completed checks and appropriate classification. Genuine uncertainty or off-report dependencies do not become confirmed errors, legal findings or silent clean results.

Implementation is authorized within the active acceptance program. Reuse shared interfaces; preserve existing work and concurrent file ownership. This amendment adds product requirements, not legal authority: finding permissions, explicit jurisdiction, evidence policy, privacy and CA-NS restrictions remain governing. Production remains blocked until acceptance evidence passes. Development/staging validation may continue; no live billing or external private-report egress is authorized.

Affected tests: each required category's qualifying, nonqualifying, ambiguous/missing, legitimate-lookalike, equivalent-layout and source-linked output cases; deployed PDF/image journeys; all-82 capability/test matrix; known legal exception handling; missing or mismatched release evidence blocking readiness.
