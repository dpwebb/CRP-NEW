# Fresh-eyes application and assertion audit

Audit date: 2026-10-05. Workspace: `C:\CRP-NEW`. Scope: current local service, adapters, consumer Wizzard, issue/packet and comparison paths, registered regression suite, and evidence generation. This is an audit and refactor recommendation, not authorization to delete checks or modify application behavior. Application and test source were not edited.

## Owner outcome

The build remains salvageable and now has the intended Issue → consumer selection → review/edit → approval → entitled packet path. The main remaining testing problem is repetition and uneven test quality, rather than thousands of obsolete certainty requirements. Definite-classification safeguards remain useful when scoped to definite findings; they must not become universal barriers to qualified probable/potential issues.

**6,389 of 6,414 executed check assertions protect current requirements**, including checks needing consolidation or repair. This is a conservative engineering disposition, not a claim that every assertion is independently necessary. The audited ledger identifies every execution and its source checkpoint.

| Disposition | Executions | Decision |
| --- | ---: | --- |
| Keep as written | 3,416 | Retain current behavioral/source/security contracts |
| Relevant, consolidate | 2,942 | Separate repeated shared contracts from per-jurisdiction routing; preserve matrix coverage |
| Relevant, rewrite | 31 | Repair stale selectors, obsolete gate targets, or weak/misleading oracles |
| Archive outside routine product regression | 23 | Historical legacy/source-capture checks; preserve source-custody evidence |
| Remove exact duplicate | 2 | Same expression, same object, already checked immediately above |
| **Executed check assertions** | **6,414** | **2,868 distinct executed source checkpoints** |

The 2,942 consolidation executions are the complete `n-applicability` (886) and `o-all82-infrastructure` (2,056) sections. The recommendation does **not** mean all 2,942 may be deleted. Some repetition is meaningful country/jurisdiction coverage. For example, the same relation execution-token assertion repeats across 82 mappings although there are only four relation types; hoisting that one contract preserves four distinct checks and avoids 78 duplicate executions. Other matrix changes require proving equivalent coverage.

## Fresh execution, not the pasted historical result

The current checkout includes the newer report-history/comparison work and 77 sections; it is later than the pasted 6,382-pass report. A single completed audit-instrumented full execution took **309,435 ms (5 minutes 9 seconds)**:

- 6,393 check assertions passed.
- 21 check assertions failed.
- Two sections threw before their remaining checks could execute.
- The runner therefore reports **6,393 passed / 23 failed / 0 skipped**. Its failure total includes the two section exceptions; they are not additional assertion calls.

There are unexecuted checks after the two exceptions. The relevance table counts actual executions, not those unexecuted checkpoints, child-process assertions, hypothetical branches, or a promised green total. Zero recorded skips does not mean every intended check ran. The static section inventory is provided separately; lexical check-site counts are not an AST or branch-coverage measure.

The instrumented runner preserved ordinary test code and stopped before the runner's normal release-evidence writer. This failed audit is not a replacement passing release certificate. Two incomplete instrumentation/transport attempts preceded the completed run; counts and timing come exclusively from `executed-assertions.json`, not the append-only progress log. Source hashes were checked for drift after execution.

## Confirmed defects and test gaps

### 1. Privacy/support/billing tests target the wrong Wizzard steps

History was inserted at step 5. Current rendering order is account, jurisdiction, report, results, review, history, case/privacy, support, billing. Existing mocked UI tests still target old numeric indices:

- `k-ui-smoke`: five failed privacy/case checks.
- `az-consumer-support-ui`: six failed checks and one section exception.
- `ba-consumer-billing`: ten failed checks and one section exception.

These requirements remain relevant. Repair tests using a shared named step contract and complete their previously aborted copy/retry/sign-out/checkout/cancellation controls. The findings establish stale test targeting, not that the actual privacy/support/billing pages are broken. Existing real-browser acceptance does not substitute for the aborted controls.

### 2. Report comparison is order-dependent when masked account identifiers collide

`service/comparison.cjs` takes the first CONFIDENT masked-id/creditor match and breaks. With two later records sharing that identity, reversing their order changes the same earlier issue from `NO_LONGER_OBSERVED` to `STILL_OBSERVED`. The result is incorrectly marked CONFIDENT in either order.

A separate, read-only fictional reproduction is saved in `comparison-ambiguity.json`. The 43 passing history checks do not catch this. Resolve the complete candidate set with record evidence; ambiguous matches must stay qualified/unresolved rather than choosing the first record. Add permutation, masked-id collision, one-to-many/many-to-one, and cross-bureau controls, including consumer wording that never claims a verified correction from disappearance alone.

### 3. Four packet checks test the obsolete certainty gate

`bl-us-ca-correction-packet.cjs:97–100` tests `evaluation.packetEligibility`, including the expectation that PROBABLE is never packet eligible. The active packet path uses unified Issue eligibility and permits supported probable/potential verification requests. Rewrite these four checks against the active path. Preserve rule-specific definite correction permissions, consumer approval, entitlement, ownership, and stale-content refusal.

This is a concrete remaining artifact of the old certainty protocol. It is not grounds to remove the definite classifier's source-evidence safeguards.

### 4. Passing evidence can contain obsolete product claims

`tests/run-tests.cjs` still generates evidence prose saying “No finding class exists, no packet or response draft is produced” alongside contemporary totals. Historical B2/B3 assertions and current consumer capability must be separately versioned. Current evidence should identify source hashes, selected sections, execution scope, failures/exceptions, and demonstrated journeys. Preserve historical captures without presenting their prose as the current build state.

