# OWNER-CLOSURE-001 — implementation closure and release verification

October 4 owner clarification: follow CRP_OWNER_BUILD_FIRST_VERIFICATION_001.md. Robust passing technical tests can establish the implementation basis for consumer outcomes. Build the reconciled platform first; live staging review using fictional artifacts follows technical readiness and supplies later corrections. Hosted journeys are not prerequisites to implementation credit. Known functional failures remain open; staging and production readiness remain separate.

Date: October 3, 2026 (America/Halifax). Authority: the user approved the proposed three-status policy with "authorized", following explicit delegation of project-owner decisions.

## Decision

An implementation blocker is CLOSED / IMPLEMENTED_AND_TESTED when the configured behavior passes meaningful automated behavioral tests covering its functional requirements. Absolute certainty and a completed hosted payment/browser journey are not prerequisites for implementation closure. Configuration without behavioral tests does not qualify. Known failed functional behavior remains open; skipped tests do not prove the skipped behavior.

VERIFIED_ON_STAGING is recorded separately when actual deployed behavior and current-release evidence pass. A payment/browser dependency can leave staging verification pending while the implementation remains closed. It does not invalidate unrelated passing functional tests. A known failed journey must be recorded as failed/pending, not re-labelled successful.

LAUNCH_READY remains a production decision requiring all applicable launch checks, production billing and provenance. Implementation closure does not silently clear these independent release checks. Existing legal-finding, privacy, quota and source-evidence safeguards are unchanged.

Evidence records may add an `implementation` object: configured=true, named passing behavioral tests with expected/measured outcomes and functional criterion coverage, relevant source-file SHA-256 hashes, and real hash-pinned behavioral evidence references. This records tests against the code actually tested. A new unrelated release ID does not erase implementation credit; changed tested source hashes require revalidation. No arbitrary old evidence is automatically promoted.

## Explicit build-plan amendment

Document: `CRP_IMMUTABLE_ALL_82_WIZARD_BUILD_PLAN.md`, section 8.2, Extended release enforcement paragraph.

Replaced text:

> **Extended release enforcement:** register each of these fourteen IDs in the production release checker in addition to BLOCKER-FDT-001, BLOCKER-CLARIFY-001 and BLOCKER-COMMON-ERRORS-001. Missing, failed, stale or mismatched-release evidence for any ID keeps release not ready. Link each ID to CRP_FINAL_ACCEPTANCE_REGISTER_PLAIN_ENGLISH.md with exact tested build/content identity, expected and measured results, input designations and remaining limitations. Verify missing evidence and failed cases actually prevent readiness; avoid circular evidence/package hashes. Revalidate affected cases after relevant shared-code changes. Production stays blocked; staging implementation and validation continue.

Replacement text:

> **Extended release enforcement (OWNER-CLOSURE-001):** register each of these fourteen IDs in the production release checker in addition to BLOCKER-FDT-001, BLOCKER-CLARIFY-001 and BLOCKER-COMMON-ERRORS-001. Record implementation closure separately from staging verification and production readiness. Passing automated behavioral tests covering the configured functional requirements close the implementation blocker; absolute certainty and a completed hosted payment/browser journey are not prerequisites for that closure. Configuration alone or known failed functional behavior does not qualify. Preserve exact tested source hashes, expected/measured outcomes and real behavioral evidence references; relevant source changes require revalidation, while an unrelated release identity change alone does not erase implementation credit. Current-release deployed evidence remains required for VERIFIED_ON_STAGING; missing, failed, stale or mismatched staging evidence stays explicitly pending and keeps the corresponding production release gate unresolved. Link each ID to CRP_FINAL_ACCEPTANCE_REGISTER_PLAIN_ENGLISH.md with its separate statuses and limitations. Avoid circular evidence/package hashes. Production stays blocked until all applicable production requirements pass; staging implementation and validation continue. See CRP_OWNER_BLOCKER_CLOSURE_POLICY_001.md for the evidence schema and migration procedure.

This distinction also applies to implementation tracking for section 8.1 and 8.3 capability blockers; their substantive functional requirements and production safeguards remain in force.

## First migrated case

GAP-FINDING-002 receives implementation credit from the actual positive/negative classification tests and OCR result evidence on build crp-wizard-77c1605b03e2aa8d. Its same-case purchased download measured HTTP 402. Record IMPLEMENTED_AND_TESTED and PENDING_VERIFICATION simultaneously. Preserve the earlier evidence in SOURCE_CAPTURES/CLOSURE-POLICY-001; do not alter historical source captures or pretend that the download returned 200.

The checker emits `implementation_closed`, `implementation_open` and `staging_verification_pending` alongside its existing production launch failures. These lists have distinct meanings and must not be combined into a claim of public readiness.
