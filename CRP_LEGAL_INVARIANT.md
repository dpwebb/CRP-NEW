# CRP_LEGAL_INVARIANT.md

| Field | Value |
| --- | --- |
| Document | CRP Legal Invariant |
| Repository | https://github.com/dpwebb/CRP-NEW.git |
| Local workspace | C:\CRP-NEW |
| Authority rank | **2** — subordinate only to `CRP_CORE_CONSTITUTION.md` |
| Issued under | BOOTSTRAP-001A (owner-issued bootstrap work order) |
| Status | ACTIVE |
| Effective date | 2026-09-28 |
| Applies to | every artifact in this repository, at every point in the analysis |

> This document is a governing contract. It is **not application code**. It defines no runtime
> behavior by itself, authorizes no implementation, and creates no framework.

---

## 1. The Core Legal Invariant

```text
A factual anomaly is not automatically a violation.

Every consumer-facing VIOLATION or PROBABLE_VIOLATION requires:

1. consumer-selected jurisdiction
2. applicable governed legal rule
3. reliable credit-report facts
4. deterministic legal evaluation
```

The four requirements are **conjunctive**. A finding that is missing any one of them is not a
finding. There is no weighting, no scoring, no confidence threshold, and no partial credit that can
substitute for a missing requirement.

---

## 2. The Governed Evaluation Chain

```text
REPORT FACTS
→ CANDIDATE ISSUE
→ CONSUMER-SELECTED JURISDICTION
→ APPLICABLE GOVERNED LEGAL RULE
→ DETERMINISTIC LEGAL EVALUATION
→ VIOLATION / PROBABLE_VIOLATION
```

**2.1** The chain is ordered and may only narrow. Each stage may discard, defer, or refuse a
candidate issue. No stage may add legal effect that a prior stage did not supply, and no stage may
skip a prior stage.

**2.2** A stage never supplies what it receives. Facts never supply jurisdiction. Jurisdiction never
supplies a rule. A rule never supplies facts. Evaluation never supplies the law it applies.

**2.3** A `CANDIDATE ISSUE` is an observation about the report. It is not a finding and carries no
legal weight. The word "violation" must not be attached to a candidate issue at any point, in any
artifact, including internal identifiers, logs, UI strings, comments, and test names.

**2.4** The terminal statuses of the chain are exactly:

```text
VIOLATION
PROBABLE_VIOLATION
```

No other consumer-facing legal status may be introduced by ranks 7–10. Introducing one requires an
amendment of this document by an owner-issued Active Work Order (rank 6).

### 2.5 Classification of the Terminal Statuses

A `VIOLATION` requires every report-determinable fact necessary for the applicable governed rule to
be reliably resolved, and deterministic evaluation to establish breach.

A `PROBABLE_VIOLATION` requires strong deterministic evidence supporting likely breach, plus one or
more individually identified decisive facts genuinely unavailable from the report.

“Genuinely unavailable from the report” is a property of the report, established from a resolved
reading independently of extraction capability. `EXTRACTION_UNRESOLVED`, parser failure, or an
extraction limitation is never evidence that a decisive fact is unavailable from the report.

A `PROBABLE_VIOLATION` is unavailable where jurisdiction, an applicable governed rule, or reliable
facts are absent. It is not a confidence score, anomaly aggregation, or hedge.

---

## 3. Requirement 1 — Consumer-Selected Jurisdiction

The jurisdiction must be the consumer's own `COUNTRY` + `REGION` selection, made before the report
upload, and must be the authoritative jurisdiction for the analysis. If the jurisdiction is absent,
incomplete, unrecognized, or substituted by inference, requirement 1 fails. (Full contract:
`JURISDICTION_CONTRACT.md`.)

---

## 4. Requirement 2 — Applicable Governed Legal Rule

A **governed legal rule** is a rule that exists in an approved governed legal corpus, that applies to
the consumer-selected jurisdiction, and that carries a citation capable of being shown to the
consumer.

To satisfy requirement 2, all of the following must hold:

**4.1** The rule exists in an approved governed corpus. **4.2** The rule applies to the
consumer-selected `COUNTRY` + `REGION`. **4.3** The rule is identifiable and citable. **4.4** The
rule was not invented, inferred, paraphrased, or synthesized at analysis time.

Rules originating in another jurisdiction, in general legal commentary, in model output, in prior
practice, in a legacy repository, or in a developer's legal intuition do not satisfy requirement 2.

---

## 5. Requirement 3 — Reliable Credit-Report Facts

**5.1** A fact is a datum that was extracted from the consumer's report and resolved: the extraction
produced a definite value for a definite field or statement at a definite location in the report.

**5.2** A legal evaluation may rest only on resolved facts. Unresolved extraction is not a fact.

**5.3** Facts must be traceable to their source location in the report, so that a finding can be
traced to the datum that grounds it.

**5.4** Plausibility, expected formatting, typical bureau behavior, and the analyst's or model's
sense of what the report "really" says are not facts.

---

## 6. Permanent Failures

```text
NO JURISDICTION
=> NO VIOLATION
=> NO PROBABLE_VIOLATION

NO APPLICABLE GOVERNED LEGAL RULE
=> NO VIOLATION
=> NO PROBABLE_VIOLATION

FACTUAL ANOMALY ALONE
=> NOT A CONSUMER LEGAL FINDING
```

**6.1** "Permanent" means permanent. These outcomes are not overridable by confidence, severity,
frequency, the number of anomalies present, the plausibility of the consumer's complaint, the
strength of the underlying injustice, the existence of similar findings in other jurisdictions, or
the commercial cost of returning nothing.

**6.2** These outcomes are not errors to be recovered from. They are the correct result. No retry, no
widened search, no relaxed threshold, and no substitute rule may be used to convert them into a
finding.

**6.3** These outcomes are not suppressible. Where the chain cannot complete, no consumer-facing
`VIOLATION` or `PROBABLE_VIOLATION` is emitted, and the reason the chain did not complete must be
recorded internally rather than replaced by a weaker finding.

**6.4** Absence of a jurisdiction or of an applicable governed rule is an absence of authority. It is
never a conflict to be resolved by interpretation (see `CRP_CORE_CONSTITUTION.md`, Section 3.1 and
Section 5).

---

## 7. Anomaly Is Not Violation

**7.1** An anomaly is a fact about the report that departs from an expected value, pattern, format,
or internal consistency. It is meaningful inputs to the chain, and it is nothing more than that.

**7.2** The following are anomalies, not findings, no matter how serious they appear: missing data,
impossible dates, duplicated tradelines, inconsistent balances, unexplained inquiries, contradictory
account statuses, impossible payment histories, and any other internal inconsistency of the report.

**7.3** Anomalies do not aggregate. Two anomalies do not make a violation; ten anomalies do not make
a probable violation. Aggregation is a legal evaluation, and a legal evaluation requires an
applicable governed legal rule.

**7.4** An anomaly may be presented to the consumer only as an observation about report content, and
only where a later approved work order authorizes that presentation. An anomaly must never be labeled,
styled, scored, ranked, or summarized in a way that conveys a legal conclusion.

---

## 8. EXTRACTION_UNRESOLVED Is Not ABSENT_FROM_REPORT

```text
EXTRACTION_UNRESOLVED
!=
ABSENT_FROM_REPORT
```

| State | Meaning |
| --- | --- |
| `EXTRACTION_UNRESOLVED` | the system did not establish whether the content is present, what it says, or where it is; no definite value exists |
| `ABSENT_FROM_REPORT` | the content was affirmatively established not to be present in the report, on the basis of a resolved reading of the report |

These are different states with different meanings, different evidentiary force, and different
consequences. Collapsing them into one state is a violation of this document.

**8.1** Unresolved extraction must never be recorded, transmitted, displayed, or reasoned about as if
the content were absent.

**8.2** Unresolved extraction must never be recorded, transmitted, displayed, or reasoned about as if
the content were present.

**8.3** Unresolved extraction is neither present nor absent. It is an absence of knowledge, and it
must be represented as such wherever it is represented at all.

