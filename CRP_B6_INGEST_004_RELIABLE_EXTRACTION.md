# B6-INGEST-004 — Reliable extraction with minimal consumer effort

Owner authorization: continuation of `CRP_OWNER_B6_INGESTION_FLEXIBILITY_DIRECTION.md`, 2026-10-01. This batch improves automatic reading, connects assessment-relevant extraction to the existing statutory checks, adds orientation recovery, and measures ingestion quality — deployed to staging.

## 1. Staging build

- **URL / build identity:** https://staging.creditregulatorpro.com/ → `crp-wizard-491f86ed65f174db` (digest `491f86ed65f174db…`).
- Deployed through `hostinger-vps` (srv1616603): 52 traced files re-hashed on Linux with **0 mismatches**; service `active`; Stripe in test mode; production unchanged.
- **Data snapshot:** `/opt/crp-wizard-staging/backups/pre-b6-004-20261002-030908`. **Rollback target:** `crp-wizard-0c711d417d1fe38f`.
- Linux verification of the new connections (positive, negative): FCRA-605A-5, AU-ITEM1-LIABILITY-2Y, AU-ITEM3-ENQUIRY-5Y and AU-ITEM4-DEFAULT-5Y all `EVALUATED` on general reports; a clean general report runs no statutory comparison.

## 2. Automatic reading (item 1)

- Native PDF text remains preferred; bounded OCR recovery is unchanged.
- **Orientation recovery:** `local-ocr.cjs` now detects a rotated image with tesseract OSD (`--psm 0`) and, when rotation is non-zero, re-reads with an auto-orienting page-segmentation mode (`--psm 1`). This corrects 90/180/270-degree phone photos using only the existing tesseract tool — no image library, no new dependency, no external transmission. Original bytes and source locations are preserved.
- Deskew and contrast beyond tesseract's internal preprocessing require an image library not present on the staging host; this is a named remaining limitation, not a silently skipped step.

## 3. Assessment-relevant extraction and newly available assessments (item 3)

The general intake now recognises and canonicalises the facts the existing checks read, and connects them:

| Check | Newly available on a general report when… |
| --- | --- |
| `FCRA-605A-5-US-NATIONAL-7Y` (adverse item, 7y) | the report prints an adverse annotation "NN days past due as of Mon YYYY" |
| `AU-PRIVACY-ACT-1988-S20W-ITEM1-LIABILITY-2Y` (liability, 2y) | the report prints a closure date (Closed/Paid/Settled) on a credit-account line |
| `AU-PRIVACY-ACT-1988-S20W-ITEM3-ENQUIRY-5Y` (credit enquiry, 5y) | the report prints an enquiry with its date |
| `AU-PRIVACY-ACT-1988-S20W-ITEM4-DEFAULT-5Y` (default, 5y) | the report prints an overdue/default record with its original-listing date (never a current-listing date) |
| `GENERAL-FACT-ITEM-DATE-AFTER-REPORT-DATE` | a readable report date plus any entry date (already connected) |

These are the same legal engine, reused; `presentation_required` for the four statutory checks now accepts `GENERAL-BUREAU-REPORT` in addition to their original family, recorded in `adapter-configs.json`. Adverse dates, closure dates, enquiry dates and original-listing dates are mapped only where the printed wording is unambiguous; an unrecognised label is never mapped to a legal meaning.

Still withheld (recorded in `accelerated-launch/check-field-matrix.json`): `CA-NS-CRA-S10-3-C-LIMB-1` (exact-specimen PR-01, preserved) and `CA-NS-CRA-S10-3-E-BANKRUPTCY-6Y` (its start is a legal event no report field carries). No jurisdiction is inferred and no finding permission is broadened; every output stays capped at `observation`.

## 4. Benchmark (item 8)

`node accelerated-launch/benchmark-ingestion.cjs` writes `accelerated-launch/out/b6-004-benchmark.json`. Nine synthetic fixtures (native PDF, unfamiliar layout, adverse rating, closure date, enquiry date, overdue date, mixed reports, bureau-only, unrelated), retaining their synthetic designations:

- Correct document classification: **9/9**
- Correct record separation: **9/9**
- Assessment-field accuracy (adverse, closure, enquiry, original-listing): **4/4**
- Useful checks completed: **11**
- Newly-run statutory checks: FCRA-605A-5, AU-ITEM1-LIABILITY-2Y, AU-ITEM3-ENQUIRY-5Y, AU-ITEM4-DEFAULT-5Y

The benchmark is reproducible and is explicitly labelled synthetic — not proof of universal real-report accuracy.

## 5. Validation

`node accelerated-launch/service/tests/run-tests.cjs` → **4,791 assertions passed, 0 failed, 0 skipped**. The `z-general-intake` section now also pins: the reported-account, credit-liability, credit-enquiry and overdue record kinds; that FCRA-605A-5, AU-ITEM1-LIABILITY-2Y, AU-ITEM3-ENQUIRY-5Y and AU-ITEM4-DEFAULT-5Y actually evaluate on general reports (positive); that a clean general report runs no statutory comparison (negative); and that an overdue record without an original-listing date is not aged from a current-listing date (missing-fact).

## 6. Remaining limitations (honest)

- **Clarification flow (items 4–6) is not yet implemented** as a consumer surface. The extraction already carries page/line source locations and per-field uncertainty, which is the foundation for "show a cropped excerpt and ask one question"; the question/answer endpoint, correction provenance and the "max two questions" limit are the next concrete work. No consumer is asked to interpret a statute or an ambiguous date in the current build.
- **Deskew / contrast** beyond tesseract's own preprocessing needs an image library not on the staging host.
- **Bankruptcy discharge date** (item 3) is extracted when the printed label is unambiguous, but the CA-NS bankruptcy check remains withheld because its recorded start is a legal event no canonical field carries.
- General intake is still example-backed extraction, not a validated family; current GB present-day support is still not claimed.

Consumer data stays private; pricing, upgrade credits and output ceilings are unchanged; no private report was transmitted anywhere; Stripe is in test mode; production is unchanged.

Evidence: `SOURCE_CAPTURES/B6-INGEST-004/{build-manifest.json,package-files.txt,staging-deployment-provenance.json}`, `accelerated-launch/check-field-matrix.json`, `accelerated-launch/service/out/b6-004-benchmark.json`.

## 7. Benchmark reconciliation (OWNER-ACCEPT-005 item 6)

A stale trailing fragment below this section previously reported "useful checks completed: 7" and "newly-run statutory checks: FCRA-605A-5, AU-ITEM1-LIABILITY-2Y". That fragment was a leftover from before `AU-ITEM3-ENQUIRY-5Y` and `AU-ITEM4-DEFAULT-5Y` were connected, and it contradicted this document's own §4. The reconciliation:

- **Current reproducible baseline (re-run 2026-10-02T14:14Z):** classification 9/9, record separation 9/9, field accuracy 4/4, **useful checks 11**, **newly-run statutory checks 4** (`FCRA-605A-5`, `AU-ITEM1-LIABILITY-2Y`, `AU-ITEM3-ENQUIRY-5Y`, `AU-ITEM4-DEFAULT-5Y`) — recorded in `accelerated-launch/out/b6-004-benchmark.json`.
- The earlier "7"/"2" is **superseded**, not a competing measurement; the 4-statutory-check count includes the two later-connected AU items absent from the stale fragment.

The benchmark is reproducible and is explicitly labelled synthetic — not proof of universal real-report accuracy.
