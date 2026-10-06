# CRP Corrected-Logic Rescreen Register

**Status:** Derived documentation register produced under work order `PHASE5-001K`. **Not** executable authority, **not** a corpus contract, **not** rule admission, **not** governed legal coverage, **not** a permitted legal finding, **not** a candidate, **not** legal advice. It passes no Phase 5 gate, waives no gate, and changes no legal-source content.
**Work order:** `PHASE5-001K`, issued and specified in `CRP_PHASE5_NEXT_GATE_RECONCILIATION.md` §10. The authorising document's SHA-256 was re-verified at the start of this order as `18312EE8853BBF36BD2F5B9CE46201DC60457382F0C646C74CF5FAC34AD6E817` — match, so execution proceeded.
**Effective date:** 2026-09-30
**Source of every copied value:** the 437 entries of `CRP_GLOBAL_LEGAL_SOURCE_CATALOGUE.md` §4, parsed from disk during this order. Nothing in this register was retyped from memory, from conversation, or from another document.

## 0. Position in one page

**Gate 5.1 is NOT PASSED.** The build plan's own gate text (`CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md` §3, line 55) is:

> "**Gate 5.1:** every source ID is accounted for once, all counts reconcile, duplicate links are explicit, and no unresolved item was silently excluded. If reports are only present in chat, first create the durable, schema-conforming rescreen register from the accepted reports, with provenance to each batch and correction."

State of its four conditions after this order:

| Condition | State now | Evidence |
| --- | --- | --- |
| every source ID is accounted for once | **MET** — 437 rows, 437 distinct IDs, 0 missing, 0 repeated, 0 non-catalogue IDs | §3, §4, §12.1 |
| all counts reconcile | **NOT MET** — this register's own counts reconcile, but the carried-forward B20 tally does not, and it is the count Phase 5.1 requires to be reconciled first | §11, the B20 block |
| duplicate links are explicit | **MET AS AN INDICATOR LEDGER, NOT RESOLVED** — every duplicated string is linked at row level, but same-provision identity across differing artifacts stays open, so the unique-provision count is not final | §6, §7 |
| no unresolved item was silently excluded | **MET** — 416 unresolved rows are queued individually with a named blocker; none is dropped, defaulted or inferred | §10 |

The failing condition is the one Phase 5.1 makes a precondition of its own second sentence, quoted verbatim from the build plan §6:

> "The corrected-logic B20 report gives a provisional source-record tally of 39 probable candidates, 380 excluded, and 18 unresolved; it must be reconciled to durable records before becoming the register's certified starting count."

That reconciliation has not happened and cannot be performed from anything in this workspace: the tally is recorded as **`RECORDED_AND_UNRECONCILED`**, no per-ID list behind it exists in any artifact, and no row in this register was assigned a class from it (§11.3). The build plan's own stop condition for this situation is "counts, duplicate identity, or source provenance cannot be reconciled" (build plan §5, line 136); the affected rows are queued rather than resolved by assignment (§10).

**What this register therefore is.** The durable, schema-conforming rescreen register for all 437 catalogue IDs that the never-executed `PHASE5-001B` was ordered to build — its first half only. It records one disposition per ID from the six-value vocabulary, an explicit duplicate ledger, per-batch provenance including the unexecuted order, and a per-row open-blocker queue. **What it is not:** a Phase 5.2 disposition pass, a Gate 5.3 mapping, a duplicate-identity adjudication, or an admission of anything.

## 1. Authority, boundary and method

**Authority.** The owner authorised execution of the bounded, documentation-only `PHASE5-001K` work order in `CRP_PHASE5_NEXT_GATE_RECONCILIATION.md` §10. This register is that order's output. It creates no rule, no coverage, no finding, no candidate and no confidence value, and it re-opens nothing.

**Files written by this order — exactly the five §10.2 permits, no others:**

| Action | Path |
| --- | --- |
| Create | `c:\CRP-NEW\CRP_CORRECTED_LOGIC_RESCREEN_REGISTER.md` (this file) |
| Create | `c:\CRP-NEW\SOURCE_CAPTURES\PHASE5-001K\rescreen_register.csv` |
| Create | `c:\CRP-NEW\SOURCE_CAPTURES\PHASE5-001K\rescreen_provenance.json` |
| Create | `c:\CRP-NEW\SOURCE_CAPTURES\PHASE5-001K\file_custody_manifest.json` |
| Append only | `c:\CRP-NEW\CRP_GLOBAL_LEGAL_SOURCE_CATALOGUE.md` §6 Amendment History — one dated `PHASE5-001K` row |

