# CRP GAP-INGEST-006 completion record

Prepared October 3, 2026, Halifax time. Implementation closure only; staging verification is **PENDING**.

## Result

`GAP-INGEST-006_PARTIAL_DATE_PRECISION` moved from **OPEN** to **IMPLEMENTED_AND_TESTED** under OWNER-CLOSURE-001. Staging verification and production readiness remain unresolved.

- Implementation closed: **19** (was 18); implementation open: **6** (was 7).
- Staging verified: 4; staging pending: 21; production launch failures: 25; `launch_ready: false`.
- Full regression: **5,769 assertions passed, 0 failed, 0 skipped** (was 5,793). Reconciliation: the immediately-preceding baseline was 5,793, not 5,789 — the prior turn added four `A→B→A` persistence assertions to `bf-gap-ingest-006` (45→49), and the 5,789 figure in the earlier record did not carry that +4. This turn trimmed `bf-gap-ingest-006` 49→25 (−24), so 5,793 − 24 = 5,769, which the full-suite run measured exactly.

## Policy determination

**Precision-aware comparison is specifically authorized.** OWNER-EVIDENCE-001 withholds a fact whose reading is "materially ambiguous"; a month-only date is materially ambiguous at the day level. GAP-INGEST-006 in the build plan explicitly authorizes "conservative interval evaluation where legally and computationally justified", with "no first-day substitution". So the accepted behavior is: a month-only anchor keeps MONTH precision and is compared as a whole-month range — `PERIOD_EXCEEDED` only when even the latest possible day is past the boundary, `PERIOD_NOT_EXCEEDED` only when even the earliest possible day is inside, otherwise `MONTH_PRECISION_STRADDLES_THE_PERIOD_BOUNDARY` (withheld, no finding). Year-only forms are not supported (a bare year stays unresolved rather than being invented into a partial date).

## Defect found and corrected

`general-intake.cjs` `buildRecords` silently overwrote a date fact when a second, different date for the same field appeared on the same record (the contradiction rule covered only `bankruptcyOrderForReliefDate`). Conflicting partial dates (`Closed 02/2021` + `Closed 03/2021`) therefore manufactured a resolved `closedDate = 2021-03`.

**Fix:** the same-record contradiction now applies to every date fact (keys ending in `Date`): a second, different value deletes the fact (withheld) instead of overwriting it, and the order-for-relief date keeps its specific printed contradiction marker. Raw readings remain preserved in `printed`. This matches OWNER-EVIDENCE-001's "contradictory" clause and is independent of precision.

**Persistence (bounded review fix):** the contradiction is now persistent. A `_contradictedDateFields` marker records that a field was contradicted, so a later reading (`A → B → A`, or `A → B → C`) never silently restores a resolved fact.

## Requirement-to-test mapping

| # | Directed case | Test | Measured |
| --- | --- | --- | --- |
| 1 | Month/year forms keep raw value + actual precision | `z-general-intake` (reused), `bf-gap-ingest-006` | `Jun 2026`/`02/2021`/`2021/02` → MONTH; raw `02/2021` on field | 
| 2 | Complete dates keep DAY precision | `aj-ingest-dates`, `z-general-intake` (reused) | `February 5th, 2021` → DAY; `13/05/2021` → `2021-05-13` |
| 3 | Invalid dates never become apparently-valid partial dates | `bf-gap-ingest-006` (new) | `13/2021`, `2021/13`, `00/2021` null |
| 4 | Partial dates stay on their correct field/record/report | `bf-gap-ingest-006` (new) | `Closed 02/2021` → `liability.closedDate 2021-02` + MONTH + raw `02/2021` |
| 5 | Evaluation matches policy (authorized interval) | `aj-ingest-dates` (reused), `bf-gap-ingest-006` | `PERIOD_EXCEEDED` / `PERIOD_NOT_EXCEEDED` / straddle `UNRESOLVED` |
| 6 | Boundary case where missing day changes outcome | `aj-ingest-dates` (reused) | straddle `UNRESOLVED` with the month-only straddle reason |
| 7 | Source precision + normalization in findings | `bf-gap-ingest-006` (new), `aj-ingest-dates` | `anchor_month 2015-02` (bf) and `2015-06` (aj) |
| 8 | Equivalent partial forms → equivalent decisions | `z-general-intake` (reused) | `02/2021` and `2021/02` both → `2021-02` |
| 9 | Low-confidence/conflicting dates not manufacturing facts | `aj-ingest-dates` (reused), `bf-gap-ingest-006` (new) | low-confidence date → unresolved; conflicting months → `closedDate` withheld |
| 10 | HTTP upload → evaluate → view | `bf-gap-ingest-006` | upload 201, evaluate 201, view 200 |

