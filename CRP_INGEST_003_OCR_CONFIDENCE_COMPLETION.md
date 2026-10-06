# GAP-INGEST-003 — OCR confidence and coordinates: completion record

## Final served-release verdict — October 3, 2026

**CLOSED on `crp-wizard-d3a090bcfa22cec7`.** This verdict supersedes the historical OPEN/payment entries below. The strict release check passes the exact three required criteria: `ocr_confidence_preserved`, `coordinates_preserved`, `end_to_end_journey`.

The remaining implementation defects were corrected: labelled legal-event dates now use the decisive-word trust gate, and consumer results/purchased downloads retain account-owned unresolved date/amount readings, actual page/line source, uncertainty and incomplete checks. Nullable legacy printed fields remain compatible.

Validation: 5,385 regression assertions passed, zero failed/skipped; 61 deployed files verified with zero hash mismatches. Real served tesseract 5.3.4 freshly processed all seven fictional fixtures. Seven actual paid HTTP upload/evaluate/view/download journeys passed. The original five uploads intentionally reused the previously purchased stored extraction through their stable upload keys; current-release evaluation and output were rerun. Two statutory fixtures were freshly uploaded and extracted on this release. The clear bankruptcy date performs the applicable rule comparison; its blurred counterpart has no canonical date and no dependent comparison or finding. No probable finding was manufactured, and this does not close exception/finding blockers.

Stripe was reverified complete/paid/test with the matched APPLIED signed completion webhook, case binding and ACTIVE entitlement. Connected Chrome visibly confirms the unresolved date, owning account/bureau, source and affected checks. Payment secrets and hosted URLs remain private.

Evidence: `SOURCE_CAPTURES/INGEST-003-FINAL/` contains current field, paid HTTP, payment, served-release, regression, screenshot and strict release-check evidence. Active capability evidence: `accelerated-launch/service/out/gap-ingest-003-evidence.json`. The preceding OPEN evidence is preserved in `preceding-open-evidence.json`.

Rollback release: `crp-wizard-4f676b00426083f7`. Actual private-data snapshot: `/opt/crp-wizard-staging/backups/pre-gap-ingest-003-final-20261003-201155`. Production unchanged; billing remains test mode; launch readiness remains false. There are 24 launch-blocking checks, including stale prior-release evidence and unfinished requirements. Next substantive blocker: GAP-FINDING-001.

---

## Current payment and journey verification - October 3, 2026

**The existing Checkout is now PAID.** Connected Chrome showed the card fields after selecting the visible Card option. The existing CA$5.95 sandbox payment completed without a new session, manual entitlement or simulated billing event. Stripe reports `complete` / `paid` / `livemode:false`; the service has the exact matched applied signed completion webhook, correct case binding and ACTIVE entitlement.

All five fixtures (`control`, `degraded-date`, `degraded-amount`, `multi-bureau`, `conflict`) completed actual HTTP upload (201), assessment (201), result view (200) and purchased download (200). Persisted uploaded-file traces independently confirmed uncertain date/amount states, absence of their canonical facts, retention of independent facts, correct bureau ownership and both conflicting dates.

**GAP-INGEST-003 remains OPEN for consumer-output/assessment proof, rather than payment.** The degraded-date result API retains its unresolved source location, but purchased downloads omit account-specific OCR uncertainty for the degraded date and amount. Also, these five fixtures perform no statutory comparison even in the clear control, so they do not demonstrate suppression of an otherwise applicable legal finding. Do not treat zero findings in an inapplicable control as evidence of successful finding withholding.

Evidence: `SOURCE_CAPTURES/INGEST-003-COMPLETION/payment-verified-evidence.json`, `paid-http-journey-evidence.json`, `paid-field-trace-evidence.json`, `paid-http-results/`, `purchase-confirmed.png`, and `paid-release-check-final.json`. Earlier unpaid evidence is preserved as `pre-payment-gap-ingest-003-evidence.json` and `pre-payment-deployed-evidence.json`. Active strict evidence retains the exact three criterion keys, with the end-to-end criterion honestly failing on the remaining proof. Release check: 25 launch-blocking failures.

No runtime code changed or deployment occurred in this payment run. Served build remains `crp-wizard-4f676b00426083f7`, staging, test billing, not launch ready. Five files remain on the purchased case, leaving three slots. Production is unchanged. The historical unpaid diagnosis below is superseded.

---

## Historical unpaid verdict

