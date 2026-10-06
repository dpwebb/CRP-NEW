# CRP Phase 5 — PHASE5-001L: Duplicate-Identity and Historical-Count (B20) Reconciliation

**Order:** PHASE5-001L — Gate 5.1 duplicate-identity and historical-count reconciliation
**Gate:** PHASE5 gate 5.1 (`CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md` §3, line 47; gate text at line 55)
**Date:** 2026-09-30
**Mode:** documentation, measurement and verification only
**Result:** the duplicate-identity reconciliation of gate 5.1 is **complete on the evidence available**; the historical B20 aggregate is **not reconcilable from any workspace artifact**; **gate 5.1 is NOT PASSED**, and exactly one owner decision remains.

## 1. Order and scope

This order was instructed to (a) determine duplicate identity per catalogue ID rather than per duplicate string, (b) test whether the historical PHASE4-002I-B20 aggregate of 39 probable candidates / 380 excluded / 18 unresolved can be reconciled to durable records before being carried forward as the register's certified starting count, and (c) re-verify preservation of the 437-entry catalogue. It is a documentation order: it changes no legal content, admits no rule, creates no finding, and reaches no consumer.

Boundaries observed throughout: no internet research or retrieval, no new legal interpretation, no rule admission, no catalogue or register edit, no consumer report, no transmission, no readiness or percent-complete claim. Every measurement below was taken from the frozen workspace files named in §2, and every count in this report was reproduced by this order rather than copied from an earlier document.

## 2. Inputs and custody

- Pre-write baseline: **236 files**, 55,191,978 bytes, inventory digest `482B93C8673C724CE30CE6FC6CEE024BA360C77C6F940878D62035DBD3E3C4BD` (definition in `input_inventory.json`). Every file in that baseline is hashed in `input_inventory.json`.
- The 14 frozen inputs named in 001K §2 were re-hashed: **14 / 14 MATCH, 0 mismatches**.
- The 001K custody manifest was re-verified entry by entry: **3 / 3 MATCH**.
- Cross-check against 001K's own preservation record: 001K's pre-write baseline of 232 files plus its four new files is exactly this order's 236-file baseline, so nothing entered or left the workspace between the two orders.
- `CRP_GLOBAL_LEGAL_SOURCE_CATALOGUE.md` measures 447,509 bytes / `3acb39a3b6e80dd4db38689541ccc17542e941cefa4d6c0a355b9816f030038d`. That is the state 001K itself recorded as the *after* value of its own §12.5 appendix (445,785 bytes / `5BCC3CDE…019D` before; +1,724 bytes after). Earlier documents that quote `5BCC3CDE…019D` quote the pre-001K state. No discrepancy exists and this order did not touch the file.

## 3. How duplicate identity was determined

The 001K register's duplicate ledger links *strings*: a repeated `(source_artifact, provision_or_citation)` pair, or a repeated citation string across different artifacts. That ledger is an indicator, not an identity determination, because neither repeated-string test establishes that two rows record the same legal provision or version. This order therefore determined identity for every relation from the recorded catalogue fields, using this rule:

> A pairwise relationship is **IDENTICAL_PROVISION_AND_VERSION** only where the two rows agree on every recorded identity field (instrument title, provision descriptor, official locator, jurisdiction reference, record type) and record no conflicting value for any shared effective-information key. It is **DISTINCT_PROVISION_OR_VERSION** where the recorded instrument, provision descriptor or authority differs. It is **IDENTITY_UNRESOLVED** where the recorded descriptors are neither identical nor distinct.

Two deliberate design choices preserve independence from 001K:

- **Citation-string equality alone never yields IDENTICAL.** Every identical finding required recorded-provision agreement, and the reasoning is stated per relation in `duplicate_relations.json`.
- **`source_artifact_sha256` was excluded from the rule.** File identity is not provision identity, so a shared artifact hash could neither prove nor defeat an identical finding.

