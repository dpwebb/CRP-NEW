# CRP GAP-INGEST-005 completion record

Prepared October 3, 2026, Halifax time. Implementation closure only; staging verification is **PENDING**.

## Result

`GAP-INGEST-005_NUMERIC_DATE_CONVENTIONS` is **IMPLEMENTED_AND_TESTED** under OWNER-CLOSURE-001 after correcting the unsupported convention-propagation behavior. Staging verification and production readiness remain unresolved.

- Implementation closed: **18**; implementation open: **7**.
- Staging verified: 4; staging pending: 21; production launch failures: 25; `launch_ready: false`.
- Full regression: **5,744 assertions passed, 0 failed, 0 skipped** (was 5,747).

## Authority determination (revisit)

**The accepted reported-fact policy does not permit convention propagation.** `OWNER-EVIDENCE-001` (v1.0) states: *"A clearly labelled fact printed on an admitted credit report is accepted as the bureau's reported fact for assessment, unless its reading, record association or meaning is materially ambiguous or contradictory."* An ambiguous numeric date (`06/12/2026`) is materially ambiguous; the policy provides no clause by which one unambiguous date's day/month order determines another field's order. The build plan's "supported report evidence or explicit unambiguous format" is read as: an unambiguous date resolves itself; an explicit date-format label would resolve the field it governs (no such label mechanism exists). No accepted policy/source authorizes segment-wide propagation, so the prior `detectConvention`-based propagation was removed rather than asserted.

## Correction applied

`general-intake.cjs` no longer propagates a numeric convention from one field to another:

- `extract` and `reportSegments` now call `findReferenceDate(pages, null)` and `buildRecords(segment.pages, null)`; the segment-wide `detectConvention` result is no longer used for any field's resolution.
- `detectConvention` remains exported and unit-tested (its day/month-above-12 heuristic and its contradiction refusal), but is no longer part of the production resolution path.
- The result: an unambiguous numeric date (day or month above 12) resolves independently; an ambiguous numeric date stays unresolved with both interpretations preserved, regardless of any other date in the same report, segment, account or bureau.

## Requirement-to-test mapping

| # | Directed case | Test | Measured |
| --- | --- | --- | --- |
| 1 | Unambiguous numeric forms resolve independently | `be-gap-ingest-005`, `z-general-intake` | `13/05/2021`→`2021-05-13`; `05/13/2021`→`2021-05-13` |
| 2 | Ambiguous forms unresolved with alternatives preserved | `be-gap-ingest-005`, `z-general-intake` | `06/12/2026` null + both interpretations |
| A | Unambiguous account date beside ambiguous report date | `be-gap-ingest-005` | report date unresolved; account `Closed 2025-05-13` |
| B | Unambiguous on one account, ambiguous on another | `be-gap-ingest-005` | account A resolves; account B withheld |
| C | Unambiguous date in one field never supplies another field's convention | `be-gap-ingest-005` | report date resolves itself; ambiguous account date withheld |
| D | Low-confidence/untrusted evidence beside trusted ambiguous target | `be-gap-ingest-005`, `aj-ingest-dates` | trusted ambiguous date stays unresolved |
| E | Reordered lines yield identical decisions | `be-gap-ingest-005` | ambiguous date unresolved either order |
| F | Decisive ambiguous date withheld, never a finding | `be-gap-ingest-005` | no finding emitted for an ambiguous order-for-relief date |
| 6 | Invalid dates unresolved under either convention | `be-gap-ingest-005` | `31/04/2021`/`04/31/2021` null |
| 7 | Raw/alternative/provenance retained | `be-gap-ingest-005` | `06/12/2026` US → `2026-06-12`, `ambiguous`, `alternative 2026-12-06`, `convention MM/DD/YYYY` |
| 8 | Equivalent resolved dates → equivalent outcomes | `be-gap-ingest-005` | `13/05/2011` and `05/13/2011` both → `VIOLATION` |
| 9 | Unambiguous date keeps its reading regardless of nearby dates | `be-gap-ingest-005` | `05/13/2011` keeps its report trace |
| 10 | HTTP upload → evaluate → view | `be-gap-ingest-005` | upload 201, evaluate 201, view 200 |

## Scope boundaries honored

No jurisdiction/bureau/filename/address/upload-order/locale inference; no expansion of partial-date policy (006) or report-date selection (007); no explicit date-format label mechanism was invented; no consumer answer is used to repair ambiguity. Withheld readings are never labelled violations, probable violations or proof of compliance; ambiguity diagnostics stay internal.

## Evidence

- `be-gap-ingest-005.cjs` (25 assertions) + `aj-ingest-dates` (37) + `z-general-intake` (75).
- Evidence writer `closure-gap-ingest-005.cjs` → `out/gap-ingest-005-evidence.json` with criterion `numeric_date_conventions` (staging PENDING), hash-pinned source files and behavioral references.

## Shared-source revalidation

`general-intake.cjs` is pinned by five evidence records; after the correction I re-hashed GAP-FINDING-002 (`revalidate-gap-finding-002.cjs`) and re-ran `closure-common-errors.cjs` (also restoring the suite-overwritten record) and `closure-gap-ingest-001/002/004/005.cjs`. No blocker regressed.

## Remaining boundaries

- `end_to_end_journey` and production readiness stay pending until deployed, current-release, served-build evidence is recorded. No deployment, hosted payment, new provider, external message, manual grant or live billing change.
- Remaining open blockers: `BLOCKER-FDT-001`, `BLOCKER-CLARIFY-001`, `GAP-INGEST-006`, `-007`, `-008`, `-009`, `-010` (five ingestion blockers).
