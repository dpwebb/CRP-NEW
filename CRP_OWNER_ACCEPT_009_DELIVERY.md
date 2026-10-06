# OWNER-ACCEPT-009 — Delivery

## What was done (implemented capabilities)

1. **Release enforcement reconciled with the full blocker list.** `accelerated-launch/service/release-check.cjs` now
   registers every required production blocker (§8.1: FDT/CLARIFY/COMMON-ERRORS; §8.2: 14 GAP IDs). Each is
   `blocks_launch: true` and OPEN until its own evidence file demonstrates **behavior** bound to a release identity.

2. **GAP-INGEST-001 — coherent multi-file / image-set assessment (deployed `crp-wizard-57338517595e43f0`).**
   - `multi-file-assembly.cjs` assembles **every admitted file** in a case in upload order; the latest file no longer
     silently replaces earlier pages.
   - **Report boundaries = bureau identity AND reference date.** Two same-bureau reports with different legitimate
     dates are separate reports; every record carries `source_report_reference_date`; a dateless continuation page
     attaches to the sole dated report of that bureau; conflicting dates are never merged or borrowed.
   - Records are re-indexed globally and carry source file/page/line + reading source; OCR confidence/trust/coordinates
     are preserved on each fact's location (`general-intake.cjs` keeps `line_evidence`).
   - **Repeated-page detection within a PDF** (full-page text match, audited skip) and **likely missing pages** from
     printed page numbering only.
   - An exact byte-for-byte duplicate (content `stored_sha256`) is skipped, not counted as duplicate debt.
   - A refused upload still evaluates to the honest "not read" result (no 409).

3. **OCR uncertainty enforced at field acceptance** (`general-intake.cjs`): a low-confidence OCR line is preserved
   but its dates are UNRESOLVED (`LOW_CONFIDENCE_OCR_READING`), never resolved facts; the report date is likewise
   never resolved from a low-confidence line.

4. **Regression + focused tests:** 5,020 assertions passed (55 in `ah-multifile-assessment`), 0 failed, 0 skipped.

5. **GAP-INGEST-002 — multi-line / continued-account assembly (deployed `crp-wizard-274927b07df180cd`).**
   - `general-intake.cjs` `buildRecords` starts a new account only on an account/creditor boundary word; a field-label
     line (Opened/Closed/Balance/Limit) continues the account before it. Records are never merged on shared
     bureau/creditor/amount alone. Spans pages within one document.
   - **Dateless-page attachment reassessed**: requires contiguity in upload order, never the sole dated report of a
     bureau; a non-contiguous dateless page is retained unresolved with no borrowed reference date.
   - **Dedup safeguard**: a page is a duplicate only when text AND bounding-box geometry match (identical OCR text with
     different image content is kept).
   - Deployed real-tesseract OCR probe assembled "Creditor A Opened 01/01/2015" + "Closed 02/02/2021" into ONE
     `CONSUMER_CREDIT_LIABILITY` record (both dates, confidence 96.5/96.7).

6. **GAP-INGEST-002 — cross-file continuation + strengthened dedup (deployed `crp-wizard-31741f274d9056b1`).**
   - A field line with no account in its own file is retained as a *continuation candidate*; the assembly attaches it
     to the OPEN account of the immediately preceding file only on positive evidence (upload adjacency **and** field-line
     continuation **and** a compatible open-account target). Upload adjacency alone never merges; separate accounts and
     unresolved associations are preserved; per-file extractions are never mutated by the merge.
   - **Dedup strengthened**: matching OCR text AND geometry no longer discards a page. Only an exact native-text-layer
     match is a confirmed duplicate; an OCR text+geometry match is retained as a `suspected_duplicate` with an explicit
     flag (`SUSPECTED_DUPLICATE_RETAINED`), originals and the skip audit preserved.
   - Deployed real-tesseract cross-file probe: image A (`Creditor A Opened 01/01/2015`) + image B (`Closed 02/02/2021`)
     assembled into ONE `CONSUMER_CREDIT_LIABILITY` record with `continuation_merged_from` naming image B.