**8.4** Unresolved extraction cannot satisfy requirement 3 (reliable credit-report facts). No legal
conclusion in either direction may rest on it.

**8.5** Where a rule's condition depends on content that is unresolved, the condition is not
satisfied and not refuted: it is unresolved. The chain cannot complete on that condition, and
Section 6 governs the outcome.

**8.6** Conservation of unresolved states is mandatory. At every hand-off between extraction,
storage, reasoning, presentation, and reporting, an unresolved extraction remains unresolved unless a
later resolved reading affirmatively replaces it. Silent resolution — treating unresolved content as
present, absent, or default — is prohibited at every layer.

---

## 9. Parser Failure Is Never Evidence

```text
Parser failure must never be treated as evidence supporting a probable violation.
```

**9.1** A parser failure includes: unrecognized layout, unsupported document form, unreadable or
poor-quality scan, truncated input, timeout, partial extraction, mapping failure, and every other
condition in which the system did not establish what the report says.

**9.2** Parser failure is a property of the system, not of the credit report, and not of the
consumer's credit history. It is never attributed to the bureau, the furnisher, or the consumer.

**9.3** "The parser could not find it" is never restated as "it is missing from the report", and
never as "the report fails to disclose it", and never as a datum in a rule evaluation.

**9.4** Parser failure must not be silently converted into a resolved negative a single layer later,
including in normalization, deduplication, aggregation, summarization, model prompting, or report
rendering.

---

## 10. Requirement 4 — Deterministic Legal Evaluation

**10.1** The same resolved facts, the same consumer-selected jurisdiction, and the same governed rule
must always produce the same result. The evaluation is a function of its governed inputs.

**10.2** The decision path contains no probabilistic step. Machine-learned scoring, similarity search,
embeddings, language-model judgement, natural-language reasoning, sampling, and heuristic guessing
must not determine whether a `VIOLATION` or `PROBABLE_VIOLATION` exists.

**10.3** Model output is never a finding and never a rule. A model may not supply, select, rank,
confirm, or veto a governed rule, and may not convert an anomaly into a finding.

**10.4** The evaluation must be independent of the order in which candidate issues are considered, of
the order in which facts are presented, of run time, locale, host, region, deployment, user, session,
and of any accumulated state.

**10.5** The evaluation must be replayable: a recorded analysis can be re-evaluated later and reproduce
its result, or the difference must be attributable to a change in a governed input.

**10.6** The result must be derivable by a human reviewer from the rule text and the resolved facts
alone. Where a result cannot be explained from the rule and the facts, the result is unexplained and
must not be emitted.

---

## 11. Traceability of a Finding

Every emitted `VIOLATION` and `PROBABLE_VIOLATION` must carry, at minimum:

```text
the consumer-selected jurisdiction recorded for the analysis
the identity of the applicable governed legal rule, with its citation
the resolved credit-report facts relied on, each traceable to its report location
the determination produced by the deterministic evaluation
the version of the rule and of the evaluation under which it was produced
```

A finding that cannot state all five is not emittable. Where any of the five is unavailable, the
chain has not completed and Section 6 governs.

Every emitted `PROBABLE_VIOLATION` must additionally identify each decisive fact genuinely
unavailable from the report and the resolved-report basis establishing that unavailability.
`EXTRACTION_UNRESOLVED`, parser failure, and extraction limitation must never be listed as such a
fact. A `PROBABLE_VIOLATION` missing any required item is not emittable.

---

## 12. Non-Findings

**12.1** Where the chain does not complete, nothing consumer-facing is emitted as a legal finding.
There is no "possible violation", no "likely violation", no "issue worth reviewing", and no similar
label available to ranks 7–10.

**12.2** The reason the chain did not complete must be recorded internally, at the stage it stopped:
`NO JURISDICTION`, `NO APPLICABLE GOVERNED LEGAL RULE`, unresolved facts, or an evaluation that did
not determine a finding.

**12.3** An internal non-finding record is not a consumer-facing status, and must never be presented,
styled, counted, or labeled as a legal conclusion.

