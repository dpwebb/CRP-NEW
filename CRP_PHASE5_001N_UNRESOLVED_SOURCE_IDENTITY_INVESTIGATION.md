# CRP Phase 5 — PHASE5-001N: Unresolved Source-Identity Investigation

**Order:** PHASE5-001N — bounded source-evidence investigation of the six unresolved duplicate-identity clusters
**Date:** 2026-09-30
**Status:** Complete
**Scope:** the six clusters and their fifteen member rows, the twenty-five unresolved relation records recorded for them by PHASE5-001L, and nothing else
**Result:** fourteen of the fifteen unresolved pairs are now determined — twelve distinct, two identical at instrument level — and one remains explicitly `IDENTITY_UNRESOLVED` with its exact missing fact named. **Gate 5.1 is NOT PASSED**, and this investigation does not pass it.

---

## 1. What this order was, and what it was not

PHASE5-001L determined every one of the 2,358 duplicate relations in the corpus except twenty-five, which it left `IDENTITY_UNRESOLVED` because the recorded descriptors alone could neither prove nor disprove that the two rows in each pair record one legal provision and version. PHASE5-001M recorded that residual as the remaining Gate 5.1 prerequisite and wrote a planning record, `next_bounded_action.json`, naming one bounded retrieval-or-ruling order over those six clusters. This is that order.

It is a source-evidence investigation. It retrieved public primary-source text for the recorded locators and official publishers of the member rows, compared that text against what each row records, and determined each relation. It did not collapse, merge, delete, re-class or re-dispose any row; it did not inherit any disposition; it did not interpret a reporting obligation, admit a rule, certify a count, create coverage or a finding, issue `PHASE5-001I`, begin Gate 5.2, or perform any Git operation. Nothing in it is legal advice or a statement of what any law requires of any person.

---

## 2. Scope, inputs and pre-write verification

Every input was re-hashed before the first write of this order and matched the digest its own order recorded:

| Input | Bytes | SHA-256 | Verified against |
| --- | --- | --- | --- |
| `CRP_CORE_CONSTITUTION.md` (rank 1) | 14,820 | `64027E2A…7C3D` | — |
| `CRP_LEGAL_INVARIANT.md` (rank 2) | 17,647 | `90324BFA…E431` | — |
| `JURISDICTION_CONTRACT.md` (rank 3) | 19,220 | `5B286EDA…5DFB` | — |
| `CRP_DIRECT_REPORT_CONTENT_SOURCE_EXPANSION_CONTRACT.md` (rank 4) | 32,294 | `B21952A5…6043` | PHASE5-001M post-amendment value |
| `CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md` (rank 5) | 21,997 | `4EFFB76C…9BB0` | PHASE5-001M post-amendment value |
| `CRP_CORRECTED_LOGIC_RESCREEN_REGISTER.md` | 57,342 | `B7A973C3…AD55` | PHASE5-001K manifest |
| `SOURCE_CAPTURES/PHASE5-001K/rescreen_register.csv` | 616,237 | `DFB78DD2…F24BB` | PHASE5-001K manifest |
| `SOURCE_CAPTURES/PHASE5-001K/rescreen_provenance.json` | 374,808 | `D3D4E3DA…364C3` | PHASE5-001K manifest |
| `SOURCE_CAPTURES/PHASE5-001L/duplicate_relations.json` | 1,199,309 | `E14596B0…4896` | PHASE5-001L manifest |
| `SOURCE_CAPTURES/PHASE5-001L/duplicate_determinations.csv` | 182,971 | `91C04428…B267` | PHASE5-001L manifest |
| `SOURCE_CAPTURES/PHASE5-001L/duplicate_identity_analysis.json` | 29,816 | `30E3C215…5BF7` | PHASE5-001L manifest |
| `SOURCE_CAPTURES/PHASE5-001M/next_bounded_action.json` | 4,625 | `7D796454…E5A4` | PHASE5-001M manifest |
| `CRP_GLOBAL_LEGAL_SOURCE_CATALOGUE.md` | 447,509 | `3ACB39A3…038D` | PHASE5-001M preservation record |
| `SOURCE_CAPTURES/PHASE5-001G/NS-consumer-reporting.pdf` | 351,156 | `5AD22806…5500` | existing capture; also an admission-contract pin |

