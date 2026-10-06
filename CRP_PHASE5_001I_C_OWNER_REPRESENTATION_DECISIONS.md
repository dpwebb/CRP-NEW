# CRP PHASE5-001I-C — Owner Representation Decisions and Supplemental Custody Reconciliation

| Field | Value |
| --- | --- |
| Document | PHASE5-001I-C completion record — the owner's representation decisions for one candidate, a scoped disposition proposal, a supplemental custody correction for PHASE5-001I-A, and this order's verification record |
| Repository | https://github.com/dpwebb/CRP-NEW.git |
| Local workspace | `C:\CRP-NEW` |
| Work order | `PHASE5-001I-C` — owner-issued in conversation |
| Rank of this document | 6 — an Active Work Order record. It amends no governing instrument, admits no rule, creates no coverage or finding and passes no gate |
| Effective date | 2026-09-30 |
| Evidence package | `SOURCE_CAPTURES\PHASE5-001I-C\` |
| Artifacts | `owner_representation_decisions.json`, `proposed_register_update.json`, `custody_reconciliation_001i_a.json`, `verification_results.json`, `preserved_files_before.json`, `file_custody_manifest.json` |
| Read-only inputs | this order's own record and every input it cites: the governing contracts, the PROD-003 records, the PHASE5-001I-A records and implementation, the PHASE5-001I-B package, the PHASE5-001K register and provenance, the PHASE5-001O ledger and gate records, the CRP_CORRECTED_LOGIC_RESCREEN_REGISTER.md, and the recorded legacy system at `C:\Users\webbd\crp-credit-app` |
| Legacy access mode | **read-only, in place**: nothing copied, moved, renamed, written or transmitted; the specimen read through the recorded pointer, by digest only |
| Modified inherited artifacts | **none.** No file outside this order's own package and narrative was created, changed or deleted |
| Deployment | none. No upload, hosting, consumer-data transmission, billing, authentication or external report processing |

## The answer in one table

| Dimension | Value |
| --- | --- |
| Decisions recorded | **six**, each with the scope it authorizes, what it does not authorize, the record it binds and the condition it leaves open |
| Scoped disposition proposed | **one register row** — `CRP-LSRC-0354` in the PHASE5-001K register — with three fields held unchanged, two free-text fields amended additively and four fields added. Applied by nobody: it is a proposal |
| Gate 5.3 | **not passed.** The representation decision for this candidate is complete; the gate stays reached for one candidate and open |
| Why it cannot pass yet | the predecessor **Gate 5.2 is incomplete** (no durable pass exists, and one of its four criteria is unmet for 409 rows), and one Phase 5.3 criterion — the intended-format inventory — is unmet |
| Gate 5.4 | `NOT_STARTED`, and it may not begin. PROD-003's recorded inference that "Phase 5.4 may therefore begin for this one unit only" is **not adopted** |
| Custody correction | PHASE5-001I-A's two asserted-but-unwritten inventory artifacts recorded with their measured cause; three unauthorized or out-of-whitelist changes to PROD-003's artifacts explained; the six files outside every manifest inventoried, attributed and explained |
| Preservation | 425 files baselined, **0 changed, 0 missing, 0 added outside this order**; the specimen, both consumer specimens and the 461-PDF corpus re-verified |
| Next work order | **one owner-issued order closing Gate 5.2's remaining acceptance work**, then the Gate 5.3 record for this candidate, then the Gate 5.4 rule-record order |

## 0. The six decisions in one table

| # | The owner decided | What it settles | What it does not do |
| --- | --- | --- | --- |
| D-1 | accept `PR-01` for the exact byte-pinned Equifax Canada consumer specimen only | the single-specimen boundary, in writing, for this narrow representation decision; internal validation support only | no report family, no consumer-upload availability, no other product, version, print date, channel or bureau |
| D-2 | use `collection.lastPaymentDate` for the printed `Last Payment Date` within its own Collections record; do not relabel it as a tradeline fact | the field seating, with the legacy field-name divergence recorded explicitly | does not seat a tradeline fact, rename the admitted field, or decide which field name the admitted rule record carries |
| D-3 | accept the demonstrated `Request Date` header mapping as the specimen's reference date | the reference date for this specimen's comparison | does not decide the legal or calculation conventions around a reference point, and treats none of them as requirements of the text |
| D-4 | clear `REPORT_EVENT_DATE_MAPPING_UNVERIFIED` only for the demonstrated fields on this exact specimen | the third Gate 5.3 condition, in the narrowest form; authorizes a scoped register update that this order proposes and does not apply | does not clear the no-payment/default-date alternative, the timing question, the exception, the ceiling or the presentation boundary |
| D-5 | retain `D3` / observation and packet ineligibility; neither `PROBABLE_VIOLATION` nor `VIOLATION` authorized | the classification and the result ceiling for this unit | creates no finding path; the crosswalk's proposed `PROBABLE_VIOLATION` ceiling is not authorized, and the section 4 exception stays recorded but not relied on |
| D-6 | accept one specimen as sufficient for this narrow representation decision | sufficiency here, and the threshold for anything wider | does not establish broader format support, a reusable locator, a second bureau, or consumer-upload availability |

## 1. What the owner authorized, and what this order did

The owner authorized `PHASE5-001I-C` as **Owner Representation Decisions and Supplemental Custody
Reconciliation**: read PHASE5-001I-B and its evidence, verify current inputs before writing, record six named
decisions, produce a scoped representation decision and proposed disposition update, reassess Gate 5.3 against
every stated criterion and the prerequisite sequence, correct the custody picture of PHASE5-001I-A on the
record, identify the next minimal action, and verify preservation and the custody of the new artifacts — with
no repairs to old narratives, no refreshed historical checks, no extractor changes, no rule admission, no
consumer-visible output, no application changes, no deployment and no external transmission or new research.

**What this order did, in the order the owner asked for it:**

| # | The owner required | Where it is recorded | State |
| --- | --- | --- | --- |
| 1 | record the six decisions | §0 and §2; `owner_representation_decisions.json` | recorded, each with its scope, non-effects, binding records and open condition |
| 2 | **A** — a scoped representation decision and proposed disposition update, naming exactly which record would change and why, with no silent reinterpretation | §3; `proposed_register_update.json` | recorded as a proposal; **applied to nothing** |
| 3 | **B** — reassess Gate 5.3 against every stated criterion and the prerequisite sequence; do not issue a gate-passed statement by owner preference alone | §4; the gate section of `verification_results.json` | assessed criterion-by-criterion: **gate left open**, representation decision complete |
| 4 | **C** — a supplemental custody correction for 001I-A: the missing whitelist and implementation manifests, the three unauthorized changes, the preserved originals and failure records, original versus current hashes with explanations, and an inventory of the six files outside existing manifests | §5; `custody_reconciliation_001i_a.json` | complete, with unknowns recorded as unknown |
| 5 | **D** — the next minimal action, with a prior gate's remaining acceptance work if a prior gate is incomplete | §8; both records | the prior gate is **Gate 5.2**, and its remaining acceptance work is named exactly |
| 6 | verify current inputs before writing | §6; `verification_results.json` | every input re-measured by digest, every quoted clause re-read at its recorded line |
| 7 | verify preservation and new-artifact custody | §6; `preserved_files_before.json`, `file_custody_manifest.json` | 425 baselined, 0 changed, 0 missing, 0 added outside this order; every new artifact with its digest |
| 8 | keep effective-period, exception and calculation-convention uncertainties separate from legal-corpus acceptance | §7 | separated explicitly; the accepted statute and its source pin are untouched |

**How the owner's decisions are recorded, stated plainly.** The instruction was issued in conversation and is
recorded here durably, because the build plan requires exactly that and forbids relying on conversation-only
decisions as certification records. The order that issued the instruction also wrote this record, so the
recorder is not independent of the instruction: that limitation is written into
`owner_representation_decisions.json` rather than hidden. Nothing here is a legal certification, an admission
or gate evidence, and nothing here substitutes for the owner-amendment form where amending a rank-4 or rank-5
instrument would be required.

## 2. The six decisions, recorded with their edges

**D-1 — the specimen.** `PR-01`, artifact `LEG-CONSUMER-EQ-CA`, SHA-256
`E439A4BB1E43AF640DFE7867473BE0EF8EC13B2B8654F41C31138D86A107AE5F`, 96,393 bytes, 22 pages, A4, native text on
every page, re-verified read-only in place by this order. Accepting it in writing discharges the second of the
two routes PROD-003's dependency D-2 offered. It is **internal validation support**: not admission of a report
family, not availability for consumer uploads. Every other document — another Equifax Canada product or
version, another bureau including `PR-02`, a scan, a page without native text, an encrypted file, a subscriber
or screening document, a training artifact, a generated fixture — keeps its refusal path
(`NOT_THE_EVIDENCED_SPECIMEN` → `UNSUPPORTED_PRESENTATION`).

**D-2 — the field.** The printed `Last Payment Date` row inside a contract debt record in the Collections
section is read as `collection.lastPaymentDate`, `COLLECTION_RECORD_SPECIFIC`, bound to that record: page 16
line 32 (record spanning page 16 lines 8–38) and page 17 line 5 (record spanning page 16 line 39 to page 17
line 11), value `2021/02/01`, normalized `2021-02-01`. The admitted rule record's required field name
`tradeline.lastPaymentDate` is **not** satisfied by relabelling, and the divergence is recorded explicitly,
including the legacy corpus's own schema note that a collection carries no such field. What stays open is which
field name the admitted rule record carries.

**D-3 — the reference date.** The printed `Request Date` header — line 1 of every page, one identical value on
all 22 pages, `2026/05/05`, normalized `2026-05-05` — is accepted as this specimen's reference date for the
internal comparison. It is not a statutory effective date, not an event date, not a jurisdiction signal and not
evidence that anything is reportable, and where the header is absent, unreadable or inconsistent the comparison
does not run. The legal and calculation conventions around a reference point stay unresolved.

**D-4 — the clearing.** Scoped to two demonstrated fields on one byte-pinned specimen, for the first limb only.
The no-payment/default-date alternative, the timing question, the exception, the ceiling, the classification,
the presentation boundary, the other five mapping IDs (`0422`, `0423`, `0424`, `0425`, `0427`), `CRP-LSRC-0194`
and every `NO_DURABLE_RESCREEN_RECORD` row are **not** cleared. The row's disposition stays `UNRESOLVED`, and no
class is inferred for it or for any other ID.

**D-5 — the classification and the ceiling.** `D3` / `REPORT_RELEVANT_BUT_NOT_DETECTABLE` / `observation` and
packet ineligibility are retained, unchanged and not overridden. Neither `VIOLATION` nor `PROBABLE_VIOLATION` is
authorized. PROD-003's crosswalk proposes a `PROBABLE_VIOLATION` ceiling conditional on the rule record
recording the direct-report contract §4 retention exception; that proposal is **not authorized**, the
conditional route is not exercised, and the §4 exception stays `RECORDED, NOT RELIED ON`.

**D-6 — the boundary of the acceptance.** One specimen is sufficient for this narrow representation decision.
Anything wider — calling the locator reusable, claiming broader format support, another product, version, print
date or channel, another bureau, or consumer-upload availability — needs a second independently authorized
specimen, evidenced, byte-pinned and tested, or a separate owner justification and authorization recorded as
its own instrument.

## 3. (A) The scoped representation decision, and the disposition it proposes

**The decision.** For `CA-NS-CRA-S10-3-C-LIMB-1` on `PR-01`, the report representation of the first limb's fact
is established: the printed `Last Payment Date` row inside a Collections contract debt record, read as
`collection.lastPaymentDate` within its own record, with the legacy field-name divergence recorded. The
specimen's reference date is established: the printed `Request Date` header. Both are located, both carry raw and
normalized values, and the second limb stays unseated with a source-grounded reason.

**The one record that would change, and why that one.** The canonical record is the durable register row for
`CRP-LSRC-0354` in `SOURCE_CAPTURES\PHASE5-001K\rescreen_register.csv` (the data row at line 355 of that file).
It is the right record because it is what Gate 5.2 and the register's own §5, §10 and §10.1 read, and because its
own `clearing_authority` column names exactly the authority the owner has now supplied:
`AUTHORISED_EVIDENCE_ROUTE (report representation) plus OWNER_DIRECTION`. Five mirror records carry the same
disposition and are itemised in `proposed_register_update.json`: `CRP_CORRECTED_LOGIC_RESCREEN_REGISTER.md`
§5/§10/§10.1, `rescreen_provenance.json` → `step_09_open_blocker_queue`, the PHASE5-001O coverage ledger's
`register_state` and `remaining_implementation_dependencies`, and PROD-003's `candidate_rule_units.json`
`report_mapping_blocked_rows` entry.

**Why the change is not a clearing of the row.** The contract's instruction for this ID is one mapping task with
two alternatives: the last-payment-date alternative and the no-payment/default-date alternative. The first is now
demonstrated; the second has no located field on this presentation. Clearing the blocker outright would assert
more than the evidence supports, so the proposal **narrows** it: `disposition`, `disposition_state` and
`blocker_type` keep their exact current values; `missing_artifact` is re-worded to the alternative that remains;
`disposition_basis` is appended to, never replaced; and four clearly-named fields are added
(`representation_cleared_for`, `cleared_by`, `clearing_scope_limit`, `not_cleared`). No vocabulary value is
invented: the register's disposition vocabulary is closed and this order adds nothing to it.

**No silent reinterpretation.** The row stays `UNRESOLVED`; it stays in the 416 and in the open-blocker queue; it
is not promoted to a candidate; no class is inferred for it or for any other ID; and the earlier unresolved
status is described and narrowed in writing rather than overwritten. The proposal is **applied to nothing** by
this order, because the record belongs to another order and this order carries no authorization to edit it. A
later owner-issued order would apply it and record its own before/after digests, dating the change when it is
made and never backdating it.

## 4. (B) Gate 5.3 reassessed, criterion by criterion, with the prerequisite chain

**The gate's own text, quoted** (`CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md` §3,
line 96): *"each proposed candidate has a verifiable report representation and exact location, or remains
explicitly unresolved/excluded with a source-grounded reason. No rule enters certification merely because a field
seems likely to exist."*

**The phase's four bullets, tested against what exists now:**

| # | Phase 5.3 requirement | State for this candidate | Measurement |
| --- | --- | --- | --- |
| C1 | inventory the report formats and fields the future application is intended to support, not the old detector's limits | **UNMET** | one presentation is evidenced (`PR-01`) and a second specimen corroborates the field only (`PR-02`). No record enumerates the formats the application intends to support, and D-6 keeps the single-specimen boundary |
| C2 | for each candidate, map the exact displayed statement/date to the exact legal event | **MET for the first limb** | printed `Last Payment Date` → the report-stated last-payment event on the debt, as a collection-scoped fact per D-2, located at page 16 line 32 and page 17 line 5; the second limb remains unseated with a source-grounded reason, which the gate sentence expressly allows |
| C3 | establish whether the uploaded report can expose the decisive facts (request dates, collection dates, last-payment dates, default dates, labels); a canonical parser field is not required where explicit text maps deterministically | **PARTIAL, as the gate allows** | last-payment date and reference date demonstrated on this specimen; the default-in-payment date is not exposed by any field the admitted text reads as it; the remaining decisive facts belong to other candidates and are not claimed here |
| C4 | define a locator that survives extraction: page, section, block, span or exact text, with raw and normalized value and a traceable normalization record | **MET** | page 16 line 32 inside record lines 8–38; page 17 line 5 inside record lines 39–11; the header at line 1 of all 22 pages; raw `2021/02/01` and `2026/05/05` preserved beside their normalized forms, recorded independently in PROD-003's register and PHASE5-001I-A's extraction record |

**The prerequisite chain, measured rather than assumed.** The build plan orders the work so that *"a later phase
cannot begin before its stated gate passes"* (§3, line 45). Walking the chain:

| Gate | Recorded state now | Can it be treated as passed? |
| --- | --- | --- |
| 5.1 | `MET_WITH_RECORDED_ADMINISTRATIVE_LIMITATIONS` (owner amendment PHASE5-001O) | yes, as recorded, by the owner's amendment |
| 5.2 | `ADVANCEABLE_FROM_THE_ACCEPTED_CORPUS`, with the gate text itself recorded as "Unchanged" by the PHASE5-001O amendments | **no.** "Advanceable" is a work-direction reading. No durable record declares this gate passed, and its own second criterion is unmet for 409 rows — see the next table |
| 5.3 | `STILL_EVIDENCE_GATED`; reached for one candidate, passed for none | **no**, and the reasons are C1 and the gate above it |
| 5.4–5.6 | `NOT_STARTED` | no. Phase 5.4 may not begin while Gate 5.3 is unpassed, so PROD-003's recorded inference that "Phase 5.4 may therefore begin for this one unit only" is not adopted |
| 5.7 | `NOT_REACHED` | no: 0 admitted rules, 0 permitted findings |

**Gate 5.2 against its own four criteria** (text quoted at the same section, line 87):

| # | Gate 5.2 criterion | State | Measurement |
| --- | --- | --- | --- |
| 1 | all 437 entries have a reconciled report-only disposition or a documented reason they are not assessable | **MET** | 437 rows: 416 `UNRESOLVED`, 18 `GAP`, 3 `REFUSAL`; every row carries a `disposition_basis` naming a file and section |
| 2 | every unresolved record has a concrete report-mapping task or is an irreducible gap/refusal | **UNMET for 409 rows** | 6 rows carry concrete report-mapping tasks (`0354`, `0422`, `0423`, `0424`, `0425`, `0427`) and `0194` carries an owner-direction-closed representation task. The other 409 carry `NO_DURABLE_RESCREEN_RECORD`, whose recorded task is documentation work in an authorised batch — neither a report-mapping task nor a recorded irreducible gap or refusal |
| 3 | legal/source fields accepted under PHASE5-001A, not re-litigated | **MET** | nothing in this order reopens a legal determination |
| 4 | no batch accepted solely on an unverified completion summary | **MET** | PHASE5-001K re-derived its own counts from the register file alone; PHASE5-001L/M/N/O recorded their own verifications |

**The verdict on Gate 5.3.** The representation decision for this candidate is **complete**: the three conditions
PHASE5-001I-B recorded are answered in writing — the specimen boundary accepted (D-1, D-6), the printed-field
seating determined with its divergence recorded (D-2), and the register disposition cleared for the demonstrated
fields on this exact specimen (D-4). **Gate 5.3 is not passed and stays open**, for two independent reasons: one
Phase 5.3 criterion (C1, the intended-format inventory) is unmet, and the predecessor **Gate 5.2 is incomplete**,
so no phase completion can be recorded over it. **No gate-passed statement is issued**, and none is issued by
owner preference alone: the owner prohibited exactly that, and this record keeps the prohibition.

## 5. (C) The supplemental custody correction for PHASE5-001I-A

`SOURCE_CAPTURES\PHASE5-001I-C\custody_reconciliation_001i_a.json` carries the detail. The findings, in the order
the owner asked for them:

1. **The two inventory artifacts that were asserted but never written.** PHASE5-001I-A's narrative §5 line 125
   says *"permitted_files.json and implementation_manifest.json record the inventory by digest"*, and its §11 run
   table line 307 lists both as step 4's output. **Neither file exists.** The cause is measured in that order's
   own builder: in `build_001i_a_governance_records.cjs` the `inventory()` helper opens at line 249 and its
   closing brace is the file's final non-empty line, 313; the two `inventory()` calls, both `write()` calls and
   both `console.log` calls all sit inside that body, and no top-level statement calls the function. The file
   parses (`node --check` exits 0), the three records the script can still reach are written, and because the
   chain's step 4 passes on exit code alone the step reported success while the two artifacts were never written.
   The *intended* content is recoverable from the builder source — the permitted prefixes, the permitted root
   file, the two pre-existing files it declares it changes, the forbidden operations, and the entry and test
   entry points — and it is recorded as **intended content, not as a historical manifest**. Nothing is
   manufactured: the narrative's line 125 assertion stands uncorrected and this record names it instead.
2. **The three changes to another order's artifacts.** The PROD-003 narrative repair (`A6F0FE43…` → `1F556779…`,
   49,453 → 49,451 bytes) is **recorded but unauthorized by any owner instrument**; the refreshed
   `narrative_check.json` (`BC1B3FE8…` → `51B53C87…`, verdict still `NARRATIVE CHECKS PASSED`) and the refreshed
   `input_verification.json` (`A3494399…` → `115D5F9A…`, now reporting `INPUT VERIFICATION FAILED — see failures`,
   17 checks with 1 failure: *12 of 13 unchanged*, the build plan) are **outside the boundary PHASE5-001I-A wrote
   for itself**. Only the fourth change — the build plan itself, `C8018331…` → `54FCECE0…` — carries an owner
   instrument, in the required §6.2 quoted-replacement form with an Amendment History row.
3. **Original manifests and failure records preserved.** PROD-003's manifest still records the pre-repair
   narrative digest at 49,453 bytes, and the failure record sits in place as written. Both are left exactly as
   they are: the inconsistency inside another order's custody record is recorded here rather than tidied away, and
   nothing is re-run, regenerated or restored. Eight records are listed with their current digests in the custody
   correction record, alongside the original digests each of them quotes.
4. **Original versus current hashes, each difference explained.** Measured now: PHASE5-001I-A's manifest, 51
   entries, **0 differing**; PROD-003's manifest, 23 entries, **3 differing** — the narrative and its two
   refreshed outputs, each explained by the change to which it belongs and by nothing else.
5. **The six files no existing manifest lists** — each order's own baseline, its own custody manifest and its own
   validation record. All six are inventoried with bytes, digests, last-write times, roles and the writing script;
   all six are attributed to PROD-003 or PHASE5-001I-A; none is listed by *any* of the 12 custody manifests in the
   workspace; and the reason is a stated convention, not a lost record — both custody verifiers exclude exactly
   those three names from the manifest they write (`verify_001i_a_custody.ps1` line 156,
   `verify_prod003_custody.ps1` line 108). All six measure byte-identical to the digests PHASE5-001I-B's baseline
   recorded, which is the earliest digest set for them. What cannot be established from any digest is their state
   *before* that baseline, and that is recorded as **unknown** rather than assumed unchanged.
6. **What this order authorizes.** Current reconciliation only. It does not authorize the original changes, and
   it says so in the custody record itself: the narrative repair and the two refreshed outputs remain
   unauthorized after this record exactly as before it.

Three further discrepancies were re-verified and left in place: PHASE5-001I-A's narrative records *39 files
scanned* where its `identifier_scan.json` records 50; the legacy corpus measures 462 files / 23,639,181 bytes
where the recorded measure is 461 / 23,627,410, the difference being the corpus directory's own `MANIFEST.json`
of 11,771 bytes; and PROD-002 still records the superseded build-plan digest `C8018331…`. None is corrected.

## 6. Verification, preservation and custody of this order's own artifacts

**Inputs verified before writing.** Every input this order relies on was re-measured read-only: the specimen's
digest equals the register's recorded value; the admitted corpus artifact carrying the rule measures
`90A05625…74CF`; the owner amendment's before/after digests are as recorded; PHASE5-001I-A's 51 manifest entries
and PROD-003's 23 were re-measured (0 and 3 differences, each explained); the six manifest-less files were
measured against the two baselines that record them; the ledger row's exact CA-NS association and legacy rule id
are as recorded; the gate states quoted in §4 are the states the records carry; and the register's closed
vocabulary, the row counts (437 = 416 + 18 + 3) and the seven evidence-route rows were re-read from the files
rather than remembered.

**Preservation.** A baseline of **425 files** — every file under the workspace root, including hidden files and
the `consumer-wizard` git internals, excluding this order's own package and narrative — was captured before
anything was written (`preserved_files_before.json`). After the package was written: **0 changed, 0 missing, 0
added outside this order**. The legacy corpus was re-measured read-only: 34 of 34 admitted artifacts match their
recorded digests, both consumer specimens match (`PR-01` `E439A4BB…7AE5F`, `PR-02` `244D5808…9EFB4`), and the 461
corpus PDFs match the recorded 23,627,410 bytes exactly.

**Custody of the new artifacts.** `file_custody_manifest.json` records this order's narrative, its three JSON
records and its baseline, with bytes and digests. Two exclusions are stated rather than hidden: a manifest cannot
list its own digest, and `verification_results.json` is written after the manifest, so it is not listed in it —
the same convention that keeps the six files of §5 item 5 out of their own orders' manifests.
`verification_results.json` is this order's validation record: it carries the check list, the measurements and
the final readings, including the manifest's own digest, and it is the last artifact written.

**What this order did not touch.** No inherited file was created, changed, renamed, moved or deleted; no
historical manifest was overwritten; no inherited step was re-run; the extractor, the evaluator, the application,
the corpus, the register, the ledger and every governing document are exactly as they were found; and nothing was
deployed, uploaded, hosted, billed, transmitted or made consumer-visible.

## 7. What stays unresolved, kept separate from legal-corpus acceptance

| Uncertainty | State | Where it goes next |
| --- | --- | --- |
| effective period and applicability in time | `effectiveFrom` null, `effectiveTo` null, status `in_force`, basis `recorded_gap_commencement_not_read`; `LOCATOR_OR_EFFECTIVE_INFORMATION_NOT_RECORDED` recorded; `effective_dates_status` stays `UNRESOLVED_MISSING_EVIDENCE` | the Gate 5.4 rule record, where the mandatory plain-English timing qualification is drafted verbatim |
| the direct-report contract §4 retention exception | undecided and `RECORDED, NOT RELIED ON`; the divergence from the recorded legacy `D3` conclusion is carried | the Gate 5.4 ceiling field, once the owner decides |
| which field name the admitted rule record carries | `DIVERGENCE_RECORDED_NOT_SEATED` per D-2 | the Gate 5.4 field trace, with an owner amendment if the legacy name changes |
| reference-date, anniversary-boundary, leap-day and day-count conventions | conventions only, never requirements of the text; the reference-date *use* is accepted by D-3, the rest unresolved | Gate 5.4, each recorded separately |
| the second limb and `FACT-05` | unseated on this presentation; no field the admitted text reads as the default-in-payment date | a later unit, only if a presentation prints such a field |
| the presentation boundary | one specimen, one presentation; broader format support not claimed | a second specimen, or a separate owner instrument (D-6) |
| operational applicability of the legacy production clock | which row supplies it, and the s. 10(3)(c) against s. 10(ha) citation seam — `RECORDED, NOT RESOLVED` | a later order, if a rule record needs the production clock |
| versioning and admission | no immutable rule version, no admission record, no admitted artifact | Gate 5.7 |

**Legal-corpus acceptance is not reopened by any of them.** `CRP-LSRC-0354` stays owner-accepted legal authority,
its instrument and citation are unchanged, and the source pin
(`rules.canada.ts`, `90A05625AFEC4F81BDEB6568249BDEE5A45C178A20026FEA9D4F50A18AF174CF`) is untouched. This order
did no legal research, retrieved no source, paraphrased no proposition and re-litigated nothing. The
uncertainties above are rule-record, product and convention work; none of them is a reason to reject an accepted
statute.

## 8. (D) The exact gate status, and one concrete next work order

**Gate status, as this order measures it — no gate is passed, and none is claimed.**

| Gate | State now | Basis |
| --- | --- | --- |
| 5.1 | `MET_WITH_RECORDED_ADMINISTRATIVE_LIMITATIONS` | the PHASE5-001O owner amendment, unchanged by this order |
| 5.2 | **incomplete.** Recorded state `ADVANCEABLE_FROM_THE_ACCEPTED_CORPUS`; no durable pass exists; one of its four criteria is unmet for 409 rows | §4 table; PHASE5-001O `gate_status["5.2"]`; PHASE5-001K §10 |
| 5.3 | **open.** Reached for one candidate on one presentation, passed for none; the representation decision for this candidate is complete | §4 tables |
| 5.4, 5.5, 5.6 | `NOT_STARTED` | no admitted rule record; no evaluator rebuilt; the 41 internal tests are not Gate 5.6 evidence |
| 5.7 | `NOT_REACHED` | 0 admitted governed rules, 0 permitted findings |
| Admitted rules / permitted findings | **0 / 0** | unchanged |

**Because a required prior gate is incomplete, here is its exact remaining acceptance work.** Gate 5.2 needs,
before anything else can be recorded over it:

1. **For each of the 409 `NO_DURABLE_RESCREEN_RECORD` rows:** either a durable per-ID disposition — which the
   register's own authority column says is recoverable from material already in this workspace — or an explicit
   recorded determination that the row is an irreducible gap or refusal, with the reason named. Today each row's
   recorded task is documentation work in an authorised batch, which is neither of the two things Gate 5.2's
   second criterion allows.
2. **For the seven evidence-route rows:** a re-stated blocker recording what remains rather than what was —
   for `CRP-LSRC-0354` specifically, the residual no-payment/default-date alternative once D-4's clearing is
   applied.
3. **A durable criterion-by-criterion Gate 5.2 verdict record**, quoting the gate's text and stating pass or
   no-pass for each of its four criteria, with the evidence for each.
4. **An owner amendment, in the `CRP_CORE_CONSTITUTION.md` §6.2 form, for any criterion the owner wishes a
   recorded administrative limitation to satisfy.** A rank-6 order cannot convert a limitation into a criterion
   satisfaction, and this order does not attempt it.

**The next work order, stated concretely.**

> **`PHASE5-001P` — Gate 5.2 residual disposition batch and Gate 5.2 verdict record.** Deliverables: (a) a durable
> per-ID disposition or an explicit irreducible-gap/refusal determination for each of the 409 work-blocked rows,
> built from material already in this workspace; (b) a re-stated blocker for the six B20 mapping rows and for
> `CRP-LSRC-0194`, recording what remains; (c) the criterion-by-criterion Gate 5.2 verdict record. Exclusions: no
> new external evidence, no network call, no consumer-report retrieval, no legal research, no rule admission, no
> application change, no deployment, no consumer-visible output. Authority: an owner instrument, because the batch
> would edit the PHASE5-001K register and because any limitation-based criterion satisfaction must be said by
> owner amendment rather than inferred.

**What then follows, in order:** the Gate 5.3 record for `CA-NS-CRA-S10-3-C-LIMB-1` on `PR-01`, carrying D-1 to
D-4 — then the Gate 5.4 rule-record order built from `CRP_PHASE5_001I_B_INTERNAL_RULE_RECORD_DRAFT.md`, carrying
the D-2 field-name divergence, the D-3 conventions, the D-5 ceiling and the effective-period handling with its
mandatory timing qualification. **The remaining rule-record decisions for Gate 5.4** are: which field name the
admitted rule record carries; the effective-period handling and the exact qualification wording; the
anniversary-boundary and day-count conventions; the exception determination; the ceiling field; and, at Gate 5.7,
the immutable version string and the admission form. Nothing in this list can begin while Gate 5.2 stands
incomplete.

## 9. Boundaries

- This order records owner decisions; it **admits no rule**, certifies no legal content, creates no coverage and
  produces no result for any person.
- It passes no gate and gives this work no gate-completion credit. Gate 5.3 stays reached for one candidate and
  passed for none; Gate 5.2 stays incomplete; 5.4, 5.5 and 5.6 remain not started; 5.7 remains not reached.
- It authorizes neither `VIOLATION` nor `PROBABLE_VIOLATION`, and it preserves the recorded legacy `D3` /
  observation classification and packet ineligibility rather than overriding them.
- It used existing materials only: no new legal research, no consumer-report retrieval, no external transmission,
  no OCR, no fixture masquerading as a report, and no consumer-visible output of any class.
- It deployed nothing, published nothing, hosted nothing, transmitted no consumer data, uploaded no report,
  evaluated no consumer, billed nothing and added no authentication. Report checking remains "not yet available"
  for all 82 regions.
- It copied no artifact out of the legacy system, reproduced no identifier from any report's content, and read
  the specimen in place through the pointer recorded in PROD-003's register.
- It changed no pre-existing file, repaired no inherited artifact, overwrote no historical manifest, re-ran no
  inherited step and re-claimed no earlier order's verdict.
- Its register update is a **proposal**; its custody correction is a **record**; neither edits any file it
  describes.
- Everything recorded in §4, §5, §6 and §7 is a recorded limitation. None of it is a finding, a coverage claim or
  a promise.

