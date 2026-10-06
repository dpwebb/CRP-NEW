# PHASE5-001G — Official-Source Text Completion for Existing US Federal and Australia-wide Gaps

**Status:** ISSUED — source-only documentation work order for Cline  
**Issued:** 2026-09-30 under the owner/architect delegation recorded for this workspace  
**Authority:** `CRP_CORE_CONSTITUTION.md`, `CRP_LEGAL_INVARIANT.md`, `JURISDICTION_CONTRACT.md`, `CRP_GOVERNED_LEGAL_CORPUS_CONTRACT.md`, `CRP_LEGACY_LEGAL_CORPUS_ADMISSION_CONTRACT.md`, `CRP_DIRECT_REPORT_CONTENT_SOURCE_EXPANSION_CONTRACT.md`, and the verified PHASE5-001F register state.

## 1. Purpose and bounded outcome

Continue official-source completion only for the three existing targets in §2. Capture exact text from the specified official publisher, or accurately record why it remains inaccessible.

The only completion artifact is a new append-only PHASE5-001G section in `CRP_GAP_REFUSAL_RESOLUTION_REGISTER.md`, followed by a non-circular register digest. The catalogue is a verification target, not an edit target.

This is not a corpus amendment. It creates no governed rule, legal coverage, consumer finding, candidate, jurisdiction mapping, evaluator, runtime behavior, consumer workflow, test, permanent discovery registry, or legacy-application change.

## 2. Exhaustive source scope

Do not investigate another source ID or legal family in this work order.

| Target | Source ID | Exact text still needed | Permitted official source |
| --- | --- | --- | --- |
| FCRA delinquency-notice paragraph | `CRP-LSRC-0076` | The complete text of 15 U.S.C. § 1681s-2(a)(5)(B), including every word after the current fragment ending `does not disput`. | U.S. Government Publishing Office (`govinfo.gov`) United States Code or Statutes at Large material; Office of the Law Revision Counsel (`uscode.house.gov`) U.S. Code material if reachable. |
| Privacy Act APP text | `CRP-LSRC-0436` | The complete wording of Schedule 1, APP 10 and APP 13 in compilation `C2026C00227`. | Federal Register of Legislation (`legislation.gov.au`) compilation text only. |
| Privacy Code text | `CRP-LSRC-0437` | The operative text of ss. 16, 20, and 21 of the Privacy (Credit Reporting) Code 2024. | Office of the Australian Information Commissioner (`oaic.gov.au`) official Code publication or official Code file only. |

Outside this work order, with no new probe or conclusion: `CRP-LSRC-0077` (California and Massachusetts text in effect on 30 September 1996), `0078`, all Canadian gaps/refusals and the PEI chapter conflict, `0412`, `0413`, `0435`, and every unlisted ID.

## 3. Starting facts to preserve

1. `0076` remains `GAP_OPEN — DISPOSITION RECORDED`. PHASE5-001F captured §605(c)(1)–(2) and §623(a)(5)(A), and only part of §623(a)(5)(B). The Equifax fallback remains not adopted. A successful capture is source evidence only; it neither makes a report date or date of first delinquency report-resolvable nor enters a rule.
2. `0436` requires the operative APP wording from exact compilation `C2026C00227`. Compilation identity, OAIC guidance dated 22 July 2019, and the qualified owner-supplied "typically 30 days" statement are not substitutes. The 30-day statement remains not adopted as an unconditional deadline.
3. `0437` has official Code identity and dictionary text only. It does not have ss. 16, 20, or 21. Do not infer missing sections or their effect.
4. The catalogue contains 437 entries with 15 fields per entry, zero governed rules, zero governed-jurisdiction coverage, and zero permitted findings. Its current SHA-256 is `5BCC3CDE2827C33D8DE318434EA25C26B79363D63C9818A2449B5195DBCD019D`.
5. The completed PHASE5-001F register SHA-256 is `0A610719E21BF5B6EB58BA6D08A71496FBD59D53EBAD52CD5B592DD04F95BC6D`.

## 4. Retrieval method

1. Begin read-only: record the current full-file hashes of the catalogue and register; parse the catalogue JSON block; confirm 437 distinct IDs, 15 fields per entry, and the target IDs' current open status.
2. Use only the publisher and source form specified in §2. Search snippets, summaries, agency guidance, unofficial reproductions, cached copies, model memory, and excluded legacy material must not supply a missing word, source, date, version, or conclusion.
3. PDF or print rendering is permitted only when the file is served by the specified official publisher. Record its actual URL, publisher-presented filename or compilation/version identifier, content type where available, UTC retrieval time, and SHA-256 of exact retrieved bytes where a file is obtained. Do not retain a source copy in this workspace unless a governing contract separately requires custody of it.
4. Mark `RETRIEVED` only when the official publisher returned the complete target wording. A returned incomplete page is `PARTIAL`; a block, unavailable file, binary without usable official rendering, JavaScript-only view, different instrument, or other text failure is `NOT RETRIEVED` with the actual blocker.
5. Never reconstruct elided wording from an edition, partial capture, amendment note, index, heading, table of contents, or legal knowledge. A heading, definition, dictionary entry, source note, or metadata page is not the requested operative text.
6. Do not read, alter, run, or rely on legacy application code. Do not transmit report content or other consumer data.

