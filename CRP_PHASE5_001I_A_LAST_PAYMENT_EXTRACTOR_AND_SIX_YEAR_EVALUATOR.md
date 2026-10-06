# CRP PHASE5-001I-A — Last-Payment Fact Extractor and Six-Year Evaluator, Internal Validation Only

| Field | Value |
| --- | --- |
| Document | PHASE5-001I-A completion record — the bounded internal validation of one candidate extractor and its deterministic comparison |
| Repository | https://github.com/dpwebb/CRP-NEW.git |
| Local workspace | `C:\CRP-NEW` |
| Work order | `PHASE5-001I-A` — owner-issued in conversation, as the smallest implementation the PROD-003 evidence supports (PROD-003 §11) |
| Rank of this document | 6 — an Active Work Order record. It admits no rule, creates no coverage, authorizes no finding and passes no gate. |
| Effective date | 2026-09-30 |
| Evidence package | `SOURCE_CAPTURES\PHASE5-001I-A\` |
| Implementation | `internal-validation\ca-ns-last-payment-six-year\` (rank 8; internal only) |
| Read-only inputs | the PROD-003 register and crosswalk, the PHASE5-001O ledger, the admitted legacy corpus, and the recorded legacy system at `C:\Users\webbd\crp-credit-app` |
| Legacy access mode | **read-only, in place**: nothing copied, moved, renamed, written or transmitted |
| Deployment | none. No upload, no hosting, no consumer-data transmission, no billing, no authentication, no external report processing |

## The answer in one table

| Dimension | Value |
| --- | --- |
| Authorized combination | `CA` / `CA-NS` × Equifax Canada consumer channel × `PR-01` × rule unit `CA-NS-CRA-S10-3-C-LIMB-1` (first limb only) |
| Prerequisite the sequence required | the approved build plan's phase order and its "only after rule units and report mappings are admitted" condition — **not satisfied** |
| Restriction recorded | yes, with the exact quoted clauses, in `gate_sequence_assessment.json` |
| Relief applied | the smallest owner-authorized amendment: an internal-validation carve-out, with every production admission gate preserved |
| Gate effect | **none.** No gate is passed, advanced, softened or waived, and Gate 5.3 is still recorded as reached for one candidate and passed for none |
| Supported presentation | `PR-01` only, at SHA-256 `E439A4BB…7AE5F`, under a documented structural contract, evidenced for **one specimen** |
| Facts read | the printed `Request Date` header value and the printed `Last Payment Date` of each contract debt record in `Collections` |
| Pinned result | 1,919 days against a computed 2,191-day six-year span → `PERIOD_NOT_EXCEEDED`, on both collection records (PROD-003's recorded arithmetic reproduced) |
| Classification | the recorded legacy `D3` / `observation` determination, **preserved and not overridden**; the unit may emit no `PROBABLE_VIOLATION` under this order |
| Tests | 41 tests, 0 failures, across the pinned specimen, the arithmetic, the failure paths, the refusals and the state model |
| Consumer surface | none. Report checking remains "not yet available" for all 82 regions |
| Preservation | `PRESERVATION HELD` — 363 of 367 inherited files byte-identical; 2 changed documents and 2 refreshed PROD-003 outputs, all recorded |

## 1. What the owner authorized, and what this order did

The owner authorized `PHASE5-001I-A` for one combination: `CA` / `CA-NS`, the Equifax Canada consumer
presentation `PR-01`, rule unit `CA-NS-CRA-S10-3-C-LIMB-1`, last-payment limb only. The owner also decided,
in the same message:

> Preserve the legacy D3/observation classification. Do not override it with PROBABLE_VIOLATION during this
> order. The stated ceiling is not authorization to emit that finding. Timing and classification dependencies
> remain explicit.

This order read the whole proposed work order (PROD-003 §11), the representation register, the crosswalk, the
governing contracts and the prerequisite records; verified custody before implementing; identified the
prerequisite the approved gate sequence requires; declined to treat "Gate 5.3 reached for one candidate" as a
passed gate; documented the exact restriction; and applied the smallest owner-authorized amendment that
permits **internal validation only**, with all production admission gates preserved. It then implemented only
the bounded extractor and the internal deterministic comparison, under the implemented whitelist, exclusions
and acceptance criteria, and it carries the preserved classification it was told to carry.

## 2. The prerequisite the approved sequence requires, and the exact restriction

Three recorded clauses govern this question, and all three were read at their own line in their own file:

```text
CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md (rank 5), section 3:
  "Work proceeds in the following order. A later phase cannot begin before its stated gate passes."

CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md (rank 5), section 4 item 5:
  "Deterministic fact/evaluator specification and implementation, only after rule units and report
   mappings are admitted."

CRP_PROD_001_READINESS_AND_IMPLEMENTATION_PLAN.md (rank 6), section 9.4:
  "Milestone M-1 — Gate 5.3 passes for the single selected unit"
```

`SOURCE_CAPTURES\PHASE5-001I-A\gate_sequence_assessment.json` records each of these with its file, its line
number and its measured digest, together with the measured gate state: Gate 5.3
`STILL_EVIDENCE_GATED` — **reached for one candidate on one presentation and passed for none** — Gate 5.4
`NOT_STARTED`, 0 admitted governed rules and 0 permitted legal findings.

**The restriction is therefore real.** Gate 5.3 is not passed, the rule record does not exist, no admitted
evaluator exists, and the plan's section 4 item 5 condition is not satisfied. An owner-issued Active Work
Order is rank 6 and cannot override a rank-5 Approved Build Plan (`CRP_CORE_CONSTITUTION.md` §§2.1–2.2).
Rather than proceed under a work order that the governing sequence does not currently permit, this order
recorded the restriction and applied the smallest amendment that permits internal validation only.

## 3. The owner-authorized amendment, and its exact limits

`apply_001i_a_amendments.js` applied three edits to
`CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md`, in the required
quoted-replacement form (`CRP_CORE_CONSTITUTION.md` §6.2), and recorded them in `amendment_text.json` and
`amendment_application_result.json`:

| Edit | Clause | Effect |
| --- | --- | --- |
| A-1 | section 3, the ordering sentence | the sentence stands **and** the owner-authorized internal-validation carve-out is inserted beside it |
| A-2 | section 4, item 5 | the item stands **and** records that the carve-out is not the admitted specification or implementation, is not gate evidence and admits nothing |
| A-3 | section 8, Amendment History | the amendment row is appended, under §6.5 |

What the carve-out permits is narrow, and it is quoted in full in the amended document: one jurisdiction, one
presentation, one rule unit and one statutory limb; a named permitted-file list; internal-only artifacts that
are never advertised, never reachable from a consumer surface and never consumer-visible; comparison outcomes
that are arithmetic and never `VIOLATION` or `PROBABLE_VIOLATION`; unresolved states that keep their recorded
meaning; a recorded classification that is preserved and never overridden; and Gates 5.3 to 5.7, their
acceptance evidence and every admission condition left untouched, with the artifact required to be re-created
and re-validated under Gates 5.5 and 5.6 before any admission.

**What the amendment does not do.** It passes no gate. It admits no rule. It creates no coverage and no
finding class. It is not a general permission: it authorizes nothing for a second jurisdiction, presentation,
bureau, rule unit or limb, nothing consumer-visible, and no deployment.

## 4. The exact supported presentation boundary

The order requires one specimen not to be mistaken for a report class, and the implementation enforces that.
Support is evidenced for **one specimen of one presentation**:

| Element | Value |
| --- | --- |
| Presentation | `PR-01` — the Equifax Canada consumer-channel credit report, 22 pages, A4, native text on every page |
| Evidence | PROD-003's register record, artifact `LEG-CONSUMER-EQ-CA`, SHA-256 `E439A4BB1E43AF640DFE7867473BE0EF8EC13B2B8654F41C31138D86A107AE5F`, `96,393` bytes |
| Structural contract | PDF container; 22 pages; 594.96 × 841.92 pt (A4, ±0.5 pt); native text on every page; the `Collections` heading; the `Request Date` header label; `Date Assigned` as the collection-record boundary label; the printed date form `DDDD/DD/DD` |
| Refused | another Equifax Canada product, another bureau, a subscriber/business/screening/tenant-screening document, a scan, photograph or any page without native text, a generated or synthetic fixture, a `PR-01`-shaped document that is not the evidenced specimen, and an encrypted or unreadable document |

The admission gate evaluates every predicate and refuses on the first failure, naming the reason and the fact
status that reason produces. A document that satisfies every structural predicate but is not the evidenced
specimen is refused as `NOT_THE_EVIDENCED_SPECIMEN` → `UNSUPPORTED_PRESENTATION`: one specimen does not
establish support for every report from that bureau (PROD-003 dependency D-2 remains open).


## 5. What was implemented, and where the line is drawn

`internal-validation\ca-ns-last-payment-six-year\` holds the unit, and `SOURCE_CAPTURES\PHASE5-001I-A\`
holds the evidence. Nothing else was created; `permitted_files.json` and `implementation_manifest.json`
record the inventory by digest.

| File | Role |
| --- | --- |
| `constants.cjs` | the unit's identity, the rule citation, the five statuses, the refusal-to-status mapping, the preserved classification and the boundaries |
| `document-model.cjs` | the document model: `pdfinfo` and `pdftotext -layout` for a real PDF, an explicitly labelled synthetic model for tests, and the pinned-specimen pointer read from PROD-003's register |
| `presentation-contract.cjs` | the documented structural contract and the seven admission predicates |
| `locators.cjs` | the request-date header, the `Collections` section, its records, and the binding of `Last Payment Date` to the record that prints it |
| `extraction.cjs` | the two facts and the status model, per fact target |
| `six-year-evaluator.cjs` | the pure calendar comparison, the anniversary, the leap-year clamp and the boundary convention |
| `run-internal-validation.cjs` | the entry point: explicit selection, evidenced presentation, refusal of anything else |
| `tests/` | the suite: the pinned specimen, the arithmetic, the failure paths, the refusals and the state model |
| `synthetic/make-synthetic-pdf.cjs` | the test-fixture writer; every document it writes carries a synthetic marker |

Three lines are drawn in the code itself, not in prose:

- the entry point **requires** an explicit `CA` / `CA-NS` selection, checks it against
  `CRP_JURISDICTION_ENUMERATION.md` (version `CRP-JURISDICTION-ENUM-1`) and refuses anything else, including an
  absent selection; jurisdiction is never inferred from the report;
- a synthetic model **cannot** enter the evaluation path: the production entry throws
  `REFUSED_INTERNAL_INVARIANT`, and a result reached through the test-only path is stamped
  `presentation_evidence: false`, `synthetic_test_input: true`, `admitted_document: false`;
- extraction status is never the comparison outcome, and no status is substituted for another.

## 6. The two facts, as read from the evidenced specimen

`extraction_results.json` records the run. The status model has five states that can never be substituted for
one another: `RESOLVED`, `EXTRACTION_UNRESOLVED`, `UNSUPPORTED_PRESENTATION`, `NOT_A_DEBT_RECORD`,
`ABSENT_FROM_REPORT`.

| Fact | Printed value | Normalized | Precise locator |
| --- | --- | --- | --- |
| Report reference date (`Request Date`) | `2026/05/05` | `2026-05-05` | page-header label on **all 22 pages**, line 1 of each page, one identical value |
| Debt record 1 `Last Payment Date` | `2021/02/01` | `2021-02-01` | page 16, line 32, inside the record that begins at page 16 line 8 and ends at page 16 line 38 |
| Debt record 2 `Last Payment Date` | `2021/02/01` | `2021-02-01` | page 17, line 5, inside the record that begins at page 16 line 39 and continues to page 17 line 11 |

The `Collections` heading is located at page 16 line 4; the section resolves to pages 16–17, being the heading
page plus the contiguous pages that carry the contract's row labels. Both records satisfy the contract's
debt-record predicate (all of `Member Number`, `First Delinquency`, `Account Number`, `Amount`, `Balance`,
plus at least four other contract row labels), so each is read; record 2's `Last Payment Date` is printed on
the continuation page and is bound to **its own** record, not to record 1.

**What the extraction refuses to do.** A label that is absent, printed with no value, printed twice in one
record, malformed, or contradictory leaves the fact unresolved. A value printed outside any contract record is
never read. A date is never borrowed from another record, another section or another page. A missing
`Collections` heading is unresolved, never absent. `ABSENT_FROM_REPORT` has exactly one reachable path here:
the section is located and resolved and prints no contract debt record at all — a resolved reading, not a
parser silence.


## 7. The deterministic comparison, and its boundary convention

`evaluation_results.json` records the run. The comparison is a pure function of the two resolved dates, and it
reads no clock, locale, time zone, host or session state.

| Element | Value |
| --- | --- |
| Period | six calendar years from the last payment made on the debt (the rule's first limb only) |
| Anniversary | computed: `2021-02-01` + 6 calendar years = `2027-02-01` |
| Intervening days | `1,919` (`2026-05-05` − `2021-02-01`) |
| Six-year span in days | `2,191` — **computed from the two dates, never hard-coded** |
| Comparison | `intervening_days > six_year_span_in_days` |
| Outcome on the specimen | `PERIOD_NOT_EXCEEDED`, on both collection records |
| Reproduction | PROD-003's register records 1,919 days, a 2,191-day span, the boundary `2027-02-01` and `PERIOD_NOT_EXCEEDED`; this order reproduces all four from its own arithmetic (`REPRODUCED`) |

**No day count is hard-coded.** The span is derived, so a six-year interval containing two leap days is one day
wider than one containing a single leap day: `2,191` for `2021-02-01 → 2027-02-01` and `2,192` for
`2019-03-01 → 2025-03-01`. A 29 February start clamps to 28 February in a non-leap sixth year
(`2020-02-29 → 2026-02-28`), and the days before, at and after that anniversary were all tested.

**The anniversary boundary is stated, not assumed.** The sixth anniversary day is treated as *inside* the
period: the period is exceeded only after it. Whether "more than six years after" is inclusive or exclusive of
that day is a legal question, is reserved to the rule record (Gate 5.4), and is **not decided here** — the code
records the convention on every comparison and the conservative direction is chosen, so the arithmetic never
manufactures an exceeded period.

The three internal outcomes are exactly `PERIOD_NOT_EXCEEDED`, `PERIOD_EXCEEDED` and `UNRESOLVED`. They are
arithmetic results. **`PERIOD_EXCEEDED` alone is not a legal finding**, and no comparison runs while either
fact is unresolved.

## 8. The classification this order preserves, and what it therefore may not say

`classification_record.json` reads the classification from the files themselves, at their own lines, and
measures their digests:

| Element | Value |
| --- | --- |
| Admitted artifact | `packages\backend\src\services\legalCorpus\rules.canada.ts`, SHA-256 `90A05625…74CF`, admitted by PHASE5-001O |
| Entry | `CANADA_RULE_CLASSIFICATION_RECORDS` → `ca-ns.cra.s10_3_c.debt_retention_6y` |
| Classification | `REPORT_RELEVANT_BUT_NOT_DETECTABLE`, "The row stands at D3", `permittedConclusion "observation"`, packet-ineligible |
| Legacy binding recorded | `CRP_CANADA_GOVERNING_BUILD_CONTRACT.md` (rank 10 in this repository) defines `D3` and binds `D0–D3 → observation` |
| Owner decision | preserve it; do not override it with `PROBABLE_VIOLATION` during this order; the stated ceiling is not authorization to emit that finding |
| Effective ceiling for this unit | `OBSERVATION_CLASS_ONLY_UNTIL_THE_OWNER_DECIDES_AT_GATE_5_4`; `VIOLATION` is unavailable in all circumstances |

Three further dependencies are carried on every result, unresolved:

- **Timing.** The effective period of s. 10(3)(c) is unresolved in the admitted record (PROD-003 D-4), so a
  plain-language timing qualification is mandatory on any output.
- **Field-name divergence.** The admitted legacy rule record names `tradeline.lastPaymentDate`; the evidenced
  presentation prints the field on a *collection* record. Recorded, not resolved; an owner/admission question.
- **Classification divergence.** The recorded legacy `D3` / observation classification diverges from the
  direct-report contract §4 retention exception (PROD-003 D-5). The exception and the §7 report-assertion route
  are recorded in `classification_record.json` as `RECORDED, NOT RELIED ON` — neither is used, implied or
  promised by this order.


## 9. The tests, and what they actually establish

`test_results_001i_a.json` records **41 tests, 0 failures** (`ALL PHASE5-001I-A TESTS PASSED`).

| Group | What it establishes |
| --- | --- |
| A — the pinned specimen (9 tests) | admission passes every predicate; the request date is the printed header value on all 22 pages; the section resolves to pages 16–17 with two records; each record binds its own date with its own locator; PROD-003's arithmetic is reproduced; identical inputs reproduce identical results; the result is identical with the clock stubbed; the preserved classification and the qualifications are carried and no finding is authorized |
| B — the arithmetic (5 tests) | before, at and after the sixth anniversary; the leap-day clamp; the span is computed and differs between a one-leap and a two-leap interval; a last payment after the reference date is unresolved; a reference date beyond the run clock is still a pure function |
| C — failure and ambiguity paths (8 tests) | a blank value, an unprinted label, a malformed request date, contradictory request dates, an impossible calendar date, a header missing from some pages, a missing `Collections` heading, and a resolved section with no collection record |
| D — record binding (5 tests) | a stray label outside any record is never read; a region that is not the contract debt record is never read; two records do not contaminate one another; a date printed in another section is never used; a record-shaped label after the section is a continuity gap rather than a silent truncation |
| E — refusals (8 tests) | a fixture masquerading as a report is refused, not evaluated; an unpinned `PR-01`-shaped document is refused; a page with no native text is a presentation refusal; a wrong geometry is refused; a non-PDF container is refused; an unreadable document is a document-level extraction failure and never an absence; a synthetic model cannot enter the evaluation path in either direction; a synthetic test-input result is stamped as not presentation evidence |
| F — the state model (6 tests) | the five statuses are five distinct states; no refusal reason ever produces `ABSENT_FROM_REPORT`; a status and its value always agree; no comparison runs while either fact is unresolved; the outcomes are exactly the three internal results; the selection must be explicit, authorized and enumerated |

The fixtures the tests use are generated into a temporary directory, are listed by name and digest in the test
results, and every one of them carries a synthetic marker. **A synthetic success is not presentation
evidence**, and the result provenance records that in the artifact itself.

## 10. Privacy, custody and preservation

`identifier_scan.json` proves by measurement that no report content and no consumer identifier was copied into
this repository. The scan derives its name candidates at run time from the specimen's own file name, subtracts
the bureau's recorded vocabulary so a bureau name is not reported as a consumer name, and stores each candidate
only as a SHA-256. It scanned 39 files and found **0 findings**; the digit runs it classified and did not
report are PDF structural tables, SHA-256 digest records, the test suite's own clock stub and a machine
inventory's byte counts, each recorded with its justification.

The report itself was processed locally: no upload, no transmission, no copy of the specimen or of any field
other than the two printed dates that PROD-003 already recorded. No path and no file name is copied into this
package; the specimen is reached through the pointer in PROD-003's register.

`verify_001i_a_custody.ps1` measures preservation from this order's own baseline
(`preserved_files_before.json`, captured before anything was recorded):

| Measure | Result |
| --- | --- |
| inherited files baselined | 367 |
| unchanged | **363** |
| changed | **4**, all recorded: the amended build plan; the PROD-003 narrative repair; PROD-003's own narrative checker and PROD-003's own input verification, each refreshed by re-running PROD-003's own step |
| added by this order | 18 (all inside the permitted directories) |
| added outside the order / missing | **0 / 0** |
| admitted legacy artifacts re-verified | **34 of 34**, digests matching `admitted_artifacts.json` |
| consumer specimens re-verified | **2 of 2**, digests unchanged |
| generated regression corpus | 461 files, 23,627,410 bytes — identical to PROD-003's reading |
| legacy files created, deleted or modified | **0** |
| consumer application files changed | **0** |
| verdict | `PRESERVATION HELD` |

**The PROD-003 narrative repair, recorded.** While reading PROD-003's document this order found two displaced
blocks: §10's `5.7` gate row and its closing claim sentence, and the tail of that sentence, had been left at
the end of the file instead of in §10. The repair returned them to §10 and left no other content moved. No
claim was added, removed or changed: PROD-003's own narrative checks still pass (32 of 32) and its own
structural tests still pass (20 of 20) against the repaired file, and its own custody manifest for the file
remains the record of PROD-003's date. PROD-003's narrative checker's output was refreshed by re-running
PROD-003's own step, which is why it appears in the change list.

**The one reading that is expected to change.** PROD-003's custody step asserts that nothing was added outside
PROD-003 and that only the owner-amended readiness plan changed. Both are measurements at PROD-003's date, and
PROD-002's own record is stale in exactly the same way. This order therefore re-measured PROD-003's baseline
instead of re-running that step (re-running it would overwrite PROD-003's record of its own date) and recorded
the reading: of PROD-003's 342 baselined files, 340 are unchanged, 2 changed — the build plan, by this order's
owner-authorized amendment, and the readiness plan PROD-003 itself amended — and 50 files are additions
attributable to this order. That is `REVIEW REQUIRED` at that step, by design, as recorded in
`preservation_and_change_record.json` and proved in `inherited_chain_readings.json`.


## 11. The verification run

`SOURCE_CAPTURES\PHASE5-001I-A\run_001i_a_all.ps1` runs the whole chain and writes `validation_results.json`.
No step passes any gate.

| Step | Result |
| --- | --- |
| 1 input and prerequisite verification | 22 checks, 0 failures (`input_verification.json`) — the specimen, the ledger row, the enumeration, the gate state, the amendment, the repair, the tools and the inherited chain |
| 2 pinned-run extraction record | `extraction_results.json` written from the unit's own entry point on the evidenced specimen |
| 3 pinned-run evaluation record | `evaluation_results.json` written; PROD-003's arithmetic `REPRODUCED` |
| 4 governance records | `gate_sequence_assessment.json`, `presentation_boundary.json`, `classification_record.json`, `permitted_files.json`, `implementation_manifest.json` |
| 5 unit test suite | **41 tests, 0 failures** (`test_results_001i_a.json`) |
| 6 identifier scan | 39 files scanned, **0 findings** (`identifier_scan.json`) |
| 7 custody and preservation | `PRESERVATION HELD`; the date-scoped reading of PROD-003's custody step is recorded beside it |
| 8 narrative checks | the required sections and facts present, and no forbidden claim (`narrative_check.json`) |
| 9 PROD-003 narrative checks | 32 checks, 0 failures, against the repaired PROD-003 narrative |
| 10 PROD-003 amendment step | idempotent: 6 amendments already applied, document state unchanged |
| 11 PROD-003 structural tests | 20 tests, 0 failures |
| 12 demo flow self-check | `node wizard-check.cjs` passes: the application's jurisdiction, sample, review and approval gates still work |
| 13 PROD-002 build check | 38 checks, 0 failures: no region may claim report checking, and nothing unsupported is advertised |
| 14 inherited chain readings | 8 checks, 0 failures: the only difference the inherited chains see is this order's recorded owner amendment (`inherited_chain_readings.json`) |
| 15 custody manifest completion | the custody verifier runs a second time, after the last evidence file exists, so `file_custody_manifest.json` covers every artifact this order wrote |

One inherited reading deserves its own line. PROD-002 recorded the build plan as an input at digest
`C80183314C…`; this order changed it to `54FCECE0A1…` by the owner-authorized amendment. PROD-003's input
verification therefore reports one expected difference, and `inherited_chain_readings.json` proves — by
measuring it — that the difference is exactly the amendment and not drift. PROD-002's and PROD-003's verdict
records remain the records of their own dates and are neither re-claimed nor rewritten by this order, and
PROD-003's custody step is deliberately not re-run, because re-running it would overwrite PROD-003's record of
its own date; this order re-measures that baseline inside `verify_001i_a_custody.ps1` instead.


## 12. Remaining admission dependencies

| ID | Dependency | Effect | Owner action |
| --- | --- | --- | --- |
| G-5.3 | Gate 5.3 is reached for one candidate and passed for none | Phase 5.4 may not properly begin; this unit's internal validation stands outside the certified path | decide whether to close the gate for this one unit, or supply a second independently authorized specimen (D-2) |
| G-5.4 | the rule record does not exist | there is no admitted rule unit, no determined effective period and no settled ceiling | issue the rule-record order |
| D-2 | the locator is demonstrated on one specimen only | a second Equifax Canada consumer specimen is required before the locator is called reusable | supply a specimen, or accept the single-specimen boundary in writing |
| D-4 | the effective period of s. 10(3)(c) is unresolved | a timing qualification is carried on every result | accept the qualification, or authorize effective-period work |
| D-5 | the recorded legacy `D3` / observation classification diverges from the direct-report contract §4 retention exception | only an owner corpus amendment settles which governs; this order preserves the legacy classification and does not override it | decide at admission |
| D-7 | the positive path is not demonstrated on a real specimen | the `PERIOD_EXCEEDED` path is exercised only on synthetic input, which is not presentation evidence | none; it is a recorded limitation of this order |
| — | the field-name divergence: `tradeline.lastPaymentDate` against a printed collection-record field | recorded, not resolved | decide at admission |
| — | re-validation under Gates 5.5 and 5.6 | required by the carve-out before any admission of this artifact as an evaluator | issue the validation and replay order |

**The next bounded work order.** `PHASE5-001I-B` — the rule record for `CA-NS-CRA-S10-3-C-LIMB-1`
(Gate 5.4), which is the artifact this internal validation cannot substitute for: one rule unit, one limb,
field by field, with the effective-period determination, the exception treatment, the single-specimen
boundary, the field-name divergence and the exact result ceiling the owner decides. It must not adopt this
order's comparator as an admitted evaluator, and it must not treat this order's tests as Gate 5.6 evidence.
Until it and the owner's ceiling decision exist, this unit remains internal-only and emits nothing.

## 13. Boundaries

- This document and this order admit no rule, certify no legal count, re-verify no legal content and create no
  legal coverage. No result is produced for any person.
- It passes no gate. Gate 5.3 remains reached for one candidate on one presentation and passed for none;
  5.4 to 5.6 remain not started; 5.7 remains not reached.
- It emits no `VIOLATION` and no `PROBABLE_VIOLATION`, and it preserves the recorded legacy `D3` / observation
  classification rather than overriding it.
- It did not deploy, publish, host, transmit consumer data, upload a consumer report, evaluate a consumer,
  bill, or add authentication. Report checking remains "not yet available" for all 82 regions.
- It copied no artifact out of the legacy system, and `identifier_scan.json` proves it reproduced no
  identifier from any report's content.
- It changed two documents, both recorded: the build plan by the owner-authorized amendment, and PROD-003's
  narrative by a recorded assembly repair that added, removed and changed no claim.
- Its machine records are derived and reproducible: `run_001i_a_all.ps1` runs the whole chain, and
  `tests\run-tests.cjs` fails on any drift between the unit's behaviour and the claims above.
- Everything in §2's restriction, §4's presentation boundary, §8's classification and §12's dependency list is
  a recorded limitation. None of it is a finding, a coverage claim or a promise.

