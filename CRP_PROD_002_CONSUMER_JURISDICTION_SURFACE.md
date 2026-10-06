# CRP PROD-002 — Consumer Application Jurisdiction Surface From the Accepted Corpus

**Status:** Implemented locally, validated, not deployed. Implementation record and evidence — not executable authority.
**Work order executed:** PROD-002 — Consumer Application Jurisdiction Surface From the Accepted Corpus
**Authorised by:** the owner's instruction authorising PROD-002 (PHASE5-001O recommended this order and performed none of it)
**Date:** 2026-09-30
**Application:** `C:\CRP-NEW\consumer-wizard\dist\` (static bundle; served by the host's `static.directory`)
**Generated data:** `C:\CRP-NEW\consumer-wizard\dist\jurisdiction-data.js` — 39,560 bytes, SHA-256 `C6A6CBCCA2E0DB81E189F9FE5D7E7BBB2DE0DDAD4C5C1616A53AC0A024A49906`
**Evidence:** `C:\CRP-NEW\SOURCE_CAPTURES\PROD-002\` (20 artifacts, listed at §6)

---

## 0. Summary

The consumer application's jurisdiction selector now comes from `CRP-JURISDICTION-ENUM-1` and the coverage it
describes comes from the verified PHASE5-001O ledger. Both are generated, digest-bound and checked at build
time; neither is hand-maintained in the application.

| Item | Before PROD-002 | After PROD-002 |
| --- | --- | ---: |
| Selectable countries | 2 (`Canada`, `United States`) | 4 (`CA`, `US`, `GB`, `AU`) |
| Selectable regions | 64 display-name strings | **82** canonical region codes |
| Stored selection value | display name | canonical country and region code |
| Coverage shown per region | none | accepted source records, recorded legacy mappings, unresolved mapping dependencies, report-checking availability |
| Generated from the enumeration and ledger | no | yes, with a build check that fails on drift |

What the surface states, in the consumer's words: "Legal coverage recorded", "Recorded legacy mappings",
"Unresolved mapping dependencies", and "Report checking not yet available." No gate number, order ID or
authority classification appears in the consumer journey.

The order admits no rule, certifies no count, re-verifies no legal content, and changes no governing document,
no ledger row and no byte of the legacy corpus.

## 1. What was executed, and what was verified first

1. The completed PHASE5-001O report, its proposed work order, the amended governing documents, the coverage
   ledger and the custody manifest were read; the relevant hashes were re-measured **before** any application
   change (`SOURCE_CAPTURES\PROD-002\input_verification.json`):
   - 12 of 13 recorded PHASE5-001O input digests matched exactly; the thirteenth is
     `consumer-wizard\dist\app.js`, the one application file PROD-002 is authorised to change, and it changed
     as intended.
   - 41 of 41 PHASE5-001O custody manifest entries re-verified. Its own self-entry is excluded and recorded as
     a known limitation: PHASE5-001O hashed the manifest before writing it, so that entry cannot be final.
   - 5 of 5 amended governing documents matched their recorded post-amendment digests; 19 amendments recorded.
   - 34 of 34 legacy admitted artifacts re-verified at `C:\Users\webbd\crp-credit-app`; the corpus is read-only.
2. Only then was the application's jurisdiction surface changed. No other behaviour was touched.

## 2. The application, located and recorded before editing

| Item | Recorded value |
| --- | --- |
| Directory | `C:\CRP-NEW\consumer-wizard\` |
| Served bundle | `consumer-wizard\dist\` (the host configuration `consumer-wizard\.openai\hosting.json` sets `static.directory` to `dist`) |
| Source files | `dist\index.html`, `dist\app.js`, `dist\style.css` |
| Build process | **none** — the bundle is plain static HTML/CSS/JS served as-is; there is no bundler, package manifest, transpiler or test runner |
| Verification harness present | `C:\CRP-NEW\wizard-check.cjs` (read-only flow self-check, executed with `node wizard-check.cjs`) |
| Packaging artifact | `C:\CRP-NEW\consumer-wizard.tar.gz` — not unpacked, not modified, not relied on |
| Consumers of the bundle | the browser, and `wizard-check.cjs` |

Because there is no build step, PROD-002 defines one: the generated data file is produced by a checked-in
generator, and the build check re-runs that generator and compares bytes.


## 3. What was implemented, against each requirement

| # | Requirement | Implementation | Evidence |
| --- | --- | --- | --- |
| 1 | Drive country and region selection from `CRP-JURISDICTION-ENUM-1`, canonical codes as stored values, clear names as display labels | `app.js` builds both selects from `window.CRP_JURISDICTION_DATA`; option `value` is the canonical code, option text is the recorded display name; `state.country` / `state.region` hold codes only | build check, selection tests, browser check |
| 2 | Include all 82 enumerated regions under their correct countries; remove the hard-coded 64-name limitation | the 64-name array is deleted; the generated file carries 82 regions, 13/57/4/8 under `CA`/`US`/`GB`/`AU`; the 18 previously missing regions (including American Samoa, Guam, Puerto Rico, U.S. Virgin Islands, Northern Mariana Islands, US-UM, the four GB nations and the eight AU states/territories) are now selectable | `jurisdiction_surface_evidence.json`, browser check |
| 3 | Require explicit country and region selection; clear an incompatible region when the country changes; never infer jurisdiction | `go()` refuses to advance unless the pair is an exact enumerated pair; the region select is disabled until a country is chosen; changing the country clears any region that does not belong to the new country and resets the loaded/reviewed/approved flags; there is no location, filename, storage or report-content path that sets a jurisdiction | selection tests, browser check |
| 4 | Generate regional coverage from the verified PHASE5-001O ledger | `lib_prod002.js` reads the ledger and reduces every one of its 437 rows to one attribution class before summing; the generator refuses to write if any reconciliation check fails | build check (38 checks), data-integrity tests (11) |
| 5 | Use only established region associations; never distribute country-wide sources or invent mappings | a region is credited only for the ledger's exact region association, or for the `UK-*`→`GB-*` mapping that the rank-4 normalization contract records as **owner-approved**; country-wide and unassigned records are held outside the region list and shown separately; anything the ledger does not treat as established is reported as unresolved | build check, data-integrity tests |
| 6 | Distinguish accepted material, recorded operational mappings, unresolved dependencies, and evaluation availability | four separate fields and four separate lines: `accepted_source_records`, `recorded_legacy_operational_mappings`, `unresolved_mapping_dependencies`, `evaluation.available` | browser check (card text captured verbatim) |
| 7 | Show US-UM truthfully and keep it selectable | `US-UM` carries zero accepted records, zero mappings and no ledger row; the card reads "No accepted entries are recorded for this region."; it is selectable because no governing clause withdraws it from the enumeration | data-integrity tests, browser check |
| 8 | Keep coverage counts clearly defined | plain-language definition on the card: the counts are accepted source records, "not counts of unique statutes, executable rules or available findings"; `recorded_legacy_operational_mappings` is defined as a recorded link, not an admitted rule | build check, browser check |
| 9 | Keep the consumer interface simple and free of internal gate numbers and authority classifications | the consumer strings live in the generated file's `consumer_language` block; build check and browser check both fail if `GATE 5.x`, `OWNER_ACCEPTED`, `OWNER_DIRECTIVE`, `*_RECORD` classifications or `UK_TO_GB` appear in `app.js`, `index.html` or the generated data | build check, browser check |
| 10 | Add a reproducible build check comparing generated data to the enumeration and the ledger | `check_prod002_jurisdiction_data.cjs` regenerates the file in memory, compares bytes, re-parses the enumeration, re-derives every total from the ledger, and verifies the file's recorded input digests against the current files | 38 checks |

## 4. The generated data file

`consumer-wizard/dist/jurisdiction-data.js` (a plain script setting `window.CRP_JURISDICTION_DATA`) contains:

- `enumeration_version` (`CRP-JURISDICTION-ENUM-1`), the four source digests, and the declared basis for the
  country display labels (the enumeration defines country codes only);
- `countries` (4) and `regions` (82) in enumeration order, each region carrying its country code, canonical
  region code, recorded display name and six coverage counts;
- `coverage_outside_the_region_list`: 95 country-wide and 1 unassigned accepted records, held outside the
  region list so no region count is inflated;
- `totals`, `definitions`, `consumer_language`, `evaluation` and `boundaries`.

Reconciliation to the ledger (all asserted by the build check):

```
accepted source records                                      410
  = established exact region association                    308
  + owner-approved UK-* to GB-* region-code mapping           6
  + country-wide, no region assigned                         95
  + no region association                                     1