7. **Browser payment COMPLETED (Stripe test mode) + cross-file/dedup/equivalent/date changes (deployed `crp-wizard-200be86c82043b08`).**
   - The browser completed the sandbox Checkout: entitlement `ACTIVE` (`source: stripe`, `access_via: ONE_TIME_CREDIT`);
     two uploads HTTP 201; assessment HTTP 201 (6 checks); purchased download HTTP 200 twice (identical bytes);
     unpurchased download HTTP 402. The grant was independently audited (stored `APPLIED`/`ACTIVATE` event, matched to
     the opened checkout session — signature-verified, not redirect success).
   - **Dedup never discards on text+geometry** (native or OCR): suspected duplicates retained and flagged.
   - **Equivalent non-byte-identical images across files** retained as `suspected_equivalent_duplicate`.
   - **Date parsing**: full month names, `MM/YYYY` partial precision, ambiguous numeric day/month recorded
     (`ambiguous` + `alternative`), and report-reference-date preference for unambiguous full-precision candidates.
   - Regression **5,043 assertions passed, 0 failed, 0 skipped**.

9. **Date-handling corrections (deployed `crp-wizard-89c10c96ce33b399`).** `GAP-INGEST-003/-005/-006/-007` were
   reopened after owner review; prior evidence is preserved in `service/out/superseded/`.
   - **005 corrected:** jurisdiction no longer resolves ambiguous numeric dates; both interpretations preserved and
     the comparison requires agreement.
   - **006 corrected:** precision-aware range evaluation for the general intake **and** the format-family readers;
     first-day substitutions removed.
   - **007 corrected:** conflicting genuine report headers withhold the reference date.
   - **003 reopened (accurate audit):** low-confidence withholding demonstrated with an injected test model, not real
     deployed OCR; retained OPEN pending a real deployed-OCR below-floor reading.
   - Regression **5,077 assertions passed, 0 failed, 0 skipped**.

10. **Partial native-text recovery + bureau segmentation + upload limits (deployed `crp-wizard-f0e58d34e683c6df`).**
    - **008** incomplete native pages supplemented by OCR; `mergeRecoveredLines` dedups and never substitutes.
    - **009** combined reports segmented by bureau-section headers (never boilerplate/creditor names); records carry
      their own bureau.
    - **010** upload limits exposed to the consumer surface (10 MB / 8 files / 40 MB / PDF-PNG-JPEG).
    - Regression **5,097 assertions passed, 0 failed, 0 skipped**.

11. **Common-error assessments + ingestion-evidence reconciliation (deployed `crp-wizard-09dc055b38bd5fe5`).**
    - `GAP-INGEST-008/-009/-010` reopened as incomplete; `008` dedup corrected to text **and** location;
      `liability.openedDate` extraction added.
    - `BLOCKER-COMMON-ERRORS-001`: four data-consistency checks implemented in `common-errors.cjs` (a new check class,
      never a legal finding): contradictory account dates, duplicate reporting, out-of-order reported dates, re-aging
      signal.
    - Regression **5,111 assertions passed, 0 failed, 0 skipped**.

12. **FDT recovery + common-error facts/checks (deployed `crp-wizard-6d701537bd1387f4`).**
    - `common_errors` bucket now rendered in results and the paid download.
    - Duplicate reporting requires kind + dates + source report; re-aging names the adverse event, never a later
      update/payment date; `account.amount`/`status` extracted; `COMMON-ERROR-STATUS-DATE-CONTRADICTION` added.
    - COMMON-ERRORS corrected to **3 of 6 areas** (was mis-stated "4/6").
    - Regression **5,115 assertions passed, 0 failed, 0 skipped**.

13. **FDT recovery deployed and verified; premature closure corrected (build `crp-wizard-161c24b49d6d0f30`, 59 files).**
    - Corrected premature FDT closure: release check now requires `deployed: true`; local results labelled `local_only`.
    - Corrected duplicate identity: `account.masked_identifier` (masked account number token), never the creditor name.
    - Benchmark audited: 5 layouts / 10 expected facts / 1 real PDF via pdftotext; thresholds PROVISIONAL.
    - Deployed via `hostinger-vps` (0 hash mismatches) and behaviorally verified: native PDF, image OCR, and a
      native-text + blank image-only-body PDF producing `reading_limitations {limited:true, incomplete:true}`.
    - Regression **5,153 assertions passed, 0 failed, 0 skipped**.