**Verdict: OPEN (not closed).** The OCR confidence/trust/coordinate preservation and decisive-character
refusal are implemented and demonstrated on the served release `crp-wizard-4f676b00426083f7`, but the required
**fresh upload → assessment → consumer results → purchased download journey is incomplete**: the fresh
service-owned Checkout is unpaid and could not be completed programmatically. `ocr_confidence_preserved` and
`coordinates_preserved` pass; `end_to_end_journey` does not.

## The criterion

> Preserve OCR confidence, trust state, word/line coordinates and source evidence into field acceptance;
> uncertain critical characters cannot silently become resolved facts.

## What was implemented and demonstrated

- **Defect (demonstrated first):** field acceptance used only the line **mean** confidence. The real tesseract
  5.3.4 engine read a blurred decisive date `01/01/2021` at word confidence **40.11** while its line mean stayed
  **88.35 (trusted)**; a blurred amount `$1,240` was misread `$1.24¢` at **63.76** while its line stayed trusted.
- **Fix:** `ocr/local-ocr.cjs` `groupLines` now carries each word's own confidence, trust and character span plus
  the line `min_confidence`; `general-intake.cjs` `decisiveWordsTrusted` refuses a date/amount token whose own
  words are untrusted (`LOW_CONFIDENCE_OCR_READING_ON_DECISIVE_CHARACTERS`), and `lineLocation` records
  `min_confidence` beside the line mean.
- **Served-release behaviour (real engine, direct extraction/evaluation):** control resolves; degraded date
  refused (UNRESOLVED, location carries confidence 88.4 / min 40.11 / trusted / bbox); degraded amount refused
  (raw `$1.24¢` retained); multi-bureau attributes each account to its own bureau without borrowing; a new
  conflicting fixture (two `Account A` records with different dates) retains both readings without collapse.
- **Regression:** full suite **5,378 assertions passed, 0 failed**; focused `focused-ocr-confidence.cjs` → PASS 11.

## The 77.68 vs 88.4 line-confidence discrepancy (reconciled)

Earlier evidence reported the degraded-date line mean as **77.68** while the served field location reported
**88.4**. Root cause: the Python fixture generator grouped OCR words by tesseract TSV column 5 (`word_num`)
instead of the `block_num:par_num:line_num` key the service `groupLines` uses, mixing words from different
visual lines. Fixed: the generator now groups by `block:par:line`, matching the service. The corrected line is
`Account A Original Listing 01/01/2021 Balance $1,240` with mean **88.35** (the service rounds to one decimal,
**88.4**). The remaining 0.05 difference is one-vs-two-decimal rounding, a legitimate distinction, not a mismatch.

## The missing proof (precise remaining action)

The fresh service-owned, case-bound Checkout for case `case_f4b107cb7e445468c47cf5ca` is **UNPAID**
(entitlement `entitled:false`, 0 files). It could not be completed programmatically:

- Stripe suppresses the card form for automated browsers — Playwright (headless **and** headed Chrome) renders
  only `email`/`enableStripePass`/`link_pay_token` and no card-number/expiry/CVC fields; no `elements-inner-payment`
  iframe exists.
- The Stripe "Link CLI" path (`@stripe/link-cli`) requires human device approval (`auth login`), which is human
  interaction.
- The open Checkout Session has `payment_intent: null`, so there is no PaymentIntent to confirm via the Stripe API.

**Remaining action (human):** open the hosted Checkout URL (preserved in
`SOURCE_CAPTURES/INGEST-003-COMPLETION/fresh-checkout-private.json`) in a real Chrome window, enter test card
`4242 4242 4242 4242` (expiry `12/34`, any CVC), and click Pay. Then re-run the HTTP acceptance: upload the five
fixtures (`control`, `degraded-date`, `degraded-amount`, `multi-bureau`, `conflict`) through `/api/cases/:id/files`,
evaluate, inspect the consumer results, and obtain the purchased download, asserting the degraded fields are
withheld while independent checks remain. A redirect alone is not payment proof: verify the matched signed webhook
and entitlement.

## Evidence

`accelerated-launch/service/out/gap-ingest-003-evidence.json` carries exactly `ocr_confidence_preserved`
(pass), `coordinates_preserved` (pass) and `end_to_end_journey` (fail — blocked), with identity bound to
`crp-wizard-4f676b00426083f7`. The strict release check reports GAP-INGEST-003 **FAIL** with
`criterion end_to_end_journey did not pass`. No extraction-only evidence is substituted for the journey, and no
entitlement was manually granted.
