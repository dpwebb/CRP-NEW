# CRP_CORE_CONSTITUTION.md

| Field | Value |
| --- | --- |
| Document | CRP Core Constitution |
| Repository | https://github.com/dpwebb/CRP-NEW.git |
| Local workspace | C:\CRP-NEW |
| Authority rank | **1** — supreme governing document of this repository |
| Issued under | BOOTSTRAP-001A (owner-issued bootstrap work order) |
| Status | ACTIVE |
| Effective date | 2026-09-28 |
| Applies to | every artifact in this repository: contracts, work orders, tests, implementation code, comments, evidence, and legacy material |

> This document is a governing contract. It is **not application code**. It defines no runtime
> behavior by itself, authorizes no implementation, and creates no framework.

---

## 1. What CRP Is

CRP examines a consumer credit report and identifies:

```text
VIOLATION
PROBABLE_VIOLATION
```

that are legally relevant to the jurisdiction selected by the consumer.

The consumer selects:

```text
COUNTRY
REGION
```

before uploading the report.

That consumer selection is the **authoritative jurisdiction** for the analysis. It is not a hint,
not a default value, not a guess subject to later correction by other data, and not a matter of
interpretation.

---

## 2. Authority Order

```text
1. Core Constitution
2. Legal Invariant
3. Jurisdiction Contract
4. Corpus Contract
5. Approved Build Plan
6. Active Work Order
7. Approved Tests
8. Implementation
9. Comments
10. Legacy Material
```

**2.1** Authority is determined by rank alone. It is never determined by recency, document length,
specificity, the number of artifacts that agree, passing test results, reviewer preference, or
implementation convenience.

**2.2** A lower-ranked artifact never overrides a higher-ranked artifact. Rank 7 (Approved Tests)
outranks rank 8 (Implementation): a passing test demonstrates that code matches the test; it never
demonstrates that the test is correct. Rank 8 outranks rank 9 (Comments) and rank 10 (Legacy
Material), but rank 8 never outranks ranks 1–7. Rank 9 (Comments) and rank 10 (Legacy Material)
outrank nothing.

**2.3** Legacy material (rank 10) from any other repository — including the legacy CRP application,
its tests, comments, documentation, runtime assumptions, extraction, evaluation, scoring, violation
determination, and implementation — carries no authority in this repository.

The sole exception is an exact, owner-approved Legacy Legal Corpus Admission Contract. That contract
may designate only the vetted legal-rule corpus, source evidence, citations, and jurisdiction-mapping
artifacts identified from `C:\Users\webbd\crp-credit-app`, by exact path and immutable digest. Each
designated artifact is authoritative only as a rank-4 Corpus Contract source for its recorded legal
content and jurisdiction metadata, and remains subordinate to ranks 1–3.

The exception never admits the legacy repository as a whole, nor any violation-determination engine,
evaluator, scoring or confidence logic, extraction or parsing logic, application code, tests, consumer
report, credential, deployment artifact, generated output, or undocumented mixed artifact. A designated
legacy legal artifact must be re-expressed in this repository's governed corpus format before it can
support a legal finding. Missing coverage remains missing; no legacy rule or jurisdiction mapping may
be inferred, broadened, or applied outside its recorded scope.

**2.4** No artifact acquires authority by existing. Presence in the repository, in a branch, in a
build output, or in a running process is not authority.

---

## 3. Conflict Protocol

If lower-level material conflicts with higher-level authority:

```text
STOP
REPORT CONFLICT
DO NOT SILENTLY REINTERPRET
```

### 3.1 What counts as a conflict

A conflict exists when a lower-ranked artifact:

| ID | Conflict type | Description |
| --- | --- | --- |
| C1 | Direct contradiction | states or implies the opposite of a higher-ranked clause |
| C2 | Silent override | proceeds as though higher-ranked text said something else |
| C3 | Gap-filling reinterpretation | a higher-ranked text is silent and a lower-ranked artifact supplies a rule that changes the meaning or reach of that text |
| C4 | Equivalence substitution | treats two distinct states as interchangeable (for example, treating `EXTRACTION_UNRESOLVED` as `ABSENT_FROM_REPORT`) |
| C5 | Authority laundering | establishes a rule through tests, code, comments, habits, or prior practice, then relies on that practice as if it were governed |

Absence of a governing rule is **not** a conflict. Absence of a governing rule is an absence of
authority, and it is resolved by the default direction of Section 5.

### 3.2 Required response, in order

**Step 1 — STOP.** Halt the affected work. Do not continue past the conflict, do not write the
conflicting artifact into a settled state, and do not ship, commit, merge, or publish the conflicting
change.