Anchor and adjacency evidence was not used and could not have been: the ten identical clusters each consist of rows drawn from *different* artifact families or carrying different instrument titles, and the rule was applied to recorded descriptors only. No determination was made because two IDs are neighbours.

Each row-level determination is the strongest result across that row's relations: IDENTICAL if any identical relation exists, UNRESOLVED if no identical relation exists but an unresolved one does, DISTINCT if every relation is distinct, and NOT_IN_ANY_DUPLICATE_GROUP otherwise.

## 4. Where the duplicate relationships come from

Reproduced independently from the catalogue JSON block, not read from the register:

- **23 duplicate groups in total**: 14 `DUP-PAIR` groups (identical `(source_artifact, provision_or_citation)` pairs — 76 rows, 62 excess) and 9 `DUP-CITE` groups (one citation string reused across artifact families — 79 rows).
- **91 distinct rows** carry at least one duplicate relationship; **346 rows** carry none.
- **2,358 relations** exist between group members. A row inside two groups carries a relation in each group, so relation counts exceed row counts by design and are reported per group.

## 5. Relation-level determinations

| Determination | Relations |
| --- | ---: |
| `IDENTICAL_PROVISION_AND_VERSION` | 16 |
| `IDENTITY_UNRESOLVED` | 25 |
| `DISTINCT_PROVISION_OR_VERSION` | 2,317 |
| **Total** | **2,358** |

## 6. Row-level determinations (all 437 rows)

| Determination | Rows | Meaning |
| --- | ---: | --- |
| `IDENTICAL_PROVISION_AND_VERSION` | 22 | the row has at least one relation whose recorded provision and version are identical |
| `DISTINCT_PROVISION_OR_VERSION` | 54 | every relation the row has is distinct as recorded |
| `IDENTITY_UNRESOLVED` | 15 | the row has unresolved relations and no identical one |
| `NOT_IN_ANY_DUPLICATE_GROUP` | 346 | no duplicate relationship exists for the row |
| **Total** | **437** | every catalogue ID carries exactly one determination |

`duplicate_determinations.csv` holds one row per catalogue ID with 22 columns: the ID and catalogue line, the recorded record type, family, jurisdiction and canonical region, the recorded instrument and provision, the 001K `duplicate_group_id` and `duplicate_link_basis`, the group membership derived by this order, the derived pair anchor, the identical and unresolved counterparts, the count of distinct relations, the citation groups, the `row_identity_determination`, the evidence detail behind it, `removal_permitted` and the `gate_5_1_effect`. **`removal_permitted` is `NO` on all 437 rows.** No row is authorised for removal, merge or re-class by anything in this report.

### 6.1 The ten identical clusters (22 rows, 12 demonstrable excess rows)

| Members | Rows | Evidence recorded in the relation |
| --- | ---: | --- |
| `0010`, `0053`, `0054` | 3 | all recorded fields identical in the 0053/0054 pair; instrument-title variant only against 0010 |
| `0013`, `0041`, `0042` | 3 | all recorded fields identical in the 0041/0042 pair; instrument-title variant only against 0013 |
| `0003`, `0018` | 2 | same recorded provision and locator; instrument-title variant only |
| `0004`, `0014` | 2 | same recorded provision and locator; instrument-title variant only |
| `0005`, `0015` | 2 | same recorded provision and locator; instrument-title variant only |
| `0006`, `0016` | 2 | same recorded provision and locator; instrument-title variant only |
| `0007`, `0017` | 2 | same recorded provision and locator; instrument-title variant only |
| `0011`, `0044` | 2 | same recorded provision and locator; instrument-title variant only |
| `0399`, `0400` | 2 | same recorded provision and locator; jurisdiction token differs only |
| `0401`, `0402` | 2 | same recorded provision and locator; jurisdiction token differs only |

These are the only places in the corpus where the recorded evidence shows the same provision entered twice. They are **demonstrable recorded duplication, not a legal finding**: the corpus records the same provision under two or three identifiers, and the question whether the entries should one day be merged is a source-governance and owner decision, not a determination this order may make. The two three-row clusters show a stricter case (completely identical records) alongside a looser one (title variant), and both are reported without collapsing.

