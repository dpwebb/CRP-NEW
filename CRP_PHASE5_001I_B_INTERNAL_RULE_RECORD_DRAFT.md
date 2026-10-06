# CRP PHASE5-001I-B — Internal Rule-Record Draft for `CA-NS-CRA-S10-3-C-LIMB-1`

| Field | Value |
| --- | --- |
| Document | PHASE5-001I-B completion record — a bounded, internal **draft** rule record, its field crosswalk, its prerequisite assessment and its custody records |
| Repository | https://github.com/dpwebb/CRP-NEW.git |
| Local workspace | `C:\CRP-NEW` |
| Work order | `PHASE5-001I-B` — owner-issued in conversation, as preparation for admission (PROD-003 §11; PHASE5-001I-A §12) |
| Rank of this document | 6 — an Active Work Order record. It admits no rule, creates no coverage, authorizes no finding and passes no gate. |
| Effective date | 2026-09-30 |
| Evidence package | `SOURCE_CAPTURES\PHASE5-001I-B\` |
| Artifacts | `rule_record_draft.json`, `field_crosswalk.json`, `prerequisite_assessment.json`, `input_hash_verification.json`, `scope_and_custody_reconciliation.json`, `preserved_files_before.json`, `file_custody_manifest.json` |
| Read-only inputs | the governing contracts, the PROD-003 records, the PHASE5-001I-A records and implementation, the PHASE5-001O ledger and gate records, and the recorded legacy system at `C:\Users\webbd\crp-credit-app` |
| Legacy access mode | **read-only, in place**: nothing copied, moved, renamed, written or transmitted |
| Modified inherited artifacts | **none.** This order repairs nothing, re-runs no inherited step and overwrites no historical manifest |
| Deployment | none. No upload, no hosting, no consumer-data transmission, no billing, no authentication, no external report processing |

## The answer in one table

| Dimension | Value |
| --- | --- |
| What this is | a **draft** rule record for one unit, one limb and one jurisdiction, assembled from existing materials only |
| What it is not | not an admitted rule, not the governed corpus, not the deterministic specification, not gate evidence, not coverage, not a finding, not consumer-visible |
| Unit | `CA-NS-CRA-S10-3-C-LIMB-1` — first limb only — `CA` / `CA-NS` — `PR-01` only |
| Accepted statute | `s. 10(3)(c)`, Consumer Reporting Act (Nova Scotia), R.S.N.S. 1989, c. 93 — source entry `CRP-LSRC-0354`, owner acceptance `OWNER_ACCEPTED_LEGAL_AUTHORITY` |
| Legacy rule reference | `ca-ns.cra.s10_3_c.debt_retention_6y` (admitted artifact `rules.canada.ts`, SHA-256 `90A05625…74CF`) |
| The field it reads | the printed `Last Payment Date` **inside a Collections collection record** → drafted as a **collection-scoped** fact; the admitted field name `tradeline.lastPaymentDate` is **not** silently substituted |
| The reference date | the printed `Request Date` header value on all 22 pages, recorded as a **convention pending admission**, never a statutory or event date |
| Ceiling | `OBSERVATION_CLASS_ONLY_UNTIL_THE_OWNER_DECIDES_AT_GATE_5_4`; `VIOLATION` unavailable in all circumstances; `PROBABLE_VIOLATION` not authorized |
| Classification | the recorded legacy `D3` / `REPORT_RELEVANT_BUT_NOT_DETECTABLE` / `observation` classification is **retained**, and the direct-report §4 divergence is described without overriding it |
| Gate effect | **none.** Gate 5.3 stays reached for one candidate and passed for none; 5.4, 5.5 and 5.6 remain `NOT_STARTED`; 5.7 remains `NOT_REACHED`; 0 admitted rules and 0 permitted findings |
| Input verification | 97 input-hash rows, 82 matching a recorded digest, 2 rows differing on the one change an inherited record already carries (the owner amendment), 0 unexplained mismatches; 12 quoted clauses re-read at their recorded lines, 0 failures |
| Custody reconciliation | the four pre-existing changes reconciled: **1 authorized in name** (the build plan, by the owner amendment), **1 recorded but unauthorized by any owner instrument** (the PROD-003 narrative repair), **2 outside the order's own authored whitelist** (PROD-003's refreshed outputs, one of which now reports a failing check); four further discrepancies recorded and left in place |
| Preservation | `PRESERVATION HELD` — 417 inherited files, 0 changed; 8 files added, all of them this order's own; 0 added outside the permitted set; 0 missing |
| Draft validation | 35 checks, 0 failures — `ALL PHASE5-001I-B DRAFT CHECKS PASSED` |
| Smallest next action | one owner decision note settling the three Gate 5.3 conditions for this candidate (the single-specimen boundary, the printed-field seating, the register disposition) plus the ceiling decision; then the Gate 5.4 rule-record order |

## 1. What the owner authorized, and what this order did

The owner authorized `PHASE5-001I-B` as **an internal rule-record draft** — preparation for admission, not
admission itself — with the gate sequence preserved and no gate-completion credit. The owner also decided, in
the same message: the legacy statute remains owner-accepted legal authority; the `D3` / observation
classification is retained; `PROBABLE_VIOLATION` and `VIOLATION` are not authorized; missing historical
provenance does not invalidate the accepted statute; missing operational applicability information must remain
explicit; and existing materials only — no new legal research, no consumer-report retrieval, no external
transmission, no consumer-visible output.

This order read the governing contracts, the PROD-003 records, the PHASE5-001I-A implementation and
verification records and the PHASE5-001O ledger and gate records. It re-verified every input digest the
inherited records recorded (`input_hash_verification.json`), and re-read each quoted clause at its recorded
line. Before drafting, it reconciled the four existing-file changes PHASE5-001I-A reported against the
whitelist that order actually carried (§5). It then drafted the rule record, the field crosswalk and the
prerequisite assessment, validated them against the existing contracts and the implemented vocabulary (§7),
measured its own preservation (§8), and left every inherited artifact exactly as it found it.

**The draft specifies, in the order the owner asked for it:**

| # | The owner required | Where it is drafted | State |
| --- | --- | --- | --- |
| 1 | exact accepted statute and legacy rule references | `rule_record_draft.json` §1 | resolved from existing records |
| 2 | `CA` / `CA-NS` applicability and explicit selection | §2 | resolved; selection is mandatory and never inferred |
| 3 | first last-payment limb only; default-date limb excluded | §3 | resolved; the second limb is explicitly unseated |
| 4 | printed Collections `Last Payment Date` mapped to a **collection-specific** fact | §4; `field_crosswalk.json` | resolved as to what is read; **not** seated as the admitted tradeline field |
| 5 | `Request Date` as the evidenced reference date, with its meaning and limits | §5; crosswalk | resolved as to meaning; the *use* is a convention pending admission |
| 6 | calendar-year calculation, leap-day convention, anniversary boundary — conventions distinguished from requirements | §6 | partly established; conventions are listed separately and left for admission |
| 7 | effective-period applicability, else a timing qualification and no unqualified conclusion | §7 | **unresolved / missing evidence**; the qualification is mandatory and drafted verbatim |
| 8 | the recorded direct-report exception and its relationship to legacy `D3` | §8 | recorded, **not relied on**; the conflict is described and the owner's observation decision governs |
| 9 | extraction statuses and comparison outcomes as separate fields | §9; crosswalk | resolved; the two vocabularies are disjoint and neither is a finding |
| 10 | observation-only output eligibility and every unresolved dependency | §10 | observation-only; 7 inherited plus 6 further dependencies listed |
| 11 | the exact-specimen boundary | §11 | one specimen; structural similarity admits nothing |
| 12 | required evidence for Gates 5.3–5.7, existing versus missing | §12; `prerequisite_assessment.json` | inventory complete; this draft is gate evidence for nothing |

## 2. The restriction, recorded rather than worked around

Three recorded clauses govern whether this work may be done at all, and all three were re-read at their own
line in their own file (`input_hash_verification.json`, clause rows Q-1 to Q-12):

```text
CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md (rank 5), section 3, line 45:
  "Work proceeds in the following order. A later phase cannot begin before its stated gate passes."

CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md (rank 5), section 3, Phase 5.4:
  "Build a candidate-to-rule-unit crosswalk."

CRP_PROD_001_READINESS_AND_IMPLEMENTATION_PLAN.md (rank 6), section 9.4, line 552:
  "**Milestone M-1 — Gate 5.3 passes for the single selected unit**"
```

Gate 5.3 is reached for exactly one candidate on exactly one presentation and is passed for none
(`SOURCE_CAPTURES\PHASE5-001O\gate_reassessment_001o.json`; `SOURCE_CAPTURES\PROD-003\gate_prerequisites.json`).
Gate 5.4 has not started. Phase 5.4 work therefore does not properly begin, and **this order says so in the
artifact itself** (`prerequisite_assessment.json`, `restriction_recorded`) instead of asserting a permission it
## 3. The regulation the draft is built on, and the four things it refuses to blur

**The accepted statute.** `Consumer Reporting Act (Nova Scotia), R.S.N.S. 1989, c. 93, s. 10(3)(c)`, carried by
source entry `CRP-LSRC-0354` with owner acceptance `OWNER_ACCEPTED_LEGAL_AUTHORITY`, and by the admitted
legacy artifact `packages\backend\src\services\legalCorpus\rules.canada.ts` at SHA-256
`90A05625AFEC4F81BDEB6568249BDEE5A45C178A20026FEA9D4F50A18AF174CF` (re-verified read-only in place). The
legacy rule id is `ca-ns.cra.s10_3_c.debt_retention_6y`; its only required report field is
`tradeline.lastPaymentDate`. The admitted text is quoted verbatim in the draft:

> A consumer reporting agency shall not include in a consumer report information regarding any debt more than
> six years after the last payment was made on the debt or, where no payment was made, more than six years
> after the date on which the default in payment occurred.

The statute is used because the **owner accepted it as legal authority** — not because a legacy artifact says
so: legacy material is rank 10 and carries no authority in this repository
(`CRP_CORE_CONSTITUTION.md` §2.3). No new legal research was done, no official source was retrieved, and no
text was paraphrased into a new proposition.

**1. The limb boundary.** The unit is the **first limb only**: six years from the last payment made on the
debt. The second limb — where no payment was made, six years from the date the default in payment occurred —
is **excluded**, because the presentation prints no field the admitted text reads as that date (the record
prints `Date Assigned`, `First Delinquency`, `Date Paid/Settled`, `Date Verified` and `Last Payment Date`), and
because `whether any payment was made` is a fact the legacy record itself lists as required from outside the
report. The draft states that such a case must not be inferred, defaulted or evaluated, and must not be
reported as absent or compliant.

**2. The fact boundary.** The unit reads the printed `Last Payment Date` of a **collection** record. The draft
names it `collection.lastPaymentDate`, `COLLECTION_RECORD_SPECIFIC`, and records that the admitted rule requires
a **tradeline** field. The legacy corpus's own record states the schema fact on the other side — that
"a collection carries no such field" — so the divergence is real and recorded, not cosmetic. The draft
therefore does **not** seat the printed collection field as the admitted field: it leaves the seating to the
owner at admission and names both routes without choosing between them. It also records what the value is
*not*: not proof the payment happened, not a default date, and never a value borrowed from another record,
section or page.

**3. The reference-date boundary.** The comparison needs a point in time, and the admitted text does not name
one. The draft uses the printed `Request Date` (one identical value on all 22 pages, `2026/05/05`) but records
that use as a **convention pending admission**, because the text states a period and a start and nothing about
the measuring date. Its recorded limits are carried in full: not a statutory effective date, not an event date,
not a jurisdiction signal, not evidence that anything is reportable.

**4. The conventions/requirements boundary.** The draft separates what the text states — six years, a start at
the last payment made on the debt, and a prohibition framed as "more than six years after" — from what the
**Effective period and applicability in time.** The accepted record gives `effectiveFrom=null`,
`effectiveTo=null`, `status=in_force`, `basis=recorded_gap_commencement_not_read`, with
`LOCATOR_OR_EFFECTIVE_INFORMATION_NOT_RECORDED` among the recorded administrative limitations. The owner's
decision — that missing historical provenance does not invalidate the accepted statute — is applied, and the
draft still refuses an unqualified conclusion: the timing qualification is **mandatory** and is drafted
verbatim for the rule record to carry, and the `effective_dates_status` field is left as
`UNRESOLVED_MISSING_EVIDENCE` rather than defaulted to a commencement, a version or "in force at all material
times".

**The recorded direct-report exception, and `D3`.** The direct-report contract §4 excludes retention rules
whose clock needs a true external event "unless the only unresolved fact is that underlying historical event
and the rule satisfies the report-assertion probable-finding gate in Sections 6 and 7", and §7 makes that route
available "only after a later governed rule is admitted". The legacy classification records the opposite
conclusion for the provision as a whole: `REPORT_RELEVANT_BUT_NOT_DETECTABLE`, `D3`, `observation`,
packet-ineligible. The draft quotes both, describes the conflict, marks the exception `RECORDED, NOT RELIED ON`
and lets the owner's observation decision govern. It authorizes no finding class, and it states that if the
owner declines the exception the ceiling remains observation-class with **no finding of either class**.

**Statuses are not outcomes, and neither is a finding.** Five extraction statuses (`RESOLVED`,
`EXTRACTION_UNRESOLVED`, `UNSUPPORTED_PRESENTATION`, `NOT_A_DEBT_RECORD`, `ABSENT_FROM_REPORT`) and three
internal comparison outcomes (`PERIOD_NOT_EXCEEDED`, `PERIOD_EXCEEDED`, `UNRESOLVED`) are drafted as separate
fields with disjoint vocabularies. No comparison runs while either fact is unresolved; no status is ever
`ABSENT_FROM_REPORT` by substitution; `ABSENT_FROM_REPORT` has exactly one reachable path (a resolved section
that prints no contract debt record).

## 4. The exact-specimen boundary

Support is evidenced for **one specimen of one presentation**: `PR-01`, the Equifax Canada consumer-channel
credit report, artifact `LEG-CONSUMER-EQ-CA`, SHA-256
`E439A4BB1E43AF640DFE7867473BE0EF8EC13B2B8654F41C31138D86A107AE5F`, 96,393 bytes, 22 pages, A4, native text
on every page — re-verified read-only in place by this order.

**Structural similarity alone admits nothing.** A document that satisfies every structural predicate of the
contract but is not the evidenced specimen is refused as `NOT_THE_EVIDENCED_SPECIMEN` →
`UNSUPPORTED_PRESENTATION`. One specimen does not establish support for any other report from that bureau, and
the draft refuses: another Equifax Canada product, another report version or print date, another bureau, a
subscriber or screening document, a scan or any page without native text, a generated fixture, and an encrypted
or unreadable document.

`PR-02` (the TransUnion Canada specimen) corroborates the **field** — it independently prints its own
`Last Payment Date` — and nothing else: it prints no `Request Date` label, its sections and record blocks
differ, and no rule may be evaluated against it with `PR-01`'s locator.


internal comparator merely implements: the anniversary computed by calendar addition, the day span derived from
the two dates rather than hard-coded, the month-end clamp for a 29 February start, and the treatment of the
sixth-anniversary day as *inside* the period (the boundary case is reported, not decided, and reserved to
Gate 5.4). It records that any of these conventions may be confirmed or replaced at admission, and that none
may be presented as a requirement of the text. `PERIOD_EXCEEDED` alone is an arithmetic outcome and is not a
legal finding.


does not have. A rank-6 work order cannot override a rank-5 plan (`CRP_CORE_CONSTITUTION.md` §§2.1–2.2).

The owner anticipated exactly this and instructed that the gate sequence be preserved and that this work take
**no gate-completion credit**. The draft therefore records: no gate is passed, advanced, softened or waived;
the draft is not the governed legal-rule corpus (build plan §4 item 4), not the deterministic
fact/evaluator specification (§4 item 5), and **not gate evidence for any gate**; and `gate_5_4` remains
`NOT_STARTED` with this draft explicitly not a Gate 5.4 submission.


| Input verification | 97 input-hash rows, 82 matching recorded digests, 2 recorded differences (both the owner-authorized amendment), 0 unexplained mismatches; 12 quoted clauses re-read at their recorded lines, 0 failures |
| Custody reconciliation | 4 pre-existing changes reconciled: **1 authorized in name** (the build plan, by the owner amendment), **1 recorded but unauthorized by any owner instrument** (the PROD-003 narrative repair), **2 outside the order's own authored whitelist** (PROD-003's refreshed outputs) |
| Preservation | `PRESERVATION HELD` for this order — it adds only its own package plus this document, and changes no pre-existing file |
| Smallest next action | one owner decision note settling the three Gate 5.3 conditions for this candidate, plus the ceiling decision; then the Gate 5.4 rule-record order |

## 5. Scope and custody reconciliation: the four pre-existing changes PHASE5-001I-A reported

The owner required this reconciliation **before** drafting. It is recorded in full in
`scope_and_custody_reconciliation.json`. PHASE5-001I-A reported four pre-existing files changed: the build
plan, the PROD-003 narrative, and two PROD-003 outputs. They are reconciled here against the whitelist that
order actually carried — the owner-issued permitted-files boundary in
`CRP_PROD_003_FIRST_REPORT_REPRESENTATION_AND_RULE_CROSSWALK.md` §11 ("a new directory for the evaluator and its
tests, plus evidence records in that order's own `SOURCE_CAPTURES` package; **nothing else**"), and the file
boundary the order recorded for itself:

| Change | Recorded as | Authorization actually recorded | Reconciliation |
| --- | --- | --- | --- |
| `CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md` (`C8018331…` → `54FCECE0…`) | the owner-authorized internal-validation carve-out | an owner amendment recorded in the §6.2 form: document and clause named, replaced text quoted, replacement text stated (`amendment_text.json`), an application record with before/after digests (`amendment_application_result.json`), and a §8 Amendment History row | **authorized** — the only change with an owner instrument behind it |
| `CRP_PROD_003_FIRST_REPORT_REPRESENTATION_AND_RULE_CROSSWALK.md` (`A6F0FE43…` → `1F556779…`) | a recorded assembly repair: a displaced §10 gate row and claim sentence and a displaced closing fragment returned to their own sections, no claim added, removed or changed | **none outside PHASE5-001I-A's own records.** No owner instrument in this workspace authorizes editing another order's completion record, and the owner-issued boundary says "nothing else". The only durable statements of the repair are PHASE5-001I-A's narrative §10, its `preservation_and_change_record.json` and its custody verifier | **recorded, but unauthorized by any owner instrument.** This order does not retrofit it as authorized, and does not repair it further |
| `SOURCE_CAPTURES\PROD-003\narrative_check.json` (`BC1B3FE8…` → `51B53C87…`) | PROD-003's own narrative checker, refreshed by re-running PROD-003's own step as a regression check | none. The order's own authoring source lists only **two** pre-existing changed files, while its verifier as executed was authored by the same order to expect **four** | **outside the order's own authored whitelist**; the expectation is self-declared, not an independent boundary. The file still passes (32 of 32) |
| `SOURCE_CAPTURES\PROD-003\input_verification.json` (`A3494399…` → `115D5F9A…`) | PROD-003's own input verification, re-run once as a regression check | none, as above | **outside the order's own authored whitelist.** Its current content reports **`INPUT VERIFICATION FAILED — see failures`** (17 checks, 1 failure: `12 of 13 unchanged`, the build plan) — a durable, currently-visible consequence of the amendment, sitting inside another order's artifact |

**The authority for the PROD-003 narrative repair and the refreshed outputs, stated plainly.** The repair has
no authority record other than PHASE5-001I-A's own; the refreshes have none at all, and were not named in the
whitelist that order wrote for itself. The amendment to the build plan is the only one of the four with an
owner instrument (the §6.2 quoted-replacement form plus an Amendment History row). Recorded honestly:

- the repair was made to fix a real structural defect found while reading, and it added, removed and changed
  no claim — but finding a defect does not confer authority to edit another order's record, and the repaired
  document's own checks passed at PROD-003's date and still pass, so no recorded acceptance criterion required
  the repair;
- PROD-003's own `file_custody_manifest.json` still records its narrative at the **pre-repair** digest
  `A6F0FE43…`, 49,453 bytes, while the document now measures `1F556779…`, 49,451 bytes. That is a durable,
  measurable inconsistency inside PROD-003's own custody record, created by a later order. **This order
  records it and deliberately leaves it in place**: repairing it would overwrite a historical manifest, which
  the owner forbade;
- the two refreshed outputs are PROD-003's artifacts rewritten by another order. One of them now carries a
  failing check attributable to the amendment, while PROD-003's own recorded verdicts stand as the records of
  their own date and are neither re-claimed nor rewritten here.



### 5.1 Further custody discrepancies found while reconciling, recorded and not repaired

1. **The order's whitelist artifact does not exist.** PHASE5-001I-A's narrative §5 states that
   "`permitted_files.json` and `implementation_manifest.json` record the inventory by digest", and its §11 run
   table lists them as step 4's output. **Neither file is present in the artifact set.** The reason is
   measurable: in `build_001i_a_governance_records.cjs` the body of its `inventory()` helper is displaced — the
   statements that compute `implementationFiles` and `evidenceFiles`, the two `write(...)` calls and the two
   `console.log` calls all sit inside the function body, while the function's own tail
   (`walk(directory); return out; }`) sits at the end of the file. The file parses (`node --check` exits 0) and
   runs to exit 0, so the chain's step 4 — which is pass-or-fail on exit code only — reported success while the
   two artifacts were never written. The same displaced-block defect class that PHASE5-001I-A repaired in
   PROD-003's narrative is present, unrepaired, in the order's own builder. **This order records it and repairs
   nothing**: the owner forbade further repairs to those artifacts in this order, and the whitelist that the
   reconciliation was asked to use therefore had to be reconstructed from the order's own authoring source and
   its executed verifier, which is exactly the self-declaration problem the reconciliation exposes.
2. **A stale count in the order's narrative.** `identifier_scan.json` records `files_scanned: 50`,
   `finding_count: 0`. PHASE5-001I-A's narrative §10 and its §11 step 6 row both say "39 files scanned". The
   order's narrative checker tests only that the narrative names `identifier_scan.json` and that the finding
   count is 0, so the figure was never tied to the record it cites. The substantive claim (0 findings) is
   verified; the count is stale. Recorded, not corrected.
3. **An inspection execution performed by this order, measured and disclosed.** Reading the inert builder
   required running it once. It wrote the three records it can still reach (`gate_sequence_assessment.json`,
   `classification_record.json`, `presentation_boundary.json`) and no others. All 51 digests recorded in
   PHASE5-001I-A's `file_custody_manifest.json` were then re-measured: **0 differ**, so no content changed and
   nothing was overwritten. The execution is disclosed here rather than left implicit.
4. **The date-scoped reading of PROD-003's custody step, re-measured.** PROD-003's own
   `preservation_and_change_record.json` (unmodified) records 342 baselined files, 341 unchanged, one change
   (the readiness plan it amended) and no additions. PHASE5-001I-A re-measured that baseline instead of
   re-running the step — because re-running it would overwrite PROD-003's record of its own date — and read
   340 unchanged, 2 changed and 50 additions. **This order re-measures the same baseline again at its own date**
   and reads **340 unchanged, 2 changed, 82 additions** against 424 files present; it does not re-run
   PROD-003's verifier, and it neither re-claims nor rewrites PROD-003's verdict. The additions reconcile
   exactly rather than contradicting the earlier reading: 22 are PROD-003's own artifacts (its baseline
   excludes its own package and narrative by construction), 47 are recorded in PHASE5-001I-A's custody
   manifest, 7 are this order's, and 6 are recorded by neither manifest because each is an order's own
   manifest, its own baseline or its own `validation_results.json` — files no manifest can list. **47 plus 3
   is exactly the 50 PHASE5-001I-A recorded.**
5. **Nothing was retroactively authorized.** Every claim above is a reading of the record as it stands. No
   historical manifest was overwritten, no verdict was re-claimed, and no unapproved change was relabelled as
   authorized.

## 6. Input hash verification

`input_hash_verification.json` verifies **97** input digests and re-reads **12** quoted clauses.

| Measure | Result |
| --- | --- |
| input-hash rows | 97 |
| rows matching the digest an inherited record recorded | 82 |
| recorded differences, both explained | 2 — both are the build plan, differing from the digest PROD-002 recorded (`C8018331…`) because the owner amendment's own application record states that same before/after pair |
| **unexplained mismatches** | **0** |
| quoted clauses re-read at their recorded line | 12 (build plan lines 45 and 143, the readiness plan line 552, the carve-out and the qualified item 5, the amendment history row, the Gate 5.3 text, the legacy classification lines 2443, 2448 and 2449, and the legacy governance contract lines 130 and 144) |
| quoted-clause failures | **0** |
| files measured but not previously digested | the legacy governance contract and five register records, now recorded for the next order |

The verification covers the owner's own instruments, the PROD-003 register, crosswalk, gate record and
extraction evidence, every PHASE5-001I-A artifact in its custody manifest, the four pre-existing changes, the
implementation vocabulary, the PHASE5-001O ledger row and gate reassessment, and the legacy corpus artifact and
both consumer specimens — the last three read **read-only, in place**, with nothing copied into this
repository.

## 7. Validation of the draft against the contracts and the implementation

The draft was validated **by measurement, not by assertion**. Thirty-five checks were run over the draft, the
crosswalk, the prerequisite assessment and this narrative, and the results are recorded in
`scope_and_custody_reconciliation.json` under `draft_validation`:

| Group | What the checks compare | Checks |
| --- | --- | --- |
| artifact integrity and admission state | every artifact parses; the machine-readable `gate_credit` is exactly `NONE`; the admission state is `NOT_ADMITTED_DRAFT_ONLY`; the artifact is not gate evidence | V-01, V-02 |
| statute, source and limb | the statute, citation, source entry, legacy rule id and accepted-source digest against the implementation's own literals; the statutory text against the implemented text; the first-limb scope; the excluded limb with no defaulted date | V-03 to V-08 |
| fields and conventions | the collection-scoped fact is **not** seated as the admitted tradeline field; the divergence is recorded; the reference date is the evidenced printed value and is a convention pending admission; the register's own field records and date meanings agree with the draft | V-09 to V-13 |
| vocabularies | the five statuses and three outcomes equal the implementation's exported vocabularies exactly, are disjoint, and neither is a finding | V-14 to V-16 |
| arithmetic and boundary treatment | the comparator is executed and reproduces `1,919` against `2,191` and `PERIOD_NOT_EXCEEDED`; a 29 February start clamps to 28 February in a non-leap sixth year; the clamp and the anniversary boundary appear as **conventions**, never as requirements | V-17 to V-20 |
| effective period | the field is `UNRESOLVED_MISSING_EVIDENCE`, the qualification is `MANDATORY` and the unqualified conclusion is `PROHIBITED` | V-21 |
| exception and classification | the direct-report §4 exception is quoted and marked `RECORDED, NOT RELIED ON`; the legacy `D3` / `REPORT_RELEVANT_BUT_NOT_DETECTABLE` / `observation` / packet-ineligible classification is retained | V-22, V-23 |
| ceiling and specimen | observation-only ceiling with no finding class available; the evidenced specimen digest; "structural similarity alone admits nothing" | V-24, V-25 |
| presentation contract | the checked-in presentation contract module's own field names, page count, page size and labels | V-26 |
| gate assessment | Gate 5.3 completability answered for the exact-specimen boundary with its three conditions; the measured gate state unchanged; the draft supplies no gate evidence for any of the five gates; the comparator is not adopted and the internal tests are not Gate 5.6 evidence | V-27 to V-30 |
| input hashes | the verification verdict, with no unexplained mismatch and no clause failure | V-31 |
| narrative completeness and forbidden claims | every required section present; the reconciliation disclosed as unauthorized where it is; and no claim of a passed gate, an admitted rule, an authorized finding or an available report-checking surface | V-32 to V-35 |

**Result: 35 checks, 0 failures — `ALL PHASE5-001I-B DRAFT CHECKS PASSED`.** Two drafting corrections were
driven by the checks and are disclosed rather than hidden: the gate-credit value was separated from its
explanation so the machine-readable field reads exactly `NONE`, and the presentation-contract comparison was
made against the contract module's own exported field names rather than assumed ones.

**What these checks establish, and what they do not.** They establish that the draft is internally consistent
with the governing contracts and with the implemented vocabulary, and that its conventions are labelled as
conventions. They do **not** establish legal correctness — the owner accepted the legal/source determinations,
and no legal content was verified here. They are **not** the independent validation Gate 5.4 requires, which
verifies faithful transcription and mapping by a reviewer who is not the author, and they are **not** Gate 5.6
evidence.



## 8. Preservation and custody of this order

`preserved_files_before.json` was captured **before this order wrote anything**, excluding only its own
package and this document. `file_custody_manifest.json` then records every artifact this order wrote, with its
byte count and digest, after the last one existed.

| Measure | Result |
| --- | --- |
| inherited files baselined | 417 |
| pre-existing files changed | **0** |
| files added by this order | 7 artifacts in `SOURCE_CAPTURES\PHASE5-001I-B\` plus this document — 8 in total, counted at the custody-manifest step |
| files added outside this order's permitted set | **0** |
| files missing against the baseline | **0** |
| admitted legacy artifacts re-verified | 34 of 34, digests re-measured read-only against `admitted_artifacts.json` and matching |
| consumer specimens re-verified | `PR-01` and `PR-02`, digests unchanged, read read-only in place |
| generated regression corpus | 461 PDFs, 23,627,410 bytes — the recorded reading, re-measured exactly |
| legacy files created, deleted or modified | **0** |
| inherited artifacts repaired or rewritten | **0** |
| written outside `C:\CRP-NEW` | nothing |
| verdict | `PRESERVATION HELD` |

**One count that looks different and is not.** A naive recursive count of the legacy corpus directory returns
462 files and 23,639,181 bytes, where every recorded reading says 461 and 23,627,410. The difference is the
corpus directory's own `MANIFEST.json` (11,771 bytes, last written 2026-09-26, before any CRP order), which the
recorded measure excludes because it counts the generated PDFs
(`Get-ChildItem -Recurse -File -Filter *.pdf`). The 461 PDFs match the recorded byte count exactly, so nothing
in the corpus changed.

**What this order deliberately did not touch.** It did not modify the extractor, the evaluator, the
application, the corpus, any existing register or any governing document. It did not overwrite any historical
manifest, re-run any inherited verification step, or repair the four artifacts §5 reconciles — including the
inert PHASE5-001I-A governance builder and the stale PROD-003 outputs. Everything it found is recorded and left
in place, so the next order inherits an accurate picture rather than a tidied one.

## 9. Gate status and the smallest next action

| Gate | Status after this order | Basis |
| --- | --- | --- |
| 5.1 | met with recorded administrative limitations (unchanged) | PHASE5-001O gate reassessment, re-measured |
| 5.2 | advanceable from the accepted corpus (unchanged) | ledger row `CRP-LSRC-0354`; its mapping route is evidenced by PROD-003 |
| 5.3 | **reached for one candidate on one presentation — not passed**, and not reached for any other candidate | the three conditions below are what stands between the record and a pass for this one candidate |
| 5.4 | **not started** — this draft is not a Gate 5.4 submission and is not gate evidence | the draft cannot present "no unresolved affirmative element" while the effective period and the exception are unresolved |
| 5.5 | not started | no admitted rule record exists to rebuild the evaluator from |
| 5.6 | not started | no independent replay; the 41 internal tests are not Gate 5.6 evidence |
| 5.7 | not reached | 0 admitted governed rules, 0 permitted findings, no finding class created |

**Can Gate 5.3 be completed for this exact-specimen boundary?** Yes — **for this one candidate on this one
byte-pinned specimen**, and not for a report class or any other candidate. The representation and its exact
location already exist, are recorded and were independently re-measured. What is missing is not representation
evidence but three owner records: (1) the single-specimen boundary settled — accepted in writing, or answered
with a second independently authorized specimen; (2) the determination of which printed field represents the
admitted required field, resolving the tradeline/collection divergence; and (3) the register disposition for
`CRP-LSRC-0354` cleared from `UNRESOLVED` / `REPORT_EVENT_DATE_MAPPING_UNVERIFIED` under its recorded clearing
authority. A pass there would still be **a pass for one candidate, not a whole-gate pass**, and it would admit
nothing.

**The smallest next action needed for admission:** one owner decision note — an amendment or recorded
direction — settling those three conditions for this candidate and recording the permitted ceiling (the
owner's stated position already being the retained `D3` / observation ceiling, with no `VIOLATION` and no
`PROBABLE_VIOLATION`). Nothing else can be completed before it: Gate 5.4 may not begin until Gate 5.3 passes,
the rule record cannot be finalised while the effective period and the exception are unresolved, the evaluator
cannot be rebuilt until a rule record is admitted, and no admission is possible until a validated evaluator
exists. **This order does not make that decision, does not pre-empt it, and does not treat the draft as though
it had been made.**



## 10. Boundaries

- This document and this order admit no rule, certify no legal content and create no legal coverage. No result
  is produced for any person.
- It passes no gate, and it gives this work no gate-completion credit. Gate 5.3 remains reached for one
  candidate and passed for none; 5.4, 5.5 and 5.6 remain not started; 5.7 remains not reached.
- It authorizes neither `VIOLATION` nor `PROBABLE_VIOLATION`, and it preserves the recorded legacy `D3` /
  observation classification rather than overriding it.
- It used existing materials only: no new legal research, no consumer-report retrieval, no external
  transmission, no OCR, no fixture masquerading as a report, and no consumer-visible output of any class.
- It deployed nothing, published nothing, hosted nothing, transmitted no consumer data, uploaded no report,
  evaluated no consumer, billed nothing and added no authentication. Report checking remains "not yet
  available" for all 82 regions.
- It copied no artifact out of the legacy system and reproduced no identifier from any report's content; the
  specimen was read in place through the pointer in PROD-003's register.
- It changed no pre-existing file, repaired no inherited artifact, overwrote no historical manifest and
  re-claimed no earlier order's verdict.
- Everything recorded in §2's restriction, §5's reconciliation, §6's verification and §3's unresolved
  dependencies is a recorded limitation. None of it is a finding, a coverage claim or a promise.