The pre-write inventory of the whole workspace is `SOURCE_CAPTURES/PHASE5-001N/input_inventory.json`: **253 files, 56,850,355 bytes, composite digest `74073D60F607FE757970B7117BD44CED96826D09FA13CBD68011C0C075C2057C`**. That count is exactly PHASE5-001M's 245-file baseline plus PHASE5-001M's own eight artifacts, so nothing entered or left the workspace between the two orders.

The scoped rows are fixed: `CRP-LSRC-0315`, `0316`, `0317`, `0318`, `0320`, `0149`, `0150`, `0165`, `0166`, `0409`, `0411`, `0336`, `0349`, `0337`, `0351`.

---

## 3. Step 1 — the scoped rows and relations, reproduced before anything was retrieved

Recorded in `scoped_relation_reproduction.json`. The reproduction matches PHASE5-001L exactly: 2,358 relation records (16 identical, 25 unresolved, 2,317 distinct) and 437 rows (22 identical, 15 unresolved, 54 distinct, 346 with no duplicate relationship).

**The order names twenty-five unresolved relations; the six clusters hold fifteen unordered pairs.** Both figures are right, at different units, and the difference is explained before proceeding rather than papered over:

- the twenty-five are **relation records** in `duplicate_relations.json`;
- the ten unordered pairs among `0315/0316/0317/0318/0320` are each recorded **twice** — once under `DUP-PAIR-010`, which groups them by the shared `(source_artifact, provision_or_citation)` string `(legalRules.ts, "NOT RECORDED")`, and once under `DUP-CITE-009`, which groups them because the same rows also share a citation string across distinct artifacts;
- 20 + 1 + 1 + 1 + 1 + 1 = **25 records over 15 pairs**, with no comparison missing and no pair counted twice as an identity question. This order records one determination per pair, applied to each record that carries it.

Three further recorded artefacts were reproduced, explained and left exactly as recorded: `CRP-LSRC-0336` and `CRP-LSRC-0337` carry `canonical_entry_id = CRP-LSRC-0315` because the string-keyed ledger placed them in `DUP-PAIR-010` (their `NOT RECORDED` provision string repeats on the PIPEDA rows), although their own relations were already determined distinct; `CRP-LSRC-0349` is a `DUP-PAIR-011` anchor together with `CRP-LSRC-0350`, whose instrument is a different Act; and `CRP-LSRC-0314`, which records the same instrument and locator as the five PIPEDA rows, is absent from the unresolved cluster only because it records `NOT RECORDED (\`section: null\`)` rather than `NOT RECORDED`.

Every unresolved relation record has both members inside the scope. There are no unresolved rows outside it.

---

## 4. Step 2 — what the workspace already held, and what it did not

Recorded in `existing_capture_review.json`. For five of the six clusters the workspace held **no capture at all** — only the recorded descriptor and the legacy source-artifact digest (`legalRules.ts FE5C1BA6…D41F6`, `solTable.ts E0C04B27…96EF`, `authorities.canada.ts 34DED027…0B1`, all designated in `CRP_LEGACY_LEGAL_CORPUS_ADMISSION_CONTRACT.md` §2). The recorded content strings themselves existed only as recorded descriptors inside the catalogue and the 001L analysis.

The exception was the Nova Scotia cluster: `SOURCE_CAPTURES/PHASE5-001G/NS-consumer-reporting.pdf` already held the recorded locator document (351,156 bytes). That file's digest is also the retained-evidence pin `evidence\canada\nova-scotia\source-retrievals\historical-ns-cra-source-5ad22806.pdf` in the admission contract §2, so this order applies PHASE5-001H's correction item 3: the same bytes are **not** counted twice as new unique authority.

Per-row findings, all from `existing_capture_review.json`:

| Cluster | Jurisdiction and instrument as recorded | Exact provision as recorded | Version/date as recorded | Provenance recorded on the rows |
| --- | --- | --- | --- | --- |
| `0315`–`0320` | Canada, FEDERAL, country-wide; instrument recorded as `PIPEDA` | `NOT RECORDED` on all five | none | `legalRules.ts`; locator is an FCAC consumer page |
| `0149`/`0150` | US-WV exact; `W. Va. Code` | `§ 55-2-6` | none (locator field is an owner-approved mapping with no URL) | `solTable.ts` |
| `0165`/`0166` | US-NY exact; N.Y. Gen. Bus. Law art. 25 | `§ 380-j(f)(1)(ii)` | none | `legalRules.ts`; locator is a non-official reproduction |
| `0409`/`0411` | UK, `UK_TO_GB_RECONCILIATION_REQUIRED`; CRAIN retention table | one truncated table label, identical on both rows | none | `legalRules.ts`; locator is a credit reference agency notice |
| `0336`/`0349` | CA-NS exact; `Consumer Reporting Act (Nova Scotia), R.S.N.S. 1989, c. 93` | `NOT RECORDED` on both | none in the rows | `legalRules.ts` and `authorities.canada.ts` |
| `0337`/`0351` | CA-ON exact; `Consumer Reporting Act (Ontario), R.S.O. 1990, c. C.33` | `NOT RECORDED` on both | none in the rows | `legalRules.ts` and `authorities.canada.ts` |

---

## 5. Steps 3 and 4 — what was retrieved, what was preserved, and what could not be reached

Recorded in `retrieval_ledger.json`; every returned original is preserved under `SOURCE_CAPTURES/PHASE5-001N/retrieved/` with its URL, retrieval time, byte count and SHA-256.

| ID | Cluster | What it is | URL | Retrieved (UTC) | Bytes | SHA-256 |
| --- | --- | --- | --- | --- | --- | --- |
| R01 | PIPEDA | recorded locator of the five rows | `canada.ca/…/information-credit-report.html` | 2026-09-30T17:51:11Z | 28,353 | `0EBB2C9D…28AF` |
| R02 | PIPEDA | Justice Laws index of the recorded instrument | `laws-lois.justice.gc.ca/eng/acts/P-8.6/` | 2026-09-30T17:49:42Z | 24,616 | `2E724CAD…8D96` |
| R03 | PIPEDA | official consolidated PIPEDA text | `…/P-8.6/FullText.html` | 2026-09-30T17:52:38Z | 221,452 | `C753EB2C…9CB8` |
| R04 | WV | official text of the recorded provision | `code.wvlegislature.gov/55-2-6/` | 2026-09-30T17:49:44Z | 50,737 | `D7760D67…91B0` |
| R05 | WV | test route for the ten-year value | `code.wvlegislature.gov/55-2-12/` | 2026-09-30T17:49:45Z | 50,788 | `568C53D7…4294` |
| R06 | NY | official publisher, blocked | `nysenate.gov/legislation/laws/GBS/380-J` | 2026-09-30T17:50:55Z | 5,741 | `E358BFAD…B830` |
| R07 | NY | recorded locator of the two rows | `newyork.public.law/…/section_380-j` | 2026-09-30T17:49:46Z | 30,809 | `144FBBA7…AFCC` |
| R08 | CRAIN | recorded locator of the two rows | `experian.co.uk/legal/crain/data-retention-periods` | 2026-09-30T17:49:48Z | 107,806 | `25DB48E9…F516` |
| R09 | NS | recorded locator of the two rows | `nslegislature.ca/…/consumer reporting.pdf` | 2026-09-30T17:49:48Z | 351,156 | `5AD22806…5500` |
| R10 | ON | recorded locator of the two rows | `ontario.ca/laws/statute/90c33` | 2026-09-30T17:49:48Z | 54,243 | `883E8CC3…5022` |

**R09 is byte-identical** to the existing `SOURCE_CAPTURES/PHASE5-001G/NS-consumer-reporting.pdf` and to the admission-contract retained-evidence pin, so it corroborates provenance and adds no new authority bytes. **R01 needed three attempts** — a transport error, then a 60-second timeout with zero bytes, then a successful `curl.exe` request. **R10 is partial**: the route returns the e-Laws JavaScript application shell, containing no statute text and no occurrence of `90c33`, `statute`, `C.33` or `api/v2`.

