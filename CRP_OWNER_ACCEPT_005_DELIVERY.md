# OWNER-ACCEPT-005 — delivery record

Issued October 2, 2026, America/Halifax. Production unchanged; Stripe remains test mode.

## 1–2. Exception modeling corrected (deployed `crp-wizard-4b0d1f931a0e5f8f`)

- **FCRA § 1681c(a)(1)–(5) now models § 1681c(b) "Exempted cases".** The five federal retention rules record
  three off-report use exceptions (credit transaction ≥ $150k, life-insurance underwriting ≥ $150k, employment
  ≥ $75k). The transaction purpose and thresholds are not printed on a consumer report, so the exception is
  **unresolved** — it is never defaulted to false and never auto-probable. A resolved federal breach now
  preserves the qualified arithmetic observation and emits **no VIOLATION**.
- **Every other activated rule now carries a rule-specific source reference** (exact citation + recorded start)
  instead of a blanket "no exception" statement. The CA-NS bankruptcy "second bankruptcy" exception remains
  recorded (`evaluation_required: true`, unresolved). The US-NY/CA/AU rules record no exception in their
  admitted text and continue to derive `VIOLATION` on a resolved breach.
- `buildEvaluationRecord`/`classifyEvaluation` already require an explicitly resolved exception evaluation, so
  the § 1681c(b) unresolved exception blocks `VIOLATION` for the federal rules while the NY/CA/AU rules still
  classify.

Linux verification: `FCRA-605A-1` → `EVALUATED PERIOD_EXCEEDED` `finding=null`; `US-NY-GBL-380J-F1-I-BANKRUPTCY-14Y`
→ `EVALUATED PERIOD_EXCEEDED` `finding=VIOLATION`.

## 3. Tests

`af-accept-004` (40 assertions), `ae-accept-003`, and `test-adapters.cjs` now cover known exception, unresolved
exception, supported non-exempt applicability (NY/CA/AU → VIOLATION), and that unresolved applicability
(§ 1681c(b)) cannot produce `VIOLATION` — through `runAdapter` and the real extraction→evaluation→render
pipeline. Regression: **4,940 assertions passed, 0 failed, 0 skipped**.

## 4. Content mapping turned toward implementation

`accelerated-launch/content-rule-mapping.md/.csv` now carries, per row, the recorded **proposition,
jurisdiction and effective information** in addition to the subject classification (27 period-executable,
148 report-observable, 51 off-report, 29 unclassified). The period-executable rows are bound to the 14
adapters. The 148 report-observable rows are the content-check patterns to build next; the 51 off-report rows
are not forced into report-only findings. A full predicate implementation for the 148 report-observable
content rules (fraud-alert/security-freeze presence, dispute notation, medical-info omission, etc.) remains the
next content-check batch — the mapping and per-row propositions are now ready, but the fact extraction those
checks need is not yet implemented and is not fabricated here.

## 5. Paid deployed journey (browser-assisted Stripe)

Reopened a real test-mode Stripe Checkout on the deployed service: `checkout_id chk_b60ec3a61c7687a2da6625ba`,
`provider_reference cs_test_a1xacllvEO3v2HuQ6kZjQzqkLTUhKTK3jP8w6qQrw1bYfZRmJLA6Qe1Qjr`, and the **full hosted
Checkout URL is intact** (443 characters, `https://checkout.stripe.com/c/pay/…`, `redirect_grants_nothing: true`).
Hosted completion (entering the test card `4242…`) is a browser step on Stripe's page, which is not headlessly
automated; the signed-webhook → entitlement → upload → assess → download path is proven by
`accelerated-launch/service/out/b5-paid-download-verification.json` (download 200, 3 checks, content hash) on
the prior build and is unchanged by this correction. No payment evidence is fabricated; no live charge is made.

## 6. Benchmark reconciled

The 11-versus-7 discrepancy is a stale trailing fragment in `CRP_B6_INGEST_004_RELIABLE_EXTRACTION.md`
("useful checks 7 / newly-run 2") that predated the connection of `AU-ITEM3-ENQUIRY-5Y` and
`AU-ITEM4-DEFAULT-5Y`. The current reproducible baseline (re-run 2026-10-02T14:14Z): classification 9/9, record
separation 9/9, field accuracy 4/4, **useful checks 11**, **newly-run statutory checks 4**. The stale 7/2 is
marked superseded in the document; nothing blocks on it.

Remaining open: full predicate implementation for the 148 report-observable content rules (next content-check
batch), and a re-completed hosted Checkout on the current build (browser-assisted). Production unchanged;
Stripe test mode.
