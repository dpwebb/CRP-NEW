# GAP-FINDING-001 — rule-specific exception evaluation: completion record (revised)

> **SECOND REVISION — October 3, 2026 (during the GAP-FINDING-002 session).** The cross-bureau defect was
> demonstrated and fixed: two bureau listings of the SAME bankruptcy printing DIFFERENT discharge dates yield
> two distinct dates, but distinct dates alone do not establish distinct event identities. The CA-NS
> `second-bankruptcy` exception is now `report_observable: false` and stays unresolved in every case (event
> identity — a separate case/court — is not extractable). This supersedes the "2+ distinct discharge dates →
> applies" branch recorded below. See `CRP_GAP_FINDING_002_PROBABLE_VIOLATION_COMPLETION.md` for the defect
> trace and the `aq-gap-finding-001` test (10 assertions). Served build is now `crp-wizard-2f5a0492e85ed098`.

## REVISED served-release verdict — October 3, 2026 (revisit after review)

**CLOSED on `crp-wizard-ee6d036c5daa716a`.** This supersedes the earlier `crp-wizard-a9da8779cbe90458` verdict,
which review found to over-reach: it counted printed records instead of distinct bankruptcy events, and it
turned a single visible discharge into a resolved "does-not-apply". Both defects are corrected below.

The strict release check passes `rule_exceptions` and `end_to_end_journey` on the current release.

### What the review found and how it is fixed

1. **Counted records, not distinct events.** The earlier build resolved `count >= 2` to "applies" by counting
   every record carrying `bankruptcy.dischargeDate`. A duplicate listing or a cross-bureau copy of the SAME
   bankruptcy prints the SAME discharge date and is ONE event, not two. **Fix:** `evaluation.cjs` now collects
   DISTINCT (deduplicated) discharge dates via the exported `bankruptcyDischargeDates(records)` helper; a
   duplicate listing or cross-bureau copy is one event.

2. **Turned `count === 1` into a resolved "does-not-apply".** A single visible discharge does not establish that
   the consumer has no earlier bankruptcy — a credit report does not establish completeness, and the prior
   bankruptcy may be off-report. **Fix:** the `second-bankruptcy` exception is never resolved to
   `applies: false`. A single discharge (or duplicates, or a contradictory reading) stays `applies: null,
   resolved: false` with the explicit basis that absence is off-report.

3. **Tests injected the integer directly.** **Fix:** `aq-gap-finding-001` now exercises
   extraction → distinct-date computation → `runAdapter` → classifier with real fixtures: two distinct
   discharges, one discharge, duplicate listings, cross-bureau copies, a contradictory reading, the off-report
   FCRA § 1681c(b) exceptions, and a classifier "never false" case (18 assertions).

4. **Paid journey only covered the FCRA off-report branch.** The CA-NS `second-bankruptcy` limb is bound to the
   PR-01 exact specimen (observation-only) and is therefore not reachable through a consumer upload; its
   applies/unresolved branches are proven through `runAdapter` and the classifier. This limitation is recorded,
   not papered over.

### Precise tri-state for the configured exceptions

| Exception | Report evidence | Verdict |
|---|---|---|
| CA-NS `second-bankruptcy` (s.10(3)(e)) | 2+ DISTINCT discharge dates | applies (resolved true) |
| CA-NS `second-bankruptcy` | 1 distinct date / duplicates / contradiction / none | unresolved (never false) |
| CA-NS `second-bankruptcy` | "does-not-apply" (no prior bankruptcy) | **NOT report-evidenced** — off-report completeness, so unresolved |
| FCRA § 1681c(b) credit/insurance/employment | off-report purpose | unresolved, blocks the finding |

The "known does-not-apply" case is not producible from a credit report for any configured exception: every
"does not apply" determination requires off-report completeness (no prior bankruptcy) or off-report purpose
(no credit transaction ≥ $150k). The classifier still accepts a resolved `applies: false` evaluation record
synthetically (unchanged), but `buildExceptionEvaluation` honestly never manufactures one from report facts.

## Code changes (revised)

- `accelerated-launch/adapters/rule-adapters.cjs`
  - `buildExceptionEvaluation(adapter, report)`: `second-bankruptcy` resolves `applies: true` only for 2+
    DISTINCT discharge dates; otherwise `applies: null, resolved: false` (never false). Off-report items stay
    unresolved.
  - `runAdapter` stores `request.report` and attaches `evaluation` to every EVALUATED result; `classify` reuses
    it (unchanged from the first iteration).