Routes recorded as unreachable or unresolved, none of them treated as evidence of identity:

- **R06 — blocked.** The official publisher named by the source-discovery record for this instrument (New York State Senate OpenLegislation) answers automated requests with a Cloudflare managed challenge; the 5,741-byte challenge page is preserved as evidence of the block only.
- **R06b — unavailable.** The alternative New York host `public.leginfo.state.ny.us` could not be connected to at all (21-second failure, no body).
- **R11 — not resolved.** The e-Laws data service that feeds R10 was probed in twelve candidate route forms (ten GET, two POST) under `https://www.ontario.ca/laws/api/v2/legislation/`; every one returned HTTP 404. Three further requests to the statute route itself (plain, `/v33`, `?_format=json`) each returned the same application shell.

This is the only retrieval performed, and it is bounded to the recorded locators and official publishers of the fifteen member rows. No subscription, purchase, login, credential, private report, consumer datum or external contact was used.

---

## 6. Step 5 — comparison on exact locators and quoted text

Recorded in full in `source_text_comparison.json`. Citation strings, URLs, file hashes and neighbouring IDs were used as context and never on their own to establish identity.

**PIPEDA cluster (`0315`, `0316`, `0317`, `0318`, `0320`).** The retrieved FCAC page records a separate item for each recorded value: `"credit inquiries by lenders: 3 years with Equifax or 6 years with TransUnion"`; `"Usually, both Equifax and TransUnion remove a bankruptcy from your credit report 6 years after you're discharged."`; `"Equifax and TransUnion remove a consumer proposal from your credit report: 3 years after you've paid off all the debts included in the proposal, or 6 years after you sign the proposal (whichever comes first)"`; `"Credit bureaus remove this information from your credit report 2 years after you finish paying off your debts."`; `"Credit bureaus usually keep judgments on your credit report for 6 years."`. Five items, five periods, five triggers — no two rows share one.

The recorded instrument does not carry them. The official PIPEDA consolidation returns **zero** occurrences of `credit report`, `credit bureau`, `Equifax`, `TransUnion`, `enquir`, `judgment` or `six years`, and its only retention text is the general principle: `"Personal information shall be retained only as long as necessary for the fulfilment of those purposes."` (clause 4.5.1), with clause 4.5.2 requiring organisations to `"develop guidelines and implement procedures with respect to the retention of personal information"` that `"should include minimum and maximum retention periods"`. That is a contradiction between the recorded `instrument_title` (`PIPEDA`) and what was returned, and it is reported as contradiction **C-1** rather than resolved: neither the instrument field nor the locator field is rewritten.

**West Virginia cluster (`0149`/`0150`).** The recorded provision itself, retrieved in full, states `"§55-2-6. Actions to recover on award or contract other than judgment or recognizance."` and then sets different periods for different contract types: `"…within ten years"` for an indemnifying bond, a fiduciary or public-officer bond, `"any other contract in writing under seal"`, and an award or written contract not under seal; and `"…within five years"` for `"any other contract, express or implied"`. So **both recorded values are real limbs of the section both rows cite**. The ten-year value is not attributable to the neighbouring section tested for it: `"§55-2-12. Personal actions not otherwise provided for."` carries only two-year and one-year periods. The rows are therefore two limbs of one section, not one rule recorded twice, and no contradiction arises. Neither row records which limb it applies, and neither records an edition or a retrieval, so the limb correspondence is recorded and is not certified as a mapping.

**New York cluster (`0165`/`0166`).** The clause both rows cite contains two limbs in one clause: `"judgements which, from date of entry, antedate the report by more than seven years or until the governing statute of limitations has expired, whichever is the longer period; or judgments which, from date of entry, having been satisfied within a five year period from such entry date, shall be removed from the report five years after such entry date;"`. Row `0166` records the first limb's start (`"the date of entry, or the end of the governing statute of limitations, whichever is longer"`) and row `0165` records the second limb's start (`"the date the judgment was entered (judgment satisfied within 5 years of entry)"`). The clause text used was obtained from the locator the rows themselves record, because the official publisher route is blocked (C-3); the page also carries the statute's own effective-date notes, which is why it is not treated as version-free.