### 6.2 The six unresolved clusters (15 rows, up to 9 further excess rows)

| Members | Rows | Recorded reason the identity cannot be decided |
| --- | ---: | --- |
| `0315`, `0316`, `0317`, `0318`, `0320` | 5 | same recorded instrument, no provision descriptor recorded in any of the five |
| `0149`, `0150` | 2 | same recorded provision and locator, conflicting recorded content (years) |
| `0165`, `0166` | 2 | same recorded provision and locator, conflicting recorded content (start) |
| `0409`, `0411` | 2 | same recorded provision and locator, conflicting recorded content (start) |
| `0336`, `0349` | 2 | same recorded instrument, no provision descriptor recorded in either |
| `0337`, `0351` | 2 | same recorded instrument, no provision descriptor recorded in either |

The unresolved cases fall into exactly two shapes, and neither can be settled from the workspace: **absent descriptors** (the record names an instrument but no provision, so identity is not expressible) and **conflicting recorded content** on a shared locator (two rows claim the same locator with different effective information, which is a defect in the recorded corpus, not a duplicate to be assumed). Deciding either shape requires source retrieval, which this order does not perform, or an owner ruling on how a conflicting recorded value is to be treated.

### 6.3 The 54 rows whose duplicates are distinct as recorded

Fifty-four rows sit in duplicate *groups* but their recorded provisions differ, so they are distinct provisions that happen to share a citation string or a locator pattern. This is the substantive finding that reverses the indicator reading: **a repeated (artifact, citation) pair or a repeated citation string is not evidence of a duplicated provision.** The clearest examples are the large `DUP-CITE-009` citation group (61 rows, of which 1,818 relations are distinct) and the two 22–23 row `DUP-PAIR` groups (`DUP-PAIR-003` with 231 distinct relations, `DUP-PAIR-010` with 243 distinct and 10 unresolved), where a shared locator acknowledges a common instrument while each row records a different provision.

### 6.4 The 346 rows with no duplicate relationship

No repeated `(source_artifact, provision_or_citation)` pair and no repeated citation string was measured for these rows. They are untouched by the duplicate question and are reported only so that the four row classes sum to 437.

## 7. Independent reproduction of the 001K register

Every quantitative claim made by the 001K register that this order could re-measure was recomputed from the catalogue and the row file, not read back:

| 001K claim | Reproduced by this order | Result |
| --- | --- | --- |
| 437 rows, 437 distinct IDs | 437 rows, 437 distinct IDs | MATCH |
| 14 pair groups / 76 rows / 62 excess | 14 / 76 / 62 | MATCH |
| 9 citation groups / 79 rows / 15 carrying the group as primary link | 9 / 79 / 15 | MATCH |
| `duplicate_link_basis` 76 / 15 / 346 | 76 / 15 / 346 | MATCH |
| 68 rows linked to a canonical entry other than themselves; 369 own anchors | 68 / 369 | MATCH |
| 429 distinct `legal_provision_key` | 429 | MATCH |
| 64 rows name a citation group inside `duplicate_evidence` | 64 | MATCH |
| dispositions GAP 18 / REFUSAL 3 / UNRESOLVED 416 | 18 / 3 / 416 | MATCH |
| disposition states `RECORDED_DURABLE` 21 / `BLOCKED_MISSING_EVIDENCE` 416 | 21 / 416 | MATCH |
| group IDs and canonical anchors equal the catalogue-derived groups | 0 group mismatches, 0 anchor mismatches | MATCH |

The 001K register's factual content therefore stands as recorded, and this order's different conclusions about *identity* come from applying an identity rule to the same data, not from finding an arithmetic error.

## 8. Canonical anchors are bookkeeping only

The register records a canonical anchor for each duplicated row and links 68 rows to an anchor that is not themselves. In this order those anchors were treated strictly as internal bookkeeping:

- No row inherited an anchor's disposition, evidence, status or class.
- No anchor was treated as a legal provision, a source of authority, or a superior record.
- No row was merged into, replaced by, or removed in favour of its anchor.
- Anchor mismatch was used only as a cross-check that this order's derived groups match 001K's (0 mismatches). It carried no weight in any determination.

This matters because the ten identical clusters are pairs and triples of *separate catalogue entries with separate IDs and separate dispositions*. Whether the corpus should one day hold one entry instead of two or three is an owner and source-governance question. Until an owner decides, all 437 IDs remain exactly as recorded.

## 9. The historical B20 count (39 / 380 / 18): evidence outcome

### 9.1 What was searched

Every pre-existing file in the workspace (236 files, recursive, including hidden files and all extensions, enumerated in `input_inventory.json`) was searched for: the token `B20`; the owner-decision row `PHASE4-002I-B20-OWNER-DECISIONS`; the tally sentences `39 PROBABLE`, `380 EXCLUDED`, `18 UNRESOLVED`; the instruction `reconciled to durable records`; the reconciliation target `persisted source-discovery records`; and the class words `PROBABLE_CANDIDATE` and `EXCLUDED`. Text-decodable files were read as text; PDF and PNG captures were scanned as raw bytes with a context window extracted around every hit. Structural probes then looked for any artifact that combines many `CRP-LSRC-` identifiers with disposition class words.

### 9.2 What was found

- **The tally sentence exists once, as an owner statement, in `CRP_DIRECT_REPORT_CONTENT_SOURCE_EXPANSION_CONTRACT.md` §6**, and thereafter only as a quotation (001K register §11.1, next-gate reconciliation §5.3, 001K provenance `b20.tally_as_recorded`). No quotation adds any per-ID content.
- **All non-document hits are coincidences**, verified by context extraction: 156 hits in the California bill list are `AB-200`/`AB-202` bill identifiers and their version keys; one hit is a base64 payload substring in a California code HTML capture; one is an ordinary character run in a poor OCR capture; the rest are single byte-runs inside PDF and PNG payloads. None is a disposition record or an identifier list.
- **No artifact holds a per-ID list, a per-ID class, or the source-discovery record set behind the tally.** The catalogue assigns no B20 class to any of its 437 entries: every entry carries `catalogue_status: ADMITTED_SOURCE_ONLY`, and no entry's `verification_state_as_recorded` contains `PROBABLE` or `EXCLUD`. The only `EXCLUDED` occurrence in the catalogue is the schema instruction to use the value `WITHHELD_EXCLUDED_TEXT`.
- **Exactly one durable per-ID candidate record exists in the whole workspace**: `CRP-DISC-002C-NY-0194.md`, covering the single ID `CRP-LSRC-0194` (`SOURCE_STATUS: PROBABLE_CANDIDATE`, ceiling `PROBABLE_VIOLATION`), echoed by readiness plan §6.4/§9.4 and by that row's recorded disposition basis. So **1 of the claimed 39 is attributable and 38 are not; 0 of the 380 and 0 of the 18 are attributable.**
- **The reconciliation target named by the plan does not exist.** The build plan requires the totals to be reconciled against "the persisted source-discovery records". No such artifact is in the workspace; the plan itself postpones any permanent discovery registry and the readiness plan records the report-representation artifact as absent.
- **The six named mapping IDs are not a class list.** `CRP-LSRC-0354`, `0422`, `0423`, `0424`, `0425` and `0427` are named at build plan line 142 as report-representation mappings "pending exact report-field/event mapping"; each is a `CONTENT_RULE` entry recorded `verified=true` in the catalogue, and no file records which B20 class any of them holds.

### 9.3 What cannot be reconciled

