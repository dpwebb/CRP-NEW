# CRP PHASE5-001T — Gate 5.6 Validation and Scoped Verdict

| Field | Value |
| --- | --- |
| Document | PHASE5-001T completion record — the fixture suite, the negative tests, the independent replay, the consumer-language validation, the preservation and custody records, the scoped Gate 5.6 verdict and the bounded next step |
| Repository | https://github.com/dpwebb/CRP-NEW.git |
| Local workspace | `C:\CRP-NEW` |
| Work order | `PHASE5-001T` — owner-authorized in conversation: Gate 5.6 — Validate before authorizing findings, for one scope only. It was issued by `CRP_PHASE5_001S_GATE_5_5_BLOCKER_RESOLUTION.md` and is executed here for the first time |
| Rank of this document | 6 — an Active Work Order record. It amends no governing document, passes no corpus-wide gate, admits no rule and produces no result for any person |
| Effective date | 2026-09-30 |
| Scope | `SCOPE-CA-NS-CRA-S10-3-C-LIMB-1-PR01-LASTPAYMENT` — the jurisdiction, the one rule unit, the last-payment limb, the one byte-pinned presentation, and nothing else |
| Evidence package | `SOURCE_CAPTURES\PHASE5-001T\` |
| Governing document read (not amended) | `CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md` (rank 5) at `1A7E7EA015FCF270496B915B940F8C96C4D7905CAAD22615BBD29965D040CA50`, the post-PHASE5-001S digest |
| Pre-admission rule-record identity | `CA-NS-CRA-S10-3-C-LIMB-1@PRE-ADMISSION-C24CA3FD3AA3` — the production identity and version remain **reserved to Gate 5.7** and are named, not passed |
| Deployment | none. No upload, hosting, consumer-data transmission, application change or external report processing |

## The answer in one table

| Question the order asked | Answer |
| --- | --- |
| Does the fixture suite cover every category the phase bullet names? | **yes — 33 fixtures over all 15 categories**, each stating the state it must reach, each labelled synthetic, 0 mismatches. The exact-boundary fixtures reach the **withheld** outcome, not an exceeded or a not-exceeded one |
| Were the negative tests run and recorded? | **yes — 8 tests, 0 failures**, each naming the prohibited behaviour it forbids and each recording what it demonstrates here (a refusal, or a `NOT_EMITTED` observation) rather than a capability this scope does not have |
| Does the independent replay reproduce the sampled results? | **yes — 17 of 17 samples reproduced, 0 disagreements, 0 unresolved.** The reviewer read the source pin and the register excerpt and never the evaluator; its expectations were frozen at `DDA0CE25…` before any evaluator run |
| Does the consumer language hold? | **yes — all 5 templates exercised at the pinned digest**, including the withheld-boundary template: 0 finding labels, 0 affirmative overstatements out of 27 recorded token occurrences, and no surface created |
| Is Gate 5.6 met for this scope? | **not in full.** Three clauses met (every test passes; the independent replay reproduces each sampled result; no known false positive/negative category remains unexplained). The fourth — version sharing — is **reserved and named as not satisfied**, because the production identity and version do not exist before Gate 5.7 |
| Was the version-sharing reservation required to be named? | **yes** — the order directs that it be named as reserved and not satisfied rather than passed, and it may not be satisfied by asking the owner to assign a production version |
| Progression to Gate 5.7 | **not permitted** — the plan allows a later phase to begin for a named scope only when every preceding gate carries a passing verdict, and Gate 5.6 does not for this scope. The exact blocker and the smallest permitted action are recorded in `next_work_order.json` |
| Was any rule admitted, coverage created or finding class authorised? | **no** — 0 admitted governed rules, 0 permitted findings, ceiling `OBSERVATION_CLASS_ONLY`, packet ineligible, nothing emitted |
| Preservation result | **measured, not asserted** — 527 pre-existing files baselined, **527 unchanged, 0 changed, 0 missing**, no earlier baseline or manifest overwritten, 25 files added (all inside this order's own package or its narrative), 53 checks with 0 failures |

## 1. What this order was asked to do, and what it did

The order carries six deliverables, eight acceptance criteria, ten exclusions and five stop conditions, and it is
observation-only and packet-ineligible. It was executed in full, and its one genuine finding is a **sequencing
reservation in a gate clause**, not a defect in any evidence.

```text
DELIVERABLE 1  fixture suite (15 categories, 33 fixtures)          -> fixture_suite_001t.json
DELIVERABLE 2  negative tests (8, each naming what it forbids)     -> negative_tests_001t.json
DELIVERABLE 3  independent replay (17 samples, frozen first)       -> replay_expectations_frozen.json
                                                                      independent_replay_001t.json
