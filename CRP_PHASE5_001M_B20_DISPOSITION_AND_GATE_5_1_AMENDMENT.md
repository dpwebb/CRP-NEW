# CRP Phase 5 — PHASE5-001M: B20 Disposition and Gate 5.1 Count-Requirement Amendment

**Order:** PHASE5-001M — formally record the B20 disposition and reconcile the Gate 5.1 count requirement through the governing amendment process
**Governing procedure followed:** `CRP_CORE_CONSTITUTION.md` §6 (Amendment and Change Control), read with §3.2 Step 3 and §2 (Authority Order)
**Date:** 2026-09-30
**Mode:** amendment, documentation and verification only
**Result:** the historical B20 tally is recorded as a preserved, unattributed historical record with per-ID basis `MISSING_EVIDENCE`; the requirement to reconcile its unavailable membership against the persisted source-discovery records is **replaced** by a reproducible reconciliation of the complete source-ID register; the change record lives in the two amended documents themselves, as §6.5 requires. **Gate 5.1 is NOT PASSED**, and its single remaining prerequisite is now the duplicate-identity determination of the six unresolved clusters.

## 1. Order, authority and boundary

The owner authorised this order to do exactly two things: record the B20 disposition formally, and reconcile the Gate 5.1 count requirement through the governing amendment process. The owner's disposition was fixed in advance and is reproduced here because it is the authority for everything below:

> Retain B20's 39/380/18 tally as an unattributed historical aggregate. Preserve its original record. Do not assign membership, reconstruct missing dispositions or use it as a certified operational count. Preserve the one independently traceable candidate reference without extrapolating to the remaining aggregate.

Boundaries observed throughout: no new research, no retrieval, no change of legal interpretation, no source removal, no rescreen reclassification, no parser, evaluator or application work, no deployment, no Git operation, no Gate 5.2 work and no `PHASE5-001I` issue. Two pre-existing files were amended — the two files the procedure required — and every other pre-existing file, including the 437-entry catalogue and the whole `PHASE5-001K` and `PHASE5-001L` evidence sets, is byte-identical to its pre-write state.

## 2. The procedure that was followed, and why it is the correct one

The order required the actual amendment procedure to be established first, and expressly warned against assuming that a new document supersedes the approved plan. Both were done before any write.

### 2.1 Document precedence

`CRP_CORE_CONSTITUTION.md` §2 orders authority as Core Constitution, Legal Invariant, Jurisdiction Contract, Corpus Contract, Approved Build Plan, Active Work Order, Approved Tests, Implementation, Comments, Legacy Material. §2.1 states that "authority is determined by rank alone … never … by recency, document length, specificity, the number of artifacts that agree, passing test results, reviewer preference, or implementation convenience", and §2.2 that "a lower-ranked artifact never overrides a higher-ranked artifact".

The two texts that carry the B20 instruction are a **rank-4 Corpus Contract** (`CRP_DIRECT_REPORT_CONTENT_SOURCE_EXPANSION_CONTRACT.md` §6 owner-decision block, the origin of the tally) and the **rank-5 Approved Build Plan** (§3 Phase 5.1 bullet 4 and §6, which carry it forward). The rank-4 contract outranks the rank-5 plan. Neither is superseded by the existence of any later document — including this one, which is a rank-6 order record and not governing text. That is why both were amended in place, and consistently, and why no reliance was placed on any newer document "replacing" either of them.

### 2.2 The amendment procedure

§6 states the procedure, and §3.2 Step 3 states which instrument performs it:

- **§6.1** — a rank 1–3 document "is amended only by an explicit, owner-issued work order. No amendment occurs by implementation, refactor, test change, comment, migration, or documentation drift."
- **§6.2** — "An amendment must name the document and the clause it changes, quote the text being replaced, and state the replacement text. Implied amendments are void."
- **§6.4** — "Deletion of a rank 1–3 document, or **removal of a requirement** from one, is an amendment and requires the same authorization as an amendment."
- **§6.5** — "Amendment history is recorded in the amended document itself, so that the governing text and its change record cannot separate."
- **§3.2 Step 3** — "amending a governing document is an owner amendment under Section 6 (an Active Work Order, rank 6), not a repair performed during implementation."

