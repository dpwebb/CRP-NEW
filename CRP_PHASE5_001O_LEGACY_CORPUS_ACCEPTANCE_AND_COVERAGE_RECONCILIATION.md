# CRP PHASE5-001O — Legacy-Corpus Acceptance and Broad-Coverage Readiness Reconciliation

**Status:** Executed work-order narrative and evidence record
**Work order:** `PHASE5-001O` (owner-issued; replaces the previously proposed PHASE5-001O prompt, which is
**not** executed unchanged — see §9)
**Created UTC:** 2026-09-30
**Governing documents amended by this order:** `CRP_LEGACY_LEGAL_CORPUS_ADMISSION_CONTRACT.md`,
`CRP_DIRECT_REPORT_CONTENT_SOURCE_EXPANSION_CONTRACT.md`, `CRP_GOVERNED_LEGAL_CORPUS_CONTRACT.md`,
`CRP_LEGACY_JURISDICTION_SOURCE_NORMALIZATION_CONTRACT.md`,
`CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md`
**Evidence:** `SOURCE_CAPTURES\PHASE5-001O\`

> This narrative reports facts and administrative states. It is not itself legal authority, admits no
> rule, certifies no count, creates no coverage, and authorises no finding, application change or
> deployment.

## 0. Answer first

1. **The legacy statutory corpus was located.** It is the corpus this project's own records reference:
   `C:\Users\webbd\crp-credit-app`. It contains 23,674 files / 1,011,190,720 bytes (2,225 files /
   83,185,398 bytes excluding `.git` and `node_modules`). Its legal-corpus module
   (`packages\backend\src\services\legalCorpus\`) holds 20 files / 1,041,768 bytes, and **all 34 artifacts
   designated by the owner-approved admission contract re-verify byte-for-byte against their recorded
   SHA-256** — 34 of 34, re-checked at the close of this order. No discovery note, public guidance or
   unrelated checkout was substituted.
2. **The owner directive was recorded through the governing amendment procedure.** 19 amendments across 5
   governing documents, each with quoted before/after text, an amendment-history entry, and a mechanical
   check that the replacement text is present and the replaced text is gone (0 problems).
3. **Acceptance is owner-directed and is recorded as such.** This order performed no independent legal
   verification, re-reviewed no statute, and investigated no provenance. The digest verification is a
   custody fact about which bytes are on disk, not a legal conclusion.
4. **Broad coverage is now measured, not asserted.** The coverage ledger carries one row for each of the
   437 catalogue source entries: 410 are recorded as `OWNER_ACCEPTED_LEGAL_AUTHORITY` (249 content rules,
   111 limitation records, 27 authority records, 23 citation records), 6 are recorded as material that is
   **not** converted into a statute by that acceptance, and 21 are gaps or refusals where no statute is
   recorded. 81 of the 82 enumerated regions appear in the ledger, each with at least one accepted entry,
   and 80 carry at least one accepted content rule or limitation record.
5. **Existing operational mapping is present for most entries and honestly absent for the rest.** 376 of
   437 entries carry an exact recorded legacy mapping — 328 to a single recorded legacy rule or
   limitation row, 48 to more than one recorded row — and the 61 without one are recorded as
   `NOT_ESTABLISHED` with a mapping task rather than invented.
6. **The gate sequence was reassessed into four separated layers** (accepted legal authority /
   administrative reconciliation / report-format and application dependencies / readiness for
   deterministic evaluation). Under the amended text, **Gate 5.1 is recorded as met with the stated
   administrative limitations**; Gate 5.3 and later remain evidence-gated exactly as before.
7. **Next concrete implementation work order:** `PROD-002 — Consumer Application Jurisdiction Surface
   From the Accepted Corpus` (§8). It is **recommended, not authorised** by this order.

## 1. What this order did and did not do

**Did:** located and re-verified the legacy statutory corpus; recorded the owner directive by amending the
exact conflicting clauses; built a source-ID coverage ledger for all 437 entries; preserved every
unamended file (measured); reassessed the gates; recommended the next implementation order.

**Did not:** copy, move, edit or delete any legacy file; rewrite any catalogue entry, register row or legal
content; reopen any statute's validity; admit a governed rule; certify any count; create coverage or a
finding; change the application; deploy anything; transmit any consumer data; make duplicate-count or
provenance research the default next step.

## 2. The legacy corpus located

| Fact | Measured value |
| --- | --- |
| Legacy source root | `C:\Users\webbd\crp-credit-app` |
| Identified from | `CRP_LEGACY_LEGAL_CORPUS_ADMISSION_CONTRACT.md` (legacy source root) and `CRP_CORE_CONSTITUTION.md` §2.3 |
| Files / bytes (all) | 23,674 / 1,011,190,720 |
| Files / bytes (excluding `.git`, `node_modules`) | 2,225 / 83,185,398 |
| Legal-corpus module | `packages\backend\src\services\legalCorpus\`, 20 files / 1,041,768 bytes (19 of 20 admitted; `model.ts` is deliberately excluded by the contract) |
| Admitted artifacts verified | 34 of 34 by SHA-256 (`admitted_artifacts.json`) |
| Legacy retained-evidence files | 6 |
| Files created, deleted or modified in the legacy corpus | 0 |

The corpus is what the project's own admission contract designates: source registries
(`authorities*.ts`), coverage ledgers (`coverage.*.ts`), the per-jurisdiction rule corpora
(`rules.fcra.ts`, `rules.regv.ts`, `rules.ca.ts`, `rules.ny.ts`, `rules.wa.ts`, `rules.canada.ts`), the
declarative rule tables admitted from `legalRules.ts` and `solTable.ts`, the citation registry
(`docs\citation-objects.tsv`), the corpus model, and the retained Nova Scotia and Ontario evidence.


## 3. Exact governing amendments

19 amendments in 5 documents. Every quoted pair, locus, before/after digest and mechanical check is in
`SOURCE_CAPTURES\PHASE5-001O\amendment_text.json`; the amendment-history rows are in the documents
themselves.

| ID | Document | Clause | Type |
| --- | --- | --- | --- |
| A-1 | `CRP_LEGACY_LEGAL_CORPUS_ADMISSION_CONTRACT.md` | new §3.1 — owner acceptance of the designated legal content | INSERT |
| A-2 | same | §4 state block — accepted-content line | REPLACE (extend) |
| A-3 | same | §5 Amendment History | APPEND |
| B-1 | `CRP_DIRECT_REPORT_CONTENT_SOURCE_EXPANSION_CONTRACT.md` | §3 condition 5 — source pin | REPLACE (extend) |
| B-2 | same | §6 — owner direction: acceptance, duplicate bookkeeping and coverage planning | INSERT |
| B-3 | same | §9 Amendment History | APPEND |
| C-1 | `CRP_GOVERNED_LEGAL_CORPUS_CONTRACT.md` | preamble — owner directive paragraph | INSERT |
| C-2 | same | §5 — counting sentence | INSERT |
| C-3 | same | §3 — certified-baseline acceptance | INSERT |
| C-4 | same | §8 Amendment History | APPEND |
| D-1 | `CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md` | §3 Phase 5.1 bullet 3 | REPLACE (extend) |
| D-2 | same | §3 Phase 5.1 bullet 5, final clause | REPLACE |
| D-3 | same | §3 Gate 5.1, first sentence | REPLACE (extend) |
| D-4 | same | §5 stop condition | REPLACE |
| D-5 | same | §2.1 item 1 | REPLACE (extend) |
| D-6 | same | §6 — four-layer gate reassessment and next work order | INSERT |
| D-7 | same | §8 Amendment History | APPEND |
| E-1 | `CRP_LEGACY_JURISDICTION_SOURCE_NORMALIZATION_CONTRACT.md` | §5 — unresolved provenance items R6/R8 | INSERT |
| E-2 | same | §7 Amendment History | APPEND |

The exact clauses identified as conflicting with the directive, and the minimum change made to each:

1. **Acceptance prerequisites (admission contract §1–§3).** The contract admitted artifacts but recorded no
   acceptance of their *content*. Added §3.1: the recorded legal content is
   `OWNER_ACCEPTED_LEGAL_AUTHORITY`; provenance, historical versions and prior-review records are not
   prerequisites; guidance and policy material is not thereby converted into a statute; duplicate
   bookkeeping and an uncertified count are administrative limitations. §4 gained the acceptance line.
2. **Source-pin condition (expansion contract §3.5).** "…can be pinned to an identifiable source version"
   could be read as requiring a recorded formal edition. Extended so the digest-bound baseline satisfies
   the pin and an unrecorded edition is an administrative limitation. §6 gained the owner direction,
   including the explicit statement that the acceptance is not independent verification.
3. **Eligible-source re-expression (governed corpus contract §3 and §5).** §3's source-evidence list and
   §5's counting sentence could be read as requiring provenance completeness and a closed count before
   work proceeds. Added the acceptance clause in §3, the administrative-limitation sentence in §5, and
   the owner-directive paragraph in the preamble.
4. **Counting and duplicate conditions (build plan §2.1, Phase 5.1, Gate 5.1, §5).** The count and
   duplicate conditions were gate-blocking, and §5 stopped work when counts, duplicate identity or source
   provenance could not be reconciled. Amended so these are recorded as explicit administrative
   limitations, the item 1 provenance requirement is qualified, and the stop condition now applies only
   to a concrete legal-content change.
5. **Unresolved provenance items (normalization contract §5).** R6 and R8 were recorded as making source
   material "unfit for governed-rule construction". Amended to record them as implementation dependencies
   with no invented attribution and no change to any normalization result.

**Documents deliberately not amended, with the reason:** `CRP_CORE_CONSTITUTION.md`,
`CRP_LEGAL_INVARIANT.md`, `JURISDICTION_CONTRACT.md` and `CRP_JURISDICTION_ENUMERATION.md` (no clause
conflicts: §2.3's bar on applying a legacy rule or mapping outside its recorded scope preserves exactly
the recorded relationships the directive relies on); `CRP_GLOBAL_LEGAL_SOURCE_CATALOGUE.md` (it already
records that its entries are authoritative for their recorded content); and
`CRP_PHASE5_NEXT_GATE_RECONCILIATION.md` (a rank-6 analysis artifact, read subject to the amended rank-4
and rank-5 text — recorded as tension **C-5** below).


## 4. Coverage available for implementation

| Measure | Value |
| --- | ---: |
| Ledger rows (one per catalogue source entry) | 437 |
| `OWNER_ACCEPTED_LEGAL_AUTHORITY` | 410 |
| Accepted content rules | 249 |
| Accepted limitation/retention records | 111 |
| Accepted authority records | 27 |
| Accepted citation records | 23 |
| Recorded as material not converted into a statute | 6 |
| Gaps / refusals (no statute recorded) | 18 / 3 |
| Entries with an exact legacy operational mapping | 376 (328 single, 48 to multiple recorded rows) |
| Legacy rule/row references recorded | 840 |
| Entries linked to a legacy coverage-ledger review outcome | 142 |
| Canonical regions appearing in the ledger | 81 of 82 (each with at least one accepted entry) |
| Canonical regions with an accepted content rule or limitation record | 80 |
| Canonical regions with no ledger row | 1 — `US-UM`; no source entry exists and none may be invented |
| Application selector regions (hard-coded, display-name only) | 64, missing 18 canonical regions |

The six entries recorded as **not** converted into a statute are the Credit Reference Agency Information
Notice (CRAIN) retention-table rows `CRP-LSRC-0405`, `0406`, `0408`, `0409`, `0410` and `0411` — a bureau
industry notice, not a statute. This is exactly the distinction the directive requires, and it is recorded
rather than silently granted statutory force.

## 5. Remaining operational blockers (recorded, not treated as rejection grounds)

- **Layer 3, report representation (evidence-gated).** No eligible byte-pinned consumer disclosure carrying
  the required account-level representation has been obtained. Gate 5.3 and later still require it. This
  order did not attempt it and was not authorised to.
- **Country-wide sources.** 100 entries are country-wide descriptors with no region assigned; each needs an
  explicit recorded relation to an exact selected region before a rule for that region can be built.
- **Legacy operational mapping.** 61 entries have no exact recorded mapping (mostly gaps, refusals, records
  whose provision is literally `NOT RECORDED`, and several limitation rows whose recorded section string
  differs from the legacy row's text). A mapping task, not a reason to reject an accepted statute.
- **UK token reconciliation.** 14 entries carry `UK_TO_GB_RECONCILIATION_REQUIRED`; they stay as recorded.
- **Application surface.** The consumer application's selector is hard-coded and omits 18 canonical regions
  and all canonical codes.
- **Administrative limitations carried, not blocking:** the corpus-wide unique-legal-provision count is
  **uncertified**; `CRP-LSRC-0409`/`0411` duplicate identity is unresolved; 22 entries carry a `[VERIFY]`
  section marker from the legacy registry.

## 6. Recorded tensions (reported, none resolved by preference)

| ID | Tension | Action |
| --- | --- | --- |
| C-1 | The recorded `instrument_title = PIPEDA` for `0315/0316/0317/0318/0320` is unsupported by the recorded FCAC locator and the official PIPEDA consolidation. | Carried from PHASE5-001N; reported, not rewritten; the entries keep their recorded content and are accepted **as recorded**. |
| C-2 | The CRAIN pair records two different starts; the retrieved table reproduces neither. | Retained as `IDENTITY_UNRESOLVED` with the exact missing fact named. |
| C-3 | The official route for the `0165/0166` provision is blocked by a challenge page. | Route limitation recorded on the determination. |
| C-4 | The Ontario e-Laws statute route returns an application shell. | Instrument-level determination recorded. |
| C-5 | The next-gate reconciliation lists P-4 (duplicate links explicit) and P-8 (source pin re-verified) as prerequisites and restates the pre-amendment count/provenance stop condition. | Read as subordinate to the amended rank-4/rank-5 text: P-4 is satisfied by the amended Gate 5.1 recording; P-8 concerns the source pin of a *finding-capable* rule unit, which a finding still requires and which was never an acceptance prerequisite. The analysis artifact is not amended. |

This order raised no new legal-provenance contradiction, because it performed no legal-provenance
investigation.


## 7. Gate sequence reassessed under the amended authority

| Layer | State | Basis |
| --- | --- | --- |
| 1. Legal authority accepted by the owner | **ACCEPTED** — 410 accepted entries | Admission contract §3.1 |
| 2. Administrative reconciliation | **RECORDED WITH LIMITATIONS, NOT BLOCKING** — register dispositions, uncertified count, one unresolved duplicate pair, 61 unmapped entries | Amended Gate 5.1, amended Phase 5.1 bullets 3 and 5, amended build-plan §5, corpus contract §5 |
| 3. Report-format and application dependencies | **OPEN** — selector not enumeration-driven; 100 country-wide relations to resolve; report representation still evidence-gated | Gate 5.2, Gate 5.3, jurisdiction contract |
| 4. Readiness for deterministic evaluation | **NOT READY** — 0 admitted rules, 0 permitted findings | Gates 5.4–5.7 |

Gate status: **5.1** recorded as met with the stated administrative limitations · **5.2** advanceable from
the accepted corpus · **5.3** still evidence-gated · **5.4–5.6** not started · **5.7** not reached. No gate
beyond 5.1's amended recording is declared passed, and no rule, coverage, candidate or finding was created.

## 8. Next concrete implementation work order (recommended, not authorised)

**`PROD-002 — Consumer Application Jurisdiction Surface From the Accepted Corpus`.** Drive the consumer
application's selectable jurisdiction list from `CRP-JURISDICTION-ENUM-1` and state, per selectable
jurisdiction, the coverage the accepted corpus records — generated from this order's coverage ledger.
Scope in: the generated coverage data file, the selector change, the plain-language coverage/limitation
statement, and a build check that the generated file and the ledger agree. Scope out: any change to a
governing document, the catalogue, the register or the legacy corpus; any legal research or count
investigation; report parsing, findings, evaluators; deployment; consumer data.

It is the smallest concrete advance because it uses only the accepted corpus and the approved enumeration,
is independent of the evidence-gated Gate 5.3 dependency, and closes a gap this order measured (18 canonical
regions missing, no canonical codes, 64 hard-coded display names). Full scope, criteria, stop conditions and
the provisional 80-region surface are in `SOURCE_CAPTURES\PHASE5-001O\next_work_order.json`.

## 9. The previously proposed PHASE5-001O prompt

The restrictive prompt proposed earlier is **not present in this workspace as an artifact**. Measured: no
document created before this order contains `PHASE5-001O`, and the only pre-existing occurrences of the
token `001O` are the two amendment-history rows that record the earlier, different work order
`PHASE4-001O` (`CRP_GOVERNED_LEGAL_CORPUS_CONTRACT.md` and
`CRP_DIRECT_REPORT_CONTENT_SOURCE_EXPANSION_CONTRACT.md`), which is unrelated to the proposed prompt. This
order therefore records the revision rather than a document supersession: it does not execute that prompt
unchanged, it removes legal-provenance research and duplicate-count investigation as prerequisites and as
the default next step, and it records acceptance as owner-directed.

## 10. Verification and preservation

See `SOURCE_CAPTURES\PHASE5-001O\`:

- `legacy_corpus_inventory.json` — the located corpus, its module inventory and per-artifact verification.
- `admitted_artifacts.json` — all 34 designated artifacts with recorded vs actual digests.
- `source_id_coverage_ledger.json` / `.csv` — the coverage ledger (437 rows; JSON and CSV counts agree).
- `coverage_summary.json` — the measured counts, per-jurisdiction table and application alignment.
- `amendment_text.json` — the 19 quoted amendments, before/after digests and mechanical checks.
- `gate_reassessment_001o.json` — the four layers, per-gate status and the recorded tensions.
- `next_work_order.json` — the recommended implementation order.
- `preserved_files_before.json` — the byte baseline of 278 pre-existing files.
- `preservation_and_change_record.json` — the measured change set (unchanged / changed / added / missing).
- `file_custody_manifest.json` — bytes and SHA-256 for every file this order created, plus this narrative.
- `input_inventory.json` — the inputs read, with digests at close.
- `build_001o_inventory.ps1`, `lib_001o.js`, `build_001o_coverage_ledger.js`, `amendments_001o.js`,
  `build_001o_amendment_record.js`, `build_001o_gate_and_order.js`, `capture_001o_baseline.ps1`,
  `normalize_001o_line_endings.ps1`, `fix_001o_blank_lines.ps1`, `verify_and_manifest_001o.ps1` — the
  scripts that produced and re-checked those artifacts; the `probe_*.js` files and their `*_out.txt`
  outputs are the measurement record of the join method.

Nothing in this order touched the legacy corpus, the catalogue, the register, an unamended governing
document, or any other part of the consumer application.

## 11. Amendment History

| Date | Work order | Change |
| --- | --- | --- |
| 2026-09-30 | PHASE5-001O | Created this narrative. Records the located legacy statutory corpus, the 19 owner amendments across five governing documents, the 437-row source-ID coverage ledger, the four-layer gate reassessment, the recorded tensions C-1 to C-5, and the recommended next implementation work order PROD-002. Admits no rule, certifies no count, creates no coverage or finding, and authorises no application change or deployment. |

