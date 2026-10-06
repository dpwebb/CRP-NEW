# Packet correspondence, one AU field improvement, and a Canadian candidate (CRP-RECON-006)

Date: October 5, 2026 (America/Halifax). Sources: `accelerated-launch/service/packets.cjs`,
`CRP_OWNER_DISPUTE_PACKET_READINESS_BLOCKER_001.md`, `SOURCE_CAPTURES/PHASE5-001O/source_id_coverage_ledger.json`,
`SOURCE_CAPTURES/REPORT_FORMAT_BASELINE_2026-09-30/PUB-012.pdf`, and reproduced local measurements.

## 1. The correspondence statement is corrected

The previous record said no correspondence is required because this service sends nothing. That is wrong. **CRP does
not transmit, but the CONSUMER sends the packet**, so the packet must contain usable verification/correction
correspondence with organized evidence. The owner directive is explicit: `usable_download` requires "the applicable
correspondence and organized evidence references or attachments", `consumer_review` requires the consumer to be able
to "supply necessary correspondence details", and `packet_scope` requires the "recipient types" to be identified.

## 2. The actual downloaded packet, measured against that specification

A reproduced download (a CA-ON case, one ordinary account with opened 01/01/2020 and closed 01/01/2019) is 3,604
characters as recorded by the `cc-ca-on-ordinary-report` section's own measured evidence, and it contains exactly: a
title, the report identity, the approved-version hash, the selected-issue count, the issue with its record, its
printed facts (raw + page/line + normalization), its explanation, its uncertainty, its `Request (verification)` line
and the second base it rests on (`Also rests on: what the report prints — an account with contradictory dates`), an
optional free-text "YOUR OWN WORDS" block, and a footer. Measured against the specification:

| Required by the accepted specification | Present in the actual packet |
|---|---|
| the selected issue and its request wording | **yes** — the issue, its classification and the request line |
| evidence references | **partly** — the printed facts are stated inline per issue with page/line, but there is no organized evidence-reference section |
| readable output | **yes** — no raw debug dump; the approved-version hash is a legitimate integrity binding |
| output corresponds to the reviewed selection | **yes** — it is bound to the approved version |
| recipient type (`packet_scope`) | **no** — the document never states who it is addressed to |
| necessary consumer-supplied correspondence details (`consumer_review`) | **no** — only a free-text block; no structured consumer detail is collected or carried |
| the applicable correspondence + organized evidence (`usable_download`) | **no** — there is no correspondence header/letter and no organized evidence section |

Conclusion: **the previous `IMPLEMENTED_AND_TESTED` closure of `BLOCKER-DISPUTE-PACKET-001` was unsupported and is
corrected.** `packet_scope`, `consumer_review` and `usable_download` are OPEN again, with `finding_evidence` and
`jurisdiction_content` still demonstrated (a factual verification request needs no citation, measured for all 82
rows). No address, remedy, deadline or signature is invented to fill the gap.

## 3. Implemented: one ordinary-account field improvement on an existing family reader

**The Equifax Australia family reader now reads the leading printed date of its own `Opened Date`/`Closed Date`
value when the value carries the report's trailing classification on the same printed line.** The admitted PUB-012
sample prints `15 Nov 2013 Secured or Partially Secured`, and the reader previously required the value to be the
date alone, so that record yielded **no date at all**. Nothing is inferred: the whole printed value is retained
verbatim as the raw reading, the trailing text is never interpreted, a value with no leading printed date stays
malformed, and no day is invented for a month-only value.

Verified in `ca-au-ordinary-field` (19 assertions, 0 failed):

- **Real sample (the field is now read, nothing else changes):** record 2 yields `liability.openedDate = 2013-11-15`
  from the full printed value; record 1's plain `11 Apr 2013` is unchanged; the record that prints no date label
  still yields no date; and the sample still raises no contradictory-date issue, because it prints no closure value.
- **Benign control:** a record with the trailing classification and no closure raises no issue.
- **Positive case through the real Issue -> Wizzard -> selected-packet path:** a structural AU fixture whose opened
  date carries the classification and whose closed date is earlier produces `COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY`
  as a POTENTIAL issue with a **VERIFICATION** request (no citation), the Wizzard offers it, and the downloaded
  packet states the full printed value, its normalization, its page/line and the verification request line.