Read together, the procedure is: **P1** the owner issues an explicit work order (the only recognized amendatory instrument; implied amendments are void); **P2** the amendment names the document and the clause, quotes the replaced text and states the replacement; **P3** a removed requirement is replaced by a stated replacement requirement, never by silence; **P4** the change record is written into the amended document itself.

Two points were recorded rather than assumed. First, §6.1's express "owner-issued work order" requirement is written for ranks 1–3, and both targets here are ranks 4 and 5; the owner used the same and only amendatory instrument for them, so the requirement is satisfied a fortiori and no lesser form was used. Second, §6.5's in-document requirement is why the Approved Build Plan **gained** a §8 Amendment History: it had none, and a governing document whose change record cannot separate from its text may not be left with a change recorded only elsewhere.

### 2.3 Was authority beyond the owner's delegated authority required? No

The order directed a stop if the procedure required more authority than the owner had delegated. It did not. The owner issued the work order, fixed the disposition, and authorised the amendment, the supporting records and the minimal amendment-history entries. The instrument used is the highest form the procedure names. No rank 1–3 document was touched. The recorded answer, with its basis, is in `amendment_authority_analysis.json` under `authority_check`.

## 3. The exact amendment

The two targets and the five amendments were identified *before* editing, by document, clause and line: see `amendment_authority_analysis.json`, `targets_identified_before_editing`. The replaced and replacement text of every amendment is recorded verbatim in `amendment_text.json`.

### 3.1 Approved Build Plan — §3 Phase 5.1 bullet 4 (M1-A: replacement of a requirement)

Replaced text, quoted verbatim (299 characters):

> `- Carry forward the B20 ruling: 39 probable candidates, 380 excluded, and 18 unresolved source records, including CRP-LSRC-0354, 0422–0425, and 0427 pending exact report-field/event mapping. Reconcile these totals against the persisted source-discovery records before treating them as final.`

Replacement text, operative clauses (1,504 characters; full text in `amendment_text.json` and in the document):

> `- Carry forward the B20 ruling as a preserved, unattributed historical record (owner disposition PHASE5-001M): 39 probable candidates, 380 excluded, and 18 unresolved source records (39 + 380 + 18 = 437) … The per-ID inventory behind that tally is absent from this workspace (per-ID basis MISSING_EVIDENCE), so the tally is retained without assigning any catalogue ID to any of its classes: it is not a certified operational count and is not the register's certified starting count. The requirement to reconcile these totals against the persisted source-discovery records is replaced by a reproducible reconciliation of the complete source-ID register: every catalogue ID accounted for exactly once, every count built from the register's own per-ID record dispositions, and every current count stated with the evidence it rests on, the meaning it carries and the limitations that remain unresolved. Duplicate identity remains a separate, unfinished requirement of this phase (bullet 3 above): the duplicate links are now explicit per relation and per row, but the identity of the six clusters 0315/0316/0317/0318/0320, 0149/0150, 0165/0166, 0409/0411, 0336/0349 and 0337/0351 could not be determined from the recorded descriptors, so those clusters remain open and queued, neither collapsed, merged nor re-classed, and no unique-legal-provision count may be certified while they stand unresolved.`

### 3.2 Approved Build Plan — §6 first paragraph (M1-B: the sentence Gate 5.1 itself made a precondition)

Replaced text, quoted verbatim (228 characters):

> `The corrected-logic B20 report gives a provisional source-record tally of 39 probable candidates, 380 excluded, and 18 unresolved; it must be reconciled to durable records before becoming the register's certified starting count.`

Replacement text, in full (698 characters):

