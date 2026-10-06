# CRP Finding Candidate 007 — Remaining branches (B: CA adverse-information; C: AU new-arrangement)

**Status: CLOSED (2026-10-04, corrective disposition recorded).** B is FAIL CLOSED — the California § 1785.13(a)(8)
adapter stays `finding_allowed: false` (finding permission disabled) behind the tri-state `ADVERSE_RATING_ACTION_CONTEXT`
gate; it is not re-enabled and must not be reopened without new evidence establishing event-date applicability or the
(b) delinquency-based timing. C is CLOSED for this bounded attempt — the official § 6S and § 20W items 6/7 were
retrieved and captured with digests, the grouped item-6/item-7 start was corrected in the derived mapping, and the
presentation search is complete; extraction/coverage stay pending and the search is not repeated without new evidence.

## B. California § 1785.13(a)(8) — fail closed (adverse account rating)

**Precise supported adverse event:** the record's own printed delinquency rating "NN days past due as of Mon YYYY"
(`reportedAccount.adverseRatingDate`).

**Accepted authority for its timing (official, leginfo.legislature.ca.gov, Civ. Code § 1785.13, Stats. 2024 Ch. 520
SB 1061):**
- "(a)(8) Any other adverse information that antedates the report by more than seven years."
- "(b) The seven-year period specified in paragraphs (5) and (8) of subdivision (a) shall commence to run, with
  respect to any account that is placed for collection (internally or by referral to a third party, whichever is
  earlier), charged to profit and loss, **or subjected to any similar action**, upon the expiration of the 180-day
  period beginning on the date of the commencement of the delinquency that immediately preceded the collection
  activity, charge to profit and loss, or similar action."

**Corrective disposition (OWNER-CANDIDATE-007 correction):** the previous build enabled `finding_allowed: true` for
this adapter. That is reversed: `finding_allowed` is now **false** (`max_conclusion: observation`), so the adapter
emits NO finding even when the period is exceeded and the facts are source-linked. Direct adapter invocation does not
bypass the gate (the classifier refuses at `classify`).

**Explicit tri-state account/action context (with source provenance) — `reportedAccount.accountActionContext`:**
1. **ESTABLISHED (b) CONTEXT** (`COLLECTION_OR_CHARGE_OFF`, set from the record's own COLLECTION / CHARGE-OFF /
   PLACED FOR COLLECTION wording) → the (a)(5) collection branch governs with delinquency-based timing + the 180-day
   offset; this branch is NOT_APPLICABLE.
2. **ESTABLISHED SUPPORTED EVENT-DATE CONTEXT** (`EVENT_DATE_SUPPORTED`) → event-date timing (no offset). **NO
   admitted evidence basis produces this state yet**, so it is unreachable and this branch is never APPLICABLE today.
3. **UNKNOWN / CONFLICTING / UNSUPPORTED** (default; includes an unlabelled "similar action" — repossession,
   foreclosure, write-off — whose legal meaning this build does NOT assign) → APPLICABILITY_UNRESOLVED, no finding.

**Refusal boundaries exercised** (`bk-us-ca-adverse-rating.cjs`, 22 assertions): fail-closed adapter (no finding even
with source-linked period-exceeded facts), wrong jurisdiction, the three applicability states, bare "days past due"
extraction (no context), collection extraction (`COLLECTION_OR_CHARGE_OFF`), repossession/foreclosure/write-off stay
UNKNOWN (not assigned "similar action" meaning), cross-account context is not borrowed, and the bare-account
end-to-end upload emits NO (a)(8) finding.

**Evidence / legal decision required to enable B (exact):** an admitted, report-evidenced basis that establishes the
account/action context is `EVENT_DATE_SUPPORTED` (the account was NOT placed for collection, charged off, or subjected
to a similar action) — with source provenance — or, for a collection/charge-off/similar account, the (b) delinquency
commencement that the (a)(5) branch already requires. Until one is admitted, the branch stays observation-only.

## C. Australian § 20W items 6/7 — source bodies retrieved; limbs verified separately

**Retrieved and captured** (official Federal Register of Legislation): `SOURCE_CAPTURES/PHASE5-001G/PA1988-s6S-s20W-extracted.txt`,
from compilation `C2026C00227` dated **2026-06-04** (latest), downloaded from the FRL EPUB
(`https://www.legislation.gov.au/C2004A03712/2026-06-04/2026-06-04/text/original/epub/OEBPS/document_1/document_1.html`).
Source digests: FRL EPUB `document_1.html` sha256 `6d0a43e5da103d1eeb5317ae9ac213c5b51acab2357dc01b981a91e1052c5c3b`;
extracted § 6S + § 20W text sha256 `23fb5774ec89252ab443bb7a1a14fef394042d53547906f04110e6a94563ff45`.

**§ 6S "Meaning of new arrangement information" (verbatim):**
- **6S(1) Consumer credit defaults** — if a credit provider has disclosed default information about an individual to
  a credit reporting body, the default relates to a payment the individual is overdue in making in relation to
  consumer credit (the "original consumer credit"), and, because of the individual being so overdue, either the
  repayment terms/conditions of the original credit are varied, or the individual is provided with other consumer
  credit (the "new consumer credit") that relates wholly or in part to that amount — **then new arrangement
  information is a statement that those terms/conditions have been varied, or that the individual has been provided
  with the new consumer credit.**
- **6S(2) Serious credit infringements** — the same "varied terms / provided new credit" statement, but triggered by
  a credit provider's disclosed opinion that the individual committed a **serious credit infringement** (rather than
  a default).

**§ 20W table, items 6 and 7 (verbatim, separately):**
- **Item 6** — "new arrangement information within the meaning of subsection 6S(1)" → "the period of 2 years that
  starts on the day on which the credit reporting body collects **the default information** referred to in that
  subsection."
- **Item 7** — "new arrangement information within the meaning of subsection 6S(2)" → "the period of 2 years that
  starts on the day on which the credit reporting body collects **the information about the opinion** referred to in
  that subsection."

**Correction to the grouped corpus row:** `CRP-LSRC-0425` recorded both limbs as one ("s. 20W table, items 6 and 7 …
start = the day the related default information was collected"). That start is correct for item 6 but **incorrect for
item 7** — item 7 runs from collection of the **serious-credit-infringement opinion**, not the default information.
The limbs are now recorded separately above.

**Public presentation search (bounded, authorized):** the OAIC public guide "What stays on a credit report?"
(oaic.gov.au) lists retention for default (5y), serious credit infringement (7y), repayment history (2y), etc., but
lists **no "new arrangement information" row**; the admitted AU family (`au-equifax-consumer.cjs`, PUB-012) prints
only "Loan Repayment Arrangement" (a repayment plan) and no § 6S "new arrangement" (varied terms / new credit)
entry; the Equifax AU "understanding your credit report" page returned 404.

**First blocker (exact):** the § 6S "new arrangement" item is a **statement that repayment terms were varied or that
new consumer credit was provided after a default (6S(1)) or a serious-credit-infringement opinion (6S(2))** — no
admitted or located public AU report sample prints such an entry with its own event date and its association to the
default (item 6) or the serious-credit-infringement opinion (item 7). Without that report-evidenced structure, the
covered information, the arrangement event and the statutory start cannot be field-evidenced, so extraction is not
built. Do not infer a new arrangement from settlement, payment, closed status or a generic update.