**Boundary observed, stated in writing (authorising document §10.6 item 6):** no network call, no search, no archive attempt, no consumer-report or provider-data request, no bureau, furnisher, collector or vendor contact, no new source discovery, no new consumer evidence, no legal text retrieved or paraphrased into a rule, no parser, evaluator or detector change, no application or deployment change, no file under `packages\`, no `PHASE5-001I` issue, no Git initialisation, staging, commit, move, rename or delete. Governed legal coverage remains 0 and permitted legal findings remain 0.

**Method.** Every value in `rescreen_register.csv` is either (a) copied verbatim from the parsed catalogue entry, or (b) derived by a rule stated in §4 to §6 and applied mechanically. Every count in this document was re-derived from `rescreen_register.csv` alone (§12.1). Where a recorded statement and a measurement could disagree, the measurement is reported and the discrepancy named (§12.5).

**What this order deliberately did not do:**

- it did not re-litigate, re-test or re-interpret any source, jurisdiction, effective-period or legal-test determination accepted under owner ruling `PHASE5-001A` (build plan line 14 and §6);
- it did not decide which repeated strings are genuine duplicate legal provisions, or which member of a pair is canonical in law (§6.4);
- it did not state whether any report layout permits reliable event/date mapping — the authorising document §10.5 sends that question to Gate 5.3, where it stays `UNRESOLVED`;
- it did not issue `PHASE5-001I`, and it did not treat the six B20 mapping instructions, the aggregate tally, or any bureau, furnisher or subscriber artifact as a class, a representation or a finding (`OWNER-001J` item 4).

## 2. Step 1 — the inputs, frozen and re-hashed before anything was written

All ten inputs listed in `CRP_PHASE5_NEXT_GATE_RECONCILIATION.md` §6.1 were re-read and re-hashed from disk at the start of this order, byte size and SHA-256 both. **Every value matched.** No input changed, so no row below is stated against a stale revision.

| Input | Bytes | SHA-256 | Match |
| --- | ---: | --- | --- |
| `CRP_GLOBAL_LEGAL_SOURCE_CATALOGUE.md` | 445,785 | `5BCC3CDE2827C33D8DE318434EA25C26B79363D63C9818A2449B5195DBCD019D` | MATCH |
| `CRP_GAP_REFUSAL_RESOLUTION_REGISTER.md` | 391,651 | `84DE842DE9699B9B937464B8B753454A3E10846CA280D79B91D38DD359BD34C0` | MATCH |
| `CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md` | 18,938 | `4A31AC4C1011EE67D3B1678DB834401B252AFBCE6A18C49B99BEDF49119ED813` | MATCH |
| `CRP_PROD_001_READINESS_AND_IMPLEMENTATION_PLAN.md` | 50,624 | `B4CBF5010B86750EB087FDB2CE2F8DACFE576C6F85CEA7BB44A38A1FED580312` | MATCH |
| `CRP_DIRECT_REPORT_CONTENT_SOURCE_EXPANSION_CONTRACT.md` | 30,768 | `F89C8C425A03760E0F73728AF44B2E22D34D2159D29E917F02451B5BBAB3B9AD` | MATCH |
| `CRP-DISC-002C-NY-0194.md` | 6,824 | `8487B60EA6020F10ABCE04E76D9CECE6ADD580900F7149111845376F4A2E5BA0` | MATCH |
| `CRP_EXPERIAN_US_CONSUMER_FORMAT_INVESTIGATION.md` | 30,422 | `F109E6D3CECA33ACD0FA2BCB8699A96C3B1028684E0190059FA8107264DFB550` | MATCH |
| `CRP_ALTERNATE_US_CONSUMER_FORMAT_INVESTIGATION.md` | 12,362 | `F51E296B31F720F286092EF71D507DB02C7753F99ED234FC00A4ECC3CB4E0BA0` | MATCH |
| `CRP_PUBLIC_REPORT_FORMAT_BASELINE_2026-09-30.md` | 22,090 | `0318DCDF15868FE180283F3C2A87F5CBBC03CBFBDE2510F8730644032DA1C4FB` | MATCH |
| `CRP_OWNER_001J_ALTERNATE_US_CONSUMER_FORMAT_WORK_ORDER.md` | 4,501 | `BAEED31CC9C5AB6460762424E1223B906E1919A746AFD15C82287F0BD3E20F1A` | MATCH |

Two further files were read and hashed because they are the executed batches' own instruments: `CRP_PHASE5_001G_OFFICIAL_SOURCE_TEXT_COMPLETION_WORK_ORDER.md` and `CRP_PHASE5_001H_EVIDENCE_RECONCILIATION_WORK_ORDER.md`. Their sizes and digests are in `rescreen_provenance.json` → `evidence_files_read`.

**Preservation baseline.** Immediately before the first write, all 232 pre-existing files under `c:\CRP-NEW` (54,141,326 bytes) were hashed individually; the full list is in `rescreen_provenance.json` → `preservation_baseline_before` → `files`, and the same 232 files were re-hashed at the end of the order (§12.4). No file outside §1's five entries was created, changed, moved, renamed or deleted — including nothing under `consumer-wizard\` and nothing under `packages\`, which does not exist.

## 3. Step 2 — the frozen baseline, asserted before any register file was written

| Assertion | Required | Measured | Result |
| --- | --- | --- | --- |
| JSON objects in catalogue §4 | exactly 437 | 437 | PASS |
| IDs | exactly `CRP-LSRC-0001`–`CRP-LSRC-0437` | first `0001`, last `0437` | PASS |
| missing IDs | 0 | 0 | PASS |
| non-catalogue IDs | 0 | 0 | PASS |
| repeated IDs | 0 | 0 | PASS |
| entries not carrying 15 fields | 0 | 0 | PASS |
| `catalogue_status` values | all `ADMITTED_SOURCE_ONLY` | 437 of 437 | PASS |
| `record_type` tally vs catalogue §1 counters | must match | `CONTENT_RULE` 255, `LIMITATION_RECORD` 111, `AUTHORITY_RECORD` 27, `CITATION_RECORD` 23, `GAP` 18, `REFUSAL` 3 — identical to §1 | PASS |

Had any assertion failed, the order would have stopped under §10.5 ("the catalogue does not assert 437 entries, IDs `0001`–`0437`, 15 fields and `ADMITTED_SOURCE_ONLY`") and reported the measured numbers instead. None failed, so the register was written. This is the authorising document's §10.3 step 2; it is also the second reading of the catalogue in this order, taken deliberately before any write so that the file the register is derived from cannot have moved underneath it.

## 4. Step 3 — the row file and its columns

`SOURCE_CAPTURES\PHASE5-001K\rescreen_register.csv` holds **437 data rows plus one header row**, UTF-8 without BOM, LF line endings, all fields quoted with `"` and internal quotes doubled. Columns, in the fixed order §10.3 step 3 requires:

`source_entry_id`, `record_type`, `legal_family`, `legacy_jurisdiction_reference`, `canonical_jurisdiction_status`, `canonical_country_code`, `canonical_region_code`, `provision_or_citation`, `source_locator`, `source_artifact`, `source_artifact_sha256`, `catalogue_status` — the twelve catalogue fields, **copied from the parsed entry value, never retyped** — then the derived columns `legal_provision_key`, `canonical_entry_id`, `duplicate_group_id`, `duplicate_link_basis`, `duplicate_evidence`, `disposition`, `disposition_basis`, `disposition_state`, `blocker_type`, `missing_artifact`, `clearing_authority`.

**Two conventions, stated so the file cannot be misread.** (1) Where the catalogue records JSON `null` (232 cells, all of them `canonical_country_code`, `canonical_region_code` or a `canonical_*` pairing), the CSV carries the literal `null`; the catalogue holds no empty-string cells in the fifteen-field grid (measured: 0), so `null` in this file always means JSON null. (2) No string value in the catalogue contains a carriage return or line feed (measured: 0 of 6,555 string cells, checked before writing), so the CSV's physical line count equals its logical row count; nothing was normalised, escaped or re-wrapped to achieve that.

## 5. Step 4 — the dispositions, and what is NOT claimed for them

**The vocabulary is closed and is the build plan's** (`CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md` §3 phase 5.1, line 50): `CONFIRMED_CANDIDATE`, `PROBABLE_CANDIDATE`, `EXCLUDED`, `UNRESOLVED`, `GAP`, `REFUSAL`. Measured over the register: **0 rows carry a value outside the vocabulary and 0 rows carry a blank `disposition`.**

| Disposition | Rows | Basis |
| --- | ---: | --- |
| `GAP` | 18 | the recorded value of the 18 `GAP` entries reconciled durably in the register (groups A, B, C = 7 + 9 + 2) |
| `REFUSAL` | 3 | the recorded value of the 3 `REFUSAL` entries reconciled durably in the register (group D) |
| `UNRESOLVED` | 416 | 6 named B20 mapping instructions + `CRP-LSRC-0194` + 409 rows for which no durable per-ID basis exists anywhere in this workspace |
| **total** | **437** | 18 + 3 + 416 = 437 |

**The three assignment rules, applied mechanically:**

1. **The 21 durably dispositioned IDs take their recorded value**, with the register section as the basis. Groups are the register's own: A = `0075`, `0310`, `0311`, `0312`, `0323`, `0324`, `0398`; B = `0076`, `0077`, `0078`, `0325`, `0412`, `0413`, `0435`, `0436`, `0437`; C = `0321`, `0322`; D = `0395`, `0396`, `0397`. Each row's `disposition_basis` names `CRP_GAP_REFUSAL_RESOLUTION_REGISTER.md` with its `§2` status row, its `§4` group and the `§7.4` per-ID index, adds the `§3.x` mapping section or `§13.x` correction section where the register holds one, cites the per-ID result ranges `§8.3`, `§10.4`, `§11.5`, `§12.4`, and cites the catalogue entry text recorded under `PHASE5-001C`. Example, quoted from the row for `CRP-LSRC-0325`: "`§2` row for this ID, `§4` group B, `§7.4` index, `§3.2` mapping, `§13.7` correction, with per-ID results in `§8.3` / `§10.4` / `§11.5` / `§12.4` and the catalogue entry text recorded under `PHASE5-001C`".
2. **The six B20 mapping IDs take `UNRESOLVED`** — `CRP-LSRC-0354`, `0422`, `0423`, `0424`, `0425`, `0427` — on the basis "named per-ID mapping instruction" (`CRP_DIRECT_REPORT_CONTENT_SOURCE_EXPANSION_CONTRACT.md` §6 owner-decision block, lines 194–216 and 225–231, carried forward at build plan §3 line 52). The required task is stated in words in each row's `missing_artifact`, e.g. for `0422`: "explicit report identification of the inquiry with the exact date the information request was made"; for `0423` to `0425` and `0427`: "explicit representation of the bureau's collection of the information"; for `0354`: "the exact presentation mapping to the last-payment event, preserving the last-payment-date and no-payment/default-date alternatives". **No class was inferred for any other ID from these six.**
3. **Every other ID takes `UNRESOLVED` with `disposition_state = BLOCKED_MISSING_EVIDENCE`, a `blocker_type`, and the exact missing artifact named.** `EXCLUDED`, `GAP` and `REFUSAL` were never assigned to a row without a durable per-ID basis, and no row was left blank.

