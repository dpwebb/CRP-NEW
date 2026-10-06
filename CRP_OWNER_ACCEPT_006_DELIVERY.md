# OWNER-ACCEPT-006 — delivery record

Issued October 2, 2026, America/Halifax. Production unchanged; Stripe remains test mode.

## 1–2. Substantive content assessments implemented (deployed `crp-wizard-a7da58cc225734af`)

Three statutory CONTENT assessments are now implemented end-to-end (extraction → evaluation → plain-language result),
not mapping-only:

| Check | Legal predicate | Required fact (marker) | Exceptions / conditions |
| --- | --- | --- | --- |
| `FCRA-605A6-US-NATIONAL-MEDICAL-INFO` | FCRA § 605(a)(6) — 15 U.S.C. § 1681c(a)(6) | `medical_information` | § 1681b(g) consent and other exceptions (off-report) |
| `FCRA-605A-US-NATIONAL-FRAUD-ALERT-SECURITY-FREEZE` | FCRA § 605A — 15 U.S.C. § 1681c-1 | `fraud_alert`, `security_freeze` | alert/freeze placement (off-report condition) |
| `FCRA-605F-US-NATIONAL-DISPUTE-NOTATION` | FCRA § 605(f) — 15 U.S.C. § 1681c(f) | `dispute` | dispute initiation (off-report condition) |

Each is a **qualified observation**: its exception/condition is off-report and unresolved, so a marker present yields
`OBSERVED` with `classification: null` (never a `VIOLATION`). Required facts are extracted as `content_markers` by
the general intake; the legal meaning is decided only by the content-assessment rules. Content checks are US-only and
surfaced as their own `CONTENT_ASSESSMENT` group in the consumer result. Multiple source records supporting one check
are one check, not multiple.

## 3. NY / CA / AU finding rules reviewed against exceptions

The activated NY (`§ 380-j(f)(1)(i)/(ii)/(iii)`), CA (`§ 1785.13(a)(1)`) and AU (`s. 20W` items 1/3/4) retention rules
were re-checked against their admitted text. The only recorded qualification is the NY judgment "satisfied within five
years" condition (already modeled as `condition_field`); no § 1681c(b)-style cross-referenced exemption is recorded in
their admitted text (unlike FCRA § 1681c(a) → (b)). Each carries a rule-specific source reference rather than a blanket
"no exception" statement. These rules continue to derive `VIOLATION` on a resolved breach.

## 4. Demonstrations

`ag-accept-006` (12 assertions): qualifying (medical, fraud alert/security freeze, dispute), non-qualifying (clean
report), equivalent-layout ("health care", "consumer disputes"), insufficient-fact (empty marker set), and US-only
reach. Deployed Linux verification confirmed `FCRA-605A6…=OBSERVED` on a synthetic report printing medical debt.

## 5. Paid journey — browser handoff (item open)

I lack interactive browser access, so I cannot complete a fresh hosted Stripe Checkout (enter the test card `4242…` on
Stripe's hosted page) this batch. The exact handoff needed:

1. On the deployed build, open a Checkout (`POST /api/accounts`, then `POST /api/billing/checkout` with
   `plan_code: report_once` and `return_url: https://staging.creditregulatorpro.com/?checkout=success`) — the full
   hosted URL is returned intact (verified: 443 chars, `https://checkout.stripe.com/c/pay/…`).
2. In a browser, complete the hosted Checkout with test card `4242 4242 4242 4242`, any future expiry/CVC.
3. Stripe then posts `checkout.session.completed` to the service's webhook; the service verifies the signature and
   re-fetches the session server-side, granting entitlement.
4. Upload a report, assess, download twice (both HTTP 200, identical content hash), and confirm an unpurchased case is
   denied (HTTP 402).

The signed-webhook → entitlement → download path is already proven on a prior build by
`accelerated-launch/service/out/b5-paid-download-verification.json` (download 200, 3 checks, content hash), and the
hosted Checkout URL generation is proven intact this batch. This item stays OPEN until the fresh hosted completion is
recorded on `crp-wizard-a7da58cc225734af`; no payment evidence is fabricated and no live charge is made.

## 6. Register and all-82 detail table

The acceptance register now separates **working content checks** (3 US content assessments) and their jurisdiction
coverage (US) from mapped source records (27/148/51/29), test assertions (4,952), and upload counts. Generated
capability counts are labelled, not treated as deployed acceptance evidence.

Regression: **4,952 assertions passed, 0 failed, 0 skipped**. Rollback target `crp-wizard-4b0d1f931a0e5f8f`.