ledger rows                                                  437
  = accepted                                                 410
  + not accepted (gaps and refusals)                          21
  + accepted as recorded material, not as a statute             6
```

Each ledger row is attributed exactly once: the 314 accepted rows that name a region appear once each, 308
through the exact association and 6 through the owner-approved mapping. Regional legacy mappings total 278;
36 unresolved mapping dependencies and 7 non-accepted entries remain explicit per region.

## 5. The consumer journey, captured verbatim

Step 1 now says: *"We use the jurisdiction you choose. It is never guessed from your address, your credit
bureau, a file name or your report. Your selection is not a finding."*

Three cards captured from the running application (headless Chrome, `browser_check_result.json`):

**Nova Scotia · Canada** — `Legal coverage recorded: 15 accepted source records · Recorded legacy mappings: 14 · Unresolved mapping dependencies: 1 · Recorded entries that are not accepted legal authority: 1 · Report checking not yet available. · 96 accepted source records apply country-wide and are not attributed to any one region. · These counts describe accepted source records only. They are not counts of unique statutes, executable rules or available findings.`

**United States Minor Outlying Islands · United States** — `Legal coverage recorded: No accepted entries are recorded for this region. · Recorded legacy mappings: 0 · Report checking not yet available. · …`

**England · United Kingdom** — `Legal coverage recorded: No accepted entries are recorded under this region's exact code. · 2 accepted source records recorded under the owner-approved United Kingdom region-code mapping · Recorded legacy mappings: 2 · Report checking not yet available. · …`