14. **FDT acceptance completed to the demonstrated degree; duplicate tightened (build `crp-wizard-470554ec5cb3ceae`, 59 files).**
    - Paid-download resolved: purchased case `case_8e132b40772177f968bcf0d5` returns 200; the 402 was an unpurchased case.
    - Actual recovery: image-body PDF (native page 1 + image-only body page 2) recovered 2 accounts; account 2 only
      recoverable by OCR. Unsuccessful-recovery demonstration preserved.
    - Duplicate tightened: both masked identifier AND creditor name required (masked trailing digits can collide).
    - Owner-approved PROSPECTIVE FDT criteria recorded in `fdt-benchmark.cjs` (apply to the next run).
    - Regression **5,154 assertions passed, 0 failed, 0 skipped**.

15. **Prospective FDT acceptance executed; clarification + balance/payment checks implemented; deployed (build `crp-wizard-bc095afed6459b15`, 60 files).**
    - `fdt-acceptance.cjs` froze a 6-document held-out set (sha256 recorded) and ran it through the poppler model and
      general intake against the already-approved PROSPECTIVE criteria: 10/10 decisive facts recovered, 0 incorrect
      decisive facts, 0 cross-record/bureau borrowing, 0 unsupported legal findings, 0 record-collapse errors,
      0 withhold errors. Deployed identity `crp-wizard-bc095afed6459b15` verified with useful recovery, bounded
      unsuccessful recovery, results and the purchased download (200). **BLOCKER-FDT-001 CLOSED.**
    - `clarification.cjs` implements at most two plain-English material questions with benefit, "I don't know" and
      "Skip", answers stored separately (`CONSUMER_STATEMENT` / `CONSUMER_SUPPLIED`), never replacing a reading or
      escalating a finding; the clarify HTTP endpoint is verified on the served build. **BLOCKER-CLARIFY-001 CLOSED.**
    - `general-intake.cjs` now extracts distinct `account.balance`, `account.pastDueAmount`, `account.paymentAmount`,
      `account.creditLimit` and `account.currency`; `common-errors.cjs` adds `COMMON-ERROR-BALANCE-PAYMENT-INCONSISTENCY`
      (verified on the served build). `duplicateReporting` now also requires an additional compatible account fact;
      the same-creditor/same-masked-digits collision stays a qualified similarity observation.
    - Regression **5,176 assertions passed, 0 failed, 0 skipped**. **12 blockers remain OPEN.**

