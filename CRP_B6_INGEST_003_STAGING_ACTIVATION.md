# B6-INGEST-003 — Staging activation and general-report assessment coverage

Owner authorization: continuation of `CRP_OWNER_B6_INGESTION_FLEXIBILITY_DIRECTION.md`, 2026-10-01. Staging deployment was already authorized; this batch deploys the B6-INGEST-002 general intake, adds the missing image-ingestion path, measures which checks can operate on general facts, and prevents misleading success.

## 1. Verified staging build

- **URL:** https://staging.creditregulatorpro.com/
- **Build identity:** `crp-wizard-4b372a4858b87997` (composite digest `4b372a4858b87997a6f8012814314ba456d5dae9b44a2d604d4502328dc0d4ea`).
- Deployed through `hostinger-vps` (srv1616603). 52 traced files transferred, re-hashed on Linux with **0 mismatches**; `current` repointed; `CRP_BUILD_ID` updated; service restarted and `active`.
- Public HTTPS `/api/health` reports the new build id, `deployment=staging`, `billing_mode=test`, `launch_ready=false`; the UI shows the "general intake + 5 validated presentations" disclosure.
- Linux OCR verified live: tesseract 5.3.4 (`/usr/bin/tesseract`), `pdftoppm`, `pdfinfo`, `eng.traineddata`; a deployed `readImage` on a public sample image returned `available: true` (10 lines); a deployed synthetic general report detected `GENERAL` and extracted 1 record with reference date `2026-06-12`; an unrelated document was refused `UNRELATED`.
- **Data snapshot:** `/opt/crp-wizard-staging/backups/pre-b6-003-20261002-022859` (corrected to copy the real data contents, not the DynamicUser symlink). **Rollback target:** `crp-wizard-f22bc79f775264dc`. Production unchanged; Stripe in test mode.

## 2. Upload types actually supported

| Input | Path |
| --- | --- |
| Native-text PDF | existing family/exact-specimen readers, or general intake |
| Scanned / image-only PDF | local OCR (`pdftoppm` → tesseract) → general intake |
| **PNG / JPEG image** (new) | local OCR (`readImage`, direct tesseract, raw-pixel locations) → general intake |
| Image set | each image is an ordered upload; order and per-image source locations are preserved |
| Clearly unrelated document | refused `UNRELATED_DOCUMENT` |
| Unreadable / encrypted report | refused `UNREADABLE_DOCUMENT` |

The prior "non-PDF → UNREADABLE" behavior was because images were not in the allowlist and there was no image path. Images are now OCR'd **directly** (no PDF conversion) and reach the general intake; a container that is neither PDF nor image is still refused before storage.

## 3. Checks that now run on general reports

- `GENERAL-FACT-ITEM-DATE-AFTER-REPORT-DATE` — any entry date printed later than the report's own date (report-fact consistency, observation-only). It needs only a readable report date plus at least one entry date, both of which the general intake establishes.

## 4. Checks still withheld, and why (check-to-required-fields matrix)

Recorded in `accelerated-launch/check-field-matrix.json`:

- `CA-NS-CRA-S10-3-C-LIMB-1` — **withheld**: exact-specimen restriction (PR-01 digest) is preserved and not loosened by general intake.
- `CA-NS-CRA-S10-3-E-BANKRUPTCY-6Y` — **withheld**: its recorded start (discharge date) is a legal event no report field carries.

## 5. Prevent misleading success

When a report is accepted but yields no usable record facts, the result now carries `read_but_no_usable_facts` with an explicit plain explanation ("…no usable record facts … could be extracted … This is not a review of your report and nothing was concluded. Upload a clearer or complete copy…"), so an accepted upload never implies a substantive compliance review occurred when nothing could be examined.

## 6. Validation

- Local regression: `node accelerated-launch/service/tests/run-tests.cjs` → **4,777 assertions passed, 0 failed, 0 skipped**.
- New coverage in `z-general-intake` (41 assertions) adds image-container detection (PNG/JPEG/PDF/other), image upload reaching OCR/general intake (not a metadata refusal), and the full general-intake journey.
- `h-legacy-parity` scoped its "no more permissive than legacy" check to PDF, recording the image types as the single owner-authorized extension.

## 7. Boundaries

Consumer data stays private; pricing, upgrade credits and output ceilings are unchanged; no private report was transmitted anywhere; Stripe is in test mode; production was not changed. General intake remains example-backed extraction, not a validated family, and current GB present-day support is still not claimed.

Evidence: `SOURCE_CAPTURES/B6-INGEST-003/{build-manifest.json,package-files.txt,staging-deployment-provenance.json}`, `accelerated-launch/check-field-matrix.json`.

- `FCRA-605A-4-US-NATIONAL-7Y` — **withheld**: the general intake reads dates with printed labels but does not yet identify which date is the adverse-rating date; that field is the named dependency.
- `AU-PRIVACY-ACT-1988-S20W-ITEM1-LIABILITY-2Y` — **withheld**: the general intake reads generic record kinds and dates but does not yet establish a consumer-credit-liability closure (record kind + field semantics are the named dependency).

No statutory acceptance, jurisdiction inference, or finding permission was changed; the statutory comparisons are reused, not duplicated, and every output stays capped at `observation`.
