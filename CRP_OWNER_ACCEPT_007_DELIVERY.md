# OWNER-ACCEPT-007 — delivery record

Issued October 2, 2026, America/Halifax. Production unchanged; Stripe remains test mode. OWNER-ACCEPT-006
remains partially complete; this delivery corrects its content-assessment semantics.

## 1. Corrected content-assessments.cjs (deployed `crp-wizard-8f43270bdcad6d24`)

The medical proposition no longer asserts "a consumer report must not contain medical information". The correct
recorded requirement is:

> A consumer reporting agency may furnish a report containing medical information to a third party for credit,
> insurance or employment only with the consumer's consent; the consumer's own file disclosure is not restricted.

A medical entry on the consumer's own report is therefore **not inherently improper**. The controlling condition
(furnishing purpose + consent) is off-report and recorded as such.

## 2. Markers separated from predicates

The former "content assessments" are renamed **DETECTED REPORT INFORMATION** (extraction), class
`DETECTED_REPORT_INFORMATION`. Keyword detection (medical, fraud alert, security freeze, dispute) is extraction
and is counted as detection, not as statutory compliance evaluation. The actual statutory requirement is carried
as an `off_report` legal dependency — informative, not evaluated.

## 3. Source evidence preserved

Each marker now records its exact text, page, line and source, and is classified as **record content** versus
**boilerplate/rights notice/guide** (`classifyLineContext`). Absence of a keyword is explicitly stated not to
prove that a feature is absent or that an obligation was breached.

## 4. Report-observable predicates

The genuinely report-observable statutory predicates remain the retention-period rules (already implemented, with
their off-report exceptions). The medical/fraud-alert/freeze/dispute rules have off-report conditions and are
recorded as off-report dependencies, not forced into report-only findings.

## 5. Tests, coverage and register corrected

`ag-accept-006` (16 assertions) now verifies the corrected medical proposition, the consumer-vs-third-party
distinction, source-evidence/context separation, that absence is not proof, that the class is
`DETECTED_REPORT_INFORMATION` (not `CONTENT_ASSESSMENT`), and that detection is country-agnostic extraction while
the legal dependency names US FCRA. Regression: **4,956 assertions passed, 0 failed, 0 skipped**.

## Paid journey (item still open)

Unchanged: the fresh hosted Stripe Checkout and subsequent download remain open until actually completed in a
browser; earlier-build evidence is not substituted. The exact handoff is unchanged from
`CRP_OWNER_ACCEPT_006_DELIVERY.md`.