**Unresolved is not support.** An `UNRESOLVED` row asserts nothing about any consumer report, creates no candidate, no coverage, no finding and no confidence value, and may not be reported as a disposition of substance. 416 of the 437 rows stand in that state (§10).

**The candidate row.** `CRP-LSRC-0194` carries `UNRESOLVED` as its **source-record rescreen disposition** because no durable per-ID disposition exists for it (§5.2 of the authorising document). That row does **not** demote, promote or re-decide the unit's separately recorded qualification: `CRP-LSRC-0194` remains a `PROBABLE_CANDIDATE` with representation `UNRESOLVED`, its probable-only ceiling intact, no bureau selected and `M-1` pending. The row's `disposition_basis` says so, and so does `rescreen_provenance.json` → `step_12_qualifications_preserved`.

## 6. Step 5 — the duplicate crosswalk, explicit at row level

### 6.1 The rule applied, and the two bases

Every row carries `legal_provision_key`, `canonical_entry_id`, `duplicate_group_id`, `duplicate_link_basis` and `duplicate_evidence`. The two measured bases §10.3 step 5 permits were applied mechanically and nothing else was used:

- **`IDENTICAL_ARTIFACT_AND_CITATION`** — two or more rows whose `(source_artifact, provision_or_citation)` pair is character-identical.
- **`REPEATED_CITATION_ONLY`** — a `provision_or_citation` string repeated across **more than one distinct** `source_artifact` value.

**`adjacent_id` was not used at any point and is recorded as a basis for no row.** Array position played no part in any group: groups were formed by string comparison over the parsed entries, then ordered by lowest member ID only so the identifiers are reproducible.

**What a group means.** A string-identical artifact/citation pair is a **duplicate indicator**, not a proven duplicate legal provision. Same-provision identity across differing artifacts remains an **open question** (§6.4), and no row was merged, dropped, rewritten or counted once in the row totals. `canonical_entry_id` is the **lowest catalogue ID in the group** — a bookkeeping anchor for the crosswalk, chosen by ID order, **not** a legal finding that this member is the canonical provision.

### 6.2 The 14 pair groups (76 rows, 62 excess rows)

| Group | Rows | Excess | Canonical anchor | Members (last four digits) | Citation as recorded |
| --- | ---: | ---: | --- | --- | --- |
| `DUP-PAIR-001` | 2 | 1 | `0041` | 0041 0042 | `§ 607(b) — 15 U.S.C. § 1681e(b)` |
| `DUP-PAIR-002` | 2 | 1 | `0053` | 0053 0054 | `§ 623(a)(5)(A) — 15 U.S.C. § 1681s-2(a)(5)(A)` |
| `DUP-PAIR-003` | 22 | 21 | `0078` | 0078 0325 0326 0327 0328 0329 0330 0331 0332 0333 0334 0335 0412 0414 0415 0416 0417 0418 0419 0420 0421 0435 | `NOT RECORDED` |
| `DUP-PAIR-004` | 2 | 1 | `0149` | 0149 0150 | `§ 55-2-6` |
| `DUP-PAIR-005` | 2 | 1 | `0165` | 0165 0166 | `§ 380-j(f)(1)(ii)` |
| `DUP-PAIR-006` | 5 | 4 | `0300` | 0300 0301 0302 0303 0310 | `NOT RECORDED` |
| `DUP-PAIR-007` | 5 | 4 | `0304` | 0304 0305 0306 0307 0311 | `NOT RECORDED` |
| `DUP-PAIR-008` | 2 | 1 | `0308` | 0308 0312 | `NOT RECORDED` |
| `DUP-PAIR-009` | 2 | 1 | `0314` | 0314 0410 | ``NOT RECORDED (`section: null`)`` |
| `DUP-PAIR-010` | 23 | 22 | `0315` | 0315 0316 0317 0318 0320 0321 0322 0323 0324 0336 0337 0338 0339 0340 0341 0342 0343 0344 0345 0346 0347 0348 0413 | `NOT RECORDED` |
| `DUP-PAIR-011` | 3 | 2 | `0349` | 0349 0350 0351 | `NOT RECORDED` |
| `DUP-PAIR-012` | 2 | 1 | `0399` | 0399 0400 | `s. 5 (time limit for actions founded on simple contract)` |
| `DUP-PAIR-013` | 2 | 1 | `0401` | 0401 0402 | `s. 24(1) (time limit for actions to enforce judgments)` |
| `DUP-PAIR-014` | 2 | 1 | `0409` | 0409 0411 | ``Credit account performance data — 6 years for live decision`` |

**Totals: 14 groups, 76 rows, 62 excess rows.** Six of the fourteen groups (006, 007, 008, 009, 011 and the singletons inside 003) consist of rows whose citation is a "not recorded" variant, which is why the excess concentrates there: 61 catalogue rows carry the exact string `NOT RECORDED` and 2 carry `NOT RECORDED (`section: null`)`. Those rows are grouped as identical **strings**, and the register claims nothing else about them — a repeated "not recorded" is not evidence that two provisions are the same, and it is not evidence that they differ.

### 6.3 The 9 citation-only groups (79 rows, 15 rows carrying the group as their primary link)

| Group | Rows | Distinct artifacts | Rows carrying it as primary link | Canonical anchor | Members (last four digits) | Citation as recorded |
| --- | ---: | ---: | ---: | --- | --- | --- |
| `DUP-CITE-001` | 2 | 2 | 2 | `0003` | 0003 0018 | `§ 605(a)(5) — 15 U.S.C. § 1681c(a)(5)` |
| `DUP-CITE-002` | 2 | 2 | 2 | `0004` | 0004 0014 | `§ 605(a)(1) — 15 U.S.C. § 1681c(a)(1)` |
| `DUP-CITE-003` | 2 | 2 | 2 | `0005` | 0005 0015 | `§ 605(a)(2) — 15 U.S.C. § 1681c(a)(2)` |
| `DUP-CITE-004` | 2 | 2 | 2 | `0006` | 0006 0016 | `§ 605(a)(3) — 15 U.S.C. § 1681c(a)(3)` |
| `DUP-CITE-005` | 2 | 2 | 2 | `0007` | 0007 0017 | `§ 605(a)(4) — 15 U.S.C. § 1681c(a)(4)` |
| `DUP-CITE-006` | 3 | 2 | 1 | `0010` | 0010 0053 0054 | `§ 623(a)(5)(A) — 15 U.S.C. § 1681s-2(a)(5)(A)` |
| `DUP-CITE-007` | 2 | 2 | 2 | `0011` | 0011 0044 | `§ 609(a)(1) — 15 U.S.C. § 1681g(a)(1)` |
| `DUP-CITE-008` | 3 | 2 | 1 | `0013` | 0013 0041 0042 | `§ 607(b) — 15 U.S.C. § 1681e(b)` |
| `DUP-CITE-009` | 61 | 7 | 1 | `0075` | 0075 0078 0300 0301 0302 0303 0304 0305 0306 0307 0308 0310 0311 0312 0315 0316 0317 0318 0320 0321 0322 0323 0324 0325 0326 0327 0328 0329 0330 0331 0332 0333 0334 0335 0336 0337 0338 0339 0340 0341 0342 0343 0344 0345 0346 0347 0348 0349 0350 0351 0412 0413 0414 0415 0416 0417 0418 0419 0420 0421 0435 | `NOT RECORDED` |