> `The corrected-logic B20 report recorded a provisional source-record tally of 39 probable candidates, 380 excluded, and 18 unresolved (39 + 380 + 18 = 437). Under owner disposition PHASE5-001M that tally is preserved as an unattributed historical record whose per-ID inventory is absent from this workspace (per-ID basis MISSING_EVIDENCE): no catalogue ID may be assigned to any of its classes, it is not a certified operational count, and it is not the register's certified starting count. The count requirement it carried is replaced by the reproducible reconciliation of the complete source-ID register, with every current count stating its evidence, its meaning and its unresolved limitations.`

The rest of that paragraph, including the sentence naming the six B20 report-representation mappings `CRP-LSRC-0354`, `0422`, `0423`, `0424`, `0425` and `0427`, and the sentence recording zero governed rules, zero coverage and zero permitted findings, is untouched.

### 3.3 Approved Build Plan — new §8 Amendment History (M1-C: required by §6.5)

The Approved Build Plan had no amendment history. §6.5 requires the change record to live in the amended document, so a §8 Amendment History was appended (1,384 characters including its separator), carrying one dated `PHASE5-001M` row that states what was amended, what was preserved and that the amendment admits no rule, certifies no count or coverage, establishes no consumer-format support and passes no gate. The former §7 Scope boundary is unchanged and remains above it.

### 3.4 Source Expansion Contract — §6 owner-decision block (M2-A: the origin of the tally)

Replaced text, quoted verbatim (117 characters):

> `The resulting B20 source-record totals are 39 PROBABLE_CANDIDATE, 380 EXCLUDED, and 18 UNRESOLVED (437 total). `

Replacement text, in full (552 characters):

> `The resulting B20 source-record tally was recorded as 39 PROBABLE_CANDIDATE, 380 EXCLUDED, and 18 UNRESOLVED (39 + 380 + 18 = 437). Under owner disposition PHASE5-001M that tally is preserved as an unattributed historical record: its per-ID inventory is absent from this workspace, no catalogue ID is assigned to any of its classes, and it is not a certified operational count or a starting count for any downstream step. Every current count must state the evidence it rests on, the meaning it carries and the limitations that remain unresolved.`

The sentence that follows — requiring the distinct underlying legal-provision candidate count to be reported separately after duplicate cross-references are reconciled — is unchanged, and the six-ID mapping instruction that precedes it (`CRP-LSRC-0422`–`0425`, `0427`, `CRP-LSRC-0354`: classify each as `UNRESOLVED` until its exact report-event/date mapping is verified) is unchanged and still standing.

### 3.5 Source Expansion Contract — §9 Amendment History (M2-B)

One dated `PHASE5-001M` row was appended to the existing amendment-history table (1,090 characters), recording the disposition, the replacement of the count requirement, and that the mapping gate, the separate duplicate-identity requirement, the six identity-unresolved clusters, the separate unique-legal-provision count and every other condition of the contract are unchanged.

## 4. What the amendment preserves

- **The historical record.** The tally still stands, in its original words, in the source expansion contract and in every document that quoted it. The `PHASE4-002I-B20-OWNER-DECISIONS` amendment-history row (2026-09-29) is untouched. `CRP_CORRECTED_LOGIC_RESCREEN_REGISTER.md` §11.1, `CRP_PHASE5_NEXT_GATE_RECONCILIATION.md` §5.3, `SOURCE_CAPTURES\PHASE5-001K\rescreen_provenance.json` and the 001L evidence are all byte-identical: they remain records of what was recorded at their time, and no record was rewritten to agree with this order.
- **The one traceable candidate.** `CRP-DISC-002C-NY-0194.md` and the `CRP-LSRC-0194` records are untouched, and nothing in the amendment generalises that single record into the remaining aggregate. The amendment states the opposite: the per-ID basis is `MISSING_EVIDENCE` and no catalogue ID may be attributed to any B20 class.
- **All 437 source records.** The catalogue is byte-identical (447,509 bytes, `3ACB39A3…038D`); no entry was added, removed, re-classed or re-dispositioned; the 416 `UNRESOLVED`, 18 `GAP` and 3 `REFUSAL` dispositions stand exactly as 001K recorded them.
- **The separate duplicate-identity requirement, and the six unresolved clusters.** Preserved explicitly in the amended text and in the reassessment; the clusters remain open, queued, and neither collapsed, merged nor re-classed.
## 5. Verification performed

