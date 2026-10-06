# CRP-FINDING-CANDIDATE-002 — Nova Scotia judgment-content omission (bounded admission proposal)

Prepared October 4, 2026 (America/Halifax). This is a **reviewable admission proposal**; no rule is admitted, no
finding/packet permission is changed, and no classification changes until architect review. It supersedes the
CA-NS bankruptcy finding-class proposal in `CRP_FINDING_CANDIDATE_001_CA_NS_BANKRUPTCY.md`, which is withdrawn
(see the correction note in §9).

## 1. Citation reconciliation (concrete conflict resolved from official sources)

The two official Nova Scotia legislature sources were retrieved and read locally:

- **`consumer reporting.pdf`** (the current consolidation): header reads **"CHAPTER 93 OF THE REVISED STATUTES,
  1989"**, dated **October 11, 2018**, amended `1999 c.4 ss.10-16; 2010 c.47; 2014 c.39 ss.4,5; 2017 c.9 ss.14-31;
  2018 c.43 ss.13-16`. The judgment-content limb is in **s.10(3)(d)**.
- **`Con-Cr Volume.pdf`** (the 2023 Revision): re-consolidates the Act as **CHAPTER C-53** and re-numbers the
  "Reporting" section from s.10 to **s.12**, so the judgment-content limb is at **s.12(3)(e)** there. It retains
  the historical annotation "`R.S., c.93, s.10; 2018, c.43, s.13`".

**Resolution of the recorded conflict:**

| Citation | Where it appears | Verdict |
| --- | --- | --- |
| `R.S.N.S. 1989, c. 93, s. 10(3)(c)/(e)` | the admitted adapters | **correct** for the in-force edition |
| `c. 89, s. 11(3)` | PHASE5-001C owner amendment | **incorrect** (wrong chapter and section; s.11 is "Consent and notice") |

The applicable chapter is **c. 93**; "c. 89" is a typo, and "s. 11(3)" names the wrong section (s.11 is "Consent
and notice", not "Reporting").

**Applicable edition / commencement:** the in-force edition is **R.S.N.S. 1989, c. 93** (consolidated to 2018).
The **2023 Revision** (c. C-53) re-numbers, but its **commencement is UNVERIFIED** — publication of a
revised volume does not by itself bring it into force, and no official proclamation/commencement evidence was
retrieved. The applicable mapping is **s.10(3)** under the in-force edition, with **s.12(3)** recorded only as the
commencement-unverified 2023 re-numbering:

| Limb (content) | R.S.N.S. 1989 c.93 (in force) | 2023 Revision c. C-53 (commencement unverified) |
| --- | --- | --- |
| debt retention 6y | s.10(3)(c) | s.12(3)(c) |
| judgment retention 6y (unpaid confirmation) | s.10(3)(ca) | s.12(3)(d) |
| **judgment content (name / address / amount / assignee)** | **s.10(3)(d)** | **s.12(3)(e)** |
| bankruptcy 6y (unless bankrupt more than once) | s.10(3)(e) | s.12(3)(g) |

## 2. The judgment-content requirement (exact text)

s.10(3) opens "A consumer reporting agency shall not include in a consumer report", and limb (d) reads:

> "(d) information as to any judgment against the consumer unless mention is made of the name and, where
> available, the address of the judgment creditor as given at the date of entry of the judgment and the amount
> or, where the judgment is known to have been assigned, where available, the name and address of the assignee;"

This is a **report-content omission** requirement (non-retention): a judgment may only be reported when it
carries its mandatory content.

## 3. Exact authority / version, addressee, jurisdiction

- **Authority:** Consumer Reporting Act (Nova Scotia), R.S.N.S. 1989, c. 93, s. 10(3)(d) (in force);
  re-numbered s.12(3)(e) in the not-yet-commenced 2023 Revision (c. C-53).
- **Addressee:** "a consumer reporting agency" (a report-content obligation on the furnishing agency) — **not** a
  bureau-conduct duty, so it is determinable from the report.
- **Jurisdiction:** exact `CA-NS` only.

## 4. Trigger and mandatory versus conditional contents

- **Trigger:** a judgment against the consumer is printed in the consumer report.
- **Mandatory contents (a verified absence is a violation):**
  1. the **name** of the judgment creditor; and
  2. the **amount** of the judgment.
- **Conditional contents (never a finding; they depend on facts outside the report):**
  1. the creditor **address** — required only "**where available**" ("as given at the date of entry");
  2. the **assignee name/address** — required only "where the judgment is **known to have been assigned**" and
     "where available".

"Do not infer that a conditionally required address was available": the absence of an address can never establish
non-compliance, because the report cannot show whether the address was available in the agency's files.

## 5. Ceiling, assignment alternative (unresolved), and presentation route

- **Ceiling:** `VIOLATION` when a judgment is positively printed and one or both **mandatory** contents (creditor
  name, amount) are verified absent. No `PROBABLE_VIOLATION` is proposed, and no finding is proposed for a
  missing conditional address or assignee.
- **The assignment alternative stays UNRESOLVED (requirement 4):** the "or" branch (assignee name/address)
  applies only "where the judgment is **known to have been assigned**" and "where available" — both off-report.
  An assignee label+value is recorded as `ASSIGNED`; its absence is recorded as `UNRESOLVED`, never inferred as
  "not assigned". Because the creditor branch requires the off-report fact "not assigned", no omission finding is
  sound from report evidence alone, and the classifier refuses the unresolved assignment disposition.
- **Presentation route RESOLVED (requirement 3):** the judgment-content structure is carried by the authorized
  `GENERAL-BUREAU-REPORT` intake (bureau-agnostic, reads judgment public records), not by the PR-01 debt/collection
  specimen which prints no judgment. The adapter is bound to `GENERAL-BUREAU-REPORT`; this is a separate route,
  never a PR-01 widening and never a new bureau-family admission.
- **Permission:** the rule adapter (`CA-NS-CRA-S10-3-D-JUDGMENT-CONTENT`) is implemented with
  `finding_allowed: **false**` and the ceiling `observation`, pending the two **legal** gates in §8 (assignment
  alternative off-report; edition currency unaffirmed). The extraction and evaluation path is complete and tested
  (`bh-ns-judgment-content`, 32 assertions); the finding permission stays disabled.

## 6. Decisive evidence: verified printed omission vs extraction failure

The finding must be gated on **positive** evidence:

- **Verified printed omission (finding):** the extraction positively identifies a judgment record (e.g. a public
  record entry labelled "Judgment" with a case/docket reference) whose entry contains **no creditor name and/or
  no amount**.
- **Extraction failure (NOT a finding):** the name/amount is printed but the parser could not read it (e.g.
  OCR/encoding uncertainty). This must be reported as an extraction-limitation, never promoted to a finding.
- **Incomplete page / inaccessible region (NOT a finding):** the judgment appears on a page that is incomplete,
  truncated or otherwise not fully readable.
- **Duty outside the report (NOT a finding):** the conditional address and the assignee identity (which require
  the agency's files or knowledge of assignment).

## 7. Extraction / evaluation entry points and fixtures

- **Extraction (corrected):** judgment-content presence is **field-value evidence**, never label presence. A
  field is PRESENT only when its label carries a non-blank VALUE (`Creditor: ABC`); a blank label (`Creditor:`)
  is not a name; an unlabelled value is never a verified omission. The amount is PRESENT only for a
  judgment-amount label (`Amount:` / `Award:`) with a monetary value (zero included); a dollar amount elsewhere
  (court costs, fees) is not the judgment amount. Conflicts and unsupported representations are UNRESOLVED.
  Completeness is POSITIVE: trusted lines, a recognised judgment identity, no truncation marker and no dangling
  field label — absence of a continuation marker does NOT prove completeness. Multi-line entries, supported
  continuations, page/line locations and public-record identity are captured; cross-judgment borrowing is
  prevented by per-record identity.
- **Evaluation:** a new report-content check (`CONTENT_OMISSION`) with per-predicate provenance — positive
  judgment identity, creditor-name state, amount state, assignment-alternative disposition and entry
  completeness, each source-linked. The classifier refuses missing, mismatched or unresolved evidence; there is
  no fabricated resolved reference date and no bare breach boolean. The existing `evaluation.cjs` /
  `rule-adapters.cjs` result pipeline is reused; no second evaluator.

- **Positive fixture (amount omitted, complete):** a complete judgment prints a creditor name but no amount and no
  monetary value → the amount is `VERIFIED_ABSENT` (the rule-level breach still requires the off-report
  assignment disposition, so no finding).
- **Negative fixture (blank label):** `Creditor:` with no value → `UNRESOLVED` (a blank label is not a name).
- **Negative fixture (unlabelled):** a name printed without a label → `UNRESOLVED` (never a verified omission).
- **Negative fixture (zero):** `Amount: $0.00` → `PRESENT` (zero is an amount, not missing).
- **Negative fixture (unrelated amount):** `Court costs: $500` without an amount label → `UNRESOLVED`.
- **Negative fixture (truncation / dangling label):** a continuation marker or a label-without-value at the end →
  incomplete → `UNRESOLVED`, never `VERIFIED_ABSENT`.
- **Negative fixture (assignment):** `Assignee: XYZ` → `ASSIGNED` (the assignment alternative applies; no
  creditor-omission).
- **Negative fixture (no judgment):** no judgment record → not applicable.
- **Negative fixture (multiple judgments):** two judgments keep their own content (no cross-borrowing).

## 8. Decision status (resolved vs still blocked)

1. **New rule admission — DONE.** The rule adapter `CA-NS-CRA-S10-3-D-JUDGMENT-CONTENT` is implemented in
   `adapter-configs.json` / `rule-adapters.cjs` (source entry `CRP-LSRC-0354`, `rules.canada.ts` artifact), with a
   dedicated `CONTENT_OMISSION` evaluation path, per-predicate provenance and rendering. It records exact CA-NS
   applicability, the s.10(3)(d) citation, the mandatory name+amount / conditional address+assignee split,
   `packet_eligible: false`, and the `JUDGMENT_PUBLIC_RECORD_PRESENT` applicability rule.
2. **Extraction — DONE (field-value evidence).** `judgmentContentEvidence` (PRESENT / VERIFIED_ABSENT /
   UNRESOLVED) is field-value based, with positive completeness (trusted lines, judgment identity, no truncation,
   no dangling label), multi-line capture and per-record isolation. Exercised end-to-end on a fictional CA
   judgment report (`bh-ns-judgment-content`, 32 assertions).
3. **Citation/commencement — "commencement unverified".** The in-force edition is R.S.N.S. 1989, c. 93,
   s. 10(3)(d); the 2023 Revision re-numbers to c. C-53, s. 12(3)(e) with **commencement unverified**. Edition
   currency has no affirmative proclamation evidence — "no proclamation retrieved" is not itself proof the older
   edition is current, so currency is recorded honestly as UNRESOLVED (a remaining legal decision).
4. **Presentation route — RESOLVED.** The judgment structure is carried by the authorized `GENERAL-BUREAU-REPORT`
   intake (no new bureau-family admission, no PR-01 widening).
5. **Assignment alternative — REMAINS UNRESOLVED (legal).** The "known to have been assigned" + "where available"
   conditions are off-report; absence of an assignment label does not establish the creditor branch, so no
   omission finding is sound from report evidence alone. This, together with edition currency, keeps
   `finding_allowed` false and the ceiling observation.

## 9. Correction of the withdrawn CA-NS bankruptcy candidate

`CRP_FINDING_CANDIDATE_001_CA_NS_BANKRUPTCY.md` is **withdrawn**. Its §8 called the bankruptcy finding-class
flip "the single highest-leverage move" and implied it would "convert 1 of the 13 CA regions to demonstrated
[coverage]". That is **unsupported**: the unresolved second-bankruptcy exception (`s.10(3)(e)` "unless he has been
bankrupt more than once") means the finding cannot be demonstrated, so flipping `finding_allowed` would add no
demonstrated finding jurisdiction. Those claims are corrected here; the bankruptcy rule remains observation-only.

## 10. Status (kept separate)

- **Implementation:** the rule is **implemented** (adapter + verified-omission evaluation with per-predicate
  provenance + rendering) and tested end-to-end (`bh-ns-judgment-content`, 32 assertions), but the **finding
  permission is disabled** (`finding_allowed: false`, ceiling `observation`) because the two **legal** gates in §8
  remain open: the off-report assignment alternative and the unaffirmed edition currency. This is not a live
  finding, and no coverage is claimed from it.
- **Staging / production:** unchanged and pending; not launch ready. Real-browser verification remains separately
  PENDING (unavailable: no automation driver/CDP client).
- **Blocker status:** BLOCKER-FINDING-COVERAGE-001 (9/82), BLOCKER-ALL82-FACILITATION-001,
  BLOCKER-DISPUTE-PACKET-001 and BLOCKER-SUBSCRIPTION-VALUE-001 remain OPEN. No packet, deployment, billing,
  provider, external, private-report or legacy changes were made.