### 5. The all-82 packet association oracle is too weak

The all-82 loop uses the same fictional report and date for every case. Its association check counts the generic report/date text, so a packet from another case with identical content can satisfy the asserted “own case report identity.” Retain all-82 delivery coverage, but use distinguishable per-case facts/identities and approval binding; add wrong-case and wrong-owner controls. Seven aggregate assertions represent 82 complete journeys, illustrating why assertion totals are not a useful coverage metric on their own.

### 6. Smaller expectation/oracle repairs

- `i-shared-regressions.cjs:38`: SHA-256 length proves readability, not catalog identity or correctness. Check catalog/config consistency. Also avoid parsing a child suite's free-form output as the only pass contract; nested assertions are outside the parent assertion count.
- `av-consumer-results.cjs:71`: a nonempty scope string does not prove disclaimer placement or allowed wording; its label still claims a legal-advice disclaimer. Assert actual scope and the absence of prohibited text.
- `v-presentation-and-release.cjs:328`: fixed historical “format evidence first” priority is not current Prime Directive priority.
- `al-common-errors.cjs:95,124`: adverse-after-first-report and payment-above-current-balance are not self-proving contradictions. Assert their benign alternatives and current Issue filtering. A useful qualified concern requires its own evidence/explanation contract; no need for definite legal proof.

Together these repairs account for the 31 rewrite executions, including the 21 currently failed UI assertions.

## Historical and duplicate checks

Archive 15 legacy implementation/text parity checks from `h-legacy-parity`; retain its ten current upload/refusal/status behavior checks. Archive eight historical retrieval/marketing-capture reproducibility checks from `v-presentation-and-release` (lines 189, 190, 205, 207, 209–212). Archive means retain their evidence and a separate source-audit lane, not erase provenance.

Remove the two repeated checks at `e-qualifications.cjs:67,69`; identical checks at 63 and 65 remain. No other assertion is recommended for immediate deletion solely because its section is old or its rule is currently disabled.

## Where build time actually goes

| Section | Assertion executions | Measured time |
| --- | ---: | ---: |
| All-82 factual issue → packet delivery | 7 | 112.8 s |
| US consumer family | 76 | 49.3 s |
| Hardening | 108 | 28.3 s |
| All-82 infrastructure | 2,056 | 17.6 s |
| Record applicability | 49 | 14.2 s |
| Real-browser Wizzard | 28 | 11.0 s |
| TU-CA family | 227 | 10.5 s |
| Applicability metadata | 886 | 0.05 s |

The seven all-82 delivery assertions consume about 36% of runtime. Removing hundreds of cheap metadata checks would barely improve speed. Preserve the final all-82 behavior matrix, but avoid repeating complete extraction/registration/setup when testing shared downstream packet behavior; retain representative full upload/extractor paths and all-82 region/case-specific assertions. Optimize public immutable fixture processing only where equivalence can be demonstrated. Never bypass production parsing, provenance, or ownership in the tests claiming those behaviors.

Use the existing focused runner during development. Run affected behavior sections, shared-file dependents and source-pin checks; run one full regression after the finished batch. A second full regression is justified only by subsequent source changes, a failure repair, or a specific unresolved concern. Do not cut security, benign-case, approval, or entitlement controls to hit an assertion-count target.

## Refactor order and acceptance

1. Fix stale UI step targeting and rerun the three failed sections, plus relevant real-browser navigation. Add the comparison ambiguity repair and focused history controls. These are independent defects; no hosted verification prerequisite.
2. Rewrite obsolete packet eligibility checks against Issue eligibility. Strengthen case/report association and weak oracles. Preserve definite/probable/potential selection and actual reviewed/downloaded content.
3. Split shared contracts, per-region routing, format extraction, consumer delivery, security/billing/privacy, and historical source custody into explicit verification lanes. Consolidate repeated shared invariants only after inventorying their unique coverage.
4. Reconcile evidence generation with current capability and execution scope. Archive historical reports instead of rewriting their meaning. Make section exceptions and unexecuted remainder visible.
5. Run affected focused checks throughout and one final full regression. Publish changed checkpoint counts, elapsed time and retained behavior coverage, not merely a smaller assertion total.

Implementation closure, local browser acceptance, staging verification and production readiness remain separate. This audit does not close broad coverage, all-82, packet, subscription, or launch blockers. It does not establish exhaustive security, load, or every-format acceptance.

## Audit artifacts

All are under `AUDIT_PRIME_DIRECTIVE_ASSERTIONS`:

- `assertion-ledger.csv`: every executed assertion, section, source line, label, result, disposition and reason.
- `assertion-sites.csv`: 2,868 distinct executed checkpoints and multiplicity.
- `section-review.csv`: all 77 sections, counts, timing, lexical checkpoint inventory and disposition totals.
- `audit-counts.json`: reconciled totals.
- `source-manifest.json` / `source-drift.json`: source identity and drift check.
- `executed-assertions.json`: completed audit-run results. Contains fictional test data and test-session artifacts; keep local.
- `diagnose-comparison.cjs` / `comparison-ambiguity.json`: reproducible fictional comparison counterexample.
- `capture.cjs` / `build-ledger.cjs`: audit instrumentation and counting method.

No application/test source change, deployment, external message, provider/billing change, manual entitlement grant, or private-report analysis was performed.
