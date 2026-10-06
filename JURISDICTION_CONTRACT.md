# JURISDICTION_CONTRACT.md

| Field | Value |
| --- | --- |
| Document | Jurisdiction Contract |
| Repository | https://github.com/dpwebb/CRP-NEW.git |
| Local workspace | C:\CRP-NEW |
| Authority rank | **3** — subordinate to `CRP_CORE_CONSTITUTION.md` and `CRP_LEGAL_INVARIANT.md` |
| Issued under | BOOTSTRAP-001A (owner-issued bootstrap work order) |
| Status | ACTIVE |
| Effective date | 2026-09-28 |
| Applies to | every artifact in this repository that selects, records, reads, transmits, or consumes a jurisdiction |

> This document is a governing contract. It is **not application code**. It defines no runtime
> behavior by itself, authorizes no implementation, and creates no framework.

---

## 1. Purpose

This contract fixes the single source of analysis jurisdiction for CRP, defines what that
jurisdiction is composed of, states what may never determine it, and states what happens when it is
missing.

---

## 2. The Jurisdiction Unit

A jurisdiction is a pair:

```text
COUNTRY
REGION
```

Both parts are required. Neither part is defaulted, guessed, or derived. The pair is selected by the
consumer.

```text
Consumer selects Country + Region before upload.

That selection is the authoritative jurisdiction for the report analysis.
```

The consumer's selection is the **only** admissible source of analysis jurisdiction. It is
authoritative whether or not it agrees with anything else the system observes.

---

## 3. Selection Timing and Persistence

**3.1** The selection is made **before** the report is uploaded. A report never arrives first and a
jurisdiction is never back-filled onto it.

**3.2** The selection is recorded with the analysis it governs, so that a completed analysis can be
traced to the jurisdiction under which it was performed.

**3.3** The selection is fixed for the analysis it governs. An analysis is performed under exactly
one jurisdiction. A different selection is a different analysis; it does not retroactively re-rule,
re-label, or re-score an existing analysis.

**3.4** There is no default jurisdiction, no fallback jurisdiction, and no "most likely" jurisdiction.
Where a jurisdiction is required and absent, the analysis does not proceed to any legal conclusion
(Section 7).

---

## 4. Inadmissible Sources of Jurisdiction

```text
Do not infer jurisdiction from:
- report address
- IP address
- bureau location
- creditor location
- parser inference
```

| Source | May be used for | Must never be used for |
| --- | --- | --- |
| Report address | report data; display of report contents | selecting, confirming, correcting, or overriding the analysis jurisdiction |
| IP address | transport, security, abuse handling | selecting, confirming, correcting, or overriding the analysis jurisdiction |
| Bureau location | report data; provenance of the document | selecting, confirming, correcting, or overriding the analysis jurisdiction |
| Creditor location | report data; display of report contents | selecting, confirming, correcting, or overriding the analysis jurisdiction |
| Parser inference | nothing relating to jurisdiction | selecting, confirming, correcting, or overriding the analysis jurisdiction |

**4.1** These prohibitions are absolute. They are not relaxed when the consumer's selection looks
implausible, when the report appears to belong to another country, when a majority of report data
points elsewhere, when a rule corpus is thin for the selected jurisdiction, or when a business
objective would be better served by another jurisdiction.

**4.2** Agreement proves nothing. That a report address happens to match the consumer's selection is
not corroboration, does not validate the jurisdiction, and does not authorize any use of the address
in jurisdiction resolution.

**4.3** The prohibited sources remain prohibited when used indirectly: through a derived field, a
normalized code, a lookup, a cached value, a heuristic, a machine-learned component, a model prompt,
a configuration default, or an environment variable.

---

## 5. Report Address: Extractable Data, Never Authority

**5.1** The report address **may be extracted as report data**. Extracting it is permitted and is a
matter for the extraction contract, not for this one.

**5.2** The report address is report data. It is not a jurisdiction fact for CRP. It does not
establish, confirm, correct, refine, or override the consumer-selected jurisdiction.

**5.3** Where the report address disagrees with the consumer's selection, the **selection governs**.
The disagreement is report content only and does not:

```text
change the analysis jurisdiction
suspend or invalidate the consumer's selection
select a different rule corpus
add, remove, or reorder applicable rules
produce a VIOLATION or PROBABLE_VIOLATION
```

