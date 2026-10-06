# CRP PHASE5-001U — Version Reservation Resolution and Scoped Gate 5.7 Admission

**Order:** PHASE5-001U · **Date:** 2026-10-01 · **Scope:** `SCOPE-CA-NS-CRA-S10-3-C-LIMB-1-PR01-LASTPAYMENT`
**Gate reached:** 5.7, scoped, with its segment-exit clause · **Evidence package:** `SOURCE_CAPTURES\PHASE5-001U\`

---

## 1. What this order was asked to do

PHASE5-001U carries an owner instrument that does two things, in this order and not in the other:

1. resolve the version-sharing reservation that PHASE5-001T recorded as the one clause of Gate 5.6 this scope could not satisfy — by settling, under owner authority, how the amended Gate 5.6 sentence measures the sharing condition for a scope whose governed rule record Gate 5.7 has not yet admitted; and
2. admit one complete rule unit for one scope at a production identity and version, if and only if all four scoped Gate 5.6 criteria then pass.

It carries no authority to change statutory text, to authorise a finding class, to clear a register row, to emit anything consumer-visible, or to pass any corpus-wide gate. Every one of those limits is recorded in the artifacts rather than assumed.

**The one pre-existing file this order changes** is the governing build plan, at the single sentence the owner named, applied once by the quoted-replacement procedure of `CRP_CORE_CONSTITUTION.md` sections 6.1, 6.2 and 6.5:

| | digest |
|---|---|
| `CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md` before | `1A7E7EA015FCF270496B915B940F8C96C4D7905CAAD22615BBD29965D040CA50` |
| the same file after | `969585C83A67FF4724DA4B202148C5218FE9CE07ECE6ED7794FA46D839519A24` |

The replacement is an **extension**: the replaced half-sentence survives verbatim inside its replacement, the replacement now occurs exactly once in the document, and no requirement was removed. One amendment-history row was appended (plan line 263).

## 2. The blocker this order inherited, and how it was resolved

PHASE5-001T left the scope short of Gate 5.7 because the Gate 5.6 sentence required the rule corpus, the source crosswalk, the tests and the explanation templates to *share the same immutable versions*, while the production identity and version are assignable only at Gate 5.7 — which follows a successful Gate 5.6. The impasse was a sequencing reservation in the amended text, not a defect in the evaluator, the rule record or the scope's evidence.

The amendment settles it by stating that the sharing condition for such a scope is the condition that the governed rule record the scope reads, the source crosswalk, the tests, and the explanation templates it reads and writes are each **pinned to one shared, verified, immutable pre-admission version identity, each at an immutable digest**; that this condition is measurable and is met or not met **before** Gate 5.7 assigns any production identity; and that a scoped Gate 5.6 verdict records the condition against that shared pre-admission identity while naming the production reservation beside it. Gate 5.7 remains the only step that assigns a production identity or version string, the requirement to name the reservation is unchanged, and no gate is passed by the clause alone.

Recorded in `SOURCE_CAPTURES\PHASE5-001U\amendment_text.json`, `amendment_application_result.json`, `owner_decision_record.json` and `version_conflict_resolution_record.json`. The amended sentence and the amendment-history row are the whole of the change.

## 3. The scoped Gate 5.6 successor — four of four, on its own re-measurement

`scoped_gate_5_6_verdict_successor.json` re-measures the same four clauses from the same artifacts against the governing sentence as amended:

| # | clause | state |
|---|---|---|
| 1 | every test passes | MET |
| 2 | independent replay reproduces each sampled result | MET |
| 3 | no known false positive/negative category remains unexplained | MET |
| 4 | rule corpus, source crosswalk, tests and explanation templates share the same immutable versions | MET on the shared pre-admission identity, with the production reservation named separately |

`every_clause_met: true`.

The predecessor `SOURCE_CAPTURES\PHASE5-001T\scoped_gate_5_6_verdict.json` is **preserved unchanged** at `86886EDBDCF6F13A29B1E10A031339FEB1A6C766D11D599DE0505B03DE4AC94C` and named in the successor as the record it succeeds. Nothing was edited, reopened or replaced in place; the successor adds the authority that was missing, not new evidence.

## 4. The Gate 5.7 verdict, scoped

The verdict is issued from measurement, not assertion. The gate sentence is read out of the amended document at the line it stands on, at runtime:

> **Gate 5.7 / segment exit:** at least one complete rule unit has been formally admitted and its evaluator passes the validation suite, or the segment reports a clear blocker that requires an owner/legal decision. Once all in-scope rules are admitted or explicitly dispositioned, this segment is complete and work may move to the next product section.

— plan line 180, read at runtime and quoted verbatim in `scoped_gate_5_7_verdict.json`.

| # | criterion (as the verdict states it) | state |
|---|---|---|
| 1 | at least one complete rule unit is formally admitted | **MET FOR THIS ONE SCOPE** |
| 2 | its evaluator passes the validation suite | **MET FOR THIS ONE SCOPE** |
| 3 | or the segment reports a clear blocker requiring an owner/legal decision | **NOT RELIED ON** — the first branch is met, so the blocker branch is not used |
| 4 | once all in-scope rules are admitted or explicitly dispositioned, this segment is complete | **NOT MET AND NAMED** — 1 rule unit admitted while the scope's remaining rows stand as they were |

`gate_tally`: 4 criteria · 2 met for this scope · 1 not relied on · 1 not met and named · **`condition_of_this_admission_met: true`** · **`segment_completion_condition_met: false`**.

All six of the order's own acceptance criteria are met (`acceptance_tally`: 6 met, 0 not met).

**Verdict, verbatim:** `PASSED FOR THIS ONE SCOPE ON THE FIRST BRANCH OF GATE 5.7 — one complete rule unit (CA-NS-CRA-S10-3-C-LIMB-1) is formally admitted at CA-NS-CRA-S10-3-C-LIMB-1@ADMITTED-v1.0.0-C24CA3FD3AA3 and its evaluator passes the validation suite — WITH THE SEGMENT-COMPLETION SENTENCE RECORDED AS NOT MET AND NAMED, THE CORPUS-WIDE QUEUE PRESERVED UNCHANGED, AND NO FINDING CLASS AUTHORISED`

The sentence this scope cannot meet is named rather than passed or omitted: the segment completes only when all in-scope rules are admitted or explicitly dispositioned, and this order touches none of the remaining rows. The blocker is reported with its smallest permitted next action, and that action is not begun or pre-judged here.

## 5. The admission

| | |
|---|---|
| immutable rule id | `CA-NS-CRA-S10-3-C-LIMB-1` |
| jurisdiction | CA / CA-NS — Consumer Reporting Act (Nova Scotia), R.S.N.S. 1989, c. 93, s. 10(3)(c), **first limb only** |
| presentation | PR-01 |
| pre-admission identity superseded | `CA-NS-CRA-S10-3-C-LIMB-1@PRE-ADMISSION-C24CA3FD3AA3` |
| **production admission identity** | `CA-NS-CRA-S10-3-C-LIMB-1@ADMITTED-v1.0.0-C24CA3FD3AA3` |
| production version string | `CA-NS-CRA-S10-3-C-LIMB-1/v1.0.0` |

**The governed rule record is not edited.** It stands at `C24CA3FD3AA38FC7C789BD29D91EAC36DCA989DE5AAD923CF88D2AEAC401F023`, still reads `NOT_ADMITTED`, still carries `RESERVED_TO_GATE_5_7`, and contains **zero** occurrences of the production identity. The assignment is recorded **by reference** in `admission_record_001u.json` and `rule_corpus_amendment_001u.json`, because that record's bytes are what the PHASE5-001Q rule, the scoped 5.4, 5.5 and 5.6 verdicts and the pre-admission identity were all derived from.

Binding is by digest: **22** substantive binding rows, **0** moved by this order (**1** is absent from this workspace by design and is reported as absent, never as matching), package digest `5CC06B6E7B247D85F605D340A5AD20F3E389D97EA3683F72A8EF97330B25FAD6` — recorded by the admission and measured after every write, **UNCHANGED**.

## 6. Counts

The four counts the plan names, recorded **separately** and each marked uncertified, read from the register's own per-row disposition column (register unchanged at `DFB78DD20AAD444A4FC5B03D0FDFF11081AD67A454AF80BBBB2CD4CB0C0F24BB`, 437 rows):

| count | value |
|---|---|
| excluded | 0 |
| unresolved | 416 |
| gap | 18 |
| refusal | 3 |

Governed counts move only by the admission, and only as far as it reaches:

| governed figure | before | after |
|---|---|---|
| governed rules admitted | 0 | **1** |
| governed coverage entries | 0 | **1** |
| permitted findings | 0 | **0** |
| authorised finding classes | 0 | **0** |


## 7. No finding class is authorised, and none is emitted

The owner instrument authorises the admission and **withholds** the finding-class decision. The recorded state is `WITHHELD — NO FINDING CLASS IS AUTHORISED`, and the ceiling therefore stays `OBSERVATION_CLASS_ONLY`, read unchanged from the pinned rule record. The PROD-003 crosswalk proposal of `PROBABLE_VIOLATION` remains **proposed and not adopted**. Report checking for this scope remains **"not yet available"**, and the order produces no consumer-visible output of any class. This is the stop condition this order carried, applied rather than worked around: if the owner withholds the finding-class decision, admit the rule record at the observation ceiling and record the limitation instead of filling it.

## 8. The corpus queue is preserved, and no corpus-wide gate moved

The queue is read, never written: the register digest is unchanged, 437 rows stand, 416 remain open, and no row was cleared, moved or re-classified — no missing work was relabelled as GAP or REFUSAL to make a criterion read better.

| gate | corpus-wide | this scope |
|---|---|---|
| 5.1 | MET with recorded administrative limitations; unchanged | — |
| 5.2 | NOT PASSED | PASSED_FOR_THIS_SCOPE |
| 5.3 | NOT PASSED | PASSED_FOR_THIS_SCOPE |
| 5.4 | NOT PASSED | PASSED_FOR_THIS_SCOPE |
| 5.5 | NOT PASSED | PASSED_FOR_THIS_SCOPE |
| 5.6 | NOT PASSED | **MET IN FULL FOR THIS SCOPE** on the successor re-measurement |
| 5.7 | NOT PASSED | **PASSED FOR THIS ONE SCOPE**, segment-completion sentence not met and named |

## 9. Preservation, custody and verification

- **Preservation:** one pre-existing file changed — the governing plan, at the one authorised amendment — with every other baselined file unchanged and none missing. Eight files appeared in the workspace after this order's baseline was captured (`.clinerules\parallel-research.md`, the `accelerated-launch\` set, `CRP_ACCELERATED_ALL_82_IMPLEMENTATION_PROGRAM.md`, `CRP_IMMUTABLE_ALL_82_WIZARD_BUILD_PLAN.md`). No command of this order writes outside its own package and the governing plan, so they are **not** this order's output; they are listed rather than ignored, and none of them is a pinned input, a register file or an earlier artifact this order must not touch. The historical preservation failure of PHASE5-001R is reported as history, preserved and unedited, and is **not** folded into this order's own result.
- **Custody:** `file_custody_manifest.json` records the digest of every file this order read or wrote, and re-measures clean.
- **Verification:** `verification_results.json` records the **45** checks this order ran over its own output — **0 failures**. They are evidence for this order's custody only and are **not** gate evidence; the scope's gate verdict is `scoped_gate_5_7_verdict.json`. Every builder that is safe to re-run was re-run and produced byte-identical output, and the harness itself is deterministic: re-running it leaves all three of its records byte-identical.
- **No write-capable command was re-run:** the five pure builders were re-run and their outputs are byte-for-byte identical; `apply_amendment_001u.cjs` — the only command that edits the governed plan — was deliberately **not** re-run, and its single application is verified by digest and by the two guards it carries (pinned-digest and already-applied). The inherited internal-validation harness was measured by digest and never executed.
- **No earlier artifact was rewritten:** the withheld PHASE5-001R Gate 5.5 verdict, the retained PHASE5-001I-A artifact, the pinned rule record, the predecessor Gate 5.6 verdict and the register all stand at their recorded digests.

## 10. Defects found while executing this order

1. the Gate 5.7 measurement module mapped the successor verdict's criterion field as `clause` where that record carries `n` and `criterion_verbatim` — corrected before the admission was written, and recorded rather than silently repaired;
2. the admission record's conformance block was initially closed as a separate statement rather than a field of the admission object — corrected before that builder ran;
3. the build script's Gate 5.6 guard was added after the admission body was authored, so the guard is exercised on every run rather than assumed.

**No behavioural defect was found in the evaluator, the rule record, the crosswalk, the tests or the explanation templates at any point in this order** (`behavioural_defects_found_in_the_evaluator: 0`).

**One observation recorded while verifying, and deliberately not repaired:** the amendment record numbers the quoted replacement `A-U-1` and the appended amendment-history row `A-U-2`, while the rule-corpus amendment record also numbers the corpus addition `A-U-2`. The two `A-U-2` identifiers live in different namespaces — the plan amendment history and the rule-corpus amendment — and each is explained in its own record. Nothing this order measured depends on either identifier, so it is recorded in `verification_results.json` rather than harmonised: harmonising it would mean changing two already-issued records to suit a naming preference.

## 11. What this order does not do, and what remains limited

It is not a corpus-wide Gate 5.7 pass and it states no corpus-wide gate as satisfied. It authorises no finding class and produces no consumer-visible output. It creates coverage for no other rule, jurisdiction, limb or presentation. It clears, moves and re-classifies no register row, including the row of the source entry it derived the unit from. It changes no statutory text and turns no probable result into a violation. It does not edit the governed rule record, does not run the inherited suite, and does not release, deploy, integrate or transmit anything.

Remaining limitations, recorded as limitations: no finding class is authorised; report checking remains "not yet available"; the admission covers one rule unit, one limb and one presentation; the segment is not complete; no corpus-wide gate state changed; the source entry keeps its own row state; and version `1.0.0` is the first version of this unit, with no later version, amendment or withdrawal described here.

## 12. The next step — issued, not begun

`next_work_order.json` issues **PHASE5-001V** for this one scope: the finding-class authorisation for the one admitted unit, together with the next scoped progression read against the preserved corpus queue. It names the single outstanding owner decision, forbids choosing it on the owner's behalf, and carries the same stop condition this order honoured — if the decision is withheld again, record the limitation rather than fill it. Nothing in the record authorises it to begin, and no part of it is performed, prepared or pre-judged here.

---

**Artifacts:** `SOURCE_CAPTURES\PHASE5-001U\` — `amendment_text.json`, `amendment_application_result.json`, `owner_decision_record.json`, `version_conflict_resolution_record.json`, `scoped_gate_5_6_verdict_successor.json`, `rule_corpus_amendment_001u.json`, `admission_record_001u.json`, `counts_001u.json`, `post_assignment_binding_verification_001u.json`, `scoped_gate_5_7_verdict.json`, `next_work_order.json`, `file_custody_manifest.json`, `preservation_and_change_record.json`, `verification_results.json`, `input_verification.json`, `preserved_files_before.json`.
**Harness:** `SOURCE_CAPTURES\PHASE5-001U\verify_and_manifest_001u.ps1` (45 checks, 0 failures) — the baseline capture `capture_001u_baseline.ps1`, the amendment module `amendment_001u.cjs`, the write-capable applier `apply_amendment_001u.cjs` (not re-run by design), the measurement modules `gate56_001u.cjs` / `gate57_001u.cjs` / `lib_001u.cjs`, and the five builders `build_001u_owner_records.cjs`, `build_001u_successor_verdict.cjs`, `build_001u_admission.cjs`, `build_001u_verdict.cjs`, `build_001u_next_order.cjs` (all re-run, all byte-identical). **Created by PHASE5-001U.**

Register rows dispositioned, cleared or moved by this order: **0**. The source entry the unit was derived from, `CRP-LSRC-0354`, still reads `UNRESOLVED` / `BLOCKED_MISSING_EVIDENCE` / `REPORT_EVENT_DATE_MAPPING_UNVERIFIED`: a certified rule does not clear the register row it came from, because that row's clearing authority is an authorised evidence route together with owner direction, and this order supplies neither.