## Bounded correctness review (architect-requested cases)

| Case | Verification | Measured |
| --- | --- | --- |
| Persistent contradiction (A→B→A, A→B→C) | later readings never restore a resolved fact, and every raw reading and owning location is preserved | fact stays withheld; three printed occurrences with lines 3, 4, 5 preserved |
| Compatible vs conflicting precision | a month plus a day-within-month is not merged; a day-outside-month never anchors | both stay withheld (no authority to select a precise reading) |
| Calendar boundaries | leap/non-leap February anniversaries | straddle UNRESOLVED; wholly-before PERIOD_EXCEEDED |
| Consumer precision | raw month, MONTH precision, owning location and range survive into the result; the report never presents a range endpoint as the event date | raw `Feb 2015`, precision `MONTH`, `anchor_month 2015-02`; no `2015-02-01`/`2015-02-28` in the report |

**Year-only limitation:** GAP-INGEST-006's build-plan text is "Preserve month-only/partial-date precision" with acceptance evidence framed entirely around month intervals (wholly before/after, straddling). A bare year (`2021`) is not a supported month-only form and stays `UNRECOGNIZED` (no invented day/month); YEAR precision is therefore **not claimed** and is documented as unsupported rather than a staging gap. If the owner later requires year-only support, that is a new implementation requirement.

**Consumer-precision note (architectural constraint):** the month-only adverse anchor's `PERIOD_EXCEEDED` is a completed comparison whose raw value, MONTH precision, owning location and conservative range are preserved in `machine.anchor.source` and `arithmetic`; the report states the comparison and its source location without presenting the range endpoint. However, **no existing `finding_allowed` rule emits a finding for a MONTH-precision anchor**:

- `FCRA-605A-5-US-NATIONAL-7Y` (adverse rating) records `output_permission.finding_allowed: true` and `max_conclusion: "violation"`, and its `anchor_field` (`reportedAccount.adverseRatingDate`, "NN days past due as of Mon YYYY") is inherently month-precision — but `classifyEvaluation` returns null because the rule records three report-unobservable exceptions (15 U.S.C. § 1681c(b): $150k credit, $150k life-insurance, $75k employment) that `buildExceptionEvaluation` marks `resolved: false`, and the classifier withholds a finding when an explicitly-resolved exception evaluation is absent (rule-adapters.cjs lines 587–596). This is a GAP-FINDING-001 (exception evaluation) constraint, independent of date precision.
- `US-CA-CCRAA-1785-13-A-1-BANKRUPTCY-10Y` requires a DAY-precision order-for-relief date (`acceptLegalEventFact` requires `precision === 'DAY'`), so it never accepts a month-only anchor.

The requested month-precision completed-finding path therefore cannot be exercised without changing finding permissions or manufacturing a finding, which is not authorized. This is returned as the specific architectural constraint for review; GAP-INGEST-006's month-precision handling is proven at the extraction, normalization, conservative-comparison and consumer-result (observation) levels, but **not** as a violation finding.

## Scope boundaries honored

No invented day/month/current date, no rounding rule, no favorable-date substitution, no year-only expansion. Partial facts are retained for audit; comparisons requiring unavailable precision are withheld. Ambiguity diagnostics stay internal; insufficient precision is never converted into a violation, probable violation or compliance claim.

## Evidence

- `bf-gap-ingest-006.cjs` (25 assertions, trimmed to non-redundant checks) + `aj-ingest-dates` (37) + `z-general-intake` (75).
- Evidence writer `closure-gap-ingest-006.cjs` → `out/gap-ingest-006-evidence.json` with criterion `partial_date_precision` (staging PENDING), hash-pinned source files and behavioral references.

## Shared-source revalidation

`general-intake.cjs` is pinned by six evidence records; after the contradiction fix I re-hashed GAP-FINDING-002 (`revalidate-gap-finding-002.cjs`) and re-ran `closure-common-errors.cjs` (also restoring the suite-overwritten record) and `closure-gap-ingest-001/002/004/005/006.cjs`. No blocker regressed.

## Remaining boundaries

- `end_to_end_journey` and production readiness stay pending until deployed, current-release, served-build evidence is recorded. No deployment, hosted payment, new provider, external message, manual grant or live billing change.
- Remaining open blockers: `BLOCKER-FDT-001`, `BLOCKER-CLARIFY-001`, `GAP-INGEST-007`, `-008`, `-009`, `-010` (four ingestion blockers).