**5.4** A disagreement between report address and selected jurisdiction **must not be reported as a
conflict under `CRP_CORE_CONSTITUTION.md` Section 3**, because no conflict exists: the governing text
already determines the outcome, and the governing outcome is that the selection governs.

**5.5** Any future feature that surfaces the report address must present it as report data, without
implying that it is the analysis jurisdiction.

---

## 6. Missing or Incomplete Jurisdiction

A jurisdiction is present only where **both** parts are present and recognized:

```text
COUNTRY  (selected by the consumer)
REGION   (selected by the consumer)
```

Otherwise the state is `NO JURISDICTION`, and the permanent failure applies:

```text
NO JURISDICTION
=> NO VIOLATION
=> NO PROBABLE_VIOLATION
```

`NO JURISDICTION` includes at least the following states:

| State | Condition |
| --- | --- |
| country missing | no country selected |
| region missing | a country is selected but no region is selected |
| country unrecognized | the value does not correspond to a governed country |
| region unrecognized | the value does not correspond to a governed region of the selected country |
| inconsistent | the region does not belong to the selected country |
| inferred | a value was supplied by anything other than the consumer's own selection |
| unresolved | the selection could not be established as a resolved value |

**6.1** No default, no fallback, no nearest match, no "rest of country", no supra-national substitute,
and no previously recorded jurisdiction may be used in place of a missing selection.

**6.2** An inferred jurisdiction is worse than a missing one. Where a jurisdiction would have to be
inferred, the state is `NO JURISDICTION`, and the inference must be reported as a defect rather than
performed.

**6.3** Because a jurisdiction cannot be filled in later, an analysis that requires jurisdiction and
has none cannot be upgraded to a legal finding retroactively. A later complete selection produces a
new analysis; it does not convert prior output.

---

## 7. Rule Resolution Is Strictly Bounded by the Selection

**7.1** Applicable governed legal rules are resolved **only** for the consumer-selected
`COUNTRY` + `REGION`. A rule is applicable only where the governed legal corpus states that the rule
applies to that jurisdiction.

**7.2** The following are prohibited:

```text
borrowing a rule from another country or region
borrowing a rule from a neighbouring or similar jurisdiction
borrowing a rule from where the bureau or creditor is located
applying a rule because the report address appears to place the consumer elsewhere
substituting a general principle for a governed rule
substituting model output, commentary, or precedent-in-practice for a governed rule
```

**7.3** Where an applicable governed rule exists for the selected jurisdiction but does not cover a
particular candidate issue, the outcome for that candidate issue is `NO APPLICABLE GOVERNED LEGAL
RULE`, and the permanent failure applies. Partial coverage is not extended by analogy in the absence
of an applicable governed rule.

**7.4** A rule corpus for one jurisdiction never grants authority in another jurisdiction, and cannot
be used as a template, pattern, or placeholder to make another jurisdiction look governed.

**7.5** Rules are not selected, weighted, ranked, or filtered by machine learning, similarity
scoring, embeddings, or model judgement. Rule applicability is decided by the governed corpus.

---

## 8. The Jurisdiction Record

Each analysis carries a jurisdiction record. The record contains, at minimum:

```text
country                 the consumer's selected country
region                  the consumer's selected region
selection_source        consumer (no other value is admissible)
selection_timestamp     when the consumer made the selection
analysis_identifier     the analysis this selection governs
contract_version        the version of this contract in force
```

**8.1** Where any required element of the record is missing or unresolved, the state is
`NO JURISDICTION` and Section 6 applies.

**8.2** The record is the authority of record. Where the record and any other artifact disagree about
the analysis jurisdiction, the record governs, and the disagreement is a conflict under
`CRP_CORE_CONSTITUTION.md` Section 3 if the other artifact is ranked below this contract.

**8.3** Storage mechanics, transport, persistence technologies, and serialization formats are not
defined by this contract (Section 12).

---

## 9. Verification Obligations

Verification artifacts are rank 7 (Approved Tests) and are subordinate to this contract. They must
prove the contract, never redefine it. A test asserting the contrary of any clause here is a conflict
of type C1 (`CRP_CORE_CONSTITUTION.md`, Section 3.1).