**CRAIN cluster (`0409`/`0411`).** The retrieved table's introduction states that `"The retention periods in the table are those linked to in section 7 of CRAIN. These periods are subject to regular review and may change from time to time."` Its `"Credit account performance data"` entry is `"11 years. This consists of six years for live decision-making plus a further five years for profiling and statistical analysis."` The page contains **zero** occurrences of `arrears` and **zero** of `settled`, so it reproduces neither recorded start (`"the date the account is settled or closed"`, `"the date the arrears were recorded"`), and it has no arrears item at all. The two rows share one truncated label and two different starts, which the label cannot separate. Reported as contradiction **C-2**; the pair stays unresolved.

**Nova Scotia cluster (`0336`/`0349`).** The retrieved document is the office consolidation whose title page reads `"Consumer Reporting Act"` / `"CHAPTER 93 OF THE REVISED STATUTES, 1989"` / `"as amended by 1999, c. 4, ss. 10-16; 2010, c. 47; 2014, c. 39, ss. 4, 5; 2017, c. 9, ss. 14-31; 2018, c. 43, ss. 13-16"` / `"(c) 2019 Her Majesty the Queen in right of the Province of Nova Scotia"`. It is the instrument both rows name, the same document for the row recorded with the token `NS` and the row recorded with `CANADA_NOVA_SCOTIA`, and neither row records a provision. No contradiction.

**Ontario cluster (`0337`/`0351`).** No statutory text was obtainable. Both rows name the same instrument, citation, locator and canonical region, and neither records a provision; the recorded fields agree text for text apart from the legacy jurisdiction token (`ON` against `CANADA_ONTARIO`), the verification state and the source artifact. The route limitation is recorded as **C-4**, and the missing fact is named: the current consolidation text and edition of `R.S.O. 1990, c. C.33`.

---

## 7. Step 6 — the determinations

Recorded in `relation_determinations.json`. The governing identity standard is applied, not amended: `IDENTICAL` needs agreement on every recorded identity field and no conflicting value for any shared effective-information key; `DISTINCT` where the recorded instrument, provision descriptor or authority differs; `IDENTITY_UNRESOLVED` where the descriptors are neither identical nor distinct. Where the descriptors were insufficient, the retrieved text decided the question; where the text was unavailable, the relation stayed unresolved and the missing fact was named.

| Pair | Members | Determination | What decided it |
| --- | --- | --- | --- |
| P01–P10 | the ten pairs among `0315`/`0316`/`0317`/`0318`/`0320` | **DISTINCT_PROVISION_OR_VERSION** (each) | five different retained items with different periods and triggers |
| P11 | `0149` / `0150` | **DISTINCT_PROVISION_OR_VERSION** | two different limbs of `§ 55-2-6` (five-year; ten-year limbs) |
| P12 | `0165` / `0166` | **DISTINCT_PROVISION_OR_VERSION** | two different limbs inside clause `(f)(1)(ii)` |
| P13 | `0409` / `0411` | **IDENTITY_UNRESOLVED** | recorded starts not reproducible at the recorded locator; missing fact named |
| P14 | `0336` / `0349` | **IDENTICAL_PROVISION_AND_VERSION** — instrument level, no provision recorded | same instrument, locator, region; no provision in either; official text retrieved |
| P15 | `0337` / `0351` | **IDENTICAL_PROVISION_AND_VERSION** — instrument level, no provision recorded | same instrument, locator, region; no provision in either; official text not retrievable |

All twenty-five relation records are mapped to these fifteen determinations in `relation_determinations.json`. At **record level** the tally is **2 identical, 22 distinct, 1 unresolved = 25**; at **pair level** it is **2 identical, 12 distinct, 1 unresolved = 15**. The remaining 2,333 relation records of the 2,358 are untouched.

The exact missing facts, retained rather than guessed:

- **P13 (CRAIN pair).** The CRAIN table row and version stating 6 years from the date the account is settled or closed, and the row and version stating 6 years from the date the arrears were recorded.
- **P15 (Ontario pair).** The current consolidation text and edition of `R.S.O. 1990, c. C.33`.
- **P01–P10 (PIPEDA group).** The exact instrument and provision behind each recorded retention item; no row records a provision and the cited page is not a legislative instrument.
- **P11 (West Virginia pair).** Which limb of `§ 55-2-6` each row applies; the rows record no limb, no edition and no retrieval.

Row level: thirteen of the fifteen rows now have every unresolved relation determined. `CRP-LSRC-0409` and `CRP-LSRC-0411` still carry one unresolved relation each. **Every one of the fifteen rows keeps its recorded disposition (`UNRESOLVED` / `BLOCKED_MISSING_EVIDENCE` / `NO_DURABLE_RESCREEN_RECORD`), remains in the catalogue, and stays `removal_permitted = NO`.** Four contradictions are reported and none was resolved by preference: C-1 (PIPEDA attribution), C-2 (CRAIN label and starts), C-3 (blocked New York official route), C-4 (unresolved Ontario data service).

---

## 8. Step 7 — the proposed identity ledger, produced but not applied

`proposed_identity_ledger_update.json` carries one proposed entry per scoped row: the relation determinations, an identity descriptor that distinguishes limb-level and item-level rows, and the registered fields that would have to be reconciled if it were ever applied. It is **not applied**: nothing was written into the register, the catalogue, the 001K evidence, the 001L evidence or any governing document, and all of those remain byte-identical.

Three things a future application would have to reconcile, and none of them is this order's decision: the register's `duplicate_evidence` wording still calls each of these strings a "string-identity duplicate indicator only, not a proven duplicate legal provision"; some `canonical_entry_id` values are indicator anchors only (for example `0336` and `0337` point at `CRP-LSRC-0315`); and **no field in the current register schema can express a limb descriptor or an instrument-level-only identity**, so an application would need a schema addition or a parallel ledger — which is itself an owner decision. Any change to a rank 4 or rank 5 document, or to a catalogue entry, is an amendment under Core Constitution §6 and cannot be made by this investigation.

---

## 9. Step 8 — the scoped totals, and their limited effect

Recorded in `scoped_count_recomputation.json`.

| Measure | Before this order | After this order |
| --- | --- | --- |
| Scoped relation records | 25 unresolved | 2 identical, 22 distinct, 1 unresolved |
| Scoped pairs | 15 unresolved | 2 identical (instrument level), 12 distinct, 1 unresolved |
| Scoped rows with only unresolved relations | 15 | 2 (`0409`, `0411`) |
| Corpus relation records (bookkeeping) | 16 / 2,317 / 25 | **18 identical / 2,339 distinct / 1 unresolved = 2,358** |
| Corpus row classification (bookkeeping) | 22 / 54 / 15 / 346 | **26 identical / 63 distinct / 2 unresolved / 346 none = 437** |
| Possible further excess rows from scoped clusters | up to 9 | 0 for the six now-distinct clusters, 0 at provision level for the two instrument-level pairs, up to 1 for the unresolved pair |

The bookkeeping bounds change accordingly: the upper value stays `437 − 12 = 425`; the lower variant becomes `425 − 1 = 424` if the CRAIN pair is one provision and the two instrument-level pairs contribute no provision, or `425 − 1 − 1 − 1 = 422` if all three pairs were each counted as one provision. Both lower variants are unproven, they are not a single value, and neither is certified.

**Two explicit coincidence warnings.** The value **424** is numerically equal to PHASE5-001L's recorded-descriptor measure `distinct_instrument_provision_keys = 424`. The two quantities are unrelated and the equality is a coincidence of arithmetic, **not** agreement, corroboration or identity. Conversely, the value **416** is produced by no bookkeeping variant here, so the warning attached to it in 001L and 001M does not transfer to 424 or 422 — while the register's own **416 `UNRESOLVED` rows remain unchanged** and unrelated to any figure in this order.