Which 39 records were probable candidates; which 380 were excluded; which 18 were unresolved and whether those 18 are the catalogue's 18 `GAP` records (no artifact asserts it); whether any named row, including `CRP-LSRC-0018` and `CRP-LSRC-0194`, is inside or outside any class; and the identity of the persisted source-discovery records that the plan names as the target. **The failure is evidential, not arithmetic**: 39 + 380 + 18 = 437 holds, and the missing part is the attribution of IDs to classes. Further documentation cannot create it.

The following reconstructions are expressly prohibited and were not performed: guessing membership from current counts or from the 18 `GAP` records; mapping the tally onto the register's disposition vocabulary; treating the tally as a per-ID record; or deriving the 39 from the FCRA quadruple or any other candidate-shaped subset.

### 9.4 Proposed owner disposition (NOT enacted)

**One owner decision would close this item.** The proposal, recorded in full in `b20_basis_search.json` under `proposed_owner_disposition`, is to record the historical aggregate as an **unattributed historical aggregate rather than a starting count** — 39 / 380 / 18 of 437, source expansion contract §6, per-ID basis `MISSING_EVIDENCE`, never pushed down onto rows. Enacting it requires the owner to amend two recorded instructions: build plan §3 Phase 5.1 bullet 4 and §6 line 142, and the parallel sentence in the expansion contract §6 owner-decision block. Draft replacement text:

> The historical PHASE4-002I-B20 tally (39 probable candidates / 380 excluded / 18 unresolved of 437) is recorded as an unattributed historical aggregate whose per-ID inventory is absent from this workspace. It is not carried forward as the register's certified starting count and must not be attributed to any catalogue ID. The gate 5.1 count condition is satisfied by the register's own per-ID record dispositions, which are built from durable evidence; the tally is retained only as a recorded historical statement.

The alternative route is that the owner supplies the per-ID inventory behind the tally (or authorises its reconstruction from the legacy system), in which case the existing plan text stands unchanged and the tally is reconciled ID by ID. **This order did neither**: no governing document was amended, no aggregate was replaced or restated, no ID was assigned to any class, and no disposition was inherited.

## 10. What the determinations mean for counting (bookkeeping only)

The determinations change nothing about the corpus, but they do change what can honestly be said about its size. Recorded as bookkeeping indicators only:

| Quantity | Value |
| --- | ---: |
| source records (catalogue IDs) | 437 |
| rows with no duplicate relationship | 346 |
| rows with at least one duplicate relationship | 91 |
| rows demonstrably identical at recorded-descriptor level | 22 |
| demonstrable excess rows in the ten identical clusters | 12 |
| **upper bookkeeping value** (437 − 12) | **425** |
| rows whose identity is unresolved | 15 |
| maximum further excess if every unresolved cluster is one provision | 9 |
| **lower bookkeeping value** (425 − 9) | **416** |

**Coincidence warning (must be recorded wherever these numbers appear).** The lower bookkeeping value 416 is numerically equal to the 416 `UNRESOLVED` disposition rows in the 001K row file. The two quantities are unrelated: one counts candidate duplicate rows in ten/six clusters, the other counts catalogue records awaiting evidence. Their equality is a coincidence of arithmetic and **must not be read as agreement, corroboration or identity**. The resemblance is called out here precisely so that no later reader mistakes it for a cross-check that passed.

**These values are NOT CERTIFIED.** They are recorded-descriptor indicators, not a legal-provision count, not a candidate count, not a coverage measure, and not a substitute for the B20 aggregate. They must not be published as the corpus count, used as a starting count for a downstream step, or quoted without the coincidence warning.

## 11. Preservation result

**PRESERVATION HELD.**

| Check | Result |
| --- | --- |
| Pre-write baseline vs post-write re-hash, this order's own output directory excluded | 236 files / 55,191,978 bytes / `482B93C8…C4BD` both times — **IDENTICAL** |
| Pre-existing files created, modified, moved or deleted by this order | **0** |
| Frozen inputs named in 001K §2 re-hashed | **14 / 14 MATCH** |
| 001K custody manifest re-verified entry by entry | **3 / 3 MATCH** |
| Cross-check against 001K's own preservation record (232 baseline + 4 new = 236) | **CONSISTENT** |
| Catalogue entries before / after | **437 / 437** |
| Records removed, rows rewritten, dispositions changed, anchors written back, rules admitted, findings or coverage created | **0 each** |
| The 15 unresolved-identity rows | **15 / 15 still present** and queued, none collapsed, merged or re-classed |