**12.4** The representation of non-findings on any consumer-facing surface — including whether
non-findings are surfaced at all — is **not defined** by this document and requires a later approved
work order (see `CRP_CORE_CONSTITUTION.md`, Section 7).

---

## 13. Verification Obligations

Tests and verification artifacts are rank 7 (Approved Tests) and are **subordinate to this
document**. They must be written to prove this document, never to redefine it. A test that asserts
the contrary of any clause
here is a conflict of type C1 (`CRP_CORE_CONSTITUTION.md`, Section 3.1) and must be reported, not
satisfied.

Verification must, at minimum, demonstrate each of the following:

```text
an anomaly alone, with jurisdiction and a governed rule, still does not produce a finding
no jurisdiction                          => no VIOLATION and no PROBABLE_VIOLATION
no applicable governed legal rule        => no VIOLATION and no PROBABLE_VIOLATION
an unresolved extraction is not reported as ABSENT_FROM_REPORT
an unresolved extraction is never used as evidence in either direction
a parser failure never increases the likelihood or count of findings
identical inputs reproduce identical results, run after run
no machine-learned or model-derived value is consulted in the decision
a finding states its jurisdiction, rule, citation, facts, and version
```

---

## 14. Prohibited Patterns

| ID | Prohibited pattern |
| --- | --- |
| P1 | anomaly + jurisdiction, without a governed rule, reported as a probable violation |
| P2 | parser silence or unresolved extraction restated as an omission from the report |
| P3 | a rule from one jurisdiction applied to another |
| P4 | absence of a governed rule filled with a general principle, commentary, or common sense |
| P5 | a confidence score, probability, or model opinion standing in for a governed rule |
| P6 | several anomalies aggregated into a finding without a governed rule that governs the aggregate |
| P7 | a finding emitted without its jurisdiction, rule, citation, facts, and version |
| P8 | a legacy CRP behavior, output shape, or detector arrangement cited as precedent or authority |
| P9 | an unresolved extraction silently resolved at a later layer (normalization, storage, prompting, rendering) |
| P10 | a test or comment redefining this invariant, and the invariant then read through the test or comment |

---

## 15. Amendment History

| Date | Work order | Change |
| --- | --- | --- |
| 2026-09-28 | BOOTSTRAP-001A | Document created. |
| 2026-09-28 | BOOTSTRAP-001B | VOID: the work order did not meet Constitution §6.2’s required quoted-replacement form; its purported amendments are not governing authority. |
| 2026-09-28 | REMEDIATION-001F-A | Valid owner amendment: restored §2.4 and removed invalid §2.5 to the BOOTSTRAP-001A text. Both replaced text and replacement text were quoted in this work order. |
| 2026-09-28 | REMEDIATION-001F-B | Valid owner amendment: removed invalid §§8.7–8.8 and restored §11 to the BOOTSTRAP-001A text. Both replaced text and replacement text were quoted in this work order. |
| 2026-09-28 | REMEDIATION-001F-C | Valid owner amendment: restored §12.1 and §12.4 to the BOOTSTRAP-001A wording. Both replaced text and replacement text were quoted in this work order. |
| 2026-09-28 | REMEDIATION-001F-D | Valid owner amendment: removed invalid §13 verification additions and §14 P11–P12. Both replaced text and replacement text were quoted in this work order. |
| 2026-09-29 | BOOTSTRAP-001H-F | Valid owner amendment: aligned §§2.4 and 12.1 to the ten-level authority hierarchy. Both replaced text and replacement text were quoted in this work order. |
| 2026-09-29 | BOOTSTRAP-001I-A | Valid owner amendment: added deterministic VIOLATION and PROBABLE_VIOLATION classifications in §2.5. Both replaced text and replacement text were quoted in this work order. |
| 2026-09-29 | BOOTSTRAP-001I-B | Valid owner amendment: added required PROBABLE_VIOLATION traceability in §11. Both replaced text and replacement text were quoted in this work order. |

---

*End of CRP_LEGAL_INVARIANT.md. The next artifact in authority is `JURISDICTION_CONTRACT.md`.*


