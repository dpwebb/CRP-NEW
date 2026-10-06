# CRP GAP-INGEST-004 completion record

Prepared October 3, 2026, Halifax time. Implementation closure only; staging verification is **PENDING**.

## Result

`GAP-INGEST-004_DATE_FORMS` moved from **OPEN** to **IMPLEMENTED_AND_TESTED** under OWNER-CLOSURE-001. Staging verification and production readiness remain unresolved.

- Implementation closed: **17** (was 16); implementation open: **8** (was 9).
- Staging verified: 4; staging pending: 21; production launch failures: 25; `launch_ready: false`.
- Full regression: **5,719 assertions passed, 0 failed, 0 skipped** (was 5,685).

## Defect status

No functional defect was found. The written-date handling (`general-intake.cjs` `normalizePrintedDate`, the `MONTHS` map, `validDay`, and the `DATE_TOKEN`) already supported full and abbreviated month names, punctuation, day-first and ordinal forms, leap/invalid validation, and ambiguity withholding. The gap was behavioral proof, not code — the earlier evidence predated the OWNER-ACCEPT-010 C1 strict validator.

One observation (not a defect): an invalid calendar date (`February 30, 2021`, `February 29, 2021`) resolves to `normalized: null` with reason `UNRECOGNIZED_DATE_FORM` rather than `INVALID_DATE`. The outcome is correct (unresolved, never rolled into a valid day); the reason string is slightly imprecise and was left unchanged to avoid touching the shared date parser.

## Requirement-to-test mapping

| # | Directed boundary case | Test | Expected → Measured |
| --- | --- | --- | --- |
| 1 | Written month names, abbreviations, punctuation | `bd-gap-ingest-004`, `z-general-intake` | all twelve months full+abbreviated; `Jan.`/`Jan 5, 2021`/`5th January 2021` resolve |
| 2 | Unambiguous numeric and ISO forms | `bd-gap-ingest-004`, `z-general-intake` | ISO, `YYYY/MM/DD`, `13/05/2021`, `05/13/2021` resolve |
| 3 | Equivalent spellings → same normalized + evaluation outcome | `bd-gap-ingest-004` | `January/Jan/1 January/January 1st` all → `2011-01-01` → `VIOLATION` |
| 4 | Invalid calendar dates unresolved, not rolled | `bd-gap-ingest-004` | `February 30`, `February 29 2021`, `April 31` null; `February 29 2020` resolves |
| 5 | Unsupported/ambiguous forms unresolved without guessing | `bd-gap-ingest-004`, `z-general-intake` | `06/12/2026` null with both interpretations; `not a date` null |
| 6 | Partial dates keep precision, no invented day | `bd-gap-ingest-004`, `z-general-intake`, `aj-ingest-dates` | `Jun 2026` → `2026-06` MONTH; `02/2021` MONTH |
| 7 | Raw/normalization/location into findings and reports | `bd-gap-ingest-004` | raw `January 1, 2011`, normalized `2011-01-01`, line 4; report `Source fact … (page 1, line 4)` |
| 8 | OCR confidence gates regardless of date form | `bd-gap-ingest-004`, `aj-ingest-dates` | low-confidence `January` → `EXTRACTION_UNRESOLVED`, date UNRESOLVED |
| 9 | Multiple dates on the correct fields/records | `bd-gap-ingest-004` | `Opened January 5, 2015` + `Closed February 5, 2021` on one record |
| 10 | HTTP upload → evaluate → view | `bd-gap-ingest-004` | upload 201, evaluate 201, view 200 |

## Evidence

- New test `bd-gap-ingest-004.cjs` (34 assertions) + existing `aj-ingest-dates` (37) + `z-general-intake` (75).
- Evidence writer `closure-gap-ingest-004.cjs` → `accelerated-launch/service/out/gap-ingest-004-evidence.json` with criteria `written_date_forms`, `unambiguous_parse` (staging PENDING), hash-pinned source files (`general-intake.cjs`, `formats.cjs`, `journey.cjs`, `bd-gap-ingest-004.cjs`) and behavioral references.

## Scope boundaries honored

No change to numeric-date convention (GAP-INGEST-005), partial-date policy (GAP-INGEST-006) or report-date selection (GAP-INGEST-007). No creditor-name hardcoding, no new provider, no parser redesign, no fixture-specific strings in production code. Ambiguity, confidence thresholds, evidence policy and finding permissions were preserved.

## Remaining boundaries

- `end_to_end_journey` and production readiness stay pending until deployed, current-release, served-build evidence is recorded. No deployment, hosted payment, external provider, manual entitlement grant, or live billing change.
- Remaining open blockers: `BLOCKER-FDT-001`, `BLOCKER-CLARIFY-001`, `GAP-INGEST-005`, `-006`, `-007`, `-008`, `-009`, `-010` (six ingestion blockers).
