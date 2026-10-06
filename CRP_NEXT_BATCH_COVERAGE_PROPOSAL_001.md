# Four-outcome reconciliation and next-batch coverage proposal (CRP-RECON-005)

Date: October 5, 2026 (America/Halifax). Sources: `out/b4-release-check.json`,
`out/all82-facilitation-evidence.json`, `out/dispute-packet-evidence.json`,
`out/finding-coverage-evidence.json`, `SOURCE_CAPTURES/PHASE5-001O/source_id_coverage_ledger.json`, and a
reproduced local measurement (section 2).

## 1. The claim this batch corrects

The previous record implied that the 16 regions without an admitted statutory adapter were the cause of all three
promise blockers. That is true for only one of them. The four outcomes below are measured separately, and the
blockers do not share one cause.

## 2. The four outcomes, measured separately

Reproduced with the test harness (fictional reports only, test-adapter subscription), one region per market, one
ordinary account whose printed opened date is later than its closed date:

| Region | (1) jurisdiction-specific statutory assessment | (2) potential/probable issues delivered | (3) consumer-selected packet delivered | (4) jurisdiction-specific correspondence owed |
|---|---|---|---|---|
| CA-ON (one of the 12 Canadian) | none | 1 — POTENTIAL / FACTUAL_CONSISTENCY / VERIFICATION, no citation | yes, HTTP 200, request line `Request (verification)` | none promised |
| CA-NS | none for this fixture (the CA-NS content rule needs its own content facts) | 1 — same | yes, HTTP 200 | none promised |
| GB-ENG (one of the 4 GB) | none | 1 — same | yes, HTTP 200 | none promised |
| US-NY | none for this fixture | 1 — same | yes, HTTP 200 | none promised |
| AU-NSW (contrast) | 1 — DEFINITE / STATUTORY_RETENTION / CORRECTION with its recorded citation | 2 — the statutory one plus the factual one | yes, HTTP 200, request line `Request (correction)` | none promised |

What this establishes:

- **Outcome 2 is 82/82.** The six shared factual-verification potential issues are jurisdiction-agnostic and reach
  the consumer in every row. They are not gated by the statutory adapters.
- **Outcome 3 is 82/82.** A consumer-selected packet is delivered for every row. **A factual verification request
  needs no statutory citation** (measured: the 16 rows download a packet whose request line is
  `Request (verification)` and which names no citation), and a statutory correction request states its recorded
  citation where a duty applies (AU-NSW). `bx-all82-factual-verification` already demonstrates the delivery for all
  82 rows, including the 12 Canadian and the 4 GB rows.
- **Outcome 1 is 66/82.** Only rows with an admitted rule receive a jurisdiction-specific statutory assessment.
- **Outcome 4 is zero for every row.** The packet is a local, consumer-review document; this service sends, mails,
  emails, submits and signs nothing, so no jurisdiction-specific correspondence requirement is promised or owed.
  It is not a gap.

## 3. The precise remaining consumer behavior required by each gate

| Gate | Cause | Precise remaining consumer behavior |
|---|---|---|
| BLOCKER-FINDING-COVERAGE-001 | outcome 1 only | A supported substantive rule for the 12 Canadian provinces/territories and the 4 GB nations, on the admitted presentation for each market. |
| BLOCKER-ALL82-FACILITATION-001 | outcome 1 **plus a format evidence gap** | The 12 Canadian rows need the substantive rule path. The 4 GB rows additionally need a **current-format intake artifact** before the GB consumer-disclosure family reader can be admitted. Adding statutory adapters alone does NOT close this gate. |
| BLOCKER-DISPUTE-PACKET-001 | **not caused by the 16** | None. Corrected this batch: outcomes 3 and 4 are satisfied for all 82 rows, so `jurisdiction_content` is demonstrated and the packet implementation is `IMPLEMENTED_AND_TESTED`. Only its served-release verification stays PENDING. |
| BLOCKER-FDT-001 | staging/benchmark | Two required criteria are served (`on_deployed`) demonstrations. |