The demonstration draft records the selection as `Canada (CA), Nova Scotia (CA-NS)` and repeats that the
selection is not a finding.

## 6. Files created and changed

**Created in the application (1):**

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| `consumer-wizard\dist\jurisdiction-data.js` | 39,560 | `C6A6CBCCA2E0DB81E189F9FE5D7E7BBB2DE0DDAD4C5C1616A53AC0A024A49906` |

**Changed (4):**

| File | Before | After |
| --- | --- | --- |
| `consumer-wizard\dist\app.js` | 9,617 B `E1524A0C…B9492` (PHASE5-001O) | 11,722 B `BDCD9DDB997BF5BE58F5729033ACC4047AD0D68BDEF3C39EA11FF86B8222ADD7` |
| `consumer-wizard\dist\index.html` | 3,050 B | 3,094 B `EA044526260BEB626D23D3F44AC09CCDFE6BF0B643CCFEDEBF2C0C76BD6634CB` |
| `consumer-wizard\dist\style.css` | 7,069 B | 7,363 B `F54B7F78CC70488100820801C3989066CA7A4EDB5EB7A7696E7343005E1FC354` |
| `wizard-check.cjs` | 1,101 B (`Canada` / `Nova Scotia` as strings) | 1,472 B `CF773AFB464A6EBA3FBBF1FD26E00B7813AA5A70D1B208A2C7325E4977518582` (loads the generated data file and selects by canonical code) |

`wizard-check.cjs` is the demo's own read-only flow self-check, not application behaviour. It had to change
because the application no longer stores display names: leaving it on display names would have tested a
selector that no longer exists. Its assertions (four step gates, full flow, reset) are unchanged.

