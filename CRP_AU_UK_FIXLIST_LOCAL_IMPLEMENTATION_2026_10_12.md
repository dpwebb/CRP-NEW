# AU and UK fix lists — local implementation

Owner authority: October 12, 2026 request to implement both completed comparison fix lists. Local implementation only; staging and production activation are not authorized.

Status: **Local implementation COMPLETE; final full regression passed.** The 18 AU corrections and six UK corrections are implemented in `codex/au-uk-fixlists-20261012`, based on `7a4cf4b56556eb41a79090f61cad1e8662d9e0d1`. Candidate checkout: `C:\Users\webbd\.codex\worktrees\au-uk-fixlists\CRP-NEW`. The previous AU candidate was restored to its clean committed checkpoint. The primary checkout's unrelated runtime and policy work is preserved.

Runtime manifest: `ADCB114E873CDA953B69C434E693C8F649F873870091E4F603ADE5B0533AB7FC`, 152 shipped files. This binds the local source; it is not a hosted release receipt.

The existing AU adapters and governed concern paths now cover the original corpus. The shared readers also handle UK two-column addresses, public-record tables, native account cards and unbranded statutory disclosures. New UK checks retain source-owned postcode, default, settlement, association, court-status and transfer evidence. Identical ambiguous date strings share a consistent interpretation instead of creating a false chronology conflict. Paid or settled status does not exclude printed original default information from its period review. Known primary dates take precedence; an entry-owned Last Reported date is identified as a determining fallback for qualified review when the primary start is unavailable. A report's preparation date is not substituted for an entry's clock start.

Supporting facts retain their record index when projected into internal issue evidence. This repairs an existing cross-report duplicate packet failure while preserving rejection of altered, stale and foreign source evidence. Public cards and packets do not expose private account-matching hashes. Bureau forms remain retired; selected consumer letters and owned supporting copies remain subject to review and approval.

## Measured validation

| Evidence | Result | Scope |
| --- | --- | --- |
| AU original-corpus projection | 104/104 admitted; 161/161 frozen concerns detected and eligible | Actual native PDF extraction, assessment and issue projection; original hashes checked |
| UK original-corpus projection | 97/97 admitted; 109/109 frozen concerns detected and eligible | Same pipeline; zero outputs for the 13 recorded identical-date chronology false positives |
| Final packet-custody focused checks | 253 passed / 0 failed / 0 skipped | Date-source delivery, UK controls and AU selected packet delivery |
| Original HTTP retests this turn | 10 completed; nine approved PDFs and one clean UK report | Five AU and five UK originals; rejected pre-upload requests preserved separately |
| Final-source fictional UK journeys | PASS | Active/closed discrepancy and paid-account old default; same account through approved PDF; locator privacy checked |
| Full shared-runtime regression | 15,750 passed / 0 failed / 0 skipped | 162 sections; 314 source hashes, zero drift/unrun; earlier failed runs retained |

The corpus projection preserves both distinct AU default source records rather than counting one default twice. Relevant controls cover valid/special/foreign postcodes, consistent and distinct date interpretations, known newer primary defaults, legitimate partial settlements, surname-only associations, unrelated bank statements, source ownership and changed approval evidence.

These measurements do not claim 201 new HTTP ingestion/approval cycles or blanket validity of every additional CRP output. Earlier additional-output reviews and confidence differences retain their separate scope. Implementation closure, staging verification and production verification are distinct statuses.

Private evidence: `C:\Users\webbd\.codex\private\crp-ai-comparison\implementation-2026-10-12\au-uk-fixes`. Principal receipts: `au-final-source-projection.json`, `uk-final-source-projection.json`, `original-retest-summary.json`, `final-status-period-controls.json`, `current-uk-packet-acceptance.json`, `paid-default-uk-packet-acceptance.json` and `full-regression-final-complete.log`. Historical independent reviews and production results are unchanged. Original PDFs, credentials, session tokens and private storage remain outside Git.

The same existing full-access account is read from its private credential vault and granted annual complimentary subscriber access locally. No provider purchase, consumer dispatch, staging activation or production activation is part of this implementation.
