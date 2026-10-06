# OWNER-ACCEPT-003 — Owner decisions and implementation continuation (delivery)

Authority: the four owner decisions in `CRP_OWNER_ACCEPT_003_DECISIONS_AND_IMPLEMENTATION_ORDER.md`, executed
October 2 2026 (America/Halifax). ACCEPT-002 was preserved; no restart.

## D1 — Federal judgment period

`FCRA-605A-2-US-NATIONAL-7Y` keeps the 7-year-from-entry comparison but is now recorded as an **explicitly
incomplete observation**: the "end of the governing statute of limitations if longer" alternative is not
computed, because no owner-accepted limitation record establishes a governing US-state limitation period for
a judgment, and the governing limitation jurisdiction is never inferred from the consumer-selected region.
`observation_incomplete` is recorded on the adapter, and its `max_conclusion` remains `probable_violation`
(the unresolved SOL is the identified decisive fact, never an automatic finding).

## D2 — Federal collections and charge-offs

`FCRA-605A-4-US-NATIONAL-7Y` is now `SINGLE_FIELD` on `collection.delinquencyDate` with `anchor_day_offset: 180`
(the § 605(c)(1) interval), `record_kinds: GENERAL_COLLECTION`, applicability `COLLECTION_RECORD_PRESENT`, and
runs on `GENERAL-BUREAU-REPORT`. A collection-placement, sale, update or payment date is never substituted.
The 180-day shift uses the shared integer calendar (`addDays`), not a clock or a hard-coded day count.

## D3 — New York satisfied judgments

`US-NY-GBL-380J-F1-II-JUDGMENT-5Y` is now a multi-fact limb: `anchor_field: publicRecord.judgmentEntryDate`
plus `condition_field: publicRecord.judgmentSatisfactionDate` and `condition_within_years: 5`. The satisfaction
date is never substituted as the start of the entry-based period; a satisfaction label without its date does
not establish the condition (UNRESOLVED), and satisfaction after five years leaves the condition unmet.

## D4 — Per-rule classification

A shared evidence-backed classifier (`classify`) emits `VIOLATION` when every report-determinable fact is
resolved and breach is established, and `PROBABLE_VIOLATION` when one identified decisive fact is genuinely
unavailable from a resolved reading. `output_permission` is set per rule:
- `{max_conclusion:'violation', finding_allowed:true, packet_eligible:false}` for 11 rules with no unresolved
  decisive fact;
- `{max_conclusion:'probable_violation', finding_allowed:true, packet_eligible:false}` for FCRA-605A-2.

`emitFinding` unconditional refusal is preserved for every non-permitted rule; the CA-NS exact-specimen
ceiling and `CRP_LEGAL_INVARIANT.md` are unchanged. The consumer renderer now surfaces `classification`,
`is_a_finding`, `decisive_fact_unavailable` and a finding-specific qualification.

## Tests and validation

- New `ae-accept-003` (17 assertions): collection breach/no-breach/missing, satisfied-judgment
  met/unmet/missing, classification breach/no-breach/missing/wrong-jurisdiction/probable.
- Regression: **4,899 assertions passed, 0 failed, 0 skipped**.
- Deployed to staging `crp-wizard-239163a95166f46e` (55 files, 0 hash mismatches), service `active`, Linux
  verification: collection `EVALUATED PERIOD_EXCEEDED anchor=2017-06-30 VIOLATION`, satisfied-judgment
  `EVALUATED PERIOD_EXCEEDED VIOLATION`, adverse `VIOLATION`. Stripe test mode; production unchanged.

## Remaining open (kept, not claimed)

The 228-record content mapping, the all-82 acceptance detail table, the 11-versus-7 benchmark reconciliation,
and the deployed public consumer-journey upload proof (upload → evidence-policy acceptance → assessment →
result/download) are the next concrete batches. No all-82 substantive coverage and no finding capability
completeness is claimed from catalog counts or passing assertions.
