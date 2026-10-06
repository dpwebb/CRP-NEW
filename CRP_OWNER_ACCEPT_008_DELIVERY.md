# OWNER-ACCEPT-008 — delivery record

Issued October 2, 2026, America/Halifax. Production unchanged; Stripe remains test mode.

## Priority 1 — semantic defects corrected (deployed `crp-wizard-66b39f530e08ed1d`)

1. **NOT_DETECTED / UNRESOLVED wording** now says "We did not detect [label] in the information we could read"
   (never "the report does not print"), and UNRESOLVED says "we could not read the information, so we cannot say
   whether it is present or absent." A word found only in a rights notice/guide is `BOILERPLATE_ONLY`, not an
   account/record marker; locations are retained.
2. **Medical dependencies are separated**: § 1681c(a)(6) (furnisher-identity/recipient restrictions) and
   § 1681b(g) (separate medical-information furnishing requirement) are recorded as two distinct off-report
   dependencies, not a universal "consent-only" paraphrase. Dispute initiation is not asserted to be the
   § 1681c(f) notification; a security freeze is a disclosure restriction, not a mandatory printed notation.
3. **NY § 380-j(f)(2) use exceptions modeled**: the three NY retention rules (bankruptcy 14y, satisfied-judgment
   5y, paid-tax-lien 7y) now record the § 380-j(f)(2) credit/life-insurance/employment use exceptions (off-report,
   unresolved), so they no longer derive `VIOLATION` on a resolved breach — only qualified arithmetic
   observations. `US-CA` and `AU` rules (no cross-referenced exception in their admitted text) still derive
   `VIOLATION`. Linux verified.

Regression: **4,965 assertions passed, 0 failed, 0 skipped**.

## Priority 2 — production blockers enforced

`release-check.cjs` now registers **BLOCKER-FDT-001** (failure-to-detect mitigation) and
**BLOCKER-CLARIFY-001** (minimal optional clarification), both `blocks_launch: true`, each requiring its own
evidence file (`fdt-mitigation-evidence.json`, `clarify-evidence.json`) with a release identity and passing
tests. Missing/failed/stale/identity-mismatched evidence keeps each blocker OPEN and the build `NOT_LAUNCH_READY`
(verified). The FDT/CLARIFY features themselves remain to be implemented; neither documentation nor aggregate
assertion counts clear them.

## Priority 3 — content predicates

Not completed this batch beyond the corrected detected-report-information semantics. The report-observable
content predicates whose required facts can be established from the report remain the next batch; keyword
detection is not compliance coverage.

## Paid journey (item open)

Unchanged: the fresh hosted Stripe Checkout and download remain open until completed in a browser; prior-build
evidence is not substituted. Resumable handoff is in `CRP_OWNER_ACCEPT_006_DELIVERY.md`.

Remaining open: BLOCKER-FDT-001, BLOCKER-CLARIFY-001, the report-observable content predicates, and the
current-build paid download. Production unchanged; Stripe test mode.