- **Provenance:** the full printed value is the raw reading; the normalization is kept beside it.

## 4. Canadian compliance candidate (returned, not implemented)

**Exact accepted provision.** `CRP-LSRC-0319` — **PIPEDA, S.C. 2000, c. 5, Schedule 1, clause 4.6 (Accuracy)** and
clause 4.9 (Individual access). Recorded as a `CONTENT_RULE` in family F4 (REPORT_ACCURACY_OR_COMPLETENESS), owner
accepted, source artifact admitted, with the legacy rule id `ca.accuracy_duty.pipeda` and recorded kinds
`accuracy_duty` + `correction_duty`.

**Jurisdiction.** Federal, recorded as `COUNTRY_WIDE_SOURCE`. Its `remaining_implementation_dependencies` name
exactly what is missing before it can be enabled: `INSTRUMENT_CLASS_CONFIRMATION`,
`COUNTRY_WIDE_TO_SELECTED_REGION_RELATION_REQUIRED` and `REGISTER_DISPOSITION_UNRESOLVED`. The scope question is
real and must be settled by an owner decision rather than assumed: PIPEDA applies to private-sector organizations
in provinces **without** a substantially similar provincial regime, and Quebec, British Columbia and Alberta have
their own — so the country-wide row cannot be treated as covering every Canadian region uniformly.

**Legal trigger, and why it is not a shared date field.** The trigger is the **accuracy duty itself**: personal
information must be accurate and complete, and the individual has a right to correction. The matching report fact is
the report's **own self-contradiction** — the report prints one of its own facts two incompatible ways, so at least
one of them is inaccurate on the report's own terms. That is the same evidence the shared factual-verification
checks already produce (for example `COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY`: an opened date later than the closed
date). It does **not** depend on re-using the retention-window anchor of the Australian or United States rules; a
shared date field is not what makes the anchor match.

**Uncertainty and exception treatment.** The report does not establish which printed value is wrong, so the issue is
**PROBABLE**, never a correction demand: the packet asks the agency to verify. The two recorded dependencies stay
explicit — the PIPEDA/Quebec/BC/Alberta relationship is unresolved, and the register disposition is unresolved — so
no definite classification is asserted.

**Proposed request.** A verification request: "This report prints <fact> two incompatible ways (<value A> and
<value B>). Please verify which value is accurate and correct the inaccurate one." — a factual verification request
that needs no citation as its basis, with the recorded duty cited only as the reason the correction is owed once the
inaccuracy is confirmed.

**Not implemented, and deliberately.** The provision's `source_locator`, `effective_information_as_recorded` and
register disposition are all unrecorded, and the country-wide scope relation is unresolved. Enabling it now would be
exactly the "vaguely defined retention rule" this batch was told not to implement. The nearest provincial row,
`CRP-LSRC-0362` (Ontario Consumer Reporting Act, R.S.O. 1990, c. C.33, **s. 9(3)(a)**, also accepted, also a
CONTENT_RULE), is a second candidate but its provision text is likewise not recorded, so its trigger cannot be
stated and it is not implementable either.

## 5. Corrected gate state

Implementation closed **25** of 29 capability blockers; implementation **open 4** — `BLOCKER-FDT-001` (staging
/benchmark-gated), `BLOCKER-FINDING-COVERAGE-001` (the 12 Canadian + 4 GB rows), `BLOCKER-ALL82-FACILITATION-001`
(those rows plus the GB current-format intake artifact) and `BLOCKER-DISPUTE-PACKET-001` (recipient type, consumer
correspondence details and organized correspondence/evidence). Staging verification pending 29; all 33 release
checks still fail.

Preserved unchanged: the unified Issue path, the probability-based issues (a POTENTIAL issue is never promoted), the
factual-verification path without a statutory citation, consumer issue selection, the all-82 journeys and the
existing packet paths.


## 6. Follow-up batch: the packet correspondence is now implemented (OWNER-PACKET-CORRESPONDENCE-001)

The gap this document named first — "the packet must carry the applicable correspondence and organized evidence
references" — is now closed on measured behavioral evidence rather than re-asserted:

- the packet states the recipient by **TYPE** and invents no address (this service supplies none);
- the consumer's **correspondence details** are entered by the consumer, kept on the packet row separately from the
  report facts, and hashed into the approved version, so editing one after approval refuses the download until
  reapproval;
