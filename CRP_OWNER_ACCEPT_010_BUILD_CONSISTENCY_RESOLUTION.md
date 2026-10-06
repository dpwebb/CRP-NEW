# OWNER-ACCEPT-010 — Build consistency resolution

Issued: October 2, 2026. Executed: October 3, 2026.

## Resolution matrix

| ID | Correction | Status | Supporting evidence |
| --- | --- | --- | --- |
| C1 | Consistent release-evidence validation | **OPEN** — validator probes independently confirmed; FDT thresholds aligned; full revalidation pending | `independent-confirmation-20261003.json` confirms `old_minimal_rejected` + `arbitrary_criterion_rejected`; `evidence-validator.cjs` enforces `requiredCriteria` + release-bound `referenceBinds` and now also the Owner-approved FDT acceptance criteria; `release-check.cjs` gates FDT/clarification/remaining/consumer blockers |
| C2 | Unique grid-cell association | **RESOLVED** | `payment-history-grid.cjs` `zipHeaderToCells` (local spacing + tie rejection); `ap-accept-010-consistency` (equidistant-code, missing-middle, tie, clean 1:1, native/OCR units) |
| C3 | Grid confidence and provenance enforcement | **RESOLVED** | `payment-history-grid.cjs` `wordTrust` + cell trust in `zipHeaderToCells`/`verticalGrid`; `common-errors.cjs` skips unresolved cells; `ap-accept-010-consistency` (confidence-1 withheld, reliable accepted) |
| C4 | Account/bureau boundary and continuation enforcement | **RESOLVED** | `payment-history-grid.cjs` (search bounded to the grid's section; continuation requires a unique matching grid + same section); `ap-accept-010-consistency` (legend below next account, ambiguous continuation) |
| C5 | Material, consequential clarification | **OPEN** — fresh Chrome save/reload independently PASSED; historical compatibility fixed; historical-result browser step still a handoff | `independent-confirmation-20261003.json` records fresh `save/reload` PASSED (account A `I_DONT_KNOW`, account B `SKIP`, separate `CONSUMER_STATEMENT`); `clarification.normalizeQuestions` backfills safe `question_key`s and marks colliding historical rows `requires_reassessment` (no colliding controls) |
| C6 | Accurate release reporting and plan/register alignment | **RESOLVED** | `release-check.cjs` (`next_release_action` corrected; sandbox vs live billing distinguished; `validation_scope`/`target_build_id` recorded); blocker totals recomputed |

## Per-correction detail

### C1 — Consistent release-evidence validation
- Shared strict validator `accelerated-launch/service/evidence-validator.cjs` (`validateCapabilityEvidence`).
- Contract: a target release identity is required; `passed===true`; `identity.build_id===target` and `identity.served_build_id===target` (a self-reported `deployed` flag is not proof); a COMPLETE named criterion set (`criteria`) is required — each criterion with `passed===true`, `expected`, `measured`, and evidence references that **BIND to the target release** (`referenceBinds`: content names the build, or a JSON evidence document's identity is the build). A source-code file or any arbitrary existing file does **not** bind and is rejected. **The behavior-summary fallback has been removed**.
- **Required criteria are enforced per blocker**: `release-check.cjs` now declares the exact criterion keys for every capability blocker — FDT (`FDT_REQUIRED_CRITERIA`), clarification (`CLARIFY_REQUIRED_CRITERIA`), the 15 remaining blockers (`criteria` arrays) and the 5 consumer-experience blockers (existing `criteria` arrays). Missing required criteria and arbitrary/substitute criteria are rejected.
- **The validator now gates FDT and clarification too**, not just the remaining blockers: the old inline FDT/CLARIFY gates were replaced with `validateCapabilityEvidence`. FDT enforces the Owner-approved prospective acceptance criteria (≥95% recovery, zero incorrect decisive facts, zero cross-record/bureau borrowing, zero unsupported legal findings) via the validator's new `acceptance` option plus the aligned benchmark thresholds. Their stale, old-format evidence correctly keeps them OPEN.
- The audit's minimal object and its arbitrary-single-criterion/source-code-reference probes are reproduced and rejected in `ap-accept-010-consistency`.
- Rejection proven for: the audit minimal object, a source-code reference, a missing required criterion, an arbitrary substitute criterion, obsolete builds, fake deployed flags, empty references, partial/failed criteria, benchmark failure. Acceptance proven for genuine complete evidence with a release-bound reference.

### C2 — Unique grid-cell association
- `zipHeaderToCells` now computes column spacing from the heading and uses a local tolerance, never a fixed 40-unit threshold.
- A positioned code cell is accepted for at most one period; an equidistant tie, a column with no cell and a column with multiple competing cells are left unresolved.
- Required regression reproduced: headings 2024-01 (x=0..10) and 2024-02 (x=20..30) with one code 30 (x=10..20) — the old reader marked both periods certain; the corrected reader produces no accepted delinquency cell for either.

### C3 — Grid confidence and provenance enforcement
- `wordTrust` distinguishes native text-layer words (trusted by construction) from local-OCR words (their own `trusted` decision); an OCR word with a confidence but no trust decision is untrusted.
- A confidence-1 OCR code is withheld (`code: null`, `uncertain: true`, `raw_code` preserved, `reason` recorded); a reliable reading is accepted.
- `common-errors.cjs` `paymentHistoryConsistency` now skips unresolved cells, so a withheld code can never fabricate a same-period contradiction.

### C4 — Account/bureau boundary and continuation enforcement
- The header/legend/cell search in both horizontal and vertical grids stops at the next account line, so another account's legend is never borrowed.
- Continuation across pages requires page adjacency, the same source, the same bureau/report section (`section_key`), a printed continuation marker on either side, AND a **unique** account-carrying grid on the previous page.

### C5 — Material, consequential clarification
- `eligibleQuestions(records)` replaces unconditional static exposure: a question is offered only when an account is present and a consequential fact (`account.responsibility`) is missing. Each question carries a UNIQUE account/record identity (`question_key = <id>|<account>`), the account reference, and an account-specific question text ("On the account reported as X, …").
- `validateAnswers` is keyed by `question_key` (not question id), so two accounts asking the same question produce two independent answers; separate "I don't know" and "Skip" are preserved per account; an unanswered question is NOT defaulted to "individual" (it is simply not recorded); arbitrary choice values are refused and free text is length-bounded.
- **Special-answer controls fixed**: the choice `<select>` now carries real `I_DONT_KNOW` and `SKIP` options, and the buttons write to a separate answer state keyed by `question_key` (`const special = {}`), so the browser no longer converts those assignments to an empty string and drops them. Verified on the served build `/app.js`.
- `ap-accept-010-consistency` reproduces the retest's exact browser semantics (a `<select>` setter that clears a non-option value) and passes: click "I don't know" on account A and "Skip" on account B → submit → two separately stored answers (`I_DONT_KNOW`, `SKIP`) survive.
- Deployed on `crp-wizard-333d520608310406`: two distinct account-specific questions (`account-responsibility|CREDITOR A`, `account-responsibility|CREDITOR B`), each naming its account.
- **Fresh Chrome save/reload independently PASSED**: `independent-confirmation-20261003.json` records a real Chrome run (`case_8e132b40772177f968bcf0d5`) with account A `I_DONT_KNOW`, account B `SKIP`, both stored separately under `CONSUMER_STATEMENT`, and the answers persisted across reload.
- **Historical-result compatibility fixed**: `clarification.normalizeQuestions` (applied in `journey.caseView`) backfills a safe unique `question_key` from the question id plus its account (or record index) for stored eligibility that predates the per-account key, and marks rows that cannot be given a safe unique key (or would collide) as `requires_reassessment: true`. `app.js` renders those as a "run the checks again" note and never renders colliding `q-` controls or empty button keys; the account pill is only shown when an account is actually present. Historical report facts are never rewritten.
- **Real-browser historical-result step remains a handoff** (no browser automation driver this batch): the handoff is `SOURCE_CAPTURES/ACCEPT-010/browser-clarification-handoff.md`.

### C6 — Accurate release reporting and plan/register alignment
- `release-check.cjs` `next_release_action` no longer states that payment-provider authorization has not been granted. It distinguishes implemented sandbox (test-mode) Stripe billing from the remaining live-billing configuration.
- The release output records `validation_scope` (served/candidate vs local-only) and `target_build_id`.
- Blocker totals are recomputed from the actual failed gates, not carried from a dated measurement.


### FDT — failure-to-detect release thresholds and metric definitions
- `fdt-benchmark.cjs` `ACCEPTANCE` is ALIGNED with the Owner-approved PROSPECTIVE criteria: `max_missed_fact_rate: 0.05` (≥95% of the designated readable required facts recovered), `max_incorrect_fact_rate: 0` (zero incorrect decisive facts), `max_misattribution_rate: 0` (zero cross-record/bureau borrowing). `THRESHOLD_AUTHORITY` now records this as the Owner-approved alignment (no longer "PROVISIONAL").
- The benchmark's `metrics` now also emits `recovery_rate` (complement of missed), and `fdt-acceptance.cjs` continues to report `recovery_rate`, `incorrect_decisive_facts`, `cross_record_or_bureau_borrowing` and `unsupported_legal_findings`.
- `release-check.cjs` FDT gate uses `FDT_MAX_MISSED_FACT_RATE = 0.05`, `FDT_MAX_INCORRECT_READING_RATE = 0`, `FDT_MIN_RECOVERY_RATE = 0.95`, and the validator's new `acceptance` option (recovery ≥95%, zero incorrect/borrowing/unsupported).
- `FDT_REQUIRED_CRITERIA` now mirrors the Owner-approved PROSPECTIVE key names (e.g. `min_recovery_of_readable_assessment_required_facts`, `zero_cross_record_or_bureau_borrowing`, `zero_unsupported_legal_findings`).


## Deployment and verification
- **Current staging build: `crp-wizard-b117b12b76a68bc0`** (61 files, 0 remote hash mismatches) — deploys the two runtime corrections below (data snapshot `pre-crp-wizard-b117b12b76a68bc0-20261003-114405`; rollback target `crp-wizard-ea8734598db36f9f`).
- Served `/api/health` returns `crp-wizard-b117b12b76a68bc0` (staging, test billing).
- Full regression suite: **5,339 assertions passed, 0 failed** (`ap-accept-010-consistency`: 76; `am-fdt-recovery`: 52).
- Revalidated against the new served build: a fresh-case probe now records `recovery.facts_added = [{page:2,line:1,source:LOCAL_OCR}]` (previously empty), and `GET /api/cases/:caseId/results/res_695b85afa443efe52a23/view` returns that specific result's view (not the latest).

## Final acceptance revalidation (OWNER-ACCEPT-010)
Revalidated against the actual staging release `crp-wizard-ea8734598db36f9f`. Three categories, kept distinct:

### A. Corrected implementation (code changed, regression-verified)
- **C1 validator**: `requiredCriteria` (missing/substitute rejected), release-bound `referenceBinds` (not file existence), the `acceptance` option for FDT prospective criteria, and finite-metric rejection (`Number.isFinite` + non-negative, so NaN/Infinity/negative rates are refused). The two exact validator probes are independently confirmed rejected.
- **C5 clarification**: `normalizeQuestions` backfills safe unique `question_key`s and marks colliding historical rows `requires_reassessment`; `app.js` renders a reassessment note, hides the account pill when absent, carries real `I_DONT_KNOW`/`SKIP` options and a separate answer state. Fresh Chrome save/reload is independently confirmed PASSED.
- **FDT thresholds/metrics**: `fdt-benchmark.cjs` `ACCEPTANCE` and `release-check.cjs` gates are aligned to the Owner-approved prospective criteria (≥95% recovery, zero incorrect decisive facts, zero borrowing, zero unsupported).
- Full regression: **5,324 assertions passed, 0 failed** (`ap-accept-010-consistency`: 72 assertions covering missing/failed/obsolete/unrelated evidence, FDT threshold boundaries, and missing/invalid/non-finite metrics).

### B. Passing current-release acceptance (measured, bound to this release)
- **C1 validator probes**: `old_minimal_rejected` + `arbitrary_criterion_rejected` confirmed by `independent-confirmation-20261003.json`.
- **C5 fresh browser**: real Chrome save/reload `PASSED` (`case_8e132b40772177f968bcf0d5`, account A `I_DONT_KNOW`, account B `SKIP`, separate `CONSUMER_STATEMENT`).
- **FDT local prospective acceptance**: PASS — 6 documents, denominator 10 decisive facts, **recovery 10/10 (1.0 ≥ 0.95)**, **0 incorrect decisive facts**, **0 borrowing**, **0 unsupported findings**; benchmark `passed` (0 missed / 0 incorrect / 0 misattribution, recovery_rate 1). Recorded in `SOURCE_CAPTURES/ACCEPT-010/fdt-revalidation-honest-20261003.json`.

### C. Remaining product blockers (still OPEN)
- **FDT deployed-recovery criterion** (recovery accounting FIXED, download wording pending): `fdt-recovery.recoveryAudit` now records genuine recovered assessment facts with source locations for image-only pages, distinguishes ordinary OCR ingestion from useful recovery, and excludes arbitrary OCR text. Verified on the served build (fresh-case probe now records `facts_added = [{page:2,line:1,source:LOCAL_OCR}]`, previously empty). The remaining step is the purchased-download wording, which needs a completed one-off checkout — prepared as `SOURCE_CAPTURES/ACCEPT-010/fdt-checkout-handoff-private.json` (`case_c66a310ce30c51ea8336d222`). `BLOCKER-FDT-001` stays OPEN until the purchased-download wording is measured end-to-end.
- **C5 historical-result browser step** (path IMPLEMENTED, click pending): the narrow historical-result path is deployed — `GET /api/cases/:caseId/results/:resultId/view` (`caseViewForResult`) + a Result selector in the UI, enforcing ownership and no silent latest-fallback. Verified served on `crp-wizard-b117b12b76a68bc0`. The actionable historical result is `res_e6e5e1be0e838f41e77a` (2 account-specific questions); `res_695b85afa443efe52a23` has no actionable questions. A real Chrome run is still pending (handoff: `SOURCE_CAPTURES/ACCEPT-010/browser-clarification-handoff.md`).
- **BLOCKER-CLARIFY-001** remains OPEN (its stored evidence is still bound to an obsolete build and lacks served identity + criteria).
- Unchanged from prior batches: COMMON-ERRORS, GAP-INGEST-001…010, GAP-FINDING-001…004, the five consumer-experience blockers, `CURRENT_GB_SUPPORT_IS_ESTABLISHED`, `PAYMENT_PROVIDER_IS_CONFIGURED_FOR_BILLING`, and `DEPLOYMENT_PROVENANCE_AND_RELEASE_AUTHORIZATION_RECORDED`.

**OWNER-ACCEPT-010 is NOT declared complete**: C1, C5, FDT deployed-recovery and the clarification blocker require the remaining measured acceptance before C1–C6 are closed.

## Preservation
- No historical/superseded evidence was rewritten. All prior audit evidence (`independent-browser-and-validator-audit.json`, `independent-retest-20261003.json`, `independent-validator-final-retest-20261003.json`, `independent-confirmation-20261003.json`, the fresh-passed screenshot) is preserved unchanged.
- New current-release revalidation evidence is written to NEW files under `SOURCE_CAPTURES/ACCEPT-010/` (`fdt-revalidation-honest-20261003.json`, `fdt-recovery-download-evidence-current.json`, `fdt-mitigation-evidence.previous.json`), leaving the `ACCEPT-009` package and the read-only legacy corpus untouched.
- Production, legal authority, finding safeguards and test-only Stripe billing are unchanged.
