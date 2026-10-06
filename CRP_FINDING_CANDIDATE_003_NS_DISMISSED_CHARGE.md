# CRP Finding Candidate 003 — Nova Scotia dismissed-charge prohibition (s.10(3)(f))

**Status:** ENABLED — `finding_allowed: true`, ceiling `violation`, `packet_eligible: false`. Legal applicability
and the corrected semantic/evidence gates pass (architect conditional authorization, 2026-10-04).
**Batch authority:** Architect directive "Complete and demonstrate the NS dismissed-charge capability" (2026-10-04).

## 1. Admission

| Field | Value |
| --- | --- |
| `adapter_id` | `CA-NS-CRA-S10-3-F-DISMISSED-CHARGE` |
| `legacy_rule_id` | `ns.dismissed_charge.prohibited` |
| `source_entry_id` | `CRP-LSRC-0358` |
| `citation` | Consumer Reporting Act (Nova Scotia), R.S.N.S. 1989, c. 93, s. 10(3)(f) |
| `source_artifact` | `packages/backend/src/services/legalCorpus/rules.canada.ts` |
| `source_version` | `90A05625AFEC4F81BDEB6568249BDEE5A45C178A20026FEA9D4F50A18AF174CF` |
| `jurisdiction` | CA / CA-NS (exact) |
| `addressee` | a consumer reporting agency |
| `anchor_mode` | `CONTENT_INCLUSION` |
| `presentation` | `GENERAL-BUREAU-REPORT` (same authorized bureau-agnostic intake as the judgment-content rule; no PR-01 widening) |

## 2. Predicates and exceptions

**Recorded proposition** (official 2018 consolidation of R.S.N.S. 1989, c. 93, s. 10(3), "Reporting"):
> (f) information regarding any criminal or summary conviction charges against the consumer where the charges have been dismissed, set aside, withdrawn or in respect of which a stay of proceedings has been entered.

**Decisive report-determinable predicates (all positive, none inferred from absence):**
1. A criminal-charge public record is positively identified (`criminalCharge.recordIdentified`).
2. The report prints a charge (`criminalCharge.chargeState === PRESENT`).
3. The report prints a dismissed/set-aside/withdrawn/stayed disposition (`criminalCharge.dismissedDispositionState === PRESENT`).
4. The entry is complete and readable (`criminalCharge.entryComplete`).

**Exceptions:** none recorded. s.10(3)(f) has no off-report carve-out; the disposition is a report-printed fact.

## 3. Finding permission (ENABLED)

`finding_allowed: true`, `max_conclusion: violation`, `packet_eligible: false`. The rule is enabled under the
architect's conditional rule-specific admission authority; the corrections below removed the earlier incorrect
claim that "edition currency is the only remaining gate" and the charge/disposition false positives.

**Corrected semantic gate (charge/disposition):** the earlier keyword presence was insufficient and produced two
reproduced false positives — "Disposition: Not dismissed" and "Disposition: Application to dismiss withdrawn;
charge remains pending" both read as `PRESENT`. The extraction now (i) positively identifies a criminal charge from
a "criminal"/"summary conviction" context plus a charge value (never generic "charge"/"offence"/"arrest"/monetary
wording), (ii) binds the disposition to that same charge, and (iii) classifies the disposition semantically —
negation, pending/requested outcomes, applications rather than charges, reversed/superseded dispositions and
conflicting readings are NOT positive; unsupported wording stays UNRESOLVED. Raw wording, charge identity and source
locations are preserved.

**Corrected evidence gate (classification):** `classifyContentInclusion` now requires each decisive predicate's
source to match its value and carry a record identity, not merely contain a location object. Missing, mismatched and
contradictory provenance are refused through the classifier.