16. **Payment-history and identity/responsibility assessments finished; clarification verified in the wizard (build `crp-wizard-9aeea6ec818e3ac8`, 60 files).**
    - `general-intake.cjs` reads a printed payment-history grid (period=code cells, `code -> meaning` legend, raw
      cells, uncertainty) and printed individual/joint/authorized-user responsibility. `common-errors.cjs` adds
      `COMMON-ERROR-PAYMENT-HISTORY-INCONSISTENCY` and `COMMON-ERROR-RESPONSIBILITY-INCONSISTENCY`. Blank cells and
      unlisted codes are never guessed; authorized-user/joint/individual roles are preserved, never identity theft.
      **BLOCKER-COMMON-ERRORS-001 CLOSED (all six areas).**
    - Duplicate reporting stays qualified: a single matching generic field (balance/limit/status) never establishes a
      duplicate.
    - The consumer wizard now renders the optional clarification block after a real report result (benefit, "I don't
      know", Skip), verified in the UI smoke test and on the served build.
    - Regression **5,196 assertions passed, 0 failed, 0 skipped**. **11 blockers remain OPEN.**

17. **COMMON-ERRORS reconciled and comparisons corrected (build `crp-wizard-81185849b1d991cc`, 60 files).**
    - `paymentHistoryConsistency` now flags only a genuine same-period contradiction (the same period printed twice
      with different cells); a latest "paid as agreed" cell beside a "charged off" status is never automatically
      inconsistent. `responsibilityInconsistency` now requires the same bureau + report reference date snapshot AND
      an additional corroborating account fact; different snapshots, changed responsibility, joint relationships and
      masked-identifier collisions are never conflicts.
    - **BLOCKER-COMMON-ERRORS-001 REOPENED**: the deployed image/OCR demonstration (an OCR attempt admitted the grid
      but did not decode the cells), the real-browser clarification demonstration and a report-internal identity
      assessment remain.
    - Regression **5,199 assertions passed, 0 failed, 0 skipped**. **12 blockers remain OPEN.**

## What is registered but NOT satisfied (separate from capabilities)

The remaining blockers are enforced and blocking. **11 launch-blocking checks remain; `launch_ready: false`.** Still
OPEN: BLOCKER-COMMON-ERRORS-001 (reopened: deployed image/OCR demonstration, real-browser clarification
demonstration, identity assessment), GAP-INGEST-003/009/010, GAP-FINDING-001–004, and the three pre-existing
launch checks (GB support, payment provider, deployment provenance).

## What is NOT implemented (remains OPEN)

- **BLOCKER-COMMON-ERRORS-001** (reopened): a deployed image/OCR demonstration of the payment-history and
  responsibility checks, a real-browser demonstration of the consumer clarification interface, and a
  report-internal identity assessment (responsibility extraction alone is not a complete identity assessment).
- GAP-INGEST-003, GAP-INGEST-009, GAP-INGEST-010.
- End-to-end PROBABLE_VIOLATION path and finding-source provenance (GAP-FINDING-001/002/003/004).
- Live-billing readiness, current GB support, and the `service/out/deployment-provenance.json` record — the three
  pre-existing launch checks (out of scope for test-mode ingestion; not attempted).

## Honest limitations of this batch

- Common-error checks are data-consistency "potential issues" only; none is a legal finding. The payment-history
  grid is read only when clearly printed (a graphical grid stays unread, and an unread cell is never a missed
  payment). The payment-history check flags only a genuine same-period contradiction (the same period printed
  twice with different cells); a latest "paid as agreed" cell beside a "charged off" status is never automatically
  inconsistent. The responsibility check requires the same snapshot plus an additional corroborating fact;
  changed responsibility, joint relationships and masked-identifier collisions are never conflicts.
- The FDT acceptance run is a small held-out set (6 documents, 10 decisive facts) and is not advertised as
  universal accuracy.
- The clarification workflow is implemented and deployed; it never replaces a report reading and never escalates a
  finding, and its answers are kept apart from report facts as consumer statements. Its UI is verified with a
  node:vm smoke test and endpoint responses, not a real browser, so the real-browser criterion stays open.







## Mappings / keywords / totals (explicitly NOT capabilities)

Mapped source records, detected keywords, and the regression assertion total are reported separately and do **not**
clear any blocker.

## Deployment

Build `crp-wizard-4891dc7797a6956b` deployed to staging (61 files, 0 hash mismatches); data snapshot
`pre-crp-wizard-4891dc7797a6956b-20261003-002336`; rollback target `crp-wizard-deebac568f9acfeb` (see
`SOURCE_CAPTURES/ACCEPT-009/rollback-staging.sh`). Public HTTPS `/api/health` reports
`crp-wizard-4891dc7797a6956b`. Production unchanged; Stripe remains test mode.

## Honest status

OWNER-ACCEPT-009 is **partially complete**. This batch closed **GAP-INGEST-008** (single-page partial-text
recovery): a page with substantial native text plus an image-only account/table region is detected structurally
and the region recovered through bounded local OCR, with recovered facts keeping their source/confidence/
coordinates, conflicting readings preserved, and an unreadable region reported with an honest limitation. The
remaining GAP-INGEST blockers are **not** closed: GAP-INGEST-003 (OCR uncertainty → withholding), GAP-INGEST-009
(bureau segmentation full criterion), and GAP-INGEST-010 (upload limits) have no passing evidence.
BLOCKER-FDT-001 and BLOCKER-CLARIFY-001 remain closed; BLOCKER-COMMON-ERRORS-001 remains reopened only for the
real-browser clarification demonstration. **11 blockers remain; `launch_ready: false`.**