Corrected state: implementation closed 26 of 29 capability blockers; implementation open 3
(FDT-001, FINDING-COVERAGE-001, ALL82-FACILITATION-001); staging verification pending 29; all 33 release checks
still fail.

## 4. Ranked next-batch proposal

Ranked by consumer usefulness, demonstrated evidence and implementation readiness — not by how many jurisdictions
would move. Each candidate is stated with its supported issue, its uncertainty, the consumer-selected packet
request, a positive case and a benign control.

### Rank 1 — A Canadian compliance rule on already-extracted report facts — **DELIVERED for Ontario (OWNER-CA-ORDINARY-REPORT-001)**

- **Delivered.** `CRP-LSRC-0362` (Consumer Reporting Act (Ontario), R.S.O. 1990, c. C.33, s. 9(3)(a), legacy rule
  `ca-on.cra.s9_3_a.best_evidence_basis`): a PROBABLE verification emitted when the report's own two printed values
  for one ordinary account cannot both be right. The recorded prerequisite the ledger named for it (the durable
  per-ID rescreen disposition) is now recorded durably, and the whole path — upload, Issue, Wizzard, the consumer's
  correspondence, approval, entitled download — is tested with positive and benign controls.
- **Still open, recorded rather than assumed.** The remaining 11 Canadian rows need their own supported rule path.
  The country-wide PIPEDA candidate `CRP-LSRC-0319` still requires a recorded region relation and an
  instrument-class confirmation; `CRP-LSRC-0363` to `CRP-LSRC-0372` remain `SCREEN_INCONCLUSIVE`; the ledger's
  proposed "shortest, most consumer-friendly window" is still a proposal only and is not adopted.
- **Why this shape was chosen over a retention period.** Ontario's `s. 9(3)(a)` prohibits including credit
  information based on evidence that is not the best evidence reasonably available — a content rule, so it needs no
  period and no retention arithmetic, which is exactly the material the ledger does NOT record. Anchoring it on the
  report's own internal contradiction avoids inventing a threshold, and keeps the ceiling at PROBABLE because the
  report never shows which of the two values is unreliable. (Corrected 2026-10-04, OWNER-CA-ORDINARY-REPORT-002: no
  period is needed, but commencement still matters for ATTRIBUTION — a provision must be in force, and the version
  applied must govern the report's period, before it is named. Temporal applicability is therefore kept separate
  from retention arithmetic, and no commencement date is claimed; the provision's own located wording replaced an
  earlier gloss, and the same printed conflict now reaches the consumer as one issue carrying both supported bases.)

### Rank 1b — the earlier retention-rule shape, for the provinces still open

- **Supported issue.** A jurisdiction-specific statutory retention/compliance issue for a Canadian
  province/territory, anchored on a date the intake already resolves (the same closed/paid/listing/entry date the
  admitted Australian and United States retention adapters already consume), emitted as DEFINITE (a correction
  request) where the recorded period is exceeded and as PROBABLE (a verification request) where a recorded
  exception cannot be resolved from the report.
- **Uncertainty.** The period is measured against the printed anchor date and the report's own reference date. Where
  the exception limb depends on facts the report does not print, the issue stays PROBABLE and the packet says so; it
  never becomes a categorical allegation.
- **Consumer-selected packet request.** Select the issue -> approve -> the packet states the recorded provision and
  its citation, the printed anchor fact with its source page/line, the uncertainty and a correction (DEFINITE) or
  verification (PROBABLE) request. The existing packet path already does this for the admitted rules.
- **Positive case.** A fictional report whose printed anchor date places the item beyond the recorded period emits
  the issue and the downloaded packet names the provision.
- **Benign control.** The same account inside the period emits no issue; the same account with an unresolved
  exception emits PROBABLE, never DEFINITE.