### 5.1 Arithmetic verified independently, and not certified

Every figure was recomputed by this order from the durable files rather than copied: 437 rows and 437 distinct `source_entry_id` values with the suffix range 0001–0437 complete (0 missing, 0 repeated, 0 non-catalogue identifiers); `GAP` 18 + `REFUSAL` 3 + `UNRESOLVED` 416 = 437; rows with no duplicate relationship 346 + rows inside a duplicate group 91 = 437; identical rows 22 + unresolved rows 15 + distinct rows 54 = 91; relations 16 identical + 25 unresolved + 2,317 distinct = 2,358; `removal_permitted` = NO on 437 of 437 rows; distinct `legal_provision_key` 429, leaving 437 − 429 = 8 provisional; and the historical aggregate's own internal arithmetic 39 + 380 + 18 = 437.

**None of this is certified coverage or a rule count.** 425 (437 − 12) and 416 (425 − 9) are recorded-descriptor bookkeeping indicators only. The equality of 416 with the 416 `UNRESOLVED` rows is a numerical coincidence and is not agreement, corroboration or identity. The 39/380/18 aggregate is preserved, not reconciled, and is not a candidate count, not a coverage measure, not a legal-provision count and not a starting count for any step. The only counts that reconcile against durable per-ID evidence are the register's own: 437 source records, one disposition each, and the register's disposition totals. This is the meaning of the amended requirement that every current count identify its evidence, its meaning and its unresolved limitations.

### 5.2 The change is exactly the changed text: inversion proof

For each amended file, the original was reconstructed in memory from the amended file by restoring the quoted replaced text in place of the stated replacement text and removing the appended block, and the reconstruction was hashed:

| File | Recorded pre-write SHA-256 | Reconstruction result |
| --- | --- | --- |
| `CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md` | `4A31AC4C1011EE67D3B1678DB834401B252AFBCE6A18C49B99BEDF49119ED813` | `4A31AC4C…9ED813` — **EXACT MATCH** |
| `CRP_DIRECT_REPORT_CONTENT_SOURCE_EXPANSION_CONTRACT.md` | `F89C8C425A03760E0F73728AF44B2E22D34D2159D29E917F02451B5BBAB3B9AD` | `F89C8C42…B3B9AD` — **EXACT MATCH** |

An exact reconstruction proves that the amendment is precisely the text quoted in `amendment_text.json` and nothing else: if a single character had been changed anywhere else in either file, the reconstruction could not have reproduced the recorded pre-write digest. The same method establishes the post-write digests recorded in §5.3.

### 5.3 Nothing else changed

Every one of the 245 files present before this order's first write was re-measured and re-hashed against `input_inventory.json`:

| Check | Result |
| --- | --- |
| Files changed | **2** — the two governing documents named in §3, and no other |
| Files missing or added among the pre-existing set | **0** |
| Pre-write baseline | 245 files, 56,723,359 bytes, digest `FCB53E63…B1A9` |
| Pre-001M control | the same method over the 236 files that pre-existed `PHASE5-001L` reproduces `482B93C8…C4BD` exactly, the digest 001L recorded before and after its own order, so the baseline has not drifted |
| `CRP_GLOBAL_LEGAL_SOURCE_CATALOGUE.md` | unchanged: 447,509 bytes / `3ACB39A3…038D`, 437 entries |
| `SOURCE_CAPTURES\PHASE5-001K` evidence (register, row file, provenance, custody manifest) | 3 of 3 custody entries match; row file 616,237 bytes / `DFB78DD2…24BB`; provenance 374,808 bytes / `D3D4E3DA…4BAC` |
| `SOURCE_CAPTURES\PHASE5-001L` evidence (7 artifacts) and the 001L narrative | all 8 match their recorded digests |

