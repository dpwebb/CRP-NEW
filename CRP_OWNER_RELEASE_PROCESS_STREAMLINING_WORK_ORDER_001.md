# Owner-authorized release-process streamlining work order

Date: October 14, 2026 (America/Halifax).

Authority: the owner's instruction, "There is a WO currently running make these build changes when it is safe to do so. Do not implement Admin UI or other enhancements yet."

Status: IMPLEMENTED_AND_TESTED_LOCALLY. Staging: NOT_AUTHORIZED / NOT_RUN. Production: NOT_AUTHORIZED / NOT_RUN.

Execution authorization: the owner subsequently confirmed, "WO completed implementation of the build time saving upgrade is authorized". The preceding packet-review WO returned clean committed source 196da86, with its complete 16,068/0/0 local full receipt. The earlier in-flight observations below retain their original historical scope.

## Scope and sequencing

Implement the build/test/release-process improvements discussed in the owner conversation. This is a bounded tooling work order under CRP_OWNER_CHANGE_AWARE_RELEASE_PROCESS_001.md, not authorization to build the admin UI, partner portal, affiliate features, fulfillment features, or any other product enhancement. No hosted activation, provider purchase, live financial action, external message, or production configuration change is authorized by this work order.

The currently active work is the packet-review/mail-instructions batch in the Codex task "Compare AI and CRP Findings", task ID 01a12df3-a8d7-70b1-b5da-775a4bbd0a51. Read-only inspection found its implementation checkout at C:/Users/webbd/.codex/worktrees/synthetic-corpus-fixes/CRP-NEW, on codex/packet-review-mailing-20261014, with uncommitted packet, UI, test-runner, lane, and manifest changes. These observations identify the current conflict; recheck them before execution because they can change.

Do not interrupt, duplicate, enlarge, or modify that in-flight batch. Do not edit its checkout, source freeze, receipts, test inventory, or the coordinator's remaining-work register while it is active. This file records the authorized contract only; it does not create a competing remaining-work register. Add its bounded execution entry to CRP_VERSION_1_SEVEN_DAY_WORK_REGISTER_001.md only at a confirmed safe handoff when register ownership is clear.

## Required safe boundary

Before implementation, establish all of the following:

1. The current packet-review work order has returned, and its actual completion report, committed source, tests, and pending outcomes have been reviewed. An idle task alone does not establish completion. Do not treat a request to stop or pause as permission to take over unfinished work.
2. No other task or process is changing the relevant runner, release tools, manifest, source freeze, or canonical evidence. Recheck task status and working-tree state immediately before implementation and before integration.
3. Identify the latest accepted source/full-receipt baseline and the separately completed local work-order source. Do not use the preserved mixed main checkout or historical command examples as the release baseline. Reconcile newer authorized work explicitly.
4. Use a separate managed Git worktree with bounded file ownership. Preserve all existing dirty files, private stores, credentials, consumer data, and original receipts. Integrate completed tooling changes serially after review and appropriate checks; do not overwrite the other work order's output.

If the boundary is not established, retain this queued status and defer implementation. The scheduled follow-up may read status and evidence, but must not send messages to another chat or interrupt it.

## Required improvements

### Preparation and dependency planning

- Add a fast prerequisite check for the selected verification path: accepted baseline/receipt identity, expected section inventory, required fixture builders and fixture hashes, generated assets, relevant PDF/OCR tools, and applicable environment requirements. Detect missing prerequisites before long tests or packaging.
- Bind the accepted baseline to its source commit, manifest, complete passing full receipt, registered sections, and dependency hashes.
- Replace broad filename/text hints with reviewable component and dependency mappings. Pricing/catalog/location and genuine checkout changes must select affected provider verification; deployment-tool-only changes must not be mistaken for product billing changes. Shared JavaScript, runtime, readers, rules, security, storage, test-contract changes, and unknown executable dependencies retain the full-regression path.
- Freeze shipped source, test contracts, fixtures, and relevant generated inputs before final verification. Keep ordinary release bookkeeping separately inventoried so a documentation-only update does not force repeated product execution. Preserve source custody rather than ignoring a changed tested dependency.

### Receipts, reuse, and resumable execution

- Give each candidate/attempt durable immutable receipts and one release record. Resume a completed passing step only when its recorded source, tests, fixtures, relevant toolchain, and environment constraints match. Failed, skipped, partial, interrupted, or missing proof is never reusable as passing evidence.
- Keep receipt assembly and gate reconciliation separate from test execution. Reuse the existing subscription evidence builder's --reuse-current pattern where equivalent section coverage and hashes support it; do not rerun browser journeys merely to rebuild evidence.
- Support evidence-specific continuity. A full regression required by a reader/rule change must not automatically invalidate unchanged provider dependencies. Preserve the original receipt bytes, build, date, hostname, and scope; attach separate continuity evidence. Current provider configuration and affected hosted behavior still require their proper fresh checks.
- Reconcile the owner-authorized static-presentation path with strict acceptance: accepted full baseline plus exact dependency continuity, fresh affected consumer/security/browser proof, and current exact-build hosted evidence. Do not bypass or mislabel the full-freeze predicate, fabricate a fresh full run, or remove any acceptance criterion. Unknown dependency impact falls back to full verification.

### Packaging and promotion

