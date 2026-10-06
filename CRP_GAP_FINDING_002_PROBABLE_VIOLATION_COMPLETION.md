## Current closure policy — OWNER-CLOSURE-001, October 3, 2026

**Implementation: CLOSED / IMPLEMENTED_AND_TESTED. Staging verification: PENDING_VERIFICATION. Production: NOT_LAUNCH_READY.**

The passing positive/negative probable-classification tests and real OCR result earn implementation credit under the owner-authorized policy. The same-case purchased download measured HTTP 402 and is not credited as a completed download. This record supersedes earlier combined CLOSED/OPEN wording below; historical evidence is retained. Active evidence separates an explicit hash-pinned implementation object from the honestly failing end_to_end_journey criterion. See CRP_OWNER_BLOCKER_CLOSURE_POLICY_001.md and SOURCE_CAPTURES/CLOSURE-POLICY-001/.

---

# GAP-FINDING-002 — end-to-end PROBABLE_VIOLATION path: completion record

## Verdict — October 3, 2026

**CLOSED on `crp-wizard-77c1605b03e2aa8d`** under `OWNER-GAP-FINDING-002-RESOURCE-001` (owner decision + scoped
candidate). A reliably read bankruptcy record that prints an Order for Relief date more than ten years before its
own report date **and** expressly states that the printed date's correspondence to the actual court order is
unverified/unavailable derives **PROBABLE_VIOLATION** (never VIOLATION) for `US-CA-CCRAA-1785-13-A-1-BANKRUPTCY-10Y`
(source `CRP-LSRC-0171`, admitted version `FE5C1BA…BD41F6`). The qualifier is read and associated by the real
extractor from a genuine OCR fixture — never asserted directly in `runAdapter` — and no negative case manufactures
a probable example.

## Owner decision implemented

The decisive issue is `publicRecord.bankruptcyOrderForReliefDate.historical_correspondence`: whether the asserted
order-for-relief date corresponds to the actual court event. The asserted date is a resolved report fact; the
actual historical date is **not** promoted to a verified court fact. An expired asserted date gives the
deterministic support; an explicit, record-owned historical-verification statement supplies the report-level
uncertainty. This is not an unavailable-fact flag on ordinary bankruptcy entries.

## What changed

- `general-intake.cjs`:
  - A `Bankruptcy Public Record:` header opens a record that its continuation lines (`Order for Relief:`, the
    `Historical verification for …:` statement) join; a second, different order-for-relief date on the same record
    is a same-record contradiction (withheld), never a silent overwrite.
  - The explicit historical-verification statement is extracted as its own record-owned fact
    (`publicRecord.bankruptcyOrderForReliefDate.historicalVerification = "UNVERIFIED"`) with exact raw text,
    page/line, normalization and uncertainty. It triggers only when the line names "historical verification" AND
    states unverified/cannot-be-established, only on a public record, only when the referenced identity matches
    the record identity, and only from trusted lines. The statement is accumulated across word-wrapped OCR lines.
- `rule-adapters.cjs`:
  - `runAdapter` attaches `anchor.historical_verification` (the qualifier source) only for an order-for-relief
    anchor.
  - `buildEvaluationRecord` builds a structured, source-linked `decisive_facts_unavailable` entry for
    `publicRecord.bankruptcyOrderForReliefDate.historical_correspondence` when the qualifier is present.
  - `classifyEvaluation` derives PROBABLE (capped by the ceiling) for that entry; the finding carries the full
    `decisive_facts` array (identity, evidence, source location).
- `results.cjs`/`journey.cjs`: the consumer result and purchased report render the probable headline/detail, the
  named decisive fact and its source location.

## Measured behavior

- Positive candidate → `PROBABLE_VIOLATION` with `decisive_fact_unavailable` =
  `publicRecord.bankruptcyOrderForReliefDate.historical_correspondence`, `decisive: true`,
  `unavailable_from_resolved_reading: true`, source page 1.
- Negative cases (all via the real extractor): in-period date → no finding; ordinary expired date without the
  qualifier → `VIOLATION`; generic disclaimer → `VIOLATION`; cross-record qualifier → `VIOLATION`; conflicting
  dates → withheld; low-confidence qualifier → withheld; arbitrary list → refused.
- Genuine OCR fixture (real tesseract, word-wrapped statement) uploaded → admitted → evaluation → consumer result
  `PROBABLE_VIOLATION` with the named decisive fact and the evidence-policy digest `d48e4633…`.

## Release state

- Served build: `crp-wizard-77c1605b03e2aa8d` (61 files, 0 hash mismatches, active, test billing,
  `launch_ready: false`). Rollback predecessor `crp-wizard-fba918c4e8b47bdc`; snapshot
  `/opt/crp-wizard-staging/backups/pre-gap-finding-002-20261003-225902`.
- Regression: **5,433 assertions, 0 failed, 0 skipped** (baseline 5,421; +12 `at-gap-finding-002`).
- Strict release check: **all four GAP-FINDING criteria (001–004) PASS** current-release and identity-bound;
  GAP-INGEST-003 PASS; FINDING category has no launch-blocking failure. **20 launch-blocking checks remain**
  (was 21).

## Boundary (payment infrastructure, not classification)

The purchased **report download** returned HTTP 402 for the fresh US-CA case: the per-case one-time download
entitlement is bound to the specific case, and its Stripe Checkout Session (`cs_test_…`, `mode: payment`) was not
completed — the hosted card form did not render in the automated browser (`payment_intent` stayed null). This is a
per-case payment/browser step, orthogonal to the classification logic; the consumer result (the PROBABLE finding
and its decisive fact) was demonstrated end-to-end (upload 201 → evaluate 201 → view 200) on the genuine signed
sandbox-payment account. The classification invariant is preserved: unknown never becomes false, an unresolved
exception still yields no finding, and the actual historical date is never promoted to a verified court fact.

## Next

The GAP-FINDING series (001–004) is closed. The remaining launch blockers are the non-FINDING categories
(consumer experience, common errors, format support, ingestion, FDT, deployment provenance, live-billing
configuration).
