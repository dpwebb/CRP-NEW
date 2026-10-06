# OWNER-ACCEPT-004 — delivery record (round 2)

Issued October 2, 2026, America/Halifax. Executes `CRP_OWNER_ACCEPT_004_CLASSIFICATION_CORRECTION.md` and the owner's round-2 correction. Production unchanged; staging test billing only.

## Round 1 (corrected) — `crp-wizard-dbcaa58638065532`

- `classifyEvaluation(evaluation, maxConcl)` derived the class from a per-assessment legal-evaluation record and only capped it by `max_conclusion`; `FCRA-605A-2` was restored to `finding_allowed: false` (`observation`), so `observation_incomplete` blocked a finding.
- Round 1 was superseded because `buildEvaluationRecord` still hardcoded `exceptions: []` and derived `breach_established` from `PERIOD_EXCEEDED` alone.

## Round 2 (this delivery) — `crp-wizard-a88c5ae2c99aaf88`

Measured defects corrected, per the owner's seven points:

1. **`buildEvaluationRecord` now builds actual rule-specific predicates and exceptions.** Required predicates (anchor field + condition field + reference date) are each recorded resolved/unresolved; `breach_established` requires `PERIOD_EXCEEDED` AND every predicate resolved AND no unresolved exception AND not `observation_incomplete`. Missing evaluation stays explicitly unresolved.
2. **`classifyEvaluation` validates the complete record** — selected jurisdiction, admitted rule identity/version, every required resolved fact with a source value, reference date, timing (`PERIOD_EXCEEDED`), every resolved condition, and an explicitly resolved exception evaluation. An incomplete record yields no finding.
3. **An empty exception list is acceptable only where the rule explicitly records no exception** (`exceptions.evaluation_required: false`, carried in the adapter config). The CA-NS bankruptcy "second bankruptcy" exception is recorded (`evaluation_required: true`, unresolved). `FCRA-605A-2`'s "statute of limitations if longer" is the recorded `observation_incomplete` computation gap, not an exception.
4. **A nonempty `decisive_facts_unavailable` list is validated per entry** (identity, decisiveness, evidence of genuine unavailability from a resolved reading). An arbitrary or incomplete list is refused, not turned into `PROBABLE_VIOLATION`.
5. **Tests go through `runAdapter` and the real extraction→evaluation→render pipeline**, not only manually constructed classifier objects (`af-accept-004`, 32 assertions: omitted/altered evidence, missing jurisdiction/identity/fact/reference/timing/condition, missing or empty exception evaluation, known/unresolved exception, arbitrary decisive list refused, authorized breach → VIOLATION, and pipeline bankruptcy→VIOLATION / judgment (SOL-incomplete)→no finding).
6. **All-82 files verified at their stated paths** and labelled as a generated capability table (NOT deployed per-region test evidence).
7. **228-record content mapping delivered** (`accelerated-launch/content-rule-mapping.md/.csv`), classified by the recorded legacy subject — 27 period-executable, 148 report-observable, 51 off-report, 29 unclassified — not deferred as new legal research and not fabricated.

## Tests

Local regression: **4,932 assertions passed, 0 failed, 0 skipped**. `test-adapters.cjs`: 34 passed. Catalog regenerated via `build_rule_catalog.py`.

## Deployed to staging

Build `crp-wizard-a88c5ae2c99aaf88` (55 files, zero hash mismatches), rollback target `crp-wizard-dbcaa58638065532`. Data snapshot `/opt/crp-wizard-staging/backups/pre-accept-004r2-20261002-135757`. Public health: `{"ok":true,"build_id":"crp-wizard-a88c5ae2c99aaf88","deployment":"staging","billing_mode":"test","launch_ready":false}`.

Linux verification:
- `FCRA-605A-1` → `EVALUATED PERIOD_EXCEEDED` `finding=VIOLATION` (`exceptions.evaluation_required=false`, `predicates_resolved=true`).
- `FCRA-605A-2` → `EVALUATED PERIOD_EXCEEDED` `finding=null` (`observation_incomplete`).

## Remaining open (not claimed complete)

- **11-versus-7 useful-check benchmark reconciliation** — not reconstructed; requires the historical benchmark artifacts and is independent of assertion totals.
- **Paid HTTP download leg** — the entitlement gate requires a real Stripe test-mode Checkout completion, which is not headlessly automatable; the ingestion → assessment → render leg is proven for native-text and scanned-image paths.

No production change. Stripe remains in test mode.
