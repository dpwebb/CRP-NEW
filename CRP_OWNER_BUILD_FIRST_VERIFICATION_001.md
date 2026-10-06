# OWNER-BUILD-FIRST-001 — build, technical proof, then live staging review

Date: October 4, 2026 (America/Halifax). Authority: explicit owner correction to the implementation and validation sequence.

## Decision

A robust passing technical test can establish the implementation basis for a consumer outcome. Build the best complete platform within CRP_FINAL_RELEASE_SCOPE_001.md first. Do not require a hosted browser/payment journey before crediting implemented and technically tested functionality.

Technical proof should meaningfully exercise the configured outcome using fictional fixtures, with appropriate positive, negative, ownership and boundary cases. Existing equivalent tests may be reused. Assertion volume is not the goal. A UI/browser automation test is required only where it resolves a genuine presentation or interaction risk; it is not an automatic prerequisite for every implementation closure.

An implementation is IMPLEMENTED_AND_TESTED when its required behavior exists and robust technical tests pass. Known failed required functionality stays OPEN. Configuration flags, tautologies or untested missing behavior do not count. Preserve accurate source hashes and test-to-requirement evidence.

## Sequence

1. Reconcile current work once to the approved minimum and reuse completed implementations.
2. Implement the required platform in bounded core batches; use robust technical tests to establish outcomes and close implementation gaps.
3. Continue independent core work rather than stopping at missing hosted payment or staging evidence.
4. After the required platform is technically ready, conduct the owner/architect live staging review using fictional reports and accounts. Exercise complete one-time and subscription journeys, assessment, consumer-selected packet review/download, report comparison, billing, privacy and support across representative mechanisms with the required all-82 applicability coverage.
5. Record actual staging results, correct discovered errors and retest affected paths. Production readiness remains a separate decision after applicable staging, billing, security and provenance requirements pass.

Live staging review is later validation, not permission to fabricate a successful hosted journey or ignore a failed technical test. Do not label implementation-ready as deployed/production-ready. Existing pending payment/download outcomes remain unchanged until actually verified.

## Cline direction

Standing batch execution structure: follow `CRP_OWNER_BATCH_EXECUTION_001.md`. Architect prompts specify the batch outcome, exact scope and permissions, dependencies, acceptance criteria and stop conditions; they need not repeat its standing rules. The current in-flight work order remains authoritative until its response is reviewed.

Prioritize building the reconciled platform, not repeated audits, extra approval requests, redundant assertions or proof-format polishing. Use targeted investigation to identify the next implementable core gap, then implement it. Return precise genuinely blocking legal-source/permission decisions while completing independent work. No arbitrary expansion of product scope, rule permissions or external integrations.

This directive clarifies OWNER-CLOSURE-001 and supersedes earlier prompts that treated a live consumer journey as necessary for implementation credit. It does not change the final production gate, approved scope, evidence/precision/exception safeguards, footer-only disclaimer or external-action authorizations. No deployment, hosted payment or external message is authorized in the present implementation phase.