DELIVERABLE 4  consumer-language validation (5 templates)          -> consumer_language_validation_001t.json
DELIVERABLE 5  verification, preservation and custody records      -> verification_results.json
                                                                      preservation_and_change_record.json
                                                                      file_custody_manifest.json
                                                                      input_verification.json
                                                                      preserved_files_before.json
DELIVERABLE 6  scoped Gate 5.6 verdict                             -> scoped_gate_5_6_verdict.json
                                                                      next_work_order.json
```

What each script of this order writes was inspected before it was run: every one writes only inside
`SOURCE_CAPTURES\PHASE5-001T`, and none of them is the inherited PHASE5-001I-A suite.

## 2. The pinned inputs, verified before execution

`capture_001t_baseline.ps1` ran first and wrote two records before any other artifact of this order existed.

| Check | Result |
| --- | --- |
| The eleven pins the order names | **11 of 11 match** — the rule record `C24CA3FD…`, the crosswalk `51BFCDB7…`, the register `2F03DBC8…`, the fact model `4967DD57…`, the status vocabulary `FBD1EDFE…`, the specification `6D92F429…`, the executable evaluator `4D1EBEFB…`, the determinism check `BB5490B3…`, the explanation surface `6807E384…`, the amended plan `1A7E7EA0…`, the successor Gate 5.5 verdict `1B764B4D…` |
| The order's own pin conflicts | **0** |
| The other records this order reads | **52 input rows measured; 38 matched a digest an inherited record already held; 0 differences; 0 missing** |
| The read-only pointers outside the workspace | **3 of 3 match** — the accepted source pin `90A05625…`, PR-01 `E439A4BB…`, PR-02 `244D5808…`. Neither specimen was opened, copied or parsed |
| The inherited internal-validation suite | **inspected, never run** — 18 files recorded with digests, `run_by_this_order: false`. Its write destinations were read before anything was executed, and nothing of this order touches it |

## 3. Deliverable 1 — the fixture suite

All 33 fixtures are synthetic, in-memory and labelled so. No fixture is a presentation: the specimen was not
opened, and a synthetic document that declares itself a fixture is refused at the presentation gate
(`REFUSED_UNSUPPORTED_PRESENTATION`), which is measured as its own test.

| Category (the phase bullet's own words) | Fixtures | The state it must reach |
| --- | --- | --- |
| clear breach | FX-01 | `PERIOD_EXCEEDED` on the arithmetic; nothing emitted |
| compliant/within-limit | FX-02 | `PERIOD_NOT_EXCEEDED` — the specimen's own measured numbers reproduced |
| exact boundary | FX-03, FX-04, FX-05, FX-06 | **withheld** with the boundary case on FX-03/FX-04; the days either side of the clamped anniversary on FX-05/FX-06 |
| wrong event date | FX-07, FX-08 | `REFUSED_WRONG_EVENT_DATE_MAPPING` at gate G4 |
| date unavailable | FX-09, FX-10, FX-11, FX-31 | `EXTRACTION_UNRESOLVED` (blank value, missing label, unparseable value) and the reference-precedes case |
| report contradiction | FX-12, FX-27, FX-28 | `CONTRADICTED`; collection-record isolation across two records; the non-debt-record disposition |
| exception shown | FX-13 | the exception marker is not read; the record is the record without it |
| exception unknown | FX-14, FX-29 | the unknown marker suppresses nothing; FX-29 is the **operative state** — an unadmitted record refuses |
| effective-period uncertainty | FX-15 | `UNRESOLVED_MISSING_EVIDENCE` carried; the mandatory timing qualification carried |
| preemption uncertainty | FX-16, FX-32 | the recorded citation seam carried and nothing invented; the excluded second limb refused |
| duplicate catalogue source | FX-17 | two catalogue renderings of one provision produce **byte-identical records**; no second unit, limb or outcome |
| wrong jurisdiction | FX-18, FX-19, FX-33 | `REFUSED_JURISDICTION_NOT_AUTHORIZED_FOR_THIS_UNIT`, `REFUSED_NO_JURISDICTION_SELECTION_SUPPLIED`, and the four-gate case that refuses at the **first** failing gate |
| parser failure | FX-20, FX-21, FX-30 | a document-level refusal with no fact status; a section-level `EXTRACTION_UNRESOLVED`; never an absence reading |
| OCR ambiguity | FX-22, FX-23 | `IMAGE_ONLY_OR_NO_TEXT_LAYER` refused; an ambiguous value unresolved, never guessed |
| report-section not inspected | FX-24, FX-25, FX-26 | not inspected → unresolved; the **control** that reaches `ABSENT_FROM_REPORT`; a stray label outside any record → unresolved |

The leap-day convention is also measured as a property rather than by example: every 29 February start from 1900
to 2100 is checked, **49 starts, 0 counterexamples**, each clamping to 28 February because six years after a leap
year is never itself a leap year.

Of the 33 fixtures, **23 produced an arithmetic record** (through the synthetic in-memory copy marked admitted)
and **23 emitted nothing**: 0 emitted a finding class, 0 carried a forbidden label, and **0 were counted as
consumer-report presentation evidence**.

## 4. Deliverable 2 — the negative tests

| Test | The prohibited behaviour it forbids | What it demonstrates here |
| --- | --- | --- |
| N-01 | that any off-report fact is ever requested, inferred or used as a decisive fact | the evaluator has **no** module, file, network, clock, locale, environment or random access at all (9 scan patterns, 0 hits), it touches only the properties the specification declares, and ten injected off-report facts change **no byte** of the returned record |
| N-02 | that a parser failure ever becomes absence | a document-level parser failure is a named refusal with **no fact status at all**; a section-level failure is `EXTRACTION_UNRESOLVED`; the sweep over the 4 fixtures carrying a failure or not-inspected signal reaches `ABSENT_FROM_REPORT` **never**, and the one absence reading this unit has is reachable only from a resolved section that prints no contract debt record |
| N-03 | that an unknown exception ever suppresses a report-supported probable path | four injected exception states (`UNKNOWN`, `SHOWN`, `ABSENT`, `RELIED_ON`) return **byte-identical** records: nothing is read, so nothing is suppressed. This unit has no probable path at all — `finding_classes_available` is `[]` in every case and `PROBABLE_VIOLATION` is reachable nowhere. Recorded as an **absent capability**, not a passing behaviour |
| N-04 | that probable-only uncertainty ever emits `VIOLATION`, and that any finding label is rendered | 33 records scanned, 0 carrying a forbidden label (excluding the field that declares them forbidden); `VIOLATION` is not a permitted value on any output axis of the pinned surface; 0 cases emitted anything |
| N-05 | that an unadmitted record can emit a consumer result | all 9 fixtures using the pinned record refuse, and a fully eligible document against it refuses with `REFUSED_RULE_RECORD_NOT_ADMITTED` and produces **no outcome** (0 of 9 outcomes). Admission was not obtained, and was not needed, by this order |
| N-06 | that a synthetic fixture is ever counted as presentation evidence | a document declaring itself a fixture is refused; all 33 fixtures are labelled synthetic and counted as presentation evidence **zero** times; 0 specimens opened |
| N-07 | that the refusal depends on which failure was noticed first | in all 33 cases the named refusal is the **first failing gate in the fixed order**; 8 cases fail more than one gate, and the one that fails four at once (`FX-33`: no selection, a mis-declared mapping, an unadmitted record and a beyond-period date) refuses at **G1** |
| N-08 | that an arithmetic outcome is reported as an applicability finding, an observation eligibility or a finding authorisation | the four axes are separate fields in every case; the applicability state is the record's own `UNRESOLVED_MISSING_EVIDENCE (see effective dates/status)` in all 33 cases and is moved by no outcome; no case authorises a finding and no case is packet-eligible |

## 5. Deliverable 3 — the independent replay

The reviewer (`reviewer_001t.cjs`) was written from the **source side** of the record. It reads the accepted
source pin at its recorded digest, the report excerpt as the register records it, and the pinned specification and
status vocabulary as text — and it does **not** require, import or read the executable evaluator: measured, its
executable code loads no project file at all (the only modules it loads are `fs`, `path` and `crypto`) and names
neither the evaluator nor this order's fixtures and results; the only place the evaluator is named in the file is
the reviewer's own declaration of what it does not read. Its expectations were written to
`replay_expectations_frozen.json` at `DDA0CE25…` **before** the comparison harness ran the evaluator on any sampled
case, and that digest is recorded inside the replay record, so the freeze is measurable rather than asserted.

| The sample | What it reproduces | Reproduced |
| --- | --- | --- |
| RS-01 | the evidenced specimen's own numbers (2021-02-01 / 2026-05-05 → 2191 / 1919 → `PERIOD_NOT_EXCEEDED`), tied to the register's own demonstration | yes |
| RS-02 | a clear breach of the arithmetic (`PERIOD_EXCEEDED`) | yes |
| RS-03 | the withheld sixth-anniversary day | yes |
| RS-04, RS-05, RS-06 | the clamped leap-day anniversary and the two days either side of it | yes |
| RS-07 | a reference date preceding the printed date | yes |
| RS-08 | a report contradiction (`CONTRADICTED`) | yes |
| RS-09 | a blank printed value (`EXTRACTION_UNRESOLVED`) | yes |
| RS-10 | the single absence path (`ABSENT_FROM_REPORT`) | yes |
| RS-11 | a section that was never inspected | yes |
| RS-12 to RS-16 | the five refusals the sample covers: presentation, event-date mapping, affirmative element, admission, jurisdiction | yes |
| RS-17 | collection-record isolation: two records, two comparisons, no merged value | yes |

Two independent derivations of the arithmetic agree on the record. The reviewer accumulates whole days a year and
a month at a time from `0001-01-01`; the specification's helper uses a civil-day formula. Their numbers agree with
each other and with the register's own demonstration of the specimen.

**Independence, stated honestly.** It is *procedural*: a different derivation path, from different inputs, frozen
before comparison. It is **not** a second human reviewer, the same execution context authored both sides, and it
is not independent legal review. Those limits are recorded in the replay record rather than glossed. The report
excerpt is the register's recorded reading — the order does not open or re-parse the specimen PDF, because that
would be a new extraction and the register's evidence route is the accepted one.

**No disagreement survives, and none is hidden.** No *substantive* disagreement ever arose: the reviewer's numbers
matched the evaluator's. Four defects in the comparison harness itself were found and corrected during the run,
and all four are recorded in the verdict and in section 8 below.

## 6. Deliverable 4 — the consumer language

All five templates of the pinned explanation surface were exercised, each through a fixture that genuinely reaches
its state, and each rendered **into the validation record only**.

| Template | Reaches its state | Finding label | The four mandatory qualifications carried verbatim | Affirmative overstatements |
| --- | --- | --- | --- | --- |
| `PERIOD_EXCEEDED` | FX-01 | none | 4 of 4 | 0 |
| `PERIOD_NOT_EXCEEDED` | FX-02 | none | 4 of 4 | 0 |
| `BOUNDARY_CASE_EXACTLY_AT_SIX_YEAR_ANNIVERSARY` | FX-03 | none | 4 of 4 | 0 |
| `UNRESOLVED` | FX-09 | none | 4 of 4 | 0 |
| `THE_NAMED_REFUSALS` | FX-29 | none | not applicable by design — a refusal carries the reason and the boundary of the refusal only | 0 |

Every rendered explanation carries the citation, the printed location and value it rests on, what the arithmetic
returns, why the confidence class is limited, the unresolved qualifications, and the distinction between the
report's assertion and independently verified truth. Of **27 overstatement-token occurrences, 0 are affirmative**:
each one sits inside a sentence that forbids it (for example "…the provision applied to the debt… does not
state"), and every occurrence is recorded with its classification so the finding can be re-checked. **No surface
is created**: report checking remains "not yet available", the packet stays ineligible, and nothing may be shown.

## 7. Criterion by criterion — the scoped Gate 5.6 verdict

The gate is quoted verbatim from the amended document at line 170, with its PHASE5-001S amendment clause present.

| Gate 5.6 clause | State | Evidence |
| --- | --- | --- |
| 1. every test passes | **MET** | 33 fixtures over 15 of 15 categories with 0 mismatches; 8 negative tests with 0 failures; 5 templates with 0 failures; the leap-day property over 49 starts with 0 counterexamples |
| 2. independent replay reproduces each sampled result | **MET** | 17 of 17 samples reproduced; 0 disagreements; the reviewer's expectations frozen at `DDA0CE25…` before any evaluator run; the reviewer's independence measured and its limits recorded |
| 3. no known false positive/negative category remains unexplained | **MET** | every failure, refusal, status, boundary and isolation category is exercised and explained; the 4 material comparator differences are explained and **not adopted**; the defects found while executing this order are recorded with causes, and none is a behavioural defect of the evaluator |
| 4. rule corpus, source crosswalk, tests and explanation templates share the same immutable versions | **RESERVED AND NAMED, NOT SATISFIED** | the amended clause's pre-admission measurement is recorded in full and holds (11 of 11 pins, the pre-admission identity `CA-NS-CRA-S10-3-C-LIMB-1@PRE-ADMISSION-C24CA3FD3AA3`, and the digests of the crosswalk, the tests and the templates). The production admission identity and version do not exist before Gate 5.7, and the order directs that this criterion be **named as reserved and not satisfied rather than passed** |

| Gate tally | |
| --- | --- |
| gate criteria | 4 |
| met | 3 |
| reserved and named, not satisfied | 1 |
| withheld | 0 |

**Verdict:** `PASSED_FOR_THIS_SCOPE ON THE THREE CRITERIA THIS SCOPE CAN MEET — WITH THE VERSION-SHARING CRITERION RESERVED AND NAMED AS NOT SATISFIED: GATE 5.6 IS NOT MET IN FULL FOR THIS SCOPE, AND PROGRESSION TO GATE 5.7 IS NOT PERMITTED BY THE PLAN UNTIL THE NAMED RESERVATION IS RESOLVED`

The order's own eight acceptance criteria are stated in full in the verdict record. Seven are `MET`; the eighth —
the preservation and custody criterion — is stated there as claimed on the measurement this order's own
preservation records hold, which the verification harness then measures and reports.

| Order acceptance criterion | State |
| --- | --- |
| 1. the fixture suite covers every named category, each fixture states its state, every synthetic fixture is labelled | **MET** |
| 2. the negative tests are run, recorded and name what they forbid, claiming no absent capability | **MET** |
| 3. the independent replay reproduces each sample, the reviewer's independence is recorded, every disagreement is reconciled or recorded as unresolved | **MET** |
| 4. the language validation exercises every template at its pinned digest, including the withheld-boundary template | **MET** |
| 5. the verdict quotes the gate as amended, states each criterion with its evidence, and names what it cannot meet | **MET BY THE VERDICT RECORD** |
| 6. no finding class is implemented, emitted or implied, and no consumer-visible output is produced | **MET** |
| 7. no harness writing into a prior package is run, and the retained artifact is read at its digest or not at all | **MET** |
| 8. preservation and custody show no earlier artifact changed outside its own package and no baseline overwritten | **CLAIMED ON MEASUREMENT** — measured and reported in section 9 |

## 8. Defects and remaining limitations

**No behavioural defect was found in the evaluator.** Four defects were found in **this order's own builders**,
each discovered by a run, each recorded with its cause, and none repaired by weakening an assertion.

| | Found by | What it was | How it was repaired |
| --- | --- | --- | --- |
| D-1 | the fixture-suite run | `FX-32` declared an empty per-record projection although the fixture's own stated requirement says the facts are resolved when only the admission gate fails | the expectation was corrected to the specification's layer rule and to the fixture's own requirement — a **stricter** assertion, not a weaker one |
| D-2 | the negative-test run | `N-03` scanned the whole returned record for `PROBABLE_VIOLATION` without excluding the field in which the evaluator declares that label forbidden | the scan was narrowed to the record minus that declaration, the same exclusion the fixture suite already used |
| D-3 | the negative-test run | `N-08` compared the applicability state with a literal that omitted the record's own parenthetical | the comparison became a prefix test and the measured literal is recorded |
| D-4 | the independent-replay run | the comparison harness compared array-valued fields by **object identity**, and compared two reviewer-only derived keys against evaluator fields that do not exist | value equality was used, both reviewer-only keys were given recorded readings, and the reviewer's tie to the register was checked against the register. **No substantive disagreement ever existed** — every underlying value already matched |

Remaining limitations, all carried forward rather than closed:

- The report excerpt the reviewer read is the **register's recorded reading**; the specimen PDF is not opened or
  re-parsed by this order.
- The reviewer's independence is **procedural**, not that of a second person.
- The arithmetic layer was exercised through a **synthetic in-memory copy** of the record marked admitted, because
  the record as it stands is not admitted and refuses at the admission gate. That copy admits nothing, creates no
  coverage and authorises no finding class, and nothing was emitted.
- The **emission path on an admitted rule record is unexercised**: it is named, not passed. It cannot be
  demonstrated before Gate 5.7 admits a rule, and this order may not simulate it by admitting one.
- The second limb, the effective period and the anniversary-boundary question remain unresolved and restrictive,
  exactly as the rule record left them, and no calculation convention has been promoted to a requirement of the text.
- The four material differences with the PHASE5-001I-A internal comparator remain recorded and not adopted; its
  comparator was neither conformed nor run, and its suite was not re-run.

The exact blocker, in one sentence: **Gate 5.6 clause 4 cannot be satisfied before Gate 5.7 assigns the production
identity and version, and Gate 5.7 follows a successful Gate 5.6.** The impasse is a sequencing reservation
created by the amended gate text read with this order's own instruction; it is not a defect in the evaluator, in
the rule record or in this scope's evidence. Both readings of the clause are recorded in the verdict, the strict
one adopted, and the smallest permitted action — an owner instrument on the reading, never a request to assign a
version — is named in `next_work_order.json`.

## 9. Preservation, custody and verification

| Check | Result |
| --- | --- |
| Pre-existing files baselined before this order wrote anything | **527** |
| Pre-existing files changed | **0** — this order amends no governing document and edits no earlier artifact; it carries no amendment authority by design |
| Pre-existing files missing | **0** |
| Earlier baselines or manifests overwritten | **0** |
| Write destinations inspected before running | every script of this order writes only inside `SOURCE_CAPTURES\PHASE5-001T`; the inherited internal-validation suite was inspected and never run |
| The historical records left untouched | the withheld Gate 5.5 verdict `B3A019E6…`, the successor Gate 5.5 verdict `1B764B4D…`, the owner decisions and the custody supplement (`E4920411…` → `6D8E84E0…`) are read-only to this order, and their digests are re-measured |
| The retained PHASE5-001I-A artifact | read at its digest only, never executed, imported or rewritten; its passing tests are evidence for nothing |
| Builders re-run and compared | every builder of this order was re-run and its output compared byte-for-byte: **6 builders, 7 generated artifacts, 0 unstable** |
| The order's own verification | **53 checks, 0 failures — `ALL PHASE5-001T CHECKS PASSED`**, recorded in `verification_results.json` along with the two harness records read back at their final digests |
| Custody manifest | **549 files** recorded with their digests, and the manifest re-measures clean against the workspace |
| Added by this order | **25 files**: 24 inside `SOURCE_CAPTURES\PHASE5-001T` and this narrative. Nothing else was added anywhere |
| Corpus-wide state | unchanged: Gate 5.6 unpassed corpus-wide, 0 admitted governed rules, 0 permitted findings, no row promoted, no findings record touched |

## 10. The next bounded step — the exact blocker, and the draft that would follow it

`next_work_order.json` records `order_issued: false`. It states the blocker, the rule that blocks progression
(a later phase may begin for a named scope only when every preceding gate carries a passing verdict), the two
readings of the clause, and the smallest permitted action. It also keeps the **Gate 5.7 draft** — deliverables,
exclusions, stop conditions and acceptance criteria — clearly marked **not issued and not begun**, so that nothing
is lost while nothing is authorised. The draft reserves the identifier `PHASE5-001U` and records that, if the owner
uses that identifier for another order first, the reservation is superseded and recorded as such — which is exactly
what happened to the draft that reserved `PHASE5-001S`.

## 11. Closing status

```text
DELIVERABLE 1  fixture suite           33 fixtures | 15 of 15 categories | 0 mismatches
DELIVERABLE 2  negative tests          8 tests | 0 failures | each names what it forbids
DELIVERABLE 3  independent replay      17 of 17 samples reproduced | 0 disagreements | frozen first
DELIVERABLE 4  consumer language       5 of 5 templates | 0 finding labels | 0 affirmative overstatements
DELIVERABLE 5  records                 baseline, input verification, preservation, custody, verification
DELIVERABLE 6  verdict                 Gate 5.6: 3 of 4 clauses met | clause 4 reserved and named, not satisfied

SCOPE            SCOPE-CA-NS-CRA-S10-3-C-LIMB-1-PR01-LASTPAYMENT only
IDENTITY         CA-NS-CRA-S10-3-C-LIMB-1@PRE-ADMISSION-C24CA3FD3AA3
PRODUCTION ID    RESERVED_TO_GATE_5_7 — not assigned, not invented, named rather than passed
GATE 5.6         NOT MET IN FULL FOR THIS SCOPE — progression to Gate 5.7 not permitted
ADMISSION        0 rules admitted | 0 findings permitted | nothing emitted
CONSUMER         no consumer-visible output of any class | report checking remains "not yet available"
PRESERVATION     527 files baselined | 527 unchanged | 0 changed | 0 missing | 25 added | 0 overwritten
VERIFICATION     53 checks | 0 failures | ALL PHASE5-001T CHECKS PASSED
CORPUS-WIDE      unchanged and unpassed
NEXT             the exact blocker, the smallest permitted action, and a Gate 5.7 draft kept unissued
```

The historical preservation failure of PHASE5-001R stands recorded, unauthorised and unrepaired, covered
prospectively by Owner Decision 1 and by nothing else. No rule was admitted, no coverage or candidate was created,
no finding class was authorised, and no result of any kind was produced for any person.