**Totals: 9 groups, 79 rows.** A row sits in at most one group of each family, and a row already linked by an identical artifact/citation pair takes that pair group as its `duplicate_group_id` — its stronger link. Where such a row also sits in a citation-only group, **the citation group's identifier is named inside its `duplicate_evidence`** (measured: 64 rows do this), so no membership is hidden; the complete membership of both families is also held in `rescreen_provenance.json` → `step_05_duplicate_crosswalk`. That is why three citation-only groups (006, 008, 009) show only one row carrying the citation group as its primary link while the group itself holds 3, 3 and 61 rows.

**Row-level totals of the duplicate ledger:** `IDENTICAL_ARTIFACT_AND_CITATION` 76 rows, `REPEATED_CITATION_ONLY` 15 rows, `NO_REPEATED_STRING_MEASURED` 346 rows — 76 + 15 + 346 = 437. **68 rows are linked to a canonical anchor other than themselves** (62 in pair groups beyond the anchor, 6 in citation-only groups beyond the anchor); 369 rows are their own anchor.

### 6.4 The question this ledger deliberately leaves open

Same-provision identity across differing artifacts is **not** decided here. The expansion contract requires the opposite treatment to be recorded honestly rather than assumed — "retain an explicit canonical/duplicate cross-reference and count the underlying legal provision once in legal-rule totals, while counting each catalogue ID once in source-record totals. Do not infer duplicate relationships from adjacency or array order" (§6 owner-decision block) — and the build plan §3 line 51 adds "Count source records separately from unique legal provisions; do not infer duplication from adjacent IDs". What this register can state is the size and shape of the remaining judgement: 62 excess rows in 14 pair groups, 79 rows in 9 citation groups, and the fact that the 429 distinct provision keys of §7 do **not** resolve it.

## 7. Step 6 — source records counted separately from unique legal provisions

| Measure | Value |
| --- | ---: |
| Source records in the register | 437 |
| Distinct `legal_provision_key` values | 429 |
| Source records minus distinct keys | 8 |
| Row-to-provision ratio | 1.0186 |

`legal_provision_key` is composed mechanically from values recorded in the catalogue, joined with a pipe: `canonical_country_code`, `canonical_region_code`, `legacy_jurisdiction_reference`, `instrument_title`, `provision_or_citation` — exactly as recorded, with **no semantic merging, no normalisation, no case folding and no punctuation stripping**.

**The 429 is declared, not relied on.** It is a *strict string-identity* count: any wording difference separates two rows. It follows that it is **not** the register's unique-provision count. Two rows with different keys may still be the same legal provision (so the true count may be lower), and two rows with the same key are only asserted to be the same string (so the count may also be treated as an upper bound). The authority for treating it as provisional is the expansion contract's own instruction that "The distinct underlying legal-provision candidate count must be reported separately after duplicate cross-references are reconciled" (§6 owner-decision block) — that reconciliation is not done, so this register reports **437 source records**, a **provisional 429-key reading**, and the difference of 8 as an unreconciled remainder, and it reports no candidate count at all.

## 8. Step 7 — batch provenance, including the order that was never executed

Per-batch provenance is recorded in full in `rescreen_provenance.json` → `step_07_batch_provenance`. The measured summary:

| Batch | State | Artifact and range | IDs touched | Batch completion statement durable | Note |
| --- | --- | --- | ---: | --- | --- |
| `PHASE5-001A` | `RECORDED_OWNER_RULING` | `CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md` line 14 and §6 (line 142) | 0 | yes | source, jurisdiction, effective-period and legal-test determinations accepted as owner-authorised truth; **not re-litigated, not re-tested and not re-opened by this order** |
| `PHASE5-001B` | **`ORDERED_NOT_EXECUTED`** | ordered at build plan §6 (line 144); artifact defined at build plan §4 item 1; **no such file exists** | 0 | **no** | `PHASE5-001B` occurs **0 times** in `CRP_GAP_REFUSAL_RESOLUTION_REGISTER.md` and **0 times** in the catalogue, both measured; this is the order that would have built the durable register |
| `PHASE5-001C` | `EXECUTED` | register §2, §3, §4, §7.4 (lines 48–352), plus the catalogue §6 `PHASE5-001C` amendment row (line 7546) | 21 | yes | created the 21 durable dispositions (18 `GAP`, 3 `REFUSAL`) that §5.1 restates |
| `PHASE5-001D` | `EXECUTED` | register §8 (lines 353–593), per-ID results §8.3 | 21 | yes | official primary-source retrievals; count separation at §8.5 |
| `PHASE5-001E` | `EXECUTED` | register §10 (lines 615–939), per-ID results §10.4 | 21 | yes | boundary statement §10.6; owner decisions §10.7 |
| `PHASE5-001F` | `EXECUTED` | register §11 (lines 940–1459), per-ID results §11.5 | 21 | yes | owner rulings §11.4; boundaries §11.7 |
| `PHASE5-001G` | `EXECUTED` | register §12 (lines 1460–2219), per-ID results §12.4; own instrument `CRP_PHASE5_001G_OFFICIAL_SOURCE_TEXT_COMPLETION_WORK_ORDER.md`; evidence folder `SOURCE_CAPTURES\PHASE5-001G` | 21 | yes | captured artifacts and digests at §12.7; completion report §12.9 |
| `PHASE5-001H` | `EXECUTED` | register §13 (lines 2220–3276), corrections §13.4, per-ID work §13.5–§13.9; own instrument `CRP_PHASE5_001H_EVIDENCE_RECONCILIATION_WORK_ORDER.md`; evidence folder `SOURCE_CAPTURES\PHASE5-001H` | 9 | yes | the only batch that narrowed its per-ID range; closing statement §13.14 |
| `OWNER-001J` | `RECORDED_OWNER_DIRECTIONS` | `CRP_OWNER_001J_ALTERNATE_US_CONSUMER_FORMAT_WORK_ORDER.md` | 0 | yes | owner directions, quoted, **not treated as dispositions**; item 4 forbids deriving a class or representation from a bureau or vendor name |
| `PHASE5-001K` | `THIS_ORDER` | this register and the three files under `SOURCE_CAPTURES\PHASE5-001K` | 437 | yes | all 437 IDs carry one row; 21 restate durable dispositions and 416 are queued as unresolved |

**One measured fact governs how these blocks must be read.** Every executed batch from `001C` to `001G` names the **same twenty-one** catalogue IDs in its per-ID results, and `001H` names nine of them; no batch names any ID outside that set. The register states the boundary itself, at §8.8: "No entry outside the twenty-one targeted IDs was reviewed or touched by this work order." The register contains **0 occurrences of the word "rescreen"**, which is consistent with — and is the reason for — the authorising document's finding that the durable rescreen register does not exist: what `001C`–`001H` produced is a decision history about 21 IDs, not an accounting of 437.

**Provenance covers every executed batch**, including the one that was never executed, and each block records whether the batch's own completion statement is durable. The only batch whose completion statement is not durable is `001B`, because there is no artifact at all.

## 9. Step 8 — the next unreviewed ID, from durable records only

**`STATE = INDETERMINATE_FROM_DURABLE_RECORDS`.** The executed batches do not yield a determinate pointer to the next unreviewed catalogue ID, and none was guessed. The durable boundary is the register's own sentence at §8.8:

> "No entry outside the twenty-one targeted IDs was reviewed or touched by this work order."

Measured: `001C`, `001D`, `001E`, `001F` and `001G` each name the same 21 IDs; `001H` names 9 of them; no batch names any other ID. Everything the register reviewed is therefore inside the 21, and everything outside them has no review history to continue from. The candidate pointers, with the reason each is not a valid answer:

