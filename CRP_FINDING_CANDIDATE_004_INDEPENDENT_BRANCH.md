# CRP Finding Candidate 004 — Independent non-NS report-content branch (readiness scan)

**Status:** Returned as a ranked decision table — no non-NS report-content candidate is ready to enable. Each
candidate's first blocker is named precisely; no abstract blanket interpretation is requested or inferred.
**Scope:** One genuinely independent (non-NS) report-determinable core candidate, reusing the completed
field-value/label evidence mechanism, per the architect directive (2026-10-04).

## Ranked decision table

| Rank | Rule | First blocker | Recommended disposition |
| --- | --- | --- | --- |
| 1 | N.Y. Gen. Bus. Law § 380-j(a)(3) — medical-debt prohibition | Two unresolved points: (a) the § 380-a(v) credit-card carve-out is off-report, and (b) federal preemption under 15 U.S.C. § 1681t(b)(1)(E) is recorded `uncertain_not_decided`. | Return as PROBABLE_CANDIDATE only; keep `finding_allowed` disabled until the carve-out and preemption are recorded by owner decision. |
| 2 | Cal. Civ. Code § 1785.13(a)(7) — medical information | The § 1785.3(j) scope question (whether a medical debt is "medical information") is recorded unresolved and not decided. | Same: record the scope decision before admission; do not decide by configuration. |
| 3 | Wash. Rev. Code § 19.182.040(1)(g) — medical information | The incorporated RCW 19.16.100 definition scope is recorded unresolved. | Same: record the scope decision; PROBABLE_CANDIDATE ceiling only. |

## Exact accepted text and records

**NY § 380-j(a)(3)** (digest-bound admitted baseline `rules.ny.ts`, row `us-ny.gbl.380j.a.3.medical_debt_prohibited`,
SHA-256 `201F5035084F60C92B03E0140E32702ED72E79AD2CEE31405977E05525133590`):
> No consumer reporting agency shall report or maintain in the file on a consumer information relative to a medical
> debt as defined in § 380-a(v) — any obligation or alleged obligation of a consumer to pay any amount related to the
> receipt of health care services, products or devices provided by a hospital licensed under public health law
> article 28, a health care professional authorised under education law title 8, or an ambulance service certified
> under public health law article 30, excluding debt charged to a credit card unless the card is issued under a plan
> offered specifically for the payment of health care.

- **Report representation:** an explicit bureau label/description identifying the item as medical debt.
- **Unresolved exception:** the § 380-a(v) credit-card carve-out (charged to a credit card / healthcare-specific
  plan) — unknown stays unresolved, never suppresses by inference.
- **Applicability/preemption:** `POTENTIALLY_APPLICABLE_UNRESOLVED_PREEMPTION` — 15 U.S.C. § 1681t(b)(1)(E) status
  `uncertain_not_decided`.
- **Disposition:** PROBABLE_CANDIDATE ceiling; no governed rule or finding without the two owner decisions above.
  Full record: `CRP-DISC-002C-NY-0194.md`.

**CA § 1785.13(a)(7)** — report-only classification under PHASE4-002I-B14-R1; an explicit bureau label/description
of medical debt is the representation, but the § 1785.3(j) scope question remains visible and unresolved. The
decision is limited to § 1785.13(a)(7) and does not extend to § 1785.27.

**WA RCW 19.182.040(1)(g)** — report-only classification under PHASE4-002I-B12-R2; an explicit bureau
label/description may support a PROBABLE_CANDIDATE, but the RCW 19.16.100 definition scope question remains
unresolved and the decision is limited to this provision.

## Conclusion

None of the three is ready for a governed, finding-enabled rule. Each reuses the same "report-printed
label/description" evidence mechanism, but every one has an unresolved exception/scope/preemption that cannot be
resolved by configuration. They are returned with their exact first blocker; no rule is invented or admitted here,
and no coverage is claimed.