- **Named source candidates.** The ledger already records every province and territory as carrying an instrument
  (`CRP-LSRC-0321`) and names **Ontario (Consumer Reporting Act, R.S.O. 1990)** and
  **Quebec (Civil Code of Quebec / Consumer Protection Act)**, with British Columbia and Alberta in the same table.
  The exact provision text and the per-province threshold must be admitted from the source register — a legal-source
  decision, not invented here. The ledger's proposed "shortest, most consumer-friendly window" is recorded as a
  proposal only and is not adopted, so each province needs its own recorded threshold.
- **Readiness / why first.** The runtime already extracts the anchor facts (proven by the AU/US adapters) and a
  Canadian consumer presentation is already admitted (PR-01). The gating dependency is the source admission. It is
  the Prime Directive's own core (compare the report against a relevant compliance requirement) for the largest
  Canadian consumer population, and it advances BLOCKER-FINDING-COVERAGE-001 and the Canadian half of
  BLOCKER-ALL82-FACILITATION-001.

### Rank 2 — Ordinary-account field coverage on the existing family readers

- **Supported issue.** The five ordinary-account categories that currently require the general intake — status and
  closure contradiction, balance versus past-due contradiction, duplicate reporting, responsibility inconsistency
  and payment-history inconsistency — becoming reachable from the consumer's own bureau-disclosure format.
- **Uncertainty.** Unchanged. Each category already carries its recorded uncertainty and benign alternative on the
  general intake; the family readers must supply the same fields so that the same wording, the same benign
  alternative and the same non-escalation apply.
- **Consumer-selected packet request.** The existing factual verification request for that category (no citation),
  delivered by the existing packet path.
- **Positive case.** A family report admitted by its own structural contract that prints two contradictory fields
  for one category emits that category.
- **Benign control.** The same family report without the contradiction emits no issue; a document that fails the
  family's structural contract is refused and the refusal names the predicate it failed.
- **Readiness / why second.** The highest readiness of the three: no legal source is required, only reader fields,
  and the field gaps are already measured (`bq-format-capability`, `bt-ordinary-field-coverage`,
  `bu-gb-tu-ca-fields`). Usefulness is high because most consumers upload their own bureau's format. It closes no
  release gate, so it is a coverage improvement rather than a gate closure.



### Rank 3 — Current GB report intake

- **Supported issue.** None of its own. It is the prerequisite that lets any GB-specific compliance rule run,
  because a rule needs an admitted GB consumer-disclosure presentation.
- **Uncertainty.** Not applicable — this is evidence acquisition, not an assessment.
- **Consumer-selected packet request.** Not applicable — the 4 GB rows already receive a valid factual verification
  packet through the general intake.
- **Positive case.** A captured present-day GB consumer-disclosure artifact that satisfies the measured structural
  contract admits the GB family reader, after which the GB-specific rule can run.
- **Benign control.** A document that resembles a GB report but fails the structural contract is refused, and the
  refusal names the predicate it failed; the 2007 example is never re-presented as current.
- **Named source.** The ledger records and the owner has accepted `CRP-LSRC-0407` —
  **UK GDPR / Data Protection Act 2018, Articles 5(1)(d) and 16 (accuracy; right to rectification)**, a
  report-content rule (family F4). The GB rule's legal basis therefore already exists; what is missing is the
  current-format **intake artifact**. `CURRENT_GB_SUPPORT_IS_ESTABLISHED` is corrected this batch to say exactly
  that, and the failing check keeps its GB scope.
- **Readiness / why third.** Lowest: the four recorded retrieval attempts were refused at the source (403/404), so
  this is a source-acquisition task this build cannot currently complete. Usefulness is high for the 4 GB rows and
  it unblocks the GB half of Rank 1, but it cannot be started from code.

## 5. What is deliberately not proposed

No statutory adapter is proposed merely to move a jurisdiction count, and no certainty-only gate is restored: the
factual verification path stays a factual verification path, a POTENTIAL issue is never promoted to a violation, and
the probability-based service and the unified Issue path are unchanged.