**What this subset cannot do.** It is a scoped recomputation over 25 of 2,358 relation records and 15 of 437 rows. It does not produce the **corpus-wide unique-legal-provision count** required separately by the amended Phase 5.1 bullet 3 and by the Corpus Contract §6 — that needs its own pass over all 437 rows, including the ten demonstrably identical clusters (12 excess rows) and the 346 rows with no duplicate relationship. It does not revisit the 2,317 relations 001L determined distinct. It does not decide whether the two instrument-level pairs, which record no provision at all, contribute anything to a legal-provision count. It measures, certifies and bounds no candidate, coverage or finding, and it changes no disposition. **No final unique-provision count is claimed from this subset.**

---

## 10. Step 9 — what Gate 5.1 now requires

Recorded in `gate_5_1_assessment.json`. The gate text is unchanged and is quoted there verbatim.

| Gate 5.1 condition | State |
| --- | --- |
| every source ID is accounted for once | **MET** — 437 rows, 437 distinct IDs, none missing, none repeated |
| no unresolved item was silently excluded | **MET** — every scoped relation now carries a determination or an explicit named residual |
| durable rescreen register with batch provenance | **MET** — unchanged 001K artifacts |
| all counts reconcile | **NOT FULLY MET** — the register's own per-ID counts reconcile, but the separate corpus-wide unique-legal-provision count is still missing and one scoped pair remains unresolved |
| duplicate links are explicit | **ADVANCED, NOT FULLY RESOLVED** — fourteen of fifteen pairs determined; the CRAIN pair is not, and the two instrument-level pairs carry no provision-level identity |

**Gate 5.1 remains NOT PASSED.** What changed is the blocker: five of the six clusters no longer block the duplicate-identity requirement, and what remains is (a) the separate corpus-wide unique-legal-provision count, (b) the CRAIN pair's named missing fact, and (c) the open question of whether instrument-level-only pairs contribute to a legal-provision count. This order does not pass the gate, does not begin Gate 5.2, and does not issue `PHASE5-001I`.

Dependencies and qualifications preserved untouched: Gate 5.3 and the **M-1** dependency; the accepted B20 candidate qualifications (no candidate certified, no record moved between classes); the six B20 mapping IDs (`CRP-LSRC-0354`, `0422`–`0425`, `0427`) as `UNRESOLVED` pending report-field/event mapping; the historical B20 aggregate as an unattributed historical record; the owner question whether any of the ten identical clusters should one day be a single catalogue entry; the `UK_TO_GB_RECONCILIATION_REQUIRED` status on the CRAIN rows; and PHASE5-001H's separate Ontario instrument-identity question, which the Ontario cluster determination here neither resolves nor reopens.

---

## 11. Step 10 — preservation and custody

Recorded in `preservation_and_change_record.json` and `file_custody_manifest.json`.

- **Pre-write baseline:** 253 files, 56,850,355 bytes, digest `74073D60F607FE757970B7117BD44CED96826D09FA13CBD68011C0C075C2057C`.
- **Post-write recheck, per file and in aggregate:** 253 compared, **253 unchanged, 0 changed, 0 missing**, same byte total, **same digest**. **PRESERVATION HELD.** No pre-existing workspace file was created, modified, moved, renamed or deleted by this order.
- **Unit level:** the catalogue is still 437 entries at 447,509 bytes / `3ACB39A3…038D`; the register is still 437 rows at 616,237 bytes / `DFB78DD2…F24BB`; all **15 of 15** scoped rows remain present with their recorded disposition (`UNRESOLVED` / `BLOCKED_MISSING_EVIDENCE`); 0 sources removed, 0 rows rewritten, 0 rows re-classed, 0 dispositions changed, 0 clusters collapsed or merged, 0 rules admitted, 0 coverage or findings created.
- **Retrieved originals:** 10 files preserved under `SOURCE_CAPTURES/PHASE5-001N/retrieved/`, each with URL, retrieval time, byte count and SHA-256 in `retrieval_ledger.json`, including the two route-failure bodies kept only as evidence of the failed routes.
- **Custody:** every artifact this order created is listed with bytes and SHA-256 in `file_custody_manifest.json`.
- **Not done:** no removal, merge, rename or deletion; no disposition change or inheritance; no rule interpretation, admission or application; no coverage, candidate or finding; no Git operation; no consumer report, transmission, purchase, login or external contact.