**Step 2 — REPORT CONFLICT.** Report the conflict to the repository owner, naming the exact
artifacts, locations, and texts involved. A conflict report is a deliverable, not a stall.

**Step 3 — DO NOT SILENTLY REINTERPRET.** Do not resolve the conflict by reinterpreting, narrowing,
widening, paraphrasing, renaming, or "reading in context" the higher-ranked text. Do not edit a
higher-ranked document to match a lower-ranked artifact: amending a governing document is an
owner amendment under Section 6 (an Active Work Order, rank 6), not a repair performed during
implementation.

### 3.3 Conflict report format

Every conflict report contains, at minimum:

```text
CONFLICT_ID
CONFLICT_TYPE            (C1 / C2 / C3 / C4 / C5)
HIGHER_ARTIFACT          (file + clause + exact quoted text)
LOWER_ARTIFACT           (file + location + exact quoted text or observed behavior)
NATURE_OF_CONFLICT       (one sentence)
BLOCKED_ACTION           (what work was halted)
INTERIM_STATE            (what was NOT done, and what remains unsettled)
RULING_REQUESTED         (the specific decision the owner must make)
```

A conflict report is incomplete if it does not quote the higher-ranked text verbatim, or if it does
not state what work was halted.

### 3.4 Prohibited conflict responses

The following are violations of this constitution:

- resolving a conflict by Approved Tests, Implementation, Comments, or Legacy Material, or by
  "the tests pass";
- resolving a conflict because existing code, an existing branch, or a prior deployment already
  behaves that way;
- resolving a conflict because the legacy CRP application behaved that way;
- declaring a conflict "minor", "cosmetic", or "out of scope" in order to avoid reporting it;
- deleting, weakening, or rewriting a governing counterpart so that the conflict disappears;
- continuing to build on unresolved conflicting material while the conflict is unreported.

### 3.5 Effect while a conflict is open

The higher-ranked text continues to govern while a conflict is open. The lower-ranked artifact is
**suspended**: it is not authoritative, it may not be relied on, and it may not be extended. No
finding, rule, test expectation, or implementation detail may depend on the suspended artifact.

## 4. Standing Prohibitions

These three prohibitions are constitutive. They are not defaults, they are not tunable, and they are
not subject to configuration, environment variables, feature flags, or jurisdiction-specific
carve-outs.

**4.1 Jurisdiction is never inferred.** The analysis jurisdiction is the consumer's pre-upload
`COUNTRY` + `REGION` selection. Jurisdiction must never be inferred or replaced from a credit-report
address, an IP address, a bureau location, a creditor location, or parser inference. The report
address may be extracted as report data; it must not override the consumer-selected jurisdiction.
(Full contract: `JURISDICTION_CONTRACT.md`.)

**4.2 A factual anomaly is never, by itself, a violation.** Anomaly detection may produce candidate
issues. It may never produce a consumer-facing `VIOLATION` or `PROBABLE_VIOLATION`. (Full contract:
`CRP_LEGAL_INVARIANT.md`.)

**4.3 Parser failure is never evidence.** `EXTRACTION_UNRESOLVED` is not `ABSENT_FROM_REPORT`.
Parser failure must never be treated as evidence supporting a probable violation. (Full contract:
`CRP_LEGAL_INVARIANT.md`.)

---

## 5. Default Direction of Ambiguity

When governing text is silent, incomplete, ambiguous, or unresolved — and no conflict exists — the
answer defaults to **refusal**, in this direction and no other:

```text
NO JURISDICTION                       => NO VIOLATION, NO PROBABLE_VIOLATION
NO APPLICABLE GOVERNED LEGAL RULE     => NO VIOLATION, NO PROBABLE_VIOLATION
FACTUAL ANOMALY ALONE                 => NOT A CONSUMER LEGAL FINDING
```

Silence in ranks 1–6 is never permission. An undefined jurisdiction enumeration, an undefined rule
corpus format, an undefined granularity of region, or an undefined non-finding representation does
not authorize a lower-ranked artifact to supply one. Each requires an approved Corpus Contract,
Approved Build Plan, or Active Work Order, within its authorized scope.

## 6. Amendment and Change Control

**6.1** This constitution and every other rank 1–3 document are amended only by an explicit,
owner-issued work order. No amendment occurs by implementation, refactor, test change, comment,
migration, or documentation drift.

**6.2** An amendment must name the document and the clause it changes, quote the text being replaced,
and state the replacement text. Implied amendments are void.

