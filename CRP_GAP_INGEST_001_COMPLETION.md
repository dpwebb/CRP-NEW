# CRP GAP-INGEST-001 completion record

Prepared October 3, 2026, Halifax time. Implementation closure only; staging verification is **PENDING**.

## Result

`GAP-INGEST-001_IMAGE_SET_COHERENCE` moved from **OPEN** to **IMPLEMENTED_AND_TESTED** under OWNER-CLOSURE-001. Staging verification and production readiness remain unresolved.

- Implementation closed: **15** (was 14); implementation open: **10** (was 11).
- Staging verified: 4; staging pending: 21; production launch failures: 25; `launch_ready: false`.
- Full regression: **5,661 assertions passed, 0 failed, 0 skipped** (was 5,645).

## What was verified (no new code changes needed for the assembly itself)

The multi-file/image-set assembly already existed (`multi-file-assembly.cjs` + `general-intake.cjs`), is wired into `journey.evaluateCase` (assembling every admitted file in upload order when no single file is named), and was already unit-tested by `ah-multifile-assessment.cjs` (66 assertions). What was missing for closure was a test that carries the assembled extraction through the **full local pipeline** (evaluation → consumer result → generated report), proof for the directed boundary cases, and an evidence record under the strict validator.

New test `bb-gap-ingest-001.cjs` (39 assertions) proves the pipeline and the missing boundary coverage, and `gap-ingest-001-evidence.json` records it under the four registered criteria.

## Criteria and measured evidence

- **upload_order_preserved** — two fictional pages (`file-a`, `file-b`) assemble into two re-indexed records `[1, 2]`; both printed dates (`01/01/2015`, `02/02/2019`) reach the consumer result; a reordered upload (`[b, a]`) keeps both records with the later file first. **Passed.**
- **duplicate_handling** — an exact duplicate (`file-a-copy`, same `stored_sha256`) is skipped (`duplicate_files_skipped = 1`) and never counted as a second record (`records.length` stays 2). **Passed.**
- **report_boundary** — a TransUnion and an Equifax page stay in two separate report groups; every record names its bureau; conflicting readings of the same creditor stay two records, never merged; the earlier page's record never borrows the later page's fact. **Passed.**
- **end_to_end_journey** — **PENDING.** No current-release HTTP journey evidence for an admitted multi-file upload was recorded; this requires deployment.

## Requirement-to-test mapping

| # | Directed boundary case | Test | Expected outcome | Measured outcome |
| --- | --- | --- | --- | --- |
| 1 | Later-page facts reach evaluation, consumer results and generated reports | `bb-gap-ingest-001` | both printed dates reach the consumer result; a later-page fact is named in the generated report | `report_consistency_checks[].examined` carries `01/01/2015` and `02/02/2019`; `assessmentReportBody` names `07/15/2026` from record 2 |
| 2 | Reordering equivalent pages preserves evaluated facts and findings, not merely record count | `bb-gap-ingest-001` | `[a,b]` and `[b,a]` produce the same examined dates, record facts and checks | `datesOf`/`factsOf`/`checks_performed` deep-equal across both orders |
| 3 | Duplicate pages do not duplicate records or findings | `bb-gap-ingest-001`, `ah-multifile-assessment` | an exact duplicate is skipped and adds no record, check or examined fact | `duplicate_files_skipped = 1`, `records.length` stays 2, `checks_performed` and examined dates unchanged |
| 4 | Separate reports keep their own report dates, including two from the same bureau | `ah-multifile-assessment` | two Equifax reports with different dates are two reports, each record tied to its own date | `report_groups` 2 with dates `2025-03-14` and `2026-06-12` |
| 5 | Separate bureaus and unrelated records never borrow decisive facts | `ah-multifile-assessment`, `bb-gap-ingest-001` | no record borrows a fact from another file or bureau | `recA` lacks `2019-02-02`, `recB` lacks `2015-01-01`; two bureau groups |
| 6 | Conflicting and unreadable pages do not manufacture resolved facts or findings | `ah-multifile-assessment`, `bb-gap-ingest-001` | low-confidence/conflicting pages stay unresolved, never resolved facts | low-confidence date is `EXTRACTION_UNRESOLVED`; conflicting identifiers stay two records |
| 7 | Account isolation for assembled uploads and results | `bb-gap-ingest-001` | another account cannot read the assembled case or result view | GET case and result view return HTTP 403 for the intruder |
| 8 | Actual local HTTP upload → evaluate → view path using multiple files | `ah-multifile-assessment`, `bb-gap-ingest-001` | the real endpoints assemble multiple files into one result and view | `ah` upload+evaluate records both `file_ids`; `bb` view returns 200 with two files and both facts |



## Why the earlier build's "finished" note was superseded

The historical register records GAP-INGEST-001 as finished on deployed builds `crp-wizard-57338517595e43f0` and `crp-wizard-200be86c82043b08`. Those evidence files used the pre-C1 format (a `passed` flag + `behavior` summary without the strict criterion set). OWNER-ACCEPT-010 C1 replaced that with the shared strict validator, which re-opened the blocker until its evidence names the target build with the complete criterion set. This record supplies that under the current candidate build `crp-wizard-77c1605b03e2aa8d`.

## Reconciliation performed before starting ingestion work

1. **Every evidence record that pins `ui/app.js`.** Six records pin `ui/app.js` (consumer-billing, consumer-explanations, consumer-incomplete-presentation, consumer-language-imperative, consumer-privacy, consumer-support); all six were refreshed in the prior pass and their source hashes validate. `consumer-results-evidence.json` does **not** pin `ui/app.js` (its sources are `results.cjs`, `evaluation.cjs`, `formats.cjs`, `document-model.cjs`, `av-consumer-results.cjs`), so no stale hash there.
2. **Billing sign-out/delayed-response/failure handling.** Verified and test-covered. `ba-consumer-billing.cjs` grew from 35 to 40 assertions: a failed checkout shows a refusal (never success); a failed cancellation shows a refusal (never success); sign-out clears `state.billing`; a delayed billing response after sign-out never renders the previous account's state. No defect found — the `run()` wrapper and the `state.step/account/seq` guard already behaved correctly; the missing piece was test coverage.
3. **Support-secret launch check.** Verified correct. `SUPPORT_REFERENCE_SECRET_IS_CONFIGURED` reads `process.env.CRP_SUPPORT_REFERENCE_SECRET` directly; the local process-generated secret in `support.cjs` never sets that variable, so the check fails locally and cannot pass from the ephemeral secret. Confirmed: without the variable the check FAILS ("process-generated ... local development only"); with it, it PASSES.

## Files

- New test: `accelerated-launch/service/tests/sections/bb-gap-ingest-001.cjs` (39 assertions).
- Registered in `accelerated-launch/service/tests/run-tests.cjs`.
- New evidence writer: `SOURCE_CAPTURES/CLOSURE-POLICY-001/closure-gap-ingest-001.cjs` → `accelerated-launch/service/out/gap-ingest-001-evidence.json`.
- Updated: `SOURCE_CAPTURES/CLOSURE-POLICY-001/closure-consumer-billing.cjs` (billing test now 40/40), `accelerated-launch/service/tests/sections/ba-consumer-billing.cjs` (failure handling + stale clear).

## Remaining boundaries

- `end_to_end_journey` and production readiness stay pending until deployed, current-release, served-build evidence is recorded. No deployment, no live billing change, no manual entitlement grant was made.
- Remaining open blockers: `BLOCKER-FDT-001`, `BLOCKER-CLARIFY-001`, `GAP-INGEST-002`, `-004` through `-010` (eight ingestion blockers).