- the **correspondence** states one request per SELECTED issue and nothing else, and says the consumer reviews, edits
  and sends it;
- the **organized evidence references** give the report and record identity, the raw printed readings, the normalized
  values, the available source locations and the recorded rule only where a statutory duty applies (a factual
  verification request still carries no citation);
- a missing necessary detail **refuses** approval and download (`409 PACKET_CORRESPONDENCE_REQUIRED`).

Measured by the new `cb-packet-correspondence` section (84 assertions) on the ACTUAL downloaded document, plus
`bw-browser-wizzard` (44, real browser) and `bo-prime-directive-interaction` (23) through the real UI. No address,
remedy, deadline, signature or submitted status is invented and no legal-advice disclaimer appears.

**Gate state after the follow-up:** implementation closed **26**, implementation open **3** (`BLOCKER-FDT-001`,
`BLOCKER-FINDING-COVERAGE-001`, `BLOCKER-ALL82-FACILITATION-001`); `BLOCKER-DISPUTE-PACKET-001` is now
`IMPLEMENTED_AND_TESTED` with only its hosted review and purchased download (`end_to_end_journey`) PENDING. Staging
verification pending 29; all 33 release checks still fail. The Canadian candidate `CRP-LSRC-0319` remains
**not implemented**, on exactly the recorded dependencies set out above.


## 7. The Canadian candidate outcome (OWNER-CA-ORDINARY-REPORT-001)

The candidate set was investigated once and the strongest supported one was implemented; the rest stay recorded.

| Candidate | Recorded state | Outcome |
| --- | --- | --- |
| `CRP-LSRC-0362` — Consumer Reporting Act (Ontario), R.S.O. 1990, c. C.33, s. 9(3)(a), legacy rule `ca-on.cra.s9_3_a.best_evidence_basis`, family `REPORT_ACCURACY_OR_COMPLETENESS` | EXACT `CA-ON`; owner-accepted; `STATUTE_OR_REGULATION` with no confirmation outstanding; operational mapping ESTABLISHED; one dependency (`REGISTER_DISPOSITION_UNRESOLVED`) | **IMPLEMENTED.** The durable per-ID rescreen disposition is recorded in `SOURCE_CAPTURES/CA-ON-ORDINARY-REPORT/`, and the rule runs as a PROBABLE verification on the report's own contradicting values for one ordinary account, through the complete consumer path. |
| `CRP-LSRC-0319` — PIPEDA, Schedule 1 cl. 4.6 / cl. 4.9 | `COUNTRY_WIDE_SOURCE`; `INSTRUMENT_CLASS_CONFIRMATION`, `COUNTRY_WIDE_TO_SELECTED_REGION_RELATION_REQUIRED`, `REGISTER_DISPOSITION_UNRESOLVED` | **RECORDED, NOT IMPLEMENTED.** Three genuine prerequisites are unresolved; none was assumed away. |
| `CRP-LSRC-0363` to `CRP-LSRC-0372` — further Ontario limbs | EXACT `CA-ON`, but `instrument_class_confirmation_required: true` (`SCREEN_INCONCLUSIVE`) | **RECORDED, NOT IMPLEMENTED.** No disabled adapter was added for them. |
| The remaining Canadian provinces/territories | no admitted substantive rule of their own | **OPEN** for BLOCKER-FINDING-COVERAGE-001; counted honestly (15 rows now, was 16). |

The rule's ceiling is `PROBABLE_VIOLATION`, its request is a verification, and it never treats an unreadable or
absent date as compliance. **(Corrected 2026-10-04, OWNER-CA-ORDINARY-REPORT-002.)** The provision wording IS now
recorded — Consumer Reporting Act (Ontario), R.S.O. 1990, c. C.33, s. 9(3)(a): "any credit information based on
evidence that is not the best evidence reasonably available", located from the publisher (Government of Ontario,
e-Laws) and the authoritative consolidated index and recorded in
`SOURCE_CAPTURES/CA-ON-ORDINARY-REPORT/crp-lsrc-0362-provision-retrieval.json`; the earlier gloss ("the most reliable
evidence reasonably available") was not this provision's wording and has been replaced by the provision's own words
in the rule, the packet and the consumer wording. The same printed conflict also reaches the consumer once: the
shared factual observation is folded into the issue as a second supported base, so one issue carries one
verification request and the packet names both bases.