Verification must, at minimum, demonstrate:

```text
a report address in another jurisdiction does not change the analysis jurisdiction
an IP address in another jurisdiction does not change the analysis jurisdiction
a bureau location in another jurisdiction does not change the analysis jurisdiction
a creditor location in another jurisdiction does not change the analysis jurisdiction
a parser-inferred region does not change the analysis jurisdiction
a missing country                     => NO JURISDICTION => no findings
a missing region                      => NO JURISDICTION => no findings
a region not belonging to the country => NO JURISDICTION => no findings
agreement between the report address and the selection grants nothing and changes nothing
rules are resolved only from the selected jurisdiction
an unavailable jurisdiction is never substituted with a default or a prior selection
the analysis carries a jurisdiction record naming the consumer as the selection source
```

---

## 10. Refusal Behavior Summary

| Condition | Required outcome |
| --- | --- |
| country and region selected by the consumer, recognized, and consistent | analysis may proceed under that jurisdiction |
| country missing | `NO JURISDICTION` → no `VIOLATION`, no `PROBABLE_VIOLATION` |
| region missing | `NO JURISDICTION` → no `VIOLATION`, no `PROBABLE_VIOLATION` |
| country or region unrecognized | `NO JURISDICTION` → no `VIOLATION`, no `PROBABLE_VIOLATION` |
| region not belonging to country | `NO JURISDICTION` → no `VIOLATION`, no `PROBABLE_VIOLATION` |
| jurisdiction would have to be inferred | `NO JURISDICTION` → no `VIOLATION`, no `PROBABLE_VIOLATION` |
| report address disagrees with the selection | selection governs; no effect on the jurisdiction or on the rules applied |
| no governed rule applies in the selected jurisdiction | no `VIOLATION`, no `PROBABLE_VIOLATION` (see `CRP_LEGAL_INVARIANT.md`) |

---

## 11. Relationship to Other Authority

**11.1** This contract defers to `CRP_CORE_CONSTITUTION.md` (rank 1) and `CRP_LEGAL_INVARIANT.md`
(rank 2) in all respects. Where this contract appears to conflict with either, those documents govern
and a conflict must be reported under `CRP_CORE_CONSTITUTION.md` Section 3.

**11.2** This contract supplies requirement 1 of the legal invariant (consumer-selected
jurisdiction). It does not define the four-requirement test, the permanent failures, the treatment of
unresolved extraction, or the determinism of the evaluation; those are governed by
`CRP_LEGAL_INVARIANT.md`.

**11.3** No work order, test, implementation artifact, comment, or legacy material may narrow, widen,
or reinterpret this contract. Amendment requires an owner-issued work order
(`CRP_CORE_CONSTITUTION.md`, Section 6).

---

## 12. Deferred Matters

Not defined by this contract, and requiring a later approved work order:

```text
the enumerated countries and their codes
the enumerated regions and their codes
region granularity and any sub-jurisdiction or federal/national rule structure
validation rules for country and region codes
the selection interface and the moment of selection capture
storage, persistence, transport, and serialization of the jurisdiction record
audit, evidence, and receipt requirements for jurisdiction selection
```

Nothing in this list is authorized by being listed.

### 12.1 Common Four-Country Model

The common jurisdiction model supports exactly Canada (`CA`), the United States (`US`), the United
Kingdom (`GB`), and Australia (`AU`). These are contract labels and their exact repository country
keys; they do not derive from a repository country-name field.

For every supported country, the analysis jurisdiction remains exactly the consumer-selected pair:

```text
COUNTRY + REGION
```

`REGION` is required for the selected country. It is never inferred, defaulted, replaced by a report
fact, or omitted because another country has a different internal structure.

A country-level, federal, national, devolved, state, provincial, territorial, or other rule may
apply only where a later governed legal corpus explicitly represents its relationship to the selected
`COUNTRY` + `REGION` pair. It never substitutes for a missing, unrecognized, inconsistent, inferred,
or unresolved consumer selection.

This model defines no region enumeration, legal coverage, routing implementation, or consumer-selection
interface. Those remain deferred and require a later approved work order.

### 12.2 Stable Jurisdiction Codes

