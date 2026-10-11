# Owner-authorized change-aware release process

Authority: October 11, 2026 owner request, “Enable these proposed process improvement’s.”

This amendment changes verification frequency and execution mechanics. It supersedes the blanket requirement for a new full product regression for every finished executable batch in `CRP_OWNER_BATCH_EXECUTION_001.md` when the bounded paths below apply. It does not change product scope, the 21-item checklist, 82 jurisdictions, reporting-period directives, consumer approval, ownership, privacy, billing or release acceptance requirements.

## Required workflow

1. Plan against the last accepted source commit and its complete passing full regression. Include tracked changes, relevant untracked code, deletions and baseline dependency drift. Preserve unrelated dirty work.
2. Documentation and release tooling changes: verify the changed tools and source continuity. Do not rerun product tests or hosted purchases when product dependencies are unchanged.
3. Static HTML, CSS and icon changes: run consumer, security and browser lanes plus named UI/auth/flow sections. Verify the actual changed hosted journey and exact served bytes. Shared UI JavaScript changes require full regression. Purchase-related markup changes additionally require genuine provider acceptance. A focused receipt is never represented as a new full regression.
4. Shared runtime, rules, extraction, test contracts, billing/entitlement or unknown executable dependencies: run full product regression. Billing or purchase changes additionally require a legitimate provider test-mode purchase and affected entitlement outcomes. Broad release milestones may explicitly request full regression.
5. Inherit unchanged proof only with a separate hash-bound continuity record. Preserve the original receipt bytes, build, date, hostname and scope. Continuity does not establish current provider configuration or a fresh hosted execution.
6. Run independent syntax and public-asset checks concurrently. Keep product sections serial until their shared evidence writers are isolated. Never parallelize mutable canonical evidence or deploy operations.
7. Package only committed shipped bytes matching the manifest and verified source snapshot. Activate staging before production. Production activation requires exact-build acceptance for all 30 gates / 123 criteria; never infer acceptance from health alone.
8. Use expected-previous-build guards, a verified stopped-service snapshot, immutable production files and failure rollback. Explicit rollback restores code/environment while preserving current consumer data.

## Implementation and evidence

Tracked CLI: `accelerated-launch/service/deploy/release-workflow.cjs`.

Commands: `plan`, `check`, `attest`, `package`, `smoke`, `activate`, `rollback`. Hosted packet approval and presentation review still require the existing behavioral journey evidence; the CLI does not fabricate human visual review or approve consumer packets. Acceptance reconciliation continues to validate the relevant gate records. These tools automate mechanical release operations, not consumer consent.

Operations-only adoption does not require replacing the already accepted production runtime. Existing historical receipts retain their original scope.
