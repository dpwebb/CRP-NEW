# B6-INGEST-001 — Consumer credit-report ingestion coverage matrix, evidence audit, and honest acquisition queue

Owner authorization: 2026-10-01. Working tree `C:\CRP-NEW`. Build plan: `CRP_IMMUTABLE_ALL_82_WIZARD_BUILD_PLAN.md` (rank 5). This batch inspects the existing local captures and the owner-designated legacy report corpus read-only, records what the evidence actually supports, wires the coverage surface to the registry so it cannot drift, and records the unsupported bureaus as a named acquisition queue. It admits **no new bureau format** because the evidence on hand does not support one.

## 1. What this batch found (inventory and prioritization)

The owner-designated legacy report corpus is `C:\Users\webbd\crp-credit-app\packages\backend\fixtures\`:

- `reports/` — **two real consumer reports**: `equifax-david-webb.pdf` (`LEG-CONSUMER-EQ-CA`) and `transunion-david-webb.pdf` (`LEG-CONSUMER-TU-CA`). Already the two Canadian presentations in the registry.
- `credit-reports/{AU,CA,UK,US}/` — **461 generated fixtures** (AU 112, CA 126, UK 105, US 118). These are synthetic, scenario-seeded, native-text tabular renders (verified by reading one: `Report ID: equifax-us-obsolete_public_record-4141`, fictitious name/address, "EFX US CONSUMER DISCLOSURE"). Per the build plan, synthetic fixtures exercise behavior but **cannot establish bureau-format coverage**.

The captured public artifacts (`SOURCE_CAPTURES/REPORT_FORMAT_BASELINE_2026-09-30` and the investigation packages) hold, for every target bureau, **only** subscriber/training/guide/HTML material — not genuine consumer disclosures:

| Target | What is actually on hand | Result |
| --- | --- | --- |
| US Equifax consumer | PUB-003 TotalView (subscriber), ALT-007/008 OneView (subscriber), ALT-005 redesign announcement | **missing** — no consumer disclosure |
| US TransUnion consumer | PUB-002/ALT-002 print-image guide (subscriber), PUB-015/025 TUXML (subscriber), ALT-006 third-party deck | **missing** |
| AU Experian consumer | PUB-022 route HTML, PUB-023 field-guide HTML | **missing** |
| AU illion consumer | PUB-020 compliance review, PUB-022 integrated-route HTML | **missing** |
| GB current (any bureau) | PUB-009 is the 2007 fictitious training sample; Equifax/TransUnion routes are 404/403/HTML | **missing — GB stays blocked** |
| CA Equifax family (beyond PR-01) | PUB-005/006/007 guides, PUB-008 FCAC page | **missing** — PR-01 stays digest-only |

This matches the prior closed investigations (`CRP_ALTERNATE_US_CONSUMER_FORMAT_INVESTIGATION.md`, `CRP_EXPERIAN_US_CONSUMER_FORMAT_INVESTIGATION.md`, `CRP_PUBLIC_REPORT_FORMAT_BASELINE_2026-09-30.md`).

## 2. What was implemented (the highest-value evidenced batch)

No new bureau family is admissible from the evidence, so the batch delivers the honest, measured surface instead of a fabricated adapter:

1. **`accelerated-launch/coverage-matrix.json`** — the compact coverage matrix. For every bureau/country/channel it records `support_state` (exact-specimen / family / historical-only / missing), the evidence artifacts and currency, native/scan support, extraction fields, compatible assessments, and the per-row `next_step`. A nine-row `acquisition_queue` orders the missing bureaus.
2. **`accelerated-launch/service/coverage-matrix.cjs`** — the single source of truth. `supportedPresentations()` is derived from the registry; `readSupportQualification()` generates the "five named report presentations" sentence; `validation()` cross-checks the authored JSON against the registry.
3. **A real drift fix.** `results.cjs` and `server.cjs` still said **four** report presentations; the B4-continuation TransUnion Canada family was never reflected there. Both now render the generated sentence, so the count can never drift again.
4. **Consumer messaging.** `ui/index.html` now names the acquisition queue (US Equifax/TransUnion, AU Experian/illion, current GB, a broader CA Equifax family) and the next step, before purchase/upload.
5. **A pinned test section** (`y-ingest-coverage-matrix.cjs`) asserts matrix↔registry consistency, the five named presentations, the queue coverage, and that a country selection can only offer its own presentations.


## 3. Current support (exact-specimen vs family), unchanged by this batch

| Presentation | Bureau / country | Admission | Native/scan |
| --- | --- | --- | --- |
| PR-01 | Equifax Canada | exact-specimen digest (one pinned specimen) | native text 22/22 |
| FAM-TU-CA-CONSUMER | TransUnion Canada | structural contract (one real specimen) | native text 12/12 |
| FAM-AU-EQX-CONSUMER | Equifax Australia | structural contract (PUB-012 sample) | native text 14 pages |
| US-CONSUMER-DISCLOSURE | Experian United States | structural contract (PUB-001 sample, 2015) | scanned, local OCR |
| FAM-GB-EXP-CONSUMER | Experian United Kingdom | structural contract (PUB-009, 2007 fictitious) | native text 9/9 — **historical only** |

Extraction fields and compatible assessments are recorded per row in `coverage-matrix.json` and are unchanged by this batch (no field, assessment, or output permission changed).

## 4. Remaining gaps and smallest next batch

Smallest next batch (from the queue): **US Equifax**, then **US TransUnion** — each blocked only on a genuine consumer-disclosure specimen or an authoritative current consumer layout specification. Then AU Experian/illion, then current GB. CA Equifax promotion to a family and CA TransUnion widening each need a second specimen.

## 5. Validation, build and rollback

- **Regression:** `node accelerated-launch/service/tests/run-tests.cjs` → **4,737 assertions passed, 0 failed, 0 skipped** (was 4,718; +19 from the new coverage-matrix section).
- **Prepared release package:** build `crp-wizard-4f37e43d64168670`, content digest `4f37e43d6416867028fb41bf7d2f122ceb7ee5ddffe93872369fbf869903dd27`, 51 traced files, bundle at `SOURCE_CAPTURES/B6-INGEST-001/bundle/crp-wizard-4f37e43d64168670`. Changed runtime files: `coverage-matrix.json` (new), `coverage-matrix.cjs` (new), `results.cjs`, `server.cjs`, `ui/index.html`.
- **Deployment:** the remote staging activation on `hostinger-vps` (srv1616603) was **not executed in this session**; the immutable package is prepared and the exact runbook (transfer, re-hash, snapshot, symlink, `CRP_BUILD_ID`, restart, HTTPS verification) is recorded in `SOURCE_CAPTURES/B6-INGEST-001/staging-deployment-provenance.json`. This is the operator's next executable step using the existing isolated-service/data-backup/rollback process; Stripe remains in test mode.
- **Rollback target:** `crp-wizard-f22bc79f775264dc` (current staging build), retained unchanged.

## 6. Boundaries

No bureau is newly claimed supported. Current GB remains blocked. No all-82 jurisdiction is called launch-ready. No private report was transmitted anywhere; the synthetic legacy corpus and the real Canadian reports were read only from where they already sit. No finding class, output permission, CAD pricing, or upgrade-credit behavior was changed.

Evidence: `accelerated-launch/coverage-matrix.json`, `accelerated-launch/service/coverage-matrix.cjs`, `SOURCE_CAPTURES/B6-INGEST-001/{build-manifest.json,package-files.txt,staging-deployment-provenance.json}`.