- Prepare and verify one committed package after the required final checks. Promote the same archive and embedded manifest/provenance through staging and production without rebuilding from an advancing checkout.
- Make artifact identity authoritative for promotion and smoke checks, while independently verifying committed shipped bytes, archive digest, expected previous build, host configuration, and actual served bytes.
- Record phase completion and retry only the failed transfer/configuration/host step when source and applicable proof remain unchanged. A source or verification-contract change must invalidate the affected completed steps according to the owner directive.
- Preserve the stronger acceptance verifier already present in the newer accepted source: raw measurements, package/source identity, exact staging hostname and runtime file hashes, actual full/continuity evidence, authoritative gate records, FDT validation, and pre-stop proof revalidation. The earlier main-checkout audit must not overwrite these newer protections.

### Expensive setup and safe concurrency

- Measure phase and section durations and reasons for reruns. Optimize repeated deterministic fixture preparation where the dependency graph permits it, retaining fresh physical reader, custody, recovery, ownership, and actual browser checks.
- Preserve distinct rule-matrix, API delivery, and browser coverage. Remove a duplicate or tautological assertion only after equivalent consumer requirement and failure-boundary coverage is explicitly demonstrated.
- Keep product sections serial while they share process environment, fixture directories, screenshots, mutable evidence, or canonical outputs. Any product-worker concurrency must first isolate processes, private stores, fixture/output directories, and environment, and publish validated evidence through one coordinator. Do not apply Promise.all to the current shared runner.

## File ownership and exclusions

Primary implementation scope: accelerated-launch/service/deploy/release-workflow.cjs, its meaningful workflow tests and supporting tooling-only modules, and relevant release/test documentation. Runner/registry/setup changes are limited to the tested orchestration improvements above after the current batch's registrations are integrated and ownership is assigned.

Do not change assessment predicates, readers, rules, prices, entitlements, consumer UI, packet contents, authentication behavior, private consumer records, or deployed runtime for this tooling work. These files may be read to establish dependencies. Admin UI and other enhancements remain on hold.

## Acceptance and verification

- Prove missing/wrong prerequisites reject before expensive execution; unknown selections and dependencies fail safely.
- Prove the baseline descriptor rejects unrelated, incomplete, stale, or mismatched receipts/section inventories.
- Prove an unchanged completed step is reused without invoking its test process again; changed source/tests/fixtures/configuration invalidate it; failed and interrupted attempts remain preserved.
- Prove component-specific continuity cannot turn inherited provider proof into a fresh purchase/configuration claim or bypass affected billing journeys.
- Prove same-package promotion does not depend on a mutable checkout and refuses wrong archive, manifest, source, target, or expected previous build.
- Preserve every one of the 30 gates / 123 criteria and all actual-source/host evidence checks. Missing required evidence blocks promotion. Focused proof is never called a full regression.
- Test tool behavior in temporary isolated repositories/stores/output directories without activating hosts or accessing live billing. Use focused tool tests and continuity when product/test contracts remain unchanged; run full product regression when changes actually affect registered product execution or verification contracts, as required by the owner directive.
- Report measured time, avoided invocations, preserved requirement coverage, exact source, remaining limitations, and separate implementation/staging/production status. Do not promise an unmeasured percentage improvement.

## Completion and follow-up

The scheduled follow-up checks the safe boundary before doing work and keeps the admin/other-enhancement hold in force. Once this bounded tooling work is implemented, reviewed, integrated as appropriate, and validated, record completion and deactivate its follow-up. Deployment authorization remains separate.

Recording this work order is not implementation closure, a current-run test result, or release acceptance.

## October 14 implementation closure

Executable tooling source: 05d2c7883ec90856ba335aecf2860e6f939949e9 on codex/release-streamlining-20261014 in C:/Users/webbd/.codex/worktrees/release-streamlining/CRP-NEW. See CRP_RELEASE_STREAMLINING_LOCAL_2026_10_14.md for measurements, exact evidence and limitations. All nine tool suites and 16 syntax checks passed. An unchanged final check resumed in 10,816 ms rather than 53,684 ms, avoiding 25 child processes while preserving the original verification hash. The identical archive was reused; portable continuity and local proof assembly validated against frozen source without Git.

All 167 shipped files and 327 non-deployment baseline source dependencies remain unchanged from 196da86. The product runner, section registry/lanes, 30-gate/123-criterion policy and original activation/rollback safety scripts are unchanged. No assertion was removed from product coverage. No new full product regression, hosted acceptance, purchase, configuration change or deployment is claimed. Admin UI and all other enhancements remain ON_HOLD.

Use the committed tooling candidate for subsequent release work after reconciling its source with the actual release candidate. The dirty primary checkpoint remains preserved; no checkout reset, merge/push, runtime installation or cross-chat mutation occurred. Latest documented accepted runtime d01fc4a / crp-v1-a926c178ef0dfc5c remains separate from the completed local packet source and this tooling candidate. The queued follow-up is deactivated on closure.

## October 14 current-process integration

The owner's separate follow-up authorized installing the reviewed upgrades into the current CRP build/release process. Integration is complete locally: primary main9c8c0f1 and operational packet checkoutd735a6d, with unchanged respective161/167 shipped inventories and runtime/manifest bytes. The standing AGENTS/process/README entry is now prepare/check/record/package as needed; receipt assembly does not require duplicate product/browser/provider execution. See CRP_RELEASE_PROCESS_INTEGRATION_2026_10_14.md. Ten compatibility/current tooling suites pass; the installed current check resumed in9,257 ms versus52,248 ms, avoiding28 child processes. All30 gates/123 criteria and affected fresh hosted/provider checks remain mandatory. No deployment/restart/provider/push action occurred; Admin UI and other enhancements remain on hold. Earlier implementation-only/no-merge statements retain their original earlier scope.