| Candidate pointer | Why it is not a determinate pointer | Strength |
| --- | --- | --- |
| `CRP-LSRC-0001` — the lowest catalogue ID carrying no durable disposition | catalogue array order is a manifest sequence, not a review pointer; adopting it would substitute position for a record, which the build plan forbids for duplicate inference and which this register declines to do for review order | `NOT_A_DURABLE_POINTER` |
| the register §8.8 and §13.13 next-cohort set: Canadian provincial and territorial publishers, then Australian state and territory limitation publishers, then FCRA § 605(c) and § 623(a)(2)–(a)(5), then the Privacy (Credit Reporting) Code 2024 | defined by publisher and passage, not by catalogue ID, so it cannot be resolved to an ID without an inventory this order is not permitted to build | `DURABLE_BUT_NOT_ID_LEVEL` |
| the B20 tally's 39/380/18 implies an inventory beyond the 21 | no per-ID list exists behind the tally in any artifact of this workspace | `NO_ID_LEVEL_CONTENT` |
| register §13.13 queue items 1, 2, 5, 6, 7, 8, 9 and owner items 11, 12 | these are source, passage and owner-decision items, not catalogue IDs | `NOT_ID_LEVEL` |

**Action taken:** the state is recorded as indeterminate, with the candidate pointers and their reasons preserved rather than resolved by preference. Substituting recollection, catalogue order or the tally for a durable pointer would manufacture a review boundary that no batch ever established.

## 10. Step 9 — the open-blocker queue

One entry per row whose `disposition_state` is not `RECORDED_DURABLE`: **416 entries**, held verbatim in `SOURCE_CAPTURES\PHASE5-001K\rescreen_provenance.json` → `step_09_open_blocker_queue` → `entries`, and as the same row set in `rescreen_register.csv`. Every entry carries a `blocker_type`, the exact missing artifact and the authority that would clear it.

| `blocker_type` | Rows | Exact missing artifact | Authority that would clear it |
| --- | ---: | --- | --- |
| `NO_DURABLE_RESCREEN_RECORD` | 409 | a durable per-ID corrected-logic rescreen disposition for that ID — no register section, work-order ledger, catalogue field or `SOURCE_CAPTURES` evidence package in this workspace records one | **WORK**: record a durable per-ID rescreen disposition in an authorised batch; where the disposition turns on report-field or event-date mapping it additionally requires an **AUTHORISED_EVIDENCE_ROUTE**. No off-report element may be supplied (`OWNER-001J`, build plan §5) |
| `REPORT_EVENT_DATE_MAPPING_UNVERIFIED` | 6 | the exact report representation and field mapping named per ID in `CRP_DIRECT_REPORT_CONTENT_SOURCE_EXPANSION_CONTRACT.md` §6: the inquiry request date (`0422`), the bureau's collection of the information (`0423`–`0425`, `0427`), the last-payment event presentation (`0354`) | **AUTHORISED_EVIDENCE_ROUTE (report representation) plus OWNER_DIRECTION**; the contract states that no additional consumer evidence may be requested |
| `CANDIDATE_REPRESENTATION_UNRESOLVED_GATE_5_3_M1` | 1 | a byte-pinned US consumer disclosure, or an official product-specific consumer field/value reference, showing the account-level medical-debt representation for N.Y. Gen. Bus. Law § 380-j(a)(3) | **AUTHORISED_EVIDENCE_ROUTE — closed by owner direction** until a concrete new source appears; `M-1` remains pending, the unit stays `PROBABLE_CANDIDATE` with `UNRESOLVED` representation, and `PHASE5-001I` must not be issued |
| **total** | **416** | | 7 rows need an owner-direction-adjacent evidence route; 409 need work, plus an evidence route only where the disposition turns on report mapping |

**Seven of the 416 rows cannot be cleared by work alone** — the six B20 mapping IDs and `CRP-LSRC-0194` — because each depends on an authorised evidence route that owner direction has currently closed. The remaining 409 rows are documentation work that no external evidence can block: their disposition is recoverable from material already in this workspace, which is exactly why the authorising document treats the register's absence as demonstrated incomplete work rather than missing evidence.

**Unresolved is not support.** These 416 rows assert nothing about any consumer report, establish no fact about any provider, furnisher or collector, create no candidate, no coverage, no finding and no confidence value, and cannot be presented as a completed disposition.

### 10.1 The seven rows that need an evidence route, itemised

| ID | `blocker_type` | Missing artifact (as named in the row) |
| --- | --- | --- |
| `CRP-LSRC-0354` | `REPORT_EVENT_DATE_MAPPING_UNVERIFIED` | the exact presentation mapping to the last-payment event for Nova Scotia Credit Reporting Act s 10(3)(c), preserving the last-payment-date and no-payment/default-date alternatives |
| `CRP-LSRC-0422` | `REPORT_EVENT_DATE_MAPPING_UNVERIFIED` | explicit report identification of the inquiry with the exact date the information request was made (Privacy Act 1988 (Cth) s 20W inquiry-retention limb) |
| `CRP-LSRC-0423` | `REPORT_EVENT_DATE_MAPPING_UNVERIFIED` | explicit representation of the bureau's collection of the information (s 20W item 4) |
| `CRP-LSRC-0424` | `REPORT_EVENT_DATE_MAPPING_UNVERIFIED` | explicit representation of the bureau's collection of the information (s 20W item 5) |
| `CRP-LSRC-0425` | `REPORT_EVENT_DATE_MAPPING_UNVERIFIED` | explicit representation of the bureau's collection of the information (s 20W item 6) |
| `CRP-LSRC-0427` | `REPORT_EVENT_DATE_MAPPING_UNVERIFIED` | explicit representation of the bureau's collection of the information (s 20W item 9) |
| `CRP-LSRC-0194` | `CANDIDATE_REPRESENTATION_UNRESOLVED_GATE_5_3_M1` | a byte-pinned US consumer disclosure, or an official product-specific consumer field/value reference, showing the account-level medical-debt representation for N.Y. Gen. Bus. Law § 380-j(a)(3) |

None of these seven may be advanced by this order: §10.5 of the authorising document stops the order where "a row's clearing requires opening a network resource, a consumer-format artifact, a provider channel, or any new search", and where "the register would have to state whether a report layout permits reliable event/date mapping". Both triggers would fire, so both questions are recorded as open and untouched.

### 10.2 The 409 `NO_DURABLE_RESCREEN_RECORD` rows, listed in full