Every write performed by this order landed inside `SOURCE_CAPTURES\PHASE5-001L\`. No pre-existing file was opened for writing, no command in this order had a write target outside that directory, and no governing document was amended.

Verification method at the close of the order was deliberately two-fold. **Per file:** all 236 recorded inventory entries were re-hashed individually against the size and SHA-256 recorded for each of them in `input_inventory.json` — 0 missing, 0 byte-count mismatches, 0 hash mismatches. **In aggregate:** the composite inventory digest was recomputed from the recorded hash lines and reproduced exactly (`482B93C8…C4BD`), under the format defined in `preservation_recheck.json` (`close_of_order_verification.composite_digest_exact_format`). The narrative in this file is the only artifact of this order outside its evidence directory, and it is a new file, not a modification.

## 12. Gate 5.1 reassessment

Gate text, verbatim from the build plan:

> Gate 5.1: every source ID is accounted for once, all counts reconcile, duplicate links are explicit, and no unresolved item was silently excluded. If reports are only present in chat, first create the durable, schema-conforming rescreen register from the accepted reports, with provenance to each batch and correction.

| Gate condition | State | Basis |
| --- | --- | --- |
| every source ID is accounted for once | **MET** | 437 rows, 437 distinct `source_entry_id` values, 0 missing, 0 repeated, 0 non-catalogue identifiers, 0 catalogue identifiers absent from the row file |
| all counts reconcile | **NOT MET** | The register's own counts reproduce exactly, but the carried-forward B20 aggregate 39 / 380 / 18 cannot be reconciled to durable records from this workspace: no per-ID basis exists, so 0 of the 380 and 0 of the 18 can be attributed at all and only 1 of the 39 can. No count may be certified while that aggregate stands as a starting count |
| duplicate links are explicit | **ADVANCED, NOT FULLY RESOLVED** | 001K left same-provision identity open; this order determined all 2,358 relations (2,317 distinct as recorded, 16 identical, 25 unresolved) and gave every one of the 437 rows a determination plus a next action. Twenty-two rows carry 12 demonstrable excess and 15 rows sit in six unresolved clusters worth up to 9 further excess, so the unique-provision count is still not final |
| no unresolved item was silently excluded | **MET** | The 416 unresolved rows are queued individually in the 001K row file with a named blocker, and this order queues the 15 unresolved-identity rows individually in `duplicate_determinations.csv`. Nothing was dropped, defaulted, inferred or merged |
| if reports are only present in chat, first create the durable, schema-conforming rescreen register with provenance to each batch and correction | **MET BY 001K, CUSTODY VERIFIED HERE** | The 001K register and row file are durable and carry batch provenance; this order verified their custody 3/3 and their factual content by independent reproduction |

**Gate 5.1 status: NOT PASSED.** Two conditions met, one partially advanced, one failed.

The failing condition is the count reconciliation, and it fails on missing evidence, not on disputed reasoning: the per-ID inventory behind the historical B20 aggregate is not in this workspace and cannot be produced by further documentation. The partially advanced condition is the duplicate-link condition, which is no longer a ledger of repeated strings but a per-row determination — yet still not final, because fifteen rows cannot be decided from their recorded descriptors and the unique-provision count depends on them.

Per the governing treatment recorded elsewhere in this programme, a gate that cannot yet be satisfied may hold below passed while remaining open and documented, provided the blocking item is named and queued and no downstream step consumes the uncertified quantity. That is the state here.

## 13. What this order did not do

No record was collapsed, merged, re-classed or removed. No disposition was inherited by any twin, anchor or canonical member. No candidate count, unique-provision count, coverage figure or percent-complete figure was certified. No rule was admitted and no finding was created. No catalogue content was changed; the catalogue is byte-identical to the state 001K recorded. No governing document, plan, contract, register or report was amended. No consumer report, transmission or network call was made. No source was retrieved, so the six unresolved clusters, the absent provision descriptors and the conflicting recorded values all remain exactly as found.

## 14. Next action

**One owner decision unblocks this gate.** Either

- **(a)** amend build plan §3 Phase 5.1 bullet 4 and §6 line 142, and the parallel sentence in the source expansion contract §6 owner-decision block, so that the B20 tally is recorded as an unattributed historical statement rather than the register's certified starting count — draft wording in §9.4 above; or
- **(b)** supply the per-ID inventory behind the tally (39 / 380 / 18 of 437), or authorise its reconstruction from the legacy system, so that it can be reconciled ID by ID against the existing plan text.

**Work that is not blocked by that decision** and could proceed independently: source retrieval (or an owner ruling on conflicting recorded values) for the six unresolved identity clusters `0315/0316/0317/0318/0320`, `0149/0150`, `0165/0166`, `0409/0411`, `0336/0349`, `0337/0351`; and the owner question whether any of the ten demonstrably identical clusters should one day be a single catalogue entry. Neither is authorised by this order and neither was begun.

## 15. Artifacts produced by this order

All under `SOURCE_CAPTURES\PHASE5-001L\`, with digests in `file_custody_manifest.json`:

| Artifact | Contents |
| --- | --- |
| `input_inventory.json` | every pre-existing workspace file with size and SHA-256, the 236-file baseline digest, and the frozen-input inventory |
| `duplicate_relations.json` | all 23 groups and all 2,358 relations with the recorded evidence and reasoning behind each determination |
| `duplicate_determinations.csv` | one row per catalogue ID (437 rows, 22 columns): recorded descriptors, group memberships, counterparts, `row_identity_determination`, `removal_permitted`, `gate_5_1_effect` |
| `duplicate_identity_analysis.json` | relation, row, cluster and group level analysis; identical clusters; unresolved clusters; reproduction table |
| `b20_basis_search.json` | the B20 search design, every hit with its context, the reproducible-hit classification, the per-ID attribution result and the proposed owner disposition |
| `preservation_recheck.json` | pre/post preservation digests, frozen-input and 001K custody verification, unit-level preservation counters |
| `gate_5_1_requirement_reassessment.json` | gate text verbatim, per-requirement states, per-condition states, gate result, count sensitivity and the coincidence warning |
| `file_custody_manifest.json` | digest record for the seven evidence artifacts and this narrative |
| `CRP_PHASE5_001L_DUPLICATE_AND_COUNT_RECONCILIATION.md` | this narrative report |

## 16. Conclusion

The duplicate-identity half of gate 5.1 is now determined rather than indicated: of 23 duplicate groups spanning 91 rows and 2,358 relations, 16 relations and 22 rows are identical in their recorded descriptors (10 clusters, 12 demonstrable excess rows), 25 relations and 15 rows cannot be decided from the record (6 clusters, up to 9 further excess rows), and 2,317 relations and 54 rows are distinct provisions that merely share a citation or a locator. The counts 425 and 416 are bookkeeping indicators only and are explicitly not certified; their resemblance to the 416 unresolved rows is a coincidence and is flagged as such.

The historical-count half fails: the B20 aggregate 39 / 380 / 18 has **no per-ID basis in this workspace**, only 1 of the 39 is attributable to a durable record, the reconciliation target named by the plan does not exist, and no reconstruction was attempted. Preservation held exactly — 236 files, 55,191,978 bytes, identical digest, 14/14 frozen inputs and 3/3 custody entries verified.

**Gate 5.1 is NOT PASSED.** It is blocked on one owner decision about the B20 aggregate, and separately awaits retrieval or an owner ruling on six identity clusters before any provision count could be final. No downstream step may treat 425, 416 or the B20 aggregate as a certified count.

**End of report.**





