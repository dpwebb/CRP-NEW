# CRP GAP-INGEST-002 completion record

Prepared October 3, 2026, Halifax time. Implementation closure only; staging verification is **PENDING**.

## Result

`GAP-INGEST-002_MULTILINE_RECORD_BOUNDARIES` moved from **OPEN** to **IMPLEMENTED_AND_TESTED** under OWNER-CLOSURE-001. Staging verification and production readiness remain unresolved.

- Implementation closed: **16** (was 15); implementation open: **9** (was 10).
- Staging verified: 4; staging pending: 21; production launch failures: 25; `launch_ready: false`.
- Full regression: **5,685 assertions passed, 0 failed, 0 skipped** (was 5,661).

## Defect found and corrected

Tracing the record-boundary pipeline exposed one functional defect, now fixed within GAP-INGEST-002 scope:

- **Status and identifier continuation lines were silently dropped.** `general-intake.cjs`'s `hasValue` gate read a line only when it carried a date, an amount, a payment-history grid, a responsibility label, a public-record header or a historical-verification phrase. A continuation line that printed only an account status (`Status: Charged Off`) or a masked account identifier (`Account Number ****1234`) was skipped, so those facts never reached their owning record.
- **Fix:** the gate now also reads a line that prints a recognized account status (`statusWordOf`) or a masked account identifier (`maskedIdentifierToken`), and `ACCOUNT_NUMBER_LABEL_RE` keeps an identifier label from being misread as an account name (it never starts a new account nor overwrites `account.reported_identity`). No creditor-name hardcoding, no new provider, no parser redesign. Full suite re-passed with zero regressions.

## Requirement-to-test mapping

| # | Directed boundary case | Test | Expected | Measured |
| --- | --- | --- | --- | --- |
| 1 | Wrapped account names and continuation lines stay with their owning record | `bc-gap-ingest-002` | a wrapped name and field-label continuations stay one record | 1 record with balance + opened date |
| 2 | Dates, balances, statuses and identifiers on continuation lines reach the correct record | `bc-gap-ingest-002` | each continuation fact reaches its owner, never a new account | status `CHARGED OFF`, `masked_identifier MASK-1234`, opened/closed dates on one record; identity `CREDITOR A` not overwritten |
| 3 | Adjacent accounts stay separate, including repeated/similar creditor names | `bc-gap-ingest-002` | repeated or similar creditor names stay separate | same name 2 records; similar names 2 records |
| 4 | Page breaks preserve a record only with sufficient linkage | `ah-multifile-assessment`, `an-payment-history-grid` | adjacency + field-line + open target required; no marker means no borrow | reordered/conflicting continuations not merged; grid no-marker page does not borrow |
| 5 | Bureau/report boundaries prevent continuation across unrelated reports | `ah-multifile-assessment` | a dateless page separated by another bureau stays unresolved | 3 report groups, dateless page keeps no borrowed date |
| 6 | Conflicting readings preserved or withheld, never silently overwritten | `bc-gap-ingest-002`, `ah-multifile-assessment` | conflicting readings withheld | conflicting order-for-relief withheld; conflicting identifier not borrowed |
| 7 | Source document/page/line locations stay accurate | `bc-gap-ingest-002`, `ah-multifile-assessment` | record and continuation facts name file/page/line | record file/page + Opened line 4; `location.file_id` + `location.source` |
| 8 | HTTP upload → evaluate → view preserves associations; findings trace to the correct source record | `bc-gap-ingest-002`, `ah-multifile-assessment` | real endpoints preserve the association; a finding traces to its source | HTTP upload 201 + view `accounts_read 1`; report names `Source fact: printed "January 1, 2011" (page 1, line 4)` |
| 9 | Cross-account access remains refused | `bc-gap-ingest-002` | another account cannot read the assembled case or result | GET case + result view → 403 |

## Evidence

- New test `bc-gap-ingest-002.cjs` (24 assertions) + existing `ah-multifile-assessment` (66) + `an-payment-history-grid` (20).
- Evidence writer `closure-gap-ingest-002.cjs` → `accelerated-launch/service/out/gap-ingest-002-evidence.json` with criteria `multiline_boundaries`, `continuation_lines` (staging PENDING), hash-pinned source files (`general-intake.cjs`, `multi-file-assembly.cjs`, `payment-history-grid.cjs`, `journey.cjs`, `bc-gap-ingest-002.cjs`) and behavioral evidence references.

## Shared-source revalidation

`general-intake.cjs` is pinned by four evidence records. After the fix, their hashes were refreshed: `revalidate-gap-finding-002.cjs` re-hashed GAP-FINDING-002, and `closure-common-errors.cjs`, `closure-gap-ingest-001.cjs` and `closure-gap-ingest-002.cjs` were re-run after the full suite (the suite also overwrites `common-errors-evidence.json` with the legacy format, which the closure script restores). No blocker regressed.

## Remaining boundaries

- `end_to_end_journey` and production readiness stay pending until deployed, current-release, served-build evidence is recorded. No deployment, hosted payment attempt, manual entitlement grant, or work on another blocker.
- Remaining open blockers: `BLOCKER-FDT-001`, `BLOCKER-CLARIFY-001`, `GAP-INGEST-004` through `GAP-INGEST-010` (seven ingestion blockers).