Every governed country and governed region must have one canonical, stable CRP code assigned by a
later approved enumeration. A code identifies only the enumerated jurisdiction; it does not infer,
validate, replace, refine, or override the consumer's selected `COUNTRY` + `REGION`.

A canonical code is immutable once admitted. Renaming a displayed jurisdiction name does not change
its code. Retiring a jurisdiction does not permit its code to be reused for another jurisdiction.

The four country keys stated in §12.1 are admitted solely as fixed source-scope identifiers. They do
not by themselves recognize a jurisdiction, enumerate any region, establish legal coverage, or replace
the consumer's selected `COUNTRY` + `REGION`.

A later enumeration must define the exact admitted region code values, country-to-region membership,
region display names, and enumeration version. Until a code is governed by that approved enumeration,
it is unrecognized.

### 12.3 Version-Pinned Repository Code Authority

CRP’s sole external source of truth for country and region code data in the common four-country model
is `amckenna41/iso3166-2`, path `iso3166_2/iso3166-2.json`, at commit
`1d1a86a6d5ff67359c0ae7287037f66b136be9dc`, Git blob
`9bb8d0c020b81b2294177ca5ab43222d1f0d3d3f`, under the repository’s MIT licence. Repository
attribution and that licence evidence must remain recorded with every later enumeration.

The artifact was verified by six read-only retrievals on 2026-09-29, beginning at 03:33:25 UTC. Its
observed contents, rather than conflicting repository documentation counts, control this contract.

A future region enumeration is closed to records contained under exactly the four §12.1 country keys
and whose `parentCode` is `null`. No child or deeper subdivision record is eligible. Repository
containment establishes country-to-region membership; an eligible record’s exact key is its region
source identifier and its `name` field is its region display name.

Only exact, case-sensitive repository keys are selectors. `localOtherName`, display names, aliases,
free text, alpha-3 forms, numeric forms, inferred mappings, and conversion rules are not selectors.

A jurisdiction becomes governed and recognized only when a later approved CRP enumeration admits its
eligible source record from this exact artifact. Repository content never substitutes for a missing,
unrecognized, inconsistent, inferred, or unresolved consumer selection.

No region record value, region enumeration, dependency, API, routing rule, legal coverage, or
implementation is admitted by this Section.

---

## 13. Amendment History

| Date | Work order | Change |
| --- | --- | --- |
| 2026-09-28 | BOOTSTRAP-001A | Document created. |
| 2026-09-28 | BOOTSTRAP-001B | VOID: the work order did not meet Constitution §6.2’s required quoted-replacement form; its purported amendments are not governing authority. |
| 2026-09-28 | REMEDIATION-001G-A | Valid owner amendment: restored §§9, 11.3, and 12 to the BOOTSTRAP-001A wording. Both replaced text and replacement text were quoted in this work order. |
| 2026-09-28 | BOOTSTRAP-001H-C | Valid owner amendment: aligned §9 verification artifacts to rank 7, Approved Tests. Both replaced text and replacement text were quoted in this work order. |
| 2026-09-29 | PHASE1-001B-R1 | Valid owner amendment: defined the common four-country model without authorizing enumeration, codes, routing, or implementation. Both replaced text and replacement text were quoted in this work order. |
| 2026-09-29 | PHASE1-001C | Valid owner amendment: defined stable jurisdiction-code rules without authorizing code values, enumeration, normalization, routing, or implementation. Both replaced text and replacement text were quoted in this work order. |
| 2026-09-29 | PHASE1-001D | Valid owner amendment: adopted ISO 3166-1 alpha-2 and ISO 3166-2 as code authorities without admitting an enumeration or implementation. Both replaced text and replacement text were quoted in this work order. |
| 2026-09-29 | PHASE1-001F-R1 | Valid owner amendment: replaced ISO with the version-pinned `amckenna41/iso3166-2` repository as external code-data source of truth; no value or implementation was admitted. Both replaced text and replacement text were quoted in this work order. |
| 2026-09-29 | PHASE1-001I | Valid owner amendment: fixed the four-country source scope, ratified the pinned JSON artifact, limited future regions to first-level records, and excluded alternate selectors; no region enumeration, legal coverage, routing, or implementation was admitted. Both replaced text and replacement text were quoted in this work order. |

---

*End of JURISDICTION_CONTRACT.md.*


