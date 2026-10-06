# ACCEPT-002 — Core assessment implementation and acceptance

Authority: continuation of the approved all-82 implementation and acceptance program, following
OWNER-EVIDENCE-001, October 2 2026 (America/Halifax). Workspace `C:\CRP-NEW`; legacy checkout read-only.

## 1. Reported-fact policy enforcement completed

- The policy digest is no longer self-computed: `reported-fact-policy.approval.json` pins the owner-approved
  `policy_id`, `version` and `approved_digest` (`d48e4633…`). `loadPolicy()` now refuses on any id/version/digest
  mismatch and on a missing approval record, so an altered policy cannot initialize an assessment and cannot
  enter a release unobserved. `reported-fact-policy.cjs` and `.json` are preserved as released v1.0 bytes.
- Contradiction detection is now scoped to the **same identified record**. Two separate bankruptcies with
  different discharge dates keep their own dates (repeat-bankruptcy evidence is preserved for the rule's
  exception analysis); a single record printing two incompatible values is withheld.

## 2. Blanket NOT_REPORT_EVIDENCED un-blanketed

Six withheld public-record limbs were reassessed individually and now anchor on a clearly labelled legal-event
date accepted under OWNER-EVIDENCE-001. A filing or update date is never substituted, a neighbouring date is
never borrowed, and each runs only on a `GENERAL_PUBLIC_RECORD` entry.

| Check | New anchor |
| --- | --- |
| FCRA-605A-1-US-NATIONAL-10Y | `bankruptcyOrderForReliefDate` / `bankruptcyAdjudicationDate` (priority chain) |
| FCRA-605A-2-US-NATIONAL-7Y | `judgmentEntryDate` (the "statute of limitations if longer" alternative stays a named unresolved computation) |
| FCRA-605A-3-US-NATIONAL-7Y | `taxLienPaidDate` |
| US-NY-GBL-380J-F1-I-BANKRUPTCY-14Y | `bankruptcyAdjudicationDate` |
| US-NY-GBL-380J-F1-III-TAX-LIEN-PAID-7Y | `taxLienPaidDate` |
| US-CA-CCRAA-1785-13-A-1-BANKRUPTCY-10Y | `bankruptcyOrderForReliefDate` |

Still withheld, with their precise reasons recorded:

- **FCRA-605A-4-US-NATIONAL-7Y** — the delinquency preceding collection is moved by the FCRA § 605(c)(1)
  180-day rule, a separate legal computation not implemented.
- **US-NY-GBL-380J-F1-II-JUDGMENT-5Y** — the "satisfied within five years of entry" condition is a separate
  fact a single printed date does not establish.

A new applicability rule `PUBLIC_RECORD_RECORD_PRESENT` resolves these limbs per record from the entry's own
public-record kind on the general intake.

## 3. Classification

No global `finding_allowed` flip and no relaxation of `CRP_LEGAL_INVARIANT.md`. Every adapter still records
`finding_allowed: false`, `packet_eligible: false`, ceiling `observation`. Elapsed periods remain arithmetic
comparisons, never findings. A concise owner-decision list is at the end.

## 4. Consumer outcomes proven

`ad-legal-event-facts` (19 assertions) demonstrates, for each reassessed check: exceeded, not-exceeded, a
filing date not substituted (UNRESOLVED, never aged), an equivalent layout, and a same-record contradiction
withheld. `ac-evidence-policy` (46 assertions) proves the policy approval binding and the corrected
contradiction scope.

## 5. Validation

`node accelerated-launch/service/tests/run-tests.cjs` → **4,879 assertions passed, 0 failed, 0 skipped**.

## 6. Owner decisions requested (do not block on these)

1. Whether the FCRA § 605(a)(2) "statute of limitations if longer" alternative should be computed (requires a
   per-jurisdiction limitation-period table), or the 7-year minimum alone is the accepted surface.
2. Whether to implement FCRA § 605(c)(1)'s 180-day rule so the collection limb can anchor on a printed
   "date of first delinquency".
3. Whether the US-NY satisfied-judgment limb should anchor on the entry date with a separate satisfaction
   fact, or remain withheld.
4. Whether any per-rule `finding_allowed`/classification permission change is authorized for the reassessed
   limbs (the invariant's safeguards are preserved; no change is made here).

## Boundaries

Production unchanged; Stripe in test mode; consumer data private; no private report egress; the CA-NS
exact-specimen PR-01 ceiling is preserved; no GB statutory acceptance is claimed.
