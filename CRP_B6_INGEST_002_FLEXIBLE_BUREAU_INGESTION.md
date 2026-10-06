# B6-INGEST-002 — Flexible bureau-report ingestion (general intake)

Owner authorization: `CRP_OWNER_B6_INGESTION_FLEXIBILITY_DIRECTION.md`, 2026-10-01. This continuation replaces the B6-INGEST-001 "independent specimen or authoritative specification" admission prerequisite and its blanket refusal of unsupported layouts, with ordinary-ingestion plausibility: a document is read when it identifies a credit bureau and prints report-like data points.

## 1. Governing reconciliation (recorded)

The two conflicting build-plan clauses were amended in quoted-replacement form (see the plan's Amendment history for the full before/after):

- `CRP_IMMUTABLE_ALL_82_WIZARD_BUILD_PLAN.md` §4 — "General upload support requires a validated presentation boundary." → "Ordinary upload admission uses reasonable credit-report plausibility … instead of a validated presentation boundary; measured extraction reliability and accurate coverage reporting are still required, and a bureau name alone is insufficient."
- §8 — "One pinned specimen proves that specimen; any family admission must have a justified structural contract and representative evidence." → "A validated presentation family remains a stronger claim than a general admission: ordinary ingestion accepts a plausible bureau report … without calling example-backed extraction a validated family."

Statutory acceptance, privacy, jurisdiction and finding permissions are unchanged. The exact-specimen CA-NS rule ceiling (PR-01, digest-only) is preserved separately.

## 2. What was implemented

A new **general intake path** (`accelerated-launch/service/general-intake.cjs`) runs as a fallback after the five validated presentations fail to admit a document:

- **Admission** — bureau identity (Equifax / TransUnion / Experian / illion) together with report-like content (accounts, balances, payment status, report dates, collections, inquiries, public records). No known layout, digest, official specimen or heading sequence is required. A bureau name/logo alone is UNRELATED.
- **Extraction** — reference date, account/collection/inquiry/public-record entries with page/line locations, raw values, normalized dates and per-field uncertainty. Native PDF text and the local OCR pipeline are both used; dates are never borrowed between records and values are never invented.
- **Assessment** — a general report-fact consistency check (`GENERAL-FACT-ITEM-DATE-AFTER-REPORT-DATE`) compares any entry date against the report's own date. Statutory checks stay bound to their own presentations and are named "not run" on a general report, never used to reject the whole report.
- **Refusals** — `UNRELATED_DOCUMENT` ("This document or image set does not seem to be a credit report. Please upload an actual credit report issued by your credit bureau.") is distinct from `UNREADABLE_DOCUMENT` ("We could not read your report clearly enough to work with it. Please upload a clearer or complete copy.").
- **Consumer messaging** — `ui/index.html` and `ui/app.js` now give upload guidance instead of acquisition-queue language, and label a general report as "general intake", distinct from a validated presentation.
- **Coverage matrix** — `accelerated-launch/coverage-matrix.json` records the general path, and `coverage-matrix.cjs` keeps the read-support sentence generated from the registry so the presentation count cannot drift.

## 3. Measured capability

| Document | Outcome |
| --- | --- |
| Any plausible bureau report (bureau + content) | read via general intake; readable facts extracted; general factual check runs; statutory checks named not-run |
| The five validated presentations (Equifax CA specimen, TransUnion CA, Equifax AU, Experian US, Experian GB 2007) | read by their own family/exact-specimen readers, unchanged |
| Bureau name/logo only | UNRELATED_DOCUMENT |
| Clearly unrelated document (no bureau) | UNRELATED_DOCUMENT |
| Encrypted / image-only with no readable bureau / non-PDF | UNREADABLE_DOCUMENT |

The general intake is **example-backed extraction, not a validated family**, and is never presented as authentic consumer evidence or universal accuracy. Current GB present-day support is still not claimed.


## 4. Validation

- **Regression:** `node accelerated-launch/service/tests/run-tests.cjs` → **4,769 assertions passed, 0 failed, 0 skipped** (was 4,737 in B6-INGEST-001).
- New `z-general-intake` section exercises: unfamiliar layouts, a different bureau, bureau-only (misleading logo), unrelated documents, unreadable non-PDFs, date normalization (ISO, `YYYY/MM/DD`, `Mon D, YYYY`, `D Mon YYYY`, US vs DD/MM convention, partial months), record separation, raw-value preservation, and the end-to-end upload → extraction → assessment journey (general factual check performed, statutory checks named not-run).
- Updated refusal tests (`b`, `c`, `l`, `p`, `s`, `w`) reflect the replaced blanket-refusal behavior: lookalikes with no bureau are UNRELATED, readable subscriber/screening artifacts are read by the general intake (never as the consumer family), and encrypted artifacts are UNREADABLE.

## 5. Build and staging

- **Prepared release package:** build `crp-wizard-182f1fbda7eae4c9`, content digest `182f1fbda7eae4c9d5f22a43a8044993838d3aa946434073dfca5bac52f315fa`, 52 traced files, bundle at `SOURCE_CAPTURES/B6-INGEST-002/bundle/crp-wizard-182f1fbda7eae4c9`.
- **Deployment:** remote activation on `hostinger-vps` (srv1616603) was not executed in this session; the runbook (transfer, re-hash, snapshot, symlink, `CRP_BUILD_ID`, restart, browser verification) is in `SOURCE_CAPTURES/B6-INGEST-002/staging-deployment-provenance.json`. Stripe remains in test mode.
- **Rollback target:** `crp-wizard-f22bc79f775264dc`.

## 6. Boundaries

No statutory acceptance was reopened; no finding class, output ceiling, CAD pricing, or upgrade credit changed. No private report was transmitted anywhere. General intake is a plausibility reader, not a guarantee of perfect reading or of every possible check; an uncertain field withholds only the checks that depend on it.