- `accelerated-launch/service/evaluation.cjs`
  - Exported `bankruptcyDischargeDates(records)` collects deduplicated, sorted discharge dates (duplicate
    listings and cross-bureau copies are one event). `evaluateCase` passes
    `report = { bankruptcyDischargeDates }` into every `runAdapter`.
- `accelerated-launch/service/tests/sections/aq-gap-finding-001.cjs` (18 assertions) and its registration in
  `run-tests.cjs`.

## OCR diagnosis (GAP-INGEST-003 UNREADABLE_DOCUMENT)

Root cause: a bare SSH Node process does not inherit the systemd `EnvironmentFile`. The service sources
`/opt/crp-wizard-staging/staging.env`, which sets `CRP_TESSERACT_EXE=/usr/bin/tesseract` and
`CRP_TESSDATA_DIR=/usr/share/tesseract-ocr/5/tessdata`. `ocr/local-ocr.cjs` resolves the language-data
directory from `CRP_TESSDATA_DIR`; without it the OCR refuses (no language data) and extraction returns
`UNREADABLE_DOCUMENT`. Re-running the field verifier with `set -a && . /opt/crp-wizard-staging/staging.env &&
set +a` restores fresh served-runtime OCR (`control.png` → 2 records, `ADMITTED_GENERAL`) and the full field
verification passes on the current release.

## Validation

- Regression: **5,403 assertions passed, 0 failed, 0 skipped** (baseline 5,385; +18 from the revised
  `aq-gap-finding-001`).
- Deploy: 61 files verified, 0 hash mismatches; served, active, test billing, `launch_ready: false`.
- Paid HTTP journey (upload → evaluate → view → download 201/201/200/200): `FCRA § 605(a)(1)` period-exceeded
  with `is_a_finding: false`, `classification: null`, entitled account.

## Release / rollback / snapshot

- Served build: `crp-wizard-ee6d036c5daa716a` (content digest `ee6d036c5daa716a62e6f8cea185b701536c4f54c4596d92bd1570c0988bf083`).
- Previous `current` (rollback): `crp-wizard-a9da8779cbe90458`; earlier `crp-wizard-d3a090bcfa22cec7`,
  `crp-wizard-4f676b00426083f7`.
- Data snapshot at activation: `/opt/crp-wizard-staging/backups/pre-gap-finding-001-revisit-20261003-210233`.
- Production unchanged.

## Evidence

- Active capability evidence: `accelerated-launch/service/out/gap-finding-001-evidence.json` (exactly
  `rule_exceptions` + `end_to_end_journey`, bound to `crp-wizard-ee6d036c5daa716a`).
- `SOURCE_CAPTURES/GAP-FINDING-001-COMPLETION/` (focused evidence, HTTP journey, served-release verification,
  build/deploy scripts, strict release-check output).

## Revalidated safety evidence

- **GAP-INGEST-003** revalidated on the current release (`SOURCE_CAPTURES/INGEST-003-REVALIDATION/`):
  fresh served-runtime OCR field verification (5 field tests) and the seven-fixture HTTP journey all pass on
  `crp-wizard-ee6d036c5daa716a`; payment and entitlement re-verified. `out/gap-ingest-003-evidence.json` was
  regenerated from actual re-runs (not identity replacement) and the strict release check now reports it PASS.

## Strict release check

`GAP-FINDING-001_EXCEPTION_EVALUATION` and `GAP-INGEST-003_OCR_CONFIDENCE_AND_COORDINATES` both report PASS on
`crp-wizard-ee6d036c5daa716a`. **23 launch-blocking checks remain**: FINDING 3 (GAP-FINDING-002/003/004),
INGESTION 9 (GAP-INGEST-001/002/004-010), plus CLARIFICATION, COMMON_ERRORS, CONSUMER_EXPERIENCE (5),
DEPLOYMENT, FDT, FORMAT_SUPPORT (GB), PAYMENT. `launch_ready: false`.

## Boundaries / remaining limitations

- The `second-bankruptcy` "does-not-apply" branch is not producible from a credit report (off-report
  completeness); recorded honestly, not fabricated.
- The CA-NS limb remains PR-01 observation-only; no finding is authorized for it.
- GAP-FINDING-002/003/004 remain OPEN and are not closed by implication.

## Next substantive blocker

GAP-FINDING-002 — the end-to-end PROBABLE_VIOLATION path.