```text
0001 0002 0003 0004 0005 0006 0007 0008 0009 0010 0011 0012 0013
0014 0015 0016 0017 0018 0019 0020 0021 0022 0023 0024 0025 0026
0027 0028 0029 0030 0031 0032 0033 0034 0035 0036 0037 0038 0039
0040 0041 0042 0043 0044 0045 0046 0047 0048 0049 0050 0051 0052
0053 0054 0055 0056 0057 0058 0059 0060 0061 0062 0063 0064 0065
0066 0067 0068 0069 0070 0071 0072 0073 0074 0079 0080 0081 0082
0083 0084 0085 0086 0087 0088 0089 0090 0091 0092 0093 0094 0095
0096 0097 0098 0099 0100 0101 0102 0103 0104 0105 0106 0107 0108
0109 0110 0111 0112 0113 0114 0115 0116 0117 0118 0119 0120 0121
0122 0123 0124 0125 0126 0127 0128 0129 0130 0131 0132 0133 0134
0135 0136 0137 0138 0139 0140 0141 0142 0143 0144 0145 0146 0147
0148 0149 0150 0151 0152 0153 0154 0155 0156 0157 0158 0159 0160
0161 0162 0163 0164 0165 0166 0167 0168 0169 0170 0171 0172 0173
0174 0175 0176 0177 0178 0179 0180 0181 0182 0183 0184 0185 0186
0187 0188 0189 0190 0191 0192 0193 0195 0196 0197 0198 0199 0200
0201 0202 0203 0204 0205 0206 0207 0208 0209 0210 0211 0212 0213
0214 0215 0216 0217 0218 0219 0220 0221 0222 0223 0224 0225 0226
0227 0228 0229 0230 0231 0232 0233 0234 0235 0236 0237 0238 0239
0240 0241 0242 0243 0244 0245 0246 0247 0248 0249 0250 0251 0252
0253 0254 0255 0256 0257 0258 0259 0260 0261 0262 0263 0264 0265
0266 0267 0268 0269 0270 0271 0272 0273 0274 0275 0276 0277 0278
0279 0280 0281 0282 0283 0284 0285 0286 0287 0288 0289 0290 0291
0292 0293 0294 0295 0296 0297 0298 0299 0300 0301 0302 0303 0304
0305 0306 0307 0308 0309 0313 0314 0315 0316 0317 0318 0319 0320
0326 0327 0328 0329 0330 0331 0332 0333 0334 0335 0336 0337 0338
0339 0340 0341 0342 0343 0344 0345 0346 0347 0348 0349 0350 0351
0352 0353 0355 0356 0357 0358 0359 0360 0361 0362 0363 0364 0365
0366 0367 0368 0369 0370 0371 0372 0373 0374 0375 0376 0377 0378
0379 0380 0381 0382 0383 0384 0385 0386 0387 0388 0389 0390 0391
0392 0393 0394 0399 0400 0401 0402 0403 0404 0405 0406 0407 0408
0409 0410 0411 0414 0415 0416 0417 0418 0419 0420 0421 0426 0428
0429 0430 0431 0432 0433 0434
```

Every number above is the last four digits of a `CRP-LSRC-` identifier. The list is generated from the row file's `blocker_type` column, so it cannot drift from the CSV; `0437` minus the 21 durable rows, the 6 B20 rows and `0194` leaves exactly 409.

## 11. Step 10 — totals reconciled, and the B20 position stated honestly

| Measure | Value |
| --- | ---: |
| rows | 437 |
| distinct `source_entry_id` | 437 |
| repeated IDs | 0 |
| missing IDs (`0001`–`0437`) | 0 |
| non-catalogue IDs | 0 |
| rows outside the six-value vocabulary | 0 |
| rows with a blank `disposition` | 0 |
| `GAP` / `REFUSAL` / `UNRESOLVED` | 18 / 3 / 416 |
| disposition sum | 437 |
| durable dispositions (groups A 7, B 9, C 2, D 3) | 21 |
| named B20 mapping instructions | 6 |
| rows with no durable basis anywhere in this workspace | 409 |
| candidate rows restated as `UNRESOLVED` here | 1 |
| `disposition_state` = `RECORDED_DURABLE` / `BLOCKED_MISSING_EVIDENCE` | 21 / 416 |
| rows linked to a canonical anchor other than themselves | 68 |

Shown as arithmetic:

```text
437 rows - 0 missing - 0 repeated - 0 non-catalogue = 437 distinct source_entry_ids
GAP 18 + REFUSAL 3 + UNRESOLVED 416 = 437
group A 7 + group B 9 + group C 2 + group D 3 = 21 durable dispositions
21 durable + 6 named B20 instructions + 409 rows with no durable basis + 1 candidate row = 437
RECORDED_DURABLE 21 + BLOCKED_MISSING_EVIDENCE 416 = 437
IDENTICAL_ARTIFACT_AND_CITATION 76 + REPEATED_CITATION_ONLY 15 + NO_REPEATED_STRING_MEASURED 346 = 437
source records 437 - distinct legal_provision_keys 429 = 8 (provisional; unreconciled)
B20 as recorded, UNRECONCILED: 39 + 380 + 18 = 437
```

### 11.1 The B20 aggregate, recorded and not attributed

The tally as recorded, quoted from `CRP_DIRECT_REPORT_CONTENT_SOURCE_EXPANSION_CONTRACT.md` §6 owner-decision block:

> "The resulting B20 source-record totals are 39 `PROBABLE_CANDIDATE`, 380 `EXCLUDED`, and 18 `UNRESOLVED` (437 total). The distinct underlying legal-provision candidate count must be reported separately after duplicate cross-references are reconciled."

| Element | State in this register |
| --- | --- |
| the tally itself | **`RECORDED_AND_UNRECONCILED`** — 39 / 380 / 18, internal arithmetic 39 + 380 + 18 = 437 |
| its source | expansion contract §6 owner-decision block, carried forward by build plan §3 phase 5.1 line 52 |
| the plan's instruction | build plan §6 line 142 requires it to be "reconciled to durable records before becoming the register's certified starting count" — **not done** |
| per-ID attribution | **none exists** in any artifact of this workspace; therefore none was constructed |
| rows assigned a class from the tally | **0** — no row carries `PROBABLE_CANDIDATE` or `EXCLUDED` because of it |
| the "18" | **not an identity** — the catalogue's 18 `GAP` records are recorded dispositions in register groups A–C, while the tally's 18 `UNRESOLVED` records are defined by an unverified report mapping; no artifact states the two sets are the same, and equating them would be a fabricated reconciliation |

**Why no attribution was made.** Attributing a class to a row from an aggregate would manufacture exactly the per-ID evidence Gate 5.2 requires; §10.5 of the authorising document forbids resolving an unreconcilable count "by assignment", and build plan §5 lists "counts, duplicate identity, or source provenance cannot be reconciled" as a stop condition. The 416 unresolved rows and the unreconciled tally are therefore reported, not solved. In particular, `CRP-LSRC-0018` and `CRP-LSRC-0194` are **not** asserted to be inside or outside the 39 or the 380.

## 12. Step 11 and §10.6 — verification performed as part of the order

### 12.1 Deterministic recount, from `rescreen_register.csv` alone

```powershell
$p='c:\CRP-NEW\SOURCE_CAPTURES\PHASE5-001K\rescreen_register.csv'; $r = Import-Csv -LiteralPath $p
"rows=$($r.Count) columns=$($r[0].PSObject.Properties.Name.Count) distinct=$(@($r.source_entry_id | Select-Object -Unique).Count)"
$r | Group-Object disposition, disposition_state, blocker_type, duplicate_link_basis | ForEach-Object { "$($_.Name) = $($_.Count)" }
```

Result: `rows=437 columns=23 distinct=437`; `GAP, RECORDED_DURABLE = 18`; `REFUSAL, RECORDED_DURABLE = 3`; `UNRESOLVED, BLOCKED_MISSING_EVIDENCE = 416`; `IDENTICAL_ARTIFACT_AND_CITATION = 76`; `REPEATED_CITATION_ONLY = 15`; `NO_REPEATED_STRING_MEASURED = 346`. The narrative adds nothing the row file does not carry, and the row file adds nothing the catalogue does not carry.

### 12.2 Bidirectional trace on a fixed sample

Six IDs were traced catalogue → register row → `disposition_basis` → the cited section of the cited file → back. The sample covers the minimum the authorising document §10.6 item 2 requires — one of the 21, one of the six B20 IDs, `CRP-LSRC-0194`, `CRP-LSRC-0435`, and one `BLOCKED_MISSING_EVIDENCE` row — plus `0078` as a second durable row with a mapping section:

| ID | Catalogue entry | Register row | `disposition_basis` resolves to | Back-trace |
| --- | --- | --- | --- | --- |
| `CRP-LSRC-0075` | §4 entry at line 1359 | `GAP`, `RECORDED_DURABLE`, blocker `NO_OPEN_ITEM_RECORDED` | register §2 line 52, §4 group A row at line 231, §7.4 line 326, per-ID results §8.3 / §10.4 / §11.5 / §12.4 | line 52 gives the status row, line 231 lists the ID in group A with its recorded disposition text, line 326 indexes it as "Yes" against §2 — all present |
| `CRP-LSRC-0078` | line 1410 | `GAP`, `RECORDED_DURABLE`, blocker `RECORDED_OPEN_ITEM` | register §2 line 55, §4 group B row at line 232, §7.4 line 329, §3.1 heading at line 82, per-ID results §8.3 / §10.4 / §11.5 / §12.4 | §3.1 is titled "United States — `CRP-LSRC-0078` (`US-*`)"; §5 item 1 states the wildcard blocker; §7.4 maps the ID to §3.1 |
| `CRP-LSRC-0435` | line 7479 | `GAP`, `RECORDED_DURABLE`, blocker `RECORDED_OPEN_ITEM` | register §2 line 70, §4 group B row at line 232, §7.4 line 344, §3.5 heading at line 135, per-ID results §8.3 / §10.4 / §11.5 / §12.4 | §3.5 is titled "Australia — limitation periods — `CRP-LSRC-0435` (`AU-*`)"; §5 item 10 states the wildcard blocker; §7.4 maps the ID to §3.5 |
| `CRP-LSRC-0354` | line 6102 | `UNRESOLVED`, `BLOCKED_MISSING_EVIDENCE`, blocker `REPORT_EVENT_DATE_MAPPING_UNVERIFIED` | `CRP_DIRECT_REPORT_CONTENT_SOURCE_EXPANSION_CONTRACT.md` §6 owner-decision block, lines 214 and 226 | both cited lines name `CRP-LSRC-0354` and state the last-payment presentation requirement, which the row's `missing_artifact` restates in words |
| `CRP-LSRC-0194` | line 3382 | `UNRESOLVED`, `BLOCKED_MISSING_EVIDENCE`, blocker `CANDIDATE_REPRESENTATION_UNRESOLVED_GATE_5_3_M1` | `CRP_PHASE5_NEXT_GATE_RECONCILIATION.md` §10.3 step 4(c) and §5.2; `CRP_PROD_001_READINESS_AND_IMPLEMENTATION_PLAN.md` §6.4 `B-2` / `B-3` and §9.4 (milestone `M-1`, line 541) | §5.2 measures "21 of 437 records"; the readiness plan records `B-2`, `B-3` and `M-1` where cited; the catalogue entry at line 3382 carries the recorded `PHASE5-001C` text |
| `CRP-LSRC-0400` | line 6884 | `UNRESOLVED`, `BLOCKED_MISSING_EVIDENCE`, blocker `NO_DURABLE_RESCREEN_RECORD`; duplicate anchor `0399` in `DUP-PAIR-012` | `CRP_PHASE5_NEXT_GATE_RECONCILIATION.md` §5.2 | the ID occurs **0 times** in the register, which is the §5.2 finding restated per row; its pair anchor `0399` appears in §4 and §7.4 |

**No break in any of the six chains.** Two of them (`0354`, `0400`) resolve to a *measured absence* rather than a per-ID statement; an absence is verified by counting occurrences, and those counts are recorded (0 each). The other four resolve to sections that name the ID directly. The 409 `NO_DURABLE_RESCREEN_RECORD` rows all carry the same basis form as `0400`, distinguished only by the ID embedded in `missing_artifact`, so the trace applies to the class and not merely to the sampled row.

### 12.3 Arithmetic check on the reconciliation block

Printed as arithmetic in §11, with the word **UNRECONCILED** attached to the B20 line: `39 + 380 + 18 = 437`. The register's own arithmetic closes independently in five ways: rows, dispositions, durable groups, duplicate bases and blocking states.

### 12.4 Hash and custody check

Every file this order created carries a size and SHA-256 in `SOURCE_CAPTURES\PHASE5-001K\file_custody_manifest.json` (`file`, `bytes`, `sha256`), written after the register and the row file were final. The check was then re-run at the close of the order: each created file re-hashed and compared with the manifest (all match), and the ten inputs of §2 re-hashed. For the inputs, **nine of the ten are byte-identical to §2**, and the tenth is the catalogue, whose only change is the append of §12.5:

| File | Before | After | Change |
| --- | ---: | ---: | --- |
| `CRP_GLOBAL_LEGAL_SOURCE_CATALOGUE.md` | 445,785 bytes / `5BCC3CDE2827C33D8DE318434EA25C26B79363D63C9818A2449B5195DBCD019D` | 447,509 bytes / `3ACB39A3B6E80DD4DB38689541CCC17542E941CEFA4D6C0A355B9816F030038D` | +1,724 bytes = 1,722 bytes of appended text + the CRLF that terminates it |
| the other nine inputs | as §2 | unchanged | none |

**Preservation re-verified.** All 232 files of the pre-write baseline were re-hashed at the close of the order: **0 missing, exactly 1 changed — the catalogue.** Nothing else in the workspace moved, and the only new files in it are the four §1 entries (the fifth change being the appended catalogue line).

### 12.5 Diff check on the catalogue

| Check | Result |
| --- | --- |
| line count | 7,546 → **7,547** |
| `PHASE5-001K` amendment rows in §6 | 0 → **1** (the §6 table now holds four rows: `PHASE2-001L`, `PHASE4-001F`, `PHASE5-001C`, `PHASE5-001K`) |
| §1 counters | byte-identical: `TOTAL SOURCE ENTRIES: 437` … `PERMITTED LEGAL FINDINGS: 0` |
| §5 block | byte-identical: `GOVERNED LEGAL RULES: 0`, `GOVERNED JURISDICTIONS WITH LEGAL COVERAGE: 0`, `PERMITTED LEGAL FINDINGS: 0` |
| §4 JSON block | still parses to **437** objects, 437 distinct IDs, 15 fields in every entry, every `catalogue_status` `ADMITTED_SOURCE_ONLY` |
| entry content | **0 of 437** rows differ from the live catalogue across the eleven copied value fields (`record_type`, `legal_family`, `legacy_jurisdiction_reference`, `canonical_jurisdiction_status`, `canonical_country_code`, `canonical_region_code`, `provision_or_citation`, `source_locator`, `source_artifact`, `source_artifact_sha256`, `catalogue_status`) — re-compared after the append against the row file built before it |
| 21 `PHASE5-001C` dispositions | still present and durably recorded: 21 of 21 rows remain `RECORDED_DURABLE` |
| line endings | CRLF throughout before and after (7,547 CR and 7,547 LF), so the appended line is terminated exactly like every other line; no mixed endings introduced |
| byte arithmetic | +1,724 = 1,722 (appended text) + 2 (CRLF) — accounted for to the byte |

**Conclusion: the catalogue's only change is the single appended §6 amendment row.** No entry, field, counter, disposition text, jurisdiction reference, artifact, digest or `catalogue_status` value moved, and no other pre-existing file's digest moved at all.

### 12.6 Boundary check, in writing