**Created in `SOURCE_CAPTURES\PROD-002\`:** ten scripts and nine recorded artifacts — `lib_prod002.js` (shared generator library),
`build_prod002_jurisdiction_data.js` (generator), `check_prod002_jurisdiction_data.cjs` (build check),
`verify_prod002_inputs.js` (input hash verification), `test_prod002_data_integrity.cjs`,
`test_prod002_jurisdiction_selection.cjs`, `browser_check_prod002.cjs` (headless-browser check),
`capture_prod002_baseline.ps1`, `verify_prod002_custody.ps1`, `run_prod002_all.ps1` (orchestration),
`preserved_files_before.json`, `input_verification.json`, `jurisdiction_surface_evidence.json`,
`build_check_result.json`, `test_results_data_integrity.json`, `test_results_jurisdiction_selection.json`,
`browser_check_result.json`, `preservation_and_change_record.json` and `file_custody_manifest.json`.

**Not touched:** every governing document, `CRP_JURISDICTION_ENUMERATION.md`, `CRP_GLOBAL_LEGAL_SOURCE_CATALOGUE.md`,
the register, the whole of `SOURCE_CAPTURES\PHASE5-001O\`, `consumer-wizard.tar.gz`,
`consumer-wizard\.openai\hosting.json`, and the legacy corpus at `C:\Users\webbd\crp-credit-app`.


`browser_check_result.json`, `preservation_and_change_record.json` and `file_custody_manifest.json`
(the orchestration run adds one further log, `validation_results.json`).

## 7. Validation results

Run end-to-end with `pwsh -NoProfile -File SOURCE_CAPTURES\PROD-002\run_prod002_all.ps1`; the log is
`SOURCE_CAPTURES\PROD-002\validation_results.json`.

| Step | Command | Result |
| --- | --- | --- |
| 1 input hash verification | `node SOURCE_CAPTURES\PROD-002\verify_prod002_inputs.js` | PASS — 12 unchanged inputs, 1 intended change, 41/41 custody entries, 5/5 amended documents, 34/34 legacy artifacts, 19 amendments |
| 2 build check | `node SOURCE_CAPTURES\PROD-002\check_prod002_jurisdiction_data.cjs` | PASS — 38 checks, 0 failures; regeneration is byte-identical |
| 3 data-integrity tests | `node SOURCE_CAPTURES\PROD-002\test_prod002_data_integrity.cjs` | PASS — 11 tests, 0 failures |
| 4 selection-behaviour tests | `node SOURCE_CAPTURES\PROD-002\test_prod002_jurisdiction_selection.cjs` | PASS — 13 tests, 0 failures |
| 5 demo flow self-check | `node wizard-check.cjs` | PASS — jurisdiction, sample, review and approval gates; full flow; reset |
| 6 browser check | `node SOURCE_CAPTURES\PROD-002\browser_check_prod002.cjs` | PASS — 13 checks, 0 failures in headless Chrome |
| 7 custody verification | `pwsh -NoProfile -File SOURCE_CAPTURES\PROD-002\verify_prod002_custody.ps1` | PASS — **PRESERVATION HELD**: 316 of 320 baseline files unchanged, the 4 expected application files changed, 0 added outside this order, 0 missing, 34/34 legacy artifacts |

Focused coverage of the requirements:

- **All 82 regions appear exactly once with valid canonical codes** — asserted against the enumeration table
  itself (set equality), by regex and country-prefix rule, and by the recorded display names (data-integrity
  tests; build check; browser: 82 options across four countries, 13 under Canada).
- **Country/region relationships and reset behaviour** — 13/57/4/8 per country; the region select is disabled
  until a country is chosen; changing the country clears an incompatible region and resets the case; a region
  belonging to another country cannot be advanced past (selection tests; browser check).
- **Coverage totals reconcile to the ledger without double-counting references** — 410 = 308 + 6 + 95 + 1,
  each ledger row attributed once, each region's numbers equal exactly the rows that name it, and the totals
  agree with `coverage_summary.json` (data-integrity tests; build check).
- **Missing associations and mappings remain explicit** — 95 country-wide and 1 unassigned records are held
  outside the region list; 36 unresolved mapping dependencies and 7 non-accepted entries are shown per region;
  the four GB regions show their records only under the owner-approved code mapping; US-UM shows none.
- **Unsupported evaluation cannot appear available** — `evaluation.available` is `false` for the whole surface,
  derived from the recorded gate reassessment, with "Report checking not yet available." on every card; the
  build check fails on any `"available": true` in the generated file.
- **The application builds and the selector works in the browser** — there is no build step to run; the build
  check proves the generated data reproduces from its inputs, and the headless-browser check drives the real
  selects, change events and cards.

## 8. Preservation

- Baseline: 320 pre-existing files (61,266,129 bytes) hashed before any edit
  (`preserved_files_before.json`).
- 316 files byte-identical after implementation; exactly 4 changed (`app.js`, `index.html`, `style.css`,
  `wizard-check.cjs`); 0 pre-existing files added outside this order; 0 missing.
- The legacy corpus at `C:\Users\webbd\crp-credit-app`: 34 of 34 admitted artifacts re-verified, 0 files
  created, modified or deleted.
- Owner acceptance of the legacy statutes, the Gate 5.3 report-representation requirements, the
  fictional-demo labelling and all application behaviour outside the jurisdiction surface are preserved.
- `SOURCE_CAPTURES\PROD-002\file_custody_manifest.json` records the bytes and digest of every file this order
  created or changed.


## 9. Verified coverage limitations

These are reported as the surface now states them; none of them is repaired by this order.

1. **US-UM has no accepted entries and no ledger row.** It is selectable and truthful; no entry was invented.
2. **The four GB regions carry no exact-code records.** Their 6 accepted records are held under the
   owner-approved `UK-*`→`GB-*` mapping the rank-4 normalization contract records, and are shown on a separate
   line rather than as exact-code coverage.
3. **96 accepted records are country-wide or unassigned.** They are shown once, outside the region list, and
   are never attributed to a region. Attaching them to a selected region remains an implementation dependency
   (`COUNTRY_WIDE_TO_SELECTED_REGION_REQUIRED`, recorded in the ledger).
4. **36 unresolved mapping dependencies and 7 non-accepted entries** remain explicit per region.
5. **Report checking is unavailable for every region.** No report representation is established and no rule is
   admitted, so the consumer surface says so on every card.
6. **The counts are not certified legal-provision counts.** They are counts of accepted source records; the
   §0-era limitations PHASE5-001O recorded (uncertified unique-provision count, the unresolved CRAIN pair,
   61 unmapped entries, 22 `[VERIFY]` items) still stand.
7. **The PHASE5-001O coverage summary's `application_alignment` block is now superseded.** It still describes
   the pre-PROD-002 64-region selector; it was left unmodified because this order may not change the ledger,
   and the post-implementation measurement is recorded in `jurisdiction_surface_evidence.json`
   (`supersedes_001o_application_measurement`).
8. **PHASE5-001O's custody manifest cannot contain its own final digest.** Its self-entry is stale by
   construction; that entry alone is excluded from verification.
9. **The application remains a demonstration.** It carries fictional evidence, a `Sample Credit Bureau`
   recipient and no upload, parsing, evaluation, findings, billing, multi-user authentication or deployment.

## 10. What a consumer can now do

At `C:\CRP-NEW\consumer-wizard\` (serve `dist\` statically; no build step), a consumer can:

1. choose a country from the four enumerated countries, by canonical code;
2. choose any of the 82 enumerated regions under it, by canonical code, with the recorded display name shown;
3. see, in plain language, how much accepted legal material the corpus records for that region, how many
   recorded legacy mappings sit behind it, how many mapping dependencies are unresolved, and that report
   checking is not yet available;
4. see that US-UM records no accepted entries, and that a GB region's records sit under an owner-approved
   region-code mapping;
5. change the country and have an incompatible region cleared rather than silently reassigned;
6. continue to the fictional report, observation, draft response and reply-tracking steps exactly as before.

No consumer can obtain a legal finding, a statutory deadline, a coverage score or an evaluation from this
surface, because none exists.

## 11. Next implementation dependency

**Report representation.** The next implementation step cannot be an evaluator: the consumer surface is only
honest while "Report checking not yet available." is true, and it stays true until two durable artifacts exist
(build plan §4 items 2 and 3, Gate 5.3):

1. a **report-representation and field-mapping register** — one supported consumer disclosure format, its exact
   displayed fields and events, and the byte-pinned evidence for each; and
2. the **candidate-to-rule-unit crosswalk** for the accepted sources of one exact jurisdiction.

The smallest concrete next order is therefore *one supported report format's representation register for one
selected jurisdiction's proposed rule candidates* — no new legal research, no finding, and no change to this
jurisdiction surface. Until then, no region may offer report checking, and PROD-002's build check will fail if
the generated data ever claims otherwise.

## 12. Boundaries

- PROD-002 authorises nothing beyond this record. It admits no rule, certifies no legal count, re-verifies no
  legal content, and creates no legal coverage.
- It changed no governing document, no enumeration entry, no catalogue entry, no register row, no ledger row
  and no byte of the legacy corpus.
- It did not deploy, publish, host, transmit consumer data, add uploads, parse a report, evaluate anything,
  produce a finding, bill, or add authentication.
- The generated data is derived data: reproducible from the enumeration and the ledger by
  `node SOURCE_CAPTURES\PROD-002\build_prod002_jurisdiction_data.js`, and verified by
  `node SOURCE_CAPTURES\PROD-002\check_prod002_jurisdiction_data.cjs`.