## 5. Target acceptance conditions

### 5.1 `CRP-LSRC-0076`

Capture §1681s-2(a)(5)(B) in full, from its subsection label through terminal punctuation or the next statutory boundary. Record the source edition/version exactly as the publisher presents it. Preserve the prior §605(c) and §623(a)(5)(A) capture without relabelling an old edition as current law or adding an effective-date conclusion.

If full text remains inaccessible, preserve the existing fragment as partial only. Do not complete the text after `does not disput` by paraphrase.

### 5.2 `CRP-LSRC-0436`

Capture all APP 10 and APP 13 wording as displayed in exact compilation `C2026C00227`, including subparagraphs necessary to avoid omitting qualifications, exceptions, or response conditions. Identify the Schedule, APP label, compilation identifier, and official location.

Compilation record pages, tables of contents, metadata, different compilations, and OAIC's 2019 guideline are not captures. Do not convert wording into a correction workflow or deadline.

### 5.3 `CRP-LSRC-0437`

Capture the full text of Code ss. 16, 20, and 21, including heading, subclauses, transitional text, notes, and cross-references shown within each provision. Identify the Code version and official location.

If the OAIC page exposes only definitions, contents, or other provisions, record each unavailable target section exactly. Do not treat a dictionary extract as operative text or infer a report-only candidate.

## 6. Required register update

Append `## 12. PHASE5-001G — bounded official-source text completion` after the PHASE5-001F digest note. Do not revise an existing line, historic digest, disposition, owner ruling, source count, or work-order record.

Include the following:

1. A method/scope statement with the three IDs, completion date, actual request count, official publishers, and source forms attempted.
2. A retrieval ledger with a row for each request or official file: target ID, route, publisher, response/evidence type, exact captured extent, and `RETRIEVED`, `PARTIAL`, or `NOT RETRIEVED`. Keep request count, source-record count, and unique-provision count separate.
3. Exact evidence for each full capture, with source version, official URL, UTC time, and integrity evidence where available. For a failure, record only the reached text or blocker.
4. A per-ID table for `0076`, `0436`, and `0437` that states full, partial, or failed capture. Preserve every existing gap status unless a later explicit owner amendment changes it. The default outcome here is that all three remain open, even after successful capture.
5. A boundary statement that governed rules, coverage, findings, jurisdiction mappings, workflows, evaluator/runtime changes, tests, legacy changes, and permanent discovery registries created are all zero.
6. A deferred queue that names: `0077` still awaits official primary California Title 1.6 and Massachusetts G.L. c. 93 §52 text in effect on 30 September 1996; all Canada, UK, and Australian State/Territory cohorts remain outside this batch; and the PEI `c. C-18` / `c. C-20` conflict remains unresolved.

Do not amend `CRP_GLOBAL_LEGAL_SOURCE_CATALOGUE.md`. Record its unchanged post-work-order SHA-256, JSON parse result, entry count, distinct-ID count, field-count result, zero-rule count, zero-coverage count, and zero-finding count in the new register section.

## 7. Completion verification

Verify before completing that:

- only `CRP_GAP_REFUSAL_RESOLUTION_REGISTER.md` changed;
- the catalogue remains hash `5BCC3CDE2827C33D8DE318434EA25C26B79363D63C9818A2449B5195DBCD019D` and its JSON parses;
- each target ID occurs exactly once in the PHASE5-001G per-ID table;
- PHASE5-001C through PHASE5-001F digests reproduce by their recorded truncation methods;
- no text, source, date, jurisdiction, statutory version, applicability conclusion, or finding was invented;
- the register is UTF-8 without BOM with CRLF line endings; and
- a final full-file digest covers the content through the blank line immediately before its own digest line and excludes that line and the explanatory text after it. Record the algorithm, line count, byte count, and reproducible truncation instruction.

## 8. Stop conditions and required report

Stop the affected target and record it as unresolved if the official source cannot expose the exact text, if an official-source conflict appears, if identity/version is unclear, or if progress would require a conclusion outside this work order. Do not resolve a blockage by preferring the more favourable reading or seeking consumer evidence.

At completion, report only files changed with SHA-256, exact captures versus partial/blocked targets, unchanged authority counts, and the next bounded source cohort without starting it.

*End of PHASE5-001G work order.*