**6.3** Nothing in this repository may be changed by "making the code match reality". Where code and
a rank 1–3 document disagree, either the code is wrong, or the disagreement is a conflict to be
reported under Section 3. There is no third possibility in which the document quietly becomes
advisory.

**6.4** Deletion of a rank 1–3 document, or removal of a requirement from one, is an amendment and
requires the same authorization as an amendment.

**6.5** Amendment history is recorded in the amended document itself, so that the governing text and
its change record cannot separate. A rank 1–3 document with no amendment history has never been
amended.

---

## 7. Deferred Matters

The following are deliberately **not** defined by BOOTSTRAP-001A and are deferred to later approved
contracts or work orders:

```text
country and region enumerations, and their codes
region granularity and any sub-jurisdiction structure
the governed legal rule corpus format and its admission process
the representation of non-findings on any consumer-facing surface
persistence, storage, API, authentication, billing, and deployment concerns
the evidence and receipt protocol for this repository
the test strategy, fixture strategy, and verification tooling
repository scaffolding: git initialization, ignore rules, build tooling, package layout
```

Nothing in this list is authorized by being listed. Each item requires its own approved work order,
and work on a deferred item may not begin on the strength of this enumeration.

---

## 8. Compliance

**8.1** Every artifact in this repository is subordinate to this constitution. Where an artifact
cannot comply, that is a conflict under Section 3, not a variant to be tolerated.

**8.2** Any contributor — human or automated agent — that discovers a conflict must report it and
halt the affected work. Eagerness to make progress is not a justification for silent
reinterpretation, and a plausible reconstruction of an unstated rule is a silent reinterpretation.

**8.3** The absence of an enforcement mechanism, reviewer, pipeline, or test at any point in time
does not suspend this constitution.

---

## 9. Amendment History

| Date | Work order | Change |
| --- | --- | --- |
| 2026-09-28 | BOOTSTRAP-001A | Document created. |
| 2026-09-28 | BOOTSTRAP-001B | VOID: the work order did not meet Section 6.2’s required quoted-replacement form; its purported amendments are not governing authority. |
| 2026-09-28 | REMEDIATION-001C-A | VOID: the work order did not quote the current text being replaced as Section 6.2 requires; its physical edit does not confer governing authority. |
| 2026-09-28 | REMEDIATION-001E-A | Valid owner amendment: restored §3.2 Step 3 to the BOOTSTRAP-001A wording. Both replaced text and replacement text were quoted in this work order. |
| 2026-09-28 | REMEDIATION-001E-B | Valid owner amendment: restored §3.4’s first prohibited response to the BOOTSTRAP-001A wording. Both replaced text and replacement text were quoted in this work order. |
| 2026-09-28 | REMEDIATION-001E-C | Valid owner amendment: restored §5’s final paragraph to the BOOTSTRAP-001A wording. Both replaced text and replacement text were quoted in this work order. |
| 2026-09-28 | REMEDIATION-001E-D | Valid owner amendment: restored §6.1 to the BOOTSTRAP-001A wording. Both replaced text and replacement text were quoted in this work order. |
| 2026-09-28 | REMEDIATION-001E-E | Valid owner amendment: restored §7 to the BOOTSTRAP-001A wording. Both replaced text and replacement text were quoted in this work order. |
| 2026-09-28 | BOOTSTRAP-001H-A | Valid owner amendment: reissued the required ten-level authority hierarchy in §2. Both replaced text and replacement text were quoted in this work order. |
| 2026-09-28 | BOOTSTRAP-001H-B | Valid owner amendment: aligned §§2.2–2.3 to the reissued ten-level authority hierarchy. Both replaced text and replacement text were quoted in this work order. |
| 2026-09-29 | BOOTSTRAP-001H-D | Valid owner amendment: replaced §3.4’s obsolete rank range with the named subordinate artifact classes. Both replaced text and replacement text were quoted in this work order. |
| 2026-09-29 | BOOTSTRAP-001H-E | Valid owner amendment: clarified §3.2 and §5 under the ten-level hierarchy. Both replaced text and replacement text were quoted in this work order. |
| 2026-09-29 | BOOTSTRAP-001H-G | Valid owner amendment: corrected §3.2 grammar without changing its authority or scope. Both replaced text and replacement text were quoted in this work order. |
| 2026-09-29 | PHASE2-001D | Valid owner amendment: created a narrow, digest-bound exception for a later vetted legacy legal-corpus admission contract while permanently excluding the old violation-determination engine and all other legacy material. Both replaced text and replacement text were quoted in this work order. |

---

*End of CRP_CORE_CONSTITUTION.md. The next artifact in authority is `CRP_LEGAL_INVARIANT.md`.*