Confirmed for this order: **no** network call or search of any kind; **no** archive attempt; **no** consumer-report, consumer-data or provider-data request; **no** bureau, furnisher, collector or vendor contact; **no** new source discovery; **no** legal text retrieved, quoted from memory or paraphrased into a rule; **no** parser, evaluator, detector, application or deployment change; **no** file under `packages\` (which does not exist); **no** `PHASE5-001I` issue; **no** Git initialisation, staging, commit, move, rename or deletion; and **no** catalogue content change beyond the one appended line. Governed legal coverage remains 0, permitted legal findings remain 0, and no disposition or finding was promoted (`CRP-LSRC-0194` remains `PROBABLE_CANDIDATE` with representation `UNRESOLVED`, no bureau selected, `M-1` pending).

## 13. Step 12 — the Gate 5.1 verdict

**Gate 5.1 NOT PASSED.**

Failing condition, quoted from `CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md` §3 line 55: *"all counts reconcile"* and *"duplicate links are explicit"*. The first fails because the count Phase 5.1 carries forward — the B20 tally — remains unreconciled and unattributable (build plan §6 line 142: *"it must be reconciled to durable records before becoming the register's certified starting count"*), and the second is met only as a string-identity indicator ledger while same-provision identity across differing artifacts stays open (§6.4). The affected rows are held in the open-blocker queue (§10), which is the treatment build plan §5 requires when *"counts, duplicate identity, or source provenance cannot be reconciled"*.

Two of the gate's four conditions are now met that were not met before this order, and the difference is durable in files rather than in a report:

| Aspect | Before this order | After this order |
| --- | --- | --- |
| every source ID accounted for once | no register existed for any of the 437 IDs; per-ID evidence covered 21 (`PHASE5-001B` never executed) | 437 rows, 437 distinct IDs, one disposition each, in a custody-recorded row file |
| unresolved items visible | unresolved items visible only inside the 21-ID decision history and as aggregate counts | 416 rows individually queued with blocker type, missing artifact and clearing authority; 409 of them listed in §10.2 |
| duplicate links | no duplicate field and no crosswalk anywhere in the workspace | 14 pair groups and 9 citation groups recorded at row level, with `adjacent_id` rejected as a basis |
| counts | B20 tally recorded; register counts recorded for 21 IDs | register's own counts reconcile five ways; B20 recorded as `RECORDED_AND_UNRECONCILED` |

**What would change this verdict.** It becomes passable when (a) the B20 tally is reconciled to durable per-ID records — which needs the per-ID inventory behind the 39/380/18 that this workspace does not hold, and which no amount of further documentation can conjure — and (b) duplicate identity is adjudicated so that the unique-provision count is final. Until then any claim that Gate 5.1 has passed would rest on the aggregate being treated as a per-ID record, which is exactly the fabrication the expansion contract and the authorising document forbid.

**What this order did not do next, by rule.** It did not enter Phase 5.2 scope, did not re-review any accepted source, jurisdiction, effective-period or legal-test field, did not issue `PHASE5-001I`, and did not treat any unresolved row as support. The next prerequisite under the approved gate sequence is therefore **the completion of Gate 5.1 itself**: reconcile the B20 tally at per-ID level (blocked on missing evidence) and adjudicate duplicate identity across artifacts (work, no external evidence required). Only after both does Gate 5.2 — one reconciled report-only disposition per ID, or a documented reason each is not assessable — become assessable, and only after Gate 5.2 does the Gate 5.3 / `M-1` representation question on the critical path come into view. The `US-NY` unit remains exactly where it was: `PROBABLE_CANDIDATE`, representation `UNRESOLVED`, probable-only ceiling intact.

## 14. Acceptance criteria of the authorising order, and the files

Every acceptance criterion in §10.4 of `CRP_PHASE5_NEXT_GATE_RECONCILIATION.md` was checked against the created files; **none failed and none is blocked**:

| # | Criterion | Result | Evidence |
| ---: | --- | --- | --- |
| 1 | every ID accounted for once — 437 rows, 437 distinct IDs, no blanks, no duplicates, no non-catalogue IDs | **PASS** | §3, §11, §12.1 |
| 2 | every row carries a disposition from the six-value vocabulary with a `disposition_basis` naming an existing file and section | **PASS** | §5; 0 out-of-vocabulary rows, 0 blank dispositions, every basis string names a file and section |
| 3 | no class inferred; `EXCLUDED`, `GAP` and `REFUSAL` only from durable per-ID statements; everything else `UNRESOLVED` + `BLOCKED_MISSING_EVIDENCE`; "unresolved is not support" stated | **PASS** | §5, §10 |
| 4 | counts reconcile and are stated — rows, distinct IDs, per-disposition, and source-record versus unique-provision counts, with arithmetic | **PASS** | §11 (the B20 line is stated as unreconciled, not folded in) |
| 5 | duplicate links explicit at row level, measured groups listed, `adjacent_id` rejected as a basis | **PASS** | §6.1–§6.3 (23 groups listed; `adjacent_id` recorded for no row) |
| 6 | the B20 aggregate recorded and not attributed, with source, plan instruction and the absence of per-ID attribution stated | **PASS** | §11.1 |
| 7 | provenance covers every executed batch and records `001B` as `ORDERED_NOT_EXECUTED` | **PASS** | §8 (ten batches, including `001A` and `OWNER-001J`) |
| 8 | the open-blocker queue covers every non-durable row, each with the exact missing artifact and the authority that would clear it | **PASS** | §10 (416 entries; §10.2 lists the 409 work-blocked rows in full) |
| 9 | the Gate 5.1 verdict written explicitly, with the failing condition quoted | **PASS** | §13 |
| 10 | the diff is bounded — catalogue §6 changed by one appended line only, all other input hashes unchanged, no `packages\` file, custody manifest listing every created file with size and SHA-256 | **PASS** | §12.4, §12.5, `file_custody_manifest.json` |
| 11 | no new external evidence obtained | **PASS** | §12.6 |
| 12 | no disposition or finding promoted; `CRP-LSRC-0194` remains `PROBABLE_CANDIDATE` with representation `UNRESOLVED`; no bureau selected; `M-1` pending; `PHASE5-001I` not issued | **PASS** | §5 (candidate row), §12.6, `rescreen_provenance.json` |

The gate verdict is **not** one of those criteria and is **not** a pass: the order is complete, and Gate 5.1 remains **NOT PASSED** (§13).

**Files created by this order, and the one file appended to:**

| File | Role | Custody |
| --- | --- | --- |
| `CRP_CORRECTED_LOGIC_RESCREEN_REGISTER.md` | this register and its provenance narrative | size and SHA-256 in `file_custody_manifest.json` |
| `SOURCE_CAPTURES\PHASE5-001K\rescreen_register.csv` | 437 rows, 23 columns, one row per catalogue ID | size and SHA-256 in `file_custody_manifest.json` |
| `SOURCE_CAPTURES\PHASE5-001K\rescreen_provenance.json` | input hashes, preservation baseline, batch provenance, duplicate crosswalk, totals, B20 position, blocker queue, verification, qualifications preserved | size and SHA-256 in `file_custody_manifest.json` |
| `SOURCE_CAPTURES\PHASE5-001K\file_custody_manifest.json` | sizes and SHA-256 of the files this order created | the manifest does not carry its own digest, as in the prior evidence packages |
| `CRP_GLOBAL_LEGAL_SOURCE_CATALOGUE.md` | **append only** — one `PHASE5-001K` row in §6 Amendment History (§12.5) | before/after digests recorded in §12.4 and in `rescreen_provenance.json` |

**Closing statement.** This register is the durable, schema-conforming rescreen register for all 437 catalogue IDs, built from evidence that was already in this workspace and from nothing else. It restates 21 recorded dispositions without changing them, records 6 named mapping instructions and 1 candidate row as unresolved, queues 409 rows that have no durable basis for a disposition rather than inventing one, makes the duplicate ledger explicit while leaving duplicate identity open, and records the B20 tally as unreconciled rather than spreading it across rows. It passes no gate, creates no rule, coverage, candidate or finding, and leaves `US-NY` / `CRP-LSRC-0194` exactly as it found it: `PROBABLE_CANDIDATE`, representation `UNRESOLVED`, `M-1` pending, `PHASE5-001I` not issued.
