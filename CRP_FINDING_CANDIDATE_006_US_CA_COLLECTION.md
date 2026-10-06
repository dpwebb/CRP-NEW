# CRP Finding Candidate 006 — California collection-account obsolescence (§ 1785.13(a)(5), (b))

**Status:** ENABLED — `finding_allowed: true`, ceiling `violation`, `packet_eligible: false`.
**Batch authority:** Architect directive "California ordinary collection-account obsolescence under Civ. Code
§1785.13(a)(5) and (b)" (2026-10-04).

## 1. Admission

| Field | Value |
| --- | --- |
| `adapter_id` | `US-CA-CCRAA-1785-13-A-5-COLLECTION-7Y` |
| `legacy_rule_id` | `us.ca.collection.7y` |
| `source_entry_id` | `CRP-LSRC-0265` |
| `citation` | Consumer Credit Reporting Agencies Act (California), Civ. Code § 1785.13(a)(5), (b) |
| `source_artifact` | `packages/backend/src/services/legalCorpus/rules.ca.ts` |
| `source_version` | `7DDBF5C4B4743367841128F7A5DD1B699617C6A4E7B567ACBAFDD8B84B681B80` |
| `jurisdiction` | US / US-CA (exact) |
| `addressee` | a consumer credit reporting agency |
| `anchor_mode` | `SINGLE_FIELD`; anchor `collection.delinquencyDate`; `anchor_day_offset` 180; period 7 years |
| `presentation` | `US-CONSUMER-DISCLOSURE` + `GENERAL-BUREAU-REPORT` |

## 2. Trigger, 180-day start, concurrent timing (official text)

**Official text** (leginfo.legislature.ca.gov, Civ. Code § 1785.13, amended Stats. 2024 Ch. 520 SB 1061 effective
2025-01-01):
> (5) Accounts placed for collection or charged to profit and loss that antedate the report by more than seven years.
> (b) The seven-year period specified in paragraphs (5) and (8) of subdivision (a) shall commence to run, with
> respect to any account that is placed for collection (internally or by referral to a third party, whichever is
> earlier), charged to profit and loss, or subjected to any similar action, upon the expiration of the 180-day
> period beginning on the date of the commencement of the delinquency that immediately preceded the collection
> activity, charge to profit and loss, or similar action. Where more than one of these actions is taken with respect
> to a particular account, the seven-year period ... shall commence concurrently for all these actions on the date of
> the first of these actions.

- **Trigger:** placed for collection (internal or third-party, whichever earlier) or charged to profit and loss.
- **Start:** 180 days after the delinquency that immediately preceded the collection/charge-off — the SAME
  delinquency anchor as the federal § 605(c)(1) rule; the mapping is demonstrated from the two official texts, not
  assumed. The existing `anchor_day_offset: 180` machinery is reused.
- **Concurrent timing:** multiple qualifying actions share the first action's start; the 180-day offset (a single
  date per account) already yields one start per account, and a sale/transfer/later entry never resets it.
- **Effective period:** corpus records `status=in_force`, dates not recorded; the § 1785.13 SB 1061 amendment does
  not change (a)(5)/(b).

## 3. Decisive account evidence

The anchor is the collection/charge-off record's own explicitly date-labelled `collection.delinquencyDate`
("Date of First Delinquency" / "Date Delinquent" / "DOFD"). A generic "Delinquency"/"Delinquent" word without an
explicit date relationship stays UNRESOLVED (never mistaken for the date of first delinquency). The
collection-placement, charge-off, opening, sale, transfer, update or payment date is never substituted, and no other
account's anchor is borrowed. A contradictory reading (including a cure/re-delinquency pair) is withheld; a
missing/mismatched source yields no finding.

## 4. Measured controls

- **Positive:** a labelled delinquency > 7 years after the 180-day start → internal VIOLATION bound to the corrected
  digest, and a consumer "Reporting issue" with the delinquency source evidence.
- **Negative/boundary:** within the period and the exact 7-year-after-180-days boundary → no finding.
- **Guards:** collection-placement/opened dates are not the delinquency; a generic "Delinquency" without an explicit
  date relationship stays unresolved; a charge-off-only record with an explicit delinquency date establishes the
  anchor; contradictory readings (including cure/re-delinquency) withheld; missing/mismatched provenance no finding;
  multiple qualifying actions keep the first delinquency; multiple accounts and transferred collections keep their
  own; wrong jurisdiction throws.
- Covered by `bj-us-ca-collection` (21 assertions) end-to-end, plus the `ae-accept-003` /
  `ad-legal-event-facts` delinquency-arithmetic assertions and the `p-us-consumer-format` /
  `q-record-applicability` availability counts (6 → 7 unavailable, 9 → 10 accounted).
