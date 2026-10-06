# OWNER-REPORT-USE-POLICY-001 — report-use consumer statements (evidence-policy amendment)

Date: October 4, 2026 (America/Halifax). Authority: explicit owner/architect authorization to let consumer
statements inform report-use exception evaluations for the existing admitted US rules.

## Scope (narrow and recorded)

A consumer's recorded statement about the USE of a particular credit report may inform the evaluation of a
report-use exception for the specific report/reporting event the statement names:

- 15 U.S.C. § 1681c(b) — the § 1681c(a)(1)–(5) prohibitions do not apply to a report used in connection with
  (1) a credit transaction of $150,000 or more, (2) life-insurance underwriting of $150,000 or more, or
  (3) employment at an annual salary of $75,000 or more.
- N.Y. Gen. Bus. Law § 380-j(f)(2) — the § 380-j(f)(1) retention periods do not apply to a report used in
  connection with (i) a credit transaction of a principal amount of $50,000 or more, (ii) life-insurance
  underwriting of a face amount of $50,000 or more, or (iii) employment at an annual salary of $25,000 or more.

The federal and New York thresholds DIFFER and are resolved per rule against that rule's own recorded threshold.

## What is authorized

- At most two simple, proactively selected questions: the report's use (purpose) and, only where the applicable
  rule's threshold makes it material, the amount/salary.
- Answers are stored separately as `CONSUMER_STATEMENT`, bound to the case/report, with a timestamp, this policy
  version, and the assessment they inform. They are never reused automatically for unrelated reports or later events.
- An exception is resolved only where the approved evidence supports it. Unknown, incomplete, contradictory,
  multiple-use or irrelevant answers remain UNRESOLVED and never become false.

## What is NOT authorized

- No new legal duty is invented; no consumer statement is treated as a bureau-reported fact.
- Unknown is never silently converted to false; thresholds are never inferred from account balances.
- Consumer answers alone never create a finding: the supported rule, decisive report facts, comparison and
  classification gates still govern.
- A consumer's personal disclosure/review is not treated as proof that the bureau had no other relevant use.
- No blanket enablement of packet, dispatch or other permissions.

Machine-readable identity: `accelerated-launch/service/report-use-policy.json` (policy_id
`OWNER-REPORT-USE-POLICY-001`, version `1.0`). Historical artifacts are preserved; unrelated safeguards remain.