**Legal applicability — bounded source investigation (October 4):** relied on the accepted corpus and the cached
official sources.
- **Edition/commencement:** the official Nova Scotia "Proclamations of Nova Scotia Statutes" page (captured, current
  through 2026 entries) states *"The Revised Statutes, 1989, were proclaimed to come into force on February 22,
  1990."* Its "Revised Statutes of Nova Scotia" list contains **R.S. 1989 (February 22, 1990)** and **R.S. 1989
  (1992 Supp.) (August 1, 1992)** and records **no proclamation for a 2023 Revision**. The 2023 re-consolidation
  (c. C-53) is published under the legislature's *historical consolidated statutes* (1851–2023), not as a new
  in-force revision. R.S.N.S. 1989 c. 93 (consolidated to 2018, © 2019 by authority of the Speaker) is therefore the
  applicable, in-force edition; the unchanged s.10(3)(f) requires no fresh proclamation.
- **Definitions (s.2):** "consumer reporting agency" = a person who for gain or profit furnishes consumer reports;
  "consumer report" = a communication by a CRA of "information"; "information" includes a consumer's **character and
  reputation**. A criminal/summary-conviction charge is "information" bearing on character/reputation.
- **Application:** s.10(3) is addressed to "a consumer reporting agency" and governs what it "shall not include in a
  consumer report". No exclusion removes criminal/summary-conviction charges from the s.10(3)(f) prohibition.
- **Substantive difference between editions:** none for this limb — c. 93 s.10(3)(f) and the 2023 c. C-53 re-number
  (s.12(3)(h)) are substantively identical; only the chapter/section numbering differs. (Corrected: the 2023 limb
  is s.12(3)(h), not s.12(3)(f) — the 2023 Revision inserts the c. 93 s.10(3)(da) actions limb as s.12(3)(f).)

**Captured proclamation/status evidence (exact):**
- URL: `https://nslegislature.ca/legislation/proclamations-nova-scotia-statutes`
- Captured file: `SOURCE_CAPTURES/PHASE5-001H/NS-legislature-proclamations-of-nova-scotia-statutes.html`
- Retrieval date: 2026-09-30 08:13:46 (local capture)
- Stated coverage date (`og:updated_time`): 2026-09-25T15:18:30-03:00
- SHA-256: `01980C5D0F9D38434554B3789AA92C3BC501AAE661E9DDFB51CD6A6B4700D631` (343,353 bytes)
- Relied-on statement: *"The Revised Statutes, 1989, were proclaimed to come into force on February 22, 1990."*
  and its "Revised Statutes of Nova Scotia" list (R.S. 1989 — February 22, 1990; R.S. 1989 (1992 Supp.) —
  August 1, 1992) with no 2023-Revision proclamation. The 1989 commencement is the historical baseline; the
  current amendment status is the 2018 consolidation (c. 93, amended through 2018), not the 2023 re-numbering.

The rule is ENABLED (measured: matching evidence yields a VIOLATION, exercised end-to-end as a "Reporting issue").
NS judgment-content (s.10(3)(d)) assignment alternative remains independently unresolved.

## 4. Related blocked candidates (exact missing decision)

| Limb | Classification | Missing decision |
| --- | --- | --- |
| s.10(3)(g) | convictions 7y retention + pardon carve-out | the "full pardon granted" condition is off-report; whether a consumer statement may establish it must be decided before admission |
| s.10(3)(da) | actions/court-proceedings age + current-status | the "ascertained current status" condition is off-report (a file record the report does not print); must not be inferred from absence |
| s.10(3)(f) | (this rule) | ENABLED — corrected semantics + evidence gates + legal applicability pass |

These are returned as blocked, with the missing decision named. They do not hold this rule.

## 5. Measured controls (enabled)

- **Positive:** a printed charge + dismissed/withdrawn/stayed disposition → rule-level `breach: true` (inclusion verified); matching source values + record identity → classifier returns **VIOLATION** (proven through the `classifyContentInclusion` test seam and the real path).
- **Negative:** convicted disposition → `VERIFIED_ABSENT`; incomplete entry → no breach; missing/mismatched/cross-record/contradictory provenance → no finding; unresolved disposition → no finding; wrong jurisdiction → throws; a "Discharged" bankruptcy entry is NOT misread as a criminal charge.
- **End-to-end:** a fictional CA dismissed-charge report uploads → extracts → evaluates to a **VIOLATION** ("Reporting issue") in the Wizard. Finding coverage moved 9/82 → 10/82 (CA-NS).