Every write of this order landed either in `SOURCE_CAPTURES\PHASE5-001M\` or in one of the two files the amendment names.

### 5.4 Custody

`file_custody_manifest.json` records the size and SHA-256 of each artifact of this order, the narrative included, and `preservation_and_change_record.json` records the before/after state of both amended files, the two inversion proofs, the per-file change set and the preservation counters. All JSON artifacts of this order were re-parsed successfully after writing.

## 6. Gate 5.1 reassessed against the amended authority

Gate text, verbatim and unamended:

> Gate 5.1: every source ID is accounted for once, all counts reconcile, duplicate links are explicit, and no unresolved item was silently excluded. If reports are only present in chat, first create the durable, schema-conforming rescreen register from the accepted reports, with provenance to each batch and correction.

| Gate condition | State now | Basis |
| --- | --- | --- |
| every source ID is accounted for once | **MET** | 437 rows, 437 distinct IDs, range 0001–0437 complete, 0 missing, 0 repeated |
| all counts reconcile | **MET FOR THE SOURCE-ID REGISTER; NOT MET FOR THE UNIQUE-LEGAL-PROVISION COUNT** | Under the amended authority the count requirement is the reproducible reconciliation of the complete source-ID register, which 001K built and 001L and this order reproduced, and every current count now states its evidence, meaning and limitations. The separately required unique-legal-provision count is still not final: 429 distinct `legal_provision_key` values are provisional and six clusters are undetermined |
| duplicate links are explicit | **MET AS EXPLICIT DETERMINATIONS; IDENTITY NOT FINAL FOR SIX CLUSTERS** | All 2,358 relations carry a per-relation and per-row determination (16 identical, 25 unresolved, 2,317 distinct as recorded) and the fifteen undetermined rows are explicitly queued |
| no unresolved item was silently excluded | **MET** | 416 unresolved rows queued individually with a named blocker; 15 identity-unresolved rows queued; the six B20 mapping IDs still visible; nothing dropped, defaulted, inferred or merged |
| durable, schema-conforming rescreen register with batch provenance | **MET BY 001K, CUSTODY RE-VERIFIED HERE** | Register and row file durable; custody 3 of 3; hashes unchanged by this order |

**Gate 5.1 status: NOT PASSED.**

The blocker has changed, and that is the substantive result of this order. Before it, the gate failed on the B20 count reconciliation — an item that no amount of further documentation could produce, because the per-ID inventory behind the tally does not exist in this workspace. That blocker is now disposed of by owner amendment: the tally is preserved as an unattributed historical record with per-ID basis `MISSING_EVIDENCE`, and the count requirement it used to carry is replaced by a register reconciliation that is reproducible from durable evidence and has been reproduced.

What remains is the **separate** duplicate-identity requirement of Phase 5.1 bullet 3. Fifteen rows in six clusters cannot be decided from their recorded descriptors, so the unique-legal-provision count cannot be finalised, and the gate cannot be certified while that count stands unresolved. The amendment preserves that requirement in terms; it does not satisfy it, and this order did not attempt to.

## 7. The next remaining prerequisite

The next bounded action is set out in `next_bounded_action.json` and was **not performed** here: a single bounded order over the six clusters `0315/0316/0317/0318/0320`, `0149/0150`, `0165/0166`, `0409/0411`, `0336/0349` and `0337/0351` — fifteen rows and the twenty-five `IDENTITY_UNRESOLVED` relations recorded for them — deciding, per relation, whether the rows record one legal provision and version or distinct provisions, either by an owner ruling against the recorded descriptors or by retrieving the recorded source artifact for each member row and comparing instrument, provision descriptor, official locator, jurisdiction reference and effective-information keys at first hand. It would unblock the unique-legal-provision count and nothing else; it would not pass Gate 5.1 by itself, and it would not touch any disposition, the B20 aggregate, or the six B20 mapping IDs, whose pending exact report-field/event mapping belongs to later phases.

Two other items remain as they were, and neither blocks this order: the owner question whether any of the ten demonstrably identical clusters should one day be a single catalogue entry, and `M-1`, which remains unresolved.

## 8. What this amendment does not do

It does not certify any legal disposition. It does not admit a governed rule, create coverage or authorise a finding: the catalogue still records zero governed rules, zero governed-jurisdiction coverage and zero permitted findings, and §6 of the plan still says so. It does not establish consumer-format support for anything, and it decides no Gate 5.3 question. It does not pass Gate 5.1, and it does not claim to. It does not reconcile the B20 membership; it records that the membership cannot be reconciled from the evidence in this workspace and forbids attributing it. It does not certify 425, 416 or the 39/380/18 aggregate in any role. It does not resolve the six identity clusters, does not collapse or merge anything, and does not re-class any of the 437 records. It does not begin Gate 5.2, does not issue `PHASE5-001I`, and leaves Gate 5.3 and `M-1` unresolved.

## 9. Artifacts produced by this order

All under `SOURCE_CAPTURES\PHASE5-001M\`, with digests in `file_custody_manifest.json`:

| Artifact | Contents |
| --- | --- |
| `input_inventory.json` | every pre-write workspace file with size and SHA-256, the 245-file baseline digest, and the frozen inputs with their recorded digests |
| `amendment_authority_analysis.json` | document precedence, the amendment procedure read from §6 with §3.2 Step 3, the authority check, and the targets identified before editing |
| `amendment_text.json` | every amendment's replaced and replacement text, verbatim, with loci, character counts and before/after sizes and digests |
| `preservation_and_change_record.json` | before/after state of both amended files, the two inversion proofs, the two-file change set, and the preservation counters for the catalogue and the 001K and 001L evidence |
| `gate_5_1_requirement_reassessment.json` | the gate text, the independent arithmetic, the certification and prohibited-use statements, the per-condition and per-requirement reassessment, the gate result and the next prerequisite |
| `next_bounded_action.json` | the bounded action for the six unresolved clusters, its scope, acceptance criteria and stop conditions, not performed |
| `file_custody_manifest.json` | digests of the six evidence artifacts and this narrative |
| `CRP_PHASE5_001M_B20_DISPOSITION_AND_GATE_5_1_AMENDMENT.md` | this narrative report |

In addition, exactly two pre-existing files were amended, in place, as §6 requires: `CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md` (§3 Phase 5.1 bullet 4, §6, and a new §8 Amendment History) and `CRP_DIRECT_REPORT_CONTENT_SOURCE_EXPANSION_CONTRACT.md` (§6 owner-decision block and one §9 amendment-history row).

## 10. Conclusion

The B20 tally is now formally recorded as what the evidence shows it to be: a preserved historical aggregate with no per-ID basis in this workspace, retained without attribution, barred from use as a certified operational count, and no longer standing between the corpus and its own count requirement. The requirement it used to carry has been replaced, through the governing procedure, by a reproducible reconciliation of the complete source-ID register — the one count the evidence can actually support — and every count published or consumed from here must declare its evidence, its meaning and its limitations. The change is recorded in the two amended documents themselves, and it is proven to be exactly the change stated and nothing more.

Gate 5.1 is **NOT PASSED**, and it is no longer blocked on B20. It is blocked on the fifteen rows in six clusters whose duplicate identity the record cannot settle, and that is the next bounded action. Nothing in this order certifies a legal disposition, admits a rule, establishes consumer-format support or passes a gate.

**End of report.**