---

## 12. Boundaries observed

No source was removed; no record was merged; no disposition was inherited; no row was re-classed; no owner ruling manufactured any missing source identity — where evidence ran out, the relation stayed unresolved and the missing fact was named. No private report was read, no consumer data was transmitted, nothing was purchased, no login was used and no publisher was contacted. No new legal-rule interpretation, admission, parser, evaluator, application work or deployment was performed; no unrelated corpus expansion and no report-format research was performed. Gate 5.2 was not begun; `PHASE5-001I` was not issued; Gate 5.1 was not declared passed. The unresolved Gate 5.3 / M-1 dependency and every candidate qualification are preserved. No Git operation, move, rename or deletion was performed.

---

## 13. Artifacts of this order

| Artifact | Role |
| --- | --- |
| `CRP_PHASE5_001N_UNRESOLVED_SOURCE_IDENTITY_INVESTIGATION.md` | this narrative deliverable |
| `SOURCE_CAPTURES/PHASE5-001N/input_inventory.json` | pre-write inventory and composite digest of the 253 pre-existing files |
| `SOURCE_CAPTURES/PHASE5-001N/scoped_relation_reproduction.json` | step 1 reproduction of the 15 rows and 25 unresolved records |
| `SOURCE_CAPTURES/PHASE5-001N/existing_capture_review.json` | step 2 per-row descriptor, provenance and sufficiency review |
| `SOURCE_CAPTURES/PHASE5-001N/retrieval_ledger.json` | steps 3–4 retrieval record and route outcomes |
| `SOURCE_CAPTURES/PHASE5-001N/retrieved/` (10 files) | preserved source originals and route-failure bodies |
| `SOURCE_CAPTURES/PHASE5-001N/source_text_comparison.json` | step 5 quoted-text comparison per cluster |
| `SOURCE_CAPTURES/PHASE5-001N/relation_determinations.json` | step 6 the 15 pair determinations, the 25 record outcomes and the 4 contradiction reports |
| `SOURCE_CAPTURES/PHASE5-001N/proposed_identity_ledger_update.json` | step 7 proposed ledger — not applied |
| `SOURCE_CAPTURES/PHASE5-001N/scoped_count_recomputation.json` | step 8 scoped totals and their limited effect |
| `SOURCE_CAPTURES/PHASE5-001N/gate_5_1_assessment.json` | step 9 gate condition assessment |
| `SOURCE_CAPTURES/PHASE5-001N/preservation_and_change_record.json` | step 10 preservation verification |
| `SOURCE_CAPTURES/PHASE5-001N/file_custody_manifest.json` | step 10 custody of every new artifact |
| `SOURCE_CAPTURES/PHASE5-001N/build_001n_inventory.ps1`, `retrieve_001n_sources.ps1`, `verify_and_manifest_001n.ps1` | the producer scripts, kept as provenance for the records above |

---

## 14. The single next bounded prerequisite

**One action moves this gate: perform the corpus-wide unique-legal-provision count over all 437 rows** under the amended Phase 5.1 bullet 3, carrying the fourteen determinations this order records, the ten demonstrably identical clusters and the 346 rows with no duplicate relationship, and stating for the resulting count its evidence, its meaning and its limitations — while retaining the CRAIN pair as an explicit unresolved input unless its missing row and version are produced first.

That is a count over the whole corpus, not another identity question: fourteen of the fifteen scoped pairs are now determined and the only scoped residual is the CRAIN pair, so no further retrieval on its own can close the requirement. The count would not pass Gate 5.1 by itself, admit a rule, create coverage or a finding, certify a candidate count, or begin Gate 5.2. It was not performed by this order.

---

*End of CRP_PHASE5_001N_UNRESOLVED_SOURCE_IDENTITY_INVESTIGATION.md.*






